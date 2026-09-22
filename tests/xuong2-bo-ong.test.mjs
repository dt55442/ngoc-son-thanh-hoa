// tests/xuong2-bo-ong.test.mjs — Kiểm thử VỊ TRÍ "BỔ ỐNG" (Xưởng 2 — tab Công Đoạn):
// form nhập (chọn lô ống từ Cắt Chọn · Ngày bổ · KL ống loại → KL ống bổ tự tính),
// bảng phụ ĐỊNH MỨC CÔNG SUẤT BỔ ỐNG theo tháng (kg/h), bảng ghi dữ liệu dạng
// THẺ NGÀY (đầu thẻ: Ngày · Người bổ · Giờ bổ HC/TC · Công suất thực tế ·
// Hiệu suất — trong thẻ: từng nhánh với KL ống bổ / KL ống loại),
// lưu / sửa / xóa lượt bổ ống, đếm tồn ống chờ bổ trên mini card.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-cut.test.mjs) ────────────────
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

const { state, STORAGE_KEY_X2_BO_ONG_RATE, STORAGE_KEY_XUONG2_BO_ONG } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu mẫu: nguyên liệu Xưởng 2 → lô ống của CẮT CHỌN ──────
state.materialRecords = [
  { id: 'mat-a', type: 'Luồng cây xô', supplier: 'Nhà Tế',   location: 'xuong-2', inputIndex: 1200, outputIndex: 200, weight: 1000, date: '2026-09-08', createdAt: '2026-09-08T02:00:00.000Z' },
  { id: 'mat-b', type: 'Luồng ống',    supplier: 'Nhà Trung', location: 'xuong-2', inputIndex: 800,  outputIndex: 0,   weight: 800,  date: '2026-09-09', createdAt: '2026-09-09T02:00:00.000Z' }
];
// 3 lượt Cắt Chọn → 3 LÔ ỐNG (cut-3 có KL ống = 0 → không đưa vào ô chọn bổ)
state.xuong2CutRecords = [
  { id: 'cut-1', materialId: 'mat-a', materialType: 'Luồng cây xô', supplier: 'Nhà Tế',   date: '2026-09-10', inputWeight: 1000, klOngLuong: 400, klCuiDot: 100, klCayLoai: 150, createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'cut-2', materialId: 'mat-b', materialType: 'Luồng ống',    supplier: 'Nhà Trung', date: '2026-09-11', inputWeight: 800,  klOngLuong: 300, klCuiDot: 50,  klCayLoai: 100, createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'cut-3', materialId: 'mat-b', materialType: 'Luồng tre đốt', supplier: 'Nhà Trung', date: '2026-09-12', inputWeight: 200, klOngLuong: 0, klCuiDot: 100, klCayLoai: 100, createdAt: '2026-09-12T02:00:00.000Z' }
];
state.xuong2BoOngRecords = [];
state.x2BoOngRates = {};
// Nhân Sự: vị trí "Bổ Ống" + "Bổ ống 2" (đều khớp mềm) — KHÔNG lấy người Cắt Chọn
state.hrEmployees = [
  { id: 'empA', name: 'Nguyễn Văn A', quitDate: '' },
  { id: 'empB', name: 'Nguyễn Văn B', quitDate: '' },
  { id: 'empC', name: 'Trần Văn C', quitDate: '' }
];
state.hrPositions = [
  { id: 'pcat', name: 'Cắt Chọn', department: 'Xưởng 2' },
  { id: 'pbo',  name: 'Bổ Ống',   department: 'Xưởng 2' },
  { id: 'pbo2', name: 'Bổ ống 2', department: 'Xưởng 2' },
  { id: 'pcv',  name: 'Cắt Ván',  department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'asg-cat', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pcat', employeeId: 'empA', start: '07:00', end: '12:00' },
  { id: 'asg-bo1', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pbo',  employeeId: 'empB', start: '07:00', end: '12:00' },
  { id: 'asg-bo2', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pbo2', employeeId: 'empC', start: '13:00', end: '' }
];

const x2 = await import('../js/xuong2.js');

// ─── A. THẺ LAUNCHER: TỒN ỐNG CHỜ BỔ + MỞ/ĐÓNG POP-UP ───────────
x2.renderXuong2Cards();
check('THẺ: mini card Bổ Ống hiện TỒN ỐNG CHỜ BỔ = "Tồn 700 kg" (400 + 300)',
  document.getElementById('x2-mini-count-bo-ong').textContent === 'Tồn 700 kg');
check('THẺ: thẻ Bổ Ống KHÔNG còn chip "Sắp có" (đã có chức năng)',
  !document.getElementById('x2-mini-count-bo-ong').classList.contains('x2-count-soon'));
check('THẺ: mở thẻ Bổ Ống trả về true', x2.x2OpenCard('x2-bo-ong-card') === true);
check('THẺ: pop-up bật + bảng Bổ Ống hiện (không còn x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bo-ong-card').classList.contains('x2-card-hidden'));

// ─── B. THANH TỒN + Ô CHỌN LÔ ỐNG (từ Cắt Chọn) ─────────────────
check('TỒN: 1 ô tóm tắt "2 lô · 700 kg" chờ bổ',
  document.getElementById('x2-ong-stock-bar').innerHTML.includes('2 lô · 700 kg'));
const selOng = document.getElementById('x2-bo-ong-cut');
check('Ô CHỌN: có lô ống "Luồng cây xô" (từ Cắt Chọn) + "Luồng ống"',
  selOng.innerHTML.includes('Luồng cây xô') && selOng.innerHTML.includes('Luồng ống'));
check('Ô CHỌN: lô có KL ống = 0 KHÔNG hiện (Luồng tre đốt)',
  !selOng.innerHTML.includes('Luồng tre đốt'));
check('Ô CHỌN: hiện NCC + ngày cắt + KL ống của lô',
  selOng.innerHTML.includes('Nhà Tế') && selOng.innerHTML.includes('11/09/26') && selOng.innerHTML.includes('300 kg'));


// ─── C. Ô SỐ LƯỢNG BỔ + NGÀY BỔ MẶC ĐỊNH + Ô TỰ TÍNH ────────────
// Đọc 1 ô trong khối tự tính (giá trị nằm ngay sau nhãn, có thể kèm thuộc tính)
const calcVal = (label) => {
  const html = document.getElementById('x2-bo-ong-calc').innerHTML;
  const m = new RegExp(label + ':<\\/span>\\s*<strong[^>]*>([^<]+)<').exec(html);
  return m ? m[1].trim() : '';
};
selOng.value = 'cut-1';
x2.updateXuong2BoOngLinked(true);
check('LINK: Ngày bổ mặc định theo ngày cắt/chọn = 2026-09-10',
  document.getElementById('x2-bo-ong-date').value === '2026-09-10');
check('SỐ LƯỢNG BỔ: tự điền sẵn PHẦN CÒN LẠI của lô (400 kg) — bổ hết lô thì không phải sửa',
  document.getElementById('x2-bo-ong-bo').value === '400');
check('TỰ TÍNH: còn lại của lô 400 · ống bổ đạt 400 (chưa nhập loại) · còn sau lượt 0',
  calcVal('Còn lại của lô') === '400 kg' && calcVal('Ống bổ đạt') === '400 kg' &&
  calcVal('Còn sau lượt') === '0 kg');
document.getElementById('x2-bo-ong-loai').value = '50';
x2.updateXuong2BoOngLinked(false);
check('TỰ TÍNH: KL ống loại 50 → ống bổ đạt = 400 − 50 = 350 kg',
  calcVal('Ống bổ đạt') === '350 kg');

// ─── D. BẢNG PHỤ: ĐỊNH MỨC CÔNG SUẤT BỔ ỐNG THEO THÁNG (kg/h) ───
check('ĐỊNH MỨC: thanh định mức có ô chọn tháng (kg/h)',
  document.getElementById('x2-ong-rate-month').innerHTML.includes('Tháng '));
document.getElementById('x2-ong-rate-month').value = '2026-09';
document.getElementById('x2-ong-rate-value').value = '2500';
x2.handleX2BoOngRateSave();
check('ĐỊNH MỨC: lưu tháng 9 = 2500 kg/h vào state',
  state.x2BoOngRates['2026-09'] === 2500);
check('ĐỊNH MỨC: đã ghi localStorage (key riêng của Bổ Ống)',
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BO_ONG_RATE) || '{}')['2026-09'] === 2500);
check('ĐỊNH MỨC: chip tháng đã đặt "T9 = 2.500 kg/h" (bấm để nạp lại vào ô nhập)',
  document.getElementById('x2-ong-rate-chips').innerHTML.includes('T9 = 2.500 kg/h'));
// Đổi tháng CHƯA đặt (tháng 10 có lượt bổ nhưng chưa đặt định mức) → ô nhập trống
state.xuong2BoOngRecords.push({ id: 'tmp-1', cutId: 'cut-2', date: '2026-10-05', inputOng: 300, klOngLoai: 0, klOngBo: 300, createdAt: '2026-10-05T02:00:00.000Z' });
document.getElementById('x2-ong-rate-month').value = '2026-10';
x2.renderX2BoOngRateBar();
check('ĐỊNH MỨC: tháng chưa đặt (10/2026) → ô nhập trống', document.getElementById('x2-ong-rate-value').value === '');
document.getElementById('x2-ong-rate-month').value = '2026-09';
x2.renderX2BoOngRateBar();
check('ĐỊNH MỨC: quay lại tháng 9 → ô nhập nạp lại 2500', String(document.getElementById('x2-ong-rate-value').value) === '2500');
state.xuong2BoOngRecords = []; // dọn lượt tạm dùng cho kiểm thử tháng

// ─── E. LƯU LƯỢT BỔ ỐNG ─────────────────────────────────────────
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('LƯU: state có đúng 1 lượt bổ ống', (state.xuong2BoOngRecords || []).length === 1);
const rec = state.xuong2BoOngRecords[0];
check('LƯU: link đúng lô ống của Cắt Chọn (cutId = cut-1)', rec.cutId === 'cut-1');
check('LƯU: KL ống đầu vào = 400 · ống loại = 50 · ống bổ TỰ TÍNH = 350',
  rec.inputOng === 400 && rec.klOngLoai === 50 && rec.klOngBo === 350);
check('LƯU: snapshot lô (loại NL · NCC · ngày cắt) theo lô Cắt Chọn',
  rec.materialType === 'Luồng cây xô' && rec.supplier === 'Nhà Tế' && rec.cutDate === '2026-09-10');
check('LƯU: NGƯỜI BỔ tự động từ Bảng bố trí Nhân Sự (2 người ở vị trí Bổ Ống)',
  rec.worker === 'Nguyễn Văn B, Trần Văn C');
check('LỌC VỊ TRÍ: KHÔNG lấy người "Cắt Chọn" (Nguyễn Văn A) vào lượt bổ ống',
  !String(rec.worker).includes('Nguyễn Văn A'));
check('LƯU: THỜI GIAN BỔ tự động = "07:00–12:00, 13:00 → hết ca"',
  rec.workTime === '07:00–12:00, 13:00 → hết ca');
check('LƯU: SỐ GIỜ BỔ tách HC/TC = 9h HC / 0h TC (trừ nghỉ trưa, giờ ra trống = hết ca)',
  rec.workHours === 9 && rec.workHoursHC === 9 && rec.workHoursTC === 0);
check('LƯU: form reset về chế độ ghi mới (x2BoOngEditId = null)', state.x2BoOngEditId === null);
check('LƯU: đã ghi localStorage danh sách bổ ống',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BO_ONG) || '[]').length === 1);


// ─── F. BẢNG GHI DỮ LIỆU: THẺ NGÀY (đầu thẻ chung + nhánh trong thẻ) ──
const dayHtml = document.getElementById('x2-ong-day-cards').innerHTML;
check('THẺ NGÀY: đầu thẻ hiển thị Ngày 10/09/26 (dd/mm/yy)',
  dayHtml.includes('x2-day-head') && dayHtml.includes('10/09/26'));
check('THẺ NGÀY: NGƯỜI BỔ (người chính + giờ) và "+1 người khác" (rê chuột xem đủ)',
  dayHtml.includes('Nguyễn Văn B') && dayHtml.includes('07:00–12:00') &&
  dayHtml.includes('+1 người khác') && dayHtml.includes('Trần Văn C'));
check('THẺ NGÀY: THỜI GIAN BỔ tách badge HC/TC = "9h HC" / "0h TC"',
  dayHtml.includes('9h HC') && dayHtml.includes('0h TC') && dayHtml.includes('Giờ bổ:'));
check('THẺ NGÀY: CÔNG SUẤT THỰC TẾ = 400 ÷ 9 giờ = "44,44 kg/h"',
  dayHtml.includes('44,44 kg/h'));
check('THẺ NGÀY: HIỆU SUẤT = 44,44 ÷ 2500 (định mức tháng 9) = "1,8%"',
  dayHtml.includes('1,8%'));
check('TRONG THẺ: cột riêng từng nhánh KL ống bổ (350) + KL ống loại (50) + Tỷ lệ đạt 87,5%',
  dayHtml.includes('KL ống bổ') && dayHtml.includes('KL ống loại') &&
  dayHtml.includes('350') && dayHtml.includes('50') && dayHtml.includes('87,5%'));
check('TRONG THẺ: dòng nhánh nêu nguồn lô ống (NCC + ngày cắt từ Cắt Chọn)',
  dayHtml.includes('NCC Nhà Tế') && dayHtml.includes('cắt 10/09/26'));
check('BẢNG: đếm lịch sử hiển thị "1 lượt đã bổ ống"',
  document.getElementById('x2-ong-table-count').textContent === '1 lượt đã bổ ống');
check('THỐNG KÊ: tổng KL ống đem bổ 400 · ống bổ 350 · ống loại 50',
  document.getElementById('x2-ong-stats').innerHTML.includes('400') &&
  document.getElementById('x2-ong-stats').innerHTML.includes('350') &&
  document.getElementById('x2-ong-stats').innerHTML.includes('50'));
check('LỌC: lô ống đã bổ (cut-1) tự ẩn khỏi ô chọn', !selOng.innerHTML.includes('Luồng cây xô'));
check('TỒN: sau bổ còn "1 lô · 300 kg" chờ bổ + mini card "Tồn 300 kg"',
  document.getElementById('x2-ong-stock-bar').innerHTML.includes('1 lô · 300 kg') &&
  document.getElementById('x2-mini-count-bo-ong').textContent === 'Tồn 300 kg');

// ─── G. CHƯA ĐẶT ĐỊNH MỨC THÁNG → HIỆU SUẤT "—" ────────────────
const rateBackup = state.x2BoOngRates;
state.x2BoOngRates = {};
x2.renderX2BoOngTable();
check('HIỆU SUẤT: chưa đặt định mức tháng → hiện "—" (không chia cho 0)',
  document.getElementById('x2-ong-day-cards').innerHTML.includes('Chưa đủ dữ liệu'));
state.x2BoOngRates = rateBackup;
x2.renderX2BoOngTable();

// ─── H. SNAPSHOT: BỐ TRÍ NHÂN SỰ BỊ XÓA ─────────────────────────
const hrBackup = state.hrAssignments;
state.hrAssignments = [];
x2.renderX2BoOngCard();
check('SNAPSHOT: bố trí Nhân Sự bị xóa → thẻ ngày vẫn hiện người bổ + giờ bổ đã lưu',
  document.getElementById('x2-ong-day-cards').innerHTML.includes('Nguyễn Văn B') &&
  document.getElementById('x2-ong-day-cards').innerHTML.includes('9h HC'));
state.hrAssignments = hrBackup;
x2.renderX2BoOngCard();


// ─── I. SỬA LƯỢT BỔ ỐNG ─────────────────────────────────────────
x2.editXuong2BoOng(rec.id);
check('SỬA: vào chế độ sửa (x2BoOngEditId = id)', state.x2BoOngEditId === rec.id);
check('SỬA: banner "Đang sửa lượt bổ ống" hiện lên (thay tiêu đề form)',
  document.getElementById('x2-bo-ong-edit-banner').style.display === '');
check('SỬA: ô KL ống loại nạp lại 50 + ô chọn trỏ về lô ống gốc',
  document.getElementById('x2-bo-ong-loai').value === '50' && selOng.value === 'cut-1');
document.getElementById('x2-bo-ong-loai').value = '100';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('SỬA: KL ống loại 100 → ống bổ tự tính lại = 300',
  rec.klOngLoai === 100 && rec.klOngBo === 300);
check('SỬA: sau lưu về lại chế độ ghi mới', state.x2BoOngEditId === null);

// ─── J. CHẶN DỮ LIỆU KHÔNG HỢP LỆ ──────────────────────────────
x2.editXuong2BoOng(rec.id);
document.getElementById('x2-bo-ong-loai').value = '5000'; // vượt KL ống đầu vào
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('CHẶN: không lưu khi KL ống loại vượt KL ống bổ của lượt', rec.klOngLoai === 100);
x2.resetXuong2BoOngForm();
check('RESET: form về chế độ ghi mới + xóa ô KL ống loại + banner ẩn lại',
  state.x2BoOngEditId === null && document.getElementById('x2-bo-ong-loai').value === '' &&
  document.getElementById('x2-bo-ong-edit-banner').style.display === 'none');

// ─── K. THU GỌN / MỞ RỘNG BẢNG LỊCH SỬ ─────────────────────────
x2.toggleX2BoOngTable();
check('BẢNG: nút thu gọn hoạt động (wrap có class x2-cut-collapsed)',
  document.getElementById('x2-ong-table-wrap').classList.contains('x2-cut-collapsed'));
x2.toggleX2BoOngTable();
check('BẢNG: mở rộng lại (bỏ class x2-cut-collapsed)',
  !document.getElementById('x2-ong-table-wrap').classList.contains('x2-cut-collapsed'));

// ─── L. XÓA LƯỢT BỔ ỐNG (+ tombstone) ───────────────────────────
x2.deleteXuong2BoOng(rec.id);
check('XÓA: danh sách về rỗng', (state.xuong2BoOngRecords || []).length === 0);
check('XÓA: localStorage cũng rỗng', JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BO_ONG) || '[]').length === 0);
check('XÓA: đã ghi tombstone (xuong2BoOngRecords)',
  !!(state.deletedIds && state.deletedIds.xuong2BoOngRecords && state.deletedIds.xuong2BoOngRecords[rec.id]));
check('LỌC: xóa lượt bổ → lô ống "Luồng cây xô" hiện lại trong ô chọn', selOng.innerHTML.includes('Luồng cây xô'));
check('TỒN: mini card về "Tồn 700 kg" (2 lô chờ bổ trở lại)',
  document.getElementById('x2-mini-count-bo-ong').textContent === 'Tồn 700 kg');

// ─── N. BỔ 1 PHẦN LÔ (số lượng bổ nhỏ hơn phần còn lại của lô) ──
selOng.value = 'cut-2';           // lô "Luồng ống": 300 kg
x2.updateXuong2BoOngLinked(true);
check('PHẦN LÔ: ô KL ống bổ điền sẵn phần còn lại của lô = 300',
  document.getElementById('x2-bo-ong-bo').value === '300');
document.getElementById('x2-bo-ong-bo').value = '100';   // ngày đó chỉ bổ 1 phần
document.getElementById('x2-bo-ong-loai').value = '10';
x2.updateXuong2BoOngLinked(false);
check('PHẦN LÔ: tự tính ống bổ đạt = 100 − 10 = 90 kg · còn sau lượt 200 kg',
  calcVal('Ống bổ đạt') === '90 kg' && calcVal('Còn sau lượt') === '200 kg');
document.getElementById('x2-bo-ong-date').value = '2026-09-13';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
const p1 = state.xuong2BoOngRecords[0];
check('PHẦN LÔ: lưu lượt bổ 1 phần (100 kg đem bổ · 90 kg bổ đạt · 10 kg loại · lô 300 kg)',
  state.xuong2BoOngRecords.length === 1 && p1.inputOng === 100 && p1.klOngBo === 90 &&
  p1.klOngLoai === 10 && p1.lotOng === 300);
check('PHẦN LÔ: lô CHƯA bổ hết VẪN hiện trong ô chọn kèm "còn 200 / 300 kg"',
  selOng.innerHTML.includes('Luồng ống') && selOng.innerHTML.includes('còn 200 / 300 kg'));
check('PHẦN LÔ: mini card = tồn còn lại (400 của cut-1 + 200 của cut-2) = "Tồn 600 kg"',
  document.getElementById('x2-mini-count-bo-ong').textContent === 'Tồn 600 kg');
check('PHẦN LÔ: dòng nhánh trong thẻ ngày ghi KL ống của lô + chip "còn 200 kg"',
  document.getElementById('x2-ong-day-cards').innerHTML.includes('lô 300 kg') &&
  document.getElementById('x2-ong-day-cards').innerHTML.includes('còn 200 kg'));
check('PHẦN LÔ: tỷ lệ đạt lượt này = 90/100 = 90%',
  document.getElementById('x2-ong-day-cards').innerHTML.includes('90%'));
// Bổ NỐT phần còn lại của lô (ô KL ống bổ tự điền sẵn 200)
selOng.value = 'cut-2';
x2.updateXuong2BoOngLinked(true);
check('PHẦN LÔ: chọn lại cùng lô → ô KL ống bổ điền sẵn phần còn lại 200',
  document.getElementById('x2-bo-ong-bo').value === '200');
document.getElementById('x2-bo-ong-loai').value = '0';
document.getElementById('x2-bo-ong-date').value = '2026-09-14';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('PHẦN LÔ: bổ nốt (2 lượt = 100 + 200) → lô hết ống, ẩn khỏi ô chọn; lô khác vẫn còn',
  state.xuong2BoOngRecords.length === 2 &&
  !selOng.innerHTML.includes('Luồng ống') && selOng.innerHTML.includes('Luồng cây xô'));

// ─── O. CHẶN LƯỢT BỔ VƯỢT PHẦN CÒN LẠI CỦA LÔ ─────────────────
selOng.value = 'cut-1';            // lô "Luồng cây xô": 400 kg (chưa bổ)
x2.updateXuong2BoOngLinked(true);
document.getElementById('x2-bo-ong-bo').value = '500';
const cntBefore = state.xuong2BoOngRecords.length;
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('CHẶN: KL ống bổ vượt phần còn lại của lô → không lưu',
  state.xuong2BoOngRecords.length === cntBefore);
document.getElementById('x2-bo-ong-bo').value = '100';
document.getElementById('x2-bo-ong-loai').value = '200';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('CHẶN: KL ống loại lớn hơn KL ống bổ → không lưu',
  state.xuong2BoOngRecords.length === cntBefore);

// ─── P. SỬA LƯỢT BỔ 1 PHẦN (phần của chính lượt được TRẢ LẠI) ───
x2.editXuong2BoOng(p1.id);
check('SỬA PHẦN LÔ: ô KL ống bổ nạp lại 100', document.getElementById('x2-bo-ong-bo').value === '100');
check('SỬA PHẦN LÔ: "còn lại của lô" khi sửa = 100 (300 − 200 của lượt khác, đã trả lại 100 của chính lượt này)',
  calcVal('Còn lại của lô') === '100 kg');
document.getElementById('x2-bo-ong-bo').value = '50';   // sửa thành bổ ít hơn
document.getElementById('x2-bo-ong-loai').value = '0';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('SỬA PHẦN LÔ: sửa lượt 100 → 50 kg ⇒ 50 kg dư TRỞ LẠI ô chọn lô',
  p1.inputOng === 50 && p1.klOngBo === 50 && selOng.innerHTML.includes('còn 50 / 300 kg'));
check('PHẦN LÔ: mini card sau khi sửa = 400 + 50 = "Tồn 450 kg"',
  document.getElementById('x2-mini-count-bo-ong').textContent === 'Tồn 450 kg');

// ─── M. CẤU TRÚC index.html: THẺ BỔ ỐNG ĐÃ CÓ CHỨC NĂNG ────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): form Bổ Ống có ô chọn lô ống + ngày bổ + KL ống bổ (sửa được) + KL ống loại + ô tự tính',
  idxHtml.includes('"x2-bo-ong-cut"') && idxHtml.includes('"x2-bo-ong-date"') &&
  idxHtml.includes('"x2-bo-ong-bo"') && idxHtml.includes('"x2-bo-ong-loai"') &&
  idxHtml.includes('x2-bo-ong-calc'));
check('CẤU TRÚC (index.html): bảng phụ định mức công suất bổ ống theo tháng (kg/h)',
  idxHtml.includes('x2-ong-rate-month') && idxHtml.includes('btn-x2-ong-rate-save') &&
  idxHtml.includes('x2-ong-rate-chips') && idxHtml.includes('id="x2-ong-rate-bar"'));
check('CẤU TRÚC (index.html): bảng ghi dữ liệu (thẻ ngày) + thanh tồn ống chờ bổ',
  idxHtml.includes('x2-ong-day-cards') && idxHtml.includes('id="x2-ong-stock-bar"') &&
  idxHtml.includes('btn-toggle-x2ong-table'));
check('CẤU TRÚC (index.html): thẻ Bổ Ống KHÔNG còn ghi chú "Chức năng đang được bổ sung"',
  !idxHtml.includes('Bảng ghi nhận lượt bổ ống'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

