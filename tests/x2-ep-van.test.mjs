// tests/x2-ep-van.test.mjs — Kiểm thử THẺ "ÉP VÁN" (launcher tab Công Đoạn) sau khi
// DỜI module Sản Lượng Ép Ván từ tab riêng vào thẻ:
//   • Tab Ép Ván đã bị XÓA (nav desktop + nav điện thoại + section press-view).
//   • Thẻ Ép Ván có 2 KHUNG: "Lượt Ép" (thẻ NGÀY: Ngày · Người ép tự động ·
//     Giờ HC/TC · Công suất m³/ngày [· m³/h + Hiệu suất khi có định mức] ·
//     Thành phẩm) và "Biểu Đồ" (biểu đồ thể tích ván ép theo ngày).
//   • Định mức công suất ép ván theo tháng (m³/h) + nối storage/cloud/history.
//   • Bảng "Bào Tinh ↔ Đã Ép" đã DỜI sang thẻ Bào Tinh.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-bao-tinh.test.mjs) ───────────
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
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}


const { state, STORAGE_KEY_X2_EP_VAN_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// ─── Dữ liệu mẫu: 1 lượt ép (ván thô 2000×600×20 × 50 tấm = 1,2 m³) ───
const D = '2026-09-21';
state.pressRecords = [{
  id: 'pr-1', date: D, year: 2026, week: '2026-W39',
  productId: 'prod-1', productName: 'Ván 2000x600x20', fpDim: '2000x600x20',
  finishedQty: 50, glue: 30, additive: 2.5,
  vanTho: [{ vtDim: '2000x600x20', vtQty: 50 }],
  sticks: [{ nanKey: '1250x18x7', sticks: 1000 }],
  createdAt: '2026-09-21T02:00:00.000Z'
}];
state.pressNotes = [];
state.materialRates = [{ id: 'prod-1', product: 'Ván 2000x600x20', rate: 1 }];
state.x2EpVanRates = {};
state.xuong2BaoTinhRecords = [];
state.batches = [];
state.planningItems = [];
// Nhân Sự: vị trí "Ép" (khớp) + "Bào tinh" (KHÔNG khớp) + chấm công đi làm
state.hrEmployees = [
  { id: 'empEp', name: 'Nguyễn Văn Ép', status: 'active', department: 'Xưởng 2' },
  { id: 'empKhac', name: 'Trần Văn Khác', status: 'active', department: 'Xưởng 2' }
];
state.hrPositions = [
  { id: 'p-ep', name: 'Ép', department: 'Xưởng 2' },
  { id: 'p-btinh', name: 'Bào tinh', department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'asg-1', date: D, department: 'Xưởng 2', positionId: 'p-ep', employeeId: 'empEp', start: '07:00', end: '12:00' },
  { id: 'asg-2', date: D, department: 'Xưởng 2', positionId: 'p-ep', employeeId: 'empEp', start: '13:00', end: '' },
  { id: 'asg-3', date: D, department: 'Xưởng 2', positionId: 'p-btinh', employeeId: 'empKhac', start: '07:00', end: '12:00' }
];
state.hrAttendance = [
  { id: 'att-1', date: D, employeeId: 'empEp', status: 'work', positions: ['p-ep'] },
  { id: 'att-2', date: D, employeeId: 'empKhac', status: 'work', positions: ['p-btinh'] }
];
state.hrLeaves = [];
state.hrWorkCalendar = {};

const x2 = await import('../js/xuong2.js');
const press = await import('../js/press.js');

// ─── A. THẺ LAUNCHER + 2 KHUNG ──────────────────────────────────
x2.renderXuong2Cards();
check('THẺ: mini card Ép Ván đếm "1 lượt · 1,2 m³" (KHÔNG còn "Sắp có")',
  document.getElementById('x2-mini-count-ep-van').textContent === '1 lượt · 1,2 m³' &&
  !document.getElementById('x2-mini-count-ep-van').classList.contains('x2-count-soon'));
// Khung Biểu Đồ trong index.html có thuộc tính `hidden` — stub DOM không đọc HTML
// nên đặt lại đúng trạng thái ban đầu trước khi mở thẻ
document.getElementById('x2-epv-frame-chart').hidden = true;
document.getElementById('x2-epv-tab-list').classList.add('active');
check('THẺ: mở thẻ Ép Ván trả về true + pop-up bật + thẻ không còn ẩn',
  x2.x2OpenCard('x2-ep-van-card') === true &&
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-ep-van-card').classList.contains('x2-card-hidden'));
check('KHUNG: mặc định mở khung "Lượt Ép" — khung Biểu Đồ ẩn',
  document.getElementById('x2-epv-frame-list').hidden === false &&
  document.getElementById('x2-epv-frame-chart').hidden === true);
press.switchX2EpVanFrame('chart');
check('KHUNG: bấm tab "Biểu Đồ" → khung biểu đồ hiện, khung lượt ép ẩn, tab đổi active',
  document.getElementById('x2-epv-frame-chart').hidden === false &&
  document.getElementById('x2-epv-frame-list').hidden === true &&
  document.getElementById('x2-epv-tab-chart').classList.contains('active') &&
  !document.getElementById('x2-epv-tab-list').classList.contains('active'));
press.switchX2EpVanFrame('list');
check('KHUNG: quay lại tab "Lượt Ép" → đúng trạng thái ban đầu + tab Lượt Ép active',
  document.getElementById('x2-epv-frame-list').hidden === false &&
  document.getElementById('x2-epv-frame-chart').hidden === true &&
  document.getElementById('x2-epv-tab-list').classList.contains('active'));

// ─── B. KHUNG 1: THẺ NGÀY (người ép · giờ HC/TC · công suất m³/ngày) ──
const snap = press.epVanSnapshotOf(D);
check('TỰ ĐỘNG: giờ HC/TC lấy từ Bảng bố trí vị trí "Ép" (không lấy "Bào tinh")',
  snap.hours > 0 && snap.hoursHC > 0 && snap.hoursTC === 0 &&
  snap.workers.length === 1 && snap.workers[0].name === 'Nguyễn Văn Ép');
check('M³: thể tích 1 lượt = ván thô tạo ra (2000×600×20 × 50 = 1,2 m³)',
  Math.round(press.pressRecordVolumeOf(state.pressRecords[0]) * 100) / 100 === 1.2);
const dayHtml = document.getElementById('x2-epv-day-cards').innerHTML;
check('THẺ NGÀY: có Ngày 21/09/26 · Người ép · Giờ HC/TC · Công suất m³/ngày · Thành phẩm',
  dayHtml.includes('21/09/26') && dayHtml.includes('Nguyễn Văn Ép') &&
  dayHtml.includes('h HC') && dayHtml.includes('Công suất:') && dayHtml.includes('1,2 m³/ngày') &&
  dayHtml.includes('50</strong> tấm'));
check('THẺ NGÀY: từng lượt ép 1 dòng có nút Sửa/Xóa (quyền press) + keo · phụ gia · m³',
  dayHtml.includes('x2-epv-row') && dayHtml.includes("app.editPressRecord('pr-1')") &&
  dayHtml.includes("app.deletePressRecord('pr-1')") && dayHtml.includes('data-perm="press"') &&
  dayHtml.includes('30.00') && dayHtml.includes('2.50'));
check('THẺ NGÀY: CHƯA đặt định mức → KHÔNG hiện m³/h và Hiệu suất',
  !dayHtml.includes('m³/h:') && !dayHtml.includes('Hiệu suất'));

// ─── C. ĐỊNH MỨC CÔNG SUẤT ÉP VÁN (m³/h) ────────────────────────
press.renderX2EpVanRateBar();
check('ĐỊNH MỨC: chưa đặt → chip báo "Chưa đặt định mức"',
  document.getElementById('x2-epv-rate-chips').innerHTML.includes('Chưa đặt định mức'));
document.getElementById('x2-epv-rate-month').value = '2026-09';
document.getElementById('x2-epv-rate-value').value = '2';
press.handleX2EpVanRateSave();
check('ĐỊNH MỨC: lưu tháng 9 = 2 m³/h → state + localStorage + chip "T9/26 = 2 m³/h"',
  state.x2EpVanRates['2026-09'] === 2 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_EP_VAN_RATE) || '{}')['2026-09'] === 2 &&
  document.getElementById('x2-epv-rate-chips').innerHTML.includes('T9/26 = 2 m³/h'));
const dayHtml2 = document.getElementById('x2-epv-day-cards').innerHTML;
check('ĐỊNH MỨC: CÓ định mức → thẻ ngày hiện thêm m³/h + Hiệu suất + nhãn ĐM',
  dayHtml2.includes('m³/h:') && dayHtml2.includes('Hiệu suất') && dayHtml2.includes('ĐM:'));
check('ĐỊNH MỨC: m³/h = thể tích ÷ giờ bố trí · hiệu suất = m³/h ÷ định mức (đúng số)',
  (function () {
    const raw = 1.2 / snap.hours;                                  // m³/h chưa làm tròn
    const shown = raw.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    const eff = ((raw / 2) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
    return dayHtml2.includes(shown) && dayHtml2.includes(eff + '%');
  })());
check('ĐỊNH MỨC: chặn lưu khi để trống/0',
  (function () {
    document.getElementById('x2-epv-rate-value').value = '0';
    press.handleX2EpVanRateSave();
    return state.x2EpVanRates['2026-09'] === 2;
  })());


// ─── D. BẢNG "BÀO TINH ↔ ĐÃ ÉP" ĐÃ DỜI SANG THẺ BÀO TINH ───────
press.renderBaoTinhEffTable();
check('BẢNG DỜI: renderBaoTinhEffTable ghi được vào #baotinh-eff-body (thẻ Bào Tinh)',
  document.getElementById('baotinh-eff-body').innerHTML.length > 0);
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('BẢNG DỜI: baotinh-eff-card nằm TRONG thẻ Bào Tinh (giữa x2-bao-tinh-card và x2-ep-van-card)',
  idxHtml.indexOf('id="x2-bao-tinh-card"') < idxHtml.indexOf('id="baotinh-eff-card"') &&
  idxHtml.indexOf('id="baotinh-eff-card"') < idxHtml.indexOf('id="x2-ep-van-card"'));

// ─── E. TAB ÉP VÁN ĐÃ XÓA + CẤU TRÚC MỚI ────────────────────────
check('XÓA TAB: index.html không còn section press-view, nút nav desktop (#nav-press) và nav điện thoại',
  !idxHtml.includes('id="press-view"') && !idxHtml.includes('id="nav-press"') &&
  !idxHtml.includes('data-target="press-view"'));
check('CẤU TRÚC: thẻ Ép Ván có 2 khung + 2 tab chuyển khung + định mức m³/h + thẻ ngày',
  idxHtml.includes('id="x2-epv-frame-list"') && idxHtml.includes('id="x2-epv-frame-chart"') &&
  idxHtml.includes('id="x2-epv-tab-list"') && idxHtml.includes('id="x2-epv-tab-chart"') &&
  idxHtml.includes('id="x2-epv-day-cards"') && idxHtml.includes('id="x2-epv-rate-month"') &&
  idxHtml.includes('id="x2-epv-rate-value"') && idxHtml.includes('id="btn-x2-epv-rate-save"'));
check('CẤU TRÚC: biểu đồ + bảng chi tiết + nút Thêm Lượt Ép nằm trong thẻ Ép Ván',
  idxHtml.includes('id="press-chart"') && idxHtml.includes('id="press-table-body"') &&
  idxHtml.includes('id="press-year-filter"') && idxHtml.includes('id="btn-add-press-2"') &&
  idxHtml.includes('id="btn-add-press-note-2"'));
const jsPress = fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
check('CẤU TRÚC: press.js KHÔNG còn renderPressView · main.js không gọi hàm này',
  !/function renderPressView/.test(jsPress) && !/renderPressView/.test(jsMain) &&
  jsMain.includes('loadX2EpVanRates'));
check('CẤU TRÚC: events.js nối tab chuyển khung + nút thêm lượt + lưu định mức',
  (function () {
    const jsE = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
    return jsE.includes("safeOn('x2-epv-tab-list'") && jsE.includes("safeOn('x2-epv-tab-chart'") &&
      jsE.includes("safeOn('btn-add-press-2'") && jsE.includes("safeOn('btn-x2-epv-rate-save'") &&
      jsE.includes("safeOn('x2-epv-rate-month'");
  })());
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('CẤU TRÚC (styles.css): khối THẺ ÉP VÁN 2 KHUNG (tab active · khung ẩn · dòng lượt ép)',
  cssHtml.includes('THẺ ÉP VÁN (launcher tab Công Đoạn) — 2 KHUNG') &&
  cssHtml.includes('.x2-epv-tab.active') && cssHtml.includes('.x2-epv-frame[hidden]') &&
  cssHtml.includes('.x2-epv-row-main'));
check('CẤU TRÚC: định mức ép ván nối storage/cloud/history (x2EpVanRates)',
  (function () {
    const st = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
    const cl = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
    const hi = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
    return st.includes('restoreX2EpVanRates') && st.includes('x2EpVanRates') &&
      cl.includes('x2EpVanRates') && cl.includes('STORAGE_KEY_X2_EP_VAN_RATE') &&
      hi.includes('x2EpVanRates');
  })());
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('CẤU TRÚC (sw.js): đã tăng CACHE_NAME v155', /nha-may-ngoc-son-v155/.test(swJs));

// ═══ F. BƯỚC 4/5: NÚT DÙNG CHUNG (LỊCH SỬ theo thẻ + XUẤT EXCEL theo thẻ) ═══
check('DÙNG CHUNG: thẻ đang mở → vùng dữ liệu + nguồn xuất Excel tương ứng',
  x2.x2OpenCardId() === 'x2-ep-van-card' &&
  x2.x2OpenCardHistoryDomain() === 'pressRecords' &&
  x2.x2OpenCardExportSource() === 'epvan');
x2.x2CloseOpenCard();
check('DÙNG CHUNG: đóng thẻ → không còn thẻ đang mở (vùng dữ liệu mặc định rỗng)',
  x2.x2OpenCardId() === null && x2.x2OpenCardHistoryDomain() === '' &&
  state.x2OpenCardId === null);
const mapCn = x2.X2_CARD_HISTORY_DOMAIN, mapEx = x2.X2_CARD_EXPORT_SOURCE;
check('DÙNG CHUNG: đủ 7 thẻ có vùng dữ liệu + nguồn xuất (Cắt · Bổ Ống · Bào Thô · Chọn Nan · Than Hóa · Bào Tinh · Ép Ván)',
  Object.keys(mapCn).length === 7 && Object.keys(mapEx).length === 7 &&
  mapCn['x2-bao-tinh-card'] === 'xuong2BaoTinhRecords' && mapEx['x2-bao-tinh-card'] === 'baotinh' &&
  mapCn['x2-than-hoa-card'] === 'batches' && mapEx['x2-than-hoa-card'] === 'batch');

// Lịch sử: modal có bộ lọc VÙNG DỮ LIỆU (nút dùng chung mở đúng vùng của thẻ)
const history = await import('../js/history.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true, fullname: 'Quản trị viên' };
state.history = [
  { id: 'h1', ts: Date.now(), user: 'Quản trị viên', action: 'add', tab: 'kanban', domain: 'pressRecords', domainLabel: 'Lượt ép ván', detail: 'Thêm 1 lượt ép' },
  { id: 'h2', ts: Date.now() - 1000, user: 'Quản trị viên', action: 'add', tab: 'kanban', domain: 'xuong2BaoTinhRecords', domainLabel: 'Bào tinh Xưởng 2', detail: 'Thêm 1 lượt bào tinh' }
];
history.openHistoryModal('kanban', 'pressRecords');
const histHtml = document.getElementById('history-list').innerHTML;
check('LỊCH SỬ: mở theo vùng pressRecords → chỉ hiện dòng của vùng đó',
  histHtml.includes('Lượt ép ván') && !histHtml.includes('Thêm 1 lượt bào tinh'));
check('LỊCH SỬ: có dropdown VÙNG DỮ LIỆU (#history-domain-filter) + tiêu đề ghi rõ vùng',
  idxHtml.includes('id="history-domain-filter"') &&
  document.getElementById('history-modal-title').innerHTML.includes('Lượt ép ván'));


// Xuất Excel Xưởng 2: form tự chọn nguồn theo thẻ + dựng được dữ liệu
const xlsx = await import('../js/export-xlsx.js');
check('XUẤT X2: modal có dropdown nguồn + khoảng ngày + nút dùng chung (index.html)',
  idxHtml.includes('id="modal-export-x2"') && idxHtml.includes('id="export-x2-source"') &&
  idxHtml.includes('id="export-x2-from"') && idxHtml.includes('id="export-x2-to"') &&
  idxHtml.includes('id="btn-export-x2"'));
// Dữ liệu mẫu 2 nguồn: Lô nan + Bào tinh
state.batches = [{ id: 'b1', code: '260921-01', stage: 'say2', location: 'LS3', length: 1250, width: 18, thickness: 7, quantity: 500, bambooType: 'A1', useFor: 'Ván', createdAt: '2026-09-21T02:00:00.000Z', say2Date: '2026-09-21' }];
state.xuong2BaoTinhRecords = [{
  id: 'bt1', date: D, week: '2026-W39', kind: 'tinh',
  sources: [{ batchId: 'b1', code: '260921-01', location: 'LS3', dims: [1250, 18, 7], qty: 500 }],
  batchId: 'b1', batchCode: '260921-01', batchLocation: 'LS3', batchDims: [1250, 18, 7], batchQty: 500,
  inQty: 500, inSizeKey: '1250×18×7', inDims: [], manualRowId: '',
  outDims: [1245, 17, 6], outSizeKey: '1245×17×6', unitVol: 0.0127,
  qtyOk: 480, qtyErr: 20, qtyIn: 500, volumeOk: 6.1,
  worker: '', workTime: '', workHours: 0, workHoursHC: 0, workHoursTC: 0,
  createdAt: '2026-09-21T03:00:00.000Z'
}];
document.getElementById('export-x2-from').value = '';
document.getElementById('export-x2-to').value = '';
const dBatch = xlsx.buildX2ExportData('batch');
check('XUẤT X2 (Lô nan): có tiêu đề + hàng cột + dòng dữ liệu + tên file .xlsx',
  !!dBatch && dBatch.aoa[0][0].includes('LÔ NAN') && dBatch.aoa[4][0] === 'Stt' &&
  dBatch.aoa.length >= 6 && /Xuong2_batch_.*\.xlsx/.test(dBatch.filename));
const dBtinh = xlsx.buildX2ExportData('baotinh');
check('XUẤT X2 (Bào tinh): cột có "K.Thước Sau Bào" + "Thanh Lỗi" + dòng tổng kết đúng số',
  !!dBtinh && dBtinh.aoa[4].join('|').includes('K.Thước Sau Bào') &&
  dBtinh.aoa[4].join('|').includes('Thanh Lỗi') &&
  dBtinh.aoa[2][0].includes('Tổng đạt 480') && /Xuong2_baotinh_.*\.xlsx/.test(dBtinh.filename));
check('XUẤT X2: lọc theo khoảng ngày — ngoài khoảng thì không có dữ liệu (trả null)',
  (function () {
    document.getElementById('export-x2-to').value = '2026-09-01';
    const d = xlsx.buildX2ExportData('baotinh');
    document.getElementById('export-x2-to').value = '';
    return d === null;
  })());
check('XUẤT X2: chọn nguồn "Ép Ván" → tự chuyển sang form xuất Ép Ván chuyên sâu',
  (function () {
    xlsx.openX2ExportModal('epvan');
    const wasOpen = document.getElementById('modal-export-x2').classList.contains('show');
    document.getElementById('export-x2-source').value = 'epvan';
    xlsx.handleX2ExportSubmit({ preventDefault(){} });
    return wasOpen && !document.getElementById('modal-export-x2').classList.contains('show') &&
      document.getElementById('modal-export-press').classList.contains('show');
  })());
check('XUẤT X2: mở form theo thẻ → tự chọn đúng nguồn (Bào Tinh → baotinh) + hiện modal',
  (function () {
    document.getElementById('modal-export-x2').classList.remove('show');
    xlsx.openX2ExportModal('baotinh');
    return document.getElementById('export-x2-source').value === 'baotinh' &&
      document.getElementById('modal-export-x2').classList.contains('show');
  })());
check('CẤU TRÚC: nút dùng chung đã nối ở events.js + đã bỏ 2 nút cũ trong thẻ Ép Ván',
  (function () {
    const jsE = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
    return jsE.includes("safeOn('btn-export-x2'") && jsE.includes("safeOn('btn-history-x2'") &&
      jsE.includes("safeOn('history-domain-filter'") && jsE.includes("safeOn('x2-export-form'") &&
      !jsE.includes("safeOn('btn-open-export-press'") && !jsE.includes("safeOn('btn-history-press'") &&
      !idxHtml.includes('id="btn-open-export-press"') && !idxHtml.includes('id="btn-history-press"');
  })());
check('CẤU TRÚC: 2 nút dùng chung nằm TRONG thanh tiêu đề pop-up thẻ Xưởng 2 (.x2-detail-actions)',
  (function () {
    const iShell = idxHtml.indexOf('id="x2-detail-overlay"');
    const iHeader = idxHtml.indexOf('x2-detail-actions', iShell);
    const iTitle = idxHtml.indexOf('id="x2-detail-title"', iShell);
    const iClose = idxHtml.indexOf('id="btn-close-x2-detail"', iShell);
    const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    return iTitle > iShell && iHeader > iTitle && iHeader < iClose &&
      idxHtml.includes('id="btn-history-x2"') && css.includes('.x2-detail-actions');
  })());


console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
