// tests/xuong2-bao-tho.test.mjs — Kiểm thử VỊ TRÍ "CHẠY MÁY BÀO THÔ" (Xưởng 2):
// form chọn LÔ ĐÃ BỔ (từ Bổ Ống) + Ngày + LOẠI NAN (Dài/Rộng/Dày — mỗi ô nhiều
// giá trị ngăn cách dấu phẩy → nhiều TỔ HỢP kích thước), bảng phụ ĐỊNH MỨC CÔNG
// SUẤT theo tháng (thanh/h), bảng dữ liệu dạng THẺ NGÀY (đầu thẻ: Ngày · Người
// chạy máy · Thời gian · Công suất · Hiệu suất — trong thẻ: Loại nan · Số lượng
// (tự động từ công đoạn Chọn Nan Thô) · Thể tích quy đổi), lưu / sửa / xóa.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-bo-ong.test.mjs) ─────────────
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

const { state, STORAGE_KEY_XUONG2_BAO_THO, STORAGE_KEY_X2_BAO_THO_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu mẫu ────────────────────────────────────────────────
// 2 lô ĐÃ BỔ (nguồn của công đoạn Bổ Ống) — mỗi lô = 1 lựa chọn trong form
state.xuong2BoOngRecords = [
  { id: 'lot-1', cutId: 'cut-1', materialId: 'mat-a', materialType: 'Luồng cây xô', supplier: 'Nhà Tế',
    cutDate: '2026-09-08', boDate: '', inputOng: 400, klOngLoai: 50, klOngBo: 350, date: '2026-09-10',
    worker: 'Lê Văn Bình', workTime: '07:00–12:00', workHours: 5, createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'lot-2', cutId: 'cut-2', materialId: 'mat-b', materialType: 'Luồng ống', supplier: 'Nhà Trung',
    cutDate: '2026-09-09', boDate: '', inputOng: 300, klOngLoai: 0, klOngBo: 300, date: '2026-09-12',
    worker: 'Lê Văn Bình', workTime: '07:00–12:00', workHours: 5, createdAt: '2026-09-12T02:00:00.000Z' }
];
state.xuong2BaoThoRecords = [];
state.x2BaoThoRates = {};
// Nhân Sự: vị trí "Chạy Máy Bào Thô" (khớp) — "Bào Tinh" thì KHÔNG khớp
state.hrEmployees = [
  { id: 'empA', name: 'Nguyễn Văn A', quitDate: '' },
  { id: 'empBT1', name: 'Lê Văn Bình', quitDate: '' },
  { id: 'empBT2', name: 'Phạm Văn Cường', quitDate: '' }
];
state.hrPositions = [
  { id: 'pbt', name: 'Chạy Máy Bào Thô', department: 'Xưởng 2' },
  { id: 'pbtinh', name: 'Bào Tinh', department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'asg-bt1', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pbt', employeeId: 'empBT1', start: '07:00', end: '12:00' },
  { id: 'asg-bt2', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pbt', employeeId: 'empBT2', start: '13:00', end: '' },
  { id: 'asg-tinh', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pbtinh', employeeId: 'empA', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');

// ─── A. THẺ LAUNCHER + MỞ POP-UP ────────────────────────────────
x2.renderXuong2Cards();
check('THẺ: mini card Bào Thô chưa có lượt → "Chưa chạy"',
  document.getElementById('x2-mini-count-bao-tho').textContent === 'Chưa chạy');
check('THẺ: mở thẻ Chạy Máy Bào Thô trả về true', x2.x2OpenCard('x2-bao-tho-card') === true);
check('THẺ: pop-up bật + bảng Bào Thô hiện (không còn x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bao-tho-card').classList.contains('x2-card-hidden'));

// ─── B. Ô CHỌN LÔ ĐÃ BỔ (theo LÔ: NCC + ngày bổ + KL ống bổ đạt) ─
const selLot = document.getElementById('x2-bao-tho-lot');
check('Ô CHỌN: có 2 lô đã bổ (từ công đoạn Bổ Ống)',
  selLot.innerHTML.includes('Luồng cây xô') && selLot.innerHTML.includes('Luồng ống'));
check('Ô CHỌN: nhãn hiện NCC + ngày bổ + KL ống bổ đạt (chọn theo lô, không cần lọc theo NCC)',
  selLot.innerHTML.includes('NCC Nhà Tế') && selLot.innerHTML.includes('bổ 10/09/26') &&
  selLot.innerHTML.includes('ống bổ 350 kg'));

// ─── C. LOẠI NAN: DÀI / RỘNG / DÀY (mỗi ô nhiều giá trị, dấu phẩy) ─
selLot.value = 'lot-1';
x2.updateXuong2BaoThoLinked();
check('LINK: Ngày chạy máy mặc định theo ngày bổ của lô = 2026-09-10',
  document.getElementById('x2-bao-tho-date').value === '2026-09-10');
document.getElementById('x2-bao-tho-dai').value = '1250,1300';
document.getElementById('x2-bao-tho-rong').value = '80';
document.getElementById('x2-bao-tho-day').value = '12';
x2.renderX2BaoThoCalc();
const calc = document.getElementById('x2-bao-tho-calc').innerHTML;
check('LOẠI NAN: 2 giá trị Dài × 1 Rộng × 1 Dày → 2 TỔ HỢP kích thước',
  /Tổ hợp kích thước:<\/span><strong[^>]*>2</.test(calc));
check('LOẠI NAN: thể tích quy đổi 1 thanh (TB) = (0,0012 + 0,001248)/2 = 0,0012 m³',
  calc.includes('0.0012 m³'));
check('LOẠI NAN: ô số lượng báo chờ công đoạn Chọn Nan Thô',
  calc.includes('chờ Chọn Nan Thô'));


// ─── D. LƯU LƯỢT CHẠY MÁY ───────────────────────────────────────
x2.handleXuong2BaoThoSubmit({ preventDefault(){} });
check('LƯU: state có đúng 1 lượt chạy máy', (state.xuong2BaoThoRecords || []).length === 1);
const rec = state.xuong2BaoThoRecords[0];
check('LƯU: link đúng lô đã bổ (boOngId = lot-1)', rec.boOngId === 'lot-1');
check('LƯU: tách đúng 3 danh sách kích thước (Dài 2 giá trị · Rộng 1 · Dày 1)',
  rec.dais.length === 2 && rec.dais[0] === 1250 && rec.dais[1] === 1300 &&
  rec.rongs.length === 1 && rec.rongs[0] === 80 && rec.thicks.length === 1 && rec.thicks[0] === 12);
check('LƯU: giữ nguyên chuỗi người dùng nhập (để sửa lại sau)',
  rec.daiText === '1250,1300' && rec.rongText === '80' && rec.dayText === '12');
check('LƯU: snapshot lô (loại NL · NCC · ngày bổ · ống bổ đạt)',
  rec.materialType === 'Luồng cây xô' && rec.supplier === 'Nhà Tế' &&
  rec.boDate === '2026-09-10' && rec.klOngBo === 350);
check('LƯU: NGƯỜI CHẠY MÁY tự động từ Bảng bố trí Nhân Sự (vị trí Bào Thô)',
  rec.worker === 'Lê Văn Bình, Phạm Văn Cường');
check('LỌC VỊ TRÍ: KHÔNG lấy người ở vị trí "Bào Tinh" (Nguyễn Văn A)',
  !String(rec.worker).includes('Nguyễn Văn A'));
check('LƯU: THỜI GIAN tự động = "07:00–12:00, 13:00 → hết ca" · số giờ 9h HC / 0h TC',
  rec.workTime === '07:00–12:00, 13:00 → hết ca' &&
  rec.workHours === 9 && rec.workHoursHC === 9 && rec.workHoursTC === 0);
check('LƯU: form reset về chế độ ghi mới', state.x2BaoThoEditId === null);
check('LƯU: đã ghi localStorage danh sách chạy máy',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BAO_THO) || '[]').length === 1);
check('LƯU: lô đã chạy máy hiện chip "đã chạy 1 lượt" trong ô chọn',
  selLot.innerHTML.includes('đã chạy 1 lượt'));

// ─── E. BẢNG GHI DỮ LIỆU: THẺ NGÀY (đầu thẻ chung + nhánh trong thẻ) ──
const dayHtml = document.getElementById('x2-bt-day-cards').innerHTML;
check('THẺ NGÀY: đầu thẻ hiển thị Ngày 10/09/26 (dd/mm/yy)',
  dayHtml.includes('x2-day-head') && dayHtml.includes('10/09/26'));
check('THẺ NGÀY: NGƯỜI CHẠY MÁY (người chính + giờ) và "+1 người khác"',
  dayHtml.includes('Lê Văn Bình') && dayHtml.includes('07:00–12:00') &&
  dayHtml.includes('+1 người khác') && dayHtml.includes('Phạm Văn Cường'));
check('THẺ NGÀY: THỜI GIAN tách badge HC/TC = "9h HC" / "0h TC"',
  dayHtml.includes('9h HC') && dayHtml.includes('0h TC'));
check('TRONG THẺ: Loại nan = 2 chip tổ hợp "1250 × 80 × 12" và "1300 × 80 × 12"',
  dayHtml.includes('1250 × 80 × 12') && dayHtml.includes('1300 × 80 × 12'));
check('TRONG THẺ: nhánh ghi nguồn lô (ngày bổ + NCC + ống bổ đạt) + thể tích/thanh',
  dayHtml.includes('Lô đã bổ 10/09/26') && dayHtml.includes('NCC Nhà Tế') &&
  dayHtml.includes('ống bổ đạt 350 kg') && dayHtml.includes('0.0012 m³/thanh'));
check('TRONG THẺ: Số lượng "chờ Chọn Nan Thô" + Thể tích quy đổi "—" (chưa có số lượng)',
  dayHtml.includes('Chờ Chọn Nan Thô') && dayHtml.includes('chờ Chọn Nan Thô'));
check('THẺ NGÀY: Công suất + Hiệu suất "—" khi chưa có số lượng thanh',
  dayHtml.includes('Công suất: <strong>—</strong>'));
check('BẢNG: đếm lịch sử hiển thị "1 lượt chạy máy"',
  document.getElementById('x2-bt-table-count').textContent === '1 lượt chạy máy');

// ─── F. BẢNG PHỤ: ĐỊNH MỨC CÔNG SUẤT BÀO THÔ (thanh/h) theo tháng ──
check('ĐỊNH MỨC: thanh định mức có ô chọn tháng + đơn vị thanh/h (index.html)',
  fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').includes('>thanh/h</span>'));
document.getElementById('x2-bt-rate-month').value = '2026-09';
document.getElementById('x2-bt-rate-value').value = '900';
x2.handleX2BaoThoRateSave();
check('ĐỊNH MỨC: lưu tháng 9 = 900 thanh/h vào state', state.x2BaoThoRates['2026-09'] === 900);
check('ĐỊNH MỨC: đã ghi localStorage (key riêng của Bào Thô)',
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_THO_RATE) || '{}')['2026-09'] === 900);
check('ĐỊNH MỨC: chip tháng đã đặt "T9 = 900 thanh/h"',
  document.getElementById('x2-bt-rate-chips').innerHTML.includes('T9 = 900 thanh/h'));


// ─── G. SỐ LƯỢNG + THỂ TÍCH TỰ ĐỘNG (nguồn công đoạn Chọn Nan Thô) ──
// Dữ liệu công đoạn "Chọn Nan Thô" ghi cho ĐÚNG lô bào thô này (link baothoId)
state.xuong2ChonNanThoRecords = [
  { id: 'cn-1', baothoId: rec.id, dims: [1250, 80, 12], sizeKey: '1250×80×12', cls: 'A', quantity: 1000, unitVol: 0.0012, volume: 1.2 },
  { id: 'cn-2', baothoId: rec.id, dims: [1300, 80, 12], sizeKey: '1300×80×12', cls: 'B', quantity: 500, unitVol: 0.001248, volume: 0.624 },
  // Lượt "nhập ở NGOÀI công đoạn" → KHÔNG được cộng sang Chạy Máy Bào Thô
  { id: 'cn-ext', baothoId: rec.id, external: true, dims: [1250, 80, 12], sizeKey: '1250×80×12', cls: 'A', quantity: 9000, unitVol: 0.0012, volume: 10.8 }
];
x2.renderX2BaoThoCard();
const withQtyHtml = document.getElementById('x2-bt-day-cards').innerHTML;
check('LIÊN KẾT: số lượng = 1.000 + 500 = 1.500 thanh (lấy từ Chọn Nan Thô theo lô)',
  withQtyHtml.includes('1.500') && withQtyHtml.includes('thanh'));
check('LIÊN KẾT: lượt "nhập ngoài công đoạn" (9.000 thanh) KHÔNG cộng vào Bào Thô',
  !withQtyHtml.includes('10.500'));
check('LIÊN KẾT: thể tích quy đổi = 1,2000 + 0,6240 = 1,8240 m³ (chính xác từng lượt chọn)',
  withQtyHtml.includes('1.8240'));
check('CÔNG SUẤT: 1.500 thanh ÷ 9 giờ chạy máy = 167 thanh/h (đầu thẻ ngày)',
  withQtyHtml.includes('167 thanh/h'));
check('HIỆU SUẤT: 167 thanh/h ÷ định mức 900 thanh/h (tháng 9) = 18,5%',
  withQtyHtml.includes('18,5%'));
check('MINI CARD: "1 lượt · 1.500 thanh"',
  document.getElementById('x2-mini-count-bao-tho').textContent === '1 lượt · 1.500 thanh');
check('THỐNG KÊ: tổng số thanh 1.500 + thể tích quy đổi 1,8240 m³',
  document.getElementById('x2-bt-stats').innerHTML.includes('1.500') &&
  document.getElementById('x2-bt-stats').innerHTML.includes('1.8240'));
// Bỏ dữ liệu chọn nan → thẻ quay về "chờ Chọn Nan Thô" (KHÔNG bịa số)
state.xuong2ChonNanThoRecords = [];
x2.renderX2BaoThoCard();
check('LIÊN KẾT: chưa có dữ liệu Chọn Nan Thô → "Chờ Chọn Nan Thô" + công suất "—"',
  document.getElementById('x2-bt-day-cards').innerHTML.includes('Chờ Chọn Nan Thô') &&
  document.getElementById('x2-bt-day-cards').innerHTML.includes('Công suất: <strong>—</strong>'));

// ─── H. CHẶN DỮ LIỆU KHÔNG HỢP LỆ ──────────────────────────────
selLot.value = 'lot-2';
x2.updateXuong2BaoThoLinked();
document.getElementById('x2-bao-tho-date').value = '2026-09-12';
const cntBefore = state.xuong2BaoThoRecords.length;
['x2-bao-tho-dai', 'x2-bao-tho-rong', 'x2-bao-tho-day'].forEach(id => {
  document.getElementById(id).value = '';
});
x2.handleXuong2BaoThoSubmit({ preventDefault(){} });
check('CHẶN: chưa nhập Dài/Rộng/Dày → không lưu', state.xuong2BaoThoRecords.length === cntBefore);
document.getElementById('x2-bao-tho-dai').value = '1250';
document.getElementById('x2-bao-tho-rong').value = '80';
x2.handleXuong2BaoThoSubmit({ preventDefault(){} });
check('CHẶN: thiếu ô Dày → không lưu', state.xuong2BaoThoRecords.length === cntBefore);

// ─── I. LƯU THÊM LƯỢT Ở NGÀY KHÁC (2 thẻ ngày) ─────────────────
document.getElementById('x2-bao-tho-dai').value = '1300';
document.getElementById('x2-bao-tho-rong').value = '90';
document.getElementById('x2-bao-tho-day').value = '12,15';
x2.handleXuong2BaoThoSubmit({ preventDefault(){} });
check('LƯU: lượt 2 lưu đúng lô lot-2 + Dày có 2 giá trị (2 tổ hợp)',
  state.xuong2BaoThoRecords.length === 2 &&
  state.xuong2BaoThoRecords[1].boOngId === 'lot-2' &&
  state.xuong2BaoThoRecords[1].thicks.length === 2);
check('BẢNG: "2 lượt chạy máy" + 2 THẺ NGÀY riêng (nhóm theo ngày)',
  document.getElementById('x2-bt-table-count').textContent === '2 lượt chạy máy' &&
  (document.getElementById('x2-bt-day-cards').innerHTML.match(/class="x2-day-card">/g) || []).length === 2);


// ─── J. SỬA LƯỢT CHẠY MÁY ──────────────────────────────────────
x2.editXuong2BaoTho(rec.id);
check('SỬA: vào chế độ sửa (x2BaoThoEditId = id)', state.x2BaoThoEditId === rec.id);
check('SỬA: banner "Đang sửa lượt chạy máy" hiện lên',
  document.getElementById('x2-bao-tho-edit-banner').style.display === '');
check('SỬA: nạp lại 3 ô kích thước + lô gốc',
  document.getElementById('x2-bao-tho-dai').value === '1250,1300' &&
  document.getElementById('x2-bao-tho-rong').value === '80' &&
  document.getElementById('x2-bao-tho-day').value === '12' && selLot.value === 'lot-1');
document.getElementById('x2-bao-tho-day').value = '15';
x2.handleXuong2BaoThoSubmit({ preventDefault(){} });
check('SỬA: đổi Dày thành 15 → thicks = [15], vẫn giữ 2 giá trị Dài',
  rec.thicks.length === 1 && rec.thicks[0] === 15 && rec.dais.length === 2);
check('SỬA: sau lưu về lại chế độ ghi mới', state.x2BaoThoEditId === null);
x2.resetXuong2BaoThoForm();
check('RESET: form trống 3 ô kích thước + banner ẩn lại',
  document.getElementById('x2-bao-tho-dai').value === '' &&
  document.getElementById('x2-bao-tho-edit-banner').style.display === 'none');

// ─── K. XÓA LƯỢT CHẠY MÁY (+ tombstone) ────────────────────────
x2.deleteXuong2BaoTho(rec.id);
check('XÓA: còn lại 1 lượt', (state.xuong2BaoThoRecords || []).length === 1);
check('XÓA: đã ghi tombstone (xuong2BaoThoRecords)',
  !!(state.deletedIds && state.deletedIds.xuong2BaoThoRecords && state.deletedIds.xuong2BaoThoRecords[rec.id]));
check('XÓA: chip "đã chạy" của đúng lô bị xóa biến mất (lô vẫn chọn lại được)',
  /Luồng cây xô · NCC Nhà Tế · bổ 10\/09\/26 · ống bổ 350 kg<\/option>/.test(selLot.innerHTML));

// ─── L. THU GỌN / MỞ RỘNG BẢNG LỊCH SỬ ─────────────────────────
x2.toggleX2BaoThoTable();
check('BẢNG: nút thu gọn hoạt động (wrap có class x2-cut-collapsed)',
  document.getElementById('x2-bt-table-wrap').classList.contains('x2-cut-collapsed'));
x2.toggleX2BaoThoTable();
check('BẢNG: mở rộng lại (bỏ class x2-cut-collapsed)',
  !document.getElementById('x2-bt-table-wrap').classList.contains('x2-cut-collapsed'));

// ─── M. CẤU TRÚC index.html: THẺ BÀO THÔ ĐÃ CÓ CHỨC NĂNG ───────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): form có lô đã bổ + ngày + Dài/Rộng/Dày + ô tự tính',
  idxHtml.includes('"x2-bao-tho-lot"') && idxHtml.includes('"x2-bao-tho-date"') &&
  idxHtml.includes('"x2-bao-tho-dai"') && idxHtml.includes('"x2-bao-tho-rong"') &&
  idxHtml.includes('"x2-bao-tho-day"') && idxHtml.includes('x2-bao-tho-calc'));
check('CẤU TRÚC (index.html): bảng phụ định mức công suất bào thô theo tháng (thanh/h)',
  idxHtml.includes('x2-bt-rate-month') && idxHtml.includes('btn-x2-bt-rate-save') &&
  idxHtml.includes('id="x2-bt-rate-bar"') && idxHtml.includes('thanh/h'));
check('CẤU TRÚC (index.html): bảng ghi dữ liệu (thẻ ngày) + nút thu gọn',
  idxHtml.includes('x2-bt-day-cards') && idxHtml.includes('btn-toggle-x2bt-table'));
check('CẤU TRÚC (index.html): thẻ Bào Thô KHÔNG còn ghi chú "Chức năng đang được bổ sung"',
  !idxHtml.includes('Bảng ghi nhận sản lượng máy bào thô'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

