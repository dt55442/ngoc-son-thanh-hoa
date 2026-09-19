// ═══════════════════════════════════════════════════════════
// js/autobackup.js — AUTO BACKUP THÔNG MINH (chống "sai xót/xóa nhầm" mất dữ liệu)
// ───────────────────────────────────────────────────────────
// Lớp 1 — CỤC BỘ (localStorage, key bamboo_tracker_autobackup_v1): tối đa 10 bản
//          theo cơ chế BẬC THANG (giữ theo GIÁ TRỊ PHỤC HỒI, không theo thời gian):
//            · luôn giữ 3 bản MỚI NHẤT + các bản MỐC dung lượng tăng dần (≥125% mốc
//              trước) + bản LỚN NHẤT — bình thường chỉ chiếm 4-6 slot thay vì 10;
//            · BỎ TRÙNG (hash FNV-1a): dữ liệu y hệt bản cất gần nhất → không chụp;
//            · CHỐT GIẢM ĐỘT BIẾN: bản chụp THƯỜNG nhỏ hơn ≥30% so bản mới nhất →
//              KHÔNG lưu (phòng kịch bản ai đó xóa rất nhiều dữ liệu) — bộ cũ tự
//              "đóng băng", không bản lớn nào bị đẩy ra; bản chụp BẮT BUỘC vẫn luôn lưu.
//          Chụp tại thời điểm rủi ro nhất:
//            · trước khi "Tải Dữ Liệu Từ Mây Về Máy" (ghi đè máy),
//            · trước khi nạp/phục hồi file JSON / bản cất / backup mây,
//            · (throttle 5 phút) sau mỗi lần đẩy mây thành công.
// Lớp 2 — MÂY (Firestore apps/backups/dates/<ngày>): 1 bản/ngày, nén gzip, giữ
//          14 ngày; bản >14 ngày nhưng LỚN HƠN bản mới nhất → gia hạn giữ đến
//          60 ngày (tối đa 8 bản mốc lớn) — phòng xóa nhầm lớn phát hiện muộn;
//          nội dung không đổi so bản gần nhất → bỏ ghi hôm nay.
// Lớp 3 — THƯ MỤC DỮ LIỆU: storage.js tự copy bamboo_data.json cũ sang
//          backups/ trước khi ghi đè (giữ 10 bản) — xem js/storage.js.
// PHỤC HỒI luôn GỘP KHÉO qua mergeRemoteIntoLocal (bản mới hơn theo dấu
// thời gian thắng, tôn trọng tombstone) — KHÔNG ghi đè mù quáng.
// ═══════════════════════════════════════════════════════════
import { canPushToCloud, collectCloudSnapshot, gzipStringToBase64, gunzipBase64ToString, initLucide, isFirebaseOnline, mergeRemoteIntoLocal, utf8Bytes } from './cloud.js';
import { STORAGE_KEY_AUTOBACKUP, state } from './state.js';
import { escapeHTML, showToast } from './utils.js';

  const AUTOBACKUP_LIMIT = 10;            // tổng số bản cất cục bộ giữ lại (3 mới nhất + mốc bậc thang)
  const RECENT_KEEP = 3;                  // luôn giữ 3 bản MỚI NHẤT bất kể dung lượng
  const GROWTH_STEP_RATIO = 1.25;         // mốc bậc thang: chỉ giữ bản cũ lớn hơn ≥125% mốc trước
  const SHRINK_DROP_RATIO = 0.7;          // bản thường nhỏ hơn ≥30% so bản mới nhất → KHÔNG lưu
  const NEAR_SAME_RATIO = 0.02;           // bản thường lệch <2% so bản mới nhất → coi như không đổi
  const CLOUD_BACKUP_KEEP_DAYS = 14;      // số ngày giữ backup trên mây (luôn giữ)
  const CLOUD_BACKUP_EXTENDED_KEEP_DAYS = 60; // mốc LỚN hơn bản mới nhất → gia hạn giữ đến 60 ngày
  const CLOUD_BACKUP_EXTENDED_KEEP_MAX = 8;   // tối đa 8 bản mốc lớn được gia hạn
  const CLOUD_BACKUP_MAX_DOC = 900000;    // trần ký tự payload (dưới giới hạn 1 MiB của Firestore)
  const PUSH_CAPTURE_GAP_MS = 5 * 60 * 1000; // throttle chụp sau khi đồng bộ mây
  const CLOUD_BACKUP_KEY = 'bamboo_tracker_cloudbackup_v1'; // { lastDate: 'yyyy-mm-dd' }
  let lastPushCaptureAt = 0;              // mốc throttle chụp (máy cục bộ)
  let shrinkWarned = false;               // cảnh báo giảm đột biến chỉ hiện 1 lần/phiên

  // ─── NẠP / LƯU DANH SÁCH BẢN CẤT CỤC BỘ ──────────────────────
  export function loadAutoBackups() {
    try { state.autoBackups = JSON.parse(localStorage.getItem(STORAGE_KEY_AUTOBACKUP) || '[]'); }
    catch (e) { state.autoBackups = []; }
    if (!Array.isArray(state.autoBackups)) state.autoBackups = [];
    backfillSizesAsync(); // bản cất định dạng cũ chưa có size/hash → tính bù nền
  }
  function saveAutoBackupsLocal() {
    try { localStorage.setItem(STORAGE_KEY_AUTOBACKUP, JSON.stringify(state.autoBackups)); }
    catch (e) {
      // Vượt hạn mức localStorage → bỏ bản cũ nhất rồi thử lại 1 lần
      try {
        state.autoBackups.pop();
        localStorage.setItem(STORAGE_KEY_AUTOBACKUP, JSON.stringify(state.autoBackups));
      } catch (e2) { console.warn('[AUTOBACKUP] Không lưu được bản cất cục bộ', e2); }
    }
  }

  // ─── HASH NỘI DUNG (FNV-1a 32-bit — nhanh, không cần thư viện) ──
  // Dùng so trùng bản cất: hash trùng + kích thước trùng → coi như dữ liệu không đổi.
  function fnv1aHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }

  // Vân tay nội dung THUẦN: bỏ 2 trường meta (updatedAt/updatedBy — luôn đổi theo
  // thời gian) để hash khớp giữa 2 lần chụp khi dữ liệu thực sự không đổi.
  function coreHashOfSnapshot() {
    try {
      const s = collectCloudSnapshot();
      const core = Object.assign({}, s);
      delete core.updatedAt;
      delete core.updatedBy;
      return fnv1aHash(JSON.stringify(core));
    } catch (e) { return ''; }
  }

  // Kích thước TRƠN (trước nén) của 1 bản cất. Bản định dạng mới ghi sẵn entry.size;
  // bản cũ (trước v98) chưa có → ước lượng: chuỗi trơn lấy độ dài, gzip ~6 lần.
  function sizeOfEntry(entry) {
    if (!entry) return 0;
    if (Number(entry.size)) return Number(entry.size);
    if (typeof entry.data === 'string') return entry.data.length;
    if (entry.data && typeof entry.data.gz === 'string') return entry.data.gz.length * 6;
    return 0;
  }

  // Tính bù nền (fire & forget) size/hash cho bản cất tạo TRƯỚC khi có 2 trường này
  async function backfillSizesAsync() {
    const list = state.autoBackups || [];
    let dirty = false;
    for (const e of list) {
      if (!e) continue;
      if (!Number(e.size) && sizeOfEntry(e)) { e.size = sizeOfEntry(e); dirty = true; }
      if (!e.hash && typeof e.data === 'string') { e.hash = fnv1aHash(e.data); dirty = true; }
      else if (!e.hash && e.data && typeof e.data.gz === 'string') {
        try { e.hash = fnv1aHash(await gunzipBase64ToString(e.data.gz)); dirty = true; }
        catch (err) { /* bản hỏng nhẹ — lần chụp sau sẽ có hash */ }
      }
    }
    if (dirty) saveAutoBackupsLocal();
  }

  // Cảnh báo giảm đột biến — chỉ hiện toast 1 LẦN/phiên để không phiền
  function warnShrinkOnce(prevSize, nowSize) {
    const pct = prevSize > 0 ? Math.round((1 - nowSize / prevSize) * 100) : 100;
    console.warn('[AUTOBACKUP] Dữ liệu giảm đột biến −' + pct + '% (' + Math.round(prevSize / 1024) + 'KB → ' + Math.round(nowSize / 1024) + 'KB) — TẠM KHÔNG chụp bản cất, các bản lớn cũ vẫn được giữ nguyên.');
    if (shrinkWarned) return;
    shrinkWarned = true;
    try {
      showToast('Dữ liệu giảm đột biến (−' + pct + '%) — bản cất tự động tạm dừng, các bản lớn cũ vẫn giữ nguyên. Nếu vừa xóa nhầm, hãy mở menu ⋮ → "Phục Hồi Tự Động".', 'warning');
    } catch (e) { /* không có khung toast */ }
  }

  // Chỉ dành cho kiểm thử (tests/autobackup.test.mjs) — reset throttle chụp
  export function resetCaptureThrottleForTest() { lastPushCaptureAt = 0; }

  // Giải nén dữ liệu của 1 bản cất (data = chuỗi JSON hoặc { gz: base64 })
  async function decodeEntryData(entry) {
    if (entry && entry.data && typeof entry.data === 'object' && typeof entry.data.gz === 'string') {
      return gunzipBase64ToString(entry.data.gz);
    }
    return (entry && typeof entry.data === 'string') ? entry.data : '';
  }

  // Nén nền bản cất (chuỗi JSON nặng ~10 lần bản gzip) — fire & forget
  function recompressEntryAsync(entry) {
    if (typeof CompressionStream !== 'function') return; // môi trường không nén được → giữ chuỗi trơn
    (async () => {
      try {
        const gz = await gzipStringToBase64(entry.data);
        if (gz && gz.length < entry.data.length) {
          entry.data = { gz };
          saveAutoBackupsLocal();
        }
      } catch (err) { /* giữ bản trơn */ }
    })();
  }

  // ─── CHỤP 1 BẢN CẤT (serialize ĐỒNG BỘ để đúng trạng thái hiện tại) ──
  // Thông minh 3 lớp chặn để đỡ tốn bộ nhớ:
  //   1) BỎ TRÙNG: nội dung y hệt bản cất gần nhất (hash + kích thước trùng)
  //   2) CHỐT GIẢM ĐỘT BIẾN: bản THƯỜNG nhỏ hơn ≥30% so bản mới nhất → KHÔNG lưu
  //      (phòng kịch bản ai đó xóa rất nhiều dữ liệu — bộ cũ tự "đóng băng")
  //   3) GẦN NHƯ KHÔNG ĐỔI: bản THƯỜNG lệch <2% → bỏ qua
  // Bản chụp BẮT BUỘC (force — trước khi tải mây về/nạp file/phục hồi) luôn được lưu.
  export function captureAutoBackup(reason, force) {
    try {
      if (!force && Date.now() - lastPushCaptureAt < PUSH_CAPTURE_GAP_MS) return;
      let raw = '';
      try { raw = JSON.stringify(collectCloudSnapshot()); } catch (e) { return; }
      if (!raw || raw.length < 30) return; // dữ liệu rỗng → không có gì đáng cất
      lastPushCaptureAt = Date.now();
      const hash = coreHashOfSnapshot(); // vân tay nội dung THUẦN (bỏ meta thời gian)
      const newest = (state.autoBackups || [])[0];
      // 1) Bỏ trùng — không tốn slot cho dữ liệu không đổi
      if (newest && newest.hash === hash && sizeOfEntry(newest) === raw.length) {
        console.log('[AUTOBACKUP] Bỏ qua chụp — dữ liệu không đổi so với bản cất gần nhất.');
        return;
      }
      const newestSize = sizeOfEntry(newest);
      // 2) Chốt giảm đột biến — chỉ áp dụng bản thường; bản bắt buộc (force) vẫn lưu
      if (!force && newestSize > 0 && raw.length < newestSize * SHRINK_DROP_RATIO) {
        warnShrinkOnce(newestSize, raw.length);
        return;
      }
      // 3) Gần như không đổi — bỏ qua cho đỡ tốn bộ nhớ
      if (!force && newestSize > 0 && Math.abs(raw.length - newestSize) < newestSize * NEAR_SAME_RATIO) {
        console.log('[AUTOBACKUP] Bỏ qua chụp — dữ liệu gần như không đổi (<2%).');
        return;
      }
      const entry = {
        ts: new Date().toISOString(),
        by: (state.currentUser && (state.currentUser.fullname || state.currentUser.email)) || 'Khách',
        reason: String(reason || ''),
        size: raw.length, // kích thước TRƠN trước nén — dùng cho bậc thang + chốt giảm
        hash,             // vân tay nội dung (FNV-1a) — dùng bỏ trùng
        data: raw
      };
      state.autoBackups.unshift(entry); // mới nhất lên đầu
      pruneAutoBackupsSmart();
      saveAutoBackupsLocal();
      recompressEntryAsync(entry); // nén nền để tiết kiệm localStorage
    } catch (e) { console.warn('[AUTOBACKUP] Lỗi chụp bản cất', e); }
  }

  // ─── DỌN BẬC THANG (giữ theo GIÁ TRỊ PHỤC HỒI, không theo thời gian) ──
  // · Luôn giữ RECENT_KEEP bản MỚI NHẤT (điểm phục hồi gần).
  // · Nhóm cũ: duyệt từ CŨ → MỚI, chỉ giữ MỐC — bản lớn hơn ≥125% mốc trước
  //   (chuỗi tăng dần; các trạng thái nhỏ trùng lặp ở giữa bị bỏ).
  // · Luôn giữ thêm bản LỚN NHẤT của nhóm cũ (sức chứa dữ liệu từng đạt).
  // · Vượt trần → bỏ mốc NHỎ TRƯỚC (kém giá trị phục hồi nhất).
  export function pruneAutoBackupsSmart() {
    const list = state.autoBackups || [];
    if (list.length <= AUTOBACKUP_LIMIT) return;
    const sizeOf = (e) => Number(e && e.size) || sizeOfEntry(e) || 0;
    const keep = list.slice(0, RECENT_KEEP);
    const old = list.slice(RECENT_KEEP); // từ mới → cũ
    const milestones = [];
    let ref = 0;
    for (let i = old.length - 1; i >= 0; i--) { // duyệt từ CŨ → MỚI
      const s = sizeOf(old[i]);
      if (!milestones.length || s >= ref * GROWTH_STEP_RATIO) { milestones.push(old[i]); ref = s; }
    }
    // luôn giữ bản LỚN NHẤT của nhóm cũ
    let biggest = old[0];
    for (const e of old) if (sizeOf(e) > sizeOf(biggest)) biggest = e;
    if (!milestones.includes(biggest)) milestones.push(biggest);
    let kept = keep.concat(milestones);
    // vượt trần → bỏ mốc NHỎ trước (kém giá trị phục hồi nhất)
    if (kept.length > AUTOBACKUP_LIMIT) {
      const dropCount = kept.length - AUTOBACKUP_LIMIT;
      const dropSet = new Set(milestones.slice().sort((a, b) => sizeOf(a) - sizeOf(b)).slice(0, dropCount));
      kept = kept.filter((e) => !dropSet.has(e));
    }
    kept.sort((a, b) => String(b.ts).localeCompare(String(a.ts))); // mới nhất lên đầu
    state.autoBackups = kept;
  }

  // ─── PHỤC HỒI 1 BẢN CẤT CỤC BỘ (GỘP KHÉO, không ghi đè mù quáng) ──
  export async function restoreAutoBackup(ts) {
    const entry = (state.autoBackups || []).find((b) => b.ts === ts);
    if (!entry) { showToast('Không tìm thấy bản cất này (có thể đã bị xóa).', 'error'); return; }
    let raw = '';
    try { raw = await decodeEntryData(entry); } catch (e) { raw = ''; }
    let snap = null;
    try { snap = JSON.parse(raw); } catch (e) { snap = null; }
    if (!snap) { showToast('Bản cất hỏng — không đọc được dữ liệu.', 'error'); return; }
    captureAutoBackup('Trước khi phục hồi bản cất', true); // chụp hiện tại trước khi đụng dữ liệu
    const changed = mergeRemoteIntoLocal(snap, false);
    showToast(changed
      ? 'Đã phục hồi bản cất (' + fmtTs(entry.ts) + ') — gộp khéo, bản ghi mới hơn được giữ lại.'
      : 'Bản cất không có dữ liệu mới hơn so với hiện tại — không thay đổi gì.', 'success');
  }

  // Xóa 1 bản cất cục bộ (dọn dẹp thủ công)
  export function deleteAutoBackup(ts) {
    state.autoBackups = (state.autoBackups || []).filter((b) => b.ts !== ts);
    saveAutoBackupsLocal();
    renderAutoBackupList();
  }

  // ─── LỚP 2: BACKUP MÂY (1 BẢN/NGÀY, GIỮ 14 NGÀY + GIA HẠN MỐC LỚN) ──
  function cloudBackupCol(db) { return db.collection('apps').doc('backups').collection('dates'); }
  function todayKey() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // Gọi SAU MỖI lần đẩy mây thành công — tự chặn "hôm nay đã cất rồi"
  export async function maybeWriteCloudBackup() {
    try {
      const db = (window.firebase && window.firebase.firestore) ? window.firebase.firestore() : null;
      if (!isFirebaseOnline() || !db || !state.currentUser || !canPushToCloud()) return;
      const key = todayKey();
      let meta = null;
      try { meta = JSON.parse(localStorage.getItem(CLOUD_BACKUP_KEY) || 'null'); } catch (e) {}
      if (meta && meta.lastDate === key) return; // hôm nay đã cất bản backup mây
      const raw = JSON.stringify(collectCloudSnapshot());
      const hash = coreHashOfSnapshot(); // vân tay nội dung THUẦN (bỏ meta thời gian)
      // Đọc 1 LẦN danh sách backup hiện có — dùng cho cả BỎ TRÙNG lẫn DỌN CŨ
      let docs = [];
      try {
        const qs = await cloudBackupCol(db).get();
        qs.forEach((d) => {
          const dd = d.data() || {};
          docs.push({
            id: d.id,
            ref: d.ref,
            ts: Number(dd.ts) || 0,
            size: Number(dd.size) || ((dd.payload && dd.payload.length) || 0),
            hash: String(dd.hash || '')
          });
        });
        docs.sort((a, b) => b.ts - a.ts); // mới nhất trước
      } catch (e) { docs = []; }
      // BỎ TRÙNG: nội dung y hệt bản backup gần nhất → bỏ ghi (tiết kiệm), tính như đã cất hôm nay
      const newest = docs[0];
      if (newest && newest.hash && newest.hash === hash) {
        try { localStorage.setItem(CLOUD_BACKUP_KEY, JSON.stringify({ lastDate: key })); } catch (e) {}
        console.log('[AUTOBACKUP] Bỏ qua backup mây hôm nay — dữ liệu không đổi so với bản gần nhất (' + newest.id + ').');
        return;
      }
      const gzOk = typeof CompressionStream === 'function';
      const payload = gzOk ? await gzipStringToBase64(raw) : raw;
      if (utf8Bytes(payload) > CLOUD_BACKUP_MAX_DOC) {
        console.warn('[AUTOBACKUP] Backup mây quá lớn — bỏ qua hôm nay (dữ liệu chính vẫn đồng bộ bình thường)');
        return;
      }
      await cloudBackupCol(db).doc(key).set({
        __fmt: gzOk ? 'gzip' : 'plain',
        payload,
        size: raw.length, // kích thước TRƠN trước nén — hiển thị + dọn mốc
        hash,
        updatedBy: state.currentUser.email || 'unknown',
        updatedAt: new Date().toISOString(),
        ts: Date.now()
      });
      try { localStorage.setItem(CLOUD_BACKUP_KEY, JSON.stringify({ lastDate: key })); } catch (e) {}
      console.log('[AUTOBACKUP] Đã cất backup mây ngày ' + key);
      pruneCloudBackups(db); // dọn bản cũ — nền, không chặn
    } catch (e) { console.warn('[AUTOBACKUP] Lỗi backup mây (dữ liệu chính không bị ảnh hưởng)', e); }
  }
  async function pruneCloudBackups(db) {
    try {
      const qs = await cloudBackupCol(db).get();
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const cutoffOld = now - CLOUD_BACKUP_KEEP_DAYS * day;          // trong 14 ngày → luôn giữ
      const cutoffMax = now - CLOUD_BACKUP_EXTENDED_KEEP_DAYS * day; // quá 60 ngày → luôn xóa
      const docs = [];
      qs.forEach((d) => {
        const dd = d.data() || {};
        docs.push({ ref: d.ref, ts: Number(dd.ts) || 0, size: Number(dd.size) || ((dd.payload && dd.payload.length) || 0) });
      });
      docs.sort((a, b) => b.ts - a.ts); // mới nhất trước
      if (!docs.length) return;
      const newestSize = docs[0].size;
      // MỐC LỚN: bản >14 ngày nhưng LỚN HƠN bản mới nhất (dữ liệu từng nhiều hơn hiện
      // tại — phòng kịch bản xóa nhầm lớn nhưng muộn mới phát hiện) → gia hạn giữ,
      // tối đa 8 bản lớn nhất, tối đa 60 ngày
      const extended = docs
        .filter((d) => d !== docs[0] && d.ts < cutoffOld && d.ts >= cutoffMax && d.size > newestSize)
        .sort((a, b) => b.size - a.size)
        .slice(0, CLOUD_BACKUP_EXTENDED_KEEP_MAX);
      const keepExt = new Set(extended);
      const dels = [];
      docs.forEach((d) => {
        if (d === docs[0]) return;          // luôn giữ bản mới nhất
        if (d.ts >= cutoffOld) return;      // trong 14 ngày → giữ
        if (keepExt.has(d)) return;         // mốc lớn → gia hạn đến 60 ngày
        if (d.ts) dels.push(d.ref.delete()); // bản cũ nhỏ → xóa (bản hỏng ts=0 cũng dọn)
      });
      if (dels.length) await Promise.all(dels);
    } catch (e) { console.warn('[AUTOBACKUP] Lỗi dọn backup mây cũ', e); }
  }

  // Liệt kê backup mây (cho modal Admin)
  export async function listCloudBackups() {
    const db = (window.firebase && window.firebase.firestore) ? window.firebase.firestore() : null;
    if (!isFirebaseOnline() || !db) return [];
    const qs = await cloudBackupCol(db).get();
    const out = [];
    qs.forEach((d) => {
      const dd = d.data() || {};
      out.push({
        id: d.id,
        updatedBy: dd.updatedBy || '?',
        updatedAt: dd.updatedAt || '',
        size: Number(dd.size) || ((dd.payload && dd.payload.length) || 0) // ưu tiên kích thước TRƠN
      });
    });
    out.sort((a, b) => b.id.localeCompare(a.id)); // mới nhất trước
    return out;
  }
  export async function restoreCloudBackup(id) {
    const db = (window.firebase && window.firebase.firestore) ? window.firebase.firestore() : null;
    if (!isFirebaseOnline() || !db) { showToast('Chưa online — không đọc được backup mây.', 'error'); return; }
    showToast('Đang tải backup mây ' + id + ' ...', 'info');
    try {
      const snap = await cloudBackupCol(db).doc(id).get();
      if (!snap.exists) { showToast('Không tìm thấy backup ' + id + ' trên mây.', 'error'); return; }
      const dd = snap.data() || {};
      let raw = '';
      if (dd.__fmt === 'gzip') raw = await gunzipBase64ToString(dd.payload || '');
      else raw = String(dd.payload || '');
      const remote = JSON.parse(raw);
      captureAutoBackup('Trước khi phục hồi backup mây ' + id, true);
      const changed = mergeRemoteIntoLocal(remote, false);
      showToast(changed
        ? 'Đã phục hồi backup mây ' + id + ' — gộp khéo, bản ghi mới hơn được giữ lại.'
        : 'Backup mây không có dữ liệu mới hơn hiện tại.', 'success');
    } catch (e) {
      console.warn('[AUTOBACKUP] Lỗi phục hồi backup mây', e);
      showToast('Lỗi phục hồi backup mây: ' + ((e && e.message) || e), 'error');
    }
  }

  // ─── ĐỊNH DẠNG THỜI GIAN / DUNG LƯỢNG ────────────────────────
  function fmtTs(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return String(iso || '');
    const pad = (n) => String(n).padStart(2, '0');
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtSize(n) {
    if (!n) return '?';
    return n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
  }

  // ─── MODAL: BẢN CẤT TRÊN MÁY ──────────────────────────────────
  export function openAutoBackupModal() {
    renderAutoBackupList();
    document.getElementById('modal-autobackup')?.classList.add('show');
  }
  export function closeAutoBackupModal() {
    document.getElementById('modal-autobackup')?.classList.remove('show');
  }
  export function renderAutoBackupList() {
    const box = document.getElementById('autobackup-list');
    if (!box) return;
    const list = state.autoBackups || [];
    if (!list.length) {
      box.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px 0;">Chưa có bản cất nào trên máy này.</div>';
      return;
    }
    box.innerHTML = list.map((b) => (
      '<div class="autobackup-row">'
      + '<div class="ab-info">'
      + '<div class="ab-ts">' + escapeHTML(fmtTs(b.ts)) + '</div>'
      + '<div class="ab-meta">' + escapeHTML(b.by || '?')
      + (b.reason ? ' · ' + escapeHTML(b.reason) : '')
      + (Number(b.size) ? ' · ' + fmtSize(b.size) : '') + '</div>'
      + '</div>'
      + '<button type="button" class="btn btn-outline btn-sm" onclick="window.app.restoreAutoBackup(\'' + escapeHTML(b.ts) + '\')">Phục hồi</button>'
      + '<button type="button" class="btn btn-outline btn-sm ab-del" title="Xóa bản cất này" onclick="window.app.deleteAutoBackup(\'' + escapeHTML(b.ts) + '\')">✕</button>'
      + '</div>'
    )).join('');
  }

  // ─── MODAL: BẢN CẤT TRÊN MÂY ──────────────────────────────────
  export function openCloudBackupModal() {
    document.getElementById('modal-cloud-backup')?.classList.add('show');
    renderCloudBackupList();
  }
  export function closeCloudBackupModal() {
    document.getElementById('modal-cloud-backup')?.classList.remove('show');
  }
  export async function renderCloudBackupList() {
    const box = document.getElementById('cloudbackup-list');
    if (!box) return;
    box.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px 0;">Đang tải danh sách backup trên mây...</div>';
    try {
      const list = await listCloudBackups();
      if (!list.length) {
        box.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px 0;">Chưa có backup nào trên mây.<br>Backup tự được cất 1 lần/ngày, sau lần đẩy dữ liệu lên mây ĐẦU TIÊN trong ngày (nội dung không đổi so với bản gần nhất sẽ được bỏ qua để tiết kiệm).</div>';
        return;
      }
      box.innerHTML = list.map((b) => (
        '<div class="autobackup-row">'
        + '<div class="ab-info">'
        + '<div class="ab-ts">' + escapeHTML(b.id) + '</div>'
        + '<div class="ab-meta">' + escapeHTML(b.updatedBy)
        + (b.updatedAt ? ' · ' + escapeHTML(fmtTs(b.updatedAt)) : '')
        + ' · ' + fmtSize(b.size) + '</div>'
        + '</div>'
        + '<button type="button" class="btn btn-outline btn-sm" onclick="window.app.restoreCloudBackup(\'' + escapeHTML(b.id) + '\')">Phục hồi</button>'
        + '</div>'
      )).join('');
      initLucide();
    } catch (e) {
      box.innerHTML = '<div style="text-align:center;color:var(--danger);font-size:0.85rem;padding:20px 0;">Lỗi tải backup mây: ' + escapeHTML(String((e && e.message) || e)) + '</div>';
    }
  }
