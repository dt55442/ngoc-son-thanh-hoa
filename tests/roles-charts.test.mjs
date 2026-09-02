// tests/roles-charts.test.mjs — Kiểm thử phân quyền & engine biểu đồ đa nguồn
'use strict';

// ─── Stubs môi trường (giống smoke.mjs, rút gọn) ────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: {
      _s: new Set(),
      add(c){ this._s.add(c); },
      remove(c){ this._s.delete(c); },
      toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; },
      contains(c){ return this._s.has(c); }
    },
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
Object.defineProperty(global, "navigator", { value: { onLine: true, userAgent: 'node-test', language: 'vi', clipboard: { writeText: async () => {} } }, configurable: true });
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
global.XLSX = { utils: { book_new: () => ({}), aoa_to_sheet: () => ({}), book_append_sheet(){} }, writeFile(){}, write: () => new ArrayBuffer(8) };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── TESTS ───────────────────────────────────────────────────────
const { state } = await import('../js/state.js');
const perms = await import('../js/permissions.js');
const xlsx = await import('../js/export-xlsx.js');

// Dữ liệu mẫu
state.batches = [
  { id: 'b1', code: 'L01', stage: 'say1', quantity: 100, volume: 1.5, bambooType: 'A', useFor: 'Ván', location: 'Kệ A' },
  { id: 'b2', code: 'L02', stage: 'kho',  quantity: 200, volume: 2.5, bambooType: 'B', useFor: 'Bullig', location: 'Kệ B' }
];
state.planningItems = [
  { id: 'p1', week: 'Tuần 33', year: 2026, productId: 'sp1', qty: 500 },
  { id: 'p2', week: 'Tuần 34', year: 2026, productId: 'sp2', qty: 300 }
];
state.materialRates = [
  { id: 'sp1', product: 'Ván 1200x382x12' },
  { id: 'sp2', product: 'Ván 1200x382x9' }
];
state.pressRecords = [
  { id: 'r1', date: '2026-08-10', week: '2026-W33', year: 2026, productId: 'sp1', productName: 'Ván 1200x382x12', finishedQty: 120, glue: 1.2, additive: 0.1, worker: 'Nam' },
  { id: 'r2', date: '2026-08-12', week: '2026-W33', year: 2026, productId: 'sp1', productName: 'Ván 1200x382x12', finishedQty: 80, glue: 0.8, additive: 0.1, worker: 'Hùng' }
];

// ── 1. PHÂN QUYỀN ──
console.log('--- PHÂN QUYỀN ---');

state.currentUser = null;
check('Khách: không xem được vùng nâng cao', perms.canViewAdvanced() === false);
check('Khách: không sửa được tab nào', perms.canEditTab('kanban') === false);
check('Khách: role = null', perms.getUserRole() === null);

state.currentUser = { username: 'view', role: 'viewer', editTabs: [], allowAdvanced: false };
check('Viewer: không xem vùng nâng cao', perms.canViewAdvanced() === false);
check('Viewer: không sửa kanban', perms.canEditTab('kanban') === false);

state.currentUser = { username: 'ed', role: 'editor', editTabs: ['kanban'], allowAdvanced: false };
check('Editor: xem vùng nâng cao = false', perms.canViewAdvanced() === false);
check('Editor: được sửa kanban', perms.canEditTab('kanban') === true);
check('Editor: KHÔNG được sửa press', perms.canEditTab('press') === false);
check('Editor: được sửa biểu đồ cơ bản nguồn kanban', perms.canEditChartZone('basic', 'kanban') === true);
check('Editor: không sửa được biểu đồ vùng nâng cao', perms.canEditChartZone('advanced', 'kanban') === false);

state.currentUser = { username: 'ql', role: 'manager', editTabs: undefined, allowAdvanced: undefined };
perms.normalizeUser(state.currentUser);
check('Manager: được xem vùng nâng cao', perms.canViewAdvanced() === true);
check('Manager: mặc định được sửa các tab (migrate)', perms.canEditTab('planning') === true);

state.currentUser = { username: 'ql2', role: 'manager', editTabs: ['press'], allowAdvanced: true };
check('Manager (editTabs press): KHÔNG sửa kanban', perms.canEditTab('kanban') === false);
check('Manager (editTabs press): vẫn xem vùng nâng cao', perms.canViewAdvanced() === true);

state.currentUser = { username: 'ed-old', role: 'editor' };
perms.normalizeUser(state.currentUser);
check('Editor cũ (migrate): được sửa kanban', perms.canEditTab('kanban') === true);
check('Editor cũ (migrate): KHÔNG xem nâng cao', perms.canViewAdvanced() === false);

state.currentUser = { username: 'admin', role: 'admin' };
check('Admin: xem vùng nâng cao', perms.canViewAdvanced() === true);
check('Admin: sửa mọi tab (kể cả dashboard)', perms.canEditTab('dashboard') === true);

// ── 2. ENGINE BIỂU ĐỒ ĐA NGUỒN ──
console.log('--- ENGINE BIỂU ĐỒ ---');

const kanbanData = xlsx.computeChartData({ type: 'bar', groupBy: 'bambooType', metric: 'quantity' }, state.batches);
check('Kanban: 2 nhóm A/B', kanbanData.labels.length === 2);
check('Kanban: tổng số lượng 300', kanbanData.datasets[0].data.reduce((a, b) => a + b, 0) === 300);

const planData = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'product', metric: 'qty' });
check('Planning: 2 sản phẩm', planData.labels.length === 2);
check('Planning: tổng kế hoạch 800', planData.datasets[0].data.reduce((a, b) => a + b, 0) === 800);
const planYear = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'year', metric: 'itemCount' });
check('Planning: đếm 2 mục kế hoạch', planYear.datasets[0].data.reduce((a, b) => a + b, 0) === 2);

const pressData = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'worker', metric: 'finishedQty' });
check('Press: 2 công nhân', pressData.labels.length === 2);
check('Press: tổng thành phẩm 200 tấm', pressData.datasets[0].data.reduce((a, b) => a + b, 0) === 200);
const pressGlue = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'week', metric: 'glue' });
check('Press: tổng keo 2.0 kg', Math.abs(pressGlue.datasets[0].data.reduce((a, b) => a + b, 0) - 2.0) < 1e-9);

const pressStack = xlsx.computeChartData({ type: 'stackedBar', source: 'press', groupBy: 'week', stackBy: 'worker', metric: 'finishedQty' });
check('Press xếp tầng: 2 dataset (Nam, Hùng)', pressStack.datasets.length === 2);

state.customCharts = [{ id: 'x1', title: 'Cũ', type: 'bar', groupBy: 'stage', metric: 'volume', stackBy: 'none', palette: 'vibrant', width: 'half' }];
localStorage.setItem('bamboo_tracker_custom_charts_v1', JSON.stringify(state.customCharts));
xlsx.loadCustomCharts();
check('Migrate: chart cũ có zone=basic', state.customCharts[0].zone === 'basic');
check('Migrate: chart cũ có source=kanban', state.customCharts[0].source === 'kanban');

// ── 3. SYNC UI THEO QUYỀN ──
console.log('--- SYNC UI ---');
state.currentUser = { username: 'ed', role: 'editor', editTabs: ['kanban', 'dashboard'], allowAdvanced: false };
perms.syncPermissionUI();
check('body class can-edit = true', document.body.classList.contains('can-edit'));
check('body class can-advanced = false', !document.body.classList.contains('can-advanced'));
check('body data-edit-tabs = "kanban dashboard"', document.body.dataset.editTabs === 'kanban dashboard');
check('body data-role = editor', document.body.dataset.role === 'editor');

state.currentUser = { username: 'ql', role: 'manager', editTabs: [], allowAdvanced: true };
perms.syncPermissionUI();
check('Manager: body.is-manager', document.body.classList.contains('is-manager'));
check('Manager: body.can-advanced', document.body.classList.contains('can-advanced'));

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
