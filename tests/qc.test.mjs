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
const { state, STORAGE_KEY_QC_EXPORTS } = await import('../js/state.js');
const qc = await import('../js/qc.js');
const press = await import('../js/press.js');
const cloud = await import('../js/cloud.js');
const perms = await import('../js/permissions.js');

const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }
function setWeeks(weeks) {
  const select = document.getElementById('qc-imp-week');
  select.value = weeks.length ? String(weeks[0]) : '';
  select.selectedOptions = weeks.map(week => ({ value: String(week) }));
}
function modalShown(id) { return document.getElementById(id).classList._s.has('show'); }
const approx = (a, b) => Math.abs(a - b) < 1e-9;

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

state.materialRates = [
  { id: 'rate-1', product: 'Ván 1200x382x9' },
  { id: 'rate-2', product: 'Ván 1200x382x12' }
];

state.planningItems = [
  { year: 2026, week: 'Tuần 33', productId: 'rate-2', qty: 100 },
  { year: 2026, week: 'Tuần 35', productId: 'rate-1', qty: 60 },
  { year: 2026, week: 'Tuần 10', productId: 'rate-1', qty: 50 }
];

// ─── A. LOAD / SAVE ───────────────────────────────────────────
qc.loadQcExports();
check('QC: load khi chưa có dữ liệu -> mảng rỗng', Array.isArray(state.qcExports) && state.qcExports.length === 0);

storeBacking.set(STORAGE_KEY_QC_EXPORTS, JSON.stringify([
  { id: 'qc-x', productId: 'rate-1', name: '', week: 'Tuần 33', qty: 10, note: '' }
]));
qc.loadQcExports();
check('QC: load từ localStorage + tự điền năm thiếu', state.qcExports.length === 1 && state.qcExports[0].year === new Date().getFullYear());

// ─── B. RENDER BẢNG + THẺ TỔNG HỢP ────────────────────────────
qc.renderQcView();
const tbodyEl = document.getElementById('qc-table-body');
check('QC: thẻ tổng hợp — chip "Tất cả" + chip tuần có dữ liệu (Tuần 33)', document.getElementById('qc-sum-weeks').innerHTML.includes('data-qc-sum-all') && document.getElementById('qc-sum-weeks').innerHTML.includes('data-qc-sum-week="33"'));
check('QC: thẻ tổng hợp — KPI số lượng mặc định (tất cả tuần) = 10', document.getElementById('qc-sum-qty').textContent === '10');
check('QC: bảng hiển thị tên hàng tra từ định mức', tbodyEl.innerHTML.includes('Ván 1200x382x9'));
const unitVolR1 = (1200 * 382 * 9) / 1e9;
check('QC: cột thể tích quy đổi = thể tích 1 TP × số lượng (10 × 0,004126 m³)', tbodyEl.innerHTML.includes('0,0413'));

state.qcExports.push({ id: 'qc-custom', productId: null, name: 'Hàng mẫu khách B', week: 'Tuần 33', year: 2026, qty: 5, note: '' });
qc.renderQcTable();
check('QC: dòng ngoài danh sách có nhãn "ngoài kế hoạch"', tbodyEl.innerHTML.includes('ngoài kế hoạch') && tbodyEl.innerHTML.includes('Hàng mẫu khách B'));
check('QC: dòng tổng hiển thị đúng (10 + 5 = 15)', document.getElementById('qc-table-total').innerHTML.includes('15'));

// ─── C. MODAL TẠO DÒNG THEO TUẦN (luồng mới: nạp cả kế hoạch tuần) ──
qc.openQcExportModal();
check('QC: mở modal thành công', modalShown('modal-qc-export'));
check('QC: select năm của modal có năm hiện tại (2026)', document.getElementById('qc-imp-year').innerHTML.includes('2026'));
check('QC: danh sách có đủ 53 tuần, cho phép chọn nhiều tuần', (document.getElementById('qc-imp-week').innerHTML.match(/<option/g) || []).length === 53);

setVal('qc-imp-year', '2026'); setWeeks([33]);
qc.qcImpLoadPlan(false); // đổi tuần -> tự nạp danh sách thành phẩm theo kế hoạch
check('QC: mặc định chọn một tuần và nạp kế hoạch tuần đó',
  document.getElementById('qc-imp-products').innerHTML.includes('Ván 1200x382x12') &&
  document.getElementById('qc-imp-products').innerHTML.includes('KH T33: 100') &&
  !document.getElementById('qc-imp-plan-text').innerHTML.includes('Tuần 35'));
setWeeks([33, 35]);
qc.qcImpLoadPlan(false);
check('QC: có thể chọn hai tuần không liền nhau và nạp kế hoạch của cả hai',
  document.getElementById('qc-imp-products').innerHTML.includes('KH T33: 100') &&
  document.getElementById('qc-imp-products').innerHTML.includes('KH T35: 60') &&
  document.getElementById('qc-imp-selected-weeks').innerHTML.includes('Tuần 33') &&
  document.getElementById('qc-imp-selected-weeks').innerHTML.includes('Tuần 35'));

qc.onQcProductChange(); // (tên tương thích) = hiện ô nhập TP ngoài kế hoạch
check('QC: thêm TP ngoài kế hoạch -> hiện ô nhập tên (không dùng required trình duyệt)', document.getElementById('qc-custom-name-group').style.display === '' && document.getElementById('qc-custom-name').required === false);
qc.hideQcCustomName();
check('QC: ẩn ô nhập tên mới', document.getElementById('qc-custom-name-group').style.display === 'none');

// ─── D. SUBMIT: thành phẩm theo kế hoạch tuần ──────────────────
const beforeSubmit = state.qcExports.length;
setVal('qc-imp-year', '2026'); setWeeks([33, 35]);
qc.qcImpLoadPlan(false);
setVal('qc-imp-note', '  gấp  ');
qc.qcImpSetQty('p-rate-2', 25);
qc.qcImpSetQty('p-rate-1', 12);
qc.handleQcExportSubmit(ev);
const added = state.qcExports.find(row => row.productId === 'rate-2' && row.weeks?.join(',') === '33,35' && row.qty === 25);
const addedSecondWeek = state.qcExports.find(row => row.productId === 'rate-1' && row.weeks?.join(',') === '33,35' && row.qty === 12);
check('QC: một lượng tổng cho hai tuần tạo một dòng cho mỗi sản phẩm', state.qcExports.length === beforeSubmit + 2);
check('QC: dòng mới giữ cặp tuần + lượng tổng duy nhất',
  added && added.name === 'Ván 1200x382x12' && added.week === 'Tuần 33' && added.year === 2026 && added.note === 'gấp' &&
  addedSecondWeek && addedSecondWeek.name === 'Ván 1200x382x9' && addedSecondWeek.qty === 12);
check('QC: đóng modal sau khi thêm', !modalShown('modal-qc-export'));

// ─── E. THÊM THÀNH PHẨM NGOÀI KẾ HOẠCH ────────────────────────
qc.openQcExportModal();
setVal('qc-imp-year', '2026'); setWeeks([35, 47]);
qc.qcImpLoadPlan(false); // tuần 35 có kế hoạch; tuần 47 không có
qc.qcImpRemoveRow('p-rate-1');
setVal('qc-custom-name', 'Đơn lẻ khách C');
setVal('qc-custom-qty', '16');
qc.qcImpAddCustom();
const impBox = document.getElementById('qc-imp-products').innerHTML;
check('QC: thêm TP ngoài kế hoạch -> hiện dòng "ngoài kế hoạch"', impBox.includes('Đơn lẻ khách C') && impBox.includes('ngoài kế hoạch'));
check('QC: dòng ngoài kế hoạch có đúng một ô số lượng tổng', (impBox.match(/data-qc-imp-qty=/g) || []).length === 1 && impBox.includes('value="16"'));
const beforeCustomSubmit = state.qcExports.length;
qc.handleQcExportSubmit(ev);
const customRows = state.qcExports.filter(row => row.name === 'Đơn lẻ khách C');
check('QC: thêm TP ngoài kế hoạch -> một dòng mang tổng lượng cho cả hai tuần',
  state.qcExports.length === beforeCustomSubmit + 1 && customRows.length === 1 &&
  customRows[0].productId === null && customRows[0].weeks.join(',') === '35,47' && customRows[0].qty === 16 && customRows[0].year === 2026);

// ─── F. VALIDATE ──────────────────────────────────────────────
let n = state.qcExports.length;
qc.openQcExportModal(); // modal reset + nạp lại, chưa điền SL nào
qc.handleQcExportSubmit(ev);
check('QC: chặn khi chưa điền số lượng nào', state.qcExports.length === n);
setWeeks([]);
qc.handleQcExportSubmit(ev);
check('QC: chặn thiếu tuần', state.qcExports.length === n);
setWeeks([35, 47, 53]);
qc.handleQcExportSubmit(ev);
check('QC: chặn chọn quá hai tuần', state.qcExports.length === n);
setWeeks([35, 47]);
setVal('qc-custom-name', '   ');
qc.qcImpAddCustom(); // tên trống -> bị chặn, KHÔNG thêm dòng vào danh sách
check('QC: chặn thành phẩm ngoài danh sách thiếu tên', !document.getElementById('qc-imp-products').innerHTML.includes('Đơn lẻ') && document.getElementById('qc-imp-products').innerHTML.includes('Chưa có sản phẩm'));
setVal('qc-custom-name', 'Thiếu số lượng');
qc.qcImpAddCustom();
check('QC: chặn sản phẩm ngoài kế hoạch chưa có số lượng', !document.getElementById('qc-imp-products').innerHTML.includes('Thiếu số lượng'));

// ─── G. SỬA TRỰC TIẾP TRÊN BẢNG ───────────────────────────────
qc.updateQcExportRow(added.id, 'qty', '55');
check('QC: sửa số lượng trực tiếp', added.qty === 55);
qc.updateQcExportRow(added.id, 'week', '34');
check('QC: sửa tuần trực tiếp -> "Tuần 34"', added.week === 'Tuần 34');
qc.updateQcExportRow(added.id, 'note', '  đã xuất  ');
check('QC: sửa ghi chú trực tiếp (cắt khoảng trắng)', added.note === 'đã xuất');
const persisted = JSON.parse(storeBacking.get(STORAGE_KEY_QC_EXPORTS));
check('QC: sửa dòng được ghi xuống localStorage', persisted.some(r => r.id === added.id && r.qty === 55));

// ─── H. THẺ TỔNG HỢP — LỌC NĂM + CHỌN 1/NHIỀU TUẦN ────────────
// Dữ liệu gắn tuần 33/35, Tuần 34 và 35/47; lọc nhiều tuần không nhân đôi bản ghi.
state.qcSumYear = '2026'; state.qcSumWeeks = [33];
qc.renderQcSummary();
check('QC: thẻ tổng hợp — chọn Tuần 33 khớp cả bản ghi gắn nhiều tuần', document.getElementById('qc-sum-qty').textContent === '27');
check('QC: thể tích theo lượng tổng, tính một lần', document.getElementById('qc-sum-vol').textContent.includes('0,091'));
state.qcSumWeeks = [33, 34];
qc.renderQcSummary();
check('QC: thẻ tổng hợp — chọn Tuần 33+34 → SL = 82', document.getElementById('qc-sum-qty').textContent === '82');
state.qcSumWeeks = [];
qc.renderQcSummary();
check('QC: thẻ tổng hợp — không chọn tuần nào → tất cả = 98', document.getElementById('qc-sum-qty').textContent === '98');
state.qcSumYear = '2025'; state.qcSumWeeks = [];
qc.renderQcSummary();
check('QC: năm không có trong danh sách → tự về "Tất cả các năm" (KPI = 98)', state.qcSumYear === 'all' && document.getElementById('qc-sum-qty').textContent === '98');
state.qcSumYear = '2026'; state.qcSumWeeks = [];
qc.renderQcSummary();

// ─── I. XÓA DÒNG ──────────────────────────────────────────────
n = state.qcExports.length;
qc.deleteQcExport(added.id);
check('QC: xóa dòng khỏi danh sách', state.qcExports.length === n - 1 && !state.qcExports.some(r => r.id === added.id));

// ─── J. PHÂN QUYỀN ────────────────────────────────────────────
state.currentUser = { username: 'view', role: 'viewer', editTabs: [], allowAdvanced: false };
check('QC: viewer không có quyền sửa tab QC', perms.canEditTab('qc') === false);
qc.renderQcTable();
check('QC: input bảng bị khóa với người không đủ quyền', document.getElementById('qc-table-body').innerHTML.includes('disabled'));
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// ─── K. BIỂU ĐỒ KẾ HOẠCH vs ĐÃ ÉP + CỘT SỐ LƯỢNG XUẤT ─────────
state.pressRecords = [
  { date: '2026-08-10', week: '2026-W33', productId: 'rate-1', fpDim: '1220x2440x9',  finishedQty: 40, vanTho: [], sticks: [] },
  { date: '2026-08-11', week: '2026-W33', productId: 'rate-2', fpDim: '1220x2440x12', finishedQty: 25, vanTho: [], sticks: [] }
];
state.qcExports = [
  { id: 'q1', productId: 'rate-1', name: 'Ván 1200x382x9',  week: 'Tuần 33', year: 2026, qty: 30, note: '' },
  { id: 'q2', productId: null,     name: 'Ván 1200x382x12', week: 'Tuần 33', year: 2026, qty: 12, note: 'khớp theo tên' },
  { id: 'q3', productId: 'rate-1', name: 'Ván 1200x382x9',  week: 'Tuần 33', year: 2025, qty: 999, note: 'năm khác -> loại' },
  { id: 'q4', productId: null,     name: 'Hàng lạ không khớp mã', week: 'Tuần 33', year: 2026, qty: 50, note: 'bỏ qua' }
];
state.planVsPressYear = '2026';
state.planVsPressWeek = 33;
press.renderPlanVsPressChart();
const chart = state.planVsPressInstance;
const unitVol1 = (1200 * 382 * 9) / 1e9;
const unitVol2 = (1200 * 382 * 12) / 1e9;
check('Biểu đồ: có 3 bộ dữ liệu (Kế Hoạch / Đã Ép / Số Lượng Xuất)', chart.data.datasets.length === 3);
check('Biểu đồ: bộ thứ 3 là "Số Lượng Xuất"', chart.data.datasets[2].label === 'Số Lượng Xuất');
check('Biểu đồ: mã hàng sắp theo tổng (rate-2 trước rate-1)', chart.data.labels[0] === 'Ván 1200x382x12' && chart.data.labels[1] === 'Ván 1200x382x9');
check('Biểu đồ: SL xuất theo mã (12 tấm rate-2 trước, 30 tấm rate-1 sau)',
  approx(chart.data.datasets[2].data[0], 12 * unitVol2) && approx(chart.data.datasets[2].data[1], 30 * unitVol1));
check('Biểu đồ: dòng năm khác / không khớp mã bị loại (999 & 50 không xuất hiện)',
  !chart.data.datasets[2].data.some(v => v > 30 * unitVol1 + 1e-9));
check('Biểu đồ: cột Kế Hoạch giữ nguyên (rate-2 = 100 tấm)', approx(chart.data.datasets[0].data[0], 100 * unitVol2));
check('Biểu đồ: cột Đã Ép theo thể tích fpDim (40 tấm rate-1)', approx(chart.data.datasets[1].data[1], (1220 * 2440 * 9 / 1e9) * 40));
state.qcExports.push({ id: 'q5', productId: 'rate-2', name: 'Ván 1200x382x12', week: 'Tuần 33', weeks: [33, 35], year: 2026, qty: 20, note: '' });
press.renderPlanVsPressChart();
check('Biểu đồ: tổng gắn tuần 33 và 35 không bị gán toàn bộ vào riêng tuần 33',
  approx(state.planVsPressInstance.data.datasets[2].data[0], 12 * unitVol2));
state.planVsPressWeek = 35;
press.renderPlanVsPressChart();
check('Biểu đồ: tổng gắn tuần 33 và 35 không bị gán toàn bộ vào riêng tuần 35',
  approx(state.planVsPressInstance.data.datasets[2].data[0], 0));
state.qcExports.push({ id: 'q6', productId: 'rate-2', name: 'Ván 1200x382x12', week: 'Tuần 33', weeks: [33, 34], year: 2026, qty: 7, note: '' });
state.planVsPressSpan = 2;
state.planVsPressWeek = 33;
press.renderPlanVsPressChart();
check('Biểu đồ: tổng gắn cả tuần 33-34 hiện một lần trong bộ lọc cặp tuần 33-34',
  approx(state.planVsPressInstance.data.datasets[2].data[0], 19 * unitVol2));
state.planVsPressWeek = 'all';
press.renderPlanVsPressChart();
const rate2ChartIndex = state.planVsPressInstance.data.labels.indexOf('Ván 1200x382x12');
check('Biểu đồ: lọc tất cả tuần vẫn cộng đủ các tổng nhiều tuần, mỗi bản ghi một lần',
  rate2ChartIndex >= 0 && approx(state.planVsPressInstance.data.datasets[2].data[rate2ChartIndex], 39 * unitVol2));
state.planVsPressSpan = 1;
state.planVsPressWeek = 33;

// ─── K2. NGUỒN ĐÃ ÉP CHO SẢN PHẨM ĐVT = THANH (QC KIỂM THANH) ───
console.log('--- K2. NGUỒN ĐÃ ÉP: QC KIỂM THANH (ĐVT = THANH) ---');
state.materialRates = [
  { id: 'rate-1',     product: 'Ván 1200x382x9',  nanUse: 'Ván',    unit: 'Tấm' },
  { id: 'rate-2',     product: 'Ván 1200x382x12', nanUse: 'Ván',    unit: 'Tấm' },
  { id: 'rate-thanh', product: '640x14x12',        nanUse: 'Ván',    unit: 'Thanh' },
  { id: 'rate-bl',    product: '270x10x7',         nanUse: 'Bullig', unit: 'Thanh' }
];
state.planningItems = [
  { year: 2026, week: 'Tuần 33', productId: 'rate-2', qty: 100 },
  { year: 2026, week: 'Tuần 33', productId: 'rate-1', qty: 50 },
  { year: 2026, week: 'Tuần 33', productId: 'rate-thanh', qty: 1000 }
];
state.pressRecords = [
  { date: '2026-08-10', week: '2026-W33', productId: 'rate-1', fpDim: '1220x2440x9',  finishedQty: 40, vanTho: [], sticks: [] },
  { date: '2026-08-11', week: '2026-W33', productId: 'rate-2', fpDim: '1220x2440x12', finishedQty: 25, vanTho: [], sticks: [] }
];
state.qcExports = [];
state.qcFinalRecords = [
  { id: 'qcf-t1', date: '2026-08-11', workshop: 'x2', kind: 'thanh', sizeKey: '640×14×12', inputQty: 500, qtyOk: 470, qtyExcept: 10, qtyReject: 20 },
  { id: 'qcf-t2', date: '2026-08-11', workshop: 'x2', kind: 'thanh', sizeKey: '270×10×7', inputQty: 300, qtyOk: 300, qtyExcept: 0, qtyReject: 0 },
  { id: 'qcf-t3', date: '2026-08-11', workshop: 'x2', kind: 'van', sizeKey: '', productId: 'rate-1', productName: 'Ván 1200x382x9', inputQty: 100, qtyOk: 90, qtyExcept: 0, qtyReject: 10 }
];
state.pvChartMode = 'plan';
state.planVsPressTotal = false;
state.planVsPressYear = '2026';
state.planVsPressWeek = 33;

check('QC KIỂM THANH: khớp định mức ĐVT = Thanh theo kích thước',
  press.qcThanhPlanProductId('640×14×12') === 'rate-thanh');
check('QC KIỂM THANH: KHÔNG lấy định mức Bullig (nhóm Bullig có nguồn riêng)',
  press.qcThanhPlanProductId('270×10×7') === '');
check('QC KIỂM THANH: cỡ không có định mức thì bỏ qua',
  press.qcThanhPlanProductId('999×99×99') === '');
const qcThanhRows = press.getQcThanhOutputRows();
check('QC KIỂM THANH: gom đúng 1 lượt (bỏ lượt Bullig + lượt Kiểm Ván)',
  qcThanhRows.length === 1 && qcThanhRows[0].productId === 'rate-thanh' &&
  qcThanhRows[0].qty === 470 && qcThanhRows[0].date === '2026-08-11');
press.renderPlanVsPressChart();
const chartQc = state.planVsPressInstance;
const idxThanh = chartQc.data.labels.indexOf('Thanh 640x14x12');
check('BIỂU ĐỒ: cột ĐÃ ÉP của sản phẩm ĐVT Thanh = m³ của 470 thanh QC đạt',
  idxThanh >= 0 && approx(chartQc.data.datasets[1].data[idxThanh], (640 * 14 * 12 / 1e9) * 470));
check('BIỂU ĐỒ: cột ĐÃ ÉP Ép Ván giữ nguyên (rate-1 = 40 tấm)',
  approx(chartQc.data.datasets[1].data[chartQc.data.labels.indexOf('Ván 1200x382x9')], (1220 * 2440 * 9 / 1e9) * 40));
check('BIỂU ĐỒ: nhóm Bullig KHÔNG bị cộng từ QC Kiểm thanh',
  !chartQc.data.labels.some(l => String(l).includes('270x10x7')));
state.qcFinalRecords = [];

// ─── L. ĐỒNG BỘ MÂY ───────────────────────────────────────────
const snap = cloud.collectCloudSnapshot();
check('Mây: snapshot chứa qcExports', Array.isArray(snap.qcExports) && snap.qcExports.length === state.qcExports.length);
check('Mây: cloudCore bao gồm qcExports', cloud.cloudCore(snap).includes('"qcExports"'));
cloud.applyFireSnapshot({ qcExports: [{ id: 'qc-remote', productId: 'rate-2', name: '', week: 'Tuần 40', year: 2026, qty: 9, note: '' }] });
check('Mây: applyFireSnapshot nhận qcExports từ mây', state.qcExports.length === 1 && state.qcExports[0].id === 'qc-remote');

// ─── M. THẺ NÔI (LAUNCHER) + BỘ LỌC TRONG THẺ XUẤT HÀNG ────────
// Mô phỏng trạng thái mặc định trong index.html: mọi bảng chi tiết ẩn.
['qc-export-card', 'qc-incoming-card', 'qc-final-card'].forEach(id => document.getElementById(id).classList.add('qc-card-hidden'));
state.qcExports = [
  { id: 'm1', productId: 'rate-1', name: 'Ván 1200x382x9',  week: 'Tuần 33', year: 2026, qty: 10, note: '' },
  { id: 'm2', productId: 'rate-2', name: 'Ván 1200x382x12', week: 'Tuần 33', year: 2026, qty: 5,  note: '' },
  { id: 'm3', productId: 'rate-1', name: 'Ván 1200x382x9',  week: 'Tuần 34', year: 2026, qty: 7,  note: '' },
  { id: 'm4', productId: null,     name: 'Đơn lẻ khách D',  week: 'Tuần 10', year: 2025, qty: 3,  note: '' }
];
state.qcSumYear = 'all'; state.qcSumWeeks = []; state.qcSearchQ = '';
qc.renderQcView();
const fsMod = await import('node:fs');
const qcHTML = fsMod.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('THẺ QC: index.html có launcher 3 thẻ (Xuất Hàng / Kiểm Đầu Vào / Kiểm Sau Sản Xuất)',
  qcHTML.includes('data-qc-card="qc-export-card"') && qcHTML.includes('data-qc-card="qc-incoming-card"') && qcHTML.includes('data-qc-card="qc-final-card"'));
check('MODAL QC: hỗ trợ chọn nhiều tuần và hiển thị chip xác nhận',
  qcHTML.includes('id="qc-imp-week"') && qcHTML.includes('multiple size="4"') && qcHTML.includes('id="qc-imp-selected-weeks"') &&
  qcHTML.includes('giữ Ctrl'));
check('MODAL QC: sản phẩm ngoài kế hoạch có một ô số lượng tổng',
  qcHTML.includes('id="qc-custom-qty"') && !qcHTML.includes('qc-custom-qty-1'));
check('THẺ QC: đếm thẻ Xuất Hàng = "4 dòng · 25 tấm"', document.getElementById('qc-mini-count-export').textContent === '4 dòng · 25 tấm');
check('THẺ QC: đếm thẻ Kiểm Đầu Vào = "Sắp có" (bổ sung sau)', document.getElementById('qc-mini-count-incoming').textContent === 'Sắp có');
check('BẢNG: không lọc → hiện đủ 4 dòng', (document.getElementById('qc-table-body').innerHTML.match(/<tr>/g) || []).length === 4);
check('BẢNG: cột Tuần chỉ đọc (badge — tuần đã nhập đầu vào không cần sửa)', !document.getElementById('qc-table-body').innerHTML.includes('qc-row-week') && document.getElementById('qc-table-body').innerHTML.includes('qc-week-badge'));
check('THẺ QC: qcOpenCard(xuất hàng) mở pop-up (overlay show)', qc.qcOpenCard('qc-export-card') === true && document.getElementById('qc-detail-overlay').classList._s.has('show'));
check('THẺ QC: bảng xuất bỏ ẩn khi mở pop-up', !document.getElementById('qc-export-card').classList.contains('qc-card-hidden'));
check('THẺ QC: bấm lại cùng thẻ → đóng pop-up + thẻ ẩn lại', qc.qcOpenCard('qc-export-card') === false
  && document.getElementById('qc-export-card').classList.contains('qc-card-hidden')
  && !document.getElementById('qc-detail-overlay').classList._s.has('show'));
// Tìm kiếm → bảng CHỈ hiện dòng khớp
state.qcSearchQ = '1200x382x9';
qc.renderQcTable(); qc.renderQcSearch();
check('LỌC: tìm "1200x382x9" → bảng chỉ còn 2 dòng khớp (m1, m3)', (document.getElementById('qc-table-body').innerHTML.match(/<tr>/g) || []).length === 2 && !document.getElementById('qc-table-body').innerHTML.includes('Đơn lẻ khách D'));
check('LỌC: dòng tổng tính trên kết quả lọc (10 + 7 = 17)', document.getElementById('qc-table-total').innerHTML.includes('17'));
check('LỌC: dải kết quả lọc tổng hợp (2/4 dòng)', document.getElementById('qc-filter-info').style.display === '' && document.getElementById('qc-filter-info').innerHTML.includes('2/4'));
// Bộ lọc năm + chips tuần
state.qcSearchQ = ''; state.qcSumYear = '2026'; state.qcSumWeeks = [33];
qc.renderQcTable(); qc.renderQcSummary(); qc.renderQcSearch();
check('LỌC: năm 2026 + Tuần 33 → bảng chỉ còn 2 dòng tuần 33', (document.getElementById('qc-table-body').innerHTML.match(/<tr>/g) || []).length === 2 && !document.getElementById('qc-table-body').innerHTML.includes('Đơn lẻ khách D'));
check('LỌC: KPI số lượng theo bộ lọc = 15', document.getElementById('qc-sum-qty').textContent === '15');
// Xóa lọc → hiện lại tất cả
state.qcSumYear = 'all'; state.qcSumWeeks = []; state.qcSearchQ = '';
qc.renderQcTable(); qc.renderQcSummary(); qc.renderQcSearch();
check('LỌC: xóa lọc → hiện lại đủ 4 dòng + dải kết quả ẩn', (document.getElementById('qc-table-body').innerHTML.match(/<tr>/g) || []).length === 4 && document.getElementById('qc-filter-info').style.display === 'none');
// Không dòng nào khớp → báo rỗng + gợi ý Xóa Lọc
state.qcSearchQ = 'khong-ton-tai';
qc.renderQcTable();
check('LỌC: không khớp → bảng báo rỗng + gợi ý "Xóa Lọc"', document.getElementById('qc-table-body').innerHTML.includes('Không có dòng nào khớp'));
state.qcSearchQ = '';
qc.renderQcTable(); qc.renderQcSearch();

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
