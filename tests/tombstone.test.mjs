// tests/tombstone.test.mjs — Kiểm thử DẤU VẾT XÓA (tombstone) cho đồng bộ mây
// Bao phủ: trackDeleted/untrackDeleted + localStorage, snapshot mây mang deletedIds,
// quyền đẩy dữ liệu (manager được đẩy), lọc bản ghi theo tombstone (chặn bản cũ /
// hồi sinh bản mới hơn), gộp snapshot mây qua handleRemoteSnapshot & applyFireSnapshot,
// lọc tuần kế hoạch nguyên liệu, dọn tombstone quá cũ.
'use strict';

// ─── Stubs môi trường (giống hr-attendance.test.mjs) ──────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
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
global.XLSX = {
  utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) },
  writeFile(){}, write: () => new ArrayBuffer(8)
};
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });

// ─── KHUNG CHẠY TEST ──────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const { state, STORAGE_KEY_DELETED_IDS } = await import('../js/state.js');
const tomb = await import('../js/tombstone.js');
const cloud = await import('../js/cloud.js');

function storedTomb() {
  try { return JSON.parse(storeBacking.get(STORAGE_KEY_DELETED_IDS) || '{}'); } catch (e) { return {}; }
}

// ═══════════════ A. TOMBSTONE CƠ BẢN ═══════════════
console.log('--- A. TOMBSTONE CƠ BẢN ---');
state.currentUser = { username: 'admin', role: 'admin' };
state.pressRecords = [
  { id: 'p1', date: '2026-09-01', finishedQty: 10, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
  { id: 'p2', date: '2026-09-02', finishedQty: 20, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' }
];
tomb.trackDeleted('pressRecords', 'p1');
check('TOMB: trackDeleted ghi dấu vết xóa theo id', !!(state.deletedIds.pressRecords && state.deletedIds.pressRecords.p1));
check('TOMB: dấu vết xóa được lưu localStorage', !!(storedTomb().pressRecords && storedTomb().pressRecords.p1));
const snapA = cloud.collectCloudSnapshot();
check('TOMB: snapshot mây mang theo deletedIds', !!(snapA.deletedIds.pressRecords && snapA.deletedIds.pressRecords.p1));
check('TOMB: cloudCore bao gồm deletedIds (lần xóa là 1 thay đổi thật)', cloud.cloudCore(snapA).includes('"deletedIds"'));

const changed = { flag: false };
const list = [
  { id: 'a', updatedAt: '2026-09-01T00:00:00Z' }, // cũ hơn lần xóa -> bị chặn
  { id: 'b' },                                     // không có tombstone -> giữ
  { id: 'c', updatedAt: '2026-09-12T00:00:00Z' }  // mới hơn lần xóa -> hồi sinh
];
state.deletedIds.testCol = { a: '2026-09-10T00:00:00Z', c: '2026-09-10T00:00:00Z' };
const outList = tomb.applyTombstonesToRecordList('testCol', list, changed);
check('LỌC: bản ghi cũ hơn lần xóa bị loại khỏi danh sách', !outList.some(r => r.id === 'a'));
check('LỌC: bản ghi không có tombstone vẫn giữ', outList.some(r => r.id === 'b'));
check('LỌC: bản ghi MỚI HƠN lần xóa được hồi sinh', outList.some(r => r.id === 'c'));
check('LỌC: tombstone của bản hồi sinh được gỡ (thêm lại có chủ đích)', !state.deletedIds.testCol.c && !!state.deletedIds.testCol.a);
check('LỌC: changed.flag bật lên khi có thay đổi', changed.flag === true);
delete state.deletedIds.testCol;

// ═══════════════ B. QUYỀN ĐẨY DỮ LIỆU LÊN MÂY ═══════════════
console.log('--- B. QUYỀN ĐẨY DỮ LIỆU (manager được đẩy) ---');
for (const [role, expected] of [['admin', true], ['editor', true], ['manager', true], ['viewer', false]]) {
  state.currentUser = { username: 'u', role };
  check(`QUYỀN: role=${role} → canPushToCloud=${expected}`, cloud.canPushToCloud() === expected);
}
state.currentUser = null;
check('QUYỀN: chưa đăng nhập → không được đẩy', cloud.canPushToCloud() === false);
state.currentUser = { username: 'admin', role: 'admin' };

// ═══════════════ C. MÁY B NHẬN TOMBSTONE TỪ MÂY (lan truyền lần xóa) ═══════════════
console.log('--- C. LAN TRUYỀN LẦN XÓA QUA handleRemoteSnapshot ---');
// Mô phỏng máy B còn giữ bản p1 cũ (chưa nhận được lần xóa của máy A)
tomb.untrackDeleted('pressRecords', 'p1');
state.pressRecords = [
  { id: 'p1', date: '2026-09-01', finishedQty: 10, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
  { id: 'p2', date: '2026-09-02', finishedQty: 20, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' }
];
const remoteSnapshot = {
  pressRecords: [
    { id: 'p2', date: '2026-09-02', finishedQty: 20, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' },
    { id: 'p3', date: '2026-09-03', finishedQty: 30, createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z' }
  ],
  deletedIds: { pressRecords: { p1: '2026-09-10T00:00:00Z' } },
  updatedBy: 'a@factory', updatedAt: '2026-09-10T00:05:00Z'
};
cloud.handleRemoteSnapshot({ exists: true, data: () => remoteSnapshot });
check('MÁY B: bản p1 đã bị máy A xóa bị GỠ khỏi máy (không còn sống lại)', !state.pressRecords.some(r => r.id === 'p1'));
check('MÁY B: tombstone p1 được hợp nhất từ mây', state.deletedIds.pressRecords && state.deletedIds.pressRecords.p1 === '2026-09-10T00:00:00Z');
check('MÁY B: tombstone p1 được lưu localStorage', storedTomb().pressRecords && storedTomb().pressRecords.p1 === '2026-09-10T00:00:00Z');
check('MÁY B: bản mới p3 trên mây được bổ sung', state.pressRecords.some(r => r.id === 'p3'));
check('MÁY B: bản p2 vẫn giữ nguyên', state.pressRecords.some(r => r.id === 'p2'));

// ═══════════════ D. TẢI TỪ MÂY VỀ MÁY (applyFireSnapshot) TÔN TRỌNG TOMBSTONE ═══════════════
console.log('--- D. applyFireSnapshot TÔN TRỌNG DẤU VẾT XÓA ---');
// D1: mây vẫn còn p2 (chưa bị xóa) + tombstone p1 -> p1 KHÔNG được hồi sinh
cloud.applyFireSnapshot({
  pressRecords: [
    { id: 'p2', date: '2026-09-02', finishedQty: 20, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' },
    { id: 'p1', date: '2026-09-01', finishedQty: 10, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' }
  ],
  deletedIds: { pressRecords: { p1: '2026-09-10T00:00:00Z' } }
});
check('TẢI MÂY: p1 (đã có tombstone) KHÔNG được nhận về', !state.pressRecords.some(r => r.id === 'p1'));
check('TẢI MÂY: p2 vẫn được nhận về', state.pressRecords.some(r => r.id === 'p2'));
// D2: bản ghi được tạo lại MỚI HƠN lần xóa -> hồi sinh + gỡ tombstone
cloud.applyFireSnapshot({
  pressRecords: [
    { id: 'p1', date: '2026-09-01', finishedQty: 99, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-12T00:00:00Z' }
  ],
  deletedIds: { pressRecords: { p1: '2026-09-10T00:00:00Z' } }
});
check('TẢI MÂY: p1 nhập lại với dấu thời gian MỚI HƠN lần xóa → hồi sinh', state.pressRecords.some(r => r.id === 'p1' && r.finishedQty === 99));
check('TẢI MÂY: tombstone p1 được gỡ sau hồi sinh', !(state.deletedIds.pressRecords && state.deletedIds.pressRecords.p1));

// ═══════════════ E. KẾ HOẠCH NGUYÊN LIỆU (materialPlan) THEO TUẦN ═══════════════
console.log('--- E. materialPlan LỌC TUẦN ĐÃ XÓA ---');
state.deletedIds.materialPlan = { '2026-W36': '2026-09-10T00:00:00Z' };
const plan = {
  '2026-W36': { 'lo-hoi': 5, updatedAt: '2026-09-01T00:00:00Z' }, // cũ hơn lần xóa -> bị chặn
  '2026-W37': { 'xuong-1': 3, updatedAt: '2026-09-12T00:00:00Z' } // mới hơn lần xóa -> hồi sinh
};
const changedPlan = { flag: false };
const planOut = tomb.stripTombstonedPlanWeeks(plan, changedPlan);
check('NL-PLAN: tuần đã bị xóa (W36) không được nhận lại', !planOut['2026-W36']);
check('NL-PLAN: tuần W37 có bản mới hơn lần xóa được hồi sinh', !!planOut['2026-W37']);
check('NL-PLAN: tombstone W37 gỡ, W36 giữ lại làm dấu vết', !state.deletedIds.materialPlan['2026-W37'] && !!state.deletedIds.materialPlan['2026-W36']);
check('NL-PLAN: changed.flag bật lên', changedPlan.flag === true);
delete state.deletedIds.materialPlan;

// ═══════════════ F. NẠP + DỌN TOMBSTONE (loadDeletedIds) ═══════════════
console.log('--- F. NẠP TOMBSTONE TỪ localStorage + DỌN CŨ ---');
const NOW = Date.now();
const iso = (ms) => new Date(ms).toISOString();
state.deletedIds.pressRecords = {
  'p-old': iso(NOW - 200 * 24 * 3600 * 1000),  // quá 90 ngày -> bị dọn
  'p-keep': iso(NOW)                           // còn hạn -> giữ
};
tomb.saveDeletedIds();
state.deletedIds = {}; // giả lập máy vừa mở lại app
tomb.loadDeletedIds();
check('NẠP: tombstone còn hạn được nạp lại từ localStorage', !!(state.deletedIds.pressRecords && state.deletedIds.pressRecords['p-keep']));
check('NẠP: tombstone quá cũ (>90 ngày) bị dọn sạch', !(state.deletedIds.pressRecords && state.deletedIds.pressRecords['p-old']));

// ═══════════════ G. UNTRACK (hoàn tác khôi phục bản ghi) ═══════════════
console.log('--- G. UNTRACK: HOÀN TÁC PHỤC HỒI BẢN GHI ---');
tomb.trackDeleted('batches', ['b1', 'b2']);
check('UNTRACK: tombstone b1/b2 được ghi', !!(state.deletedIds.batches && state.deletedIds.batches.b1 && state.deletedIds.batches.b2));
tomb.untrackDeleted('batches', ['b1']);
check('UNTRACK: gỡ b1 giữ lại b2', !state.deletedIds.batches.b1 && !!state.deletedIds.batches.b2);
tomb.untrackDeleted('batches', ['b2']);
check('UNTRACK: gỡ b2 -> danh sách tombstone rỗng được dọn hẳn', !state.deletedIds.batches);

// ═══════════════ KẾT QUẢ ═══════════════
console.log('════════════════════════════════════════════');
console.log(`TOMBSTONE: ${pass} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;



