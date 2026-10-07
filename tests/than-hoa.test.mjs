// tests/than-hoa.test.mjs — Kiểm thử công đoạn THAN HÓA + SẤY (Xưởng 2):
// 1. "Thêm Lô Sấy Mới": nút "Chọn Lô Nan" mở danh sách THẺ nguồn — CHỌN ĐƯỢC
//    NHIỀU nguồn cùng lúc (Sấy 1: thẻ nan Chọn Nan Thô · Sấy 2: lô đang ở Kho);
//    KHÔNG còn ô nhập Số lượng (số lượng lấy nguyên theo nguồn).
//    Vị Trí = nút chọn → LS1..LS15 + nút "Thêm" (khai báo vị trí mới, lưu state).
// 2. "Chuyển Kho": chọn VỊ TRÍ (chỉ các vị trí đang có lô) → TẤT CẢ lô nan trong
//    vị trí đó cùng vào Kho; Vị trí mới ở Kho NHẬP TAY (có gợi ý sẵn).
// 3. Cột "Bào Tinh" đã XÓA HẲN khỏi Kanban (markup + CSS cờ ẩn) — planning đọc
//    THẺ Bào Tinh (state.xuong2BaoTinhRecords); công đoạn còn Sấy 1/Sấy 2/Kho.
// 4. Trên điện thoại: chỉ THẺ CHA giữ khung tre, thẻ CON bỏ khung + scale nhỏ.
// 5. Form "Thêm Lô Sấy Mới": ô tìm THEO SỐ LƯỢNG (RIÊNG, chỉ khớp số lượng,
//    lọc KẾT HỢP ô tìm nhanh bằng điều kiện VÀ) + danh sách nguồn là DROPDOWN NỔI
//    trải bề rộng màn hình đang xem, cao tối đa 5 DÒNG THẺ rồi tự cuộn.
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
check('FORM: danh sách nguồn = thẻ KHÔNG ô tick, 2 DÒNG (Vị trí·KT·Loại·SL + chip Dùng cho + badge ngày màu)',
  srcList.innerHTML.includes('data-al-pick="cn-1"') &&
  !srcList.innerHTML.includes('al-card-check') &&
  srcList.innerHTML.includes('— · 1250×18×7 · A1 · 500 thanh (còn)') &&
  srcList.innerHTML.includes('al-use-tag') &&
  srcList.innerHTML.includes('Dùng cho theo form') === false &&
  /class="al-use-tag use-van">Ván</.test(srcList.innerHTML));
check('FORM: có ô chọn "Dùng Cho" (Ván/Bullig), mặc định Ván',
  !!document.getElementById('al-use-for') &&
  document.getElementById('al-use-for').value === 'Ván');
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
check('SẤY 1: Dùng Cho lấy từ form (mặc định Ván)', bNew1.useFor === 'Ván' && bNew2.useFor === 'Ván');
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
check('SẤY 2: thẻ LÔ 2 DÒNG (Vị trí · KT · Loại · SL / chip Dùng cho + badge S1-S2-K ngày màu)',
  document.getElementById('al-source-btn-text').textContent === 'Chọn Lô Ở Kho' &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  document.getElementById('al-source-list').innerHTML.includes('K11 · 1250×18×7 · A1 · 800 thanh') &&
  document.getElementById('al-source-list').innerHTML.includes('K12 · 1300×20×8 · A · 300 thanh') &&
  /class="al-use-tag use-van">Ván</.test(document.getElementById('al-source-list').innerHTML) &&
  document.getElementById('al-source-list').innerHTML.includes('al-day-badge day-s1') &&
  document.getElementById('al-source-list').innerHTML.includes('al-day-badge day-s2') &&
  document.getElementById('al-source-list').innerHTML.includes('al-day-badge day-k') &&
  /S1-\d+ ngày/.test(document.getElementById('al-source-list').innerHTML));

// ─── TÌM NHANH trong danh sách nguồn (như ô tìm kiếm của cột Kanban) ──
bm.alSetSourceQuery('K12');
check('TÌM NHANH: gõ "K12" (vị trí) → chỉ còn lô ở K12',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQuery('1300');
check('TÌM NHANH: gõ "1300" (kích thước) → lọc đúng lô 1300×20×8',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQuery('van');
check('TÌM NHANH: gõ không dấu "van" → khớp "Dùng cho Ván" (2 lô)',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"'));
bm.alSetSourceQuery('zzz');
check('TÌM NHANH: không khớp → báo "Không có thẻ/lô nào khớp"',
  document.getElementById('al-source-list').innerHTML.includes('Không có thẻ/lô nào khớp'));
bm.alSetSourceQuery('');

// ─── TÌM THEO SỐ LƯỢNG (ô RIÊNG — chỉ khớp số lượng, lọc KẾT HỢP 2 ô) ──
bm.alSetSourceQtyQuery('800');
check('TÌM SỐ LƯỢNG: gõ "800" → chỉ lô còn 800 thanh (b-kho1)',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"'));
bm.alSetSourceQtyQuery('300');
check('TÌM SỐ LƯỢNG: gõ "300" → chỉ lô 300 thanh (b-kho2)',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQtyQuery('1300');
check('TÌM SỐ LƯỢNG: gõ "1300" (là KÍCH THƯỚC) → không lô nào — ô này CHỈ khớp số lượng',
  document.getElementById('al-source-list').innerHTML.includes('Không có thẻ/lô nào khớp'));
// 2 ô LỌC KẾT HỢP (điều kiện VÀ)
bm.alSetSourceQuery('K12'); bm.alSetSourceQtyQuery('800');
check('KẾT HỢP 2 Ô: vị trí K12 + số lượng 800 → không lô nào (K12 chỉ có 300 thanh)',
  document.getElementById('al-source-list').innerHTML.includes('Không có thẻ/lô nào khớp'));
bm.alSetSourceQuery('K12'); bm.alSetSourceQtyQuery('300');
check('KẾT HỢP 2 Ô: vị trí K12 + số lượng 300 → đúng lô b-kho2',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"') &&
  !document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"'));
bm.alSetSourceQuery(''); bm.alSetSourceQtyQuery('');
check('TÌM SỐ LƯỢNG: xóa cả 2 ô → hiện lại đủ 2 lô nguồn',
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho1"') &&
  document.getElementById('al-source-list').innerHTML.includes('data-al-pick="b-kho2"'));
bm.alTogglePick('b-kho1');
bm.alTogglePick('b-kho2');
check('SẤY 2: chọn nhiều lô → hiện chi tiết TỪNG lô nguồn (mã lô · kích thước · loại · lượng)',
  bm.alPickedIds().length === 2 &&
  document.getElementById('al-source-info').innerHTML.includes('260910-01') &&
  document.getElementById('al-source-info').innerHTML.includes('260911-01') &&
  document.getElementById('al-source-info').innerHTML.includes('1250 × 18 × 7 mm'));
document.getElementById('al-date').value = '2026-09-18';
bm.alSetLocation('LS2');
document.getElementById('al-use-for').value = 'Bullig';   // Dùng Cho áp cho lô chuyển sang Sấy 2
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
check('SẤY 2: Dùng Cho chọn ở form được áp cho mọi lô chuyển sang (Bullig)',
  b2.useFor === 'Bullig' && b2b.useFor === 'Bullig');
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

// ─── F. CẤU TRÚC: 3 CỘT (CỘT BÀO TINH ĐÃ XÓA HẲN) ──────────────
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
  idxHtml.includes('id="al-pick-all"') &&
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
  /nha-may-ngoc-son-v223/.test(swJs));
const jsDash = fs.readFileSync(new URL('../js/dashboard.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): 3 thẻ KPI cuối tab Công Đoạn đã gỡ sạch (Sấy+Kho · Bào Tinh · Phân bổ)',
  !idxHtml.includes('quick-stats-bar') && !idxHtml.includes('quick-bao-') &&
  !idxHtml.includes('quick-process-') && !idxHtml.includes('quick-total-') &&
  !idxHtml.includes('flow-bar-') && !idxHtml.includes('flow-vol-') &&
  !idxHtml.includes('flow-count-') && !idxHtml.includes('stage-flow-mini') &&
  !idxHtml.includes('quick-stat-divider') && !idxHtml.includes('quick-stat-item'));
check('CẤU TRÚC (index.html): cắt điểm tạo lô Bào Tinh cũ — hết option "4. Bào Tinh" (form + xuất)',
  !idxHtml.includes('<option value="bao_tinh">4. Bào Tinh</option>') &&
  !idxHtml.includes('form-baotinh-date-group'));
check('CẤU TRÚC (styles.css): CSS của 3 thẻ KPI + flow mini + step-progress-bar đã gỡ',
  !cssHtml.includes('.quick-stats-bar') && !cssHtml.includes('.quick-stat-group') &&
  !cssHtml.includes('.stat-group-label') && !cssHtml.includes('.quick-stat-item') &&
  !cssHtml.includes('.stat-label') && !cssHtml.includes('.stat-value') &&
  !cssHtml.includes('.stage-flow-mini') && !cssHtml.includes('.flow-mini-') &&
  !cssHtml.includes('.step-progress-bar') && !cssHtml.includes('.quick-stat-divider'));
check('CẤU TRÚC (js): renderQuickStats/renderStageFlow gỡ sạch + purge lô Bào Tinh cũ nối đủ boot & nạp file',
  !jsMain.includes('renderQuickStats') && !jsMain.includes('renderStageFlow') &&
  !jsDash.includes('renderStageFlow') &&
  jsMain.includes('purgeLegacyBaoTinhBatches') && jsStorage.includes('purgeLegacyBaoTinhBatches') &&
  jsStorage.includes("trackDeleted('batches'") && jsStorage.includes("stage === 'bao_tinh'"));
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
check('CẤU TRÚC (index.html): tab mobile "Bào tinh" đã bỏ; CỘT Bào Tinh ĐÃ XÓA HẲN (không còn markup/cờ ẩn)',
  !idxHtml.includes('data-stage="bao_tinh"') && !idxHtml.includes('data-stage-col="bao_tinh"') &&
  !idxHtml.includes('cards-bao-tinh'));
check('CẤU TRÚC (styles.css): khối "TẠM ẨN CỘT BÀO TINH" đã gỡ + lưới Kanban 3 cột (≥1200px)',
  !cssHtml.includes('TẠM ẨN CỘT "4. BÀO TINH"') &&
  !cssHtml.includes('.kanban-column[data-stage-col="bao_tinh"]') &&
  cssHtml.includes('repeat(3, 1fr)'));

// ─── M. THỐNG KÊ THAN HÓA + SẤY THEO TỪNG LẦN THAN HÓA ─────────
// Mỗi LẦN than hóa = 1 mẻ đưa nan vào lò: mọi lô trong lần đó đều qua 105 phút
// (vào Sấy 1) hoặc 50 phút (vào Sấy 2). Định mức m³/lần (mặc định 2 m³) áp cho
// TỔNG thể tích các lô trong NGÀY của từng công đoạn → tự GỘP NHÓM các lô cho
// gần bằng 2 m³ thành 1 lần (phần còn lại = lần cuối): ngày 3 m³ ⇒ 2 lần.
// Lô đơn vượt 2 m³ vẫn 1 lần riêng. Nhập tay "Số lần TH" của nhóm thì chia đúng số đó.
state.hrPositions = [
  { id: 'pos-thanhoa', name: 'Than hóa', department: 'Xưởng 2' },
  { id: 'pos-cut',     name: 'Cắt chọn', department: 'Xưởng 2' }
];
state.hrEmployees = [{ id: 'e-lua', name: 'Trần Văn Lửa', department: 'Xưởng 2' }];
state.hrAssignments = [
  // 21/09 (Thứ Hai — ngày làm việc): 2 lượt vị trí "Than hóa" = 07:00–11:30 + 13:00–17:30 → 9h HC
  { id: 'asg-1', date: '2026-09-21', department: 'Xưởng 2', positionId: 'pos-thanhoa', employeeId: 'e-lua', shiftIdx: 0, start: '07:00', end: '11:30' },
  { id: 'asg-2', date: '2026-09-21', department: 'Xưởng 2', positionId: 'pos-thanhoa', employeeId: 'e-lua', shiftIdx: 0, start: '13:00', end: '17:30' },
  // Bố trí ở vị trí KHÁC (Cắt chọn) — KHÔNG được cộng vào giờ than hóa
  { id: 'asg-3', date: '2026-09-21', department: 'Xưởng 2', positionId: 'pos-cut', employeeId: 'e-lua', shiftIdx: 0, start: '07:00', end: '17:30' },
  // 22/09: 1 lượt "Than hóa" 07:00–11:30 → 4,5h HC (ngày có CẢ Sấy 1 và Sấy 2)
  { id: 'asg-4', date: '2026-09-22', department: 'Xưởng 2', positionId: 'pos-thanhoa', employeeId: 'e-lua', shiftIdx: 0, start: '07:00', end: '11:30' }
];
state.batches = [
  // 21/09 — Sấy 1: 3 lô × 1 m³ = 3 m³ → gộp 2 lần (Lần 1 = 2 m³ gồm 2 lô · Lần 2 = 1 m³)
  { id: 'tb-a', code: '260921-01', stage: 'say1', date: '2026-09-21', location: 'LS1', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 1, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-21' }] },
  { id: 'tb-b', code: '260921-02', stage: 'say1', date: '2026-09-21', location: 'LS1', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 1, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-21' }] },
  { id: 'tb-c', code: '260921-03', stage: 'say1', date: '2026-09-21', location: 'LS2', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 1, bambooType: 'A1', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-21' }] },
  // 22/09 — Sấy 1: 1 LÔ LỚN 5 m³ (vượt 2 m³ vẫn 1 lần riêng) + Sấy 2: 0,4 m³ (1 lần 50 phút)
  { id: 'tb-big', code: '260922-01', stage: 'say1', date: '2026-09-22', location: 'LS4', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 5, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-22' }] },
  { id: 'tb-s2', code: '260918-01', stage: 'say2', date: '2026-09-18', say2Date: '2026-09-22', location: 'LS3', length: 1250, width: 20, thickness: 16, quantity: 1000, volume: 0.4, bambooType: 'B', useFor: 'Bullig', stageHistory: [{ stage: 'say1', date: '2026-09-18' }, { stage: 'say2', date: '2026-09-22' }] },
  // 23/09 — Sấy 1: 3 lô × 2 m³ = 6 m³ → 3 lần (mỗi lần đúng 2 m³)
  { id: 'tb-d', code: '260923-02', stage: 'say1', date: '2026-09-23', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-23' }] },
  { id: 'tb-e', code: '260923-03', stage: 'say1', date: '2026-09-23', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-23' }] },
  { id: 'tb-f', code: '260923-04', stage: 'say1', date: '2026-09-23', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-23' }] },
  // Vào Sấy 1 ngày 19/09 (0,6 m³) rồi chuyển KHO ngày 24/09 — ngày vào Kho KHÔNG sinh lần nào
  { id: 'tb-kho', code: '260919-01', stage: 'kho', date: '2026-09-19', khoDate: '2026-09-24', location: 'K11', length: 1250, width: 20, thickness: 18, quantity: 1000, volume: 0.6, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-19' }, { stage: 'kho', date: '2026-09-24' }] },
  // Lô tạo THẲNG vào Kho (không qua Sấy 1) — không sinh lần than hóa nào
  { id: 'tb-new', code: '260924-01', stage: 'kho', date: '2026-09-24', location: 'K12', length: 1250, width: 20, thickness: 18, quantity: 500, volume: 0.3, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'kho', date: '2026-09-24' }] }
];
state.x2SayRates = { s1: {}, s2: {} };
state.x2SayTimes = {};

// ─── M1. GỘP NHÓM LÔ THEO NGÀY + ĐỊNH MỨC 2 m³/LẦN ─────────────
check('GỘP NHÓM: nhóm ngày 21/09 · Sấy 1 gom đúng 3 lô (1 + 1 + 1 m³ = 3 m³)',
  x2.sayGroupLots('2026-09-21', 'say1').length === 3 &&
  Math.abs(x2.sayGroupLots('2026-09-21', 'say1').reduce((s, l) => s + l.vol, 0) - 3) < 1e-9);

const chargeDays = x2.sayChargeRows();
const dayOf = d => chargeDays.find(r => r.date === d);
const d21 = dayOf('2026-09-21');
check('GỘP NHÓM (đúng ví dụ nhà máy): ngày 21/09 tổng 3 m³ → 2 LẦN than hóa = 2 m³ (gần 2 m³) + phần còn lại 1 m³',
  !!d21 && d21.lanCount === 2 && Math.abs(d21.vol - 3) < 1e-9 &&
  Math.abs(d21.charges[0].vol - 2) < 1e-9 && Math.abs(d21.charges[1].vol - 1) < 1e-9);
check('GỘP NHÓM: Lần 1 gồm 2 lô (2 m³) · Lần 2 = lô còn lại (1 m³) — mã lô hiện đủ + đánh số "Lần 1, Lần 2"',
  !!d21 && d21.charges[0].codeText === '260921-01 + 260921-02' && d21.charges[1].codeText === '260921-03' &&
  d21.charges.map(c => c.lan).join(',') === '1,2');
check('GỘP NHÓM: LÔ ĐƠN vượt 2 m³ (5 m³) vẫn 1 LẦN riêng · ngày 23/09 tổng 6 m³ → 3 lần (mỗi lần đúng 2 m³)',
  (() => {
    const d22 = dayOf('2026-09-22');
    const d23 = dayOf('2026-09-23');
    if (!d22 || !d23) return false;
    const g1of22 = d22.groups.find(g => g.stage === 'say1');
    return g1of22 && g1of22.count === 1 && Math.abs(g1of22.charges[0].vol - 5) < 1e-9 &&
      d23.lanCount === 3 && d23.charges.every(c => Math.abs(c.vol - 2) < 1e-9);
  })());
check('GỘP NHÓM: ngày 22/09 có 2 NHÓM (Sấy 1 = 1 lần 5 m³ · Sấy 2 = 1 lần 50 phút 0,4 m³) — mã lô · vị trí đúng',
  (() => {
    const d22 = dayOf('2026-09-22');
    if (!d22 || d22.groups.length !== 2) return false;
    const s2 = d22.groups.find(g => g.stage === 'say2');
    return s2 && s2.charges.length === 1 && s2.charges[0].minutes === 50 &&
      s2.charges[0].codeText === '260918-01' && s2.charges[0].locationText === 'LS3' &&
      Math.abs(s2.charges[0].vol - 0.4) < 1e-9;
  })());
check('GỘP NHÓM: lô đang ở KHO vẫn có lần ngày nó VÀO Sấy 1 (19/09 · 1 lần · vị trí K11) · Kho KHÔNG sinh lần nào (không có ngày 24/09)',
  !!dayOf('2026-09-19') && dayOf('2026-09-19').lanCount === 1 &&
  dayOf('2026-09-19').charges[0].locationText === 'K11' && !dayOf('2026-09-24'));

// ─── M2. NHẬP TAY SỐ LẦN THAN HÓA CỦA NHÓM (ngày + công đoạn) ──
x2.setSayGroupTimes('2026-09-21', 'say1', 3);
await new Promise(r => setTimeout(r, 0)); // chờ ghi localStorage (import động)
const d21b = x2.sayChargeRows().find(r => r.date === '2026-09-21');
check('NHẬP TAY: nhập 3 lần cho nhóm 21/09 · Sấy 1 (3 m³) → chia lại ĐÚNG 3 lần × 1 m³',
  state.x2SayTimes['2026-09-21|say1'] === 3 && !!d21b && d21b.lanCount === 3 &&
  d21b.charges.every(c => Math.abs(c.vol - 1) < 1e-9));
check('NHẬP TAY: lưu vào localStorage (key riêng) — để trống thì xoá, quay lại tự gộp theo m³/lần',
  String(storeBacking.get('bamboo_tracker_x2_say_times_v1') || '').includes('"2026-09-21|say1":3') &&
  (x2.setSayGroupTimes('2026-09-21', 'say1', ''), state.x2SayTimes['2026-09-21|say1'] === undefined) &&
  x2.sayChargeRows().find(r => r.date === '2026-09-21').lanCount === 2);
check('NHẬP TAY: uỷ nhiệm change đọc đúng ô data-say-times + data-say-stage', (() => {
  const attrs = { 'data-say-times': '2026-09-23', 'data-say-stage': 'say1' };
  x2.onSayTimesChange({ target: { getAttribute: (k) => attrs[k] || null, value: '2' } });
  return state.x2SayTimes['2026-09-23|say1'] === 2 && x2.sayChargeRows().find(r => r.date === '2026-09-23').lanCount === 2;
})());
x2.setSayGroupTimes('2026-09-23', 'say1', '');

// ─── M3. GIỜ HC/TC · CÔNG SUẤT · HIỆU SUẤT · ĐỊNH MỨC THÁNG ─────
check('GIỜ: ngày 21/09 giờ thật = 9h HC (2 lượt vị trí "Than hóa" 07:00–11:30 + 13:00–17:30) — KHÔNG cộng lượt vị trí Cắt chọn',
  !!d21 && Math.abs(d21.hc - 9) < 1e-6 && Math.abs(d21.tc) < 1e-9 && d21.hasAssign === true &&
  d21.workers.join(',') === 'Trần Văn Lửa');
check('GIỜ: 2 lần cùng 105 phút → chia đều 9h ÷ 2 = 4,5h HC MỖI LẦN (Σ các lần = đúng giờ thật của ngày)',
  !!d21 && d21.charges.every(c => Math.abs(c.hc - 4.5) < 1e-9) &&
  Math.abs(d21.charges.reduce((s, c) => s + c.hc + c.tc, 0) - 9) < 1e-9);
check('GIỜ: ngày 22/09 có 105\' (Sấy 1) + 50\' (Sấy 2) → chia theo tỉ lệ phút (105/155 · 50/155 của 4,5h), Σ = 4,5h',
  (() => {
    const d22 = dayOf('2026-09-22');
    if (!d22) return false;
    const sum = d22.charges.reduce((s, c) => s + c.hc + c.tc, 0);
    const c1 = d22.charges.find(c => c.stage === 'say1');
    const c2 = d22.charges.find(c => c.stage === 'say2');
    return Math.abs(sum - 4.5) < 1e-9 &&
      Math.abs(c1.hc - (105 / 155) * 4.5) < 1e-9 && Math.abs(c2.hc - (50 / 155) * 4.5) < 1e-9;
  })());
check('GIỜ: ngày KHÔNG có bố trí "Than hóa" (19/09) → giờ/Công suất trống nhưng vẫn có m³ + Giờ Cần 1,75h',
  (() => {
    const d19 = dayOf('2026-09-19');
    if (!d19 || d19.hasAssign !== false) return false;
    const c = d19.charges[0];
    return c.hc === 0 && c.tc === 0 && c.cap === null && Math.abs(c.need - 1.75) < 1e-9 && Math.abs(c.vol - 0.6) < 1e-9;
  })());
check('HIỆU SUẤT NGÀY = Giờ cần ÷ (Giờ thực tế − Sự cố cho phép): 21/09 giờ cần 3,5h ÷ 9h = 38,9% (chưa nhập sự cố)',
  !!d21 && Math.abs(d21.need - 3.5) < 1e-9 && Math.abs(d21.hours - 9) < 1e-9 &&
  d21.incident === 0 && Math.abs(d21.eff - (3.5 / 9)) < 1e-9);
check('HIỆU SUẤT NGÀY: nhập giờ sự cố cho phép 1,5h → mẫu số đổi theo (3,5 ÷ (9 − 1,5) = 46,7%)',
  (() => {
    x2.setSayIncident('2026-09-21', 1.5);
    const d = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    return state.x2SayIncidents['2026-09-21'] === 1.5 && !!d &&
      Math.abs(d.incident - 1.5) < 1e-9 && Math.abs(d.eff - (3.5 / 7.5)) < 1e-9;
  })());
check('HIỆU SUẤT NGÀY: giờ sự cố ≥ giờ thực tế → không tính được (null) · ô nhập lưu/xoá localStorage',
  (() => {
    x2.setSayIncident('2026-09-21', 9.5);
    const d = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    const stored = String(storeBacking.get('bamboo_tracker_x2_say_incident_v1') || '').includes('"2026-09-21":9.5');
    x2.setSayIncident('2026-09-21', '');
    return !!d && d.eff === null && stored && state.x2SayIncidents['2026-09-21'] === undefined;
  })());
check('HIỆU SUẤT NGÀY: ngày KHÔNG bố trí "Than hóa" (19/09) → giờ thực tế 0 ⇒ hiệu suất trống (vẫn có giờ cần)',
  (() => {
    const d19 = dayOf('2026-09-19');
    return !!d19 && d19.hours === 0 && d19.eff === null && d19.need > 0;
  })());
check('HIỆU SUẤT NGÀY: uỷ nhiệm change đọc đúng ô data-say-incident', (() => {
  x2.onSayIncidentChange({ target: { getAttribute: (k) => (k === 'data-say-incident' ? '2026-09-23' : null), value: '2' } });
  const ok = state.x2SayIncidents['2026-09-23'] === 2;
  x2.setSayIncident('2026-09-23', '');
  return ok;
})());
check('CÔNG SUẤT mỗi lần = m³ lần ÷ giờ lần (2 m³ ÷ 4,5h = 0,444 m³/h)',
  !!d21 && d21.charges[0].cap != null && Math.abs(d21.charges[0].cap - (2 / 4.5)) < 1e-9);
check('GIỜ CẦN: mỗi lần Sấy 1 = 105\' ÷ 60 = 1,75h · Sấy 2 = 50\' ÷ 60 = 0,83h',
  !!d21 && d21.charges.every(c => Math.abs(c.need - 1.75) < 1e-9) &&
  Math.abs(dayOf('2026-09-22').groups.find(g => g.stage === 'say2').charges[0].need - (50 / 60)) < 1e-9);

// Định mức 1 LẦN than hóa theo THÁNG + công đoạn + LOẠI (Ván/Bullig RIÊNG)
state.x2SayRates = { s1: { '2026-09': { van: { phut: 130 }, bullig: { phut: 150 }, m3: 4 } }, s2: {} };
check('ĐỊNH MỨC: phút RIÊNG từng loại (S1 Ván 130\' · Bullig 150\') + m³/lần 4 — tháng chưa khai dùng mặc định (S1 105 · S2 50)',
  x2.sayMinutesPerCharge('2026-09-21', 'say1', 'Ván') === 130 &&
  x2.sayMinutesPerCharge('2026-09-21', 'say1', 'Bullig') === 150 &&
  x2.sayM3PerCharge('2026-09-21', 'say1') === 4 &&
  x2.sayMinutesPerCharge('2026-10-05', 'say1', 'Ván') === 105 &&
  x2.sayMinutesPerCharge('2026-10-05', 'say2', 'Bullig') === 50);
check('ĐỊNH MỨC: phút TỪNG LẦN theo LOẠI của lần đó — 21/09 toàn Ván → 130\' · Sấy 2 Bullig (22/09) mặc định 50\'',
  (() => {
    const d21x = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    const d22 = x2.sayChargeRows().find(r => r.date === '2026-09-22');
    const g2 = d22 && d22.groups.find(g => g.stage === 'say2');
    return !!d21x && d21x.charges.every(c => c.minutes === 130 && c.useFor === 'van') &&
      !!g2 && g2.charges[0].useFor === 'bullig' && g2.charges[0].minutes === 50;
  })());
check('ĐỊNH MỨC: bản {phut, m3} cũ (máy khác đẩy mây về) → phút DÙNG CHUNG 2 loại — m³/lần lên 4 → 21/09 (3 m³) còn 1 LẦN',
  (() => {
    state.x2SayRates = { s1: { '2026-09': { phut: 130, m3: 4 } }, s2: {} };
    const d = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    const okRate = x2.sayMinutesPerCharge('2026-09-21', 'say1', 'Ván') === 130 &&
      x2.sayMinutesPerCharge('2026-09-21', 'say1', 'Bullig') === 130;
    state.x2SayRates = { s1: { '2026-09': { van: { phut: 130 }, bullig: { phut: 150 }, m3: 4 } }, s2: {} };
    return !!d && d.lanCount === 1 && Math.abs(d.charges[0].vol - 3) < 1e-9 &&
      d.charges[0].minutes === 130 && Math.abs(d.charges[0].need - (130 / 60)) < 1e-9 && okRate;
  })());
check('ĐỊNH MỨC: đổi m³/lần xuống 1 → ngày 21/09 (3 lô × 1 m³) thành 3 lần (mỗi lần 1 m³)',
  (() => {
    state.x2SayRates = { s1: { '2026-09': { van: { phut: 105 }, bullig: { phut: 105 }, m3: 1 } }, s2: {} };
    const d = x2.sayChargeRows().find(r => r.date === '2026-09-21');
    state.x2SayRates = { s1: { '2026-09': { van: { phut: 130 }, bullig: { phut: 150 }, m3: 4 } }, s2: {} };
    return !!d && d.lanCount === 3;
  })());

// LƯU ĐỊNH MỨC qua POPUP (4 ô phút/lần của 1 hàng tháng; trống = dùng mặc định)
state.x2SayRates = { s1: {}, s2: {} };
document.getElementById('x2sr-2026-10-s1-van').value = '45';
document.getElementById('x2sr-2026-10-s1-bullig').value = '60';
document.getElementById('x2sr-2026-10-s2-van').value = '';
document.getElementById('x2sr-2026-10-s2-bullig').value = '';
x2.handleX2SayRateRowSave('2026-10');
check('LƯU ĐỊNH MỨC: lưu đúng 4 phút/lần (ô trống = mặc định S2 50/50) vào state + localStorage',
  state.x2SayRates.s1['2026-10'].van.phut === 45 && state.x2SayRates.s1['2026-10'].bullig.phut === 60 &&
  state.x2SayRates.s2['2026-10'].van.phut === 50 && state.x2SayRates.s2['2026-10'].bullig.phut === 50 &&
  String(storeBacking.get('bamboo_tracker_x2_say_rate_v1') || '').includes('"phut":45'));
document.getElementById('x2sr-2026-11-s1-van').value = '0';
x2.handleX2SayRateRowSave('2026-11');
check('LƯU ĐỊNH MỨC: số phút ≤ 0 bị chặn (không ghi vào state — tháng đó vẫn dùng mặc định)',
  state.x2SayRates.s1['2026-11'] === undefined && x2.sayMinutesPerCharge('2026-11-05', 'say2', 'Bullig') === 50);
// m³/lần (lô cũ) — số CHUNG theo công đoạn, không phân loại
document.getElementById('x2sr-m3-month').value = '2026-10';
document.getElementById('x2sr-m3-s1').value = '3';
document.getElementById('x2sr-m3-s2').value = '';
x2.handleX2SayRateM3Save();
check('LƯU M³/LẦN (lô cũ): Sấy 1 = 3 · Sấy 2 trống = mặc định 2 — không đụng phút đã khai',
  x2.sayM3PerCharge('2026-10-05', 'say1') === 3 && x2.sayM3PerCharge('2026-10-05', 'say2') === 2 &&
  state.x2SayRates.s1['2026-10'].van.phut === 45);
// Khôi phục mặc định 1 tháng
x2.handleX2SayRateRowReset('2026-10');
check('KHÔI PHỤC MẶC ĐỊNH: xóa khai báo tháng → quay lại mặc định',
  state.x2SayRates.s1['2026-10'] === undefined && x2.sayMinutesPerCharge('2026-10-05', 'say1', 'Ván') === 105);
// Bản CŨ (1 số = phút) vẫn đọc được khi nạp từ localStorage
storeBacking.set('bamboo_tracker_x2_say_rate_v1', JSON.stringify({ s1: { '2026-09': 120 }, s2: {} }));
x2.loadX2SayRates();
check('TƯƠNG THÍCH: định mức bản CŨ (1 số) → phút dùng chung 2 loại + m³/lần mặc định 2',
  state.x2SayRates.s1['2026-09'].van.phut === 120 && state.x2SayRates.s1['2026-09'].bullig.phut === 120 &&
  state.x2SayRates.s1['2026-09'].m3 === 2 && x2.sayMinutesPerCharge('2026-09-21', 'say1', 'Bullig') === 120);
state.x2SayRates = { s1: {}, s2: {} };

// Vẽ bảng thống kê (DOM stub: chạy không lỗi + nội dung đúng)
state.x2SayRates = { s1: {}, s2: {} };
x2.renderX2SayStats();
const statsHtml = document.getElementById('x2-say-day-rows').innerHTML;
check('RENDER: bảng vẽ DÒNG ĐẦU NGÀY + DÒNG NHÓM công đoạn + TỪNG LẦN than hóa (nhãn "Lần 1" · vị trí · mã lô)',
  statsHtml.includes('x2-say-day-head') && statsHtml.includes('x2-say-group-head') &&
  statsHtml.includes('Lần 1') && statsHtml.includes('Sấy 1') && statsHtml.includes('Sấy 2') &&
  statsHtml.includes('21/09/26') && statsHtml.includes('260921-01 + 260921-02'));
check('RENDER: dòng nhóm có ô nhập "Số lần TH" của NGÀY (data-say-times + data-say-stage) + phút 105\' + giờ cần 1,75 h',
  statsHtml.includes('data-say-times="2026-09-21"') && statsHtml.includes('data-say-stage="say1"') &&
  statsHtml.includes('Số lần TH') && statsHtml.includes("105'") && statsHtml.includes('1,75 h'));
check('RENDER: dòng đầu NGÀY có ô "Sự cố cho phép" (data-say-incident) + nhãn Hiệu suất của ngày',
  statsHtml.includes('data-say-incident="2026-09-21"') && statsHtml.includes('Sự cố cho phép') &&
  statsHtml.includes('x2-say-eff-badge') && statsHtml.includes('Hiệu suất'));
check('RENDER: thanh tiêu đề đếm số ngày + số LẦN than hóa + tổng m³',
  document.getElementById('x2-say-stats-count').textContent.includes('lần than hóa') &&
  document.getElementById('x2-say-stats-count').textContent.includes('ngày') &&
  document.getElementById('x2-say-stats-count').textContent.includes('m³'));

check('RENDER: cột Thành phần mỗi lần = "Ván - 1,000 m³" (mã lô chuyển vào tooltip title)',
  statsHtml.includes('Ván - 1,000 m³') && statsHtml.includes('title="Mã lô: 260921-01 + 260921-02'));
check('RENDER: Sấy 2 Bullig 22/09 → "Bullig - 0,400 m³"',
  statsHtml.includes('Bullig - 0,400 m³'));
// POPUP ĐỊNH MỨC: bảng 4 cột phút/lần + chip tóm tắt trên thẻ
x2.renderX2SayRateModal();
const rateTbl = document.getElementById('x2-say-rate-rows').innerHTML;
check('POPUP ĐỊNH MỨC: 4 ô phút/lần mỗi hàng (s1-van/s1-bullig/s2-van/s2-bullig) + nút Lưu/Khôi phục',
  rateTbl.includes('-s1-van') && rateTbl.includes('-s1-bullig') &&
  rateTbl.includes('-s2-van') && rateTbl.includes('-s2-bullig') &&
  rateTbl.includes('data-x2sr-save') && rateTbl.includes('data-x2sr-reset'));
x2.renderX2SayRateChip();
check('POPUP ĐỊNH MỨC: chip tóm tắt trên thẻ hiện "Sấy 1" + phút',
  document.getElementById('x2-say-rate-chip').innerHTML.includes('Sấy 1') &&
  document.getElementById('x2-say-rate-chip').innerHTML.includes("'"));

// THU GỌN / MỞ LẠI bảng Kanban (nhớ theo máy)
localStorage.removeItem('bamboo_tracker_x2_kanban_collapsed_v1');
const hoaCard = document.getElementById('x2-than-hoa-card');
x2.applyX2KanbanCollapsed();
check('THU GỌN: mặc định MỞ bảng lô + nhãn nút "Thu gọn bảng lô"',
  !hoaCard.classList.contains('kanban-board-collapsed') &&
  document.getElementById('x2-kanban-toggle-label').textContent === 'Thu gọn bảng lô');
check('THU GỌN: dòng tổng quan đếm đúng số lô từng công đoạn (Sấy 1: 7 · Sấy 2: 1 · Kho: 2)',
  document.getElementById('x2-kanban-summary').innerHTML.includes('Sấy 1</b>: 7 lô') &&
  document.getElementById('x2-kanban-summary').innerHTML.includes('Sấy 2</b>: 1 lô') &&
  document.getElementById('x2-kanban-summary').innerHTML.includes('Kho</b>: 2 lô'));
x2.toggleX2KanbanBoard();
check('THU GỌN: bấm nút → thẻ nhận cờ kanban-board-collapsed + nhãn "Mở bảng lô" + nhớ theo máy',
  hoaCard.classList.contains('kanban-board-collapsed') &&
  document.getElementById('x2-kanban-toggle-label').textContent === 'Mở bảng lô' &&
  localStorage.getItem('bamboo_tracker_x2_kanban_collapsed_v1') === '1');
x2.toggleX2KanbanBoard();
check('THU GỌN: bấm lần nữa → mở lại bảng lô + ghi nhớ "0"',
  !hoaCard.classList.contains('kanban-board-collapsed') &&
  document.getElementById('x2-kanban-toggle-label').textContent === 'Thu gọn bảng lô' &&
  localStorage.getItem('bamboo_tracker_x2_kanban_collapsed_v1') === '0');

// ─── M4. CHIA LẦN THEO LƯỢT LƯU (MÃ MẺ sayCharges + MỐC 28/09/2026) ──
// Từ 28/09/2026: MỖI lượt bấm "Lưu" của "Thêm Lô Sấy Mới" = 1 LẦN than hóa —
// mã mẻ (sayCharges.<say>) gắn lên TỪNG lô của lượt lưu; KHÔNG tự gộp m³/lần nữa.
// Lô cũ (ngày < 28/09/2026, không có mã mẻ) vẫn tự gộp theo định mức m³/lần.
check('MÃ MẺ (Sấy 1): các lô tạo trong CÙNG lượt Lưu nhận cùng sayCharges.say1',
  !!bNew1 && !!bNew2 && Number(bNew1.sayCharges && bNew1.sayCharges.say1) > 0 &&
  bNew1.sayCharges.say1 === bNew2.sayCharges.say1);
check('MÃ MẺ (Sấy 2): lô chuyển Kho → Sấy 2 nhận sayCharges.say2 (cùng 1 lượt Lưu)',
  Number(b2.sayCharges && b2.sayCharges.say2) > 0 &&
  b2.sayCharges.say2 === b2b.sayCharges.say2);
state.x2SayTimes = {};   // bỏ hết nhập tay để thử luật chia lần mới
// Lô cũ 25/09 (2 m³ + 1 m³, KHÔNG mã mẻ) → vẫn tự gộp theo m³/lần (2 lần: 2 + 1)
state.batches.push(
  { id: 'tb-old2', code: '260925-01', stage: 'say1', date: '2026-09-25', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-25' }] },
  { id: 'tb-old3', code: '260925-02', stage: 'say1', date: '2026-09-25', location: 'LS5', length: 1250, width: 20, thickness: 10, quantity: 500, volume: 1, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-25' }] }
);
const dOld = x2.sayChargeRows().find(r => r.date === '2026-09-25');
check('MỐC NGÀY (dữ liệu cũ): 25/09 < 28/09/2026 KHÔNG mã mẻ → vẫn tự gộp theo m³/lần (3 m³ = 2 lần: 2 + 1)',
  !!dOld && dOld.lanCount === 2 &&
  Math.abs(dOld.charges[0].vol - 2) < 1e-9 && Math.abs(dOld.charges[1].vol - 1) < 1e-9);
// Ngày MỚI 29/09: lô KHÔNG mã mẻ (3 m³) → mặc định 1 LẦN, KHÔNG tự gộp 2 m³
state.batches.push({ id: 'tb-nm0', code: '260929-01', stage: 'say1', date: '2026-09-29', location: 'LS6', length: 1250, width: 20, thickness: 10, quantity: 1500, volume: 3, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: '2026-09-29' }] });
let dNew = x2.sayChargeRows().find(r => r.date === '2026-09-29');
check('MỐC NGÀY (dữ liệu mới): 29/09 ≥ 28/09/2026 KHÔNG mã mẻ → mặc định 1 LẦN (không tự gộp 2 m³)',
  !!dNew && dNew.lanCount === 1 && Math.abs(dNew.charges[0].vol - 3) < 1e-9);
// 2 lượt lưu (mã mẻ 1000 & 2000) + lô không mã → 3 lần, đúng thứ tự & đúng lô từng lượt
state.batches.push(
  { id: 'tb-nm1', code: '260929-02', stage: 'say1', date: '2026-09-29', location: 'LS6', length: 1250, width: 20, thickness: 10, quantity: 500, volume: 1, bambooType: 'A', useFor: 'Ván', sayCharges: { say1: 1000 }, stageHistory: [{ stage: 'say1', date: '2026-09-29' }] },
  { id: 'tb-nm2', code: '260929-03', stage: 'say1', date: '2026-09-29', location: 'LS6', length: 1250, width: 20, thickness: 10, quantity: 500, volume: 0.5, bambooType: 'A1', useFor: 'Ván', sayCharges: { say1: 1000 }, stageHistory: [{ stage: 'say1', date: '2026-09-29' }] },
  { id: 'tb-nm3', code: '260929-04', stage: 'say1', date: '2026-09-29', location: 'LS7', length: 1250, width: 20, thickness: 10, quantity: 1000, volume: 2, bambooType: 'B', useFor: 'Ván', sayCharges: { say1: 2000 }, stageHistory: [{ stage: 'say1', date: '2026-09-29' }] }
);
dNew = x2.sayChargeRows().find(r => r.date === '2026-09-29');
check('CHIA LẦN THEO LƯỢT LƯU: 2 lượt Lưu + 1 lô không mã = 3 lần — mỗi lần ĐÚNG lô + m³ thật (không chia đều giả)',
  !!dNew && dNew.lanCount === 3 &&
  dNew.charges[0].codeText === '260929-02 + 260929-03' && Math.abs(dNew.charges[0].vol - 1.5) < 1e-9 &&
  dNew.charges[1].codeText === '260929-04' && Math.abs(dNew.charges[1].vol - 2) < 1e-9 &&
  dNew.charges[2].codeText === '260929-01' && Math.abs(dNew.charges[2].vol - 3) < 1e-9);
// Điền tay "Số lần TH" vẫn GHI ĐÈ số lần theo lượt lưu
x2.setSayGroupTimes('2026-09-29', 'say1', 4);
const dNewM = x2.sayChargeRows().find(r => r.date === '2026-09-29');
check('GHI ĐÈ: điền tay "Số lần TH" = 4 vẫn thắng số lượt Lưu (6,5 m³ chia đều 4 lần × 1,625 m³)',
  !!dNewM && dNewM.lanCount === 4 && dNewM.charges.every(c => Math.abs(c.vol - 1.625) < 1e-9));
x2.setSayGroupTimes('2026-09-29', 'say1', '');
// RENDER: ẨN ghi chú "Tự gộp theo … m³/lần" + chip nguồn số lần
x2.renderX2SayStats();
const statsHtml2 = document.getElementById('x2-say-day-rows').innerHTML;
check('RENDER: ẨN ghi chú "Tự gộp theo … m³/lần" — thay bằng chip nguồn số lần (Theo lượt Lưu / Dữ liệu cũ)',
  !statsHtml2.includes('Tự gộp theo') && statsHtml2.includes('x2-say-mode-chip') &&
  statsHtml2.includes('Theo lượt Lưu') && statsHtml2.includes('Dữ liệu cũ'));
check('CẤU TRÚC (index.html): ghi chú "Tự gộp theo …" đã gỡ khỏi markup tĩnh + nhãn m³/lần ghi rõ (lô cũ)',
  !idxHtml.includes('hệ thống <b>tự gộp') && idxHtml.includes('m³/lần (lô cũ)'));
check('CẤU TRÚC (js): lô gắn MÃ MẺ sayCharges khi bấm Lưu + mốc SAY_NO_AUTO_FROM (28/09/2026)',
  fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8').includes('sayCharges') &&
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('SAY_NO_AUTO_FROM'));

// CẤU TRÚC: markup + style + nối dữ liệu 4 nơi
check('CẤU TRÚC (index.html): bảng theo TỪNG LẦN than hóa + NÚT Định mức + POPUP 4 cột phút/lần + m³/lần (lô cũ) + nút thu gọn bảng KANBAN',
  idxHtml.includes('id="x2-say-stats-wrap"') && idxHtml.includes('id="x2-say-day-rows"') &&
  idxHtml.includes('id="btn-x2-say-rate"') && idxHtml.includes('id="modal-x2-say-rate"') &&
  idxHtml.includes('id="x2-say-rate-rows"') && idxHtml.includes('id="btn-x2sr-add-month"') &&
  idxHtml.includes('id="btn-x2sr-m3-save"') && idxHtml.includes('m³/lần (lô cũ)') && !idxHtml.includes('id="x2-say-rate-bar"') && idxHtml.includes('<th>Thành phần</th>') &&
  idxHtml.includes('btn-toggle-kanban-board') && idxHtml.includes('Số lần TH') &&
  idxHtml.includes('Giờ HC') && idxHtml.includes('Giờ TC') && idxHtml.includes('Giờ Cần'));
check('CẤU TRÚC (index.html): BỎ nút thu gọn của bảng thống kê + BỎ ô "Số Lần Than Hóa" theo LÔ trong form Sửa Lô',
  !idxHtml.includes('btn-toggle-x2-say-stats') && !idxHtml.includes('form-than-hoa-times') &&
  idxHtml.includes('id="btn-toggle-kanban-board"') && idxHtml.includes('Thu gọn bảng lô'));
check('CẤU TRÚC (styles.css): cờ thu gọn ẩn bảng Kanban + style dòng nhóm · nhãn Lần N · ô nhập Số lần TH',
  cssHtml.includes('#x2-than-hoa-card.kanban-board-collapsed .kanban-board') &&
  cssHtml.includes('.x2-say-table') && cssHtml.includes('.x2-say-day-head') &&
  cssHtml.includes('.x2-say-group-head') && cssHtml.includes('.x2-say-times-input') &&
  cssHtml.includes('.x2-say-lan-badge') && cssHtml.includes('.x2-kanban-sum-item'));
check('CẤU TRÚC (js): định mức than hóa + SỐ LẦN THAN HÓA theo ngày đều có key riêng + nối đủ storage/cloud/history/main',
  jsState.includes('bamboo_tracker_x2_say_rate_v1') && jsState.includes('bamboo_tracker_x2_say_times_v1') &&
  jsStorage.includes('x2SayRates') && jsStorage.includes('restoreX2SayTimes') &&
  jsCloud.includes('x2SayTimes') && jsHistory.includes('x2SayTimes') &&
  jsMain.includes('loadX2SayRates') && jsMain.includes('loadX2SayTimes') &&
  jsEvents.includes('btn-toggle-kanban-board') && jsEvents.includes('btn-x2-say-rate') && jsEvents.includes('data-x2sr-save') &&
  jsEvents.includes('onSayTimesChange'));
check('CẤU TRÚC (styles.css): dòng đầu ngày có ô Sự cố cho phép (x2-say-inc-input) + nhãn Hiệu suất ngày (x2-say-eff-badge)',
  cssHtml.includes('.x2-say-inc-input') && cssHtml.includes('.x2-say-day-inc') &&
  cssHtml.includes('.x2-say-eff-badge') && cssHtml.includes('.x2-say-eff-good') &&
  cssHtml.includes('.x2-say-eff-low'));
check('CẤU TRÚC (js): bảng gộp nhóm theo NGÀY (sayBuildCharges) + BỎ cơ chế số lần theo TỪNG LÔ (thanHoaTimes)',
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('sayBuildCharges') &&
  !fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8').includes('thanHoaTimes') &&
  !fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8').includes('thanHoaTimes'));
check('CẤU TRÚC: cột "Hiệu Suất" từng lần đã bỏ (thead còn 8 cột, hiệu suất nằm ở dòng đầu ngày)',
  !idxHtml.includes('<th>Hiệu Suất</th>') &&
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('HIỆU SUẤT của NGÀY = Giờ cần ÷ (Giờ thực tế − Giờ sự cố cho phép)'));
check('CẤU TRÚC (js): GIỜ SỰ CỐ CHO PHÉP theo ngày có key riêng + nối đủ state/storage/cloud/history/main/events',
  jsState.includes('bamboo_tracker_x2_say_incident_v1') &&
  jsStorage.includes('x2SayIncidents') && jsStorage.includes('restoreX2SayIncidents') &&
  jsCloud.includes('x2SayIncidents') && jsHistory.includes('x2SayIncidents') &&
  jsMain.includes('loadX2SayIncidents') && jsEvents.includes('onSayIncidentChange'));

// ─── N0. CHIP "LẦN THAN HÓA" TRÊN THẺ KANBAN (chỉ đọc) ─────────────
state.batches.push({ id: 'bx-th1', code: '260998-01', stage: 'say1', date: '2026-09-26', week: '2026-W39', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 1, bambooType: 'A', useFor: 'Ván', location: 'LS2', sayCharges: { say1: 1000 }, stageHistory: [{ stage: 'say1', date: '2026-09-26' }] }); // ngày RIÊNG (26/09) — không trùng nhóm nào khác
check('CHIP KANBAN: lô có mã mẻ sayCharges → nhãn "Lần 1/1 · Sấy 1"',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx-th1')) === 'Lần 1/1 · Sấy 1');
check('CHIP KANBAN: lô cũ KHÔNG mã mẻ → không hiện nhãn (chuỗi rỗng)',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx1')) === '');
check('CHIP KANBAN: lô cũ tb-nm0 KHÔNG mã mẻ (có thật) → chuỗi rỗng',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'tb-nm0')) === '');
check('CHIP KANBAN: main.js đưa hàm vào window.app (x2SayChargeLabel)',
  jsMain.includes('x2SayChargeLabel') && jsMain.includes('sayBatchChargeLabel'));
// Qua CẢ Sấy 1 và Sấy 2 (có mã mẻ cả 2) → gộp 2 phần trong 1 chip
state.batches.push({ id: 'bx-th-both', code: '260998-02', stage: 'kho', date: '2026-09-14', khoDate: '2026-09-16', say2Date: '2026-09-15', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 1, bambooType: 'A', useFor: 'Ván', location: 'LS1', sayCharges: { say1: 5000, say2: 6000 }, stageHistory: [{ stage: 'say1', date: '2026-09-14' }, { stage: 'say2', date: '2026-09-15' }, { stage: 'kho', date: '2026-09-16' }] });
check('CHIP KANBAN: lô qua CẢ Sấy 1 + Sấy 2 → gộp "S1: Lần 1/1 · S2: Lần 1/1"',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx-th-both')) === 'S1: Lần 1/1 · S2: Lần 1/1');
// Tạo THẲNG vào Sấy 2 (không có Sấy 1 trong lịch sử) → chỉ hiện Sấy 2
state.batches.push({ id: 'bx-th-s2only', code: '260998-03', stage: 'say2', date: '2026-09-16', say2Date: '2026-09-16', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 1, bambooType: 'A', useFor: 'Ván', location: 'LS3', sayCharges: { say2: 7000 }, stageHistory: [{ stage: 'say2', date: '2026-09-16' }] });
check('CHIP KANBAN: lô tạo THẲNG vào Sấy 2 → "Lần 1/1 · Sấy 2"',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx-th-s2only')) === 'Lần 1/1 · Sấy 2');
// Có mã mẻ Sấy 1 nhưng sang Sấy 2 bằng đường KHÔNG có mã → vẫn hiện phần Sấy 1
state.batches.push({ id: 'bx-th-s1move', code: '260998-04', stage: 'say2', date: '2026-09-17', say2Date: '2026-09-18', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 1, bambooType: 'A', useFor: 'Ván', location: 'LS4', sayCharges: { say1: 8000 }, stageHistory: [{ stage: 'say1', date: '2026-09-17' }, { stage: 'say2', date: '2026-09-18' }] });
check('CHIP KANBAN: có mã mẻ Sấy 1, sang Sấy 2 không mã → vẫn "Lần 1/1 · Sấy 1"',
  x2.sayBatchChargeLabel(state.batches.find(b => b.id === 'bx-th-s1move')) === 'Lần 1/1 · Sấy 1');
check('CẤU TRÚC (styles.css): chip .tag-say-charge có style riêng (nền/viền/màu)',
  cssHtml.includes('.tag-say-charge'));

// ─── N1. LIÊN KẾT 2 CHIỀU GIỮA THẺ NAN CÁC CÔNG ĐOẠN ───────────────
console.log('--- N1. LIÊN KẾT SỬA THẺ NAN (giữ link · đồng bộ Loại · cảnh báo kích thước) ---');
const jsBM = fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8');
// Điền form Sửa thẻ theo đúng cách openBatchFormModal làm (ngày công đoạn
// hiện tại được prefill, công đoạn khác để trống).
function fillBatchForm(b) {
  document.getElementById('form-batch-id').value    = b.id;
  document.getElementById('form-code').value        = b.code;
  document.getElementById('form-stage').value       = b.stage;
  document.getElementById('form-date').value        = b.date;
  document.getElementById('form-week').value        = b.week || '2026-W40';
  document.getElementById('form-length').value      = b.length;
  document.getElementById('form-width').value       = b.width;
  document.getElementById('form-thickness').value   = b.thickness;
  document.getElementById('form-quantity').value    = b.quantity;
  document.getElementById('form-bamboo-type').value = b.bambooType;
  document.getElementById('form-use-for').value     = b.useFor;
  document.getElementById('form-location').value    = b.location;
  document.getElementById('form-notes').value       = b.notes || '';
  document.getElementById('form-say2-date').value   = b.stage === 'say2' ? (b.say2Date || '') : '';
  document.getElementById('form-kho-date').value    = b.stage === 'kho'  ? (b.khoDate  || '') : '';
}
// Lô ĐẦY ĐỦ liên kết: mã mẻ than hóa + link thẻ Chọn Nan Thô + mốc Sấy 2/Kho
state.batches.push({
  id: 'bx-link1', code: '260997-01', stage: 'kho', date: '2026-09-19',
  say2Date: '2026-09-19', khoDate: '2026-09-20', week: '2026-W38',
  length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.5,
  bambooType: 'A', useFor: 'Ván', location: 'LS7',
  sayCharges: { say1: 111111, say2: 222222 },
  sourceChonNanId: 'cn-link-src', sourceChonNanLabel: '1250×18×7 · A · 500',
  stageHistory: [{ stage: 'say1', date: '2026-09-18' }, { stage: 'say2', date: '2026-09-19' }, { stage: 'kho', date: '2026-09-20' }]
});
state.xuong2ChonNanThoRecords = state.xuong2ChonNanThoRecords || [];
state.xuong2ChonNanThoRecords.push({ id: 'cn-link-src', cls: 'A', dims: [1250, 18, 7], quantity: 500, external: false });

// ① Sửa chỉ GHI CHÚ → PHẢI giữ nguyên mã mẻ + link thẻ nan + mốc ngày công đoạn khác
fillBatchForm(state.batches.find(b => b.id === 'bx-link1'));
document.getElementById('form-notes').value = 'sửa ghi chú';
bm.handleBatchFormSubmit({ preventDefault() {} });
const L1 = state.batches.find(b => b.id === 'bx-link1');
check('① SỬA THẺ: giữ nguyên MÃ MẺ sayCharges (chip "Lần than hóa" không biến mất)',
  !!L1 && !!L1.sayCharges && L1.sayCharges.say1 === 111111 && L1.sayCharges.say2 === 222222);
check('① SỬA THẺ: giữ nguyên LINK thẻ Chọn Nan Thô (sourceChonNanId + Label)',
  !!L1 && L1.sourceChonNanId === 'cn-link-src' && L1.sourceChonNanLabel === '1250×18×7 · A · 500');
check('① SỬA THẺ: giữ nguyên say2Date (CÔNG ĐOẠN KHÁC không mất mốc ngày)',
  !!L1 && L1.say2Date === '2026-09-19');
check('① SỬA THẺ: ghi chú đổi thật · stageHistory 3 mốc · vị trí giữ',
  !!L1 && L1.notes === 'sửa ghi chú' && L1.stageHistory.length === 3 && L1.location === 'LS7');

// ② Đổi LOẠI NAN A → A1 → đồng bộ ngược phân loại lên thẻ Chọn Nan Thô
fillBatchForm(state.batches.find(b => b.id === 'bx-link1'));
document.getElementById('form-bamboo-type').value = 'A1';
bm.handleBatchFormSubmit({ preventDefault() {} });
const L2 = state.batches.find(b => b.id === 'bx-link1');
const rec2 = (state.xuong2ChonNanThoRecords || []).find(r => r.id === 'cn-link-src');
check('② ĐỔI LOẠI: lô đổi sang A1 + VẪN giữ mã mẻ sayCharges',
  !!L2 && L2.bambooType === 'A1' && !!L2.sayCharges && L2.sayCharges.say1 === 111111);
check('② ĐỔI LOẠI: PHÂN LOẠI trên THẺ NGUỒN Chọn Nan Thô đổi theo (A → A1)',
  !!rec2 && rec2.cls === 'A1');
check('② ĐỔI LOẠI: đã ghi thẻ nguồn xuống bộ nhớ máy',
  JSON.parse(localStorage.getItem('bamboo_tracker_xuong2_chon_nan_tho_v1') || '[]')
    .some(r => r.id === 'cn-link-src' && r.cls === 'A1'));
check('② ĐỔI LOẠI: làm mới nhãn snapshot sourceChonNanLabel (chứa A1)',
  !!L2 && String(L2.sourceChonNanLabel).includes('A1'));

// ③ Lô ĐÃ bị Bào Tinh lấy thanh → sửa SỐ LƯỢNG phải HỎI; hủy = không lưu
state.xuong2BaoTinhRecords = state.xuong2BaoTinhRecords || [];
state.xuong2BaoTinhRecords.push({
  id: 'bt-link1', kind: 'tinh', date: '2026-09-20', week: '2026-W38',
  inSizeKey: '1250×18×7', inDims: [1250, 18, 7], inQty: 300,
  outSizeKey: '1240×17×7', outDims: [1240, 17, 7],
  qtyOk: 280, qtyErr: 20, volumeOk: 0.5,
  sources: [{ batchId: 'bx-link1', qty: 300 }]
});
fillBatchForm(state.batches.find(b => b.id === 'bx-link1'));
document.getElementById('form-quantity').value = 9999;
const undoN1Before = state.undoStack.length;
global.confirm = () => false;   // người dùng BẤM HỦY
bm.handleBatchFormSubmit({ preventDefault() {} });
global.confirm = () => true;    // trả lại mặc định của stub
const L3 = state.batches.find(b => b.id === 'bx-link1');
check('③ CẢNH BÁO: lô ĐÃ qua Bào Tinh, sửa số lượng + HỦY → KHÔNG lưu (còn 500)',
  !!L3 && Number(L3.quantity) === 500);
check('③ CẢNH BÁO: HỦY không đẩy thêm bước undo thừa',
  state.undoStack.length === undoN1Before);
// ĐỒNG Ý → lưu bình thường + vẫn giữ liên kết
fillBatchForm(state.batches.find(b => b.id === 'bx-link1'));
document.getElementById('form-quantity').value = 9999;
bm.handleBatchFormSubmit({ preventDefault() {} });
const L4 = state.batches.find(b => b.id === 'bx-link1');
check('③ CẢNH BÁO: ĐỒNG Ý → lưu được 9.999 + VẪN giữ liên kết sayCharges/sourceChonNanId',
  !!L4 && Number(L4.quantity) === 9999 && L4.sourceChonNanId === 'cn-link-src'
    && !!L4.sayCharges && L4.sayCharges.say2 === 222222);
check('③ CẤU TRÚC (js): helper nhận diện công đoạn sau + đồng bộ Loại + hợp nhất bản cũ',
  jsBM.includes('function batchHasDownstreamUse') && jsBM.includes('khoApprovedXuatNotes') &&
  jsBM.includes('function syncSourceChonNanClass') && jsBM.includes('Object.assign({}, old, batchData)'));

// ─── N. XÓA NHIỀU LÔ (ADMIN — chế độ tích chọn trên Kanban) ────────
console.log('--- N. XÓA NHIỀU LÔ (ADMIN) ---');
// Cấu trúc: nút "Xóa Nhiều" (admin-only) trong thanh công cụ + thanh nổi "Đã chọn N lô"
check('CẤU TRÚC (index.html): nút "Xóa Nhiều" (admin-only) trong thanh công cụ + thanh nổi "Đã chọn N lô"',
  idxHtml.includes('id="btn-multi-delete"') && idxHtml.includes('admin-only-btn') &&
  idxHtml.includes('id="kb-pick-bar"') && idxHtml.includes('id="kb-pick-count"') &&
  idxHtml.includes('id="kb-pick-del"') && idxHtml.includes('id="kb-pick-all"') &&
  idxHtml.includes('id="kb-pick-cancel"'));
check('CẤU TRÚC (styles.css): ô tích .kb-pick + body.kanban-pick-mode + thanh nổi #kb-pick-bar + ẩn admin-only-btn',
  cssHtml.includes('.kb-pick') && cssHtml.includes('body.kanban-pick-mode') &&
  cssHtml.includes('#kb-pick-bar') && cssHtml.includes('.admin-only-btn'));
check('CẤU TRÚC (js): thẻ lô có ô tích data-pick-id + sự kiện được wire trong events.js',
  fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8').includes('data-pick-id') &&
  jsEvents.includes('btn-multi-delete') && jsEvents.includes('kb-pick-del') &&
  jsMain.includes('exitKanbanPickMode'));
check('XÓA NHIỀU — DỄ THẤY: tự chuyển khung "Bảng Dữ Liệu" + nhóm nút thực thi ngay trên thanh công cụ',
  idxHtml.includes('id="kb-pick-inline"') && idxHtml.includes('id="kb-pick-inline-del"') &&
  jsEvents.includes('kb-pick-inline-del') && jsEvents.includes("switchX2SayFrame('data')") &&
  cssHtml.includes('.kb-pick-inline') && cssHtml.includes('#kb-pick-bar { z-index: 95; }'));


// Chuẩn bị dữ liệu: 3 lô (sẽ xóa 2 lô cùng lúc, giữ lại 1)
state.batches.push(
  { id: 'bx1', code: '260999-01', stage: 'say1', date: '2026-09-20', week: '2026-W38', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 0.02, bambooType: 'A', useFor: 'Ván', location: 'LS3', stageHistory: [{ stage: 'say1', date: '2026-09-20' }] },
  { id: 'bx2', code: '260999-02', stage: 'say1', date: '2026-09-20', week: '2026-W38', length: 1250, width: 18, thickness: 7, quantity: 120, volume: 0.02, bambooType: 'A', useFor: 'Ván', location: 'LS4', stageHistory: [{ stage: 'say1', date: '2026-09-20' }] },
  { id: 'bx3', code: '260999-03', stage: 'kho',  date: '2026-09-21', week: '2026-W38', length: 1250, width: 18, thickness: 7, quantity: 140, volume: 0.02, bambooType: 'B', useFor: 'Bullig', location: 'K1', stageHistory: [{ stage: 'kho', date: '2026-09-21' }] }
);
// Vai trò KHÔNG phải Admin → bị chặn, không bật được chế độ
state.currentUser = { username: 'ed', role: 'editor', editTabs: [], allowAdvanced: true };
bm.toggleKanbanPickMode();
check('XÓA NHIỀU — CHẶN QUYỀN: editor không bật được chế độ (state không đổi)',
  state.kanbanPickMode === false && (state.kanbanPicked || []).length === 0);
// Admin bật chế độ → body có class kanban-pick-mode
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
bm.toggleKanbanPickMode();
check('XÓA NHIỀU — BẬT CHẾ ĐỘ: body.kanban-pick-mode bật (ô tích + thanh nổi hiện theo CSS)',
  state.kanbanPickMode === true && document.body.classList.contains('kanban-pick-mode'));
// Tích 2 lô
bm.onKanbanPickChange('bx1', true);
bm.onKanbanPickChange('bx2', true);
check('XÓA NHIỀU — TÍCH CHỌN: 2 lô vào danh sách chọn', (state.kanbanPicked || []).slice().sort().join(',') === 'bx1,bx2');
const beforeCount = state.batches.length;
const undoBefore = state.undoStack.length;
bm.deletePickedBatches();
check('XÓA NHIỀU — THỰC HIỆN: đúng 2 lô biến mất · lô còn lại nguyên vẹn',
  state.batches.length === beforeCount - 2 &&
  !state.batches.some(b => b.id === 'bx1' || b.id === 'bx2') &&
  state.batches.some(b => b.id === 'bx3'));
check('XÓA NHIỀU — TOMBSTONE: cả 2 id ghi dấu vết xóa (chặn máy khác đẩy ngược lô)',
  !!(state.deletedIds.batches && state.deletedIds.batches.bx1 && state.deletedIds.batches.bx2));
check('XÓA NHIỀU — 1 LƯỢT GỘP: chỉ THÊM ĐÚNG 1 bước undo (không 2 bước như xóa rời từng lô)',
  state.undoStack.length === undoBefore + 1 &&
  /Xóa 2 lô/.test((state.undoStack[state.undoStack.length - 1] || {}).label || ''));
check('XÓA NHIỀU — SAU XÓA: tự gỡ danh sách chọn nhưng VẪN giữ chế độ để xóa tiếp lô khác',
  state.kanbanPickMode === true && (state.kanbanPicked || []).length === 0);
// HOÀN TÁC 1 BẦM: khôi phục cả 2 lô + gỡ tombstone của chúng
const tombBeforeUndo = !!(state.deletedIds.batches && state.deletedIds.batches.bx1);
const ev = await import('../js/events.js');
ev.undoLastAction();
check('XÓA NHIỀU — HOÀN TÁC 1 BẦM: khôi phục ĐỦ 2 lô + gỡ tombstone (không bị chặn hồi sinh)',
  state.batches.some(b => b.id === 'bx1') && state.batches.some(b => b.id === 'bx2') &&
  tombBeforeUndo && !(state.deletedIds.batches && state.deletedIds.batches.bx1));
// Thoát chế độ chọn
bm.exitKanbanPickMode();
check('XÓA NHIỀU — THOÁT: tắt chế độ + gỡ class body', state.kanbanPickMode === false && !document.body.classList.contains('kanban-pick-mode'));

// ─── N. FORM THẺ THAN HÓA + SẤY GỌN VỪA MÀN HÌNH (không cuộn ngang/dọc) ─────
const jsBatchModals = fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8');
// Cắt đúng vùng wrapper .al-pick-pair (từ khai báo tới chú thích đóng) để kiểm tra 2 khối chọn
const alPickPairSlice = (function () {
  const start = idxHtml.indexOf('class="al-pick-pair"');
  const end = idxHtml.indexOf('/ .al-pick-pair');
  return (start !== -1 && end > start) ? idxHtml.slice(start, end) : '';
})();
check('FORM GỌN: 2 khối chọn Nguồn ⇄ Vị Trí bọc chung .al-pick-pair (bỏ col-span-full riêng lẻ)',
  idxHtml.includes('class="al-pick-pair"') &&
  alPickPairSlice.includes('id="al-source-btn"') && alPickPairSlice.includes('id="al-source-list"') &&
  alPickPairSlice.includes('id="al-location-btn"') && alPickPairSlice.includes('id="al-location-add"') &&
  !alPickPairSlice.includes('col-span-full'));
check('FORM GỌN (styles.css): modal theo dvh + KHÔNG cuộn ngang + danh sách thẻ/chips tự cuộn trong khung nhỏ',
  cssHtml.includes('#modal-add-lot .modal-card') && cssHtml.includes('#modal-transfer-kho .modal-card') &&
  cssHtml.includes('overflow-x: hidden;   /* tuyệt đối không thanh cuộn ngang */') &&
  cssHtml.includes('#modal-add-lot .al-card-list { max-height: calc(5 * 64px + 4 * 6px); }') &&
  cssHtml.includes('#modal-add-lot .al-loc-chips { max-height: 18vh;') &&
  cssHtml.includes('.al-pick-pair {'));
check('FORM GỌN (js): mở 1 khối chọn thì TỰ ĐÓNG khối còn lại (form không phình khi mở cả hai)',
  jsBatchModals.includes("const locPanel = document.getElementById('al-location-panel');") &&
  jsBatchModals.includes("const srcPanel = document.getElementById('al-source-panel');"));
// ─── O. Ô TÌM THEO SỐ LƯỢNG + DROPDOWN NỔI (04/10/2026) ─────────────
// Cắt đúng khối CSS dropdown nổi để kiểm tra từng thuộc tính
const alFloatCss = (function () {
  const i = cssHtml.indexOf('#modal-add-lot #al-source-panel {');
  const j = i >= 0 ? cssHtml.indexOf('}', i) : -1;
  return j > i ? cssHtml.slice(i, j) : '';
})();
check('TÌM SỐ LƯỢNG (index.html): ô RIÊNG #al-source-qty-search đặt NGAY SAU ô tìm nhanh',
  idxHtml.includes('id="al-source-qty-search"') &&
  idxHtml.indexOf('id="al-source-qty-search"') > idxHtml.indexOf('id="al-source-search"'));
check('TÌM SỐ LƯỢNG (js): chỉ so SỐ LƯỢNG + lọc KẾT HỢP 2 ô (VÀ) + xóa cả 2 khi đổi công đoạn',
  jsBatchModals.includes('function alSourceQtyMatches') &&
  jsBatchModals.includes('function alSetSourceQtyQuery') &&
  jsBatchModals.includes('alSourceQtyMatches(it, stage, alSourceQtyQuery)') &&
  jsBatchModals.includes('alSourceQuery.trim(), alSourceQtyQuery.trim()') &&
  jsBatchModals.includes("alSourceQtyQuery = '';"));
check('DROPDOWN NỔI (js): đo cao 5 dòng thẻ + neo theo nút chọn (hết chỗ mở ngược lên)',
  jsBatchModals.includes('function alApplySourceListRowCap') &&
  jsBatchModals.includes('function alPositionSourcePanel') &&
  jsBatchModals.includes('AL_DROP_MAX_ROWS = 5') &&
  jsBatchModals.includes('alPositionSourcePanel();'));
check('DROPDOWN NỔI (events.js): wire ô tìm số lượng + neo lại khi cuộn / đổi cỡ màn hình',
  jsEvents.includes("safeOn('al-source-qty-search', 'input'") &&
  jsEvents.includes("window.addEventListener('scroll', () => alPositionSourcePanel(), true)") &&
  jsEvents.includes("window.addEventListener('resize', () => alPositionSourcePanel())"));
check('DROPDOWN NỔI (styles.css): panel position fixed trải 2 mép màn hình + z-index trên khối modal',
  alFloatCss.includes('position: fixed;') &&
  alFloatCss.includes('left: 8px;') && alFloatCss.includes('right: 8px;') &&
  alFloatCss.includes('z-index: 10001;') && alFloatCss.includes('overflow-y: auto;'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
// LUÔN thoát rõ ràng (mẫu cloud-shard/chart-filters): nếu còn timer/promise sót
// trong event loop (toast, hẹn đẩy mây…) process sẽ KHÔNG tự thoát → npm test
// có vẻ "treo" dù kết quả đã in xong. Exit tường minh chấm dứt ngay lập tức.
process.exit(fail ? 1 : 0);
