// tests/shift-split.test.mjs â€” TÃCH Dá»® LIá»†U THEO CA (2 CA) CHO CÃC THáºº CÃ”NG ÄOáº N
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Bá»‘i cáº£nh: tab NhÃ¢n Sá»± cÃ³ nÃºt "Ca LÃ m Viá»‡c" â€” bá»™ pháº­n Ä‘á»ƒ cháº¿ Ä‘á»™ "LÃ m ca" thÃ¬
// Báº£ng bá»‘ trÃ­ tÃ¡ch 2 cá»™t ca (Ca ngÃ y / Ca Ä‘Ãªm) vÃ  má»—i lÆ°á»£t bá»‘ trÃ­ lÆ°u shiftIdx.
// TrÆ°á»›c Ä‘Ã¢y cÃ¡c tháº» XÆ°á»Ÿng 2 gá»™p NGÆ¯á»œI + GIá»œ cá»§a cáº£ 2 ca thÃ nh 1 con sá»‘/ngÃ y â†’
// khÃ´ng biáº¿t ca nÃ o lÃ m bao nhiÃªu.
// GIAI ÄOáº N 1 (bÃ i nÃ y): tháº» ngÃ y tÃ¡ch riÃªng tá»«ng ca â€”
//   â€¢ NGÆ¯á»œI + GIá»œ HC/TC cá»§a má»—i ca = Sá» THáº¬T (tá»« Báº£ng bá»‘ trÃ­, tÃ¡ch theo cá»­a sá»• ca)
//   â€¢ Sáº¢N LÆ¯á»¢NG má»—i ca = Æ¯á»šC TÃNH (phÃ¢n bá»• theo tá»‰ lá»‡ giá» lÃ m) vÃ¬ form nháº­p 1 sá»‘
//     cho cáº£ ngÃ y â‡’ cÃ´ng suáº¥t/hiá»‡u suáº¥t tá»«ng ca LUÃ”N báº±ng nhau (toÃ¡n há»c) nÃªn
//     KHÃ”NG hiá»‡n Ä‘á»ƒ trÃ¡nh káº¿t luáº­n sai + cÃ³ ghi chÃº nháº¯c ngÆ°á»i dÃ¹ng.
//   â€¢ Chá»‰ khi sáº£n lÆ°á»£ng Ä‘Æ°á»£c nháº­p RIÃŠNG tá»«ng ca (bÆ°á»›c sau) má»›i hiá»‡n C.suáº¥t/H.suáº¥t
//     vÃ  gáº¯n â˜… cho ca hiá»‡u suáº¥t cao hÆ¡n (cá» perShiftQty).
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-ho-tro.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const { state } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
const utils = await import('../js/utils.js');

// â”€â”€â”€ Bá»™ ca "LÃ m ca" 2 ca dÃ¹ng chung cho má»i bá»™ pháº­n trong bÃ i test â”€â”€â”€â”€â”€â”€
const LAMCA = () => ({
  type: 'lamca',
  shifts: [
    { name: 'Ca ngÃ y', start: '07:00', end: '19:00' },
    { name: 'Ca Ä‘Ãªm', start: '19:00', end: '07:00' }
  ]
});
state.hrShifts = [
  { id: 'XÆ°á»Ÿng 2', ...LAMCA() },
  { id: 'XÆ°á»Ÿng 1', ...LAMCA() },
  { id: 'QC', ...LAMCA() }
];
state.hrWorkCalendar = {};   // khÃ´ng cÃ i gÃ¬ â†’ 2026-10-05 (Thá»© 2) lÃ  ngÃ y lÃ m viá»‡c
state.hrEmployees = [
  { id: 'eA', name: 'Nguyá»…n VÄƒn A' },
  { id: 'eB', name: 'Tráº§n Thá»‹ B' },
  { id: 'eC', name: 'LÃª VÄƒn C' },
  { id: 'eD', name: 'Pháº¡m Thá»‹ D' }
];
state.hrPositions = [];
state.hrAssignments = [];
const DAY = '2026-10-05';

// â•â•â• A. Gá»˜P THEO CA (utils.shiftGroupRows) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const gA = utils.shiftGroupRows([
  { shiftIdx: 0, name: 'Nguyá»…n VÄƒn A', hc: 12, tc: 0 },
  { shiftIdx: 1, name: 'Tráº§n Thá»‹ B', hc: 6, tc: 2 },
  { shiftIdx: 0, name: 'Nguyá»…n VÄƒn A', hc: 0, tc: 1 }   // cÃ¹ng ngÆ°á»i, cÃ¹ng ca â†’ tÃªn KHÃ”NG láº·p
]);
check('A1: gá»™p theo chá»‰ sá»‘ ca â€” 2 nhÃ³m, sáº¯p theo ca', gA.length === 2 && gA[0].shiftIdx === 0 && gA[1].shiftIdx === 1);
check('A2: cá»™ng giá» HC/TC theo ca + tÃªn khÃ´ng trÃ¹ng', gA[0].hc === 12 && gA[0].tc === 1 && gA[0].hours === 13 && gA[0].names.join(',') === 'Nguyá»…n VÄƒn A');
check('A3: ca 2 = 6h HC + 2h TC = 8h', gA[1].hours === 8 && gA[1].names.length === 1);
check('A4: ngÃ y 1 ca â†’ chá»‰ 1 nhÃ³m (khá»‘i ca tá»± áº©n á»Ÿ táº§ng HTML)',
  utils.shiftGroupRows([{ shiftIdx: 0, name: 'A', hc: 9, tc: 0 }]).length === 1);

// â•â•â• B. CHIA Sáº¢N LÆ¯á»¢NG / CÃ”NG SUáº¤T / HIá»†U SUáº¤T THEO CA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const secB = utils.shiftSectionRows({
  groups: utils.shiftGroupRows([
    { shiftIdx: 0, name: 'A', hc: 12, tc: 0 },
    { shiftIdx: 1, name: 'B', hc: 6, tc: 0 }
  ]),
  qty: 18000, unit: 'kg/h', rate: 1000, incHours: 0
});
check('B1: chia sáº£n lÆ°á»£ng theo Tá»ˆ Lá»† GIá»œ LÃ€M (12/18 â†’ 12.000 Â· 6/18 â†’ 6.000)',
  secB[0].qty === 12000 && secB[1].qty === 6000);
check('B2: cÃ´ng suáº¥t má»—i ca = sáº£n lÆ°á»£ng ca Ã· giá» ca (1.000 kg/h cáº£ 2 ca)',
  secB[0].cap === 1000 && secB[1].cap === 1000);
check('B3: phÃ¢n bá»• theo giá» â‡’ hiá»‡u suáº¥t 2 ca Báº°NG NHAU (Ä‘Ãºng báº£n cháº¥t Æ¯á»šC TÃNH)',
  secB[0].eff === 100 && secB[1].eff === 100);
check('B4: cÃ´ng Ä‘oáº¡n chá»‰ 1 ca â†’ null (khÃ´ng dá»±ng khá»‘i)',
  utils.shiftSectionRows({ groups: utils.shiftGroupRows([{ shiftIdx: 0, name: 'A', hc: 9, tc: 0 }]) }) === null);
const secB2 = utils.shiftSectionRows({
  groups: utils.shiftGroupRows([
    { shiftIdx: 0, name: 'A', hc: 12, tc: 0, qty: 15000 },   // sáº£n lÆ°á»£ng nháº­p RIÃŠNG tá»«ng ca (bÆ°á»›c sau)
    { shiftIdx: 1, name: 'B', hc: 6, tc: 0, qty: 3000 }
  ]),
  qty: 18000, unit: 'kg/h', rate: 1000, incHours: 0
});
check('B5: cÃ³ sáº£n lÆ°á»£ng RIÃŠNG theo ca â†’ dÃ¹ng sá»‘ cá»§a ca (1.250 vs 500 kg/h)',
  secB2[0].cap === 1250 && secB2[1].cap === 500 && secB2[0].eff === 125 && secB2[1].eff === 50);

// â•â•â• C. KHá»I HTML "THEO CA" â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const META = { 0: { name: 'Ca ngÃ y', start: '07:00', end: '19:00' }, 1: { name: 'Ca Ä‘Ãªm', start: '19:00', end: '07:00' } };
const secCOf = (o) => ({
  label: 'Cáº¯t chá»n', unit: 'kg/h', rate: 1000, incHours: 0, qty: 18000,
  groups: utils.shiftGroupRows([
    { shiftIdx: 0, name: 'A (test)', hc: 12, tc: 0 },
    { shiftIdx: 1, name: 'B (test)', hc: 6, tc: 0 }
  ]),
  ...(o || {})
});
const htmlC = utils.shiftBreakdownHtml({ date: DAY, incHours: 0, shiftMeta: META, sections: [secCOf()] });
check('C1: cÃ³ khá»‘i .x2-shift-rows + Ä‘Ãºng 2 dÃ²ng ca',
  htmlC.includes('class="x2-shift-rows"') && (htmlC.match(/class="x2-shift-row"/g) || []).length === 2);
check('C2: tÃªn ca + khung giá» láº¥y tá»« CÃ i Äáº·t Ca', htmlC.includes('Ca ngÃ y') && htmlC.includes('Ca Ä‘Ãªm') && htmlC.includes('07:00â€“19:00'));
check('C3: NGÆ¯á»œI + GIá»œ lÃ  sá»‘ THáº¬T cá»§a tá»«ng ca',
  htmlC.includes('A (test)') && htmlC.includes('B (test)') && htmlC.includes('12,0h HC') && htmlC.includes('6,0h HC'));
check('C4: sáº£n lÆ°á»£ng má»—i ca ghi rÃµ lÃ  Æ¯á»šC TÃNH (SL ~)', (htmlC.match(/SL ~/g) || []).length === 2);
check('C5: KHÃ”NG hiá»‡n C.suáº¥t/H.suáº¥t tá»«ng ca khi sáº£n lÆ°á»£ng cÃ²n ghi chung',
  !htmlC.includes('C.suáº¥t') && !htmlC.includes('H.suáº¥t'));
check('C6: cÃ³ ghi chÃº TRUNG THá»°C â€” chÆ°a so Ä‘Æ°á»£c ca nÃ o lÃ m tá»‘t hÆ¡n',
  htmlC.includes('chÆ°a so Ä‘Æ°á»£c ca nÃ o lÃ m tá»‘t hÆ¡n'));
const htmlPerf = utils.shiftBreakdownHtml({
  date: DAY, incHours: 0, shiftMeta: META, perShiftQty: true,
  sections: [secCOf({
    groups: utils.shiftGroupRows([
      { shiftIdx: 0, name: 'A (test)', hc: 12, tc: 0, qty: 15000 },
      { shiftIdx: 1, name: 'B (test)', hc: 6, tc: 0, qty: 3000 }
    ])
  })]
});
check('C7: perShiftQty â†’ hiá»‡n C.suáº¥t + H.suáº¥t + â˜… cho ca cao hÆ¡n',
  htmlPerf.includes('C.suáº¥t') && htmlPerf.includes('H.suáº¥t') && htmlPerf.includes('x2-shift-best') && !htmlPerf.includes('chÆ°a so Ä‘Æ°á»£c'));
check('C8: ngÃ y 1 ca â†’ chuá»—i rá»—ng (giao diá»‡n cÅ© giá»¯ nguyÃªn)',
  utils.shiftBreakdownHtml({ date: DAY, shiftMeta: META, sections: [{ groups: utils.shiftGroupRows([{ shiftIdx: 0, name: 'A', hc: 9, tc: 0 }]) }] }) === '');
check('C9: 2 ca HÃ’A hiá»‡u suáº¥t â†’ KHÃ”NG gáº¯n â˜… (trÃ¡nh káº¿t luáº­n sai)',
  (() => { const h = utils.shiftBreakdownHtml({ date: DAY, shiftMeta: META, perShiftQty: true, sections: [secCOf()] }); return h.includes('H.suáº¥t') && !h.includes('x2-shift-best'); })());

// â•â•â• D. THáºº XÆ¯á»žNG 2 (Chá»n Nan ThÃ´) â€” RENDER THáº¬T â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const x2 = await import('../js/xuong2.js');
state.hrPositions.push({ id: 'pcn', name: 'Chá»n Nan ThÃ´', department: 'XÆ°á»Ÿng 2' });
const asgCN = (id, shiftIdx, employeeId, start, end) =>
  ({ id, date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'pcn', shiftIdx, employeeId, start, end });
state.hrAssignments = [asgCN('s1', 0, 'eA', '07:00', '19:00'), asgCN('s2', 1, 'eB', '19:00', '01:00')];
state.x2ChonNanRates = { '2026-10': 500 };
state.xuong2ChonNanThoRecords = [{
  id: 'cn1', date: DAY, quantity: 1000, cls: 'A', sizeKey: '1250Ã—18Ã—7', dims: [1250, 18, 7],
  external: false, materialType: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿', unitVol: 0.000157,
  createdAt: '2026-10-05T02:00:00.000Z'
}];
x2.renderX2ChonNanTable();
const cnHtml = els.get('x2-cn-day-cards').innerHTML;
check('D1: tháº» ngÃ y Chá»n Nan cÃ³ khá»‘i THEO CA', cnHtml.includes('class="x2-shift-rows"'));
check('D2: Ä‘Ãºng 2 dÃ²ng ca + tÃªn 2 ca',
  (cnHtml.match(/class="x2-shift-row"/g) || []).length === 2 && cnHtml.includes('Ca ngÃ y') && cnHtml.includes('Ca Ä‘Ãªm'));
check('D3: NGÆ¯á»œI má»—i ca Ä‘Ãºng (A = ca ngÃ y Â· B = ca Ä‘Ãªm)',
  cnHtml.includes('Nguyá»…n VÄƒn A') && cnHtml.includes('Tráº§n Thá»‹ B'));
check('D4: GIá»œ tá»«ng ca = sá»‘ tháº­t (ca ngÃ y 12h âˆ’ 1h30 nghá»‰ = 10h30 HC Â· ca Ä‘Ãªm 19:00â€“01:00 láº¹m 30\' nghá»‰ giá»¯a ca = 5h30 HC)',
  cnHtml.includes('10,5h HC') && cnHtml.includes('5,5h HC'));
check('D5: sáº£n lÆ°á»£ng Æ¯á»šC TÃNH + ghi chÃº chÆ°a so Ä‘Æ°á»£c ca nÃ o tá»‘t hÆ¡n',
  (cnHtml.match(/SL ~/g) || []).length === 2 && cnHtml.includes('chÆ°a so Ä‘Æ°á»£c ca nÃ o lÃ m tá»‘t hÆ¡n'));
state.hrAssignments = [asgCN('s1', 0, 'eA', '07:00', '19:00')];
x2.renderX2ChonNanTable();
check('D6: ngÃ y chá»‰ 1 ca â†’ KHÃ”NG hiá»‡n khá»‘i theo ca (giao diá»‡n cÅ©)',
  !els.get('x2-cn-day-cards').innerHTML.includes('x2-shift-rows'));
state.hrAssignments = [];
x2.renderX2ChonNanTable();
check('D7: xÃ³a háº¿t bá»‘ trÃ­ â†’ khÃ´ng hiá»‡n khá»‘i (KHÃ”NG bá»‹a sá»‘)',
  !els.get('x2-cn-day-cards').innerHTML.includes('x2-shift-rows'));

// â•â•â• E. THáºº Há»– TRá»¢ â€” KHá»I CA KHÃ”NG CÃ“ CÃ”NG SUáº¤T/HIá»†U SUáº¤T â•â•â•â•â•â•â•â•â•â•â•â•â•â•
state.hrPositions.push({ id: 'pht', name: 'Há»— trá»£/ CÃ´ng Ä‘oáº¡n láº»', department: 'XÆ°á»Ÿng 2' });
const asgHT = (id, shiftIdx, employeeId, start, end) =>
  ({ id, date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'pht', shiftIdx, employeeId, start, end });
state.hrAssignments = [asgHT('h1', 0, 'eA', '07:00', '19:00'), asgHT('h2', 1, 'eB', '19:00', '01:00')];
state.xuong2HoTroRecords = [{
  id: 'ht1', date: DAY, workName: 'Dá»n xÆ°á»Ÿng', asgIds: ['h1', 'h2'], worker: '', workTime: '',
  createdAt: '2026-10-05T02:00:00.000Z'
}];
x2.renderXuong2HoTroTable();
const htHtml = els.get('x2-ht-day-cards').innerHTML;
check('E1: tháº» Há»— Trá»£ cÃ³ khá»‘i theo ca', htHtml.includes('class="x2-shift-rows"'));
check('E2: KHÃ”NG cÃ³ C.suáº¥t/H.suáº¥t (cÃ´ng viá»‡c phÃ¡t sinh)', !htHtml.includes('C.suáº¥t') && !htHtml.includes('H.suáº¥t'));
check('E3: KHÃ”NG hiá»‡n sáº£n lÆ°á»£ng Æ°á»›c tÃ­nh (khÃ´ng cÃ³ sáº£n lÆ°á»£ng)',
  !htHtml.includes('SL ~') && htHtml.includes('Nguyá»…n VÄƒn A') && htHtml.includes('Tráº§n Thá»‹ B'));

// â•â•â• F. XÆ¯á»žNG 1 (Cáº¯t á»ng) â€” GIá»œ THEO Bá»˜ PHáº¬N "XÆ°á»Ÿng 1" â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
state.hrPositions.push({ id: 'px1co', name: 'Cáº¯t á»ng', department: 'XÆ°á»Ÿng 1' });
state.hrAssignments = [
  { id: 'xa', date: DAY, department: 'XÆ°á»Ÿng 1', positionId: 'px1co', shiftIdx: 0, employeeId: 'eC', start: '07:00', end: '19:00' },
  { id: 'xb', date: DAY, department: 'XÆ°á»Ÿng 1', positionId: 'px1co', shiftIdx: 1, employeeId: 'eD', start: '19:00', end: '01:00' }
];
state.materialRecords = [{ id: 'x1m1', location: 'xuong-1', type: 'Váº§u cÃ¢y tÆ°Æ¡i', weight: 1000, date: DAY, supplier: 'NhÃ  Táº¿' }];
state.xuong1CatOngRecords = [{
  id: 'x1co1', materialId: 'x1m1', date: DAY, klDat: 600, klLoai: 100, klMat: 50, klNgon: 50,
  createdAt: '2026-10-05T02:00:00.000Z'
}];
state.x1Rates = { catOng: { '2026-10': 500 } };
x2.renderX1CatOngCard();
const x1Html = els.get('x1-cat-ong-day-cards').innerHTML;
check('F1: tháº» ngÃ y XÆ°á»Ÿng 1 cÃ³ khá»‘i theo ca', x1Html.includes('class="x2-shift-rows"'));
check('F2: ngÆ°á»i + giá» tá»«ng ca theo bá»™ pháº­n XÆ°á»Ÿng 1 (10h30 Â· 5h30 HC)',
  x1Html.includes('LÃª VÄƒn C') && x1Html.includes('Pháº¡m Thá»‹ D') && x1Html.includes('10,5h HC') && x1Html.includes('5,5h HC'));

// â•â•â• G. Ã‰P VÃN (tháº» trong tab CÃ´ng Äoáº¡n SX) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const press = await import('../js/press.js');
state.hrPositions.push({ id: 'pep', name: 'Ã‰p vÃ¡n', department: 'XÆ°á»Ÿng 2' });
state.hrAssignments = [
  { id: 'p1', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'pep', shiftIdx: 0, employeeId: 'eC', start: '07:00', end: '19:00' },
  { id: 'p2', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'pep', shiftIdx: 1, employeeId: 'eD', start: '19:00', end: '01:00' }
];
state.pressRecords = [{
  id: 'pr1', date: DAY, year: '2026', productName: 'VÃ¡n 1200x382x12', finishedQty: 40,
  sticks: [], vanTho: [{ vtDim: '1200x600x9', vtQty: 2 }]
}];
state.pressNotes = [];
state.pressYearFilter = 'all';
state.pressWeekFilter = 'all';
state.x2EpVanRates = { '2026-10': 1 };
press.renderX2EpVanDayCards();
const pvHtml = els.get('x2-epv-day-cards').innerHTML;
check('G1: tháº» ngÃ y Ã‰p VÃ¡n cÃ³ khá»‘i theo ca (mÂ³/h)', pvHtml.includes('class="x2-shift-rows"') && pvHtml.includes('Ã‰p vÃ¡n'));
check('G2: ngÆ°á»i + giá» tá»«ng ca cá»§a Ã‰p VÃ¡n',
  pvHtml.includes('10,5h HC') && pvHtml.includes('5,5h HC') && pvHtml.includes('LÃª VÄƒn C') && pvHtml.includes('Pháº¡m Thá»‹ D'));

// â•â•â• H. QC â€” KIá»‚M SAU Sáº¢N XUáº¤T â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const qcf = await import('../js/qc-final.js');
state.hrPositions.push({ id: 'pqc', name: 'QC Kiá»ƒm vÃ¡n+thanh', department: 'QC' });
state.hrAssignments = [
  { id: 'qa', date: DAY, department: 'QC', positionId: 'pqc', shiftIdx: 0, employeeId: 'eC', start: '07:00', end: '19:00' },
  { id: 'qb', date: DAY, department: 'QC', positionId: 'pqc', shiftIdx: 1, employeeId: 'eD', start: '19:00', end: '01:00' }
];
state.qcFinalRecords = [{
  id: 'qcf1', date: DAY, workshop: 'x2', kind: 'van', inputQty: 100, qtyOk: 90, qtyExcept: 5,
  qtyReject: 5, productName: 'VÃ¡n 1200x382x12'
}];
state.qcFinalRates = { '2026-10': { van: 20, thanh: 100 } };
qcf.renderQcFinalTable();
const qcfHtml = els.get('qcf-day-cards').innerHTML;
check('H1: tháº» ngÃ y QC cÃ³ khá»‘i theo ca', qcfHtml.includes('class="x2-shift-rows"'));
check('H2: ngÆ°á»i + giá» tá»«ng ca cá»§a QC (10h30 Â· 5h30 HC)',
  qcfHtml.includes('10,5h HC') && qcfHtml.includes('5,5h HC') && qcfHtml.includes('LÃª VÄƒn C'));

// â•â•â• I. Cáº¤U TRÃšC (styles / sw / js) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
const uSrc = fs.readFileSync('js/utils.js', 'utf8');
const x2Src = fs.readFileSync('js/xuong2.js', 'utf8');
const pSrc = fs.readFileSync('js/press.js', 'utf8');
const qSrc = fs.readFileSync('js/qc-final.js', 'utf8');
check('I1: styles.css cÃ³ khá»‘i .x2-shift-rows / -chip / -note / -best',
  cssSrc.includes('.x2-shift-rows {') && cssSrc.includes('.x2-shift-chip {') &&
  cssSrc.includes('.x2-shift-note {') && cssSrc.includes('.x2-shift-best {'));
check('I2: utils.js export 4 helper tÃ¡ch ca',
  ['shiftGroupRows', 'shiftFmtNum', 'shiftSectionRows', 'shiftBreakdownHtml'].every(n => uSrc.includes(`  ${n},`)));
check('I3: 4 tháº» ngÃ y 1 cÃ´ng Ä‘oáº¡n + 3 tháº» ÄÃƒ TÃCH CA (Bá»• á»ng/BÃ o ThÃ´/Chá»n Nan) + 3 tháº» 2 cÃ´ng Ä‘oáº¡n + XÆ°á»Ÿng 1',
  (x2Src.match(/\$\{x2ShiftBlockOf\(/g) || []).length === 4 &&
  (x2Src.match(/shiftIdx == null \? x2ShiftBlockOf\(/g) || []).length === 3 &&
  (x2Src.match(/\$\{x2ShiftBlockMulti\(/g) || []).length === 3 &&
  x2Src.includes('cfg.shiftMatchPos ? shiftGroupsForX1(') &&
  (x2Src.match(/shiftMatchPos/g) || []).length >= 5);
check('I4: press.js + qc-final.js dÃ¹ng CHUNG helper (khÃ´ng copy HTML/CSS)',
  pSrc.includes('shiftBreakdownHtml') && pSrc.includes('epVanShiftGroups') &&
  qSrc.includes('shiftBreakdownHtml') && qSrc.includes('qcShiftGroups'));
check('I5: sw.js Ä‘Ã£ tÄƒng cache (v486) Ä‘á»ƒ PWA khÃ´ng dÃ¹ng báº£n cÅ©', swSrc.includes('nha-may-ngoc-son-v486'));

// â•â•â• J. GIAI ÄOáº N 2 â€” NHáº¬P Sáº¢N LÆ¯á»¢NG RIÃŠNG THEO CA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// (Bá»• á»ng Â· Cháº¡y MÃ¡y BÃ o ThÃ´ Â· Chá»n Nan ThÃ´ Â· Than HÃ³a + Sáº¥y)

// â”€â”€ J1. CHá»ŒN NAN NGOÃ€I CÃ”NG ÄOáº N + Ã” CA â†’ giá»/ngÆ°á»i chá»‰ cá»§a ca Ä‘Ã³ â”€â”€â”€â”€â”€â”€â”€â”€
state.hrPositions.push({ id: 'pcn2', name: 'Chá»n Nan ThÃ´', department: 'XÆ°á»Ÿng 2' });
state.hrPositions.push({ id: 'pth', name: 'Than hÃ³a', department: 'XÆ°á»Ÿng 2' });
state.hrAssignments = [
  { id: 'c1', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'pcn2', shiftIdx: 0, employeeId: 'eA', start: '07:00', end: '19:00' },
  { id: 'c2', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'pcn2', shiftIdx: 1, employeeId: 'eB', start: '19:00', end: '01:00' }
];
state.xuong2ChonNanThoRecords = [];
state.x2ChonNanEditId = null;
document.getElementById('x2-cn-baotho').value = '__new__';   // ThÃªm loáº¡i má»›i (nan mua ngoÃ i â€” khÃ´ng cáº§n chuá»—i)
document.getElementById('x2-cn-ncc').value = 'NCC NgoÃ i';
document.getElementById('x2-cn-dai').value = '900';
document.getElementById('x2-cn-rong').value = '70';
document.getElementById('x2-cn-day').value = '10';
document.getElementById('x2-cn-qty-A').value = '500';
document.getElementById('x2-cn-date').value = DAY;
x2.syncX2ShiftField('x2-cn-shift', 'XÆ°á»Ÿng 2', DAY, null);   // náº¡p options trÆ°á»›c khi chá»n
document.getElementById('x2-cn-shift').value = '1';          // CA ÄÃŠM
x2.handleXuong2ChonNanSubmit({ preventDefault(){} });
const cnShiftRec = (state.xuong2ChonNanThoRecords || []).find(r => r.date === DAY && r.shiftIdx === 1);
check('J1: lÆ°u lÆ°á»£t Chá»n Nan cÃ³ ghi CA â†’ báº£n ghi lÆ°u shiftIdx = 1', !!cnShiftRec && cnShiftRec.shiftIdx === 1);
check('J2: SNAPSHOT giá» cá»§a lÆ°á»£t = CHá»ˆ ca Ä‘Ãªm (5h30 HC Â· 0h TC, khÃ´ng cá»™ng ca ngÃ y)',
  cnShiftRec && Math.abs(Number(cnShiftRec.workHoursHC) - 5.5) < 1e-9 && Math.abs(Number(cnShiftRec.workHoursTC)) < 1e-9);
check('J3: SNAPSHOT ngÆ°á»i cá»§a lÆ°á»£t = CHá»ˆ ngÆ°á»i ca Ä‘Ãªm', cnShiftRec && cnShiftRec.worker === 'Tráº§n Thá»‹ B');

// â”€â”€ J4. THáºº NGÃ€Y TÃCH THEO (NGÃ€Y, CA) + CHIP SO SÃNH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.x2ChonNanRates = { '2026-10': 500 };
state.xuong2ChonNanThoRecords = [
  { id: 'cn-s0', date: DAY, quantity: 2000, cls: 'A', sizeKey: '1250Ã—18Ã—7', dims: [1250, 18, 7], external: false, materialType: 'Luá»“ng cÃ¢y', supplier: 'NhÃ  Táº¿', shiftIdx: 0, unitVol: 0.000157, createdAt: '2026-10-05T02:00:00.000Z' },
  { id: 'cn-s1', date: DAY, quantity: 900, cls: 'A', sizeKey: '1250Ã—18Ã—7', dims: [1250, 18, 7], external: false, materialType: 'Luá»“ng cÃ¢y', supplier: 'NhÃ  Táº¿', shiftIdx: 1, unitVol: 0.000157, createdAt: '2026-10-05T03:00:00.000Z' },
  { id: 'cn-s2', date: DAY, quantity: 400, cls: 'B', sizeKey: '1250Ã—24Ã—8', dims: [1250, 24, 8], external: false, materialType: 'Luá»“ng cÃ¢y', supplier: 'NhÃ  Táº¿', unitVol: 0.00024, createdAt: '2026-10-05T04:00:00.000Z' }
];
x2.renderX2ChonNanTable();
const cnCards = els.get('x2-cn-day-cards').innerHTML;
check('J4: tháº» ngÃ y Chá»n Nan tÃ¡ch 2 ca cÃ¹ng ngÃ y (2 tháº», cÃ³ chip ca)',
  (cnCards.match(/data-shift="0"/g) || []).length === 1 && (cnCards.match(/data-shift="1"/g) || []).length === 1 &&
  cnCards.includes('Ca ngÃ y') && cnCards.includes('Ca Ä‘Ãªm'));
check('J5: tháº» Cáº¢ NGÃ€Y / CHÆ¯A RÃ• CA riÃªng cho lÆ°á»£t khÃ´ng ghi ca',
  cnCards.includes('Cáº£ ngÃ y / chÆ°a rÃµ ca') && (cnCards.match(/data-shift=""/g) || []).length === 1);
check('J6: cÃ´ng suáº¥t 2 ca KHÃC NHAU theo Sá» THáº¬T (ca ngÃ y 2.000Ã·10h30=190 Â· ca Ä‘Ãªm 900Ã·5h30=164 thanh/h)',
  (cnCards.match(/190 thanh\/h/g) || []).length >= 1 && (cnCards.match(/164 thanh\/h/g) || []).length >= 1);
// â•â•â• K. Cáº¤U TRÃšC â•â•â•
check('J7: cÃ³ chip SO SÃNH hiá»‡u suáº¥t vá»›i ca kia (â–²/â–¼)',
  cnCards.includes('x2-shift-cmp') && (cnCards.includes('â–²') || cnCards.includes('â–¼')));
check('J8: tháº» "chÆ°a rÃµ ca" váº«n giá»¯ khá»‘i Æ¯á»šC TÃNH Giai Ä‘oáº¡n 1 + ghi chÃº trung thá»±c',
  cnCards.includes('chÆ°a so Ä‘Æ°á»£c ca nÃ o lÃ m tá»‘t hÆ¡n'));

// â”€â”€ J9. LIÃŠN Káº¾T CHá»ŒN NAN â†’ BÃ€O THÃ” Lá»ŒC THEO CA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const btFake = { id: 'bt-x', date: DAY, shiftIdx: 0, daiText: '1250', rongText: '18', dayText: '7', dais: [1250], rongs: [18], thicks: [7] };
state.xuong2ChonNanThoRecords = [
  { id: 'k0', baothoId: 'bt-x', date: DAY, quantity: 100, cls: 'A', sizeKey: '1250Ã—18Ã—7', dims: [1250, 18, 7], external: false, shiftIdx: 0, unitVol: 0.000157, volume: 0.0157 },
  { id: 'k1', baothoId: 'bt-x', date: DAY, quantity: 250, cls: 'A', sizeKey: '1250Ã—18Ã—7', dims: [1250, 18, 7], external: false, shiftIdx: 1, unitVol: 0.000157, volume: 0.0393 },
  { id: 'k2', baothoId: 'bt-x', date: DAY, quantity: 50, cls: 'A', sizeKey: '1250Ã—18Ã—7', dims: [1250, 18, 7], external: false, unitVol: 0.000157, volume: 0.0079 }
];
const qShift0 = x2.baoThoQtyOf(btFake);
check('J9: BÃ o ThÃ´ ca 1 â†’ chá»‰ cá»™ng 100 thanh cá»§a lÆ°á»£t CÃ™NG ca (khÃ´ng cá»™ng 250 cá»§a ca kia, 50 chÆ°a rÃµ ca)',
  qShift0.qty === 100 && qShift0.otherQty === 300);
const qNoShift = x2.baoThoQtyOf({ id: 'bt-x', date: DAY, shiftIdx: null, dais: [1250], rongs: [18], thicks: [7] });
check('J10: BÃ o ThÃ´ KHÃ”NG ghi ca â†’ chá»‰ cá»™ng 50 thanh khÃ´ng ghi ca + cáº£nh bÃ¡o 350 thanh á»Ÿ ca khÃ¡c',
  qNoShift.qty === 50 && qNoShift.otherQty === 350);

// â”€â”€ J11. THAN HÃ“A: CA Cá»¦A LÃ” (sayShift) + DÃ’NG PHá»¤ "THEO CA" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('J11: sayShiftMapOf giá»¯ ca cÃ´ng Ä‘oáº¡n kia + ghi Ä‘Ã¨ Ä‘Ãºng cÃ´ng Ä‘oáº¡n Ä‘ang lÆ°u',
  JSON.stringify(x2.sayShiftMapOf({ say1: 1 }, 'say2', 0)) === JSON.stringify({ say1: 1, say2: 0 }) &&
  x2.sayShiftMapOf(null, 'say1', 1).say1 === 1);
state.batches = [
  { id: 'B1', code: 'L1', stage: 'say1', date: DAY, length: 1250, width: 18, thickness: 7, quantity: 1000, volume: 0.157, useFor: 'VÃ¡n', location: 'LS1', sayCharges: { say1: 111 }, sayShift: { say1: 0 }, createdAt: '2026-10-05T02:00:00.000Z' },
  { id: 'B2', code: 'L2', stage: 'say1', date: DAY, length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.0785, useFor: 'VÃ¡n', location: 'LS1', sayCharges: { say1: 222 }, sayShift: { say1: 1 }, createdAt: '2026-10-05T03:00:00.000Z' }
];
state.hrAssignments = [
  { id: 't1', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'pth', shiftIdx: 0, employeeId: 'eC', start: '07:00', end: '19:00' },
  { id: 't2', date: DAY, department: 'XÆ°á»Ÿng 2', positionId: 'pth', shiftIdx: 1, employeeId: 'eD', start: '19:00', end: '01:00' }
];
state.x2SayRates = { s1: {}, s2: {} };
state.x2SayTimes = {};
state.x2SayIncidents = {};
const sayRows = x2.sayChargeRows();
const sayDay = sayRows.find(r => r.date === DAY);
check('J12: má»—i Láº¦N than hÃ³a mang CA cá»§a lÃ´ (ca 1 vÃ  ca 2 khÃ¡c nhau)',
  !!sayDay && sayDay.charges.length === 2 &&
  sayDay.charges.some(c => c.shiftIdx === 0) && sayDay.charges.some(c => c.shiftIdx === 1));
x2.renderX2SayStats();
const sayHtml = els.get('x2-say-day-rows').innerHTML;
check('J13: báº£ng thá»‘ng kÃª Than HÃ³a cÃ³ DÃ’NG PHá»¤ theo ca (mÂ³ + giá» tháº­t + cÃ´ng suáº¥t/hiá»‡u suáº¥t cá»§a ca)',
  sayHtml.includes('x2-say-shift-row') && (sayHtml.match(/data-shift-idx="0"/g) || []).length >= 1 &&
  (sayHtml.match(/data-shift-idx="1"/g) || []).length >= 1);
check('J14: mÂ³ tÃ¡ch Ä‘Ãºng theo ca (ca 1 = 0,157 mÂ³ Â· ca 2 = 0,0785 mÂ³ â€” Sá» THáº¬T cá»§a lÃ´)',
  sayHtml.includes('0,157') && sayHtml.includes('0,0785'));
check('J15: dÃ²ng ca ghi ngÆ°á»i cá»§a Ä‘Ãºng ca Ä‘Ã³ (ca 1 = LÃª VÄƒn C Â· ca 2 = Pháº¡m Thá»‹ D)',
  sayHtml.includes('LÃª VÄƒn C') && sayHtml.includes('Pháº¡m Thá»‹ D'));
check('J16: Ã´ nháº­p "Sá»‘ láº§n TH" cá»§a NHÃ“M váº«n chá»‰ 1 Ã´/ngÃ y (khÃ´ng nhÃ¢n Ä‘Ã´i theo ca)',
  (sayHtml.match(/data-say-times="2026-10-05"/g) || []).length === 1);

// â”€â”€ J17. Cáº¤U TRÃšC GIAI ÄOáº N 2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idxSrc = fs.readFileSync('index.html', 'utf8');
const bmSrc = fs.readFileSync('js/batch-modals.js', 'utf8');
check('J17: index.html cÃ³ 3 Ã´ Ca (Bá»• á»ng Â· BÃ o ThÃ´ Â· Chá»n Nan) + Ã´ Ca cá»§a ThÃªm LÃ´ Sáº¥y Má»›i',
  idxSrc.includes('id="x2-bo-ong-shift"') && idxSrc.includes('id="x2-bao-tho-shift"') &&
  idxSrc.includes('id="x2-cn-shift"') && idxSrc.includes('id="al-shift"'));
check('J18: batch-modals ghi CA (sayShift) á»Ÿ Cáº¢ 5 nhÃ¡nh lÆ°u lÃ´ (4 gÃ¡n khi táº¡o + 3 gÃ¡n táº¡i chá»—)',
  (bmSrc.match(/sayShift: sayShiftMapOf\(/g) || []).length === 4 &&
  (bmSrc.match(/sayShift = sayShiftMapOf\(/g) || []).length === 3);
check('J19: CSS cÃ³ chip ca / chip so sÃ¡nh / cáº£nh bÃ¡o lá»‡ch ca / dÃ²ng ca Than HÃ³a',
  cssSrc.includes('.x2-day-shift-chip') && cssSrc.includes('.x2-shift-cmp') &&
  cssSrc.includes('.x2-shift-cross') && cssSrc.includes('.x2-say-shift-row'));

// â”€â”€ J20. KHÃ”NG CHIA HIá»†U SUáº¤T THEO Sáº¤Y 1 / Sáº¤Y 2 â€” Gá»˜P TRONG CA (18/10/2026) â”€â”€
// ThÃªm 1 lÃ´ vÃ o Sáº¥y 2 CÃ™NG NGÃ€Y, CÃ™NG CA 1 â†’ ca 1 pháº£i gá»™p cáº£ 2 cÃ´ng Ä‘oáº¡n sáº¥y.
state.batches.push({
  id: 'B3', code: 'L3', stage: 'say2', date: '2026-10-04',
  length: 1250, width: 18, thickness: 9, quantity: 400, volume: 0.05,
  useFor: 'VÃ¡n', location: 'LS1',
  stageHistory: [{ stage: 'say2', date: DAY }],
  sayCharges: { say2: 333 }, sayShift: { say2: 0 }, createdAt: '2026-10-05T04:00:00.000Z'
});
const sayDay2 = x2.sayChargeRows().find(r => r.date === DAY);
const perf2 = x2.sayShiftPerfOf(sayDay2);
check('J20: hiá»‡u suáº¥t gá»™p TRONG CA â€” ca 1 gá»“m Cáº¢ Sáº¥y 1 vÃ  Sáº¥y 2 (1 láº§n má»—i cÃ´ng Ä‘oáº¡n)',
  perf2.length === 2 && perf2[0].stageTurns.say1 === 1 && perf2[0].stageTurns.say2 === 1);
check('J21: giá» cáº§n cá»§a ca = Î£ phÃºt cá»§a Cáº¢ 2 cÃ´ng Ä‘oáº¡n (ca 1: 105\' + 50\' = 2,583h)',
  Math.abs(perf2[0].need - (155 / 60)) < 1e-6);
x2.renderX2SayStats();
const sayHtml2 = els.get('x2-say-day-rows').innerHTML;
check('J22: báº£ng chá»‰ cÃ³ 1 dÃ²ng/ca (KHÃ”NG láº·p theo Sáº¥y 1 / Sáº¥y 2) + ghi rÃµ thÃ nh pháº§n ca',
  (sayHtml2.match(/<tr class="x2-say-shift-row"/g) || []).length === 2 &&
  sayHtml2.includes('Sáº¥y 1: 1') && sayHtml2.includes('Sáº¥y 2: 1'));
check('J23: dÃ²ng ca cÃ³ NHÃƒN "So ca kia" (â–²/â–¼) giá»‘ng tháº» Chá»n Nan ThÃ´',
  sayHtml2.includes('x2-shift-cmp') && sayHtml2.includes('So ca kia'));
const pct0 = (perf2[0].need / (perf2[0].hours - perf2[0].incH)) * 100;
const pct1 = (perf2[1].need / (perf2[1].hours - perf2[1].incH)) * 100;
const deltaTxt = Math.abs(pct0 - pct1).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
check(`J24: con sá»‘ so sÃ¡nh Ä‘Ãºng ÄIá»‚M % (${pct0.toFixed(1)}% â†” ${pct1.toFixed(1)}% â†’ â–²/â–¼ ${deltaTxt}%)`,
  sayHtml2.includes(`â–² ${deltaTxt}%`) && sayHtml2.includes(`â–¼ ${deltaTxt}%`));

console.log(`\n=== TÃCH Dá»® LIá»†U THEO CA: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);

