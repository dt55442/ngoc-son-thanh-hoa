// tests/than-hoa-grid.test.mjs — BẢNG NHẬP NHANH THEO PHIẾU (17/10/2026)
// Kiểm tra yêu cầu cốt lõi:
//   • Mỗi dòng = 1 THẺ nguồn thật, GIỮ NGUYÊN NGÀY CHỌN NAN (để đối chiếu độ tươi
//     và phát hiện báo cáo sai của công đoạn Chọn Nan Thô).
//   • Người nhập TỰ CHỈ ĐỊNH thẻ: gõ số vào dòng nào = lấy thẻ đó; ô trống = KHÔNG lấy.
//   • KHÔNG tự chọn thẻ, KHÔNG tự lấy thẻ cũ nhất, KHÔNG tự tách lô.
//   • Lưu vẫn dùng đúng handleAddLotSubmit cũ (mã mẻ chung cho cả lượt).
'use strict';
import fs from 'node:fs';

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

const { state } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu mẫu: nhóm 1250×18×7 · A gồm 3 thẻ KHÁC NGÀY, trong đó g-e đã dùng
// hết (remaining 0) để kiểm tra Tồn báo cáo/Đã dùng cộng cả thẻ đã dùng hết.
// 10/10: g-a 1.000 (đã dùng 300) · 08/10: g-b 800 (chưa dùng) · 09/10: g-e 400
// (đã dùng hết). A1: g-c 500.
const cn = (id, date, dims, cls, quantity) => ({
  id, date, dims, cls, quantity,
  baothoId: 'bt-g', sizeKey: dims.join('×'), unitVol: 0.0001575,
  volume: 0.1, supplier: 'Nhà Tế', materialType: 'Luồng cây', createdAt: date + 'T02:00:00.000Z'
});
const seedData = () => {
  state.xuong2ChonNanThoRecords = [
    cn('g-a', '2026-10-10', [1250, 18, 7], 'A', 1000),
    cn('g-b', '2026-10-08', [1250, 18, 7], 'A', 800),
    cn('g-c', '2026-10-10', [1250, 18, 9], 'A1', 500),
    cn('g-e', '2026-10-09', [1250, 18, 7], 'A', 400),
    cn('g-rej', '2026-10-10', [1250, 18, 7], 'reject', 50)
  ];
  state.batches = [
    { id: 'g-used-a', code: '261001-01', stage: 'say1', date: '2026-10-01', week: '2026-W40',
      length: 1250, width: 18, thickness: 7, quantity: 300, volume: 0.047,
      bambooType: 'A', useFor: 'Ván', location: 'LS1', sourceChonNanId: 'g-a',
      sayCharges: { say1: 1 }, stageHistory: [{ stage: 'say1', date: '2026-10-01' }] },
    { id: 'g-used-e', code: '261002-01', stage: 'say1', date: '2026-10-02', week: '2026-W40',
      length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063,
      bambooType: 'A', useFor: 'Ván', location: 'LS2', sourceChonNanId: 'g-e',
      sayCharges: { say1: 2 }, stageHistory: [{ stage: 'say1', date: '2026-10-02' }] }
  ];
};
seedData();

const bm = await import('../js/batch-modals.js');
await import('../js/main.js');
const x2 = await import('../js/xuong2.js');

// ─── A. GỘP NHÓM THEO CỠ + PHÂN LOẠI ────────────────────────────
bm.openAddLotModal();
check('MẶC ĐỊNH: Sấy 1 mở ở chế độ BẢNG NHẬP NHANH (khối bảng hiện)',
  bm.alEntryModeOf() === 'grid' && document.getElementById('al-grid-wrap').hidden === false);

let rows = bm.alGridRows();
let gA = rows.find(r => r.clsRaw === 'A');
let gA1 = rows.find(r => r.clsRaw === 'A1');
check('GỘP NHÓM: chỉ còn 2 dòng — 1250×18×7·A (2.200 / 700 / 1.500) + 1250×18×9·A1 (500 / 0 / 500)',
  rows.length === 2 && !!gA && !!gA1 &&
  gA.total === 2200 && gA.used === 700 && gA.remaining === 1500 &&
  gA1.total === 500 && gA1.used === 0 && gA1.remaining === 500);
check('GỘP NHÓM: nhóm A giữ đủ 3 thẻ (gồm thẻ g-e ĐÃ DÙNG HẾT remaining 0)',
  gA.cards.length === 3 && gA.cards.some(c => c.id === 'g-e' && c.remaining === 0) &&
  gA.cards.some(c => c.id === 'g-b' && c.remaining === 800) &&
  gA.cards.some(c => c.id === 'g-a' && c.remaining === 700));
check('THẺ ĐÃ DÙNG HẾT: vẫn cộng 400 vào Tồn báo cáo + Đã dùng nhưng KHÔNG lấy được',
  gA.cards.find(c => c.id === 'g-e').total === 400 &&
  gA.cards.find(c => c.id === 'g-e').used === 400 && gA.remaining === 1500);

const buckets = bm.alGridDateBuckets();
check('CHIP NGÀY: 10/10 (2 thẻ còn 1.200) · 08/10 (1 thẻ còn 800) — ngày đã dùng hết không có chip',
  buckets.length === 2 &&
  buckets[0].date === '2026-10-10' && buckets[0].count === 2 && buckets[0].thanh === 1200 &&
  buckets[1].date === '2026-10-08' && buckets[1].count === 1 && buckets[1].thanh === 800 &&
  !buckets.some(b => b.date === '2026-10-09'));

// ─── B. CHỌN NHIỀU NGÀY → TỔNG NHÓM TĂNG ────────────────────────
const clickDate = (v) => bm.alOnGridDateClick({
  target: { closest: (q) => (q === '[data-al-grid-date]' ? { getAttribute: () => v } : null) }
});
clickDate('2026-10-10');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
check('LỌC 1 NGÀY 10/10: nhóm A chỉ còn g-a → Tồn 1.000 · Đã dùng 300 · Còn 700',
  rows.length === 2 && gA.total === 1000 && gA.used === 300 && gA.remaining === 700);
clickDate('2026-10-08');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
check('CHỌN THÊM 08/10: nhóm A TĂNG LÊN 1.800 · Đã dùng 300 · Còn 1.500 (cộng dồn đúng)',
  rows.length === 2 && gA.total === 1800 && gA.used === 300 && gA.remaining === 1500 &&
  bm.alGridQueryOf().dates.length === 2);
check('TÓM TẮT: hiện "Đang chọn 2 ngày ... · 2 nhóm"',
  document.getElementById('al-grid-dates-sum').textContent.includes('Đang chọn 2 ngày') &&
  document.getElementById('al-grid-dates-sum').textContent.includes('2 nhóm'));
clickDate('');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
check('TẤT CẢ NGÀY: nhóm A cộng cả 09/10 đã dùng hết → 2.200 / 700 / 1.500',
  gA.total === 2200 && gA.used === 700 && gA.remaining === 1500);


// ─── C. TỰ CHIA THEO THẺ CŨ NHẤT TRƯỚC (FEFO) ───────────────────
clickDate('');
clickDate('2026-10-08');
clickDate('2026-10-10');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
check('FEFO 500: thẻ CŨ NHẤT g-b (08/10) nhận đủ 500 — g-a (10/10) chưa lấy',
  bm.alGridSetGroupQty(gA.key, 500) === 500 &&
  bm.alPickedIds().length === 1 && bm.alPickedIds()[0] === 'g-b' &&
  bm.alCardQtyOf('g-b') === 500 && bm.alCardQtyOf('g-a') === 0);
bm.alGridSetGroupQty(gA.key, 1000);
check('FEFO 1.000: g-b hết 800 → tràn sang g-a 200 (đúng thứ tự cũ nhất)',
  bm.alCardQtyOf('g-b') === 800 && bm.alCardQtyOf('g-a') === 200 &&
  bm.alPickedIds().length === 2 && bm.alPickedIds().includes('g-b') && bm.alPickedIds().includes('g-a'));
bm.alGridSetGroupQty(gA.key, 9999);
check('CHẶN VƯỢT TỒN: nhập 9.999 → điều về 1.500 (toàn bộ Còn lại của nhóm)',
  bm.alCardQtyOf('g-b') === 800 && bm.alCardQtyOf('g-a') === 700 &&
  bm.alPickedIds().length === 2);
bm.alGridSetGroupQty(gA.key, 0);
check('Ô TRỐNG = KHÔNG LẤY: xóa SL → bỏ chọn cả nhóm',
  bm.alPickedIds().length === 0);

clickDate('');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
bm.alGridSetGroupQty(gA.key, 500);
check('THẺ ĐÃ DÙNG HẾT KHÔNG ĐƯỢC CHIA: g-e (remaining 0) vẫn 0, g-b nhận 500',
  bm.alCardQtyOf('g-e') === 0 && bm.alCardQtyOf('g-b') === 500 &&
  !bm.alPickedIds().includes('g-e'));
gA1 = bm.alGridRows().find(r => r.clsRaw === 'A1');
bm.alGridSetGroupQty(gA1.key, 500);
check('NHIỀU NHÓM CÙNG LÚC: A (g-b 500) + A1 (g-c 500) — tổng 1.000 thanh',
  bm.alCardQtyOf('g-c') === 500 && bm.alCardQtyOf('g-b') === 500 &&
  bm.alPickedIds().length === 2);
bm.alClearPicks();

// ─── D. ĐỔI NGÀY → CHIA LẠI + ĐIỀU SỐ VƯỢT TỒN ─────────────────
clickDate('');
clickDate('2026-10-08');
clickDate('2026-10-10');
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
bm.alGridSetGroupQty(gA.key, 1000);
check('TRƯỚC KHI ĐỔI NGÀY: g-b 800 + g-a 200', bm.alCardQtyOf('g-b') === 800 && bm.alCardQtyOf('g-a') === 200);
clickDate('2026-10-08');   // bỏ 08/10 → chỉ còn 10/10 (g-a còn 700)
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
check('BỎ NGÀY 08/10: nhóm còn 700 → SL tự điều 1.000 → 700, chuyển hết sang g-a',
  gA.remaining === 700 && bm.alCardQtyOf('g-a') === 700 &&
  bm.alCardQtyOf('g-b') === 0 && !bm.alPickedIds().includes('g-b'));
clickDate('2026-10-08');   // chọn lại 08/10 → tồn 1.500, chia lại cũ nhất trước
check('CHỌN LẠI 08/10: SL giữ 700 nhưng CHIA LẠI → g-b (08/10) 700, g-a 0',
  bm.alCardQtyOf('g-b') === 700 && bm.alCardQtyOf('g-a') === 0);
bm.alClearPicks();

// ─── E. BẢNG 6 CỘT + ▸ CHI TIẾT + CẢNH BÁO THẺ CŨ + HELPER ──────
clickDate('');   // tất cả ngày
document.getElementById('al-date').value = '2026-10-20';
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
bm.alGridSetGroupQty(gA.key, 1000);   // g-b 800 (08/10) + g-a 200 (10/10)
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
check('CẢNH BÁO TUỔI NAN: g-b 08/10 → 20/10 = 12 ngày (> 3)',
  bm.alGridStaleOf(gA.cards.find(c => c.id === 'g-b')) === 12 &&
  bm.alGridStaleOf(gA.cards.find(c => c.id === 'g-a')) === 10);
bm.renderAlGrid();
const gridHtml = document.getElementById('al-grid-body').innerHTML;
check('BẢNG MỚI: 6 cột — có size/cls/total/used/remain/qty, KHÔNG có Ngày chọn nan/Thể tích/nguồn',
  gridHtml.includes('data-col="size"') && gridHtml.includes('data-col="cls"') &&
  gridHtml.includes('data-col="total"') && gridHtml.includes('data-col="used"') &&
  gridHtml.includes('data-col="remain"') && gridHtml.includes('data-col="qty"') &&
  !gridHtml.includes('data-col="date"') && !gridHtml.includes('data-col="vol"') &&
  !gridHtml.includes('al-grid-src'));
check('CẢNH BÁO trên dòng: có chip ⚠ thẻ cũ',
  gridHtml.includes('al-grid-warn') && gridHtml.includes('⚠'));
check('DẢI CHIP NGANG: giữ vị trí cuộn khi vẽ lại',
  (() => {
    const el = document.getElementById('al-grid-dates');
    el.scrollLeft = 120; bm.renderAlGrid();
    const kept = el.scrollLeft === 120; el.scrollLeft = 0; return kept;
  })());

const expClick = bm.alOnGridClick({
  target: { closest: (q) => (q === '[data-al-grid-expand]' ? { getAttribute: () => bm.alGridRows().find(r => r.clsRaw === 'A').key } : null) }
});
const afterExp = document.getElementById('al-grid-body').innerHTML;
check('▸ CHI TIẾT: mở khối chia — hiện ngày 08/10, 09/10, 10/10 + nguồn + số Lấy từng thẻ',
  expClick === true && afterExp.includes('al-grid-split-row') &&
  afterExp.includes('08/10/26') && afterExp.includes('09/10/26') && afterExp.includes('10/10/26') &&
  afterExp.includes('Nhà Tế') && afterExp.includes('Lấy'));
bm.alOnGridClick({
  target: { closest: (q) => (q === '[data-al-grid-expand]' ? { getAttribute: () => bm.alGridRows().find(r => r.clsRaw === 'A').key } : null) }
});
check('▸ CHI TIẾT: bấm lần nữa → đóng (bảng gọn lại)',
  !document.getElementById('al-grid-body').innerHTML.includes('al-grid-split-row'));

const helpHidden0 = document.getElementById('al-grid-help').hidden;
const helpOpen = bm.alGridToggleHelp();
const helpShown = document.getElementById('al-grid-help').hidden === false;
bm.alGridCloseHelp();
check('HELPER "?": mặc định ẩn → mở được → đóng lại', helpHidden0 === true && helpOpen === true && helpShown &&
  document.getElementById('al-grid-help').hidden === true);


// ─── F. LƯU: chia FEFO → tạo đúng các lô, cùng 1 mã mẻ ───────────
bm.openAddLotModal();
document.getElementById('al-date').value = '2026-10-15';
bm.alSetLocation('LS12');
document.getElementById('al-use-for').value = 'Ván';
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
gA1 = bm.alGridRows().find(r => r.clsRaw === 'A1');
bm.alGridSetGroupQty(gA.key, 1000);    // g-b 800 + g-a 200
bm.alGridSetGroupQty(gA1.key, 500);    // g-c 500
const beforeCount = state.batches.length;
bm.handleAddLotSubmit({ preventDefault() {} });
const created = state.batches.filter(b => b.date === '2026-10-15');
const lotA = created.find(b => b.bambooType === 'A');
const lotC = created.find(b => b.bambooType === 'A1');
const srcA = (lotA && Array.isArray(lotA.sources)) ? lotA.sources : [];
const srcC = (lotC && Array.isArray(lotC.sources)) ? lotC.sources : [];
const srcOf = (arr, id) => (arr.find(s => s.chonNanId === id) || {}).qty;
check('LƯU: 1 NHÓM = 1 LÔ — nhóm A 1000 (gộp g-b 800 + g-a 200) và nhóm A1 500',
  state.batches.length === beforeCount + 2 && created.length === 2 &&
  !!lotA && lotA.quantity === 1000 && srcA.length === 2 &&
  srcOf(srcA, 'g-b') === 800 && srcOf(srcA, 'g-a') === 200 &&
  !!lotC && lotC.quantity === 500 && srcC.length === 1 && srcOf(srcC, 'g-c') === 500);
check('LƯU: KHÔNG tách lô theo từng thẻ — không có lô 800/200/500 riêng, không tạo lô cho g-e',
  !created.some(b => b.quantity === 800 || b.quantity === 200) &&
  !created.some(b => b.sourceChonNanId === 'g-b' || b.sourceChonNanId === 'g-a' ||
    b.sourceChonNanId === 'g-c' || b.sourceChonNanId === 'g-e') &&
  !created.some(b => b.sourceChonNanId === '' && (!Array.isArray(b.sources) || !b.sources.length)));
check('LƯU: lô gộp có ĐÚNG kích thước · phân loại · vị trí · Dùng cho',
  lotA.length === 1250 && lotA.width === 18 && lotA.thickness === 7 && lotA.bambooType === 'A' &&
  lotC.length === 1250 && lotC.width === 18 && lotC.thickness === 9 && lotC.bambooType === 'A1' &&
  lotA.location === 'LS12' && lotC.location === 'LS12' &&
  lotA.useFor === 'Ván' && lotC.useFor === 'Ván');
check('LƯU: 1 lượt Lưu = 1 LẦN THANH HÓA — cả 2 lô dùng CHUNG mã mẻ sayCharges.say1',
  lotA.sayCharges && lotC.sayCharges &&
  lotA.sayCharges.say1 === lotC.sayCharges.say1 && Number(lotA.sayCharges.say1) > 0);
check('LƯU: nguồn được TRỪ ĐÚNG — g-b còn 0, g-a còn 500 (300 cũ + 200 mới), g-c còn 0',
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'g-b')) === 0 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'g-a')) === 500 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'g-c')) === 0);
const useB = x2.nanSay1UseOf('g-b');
const useA = x2.nanSay1UseOf('g-a');
const useC = x2.nanSay1UseOf('g-c');
check('CHỌN NAN: chip đã chọn thanh hóa đọc ĐÚNG phần lấy từ từng thẻ (g-b 800 · g-a 500 · g-c 500)',
  useB.used === 800 && useB.count === 1 && useA.used === 500 && useA.count === 2 &&
  useC.used === 500 && useC.count === 1);

// ─── F2. ĐÚNG VÍ DỤ NGƯỜI DÙNG: 1250×18×10 · 1512 lấy 12/10 + 13/10 → 1 LÔ 1512 ──
state.xuong2ChonNanThoRecords = [
  cn('h-12', '2026-10-12', [1250, 18, 10], 'A', 1008),
  cn('h-13', '2026-10-13', [1250, 18, 10], 'A', 504)
];
state.batches = [];
bm.openAddLotModal();
document.getElementById('al-date').value = '2026-10-15';
bm.alSetLocation('LS4');
document.getElementById('al-use-for').value = 'Ván';
clickDate('');                 // bỏ chọn hết ngày
clickDate('2026-10-12');
clickDate('2026-10-13');
const gH = bm.alGridRows()[0];
bm.alGridSetGroupQty(gH.key, 1512);
bm.handleAddLotSubmit({ preventDefault() {} });
const lotH = state.batches.find(b => b.date === '2026-10-15');
const srcH = (lotH && Array.isArray(lotH.sources)) ? lotH.sources : [];
check('VÍ DỤ 1512: tạo ĐÚNG 1 LÔ 1512 (KHÔNG phải lô 1.008 + lô 504)',
  state.batches.length === 1 && !!lotH && lotH.quantity === 1512 && srcH.length === 2 &&
  lotH.sourceChonNanId === '' && lotH.bambooType === 'A');
check('VÍ DỤ 1512: nguồn chia CŨ NHẤT TRƯỚC — 12/10 1.008 + 13/10 504; cả 2 thẻ hết tồn',
  srcH[0].chonNanId === 'h-12' && srcH[0].qty === 1008 &&
  srcH[1].chonNanId === 'h-13' && srcH[1].qty === 504 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'h-12')) === 0 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'h-13')) === 0);

// ─── F3. NHIỀU LÔ CÙNG CỠ + PHÂN LOẠI — nút + thêm dòng, mỗi dòng = 1 lô ──
state.xuong2ChonNanThoRecords = [
  cn('m-1', '2026-10-12', [1250, 18, 7], 'A', 3000),
  cn('m-2', '2026-10-13', [1250, 18, 7], 'A', 3000)
];
state.batches = [];
bm.openAddLotModal();
document.getElementById('al-date').value = '2026-10-16';
bm.alSetLocation('LS7');
document.getElementById('al-use-for').value = 'Ván';
clickDate('');                 // bỏ chọn hết ngày
clickDate('2026-10-12');
clickDate('2026-10-13');
const gM = bm.alGridRows()[0];
bm.alGridSetGroupQty(gM.key, 1400);          // lô 1
const addBtn = { getAttribute: (q) => q === 'data-al-grid-add-line' ? gM.key : (q === 'data-line-idx' ? '0' : null) };
const clickedAdd = bm.alOnGridClick({ target: { closest: (q) => q === '[data-al-grid-add-line]' ? addBtn : null } });
check('NÚT +: click handler thêm 1 dòng lô mới',
  clickedAdd === true && bm.alGridAllGroupList().find(g => g.key === gM.key).lines.length === 2);
bm.alGridSetLineQty(gM.key, 1, 2268);
bm.alGridAddGroupLine(gM.key, 1);              // thêm lô 3
bm.alGridSetLineQty(gM.key, 2, 2268);
const gM2 = bm.alGridAllGroupList().find(g => g.key === gM.key);
check('NHIỀU LÔ: 1 nhóm có 3 dòng — 1.400 + 2.268 + 2.268 = 5.936 thanh',
  gM2.lines.length === 3 && gM2.lotCount === 3 && gM2.qty === 5936 &&
  gM2.lines.map(l => l.qty).join(',') === '1400,2268,2268');
check('NHIỀU LÔ: nguồn chia LIÊN TIẾP cũ nhất trước — lô 1 m-1 1.400; lô 2 m-1 1.600 + m-2 668; lô 3 m-2 2.268',
  gM2.lines[0].sources.length === 1 && gM2.lines[0].sources[0].id === 'm-1' && gM2.lines[0].sources[0].alloc === 1400 &&
  gM2.lines[1].sources.length === 2 &&
  gM2.lines[1].sources[0].id === 'm-1' && gM2.lines[1].sources[0].alloc === 1600 &&
  gM2.lines[1].sources[1].id === 'm-2' && gM2.lines[1].sources[1].alloc === 668 &&
  gM2.lines[2].sources.length === 1 && gM2.lines[2].sources[0].id === 'm-2' && gM2.lines[2].sources[0].alloc === 2268);
check('NHIỀU LÔ: alCardQty vẫn là TỔNG nhóm — m-1 3.000 · m-2 2.936',
  bm.alCardQtyOf('m-1') === 3000 && bm.alCardQtyOf('m-2') === 2936);
check('NÚT +: chặn vượt Còn lại của NHÓM sau khi trừ các dòng khác (lô 2 tối đa 2.332)',
  bm.alGridSetLineQty(gM.key, 1, 9999) === 2332 &&
  bm.alGridSetLineQty(gM.key, 1, 2268) === 2268);
check('NÚT Hết của TỪNG DÒNG: lô 3 lấy đúng phần còn lại 2.332 (không lấy hết cả nhóm)',
  bm.alGridFillLine(gM.key, 2) === 2332 && bm.alGridSetLineQty(gM.key, 2, 2268) === 2268);
bm.alGridRemoveGroupLine(gM.key, 2);
check('NÚT Xóa của TỪNG DÒNG: bỏ lô 3 → nhóm còn 2 dòng',
  bm.alGridAllGroupList().find(g => g.key === gM.key).lines.length === 2);
bm.alGridAddGroupLine(gM.key, 1);
bm.alGridSetLineQty(gM.key, 2, 2268);
bm.renderAlGrid();
const gridHtml2 = document.getElementById('al-grid-body').innerHTML;
check('GIAO DIỆN: 3 ô SL lô + 3 nút + + chip "3 lô"',
  (gridHtml2.match(/data-al-grid-line-qty=/g) || []).length === 3 &&
  (gridHtml2.match(/data-al-grid-add-line=/g) || []).length === 3 &&
  gridHtml2.includes('al-grid-lots') && gridHtml2.includes('3 lô'));
const beforeM = state.batches.length;
bm.handleAddLotSubmit({ preventDefault() {} });
const lotsM = state.batches.filter(b => b.date === '2026-10-16');
check('LƯU: 3 DÒNG → 3 LÔ riêng (1.400 · 2.268 · 2.268), không gộp thành 1 lô',
  state.batches.length === beforeM + 3 && lotsM.length === 3 &&
  lotsM.map(b => b.quantity).sort((a, b) => a - b).join(',') === '1400,2268,2268');
check('LƯU: mỗi lô có sources[] riêng, tổng sources = đúng quantity; dùng chung mã mẻ',
  lotsM.every(b => b.sourceChonNanId === '' && Array.isArray(b.sources) &&
    b.sources.reduce((s, x) => s + x.qty, 0) === b.quantity) &&
  new Set(lotsM.map(b => b.sayCharges && b.sayCharges.say1)).size === 1);
check('LƯU: trừ tồn đúng — m-1 hết 3.000, m-2 còn 64 (đã dùng 2.936)',
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'm-1')) === 0 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'm-2')) === 64);
const useM1 = x2.nanSay1UseOf('m-1');
const useM2 = x2.nanSay1UseOf('m-2');
check('CHỌN NAN: chip đếm đúng phần lấy từ từng thẻ khi có nhiều lô (m-1 3.000 · m-2 2.936)',
  useM1.used === 3000 && useM1.count === 2 && useM2.used === 2936 && useM2.count === 2);

// ─── G. CÔNG TẮC + GIỚI HẠN ─────────────────────────────────────
seedData();   // trả dữ liệu về ban đầu (phần F đã tạo thêm lô, làm đổi tồn)
bm.openAddLotModal();
bm.setAlEntryMode('cards');
bm.alTogglePick('g-a');
check('THẺ → BẢNG: thẻ chọn tay g-a (700) được giữ nguyên, không tự đổi sang thẻ khác',
  bm.alCardQtyOf('g-a') === 700);
bm.setAlEntryMode('grid');
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
check('THẺ → BẢNG: nhóm A hiện SL 700 + chia đúng g-a (không tự FEFO khi chỉ chuyển chế độ)',
  gA.qty === 700 && gA.split.length === 1 && gA.split[0].id === 'g-a' && gA.split[0].alloc === 700);
bm.alGridSetGroupQty(gA.key, 500);
check('SỬA NHÓM SAU ĐÓ: mới áp dụng FEFO → g-b (08/10) 500, g-a về 0',
  bm.alCardQtyOf('g-b') === 500 && bm.alCardQtyOf('g-a') === 0);
bm.setAlEntryMode('cards');
check('CÔNG TẮC: sang Thẻ → ẩn bảng', document.getElementById('al-grid-wrap').hidden === true);
bm.setAlEntryMode('grid');
check('CÔNG TẮC: về Bảng → hiện bảng', document.getElementById('al-grid-wrap').hidden === false);

document.getElementById('al-stage').value = 'say2';
check('GIỚI HẠN: Sấy 2 luôn dùng THẺ', bm.alEntryModeOf() === 'cards');
document.getElementById('al-stage').value = 'say1';
document.getElementById('al-rework').checked = true;
check('GIỚI HẠN: Thanh Hóa Lại luôn dùng THẺ', bm.alEntryModeOf() === 'cards');
document.getElementById('al-rework').checked = false;

// ─── H. CẤU TRÚC ────────────────────────────────────────────────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evHtml = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swHtml = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const pkg = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const bmSrc = fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8');

const gridSlice = idxHtml.slice(idxHtml.indexOf('class="al-grid-table"'), idxHtml.indexOf('id="al-grid-body"'));
check('CẤU TRÚC (index.html): bảng đúng 6 cột — ẨN Ngày chọn nan + Thể tích + nguồn/ghi chú',
  (gridSlice.match(/<th[ >]/g) || []).length === 6 &&
  idxHtml.includes('<th>Phân loại</th>') &&
  !idxHtml.includes('>Ngày chọn nan</th>') && !idxHtml.includes('>Thể tích</th>') &&
  !idxHtml.includes('al-grid-note') && !idxHtml.includes('al-grid-src'));
check('CẤU TRÚC (index.html): nút ? + khối helper + nút đóng',
  idxHtml.includes('id="al-grid-help-btn"') && idxHtml.includes('id="al-grid-help"') &&
  idxHtml.includes('id="al-grid-help-close"') && idxHtml.includes('CŨ NHẤT trước'));
check('CẤU TRÚC (events.js): wire ?/đóng + đổi Ngày vẽ lại cảnh báo thẻ cũ',
  evHtml.includes("safeOn('al-grid-help-btn', 'click'") &&
  evHtml.includes("safeOn('al-grid-help-close', 'click'") &&
  evHtml.includes('renderAlChargeOptions(); renderAlGrid();'));
check('CẤU TRÚC (styles.css): helper + ▸ split + cảnh báo; KHÔNG còn note/nguồn dưới cỡ',
  cssHtml.includes('.al-grid-help {') && cssHtml.includes('.al-grid-help-btn {') &&
  cssHtml.includes('.al-grid-split-item {') && cssHtml.includes('.al-grid-warn {') &&
  !cssHtml.includes('.al-grid-note {') && !cssHtml.includes('.al-grid-src {'));
check('CẤU TRÚC (js): gộp nhóm + chia FEFO + cảnh báo tuổi nan + sort mới',
  bmSrc.includes('function alGridAllGroupList') && bmSrc.includes('function alGridAllocCards') &&
  bmSrc.includes('function alGridSetGroupQty') && bmSrc.includes('AL_GRID_STALE_DAYS') &&
  bmSrc.includes("alGridSortMode = 'size'"));
check('CẤU TRÚC (sw.js): cache đã tăng lên v269', swHtml.includes('nha-may-ngoc-son-v305'));
check('CẤU TRÚC (package.json): bộ kiểm thử này nằm trong chuỗi npm test',
  pkg.includes('tests/than-hoa-grid.test.mjs'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

