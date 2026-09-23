// tests/than-hoa.test.mjs — Kiểm thử công đoạn THAN HÓA + SẤY (Xưởng 2):
// 1. "Thêm Lô Sấy Mới": nút "Chọn Lô Nan" mở danh sách THẺ nguồn — CHỌN ĐƯỢC
//    NHIỀU nguồn cùng lúc (Sấy 1: thẻ nan Chọn Nan Thô · Sấy 2: lô đang ở Kho);
//    KHÔNG còn ô nhập Số lượng (số lượng lấy nguyên theo nguồn).
//    Vị Trí = nút chọn → LS1..LS15 + nút "Thêm" (khai báo vị trí mới, lưu state).
// 2. "Chuyển Kho": chọn VỊ TRÍ (chỉ các vị trí đang có lô) → TẤT CẢ lô nan trong
//    vị trí đó cùng vào Kho; Vị trí mới ở Kho NHẬP TAY (có gợi ý sẵn).
// 3. Cột "Bào Tinh" đã TẠM ẨN (cờ xóa sau) — công đoạn chỉ còn Sấy 1/Sấy 2/Kho.
// 4. Trên điện thoại: chỉ THẺ CHA giữ khung tre, thẻ CON bỏ khung + scale nhỏ.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống transfer-fields.test.mjs) ───────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ctxStub(),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function ctxStub() {
  return new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
      return () => undefined;
    },
    set() { return true; }
  });
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
global.Chart = class { constructor(c, g) { this.ctx = c; this.config = g; this.data = (g && g.data) || { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}

const { state, STORAGE_KEY_X2_LOT_LOCATIONS } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';


// ─── Dữ liệu mẫu ────────────────────────────────────────────────
// 2 thẻ nan của công đoạn CHỌN NAN THÔ + 1 thẻ "Loại hẳn" (không dùng để tạo lô)
state.xuong2ChonNanThoRecords = [
  { id: 'cn-1', baothoId: 'bt-1', date: '2026-09-16', dims: [1250, 18, 7], sizeKey: '1250×18×7', cls: 'A1', quantity: 500,  unitVol: 0.0001575, volume: 0.0788, createdAt: '2026-09-16T02:00:00.000Z' },
  { id: 'cn-2', baothoId: 'bt-1', date: '2026-09-16', dims: [1300, 20, 8], sizeKey: '1300×20×8', cls: 'A',  quantity: 1000, unitVol: 0.000208,  volume: 0.208,  createdAt: '2026-09-16T02:00:00.000Z' },
  { id: 'cn-reject', baothoId: 'bt-1', date: '2026-09-16', dims: [1250, 18, 7], sizeKey: '1250×18×7', cls: 'reject', quantity: 50, unitVol: 0.0001575, volume: 0.0079, createdAt: '2026-09-16T02:00:00.000Z' }
];
// Lô nan hiện có: 1 lô đang ở KHO (nguồn của Sấy 2) + 1 lô đang ở Sấy 1 (nguồn Chuyển Kho)
state.batches = [
  { id: 'b-kho1', code: '260910-01', stage: 'kho', date: '2026-09-10', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 800, volume: 0.126, bambooType: 'A1', useFor: 'Ván', location: 'K11', stageHistory: [{ stage: 'kho', date: '2026-09-10' }] },
  { id: 'b-say1a', code: '260912-01', stage: 'say1', date: '2026-09-12', week: '2026-W37', length: 1300, width: 20, thickness: 8, quantity: 600, volume: 0.1248, bambooType: 'A', useFor: 'Ván', location: 'LS1', stageHistory: [{ stage: 'say1', date: '2026-09-12' }] },
  { id: 'b-say2a', code: '260913-01', stage: 'say2', date: '2026-09-13', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063, bambooType: 'B', useFor: 'Bullig', location: 'LS2', say2Date: '2026-09-13', stageHistory: [{ stage: 'say2', date: '2026-09-13' }] }
];

const bm = await import('../js/batch-modals.js');
const x2 = await import('../js/xuong2.js');      // thẻ launcher Xưởng 2 (pop-up)
const mainMod = await import('../js/main.js');    // switchView (đóng modal thuộc tab vừa rời)

// ─── A. NGUỒN CỦA "THÊM LÔ SẤY MỚI" ────────────────────────────
const say1Cards = bm.availableSay1Cards();
check('NGUỒN SẤY 1: lấy từ công đoạn Chọn Nan Thô, BỎ QUA thẻ "Loại hẳn" (2 thẻ)',
  say1Cards.length === 2 && !say1Cards.some(r => r.cls === 'reject'));
check('NGUỒN SẤY 1: phần còn lại = số lượng thẻ khi chưa tạo lô sấy nào',
  bm.nanCardRemainingOf(say1Cards.find(r => r.id === 'cn-1')) === 500);
check('NGUỒN SẤY 2: lấy các lô ĐANG Ở KHO',
  bm.availableKhoLots().length === 1 && bm.availableKhoLots()[0].id === 'b-kho1');

// ─── B. "THÊM LÔ SẤY MỚI" — SẤY 1 (CHỌN NHIỀU THẺ NAN) ─────────
bm.openAddLotModal();
check('FORM: mặc định Sấy 1 + ngày hôm nay + 2 danh sách (nguồn/vị trí) đang đóng',
  document.getElementById('al-stage').value === 'say1' &&
  document.getElementById('al-date').value === new Date().toISOString().split('T')[0] &&
  document.getElementById('al-source-panel').hidden === true &&
  document.getElementById('al-location-panel').hidden === true);
const srcList = document.getElementById('al-source-list');
check('FORM: danh sách nguồn = NÚT TICK từng thẻ ("Dài×Rộng×Dày · Phân loại · Số lượng" + còn lại)',
  srcList.innerHTML.includes('data-al-pick="cn-1"') &&
  srcList.innerHTML.includes('1250×18×7 · A1 · 500') &&
  srcList.innerHTML.includes('còn 500 thanh') && srcList.innerHTML.includes('còn 1.000 thanh'));
check('FORM: nút "Chọn Lô Nan" mở/đóng danh sách thẻ nguồn',
  bm.alToggleSourcePanel() === true &&
  document.getElementById('al-source-panel').hidden === false &&
  bm.alToggleSourcePanel() === false);
check('FORM: bấm 1 thẻ = chọn 1 nguồn (tick xanh) + đếm số nguồn đã chọn',
  bm.alTogglePick('cn-1').length === 1 &&
  document.getElementById('al-picked-count').textContent === '1 đã chọn' &&
  document.getElementById('al-source-list').innerHTML.includes('al-card picked'));
check('FORM: ô "Thông Tin Lấy Từ Nguồn" hiện chi tiết nguồn đã chọn (cỡ nan · phân loại · số lượng sẽ tạo)',
  document.getElementById('al-source-info').innerHTML.includes('1250 × 18 × 7 mm') &&
  document.getElementById('al-source-info').innerHTML.includes('A1') &&
  document.getElementById('al-source-info').innerHTML.includes('tạo lô 500 thanh'));
check('FORM: "Chọn tất cả" chọn hết nguồn khả dụng · "Bỏ chọn" xoá hết',
  bm.alPickAll().length === 2 && bm.alClearPicks().length === 0 &&
  document.getElementById('al-picked-count').textContent === 'Chưa chọn');
check('VỊ TRÍ: danh sách mặc định LS1..LS15 + ô nhập vị trí mới đang ẩn',
  bm.alLocations().length === 15 && bm.alLocations()[0] === 'LS1' && bm.alLocations()[14] === 'LS15' &&
  document.getElementById('al-location-chips').innerHTML.includes('data-al-loc="LS1"') &&
  document.getElementById('al-location-new-row').hidden === true);
check('VỊ TRÍ: bấm chip = chọn vị trí (ghi vào ô ẩn + đóng danh sách + tô chip)',
  bm.alToggleLocationPanel() === true && bm.alSetLocation('LS3') === 'LS3' &&
  document.getElementById('al-location').value === 'LS3' &&
  document.getElementById('al-location-panel').hidden === true &&
  document.getElementById('al-location-chips').innerHTML.includes('al-loc-chip picked'));
document.getElementById('al-location-new').value = 'LS16';
bm.handleAlAddLocation();
check('VỊ TRÍ: nút "Thêm" khai báo vị trí mới (LS16) — lưu state + localStorage + tự chọn',
  state.x2LotLocations.includes('LS16') && bm.alLocations().length === 16 &&
  document.getElementById('al-location').value === 'LS16' &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_LOT_LOCATIONS) || '[]').includes('LS16'));

// ─── XÓA VỊ TRÍ ĐÃ KHAI BÁO (LS1..LS15 là mặc định, KHÔNG xóa được) ──
document.getElementById('al-location-new').value = 'Lò 99';
bm.handleAlAddLocation();
const chipsHtml = document.getElementById('al-location-chips').innerHTML;
check('XÓA VỊ TRÍ: chip vị trí đã khai báo có nút × (data-al-loc-del); chip mặc định (LS3) KHÔNG có',
  chipsHtml.includes('data-al-loc-del="Lò 99"') &&
  chipsHtml.includes('al-loc-item') &&
  !chipsHtml.includes('data-al-loc-del="LS3"'));
check('XÓA VỊ TRÍ: KHÔNG xóa được vị trí mặc định (LS1..LS15)',
  bm.handleAlDeleteLocation('LS3') === false && bm.alLocations().includes('LS3'));
check('XÓA VỊ TRÍ: xóa vị trí đã khai báo → khỏi state + localStorage + danh sách chọn',
  bm.handleAlDeleteLocation('Lò 99') === true &&
  !state.x2LotLocations.includes('Lò 99') && !bm.alLocations().includes('Lò 99') &&
  !JSON.parse(localStorage.getItem(STORAGE_KEY_X2_LOT_LOCATIONS) || '[]').includes('Lò 99'));
document.getElementById('al-location-new').value = 'K99';
bm.handleAlAddLocation();
bm.alSetLocation('K99');
check('XÓA VỊ TRÍ: đang chọn đúng vị trí bị xóa → ô Vị Trí tự về trống (phải chọn lại)',
  bm.handleAlDeleteLocation('k99') === true &&          // khớp không phân biệt hoa/thường
  bm.alCurrentLocation() === '' && document.getElementById('al-location').value === '');
bm.alSetLocation('LS16');
check('VỊ TRÍ: chọn lại LS16 (vị trí đã khai báo) cho lượt lưu tiếp theo',
  bm.alCurrentLocation() === 'LS16');

// ─── UỶ NHIỆM SỰ KIỆN: bấm × trên chip = xóa, bấm chip = chọn ──
function clickTarget(sel, attrValue) {
  return { closest: (q) => (q === sel ? { getAttribute: () => attrValue } : null) };
}
document.getElementById('al-location-new').value = 'X99';
bm.handleAlAddLocation();
bm.alOnLocationChipClick({ target: clickTarget('[data-al-loc-del]', 'X99') });
check('UỶ NHIỆM: bấm nút × trên chip → xóa đúng vị trí đã khai báo',
  !state.x2LotLocations.includes('X99') && !bm.alLocations().includes('X99'));
bm.alOnLocationChipClick({ target: clickTarget('[data-al-loc]', 'LS7') });
check('UỶ NHIỆM: bấm chip vị trí → chọn đúng vị trí đó', bm.alCurrentLocation() === 'LS7');
bm.alSetLocation('LS16');   // trả về vị trí dùng cho các lượt lưu bên dưới

// Lưu khi CHƯA chọn nguồn → chặn
document.getElementById('al-date').value = '2026-09-17';
const cntB0 = state.batches.length;
bm.handleAddLotSubmit({ preventDefault(){} });
check('CHẶN: chưa chọn nguồn nào → không tạo lô', state.batches.length === cntB0);

// Chọn 2 thẻ cùng lúc → tạo 2 lô, số lượng = phần còn lại của TỪNG thẻ
bm.alTogglePick('cn-1');
bm.alTogglePick('cn-2');
check('CHỌN NHIỀU: giữ được 2 nguồn cùng lúc', bm.alPickedIds().length === 2);
document.getElementById('al-notes').value = 'Mẻ đầu';
bm.handleAddLotSubmit({ preventDefault(){} });
const bNew1 = state.batches.find(b => b.sourceChonNanId === 'cn-1');
const bNew2 = state.batches.find(b => b.sourceChonNanId === 'cn-2');
check('SẤY 1: tạo 2 lô cùng lúc — kích thước/loại từ thẻ nan, SỐ LƯỢNG = phần còn lại',
  !!bNew1 && !!bNew2 && bNew1.stage === 'say1' && bNew2.stage === 'say1' &&
  bNew1.quantity === 500 && bNew2.quantity === 1000 &&
  bNew1.length === 1250 && bNew1.width === 18 && bNew1.thickness === 7 &&
  bNew2.length === 1300 && bNew1.bambooType === 'A1' && bNew2.bambooType === 'A');
check('SẤY 1: NGÀY = ngày vào Sấy 1 (2026-09-17) + ghi mốc stageHistory để đếm ngày',
  bNew1.date === '2026-09-17' &&
  bNew1.stageHistory.some(h => h.stage === 'say1' && h.date === '2026-09-17'));
check('SẤY 1: Vị Trí = LS16 (vị trí khai báo thêm) + thể tích quy đổi + link thẻ nan nguồn',
  bNew1.location === 'LS16' && bNew2.location === 'LS16' &&
  Math.abs(bNew1.volume - 0.0788) < 0.0001 && bNew1.sourceChonNanId === 'cn-1');
check('SẤY 1: mã lô tự sinh KHÁC NHAU cho từng lô trong cùng 1 lượt lưu',
  bNew1.code === '260917-01' && bNew2.code === '260917-02');
check('SẤY 1: dùng hết 2 thẻ nan → không còn nguồn khả dụng + form đóng lại',
  bm.availableSay1Cards().length === 0 &&
  !document.getElementById('modal-add-lot').classList.contains('show'));

// ─── C. "THÊM LÔ SẤY MỚI" — SẤY 2 (chuyển lô từ Kho) ──────────
bm.openAddLotModal();
document.getElementById('al-stage').value = 'say2';
bm.syncAddLotUI();
// Thêm 1 lô nữa ở Kho để kiểm tra chuyển NHIỀU lô cùng lúc
state.batches.push({
  id: 'b-kho2', code: '260911-01', stage: 'kho', date: '2026-09-11', week: '2026-W37',
  length: 1300, width: 20, thickness: 8, quantity: 300, volume: 0.0624, bambooType: 'A',
  useFor: 'Ván', location: 'K12', stageHistory: [{ stage: 'kho', date: '2026-09-11' }]
});
bm.syncAddLotUI();
check('SẤY 2: nút nguồn đổi thành "Chọn Lô Ở Kho" + danh sách là LÔ đang ở Kho',
  document.getElementById('al-source-btn-text').textContent === 'Chọn Lô Ở Kho' &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  document.getElementById('al-source-list').innerHTML.includes('260910-01') &&
  document.getElementById('al-source-list').innerHTML.includes('260911-01'));
bm.alTogglePick('b-kho1');
bm.alTogglePick('b-kho2');
check('SẤY 2: chọn nhiều lô → hiện chi tiết TỪNG lô nguồn (mã lô · kích thước · loại · lượng)',
  bm.alPickedIds().length === 2 &&
  document.getElementById('al-source-info').innerHTML.includes('260910-01') &&
  document.getElementById('al-source-info').innerHTML.includes('260911-01') &&
  document.getElementById('al-source-info').innerHTML.includes('1250 × 18 × 7 mm'));
document.getElementById('al-date').value = '2026-09-18';
bm.alSetLocation('LS2');
bm.handleAddLotSubmit({ preventDefault(){} });
const b2 = state.batches.find(b => b.id === 'b-kho1');
const b2b = state.batches.find(b => b.id === 'b-kho2');
check('SẤY 2: chuyển CẢ 2 lô từ KHO sang SẤY 2 (giữ mã lô/kích thước/số lượng)',
  b2.stage === 'say2' && b2.quantity === 800 && b2.length === 1250 &&
  b2b.stage === 'say2' && b2b.quantity === 300);
check('SẤY 2: NGÀY vào Sấy 2 = ngày đã chọn (say2Date + stageHistory)',
  b2.say2Date === '2026-09-18' &&
  b2.stageHistory.some(h => h.stage === 'say2' && h.date === '2026-09-18'));
check('SẤY 2: Vị Trí cập nhật theo ô chọn vị trí (LS2)', b2.location === 'LS2' && b2b.location === 'LS2');
check('SẤY 2: 2 lô đã RỜI Kho nên danh sách lô ở Kho trống',
  bm.availableKhoLots().length === 0);


// ─── D. "CHUYỂN KHO" — Sấy 1 / Sấy 2 → Kho ─────────────────────
// Thêm 1 lô nữa ở cùng vị trí LS1 để kiểm tra "tất cả lô trong vị trí cùng chuyển"
state.batches.push({
  id: 'b-say1b', code: '260912-02', stage: 'say1', date: '2026-09-12', week: '2026-W37',
  length: 1300, width: 20, thickness: 8, quantity: 400, volume: 0.0832, bambooType: 'A',
  useFor: 'Ván', location: 'LS1', stageHistory: [{ stage: 'say1', date: '2026-09-12' }]
});
bm.openTransferKhoModal();
check('CHUYỂN KHO: danh sách = các VỊ TRÍ đang có lô (kèm số lô + tổng số lượng)',
  bm.khoPositionsAt('say1').length === 2 &&
  document.getElementById('ck-lot').innerHTML.includes('LS1 — 2 lô · 1.000 thanh') &&
  document.getElementById('ck-lot').innerHTML.includes('LS16 — 2 lô · 1.500 thanh'));
check('CHUYỂN KHO: các ô "Thêm mới" đang ẨN (chưa chọn công đoạn Thêm mới)',
  document.getElementById('ck-new-group').style.display === 'none' &&
  document.getElementById('ck-new-dims-group').style.display === 'none');
document.getElementById('ck-lot').value = 'LS1';
bm.updateCkPosInfo();
check('CHUYỂN KHO: ô tóm tắt nói rõ sẽ chuyển BAO NHIÊU lô · tổng số lượng · tổng thể tích',
  document.getElementById('ck-pos-info').innerHTML.includes('2 lô') &&
  document.getElementById('ck-pos-info').innerHTML.includes('1.000 thanh'));
document.getElementById('ck-date').value = '2026-09-19';
document.getElementById('ck-new-loc').value = 'K12';        // VỊ TRÍ MỚI NHẬP TAY
document.getElementById('ck-notes').value = 'Đủ khô';
bm.handleTransferKhoSubmit({ preventDefault(){} });
const bSay1 = state.batches.find(b => b.id === 'b-say1a');
const bSay1b = state.batches.find(b => b.id === 'b-say1b');
check('CHUYỂN KHO: TẤT CẢ lô ở vị trí LS1 cùng vào KHO (giữ mã/kích thước/số lượng)',
  bSay1.stage === 'kho' && bSay1.quantity === 600 && bSay1.length === 1300 &&
  bSay1b.stage === 'kho' && bSay1b.quantity === 400);
check('CHUYỂN KHO: NGÀY vào Kho = ngày đã chọn (khoDate + stageHistory)',
  bSay1.khoDate === '2026-09-19' &&
  bSay1.stageHistory.some(h => h.stage === 'kho' && h.date === '2026-09-19'));
check('CHUYỂN KHO: Vị trí mới ở Kho NHẬP TAY (K12) + ghi chú áp dụng cho MỌI lô trong vị trí',
  bSay1.location === 'K12' && bSay1.notes === 'Đủ khô' &&
  bSay1b.location === 'K12' && bSay1b.notes === 'Đủ khô');
check('CHUYỂN KHO: vị trí LS1 đã hết lô nên KHÔNG còn trong danh sách chọn',
  !bm.khoPositionsAt('say1').some(g => g.location === 'LS1'));

// Chuyển vị trí LS16 → Kho, để trống vị trí mới = GIỮ NGUYÊN vị trí cũ
bm.openTransferKhoModal();
document.getElementById('ck-lot').value = 'LS16';
document.getElementById('ck-date').value = '2026-09-20';
document.getElementById('ck-new-loc').value = '';            // giữ nguyên vị trí cũ
bm.handleTransferKhoSubmit({ preventDefault(){} });
check('CHUYỂN KHO: để trống vị trí mới = GIỮ NGUYÊN vị trí cũ (LS16)',
  bNew1.stage === 'kho' && bNew1.location === 'LS16' && bNew1.khoDate === '2026-09-20' &&
  bNew2.stage === 'kho' && bNew2.location === 'LS16');
check('CHUYỂN KHO: đổi sang Sấy 2 → danh sách vị trí chỉ hiện vị trí đang ở Sấy 2',
  (function () {
    bm.openTransferKhoModal();
    document.getElementById('ck-stage').value = 'say2';
    bm.syncTransferKhoUI();
    return bm.khoPositionsAt('say2').map(g => g.location).join(',') === 'LS2' &&
      document.getElementById('ck-lot').innerHTML.includes('LS2');
  })());
check('CHUYỂN KHO: gợi ý (datalist) vị trí Kho đang có cho ô NHẬP TAY',
  (function () {
    bm.openTransferKhoModal();
    document.getElementById('ck-stage').value = 'say1';
    bm.syncTransferKhoUI();
    return document.getElementById('ck-new-loc-list').innerHTML.includes('K12');
  })());



// ─── E. "CHUYỂN KHO" — THÊM MỚI (tạo lô vào thẳng Kho) ──────────
bm.openTransferKhoModal();
document.getElementById('ck-stage').value = 'new';
bm.syncTransferKhoUI();
check('THÊM MỚI: hiện đủ ô Ngày · Vị trí · Kích thước · Số lượng · Loại nan · Dùng cho',
  document.getElementById('ck-lot-group').style.display === 'none' &&
  document.getElementById('ck-pos-info-group').style.display === 'none' &&
  document.getElementById('ck-new-group').style.display === '' &&
  document.getElementById('ck-new-dims-group').style.display === '' &&
  document.getElementById('ck-new-qty-group').style.display === '' &&
  document.getElementById('ck-new-type-group').style.display === '' &&
  document.getElementById('ck-new-use-group').style.display === '' &&
  document.getElementById('ck-new-vol-group').style.display === '');
document.getElementById('ck-date').value = '2026-09-21';
document.getElementById('ck-new-loc-new').value = 'K20';
document.getElementById('ck-new-length').value = '1250';
document.getElementById('ck-new-width').value = '18';
document.getElementById('ck-new-thickness').value = '7';
document.getElementById('ck-new-qty').value = '2000';
document.getElementById('ck-new-type').value = 'A1';
document.getElementById('ck-new-use').value = 'Bullig';
bm.updateCkNewVolume();
check('THÊM MỚI: thể tích quy đổi tự tính (1250×18×7 × 2.000 = 0,3150 m³)',
  document.getElementById('ck-new-vol').textContent === '0.3150 m³');
bm.handleTransferKhoSubmit({ preventDefault(){} });
const bNew = state.batches.find(b => b.location === 'K20');
check('THÊM MỚI: tạo lô mới ở thẳng KHO với đủ thông tin đã nhập',
  !!bNew && bNew.stage === 'kho' && bNew.length === 1250 && bNew.width === 18 &&
  bNew.thickness === 7 && bNew.quantity === 2000 && bNew.bambooType === 'A1' &&
  bNew.useFor === 'Bullig' && Math.abs(bNew.volume - 0.315) < 1e-9);
check('THÊM MỚI: NGÀY vào Kho = ngày đã chọn (khoDate + stageHistory)',
  bNew.khoDate === '2026-09-21' &&
  bNew.stageHistory.some(h => h.stage === 'kho' && h.date === '2026-09-21'));
// Chặn khi thiếu thông tin bắt buộc (form.reset() ở trình duyệt xoá ô — stub thì xoá tay)
bm.openTransferKhoModal();
document.getElementById('ck-stage').value = 'new';
bm.syncTransferKhoUI();
document.getElementById('ck-date').value = '2026-09-21';
document.getElementById('ck-new-loc-new').value = 'K21';
['ck-new-length', 'ck-new-width', 'ck-new-thickness', 'ck-new-qty'].forEach(id => {
  document.getElementById(id).value = '';
});
const cntNew = state.batches.length;
bm.handleTransferKhoSubmit({ preventDefault(){} });
check('CHẶN (Thêm mới): thiếu Kích thước > 0 → không tạo lô', state.batches.length === cntNew);
document.getElementById('ck-new-length').value = '1250';
document.getElementById('ck-new-width').value = '18';
document.getElementById('ck-new-thickness').value = '7';
document.getElementById('ck-new-qty').value = '0';
bm.handleTransferKhoSubmit({ preventDefault(){} });
check('CHẶN (Thêm mới): Số lượng = 0 → không tạo lô', state.batches.length === cntNew);
bm.closeTransferKhoModal();

// ─── F. CẤU TRÚC: 3 CỘT (TẠM ẨN BÀO TINH — CỜ XÓA SAU) ──────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const jsState = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsStorage = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const jsEvents = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): nút "Thêm Lô Sấy Mới" + nút "Chuyển Kho" trong thanh công cụ',
  idxHtml.includes('btn-add-batch') && idxHtml.includes('Thêm Lô Sấy Mới') &&
  idxHtml.includes('btn-transfer-kho') && idxHtml.includes('Chuyển Kho'));
check('CẤU TRÚC (index.html): modal "Thêm Lô Sấy Mới" — nút chọn nguồn NHIỀU + nút chọn VỊ TRÍ',
  idxHtml.includes('id="modal-add-lot"') && idxHtml.includes('"al-stage"') &&
  idxHtml.includes('"al-date"') && idxHtml.includes('id="al-source-btn"') &&
  idxHtml.includes('id="al-source-panel"') && idxHtml.includes('id="al-source-list"') &&
  idxHtml.includes('id="al-pick-all"') && idxHtml.includes('id="al-pick-clear"') &&
  idxHtml.includes('id="al-location-btn"') && idxHtml.includes('id="al-location-chips"') &&
  idxHtml.includes('id="al-location-add"') && idxHtml.includes('id="al-location-new"'));
check('CẤU TRÚC (index.html): ĐÃ BỎ ô nhập Số lượng của modal Thêm Lô Sấy Mới',
  !idxHtml.includes('id="al-qty"') && !idxHtml.includes('al-qty-group'));
check('CẤU TRÚC (index.html): modal "Chuyển Kho" — chọn VỊ TRÍ + vị trí mới NHẬP TAY (datalist)',
  idxHtml.includes('id="modal-transfer-kho"') && idxHtml.includes('"ck-stage"') &&
  idxHtml.includes('"ck-lot"') && idxHtml.includes('id="ck-pos-info"') &&
  idxHtml.includes('"ck-date"') && idxHtml.includes('id="ck-new-loc"') &&
  idxHtml.includes('id="ck-new-loc-list"') && idxHtml.includes('"ck-new-length"') &&
  idxHtml.includes('"ck-new-qty"') && idxHtml.includes('"ck-new-type"') && idxHtml.includes('"ck-new-use"'));
check('CẤU TRÚC (styles.css): ĐIỆN THOẠI — chỉ THẺ CHA giữ khung tre, thẻ con bỏ khung + scale nhỏ',
  cssHtml.includes('CHỈ THẺ CHA GIỮ KHUNG TRE') &&
  /@media \(max-width: 639\.98px\)[\s\S]{0,600}bamboo-card[\s\S]{0,400}border-image: none/.test(cssHtml) &&
  cssHtml.includes('body[data-theme="night"] .view-panel { zoom: 0.9; }'));
check('CẤU TRÚC (js): vị trí sấy khai báo thêm có key riêng + nối vào storage/cloud/history/main',
  jsState.includes("bamboo_tracker_x2_lot_locations_v1") &&
  jsStorage.includes('x2LotLocations') &&
  jsCloud.includes('x2LotLocations') &&
  jsHistory.includes('x2LotLocations') &&
  jsMain.includes('loadX2LotLocations'));
check('CẤU TRÚC (sw.js): đã tăng CACHE_NAME (PWA không dùng cache cũ)',
  /nha-may-ngoc-son-v155/.test(swJs));
check('CẤU TRÚC (styles.css): pop-up thẻ chi tiết CHỈ GIỮ 1 KHUNG (bỏ khung + padding ngoài của shell)',
  cssHtml.includes('CHỈ GIỮ 1 KHUNG') &&
  /#x2-detail-card, #qc-detail-card, #hr-detail-card \{[\s\S]{0,220}border: none/.test(cssHtml) &&
  cssHtml.includes('.x2-detail-content, .qc-detail-content, .hr-detail-content { padding: 0; }') &&
  cssHtml.includes('min-height: 100%'));
check('CẤU TRÚC (styles.css): ẩn HÀNG TIÊU ĐỀ lặp trong pop-up (chỉ khi header không có nút/ô chức năng)',
  /\.x2-detail-content > \.planning-card > \.planning-card-header:not\(:has\(button\)\)/.test(cssHtml) &&
  cssHtml.includes('.qc-detail-content > .planning-card > .planning-card-header:not(:has(button))') &&
  cssHtml.includes('.hr-detail-content > .planning-card > .planning-card-header:not(:has(button))'));
check('CẤU TRÚC (styles.css): khối TỐI ƯU ĐIỆN THOẠI (chạm nhanh · ô nhập 16px · modal dvh + footer dính)',
  cssHtml.includes('TỐI ƯU ĐIỆN THOẠI (≤639.98px)') &&
  cssHtml.includes('touch-action: manipulation') &&
  cssHtml.includes('font-size: 16px') &&
  cssHtml.includes('calc(100dvh - 16px)') &&
  cssHtml.includes('overscroll-behavior: contain') &&
  cssHtml.includes('-webkit-text-size-adjust: 100%'));
check('CẤU TRÚC (styles.css + index.html): XÓA vị trí đã khai báo — nút .al-loc-del + gợi ý trong modal',
  cssHtml.includes('.al-loc-del') && cssHtml.includes('.al-loc-item') &&
  idxHtml.includes('id="al-location-hint"'));

// ─── SỬA LỖI MẤT CUỘN: khoá cuộn chỉ tính modal ĐANG HIỂN THỊ ──────────
check('CUỘN: CSS chỉ khoá cuộn khi modal ĐANG hiện (cấp trang / trong <main> / trong TAB ĐANG MỞ) — bỏ rule cũ khoá cả trang',
  cssHtml.includes('body:has(> .modal-overlay.show)') &&
  cssHtml.includes('body:has(> main > .modal-overlay.show)') &&
  cssHtml.includes('body:has(.view-panel.active .modal-overlay.show)') &&
  !/body:has\(\.modal-overlay\.show\)\s*\{\s*overflow:\s*hidden/.test(cssHtml));
check('CUỘN: main.js có closeViewScopedModals + gọi khi rời tab (đóng pop-up/modal thuộc tab vừa rời)',
  jsMain.includes('function closeViewScopedModals(') &&
  jsMain.includes('closeViewScopedModals(document.getElementById(prevView))') &&
  jsMain.includes('x2CloseOpenCard') && jsMain.includes('qcCloseOpenCard') && jsMain.includes('hrCloseOpenCard'));
check('CUỘN: rời tab Công Đoạn khi đang mở thẻ Xưởng 2 → pop-up đóng + trạng thái thẻ đang mở được dọn',
  (function () {
    // Mở thẻ Xưởng 2 (pop-up bật) rồi chuyển sang tab khác
    state.activeView = 'kanban-view';
    x2.x2OpenCard('x2-than-hoa-card');
    const overlay = document.getElementById('x2-detail-overlay');
    const hadShow = overlay.classList.contains('show');
    // Stub DOM: cho view Công Đoạn "tìm thấy" overlay đang mở
    const kanbanEl = document.getElementById('kanban-view');
    kanbanEl.querySelectorAll = (sel) => (String(sel).indexOf('.modal-overlay.show') !== -1 ? [overlay] : []);
    try { mainMod.switchView('materials-view'); } catch (e) { /* view khác có thể cần dữ liệu — chỉ cần phần đóng modal chạy */ }
    return hadShow && !overlay.classList.contains('show') &&
      x2.x2OpenCardId() === null && state.x2OpenCardId === null;
  })());
check('CẤU TRÚC (events.js): chạm ra ngoài danh sách → tự đóng + chốt bỏ qua phần tử vừa vẽ lại',
  jsEvents.includes("closest('#al-source-panel')") &&
  jsEvents.includes("closest('#al-location-panel')") &&
  jsEvents.includes('document.contains(t)'));
check('CẤU TRÚC (index.html): tab mobile "Bào tinh" đã bỏ; cột Bào Tinh gắn cờ ẩn',
  !idxHtml.includes('data-stage="bao_tinh"') && idxHtml.includes('data-stage-col="bao_tinh" data-x2-hidden="1"'));
check('CẤU TRÚC (styles.css): khối "TẠM ẨN CỘT BÀO TINH" (cờ xóa sau) + lưới Kanban 3 cột',
  cssHtml.includes('TẠM ẨN CỘT "4. BÀO TINH"') &&
  cssHtml.includes('.kanban-column[data-stage-col="bao_tinh"]') &&
  cssHtml.includes('repeat(3, 1fr)'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
