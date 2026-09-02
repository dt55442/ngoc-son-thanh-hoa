// tests/materials.test.mjs — Kiểm thử tab NHẬP NGUYÊN LIỆU (materials)
// Bao phủ: tuần ISO, nhãn vị trí, nén ảnh, lưu form (trọng lượng = đầu vào − đầu ra),
// chặn dữ liệu không hợp lệ, sửa/xóa, lưu/nạp localStorage, engine biểu đồ nguồn 'materials'.
'use strict';

// ─── Stubs môi trường (giống chart-filters.test.mjs) ──────────────
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
    // Canvas 2D stub: dùng cho compressImageFile (nén ảnh) — đủ cả cho Chart.js nếu cần
    getContext: () => ({
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop(){} }),
      createRadialGradient: () => ({ addColorStop(){} }),
      drawImage(){}
    }),
    // API canvas element thật: canvas.toDataURL(...) gọi trên chính element
    toDataURL: () => 'data:image/jpeg;base64,CANVASOK',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus(){}, click(){}, animate(){ return { cancel(){} }; }
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
// FileReader stub: gọi onload ngay với kết quả giả
global.FileReader = class {
  readAsDataURL() { this.result = 'data:image/jpeg;base64,FAKE'; setTimeout(() => this.onload && this.onload({ target: this }), 0); }
  readAsText() { this.result = '[]'; setTimeout(() => this.onload && this.onload({ target: this }), 0); }
};
// Image stub: kích hoạt onload ngay khi gán src, kích thước giả 1200x900
global.Image = class {
  constructor() { this.width = 1200; this.height = 900; }
  set src(_) { setTimeout(() => this.onload && this.onload(), 0); }
};

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

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const { state, STORAGE_KEY_MATERIALS } = await import('../js/state.js');
const mat = await import('../js/materials.js');
const xlsx = await import('../js/export-xlsx.js');
const dash = await import('../js/dashboard.js');

// Đăng nhập giả với quyền admin để qua các bước yêu cầu quyền sửa
state.currentUser = { username: 'admin', role: 'admin', editTabs: ['kanban', 'planning', 'press', 'materials', 'dashboard'], allowAdvanced: true };

console.log('--- TUẦN ISO & NHÃN VỊ TRÍ ---');
check('Tuần ISO: 2026-08-10 (T2) → 2026-W33', mat.materialWeekLabel('2026-08-10') === '2026-W33');
check('Tuần ISO: 2026-01-01 (T5) → 2026-W01', mat.materialWeekLabel('2026-01-01') === '2026-W01');
check('Tuần ISO: 2024-12-30 (T2) → 2025-W01 (vắt năm)', mat.materialWeekLabel('2024-12-30') === '2025-W01');
check('Nhãn tuần thân thiện: 2026-W33 → "Tuần 33 (2026)"', mat.friendlyMaterialWeek('2026-W33') === 'Tuần 33 (2026)');
check('Nhãn vị trí: lo-hoi → Lò hơi', mat.materialLocationLabel('lo-hoi') === 'Lò hơi');
check('Nhãn vị trí: xuong-2 → Xưởng 2', mat.materialLocationLabel('xuong-2') === 'Xưởng 2');
check('Nhãn vị trí lạ → giữ nguyên giá trị', mat.materialLocationLabel('kho-3') === 'kho-3');
check('Đủ 3 vị trí nhập: Lò hơi, Xưởng 1, Xưởng 2',
  mat.MATERIAL_LOCATIONS.length === 3 &&
  mat.MATERIAL_LOCATIONS.map(l => l.label).join('|') === 'Lò hơi|Xưởng 1|Xưởng 2');

console.log('--- NÉN ẢNH ---');
const dataUrl = await mat.compressImageFile({ type: 'image/png' });
check('Nén ảnh: trả về dataURL JPEG từ canvas', dataUrl === 'data:image/jpeg;base64,CANVASOK');

// ─── NHẬP FORM (trọng lượng = đầu vào − đầu ra) ──────────────────
function setFormFields(v) {
  document.getElementById('material-date').value     = v.date;
  document.getElementById('material-type').value     = v.type;
  document.getElementById('material-supplier').value = v.supplier;
  document.getElementById('material-location').value = v.location;
  document.getElementById('material-input').value    = v.input;
  document.getElementById('material-output').value   = v.output;
  document.getElementById('material-unit-price').value = (v.unitPrice === undefined || v.unitPrice === null) ? '' : v.unitPrice;
  document.getElementById('material-note').value     = v.note || '';
}


console.log('--- NHẬP FORM (trọng lượng = đầu vào − đầu ra) ---');
setFormFields({ date: '2026-08-10', type: 'Tre nguyên liệu', supplier: 'NCC A', location: 'lo-hoi', input: 500, output: 120 });
state.materialFormImages = ['data:image/jpeg;base64,IMG1'];
mat.handleMaterialSubmit({ preventDefault(){} });
check('Nhập: thêm đúng 1 bản ghi', state.materialRecords.length === 1);
check('Nhập: trọng lượng = 500 − 120 = 380', state.materialRecords[0].weight === 380);
check('Nhập: tự tính tuần ISO 2026-W33', state.materialRecords[0].week === '2026-W33');
check('Nhập: giữ hình ảnh đã tải lên', (state.materialRecords[0].images || []).length === 1);
check('Nhập: lưu localStorage', !!localStorage.getItem('bamboo_tracker_material_records_v1'));
check('Nhập: sau submit modal đóng (editId = null)', state.materialEditId === null);
check('Nhập: không có đơn giá → thành tiền = 0', (state.materialRecords[0].totalAmount || 0) === 0);

console.log('--- VALIDATION ---');
setFormFields({ date: '', type: 'X', supplier: '', location: 'lo-hoi', input: 1, output: 0 });
mat.handleMaterialSubmit({ preventDefault(){} });
check('Chặn: thiếu ngày → không thêm', state.materialRecords.length === 1);
setFormFields({ date: '2026-08-11', type: 'X', supplier: '', location: 'lo-hoi', input: 5, output: -1 });
mat.handleMaterialSubmit({ preventDefault(){} });
check('Chặn: đầu ra âm → không thêm', state.materialRecords.length === 1);
setFormFields({ date: '2026-08-11', type: 'X', supplier: '', location: 'kho-a', input: 5, output: 1 });
mat.handleMaterialSubmit({ preventDefault(){} });
check('Chặn: vị trí không hợp lệ → không thêm', state.materialRecords.length === 1);
setFormFields({ date: '2026-08-11', type: 'X', supplier: '', location: 'lo-hoi', input: 5, output: 1, unitPrice: -5 });
mat.handleMaterialSubmit({ preventDefault(){} });
check('Chặn: đơn giá âm → không thêm', state.materialRecords.length === 1);

console.log('--- SỬA & XÓA ---');
const recId = state.materialRecords[0].id;
setFormFields({ date: '2026-08-10', type: 'Tre nguyên liệu', supplier: 'NCC A', location: 'lo-hoi', input: 600, output: 100, unitPrice: 2000 });
state.materialEditId = recId;
mat.handleMaterialSubmit({ preventDefault(){} });
check('Sửa: trọng lượng cập nhật 600 − 100 = 500', state.materialRecords[0].weight === 500);
check('Sửa: lưu đơn giá 2.000 đ/kg', state.materialRecords[0].unitPrice === 2000);
check('Sửa: thành tiền = 500 × 2.000 = 1.000.000 đ', state.materialRecords[0].totalAmount === 1000000);
check('Sửa: không nhân bản bản ghi', state.materialRecords.length === 1);
mat.deleteMaterial(recId);
check('Xóa: bản ghi bị gỡ sau khi xác nhận', state.materialRecords.length === 0);

console.log('--- LƯU / NẠP QUA LOCALSTORAGE ---');
state.materialRecords = [{ id: 'm1', date: '2026-08-10', week: '2026-W33', type: 'Keo UF', supplier: 'NCC B', location: 'xuong-1', inputIndex: 300, outputIndex: 60, weight: 240 }];
mat.saveMaterialRecords();
state.materialRecords = [];
mat.loadMaterialRecords();
check('Lưu/Nạp: giữ nguyên dữ liệu', state.materialRecords.length === 1 && state.materialRecords[0].weight === 240);


console.log('--- ENGINE BIỂU ĐỒ (nguồn materials) ---');
state.materialRecords = [
  { id: 'm1', date: '2026-08-10', week: '2026-W33', type: 'Tre nguyên liệu', supplier: 'NCC A', location: 'lo-hoi',  inputIndex: 500, outputIndex: 120, weight: 380, unitPrice: 2000, totalAmount: 760000 },
  { id: 'm2', date: '2026-08-11', week: '2026-W33', type: 'Dăm tre',         supplier: 'NCC B', location: 'xuong-1', inputIndex: 360, outputIndex: 60,  weight: 300, unitPrice: 1500, totalAmount: 450000 },
  { id: 'm3', date: '2026-08-12', week: '2026-W33', type: 'Keo UF',          supplier: 'NCC A', location: 'lo-hoi',  inputIndex: 150, outputIndex: 60,  weight: 90,  unitPrice: 5000, totalAmount: 450000 },
  { id: 'm4', date: '2027-03-05', week: '2027-W10', type: 'Tre nguyên liệu', supplier: 'NCC C', location: 'xuong-2', inputIndex: 400, outputIndex: 100, weight: 300, unitPrice: 1800, totalAmount: 540000 }
];

const byLoc = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'location', metric: 'weight' });
const loHoiIdx = byLoc.labels.indexOf('Lò hơi');
check('BE: nhóm theo vị trí có nhãn tiếng Việt "Lò hơi"', loHoiIdx >= 0);
check('BE: Lò hơi = 380 + 90 = 470 kg', byLoc.datasets[0].data[loHoiIdx] === 470);

const countChart = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'supplier', metric: 'recordCount' });
const nccAIdx = countChart.labels.indexOf('NCC A');
check('BE: đếm số lần nhập — NCC A = 2 lượt', nccAIdx >= 0 && countChart.datasets[0].data[nccAIdx] === 2);

const amountChart = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'location', metric: 'amount' });
const lhAmountIdx = amountChart.labels.indexOf('Lò hơi');
check('BE: thành tiền — Lò hơi = 760.000 + 450.000 = 1.210.000 đ', amountChart.datasets[0].data[lhAmountIdx] === 1210000);
check('BE: nhãn chỉ số thành tiền "Thành Tiền (đ)"', amountChart.datasets[0].label === 'Thành Tiền (đ)');

const byWeek = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'week', metric: 'recordCount' });
check('BE: nhãn tuần thân thiện "Tuần 33 (2026)"', byWeek.labels.includes('Tuần 33 (2026)'));

const locFiltered = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'type', metric: 'weight', location: 'lo-hoi' });
check('BE: lọc vị trí Lò hơi → tổng 470', locFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 470);
const yearFiltered = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'type', metric: 'weight', year: '2026' });
check('BE: lọc năm 2026 → tổng 770', yearFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 770);
const dateFiltered = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'type', metric: 'weight', dateFrom: '2026-08-11', dateTo: '2026-08-12' });
check('BE: lọc khoảng ngày 11–12/8 → tổng 390', dateFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 390);
const typeFiltered = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'location', metric: 'weight', matType: 'Tre nguyên liệu' });
check('BE: lọc loại NL "Tre nguyên liệu" → tổng 680', typeFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 680);

const stacked = xlsx.computeChartData({ type: 'stackedBar', source: 'materials', groupBy: 'location', stackBy: 'type', metric: 'weight' });
check('BE: xếp chồng — 3 dataset theo loại NL', stacked.datasets.length === 3);
const lhIdx = stacked.labels.indexOf('Lò hơi');
const treDs = stacked.datasets.find(d => d.label === 'Tre nguyên liệu');
check('BE: xếp chồng — Tre @ Lò hơi = 380', !!treDs && treDs.data[lhIdx] === 380);

console.log('--- CHART BUILDER SCHEMA (nguồn materials) ---');
dash.populateBuilderOptions('materials');
check('Builder: nhóm có "Nhà Cung Cấp"', /Nhà Cung Cấp/.test(document.getElementById('builder-group-by').innerHTML));
check('Builder: chỉ số có "Trọng Lượng" & "Thành Tiền"', /Trọng Lượng/.test(document.getElementById('builder-metric').innerHTML) && /Thành Tiền/.test(document.getElementById('builder-metric').innerHTML));
check('Builder: bộ lọc riêng có "Vị Trí (Dùng Cho)"', /Vị Trí \(Dùng Cho\)/.test(document.getElementById('builder-filters-box').innerHTML));

console.log('--- BỘ LỌC THỜI GIAN THẺ KPI (Tất Cả / Tuần / Tháng / Năm) ---');
// KPI so với NGÀY HÔM NAY THỰC → đếm kỳ vọng một cách ĐỘNG để test
// không phụ thuộc ngày chạy (hàm materialWeekLabel đã được xác minh độc lập ở trên)
state.materialActiveLoc = 'all';
const todayStr = new Date().toISOString().split('T')[0];
const recs = state.materialRecords;
const sameWeek  = recs.filter(r => r.date && mat.materialWeekLabel(r.date) === mat.materialWeekLabel(todayStr)).length;
const sameMonth = recs.filter(r => (r.date || '').slice(0, 7) === todayStr.slice(0, 7)).length;
const sameYear  = recs.filter(r => (r.date || '').slice(0, 4) === todayStr.slice(0, 4)).length;

check('KPI: đủ 4 kỳ (all/week/month/year)',
  mat.MATERIAL_KPI_PERIODS.length === 4 &&
  mat.MATERIAL_KPI_PERIODS.map(p => p.key).join('|') === 'all|week|month|year');

state.materialKpiPeriod = 'all';
check('KPI: Tất Cả → toàn bộ bản ghi theo vị trí', mat.kpiPeriodFilteredRecords().length === recs.length);
state.materialKpiPeriod = 'week';
check('KPI: Tuần này khớp đếm độc lập theo tuần ISO', mat.kpiPeriodFilteredRecords().length === sameWeek);
check('KPI: caption tuần = "Tuần N (YYYY)" của hôm nay', mat.kpiPeriodCaption() === mat.friendlyMaterialWeek(mat.materialWeekLabel(todayStr)));
state.materialKpiPeriod = 'month';
check('KPI: Tháng này khớp đếm độc lập theo YYYY-MM', mat.kpiPeriodFilteredRecords().length === sameMonth);
check('KPI: caption tháng = "Tháng M/YYYY"', mat.kpiPeriodCaption() === `Tháng ${parseInt(todayStr.slice(5, 7), 10)}/${todayStr.slice(0, 4)}`);
state.materialKpiPeriod = 'year';
check('KPI: Năm này khớp đếm độc lập theo YYYY', mat.kpiPeriodFilteredRecords().length === sameYear);
check('KPI: caption năm = "Năm YYYY"', mat.kpiPeriodCaption() === `Năm ${todayStr.slice(0, 4)}`);
state.materialKpiPeriod = 'all';
check('KPI: caption Tất Cả "Toàn bộ dữ liệu"', mat.kpiPeriodCaption() === 'Toàn bộ dữ liệu');

console.log('--- GỘP BẢN GHI NGUYÊN LIỆU (chống mất đơn giá / ảnh khi nạp file cũ) ---');
const { mergeMaterialRecords, restoreMaterialRecords } = await import('../js/storage.js');

// File cũ thiếu updatedAt + thiếu unitPrice (như bamboo_data.json trước khi sửa)
const oldFileRecord = { id: 'm1', date: '2026-08-28', type: 'Tre', location: 'lo-hoi', weight: 100, createdAt: '2026-08-31T11:48:11.513Z' };
// Máy có bản MỚI HƠN: đã nhập đơn giá/thành tiền và sửa lần cuối sau createdAt của file
const localNewer = { id: 'm1', date: '2026-08-28', type: 'Tre', location: 'lo-hoi', weight: 100, unitPrice: 3500, totalAmount: 350000, images: ['data:image/jpeg;base64,A'], createdAt: oldFileRecord.createdAt, updatedAt: '2026-08-31T15:00:00.000Z' };
const merged1 = mergeMaterialRecords([localNewer], [oldFileRecord]);
check('Gộp: bản máy MỚI HƠN (có updatedAt) giữ nguyên đơn giá + ảnh', merged1.length === 1 && merged1[0].unitPrice === 3500 && merged1[0].images.length === 1);

// Bản trong file MỚI HƠN (đồng bộ từ máy khác) → thắng bản máy
const fileNewer = { id: 'm1', date: '2026-08-28', type: 'Tre', location: 'xuong-1', weight: 120, unitPrice: 4000, totalAmount: 480000, images: ['data:image/jpeg;base64,B'], createdAt: '2026-08-31T11:48:11.513Z', updatedAt: '2026-09-01T08:00:00.000Z' };
const merged2 = mergeMaterialRecords([localNewer], [fileNewer]);
check('Gộp: bản nguồn ngoài MỚI HƠN thì thắng', merged2.length === 1 && merged2[0].totalAmount === 480000 && merged2[0].images[0].endsWith('B'));

// Bản chỉ có ở một phía → không bị xóa
const onlyLocal = { id: 'm2', date: '2026-09-01', type: 'Keo UF', location: 'xuong-2', weight: 50, unitPrice: 12000, totalAmount: 600000, createdAt: '2026-09-01T02:00:00.000Z' };
const merged3 = mergeMaterialRecords([localNewer, onlyLocal], [oldFileRecord]);
check('Gộp: bản chỉ có ở máy được giữ lại (không bị xóa)', merged3.length === 2 && !!merged3.find(r => r.id === 'm2'));
const merged4 = mergeMaterialRecords([localNewer], [oldFileRecord, onlyLocal]);
check('Gộp: bản chỉ có trong file/backup cũng được giữ lại', merged4.length === 2 && !!merged4.find(r => r.id === 'm2'));

// Dấu thời gian bằng nhau / nguồn ngoài thiếu dấu thời gian → giữ bản máy
const sameStamp = { id: 'm1', date: '2026-08-28', type: 'Tre', location: 'lo-hoi', weight: 999, createdAt: oldFileRecord.createdAt };
const merged5 = mergeMaterialRecords([localNewer], [sameStamp]);
check('Gộp: dấu thời gian bằng nhau → giữ bản máy', merged5[0].weight === 100 && merged5[0].unitPrice === 3500);
const noStampIn = { id: 'm1', type: 'Tre', weight: 777 };
const merged6 = mergeMaterialRecords([localNewer], [noStampIn]);
check('Gộp: nguồn ngoài thiếu dấu thời gian → giữ bản máy', merged6[0].weight === 100);

// restoreMaterialRecords: gộp + ghi localStorage, KHÔNG đè mất bản máy mới hơn
state.materialRecords = [localNewer];
restoreMaterialRecords([oldFileRecord]);
check('restoreMaterialRecords: gộp thay vì ghi đè — giữ đơn giá/ảnh của bản mới',
  state.materialRecords.length === 1 && state.materialRecords[0].unitPrice === 3500 && state.materialRecords[0].images.length === 1);
const storedAfter = JSON.parse(localStorage.getItem(STORAGE_KEY_MATERIALS));
check('restoreMaterialRecords: đã ghi danh sách gộp vào localStorage', !!storedAfter && storedAfter.length === 1 && storedAfter[0].unitPrice === 3500);

console.log('--- ẢNH 2 CẤP (thumb inline + full ngoài bản ghi) ---');
check('imgThumbSrc: chuỗi dataURL cũ → giữ nguyên', mat.imgThumbSrc('data:image/jpeg;base64,OLD') === 'data:image/jpeg;base64,OLD');
check('imgThumbSrc: entry {id, thumb} → trả thumb', mat.imgThumbSrc({ id: 'ph-1', thumb: 'data:image/jpeg;base64,T' }) === 'data:image/jpeg;base64,T');
check('imgThumbSrc: entry {full, thumb} (fallback) → trả thumb', mat.imgThumbSrc({ full: 'F', thumb: 'T' }) === 'T');
check('imgThumbSrc: entry chỉ có full → trả full (không mất ảnh)', mat.imgThumbSrc({ full: 'F' }) === 'F');
check('imgThumbSrc: rỗng → chuỗi rỗng', mat.imgThumbSrc(undefined) === '');
check('imgFullSrcSync: entry {id, thumb} → thumb (hiển thị tạm trước khi nạp full)', mat.imgFullSrcSync({ id: 'ph-1', thumb: 'T' }) === 'T');
check('imgPhotoId: chuỗi legacy → null', mat.imgPhotoId('data:image/jpeg;base64,X') === null);
check('imgPhotoId: entry {id, thumb} → id', mat.imgPhotoId({ id: 'ph-9', thumb: '' }) === 'ph-9');
check('imgPhotoIds: chỉ lấy id của entry dạng mới', JSON.stringify(mat.imgPhotoIds(['data:a', { id: 'p1', thumb: '' }, 'data:b', { id: 'p2', thumb: '' }])) === '["p1","p2"]');

console.log('--- MIGRATE ẢNH LEGACY (không có IndexedDB → không được mất ảnh) ---');
state.materialRecords.push({
  id: 'mat-legacy-1', date: '2026-08-30', week: mat.materialWeekLabel('2026-08-30'),
  type: 'Tre nguyên liệu', supplier: 'NCC L', location: 'xuong-1',
  inputIndex: 10, outputIndex: 2, weight: 8, unitPrice: 1000, totalAmount: 8000, note: '',
  images: ['data:image/jpeg;base64,LEGACY_A', 'data:image/jpeg;base64,LEGACY_B'],
  createdAt: new Date().toISOString()
});
await mat.migrateMaterialImages();
const legacyRec = state.materialRecords.find(r => r.id === 'mat-legacy-1');
check('Migrate: kho không khả dụng → ảnh legacy giữ nguyên tuyệt đối',
  legacyRec.images.length === 2 &&
  legacyRec.images[0] === 'data:image/jpeg;base64,LEGACY_A' &&
  legacyRec.images[1] === 'data:image/jpeg;base64,LEGACY_B');
check('Migrate: có hàm và không ném lỗi khi gọi lặp lại', (await mat.migrateMaterialImages()) === undefined);

console.log('--- XÓA BẢN GHI CÓ ẢNH (dọn kho/file không lỗi trong môi trường tối giản) ---');
const delBefore = state.materialRecords.length;
mat.deleteMaterial('mat-legacy-1');
check('Xóa: bản ghi bị gỡ khỏi danh sách', state.materialRecords.length === delBefore - 1);
check('Xóa: ảnh dạng {id, thumb} không làm Crash hàm xóa', state.materialRecords.every(r => !!r.id));

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);
