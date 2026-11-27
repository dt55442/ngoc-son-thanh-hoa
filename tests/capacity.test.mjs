// tests/capacity.test.mjs â€” Kiá»ƒm thá»­ Báº¢NG Tá»”NG Há»¢P CÃ”NG SUáº¤T & HIá»†U SUáº¤T
// (tháº» #capacity-card â€” Ä‘áº§u tab Tá»•ng Quan, js/capacity.js):
//   â€¢ KhÃ³a tuáº§n ISO khá»›p materialWeekLabel + dá»‹ch tuáº§n 2 chiá»u;
//   â€¢ Giá» Ä‘áº¿m ÄÃšNG 1 Láº¦N má»—i (cÃ´ng Ä‘oáº¡n, ca) khi cÃ³ ca; náº¿u khÃ´ng thÃ¬ 1 láº§n/ngÃ y;
//   â€¢ CÃ´ng suáº¥t/Hiá»‡u suáº¥t TUáº¦N = Î£ sáº£n lÆ°á»£ng Ã· Î£ giá» Ã· Ä‘á»‹nh má»©c tuáº§n;
//   â€¢ Äá»‹nh má»©c TUáº¦N váº¯t 2 thÃ¡ng = bÃ¬nh quÃ¢n GIA QUYá»€N theo sáº£n lÆ°á»£ng;
//   â€¢ Chá»n Nan ThÃ´ bá» lÆ°á»£t nan mua ngoÃ i (external); BÃ o ThÃ´ chá» Chá»n Nan ThÃ´ â†’ "â€”";
//   â€¢ Than HÃ³a + Sáº¥y: hiá»‡u suáº¥t = giá» cáº§n Ã· (giá» thá»±c âˆ’ sá»± cá»‘) + ÄM phÃºt/mÂ³ má»—i láº§n;
//   â€¢ Ã‰p VÃ¡n theo mÂ³/h; Hiá»‡u suáº¥t XÆ¯á»žNG bÃ¬nh quÃ¢n gia quyá»n theo giá» + nÃºt tháº¯t;
//   â€¢ 3 táº§ng render (tuáº§n â†’ cÃ´ng Ä‘oáº¡n â†’ ngÃ y) + Ä‘á»•i xÆ°á»Ÿng + thu gá»n + nhá»› UI;
//   â€¢ Sparkline SVG 8 tuáº§n trÃªn mini card; cáº¥u trÃºc index.html/styles.css/sw.js.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-bo-ong.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const approx = (a, b, eps = 1e-6) => Math.abs(Number(a) - Number(b)) < eps;

const { state, STORAGE_KEY_CAPACITY_UI } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'dashboard-view';

const mats = await import('../js/materials.js');
const x2 = await import('../js/xuong2.js');
const cap = await import('../js/capacity.js');

const indexedDisplayState = {
  hrAssignments: state.hrAssignments,
  hrEmployees: state.hrEmployees,
  hrPositions: state.hrPositions,
  materialRecords: state.materialRecords,
  xuong2BoluongRecords: state.xuong2BoluongRecords,
  xuong1CatOngRecords: state.xuong1CatOngRecords,
  pressRecords: state.pressRecords
};
let fullAssignmentFilterCalls = 0, fullAssignmentIterationCalls = 0;
const indexedDisplayAssignments = Array.from({ length: 15000 }, (_, i) => ({
  id: `indexed-noise-${i}`,
  date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
  department: 'XÆ°á»Ÿng 2',
  positionId: 'indexed-unmatched-position',
  employeeId: 'indexed-worker',
  start: '07:00',
  end: '08:00'
}));
indexedDisplayAssignments.push(
  { id: 'indexed-x2', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'indexed-x2-position', employeeId: 'indexed-worker', start: '07:00', end: '08:00' },
  { id: 'indexed-x1', date: '2026-09-10', department: 'XÆ°á»Ÿng 1', positionId: 'indexed-x1-position', employeeId: 'indexed-worker', start: '07:00', end: '08:00' },
  { id: 'indexed-press', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'indexed-press-position', employeeId: 'indexed-worker', start: '07:00', end: '08:00' }
);
state.hrAssignments = new Proxy(indexedDisplayAssignments, {
  get(target, property, receiver) {
    if (property === 'filter') return (...args) => {
      fullAssignmentFilterCalls++;
      return Array.prototype.filter.apply(target, args);
    };
    if (property === 'forEach') return (...args) => {
      fullAssignmentIterationCalls++;
      return Array.prototype.forEach.apply(target, args);
    };
    return Reflect.get(target, property, receiver);
  }
});
state.hrEmployees = [{ id: 'indexed-worker', name: 'Indexed Worker' }];
state.hrPositions = [
  { id: 'indexed-x2-position', name: 'Bá»‘c Luá»“ng', department: 'XÆ°á»Ÿng 2' },
  { id: 'indexed-x1-position', name: 'Cáº¯t á»ng', department: 'XÆ°á»Ÿng 1' },
  { id: 'indexed-press-position', name: 'Ã‰p VÃ¡n', department: 'XÆ°á»Ÿng 2' }
];
state.materialRecords = [];
state.xuong2BoluongRecords = [];
state.xuong1CatOngRecords = [];
state.pressRecords = [{ id: 'indexed-press-record', date: '2026-09-10', fpDim: '100x100x10', finishedQty: 1 }];
const indexedBoluongDisplay = x2.boluongDisplay({
  id: 'indexed-boluong', materialId: 'indexed-material', date: '2026-09-10',
  inputWeight: 100, qty: 100, workHours: 1
});
const indexedCatOngDisplay = x2.x1CatOngDisplay({
  id: 'indexed-cat-ong', materialId: 'indexed-material', date: '2026-09-10',
  inputWeight: 100, klDat: 100
});
const press = await import('../js/press.js');
const indexedPressSnapshot = press.epVanSnapshotOf('2026-09-10');
const indexedPressRows = cap.CAP_STAGES.find(stage => stage.id === 'epvan').rows();
check('HIá»†U NÄ‚NG: tra cá»©u bá»‘ trÃ­ cÃ´ng Ä‘oáº¡n dÃ¹ng chá»‰ má»¥c theo ngÃ y',
  fullAssignmentIterationCalls === 1 && fullAssignmentFilterCalls === 0 &&
  indexedBoluongDisplay.workerRows.some(row => row.name === 'Indexed Worker') &&
  indexedCatOngDisplay.workerRows.some(row => row.name === 'Indexed Worker') &&
  indexedPressSnapshot.hours === 1 && indexedPressRows.length === 1);
state.hrAssignments = indexedDisplayState.hrAssignments;
state.hrEmployees = indexedDisplayState.hrEmployees;
state.hrPositions = indexedDisplayState.hrPositions;
state.materialRecords = indexedDisplayState.materialRecords;
state.xuong2BoluongRecords = indexedDisplayState.xuong2BoluongRecords;
state.xuong1CatOngRecords = indexedDisplayState.xuong1CatOngRecords;
state.pressRecords = indexedDisplayState.pressRecords;

// â”€â”€â”€ A. TUáº¦N ISO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('TUáº¦N: khÃ³a tuáº§n khá»›p materialWeekLabel (chuáº©n chung cá»§a app)',
  cap.capWeekKeyOf('2026-09-10') === mats.materialWeekLabel('2026-09-10'));
const wk = cap.capWeekKeyOf('2026-09-10');
check('TUáº¦N: khÃ³a Ä‘Ãºng dáº¡ng YYYY-Wnn', /^\d{4}-W\d{2}$/.test(wk));
check('TUáº¦N: dá»‹ch âˆ’1 tuáº§n rá»“i +1 tuáº§n â†’ vá» Ä‘Ãºng khÃ³a ban Ä‘áº§u',
  cap.capWeekShift(cap.capWeekShift(wk, -1), 1) === wk);
check('TUáº¦N: nhÃ£n khoáº£ng ngÃ y dáº¡ng dd/MM â€“ dd/MM',
  /^\d{2}\/\d{2} â€“ \d{2}\/\d{2}$/.test(cap.capWeekRangeLabel(wk)));
check('TUáº¦N: sá»‘ tuáº§n khá»›p khÃ³a', cap.capWeekNumOf(wk) === Number(wk.split('-W')[1]));

// helper: ISO tá»« nhÃ£n khoáº£ng tuáº§n (dÃ¹ng Ä‘á»ƒ tÃ¬m tuáº§n váº¯t 2 thÃ¡ng)
function isoFromRangeLabel(lbl, year) {
  const m = /^(\d{2})\/(\d{2}) â€“ (\d{2})\/(\d{2})$/.exec(String(lbl || ''));
  if (!m) return null;
  return [`${year}-${m[2]}-${m[1]}`, `${year}-${m[4]}-${m[3]}`];
}

// â”€â”€â”€ B. Cáº®T CHá»ŒN: giá» Ä‘áº¿m 1 Láº¦N/ngÃ y + cÃ´ng suáº¥t/hiá»‡u suáº¥t tuáº§n â”€â”€
state.materialRecords = [
  { id: 'mat-a', type: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿', location: 'xuong-2', weight: 1000, date: '2026-09-10' },
  { id: 'mat-b', type: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿', location: 'xuong-2', weight: 500, date: '2026-09-10' },
  { id: 'mat-c', type: 'Luá»“ng á»‘ng', supplier: 'NhÃ  Trung', location: 'xuong-2', weight: 800, date: '2026-09-11' }
];
state.xuong2CutRecords = [
  { id: 'c1', materialId: 'mat-a', date: '2026-09-10', cutHours: 5 },
  { id: 'c2', materialId: 'mat-b', date: '2026-09-10', cutHours: 5 },
  { id: 'c3', materialId: 'mat-c', date: '2026-09-11', cutHours: 4 }
];
const cutSt = cap.CAP_STAGES.find(s => s.id === 'cut');
const cutDays = cap.capStageDayRows(cutSt, wk);
check('Cáº®T: 2 ngÃ y cÃ³ dá»¯ liá»‡u trong tuáº§n (10/09 vÃ  11/09)', cutDays.length === 2);
check('Cáº®T: ngÃ y 10/09 cÃ³ 2 lÆ°á»£t nhÆ°ng GIá»œ chá»‰ Ä‘áº¿m 1 Láº¦N = 5h (khÃ´ng nhÃ¢n Ä‘Ã´i)',
  cutDays[0].turns === 2 && cutDays[0].hours === 5);
check('Cáº®T: sáº£n lÆ°á»£ng ngÃ y 10/09 = 1.500 kg (Ä‘Æ¡n vá»‹ sáº£n lÆ°á»£ng kg, khÃ´ng cÃ²n xe)',
  Math.abs(cutDays[0].qty - 1500) < 1e-9);
const cutRow = cap.capStageWeekRow(cutSt, wk); // CHÆ¯A cÃ³ ÄM â€” dÃ¹ng kiá»ƒm tra sá»‘ thÃ´
check('Cáº®T: tuáº§n = 3 lÆ°á»£t Â· 2.300 kg Â· 9 giá» (5 + 4)',
  cutRow.turns === 3 && cutRow.qty === 2300 && cutRow.hours === 9);
check('Cáº®T: chÆ°a cÃ³ ÄM â†’ hiá»‡u suáº¥t tuáº§n "â€”"', cutRow.eff == null);
// Äá»‹nh má»©c CÅ¨ khai 300 kg/h â†’ tá»± quy Ä‘á»•i Ã· 600 = 0,5 xe/h (hiá»‡u suáº¥t KHÃ”NG Ä‘á»•i)
state.x2CapRates = { '2026-09': 300 };
const cutRowRated = cap.capStageWeekRow(cutSt, wk);
check('Cáº®T: cÃ´ng suáº¥t tuáº§n = 2.300 kg Ã· 9h â‰ˆ 255,56 kg/h',
  approx(cutRowRated.cap, 2300 / 9));
check('Cáº®T: ÄM cÅ© 300 kg/h â†’ 0,5 xe/h Â· hiá»‡u suáº¥t tuáº§n váº«n â‰ˆ 85,2%',
  approx(cutRowRated.rate, 0.5) &&
  approx(cutRowRated.eff, ((2300 / 9) / 600) / 0.5 * 100, 1e-4));
check('EXPORT: 6 hÃ m Ä‘á»c Ä‘á»‹nh má»©c Ä‘Ã£ export tá»« xuong2.js (1 nguá»“n chÃ¢n lÃ½)',
  typeof x2.capRateOf === 'function' && typeof x2.bulligRateOf === 'function' &&
  typeof x2.boOngRateOf === 'function' && typeof x2.baoThoRateOf === 'function' &&
  typeof x2.chonNanRateOf === 'function' && typeof x2.baoTinhRateOf === 'function');

// â”€â”€â”€ C. Bá»” á»NG: Äá»‹nh má»©c TUáº¦N váº¯t 2 thÃ¡ng = bÃ¬nh quÃ¢n theo sáº£n lÆ°á»£ng â”€â”€
let straddle = null;
{
  let cursor = cap.capWeekKeyOf('2026-09-05');
  for (let i = 0; i < 10 && !straddle; i++) {
    const pair = isoFromRangeLabel(cap.capWeekRangeLabel(cursor), cap.capWeekYearOf(cursor));
    if (pair && pair[0].slice(0, 7) !== pair[1].slice(0, 7)) straddle = { wk: cursor, d1: pair[0], d2: pair[1] };
    cursor = cap.capWeekShift(cursor, 1);
  }
}
check('TUáº¦N: tÃ¬m Ä‘Æ°á»£c tuáº§n váº¯t 2 thÃ¡ng quanh thÃ¡ng 9/2026', !!straddle);
state.xuong2BoOngRecords = [
  { id: 'b1', date: straddle.d1, inputOng: 600, workHours: 6 },
  { id: 'b2', date: straddle.d2, inputOng: 400, workHours: 4 }
];
const m1 = straddle.d1.slice(0, 7), m2 = straddle.d2.slice(0, 7);
state.x2BoOngRates = { [m1]: 100, [m2]: 200 };
const boongSt = cap.CAP_STAGES.find(s => s.id === 'boong');
const boongRow = cap.capStageWeekRow(boongSt, straddle.wk);
check('Bá»” á»NG: Ä‘á»‹nh má»©c tuáº§n = (600Ã—100 + 400Ã—200) Ã· 1.000 = 140 kg/h', approx(boongRow.rate, 140));
check('Bá»” á»NG: cÃ´ng suáº¥t tuáº§n = 1.000 Ã· 10 = 100 kg/h', approx(boongRow.cap, 100));
check('Bá»” á»NG: hiá»‡u suáº¥t tuáº§n = 100 Ã· 140 â‰ˆ 71,4%', approx(boongRow.eff, (100 / 140) * 100, 1e-4));

// â”€â”€â”€ D. CHá»ŒN NAN THÃ”: bá» lÆ°á»£t nan mua ngoÃ i (external) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.xuong2BaoThoRecords = [
  { id: 'bt-cap-cn', date: '2026-08-01', shiftIdx: null, workHours: 4 }
];
state.xuong2ChonNanThoRecords = [
  { id: 'cn1', baothoId: 'bt-cap-cn', date: '2026-09-10', dims: [1250, 80, 7], quantity: 200, shiftIdx: null, workHours: 4 },
  { id: 'cn2', date: '2026-09-10', dims: [1250, 80, 7], quantity: 100, external: true, workHours: 4 }
];
state.x2ChonNanRates = { '2026-09': 60 };
const cnSt = cap.CAP_STAGES.find(s => s.id === 'chonnan');
const cnRow = cap.capStageWeekRow(cnSt, wk);
check('CHá»ŒN NAN: chá»‰ cá»™ng pháº§n sang BÃ o ThÃ´ (bá» external) â†’ 200 thanh Â· 2 lÆ°á»£t', cnRow.qty === 200 && cnRow.turns === 2);
check('CHá»ŒN NAN: giá» Ä‘áº¿m 1 láº§n/ngÃ y = 4h', cnRow.hours === 4);
check('CHá»ŒN NAN: hiá»‡u suáº¥t = (200Ã·4) Ã· 60 â‰ˆ 83,3%', approx(cnRow.eff, (200 / 4) / 60 * 100, 1e-4));

// â”€â”€â”€ E. BÃ€O THÃ”: chá» Chá»n Nan ThÃ´ â†’ sáº£n lÆ°á»£ng "â€”" (khÃ´ng bá»‹a sá»‘) â”€â”€
state.xuong2BaoThoRecords = [
  { id: 'bt1', date: '2026-09-10', daiText: '1250', rongText: '80', dayText: '12', workHours: 3 },
  { id: 'bt-cap-cn', date: '2026-08-01', shiftIdx: null, workHours: 4 }
];
state.x2BaoThoRates = {}; // chÆ°a khai Ä‘á»‹nh má»©c
const bthSt = cap.CAP_STAGES.find(s => s.id === 'baotho');
const bthRow = cap.capStageWeekRow(bthSt, wk);
check('BÃ€O THÃ”: chÆ°a link Chá»n Nan ThÃ´ â†’ qty null (khÃ´ng bá»‹a sá»‘)', bthRow.qty == null && bthRow.qtyKnown === false);
check('BÃ€O THÃ”: cÃ´ng suáº¥t + hiá»‡u suáº¥t Ä‘á»u "â€”"', bthRow.cap == null && bthRow.eff == null);

// â”€â”€â”€ E1. CÃ”NG ÄOáº N GHI Sáº¢N LÆ¯á»¢NG THEO CA: tá»•ng giá» pháº£i cá»™ng theo CA â”€â”€
const shiftDate = '2026-09-11';
const shiftWeek = cap.capWeekKeyOf(shiftDate);
const baselineBoOngRecords = state.xuong2BoOngRecords;
const baselineBoOngRates = state.x2BoOngRates;
const baselineBaoThoRecords = state.xuong2BaoThoRecords;
const baselineBaoThoRates = state.x2BaoThoRates;
const baselineChonNanRecords = state.xuong2ChonNanThoRecords;
const baselineChonNanRates = state.x2ChonNanRates;
state.hrAssignments = [];
state.xuong2BoOngRecords = [
  { id: 'bo-s0a', date: shiftDate, shiftIdx: 0, inputOng: 500, workHoursHC: 10.5, workHoursTC: 0 },
  { id: 'bo-s0b', date: shiftDate, shiftIdx: 0, inputOng: 300, workHoursHC: 10.5, workHoursTC: 0 },
  { id: 'bo-s1', date: shiftDate, shiftIdx: 1, inputOng: 1200, workHoursHC: 5.5, workHoursTC: 0 }
];
state.x2BoOngRates = { '2026-09': 100 };
const boOngShiftDays = cap.capStageDayRows(boongSt, shiftWeek);
const boOngShiftRow = cap.capStageWeekRow(boongSt, shiftWeek);
check('Bá»” á»NG: ngÃ y ghi riÃªng 2 ca â†’ chi tiáº¿t cÃ³ 2 hÃ ng ca, giá» cá»§a ca láº·p nhiá»u lÆ°á»£t chá»‰ Ä‘áº¿m 1 láº§n',
  boOngShiftDays.length === 2 &&
  boOngShiftDays[0].shiftIdx === 0 && boOngShiftDays[0].turns === 2 &&
  boOngShiftDays[0].qty === 800 && boOngShiftDays[0].hours === 10.5 &&
  boOngShiftDays[1].shiftIdx === 1 && boOngShiftDays[1].qty === 1200 &&
  boOngShiftDays[1].hours === 5.5);
check('Bá»” á»NG: tá»•ng tuáº§n chia 2.000 kg cho tá»•ng 16h (khÃ´ng chá»‰ 10,5h ca ngÃ y)',
  boOngShiftRow.qty === 2000 && boOngShiftRow.hours === 16 &&
  approx(boOngShiftRow.cap, 125) && approx(boOngShiftRow.eff, 125));
const baselineStageIncidents = state.x2StageIncidents;
const baselineIncidentReports = state.x2IncidentReports;
state.x2StageIncidents = { 'boong|2026-09-11': 2 };
state.x2IncidentReports = [];
const boOngIncidentRow = cap.capStageWeekRow(boongSt, shiftWeek);
check('Bá»” á»NG: 2h sá»± cá»‘ theo ngÃ y phÃ¢n bá»• theo tá»‰ lá»‡ ca vÃ  chá»‰ trá»« Ä‘Ãºng 2h trong tá»•ng ká»³',
  approx(boOngIncidentRow.days.reduce((sum, day) => sum + day.incident, 0), 2) &&
  approx(boOngIncidentRow.cap, 2000 / 14));
state.xuong2BoOngRecords = [
  { id: 'bo-no-hours-s0', date: shiftDate, shiftIdx: 0, inputOng: 500, workHoursHC: 0, workHoursTC: 0 },
  { id: 'bo-no-hours-s1', date: shiftDate, shiftIdx: 1, inputOng: 500, workHoursHC: 0, workHoursTC: 0 }
];
state.x2StageIncidents = { 'boong|2026-09-11': 1 };
const boOngNoHoursIncidentRow = cap.capStageWeekRow(boongSt, shiftWeek);
check('Bá»” á»NG: khi tá»•ng giá» ca báº±ng 0, sá»± cá»‘ váº«n chá»‰ ghi má»™t láº§n vÃ  khÃ´ng gÃ¢y lá»—i',
  approx(boOngNoHoursIncidentRow.days.reduce((sum, day) => sum + day.incident, 0), 1) &&
  boOngNoHoursIncidentRow.days[0].incident === 1 &&
  boOngNoHoursIncidentRow.days[1].incident === 0);
state.x2StageIncidents = baselineStageIncidents;
state.x2IncidentReports = baselineIncidentReports;

state.xuong2BaoThoRecords = [
  { id: 'bt-s0', date: shiftDate, shiftIdx: 0, daiText: '1250', rongText: '80', dayText: '12', workHoursHC: 10.5, workHoursTC: 0 },
  { id: 'bt-s1', date: shiftDate, shiftIdx: 1, daiText: '1250', rongText: '80', dayText: '12', workHoursHC: 5.5, workHoursTC: 0 }
];
state.xuong2ChonNanThoRecords = [
  { id: 'cn-bt-s0', date: shiftDate, baothoId: 'bt-s0', quantity: 800, cls: 'A', dims: [1250, 80, 12], unitVol: 0.0012, volume: 0.96, shiftIdx: 0 },
  { id: 'cn-bt-s1', date: shiftDate, baothoId: 'bt-s1', quantity: 400, cls: 'A', dims: [1250, 80, 12], unitVol: 0.0012, volume: 0.48, shiftIdx: 1 }
];
state.x2BaoThoRates = { '2026-09': 100 };
const bthShiftRow = cap.capStageWeekRow(bthSt, shiftWeek);
check('BÃ€O THÃ”: tá»•ng sáº£n lÆ°á»£ng liÃªn káº¿t theo ca chia cho tá»•ng giá» cá»§a cáº£ hai ca',
  bthShiftRow.qty === 1200 && bthShiftRow.hours === 16 && approx(bthShiftRow.cap, 75));

state.xuong2ChonNanThoRecords = [
  { id: 'cn-s0', baothoId: 'bt-s0', date: shiftDate, quantity: 800, cls: 'A', dims: [1250, 80, 12], shiftIdx: 0, workHoursHC: 10.5, workHoursTC: 0 },
  { id: 'cn-s1', baothoId: 'bt-s1', date: shiftDate, quantity: 400, cls: 'A', dims: [1250, 80, 12], shiftIdx: 1, workHoursHC: 5.5, workHoursTC: 0 }
];
state.x2ChonNanRates = { '2026-09': 100 };
const cnShiftRow = cap.capStageWeekRow(cnSt, shiftWeek);
check('CHá»ŒN NAN: tá»•ng hiá»‡u suáº¥t dÃ¹ng Ä‘á»§ giá» cá»§a hai ca',
  cnShiftRow.qty === 1200 && cnShiftRow.hours === 16 && approx(cnShiftRow.cap, 75));

state.xuong2BoOngRecords = [
  { id: 'bo-mixed-day', date: '2026-09-12', inputOng: 100, workHours: 9 },
  { id: 'bo-mixed-shift', date: '2026-09-12', shiftIdx: 1, inputOng: 200, workHoursHC: 5.5, workHoursTC: 0 }
];
const mixedBoOngDays = cap.capStageDayRows(boongSt, cap.capWeekKeyOf('2026-09-12'));
check('Bá»” á»NG: ngÃ y trá»™n dá»¯ liá»‡u cÅ© vÃ  ghi ca váº«n gá»™p ngÃ y, giá»¯ giá» báº£n ghi Ä‘áº§u',
  mixedBoOngDays.length === 1 && mixedBoOngDays[0].shiftIdx == null &&
  mixedBoOngDays[0].qty === 300 && mixedBoOngDays[0].hours === 9);
state.xuong2BoOngRecords = baselineBoOngRecords;
state.x2BoOngRates = baselineBoOngRates;
state.xuong2BaoThoRecords = baselineBaoThoRecords;
state.x2BaoThoRates = baselineBaoThoRates;
state.xuong2ChonNanThoRecords = baselineChonNanRecords;
state.x2ChonNanRates = baselineChonNanRates;

// â”€â”€â”€ F. THAN HÃ“A + Sáº¤Y: giá» cáº§n Ã· (giá» thá»±c âˆ’ sá»± cá»‘) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

state.batches = [
  { id: 'lot1', code: 'L-001', date: '2026-09-10', stage: 'say1', quantity: 1000, volume: 2, location: 'LS1' }
];
state.hrEmployees = [{ id: 'e1', name: 'Nguyá»…n VÄƒn A', quitDate: '' }];
state.hrPositions = [
  { id: 'pth', name: 'Than hÃ³a', department: 'XÆ°á»Ÿng 2' },
  { id: 'pep', name: 'Ã‰p vÃ¡n X2', department: 'XÆ°á»Ÿng 2' }
];
state.hrAssignments = [
  { id: 'a1', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'pth', employeeId: 'e1', start: '07:00', end: '11:00' },
  { id: 'a2', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'pep', employeeId: 'e1', start: '07:00', end: '11:00' }
];
state.x2SayTimes = {};
state.x2SayIncidents = {};
const saySt = cap.CAP_STAGES.find(s => s.id === 'say');
const sayDays = cap.capStageDayRows(saySt, wk);
check('THAN HÃ“A + Sáº¤Y: 1 cÃ´ng Ä‘oáº¡n Gá»˜P â€” KHÃ”NG cÃ²n 2 dÃ²ng "Sáº¥y 1" / "Sáº¥y 2" (18/10/2026)',
  !!saySt && saySt.label === 'Than HÃ³a + Sáº¥y' &&
  cap.CAP_STAGES.filter(s => s.id === 'say1' || s.id === 'say2').length === 0);
check('THAN HÃ“A + Sáº¤Y: 2 mÂ³ vÃ o sáº¥y ngÃ y 10/09 â†’ 1 láº§n (dá»¯ liá»‡u má»›i Ä‘áº¿m theo lÆ°á»£t lÆ°u/máº·c Ä‘á»‹nh)',
  sayDays.length === 1 && sayDays[0].turns === 1 && approx(sayDays[0].qty, 2));
check('THAN HÃ“A + Sáº¤Y: giá» cáº§n = 105 phÃºt Ã· 60 = 1,75h', approx(sayDays[0].need, 105 / 60));
check('THAN HÃ“A + Sáº¤Y: giá» thá»±c tá»« Báº£ng bá»‘ trÃ­ "Than hÃ³a" = 4h HC (07:00â€“11:00, khÃ´ng váº¯t nghá»‰ trÆ°a)', approx(sayDays[0].hours, 4));
const sayRow = cap.capStageWeekRow(saySt, wk);
check('THAN HÃ“A + Sáº¤Y: hiá»‡u suáº¥t = 1,75 Ã· 4 = 43,75%', approx(sayRow.eff, 43.75, 1e-4));
check('THAN HÃ“A + Sáº¤Y: nhÃ£n ÄM hiá»‡n Ä‘á»§ 2 cÃ´ng Ä‘oáº¡n sáº¥y (S1 Â· S2) + phÃºt/láº§n "105\'"',
  String(sayRow.rateText).includes('S1') && String(sayRow.rateText).includes('S2') && String(sayRow.rateText).includes("105'"));
state.x2SayIncidents = { '2026-09-10': 1 };
const sayRow2 = cap.capStageWeekRow(saySt, wk);
check('THAN HÃ“A + Sáº¤Y: cÃ³ sá»± cá»‘ 1h â†’ hiá»‡u suáº¥t = 1,75 Ã· (4 âˆ’ 1) â‰ˆ 58,3%', approx(sayRow2.eff, (1.75 / 3) * 100, 1e-4));

// â”€â”€â”€ G. Ã‰P VÃN: mÂ³/h theo phÃ¢n vá»‹ Ã‰P VÃN tháº­t â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.pressRecords = [
  { id: 'p1', date: '2026-09-10', finishedQty: 20, vanTho: [{ vtDim: '1200x600x12', vtQty: 10 }] }
];
state.x2EpVanRates = { '2026-09': 0.03 };
const epSt = cap.CAP_STAGES.find(s => s.id === 'epvan');
const epRow = cap.capStageWeekRow(epSt, wk);
check('Ã‰P VÃN: thá»ƒ tÃ­ch tuáº§n = 0,0864 mÂ³ (10 táº¥m vÃ¡n thÃ´ 1200Ã—600Ã—12)', approx(epRow.qty, 0.0864, 1e-6));
check('Ã‰P VÃN: giá» tá»« phÃ¢n vá»‹ Ã‰p = 4h', approx(epRow.hours, 4));
check('Ã‰P VÃN: hiá»‡u suáº¥t = (0,0864Ã·4) Ã· 0,03 = 72%', approx(epRow.eff, 72, 1e-4));

// â”€â”€â”€ H. HIá»†U SUáº¤T XÆ¯á»žNG (táº§ng 1) = bÃ¬nh quÃ¢n gia quyá»n theo giá» â”€â”€
const w = cap.capWorkshopWeekRow('x2', wk);
const expectedWsEff = (cutRowRated.eff * cutRowRated.hours + cnRow.eff * cnRow.hours + sayRow2.eff * sayRow2.hours + epRow.eff * epRow.hours)
  / (cutRowRated.hours + cnRow.hours + sayRow2.hours + epRow.hours);
check('XÆ¯á»žNG: 5 cÃ´ng Ä‘oáº¡n cÃ³ dá»¯ liá»‡u / 10 cÃ´ng Ä‘oáº¡n XÆ°á»Ÿng 2 cÃ²n cÃ´ng suáº¥t', w.dataCount === 5 && w.stagesCount === 10);
check('XÆ¯á»žNG: tá»•ng giá» = 9 + 4 + 3 + 4 + 4 = 24h (má»—i ngÃ y má»—i CÄ Ä‘áº¿m 1 láº§n)', approx(w.hours, 24));
check('XÆ¯á»žNG: 4 cÃ´ng Ä‘oáº¡n tÃ­nh Ä‘Æ°á»£c hiá»‡u suáº¥t Â· 0 cÃ´ng Ä‘oáº¡n Ä‘áº¡t â‰¥100%', w.effCount === 4 && w.passCount === 0);
check('XÆ¯á»žNG: hiá»‡u suáº¥t xÆ°á»Ÿng = bÃ¬nh quÃ¢n gia quyá»n theo GIá»œ', approx(w.eff, expectedWsEff, 1e-6));
check('XÆ¯á»žNG: nÃºt tháº¯t cá»• chai = Than HÃ³a + Sáº¥y (hiá»‡u suáº¥t tháº¥p nháº¥t)', w.bottleneck && w.bottleneck.st.id === 'say');

// â”€â”€â”€ I. RENDER 3 Táº¦NG + Äá»”I XÆ¯á»žNG + THU Gá»ŒN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
cap.setCapacityWeek(wk);
check('RENDER: nhÃ£n xÆ°á»Ÿng máº·c Ä‘á»‹nh "XÆ°á»Ÿng 2"', document.getElementById('capacity-mode-label').textContent === 'XÆ°á»Ÿng 2');
check('RENDER: nhÃ£n tuáº§n hiá»‡n "Tuáº§n ..."', document.getElementById('capacity-week-label').textContent.includes('Tuáº§n'));
check('RENDER: dáº£i strip cÅ© Ä‘Ã£ áº©n; tháº» Hiá»‡u suáº¥t má»›i thay tháº¿',
  document.getElementById('cap-summary-strip').hidden === true &&
  document.getElementById('cap-visual-row').innerHTML.includes('cap-efficiency-card'));
const tbody = document.getElementById('capacity-week-rows');
check('RENDER: dÃ²ng tuáº§n Ä‘ang chá»n mang data-cap-week-row', tbody.innerHTML.includes(`data-cap-week-row="${wk}"`));
check('RENDER: báº£ng táº§ng 1 cÃ³ Ã­t nháº¥t 2 dÃ²ng tuáº§n (tuáº§n dá»¯ liá»‡u + tuáº§n hiá»‡n táº¡i)',
  (tbody.innerHTML.match(/data-cap-week-row=/g) || []).length >= 2);
check('RENDER: cá»™t NÃºt tháº¯t hiá»‡n Ä‘Ãºng cÃ´ng Ä‘oáº¡n tháº¥p nháº¥t', tbody.innerHTML.includes('Than HÃ³a + Sáº¥y'));
cap.toggleCapacityWeekOpen(wk);
check('Táº¦NG 2: báº¥m tuáº§n â†’ xá»• báº£ng cÃ´ng Ä‘oáº¡n (cÃ³ cá»™t "Äá»‹nh má»©c tuáº§n")', tbody.innerHTML.includes('Äá»‹nh má»©c tuáº§n'));
check('Táº¦NG 2: cÃ³ dÃ²ng Cáº¯t Chá»n kÃ¨m Ä‘Æ¡n vá»‹ kg/h',
  tbody.innerHTML.includes('Cáº¯t Chá»n') && tbody.innerHTML.includes('kg/h'));
check('Táº¦NG 2: dÃ²ng BÃ o ThÃ´ hiá»‡n "chÆ°a cÃ³ ÄM" (chÆ°a khai Ä‘á»‹nh má»©c)', tbody.innerHTML.includes('chÆ°a cÃ³ ÄM'));
check('Táº¦NG 2: cÃ³ cá»™t So tuáº§n trÆ°á»›c + nÃºt Má»Ÿ tháº» cÃ´ng Ä‘oáº¡n',
  tbody.innerHTML.includes('cap-delta') && tbody.innerHTML.includes('data-cap-open-card="x2-cut-card"'));
cap.toggleCapacityStageDays('cut');
check('Táº¦NG 3: báº¥m cÃ´ng Ä‘oáº¡n â†’ xá»• khá»‘i NGÃ€Y (cap-day-tr)', tbody.innerHTML.includes('cap-day-tr'));
check('Táº¦NG 3: ngÃ y 10/09/26 Â· 1.500 kg Â· cÃ´ng suáº¥t ngÃ y 300 kg/h',
  tbody.innerHTML.includes('10/09/26') && tbody.innerHTML.includes('1.500 kg') &&
  tbody.innerHTML.includes('300 kg/h'));
cap.toggleCapacityStageDays('cut');
check('Táº¦NG 3: báº¥m láº§n ná»¯a â†’ Ä‘Ã³ng khá»‘i ngÃ y', !tbody.innerHTML.includes('cap-day-tr'));
// â”€â”€â”€ K. ÄIá»€U HÆ¯á»šNG TUáº¦N + Äá»”I XÆ¯á»žNG + THU Gá»ŒN + NHá»š UI â”€â”€â”€â”€â”€â”€â”€â”€â”€
cap.setCapacityWeek(wk);
cap.shiftCapacityWeek(1);
check('ÄIá»€U HÆ¯á»šNG: â€º sang tuáº§n káº¿ â†’ tuáº§n má»›i Ä‘Æ°á»£c chá»n + táº§ng cÃ´ng Ä‘oáº¡n tá»± xá»•',
  state.capUi.week === cap.capWeekShift(wk, 1) && state.capUi.weekOpen === state.capUi.week);
check('ÄIá»€U HÆ¯á»šNG: tuáº§n khÃ´ng cÃ³ dá»¯ liá»‡u â†’ hiá»‡n thÃ´ng bÃ¡o (khÃ´ng bá»‹a sá»‘)',
  document.getElementById('capacity-week-rows').innerHTML.includes('KhÃ´ng cÃ³ lÆ°á»£t nÃ o trong tuáº§n nÃ y'));
cap.toggleCapacityWorkshop();
check('XÆ¯á»žNG 1: Ä‘á»•i xÆ°á»Ÿng â†’ nhÃ£n "XÆ°á»Ÿng 1" + tháº» gáº¯n class cap-ws-x1',
  document.getElementById('capacity-mode-label').textContent === 'XÆ°á»Ÿng 1' &&
  document.getElementById('capacity-card').classList.contains('cap-ws-x1'));
check('XÆ¯á»žNG 1: báº£ng hiá»‡n thÃ´ng bÃ¡o "chÆ°a cÃ³ sá»‘ liá»‡u" (Ä‘Ã£ khai 3 cÃ´ng Ä‘oáº¡n, chÆ°a ghi lÆ°á»£t â€” KHÃ”NG bá»‹a sá»‘)',
  document.getElementById('capacity-week-rows').innerHTML.includes('XÆ°á»Ÿng 1 â€” chÆ°a cÃ³ sá»‘ liá»‡u.') &&
  document.getElementById('capacity-week-rows').innerHTML.includes('Cáº¯t á»ng Â· Sáº¥y Sinh Â· Bá»‘c'));
check('XÆ¯á»žNG 1: sá»• Ä‘Äƒng kÃ½ Ä‘Ã£ cÃ³ 7 cÃ´ng Ä‘oáº¡n X1 Â· chÆ°a cÃ³ tuáº§n dá»¯ liá»‡u nÃ o',
  cap.capStagesOf('x1').length === 7 && cap.capWeekRowsFor('x1').length === 0);
cap.toggleCapacityWorkshop();
check('XÆ¯á»žNG 2: Ä‘á»•i láº¡i â†’ nhÃ£n "XÆ°á»Ÿng 2"', document.getElementById('capacity-mode-label').textContent === 'XÆ°á»Ÿng 2');
cap.toggleCapacityCollapse();
check('THU Gá»ŒN: thÃ¢n tháº» áº©n + nÃºt thÃ nh "Má»Ÿ rá»™ng"',
  document.getElementById('capacity-body').hidden === true &&
  document.getElementById('cap-toggle-label').textContent === 'Má»Ÿ rá»™ng');
cap.toggleCapacityCollapse();
check('THU Gá»ŒN: má»Ÿ láº¡i thÃ¢n tháº»', document.getElementById('capacity-body').hidden === false);
cap.setCapacityWeek(wk);
const savedUi = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || '{}');
check('NHá»š UI: tráº¡ng thÃ¡i Ä‘Ã£ lÆ°u theo mÃ¡y (xÆ°á»Ÿng + tuáº§n Ä‘ang xem)',
  savedUi.ws === 'x2' && savedUi.week === wk);
localStorage.setItem(STORAGE_KEY_CAPACITY_UI, JSON.stringify({ ws: 'x9', week: 'khong-hop-le', collapsed: 'yes' }));
cap.loadCapacityUi();
check('NHá»š UI: dá»¯ liá»‡u rÃ¡c tá»± vá» máº·c Ä‘á»‹nh an toÃ n (x2 Â· week rá»—ng Â· khÃ´ng thu gá»n)',
  state.capUi.ws === 'x2' && state.capUi.week === '' && state.capUi.collapsed === false);
cap.setCapacityWeek(wk); // náº¡p láº¡i tuáº§n dá»¯ liá»‡u cho cÃ¡c kiá»ƒm thá»­ sau

// â”€â”€â”€ L. SPARKLINE HIá»†U SUáº¤T 8 TUáº¦N TRÃŠN MINI CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
cap.renderX2MiniSparklines();
check('SPARK: tháº» Cáº¯t Chá»n cÃ³ SVG + sá»‘ % tuáº§n nÃ y',
  document.getElementById('x2-mini-spark-cut').innerHTML.includes('cap-spark-svg') &&
  document.getElementById('x2-mini-spark-cut').innerHTML.includes('cap-spark-val'));
check('SPARK: tháº» Bullig chÆ°a cÃ³ dá»¯ liá»‡u â†’ "chÆ°a cÃ³ ÄM" (khÃ´ng bá»‹a sá»‘)',
  document.getElementById('x2-mini-spark-bullig').innerHTML.includes('cap-spark-none'));
check('SPARK: tháº» Than HÃ³a + Sáº¥y cÃ³ sparkline (dÃ²ng gá»™p cÃ³ hiá»‡u suáº¥t)',
  document.getElementById('x2-mini-spark-than-hoa').innerHTML.includes('cap-spark-svg'));
const sparkCut = cap.capSparkSeries(['cut']);
check('SPARK: chuá»—i 8 tuáº§n Â· pháº§n tá»­ CUá»I lÃ  tuáº§n cÃ³ dá»¯ liá»‡u cÃ³ hiá»‡u suáº¥t',
  sparkCut.length === 8 && sparkCut[7].eff != null);
check('SPARK: 8 chá»• gáº¯n sparkline Ä‘á»u cÃ³ trong index.html (8 tháº» launcher cÃ³ dá»¯ liá»‡u)',
  ['cut', 'bo-ong', 'bao-tho', 'chon-nan-tho', 'than-hoa', 'bao-tinh', 'ep-van', 'bullig']
    .every(k => indexHtml.includes(`id="x2-mini-spark-${k}"`)));

// â”€â”€â”€ M. Cáº¤U TRÃšC + Sá»” ÄÄ‚NG KÃ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('Cáº¤U TRÃšC (index.html): tháº» tá»•ng há»£p Ä‘á»§ nÃºt (Ä‘á»•i xÆ°á»Ÿng Â· tuáº§n Â· thu gá»n Â· báº£ng tuáº§n)',
  indexHtml.includes('id="capacity-card"') && indexHtml.includes('id="capacity-week-rows"') &&
  indexHtml.includes('id="capacity-mode-toggle"') && indexHtml.includes('id="btn-toggle-capacity"') &&
  indexHtml.includes('id="capacity-week-prev"') && indexHtml.includes('id="capacity-week-next"'));
check('Cáº¤U TRÃšC (index.html): tháº» tá»•ng há»£p Ä‘áº·t TRÆ¯á»šC tháº» biá»ƒu Ä‘á»“ gá»™p #plan-vs-press-card (lÃ£nh Ä‘áº¡o tháº¥y Ä‘áº§u tiÃªn)',
  indexHtml.indexOf('id="capacity-card"') >= 0 &&
  indexHtml.indexOf('id="capacity-card"') < indexHtml.indexOf('id="plan-vs-press-card"'));
check('Cáº¤U TRÃšC (index.html): chá»¯ nÃºt toolbar bá»c .cap-btn-text Ä‘á»ƒ gá»n trÃªn Ä‘iá»‡n thoáº¡i (desktop váº«n hiá»‡n)',
  indexHtml.includes('class="cap-btn-text">Biá»ƒu Ä‘á»“') && indexHtml.includes('class="cap-btn-text">Báº£ng dá»¯ liá»‡u') &&
  indexHtml.includes('class="cap-btn-text">In bÃ¡o cÃ¡o') && indexHtml.includes('id="cap-toggle-label"') &&
  indexHtml.includes('id="cap-view-visual"') && indexHtml.includes('id="btn-cap-print"'));
check('Cáº¤U TRÃšC (styles.css): khá»‘i CSS tháº» tá»•ng há»£p + sparkline + mÃ u ngÆ°á»¡ng',
  stylesCss.includes('.cap-mode-btn') && stylesCss.includes('.cap-spark-svg') &&
  stylesCss.includes('.cap-eff-good') && stylesCss.includes('.cap-eff-low'));
check('Cáº¤U TRÃšC (styles.css): Ä‘iá»‡n thoáº¡i áº©n chá»¯ cá»¥m Biá»ƒu Ä‘á»“/Báº£ng + In/Thu gá»n, giá»¯ chá»¯ Tuáº§n/ThÃ¡ng',
  stylesCss.includes('.cap-view-toggle .cap-btn-text') && stylesCss.includes('display: none') &&
  stylesCss.includes('.cap-period-toggle .pv-unit-btn'));
check('LAYOUT: tháº» Giá» lÃ m chia 1/4 KPI dá»c vÃ  3/4 chart',
  stylesCss.includes('grid-template-columns: minmax(150px, 1fr) minmax(0, 3fr)') &&
  stylesCss.includes('.cap-hours-kpis') && stylesCss.includes('flex-direction: column'));
check('Cáº¤U TRÃšC (sw.js): APP_SHELL cÃ³ js/capacity.js', swJs.includes("'./js/capacity.js'"));
check('Cáº¤U TRÃšC (sw.js): Ä‘Ã£ tÄƒng CACHE_NAME v486', /nha-may-ngoc-son-v486/.test(swJs));
check('Sá»” ÄÄ‚NG KÃ: Cáº¯t VÃ¡n vÃ  BÃ o VÃ¡n khÃ´ng cÃ²n dÃ²ng cÃ´ng suáº¥t; cÃ²n 10 dÃ²ng XÆ°á»Ÿng 2 Â· 7 thao tÃ¡c XÆ°á»Ÿng 1',
  cap.capStagesOf('x2').length === 10 && cap.capStagesOf('x1').length === 7 &&
  !cap.capStagesOf('x2').some(s => String(s.id).startsWith('catvan_') || String(s.id).startsWith('baovan_')) &&
  cap.capStagesOf('x1').map(s => s.id).join(',') ===
    'x1catong,x1saysinh,x1boc,x1locong,x1catmat,x1bo,x1locthanh');
check('Sá»” ÄÄ‚NG KÃ: má»—i cÃ´ng Ä‘oáº¡n khai Ä‘á»§ Ä‘Æ¡n vá»‹ + tháº» gá»‘c á»Ÿ tab CÃ´ng Äoáº¡n (cardId) + xÆ°á»Ÿng Ä‘Ãºng',
  cap.CAP_STAGES.every(s => s.cardId && s.unit && s.unitQty &&
    (s.ws === 'x2' || (s.ws === 'x1' && s.cardId.startsWith('x1-')))) &&
  cap.CAP_STAGES.filter(s => s.ws === 'x1').every(s => s.cardId.startsWith('x1-')));

// â”€â”€â”€ N. CHáº¾ Äá»˜ "BIá»‚U Äá»’" â‡„ "Báº¢NG Dá»® LIá»†U" + 4 WIDGET TRá»°C QUAN â”€â”€
state.capUi.chartStage = '';
cap.setCapacityWeek(wk); // render láº¡i vá»›i tuáº§n dá»¯ liá»‡u (cháº¿ Ä‘á»™ máº·c Ä‘á»‹nh)
const visualRow = document.getElementById('cap-visual-row');
check('CHáº¾ Äá»˜: máº·c Ä‘á»‹nh lÃ  "Biá»ƒu Ä‘á»“" (visual)', state.capUi.view === 'visual');
check('CHáº¾ Äá»˜: nÃºt "Biá»ƒu Ä‘á»“" Ä‘ang active, nÃºt "Báº£ng" khÃ´ng',
  document.getElementById('cap-view-visual').classList.contains('active') &&
  !document.getElementById('cap-view-table').classList.contains('active'));
const wEffNow = cap.capWorkshopWeekRow('x2', wk);
check('CARDS: cÃ³ 3 tháº» má»›i Hiá»‡u suáº¥t Â· Giá» Â· Lao Ä‘á»™ng',
  visualRow.innerHTML.includes('cap-efficiency-card') &&
  visualRow.innerHTML.includes('cap-hours-card') &&
  visualRow.innerHTML.includes('cap-labor-card'));
check('CARDS: nÃºt tháº¯t Ä‘Ãºng cÃ´ng Ä‘oáº¡n Than HÃ³a + Sáº¥y',
  visualRow.innerHTML.includes('NÃºt tháº¯t') && visualRow.innerHTML.includes('Than HÃ³a + Sáº¥y'));
check('CARDS: chá»n cÃ´ng Ä‘oáº¡n báº±ng selector má»›i, khÃ´ng cÃ²n data-cap-rank',
  visualRow.innerHTML.includes('data-cap-open-stage') &&
  !visualRow.innerHTML.includes('data-cap-rank'));
check('Gá»  Báº¢N Äá»’ NHIá»†T: dáº£i trá»±c quan KHÃ”NG cÃ²n lÆ°á»›i nhiá»‡t (Ä‘Ã£ bá» 21/10/2026 Ä‘á»ƒ tiáº¿t kiá»‡m diá»‡n tÃ­ch)',
  !visualRow.innerHTML.includes('data-cap-heat') && !visualRow.innerHTML.includes('cap-heat'));
check('ÄÃƒ Bá»Ž CHART 8 TUáº¦N (11/2026 â€” khÃ´ng dÃ¹ng): dáº£i trá»±c quan KHÃ”NG cÃ²n panel biá»ƒu Ä‘á»“ cÃ´ng Ä‘oáº¡n',
  !visualRow.innerHTML.includes('cap-stage-chart-panel') && !visualRow.innerHTML.includes('id="cap-stage-chart"'));
check('ÄÃƒ Bá»Ž CHART 8 TUáº¦N: instance biá»ƒu Ä‘á»“ cÃ´ng Ä‘oáº¡n khÃ´ng cÃ²n Ä‘Æ°á»£c táº¡o á»Ÿ cháº¿ Ä‘á»™ Biá»ƒu Ä‘á»“',
  state.capacityStageInstance == null);
check('ÄÃƒ Bá»Ž CHART 8 TUáº¦N: báº¥m chip cÃ´ng Ä‘oáº¡n khÃ´ng crash (panel Ä‘Ã£ bá», má»Ÿ tháº» qua events)',
  (cap.selectCapacityStage('cut'), cap.selectCapacityStage('cut'), state.capacityStageInstance == null));
cap.setCapacityWeek(wk); // quay láº¡i tuáº§n dá»¯ liá»‡u
check('ÄÃƒ Bá»Ž CHART 8 TUáº¦N: sau khi Ä‘á»•i ká»³, dáº£i trá»±c quan váº«n khÃ´ng cÃ³ panel biá»ƒu Ä‘á»“',
  !visualRow.innerHTML.includes('cap-stage-chart-panel'));
// Chuyá»ƒn sang cháº¿ Ä‘á»™ Báº¢NG Dá»® LIá»†U
cap.setCapacityView('table');
check('CHáº¾ Äá»˜: nÃºt "Báº£ng dá»¯ liá»‡u" active + dáº£i trá»±c quan áº¨N vÃ  Rá»–NG (trÃ¡nh 2 canvas cÃ¹ng id)',
  document.getElementById('cap-view-table').classList.contains('active') &&
  document.getElementById('cap-visual-row').hidden === true &&
  document.getElementById('cap-visual-row').innerHTML === '');
check('CHáº¾ Äá»˜: báº£ng 3 táº§ng hiá»‡n láº¡i (table-wrap khÃ´ng áº©n)', document.getElementById('cap-table-wrap').hidden === false);
cap.toggleCapacityWeekOpen(wk); // má»Ÿ táº§ng cÃ´ng Ä‘oáº¡n cá»§a tuáº§n dá»¯ liá»‡u
cap.toggleCapacityStageDays('cut');
check('CHẾ ĐỘ BẢNG: tầng 2 mở → KHÔNG còn biểu đồ 8 kỳ (đã gỡ 27/11/2026)',
  !document.getElementById('capacity-week-rows').innerHTML.includes('cap-chart-tr') && !state.capacityStageInstance);
cap.toggleCapacityStageDays('cut');
const savedView = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || '{}');
check('NHá»š UI: cháº¿ Ä‘á»™ "Báº£ng dá»¯ liá»‡u" Ä‘Ã£ lÆ°u theo mÃ¡y', savedView.view === 'table');
cap.setCapacityView('visual');
const savedView2 = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || '{}');
check('CHáº¾ Äá»˜: quay láº¡i "Biá»ƒu Ä‘á»“" â†’ dáº£i 4 tháº», KHÃ”NG cÃ²n panel biá»ƒu Ä‘á»“ 8 tuáº§n',
  savedView2.view === 'visual' && document.getElementById('cap-visual-row').hidden === false &&
  visualRow.innerHTML.includes('cap-efficiency-card') &&
  visualRow.innerHTML.includes('cap-hours-card') &&
  visualRow.innerHTML.includes('cap-labor-card') &&
  !visualRow.innerHTML.includes('cap-heat') && !visualRow.innerHTML.includes('cap-stage-chart-panel'));
const dashJs = fs.readFileSync(new URL('../js/dashboard.js', import.meta.url), 'utf8');
const capJs = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
check('LAYOUT: hiá»‡u suáº¥t tá»± xuá»‘ng nhiá»u hÃ ng vÃ  cÃ³ sáº£n lÆ°á»£ng cáº£ ká»³',
  stylesCss.includes('repeat(auto-fit, minmax(86px, 1fr))') &&
  capJs.includes('Sáº£n lÆ°á»£ng cáº£ ká»³') &&
  capJs.includes('quantityByUnit'));
check('Cáº¤U TRÃšC (index.html): nÃºt chuyá»ƒn cháº¿ Ä‘á»™ + khá»‘i trá»±c quan (canvas do JS dá»±ng)',
  indexHtml.includes('data-cap-view="visual"') && indexHtml.includes('data-cap-view="table"') &&
  indexHtml.includes('id="cap-visual-row"') && indexHtml.includes('id="cap-table-wrap"'));
check('CẤU TRÚC (capacity.js): KHÔNG còn panel biểu đồ 8 kỳ / plugin vạch 100% (đã gỡ 27/11/2026)',
  !capJs.includes('id="cap-stage-chart"') && !capJs.includes("id: 'capTargetLine'"));
check('CẤU TRÚC (dashboard.js): KHÔNG còn tham chiếu canvas #cap-stage-chart',
  dashJs.includes('.capacity-card') && !dashJs.includes('#cap-stage-chart'));
check('Cáº¤U TRÃšC (styles.css): CSS widget trá»±c quan + cáº£nh bÃ¡o quÃ¡ háº¡n + fullscreen tháº» tá»•ng há»£p',
  stylesCss.includes('.cap-stale-head') && stylesCss.includes('.cap-gauge-svg') &&
  stylesCss.includes('.capacity-card:fullscreen') && !stylesCss.includes('.cap-heat-cell'));

// â”€â”€â”€ O. NÃšT CHáº¾ Äá»˜ TÆ¯Æ NG PHáº¢N Â· KÃ‰O NGANG NHIá»†T Â· MÃ€U TAB ÄANG CHá»ŒN â”€â”€
check('NÃšT CHáº¾ Äá»˜: nÃºt chÆ°a chá»n = chá»¯ Äáº¬M (khÃ´ng cÃ²n chá»¯ tráº¯ng khÃ³ tháº¥y)',
  stylesCss.includes('.pv-unit-btn {') &&
  stylesCss.includes('color: var(--text-main); /* chá»¯ Äáº¬M â€” Ä‘á»c rÃµ trÃªn ná»n tháº» sÃ¡ng/khaki */'));
check('NÃšT CHáº¾ Äá»˜: nÃºt Ä‘ang chá»n ná»•i gradient xanh teal + chá»¯ tráº¯ng',
  stylesCss.includes('.pv-unit-btn.active') &&
  stylesCss.includes('background: linear-gradient(135deg, #0f766e, #0369a1)'));
check('Gá»  Báº¢N Äá»’ NHIá»†T: KHÃ”NG cÃ²n CSS lÆ°á»›i nhiá»‡t / kÃ©o ngang nhiá»‡t (Ä‘Ã£ bá» 21/10/2026)',
  !stylesCss.includes('.cap-heat-grid') && !stylesCss.includes('.cap-heat-dragging') &&
  !stylesCss.includes('.cap-heat-cell') && !capJs.includes('capAttachHeatDrag'));
check('Gá»  Báº¢N Äá»’ NHIá»†T: KHÃ”NG cÃ²n markup/handler Ã´ nhiá»‡t trong capacity.js + events.js',
  !capJs.includes('data-cap-heat') && !capJs.includes('capHeatHtml') &&
  !fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8').includes('data-cap-heat'));
check('TAB: bá» Ã©p mÃ u xanh lÃ¡ #2e7d32 cho tab Ä‘ang chá»n á»Ÿ theme hiá»‡n táº¡i',
  !stylesCss.includes('body[data-theme="night"] .nav-btn.active') &&
  !stylesCss.includes('#2e7d32;\n  text-shadow'));
check('TAB: tab NhÃ¢n Sá»± cÃ³ mÃ u Ä‘áº·c trÆ°ng riÃªng (há»• phÃ¡ch) + bá» accent tab Ä‘Ã£ xÃ³a',
  stylesCss.includes('data-target="hr-view"') && stylesCss.includes('--tab-accent: #d97706') &&
  !stylesCss.includes('data-target="press-view"'));


// â”€â”€â”€ Q. THáºº LAO Äá»˜NG / CHáº¤M CÃ”NG: Äáº¾M ÄÆ N + 3 Táº¦NG TRáº NG THÃI + 2 BIá»‚U Äá»’ â”€â”€
state.hrLeaves = [
  { id: "l1", from: "2026-09-07", to: "2026-09-07", status: "pending" },
  { id: "l2", from: "2026-09-08", to: "2026-09-08", status: "pending" },
  { id: "l3", from: "2026-09-09", to: "2026-09-09", status: "pending" },
  { id: "l4", from: "2026-09-10", to: "2026-09-10", status: "pending" },
  { id: "l5", from: "2026-09-11", to: "2026-09-11", status: "pending" }
];
state.hrOvertimes = [];
const wkRange = cap.capPeriodRangeOf(wk, "week");
const tiles = cap.capApprovalTilesForPeriod(wkRange);
check("Äáº¾M ÄÆ N: 5 Ä‘Æ¡n nghá»‰ phÃ©p chá» duyá»‡t â†’ leave.pending = 5", tiles.leave.pending === 5 && tiles.leave.total === 5);
check("Äáº¾M ÄÆ N: khÃ´ng cÃ³ Ä‘Æ¡n tÄƒng ca â†’ overtime.total = 0", tiles.overtime.total === 0);
check("Äáº¾M ÄÆ N: tráº¡ng thÃ¡i leave = bad khi cÃ³ Ä‘Æ¡n chá»", tiles.leave.state === "bad");

const laborKpiHtml = cap.capLaborKpiCard("x2", { weekKey: wk, eff: null, hc: 0, tc: 0, hours: 0 }, wk, "week");
const laborChartHtml = cap.capLaborChartCard("x2", { weekKey: wk, eff: null, hc: 0, tc: 0, hours: 0 }, wk, "week");
check("LAO Äá»˜NG: cÃ³ tá»•ng lao Ä‘á»™ng trong ká»³", laborKpiHtml.includes("Tá»•ng lao Ä‘á»™ng trong ká»³"));
check("LAO Äá»˜NG: cÃ³ tá»· lá»‡ Ä‘i lÃ m trong ká»³ (táº§ng trÃªn)", laborKpiHtml.includes("Tá»· lá»‡ Ä‘i lÃ m trong ká»³"));
check("LAO Äá»˜NG: cÃ³ hÃ´m nay + cáº£ ká»³ (táº§ng dÆ°á»›i)", laborKpiHtml.includes("HÃ´m nay") && laborKpiHtml.includes("Cáº£ ká»³"));
check("LAO Äá»˜NG: tile duyá»‡t nghá»‰ phÃ©p hiá»‡n sá»‘ chá» duyá»‡t", laborKpiHtml.includes("duyá»‡t 0 Â· chá» 5 Â· tá»« chá»‘i 0"));
check("BIá»‚U Äá»’ LAO Äá»˜NG: 2 canvas riÃªng (lá»±c lÆ°á»£ng + tá»· lá»‡)", laborChartHtml.includes(`id="cap-labor-wf-chart"`) && laborChartHtml.includes(`id="cap-labor-att-chart"`));
check("BIá»‚U Äá»’ LAO Äá»˜NG: KHÃ”NG cÃ²n canvas cÅ© cap-labor-chart", !laborChartHtml.includes(`id="cap-labor-chart"`));

// â€” Sá»¬A Lá»–I LUÃ”N 100%: máº«u sá»‘ = Tá»”NG lao Ä‘á»™ng xÆ°á»Ÿng (khÃ´ng phá»¥ thuá»™c phÃ¢n cÃ´ng) â€”
const qEmp = state.hrEmployees, qAsg = state.hrAssignments, qAtt = state.hrAttendance;
state.hrEmployees = [
  { id: "q1", name: "CÃ´ng A", department: "XÆ°á»Ÿng 2", status: "active" },
  { id: "q2", name: "CÃ´ng B", department: "XÆ°á»Ÿng 2", status: "active" },
  { id: "q3", name: "CÃ´ng C", department: "XÆ°á»Ÿng 2", status: "active" },
  { id: "q4", name: "ÄÃ£ nghá»‰", department: "XÆ°á»Ÿng 2", status: "quit" },
  { id: "q5", name: "QC ngÆ°á»i", department: "QC", status: "active" }
];
state.hrAssignments = [];
state.hrAttendance = [];
check("MáºªU Sá»: tá»•ng lao Ä‘á»™ng XÆ°á»Ÿng 2 = 3 (bá» ngÆ°á»i nghá»‰ viá»‡c + bá»™ pháº­n khÃ¡c)", cap.capTotalActiveWorkforce("x2") === 3);
check("MáºªU Sá»: Ä‘áº¿m ngÆ°á»i Ä‘i lÃ m hÃ´m nay Ä‘á»c tráº¡ng thÃ¡i cháº¥m cÃ´ng", cap.capWorkedPeopleOnDate("x2", cap.capTodayLocalISO()) === 0);
const kpiHtml2 = cap.capLaborKpiCard("x2", { weekKey: wk, eff: null, hc: 0, tc: 0, hours: 0 }, wk, "week");
check("MáºªU Sá»: HÃ´m nay = 0/3 (khÃ´ng cÃ²n n/n = 100% sai)", kpiHtml2.includes(">0/3</strong>"));
check("MáºªU Sá»: tá»· lá»‡ Ä‘i lÃ m trong ká»³ bÃ¬nh quÃ¢n theo ngÃ y", kpiHtml2.includes("BÃ¬nh quÃ¢n tá»· lá»‡ Ä‘i lÃ m theo ngÃ y"));
check("MáºªU Sá»: chart tá»· lá»‡ khÃ³a trá»¥c 0â€“100 vÃ  cÃ³ padding trÃªn",
  stylesCss.includes('cap-labor-chart-half') &&
  capJs.includes('max: 100') &&
  capJs.includes('top: 18'));
check("MáºªU Sá»: tile mini dÃ n NGANG (cap-labor-grid + cap-labor-mini)", kpiHtml2.includes("cap-labor-grid") && kpiHtml2.includes("cap-labor-mini"));
state.hrEmployees = qEmp; state.hrAssignments = qAsg; state.hrAttendance = qAtt;

// â”€â”€â”€ P. CHáº¾ Äá»˜ THÃNG + GIá»œ HC/TC TÃCH RIÃŠNG + IN BÃO CÃO (30/09/2026) â”€â”€
// P1. NhÃ£n + dá»‹ch thÃ¡ng (váº¯t nÄƒm)
check('THÃNG: dá»‹ch Â±1 thÃ¡ng váº¯t nÄƒm Ä‘Ãºng (2025-01 âˆ’1 = 2024-12 Â· 2024-12 +1 = 2025-01)',
  cap.capMonthShift('2025-01', -1) === '2024-12' && cap.capMonthShift('2024-12', 1) === '2025-01');
check('THÃNG: nhÃ£n Ä‘áº§y Ä‘á»§ = "ThÃ¡ng 9/2026 Â· 01/09 â€“ 30/09"',
  cap.capMonthHeadLabel('2026-09') === 'ThÃ¡ng 9/2026' &&
  cap.capMonthRangeLabel('2026-09') === '01/09 â€“ 30/09' &&
  cap.capPeriodLabel('2026-09', 'month') === 'ThÃ¡ng 9/2026 Â· 01/09 â€“ 30/09');
check('THÃNG: nhÃ£n rÃºt gá»n "T9" cho trá»¥c biá»ƒu Ä‘á»“', 
  cap.capPeriodShortLabel('2026-09', 'month') === 'T9' && cap.capPeriodShortLabel(wk, 'week') === `T${cap.capWeekNumOf(wk)}`);

// P2. Gá»™p theo THÃNG (mode='month') â€” cÃ¹ng dá»¯ liá»‡u Ä‘Ã£ seed á»Ÿ trÃªn
const cutStP = cap.CAP_STAGES.find(s => s.id === 'cut');
const cutMonthRow = cap.capStagePeriodRow(cutStP, '2026-09', 'month');
check('THÃNG: Cáº¯t Chá»n gá»™p Cáº¢ THÃNG = 3 lÆ°á»£t Â· 2.300 kg Â· 9 giá»',
  cutMonthRow.turns === 3 && cutMonthRow.qty === 2300 && cutMonthRow.hours === 9);
check('THÃNG: Ä‘á»‹nh má»©c cÅ© 300 kg/h â†’ 0,5 xe/h â†’ hiá»‡u suáº¥t â‰ˆ 85,2%',
  approx(cutMonthRow.rate, 0.5) &&
  approx(cutMonthRow.eff, ((2300 / 9) / 600) / 0.5 * 100, 1e-4));
check('TUáº¦N: báº£n cÅ© capStageWeekRow giá»¯ nguyÃªn hÃ nh vi (khÃ´ng Ä‘á»•i gÃ¬)',
  cap.capStageWeekRow(cutStP, wk).turns === 3 && cap.capStageWeekRow(cutStP, wk).hours === 9);

// P3. Äá»•i cháº¿ Ä‘á»™ + chá»n thÃ¡ng + Ä‘iá»u hÆ°á»›ng ká»³
cap.setCapacityMode('month');
check('THÃNG: setCapacityMode("month") â†’ mode = "month" + tá»± neo ká»³ má»›i nháº¥t CÃ“ dá»¯ liá»‡u (2026-09)',
  state.capUi.mode === 'month' && state.capUi.week === '' && cap.capSelectedPeriod() === '2026-09');
cap.setCapacityMonth('2026-09');
check('THÃNG: chá»n thÃ¡ng 9/2026 â†’ nhÃ£n tháº» hiá»‡n "ThÃ¡ng 9/2026"',
  state.capUi.week === '2026-09' &&
  document.getElementById('capacity-week-label').textContent.includes('ThÃ¡ng 9/2026'));
check('THÃNG: Ã´ chá»n thÃ¡ng #cap-month hiá»‡n ra + Ä‘á»“ng bá»™ Ä‘Ãºng giÃ¡ trá»‹',
  document.getElementById('cap-month').hidden === false &&
  document.getElementById('cap-month').value === '2026-09');
cap.shiftCapacityWeek(1);
check('THÃNG: â€º nháº£y sang thÃ¡ng káº¿ (2026-10) + táº§ng cÃ´ng Ä‘oáº¡n tá»± xá»•',
  state.capUi.week === cap.capMonthShift('2026-09', 1) && state.capUi.weekOpen === state.capUi.week);
cap.setCapacityMonth('2026-09'); // tá»± xá»• táº§ng cÃ´ng Ä‘oáº¡n cá»§a thÃ¡ng 9
cap.toggleCapacityStageDays('cut');
const capTbodyMonth = document.getElementById('capacity-week-rows');
check('THÃNG: táº§ng 2 cÃ³ cá»™t "Äá»‹nh má»©c thÃ¡ng" + "So thÃ¡ng trÆ°á»›c" + Giá» HC/TC tÃ¡ch riÃªng (cap-hc/cap-tc)',
  capTbodyMonth.innerHTML.includes('Äá»‹nh má»©c thÃ¡ng') && capTbodyMonth.innerHTML.includes('So thÃ¡ng trÆ°á»›c') &&
  capTbodyMonth.innerHTML.includes('cap-hc') && capTbodyMonth.innerHTML.includes('cap-tc'));
cap.toggleCapacityStageDays('cut');

// P4. Giá» HC/TC á»Ÿ chip tá»•ng quan + tá»•ng xÆ°á»Ÿng
cap.setCapacityView('visual');
const stripMonth = document.getElementById('cap-summary-strip');
check('HC/TC: dáº£i strip cÅ© áº©n; tháº» Giá» tÃ¡ch HC/TC',
  stripMonth.hidden === true &&
  document.getElementById('cap-visual-row').innerHTML.includes('HC') &&
  document.getElementById('cap-visual-row').innerHTML.includes('TC'));
const wSep = cap.capWorkshopWeekRow('x2', wk);
check('HC/TC: tá»•ng xÆ°á»Ÿng tuáº§n dá»¯ liá»‡u â€” HC = 8h (Sáº¥y 4h + Ã‰p 4h) Â· TC = 0 Â· tá»•ng giá» 24h',
  approx(wSep.hc, 8) && wSep.tc === 0 && approx(wSep.hours, 24));

// P5. BÃ¡o cÃ¡o IN â€” chá»‰ thÃ´ng tin chung cá»§a Táº¤T Cáº¢ bá»™ pháº­n
const reportHtml = cap.buildCapacityReportHtml();
check('IN: bÃ¡o cÃ¡o cÃ³ tiÃªu Ä‘á» NHÃ€ MÃY + ká»³ bÃ¡o cÃ¡o Ä‘ang xem (ThÃ¡ng 9/2026)',
  reportHtml.includes('NHÃ€ MÃY NGá»ŒC SÆ N THANH HÃ“A') && reportHtml.includes('ThÃ¡ng 9/2026'));
check('IN: gá»“m Táº¤T Cáº¢ bá»™ pháº­n trong sá»• CAP_WORKSHOPS (XÆ°á»Ÿng 2 cÃ³ báº£ng + Tá»”NG, XÆ°á»Ÿng 1 ghi chÃº chÆ°a cÃ³ dá»¯ liá»‡u)',
  reportHtml.includes('XÆ°á»Ÿng 2') && reportHtml.includes('Tá»”NG XÆ°á»Ÿng 2') &&
  reportHtml.includes('XÆ°á»Ÿng 1') && reportHtml.includes('ChÆ°a cÃ³ cÃ´ng Ä‘oáº¡n nÃ o'));
check('IN: báº£ng cÃ³ cá»™t Giá» HC Â· Giá» TC Â· Tá»•ng giá» RIÃŠNG BIá»†T',
  reportHtml.includes('Giá» HC') && reportHtml.includes('Giá» TC') && reportHtml.includes('Tá»•ng giá»'));
check('IN: KHÃ”NG chá»©a báº£n Ä‘á»“ nhiá»‡t (Ä‘Ã£ gá»¡) Â· biá»ƒu Ä‘á»“ 8 ká»³ (cap-stage-chart) Â· gauge (cap-gauge)',
  !reportHtml.includes('data-cap-heat') && !reportHtml.includes('cap-stage-chart') && !reportHtml.includes('cap-gauge'));
check('IN: dÃ²ng Tá»”NG xÆ°á»Ÿng KHÃ”NG cá»™ng sáº£n lÆ°á»£ng khÃ¡c Ä‘Æ¡n vá»‹ (Ã´ sáº£n lÆ°á»£ng lÃ  "â€”")',
  /Tá»”NG XÆ°á»Ÿng 2[\s\S]*?<td class="num"[^>]*>â€”<\/td>/.test(reportHtml));
cap.setCapacityMode('week');
const reportWeek = cap.buildCapacityReportHtml();
check('IN: cháº¿ Ä‘á»™ TUáº¦N â†’ bÃ¡o cÃ¡o neo Ä‘Ãºng tuáº§n Ä‘ang xem (nhÃ£n "Tuáº§n ...")',
  reportWeek.includes('THEO TUáº¦N') && reportWeek.includes('Tuáº§n '));

// P6. Cáº¤U TRÃšC má»›i trong index.html / styles.css / events.js
const evJs = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (index.html): Ä‘á»§ nÃºt Tuáº§nâ‡„ThÃ¡ng + Ã´ chá»n thÃ¡ng + In bÃ¡o cÃ¡o + vÃ¹ng in riÃªng',
  indexHtml.includes('id="cap-mode-week"') && indexHtml.includes('id="cap-mode-month"') &&
  indexHtml.includes('id="cap-month"') && indexHtml.includes('id="btn-cap-print"') &&
  indexHtml.includes('id="cap-print-area"'));
check('Cáº¤U TRÃšC (styles.css): CSS Ã´ chá»n thÃ¡ng + khá»‘i in body.cap-printing (A4 ngang)',
  stylesCss.includes('.cap-month-input') && stylesCss.includes('body.cap-printing #cap-print-area') &&
  stylesCss.includes('@page { size: A4 landscape; margin: 8mm; }'));
check('Cáº¤U TRÃšC (events.js): Ä‘Ã£ ná»‘i Tuáº§nâ‡„ThÃ¡ng + Ã´ thÃ¡ng + In bÃ¡o cÃ¡o',
  evJs.includes("setCapacityMode('week')") && evJs.includes("setCapacityMode('month')") &&
  evJs.includes('setCapacityMonth') && evJs.includes("'btn-cap-print'"));

// â”€â”€â”€ R. HIá»†U SUáº¤T THAN HÃ“A + Sáº¤Y TÃNH TRONG CA (18/10/2026) â”€â”€â”€â”€â”€
// 2 ca cÃ¹ng ngÃ y â†’ má»—i ca 1 dÃ²ng, giá» lÃ  giá» THáº¬T cá»§a ca; KHÃ”NG chia Sáº¥y 1/Sáº¥y 2
// vÃ  KHÃ”NG nhÃ¢n Ä‘Ã´i giá» (Î£ giá» cÃ¡c ca = Ä‘Ãºng giá» cá»§a ngÃ y).
const D2 = '2026-09-21';
const wk2 = cap.capWeekKeyOf(D2);
state.hrShifts = [{
  id: 'XÆ°á»Ÿng 2', type: 'lamca',
  shifts: [{ name: 'Ca ngÃ y', start: '07:00', end: '19:00' }, { name: 'Ca Ä‘Ãªm', start: '19:00', end: '07:00' }]
}];
state.hrWorkCalendar = {};
state.hrPositions = [{ id: 'pth', name: 'Than hÃ³a', department: 'XÆ°á»Ÿng 2' }];
state.hrEmployees = [{ id: 'e1', name: 'Nguyá»…n VÄƒn A' }, { id: 'e2', name: 'Tráº§n Thá»‹ B' }];
state.hrAssignments = [
  { id: 'ta1', date: D2, department: 'XÆ°á»Ÿng 2', positionId: 'pth', employeeId: 'e1', start: '07:00', end: '19:00', shiftIdx: 0 },
  { id: 'ta2', date: D2, department: 'XÆ°á»Ÿng 2', positionId: 'pth', employeeId: 'e2', start: '19:00', end: '07:00', shiftIdx: 1 }
];
state.batches = [
  { id: 'sl1', code: 'SL-1', date: D2, stage: 'say1', quantity: 1000, volume: 4, length: 1250, width: 18, thickness: 7, sayCharges: { say1: 111 }, sayShift: { say1: 0 } },
  { id: 'sl2', code: 'SL-2', date: D2, stage: 'say1', quantity: 500, volume: 2, length: 1250, width: 18, thickness: 9, sayCharges: { say1: 222 }, sayShift: { say1: 1 } }
];
state.x2SayIncidents = {};
state.x2SayTimes = {};
const sayWeek2 = cap.capStagePeriodRow(saySt, wk2, 'week');
check('CA (Tá»•ng há»£p): 2 ca cÃ¹ng ngÃ y â†’ 2 DÃ’NG (ngÃ y, ca) â€” KHÃ”NG tÃ¡ch Sáº¥y 1 / Sáº¥y 2',
  sayWeek2.days.length === 2 && sayWeek2.days.map(d => d.shiftIdx).join(',') === '0,1');
check('CA (Tá»•ng há»£p): giá» tá»«ng ca lÃ  GIá»œ THáº¬T (ca ngÃ y 10,5h Â· ca Ä‘Ãªm 11h) â€” Î£ 21,5h = giá» ngÃ y (KHÃ”NG nhÃ¢n Ä‘Ã´i)',
  approx(sayWeek2.days[0].hours, 10.5) && approx(sayWeek2.days[1].hours, 11) && approx(sayWeek2.hours, 21.5));
check('CA (Tá»•ng há»£p): hiá»‡u suáº¥t ká»³ = Î£ giá» cáº§n (3,5h) Ã· Î£ giá» thá»±c (21,5h) â‰ˆ 16,3%',
  approx(sayWeek2.days.reduce((a, d) => a + d.need, 0), 3.5) && approx(sayWeek2.eff, (3.5 / 21.5) * 100, 1e-4));
check('CA (Tá»•ng há»£p): hiá»‡u suáº¥t Tá»ªNG CA = giá» cáº§n cá»§a ca Ã· giá» thá»±c cá»§a ca (1,75 Ã· 10,5 â‰ˆ 16,7%)',
  approx((sayWeek2.days[0].need / (sayWeek2.days[0].hours - sayWeek2.days[0].incident)) * 100, (1.75 / 10.5) * 100, 1e-4));
check('CA (Tá»•ng há»£p): mÂ³ cá»§a ca = mÂ³ THáº¬T cá»§a cÃ¡c lÃ´ thuá»™c ca Ä‘Ã³',
  approx(sayWeek2.days[0].qty, 4) && approx(sayWeek2.days[1].qty, 2));
cap.setCapacityView('table');
cap.setCapacityWeek(wk2);
cap.toggleCapacityWeekOpen(wk2);
cap.toggleCapacityStageDays('say');
const capTbodyCa = document.getElementById('capacity-week-rows').innerHTML;
check('CA (Tá»•ng há»£p): táº§ng NGÃ€Y gáº¯n CHIP CA cho tá»«ng dÃ²ng (data-shift-idx)',
  capTbodyCa.includes('x2-day-shift-chip') && capTbodyCa.includes('data-shift-idx="1"'));
check('CA (Tá»•ng há»£p): cá»™t Äá»‹nh má»©c cá»§a dÃ²ng gá»™p ghi rÃµ Cáº¢ 2 cÃ´ng Ä‘oáº¡n sáº¥y (S1 Â· S2), KHÃ”NG pháº£i 0 mÂ³/h',
  capTbodyCa.includes('S1 ') && capTbodyCa.includes('S2 ') && !capTbodyCa.includes('Ã· ÄM 0'));

// â”€â”€â”€ S. Cáº¢NH BÃO Dá»® LIá»†U QUÃ Háº N (21/10/2026 â€” thay báº£n Ä‘á»“ nhiá»‡t Ä‘Ã£ gá»¡) â”€â”€
// Quy táº¯c: quÃ¡ 1 NGÃ€Y LÃ€M VIá»†C chÆ°a cáº­p nháº­t lÃ  cáº£nh bÃ¡o; bá» qua CN/ngÃ y nghá»‰
// theo Lá»‹ch LÃ m Viá»‡c (trá»« ngÃ y lÃ m bÃ¹); cÃ´ng Ä‘oáº¡n chÆ°a tá»«ng nháº­p â†’ 'never' (xÃ¡m).
state.hrWorkCalendar = { '2026-10': { weekdaysOff: [0] } };
check('QUÃ Háº N: CN máº·c Ä‘á»‹nh nghá»‰ â†’ khÃ´ng tÃ­nh lÃ  ngÃ y lÃ m viá»‡c (17/10 Thá»© 7 â†’ 19/10 Thá»© 2 = 1 ngÃ y)',
  cap.capIsWorkDay('2026-10-17') && !cap.capIsWorkDay('2026-10-18') &&
  cap.capIsWorkDay('2026-10-19') && cap.capWorkDaysSince('2026-10-17', '2026-10-19') === 1);
check('QUÃ Háº N: ngÃ y nghá»‰/lá»… trong Lá»‹ch (restDays) vÃ  ngÃ y LÃ€M BÃ™ (workDays) Ä‘á»c Ä‘Ãºng',
  (() => {
    state.hrWorkCalendar = { '2026-10': { weekdaysOff: [0], restDays: ['2026-10-19'], workDays: ['2026-10-18'] } };
    const ok = !cap.capIsWorkDay('2026-10-19') && cap.capIsWorkDay('2026-10-18');
    state.hrWorkCalendar = { '2026-10': { weekdaysOff: [0] } };
    return ok;
  })());
check('QUÃ Háº N: "hÃ´m nay" láº¥y theo GIá»œ MÃY (khÃ´ng lá»‡ch 1 ngÃ y do toISOString/UTC)',
  cap.capTodayLocalISO() === (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })());
check('QUÃ Háº N: ngÃ y lá»‹ch (16/10 â†’ 20/10 = 4) khÃ¡c ngÃ y lÃ m viá»‡c (3: 17, 19, 20 â€” bá» CN 18)',
  cap.capCalendarDaysSince('2026-10-16', '2026-10-20') === 4 &&
  cap.capWorkDaysSince('2026-10-16', '2026-10-20') === 3);

// Dá»¯ liá»‡u thá»­: chá»‰ Bá»• á»ng cÅ© (16/10) + Cáº¯t Chá»n má»›i (20/10), cÃ¡c cÃ´ng Ä‘oáº¡n khÃ¡c rá»—ng
[
  'xuong2BoluongRecords', 'xuong2CutRecords', 'xuong2BoOngRecords', 'xuong2BaoThoRecords',
  'xuong2ChonNanThoRecords', 'xuong2BaoTinhRecords', 'pressRecords', 'xuong2BulligRecords',
  'xuong2CatVanRecords', 'xuong2BaoVanRecords', 'xuong1CatOngRecords', 'xuong1SaySinhRecords',
  'xuong1BocRecords', 'xuong1LocOngRecords', 'xuong1CatMatRecords', 'xuong1BoRecords',
  'xuong1PhoiSayRecords', 'xuong1LocThanhRecords'
].forEach(k => { state[k] = []; });
state.batches = [];
state.x2SayRates = {}; state.x2SayIncidents = {}; state.x2SayTimes = {};
state.xuong2CutRecords = [{ id: 's-cut', materialId: 'mat-a', date: '2026-10-20', cutHours: 8 }];
state.xuong2BoOngRecords = [{ id: 's-boong', date: '2026-10-16', inputOng: 1000 }];
const staleScan = cap.capStaleScan('2026-10-21');
const staleCut = staleScan.find(r => r.stageId === 'cut');
const staleBoong = staleScan.find(r => r.stageId === 'boong');
const staleX1 = staleScan.find(r => r.stageId === 'x1catong');
check('QUÃ Háº N: má»›i 1 ngÃ y lÃ m viá»‡c (Cáº¯t Chá»n 20/10) â†’ KHÃ”NG cáº£nh bÃ¡o', staleCut && staleCut.status === 'ok');
check('QUÃ Háº N: 4 ngÃ y lÃ m viá»‡c (Bá»• á»ng 16/10) â†’ cáº£nh bÃ¡o + Ä‘áº¿m Ä‘Ãºng ngÃ y lá»‹ch/ngÃ y lÃ m viá»‡c',
  staleBoong && staleBoong.status === 'late' && staleBoong.workDays === 4 && staleBoong.calDays === 5);
check('QUÃ Háº N: nÃªu ÄÃšNG xÆ°á»Ÿng + cÃ´ng Ä‘oáº¡n (XÆ°á»Ÿng 2 Â· Bá»• á»ng)', staleBoong.wsLabel === 'XÆ°á»Ÿng 2' && staleBoong.stageLabel === 'Bá»• á»ng');
check('QUÃ Háº N: cÃ´ng Ä‘oáº¡n chÆ°a tá»«ng nháº­p â†’ never (KHÃ”NG Ä‘á»), váº«n cÃ³ trong panel',
  staleX1 && staleX1.status === 'never' && staleX1.wsLabel === 'XÆ°á»Ÿng 1');
check('QUÃ Háº N: quÃ©t Cáº¢ 2 xÆ°á»Ÿng dÃ¹ Ä‘ang xem XÆ°á»Ÿng 2 (10 X2 cÃ²n cÃ´ng suáº¥t + 7 X1 = 17 cÃ´ng Ä‘oáº¡n)',
  state.capUi.ws === 'x2' && staleScan.length === 17 &&
  staleScan.some(r => r.ws === 'x1') && staleScan.some(r => r.ws === 'x2'));
const lateRows = staleScan.filter(r => r.status === 'late');
const neverRows = staleScan.filter(r => r.status === 'never');
check('QUÃ Háº N: tÃ³m táº¯t 1 dÃ²ng ghi Ä‘Ãºng xÆ°á»Ÿng + cÃ´ng Ä‘oáº¡n + sá»‘ ngÃ y',
  cap.capStaleSummaryOf(lateRows).includes('XÆ°á»Ÿng 2') && cap.capStaleSummaryOf(lateRows).includes('Bá»• á»ng (4 ngÃ y)'));
check('QUÃ Háº N: cÃ¢u áº£nh hÆ°á»Ÿng nÃªu há»¥t hiá»‡u suáº¥t + cÃ´ng Ä‘oáº¡n sau bá»‹ thiáº¿u Ä‘áº§u vÃ o',
  cap.capStaleImpactOf(staleBoong).includes('tháº¥p hÆ¡n thá»±c táº¿') &&
  cap.capStaleImpactOf(staleBoong).includes('Cháº¡y MÃ¡y BÃ o ThÃ´'));


const staleHtml = cap.capStaleHtml(lateRows, neverRows);
check('QUÃ Háº N: banner + panel nÃªu ngÃ y cáº­p nháº­t cuá»‘i, sá»‘ ngÃ y, nÃºt Má»Ÿ tháº» Ä‘Ãºng cÃ´ng Ä‘oáº¡n',
  staleHtml.includes('Bá»• á»ng') && staleHtml.includes('16/10') &&
  staleHtml.includes('data-cap-open-card="x2-bo-ong-card"') && staleHtml.includes('ChÆ°a cáº­p nháº­t'));
check('QUÃ Háº N: panel cÃ³ má»¥c xÃ¡m cÃ´ng Ä‘oáº¡n chÆ°a tá»«ng nháº­p + khá»‘i nháº¯c áº¢NH HÆ¯á»žNG',
  staleHtml.includes('ChÆ°a tá»«ng cÃ³ sá»‘ liá»‡u') &&
  staleHtml.includes('Sá»‘ liá»‡u khÃ´ng cáº­p nháº­t thÃ¬ áº£nh hÆ°á»Ÿng tháº¿ nÃ o?') &&
  staleHtml.includes('Hiá»‡u suáº¥t xÆ°á»Ÿng tuáº§n/thÃ¡ng bá»‹ há»¥t hoáº·c sai') &&
  staleHtml.includes('BÃ¡o cÃ¡o In Â· Xuáº¥t Excel Â· Trá»£ lÃ½ AI'));
cap.renderCapStale(staleScan, false);
check('QUÃ Háº N: renderCapStale áº©n banner, chá»‰ giá»¯ chip #cap-stale-chip',
  document.getElementById('cap-stale').hidden === true &&
  document.getElementById('cap-stale').innerHTML === '' &&
  document.getElementById('cap-stale-chip').hidden === false &&
  document.getElementById('cap-stale-chip').innerHTML.includes('CÄ quÃ¡ háº¡n'));
cap.renderCapStale(staleScan, true);
check('QUÃ Háº N: xÆ°á»Ÿng chÆ°a cÃ³ sá»‘ liá»‡u (suppress) â†’ áº©n banner + chip, khÃ´ng chá»“ng thÃ´ng bÃ¡o',
  document.getElementById('cap-stale').hidden === true &&
  document.getElementById('cap-stale-chip').hidden === true);
// KhÃ´ng bÃ¡o sai khi sá»‘ liá»‡u lÃ  HÃ”M NAY/HÃ”M QUA
state.xuong2BoOngRecords = [{ id: 's-boong2', date: '2026-10-20', inputOng: 900 }];
check('QUÃ Háº N: cáº­p nháº­t hÃ´m qua â†’ khÃ´ng cÃ²n cáº£nh bÃ¡o (trÃ¡nh bÃ¡o phiá»n buá»•i sÃ¡ng)',
  cap.capStaleScan('2026-10-21').every(r => r.stageId !== 'boong' || r.status === 'ok'));
state.xuong2BoOngRecords = [{ id: 's-boong', date: '2026-10-16', inputOng: 1000 }];
// Nhá»› tráº¡ng thÃ¡i má»Ÿ/Ä‘Ã³ng panel THEO MÃY (state.capUi.staleOpen trong key UI sáºµn cÃ³)
cap.toggleCapStale(true);
const staleUiSaved = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || '{}');
check('QUÃ Háº N: má»Ÿ panel nhá»› theo mÃ¡y (staleOpen=true) + tá»± má»Ÿ rá»™ng tháº» khi Ä‘ang thu gá»n',
  state.capUi.staleOpen === true && staleUiSaved.staleOpen === true && state.capUi.collapsed === false);
cap.toggleCapStale(false);
check('QUÃ Háº N: báº¥m láº¡i â†’ Ä‘Ã³ng panel (staleOpen=false)', state.capUi.staleOpen === false);
const capJsStale = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
const evJsStale = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (index.html): cÃ³ banner #cap-stale + chip #cap-stale-chip trong tháº» cÃ´ng suáº¥t',
  indexHtml.includes('id="cap-stale"') && indexHtml.includes('id="cap-stale-chip"'));
check('Cáº¤U TRÃšC (capacity.js): CAP_STALE_DAYS + quÃ©t 2 xÆ°á»Ÿng + ngÃ y theo giá» mÃ¡y',
  capJsStale.includes('const CAP_STALE_DAYS = 1') && capJsStale.includes('function capStaleScan(') &&
  capJsStale.includes('capTodayLocalISO'));
check('Cáº¤U TRÃšC (events.js + styles.css): ná»‘i toggle panel/chip + CSS banner & báº£ng chi tiáº¿t',
  evJsStale.includes('toggleCapStale') && evJsStale.includes('#cap-stale-toggle') &&
  stylesCss.includes('.cap-stale-panel') && stylesCss.includes('.cap-stale-impact'));

// â”€â”€â”€ HIá»†U SUáº¤T CÃ”NG NHÃ‚N: gia quyá»n theo giá», fail-closed khi thiáº¿u liÃªn káº¿t â”€â”€
state.hrEmployees = [{ id: 'eff-worker', name: 'CÃ´ng nhÃ¢n kiá»ƒm thá»­' }];
state.hrPositions = [
  { id: 'eff-cut', name: 'Cáº¯t Chá»n', department: 'XÆ°á»Ÿng 2' },
  { id: 'eff-boong', name: 'Bá»• á»ng', department: 'XÆ°á»Ÿng 2' }
];
state.hrShifts = [{ id: 'XÆ°á»Ÿng 2', type: 'hanhchinh', shifts: [
  { name: 'SÃ¡ng', start: '07:00', end: '11:30' },
  { name: 'Chiá»u', start: '13:00', end: '17:30' }
] }];
state.hrAssignments = [
  { id: 'eff-cut-day1', date: '2026-09-10', employeeId: 'eff-worker', department: 'XÆ°á»Ÿng 2', positionId: 'eff-cut', start: '07:00', end: '09:00', shiftIdx: 0 },
  { id: 'eff-boong-day1a', date: '2026-09-10', employeeId: 'eff-worker', department: 'XÆ°á»Ÿng 2', positionId: 'eff-boong', start: '09:00', end: '11:30', shiftIdx: 0 },
  { id: 'eff-boong-day1b', date: '2026-09-10', employeeId: 'eff-worker', department: 'XÆ°á»Ÿng 2', positionId: 'eff-boong', start: '13:00', end: '16:30', shiftIdx: 0 },
  { id: 'eff-cut-day2a', date: '2026-09-11', employeeId: 'eff-worker', department: 'XÆ°á»Ÿng 2', positionId: 'eff-cut', start: '07:00', end: '11:30', shiftIdx: 0 },
  { id: 'eff-cut-day2b', date: '2026-09-11', employeeId: 'eff-worker', department: 'XÆ°á»Ÿng 2', positionId: 'eff-cut', start: '13:00', end: '16:30', shiftIdx: 0 }
];
state.x2CapRates = { '2026-09': 1 };
state.x2BoOngRates = { '2026-09': 100 };
state.materialRecords = [];
state.xuong2CutRecords = [
  { id: 'eff-cut-rec1', date: '2026-09-10', inputKind: 'luong-cay', inputWeight: 1200, carts: 2, kgPerCart: 600 },
  { id: 'eff-cut-rec2', date: '2026-09-11', inputKind: 'luong-cay', inputWeight: 3600, carts: 6, kgPerCart: 600 }
];
state.xuong2BoOngRecords = [{ id: 'eff-boong-rec', date: '2026-09-10', inputOng: 300 }];
const weightedEfficiency = cap.computeWorkerStageEfficiency('2026-09').get('eff-worker');
check('ÄÃNH GIÃ HS: chá»n cÃ´ng Ä‘oáº¡n nhiá»u giá» nháº¥t, khÃ´ng chá»n hiá»‡u suáº¥t cao nháº¥t',
  !!weightedEfficiency && weightedEfficiency.efficiency === 80 &&
  weightedEfficiency.validHours === 10 && weightedEfficiency.assignedHours === 10 &&
  weightedEfficiency.coverageRate === 100 && weightedEfficiency.stageDetails[0].id === 'cut');

state.hrAssignments = state.hrAssignments.concat([
  { id: 'eff-unlinked', date: '2026-09-10', employeeId: '', department: 'XÆ°á»Ÿng 2', positionId: 'eff-cut', start: '09:00', end: '10:00', shiftIdx: 0 }
]);
const incompleteEfficiency = cap.computeWorkerStageEfficiency('2026-09').get('eff-worker');
check('ÄÃNH GIÃ HS: thiáº¿u employeeId lÃ m loáº¡i cáº£ ngÃ y cÃ´ng Ä‘oáº¡n khÃ´ng khá»›p giá» nhÃ³m',
  !!incompleteEfficiency && incompleteEfficiency.efficiency === 75 &&
  incompleteEfficiency.validHours === 8 && incompleteEfficiency.assignedHours === 10 && incompleteEfficiency.coverageRate === 80);

state.hrPositions = state.hrPositions.concat([{ id: 'eff-unmatched', name: 'Vá»‹ trÃ­ chÆ°a Ã¡nh xáº¡', department: 'XÆ°á»Ÿng 2' }]);
state.hrAssignments = state.hrAssignments.filter(a => a.id !== 'eff-unlinked').concat([
  { id: 'eff-unmatched-record', date: '2026-09-12', employeeId: 'eff-worker', department: 'XÆ°á»Ÿng 2', positionId: 'eff-unmatched', start: '07:00', end: '10:00', shiftIdx: 0 }
]);
const partialEfficiency = cap.computeWorkerStageEfficiency('2026-09').get('eff-worker');
check('ÄÃNH GIÃ HS: váº«n hiá»ƒn thá»‹ hiá»‡u suáº¥t tÃ­nh Ä‘Æ°á»£c dÃ¹ cÃ³ phÃ¢n cÃ´ng chÆ°a nháº­n diá»‡n, kÃ¨m chi tiáº¿t truy váº¿t',
  partialEfficiency.efficiency === 80 && partialEfficiency.unmatchedCount === 1 &&
  partialEfficiency.stageDetails.find(stage => stage.selected).id === 'cut' &&
  partialEfficiency.unmatchedAssignments[0].date === '2026-09-12' &&
  partialEfficiency.unmatchedAssignments[0].reason.includes('chÆ°a Ä‘Æ°á»£c Ã¡nh xáº¡'));

state.hrAssignments = state.hrAssignments.filter(a => a.id !== 'eff-unlinked').concat([
  { id: 'eff-overlap', date: '2026-09-10', employeeId: 'eff-worker', department: 'XÆ°á»Ÿng 2', positionId: 'eff-cut', start: '08:00', end: '10:00', shiftIdx: 0 }
]);
const overlapEfficiency = cap.computeWorkerStageEfficiency('2026-09').get('eff-worker');
check('ÄÃNH GIÃ HS: loáº¡i giá» phÃ¢n cÃ´ng chá»“ng láº¥n vÃ  khÃ´ng cá»™ng trÃ¹ng',
  !!overlapEfficiency && overlapEfficiency.efficiency === 75 &&
  overlapEfficiency.validHours === 8 && overlapEfficiency.overlapCount === 3 &&
  overlapEfficiency.overlapAssignments.length === 3 &&
  overlapEfficiency.overlapAssignments.some(issue => issue.date === '2026-09-10' && issue.conflicts.length > 0));

const savedCutRows = cutSt.rows, savedCutRate = cutSt.rateOf;
const savedBoRows = boongSt.rows, savedBoRate = boongSt.rateOf;
cutSt.rateOf = boongSt.rateOf = () => 100;
state.hrEmployees = [{ id: 'one', name: 'Má»™t' }, { id: 'two', name: 'Hai' }];
const asg = (id, employeeId, positionId, date, start, end) =>
  ({ id, employeeId, positionId, date, start, end, department: 'XÆ°á»Ÿng 2', shiftIdx: 0 });
const stageRow = (date, hours, qty) => ({ date, hours, qty, qtyKnown: true });
state.hrAssignments = [
  asg('one-cut-a', 'one', 'eff-cut', '2026-09-10', '07:00', '11:00'),
  asg('one-bo-a', 'one', 'eff-boong', '2026-09-10', '13:00', '15:00'),
  asg('two-cut-a', 'two', 'eff-cut', '2026-09-10', '07:00', '11:00'),
  asg('one-cut-b', 'one', 'eff-cut', '2026-09-11', '07:00', '09:00')
];
cutSt.rows = () => [stageRow('2026-09-10', 8, 800), stageRow('2026-09-11', 2, 100)];
boongSt.rows = () => [stageRow('2026-09-10', 2, 400)];
let byPerson = cap.computeWorkerStageEfficiency('2026-09');
check('ÄÃNH GIÃ HS: ngÆ°á»i cÃ¹ng cÃ´ng Ä‘oáº¡n chÃ­nh cÃ³ thá»ƒ khÃ¡c káº¿t quáº£ theo ngÃ y tham gia',
  byPerson.get('one').efficiency === 83.3 && byPerson.get('two').efficiency === 100 &&
  byPerson.get('one').stageDetails[0].id === 'cut');
state.hrAssignments = [
  asg('tie-cut', 'one', 'eff-cut', '2026-09-10', '07:00', '11:00'),
  asg('tie-bo', 'one', 'eff-boong', '2026-09-10', '13:00', '17:00')
];
cutSt.rows = () => [stageRow('2026-09-10', 4, 320)];
boongSt.rows = () => [stageRow('2026-09-10', 4, 480)];
let tie = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: báº±ng giá» chá»n cÃ´ng Ä‘oáº¡n cÃ³ hiá»‡u suáº¥t cao hÆ¡n',
  tie.efficiency === 120 && tie.stageDetails.find(s => s.selected).id === 'boong' && tie.stageDetails.length === 2);
boongSt.rows = () => [stageRow('2026-09-10', 4, 320)];
tie = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: báº±ng giá» vÃ  hiá»‡u suáº¥t giá»¯ cáº£ hai cÃ´ng Ä‘oáº¡n Ä‘á»“ng chÃ­nh',
  tie.efficiency === 80 && tie.stageDetails.filter(s => s.selected).length === 2 &&
  tie.assignedHours === null && tie.coverageRate === null);
cutSt.rows = () => [stageRow('2026-09-10', 4, 320.016)];
boongSt.rows = () => [stageRow('2026-09-10', 4, 320.012)];
tie = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: so sÃ¡nh tá»· lá»‡ trÆ°á»›c lÃ m trÃ²n khi cÃ¡c sá»‘ hiá»ƒn thá»‹ báº±ng nhau',
  tie.efficiency === 80 && tie.stageDetails.filter(s => s.selected).length === 1 &&
  tie.stageDetails.find(s => s.selected).id === 'cut' &&
  tie.stageDetails[0].efficiency === tie.stageDetails[1].efficiency);
cutSt.rows = () => [{ ...stageRow('2026-09-10', 4, 320), qtyEstimated: true }];
boongSt.rows = () => [];
tie = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: báº±ng giá» vÃ  thiáº¿u má»™t hiá»‡u suáº¥t thÃ¬ chá»n sá»‘ cÃ³ dá»¯ liá»‡u kÃ¨m cáº£nh bÃ¡o',
  tie.efficiency === 80 && tie.tieMissing && tie.stageDetails.find(s => s.selected).id === 'cut' &&
  tie.estimatedHours === 4 && tie.stageDetails.find(s => s.selected).estimatedHours === 4);
cutSt.rows = () => [];
tie = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: báº±ng giá» nhÆ°ng cáº£ hai thiáº¿u hiá»‡u suáº¥t thÃ¬ khÃ´ng táº¡o tá»· lá»‡',
  tie.efficiency === null && !tie.tieMissing && tie.stageDetails.length === 2);
state.hrAssignments = [
  asg('main-cut', 'one', 'eff-cut', '2026-09-10', '07:00', '11:00'),
  asg('support-bo', 'one', 'eff-boong', '2026-09-10', '13:00', '15:00')
];
boongSt.rows = () => [stageRow('2026-09-10', 2, 400)];
let missingMain = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: cÃ´ng Ä‘oáº¡n chÃ­nh thiáº¿u dá»¯ liá»‡u khÃ´ng thay báº±ng cÃ´ng Ä‘oáº¡n há»— trá»£',
  missingMain.efficiency === null && missingMain.stageDetails[0].id === 'cut');
state.hrPositions = state.hrPositions.concat([{ id: 'unknown-pos', name: 'Vá»‹ trÃ­ chÆ°a Ã¡nh xáº¡', department: 'XÆ°á»Ÿng 2' }]);
state.hrAssignments.push(asg('unknown', 'one', 'unknown-pos', '2026-09-11', '07:00', '09:00'));
state.hrPositions = state.hrPositions.concat([
  { id: 'support-odd-pos', name: 'Há»— trá»£/ CÃ´ng Ä‘oáº¡n láº»', department: 'XÆ°á»Ÿng 2' },
  { id: 'support-plus-pos', name: 'Há»— trá»£ + CÃ´ng Ä‘oáº¡n láº»', department: 'XÆ°á»Ÿng 2' },
  { id: 'support-pos', name: 'Há»— trá»£', department: 'XÆ°á»Ÿng 2' },
  { id: 'leader-compact-pos', name: 'TT/TP', department: 'XÆ°á»Ÿng 2' },
  { id: 'leader-full-pos', name: 'Tá»• trÆ°á»Ÿng', department: 'XÆ°á»Ÿng 2' },
  { id: 'deputy-full-pos', name: 'Tá»• phÃ³', department: 'XÆ°á»Ÿng 2' }
]);
state.hrAssignments.push(
  asg('support-odd-assignment', 'one', 'support-odd-pos', '2026-09-12', '07:00', '08:00'),
  asg('support-plus-assignment', 'one', 'support-plus-pos', '2026-09-12', '08:00', '09:00'),
  asg('support-assignment', 'one', 'support-pos', '2026-09-12', '09:00', '10:00'),
  asg('leader-compact-assignment', 'one', 'leader-compact-pos', '2026-09-12', '10:00', '11:00'),
  asg('leader-full-assignment', 'one', 'leader-full-pos', '2026-09-12', '11:00', '12:00'),
  asg('deputy-full-assignment', 'one', 'deputy-full-pos', '2026-09-12', '12:00', '13:00')
);
const evaluationAssignments = x2.workerAssignmentsForCapacityMonth('2026-09', { includeUnmatched: true });
check('ÄÃNH GIÃ HS: bá» qua Há»— trá»£ + CÃ´ng Ä‘oáº¡n láº» vÃ  TT/TP/Tá»• trÆ°á»Ÿng/Tá»• phÃ³, khÃ´ng táº¡o cáº£nh bÃ¡o chÆ°a nháº­n diá»‡n',
  !evaluationAssignments.some(assignment =>
    ['support-odd-assignment', 'support-plus-assignment', 'support-assignment', 'leader-compact-assignment', 'leader-full-assignment', 'deputy-full-assignment'].includes(assignment.id)) &&
  evaluationAssignments.some(assignment => assignment.id === 'unknown' &&
    assignment.unmatchedReason.includes('chÆ°a Ä‘Æ°á»£c Ã¡nh xáº¡')));
missingMain = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: váº«n cáº£nh bÃ¡o vá»‹ trÃ­ thá»±c sá»± chÆ°a nháº­n diá»‡n',
  missingMain.efficiency === null && missingMain.unmatchedCount === 1);
state.hrAssignments = [asg('invalid-time', 'one', 'eff-cut', '2026-09-10', '99:99', '11:00')];
const invalidTime = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: giá» phÃ¢n cÃ´ng khÃ´ng há»£p lá»‡ khÃ´ng táº¡o cÃ´ng Ä‘oáº¡n chÃ­nh',
  invalidTime.efficiency === null && invalidTime.unmatchedCount === 1);
state.hrAssignments = [
  asg('open-end', 'one', 'eff-cut', '2026-09-10', '07:00', ''),
  asg('overlap-open', 'one', 'eff-boong', '2026-09-10', '13:00', '15:00')
];
const openEnd = cap.computeWorkerStageEfficiency('2026-09').get('one');
check('ÄÃNH GIÃ HS: phÃ¡t hiá»‡n lá»‹ch trÃ¹ng vá»›i phÃ¢n cÃ´ng káº¿t thÃºc máº·c Ä‘á»‹nh háº¿t ca',
  openEnd.efficiency === null && openEnd.overlapCount === 2);
cutSt.rows = savedCutRows; cutSt.rateOf = savedCutRate;
boongSt.rows = savedBoRows; boongSt.rateOf = savedBoRate;

// â”€â”€â”€ Tá»•ng káº¿t â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log(`\nKáº¿t quáº£: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

