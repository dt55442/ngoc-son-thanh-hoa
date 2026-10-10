// tests/xuong2-cat-van.test.mjs — Kiểm thử THẺ "CẮT VÁN" (Xưởng 2) — 2 công đoạn
// nhỏ trong 1 thẻ: CẮT VÁN (đầu vào = ván ở Ép Ván → số tấm cắt) + XẺ THANH (đầu vào
// = ván Ép Ván → kích thước đầu ra → số thanh) + nút "Thêm" cho TƯƠNG LAI.
// TỒN ĐẦU VÀO TRỪ THEO KỲ: nút 1 tuần / 2 tuần (cặp lẻ–chẵn VD 41–42) — mỗi lượt
// lưu kèm periodKey, kỳ CHỒNG NHAU vẫn trừ (không cắt trùng khi đổi chế độ).
// Định mức RIÊNG: Cắt ván = tấm/h · Xẻ thanh = thanh/h → 2 dòng Bảng Tổng Hợp.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-bullig.test.mjs) ────────
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

// ─── Dữ liệu mẫu: LƯỢT ÉP VÁN (nguồn ĐẦU VÀO của Cắt Ván) ─────────────
// Tuần ISO 2026: 05–11/10 = tuần 41 · 12–18/10 = tuần 42 · 30/09 = tuần 40.
const { state, STORAGE_KEY_XUONG2_CAT_VAN, STORAGE_KEY_X2_CAT_VAN_RATE, STORAGE_KEY_X2_CAT_VAN_SPAN } =
  await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.pressRecords = [
  // p1 — tuần 41: ván thô 1220×2440×9 × 20 tấm
  { id: 'p1', date: '2026-10-06', week: 'Tuần 41', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 20 }], sticks: [] },
  // p2 — tuần 42: ván thô cùng cỡ × 30 tấm (CHỈ NẰM TRONG CẶP 41–42)
  { id: 'p2', date: '2026-10-13', week: 'Tuần 42', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 30 }], sticks: [] },
  // p3 — tuần 42: THÀNH PHẨM 1200×382×12 × 50 tấm
  { id: 'p3', date: '2026-10-13', week: 'Tuần 42', year: 2026, finishedQty: 50,
    productName: 'Ván 1200x382x12', fpDim: '1200×382×12', vanTho: [], sticks: [] },
  // p4 — tuần 40 (NGOÀI kỳ 41 và cặp 41–42) → KHÔNG được vào pool
  { id: 'p4', date: '2026-09-30', week: 'Tuần 40', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 999 }], sticks: [] }
];
state.xuong2CatVanRecords = [];
state.x2CatVanRates = { cat: {}, xe: {} };
state.x2CatVanEditId = null;
state.x2CatVanSpan = 1;

// ─── Nhân Sự: phân vị "Cắt Ván" + "Xẻ Thanh" (Xưởng 2) ────────────────
state.hrEmployees = [
  { id: 'empCat', name: 'Phạm Văn Cắt', quitDate: '' },
  { id: 'empXe', name: 'Đỗ Thị Xẻ', quitDate: '' },
  { id: 'empOther', name: 'Lê Văn Khác', quitDate: '' }
];
state.hrPositions = [
  { id: 'pcv', name: 'Cắt Ván', department: 'Xưởng 2' },
  { id: 'pxe', name: 'Xẻ Thanh', department: 'Xưởng 2' },
  { id: 'pkhac', name: 'Bào Tinh', department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'a-cat', date: '2026-10-06', department: 'Xưởng 2', positionId: 'pcv', employeeId: 'empCat', start: '07:00', end: '12:00' },
  { id: 'a-xe', date: '2026-10-06', department: 'Xưởng 2', positionId: 'pxe', employeeId: 'empXe', start: '13:00', end: '17:30' },
  { id: 'a-khac', date: '2026-10-06', department: 'Xưởng 2', positionId: 'pkhac', employeeId: 'empOther', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');
// ─── A. KỲ TỒN: 1 TUẦN / 2 TUẦN (CẶP LẺ–CHẴN) ───────────────────────
check('KỲ: 1 tuần 06/10 → tuần 41 (không có tuần kết)',
  x2.catVanPeriodOf('2026-10-06', 1).start === 41 && x2.catVanPeriodOf('2026-10-06', 1).end == null);
check('KỲ: 2 tuần 06/10 → CẶP 41–42 (tuần lẻ = đầu cặp)',
  (() => { const p = x2.catVanPeriodOf('2026-10-06', 2); return p.start === 41 && p.end === 42; })());
check('KỲ: 2 tuần 13/10 (tuần 42 CHẶN) → VẪN CẶP 41–42 (không chồng lấn)',
  (() => { const p = x2.catVanPeriodOf('2026-10-13', 2); return p.start === 41 && p.end === 42; })());
check('KỲ: periodKey 1 tuần = 2026-W41 · 2 tuần = 2026-W41-42',
  x2.catVanPeriodKeyOf('2026-10-06', 1) === '2026-W41' &&
  x2.catVanPeriodKeyOf('2026-10-06', 2) === '2026-W41-42');
check('KỲ: nhãn 2 tuần 13/10 = "Tuần 41–42"',
  x2.catVanPeriodLabel('2026-10-13', 2) === 'Tuần 41–42');

// ─── B. THẺ LAUNCHER + MỞ POP-UP ──────────────────────────────────────
x2.renderXuong2Cards();
check('THẺ: mini card Cắt Ván chưa có lượt → "Chưa ghi"',
  document.getElementById('x2-mini-count-cat-van').textContent === 'Chưa ghi');
check('THẺ: KHÔNG còn cờ "soon" (đã bật chức năng)',
  !x2.X2_CARD_DEFS['x2-cat-van-card'].soon);
check('THẺ: mở thẻ Cắt Ván trả về true (render không ném lỗi)',
  x2.x2OpenCard('x2-cat-van-card') === true);
check('THẺ: pop-up bật + thẻ hiện (không còn x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-cat-van-card').classList.contains('x2-card-hidden'));
check('THẺ: thẻ đang mở ghi vào state + vùng dữ liệu/Xuất Excel',
  state.x2OpenCardId === 'x2-cat-van-card' &&
  x2.x2OpenCardHistoryDomain() === 'xuong2CatVanRecords' &&
  x2.x2OpenCardExportSource() === 'catvan');

// ─── C. POOL NGUỒN ĐẦU VÀO THEO KỲ (1 TUẦN) ─────────────────────────
document.getElementById('x2-cv-date').value = '2026-10-06';
x2.renderX2CatVanCard();
check('NGUỒN (1 tuần): chỉ ván thô tuần 41 — 20 tấm (tuần 40 + tuần 42 KHÔNG lọt)',
  (() => { const it = x2.catVanInputPool('2026-10-06'); return it.length === 1 && it[0].sizeKey === '1220×2440×9' && it[0].total === 20 && it[0].group === 'vantho'; })());
check('NGUỒN (1 tuần): ô Đầu vào có optgroup "Ván thô (Ép Ván)" + còn 20/20 tấm',
  document.getElementById('x2-cv-source').innerHTML.includes('optgroup label="Ván thô (Ép Ván)"') &&
  document.getElementById('x2-cv-source').innerHTML.includes('1220×2440×9 — còn 20 / 20 tấm'));
check('TỒN (1 tuần): thanh tồn ghi "Ván thô: 20 tấm" + kỳ "Tuần 41"',
  document.getElementById('x2-cv-stock-bar').innerHTML.includes('Ván thô: <strong>20 tấm</strong>') &&
  document.getElementById('x2-cv-stock-bar').innerHTML.includes('Tuần 41'));

// ─── D. ĐỔI SANG 2 TUẦN (CẶP 41–42) ──────────────────────────────────
x2.setX2CatVanSpan(2);
check('KỲ 2 TUẦN: pool có CẢ ván thô (20+30=50) + thành phẩm (50) — tuần 40 vẫn loại',
  (() => {
    const it = x2.catVanInputPool('2026-10-06');
    const vt = it.find(x => x.group === 'vantho' && x.sizeKey === '1220×2440×9');
    const fp = it.find(x => x.group === 'thanhpham' && x.sizeKey === '1200×382×12');
    return !!vt && vt.total === 50 && !!fp && fp.total === 50;
  })());
check('KỲ 2 TUẦN: thanh tồn ghi nhãn "Tuần 41–42"',
  document.getElementById('x2-cv-stock-bar').innerHTML.includes('Tuần 41–42'));
check('KỲ 2 TUẦN: remembered theo MÁY (localStorage)',
  localStorage.getItem(STORAGE_KEY_X2_CAT_VAN_SPAN) === '2');
check('KỲ 2 TUẦN: 2 optgroup trong ô Đầu vào (Ván thô + Thành phẩm)',
  document.getElementById('x2-cv-source').innerHTML.includes('optgroup label="Ván thô (Ép Ván)"') &&
  document.getElementById('x2-cv-source').innerHTML.includes('optgroup label="Thành phẩm (Ép Ván)"'));
// ─── E. LƯU LƯỢT CẮT VÁN (trừ tồn theo kỳ 2 tuần) ────────────────────
document.getElementById('x2-cv-kind').value = 'cat';
document.getElementById('x2-cv-date').value = '2026-10-06';
x2.renderX2CatVanSource();
document.getElementById('x2-cv-source').value = 'vantho|1220×2440×9';
document.getElementById('x2-cv-qty').value = '12';
await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
const recCat = (state.xuong2CatVanRecords || [])[0];
check('LƯU CẮT: ghi 1 lượt kind=cat · qtyIn 12 · quantity 12 (tấm)',
  state.xuong2CatVanRecords.length === 1 && recCat.kind === 'cat' &&
  recCat.qtyIn === 12 && recCat.quantity === 12);
check('LƯU CẮT: periodKey = cặp 2026-W41-42 + span 2 + kích thước nguồn',
  recCat.periodKey === '2026-W41-42' && recCat.span === 2 &&
  recCat.inGroup === 'vantho' && recCat.inSizeKey === '1220×2440×9' &&
  recCat.inDims[0] === 1220);
check('LƯU CẮT: đã ghi localStorage (key riêng của Cắt Ván)',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_CAT_VAN) || '[]').length === 1);
check('LƯU CẮT: TỒN CỘT NGAY — ván thô còn 38 / 50 tấm',
  document.getElementById('x2-cv-source').innerHTML.includes('1220×2440×9 — còn 38 / 50 tấm'));
check('LƯU CẮT: chip mini card = "1 lượt · 12 tấm"',
  document.getElementById('x2-mini-count-cat-van').textContent === '1 lượt · 12 tấm');

// ─── F. CHẶN VƯỢT TỒN KỲ ─────────────────────────────────────────────
{
  const before = state.xuong2CatVanRecords.length;
  document.getElementById('x2-cv-source').value = 'vantho|1220×2440×9';
  document.getElementById('x2-cv-qty').value = '40';   // 40 > 38 còn lại
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('CHẶN VƯỢT: nhập 40 tấm (còn 38) → KHÔNG ghi lượt mới',
    state.xuong2CatVanRecords.length === before);
  document.getElementById('x2-cv-qty').value = '30';   // 30 ≤ 38
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('LƯU TIẾP: nhập 30 tấm → được (còn 8 tấm)',
    state.xuong2CatVanRecords.length === before + 1 &&
    document.getElementById('x2-cv-source').innerHTML.includes('còn 8 / 50 tấm'));
}
// ─── G. LƯỢT XẺ THANH (thêm ô Đầu ra + Số thanh ra) ───────────────────
document.getElementById('x2-cv-kind').value = 'xe';
x2.syncX2CatVanKindRows();
document.getElementById('x2-cv-source').value = 'vantho|1220×2440×9';
document.getElementById('x2-cv-qty').value = '5';
document.getElementById('x2-cv-out').value = '1200x18x15';
document.getElementById('x2-cv-out-qty').value = '600';
await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
const recXe = (state.xuong2CatVanRecords || []).find(r => r.kind === 'xe');
check('LƯU XẺ: ghi lượt kind=xe · ván vào 5 tấm · THANH RA 600',
  !!recXe && recXe.qtyIn === 5 && recXe.quantity === 600);
check('LƯU XẺ: kích thước đầu ra chuẩn hoá 1200×18×15 + unitVol 0,000324 m³',
  !!recXe && recXe.outSizeKey === '1200×18×15' && Math.abs(recXe.unitVol - 0.000324) < 1e-9);
check('LƯU XẺ: TỒN TRỪ — ván thô còn 3 / 50 tấm',
  document.getElementById('x2-cv-source').innerHTML.includes('còn 3 / 50 tấm'));
{
  const before = state.xuong2CatVanRecords.length;
  document.getElementById('x2-cv-qty').value = '1';
  document.getElementById('x2-cv-out').value = '';     // thiếu Đầu ra
  document.getElementById('x2-cv-out-qty').value = '100';
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('XẺ: thiếu KÍCH THƯỚC ĐẦU RA → chặn (không ghi lượt)',
    state.xuong2CatVanRecords.length === before);
}

// ─── H. SỬA LƯỢT — TRẢ LẠI PHẦN CỦA NÓ (excludeId) ──────────────────
x2.editXuong2CatVan(recCat.id);
check('SỬA: nạp lại lượt (kỳ vẫn 2 tuần · ô đầu ra trống vì lượt CẮT không có đầu ra)',
  state.x2CatVanEditId === recCat.id &&
  document.getElementById('x2-cv-qty').value == 12 &&
  document.getElementById('x2-cv-out').value === '');
{
  // Pool LOẠI lượt đang sửa → còn 50 − 30 − 5 = 15 tấm → nhập 20 bị chặn
  document.getElementById('x2-cv-qty').value = '20';
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('SỬA: nhập 20 tấm (chỉ còn 15 khi loại lượt này) → bị chặn',
    state.x2CatVanEditId === recCat.id && recCat.qtyIn === 12);
  document.getElementById('x2-cv-qty').value = '15';
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('SỬA: 15 tấm → cập nhật + thoát chế độ sửa (dùng hết ván thô kỳ này)',
    recCat.qtyIn === 15 && state.x2CatVanEditId === null &&
    document.getElementById('x2-cv-source').innerHTML.includes('1200×382×12 — còn 50 / 50 tấm') &&
    !document.getElementById('x2-cv-source').innerHTML.includes('1220×2440×9 — còn'));
}

// ─── I. ĐỊNH MỨC 2 ĐƠN VỊ (tấm/h · thanh/h) ──────────────────────────
document.getElementById('x2-cv-rate-kind').value = 'cat';
document.getElementById('x2-cv-rate-month').value = '2026-10';
document.getElementById('x2-cv-rate-value').value = '60';
x2.handleX2CatVanRateSave();
document.getElementById('x2-cv-rate-kind').value = 'xe';
document.getElementById('x2-cv-rate-month').value = '2026-10';
document.getElementById('x2-cv-rate-value').value = '200';
x2.handleX2CatVanRateSave();
check('ĐỊNH MỨC: cat = 60 tấm/h · xe = 200 thanh/h (state + localStorage)',
  state.x2CatVanRates.cat['2026-10'] === 60 && state.x2CatVanRates.xe['2026-10'] === 200 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_CAT_VAN_RATE)).cat['2026-10'] === 60 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_CAT_VAN_RATE)).xe['2026-10'] === 200);
check('ĐỊNH MỨC: catVanRateOf đọc đúng từng công đoạn + đơn vị',
  x2.catVanRateOf('2026-10-06', 'cat') === 60 && x2.catVanRateOf('2026-10-06', 'xe') === 200);
// ─── J. THẺ NGÀY CHIA 2 VÙNG + CÔNG SUẤT 2 ĐƠN VỊ ───────────────────
document.getElementById('x2-cv-date').value = '2026-10-06';
x2.renderX2CatVanCard();
const dayHtml = document.getElementById('x2-cv-day-cards').innerHTML;
check('THẺ NGÀY: có VÙNG "Cắt ván" + VÙNG "Xẻ thanh" (2 bảng riêng)',
  dayHtml.includes('Cắt ván — đầu vào từ Ép Ván') && dayHtml.includes('Xẻ thanh — ván Ép Ván → kích thước thanh'));
check('THẺ NGÀY: đầu thẻ có CS Cắt (tấm/h) + CS Xẻ (thanh/h) + chip kỳ',
  dayHtml.includes('CS Cắt:') && dayHtml.includes('tấm/h') &&
  dayHtml.includes('CS Xẻ:') && dayHtml.includes('thanh/h') &&
  dayHtml.includes('Tuần 41–42'));
check('THẺ NGÀY: người CẮT / người XẺ từ Bảng bố trí + ô giờ sự cố catvan',
  dayHtml.includes('Phạm Văn Cắt') && dayHtml.includes('Đỗ Thị Xẻ') &&
  dayHtml.includes('data-x2-incident'));
check('THẺ NGÀY: dòng TỔNG 2 vùng (tấm cắt · ván vào/thanh ra)',
  dayHtml.includes('tấm ván đã cắt') && dayHtml.includes('xẻ ra'));
check('THẺ NGÀY: nút Sửa/Xóa uỷ nhiệm data-x2-cv-edit / data-x2-cv-delete',
  dayHtml.includes('data-x2-cv-edit=') && dayHtml.includes('data-x2-cv-delete='));

// ─── K. BẢNG TỔNG HỢP CÔNG SUẤT — 2 DÒNG RIÊNG ──────────────────────
const cap = await import('../js/capacity.js');
const capSrc = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
const stCat = cap.CAP_STAGES.find(s => s.id === 'catvan_cat');
const stXe = cap.CAP_STAGES.find(s => s.id === 'catvan_xe');
check('CAPACITY: 2 dòng Cắt Ván có cardId đúng + xưởng x2',
  !!stCat && !!stXe && stCat.cardId === 'x2-cat-van-card' && stXe.cardId === 'x2-cat-van-card' &&
  stCat.ws === 'x2' && stXe.ws === 'x2');
check('CAPACITY: Cắt ván = tấm/h (sản lượng = số tấm cắt) · Xẻ thanh = thanh/h (sản lượng = thanh ra)',
  stCat.unit === 'tấm/h' && stCat.unitQty === 'tấm' &&
  stXe.unit === 'thanh/h' && stXe.unitQty === 'thanh');
check('CAPACITY: định mức đọc đúng từng dòng (60 tấm/h · 200 thanh/h cho T10/2026)',
  stCat.rateOf('2026-10') === 60 && stXe.rateOf('2026-10') === 200);
check('CAPACITY: khóa giờ sự cố 2 dòng trỏ chung "catvan"',
  capSrc.includes("catvan_cat: 'catvan', catvan_xe: 'catvan'"));
check('CAPACITY: sparkline mini card có ô gắn 2 dòng Cắt Ván',
  cap.CAP_SPARKS.some(g => g.elId === 'x2-mini-spark-cat-van' &&
    g.stageIds.join(',') === 'catvan_cat,catvan_xe'));
// ─── L. CẤU TRÚC NỐI ĐỦ (index · styles · events · 6 chỗ dữ liệu) ─────
const rd = (f) => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const jsStorage = rd('storage.js'), jsCloud = rd('cloud.js'), jsHistory = rd('history.js');
const jsMain = rd('main.js'), jsEvents = rd('events.js'), jsExport = rd('export-xlsx.js');

check('CẤU TRÚC (index.html): thẻ đủ 3 vùng — tồn · form (Kỳ 1/2 tuần + nút Thêm) · thống kê · lịch sử',
  ['id="x2-cv-stock-bar"', 'id="x2-cv-form"', 'id="x2-cv-kind"', 'id="x2-cv-source"',
   'id="x2-cv-qty"', 'id="x2-cv-out"', 'id="x2-cv-out-qty"', 'id="x2-cv-span-btns"',
   'id="x2-cv-period-label"', 'id="btn-x2-cv-add"', 'id="x2-cv-calc"', 'id="x2-cv-stats"',
   'id="x2-cv-day-cards"', 'id="btn-toggle-x2cv-table"', 'id="btn-x2-cv-rate"']
    .every(s => idxHtml.includes(s)) &&
  idxHtml.includes('data-x2-cv-span="1"') && idxHtml.includes('data-x2-cv-span="2"'));
check('CẤU TRÚC (index.html): popup định mức + launcher mô tả 2 công đoạn',
  idxHtml.includes('id="modal-x2-cv-rate"') && idxHtml.includes('id="btn-x2-cv-rate-save"') &&
  idxHtml.includes('Cắt ván + Xẻ thanh'));
check('CẤU TRÚC (styles.css): khối nút kỳ 1/2 tuần + chip kỳ trên thẻ ngày',
  stylesCss.includes('.x2-cv-span-btns') && stylesCss.includes('.x2-cv-span-btn.active') &&
  stylesCss.includes('.x2-day-period'));
check('CẤU TRÚC (events.js): nối form + kỳ + input + định mức + sửa/xóa uỷ nhiệm',
  jsEvents.includes("safeOn('x2-cv-form', 'submit', handleXuong2CatVanSubmit)") &&
  jsEvents.includes("safeOn('x2-cv-span-btns'") &&
  jsEvents.includes("safeOn('x2-cv-date', 'change'") &&
  jsEvents.includes("safeOn('btn-x2-cv-rate-save', 'click', handleX2CatVanRateSave)") &&
  jsEvents.includes("closest('[data-x2-cv-edit]')") &&
  jsEvents.includes("closest('[data-x2-cv-delete]')"));
check('NỐI (state): 3 key + trường state',
  fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8')
    .includes('bamboo_tracker_xuong2_cat_van_v1'));
check('NỐI (storage): restore + 3 đường nạp file/backup + 2 snapshot + export',
  jsStorage.includes('restoreXuong2CatVan') && jsStorage.includes('restoreX2CatVanRates') &&
  jsStorage.includes('xuong2CatVanRecords: state.xuong2CatVanRecords') &&
  jsStorage.includes('x2CatVanRates: state.x2CatVanRates'));
check('NỐI (cloud): snapshot · cloudCore · merge · persist · apply · RATE_DOMAINS',
  jsCloud.includes('xuong2CatVanRecords: state.xuong2CatVanRecords') &&
  jsCloud.includes('xuong2CatVanRecords: obj.xuong2CatVanRecords') &&
  jsCloud.includes("clean('xuong2CatVanRecords'") &&
  jsCloud.includes('STORAGE_KEY_X2_CAT_VAN_RATE') &&
  jsCloud.includes("'x2CatVanRates'"));
check('NỐI (history): 2 vùng dữ liệu tab kanban',
  jsHistory.includes('xuong2CatVanRecords') && jsHistory.includes('x2CatVanRates'));
check('NỐI (main): load 3 khoá lúc boot',
  jsMain.includes('loadXuong2CatVan()') && jsMain.includes('loadX2CatVanRates()') &&
  jsMain.includes('loadX2CatVanSpan()'));
check('NỐI (export-xlsx): nguồn xuất "catvan" + cột 2 công đoạn',
  jsExport.includes("id: 'catvan'") && jsExport.includes('source === \'catvan\''));
check('CẤU TRÚC (sw.js): CACHE_NAME v230 (PWA không dùng cache cũ)',
  /nha-may-ngoc-son-v233/.test(swJs));

// ─── M. XOÁ LƯỢT (tombstone) ──────────────────────────────────────────
{
  const before = state.xuong2CatVanRecords.length;
  x2.deleteXuong2CatVan(recXe.id);
  check('XÓA: giảm 1 lượt + có tombstone (đồng bộ xóa đa máy)',
    state.xuong2CatVanRecords.length === before - 1 &&
    !!(state.deletedIds && state.deletedIds.xuong2CatVanRecords && state.deletedIds.xuong2CatVanRecords[recXe.id]));
  check('XÓA: ván thô của lượt xẻ ĐƯỢC TRẢ LẠI kỳ (còn 5 tấm = 15+30)',
    document.getElementById('x2-cv-source').innerHTML.includes('1220×2440×9 — còn 5 / 50 tấm'));
}

console.log('KẾT QUẢ: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);






