// tests/autobackup.test.mjs — Kiểm thử AUTO BACKUP (js/autobackup.js):
// chụp bản cất (throttle), ring buffer 10 bản, phục hồi GỘP KHÉO qua
// mergeRemoteIntoLocal (bản ghi mới hơn theo dấu thời gian thắng), không ghi đè mù quáng.
'use strict';

// ─── Stubs môi trường (giống hr-overtime.test.mjs) ──────────────
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
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
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

const { state, STORAGE_KEY_AUTOBACKUP } = await import('../js/state.js');
const ab = await import('../js/autobackup.js');

state.currentUser = { username: 'admin', role: 'admin', fullname: 'Quản Trị', email: 'a@b.c' };

// ═══════════════ A. CHỤP BẢN CẤT & RING BUFFER ══════════════════
console.log('--- A. Chụp bản cất + ring buffer 10 bản ---');
state.autoBackups = [];
state.batches = [{ id: 'b1', code: 'N001', quantity: 10, stage: 'say1', createdAt: '2026-09-17T00:00:00Z' }];
ab.captureAutoBackup('Lần 1', true);
check('AB: chụp lần 1 tạo 1 bản cất', state.autoBackups.length === 1);
check('AB: bản cất có lý do + người cất', state.autoBackups[0].reason === 'Lần 1' && state.autoBackups[0].by === 'Quản Trị');
check('AB: dữ liệu bản cất chứa lô nan', state.autoBackups[0].data.includes('N001'));
check('AB: đã ghi localStorage', JSON.parse(storeBacking.get(STORAGE_KEY_AUTOBACKUP) || '[]').length === 1);
check('AB: throttle — không force thì KHÔNG chụp thêm (trong 5 phút)', (ab.captureAutoBackup('Lần 2', false), state.autoBackups.length === 1));

// Ring buffer: chụp 12 lần (force) — chỉ giữ 10 bản
for (let i = 0; i < 12; i++) ab.captureAutoBackup('Lần ' + (i + 3), true);
check('AB: ring buffer giữ tối đa 10 bản', state.autoBackups.length === 10);
check('AB: bản cũ nhất bị loại (Lần 1 không còn)', !state.autoBackups.some(b => b.reason === 'Lần 1'));
check('AB: localStorage khớp ring buffer', JSON.parse(storeBacking.get(STORAGE_KEY_AUTOBACKUP) || '[]').length === 10);

// ═══════════════ B. PHỤC HỒI GỘP KHÉO ═══════════════════════════
console.log('--- B. Phục hồi bản cất — GỘP KHÉO (không ghi đè mù quáng) ---');
// B1: bản cất chứa lô b1; sau đó máy XÓA b1 đúng quy trình (tombstone) →
//     phục hồi KHÔNG được hồi sinh b1 (tôn trọng tombstone)
ab.captureAutoBackup('Trước khi xóa nhầm', true);
const entryBefore = state.autoBackups.find(b => b.reason === 'Trước khi xóa nhầm');
state.batches = [{ id: 'b2', code: 'N002', quantity: 5, stage: 'kho', createdAt: '2026-09-17T01:00:00Z' }];
state.deletedIds = { batches: { b1: '2026-09-17T02:00:00Z' } };
await ab.restoreAutoBackup(entryBefore.ts);
check('AB: phục hồi KHÔNG hồi sinh b1 đã bị xóa (tombstone thắng)', !state.batches.some(b => b.id === 'b1'));
check('AB: phục hồi KHÔNG mất lô mới b2', state.batches.some(b => b.id === 'b2'));

// B2: bản cất chứa lô b3; sau đó máy MẤT b3 (không tombstone) → phục hồi bổ sung lại
state.batches = [{ id: 'b3', code: 'N003', quantity: 7, stage: 'bao_tinh', createdAt: '2026-09-17T03:00:00Z' }];
state.deletedIds = {};
ab.captureAutoBackup('Bản cất có b3', true);
const entryLost = state.autoBackups.find(b => b.reason === 'Bản cất có b3');
state.batches = [{ id: 'b4', code: 'N004', quantity: 8, stage: 'kho', createdAt: '2026-09-17T04:00:00Z' }]; // giả lập mất b3
await ab.restoreAutoBackup(entryLost.ts);
check('AB: phục hồi bổ sung lại lô b3 bị mất (gộp khéo)', state.batches.some(b => b.id === 'b3'));
check('AB: phục hồi giữ nguyên lô hiện có b4', state.batches.some(b => b.id === 'b4'));

// ═══════════════ C. LOAD từ localStorage ═════════════════════════
console.log('--- C. loadAutoBackups nạp lại từ localStorage ---');
ab.loadAutoBackups();
check('AB: loadAutoBackups nạp đúng số bản', state.autoBackups.length === 10);
check('AB: dữ liệu đọc từ localStorage khớp', state.autoBackups.some(b => b.reason === 'Bản cất có b3'));

// ═══════════════ D. XÓA 1 BẢN CẤT ════════════════════════════════
console.log('--- D. deleteAutoBackup ---');
const delTs = state.autoBackups[0].ts;
ab.deleteAutoBackup(delTs);
check('AB: xóa bản cất theo ts', !state.autoBackups.some(b => b.ts === delTs));
check('AB: localStorage cập nhật sau xóa', !JSON.parse(storeBacking.get(STORAGE_KEY_AUTOBACKUP) || '[]').some(b => b.ts === delTs));

// ═══════════════ E. API EXPORT ═══════════════════════════════════
console.log('--- E. API export đầy đủ ---');
check('AB: module export đủ API phục hồi', typeof ab.restoreAutoBackup === 'function' && typeof ab.restoreCloudBackup === 'function' && typeof ab.maybeWriteCloudBackup === 'function');

console.log(`KẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
