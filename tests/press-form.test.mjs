// tests/press-form.test.mjs — Kiểm thử FORM NHẬP LƯỢT ÉP DUY NHẤT (không phân loại)
// Quy tắc: phần nào không nhập thì thể tích phần đó = 0 —
//  • Không nhập "Ván Thô Tạo Ra" → thể tích ván thô = 0 (SL thành phẩm tính
//    từ ván thô ĐÃ ÉP TRƯỚC ĐÓ ở phần đầu vào)
//  • Không chọn Thành Phẩm → thể tích thành phẩm = 0 (vẫn lưu lượt ép)
//  • Gợi ý đầu vào gồm thanh thô (Bào Tinh) + ván thô đã ép trước đó
'use strict';

// ─── Stubs môi trường (giống export-tabs.test.mjs) ──────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    insertAdjacentHTML(){}, reset(){},
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    toDataURL: () => 'data:image/jpeg;base64,CANVASOK',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
const els = new Map();
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
Object.defineProperty(global, "navigator", { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
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
global.FileReader = class { readAsDataURL(){} readAsText(){} };
global.Image = class { constructor() { this.width = 1200; this.height = 900; } set src(_){} };
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
global.lucide = { createIcons(){} };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── IMPORT MODULES (sau khi stub xong) ───────────────────────────
const { state } = await import('../js/state.js');
const press = await import('../js/press.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: ['press'], allowAdvanced: true };

// ─── Các dòng nhập giả trong modal ────────────────────────────────
const fakeRows = { sticks: [], lines: [] };
document.querySelectorAll = (sel) => {
  if (sel === '#press-sticks .press-line-row') return fakeRows.sticks;
  if (sel === '#press-lines .press-line-row') return fakeRows.lines;
  return [];
};
function setStickRows(rows) { fakeRows.sticks = rows; }
function setLineRows(rows) { fakeRows.lines = rows; }
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }
const stickRow = (type, qty) => ({ querySelector: (s) => s === '.ps-nan' ? { value: type } : { value: qty } });
const lineRow = (dim, qty, ratio) => ({ querySelector: (s) => s === '.pl-vtdim' ? { value: dim } : (s === '.pl-vtqty' ? { value: qty } : { value: ratio }) });

// ─── Dữ liệu giả ──────────────────────────────────────────────────
state.materialRates = [
  { id: 'rate-1', product: 'Ván 1200x600x9' },
  { id: 'rate-2', product: 'Ván 1220x2440x12' }
];
state.planningItems = [
  { year: 2026, week: 'Tuần 33', productId: 'rate-1', qty: 100 },
  { year: 2026, week: 'Tuần 33', productId: 'rate-2', qty: 50 }
];
// Lượt ép cũ đã tạo ván thô 1200x600x9 (làm gợi ý "ván thô đã ép trước đó") + mã thanh A1
state.pressRecords = [
  { id: 'p-old', date: '2026-08-10', week: '2026-W33', year: 2026, productId: 'rate-1', productName: 'Ván 1200x600x9', worker: 'Nam', fpDim: '1200×600×9', finishedQty: 40, glue: 8.5, additive: 1.2, vanTho: [{ vtDim: '1200x600x9', vtQty: 50, ratio: 1 }], sticks: [{ nanKey: 'A1', sticks: 120 }] }
];
state.batches = [];

const ev = { preventDefault(){} };
const volVT = (r) => (r.vanTho || []).reduce((a, l) => a + press.dimVolume(l.vtDim, l.vtQty), 0);
const volFP = (r) => press.dimVolume(r.fpDim, r.finishedQty);
function lastRecord() { return state.pressRecords[state.pressRecords.length - 1]; }
function fillForm({ date = '2026-08-12', product = '', worker = 'Nam', sticks = [], lines = [] } = {}) {
  setVal('press-id', '');
  setVal('press-date', date);
  setVal('press-product', product);
  setVal('press-glue', '');
  setVal('press-additive', '');
  setVal('press-worker', worker);
  setVal('press-fp-qty', '');
  setStickRows(sticks);
  setLineRows(lines);
}

// ═══════════════════════════════════════════════════════════
// 1) Không chọn Thành Phẩm → vẫn lưu, THỂ TÍCH THÀNH PHẨM = 0
// ═══════════════════════════════════════════════════════════
fillForm({
  product: '',
  sticks: [stickRow('A1', '4800')],
  lines: [lineRow('1200x600x9', '96', '1')]
});
const before1 = state.pressRecords.length;
press.handlePressRecordSubmit(ev);
check('Không TP: lưu được mà không cần chọn thành phẩm', state.pressRecords.length === before1 + 1);
const r1 = lastRecord();
check('Không TP: productId rỗng', r1.productId === '');
check('Không TP: SL thành phẩm = 0', (r1.finishedQty || 0) === 0);
check('Không TP: THỂ TÍCH THÀNH PHẨM = 0', volFP(r1) === 0);
check('Không TP: vẫn tính thể tích ván thô tạo ra (96 tấm)', volVT(r1) > 0 && (r1.vanTho || []).some(l => l.vtQty === 96));

// ═══════════════════════════════════════════════════════════
// 2) Có TP + "Ván Thô Tạo Ra" → SL tự tính theo THỂ TÍCH
//    12 tấm ván 1200×600×9 = 77.760.000 mm³ ÷ (1220×2440×12 = 35.721.600) = 2
// ═══════════════════════════════════════════════════════════
fillForm({
  date: '2026-08-13', product: 'rate-2', worker: 'Hùng',
  sticks: [stickRow('A1', '4800')],
  lines: [lineRow('1200x600x9', '12', '')]
});
const before2 = state.pressRecords.length;
press.handlePressRecordSubmit(ev);
check('Có TP + VT tạo ra: lưu được', state.pressRecords.length === before2 + 1);
const r2 = lastRecord();
check('Có TP + VT tạo ra: SL tự tính theo thể tích = 2', r2.finishedQty === 2);
check('Có TP + VT tạo ra: THỂ TÍCH VÁN THÔ > 0', volVT(r2) > 0);
check('Có TP + VT tạo ra: THỂ TÍCH THÀNH PHẨM > 0', volFP(r2) > 0);

// ═══════════════════════════════════════════════════════════
// 3) Không nhập "Ván Thô Tạo Ra" → THỂ TÍCH VÁN THÔ = 0,
//    SL thành phẩm tính từ ván thô ĐÃ ÉP TRƯỚC ĐÓ (đầu vào)
// ═══════════════════════════════════════════════════════════
fillForm({
  date: '2026-08-14', product: 'rate-2', worker: 'Hùng',
  sticks: [stickRow('1200x600x9', '12')],           // ván thô đã ép trước đó
  lines: [lineRow('', '', '')]                       // không nhập VT tạo ra
});
const before3 = state.pressRecords.length;
press.handlePressRecordSubmit(ev);
check('Không VT tạo ra: lưu được', state.pressRecords.length === before3 + 1);
const r3 = lastRecord();
check('Không VT tạo ra: vanTho rỗng', (r3.vanTho || []).length === 0);
check('Không VT tạo ra: THỂ TÍCH VÁN THÔ = 0', volVT(r3) === 0);
check('Không VT tạo ra: SL tự tính theo thể tích = 2 (từ ván thô đã ép trước đó)', r3.finishedQty === 2);
check('Không VT tạo ra: THỂ TÍCH THÀNH PHẨM > 0', volFP(r3) > 0);

// ═══════════════════════════════════════════════════════════
// 3b) Không có ván thô → người dùng TỰ NHẬP SL thành phẩm
// ═══════════════════════════════════════════════════════════
fillForm({
  date: '2026-08-14', product: 'rate-2', worker: 'Hùng',
  sticks: [stickRow('A1', '4800')],
  lines: []
});
setVal('press-fp-qty', '50'); // nhập tay ô Số Lượng Thành Phẩm
const before3b = state.pressRecords.length;
press.handlePressRecordSubmit(ev);
check('SL sửa tay: không có ván thô vẫn lưu được lượt ép', state.pressRecords.length === before3b + 1);
check('SL sửa tay: finishedQty = 50 (số người dùng nhập)', lastRecord().finishedQty === 50);

// ═══════════════════════════════════════════════════════════
// 4) Bảo vệ: chọn TP nhưng đầu vào chỉ có loại thanh (không phải
//    kích thước ván thô) → SL tính ra 0 → không lưu
// ═══════════════════════════════════════════════════════════
fillForm({
  date: '2026-08-15', product: 'rate-1', worker: 'Lan',
  sticks: [stickRow('A1', '4800')],
  lines: []
});
const before4 = state.pressRecords.length;
press.handlePressRecordSubmit(ev);
check('Bảo vệ: TP + chỉ có thanh (không phải ván thô) -> không lưu', state.pressRecords.length === before4);

// ═══════════════════════════════════════════════════════════
// 5) Trống cả "Ván Thô Tạo Ra" lẫn Thành Phẩm → không lưu
// ═══════════════════════════════════════════════════════════
fillForm({
  sticks: [stickRow('A1', '4800')],
  lines: []
});
const before5 = state.pressRecords.length;
press.handlePressRecordSubmit(ev);
check('Trống cả hai phần -> không lưu', state.pressRecords.length === before5);

// ═══════════════════════════════════════════════════════════
// 6) Chuẩn hóa kích thước nhập tay ("x" → "×")
// ═══════════════════════════════════════════════════════════
fillForm({
  date: '2026-08-16', product: '',
  sticks: [stickRow('1200x38x16', '4800')],
  lines: [lineRow('1220x2440x9', '30', '2')]
});
press.handlePressRecordSubmit(ev);
const r6 = lastRecord();
check('Chuẩn hóa: "1200x38x16" → "1200×38×16"', r6.sticks[0].nanKey === '1200×38×16');
check('Chuẩn hóa: "1220x2440x9" → "1220×2440×9"', r6.vanTho[0].vtDim === '1220×2440×9');

// ═══════════════════════════════════════════════════════════
// 7) Gợi ý đầu vào: thanh thô (Bào Tinh/dùng trước đó) + VÁN THÔ ĐÃ ÉP
// ═══════════════════════════════════════════════════════════
press.populatePressInputTypeList();
const dlHTML = document.getElementById('press-input-type-list').innerHTML;
check('Gợi ý: có ván thô đã ép "1200×600×9"', dlHTML.includes('1200×600×9'));
check('Gợi ý: mô tả "ván thô đã ép" kèm tổng số tấm', dlHTML.includes('ván thô đã ép') && /ván thô đã ép · [\d.,]+ tấm/.test(dlHTML));
check('Gợi ý: có loại thanh "A1" (đã dùng ở lượt ép trước)', dlHTML.includes('A1') && dlHTML.includes('thanh · đã dùng ở lượt ép trước'));

// ═══════════════════════════════════════════════════════════
// 8) recalc: tự tính khi có ván thô — giữ nguyên số tự nhập khi không có
// ═══════════════════════════════════════════════════════════
const fpEl = document.getElementById('press-fp-qty');
let fpManualFlag = null;
fpEl.setAttribute = (k, v) => { if (k === 'data-manual') fpManualFlag = v; };
fpEl.getAttribute = (k) => (k === 'data-manual' ? fpManualFlag : null);

// Có ván thô tạo ra → tự tính SL theo thể tích (ghi đè ô trống)
setVal('press-product', 'rate-2');
setStickRows([stickRow('A1', '100')]);
setLineRows([lineRow('1200x600x9', '12', '')]);
fpEl.value = ''; fpManualFlag = null;
press.recalcPressQuantities();
check('recalc: có ván thô → tự tính SL theo thể tích (2)', String(fpEl.value) === '2');

// Không có ván thô + người dùng đã tự nhập → giữ nguyên số đã nhập
setLineRows([]);
fpEl.value = '77'; fpManualFlag = '1';
press.recalcPressQuantities();
check('recalc: không ván thô → giữ SL người dùng tự nhập (77)', String(fpEl.value) === '77');

console.log(`\n=== KẾT QUẢ: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);


