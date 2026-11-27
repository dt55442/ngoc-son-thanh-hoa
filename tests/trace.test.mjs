// tests/trace.test.mjs â€” Kiá»ƒm thá»­ THáºº "TRUY XUáº¤T Äáº¦U VÃ€O â†’ Äáº¦U RA"
// (VÃ¹ng NÃ¢ng Cao tab Tá»•ng Quan â€” js/trace.js):
//   â‘  Chuá»—i giÃ¡ trá»‹ ÄO TRá»°C TIáº¾P: luá»“ng tÆ°Æ¡i â†’ á»‘ng luá»“ng â†’ á»‘ng bá»• Ä‘áº¡t â†’
//      bÃ o thÃ´ â†’ chá»n nan â†’ bÃ o tinh â†’ mÂ³ vÃ¡n (kÃ¨m hao há»¥t tá»«ng cháº·ng).
//   â‘¡ Truy xuáº¥t THEO Tá»ªNG MÃƒ VÃN = Æ¯á»šC TÃNH PHÃ‚N Bá»” theo tá»· lá»‡ mÂ³ trong ká»³
//      (kg tÆ°Æ¡i/1 mÂ³ Â· kg tÆ°Æ¡i/1 Ä‘Æ¡n vá»‹ Â· Ä‘á»‘i chiáº¿u Ä‘á»‹nh má»©c nan).
//   â‘¢ Bá»™ lá»c ká»³ Tuáº§n/ThÃ¡ng/NÄƒm (thuáº§n UI theo mÃ¡y) + Ã´ chá»n mÃ£ vÃ¡n.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-bao-van.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€
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
const near = (a, b, tol) => Math.abs(Number(a) - Number(b)) <= (tol == null ? 0.01 : tol);

// â•â•â• Dá»® LIá»†U MáºªU â€” ká»³ THÃNG 10/2026 (tuáº§n 41) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const { state, STORAGE_KEY_MATERIAL_RATES, STORAGE_KEY_PLANNING_ITEMS, STORAGE_KEY_PRESS_RECORDS } =
  await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// Äá»ŠNH Má»¨C vÃ¡n 1200x382x12: 40 thanh/táº¥m Â· hiá»‡u suáº¥t 70% Â· DÃ¹ng nan VÃ¡n Â· ÄVT Táº¥m
state.materialRates = [
  { id: 'rate-van', product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m',
    nan1: '1250Ã—18Ã—7', nan1Qty: 40, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0,
    glue: 0, additive: 0, efficiency: 70 }
];
// NGUYÃŠN LIá»†U: 2 lÃ´ XÆ°á»Ÿng 2 trong ká»³ Â· 1 lÃ´ LÃ² hÆ¡i (loáº¡i) Â· 1 lÃ´ XÆ°á»Ÿng 2 NGOÃ€I ká»³
state.materialRecords = [
  { id: 'mat-a', date: '2026-10-05', location: 'xuong-2', type: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿', weight: 12100 },
  { id: 'mat-b', date: '2026-10-06', location: 'xuong-2', type: 'Luá»“ng á»‘ng', supplier: 'NhÃ  Trung', weight: 5000 },
  { id: 'mat-c', date: '2026-10-06', location: 'lo-hoi', type: 'Gá»—', supplier: 'NhÃ  Triá»‡u', weight: 2660 },
  { id: 'mat-d', date: '2026-09-15', location: 'xuong-2', type: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿', weight: 9999 }
];
// Cáº®T CHá»ŒN: link lÃ´ mat-a â†’ á»‘ng luá»“ng 5.559 kg Â· cá»§i 2.004 kg
state.xuong2CutRecords = [
  { id: 'cut-1', materialId: 'mat-a', date: '2026-10-05', week: '2026-W41',
    inputWeight: 12100, klOngLuong: 5559, klCuiDot: 2004, klCayLoai: 0 }
];
// Bá»” á»NG: Ä‘em bá»• 5.205 kg â†’ á»‘ng loáº¡i 50 kg â‡’ Ä‘áº¡t 5.155 kg
state.xuong2BoOngRecords = [
  { id: 'bo-1', cutId: 'cut-1', date: '2026-10-06', inputOng: 5205, klOngLoai: 50, klOngBo: 5155 }
];
// BÃ€O THÃ”: 1 lÆ°á»£t (sá»‘ thanh láº¥y tá»« Chá»n Nan ThÃ´ link Ä‘Ãºng baothoId)
state.xuong2BaoThoRecords = [
  { id: 'bt-1', boOngId: 'bo-1', date: '2026-10-06', daiText: '1250', rongText: '18', dayText: '7' }
];
// CHá»ŒN NAN THÃ”: 2.100 (A) + 500 (Loáº¡i háº³n) thuá»™c chuá»—i Â· 900 MUA NGOÃ€I (khÃ´ng tÃ­nh)
state.xuong2ChonNanThoRecords = [
  { id: 'cn-1', baothoId: 'bt-1', date: '2026-10-06', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 2100, cls: 'A', external: false },
  { id: 'cn-2', baothoId: 'bt-1', date: '2026-10-06', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 500, cls: 'reject', external: false },
  { id: 'cn-3', baothoId: '', date: '2026-10-06', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 900, cls: 'A', external: true }
];
// BÃ€O TINH: vÃ o 2.100 â†’ Ä‘áº¡t 2.000 Â· lá»—i 100
state.xuong2BaoTinhRecords = [
  { id: 'btinh-1', kind: 'tinh', date: '2026-10-07', inDims: [1250, 18, 7], outDims: [1250, 18, 7],
    qtyOk: 2000, qtyErr: 100, unitVol: 0.0001575 }
];
// Ã‰P VÃN: 200 táº¥m 1200Ã—382Ã—12 â‡’ 0,0055008 Ã— 200 = 1,10016 mÂ³
state.pressRecords = [
  { id: 'p1', date: '2026-10-08', week: 'Tuáº§n 41', year: 2026, productId: 'rate-van', finishedQty: 200,
    vanTho: [{ vtDim: '1200x382x12', vtQty: 200 }], sticks: [] }
];


const trace = await import('../js/trace.js');

// Chá»‘t ká»³ xem = THÃNG 10/2026 (khÃ´ng phá»¥ thuá»™c ngÃ y cháº¡y mÃ¡y)
function setPeriod(mode, key, productId) {
  const ui = trace.loadTraceUi();
  ui.mode = mode; ui.key = key; ui.productId = productId || '';
  trace.saveTraceUi();
}
setPeriod('month', '2026-10');

// â•â•â• A. KHÃ“A Ká»² + Dá»ŠCH Ká»² + NHÃƒN Ká»² â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
check('A1: khÃ³a ká»³ TUáº¦N cá»§a 05/10/2026 = 2026-W41', trace.traceKeyOf('2026-10-05', 'week') === '2026-W41');
check('A2: khÃ³a ká»³ THÃNG = 2026-10', trace.traceKeyOf('2026-10-05', 'month') === '2026-10');
check('A3: khÃ³a ká»³ NÄ‚M = 2026', trace.traceKeyOf('2026-10-05', 'year') === '2026');
check('A4: ngÃ y rá»—ng â†’ khÃ³a rá»—ng', trace.traceKeyOf('', 'month') === '');
check('A5: dá»‹ch tuáº§n +1 â†’ 2026-W42', trace.traceShiftKey('2026-W41', 'week', 1) === '2026-W42');
check('A6: dá»‹ch tuáº§n -1 â†’ 2026-W40', trace.traceShiftKey('2026-W41', 'week', -1) === '2026-W40');
check('A7: dá»‹ch thÃ¡ng -1 â†’ 2026-09', trace.traceShiftKey('2026-10', 'month', -1) === '2026-09');
check('A8: dá»‹ch thÃ¡ng +1 váº¯t nÄƒm â†’ 2027-01', trace.traceShiftKey('2026-12', 'month', 1) === '2027-01');
check('A9: dá»‹ch nÄƒm +1 â†’ 2027', trace.traceShiftKey('2026', 'year', 1) === '2027');
check('A10: nhÃ£n ká»³ THÃNG = "ThÃ¡ng 10/2026"', trace.tracePeriodLabel('2026-10', 'month') === 'ThÃ¡ng 10/2026');
check('A11: nhÃ£n ká»³ NÄ‚M = "NÄƒm 2026"', trace.tracePeriodLabel('2026', 'year') === 'NÄƒm 2026');
check('A12: nhÃ£n ká»³ TUáº¦N cÃ³ "Tuáº§n 41" + khoáº£ng ngÃ y 05/10 â€“ 11/10',
  trace.tracePeriodLabel('2026-W41', 'week').includes('Tuáº§n 41') &&
  trace.tracePeriodLabel('2026-W41', 'week').includes('05/10') &&
  trace.tracePeriodLabel('2026-W41', 'week').includes('11/10'));

// â•â•â• B. TRáº NG THÃI UI THEO MÃY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
check('B1: Ä‘á»•i cháº¿ Ä‘á»™ â†’ nhá»› vÃ o localStorage',
  (() => { trace.setTraceMode('week'); return JSON.parse(storeBacking.get(trace.TRACE_UI_KEY)).mode === 'week'; })());
check('B2: Ä‘á»•i cháº¿ Ä‘á»™ â†’ khÃ³a ká»³ tá»± vá» ká»³ HIá»†N Táº I cá»§a cháº¿ Ä‘á»™ má»›i',
  trace.loadTraceUi().key === trace.traceDefaultKey('week'));
check('B3: dá»‹ch ká»³ lÃ¹i 1 â†’ khÃ³a lÆ°u Ä‘Ãºng',
  (() => { setPeriod('month', '2026-10'); trace.shiftTracePeriod(-1); return trace.loadTraceUi().key === '2026-09'; })());
check('B4: chá»n mÃ£ vÃ¡n â†’ lÆ°u vÃ o localStorage',
  (() => { trace.setTraceProduct('rate-van'); return JSON.parse(storeBacking.get(trace.TRACE_UI_KEY)).productId === 'rate-van'; })());
// B5/B6 cáº§n module Náº P Má»šI (bá»™ nhá»› Ä‘á»‡m UI trong module Ä‘Ã£ bá»‹ ghi á»Ÿ cÃ¡c bÆ°á»›c trÃªn)
storeBacking.set(trace.TRACE_UI_KEY, JSON.stringify({ mode: 'sai-che-do', key: '', productId: '' }));
const traceFresh = await import('../js/trace.js?fresh=' + Date.now());
check('B5: cháº¿ Ä‘á»™ láº¡ trong localStorage â†’ tá»± vá» máº·c Ä‘á»‹nh "month"', traceFresh.loadTraceUi().mode === 'month');
check('B6: khÃ³a rá»—ng trong localStorage â†’ tá»± Ä‘iá»n ká»³ hiá»‡n táº¡i', !!traceFresh.loadTraceUi().key);


// â•â•â• C. CHUá»–I GIÃ TRá»Š ÄO TRá»°C TIáº¾P (toÃ n nhÃ  mÃ¡y XÆ°á»Ÿng 2) â•â•â•â•â•â•â•
setPeriod('month', '2026-10');
const chain = trace.traceChainData();
check('C1: luá»“ng tÆ°Æ¡i = 17.100 kg (2 lÃ´ XÆ°á»Ÿng 2 trong ká»³)', near(chain.tuoiKg, 17100, 0.5));
check('C2: KHÃ”NG tÃ­nh lÃ´ LÃ² hÆ¡i (location khÃ¡c) vÃ  lÃ´ NGOÃ€I ká»³', near(chain.tuoiKg, 17100, 0.5));
check('C3: cáº¯t chá»n â€” Ä‘áº§u vÃ o 12.100 kg (sá»‘ng theo lÃ´ nguyÃªn liá»‡u)', near(chain.cutIn, 12100, 0.5));
check('C4: cáº¯t chá»n â€” á»‘ng luá»“ng 5.559 kg', near(chain.ongKg, 5559, 0.5));
check('C5: cáº¯t chá»n â€” cá»§i Ä‘á»‘t 2.004 kg Â· cÃ¢y loáº¡i 0', near(chain.cuiKg, 2004, 0.5) && near(chain.cayLoaiKg, 0, 0.5));
check('C6: tá»· lá»‡ á»‘ng/tÆ°Æ¡i = 45,9%', near(chain.ongRatioPct, 45.9421, 0.05));
check('C7: bá»• á»‘ng â€” Ä‘em bá»• 5.205 Â· Ä‘áº¡t 5.155 Â· loáº¡i 50 kg',
  near(chain.ongBoIn, 5205, 0.5) && near(chain.ongBoKg, 5155, 0.5) && near(chain.ongBoLoai, 50, 0.5));
check('C8: bÃ o thÃ´ â€” 2.600 thanh (2.100 + 500, KHÃ”NG tÃ­nh 900 mua ngoÃ i)', near(chain.baoThoThanh, 2600, 0.5));
check('C9: bÃ o thÃ´ â€” thá»ƒ tÃ­ch quy Ä‘á»•i 0,4095 mÂ³', near(chain.baoThoM3, 0.4095, 0.0002));
check('C10: chá»n nan â€” 2.600 thanh Â· "Loáº¡i háº³n" 500 thanh',
  near(chain.chonNanThanh, 2600, 0.5) && near(chain.chonNanReject, 500, 0.5));
const completedFlow = trace.traceFreshBambooFlowFor(date => date === '2026-10-06');
check('C10a: luá»“ng cÃ¢y chá»‰ tÃ­nh pháº§n qua liÃªn káº¿t tá»›i Chá»n Nan ThÃ´, gá»“m cáº£ nan loáº¡i háº³n',
  near(completedFlow.inputKg, 12100 * (5205 / 5559), 0.01) &&
  near(completedFlow.outputM3, 0.4095, 0.0002) &&
  completedFlow.unattributedRows === 0);
const originalCuts = state.xuong2CutRecords;
const originalBoOng = state.xuong2BoOngRecords;
const originalBaoTho = state.xuong2BaoThoRecords;
const originalSelections = state.xuong2ChonNanThoRecords;
state.xuong2CutRecords = [...originalCuts, {
  id: 'cut-pipe-only', date: '2026-10-06', inputKind: 'ong', inputWeight: 5000, klOngLuong: 2000
}];
state.xuong2BoOngRecords = [...originalBoOng, {
  id: 'bo-pipe-only', cutId: 'cut-pipe-only', date: '2026-10-06', inputOng: 2000, klOngLoai: 0
}];
state.xuong2BaoThoRecords = [...originalBaoTho, {
  id: 'bt-pipe-only', boOngId: 'bo-pipe-only', date: '2026-10-06'
}];
state.xuong2ChonNanThoRecords = [...originalSelections, {
  id: 'cn-pipe-only', date: '2026-10-06', baothoId: 'bt-pipe-only',
  quantity: 100, unitVol: 0.001, volume: 0.1, external: false
}];
const flowWithPipe = trace.traceFreshBambooFlowFor(date => date === '2026-10-06');
check('C10b: luá»“ng á»‘ng Ä‘Ã£ liÃªn káº¿t khÃ´ng bá»‹ tÃ­nh vÃ o chá»‰ sá»‘ luá»“ng cÃ¢y',
  near(flowWithPipe.inputKg, completedFlow.inputKg, 0.01) &&
  near(flowWithPipe.outputM3, completedFlow.outputM3, 0.0002) &&
  flowWithPipe.unattributedRows === 0);
state.xuong2CutRecords = originalCuts;
state.xuong2BoOngRecords = originalBoOng;
state.xuong2BaoThoRecords = originalBaoTho;
state.xuong2ChonNanThoRecords = originalSelections;
state.xuong2CutRecords = [...originalCuts, {
  id: 'cut-wip-only', date: '2026-10-06', inputKind: 'cart', inputWeight: 8000, klOngLuong: 4000
}];
check('C10c: luá»“ng cÃ¢y á»Ÿ cÃ´ng Ä‘oáº¡n trÆ°á»›c nhÆ°ng chÆ°a cÃ³ Ä‘áº§u ra Chá»n Nan ThÃ´ khÃ´ng lÃ m tÄƒng tá»· lá»‡',
  near(trace.traceFreshBambooFlowFor(date => date === '2026-10-06').inputKg, completedFlow.inputKg, 0.01));
state.xuong2ChonNanThoRecords = [...originalSelections, {
  id: 'cn-unlinked', date: '2026-10-06', quantity: 100, unitVol: 0.001, volume: 0.1, external: false
}];
const flowWithUnlinkedOutput = trace.traceFreshBambooFlowFor(date => date === '2026-10-06');
check('C10d: Ä‘áº§u ra khÃ´ng cÃ³ liÃªn káº¿t Ä‘Æ°á»£c loáº¡i khá»i tá»· lá»‡ vÃ  Ä‘Æ°á»£c bÃ¡o riÃªng',
  near(flowWithUnlinkedOutput.outputM3, completedFlow.outputM3, 0.0002) &&
  near(flowWithUnlinkedOutput.unattributedM3, 0.1, 0.0001) &&
  flowWithUnlinkedOutput.unattributedRows === 1);
state.xuong2ChonNanThoRecords = originalSelections.map(record => ({ ...record, date: '2026-11-02' }));
const nextMonthFlow = trace.traceFreshBambooFlowFor(date => date >= '2026-11-01' && date <= '2026-11-30');
check('C10e: Ä‘áº§u vÃ o tá»« ká»³ trÆ°á»›c váº«n ghÃ©p vá»›i Ä‘áº§u ra theo ká»³ Chá»n Nan ThÃ´',
  near(nextMonthFlow.inputKg, completedFlow.inputKg, 0.01) &&
  near(nextMonthFlow.outputM3, completedFlow.outputM3, 0.0002));
state.xuong2CutRecords = originalCuts;
state.xuong2ChonNanThoRecords = originalSelections;
check('C11: bÃ o tinh â€” vÃ o 2.100 Â· Ä‘áº¡t 2.000 Â· lá»—i 100',
  near(chain.baoTinhIn, 2100, 0.5) && near(chain.baoTinhOk, 2000, 0.5) && near(chain.baoTinhErr, 100, 0.5));
check('C12: bÃ o tinh â€” thá»ƒ tÃ­ch Ä‘áº¡t 0,315 mÂ³', near(chain.baoTinhM3Ok, 0.315, 0.0002));
check('C13: Ã©p vÃ¡n â€” 1,10016 mÂ³ Â· 1 lÆ°á»£t Ã©p', near(chain.pressM3, 1.10016, 0.0001) && chain.pressRuns === 1);
check('C14: tá»· lá»‡ thanh/kg tÆ°Æ¡i cá»§a ká»³ = 2.600 Ã· 17.100 = 0,15205',
  near(chain.thanhPerKgTuoi, 2600 / 17100, 0.00001));

// â•â•â• D. Lá»ŒC THEO Ká»² (tuáº§n / thÃ¡ng / nÄƒm) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
setPeriod('week', '2026-W41');
const chainW = trace.traceChainData();
check('D1: ká»³ TUáº¦N 41 â€” váº«n Ä‘á»§ sá»‘ (má»i báº£n ghi máº«u náº±m trong tuáº§n 41)', near(chainW.tuoiKg, 17100, 0.5) && near(chainW.pressM3, 1.10016, 0.0001));
setPeriod('week', '2026-W42');
const chainW42 = trace.traceChainData();
check('D2: ká»³ TUáº¦N 42 (rá»—ng) â€” má»i cháº·ng = 0', chainW42.tuoiKg === 0 && chainW42.pressM3 === 0 && chainW42.chonNanThanh === 0);
setPeriod('year', '2026');
const chainY = trace.traceChainData();
check('D3: ká»³ NÄ‚M 2026 â€” gá»“m cáº£ lÃ´ 15/09 (9999 kg)', near(chainY.tuoiKg, 17100 + 9999, 0.5));
setPeriod('year', '2025');
check('D4: ká»³ NÄ‚M 2025 (rá»—ng) â€” khÃ´ng cÃ³ dá»¯ liá»‡u', trace.traceChainData().tuoiKg === 0);
check('D5: traceInPeriod tÃ´n trá»ng ká»³ Ä‘ang chá»n',
  (() => { setPeriod('month', '2026-10'); const a = trace.traceInPeriod('2026-10-05'); const b = trace.traceInPeriod('2026-09-15'); return a === true && b === false; })());


// â•â•â• E. TRUY XUáº¤T THEO Tá»ªNG MÃƒ VÃN (Æ¯á»šC TÃNH PHÃ‚N Bá»”) â•â•â•â•â•â•â•â•â•â•â•
setPeriod('month', '2026-10');
// Há»† Sá» CHUá»–I cá»§a ká»³ máº«u: kg tÆ°Æ¡i cho 1 thanh nan
//   = (kg á»‘ng bá»• Ä‘áº¡t Ã· thanh bÃ o thÃ´) Ã· tá»· lá»‡ á»‘ng/tÆ°Æ¡i
//   = (5.155 Ã· 2.600) Ã· (5.559 Ã· 12.100)
const KPT = (5155 / 2600) / (5559 / 12100);
const prodAll = trace.traceProductRows();
check('E1: 1 mÃ£ vÃ¡n cÃ³ Ã©p trong ká»³', prodAll.rows.length === 1 && prodAll.rows[0].productId === 'rate-van');
check('E2: nhÃ£n mÃ£ vÃ¡n = "VÃ¡n 1200x382x12"', prodAll.rows[0].label === 'VÃ¡n 1200x382x12');
check('E3: ÄVT = Táº¥m Â· DÃ¹ng nan = VÃ¡n Â· Hiá»‡u suáº¥t 70%',
  prodAll.rows[0].unit === 'Táº¥m' && prodAll.rows[0].nanUse === 'VÃ¡n' && near(prodAll.rows[0].effPct, 70, 0.001));
check('E4: sáº£n lÆ°á»£ng 200 táº¥m Â· 1,10016 mÂ³', near(prodAll.rows[0].outQty, 200, 0.5) && near(prodAll.rows[0].m3, 1.10016, 0.0001));
check('E5: chiáº¿m 100% thá»ƒ tÃ­ch ká»³ (chá»‰ 1 mÃ£)', near(prodAll.rows[0].sharePct, 100, 0.01));
check('E5b: há»‡ sá»‘ kg tÆ°Æ¡i/1 thanh = há»‡ sá»‘ cá»­a sá»• tham chiáº¿u (T10/2026) Â· ká»³ nÃ y cÅ©ng Ä‘á»§ dá»¯ liá»‡u',
  near(prodAll.kgPerThanh, KPT, 0.0001) && prodAll.useRef === true &&
  near(prodAll.ownKgPerThanh, KPT, 0.0001) && prodAll.periodComplete === true);
check('E6: kg tÆ°Æ¡i phÃ¢n bá»• = thanh ÄM (200 Ã— 40 Ã· 0,7) Ã— há»‡ sá»‘ chuá»—i',
  near(prodAll.rows[0].tuoiKg, 200 * (40 / 0.7) * KPT, 0.5));
check('E7: Kg tÆ°Æ¡i / 1 mÂ³ = (thanh ÄM Ã— KPT) Ã· 1,10016',
  near(prodAll.rows[0].kgPerM3, (200 * (40 / 0.7) * KPT) / 1.10016, 0.5));
check('E8: Kg tÆ°Æ¡i / 1 táº¥m = (thanh ÄM Ã— KPT) Ã· 200 = 40 Ã· 0,7 Ã— KPT',
  near(prodAll.rows[0].kgPerUnit, (40 / 0.7) * KPT, 0.02));
check('E9: Thanh ÄM / táº¥m = 40 Ã· 0,7 = 57,14', near(prodAll.rows[0].nanPerUnit, 40 / 0.7, 0.001));
check('E10: thá»ƒ tÃ­ch 1 táº¥m = 0,0055008 mÂ³', near(prodAll.rows[0].unitVol, 0.0055008, 0.0000001));
check('E11: cá»™t "náº¿u Ä‘Ãºng ÄM nan" = (thanh/mÂ³ theo ÄM) Ã— há»‡ sá»‘ chuá»—i',
  near(prodAll.rows[0].kgPerM3LyThuyet, (1 / 0.0055008) * (40 / 0.7) * KPT, 1));
check('E12: tá»•ng ká»³ = 1,10016 mÂ³ Â· kg tÆ°Æ¡i chia = thanh ÄM Ã— há»‡ sá»‘ chuá»—i',
  near(prodAll.totalM3, 1.10016, 0.0001) && near(prodAll.totalTuoi, 200 * (40 / 0.7) * KPT, 1) &&
  near(prodAll.tuoiNhap, 17100, 0.5));

// PhÃ¢n bá»• 2 mÃ£: mÃ£ B chiáº¿m 3/4 thá»ƒ tÃ­ch â†’ nháº­n 3/4 kg tÆ°Æ¡i
state.materialRates.push({ id: 'rate-van-b', product: '1200x600x12', nanUse: 'VÃ¡n', unit: 'Táº¥m',
  nan1: '1250Ã—18Ã—7', nan1Qty: 20, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 });
state.pressRecords.push({ id: 'p2', date: '2026-10-09', week: 'Tuáº§n 41', year: 2026, productId: 'rate-van-b',
  finishedQty: 100, vanTho: [{ vtDim: '1200x600x12', vtQty: 100 }], sticks: [] });
const prod2 = trace.traceProductRows();
const mA = prod2.rows.find(r => r.productId === 'rate-van');
const mB = prod2.rows.find(r => r.productId === 'rate-van-b');
check('E13: 2 mÃ£ trong ká»³ Â· sáº¯p theo thá»ƒ tÃ­ch giáº£m dáº§n', prod2.rows.length === 2 && prod2.rows[0].productId === 'rate-van');
const W2 = 200 * (40 / 0.7) + 100 * (20 / 0.7);   // tá»•ng thanh ÄM 2 mÃ£ (A 80% Â· B 20%)
check('E14: phÃ¢n bá»• theo THANH Äá»ŠNH Má»¨C â€” mÃ£ A (11.428,6 thanh ÄM) nháº­n 80% kg tÆ°Æ¡i, mÃ£ B (2.857,1) nháº­n 20%',
  near(mA.sharePct, 80, 0.05) && near(mB.sharePct, 20, 0.05) &&
  near(mA.tuoiKg, W2 * KPT * 0.8, 0.5) && near(mB.tuoiKg, W2 * KPT * 0.2, 0.5));
check('E15: Kg tÆ°Æ¡i / 1 mÂ³ KHÃC NHAU giá»¯a 2 mÃ£ (A náº·ng Ä‘á»‹nh má»©c nan hÆ¡n â†’ cao hÆ¡n)',
  near(mA.kgPerM3, (W2 * KPT * 0.8) / 1.10016, 0.5) &&
  near(mB.kgPerM3, (W2 * KPT * 0.2) / 0.864, 0.5) &&
  mA.kgPerM3 > mB.kgPerM3);
check('E16: tá»•ng 2 mÃ£ = tá»•ng thanh ÄM Ã— há»‡ sá»‘ chuá»—i (khÃ´ng tháº¥t láº¡c)',
  near(mA.tuoiKg + mB.tuoiKg, W2 * KPT, 1));
setPeriod('month', '2026-10', 'rate-van-b');
const prodOne = trace.traceProductRows();
check('E17: chá»n 1 mÃ£ â†’ báº£ng chá»‰ cÃ²n Ä‘Ãºng mÃ£ Ä‘Ã³', prodOne.rows.length === 1 && prodOne.rows[0].productId === 'rate-van-b');
state.materialRates.pop();
state.pressRecords = state.pressRecords.filter(r => r.id !== 'p2');
setPeriod('month', '2026-11', '');
check('E18: ká»³ KHÃ”NG cÃ³ lÆ°á»£t Ã©p â†’ báº£ng rá»—ng', trace.traceProductRows().rows.length === 0);

// â•â•â• E2. ÄO THáº¬T Tá»ªNG NGUá»’N: VÃN (sticks) Â· BULLIG Â· THANH (QC) â•â•
// Ba nguá»“n sá»‘ Ä‘o KHÃC NHAU â€” má»—i loáº¡i sáº£n pháº©m láº¥y Ä‘Ãºng nguá»“n cá»§a nÃ³.
setPeriod('month', '2026-10', '');
state.materialRates = [
  { id: 'rate-van', product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m',
    nan1: '1250Ã—18Ã—7', nan1Qty: 40, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 },
  { id: 'rate-bullig', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh',
    nan1: '1250Ã—18Ã—7', nan1Qty: 1 / 6, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 100 },
  { id: 'rate-thanh', product: '640x14x12', nanUse: 'VÃ¡n', unit: 'Thanh',
    nan1: '1250Ã—18Ã—7', nan1Qty: 10, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 100 }
];
// VÃN: thanh nan vÃ o mÃ¡y Ã©p = sticks (9.384 + 1.000 = 10.384 thanh)
state.pressRecords = [
  { id: 'p1', date: '2026-10-08', week: 'Tuáº§n 41', year: 2026, productId: 'rate-van', finishedQty: 200,
    vanTho: [{ vtDim: '1200x382x12', vtQty: 200 }],
    sticks: [{ nanKey: '1250Ã—18Ã—7', sticks: 9384 }, { nanKey: '1250Ã—18Ã—5', sticks: 1000 }] }
];
// BULLIG: gia cÃ´ng dÃ¹ng 6.000 thanh THÃ” â†’ chá»n thanh Ä‘áº¡t 30.000 thÃ nh pháº©m
state.xuong2BulligRecords = [
  { id: 'bl-gc', kind: 'gc', date: '2026-10-08', outDims: [1250, 80, 12], outSizeKey: '1250Ã—80Ã—12',
    quantity: 30000, qtyIn: 6000, convertFactor: 5, sources: [] },
  { id: 'bl-ct', kind: 'ct', date: '2026-10-08', inSizeKey: '1250Ã—80Ã—12', inDims: [1250, 80, 12],
    qtyOk: 30000, qtyErr: 0, unitVol: 0.0012 }
];
// THANH: Kiá»ƒm thanh (tab QC) Ä‘Æ°a vÃ o 2.000 â†’ Ä‘áº¡t 1.900
state.qcFinalRecords = [
  { id: 'q1', kind: 'thanh', date: '2026-10-09', workshop: 'x2', sizeKey: '640x14x12',
    inputQty: 2000, qtyOk: 1900, qtyExcept: 0, qtyReject: 100 }
];

const p3 = trace.traceProductRows();
const rVan = p3.rows.find(r => r.productId === 'rate-van');
const rBul = p3.rows.find(r => r.productId === 'rate-bullig');
const rTha = p3.rows.find(r => r.productId === 'rate-thanh');
check('E19: gom Ä‘á»§ 3 mÃ£ tá»« 3 nguá»“n khÃ¡c nhau (Ã©p vÃ¡n Â· Bullig Â· kiá»ƒm thanh)',
  p3.rows.length === 3 && !!rVan && !!rBul && !!rTha && !p3.rows.some(r => r.unlinked));
check('E20: VÃN â€” thanh dÃ¹ng = sticks cá»§a lÆ°á»£t Ã©p (9.384 + 1.000 = 10.384)',
  near(rVan.thanhReal, 10384, 0.5) && rVan.basis.startsWith('thanh tháº­t') && rVan.sources === 'Ã©p vÃ¡n');
check('E21: BULLIG â€” thanh thÃ´ Ä‘Ã£ gia cÃ´ng 6.000 Â· sáº£n lÆ°á»£ng 30.000 Â· 36 mÂ³',
  near(rBul.thanhReal, 6000, 0.5) && near(rBul.outQty, 30000, 0.5) && near(rBul.m3, 36, 0.001) &&
  rBul.sources === 'gia cÃ´ng Bullig');
check('E22: THANH â€” thanh Ä‘Æ°a vÃ o kiá»ƒm 2.000 Â· sáº£n lÆ°á»£ng Ä‘áº¡t 1.900',
  near(rTha.thanhReal, 2000, 0.5) && near(rTha.outQty, 1900, 0.5) && rTha.sources === 'kiá»ƒm thanh');
check('E23: phÃ¢n bá»• theo thanh Ä‘o tháº­t â€” 10.384 / 6.000 / 2.000 trÃªn tá»•ng 18.384',
  near(rVan.sharePct, (10384 / 18384) * 100, 0.02) && near(rBul.sharePct, (6000 / 18384) * 100, 0.02) &&
  near(rTha.sharePct, (2000 / 18384) * 100, 0.02));
check('E24: Kg tÆ°Æ¡i / 1 mÂ³ KHÃC NHAU giá»¯a 3 mÃ£ (khÃ´ng Ä‘Ã¡nh Ä‘á»“ng)',
  near(rVan.kgPerM3, (10384 * KPT) / 1.10016, 0.5) &&
  near(rBul.kgPerM3, (6000 * KPT) / 36, 0.5) &&
  near(rTha.kgPerM3, (2000 * KPT) / 0.204288, 0.5) &&
  rVan.kgPerM3 !== rBul.kgPerM3 && rBul.kgPerM3 !== rTha.kgPerM3);
check('E25: tá»•ng kg tÆ°Æ¡i phÃ¢n bá»• 3 mÃ£ = tá»•ng thanh (18.384) Ã— há»‡ sá»‘ chuá»—i',
  near(rVan.tuoiKg + rBul.tuoiKg + rTha.tuoiKg, 18384 * KPT, 1));

// â”€â”€ CHUá»–I 2 BÆ¯á»šC Ã‰P VÃN: táº¡o VÃN THÃ” (tá»« thanh nan) â†’ Ã‰P THÃ€NH PHáº¨M (tá»« vÃ¡n thÃ´)
// Thá»±c táº¿ dá»¯ liá»‡u: lÆ°á»£t táº¡o vÃ¡n thÃ´ KHÃ”NG gáº¯n mÃ£ (chÆ°a biáº¿t thÃ nh pháº©m), cÃ²n lÆ°á»£t
// Ã©p thÃ nh pháº©m ghi Äáº¦U VÃ€O = Táº¤M VÃN THÃ”. Pháº£i ná»‘i 2 bÆ°á»›c Ä‘á»ƒ gáº¯n kg tÆ°Æ¡i vá» mÃ£.
state.materialRates.push({ id: 'rate-vt', product: '1200x340x33', nanUse: 'VÃ¡n', unit: 'Táº¥m',
  nan1: '1250Ã—18Ã—7', nan1Qty: 140, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 });
state.pressRecords.push(
  { id: 'p-vt', date: '2026-10-07', week: 'Tuáº§n 41', year: 2026, productId: '', finishedQty: 0,
    vanTho: [{ vtDim: '1200Ã—340Ã—18', vtQty: 100 }], sticks: [{ nanKey: '1250Ã—18Ã—7', sticks: 5000 }] },
  { id: 'p-tp', date: '2026-10-08', week: 'Tuáº§n 41', year: 2026, productId: 'rate-vt', finishedQty: 50,
    vanTho: [], sticks: [{ nanKey: '1200Ã—340Ã—18', sticks: 100 }] }
);
const p4 = trace.traceProductRows();
const rVt = p4.rows.find(r => r.productId === 'rate-vt');
check('E26: BÆ¯á»šC 2 â€” lÆ°á»£t Ã©p thÃ nh pháº©m dÃ¹ng 100 Táº¤M VÃN THÃ” â†’ quy ra 5.000 thanh nan',
  !!rVt && near(rVt.thanhReal, 5000, 0.5) && near(rVt.outQty, 50, 0.5) && near(rVt.m3, 0.7344, 0.0001));
check('E27: lÆ°á»£t CHá»ˆ táº¡o vÃ¡n thÃ´ KHÃ”NG tá»± chiáº¿m kg tÆ°Æ¡i (khÃ´ng Ä‘áº¿m 2 láº§n) â†’ khÃ´ng cÃ³ dÃ²ng "ChÆ°a gáº¯n mÃ£"',
  !p4.rows.some(r => r.unlinked));
check('E28: lÆ°á»£t "chá»‰ táº¡o vÃ¡n thÃ´" khÃ´ng hiá»‡n thÃ nh dÃ²ng riÃªng trong báº£ng',
  !p4.rows.some(r => r.runs > 0 && r.outQty === 0 && r.productId === ''));

// VÃ¡n thÃ´ CHÆ¯A vÃ o thÃ nh pháº©m (dá»Ÿ dang) â†’ dÃ²ng "ChÆ°a gáº¯n mÃ£" á»Ÿ CUá»I, váº«n chia kg tÆ°Æ¡i
state.pressRecords.push(
  { id: 'p-wip', date: '2026-10-09', week: 'Tuáº§n 41', year: 2026, productId: '', finishedQty: 0,
    vanTho: [{ vtDim: '1000Ã—500Ã—20', vtQty: 40 }], sticks: [{ nanKey: '1250Ã—18Ã—7', sticks: 3000 }] }
);
const p5 = trace.traceProductRows();
const rUn = p5.rows.find(r => r.unlinked);
check('E29: vÃ¡n thÃ´ dá»Ÿ dang â†’ dÃ²ng "ChÆ°a gáº¯n mÃ£" á»Ÿ CUá»I báº£ng, thanh = pháº§n nan chÆ°a gáº¯n mÃ£',
  !!rUn && p5.rows[p5.rows.length - 1].unlinked === true &&
  rUn.label.includes('ChÆ°a gáº¯n mÃ£') && near(rUn.thanhReal, 3000, 0.5));
check('E30: dÃ²ng "ChÆ°a gáº¯n mÃ£" VáºªN Ä‘Æ°á»£c chia kg tÆ°Æ¡i + tá»•ng = tá»•ng thanh (10.384+5.000+6.000+2.000+3.000) Ã— há»‡ sá»‘',
  rUn.tuoiKg > 0 && near(p5.rows.reduce((s, r) => s + r.tuoiKg, 0), 26384 * KPT, 1));

// MÃ£ KHÃ”NG cÃ³ sá»‘ Ä‘o tháº­t â†’ dÃ¹ng thanh Ä‘á»‹nh má»©c (fallback)
state.pressRecords = state.pressRecords.filter(r => r.id === 'p1');
state.pressRecords[0].sticks = [];
const p6 = trace.traceProductRows();
const rVanNo = p6.rows.find(r => r.productId === 'rate-van');
check('E31: mÃ£ khÃ´ng cÃ³ sticks â†’ basis chuyá»ƒn sang "thanh Ä‘á»‹nh má»©c Ã— KL á»‘ng/1 thanh"',
  rVanNo.thanhReal === 0 && rVanNo.basis.startsWith('thanh Ä‘á»‹nh má»©c') && near(rVanNo.thanhTheory, 200 * (40 / 0.7), 0.5));

// KhÃ´i phá»¥c vá» 1 mÃ£ Ä‘á»ƒ kiá»ƒm má»¥c F (giao diá»‡n)
state.pressRecords = [
  { id: 'p1', date: '2026-10-08', week: 'Tuáº§n 41', year: 2026, productId: 'rate-van', finishedQty: 200,
    vanTho: [{ vtDim: '1200x382x12', vtQty: 200 }], sticks: [] }
];
state.xuong2BulligRecords = [];
state.qcFinalRecords = [];
state.materialRates = [
  { id: 'rate-van', product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m',
    nan1: '1250Ã—18Ã—7', nan1Qty: 40, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 }
];



// â•â•â• F. Váº¼ THáºº (KPI Â· báº£ng chuá»—i Â· báº£ng mÃ£ vÃ¡n Â· tráº¡ng thÃ¡i rá»—ng) â•
setPeriod('month', '2026-10', '');
trace.renderTraceCard();
const kpiHtml = els.get('trace-kpis').innerHTML;
const chainHtml = els.get('trace-chain').innerHTML;
const prodHtml = els.get('trace-products').innerHTML;
check('F1: dáº£i KPI cÃ³ chá»‰ sá»‘ CHÃNH "Luá»“ng tÆ°Æ¡i / 1 mÂ³"', kpiHtml.includes('Luá»“ng tÆ°Æ¡i / 1 mÂ³'));
check('F2: KPI cÃ³ "Luá»“ng tÆ°Æ¡i nháº­p" + "Sáº£n pháº©m ra" + "Sáº£n lÆ°á»£ng quy Ä‘á»•i"',
  kpiHtml.includes('Luá»“ng tÆ°Æ¡i nháº­p') && kpiHtml.includes('Sáº£n pháº©m ra') && kpiHtml.includes('Sáº£n lÆ°á»£ng quy Ä‘á»•i'));
// Há»‡ sá»‘ chuá»—i cá»§a ká»³ F (Ä‘á»‹nh má»©c 200 Ã— 40 Ã· 0,7 = 11.428,57 thanh; kg = thanh Ã— KPT)
const KPI_KGM3_F = (200 * (40 / 0.7) * KPT) / 1.10016;
check('F3: KPI hiá»‡n sá»‘ kg tÆ°Æ¡i/1 mÂ³ theo há»‡ sá»‘ chuá»—i (' + Math.round(KPI_KGM3_F) + ')',
  kpiHtml.includes(KPI_KGM3_F.toLocaleString('vi-VN', { maximumFractionDigits: 0 })) ||
  kpiHtml.includes((KPI_KGM3_F - 1).toLocaleString('vi-VN', { maximumFractionDigits: 0 })));
check('F3b: KPI cÃ³ Ã´ "Kg tÆ°Æ¡i / 1 thanh nan" (kiá»ƒm tra Ä‘á»™ há»£p lÃ½)',
  kpiHtml.includes('Kg tÆ°Æ¡i / 1 thanh nan'));
check('F4: báº£ng chuá»—i cÃ³ Ä‘á»§ 7 cháº·ng',
  chainHtml.includes('Luá»“ng tÆ°Æ¡i nháº­p') && chainHtml.includes('Cáº¯t chá»n â†’ á»ng luá»“ng') &&
  chainHtml.includes('Bá»• á»‘ng â†’ á»ng bá»• Ä‘áº¡t') && chainHtml.includes('Cháº¡y mÃ¡y bÃ o thÃ´') &&
  chainHtml.includes('Chá»n nan thÃ´ â†’ Nan Ä‘áº¡t') && chainHtml.includes('BÃ o tinh â†’ Nan Ä‘áº¡t') &&
  chainHtml.includes('Ã‰p vÃ¡n â†’ ThÃ nh pháº©m'));
check('F5: báº£ng chuá»—i cÃ³ 7 cá»™t (ÄVT Â· VÃ o Â· Ra Â· Hao há»¥t Â· Tá»· lá»‡ hao)',
  chainHtml.includes('Hao há»¥t') && chainHtml.includes('Tá»· lá»‡ hao') && chainHtml.includes('ÄVT'));
check('F6: báº£ng chuá»—i ghi phá»¥ pháº©m cá»§i Ä‘á»‘t 2.004 kg', chainHtml.includes('cá»§i Ä‘á»‘t 2.004 kg'));
check('F7: báº£ng mÃ£ vÃ¡n cÃ³ mÃ£ "VÃ¡n 1200x382x12" + chip DÃ¹ng nan', prodHtml.includes('VÃ¡n 1200x382x12') && prodHtml.includes('trace-tag-van'));
check('F8: báº£ng mÃ£ vÃ¡n cÃ³ dÃ²ng Tá»”NG', prodHtml.includes('trace-total-row') && prodHtml.includes('Tá»”NG 1 mÃ£'));
check('F9: báº£ng mÃ£ vÃ¡n ghi "Æ°á»›c tÃ­nh" qua nhÃ£n Kg tÆ°Æ¡i Æ°á»›c tÃ­nh',
  prodHtml.includes('Kg tÆ°Æ¡i / 1 mÂ³') && prodHtml.includes('Kg tÆ°Æ¡i / 1 Ä‘Æ¡n vá»‹'));
check('F10: Ã´ chá»n mÃ£ vÃ¡n Ä‘Æ°á»£c náº¡p (cÃ³ "Táº¥t cáº£ mÃ£ vÃ¡n" + mÃ£ vÃ¡n)',
  els.get('trace-product').innerHTML.includes('â€” Táº¥t cáº£ mÃ£ vÃ¡n â€”') && els.get('trace-product').innerHTML.includes('rate-van'));
check('F11: nhÃ£n ká»³ hiá»ƒn thá»‹ "ThÃ¡ng 10/2026"', els.get('trace-period-label').textContent === 'ThÃ¡ng 10/2026');
// Ká»³ rá»—ng â†’ dáº£i KPI bÃ¡o chÆ°a cÃ³ dá»¯ liá»‡u, báº£ng mÃ£ vÃ¡n bÃ¡o tráº¡ng thÃ¡i rá»—ng
setPeriod('month', '2026-11', '');
trace.renderTraceCard();
check('F12: ká»³ rá»—ng â†’ KPI bÃ¡o "ChÆ°a cÃ³ dá»¯ liá»‡u"', els.get('trace-kpis').innerHTML.includes('ChÆ°a cÃ³ dá»¯ liá»‡u'));
check('F13: ká»³ rá»—ng â†’ báº£ng mÃ£ vÃ¡n hiá»‡n tráº¡ng thÃ¡i rá»—ng (trace-empty)',
  els.get('trace-products').innerHTML.includes('trace-empty') && els.get('trace-products').innerHTML.includes('ChÆ°a cÃ³ lÆ°á»£t Ã‰P VÃN'));
// Chi tiáº¿t cÃ´ng Ä‘oáº¡n: áº¨N máº·c Ä‘á»‹nh â€” chá»‰ hiá»‡n khi báº¥m nÃºt
setPeriod('month', '2026-10', '');
trace.renderTraceCard();
check('F14: báº£ng mÃ£ vÃ¡n cÃ³ cá»™t "Thanh dÃ¹ng (Ä‘o tháº­t)" + nhÃ£n "MÃ£ vÃ¡n / thanh / Bullig"',
  els.get('trace-products').innerHTML.includes('Thanh dÃ¹ng (Ä‘o tháº­t)') &&
  els.get('trace-products').innerHTML.includes('MÃ£ vÃ¡n / thanh / Bullig'));
check('F15: CHI TIáº¾T cÃ´ng Ä‘oáº¡n áº¨N máº·c Ä‘á»‹nh (khá»‘i #trace-detail hidden)',
  els.get('trace-detail').hidden === true &&
  els.get('trace-detail-toggle').innerHTML.includes('Chi tiáº¿t tá»«ng cÃ´ng Ä‘oáº¡n'));
check('F16: báº£ng chuá»—i giÃ¡ trá»‹ VáºªN Ä‘Æ°á»£c váº½ sáºµn trong khá»‘i áº©n (má»Ÿ ra lÃ  tháº¥y ngay)',
  els.get('trace-chain').innerHTML.includes('Cáº¯t chá»n â†’ á»ng luá»“ng'));
trace.toggleTraceDetail();
check('F17: báº¥m nÃºt â†’ Má»ž chi tiáº¿t + nhá»› theo mÃ¡y',
  els.get('trace-detail').hidden === false &&
  els.get('trace-detail-toggle').innerHTML.includes('áº¨n chi tiáº¿t cÃ´ng Ä‘oáº¡n') &&
  JSON.parse(storeBacking.get(trace.TRACE_UI_KEY)).openDetail === true);
trace.toggleTraceDetail();
check('F18: báº¥m láº§n ná»¯a â†’ áº¨N láº¡i + lÆ°u tráº¡ng thÃ¡i Ä‘Ã³ng',
  els.get('trace-detail').hidden === true &&
  JSON.parse(storeBacking.get(trace.TRACE_UI_KEY)).openDetail === false);


// â•â•â• G. VÃ Dá»¤ CHUáº¨N: vÃ¡n 1200x382x12 Â· 40 thanh/táº¥m Â· hiá»‡u suáº¥t 70% â•â•
const rateVan = state.materialRates.find(r => r.id === 'rate-van');
const dims = trace.traceRateDims(rateVan);
check('G1: Ä‘á»c Ä‘Ãºng kÃ­ch thÆ°á»›c Ä‘á»‹nh má»©c [1200, 382, 12]', JSON.stringify(dims) === JSON.stringify([1200, 382, 12]));
check('G2: kÃ­ch thÆ°á»›c há»ng â†’ null', trace.traceRateDims({ product: 'khÃ´ng cÃ³ sá»‘' }) === null);
check('G3: sá»‘ thanh Ä‘á»‹nh má»©c/táº¥m = 40 Ã· 0,7 = 57,142857', near(trace.traceRateNanPerUnit(rateVan), 57.142857, 0.0001));
const unitVol = (1200 * 382 * 12) / 1e9;
check('G4: thá»ƒ tÃ­ch 1 táº¥m = 0,0055008 mÂ³', near(unitVol, 0.0055008, 1e-9));
check('G5: 1 mÂ³ = 181,8 táº¥m', near(1 / unitVol, 181.7917, 0.001));
check('G6: 1 mÂ³ cáº§n 10.388 thanh (theo Ä‘á»‹nh má»©c)', near((1 / unitVol) * (40 / 0.7), 10388.1, 1));
check('G7: vá»›i tá»· lá»‡ thá»±c táº¿ 0,15205 thanh/kg â†’ 1 mÂ³ cáº§n ~68.325 kg tÆ°Æ¡i (náº¿u Ä‘Ãºng ÄM nan)',
  near(((1 / unitVol) * (40 / 0.7)) / (2600 / 17100), 68325, 50));


// â•â•â• H. Cáº¤U TRÃšC (index.html Â· events.js Â· sw.js Â· styles.css Â· storage.js) â•
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const dashSrc = fs.readFileSync(new URL('../js/dashboard.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const storSrc = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const traceSrc = fs.readFileSync(new URL('../js/trace.js', import.meta.url), 'utf8');

check('H1: index.html cÃ³ tháº» #trace-card Náº°M TRONG VÃ¹ng NÃ¢ng Cao (trÆ°á»›c tháº» khÃ³a)',
  idxHtml.includes('id="trace-card"') &&
  idxHtml.indexOf('id="dash-zone-advanced"') < idxHtml.indexOf('id="trace-card"') &&
  idxHtml.indexOf('id="trace-card"') < idxHtml.indexOf('id="advanced-zone-lock"'));

check('H2: index.html Ä‘á»§ 6 id con (kpis Â· chain Â· products Â· product Â· period-label Â· prev/next)',
  ['trace-kpis', 'trace-chain', 'trace-products', 'trace-product', 'trace-period-label', 'trace-prev', 'trace-next']
    .every(id => idxHtml.includes(`id="${id}"`)));
check('H3: index.html cÃ³ 3 nÃºt cháº¿ Ä‘á»™ ká»³ Tuáº§n/ThÃ¡ng/NÄƒm',
  ['week', 'month', 'year'].every(m => idxHtml.includes(`data-trace-mode="${m}"`)));
check('H4: index.html ghi rÃµ 2 pháº§n â‘  tá»•ng quan+chi tiáº¿t cÃ´ng Ä‘oáº¡n Â· â‘¡ theo tá»«ng mÃ£',
  idxHtml.includes('Tá»•ng quan toÃ n xÆ°á»Ÿng &amp; chi tiáº¿t cÃ´ng Ä‘oáº¡n') &&
  idxHtml.includes('Truy xuáº¥t theo tá»«ng mÃ£ vÃ¡n / thanh / Bullig'));
check('H4b: index.html cÃ³ nÃºt #trace-detail-toggle + khá»‘i #trace-detail áº©n máº·c Ä‘á»‹nh (hidden)',
  idxHtml.includes('id="trace-detail-toggle"') && idxHtml.includes('id="trace-detail" hidden') &&
  idxHtml.includes('aria-controls="trace-detail"'));
check('H5: index.html cÃ³ ghi chÃº CÃ”NG THá»‚ TÃCH + Æ°á»›c tÃ­nh phÃ¢n bá»•',
  idxHtml.includes('DÃ i Ã— Rá»™ng Ã— DÃ y Ã· 1.000.000.000') && idxHtml.includes('Kg tÆ°Æ¡i cá»§a mÃ£'));

check('H6: events.js import tá»« ./trace.js',
  evSrc.includes("from './trace.js'") && evSrc.includes('setTraceMode') && evSrc.includes('shiftTracePeriod') && evSrc.includes('setTraceProduct'));
check('H7: events.js wire trace-prev / trace-next / trace-product / [data-trace-mode]',
  evSrc.includes("safeOn('trace-prev'") && evSrc.includes("safeOn('trace-next'") &&
  evSrc.includes("safeOn('trace-product'") && evSrc.includes("[data-trace-mode]"));

check('H8: dashboard.js gá»i renderTraceCard trong renderDashboardCharts (chá»‰ khi cÃ³ quyá»n)',
  dashSrc.includes("from './trace.js'") && dashSrc.includes('if (canViewAdvanced()) renderTraceCard();'));

check('H9: sw.js cÃ³ ./js/trace.js trong APP_SHELL', swJs.includes("'./js/trace.js'"));
check('H10: sw.js Ä‘Ã£ tÄƒng cache lÃªn v486', /nha-may-ngoc-son-v486/.test(swJs));

check('H11: styles.css cÃ³ khá»‘i THáºº TRUY XUáº¤T (.trace-card/.trace-kpi/.trace-table)',
  cssSrc.includes('THáºº TRUY XUáº¤T Äáº¦U VÃ€O â†’ Äáº¦U RA') &&
  cssSrc.includes('.trace-card') && cssSrc.includes('.trace-kpi-row') &&
  cssSrc.includes('.trace-table-wrap') && cssSrc.includes('.trace-mode-btn'));

check('H12: storage.js GHI 3 miá»n vÃ o file (materialRates Â· planningItems Â· pressRecords)',
  /materialRates: state\.materialRates/.test(storSrc) &&
  /planningItems: state\.planningItems/.test(storSrc) &&
  /pressRecords: state\.pressRecords/.test(storSrc));
check('H13: storage.js cÃ³ 3 hÃ m khÃ´i phá»¥c + gá»i trong loadDataFromLocalFile',
  storSrc.includes('function restoreMaterialRates') && storSrc.includes('function restorePlanningItems') &&
  storSrc.includes('function restorePressRecords') &&
  storSrc.includes('restoreMaterialRates(imported.materialRates)') &&
  storSrc.includes('restorePlanningItems(imported.planningItems)') &&
  storSrc.includes('restorePressRecords(imported.pressRecords)'));
check('H14: trace.js CHá»ˆ Äá»ŒC â€” khÃ´ng Ä‘áº©y mÃ¢y, khÃ´ng import dashboard/main (trÃ¡nh vÃ²ng import)',
  !traceSrc.includes('firePushSync') && !traceSrc.includes("from './dashboard.js'") && !traceSrc.includes("from './main.js'"));
check('H15: trace.js dÃ¹ng ÄÃšNG hÃ m hiá»ƒn thá»‹ cá»§a cÃ¡c tháº» cÃ´ng Ä‘oáº¡n',
  ['cutDisplay', 'boOngDisplay', 'baoThoDisplay', 'chonNanDisplay', 'baoTinhDisplay', 'pressRecordVolumeOf']
    .every(fn => traceSrc.includes(fn)));
check('H16: tháº» #trace-card cÃ³ class advanced-only (tá»± áº©n vá»›i ngÆ°á»i khÃ´ng cÃ³ quyá»n xem VÃ¹ng NÃ¢ng Cao)',
  /class="planning-card trace-card advanced-only"/.test(idxHtml) &&
  /body:not\(\.can-advanced\) \.advanced-only \{ display: none !important; \}/.test(cssSrc));
check('H17: events.js wire nÃºt #trace-detail-toggle + import toggleTraceDetail',
  evSrc.includes('toggleTraceDetail') && evSrc.includes("safeOn('trace-detail-toggle', 'click', toggleTraceDetail)"));
check('H18: styles.css cÃ³ .trace-detail-toggle + .trace-detail[hidden] + .trace-unlinked-row',
  cssSrc.includes('.trace-detail-toggle') && cssSrc.includes('.trace-detail[hidden] { display: none !important; }') &&
  cssSrc.includes('.trace-unlinked-row'));
check('H19: trace.js láº¥y ÄÃšNG nguá»“n Ä‘o tháº­t tá»«ng loáº¡i (chuá»—i 2 bÆ°á»›c Ã©p vÃ¡n Â· bullig Â· QC)',
  traceSrc.includes('pressRecordVolumeOf') && traceSrc.includes('traceRunNanSticks') &&
  traceSrc.includes('nanPerVtPiece') && traceSrc.includes('TRACE_NAN_PIECE_MAX_VOL') &&
  traceSrc.includes('bulligDisplay') && traceSrc.includes('bulligPlanProductId') &&
  traceSrc.includes('qcThanhPlanProductId') && traceSrc.includes('TRACE_UNLINKED_ID') &&
  traceSrc.includes("basis: 'thanh tháº­t Ã— KL á»‘ng/1 thanh'"));

// â•â•â• I. 4 YÃŠU Cáº¦U Bá»” SUNG (15/10/2026) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// I1. Bá»Ž Cá»˜T "HIá»†U SUáº¤T" â€” chá»‰ giá»¯ hiá»‡u suáº¥t tÃ­nh ngáº§m á»Ÿ cá»™t "náº¿u Ä‘Ãºng ÄM nan"
check('I1: báº£ng mÃ£ KHÃ”NG cÃ²n cá»™t "Hiá»‡u suáº¥t" (thead)',
  !traceSrc.includes('<th class="trace-num">Hiá»‡u suáº¥t</th>') && !prodHtml.includes('>Hiá»‡u suáº¥t<'));
check('I2: báº£ng mÃ£ cÃ²n Ä‘Ãºng 8 cá»™t',
  (prodHtml.match(/<th[ >]/g) || []).length === 8 && prodHtml.includes('>MÃ£ vÃ¡n / thanh / Bullig<'));
check('I3: váº«n giá»¯ cá»™t Ä‘á»‘i chiáº¿u "Kg tÆ°Æ¡i / 1 mÂ³ (náº¿u Ä‘Ãºng ÄM nan)" (tÃ­nh ngáº§m báº±ng ÄM + hiá»‡u suáº¥t)',
  traceSrc.includes('náº¿u Ä‘Ãºng ÄM nan') && traceSrc.includes('kgPerM3LyThuyet'));
check('I4: hiá»‡u suáº¥t CHá»ˆ náº±m trong tooltip cá»§a Ã´ tÃªn mÃ£ (khÃ´ng hiá»ƒn thá»‹ ra ngoÃ i)',
  traceSrc.includes('Hiá»‡u suáº¥t chuyá»ƒn Ä‘á»•i nan khai trong Ä‘á»‹nh má»©c') &&
  traceSrc.includes('title="${escapeHTML(nameTitle(r))}"') &&
  !prodHtml.includes('Â· ÄM ') && !prodHtml.includes('>70%<'));

// I2. BANNER "ÄANG XÃ‚Y Dá»°NG" + nÃºt ? chá»©a toÃ n bá»™ giáº£i thÃ­ch
check('I5: index.html cÃ³ BANNER cáº£nh bÃ¡o "Ä‘ang trong quÃ¡ trÃ¬nh xÃ¢y dá»±ng"',
  idxHtml.includes('class="trace-wip-banner"') &&
  idxHtml.includes('Chá»©c nÄƒng Ä‘ang trong quÃ¡ trÃ¬nh xÃ¢y dá»±ng â€” káº¿t quáº£ cÃ³ thá»ƒ chÆ°a Ä‘Ãºng, hÃ£y chá» admin sá»­a chá»¯a.'));
check('I6: styles.css cÃ³ khá»‘i .trace-wip-banner (ná»n vÃ ng + viá»n nÃ©t Ä‘á»©t)',
  cssSrc.includes('.trace-wip-banner') && cssSrc.includes('#fef3c7') && cssSrc.includes('#f59e0b'));
check('I7: cÃ³ nÃºt #trace-help-btn chá»©a toÃ n bá»™ CÃ”NG THá»¨C + giáº£i thÃ­ch trong tooltip',
  idxHtml.includes('id="trace-help-btn"') &&
  idxHtml.includes('CÃ´ng thá»©c: Thá»ƒ tÃ­ch 1 Ä‘Æ¡n vá»‹ = DÃ i Ã— Rá»™ng Ã— DÃ y Ã· 1.000.000.000'));
check('I8: khá»‘i .trace-note KHÃ”NG CÃ’N (chÃº thÃ­ch Ä‘Ã£ chuyá»ƒn háº¿t vÃ o tooltip / nÃºt ?)',
  !idxHtml.includes('class="trace-note"') && !cssSrc.includes('.trace-note {'));
check('I9: dÃ²ng chÃº dÆ°á»›i tÃªn mÃ£ Ä‘Ã£ thu gá»n (chá»‰ ÄVT Â· lÆ°á»£t Â· %, cÃ²n láº¡i á»Ÿ tooltip)',
  !traceSrc.includes('Â· phÃ¢n bá»• theo ') && traceSrc.includes('PhÃ¢n bá»• theo: ') &&
  traceSrc.includes('Nguá»“n sá»‘ Ä‘o: '));

// I3. VÃ™NG NÃ‚NG CAO BIá»‚U Äá»’ â€” ÄÃƒ XÃ“A Háº²N (khÃ´ng pháº£i áº©n)
const expSrc = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const permSrc = fs.readFileSync(new URL('../js/permissions.js', import.meta.url), 'utf8');
check('I10: index.html KHÃ”NG cÃ²n nÃºt + khung lÆ°á»›i + option "NÃ¢ng Cao" cá»§a builder',
  !idxHtml.includes('btn-add-chart-advanced') &&
  !idxHtml.includes('advanced-charts-grid') &&
  !idxHtml.includes('id="builder-zone"') &&
  !idxHtml.includes('NÃ¢ng Cao (Admin/BQL)'));
check('I11: dashboard.js KHÃ”NG cÃ²n code render/kÃ©o-tháº£ vÃ¹ng nÃ¢ng cao + Ã©p builder vá» basic',
  !dashSrc.includes('advanced-charts-grid') && !dashSrc.includes('btn-add-chart-advanced') &&
  !dashSrc.includes("zone === 'advanced'") && dashSrc.includes("const zone = 'basic';"));
check('I12: events.js KHÃ”NG cÃ²n wire nÃºt "Táº¡o Biá»ƒu Äá»“ NÃ¢ng Cao"', !evSrc.includes('btn-add-chart-advanced'));
check('I13: permissions.js ÄÃƒ XOÃ hÃ m canEditChartZone', !permSrc.includes('function canEditChartZone'));
check('I14: biá»ƒu Ä‘á»“ vÃ¹ng nÃ¢ng cao cÅ© ÄÃƒ Dá»ŒN háº³n (backup trÆ°á»›c khi xÃ³a + tombstone)',
  expSrc.includes("captureAutoBackup(`TrÆ°á»›c khi dá»n") && expSrc.includes("trackDeleted('customCharts'") &&
  expSrc.includes("c.zone !== 'advanced'"));

// â•â•â• J. HIá»†U CHUáº¨N Ká»² THIáº¾U + CHUáº¨N HÃ“A Cá»  + Cáº¢NH BÃO (15/10/2026) â•â•
// J1. CHUáº¨N HÃ“A Cá»  â€” má»i kÃ½ tá»± phÃ¢n cÃ¡ch (x / Ã— / * / dáº¥u cÃ¡ch) vá» cÃ¹ng má»™t khÃ³a
check('J1: chuáº©n hÃ³a cá»¡ â€” "1200x340x18" / " 1200 * 340 * 18 " Ä‘á»u vá» "1200Ã—340Ã—18"',
  trace.traceNormSize('1200x340x18') === '1200Ã—340Ã—18' &&
  trace.traceNormSize(' 1200 * 340 * 18 ') === '1200Ã—340Ã—18' &&
  trace.traceNormSize('1200Ã—340Ã—18') === '1200Ã—340Ã—18');
check('J2: chuá»—i khÃ´ng pháº£i kÃ­ch thÆ°á»›c â†’ giá»¯ nguyÃªn (Ä‘Ã£ cáº¯t khoáº£ng tráº¯ng)',
  trace.traceNormSize('  lÃ´ K10  ') === 'lÃ´ K10');

// J2. Cá»¬A Sá»” THAM CHIáº¾U = cÃ¡c THÃNG Äáº¦Y Äá»¦ (thÃ¡ng 9 thiáº¿u cáº¯t/bá»•/bÃ o thÃ´ â†’ loáº¡i)
const refW = trace.traceReferenceWindow();
check('J3: cá»­a sá»• tham chiáº¿u = Ä‘Ãºng thÃ¡ng Ä‘áº§y Ä‘á»§ 2026-10 Â· nhÃ£n "T10/2026"',
  refW.complete === true && refW.months.length === 1 && refW.months[0] === '2026-10' && refW.label === 'T10/2026');
check('J4: há»‡ sá»‘ tham chiáº¿u = há»‡ sá»‘ chuá»—i cá»§a thÃ¡ng Ä‘áº§y Ä‘á»§', near(refW.kgPerThanh, KPT, 0.0001));

// J3. Ká»² THIáº¾U Dá»® LIá»†U Äáº¦U VÃ€O â†’ MÆ¯á»¢N há»‡ sá»‘ + Gáº®N Cá»œ (thay vÃ¬ ra 0 / sá»‘ áº£o)
state.materialRates = [
  { id: 'rate-van', product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m',
    nan1: '1250Ã—18Ã—7', nan1Qty: 40, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 }
];
state.xuong2BulligRecords = []; state.qcFinalRecords = [];
state.pressRecords = [
  { id: 'p-dec', date: '2026-12-05', week: 'Tuáº§n 49', year: 2026, productId: 'rate-van', finishedQty: 100,
    vanTho: [{ vtDim: '1200x382x12', vtQty: 100 }],
    sticks: [{ nanKey: '1250Ã—18Ã—7', sticks: 5000 }] }
];
setPeriod('month', '2026-12', '');
const pDec = trace.traceProductRows();
check('J5: ká»³ 2026-12 KHÃ”NG cÃ³ cáº¯t/bá»•/bÃ o thÃ´ â†’ MÆ¯á»¢N há»‡ sá»‘ tham chiáº¿u (useRef)',
  pDec.useRef === true && near(pDec.kgPerThanh, KPT, 0.0001) && pDec.refLabel === 'T10/2026');
check('J6: kg tÆ°Æ¡i ká»³ thiáº¿u váº«n tÃ­nh Ä‘Æ°á»£c = thanh tháº­t Ã— há»‡ sá»‘ tham chiáº¿u (5.000 Ã— KPT)',
  near(pDec.rows[0].tuoiKg, 5000 * KPT, 0.5) && pDec.rows[0].basis.includes('há»‡ sá»‘ tham chiáº¿u T10/2026') &&
  pDec.periodComplete === false);
trace.renderTraceCard();
check('J7: (B2) chip div ÄÃƒ Gá»  â€” ná»™i dung "ká»³ thiáº¿u Ä‘áº§u vÃ o" chuyá»ƒn vÃ o tooltip Ã´ KPI',
  !els.get('trace-kpis').innerHTML.includes('trace-ref-chip') &&
  els.get('trace-kpis').innerHTML.includes('Ká»² THIáº¾U Äáº¦U VÃ€O') &&
  els.get('trace-kpis').innerHTML.includes('Cá»¬A Sá»” THAM CHIáº¾U T10/2026') &&
  els.get('trace-kpis').innerHTML.includes('trace-size-btn'));

// J4. VÃN THÃ” GHI SAI Cá»  â†’ Cáº¢NH BÃO Cá»¨NG (trÆ°á»›c Ä‘Ã¢y im láº·ng bá» qua)
state.pressRecords.push({ id: 'p-bad', date: '2026-12-06', week: 'Tuáº§n 49', year: 2026,
  productId: 'rate-van', finishedQty: 5, vanTho: [], sticks: [{ nanKey: '1200Ã—999Ã—18', sticks: 10 }] });
const pBad = trace.traceProductRows();
check('J8: táº¥m vÃ¡n thÃ´ ghi cá»¡ KHÃ”NG khá»›p â†’ Äáº¾M VÃ€O Cáº¢NH BÃO (khÃ´ng im láº·ng bá» qua)',
  pBad.unmatchedTotal === 10 && pBad.rows.find(r => r.productId === 'rate-van').unmatchedPieces === 10);
trace.renderTraceCard();
const prodHtmlBad = els.get('trace-products').innerHTML;
check('J9: báº£ng hiá»‡n Dáº¢I Cáº¢NH BÃO Ä‘á» + chip "âš  cá»¡ lá»‡ch" trÃªn dÃ²ng mÃ£',
  prodHtmlBad.includes('trace-warn') && prodHtmlBad.includes('KHÃ”NG khá»›p lÆ°á»£t táº¡o vÃ¡n thÃ´ nÃ o') &&
  prodHtmlBad.includes('trace-tag-warn') && prodHtmlBad.includes('âš  cá»¡ lá»‡ch'));

// J5. NAN MUA NGOÃ€I â€” Ä‘áº¿m riÃªng, KHÃ”NG cá»™ng vÃ o chuá»—i, cÃ³ Ã´ quy Ä‘á»•i tÆ°Æ¡ng Ä‘Æ°Æ¡ng
state.pressRecords = state.pressRecords.filter(r => r.id === 'p-dec');
// GIá»® NGUYÃŠN cÃ¡c lÆ°á»£t chá»n nan cÅ© (cn-1..3 thuá»™c thÃ¡ng 10) â€” chá»‰ THÃŠM 1 lÆ°á»£t
// nan MUA NGOÃ€I á»Ÿ thÃ¡ng 12 (náº¿u thay cáº£ máº£ng sáº½ lÃ m thÃ¡ng 10 máº¥t dá»¯ liá»‡u bÃ o thÃ´
// â†’ cá»­a sá»• tham chiáº¿u rá»—ng, áº£nh hÆ°á»Ÿng cÃ¡c kiá»ƒm thá»­ sau).
state.xuong2ChonNanThoRecords = (state.xuong2ChonNanThoRecords || []).concat([
  { id: 'cn-ext', baothoId: '', date: '2026-12-05', dims: [1250, 18, 7], unitVol: 0.0001575,
    quantity: 800, cls: 'A', external: true }
]);
const cDec = trace.traceChainData();
check('J10: nan MUA NGOÃ€I Ä‘áº¿m riÃªng (800 thanh) vÃ  KHÃ”NG láº«n vÃ o thanh ná»™i bá»™ chuá»—i',
  near(cDec.chonNanExtThanh, 800, 0.5) && cDec.chonNanThanh === 0);
trace.renderTraceCard();
check('J11: KPI cÃ³ Ã´ "Nan mua ngoÃ i (ngoÃ i chuá»—i)" kÃ¨m quy Ä‘á»•i tÆ°Æ¡ng Ä‘Æ°Æ¡ng kg tÆ°Æ¡i',
  els.get('trace-kpis').innerHTML.includes('Nan mua ngoÃ i (ngoÃ i chuá»—i)') &&
  els.get('trace-kpis').innerHTML.includes('theo há»‡ sá»‘ chuá»—i'));

// J6. Äá»˜ Há»¢P LÃ Váº¬T LÃ â€” kg tÆ°Æ¡i/1 thanh nan khÃ´ng cÃ²n con sá»‘ vÃ´ lÃ½ (0,02 kg)
check('J12: kg tÆ°Æ¡i / 1 thanh nan náº±m trong khoáº£ng há»£p lÃ½ 0,1â€“5 kg',
  pDec.kgPerThanh > 0.1 && pDec.kgPerThanh < 5);

// â•â•â• K. KHá»I LÆ¯á»¢NG BÃŒNH QUÃ‚N THEO Tá»ªNG Cá»  THANH (15/10/2026) â•â•â•â•
// Chuá»—i máº«u: 1 lÃ´ cáº¯t (10.000 kg vÃ o â†’ 5.000 kg á»‘ng luá»“ng) â†’ 1 lÆ°á»£t bá»•
// (5.000 kg á»‘ng Ä‘em bá»•, 200 kg á»‘ng loáº¡i â‡’ 4.800 kg á»‘ng bá»• Ä‘áº¡t) â†’ 1 lÆ°á»£t bÃ o thÃ´
// â†’ 2 cá»¡ chá»n nan: 1.000 thanh 1250Ã—18Ã—7 (0,0001575 mÂ³) + 1.000 thanh 1250Ã—24Ã—8
// (0,00024 mÂ³) â‡’ kg cá»§a nhÃ³m chia theo Tá»ˆ TRá»ŒNG THá»‚ TÃCH.
state.materialRates = [
  { id: 'rate-van', product: '1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m',
    nan1: '1250Ã—18Ã—7', nan1Qty: 40, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 }
];
state.materialRecords = [
  { id: 'mat-k', date: '2026-10-05', location: 'xuong-2', type: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿', weight: 10000 }
];
state.xuong2CutRecords = [
  { id: 'cut-k', materialId: 'mat-k', date: '2026-10-05', inputWeight: 10000, klOngLuong: 5000, klCuiDot: 0, klCayLoai: 0 }
];
state.xuong2BoOngRecords = [
  { id: 'bo-k', cutId: 'cut-k', date: '2026-10-05', inputOng: 5000, klOngLoai: 200, klOngBo: 4800 }
];
state.xuong2BaoThoRecords = [
  { id: 'bt-k', boOngId: 'bo-k', date: '2026-10-05', daiText: '1250', rongText: '18', dayText: '7' }
];
state.xuong2ChonNanThoRecords = [
  { id: 'cn-k1', baothoId: 'bt-k', date: '2026-10-05', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 1000, cls: 'A', external: false },
  { id: 'cn-k2', baothoId: 'bt-k', date: '2026-10-05', dims: [1250, 24, 8], unitVol: 0.00024, quantity: 1000, cls: 'A', external: false },
  { id: 'cn-k3', baothoId: 'bt-k', date: '2026-10-05', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 300, cls: 'reject', external: false },
  { id: 'cn-k4', baothoId: '', date: '2026-10-05', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 500, cls: 'A', external: true }
];
state.pressRecords = [];
state.xuong2BulligRecords = [];
state.qcFinalRecords = [];
setPeriod('month', '2026-10', '');

// Tá»‰ trá»ng thá»ƒ tÃ­ch: 1250Ã—18Ã—7 = 0,1575 Â· 1250Ã—24Ã—8 = 0,24 (mÂ³ cho 1.000 thanh)
const VOL_A = 0.1575, VOL_B = 0.24, VOL_SUM = VOL_A + VOL_B;
// (B1 â€” 15/10/2026) KL tÆ°Æ¡i = KL á»‘ng LUá»’NG (5.000 kg) Ã· tá»· lá»‡ á»‘ng/tÆ°Æ¡i 50% = 10.000
// â€” SUY RA Tá»ª á»NG (trÆ°á»›c Ä‘Ã¢y tÃ­nh tá»« kg á»‘ng Bá»” Äáº T 4.800 â†’ 9.600, lá»‡ch pha vá»›i cá»™t á»‘ng).
const KG_LUONG_GROUP = 5000;          // kg á»‘ng luá»“ng cá»§a lÃ´ cáº¯t â€” CÆ  Sá»ž
const KG_TUOI_GROUP = KG_LUONG_GROUP / 0.5;   // kg tÆ°Æ¡i suy ra = á»‘ng Ã· tá»· lá»‡ á»‘ng/tÆ°Æ¡i

const sizeData = trace.traceOngSizeRows();
const szA = sizeData.rows.find(r => r.sizeKey === '1250Ã—18Ã—7');
const szB = sizeData.rows.find(r => r.sizeKey === '1250Ã—24Ã—8');
check('K1: gom Ä‘Ãºng 2 cá»¡ (bá» "Loáº¡i háº³n" vÃ  nan mua ngoÃ i) Â· tá»•ng thanh = 2.000',
  sizeData.rows.length === 2 && !!szA && !!szB && near(sizeData.totalThanh, 2000, 0.5) &&
  near(sizeData.knownThanh, 2000, 0.5));
check('K2: Má»–I Cá»  Má»˜T KHá»I LÆ¯á»¢NG RIÃŠNG â€” cá»¡ dÃ y hÆ¡n (1250Ã—24Ã—8) náº·ng hÆ¡n',
  szB.kgPerThanhTuoi > szA.kgPerThanhTuoi && szB.kgPerThanhLuong > szA.kgPerThanhLuong);
check('K3: KL tÆ°Æ¡i/thanh Ä‘Ãºng theo tá»‰ trá»ng thá»ƒ tÃ­ch (nhÃ³m ' + KG_TUOI_GROUP + ' kg tÆ°Æ¡i)',
  near(szA.kgPerThanhTuoi, (KG_TUOI_GROUP * (VOL_A / VOL_SUM)) / 1000, 0.001) &&
  near(szB.kgPerThanhTuoi, (KG_TUOI_GROUP * (VOL_B / VOL_SUM)) / 1000, 0.001));
check('K4: KL luá»“ng tÆ°Æ¡ng Ä‘Æ°Æ¡ng/thanh quy vá» Cáº®T CHá»ŒN (nhÃ³m ' + KG_LUONG_GROUP + ' kg á»‘ng luá»“ng)',
  near(szA.kgPerThanhLuong, (KG_LUONG_GROUP * (VOL_A / VOL_SUM)) / 1000, 0.001) &&
  near(szB.kgPerThanhLuong, (KG_LUONG_GROUP * (VOL_B / VOL_SUM)) / 1000, 0.001));
check('K5: tá»· lá»‡ giá»¯a 2 dÃ²ng = KL á»‘ng luá»“ng Ã· KL tÆ°Æ¡i cá»§a nhÃ³m (5.000 Ã· 10.000 â€” tÆ°Æ¡i SUY Tá»ª á»‘ng)',
  near(szA.kgPerThanhLuong / szA.kgPerThanhTuoi, KG_LUONG_GROUP / KG_TUOI_GROUP, 0.001));
check('K6: "Loáº¡i háº³n" vÃ  nan MUA NGOÃ€I Ä‘áº¿m riÃªng, KHÃ”NG vÃ o báº£ng cá»¡',
  near(sizeData.rejectThanh, 300, 0.5) && near(sizeData.externalThanh, 500, 0.5) &&
  !sizeData.rows.some(r => String(r.sizeKey).includes('reject')));
check('K7: bÃ¬nh quÃ¢n chung = tá»•ng kg Ã· tá»•ng thanh cá»§a cÃ¡c cá»¡ ÄO ÄÆ¯á»¢C',
  near(sizeData.kgPerThanhTuoi, KG_TUOI_GROUP / 2000, 0.001) &&
  near(sizeData.kgPerThanhLuong, KG_LUONG_GROUP / 2000, 0.001));

// Máº¤T LINK: lÆ°á»£t chá»n nan cÃ³ baothoId khÃ´ng tá»“n táº¡i â†’ dÃ²ng "KhÃ´ng rÃµ", KHÃ”NG vÃ o bÃ¬nh quÃ¢n
state.xuong2ChonNanThoRecords = state.xuong2ChonNanThoRecords.concat([
  { id: 'cn-k5', baothoId: 'bt-khong-ton-tai', date: '2026-10-05', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 400, cls: 'A', external: false }
]);
const sizeData2 = trace.traceOngSizeRows();
const szUnk = sizeData2.rows.find(r => r.isUnknown);
check('K8: máº¥t link â†’ dÃ²ng "KhÃ´ng rÃµ (máº¥t link)" giá»¯ sá»‘ thanh, kg Ä‘á»ƒ trá»‘ng',
  !!szUnk && near(szUnk.thanh, 400, 0.5) && szUnk.kgPerThanhTuoi === null &&
  sizeData2.rows[sizeData2.rows.length - 1].isUnknown === true);
check('K9: dÃ²ng "KhÃ´ng rÃµ" KHÃ”NG tÃ­nh vÃ o máº«u sá»‘ bÃ¬nh quÃ¢n (sá»‘ khÃ´ng bá»‹ há»¥t)',
  near(sizeData2.knownThanh, 2000, 0.5) && near(sizeData2.totalThanh, 2400, 0.5) &&
  near(sizeData2.kgPerThanhTuoi, KG_TUOI_GROUP / 2000, 0.001));
state.xuong2ChonNanThoRecords = state.xuong2ChonNanThoRecords.filter(r => r.id !== 'cn-k5');

// GIAO DIá»†N: panel ná»•i má»Ÿ tá»« Ã´ KPI
// (stub: getElementById má»›i táº¡o pháº§n tá»­ â†’ pháº£i gá»i qua document, khÃ´ng dÃ¹ng els.get)
const panelEl = () => document.getElementById(trace.TRACE_SIZE_PANEL_ID);
panelEl().hidden = true;   // mÃ´ phá»ng thuá»™c tÃ­nh `hidden` sáºµn cÃ³ trong index.html
trace.renderTraceCard();
check('K10: Ã´ KPI "Kg tÆ°Æ¡i / 1 thanh nan" lÃ  NÃšT má»Ÿ panel (aria + nhÃ£n "chi tiáº¿t theo cá»¡")',
  els.get('trace-kpis').innerHTML.includes('id="' + trace.TRACE_SIZE_BTN_ID + '"') &&
  els.get('trace-kpis').innerHTML.includes('chi tiáº¿t theo cá»¡') &&
  els.get('trace-kpis').innerHTML.includes('aria-controls="' + trace.TRACE_SIZE_PANEL_ID + '"'));
check('K11: panel ÄÃ“NG máº·c Ä‘á»‹nh', panelEl().hidden === true &&
  trace.traceSizePanelOpen() === false);
trace.toggleTraceSizePanel();
const panelHtml = panelEl().innerHTML;
check('K12: báº¥m nÃºt â†’ panel Má»ž, cÃ³ báº£ng + 3 cá»™t KL theo thá»© tá»± chuá»—i (á»‘ng cÆ¡ sá»Ÿ Â· tÆ°Æ¡i Â· thá»±c táº¿) + nÃºt Ä‘Ã³ng',
  panelEl().hidden === false && trace.traceSizePanelOpen() === true &&
  panelHtml.includes('trace-size-table') && panelHtml.includes('KL á»‘ng luá»“ng / thanh (cÆ¡ sá»Ÿ)') &&
  panelHtml.includes('KL tÆ°Æ¡i quy Ä‘á»•i / thanh') && panelHtml.includes('KL thanh thá»±c táº¿ â‰ˆ') &&
  panelHtml.includes('trace-size-close'));
check('K13: panel cÃ³ Ä‘á»§ 2 cá»¡ + dÃ²ng Tá»”NG + ghi chÃº tá»‰ trá»ng thá»ƒ tÃ­ch',
  panelHtml.includes('1250Ã—18Ã—7') && panelHtml.includes('1250Ã—24Ã—8') &&
  panelHtml.includes('Tá»”NG 2 cá»¡') && panelHtml.includes('tá»‰ trá»ng thá»ƒ tÃ­ch'));
trace.setTraceSizeQuery('1250Ã—24');
check('K14: tÃ¬m nhanh theo cá»¡ â†’ chá»‰ cÃ²n cá»¡ khá»›p (lá»c trÃªn Báº¢NG, khÃ´ng tÃ­nh placeholder)',
  panelEl().innerHTML.includes('>1250Ã—24Ã—8<') && !panelEl().innerHTML.includes('>1250Ã—18Ã—7<'));
trace.setTraceSizeQuery('');
check('K15: xoÃ¡ Ã´ tÃ¬m â†’ hiá»‡n láº¡i Ä‘á»§ cá»¡',
  panelEl().innerHTML.includes('>1250Ã—18Ã—7<'));
trace.toggleTraceSizePanel();
check('K16: báº¥m láº§n ná»¯a â†’ panel ÄÃ“NG', panelEl().hidden === true &&
  trace.traceSizePanelOpen() === false);

// Cáº¤U TRÃšC: panel ngoÃ i luá»“ng trang (neo inline) + wiring events + CSS
const evSrc2 = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const cssSrc2 = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('K17: index.html cÃ³ khung #trace-size-panel áº©n máº·c Ä‘á»‹nh (ngoÃ i luá»“ng trang)',
  idxHtml.includes('id="' + trace.TRACE_SIZE_PANEL_ID + '"') &&
  /id="trace-size-panel"\s+hidden/.test(idxHtml));
check('K18: trace.js neo panel báº±ng INLINE position/z-index (khÃ´ng phá»¥ thuá»™c stylesheet)',
  traceSrc.includes("panel.style.position = 'absolute'") && traceSrc.includes("panel.style.zIndex = '260'") &&
  traceSrc.includes('function positionTraceSizePanel') && traceSrc.includes('openUp'));
check('K19: events.js wire nÃºt KPI + nÃºt Ä‘Ã³ng + Ã´ tÃ¬m + báº¥m ngoÃ i/Esc + neo láº¡i khi cuá»™n',
  evSrc2.includes('toggleTraceSizePanel') && evSrc2.includes('closeTraceSizePanel') &&
  evSrc2.includes('setTraceSizeQuery') && evSrc2.includes('positionTraceSizePanel, true') &&
  evSrc2.includes("window.addEventListener('resize', positionTraceSizePanel)"));
check('K20: styles.css cÃ³ .trace-size-panel + .trace-kpi-btn + .trace-card position:relative',
  cssSrc2.includes('.trace-size-panel') && cssSrc2.includes('.trace-kpi-btn') &&
  /\.trace-card \{[^}]*position: relative/.test(cssSrc2));

// â•â•â• L. Bá»” SUNG 15/10/2026 â€” CÆ  Sá»ž "KL á»NG LUá»’NG" + Cá»˜T THá»°C Táº¾ Äá»I CHIáº¾U â•â•â•
// (B1) Báº£ng cá»¡ thanh: â‘  á»‘ng luá»“ng (CÆ  Sá»ž) Â· â‘¡ tÆ°Æ¡i = â‘  Ã· tá»· lá»‡ Â· â‘¢ thá»±c táº¿ â‰ˆ thá»ƒ tÃ­chÃ—1000
//      â†’ thá»© tá»± váº­t lÃ½ Ä‘Ãºng: â‘¢ < â‘  < â‘¡ (1250Ã—18Ã—7: 0,158 < 1,98 < 3,96 theo dá»¯ liá»‡u máº«u K)
// (B2) Chip "há»‡ sá»‘ tham chiáº¿u" ÄÃƒ Gá»  khá»i dáº£i KPI â€” ná»™i dung náº±m trong tooltip Ã´ KPI.
{
  const L = trace.traceOngSizeRows();
  const lA = L.rows.find(r => r.sizeKey === '1250Ã—18Ã—7');
  const lB = L.rows.find(r => r.sizeKey === '1250Ã—24Ã—8');
  check('L1: THá»¨ Tá»° Váº¬T LÃ ÄÃšNG â€” thá»±c táº¿ (â‘¢) < á»‘ng luá»“ng (â‘ ) < tÆ°Æ¡i quy Ä‘á»•i (â‘¡), Má»ŒI cá»¡',
    !!lA && !!lB &&
    lA.kgRealTheoLyThuyet < lA.kgPerThanhLuong && lA.kgPerThanhLuong < lA.kgPerThanhTuoi &&
    lB.kgRealTheoLyThuyet < lB.kgPerThanhLuong && lB.kgPerThanhLuong < lB.kgPerThanhTuoi);
  check('L2: KL tÆ°Æ¡i = KL á»‘ng luá»“ng Ã· tá»· lá»‡ á»‘ng/tÆ°Æ¡i (50%) â€” SUY RA Tá»ª á»NG, khÃ´ng tÃ­nh Ä‘á»™c láº­p',
    near(lA.kgPerThanhTuoi, lA.kgPerThanhLuong / 0.5, 0.0001) &&
    near(lB.kgPerThanhTuoi, lB.kgPerThanhLuong / 0.5, 0.0001) &&
    near(L.totalKgTuoi, L.totalKgLuong / 0.5, 0.5));
  check('L3: cá»™t KL THANH THá»°C Táº¾ â‰ˆ = thá»ƒ tÃ­ch 1 thanh Ã— 1.000 (tre tÆ°Æ¡i ~1 kg/L)',
    near(lA.kgRealTheoLyThuyet, 0.1575, 0.0001) && near(lB.kgRealTheoLyThuyet, 0.24, 0.0001));
  // Dá»¯ liá»‡u máº«u K: á»‘ng 1,98 kg/thanh vs lÃ½ thuyáº¿t 0,158 â†’ lá»‡ch 92% > 60% â†’ chip "âš  lá»‡ch"
  trace.renderTraceCard();
  document.getElementById(trace.TRACE_SIZE_PANEL_ID).hidden = true;
  trace.toggleTraceSizePanel();   // má»Ÿ láº¡i Ä‘á»ƒ váº½ HTML má»›i
  const lPanel = document.getElementById(trace.TRACE_SIZE_PANEL_ID).innerHTML;
  check('L4: panel hiá»‡n chip "âš  lá»‡ch" khi KL lÃ½ thuyáº¿t lá»‡ch KL á»‘ng luá»“ng quÃ¡ Â±60% + tooltip giáº£i thÃ­ch',
    lPanel.includes('trace-size-warn') && lPanel.includes('lá»‡ch KL á»‘ng luá»“ng') &&
    lPanel.includes('KL á»‘ng luá»“ng / thanh (cÆ¡ sá»Ÿ)'));
  trace.toggleTraceSizePanel();   // Ä‘Ã³ng láº¡i
}
check('L5: styles.css ÄÃƒ XÃ“A .trace-ref-chip vÃ  THÃŠM .trace-size-warn',
  !cssSrc2.includes('.trace-ref-chip {') && cssSrc2.includes('.trace-size-warn'));
check('L6: trace.js KHÃ”NG cÃ²n sinh div chip (chá»‰ tooltip) â€” khÃ´ng cÃ²n chuá»—i trace-ref-chip trong mÃ£',
  !traceSrc.includes('trace-ref-chip'));

// Bá»” á»NG Sá»” NHÃ“M: khÃ´ng cÃ³ cutId, nÃªn dÃ¹ng KL Ä‘em bá»• Ä‘Ã£ cÃ¢n lÃ m cÆ¡ sá»Ÿ theo cá»¡.
state.materialRecords = [
  { id: 'mat-pool', date: '2026-10-05', location: 'xuong-2', weight: 10000 }
];
state.xuong2CutRecords = [
  { id: 'cut-pool-ratio', date: '2026-10-05', inputWeight: 10000, klOngLuong: 5000 }
];
state.xuong2BoOngRecords = [
  { id: 'bo-pool', cutId: '', poolMode: true, lotOng: 0, inputOng: 500, klOngLoai: 50, date: '2026-10-05' }
];
state.xuong2BaoThoRecords = [
  { id: 'bt-pool', boOngId: 'bo-pool', date: '2026-10-05' }
];
state.xuong2ChonNanThoRecords = [
  { id: 'cn-pool', baothoId: 'bt-pool', date: '2026-10-05', dims: [1250, 18, 7],
    unitVol: 0.0001575, quantity: 1000, cls: 'A', external: false }
];
setPeriod('month', '2026-10', '');
const poolData = trace.traceOngSizeRows();
const poolSize = poolData.rows.find(r => r.sizeKey === '1250Ã—18Ã—7');
check('M1: Bá»• á»ng sá»• nhÃ³m khÃ´ng cÃ³ cutId váº«n tÃ­nh KL theo KL Ä‘em bá»• Ä‘Ã£ cÃ¢n',
  !!poolSize && near(poolSize.kgPerThanhLuong, 0.5, 0.001) &&
  near(poolSize.kgPerThanhTuoi, 1, 0.001) && poolData.knownThanh === 1000);

console.log('Káº¾T QUáº¢: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);

