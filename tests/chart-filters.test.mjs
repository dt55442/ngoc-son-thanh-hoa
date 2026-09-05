// tests/chart-filters.test.mjs — Kiểm thử bộ lọc & nhãn thân thiện của engine biểu đồ
// Bao phủ: sản phẩm mồ côi (định mức đã xóa), gộp biến thể tên công nhân,
// tuần dạng thân thiện, sắp xếp số học tự nhiên.
'use strict';

// ─── Stubs môi trường (giống roles-charts.test.mjs) ──────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    _h: {},
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

console.log('--- PHÂN NHÓM PHỤ "DÀI × RỘNG" (dimRatio) CỦA NGUỒN CÔNG ĐOẠN ---');

// Option đã mở khóa trong dropdown "Phân Nhóm Phụ / Xếp Tầng" của nguồn Công Đoạn
const dimRatioPair = dash.BUILDER_SCHEMA.kanban.stackBy.find(([v]) => v === 'dimRatio');
check('CD: stackBy có option dimRatio', !!dimRatioPair);
check('CD: nhãn dimRatio thân thiện (không undefined/rỗng)', !!dimRatioPair && String(dimRatioPair[1]).trim() !== '' && dimRatioPair[1] !== 'undefined');
// Phụ đề thẻ biểu đồ ("Xếp tầng: ...") tra nhãn từ schema.groupBy → phải có dimRatio
check('CD: groupBy có dimRatio (tra nhãn phụ đề "Xếp tầng")', dash.BUILDER_SCHEMA.kanban.groupBy.some(([v]) => v === 'dimRatio'));

// Tổng hợp xếp tầng theo Dài × Rộng — trùng quy cách dù KHÁC độ dày vẫn gộp chung
state.batches = [
  { id: 'd1', code: 'D01', stage: 'say1', quantity: 100, volume: 1.0, length: 1250, width: 18, thickness: 7, date: '2026-08-01' },
  { id: 'd2', code: 'D02', stage: 'say1', quantity: 200, volume: 2.0, length: 1250, width: 18, thickness: 8, date: '2026-08-02' },
  { id: 'd3', code: 'D03', stage: 'kho',  quantity: 300, volume: 3.0, length: 1250, width: 22, thickness: 7, date: '2026-08-03' },
  { id: 'd4', code: 'D04', stage: 'bao_tinh', quantity: 50, volume: 0.5, length: 950, width: 15, thickness: 6, date: '2026-08-04' }
];
const dimStack = xlsx.computeChartData({ type: 'stackedBar', source: 'kanban', groupBy: 'stage', stackBy: 'dimRatio', metric: 'quantity' }, state.batches);
check('CD: xếp tầng Dài×Rộng có 3 dataset', dimStack.datasets.length === 3);
check('CD: nhãn dataset đúng format "1250×18 mm"', dimStack.datasets.map(d => d.label).join('|') === '950×15 mm|1250×18 mm|1250×22 mm');
check('CD: gộp đúng 1250×18 = 100+200 = 300 (bỏ qua độ dày)', dimStack.datasets.find(d => d.label === '1250×18 mm').data.reduce((a, b) => a + b, 0) === 300);
check('CD: 1250×22 = 300', dimStack.datasets.find(d => d.label === '1250×22 mm').data.reduce((a, b) => a + b, 0) === 300);
check('CD: 950×15 = 50', dimStack.datasets.find(d => d.label === '950×15 mm').data.reduce((a, b) => a + b, 0) === 50);
// Sắp số học tự nhiên: 950×15 đứng TRƯỚC 1250×18 (chữ '1250' < '950' là SAI)
check('CD: sắp số học 950×15 đứng trước 1250×18', dimStack.datasets[0].label === '950×15 mm');
// Nhóm trục X theo Dài × Rộng cũng hoạt động
const dimGroup = xlsx.computeChartData({ type: 'bar', source: 'kanban', groupBy: 'dimRatio', metric: 'quantity' }, state.batches);
check('CD: nhóm chính Dài×Rộng → 3 nhãn, tổng 650', dimGroup.labels.length === 3 && dimGroup.datasets[0].data.reduce((a, b) => a + b, 0) === 650);

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

console.log('--- BỘ LỌC ĐA CHỌN (chọn 1 hoặc nhiều giá trị) ---');

// Engine: giá trị "Tất Cả" / đơn / mảng
check('Engine: isAllFilterVal nhận all/rỗng/mảng rỗng',
  xlsx.isAllFilterVal('all') && xlsx.isAllFilterVal(undefined) && xlsx.isAllFilterVal('') &&
  xlsx.isAllFilterVal([]) && !xlsx.isAllFilterVal(['kho']));
check('Engine: matchFilterVal mảng khớp 1 trong danh sách',
  xlsx.matchFilterVal(['say1', 'kho'], 'kho') && !xlsx.matchFilterVal(['say1', 'kho'], 'bao_tinh'));
check('Engine: matchFilterVal chuỗi đơn giữ tương thích bản cũ',
  xlsx.matchFilterVal('kho', 'kho') && !xlsx.matchFilterVal('kho', 'say1'));

// savedMsSelections: chuẩn hóa giá trị đã lưu của dropdown đa chọn
check('MS saved: chuỗi đơn (bản cũ) → 1 lựa chọn', JSON.stringify(dash.savedMsSelections('kho')) === JSON.stringify(['kho']));
check('MS saved: "all"/undefined/rỗng → [] (Tất Cả)',
  dash.savedMsSelections('all').length === 0 && dash.savedMsSelections(undefined).length === 0 && dash.savedMsSelections('').length === 0);
check('MS saved: mảng lọc bỏ phần tử rỗng/MS_ALL',
  JSON.stringify(dash.savedMsSelections(['kho', '', dash.MS_ALL])) === JSON.stringify(['kho']));

// Dữ liệu Công Đoạn cho test đa chọn
state.batches = [
  { id: 'm1', code: 'M01', stage: 'say1',     quantity: 100, volume: 1.0, bambooType: 'A',  useFor: 'Ván',    location: 'Kệ A', thickness: 7,  date: '2026-08-01' },
  { id: 'm2', code: 'M02', stage: 'kho',      quantity: 200, volume: 2.0, bambooType: 'A1', useFor: 'Bullig', location: 'Kệ B', thickness: 10, date: '2026-08-02' },
  { id: 'm3', code: 'M03', stage: 'bao_tinh', quantity: 50,  volume: 0.5, bambooType: 'B',  useFor: 'Nan',    location: 'LS1',  thickness: 11, date: '2026-08-03' }
];
const sum = d => d.datasets[0].data.reduce((a, b) => a + b, 0);
const msNoFilter = xlsx.computeChartData({ type: 'bar', source: 'kanban', groupBy: 'stage', metric: 'volume' }, state.batches);
check('MS CD: không lọc → 3 nhóm, tổng 3.5', msNoFilter.labels.length === 3 && Math.abs(sum(msNoFilter) - 3.5) < 1e-9);
const msMulti = xlsx.computeChartData({ type: 'bar', source: 'kanban', groupBy: 'stage', metric: 'volume', stage: ['say1', 'kho'] }, state.batches);
check('MS CD: mảng [say1,kho] → 2 nhóm, tổng 3.0', msMulti.labels.length === 2 && Math.abs(sum(msMulti) - 3.0) < 1e-9);
const msEmptyArr = xlsx.computeChartData({ type: 'bar', source: 'kanban', groupBy: 'stage', metric: 'volume', stage: [] }, state.batches);
check('MS CD: mảng rỗng coi như Tất Cả (tổng 3.5)', msEmptyArr.labels.length === 3 && Math.abs(sum(msEmptyArr) - 3.5) < 1e-9);
const msSingle = xlsx.computeChartData({ type: 'bar', source: 'kanban', groupBy: 'stage', metric: 'volume', stage: 'bao_tinh' }, state.batches);
check('MS CD: chuỗi đơn (bản cũ) vẫn lọc đúng 0.5', Math.abs(sum(msSingle) - 0.5) < 1e-9);
const msMultiType = xlsx.computeChartData({ type: 'bar', source: 'kanban', groupBy: 'stage', metric: 'quantity', bambooType: ['A', 'B'] }, state.batches);
check('MS CD: đa chọn Loại Nan [A,B] → 150 (bỏ A1)', Math.abs(sum(msMultiType) - 150) < 1e-9);
const msThick = xlsx.computeChartData({ type: 'bar', source: 'kanban', groupBy: 'stage', metric: 'quantity', thickness: ['7', '10'] }, state.batches);
check('MS CD: đa chọn Độ Dày ["7","10"] khớp số → 300', Math.abs(sum(msThick) - 300) < 1e-9);

// Kế hoạch: đa chọn tuần & sản phẩm (gồm cả mồ côi)
const msPlanWeek = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'product', metric: 'qty', week: ['Tuần 33', 'Tuần 10'] });
check('MS KH: đa chọn tuần 33 + 10 → 500 + 120 = 620', Math.abs(sum(msPlanWeek) - 620) < 1e-9);
const msPlanProd = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'year', metric: 'qty', product: ['rate-live2', '__orphan__'] });
check('MS KH: sản phẩm [live2 + mồ côi] → 300+120+80 = 500', Math.abs(sum(msPlanProd) - 500) < 1e-9);
const msPlanProdMix = xlsx.computeChartData({ type: 'bar', source: 'planning', groupBy: 'year', metric: 'qty', product: ['__orphan__', 'rate-live1'] });
check('MS KH: [mồ côi + live1] → 500+120+80 = 700', Math.abs(sum(msPlanProdMix) - 700) < 1e-9);

// Ép ván: đa chọn công nhân (gộp biến thể viết 'Nam'/'nam '/'NAM'; r5 đã thêm ở mục Capacity)
const msPressHung = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'week', metric: 'finishedQty', worker: ['hùng'] });
check('MS ÉP: ["hùng"] → 50', Math.abs(sum(msPressHung) - 50) < 1e-9);
const msPressNam = xlsx.computeChartData({ type: 'bar', source: 'press', groupBy: 'week', metric: 'finishedQty', worker: ['nam'] });
check('MS ÉP: ["nam"] gộp cả "Nam"/"nam "/"NAM" → 290', Math.abs(sum(msPressNam) - 290) < 1e-9);

// Nguyên liệu: đa chọn loại & nhà cung cấp
state.materialRecords = [
  { id: 'n1', date: '2026-08-11', week: '2026-W33', location: 'x', type: 'Tre nguyên liệu', supplier: 'NCC A', weight: 300, amount: 1000 },
  { id: 'n2', date: '2026-08-12', week: '2026-W33', location: 'y', type: 'Tre nguyên liệu', supplier: 'NCC B', weight: 380, amount: 2000 },
  { id: 'n3', date: '2026-08-13', week: '2026-W34', location: 'y', type: 'Tre tinh chế',   supplier: 'NCC A', weight: 100, amount: 500 }
];
const msMatType = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'supplier', metric: 'weight', matType: ['Tre nguyên liệu', 'Tre tinh chế'] });
check('MS NL: đa chọn loại NL [nguyên liệu + tinh chế] → 780', Math.abs(sum(msMatType) - 780) < 1e-9);
const msMatSup = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'type', metric: 'weight', supplier: ['NCC A'] });
check('MS NL: đa chọn nhà cung cấp [NCC A] → 400', Math.abs(sum(msMatSup) - 400) < 1e-9);

// UI Chart Builder: renderBuilderFilters sinh dropdown đa chọn & khôi phục giá trị đã lưu
dash.renderBuilderFilters('kanban', { stage: ['say1', 'kho'], thickness: '10' });
const boxHtml = document.getElementById('builder-filters-box').innerHTML;
check('MS UI: box có panel checkbox & mục "Tất Cả"', boxHtml.includes('chart-ms-panel') && boxHtml.includes('Tất Cả'));
check('MS UI: khôi phục mảng đã lưu (say1 & kho được tick)',
  (boxHtml.match(/value="say1" checked/g) || []).length === 1 && (boxHtml.match(/value="kho" checked/g) || []).length === 1);
check('MS UI: khôi phục chuỗi đơn đã lưu (độ dày 10 được tick)', /value="10" checked/.test(boxHtml));
check('MS UI: tóm tắt đa chọn "Đã chọn 2 mục"', boxHtml.includes('Đã chọn 2 mục'));
check('MS UI: tóm tắt đơn giá trị → nhãn "10"', boxHtml.includes('id="builder-thickness-summary">10<'));

// UI Chart Builder: collectBuilderFilterVals gom 'all' / mảng theo checkbox
const stageBoxes = [
  { type: 'checkbox', value: dash.MS_ALL, checked: true },
  { type: 'checkbox', value: 'say1', checked: false },
  { type: 'checkbox', value: 'kho',  checked: false }
];
document.getElementById('builder-stage-panel').querySelectorAll = () => stageBoxes;
document.getElementById('builder-dateFrom').value = '2026-08-01';
let got = dash.collectBuilderFilterVals('kanban');
check('MS UI: chỉ "Tất Cả" → "all" (không lọc)', got.stage === 'all');
check('MS UI: bộ lọc ngày trả chuỗi yyyy-mm-dd', got.dateFrom === '2026-08-01');
stageBoxes[0].checked = false; stageBoxes[1].checked = true; stageBoxes[2].checked = true;
got = dash.collectBuilderFilterVals('kanban');
check('MS UI: 2 mục được tick → mảng ["say1","kho"]', JSON.stringify(got.stage) === JSON.stringify(['say1', 'kho']));
stageBoxes[1].checked = false; stageBoxes[2].checked = false;
got = dash.collectBuilderFilterVals('kanban');
check('MS UI: không tick mục nào → "all" (không lọc)', got.stage === 'all');

// UI Chart Builder: syncChartMsChecks — ràng buộc "Tất Cả" ↔ các mục
const syncBoxes = [
  { type: 'checkbox', value: dash.MS_ALL, checked: true },
  { type: 'checkbox', value: 'say1', checked: false },
  { type: 'checkbox', value: 'kho',  checked: false }
];
const syncPanel = { querySelectorAll: () => syncBoxes };
document.getElementById('builder-stage-summary').textContent = '';
syncBoxes[1].checked = true; // người dùng tick "say1"
dash.syncChartMsChecks('stage', syncPanel, syncBoxes[1]); // tick 1 mục
check('MS sync: tick 1 mục → bỏ "Tất Cả"', syncBoxes[0].checked === false && syncBoxes[1].checked === true);
check('MS sync: tóm tắt hiện giá trị mục được tick', document.getElementById('builder-stage-summary').textContent === 'say1');
syncBoxes[2].checked = true;
dash.syncChartMsChecks('stage', syncPanel, syncBoxes[2]); // tick mục còn lại → đủ tất cả
check('MS sync: tick đủ mọi mục → thu gọn về "Tất Cả"', syncBoxes[0].checked === true && !syncBoxes[1].checked && !syncBoxes[2].checked);
syncBoxes[0].checked = false;
dash.syncChartMsChecks('stage', syncPanel, syncBoxes[0]); // bỏ "Tất Cả" khi không còn mục nào được tick
check('MS sync: bỏ "Tất Cả" khi trống → tự tick lại', syncBoxes[0].checked === true);

// Phụ đề thẻ biểu đồ: liệt kê nhiều giá trị, bỏ qua mảng rỗng
const subCard = dash.renderChartCard({ id: 'sub-ms', title: 'T', type: 'bar', source: 'kanban', zone: 'basic', groupBy: 'stage', metric: 'volume', stage: ['say1', 'kho'], thickness: [] }, false);
check('MS thẻ: phụ đề liệt kê "Công Đoạn: Sấy 1, Kho"', subCard.includes('Công Đoạn: Sấy 1, Kho'));
check('MS thẻ: mảng rỗng không hiện trong phụ đề', !subCard.includes('Độ Dày:'));

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);

