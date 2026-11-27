// tests/materials.test.mjs â€” Kiá»ƒm thá»­ tab NHáº¬P NGUYÃŠN LIá»†U (materials)
// Bao phá»§: tuáº§n ISO, nhÃ£n vá»‹ trÃ­, nÃ©n áº£nh, lÆ°u form (trá»ng lÆ°á»£ng = Ä‘áº§u vÃ o âˆ’ Ä‘áº§u ra),
// cháº·n dá»¯ liá»‡u khÃ´ng há»£p lá»‡, sá»­a/xÃ³a, lÆ°u/náº¡p localStorage, engine biá»ƒu Ä‘á»“ nguá»“n 'materials',
// cháº¿ Ä‘á»™ Tá»•ng Nháº­p Mua chia theo vá»‹ trÃ­ nháº­p (Tuáº§n/ThÃ¡ng/NÄƒm).
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng chart-filters.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    // Canvas 2D stub: dÃ¹ng cho compressImageFile (nÃ©n áº£nh) â€” Ä‘á»§ cáº£ cho Chart.js náº¿u cáº§n
    getContext: () => ({
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop(){} }),
      createRadialGradient: () => ({ addColorStop(){} }),
      drawImage(){}
    }),
    // API canvas element tháº­t: canvas.toDataURL(...) gá»i trÃªn chÃ­nh element
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
// FileReader stub: gá»i onload ngay vá»›i káº¿t quáº£ giáº£
global.FileReader = class {
  readAsDataURL() { this.result = 'data:image/jpeg;base64,FAKE'; setTimeout(() => this.onload && this.onload({ target: this }), 0); }
  readAsText() { this.result = '[]'; setTimeout(() => this.onload && this.onload({ target: this }), 0); }
};
// Image stub: kÃ­ch hoáº¡t onload ngay khi gÃ¡n src, kÃ­ch thÆ°á»›c giáº£ 1200x900
global.Image = class {
  constructor() { this.width = 1200; this.height = 900; }
  set src(_) { setTimeout(() => this.onload && this.onload(), 0); }
};

global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
global.lucide = { createIcons(){} };
global.XLSX = { utils: { book_new: () => ({}), aoa_to_sheet: () => ({}), book_append_sheet(){} }, writeFile(){}, write: () => new ArrayBuffer(8) };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// â”€â”€â”€ IMPORT MODULES (sau khi stub xong) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { state, STORAGE_KEY_MATERIALS } = await import('../js/state.js');
const mat = await import('../js/materials.js');
const xlsx = await import('../js/export-xlsx.js');
const dash = await import('../js/dashboard.js');

// ÄÄƒng nháº­p giáº£ vá»›i quyá»n admin Ä‘á»ƒ qua cÃ¡c bÆ°á»›c yÃªu cáº§u quyá»n sá»­a
state.currentUser = { username: 'admin', role: 'admin', editTabs: ['kanban', 'planning', 'press', 'materials', 'dashboard'], allowAdvanced: true };

console.log('--- TUáº¦N ISO & NHÃƒN Vá»Š TRÃ ---');
check('Tuáº§n ISO: 2026-08-10 (T2) â†’ 2026-W33', mat.materialWeekLabel('2026-08-10') === '2026-W33');
check('Tuáº§n ISO: 2026-01-01 (T5) â†’ 2026-W01', mat.materialWeekLabel('2026-01-01') === '2026-W01');
check('Tuáº§n ISO: 2024-12-30 (T2) â†’ 2025-W01 (váº¯t nÄƒm)', mat.materialWeekLabel('2024-12-30') === '2025-W01');
check('NhÃ£n tuáº§n thÃ¢n thiá»‡n: 2026-W33 â†’ "Tuáº§n 33 (2026)"', mat.friendlyMaterialWeek('2026-W33') === 'Tuáº§n 33 (2026)');
check('NhÃ£n vá»‹ trÃ­: lo-hoi â†’ LÃ² hÆ¡i', mat.materialLocationLabel('lo-hoi') === 'LÃ² hÆ¡i');
check('NhÃ£n vá»‹ trÃ­: xuong-2 â†’ XÆ°á»Ÿng 2', mat.materialLocationLabel('xuong-2') === 'XÆ°á»Ÿng 2');
check('NhÃ£n vá»‹ trÃ­ láº¡ â†’ giá»¯ nguyÃªn giÃ¡ trá»‹', mat.materialLocationLabel('kho-3') === 'kho-3');
check('Äá»§ 3 vá»‹ trÃ­ nháº­p: LÃ² hÆ¡i, XÆ°á»Ÿng 1, XÆ°á»Ÿng 2',
  mat.MATERIAL_LOCATIONS.length === 3 &&
  mat.MATERIAL_LOCATIONS.map(l => l.label).join('|') === 'LÃ² hÆ¡i|XÆ°á»Ÿng 1|XÆ°á»Ÿng 2');

console.log('--- NÃ‰N áº¢NH ---');
const dataUrl = await mat.compressImageFile({ type: 'image/png' });
check('NÃ©n áº£nh: tráº£ vá» dataURL JPEG tá»« canvas', dataUrl === 'data:image/jpeg;base64,CANVASOK');

// â”€â”€â”€ NHáº¬P FORM (trá»ng lÆ°á»£ng = Ä‘áº§u vÃ o âˆ’ Ä‘áº§u ra) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setFormFields(v) {
  document.getElementById('material-date').value     = v.date;
  document.getElementById('material-type').value     = v.type;
  document.getElementById('material-supplier').value = v.supplier;
  document.getElementById('material-location').value = v.location;
  document.getElementById('material-input').value    = v.input;
  document.getElementById('material-output').value   = v.output;
  document.getElementById('material-unit-price').value = (v.unitPrice === undefined || v.unitPrice === null) ? '' : v.unitPrice;
  document.getElementById('material-note').value     = v.note || '';
}


console.log('--- NHáº¬P FORM (trá»ng lÆ°á»£ng = Ä‘áº§u vÃ o âˆ’ Ä‘áº§u ra) ---');
setFormFields({ date: '2026-08-10', type: 'Tre nguyÃªn liá»‡u', supplier: 'NCC A', location: 'lo-hoi', input: 500, output: 120 });
state.materialFormImages = ['data:image/jpeg;base64,IMG1'];
mat.handleMaterialSubmit({ preventDefault(){} });
check('Nháº­p: thÃªm Ä‘Ãºng 1 báº£n ghi', state.materialRecords.length === 1);
check('Nháº­p: trá»ng lÆ°á»£ng = 500 âˆ’ 120 = 380', state.materialRecords[0].weight === 380);
check('Nháº­p: tá»± tÃ­nh tuáº§n ISO 2026-W33', state.materialRecords[0].week === '2026-W33');
check('Nháº­p: giá»¯ hÃ¬nh áº£nh Ä‘Ã£ táº£i lÃªn', (state.materialRecords[0].images || []).length === 1);
check('Nháº­p: lÆ°u localStorage', !!localStorage.getItem('bamboo_tracker_material_records_v1'));
check('Nháº­p: sau submit modal Ä‘Ã³ng (editId = null)', state.materialEditId === null);
check('Nháº­p: khÃ´ng cÃ³ Ä‘Æ¡n giÃ¡ â†’ thÃ nh tiá»n = 0', (state.materialRecords[0].totalAmount || 0) === 0);

console.log('--- VALIDATION ---');
setFormFields({ date: '', type: 'X', supplier: '', location: 'lo-hoi', input: 1, output: 0 });
mat.handleMaterialSubmit({ preventDefault(){} });
check('Cháº·n: thiáº¿u ngÃ y â†’ khÃ´ng thÃªm', state.materialRecords.length === 1);
setFormFields({ date: '2026-08-11', type: 'X', supplier: '', location: 'lo-hoi', input: 5, output: -1 });
mat.handleMaterialSubmit({ preventDefault(){} });
check('Cháº·n: Ä‘áº§u ra Ã¢m â†’ khÃ´ng thÃªm', state.materialRecords.length === 1);
setFormFields({ date: '2026-08-11', type: 'X', supplier: '', location: 'kho-a', input: 5, output: 1 });
mat.handleMaterialSubmit({ preventDefault(){} });
check('Cháº·n: vá»‹ trÃ­ khÃ´ng há»£p lá»‡ â†’ khÃ´ng thÃªm', state.materialRecords.length === 1);
setFormFields({ date: '2026-08-11', type: 'X', supplier: '', location: 'lo-hoi', input: 5, output: 1, unitPrice: -5 });
mat.handleMaterialSubmit({ preventDefault(){} });
check('Cháº·n: Ä‘Æ¡n giÃ¡ Ã¢m â†’ khÃ´ng thÃªm', state.materialRecords.length === 1);

console.log('--- Sá»¬A & XÃ“A ---');
const recId = state.materialRecords[0].id;
setFormFields({ date: '2026-08-10', type: 'Tre nguyÃªn liá»‡u', supplier: 'NCC A', location: 'lo-hoi', input: 600, output: 100, unitPrice: 2000 });
state.materialEditId = recId;
mat.handleMaterialSubmit({ preventDefault(){} });
check('Sá»­a: trá»ng lÆ°á»£ng cáº­p nháº­t 600 âˆ’ 100 = 500', state.materialRecords[0].weight === 500);
check('Sá»­a: lÆ°u Ä‘Æ¡n giÃ¡ 2.000 Ä‘/kg', state.materialRecords[0].unitPrice === 2000);
check('Sá»­a: thÃ nh tiá»n = 500 Ã— 2.000 = 1.000.000 Ä‘', state.materialRecords[0].totalAmount === 1000000);
check('Sá»­a: khÃ´ng nhÃ¢n báº£n báº£n ghi', state.materialRecords.length === 1);
mat.deleteMaterial(recId);
check('XÃ³a: báº£n ghi bá»‹ gá»¡ sau khi xÃ¡c nháº­n', state.materialRecords.length === 0);

console.log('--- LÆ¯U / Náº P QUA LOCALSTORAGE ---');
state.materialRecords = [{ id: 'm1', date: '2026-08-10', week: '2026-W33', type: 'Keo UF', supplier: 'NCC B', location: 'xuong-1', inputIndex: 300, outputIndex: 60, weight: 240 }];
mat.saveMaterialRecords();
state.materialRecords = [];
mat.loadMaterialRecords();
check('LÆ°u/Náº¡p: giá»¯ nguyÃªn dá»¯ liá»‡u', state.materialRecords.length === 1 && state.materialRecords[0].weight === 240);


console.log('--- ENGINE BIá»‚U Äá»’ (nguá»“n materials) ---');
state.materialRecords = [
  { id: 'm1', date: '2026-08-10', week: '2026-W33', type: 'Tre nguyÃªn liá»‡u', supplier: 'NCC A', location: 'lo-hoi',  inputIndex: 500, outputIndex: 120, weight: 380, unitPrice: 2000, totalAmount: 760000 },
  { id: 'm2', date: '2026-08-11', week: '2026-W33', type: 'DÄƒm tre',         supplier: 'NCC B', location: 'xuong-1', inputIndex: 360, outputIndex: 60,  weight: 300, unitPrice: 1500, totalAmount: 450000 },
  { id: 'm3', date: '2026-08-12', week: '2026-W33', type: 'Keo UF',          supplier: 'NCC A', location: 'lo-hoi',  inputIndex: 150, outputIndex: 60,  weight: 90,  unitPrice: 5000, totalAmount: 450000 },
  { id: 'm4', date: '2027-03-05', week: '2027-W10', type: 'Tre nguyÃªn liá»‡u', supplier: 'NCC C', location: 'xuong-2', inputIndex: 400, outputIndex: 100, weight: 300, unitPrice: 1800, totalAmount: 540000 }
];

const byLoc = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'location', metric: 'weight' });
const loHoiIdx = byLoc.labels.indexOf('LÃ² hÆ¡i');
check('BE: nhÃ³m theo vá»‹ trÃ­ cÃ³ nhÃ£n tiáº¿ng Viá»‡t "LÃ² hÆ¡i"', loHoiIdx >= 0);
check('BE: LÃ² hÆ¡i = 380 + 90 = 470 kg', byLoc.datasets[0].data[loHoiIdx] === 470);

const countChart = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'supplier', metric: 'recordCount' });
const nccAIdx = countChart.labels.indexOf('NCC A');
check('BE: Ä‘áº¿m sá»‘ láº§n nháº­p â€” NCC A = 2 lÆ°á»£t', nccAIdx >= 0 && countChart.datasets[0].data[nccAIdx] === 2);

const amountChart = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'location', metric: 'amount' });
const lhAmountIdx = amountChart.labels.indexOf('LÃ² hÆ¡i');
check('BE: thÃ nh tiá»n â€” LÃ² hÆ¡i = 760.000 + 450.000 = 1.210.000 Ä‘', amountChart.datasets[0].data[lhAmountIdx] === 1210000);
check('BE: nhÃ£n chá»‰ sá»‘ thÃ nh tiá»n "ThÃ nh Tiá»n (Ä‘)"', amountChart.datasets[0].label === 'ThÃ nh Tiá»n (Ä‘)');

const byWeek = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'week', metric: 'recordCount' });
check('BE: nhÃ£n tuáº§n thÃ¢n thiá»‡n "Tuáº§n 33 (2026)"', byWeek.labels.includes('Tuáº§n 33 (2026)'));

const locFiltered = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'type', metric: 'weight', location: 'lo-hoi' });
check('BE: lá»c vá»‹ trÃ­ LÃ² hÆ¡i â†’ tá»•ng 470', locFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 470);
const yearFiltered = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'type', metric: 'weight', year: '2026' });
check('BE: lá»c nÄƒm 2026 â†’ tá»•ng 770', yearFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 770);
const dateFiltered = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'type', metric: 'weight', dateFrom: '2026-08-11', dateTo: '2026-08-12' });
check('BE: lá»c khoáº£ng ngÃ y 11â€“12/8 â†’ tá»•ng 390', dateFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 390);
const typeFiltered = xlsx.computeChartData({ type: 'bar', source: 'materials', groupBy: 'location', metric: 'weight', matType: 'Tre nguyÃªn liá»‡u' });
check('BE: lá»c loáº¡i NL "Tre nguyÃªn liá»‡u" â†’ tá»•ng 680', typeFiltered.datasets[0].data.reduce((a, b) => a + b, 0) === 680);

const stacked = xlsx.computeChartData({ type: 'stackedBar', source: 'materials', groupBy: 'location', stackBy: 'type', metric: 'weight' });
check('BE: xáº¿p chá»“ng â€” 3 dataset theo loáº¡i NL', stacked.datasets.length === 3);
const lhIdx = stacked.labels.indexOf('LÃ² hÆ¡i');
const treDs = stacked.datasets.find(d => d.label === 'Tre nguyÃªn liá»‡u');
check('BE: xáº¿p chá»“ng â€” Tre @ LÃ² hÆ¡i = 380', !!treDs && treDs.data[lhIdx] === 380);

console.log('--- CHART BUILDER SCHEMA (nguá»“n materials) ---');
dash.populateBuilderOptions('materials');
check('Builder: nhÃ³m cÃ³ "NhÃ  Cung Cáº¥p"', /NhÃ  Cung Cáº¥p/.test(document.getElementById('builder-group-by').innerHTML));
check('Builder: chá»‰ sá»‘ cÃ³ "Trá»ng LÆ°á»£ng" & "ThÃ nh Tiá»n"', /Trá»ng LÆ°á»£ng/.test(document.getElementById('builder-metric').innerHTML) && /ThÃ nh Tiá»n/.test(document.getElementById('builder-metric').innerHTML));
check('Builder: bá»™ lá»c riÃªng cÃ³ "Vá»‹ TrÃ­ (DÃ¹ng Cho)"', /Vá»‹ TrÃ­ \(DÃ¹ng Cho\)/.test(document.getElementById('builder-filters-box').innerHTML));

console.log('--- Bá»˜ Lá»ŒC THá»œI GIAN THáºº KPI (Táº¥t Cáº£ / Tuáº§n / ThÃ¡ng / NÄƒm) ---');
// KPI so vá»›i NGÃ€Y HÃ”M NAY THá»°C â†’ Ä‘áº¿m ká»³ vá»ng má»™t cÃ¡ch Äá»˜NG Ä‘á»ƒ test
// khÃ´ng phá»¥ thuá»™c ngÃ y cháº¡y (hÃ m materialWeekLabel Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c minh Ä‘á»™c láº­p á»Ÿ trÃªn)
state.materialActiveLoc = 'all';
const todayStr = new Date().toISOString().split('T')[0];
const recs = state.materialRecords;
const sameWeek  = recs.filter(r => r.date && mat.materialWeekLabel(r.date) === mat.materialWeekLabel(todayStr)).length;
const sameMonth = recs.filter(r => (r.date || '').slice(0, 7) === todayStr.slice(0, 7)).length;
const sameYear  = recs.filter(r => (r.date || '').slice(0, 4) === todayStr.slice(0, 4)).length;

check('KPI: Ä‘á»§ 4 ká»³ (all/week/month/year)',
  mat.MATERIAL_KPI_PERIODS.length === 4 &&
  mat.MATERIAL_KPI_PERIODS.map(p => p.key).join('|') === 'all|week|month|year');

state.materialKpiPeriod = 'all';
check('KPI: Táº¥t Cáº£ â†’ toÃ n bá»™ báº£n ghi theo vá»‹ trÃ­', mat.kpiPeriodFilteredRecords().length === recs.length);
state.materialKpiPeriod = 'week';
check('KPI: Tuáº§n nÃ y khá»›p Ä‘áº¿m Ä‘á»™c láº­p theo tuáº§n ISO', mat.kpiPeriodFilteredRecords().length === sameWeek);
check('KPI: caption tuáº§n = "Tuáº§n N (YYYY)" cá»§a hÃ´m nay', mat.kpiPeriodCaption() === mat.friendlyMaterialWeek(mat.materialWeekLabel(todayStr)));
state.materialKpiPeriod = 'month';
check('KPI: ThÃ¡ng nÃ y khá»›p Ä‘áº¿m Ä‘á»™c láº­p theo YYYY-MM', mat.kpiPeriodFilteredRecords().length === sameMonth);
check('KPI: caption thÃ¡ng = "ThÃ¡ng M/YYYY"', mat.kpiPeriodCaption() === `ThÃ¡ng ${parseInt(todayStr.slice(5, 7), 10)}/${todayStr.slice(0, 4)}`);
state.materialKpiPeriod = 'year';
check('KPI: NÄƒm nÃ y khá»›p Ä‘áº¿m Ä‘á»™c láº­p theo YYYY', mat.kpiPeriodFilteredRecords().length === sameYear);
check('KPI: caption nÄƒm = "NÄƒm YYYY"', mat.kpiPeriodCaption() === `NÄƒm ${todayStr.slice(0, 4)}`);
state.materialKpiPeriod = 'all';
check('KPI: caption Táº¥t Cáº£ "ToÃ n bá»™ dá»¯ liá»‡u"', mat.kpiPeriodCaption() === 'ToÃ n bá»™ dá»¯ liá»‡u');

console.log('--- Gá»˜P Báº¢N GHI NGUYÃŠN LIá»†U (chá»‘ng máº¥t Ä‘Æ¡n giÃ¡ / áº£nh khi náº¡p file cÅ©) ---');
const { mergeMaterialRecords, restoreMaterialRecords } = await import('../js/storage.js');

// File cÅ© thiáº¿u updatedAt + thiáº¿u unitPrice (nhÆ° bamboo_data.json trÆ°á»›c khi sá»­a)
const oldFileRecord = { id: 'm1', date: '2026-08-28', type: 'Tre', location: 'lo-hoi', weight: 100, createdAt: '2026-08-31T11:48:11.513Z' };
// MÃ¡y cÃ³ báº£n Má»šI HÆ N: Ä‘Ã£ nháº­p Ä‘Æ¡n giÃ¡/thÃ nh tiá»n vÃ  sá»­a láº§n cuá»‘i sau createdAt cá»§a file
const localNewer = { id: 'm1', date: '2026-08-28', type: 'Tre', location: 'lo-hoi', weight: 100, unitPrice: 3500, totalAmount: 350000, images: ['data:image/jpeg;base64,A'], createdAt: oldFileRecord.createdAt, updatedAt: '2026-08-31T15:00:00.000Z' };
const merged1 = mergeMaterialRecords([localNewer], [oldFileRecord]);
check('Gá»™p: báº£n mÃ¡y Má»šI HÆ N (cÃ³ updatedAt) giá»¯ nguyÃªn Ä‘Æ¡n giÃ¡ + áº£nh', merged1.length === 1 && merged1[0].unitPrice === 3500 && merged1[0].images.length === 1);

// Báº£n trong file Má»šI HÆ N (Ä‘á»“ng bá»™ tá»« mÃ¡y khÃ¡c) â†’ tháº¯ng báº£n mÃ¡y
const fileNewer = { id: 'm1', date: '2026-08-28', type: 'Tre', location: 'xuong-1', weight: 120, unitPrice: 4000, totalAmount: 480000, images: ['data:image/jpeg;base64,B'], createdAt: '2026-08-31T11:48:11.513Z', updatedAt: '2026-09-01T08:00:00.000Z' };
const merged2 = mergeMaterialRecords([localNewer], [fileNewer]);
check('Gá»™p: báº£n nguá»“n ngoÃ i Má»šI HÆ N thÃ¬ tháº¯ng', merged2.length === 1 && merged2[0].totalAmount === 480000 && merged2[0].images[0].endsWith('B'));

// Báº£n chá»‰ cÃ³ á»Ÿ má»™t phÃ­a â†’ khÃ´ng bá»‹ xÃ³a
const onlyLocal = { id: 'm2', date: '2026-09-01', type: 'Keo UF', location: 'xuong-2', weight: 50, unitPrice: 12000, totalAmount: 600000, createdAt: '2026-09-01T02:00:00.000Z' };
const merged3 = mergeMaterialRecords([localNewer, onlyLocal], [oldFileRecord]);
check('Gá»™p: báº£n chá»‰ cÃ³ á»Ÿ mÃ¡y Ä‘Æ°á»£c giá»¯ láº¡i (khÃ´ng bá»‹ xÃ³a)', merged3.length === 2 && !!merged3.find(r => r.id === 'm2'));
const merged4 = mergeMaterialRecords([localNewer], [oldFileRecord, onlyLocal]);
check('Gá»™p: báº£n chá»‰ cÃ³ trong file/backup cÅ©ng Ä‘Æ°á»£c giá»¯ láº¡i', merged4.length === 2 && !!merged4.find(r => r.id === 'm2'));

// Dáº¥u thá»i gian báº±ng nhau / nguá»“n ngoÃ i thiáº¿u dáº¥u thá»i gian â†’ giá»¯ báº£n mÃ¡y
const sameStamp = { id: 'm1', date: '2026-08-28', type: 'Tre', location: 'lo-hoi', weight: 999, createdAt: oldFileRecord.createdAt };
const merged5 = mergeMaterialRecords([localNewer], [sameStamp]);
check('Gá»™p: dáº¥u thá»i gian báº±ng nhau â†’ giá»¯ báº£n mÃ¡y', merged5[0].weight === 100 && merged5[0].unitPrice === 3500);
const noStampIn = { id: 'm1', type: 'Tre', weight: 777 };
const merged6 = mergeMaterialRecords([localNewer], [noStampIn]);
check('Gá»™p: nguá»“n ngoÃ i thiáº¿u dáº¥u thá»i gian â†’ giá»¯ báº£n mÃ¡y', merged6[0].weight === 100);

// restoreMaterialRecords: gá»™p + ghi localStorage, KHÃ”NG Ä‘Ã¨ máº¥t báº£n mÃ¡y má»›i hÆ¡n
state.materialRecords = [localNewer];
restoreMaterialRecords([oldFileRecord]);
check('restoreMaterialRecords: gá»™p thay vÃ¬ ghi Ä‘Ã¨ â€” giá»¯ Ä‘Æ¡n giÃ¡/áº£nh cá»§a báº£n má»›i',
  state.materialRecords.length === 1 && state.materialRecords[0].unitPrice === 3500 && state.materialRecords[0].images.length === 1);
const storedAfter = JSON.parse(localStorage.getItem(STORAGE_KEY_MATERIALS));
check('restoreMaterialRecords: Ä‘Ã£ ghi danh sÃ¡ch gá»™p vÃ o localStorage', !!storedAfter && storedAfter.length === 1 && storedAfter[0].unitPrice === 3500);

console.log('--- áº¢NH 2 Cáº¤P (thumb inline + full ngoÃ i báº£n ghi) ---');
check('imgThumbSrc: chuá»—i dataURL cÅ© â†’ giá»¯ nguyÃªn', mat.imgThumbSrc('data:image/jpeg;base64,OLD') === 'data:image/jpeg;base64,OLD');
check('imgThumbSrc: entry {id, thumb} â†’ tráº£ thumb', mat.imgThumbSrc({ id: 'ph-1', thumb: 'data:image/jpeg;base64,T' }) === 'data:image/jpeg;base64,T');
check('imgThumbSrc: entry {full, thumb} (fallback) â†’ tráº£ thumb', mat.imgThumbSrc({ full: 'F', thumb: 'T' }) === 'T');
check('imgThumbSrc: entry chá»‰ cÃ³ full â†’ tráº£ full (khÃ´ng máº¥t áº£nh)', mat.imgThumbSrc({ full: 'F' }) === 'F');
check('imgThumbSrc: rá»—ng â†’ chuá»—i rá»—ng', mat.imgThumbSrc(undefined) === '');
check('imgFullSrcSync: entry {id, thumb} â†’ thumb (hiá»ƒn thá»‹ táº¡m trÆ°á»›c khi náº¡p full)', mat.imgFullSrcSync({ id: 'ph-1', thumb: 'T' }) === 'T');
check('imgPhotoId: chuá»—i legacy â†’ null', mat.imgPhotoId('data:image/jpeg;base64,X') === null);
check('imgPhotoId: entry {id, thumb} â†’ id', mat.imgPhotoId({ id: 'ph-9', thumb: '' }) === 'ph-9');
check('imgPhotoIds: chá»‰ láº¥y id cá»§a entry dáº¡ng má»›i', JSON.stringify(mat.imgPhotoIds(['data:a', { id: 'p1', thumb: '' }, 'data:b', { id: 'p2', thumb: '' }])) === '["p1","p2"]');

console.log('--- MIGRATE áº¢NH LEGACY (khÃ´ng cÃ³ IndexedDB â†’ khÃ´ng Ä‘Æ°á»£c máº¥t áº£nh) ---');
state.materialRecords.push({
  id: 'mat-legacy-1', date: '2026-08-30', week: mat.materialWeekLabel('2026-08-30'),
  type: 'Tre nguyÃªn liá»‡u', supplier: 'NCC L', location: 'xuong-1',
  inputIndex: 10, outputIndex: 2, weight: 8, unitPrice: 1000, totalAmount: 8000, note: '',
  images: ['data:image/jpeg;base64,LEGACY_A', 'data:image/jpeg;base64,LEGACY_B'],
  createdAt: new Date().toISOString()
});
await mat.migrateMaterialImages();
const legacyRec = state.materialRecords.find(r => r.id === 'mat-legacy-1');
check('Migrate: kho khÃ´ng kháº£ dá»¥ng â†’ áº£nh legacy giá»¯ nguyÃªn tuyá»‡t Ä‘á»‘i',
  legacyRec.images.length === 2 &&
  legacyRec.images[0] === 'data:image/jpeg;base64,LEGACY_A' &&
  legacyRec.images[1] === 'data:image/jpeg;base64,LEGACY_B');
check('Migrate: cÃ³ hÃ m vÃ  khÃ´ng nÃ©m lá»—i khi gá»i láº·p láº¡i', (await mat.migrateMaterialImages()) === undefined);

console.log('--- XÃ“A Báº¢N GHI CÃ“ áº¢NH (dá»n kho/file khÃ´ng lá»—i trong mÃ´i trÆ°á»ng tá»‘i giáº£n) ---');
const delBefore = state.materialRecords.length;
mat.deleteMaterial('mat-legacy-1');
check('XÃ³a: báº£n ghi bá»‹ gá»¡ khá»i danh sÃ¡ch', state.materialRecords.length === delBefore - 1);
check('XÃ³a: áº£nh dáº¡ng {id, thumb} khÃ´ng lÃ m Crash hÃ m xÃ³a', state.materialRecords.every(r => !!r.id));

// â”€â”€â”€ Dáº¢I HIGHLIGHT NGÃ€Y HÃ”M NAY (biá»ƒu Ä‘á»“ Káº¿ Hoáº¡ch vs Thá»±c Táº¿ NguyÃªn Liá»‡u) â”€â”€â”€
console.log('--- Dáº¢I HIGHLIGHT NGÃ€Y HÃ”M NAY ---');
// NgÃ y hÃ´m nay theo GIá»œ MÃY â€” cÃ¹ng cÃ¡ch tÃ­nh nhÆ° js/materials.js
const _now = new Date();
const TODAY = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

// Báº¯t láº¥y config biá»ƒu Ä‘á»“ do materials.js dá»±ng (Chart stub á»Ÿ trÃªn chá»‰ lÆ°u this.config)
const captured = [];
const BaseChart = global.Chart;
global.Chart = class extends BaseChart {
  constructor(ctx, cfg) { super(ctx, cfg); captured.push(cfg); }
};
state.materialPlanChartWeek = TODAY.slice(0, 7) + '-W01';
mat.renderMaterialPlanChart();
global.Chart = BaseChart;

const cfgChart = captured[captured.length - 1];
const bandOpts = cfgChart && cfgChart.options && cfgChart.options.plugins && cfgChart.options.plugins.mpAxisBands;
const bandPlugin = cfgChart && (cfgChart.plugins || []).find(p => p && p.id === 'mpAxisBands');
check('Biá»ƒu Ä‘á»“ NL: cÃ³ truyá»n todayIso cho dáº£i ngÃ y (theo giá» mÃ¡y)', !!bandOpts && bandOpts.todayIso === TODAY);
check('Biá»ƒu Ä‘á»“ NL: plugin mpAxisBands cÃ³ hook beforeDatasetsDraw (dáº£i náº±m DÆ¯á»šI cá»™t)',
  !!bandPlugin && typeof bandPlugin.beforeDatasetsDraw === 'function');
check('Biá»ƒu Ä‘á»“ NL: váº«n giá»¯ hook afterDraw (nhÃ£n ngÃ y + dáº£i tuáº§n + chip)',
  !!bandPlugin && typeof bandPlugin.afterDraw === 'function');

// Chart giáº£ Ä‘á»ƒ soi nÃ©t váº½ cá»§a plugin
function fakeBandChart() {
  const calls = [];
  const ctx = {
    calls,
    fillStyle: '', strokeStyle: '', font: '', lineWidth: 1, textAlign: '', textBaseline: '',
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, setLineDash() {},
    roundRect() {}, rect() {}, fill() { calls.push('fill'); },
    fillRect() { calls.push('fillRect'); },
    fillText(t) { calls.push('text:' + t); },
    measureText: () => ({ width: 40 })
  };
  return {
    ctx, _calls: calls,
    chartArea: { left: 60, right: 600, top: 20, bottom: 300, width: 540, height: 280 },
    scales: { x: { getPixelForValue: (v) => 60 + v * 30 } }
  };
}
const groupsToday = [
  { iso: '2026-09-01', label: '01/09', i0: 0, i1: 2 },
  { iso: TODAY, label: 'hÃ´m nay', i0: 3, i1: 5 }
];
const fToday = fakeBandChart();
bandPlugin.beforeDatasetsDraw(fToday, {}, { dayGroups: groupsToday, weekGroups: [], todayIso: TODAY });
check('Dáº£i hÃ´m nay: cÃ³ TÃ” Ná»€N sau cá»™t (fillRect)', fToday._calls.includes('fillRect'));
const fChip = fakeBandChart();
bandPlugin.afterDraw(fChip, {}, { dayGroups: groupsToday, weekGroups: [], todayIso: TODAY });
check('Dáº£i hÃ´m nay: cÃ³ CHIP "HÃ”M NAY"', fChip._calls.some(c => String(c).includes('HÃ”M NAY')));
check('Dáº£i hÃ´m nay: nhÃ£n ngÃ y hÃ´m nay váº«n Ä‘Æ°á»£c váº½', fChip._calls.some(c => String(c) === 'text:hÃ´m nay'));
const fOut = fakeBandChart();
bandPlugin.beforeDatasetsDraw(fOut, {}, { dayGroups: groupsToday, weekGroups: [], todayIso: '1999-01-01' });
check('Dáº£i hÃ´m nay: hÃ´m nay NGOÃ€I khung Ä‘ang xem â†’ khÃ´ng tÃ´ gÃ¬', fOut._calls.length === 0);
const fNone = fakeBandChart();
bandPlugin.beforeDatasetsDraw(fNone, {}, { dayGroups: groupsToday, weekGroups: [] });
check('Dáº£i hÃ´m nay: thiáº¿u todayIso â†’ khÃ´ng tÃ´ gÃ¬', fNone._calls.length === 0);

// â”€â”€â”€ L. Tá»”NG NHáº¬P MUA THEO Ká»² (cháº¿ Ä‘á»™ xem thá»© 2 cá»§a tháº» NguyÃªn liá»‡u) â”€â”€â”€
console.log('--- Tá»”NG NHáº¬P MUA THEO Ká»² ---');
state.materialRecords = [
  { id: 'tt1', date: '2026-10-12', location: 'xuong-2', weight: 1000, unitPrice: 2000, totalAmount: 2000000, type: 'Luá»“ng', supplier: 'A' },
  { id: 'tt2', date: '2026-10-13', location: 'xuong-2', weight: 500, unitPrice: 2000, totalAmount: 1000000, type: 'Luá»“ng', supplier: 'A' },
  // Thiáº¿u totalAmount nhÆ°ng cÃ³ Ä‘Æ¡n giÃ¡ â‡’ tá»± tÃ­nh 300 Ã— 3.000 = 900.000 (dá»¯ liá»‡u cÅ©)
  // location dÃ¹ng NHÃƒN cÅ© 'XÆ°á»Ÿng 1' (khÃ´ng pháº£i key) â‡’ váº«n pháº£i gom Ä‘Ãºng vÃ o cá»™t XÆ°á»Ÿng 1
  { id: 'tt3', date: '2026-10-14', location: 'XÆ°á»Ÿng 1', weight: 300, unitPrice: 3000, totalAmount: 0, type: 'Ná»©a', supplier: 'B' },
  // KhÃ´ng cÃ³ Ä‘Æ¡n giÃ¡ â‡’ 0 Ä‘á»“ng + Ä‘áº¿m vÃ o "chÆ°a cÃ³ Ä‘Æ¡n giÃ¡"
  { id: 'tt4', date: '2026-10-15', location: 'lo-hoi', weight: 200, unitPrice: 0, totalAmount: 0, type: 'Gá»—', supplier: 'C' },
  // Tuáº§n sau (20/10) â€” KHÃ”NG Ä‘Æ°á»£c tÃ­nh vÃ o tuáº§n 42
  { id: 'tt5', date: '2026-10-20', location: 'xuong-2', weight: 9999, unitPrice: 1000, totalAmount: 9999000, type: 'Luá»“ng', supplier: 'A' },
  // ThÃ¡ng trÆ°á»›c (30/09) â€” khÃ´ng tÃ­nh vÃ o thÃ¡ng 10 nhÆ°ng CÃ“ trong nÄƒm 2026
  { id: 'tt6', date: '2026-09-30', location: 'xuong-2', weight: 400, unitPrice: 2500, totalAmount: 1000000, type: 'Luá»“ng', supplier: 'A' },
  // Thiáº¿u ngÃ y â€” khÃ´ng tÃ­nh vÃ o ká»³ nÃ o (cÃ³ cáº£nh bÃ¡o riÃªng)
  { id: 'tt7', date: '', location: 'xuong-2', weight: 50, unitPrice: 1000, totalAmount: 50000, type: 'Luá»“ng', supplier: 'A' },
  // Vá»‹ trÃ­ láº¡ â‡’ gom vÃ o dÃ²ng "KhÃ¡c / khÃ´ng rÃµ"; thiáº¿u totalAmount â‡’ 100 Ã— 1.000
  { id: 'tt8', date: '2026-10-16', location: 'kho-x', weight: 100, unitPrice: 1000, type: 'Luá»“ng', supplier: 'D' }
];
mat.setMpView('chart'); // báº¯t Ä‘áº§u tá»« cháº¿ Ä‘á»™ biá»ƒu Ä‘á»“

const rngW = mat.mpTotalsRangeOf('week', '2026-W42');
check('Tá»•ng ká»³: tuáº§n 2026-W42 = 12/10 â†’ 18/10', rngW.from === '2026-10-12' && rngW.to === '2026-10-18');
check('Tá»•ng ká»³: nhÃ£n tuáº§n cÃ³ sá»‘ tuáº§n + khoáº£ng ngÃ y', rngW.label.includes('Tuáº§n 42') && rngW.rangeLabel === '12/10 â†’ 18/10');
const rngM = mat.mpTotalsRangeOf('month', '2026-10');
check('Tá»•ng ká»³: thÃ¡ng 10/2026 = 01/10 â†’ 31/10', rngM.from === '2026-10-01' && rngM.to === '2026-10-31' && rngM.label === 'ThÃ¡ng 10/2026');
const rngY = mat.mpTotalsRangeOf('year', '2026');
check('Tá»•ng ká»³: nÄƒm 2026 = 01/01 â†’ 31/12', rngY.from === '2026-01-01' && rngY.to === '2026-12-31' && rngY.label === 'NÄƒm 2026');

check('ThÃ nh tiá»n 1 lÆ°á»£t: Æ°u tiÃªn totalAmount Ä‘Ã£ lÆ°u', mat.mpRecordAmount(state.materialRecords[0]) === 2000000);
check('ThÃ nh tiá»n 1 lÆ°á»£t: thiáº¿u totalAmount â†’ weight Ã— unitPrice', mat.mpRecordAmount(state.materialRecords[2]) === 900000);

const sumW = mat.mpTotalsSummary(rngW);
check('Tá»•ng tuáº§n: Ä‘Ãºng 5 lÆ°á»£t trong ká»³ (bá» tuáº§n sau + thÃ¡ng trÆ°á»›c + thiáº¿u ngÃ y)', sumW.count === 5);
check('Tá»•ng tuáº§n: khá»‘i lÆ°á»£ng = 1.000 + 500 + 300 + 200 + 100 = 2.100 kg', sumW.weight === 2100);
check('Tá»•ng tuáº§n: tá»•ng tiá»n = 2tr + 1tr + 0,9tr + 0 + 0,1tr = 4.000.000 Ä‘', sumW.amount === 4000000);
check('Tá»•ng tuáº§n: Ä‘Æ¡n giÃ¡ TB = tiá»n Ã· kg', Math.abs(sumW.avgPrice - (4000000 / 2100)) < 0.001);
check('Tá»•ng tuáº§n: 4 lÆ°á»£t cÃ³ Ä‘Æ¡n giÃ¡ / 1 lÆ°á»£t chÆ°a cÃ³', sumW.pricedCount === 4 && sumW.missingPriceCount === 1);
check('Tá»•ng tuáº§n: 5 ngÃ y + 1 lÆ°á»£t thiáº¿u ngÃ y Ä‘Æ°á»£c Ä‘áº¿m cáº£nh bÃ¡o', sumW.days === 5 && sumW.undatedCount === 1);
check('Tá»•ng tuáº§n: chia theo vá»‹ trÃ­ â€” XÆ°á»Ÿng 2 = 1.500 kg / 3.000.000 Ä‘',
  sumW.rows[2].key === 'xuong-2' && sumW.rows[2].weight === 1500 && sumW.rows[2].amount === 3000000);
check('Tá»•ng tuáº§n: chia theo vá»‹ trÃ­ â€” XÆ°á»Ÿng 1 = 300 kg / 900.000 Ä‘ (tá»± tÃ­nh thÃ nh tiá»n)',
  sumW.rows[1].key === 'xuong-1' && sumW.rows[1].weight === 300 && sumW.rows[1].amount === 900000);
check('Tá»•ng tuáº§n: chia theo vá»‹ trÃ­ â€” LÃ² hÆ¡i = 200 kg / 0 Ä‘',
  sumW.rows[0].key === 'lo-hoi' && sumW.rows[0].weight === 200 && sumW.rows[0].amount === 0);
check('Tá»•ng tuáº§n: vá»‹ trÃ­ láº¡ gom vÃ o dÃ²ng "KhÃ¡c / khÃ´ng rÃµ" (100 kg / 100.000 Ä‘)',
  sumW.rows.length === 4 && sumW.rows[3].key === 'khac' && sumW.rows[3].weight === 100 && sumW.rows[3].amount === 100000);
check('Tá»•ng tuáº§n: tá»· trá»ng khá»‘i lÆ°á»£ng cá»™ng láº¡i ~100%',
  Math.abs(sumW.rows.reduce((a, r) => a + r.shareWeight, 0) - 100) < 0.01);

const sumM = mat.mpTotalsSummary(rngM);
check('Tá»•ng thÃ¡ng 10: 6 lÆ°á»£t Â· 12.099 kg Â· 13.999.000 Ä‘ (cÃ³ lÆ°á»£t 20/10)',
  sumM.count === 6 && sumM.weight === 12099 && sumM.amount === 13999000);
const sumY2 = mat.mpTotalsSummary(rngY);
check('Tá»•ng nÄƒm 2026: 7 lÆ°á»£t Â· 12.499 kg Â· 14.999.000 Ä‘ (cÃ³ lÆ°á»£t 30/09)',
  sumY2.count === 7 && sumY2.weight === 12499 && sumY2.amount === 14999000);
check('Tá»•ng nÄƒm: KHÃ”NG tÃ­nh lÆ°á»£t thiáº¿u ngÃ y', sumY2.count === 7 && sumY2.undatedCount === 1);

// Äá»“ng bá»™ giao diá»‡n + render tháº­t vÃ o cÃ¡c Ã´
mat.setMpView('totals');
mat.setMpTotalsMode('week');
mat.setMpTotalsPeriod('2026-W42');
check('Cháº¿ Ä‘á»™ Tá»•ng: tháº» mang data-mp-mode="totals"', els.get('material-plan-chart-card').dataset.mpMode === 'totals');
check('Cháº¿ Ä‘á»™ Tá»•ng: hiá»‡n #mp-totals + áº©n khung biá»ƒu Ä‘á»“ + áº©n Ã´ chá»n tuáº§n',
  els.get('mp-totals').hidden === false && els.get('mpc-chart-box').hidden === true && els.get('mpc-week-nav').hidden === true);
check('Cháº¿ Ä‘á»™ Tá»•ng: tÃªn tháº» Ä‘á»•i thÃ nh "Tá»•ng Nháº­p Mua NguyÃªn Liá»‡u (Theo Ká»³)"',
  els.get('mpc-mode-label').textContent === 'Tá»•ng Nháº­p Mua NguyÃªn Liá»‡u (Theo Ká»³)');
check('Cháº¿ Ä‘á»™ Tá»•ng: nÃºt chuyá»ƒn Ä‘á»•i tooltip sang Tá»•ng Nháº­p Mua', els.get('mpc-mode-toggle').title.includes('Tá»•ng Nháº­p Mua'));
check('Render â‘ : tá»•ng khá»‘i lÆ°á»£ng 2.100 kg + quy Ä‘á»•i táº¥n',
  els.get('mp-total-kg').textContent === '2.100 kg' && els.get('mp-total-kg-sub').textContent.includes('2,1 táº¥n'));
check('Render â‘¡: tá»•ng tiá»n 4.000.000 Ä‘', els.get('mp-total-amount').textContent === '4.000.000 Ä‘');
check('Render â‘¡: Ä‘Æ¡n giÃ¡ TB + cáº£nh bÃ¡o 1 lÆ°á»£t chÆ°a cÃ³ Ä‘Æ¡n giÃ¡',
  els.get('mp-total-amount-meta').innerHTML.includes('ÄÆ¡n giÃ¡ TB') && els.get('mp-total-amount-meta').innerHTML.includes('chÆ°a cÃ³ Ä‘Æ¡n giÃ¡'));
check('Render â‘ : báº£ng chia Ä‘Ãºng vá»‹ trÃ­ XÆ°á»Ÿng 2 / XÆ°á»Ÿng 1 / LÃ² hÆ¡i / KhÃ¡c',
  ['XÆ°á»Ÿng 2', 'XÆ°á»Ÿng 1', 'LÃ² hÆ¡i', 'KhÃ¡c / khÃ´ng rÃµ', '1.500'].every((t) => els.get('mp-total-loc-kg').innerHTML.includes(t)));
check('Render â‘¡: báº£ng tiá»n chia Ä‘Ãºng vá»‹ trÃ­ (3.000.000 Â· 900.000 Â· 100.000)',
  ['XÆ°á»Ÿng 2', 'XÆ°á»Ÿng 1', 'LÃ² hÆ¡i', '3.000.000', '900.000', '100.000'].every((t) => els.get('mp-total-loc-money').innerHTML.includes(t)));
check('Render: dÃ²ng Tá»•ng khá»‘i lÆ°á»£ng (2.100 kg) + dÃ²ng Tá»•ng tiá»n cÃ³ trong tfoot',
  els.get('mp-total-loc-kg-foot').innerHTML.includes('2.100') && els.get('mp-total-loc-money-foot').innerHTML.includes('Tá»•ng'));
check('Render: ghi chÃº cáº£nh bÃ¡o lÆ°á»£t thiáº¿u ngÃ y', els.get('mp-totals-note').innerHTML.includes('thiáº¿u ngÃ y'));

mat.setMpTotalsMode('month');
check('Äá»•i ká»³ ThÃ¡ng: mode = month', mat.mpTotalsModeOf() === 'month');
mat.setMpTotalsPeriod('2026-10');
check('Äá»•i ká»³ ThÃ¡ng: render tá»•ng 12.099 kg', els.get('mp-total-kg').textContent === '12.099 kg');
mat.setMpTotalsMode('year');
mat.setMpTotalsPeriod('2026');
check('Äá»•i ká»³ NÄƒm: render tá»•ng 14.999.000 Ä‘', els.get('mp-total-amount').textContent === '14.999.000 Ä‘');

mat.setMpTotalsMode('week');
mat.setMpTotalsPeriod('2026-W42');
mat.shiftMpTotalsPeriod(1);
check('Ká»³ trÆ°á»›c/sau: tiáº¿n tuáº§n 42 â†’ 43', mat.mpTotalsKeyOf('week') === '2026-W43');
const savedUi = JSON.parse(localStorage.getItem(mat.MP_TOTALS_UI_KEY) || '{}');
check('Nhá»› theo mÃ¡y: lÆ°u view/mode/week vÃ o localStorage',
  savedUi.view === 'totals' && savedUi.mode === 'week' && savedUi.week === '2026-W43');
mat.shiftMpTotalsPeriod(-1);

mat.setMpTotalsPeriod('2020-W01');
check('Ká»³ rá»—ng: tá»•ng hiá»‡n "â€”" + báº£ng bÃ¡o chÆ°a cÃ³ láº§n nháº­p',
  els.get('mp-total-kg').textContent === 'â€”' && els.get('mp-total-loc-kg').innerHTML.includes('chÆ°a cÃ³ láº§n nháº­p'));

check('Xuáº¥t hÃ m: materials.js export Ä‘á»§ API Tá»•ng Nháº­p Mua',
  typeof mat.mpTotalsSummary === 'function' && typeof mat.toggleMpView === 'function' &&
  typeof mat.setMpView === 'function' && typeof mat.applyMpViewDom === 'function' &&
  mat.MP_TOTALS_UI_KEY === 'bamboo_tracker_mp_totals_ui_v1');

mat.setMpView('chart');
check('Quay láº¡i biá»ƒu Ä‘á»“: áº©n vÃ¹ng tá»•ng + hiá»‡n láº¡i khung canvas',
  els.get('mp-totals').hidden === true && els.get('mpc-chart-box').hidden === false);

// â”€â”€â”€ I. CUá»˜N Báº¢NG NGUYÃŠN LIá»†U (.table-scroll: dá»c 60vh + tiÃªu Ä‘á» dÃ­nh + trÆ°á»£t ngang) â”€â”€â”€
const matIdxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const matCssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const matNear = (id) => new RegExp('table-responsive table-scroll"[\\s\\S]{0,80}?id="' + id + '"').test(matIdxHtml);
check('CUá»˜N: 3 báº£ng NguyÃªn Liá»‡u bá»c khung .table-responsive.table-scroll (khÃ´ng cÃ²n div inline)',
  matNear('material-table') && matNear('material-plan-table') && matNear('supplier-table') &&
  !matIdxHtml.includes('style="overflow-x:auto;"'));
check('CUá»˜N (styles.css): .table-scroll = khung cuá»™n dá»c 60vh + dÃ²ng tiÃªu Ä‘á» DÃNH (sticky thead)',
  /\.table-scroll,\s*\.hr-table-scroll\s*\{/.test(matCssHtml) && matCssHtml.includes('max-height: 60vh;') &&
  /\.table-scroll thead th,\s*\.hr-table-scroll thead th\s*\{[\s\S]{0,220}?position: sticky;/.test(matCssHtml));
check('CUá»˜N (styles.css): báº£ng nhiá»u cá»™t cÃ³ min-width â†’ trÆ°á»£t ngang khi mÃ n hÃ¬nh háº¹p (cá»™t khÃ´ng bÃ³p)',
  matCssHtml.includes('#material-table { min-width: 1040px') && matCssHtml.includes('#supplier-table { min-width: 980px') &&
  matCssHtml.includes('#material-plan-table { min-width: 560px'));

// â”€â”€â”€ L2. Cáº¤U TRÃšC: nÃºt chuyá»ƒn cháº¿ Ä‘á»™ + vÃ¹ng Tá»•ng Nháº­p Mua â”€â”€â”€
function cssDepthAt(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) return -1;
  let d = 0;
  for (let j = 0; j < i; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') d--;
  }
  return d;
}
const evSrcMat = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('Tá»”NG NHáº¬P MUA: bá» chÃº thÃ­ch tuáº§n má» #mpc-caption khá»i header', !matIdxHtml.includes('mpc-caption'));
check('Tá»”NG NHáº¬P MUA: cÃ³ nÃºt chuyá»ƒn cháº¿ Ä‘á»™ + vÃ¹ng 2 pháº§n + 2 báº£ng vá»‹ trÃ­',
  matIdxHtml.includes('id="mpc-mode-toggle"') && matIdxHtml.includes('id="mp-totals"') &&
  matIdxHtml.includes('id="mp-total-loc-kg"') && matIdxHtml.includes('id="mp-total-loc-money"'));
check('Tá»”NG NHáº¬P MUA: bá»™ lá»c Tuáº§n/ThÃ¡ng/NÄƒm + Ã´ chá»n ká»³',
  matIdxHtml.includes('data-mp-pmode="week"') && matIdxHtml.includes('data-mp-pmode="month"') &&
  matIdxHtml.includes('data-mp-pmode="year"') && matIdxHtml.includes('id="mp-totals-period"'));
check('Tá»”NG NHáº¬P MUA (CSS): .mp-totals á»Ÿ cáº¥p cao nháº¥t (khÃ´ng lá»t @media)',
  cssDepthAt(matCssHtml, '.mp-totals {') === 0);
check('Tá»”NG NHáº¬P MUA (CSS): áº©n tháº­t báº±ng [hidden] + 2 pháº§n xáº¿p 2 cá»™t',
  matCssHtml.includes('.mp-totals[hidden]') && matCssHtml.includes('.mp-totals-grid') &&
  matCssHtml.includes('grid-template-columns: repeat(2'));
check('Tá»”NG NHáº¬P MUA (events): ná»‘i nÃºt chuyá»ƒn + bá»™ lá»c ká»³ + á»§y quyá»n chá»n Tuáº§n/ThÃ¡ng/NÄƒm',
  evSrcMat.includes("safeOn('mpc-mode-toggle'") && evSrcMat.includes("safeOn('mp-totals-period'") &&
  evSrcMat.includes('setMpTotalsMode(') && evSrcMat.includes("closest('[data-mp-pmode]')"));
check('Tá»”NG NHáº¬P MUA: giá»¯ dáº£i tuáº§n dÆ°á»›i trá»¥c X (plugin váº«n dÃ¹ng weekGroups)',
  /weekGroups/.test(fs.readFileSync(new URL('../js/materials.js', import.meta.url), 'utf8')));

// â•â•â• NHÃƒN TÃŒNH TRáº NG Sá»¬ Dá»¤NG Cá»¦A LÃ” (tab NguyÃªn Liá»‡u â€” 13/11/2026) â•â•â•
// Má»—i dÃ²ng Nháº­t KÃ½ gáº¯n chip 3 tráº¡ng thÃ¡i: CHÆ¯A DÃ™NG (xanh) Â· ÄÃƒ DÃ™NG Má»˜T
// PHáº¦N (há»• phÃ¡ch) Â· ÄÃƒ DÃ™NG Háº¾T (xÃ¡m). X2 Ä‘á»c sá»• nhÃ³m x2-pool (phiáº¿u cÃ¢n);
// X1 = Cáº¯t á»ng (4 KL) + Sáº¥y Sinh nháº­p tháº³ng; LÃ² hÆ¡i khÃ´ng gáº¯n nhÃ£n.
console.log('--- NHÃƒN "ÄÃƒ DÃ™NG" TRÃŠN LÃ” NGUYÃŠN LIá»†U ---');
state.materialRecords = [
  { id: 'mlh',  type: 'Váº§u khÃ´',      location: 'lo-hoi',   weight: 4000,  inputIndex: 4000,  outputIndex: 0, date: '2026-11-01', createdAt: '2026-11-01T00:00:00.000Z' },
  { id: 'mx1',  type: 'Váº§u cÃ¢y tÆ°Æ¡i', location: 'xuong-1',  weight: 6000,  inputIndex: 6000,  outputIndex: 0, date: '2026-11-01', createdAt: '2026-11-01T00:00:00.000Z' },
  { id: 'mx2a', type: 'Luá»“ng cÃ¢y xÃ´', location: 'xuong-2',  weight: 10000, inputIndex: 10000, outputIndex: 0, date: '2026-11-02', createdAt: '2026-11-02T00:00:00.000Z' },
  { id: 'mx2b', type: 'Luá»“ng cÃ¢y khÃ´', location: 'xuong-2', weight: 8000,  inputIndex: 8000,  outputIndex: 0, date: '2026-11-02', createdAt: '2026-11-02T00:00:01.000Z' },
  { id: 'mx2c', type: 'Luá»“ng á»‘ng',    location: 'xuong-2',  weight: 5000,  inputIndex: 5000,  outputIndex: 0, date: '2026-11-03', createdAt: '2026-11-03T00:00:00.000Z' }
];
state.xuong1CatOngRecords = [{ id: 'x1co-t', materialId: 'mx1', klDat: 2000, klLoai: 0, klMat: 0, klNgon: 0, date: '2026-11-02' }];
state.xuong1SaySinhRecords = [{ id: 'x1ss-t', materialId: 'mx1', qty: 1000, date: '2026-11-03' }];
state.xuong2BoluongRecords = [{ id: 'blg-t', date: '2026-11-03', qty: 3000, tickets: [{ materialId: 'mx2b', kg: 3000 }] }];
state.xuong2CutRecords = [{ id: 'cut-legacy-t', materialId: 'mx2c', materialType: 'Luá»“ng á»‘ng', date: '2026-11-04', inputWeight: 5000, klOngLuong: 4000 }]; // KHÃ”NG inputKind = lÆ°á»£t cáº¯t kiá»ƒu CÅ¨ â†’ cáº£ lÃ´ Ä‘Ã£ dÃ¹ng
state.xuong2BoOngRecords = [];
mat.renderMaterialView();
const tblChip = String(document.getElementById('material-table-body').innerHTML || '');
check('LÃ´ X2 chÆ°a dÃ¹ng â†’ chip xanh "ChÆ°a dÃ¹ng Â· 10.000 kg"', tblChip.includes('ChÆ°a dÃ¹ng Â· 10.000 kg') && tblChip.includes('is-fresh'));
check('LÃ´ X2 dÃ¹ng má»™t pháº§n (Bá»‘c 3.000) â†’ chip há»• phÃ¡ch "ÄÃ£ dÃ¹ng 3.000/8.000 kg"', tblChip.includes('ÄÃ£ dÃ¹ng 3.000/8.000 kg') && tblChip.includes('is-part'));
check('LÃ´ X2 cÃ³ lÆ°á»£t cáº¯t KIá»‚U CÅ¨ â†’ chip xÃ¡m "ÄÃ£ dÃ¹ng háº¿t 5.000 kg"', tblChip.includes('ÄÃ£ dÃ¹ng háº¿t 5.000 kg') && tblChip.includes('is-full'));
check('LÃ´ X1 (Cáº¯t á»ng 2.000 + Sáº¥y tháº³ng 1.000) â†’ chip "ÄÃ£ dÃ¹ng 3.000/6.000 kg"', tblChip.includes('ÄÃ£ dÃ¹ng 3.000/6.000 kg'));
const rowLh = (tblChip.split('data-mat-row="mlh"')[1] || '').split('</tr>')[0] || '';
check('LÃ´ LÃ² hÆ¡i â†’ KHÃ”NG gáº¯n nhÃ£n (chÆ°a cÃ³ sá»• dÃ¹ng)', rowLh.includes('Váº§u khÃ´') && !rowLh.includes('mat-use-chip'));
check('CSS nhÃ£n + sw.js v486', matCssHtml.includes('.mat-use-chip') && /nha-may-ngoc-son-v486/.test(fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8')));
console.log(`\n=== Káº¾T QUáº¢: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);

