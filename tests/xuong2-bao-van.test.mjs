// tests/xuong2-bao-van.test.mjs — Kiểm thử THẺ "BÀO VÁN" (Xưởng 2) — 2 công đoạn
// nhỏ trong 1 thẻ: BÀO + CHÀ THÙNG — form CHỈ có ĐẦU VÀO + SỐ LƯỢNG (như thẻ Cắt
// ván, KHÔNG có ô Đầu ra). Nguồn = ván Ép Ván theo kỳ 1/2 tuần, TỒN TRỪ THEO KỲ
// nhưng SỔ RIÊNG (không trừ chéo với thẻ Cắt Ván). Định mức CẢ 2 = tấm/h →
// Bảng Tổng Hợp Công Suất 2 dòng riêng.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-cat-van.test.mjs) ────────
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

// ─── Dữ liệu mẫu: LƯỢT ÉP VÁN (nguồn ĐẦU VÀO — cùng kỳ 41/42 như test Cắt Ván) ──
const { state, STORAGE_KEY_XUONG2_BAO_VAN, STORAGE_KEY_X2_BAO_VAN_RATE, STORAGE_KEY_X2_BAO_VAN_SPAN } =
  await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.pressRecords = [
  { id: 'p1', date: '2026-10-06', week: 'Tuần 41', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 20 }], sticks: [] },
  { id: 'p2', date: '2026-10-13', week: 'Tuần 42', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 30 }], sticks: [] },
  { id: 'p3', date: '2026-10-13', week: 'Tuần 42', year: 2026, finishedQty: 50,
    productName: 'Ván 1200x382x12', fpDim: '1200×382×12', vanTho: [], sticks: [] },
  { id: 'p4', date: '2026-09-30', week: 'Tuần 40', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 999 }], sticks: [] }
];
state.xuong2BaoVanRecords = [];
state.x2BaoVanRates = { bao: {}, cha: {} };
state.x2BaoVanEditId = null;
state.x2BaoVanSpan = 1;
// THẺ CẮT VÁN đã có lượt (sổ RIÊNG — Bào Ván KHÔNG được trừ phần này)
state.xuong2CatVanRecords = [
  { id: 'cvseed', kind: 'cat', date: '2026-10-06', span: 2, periodKey: '2026-W41-42',
    inGroup: 'vantho', inSizeKey: '1220×2440×9', inDims: [1220, 2440, 9],
    qtyIn: 7, quantity: 7, createdAt: '2026-10-06T01:00:00.000Z' }
];
state.x2CatVanEditId = null;
state.x2CatVanSpan = 2;

// ─── Nhân Sự: phân vị "Bào Ván" + "Chà Thùng" (Xưởng 2) ──────────────
state.hrEmployees = [
  { id: 'empBao', name: 'Hoàng Văn Bào', quitDate: '' },
  { id: 'empCha', name: 'Vũ Thị Chà', quitDate: '' },
  { id: 'empOther', name: 'Lê Văn Khác', quitDate: '' }
];
state.hrPositions = [
  { id: 'pbv', name: 'Bào Ván', department: 'Xưởng 2' },
  { id: 'pct', name: 'Chà Thùng', department: 'Xưởng 2' },
  { id: 'pkhac', name: 'Bào Tinh', department: 'Xưởng 2' }
];
state.hrAssignments = [
  { id: 'a-bao', date: '2026-10-06', department: 'Xưởng 2', positionId: 'pbv', employeeId: 'empBao', start: '07:00', end: '12:00' },
  { id: 'a-cha', date: '2026-10-06', department: 'Xưởng 2', positionId: 'pct', employeeId: 'empCha', start: '13:00', end: '17:30' },
  { id: 'a-khac', date: '2026-10-06', department: 'Xưởng 2', positionId: 'pkhac', employeeId: 'empOther', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');

// ─── A. THẺ LAUNCHER + MỞ POP-UP ──────────────────────────────────────
x2.renderXuong2Cards();
check('THẺ: mini card Bào Ván chưa có lượt → "Chưa ghi"',
  document.getElementById('x2-mini-count-bao-van').textContent === 'Chưa ghi');
check('THẺ: KHÔNG còn cờ "soon" (đã bật chức năng)',
  !x2.X2_CARD_DEFS['x2-bao-van-card'].soon);
check('THẺ: mở thẻ Bào Ván trả về true (render không ném lỗi)',
  x2.x2OpenCard('x2-bao-van-card') === true);
check('THẺ: pop-up bật + thẻ hiện (không còn x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bao-van-card').classList.contains('x2-card-hidden'));
check('THẺ: vùng dữ liệu Lịch sử + nguồn Xuất Excel của thẻ Bào Ván',
  state.x2OpenCardId === 'x2-bao-van-card' &&
  x2.x2OpenCardHistoryDomain() === 'xuong2BaoVanRecords' &&
  x2.x2OpenCardExportSource() === 'baovan');

// ─── B. KỲ TỒN 1/2 TUẦN (dùng chung quy tắc cặp tuần) ────────────────
document.getElementById('x2-bv-date').value = '2026-10-06';
x2.renderX2BaoVanCard();
check('KỲ (1 tuần): pool chỉ ván thô tuần 41 — 20 tấm (tuần 40 + 42 KHÔNG lọt)',
  (() => { const it = x2.baoVanInputPool('2026-10-06'); return it.length === 1 && it[0].total === 20 && it[0].group === 'vantho'; })());
check('KỲ (1 tuần): thanh tồn ghi "Ván thô: 20 tấm" + kỳ "Tuần 41"',
  document.getElementById('x2-bv-stock-bar').innerHTML.includes('Ván thô: <strong>20 tấm</strong>') &&
  document.getElementById('x2-bv-stock-bar').innerHTML.includes('Tuần 41'));

// ─── C. SỔ RIÊNG: lượt CẮT VÁN KHÔNG trừ sang Bào Ván ───────────────
check('SỔ RIÊNG: Cắt Ván đã dùng 7 tấm (tồn cat = 43/50 kỳ 2 tuần) — Bào Ván kỳ 1 tuần VẪN 20/20',
  x2.catVanInputPool('2026-10-06').find(x => x.key === 'vantho|1220×2440×9').remaining === 43 &&
  x2.baoVanInputPool('2026-10-06').find(x => x.key === 'vantho|1220×2440×9').remaining === 20);

// ─── D. ĐỔI SANG 2 TUẦN (CẶP 41–42) ──────────────────────────────────
x2.setX2BaoVanSpan(2);
check('KỲ 2 TUẦN: pool có ván thô 50 + thành phẩm 50 — tuần 40 vẫn loại',
  (() => {
    const it = x2.baoVanInputPool('2026-10-06');
    const vt = it.find(x => x.group === 'vantho' && x.sizeKey === '1220×2440×9');
    const fp = it.find(x => x.group === 'thanhpham' && x.sizeKey === '1200×382×12');
    return !!vt && vt.total === 50 && !!fp && fp.total === 50;
  })());
check('SỔ RIÊNG (cùng kỳ 2 tuần): Bào Ván vẫn 50/50 — KHÔNG trừ 7 tấm của Cắt Ván',
  x2.baoVanInputPool('2026-10-06').find(x => x.key === 'vantho|1220×2440×9').remaining === 50);
check('KỲ 2 TUẦN: nhãn kỳ "Tuần 41–42" + remembered theo MÁY',
  document.getElementById('x2-bv-stock-bar').innerHTML.includes('Tuần 41–42') &&
  localStorage.getItem(STORAGE_KEY_X2_BAO_VAN_SPAN) === '2');
check('CÔNG ĐOẠN: 2 lựa chọn Bào / Chà thùng + form CHỈ có Đầu vào + Số lượng (KHÔNG ô Đầu ra)',
  (() => {
    const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const form = h.slice(h.indexOf('id="x2-bv-form"'), h.indexOf('</form>', h.indexOf('id="x2-bv-form"')));
    return h.includes('<option value="bao">Bào') && h.includes('<option value="cha">Chà thùng') &&
      !form.includes('x2-bv-out') && form.includes('id="x2-bv-qty"');
  })());
// ─── E. LƯU LƯỢT BÀO (trừ tồn theo kỳ 2 tuần — sổ RIÊNG) ────────────
document.getElementById('x2-bv-kind').value = 'bao';
document.getElementById('x2-bv-date').value = '2026-10-06';
x2.renderX2BaoVanSource();
document.getElementById('x2-bv-source').value = 'vantho|1220×2440×9';
document.getElementById('x2-bv-qty').value = '12';
await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
const recBao = (state.xuong2BaoVanRecords || [])[0];
check('LƯU BÀO: ghi 1 lượt kind=bao · qtyIn 12 · quantity 12 (tấm — không có đầu ra)',
  state.xuong2BaoVanRecords.length === 1 && recBao.kind === 'bao' &&
  recBao.qtyIn === 12 && recBao.quantity === 12 && !recBao.outSizeKey);
check('LƯU BÀO: periodKey cặp 2026-W41-42 + span 2 + đã ghi localStorage key riêng',
  recBao.periodKey === '2026-W41-42' && recBao.span === 2 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BAO_VAN) || '[]').length === 1);
check('LƯU BÀO: TỒN CỘT NGAY — ván thô còn 38 / 50 tấm (sổ RIÊNG)',
  document.getElementById('x2-bv-source').innerHTML.includes('1220×2440×9 — còn 38 / 50 tấm'));
check('LƯU BÀO: chip mini card = "1 lượt · 12 tấm"',
  document.getElementById('x2-mini-count-bao-van').textContent === '1 lượt · 12 tấm');
{
  const before = state.xuong2BaoVanRecords.length;
  document.getElementById('x2-bv-qty').value = '40';   // 40 > 38 còn lại
  await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
  check('CHẶN VƯỢT: nhập 40 tấm (còn 38) → KHÔNG ghi lượt mới',
    state.xuong2BaoVanRecords.length === before);
}

// ─── F. LƯỢT CHÀ THÙNG (cùng form Đầu vào + Số lượng) ────────────────
document.getElementById('x2-bv-kind').value = 'cha';
document.getElementById('x2-bv-source').value = 'vantho|1220×2440×9';
document.getElementById('x2-bv-qty').value = '10';
await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
const recCha = (state.xuong2BaoVanRecords || []).find(r => r.kind === 'cha');
check('LƯU CHÀ: ghi lượt kind=cha · qtyIn 10 · quantity 10 (tấm)',
  !!recCha && recCha.qtyIn === 10 && recCha.quantity === 10);
check('LƯU CHÀ: TỒN TRỪ — ván thô còn 28 / 50 tấm · thanh thành phẩm không bị đụng (50/50)',
  document.getElementById('x2-bv-source').innerHTML.includes('1220×2440×9 — còn 28 / 50 tấm') &&
  document.getElementById('x2-bv-source').innerHTML.includes('1200×382×12 — còn 50 / 50 tấm'));

// ─── G. SỬA LƯỢT — TRẢ LẠI PHẦN CỦA NÓ (excludeId) ──────────────────
x2.editXuong2BaoVan(recBao.id);
check('SỬA: nạp lại lượt (kỳ vẫn 2 tuần · số lượng 12)',
  state.x2BaoVanEditId === recBao.id && document.getElementById('x2-bv-qty').value == 12);
{
  // Pool LOẠI lượt đang sửa → còn 50 − 10 = 40 → nhập 45 bị chặn
  document.getElementById('x2-bv-qty').value = '45';
  await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
  check('SỬA: nhập 45 tấm (chỉ còn 40 khi loại lượt này) → bị chặn',
    state.x2BaoVanEditId === recBao.id && recBao.qtyIn === 12);
  document.getElementById('x2-bv-qty').value = '40';
  await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
  check('SỬA: 40 tấm → cập nhật + thoát chế độ sửa (ván thô = 40 + 10 chà = 50)',
    recBao.qtyIn === 40 && state.x2BaoVanEditId === null &&
    document.getElementById('x2-bv-source').innerHTML.includes('1200×382×12 — còn 50 / 50 tấm') &&
    !document.getElementById('x2-bv-source').innerHTML.includes('1220×2440×9 — còn'));
}

// ─── H. ĐỊNH MỨC — CẢ 2 = tấm/h ──────────────────────────────────────
document.getElementById('x2-bv-rate-kind').value = 'bao';
document.getElementById('x2-bv-rate-month').value = '2026-10';
document.getElementById('x2-bv-rate-value').value = '120';
x2.handleX2BaoVanRateSave();
document.getElementById('x2-bv-rate-kind').value = 'cha';
document.getElementById('x2-bv-rate-month').value = '2026-10';
document.getElementById('x2-bv-rate-value').value = '200';
x2.handleX2BaoVanRateSave();
check('ĐỊNH MỨC: bao = 120 tấm/h · cha = 200 tấm/h (state + localStorage)',
  state.x2BaoVanRates.bao['2026-10'] === 120 && state.x2BaoVanRates.cha['2026-10'] === 200 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_VAN_RATE)).bao['2026-10'] === 120 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_VAN_RATE)).cha['2026-10'] === 200);
check('ĐỊNH MỨC: baoVanRateOf đọc đúng từng công đoạn',
  x2.baoVanRateOf('2026-10-06', 'bao') === 120 && x2.baoVanRateOf('2026-10-06', 'cha') === 200);
// ─── I. THẺ NGÀY CHIA 2 VÙNG + CÔNG SUẤT 2 DÒNG tấm/h ───────────────
document.getElementById('x2-bv-date').value = '2026-10-06';
x2.renderX2BaoVanCard();
const dayHtml = document.getElementById('x2-bv-day-cards').innerHTML;
check('THẺ NGÀY: có VÙNG "Bào" + VÙNG "Chà thùng" (2 bảng riêng, cùng cột Đầu vào/SL)',
  dayHtml.includes('Bào — đầu vào từ Ép Ván') && dayHtml.includes('Chà thùng — đầu vào từ Ép Ván'));
check('THẺ NGÀY: đầu thẻ CS Bào + CS Chà (đều tấm/h) + chip kỳ + ô sự cố baovan',
  dayHtml.includes('CS Bào:') && dayHtml.includes('CS Chà:') &&
  (dayHtml.match(/tấm\/h/g) || []).length >= 4 &&
  dayHtml.includes('Tuần 41–42') && dayHtml.includes('data-x2-incident'));
check('THẺ NGÀY: người Bào / người Chà từ Bảng bố trí + dòng TỔNG 2 vùng',
  dayHtml.includes('Hoàng Văn Bào') && dayHtml.includes('Vũ Thị Chà') &&
  dayHtml.includes('tấm đã bào') && dayHtml.includes('tấm đã chà thùng'));
check('THẺ NGÀY: nút Sửa/Xóa uỷ nhiệm data-x2-bv-edit / data-x2-bv-delete',
  dayHtml.includes('data-x2-bv-edit=') && dayHtml.includes('data-x2-bv-delete='));

const cap = await import('../js/capacity.js');
const capSrc = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
const stBao = cap.CAP_STAGES.find(s => s.id === 'baovan_bao');
const stCha = cap.CAP_STAGES.find(s => s.id === 'baovan_cha');
check('CAPACITY: 2 dòng Bào Ván — CẢ 2 tấm/h + cardId đúng + xưởng x2',
  !!stBao && !!stCha && stBao.unit === 'tấm/h' && stCha.unit === 'tấm/h' &&
  stBao.unitQty === 'tấm' && stCha.unitQty === 'tấm' &&
  stBao.cardId === 'x2-bao-van-card' && stCha.cardId === 'x2-bao-van-card' &&
  stBao.ws === 'x2' && stCha.ws === 'x2');
check('CAPACITY: định mức đọc đúng từng dòng (120 · 200 tấm/h cho T10/2026)',
  stBao.rateOf('2026-10') === 120 && stCha.rateOf('2026-10') === 200);
check('CAPACITY: khóa giờ sự cố 2 dòng trỏ chung "baovan" + sparkline có ô gắn',
  capSrc.includes("baovan_bao: 'baovan', baovan_cha: 'baovan'") &&
  cap.CAP_SPARKS.some(g => g.elId === 'x2-mini-spark-bao-van' &&
    g.stageIds.join(',') === 'baovan_bao,baovan_cha'));

// ─── J. CẤU TRÚC NỐI Đủ ──────────────────────────────────────────────
const rd = (f) => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const jsStorage = rd('storage.js'), jsCloud = rd('cloud.js'), jsHistory = rd('history.js');
const jsMain = rd('main.js'), jsEvents = rd('events.js'), jsExport = rd('export-xlsx.js');

check('CẤU TRÚC (index.html): thẻ đủ — tồn · form (Kỳ 1/2 + nút Thêm) · thống kê · lịch sử · popup ĐM',
  ['id="x2-bv-stock-bar"', 'id="x2-bv-form"', 'id="x2-bv-kind"', 'id="x2-bv-source"',
   'id="x2-bv-qty"', 'id="x2-bv-span-btns"', 'id="x2-bv-period-label"', 'id="btn-x2-bv-add"',
   'id="x2-bv-calc"', 'id="x2-bv-stats"', 'id="x2-bv-day-cards"', 'id="btn-toggle-x2bv-table"',
   'id="btn-x2-bv-rate"', 'id="modal-x2-bv-rate"', 'id="btn-x2-bv-rate-save"']
    .every(s => idxHtml.includes(s)) &&
  idxHtml.includes('data-x2-bv-span="1"') && idxHtml.includes('data-x2-bv-span="2"') &&
  idxHtml.includes('Bào + Chà thùng'));
check('CẤU TRÚC (events.js): nối form + kỳ + input + định mức + sửa/xóa uỷ nhiệm',
  jsEvents.includes("safeOn('x2-bv-form', 'submit', handleXuong2BaoVanSubmit)") &&
  jsEvents.includes("safeOn('x2-bv-span-btns'") &&
  jsEvents.includes("safeOn('x2-bv-date', 'change'") &&
  jsEvents.includes("safeOn('btn-x2-bv-rate-save', 'click', handleX2BaoVanRateSave)") &&
  jsEvents.includes("closest('[data-x2-bv-edit]')") &&
  jsEvents.includes("closest('[data-x2-bv-delete]')"));
check('NỐI (state): 3 key + trường state',
  fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8')
    .includes('bamboo_tracker_xuong2_bao_van_v1'));
check('NỐI (storage): restore + 3 đường nạp + 2 snapshot + export',
  jsStorage.includes('restoreXuong2BaoVan') && jsStorage.includes('restoreX2BaoVanRates') &&
  jsStorage.includes('xuong2BaoVanRecords: state.xuong2BaoVanRecords') &&
  jsStorage.includes('x2BaoVanRates: state.x2BaoVanRates'));
check('NỐI (cloud): snapshot · cloudCore · merge · persist · apply · RATE_DOMAINS',
  jsCloud.includes('xuong2BaoVanRecords: state.xuong2BaoVanRecords') &&
  jsCloud.includes('xuong2BaoVanRecords: obj.xuong2BaoVanRecords') &&
  jsCloud.includes("clean('xuong2BaoVanRecords'") &&
  jsCloud.includes('STORAGE_KEY_X2_BAO_VAN_RATE') &&
  jsCloud.includes("'x2BaoVanRates'"));
check('NỐI (history): 2 vùng dữ liệu tab kanban',
  jsHistory.includes('xuong2BaoVanRecords') && jsHistory.includes('x2BaoVanRates'));
check('NỐI (main): load 3 khoá lúc boot',
  jsMain.includes('loadXuong2BaoVan()') && jsMain.includes('loadX2BaoVanRates()') &&
  jsMain.includes('loadX2BaoVanSpan()'));
check('NỐI (export-xlsx): nguồn xuất "baovan" + cột 2 công đoạn',
  jsExport.includes("id: 'baovan'") && jsExport.includes("source === 'baovan'"));
check('CẤU TRÚC (styles + sw): dùng lại khối nút kỳ + CACHE_NAME v231',
  stylesCss.includes('.x2-cv-span-btn.active') && /nha-may-ngoc-son-v231/.test(swJs));

// ─── K. XOÁ LƯỢT (tombstone) ──────────────────────────────────────────
{
  const before = state.xuong2BaoVanRecords.length;
  x2.deleteXuong2BaoVan(recCha.id);
  check('XÓA: giảm 1 lượt + có tombstone (đồng bộ xóa đa máy)',
    state.xuong2BaoVanRecords.length === before - 1 &&
    !!(state.deletedIds && state.deletedIds.xuong2BaoVanRecords && state.deletedIds.xuong2BaoVanRecords[recCha.id]));
  check('XÓA: ván thô của lượt chà ĐƯỢC TRẢ LẠI kỳ (40 + 10 → còn 10 tấm)',
    document.getElementById('x2-bv-source').innerHTML.includes('1220×2440×9 — còn 10 / 50 tấm'));
}

console.log('KẾT QUẢ: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);



