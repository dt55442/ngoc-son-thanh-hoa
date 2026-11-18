// tests/qc.test.mjs — Kiểm thử tab QC (Bảng Xuất Hàng) + cột Số Lượng Xuất
// trong biểu đồ Kế Hoạch vs Đã Ép.
// Bao phủ: load/save, render bảng + dòng tổng, modal thêm dòng (thành phẩm
// trong kế hoạch & ngoài danh sách), validate, sửa inline, điền nhanh tuần
// cho cả danh sách, xóa dòng, phân quyền, dữ liệu biểu đồ, đồng bộ mây.
'use strict';

// ─── Stubs môi trường (giống export-tabs.test.mjs) ────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const { state, STORAGE_KEY_PRESS_INVENTORY_ADJUSTMENTS, STORAGE_KEY_QC_EXPORTS } = await import('../js/state.js');
const qc = await import('../js/qc.js');
const press = await import('../js/press.js');
const cloud = await import('../js/cloud.js');
const perms = await import('../js/permissions.js');

console.log('TODAY', press.todayLocalISO());
state.materialRates = [
  { id: 'rate-1', product: 'Ván 1200x382x9' },
  { id: 'rate-2', product: 'Ván 1200x382x12' }
];
state.planVsPressYear = '2026'; state.planVsPressWeek = 33; state.planVsPressSpan = 1;
state.planVsPressUnit = 'm3'; state.planVsPressTotal = false;
state.planningItems = [
  { year: 2026, week: 'Tuần 33', productId: 'rate-2', qty: 100 },
  { year: 2026, week: 'Tuần 34', productId: 'rate-2', qty: 20 },
  { year: 2026, week: 'Tuần 35', productId: 'rate-2', qty: 20 },
  { year: 2026, week: 'Tuần 33', productId: 'rate-1', qty: 60 },
  { year: 2026, week: 'Tuần 35', productId: 'rate-1', qty: 60 },
  { year: 2026, week: 'Tuần 10', productId: 'rate-1', qty: 50 }
];
state.pressInventoryAdjustments = [];
state.pressRecords = [
  { date: '2025-08-11', week: '2025-W33', productId: 'rate-1', fpDim: '1220x2440x9', finishedQty: 999, vanTho: [], sticks: [] },
  { date: '2026-08-10', week: '2026-W33', productId: 'rate-1', fpDim: '1220x2440x9', finishedQty: 40, vanTho: [], sticks: [] },
  { date: '2026-08-11', week: '2026-W33', productId: 'rate-2', fpDim: '1220x2440x12', finishedQty: 25, vanTho: [], sticks: [] },
  { date: '2026-08-12', week: '2026-W33', productId: 'rate-extra', fpDim: '1220x2440x15', finishedQty: 50, vanTho: [], sticks: [] }
];
state.qcExports = [
  { id: 'q1', productId: 'rate-1', name: 'Ván 1200x382x9', week: 'Tuần 33', year: 2026, qty: 30, note: '' },
  { id: 'q2', productId: null, name: 'Ván 1200x382x12', week: 'Tuần 33', year: 2026, qty: 12, note: 'khớp theo tên' }
];
state.qcFinalRecords = [
  { id: 'reject-1', date: '2026-08-12', kind: 'van', productId: 'rate-1', productName: 'Ván 1200x382x9', qtyReject: 5 }
];
press.renderPlanVsPressChart();
const c = state.planVsPressInstance;
console.log('labels', JSON.stringify(c.data.labels));
console.log('plan', JSON.stringify(c.data.datasets[0].data));
console.log('unitVol2', (1200 * 382 * 12) / 1e9);
console.log('W33 inv', JSON.stringify(press.pressInventoryByWeek(2026, 33)));

// ─── TỒN LIVE ───
const liveToday = press.todayLocalISO();
const d = new Date(`${liveToday}T12:00:00`); d.setDate(d.getDate() + 1);
const liveTomorrow = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
state.pressRecords.push(
  { id: 'live-record-current', date: liveToday, productId: 'rate-live', fpDim: '1220x2440x9', finishedQty: 12, vanTho: [], sticks: [] },
  { id: 'live-record-future', date: liveTomorrow, productId: 'rate-live', fpDim: '1220x2440x9', finishedQty: 4, vanTho: [], sticks: [] }
);
state.qcExports.push(
  { id: 'live-export-current', productId: 'rate-live', name: 'Sản phẩm live', year: 2026, week: 'Tuần 45', weeks: [45], exportDate: liveToday, qty: 5 },
  { id: 'live-export-before-baseline', productId: 'rate-before', name: 'Sản phẩm cũ', exportDate: '2026-10-04', qty: 999 },
  { id: 'live-negative-export', productId: 'rate-live-negative', name: 'Tồn âm live', year: 2026, week: 'Tuần 45', weeks: [45], exportDate: liveToday, qty: 5 }
);
state.qcFinalRecords.push({ id: 'live-reject-current', date: liveToday, kind: 'van', productId: 'rate-live', productName: 'Sản phẩm live', qtyReject: 2 });
console.log('LIVE rows', JSON.stringify(press.pressInventoryLiveByProduct(liveToday)));
console.log('liveToday', liveToday, 'liveTomorrow', liveTomorrow);
