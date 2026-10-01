// tests/planning-rates.test.mjs — Định mức nguyên vật liệu: "Sử Dụng Nan" +
// "ĐVT" + nhãn sản phẩm trên biểu đồ Kế Hoạch vs Đã Ép (tab Dashboard).
// Bao phủ: helpers (rateNanUse/rateUnit/rateDisplayLabel/normalizeMaterialRate),
// form lưu 2 trường mới (tên SP chỉ còn kích thước), bảng có 2 cột mới, nguồn
// tính kế hoạch dùng nanUse thay vì cắt tên, nhãn biểu đồ theo ĐVT và nhóm Total.
'use strict';

import fs from 'node:fs';

// ─── Stubs môi trường (giống qc.test.mjs) ────────────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {}, _tag: '',
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
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
  createElement: (tag) => { const e = makeEl(); e._tag = tag || ''; return e; },
  createTextNode: (t) => ({ textContent: t }),
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}
const approx = (a, b) => Math.abs(a - b) < 1e-9;

// ─── IMPORT MODULES ────────────────────────────────────────────
const { state } = await import('../js/state.js');
const planning = await import('../js/planning.js');
const press = await import('../js/press.js');

const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }

// ─── A. HELPERS: rateNanUse / rateUnit / rateDisplayLabel ───────
console.log('--- A. HÀM SUY SỬ DỤNG NAN / ĐVT / NHÃN SẢN PHẨM ---');
check('rateNanUse: dữ liệu MỚI lấy đúng trường nanUse (Bullig)',
  planning.rateNanUse({ product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh' }) === 'Bullig');
check('rateNanUse: dữ liệu CŨ (không nanUse) suy từ tên (Ván)',
  planning.rateNanUse({ product: 'Ván 1200x382x12' }) === 'Ván');
check('rateUnit: ưu tiên trường unit (Thanh)',
  planning.rateUnit({ product: '1200x382x12', nanUse: 'Ván', unit: 'Thanh' }) === 'Thanh');
check('rateUnit: Bullig không có unit -> mặc định Thanh',
  planning.rateUnit({ product: '1250x80x12', nanUse: 'Bullig' }) === 'Thanh');
check('rateUnit: Ván không có unit -> mặc định Tấm',
  planning.rateUnit({ product: '1200x382x12', nanUse: 'Ván' }) === 'Tấm');
check('rateDisplayLabel: ĐVT Tấm -> "Ván <kích thước>"',
  planning.rateDisplayLabel({ product: '1200x382x12', nanUse: 'Ván', unit: 'Tấm' }) === 'Ván 1200x382x12');
check('rateDisplayLabel: ĐVT Thanh -> "Thanh <kích thước>"',
  planning.rateDisplayLabel({ product: '1200x382x12', nanUse: 'Ván', unit: 'Thanh' }) === 'Thanh 1200x382x12');
check('rateDisplayLabel: Bullig LUÔN là "Bullig <kích thước>" (dù ĐVT Thanh)',
  planning.rateDisplayLabel({ product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh' }) === 'Bullig 1250x80x12');
check('rateDisplayLabel: dữ liệu cũ đã có tiền tố (không lặp tiền tố)',
  planning.rateDisplayLabel({ product: 'Ván 1200x382x9' }) === 'Ván 1200x382x9');
check('rateDisplayLabel: dữ liệu cũ Bullig',
  planning.rateDisplayLabel({ product: 'Bullig 1250x80x12' }) === 'Bullig 1250x80x12');
check('rateDisplayLabel: không có định mức -> "Sản phẩm đã xóa"',
  planning.rateDisplayLabel(null) === 'Sản phẩm đã xóa');

// ─── B. CHUẨN HOÁ DỮ LIỆU CŨ ───────────────────────────────────
console.log('--- B. CHUẨN HOÁ ĐỊNH MỨC DỮ LIỆU CŨ ---');
const nv = planning.normalizeMaterialRate({ id: 'r1', product: 'Ván 1200x382x12' });
check('normalize: tách kích thước + điền nanUse/unit cho định mức Ván',
  nv.product === '1200x382x12' && nv.nanUse === 'Ván' && nv.unit === 'Tấm');
const nb = planning.normalizeMaterialRate({ id: 'r2', product: 'Bullig 1250x80x12' });
check('normalize: định mức Bullig -> nanUse Bullig + ĐVT Thanh',
  nb.product === '1250x80x12' && nb.nanUse === 'Bullig' && nb.unit === 'Thanh');
const nk = planning.normalizeMaterialRate({ id: 'r3', product: 'Ván ép 9mm' });
check('normalize: KHÔNG cắt tên thật khi sau tiền tố không phải kích thước',
  nk.product === 'Ván ép 9mm');
const np = planning.normalizeMaterialRate({ id: 'r4', product: '1200x382x12', nanUse: 'Bullig', unit: 'Thanh' });
check('normalize: dữ liệu mới giữ nguyên', np.product === '1200x382x12' && np.nanUse === 'Bullig' && np.unit === 'Thanh');

// ─── C. NGUỒN TÍNH KẾ HOẠCH DÙNG nanUse (KHÔNG cắt tên) ────────
console.log('--- C. ÁNH XẠ SỐ THANH ĐÃ ÉP THEO SỬ DỤNG NAN ---');
state.batches = [];
state.planningItems = [];
state.planningForecast = {};
state.planningStock = {};
state.qcExports = [];
state.materialRates = [
  // Tên chỉ còn kích thước + khai Sử Dụng Nan = Bullig (bản chất nguồn Ván)
  { id: 'rate-bl', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh', efficiency: 100, nan1: '1250×80×12', nan1Qty: 1, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0 }
];
state.pressRecords = [
  { date: '2026-08-10', week: '2026-W33', productId: 'rate-bl', fpDim: '1250x80x12', finishedQty: 100, sticks: [{ nanKey: '1250×80×12', sticks: '100' }], vanTho: [] }
];
const pressed = planning.getActualPressedByWeek(2026);
const pressedKey = '1250×80×12@Bullig';
check('Kế hoạch: số thanh đã ép gắn khóa @Bullig (theo nanUse, không theo tên)',
  !!(pressed[33] && pressed[33][pressedKey] === 100));
check('Kế hoạch: KHÔNG gắn khóa @Ván (tên sản phẩm không còn chữ "Bullig" để suy)',
  !(pressed[33] && pressed[33]['1250×80×12@Ván']));

// ─── D. FORM LƯU 2 TRƯỜNG MỚI ──────────────────────────────────
console.log('--- D. FORM THÊM ĐỊNH MỨC (Tên SP = kích thước) ---');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.materialRates = [];
setVal('mat-rate-id', '');
setVal('mat-rate-product', '1200x382x12');
setVal('mat-rate-nan-use', 'Bullig');
setVal('mat-rate-unit', 'Thanh');
setVal('mat-rate-code', 'BL12');
setVal('mat-rate-fullname', 'Bullig thử');
setVal('mat-rate-press-type', '');
setVal('mat-rate-nan1', '1250×80×12');
setVal('mat-rate-nan1-qty', '6');
setVal('mat-rate-nan2', ''); setVal('mat-rate-nan2-qty', '');
setVal('mat-rate-nan3', ''); setVal('mat-rate-nan3-qty', '');
setVal('mat-rate-glue', '1');
setVal('mat-rate-additive', '0.1');
setVal('mat-rate-efficiency', '70');
try { planning.handleMaterialRateSubmit(ev); } catch (e) { /* renderPlanningView nặng — đã bọc */ }
const saved = state.materialRates[0];
check('Form: lưu sản phẩm mới với product = KÍCH THƯỚC', !!saved && saved.product === '1200x382x12');
check('Form: lưu ĐÚNG nanUse = Bullig', !!saved && saved.nanUse === 'Bullig');
check('Form: lưu ĐÚNG unit = Thanh', !!saved && saved.unit === 'Thanh');
check('Form: nhãn hiển thị của định mức vừa lưu là "Bullig 1200x382x12"',
  !!saved && planning.rateDisplayLabel(saved) === 'Bullig 1200x382x12');


// ─── E. BẢNG ĐỊNH MỨC CÓ 2 CỘT MỚI ─────────────────────────────
console.log('--- E. BẢNG ĐỊNH MỨC: CỘT SỬ DỤNG NAN + ĐVT ---');
state.materialRates = [
  { id: 'rate-v', product: '1200x382x12', nanUse: 'Ván', unit: 'Tấm', nan1: '1250×18×7', nan1Qty: 6, glue: 1, additive: 0.1, efficiency: 70 },
  { id: 'rate-b', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh', nan1: '1250×80×12', nan1Qty: 6, glue: 1, additive: 0.1, efficiency: 70 }
];
const created = [];
const origCreate = document.createElement;
document.createElement = (tag) => { const e = origCreate(tag); created.push(e); return e; };
try { planning.renderMaterialRatesTable(); } catch (e) { /* nuốt lỗi render khác */ }
document.createElement = origCreate;
const trs = created.filter(e => e._tag === 'tr');
check('Bảng: tạo 1 dòng cho mỗi định mức (2 dòng)', trs.length === 2);
const rowV = (trs[0] && trs[0].innerHTML) || '';
const rowB = (trs[1] && trs[1].innerHTML) || '';
check('Bảng: dòng Ván có chip Sử Dụng Nan "Ván" + ĐVT "Tấm"',
  rowV.includes('rate-use-tag') && rowV.includes('rate-use-van') && rowV.includes('Ván') && rowV.includes('rate-unit-tag') && rowV.includes('Tấm'));
check('Bảng: dòng Bullig có chip "Bullig" (rate-use-bullig) + ĐVT "Thanh"',
  rowB.includes('rate-use-bullig') && rowB.includes('Bullig') && rowB.includes('Thanh'));

// ─── F. BIỂU ĐỒ KẾ HOẠCH vs ĐÃ ÉP: NHÃN + NHÓM TOTAL ───────────
console.log('--- F. BIỂU ĐỒ: NHÃN THEO ĐVT + NHÓM BULLIG Ở TOTAL ---');
state.materialRates = [
  { id: 'rate-van',   product: '1200x382x12', nanUse: 'Ván',    unit: 'Tấm' },
  { id: 'rate-thanh', product: '1200x382x12', nanUse: 'Ván',    unit: 'Thanh' },
  { id: 'rate-bl',    product: '1250x80x12',  nanUse: 'Bullig', unit: 'Thanh' }
];
state.planningItems = [
  { year: 2026, week: 'Tuần 33', productId: 'rate-van',   qty: 300 },
  { year: 2026, week: 'Tuần 33', productId: 'rate-thanh', qty: 200 },
  { year: 2026, week: 'Tuần 33', productId: 'rate-bl',    qty: 100 }
];
state.qcExports = [];
state.pressRecords = [];
state.pvChartMode = 'plan';
state.planVsPressYear = '2026';
state.planVsPressWeek = 33;

state.planVsPressTotal = false;
press.renderPlanVsPressChart();
const chart = state.planVsPressInstance;
check('Biểu đồ (thường): nhãn Tấm -> "Ván 1200x382x12"',
  !!chart && chart.data.labels.includes('Ván 1200x382x12'));
check('Biểu đồ (thường): nhãn Thanh -> "Thanh 1200x382x12"',
  !!chart && chart.data.labels.includes('Thanh 1200x382x12'));
check('Biểu đồ (thường): Bullig -> "Bullig 1250x80x12" (luôn hiện Bullig)',
  !!chart && chart.data.labels.includes('Bullig 1250x80x12'));
check('Biểu đồ (thường): KHÔNG có nhãn "Thanh 1250x80x12" cho Bullig',
  !!chart && !chart.data.labels.includes('Thanh 1250x80x12'));

state.planVsPressTotal = true;
press.renderPlanVsPressChart();
const chartT = state.planVsPressInstance;
const lbls = (chartT && chartT.data.labels) || [];
check('Biểu đồ (Total): gộp 3 nhóm đúng thứ tự Bullig · Ván · Thanh',
  lbls.length === 3 && lbls[0] === 'Bullig' && lbls[1] === 'Ván' && lbls[2] === 'Thanh');
check('Biểu đồ (Total): cột Kế Hoạch nhóm Ván = 300 tấm (chỉ sản phẩm ĐVT Tấm)',
  approx(chartT.data.datasets[0].data[1], 300 * (1200 * 382 * 12 / 1e9)));
check('Biểu đồ (Total): cột Kế Hoạch nhóm Thanh = 200 tấm (rate-thanh)',
  approx(chartT.data.datasets[0].data[2], 200 * (1200 * 382 * 12 / 1e9)));
check('Biểu đồ (Total): cột Kế Hoạch nhóm Bullig = 100 tấm (rate-bl)',
  approx(chartT.data.datasets[0].data[0], 100 * (1250 * 80 * 12 / 1e9)));


// ─── G. CẤU TRÚC (index.html / js / sw.js) ─────────────────────
console.log('--- G. CẤU TRÚC ---');
const htmlSrc = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const jsPlan = fs.readFileSync(new URL('../js/planning.js', import.meta.url), 'utf8');
const jsPress = fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('index.html: bảng định mức có 2 cột mới "Sử Dụng Nan" + "ĐVT"',
  htmlSrc.includes('<th>Sử Dụng Nan</th>') && htmlSrc.includes('<th>ĐVT</th>'));
check('index.html: form có ô chọn #mat-rate-nan-use + #mat-rate-unit',
  htmlSrc.includes('id="mat-rate-nan-use"') && htmlSrc.includes('id="mat-rate-unit"'));
check('index.html: tiêu đề tên sản phẩm chỉ còn kích thước',
  htmlSrc.includes('Tên Sản Phẩm (Kích Thước)') && htmlSrc.includes('VD: 1200x382x12, 1250x80x12'));
check('js/planning.js: nguồn kế hoạch dùng rateNanUse (getUseForFromName chỉ còn 1 fallback)',
  (jsPlan.match(/getUseForFromName\(rate\.product\)/g) || []).length === 1 && (jsPlan.match(/rateNanUse\(rate\)/g) || []).length >= 4);
check('js/press.js: nhãn dùng rateDisplayLabel + nhóm Total dùng rateNanUse/rateUnit',
  jsPress.includes('rateDisplayLabel(rate)') && jsPress.includes("rateNanUse(rate) === 'Bullig'") && jsPress.includes("rateUnit(rate) === 'Thanh'"));
check("js/press.js: ĐÃ BỎ cách gộp Total theo tên (nm.includes('bullig'))",
  !jsPress.includes("nm.includes('bullig')"));
check('sw.js: đã tăng CACHE_NAME v191', /nha-may-ngoc-son-v191/.test(swSrc));

// ─── H. NHẬN DIỆN BULLIG THEO "Sử Dụng Nan" (tên chỉ còn kích thước) ──────
console.log('--- H. NHẬN DIỆN BULLIG KHÔNG DÙNG TÊN ---');
const xuong2 = await import('../js/xuong2.js');
state.materialRates = [
  { id: 'rate-dim', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh', efficiency: 100, nan1: '1250×80×12', nan1Qty: 1 / 6, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0 }
];
check('LINK ĐÃ ÉP: bulligPlanProductId khớp định mức theo nanUse (tên chỉ kích thước)',
  press.bulligPlanProductId('1250×80×12') === 'rate-dim' && press.bulligPlanProductId('999×99×99') === '');
const conv = xuong2.bulligConvertInfo('1250×80×12');
check('HỆ SỐ QUY ĐỔI: bulligConvertInfo nhận định mức Bullig theo nanUse (1 thô = 6 thanh)',
  conv.hasRate && conv.matched && approx(conv.factor, 6));

console.log(`\nKẾT QUẢ: ${passed} pass, ${failed} fail`);
if (failed > 0) process.exit(1);

