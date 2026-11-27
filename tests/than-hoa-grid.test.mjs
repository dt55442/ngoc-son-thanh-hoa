// tests/than-hoa-grid.test.mjs â€” Báº¢NG NHáº¬P NHANH THEO PHIáº¾U (17/10/2026)
// Kiá»ƒm tra yÃªu cáº§u cá»‘t lÃµi:
//   â€¢ Má»—i dÃ²ng = 1 THáºº nguá»“n tháº­t, GIá»® NGUYÃŠN NGÃ€Y CHá»ŒN NAN (Ä‘á»ƒ Ä‘á»‘i chiáº¿u Ä‘á»™ tÆ°Æ¡i
//     vÃ  phÃ¡t hiá»‡n bÃ¡o cÃ¡o sai cá»§a cÃ´ng Ä‘oáº¡n Chá»n Nan ThÃ´).
//   â€¢ NgÆ°á»i nháº­p Tá»° CHá»ˆ Äá»ŠNH tháº»: gÃµ sá»‘ vÃ o dÃ²ng nÃ o = láº¥y tháº» Ä‘Ã³; Ã´ trá»‘ng = KHÃ”NG láº¥y.
//   â€¢ KHÃ”NG tá»± chá»n tháº», KHÃ”NG tá»± láº¥y tháº» cÅ© nháº¥t, KHÃ”NG tá»± tÃ¡ch lÃ´.
//   â€¢ LÆ°u váº«n dÃ¹ng Ä‘Ãºng handleAddLotSubmit cÅ© (mÃ£ máº» chung cho cáº£ lÆ°á»£t).
'use strict';
import fs from 'node:fs';

function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ctxStub(),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function ctxStub() {
  return new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
      return () => undefined;
    },
    set() { return true; }
  });
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
global.Chart = class { constructor(c, g) { this.ctx = c; this.config = g; this.data = (g && g.data) || { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
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

// â”€â”€â”€ Dá»¯ liá»‡u máº«u: nhÃ³m 1250Ã—18Ã—7 Â· A gá»“m 3 tháº» KHÃC NGÃ€Y, trong Ä‘Ã³ g-e Ä‘Ã£ dÃ¹ng
// háº¿t (remaining 0) Ä‘á»ƒ kiá»ƒm tra Tá»“n bÃ¡o cÃ¡o/ÄÃ£ dÃ¹ng cá»™ng cáº£ tháº» Ä‘Ã£ dÃ¹ng háº¿t.
// 10/10: g-a 1.000 (Ä‘Ã£ dÃ¹ng 300) Â· 08/10: g-b 800 (chÆ°a dÃ¹ng) Â· 09/10: g-e 400
// (Ä‘Ã£ dÃ¹ng háº¿t). A1: g-c 500.
const cn = (id, date, dims, cls, quantity) => ({
  id, date, dims, cls, quantity,
  baothoId: 'bt-g', sizeKey: dims.join('Ã—'), unitVol: 0.0001575,
  volume: 0.1, supplier: 'NhÃ  Táº¿', materialType: 'Luá»“ng cÃ¢y', createdAt: date + 'T02:00:00.000Z'
});
const seedData = () => {
  state.xuong2ChonNanThoRecords = [
    cn('g-a', '2026-10-10', [1250, 18, 7], 'A', 1000),
    cn('g-b', '2026-10-08', [1250, 18, 7], 'A', 800),
    cn('g-c', '2026-10-10', [1250, 18, 9], 'A1', 500),
    cn('g-e', '2026-10-09', [1250, 18, 7], 'A', 400),
    cn('g-rej', '2026-10-10', [1250, 18, 7], 'reject', 50)
  ];
  state.batches = [
    { id: 'g-used-a', code: '261001-01', stage: 'say1', date: '2026-10-01', week: '2026-W40',
      length: 1250, width: 18, thickness: 7, quantity: 300, volume: 0.047,
      bambooType: 'A', useFor: 'VÃ¡n', location: 'LS1', sourceChonNanId: 'g-a',
      sayCharges: { say1: 1 }, stageHistory: [{ stage: 'say1', date: '2026-10-01' }] },
    { id: 'g-used-e', code: '261002-01', stage: 'say1', date: '2026-10-02', week: '2026-W40',
      length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063,
      bambooType: 'A', useFor: 'VÃ¡n', location: 'LS2', sourceChonNanId: 'g-e',
      sayCharges: { say1: 2 }, stageHistory: [{ stage: 'say1', date: '2026-10-02' }] }
  ];
};
seedData();

const bm = await import('../js/batch-modals.js');
await import('../js/main.js');
const x2 = await import('../js/xuong2.js');

// â”€â”€â”€ A. Gá»˜P NHÃ“M THEO Cá»  + PHÃ‚N LOáº I â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
bm.openAddLotModal();
check('Máº¶C Äá»ŠNH: Sáº¥y 1 má»Ÿ á»Ÿ cháº¿ Ä‘á»™ Báº¢NG NHáº¬P NHANH (khá»‘i báº£ng hiá»‡n)',
  bm.alEntryModeOf() === 'grid' && document.getElementById('al-grid-wrap').hidden === false);

let rows = bm.alGridRows();
let gA = rows.find(r => r.clsRaw === 'A');
let gA1 = rows.find(r => r.clsRaw === 'A1');
check('Gá»˜P NHÃ“M: chá»‰ cÃ²n 2 dÃ²ng â€” 1250Ã—18Ã—7Â·A (2.200 / 700 / 1.500) + 1250Ã—18Ã—9Â·A1 (500 / 0 / 500)',
  rows.length === 2 && !!gA && !!gA1 &&
  gA.total === 2200 && gA.used === 700 && gA.remaining === 1500 &&
  gA1.total === 500 && gA1.used === 0 && gA1.remaining === 500);
check('Gá»˜P NHÃ“M: nhÃ³m A giá»¯ Ä‘á»§ 3 tháº» (gá»“m tháº» g-e ÄÃƒ DÃ™NG Háº¾T remaining 0)',
  gA.cards.length === 3 && gA.cards.some(c => c.id === 'g-e' && c.remaining === 0) &&
  gA.cards.some(c => c.id === 'g-b' && c.remaining === 800) &&
  gA.cards.some(c => c.id === 'g-a' && c.remaining === 700));
check('THáºº ÄÃƒ DÃ™NG Háº¾T: váº«n cá»™ng 400 vÃ o Tá»“n bÃ¡o cÃ¡o + ÄÃ£ dÃ¹ng nhÆ°ng KHÃ”NG láº¥y Ä‘Æ°á»£c',
  gA.cards.find(c => c.id === 'g-e').total === 400 &&
  gA.cards.find(c => c.id === 'g-e').used === 400 && gA.remaining === 1500);

const buckets = bm.alGridDateBuckets();
check('CHIP NGÃ€Y: 10/10 (2 tháº» cÃ²n 1.200) Â· 08/10 (1 tháº» cÃ²n 800) â€” ngÃ y Ä‘Ã£ dÃ¹ng háº¿t khÃ´ng cÃ³ chip',
  buckets.length === 2 &&
  buckets[0].date === '2026-10-10' && buckets[0].count === 2 && buckets[0].thanh === 1200 &&
  buckets[1].date === '2026-10-08' && buckets[1].count === 1 && buckets[1].thanh === 800 &&
  !buckets.some(b => b.date === '2026-10-09'));

// â”€â”€â”€ B. CHá»ŒN NHIá»€U NGÃ€Y â†’ Tá»”NG NHÃ“M TÄ‚NG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const clickDate = (v) => bm.alOnGridDateClick({
  target: { closest: (q) => (q === '[data-al-grid-date]' ? { getAttribute: () => v } : null) }
});
clickDate('2026-10-10');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
check('Lá»ŒC 1 NGÃ€Y 10/10: nhÃ³m A chá»‰ cÃ²n g-a â†’ Tá»“n 1.000 Â· ÄÃ£ dÃ¹ng 300 Â· CÃ²n 700',
  rows.length === 2 && gA.total === 1000 && gA.used === 300 && gA.remaining === 700);
clickDate('2026-10-08');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
check('CHá»ŒN THÃŠM 08/10: nhÃ³m A TÄ‚NG LÃŠN 1.800 Â· ÄÃ£ dÃ¹ng 300 Â· CÃ²n 1.500 (cá»™ng dá»“n Ä‘Ãºng)',
  rows.length === 2 && gA.total === 1800 && gA.used === 300 && gA.remaining === 1500 &&
  bm.alGridQueryOf().dates.length === 2);
check('TÃ“M Táº®T: hiá»‡n "Äang chá»n 2 ngÃ y ... Â· 2 nhÃ³m"',
  document.getElementById('al-grid-dates-sum').textContent.includes('Äang chá»n 2 ngÃ y') &&
  document.getElementById('al-grid-dates-sum').textContent.includes('2 nhÃ³m'));
clickDate('');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
check('Táº¤T Cáº¢ NGÃ€Y: nhÃ³m A cá»™ng cáº£ 09/10 Ä‘Ã£ dÃ¹ng háº¿t â†’ 2.200 / 700 / 1.500',
  gA.total === 2200 && gA.used === 700 && gA.remaining === 1500);


// â”€â”€â”€ C. Tá»° CHIA THEO THáºº CÅ¨ NHáº¤T TRÆ¯á»šC (FEFO) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
clickDate('');
clickDate('2026-10-08');
clickDate('2026-10-10');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
check('FEFO 500: tháº» CÅ¨ NHáº¤T g-b (08/10) nháº­n Ä‘á»§ 500 â€” g-a (10/10) chÆ°a láº¥y',
  bm.alGridSetGroupQty(gA.key, 500) === 500 &&
  bm.alPickedIds().length === 1 && bm.alPickedIds()[0] === 'g-b' &&
  bm.alCardQtyOf('g-b') === 500 && bm.alCardQtyOf('g-a') === 0);
bm.alGridSetGroupQty(gA.key, 1000);
check('FEFO 1.000: g-b háº¿t 800 â†’ trÃ n sang g-a 200 (Ä‘Ãºng thá»© tá»± cÅ© nháº¥t)',
  bm.alCardQtyOf('g-b') === 800 && bm.alCardQtyOf('g-a') === 200 &&
  bm.alPickedIds().length === 2 && bm.alPickedIds().includes('g-b') && bm.alPickedIds().includes('g-a'));
bm.alGridSetGroupQty(gA.key, 9999);
check('CHáº¶N VÆ¯á»¢T Tá»’N: nháº­p 9.999 â†’ Ä‘iá»u vá» 1.500 (toÃ n bá»™ CÃ²n láº¡i cá»§a nhÃ³m)',
  bm.alCardQtyOf('g-b') === 800 && bm.alCardQtyOf('g-a') === 700 &&
  bm.alPickedIds().length === 2);
bm.alGridSetGroupQty(gA.key, 0);
check('Ã” TRá»NG = KHÃ”NG Láº¤Y: xÃ³a SL â†’ bá» chá»n cáº£ nhÃ³m',
  bm.alPickedIds().length === 0);

clickDate('');
rows = bm.alGridRows(); gA = rows.find(r => r.clsRaw === 'A');
bm.alGridSetGroupQty(gA.key, 500);
check('THáºº ÄÃƒ DÃ™NG Háº¾T KHÃ”NG ÄÆ¯á»¢C CHIA: g-e (remaining 0) váº«n 0, g-b nháº­n 500',
  bm.alCardQtyOf('g-e') === 0 && bm.alCardQtyOf('g-b') === 500 &&
  !bm.alPickedIds().includes('g-e'));
gA1 = bm.alGridRows().find(r => r.clsRaw === 'A1');
bm.alGridSetGroupQty(gA1.key, 500);
check('NHIá»€U NHÃ“M CÃ™NG LÃšC: A (g-b 500) + A1 (g-c 500) â€” tá»•ng 1.000 thanh',
  bm.alCardQtyOf('g-c') === 500 && bm.alCardQtyOf('g-b') === 500 &&
  bm.alPickedIds().length === 2);
bm.alClearPicks();

// â”€â”€â”€ D. Äá»”I NGÃ€Y â†’ CHIA Láº I + ÄIá»€U Sá» VÆ¯á»¢T Tá»’N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
clickDate('');
clickDate('2026-10-08');
clickDate('2026-10-10');
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
bm.alGridSetGroupQty(gA.key, 1000);
check('TRÆ¯á»šC KHI Äá»”I NGÃ€Y: g-b 800 + g-a 200', bm.alCardQtyOf('g-b') === 800 && bm.alCardQtyOf('g-a') === 200);
clickDate('2026-10-08');   // bá» 08/10 â†’ chá»‰ cÃ²n 10/10 (g-a cÃ²n 700)
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
check('Bá»Ž NGÃ€Y 08/10: nhÃ³m cÃ²n 700 â†’ SL tá»± Ä‘iá»u 1.000 â†’ 700, chuyá»ƒn háº¿t sang g-a',
  gA.remaining === 700 && bm.alCardQtyOf('g-a') === 700 &&
  bm.alCardQtyOf('g-b') === 0 && !bm.alPickedIds().includes('g-b'));
clickDate('2026-10-08');   // chá»n láº¡i 08/10 â†’ tá»“n 1.500, chia láº¡i cÅ© nháº¥t trÆ°á»›c
check('CHá»ŒN Láº I 08/10: SL giá»¯ 700 nhÆ°ng CHIA Láº I â†’ g-b (08/10) 700, g-a 0',
  bm.alCardQtyOf('g-b') === 700 && bm.alCardQtyOf('g-a') === 0);
bm.alClearPicks();

// â”€â”€â”€ E. Báº¢NG 6 Cá»˜T + â–¸ CHI TIáº¾T + Cáº¢NH BÃO THáºº CÅ¨ + HELPER â”€â”€â”€â”€â”€â”€
clickDate('');   // táº¥t cáº£ ngÃ y
document.getElementById('al-date').value = '2026-10-20';
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
bm.alGridSetGroupQty(gA.key, 1000);   // g-b 800 (08/10) + g-a 200 (10/10)
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
check('Cáº¢NH BÃO TUá»”I NAN: g-b 08/10 â†’ 20/10 = 12 ngÃ y (> 3)',
  bm.alGridStaleOf(gA.cards.find(c => c.id === 'g-b')) === 12 &&
  bm.alGridStaleOf(gA.cards.find(c => c.id === 'g-a')) === 10);
bm.renderAlGrid();
const gridHtml = document.getElementById('al-grid-body').innerHTML;
check('Báº¢NG Má»šI: 6 cá»™t â€” cÃ³ size/cls/total/used/remain/qty, KHÃ”NG cÃ³ NgÃ y chá»n nan/Thá»ƒ tÃ­ch/nguá»“n',
  gridHtml.includes('data-col="size"') && gridHtml.includes('data-col="cls"') &&
  gridHtml.includes('data-col="total"') && gridHtml.includes('data-col="used"') &&
  gridHtml.includes('data-col="remain"') && gridHtml.includes('data-col="qty"') &&
  !gridHtml.includes('data-col="date"') && !gridHtml.includes('data-col="vol"') &&
  !gridHtml.includes('al-grid-src'));
check('Cáº¢NH BÃO trÃªn dÃ²ng: cÃ³ chip âš  tháº» cÅ©',
  gridHtml.includes('al-grid-warn') && gridHtml.includes('âš '));
check('Dáº¢I CHIP NGANG: giá»¯ vá»‹ trÃ­ cuá»™n khi váº½ láº¡i',
  (() => {
    const el = document.getElementById('al-grid-dates');
    el.scrollLeft = 120; bm.renderAlGrid();
    const kept = el.scrollLeft === 120; el.scrollLeft = 0; return kept;
  })());

const expClick = bm.alOnGridClick({
  target: { closest: (q) => (q === '[data-al-grid-expand]' ? { getAttribute: () => bm.alGridRows().find(r => r.clsRaw === 'A').key } : null) }
});
const afterExp = document.getElementById('al-grid-body').innerHTML;
check('â–¸ CHI TIáº¾T: má»Ÿ khá»‘i chia â€” hiá»‡n ngÃ y 08/10, 09/10, 10/10 + nguá»“n + sá»‘ Láº¥y tá»«ng tháº»',
  expClick === true && afterExp.includes('al-grid-split-row') &&
  afterExp.includes('08/10/26') && afterExp.includes('09/10/26') && afterExp.includes('10/10/26') &&
  afterExp.includes('NhÃ  Táº¿') && afterExp.includes('Láº¥y'));
bm.alOnGridClick({
  target: { closest: (q) => (q === '[data-al-grid-expand]' ? { getAttribute: () => bm.alGridRows().find(r => r.clsRaw === 'A').key } : null) }
});
check('â–¸ CHI TIáº¾T: báº¥m láº§n ná»¯a â†’ Ä‘Ã³ng (báº£ng gá»n láº¡i)',
  !document.getElementById('al-grid-body').innerHTML.includes('al-grid-split-row'));

const helpHidden0 = document.getElementById('al-grid-help').hidden;
const helpOpen = bm.alGridToggleHelp();
const helpShown = document.getElementById('al-grid-help').hidden === false;
bm.alGridCloseHelp();
check('HELPER "?": máº·c Ä‘á»‹nh áº©n â†’ má»Ÿ Ä‘Æ°á»£c â†’ Ä‘Ã³ng láº¡i', helpHidden0 === true && helpOpen === true && helpShown &&
  document.getElementById('al-grid-help').hidden === true);


// â”€â”€â”€ F. LÆ¯U: chia FEFO â†’ táº¡o Ä‘Ãºng cÃ¡c lÃ´, cÃ¹ng 1 mÃ£ máº» â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
bm.openAddLotModal();
document.getElementById('al-date').value = '2026-10-15';
bm.alSetLocation('LS12');
document.getElementById('al-use-for').value = 'VÃ¡n';
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
gA1 = bm.alGridRows().find(r => r.clsRaw === 'A1');
bm.alGridSetGroupQty(gA.key, 1000);    // g-b 800 + g-a 200
bm.alGridSetGroupQty(gA1.key, 500);    // g-c 500
const beforeCount = state.batches.length;
bm.handleAddLotSubmit({ preventDefault() {} });
const created = state.batches.filter(b => b.date === '2026-10-15');
const lotA = created.find(b => b.bambooType === 'A');
const lotC = created.find(b => b.bambooType === 'A1');
const srcA = (lotA && Array.isArray(lotA.sources)) ? lotA.sources : [];
const srcC = (lotC && Array.isArray(lotC.sources)) ? lotC.sources : [];
const srcOf = (arr, id) => (arr.find(s => s.chonNanId === id) || {}).qty;
check('LÆ¯U: 1 NHÃ“M = 1 LÃ” â€” nhÃ³m A 1000 (gá»™p g-b 800 + g-a 200) vÃ  nhÃ³m A1 500',
  state.batches.length === beforeCount + 2 && created.length === 2 &&
  !!lotA && lotA.quantity === 1000 && srcA.length === 2 &&
  srcOf(srcA, 'g-b') === 800 && srcOf(srcA, 'g-a') === 200 &&
  !!lotC && lotC.quantity === 500 && srcC.length === 1 && srcOf(srcC, 'g-c') === 500);
check('LÆ¯U: KHÃ”NG tÃ¡ch lÃ´ theo tá»«ng tháº» â€” khÃ´ng cÃ³ lÃ´ 800/200/500 riÃªng, khÃ´ng táº¡o lÃ´ cho g-e',
  !created.some(b => b.quantity === 800 || b.quantity === 200) &&
  !created.some(b => b.sourceChonNanId === 'g-b' || b.sourceChonNanId === 'g-a' ||
    b.sourceChonNanId === 'g-c' || b.sourceChonNanId === 'g-e') &&
  !created.some(b => b.sourceChonNanId === '' && (!Array.isArray(b.sources) || !b.sources.length)));
check('LÆ¯U: lÃ´ gá»™p cÃ³ ÄÃšNG kÃ­ch thÆ°á»›c Â· phÃ¢n loáº¡i Â· vá»‹ trÃ­ Â· DÃ¹ng cho',
  lotA.length === 1250 && lotA.width === 18 && lotA.thickness === 7 && lotA.bambooType === 'A' &&
  lotC.length === 1250 && lotC.width === 18 && lotC.thickness === 9 && lotC.bambooType === 'A1' &&
  lotA.location === 'LS12' && lotC.location === 'LS12' &&
  lotA.useFor === 'VÃ¡n' && lotC.useFor === 'VÃ¡n');
check('LÆ¯U: 1 lÆ°á»£t LÆ°u = 1 Láº¦N THANH HÃ“A â€” cáº£ 2 lÃ´ dÃ¹ng CHUNG mÃ£ máº» sayCharges.say1',
  lotA.sayCharges && lotC.sayCharges &&
  lotA.sayCharges.say1 === lotC.sayCharges.say1 && Number(lotA.sayCharges.say1) > 0);
check('LÆ¯U: nguá»“n Ä‘Æ°á»£c TRá»ª ÄÃšNG â€” g-b cÃ²n 0, g-a cÃ²n 500 (300 cÅ© + 200 má»›i), g-c cÃ²n 0',
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'g-b')) === 0 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'g-a')) === 500 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'g-c')) === 0);
const useB = x2.nanSay1UseOf('g-b');
const useA = x2.nanSay1UseOf('g-a');
const useC = x2.nanSay1UseOf('g-c');
check('CHá»ŒN NAN: chip Ä‘Ã£ chá»n thanh hÃ³a Ä‘á»c ÄÃšNG pháº§n láº¥y tá»« tá»«ng tháº» (g-b 800 Â· g-a 500 Â· g-c 500)',
  useB.used === 800 && useB.count === 1 && useA.used === 500 && useA.count === 2 &&
  useC.used === 500 && useC.count === 1);

// â”€â”€â”€ F2. ÄÃšNG VÃ Dá»¤ NGÆ¯á»œI DÃ™NG: 1250Ã—18Ã—10 Â· 1512 láº¥y 12/10 + 13/10 â†’ 1 LÃ” 1512 â”€â”€
state.xuong2ChonNanThoRecords = [
  cn('h-12', '2026-10-12', [1250, 18, 10], 'A', 1008),
  cn('h-13', '2026-10-13', [1250, 18, 10], 'A', 504)
];
state.batches = [];
bm.openAddLotModal();
document.getElementById('al-date').value = '2026-10-15';
bm.alSetLocation('LS4');
document.getElementById('al-use-for').value = 'VÃ¡n';
clickDate('');                 // bá» chá»n háº¿t ngÃ y
clickDate('2026-10-12');
clickDate('2026-10-13');
const gH = bm.alGridRows()[0];
bm.alGridSetGroupQty(gH.key, 1512);
bm.handleAddLotSubmit({ preventDefault() {} });
const lotH = state.batches.find(b => b.date === '2026-10-15');
const srcH = (lotH && Array.isArray(lotH.sources)) ? lotH.sources : [];
check('VÃ Dá»¤ 1512: táº¡o ÄÃšNG 1 LÃ” 1512 (KHÃ”NG pháº£i lÃ´ 1.008 + lÃ´ 504)',
  state.batches.length === 1 && !!lotH && lotH.quantity === 1512 && srcH.length === 2 &&
  lotH.sourceChonNanId === '' && lotH.bambooType === 'A');
check('VÃ Dá»¤ 1512: nguá»“n chia CÅ¨ NHáº¤T TRÆ¯á»šC â€” 12/10 1.008 + 13/10 504; cáº£ 2 tháº» háº¿t tá»“n',
  srcH[0].chonNanId === 'h-12' && srcH[0].qty === 1008 &&
  srcH[1].chonNanId === 'h-13' && srcH[1].qty === 504 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'h-12')) === 0 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'h-13')) === 0);

// â”€â”€â”€ F3. NHIá»€U LÃ” CÃ™NG Cá»  + PHÃ‚N LOáº I â€” nÃºt + thÃªm dÃ²ng, má»—i dÃ²ng = 1 lÃ´ â”€â”€
state.xuong2ChonNanThoRecords = [
  cn('m-1', '2026-10-12', [1250, 18, 7], 'A', 3000),
  cn('m-2', '2026-10-13', [1250, 18, 7], 'A', 3000)
];
state.batches = [];
bm.openAddLotModal();
document.getElementById('al-date').value = '2026-10-16';
bm.alSetLocation('LS7');
document.getElementById('al-use-for').value = 'VÃ¡n';
clickDate('');                 // bá» chá»n háº¿t ngÃ y
clickDate('2026-10-12');
clickDate('2026-10-13');
const gM = bm.alGridRows()[0];
bm.alGridSetGroupQty(gM.key, 1400);          // lÃ´ 1
const addBtn = { getAttribute: (q) => q === 'data-al-grid-add-line' ? gM.key : (q === 'data-line-idx' ? '0' : null) };
const clickedAdd = bm.alOnGridClick({ target: { closest: (q) => q === '[data-al-grid-add-line]' ? addBtn : null } });
check('NÃšT +: click handler thÃªm 1 dÃ²ng lÃ´ má»›i',
  clickedAdd === true && bm.alGridAllGroupList().find(g => g.key === gM.key).lines.length === 2);
bm.alGridSetLineQty(gM.key, 1, 2268);
bm.alGridAddGroupLine(gM.key, 1);              // thÃªm lÃ´ 3
bm.alGridSetLineQty(gM.key, 2, 2268);
const gM2 = bm.alGridAllGroupList().find(g => g.key === gM.key);
check('NHIá»€U LÃ”: 1 nhÃ³m cÃ³ 3 dÃ²ng â€” 1.400 + 2.268 + 2.268 = 5.936 thanh',
  gM2.lines.length === 3 && gM2.lotCount === 3 && gM2.qty === 5936 &&
  gM2.lines.map(l => l.qty).join(',') === '1400,2268,2268');
check('NHIá»€U LÃ”: nguá»“n chia LIÃŠN TIáº¾P cÅ© nháº¥t trÆ°á»›c â€” lÃ´ 1 m-1 1.400; lÃ´ 2 m-1 1.600 + m-2 668; lÃ´ 3 m-2 2.268',
  gM2.lines[0].sources.length === 1 && gM2.lines[0].sources[0].id === 'm-1' && gM2.lines[0].sources[0].alloc === 1400 &&
  gM2.lines[1].sources.length === 2 &&
  gM2.lines[1].sources[0].id === 'm-1' && gM2.lines[1].sources[0].alloc === 1600 &&
  gM2.lines[1].sources[1].id === 'm-2' && gM2.lines[1].sources[1].alloc === 668 &&
  gM2.lines[2].sources.length === 1 && gM2.lines[2].sources[0].id === 'm-2' && gM2.lines[2].sources[0].alloc === 2268);
check('NHIá»€U LÃ”: alCardQty váº«n lÃ  Tá»”NG nhÃ³m â€” m-1 3.000 Â· m-2 2.936',
  bm.alCardQtyOf('m-1') === 3000 && bm.alCardQtyOf('m-2') === 2936);
check('NÃšT +: cháº·n vÆ°á»£t CÃ²n láº¡i cá»§a NHÃ“M sau khi trá»« cÃ¡c dÃ²ng khÃ¡c (lÃ´ 2 tá»‘i Ä‘a 2.332)',
  bm.alGridSetLineQty(gM.key, 1, 9999) === 2332 &&
  bm.alGridSetLineQty(gM.key, 1, 2268) === 2268);
check('NÃšT Háº¿t cá»§a Tá»ªNG DÃ’NG: lÃ´ 3 láº¥y Ä‘Ãºng pháº§n cÃ²n láº¡i 2.332 (khÃ´ng láº¥y háº¿t cáº£ nhÃ³m)',
  bm.alGridFillLine(gM.key, 2) === 2332 && bm.alGridSetLineQty(gM.key, 2, 2268) === 2268);
bm.alGridRemoveGroupLine(gM.key, 2);
check('NÃšT XÃ³a cá»§a Tá»ªNG DÃ’NG: bá» lÃ´ 3 â†’ nhÃ³m cÃ²n 2 dÃ²ng',
  bm.alGridAllGroupList().find(g => g.key === gM.key).lines.length === 2);
bm.alGridAddGroupLine(gM.key, 1);
bm.alGridSetLineQty(gM.key, 2, 2268);
bm.renderAlGrid();
const gridHtml2 = document.getElementById('al-grid-body').innerHTML;
check('GIAO DIá»†N: 3 Ã´ SL lÃ´ + 3 nÃºt + + chip "3 lÃ´"',
  (gridHtml2.match(/data-al-grid-line-qty=/g) || []).length === 3 &&
  (gridHtml2.match(/data-al-grid-add-line=/g) || []).length === 3 &&
  gridHtml2.includes('al-grid-lots') && gridHtml2.includes('3 lÃ´'));
const beforeM = state.batches.length;
bm.handleAddLotSubmit({ preventDefault() {} });
const lotsM = state.batches.filter(b => b.date === '2026-10-16');
check('LÆ¯U: 3 DÃ’NG â†’ 3 LÃ” riÃªng (1.400 Â· 2.268 Â· 2.268), khÃ´ng gá»™p thÃ nh 1 lÃ´',
  state.batches.length === beforeM + 3 && lotsM.length === 3 &&
  lotsM.map(b => b.quantity).sort((a, b) => a - b).join(',') === '1400,2268,2268');
check('LÆ¯U: má»—i lÃ´ cÃ³ sources[] riÃªng, tá»•ng sources = Ä‘Ãºng quantity; dÃ¹ng chung mÃ£ máº»',
  lotsM.every(b => b.sourceChonNanId === '' && Array.isArray(b.sources) &&
    b.sources.reduce((s, x) => s + x.qty, 0) === b.quantity) &&
  new Set(lotsM.map(b => b.sayCharges && b.sayCharges.say1)).size === 1);
check('LÆ¯U: trá»« tá»“n Ä‘Ãºng â€” m-1 háº¿t 3.000, m-2 cÃ²n 64 (Ä‘Ã£ dÃ¹ng 2.936)',
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'm-1')) === 0 &&
  bm.nanCardRemainingOf(state.xuong2ChonNanThoRecords.find(r => r.id === 'm-2')) === 64);
const useM1 = x2.nanSay1UseOf('m-1');
const useM2 = x2.nanSay1UseOf('m-2');
check('CHá»ŒN NAN: chip Ä‘áº¿m Ä‘Ãºng pháº§n láº¥y tá»« tá»«ng tháº» khi cÃ³ nhiá»u lÃ´ (m-1 3.000 Â· m-2 2.936)',
  useM1.used === 3000 && useM1.count === 2 && useM2.used === 2936 && useM2.count === 2);

// â”€â”€â”€ G. CÃ”NG Táº®C + GIá»šI Háº N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
seedData();   // tráº£ dá»¯ liá»‡u vá» ban Ä‘áº§u (pháº§n F Ä‘Ã£ táº¡o thÃªm lÃ´, lÃ m Ä‘á»•i tá»“n)
bm.openAddLotModal();
bm.setAlEntryMode('cards');
bm.alTogglePick('g-a');
check('THáºº â†’ Báº¢NG: tháº» chá»n tay g-a (700) Ä‘Æ°á»£c giá»¯ nguyÃªn, khÃ´ng tá»± Ä‘á»•i sang tháº» khÃ¡c',
  bm.alCardQtyOf('g-a') === 700);
bm.setAlEntryMode('grid');
gA = bm.alGridRows().find(r => r.clsRaw === 'A');
check('THáºº â†’ Báº¢NG: nhÃ³m A hiá»‡n SL 700 + chia Ä‘Ãºng g-a (khÃ´ng tá»± FEFO khi chá»‰ chuyá»ƒn cháº¿ Ä‘á»™)',
  gA.qty === 700 && gA.split.length === 1 && gA.split[0].id === 'g-a' && gA.split[0].alloc === 700);
bm.alGridSetGroupQty(gA.key, 500);
check('Sá»¬A NHÃ“M SAU ÄÃ“: má»›i Ã¡p dá»¥ng FEFO â†’ g-b (08/10) 500, g-a vá» 0',
  bm.alCardQtyOf('g-b') === 500 && bm.alCardQtyOf('g-a') === 0);
bm.setAlEntryMode('cards');
check('CÃ”NG Táº®C: sang Tháº» â†’ áº©n báº£ng', document.getElementById('al-grid-wrap').hidden === true);
bm.setAlEntryMode('grid');
check('CÃ”NG Táº®C: vá» Báº£ng â†’ hiá»‡n báº£ng', document.getElementById('al-grid-wrap').hidden === false);

document.getElementById('al-stage').value = 'say2';
check('GIá»šI Háº N: Sáº¥y 2 luÃ´n dÃ¹ng THáºº', bm.alEntryModeOf() === 'cards');
document.getElementById('al-stage').value = 'say1';
document.getElementById('al-rework').checked = true;
check('GIá»šI Háº N: Thanh HÃ³a Láº¡i luÃ´n dÃ¹ng THáºº', bm.alEntryModeOf() === 'cards');
document.getElementById('al-rework').checked = false;

// â”€â”€â”€ H. Cáº¤U TRÃšC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evHtml = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swHtml = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const pkg = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const bmSrc = fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8');

const gridSlice = idxHtml.slice(idxHtml.indexOf('class="al-grid-table"'), idxHtml.indexOf('id="al-grid-body"'));
check('Cáº¤U TRÃšC (index.html): báº£ng Ä‘Ãºng 6 cá»™t â€” áº¨N NgÃ y chá»n nan + Thá»ƒ tÃ­ch + nguá»“n/ghi chÃº',
  (gridSlice.match(/<th[ >]/g) || []).length === 6 &&
  idxHtml.includes('<th>PhÃ¢n loáº¡i</th>') &&
  !idxHtml.includes('>NgÃ y chá»n nan</th>') && !idxHtml.includes('>Thá»ƒ tÃ­ch</th>') &&
  !idxHtml.includes('al-grid-note') && !idxHtml.includes('al-grid-src'));
check('Cáº¤U TRÃšC (index.html): nÃºt ? + khá»‘i helper + nÃºt Ä‘Ã³ng',
  idxHtml.includes('id="al-grid-help-btn"') && idxHtml.includes('id="al-grid-help"') &&
  idxHtml.includes('id="al-grid-help-close"') && idxHtml.includes('CÅ¨ NHáº¤T trÆ°á»›c'));
check('Cáº¤U TRÃšC (events.js): wire ?/Ä‘Ã³ng + Ä‘á»•i NgÃ y váº½ láº¡i cáº£nh bÃ¡o tháº» cÅ©',
  evHtml.includes("safeOn('al-grid-help-btn', 'click'") &&
  evHtml.includes("safeOn('al-grid-help-close', 'click'") &&
  evHtml.includes('renderAlChargeOptions(); renderAlGrid();'));
check('Cáº¤U TRÃšC (styles.css): helper + â–¸ split + cáº£nh bÃ¡o; KHÃ”NG cÃ²n note/nguá»“n dÆ°á»›i cá»¡',
  cssHtml.includes('.al-grid-help {') && cssHtml.includes('.al-grid-help-btn {') &&
  cssHtml.includes('.al-grid-split-item {') && cssHtml.includes('.al-grid-warn {') &&
  !cssHtml.includes('.al-grid-note {') && !cssHtml.includes('.al-grid-src {'));
check('Cáº¤U TRÃšC (js): gá»™p nhÃ³m + chia FEFO + cáº£nh bÃ¡o tuá»•i nan + sort má»›i',
  bmSrc.includes('function alGridAllGroupList') && bmSrc.includes('function alGridAllocCards') &&
  bmSrc.includes('function alGridSetGroupQty') && bmSrc.includes('AL_GRID_STALE_DAYS') &&
  bmSrc.includes("alGridSortMode = 'size'"));
const setLineStart = bmSrc.indexOf('function alGridSetLineQty(');
const setLineEnd = bmSrc.indexOf('function alGridFillLine(', setLineStart);
const setLineBlock = setLineStart >= 0 && setLineEnd > setLineStart
  ? bmSrc.slice(setLineStart, setLineEnd)
  : '';
const sourceListStart = bmSrc.indexOf('function renderAlSourceList()');
const sourceListEnd = bmSrc.indexOf('// Chá»n / bá» chá»n 1 nguá»“n', sourceListStart);
const sourceListBlock = sourceListStart >= 0 && sourceListEnd > sourceListStart
  ? bmSrc.slice(sourceListStart, sourceListEnd)
  : '';
check('HIá»†U NÄ‚NG: bá»™ chá»n nguá»“n vÃ  nháº­p SL dÃ¹ng báº£n Ä‘á»“ ÄÃ£ DÃ¹ng má»™t lÆ°á»£t thay vÃ¬ quÃ©t lÃ´ cho tá»«ng tháº»',
  bmSrc.includes('function nanCardUsageMap()') &&
  bmSrc.includes('nanCardUsedOf(id, null, usedByNan)') &&
  sourceListBlock.includes('const usedByNan = stage === \'say1\' ? nanCardUsageMap() : null;') &&
  sourceListBlock.includes('alCandidatesOf(stage, alloc, usedByNan)') &&
  setLineBlock.includes('const usedByNan = nanCardUsageMap();') &&
  setLineBlock.includes('alGridApplyGroupLines(key, inputEl, usedByNan)'));
check('Cáº¤U TRÃšC (sw.js): cache Ä‘Ã£ tÄƒng lÃªn v486', swHtml.includes('nha-may-ngoc-son-v486'));
check('Cáº¤U TRÃšC (package.json): bá»™ kiá»ƒm thá»­ nÃ y náº±m trong chuá»—i npm test',
  pkg.includes('tests/than-hoa-grid.test.mjs'));

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

