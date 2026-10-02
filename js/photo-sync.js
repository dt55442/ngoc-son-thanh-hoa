// ═══════════════════════════════════════════════════════════
// js/photo-sync.js — KÊNH ẢNH THUMB RIÊNG + HÀNG ĐỢI NỀN
// VẤN ĐỀ: thumb (base64 JPEG) từng được nhúng inline trong bản ghi →
// chiếm ~84% payload đẩy mây nên phải GỠ khỏi luồng mây (máy khác mất ảnh).
// GIẢI PHÁP: rút thumb ra khỏi bản ghi (rec.images[] chỉ còn { id }), lưu
// thumb vào kho IndexedDB riêng, rồi đẩy LÊN KÊNH RIÊNG theo từng doc:
//     apps/main/photos/<photoId> = { thumb: '<base64>', ts, by }
//   · CHỈ THUMB lên mây (ảnh FULL ở lại máy — IndexedDB + materials-photos/)
//   · Đẩy DẦN DẦN: hàng đợi nền, mỗi nhịp 1 ảnh, chỉ khi online + có quyền
//   · Máy khác: chỉ TẢI doc ảnh khi cần hiển thị (lazy) rồi cache vào IndexedDB
//   · Xóa ảnh → tombstone ảnh trên hàng đợi → xóa doc mây
// Rules `apps/{doc}/{document=**}` đã phủ sẵn `apps/main/photos/*` → KHÔNG cần
// sửa firestore.rules.
// Hàng đợi KHÔNG lên mây (là "hộp thư đi" của MÁY này) — như STORAGE_KEY_PV_CHART_MODE.
// ═══════════════════════════════════════════════════════════
import { canPushToCloud, fbDb, isFirebaseOnline } from './cloud.js';
import { allThumbIds, getThumbDataURL, getThumbURL, putThumb } from './photo-store.js';
import { STORAGE_KEY_PHOTO_QUEUE, STORAGE_KEY_PHOTO_UPLOADED, state } from './state.js';
import { showToast } from './utils.js';

const FB_COLL = 'apps';
const FB_DOC = 'main';
const PHOTO_COLL = 'photos';
const PHOTO_BATCH_LIMIT = 200;  // tối đa mỗi lượt đẩy (giữ lượt chạy ngắn, nhẹ máy)
const PHOTO_GAP_MS = 120;       // nghỉ giữa 2 ảnh cho nhẹ mạng

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── HÀNG ĐỢI (thuần — không phụ thuộc DOM/IDB nên test trực tiếp được) ───
// q = { pending: { id: ts }, deleted: { id: ts } }
function photoQueueEnsure(q) {
  if (!q || typeof q !== 'object') return { pending: {}, deleted: {} };
  if (!q.pending || typeof q.pending !== 'object') q.pending = {};
  if (!q.deleted || typeof q.deleted !== 'object') q.deleted = {};
  return q;
}
function photoQueueAdd(q, id, ts) {
  if (!q || !id) return q;
  photoQueueEnsure(q);
  delete q.deleted[id];                 // có ảnh mới → hủy dấu xóa cũ
  q.pending[id] = ts || Date.now();
  return q;
}
function photoQueueMarkDeleted(q, id, ts) {
  if (!q || !id) return q;
  photoQueueEnsure(q);
  delete q.pending[id];
  q.deleted[id] = ts || Date.now();
  return q;
}
function photoQueueUndelete(q, id) {
  if (q && q.deleted) delete q.deleted[id];
  return q;
}
function photoQueueRemove(q, id) {
  if (!q) return q;
  if (q.pending) delete q.pending[id];
  if (q.deleted) delete q.deleted[id];
  return q;
}
// Lấy việc kế tiếp: XÓA trước (tránh đẩy rồi xóa), rồi ĐẨY — theo thứ tự thời gian
function photoQueueNext(q) {
  const z = photoQueueEnsure(q);
  const dels = Object.keys(z.deleted);
  if (dels.length) {
    dels.sort((a, b) => (Number(z.deleted[a]) || 0) - (Number(z.deleted[b]) || 0));
    return { id: dels[0], op: 'del' };
  }
  const pens = Object.keys(z.pending);
  if (pens.length) {
    pens.sort((a, b) => (Number(z.pending[a]) || 0) - (Number(z.pending[b]) || 0));
    return { id: pens[0], op: 'put' };
  }
  return null;
}
function photoQueueCount(q) {
  const z = photoQueueEnsure(q);
  return Object.keys(z.pending).length + Object.keys(z.deleted).length;
}

// ─── DẠNG DOC TRÊN MÂY ────────────────────────────────────────────────
function photoDocData(thumb, by, ts) {
  return { thumb: String(thumb || ''), ts: ts || Date.now(), by: String(by || '') };
}
function photoCloudDocRef(db, id) {
  return db.collection(FB_COLL).doc(FB_DOC).collection(PHOTO_COLL).doc(id);
}

// ─── ĐẨY 1 ĐỢT (tách khỏi DOM/IDB → test bằng Firestore giả lập) ──────
// opts: { readThumb(id), by, limit, gapMs, onProgress, onError }
async function photoPushBatch(db, queue, opts) {
  const o = opts || {};
  const limit = Math.max(1, Number(o.limit) || PHOTO_BATCH_LIMIT);
  const gapMs = (o.gapMs === undefined) ? PHOTO_GAP_MS : (Number(o.gapMs) || 0);
  const readThumb = (typeof o.readThumb === 'function') ? o.readThumb : (async () => '');
  let pushed = 0, deleted = 0, skipped = 0;
  while ((pushed + deleted + skipped) < limit) {
    const it = photoQueueNext(queue);
    if (!it) break;
    const ref = photoCloudDocRef(db, it.id);
    if (it.op === 'del') {
      try { await ref.delete(); }
      catch (e) { if (typeof o.onError === 'function') o.onError(e, it); break; }
      deleted++;
      photoQueueRemove(queue, it.id);
    } else {
      let thumb = '';
      try { thumb = await readThumb(it.id); } catch (e) { thumb = ''; }
      if (!thumb) {
        skipped++;                        // không có thumb cục bộ → bỏ khỏi hàng đợi
        photoQueueRemove(queue, it.id);
      } else {
        try { await ref.set(photoDocData(thumb, o.by)); }
        catch (e) { if (typeof o.onError === 'function') o.onError(e, it); break; }
        pushed++;
        photoQueueRemove(queue, it.id);
        photoMarkUploaded(it.id);
      }
    }
    if (typeof o.onProgress === 'function') o.onProgress({ pushed, deleted, skipped });
    if (gapMs > 0 && photoQueueNext(queue)) await sleep(gapMs);
  }
  return { pushed, deleted, skipped, remaining: photoQueueCount(queue) };
}

// ─── DẤU "ĐÃ ĐẨY" (theo MÁY) — tránh đẩy lại mọi ảnh mỗi lần mở app ──
function photoMarkUploaded(id) {
  if (!id) return;
  state.photoUploaded = state.photoUploaded || {};
  state.photoUploaded[id] = Date.now();
}
function photoUnmarkUploaded(id) {
  if (!id || !state.photoUploaded) return;
  delete state.photoUploaded[id];
}
function photoIsUploaded(id) {
  return !!(id && state.photoUploaded && state.photoUploaded[id]);
}

// ─── NẠP / LƯU HÀNG ĐỢI (localStorage — "hộp thư đi" của máy này) ────
function loadPhotoQueue() {
  let q = null, up = null;
  try { q = JSON.parse(localStorage.getItem(STORAGE_KEY_PHOTO_QUEUE) || 'null'); } catch (e) {}
  try { up = JSON.parse(localStorage.getItem(STORAGE_KEY_PHOTO_UPLOADED) || 'null'); } catch (e) {}
  state.photoQueue = { pending: (q && q.pending) || {}, deleted: (q && q.deleted) || {} };
  state.photoUploaded = (up && typeof up === 'object') ? up : {};
  return state.photoQueue;
}
function savePhotoQueue() {
  try {
    const q = photoQueueEnsure(state.photoQueue);
    localStorage.setItem(STORAGE_KEY_PHOTO_QUEUE, JSON.stringify({ pending: q.pending, deleted: q.deleted }));
  } catch (e) { /* bỏ qua */ }
}
function savePhotoUploaded() {
  try { localStorage.setItem(STORAGE_KEY_PHOTO_UPLOADED, JSON.stringify(state.photoUploaded || {})); } catch (e) { /* bỏ qua */ }
}

// ─── API CHO materials.js GỌI KHI ẢNH MỚI / XÓA ẢNH ─────────────────
function photoSyncEnqueue(id) {
  if (!id) return;
  photoUnmarkUploaded(id);
  photoQueueAdd(state.photoQueue, id, Date.now());
  savePhotoQueue();
  updatePhotoSyncUI();
  photoSyncKick();
  return id;
}
function photoSyncEnqueueDelete(id) {
  if (!id) return;
  photoUnmarkUploaded(id);
  savePhotoUploaded();
  photoQueueMarkDeleted(state.photoQueue, id, Date.now());
  savePhotoQueue();
  updatePhotoSyncUI();
  photoSyncKick();
  return id;
}

// ─── NẠP BÙ: enqueue mọi ảnh đang có thumb CỤC BỘ mà chưa đẩy ────────
// (dữ liệu cũ chưa từng qua kênh ảnh; hoặc máy vừa migrate)
async function photoSyncBackfill() {
  const recs = Array.isArray(state.materialRecords) ? state.materialRecords : [];
  let localThumbs;
  try { localThumbs = await allThumbIds(); } catch (e) { localThumbs = new Set(); }
  let added = 0;
  for (const r of recs) {
    const imgs = (r && Array.isArray(r.images)) ? r.images : [];
    for (const e of imgs) {
      if (!e || typeof e !== 'object' || !e.id) continue;   // ảnh legacy dạng chuỗi → bỏ qua
      if (photoIsUploaded(e.id)) continue;
      let has = localThumbs.has(e.id);
      if (!has && e.thumb) {                                 // entry còn thumb inline (fallback) → đưa vào kho
        try { has = !!(await putThumb(e.thumb, e.id)); } catch (err) { has = false; }
        if (has) localThumbs.add(e.id);
      }
      if (!has) continue;
      photoQueueAdd(state.photoQueue, e.id, Date.now());
      added++;
    }
  }
  if (added) { savePhotoQueue(); updatePhotoSyncUI(); }
  return added;
}

// ─── TẢI THUMB TỪ MÂY (máy khác) + CACHE VÀO KHO ─────────────────────
async function fetchThumbFromCloud(id) {
  if (!id || !fbDb || !isFirebaseOnline()) return '';
  try {
    const snap = await photoCloudDocRef(fbDb, id).get();
    if (!snap || !snap.exists) return '';
    const d = snap.data() || {};
    if (!d.thumb) return '';
    try { await putThumb(d.thumb, id); } catch (e) { /* không có IDB → vẫn dùng dataURL trực tiếp */ }
    return d.thumb;
  } catch (e) { return ''; }
}

// ─── HIỂN THỊ: nạp thumb cho <img data-photo-id> (kho trước, mây sau) ──
// Gọi sau mỗi lần render bảng/preview. Ảnh legacy (src inline) không bị đụng.
async function hydratePhotoThumbs(root) {
  const scope = (root && typeof root.querySelectorAll === 'function')
    ? root
    : (typeof document !== 'undefined' ? document : null);
  if (!scope || typeof scope.querySelectorAll !== 'function') return 0;
  let list = [];
  try { list = Array.prototype.slice.call(scope.querySelectorAll('img[data-photo-id]')); } catch (e) { return 0; }
  let filled = 0;
  for (const img of list) {
    if (!img || typeof img.getAttribute !== 'function') continue;
    if (img.getAttribute('data-photo-loaded') === '1') continue;
    if (img.getAttribute('data-photo-inline') === '1') continue;  // đã hiển thị bằng thumb inline
    const id = img.getAttribute('data-photo-id');
    if (!id) continue;
    let url = '';
    try { url = await getThumbURL(id); } catch (e) { url = ''; }
    if (!url) url = await fetchThumbFromCloud(id);
    if (url) {
      try { img.src = url; } catch (e) { /* bỏ qua */ }
      if (typeof img.setAttribute === 'function') img.setAttribute('data-photo-loaded', '1');
      filled++;
    }
  }
  return filled;
}

// ─── WORKER NỀN ───────────────────────────────────────────────────────
let photoSyncRunning = false;
function photoSyncRunningNow() { return photoSyncRunning; }

async function photoSyncRun() {
  photoSyncRunning = true;
  try {
    const res = await photoPushBatch(fbDb, state.photoQueue, {
      by: (state.currentUser && state.currentUser.email) || '',
      readThumb: (id) => getThumbDataURL(id),
      onProgress: () => { updatePhotoSyncUI(); }
    });
    savePhotoQueue();
    savePhotoUploaded();
    updatePhotoSyncUI();
    return res;
  } catch (e) {
    return { pushed: 0, deleted: 0, skipped: 0, remaining: photoQueueCount(state.photoQueue), error: e };
  } finally {
    photoSyncRunning = false;
    updatePhotoSyncUI();
  }
}

// Kích worker: chỉ chạy khi ONLINE + có quyền ghi + còn việc.
// Chưa đủ điều kiện → KHÔNG hẹn lại (tránh timer treo khi test); việc đẩy sẽ
// được kích lại khi: thêm/xóa ảnh · có mạng · rời trang · vừa đăng nhập.
function photoSyncKick() {
  if (photoSyncRunning) return Promise.resolve({ skippedRun: true });
  if (!isFirebaseOnline() || !canPushToCloud()) return Promise.resolve({ blocked: true, remaining: photoQueueCount(state.photoQueue) });
  if (!photoQueueCount(state.photoQueue)) return Promise.resolve({ remaining: 0 });
  return photoSyncRun();
}

// Nút "Đồng Bộ Ảnh Ngay" — đẩy rồi báo kết quả cho người dùng
async function photoSyncNow() {
  const before = photoQueueCount(state.photoQueue);
  if (!before) { showToast('Không có ảnh nào đang chờ đồng bộ.', 'info'); return; }
  if (!isFirebaseOnline()) { showToast('Đang offline — ảnh sẽ đồng bộ khi có mạng.', 'info'); return; }
  if (!state.currentUser) { showToast('Chưa đăng nhập — cần quyền Sửa/Quản trị để đẩy ảnh.', 'error'); return; }
  if (!canPushToCloud()) { showToast('Tài khoản chỉ xem — không đẩy được ảnh lên mây.', 'error'); return; }
  const res = await photoSyncKick();
  const done = (res && ((res.pushed || 0) + (res.deleted || 0))) || 0;
  const left = (res && res.remaining) || 0;
  showToast('Đã đồng bộ ' + done + ' ảnh lên mây'
    + (left ? ' — còn ' + left + ' ảnh chờ (bấm tiếp để đẩy nốt).' : '.'), done ? 'success' : 'info');
}

// ─── TRẠNG THÁI CHO UI (menu ⋮) ───────────────────────────────────────
function photoSyncStatus() {
  return {
    pending: photoQueueCount(state.photoQueue),
    running: photoSyncRunning,
    uploaded: Object.keys(state.photoUploaded || {}).length
  };
}
function updatePhotoSyncUI() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const el = document.getElementById('photo-sync-status');
  if (el) {
    const n = photoQueueCount(state.photoQueue);
    el.textContent = n ? (' — ' + n + ' ảnh chờ') : '';
  }
  const btn = document.getElementById('btn-sync-photos');
  if (btn) btn.disabled = photoSyncRunning;
}

export {
  PHOTO_BATCH_LIMIT,
  PHOTO_COLL,
  PHOTO_GAP_MS,
  fetchThumbFromCloud,
  hydratePhotoThumbs,
  loadPhotoQueue,
  photoDocData,
  photoPushBatch,
  photoQueueAdd,
  photoQueueCount,
  photoQueueMarkDeleted,
  photoQueueNext,
  photoQueueRemove,
  photoQueueUndelete,
  photoSyncBackfill,
  photoSyncEnqueue,
  photoSyncEnqueueDelete,
  photoSyncKick,
  photoSyncNow,
  photoSyncRunningNow,
  photoSyncStatus,
  savePhotoQueue,
  savePhotoUploaded,
  updatePhotoSyncUI
};