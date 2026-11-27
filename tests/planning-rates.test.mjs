// tests/planning-rates.test.mjs â€” Äá»‹nh má»©c nguyÃªn váº­t liá»‡u: "Sá»­ Dá»¥ng Nan" +
// "ÄVT" + nhÃ£n sáº£n pháº©m trÃªn biá»ƒu Ä‘á»“ Káº¿ Hoáº¡ch vs ÄÃ£ Ã‰p (tab Dashboard).
// Bao phá»§: helpers (rateNanUse/rateUnit/rateDisplayLabel/normalizeMaterialRate),
// form lÆ°u 2 trÆ°á»ng má»›i (tÃªn SP chá»‰ cÃ²n kÃ­ch thÆ°á»›c), báº£ng cÃ³ 2 cá»™t má»›i, nguá»“n
// tÃ­nh káº¿ hoáº¡ch dÃ¹ng nanUse thay vÃ¬ cáº¯t tÃªn, nhÃ£n biá»ƒu Ä‘á»“ theo ÄVT vÃ  nhÃ³m Total.
'use strict';

import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng qc.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ IMPORT MODULES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { state } = await import('../js/state.js');
const planning = await import('../js/planning.js');
const press = await import('../js/press.js');

const ev = { preventDefault(){} };
function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }

// â”€â”€â”€ A. HELPERS: rateNanUse / rateUnit / rateDisplayLabel â”€â”€â”€â”€â”€â”€â”€
console.log('--- A. HÃ€M SUY Sá»¬ Dá»¤NG NAN / ÄVT / NHÃƒN Sáº¢N PHáº¨M ---');
check('rateNanUse: dá»¯ liá»‡u Má»šI láº¥y Ä‘Ãºng trÆ°á»ng nanUse (Bullig)',
  planning.rateNanUse({ product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh' }) === 'Bullig');
check('rateNanUse: dá»¯ liá»‡u CÅ¨ (khÃ´ng nanUse) suy tá»« tÃªn (VÃ¡n)',
  planning.rateNanUse({ product: 'VÃ¡n 1200x382x12' }) === 'VÃ¡n');
check('rateUnit: Æ°u tiÃªn trÆ°á»ng unit (Thanh)',
  planning.rateUnit({ product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Thanh' }) === 'Thanh');
check('rateUnit: Bullig khÃ´ng cÃ³ unit -> máº·c Ä‘á»‹nh Thanh',
  planning.rateUnit({ product: '1250x80x12', nanUse: 'Bullig' }) === 'Thanh');
check('rateUnit: VÃ¡n khÃ´ng cÃ³ unit -> máº·c Ä‘á»‹nh Táº¥m',
  planning.rateUnit({ product: '1200x382x12', nanUse: 'VÃ¡n' }) === 'Táº¥m');
check('rateDisplayLabel: ÄVT Táº¥m -> "VÃ¡n <kÃ­ch thÆ°á»›c>"',
  planning.rateDisplayLabel({ product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m' }) === 'VÃ¡n 1200x382x12');
check('rateDisplayLabel: ÄVT Thanh -> "Thanh <kÃ­ch thÆ°á»›c>"',
  planning.rateDisplayLabel({ product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Thanh' }) === 'Thanh 1200x382x12');
check('rateDisplayLabel: Bullig LUÃ”N lÃ  "Bullig <kÃ­ch thÆ°á»›c>" (dÃ¹ ÄVT Thanh)',
  planning.rateDisplayLabel({ product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh' }) === 'Bullig 1250x80x12');
check('rateDisplayLabel: dá»¯ liá»‡u cÅ© Ä‘Ã£ cÃ³ tiá»n tá»‘ (khÃ´ng láº·p tiá»n tá»‘)',
  planning.rateDisplayLabel({ product: 'VÃ¡n 1200x382x9' }) === 'VÃ¡n 1200x382x9');
check('rateDisplayLabel: dá»¯ liá»‡u cÅ© Bullig',
  planning.rateDisplayLabel({ product: 'Bullig 1250x80x12' }) === 'Bullig 1250x80x12');
check('rateDisplayLabel: khÃ´ng cÃ³ Ä‘á»‹nh má»©c -> "Sáº£n pháº©m Ä‘Ã£ xÃ³a"',
  planning.rateDisplayLabel(null) === 'Sáº£n pháº©m Ä‘Ã£ xÃ³a');

// â”€â”€â”€ B. CHUáº¨N HOÃ Dá»® LIá»†U CÅ¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- B. CHUáº¨N HOÃ Äá»ŠNH Má»¨C Dá»® LIá»†U CÅ¨ ---');
const nv = planning.normalizeMaterialRate({ id: 'r1', product: 'VÃ¡n 1200x382x12' });
check('normalize: tÃ¡ch kÃ­ch thÆ°á»›c + Ä‘iá»n nanUse/unit cho Ä‘á»‹nh má»©c VÃ¡n',
  nv.product === '1200x382x12' && nv.nanUse === 'VÃ¡n' && nv.unit === 'Táº¥m');
const nb = planning.normalizeMaterialRate({ id: 'r2', product: 'Bullig 1250x80x12' });
check('normalize: Ä‘á»‹nh má»©c Bullig -> nanUse Bullig + ÄVT Thanh',
  nb.product === '1250x80x12' && nb.nanUse === 'Bullig' && nb.unit === 'Thanh');
const nk = planning.normalizeMaterialRate({ id: 'r3', product: 'VÃ¡n Ã©p 9mm' });
check('normalize: KHÃ”NG cáº¯t tÃªn tháº­t khi sau tiá»n tá»‘ khÃ´ng pháº£i kÃ­ch thÆ°á»›c',
  nk.product === 'VÃ¡n Ã©p 9mm');
const np = planning.normalizeMaterialRate({ id: 'r4', product: '1200x382x12', nanUse: 'Bullig', unit: 'Thanh' });
check('normalize: dá»¯ liá»‡u má»›i giá»¯ nguyÃªn', np.product === '1200x382x12' && np.nanUse === 'Bullig' && np.unit === 'Thanh');

// â”€â”€â”€ C. NGUá»’N TÃNH Káº¾ HOáº CH DÃ™NG nanUse (KHÃ”NG cáº¯t tÃªn) â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- C. ÃNH Xáº  Sá» THANH ÄÃƒ Ã‰P THEO Sá»¬ Dá»¤NG NAN ---');
state.batches = [];
state.planningItems = [];
state.planningForecast = {};
state.planningStock = {};
state.qcExports = [];
state.materialRates = [
  // TÃªn chá»‰ cÃ²n kÃ­ch thÆ°á»›c + khai Sá»­ Dá»¥ng Nan = Bullig (báº£n cháº¥t nguá»“n VÃ¡n)
  { id: 'rate-bl', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh', efficiency: 100, nan1: '1250Ã—80Ã—12', nan1Qty: 1, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0 }
];
state.pressRecords = [
  { date: '2026-08-10', week: '2026-W33', productId: 'rate-bl', fpDim: '1250x80x12', finishedQty: 100, sticks: [{ nanKey: '1250Ã—80Ã—12', sticks: '100' }], vanTho: [] }
];
const pressed = planning.getActualPressedByWeek(2026);
const pressedKey = '1250Ã—80Ã—12@Bullig';
check('Káº¿ hoáº¡ch: sá»‘ thanh Ä‘Ã£ Ã©p gáº¯n khÃ³a @Bullig (theo nanUse, khÃ´ng theo tÃªn)',
  !!(pressed[33] && pressed[33][pressedKey] === 100));
check('Káº¿ hoáº¡ch: KHÃ”NG gáº¯n khÃ³a @VÃ¡n (tÃªn sáº£n pháº©m khÃ´ng cÃ²n chá»¯ "Bullig" Ä‘á»ƒ suy)',
  !(pressed[33] && pressed[33]['1250Ã—80Ã—12@VÃ¡n']));

// â”€â”€â”€ D. FORM LÆ¯U 2 TRÆ¯á»œNG Má»šI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- D. FORM THÃŠM Äá»ŠNH Má»¨C (TÃªn SP = kÃ­ch thÆ°á»›c) ---');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.materialRates = [];
setVal('mat-rate-id', '');
setVal('mat-rate-product', '1200x382x12');
setVal('mat-rate-nan-use', 'Bullig');
setVal('mat-rate-unit', 'Thanh');
setVal('mat-rate-code', 'BL12');
setVal('mat-rate-fullname', 'Bullig thá»­');
setVal('mat-rate-press-type', '');
setVal('mat-rate-nan1', '1250Ã—80Ã—12');
setVal('mat-rate-nan1-qty', '6');
setVal('mat-rate-nan2', ''); setVal('mat-rate-nan2-qty', '');
setVal('mat-rate-nan3', ''); setVal('mat-rate-nan3-qty', '');
setVal('mat-rate-glue', '1');
setVal('mat-rate-additive', '0.1');
setVal('mat-rate-efficiency', '70');
try { planning.handleMaterialRateSubmit(ev); } catch (e) { /* renderPlanningView náº·ng â€” Ä‘Ã£ bá»c */ }
const saved = state.materialRates[0];
check('Form: lÆ°u sáº£n pháº©m má»›i vá»›i product = KÃCH THÆ¯á»šC', !!saved && saved.product === '1200x382x12');
check('Form: lÆ°u ÄÃšNG nanUse = Bullig', !!saved && saved.nanUse === 'Bullig');
check('Form: lÆ°u ÄÃšNG unit = Thanh', !!saved && saved.unit === 'Thanh');
check('Form: nhÃ£n hiá»ƒn thá»‹ cá»§a Ä‘á»‹nh má»©c vá»«a lÆ°u lÃ  "Bullig 1200x382x12"',
  !!saved && planning.rateDisplayLabel(saved) === 'Bullig 1200x382x12');


// â”€â”€â”€ E. Báº¢NG Äá»ŠNH Má»¨C CÃ“ 2 Cá»˜T Má»šI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- E. Báº¢NG Äá»ŠNH Má»¨C: Cá»˜T Sá»¬ Dá»¤NG NAN + ÄVT ---');
state.materialRates = [
  { id: 'rate-v', product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m', nan1: '1250Ã—18Ã—7', nan1Qty: 6, glue: 1, additive: 0.1, efficiency: 70 },
  { id: 'rate-b', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh', nan1: '1250Ã—80Ã—12', nan1Qty: 6, glue: 1, additive: 0.1, efficiency: 70 }
];
const created = [];
const origCreate = document.createElement;
document.createElement = (tag) => { const e = origCreate(tag); created.push(e); return e; };
try { planning.renderMaterialRatesTable(); } catch (e) { /* nuá»‘t lá»—i render khÃ¡c */ }
document.createElement = origCreate;
const trs = created.filter(e => e._tag === 'tr');
check('Báº£ng: táº¡o 1 dÃ²ng cho má»—i Ä‘á»‹nh má»©c (2 dÃ²ng)', trs.length === 2);
const rowV = (trs[0] && trs[0].innerHTML) || '';
const rowB = (trs[1] && trs[1].innerHTML) || '';
check('Báº£ng: dÃ²ng VÃ¡n cÃ³ chip Sá»­ Dá»¥ng Nan "VÃ¡n" + ÄVT "Táº¥m"',
  rowV.includes('rate-use-tag') && rowV.includes('rate-use-van') && rowV.includes('VÃ¡n') && rowV.includes('rate-unit-tag') && rowV.includes('Táº¥m'));
check('Báº£ng: dÃ²ng Bullig cÃ³ chip "Bullig" (rate-use-bullig) + ÄVT "Thanh"',
  rowB.includes('rate-use-bullig') && rowB.includes('Bullig') && rowB.includes('Thanh'));

// â”€â”€â”€ F. BIá»‚U Äá»’ Káº¾ HOáº CH vs ÄÃƒ Ã‰P: NHÃƒN + NHÃ“M TOTAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- F. BIá»‚U Äá»’: NHÃƒN THEO ÄVT + NHÃ“M BULLIG á»ž TOTAL ---');
state.materialRates = [
  { id: 'rate-van',   product: '1200x382x12', nanUse: 'VÃ¡n',    unit: 'Táº¥m' },
  { id: 'rate-thanh', product: '1200x382x12', nanUse: 'VÃ¡n',    unit: 'Thanh' },
  { id: 'rate-bl',    product: '1250x80x12',  nanUse: 'Bullig', unit: 'Thanh' }
];
state.planningItems = [
  { year: 2026, week: 'Tuáº§n 33', productId: 'rate-van',   qty: 300 },
  { year: 2026, week: 'Tuáº§n 33', productId: 'rate-thanh', qty: 200 },
  { year: 2026, week: 'Tuáº§n 33', productId: 'rate-bl',    qty: 100 }
];
state.qcExports = [];
state.pressRecords = [];
state.pvChartMode = 'plan';
state.planVsPressYear = '2026';
state.planVsPressWeek = 33;

state.planVsPressTotal = false;
press.renderPlanVsPressChart();
const chart = state.planVsPressInstance;
check('Biá»ƒu Ä‘á»“ (thÆ°á»ng): nhÃ£n Táº¥m -> "VÃ¡n 1200x382x12"',
  !!chart && chart.data.labels.includes('VÃ¡n 1200x382x12'));
check('Biá»ƒu Ä‘á»“ (thÆ°á»ng): nhÃ£n Thanh -> "Thanh 1200x382x12"',
  !!chart && chart.data.labels.includes('Thanh 1200x382x12'));
check('Biá»ƒu Ä‘á»“ (thÆ°á»ng): Bullig -> "Bullig 1250x80x12" (luÃ´n hiá»‡n Bullig)',
  !!chart && chart.data.labels.includes('Bullig 1250x80x12'));
check('Biá»ƒu Ä‘á»“ (thÆ°á»ng): KHÃ”NG cÃ³ nhÃ£n "Thanh 1250x80x12" cho Bullig',
  !!chart && !chart.data.labels.includes('Thanh 1250x80x12'));

state.planVsPressTotal = true;
press.renderPlanVsPressChart();
const chartT = state.planVsPressInstance;
const lbls = (chartT && chartT.data.labels) || [];
check('Biá»ƒu Ä‘á»“ (Total): gá»™p 3 nhÃ³m Ä‘Ãºng thá»© tá»± Bullig Â· VÃ¡n Â· Thanh',
  lbls.length === 3 && lbls[0] === 'Bullig' && lbls[1] === 'VÃ¡n' && lbls[2] === 'Thanh');
check('Biá»ƒu Ä‘á»“ (Total): cá»™t Káº¿ Hoáº¡ch nhÃ³m VÃ¡n = 300 táº¥m (chá»‰ sáº£n pháº©m ÄVT Táº¥m)',
  approx(chartT.data.datasets[0].data[1], 300 * (1200 * 382 * 12 / 1e9)));
check('Biá»ƒu Ä‘á»“ (Total): cá»™t Káº¿ Hoáº¡ch nhÃ³m Thanh = 200 táº¥m (rate-thanh)',
  approx(chartT.data.datasets[0].data[2], 200 * (1200 * 382 * 12 / 1e9)));
check('Biá»ƒu Ä‘á»“ (Total): cá»™t Káº¿ Hoáº¡ch nhÃ³m Bullig = 100 táº¥m (rate-bl)',
  approx(chartT.data.datasets[0].data[0], 100 * (1250 * 80 * 12 / 1e9)));


// â”€â”€â”€ G. Cáº¤U TRÃšC (index.html / js / sw.js) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('--- G. Cáº¤U TRÃšC ---');
const htmlSrc = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const jsPlan = fs.readFileSync(new URL('../js/planning.js', import.meta.url), 'utf8');
const jsPress = fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('index.html: báº£ng Ä‘á»‹nh má»©c cÃ³ 2 cá»™t má»›i "Sá»­ Dá»¥ng Nan" + "ÄVT"',
  htmlSrc.includes('<th>Sá»­ Dá»¥ng Nan</th>') && htmlSrc.includes('<th>ÄVT</th>'));
check('index.html: form cÃ³ Ã´ chá»n #mat-rate-nan-use + #mat-rate-unit',
  htmlSrc.includes('id="mat-rate-nan-use"') && htmlSrc.includes('id="mat-rate-unit"'));
check('index.html: tiÃªu Ä‘á» tÃªn sáº£n pháº©m chá»‰ cÃ²n kÃ­ch thÆ°á»›c',
  htmlSrc.includes('TÃªn Sáº£n Pháº©m (KÃ­ch ThÆ°á»›c)') && htmlSrc.includes('VD: 1200x382x12, 1250x80x12'));
check('js/planning.js: nguá»“n káº¿ hoáº¡ch dÃ¹ng rateNanUse (getUseForFromName chá»‰ cÃ²n 1 fallback)',
  (jsPlan.match(/getUseForFromName\(rate\.product\)/g) || []).length === 1 && (jsPlan.match(/rateNanUse\(rate\)/g) || []).length >= 4);
check('js/press.js: nhÃ£n dÃ¹ng rateDisplayLabel + nhÃ³m Total dÃ¹ng rateNanUse/rateUnit',
  jsPress.includes('rateDisplayLabel(rate)') && jsPress.includes("rateNanUse(rate) === 'Bullig'") && jsPress.includes("rateUnit(rate) === 'Thanh'"));
check("js/press.js: ÄÃƒ Bá»Ž cÃ¡ch gá»™p Total theo tÃªn (nm.includes('bullig'))",
  !jsPress.includes("nm.includes('bullig')"));
check('sw.js: Ä‘Ã£ tÄƒng CACHE_NAME v486', /nha-may-ngoc-son-v486/.test(swSrc));

// â”€â”€â”€ H. NHáº¬N DIá»†N BULLIG THEO "Sá»­ Dá»¥ng Nan" (tÃªn chá»‰ cÃ²n kÃ­ch thÆ°á»›c) â”€â”€â”€â”€â”€â”€
console.log('--- H. NHáº¬N DIá»†N BULLIG KHÃ”NG DÃ™NG TÃŠN ---');
const xuong2 = await import('../js/xuong2.js');
state.materialRates = [
  { id: 'rate-dim', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh', efficiency: 100, nan1: '1250Ã—80Ã—12', nan1Qty: 1 / 6, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0 }
];
check('LINK ÄÃƒ Ã‰P: bulligPlanProductId khá»›p Ä‘á»‹nh má»©c theo nanUse (tÃªn chá»‰ kÃ­ch thÆ°á»›c)',
  press.bulligPlanProductId('1250Ã—80Ã—12') === 'rate-dim' && press.bulligPlanProductId('999Ã—99Ã—99') === '');
const conv = xuong2.bulligConvertInfo('1250Ã—80Ã—12');
check('Há»† Sá» QUY Äá»”I: bulligConvertInfo nháº­n Ä‘á»‹nh má»©c Bullig theo nanUse (1 thÃ´ = 6 thanh)',
  conv.hasRate && conv.matched && approx(conv.factor, 6));

console.log(`\nKáº¾T QUáº¢: ${passed} pass, ${failed} fail`);
if (failed > 0) process.exit(1);

