// tests/photo-sync.test.mjs — Kiểm thử KÊNH ẢNH THUMB (js/photo-sync.js)
// Thumb bị rút khỏi bản ghi (nhẹ localStorage + payload mây), đi KÊNH RIÊNG:
//   apps/main/photos/<photoId> = { thumb, ts, by }  — đẩy DẦN, chỉ khi online + có quyền.
//   A. Hàng đợi thuần (thêm/xóa/ưu tiên/thứ tự).
//   B. Dạng doc mây.
//   C. photoPushBatch với Firestore giả lập (đẩy/xóa/skip/không đẩy trùng).
//   D. Kho thumb IndexedDB giả lập: put/get/dataURL.
//   E. hydratePhotoThumbs + photoSyncBackfill (không ném khi thiếu DOM/IDB).
//   F. Integration: photoSyncKick đẩy thật lên Firestore giả lập.
//   G. Cấu trúc mã nguồn (kênh 'photos', sw.js, index.html, materials.js, state.js).
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường ─────────────────────────────────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', src: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
const els = new Map();
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
Object.defineProperty(global, "navigator", { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){} });
const storeBacking = new Map();
global.localStorage = {
  getItem: (k) => (storeBacking.has(k) ? storeBacking.get(k) : null),
  setItem: (k, v) => { storeBacking.set(k, String(v)); },
  removeItem: (k) => { storeBacking.delete(k); },
  clear: () => storeBacking.clear(),
  key: (i) => [...storeBacking.keys()][i] ?? null,
  get length() { return storeBacking.size; }
};
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';
global.lucide = { createIcons(){} };
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.FileReader = class {
  readAsDataURL() { this.result = 'data:image/jpeg;base64,FROMBLOB'; setTimeout(() => this.onload && this.onload(), 0); }
  readAsText() { this.result = ''; setTimeout(() => this.onload && this.onload(), 0); }
};

// IndexedDB giả lập — 2 kho: ảnh full + thumb (blob giả = chuỗi đánh dấu)
function makeFakeIndexedDB() {
  const stores = { material_photos: new Map(), material_thumbs: new Map() };
  const mkReq = (fn) => { const req = {}; setTimeout(() => { try { req.result = fn(); } catch (e) { req.error = e; } if (req.onsuccess) req.onsuccess(); }, 0); return req; };
  const db = {
    objectStoreNames: { contains: (n) => Object.prototype.hasOwnProperty.call(stores, n) },
    transaction(name) {
      const map = stores[name];
      const tx = { oncomplete: null, onerror: null, onabort: null };
      setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
      tx.objectStore = () => ({
        put(val, key) { map.set(key, val); return {}; },
        get: (key) => mkReq(() => map.get(key)),
        delete(key) { map.delete(key); return {}; },
        getAllKeys: () => mkReq(() => [...map.keys()])
      });
      return tx;
    }
  };
  return { open: () => { const req = {}; setTimeout(() => { req.result = db; if (req.onsuccess) req.onsuccess(); }, 0); return req; }, _stores: stores };
}
const fakeIdb = makeFakeIndexedDB();
Object.defineProperty(global, 'indexedDB', { value: fakeIdb, configurable: true, writable: true });

// ─── IMPORT MODULES ──────────────────────────────────────────────
const cloud = await import('../js/cloud.js');
const ps = await import('../js/photo-sync.js');
const photostore = await import('../js/photo-store.js');
const { state } = await import('../js/state.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.error('  \u2717 ' + name); }
}

// ─── A. HÀNG ĐỢI THUẦN ───────────────────────────────────────────
{
  const q = { pending: {}, deleted: {} };
  ps.photoQueueAdd(q, 'ph-a', 100);
  ps.photoQueueAdd(q, 'ph-b', 200);
  check('A1: thêm 2 ảnh → hàng đợi có 2 việc', ps.photoQueueCount(q) === 2);
  check('A2: việc kế tiếp = ảnh cũ nhất (FIFO theo ts)', ps.photoQueueNext(q).id === 'ph-a');
  ps.photoQueueMarkDeleted(q, 'ph-b', 300);
  check('A3: đánh dấu xóa → xóa được ưu tiên TRƯỚC (tránh đẩy rồi xóa)',
    ps.photoQueueNext(q).op === 'del' && ps.photoQueueNext(q).id === 'ph-b');
  check('A4: ảnh vừa xóa bị gỡ khỏi pending', !('ph-b' in q.pending) && ('ph-b' in q.deleted));
  ps.photoQueueAdd(q, 'ph-b', 400);
  check('A5: thêm lại ảnh đã đánh dấu xóa → hủy dấu xóa (ảnh mới thắng)',
    !('ph-b' in q.deleted) && q.pending['ph-b'] === 400);
  ps.photoQueueRemove(q, 'ph-a');
  check('A6: gỡ 1 việc → còn 1', ps.photoQueueCount(q) === 1);
  check('A7: hàng đợi rỗng → next = null', (() => { const z = { pending: {}, deleted: {} }; return ps.photoQueueNext(z) === null; })());
  check('A8: photoQueueCount(null) = 0 (an toàn) và ensure tạo hàng đợi rỗng',
    ps.photoQueueCount(null) === 0 && ps.photoQueueCount({}) === 0);
}

// ─── B. DẠNG DOC TRÊN MÂY (chỉ THUMB) ────────────────────────────
{
  const d = ps.photoDocData('data:image/jpeg;base64,AAA', 'dt55442@gmail.com', 123);
  check('B1: doc mây chỉ gồm thumb + ts + by',
    Object.keys(d).sort().join(',') === 'by,thumb,ts');
  check('B2: KHÔNG chứa ảnh full (chỉ đồng bộ thumb)', !('full' in d) && d.thumb === 'data:image/jpeg;base64,AAA');
  check('B3: có by + ts để truy vết', d.by === 'dt55442@gmail.com' && d.ts === 123);
  check('B4: hằng số kênh ảnh = collection "photos" dưới apps/main', ps.PHOTO_COLL === 'photos');
}

// ─── Firestore giả lập ───────────────────────────────────────────
function makeFakeFirestore() {
  const store = new Map();
  const makeDoc = (collPath, id) => {
    const key = collPath + '/' + id;
    return {
      set(data) { store.set(key, JSON.parse(JSON.stringify(data))); return Promise.resolve(); },
      get() { return Promise.resolve({ exists: store.has(key), data: () => store.get(key) }); },
      delete() { store.delete(key); return Promise.resolve(); },
      onSnapshot() { return () => {}; },
      collection(sub) { return makeColl(collPath + '/' + id + '/' + sub); },
      where() { return { get: () => Promise.resolve({ forEach(){} }) }; }
    };
  };
  const makeColl = (path) => ({ doc: (id) => makeDoc(path, id), where: () => ({ get: () => Promise.resolve({ forEach(){} }) }) });
  return { _store: store, collection: (name) => makeColl(name) };
}

// ─── C. ĐẨY 1 ĐỢT (photoPushBatch) ───────────────────────────────
{
  const db = makeFakeFirestore();
  const q = { pending: {}, deleted: {} };
  ps.photoQueueAdd(q, 'ph-1', 1);
  ps.photoQueueAdd(q, 'ph-2', 2);
  ps.photoQueueMarkDeleted(q, 'ph-9', 3);
  const res = await ps.photoPushBatch(db, q, { readThumb: async (id) => 'THUMB-' + id, by: 'me@x.com', gapMs: 0 });
  check('C1: đẩy 2 thumb + xóa 1 doc → đúng số lượng',
    res.pushed === 2 && res.deleted === 1 && res.remaining === 0);
  check('C2: doc miền ảnh nằm đúng đường apps/main/photos/<id> (dưới apps/main → rules phủ sẵn)',
    db._store.has('apps/main/photos/ph-1') && db._store.has('apps/main/photos/ph-2'));
  check('C3: nội dung doc = { thumb, ts, by } — CHỈ thumb',
    (() => { const d = db._store.get('apps/main/photos/ph-1'); return d.thumb === 'THUMB-ph-1' && d.by === 'me@x.com' && !!d.ts && !('full' in d); })());
  const res2 = await ps.photoPushBatch(db, q, { readThumb: async () => 'X', gapMs: 0 });
  check('C4: hàng đợi rỗng → đợt sau KHÔNG đẩy gì (không ghi trùng)', res2.pushed === 0 && res2.deleted === 0);

  // Thiếu thumb cục bộ → bỏ qua (không ghi doc rác), không kẹt hàng đợi
  const q3 = { pending: {}, deleted: {} };
  ps.photoQueueAdd(q3, 'ph-missing', 5);
  const res3 = await ps.photoPushBatch(db, q3, { readThumb: async () => '', gapMs: 0 });
  check('C5: không có thumb cục bộ → SKIP, không ghi doc, hàng đợi sạch',
    res3.pushed === 0 && res3.skipped === 1 && res3.remaining === 0 && !db._store.has('apps/main/photos/ph-missing'));

  // Lỗi ghi (mất mạng) → DỪNG, giữ nguyên việc trong hàng đợi để lần sau đẩy tiếp
  const q4 = { pending: {}, deleted: {} };
  ps.photoQueueAdd(q4, 'ph-err', 6);
  const badDb = {
    collection: () => ({
      doc: () => ({
        collection: () => ({ doc: () => ({ set: () => Promise.reject(new Error('offline')), get: () => Promise.resolve({ exists: false }), delete: () => Promise.reject(new Error('offline')) }) }),
        set: () => Promise.reject(new Error('offline')),
        get: () => Promise.resolve({ exists: false }),
        delete: () => Promise.reject(new Error('offline'))
      })
    })
  };
  const res4 = await ps.photoPushBatch(badDb, q4, { readThumb: async () => 'T', gapMs: 0 });
  check('C6: lỗi ghi → giữ việc trong hàng đợi (đẩy tiếp lần sau)',
    res4.pushed === 0 && ps.photoQueueCount(q4) === 1);
}

// ─── D. KHO THUMB (IndexedDB) ────────────────────────────────────
{
  check('D1: có IndexedDB giả → photosAvailable() = true', photostore.photosAvailable() === true);
  const id = await photostore.putThumb('data:image/jpeg;base64,THUMB1', 'ph-d1');
  check('D2: putThumb lưu được (trả về đúng id)', id === 'ph-d1');
  check('D3: hasThumb = true sau khi lưu', (await photostore.hasThumb('ph-d1')) === true);
  check('D4: getThumbDataURL đọc lại → dataURL (dùng để đẩy mây)', (await photostore.getThumbDataURL('ph-d1')) === 'data:image/jpeg;base64,FROMBLOB');
  check('D5: getThumbURL trả objectURL (hiển thị <img>)', (await photostore.getThumbURL('ph-d1')) === 'blob:stub');
  check('D6: allThumbIds có id vừa lưu', (await photostore.allThumbIds()).has('ph-d1'));
  await photostore.deleteThumb('ph-d1');
  check('D7: deleteThumb xóa khỏi kho', (await photostore.hasThumb('ph-d1')) === false);
  check('D8: ảnh FULL và THUMB là 2 kho riêng',
    photostore.PHOTO_STORE === 'material_photos' && photostore.PHOTO_THUMB_STORE === 'material_thumbs' && photostore.PHOTO_DB_VERSION === 2);
}

// ─── E. BACKFILL (nạp bù ảnh đang có thumb cục bộ vào hàng đợi) ───
{
  await photostore.putThumb('data:image/jpeg;base64,T1', 'ph-e1');
  await photostore.putThumb('data:image/jpeg;base64,T2', 'ph-e2');
  state.materialRecords = [
    { id: 'm1', images: [{ id: 'ph-e1' }, { id: 'ph-e2', thumb: 'data:image/jpeg;base64,INLINE' }] },
    { id: 'm2', images: ['data:image/jpeg;base64,LEGACY'] }   // ảnh legacy dạng chuỗi → bỏ qua
  ];
  state.photoQueue = { pending: {}, deleted: {} };
  state.photoUploaded = {};
  const added = await ps.photoSyncBackfill();
  check('E1: backfill đưa 2 ảnh {id} vào hàng đợi (bỏ qua ảnh legacy dạng chuỗi)', added === 2 && ps.photoQueueCount(state.photoQueue) === 2);
  check('E2: entry {id, thumb} còn inline → thumb được đưa vào KHO (không bỏ sót)',
    (await photostore.hasThumb('ph-e2')) === true);
  state.photoUploaded = { 'ph-e1': Date.now() };
  state.photoQueue = { pending: {}, deleted: {} };
  const added2 = await ps.photoSyncBackfill();
  check('E3: ảnh đã đánh dấu "đã đẩy" không bị enqueue lại (tránh đẩy lại mọi ảnh mỗi lần mở app)', added2 === 1);
}

// ─── F. INTEGRATION: photoSyncKick đẩy thật (Firestore giả lập) ───
{
  const db = makeFakeFirestore();
  global.__BAMBOO_FIREBASE_READY__ = true;
  global.FIREBASE_CONFIG = { ownerEmail: 'dt55442@gmail.com', projectId: 'test-photo' };
  global.firebase = {
    apps: [], initializeApp(){}, firestore: () => db,
    auth: () => ({ onAuthStateChanged(){}, currentUser: null, signOut(){ return Promise.resolve(); } })
  };
  cloud.initFirebase();
  check('F0: Firebase (fake) đã bật → online', cloud.isFirebaseOnline() === true);

  // Chưa đăng nhập → KHÔNG đẩy (chỉ xem)
  state.currentUser = null;
  state.photoQueue = { pending: {}, deleted: {} };
  ps.photoQueueAdd(state.photoQueue, 'ph-f1', 1);
  const r0 = await ps.photoSyncKick();
  check('F1: chưa đăng nhập → không đẩy (giữ việc trong hàng đợi)', r0.blocked === true && ps.photoQueueCount(state.photoQueue) === 1);

  // Viewer → KHÔNG đẩy
  state.currentUser = { email: 'x@y.com', role: 'viewer' };
  const r1 = await ps.photoSyncKick();
  check('F2: tài khoản chỉ xem → không đẩy', r1.blocked === true && ps.photoQueueCount(state.photoQueue) === 1);

  // Editor → ĐẨY: 1 doc ảnh trên mây, hàng đợi sạch
  state.currentUser = { email: 'editor@x.com', role: 'editor' };
  await photostore.putThumb('data:image/jpeg;base64,FF', 'ph-f1');
  const r2 = await ps.photoSyncKick();
  check('F3: Editor + online → đẩy đúng 1 ảnh, hàng đợi sạch',
    r2.pushed === 1 && r2.remaining === 0 && db._store.has('apps/main/photos/ph-f1'));
  check('F4: doc mây chứa thumb (base64) + by = email người đẩy',
    (() => { const d = db._store.get('apps/main/photos/ph-f1'); return !!d.thumb && d.by === 'editor@x.com'; })());
  check('F5: đã ghi dấu "đã đẩy" theo máy (photoUploaded)',
    !!(state.photoUploaded && state.photoUploaded['ph-f1']));

  // Hàng đợi rỗng → kick không làm gì
  const r3 = await ps.photoSyncKick();
  check('F6: hàng đợi rỗng → kick trả remaining=0, không ghi thêm', r3.remaining === 0);
  check('F7: photoSyncStatus báo đúng số ảnh chờ + đã đẩy',
    ps.photoSyncStatus().pending === 0 && ps.photoSyncStatus().uploaded >= 1);
  state.currentUser = null;
// ─── G. CẤU TRÚC MÃ NGUỒN (kênh ảnh tách riêng) ──────────────────
{
  const src = fs.readFileSync(new URL('../js/photo-sync.js', import.meta.url), 'utf8');
  const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const idxSrc = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const matSrc = fs.readFileSync(new URL('../js/materials.js', import.meta.url), 'utf8');
  const stSrc = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
  const clSrc = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
  check('G1: kênh ảnh dùng subcollection apps/main/photos (dưới apps/main → rules phủ sẵn, không sửa rules)',
    /const PHOTO_COLL = 'photos'/.test(src) && /collection\(FB_COLL\)\.doc\(FB_DOC\)\.collection\(PHOTO_COLL\)/.test(src));
  check('G2: đẩy DẦN — có giới hạn mỗi đợt + nghỉ giữa 2 ảnh',
    /PHOTO_BATCH_LIMIT = 200/.test(src) && /PHOTO_GAP_MS = 120/.test(src));
  check('G3: chỉ chạy khi ONLINE + có quyền (canPushToCloud) + còn việc',
    /if \(!isFirebaseOnline\(\) \|\| !canPushToCloud\(\)\)/.test(src));
  check('G4: sw.js thêm js/photo-sync.js vào APP_SHELL + tăng CACHE_NAME v194',
    swSrc.includes("'./js/photo-sync.js'") && /nha-may-ngoc-son-v225/.test(swSrc));
  check('G5: index.html có nút "Đồng Bộ Ảnh Ngay" + span trạng thái',
    idxSrc.includes('id="btn-sync-photos"') && idxSrc.includes('id="photo-sync-status"'));
  check('G6: materials.js LƯU thumb vào kho riêng + enqueue (không nhúng thumb vào bản ghi)',
    /putThumb\(thumb \|\| full, id\)/.test(matSrc) && /state\.materialFormImages\.push\(\{ id \}\)/.test(matSrc) &&
    /photoSyncEnqueue\(id\)/.test(matSrc));
  check('G7: materials.js xóa ảnh → dọn kho thumb + xóa doc mây (photoSyncEnqueueDelete)',
    /photoSyncEnqueueDelete/.test(matSrc) && /deleteThumb\(id\)/.test(matSrc));
  check('G8: materials.js hiển thị thumb qua kho/kênh (hydratePhotoThumbs)',
    /hydratePhotoThumbs\(tbody\)/.test(matSrc) && /hydratePhotoThumbs\(wrap\)/.test(matSrc));
  check('G9: migration RÚT thumb khỏi bản ghi (bản ghi chỉ còn { id })',
    /next\.push\(thumbOk \? \{ id: entry\.id \} : entry\)/.test(matSrc));
  check('G10: state.js có key hàng đợi ảnh + dấu đã đẩy (thuần theo máy)',
    stSrc.includes('bamboo_tracker_photo_queue_v1') && stSrc.includes('bamboo_tracker_photo_uploaded_v1'));
  check('G11: ảnh FULL vẫn KHÔNG lên mây (cloud.js vẫn gỡ ảnh khỏi payload apps/main)',
    /stripMaterialPhotoPayload/.test(clSrc) && /materialRecords: stripMaterialPhotoPayload/.test(clSrc));
  check('G12: hằng số GAP/BATCH export để test dùng', ps.PHOTO_GAP_MS === 120 && ps.PHOTO_BATCH_LIMIT === 200);
}

console.log('\nKết quả: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
}