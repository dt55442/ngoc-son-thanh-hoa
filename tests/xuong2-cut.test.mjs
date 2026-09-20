// tests/xuong2-cut.test.mjs — Kiểm thử KHU VỰC XƯỞNG 2 (tab Công Đoạn):
// thẻ launcher "Cắt Chọn" — chọn nguyên liệu đầu vào Xưởng 2 (tab Nguyên Liệu),
// tự link Nhà cung cấp / Mã số / KL đầu vào, tự tính KL ngọn/ống loại,
// lưu / sửa / xóa lượt cắt/chọn, pop-up mở-đóng, đếm trên thẻ.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống hr-cards.test.mjs) ──────────────────
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

const { state, STORAGE_KEY_XUONG2_CUTS, STORAGE_KEY_X2_CAP_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu nguyên liệu mẫu (tab Nguyên Liệu) ───────────────────
state.materialRecords = [
  { id: 'mat-a', type: 'Luồng cây xô', supplier: 'Tế',  location: 'xuong-2', inputIndex: 1200, outputIndex: 200, weight: 1000, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'mat-b', type: 'Luồng ống',    supplier: 'Trung', location: 'xuong-2', inputIndex: 800,  outputIndex: 0,   weight: 800,  date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'mat-c', type: 'Thanh tre thô', supplier: 'Khác',  location: 'xuong-1', inputIndex: 500,  outputIndex: 0,   weight: 500,  date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' }
];
state.xuong2CutRecords = [];
// Bảng Thông Tin Nhà Cung (tab Nguyên Liệu) — để kiểm tra Mã NCC khớp mềm "Tế" ≡ "Nhà Tế"
state.suppliers = [{ id: 'sup-te', name: 'Nhà Tế', code: 'NCC01', createdAt: '2026-09-01T00:00:00.000Z' }];
// Dữ liệu Nhân Sự (tab Nhân Sự): NGƯỜI CẮT + THỜI GIAN CẮT TỰ ĐỘNG từ Bảng bố trí
// (vị trí tên chứa "cắt" của Xưởng 2, đúng ngày cắt — ngày 10/09 có 2 người)
state.hrEmployees = [
  { id: 'empA', name: 'Nguyễn Văn A', quitDate: '' },
  { id: 'empB', name: 'Nguyễn Văn B', quitDate: '' },
  { id: 'empC', name: 'Trần Văn C', quitDate: '' }
];
state.hrPositions = [{ id: 'pcat', name: 'Cắt Chọn', department: 'Xưởng 2' }];
state.hrAssignments = [
  { id: 'asg-1', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pcat', employeeId: 'empA', start: '07:00', end: '12:00' },
  { id: 'asg-2', date: '2026-09-10', department: 'Xưởng 2', positionId: 'pcat', employeeId: 'empB', start: '13:00', end: '' }
];

const x2 = await import('../js/xuong2.js');

// ─── A. THẺ LAUNCHER + MỞ/ĐÓNG POP-UP ────────────────────────────
x2.renderXuong2Cards();
check('THẺ: mini card hiển thị TỒN NGUYÊN LIỆU còn lại (không đếm lượt) — "Tồn 1.800 kg"',
  document.getElementById('x2-mini-count-cut').textContent === 'Tồn 1.800 kg');

check('THẺ: x2OpenCard trả về true lần đầu', x2.x2OpenCard('x2-cut-card') === true);
check('THẺ: pop-up bật (overlay có class show)', document.getElementById('x2-detail-overlay').classList.contains('show'));
check('THẺ: bảng Cắt Chọn hiện (không còn x2-card-hidden)', !document.getElementById('x2-cut-card').classList.contains('x2-card-hidden'));
// Stub makeEl.querySelector không hỗ trợ CSS selector (như test hr-cards) →
// tiêu đề pop-up rơi về giá trị mặc định "Vị Trí Xưởng 2"; trên trình duyệt thật
// sẽ là textContent của <h4> trong bảng = "Cắt Chọn — Xưởng 2".
check('THẺ: tiêu đề pop-up được gán (fallback mặc định trong stub)',
  document.getElementById('x2-detail-title').textContent.trim() === 'Vị Trí Xưởng 2');
check('THẺ: bấm lại thẻ đang mở → trả về false (đóng)', x2.x2OpenCard('x2-cut-card') === false);
check('THẺ: sau khi đóng overlay tắt + bảng ẩn lại',
  !document.getElementById('x2-detail-overlay').classList.contains('show')
  && document.getElementById('x2-cut-card').classList.contains('x2-card-hidden'));

// Mở lại để test nội dung
x2.x2OpenCard('x2-cut-card');

// ─── B. Ô CHỌN NGUYÊN LIỆU ĐẦU VÀO XƯỞNG 2 ──────────────────────
const sel = document.getElementById('x2-cut-material');
const optHtml = sel.innerHTML;
check('Ô CHỌN: có "Luồng cây xô" (lô Xưởng 2)', optHtml.includes('Luồng cây xô'));
check('Ô CHỌN: có "Luồng ống" (lô Xưởng 2)', optHtml.includes('Luồng ống'));
check('Ô CHỌN: KHÔNG chứa lô Xưởng 1 ("Thanh tre thô")', !optHtml.includes('Thanh tre thô'));

// ─── C. THANH TỒN GỌN + NGÀY MẶC ĐỊNH ───────────────────────────
sel.value = 'mat-a';
x2.updateXuong2CutLinked();
check('LINK: Ngày cắt/chọn mặc định theo ngày nhập NL = 2026-09-10',
  document.getElementById('x2-cut-date').value === '2026-09-10');
// Thanh tồn = MỘT Ô NHỎ tóm tắt (không còn chip từng lô)
const stockBarHtml = document.getElementById('x2-stock-bar').innerHTML;
check('TỒN GỌN: 1 ô tóm tắt "2 lô · 1.800 kg" (không chip lô)',
  stockBarHtml.includes('2 lô · 1.800 kg') && !stockBarHtml.includes('data-x2-stock-pick'));
check('TỒN GỌN: mini card hiển thị "Tồn 1.800 kg" thay đếm lượt',
  document.getElementById('x2-mini-count-cut').textContent === 'Tồn 1.800 kg');
check('FORM: banner chế độ ghi mới ĐANG ẨN (tiêu đề form + nút Ghi Cắt/Chọn đã bỏ khỏi HTML — xem mục D)',
  document.getElementById('x2-cut-edit-banner').style.display === 'none');

// ─── D. CẤU TRÚC HTML THẬT: form gọn + bảng công suất có sẵn ────
// (stub getElementById tự tạo element cho mọi ID → kiểm tra trên index.html thật)
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('FORM GỌN (index.html): đã bỏ dòng tự tính + các ô lặp + nút Ghi Cắt/Chọn + tiêu đề form',
  !idxHtml.includes('x2-cut-remain-display') && !idxHtml.includes('x2-cut-ratio-display') &&
  !idxHtml.includes('x2-cut-inweight') && !idxHtml.includes('"x2-cut-type"') &&
  !idxHtml.includes('"x2-cut-supplier"') && !idxHtml.includes('"x2-cut-code"') &&
  !idxHtml.includes('btn-add-x2-cut') && !idxHtml.includes('x2-cut-form-title'));
check('CẤU TRÚC (index.html): bảng công suất riêng ĐÃ BỎ — gộp nhóm ngày vào lịch sử',
  !idxHtml.includes('x2-capacity-body') && !idxHtml.includes('x2-capacity-wrap') &&
  !idxHtml.includes('btn-toggle-x2capacity') && idxHtml.includes('x2-cut-table-wrap') &&
  idxHtml.includes('Tỷ lệ QĐ</th>'));
check('CẤU TRÚC (index.html): thanh ĐỊNH MỨC CÔNG SUẤT + cột "Giá ống tương đương" + "KL ống đạt"',
  idxHtml.includes('x2-rate-month') && idxHtml.includes('btn-x2-rate-save') &&
  idxHtml.includes('Giá ống tương đương</th>') && idxHtml.includes('KL ống đạt</th>'));
// Seed ĐỊNH MỨC công suất tháng 9 = 3000 kg/h (nguồn cột Hiệu suất)
state.x2CapRates = { '2026-09': 3000 };
// Điền khối lượng (dùng cho lưu ở mục E — validate khi lưu thay cho dòng tự tính đã gỡ)
document.getElementById('x2-cut-ongluong').value = '400';
document.getElementById('x2-cut-cuidot').value   = '100';
document.getElementById('x2-cut-cayloai').value  = '150';

// ─── E. LƯU LƯỢT CẮT/CHỌN ───────────────────────────────────────
document.getElementById('x2-cut-note').value = 'luồng đạt chuẩn';
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('LƯU: state có đúng 1 lượt cắt/chọn', (state.xuong2CutRecords || []).length === 1);
const rec = state.xuong2CutRecords[0];
check('LƯU: materialId link đúng lô nguyên liệu', rec.materialId === 'mat-a');
check('LƯU: snapshot nhà cung cấp = "Tế"', rec.supplier === 'Tế');
check('LƯU: snapshot KL đầu vào = 1000', rec.inputWeight === 1000);
check('LƯU: KL ống luồng = 400, củi đốt = 100, cây loại = 150',
  rec.klOngLuong === 400 && rec.klCuiDot === 100 && rec.klCayLoai === 150);
check('LƯU: KL ngọn/ống loại tự tính = 350', rec.klNgonOngLoai === 350);
check('LƯU: NGƯỜI CẮT tự động từ Bảng bố trí Nhân Sự (2 người ngày 10/09)',
  rec.cutter === 'Nguyễn Văn A, Nguyễn Văn B');
check('LƯU: THỜI GIAN CẮT tự động = "07:00–12:00, 13:00"', rec.cutTime === '07:00–12:00, 13:00');
check('LƯU: SỐ GIỜ CẮT tự động = 4,5 giờ (07:00–12:00 TRỪ nghỉ trưa 11:30–12:00)', rec.cutHours === 4.5);
check('LƯU: GIỜ CẮT tách HC/TC = 4,5h HC / 0h TC (07:00–11:30 trong ca hành chính; 11:30–12:00 nghỉ trưa)',
  rec.cutHoursHC === 4.5 && rec.cutHoursTC === 0);
check('LƯU: ĐỊNH MỨC tháng 9 = 3000 kg/h có trong state + localStorage (lưu cùng lượt cắt)',
  state.x2CapRates['2026-09'] === 3000);
check('LƯU: tuần tự tạo theo ngày (2026-W…)', String(rec.week || '').startsWith('2026-W'));
check('LƯU: form reset về chế độ ghi mới (x2CutEditId = null)', state.x2CutEditId === null);
check('LƯU: localStorage đã ghi danh sách', JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_CUTS) || '[]').length === 1);
check('LỌC: lô ĐÃ cắt (mat-a "Luồng cây xô") tự ẩn khỏi ô chọn', !sel.innerHTML.includes('Luồng cây xô'));
check('BẢNG: dòng lô có NCC "Tế" + tỷ lệ QĐ "40%" (bảng theo mẫu: không cột Mã NCC)',
  document.getElementById('x2-cut-table-body').innerHTML.includes('Tế') &&
  !document.getElementById('x2-cut-table-body').innerHTML.includes('NCC01') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('40%'));
check('BẢNG (NGƯỜI CẮT SỐNG): người chính kèm giờ + đếm "+1 người khác" (rê chuột xem tên + giờ)',
  document.getElementById('x2-cut-table-body').innerHTML.includes('Nguyễn Văn A') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('07:00–12:00') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('+1 người khác') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('13:00'));
check('NHÓM NGÀY: dòng nhóm hiển thị Ngày 10/09/26 + kèm thứ trong tuần',
  document.getElementById('x2-cut-table-body').innerHTML.includes('10/09/26') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('x2-day-head'));
check('NHÓM NGÀY: giờ cắt tách badge HC/TC = "4,5" / "0" (đặt trước các dòng lô)',
  (() => {
    const tb = document.getElementById('x2-cut-table-body').innerHTML;
    return tb.includes('class="text-center x2-hours-hc"') && tb.includes('4,5') &&
           tb.includes('class="text-center x2-hours-tc"') && tb.includes('0h TC') === false;
  })());
check('NHÓM NGÀY: CÔNG SUẤT THỰC TẾ = KL đầu vào ÷ giờ = 1000/4,5 = "222,22 kg/h"',
  document.getElementById('x2-cut-table-body').innerHTML.includes('222,22 kg/h'));
check('NHÓM NGÀY: HIỆU SUẤT = Công suất thực tế ÷ Định mức = 222,22/3000 = "7,4%"',
  document.getElementById('x2-cut-table-body').innerHTML.includes('7,4%'));
check('DÒNG LÔ: dưới dòng nhóm có đủ 4 khối lượng + tỷ lệ QĐ 40% + ô Giá ống trống (lô "Luồng cây xô")',
  document.getElementById('x2-cut-table-body').innerHTML.includes('Luồng cây xô') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('400') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('350') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('40%') &&
  document.getElementById('x2-cut-table-body').innerHTML.includes('Giá ống tương đương — bổ sung sau'));
check('TỒN GỌN: sau cắt còn "1 lô · 800 kg" chờ xử lý',
  document.getElementById('x2-stock-bar').innerHTML.includes('1 lô · 800 kg'));
check('BẢNG: đếm lịch sử hiển thị "1 lượt đã cắt/chọn"',
  document.getElementById('x2-cut-table-count').textContent === '1 lượt đã cắt/chọn');
check('THẺ: sau lưu mini card cập nhật tồn còn lại = "Tồn 800 kg"',
  document.getElementById('x2-mini-count-cut').textContent === 'Tồn 800 kg');
// Phòng mất dữ liệu Nhân Sự: bố trí bị xóa → bảng dùng snapshot đã lưu cùng lượt cắt
const hrBackup = state.hrAssignments;
state.hrAssignments = [];
x2.renderXuong2CutCard();
check('NGƯỜI CẮT (SNAPSHOT): bố trí Nhân Sự bị xóa → bảng vẫn hiện người cắt đã lưu',
  document.getElementById('x2-cut-table-body').innerHTML.includes('Nguyễn Văn A'));
state.hrAssignments = hrBackup;
x2.renderXuong2CutCard();

// ─── F. SỬA LƯỢT CẮT/CHỌN ───────────────────────────────────────
x2.editXuong2Cut(rec.id);
check('SỬA: vào chế độ sửa (x2CutEditId = id)', state.x2CutEditId === rec.id);
check('SỬA: banner "Đang sửa lượt cắt/chọn" hiện lên (thay tiêu đề form)',
  document.getElementById('x2-cut-edit-banner').style.display === '');
check('SỬA: ô KL ống luồng nạp lại 400', document.getElementById('x2-cut-ongluong').value === '400');
check('SỬA: ô chọn nguyên liệu trỏ về lô gốc', sel.value === 'mat-a');
document.getElementById('x2-cut-cayloai').value = '250';
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('SỬA: cây loại cập nhật 250, ngọn/ống loại còn 250',
  rec.klCayLoai === 250 && rec.klNgonOngLoai === 250);
check('SỬA: sau lưu về lại chế độ ghi mới', state.x2CutEditId === null);

// ─── G. CHẶN DỮ LIỆU KHÔNG HỢP LỆ ──────────────────────────────
x2.editXuong2Cut(rec.id);
document.getElementById('x2-cut-cayloai').value = '2000'; // vượt KL đầu vào
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('CHẶN: không lưu khi tổng khối lượng vượt KL đầu vào', rec.klCayLoai === 250);
x2.resetXuong2CutForm();
check('RESET: form về chế độ ghi mới + xóa các ô khối lượng + banner ẩn lại',
  state.x2CutEditId === null && document.getElementById('x2-cut-ongluong').value === '' &&
  document.getElementById('x2-cut-edit-banner').style.display === 'none');

// ─── H. XÓA LƯỢT CẮT/CHỌN (+ tombstone) ────────────────────────
x2.deleteXuong2Cut(rec.id);
check('XÓA: danh sách về rỗng', (state.xuong2CutRecords || []).length === 0);
check('XÓA: localStorage cũng rỗng', JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_CUTS) || '[]').length === 0);
check('XÓA: đã ghi tombstone (xuong2CutRecords)', !!(state.deletedIds && state.deletedIds.xuong2CutRecords && state.deletedIds.xuong2CutRecords[rec.id]));
check('LỌC: xóa lượt cắt → lô "Luồng cây xô" hiện lại trong ô chọn', sel.innerHTML.includes('Luồng cây xô'));

// ─── I. BẢNG LỊCH SỬ: THU GỌN / MỞ RỘNG ─────────────────────────
x2.toggleX2CutTable();
check('BẢNG: nút thu gọn hoạt động (wrap có class x2-cut-collapsed)',
  document.getElementById('x2-cut-table-wrap').classList.contains('x2-cut-collapsed'));
x2.toggleX2CutTable();
check('BẢNG: mở rộng lại (bỏ class x2-cut-collapsed)',
  !document.getElementById('x2-cut-table-wrap').classList.contains('x2-cut-collapsed'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);