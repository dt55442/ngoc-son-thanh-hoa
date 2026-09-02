// tests/chart-filters.test.mjs — Kiểm thử bộ lọc & nhãn thân thiện của engine biểu đồ
// Bao phủ: sản phẩm mồ côi (định mức đã xóa), gộp biến thể tên công nhân,
// tuần dạng thân thiện, sắp xếp số học tự nhiên.
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
global.XLSX = { utils: { book_new: () => ({}), aoa_to_sheet: () => ({}), book_append_sheet(){} }, writeFile(){}, write: () => new ArrayBuffer(8) };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

const { state } = await import('../js/state.js');
const xlsx = await import('../js/export-xlsx.js');
const dash = await import('../js/dashboard.js');
const pressExports = await import('../js/press.js');
const planMod = await import('../js/planning.js');

// ─── DỮ LIỆU MẪU MÔ PHỎNG DỮ LIỆU THẬT "BẤT ỔN" ──────────────────
state.materialRates = [
  { id: 'rate-live1', product: 'Ván 1200x382x12' },
  { id: 'rate-live2', product: 'Ván 950x382x9' }
];
// Kế hoạch: 2 mục còn định mức + 2 mục trỏ mã định mức ĐÃ XÓA (rate-1756...)
state.planningItems = [
  { id: 'p1', week: 'Tuần 33', year: 2026, productId: 'rate-live1', qty: 500 },
  { id: 'p2', week: 'Tuần 2',  year: 2026, productId: 'rate-live2', qty: 300 },
  { id: 'p3', week: 'Tuần 10', year: 2025, productId: 'rate-1756759612345', qty: 120 },
  { id: 'p4', week: 'Tuần 2',  year: 2025, productId: 'rate-1756999999999', qty: 80 }
];
// Ép ván: worker trùng biến thể ('Nam' / 'nam ' / 'NAM'), 1 lượt ép sản phẩm mồ côi
state.pressRecords = [
  { id: 'r1', date: '2026-08-10', week: '2026-W33', year: 2026, productId: 'rate-live1', productName: 'Ván 1200x382x12', finishedQty: 120, glue: 1.2, additive: 0.1, worker: 'Nam' },
  { id: 'r2', date: '2026-08-12', week: '2026-W33', year: 2026, productId: 'rate-live1', productName: 'Ván 1200x382x12', finishedQty: 80, glue: 0.8, additive: 0.1, worker: 'nam ' },
  { id: 'r3', date: '2026-08-13', week: '2026-W33', year: 2026, productId: 'rate-live2', productName: 'Ván 950x382x9', finishedQty: 50, glue: 0.5, additive: 0, worker: 'Hùng' },
  { id: 'r4', date: '2025-01-08', week: '2025-W02', year: 2025, productId: 'rate-1756759612345', productName: '', finishedQty: 30, glue: 0.3, additive: 0, worker: 'NAM' }
];

console.log('--- SẢN PHẨM MỒ CÔI (định mức đã xóa) ---');

const planProd = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'product', metric: 'qty' });
check('KH: KHÔNG hiện mã thô rate-1756...', !planProd.labels.some(l => String(l).includes('rate-')));
check('KH: có nhãn "Sản phẩm cũ (định mức đã xóa)"', planProd.labels.some(l => String(l).includes('Sản phẩm cũ')));
const orphanIdx = planProd.labels.findIndex(l => String(l).includes('Sản phẩm cũ'));
check('KH: gộp đúng tổng 2 mục mồ côi = 200', planProd.datasets[0].data[orphanIdx] === 200);
check('KH: đủ 3 nhóm (2 sản phẩm + mồ côi)', planProd.labels.length === 3);

const pressProd = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'product', metric: 'finishedQty' });
check('ÉP: KHÔNG hiện mã thô productId', !pressProd.labels.some(l => /^rate-/.test(String(l))));
check('ÉP: lượt ép mồ côi về nhóm "Sản phẩm cũ..."', pressProd.labels.some(l => String(l).includes('Sản phẩm cũ')));

const pressOrphanFiltered = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'worker', metric: 'finishedQty', product: '__orphan__' });
check('ÉP: lọc __orphan__ chỉ còn 30 tấm', pressOrphanFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 30);
const planOrphanFiltered = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'year', metric: 'qty', product: '__orphan__' });
check('KH: lọc __orphan__ tổng kế hoạch = 200', planOrphanFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 200);
const planLiveFiltered = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'year', metric: 'qty', product: 'rate-live1' });
check('KH: lọc sản phẩm còn định mức = 500 (loại mồ côi)', planLiveFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 500);

console.log('--- CÔNG NHÂN (gộp biến thể viết) ---');

const pressWorker = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'worker', metric: 'finishedQty' });
check('ÉP: chỉ còn 2 công nhân (Nam gộp nam /NAM)', pressWorker.labels.length === 2);
check('ÉP: nhãn là biến thể phổ biến "Nam"', pressWorker.labels.includes('Nam'));
const namIdx = pressWorker.labels.indexOf('Nam');
check('ÉP: tổng của Nam = 120+80+30 = 230', pressWorker.datasets[0].data[namIdx] === 230);

const pressWorkerFilter = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'week', metric: 'finishedQty', worker: 'nam' });
check('ÉP: lọc worker "nam" (thường) vẫn khớp cả "Nam"/"NAM" = 230', pressWorkerFilter.datasets[0].data.reduce((a, b) => a + b, 0) === 230);

console.log('--- TUẦN THÂN THIỆN & SẮP XẾP SỐ HỌC ---');

const pressWeek = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'week', metric: 'finishedQty' });
check('ÉP: nhãn tuần dạng "Tuần 33 (2026)"', pressWeek.labels.includes('Tuần 33 (2026)'));
check('ÉP: KHÔNG còn dạng máy 2026-W33', !pressWeek.labels.some(l => /-W\d/.test(String(l))));

const planWeekSort = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'week', metric: 'qty', year: 'all' });
const weekLabels = planWeekSort.labels.map(String);
const i2 = weekLabels.indexOf('Tuần 2'), i10 = weekLabels.indexOf('Tuần 10');
check('KH: Tuần 2 đứng trước Tuần 10 (sắp số học)', i2 !== -1 && i10 !== -1 && i2 < i10);

console.log('--- DROPDOWN BỘ LỌC CÔNG ĐOẠN (chuẩn hóa cặp [value, label]) ---');

// Mô phỏng dữ liệu Công Đoạn thật: loại nan 'A'/'A1'/'B', độ dày số 7/10/11
state.batches = [
  { id: 'b1', code: 'L01', stage: 'bao_tinh', quantity: 100, volume: 1.5, bambooType: 'A',  useFor: 'Ván',    location: 'Kệ A', thickness: 7,  date: '2026-08-01' },
  { id: 'b2', code: 'L02', stage: 'kho',      quantity: 200, volume: 2.5, bambooType: 'A1', useFor: 'Bullig', location: 'Kệ B', thickness: 10, date: '2026-08-05' },
  { id: 'b3', code: 'L03', stage: 'say1',     quantity: 50,  volume: 0.8, bambooType: 'B',  useFor: 'Nan',    location: 'LS1',  thickness: 11, date: '2026-08-07' }
];

check('asOptPair: chuỗi đơn → cặp [o, o]', JSON.stringify(dash.asOptPair('A1')) === JSON.stringify(['A1', 'A1']));
check('asOptPair: số đơn → cặp chuỗi "10"', JSON.stringify(dash.asOptPair(10)) === JSON.stringify(['10', '10']));
check('asOptPair: cặp sẵn giữ nguyên nhãn', JSON.stringify(dash.asOptPair(['v', 'Nhãn'])) === JSON.stringify(['v', 'Nhãn']));
check('asOptPair: cặp thiếu label → dùng value', JSON.stringify(dash.asOptPair(['v'])) === JSON.stringify(['v', 'v']));

['bambooType', 'useFor', 'location', 'thickness'].forEach(id => {
  const fd = dash.BUILDER_SCHEMA.kanban.filters.find(f => f.id === id);
  const pairs = fd.options().map(dash.asOptPair);
  check(`CD: bộ lọc ${id} có tùy chọn`, pairs.length >= 3);
  check(`CD: ${id} không còn nhãn undefined/tách ký tự (label === value)`,
    pairs.every(([v, l]) => l !== undefined && l !== 'undefined' && String(l).trim() !== '' && l === v));
});
// Độ dày sắp số học: 7 < 10 < 11 (không phải thứ tự chữ '10' < '11' < '7')
const thVals = dash.BUILDER_SCHEMA.kanban.filters.find(f => f.id === 'thickness').options().map(dash.asOptPair).map(([v]) => Number(v));
check('CD: Độ dày sắp số học 7 < 10 < 11', thVals.join(',') === '7,10,11');
// Tuần kế hoạch cũng trả chuỗi đơn — phải chuẩn hóa sạch
const planWeekPairs = dash.BUILDER_SCHEMA.planning.filters.find(f => f.id === 'week').options().map(dash.asOptPair);
check('KH: bộ lọc Tuần không còn nhãn undefined', planWeekPairs.length >= 2 && planWeekPairs.every(([, l]) => l !== undefined && l !== 'undefined'));

console.log('--- KHẢ NĂNG ĐÁP ỨNG KẾ HOẠCH (bottleneck từ BOM phụ) ---');
// Dùng đúng ID đang có trong materialRates ở đầu file: rate-live1 (còn định mức)
// và rate-1756759612345 (mồ côi — không có định mức) cho nhánh "không tính được".
state.productBoms = [{ id: 'b1', productId: 'rate-live1', lines: [{ vtDim: '1200×260×18', ratio: 2 }] }];
state.pressRecords.push({ id: 'r5', date: '2026-08-11', week: '2026-W33', year: 2026, productId: 'rate-live1', productName: 'Ván 1200x382x12', finishedQty: 60, glue: 0.5, additive: 0.05, worker: 'Nam', vanTho: [{ vtDim: '1200×260×18', vtQty: 1600, ratio: 2 }] });
const mp1 = planMod.getMaxProductionForProduct(2026, 'rate-live1', 33);
check('Capacity: tính được từ tồn ván thô qua BOM phụ (1600÷2=800)', !!mp1 && mp1.source === 'bom' && mp1.maxProduction === 800);
check('Capacity: bottleneck chỉ đúng loại ván thô giới hạn', !!mp1 && mp1.bottleneck && mp1.bottleneck.vtDim === '1200×260×18' && mp1.bottleneck.available === 1600 && mp1.bottleneck.ratio === 2);
const mp2 = planMod.getMaxProductionForProduct(2026, 'rate-1756759612345', 33);
check('Capacity: sản phẩm không có định mức → không tính được (null)', mp2 === null || mp2 === undefined);
const reason = pressExports.planCapacityReason;
const rc1 = reason('rate-live1', 2026, 33);
check('Capacity: đủ tồn → cap = 800', rc1.cap === 800);
const rc2 = reason('rate-1756759612345', 2026, 33);
check('Capacity: thiếu định mức → cap null + lý giải', rc2.cap === null && /định mức/.test(rc2.reason));

console.log('--- CỬA SỔ TUẦN & % ĐÁP ỨNG (biểu đồ khả năng đáp ứng) ---');
// % đáp ứng: đủ/kẹp trần/thiếu/null
check('Cap: % đáp ứng = 100 khi đủ', pressExports.planCapacityPct(800, 800) === 100);
check('Cap: % đáp ứng = 42.5 khi thiếu (340/800)', pressExports.planCapacityPct(340, 800) === 42.5);
check('Cap: % đáp ứng kẹp trần 100 khi vượt kế hoạch', pressExports.planCapacityPct(1200, 800) === 100);
check('Cap: cap null hoặc kế hoạch 0 → 0%', pressExports.planCapacityPct(null, 800) === 0 && pressExports.planCapacityPct(500, 0) === 0);
// Danh sách tuần có kế hoạch: sắp tăng, không trùng
const capWeeks = pressExports.planCapacityWeeks(2026);
check('Cap: danh sách tuần có kế hoạch sắp tăng & không trùng', JSON.stringify(capWeeks) === JSON.stringify([...new Set(capWeeks)].sort((a, b) => a - b)) && capWeeks.length >= 1);
// Cửa sổ hiển thị: 1 (màn hẹp/stub) hoặc 2 (màn rộng ≥900px)
check('Cap: cửa sổ 1–2 tuần tùy bề rộng màn hình', [1, 2].includes(pressExports.planCapacityWinSize()));

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);

