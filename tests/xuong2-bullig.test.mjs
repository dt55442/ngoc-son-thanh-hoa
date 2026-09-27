// tests/xuong2-bullig.test.mjs — Kiểm thử VỊ TRÍ "BULLIG" (Xưởng 2) — 2 công đoạn nhỏ
// trong 1 thẻ: GIA CÔNG (chọn thanh thô từ LÔ Ở KHO Dùng Cho = Bullig; SL x/tổng đã
// chọn; KÍCH THƯỚC THÀNH PHẨM có gợi ý từ lịch sử) + CHỌN THANH (Loại thanh = cỡ
// thành phẩm Gia công còn lại; SL đạt + SL lỗi → Tổng tự tính). Bảng phụ ĐỊNH MỨC theo
// tháng + TỪNG công đoạn (thanh/h), bảng dữ liệu dạng THẺ NGÀY CHIA 2 VÙNG, người làm +
// giờ HC/TC tự động từ phân vị "Gia công Bullig" / "Chọn thanh Bullig".
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-chon-nan-tho.test.mjs) ────────
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


const { state, STORAGE_KEY_XUONG2_BULLIG, STORAGE_KEY_X2_BULLIG_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// ─── Dữ liệu mẫu: LÔ Ở KHO (đã qua Sấy 2) — 2 lô Dùng Cho Bullig, 1 lô Ván ───
state.batches = [
  { id: 'k1', code: 'LOT-B1', stage: 'kho', useFor: 'Bullig', quantity: 1000,
    dimensions: [1250, 80, 12], location: 'K1', materialType: 'Luồng cây xô', supplier: 'Nhà Tế',
    date: '2026-09-10', khoDate: '2026-09-15', createdAt: '2026-09-15T02:00:00.000Z' },
  { id: 'k2', code: 'LOT-V1', stage: 'kho', useFor: 'Ván', quantity: 500,
    dimensions: [1300, 90, 15], location: 'K2', createdAt: '2026-09-15T03:00:00.000Z' },
  { id: 'k3', code: 'LOT-B2', stage: 'kho', useFor: 'Bullig', quantity: 400,
    dimensions: [1250, 80, 12], location: 'K3', createdAt: '2026-09-16T03:00:00.000Z' }
];
state.xuong2BulligRecords = [];
state.x2BulligRates = { gc: {}, ct: {} };
state.x2BulligEditId = null;
state.x2BulligPicked = [];

// ─── Nhân Sự: phân vị "Gia công Bullig" + "Chọn thanh Bullig" (Xưởng 2) ───
state.hrEmployees = [
  { id: 'empG', name: 'Nguyễn Văn Giáp', quitDate: '' },
  { id: 'empC', name: 'Trần Thị Chọn', quitDate: '' },
  { id: 'empOther', name: 'Lê Văn Khác', quitDate: '' }
];
state.hrPositions = [
  { id: 'pgc', name: 'Gia công Bullig', department: 'Xưởng 2' },
  { id: 'pct', name: 'Chọn thanh Bullig', department: 'Xưởng 2' },
  { id: 'pkhac', name: 'Bào Tinh', department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'a-gc', date: '2026-09-16', department: 'Xưởng 2', positionId: 'pgc', employeeId: 'empG', start: '07:00', end: '12:00' },
  { id: 'a-ct', date: '2026-09-16', department: 'Xưởng 2', positionId: 'pct', employeeId: 'empC', start: '13:00', end: '' },
  { id: 'a-khac', date: '2026-09-16', department: 'Xưởng 2', positionId: 'pkhac', employeeId: 'empOther', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');

// ─── A. THẺ LAUNCHER + MỞ POP-UP (lỗi "pop-up không nổi lên" phải không còn) ───
x2.renderXuong2Cards();
check('THẺ: mini card Bullig chưa có lượt → "Chưa ghi"',
  document.getElementById('x2-mini-count-bullig').textContent === 'Chưa ghi');
check('THẺ: thẻ Bullig KHÔNG còn cờ "soon" (đã bật chức năng)',
  !x2.X2_CARD_DEFS['x2-bullig-card'].soon);
check('THẺ: mở thẻ Bullig trả về true (không ném lỗi khi render)', x2.x2OpenCard('x2-bullig-card') === true);
check('THẺ: pop-up bật + thẻ Bullig hiện (không còn x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bullig-card').classList.contains('x2-card-hidden'));
check('THẺ: thẻ đang mở được ghi vào state (cho Lịch Sử/Xuất Excel + AI)',
  state.x2OpenCardId === 'x2-bullig-card');
check('THẺ: vùng dữ liệu Lịch sử + nguồn Xuất Excel của thẻ Bullig',
  x2.x2OpenCardHistoryDomain() === 'xuong2BulligRecords' && x2.x2OpenCardExportSource() === 'bullig');
check('TỒN: chỉ lô Dùng Cho = Bullig (2 lô) — tồn 1.400 thanh',
  document.getElementById('x2-bl-stock-bar').innerHTML.includes('1.400 thanh') &&
  document.getElementById('x2-bl-stock-bar').innerHTML.includes('(2 lô)'));
check('TỒN: thành phẩm chờ Chọn thanh = 0 thanh (chưa gia công)',
  document.getElementById('x2-bl-stock-bar').innerHTML.includes('Tồn thành phẩm chờ Chọn thanh: <strong>0 thanh</strong>'));

// ─── B. DANH SÁCH THẺ LÔ (Gia công) — chọn được NHIỀU ────────────
x2.renderX2BulligLotList();
check('DANH SÁCH LÔ: hiện 2 thẻ lô Bullig (bỏ lô Dùng Cho = Ván)',
  document.getElementById('x2-bl-gc-list').innerHTML.includes('LOT-B1') &&
  document.getElementById('x2-bl-gc-list').innerHTML.includes('LOT-B2') &&
  !document.getElementById('x2-bl-gc-list').innerHTML.includes('LOT-V1'));
check('DANH SÁCH LÔ: bấm thẻ = chọn (data-bl-pick), KHÔNG có ô vuông tích',
  document.getElementById('x2-bl-gc-list').innerHTML.includes('data-bl-pick="k1"') &&
  !document.getElementById('x2-bl-gc-list').innerHTML.includes('type="checkbox"'));

// ─── B1. THẺ LÔ theo khuôn THẺ NGUỒN ".al-card" (2 DÒNG): dòng 1 = Mã lô ·
//        Vị trí · Kích thước (mm) · Phân loại · SL còn lại; dòng 2 = chip
//        Bullig + badge ĐẾM NGÀY S1/S2/K + luồng NL + NCC ─────────────
const blCards = document.getElementById('x2-bl-gc-list').innerHTML;
check('THẺ LÔ: dùng khuôn thẻ nguồn .al-card (2 dòng al-card-main / al-card-sub)',
  /class="al-card[^"]*"\s+data-bl-pick="k1"/.test(blCards) &&
  blCards.includes('al-card-body') && blCards.includes('al-card-main') && blCards.includes('al-card-sub'));
check('THẺ LÔ: dòng 1 có ĐỦ Mã lô · Vị trí · Kích thước (mm) · SL còn lại',
  blCards.includes('LOT-B1 · K1 · 1250 × 80 × 12 mm') && blCards.includes('1.000 thanh'));
check('THẺ LÔ: dòng 2 có chip Bullig + badge ĐẾM NGÀY S1/S2/K (mỗi badge 1 màu)',
  /class="al-use-tag use-bullig">Bullig</.test(blCards) &&
  blCards.includes('al-day-badge day-s1') && blCards.includes('al-day-badge day-s2') &&
  blCards.includes('al-day-badge day-k') && /S1-\d+ ngày/.test(blCards) && /K-\d+ ngày/.test(blCards));
check('THẺ LÔ: dòng 2 kèm luồng nguyên liệu + nhà cung cấp của lô',
  blCards.includes('Luồng cây xô') && blCards.includes('Nhà Tế'));

// ─── B2. NÚT "Mở danh sách lô": đóng/mở theo cờ UI, ẩn khi sang Chọn thanh ──
state.x2BulligLotOpen = false;
x2.syncX2BulligKindRows();
check('NÚT: mặc định danh sách thẻ lô ĐÓNG (display: none)',
  document.getElementById('x2-bl-gc-list-row').style.display === 'none');
state.x2BulligLotOpen = true;
x2.syncX2BulligKindRows();
check('NÚT: bấm Mở → danh sách thẻ lô + ô tìm nhanh hiện ra',
  document.getElementById('x2-bl-gc-list-row').style.display === '' &&
  document.getElementById('x2-bl-gc-search-row').style.display === '');
document.getElementById('x2-bl-kind').value = 'ct';
x2.syncX2BulligKindRows();
check('NÚT: chuyển sang Chọn thanh → danh sách thẻ lô tự ẩn',
  document.getElementById('x2-bl-gc-list-row').style.display === 'none');
document.getElementById('x2-bl-kind').value = 'gc';

// ─── C. LƯU LƯỢT GIA CÔNG (SL 700 / tổng đã chọn 1.400) ─────────
state.x2BulligPicked = ['k1', 'k3'];
document.getElementById('x2-bl-kind').value = 'gc';
document.getElementById('x2-bl-date').value = '2026-09-16';
document.getElementById('x2-bl-gc-qty').value = '700';
document.getElementById('x2-bl-out').value = '1250x80x12';

// ─── C0. GỢI Ý "/ TỔNG ĐÃ CHỌN" ngay cạnh ô Số Lượng Gia Công ───
x2.renderX2BulligCalc();
check('GỢI Ý SỐ LƯỢNG: hiện "/ 1.400" cạnh ô nhập (1.000 của k1 + 400 của k3)',
  document.getElementById('x2-bl-gc-total-hint').textContent === '/ 1.400' &&
  !document.getElementById('x2-bl-gc-total-hint').classList.contains('over'));
document.getElementById('x2-bl-gc-qty').value = '2000';
x2.renderX2BulligCalc();
check('GỢI Ý SỐ LƯỢNG: nhập VƯỢT tổng đã chọn → tô đỏ cảnh báo trước khi bấm Lưu',
  document.getElementById('x2-bl-gc-total-hint').classList.contains('over'));
document.getElementById('x2-bl-gc-qty').value = '700';
x2.renderX2BulligCalc();
await x2.handleXuong2BulligSubmit({ preventDefault(){} });
check('LƯU GIA CÔNG: ghi 1 lượt kind = gc',
  state.xuong2BulligRecords.length === 1 && state.xuong2BulligRecords[0].kind === 'gc');
const gc = state.xuong2BulligRecords[0];
check('LƯU GIA CÔNG: chia số lượng vào lô CÒN NHIỀU trước (1.000 của k1 lấy đủ 700)',
  gc.sources.length === 1 && gc.sources[0].batchId === 'k1' && gc.sources[0].qty === 700);
check('LƯU GIA CÔNG: đúng số lượng + kích thước thành phẩm + tổng đã chọn (tự tính)',
  gc.quantity === 700 && gc.outSizeKey === '1250×80×12' && gc.gcTotalPicked === 1400);
check('LƯU GIA CÔNG: SNAPSHOT người làm + giờ từ phân vị "Gia công Bullig" (07:00–12:00 = 4,5h HC sau khi trừ nghỉ trưa)',
  gc.worker === 'Nguyễn Văn Giáp' && gc.workHoursHC === 4.5 && gc.workHoursTC === 0);
check('LƯU GIA CÔNG: đã ghi localStorage (key riêng của Bullig)',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BULLIG) || '[]').length === 1);
check('TỒN sau Gia công: thành phẩm chờ Chọn thanh = 700 thanh',
  document.getElementById('x2-bl-stock-bar').innerHTML.includes('Tồn thành phẩm chờ Chọn thanh: <strong>700 thanh</strong>'));

// ─── D. Ô "Loại thanh" (Chọn thanh) = cỡ thành phẩm Gia công còn lại ──
document.getElementById('x2-bl-kind').value = 'ct';
x2.syncX2BulligKindRows();
x2.renderX2BulligCard();
const ctSel = document.getElementById('x2-bl-ct-size');
check('CHỌN THANH: ô Loại thanh chỉ hiện cỡ thành phẩm Gia công CÒN LẠI (1250×80×12 · còn 700)',
  ctSel.innerHTML.includes('1250×80×12') && ctSel.innerHTML.includes('còn 700 thanh'));

// ─── E. LƯU LƯỢT CHỌN THANH (đạt 660 + lỗi 40 → Tổng 700) ──────
ctSel.value = '1250×80×12';
document.getElementById('x2-bl-ct-ok').value = '660';
document.getElementById('x2-bl-ct-err').value = '40';
await x2.handleXuong2BulligSubmit({ preventDefault(){} });
const ct = state.xuong2BulligRecords.find(r => r.kind === 'ct');
check('LƯU CHỌN THANH: ghi lượt ct (đạt 660 + lỗi 40 → Tổng tự tính 700)',
  !!ct && ct.qtyOk === 660 && ct.qtyErr === 40 && (ct.qtyOk + ct.qtyErr) === 700);
check('LƯU CHỌN THANH: snapshot giờ từ phân vị "Chọn thanh Bullig" (13:00 → hết ca = 4,5h HC)',
  ct.worker === 'Trần Thị Chọn' && ct.workHoursHC === 4.5);
{
  const before = state.xuong2BulligRecords.length;
  ctSel.value = '1250×80×12';
  document.getElementById('x2-bl-ct-ok').value = '700';
  document.getElementById('x2-bl-ct-err').value = '0';
  await x2.handleXuong2BulligSubmit({ preventDefault(){} });
  check('CHỌN THANH: chặn nhập vượt số thanh còn lại của cỡ (không ghi thêm lượt)',
    state.xuong2BulligRecords.length === before);
}

// ─── F. ĐỊNH MỨC CÔNG SUẤT theo THÁNG + TỪNG CÔNG ĐOẠN ─────────
document.getElementById('x2-bl-rate-kind').value = 'gc';
document.getElementById('x2-bl-rate-month').value = '2026-09';
document.getElementById('x2-bl-rate-value').value = '100';
x2.handleX2BulligRateSave();
check('ĐỊNH MỨC: GIA CÔNG tháng 9 = 100 thanh/h (state + localStorage)',
  state.x2BulligRates.gc['2026-09'] === 100 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BULLIG_RATE) || '{}').gc['2026-09'] === 100);
document.getElementById('x2-bl-rate-kind').value = 'ct';
document.getElementById('x2-bl-rate-value').value = '200';
x2.handleX2BulligRateSave();
check('ĐỊNH MỨC: CHỌN THANH tháng 9 = 200 thanh/h — RIÊNG, không đè Gia công',
  state.x2BulligRates.ct['2026-09'] === 200 && state.x2BulligRates.gc['2026-09'] === 100);
check('ĐỊNH MỨC: chip hiện cả 2 công đoạn kèm tháng',
  document.getElementById('x2-bl-rate-chips').innerHTML.includes('Gia công T9 = 100 thanh/h') &&
  document.getElementById('x2-bl-rate-chips').innerHTML.includes('Chọn thanh T9 = 200 thanh/h'));

// ─── G. BẢNG DỮ LIỆU = THẺ NGÀY CHIA 2 VÙNG ────────────────────
const dayHtml = document.getElementById('x2-bl-day-cards').innerHTML;
check('THẺ NGÀY: MỘT thẻ ngày chứa CẢ 2 vùng công đoạn nhỏ (Gia công + Chọn thanh)',
  (dayHtml.match(/class="x2-day-card"/g) || []).length === 1 &&
  dayHtml.includes('x2-bl-zone-gc') && dayHtml.includes('x2-bl-zone-ct'));
check('THẺ NGÀY: đầu thẻ có Người Gia công + Người Chọn thanh (2 phân vị HR khác nhau)',
  dayHtml.includes('Nguyễn Văn Giáp') && dayHtml.includes('Trần Thị Chọn'));
check('THẺ NGÀY: giờ HC/TC tách riêng từng phân vị (Gia công 4,5h HC · Chọn thanh 4,5h HC)',
  dayHtml.includes('Giờ Gia công:') && dayHtml.includes('Giờ Chọn thanh:') &&
  dayHtml.includes('4,5h HC'));
check('THẺ NGÀY: công suất từng công đoạn (Gia công 700 ÷ 4,5h = 156 · Chọn thanh 700 ÷ 4,5h = 156 thanh/h)',
  dayHtml.includes('CS Gia công: <strong>156 thanh/h</strong>') &&
  dayHtml.includes('CS Chọn: <strong>156 thanh/h</strong>'));
check('THẺ NGÀY: hiệu suất từng công đoạn ÷ định mức tháng (155,6% và 77,8%)',
  dayHtml.includes('155,6%') && dayHtml.includes('77,8%'));
check('THẺ NGÀY: vùng Gia công có nguồn lô · SL x/tổng · k.thước thành phẩm',
  dayHtml.includes('/ 1.400 thanh') && dayHtml.includes('1250×80×12'));
check('THẺ NGÀY: vùng Chọn thanh có tỷ lệ đạt 94,3%',
  dayHtml.includes('94,3%'));
check('BẢNG DỮ LIỆU: mỗi vùng có dòng TỔNG ngày (tfoot) — gia công được + THÔ ĐÃ SỬ DỤNG · chọn thanh đạt/lỗi/tỷ lệ',
  dayHtml.includes('x2-bl-day-total') &&
  dayHtml.includes('Tổng số thanh thô đã sử dụng: <strong>700</strong> thanh') &&
  dayHtml.includes('Tổng ngày: <strong>700</strong> thanh gia công được') &&
  dayHtml.includes('đạt <strong>660</strong> · lỗi <strong>40</strong> · tổng <strong>700</strong> thanh'));
check('BẢNG DỮ LIỆU: thanh tiêu đề ghi TỔNG thanh thô đã dùng của cả lịch sử',
  document.getElementById('x2-bl-table-count').textContent === '2 lượt Bullig · thô đã dùng 700 thanh');
check('THẺ NGÀY vùng Gia công: nguồn lô hiện KÍCH THƯỚC(PHÂN LOẠI,SỐ LƯỢNG thô) — 1250×80×12(—,700)',
  dayHtml.includes('1250×80×12(—,700)') && dayHtml.includes('Lô LOT-B1'));
check('THẺ NGÀY vùng Gia công: dòng SL gia công được (x/tối đa) + Thô dùng kèm hệ số quy đổi',
  dayHtml.includes('SL gia công được (x/tối đa)') &&
  dayHtml.includes('Thô dùng: 700 thanh (1 thô = 1)'));
check('THẺ NGÀY vùng Chọn thanh: hiện THÀNH PHẨM = đúng kích thước đã chọn (hết cảnh "—")',
  /x2-nan-chip">1250×80×12</.test(dayHtml) &&
  dayHtml.includes('Thành phẩm sau Gia công = đúng kích thước này'));

// ─── H. SỬA / XÓA + TOMBSTONE ───────────────────────────────────
x2.editXuong2Bullig(ct.id);
check('SỬA: form nạp đúng công đoạn + đạt/lỗi của lượt Chọn thanh',
  document.getElementById('x2-bl-kind').value === 'ct' &&
  document.getElementById('x2-bl-ct-ok').value === 660 &&
  document.getElementById('x2-bl-ct-err').value === 40);
x2.resetXuong2BulligForm();
check('LÀM MỚI FORM: về công đoạn Gia công + xoá ô nhập',
  document.getElementById('x2-bl-kind').value === 'gc' &&
  document.getElementById('x2-bl-gc-qty').value === '');
{
  const beforeDel = state.xuong2BulligRecords.length;
  x2.deleteXuong2Bullig(gc.id);
  check('XÓA: giảm 1 lượt + có tombstone (đồng bộ xóa đa máy)',
    state.xuong2BulligRecords.length === beforeDel - 1 &&
    !!(state.deletedIds && state.deletedIds.xuong2BulligRecords && state.deletedIds.xuong2BulligRecords[gc.id]));
}

// ─── K. HỆ SỐ QUY ĐỔI TỪ ĐỊNH MỨC BẢNG KẾ HOẠCH (1 thô = 6 thành phẩm) ──
// Định mức "Bullig": số thanh nan cho 1 sản phẩm = 1/6 ⇒ 1 thanh thô làm ra 6 thanh
state.materialRates = [
  { id: 'rate-bl', product: 'Bullig 1250x80x12', nan1: '1250×80×12', nan1Qty: 1 / 6,
    nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 1, additive: 0.1, efficiency: 100 }
];
state.x2BulligPicked = ['k1'];
document.getElementById('x2-bl-kind').value = 'gc';
document.getElementById('x2-bl-date').value = '2026-09-20';
document.getElementById('x2-bl-out').value = '1250x80x12';
x2.renderX2BulligCalc();
check('HỆ SỐ QUY ĐỔI: chip cạnh ô Số Lượng = "1 thanh thô = 6 thanh gia công" (định mức nan = 1/6)',
  document.getElementById('x2-bl-gc-conv-hint').textContent === '1 thanh thô = 6 thanh gia công' &&
  !document.getElementById('x2-bl-gc-conv-hint').classList.contains('warn'));
check('HỆ SỐ QUY ĐỔI: gợi ý "/ tối đa" = 1.000 thanh thô × 6 = 6.000 thanh gia công được',
  document.getElementById('x2-bl-gc-total-hint').textContent === '/ 6.000');
check('HỆ SỐ QUY ĐỔI: ô tự tính nêu Thô đã chọn · Gia công được tối đa (= thô × hệ số)',
  document.getElementById('x2-bl-calc').innerHTML.includes('Thô đã chọn:') &&
  document.getElementById('x2-bl-calc').innerHTML.includes('Gia công được tối đa:') &&
  document.getElementById('x2-bl-calc').innerHTML.includes('(= 1.000 × 6)'));

// LƯU: nhập SỐ LƯỢNG GIA CÔNG ĐƯỢC 4.200 → thanh thô tiêu thụ = 4.200 ÷ 6 = 700
document.getElementById('x2-bl-gc-qty').value = '4200';
x2.renderX2BulligCalc();
check('HỆ SỐ QUY ĐỔI: ô tự tính quy đổi ra THÔ CẦN DÙNG = 700 thanh (4.200 ÷ 6)',
  document.getElementById('x2-bl-calc').innerHTML.includes('Thô cần dùng:') &&
  document.getElementById('x2-bl-calc').innerHTML.includes('700 thanh'));
await x2.handleXuong2BulligSubmit({ preventDefault(){} });
const gc2 = state.xuong2BulligRecords.filter(r => r.kind === 'gc').pop();
check('LƯU GIA CÔNG: quantity = SỐ LƯỢNG GIA CÔNG ĐƯỢC (4.200 thành phẩm) + chốt hệ số 6 vào lượt',
  !!gc2 && gc2.quantity === 4200 && gc2.convertFactor === 6 && gc2.qtyIn === 700);
check('LƯU GIA CÔNG: trừ tồn lô theo THÔ tiêu thụ (700 thanh của k1) · tổng thô đã chọn = 1.000',
  gc2.sources.length === 1 && gc2.sources[0].batchId === 'k1' && gc2.sources[0].qty === 700 &&
  gc2.gcTotalPicked === 1000);
check('TỒN: thành phẩm chờ Chọn thanh = 4.200 gia công được − 700 đã chọn = 3.500 thanh',
  document.getElementById('x2-bl-stock-bar').innerHTML.includes('Tồn thành phẩm chờ Chọn thanh: <strong>3.500 thanh</strong>'));
{
  const before = state.xuong2BulligRecords.length;
  state.x2BulligPicked = ['k1'];                 // còn 300 thanh thô → tối đa 1.800 thành phẩm
  document.getElementById('x2-bl-gc-qty').value = '9000';
  await x2.handleXuong2BulligSubmit({ preventDefault(){} });
  check('LƯU GIA CÔNG: CHẶN số lượng vượt khả năng (thanh thô × hệ số quy đổi) — không ghi lượt',
    state.xuong2BulligRecords.length === before);
}
// Chưa khai định mức Bullig ở tab Kế Hoạch → cảnh báo + tạm tính 1 thô = 1 thành phẩm
state.materialRates = [];
document.getElementById('x2-bl-out').value = '1250x80x12';
x2.renderX2BulligCalc();
check('HỆ SỐ QUY ĐỔI: chưa có định mức Bullig → chip CẢNH BÁO + tạm tính 1 thanh thô = 1 thanh',
  document.getElementById('x2-bl-gc-conv-hint').classList.contains('warn') &&
  document.getElementById('x2-bl-gc-conv-hint').textContent === '1 thanh thô = 1 thanh gia công');

// ─── K2. LÔ ĐÃ DÙNG HẾT → TỰ ẨN KHỎI DANH SÁCH CHỌN LÔ ──────────
state.materialRates = [
  { id: 'rate-bl', product: 'Bullig 1250x80x12', nan1: '1250×80×12', nan1Qty: 1 / 6,
    nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 1, additive: 0.1, efficiency: 100 }
];
document.getElementById('x2-bl-kind').value = 'gc';
document.getElementById('x2-bl-out').value = '1250x80x12';
document.getElementById('x2-bl-date').value = '2026-09-21';
// Lô k3 (400 thô) còn nguyên → gia công 2.400 thành phẩm = dùng hết 400 thô
state.x2BulligPicked = ['k3'];
document.getElementById('x2-bl-gc-qty').value = '2400';
await x2.handleXuong2BulligSubmit({ preventDefault(){} });
check('LÔ: dùng hết lô k3 (400 thanh thô) — nguồn của lượt chỉ còn k3',
  (() => { const r = state.xuong2BulligRecords.filter(x => x.kind === 'gc').pop();
    return !!r && r.sources.length === 1 && r.sources[0].batchId === 'k3' && r.sources[0].qty === 400; })());
x2.renderX2BulligLotList();
const listAfterUse = document.getElementById('x2-bl-gc-list').innerHTML;
check('THẺ LÔ: lô ĐÃ DÙNG HẾT tự ẨN khỏi danh sách chọn (không còn LOT-B2 · vẫn còn LOT-B1)',
  !listAfterUse.includes('LOT-B2') && !listAfterUse.includes('data-bl-pick="k3"') &&
  listAfterUse.includes('LOT-B1') && listAfterUse.includes('300/1.000 thanh (còn)'));
// Dùng hết nốt phần còn lại của k1 (300 thô × 6 = 1.800) → danh sách TRỐNG
state.x2BulligPicked = ['k1'];
document.getElementById('x2-bl-gc-qty').value = '1800';
await x2.handleXuong2BulligSubmit({ preventDefault(){} });
x2.renderX2BulligLotList();
const listEmpty = document.getElementById('x2-bl-gc-list').innerHTML;
check('THẺ LÔ: hết sạch thanh thô → danh sách TRỐNG + thông báo "đã dùng hết"',
  !listEmpty.includes('data-bl-pick') && listEmpty.includes('đã dùng hết'));
check('TỒN: thanh thô chờ Gia công = 0 thanh (0 lô còn hàng)',
  document.getElementById('x2-bl-stock-bar').innerHTML.includes('Tồn thanh thô chờ Gia công: <strong>0 thanh</strong> (0 lô)'));

// ─── L. LINK SANG BẢNG "KẾ HOẠCH vs ĐÃ ÉP" (tab Tổng Quan) ──────
const press = await import('../js/press.js');
state.materialRates = [
  { id: 'rate-bl', product: 'Bullig 1250x80x12', nan1: '1250×80×12', nan1Qty: 1 / 6,
    nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 1, additive: 0.1, efficiency: 100 }
];
check('LINK ĐÃ ÉP: khớp sản phẩm Bullig của định mức theo KÍCH THƯỚC lượt Chọn thanh',
  press.bulligPlanProductId('1250×80×12') === 'rate-bl' && press.bulligPlanProductId('999×99×99') === '');
const ctOutRows = press.getBulligCtOutputRows();
check('LINK ĐÃ ÉP: kết quả Chọn thanh (đạt 660) gom đúng sản phẩm kế hoạch + ngày',
  ctOutRows.length === 1 && ctOutRows[0].productId === 'rate-bl' &&
  ctOutRows[0].qty === 660 && ctOutRows[0].date === '2026-09-16');
{
  const jsPressSrc = fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8');
  check('LINK ĐÃ ÉP: biểu đồ Kế Hoạch vs Đã Ép CỘNG kết quả Chọn thanh (cả số lượng lẫn m³)',
    jsPressSrc.includes('getBulligCtOutputRows().forEach') &&
    /pressQty\[x\.productId\][\s\S]{0,120}pressVol\[x\.productId\]/.test(jsPressSrc));
}

// ─── I. NỐI DỮ LIỆU (storage/cloud/history/main/export) ────────
const jsStorage = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const jsExport = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const htmlSrc = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const jsXuong2 = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
check('CẤU TRÚC (js): nối storage/cloud/history/main + xuất Excel',
  jsStorage.includes('xuong2BulligRecords') && jsStorage.includes('x2BulligRates') &&
  jsCloud.includes('xuong2BulligRecords') && jsCloud.includes('x2BulligRates') &&
  jsHistory.includes('xuong2BulligRecords') &&
  jsMain.includes('loadXuong2Bullig') && jsMain.includes('loadX2BulligRates') &&
  jsExport.includes("id: 'bullig'"));
check('XUẤT EXCEL nguồn Bullig: cột Thô Dùng · K.Thước Thành Phẩm · SL Gia Công Được/Tối Đa',
  jsExport.includes('SL Gia Công Được / Tối Đa') && jsExport.includes('Thô Dùng (thanh)') &&
  jsExport.includes('bulligLotSizeText'));
check('CẤU TRÚC (index.html): thẻ Bullig có thanh tồn · form đổi theo công đoạn · định mức · thẻ ngày',
  htmlSrc.includes('id="x2-bl-stock-bar"') && htmlSrc.includes('id="x2-bl-kind"') &&
  htmlSrc.includes('id="x2-bl-gc-list"') && htmlSrc.includes('id="x2-bl-ct-size"') &&
  htmlSrc.includes('id="x2-bl-rate-kind"') && htmlSrc.includes('id="x2-bl-day-cards"'));
check('CẤU TRÚC (styles.css): có khối 2 VÙNG thẻ ngày Bullig',
  cssSrc.includes('.x2-bl-zone-gc') && cssSrc.includes('.x2-bl-zone-ct'));
check('CẤU TRÚC (xuong2.js): KHÔNG dùng alNorm (hàm của module khác — từng gây lỗi mở thẻ)',
  !/\balNorm\(/.test(jsXuong2));

// ─── J. CẤU TRÚC FORM MỚI: Công Đoạn + nút chọn lô CHUNG 1 HÀNG; hàng
//        Kích thước + Số lượng có gợi ý "/ tổng đã chọn"; thẻ lô .al-card ──
{
  const rowStart = htmlSrc.lastIndexOf('<div class="x2-form-row">', htmlSrc.indexOf('id="x2-bl-kind"'));
  const rowEnd = htmlSrc.indexOf('</div>', htmlSrc.indexOf('id="x2-bl-gc-btn-group"'));
  const row = htmlSrc.slice(rowStart, rowEnd);
  check('CẤU TRÚC (index.html): Công Đoạn + nút MỞ DANH SÁCH LÔ chung 1 hàng với Ngày',
    row.includes('id="x2-bl-date"') && row.includes('id="x2-bl-kind"') && row.includes('id="x2-bl-gc-btn"'));
}
check('CẤU TRÚC (index.html): Kích Thước Thành Phẩm + Số Lượng cùng hàng, kèm ô gợi ý "/ tổng"',
  /id="x2-bl-gc-group"[\s\S]*?id="x2-bl-out"[\s\S]*?id="x2-bl-gc-qty"[\s\S]*?id="x2-bl-gc-total-hint"/.test(htmlSrc));
check('CẤU TRÚC (xuong2.js): ẩn/hiện theo công đoạn dùng hàng MỚI (bỏ hẳn x2-bl-gc-group-2)',
  jsXuong2.includes("set('x2-bl-gc-btn-group', gc)") &&
  !jsXuong2.includes('x2-bl-gc-group-2') && !htmlSrc.includes('x2-bl-gc-group-2'));
check('CẤU TRÚC (index.html): danh sách lô nằm trong khối .x2-bl-lot-picker (1 cột trên điện thoại)',
  htmlSrc.includes('class="form-group x2-bl-lot-picker"'));
check('CẤU TRÚC (styles.css): gợi ý số lượng (tô đỏ khi vượt) + thẻ lô theo khuôn .al-card',
  cssSrc.includes('.x2-bl-qty-hint') && cssSrc.includes('.x2-bl-qty-hint.over') &&
  cssSrc.includes('.x2-bl-lot-picker .al-card-list') && !cssSrc.includes('.x2-lot-card'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
