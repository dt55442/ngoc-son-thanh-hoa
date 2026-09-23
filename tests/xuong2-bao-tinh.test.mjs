// tests/xuong2-bao-tinh.test.mjs — Kiểm thử VỊ TRÍ "BÀO TINH" (Xưởng 2):
// form gọn (Ngày Bào · Loại Bào: Bào tinh / Bào tinh hạ cấp / Bào thanh ·
// NÚT "Chọn thanh" mở DANH SÁCH THẺ — bấm thẻ để chọn/bỏ chọn, thẻ 2 dòng
// (kích thước · loại nan · số lượng / vị trí), KHÔNG có ô vuông tích),
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
function fakeInDimInput(key, part, value) { return fakeGroupInput('data-btinh-in-dim', key, 'data-in-part', part, value); }
function fakeInQtyInput(key, value) { return fakeGroupInput('data-btinh-in-qty', key, null, null, value); }
// Nhập đủ 1 dòng: kích thước sau bào + SL đạt
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
check('FORM GỌN: Loại bào Bào tinh → hiện NÚT "Chọn thanh", ẩn nút "Thêm hàng thông tin khác"',
  document.getElementById('x2-btinh-picker-row').style.display === '' &&
  document.getElementById('x2-btinh-add-row').style.display === 'none' &&
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
check('THẺ THANH: 2 dòng — dòng 1 kích thước · loại nan · số lượng, dòng 2 vị trí',
  listHtml.includes('1250 × 18 × 7') && listHtml.includes('A1') && listHtml.includes('800 thanh') &&
  listHtml.includes('K11 · 260910-01') && listHtml.includes('al-card-sub'));
check('THẺ THANH: KHÔNG có ô vuông tích (không dùng al-card-check)',
  !listHtml.includes('al-card-check'));
check('THẺ THANH: chỉ hiện LÔ ĐANG Ở KHO — KHÔNG hiện lô đang ở Sấy 2',
  listHtml.includes('K12') && listHtml.includes('K13') &&
  !listHtml.includes('LS2') && !listHtml.includes('260913-01'));
x2.toggleBaoTinhPick('k-1');
check('BẤM THẺ = CHỌN (thẻ tô chip picked + đếm "1 đã chọn")',
  x2.baoTinhPickedIds().join(',') === 'k-1' &&
  document.getElementById('x2-btinh-picked-count').textContent === '1 đã chọn' &&
  document.getElementById('x2-btinh-list').innerHTML.includes('x2-btinh-card picked'));
x2.toggleBaoTinhPick('k-1');
check('BẤM LẦN NỮA = BỎ CHỌN (hết chọn + bảng tổng hợp ẩn lại)',
  x2.baoTinhPickedIds().length === 0 &&
  document.getElementById('x2-btinh-groups').style.display === 'none');
x2.toggleBaoTinhPick('k-1');
x2.toggleBaoTinhPick('k-3');
check('GỘP KÍCH THƯỚC CHUNG: chọn 2 lô CÙNG cỡ (800 + 300) → 1 nhóm 1.100 thanh (2 thẻ)',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].sizeKey === '1250×18×7' &&
  x2.baoTinhGroups()[0].inQty === 1100 &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('1.100') &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('2 thẻ'));
x2.toggleBaoTinhPick('k-2');
check('CHỌN THÊM cỡ KHÁC → 2 nhóm riêng, mỗi nhóm có ô nhập SL thanh ĐẠT',
  x2.baoTinhGroups().length === 2 &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-ok="1250×18×7"') &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-ok="1300×20×8"'));

// ─── C. NHẬP KÍCH THƯỚC SAU BÀO + SL thanh ĐẠT theo TỪNG DÒNG → LƯU ──
x2.onBaoTinhGroupInput(fakeOkInput('1250×18×7', 1000));
fillOut('1250×18×7', 1240, 16, 6);
x2.onBaoTinhGroupInput(fakeOkInput('1300×20×8', 450));
fillOut('1300×20×8', 1240, 16, 6);
check('NHẬP THEO DÒNG: mỗi dòng giữ nháp RIÊNG (SL đạt + kích thước sau bào của dòng đó)',
  x2.baoTinhOkDrafts().get('1250×18×7') === 1000 && x2.baoTinhOkDrafts().get('1300×20×8') === 450 &&
  x2.baoTinhOutDimsOf('1250×18×7').join('×') === '1240×16×6' &&
  JSON.stringify(x2.baoTinhOutDrafts().get('1300×20×8')) === JSON.stringify({ d: 1240, r: 16, t: 6 }));
check('KHÔNG hiện SL thanh LỖI ở form nhập (không có ô/cột lỗi — lỗi chỉ hiện ở bảng lịch sử)',
  !document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-err') &&
  !document.getElementById('x2-btinh-calc').innerHTML.includes('Lỗi (tự tính)'));
check('CHẶN: chưa nhập SL đạt cho dòng nào → không lưu',
  (function () {
    x2.baoTinhOkDrafts().clear();
    document.getElementById('x2-btinh-date').value = '2026-09-21';
    const n = state.xuong2BaoTinhRecords.length;
    x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
    return state.xuong2BaoTinhRecords.length === n;
  })());
// Dòng 1300×20×8 để TRỐNG hoàn toàn (không k.thước sau bào, không SL đạt) → sẽ bị BỎ QUA
fillOut('1300×20×8', '', '', '');
x2.onBaoTinhGroupInput(fakeOkInput('1250×18×7', 1000));
fillOut('1250×18×7', 1240, 16, 6);
check('TỔNG KẾT: vào 1.600 · đạt 1.000 · có tỷ lệ đạt + thể tích đạt + nguồn "lô ở Kho (qua Sấy 2)"',
  document.getElementById('x2-btinh-calc').innerHTML.includes('1.600') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('1.000') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('%') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('m³') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('lô ở Kho (qua Sấy 2)'));
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('LƯU: dòng để TRỐNG bị bỏ qua → chỉ ghi 1 lượt (mỗi k.thước chung = 1 lượt)',
  state.xuong2BaoTinhRecords.length === 1);
const r1 = state.xuong2BaoTinhRecords[0];
check('LƯU: kind = tinh · kích thước chung · nguồn 2 lô · vào 1.100 · đạt 1.000 · LỖI TỰ TÍNH 100',
  r1.kind === 'tinh' && r1.inSizeKey === '1250×18×7' && r1.inQty === 1100 &&
  r1.qtyOk === 1000 && r1.qtyErr === 100 &&
  Array.isArray(r1.sources) && r1.sources.length === 2 &&
  r1.sources.map(s => s.batchId).sort().join(',') === 'k-1,k-3');
check('LƯU: kích thước SAU BÀO 1240×16×6 + người bào/giờ tự động (9h HC, không lấy Bào thô/Bào Ván)',
  r1.outDims[0] === 1240 && r1.outDims[1] === 16 && r1.outDims[2] === 6 &&
  String(r1.worker).includes('Phạm Văn Tú') && !String(r1.worker).includes('Lê Văn Bình') &&
  r1.workHours === 9 && r1.workHoursHC === 9 && r1.workHoursTC === 0);
check('TỒN LÔ: 2 lô đã bào hết (800→0 · 300→0) nên KHÔNG còn trong danh sách thẻ',
  x2.baoTinhLotRemainingOf(state.batches.find(b => b.id === 'k-1')) === 0 &&
  x2.baoTinhLotRemainingOf(state.batches.find(b => b.id === 'k-3')) === 0 &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('K11 · 260910-01'));
x2.toggleBaoTinhPick('k-2');
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.onBaoTinhGroupInput(fakeOkInput('1300×20×8', 450));
fillOut('1300×20×8', 1240, 16, 6);
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r2 = state.xuong2BaoTinhRecords[1];
check('LƯU lượt 2: cỡ 1300×20×8 vào 500 · đạt 450 · lỗi 50 (tự tính) · nguồn 1 lô',
  !!r2 && r2.inSizeKey === '1300×20×8' && r2.inQty === 500 && r2.qtyOk === 450 && r2.qtyErr === 50 &&
  r2.sources.length === 1 && r2.sources[0].batchId === 'k-2');
check('ĐÃ GHI localStorage (key riêng của Bào Tinh): 2 lượt',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BAO_TINH) || '[]').length === 2);

// ─── D. BÀO TINH HẠ CẤP (nguồn = thanh LỖI của Bào Tinh, gom theo cỡ) ──
document.getElementById('x2-btinh-kind').value = 'ha_cap';
x2.updateXuong2BaoTinhLinked();
check('ĐỔI LOẠI BÀO: bỏ hết thẻ đã chọn + nút đổi thành "Chọn thanh lỗi"',
  x2.baoTinhPickedIds().length === 0 &&
  document.getElementById('x2-btinh-picker-text').textContent === 'Chọn thanh lỗi');
const defectList = document.getElementById('x2-btinh-list').innerHTML;
check('THẺ LỖI: gom theo CỠ của mọi lượt (1 thẻ "1240 × 16 × 6 · Thanh lỗi · 150 thanh")',
  defectList.includes('1240 × 16 × 6') && defectList.includes('Thanh lỗi') &&
  defectList.includes('150 thanh') && defectList.includes('Bào Tinh (chờ hạ cấp)'));
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.toggleBaoTinhPick('1240×16×6');
x2.onBaoTinhGroupInput(fakeOkInput('1240×16×6', 90));    // vào 150 → lỗi 60
fillOut('1240×16×6', 1230, 14, 5);
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r3 = state.xuong2BaoTinhRecords[2];
check('LƯU HẠ CẤP: kind = ha_cap · nguồn cỡ lỗi 1240×16×6 · vào 150 · đạt 90 · lỗi TỰ TÍNH 60',
  !!r3 && r3.kind === 'ha_cap' && r3.defectKey === '1240×16×6' && r3.inQty === 150 &&
  r3.qtyOk === 90 && r3.qtyErr === 60 && r3.outDims[0] === 1230 && r3.outDims[2] === 5);
check('TỒN LỖI: cỡ 1240×16×6 đã hạ cấp hết (còn 0) · cỡ mới 1230×14×5 có 60 thanh lỗi',
  (x2.baoTinhDefectStock().find(x => x.sizeKey === '1240×16×6') || {}).remaining === 0 &&
  (x2.baoTinhDefectStock().find(x => x.sizeKey === '1230×14×5') || {}).remaining === 60);

// ─── E. BÀO THANH (mỗi hàng tự nhập: k.thước trước bào + SL + k.thước sau bào + SL đạt) ──
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();
check('BÀO THANH: ẩn nút "Chọn thanh" + hiện nút "Thêm hàng thông tin khác" + sẵn 1 hàng trống',
  document.getElementById('x2-btinh-picker-row').style.display === 'none' &&
  document.getElementById('x2-btinh-add-row').style.display === '' &&
  x2.baoTinhManualRows().length === 1);
check('BÀO THANH: hàng trống → bảng tổng hợp hiện nhưng thanh vào = 0 (chưa lưu được)',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].inQty === 0);
const rowA = x2.baoTinhManualRows()[0].id;
x2.onBaoTinhGroupInput(fakeInDimInput(rowA, 'dai', 1250));
x2.onBaoTinhGroupInput(fakeInDimInput(rowA, 'rong', 18));
x2.onBaoTinhGroupInput(fakeInDimInput(rowA, 'day', 7));
x2.onBaoTinhGroupInput(fakeInQtyInput(rowA, 300));
check('BÀO THANH: hàng 1 = 1250×18×7 · 300 thanh (kích thước + SL nhập ngay TRONG bảng tổng hợp)',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].inQty === 300 &&
  x2.baoTinhGroups()[0].sizeKey === '1250×18×7');
document.getElementById('x2-btinh-date').value = '2026-09-21';
const nE = state.xuong2BaoTinhRecords.length;
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('CHẶN (bào thanh): thiếu KÍCH THƯỚC SAU BÀO / SL đạt → không lưu',
  state.xuong2BaoTinhRecords.length === nE);
// Nút "Thêm hàng thông tin khác" → nhập NHIỀU hàng rồi LƯU 1 LẦN
x2.baoTinhAddRow();
const rowB = x2.baoTinhManualRows()[1].id;
x2.onBaoTinhGroupInput(fakeInDimInput(rowB, 'dai', 900));
x2.onBaoTinhGroupInput(fakeInDimInput(rowB, 'rong', 15));
x2.onBaoTinhGroupInput(fakeInDimInput(rowB, 'day', 6));
x2.onBaoTinhGroupInput(fakeInQtyInput(rowB, 200));
check('BÀO THANH: "Thêm hàng thông tin khác" → 2 hàng (300 + 200 thanh)',
  x2.baoTinhManualRows().length === 2 && x2.baoTinhGroups().length === 2 &&
  x2.baoTinhGroups().map(g => g.inQty).sort((a, b) => a - b).join(',') === '200,300');
x2.onBaoTinhGroupInput(fakeOkInput(rowA, 290));
fillOut(rowA, 1245, 17, 6);
x2.onBaoTinhGroupInput(fakeOkInput(rowB, 200));
fillOut(rowB, 890, 15, 5);
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('LƯU (bào thanh): nhập nhiều hàng rồi LƯU 1 LẦN → 2 lượt, mỗi hàng 1 k.thước sau bào riêng',
  state.xuong2BaoTinhRecords.length === nE + 2 &&
  state.xuong2BaoTinhRecords[nE].inQty === 300 && state.xuong2BaoTinhRecords[nE].qtyOk === 290 &&
  state.xuong2BaoTinhRecords[nE].outSizeKey === '1245×17×6' &&
  state.xuong2BaoTinhRecords[nE + 1].inQty === 200 &&
  state.xuong2BaoTinhRecords[nE + 1].outSizeKey === '890×15×5');
check('LƯU (bào thanh): lưu xong form về mặc định "Bào tinh" + xóa hết hàng nhập tay',
  document.getElementById('x2-btinh-kind').value === 'tinh' &&
  x2.baoTinhManualRows().length === 0);
const r4 = state.xuong2BaoTinhRecords[nE];
check('LƯU (bào thanh): lưu đủ nguồn tự nhập (kind · inDims · số lượng · lỗi tự tính)',
  r4.kind === 'bao_thanh' && r4.inDims[0] === 1250 && r4.inDims[1] === 18 && r4.inDims[2] === 7 &&
  r4.inQty === 300 && r4.qtyOk === 290 && r4.qtyErr === 10);

// ─── F. THẺ NGÀY + ĐỊNH MỨC CÔNG SUẤT (thanh/h) ─────────────────
const dayHtml = document.getElementById('x2-btinh-day-cards').innerHTML;
check('THẺ NGÀY: đầu thẻ hiện Ngày 21/09/26 + người bào + giờ HC/TC',
  dayHtml.includes('x2-day-head') && dayHtml.includes('21/09/26') &&
  dayHtml.includes('Phạm Văn Tú') && dayHtml.includes('9h HC') && dayHtml.includes('0h TC'));
check('THẺ NGÀY: đủ 3 nhánh theo Loại bào (Bào tinh · Bào tinh hạ cấp · Bào thanh)',
  dayHtml.includes('Bào tinh') && dayHtml.includes('Bào tinh hạ cấp') && dayHtml.includes('Bào thanh'));
check('THẺ NGÀY: nhánh bào tinh (nhiều lô) ghi nguồn GỘP "2 lô ở Kho · K11/K13"',
  dayHtml.includes('2 lô ở Kho') && dayHtml.includes('K11') && dayHtml.includes('K13'));
check('THẺ NGÀY: nhánh hạ cấp ghi "Thanh lỗi của Bào Tinh · cỡ 1240 × 16 × 6"',
  dayHtml.includes('Thanh lỗi của Bào Tinh') && dayHtml.includes('1240 × 16 × 6'));
check('THẺ NGÀY: tổng vào 2.250 · đạt 2.030 · lỗi 220 · công suất 2.250 ÷ 9 = 250 thanh/h',
  dayHtml.includes('2.250 thanh') && dayHtml.includes('2.030 thanh') &&
  dayHtml.includes('220 thanh') && dayHtml.includes('250 thanh/h'));
document.getElementById('x2-btinh-rate-month').value = '2026-09';
document.getElementById('x2-btinh-rate-value').value = '600';
x2.handleX2BaoTinhRateSave();
check('ĐỊNH MỨC: lưu tháng 9 = 600 thanh/h + chip "T9 = 600 thanh/h"',
  state.x2BaoTinhRates['2026-09'] === 600 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_TINH_RATE) || '{}')['2026-09'] === 600 &&
  document.getElementById('x2-btinh-rate-chips').innerHTML.includes('T9 = 600 thanh/h'));
check('HIỆU SUẤT: 250 thanh/h ÷ 600 thanh/h = 41,7%',
  document.getElementById('x2-btinh-day-cards').innerHTML.includes('41,7%'));
check('MINI CARD: 5 lượt · 2.030 thanh đạt',
  document.getElementById('x2-mini-count-bao-tinh').textContent === '5 lượt · 2.030 thanh');

// ─── G. SỬA / XÓA / THU GỌN ─────────────────────────────────────
x2.editXuong2BaoTinh(r1.id);
check('SỬA: nạp lại ĐÚNG 2 thẻ nguồn cùng cỡ + SL đạt cũ 1.000 + KÍCH THƯỚC SAU BÀO của dòng',
  x2.baoTinhPickedIds().sort().join(',') === 'k-1,k-3' &&
  x2.baoTinhOkDrafts().get('1250×18×7') === 1000 &&
  x2.baoTinhOutDimsOf('1250×18×7').join('×') === '1240×16×6' &&
  state.x2BaoTinhEditId === r1.id);
x2.onBaoTinhGroupInput(fakeOkInput('1250×18×7', 900));
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('SỬA: đạt 1.000 → 900 nên LỖI tự tính thành 200 · vẫn 5 lượt · thoát chế độ sửa',
  state.xuong2BaoTinhRecords.length === 5 && r1.qtyOk === 900 && r1.qtyErr === 200 &&
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

// ─── H. CẤU TRÚC + NỐI ĐỒNG BỘ ──────────────────────────────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): Ngày Bào · Loại Bào · nút "Chọn thanh" cùng 1 HÀNG (không còn ô nhập tay cũ)',
  idxHtml.includes('id="x2-btinh-picker-btn"') && idxHtml.includes('id="x2-btinh-list"') &&
  idxHtml.includes('id="x2-btinh-top-row"') && idxHtml.includes('id="x2-btinh-groups"') &&
  idxHtml.includes('id="x2-btinh-add-row"') &&
  !idxHtml.includes('id="x2-btinh-manual-row"') &&
  !idxHtml.includes('id="x2-btinh-in-dai"') && !idxHtml.includes('id="x2-btinh-out-dai"') &&
  !idxHtml.includes('id="x2-btinh-qty-ok"') && !idxHtml.includes('id="x2-btinh-qty-err"') &&
  !idxHtml.includes('id="x2-btinh-lot"') && !idxHtml.includes('id="x2-btinh-defect"'));
check('CẤU TRÚC (index.html): giữ Ngày Bào · Loại Bào · định mức công suất · thẻ ngày',
  idxHtml.includes('id="x2-btinh-date"') && idxHtml.includes('id="x2-btinh-kind"') &&
  idxHtml.includes('id="x2-btinh-rate-month"') && idxHtml.includes('id="x2-btinh-day-cards"'));
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('CẤU TRÚC (styles.css): khối THẺ BÀO TINH FORM GỌN (thẻ 2 dòng · bảng tổng hợp · ô k.thước hẹp)',
  cssHtml.includes('THẺ BÀO TINH — FORM GỌN') && cssHtml.includes('.x2-btinh-card .al-card-sub') &&
  cssHtml.includes('.x2-btinh-ok {') && cssHtml.includes('.x2-btinh-group-table {') &&
  cssHtml.includes('.x2-btinh-dim') && cssHtml.includes('.x2-btinh-actions {'));
const jsEventsSt = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('CẤU TRÚC (events.js): nối nút chọn thẻ + bấm thẻ + bảng tổng hợp (input/xóa hàng) + nút thêm hàng',
  jsEventsSt.includes("safeOn('x2-btinh-picker-btn'") && jsEventsSt.includes("safeOn('x2-btinh-list'") &&
  jsEventsSt.includes("safeOn('x2-btinh-groups', 'input'") &&
  jsEventsSt.includes("safeOn('x2-btinh-groups', 'click'") &&
  jsEventsSt.includes("safeOn('x2-btinh-add-row'") && jsEventsSt.includes("safeOn('btn-toggle-x2btinh-table'"));
const jsStorage = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
check('CẤU TRÚC (js): nối storage/cloud/history/main',
  jsStorage.includes('xuong2BaoTinhRecords') && jsCloud.includes('x2BaoTinhRates') &&
  jsHistory.includes('xuong2BaoTinhRecords') && jsMain.includes('loadXuong2BaoTinh'));
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('CẤU TRÚC (sw.js): đã tăng CACHE_NAME v155', /nha-may-ngoc-son-v155/.test(swJs));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

