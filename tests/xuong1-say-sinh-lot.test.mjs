// tests/xuong1-say-sinh-lot.test.mjs â€” MÃƒ LÃ” Â· CHU Ká»² Â· QC Â· NHáº®C LÃ” CÅ¨
import fs from 'node:fs';

function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false, scrollIntoView(){}, focus(){}, click(){},
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function makeSelect(id) {
  const el = makeEl(id);
  let html = '';
  let options = [];
  el.multiple = id === 'x1-say-sinh-source';
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return html; },
    set(v) {
      html = String(v == null ? '' : v);
      const selected = new Set(options.filter(o => o.selected).map(o => o.value));
      options = [...html.matchAll(/<option[^>]*value="([^"]*)"/g)].map(m => ({
        value: m[1], selected: selected.has(m[1])
      }));
      if (!el.multiple && !options.some(o => o.selected) && options.length) options[0].selected = true;
    }
  });
  Object.defineProperty(el, 'options', { get() { return options; } });
  Object.defineProperty(el, 'selectedOptions', { get() { return options.filter(o => o.selected); } });
  Object.defineProperty(el, 'value', {
    get() { return (options.find(o => o.selected) || {}).value || ''; },
    set(value) {
      options.forEach(o => { o.selected = String(o.value) === String(value); });
    }
  });
  if (id === 'x1-say-sinh-qc-status') {
    el.innerHTML = '<option value="pending">Chá» QC</option><option value="pass">Äáº¡t</option><option value="fail">KhÃ´ng Ä‘áº¡t</option>';
  }
  return el;
}
const SELECT_IDS = new Set(['x1-say-sinh-source', 'x1-say-sinh-repeat-lot', 'x1-say-sinh-qc-status', 'x1-boc-source']);
const els = new Map();
function elOf(id) { if (!els.has(id)) els.set(id, SELECT_IDS.has(id) ? makeSelect(id) : makeEl(id)); return els.get(id); }
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { return elOf(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
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
global.Chart = class { constructor(c, cfg){ this.ctx=c; this.config=cfg; this.data=(cfg&&cfg.data)||{labels:[],datasets:[]}; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}
function selectValues(id, values) {
  const sel = document.getElementById(id);
  const selected = new Set(values.map(String));
  sel.options.forEach(o => { o.selected = selected.has(String(o.value)); });
}
function setAllocation(id, qty) {
  document.getElementById(`x1-say-sinh-allocation-${id}`).value = String(qty);
}
const { state } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
const x2 = await import('../js/xuong2.js');

const pad = n => String(n).padStart(2, '0');
function isoAgo(n) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const rec = (id, date, extra = {}) => Object.assign({
  id, date, qty: 100, srcType: 'Váº§u', srcSupplier: 'Táº¿', createdAt: date + 'T02:00:00.000Z'
}, extra);
state.hrAssignments = [];
state.xuong1BocRecords = [];
state.xuong1CatOngRecords = [];
state.x1CatOngEditId = null;
state.x1SaySinhEditId = null;
state.xuong1SaySinhRecords = [];

console.log('--- A. MÃƒ LÃ”: tiá»n tá»‘ + ngÃ y + sá»‘ thá»© tá»± 3 chá»¯ sá»‘ ---');
check('A1: Váº§u â†’ V Â· Ná»©a â†’ N Â· loáº¡i khÃ¡c láº¥y chá»¯ Ä‘áº§u Â· rá»—ng â†’ X',
  x2.x1SsPrefixOf('Váº§u cÃ¢y tÆ°Æ¡i') === 'V' && x2.x1SsPrefixOf('Ná»¨A khÃ´') === 'N' &&
  x2.x1SsPrefixOf('Luá»“ng cÃ¢y') === 'L' && x2.x1SsPrefixOf('') === 'X');
check('A2: mÃ£ lÃ´ Ä‘áº§u thÃ¡ng = V + yymmdd + 001', x2.x1SsMakeCode('2026-10-19', 'Váº§u cÃ¢y') === 'V261019001');
state.xuong1SaySinhRecords = [
  rec('a1', '2026-10-01', { code: 'V261001001' }),
  rec('a2', '2026-10-19', { code: 'V261019002' })
];
check('A3: sá»‘ thá»© tá»± ná»‘i tiáº¿p trong THÃNG (V lÃ´ 3)', x2.x1SsMakeCode('2026-10-19', 'Váº§u') === 'V261019003');
check('A4: N cÃ³ dÃ£y RIÃŠNG (N lÃ´ 1) vÃ  nÄƒm má»›i reset vá» 001',
  x2.x1SsMakeCode('2026-10-19', 'Ná»©a') === 'N261019001' &&
  x2.x1SsMakeCode('2026-11-02', 'Váº§u') === 'V261102003');
state.xuong1SaySinhRecords = [];
const sameDayV1 = x2.x1SsMakeCode('2026-11-01', 'Váº§u');
state.xuong1SaySinhRecords.push(rec('same-day-v1', '2026-11-01', { code: sameDayV1 }));
const sameDayV2 = x2.x1SsMakeCode('2026-11-01', 'Váº§u');
const sameDayN1 = x2.x1SsMakeCode('2026-11-01', 'Ná»©a');
check('A5: cÃ¹ng ngÃ y, cÃ¹ng loáº¡i tÄƒng sá»‘; loáº¡i nguyÃªn liá»‡u khÃ¡c dÃ¹ng dÃ£y riÃªng',
  sameDayV1 === 'V261101001' && sameDayV2 === 'V261101002' &&
  sameDayN1 === 'N261101001');

console.log('--- B. MIGRATE lÃ´ cÅ© + khÃ´ng Ä‘á»•i mÃ£ khi sá»­a/xoÃ¡ ---');
state.xuong1SaySinhRecords = [
  rec('old2', '2026-09-12', { qty: 50 }),
  rec('old1', '2026-09-10', { qty: 60 }),
  rec('old3', '2026-09-12', { qty: 70, createdAt: '2026-09-12T05:00:00.000Z' }),
  rec('n1', '2026-09-11', { qty: 40, srcType: 'Ná»©a' })
];
state.xuong1SaySinhRecords.forEach(r => { delete r.code; });
const migrated = x2.ensureX1SaySinhCodes(false);
const codeOf = id => (state.xuong1SaySinhRecords.find(r => r.id === id) || {}).code;
check('B1: lÃ´ cÅ© Ä‘Æ°á»£c cáº¥p mÃ£ theo THá»¨ Tá»° thá»i gian (old1 â†’ old2 â†’ old3)',
  migrated && codeOf('old1') === 'V260910001' && codeOf('old2') === 'V260912002' && codeOf('old3') === 'V260912003');
check('B2: N cÃ³ dÃ£y riÃªng (n1 = N260911001)', codeOf('n1') === 'N260911001');
const snapshot = state.xuong1SaySinhRecords.map(r => r.code).join(',');
x2.ensureX1SaySinhCodes(false);
check('B3: cháº¡y láº¡i KHÃ”NG Ä‘á»•i mÃ£ (idempotent)', state.xuong1SaySinhRecords.map(r => r.code).join(',') === snapshot);
state.xuong1SaySinhRecords.push(rec('dup', '2026-09-15', { code: 'V260910001' }));
x2.ensureX1SaySinhCodes(false);
check('B4: mÃ£ TRÃ™NG Ä‘Æ°á»£c cáº¥p láº¡i (khÃ´ng cÃ²n 2 lÃ´ cÃ¹ng mÃ£)',
  codeOf('dup') !== 'V260910001' && state.xuong1SaySinhRecords.filter(r => r.code === 'V260910001').length === 1);
// Sá»¬A lÃ´: Ä‘á»•i chu ká»³/Ä‘Ã¡nh giÃ¡ QC nhÆ°ng mÃ£ giá»¯ nguyÃªn
state.materialRecords = [{ id: 'mat-v', type: 'Váº§u tÆ°Æ¡i', supplier: 'Táº¿', location: 'xuong-1', weight: 1000, date: '2026-09-01', createdAt: '2026-09-01T02:00:00.000Z' }];
state.xuong1SaySinhRecords = [rec('edit-me', '2026-09-20', { materialId: 'mat-v', code: 'V260920007', qty: 100, sulfurQty: 1 })];
x2.fillX1SaySinhOptions();
selectValues('x1-say-sinh-source', ['mat-v']);
setAllocation('mat-v', 90);
document.getElementById('x1-say-sinh-sulfur-qty').value = '2';
document.getElementById('x1-say-sinh-note').value = '';
x2.setX1SaySinhQcStatus('edit-me', 'pass');
x2.editX1SaySinh('edit-me');
document.getElementById('x1-say-sinh-date').value = '2026-09-25';
setAllocation('mat-v', 90);
document.getElementById('x1-say-sinh-sulfur-qty').value = '2';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
const edited = state.xuong1SaySinhRecords.find(r => r.id === 'edit-me');
check('B5: sá»­a phÃ¢n bá»•/chu ká»³ vÃ  QC, mÃ£ lÃ´ giá»¯ nguyÃªn',
  edited.code === 'V260920007' && edited.date === '2026-09-25' &&
  edited.sourceAllocations[0].qty === 90 && edited.cycles[0].sulfurQty === 2 && edited.qcStatus === 'pass');
// XOÃ lÃ´ giá»¯a: mÃ£ cÃ¡c lÃ´ khÃ¡c khÃ´ng Ä‘á»•i
state.xuong1SaySinhRecords = [
  rec('k1', '2026-09-01', { code: 'V260901001' }),
  rec('k2', '2026-09-02', { code: 'V260902002' }),
  rec('k3', '2026-09-03', { code: 'V260903003' })
];
x2.deleteX1SaySinh('k2');
check('B6: XOÃ lÃ´ khÃ´ng Ä‘Ã¡nh láº¡i sá»‘ (k3 váº«n V260903003)',
  (state.xuong1SaySinhRecords.find(r => r.id === 'k3') || {}).code === 'V260903003');

console.log('--- C. TUá»”I LÃ” + Æ¯U TIÃŠN LÃ” CÅ¨ NHáº¤T ---');
state.xuong1BocRecords = [];
state.xuong1SaySinhRecords = [
  rec('today', isoAgo(0), { qty: 100, code: 'V000000001' }),
  rec('d5', isoAgo(5), { qty: 100, code: 'V000000002', cycles: [{ date: isoAgo(5), sulfurQty: 1 }, { date: isoAgo(4), sulfurQty: 2 }] }),
  rec('d2', isoAgo(4), { qty: 100, code: 'V000000003' })
];
check('C1: hÃ´m nay = 0 ngÃ y Â· lÃ´ 5 ngÃ y trÆ°á»›c = 5 ngÃ y',
  x2.x1SsDaysOf(state.xuong1SaySinhRecords[0]) === 0 &&
  x2.x1SsDaysOf(state.xuong1SaySinhRecords[1]) === 5);
check('C2: lÃ´ cÅ© thiáº¿u Ä‘Ã¡nh giÃ¡ QC Ä‘Æ°á»£c xáº¿p Chá» QC', x2.x1SsQcStatusOf(state.xuong1SaySinhRecords[2]) === 'pending');
check('C3: sá»‘ láº§n sáº¥y vÃ  lÆ°á»£ng lÆ°u huá»³nh cá»™ng dá»“n theo chu ká»³',
  x2.x1SsCyclesOf(state.xuong1SaySinhRecords[1]).length === 2 &&
  x2.x1SaySinhDisplay(state.xuong1SaySinhRecords[1]).sulfurQty === 3);
state.xuong1BocRecords.push({ id: 'b-full', saySinhId: 'd5', date: isoAgo(1), qty: 100 });
check('C4: lÃ´ Ä‘Ã£ Bá»‘c háº¿t Ä‘Æ°á»£c bá» khá»i danh sÃ¡ch nháº¯c tá»“n', !x2.x1SsOldLots().some(r => r.id === 'd5'));
state.xuong1BocRecords = [];
check('C5: danh sÃ¡ch nháº¯c xáº¿p lÃ´ cÅ© nháº¥t trÆ°á»›c; tá»•ng sá»‘ chu ká»³ Ä‘Æ°á»£c Ä‘áº¿m',
  x2.x1SsOldLots().map(r => r.id).join(',') === 'd5,d2,today' && x2.x1SsTotalCycleCount() === 4);

console.log('--- D. NHIá»€U PHIáº¾U + CHU Ká»² Láº¶P + QC ---');
state.xuong1BocRecords = [];
state.xuong1SaySinhRecords = [];
state.xuong1CatOngRecords = [];
state.materialRecords = [
  { id: 'mat-v', type: 'Váº§u tÆ°Æ¡i', supplier: 'Táº¿', location: 'xuong-1', weight: 1000, date: '2026-10-01', createdAt: '2026-10-01T02:00:00.000Z' },
  { id: 'mat-n', type: 'Ná»©a khÃ´', supplier: 'LÃ½', location: 'xuong-1', weight: 500, date: '2026-10-02', createdAt: '2026-10-02T02:00:00.000Z' }
];
x2.fillX1SaySinhOptions();
selectValues('x1-say-sinh-source', ['mat-v', 'mat-n']);
x2.x1SaySinhRenderAllocations();
setAllocation('mat-v', 100);
setAllocation('mat-n', 200);
document.getElementById('x1-say-sinh-date').value = '2026-10-19';
document.getElementById('x1-say-sinh-sulfur-qty').value = '3.5';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
const created = state.xuong1SaySinhRecords[0];
check('D1: má»™t lÃ´ liÃªn káº¿t nhiá»u phiáº¿u vÃ  giá»¯ phÃ¢n bá»• khá»‘i lÆ°á»£ng chÃ­nh xÃ¡c',
  !!created && created.code === 'V261019001' && created.qty === 300 &&
  created.sourceAllocations.length === 2 &&
  created.sourceAllocations.find(a => a.sourceId === 'mat-v').qty === 100 &&
  created.sourceAllocations.find(a => a.sourceId === 'mat-n').qty === 200);
check('D2: chu ká»³ Ä‘áº§u lÆ°u lÆ°á»£ng lÆ°u huá»³nh vÃ  tráº¡ng thÃ¡i QC Chá» QC',
  created.cycles.length === 1 && created.cycles[0].sulfurQty === 3.5 && created.qcStatus === 'pending');
check('D3: sá»‘ lÆ°á»£ng cÃ²n láº¡i Ä‘Æ°á»£c trá»« chÃ­nh xÃ¡c á»Ÿ tá»«ng phiáº¿u',
  x2.x1SaySinhDirectRemainingOf(state.materialRecords[0], null) === 900 &&
  x2.x1SaySinhDirectRemainingOf(state.materialRecords[1], null) === 300);
check('D3b: lá»‹ch sá»­ vÃ  display thá»ƒ hiá»‡n khá»‘i lÆ°á»£ng phÃ¢n bá»• cá»§a tá»«ng phiáº¿u',
  x2.x1SaySinhDisplay(created).sourceSummary.includes('100 kg') &&
  x2.x1SaySinhDisplay(created).sourceSummary.includes('200 kg'));
document.getElementById('x1-say-sinh-repeat-lot').value = created.id;
x2.x1SaySinhSyncLinked(true);
document.getElementById('x1-say-sinh-date').value = '2026-10-20';
document.getElementById('x1-say-sinh-sulfur-qty').value = '1.25';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
check('D4: sáº¥y tiáº¿p bá»• sung chu ká»³ cÃ¹ng lÃ´, khÃ´ng Ä‘á»•i mÃ£ hoáº·c trá»« láº¡i nguyÃªn liá»‡u',
  created.cycles.length === 2 && created.cycles[1].sulfurQty === 1.25 &&
  created.code === 'V261019001' && created.qty === 300 && created.qcStatus === 'pending' &&
  x2.x1SaySinhDirectRemainingOf(state.materialRecords[0], null) === 900);
check('D4b: chu ká»³ má»›i Ä‘Æ°a QC vá» Chá» QC cho Ä‘áº¿n khi kiá»ƒm tra thá»§ cÃ´ng',
  x2.setX1SaySinhQcStatus(created.id, 'pass') && created.qcStatus === 'pass');
check('D5: sá»­a lÃ´ náº¡p Ä‘Ãºng phÃ¢n bá»• vÃ  Ä‘Ã¡nh giÃ¡ QC hiá»‡n táº¡i',
  (x2.editX1SaySinh(created.id), created.qcStatus === 'pass' &&
   document.getElementById('x1-say-sinh-sulfur-qty').value === '3.5'));

console.log('--- E. Cáº¢NH BÃO LÃ” CÅ¨ NHáº¤T + Bá»C ---');
state.x1SaySinhEditId = null;
state.xuong1SaySinhRecords = [
  rec('r-old', isoAgo(10), { qty: 100, code: 'V261001001', cycles: [{ date: isoAgo(10), sulfurQty: 2 }, { date: isoAgo(8), sulfurQty: 1 }] }),
  rec('r-new', isoAgo(4), { qty: 90, code: 'V261002002' }),
  rec('r-not', isoAgo(1), { qty: 80, code: 'V261003003', qcStatus: 'fail' })
];
x2.renderX1SaySinhCard();
const barHtml = document.getElementById('x1-say-sinh-stock-bar').innerHTML;
check('E1: thanh tá»“n chá»‰ nháº¯c sá»‘ láº§n sáº¥y vÃ  tuá»•i lÃ´ cÅ© nháº¥t',
  barHtml.includes('4 láº§n sáº¥y sinh') && barHtml.includes('lÃ´ cÅ© nháº¥t 10 ngÃ y') && !barHtml.includes('Ä‘áº¡t ngÃ y'));
// E2 (KPI Thá»‘ng KÃª) ÄÃƒ Gá»  khá»i tháº» â€” kiá»ƒm tra cáº¥u trÃºc chuyá»ƒn xuá»‘ng má»¥c F7
const table = document.getElementById('x1-say-sinh-day-cards').innerHTML;
check('E3: lá»‹ch sá»­ = THáºº LÃ” (dÃ²ng thá»i gian tá»«ng láº§n + QC thá»§ cÃ´ng, khÃ´ng nhÃ£n Ä‘áº¡t ngÃ y)',
  table.includes('x1-ss-lot-card') && table.includes('x1-ss-tl-row') &&
  table.includes('Chá» QC') && table.includes('KhÃ´ng Ä‘áº¡t') && !table.includes('Ä‘áº¡t ngÃ y'));
check('E3b: QC cáº­p nháº­t trá»±c tiáº¿p trÃªn lÃ´, khÃ´ng cáº§n sá»­a chu ká»³',
  x2.setX1SaySinhQcStatus('r-new', 'pass') &&
  state.xuong1SaySinhRecords.find(r => r.id === 'r-new').qcStatus === 'pass');
check('E4: chip launcher nháº¯c lÃ´ cÅ© nháº¥t, khÃ´ng Ä‘Ã¡nh dáº¥u tá»± Ä‘á»™ng Äáº¡t',
  x2.x1CardCountText('x1-say-sinh-card').includes('lÃ´ cÅ© nháº¥t 10 ngÃ y') &&
  !x2.x1CardCountText('x1-say-sinh-card').includes('lÃ´ Ä‘áº¡t'));
x2.x1SsOpenOldPanel();
const panel = document.getElementById('x1-ss-ready-panel');
check('E5: panel má»Ÿ vÃ  Æ°u tiÃªn lÃ´ cÅ© nháº¥t',
  panel.hidden === false && panel.innerHTML.includes('V261001001') &&
  panel.innerHTML.includes('2 láº§n sáº¥y sinh') && panel.innerHTML.includes('10 ngÃ y'));
x2.x1SsOldStep(1);
check('E6: Ä‘iá»u hÆ°á»›ng sang lÃ´ káº¿ tiáº¿p theo thá»© tá»± ngÃ y', panel.innerHTML.includes('V261002002'));
x2.x1SsOldStep(1);
check('E7: Ä‘iá»u hÆ°á»›ng tiáº¿p theo váº«n xáº¿p lÃ´ cÅ© trÆ°á»›c', panel.innerHTML.includes('V261003003'));
x2.x1SsOldStep(1);
check('E8: Ä‘iá»u hÆ°á»›ng vÃ²ng vá» lÃ´ cÅ© nháº¥t', panel.innerHTML.includes('V261001001'));
x2.x1SsCloseReadyPanel();
check('E9: ÄÃ³ng panel â†’ áº©n', panel.hidden === true);
x2.renderX1BocCard();
const bocSel = document.getElementById('x1-boc-source');
const oldBocOption = (bocSel.innerHTML.match(/<option[^>]*value="r-old"[^>]*>([\s\S]*?)<\/option>/) || [])[1] || '';
check('E10: Ã´ chá»n Bá»‘c hiá»‡n mÃ£ lÃ´, NCC, ngÃ y sáº¥y, tuá»•i lÃ´ vÃ  tá»“n',
  oldBocOption.includes('[V261001001] Â· NCC Táº¿') &&
  /Sáº¥y Sinh \d{2}\/\d{2}\/\d{2}/.test(oldBocOption) &&
  oldBocOption.includes('10 ngÃ y sáº¥y sinh') && oldBocOption.includes('Tá»“n 100 kg') &&
  oldBocOption.includes('Chá» QC') && !oldBocOption.includes('âš  Ä‘áº¡t'));
x2.x1SsOpenBocFor('r-new');
check('E11: "Má»Ÿ tháº» Bá»‘c" chá»n sáºµn Ä‘Ãºng lÃ´ Ä‘Æ°á»£c nháº¯c', bocSel.value === 'r-new');

const bocStatsHtml = document.getElementById('x1-boc-stats').innerHTML;
check('E12: thá»‘ng kÃª Bá»‘c giá»¯ 3 Ã´ ná»™i bá»™ vÃ  khÃ´ng gáº¯n thá»‘ng kÃª lÃ´ Lá»c Thanh',
  bocStatsHtml.includes('LÆ°á»£t bá»‘c') &&
  bocStatsHtml.includes('Tá»•ng KL bá»‘c (kg)') &&
  bocStatsHtml.includes('CÃ²n chá» bá»‘c (kg)') &&
  !bocStatsHtml.includes('Tá»· lá»‡ lÃ´ Ä‘Ã£ chá»‘t') &&
  !bocStatsHtml.includes('ratio') &&
  !bocStatsHtml.includes('closedHas'));
console.log('--- F. Cáº¤U TRÃšC (index/events/CSS/export/sw) ---');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const expSrc = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const xuong2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
check('F1: form cÃ³ chá»n nhiá»u phiáº¿u, phÃ¢n bá»•, lÆ°u huá»³nh, QC vÃ  lÃ´ sáº¥y tiáº¿p',
  idxHtml.includes('id="x1-say-sinh-source" multiple') &&
  idxHtml.includes('id="x1-say-sinh-allocations"') &&
  idxHtml.includes('id="x1-say-sinh-sulfur-qty"') &&
  idxHtml.includes('id="x1-say-sinh-repeat-lot"') &&
  !idxHtml.includes('id="x1-say-sinh-qc-status"') &&
  table.includes('data-x1-say-sinh-qc'));
check('F2: events.js ná»‘i chá»n nhiá»u nguá»“n, chu ká»³ sáº¥y láº¡i vÃ  cáº£nh bÃ¡o lÃ´ cÅ©',
  evSrc.includes("'x1-say-sinh-allocations'") && evSrc.includes("'x1-say-sinh-repeat-lot'") &&
  evSrc.includes("'x1-say-sinh-day-cards', 'change'") &&
  evSrc.includes("'x1-ss-ready-btn'") && evSrc.includes('x1SsOpenOldPanel'));
check('F3: styles.css cÃ³ kiá»ƒu phÃ¢n bá»•, tráº¡ng thÃ¡i QC vÃ  panel cáº£nh bÃ¡o',
  cssSrc.includes('.x1-ss-allocation-list') && cssSrc.includes('.x1-ss-qc.is-pass') &&
  cssSrc.includes('.x1-ss-ready-panel[hidden]'));
check('F4: export Excel cÃ³ chu ká»³, lÆ°u huá»³nh vÃ  Ä‘Ã¡nh giÃ¡ QC thá»§ cÃ´ng',
  expSrc.includes("'Sá»‘ Láº§n Sáº¥y'") && expSrc.includes("'KL LÆ°u Huá»³nh (kg)'") &&
  expSrc.includes("'ÄÃ¡nh GiÃ¡ QC'") && expSrc.includes("'Phiáº¿u Äáº§u VÃ o / PhÃ¢n Bá»•'") &&
  !expSrc.includes("'NgÃ y Äáº¡t'"));
check('F5: sw.js cache version bumped', /nha-may-ngoc-son-v486/.test(swSrc));
check('F6: file test nÃ y Ä‘Ã£ náº±m trong chuá»—i npm test', (pkg.scripts.test || '').includes('xuong1-say-sinh-lot.test.mjs'));
check('F7: KPI VÃ¹ng â‘¡ Thá»‘ng KÃª ÄÃƒ Gá»  khá»i tháº» Sáº¥y Sinh (tá»•ng há»£p á»Ÿ báº£ng toÃ n xÆ°á»Ÿng sau)',
  !idxHtml.includes('id="x1-say-sinh-stats"') && !xuong2Src.includes('renderX1SaySinhStats') &&
  !evSrc.includes("'x1-say-sinh-stats'") &&
  idxHtml.includes('<span class="x2-zone-no">2</span><i data-lucide="history">'));

console.log('--- G. LÆ¯U HUá»²NH Tá»° Äá»ŠNH + GIá»œ Sáº¤Y + XEM CHI TIáº¾T ---');
check('G1: x1SsSulfurHint láº§n 1 = 1,3 kg/táº¥n', (() => {
  const h = x2.x1SsSulfurHint(1000, 1);
  return h.rate === 1.3 && Math.abs(h.suggested - 1.3) < 1e-9;
})());
check('G2: x1SsSulfurHint láº§n 2 = 1,3 kg/táº¥n', (() => {
  const h = x2.x1SsSulfurHint(1000, 2);
  return h.rate === 1.3 && Math.abs(h.suggested - 1.3) < 1e-9;
})());
check('G3: x1SsSulfurHint láº§n 3 = 0,8 kg/táº¥n', (() => {
  const h = x2.x1SsSulfurHint(1000, 3);
  return h.rate === 0.8 && Math.abs(h.suggested - 0.8) < 1e-9;
})());
check('G4: x1SsSulfurHint láº§n 4 = 0,8 kg/táº¥n', (() => {
  const h = x2.x1SsSulfurHint(1000, 4);
  return h.rate === 0.8 && Math.abs(h.suggested - 0.8) < 1e-9;
})());
check('G5: X1_SS_DEFAULT_HOUR = 08:00', x2.X1_SS_DEFAULT_HOUR === '08:00');
check('G6: form cÃ³ Ã´ Giá» Sáº¥y', idxHtml.includes('id="x1-say-sinh-hour"'));
check('G7: nÃºt chuyá»ƒn 2 CHáº¾ Äá»˜ á»Ÿ Ä‘áº§u VÃ™NG â‘¢ (Tháº» LÃ´ + BÃ¡o cÃ¡o theo ngÃ y)',
  idxHtml.includes('id="x1-ss-view-card"') && idxHtml.includes('id="x1-ss-view-day"') &&
  idxHtml.includes('data-view="day"') && !idxHtml.includes('Xem lá»‹ch sá»­:'));
check('G8: ÄÃƒ Dá»ŒN code cháº¿t â€” háº¿t detail-wrap cÅ©, render vá» Ä‘Ãºng 1 container',
  !idxHtml.includes('x1-say-sinh-detail-wrap') && idxHtml.includes('id="x1-say-sinh-day-cards"'));
check('G9: tháº» LÃ´ cÃ³ dÃ²ng thá»i gian + dÃ²ng â° Láº§n káº¿ tiáº¿p',
  xuong2Src.includes('x1-ss-tl-row') && xuong2Src.includes('Láº§n káº¿ tiáº¿p') && xuong2Src.includes('x1SsFmtDateTime'));
check('G10: cháº¿ Ä‘á»™ BÃO CÃO THEO NGÃ€Y cÃ³ ngÆ°á»i sáº¥y + giá» HC/TC + láº§n thá»©',
  xuong2Src.includes('renderX1SsDayReport') && xuong2Src.includes('Láº§n thá»©') &&
  idxHtml.includes('BÃ¡o cÃ¡o theo ngÃ y'));
check('G11: events.js IMPORT Äá»¦ (sá»­a lá»—i ReferenceError) + wire nÃºt day',
  evSrc.includes("setX1SsViewMode, x1SsUpdateSulfurHint, x1SsMarkCodeManualEdit, x1SsMarkSulfurManualEdit, x1SsOpenInputModal") &&
  evSrc.includes("'x1-ss-view-day'") && !evSrc.includes('x1SsSulfurHint'));
check('G12: export má»›i + ÄÃƒ Gá»  export cÅ© (setX1SaySinhViewMode/renderX1SaySinhDetail)',
  typeof x2.setX1SsViewMode === 'function' && typeof x2.renderX1SsHistory === 'function' &&
  typeof x2.x1SsFmtDateTime === 'function' && typeof x2.x1SsUpdateSulfurHint === 'function' &&
  x2.setX1SaySinhViewMode === undefined && x2.renderX1SaySinhDetail === undefined);

// Kiá»ƒm tra lÃ´ Ä‘Ã£ Äáº¡t khÃ´ng xuáº¥t hiá»‡n trong select sáº¥y tiáº¿p
state.xuong1SaySinhRecords = [
  rec('pass-lot', isoAgo(5), { qty: 100, code: 'VPASS', qcStatus: 'pass', cycles: [{ date: isoAgo(5), sulfurQty: 1 }] }),
  rec('pending-lot', isoAgo(3), { qty: 100, code: 'VPEND', qcStatus: 'pending', cycles: [{ date: isoAgo(3), sulfurQty: 1 }] })
];
x2.fillX1SaySinhOptions();
const repeatHtml = document.getElementById('x1-say-sinh-repeat-lot').innerHTML;
check('G13: lÃ´ qcStatus=pass Bá»Š Lá»Œ KHá»ŽI select sáº¥y tiáº¿p', !repeatHtml.includes('VPASS'));
check('G14: lÃ´ qcStatus=pending CÃ’N HIá»‚N select sáº¥y tiáº¿p', repeatHtml.includes('VPEND'));

// Kiá»ƒm tra lÆ°u giá» vÃ o chu ká»³ khi táº¡o má»›i
state.xuong1SaySinhRecords = [];
state.materialRecords = [{ id: 'mat-v', type: 'Váº§u tÆ°Æ¡i', supplier: 'Táº¿', location: 'xuong-1', weight: 1000, date: '2026-10-01', createdAt: '2026-10-01T02:00:00.000Z' }];
x2.fillX1SaySinhOptions();
selectValues('x1-say-sinh-source', ['mat-v']);
x2.x1SaySinhRenderAllocations();
document.getElementById('x1-say-sinh-allocation-mat-v').value = '100';
document.getElementById('x1-say-sinh-date').value = '2026-10-19';
document.getElementById('x1-say-sinh-hour').value = '09:30';
document.getElementById('x1-say-sinh-sulfur-qty').value = '1.3';
x2.handleX1SaySinhSubmit({ preventDefault(){} });
const newLot = state.xuong1SaySinhRecords[0];
check('G15: chu ká»³ má»›i lÆ°u Ä‘Ãºng giá»', newLot.cycles[0].hour === '09:30');
check('G16: chu ká»³ má»›i lÆ°u Ä‘Ãºng lÆ°u huá»³nh', newLot.cycles[0].sulfurQty === 1.3);

// Kiá»ƒm tra x1SaySinhDisplay cÃ³ totalHours + nextCheckHour
const disp = x2.x1SaySinhDisplay(newLot);
check('G17: display cÃ³ totalHours', typeof disp.totalHours === 'number' && disp.totalHours === 24);
check('G18: display cÃ³ nextCheckHour', typeof disp.nextCheckHour === 'string' && disp.nextCheckHour.length > 0);
check('G19: display cÃ³ cycleDetails', Array.isArray(disp.cycleDetails) && disp.cycleDetails.length === 1);
check('G20: cycleDetails cÃ³ num/date/hour/sulfurQty/rate',
  disp.cycleDetails[0].num === 1 && disp.cycleDetails[0].hour === '09:30' && disp.cycleDetails[0].rate === 1.3);

// G28-G33: táº¡o lÃ´ láº§n Ä‘áº§u â€” mÃ£ theo loáº¡i gá»™p/ngÃ y vÃ  lÆ°u huá»³nh tá»± Ä‘iá»n cÃ³ báº£o tá»“n sá»­a tay
console.log('--- G28-G33. Táº O LÃ” Láº¦N Äáº¦U â€” MÃƒ & LÆ¯U HUá»²NH Tá»° Äá»˜NG ---');
check('G28: hai nguá»“n Váº§u+Ná»©a táº¡o mÃ£ theo LOáº I Gá»˜P vÃ  NgÃ y Sáº¥y', (() => {
  state.xuong1SaySinhRecords = [];
  state.xuong1CatOngRecords = [];
  state.materialRecords = [
    { id: 'combo-v', type: 'Váº§u tÆ°Æ¡i', supplier: 'Táº¿', location: 'xuong-1', weight: 1000, date: '2026-12-01', createdAt: '2026-12-01T02:00:00.000Z' },
    { id: 'combo-n', type: 'Ná»©a khÃ´', supplier: 'LÃ½', location: 'xuong-1', weight: 1000, date: '2026-12-02', createdAt: '2026-12-02T02:00:00.000Z' }
  ];
  x2.resetX1SaySinhForm();
  x2.fillX1SaySinhOptions();
  selectValues('x1-say-sinh-source', ['combo-v', 'combo-n']);
  document.getElementById('x1-say-sinh-date').value = '2026-12-03';
  x2.x1SaySinhSyncLinked(true);
  const code = document.getElementById('x1-say-sinh-code').value;
  return /^[VN]261203\d{3}$/.test(code);
})());
check('G29: Ä‘á»•i NgÃ y Sáº¥y cáº­p nháº­t mÃ£ cÃ²n trá»‘ng/tá»± sinh', (() => {
  const before = document.getElementById('x1-say-sinh-code').value;
  document.getElementById('x1-say-sinh-date').value = '2026-12-05';
  x2.x1SaySinhSyncLinked(true);
  const after = document.getElementById('x1-say-sinh-code').value;
  return after !== before && /^[VN]261205\d{3}$/.test(after);
})());
check('G30: mÃ£ nháº­p tay khÃ´ng bá»‹ ghi Ä‘Ã¨ khi Ä‘á»•i NgÃ y Sáº¥y', (() => {
  x2.x1SsMarkCodeManualEdit();
  document.getElementById('x1-say-sinh-code').value = 'V261205099';
  document.getElementById('x1-say-sinh-date').value = '2026-12-06';
  x2.x1SaySinhSyncLinked(true);
  return document.getElementById('x1-say-sinh-code').value === 'V261205099';
})());
check('G31: lÆ°u huá»³nh tá»± Ä‘iá»n cÃ´ng thá»©c 1.3 vÃ  lÃ m trÃ²n lÃªn 1 chá»¯ sá»‘', (() => {
  x2.x1SsResetManualTracking();
  document.getElementById('x1-say-sinh-qty').value = '123';
  x2.x1SsUpdateSulfurHint();
  return document.getElementById('x1-say-sinh-sulfur-qty').value === '0.2';
})());
check('G32: phÃ¢n bá»• tÄƒng cáº­p nháº­t lÆ°u huá»³nh tá»± sinh', (() => {
  document.getElementById('x1-say-sinh-qty').value = '1000';
  x2.x1SsUpdateSulfurHint();
  return document.getElementById('x1-say-sinh-sulfur-qty').value === '1.3';
})());
check('G33: lÆ°u huá»³nh nháº­p tay khÃ´ng bá»‹ ghi Ä‘Ã¨ khi Ä‘á»•i phÃ¢n bá»•', (() => {
  x2.x1SsMarkSulfurManualEdit();
  document.getElementById('x1-say-sinh-sulfur-qty').value = '2.75';
  document.getElementById('x1-say-sinh-qty').value = '2000';
  x2.x1SsUpdateSulfurHint();
  return document.getElementById('x1-say-sinh-sulfur-qty').value === '2.75';
})());

// G21-G23: YÃªu cáº§u má»›i (ngÃ y sáº¥y tiáº¿p + dÃ²ng chá»¯ chá»n lÃ´ + hiá»ƒn thá»‹ ngÃ y chi tiáº¿t)
check('G21: Ã´ chá»n lÃ´ sáº¥y tiáº¿p cÃ³ chá»¯ "sáº¥y tiáº¿p láº§n"', xuong2Src.includes('sáº¥y tiáº¿p láº§n'));
check('G22a: x1SsAddDays(2026-10-22, 1) = 2026-10-23', x2.x1SsAddDays('2026-10-22', 1) === '2026-10-23');
check('G22b: gá»£i Ã½ ngÃ y láº§n tiáº¿p theo = ngÃ y cycle cuá»‘i + 1', (() => {
  state.xuong1SaySinhRecords = [
    rec('lot-1', '2026-10-21', { code: 'V261021003', cycles: [
      { date: '2026-10-21', sulfurQty: 1.3, hour: '08:00' },
      { date: '2026-10-22', sulfurQty: 1.3, hour: '08:00' }
    ] })
  ];
  x2.fillX1SaySinhOptions();
  document.getElementById('x1-say-sinh-repeat-lot').value = 'lot-1';
  x2.x1SaySinhSyncLinked(true);
  const dateEl = document.getElementById('x1-say-sinh-date');
  return dateEl.value === '2026-10-23';
})());
check('G23: chi tiáº¿t theo ngÃ y hiá»ƒn thá»‹ Ä‘Ãºng ngÃ y tá»«ng láº§n', (() => {
  const d = x2.x1SaySinhDisplay(state.xuong1SaySinhRecords[0]);
  return d.cycleDetails[0].date === '2026-10-21' &&
    d.cycleDetails[1].date === '2026-10-22';
})());

// G24-G27: 2 CHáº¾ Äá»˜ XEM (PhÆ°Æ¡ng Ã¡n B) â€” Tháº» LÃ´ máº·c Ä‘á»‹nh + BÃ¡o cÃ¡o theo ngÃ y
state.xuong1SaySinhRecords = [
  rec('lot-1', '2026-10-21', { code: 'V261021003', cycles: [
    { date: '2026-10-21', sulfurQty: 1.3, hour: '08:00' },
    { date: '2026-10-22', sulfurQty: 1.3, hour: '08:00' }
  ] })
];
state.x1SsViewMode = null; // lazy load tá»« localStorage (stub trá»‘ng â†’ 'card')
x2.renderX1SsHistory();
const lotCardHtml = document.getElementById('x1-say-sinh-day-cards').innerHTML;
check('G24: THáºº LÃ” (máº·c Ä‘á»‹nh) â€” dÃ²ng thá»i gian tá»«ng láº§n + â° giá» kiá»ƒm tra káº¿ tiáº¿p',
  lotCardHtml.includes('x1-ss-lot-card') && lotCardHtml.includes('Láº§n 1') &&
  lotCardHtml.includes('Láº§n 2') && lotCardHtml.includes('Láº§n káº¿ tiáº¿p') &&
  lotCardHtml.includes('21/10/26 08:00') &&
  lotCardHtml.includes('x1-ss-accent-dot') && lotCardHtml.includes('border-left-color:#'));
x2.setX1SsViewMode('day');
const dayReportHtml = document.getElementById('x1-say-sinh-day-cards').innerHTML;
check('G25: BÃO CÃO THEO NGÃ€Y â€” tháº» ngÃ y cÃ³ ngÆ°á»i sáº¥y + láº§n thá»© + giá» sáº¥y',
  dayReportHtml.includes('x2-day-card') && dayReportHtml.includes('Láº§n 1') &&
  dayReportHtml.includes('Láº§n 2') && dayReportHtml.includes('Giá» sáº¥y') &&
  dayReportHtml.includes('21/10/26'));
check('G26: cháº¿ Ä‘á»™ xem NHá»š THEO MÃY (localStorage)',
  localStorage.getItem(x2.X1_SS_VIEW_KEY) === 'day');
x2.setX1SsViewMode('card');
check('G27: chuyá»ƒn láº¡i THáºº LÃ” â€” ghi mÃ¡y + render láº¡i tháº»',
  localStorage.getItem(x2.X1_SS_VIEW_KEY) === 'card' &&
  document.getElementById('x1-say-sinh-day-cards').innerHTML.includes('x1-ss-lot-card'));

console.log('--- H. 2 NÃšT TO + POPUP NHáº¬P LIá»†U + BANNER Cáº¢NH BÃO + THU Gá»ŒN MOBILE ---');
check('H1: 2 nÃºt gá»i form + CÄ sau trong VÃ™NG â‘  + pop-up cáº¥p trang chá»©a form (modal trÆ°á»›c form)',
  idxHtml.includes('id="btn-x1-ss-new"') && idxHtml.includes('id="btn-x1-ss-repeat"') &&
  idxHtml.includes('id="btn-x1-say-sinh-stage-next-card"') &&
  idxHtml.includes('x1-ss-input-btns') && idxHtml.includes('id="modal-x1-ss-input"') &&
  idxHtml.indexOf('id="modal-x1-ss-input"') < idxHtml.indexOf('id="x1-say-sinh-form"') &&
  idxHtml.includes('id="x1-ss-src-group"') && idxHtml.includes('id="x1-ss-repeat-group"'));
const saySinhModalStart = idxHtml.indexOf('id="modal-x1-ss-input"');
const saySinhModalHtml = idxHtml.slice(saySinhModalStart, idxHtml.indexOf('</body>', saySinhModalStart));
check('H1b: form Sáº¥y Sinh chá»‰ giá»¯ LÃ m Má»›i + LÆ°u, bá» nÃºt LÃ¹i/Tiáº¿n',
  saySinhModalHtml.includes('id="btn-cancel-x1-say-sinh"') &&
  saySinhModalHtml.includes('x1-stage-save') &&
  !saySinhModalHtml.includes('btn-x1-say-sinh-stage-prev') &&
  !saySinhModalHtml.includes('id="btn-x1-say-sinh-stage-next"'));
check('H2: banner cáº£nh bÃ¡o render (quÃ¡ háº¡n + Ä‘Ã£ Äáº¡t chá» Bá»‘c) + Ä‘áº¿m', (() => {
  state.xuong1SaySinhRecords = [
    rec('al-over', isoAgo(3), { code: 'VOVER', cycles: [{ date: isoAgo(3), sulfurQty: 1.3, hour: '08:00' }] }),
    rec('al-pass', isoAgo(5), { code: 'VPASS2', qcStatus: 'pass', cycles: [{ date: isoAgo(5), sulfurQty: 1 }] })
  ];
  x2.renderX1SsAlertBanner();
  const b = document.getElementById('x1-ss-alert-banner');
  return b.hidden === false && b.innerHTML.includes('QUÃ Háº N') &&
    b.innerHTML.includes('Ä‘Ã£ Äáº¡t QC') && b.innerHTML.includes('VOVER') && b.innerHTML.includes('VPASS2');
})());
check('H3: x1SsAlertKindOf phÃ¢n loáº¡i Ä‘Ãºng (over / qcpass)', (() => {
  const over = x2.x1SsAlertKindOf(state.xuong1SaySinhRecords[0]);
  const qcp = x2.x1SsAlertKindOf(state.xuong1SaySinhRecords[1]);
  return !!over && over.kind === 'over' && !!qcp && qcp.kind === 'qcpass';
})());
check('H4: pop-up má»Ÿ/Ä‘Ã³ng + áº©n/hiá»‡n nhÃ³m Ã´ theo cháº¿ Ä‘á»™ (repeat áº©n phiáº¿u Â· new áº©n lÃ´ tiáº¿p)', (() => {
  const ov = document.getElementById('modal-x1-ss-input');
  x2.x1SsOpenInputModal('repeat');
  const okOpen = ov.classList.contains('show') &&
    document.getElementById('x1-ss-input-title').textContent === 'Sáº¥y Tiáº¿p LÃ´ ÄÃ£ CÃ³' &&
    document.getElementById('x1-ss-src-group').hidden === true &&
    document.getElementById('x1-ss-repeat-group').hidden === false;
  x2.x1SsCloseInputModal();
  const okClose = !ov.classList.contains('show');
  x2.x1SsOpenInputModal('new');
  const okNew = document.getElementById('x1-ss-src-group').hidden === false &&
    document.getElementById('x1-ss-repeat-group').hidden === true &&
    document.getElementById('x1-ss-input-title').textContent === 'Táº¡o LÃ´ Sáº¥y Láº§n Äáº§u';
  x2.x1SsCloseInputModal();
  return okOpen && okClose && okNew;
})());
check('H5: thu gá»n dÃ²ng thá»i gian â€” nÃºt toggle Ä‘á»•i tráº¡ng thÃ¡i tháº»', (() => {
  state.xuong1SaySinhRecords = [rec('tl-1', '2026-10-21', { code: 'VTL', cycles: [{ date: '2026-10-21', sulfurQty: 1.3, hour: '08:00' }] })];
  state.x1SsViewMode = 'card';
  x2.renderX1SsHistory();
  const card = document.getElementById('x1-ss-card-tl-1');
  const before = card.classList.contains('is-closed');
  x2.x1SsToggleTimeline('tl-1');
  const after = card.classList.contains('is-closed');
  return !!card.querySelector('.x1-ss-tl-toggle') && after === !before;
})());
check('H6: events.js wire Ä‘á»§ (2 nÃºt gá»i form + CÄ sau + banner + toggle + pop-up/Esc)',
  evSrc.includes("'btn-x1-ss-new'") && evSrc.includes("'btn-x1-ss-repeat'") &&
  evSrc.includes("'btn-x1-say-sinh-stage-next-card'") &&
  evSrc.includes("'x1-ss-alert-banner'") && evSrc.includes('[data-x1-ss-toggle]') &&
  evSrc.includes("'modal-x1-ss-input'") && evSrc.includes('x1SsOpenInputModal'));
check('H7: CSS banner (cháº¡y chá»¯) + nÃºt to + thu gá»n + mobile gá»n',
  cssSrc.includes('.x1-ss-alert-banner') && cssSrc.includes('x1SsMarquee') &&
  cssSrc.includes('.x1-ss-input-btn') && cssSrc.includes('.x1-ss-lot-card.is-closed .x1-ss-timeline') &&
  cssSrc.includes('grid-template-columns: repeat(3, minmax(0, 1fr))') &&
  cssSrc.includes('#btn-x1-say-sinh-stage-next-card') &&
  cssSrc.includes('Äá»• mÃ u Ä‘áº§y cho cÃ¡c tháº» XÆ°á»Ÿng 1') &&
  cssSrc.includes('.x1-bo-actions:not(.cat-ong)') &&
  cssSrc.includes('repeat(2, minmax(0, 1fr))') &&
  idxHtml.includes('x1-boc-actions'));
check('H8: panel nháº¯c lÃ´ cÃ³ dÃ²ng â° Láº§n káº¿ tiáº¿p + chip lÃ½ do',
  xuong2Src.includes('x1-ss-ready-when') && xuong2Src.includes('x1-ss-alert-chip') &&
  typeof x2.x1SsOpenInputModal === 'function' && typeof x2.x1SsToggleTimeline === 'function');
check('H9: 2 nÃºt Äá»” MÃ€U Äáº¦Y + hiá»‡u á»©ng ná»•i (gradient Â· translateY Â· táº¯t khi Giáº£m Hiá»‡u á»¨ng)',
  cssSrc.includes('.x1-ss-input-btn:hover') && cssSrc.includes('translateY(-2px)') &&
  cssSrc.includes('linear-gradient(180deg') && cssSrc.includes('.is-repeat') &&
  cssSrc.includes('body[data-fx="low"] .x1-ss-input-btn:hover { transform: none') &&
  cssSrc.includes('text-shadow'));
check('H10: tháº» lÃ´ cÃ³ VIá»€N MÃ€U LUÃ‚N PHIÃŠN + cháº¥m mÃ u phÃ¢n biá»‡t (5 mÃ u chuáº©n)',
  xuong2Src.includes('X1_SS_CARD_ACCENTS') && xuong2Src.includes('x1-ss-accent-dot') &&
  xuong2Src.includes("border-left-color:' + accent") &&
  cssSrc.includes('.x1-ss-accent-dot'));
check('H11: gá»£i Ã½ GIá»œ sáº¥y tiáº¿p = giá» láº§n sáº¥y TRÆ¯á»šC (Ä‘Ãºng cáº·p +24h vá»›i ngÃ y gá»£i Ã½)', (() => {
  state.xuong1SaySinhRecords = [rec('hr-1', '2026-10-21', { code: 'VHR', cycles: [
    { date: '2026-10-21', sulfurQty: 1.3, hour: '14:30' },
    { date: '2026-10-22', sulfurQty: 1.3, hour: '15:45' }
  ] })];
  x2.fillX1SaySinhOptions();
  document.getElementById('x1-say-sinh-repeat-lot').value = 'hr-1';
  x2.x1SaySinhSyncLinked(true);
  const d = document.getElementById('x1-say-sinh-date').value;
  const h = document.getElementById('x1-say-sinh-hour').value;
  return d === '2026-10-23' && h === '15:45';
})());
check('H12: form cÄƒn Ä‘Ã¡y hÃ ng Ã´ nháº­p (nhÃ£n 2 dÃ²ng khÃ´ng lá»‡ch) + hint dáº¡ng hÃ ng ngang',
  cssSrc.includes('#x1-say-sinh-form .x2-form-row { align-items: flex-end') &&
  cssSrc.includes('#x1-say-sinh-sulfur-hint {') && cssSrc.includes('#x1-say-sinh-sulfur-hint > svg'));

// â”€â”€â”€ I. NHáº¬P TAY MÃƒ LÃ” (yÃªu cáº§u ngÆ°á»i dÃ¹ng) â”€â”€â”€
console.log('--- I. NHáº¬P TAY MÃƒ LÃ” ---');

check('I1: nháº­p tay mÃ£ lÃ´ Ä‘Æ°á»£c ghi Ä‘Ãºng', (() => {
  state.materialRecords = [
    { id: 'mat-m', type: 'Váº§u tÆ°Æ¡i', supplier: 'Táº¿', location: 'xuong-1', weight: 1000, date: '2026-11-05', createdAt: '2026-11-05T02:00:00.000Z' }
  ];
  state.xuong1CatOngRecords = [];
  state.xuong1SaySinhRecords = [];
  x2.fillX1SaySinhOptions();
  selectValues('x1-say-sinh-source', ['mat-m']);
  x2.x1SaySinhRenderAllocations();
  document.getElementById(`x1-say-sinh-allocation-mat-m`).value = '500';
  document.getElementById('x1-say-sinh-date').value = '2026-11-05';
  document.getElementById('x1-say-sinh-code').value = 'V261105099'; // mÃ£ nháº­p tay
  document.getElementById('x1-say-sinh-sulfur-qty').value = '1.3';
  x2.handleX1SaySinhSubmit({ preventDefault(){} });
  const manualLot = state.xuong1SaySinhRecords[0];
  return manualLot && manualLot.code === 'V261105099';
})());

check('I2: cháº·n mÃ£ lÃ´ trÃ¹ng', (() => {
  selectValues('x1-say-sinh-source', ['mat-m']);
  x2.x1SaySinhRenderAllocations();
  document.getElementById(`x1-say-sinh-allocation-mat-m`).value = '300';
  document.getElementById('x1-say-sinh-date').value = '2026-11-05';
  document.getElementById('x1-say-sinh-code').value = 'V261105099'; // trÃ¹ng vá»›i I1
  document.getElementById('x1-say-sinh-sulfur-qty').value = '1.3';
  x2.handleX1SaySinhSubmit({ preventDefault(){} });
  return state.xuong1SaySinhRecords.length === 1;
})());

check('I3: cháº·n mÃ£ lÃ´ sai Ä‘á»‹nh dáº¡ng', (() => {
  document.getElementById('x1-say-sinh-code').value = 'V26-11-05'; // sai Ä‘á»‹nh dáº¡ng
  x2.handleX1SaySinhSubmit({ preventDefault(){} });
  return state.xuong1SaySinhRecords.length === 1;
})());

check('I4: tá»± sinh mÃ£ theo nÄƒm (khÃ´ng reset thÃ¡ng)', (() => {
  document.getElementById('x1-say-sinh-code').value = '';
  document.getElementById('x1-say-sinh-sulfur-qty').value = '1.3';
  x2.handleX1SaySinhSubmit({ preventDefault(){} });
  const autoLot = state.xuong1SaySinhRecords[1];
  return autoLot && autoLot.code === 'V261105100'; // V + 261105 + 100 (vÃ¬ 099 Ä‘Ã£ dÃ¹ng)
})());

check('I5: sá»­a mÃ£ lÃ´ thÃ nh cÃ´ng', (() => {
  const autoLot = state.xuong1SaySinhRecords[1];
  x2.editX1SaySinh(autoLot.id);
  document.getElementById('x1-say-sinh-code').value = 'V261105200';
  x2.handleX1SaySinhSubmit({ preventDefault(){} });
  const editedLot = state.xuong1SaySinhRecords.find(r => r.id === autoLot.id);
  return editedLot && editedLot.code === 'V261105200';
})());

check('I6: nÄƒm má»›i reset sá»‘ vá» 001', (() => {
  state.xuong1SaySinhRecords = [];
  state.materialRecords = [
    { id: 'mat-m2', type: 'Váº§u tÆ°Æ¡i', supplier: 'Táº¿', location: 'xuong-1', weight: 1000, date: '2027-01-05', createdAt: '2027-01-05T02:00:00.000Z' }
  ];
  x2.fillX1SaySinhOptions();
  selectValues('x1-say-sinh-source', ['mat-m2']);
  x2.x1SaySinhRenderAllocations();
  document.getElementById(`x1-say-sinh-allocation-mat-m2`).value = '100';
  document.getElementById('x1-say-sinh-date').value = '2027-01-05';
  document.getElementById('x1-say-sinh-code').value = '';
  document.getElementById('x1-say-sinh-sulfur-qty').value = '1.3';
  x2.handleX1SaySinhSubmit({ preventDefault(){} });
  const newYearLot = state.xuong1SaySinhRecords[0];
  return newYearLot && newYearLot.code === 'V270105001';
})());

// â”€â”€â”€ J. PHÃT HIá»†N LÃ” TRÃ™NG MÃƒ + KIá»‚M TRA CÃ”NG ÄOáº N SAU â”€â”€â”€
console.log('--- J. PHÃT HIá»†N LÃ” TRÃ™NG MÃƒ + CÃ”NG ÄOáº N SAU ---');

check('J1: x1SsFindDupes() tráº£ máº£ng rá»—ng khi khÃ´ng cÃ³ trÃ¹ng', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's1', code: 'V261105001', date: '2026-11-05', qty: 100 },
    { id: 's2', code: 'V261105002', date: '2026-11-05', qty: 200 },
  ];
  return x2.x1SsFindDupes().length === 0;
})());

check('J2: x1SsFindDupes() phÃ¡t hiá»‡n 2 lÃ´ cÃ¹ng mÃ£', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's1', code: 'V261105001', date: '2026-11-05', qty: 100 },
    { id: 's2', code: 'V261105001', date: '2026-11-06', qty: 200 },
    { id: 's3', code: 'N261105001', date: '2026-11-05', qty: 300 },
  ];
  const dupes = x2.x1SsFindDupes();
  return dupes.length === 1 && dupes[0].code === 'V261105001' && dupes[0].count === 2;
})());

check('J3: x1SsFindDupes() entries cÃ³ Ä‘á»§ id/date/qty', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's1', code: 'V261105001', date: '2026-11-05', qty: 100 },
    { id: 's2', code: 'V261105001', date: '2026-11-06', qty: 200 },
  ];
  const dupes = x2.x1SsFindDupes();
  return dupes[0].entries.length === 2 &&
         dupes[0].entries.some(e => e.id === 's1' && e.qty === 100) &&
         dupes[0].entries.some(e => e.id === 's2' && e.qty === 200);
})());

check('J4: x1SsHasDownstream(false) khi lÃ´ chÆ°a cÃ³ cÃ´ng Ä‘oáº¡n sau', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's1', code: 'V261105001', date: '2026-11-05', qty: 100 },
  ];
  state.xuong1BocRecords = [];
  state.xuong1LocOngRecords = [];
  state.xuong1CatMatRecords = [];
  state.xuong1BoRecords = [];
  state.xuong1PhoiSayRecords = [];
  state.xuong1LocThanhRecords = [];
  return x2.x1SsHasDownstream('s1') === false;
})());

check('J5: x1SsHasDownstream(true) khi Bá»‘c trá»±c tiáº¿p liÃªn káº¿t saySinhId', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's1', code: 'V261105001', date: '2026-11-05', qty: 100 },
  ];
  state.xuong1BocRecords = [
    { id: 'b1', saySinhId: 's1', date: '2026-11-06', qty: 100 },
  ];
  return x2.x1SsHasDownstream('s1') === true;
})());

check('J6: x1SsHasDownstream(true) qua Lá»c á»ng â†’ Bá»‘c â†’ Sáº¥y Sinh', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's1', code: 'V261105001', date: '2026-11-05', qty: 100 },
  ];
  state.xuong1BocRecords = [
    { id: 'b1', saySinhId: 's1', date: '2026-11-06', qty: 100 },
  ];
  state.xuong1LocOngRecords = [
    { id: 'l1', bocId: 'b1', date: '2026-11-07', qty: 100 },
  ];
  return x2.x1SsHasDownstream('s1') === true;
})());

check('J7: x1SsHasDownstream(true) qua Cáº¯t Máº¯t â†’ Lá»c á»ng â†’ Bá»‘c â†’ Sáº¥y Sinh', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's1', code: 'V261105001', date: '2026-11-05', qty: 100 },
  ];
  state.xuong1BocRecords = [
    { id: 'b1', saySinhId: 's1', date: '2026-11-06', qty: 100 },
  ];
  state.xuong1LocOngRecords = [
    { id: 'l1', bocId: 'b1', date: '2026-11-07', qty: 100 },
  ];
  state.xuong1CatMatRecords = [
    { id: 'c1', locOngId: 'l1', date: '2026-11-08', qty: 100 },
  ];
  return x2.x1SsHasDownstream('s1') === true;
})());

check('J8: x1SsHasDownstream(false) khi ssId khÃ´ng tá»“n táº¡i', (() => {
  state.xuong1BocRecords = [
    { id: 'b1', saySinhId: 's9', date: '2026-11-06', qty: 100 },
  ];
  return x2.x1SsHasDownstream('nonexistent') === false;
})());

check('J9: sá»­a mÃ£ Sáº¥y Sinh lan ra toÃ n chuá»—i cÃ´ng Ä‘oáº¡n X1', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's1', code: 'V261105001', date: '2026-11-05', qty: 100 },
  ];
  state.xuong1BocRecords = [
    { id: 'b1', saySinhId: 's1', lotCode: 'V261105001', date: '2026-11-06', qty: 100 },
  ];
  state.xuong1LocOngRecords = [
    { id: 'l1', bocId: 'b1', lotCode: 'V261105001', date: '2026-11-07', qtyOk: 90 },
  ];
  state.xuong1CatMatRecords = [
    { id: 'c1', locOngId: 'l1', lotCode: 'V261105001', date: '2026-11-08', qtyOk: 80 },
  ];
  state.xuong1BoRecords = [
    { id: 'bo1', lotCode: 'V261105001', date: '2026-11-09', qtyIn: 80, qtyOk: 70,
      sourceAllocations: [{ sourceType: 'locOng', sourceId: 'l1', qty: 80 }] },
  ];
  state.xuong1PhoiSayRecords = [
    { id: 'ps1', boId: 'bo1', lotCode: 'V261105001', date: '2026-11-10', qtyIn: 70, qtyOk: 60 },
  ];
  state.xuong1LocThanhRecords = [
    { id: 'lt1', boId: 'bo1', lotCode: 'V261105001', date: '2026-11-11', qtyIn: 60, qtyOk: 50,
      lotAllocations: [{ sourceId: 'bo1', lotCode: 'V261105001', qtyIn: 60 }] },
  ];

  state.xuong1SaySinhRecords[0].code = 'V261105999';
  x2.syncX1SaySinhCodeDownstream('s1', 'V261105999', false);
  const spLT = x2.x1ChainSpecByKey('locThanh');
  const display = x2.x1ChainDisplay(spLT, state.xuong1LocThanhRecords[0]);
  return x2.x1TraceLotCodeOf(state.xuong1BocRecords[0]) === 'V261105999' &&
         x2.x1TraceLotCodeOf(state.xuong1LocOngRecords[0]) === 'V261105999' &&
         x2.x1TraceLotCodeOf(state.xuong1CatMatRecords[0]) === 'V261105999' &&
         x2.x1TraceLotCodeOf(state.xuong1BoRecords[0]) === 'V261105999' &&
         x2.x1TraceLotCodeOf(state.xuong1PhoiSayRecords[0]) === 'V261105999' &&
         x2.x1TraceLotCodeOf(state.xuong1LocThanhRecords[0]) === 'V261105999' &&
         state.xuong1LocThanhRecords[0].lotAllocations[0].lotCode === 'V261105999' &&
         display.lotCode === 'V261105999';
})());

check('J10: truy váº¿t Æ°u tiÃªn mÃ£ Sáº¥y Sinh sá»‘ng thay snapshot mÃ£ cÅ©', (() => {
  state.xuong1SaySinhRecords = [
    { id: 's-live', code: 'V261105777', date: '2026-11-05', qty: 100 },
  ];
  state.xuong1BocRecords = [
    { id: 'b-live', saySinhId: 's-live', lotCode: 'V261105001', date: '2026-11-06', qty: 100 },
  ];
  state.xuong1LocOngRecords = [
    { id: 'l-live', bocId: 'b-live', lotCode: 'V261105001', date: '2026-11-07', qtyOk: 90 },
  ];
  return x2.x1TraceLotCodeOf(state.xuong1LocOngRecords[0]) === 'V261105777';
})());

check('J11: cáº£ sá»­a mÃ£ trong form láº«n sá»­a mÃ£ inline Ä‘á»u gá»i Ä‘á»“ng bá»™ xuá»‘ng cÃ´ng Ä‘oáº¡n sau',
  evSrc.includes('syncX1SaySinhCodeDownstream(id, newCode, true)') &&
  xuong2Src.includes('syncX1SaySinhCodeDownstream(rec.id, rec.code'));

console.log(`\n=== Káº¾T QUáº¢ X1 Sáº¤Y SINH LOT: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

