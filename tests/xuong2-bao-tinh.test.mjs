// tests/xuong2-bao-tinh.test.mjs — Kiểm thử VỊ TRÍ "BÀO TINH" (Xưởng 2):
// form gọn (Ngày Bào · Loại Bào: Bào tinh / Bào tinh hạ cấp / Bào thanh ·
// NÚT "Chọn thanh" mở DANH SÁCH THẺ — bấm thẻ để chọn/bỏ chọn, thẻ 2 DÒNG
// CHUẨN như thanh thô của thẻ Bullig (dòng 1 = mã · vị trí · k.thước · loại ·
// SL, dòng 2 = chip Dùng cho + badge ngày S1/S2/K + luồng NL + NCC) + ô tìm
// nhanh, KHÔNG có ô vuông tích),
// BẢNG TỔNG HỢP THEO KÍCH THƯỚC CHUNG (gộp, không chia phân loại): nhập SL
// thanh ĐẠT → SL thanh LỖI TỰ TÍNH = thanh vào − thanh đạt,
// Kích thước sau bào, định mức công suất theo tháng (thanh/h), thẻ ngày,
// lưu/sửa/xóa + tombstone và đồng bộ (localStorage/file/mây).
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-chon-nan-tho.test.mjs) ───────
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
// Giả lập ô nhập trong BẢNG TỔNG HỢP (ô tạo động) → gọi handler thật
function fakeGroupInput(keyAttr, key, partAttr, part, value) {
  const map = {};
  map[keyAttr] = String(key);
  if (partAttr) map[partAttr] = String(part);
  return { target: { value: String(value), getAttribute: (k) => (k in map ? map[k] : null) } };
}
function fakeOkInput(sizeKey, value) { return fakeGroupInput('data-btinh-ok', sizeKey, null, null, value); }
function fakeOutInput(key, part, value) { return fakeGroupInput('data-btinh-out', key, 'data-out-part', part, value); }
// NHÓM MỚI (nguồn PHIẾU XUẤT): KT sau bào nhập 1 DÒNG · SL Lỗi / Tóp / Khác
function fakeRawOutInput(key, value) { return fakeGroupInput('data-btinh-out-raw', key, null, null, value); }
function fakeErrInput(key, value) { return fakeGroupInput('data-btinh-err', key, null, null, value); }
function fakeTopInput(key, value) { return fakeGroupInput('data-btinh-top', key, null, null, value); }
function fakeOtherInput(key, value) { return fakeGroupInput('data-btinh-other', key, null, null, value); }
function fakeOtherNoteInput(key, value) { return fakeGroupInput('data-btinh-other-note', key, null, null, value); }
// Nhập đủ 1 dòng NGUỒN PHIẾU: kích thước sau bào (1 dòng) + Đạt + Lỗi
function fillNoteRow(key, outRaw, ok, err) {
  x2.onBaoTinhGroupInput(fakeRawOutInput(key, outRaw));
  if (ok != null) x2.onBaoTinhGroupInput(fakeOkInput(key, ok));
  if (err != null) x2.onBaoTinhGroupInput(fakeErrInput(key, err));
}
// Nhập đủ 1 dòng (nhánh HẠ CẤP): kích thước sau bào 3 ô + SL đạt
function fillOut(key, d, r, t) {
  x2.onBaoTinhGroupInput(fakeOutInput(key, 'd', d));
  x2.onBaoTinhGroupInput(fakeOutInput(key, 'r', r));
  x2.onBaoTinhGroupInput(fakeOutInput(key, 't', t));
}

const { state, STORAGE_KEY_XUONG2_BAO_TINH, STORAGE_KEY_X2_BAO_TINH_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// ─── Dữ liệu mẫu: 3 LÔ Ở KHO (2 lô CÙNG kích thước) + 1 lô KHÔNG ở Kho ───
state.batches = [
  { id: 'k-1', code: '260910-01', stage: 'kho', date: '2026-09-10', location: 'K11',
    length: 1250, width: 18, thickness: 7, quantity: 800, bambooType: 'A1', useFor: 'Ván',
    createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'k-3', code: '260911-01', stage: 'kho', date: '2026-09-11', location: 'K13',
    length: 1250, width: 18, thickness: 7, quantity: 300, bambooType: 'A', useFor: 'Ván',
    createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'k-2', code: '260912-01', stage: 'kho', date: '2026-09-12', location: 'K12',
    length: 1300, width: 20, thickness: 8, quantity: 500, bambooType: 'A', useFor: 'Ván',
    createdAt: '2026-09-12T02:00:00.000Z' },
  { id: 's-1', code: '260913-01', stage: 'say2', date: '2026-09-13', location: 'LS2',
    length: 1250, width: 18, thickness: 7, quantity: 400, bambooType: 'A', useFor: 'Ván',
    createdAt: '2026-09-13T02:00:00.000Z' }
];
state.xuong2BaoTinhRecords = [];
state.x2BaoTinhRates = {};
// ── NGUỒN MỚI: PHIẾU XUẤT KHO mục đích Bào Tinh (thay cho chọn trực tiếp lô) ──
// nt-1: 2 lô cùng cỡ 1250×18×7 (800 + 300 = 1.100) · nt-2: lô 1300×20×8 (500)
// nt-3: CHỜ DUYỆT (hiện mờ, không chọn được) · nt-4: mục Bullig (không lọt)
state.khoNotes = [
  { id: 'nt-1', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-09-14', qty: 1100,
    lots: [{ batchId: 'k-1', qty: 800 }, { batchId: 'k-3', qty: 300 }] },
  { id: 'nt-2', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-09-15', qty: 500,
    lots: [{ batchId: 'k-2', qty: 500 }] },
  { id: 'nt-3', type: 'xuat', purpose: 'baotinh', status: 'cho_duyet', date: '2026-09-16', qty: 400,
    lots: [{ batchId: 'k-1', qty: 400 }] },
  // nt-5: phiếu CÙNG kích thước 1250×18×7 (ngày 18/09) — dùng để test GỘP 2 PHIẾU
  { id: 'nt-5', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-09-18', qty: 400,
    lots: [{ batchId: 'k-3', qty: 400 }] },
  { id: 'nt-4', type: 'xuat', purpose: 'bullig', status: 'da_duyet', date: '2026-09-17', qty: 600,
    lots: [{ batchId: 'k-1', qty: 600 }] }
];
// Nhân Sự: vị trí "Bào Tinh" (khớp) + "Bào thô" (KHÔNG khớp) + "Bào Ván" (KHÔNG khớp)
state.hrEmployees = [
  { id: 'empTN', name: 'Phạm Văn Tú', quitDate: '' },
  { id: 'empTho', name: 'Lê Văn Bình', quitDate: '' },
  { id: 'empVan', name: 'Đỗ Văn Cường', quitDate: '' }
];
state.hrPositions = [
  { id: 'p-tinh', name: 'Bào Tinh', department: 'Xưởng 2' },
  { id: 'p-tho',  name: 'Bào thô',  department: 'Xưởng 2' },
  { id: 'p-van',  name: 'Bào Ván',  department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'asg-tinh1', date: '2026-09-21', department: 'Xưởng 2', positionId: 'p-tinh', employeeId: 'empTN', start: '07:00', end: '12:00' },
  { id: 'asg-tinh2', date: '2026-09-21', department: 'Xưởng 2', positionId: 'p-tinh', employeeId: 'empTN', start: '13:00', end: '' },
  { id: 'asg-tho',   date: '2026-09-21', department: 'Xưởng 2', positionId: 'p-tho',  employeeId: 'empTho', start: '07:00', end: '12:00' },
  { id: 'asg-van',   date: '2026-09-21', department: 'Xưởng 2', positionId: 'p-van',  employeeId: 'empVan', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');

// ─── A. THẺ LAUNCHER + MỞ POP-UP + FORM GỌN ─────────────────────
x2.renderXuong2Cards();
// BỘ LỌC KỲ (Tuần/Tháng/Năm) mặc định = tuần HÔM NAY → test data (21/09/2026)
// nằm ngoài kỳ đó → chuyển sang chế độ NĂM 2026 để xem toàn bộ dữ liệu mẫu
x2.setX2BaoTinhFilterMode('year');
check('THẺ: mini card Bào Tinh chưa có lượt → "Chưa bào"',
  document.getElementById('x2-mini-count-bao-tinh').textContent === 'Chưa bào');
check('THẺ: KHÔNG còn chip "Sắp có" (chức năng đã bật)',
  !document.getElementById('x2-mini-count-bao-tinh').classList.contains('x2-count-soon'));
check('THẺ: mở thẻ Bào Tinh trả về true', x2.x2OpenCard('x2-bao-tinh-card') === true);
check('THẺ: pop-up bật + thẻ Bào Tinh hiện (không còn x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bao-tinh-card').classList.contains('x2-card-hidden'));
check('TIẾN ĐỘ: chưa có thanh lỗi → "Thanh lỗi chờ hạ cấp: chưa có"',
  document.getElementById('x2-btinh-stock-bar').innerHTML.includes('Thanh lỗi chờ hạ cấp') &&
  document.getElementById('x2-btinh-stock-bar').innerHTML.includes('chưa có'));
document.getElementById('x2-btinh-kind').value = 'tinh';   // (trình duyệt tự chọn option đầu)
x2.updateXuong2BaoTinhLinked();
check('FORM GỌN: Loại bào Bào tinh → hiện NÚT "Chọn thanh", ẩn DÒNG "Bào thanh" (4 trường)',
  document.getElementById('x2-btinh-picker-row').style.display === '' &&
  document.getElementById('x2-btinh-bt-row').style.display === 'none' &&
  document.getElementById('x2-btinh-picker-text').textContent === 'Chọn thanh nan');
check('FORM GỌN: chưa chọn thẻ → bảng tổng hợp ẨN + đếm "Chưa chọn"',
  document.getElementById('x2-btinh-groups').style.display === 'none' &&
  document.getElementById('x2-btinh-picked-count').textContent === 'Chưa chọn');

// ─── B. NÚT "CHỌN THANH" → DANH SÁCH THẺ (bấm chọn / bấm nữa bỏ chọn) ──
check('NÚT CHỌN THANH: bấm mở danh sách thẻ rồi bấm lại thì đóng',
  (document.getElementById('x2-btinh-picker').hidden = true, true) &&   // trạng thái ban đầu: đóng
  x2.x2BaoTinhTogglePicker() === true &&
  document.getElementById('x2-btinh-picker').hidden === false &&
  x2.x2BaoTinhTogglePicker() === false);
const listHtml = document.getElementById('x2-btinh-list').innerHTML;
// ─── THẺ NGUỒN = PHIẾU XUẤT KHO (dòng 1 tóm tắt · dòng 2 chip + badge) ──
check('THẺ PHIẾU: dòng 1 = "Xuất Bào Tinh · 14/09/26 · 1.100 thanh"',
  listHtml.includes('Xuất Bào Tinh · 14/09/26 · 1.100 thanh'));
check('THẺ PHIẾU: dòng 2 chip "Bào Tinh" + badge "N kích thước"',
  listHtml.includes('al-use-tag use-van') && listHtml.includes('>Bào Tinh</span>') &&
  listHtml.includes('al-day-badge day-k') && listHtml.includes('kích thước'));
check('THẺ PHIẾU CHỜ DUYỆT: chip "Chờ duyệt" + class al-card-pending (không chọn được)',
  listHtml.includes('Chờ duyệt') && listHtml.includes('al-card-pending'));
check('PHIẾU MỤC BULLIG KHÔNG LỌT vào danh sách Bào Tinh (17/09 không có)',
  !listHtml.includes('17/09/26'));
check('TOOLTIP liệt kê kích thước + số lượng: "1250x18x7 SL:1100" · "1300x20x8 SL:500"',
  listHtml.includes('1250x18x7 SL:1100') && listHtml.includes('1300x20x8 SL:500'));
check('THẺ PHIẾU: KHÔNG có ô vuông tích (không dùng al-card-check)',
  !listHtml.includes('al-card-check'));
// ─── 2 Ô TÌM: ô CHỮ (ngày phiếu) + ô RIÊNG SỐ LƯỢNG ──────────────
document.getElementById('x2-btinh-search').value = '14/09/26';
x2.renderX2BaoTinhList();
check('Ô CHỮ: gõ "14/09/26" → chỉ còn phiếu ngày 14/09 (nt-1)',
  document.getElementById('x2-btinh-list').innerHTML.includes('1.100 thanh') &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('15/09/26'));
document.getElementById('x2-btinh-search').value = 'zzzz';
x2.renderX2BaoTinhList();
check('Ô CHỮ: không khớp → thông báo "Không tìm thấy thẻ nào khớp"',
  document.getElementById('x2-btinh-list').innerHTML.includes('Không tìm thấy thẻ nào khớp'));
document.getElementById('x2-btinh-search').value = '';
x2.renderX2BaoTinhList();
check('Ô CHỮ: xoá ô tìm → hiện lại toàn bộ phiếu',
  document.getElementById('x2-btinh-list').innerHTML.includes('14/09/26') &&
  document.getElementById('x2-btinh-list').innerHTML.includes('15/09/26'));
document.getElementById('x2-btinh-qty-search').value = '1100';
x2.renderX2BaoTinhList();
check('Ô SỐ LƯỢNG (riêng): gõ "1100" → chỉ phiếu 1.100 thanh (nt-1)',
  document.getElementById('x2-btinh-list').innerHTML.includes('1.100 thanh') &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('15/09/26'));
document.getElementById('x2-btinh-search').value = '1100';
x2.renderX2BaoTinhList();
check('Ô CHỮ tách riêng: gõ "1100" (là SỐ LƯỢNG) ở ô tìm nhanh → không phiếu nào',
  document.getElementById('x2-btinh-list').innerHTML.includes('Không tìm thấy thẻ nào khớp'));
document.getElementById('x2-btinh-search').value = '15/09/26';
document.getElementById('x2-btinh-qty-search').value = '500';
x2.renderX2BaoTinhList();
check('KẾT HỢP 2 Ô (VÀ): chữ "15/09/26" + số "500" → đúng phiếu nt-2',
  document.getElementById('x2-btinh-list').innerHTML.includes('15/09/26') &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('14/09/26'));
document.getElementById('x2-btinh-qty-search').value = '1100';
x2.renderX2BaoTinhList();
check('KẾT HỢP 2 Ô (VÀ): chữ "15/09/26" + số "1100" → không phiếu (nt-2 chỉ 500)',
  document.getElementById('x2-btinh-list').innerHTML.includes('Không tìm thấy thẻ nào khớp'));
document.getElementById('x2-btinh-search').value = '';
document.getElementById('x2-btinh-qty-search').value = '';
x2.renderX2BaoTinhList();
// ─── CHỌN PHIẾU: phiếu CHỜ DUYỆT KHÔNG chọn được ─────────────────
x2.toggleBaoTinhPick('nt-3');
check('PHIẾU CHỜ DUYỆT: bấm thẻ → KHÔNG được chọn (toast + vẫn 0 phiếu)',
  x2.baoTinhPickedIds().length === 0);
x2.toggleBaoTinhPick('nt-1');
check('BẤM THẺ = CHỌN (thẻ tô chip picked + đếm "1 đã chọn")',
  x2.baoTinhPickedIds().join(',') === 'nt-1' &&
  document.getElementById('x2-btinh-picked-count').textContent === '1 đã chọn' &&
  document.getElementById('x2-btinh-list').innerHTML.includes('x2-btinh-card picked'));
x2.toggleBaoTinhPick('nt-1');
check('BẤM LẦN NỮA = BỎ CHỌN (hết chọn + bảng tổng hợp ẩn lại)',
  x2.baoTinhPickedIds().length === 0 &&
  document.getElementById('x2-btinh-groups').style.display === 'none');
x2.toggleBaoTinhPick('nt-1');
check('GỘP THEO KÍCH THƯỚC: 1 phiếu nt-1 → 1 nhóm 1250×18×7 = 1.100 thanh',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].sizeKey === '1250×18×7' &&
  x2.baoTinhGroups()[0].inQty === 1100 &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('1.100'));
x2.toggleBaoTinhPick('nt-5');
check('GỘP 2 PHIẾU CÙNG CỠ → 1 nhóm 1.500 thanh + hiện "2 phiếu"',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].inQty === 1500 &&
  x2.baoTinhGroups()[0].noteIds.join(',') === 'nt-1,nt-5' &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('2 phiếu'));
x2.toggleBaoTinhPick('nt-5');   // bỏ nt-5 → nhóm về 1.100 (chỉ nt-1 tham gia lưu)
check('BỎ CHỌN nt-5 → nhóm 1250×18×7 trở lại 1.100 thanh (1 phiếu)',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].inQty === 1100);
x2.toggleBaoTinhPick('nt-2');
check('CHỌN THÊM cỡ KHÁC → 2 nhóm riêng, mỗi nhóm có ô nhập SL thanh ĐẠT',
  x2.baoTinhGroups().length === 2 &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-ok="1250×18×7"') &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-ok="1300×20×8"'));
check('BẢNG NGUỒN PHIẾU: cột KT sau bào (1 dòng) + SL lỗi + Tóp + Khác + Tồn',
  (() => { const h = document.getElementById('x2-btinh-groups').innerHTML;
    return h.includes('data-btinh-out-raw="1250×18×7"') && h.includes('data-btinh-err="1250×18×7"') &&
      h.includes('data-btinh-top="1250×18×7"') && h.includes('data-btinh-other="1250×18×7"') &&
      h.includes('data-btinh-other-note="1250×18×7"') && h.includes('x2-btinh-ton'); })());

// ─── C. NHẬP KT SAU BÀO (1 DÒNG) + Đạt + Lỗi + Tóp + Khác → LƯU ──
fillNoteRow('1250×18×7', '1240x16x6', 1000, 100);
fillNoteRow('1300×20×8', '1240x16x6', 450, 50);
check('NHẬP THEO DÒNG: nháp Đạt · Lỗi + KT sau bào (1 dòng) riêng từng nhóm',
  x2.baoTinhOkDrafts().get('1250×18×7') === 1000 && x2.baoTinhOkDrafts().get('1300×20×8') === 450 &&
  x2.baoTinhOutDimsOf('1250×18×7').join('×') === '1240×16×6' &&
  x2.baoTinhOutDimsOf('1300×20×8').join('×') === '1240×16×6');
check('CÓ cột SL LỖI nhập tay (nguồn phiếu — KHÔNG còn lỗi tự tính ở form)',
  document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-err="1250×18×7"'));
check('CHẶN: nhập Đạt + Lỗi VƯỢT SL vào → không lưu',
  (function () {
    x2.onBaoTinhGroupInput(fakeErrInput('1250×18×7', '2000'));
    document.getElementById('x2-btinh-date').value = '2026-09-21';
    const n = state.xuong2BaoTinhRecords.length;
    x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
    const ok = state.xuong2BaoTinhRecords.length === n;
    x2.onBaoTinhGroupInput(fakeErrInput('1250×18×7', '100'));   // trả lại 100
    return ok;
  })());
check('CHẶN: xoá hết số liệu cả 2 dòng → không lưu (chưa nhập dòng nào)',
  (function () {
    ['1250×18×7', '1300×20×8'].forEach(k => {
      x2.onBaoTinhGroupInput(fakeOkInput(k, ''));
      x2.onBaoTinhGroupInput(fakeErrInput(k, ''));
      x2.onBaoTinhGroupInput(fakeRawOutInput(k, ''));
    });
    document.getElementById('x2-btinh-date').value = '2026-09-21';
    const n = state.xuong2BaoTinhRecords.length;
    x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
    return state.xuong2BaoTinhRecords.length === n;
  })());
// Nhập lại dòng 1250×18×7 (đạt 1000 · lỗi 100 · tóp 20 · khác 10 = 1130 > 1100!)
// → tóp/khác phải nằm TRONG số vào: đạt 1000 + lỗi 60 + tóp 20 + khác 20 = 1100
fillNoteRow('1250×18×7', '1240x16x6', 1000, 60);
x2.onBaoTinhGroupInput(fakeTopInput('1250×18×7', 20));
x2.onBaoTinhGroupInput(fakeOtherInput('1250×18×7', 20));
x2.onBaoTinhGroupInput(fakeOtherNoteInput('1250×18×7', 'nan ngắn'));
check('TÓP + KHÁC + GHI CHÚ: nháp lưu đúng khi bấm Lưu (dòng 1300 để trống)', (() => {
  x2.renderX2BaoTinhGroups();   // vẽ lại bảng để thấy giá trị nháp
  const h = document.getElementById('x2-btinh-groups').innerHTML;
  return h.includes('data-btinh-top="1250×18×7"') && h.includes('nan ngắn') &&
    h.includes('data-btinh-other="1250×18×7"');
})());
check('TỔNG KẾT: vào 1.600 · đạt 1.000 · có tỷ lệ đạt + thể tích đạt + nguồn PHIẾU XUẤT',
  document.getElementById('x2-btinh-calc').innerHTML.includes('1.600') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('1.000') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('PHIẾU XUẤT KHO mục đích Bào Tinh') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('%') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('m³'));
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('LƯU: dòng 1300×20×8 để TRỐNG bị bỏ qua → chỉ ghi 1 lượt (mỗi kích thước = 1 lượt)',
  state.xuong2BaoTinhRecords.length === 1);
const r1 = state.xuong2BaoTinhRecords[0];
check('LƯU: kind = tinh · 1250×18×7 · RÚT 1.100 · đạt 1.000 · lỗi 60 · tóp 20 · khác 20',
  r1.kind === 'tinh' && r1.inSizeKey === '1250×18×7' && r1.inQty === 1100 &&
  r1.qtyOk === 1000 && r1.qtyErr === 60 && r1.qtyTop === 20 && r1.qtyOther === 20 &&
  r1.otherNote === 'nan ngắn');
check('LƯU: noteUses ghi theo (phiếu, lô) + sources phân bổ FIFO từ phiếu nt-1 (k-1, k-3)',
  Array.isArray(r1.noteUses) && r1.noteUses.length === 2 &&
  r1.noteUses.every(u => u.noteId === 'nt-1') &&
  Array.isArray(r1.sources) && r1.sources.length === 2 &&
  r1.sources.map(s => s.batchId).sort().join(',') === 'k-1,k-3');
check('LƯU: kích thước SAU BÀO 1240×16×6 + người bào/giờ tự động (9h HC, không lấy Bào thô/Bào Ván)',
  r1.outDims[0] === 1240 && r1.outDims[1] === 16 && r1.outDims[2] === 6 &&
  String(r1.worker).includes('Phạm Văn Tú') && !String(r1.worker).includes('Lê Văn Bình') &&
  r1.workHours === 9 && r1.workHoursHC === 9 && r1.workHoursTC === 0);
check('TỒN PHIẾU: nt-1 đã rút hết 1.100 → ẨN khỏi danh sách · nt-5 còn 400 vẫn hiện',
  (x2.khoNoteInputPool('baotinh', null).find(p => p.id === 'nt-1') === undefined) &&
  ((x2.khoNoteInputPool('baotinh', null).find(p => p.id === 'nt-5') || {}).remaining === 400) &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('14/09/26') &&
  document.getElementById('x2-btinh-list').innerHTML.includes('18/09/26'));
x2.toggleBaoTinhPick('nt-2');
document.getElementById('x2-btinh-date').value = '2026-09-21';
fillNoteRow('1300×20×8', '1240x16x6', 450, 50);
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r2 = state.xuong2BaoTinhRecords[1];
check('LƯU lượt 2: cỡ 1300×20×8 rút 500 · đạt 450 · lỗi 50 (nhập tay) · nguồn 1 lô nt-2',
  !!r2 && r2.inSizeKey === '1300×20×8' && r2.inQty === 500 && r2.qtyOk === 450 && r2.qtyErr === 50 &&
  r2.sources.length === 1 && r2.sources[0].batchId === 'k-2' &&
  r2.noteUses.length === 1 && r2.noteUses[0].noteId === 'nt-2');
check('ĐÃ GHI localStorage (key riêng của Bào Tinh): 2 lượt',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BAO_TINH) || '[]').length === 2);

// ─── D. BÀO TINH HẠ CẤP (nguồn = thanh LỖI của Bào Tinh, gom theo cỡ) ──
document.getElementById('x2-btinh-kind').value = 'ha_cap';
x2.updateXuong2BaoTinhLinked();
check('ĐỔI LOẠI BÀO: bỏ hết thẻ đã chọn + nút đổi thành "Chọn thanh lỗi"',
  x2.baoTinhPickedIds().length === 0 &&
  document.getElementById('x2-btinh-picker-text').textContent === 'Chọn thanh lỗi');
const defectList = document.getElementById('x2-btinh-list').innerHTML;
check('THẺ LỖI: chuẩn 2 dòng — "Bào Tinh (chờ hạ cấp) · 1240 × 16 × 6 mm · Thanh lỗi · 110 thanh"',
  defectList.includes('Bào Tinh (chờ hạ cấp) · 1240 × 16 × 6 mm · Thanh lỗi · 110 thanh'));
check('THẺ LỖI: dòng 2 có chip "Bào tinh hạ cấp" + badge "Lỗi Bào Tinh"',
  defectList.includes('al-card-sub') && defectList.includes('>Bào tinh hạ cấp</span>') &&
  defectList.includes('>Lỗi Bào Tinh</span>'));
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.toggleBaoTinhPick('1240×16×6');
x2.onBaoTinhGroupInput(fakeOkInput('1240×16×6', 90));    // vào 110 → lỗi 20
fillOut('1240×16×6', 1230, 14, 5);
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r3 = state.xuong2BaoTinhRecords[2];
check('LƯU HẠ CẤP: kind = ha_cap · nguồn cỡ lỗi 1240×16×6 · vào 110 · đạt 90 · lỗi TỰ TÍNH 20',
  !!r3 && r3.kind === 'ha_cap' && r3.defectKey === '1240×16×6' && r3.inQty === 110 &&
  r3.qtyOk === 90 && r3.qtyErr === 20 && r3.outDims[0] === 1230 && r3.outDims[2] === 5);
check('TỒN LỖI: cỡ 1240×16×6 đã hạ cấp hết (còn 0) · cỡ mới 1230×14×5 có 20 thanh lỗi',
  (x2.baoTinhDefectStock().find(x => x.sizeKey === '1240×16×6') || {}).remaining === 0 &&
  (x2.baoTinhDefectStock().find(x => x.sizeKey === '1230×14×5') || {}).remaining === 20);

// ─── E. BÀO THANH: nguồn ÉP VÁN (nhận diện BẰNG THỂ TÍCH) + LINK ĐẠT từ QC ──
// Nguồn đầu vào = khối "Ván Thô Tạo Ra" của lượt Ép Ván: thanh BTP (thể tích 1
// thanh < 0,0015 m³) được nhận; ván thô (1220×2440×9 = 0,0268 m³) bị loại.
state.pressRecords = [
  { id: 'pr1', date: '2026-09-22', week: '2026-W39', year: 2026, productId: 'rate-x',
    productName: 'Ván 1220x2440x9', fpDim: '1220×2440×9', finishedQty: 40,
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 40, ratio: 1 }, { vtDim: '1200x18x15', vtQty: 1000, ratio: 1 }],
    sticks: [{ nanKey: '1200×24×8', sticks: 5000 }] }
];
document.getElementById('x2-btinh-date').value = '2026-09-21';   // Ngày Bào (nguồn KHÔNG còn lọc theo tuần)
const pressPool = x2.baoTinhInputPool();
const pressItem = pressPool.find(x => x.id === 'p:1200×18×15') || {};
check('BÀO THANH — NGUỒN ÉP VÁN: nhận thanh BTP 1200×18×15 (0,000324 m³) · LOẠI ván thô 1220×2440×9 (0,0268 m³)',
  !!pressItem.inSource && pressItem.inSource === 'press' &&
  pressItem.total === 1000 && pressItem.remaining === 1000 &&
  !pressPool.some(x => x.sizeKey === '1220×2440×9'));
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();
check('BÀO THANH: ẩn nút "Chọn thanh" cũ + hiện DÒNG 4 TRƯỜNG (đầu vào · SL · đầu ra · ĐẠT từ QC)',
  document.getElementById('x2-btinh-picker-row').style.display === 'none' &&
  document.getElementById('x2-btinh-bt-row').style.display === '' &&
  document.getElementById('x2-btinh-bt-in-text').textContent === 'Chọn thanh đầu vào' &&
  document.getElementById('x2-btinh-bt-out-text').textContent === 'Chọn kích thước đầu ra');
const btInList = document.getElementById('x2-btinh-bt-in-list').innerHTML;
check('DANH SÁCH NGUỒN: 1 thẻ "Thanh BTP · 1200 × 18 × 15 mm · còn 1.000/1.000 thanh" + không có ô vuông tích',
  btInList.includes('Thanh BTP · 1200 × 18 × 15 mm · còn 1.000/1.000 thanh') &&
  btInList.includes('Ép Ván (Ván thô tạo ra)') && !btInList.includes('al-card-check'));
check('CỠ ĐẦU RA: đầu vào 1200×18×15 (R×D 270) → đủ 4 cỡ mặc định 640×14×12 · 640×12×10 · 1200×10×10 · 1200×10×8',
  x2.baoTinhBaoThanhOutCandidatesOk([1200, 18, 15], '640×14×12') &&
  x2.baoTinhBaoThanhOutCandidatesOk([1200, 18, 15], '640×12×10') &&
  x2.baoTinhBaoThanhOutCandidatesOk([1200, 18, 15], '1200×10×10') &&
  x2.baoTinhBaoThanhOutCandidatesOk([1200, 18, 15], '1200×10×8'));
check('CỠ ĐẦU RA: đầu vào 640×14×12 (R×D 168) → chỉ còn 640×12×10 · 1200×10×10 · 1200×10×8 (loại chính nó)',
  !x2.baoTinhBaoThanhOutCandidatesOk([640, 14, 12], '640×14×12') &&
  x2.baoTinhBaoThanhOutCandidatesOk([640, 14, 12], '640×12×10') &&
  x2.baoTinhBaoThanhOutCandidatesOk([640, 14, 12], '1200×10×10') &&
  x2.baoTinhBaoThanhOutCandidatesOk([640, 14, 12], '1200×10×8'));
state.x2BaoThanhOutSizes = [];
check('CỠ ĐẦU RA: 4 cỡ mặc định, chưa thêm cỡ nào',
  x2.baoThanhOutList().length === 4 && x2.baoThanhOutList().every(o => o.isDefault));
global.prompt = () => '640x16x10';
x2.addBaoThanhOutSize();
check('CỠ ĐẦU RA: nút "Thêm kích thước" → 5 cỡ (cỡ mới 640×16×10, isDefault false) + lưu localStorage',
  x2.baoThanhOutList().length === 5 &&
  x2.baoThanhOutList().some(o => o.sizeKey === '640×16×10' && !o.isDefault) &&
  JSON.parse(localStorage.getItem('bamboo_tracker_x2_bao_thanh_out_sizes_v1') || '[]').includes('640×16×10'));
state.x2BaoThanhOutSizes = [];   // trả lại 4 cỡ mặc định cho các bước sau
// ① Chọn thanh đầu vào (bấm thẻ nguồn) + ② Số lượng + ③ Đầu ra
x2.setBaoThanhInput('p:1200×18×15');
check('CHỌN ĐẦU VÀO: nút hiện "1200 × 18 × 15 · Thanh BTP" + đếm "còn 1.000/1.000"',
  document.getElementById('x2-btinh-bt-in-text').textContent === '1200 × 18 × 15 · Thanh BTP' &&
  document.getElementById('x2-btinh-bt-in-count').textContent === 'còn 1.000/1.000');
document.getElementById('x2-btinh-bt-qty').value = '300';
x2.renderX2BaoThanhForm();
check('SỐ LƯỢNG: gợi ý tối đa = phần còn lại của nguồn (1.000 thanh)',
  document.getElementById('x2-btinh-bt-qty-hint').textContent.includes('Tối đa 1.000 thanh'));
x2.setBaoThanhOut('640×14×12');
check('CHỌN ĐẦU RA: nút hiện "640 × 14 × 12" + ô ĐẠT mặc định 0 (chờ QC)',
  document.getElementById('x2-btinh-bt-out-text').textContent === '640 × 14 × 12' &&
  document.getElementById('x2-btinh-bt-ok').value === '0');
check('BẢNG TÓM TẮT (CHỈ ĐỌC): 1 dòng — cỡ vào · SL vào 300 · cỡ ra 640×14×12 · ĐẠT 0 · Chờ kiểm',
  (() => {
    const h = document.getElementById('x2-btinh-groups').innerHTML;
    return x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].inQty === 300 &&
      h.includes('SL đạt (từ QC)') && h.includes('Chờ kiểm') &&
      !h.includes('data-btinh-in-qty') && !h.includes('data-btinh-in-dim');
  })());
check('BÀO THANH: KHÔNG còn nút "Thêm hàng thông tin khác" (1 lượt = 1 cặp đầu vào → đầu ra)',
  x2.baoTinhAddRow() === false);
// Chặn: vượt phần còn lại của nguồn
document.getElementById('x2-btinh-date').value = '2026-09-21';
const nE = state.xuong2BaoTinhRecords.length;
document.getElementById('x2-btinh-bt-qty').value = '1200';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('CHẶN (bào thanh): SL vượt phần CÒN LẠI của nguồn → không lưu',
  state.xuong2BaoTinhRecords.length === nE);
// Lưu lượt A: 300 thanh → 640×14×12
document.getElementById('x2-btinh-bt-qty').value = '300';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r4 = state.xuong2BaoTinhRecords[nE];
check('LƯU (bào thanh A): kind bao_thanh · nguồn ÉP VÁN · vào 300 · ra 640×14×12 · ĐẠT/LỖI = 0 (chờ QC)',
  state.xuong2BaoTinhRecords.length === nE + 1 && !!r4 &&
  r4.kind === 'bao_thanh' && r4.inSource === 'press' && r4.inSizeKey === '1200×18×15' &&
  r4.inDims.join('×') === '1200×18×15' && r4.inQty === 300 &&
  r4.outSizeKey === '640×14×12' && r4.outDims.join('×') === '640×14×12' &&
  r4.qtyOk === 0 && r4.qtyErr === 0);
check('LƯU (bào thanh): lưu xong form về mặc định "Bào tinh" + xoá lựa chọn/số lượng',
  document.getElementById('x2-btinh-kind').value === 'tinh' &&
  document.getElementById('x2-btinh-bt-qty').value === '' &&
  x2.baoTinhBaoThanhInItem() === null && x2.baoTinhBaoThanhOutItem() === null);
document.getElementById('x2-btinh-date').value = '2026-09-21';
check('NGUỒN ĐÃ TRỪ: tồn thanh BTP còn 700/1.000 thanh (lượt A đã dùng 300)',
  (x2.baoTinhInputPool().find(x => x.id === 'p:1200×18×15') || {}).remaining === 700 &&
  (x2.baoTinhInputPool().find(x => x.id === 'p:1200×18×15') || {}).used === 300);
// Lưu lượt B: 200 thanh → 1200×10×8 (giữ nguyên tổng 500 vào của ngày — như bản cũ)
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();
x2.setBaoThanhInput('p:1200×18×15');
document.getElementById('x2-btinh-bt-qty').value = '200';
x2.setBaoThanhOut('1200×10×8');
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r5 = state.xuong2BaoTinhRecords[nE + 1];
check('LƯU (bào thanh B): vào 200 · ra 1200×10×8 · nguồn ÉP VÁN',
  !!r5 && r5.kind === 'bao_thanh' && r5.inQty === 200 && r5.outSizeKey === '1200×10×8' &&
  r5.inSource === 'press');
// ─── LINK TỪ TAB QC ("Kiểm thanh"): ĐẠT = Σ (Đạt + Ngoại lệ) · LỖI = đã kiểm − đạt ──
state.qcFinalRecords = [
  { id: 'qcfA', date: '2026-09-22', workshop: 'x2', kind: 'thanh', sizeKey: '640×14×12', sizeDims: [640, 14, 12],
    inputQty: 300, qtyOk: 290, qtyExcept: 0, qtyReject: 10 },
  { id: 'qcfB', date: '2026-09-22', workshop: 'x2', kind: 'thanh', sizeKey: '1200×10×8', sizeDims: [1200, 10, 8],
    inputQty: 200, qtyOk: 200, qtyExcept: 0, qtyReject: 0 }
];
check('LINK QC: lượt A — đã kiểm 300/300 · ĐẠT 290 · LỖI 10 (đã kiểm − đạt) · chờ kiểm 0',
  x2.baoTinhCheckedOf(r4) === 300 && x2.baoTinhQtyOkOf(r4) === 290 &&
  x2.baoTinhQtyErrOf(r4) === 10 && x2.baoTinhPendingOf(r4) === 0);
check('LINK QC: lượt B — ĐẠT 200 · LỖI 0 · KHÔNG lấy nhầm số của cỡ khác',
  x2.baoTinhQtyOkOf(r5) === 200 && x2.baoTinhQtyErrOf(r5) === 0);
check('LINK QC: 2 lượt CÙNG cỡ → PHÂN BỔ theo ngày (tổng đạt không vượt số đã kiểm)',
  (() => {
    // lượt thứ 3 CÙNG cỡ 640×14×12 (500 thanh) + QC cộng thêm 350 → lượt CŨ nhận đủ 300 trước,
    // lượt mới nhận 350 (KHÔNG cộng trùng vào lượt cũ)
    document.getElementById('x2-btinh-kind').value = 'bao_thanh';
    x2.updateXuong2BaoTinhLinked();
    x2.setBaoThanhInput('p:1200×18×15');
    document.getElementById('x2-btinh-bt-qty').value = '500';
    x2.setBaoThanhOut('640×14×12');
    document.getElementById('x2-btinh-date').value = '2026-09-23';
    x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
    const r6 = state.xuong2BaoTinhRecords[nE + 2];
    state.qcFinalRecords.push({ id: 'qcfA2', date: '2026-09-24', workshop: 'x2', kind: 'thanh',
      sizeKey: '640×14×12', sizeDims: [640, 14, 12], inputQty: 350, qtyOk: 315, qtyExcept: 0, qtyReject: 35 });
    const totalOk = x2.baoTinhQtyOkOf(r4) + x2.baoTinhQtyOkOf(r6);
    const ok = x2.baoTinhCheckedOf(r4) === 300 && x2.baoTinhQtyOkOf(r4) === 290 &&   // lượt CŨ nhận trước
      x2.baoTinhCheckedOf(r6) === 350 && x2.baoTinhQtyOkOf(r6) === 315 &&          // lượt mới nhận phần còn
      Math.abs(totalOk - 605) < 0.01;                                               // = 290 + 315
    state.xuong2BaoTinhRecords = state.xuong2BaoTinhRecords.filter(x => x !== r6);   // dọn lượt + QC phụ
    state.qcFinalRecords = state.qcFinalRecords.filter(x => x.id !== 'qcfA2');
    return ok;
  })());
check('CHỜ KIỂM: lượt CHƯA có kết quả QC → ĐẠT 0 (KHÔNG bịa thành lỗi) · chờ kiểm = số thanh vào',
  x2.baoTinhQtyOkOf({ id: 'x', kind: 'bao_thanh', inQty: 300, outSizeKey: '999×9×9' }) === 0 &&
  x2.baoTinhQtyErrOf({ id: 'x', kind: 'bao_thanh', inQty: 300, outSizeKey: '999×9×9' }) === 0 &&
  x2.baoTinhPendingOf({ id: 'x', kind: 'bao_thanh', inQty: 300, outSizeKey: '999×9×9' }) === 300);
// ── NGUỒN ĐẦU VÀO BÀO THANH: thanh BTP Ép Ván + THẺ LỖI của chính Bào thanh ──
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();          // vẽ lại ô chọn đầu vào
const bthPool = x2.baoTinhInputPool();
check('THẺ LỖI BÀO THANH Ở Ô CHỌN ĐẦU VÀO: thẻ "d:640×14×12" (lỗi 10 thanh từ lượt A) · inSource "defect" · cls "Thanh lỗi"',
  bthPool.some(x => x.id === 'd:640×14×12' && x.inSource === 'defect' && x.cls === 'Thanh lỗi' &&
    x.total === 10 && x.remaining === 10) &&
  document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('Thanh lỗi Bào thanh'));
check('CHỈ LỖI CỦA BÀO THANH: lỗi do "Bào tinh" (cỡ 1240×16×6) và do "Hạ cấp" (cỡ 1230×14×5) KHÔNG vào ô chọn',
  !bthPool.some(x => x.id === 'd:1240×16×6') && !bthPool.some(x => x.id === 'd:1230×14×5'));
document.getElementById('x2-btinh-kind').value = 'ha_cap';
x2.updateXuong2BaoTinhLinked();
check('SỔ TỒN LỖI DÙNG CHUNG 1 CỠ: thẻ "Thanh lỗi chờ hạ cấp" vẫn thấy 640×14×12 = 10 thanh (chưa lượt nào bào lại)',
  ((x2.baoTinhDefectStock().find(x => x.sizeKey === '640×14×12') || {}).remaining === 10));
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();

// ── LOẠI BULLIG + KHÔNG LỌC THEO TUẦN + KHÔNG PHỤ THUỘC NGÀY BÀO ──
document.getElementById('x2-btinh-date').value = '2026-09-21';
state.materialRates = [{ id: 'rate-bullig', product: '1200x18x15', nanUse: 'Bullig', unit: 'Thanh' }];
state.pressRecords.push({ id: 'pr2', date: '2026-09-24', week: '2026-W39', year: 2026,
  productId: 'rate-bullig', productName: '1200x18x15',
  vanTho: [{ vtDim: '1200x18x15', vtQty: 700 }] });
check('LOẠI BULLIG: lượt ép sản phẩm Bullig (700 thanh) KHÔNG vào nguồn — tổng vẫn 1.000 (không 1.700)',
  (x2.baoTinhInputPool().find(x => x.id === 'p:1200×18×15') || {}).total === 1000 &&
  x2.baoThanhIsBulligPress(state.pressRecords.find(r => r.id === 'pr2')));
state.pressRecords.push({ id: 'pr3', date: '2026-09-10', week: '2026-W37', year: 2026,
  productId: 'rate-x', productName: 'Ván 1220x2440x9',
  vanTho: [{ vtDim: '1200x18x15', vtQty: 500 }] });
check('KHÔNG LỌC THEO TUẦN: lượt ép tuần 37 (ngoài tuần Ngày Bào 21/09) VẪN vào nguồn — tổng 1.500',
  (x2.baoTinhInputPool().find(x => x.id === 'p:1200×18×15') || {}).total === 1500);
check('ĐÃ XÓA HẲN CẶP TUẦN: không còn hàm baoTinhPairWeeks/baoTinhInPairOf + đã có baoThanhDefectPool',
  typeof x2.baoTinhPairWeeks === 'undefined' && typeof x2.baoTinhInPairOf === 'undefined' &&
  typeof x2.baoThanhDefectPool === 'function');
state.pressRecords = state.pressRecords.filter(r => r.id !== 'pr3');   // dọn lượt phụ
check('KHÔNG PHỤ THUỘC NGÀY BÀO: để trống Ngày Bào danh sách nguồn VẪN đủ (thẻ lỗi + BTP)', (() => {
  document.getElementById('x2-btinh-date').value = '';
  x2.renderX2BaoThanhForm();
  const h = document.getElementById('x2-btinh-bt-in-list').innerHTML;
  const pool = x2.baoTinhInputPool();
  document.getElementById('x2-btinh-date').value = '2026-09-21';
  x2.renderX2BaoThanhForm();
  return h.includes('không lọc theo tuần') &&
    pool.some(x => x.id === 'p:1200×18×15') && pool.some(x => x.id === 'd:640×14×12');
})());
// ─── 2 Ô TÌM KẾT HỢP: ô CHỮ (kích thước/nguồn/loại) + ô RIÊNG SỐ LƯỢNG (điều kiện VÀ) ──
document.getElementById('x2-btinh-date').value = '2026-09-21';
document.getElementById('x2-btinh-bt-in-qty-search').value = '500';
x2.renderBaoThanhInputList();
check('TÌM SỐ LƯỢNG (ô RIÊNG): gõ "500" khớp thẻ "còn 500/1.000 thanh"', (() => {
  const ok = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('còn 500/1.000 thanh');
  document.getElementById('x2-btinh-bt-in-qty-search').value = '99999';
  x2.renderBaoThanhInputList();
  const none = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('Không tìm thấy');
  document.getElementById('x2-btinh-bt-in-qty-search').value = '';
  x2.renderBaoThanhInputList();
  return ok && none;
})());
check('Ô CHỮ tách riêng: gõ "500" (là SỐ LƯỢNG) ở ô tìm nhanh → không thẻ nào khớp', (() => {
  document.getElementById('x2-btinh-bt-in-search').value = '500';
  x2.renderBaoThanhInputList();
  const none = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('Không tìm thấy');
  document.getElementById('x2-btinh-bt-in-search').value = '';
  x2.renderBaoThanhInputList();
  return none;
})());
check('KẾT HỢP 2 Ô (VÀ): chữ "1200" + số "500" → đúng thẻ BTP; chữ "640" + số "500" → không thẻ', (() => {
  document.getElementById('x2-btinh-bt-in-search').value = '1200';
  document.getElementById('x2-btinh-bt-in-qty-search').value = '500';
  x2.renderBaoThanhInputList();
  const hit = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('còn 500/1.000 thanh');
  document.getElementById('x2-btinh-bt-in-search').value = '640';
  x2.renderBaoThanhInputList();
  const miss = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('Không tìm thấy');
  document.getElementById('x2-btinh-bt-in-search').value = '';
  document.getElementById('x2-btinh-bt-in-qty-search').value = '';
  x2.renderBaoThanhInputList();
  return hit && miss;
})());
check('TÌM NHANH CHUNG: chuẩn hóa bỏ dấu phân cách nghìn (gõ 1000 khớp 1.000)',
  x2.baoTinhSearchNorm('1.000') === '1000' && x2.baoTinhSearchNorm('1.000/1.000').includes('1000'));
state.materialRates = [];   // dọn dữ liệu phụ
// SỬA lượt bào thanh: khôi phục nguồn + cỡ đầu ra + số lượng (ĐẠT đọc LIVE từ QC)
x2.editXuong2BaoTinh(r4.id);
check('SỬA (bào thanh): khôi phục nguồn Ép Ván 1200×18×15 + cỡ ra 640×14×12 + SL 300 + ĐẠT 290 (live từ QC)',
  x2.baoTinhBaoThanhInItem() && x2.baoTinhBaoThanhInItem().id === 'p:1200×18×15' &&
  x2.baoTinhBaoThanhOutItem() && x2.baoTinhBaoThanhOutItem().sizeKey === '640×14×12' &&
  document.getElementById('x2-btinh-bt-qty').value === '300' &&
  document.getElementById('x2-btinh-bt-ok').value === '290');
x2.resetXuong2BaoTinhForm();
x2.renderX2BaoTinhCard();   // vẽ lại thẻ ngày theo số ĐẠT/LỖI LIVE từ QC
check('THẺ NGÀY (bào thanh): nhánh ghi nguồn "Thanh BTP Ép Ván · 1200 × 18 × 15 mm · 300 thanh"',
  document.getElementById('x2-btinh-day-cards').innerHTML.includes('Thanh BTP Ép Ván · 1200 × 18 × 15 mm · 300 thanh'));

// ─── F. THẺ NGÀY + ĐỊNH MỨC CÔNG SUẤT (thanh/h) ─────────────────
const dayHtml = document.getElementById('x2-btinh-day-cards').innerHTML;
check('THẺ NGÀY: đầu thẻ hiện Ngày 21/09/26 + người bào + giờ HC/TC',
  dayHtml.includes('x2-day-head') && dayHtml.includes('21/09/26') &&
  dayHtml.includes('Phạm Văn Tú') && dayHtml.includes('9h HC') && dayHtml.includes('0h TC'));
check('THẺ NGÀY: đủ 3 nhánh theo Loại bào (Bào tinh · Bào tinh hạ cấp · Bào thanh)',
  dayHtml.includes('Bào tinh') && dayHtml.includes('Bào tinh hạ cấp') && dayHtml.includes('Bào thanh'));
check('THẺ NGÀY: nhánh bào tinh ghi nguồn PHIẾU XUẤT (ngày 14/09/26 · 1250×18×7 · K11, K13)',
  dayHtml.includes('Phiếu xuất Bào Tinh 14/09/26') && dayHtml.includes('1250×18×7') &&
  dayHtml.includes('K11, K13'));
check('THẺ NGÀY: nhánh hạ cấp ghi "Thanh lỗi của Bào Tinh · cỡ 1240 × 16 × 6"',
  dayHtml.includes('Thanh lỗi của Bào Tinh') && dayHtml.includes('1240 × 16 × 6'));
check('THẺ NGÀY: tổng vào 2.210 · đạt 2.030 · lỗi 140 · công suất 2.210 ÷ 9 = 246 thanh/h',
  dayHtml.includes('2.210 thanh') && dayHtml.includes('2.030 thanh') &&
  dayHtml.includes('140 thanh') && dayHtml.includes('246 thanh/h'));
// ── ĐỊNH MỨC 3 CỘT (popup trong form nhập) ──
x2.openX2BaoTinhRateModal();
check('POPUP ĐỊNH MỨC: mở được (overlay show) + bảng có hàng tháng 2026-09 với 3 ô nhập',
  document.getElementById('modal-x2-btinh-rate').classList.contains('show') &&
  document.getElementById('x2-btinh-rate-rows').innerHTML.includes('Tháng 9/2026') &&
  !!document.getElementById('x2-btinh-rate-2026-09-tinh') &&
  !!document.getElementById('x2-btinh-rate-2026-09-ha_cap') &&
  !!document.getElementById('x2-btinh-rate-2026-09-bao_thanh'));
document.getElementById('x2-btinh-rate-2026-09-tinh').value = '600';
document.getElementById('x2-btinh-rate-2026-09-ha_cap').value = '300';
document.getElementById('x2-btinh-rate-2026-09-bao_thanh').value = '100';
x2.handleX2BaoTinhRateRowSave('2026-09');
check('ĐỊNH MỨC 3 CỘT: lưu tháng 9 = { tinh 600 · ha_cap 300 · bao_thanh 100 } (state + localStorage)',
  state.x2BaoTinhRates['2026-09'].tinh === 600 &&
  state.x2BaoTinhRates['2026-09'].ha_cap === 300 &&
  state.x2BaoTinhRates['2026-09'].bao_thanh === 100 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_TINH_RATE) || '{}')['2026-09'].bao_thanh === 100);
check('ĐỊNH MỨC: đọc được bản CŨ (số thuần) = định mức "Bào tinh"', (() => {
  state.x2BaoTinhRates['2026-08'] = 500;
  const e = x2.baoTinhRateEntryOf('2026-08');
  const ok = e.tinh === 500 && e.ha_cap === 0 && e.bao_thanh === 0 && x2.baoTinhRateOf('2026-08-05') === 500;
  delete state.x2BaoTinhRates['2026-08'];
  return ok;
})());
check('THẺ NGÀY: chip HIỆU SUẤT THEO TỪNG LOẠI — Bào tinh 29,6% (1600÷9÷600) · Hạ cấp 5,6% · Bào thanh 55,6%', (() => {
  const h = document.getElementById('x2-btinh-day-cards').innerHTML;
  return h.includes('29,6%') && h.includes('5,6%') && h.includes('55,6%');
})());
check('THẺ NGÀY: mỗi chip ghi ĐM của loại đó (600 · 300 · 100 thanh/h) + vẫn có Công suất tổng 250 thanh/h', (() => {
  const h = document.getElementById('x2-btinh-day-cards').innerHTML;
  return h.includes('ĐM 600 thanh/h') && h.includes('ĐM 300 thanh/h') && h.includes('ĐM 100 thanh/h') &&
    h.includes('246 thanh/h');
})());
x2.closeX2BaoTinhRateModal();
check('POPUP ĐỊNH MỨC: đóng được (overlay bỏ class show)',
  !document.getElementById('modal-x2-btinh-rate').classList.contains('show'));
check('MINI CARD: 5 lượt · 2.030 thanh đạt',
  document.getElementById('x2-mini-count-bao-tinh').textContent === '5 lượt · 2.030 thanh');

// ─── G. SỬA / XÓA / THU GỌN ─────────────────────────────────────
x2.editXuong2BaoTinh(r1.id);
check('SỬA: nạp lại ĐÚNG phiếu nt-1 + SL đạt cũ 1.000 + KT sau bào 1240×16×6 của dòng',
  x2.baoTinhPickedIds().join(',') === 'nt-1' &&
  x2.baoTinhOkDrafts().get('1250×18×7') === 1000 &&
  x2.baoTinhOutDimsOf('1250×18×7').join('×') === '1240×16×6' &&
  state.x2BaoTinhEditId === r1.id);
x2.onBaoTinhGroupInput(fakeOkInput('1250×18×7', 900));
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('SỬA: đạt 1.000 → 900 (lỗi/giữ 60 · tóp 20 · khác 20 = 1.000 rút) · vẫn 5 lượt · thoát chế độ sửa',
  state.xuong2BaoTinhRecords.length === 5 && r1.qtyOk === 900 && r1.qtyErr === 60 &&
  r1.qtyTop === 20 && r1.qtyOther === 20 && r1.inQty === 1000 &&
  state.x2BaoTinhEditId === null);
x2.deleteXuong2BaoTinh(r4.id);
check('XÓA: xóa lượt bào thanh + ghi tombstone (xuong2BaoTinhRecords)',
  !state.xuong2BaoTinhRecords.some(r => r.id === r4.id) &&
  !!(state.deletedIds && state.deletedIds.xuong2BaoTinhRecords && state.deletedIds.xuong2BaoTinhRecords[r4.id]));
check('XÓA: mini card còn "4 lượt · 1.640 thanh" (900 + 450 + 90 + 200)',
  document.getElementById('x2-mini-count-bao-tinh').textContent === '4 lượt · 1.640 thanh');
x2.toggleX2BaoTinhTable();
check('BẢNG: nút thu gọn hoạt động (wrap có class x2-cut-collapsed)',
  document.getElementById('x2-btinh-table-wrap').classList.contains('x2-cut-collapsed'));
x2.toggleX2BaoTinhTable();

// ─── M2. "ĐÃ DÙNG HẾT": PHIẾU đã rút hết bị ẨN + dòng GIẢI THÍCH khi tìm + CHIP "ĐÃ BÀO" ───
// Phiếu nt-usedup 700 thanh ĐÃ bị lượt Bào Tinh rút hết → ẩn; phiếu nt-fresh 400 thanh → vẫn hiện
state.batches.push({ id: 'k-usedup', code: '261001-09', stage: 'kho', date: '2026-10-01', khoDate: '2026-10-01', week: 'Tuần 40', length: 1250, width: 22, thickness: 7, quantity: 700, volume: 0.14, bambooType: 'A1', useFor: 'Ván', location: 'K19', stageHistory: [{ stage: 'kho', date: '2026-10-01' }] });
state.batches.push({ id: 'k-fresh', code: '261001-10', stage: 'kho', date: '2026-10-01', khoDate: '2026-10-01', week: 'Tuần 40', length: 1250, width: 22, thickness: 7, quantity: 400, volume: 0.085, bambooType: 'A1', useFor: 'Ván', location: 'K20', stageHistory: [{ stage: 'kho', date: '2026-10-01' }] });
state.khoNotes.push(
  { id: 'nt-usedup', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-10-01', qty: 700,
    lots: [{ batchId: 'k-usedup', qty: 700 }] },
  { id: 'nt-fresh', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-10-02', qty: 400,
    lots: [{ batchId: 'k-fresh', qty: 400 }] }
);
state.xuong2BaoTinhRecords.push({ id: 'bt-usedup', date: '2026-10-04', week: '2026-W40', kind: 'tinh',
  noteUses: [{ noteId: 'nt-usedup', batchId: 'k-usedup', sizeKey: '1250×22×7', qty: 700 }],
  sources: [{ batchId: 'k-usedup', code: '261001-09', location: 'K19', qty: 700 }],
  batchId: 'k-usedup', batchCode: '261001-09', inQty: 700, inSizeKey: '1250×22×7',
  outSizeKey: '1250×20×5', outDims: [1250, 20, 5], qtyOk: 660, qtyErr: 40 });
x2.baoTinhClearPicks();
document.getElementById('x2-btinh-kind').value = 'tinh';
document.getElementById('x2-btinh-search').value = '';
document.getElementById('x2-btinh-qty-search').value = '';
x2.updateXuong2BaoTinhLinked();
x2.renderX2BaoTinhList();
check('DÙNG HẾT: phiếu đã rút hết 700/700 KHÔNG có thẻ chọn (data-btinh-pick) · phiếu mới vẫn hiện',
  document.getElementById('x2-btinh-list').innerHTML.includes('data-btinh-pick="nt-fresh"') &&
  document.getElementById('x2-btinh-list').innerHTML.includes('data-btinh-pick="nt-usedup"') === false);
check('DÙNG HẾT: baoTinhUsedUpItems trả phiếu đã ẩn (nt-usedup · qty 0 · total 700)',
  x2.baoTinhUsedUpItems().some(it => it.id === 'nt-usedup' && it.qty === 0 && it.total === 700));
document.getElementById('x2-btinh-qty-search').value = '700';
x2.renderX2BaoTinhList();
check('DÙNG HẾT: ô SỐ "700" → "Không tìm thấy" + dòng GIẢI THÍCH (0/700 thanh)', (() => {
  const h = document.getElementById('x2-btinh-list').innerHTML;
  return h.includes('Không tìm thấy thẻ nào khớp') && h.includes('al-warn') &&
    h.includes('Xuất Bào Tinh') && h.includes('0/700');
})());
document.getElementById('x2-btinh-qty-search').value = '';
document.getElementById('x2-btinh-search').value = 'nt-usedup';
x2.renderX2BaoTinhList();
check('DÙNG HẾT: ô CHỮ gõ id phiếu cũng hiện dòng GIẢI THÍCH', (() => {
  const h = document.getElementById('x2-btinh-list').innerHTML;
  return h.includes('al-warn') && h.includes('0/700');
})());
document.getElementById('x2-btinh-search').value = 'zzzz';
x2.renderX2BaoTinhList();
check('DÙNG HẾT: từ khóa lạ → "Không tìm thấy" NHƯNG không dòng giải thích', (() => {
  const h = document.getElementById('x2-btinh-list').innerHTML;
  return h.includes('Không tìm thấy') && h.includes('al-warn') === false;
})());
document.getElementById('x2-btinh-search').value = '';
x2.renderX2BaoTinhList();
check('DÙNG HẾT: xoá ô chữ → phiếu chưa bào hiện lại + không còn dòng giải thích', (() => {
  const h = document.getElementById('x2-btinh-list').innerHTML;
  return h.includes('data-btinh-pick="nt-fresh"') && h.includes('al-warn') === false;
})());
check('CHIP "ĐÃ BÀO": nhãn "Đã bào 700/700 thanh" · không truyền lô → chuỗi rỗng',
  x2.baoTinhUsedLabel(state.batches.find(b => b.id === 'k-usedup')) === 'Đã bào 700/700 thanh' &&
  x2.baoTinhUsedLabel(null) === '');
// Dọn dữ liệu test — không ảnh hưởng các mục sau
state.xuong2BaoTinhRecords = state.xuong2BaoTinhRecords.filter(r => r.id !== 'bt-usedup');
state.batches = state.batches.filter(b => b.id !== 'k-usedup' && b.id !== 'k-fresh');

// ─── H. CẤU TRÚC + NỐI ĐỒNG BỘ ──────────────────────────────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): Ngày Bào · Loại Bào · nút "Chọn thanh" cùng 1 HÀNG + DÒNG "Bào thanh" 4 trường (đã bỏ ô nhập tay cũ)',
  idxHtml.includes('id="x2-btinh-picker-btn"') && idxHtml.includes('id="x2-btinh-list"') &&
  idxHtml.includes('id="x2-btinh-search"') &&
  idxHtml.includes('id="x2-btinh-top-row"') && idxHtml.includes('id="x2-btinh-groups"') &&
  idxHtml.includes('id="x2-btinh-bt-row"') && idxHtml.includes('id="x2-btinh-bt-in-btn"') &&
  idxHtml.includes('id="x2-btinh-bt-in-list"') && idxHtml.includes('id="x2-btinh-bt-qty"') &&
  idxHtml.includes('id="x2-btinh-bt-out-btn"') && idxHtml.includes('id="x2-btinh-bt-out-list"') &&
  idxHtml.includes('id="x2-btinh-bt-out-add"') && idxHtml.includes('id="x2-btinh-bt-ok"') &&
  !idxHtml.includes('id="x2-btinh-add-row"') &&
  !idxHtml.includes('id="x2-btinh-manual-row"') &&
  !idxHtml.includes('id="x2-btinh-in-dai"') && !idxHtml.includes('id="x2-btinh-out-dai"') &&
  !idxHtml.includes('id="x2-btinh-qty-ok"') && !idxHtml.includes('id="x2-btinh-qty-err"') &&
  !idxHtml.includes('id="x2-btinh-lot"') && !idxHtml.includes('id="x2-btinh-defect"'));
check('CẤU TRÚC (index.html): Ngày Bào · Loại Bào · bộ lọc kỳ · nút Định mức + popup 3 cột (bỏ thanh rate-bar cũ)',
  idxHtml.includes('id="x2-btinh-date"') && idxHtml.includes('id="x2-btinh-kind"') &&
  idxHtml.includes('id="x2-btinh-day-cards"') &&
  idxHtml.includes('id="x2-btinh-period-bar"') &&
  idxHtml.includes('id="btn-x2-btinh-rate"') &&
  idxHtml.includes('id="modal-x2-btinh-rate"') && idxHtml.includes('id="x2-btinh-rate-rows"') &&
  idxHtml.includes('id="x2-btinh-rate-new-month"') && idxHtml.includes('id="x2-btinh-bt-in-search"') &&
  !idxHtml.includes('id="x2-btinh-rate-bar"') && !idxHtml.includes('id="x2-btinh-rate-month"') &&
  !idxHtml.includes('id="x2-btinh-rate-chips"'));
check('CẤU TRÚC (index.html): popup Định mức có ĐỦ 3 CỘT — Bào tinh · Bào tinh hạ cấp · Bào thanh',
  /<th>Bào tinh \(thanh\/h\)<\/th>/.test(idxHtml) &&
  /<th>Bào tinh hạ cấp \(thanh\/h\)<\/th>/.test(idxHtml) &&
  /<th>Bào thanh \(thanh\/h\)<\/th>/.test(idxHtml));
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('CẤU TRÚC (styles.css): khối THẺ BÀO TINH FORM GỌN (thẻ 2 dòng · bảng tổng hợp · ô k.thước hẹp)',
  cssHtml.includes('THẺ BÀO TINH — FORM GỌN') && cssHtml.includes('.x2-btinh-card .al-card-sub') &&
  cssHtml.includes('.x2-btinh-ok {') && cssHtml.includes('.x2-btinh-group-table {') &&
  cssHtml.includes('.x2-btinh-dim') && cssHtml.includes('.x2-btinh-actions {'));
check('CẤU TRÚC (styles.css): ô tìm nhanh .al-search trong picker + KHÔNG còn khối CSS lơ lửng ({} cân bằng)',
  cssHtml.includes('.x2-btinh-picker .al-card-list') && cssHtml.includes('.al-search {') &&
  !cssHtml.includes('inset 0 0 0 1px var(--primary-border);\n}') &&
  (() => { let d = 0; for (const ch of cssHtml) { if (ch === '{') d++; else if (ch === '}') d--; } return d === 0; })());
const jsEventsSt = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('CẤU TRÚC (events.js): nối nút chọn thẻ + bấm thẻ + bảng tổng hợp + 4 trường Bào thanh',
  jsEventsSt.includes("safeOn('x2-btinh-picker-btn'") && jsEventsSt.includes("safeOn('x2-btinh-search'") &&
  jsEventsSt.includes("safeOn('x2-btinh-list'") &&
  jsEventsSt.includes("safeOn('x2-btinh-groups', 'input'") &&
  jsEventsSt.includes("safeOn('x2-btinh-groups', 'click'") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-in-btn'") && jsEventsSt.includes("safeOn('x2-btinh-bt-in-list'") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-qty'") && jsEventsSt.includes("safeOn('x2-btinh-bt-out-btn'") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-out-list'") && jsEventsSt.includes("safeOn('x2-btinh-bt-out-add'") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-in-search'") &&
  jsEventsSt.includes("safeOn('x2-btinh-period-bar'") &&
  jsEventsSt.includes("safeOn('btn-x2-btinh-rate'") &&
  jsEventsSt.includes("safeOn('btn-close-x2-btinh-rate'") &&
  jsEventsSt.includes("safeOn('btn-x2-btinh-rate-add-month'") &&
  jsEventsSt.includes("safeOn('x2-btinh-rate-rows'") &&
  !jsEventsSt.includes("safeOn('x2-btinh-add-row'") &&
  !jsEventsSt.includes("safeOn('btn-x2-btinh-rate-save'") &&
  jsEventsSt.includes("safeOn('btn-toggle-x2btinh-table'"));
check('CẤU TRÚC (styles.css): thanh bộ lọc KỲ + chip kỳ thống kê (khối {} cân bằng)', (() => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  let d = 0; for (const ch of css) { if (ch === '{') d++; else if (ch === '}') d--; }
  return css.includes('.x2-btinh-period-bar') && css.includes('.x2-period-btn') &&
    css.includes('.material-stat-period') && d === 0;
})());
const jsStorage = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
check('CẤU TRÚC (js): nối storage/cloud/history/main',
  jsStorage.includes('xuong2BaoTinhRecords') && jsCloud.includes('x2BaoTinhRates') &&
  jsHistory.includes('xuong2BaoTinhRecords') && jsMain.includes('loadXuong2BaoTinh'));
// CỠ ĐẦU RA "Bào thanh" — key riêng phải nối đủ state/storage/cloud/history/main/events
const jsState = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsX2 = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
check('CẤU TRÚC (key mới): state.js có STORAGE_KEY_X2_BAO_THANH_OUT_SIZES + state.x2BaoThanhOutSizes',
  jsState.includes("'bamboo_tracker_x2_bao_thanh_out_sizes_v1'") &&
  jsState.includes('x2BaoThanhOutSizes: []'));
check('CẤU TRÚC (nối đủ 6 chỗ): storage · cloud · history · main · xUong2 (load/save) · events',
  jsStorage.includes('restoreX2BaoThanhOutSizes') && jsStorage.includes('x2BaoThanhOutSizes: state.x2BaoThanhOutSizes') &&
  jsCloud.includes('x2BaoThanhOutSizes') && jsCloud.includes('STORAGE_KEY_X2_BAO_THANH_OUT_SIZES') &&
  jsHistory.includes('x2BaoThanhOutSizes') && jsMain.includes('loadX2BaoThanhOutSizes') &&
  jsX2.includes('loadX2BaoThanhOutSizes') && jsX2.includes('saveX2BaoThanhOutSizes') &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-out-add'"));
check('CẤU TRÚC: Ép Ván KHÔNG cộng tồn của lượt "Bào thanh" vào gợi ý đầu vào (đầu vào Bào thanh là thành phẩm Ép Ván)',
  fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8')
    .includes("if (!r || r.kind === 'bao_thanh') return;"));

// ─── I. VÒNG ĐỜI "SỔ SỬ DỤNG PHIẾU" (06/10/2026) ─────────────────────
// Chọn/bỏ chọn thẻ nguồn là thao tác UI → CHƯA được ghi vào lịch sử sử dụng;
// chỉ các lượt ĐÃ BẤM LƯU mới ghi noteUses; xóa lượt → sổ trả về đủ.
check('SỔ PHIẾU (chưa lưu): chọn nt-2 → dùng KHÔNG đổi · bỏ chọn → VẪN KHÔNG ĐỔI (không trừ lịch sử)', (() => {
  x2.baoTinhClearPicks();
  const before = x2.khoNoteUsedOf('nt-2');          // nt-2 đã bị lượt r2 rút 500 từ mục C
  x2.toggleBaoTinhPick('nt-2');
  const mid = x2.khoNoteUsedOf('nt-2');
  x2.toggleBaoTinhPick('nt-2');
  return before === 500 && mid === 500 && x2.khoNoteUsedOf('nt-2') === 500 &&
    x2.baoTinhPickedIds().length === 0;
})());
check('SỔ PHIẾU (đã lưu + đã sửa): nt-1 ghi nhận đúng phần RÚT = 1.000 thanh (không thừa/thiếu)',
  x2.khoNoteUsedOf('nt-1') === 1000);
check('SỔ PHIẾU (xóa lượt): xóa r1 → nt-1 dùng = 0 + tồn phiếu trả đủ 1.100', (() => {
  const n = state.xuong2BaoTinhRecords.length;
  x2.deleteXuong2BaoTinh(r1.id);
  const p1 = (x2.khoNoteInputPool('baotinh', null) || []).find(p => p.id === 'nt-1');
  return state.xuong2BaoTinhRecords.length === n - 1 &&
    x2.khoNoteUsedOf('nt-1') === 0 && !!p1 && p1.remaining === 1100;
})());

// ─── M. VÍ DỤ ĐẦU - CUỐI: LỖI ĐẦU RA CỦA "BÀO THANH" QUAY LẠI LÀM ĐẦU VÀO ───
// (Đầu vào 1200×18×15 · 1.000 thanh → Đầu ra 640×14×12; QC kiểm đạt 800 · lỗi 200
//  → 200 thanh 640×14×12 phải hiện ở danh sách chọn đầu vào, và bị TRỪ khi bào lại)
state.xuong2BaoTinhRecords = [];
state.qcFinalRecords = [];
state.materialRates = [];
state.pressRecords = [{ id: 'prM', date: '2026-10-01', week: '2026-W40', year: 2026,
  productId: '', productName: 'Ván 1220x2440x9',
  vanTho: [{ vtDim: '1200x18x15', vtQty: 1000, ratio: 1 }] }];
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
document.getElementById('x2-btinh-date').value = '2026-10-01';
x2.updateXuong2BaoTinhLinked();
x2.setBaoThanhInput('p:1200×18×15');
document.getElementById('x2-btinh-bt-qty').value = '1000';
x2.setBaoThanhOut('640×14×12');
const nM = state.xuong2BaoTinhRecords.length;
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const rM = state.xuong2BaoTinhRecords[nM];
check('VÍ DỤ (lượt 1): vào 1.000 thanh 1200×18×15 → đầu ra 640×14×12 · nguồn Ép Ván',
  !!rM && rM.kind === 'bao_thanh' && rM.inQty === 1000 && rM.inSource === 'press' &&
  rM.outSizeKey === '640×14×12');
state.qcFinalRecords.push({ id: 'qcfM', date: '2026-10-02', workshop: 'x2', kind: 'thanh',
  sizeKey: '640×14×12', sizeDims: [640, 14, 12], inputQty: 1000,
  qtyOk: 800, qtyExcept: 0, qtyReject: 200 });
check('VÍ DỤ (QC): QC kiểm đạt 800 · lỗi 200 → lượt 1 đọc LIVE đúng',
  x2.baoTinhQtyOkOf(rM) === 800 && x2.baoTinhQtyErrOf(rM) === 200);
check('VÍ DỤ (nguồn lỗi): tồn lỗi 640×14×12 = 200 thanh VÀ hiện ở ô chọn đầu vào (thẻ "d:640×14×12")',
  ((x2.baoThanhDefectPool().find(x => x.sizeKey === '640×14×12') || {}).remaining === 200) &&
  x2.baoTinhInputPool().some(x => x.id === 'd:640×14×12') &&
  (() => { x2.renderBaoThanhInputList();
    const h = document.getElementById('x2-btinh-bt-in-list').innerHTML;
    return h.includes('Thanh lỗi · 640 × 14 × 12 mm · còn 200/200 thanh') &&
      h.includes('Thanh lỗi Bào thanh'); })());
document.getElementById('x2-btinh-date').value = '2026-10-01';
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();
x2.setBaoThanhInput('d:640×14×12');
check('VÍ DỤ (chọn lỗi): nút đầu vào hiện "640 × 14 × 12 · Thanh lỗi" + còn 200/200 + gợi ý tối đa 200',
  document.getElementById('x2-btinh-bt-in-text').textContent === '640 × 14 × 12 · Thanh lỗi' &&
  document.getElementById('x2-btinh-bt-in-count').textContent === 'còn 200/200' &&
  document.getElementById('x2-btinh-bt-qty-hint').textContent.includes('Tối đa 200 thanh'));
const nM2 = state.xuong2BaoTinhRecords.length;
document.getElementById('x2-btinh-bt-qty').value = '500';
x2.setBaoThanhOut('640×12×10');
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('VÍ DỤ (chặn): SL 500 vượt phần còn lại 200 của nguồn lỗi → KHÔNG lưu',
  state.xuong2BaoTinhRecords.length === nM2);
document.getElementById('x2-btinh-bt-qty').value = '200';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const rM2 = state.xuong2BaoTinhRecords[nM2];
check('VÍ DỤ (lượt 2): vào 200 thanh 640×14×12 từ NGUỒN LỖI (inSource "defect") → đầu ra 640×12×10',
  !!rM2 && rM2.inSource === 'defect' && rM2.inSizeKey === '640×14×12' &&
  rM2.inQty === 200 && rM2.outSizeKey === '640×12×10');
check('VÍ DỤ (trừ tồn): tồn lỗi 640×14×12 về 0 → thẻ "còn 0/200 thanh" + lớp disabled (không chọn được)',
  ((x2.baoThanhDefectPool().find(x => x.sizeKey === '640×14×12') || {}).remaining === 0) &&
  (() => { x2.renderBaoThanhInputList();
    const h = document.getElementById('x2-btinh-bt-in-list').innerHTML;
    return h.includes('còn 0/200 thanh') && h.includes('disabled'); })());
check('VÍ DỤ (sửa lượt): khôi phục đúng nguồn lỗi "d:640×14×12" + tồn trả lại 200 khi đang sửa',
  (() => { x2.editXuong2BaoTinh(rM2.id);
    const cur = x2.baoTinhBaoThanhInItem();
    const stock = (x2.baoThanhDefectPool().find(x => x.sizeKey === '640×14×12') || {});
    x2.resetXuong2BaoTinhForm();
    return !!cur && cur.id === 'd:640×14×12' && stock.remaining === 200; })());
check('CẤU TRÚC (js): baoTinhDefectStock nhận (excludeId, totalKinds) + baoThanhDefectPool chỉ đếm kind bao_thanh',
  /function baoTinhDefectStock\(excludeId, totalKinds\)/.test(jsX2) &&
  /baoTinhDefectStock\(ex, \['bao_thanh'\]\)/.test(jsX2));
// ─── CẤU TRÚC B1/B2: dòng giải thích "đã dùng hết" + chip "ĐÃ BÀO X/Y THANH" ───
const jsKanban = fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8');
check('B1 (js): xuong2 có baoTinhCandidateRaw + baoTinhUsedUpItems + baoTinhUsedUpHintHtml + baoTinhLastTurnDateOf',
  jsX2.includes('function baoTinhCandidateRaw') && jsX2.includes('function baoTinhUsedUpItems') &&
  jsX2.includes('function baoTinhUsedUpHintHtml') && jsX2.includes('function baoTinhLastTurnDateOf'));
check('B1 (css + render): khối .al-warn + renderX2BaoTinhList nối warn (cả nhánh "Tất cả đã dùng hết")',
  cssHtml.includes('.al-warn-usedup {') && cssHtml.includes('.al-warn-line') &&
  jsX2.includes('baoTinhUsedUpHintHtml(true)') && jsX2.includes('+ warn'));
check('B2 (js): main.js đưa x2BaoTinhUsedLabel vào window.app + kanban.js gắn chip tag-baotinh-used',
  jsMain.includes('x2BaoTinhUsedLabel: baoTinhUsedLabel') && jsKanban.includes('x2BaoTinhUsedLabel') &&
  jsKanban.includes('tag-baotinh-used') && jsKanban.includes('const btChip ='));
check('B2 (css + xuong2): chip .tag-baotinh-used + thẻ lô Kho dùng baoTinhUsedLabel + đã export',
  cssHtml.includes('.tag-badge.tag-baotinh-used') && jsX2.includes('baoTinhUsedLabel(b)') &&
  jsX2.includes('baoTinhUsedLabel,') && jsX2.includes('baoTinhUsedUpItems,'));
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
// ─── CẤU TRÚC MỚI: khung lịch sử không lặp + 2 ô tìm KẾT HỢP ──────
check('CẤU TRÚC (index.html): khung "Lịch Sử Bào Tinh" KHÔNG còn LẶP — 1 khung · 1 tiêu đề · 1 nút thu gọn',
  (idxHtml.match(/id="x2-btinh-table-wrap"/g) || []).length === 1 &&
  (idxHtml.match(/id="btn-toggle-x2btinh-table"/g) || []).length === 1 &&
  (idxHtml.match(/id="x2-btinh-table-count"/g) || []).length === 1 &&
  (idxHtml.match(/id="x2-btinh-day-cards"/g) || []).length === 1);
check('CẤU TRÚC (index.html): số <div> cân bằng </div> (thẻ card đóng đúng, không lồng nhầm)',
  (idxHtml.match(/<div/g) || []).length === (idxHtml.match(/<\/div>/g) || []).length);
check('CẤU TRÚC (index.html): 2 ô tìm (ô chữ + ô SỐ LƯỢNG) ở cả 2 danh sách thẻ Bào Tinh',
  idxHtml.includes('id="x2-btinh-qty-search"') && idxHtml.includes('id="x2-btinh-bt-in-qty-search"') &&
  idxHtml.indexOf('id="x2-btinh-qty-search"') > idxHtml.indexOf('id="x2-btinh-search"') &&
  idxHtml.indexOf('id="x2-btinh-bt-in-qty-search"') > idxHtml.indexOf('id="x2-btinh-bt-in-search"'));
check('CẤU TRÚC (events.js + xuong2.js): nối 2 ô số lượng + hàm lọc số lượng & khớp 2 ô',
  jsEventsSt.includes("safeOn('x2-btinh-qty-search', 'input', renderX2BaoTinhList)") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-in-qty-search', 'input', renderBaoThanhInputList)") &&
  jsX2.includes('function baoTinhQtyQuery') && jsX2.includes('function baoTinhListMatch') &&
  jsX2.includes('baoTinhQtyMatchVals([it.remaining, it.total], qQty)') && jsX2.includes('plainTxt'));
check('CẤU TRÚC (styles.css): ô tìm số lượng .al-search-qty dùng chung', cssHtml.includes('.al-search-qty {'));
check('CẤU TRÚC (sw.js): đã tăng CACHE_NAME v198', /nha-may-ngoc-son-v226/.test(swJs));
console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

