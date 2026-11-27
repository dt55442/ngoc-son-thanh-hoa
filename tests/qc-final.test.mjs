// tests/qc-final.test.mjs â€” THáºº "KIá»‚M SAU Sáº¢N XUáº¤T" (tab QC â€” js/qc-final.js).
// Bao phá»§: cáº·p 2 tuáº§n xuáº¥t hÃ ng (tuáº§n láº» + tuáº§n káº¿ â€” kiá»ƒm tuáº§n 39 hay 40 Ä‘á»u
// láº¥y cáº·p 39â€“40) Â· danh sÃ¡ch nguá»“n Kiá»ƒm VÃ¡n = 2 nhÃ³m (VÃN THÃ” BTP cá»§a lÆ°á»£t Ã©p
// chÆ°a Ä‘iá»n thÃ nh pháº©m + ThÃ nh pháº©m Ã‰p VÃ¡n â€” LOáº I má»¥c ÄVT = Thanh theo Ä‘á»‹nh má»©c)
// Â· lÆ°u/cháº·n validate Â·
// cÃ´ng thá»©c Tá»•ng kiá»ƒm = Äáº¡t+Ngoáº¡i lá»‡+Loáº¡i Â· Tá»•ng Ä‘áº¡t = Äáº¡t+Ngoáº¡i lá»‡ Â· Tá»‰ lá»‡ lá»—i
// Â· ngÆ°á»i kiá»ƒm + giá» HC/TC tá»± Ä‘á»™ng tá»« vá»‹ trÃ­ bá»™ pháº­n QC tÃªn chá»©a "kiá»ƒm" Â· Ä‘á»‹nh
// má»©c theo thÃ¡ng + Hiá»‡u suáº¥t Â· sá»­a/xÃ³a + tombstone Â· render tháº» ngÃ y + mini
// card Â· cáº¥u trÃºc (index.html Â· qc.js Â· events.js Â· state/storage/cloud/history/
// main Â· sw.js v190 Â· styles.css).
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng qc.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    parentElement: null,
    appendChild(c) { if (c && typeof c === 'object') { c.parentElement = el; (el._children || (el._children = [])).push(c); } return c; },
    removeChild(c) { if (c && typeof c === 'object') c.parentElement = null; return c; },
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}
const approx = (a, b) => Math.abs(a - b) < 1e-6;
// â•â•â• PHáº¦N 2 â•â•â•

// â”€â”€â”€ IMPORT MODULES (sau khi stub xong) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { state, STORAGE_KEY_DELETED_IDS, STORAGE_KEY_QC_FINAL, STORAGE_KEY_QC_FINAL_RATE } = await import('../js/state.js');
const qcf = await import('../js/qc-final.js');
const qc = await import('../js/qc.js');
const fsMod = await import('node:fs');

function setVal(id, v) { const el = document.getElementById(id); el.value = v; return el; }

// â”€â”€â”€ Dá»® LIá»†U GIáº¢ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NÄƒm 2026: tuáº§n 39 = 21/09â€“27/09 Â· tuáº§n 40 = 28/09â€“04/10 Â· tuáº§n 41 = 05/10â€“11/10
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.pressRecords = [
  { id: 'p1', date: '2026-09-22', week: '2026-W39', year: 2026, productId: 'sp1', productName: 'VÃ¡n 1220Ã—2440Ã—9',  finishedQty: 300, vanTho: [], sticks: [] },
  { id: 'p2', date: '2026-09-24', week: '2026-W39', year: 2026, productId: 'sp1', productName: 'VÃ¡n 1220Ã—2440Ã—9',  finishedQty: 200, vanTho: [], sticks: [] },
  { id: 'p3', date: '2026-09-30', week: '2026-W40', year: 2026, productId: 'sp2', productName: 'Bullig 1200Ã—300Ã—50', finishedQty: 120, vanTho: [], sticks: [] },
  { id: 'p4', date: '2026-09-23', week: '2026-W39', year: 2026, productId: 'sp2', productName: 'Bullig 1200Ã—300Ã—50', finishedQty: 80,  vanTho: [], sticks: [] },
  { id: 'p5', date: '2026-09-15', week: '2026-W38', year: 2026, productId: 'sp1', productName: 'VÃ¡n 1220Ã—2440Ã—9',  finishedQty: 999, vanTho: [], sticks: [] } // NGOÃ€I cáº·p
];
state.hrPositions = [
  { id: 'pqcf', name: 'QC Kiá»ƒm vÃ¡n+thanh', department: 'QC', note: '' },
  { id: 'pqcoth', name: 'Kiá»ƒm cháº¥t',        department: 'QC', note: '' }, // vá»‹ trÃ­ QC KHÃC â€” KHÃ”NG Ä‘Æ°á»£c tÃ­nh giá»
  { id: 'pep',  name: 'Ã‰p vÃ¡n',            department: 'XÆ°á»Ÿng 2', note: '' }
];
state.hrEmployees = [
  { id: 'e1', code: 'NV01', name: 'Nguyá»…n VÄƒn A', department: 'QC', status: 'active', skills: [] },
  { id: 'e2', code: 'NV02', name: 'Tráº§n Thá»‹ B',   department: 'QC', status: 'active', skills: [] },
  { id: 'e3', code: 'NV03', name: 'LÃª VÄƒn C',     department: 'QC', status: 'active', skills: [] }
];
state.hrAssignments = [
  { id: 'asg1', date: '2026-09-23', department: 'QC', positionId: 'pqcf', employeeId: 'e1', start: '07:00', end: '11:30', shiftIdx: 0 },
  { id: 'asg2', date: '2026-09-23', department: 'QC', positionId: 'pqcf', employeeId: 'e2', start: '13:00', end: '',      shiftIdx: 0 },
  { id: 'asg3', date: '2026-09-23', department: 'QC', positionId: 'pqcoth', employeeId: 'e3', start: '07:00', end: '16:00', shiftIdx: 0 }
];
// â•â•â• PHáº¦N 3 â•â•â•

// â”€â”€â”€ A. Cáº¶P 2 TUáº¦N XUáº¤T HÃ€NG + DANH SÃCH THÃ€NH PHáº¨M â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('Cáº¶P TUáº¦N: ngÃ y á»Ÿ tuáº§n 39 (23/09) â†’ cáº·p 39â€“40', (() => {
  const p = qcf.qcFinalPairWeeks('2026-09-23'); return p.start === 39 && p.end === 40;
})());
check('Cáº¶P TUáº¦N: ngÃ y á»Ÿ tuáº§n 40 (29/09) â†’ VáºªN cáº·p 39â€“40 (khÃ´ng chá»“ng láº¥n)',
  (() => { const p = qcf.qcFinalPairWeeks('2026-09-29'); return p.start === 39 && p.end === 40; })());
check('Cáº¶P TUáº¦N: tuáº§n 41 (07/10) â†’ cáº·p 41â€“42 Â· nhÃ£n "Tuáº§n 41â€“42"',
  (() => { const p = qcf.qcFinalPairWeeks('2026-10-07'); return p.start === 41 && p.end === 42 && qcf.qcFinalPairLabel('2026-10-07') === 'Tuáº§n 41â€“42'; })());
check('Cáº¶P TUáº¦N: tuáº§n 53 tÃ­nh riÃªng (khÃ´ng cÃ³ tuáº§n 54)',
  (() => { const p = qcf.qcFinalPairWeeks('2027-01-01'); return p.end === null; })());
check('THÃ€NH PHáº¨M 2 TUáº¦N: ngÃ y 23/09 â†’ gá»™p Ã‰p VÃ¡n cáº·p 39â€“40 (sp1 = 500 Â· sp2 = 200 Â· loáº¡i lÆ°á»£t tuáº§n 38)',
  (() => {
    const rows = qcf.qcFinalProducts2Weeks('2026-09-23');
    const s1 = rows.find(r => r.productId === 'sp1'), s2 = rows.find(r => r.productId === 'sp2');
    return rows.length === 2 && s1 && s1.qty === 500 && s2 && s2.qty === 200 && rows[0].qty >= rows[1].qty;
  })());
check('THÃ€NH PHáº¨M 2 TUáº¦N: ngÃ y 07/10 (cáº·p 41â€“42) â†’ danh sÃ¡ch rá»—ng (chÆ°a cÃ³ lÆ°á»£t Ã©p)',
  qcf.qcFinalProducts2Weeks('2026-10-07').length === 0);

// â”€â”€â”€ B. NGÆ¯á»œI KIá»‚M + GIá»œ Tá»° Äá»˜NG Tá»ª NHÃ‚N Sá»° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('Vá»Š TRÃ KIá»‚M: CHá»ˆ khá»›p tÃªn chá»©a "kiá»ƒm" + ("vÃ¡n"|"thanh") â€” loáº¡i "Kiá»ƒm cháº¥t"/"Ã‰p vÃ¡n"',
  qcf.isQcFinalPos('QC Kiá»ƒm vÃ¡n+thanh') === true && qcf.isQcFinalPos('Kiá»ƒm vÃ¡n') === true &&
  qcf.isQcFinalPos('Kiá»ƒm thanh') === true && qcf.isQcFinalPos('kiá»ƒm vÃ¡n+thanh') === true &&
  qcf.isQcFinalPos('Kiá»ƒm cháº¥t') === false && qcf.isQcFinalPos('Kiá»ƒm lÃ² sáº¥y') === false &&
  qcf.isQcFinalPos('Kiá»ƒm Ä‘áº§u vÃ o') === false && qcf.isQcFinalPos('Ã‰p vÃ¡n') === false &&
  qcf.isQcFinalPos('Cáº¯t chá»n') === false);
check('NGÆ¯á»œI KIá»‚M: 23/09 cÃ³ 2 ngÆ°á»i bá»™ pháº­n QC (ngÆ°á»i chÃ­nh + giá», giá» ra trá»‘ng = háº¿t ca)',
  (() => {
    const rows = qcf.hrQcFinalAssignmentsOf('2026-09-23');
    return rows.length === 2 && rows[0].name === 'Nguyá»…n VÄƒn A' && rows[0].time === '07:00â€“11:30' &&
           rows[1].name === 'Tráº§n Thá»‹ B' && rows[1].time === '13:00 â†’ háº¿t ca';
  })());
check('NGÆ¯á»œI KIá»‚M: Lá»ŒC Vá»Š TRÃ â€” bá»‘ trÃ­ "Kiá»ƒm cháº¥t" cÃ¹ng bá»™ pháº­n QC cÃ¹ng ngÃ y KHÃ”NG bá»‹ láº¥y',
  (() => {
    const rows = qcf.hrQcFinalAssignmentsOf('2026-09-23');
    return rows.length === 2 && rows.every(r => r.positionName === 'QC Kiá»ƒm vÃ¡n+thanh') &&
           !rows.some(r => r.name === 'LÃª VÄƒn C');
  })());
check('GIá»œ KIá»‚M HC/TC: 07:00â€“11:30 + 13:00â€“háº¿t ca = 9h HC Â· 0h TC (KHÃ”NG cá»™ng giá» vá»‹ trÃ­ QC khÃ¡c)',
  (() => {
    const sp = qcf.sumQcFinalHoursSplit(qcf.hrQcFinalAssignmentsOf('2026-09-23'), '2026-09-23');
    // Bá»‘ trÃ­ "Kiá»ƒm cháº¥t" 07:00â€“16:00 (9h) náº¿u bá»‹ lá»t vÃ o sáº½ lÃ m giá» â‰  9h
    return approx(sp.hc, 9) && approx(sp.tc, 0);
  })());
check('GIá»œ NGÃ€Y: qcFinalDayHoursOf chá»‰ Ä‘áº¿m vá»‹ trÃ­ Kiá»ƒm vÃ¡n+thanh (9h, khÃ´ng pháº£i 18h)',
  (() => {
    const h = qcf.qcFinalDayHoursOf('2026-09-23', []);
    return approx(h.hours, 9) && approx(h.hc, 9) && approx(h.tc, 0);
  })());
check('SNAPSHOT: hrQcFinalSnapshot lÆ°u tÃªn + giá» + HC/TC cÃ¹ng lÆ°á»£t (phÃ²ng khi bá»‘ trÃ­ bá»‹ xÃ³a)',
  (() => {
    const s = qcf.hrQcFinalSnapshot('2026-09-23');
    return s.workerNames === 'Nguyá»…n VÄƒn A, Tráº§n Thá»‹ B' && approx(s.workHours, 9) && approx(s.workHoursHC, 9);
  })());

// â”€â”€â”€ C. LOAD / LÆ¯U â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
qcf.loadQcFinal();
check('LOAD: chÆ°a cÃ³ dá»¯ liá»‡u â†’ máº£ng rá»—ng', Array.isArray(state.qcFinalRecords) && state.qcFinalRecords.length === 0);
qcf.loadQcFinalRates();
check('LOAD Äá»ŠNH Má»¨C: chÆ°a cÃ³ â†’ object rá»—ng', state.qcFinalRates && typeof state.qcFinalRates === 'object');
storeBacking.set(STORAGE_KEY_QC_FINAL, JSON.stringify([
  { id: 'qcf-old', date: '2026-09-20', workshop: 'x2', inputQty: 100, qtyOk: 90, qtyExcept: 5, qtyReject: 5, updatedAt: '2026-09-20T00:00:00Z' }
]));
qcf.loadQcFinal();
check('LOAD: náº¡p tá»« localStorage', state.qcFinalRecords.length === 1 && state.qcFinalRecords[0].id === 'qcf-old');
// â•â•â• PHáº¦N 4 â•â•â•

// â”€â”€â”€ D. LÆ¯U LÆ¯á»¢T KIá»‚M + CHáº¶N VALIDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.qcFinalRecords = [];
setVal('qcf-workshop', 'x2');
setVal('qcf-kind', 'van');
setVal('qcf-date', '2026-09-23');
qcf.syncQcFinalKindFields();
qcf.onQcFinalListClick({
  target: { closest: sel => sel === '[data-qcf-product]' ? { getAttribute: () => 'sp1' } : null }
});
setVal('qcf-input-qty', '500');
setVal('qcf-ok', '380');
setVal('qcf-except', '60');
setVal('qcf-reject', '40');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('LÆ¯U: 1 lÆ°á»£t kiá»ƒm má»›i (XÆ°á»Ÿng 2 Â· ngÃ y 23/09 Â· Ä‘áº§u vÃ o 500)', state.qcFinalRecords.length === 1 &&
  state.qcFinalRecords[0].workshop === 'x2' && state.qcFinalRecords[0].date === '2026-09-23' && state.qcFinalRecords[0].inputQty === 500);
check('LÆ¯U: SNAPSHOT ngÆ°á»i kiá»ƒm + giá» cÃ¹ng lÆ°á»£t (tá»± Ä‘á»™ng tá»« NhÃ¢n Sá»±)',
  state.qcFinalRecords[0].workerNames === 'Nguyá»…n VÄƒn A, Tráº§n Thá»‹ B' && approx(state.qcFinalRecords[0].workHoursHC, 9));
check('LÆ¯U: localStorage ghi Ä‘Ãºng key bamboo_tracker_qc_final_v1',
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_FINAL)).length === 1);
const rec1 = state.qcFinalRecords[0];

// Cháº·n: thiáº¿u Ä‘áº§u vÃ o kiá»ƒm
const n0 = state.qcFinalRecords.length;
setVal('qcf-input-qty', '');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHáº¶N: thiáº¿u Äáº§u vÃ o kiá»ƒm â†’ khÃ´ng lÆ°u', state.qcFinalRecords.length === n0);
// Cháº·n: chÆ°a cÃ³ káº¿t quáº£ kiá»ƒm
setVal('qcf-input-qty', '500');
setVal('qcf-ok', ''); setVal('qcf-except', ''); setVal('qcf-reject', '');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHáº¶N: Äáº¡t/Ngoáº¡i lá»‡/Loáº¡i Ä‘á»u trá»‘ng â†’ khÃ´ng lÆ°u', state.qcFinalRecords.length === n0);
// Cháº·n: tá»•ng > Ä‘áº§u vÃ o
setVal('qcf-ok', '400'); setVal('qcf-except', '80'); setVal('qcf-reject', '40');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHáº¶N: Äáº¡t + Ngoáº¡i lá»‡ + Loáº¡i (520) > Äáº§u vÃ o (500) â†’ khÃ´ng lÆ°u', state.qcFinalRecords.length === n0);

// â”€â”€â”€ E. CÃ”NG THá»¨C 3 CON Sá» â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const d1 = qcf.qcFinalDisplay(rec1);
check('CÃ”NG THá»¨C: Tá»•ng kiá»ƒm = Äáº¡t + Ngoáº¡i lá»‡ + Loáº¡i = 480', d1.qtyChecked === 480);
check('CÃ”NG THá»¨C: Tá»•ng Ä‘áº¡t = Äáº¡t + Ngoáº¡i lá»‡ = 440', d1.qtyPass === 440);
check('CÃ”NG THá»¨C: Tá»‰ lá»‡ lá»—i = Loáº¡i Ã· Tá»•ng kiá»ƒm â‰ˆ 8,33%', approx(d1.errPct, (40 / 480) * 100));
check('CÃ”NG THá»¨C: CÃ´ng suáº¥t = Tá»•ng kiá»ƒm Ã· giá» (480 Ã· 9 â‰ˆ 53,33 táº¥m/h) Â· chÆ°a cÃ³ Ä‘á»‹nh má»©c â†’ Hiá»‡u suáº¥t null',
  approx(d1.cap, 480 / 9) && d1.eff === null && d1.rate === null);
check('HIá»‚N THá»Š: nhÃ£n vá»‹ trÃ­ "XÆ°á»Ÿng 2"', d1.workshopLabel === 'XÆ°á»Ÿng 2');
// â•â•â• PHáº¦N 5 â•â•â•

// â”€â”€â”€ F. POPUP Äá»ŠNH Má»¨C 2 LOáº I (Kiá»ƒm Thanh thanh/h Â· Kiá»ƒm VÃ¡n táº¥m/h) â”€â”€
qcf.openQcFinalRateModal();
check('POPUP Äá»ŠNH Má»¨C: báº¥m nÃºt má»Ÿ Ä‘Æ°á»£c (overlay show) + báº£ng cÃ³ hÃ ng thÃ¡ng',
  document.getElementById('modal-qcf-rate').classList._s.has('show') &&
  document.getElementById('qcf-rate-rows').innerHTML.includes('ThÃ¡ng'));
setVal('qcf-rate-2026-09-thanh', '500');
setVal('qcf-rate-2026-09-van', '600');
qcf.handleQcFinalRateRowSave('2026-09');
check('Äá»ŠNH Má»¨C 2 LOáº I: lÆ°u thÃ¡ng 9 = { thanh: 500 thanh/h Â· van: 600 táº¥m/h } (state + localStorage)',
  state.qcFinalRates['2026-09'] && state.qcFinalRates['2026-09'].thanh === 500 &&
  state.qcFinalRates['2026-09'].van === 600 &&
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_FINAL_RATE))['2026-09'].van === 600);
check('CHáº¶N Äá»ŠNH Má»¨C: cáº£ 2 Ã´ trá»‘ng â†’ khÃ´ng lÆ°u', (() => {
  setVal('qcf-rate-2026-09-thanh', ''); setVal('qcf-rate-2026-09-van', '');
  qcf.handleQcFinalRateRowSave('2026-09');
  return state.qcFinalRates['2026-09'].van === 600;
})());
check('Äá»ŠNH Má»¨C CÅ¨ (sá»‘ thuáº§n): qcFinalRateEntryOf hiá»ƒu lÃ  Ä‘á»‹nh má»©c Kiá»ƒm VÃ¡n', (() => {
  state.qcFinalRates['2026-08'] = 450; // báº£n cÅ© lÆ°u báº±ng sá»‘
  const e = qcf.qcFinalRateEntryOf('2026-08');
  return e.thanh === 0 && e.van === 450 && qcf.qcFinalRateOf('2026-08-15', 'van') === 450 &&
         qcf.qcFinalRateOf('2026-08-15', 'thanh') === null;
})());
check('Äá»ŠNH Má»¨C THEO LOáº I: rec1 (Kiá»ƒm VÃ¡n) láº¥y Ä‘Ãºng ÄM van â€” CÃ´ng suáº¥t 53,33 Ã· 600 â‰ˆ 8,89%',
  (() => { const d = qcf.qcFinalDisplay(rec1); return approx(d.rate, 600) && approx(d.eff, ((480 / 9) / 600) * 100); })());
qcf.closeQcFinalRateModal();
check('POPUP Äá»ŠNH Má»¨C: Ä‘Ã³ng Ä‘Æ°á»£c (overlay áº©n)',
  !document.getElementById('modal-qcf-rate').classList._s.has('show'));

// â”€â”€â”€ G. RENDER: THáºº NGÃ€Y + THá»NG KÃŠ + MINI CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.qcFinalRecords = [rec1];
qcf.renderQcFinalCard();
const dayHtml = document.getElementById('qcf-day-cards').innerHTML;
check('THáºº NGÃ€Y: Ä‘áº§u tháº» cÃ³ NgÃ y 23/09/26 (dd/mm/yy) + vá»‹ trÃ­ XÆ°á»Ÿng 2',
  dayHtml.includes('x2-day-head') && dayHtml.includes('23/09/26') && dayHtml.includes('XÆ°á»Ÿng 2'));
check('THáºº NGÃ€Y: NGÆ¯á»œI KIá»‚M tá»± Ä‘á»™ng (Nguyá»…n VÄƒn A + giá» 07:00â€“11:30, "+1 ngÆ°á»i khÃ¡c")',
  dayHtml.includes('Nguyá»…n VÄƒn A') && dayHtml.includes('07:00â€“11:30') && dayHtml.includes('+1 ngÆ°á»i khÃ¡c'));
check('THáºº NGÃ€Y: GIá»œ HC/TC (9h HC Â· 0h TC)', dayHtml.includes('9h HC') && dayHtml.includes('0h TC'));
check('THáºº NGÃ€Y: Ä‘á»§ Tá»•ng kiá»ƒm 480 Â· Tá»•ng Ä‘áº¡t 440 Â· Tá»‰ lá»‡ lá»—i 8,3%',
  dayHtml.includes('Tá»•ng kiá»ƒm') && dayHtml.includes('480') &&
  dayHtml.includes('Tá»•ng Ä‘áº¡t') && dayHtml.includes('440') && dayHtml.includes('8,3'));
check('THáºº NGÃ€Y: chip LOáº I KIá»‚M + ÄM táº¥m 600 + CÃ”NG SUáº¤T 53,3 + HIá»†U SUáº¤T 8,9% (Ä‘á»‹nh má»©c theo loáº¡i)',
  dayHtml.includes('qcf-kind-chip') && dayHtml.includes('Kiá»ƒm VÃ¡n') &&
  dayHtml.includes('ÄM táº¥m') && dayHtml.includes('600') &&
  dayHtml.includes('53,3') && dayHtml.includes('Hiá»‡u suáº¥t') && dayHtml.includes('8,9'));
check('THáºº NGÃ€Y: dÃ²ng lÆ°á»£t kiá»ƒm cÃ³ nÃºt Sá»­a/XÃ³a gáº¯n data-perm="qc"',
  dayHtml.includes('data-qcf-edit') && dayHtml.includes('data-qcf-delete') && dayHtml.includes('data-perm="qc"'));
const statsHtml = document.getElementById('qcf-stats').innerHTML;
check('THá»NG KÃŠ: Ä‘á»§ LÆ°á»£t kiá»ƒm Â· Äáº§u vÃ o Â· Tá»•ng kiá»ƒm Â· Tá»•ng Ä‘áº¡t Â· Loáº¡i Â· Tá»‰ lá»‡ lá»—i Â· CÃ´ng suáº¥t TB',
  statsHtml.includes('LÆ°á»£t kiá»ƒm') && statsHtml.includes('Äáº§u vÃ o kiá»ƒm') && statsHtml.includes('Tá»•ng sá»‘ lÆ°á»£ng kiá»ƒm') &&
  statsHtml.includes('Tá»•ng Ä‘áº¡t') && statsHtml.includes('Tá»‰ lá»‡ lá»—i') && statsHtml.includes('CÃ´ng suáº¥t TB'));
check('MINI CARD: Ä‘áº¿m "1 lÆ°á»£t Â· 440 táº¥m Ä‘áº¡t"', qcf.qcFinalCardCount() === '1 lÆ°á»£t Â· 440 táº¥m Ä‘áº¡t');
qc.renderQcView();
check('MINI CARD: renderQcView cáº­p nháº­t Ä‘áº¿m tháº» launcher',
  document.getElementById('qc-mini-count-final').textContent === '1 lÆ°á»£t Â· 440 táº¥m Ä‘áº¡t');
// â•â•â• PHáº¦N 6 â•â•â•

// â”€â”€â”€ G2. Tá»’N CHá»œ QC LÅ¨Y Káº¾ (Tá»•ng Â· ÄÃ£ kiá»ƒm Â· ÄÃ£ xuáº¥t Â· CÃ²n láº¡i) â”€â”€
// Sáº£n lÆ°á»£ng tuáº§n 38 (999) chuyá»ƒn sang tá»“n; tuáº§n 39â€“40 Ã©p thÃªm 500, kiá»ƒm 200.
state.qcExports = [];
state.qcFinalRecords = [
  { id: 'qcf-ignore', kind: 'other' },
  {
    id: 'qcf-sp1', date: '2026-09-24', workshop: 'x2', kind: 'van',
    pairKey: qcf.qcFinalPairKeyOf('2026-09-24'),
    productId: 'sp1', productName: 'VÃ¡n 1220Ã—2440Ã—9', inputQty: 200,
    qtyOk: 190, qtyExcept: 10, qtyReject: 0,
    workerNames: '', workTime: '', workHours: 0, workHoursHC: 0, workHoursTC: 0,
    createdAt: '2026-09-24T00:00:00Z', updatedAt: '2026-09-24T00:00:00Z'
  }
];
const stocks = qcf.qcFinalProductStocks('2026-10-01');
const stSp1 = stocks.find(s => s.productId === 'sp1');
const stSp2 = stocks.find(s => s.productId === 'sp2');
check('Tá»’N CHá»œ QC: sp1 cÃ³ tá»“n chuyá»ƒn tá»« tuáº§n 38 Â· Tá»•ng 1499 Â· ÄÃ£ kiá»ƒm 200 Â· CÃ²n 1299',
  stSp1 && stSp1.total === 1499 && stSp1.used === 200 && stSp1.remain === 1299);
check('Tá»’N KIá»‚M: sp2 chÆ°a kiá»ƒm â†’ CÃ²n láº¡i = Tá»•ng (200)',
  stSp2 && stSp2.total === 200 && stSp2.used === 0 && stSp2.remain === 200);
state.qcExports = [
  { id: 'ship-overlap', productId: 'sp1', name: 'VÃ¡n 1220Ã—2440Ã—9', year: 2026, weeks: [39, 40], qty: 80, exportDate: '2026-09-25' }
];
check('Tá»’N CHá»œ QC: hÃ ng Ä‘Ã£ kiá»ƒm rá»“i xuáº¥t khÃ´ng bá»‹ trá»« hai láº§n',
  (qcf.qcFinalProductStocks('2026-10-01').find(x => x.productId === 'sp1') || {}).remain === 1299);
state.qcExports[0].qty = 250;
check('Tá»’N CHá»œ QC: xuáº¥t vÆ°á»£t lÆ°á»£ng Ä‘Ã£ kiá»ƒm thÃ¬ cÅ©ng loáº¡i pháº§n Ä‘Ã£ xuáº¥t khá»i nguá»“n QC',
  (qcf.qcFinalProductStocks('2026-10-01').find(x => x.productId === 'sp1') || {}).remain === 1249);
state.qcExports = [];
check('Tá»’N KIá»‚M: lÆ°á»£t kiá»ƒm KHÃ”NG cÃ³ pairKey (dá»¯ liá»‡u cÅ©) váº«n tÃ­nh theo ngÃ y', (() => {
  delete state.qcFinalRecords[1].pairKey;
  const s = qcf.qcFinalProductStocks('2026-10-01').find(x => x.productId === 'sp1');
  state.qcFinalRecords[1].pairKey = qcf.qcFinalPairKeyOf('2026-09-24');
  return s && s.used === 200 && s.remain === 1299;
})());
// Danh sÃ¡ch tháº» hiá»ƒn thá»‹ tá»“n lÅ©y káº¿ + chá»n tháº» â†’ tá»± Ä‘iá»n CHá»œ KIá»‚M
setVal('qcf-workshop', 'x2'); setVal('qcf-kind', 'van'); setVal('qcf-date', '2026-10-01');
qcf.syncQcFinalKindFields();
qcf.setQcFinalSearchQ('');
qcf.setQcFinalPickerOpen(true);
const pickHtml = document.getElementById('qcf-product-list').innerHTML;
check('DROPDOWN Ná»”I: má»Ÿ â†’ node PORTAL ra `#qc-detail-overlay` (lá»›p fixed phá»§ mÃ n hÃ¬nh â€” khÃ´ng rÆ¡i Ä‘Ã¡y trang)',
  document.getElementById('qcf-picker').parentElement === document.getElementById('qc-detail-overlay'));
check('DROPDOWN Ná»”I: neo báº±ng INLINE STYLE â€” position:absolute + z-index:240 (tháº¯ng Má»ŒI stylesheet cÅ© do cache) + top/left/width lÃ  sá»‘',
  document.getElementById('qcf-picker').style.position === 'absolute' &&
  document.getElementById('qcf-picker').style.zIndex === '240' &&
  /^\d+px$/.test(document.getElementById('qcf-picker').style.top) &&
  /^\d+px$/.test(document.getElementById('qcf-picker').style.left) &&
  /^\d+px$/.test(document.getElementById('qcf-picker').style.width));
check('DANH SÃCH THáºº: tá»“n chuyá»ƒn ká»³ hiá»ƒn thá»‹ "Tá»•ng 1499 Â· ÄÃ£ kiá»ƒm 200 Â· Chá» kiá»ƒm 1299"',
  pickHtml.includes('Tá»•ng <strong>1.499</strong>') && pickHtml.includes('ÄÃ£ kiá»ƒm 200') &&
  pickHtml.includes('ÄÃ£ xuáº¥t 0') && pickHtml.includes('Chá» kiá»ƒm 1.299'));
const pickEvt = { target: { closest: (sel) => (sel === '[data-qcf-product]' ? { getAttribute: () => 'sp1' } : null) } };
qcf.onQcFinalListClick(pickEvt);
check('CHá»ŒN THáºº: Ã´ Äáº§u vÃ o kiá»ƒm tá»± Ä‘iá»n sá»‘ CHá»œ KIá»‚M (1299 â€” khÃ´ng pháº£i tá»•ng 1499)',
  document.getElementById('qcf-input-qty').value === '1299');
qcf.resetQcFinalForm();
check('DROPDOWN Ná»”I: Ä‘Ã³ng â†’ node TRá»ž Vá»€ Ã´ Äáº§u vÃ o kiá»ƒm (khÃ´ng cÃ²n trong overlay)',
  document.getElementById('qcf-picker').parentElement !== document.getElementById('qc-detail-overlay'));
state.qcFinalRecords = [rec1]; // dá»n dá»¯ liá»‡u thÃªm â€” tráº£ vá» 1 lÆ°á»£t Ä‘á»ƒ cÃ¡c má»¥c sau Ä‘Ãºng
// â•â•â• PHáº¦N 6b â•â•â•

// â”€â”€â”€ H. LOáº I KIá»‚M (Thanh / VÃ¡n): Ä‘Æ¡n vá»‹ + nguá»“n danh sÃ¡ch â”€â”€â”€â”€â”€â”€
setVal('qcf-kind', 'thanh');
qcf.syncQcFinalKindFields();
check('KIá»‚M THANH: Ä‘Æ¡n vá»‹ cÃ¡c Ã´ sá»‘ lÆ°á»£ng Ä‘á»•i thÃ nh "thanh" + HIá»†N danh sÃ¡ch Cá»  thanh (BÃ o thanh)',
  document.getElementById('qcf-unit-in').textContent === 'thanh' &&
  document.getElementById('qcf-unit-ok').textContent === 'thanh' &&
  document.getElementById('qcf-picker-btn').hidden === false &&
  document.getElementById('qcf-picker-text').textContent === 'Cá»¡ thanh BÃ o thanh');
setVal('qcf-kind', 'van');
qcf.syncQcFinalKindFields();
check('KIá»‚M VÃN: Ä‘Æ¡n vá»‹ vá» "táº¥m" + hiá»‡n láº¡i picker (XÆ°á»Ÿng 2)',
  document.getElementById('qcf-unit-in').textContent === 'táº¥m' &&
  document.getElementById('qcf-picker-btn').hidden === false);

// â”€â”€â”€ H. Sá»¬A / XÃ“A + TOMBSTONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
qcf.editQcFinalRecord(rec1.id);
check('Sá»¬A: náº¡p láº¡i Ä‘Ãºng lÆ°á»£t vÃ o form + banner "Ä‘ang sá»­a" hiá»‡n',
  document.getElementById('qcf-date').value === '2026-09-23' &&
  document.getElementById('qcf-input-qty').value === '500' &&
  document.getElementById('qcf-ok').value === '380' &&
  document.getElementById('qcf-edit-banner').style.display === '');
setVal('qcf-ok', '400'); // 400 + 60 + 40 = 500 â‰¤ Ä‘áº§u vÃ o 500
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('Sá»¬A: Ä‘áº¡t 380 â†’ 400 (Tá»•ng kiá»ƒm 500 Â· Tá»•ng Ä‘áº¡t 460 Â· váº«n 1 lÆ°á»£t Â· khÃ´ng táº¡o lÆ°á»£t má»›i)',
  state.qcFinalRecords.length === 1 && qcf.qcFinalDisplay(state.qcFinalRecords[0]).qtyPass === 460 &&
  qcf.qcFinalDisplay(state.qcFinalRecords[0]).qtyChecked === 500);
qcf.editQcFinalRecord(rec1.id);
qcf.deleteQcFinalRecord(rec1.id);
check('XÃ“A: xÃ³a lÆ°á»£t kiá»ƒm + ghi tombstone (qcFinalRecords)',
  state.qcFinalRecords.length === 0 &&
  state.deletedIds.qcFinalRecords && state.deletedIds.qcFinalRecords[rec1.id]);

// â”€â”€â”€ I. Vá»Š TRÃ XÆ¯á»žNG 1: "Sáº¯p cÃ³" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
setVal('qcf-workshop', 'x1');
qcf.syncQcFinalWorkshopFields();
check('XÆ¯á»žNG 1: áº©n nÃºt chá»n thÃ nh pháº©m Â· hiá»‡n chip "Sáº¯p cÃ³"',
  document.getElementById('qcf-picker-btn').hidden === true &&
  document.getElementById('qcf-in-soon').hidden === false);
setVal('qcf-workshop', 'x2');
qcf.syncQcFinalWorkshopFields();
check('XÆ¯á»žNG 2: hiá»‡n láº¡i nÃºt chá»n thÃ nh pháº©m Â· áº©n chip "Sáº¯p cÃ³"',
  document.getElementById('qcf-picker-btn').hidden === false &&
  document.getElementById('qcf-in-soon').hidden === true);

// â”€â”€â”€ I2. 'KIá»‚M THANH' â€” LINK Cá»  THANH Äáº¦U RA Cá»¦A BÃ€O THANH â”€â”€â”€â”€â”€
// LÆ°á»£t BÃ o thanh ghi cá»¡ Ä‘áº§u ra 640Ã—14Ã—12 (Ä‘em bÃ o 500 thanh) â†’ QC chá»n cá»¡ nÃ y,
// tá»± Ä‘iá»n Äáº§u vÃ o kiá»ƒm = sá»‘ CÃ’N Láº I, lÆ°u `sizeKey` Ä‘á»ƒ tháº» BÃ o Tinh Ä‘á»c láº¡i.
state.xuong2BaoTinhRecords = [
  { id: 'bt1', date: '2026-09-20', kind: 'bao_thanh', inSizeKey: '1200Ã—18Ã—15', inDims: [1200, 18, 15],
    inQty: 500, inSource: 'press', outSizeKey: '640Ã—14Ã—12', outDims: [640, 14, 12] },
  { id: 'bt2', date: '2026-09-21', kind: 'bao_thanh', inSizeKey: '1200Ã—18Ã—15', inDims: [1200, 18, 15],
    inQty: 300, inSource: 'press', outSizeKey: '1200Ã—10Ã—8', outDims: [1200, 10, 8] }
];
setVal('qcf-kind', 'thanh'); setVal('qcf-workshop', 'x2');
qcf.syncQcFinalKindFields();
const sizeStocks = qcf.qcFinalThanhSizeStocks();
check('Tá»’N Cá»  THANH: 2 cá»¡ Ä‘áº§u ra cá»§a BÃ o thanh â€” 640Ã—14Ã—12 Tá»•ng 500 Â· CÃ²n 500',
  sizeStocks.length === 2 &&
  (sizeStocks.find(x => x.sizeKey === '640Ã—14Ã—12') || {}).total === 500 &&
  (sizeStocks.find(x => x.sizeKey === '640Ã—14Ã—12') || {}).remain === 500);
qcf.setQcFinalPickerOpen(true);
const thanhListHtml = document.getElementById('qcf-product-list').innerHTML;
check('DANH SÃCH Cá»  THANH: tháº» hiá»‡n cá»¡ mm + Tá»•ng/ÄÃ£ kiá»ƒm/CÃ²n láº¡i + nÃºt chá»n data-qcf-size',
  thanhListHtml.includes('640 Ã— 14 Ã— 12 mm') && thanhListHtml.includes('data-qcf-size="640Ã—14Ã—12"') &&
  thanhListHtml.includes('Tá»•ng <strong>500</strong>') && thanhListHtml.includes('CÃ²n láº¡i 500'));
qcf.onQcFinalListClick({ target: { closest: sel => sel === '[data-qcf-size]' ? { getAttribute: () => '640Ã—14Ã—12' } : null } });
check('CHá»ŒN Cá»  THANH: Ã´ Äáº§u vÃ o kiá»ƒm tá»± Ä‘iá»n sá»‘ CÃ’N Láº I (500)',
  document.getElementById('qcf-input-qty').value === '500');
setVal('qcf-date', '2026-09-22');
setVal('qcf-input-qty', '500'); setVal('qcf-ok', '470'); setVal('qcf-except', '10'); setVal('qcf-reject', '20');
qcf.handleQcFinalSubmit({ preventDefault(){} });
const qcThanh = state.qcFinalRecords[state.qcFinalRecords.length - 1];
check('LÆ¯U KIá»‚M THANH: lÆ°u kind=thanh + sizeKey/sizeDims cá»§a cá»¡ Ä‘Æ°á»£c kiá»ƒm',
  qcThanh.kind === 'thanh' && qcThanh.sizeKey === '640Ã—14Ã—12' &&
  qcThanh.sizeDims.join('Ã—') === '640Ã—14Ã—12' && qcThanh.qtyOk === 470);
check('Tá»’N Cá»  THANH SAU KIá»‚M: 640Ã—14Ã—12 Ä‘Ã£ kiá»ƒm 500 â†’ CÃ²n 0 Â· cá»¡ kia váº«n 300',
  (qcf.qcFinalThanhSizeStocks().find(x => x.sizeKey === '640Ã—14Ã—12') || {}).remain === 0 &&
  (qcf.qcFinalThanhSizeStocks().find(x => x.sizeKey === '1200Ã—10Ã—8') || {}).remain === 300);
qcf.renderQcFinalTable();
check('THáºº NGÃ€Y: lÆ°á»£t Kiá»ƒm thanh hiá»‡n CHIP Cá»  thay cho tÃªn thÃ nh pháº©m',
  document.getElementById('qcf-day-cards').innerHTML.includes('Cá»¡ 640 Ã— 14 Ã— 12') &&
  qcf.qcFinalDisplay(qcThanh).sizeKey === '640Ã—14Ã—12');
// Sá»¬A lÆ°á»£t kiá»ƒm thanh â†’ khÃ´i phá»¥c Ä‘Ãºng cá»¡ + xoÃ¡ sáº¡ch dá»¯ liá»‡u thÃªm
qcf.editQcFinalRecord(qcThanh.id);
check('Sá»¬A KIá»‚M THANH: khÃ´i phá»¥c lá»±a chá»n cá»¡ 640 Ã— 14 Ã— 12', (() => {
  qcf.setQcFinalPickerOpen(true);
  const h = document.getElementById('qcf-product-list').innerHTML;
  qcf.setQcFinalPickerOpen(false);
  return h.includes('qcf-product picked');
})());
qcf.deleteQcFinalRecord(qcThanh.id);
state.xuong2BaoTinhRecords = [];
state.qcFinalRecords = [];

// â”€â”€â”€ I3. 'KIá»‚M VÃN' â€” 2 NHÃ“M NGUá»’N: VÃN THÃ” BTP + THÃ€NH PHáº¨M â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ÄVT phÃ¢n loáº¡i THÃ€NH PHáº¨M (1220x2440x9 = Táº¥m Â· 640x14x12 = Thanh);
// THá»‚ TÃCH 1 tháº¿ < 0,0015 mÂ³ phÃ¢n loáº¡i VÃN THÃ” BTP (khÃ´ng cáº§n Ä‘á»‹nh má»©c).
check('KHá»šP Sáº¢N PHáº¨M: 640x14x12 KHÃ”NG khá»›p 640x14x120 â€” chá»‰ kÃ­ch thÆ°á»›c chÃ­nh xÃ¡c',
  (() => {
    const rows = [
      { productId: 'r-120', name: '640x14x120' },
      { productId: 'r-12', name: '640x14x12' }
    ];
    const hit = qcf.qcFinalResolveProduct({ name: '640x14x12' }, rows);
    return !!hit && hit.productId === 'r-12';
  })());
state.materialRates = [
  { id: 'r-van',   product: '1220x2440x9', unit: 'Táº¥m',  nanUse: 'VÃ¡n' },
  { id: 'r-thanh', product: '640x14x12',   unit: 'Thanh', nanUse: 'VÃ¡n' }
];
state.pressRecords = [
  // â‘  LÆ°á»£t BTP: CHá»ˆ Ä‘iá»n "VÃ¡n ThÃ´ Táº¡o Ra", KHÃ”NG Ä‘iá»n ThÃ nh Pháº©m (cáº·p 39â€“40)
  { id: 'pb1', date: '2026-09-22', week: '2026-W39', year: 2026, productId: '', productName: '',
    finishedQty: 0, sticks: [],
    vanTho: [{ vtDim: '1220Ã—2440Ã—9', vtQty: 50 }, { vtDim: '640x14x12', vtQty: 300 },
             { vtDim: '1200Ã—18Ã—15', vtQty: 700 }] }, // 1200Ã—18Ã—15 KHÃ”NG cÃ³ Ä‘á»‹nh má»©c â†’ pháº£i LOáº I nhá» thá»ƒ tÃ­ch
  // â‘¡ ThÃ nh pháº©m ÄVT = Thanh â†’ PHáº¢I bá»‹ loáº¡i khá»i danh sÃ¡ch Kiá»ƒm VÃ¡n (VD 640x14x12)
  { id: 'pp1', date: '2026-09-23', week: '2026-W39', year: 2026, productId: 'r-thanh', productName: '640x14x12',
    finishedQty: 99, vanTho: [], sticks: [] },
  // â‘¢ ThÃ nh pháº©m ÄVT = Táº¥m â†’ giá»¯ láº¡i
  { id: 'pp2', date: '2026-09-24', week: '2026-W39', year: 2026, productId: 'r-van', productName: '1220x2440x9',
    finishedQty: 40, vanTho: [], sticks: [] }
];
setVal('qcf-kind', 'van'); setVal('qcf-workshop', 'x2'); setVal('qcf-date', '2026-09-23');
qcf.syncQcFinalKindFields();
qcf.setQcFinalSearchQ('');
check('VÃN THÃ” BTP: tá»“n gá»™p theo cá»¡ â€” chá»‰ cÃ²n 1220Ã—2440Ã—9 (Tá»•ng 50) Â· LOáº I 640Ã—14Ã—12 + 1200Ã—18Ã—15 theo THá»‚ TÃCH', (() => {
  const rows = qcf.qcFinalVanBtpStocks('2026-09-23');
  const van = rows.find(x => x.sizeKey === '1220Ã—2440Ã—9');
  return rows.length === 1 && van && van.total === 50 && van.remain === 50 &&
    van.name === 'VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9' &&
    !rows.find(x => x.sizeKey === '640Ã—14Ã—12');
})());
check('VÃN THÃ” BTP: cá»¡ 1200Ã—18Ã—15 KHÃ”NG cÃ³ trong Ä‘á»‹nh má»©c váº«n bá»‹ LOáº I nhá» thá»ƒ tÃ­ch (0,000324 mÂ³ < 0,0015)',
  !qcf.qcFinalVanBtpStocks('2026-09-23').find(x => x.sizeKey === '1200Ã—18Ã—15'));
check('THÃ€NH PHáº¨M 2 TUáº¦N: chá»‰ cÃ²n sp ÄVT Táº¥m (1220x2440x9 = 40) â€” loáº¡i ÄVT Thanh + lÆ°á»£t BTP', (() => {
  const rows = qcf.qcFinalProducts2Weeks('2026-09-23');
  return rows.length === 1 && rows[0].productId === 'r-van' && rows[0].qty === 40;
})());
setVal('qcf-date', '2026-09-24');
qcf.syncQcFinalKindFields();
qcf.setQcFinalSearchQ('');
qcf.setQcFinalPickerOpen(true);
const vanListHtml = document.getElementById('qcf-product-list').innerHTML;
check('DANH SÃCH KIá»‚M VÃN: 2 nhÃ³m head (VÃ¡n thÃ´ BTP Â· ThÃ nh pháº©m Ã‰p VÃ¡n) + tháº» data-qcf-vt',
  vanListHtml.includes('VÃ¡n thÃ´ BTP chÆ°a kiá»ƒm Ä‘áº¿n') && vanListHtml.includes('ThÃ nh pháº©m Ã‰p VÃ¡n chÆ°a kiá»ƒm Ä‘áº¿n') &&
  vanListHtml.includes('data-qcf-vt="1220Ã—2440Ã—9"') && vanListHtml.includes('data-qcf-product="r-van"'));
check('DANH SÃCH KIá»‚M VÃN: KHÃ”NG cÃ²n sÃ³t thanh â€” 640Ã—14Ã—12 Â· 1200Ã—18Ã—15 (BTP) vÃ  sp ÄVT Thanh',
  !vanListHtml.includes('640 Ã— 14 Ã— 12') && !vanListHtml.includes('1200 Ã— 18 Ã— 15') &&
  !vanListHtml.includes('data-qcf-product="r-thanh"'));
check('THáºº VÃN THÃ” BTP: 2 dÃ²ng â€” "VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9 mm" + Tá»•ng 50 Â· ÄÃ£ kiá»ƒm 0 Â· Chá» kiá»ƒm 50',
  vanListHtml.includes('VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9 mm') &&
  vanListHtml.includes('Tá»•ng <strong>50</strong>') &&
  vanListHtml.includes('ÄÃ£ kiá»ƒm 0') && vanListHtml.includes('Chá» kiá»ƒm 50'));
setVal('qcf-date', '2026-09-23');
qcf.onQcFinalListClick({ target: { closest: sel => sel === '[data-qcf-vt]' ? { getAttribute: () => '1220Ã—2440Ã—9' } : null } });
check('CHá»ŒN THáºº VÃN THÃ”: tá»± Ä‘iá»n CÃ’N Láº I (50) + nhÃ£n nÃºt Ä‘á»•i thÃ nh tÃªn vÃ¡n thÃ´',
  document.getElementById('qcf-input-qty').value === '50' &&
  document.getElementById('qcf-picker-text').textContent === 'VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9');
setVal('qcf-ok', '45'); setVal('qcf-except', '3'); setVal('qcf-reject', '2'); // 45+3+2 = 50 = Ä‘áº§u vÃ o
qcf.handleQcFinalSubmit({ preventDefault(){} });
const qcBtp = state.qcFinalRecords[state.qcFinalRecords.length - 1];
check('LÆ¯U KIá»‚M VÃN BTP: kind=van + sizeKey/sizeDims 1220Ã—2440Ã—9 + productName "VÃ¡n thÃ´ â€¦" + productId rá»—ng',
  state.qcFinalRecords.length === 1 && qcBtp.kind === 'van' && qcBtp.sizeKey === '1220Ã—2440Ã—9' &&
  qcBtp.sizeDims.join('Ã—') === '1220Ã—2440Ã—9' &&
  qcBtp.productName === 'VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9' && !qcBtp.productId && qcBtp.qtyOk === 45);
check('Tá»’N BTP SAU KIá»‚M: 1220Ã—2440Ã—9 Ä‘Ã£ kiá»ƒm 50 â†’ CÃ²n 0',
  (qcf.qcFinalVanBtpStocks('2026-09-23').find(x => x.sizeKey === '1220Ã—2440Ã—9') || {}).remain === 0);
qcf.renderQcFinalTable();
check('THáºº NGÃ€Y: lÆ°á»£t Kiá»ƒm vÃ¡n BTP hiá»‡n chip productName "VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9"',
  document.getElementById('qcf-day-cards').innerHTML.includes('VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9'));
// Sá»¬A lÆ°á»£t BTP â†’ khÃ´i phá»¥c lá»±a chá»n (tháº» highlighted trong danh sÃ¡ch 2 nhÃ³m)
qcf.editQcFinalRecord(qcBtp.id);
check('Sá»¬A KIá»‚M VÃN BTP: khÃ´i phá»¥c cá»¡ 1220Ã—2440Ã—9 (tháº» picked trong danh sÃ¡ch)', (() => {
  qcf.setQcFinalPickerOpen(true);
  const h = document.getElementById('qcf-product-list').innerHTML;
  qcf.setQcFinalPickerOpen(false);
  return h.includes('data-qcf-vt="1220Ã—2440Ã—9"') && h.includes('qcf-product picked');
})());
qcf.deleteQcFinalRecord(qcBtp.id);
check('XÃ“A LÆ¯á»¢T BTP: khÃ´ng cÃ²n lÆ°á»£t nÃ o + tá»“n tráº£ láº¡i 50',
  state.qcFinalRecords.length === 0 &&
  (qcf.qcFinalVanBtpStocks('2026-09-23').find(x => x.sizeKey === '1220Ã—2440Ã—9') || {}).remain === 50);
state.pressRecords.push({
  id: 'pb-old', date: '2026-09-15', week: '2026-W38', year: 2026,
  productId: '', productName: '', finishedQty: 0, sticks: [],
  vanTho: [{ vtDim: '1220Ã—2440Ã—9', vtQty: 30 }]
});
check('VÃN THÃ” BTP: tá»“n chÆ°a kiá»ƒm tuáº§n 38 váº«n chuyá»ƒn sang ngÃ y kiá»ƒm tuáº§n 39',
  (qcf.qcFinalVanBtpStocks('2026-09-23').find(x => x.sizeKey === '1220Ã—2440Ã—9') || {}).remain === 80);
state.pressRecords = []; state.materialRates = []; state.qcFinalRecords = [];

// â”€â”€â”€ J. Cáº¤U TRÃšC (index.html Â· qc.js Â· events.js Â· 4 nÆ¡i Â· sw.js Â· css) â”€â”€
const idxHtml = fsMod.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const qcJs = fsMod.readFileSync(new URL('../js/qc.js', import.meta.url), 'utf8');
const evJs = fsMod.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const stJs = fsMod.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const stoJs = fsMod.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const clJs = fsMod.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const hiJs = fsMod.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const mnJs = fsMod.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const swJs = fsMod.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cssHtml = fsMod.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const pkJs = fsMod.readFileSync(new URL('../package.json', import.meta.url), 'utf8');

check('Cáº¤U TRÃšC (index.html): tháº» qc-final-card cÃ³ form Â· Ã´ Kiá»ƒm Loáº¡i Â· picker thÃ nh pháº©m Â· tháº» ngÃ y',
  idxHtml.includes('id="qc-final-card"') && idxHtml.includes('id="qcf-form"') &&
  idxHtml.includes('id="qcf-kind"') && idxHtml.includes('id="qcf-product-list"') &&
  idxHtml.includes('id="qcf-day-cards"') && idxHtml.includes('id="qcf-input-qty"'));
check('Cáº¤U TRÃšC (index.html): nÃºt "Äá»‹nh má»©c" TRONG form + popup báº£ng Ä‘á»‹nh má»©c 2 loáº¡i (bá» thanh .x2-rate-bar cÅ©)',
  idxHtml.includes('id="btn-qcf-rate"') && idxHtml.includes('id="modal-qcf-rate"') &&
  idxHtml.includes('id="qcf-rate-rows"') && idxHtml.includes('Kiá»ƒm Thanh (thanh/h)') &&
  idxHtml.includes('Kiá»ƒm VÃ¡n (táº¥m/h)') && !idxHtml.includes('id="qcf-rate-bar"'));
check('Cáº¤U TRÃšC (index.html): mini card khÃ´ng cÃ²n chÃº thÃ­ch "sáº¯p bá»• sung"',
  !idxHtml.includes('Kiá»ƒm Sau Sáº£n Xuáº¥t â€” kiá»ƒm tra thÃ nh pháº©m trÆ°á»›c khi xuáº¥t xÆ°á»Ÿng (sáº¯p bá»• sung)'));
check('Cáº¤U TRÃšC (qc.js): Ä‘áº¿m tháº» qc-final-card dÃ¹ng qcFinalCardCount + render trong renderQcView',
  qcJs.includes("'qc-final-card':    { el: 'qc-mini-count-final',    count: () => qcFinalCardCount() }") &&
  qcJs.includes('renderQcFinalCard();'));
check('Cáº¤U TRÃšC (events.js): wire form Â· Loáº¡i kiá»ƒm Â· picker Â· sá»­a/xÃ³a Â· popup Ä‘á»‹nh má»©c + Ä‘Ã³ng picker ngoÃ i',
  evJs.includes("safeOn('qcf-form', 'submit'") && evJs.includes('toggleQcFinalPicker') &&
  evJs.includes('onQcFinalTableClick') && evJs.includes("safeOn('qcf-kind', 'change'") &&
  evJs.includes('openQcFinalRateModal') && evJs.includes('onQcFinalRateRowClick') &&
  evJs.includes('qcFinalMaybeClosePicker'));
check('Cáº¤U TRÃšC (js/qc-final.js): tá»“n chá» QC lÅ©y káº¿ theo ngÃ y (pairKey bÃ¡o cÃ¡o) + Ä‘Æ¡n vá»‹ theo Loáº¡i kiá»ƒm + tá»“n vÃ¡n thÃ´ BTP',
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('qcFinalProductStocks') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('qcFinalPairKeyOf') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('syncQcFinalKindFields') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('qcFinalVanBtpStocks') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('QC_FINAL_BTP_PIECE_MAX_VOL') &&
  fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8').includes('data-qcf-vt'));
check('Cáº¤U TRÃšC (state.js): 2 key bamboo_tracker_qc_final_v1 + bamboo_tracker_qc_final_rate_v1',
  stJs.includes("bamboo_tracker_qc_final_v1") && stJs.includes("bamboo_tracker_qc_final_rate_v1"));
check('Cáº¤U TRÃšC (4 nÆ¡i): storage (restore) Â· cloud (snapshot/core) Â· history (DOMAINS) Â· main (load boot)',
  stoJs.includes('restoreQcFinal') && stoJs.includes('qcFinalRecords') &&
  clJs.includes('qcFinalRecords') && clJs.includes('qcFinalRates') &&
  hiJs.includes('qcFinalRecords') && mnJs.includes('loadQcFinal'));
check('Cáº¤U TRÃšC (sw.js): CACHE_NAME v486 + js/qc-final.js vÃ o APP_SHELL',
  /nha-may-ngoc-son-v486/.test(swJs) && swJs.includes("'./js/qc-final.js'"));
check('Cáº¤U TRÃšC (styles.css): khá»‘i CSS riÃªng cá»§a tháº» (form gá»n + dropdown ná»•i position:absolute + dÃ²ng lÆ°á»£t kiá»ƒm + popup ÄM)',
  cssHtml.includes('.qcf-picker') && cssHtml.includes('.qcf-row-main') && cssHtml.includes('.qcf-ws-chip') &&
  cssHtml.includes('.qcf-kind-chip') && cssHtml.includes('.qcf-product-meta') &&
  cssHtml.includes('.qcf-rate-input') &&
  /\.qcf-picker\s*\{[^}]*position:\s*absolute/.test(cssHtml) && !/\.qcf-picker\s*\{[^}]*position:\s*(static|fixed)/.test(cssHtml));
check('Cáº¤U TRÃšC (dropdown ná»•i): portal ra overlay + neo tá»a Ä‘á»™ (má»Ÿ xuá»‘ng/lÃªn) + giá»¯ neo khi cuá»™n/resize/Esc',
  (() => {
    const qcfJs = fsMod.readFileSync(new URL('../js/qc-final.js', import.meta.url), 'utf8');
    const evSrc = fsMod.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
    return qcfJs.includes("getElementById('qc-detail-overlay') || document.body") &&
           qcfJs.includes('positionQcFinalPicker') && qcfJs.includes('openUp') &&
           qcfJs.includes("box.style.position = 'absolute'") && qcfJs.includes("box.style.zIndex = '240'") &&
           qcfJs.includes("e.target.closest('#qcf-picker')") &&
           evSrc.includes('positionQcFinalPicker') &&
           evSrc.includes("window.addEventListener('scroll', positionQcFinalPicker, true)") &&
           evSrc.includes('setQcFinalPickerOpen(false); return;');
  })());
check('Cáº¤U TRÃšC (cloud.js): Ä‘Äƒng kÃ½ SW vá»›i updateViaCache:"none" â€” sw.js luÃ´n táº£i má»›i, háº¿t dÃ­nh bundle cÅ©',
  fsMod.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8').includes("register('./sw.js', { updateViaCache: 'none' })"));
check('Cáº¤U TRÃšC (package.json): tests/qc-final.test.mjs Ä‘Ã£ vÃ o npm test',
  pkJs.includes('tests/qc-final.test.mjs'));

// â”€â”€â”€ J. Cáº¬P NHáº¬T Má»šI: tá»“n Thanh theo ngÃ y + Ä‘á»•i Loáº¡i + xem trÆ°á»›c â”€â”€
state.xuong2BaoTinhRecords = [
  { id: 'bt-date-a', date: '2026-09-20', kind: 'bao_thanh', inQty: 500,
    outSizeKey: '640Ã—14Ã—12', outDims: [640, 14, 12] },
  { id: 'bt-date-b', date: '2026-09-25', kind: 'bao_thanh', inQty: 300,
    outSizeKey: '640Ã—14Ã—12', outDims: [640, 14, 12] }
];
state.qcFinalRecords = [
  { id: 'qc-date-a', date: '2026-09-21', kind: 'thanh', sizeKey: '640Ã—14Ã—12', inputQty: 200 },
  { id: 'qc-date-b', date: '2026-09-26', kind: 'thanh', sizeKey: '640Ã—14Ã—12', inputQty: 100 },
  { id: 'qc-edit-ignore', date: '2026-09-22', kind: 'thanh', sizeKey: '640Ã—14Ã—12', inputQty: 50 }
];
check('Tá»’N THANH THEO NGÃ€Y: chá»‰ láº¥y lÆ°á»£t BÃ o/QC cÃ³ ngÃ y â‰¤ ngÃ y kiá»ƒm',
  (() => {
    const rows = qcf.qcFinalThanhSizeStocks('', '2026-09-23');
    const row = rows.find(x => x.sizeKey === '640Ã—14Ã—12');
    return row && row.total === 500 && row.used === 250 && row.remain === 250;
  })());
check('Sá»¬A LÆ¯á»¢T THANH: loáº¡i lÆ°á»£t Ä‘ang sá»­a khá»i tá»•ng ÄÃ£ kiá»ƒm, tráº£ láº¡i tá»“n ngay theo ngÃ y',
  (() => {
    const rows = qcf.qcFinalThanhSizeStocks('qc-edit-ignore', '2026-09-23');
    const row = rows.find(x => x.sizeKey === '640Ã—14Ã—12');
    return row && row.used === 200 && row.remain === 300;
  })());
check('Tá»’N THANH THEO NGÃ€Y: ngÃ y 25 gá»“m cáº£ lÆ°á»£t BÃ o 25 nhÆ°ng chÆ°a gá»“m QC ngÃ y 26',
  (() => {
    const row = qcf.qcFinalThanhSizeStocks('', '2026-09-25')
      .find(x => x.sizeKey === '640Ã—14Ã—12');
    return row && row.total === 800 && row.used === 250 && row.remain === 550;
  })());

qcf.resetQcFinalForm();
setVal('qcf-date', '2026-09-23');
setVal('qcf-kind', 'thanh');
qcf.syncQcFinalKindFields();
qcf.onQcFinalListClick({
  target: { closest: sel => sel === '[data-qcf-size]' ? { getAttribute: () => '640Ã—14Ã—12' } : null }
});
setVal('qcf-input-qty', '100');
setVal('qcf-ok', '80');
setVal('qcf-except', '10');
setVal('qcf-reject', '10');
const preview = qcf.updateQcFinalPreview();
check('XEM TRÆ¯á»šC QC: tÃ­nh Äáº§u vÃ o, Äáº¡t, Ngoáº¡i lá»‡, Loáº¡i, Tá»•ng kiá»ƒm/Ä‘áº¡t, cÃ²n láº¡i nguá»“n vÃ  tá»‰ lá»‡ lá»—i',
  preview && preview.inputQty === 100 && preview.qtyOk === 80 && preview.qtyExcept === 10 &&
  preview.qtyReject === 10 && preview.totalChecked === 100 && preview.totalPass === 90 &&
  preview.remaining === 150 && approx(preview.errorPct, 10));
check('Äá»”I LOáº I: Thanh â†’ VÃ¡n xÃ³a sáº¡ch lá»±a chá»n Thanh vÃ  Ã´ Äáº§u vÃ o',
  (() => {
    setVal('qcf-kind', 'van');
    qcf.syncQcFinalKindFields();
    return document.getElementById('qcf-input-qty').value === '' &&
      document.getElementById('qcf-picker-text').textContent === 'VÃ¡n thÃ´ Ã‰p VÃ¡n';
  })());
check('Äá»”I LOáº I: VÃ¡n â†’ Thanh xÃ³a sáº¡ch lá»±a chá»n VÃ¡n',
  (() => {
    setVal('qcf-kind', 'thanh');
    qcf.syncQcFinalKindFields();
    return document.getElementById('qcf-input-qty').value === '' &&
      document.getElementById('qcf-picker-text').textContent === 'Cá»¡ thanh BÃ o thanh';
  })());

check('NHÃƒN Má»šI + PREVIEW: index.html dÃ¹ng nhÃ£n ngÆ°á»i dÃ¹ng yÃªu cáº§u vÃ  cÃ³ khá»‘i xem trÆ°á»›c',
  idxHtml.includes('Sá»‘ Ä‘ang Ä‘Æ°a kiá»ƒm') && idxHtml.includes('Ngoáº¡i lá»‡ (váº«n tÃ­nh Ä‘áº¡t)') &&
  idxHtml.includes('Loáº¡i / Há»ng') && idxHtml.includes('Há»§y / Nháº­p má»›i') &&
  idxHtml.includes('id="qcf-preview"'));

state.xuong2BaoTinhRecords = [];
state.qcFinalRecords = [];

// â”€â”€â”€ TEST Cáº¬P NHáº¬T Tá»’N / ÄÆ N Vá»Š NGUá»’N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Äáº¿m tháº» mini theo Ä‘Æ¡n vá»‹ tá»«ng Loáº¡i; há»—n há»£p pháº£i tÃ¡ch rÃµ táº¥m/thanh.
state.qcFinalRecords = [
  { id: 'card-v', kind: 'van', qtyOk: 20, qtyExcept: 5, qtyReject: 0 },
  { id: 'card-t', kind: 'thanh', qtyOk: 12, qtyExcept: 3, qtyReject: 1 }
];
check('CARD Há»–N Há»¢P: hiá»‡n riÃªng 25 táº¥m Ä‘áº¡t vÃ  15 thanh Ä‘áº¡t',
  qcf.qcFinalCardCount() === '2 lÆ°á»£t Â· 25 táº¥m Ä‘áº¡t Â· 15 thanh Ä‘áº¡t');
state.qcFinalRecords = [{ id: 'card-t-only', kind: 'thanh', qtyOk: 8, qtyExcept: 2, qtyReject: 0 }];
check('CARD CHá»ˆ THANH: dÃ¹ng nhÃ£n thanh Ä‘áº¡t',
  qcf.qcFinalCardCount() === '1 lÆ°á»£t Â· 10 thanh Ä‘áº¡t');
state.qcFinalRecords = [{ id: 'card-v-only', kind: 'van', qtyOk: 7, qtyExcept: 1, qtyReject: 0 }];
check('CARD CHá»ˆ VÃN: dÃ¹ng nhÃ£n táº¥m Ä‘áº¡t',
  qcf.qcFinalCardCount() === '1 lÆ°á»£t Â· 8 táº¥m Ä‘áº¡t');

// Cháº·n nháº­p vÆ°á»£t nguá»“n Thanh/VÃ¡n khi Ä‘Ã£ chá»n nguá»“n cÃ³ tá»“n.
state.qcFinalRecords = [];
state.xuong2BaoTinhRecords = [
  { id: 'bt-submit', date: '2026-09-20', kind: 'bao_thanh',
    outSizeKey: '640Ã—14Ã—12', outDims: [640, 14, 12], inQty: 100,
    inSource: 'press' }
];
setVal('qcf-workshop', 'x2');
setVal('qcf-kind', 'thanh');
setVal('qcf-date', '2026-09-23');
qcf.syncQcFinalKindFields();
qcf.onQcFinalListClick({
  target: { closest: sel => sel === '[data-qcf-size]' ? { getAttribute: () => '640Ã—14Ã—12' } : null }
});
setVal('qcf-input-qty', '101');
setVal('qcf-ok', '101'); setVal('qcf-except', '0'); setVal('qcf-reject', '0');
const thanhCountBeforeOverstock = state.qcFinalRecords.length;
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHáº¶N SOURCE THANH: Ä‘áº§u vÃ o 101 vÆ°á»£t tá»“n 100 thÃ¬ khÃ´ng lÆ°u',
  state.qcFinalRecords.length === thanhCountBeforeOverstock);

state.pressRecords = [
  { id: 'p-v-submit', date: '2026-09-20', week: '2026-W38', year: 2026,
    productId: 'sp-v-submit', productName: 'VÃ¡n 1000Ã—2000Ã—10',
    finishedQty: 50, vanTho: [], sticks: [] }
];
setVal('qcf-kind', 'van');
setVal('qcf-date', '2026-09-23');
qcf.syncQcFinalKindFields();
qcf.onQcFinalListClick({
  target: { closest: sel => sel === '[data-qcf-product]' ? { getAttribute: () => 'sp-v-submit' } : null }
});
setVal('qcf-input-qty', '51');
setVal('qcf-ok', '51'); setVal('qcf-except', '0'); setVal('qcf-reject', '0');
const vanCountBeforeOverstock = state.qcFinalRecords.length;
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHáº¶N SOURCE VÃN: Ä‘áº§u vÃ o 51 vÆ°á»£t tá»“n 50 thÃ¬ khÃ´ng lÆ°u',
  state.qcFinalRecords.length === vanCountBeforeOverstock);

// Äá»•i ngÃ y Thanh: lÆ°á»£t má»›i náº¡p láº¡i live remain; lÆ°á»£t sá»­a cá»™ng láº¡i lÆ°á»£ng gá»‘c
// nhÆ°ng khÃ´ng ghi Ä‘Ã¨ Ã´ Äáº§u vÃ o Ä‘ang sá»­a.
state.pressRecords = [];
state.qcFinalRecords = [];
state.xuong2BaoTinhRecords = [
  { id: 'bt-date', date: '2026-09-20', kind: 'bao_thanh',
    outSizeKey: '640Ã—14Ã—12', outDims: [640, 14, 12], inQty: 100,
    inSource: 'press' }
];
setVal('qcf-workshop', 'x2');
setVal('qcf-kind', 'thanh');
setVal('qcf-date', '2026-09-22');
qcf.resetQcFinalForm();
setVal('qcf-date', '2026-09-22');
qcf.syncQcFinalKindFields();
qcf.onQcFinalListClick({
  target: { closest: sel => sel === '[data-qcf-size]' ? { getAttribute: () => '640Ã—14Ã—12' } : null }
});
check('Äá»”I NGÃ€Y THANH â€” Má»šI: náº¡p tá»“n live 100 vÃ o Äáº§u vÃ o',
  document.getElementById('qcf-input-qty').value === '100');
setVal('qcf-date', '2026-09-23');
qcf.qcFinalOnDateChange();
check('Äá»”I NGÃ€Y THANH â€” Má»šI: Ä‘á»•i ngÃ y váº«n náº¡p tá»“n live 100',
  document.getElementById('qcf-input-qty').value === '100');

state.qcFinalRecords = [
  { id: 'edit-thanh-date', date: '2026-09-22', workshop: 'x2', kind: 'thanh',
    inputQty: 30, qtyOk: 25, qtyExcept: 3, qtyReject: 2,
    sizeKey: '640Ã—14Ã—12', sizeDims: [640, 14, 12] },
  { id: 'other-thanh-date', date: '2026-09-22', workshop: 'x2', kind: 'thanh',
    inputQty: 30, qtyOk: 30, qtyExcept: 0, qtyReject: 0,
    sizeKey: '640Ã—14Ã—12', sizeDims: [640, 14, 12] }
];
qcf.editQcFinalRecord('edit-thanh-date');
check('Äá»”I NGÃ€Y THANH â€” Sá»¬A: giá»¯ Ã´ Äáº§u vÃ o gá»‘c 30',
  document.getElementById('qcf-input-qty').value === '30');
setVal('qcf-date', '2026-09-23');
qcf.qcFinalOnDateChange();
check('Äá»”I NGÃ€Y THANH â€” Sá»¬A: tá»“n live 70 cá»™ng lÆ°á»£ng gá»‘c 30, Ã´ gá»‘c khÃ´ng Ä‘á»•i',
  document.getElementById('qcf-input-qty').value === '30' &&
  qcf.updateQcFinalPreview().sourceRemain === 100);

state.xuong2BaoTinhRecords = [];
state.pressRecords = [];
state.qcFinalRecords = [];

// â”€â”€â”€ CHáº¶N THIáº¾U NGUá»’N X2 + GIá»® NGUá»’N KHI Sá»¬A Äá»”I NGÃ€Y VÃN â”€â”€
qcf.resetQcFinalForm();
setVal('qcf-workshop', 'x2');
setVal('qcf-kind', 'van');
setVal('qcf-date', '2026-09-23');
qcf.syncQcFinalKindFields();
setVal('qcf-input-qty', '10');
setVal('qcf-ok', '10');
setVal('qcf-except', '0');
setVal('qcf-reject', '0');
const sourceLessVanCount = state.qcFinalRecords.length;
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHáº¶N SOURCE-LESS X2: Kiá»ƒm VÃ¡n chÆ°a chá»n nguá»“n tá»“n â†’ khÃ´ng lÆ°u',
  state.qcFinalRecords.length === sourceLessVanCount);

qcf.resetQcFinalForm();
setVal('qcf-workshop', 'x2');
setVal('qcf-kind', 'thanh');
setVal('qcf-date', '2026-09-23');
qcf.syncQcFinalKindFields();
setVal('qcf-input-qty', '10');
setVal('qcf-ok', '10');
setVal('qcf-except', '0');
setVal('qcf-reject', '0');
const sourceLessThanhCount = state.qcFinalRecords.length;
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('CHáº¶N SOURCE-LESS X2: Kiá»ƒm Thanh chÆ°a chá»n cá»¡ nguá»“n â†’ khÃ´ng lÆ°u',
  state.qcFinalRecords.length === sourceLessThanhCount);

// Sá»­a Kiá»ƒm VÃ¡n: Ä‘á»•i ngÃ y pháº£i tra láº¡i theo sizeKey gá»‘c, khÃ´ng xem nhÆ° thiáº¿u nguá»“n.
state.pressRecords = [
  { id: 'p-edit-v-size', date: '2026-09-20', week: '2026-W38', year: 2026,
    productId: '', productName: '', finishedQty: 0, vanTho: [
      { vtDim: '1220Ã—2440Ã—9', vtQty: 50 }
    ], sticks: [] }
];
state.qcFinalRecords = [
  { id: 'edit-v-size', date: '2026-09-22', workshop: 'x2', kind: 'van',
    inputQty: 30, qtyOk: 25, qtyExcept: 3, qtyReject: 2,
    sizeKey: '1220Ã—2440Ã—9', sizeDims: [1220, 2440, 9],
    productId: '', productName: 'VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9' }
];
qcf.editQcFinalRecord('edit-v-size');
setVal('qcf-date', '2026-09-23');
qcf.qcFinalOnDateChange();
check('Sá»¬A NGÃ€Y VÃN THEO Cá» : giá»¯ lá»±a chá»n sizeKey gá»‘c + Ä‘áº§u vÃ o gá»‘c 30',
  document.getElementById('qcf-input-qty').value === '30' &&
  document.getElementById('qcf-picker-text').textContent.includes('1220'));
setVal('qcf-ok', '25');
setVal('qcf-except', '3');
setVal('qcf-reject', '2');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('Sá»¬A NGÃ€Y VÃN THEO Cá» : re-resolution tá»“n táº¡i â†’ lÆ°u khÃ´ng bá»‹ coi lÃ  source-less',
  state.qcFinalRecords.length === 1 &&
  state.qcFinalRecords[0].sizeKey === '1220Ã—2440Ã—9' &&
  state.qcFinalRecords[0].inputQty === 30);

// Fallback theo thÃ nh pháº©m khi báº£n ghi VÃ¡n cÅ© khÃ´ng cÃ³ sizeKey.
state.pressRecords = [
  { id: 'p-edit-v-product', date: '2026-09-20', week: '2026-W38', year: 2026,
    productId: 'sp-edit-v', productName: 'VÃ¡n 1000Ã—2000Ã—10',
    finishedQty: 40, vanTho: [], sticks: [] }
];
state.qcFinalRecords = [
  { id: 'edit-v-product', date: '2026-09-22', workshop: 'x2', kind: 'van',
    inputQty: 12, qtyOk: 10, qtyExcept: 1, qtyReject: 1,
    productId: 'sp-edit-v', productName: 'VÃ¡n 1000Ã—2000Ã—10' }
];
qcf.editQcFinalRecord('edit-v-product');
setVal('qcf-date', '2026-09-23');
qcf.qcFinalOnDateChange();
check('Sá»¬A NGÃ€Y VÃN THEO Sáº¢N PHáº¨M: khÃ´i phá»¥c lá»±a chá»n + Ä‘áº§u vÃ o gá»‘c',
  document.getElementById('qcf-input-qty').value === '12' &&
  document.getElementById('qcf-picker-text').textContent === 'VÃ¡n 1000Ã—2000Ã—10');
setVal('qcf-ok', '10');
setVal('qcf-except', '1');
setVal('qcf-reject', '1');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('Sá»¬A NGÃ€Y VÃN THEO Sáº¢N PHáº¨M: re-resolution tá»“n táº¡i â†’ lÆ°u khÃ´ng bá»‹ coi lÃ  source-less',
  state.qcFinalRecords.length === 1 &&
  state.qcFinalRecords[0].productId === 'sp-edit-v' &&
  state.qcFinalRecords[0].inputQty === 12);

// LÆ°á»£t sá»­a bá»‹ xÃ³a khá»i dá»¯ liá»‡u trong lÃºc form váº«n giá»¯ editId: khÃ´ng Ä‘Æ°á»£c lÆ°u thÃ nh lÆ°á»£t má»›i.
qcf.resetQcFinalForm();
state.qcFinalRecords = [
  { id: 'missing-edit', date: '2026-09-22', workshop: 'x2', kind: 'van',
    inputQty: 8, qtyOk: 7, qtyExcept: 1, qtyReject: 0,
    productId: 'sp-missing', productName: 'VÃ¡n 1220Ã—2440Ã—9' }
];
qcf.editQcFinalRecord('missing-edit');
state.qcFinalRecords = [];
setVal('qcf-input-qty', '8');
setVal('qcf-ok', '7');
setVal('qcf-except', '1');
setVal('qcf-reject', '0');
qcf.handleQcFinalSubmit({ preventDefault(){} });
const toastContainer = document.getElementById('toast-container');
const missingToast = toastContainer._children && toastContainer._children.at(-1);
check('Sá»¬A Máº¤T LÆ¯á»¢T: khÃ´ng táº¡o lÆ°á»£t kiá»ƒm trÃ¹ng',
  state.qcFinalRecords.length === 0);
check('Sá»¬A Máº¤T LÆ¯á»¢T: hiá»‡n Ä‘Ãºng toast yÃªu cáº§u báº¥m LÃ m má»›i',
  missingToast && String(missingToast.innerHTML || '').includes('LÆ°á»£t Ä‘ang sá»­a khÃ´ng cÃ²n tá»“n táº¡i. HÃ£y báº¥m LÃ m má»›i...'));

// Legacy VÃ¡n: báº£n ghi cÅ© khÃ´ng cÃ³ sizeKey nhÆ°ng productName cÃ³ 3 kÃ­ch thÆ°á»›c.
// Æ¯u tiÃªn re-resolution tá»« tá»“n VÃ¡n-thÃ´ trÆ°á»›c, rá»“i má»›i tra thÃ nh pháº©m.
state.pressRecords = [
  { id: 'p-edit-v-legacy', date: '2026-09-20', week: '2026-W38', year: 2026,
    productId: '', productName: '', finishedQty: 0, vanTho: [
      { vtDim: '1220Ã—2440Ã—9', vtQty: 18 }
    ], sticks: [] }
];
state.qcFinalRecords = [
  { id: 'edit-v-legacy', date: '2026-09-22', workshop: 'x2', kind: 'van',
    inputQty: 12, qtyOk: 10, qtyExcept: 1, qtyReject: 1,
    productId: '', productName: 'VÃ¡n thÃ´ 1220 Ã— 2440 Ã— 9' }
];
qcf.editQcFinalRecord('edit-v-legacy');
setVal('qcf-date', '2026-09-23');
qcf.qcFinalOnDateChange();
check('LEGACY VÃN KHÃ”NG sizeKey: parse tÃªn, tÃ¬m VÃ¡n-thÃ´ live trÆ°á»›c thÃ nh pháº©m',
  document.getElementById('qcf-input-qty').value === '12' &&
  document.getElementById('qcf-picker-text').textContent.includes('1220'));
setVal('qcf-ok', '10');
setVal('qcf-except', '1');
setVal('qcf-reject', '1');
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('LEGACY VÃN KHÃ”NG sizeKey: lÆ°u láº¡i gáº¯n sizeKey VÃ¡n-thÃ´ vÃ  Ä‘Ãºng Ä‘áº§u vÃ o gá»‘c',
  state.qcFinalRecords.length === 1 &&
  state.qcFinalRecords[0].sizeKey === '1220Ã—2440Ã—9' &&
  state.qcFinalRecords[0].inputQty === 12);

// â”€â”€â”€ XUáº¤T HÃ€NG THEO TÃŠN + LÆ¯U THáº¤T Báº I PHáº¢I KHÃ”I PHá»¤C TRáº NG THÃI â”€â”€
state.pressRecords = [
  { id: 'p-export-name', date: '2026-09-20', week: '2026-W38', year: 2026,
    productId: 'sp-export-name', productName: 'VÃ¡n 1220Ã—2440Ã—9',
    finishedQty: 100, vanTho: [], sticks: [] }
];
state.materialRates = [
  { id: 'sp-export-name', product: '1220x2440x9', unit: 'Táº¥m' }
];
state.qcFinalRecords = [];
state.qcExports = [
  { id: 'export-name', name: '1220 x 2440 x 9', qty: 30,
    exportDate: '2026-09-25', year: 2026, weeks: [39, 40] }
];
check('Tá»’N XUáº¤T THEO TÃŠN: phiáº¿u xuáº¥t name khá»›p tÃªn chuáº©n hoÃ¡ vÃ  materialRates',
  (() => {
    const row = qcf.qcFinalProductStocks('2026-10-01')
      .find(x => x.productId === 'sp-export-name');
    return row && row.exported === 30 && row.remain === 70
      && qcf.qcFinalNormalizeName('VÃ¡n 1220Ã—2440Ã—9') === qcf.qcFinalNormalizeName('VÃ¡n 1220 x 2440 x 9');
  })());
state.qcExports = [];
state.pressRecords = [];
state.materialRates = [];

qcf.resetQcFinalForm();
setVal('qcf-workshop', 'x1');
setVal('qcf-kind', 'van');
setVal('qcf-date', '2026-09-23');
setVal('qcf-input-qty', '25');
setVal('qcf-ok', '20');
setVal('qcf-except', '3');
setVal('qcf-reject', '2');
const setItemOriginal = global.localStorage.setItem;
global.localStorage.setItem = (k, v) => {
  if (k === STORAGE_KEY_QC_FINAL) throw new Error('mock localStorage write failure');
  return setItemOriginal(k, v);
};
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('LÆ¯U Táº O THáº¤T Báº I: khÃ´ng thÃªm lÆ°á»£t kiá»ƒm vÃ  khÃ´ng reset form',
  state.qcFinalRecords.length === 0 &&
  document.getElementById('qcf-input-qty').value === '25' &&
  document.getElementById('qcf-ok').value === '20');
global.localStorage.setItem = setItemOriginal;

const saveFailRecord = {
  id: 'save-fail-edit', date: '2026-09-23', workshop: 'x1', kind: 'van',
  inputQty: 25, qtyOk: 20, qtyExcept: 3, qtyReject: 2,
  productId: '', productName: '', sizeKey: '', sizeDims: [],
  pairKey: qcf.qcFinalPairKeyOf('2026-09-23'),
  workerNames: '', workTime: '', workHours: 0, workHoursHC: 0, workHoursTC: 0
};
state.qcFinalRecords = [saveFailRecord];
qcf.editQcFinalRecord(saveFailRecord.id);
setVal('qcf-ok', '21');
setVal('qcf-except', '3');
setVal('qcf-reject', '1');
global.localStorage.setItem = (k, v) => {
  if (k === STORAGE_KEY_QC_FINAL) throw new Error('mock localStorage write failure');
  return setItemOriginal(k, v);
};
qcf.handleQcFinalSubmit({ preventDefault(){} });
check('LÆ¯U Sá»¬A THáº¤T Báº I: khÃ´i phá»¥c snapshot vÃ  giá»¯ form Ä‘ang sá»­a',
  state.qcFinalRecords.length === 1 &&
  state.qcFinalRecords[0].qtyOk === 20 &&
  state.qcFinalRecords[0].qtyExcept === 3 &&
  state.qcFinalRecords[0].qtyReject === 2 &&
  document.getElementById('qcf-ok').value === '21' &&
  document.getElementById('qcf-edit-banner').style.display === '');
global.localStorage.setItem = setItemOriginal;

state.deletedIds = { qcFinalRecords: { keep: '2026-09-20T00:00:00Z' } };
storeBacking.set(STORAGE_KEY_DELETED_IDS || 'bamboo_tracker_deleted_ids_v1',
  JSON.stringify(state.deletedIds));
global.localStorage.setItem = (k, v) => {
  if (k === STORAGE_KEY_QC_FINAL) throw new Error('mock localStorage write failure');
  return setItemOriginal(k, v);
};
qcf.deleteQcFinalRecord(saveFailRecord.id);
check('XÃ“A THáº¤T Báº I: khÃ´i phá»¥c danh sÃ¡ch vÃ  khÃ´ng Ä‘á»ƒ tombstone má»›i tá»“n táº¡i',
  state.qcFinalRecords.length === 1 &&
  state.qcFinalRecords[0].id === saveFailRecord.id &&
  !!state.deletedIds.qcFinalRecords.keep &&
  !state.deletedIds.qcFinalRecords[saveFailRecord.id] &&
  JSON.parse(storeBacking.get(STORAGE_KEY_DELETED_IDS || 'bamboo_tracker_deleted_ids_v1'))
    .qcFinalRecords.keep &&
  !JSON.parse(storeBacking.get(STORAGE_KEY_DELETED_IDS || 'bamboo_tracker_deleted_ids_v1'))
    .qcFinalRecords[saveFailRecord.id]);
global.localStorage.setItem = setItemOriginal;

// â”€â”€â”€ Tá»”NG Káº¾T â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log(`\n=== qc-final.test.mjs: ${passed} PASS Â· ${failed} FAIL ===`);
if (failed) process.exit(1);

