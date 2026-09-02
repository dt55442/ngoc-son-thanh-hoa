// tests/transfer-fields.test.mjs — Kiểm thử hồi quy: ĐIỀU CHUYỂN CÔNG ĐOẠN
// Đảm bảo Vị Trí Mới & Ghi Chú Mới nhập trong modal được GHI ĐÈ lên dữ liệu thẻ
// (trước đây handleTransferSubmit bỏ qua 2 ô nhập này nên thẻ giữ thông tin cũ).
'use strict';

// ─── Stubs môi trường (giống roles-charts.test.mjs) ──────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ctxStub(),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function ctxStub() {
  return new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
      return () => undefined;
    },
    set() { return true; }
  });
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
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.CSS = { escape: (s) => s, supports: () => false };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
global.lucide = { createIcons(){} };

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── TESTS ───────────────────────────────────────────────────────
const { state } = await import('../js/state.js');
const modals = await import('../js/batch-modals.js');

// Đăng nhập admin để mở modal được (openTransferModal có requireEditPermission)
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// Nếu renderAll/saveData văng lỗi do môi trường stub thì chỉ WARN
// (dữ liệu state đã được cập nhật trước khi render — assert vẫn hợp lệ)
function runSubmit() {
  try { modals.handleTransferSubmit({ preventDefault(){} }); }
  catch (e) { console.log('WARN handleTransferSubmit (stub env): ' + (e && e.message)); }
}

// Lô nan mẫu: đang ở Sấy 1, vị trí & ghi chú CŨ
state.batches = [{
  id: 't1', code: 'L01', stage: 'say1', date: '2026-08-01', week: '2026-W31',
  length: 1200, width: 20, thickness: 15, quantity: 5000, volume: 0.36,
  bambooType: 'A', useFor: 'Ván', location: 'LS12', notes: 'Ghi chú cũ'
}];

console.log('--- CHUYỂN CÔNG ĐOẠN: GHI ĐÈ VỊ TRÍ & GHI CHÚ MỚI ---');

// 1) Mở modal: điền sẵn giá trị hiện tại để người dùng sửa
modals.openTransferModal('t1');
check('Mở modal điền sẵn vị trí cũ (LS12)', document.getElementById('transfer-new-location').value === 'LS12');
check('Mở modal điền sẵn ghi chú cũ', document.getElementById('transfer-new-notes').value === 'Ghi chú cũ');

// 2) Người dùng nhập Vị Trí Mới & Ghi Chú Mới rồi xác nhận
document.getElementById('transfer-batch-id').value = 't1';
document.getElementById('transfer-target-stage').value = 'say2';
document.getElementById('transfer-new-location').value = 'K11';
document.getElementById('transfer-new-notes').value = 'Ghi chú mới cho Sấy 2';
runSubmit();

const b1 = state.batches.find(x => x.id === 't1');
check('Công đoạn chuyển sang say2', b1.stage === 'say2');
check('Vị trí mới "K11" GHI ĐÈ vị trí cũ "LS12"', b1.location === 'K11');
check('Ghi chú mới GHI ĐÈ ghi chú cũ', b1.notes === 'Ghi chú mới cho Sấy 2');
check('stageHistory thêm mốc say2', Array.isArray(b1.stageHistory) && b1.stageHistory[b1.stageHistory.length - 1]?.stage === 'say2');

// 3) Chuyển tiếp lần nữa, xóa trắng ô nhập → thông tin cũ bị xóa (trim về rỗng)
modals.openTransferModal('t1');
document.getElementById('transfer-batch-id').value = 't1';
document.getElementById('transfer-target-stage').value = 'kho';
document.getElementById('transfer-new-location').value = '   ';
document.getElementById('transfer-new-notes').value = '';
runSubmit();

const b2 = state.batches.find(x => x.id === 't1');
check('Chuyển tiếp sang kho', b2.stage === 'kho');
check('Vị trí chỉ toàn khoảng trắng → rỗng', b2.location === '');
check('Ghi chú bỏ trống → rỗng', b2.notes === '');

// 4) Lô khác: giữ nguyên giá trị điền sẵn → dữ liệu không bị mất oan
state.batches.push({
  id: 't2', code: 'L02', stage: 'say1', date: '2026-08-02', week: '2026-W31',
  length: 1200, width: 20, thickness: 15, quantity: 10, volume: 0.01,
  bambooType: 'B', useFor: 'Nan', location: 'LS9', notes: 'Giữ nguyên'
});
modals.openTransferModal('t2');
document.getElementById('transfer-batch-id').value = 't2';
document.getElementById('transfer-target-stage').value = 'say2';
document.getElementById('transfer-new-location').value = 'LS9';
document.getElementById('transfer-new-notes').value = 'Giữ nguyên';
runSubmit();

const b3 = state.batches.find(x => x.id === 't2');
check('Lô khác giữ nguyên vị trí/ghi chú khi không sửa gì', b3.location === 'LS9' && b3.notes === 'Giữ nguyên' && b3.stage === 'say2');

// ─── CHUYỂN NHIỀU LÔ: VỊ TRÍ & GHI CHÚ DÙNG CHUNG ────────────────
console.log('--- CHUYỂN NHIỀU LÔ: VỊ TRÍ/GHI CHÚ DÙNG CHUNG ---');

state.batches.push(
  { id: 'm1', code: 'M01', stage: 'say1', date: '2026-08-03', week: '2026-W32', length: 1200, width: 20, thickness: 15, quantity: 100, volume: 0.1, bambooType: 'A',  useFor: 'Ván', location: 'LS1', notes: 'N1' },
  { id: 'm2', code: 'M02', stage: 'say1', date: '2026-08-03', week: '2026-W32', length: 1200, width: 20, thickness: 15, quantity: 200, volume: 0.2, bambooType: 'B',  useFor: 'Nan', location: 'LS2', notes: 'N2' },
  { id: 'm3', code: 'M03', stage: 'say2', date: '2026-08-04', week: '2026-W32', length: 1200, width: 20, thickness: 15, quantity: 50,  volume: 0.05, bambooType: 'A1', useFor: 'Ván', location: 'LS3', notes: 'N3' }
);

// Lần 1: nhập Vị Trí & Ghi Chú dùng chung -> GHI ĐÈ lên mọi lô được chuyển
state.multiTransferMode = true;
state.multiSelectedIds  = ['m1', 'm2', 'm3']; // m3 đã ở say2 -> bị bỏ qua
document.getElementById('mtb-target-stage').value = 'say2';
document.getElementById('mtb-new-location').value = 'K11';
document.getElementById('mtb-new-notes').value = 'Ghi chú chung cả nhóm';
try { await modals.confirmMultiTransfer(); }
catch (e) { console.log('WARN confirmMultiTransfer (stub env): ' + (e && e.message)); }

const mm1 = state.batches.find(x => x.id === 'm1');
const mm2 = state.batches.find(x => x.id === 'm2');
const mm3 = state.batches.find(x => x.id === 'm3');
check('Nhiều lô: chuyển sang say2', mm1.stage === 'say2' && mm2.stage === 'say2');
check('Nhiều lô: vị trí "K11" áp dụng cho mọi lô', mm1.location === 'K11' && mm2.location === 'K11');
check('Nhiều lô: ghi chú chung áp dụng cho mọi lô', mm1.notes === 'Ghi chú chung cả nhóm' && mm2.notes === 'Ghi chú chung cả nhóm');
check('Nhiều lô: lô trùng công đoạn bị bỏ qua (giữ LS3/N3)', mm3.stage === 'say2' && mm3.location === 'LS3' && mm3.notes === 'N3');
check('Nhiều lô: stageHistory thêm mốc say2', mm1.stageHistory[mm1.stageHistory.length - 1]?.stage === 'say2' && mm2.stageHistory[mm2.stageHistory.length - 1]?.stage === 'say2');
check('Nhiều lô: xóa ô nhập sau khi chuyển', document.getElementById('mtb-new-location').value === '' && document.getElementById('mtb-new-notes').value === '');

// Lần 2: để trống -> mỗi lô giữ vị trí/ghi chú RIÊNG của mình
state.multiTransferMode = true;
state.multiSelectedIds  = ['m1', 'm2'];
mm1.location = 'KA'; mm1.notes = 'GA';
mm2.location = 'KB'; mm2.notes = 'GB';
document.getElementById('mtb-target-stage').value = 'kho';
document.getElementById('mtb-new-location').value = '';
document.getElementById('mtb-new-notes').value = '   ';
try { await modals.confirmMultiTransfer(); }
catch (e) { console.log('WARN confirmMultiTransfer (stub env): ' + (e && e.message)); }

check('Nhiều lô: để trống -> giữ vị trí riêng KA/KB', mm1.location === 'KA' && mm2.location === 'KB');
check('Nhiều lô: để trống -> giữ ghi chú riêng GA/GB', mm1.notes === 'GA' && mm2.notes === 'GB');
check('Nhiều lô: chuyển tiếp sang kho', mm1.stage === 'kho' && mm2.stage === 'kho');

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);

