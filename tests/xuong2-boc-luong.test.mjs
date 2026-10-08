// tests/xuong2-boc-luong.test.mjs — Kiểm thử THẺ "BỐC LUỒNG" (tab Công Đoạn, Xưởng 2):
// chọn lô "Luồng cây..." làm Đầu vào (lô bốc HẾT khối lượng tự ẩn), Khối lượng thực
// tế (kg), popup Định mức kg/h, thẻ ngày lấy NGƯỜI + GIỜ vị trí "Bốc Luồng" từ tab
// Nhân Sự → Công suất + Hiệu suất, lưu/sửa/xóa (tombstone), nối state/storage/cloud/
// history/main/capacity/export.
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

const { state, STORAGE_KEY_XUONG2_BOLUONG, STORAGE_KEY_X2_BOLUONG_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu nguyên liệu mẫu (tab Nguyên Liệu) ───────────────────
state.materialRecords = [
  { id: 'mat-a', type: 'Luồng cây xô',  supplier: 'Tế',   location: 'xuong-2', code: 'MNL01', weight: 1000, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'mat-d', type: 'luong cây tre', supplier: 'Trung', location: 'xuong-2', weight: 500,  date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' },
  { id: 'mat-b', type: 'Luồng ống',     supplier: 'Trung', location: 'xuong-2', weight: 800,  date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'mat-c', type: 'Thanh tre thô', supplier: 'Khác',  location: 'xuong-1', weight: 500,  date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' }
];
state.xuong2BoluongRecords = [];
state.x2BoluongEditId = null;
state.x2BoluongRates = {};
state.suppliers = [{ id: 'sup-te', name: 'Nhà Tế', code: 'NCC01', createdAt: '2026-09-01T00:00:00.000Z' }];
// Nhân Sự: NGƯỜI BỐC + GIỜ BỐC tự động từ Bảng bố trí (vị trí tên chứa "bốc luồng")
state.hrEmployees = [
  { id: 'empA', name: 'Nguyễn Văn A', quitDate: '' },
  { id: 'empB', name: 'Nguyễn Văn B', quitDate: '' },
  { id: 'empC', name: 'Trần Văn C', quitDate: '' }
];
state.hrPositions = [
  { id: 'pbl', name: 'Bốc Luồng', department: 'Xưởng 2' },
  { id: 'pcat', name: 'Cắt Chọn', department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'asg-1', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pbl', employeeId: 'empA', start: '07:00', end: '12:00' },
  { id: 'asg-2', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pbl', employeeId: 'empB', start: '13:00', end: '' },
  { id: 'asg-3', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pcat', employeeId: 'empC', start: '07:00', end: '' }
];

const x2 = await import('../js/xuong2.js');

// ─── A. THẺ LAUNCHER + MỞ/ĐÓNG POP-UP ────────────────────────────
x2.renderXuong2Cards();
check('THẺ: mini card hiện TỒN LUỒNG CÂY CHƯA BỐC = "Tồn 1.500 kg" (1000 + 500)',
  document.getElementById('x2-mini-count-bo-luong').textContent === 'Tồn 1.500 kg');
check('THẺ: KHÔNG còn cờ "soon" (chức năng đã bật)',
  !x2.X2_CARD_DEFS['x2-bo-luong-card'].soon);
check('THẺ: x2OpenCard trả về true lần đầu', x2.x2OpenCard('x2-bo-luong-card') === true);
check('THẺ: pop-up bật + thẻ hiện (không còn x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bo-luong-card').classList.contains('x2-card-hidden'));
check('THẺ: bấm lại thẻ đang mở → false (đóng) + overlay tắt',
  x2.x2OpenCard('x2-bo-luong-card') === false &&
  !document.getElementById('x2-detail-overlay').classList.contains('show'));
x2.x2OpenCard('x2-bo-luong-card');

// ─── B. Ô CHỌN ĐẦU VÀO — CHỈ LÔ "LUỒNG CÂY" ──────────────────────
const sel = document.getElementById('x2-blg-material');
const optHtml = sel.innerHTML;
check('Ô CHỌN: có lô "Luồng cây xô"', optHtml.includes('Luồng cây xô'));
check('Ô CHỌN: khớp MỀM chữ "luồng cây" không dấu + hoa/thường ("luong cây tre")',
  optHtml.includes('luong cây tre'));
check('Ô CHỌN: KHÔNG chứa "Luồng ống" (không phải Luồng cây)', !optHtml.includes('Luồng ống'));
check('Ô CHỌN: KHÔNG chứa lô Xưởng 1 "Thanh tre thô"', !optHtml.includes('Thanh tre thô'));
check('Ô CHỌN: nhãn kèm PHẦN CÒN LẠI "còn 1.000 / 1.000 kg"',
  optHtml.includes('còn 1.000 / 1.000 kg'));

// ─── C. LINK NGÀY + THANH TỒN + BANNER GHI MỚI ───────────────────
sel.value = 'mat-a';
x2.updateXuong2BoluongLinked();
check('LINK: Ngày bốc mặc định theo ngày nhập NL = 2026-09-10',
  document.getElementById('x2-blg-date').value === '2026-09-10');
check('TỒN: thanh trên cùng = "2 lô · 1.500 kg" chờ bốc',
  document.getElementById('x2-blg-stock-bar').innerHTML.includes('2 lô · 1.500 kg'));
check('BANNER: đang ghi mới → ẩn', document.getElementById('x2-blg-edit-banner').style.display === 'none');

// ─── D. CẤU TRÚC index.html + popup ĐỊNH MỨC ─────────────────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('HTML: form có 3 ô Ngày · Đầu vào · Khối lượng thực tế + nút Định mức',
  idxHtml.includes('id="x2-blg-date"') && idxHtml.includes('id="x2-blg-material"') &&
  idxHtml.includes('id="x2-blg-qty"') && idxHtml.includes('id="btn-x2-blg-rate"'));
check('HTML: có vùng THẺ NGÀY (x2-blg-day-cards) + nút thu gọn',
  idxHtml.includes('id="x2-blg-day-cards"') && idxHtml.includes('id="btn-toggle-x2blg-table"'));
check('HTML: popup định mức cấp trang modal-x2-blg-rate + ô tháng/số/nút Lưu/chip',
  idxHtml.includes('id="modal-x2-blg-rate"') && idxHtml.includes('id="x2-blg-rate-month"') &&
  idxHtml.includes('id="x2-blg-rate-value"') && idxHtml.includes('id="btn-x2-blg-rate-save"') &&
  idxHtml.includes('id="x2-blg-rate-chips"'));
check('HTML: KHÔNG còn ghi chú placeholder .x2-soon-note trong thẻ Bốc Luồng',
  !/<div class="planning-card x2-card-hidden" id="x2-bo-luong-card">[\s\S]{0,900}x2-soon-note/.test(idxHtml));
check('HTML: thanh tồn + khối thống kê + bảng lịch sử có sẵn',
  idxHtml.includes('id="x2-blg-stock-bar"') && idxHtml.includes('id="x2-blg-stats"') &&
  idxHtml.includes('id="x2-blg-table-wrap"'));

// ĐỊNH MỨC: popup lưu kg/h cho tháng 9
document.getElementById('x2-blg-rate-month').value = '2026-09';
document.getElementById('x2-blg-rate-value').value = '500';
x2.handleX2BoluongRateSave();
check('ĐỊNH MỨC: state.x2BoluongRates["2026-09"] = 500', state.x2BoluongRates['2026-09'] === 500);
check('ĐỊNH MỨC: localStorage đã ghi key riêng',
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BOLUONG_RATE) || '{}')['2026-09'] === 500);
check('ĐỊNH MỨC: boluongRateOf(2026-09-10) = 500 · tháng khác = null',
  x2.boluongRateOf('2026-09-10') === 500 && x2.boluongRateOf('2026-10-10') === null);
check('ĐỊNH MỨC: chip tháng đã đặt hiển thị "T9 = 500 kg/h"',
  document.getElementById('x2-blg-rate-chips').innerHTML.includes('T9 = 500 kg/h'));

// ─── E. LƯU LƯỢT BỐC LUỒNG ───────────────────────────────────────
document.getElementById('x2-blg-qty').value = '400';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('LƯU: state có đúng 1 lượt bốc luồng', (state.xuong2BoluongRecords || []).length === 1);
const rec = state.xuong2BoluongRecords[0];
check('LƯU: materialId link đúng lô + snapshot KL lô = 1000',
  rec.materialId === 'mat-a' && rec.inputWeight === 1000);
check('LƯU: Khối lượng thực tế = 400 kg', rec.qty === 400);
check('LƯU: snapshot NCC ("Tế") + mã số lô ("MNL01") + Mã NCC hiển thị "NCC01" (khớp mềm "Tế" ≡ "Nhà Tế")',
  rec.supplier === 'Tế' && rec.code === 'MNL01' && x2.boluongDisplay(rec).supplierCode === 'NCC01');
check('LƯU: NGƯỜI BỐC tự động từ Bảng bố trí (vị trí Bốc Luồng, KHÔNG nhầm Cắt Chọn)',
  rec.worker === 'Nguyễn Văn A, Nguyễn Văn B' && !String(rec.worker).includes('Trần Văn C'));
check('LƯU: GIỜ BỐC = "07:00–12:00, 13:00 → hết ca" · 9h HC / 0h TC',
  rec.workTime === '07:00–12:00, 13:00 → hết ca' && rec.workHours === 9 &&
  rec.workHoursHC === 9 && rec.workHoursTC === 0);
check('LƯU: tuần tự tạo theo ngày (2026-W…)', String(rec.week || '').startsWith('2026-W'));
check('LƯU: localStorage đã ghi danh sách',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BOLUONG) || '[]').length === 1);
check('LƯU: form reset về ghi mới', state.x2BoluongEditId === null);
check('LỌC: lô còn 600 kg → VẪN hiện + nhãn "còn 600 / 1.000 kg"',
  sel.innerHTML.includes('Luồng cây xô') && sel.innerHTML.includes('còn 600 / 1.000 kg'));

// ─── F. THẺ NGÀY: NGƯỜI · GIỜ · CÔNG SUẤT · HIỆU SUẤT ────────────
const day = document.getElementById('x2-blg-day-cards').innerHTML;
check('THẺ NGÀY: có ngày 10/09/26 + người bốc chính + "+1 người khác"',
  day.includes('10/09/26') && day.includes('Nguyễn Văn A') && day.includes('+1 người khác'));
check('THẺ NGÀY: giờ bốc badge "9h HC" / "0h TC"', day.includes('9h HC') && day.includes('0h TC'));
check('THẺ NGÀY: CÔNG SUẤT = 400 ÷ 9 = "44,44 kg/h"', day.includes('44,44 kg/h'));
check('THẺ NGÀY: HIỆU SUẤT = 44,44 ÷ 500 = "8,9%"', day.includes('8,9%'));
check('THẺ NGÀY: có ô nhập GIỜ SỰ CỐ (data-x2-incident=boluong)',
  day.includes('data-x2-incident="boluong"'));
check('BẢNG: đếm "1 lượt đã bốc luồng"',
  document.getElementById('x2-blg-table-count').textContent === '1 lượt đã bốc luồng');
check('THỐNG KÊ: khối stats có "Lượt bốc luồng" + "Tồn chờ bốc (kg)"',
  document.getElementById('x2-blg-stats').innerHTML.includes('Lượt bốc luồng') &&
  document.getElementById('x2-blg-stats').innerHTML.includes('Tồn chờ bốc (kg)'));
// Bố trí bị xóa → bảng dùng SNAPSHOT đã lưu
const hrBackup = state.hrAssignments;
state.hrAssignments = [];
x2.renderXuong2BoluongTable();
check('THẺ NGÀY (SNAPSHOT): mất bố trí vẫn hiện người bốc đã lưu',
  document.getElementById('x2-blg-day-cards').innerHTML.includes('Nguyễn Văn A'));
state.hrAssignments = hrBackup;
x2.renderXuong2BoluongTable();

// ─── G. BỐC HẾT KHỐI LƯỢNG → LÔ TỰ ẨN ───────────────────────────
document.getElementById('x2-blg-material').value = 'mat-a';
document.getElementById('x2-blg-date').value = '2026-09-10';
document.getElementById('x2-blg-qty').value = '600';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('BỐC HẾT: 2 lượt = 1.000 kg = toàn bộ lô', (state.xuong2BoluongRecords || []).length === 2);
check('ẨN LÔ: lô đã bốc HẾT tự ẩn khỏi ô chọn (không còn "Luồng cây xô")',
  !document.getElementById('x2-blg-material').innerHTML.includes('Luồng cây xô'));
check('TỒN: thanh trên cùng chỉ còn lô thứ 2 = "1 lô · 500 kg"',
  document.getElementById('x2-blg-stock-bar').innerHTML.includes('1 lô · 500 kg'));
check('MINI CARD: tồn chờ bốc = "Tồn 500 kg"',
  document.getElementById('x2-mini-count-bo-luong').textContent === 'Tồn 500 kg');

// ─── H. CHẶN NHẬP VƯỢT PHẦN CÒN LẠI ──────────────────────────────
document.getElementById('x2-blg-material').value = 'mat-d';
document.getElementById('x2-blg-date').value = '2026-09-12';
document.getElementById('x2-blg-qty').value = '400';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
const recD = (state.xuong2BoluongRecords || []).find(r => r.materialId === 'mat-d');
check('LƯU (lô thứ 2): 400/500 kg thành công', !!recD && recD.qty === 400);
document.getElementById('x2-blg-material').value = 'mat-d';
document.getElementById('x2-blg-date').value = '2026-09-12';
document.getElementById('x2-blg-qty').value = '300'; // còn lại chỉ 100 kg
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('CHẶN: vượt phần còn lại (300 > 100) → KHÔNG thêm lượt mới',
  (state.xuong2BoluongRecords || []).length === 3);

// ─── I. SỬA LƯỢT BỐC LUỒNG (phần của lượt được trả lại) ──────────
x2.editXuong2Boluong(recD.id);
check('SỬA: vào chế độ sửa + banner hiện', state.x2BoluongEditId === recD.id &&
  document.getElementById('x2-blg-edit-banner').style.display === '');
check('SỬA: ô Khối lượng nạp lại 400 + ô chọn trỏ đúng lô',
  document.getElementById('x2-blg-qty').value === '400' &&
  document.getElementById('x2-blg-material').value === 'mat-d');
document.getElementById('x2-blg-qty').value = '100';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('SỬA: qty cập nhật 100 → tồn lô còn lại 400 kg',
  recD.qty === 100 && Math.round(x2.boluongRemainingOf(state.materialRecords.find(m => m.id === 'mat-d'))) === 400);
check('SỬA: sau lưu về ghi mới', state.x2BoluongEditId === null);
// Sửa lại đúng bằng toàn bộ lô (500) → hợp lệ vì phần lượt đang sửa được TRẢ LẠI
x2.editXuong2Boluong(recD.id);
document.getElementById('x2-blg-qty').value = '500';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('SỬA: phần lượt đang sửa được TRẢ LẠI → 500 kg (hết lô) vẫn hợp lệ',
  recD.qty === 500);
// Vượt mức → bị chặn
x2.editXuong2Boluong(recD.id);
document.getElementById('x2-blg-qty').value = '501';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('SỬA: vượt 500 kg (hết lô) → giữ nguyên 500', recD.qty === 500);
x2.resetXuong2BoluongForm();

// ─── J. XÓA LƯỢT (+ TOMBSTONE) → LÔ QUAY LẠI DANH SÁCH ──────────
x2.deleteXuong2Boluong(recD.id);
check('XÓA: danh sách giảm 1 lượt (còn 2 lượt của lô mat-a)',
  (state.xuong2BoluongRecords || []).length === 2);
check('XÓA: ghi tombstone (xuong2BoluongRecords)',
  !!(state.deletedIds && state.deletedIds.xuong2BoluongRecords && state.deletedIds.xuong2BoluongRecords[recD.id]));
check('XÓA: lô "luong cây tre" hiện lại ô chọn + tồn quay lại 500 kg',
  document.getElementById('x2-blg-material').innerHTML.includes('luong cây tre') &&
  document.getElementById('x2-mini-count-bo-luong').textContent === 'Tồn 500 kg');
// Bốc nốt lô thứ 2 hết → mọi lô đều hết → placeholder báo hết
document.getElementById('x2-blg-material').value = 'mat-d';
document.getElementById('x2-blg-date').value = '2026-09-12';
document.getElementById('x2-blg-qty').value = '500';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('HẾT LÔ: option placeholder "Hết lô Luồng cây chờ bốc"',
  document.getElementById('x2-blg-material').innerHTML.includes('Hết lô "Luồng cây" chờ bốc'));
check('HẾT LÔ: thanh tồn + mini card = "Hết tồn"',
  document.getElementById('x2-blg-stock-bar').innerHTML.includes('Hết tồn') &&
  document.getElementById('x2-mini-count-bo-luong').textContent === 'Hết tồn');

// ─── K. THU GỌN BẢNG + POPUP ĐỊNH MỨC MỞ/ĐÓNG ───────────────────
x2.toggleX2BoluongTable();
check('BẢNG: thu gọn hoạt động (x2-cut-collapsed)', document.getElementById('x2-blg-table-wrap').classList.contains('x2-cut-collapsed'));
x2.toggleX2BoluongTable();
check('BẢNG: mở rộng lại', !document.getElementById('x2-blg-table-wrap').classList.contains('x2-cut-collapsed'));
check('POPUP ĐM: mở/đóng popup định mức của thẻ Bốc Luồng',
  x2.openX2RatePopup('modal-x2-blg-rate') === true &&
  document.getElementById('modal-x2-blg-rate').classList.contains('show') &&
  x2.closeX2RatePopup('modal-x2-blg-rate') === true);
check('POPUP ĐM: ánh xạ X2_RATE_POPUPS có cặp btn-x2-blg-rate → modal-x2-blg-rate',
  x2.X2_RATE_POPUPS['btn-x2-blg-rate'] === 'modal-x2-blg-rate');

// ─── L. NỐI ĐỦ CÁC MODULE KHÁC ───────────────────────────────────
const rd = f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const jsState = rd('state.js'), jsStorage = rd('storage.js'), jsCloud = rd('cloud.js');
const jsHist = rd('history.js'), jsMain = rd('main.js'), jsEvents = rd('events.js');
const jsCap = rd('capacity.js'), jsXlsx = rd('export-xlsx.js');
check('NỐI (state): key riêng của 2 trường',
  jsState.includes('bamboo_tracker_xuong2_boc_luong_v1') &&
  jsState.includes('bamboo_tracker_x2_boc_luong_rate_v1'));
check('NỐI (storage): restore + 2 đường nạp file + snapshot + import',
  jsStorage.includes('function restoreXuong2Boluong') && jsStorage.includes('function restoreX2BoluongRates') &&
  (jsStorage.match(/restoreXuong2Boluong\(/g) || []).length >= 4);
check('NỐI (cloud): snapshot + core + merge + persistAllLocal',
  jsCloud.includes('xuong2BoluongRecords: state.xuong2BoluongRecords') &&
  jsCloud.includes('xuong2BoluongRecords: obj.xuong2BoluongRecords') &&
  jsCloud.includes('remote.xuong2BoluongRecords') &&
  jsCloud.includes('STORAGE_KEY_XUONG2_BOLUONG'));
check('NỐI (history): 2 vùng dữ liệu tab kanban',
  jsHist.includes('xuong2BoluongRecords') && jsHist.includes('x2BoluongRates'));
check('NỐI (main): nạp lúc boot', jsMain.includes('loadXuong2Boluong()') && jsMain.includes('loadX2BoluongRates()'));
check('NỐI (events): wire submit + hủy + thu gọn + lưu định mức + sửa/xóa ủy quyền',
  jsEvents.includes("safeOn('x2-blg-form', 'submit'") &&
  jsEvents.includes("safeOn('btn-cancel-x2-blg'") &&
  jsEvents.includes("safeOn('btn-toggle-x2blg-table'") &&
  jsEvents.includes("safeOn('btn-x2-blg-rate-save'") &&
  jsEvents.includes("closest('[data-x2-blg-edit]')") &&
  jsEvents.includes("closest('[data-x2-blg-delete]')"));
check('NỐI (capacity): dòng công đoạn boluong + khóa giờ sự cố + sparkline',
  jsCap.includes("id: 'boluong'") && jsCap.includes("boluong: 'boluong'") &&
  jsCap.includes('x2-mini-spark-bo-luong'));
check('NỐI (export): nguồn "boluong" + cột + nhánh dựng bảng',
  jsXlsx.includes("id: 'boluong'") && jsXlsx.includes("source === 'boluong'") &&
  jsXlsx.includes('boluongDisplay'));
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('CẤU TRÚC (sw.js): CACHE_NAME đã tăng v203', /nha-may-ngoc-son-v225/.test(swSrc));

// ─── M. BẢNG TỔNG HỢP CÔNG SUẤT ĐỌC ĐÚC DỮ LIỆU THẺ ────────────
const cap = await import('../js/capacity.js');
const blgSt = cap.CAP_STAGES.find(s => s.id === 'boluong');
check('CAPACITY: dòng boluong đơn vị kg/h + cardId đúng thẻ',
  !!blgSt && blgSt.unit === 'kg/h' && blgSt.cardId === 'x2-bo-luong-card');
state.xuong2BoluongRecords = [{
  id: 'x2blg-test', materialId: 'mat-a', materialType: 'Luồng cây xô', supplier: 'Tế',
  inputWeight: 1000, qty: 300, date: '2026-09-10', week: '2026-W37',
  workHours: 9, workHoursHC: 9, workHoursTC: 0,
  createdAt: '2026-09-10T03:00:00.000Z'
}];
const blgRows = blgSt.rows();
check('CAPACITY: rows() trả qty = 300 kg + giờ 9h (đúng nguồn thẻ Bốc Luồng)',
  blgRows.length === 1 && blgRows[0].qty === 300 && blgRows[0].hours === 9);
state.xuong2BoluongRecords = [];

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);






