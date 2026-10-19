// tests/materials.test.mjs — Kiểm thử tab NHẬP NGUYÊN LIỆU (materials)
// Bao phủ: tuần ISO, nhãn vị trí, nén ảnh, lưu form (trọng lượng = đầu vào − đầu ra),
// chặn dữ liệu không hợp lệ, sửa/xóa, lưu/nạp localStorage, engine biểu đồ nguồn 'materials',
// chế độ Tổng Nhập Mua chia theo vị trí nhập (Tuần/Tháng/Năm).
'use strict';
import fs from 'node:fs';

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

// ─── DẢI HIGHLIGHT NGÀY HÔM NAY (biểu đồ Kế Hoạch vs Thực Tế Nguyên Liệu) ───
console.log('--- DẢI HIGHLIGHT NGÀY HÔM NAY ---');
// Ngày hôm nay theo GIỜ MÁY — cùng cách tính như js/materials.js
const _now = new Date();
const TODAY = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

// Bắt lấy config biểu đồ do materials.js dựng (Chart stub ở trên chỉ lưu this.config)
const captured = [];
const BaseChart = global.Chart;
global.Chart = class extends BaseChart {
  constructor(ctx, cfg) { super(ctx, cfg); captured.push(cfg); }
};
state.materialPlanChartWeek = TODAY.slice(0, 7) + '-W01';
mat.renderMaterialPlanChart();
global.Chart = BaseChart;

const cfgChart = captured[captured.length - 1];
const bandOpts = cfgChart && cfgChart.options && cfgChart.options.plugins && cfgChart.options.plugins.mpAxisBands;
const bandPlugin = cfgChart && (cfgChart.plugins || []).find(p => p && p.id === 'mpAxisBands');
check('Biểu đồ NL: có truyền todayIso cho dải ngày (theo giờ máy)', !!bandOpts && bandOpts.todayIso === TODAY);
check('Biểu đồ NL: plugin mpAxisBands có hook beforeDatasetsDraw (dải nằm DƯỚI cột)',
  !!bandPlugin && typeof bandPlugin.beforeDatasetsDraw === 'function');
check('Biểu đồ NL: vẫn giữ hook afterDraw (nhãn ngày + dải tuần + chip)',
  !!bandPlugin && typeof bandPlugin.afterDraw === 'function');

// Chart giả để soi nét vẽ của plugin
function fakeBandChart() {
  const calls = [];
  const ctx = {
    calls,
    fillStyle: '', strokeStyle: '', font: '', lineWidth: 1, textAlign: '', textBaseline: '',
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, setLineDash() {},
    roundRect() {}, rect() {}, fill() { calls.push('fill'); },
    fillRect() { calls.push('fillRect'); },
    fillText(t) { calls.push('text:' + t); },
    measureText: () => ({ width: 40 })
  };
  return {
    ctx, _calls: calls,
    chartArea: { left: 60, right: 600, top: 20, bottom: 300, width: 540, height: 280 },
    scales: { x: { getPixelForValue: (v) => 60 + v * 30 } }
  };
}
const groupsToday = [
  { iso: '2026-09-01', label: '01/09', i0: 0, i1: 2 },
  { iso: TODAY, label: 'hôm nay', i0: 3, i1: 5 }
];
const fToday = fakeBandChart();
bandPlugin.beforeDatasetsDraw(fToday, {}, { dayGroups: groupsToday, weekGroups: [], todayIso: TODAY });
check('Dải hôm nay: có TÔ NỀN sau cột (fillRect)', fToday._calls.includes('fillRect'));
const fChip = fakeBandChart();
bandPlugin.afterDraw(fChip, {}, { dayGroups: groupsToday, weekGroups: [], todayIso: TODAY });
check('Dải hôm nay: có CHIP "HÔM NAY"', fChip._calls.some(c => String(c).includes('HÔM NAY')));
check('Dải hôm nay: nhãn ngày hôm nay vẫn được vẽ', fChip._calls.some(c => String(c) === 'text:hôm nay'));
const fOut = fakeBandChart();
bandPlugin.beforeDatasetsDraw(fOut, {}, { dayGroups: groupsToday, weekGroups: [], todayIso: '1999-01-01' });
check('Dải hôm nay: hôm nay NGOÀI khung đang xem → không tô gì', fOut._calls.length === 0);
const fNone = fakeBandChart();
bandPlugin.beforeDatasetsDraw(fNone, {}, { dayGroups: groupsToday, weekGroups: [] });
check('Dải hôm nay: thiếu todayIso → không tô gì', fNone._calls.length === 0);

// ─── L. TỔNG NHẬP MUA THEO KỲ (chế độ xem thứ 2 của thẻ Nguyên liệu) ───
console.log('--- TỔNG NHẬP MUA THEO KỲ ---');
state.materialRecords = [
  { id: 'tt1', date: '2026-10-12', location: 'xuong-2', weight: 1000, unitPrice: 2000, totalAmount: 2000000, type: 'Luồng', supplier: 'A' },
  { id: 'tt2', date: '2026-10-13', location: 'xuong-2', weight: 500, unitPrice: 2000, totalAmount: 1000000, type: 'Luồng', supplier: 'A' },
  // Thiếu totalAmount nhưng có đơn giá ⇒ tự tính 300 × 3.000 = 900.000 (dữ liệu cũ)
  // location dùng NHÃN cũ 'Xưởng 1' (không phải key) ⇒ vẫn phải gom đúng vào cột Xưởng 1
  { id: 'tt3', date: '2026-10-14', location: 'Xưởng 1', weight: 300, unitPrice: 3000, totalAmount: 0, type: 'Nứa', supplier: 'B' },
  // Không có đơn giá ⇒ 0 đồng + đếm vào "chưa có đơn giá"
  { id: 'tt4', date: '2026-10-15', location: 'lo-hoi', weight: 200, unitPrice: 0, totalAmount: 0, type: 'Gỗ', supplier: 'C' },
  // Tuần sau (20/10) — KHÔNG được tính vào tuần 42
  { id: 'tt5', date: '2026-10-20', location: 'xuong-2', weight: 9999, unitPrice: 1000, totalAmount: 9999000, type: 'Luồng', supplier: 'A' },
  // Tháng trước (30/09) — không tính vào tháng 10 nhưng CÓ trong năm 2026
  { id: 'tt6', date: '2026-09-30', location: 'xuong-2', weight: 400, unitPrice: 2500, totalAmount: 1000000, type: 'Luồng', supplier: 'A' },
  // Thiếu ngày — không tính vào kỳ nào (có cảnh báo riêng)
  { id: 'tt7', date: '', location: 'xuong-2', weight: 50, unitPrice: 1000, totalAmount: 50000, type: 'Luồng', supplier: 'A' },
  // Vị trí lạ ⇒ gom vào dòng "Khác / không rõ"; thiếu totalAmount ⇒ 100 × 1.000
  { id: 'tt8', date: '2026-10-16', location: 'kho-x', weight: 100, unitPrice: 1000, type: 'Luồng', supplier: 'D' }
];
mat.setMpView('chart'); // bắt đầu từ chế độ biểu đồ

const rngW = mat.mpTotalsRangeOf('week', '2026-W42');
check('Tổng kỳ: tuần 2026-W42 = 12/10 → 18/10', rngW.from === '2026-10-12' && rngW.to === '2026-10-18');
check('Tổng kỳ: nhãn tuần có số tuần + khoảng ngày', rngW.label.includes('Tuần 42') && rngW.rangeLabel === '12/10 → 18/10');
const rngM = mat.mpTotalsRangeOf('month', '2026-10');
check('Tổng kỳ: tháng 10/2026 = 01/10 → 31/10', rngM.from === '2026-10-01' && rngM.to === '2026-10-31' && rngM.label === 'Tháng 10/2026');
const rngY = mat.mpTotalsRangeOf('year', '2026');
check('Tổng kỳ: năm 2026 = 01/01 → 31/12', rngY.from === '2026-01-01' && rngY.to === '2026-12-31' && rngY.label === 'Năm 2026');

check('Thành tiền 1 lượt: ưu tiên totalAmount đã lưu', mat.mpRecordAmount(state.materialRecords[0]) === 2000000);
check('Thành tiền 1 lượt: thiếu totalAmount → weight × unitPrice', mat.mpRecordAmount(state.materialRecords[2]) === 900000);

const sumW = mat.mpTotalsSummary(rngW);
check('Tổng tuần: đúng 5 lượt trong kỳ (bỏ tuần sau + tháng trước + thiếu ngày)', sumW.count === 5);
check('Tổng tuần: khối lượng = 1.000 + 500 + 300 + 200 + 100 = 2.100 kg', sumW.weight === 2100);
check('Tổng tuần: tổng tiền = 2tr + 1tr + 0,9tr + 0 + 0,1tr = 4.000.000 đ', sumW.amount === 4000000);
check('Tổng tuần: đơn giá TB = tiền ÷ kg', Math.abs(sumW.avgPrice - (4000000 / 2100)) < 0.001);
check('Tổng tuần: 4 lượt có đơn giá / 1 lượt chưa có', sumW.pricedCount === 4 && sumW.missingPriceCount === 1);
check('Tổng tuần: 5 ngày + 1 lượt thiếu ngày được đếm cảnh báo', sumW.days === 5 && sumW.undatedCount === 1);
check('Tổng tuần: chia theo vị trí — Xưởng 2 = 1.500 kg / 3.000.000 đ',
  sumW.rows[2].key === 'xuong-2' && sumW.rows[2].weight === 1500 && sumW.rows[2].amount === 3000000);
check('Tổng tuần: chia theo vị trí — Xưởng 1 = 300 kg / 900.000 đ (tự tính thành tiền)',
  sumW.rows[1].key === 'xuong-1' && sumW.rows[1].weight === 300 && sumW.rows[1].amount === 900000);
check('Tổng tuần: chia theo vị trí — Lò hơi = 200 kg / 0 đ',
  sumW.rows[0].key === 'lo-hoi' && sumW.rows[0].weight === 200 && sumW.rows[0].amount === 0);
check('Tổng tuần: vị trí lạ gom vào dòng "Khác / không rõ" (100 kg / 100.000 đ)',
  sumW.rows.length === 4 && sumW.rows[3].key === 'khac' && sumW.rows[3].weight === 100 && sumW.rows[3].amount === 100000);
check('Tổng tuần: tỷ trọng khối lượng cộng lại ~100%',
  Math.abs(sumW.rows.reduce((a, r) => a + r.shareWeight, 0) - 100) < 0.01);

const sumM = mat.mpTotalsSummary(rngM);
check('Tổng tháng 10: 6 lượt · 12.099 kg · 13.999.000 đ (có lượt 20/10)',
  sumM.count === 6 && sumM.weight === 12099 && sumM.amount === 13999000);
const sumY2 = mat.mpTotalsSummary(rngY);
check('Tổng năm 2026: 7 lượt · 12.499 kg · 14.999.000 đ (có lượt 30/09)',
  sumY2.count === 7 && sumY2.weight === 12499 && sumY2.amount === 14999000);
check('Tổng năm: KHÔNG tính lượt thiếu ngày', sumY2.count === 7 && sumY2.undatedCount === 1);

// Đồng bộ giao diện + render thật vào các ô
mat.setMpView('totals');
mat.setMpTotalsMode('week');
mat.setMpTotalsPeriod('2026-W42');
check('Chế độ Tổng: thẻ mang data-mp-mode="totals"', els.get('material-plan-chart-card').dataset.mpMode === 'totals');
check('Chế độ Tổng: hiện #mp-totals + ẩn khung biểu đồ + ẩn ô chọn tuần',
  els.get('mp-totals').hidden === false && els.get('mpc-chart-box').hidden === true && els.get('mpc-week-nav').hidden === true);
check('Chế độ Tổng: tên thẻ đổi thành "Tổng Nhập Mua Nguyên Liệu (Theo Kỳ)"',
  els.get('mpc-mode-label').textContent === 'Tổng Nhập Mua Nguyên Liệu (Theo Kỳ)');
check('Chế độ Tổng: nút chuyển đổi tooltip sang Tổng Nhập Mua', els.get('mpc-mode-toggle').title.includes('Tổng Nhập Mua'));
check('Render ①: tổng khối lượng 2.100 kg + quy đổi tấn',
  els.get('mp-total-kg').textContent === '2.100 kg' && els.get('mp-total-kg-sub').textContent.includes('2,1 tấn'));
check('Render ②: tổng tiền 4.000.000 đ', els.get('mp-total-amount').textContent === '4.000.000 đ');
check('Render ②: đơn giá TB + cảnh báo 1 lượt chưa có đơn giá',
  els.get('mp-total-amount-meta').innerHTML.includes('Đơn giá TB') && els.get('mp-total-amount-meta').innerHTML.includes('chưa có đơn giá'));
check('Render ①: bảng chia đúng vị trí Xưởng 2 / Xưởng 1 / Lò hơi / Khác',
  ['Xưởng 2', 'Xưởng 1', 'Lò hơi', 'Khác / không rõ', '1.500'].every((t) => els.get('mp-total-loc-kg').innerHTML.includes(t)));
check('Render ②: bảng tiền chia đúng vị trí (3.000.000 · 900.000 · 100.000)',
  ['Xưởng 2', 'Xưởng 1', 'Lò hơi', '3.000.000', '900.000', '100.000'].every((t) => els.get('mp-total-loc-money').innerHTML.includes(t)));
check('Render: dòng Tổng khối lượng (2.100 kg) + dòng Tổng tiền có trong tfoot',
  els.get('mp-total-loc-kg-foot').innerHTML.includes('2.100') && els.get('mp-total-loc-money-foot').innerHTML.includes('Tổng'));
check('Render: ghi chú cảnh báo lượt thiếu ngày', els.get('mp-totals-note').innerHTML.includes('thiếu ngày'));

mat.setMpTotalsMode('month');
check('Đổi kỳ Tháng: mode = month', mat.mpTotalsModeOf() === 'month');
mat.setMpTotalsPeriod('2026-10');
check('Đổi kỳ Tháng: render tổng 12.099 kg', els.get('mp-total-kg').textContent === '12.099 kg');
mat.setMpTotalsMode('year');
mat.setMpTotalsPeriod('2026');
check('Đổi kỳ Năm: render tổng 14.999.000 đ', els.get('mp-total-amount').textContent === '14.999.000 đ');

mat.setMpTotalsMode('week');
mat.setMpTotalsPeriod('2026-W42');
mat.shiftMpTotalsPeriod(1);
check('Kỳ trước/sau: tiến tuần 42 → 43', mat.mpTotalsKeyOf('week') === '2026-W43');
const savedUi = JSON.parse(localStorage.getItem(mat.MP_TOTALS_UI_KEY) || '{}');
check('Nhớ theo máy: lưu view/mode/week vào localStorage',
  savedUi.view === 'totals' && savedUi.mode === 'week' && savedUi.week === '2026-W43');
mat.shiftMpTotalsPeriod(-1);

mat.setMpTotalsPeriod('2020-W01');
check('Kỳ rỗng: tổng hiện "—" + bảng báo chưa có lần nhập',
  els.get('mp-total-kg').textContent === '—' && els.get('mp-total-loc-kg').innerHTML.includes('chưa có lần nhập'));

check('Xuất hàm: materials.js export đủ API Tổng Nhập Mua',
  typeof mat.mpTotalsSummary === 'function' && typeof mat.toggleMpView === 'function' &&
  typeof mat.setMpView === 'function' && typeof mat.applyMpViewDom === 'function' &&
  mat.MP_TOTALS_UI_KEY === 'bamboo_tracker_mp_totals_ui_v1');

mat.setMpView('chart');
check('Quay lại biểu đồ: ẩn vùng tổng + hiện lại khung canvas',
  els.get('mp-totals').hidden === true && els.get('mpc-chart-box').hidden === false);

// ─── I. CUỘN BẢNG NGUYÊN LIỆU (.table-scroll: dọc 60vh + tiêu đề dính + trượt ngang) ───
const matIdxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const matCssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const matNear = (id) => new RegExp('table-responsive table-scroll"[\\s\\S]{0,80}?id="' + id + '"').test(matIdxHtml);
check('CUỘN: 3 bảng Nguyên Liệu bọc khung .table-responsive.table-scroll (không còn div inline)',
  matNear('material-table') && matNear('material-plan-table') && matNear('supplier-table') &&
  !matIdxHtml.includes('style="overflow-x:auto;"'));
check('CUỘN (styles.css): .table-scroll = khung cuộn dọc 60vh + dòng tiêu đề DÍNH (sticky thead)',
  /\.table-scroll,\s*\.hr-table-scroll\s*\{/.test(matCssHtml) && matCssHtml.includes('max-height: 60vh;') &&
  /\.table-scroll thead th,\s*\.hr-table-scroll thead th\s*\{[\s\S]{0,220}?position: sticky;/.test(matCssHtml));
check('CUỘN (styles.css): bảng nhiều cột có min-width → trượt ngang khi màn hình hẹp (cột không bóp)',
  matCssHtml.includes('#material-table { min-width: 1040px') && matCssHtml.includes('#supplier-table { min-width: 980px') &&
  matCssHtml.includes('#material-plan-table { min-width: 560px'));

// ─── L2. CẤU TRÚC: nút chuyển chế độ + vùng Tổng Nhập Mua ───
function cssDepthAt(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) return -1;
  let d = 0;
  for (let j = 0; j < i; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') d--;
  }
  return d;
}
const evSrcMat = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('TỔNG NHẬP MUA: bỏ chú thích tuần mờ #mpc-caption khỏi header', !matIdxHtml.includes('mpc-caption'));
check('TỔNG NHẬP MUA: có nút chuyển chế độ + vùng 2 phần + 2 bảng vị trí',
  matIdxHtml.includes('id="mpc-mode-toggle"') && matIdxHtml.includes('id="mp-totals"') &&
  matIdxHtml.includes('id="mp-total-loc-kg"') && matIdxHtml.includes('id="mp-total-loc-money"'));
check('TỔNG NHẬP MUA: bộ lọc Tuần/Tháng/Năm + ô chọn kỳ',
  matIdxHtml.includes('data-mp-pmode="week"') && matIdxHtml.includes('data-mp-pmode="month"') &&
  matIdxHtml.includes('data-mp-pmode="year"') && matIdxHtml.includes('id="mp-totals-period"'));
check('TỔNG NHẬP MUA (CSS): .mp-totals ở cấp cao nhất (không lọt @media)',
  cssDepthAt(matCssHtml, '.mp-totals {') === 0);
check('TỔNG NHẬP MUA (CSS): ẩn thật bằng [hidden] + 2 phần xếp 2 cột',
  matCssHtml.includes('.mp-totals[hidden]') && matCssHtml.includes('.mp-totals-grid') &&
  matCssHtml.includes('grid-template-columns: repeat(2'));
check('TỔNG NHẬP MUA (events): nối nút chuyển + bộ lọc kỳ + ủy quyền chọn Tuần/Tháng/Năm',
  evSrcMat.includes("safeOn('mpc-mode-toggle'") && evSrcMat.includes("safeOn('mp-totals-period'") &&
  evSrcMat.includes('setMpTotalsMode(') && evSrcMat.includes("closest('[data-mp-pmode]')"));
check('TỔNG NHẬP MUA: giữ dải tuần dưới trục X (plugin vẫn dùng weekGroups)',
  /weekGroups/.test(fs.readFileSync(new URL('../js/materials.js', import.meta.url), 'utf8')));

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);
