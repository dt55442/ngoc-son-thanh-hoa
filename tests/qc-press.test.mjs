// tests/qc-press.test.mjs â€” THáºº "NHáº¬T KÃ THEO DÃ•I Ã‰P VÃN" (tab QC â€” js/qc-press.js).
// Bao phá»§: tÃªn/sá»‘ lÆ°á»£ng Æ¯U TIÃŠN Ã´ VÃ¡n ThÃ´ â†’ fallback Ã´ ThÃ nh Pháº©m Â· Ä‘á»•i keo/phá»¥
// gia KG â†’ GAM Â· tá»· lá»‡ trong tháº» chuáº©n hÃ³a theo 100g keo Â· Ä‘á»™ phá»§ = (keo + phá»¥ gia) Ã· SL Â·
// verdict PASS/Fail 1-1 (ghi Ä‘Ã¨) + lÆ°u localStorage Â· lá»c PASS/Fail/chÆ°a kiá»ƒm Â·
// tÃ¬m nhanh Â· render tháº» ngÃ y (nhÃ£n PASS NGHIÃŠNG + 2 nÃºt âœ…/âŒ) Â· mini card Â·
// cáº¥u trÃºc (index.html Â· qc.js Â· events.js Â· state/storage/cloud/history/main Â·
// sw.js v226 Â· styles.css Â· package.json).
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng qc-final.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    parentElement: null,
    appendChild(c) { if (c && typeof c === 'object') c.parentElement = el; return c; },
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
  update(){} resize(){} destroy(){} render(){} getDatasetMeta(){ return { data: [] }; }
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

// â”€â”€â”€ IMPORT MODULES (sau khi stub xong) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { state, STORAGE_KEY_QC_PRESS } = await import('../js/state.js');
const qcp = await import('../js/qc-press.js');
const fsMod = await import('node:fs');

// â”€â”€â”€ Dá»® LIá»†U GIáº¢ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true, fullname: 'Quáº£n Trá»‹' };
state.pressRecords = [
  // p1: chá»‰ Ä‘iá»n ThÃ nh Pháº©m (vÃ¡n thÃ´ qty=0 â†’ fallback ThÃ nh pháº©m)
  { id: 'p1', date: '2026-09-22', productId: 'sp1', productName: 'VÃ¡n 1220x2440x9', fpDim: '1220x2440x9',
    finishedQty: 300, vanTho: [{ vtDim: '1220x2440x9', vtQty: 0 }], sticks: [],
    forceH: 18, forceV: 22, tempC: 120, pressMin: 25, glue: 2.5, additive: 0.25, glueName: 'Keo UF', additiveName: 'Bá»™t mÃ¬' },
  // p2: CÃ“ vÃ¡n thÃ´ > 0 â†’ PHáº¢I Æ°u tiÃªn vÃ¡n thÃ´ (ká»ƒ cáº£ khi cÃ³ thÃ nh pháº©m)
  { id: 'p2', date: '2026-09-24', productId: 'sp1', productName: 'VÃ¡n 1220x2440x9', fpDim: '1220x2440x9',
    finishedQty: 200, vanTho: [{ vtDim: '1200x600x12', vtQty: 150 }], sticks: [],
    forceH: 20, forceV: 24, tempC: 125, pressMin: 30, glue: 0.1, additive: 0.012, glueName: 'Keo UF', additiveName: 'Bá»™t mÃ¬' },
  // p3: khÃ´ng vÃ¡n thÃ´ â†’ ThÃ nh pháº©m (thiáº¿u thÃ´ng sá»‘/keo â†’ hiá»‡n "â€”")
  { id: 'p3', date: '2026-09-30', productId: 'sp2', productName: 'Bullig 1200x300x50', fpDim: '',
    finishedQty: 120, vanTho: [], sticks: [], forceH: 0, forceV: 0, tempC: 0, pressMin: 0, glue: 0, additive: 0 },
  // p4: cÃ¹ng ngÃ y p3 (gom tháº» ngÃ y) + chá»‰ cÃ³ vÃ¡n thÃ´
  { id: 'p4', date: '2026-09-30', productId: 'sp2', productName: '', fpDim: '',
    finishedQty: 0, vanTho: [{ vtDim: '1220x2440x9', vtQty: 80 }], sticks: [],
    forceH: 16, forceV: 20, tempC: 118, pressMin: 22, glue: 0.1, additive: 0.012, glueName: '', additiveName: '' }
];
state.qcPressLogs = [];
qcp.loadQcPressLogs();

// â•â•â• A. TÃŠN + Sá» LÆ¯á»¢NG Æ¯U TIÃŠN VÃN THÃ” â•â•â•
console.log('--- A. TÃŠN + Sá» LÆ¯á»¢NG (Æ°u tiÃªn VÃ¡n ThÃ´) ---');
check('TÃŠN: p2 CÃ“ vÃ¡n thÃ´ > 0 â†’ láº¥y vÃ¡n thÃ´ "1200x600x12" (150), KHÃ”NG láº¥y thÃ nh pháº©m',
  (() => { const d = qcp.qcPressNameQtyOf(state.pressRecords[1]); return d.source === 'vanTho' && d.name === '1200x600x12' && d.qty === 150; })());
check('TÃŠN: p1 vÃ¡n thÃ´ qty=0 â†’ fallback ThÃ nh Pháº©m (300)',
  (() => { const d = qcp.qcPressNameQtyOf(state.pressRecords[0]); return d.source === 'thanhPham' && d.qty === 300; })());
check('TÃŠN: p3 khÃ´ng vÃ¡n thÃ´ â†’ ThÃ nh Pháº©m "Bullig 1200x300x50" (120)',
  (() => { const d = qcp.qcPressNameQtyOf(state.pressRecords[2]); return d.source === 'thanhPham' && d.name === 'Bullig 1200x300x50'; })());
check('TÃŠN: p4 chá»‰ cÃ³ vÃ¡n thÃ´ â†’ vÃ¡n thÃ´ "1220x2440x9" (80)',
  (() => { const d = qcp.qcPressNameQtyOf(state.pressRecords[3]); return d.source === 'vanTho' && d.qty === 80; })());

// â•â•â• B. ÄÆ N Vá»Š: KG â†’ GAM Â· Tá»¶ Lá»† Â· Äá»˜ PHá»¦ â•â•â•
console.log('--- B. GAM Â· Tá»¶ Lá»† PHA TRá»˜N Â· Äá»˜ PHá»¦ ---');
const d2 = qcp.qcPressDisplay(state.pressRecords[1]);
check('GAM: keo 0.1kg â†’ 100g Â· phá»¥ gia 0.012kg â†’ 12g', d2.glueG === 100 && d2.additiveG === 12);
check('Tá»¶ Lá»† BÃO CÃO: giá»¯ dáº¡ng "100g - 12g"', d2.mixText === '100g - 12g');
check('Tá»¶ Lá»† THáºº QC: 26.000g keo + 3.120g phá»¥ gia quy vá» "100g-12g"',
  qcp.qcPressDisplay({ glue: 26, additive: 3.12 }).cardMixText === '100g-12g');
check('Tá»¶ Lá»† THáºº QC: sá»‘ phá»¥ gia Ä‘Æ°á»£c chuáº©n hÃ³a theo 100g keo',
  qcp.qcPressDisplay({ glue: 26, additive: 3.25 }).cardMixText === '100g-12,5g');
check('Tá»¶ Lá»† THáºº QC: bÃ¡o cÃ¡o váº«n giá»¯ tá»•ng lÆ°á»£ng thá»±c táº¿',
  qcp.qcPressDisplay({ glue: 26, additive: 3.12 }).mixText === '26.000g - 3.120g');
check('Tá»¶ Lá»† THáºº QC: khÃ´ng cÃ³ keo thÃ¬ khÃ´ng thá»ƒ chuáº©n hÃ³a',
  qcp.qcPressDisplay({ glue: 0, additive: 0.012 }).cardMixText === 'â€”');
check('Äá»˜ PHá»¦: (100+12)g Ã· 150 thanh vÃ¡n thÃ´', approx(d2.coverage, 112 / 150));
check('Äá»˜ PHá»¦ p4: (100+12) Ã· 80 = 1,4 g/táº¥m', approx(qcp.qcPressDisplay(state.pressRecords[3]).coverage, 1.4));
const d3 = qcp.qcPressDisplay(state.pressRecords[2]);
check('THIáº¾U keo/phá»¥ gia â†’ tá»· lá»‡ tháº» "â€”" Â· Ä‘á»™ phá»§ null',
  d3.cardMixText === 'â€”' && d3.coverage === null);
check('THÃ”NG Sá» KT: p1 Ä‘á»c Ä‘á»§ lá»±c Ã©p ngang/Ä‘á»©ng Â· nhiá»‡t Ä‘á»™ Â· thá»i gian',
  (() => { const d = qcp.qcPressDisplay(state.pressRecords[0]); return d.forceH === 18 && d.forceV === 22 && d.tempC === 120 && d.pressMin === 25; })());
// Lá»°C Ã‰P Dáº NG KHOáº¢NG "8-10" MPa (19/10/2026): lÆ°u forceH=8 + forceHMax=10.
// forceH/forceV váº«n lÃ  Sá» (tÆ°Æ¡ng thÃ­ch sá»‘ liá»‡u cÅ©) â€” thÃªm forceHText/forceVText Ä‘á»ƒ hiá»ƒn thá»‹.
const dRange = qcp.qcPressDisplay({
  id: 'p-range', date: '2026-09-25', forceH: 8, forceHMax: 10, forceV: 20, forceVMax: 24,
  tempC: 120, pressMin: 25, glue: 0, additive: 0,
  vanTho: [{ vtDim: '1200x600x12', vtQty: 10 }]
});
check('Lá»°C Ã‰P KHOáº¢NG: forceH 8 + forceHMax 10 â†’ hiá»‡n "8-10", forceH váº«n lÃ  sá»‘ 8',
  dRange.forceHText === '8-10' && dRange.forceH === 8);
check('Lá»°C Ã‰P KHOáº¢NG: cáº­n Ä‘á»©ng 20 + 24 â†’ hiá»‡n "20-24"',
  dRange.forceVText === '20-24' && dRange.forceV === 20);
check('Lá»°C Ã‰P 1 Sá»: p1 (18 Â· 22) â†’ text "18" / "22" (khÃ´ng Ä‘á»•i sá»‘ liá»‡u cÅ©)',
  (() => { const d = qcp.qcPressDisplay(state.pressRecords[0]); return d.forceHText === '18' && d.forceVText === '22'; })());
check('BÃO CÃO EXCEL: cá»™t lá»±c Ã©p Æ°u tiÃªn forceHText/forceVText (xuáº¥t "8-10" thay vÃ¬ rá»—ng)',
  (() => {
    const rcSrc = fsMod.readFileSync(new URL('../js/report-center.js', import.meta.url), 'utf8');
    return rcSrc.includes('d.forceHText || d.forceH') && rcSrc.includes('d.forceVText || d.forceV');
  })());

// â•â•â• C. VERDICT 1-1 (ghi Ä‘Ã¨) + LÆ¯U â•â•â•
console.log('--- C. VERDICT PASS/FAIL 1-1 + LÆ¯U ---');
check('CHáº¤M PASS: táº¡o 1 log má»›i + ghi localStorage', (() => {
  const ok = qcp.setQcPressVerdict('p2', 'pass');
  return ok && state.qcPressLogs.length === 1 && state.qcPressLogs[0].verdict === 'pass' &&
    JSON.parse(storeBacking.get(STORAGE_KEY_QC_PRESS) || '[]').length === 1;
})());
check('MINI CARD: "1/4 Ä‘Ã£ kiá»ƒm"', qcp.qcPressCardCount() === '1/4 Ä‘Ã£ kiá»ƒm');
check('CHáº¤M Láº I: váº«n 1 log (1 lÆ°á»£t 1 káº¿t quáº£) â†’ ghi Ä‘Ã¨ thÃ nh fail', (() => {
  qcp.setQcPressVerdict('p2', 'fail');
  return state.qcPressLogs.length === 1 && qcp.qcPressVerdictOf('p2') === 'fail';
})());
check('LÆ¯á»¢T Ã‰P KHÃ”NG Tá»’N Táº I â†’ cháº·n + khÃ´ng táº¡o log', (() => {
  const n = state.qcPressLogs.length;
  return qcp.setQcPressVerdict('p999', 'pass') === false && state.qcPressLogs.length === n;
})());
check('CHáº¤M PASS p1 â†’ 2 log, p3 chÆ°a kiá»ƒm', (() => {
  qcp.setQcPressVerdict('p1', 'pass');
  return state.qcPressLogs.length === 2 && qcp.qcPressVerdictOf('p1') === 'pass' && qcp.qcPressVerdictOf('p3') === '';
})());
check('NGÆ¯á»œI KIá»‚M snapshot vÃ o log (checkedBy = fullname + checkedAt)',
  state.qcPressLogs.every(l => l.checkedBy === 'Quáº£n Trá»‹' && !!l.checkedAt));
check('LÆ¯U: localStorage khá»›p state.qcPressLogs',
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_PRESS) || '[]').length === state.qcPressLogs.length);

// â•â•â• D. Lá»ŒC + TÃŒM NHANH â•â•â•
console.log('--- D. Lá»ŒC PASS/FAIL/CHÆ¯A KIá»‚M + TÃŒM ---');
check('Lá»ŒC máº·c Ä‘á»‹nh: Ä‘á»§ 4 lÆ°á»£t Ã©p', qcp.qcPressRowsFiltered().length === 4);
check('Lá»ŒC "unchecked": chá»‰ p3 + p4', (() => {
  qcp.setQcPressFilter('unchecked');
  const ids = qcp.qcPressRowsFiltered().map(r => r.id).sort().join(',');
  qcp.setQcPressFilter('all');
  return ids === 'p3,p4';
})());
check('Lá»ŒC "pass": chá»‰ p1', (() => {
  qcp.setQcPressFilter('pass');
  const ids = qcp.qcPressRowsFiltered().map(r => r.id).join(',');
  qcp.setQcPressFilter('all');
  return ids === 'p1';
})());
check('TÃŒM "bullig" â†’ chá»‰ 1 dÃ²ng (bá» hoa/thÆ°á»ng + dáº¥u)', (() => {
  qcp.setQcPressSearchQ('BULLIG');
  const n = qcp.qcPressRowsFiltered().length;
  qcp.setQcPressSearchQ('');
  return n === 1;
})());

// â•â•â• E. RENDER THáºº NGÃ€Y + NHÃƒN PASS â•â•â•
console.log('--- E. RENDER: tháº» ngÃ y Â· nhÃ£n PASS nghiÃªng Â· nÃºt âœ…/âŒ ---');
qcp.renderQcPressCard();
const statsHtml = document.getElementById('qcp-stats').innerHTML;
check('THá»NG KÃŠ: LÆ°á»£t Ã©p Â· ÄÃ£ kiá»ƒm Â· PASS Â· Fail Â· ChÆ°a kiá»ƒm',
  statsHtml.includes('LÆ°á»£t Ã©p') && statsHtml.includes('ÄÃ£ kiá»ƒm') && statsHtml.includes('PASS') &&
  statsHtml.includes('Fail') && statsHtml.includes('ChÆ°a kiá»ƒm'));
check('Äáº¾M: chip Ä‘áº§u báº£ng "4/4 lÆ°á»£t Ã©p"', document.getElementById('qcp-day-count').textContent === '4/4 lÆ°á»£t Ã©p');
const dayHtml = document.getElementById('qcp-day-cards').innerHTML;
check('THáºº NGÃ€Y: gom theo ngÃ y + Ä‘áº¿m PASS/Fail trong ngÃ y',
  dayHtml.includes('x2-day-card') && dayHtml.includes('PASS: <strong>1</strong>') && dayHtml.includes('Fail: <strong>1</strong>'));
check('Báº¢NG: hiá»‡n tá»· lá»‡ chuáº©n hÃ³a "100g-12g" + cá»™t Äá»™ phá»§ "g/táº¥m"',
  dayHtml.includes('100g-12g') && dayHtml.includes('g/táº¥m'));
check('Báº¢NG: Ä‘á»§ tiÃªu Ä‘á» (Lá»±c Ã©p ngang/Ä‘á»©ng Ä‘Æ¡n vá»‹ MPa Â· Nhiá»‡t Ä‘á»™ Â· Thá»i gian Ã©p Â· QC kiá»ƒm)',
  dayHtml.includes('Lá»±c Ã©p ngang (MPa)') && dayHtml.includes('Lá»±c Ã©p Ä‘á»©ng (MPa)') && dayHtml.includes('Nhiá»‡t Ä‘á»™') &&
  dayHtml.includes('Thá»i gian Ã©p') && dayHtml.includes('QC kiá»ƒm'));
check('NHÃƒN: PASS nghiÃªng (.qcp-stamp-pass) trÃªn dÃ²ng Ä‘Ã£ cháº¥m',
  dayHtml.includes('qcp-stamp-pass') && dayHtml.includes('>PASS</span>'));
check('NHÃƒN: Fail + 2 nÃºt âœ…/âŒ (data-qcp-verdict) bá»c data-perm="qc"',
  dayHtml.includes('qcp-stamp-fail') && dayHtml.includes('data-qcp-verdict="pass"') &&
  dayHtml.includes('data-qcp-verdict="fail"') && dayHtml.includes('data-perm="qc"'));
check('CHÆ¯A KIá»‚M: dÃ²ng p3/p4 hiá»‡n "ChÆ°a kiá»ƒm"',
  dayHtml.includes('qcp-stamp-none') && dayHtml.includes('ChÆ°a kiá»ƒm'));
check('CHIP NGUá»’N: "VÃ¡n thÃ´" (Æ°u tiÃªn) + "TP" (fallback ThÃ nh pháº©m)',
  dayHtml.includes('qcp-src-tag') && dayHtml.includes('qcp-src-fp'));
check('Rá»–NG: xÃ³a háº¿t lÆ°á»£t Ã©p â†’ hÆ°á»›ng dáº«n nháº­p á»Ÿ Ã‰p VÃ¡n', (() => {
  const keep = state.pressRecords.slice();
  state.pressRecords = [];
  qcp.renderQcPressTable();
  const empty = document.getElementById('qcp-day-cards').innerHTML.includes('ChÆ°a cÃ³ lÆ°á»£t Ã©p nÃ o');
  state.pressRecords = keep;
  qcp.renderQcPressTable();
  return empty;
})());
check('á»¦Y QUYá»€N: click nÃºt âœ…/âŒ trong báº£ng â†’ onQcPressTableClick tráº£ vá» true', (() => {
  const ev = { target: { closest: (sel) => sel === '[data-qcp-verdict]'
    ? { getAttribute: (a) => a === 'data-qcp-id' ? 'p3' : 'pass' } : null } };
  return qcp.onQcPressTableClick(ev) === true && qcp.qcPressVerdictOf('p3') === 'pass';
})());

// â•â•â• F. Cáº¤U TRÃšC CÃC FILE â•â•â•
console.log('--- F. Cáº¤U TRÃšC (index Â· qc Â· events Â· 6 chá»— ná»‘i Â· sw Â· css Â· package) ---');
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
const pkgJson = fsMod.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
check('index.html: launcher qc-press-card + tháº» (qcp-stats Â· qcp-day-cards Â· qcp-search Â· qcp-filter)',
  idxHtml.includes('data-qc-card="qc-press-card"') && idxHtml.includes('id="qc-press-card"') &&
  idxHtml.includes('id="qcp-stats"') && idxHtml.includes('id="qcp-day-cards"') &&
  idxHtml.includes('id="qcp-search"') && idxHtml.includes('id="qcp-filter"') &&
  idxHtml.includes('id="qc-mini-count-press"'));
check('qc.js: import qc-press + QC_CARD_DEFS cÃ³ qc-press-card + render trong renderQcView',
  qcJs.includes("from './qc-press.js'") && qcJs.includes("'qc-press-card':") && qcJs.includes('renderQcPressCard();'));
check('events.js: wire Ã´ tÃ¬m + phá»…u + á»§y quyá»n nÃºt PASS/Fail',
  evJs.includes("safeOn('qcp-search', 'input'") && evJs.includes("safeOn('qcp-filter', 'change'") &&
  evJs.includes('onQcPressTableClick'));
check('state.js: key bamboo_tracker_qc_press_v1 + state.qcPressLogs + export',
  stJs.includes('bamboo_tracker_qc_press_v1') && stJs.includes('qcPressLogs: []') &&
  stJs.includes('STORAGE_KEY_QC_PRESS,'));
check('storage.js: restoreQcPressLogs (gá»™p file/backup) + snapshot 2 Ä‘Æ°á»ng + export',
  stoJs.includes('function restoreQcPressLogs') && stoJs.includes('restoreQcPressLogs(loaded.qcPressLogs)') &&
  stoJs.includes('restoreQcPressLogs(imported.qcPressLogs)') && stoJs.includes('qcPressLogs: state.qcPressLogs') &&
  stoJs.includes('restoreQcPressLogs,'));
check('cloud.js: snapshot + cloudCore + gá»™p khi nháº­n + persistAllLocal + applyFireSnapshot',
  clJs.includes('qcPressLogs: state.qcPressLogs') && clJs.includes('qcPressLogs: obj.qcPressLogs') &&
  clJs.includes('state.qcPressLogs = m(') && clJs.includes('STORAGE_KEY_QC_PRESS') &&
  clJs.includes("state.qcPressLogs = clean('qcPressLogs'"));
check('history.js: miá»n qcPressLogs thuá»™c tab qc',
  hiJs.includes('qcPressLogs:') && hiJs.includes("label: 'Nháº­t kÃ½ Ã©p vÃ¡n (QC kiá»ƒm)'"));
check('main.js: loadQcPressLogs lÃºc boot', mnJs.includes('loadQcPressLogs'));
check('sw.js: CACHE_NAME v486 + js/qc-press.js vÃ o APP_SHELL',
  /nha-may-ngoc-son-v486/.test(swJs) && swJs.includes("'./js/qc-press.js'"));
check('styles.css: launcher há»“ng + stamp PASS NGHIÃŠNG (font-style: italic) + nÃºt âœ…/âŒ',
  cssHtml.includes('qc-press-card') && cssHtml.includes('.qcp-stamp-pass') &&
  cssHtml.includes('font-style: italic') && cssHtml.includes('.qcp-check-pass') &&
  cssHtml.includes('.qcp-check-fail'));
check('package.json: cÃ³ trong chuá»—i npm test', pkgJson.includes('tests/qc-press.test.mjs'));

console.log(`\nKáº¾T QUáº¢: ${passed} pass, ${failed} fail`);
if (failed > 0) process.exit(1);

