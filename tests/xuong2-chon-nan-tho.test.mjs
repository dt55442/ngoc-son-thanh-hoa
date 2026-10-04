// tests/xuong2-chon-nan-tho.test.mjs — Kiểm thử VỊ TRÍ "CHỌN NAN THÔ" (Xưởng 2):
// form (Ngày chọn · Chọn LÔ theo ngày bào thô · Loại nan lấy từ lô bào thô, có nút
// Thêm mới cho nan nhập NGOÀI công đoạn · Phân loại A/A1/B/Loại hẳn · Số lượng),
// bảng phụ ĐỊNH MỨC CÔNG SUẤT theo tháng (thanh/h), bảng dữ liệu dạng THẺ NGÀY
// (đầu thẻ: Ngày · Người chọn nan · Thời gian · Công suất · Hiệu suất · Tổng số
// thanh · Tổng thể tích · Tỷ lệ loại — trong thẻ: Loại nan · Phân loại · Số lượng
// · Thể tích · Tỷ lệ loại), lưu/sửa/xóa và LIÊN KẾT số lượng sang CHẠY MÁY BÀO THÔ.
// + mục N (04/10/2026): chip "ĐÃ CHỌN THAN HÓA" (batch.sourceChonNanId) + SỬA NHANH
//   2 Ô NGAY TẠI BẢNG (Phân loại · Số lượng) — chỉ người có quyền tab Công Đoạn.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-bao-tho.test.mjs) ────────────
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

const { state, STORAGE_KEY_XUONG2_CHON_NAN, STORAGE_KEY_X2_CHON_NAN_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// ─── Dữ liệu mẫu: 2 LÔ ĐÃ BÀO THÔ (link Bổ Ống) ────────────────
state.xuong2BoOngRecords = [
  { id: 'lot-1', cutId: 'cut-1', materialType: 'Luồng cây xô', supplier: 'Nhà Tế',
    inputOng: 400, klOngLoai: 50, klOngBo: 350, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'lot-2', cutId: 'cut-2', materialType: 'Luồng ống', supplier: 'Nhà Trung',
    inputOng: 300, klOngLoai: 0, klOngBo: 300, date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' }
];
state.xuong2BaoThoRecords = [
  { id: 'bt-1', boOngId: 'lot-1', materialType: 'Luồng cây xô', supplier: 'Nhà Tế', boDate: '2026-09-10',
    date: '2026-09-10', daiText: '1250,1300', rongText: '80', dayText: '12',
    dais: [1250, 1300], rongs: [80], thicks: [12],
    worker: 'Lê Văn Bình', workTime: '07:00–12:00, 13:00 → hết ca', workHours: 9, workHoursHC: 9, workHoursTC: 0,
    createdAt: '2026-09-10T03:00:00.000Z' },
  { id: 'bt-2', boOngId: 'lot-2', materialType: 'Luồng ống', supplier: 'Nhà Trung', boDate: '2026-09-12',
    date: '2026-09-12', daiText: '1300', rongText: '90', dayText: '12,15',
    dais: [1300], rongs: [90], thicks: [12, 15],
    worker: 'Lê Văn Bình', workTime: '07:00–12:00', workHours: 5, workHoursHC: 5, workHoursTC: 0,
    createdAt: '2026-09-12T03:00:00.000Z' }
];
state.xuong2ChonNanThoRecords = [];
state.x2ChonNanRates = {};
// Nhân Sự: vị trí "Chọn Nan Thô" (khớp) — "Chọn nan thô 2" cũng khớp; "Bào Tinh" KHÔNG
state.hrEmployees = [
  { id: 'empA', name: 'Nguyễn Văn A', quitDate: '' },
  { id: 'empCN1', name: 'Trần Thị Lan', quitDate: '' },
  { id: 'empCN2', name: 'Hoàng Văn Nam', quitDate: '' }
];
state.hrPositions = [
  { id: 'pcn', name: 'Chọn Nan Thô', department: 'Xưởng 2' },
  { id: 'ptinh', name: 'Bào Tinh', department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'asg-cn1', date: '2026-09-16', department: 'Xưởng 2', positionId: 'pcn', employeeId: 'empCN1', start: '07:00', end: '12:00' },
  { id: 'asg-cn2', date: '2026-09-16', department: 'Xưởng 2', positionId: 'pcn', employeeId: 'empCN2', start: '13:00', end: '' },
  { id: 'asg-tinh', date: '2026-09-16', department: 'Xưởng 2', positionId: 'ptinh', employeeId: 'empA', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');

// ─── A. THẺ LAUNCHER + MỞ POP-UP ────────────────────────────────
x2.renderXuong2Cards();
check('THẺ: mini card Chọn Nan Thô chưa có lượt → "Chưa chọn"',
  document.getElementById('x2-mini-count-chon-nan-tho').textContent === 'Chưa chọn');
check('THẺ: mở thẻ Chọn Nan Thô trả về true', x2.x2OpenCard('x2-chon-nan-tho-card') === true);
check('THẺ: pop-up bật + bảng Chọn Nan Thô hiện (không còn x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-chon-nan-tho-card').classList.contains('x2-card-hidden'));
check('TIẾN ĐỘ: 2 lô bào thô chưa chọn nan → "2 / 2 lô bào thô chưa chọn"',
  document.getElementById('x2-cn-stock-bar').innerHTML.includes('2 / 2 lô bào thô chưa chọn'));

// ─── B. Ô CHỌN LÔ (theo NGÀY BÀO THÔ) + LOẠI NAN CỦA LÔ ──────────
const selBt = document.getElementById('x2-cn-baotho');
const selSize = document.getElementById('x2-cn-size');
check('Ô CHỌN LÔ: có 2 lô bào thô, nhãn hiện NGÀY BÀO THÔ + loại NL + NCC',
  selBt.innerHTML.includes('Bào thô 10/09/26') && selBt.innerHTML.includes('Bào thô 12/09/26') &&
  selBt.innerHTML.includes('Luồng cây xô') && selBt.innerHTML.includes('NCC Nhà Tế'));
selBt.value = 'bt-1';
x2.updateXuong2ChonNanLinked();
check('LINK: Ngày chọn mặc định theo ngày bào thô = 2026-09-10',
  document.getElementById('x2-cn-date').value === '2026-09-10');
check('LOẠI NAN: danh sách lấy từ kích thước của lô bào thô (2 tổ hợp) — KHÔNG còn "Thêm loại mới" ở đây',
  selSize.innerHTML.includes('1250 × 80 × 12') && selSize.innerHTML.includes('1300 × 80 × 12') &&
  !selSize.innerHTML.includes('__new__') && !selSize.innerHTML.includes('Thêm loại mới'));
check('LÔ ĐÃ BÀO THÔ: có lựa chọn "Thêm loại mới" (nan mua NGOÀI công đoạn) ngay trong ô Lô',
  selBt.innerHTML.includes('value="__new__"') && selBt.innerHTML.includes('Thêm loại mới'));
check('Ô CHỌN LÔ: nhãn GỌN — KHÔNG liệt kê kích thước (đã có ở ô Loại nan)',
  !selBt.innerHTML.includes('1250 × 80 × 12') && !selBt.innerHTML.includes('1300 × 80 × 12'));
check('CHẾ ĐỘ LÔ: đang chọn lô có sẵn → hiện ô Loại nan, ẨN ô Nhà cung cấp + 3 ô kích thước',
  document.getElementById('x2-cn-size-group').style.display === '' &&
  document.getElementById('x2-cn-ncc-group').style.display === 'none' &&
  document.getElementById('x2-cn-new-size-row').style.display === 'none');

// ─── C. LƯU LƯỢT CHỌN NAN (loại nan LẤY TỪ LÔ BÀO THÔ) ───────────
selSize.value = '1250×80×12';
document.getElementById('x2-cn-class').value = 'A';
document.getElementById('x2-cn-qty').value = '1000';
x2.renderX2ChonNanCalc();
const calc1 = document.getElementById('x2-cn-calc').innerHTML;
check('TỰ TÍNH: thể tích 1 thanh 1250×80×12 = 0,0012 m³ + thể tích lượt 1.000 thanh = 1,2000 m³',
  calc1.includes('0.0012 m³') && calc1.includes('1.2000 m³'));
check('TỰ TÍNH: nguồn = "từ lô bào thô" (sẽ CỘNG sang Chạy Máy Bào Thô)',
  calc1.includes('từ lô bào thô'));
document.getElementById('x2-cn-date').value = '2026-09-16';
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
check('LƯU: state có đúng 1 lượt chọn nan', (state.xuong2ChonNanThoRecords || []).length === 1);
const cn1 = state.xuong2ChonNanThoRecords[0];
check('LƯU: link đúng lô bào thô (baothoId = bt-1) + không phải nhập ngoài (external = false)',
  cn1.baothoId === 'bt-1' && cn1.external === false);
check('LƯU: lưu đủ kích thước · phân loại · số lượng · thể tích',
  cn1.dims[0] === 1250 && cn1.dims[1] === 80 && cn1.dims[2] === 12 && cn1.sizeKey === '1250×80×12' &&
  cn1.cls === 'A' && cn1.quantity === 1000 && cn1.volume === 1.2);
check('LƯU: NGƯỜI CHỌN NAN tự động từ Bảng bố trí Nhân Sự (vị trí Chọn Nan Thô)',
  cn1.worker === 'Trần Thị Lan, Hoàng Văn Nam');
check('LỌC VỊ TRÍ: KHÔNG lấy người ở vị trí "Bào Tinh" (Nguyễn Văn A)',
  !String(cn1.worker).includes('Nguyễn Văn A'));
check('LƯU: THỜI GIAN tự động = "07:00–12:00, 13:00 → hết ca" · 9h HC / 0h TC',
  cn1.workTime === '07:00–12:00, 13:00 → hết ca' &&
  cn1.workHours === 9 && cn1.workHoursHC === 9 && cn1.workHoursTC === 0);
check('LƯU: đã ghi localStorage danh sách chọn nan',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_CHON_NAN) || '[]').length === 1);
check('LƯU: ô chọn lô hiện chip "đã chọn 1 lượt"',
  selBt.innerHTML.includes('đã chọn 1 lượt'));
check('LƯU: danh sách loại nan hiện "đã chọn 1.000 thanh" cho cỡ 1250 × 80 × 12',
  selSize.innerHTML.includes('đã chọn 1.000 thanh'));
// GIỮ NGUYÊN lựa chọn sau khi lưu (nhập số lượng liên tiếp không phải chọn lại)
check('LƯU XONG: GIỮ NGUYÊN ô chọn lô (bt-1) · ngày chọn (2026-09-16) · Loại nan (1250×80×12) · Phân loại (A)',
  selBt.value === 'bt-1' && document.getElementById('x2-cn-date').value === '2026-09-16' &&
  selSize.value === '1250×80×12' && document.getElementById('x2-cn-class').value === 'A');
check('LƯU XONG: CHỈ xoá ô Số lượng (để nhập tiếp số lượng khác)',
  document.getElementById('x2-cn-qty').value === '');
check('LƯU XONG: đếm "đã chọn X thanh" của cỡ đó tự cập nhật lên 1.000',
  selSize.innerHTML.includes('đã chọn 1.000 thanh'));

// ─── D. LIÊN KẾT SANG CHẠY MÁY BÀO THÔ ─────────────────────────
check('LIÊN KẾT: thẻ Chạy Máy Bào Thô nhận số lượng 1.000 thanh của lô bt-1',
  (state.xuong2ChonNanThoRecords || []).length === 1 &&
  state.xuong2ChonNanThoRecords.filter(r => r.baothoId === 'bt-1' && !r.external)
    .reduce((s, r) => s + r.quantity, 0) === 1000);
const btQty = state.xuong2ChonNanThoRecords.filter(r => r.baothoId === 'bt-1' && !r.external)
  .reduce((s, r) => s + (Number(r.volume) || 0), 0);
check('LIÊN KẾT: tổng thể tích của lô bào thô = 1,2000 m³', Math.abs(btQty - 1.2) < 1e-9);

// ─── E. THÊM LOẠI MỚI (nan MUA NGOÀI — tự khai NCC + kích thước) ──
selBt.value = '__new__';
x2.updateXuong2ChonNanLinked();
check('THÊM MỚI: chọn ở ô LÔ → ô "Loại nan" ẨN, ô "Nhà cung cấp" HIỆN',
  document.getElementById('x2-cn-size-group').style.display === 'none' &&
  document.getElementById('x2-cn-ncc-group').style.display === '');
check('THÊM MỚI: 3 ô Dài/Rộng/Dày HIỆN ra', document.getElementById('x2-cn-new-size-row').style.display === '');
document.getElementById('x2-cn-dai').value = '900';
document.getElementById('x2-cn-rong').value = '70';
document.getElementById('x2-cn-day').value = '10';
document.getElementById('x2-cn-qty').value = '300';
x2.renderX2ChonNanCalc();
const calc2 = document.getElementById('x2-cn-calc').innerHTML;
check('THÊM MỚI: tự tính thể tích + báo nguồn "ngoài công đoạn" (0,0006 m³/thanh · 0,1890 m³)',
  calc2.includes('0.0006 m³') && calc2.includes('0.1890 m³') && calc2.includes('ngoài công đoạn'));
// CHẶN: nan mua ngoài mà CHƯA ghi Nhà cung cấp
document.getElementById('x2-cn-ncc').value = '';
const cntExt0 = state.xuong2ChonNanThoRecords.length;
document.getElementById('x2-cn-date').value = '2026-09-16';
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
check('THÊM MỚI (CHẶN): chưa ghi Nhà cung cấp → không lưu',
  state.xuong2ChonNanThoRecords.length === cntExt0);
document.getElementById('x2-cn-ncc').value = 'Luồng thanh - NCC';
document.getElementById('x2-cn-class').value = 'B';
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
const cnExt = state.xuong2ChonNanThoRecords.find(r => r.external);
check('THÊM MỚI: lưu lượt external = true + NCC tự khai + kích thước tự nhập (900×70×10), KHÔNG gắn lô bào thô',
  !!cnExt && cnExt.baothoId === '' && cnExt.supplier === 'Luồng thanh - NCC' &&
  cnExt.dims[0] === 900 && cnExt.cls === 'B' && cnExt.quantity === 300);
check('LƯU XONG (thêm mới): GIỮ NGUYÊN chế độ "Thêm loại mới" + NCC + 3 ô kích thước để nhập tiếp',
  selBt.value === '__new__' && document.getElementById('x2-cn-ncc').value === 'Luồng thanh - NCC' &&
  document.getElementById('x2-cn-ncc-group').style.display === '' &&
  document.getElementById('x2-cn-dai').value === '900' &&
  document.getElementById('x2-cn-rong').value === '70' && document.getElementById('x2-cn-day').value === '10' &&
  document.getElementById('x2-cn-new-size-row').style.display === '');

// ─── F. BẢNG DỮ LIỆU: THẺ NGÀY (đầu thẻ chung + nhánh trong thẻ) ──
const dayHtml = document.getElementById('x2-cn-day-cards').innerHTML;
check('THẺ NGÀY: đầu thẻ hiển thị Ngày 16/09/26 (dd/mm/yy)',
  dayHtml.includes('x2-day-head') && dayHtml.includes('16/09/26'));
check('THẺ NGÀY: NGƯỜI CHỌN NAN (người chính + giờ) và "+1 người khác"',
  dayHtml.includes('Trần Thị Lan') && dayHtml.includes('07:00–12:00') &&
  dayHtml.includes('+1 người khác') && dayHtml.includes('Hoàng Văn Nam'));
check('THẺ NGÀY: THỜI GIAN tách badge HC/TC = "9h HC" / "0h TC"',
  dayHtml.includes('9h HC') && dayHtml.includes('0h TC'));
check('THẺ NGÀY: TỔNG SỐ THANH = 1.000 thanh (KHÔNG tính 300 thanh nhập ngoài công đoạn)',
  /Tổng thanh:\s*<strong[^>]*>1\.000</.test(dayHtml));
check('THẺ NGÀY: TỔNG THỂ TÍCH = 1,2000 m³',
  /Tổng thể tích:\s*<strong[^>]*>1\.2000 m³</.test(dayHtml));
check('THẺ NGÀY: TỶ LỆ LOẠI = 0% (chưa có lượt "Loại hẳn")',
  dayHtml.includes('Tỷ lệ loại: <strong>0%</strong>'));
check('THẺ NGÀY: CÔNG SUẤT = 1.000 thanh ÷ 9 giờ = 111 thanh/h',
  dayHtml.includes('111 thanh/h'));
check('TRONG THẺ: dòng nhánh có chip Loại nan + chip phân loại A / B',
  dayHtml.includes('1250 × 80 × 12') && dayHtml.includes('x2-nan-cls-A') &&
  dayHtml.includes('x2-nan-cls-B'));
check('TRONG THẺ: lượt "nhập ngoài công đoạn" có chip cảnh báo + kích thước 900 × 70 × 10 + NCC tự khai',
  dayHtml.includes('ngoài công đoạn') && dayHtml.includes('900 × 70 × 10') &&
  dayHtml.includes('Nan mua ngoài · NCC Luồng thanh - NCC'));
check('TRONG THẺ: cột Số lượng + Thể tích của các nhánh (1.000/1,2000 · 300/0,1890)',
  dayHtml.includes('1.000') && dayHtml.includes('1.2000') &&
  dayHtml.includes('300') && dayHtml.includes('0.1890'));
check('BẢNG: đếm lịch sử hiển thị "2 lượt chọn nan"',
  document.getElementById('x2-cn-table-count').textContent === '2 lượt chọn nan');
check('THỐNG KÊ: có 1.000 thanh cộng sang Bào Thô + 300 thanh nhập ngoài',
  document.getElementById('x2-cn-stats').innerHTML.includes('1.000') &&
  document.getElementById('x2-cn-stats').innerHTML.includes('300'));

// ─── G. BẢNG PHỤ: ĐỊNH MỨC CÔNG SUẤT CHỌN NAN (thanh/h) theo tháng ──
document.getElementById('x2-cn-rate-month').value = '2026-09';
document.getElementById('x2-cn-rate-value').value = '700';
x2.handleX2ChonNanRateSave();
check('ĐỊNH MỨC: lưu tháng 9 = 700 thanh/h vào state', state.x2ChonNanRates['2026-09'] === 700);
check('ĐỊNH MỨC: đã ghi localStorage (key riêng của Chọn Nan)',
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_CHON_NAN_RATE) || '{}')['2026-09'] === 700);
check('ĐỊNH MỨC: chip tháng đã đặt "T9 = 700 thanh/h"',
  document.getElementById('x2-cn-rate-chips').innerHTML.includes('T9 = 700 thanh/h'));
check('HIỆU SUẤT: 111 thanh/h ÷ 700 thanh/h = 15,9%',
  document.getElementById('x2-cn-day-cards').innerHTML.includes('15,9%'));


// ─── H. PHÂN LOẠI "LOẠI HẲN" → TỶ LỆ LOẠI THEO CỠ ───────────────
selBt.value = 'bt-1';
x2.updateXuong2ChonNanLinked();
selSize.value = '1250×80×12';
document.getElementById('x2-cn-class').value = 'reject';
document.getElementById('x2-cn-qty').value = '250';
document.getElementById('x2-cn-date').value = '2026-09-16';
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
check('LOẠI HẲN: lưu được lượt phân loại "Loại hẳn" (cls = reject)',
  state.xuong2ChonNanThoRecords.some(r => r.cls === 'reject' && r.quantity === 250));
const dayHtml2 = document.getElementById('x2-cn-day-cards').innerHTML;
check('TỶ LỆ LOẠI (cỡ 1250×80×12): 250 ÷ 1.250 = 20,0% (hiện đỏ cảnh báo)',
  dayHtml2.includes('20%') && dayHtml2.includes('#b45309'));
check('TỔNG THANH của ngày = 1.000 + 250 = 1.250 (vẫn không tính 300 thanh ngoài công đoạn)',
  /Tổng thanh:\s*<strong[^>]*>1\.250</.test(dayHtml2));
check('TỔNG THỂ TÍCH của ngày = 1,2000 + 0,3000 = 1,5000 m³',
  /Tổng thể tích:\s*<strong[^>]*>1\.5000 m³</.test(dayHtml2));
check('TỶ LỆ LOẠI của ngày = 250 ÷ 1.250 = 20% (Thẻ ngày)',
  dayHtml2.includes('Tỷ lệ loại: <strong>20%</strong>'));
check('THỐNG KÊ: tỷ lệ loại hẳn = 20% + số thanh nhập ngoài 300',
  document.getElementById('x2-cn-stats').innerHTML.includes('20%') &&
  document.getElementById('x2-cn-stats').innerHTML.includes('300'));

// ─── I. SỬA LƯỢT CHỌN NAN ───────────────────────────────────────
const cnRej = state.xuong2ChonNanThoRecords.find(r => r.cls === 'reject');
x2.editXuong2ChonNan(cnRej.id);
check('SỬA: vào chế độ sửa (x2ChonNanEditId = id)', state.x2ChonNanEditId === cnRej.id);
check('SỬA: banner "Đang sửa lượt chọn nan" hiện lên',
  document.getElementById('x2-cn-edit-banner').style.display === '');
check('SỬA: nạp lại lô · loại nan · phân loại · số lượng',
  selBt.value === 'bt-1' && selSize.value === '1250×80×12' &&
  document.getElementById('x2-cn-class').value === 'reject' &&
  document.getElementById('x2-cn-qty').value === '250');
document.getElementById('x2-cn-qty').value = '125';
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
check('SỬA: số lượng 250 → 125 (tỷ lệ loại cỡ 1250×80×12 còn 125/1.125 = 11,1%)',
  cnRej.quantity === 125 && Math.abs(cnRej.volume - 0.15) < 1e-9 &&
  document.getElementById('x2-cn-day-cards').innerHTML.includes('11,1%'));
check('SỬA: sau lưu về lại chế độ ghi mới', state.x2ChonNanEditId === null);

// SỬA LƯỢT NAN MUA NGOÀI: form quay lại chế độ "Thêm loại mới" + nạp lại NCC
x2.editXuong2ChonNan(cnExt.id);
check('SỬA (nan mua ngoài): ô Lô về "Thêm loại mới" + nạp lại NCC + hiện ô Nhà cung cấp + ẩn ô Loại nan',
  selBt.value === '__new__' && document.getElementById('x2-cn-ncc').value === 'Luồng thanh - NCC' &&
  document.getElementById('x2-cn-ncc-group').style.display === '' &&
  document.getElementById('x2-cn-size-group').style.display === 'none' &&
  document.getElementById('x2-cn-dai').value === '900');
x2.resetXuong2ChonNanForm();

// ─── J. CHẶN DỮ LIỆU KHÔNG HỢP LỆ ──────────────────────────────
const cntBefore = state.xuong2ChonNanThoRecords.length;
document.getElementById('x2-cn-qty').value = '0';
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
check('CHẶN: số lượng = 0 → không lưu', state.xuong2ChonNanThoRecords.length === cntBefore);
document.getElementById('x2-cn-qty').value = '100';
selBt.value = '__new__';
x2.updateXuong2ChonNanLinked();
document.getElementById('x2-cn-ncc').value = 'NCC Test';
['x2-cn-dai', 'x2-cn-rong', 'x2-cn-day'].forEach(id => { document.getElementById(id).value = ''; });
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
check('CHẶN: "Thêm loại mới" mà thiếu Dài/Rộng/Dày → không lưu',
  state.xuong2ChonNanThoRecords.length === cntBefore);
x2.resetXuong2ChonNanForm();
check('RESET: về chế độ ghi mới + phân loại A + NCC & 3 ô kích thước trống + về chế độ LÔ có sẵn',
  state.x2ChonNanEditId === null && document.getElementById('x2-cn-class').value === 'A' &&
  document.getElementById('x2-cn-dai').value === '' &&
  document.getElementById('x2-cn-ncc').value === '' &&
  document.getElementById('x2-cn-ncc-group').style.display === 'none' &&
  document.getElementById('x2-cn-size-group').style.display === '');

// ─── K. XÓA LƯỢT CHỌN NAN (+ tombstone) ─────────────────────────
x2.deleteXuong2ChonNan(cnRej.id);
check('XÓA: đã xóa khỏi danh sách',
  !(state.xuong2ChonNanThoRecords || []).some(r => r.id === cnRej.id));
check('XÓA: đã ghi tombstone (xuong2ChonNanThoRecords)',
  !!(state.deletedIds && state.deletedIds.xuong2ChonNanThoRecords && state.deletedIds.xuong2ChonNanThoRecords[cnRej.id]));
check('XÓA: tỷ lệ loại của ngày về 0% (tổng thể tích 1,2000 + 0,1890)',
  document.getElementById('x2-cn-day-cards').innerHTML.includes('Tỷ lệ loại: <strong>0%</strong>') &&
  document.getElementById('x2-cn-day-cards').innerHTML.includes('1.3890') === false);
check('XÓA: mini card = "2 lượt · 1.000 thanh" (lượt nhập ngoài không cộng số lượng)',
  document.getElementById('x2-mini-count-chon-nan-tho').textContent === '2 lượt · 1.000 thanh');

// ─── L. THU GỌN BẢNG + CẤU TRÚC index.html ──────────────────────
x2.toggleX2ChonNanTable();
check('BẢNG: nút thu gọn hoạt động (wrap có class x2-cut-collapsed)',
  document.getElementById('x2-cn-table-wrap').classList.contains('x2-cut-collapsed'));
x2.toggleX2ChonNanTable();
check('BẢNG: mở rộng lại (bỏ class x2-cut-collapsed)',
  !document.getElementById('x2-cn-table-wrap').classList.contains('x2-cut-collapsed'));
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): form có lô bào thô + ngày + loại nan + phân loại + số lượng + 3 ô thêm mới',
  idxHtml.includes('"x2-cn-baotho"') && idxHtml.includes('"x2-cn-date"') &&
  idxHtml.includes('"x2-cn-size"') && idxHtml.includes('"x2-cn-class"') &&
  idxHtml.includes('"x2-cn-qty"') && idxHtml.includes('x2-cn-new-size-row') &&
  idxHtml.includes('"x2-cn-dai"') && idxHtml.includes('"x2-cn-rong"') && idxHtml.includes('"x2-cn-day"'));
check('CẤU TRÚC (index.html): ô "Nhà cung cấp" (nan mua ngoài) gợi ý sẵn "Luồng thanh - NCC" + datalist',
  idxHtml.includes('id="x2-cn-ncc"') && idxHtml.includes('placeholder="Luồng thanh - NCC"') &&
  idxHtml.includes('id="x2-cn-ncc-list"') && idxHtml.includes('id="x2-cn-ncc-group"') &&
  idxHtml.includes('id="x2-cn-size-group"'));
check('CẤU TRÚC (index.html): 4 mức phân loại A / A1 / B / Loại hẳn trong ô chọn',
  idxHtml.includes('>A1 – Ít bọng cật<') && idxHtml.includes('>B – Nhiều bọng cật<') &&
  idxHtml.includes('>Loại hẳn<'));
check('CẤU TRÚC (index.html): bảng phụ định mức công suất chọn nan theo tháng (thanh/h)',
  idxHtml.includes('x2-cn-rate-month') && idxHtml.includes('btn-x2-cn-rate-save') &&
  idxHtml.includes('id="x2-cn-rate-bar"'));
check('CẤU TRÚC (index.html): bảng ghi dữ liệu (thẻ ngày) + nút thu gọn',
  idxHtml.includes('x2-cn-day-cards') && idxHtml.includes('btn-toggle-x2cn-table'));
check('CẤU TRÚC (index.html): thẻ Chọn Nan Thô KHÔNG còn ghi chú "Chức năng đang được bổ sung"',
  !idxHtml.includes('Bảng ghi nhận chọn nan thô'));

// ─── M. LIÊN KẾT ĐẦU-CUỐI SANG THẺ CHẠY MÁY BÀO THÔ ────────────
x2.renderX2BaoThoCard();
const btHtml = document.getElementById('x2-bt-day-cards').innerHTML;
check('LIÊN KẾT: thẻ Chạy Máy Bào Thô hiện SỐ LƯỢNG 1.000 thanh (từ công đoạn Chọn Nan Thô)',
  btHtml.includes('1.000') && btHtml.includes('thanh'));
check('LIÊN KẾT: thể tích quy đổi của lô bào thô = 1,2000 m³ (KHÔNG gồm lượt nhập ngoài 0,1890)',
  btHtml.includes('1.2000') && !btHtml.includes('0.1890'));
check('LIÊN KẾT: công suất của lô bào thô = 1.000 thanh ÷ 9 giờ = 111 thanh/h',
  btHtml.includes('111 thanh/h'));
check('LIÊN KẾT: mini card Chạy Máy Bào Thô = "2 lượt · 1.000 thanh"',
  document.getElementById('x2-mini-count-bao-tho').textContent === '2 lượt · 1.000 thanh');
// Xóa hết lượt chọn nan → thẻ Bào Thô quay lại trạng thái chờ (không giữ số cũ)
state.xuong2ChonNanThoRecords = [];
x2.renderX2BaoThoCard();
check('LIÊN KẾT: xóa hết lượt chọn nan → thẻ Bào Thô quay lại "Chờ Chọn Nan Thô"',
  document.getElementById('x2-bt-day-cards').innerHTML.includes('Chờ Chọn Nan Thô'));

// ─── N. THÔNG BÁO "ĐÃ CHỌN THAN HÓA" + SỬA NHANH 2 Ô TẠI BẢNG (04/10/2026) ──
// (Section M đã xóa hết lượt chọn nan → tự seed lại 2 thẻ nan + 2 lô gắn sourceChonNanId)
const cnSayA = { id: 'x2cn-th-a', baothoId: 'bt-1', date: '2026-09-18', dims: [1250, 80, 12],
  sizeKey: '1250×80×12', cls: 'A', quantity: 1000, unitVol: 0.0012, volume: 1.2,
  createdAt: '2026-09-18T02:00:00.000Z' };
const cnSayB = { id: 'x2cn-th-b', baothoId: 'bt-1', date: '2026-09-18', dims: [1300, 90, 12],
  sizeKey: '1300×90×12', cls: 'B', quantity: 300, unitVol: 0.001404, volume: 0.4212,
  createdAt: '2026-09-18T03:00:00.000Z' };
state.xuong2ChonNanThoRecords = [cnSayA, cnSayB];
state.batches = [
  { id: 'b-th-1', code: '260919-01', stage: 'say1', date: '2026-09-19', location: 'LS5',
    quantity: 500, sourceChonNanId: 'x2cn-th-a' },
  { id: 'b-th-2', code: '260920-01', stage: 'say2', date: '2026-09-20', location: 'LS9',
    quantity: 300, sourceChonNanId: 'x2cn-th-a' }
];
x2.renderX2ChonNanTable();
const thHtml = () => document.getElementById('x2-cn-day-cards').innerHTML;
const cnRec = id => state.xuong2ChonNanThoRecords.find(r => r.id === id);

check('THAN HÓA: nanSay1UseOf đếm đúng 2 lô · 800 thanh đã dùng',
  (() => { const u = x2.nanSay1UseOf('x2cn-th-a'); return u.count === 2 && u.used === 800; })());
check('THAN HÓA: dòng đã có lô → chip "ĐÃ CHỌN THAN HÓA 800/1.000 thanh · còn 200"',
  thHtml().includes('x2-nan-say1') && thHtml().includes('Đã chọn than hóa 800/1.000 thanh · còn 200'));
check('THAN HÓA: tooltip liệt kê mã lô + ngày + vị trí',
  thHtml().includes('260919-01') && thHtml().includes('19/09/26') && thHtml().includes('LS5'));
check('THAN HÓA: CHỈ dòng đã có lô mới hiện chip (dòng 300 thanh không chip)',
  (thHtml().match(/class="x2-nan-say1/g) || []).length === 1);
check('SỬA NHANH (có quyền): bảng có 2 SELECT phân loại + 2 ô NHẬP số lượng',
  (thHtml().match(/data-x2-cn-cls=/g) || []).length === 2 &&
  (thHtml().match(/data-x2-cn-qty=/g) || []).length === 2);

check('SỬA NHANH PHÂN LOẠI: đổi được B → A1 ngay tại bảng',
  x2.onChonNanInlineEdit({ target: { getAttribute: k => (k === 'data-x2-cn-cls' ? 'x2cn-th-b' : null), value: 'A1' } }) === true &&
  cnRec('x2cn-th-b').cls === 'A1');
check('SỬA NHANH PHÂN LOẠI: giá trị không hợp lệ → từ chối (giữ A1)',
  x2.onChonNanInlineEdit({ target: { getAttribute: k => (k === 'data-x2-cn-cls' ? 'x2cn-th-b' : null), value: 'Z' } }) === false &&
  cnRec('x2cn-th-b').cls === 'A1');

check('SỬA NHANH SỐ LƯỢNG: 1000 → 700 được LƯU IM LẶNG (không chặn dù đã than hóa 800)',
  x2.onChonNanInlineEdit({ target: { getAttribute: k => (k === 'data-x2-cn-qty' ? 'x2cn-th-a' : null), value: '700' } }) === true &&
  cnRec('x2cn-th-a').quantity === 700);
check('SỬA NHANH SỐ LƯỢNG: tính lại thể tích 700 × 0,0012 = 0,8400 m³ + updatedAt + ghi máy',
  Math.abs(cnRec('x2cn-th-a').volume - 0.84) < 1e-9 &&
  !!cnRec('x2cn-th-a').updatedAt &&
  JSON.parse(localStorage.getItem('bamboo_tracker_xuong2_chon_nan_tho_v1') || '[]')
    .some(r => r.id === 'x2cn-th-a' && r.quantity === 700));
check('THAN HÓA: sau khi sửa số lượng → chip "ĐÃ THAN HÓA HẾT · 800 thanh" (còn lại kẹp 0)',
  thHtml().includes('Đã than hóa hết · 800 thanh') && thHtml().includes('say1-full'));

check('SỬA NHANH SỐ LƯỢNG: nhập 0 → BỊ TỪ CHỐI, record giữ nguyên 700',
  x2.onChonNanInlineEdit({ target: { getAttribute: k => (k === 'data-x2-cn-qty' ? 'x2cn-th-a' : null), value: '0' } }) === false &&
  cnRec('x2cn-th-a').quantity === 700);
check('SỬA NHANH: event không phải ô sửa nhanh → bỏ qua (false)',
  x2.onChonNanInlineEdit({ target: { getAttribute: () => null } }) === false &&
  x2.onChonNanInlineEdit({}) === false);

const userAdmin = state.currentUser;
state.currentUser = { username: 'view', role: 'viewer', editTabs: [], allowAdvanced: false };
x2.renderX2ChonNanTable();
check('QUYỀN (viewer): bảng chỉ có chip/số TĨNH — KHÔNG có ô sửa nhanh',
  !thHtml().includes('data-x2-cn-qty=') && !thHtml().includes('data-x2-cn-cls=') &&
  thHtml().includes('x2-nan-cls'));
check('QUYỀN (viewer): sửa nhanh BỊ TỪ CHỐI (số lượng giữ 700)',
  x2.onChonNanInlineEdit({ target: { getAttribute: k => (k === 'data-x2-cn-qty' ? 'x2cn-th-a' : null), value: '111' } }) === false &&
  cnRec('x2cn-th-a').quantity === 700);
state.currentUser = userAdmin;
x2.renderX2ChonNanTable();
check('QUYỀN (admin): bảng trở lại 2 ô sửa nhanh mỗi dòng',
  (thHtml().match(/data-x2-cn-qty=/g) || []).length === 2 &&
  (thHtml().match(/data-x2-cn-cls=/g) || []).length === 2);

const jsX2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const jsEvSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const cssX2Src = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('CẤU TRÚC (js/xuong2.js): helper + 2 ô inline + handler + import canEditTab + export',
  jsX2Src.includes('function nanSay1UseOf') && jsX2Src.includes('function chonNanSay1ChipHtml') &&
  jsX2Src.includes('function chonNanClsCellHtml') && jsX2Src.includes('function chonNanQtyCellHtml') &&
  jsX2Src.includes('function onChonNanInlineEdit') &&
  jsX2Src.includes("from './permissions.js'") &&
  jsX2Src.includes('  nanSay1UseOf,') && jsX2Src.includes('  onChonNanInlineEdit,'));
check('CẤU TRÚC (js/events.js): uỷ nhiệm change trên #x2-cn-day-cards + import hàm mới',
  jsEvSrc.includes("safeOn('x2-cn-day-cards', 'change', onChonNanInlineEdit)") &&
  jsEvSrc.includes('onChonNanInlineEdit, nanSay1UseOf,'));
check('CẤU TRÚC (styles.css): chip x2-nan-say1 (+ say1-full) + 2 ô inline + bản mobile 16px',
  cssX2Src.includes('.x2-nan-say1 {') && cssX2Src.includes('.x2-nan-say1.say1-full {') &&
  cssX2Src.includes('.x2-cn-inline-cls {') && cssX2Src.includes('.x2-cn-inline-qty {') &&
  cssX2Src.includes('font-size: 16px;'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

