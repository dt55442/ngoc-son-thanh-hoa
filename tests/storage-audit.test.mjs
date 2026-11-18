// ═══════════════════════════════════════════════════════════════
// tests/storage-audit.test.mjs — CÔNG CỤ "BỘ NHỚ MÁY" (17/11/2026)
// Kiểm: đo dung lượng từng key · 5 hàm dọn (trả ký tự giải phóng, không đụng
// dữ liệu chính) · hành vi nút dọn · render modal · cấu trúc file hệ thống.
// ═══════════════════════════════════════════════════════════════
'use strict';

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS — ' + name); } else { fail++; console.log('FAIL — ' + name); } }
function section(t) { console.log('\n--- ' + t + ' ---'); }

// ─── STUB localStorage + DOM (giống stub của smoke) ─────────────
const backing = new Map();
globalThis.localStorage = {
  getItem: (k) => (backing.has(k) ? backing.get(k) : null),
  setItem: (k, v) => { backing.set(String(k), String(v)); },
  removeItem: (k) => { backing.delete(k); },
  key: (i) => [...backing.keys()][i] ?? null,
  get length() { return backing.size; },
  clear: () => backing.clear(),
};
let confirmYes = true;
globalThis.confirm = () => confirmYes;
let toasts = [];
globalThis.showToast = (msg) => { toasts.push(msg); };

function makeEl(id) {
  return {
    id, innerHTML: '', classList: { contains: () => false, add() {}, remove() {} },
  };
}
const els = new Map();
globalThis.document = {
  getElementById: (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  addEventListener() {}, removeEventListener() {}, // dashboard.js đăng ký sự kiện ở cấp module
};
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });

// ─── Nạp node:fs (dùng cho mục kiểm cấu trúc file) ───────────────
const fs = await import('node:fs');

// Nạp module SAU khi stub xong
const sa = await import('../js/storage-audit.js');

// ─── A. ĐO DUNG LƯỢNG ──────────────────────────────────────────
section('A. Đo dung lượng từng key');
backing.set('bamboo_tracker_data_v1', 'x'.repeat(3000));
backing.set('bamboo_tracker_press_records_v1', 'y'.repeat(1000));
backing.set('bamboo_tracker_autobackup_v1', 'z'.repeat(500));
backing.set('bamboo_tracker_empty_v1', '');
const entries = sa.saUsageEntries();
check('A1: đếm đúng số key (bỏ key rỗng)', entries.length === 3);
check('A2: sort giảm dần — key lớn nhất đứng đầu', entries[0].key === 'bamboo_tracker_data_v1');
check('A3: bytes tính theo UTF-16 (2 byte/ký tự + key)', entries[0].bytes > 6000 && entries[0].bytes < 6100);
check('A4: key dữ liệu chính gắn cờ isCore', entries[0].isCore === true && entries[2].isCore === false);
check('A5: key quen thuộc có nhãn thân thiện', entries[2].label.indexOf('Bản cất tự động') === 0);
check('A6: fmtSaBytes đúng định dạng', sa.fmtSaBytes(1024 * 1024 * 1.5) === '1.50 MB' && sa.fmtSaBytes(2048) === '2 KB');
const totalAll = entries.reduce((s, e) => s + e.bytes, 0);
check('A7: tổng khớp tổng từng key', totalAll === entries[0].bytes + entries[1].bytes + entries[2].bytes);

// ─── B. DỌN BẢN CẤT TỰ ĐỘNG ────────────────────────────────────
section('B. saTrimAutoBackups — giữ 1 bản mới nhất');
backing.set('bamboo_tracker_autobackup_v1', JSON.stringify([
  { ts: '2026-11-17T03:00:00Z', reason: 'R3', data: 'd3'.repeat(300) },
  { ts: '2026-11-16T03:00:00Z', reason: 'R2', data: 'd2'.repeat(300) },
  { ts: '2026-11-15T03:00:00Z', reason: 'R1', data: 'd1'.repeat(300) },
]));
const beforeLen = backing.get('bamboo_tracker_autobackup_v1').length;
const freedB = sa.saTrimAutoBackups(1);
const listB = JSON.parse(backing.get('bamboo_tracker_autobackup_v1'));
check('B1: chỉ còn 1 bản + đúng bản MỚI NHẤT', listB.length === 1 && listB[0].reason === 'R3');
check('B2: trả số ký tự đã giải phóng > 0', freedB > 0 && beforeLen - freedB === backing.get('bamboo_tracker_autobackup_v1').length);
check('B3: ít hơn 1 bản → không dọn (trả 0)', sa.saTrimAutoBackups(1) === 0);
backing.set('bamboo_tracker_autobackup_v1', 'không phải JSON');
check('B4: JSON hỏng → trả 0 an toàn', sa.saTrimAutoBackups(1) === 0);

// ─── C. DỌN LỊCH SỬ ────────────────────────────────────────────
section('C. saTrimHistory — giữ 60 dòng MỚI NHẤT');
backing.set('bamboo_tracker_history_v1', JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ n: i, at: '2026-11-' + String(1 + (i % 28)).padStart(2, '0') }))));
const freedC = sa.saTrimHistory(60);
const listC = JSON.parse(backing.get('bamboo_tracker_history_v1'));
check('C1: còn 60 dòng + đúng các dòng MỚI NHẤT', listC.length === 60 && listC[0].n === 40 && listC[59].n === 99);
check('C2: trả số ký tự giải phóng', freedC > 0);

// ─── D. XÓA SỔ XUNG ĐỘT ────────────────────────────────────────
section('D. saClearSyncConflicts — xoá conflicts, giữ base');
backing.set('bamboo_tracker_sync_state_v1', JSON.stringify({
  base: { pressRecords: { id1: 'h1' } },
  conflicts: Array.from({ length: 30 }, (_, i) => ({ domain: 'pressRecords', id: 'i' + i, a: 'x'.repeat(200), b: 'y'.repeat(200) })),
  lastRev: 7,
}));
const freedD = sa.saClearSyncConflicts();
const stD = JSON.parse(backing.get('bamboo_tracker_sync_state_v1'));
check('D1: conflicts rỗng + giữ nguyên base/lastRev', stD.conflicts.length === 0 && stD.base.pressRecords.id1 === 'h1' && stD.lastRev === 7);
check('D2: trả số ký tự giải phóng lớn', freedD > 1000);
backing.set('bamboo_tracker_sync_state_v1', JSON.stringify({ base: {}, conflicts: [] }));
check('D3: sổ đã trống → trả 0', sa.saClearSyncConflicts() === 0);

// ─── E. CACHE NHÂN SỰ 1 THÁNG ──────────────────────────────────
section('E. saTrimHrCache — 3 cache về 1 tháng gần nhất');
const now = new Date();
const m0 = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
const m1dt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const m1 = m1dt.getFullYear() + '-' + String(m1dt.getMonth() + 1).padStart(2, '0');
const mOld = '2020-01';
function hrRec(m, n, pad) { return { id: n, date: m + '-10', note: 'v'.repeat(pad) }; }
backing.set('bamboo_tracker_hr_assignments_v1', JSON.stringify([hrRec(m0, 'a', 100), hrRec(m1, 'b', 100), hrRec(mOld, 'c', 100)]));
backing.set('bamboo_tracker_hr_attendance_v1', JSON.stringify([hrRec(m1, 'd', 100), hrRec(mOld, 'e', 100)]));
backing.set('bamboo_tracker_hr_checkins_v1', JSON.stringify([]));
const freedE = sa.saTrimHrCache();
const keptAsg = JSON.parse(backing.get('bamboo_tracker_hr_assignments_v1'));
const keptAtt = JSON.parse(backing.get('bamboo_tracker_hr_attendance_v1'));
check('E1: bố trí chỉ giữ tháng NÀY (cache 1 tháng)', keptAsg.length === 1 && keptAsg[0].id === 'a');
check('E2: tháng này chưa có dữ liệu → giữ tháng MỚI NHẤT có dữ liệu', keptAtt.length === 1 && keptAtt[0].id === 'd');
check('E3: trả số ký tự giải phóng', freedE > 0);
check('E4: cache rỗng → không lỗi, KHÔNG ghi đè (giữ nguyên "[]")', backing.get('bamboo_tracker_hr_checkins_v1') === '[]');

// ─── F. TOMBSTONE > 90 NGÀY ────────────────────────────────────
section('F. saPruneTombstones — dọn dấu vết xóa quá 90 ngày');
const oldTs = new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString();
const newTs = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
backing.set('bamboo_tracker_deleted_ids_v1', JSON.stringify({
  batches: { lot_old: oldTs, lot_new: newTs },
  pressRecords: { p_old: oldTs },
}));
const freedF = sa.saPruneTombstones(90);
const tombF = JSON.parse(backing.get('bamboo_tracker_deleted_ids_v1'));
check('F1: tombstone mới giữ, cũ bị gỡ', tombF.batches.lot_new === newTs && tombF.batches.lot_old === undefined);
check('F2: cột hết dấu vết bị xoá hẳn', tombF.pressRecords === undefined);
check('F3: trả số ký tự giải phóng', freedF > 0);

// ─── G. HÀNH VI NÚT DỌN + RENDER MODAL ─────────────────────────
section('G. runStorageAuditAction + renderStorageAudit');
backing.set('bamboo_tracker_autobackup_v1', JSON.stringify([
  { ts: '2026-11-17T03:00:00Z', reason: 'R2', data: 'q'.repeat(400) },
  { ts: '2026-11-16T03:00:00Z', reason: 'R1', data: 'q'.repeat(400) },
]));
confirmYes = false;
check('G1: người dùng từ chối confirm → không dọn', sa.runStorageAuditAction('autobackup') === 0 && JSON.parse(backing.get('bamboo_tracker_autobackup_v1')).length === 2);
confirmYes = true;
toasts = [];
const freedG = sa.runStorageAuditAction('autobackup');
check('G2: chạy dọn — giải phóng > 0 + còn đúng 1 bản', freedG > 0 && JSON.parse(backing.get('bamboo_tracker_autobackup_v1')).length === 1);
check('G3: act lạ → trả 0 an toàn', sa.runStorageAuditAction('khong-ton-tai') === 0);
const body = document.getElementById('sa-body');
sa.renderStorageAudit();
check('G4: render tổng + bảng + 5 nút dọn + dặn sao lưu + ghi chú hạn mức',
  body.innerHTML.indexOf('/ ~5 MB hạn mức') !== -1
  && body.innerHTML.indexOf('Sao Lưu JSON') !== -1
  && (body.innerHTML.match(/data-sa-act="/g) || []).length === 5
  && body.innerHTML.indexOf('KHÔNG thể nâng cấp') !== -1
  && body.innerHTML.indexOf('Bản cất tự động (tối đa 10 bản)') !== -1);
check('G5: module gọi showToast khi dọn (thông báo giải phóng)', (fs.readFileSync(new URL('../js/storage-audit.js', import.meta.url), 'utf8')).includes("showToast(msg"));
sa.openStorageAudit();
check('G6: openStorageAudit render không ném lỗi', body.innerHTML.length > 100);
sa.closeStorageAudit();
check('G7: storageAuditIsOpen export có sẵn', typeof sa.storageAuditIsOpen === 'function');

// ─── H. CẤU TRÚC FILE HỆ THỐNG ─────────────────────────────────
section('H. Cấu trúc index/events/sw/CSS/cache');
const idx = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ev = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const stateSrc = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
check('H1: index.html có nút menu (admin-only) + modal + các id cần thiết',
  idx.includes('id="btn-storage-audit"') && /id="btn-storage-audit"[^>]*data-admin-only/.test(idx)
  && idx.includes('id="modal-storage-audit"') && idx.includes('id="btn-close-storage-audit"')
  && idx.includes('id="btn-sa-refresh"') && idx.includes('id="btn-sa-ok"'));
check('H2: modal nằm cấp trang (sau modal-pending-list)', idx.indexOf('id="modal-pending-list"') < idx.indexOf('id="modal-storage-audit"'));
check('H3: events.js import + wire mở/đóng/đo lại/nút dọn/Esc',
  ev.includes("from './storage-audit.js'")
  && /safeOn\('btn-storage-audit', 'click', \(\) => openStorageAudit\(\)\)/.test(ev)
  && ev.includes("safeOn('btn-sa-refresh', 'click', () => renderStorageAudit())")
  && /safeOn\('sa-actions', 'click'/.test(ev)
  && ev.includes("getAttribute('data-sa-act')")
  && ev.includes("if (e.key === 'Escape') closeStorageAudit()"));
check('H4: sw.js có js/storage-audit.js trong APP_SHELL', sw.includes("'./js/storage-audit.js'"));
const cssAt = css.indexOf('.sa-card {');
check('H5: khối CSS .sa-* đặt CUỐI file + depth 0 (không lọt vào @media)',
  cssAt > 0 && css.indexOf('.sa-card {') === cssAt // lần ĐẦU tiên xuất hiện chính là khối CUỐI file
  && (() => { let d = 0; for (const ch of css.slice(0, cssAt)) { if (ch === '{') d++; else if (ch === '}') d--; } return d === 0; })()
  && css.slice(cssAt).includes('.sa-act-btn'));
const swVer = /nha-may-ngoc-son-v(\d+)/.exec(sw);
const appVer = /APP_VERSION = 'v(\d+)'/.exec(stateSrc);
check('H6: cache sw.js khớp APP_VERSION (v440)', swVer && appVer && swVer[1] === appVer[1] && swVer[1] === '440');

console.log('\n───────────────────────────');
console.log('STORAGE-AUDIT: ' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) process.exit(1);
