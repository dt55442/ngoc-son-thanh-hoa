// tests/kho.test.mjs â€” Kiá»ƒm thá»­ THáºº "KHO NAN" (tab CÃ´ng Äoáº¡n):
// 1. Tá»’N KHO THá»°C theo Láº¦N NHáº¬P: tá»“n lÃ´ = (sá»‘ láº§n nháº­p kho Ã— quantity) âˆ’ phiáº¿u xuáº¥t
//    ÄÃƒ DUYá»†T; 1 lÃ´ ra/vÃ o kho nhiá»u láº§n (quay láº¡i Sáº¥y 2) váº«n chá»‰ 1 dÃ²ng tá»“n.
// 2. PHIáº¾U KHO: Tá»• trÆ°á»Ÿng gá»­i phiáº¿u xuáº¥t (má»¥c Ä‘Ã­ch Sáº¥y 2 / BÃ o Tinh / Bullig / KhÃ¡c)
//    â†’ 'cho_duyet' KHÃ”NG trá»« tá»“n â†’ Ban lÃ£nh Ä‘áº¡o (Admin/Ban Quáº£n LÃ½) duyá»‡t â†’ trá»« tá»“n;
//    cháº·n xuáº¥t vÆ°á»£t tá»“n (lÃºc gá»­i + lÃºc duyá»‡t); tá»« chá»‘i cÃ³ lÃ½ do.
// 3. PHIáº¾U Xá»¬ LÃ Lá»–I: tiÃªu há»§y / tÃ¡i cháº¿ thanh lá»—i BÃ o Tinh Â· thanh lá»—i Chá»n thanh
//    Bullig (tá»“n Má»šI cÃ³ sá»•) Â· nan "Loáº¡i háº³n" â€” cháº·n vÆ°á»£t tá»“n lá»—i theo cá»¡.
// 4. PHIáº¾U BÃ™ dá»¯ liá»‡u cÅ©: sinh phiáº¿u ÄÃƒ DUYá»†T tá»« sá»‘ há»‡ thá»‘ng suy ra, cháº¡y 2 láº§n
//    khÃ´ng sinh trÃ¹ng; planning.js getNanStockEvents trá»« tá»“n theo phiáº¿u ÄÃƒ DUYá»†T
//    (bá» qua purpose 'say2').
// 5. Cáº¤U TRÃšC: id trong index.html Â· 5 nÆ¡i ná»‘i dá»¯ liá»‡u Â· sw.js v185 Â· npm test.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng than-hoa.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


// â”€â”€â”€ Dá»¯ liá»‡u máº«u: 3 lÃ´ á»Ÿ Kho (k2 ra/vÃ o kho 2 láº§n) + 1 lÃ´ Sáº¥y 1 â”€â”€
state.batches = [
  { id: 'k1', code: '260910-01', stage: 'kho', date: '2026-09-10', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 600, volume: 0.0945, bambooType: 'A', useFor: 'VÃ¡n', location: 'K11', stageHistory: [{ stage: 'kho', date: '2026-09-10' }] },
  { id: 'k2', code: '260911-01', stage: 'kho', date: '2026-09-14', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 400, volume: 0.063, bambooType: 'A1', useFor: 'Bullig', location: 'K12', say2Date: '2026-09-13', stageHistory: [{ stage: 'kho', date: '2026-09-11' }, { stage: 'say2', date: '2026-09-13' }, { stage: 'kho', date: '2026-09-14' }] },
  { id: 'k3', code: '260912-01', stage: 'kho', date: '2026-09-12', week: '2026-W37', length: 1300, width: 20, thickness: 8, quantity: 800, volume: 0.1664, bambooType: 'B', useFor: 'VÃ¡n', location: 'K13', stageHistory: [{ stage: 'kho', date: '2026-09-12' }] },
  { id: 'k4', code: '260912-02', stage: 'say1', date: '2026-09-12', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.0788, bambooType: 'A', useFor: 'VÃ¡n', location: 'LS1', stageHistory: [{ stage: 'say1', date: '2026-09-12' }] }
];

const utils = await import('../js/utils.js');
const x2 = await import('../js/xuong2.js');
const batchModals = await import('../js/batch-modals.js');

// â”€â”€â”€ A5. TRáº NG THÃI Sáº¤Y (14/11/2026) â€” nhÃ£n chuáº©n Kanban + Lá»ŒC NGUá»’N theo má»¥c Ä‘Ã­ch â”€â”€â”€
// LÃ´ máº«u: k1/k3 chá»‰ nháº­p tháº³ng Kho ("ChÆ°a sáº¥y") Â· k2 qua Sáº¥y 2 Â· thÃªm k5 (khai
// dryStage 'say2') vÃ  k6 (khai dryStage 'say1') Ä‘á»ƒ kiá»ƒm nhÃ¡nh lÃ´ nháº­p tháº³ng Kho.
state.batches.push(
  { id: 'k5', code: '260913-01', stage: 'kho', date: '2026-09-13', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 300, volume: 0.047, bambooType: 'A', useFor: 'VÃ¡n', location: 'K15', dryStage: 'say2', stageHistory: [{ stage: 'kho', date: '2026-09-13' }] },
  { id: 'k6', code: '260913-02', stage: 'kho', date: '2026-09-13', week: '2026-W37', length: 1250, width: 18, thickness: 7, quantity: 250, volume: 0.039, bambooType: 'B', useFor: 'VÃ¡n', location: 'K16', dryStage: 'say1', stageHistory: [{ stage: 'kho', date: '2026-09-13' }] }
);
const lotsWithDry = state.batches.slice();   // áº£nh chá»¥p Ä‘á»ƒ tráº£ láº¡i sau khá»‘i nÃ y
const lotById = id => state.batches.find(b => b.id === id);
check('TRáº NG THÃI Sáº¤Y: k1/k3 (chá»‰ nháº­p kho) = "ChÆ°a sáº¥y" Â· k2/k5 = "Sáº¥y 2" Â· k6 = "Sáº¥y 1"', (() => {
  const s = id => x2.khoLotDryStatusOf(lotById(id)).label;
  return s('k1') === 'ChÆ°a sáº¥y' && s('k3') === 'ChÆ°a sáº¥y' &&
    s('k2') === 'Sáº¥y 2' && s('k5') === 'Sáº¥y 2' && s('k6') === 'Sáº¥y 1';
})());
check('TRáº NG THÃI Sáº¤Y: chip dÃ¹ng ÄÃšNG nhÃ£n + mÃ u chuáº©n Kanban (dry-say1 / dry-say2 / dry-chua)', (() => {
  const chip = id => { const m = x2.khoDryChipHtml ? x2.khoDryChipHtml(lotById(id)) : ''; return m; };
  return chip('k2').includes('dry-say2') && chip('k2').includes('Sáº¥y 2') &&
    chip('k6').includes('dry-say1') && chip('k6').includes('Sáº¥y 1') &&
    chip('k1').includes('dry-chua') && chip('k1').includes('ChÆ°a sáº¥y');
})());
check('TRáº NG THÃI Sáº¤Y: chip hiá»‡n á»Ÿ Cáº¢ 2 nÆ¡i â€” tháº» lÃ´ gáº¯n phiáº¿u VÃ€ báº£ng Tá»“n theo tá»«ng lÃ´', (() => {
  document.getElementById('x2-kho-purpose').value = 'khac';
  x2.renderX2KhoLotsList();
  x2.renderX2KhoStockTable();
  const lots = document.getElementById('x2-kho-lots-list').innerHTML;
  const stock = document.getElementById('x2-kho-stock-rows').innerHTML;
  return lots.includes('dry-say2') && lots.includes('dry-say1') && lots.includes('dry-chua') &&
    stock.includes('dry-say2') && stock.includes('dry-say1') && stock.includes('dry-chua');
})());
check('Lá»ŒC: má»¥c Ä‘Ã­ch BÃ o Tinh â†’ chá»‰ cÃ²n lÃ´ ÄÃƒ Sáº¤Y 2 (k2, k5) â€” áº©n lÃ´ Sáº¥y 1 + ChÆ°a sáº¥y', (() => {
  document.getElementById('x2-kho-purpose').value = 'baotinh';
  x2.renderX2KhoLotsList();
  const h = document.getElementById('x2-kho-lots-list').innerHTML;
  return h.includes(lotById('k2').code) && h.includes(lotById('k5').code) &&
    ['k1', 'k3', 'k6'].every(id => h.includes(lotById(id).code) === false);
})());
check('Lá»ŒC: dÃ²ng trá»‘ng nÃªu rÃµ "chá»‰ nháº­n lÃ´ Sáº¥y 1" + hiá»‡n dÃ²ng "Äang lá»c"', (() => {
  state.batches = state.batches.filter(b => ['k2', 'k5'].includes(b.id));
  document.getElementById('x2-kho-purpose').value = 'say2';   // phiáº¿u Sáº¥y 2 â†’ chá»‰ nháº­n lÃ´ Sáº¥y 1
  x2.renderX2KhoLotsList();
  const h = document.getElementById('x2-kho-lots-list').innerHTML;
  state.batches = lotsWithDry.slice();
  document.getElementById('x2-kho-purpose').value = 'khac';
  return h.includes('al-filter-note') && h.includes('Äang lá»c') &&
    h.includes('chá»‰ nháº­n lÃ´ Sáº¥y 1') && h.includes('KhÃ´ng cÃ³ lÃ´ Sáº¥y 1');
})());
check('Lá»ŒC: má»¥c Ä‘Ã­ch "KhÃ¡c" â†’ hiá»‡n Äá»¦ má»i lÃ´ (k1, k3, k6) â€” Ä‘Æ°á»ng thoÃ¡t khi cáº§n xuáº¥t lÃ´ chÆ°a rÃµ', (() => {
  x2.renderX2KhoLotsList();
  const h = document.getElementById('x2-kho-lots-list').innerHTML;
  return ['k1', 'k3', 'k6'].every(id => h.includes(lotById(id).code));
})());
check('Lá»ŒC: khoPurposeDryNeed bÃ¡m Ä‘Ãºng Ã´ Má»¥c ÄÃ­ch Xuáº¥t (baotinh/bullig=say2 Â· say2=say1 Â· khac=rá»—ng)', (() => {
  const purposeEl = document.getElementById('x2-kho-purpose');
  const val = v => { purposeEl.value = v; return x2.khoPurposeDryNeed(); };
  return val('baotinh') === 'say2' && val('bullig') === 'say2' &&
    val('say2') === 'say1' && val('khac') === '';
})());
check('Äá»”I Má»¤C ÄÃCH: chá»n lÃ´ ChÆ°a sáº¥y á»Ÿ má»¥c Ä‘Ã­ch "KhÃ¡c" â†’ Ä‘á»•i sang BÃ o Tinh thÃ¬ lÃ´ bá»‹ bá» (khÃ´ng chá»n nháº§m)', (() => {
  x2.renderX2KhoLotsList();
  x2.khoPickLot('k1');
  const countEl = document.getElementById('x2-kho-picked-count');
  if (!countEl || countEl.textContent !== '1 Ä‘Ã£ chá»n') return false;
  document.getElementById('x2-kho-purpose').value = 'baotinh';
  x2.khoOnPurposeChange();
  return countEl.textContent === 'ChÆ°a chá»n';
})());
check('Äá»”I Má»¤C ÄÃCH: helper Ä‘á»c Ä‘Ãºng lÃ´ Ä‘ang á»ž cÃ´ng Ä‘oáº¡n Sáº¥y 1 / Sáº¥y 2 (khÃ´ng lá»‡ch)', (() => {
  const lot1 = { id: 'x1', stage: 'say1', stageHistory: [{ stage: 'say1', date: '2026-09-01' }] };
  const lot2 = { id: 'x2', stage: 'say2', stageHistory: [{ stage: 'say1', date: '2026-09-01' }, { stage: 'say2', date: '2026-09-05' }] };
  return x2.khoLotDryStatusOf(lot1).key === 'say1' && x2.khoLotDryStatusOf(lot2).key === 'say2';
})());
// tráº£ láº¡i Ä‘Ãºng 4 lÃ´ máº«u cho cÃ¡c má»¥c kiá»ƒm thá»­ phÃ­a dÆ°á»›i
state.batches = lotsWithDry.filter(b => ['k1', 'k2', 'k3', 'k4'].includes(b.id));
x2.resetX2KhoNoteForm(true);
document.getElementById('x2-kho-purpose').value = 'khac';

const quickPaste = x2.parseKhoBulkPaste([
  'DÃ i (mm)\tRá»™ng\tDÃ y\tA\tA1\tB',
  '1250\t22\t9\t5\t\t',
  '1250\t18\t8\t\t3\t',
  '1250\t22\t9\t5\t\t'
].join('\r\n'));
check('NHáº¬P NHANH: dÃ¡n nhiá»u dÃ²ng nháº­n tiÃªu Ä‘á» vÃ  chiá»u dÃ i láº·p',
  !quickPaste.error && quickPaste.rows.length === 3 && quickPaste.items.length === 3 &&
  quickPaste.items[0].length === 1250 && quickPaste.items[1].length === 1250 &&
  quickPaste.items[0].width !== quickPaste.items[1].width);
check('NHáº¬P NHANH: dÃ²ng trÃ¹ng hoÃ n toÃ n váº«n Ä‘Æ°á»£c giá»¯ thÃ nh lÃ´ riÃªng',
  quickPaste.items.length === 3 &&
  JSON.stringify(quickPaste.items[0]) === JSON.stringify(quickPaste.items[2]));
function makeBulkPasteRow() {
  const inputs = {
    'dim:length': { value: '' }, 'dim:width': { value: '' }, 'dim:thickness': { value: '' },
    'qty:A': { value: '' }, 'qty:A1': { value: '' }, 'qty:B': { value: '' }
  };
  const row = {
    querySelector(selector) {
      const match = selector.match(/data-x2-kho-bulk-(dim|qty)="([^"]+)"/);
      return match ? inputs[`${match[1]}:${match[2]}`] : null;
    }
  };
  Object.entries(inputs).forEach(([key, input]) => {
    input.closest = selector => selector === '[data-x2-kho-bulk-row]' ? row
      : (key === 'dim:length' && selector === 'input[data-x2-kho-bulk-dim="length"]' ? input : null);
  });
  return row;
}
const bulkPasteBody = {
  rows: [makeBulkPasteRow()],
  querySelectorAll() { return this.rows; },
  insertAdjacentHTML() { this.rows.push(makeBulkPasteRow()); }
};
const originalGetElementById = document.getElementById;
const originalSetTimeout = global.setTimeout;
document.getElementById = id => id === 'x2-kho-bulk-rows' ? bulkPasteBody : originalGetElementById(id);
global.setTimeout = () => 0;
try {
  let pastePrevented = false;
  x2.khoBulkOnPaste({
    target: bulkPasteBody.rows[0].querySelector('[data-x2-kho-bulk-dim="length"]'),
    clipboardData: { getData: () => '1250\t22\t9\t5\t\t\n1250\t18\t8\t\t3\t' },
    preventDefault() { pastePrevented = true; }
  });
  check('NHáº¬P NHANH: dÃ¡n trá»±c tiáº¿p táº¡o thÃªm dÃ²ng vÃ  Ä‘iá»n Ä‘Ãºng cÃ¡c cá»™t',
    pastePrevented && bulkPasteBody.rows.length === 2 &&
    bulkPasteBody.rows[0].querySelector('[data-x2-kho-bulk-qty="A"]').value === '5' &&
    bulkPasteBody.rows[1].querySelector('[data-x2-kho-bulk-dim="length"]').value === '1250' &&
    bulkPasteBody.rows[1].querySelector('[data-x2-kho-bulk-qty="A1"]').value === '3');
  const pastedValuesBeforeError = bulkPasteBody.rows.map(row =>
    ['length', 'width', 'thickness'].map(key => row.querySelector(`[data-x2-kho-bulk-dim="${key}"]`).value)
      .concat(['A', 'A1', 'B'].map(type => row.querySelector(`[data-x2-kho-bulk-qty="${type}"]`).value)));
  x2.khoBulkOnPaste({
    target: bulkPasteBody.rows[0].querySelector('[data-x2-kho-bulk-dim="length"]'),
    clipboardData: { getData: () => '1250\t22\t9\t-1\t\t' },
    preventDefault() { pastePrevented = true; }
  });
  const pastedValuesAfterError = bulkPasteBody.rows.map(row =>
    ['length', 'width', 'thickness'].map(key => row.querySelector(`[data-x2-kho-bulk-dim="${key}"]`).value)
      .concat(['A', 'A1', 'B'].map(type => row.querySelector(`[data-x2-kho-bulk-qty="${type}"]`).value)));
  check('NHáº¬P NHANH: dá»¯ liá»‡u lá»—i khÃ´ng ghi Ä‘Ã¨ má»™t pháº§n báº£ng kÃª',
    JSON.stringify(pastedValuesAfterError) === JSON.stringify(pastedValuesBeforeError));
} finally {
  document.getElementById = originalGetElementById;
  global.setTimeout = originalSetTimeout;
}
const invalidQuickPaste = x2.parseKhoBulkPaste([
  'DÃ i (mm)\tRá»™ng\tDÃ y\tA\tA1\tB',
  '1250\t22\t9\t1.5\t\t'
].join('\n'));
check('NHáº¬P NHANH: bÃ¡o Ä‘Ãºng dÃ²ng khi sá»‘ lÆ°á»£ng dÃ¡n khÃ´ng nguyÃªn',
  invalidQuickPaste.error.includes('DÃ²ng 2') && invalidQuickPaste.error.includes('sá»‘ nguyÃªn'));
const x2EventsSource = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('NHáº¬P NHANH: giao diá»‡n hÆ°á»›ng dáº«n dÃ¡n tá»« Ã´ DÃ i vÃ  sá»± kiá»‡n paste Ä‘Æ°á»£c ná»‘i',
  indexSource.includes('chá»n Ã´ DÃ i rá»“i dÃ¡n báº£ng') &&
  x2EventsSource.includes("safeOn('x2-kho-bulk-rows', 'paste', khoBulkOnPaste)"));

// â”€â”€â”€ A. Tá»’N KHO THEO Láº¦N NHáº¬P (chÆ°a cÃ³ phiáº¿u nÃ o) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('Tá»’N: sá»‘ láº§n NHáº¬P kho â€” k1=1 Â· k2=2 (ra/vÃ o 1 láº§n) Â· k3=1',
  utils.khoInCountOf(state.batches[0]) === 1 && utils.khoInCountOf(state.batches[1]) === 2 &&
  utils.khoInCountOf(state.batches[2]) === 1);
check('Tá»’N: sá»‘ láº§n RA KHá»ŽI kho â€” k2=1 (say2 sau kho) Â· k1=0',
  utils.khoOutRoundCountOf(state.batches[1]) === 1 && utils.khoOutRoundCountOf(state.batches[0]) === 0);
check('Tá»’N: khÃ´ng phiáº¿u â†’ tá»“n kho 2.200 (k2 nháº­p 2 láº§n Ã— 400) Â· toÃ n nhÃ³m 2.700 (500 Ä‘ang sáº¥y + 2.200 tá»“n kho) Â· khÃ´ng lÃ´ háº¿t',
  utils.khoStockSummary().remainingThanh === 2200 && utils.khoStockSummary().poolThanh === 2700 &&
  utils.khoStockSummary().usedUpLots === 0 && utils.khoStockSummary().liveLots === 3);
check('Tá»’N: báº£n Ä‘á»“ áº©n/hiá»‡n â€” khÃ´ng lÃ´ nÃ o bá»‹ áº©n, tá»“n tá»«ng lÃ´ Ä‘Ãºng',
  utils.khoVisibilityMap().hide.size === 0 && utils.khoVisibilityMap().remain.get('k1') === 600);

// â”€â”€â”€ B. PHIáº¾U XUáº¤T: chá» duyá»‡t KHÃ”NG trá»« tá»“n â†’ duyá»‡t má»›i trá»« (FIFO) â”€â”€
// PHIáº¾U XUáº¤T KHÃ”NG CÃ’N Ã” Sá» LÆ¯á»¢NG: tá»•ng = Î£ thanh cá»§a cÃ¡c THáºº LÃ” Ä‘Ã£ gáº¯n.
// Helper: reset form â†’ set ngÃ y/má»¥c Ä‘Ã­ch â†’ gáº¯n tháº» lÃ´ (kÃ¨m sá»‘ náº¿u muá»‘n).
function makeExportNote(date, purpose, noteText, lotPicks) {
  x2.setKhoNoteType('xuat');
  x2.resetX2KhoNoteForm(true);
  document.getElementById('x2-kho-date').value = date;
  document.getElementById('x2-kho-purpose').value = purpose;
  document.getElementById('x2-kho-note').value = noteText || '';
  (lotPicks || []).forEach(([id, qty]) => {
    x2.khoPickLot(id);                       // chá»n = nguyÃªn pháº§n cÃ²n láº¡i cá»§a lÃ´
    if (qty != null) x2.khoSetLotQty(id, qty);  // chá»‰nh xuá»‘ng 1 pháº§n (VD 300/600)
  });
  x2.handleKhoNoteSubmit({ preventDefault(){} });
}
makeExportNote('2026-09-15', 'baotinh', 'Xuáº¥t bÃ o tinh tuáº§n 38', [['k1', 300]]);
const note1 = state.khoNotes[0];
check('PHIáº¾U: gá»­i phiáº¿u xuáº¥t 300 â†’ tráº¡ng thÃ¡i CHá»œ DUYá»†T + ghi ngÆ°á»i táº¡o',
  !!note1 && note1.status === 'cho_duyet' && note1.type === 'xuat' && note1.purpose === 'baotinh' &&
  note1.createdBy === 'admin' && note1.qty === 300);
check('PHIáº¾U: chá» duyá»‡t KHÃ”NG trá»« tá»“n (váº«n 2.200) + chip chá» = 1 phiáº¿u / 300 thanh',
  utils.khoStockSummary().remainingThanh === 2200 &&
  utils.khoStockSummary().pendingCount === 1 && utils.khoStockSummary().pendingQty === 300);
x2.khoApproveNote(note1.id);
check('PHIáº¾U: Admin duyá»‡t â†’ ÄÃƒ DUYá»†T + tá»“n giáº£m cÃ²n 1.900 + ngÆ°á»i duyá»‡t Ä‘Æ°á»£c ghi',
  note1.status === 'da_duyet' && utils.khoStockSummary().remainingThanh === 1900 &&
  note1.approvedByName === 'admin');
check('FIFO: 300 trá»« lÃ´ VÃ€O KHO LÃ‚U NHáº¤T trÆ°á»›c (k1) â€” k1 cÃ²n 300, k2/k3 nguyÃªn',
  utils.khoLotRemainingOf(state.batches[0]) === 300 &&
  utils.khoLotRemainingOf(state.batches[1]) === 800 && utils.khoLotRemainingOf(state.batches[2]) === 800);
check('Káº¾ HOáº CH: tá»“n nan TOÃ€N NHÃ“M (cÃ´ng thá»©c má»›i) = 500 (Ä‘ang sáº¥y) + 1.900 (tá»“n kho sau phiáº¿u) = 2.400',
  utils.khoStockSummary().poolThanh === 2400);

// PHIáº¾U purpose 'say2' â€” trá»« Tá»’N KHO nhÆ°ng KHÃ”NG trá»« tá»“n nan toÃ n nhÃ³m
makeExportNote('2026-09-15', 'say2', 'Quay láº¡i sáº¥y', [['k2', 400]]);
const noteSay2 = state.khoNotes[1];
x2.khoApproveNote(noteSay2.id);
check('Sáº¤Y 2: duyá»‡t phiáº¿u "Sáº¥y 2" â†’ tá»“n Kho giáº£m cÃ²n 1.500 Â· toÃ n nhÃ³m 2.400 â†’ 2.000 (phiáº¿u trá»« theo tá»“n kho tá»«ng lÃ´)',
  utils.khoStockSummary().remainingThanh === 1500 && utils.khoStockSummary().poolThanh === 2000);

// CHáº¶N XUáº¤T Vá»šI Tá»’N (lÃºc gá»­i)
const notesBefore = state.khoNotes.length;
x2.setKhoNoteType('xuat');
x2.resetX2KhoNoteForm(true);
document.getElementById('x2-kho-date').value = '2026-09-15';
document.getElementById('x2-kho-purpose').value = 'baotinh';
x2.handleKhoNoteSubmit({ preventDefault(){} });
check('CHáº¶N: phiáº¿u xuáº¥t chÆ°a gáº¯n tháº» lÃ´ â†’ KHÃ”NG táº¡o phiáº¿u (váº«n ' + notesBefore + ' phiáº¿u)',
  state.khoNotes.length === notesBefore);

// LÃ´ DÃ™NG Háº¾T â†’ áº¨N máº·c Ä‘á»‹nh + cÃ´ng táº¯c hiá»‡n láº¡i (xuáº¥t ná»‘t pháº§n cÃ²n láº¡i cá»§a k1)
makeExportNote('2026-09-15', 'baotinh', '', [['k1']]);
x2.khoApproveNote(state.khoNotes[state.khoNotes.length - 1].id);
check('LÃ” Háº¾T: xuáº¥t ná»‘t 300 cá»§a k1 â†’ k1 tá»“n 0, Ä‘áº¿m "lÃ´ Ä‘Ã£ xuáº¥t háº¿t" = 1',
  utils.khoLotRemainingOf(state.batches[0]) === 0 && utils.khoStockSummary().usedUpLots === 1);
check('LÃ” Háº¾T: áº¨N máº·c Ä‘á»‹nh (hide cÃ³ k1) â€” báº­t cÃ´ng táº¯c â†’ hiá»‡n láº¡i',
  utils.khoVisibilityMap().hide.has('k1') && !utils.khoVisibilityMap().hide.has('k2'));
x2.khoSetShowUsed(true);
check('LÃ” Háº¾T: cÃ´ng táº¯c Báº¬T â†’ khÃ´ng áº©n lÃ´ nÃ o + lÆ°u localStorage',
  utils.khoVisibilityMap().hide.size === 0 && state.khoShowUsed === true);
x2.khoSetShowUsed(false);

// QUYá»€N DUYá»†T: editor (Tá»• trÆ°á»Ÿng â€” cÃ³ quyá»n nháº­p CÃ´ng Äoáº¡n) KHÃ”NG duyá»‡t Ä‘Æ°á»£c
state.currentUser = { username: 'editor1', role: 'editor', editTabs: ['kanban'], allowAdvanced: false };
makeExportNote('2026-09-16', 'bullig', '', [['k2', 100]]);
const noteEditor = state.khoNotes[state.khoNotes.length - 1];
x2.khoApproveNote(noteEditor.id);
check('QUYá»€N: editor gá»­i phiáº¿u Ä‘Æ°á»£c nhÆ°ng KHÃ”NG duyá»‡t Ä‘Æ°á»£c (váº«n chá» duyá»‡t)',
  noteEditor.status === 'cho_duyet');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
x2.khoRejectNote(noteEditor.id);
check('QUYá»€N: Admin tá»« chá»‘i phiáº¿u â†’ tráº¡ng thÃ¡i Tá»ª CHá»I (khÃ´ng trá»« tá»“n)',
  noteEditor.status === 'tu_choi' && utils.khoStockSummary().remainingThanh === 1200);

// â”€â”€â”€ C. PHIáº¾U Xá»¬ LÃ Lá»–I (tiÃªu há»§y / tÃ¡i cháº¿) + Tá»’N TRUNG GIAN â”€â”€
state.xuong2BulligRecords = [
  { id: 'bl1', kind: 'ct', date: '2026-09-16', inSizeKey: '1240Ã—16Ã—6', inDims: [1240, 16, 6], qtyOk: 100, qtyErr: 60, createdAt: '2026-09-16T02:00:00.000Z' }
];
state.xuong2ChonNanThoRecords = [
  { id: 'cnr', baothoId: 'bt-x', date: '2026-09-16', dims: [1250, 18, 7], sizeKey: '1250Ã—18Ã—7', cls: 'reject', quantity: 50, unitVol: 0.0001575, volume: 0.0079, createdAt: '2026-09-16T02:00:00.000Z' }
];
check('WIP Má»šI: tá»“n lá»—i Chá»n thanh Bullig = 60 thanh (trÆ°á»›c Ä‘Ã¢y KHÃ”NG cÃ³ sá»•)',
  x2.bulligDefectStock().length === 1 && x2.bulligDefectStock()[0].remaining === 60);
check('WIP Má»šI: tá»“n nan "Loáº¡i háº³n" Chá»n Nan ThÃ´ = 50 thanh (trÆ°á»›c Ä‘Ã¢y chá»‰ tÃ­nh tá»· lá»‡)',
  x2.nanRejectStock().length === 1 && x2.nanRejectStock()[0].remaining === 50);
// Phiáº¿u TIÃŠU Há»¦Y 20 thanh lá»—i Bullig (cá»¡ 1240Ã—16Ã—6)
x2.setKhoNoteType('xu_ly');
document.getElementById('x2-kho-date').value = '2026-09-17';
document.getElementById('x2-kho-source').value = 'bullig_loi';
document.getElementById('x2-kho-method').value = 'tieu_huy';
document.getElementById('x2-kho-size').value = '1240Ã—16Ã—6';
document.getElementById('x2-kho-qty').value = '20';
document.getElementById('x2-kho-note').value = 'Thanh cong queo';
x2.handleKhoNoteSubmit({ preventDefault(){} });
const scr1 = state.khoNotes[state.khoNotes.length - 1];
x2.khoApproveNote(scr1.id);
check('TIÃŠU Há»¦Y: duyá»‡t phiáº¿u 20 thanh lá»—i Bullig â†’ tá»“n lá»—i cÃ²n 40 (Ä‘Ã£ cÃ³ sá»• xá»­ lÃ½)',
  scr1.type === 'tieuhuy' && scr1.status === 'da_duyet' && x2.bulligDefectStock()[0].remaining === 40);
// Cháº·n vÆ°á»£t tá»“n lá»—i
document.getElementById('x2-kho-qty').value = '999';
const scrCountBefore = state.khoNotes.length;
x2.handleKhoNoteSubmit({ preventDefault(){} });
check('TIÃŠU Há»¦Y: cháº·n vÆ°á»£t tá»“n lá»—i cá»§a cá»¡ (khÃ´ng táº¡o phiáº¿u)',
  state.khoNotes.length === scrCountBefore);
// Phiáº¿u TÃI CHáº¾ nan "Loáº¡i háº³n" 10 thanh
document.getElementById('x2-kho-source').value = 'nan_loai_han';
document.getElementById('x2-kho-method').value = 'taiche';
document.getElementById('x2-kho-size').value = '1250Ã—18Ã—7';
document.getElementById('x2-kho-qty').value = '10';
x2.handleKhoNoteSubmit({ preventDefault(){} });
x2.khoApproveNote(state.khoNotes[state.khoNotes.length - 1].id);
check('TÃI CHáº¾: phiáº¿u tÃ¡i cháº¿ 10 nan Loáº¡i háº³n â†’ tá»“n cÃ²n 40',
  x2.nanRejectStock()[0].remaining === 40);
// Thanh lá»—i BÃ€O TINH: trá»« phiáº¿u xá»­ lÃ½ (tá»“n lá»—i cá»§a lÆ°á»£t bÃ o tinh á»Ÿ trÃªn)
state.xuong2BaoTinhRecords = [
  { id: 'bt1', kind: 'tinh', date: '2026-09-16', sources: [{ batchId: 'k3', qty: 500 }], qtyOk: 480, qtyErr: 20, outSizeKey: '1230Ã—14Ã—5', createdAt: '2026-09-16T02:00:00.000Z' }
];
document.getElementById('x2-kho-source').value = 'baotinh_loi';
document.getElementById('x2-kho-method').value = 'tai_che';
document.getElementById('x2-kho-size').value = '1230Ã—14Ã—5';
document.getElementById('x2-kho-qty').value = '5';
x2.handleKhoNoteSubmit({ preventDefault(){} });
x2.khoApproveNote(state.khoNotes[state.khoNotes.length - 1].id);
check('Lá»–I BÃ€O TINH: tá»“n lá»—i 20 âˆ’ tÃ¡i cháº¿ 5 = 15 (baoTinhDefectStock trá»« phiáº¿u Ä‘Ã£ duyá»‡t)',
  x2.baoTinhDefectStock().find(x => x.sizeKey === '1230Ã—14Ã—5').remaining === 15);

// Thanh TÃ³p: chá»©c nÄƒng Ä‘Ã£ chuyá»ƒn sang tháº» gá»™p Xá»­ lÃ½ lá»—i / BÃ³ Thanh TÃ³p
const baoTinhRecordsBeforeTopTest = (state.xuong2BaoTinhRecords || []).slice();
state.xuong2BaoTinhRecords = [
  ...baoTinhRecordsBeforeTopTest,
  { id: 'bt-top', kind: 'tinh', date: '2026-09-17', qtyTop: 30, qtyOk: 470, qtyErr: 20,
    batchDims: [1250, 22, 9], batchSizeKey: '1250Ã—22Ã—9',
    inDims: [1250, 22, 9], inSizeKey: '1250Ã—22Ã—9',
    outDims: [1240, 16, 6], outSizeKey: '1240Ã—16Ã—6',
    createdAt: '2026-09-17T02:00:00.000Z' }
];
check('THANH Tá»P THEO Cá» : truy váº¿t kÃ­ch thÆ°á»›c TRÆ¯á»šC BÃ€O 1250Ã—22Ã—9, khÃ´ng dÃ¹ng cá»¡ sau bÃ o',
  x2.baoTinhTopSizeRows().some(row => row.sizeKey === '1250Ã—22Ã—9' && row.remaining === 30) &&
  !x2.baoTinhTopSizeRows().some(row => row.sizeKey === '1240Ã—16Ã—6'));
check('CHUYá»‚N THáºº: thao tÃ¡c BÃ³ Thanh TÃ³p náº±m trong tháº» Xá»­ lÃ½ lá»—i, Kho khÃ´ng cÃ²n form tÃ¡i cháº¿ TÃ³p',
  x2.X2_CARD_DEFS['x2-xu-ly-loi-card'] &&
  typeof x2.switchX2XuLyLoiTab === 'function');
x2.switchX2XuLyLoiTab('top');
check('BÃ“ TÃ“P: Ã´ CÃ´ng Äoáº¡n Xá»­ lÃ½ lá»—i cÃ³ 5 lá»±a chá»n vÃ  táº¡o nhiá»u lÃ´',
  document.getElementById('x2-xl-kind') &&
  typeof x2.handleX2TopBundleSubmit === 'function');
state.xuong2BaoTinhRecords = baoTinhRecordsBeforeTopTest;

// â”€â”€â”€ D. Äá»I CHIáº¾U + RÃ€ SOÃT Sá»” KHO (bÃ¹ dá»¯ liá»‡u cÅ©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('Äá»I CHIáº¾U: há»‡ thá»‘ng suy ra k3 = 500 (lÆ°á»£t bÃ o tinh) â€” phiáº¿u gáº¯n k3 chÆ°a cÃ³ â†’ lá»‡ch +500',
  utils.khoDerivedOutOf('k3') === 500 && utils.khoStockSummary().mismatchThanh > 400);
const notesBeforeBackfill = state.khoNotes.length;
x2.khoBackfillFromLegacy(); // confirm() stub tráº£ true
// RÃ  soÃ¡t: k3 thiáº¿u phiáº¿u BÃ o Tinh â†’ sinh 1 phiáº¿u bÃ¹ 'khac'. k2 ÄÃƒ cÃ³ phiáº¿u 'say2'
// (ngÃ y 15/09) nÃªn KHÃ”NG sinh thÃªm (trÆ°á»›c Ä‘Ã¢y bÃ¹ mÃ¹ theo ngÃ y tháº­t â†’ sinh trÃ¹ng).
const backfill = state.khoNotes.find(n => n && n.status === 'da_duyet' && n.type === 'xuat' &&
  String(n.purposeNote || '').includes('Khá»Ÿi táº¡o tá»« dá»¯ liá»‡u cÅ©') &&
  (n.lots || []).some(l => String(l.batchId) === 'k3'));
check('RÃ€ SOÃT (D4): sinh phiáº¿u bÃ¹ ÄÃƒ DUYá»†T gáº¯n Ä‘Ãºng lÃ´ k3 (500 thanh, ngÃ y = ngÃ y lÆ°á»£t BÃ o Tinh)', (() => {
  const btDate = (state.xuong2BaoTinhRecords || []).find(r => r && r.kind === 'tinh' &&
    (r.sources || []).some(s => String(s.batchId) === 'k3'))?.date || '';
  return !!backfill && backfill.status === 'da_duyet' && backfill.lots[0].batchId === 'k3' && backfill.lots[0].qty === 500 &&
    backfill.date === btDate && backfill.note.includes('RÃ  soÃ¡t sá»• kho') &&
    state.khoNotes.length === notesBeforeBackfill + 1;
})());
check('RÃ€ SOÃT: snapshot vá»‹ trÃ­ lÃ´ lÃºc bÃ¹ (lots[0].loc = K13) Ä‘á»ƒ kiá»ƒm chá»©ng',
  !!backfill && backfill.lots[0].loc === 'K13');
x2.khoBackfillFromLegacy(); // cháº¡y láº§n 2 â†’ KHÃ”NG sinh trÃ¹ng
check('RÃ€ SOÃT: cháº¡y láº§n 2 KHÃ”NG sinh trÃ¹ng (sá»‘ phiáº¿u giá»¯ nguyÃªn)',
  state.khoNotes.length === notesBeforeBackfill + 1);
check('Äá»I CHIáº¾U: sau khi rÃ  soÃ¡t â†’ lá»‡ch â‰ˆ 0 (chá»‰ cÃ²n sai sá»‘ lÃ m trÃ²n)',
  Math.abs(utils.khoStockSummary().mismatchThanh) < 2);
// k2 Ä‘Ã£ cÃ³ phiáº¿u xuáº¥t say2 do ngÆ°á»i dÃ¹ng táº¡o (15/09) â†’ rÃ  soÃ¡t KHÃ”NG táº¡o thÃªm phiáº¿u
// say2 trÃ¹ng cho cÃ¹ng láº§n Ä‘i; phiáº¿u tá»± Ä‘á»™ng chá»‰ sinh khi cÃ²n THIáº¾U.
check('RÃ€ SOÃT: KHÃ”NG sinh phiáº¿u say2 trÃ¹ng cho k2 (Ä‘Ã£ cÃ³ phiáº¿u say2 ngÃ y 15/09)', (() => {
  const say2Notes = state.khoNotes.filter(n => n && n.status === 'da_duyet' && n.type === 'xuat' && n.purpose === 'say2' &&
    (n.lots || []).some(l => String(l.batchId) === 'k2'));
  return say2Notes.length === 1 && say2Notes[0].date === '2026-09-15';
})());

// â”€â”€â”€ E. Sá»” NHáº¬P/XUáº¤T + PLANNING (trá»« tá»“n theo phiáº¿u ÄÃƒ DUYá»†T) â”€â”€
const ledger = utils.khoLedgerEvents();
check('Sá»”: 4 dÃ²ng NHáº¬P (k1 1 láº§n Â· k2 2 láº§n Â· k3 1 láº§n) â€” dÃ²ng cá»§a k2 ghi rÃµ "Láº§n"',
  ledger.inRows.length === 4 && ledger.inRows.some(r => r.lotId === 'k2' && r.round === 2));
check('Sá»”: dÃ²ng XUáº¤T = cÃ¡c phiáº¿u ÄÃƒ DUYá»†T (phiáº¿u chá»/tá»« chá»‘i khÃ´ng vÃ o sá»•)',
  ledger.outRows.length === utils.khoApprovedXuatNotes().length);
check('Sá»”: dÃ²ng Äá»I CHIáº¾U cÃ³ "quay láº¡i Sáº¥y 2" cá»§a k2 (ngÃ y 2026-09-13, 400 thanh)',
  ledger.derived.some(d => d.kind === 'say2' && d.lotId === 'k2' && d.qty === 400));
// Tá»“n cuá»‘i ká»³ TÃNH NGÆ¯á»¢C â€” nhÃ³m ngÃ y 09-10 (k1 nháº­p Ä‘áº§u tiÃªn)
const planning = await import('../js/planning.js');
state.planningItems = []; // bá» káº¿ hoáº¡ch cÅ© Ä‘á»ƒ tÃ­nh tá»“n thuáº§n
const tonByWeek = planning.getPlanningTonByWeek ? planning.getPlanningTonByWeek(new Date().getFullYear()) : null;
check('PLANNING: getPlanningTonByWeek cháº¡y Ä‘Æ°á»£c vá»›i nguá»“n phiáº¿u kho (khÃ´ng lá»—i)',
  tonByWeek !== null && typeof tonByWeek === 'object');

// â”€â”€â”€ F. RENDER THáºº + MINI CARD + Sá»” THEO Ká»² â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.renderX2KhoCard();
check('THáºº: má»Ÿ tháº» Kho Nan tráº£ vá» true (pop-up báº­t, khÃ´ng lá»—i render)',
  x2.x2OpenCard('x2-kho-card') === true &&
  document.getElementById('x2-detail-overlay').classList.contains('show'));
check('THáºº: thanh tá»“n in "Tá»“n Kho:" + chip "phiáº¿u chá» duyá»‡t" khi cÃ³ phiáº¿u chá»',
  document.getElementById('x2-kho-stock-bar').innerHTML.includes('Tá»“n Kho:'));
check('THáºº: khá»‘i WIP cÃ³ dÃ²ng "Thanh lá»—i BÃ o Tinh" + dÃ²ng "Thanh lá»—i Chá»n thanh Bullig"',
  document.getElementById('x2-kho-wip-bar').innerHTML.includes('Thanh lá»—i BÃ o Tinh') &&
  document.getElementById('x2-kho-wip-bar').innerHTML.includes('Thanh lá»—i Chá»n thanh Bullig'));
check('THáºº: mini card Ä‘áº¿m "Tá»“n â€¦ thanh" (sá»‘ tá»“n thá»±c sau cÃ¡c phiáº¿u)',
  /^Tá»“n [\d.,]+ thanh$/.test(document.getElementById('x2-mini-count-kho').textContent));
check('Sá»”: tháº» ngÃ y cÃ³ báº£ng NHáº¬P (Láº§n) + báº£ng XUáº¤T + dÃ²ng chÃº thÃ­ch "ra/vÃ o kho NHIá»€U Láº¦N"', (() => {
  const h = document.getElementById('x2-kho-day-cards').innerHTML;
  return h.includes('NHáº¬P KHO') && h.includes('XUáº¤T KHO') && h.includes('ra/vÃ o kho NHIá»€U Láº¦N');
})());
check('Sá»” XUáº¤T: cÃ³ cá»™t Vá»‹ trÃ­ + nÃºt Má»Ÿ láº¡i/XÃ³a cho admin (kiá»ƒu A) + dÃ²ng ghi rÃµ sá»‘ tá»«ng lÃ´', (() => {
  const h = document.getElementById('x2-kho-day-cards').innerHTML;
  return h.includes('<th>Vá»‹ trÃ­</th>') && h.includes('data-kho-reopen=') && h.includes('data-kho-ledger-del=') &&
    h.includes('Má»Ÿ láº¡i') && h.includes('data-admin-only');
})());
// Ghi nháº­n id phiáº¿u bÃ¹ k3 Ä‘á»ƒ kiá»ƒm Má»ž Láº I á»Ÿ cuá»‘i tá»‡p (trÃ¡nh Ä‘á»•i tá»“n giá»¯a chá»«ng
// lÃ m lá»‡ch cÃ¡c kiá»ƒm thá»­ Báº¢NG Tá»’N / Sá»” Lá»†CH á»Ÿ dÆ°á»›i).
const khoReopenBackfillId = backfill && backfill.id;
x2.setKhoPeriodMode('tuan');
check('Sá»”: gáº¡t TUáº¦N â†’ tiÃªu Ä‘á» ká»³ dáº¡ng "Tuáº§n N / NNNN"',
  document.getElementById('x2-kho-day-cards').innerHTML.includes('Tuáº§n'));
x2.setKhoPeriodMode('thang');
check('Sá»”: gáº¡t THÃNG â†’ tiÃªu Ä‘á» ká»³ dáº¡ng "ThÃ¡ng MM/YYYY"',
  document.getElementById('x2-kho-day-cards').innerHTML.includes('ThÃ¡ng'));
x2.setKhoPeriodMode('day');
x2.khoSetShowUsed(true); // phiáº¿u bÃ¹ má»›i trá»« háº¿t k2 â†’ báº­t cÃ´ng táº¯c Ä‘á»ƒ váº«n tháº¥y dÃ²ng k2
check('Báº¢NG Tá»’N: má»—i lÃ´ 1 dÃ²ng + chip "ra/vÃ o" trÃªn lÃ´ quay láº¡i (k2)',
  document.getElementById('x2-kho-stock-rows').innerHTML.includes('260911-01') &&
  document.getElementById('x2-kho-stock-rows').innerHTML.includes('ra/vÃ o 1 láº§n'));
x2.khoSetShowUsed(false);
// THáºº LÃ” Gáº®N PHIáº¾U: cÃ¹ng máº«u tháº» nguá»“n Than HÃ³a + Sáº¥y (mÃ£ Â· tá»“n Â· badge S1/S2/K, bá» ngÃ y vÃ o kho)
x2.renderX2KhoLotsList();
check('THáºº LÃ”: dÃ²ng 1 cÃ³ mÃ£ lÃ´ + tá»“n (cÃ²n X thanh) Â· dÃ²ng 2 cÃ³ chip DÃ¹ng cho + badge S1/S2/K (máº«u Than HÃ³a + Sáº¥y)', (() => {
  const h = document.getElementById('x2-kho-lots-list').innerHTML;
  return h.includes('kho-lot-card') && h.includes('kho-lot-line1') && h.includes('kho-lot-line2') &&
    /26091\d-01/.test(h) && h.includes('cÃ²n') && h.includes('thanh') &&
    h.includes('al-use-tag') && h.includes('al-day-badge day-s1') &&
    h.includes('al-day-badge day-s2') && h.includes('al-day-badge day-k') &&
    /S1-\d+ ngÃ y/.test(h) && /S2-\d+ ngÃ y/.test(h) && /K-\d+ ngÃ y/.test(h);
})());
check('THáºº LÃ”: Bá»Ž dÃ²ng "vÃ o kho dd/mm/yy" (giá»¯ mÃ£ + tá»“n + chip ra/vÃ o kho)', (() => {
  const h = document.getElementById('x2-kho-lots-list').innerHTML;
  return h.includes('kho-round-badge') && h.includes('ra/vÃ o kho') &&
    h.includes('kho-in-date') === false && /vÃ o kho \d{1,2}\/\d{1,2}\/\d{2}/.test(h) === false;
})());
check('THáºº LÃ”: KHÃ”NG láº·p badge ngÃ y â€” má»—i tháº» chá»‰ 1 badge S1 + 1 badge S2 + 1 badge K (á»Ÿ dÃ²ng 2)', (() => {
  const h = document.getElementById('x2-kho-lots-list').innerHTML;
  const cards = h.split('kho-lot-card').slice(1);
  if (!cards.length) return false;
  return cards.every(c =>
    (c.match(/al-day-badge day-s1/g) || []).length === 1 &&
    (c.match(/al-day-badge day-s2/g) || []).length === 1 &&
    (c.match(/al-day-badge day-k/g) || []).length === 1 &&
    c.indexOf('kho-lot-line1') < c.indexOf('al-day-badge day-s1'));
})());
check('THáºº LÃ”: helper khoStageDaysOf tÃ­nh Ä‘Ãºng ngÃ y S1/S2/K theo lá»‹ch sá»­ cÃ´ng Ä‘oáº¡n', (() => {
  const d1 = x2.khoStageDaysOf(state.batches[0]);
  const d2 = x2.khoStageDaysOf(state.batches[1]);
  return d1 && d2 && typeof d1.say1 === 'number' && typeof d1.say2 === 'number' && typeof d1.kho === 'number' &&
    typeof d2.say1 === 'number' && typeof d2.say2 === 'number' && typeof d2.kho === 'number';
})());
// GIAI ÄOáº N 2 (05/10/2026): báº£n Ä‘á»“ VÃ™NG Dá»® LIá»†U thÃªm 8 tháº» XÆ¯á»žNG 1 â†’ 18;
// THáºº Cáº®T VÃN (09/10/2026) â†’ 19 Â· THáºº BÃ€O VÃN (09/10/2026) â†’ 20.
// THáºº Há»– TRá»¢ + CÃ”NG ÄOáº N Láºº (10/10/2026) â†’ 21.
// Nguá»“n XUáº¤T EXCEL 13 â†’ 21 (17/10/2026: thÃªm 8 tháº» XÆ°á»Ÿng 1 â€” trÆ°á»›c Ä‘Ã¢y nÃºt
// "Xuáº¥t Dá»¯ Liá»‡u" cá»§a tháº» X1 rÆ¡i vá» 'batch' nÃªn xuáº¥t nháº§m LÃ´ nan).
const X2_IDS = ['x2-bo-luong-card', 'x2-cut-card', 'x2-bo-ong-card', 'x2-bao-tho-card',
  'x2-chon-nan-tho-card', 'x2-than-hoa-card', 'x2-kho-card', 'x2-bao-tinh-card',
  'x2-bullig-card', 'x2-xu-ly-loi-card', 'x2-ho-tro-card', 'x2-ep-van-card'];
const X1_IDS = ['x1-cat-ong-card', 'x1-say-sinh-card', 'x1-boc-card', 'x1-loc-ong-card',
  'x1-cat-mat-card', 'x1-bo-card', 'x1-phoi-say-card', 'x1-loc-thanh-card', 'x1-kho-card',
  'x1-nan-plan-card'];
check('DÃ™NG CHUNG: tháº» Xá»­ lÃ½ lá»—i thay 2 tháº» cÅ© + 9 tháº» X1 Ä‘á»§ vÃ¹ng dá»¯ liá»‡u + nguá»“n xuáº¥t',
  Object.keys(x2.X2_CARD_EXPORT_SOURCE).length === 25 &&
  Object.keys(x2.X2_CARD_HISTORY_DOMAIN).length === 25 &&
  [...X2_IDS, ...X1_IDS].every(id => !!x2.X2_CARD_HISTORY_DOMAIN[id] && !!x2.X2_CARD_EXPORT_SOURCE[id]) &&
  x2.X2_CARD_EXPORT_SOURCE['x2-kho-card'] === 'kho' &&
  x2.X2_CARD_HISTORY_DOMAIN['x2-ho-tro-card'] === 'xuong2HoTroRecords' &&
  x2.X2_CARD_EXPORT_SOURCE['x2-ho-tro-card'] === 'hotro' &&
  x2.X2_CARD_EXPORT_SOURCE['x1-cat-ong-card'] === 'x1catong' &&
  x2.X2_CARD_EXPORT_SOURCE['x1-loc-thanh-card'] === 'x1locthanh' &&
  x2.X2_CARD_EXPORT_SOURCE['x1-nan-plan-card'] === 'x1nanplan');

// â”€â”€â”€ F3. Sá»¬A Lá»–I 06/10/2026: cháº·n theo Tá»ªNG LÃ” Â· Sá»” Lá»†CH KHÃ”NG KHÃ“A Â· NÃšT THU Gá»ŒN â”€â”€
// (a) Sá»” Lá»†CH (honestThanh = 0 do phiáº¿u bÃ¹ cÅ© gáº¯n lÃ´ ÄÃƒ Rá»œI kho) NHÆ¯NG lÃ´ á»Ÿ Kho váº«n
//     cÃ²n tá»“n â†’ PHáº¢I táº¡o Ä‘Æ°á»£c phiáº¿u (trÆ°á»›c Ä‘Ã¢y cháº·n tá»•ng kho â†’ khÃ´ng phiáº¿u nÃ o táº¡o Ä‘Æ°á»£c)
{
  state.batches.push({ id: 'k-ghost-out', code: 'GHOST-01', stage: 'say1', date: '2026-09-01',
    length: 1250, width: 18, thickness: 7, quantity: 99999, location: 'S1G',
    stageHistory: [{ stage: 'say1', date: '2026-09-01' }] });
  state.khoNotes.push({ id: 'note-ghost', type: 'xuat', purpose: 'baotinh', status: 'da_duyet',
    date: '2026-09-01', qty: 99999, lots: [{ batchId: 'k-ghost-out', qty: 99999 }] });
  const lotK3 = state.batches.find(b => b.id === 'k3');
  const remK3 = utils.khoLotRemainingOf(lotK3);
  check('Sá»” Lá»†CH: honestThanh = 0 (phiáº¿u bÃ¹ gáº¯n lÃ´ Ä‘Ã£ rá»i kho) NHÆ¯NG lÃ´ Kho váº«n cÃ²n tá»“n',
    utils.khoStockSummary().honestThanh === 0 && remK3 > 0);
  x2.setKhoNoteType('xuat');
  x2.resetX2KhoNoteForm(true);
  document.getElementById('x2-kho-date').value = '2026-09-25';
  document.getElementById('x2-kho-purpose').value = 'baotinh';
  x2.khoPickLot('k3');
  const nBefore = state.khoNotes.length;
  x2.handleKhoNoteSubmit({ preventDefault(){} });
  check('Sá»” Lá»†CH: váº«n Táº O ÄÆ¯á»¢C phiáº¿u gáº¯n lÃ´ cÃ²n tá»“n (khÃ´ng cÃ²n cháº·n "VÆ°á»£t tá»“n kháº£ dá»¥ng 0 thanh")',
    state.khoNotes.length === nBefore + 1);
  // dá»n dá»¯ liá»‡u giáº£
  state.khoNotes = state.khoNotes.filter(n => n && n.id !== 'note-ghost');
  state.batches = state.batches.filter(b => b && b.id !== 'k-ghost-out');
  x2.resetX2KhoNoteForm(true);
}
// (b) CHáº¶N THEO Tá»ªNG LÃ”: phiáº¿u gáº¯n lÃ´ VÆ¯á»¢T pháº§n cÃ²n láº¡i cá»§a CHÃNH lÃ´ Ä‘Ã³ â†’ bá»‹ tá»« chá»‘i
{
  x2.setKhoNoteType('xuat');
  x2.resetX2KhoNoteForm(true);
  document.getElementById('x2-kho-date').value = '2026-09-26';
  document.getElementById('x2-kho-purpose').value = 'baotinh';
  x2.khoPickLot('k3');                                  // qty = toÃ n bá»™ tá»“n k3 táº¡i thá»i Ä‘iá»ƒm chá»n
  // Giáº£ láº­p: tá»“n lÃ´ k3 giáº£m SAU KHI ÄÃƒ CHá»ŒN (phiáº¿u khÃ¡c Ä‘Æ°á»£c duyá»‡t trÆ°á»›c)
  const capK3 = utils.khoLotRemainingOf(state.batches.find(b => b.id === 'k3'));
  state.khoNotes.push({ id: 'note-shrink', type: 'xuat', purpose: 'baotinh', status: 'da_duyet',
    date: '2026-09-20', qty: capK3, lots: [{ batchId: 'k3', qty: capK3 }] });
  const nBefore = state.khoNotes.length;
  x2.handleKhoNoteSubmit({ preventDefault(){} });
  check('CHáº¶N THEO LÃ”: phiáº¿u ghi vÆ°á»£t tá»“n CÃ’N Láº I cá»§a lÃ´ k3 â†’ KHÃ”NG táº¡o phiáº¿u',
    state.khoNotes.length === nBefore);
  check('CHáº¶N THEO LÃ”: khoLotsOverflow tráº£ Ä‘Ãºng lÃ´ + lÃ½ do (k3, qty > cap)',
    (() => {
      const bad = x2.khoLotsOverflow([{ batchId: 'k3', qty: capK3 }]);
      return bad.length === 1 && bad[0].id === 'k3' && bad[0].cap === 0;
    })());
  check('CHáº¶N THEO LÃ”: phiáº¿u Ä‘Ã£ duyá»‡t gáº¯n lÃ´ vÆ°á»£t tá»“n â†’ khoApproveCheckError tráº£ lá»—i (khÃ´ng duyá»‡t Ä‘Æ°á»£c)',
    typeof x2.khoApproveCheckError(state.khoNotes.find(n => n.id === 'note-shrink')) === 'string');
  check('CHáº¶N THEO LÃ”: phiáº¿u gáº¯n lÃ´ cÃ²n tá»“n â†’ khoApproveCheckError tráº£ null (duyá»‡t Ä‘Æ°á»£c)',
    x2.khoApproveCheckError(state.khoNotes.find(n => n.type === 'xuat' && n.lots && n.lots.length &&
      n.id !== 'note-shrink' && x2.khoLotsOverflow(n.lots).length === 0)) === null);
// (b2) LÃ´ táº¡o tá»« Báº¢NG KÃŠ trong tháº» Kho pháº£i gÃ¡n TRáº NG THÃI Sáº¤Y theo má»¥c Ä‘Ã­ch â€”
  //      náº¿u khÃ´ng, lÃ´ má»›i bá»‹ coi lÃ  "ChÆ°a sáº¥y" vÃ  sáº½ biáº¿n máº¥t khá»i phiáº¿u BÃ o
  //      Tinh / Bullig á»Ÿ láº§n chá»n sau (14/11/2026).
  const beforeBatches = state.batches.slice();
  const beforeNotes = state.khoNotes;
  x2.resetX2KhoNoteForm(true);
  document.getElementById('x2-kho-date').value = '2026-09-30';
  document.getElementById('x2-kho-purpose').value = 'baotinh';
  const bulkValues = {
    '[data-x2-kho-bulk-dim="length"]': { value: '1330' },
    '[data-x2-kho-bulk-dim="width"]': { value: '20' },
    '[data-x2-kho-bulk-dim="thickness"]': { value: '9' },
    '[data-x2-kho-bulk-qty="A"]': { value: '100' },
    '[data-x2-kho-bulk-qty="A1"]': { value: '' },
    '[data-x2-kho-bulk-qty="B"]': { value: '' }
  };
  const bulkRow = { querySelector: (selector) => bulkValues[selector] || null };
  document.getElementById('x2-kho-bulk-rows').querySelectorAll = (selector) =>
    selector === '[data-x2-kho-bulk-row]' ? [bulkRow] : [];
  x2.toggleKhoBulkEntry();   // báº­t cháº¿ Ä‘á»™ "Táº¡o lÃ´ má»›i theo báº£ng kÃª"
  const notesBeforeBulk = state.khoNotes.length;
  x2.handleKhoNoteSubmit({ preventDefault(){} });
  const bulkNew = state.batches.find(b => b.code && b.code.startsWith('260930') &&
    b.location === '' && b.dryStage === 'say2');
  check('Báº¢NG KÃŠ: lÃ´ má»›i cá»§a phiáº¿u BÃ o Tinh Ä‘Æ°á»£c gÃ¡n dryStage "say2" (khÃ´ng bá»‹ máº¥t á»Ÿ láº§n chá»n sau)',
    !!bulkNew && bulkNew.dryStage === 'say2' && bulkNew.stage === 'kho');
  check('Báº¢NG KÃŠ: phiáº¿u + lÃ´ má»›i Ä‘Ã£ Ä‘Æ°á»£c táº¡o tháº­t', state.khoNotes.length === notesBeforeBulk + 1);
  // dá»n: bá» lÃ´ má»›i + phiáº¿u vá»«a táº¡o Ä‘á»ƒ khÃ´ng lá»‡ch cÃ¡c má»¥c kiá»ƒm thá»­ phÃ­a dÆ°á»›i
  state.batches = bulkNew ? beforeBatches.filter(b => b && b.id !== bulkNew.id) : beforeBatches;
  state.khoNotes = beforeNotes;
  x2.resetX2KhoNoteForm(true);   // cÅ©ng tá»± táº¯t cháº¿ Ä‘á»™ báº£ng kÃª
  // dá»n: tráº£ tá»“n k3 vá» nhÆ° cÅ©
  state.khoNotes = state.khoNotes.filter(n => n && n.id !== 'note-shrink');
  x2.resetX2KhoNoteForm(true);
}
// (c) NÃšT THU Gá»ŒN: pháº£i gáº¯n class x2-cut-collapsed (CHUáº¨N cá»§a .x2-cut-table-wrap) â€”
//     trÆ°á»›c Ä‘Ã¢y gáº¯n rate-table-collapsed (CSS chá»‰ Ã¡p .planning-card) â†’ báº¥m khÃ´ng Äƒn
{
  x2.toggleX2KhoTable();
  const collapsed = document.getElementById('x2-kho-table-wrap').classList.contains('x2-cut-collapsed');
  x2.toggleX2KhoTable();
  const expanded = !document.getElementById('x2-kho-table-wrap').classList.contains('x2-cut-collapsed');
  check('NÃšT THU Gá»ŒN Sá»”: báº¥m â†’ wrap #x2-kho-table-wrap gáº¯n class x2-cut-collapsed (áº©n báº£ng) â†’ báº¥m láº¡i má»Ÿ', collapsed && expanded);
  x2.toggleX2KhoStockTable();
  const st1 = document.getElementById('x2-kho-stock-wrap').classList.contains('x2-cut-collapsed');
  x2.toggleX2KhoStockTable();
  const st2 = !document.getElementById('x2-kho-stock-wrap').classList.contains('x2-cut-collapsed');
  check('NÃšT THU Gá»ŒN Tá»’N: báº¥m â†’ wrap #x2-kho-stock-wrap gáº¯n class x2-cut-collapsed â†’ báº¥m láº¡i má»Ÿ', st1 && st2);
  check('NÃšT THU Gá»ŒN: khÃ´ng cÃ²n dÃ­nh class rate-table-collapsed (nguyÃªn nhÃ¢n cÅ©)',
    !fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8')
      .includes("toggle('rate-table-collapsed'"));
}

// â”€â”€â”€ F2. Láº¬P PHIáº¾U XUáº¤T KÃˆM NHIá»€U LÃ” Má»šI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const previousBatches = state.batches;
  const previousNotes = state.khoNotes;
  state.batches = [];
  state.khoNotes = [];
  const date = '2026-10-24';
  x2.resetX2KhoNoteForm(false);
  x2.setKhoNoteType('xuat');
  document.getElementById('x2-kho-date').value = date;
  document.getElementById('x2-kho-purpose').value = 'baotinh';
  const values = {
    '[data-x2-kho-bulk-dim="length"]': { value: '1250' },
    '[data-x2-kho-bulk-dim="width"]': { value: '22' },
    '[data-x2-kho-bulk-dim="thickness"]': { value: '9' },
    '[data-x2-kho-bulk-qty="A"]': { value: '1000' },
    '[data-x2-kho-bulk-qty="A1"]': { value: '750' },
    '[data-x2-kho-bulk-qty="B"]': { value: '' }
  };
  const row = { querySelector: (selector) => values[selector] || null };
  document.getElementById('x2-kho-bulk-rows').querySelectorAll = (selector) =>
    selector === '[data-x2-kho-bulk-row]' ? [row] : [];
  x2.toggleKhoBulkEntry();
  x2.handleKhoNoteSubmit({ preventDefault(){} });
  const note = state.khoNotes.find(n => n.type === 'xuat' && n.status === 'cho_duyet');
  const created = state.batches.slice();
  check('PHIáº¾U XUáº¤T NHANH: tá»± táº¡o cÃ¡c lÃ´ A/A1 á»Ÿ Kho vÃ  gáº¯n Ä‘á»§ sá»‘ lÆ°á»£ng vÃ o cÃ¹ng phiáº¿u chá» duyá»‡t',
    note && note.qty === 1750 && note.lots.length === 2 &&
    created.length === 2 && created.every(b => b.stage === 'kho' && b.location === '' &&
      b.stageHistory.length === 1 && b.stageHistory[0].stage === 'kho') &&
    note.lots.every(l => created.some(b => b.id === l.batchId && b.quantity === l.qty)));
  state.batches = previousBatches;
  state.khoNotes = previousNotes;
}

// â”€â”€â”€ G. Cáº¤U TRÃšC (index.html Â· js Â· sw.js Â· npm test) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const jsState = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsStorage = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const jsEvents = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const jsPlanning = fs.readFileSync(new URL('../js/planning.js', import.meta.url), 'utf8');
const jsXlsx = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const cssCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
// â”€â”€â”€ F2. TRÃŒNH BÃ€Y Láº I THANH Tá»’N (A) + KHUNG VÃ™NG .x2-zone (B/C) â”€â”€â”€â”€
check('Tá»’N TOÃ€N NHÃ“M (cÃ´ng thá»©c má»›i): = sá»‘ lÃ´ Ä‘ang sáº¥y + tá»“n kho â†’ KHÃ”NG BAO GIá»œ vá» 0 vÃ´ nghÄ©a', (() => {
  const s = utils.khoStockSummary();
  return s.poolThanh === s.poolSayThanh + s.remainingThanh && s.poolSayThanh === 500 && s.poolThanh > s.remainingThanh;
})());
check('THANH Tá»’N: 3 Ã´ KPI â€” "Tá»“n Kho:" Â· "Äang sáº¥y:" Â· "Tá»•ng trong nhÃ  mÃ¡y:" (giáº£i thÃ­ch chá»‰ á»Ÿ tooltip)', (() => {
  const h = document.getElementById('x2-kho-stock-bar').innerHTML;
  return h.includes('Tá»“n Kho:') && h.includes('Äang sáº¥y:') && h.includes('Tá»•ng trong nhÃ  mÃ¡y:') &&
    h.includes('kho-kpi') && h.includes('title="') &&
    h.includes('Tá»“n nan toÃ n nhÃ³m') === false && h.includes('Äá»‘i chiáº¿u lá»‡ch') === false;
})());
check('THá»NG KÃŠ Kho: thÃªm Ã´ "Äang sáº¥y" + "Tá»•ng trong nhÃ  mÃ¡y" Â· nhÃ£n "Thiáº¿u phiáº¿u kho" thay "Äá»‘i chiáº¿u lá»‡ch"', (() => {
  const st = document.getElementById('x2-kho-stats').innerHTML;
  return st.includes('Äang sáº¥y (S1+S2)') && st.includes('Tá»•ng trong nhÃ  mÃ¡y') &&
    st.includes('Thiáº¿u phiáº¿u kho') && st.includes('title="') && st.includes('Äá»‘i chiáº¿u lá»‡ch') === false;
})());
check('VÃ™NG: Tháº» Kho Nan cÃ³ ÄÃšNG 5 khung .x2-zone + 5 header Ä‘Ã¡nh sá»‘ (mÃ´ táº£ náº±m trong title)', (() => {
  const slice = idxHtml.slice(idxHtml.indexOf('id="x2-kho-card"'), idxHtml.indexOf('id="x2-bao-tinh-card"'));
  return (slice.match(/class="x2-zone"/g) || []).length === 5 &&
    (slice.match(/class="x2-zone-head"/g) || []).length === 5 && slice.includes('title="');
})());
check('VÃ™NG: tháº» BÃ o Tinh Ä‘Æ°á»£c bá»c 3 khung (Nháº­p Liá»‡u Â· Thá»‘ng KÃª Â· Lá»‹ch Sá»­)', (() => {
  const slice = idxHtml.slice(idxHtml.indexOf('id="x2-bao-tinh-card"'), idxHtml.indexOf('id="x2-ep-van-card"'));
  return (slice.match(/class="x2-zone"/g) || []).length === 3;
})());
check('VÃ™NG: head thanh trong khung tab (Than HÃ³a Â· Ã‰p VÃ¡n) + CSS .x2-zone/.kho-kpi + RÃ€ SOÃT Sá»” KHO', (() => {
  const jsXuong2 = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
  return idxHtml.includes('x2-zone-bar') && cssCss.includes('.x2-zone {') && cssCss.includes('.kho-kpi {') &&
    jsXuong2.includes('khoLedgerEvents().derived') && jsXuong2.includes('RÃ  soÃ¡t sá»• kho') &&
    jsXuong2.includes('khoReopenNote') && jsXuong2.includes('data-kho-reopen');
})());
check('Cáº¤U TRÃšC (index.html): mini card + tháº» Kho Nan Ä‘á»§ khá»‘i (tá»“n Â· WIP Â· phiáº¿u Â· sá»• Â· tá»“n)',
  idxHtml.includes('data-x2-card="x2-kho-card"') && idxHtml.includes('id="x2-kho-card"') &&
  idxHtml.includes('id="x2-kho-stock-bar"') && idxHtml.includes('id="x2-kho-wip-bar"') &&
  idxHtml.includes('id="x2-kho-note-form"') && idxHtml.includes('id="x2-kho-pending-rows"') &&
  idxHtml.includes('id="x2-kho-day-cards"') && idxHtml.includes('id="x2-kho-stock-rows"') &&
  idxHtml.includes('<option value="top_other">Thanh TÃ³p</option>') &&
  idxHtml.includes('data-x2-card="x2-xu-ly-loi-card"') &&
  idxHtml.includes('id="x2-error-top-panel"') &&
  idxHtml.includes('id="x2-xl-top-rows"') &&
  idxHtml.includes('Vá»‹ trÃ­ (tham kháº£o)') &&
  idxHtml.includes('id="btn-kho-add-manual"'));
check('Cáº¤U TRÃšC (js): key riÃªng + ná»‘i Ä‘á»§ state/storage/cloud/history/main/events',
  jsState.includes('bamboo_tracker_kho_notes_v1') && jsStorage.includes('restoreKhoNotes') &&
  jsCloud.includes('khoNotes') && jsHistory.includes('khoNotes') &&
  jsMain.includes('loadKhoNotes') && jsEvents.includes('x2-kho-note-form'));
check('Cáº¤U TRÃšC (planning.js): getNanStockEvents trá»« tá»“n theo PHIáº¾U ÄÃƒ DUYá»†T (khÃ´ng cÃ²n trá»« lÆ°á»£t bÃ o tinh)',
  jsPlanning.includes('khoApprovedXuatNotes') && jsPlanning.includes("khoNormPurpose(n.purpose) !== 'say2'"));
check('Cáº¤U TRÃšC (kanban.js): cá»™t Kho dÃ¹ng tá»“n tháº­t + áº¨N lÃ´ Ä‘Ã£ xuáº¥t háº¿t',
  fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8').includes('khoVisibilityMap') &&
  fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8').includes('kho-card-remain'));
check('Cáº¤U TRÃšC (export-xlsx.js): cÃ³ nguá»“n xuáº¥t "kho" + dÃ¹ng khoLedgerEvents/khoStockSummary',
  jsXlsx.includes("id: 'kho'") && jsXlsx.includes('khoLedgerEvents'));
check('NHáº¬P NHANH PHIáº¾U XUáº¤T: cÃ³ báº£ng kÃª nhiá»u dÃ²ng vÃ  Ä‘iá»u khiá»ƒn thÃªm dÃ²ng',
  idxHtml.includes('id="x2-kho-bulk-toggle"') && idxHtml.includes('id="x2-kho-bulk-rows"') &&
  idxHtml.includes('id="x2-kho-bulk-add-row"') && jsEvents.includes('x2-kho-bulk-toggle'));
check('Cáº¤U TRÃšC (sw.js): Ä‘Ã£ tÄƒng CACHE_NAME v486', /nha-may-ngoc-son-v486/.test(swJs));
check('Cáº¤U TRÃšC (styles.css): cÃ³ khá»‘i KHO NAN (badge Â· chip Â· báº£ng sá»• Â· tháº» lÃ´)',
  cssCss.includes('.kho-type-btn') && cssCss.includes('.kho-day-card') && cssCss.includes('.kho-lot-card'));
check('Cáº¤U TRÃšC (package.json): tests/kho.test.mjs Ä‘Ã£ vÃ o npm test',
  pkg.scripts.test.includes('tests/kho.test.mjs'));

// â”€â”€â”€ H. Má»ž Láº I PHIáº¾U ÄÃƒ DUYá»†T (kiá»ƒu A â€” lÃ´ RIÃŠNG Ä‘á»ƒ khÃ´ng lá»‡ch tá»“n chung) â”€â”€
check('Má»ž Láº I (kiá»ƒu A): táº¡o phiáº¿u riÃªng 200 thanh â†’ duyá»‡t â†’ má»Ÿ láº¡i â†’ tá»“n há»“i Ä‘Ãºng 200', (() => {
  state.batches.push({ id: 'k-reopen', code: '260927-99', stage: 'kho', date: '2026-09-27', week: '2026-W39',
    length: 1250, width: 18, thickness: 7, quantity: 200, volume: 0.0315, bambooType: 'A', useFor: 'VÃ¡n',
    location: 'K99', stageHistory: [{ stage: 'kho', date: '2026-09-27' }] });
  const lot = () => state.batches.find(b => b && b.id === 'k-reopen');
  x2.setKhoNoteType('xuat');
  x2.resetX2KhoNoteForm(true);
  document.getElementById('x2-kho-date').value = '2026-09-27';
  document.getElementById('x2-kho-purpose').value = 'baotinh';
  x2.khoPickLot('k-reopen');
  x2.handleKhoNoteSubmit({ preventDefault(){} });
  const nid = (state.khoNotes[state.khoNotes.length - 1] || {}).id;
  x2.khoApproveNote(nid);
  if (utils.khoLotRemainingOf(lot()) !== 0) return false;
  x2.khoReopenNote(nid);
  const n = state.khoNotes.find(x => x && x.id === nid);
  return n && n.status === 'cho_duyet' && utils.khoLotRemainingOf(lot()) === 200;
})());
check('Má»ž Láº I: Ã´ chá»n lÃ´ khi sá»­a váº«n tháº¥y lÃ´ trong phiáº¿u (ká»ƒ cáº£ tá»“n 0) Ä‘á»ƒ thÃªm/bá»›t', (() => {
  x2.renderX2KhoLotsList();
  return document.getElementById('x2-kho-lots-list').innerHTML.includes('260927-99');
})());
check('Má»ž Láº I: duyá»‡t láº¡i phiáº¿u riÃªng â†’ tá»“n trá»« Ä‘Ãºng 200 (kiá»ƒu A Ä‘á»§ vÃ²ng)', (() => {
  const nid = (state.khoNotes.find(n => n && (n.lots || []).some(l => String(l.batchId) === 'k-reopen')) || {}).id;
  x2.khoApproveNote(nid);
  const n = state.khoNotes.find(x => x && x.id === nid);
  return n && n.status === 'da_duyet' && utils.khoLotRemainingOf(state.batches.find(b => b.id === 'k-reopen')) === 0;
})());

// â”€â”€â”€ E2. NGÆ¯á»œI DUYá»†T TRÃŠN PHIáº¾U KHO (14/11/2026) â”€â”€
check('NGÆ¯á»œI DUYá»†T: form cÃ³ Ã´ riÃªng Â· phiáº¿u hiá»‡n "NgÆ°á»i duyá»‡t" Â· duyá»‡t tá»± Ä‘iá»n Â· sá»•/Excel cÃ³ cá»™t',
  idxHtml.includes('id="x2-kho-approver"') &&
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('if (!n.approverName) n.approverName = n.approvedByName') &&
  fs.readFileSync(new URL('../js/utils.js', import.meta.url), 'utf8').includes('approverName: n.approverName') &&
  fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8').includes("'NgÆ°á»i Duyá»‡t'"));
state.batches.push({ id: 'k-ap', code: '261101-55', stage: 'kho', date: '2026-10-10', week: '2026-W41',
  length: 1250, width: 18, thickness: 7, quantity: 500, volume: 0.079, bambooType: 'A', useFor: 'VÃ¡n',
  location: 'K55', dryStage: 'say2', stageHistory: [{ stage: 'kho', date: '2026-10-10' }] });
// (a) ghi sáºµn trÃªn form â†’ duyá»‡t GIá»® nguyÃªn ngÆ°á»i Ä‘Ã£ ghi
x2.resetX2KhoNoteForm(true);
document.getElementById('x2-kho-date').value = '2026-10-11';
document.getElementById('x2-kho-purpose').value = 'baotinh';
document.getElementById('x2-kho-approver').value = 'Nguyá»…n VÄƒn A';
x2.khoPickLot('k-ap');
x2.khoSetLotQty('k-ap', 100);
x2.handleKhoNoteSubmit({ preventDefault(){} });
const apNote = state.khoNotes[state.khoNotes.length - 1];
check('Phiáº¿u kho ghi Ä‘Æ°á»£c NgÆ°á»i Duyá»‡t nháº­p tay trÃªn form', apNote.approverName === 'Nguyá»…n VÄƒn A');
x2.khoApproveNote(apNote.id);
check('Duyá»‡t GIá»® nguyÃªn NgÆ°á»i Duyá»‡t Ä‘Ã£ ghi (khÃ´ng ghi Ä‘Ã¨ ngÆ°á»i báº¥m Duyá»‡t)',
  state.khoNotes.find(nnn => nnn.id === apNote.id).approverName === 'Nguyá»…n VÄƒn A');
// (b) phiáº¿u KHÃ”NG ghi â†’ lÆ°u rá»—ng Â· hiá»‡n "NgÆ°á»i duyá»‡t: â€”" Â· duyá»‡t tá»± Ä‘iá»n ngÆ°á»i báº¥m
makeExportNote('2026-10-12', 'baotinh', 'KhÃ´ng ghi ngÆ°á»i duyá»‡t', [['k-ap', 100]]);
const ap2 = state.khoNotes[state.khoNotes.length - 1];
check('Phiáº¿u khÃ´ng ghi NgÆ°á»i Duyá»‡t â†’ lÆ°u rá»—ng (khÃ´ng bá»‹a tÃªn)', ap2.approverName === '');
x2.renderX2KhoPending();
check('Phiáº¿u chá» duyá»‡t hiá»‡n dÃ²ng "NgÆ°á»i duyá»‡t"',
  document.getElementById('x2-kho-pending-rows').innerHTML.includes('NgÆ°á»i duyá»‡t'));
// (c) sá»­a phiáº¿u náº¡p sáºµn + cáº­p nháº­t; LÃ m Má»›i Form xÃ³a Ã´
x2.khoEditNote(ap2.id);
check('Sá»­a phiáº¿u náº¡p sáºµn Ã´ NgÆ°á»i Duyá»‡t',
  document.getElementById('x2-kho-approver').value === (ap2.approverName || ''));
document.getElementById('x2-kho-approver').value = 'Tráº§n Thá»‹ B';
x2.handleKhoNoteSubmit({ preventDefault(){} });
check('Sá»­a phiáº¿u cáº­p nháº­t NgÆ°á»i Duyá»‡t',
  state.khoNotes.find(nnn => nnn.id === ap2.id).approverName === 'Tráº§n Thá»‹ B');
x2.resetX2KhoNoteForm(true);
check('LÃ m Má»›i Form xÃ³a Ã´ NgÆ°á»i Duyá»‡t',
  document.getElementById('x2-kho-approver').value === '');
x2.khoApproveNote(ap2.id);
check('Duyá»‡t GIá»® NgÆ°á»i Duyá»‡t Ä‘Ã£ sá»­a (chá»‰ tá»± Ä‘iá»n khi cÃ²n trá»‘ng)',
  state.khoNotes.find(nnn => nnn.id === ap2.id).approverName === 'Tráº§n Thá»‹ B');
// (d) phiáº¿u hoÃ n toÃ n khÃ´ng ghi â†’ duyá»‡t Tá»° ÄIá»€N ngÆ°á»i báº¥m
makeExportNote('2026-10-13', 'baotinh', 'KhÃ´ng ghi ngÆ°á»i duyá»‡t láº§n 2', [['k-ap', 100]]);
const ap3 = state.khoNotes[state.khoNotes.length - 1];
x2.khoApproveNote(ap3.id);
check('Duyá»‡t tá»± Ä‘iá»n NgÆ°á»i Duyá»‡t = tÃ i khoáº£n Ä‘ang Ä‘Äƒng nháº­p',
  state.khoNotes.find(nnn => nnn.id === ap3.id).approverName === 'admin');

// â”€â”€â”€ D2. PHIáº¾U XUáº¤T Sáº¤Y 2 Tá»° Äá»˜NG + Cáº¢NH BÃO VÆ¯á»¢T Sá» LÆ¯á»¢NG (17/10/2026) â”€â”€
state.batches.push({ id: 'k-auto', code: '260930-77', stage: 'kho', date: '2026-09-30', week: '2026-W40',
  length: 1250, width: 18, thickness: 9, quantity: 1000, volume: 0.2025, bambooType: 'B', useFor: 'VÃ¡n',
  location: 'K77', stageHistory: [{ stage: 'kho', date: '2026-09-30' }] });
const autoLot = state.batches.find(b => b.id === 'k-auto');
const autoBefore = state.khoNotes.length;
const auto1 = x2.addKhoSay2AutoNote(autoLot, 1000, '2026-10-02', 'move');
check('AUTO: táº¡o phiáº¿u xuáº¥t "say2" ÄÃƒ DUYá»†T, qty = Sá» LÆ¯á»¢NG CHUáº¨N, autoSay2 = true (khÃ´ng cáº§n duyá»‡t tay)',
  !!auto1 && auto1.type === 'xuat' && auto1.purpose === 'say2' && auto1.status === 'da_duyet' &&
  auto1.qty === 1000 && auto1.autoSay2 === true && auto1.lots[0].batchId === 'k-auto' &&
  auto1.note.includes('Tá»± Ä‘á»™ng'));
check('AUTO: gá»i láº§n 2 CÃ™NG NGÃ€Y â†’ KHÃ”NG sinh trÃ¹ng (váº«n 1 phiáº¿u)',
  x2.addKhoSay2AutoNote(autoLot, 1000, '2026-10-02', 'move') === null && state.khoNotes.length === autoBefore + 1);
// LÃ´ quay láº¡i Kho: Kho 30/09 â†’ Sáº¥y 2 02/10 â†’ Kho 05/10 â‡’ 2 láº§n nháº­p kho
autoLot.stage = 'say2';
autoLot.stageHistory.push({ stage: 'say2', date: '2026-10-02' });
autoLot.stage = 'kho';
autoLot.stageHistory.push({ stage: 'kho', date: '2026-10-05' });
check('AUTO: lÃ´ quay láº¡i Kho â†’ Tá»’N KHÃ”NG bá»‹ nhÃ¢n Ä‘Ã´i (2 láº§n nháº­p Ã— 1.000 âˆ’ phiáº¿u say2 1.000 = 1.000)',
  utils.khoInCountOf(autoLot) === 2 && utils.khoLotRemainingOf(autoLot) === 1000);
check('AUTO: phiáº¿u tá»± Ä‘á»™ng KHÃ”NG má»Ÿ láº¡i Ä‘Æ°á»£c (bÃ¡o lá»—i, giá»¯ nguyÃªn ÄÃƒ DUYá»†T)', (() => {
  x2.khoReopenNote(auto1.id);
  return state.khoNotes.find(n => n.id === auto1.id).status === 'da_duyet';
})());
// Phiáº¿u vÆ°á»£t sá»©c chá»©a lÃ´ (bÃ¹ cÅ©) â†’ Cáº¢NH BÃO chá»© khÃ´ng im láº·ng káº¹p tá»“n vá» 0
state.batches.push({ id: 'k-over', code: '261001-99', stage: 'kho', date: '2026-10-01', week: '2026-W40',
  length: 1250, width: 18, thickness: 7, quantity: 100, volume: 0.0158, bambooType: 'A', useFor: 'VÃ¡n',
  location: 'K99B', stageHistory: [{ stage: 'kho', date: '2026-10-01' }] });
const overLot = state.batches.find(b => b.id === 'k-over');
state.khoNotes.push({ id: 'over-1', type: 'xuat', status: 'da_duyet', purpose: 'khac', date: '2026-10-08',
  qty: 150, lots: [{ batchId: 'k-over', qty: 150 }], createdBy: 'system', createdByName: 'Há»‡ thá»‘ng (khá»Ÿi táº¡o)' });
check('Cáº¢NH BÃO: phiáº¿u vÆ°á»£t sá»©c chá»©a lÃ´ â†’ khoOverAllocOf = pháº§n vÆ°á»£t + khoStockSummary Ä‘áº¿m lÃ´ vÆ°á»£t',
  utils.khoOverAllocOf(overLot) === 50 && utils.khoStockSummary().overThanh >= 50 && utils.khoStockSummary().overLots >= 1);
check('Cáº¢NH BÃO: cÃ³ CSS + markup chip "phiáº¿u vÆ°á»£t" trong tháº» lÃ´/báº£ng tá»“n',
  cssCss.includes('.kho-over-badge') &&
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('kho-over-badge'));
// RÃ  soÃ¡t D1: phiáº¿u há»‡ thá»‘ng TRÃ™NG y há»‡t â†’ giá»¯ báº£n Ä‘áº§u, xÃ³a báº£n sau
state.khoNotes.push({ id: 'dup-a', type: 'xuat', status: 'da_duyet', purpose: 'khac', date: '2026-10-07',
  qty: 100, lots: [{ batchId: 'k-auto', qty: 100 }], createdBy: 'system', createdByName: 'Há»‡ thá»‘ng (khá»Ÿi táº¡o)' });
state.khoNotes.push({ id: 'dup-b', type: 'xuat', status: 'da_duyet', purpose: 'khac', date: '2026-10-07',
  qty: 100, lots: [{ batchId: 'k-auto', qty: 100 }], createdBy: 'system', createdByName: 'Há»‡ thá»‘ng (khá»Ÿi táº¡o)' });
const dupPlan = x2.khoReconcilePlan();
check('RÃ€ SOÃT (D1): phÃ¡t hiá»‡n phiáº¿u há»‡ thá»‘ng TRÃ™NG y há»‡t (giá»¯ báº£n Ä‘áº§u, xÃ³a báº£n sau)',
  dupPlan.dupIds.includes('dup-b') && !dupPlan.dupIds.includes('dup-a'));
check('AUTO â€” Cáº¤U TRÃšC: form phiáº¿u xuáº¥t KHÃ”NG cÃ²n lá»±a chá»n "Sáº¥y 2 (sáº¥y láº¡i)" + batch-modals gá»i phiáº¿u tá»± Ä‘á»™ng (3 luá»“ng Sáº¥y 2 Â· 2 luá»“ng TÃ³p)',
  !idxHtml.includes('Sáº¥y 2 (sáº¥y láº¡i)') &&
  (fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8').match(/addKhoSay2AutoNote\(/g) || []).length === 4 &&
  (fs.readFileSync(new URL('../js/batch-modals.js', import.meta.url), 'utf8').match(/addKhoReworkAutoNote\(/g) || []).length === 2);

// â”€â”€â”€ D3. Cáº¢NH BÃO: MISMATCH áº¢O + D2 TRÃ™NG PHIáº¾U + CHá»T Lá»†CH (17/10/2026) â”€â”€
// (a) LÃ´ Ä‘ang Sáº¥y 2 ÄÃƒ cÃ³ phiáº¿u Sáº¥y 2 â†’ khÃ´ng cÃ²n bá»‹ coi lÃ  "thiáº¿u phiáº¿u"
state.batches.push({ id: 'k-say2', code: '261003-88', stage: 'say2', date: '2026-10-01', week: '2026-W40',
  length: 1250, width: 18, thickness: 7, quantity: 800, volume: 0.126, bambooType: 'A', useFor: 'VÃ¡n',
  location: 'LS9', say2Date: '2026-10-02',
  stageHistory: [{ stage: 'kho', date: '2026-10-01' }, { stage: 'say2', date: '2026-10-02' }] });
state.khoNotes.push({ id: 'n-say2', type: 'xuat', status: 'da_duyet', purpose: 'say2', date: '2026-10-02',
  qty: 800, lots: [{ batchId: 'k-say2', qty: 800 }], createdBy: 'system', createdByName: 'Há»‡ thá»‘ng' });
check('MISMATCH: lÃ´ Ä‘ang Sáº¥y 2 ÄÃƒ cÃ³ phiáº¿u Sáº¥y 2 â†’ KHÃ”NG náº±m trong danh sÃ¡ch "thiáº¿u phiáº¿u" (háº¿t cáº£nh bÃ¡o áº£o)',
  !utils.khoStockSummary().mismatchLots.some(x => x.id === 'k-say2'));

// (b) D2: phiáº¿u bÃ¹ Há»† THá»NG trÃ¹ng vá»›i phiáº¿u TAY â†’ rÃ  soÃ¡t cáº¯t pháº§n trÃ¹ng
state.batches.push({ id: 'k-dup', code: '261004-77', stage: 'kho', date: '2026-10-04', week: '2026-W40',
  length: 1250, width: 18, thickness: 7, quantity: 1000, volume: 0.1575, bambooType: 'A', useFor: 'VÃ¡n',
  location: 'K88', stageHistory: [{ stage: 'kho', date: '2026-10-04' }] });
state.khoNotes.push({ id: 'kdup-manual', type: 'xuat', status: 'da_duyet', purpose: 'baotinh', date: '2026-10-05',
  qty: 1000, lots: [{ batchId: 'k-dup', qty: 1000 }], createdBy: 'user1', createdByName: 'Tá»• trÆ°á»Ÿng' });
state.khoNotes.push({ id: 'kdup-sys', type: 'xuat', status: 'da_duyet', purpose: 'khac', date: '2026-10-05',
  qty: 1000, lots: [{ batchId: 'k-dup', qty: 1000 }], createdBy: 'system', createdByName: 'Há»‡ thá»‘ng' });
const dupLot = () => state.batches.find(b => b.id === 'k-dup');
check('D2: lÃ´ 1.000 cÃ³ phiáº¿u tay 1.000 + phiáº¿u bÃ¹ há»‡ thá»‘ng 1.000 â†’ bá»‹ ghi vÆ°á»£t 1.000 (cáº£nh bÃ¡o)',
  utils.khoOverAllocOf(dupLot()) === 1000);
check('D2: káº¿ hoáº¡ch rÃ  soÃ¡t phÃ¡t hiá»‡n pháº§n "khac" há»‡ thá»‘ng TRÃ™NG (cáº¯t Ä‘Ãºng 1.000)',
  x2.khoReconcilePlan().trims.some(t => t.lotId === 'k-dup' && t.qty === 1000));
x2.khoReconcileLedger();
check('D2: sau rÃ  soÃ¡t lÃ´ KHÃ”NG cÃ²n phiáº¿u vÆ°á»£t (Ä‘Ã£ dÃ¹ng Ä‘Ãºng 1.000, tá»“n 0 há»£p lá»‡)',
  utils.khoOverAllocOf(dupLot()) === 0 && utils.khoLotRemainingOf(dupLot()) === 0);

// (c) CHá»T Lá»†CH (Admin/BQL) â€” pháº§n vÆ°á»£t tháº­t cá»§a lÃ´ k-over (táº¡o á»Ÿ má»¥c D2 phÃ­a trÃªn)
const overBefore = utils.khoStockSummary().overThanh;
x2.khoAckOverAlloc('k-over');
check('CHá»T Lá»†CH: lÆ°u khoOverAck trÃªn lÃ´ + cáº£nh bÃ¡o giáº£m Ä‘Ãºng pháº§n vÆ°á»£t (50)',
  Number((state.batches.find(b => b.id === 'k-over') || {}).khoOverAck?.qty) === 50 &&
  utils.khoStockSummary().overThanh === overBefore - 50);
check('CHá»T Lá»†CH: lÃ´ Ä‘Ã£ chá»‘t KHÃ”NG cÃ²n trong panel chi tiáº¿t',
  !x2.khoWarnOverRows().some(r => r.b.id === 'k-over'));
x2.khoClearOverAck('k-over');
check('Bá»Ž CHá»T: cáº£nh bÃ¡o hiá»‡n láº¡i (overThanh trá»Ÿ vá» nhÆ° trÆ°á»›c)',
  utils.khoStockSummary().overThanh === overBefore &&
  x2.khoWarnOverRows().some(r => r.b.id === 'k-over'));

// (d) Panel chi tiáº¿t render Ä‘Ãºng lÃ´ + nÃºt thao tÃ¡c
x2.renderKhoWarnDetail('over');
const warnHtml = document.getElementById('kho-warn-body').innerHTML;
check('PANEL: chi tiáº¿t cáº£nh bÃ¡o liá»‡t kÃª lÃ´ + nÃºt "Chá»‘t lá»‡ch" + "Má»Ÿ tháº» lÃ´"',
  warnHtml.includes('data-kho-warn-ack') && warnHtml.includes('data-kho-warn-edit') &&
  warnHtml.includes('Chá»‘t lá»‡ch') && warnHtml.includes('261001-99'));

const summaryWithSharedAllocation = utils.khoStockSummary(utils.khoFifoAllocation());
const summaryWithFreshAllocation = utils.khoStockSummary();
check('HIá»†U NÄ‚NG: truyá»n FIFO allocation dÃ¹ng chung khÃ´ng Ä‘á»•i káº¿t quáº£ tá»•ng tá»“n/Ä‘á»‘i chiáº¿u',
  summaryWithSharedAllocation.remainingThanh === summaryWithFreshAllocation.remainingThanh &&
  summaryWithSharedAllocation.honestThanh === summaryWithFreshAllocation.honestThanh &&
  summaryWithSharedAllocation.mismatchThanh === summaryWithFreshAllocation.mismatchThanh &&
  JSON.stringify(summaryWithSharedAllocation.mismatchLots) === JSON.stringify(summaryWithFreshAllocation.mismatchLots));

// â”€â”€â”€ E. XÃ“A NHIá»€U LÃ” TRONG Báº¢NG Tá»’N KHO (CHá»ˆ ADMIN) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const bulkStateBefore = {
  batches: state.batches,
  khoNotes: state.khoNotes,
  deletedIds: state.deletedIds,
  undoStack: state.undoStack,
  user: state.currentUser,
  showUsed: state.khoShowUsed,
  pickMode: state.khoStockPickMode,
  picked: state.khoStockPicked
};
state.batches = [
  { id: 'bulk-k1', code: '261104-01', stage: 'kho', length: 1250, width: 18, thickness: 7, quantity: 100, location: 'K1', stageHistory: [{ stage: 'kho', date: '2026-11-04' }] },
  { id: 'bulk-k2', code: '261104-02', stage: 'kho', length: 1250, width: 18, thickness: 7, quantity: 100, location: 'K2', stageHistory: [{ stage: 'kho', date: '2026-11-04' }] },
  { id: 'bulk-k3', code: '261104-03', stage: 'kho', length: 1300, width: 20, thickness: 8, quantity: 100, location: 'K3', stageHistory: [{ stage: 'kho', date: '2026-11-04' }] },
  { id: 'bulk-s1', code: '261104-04', stage: 'say1', length: 1250, width: 18, thickness: 7, quantity: 100, location: 'LS1', stageHistory: [{ stage: 'say1', date: '2026-11-04' }] }
];
state.khoNotes = [
  { id: 'bulk-note-partial', type: 'xuat', status: 'cho_duyet', qty: 30, m3: 0.008, lots: [{ batchId: 'bulk-k1', qty: 10 }, { batchId: 'bulk-k2', qty: 20 }] },
  { id: 'bulk-note-empty', type: 'xuat', status: 'tu_choi', qty: 10, m3: 0.002, lots: [{ batchId: 'bulk-k1', qty: 10 }] },
  { id: 'bulk-note-other', type: 'xuat', status: 'da_duyet', qty: 10, m3: 0.002, lots: [{ batchId: 'bulk-k3', qty: 10 }] },
  { id: 'bulk-note-use-k2', type: 'xuat', status: 'da_duyet', qty: 100, m3: 0.02, lots: [{ batchId: 'bulk-k2', qty: 100 }] }
];
state.deletedIds = {};
state.undoStack = [];
state.khoShowUsed = false;
state.khoStockPickMode = false;
state.khoStockPicked = [];
state.currentUser = { username: 'editor', role: 'editor', editTabs: ['kanban', 'x2'], allowAdvanced: true };
batchModals.toggleKhoStockPickMode();
check('XÃ“A NHIá»€U KHO â€” CHáº¶N QUYá»€N: editor khÃ´ng báº­t Ä‘Æ°á»£c cháº¿ Ä‘á»™ chá»n',
  state.khoStockPickMode === false && state.khoStockPicked.length === 0);
state.khoStockPickMode = true;
state.khoStockPicked = ['bulk-k1'];
batchModals.deletePickedKhoStockLots();
check('XÃ“A NHIá»€U KHO â€” CHáº¶N HANDLER: editor khÃ´ng xÃ³a Ä‘Æ°á»£c dÃ¹ gá»­i yÃªu cáº§u trá»±c tiáº¿p',
  state.batches.some(b => b.id === 'bulk-k1'));
state.khoStockPickMode = false;
state.khoStockPicked = [];

state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
const khoIndexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const eventSource = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('XÃ“A NHIá»€U KHO â€” GIAO DIá»†N: nÃºt chá»n nhiá»u náº±m trong quyá»n Admin vÃ  Ä‘á»§ hÃ nh Ä‘á»™ng',
  khoIndexHtml.includes('id="x2-kho-bulk-controls"') &&
  khoIndexHtml.includes('class="kho-stock-bulk-controls admin-only-btn"') &&
  khoIndexHtml.includes('id="x2-kho-bulk-select-all"') &&
  khoIndexHtml.includes('id="x2-kho-bulk-delete"') &&
  eventSource.includes("safeOn('x2-kho-pick-toggle'") &&
  eventSource.includes("safeOn('x2-kho-bulk-select-all'") &&
  eventSource.includes("safeOn('x2-kho-bulk-delete'"));
check('XÃ“A NHIá»€U KHO â€” id nÃºt chá»n nhiá»u KHÃ”NG trÃ¹ng id nÃ o khÃ¡c trong index.html',
  [...khoIndexHtml.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) !== i).length === 0);
batchModals.toggleKhoStockPickMode();
x2.renderX2KhoStockTable();
const bulkRowsHtml = document.getElementById('x2-kho-stock-rows').innerHTML;
check('XÃ“A NHIá»€U KHO â€” DANH SÃCH: hiá»‡n checkbox cho lÃ´ Ä‘ang tá»“n, áº©n lÃ´ háº¿t tá»“n vÃ  lÃ´ ngoÃ i Kho',
  bulkRowsHtml.includes('data-x2-kho-pick-id="bulk-k1"') &&
  bulkRowsHtml.includes('data-x2-kho-pick-id="bulk-k3"') &&
  !bulkRowsHtml.includes('data-x2-kho-pick-id="bulk-k2"') &&
  !bulkRowsHtml.includes('data-x2-kho-pick-id="bulk-s1"'));
const originalQuerySelectorAll = document.querySelectorAll;
document.querySelectorAll = selector => {
  if (selector !== '#x2-kho-stock-rows [data-x2-kho-pick-id]') return [];
  return [...bulkRowsHtml.matchAll(/data-x2-kho-pick-id="([^"]+)"/g)].map(match => ({
    checked: false,
    getAttribute: name => name === 'data-x2-kho-pick-id' ? match[1] : null
  }));
};
batchModals.selectAllKhoStockLots();
document.querySelectorAll = originalQuerySelectorAll;
check('XÃ“A NHIá»€U KHO â€” CHá»ŒN Táº¤T Cáº¢: chá»‰ chá»n lÃ´ Ä‘ang hiá»ƒn thá»‹ sau lá»c',
  state.khoStockPicked.slice().sort().join(',') === 'bulk-k1,bulk-k3');
batchModals.onKhoStockPickChange('bulk-s1', true);
check('XÃ“A NHIá»€U KHO â€” GIá»šI Háº N: khÃ´ng nháº­n lÃ´ khÃ´ng á»Ÿ Kho',
  state.khoStockPicked.slice().sort().join(',') === 'bulk-k1,bulk-k3');

x2.resetX2KhoNoteForm(true);
x2.khoPickLot('bulk-k1');
batchModals.deletePickedKhoStockLots();
check('XÃ“A NHIá»€U KHO â€” PHIáº¾U ÄANG NHáº¬P: cháº·n xÃ³a lÃ´ Ä‘ang Ä‘Æ°á»£c chá»n trong phiáº¿u chÆ°a lÆ°u',
  state.batches.some(b => b.id === 'bulk-k1') && state.khoStockPicked.includes('bulk-k1'));
x2.resetX2KhoNoteForm(true);

const originalConfirm = global.confirm;
let bulkConfirmText = '';
global.confirm = text => { bulkConfirmText = text; return true; };
batchModals.deletePickedKhoStockLots();
global.confirm = originalConfirm;
check('XÃ“A NHIá»€U KHO â€” XÃC NHáº¬N: cáº£nh bÃ¡o rÃµ xá»­ lÃ½ phiáº¿u Kho liÃªn quan',
  bulkConfirmText.includes('Phiáº¿u Kho liÃªn quan') && !state.khoStockPickMode);
check('XÃ“A NHIá»€U KHO â€” Káº¾T QUáº¢: chá»‰ xÃ³a 2 lÃ´ Kho Ä‘Ã£ chá»n',
  !state.batches.some(b => ['bulk-k1', 'bulk-k3'].includes(b.id)) &&
  state.batches.some(b => b.id === 'bulk-k2') && state.batches.some(b => b.id === 'bulk-s1'));
const partialNote = state.khoNotes.find(n => n.id === 'bulk-note-partial');
check('XÃ“A NHIá»€U KHO â€” PHIáº¾U NHIá»€U LÃ”: bá» lÃ´ Ä‘Ã£ xÃ³a, giá»¯ lÃ´ cÃ²n láº¡i vÃ  cáº­p nháº­t sá»‘ lÆ°á»£ng',
  !!partialNote && partialNote.lots.length === 1 && partialNote.lots[0].batchId === 'bulk-k2' &&
  partialNote.qty === 20 && Math.abs(partialNote.m3 - utils.calculateVolume(1250, 18, 7, 20)) < 0.000001);
check('XÃ“A NHIá»€U KHO â€” PHIáº¾U Rá»–NG: xÃ³a phiáº¿u háº¿t lÃ´ vÃ  ghi tombstone',
  !state.khoNotes.some(n => n.id === 'bulk-note-empty') &&
  !!(state.deletedIds.khoNotes && state.deletedIds.khoNotes['bulk-note-empty']) &&
  !state.khoNotes.some(n => n.id === 'bulk-note-other'));

const bulkUndo = await import('../js/events.js');
bulkUndo.undoLastAction();
check('XÃ“A NHIá»€U KHO â€” HOÃ€N TÃC: khÃ´i phá»¥c lÃ´, ná»™i dung phiáº¿u vÃ  gá»¡ tombstone',
  state.batches.some(b => b.id === 'bulk-k1') && state.batches.some(b => b.id === 'bulk-k3') &&
  state.khoNotes.find(n => n.id === 'bulk-note-partial')?.lots.length === 2 &&
  state.khoNotes.some(n => n.id === 'bulk-note-empty') &&
  !(state.deletedIds.khoNotes && state.deletedIds.khoNotes['bulk-note-empty']));
state.batches = bulkStateBefore.batches;
state.khoNotes = bulkStateBefore.khoNotes;
state.deletedIds = bulkStateBefore.deletedIds;
state.undoStack = bulkStateBefore.undoStack;
state.currentUser = bulkStateBefore.user;
state.khoShowUsed = bulkStateBefore.showUsed;
state.khoStockPickMode = bulkStateBefore.pickMode;
state.khoStockPicked = bulkStateBefore.picked;

const x2Source = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const pickerStart = x2Source.indexOf('function khoLotPickerList(allocation)');
const pickerEnd = x2Source.indexOf('function khoPickLot(', pickerStart);
const pickerBlock = pickerStart >= 0 && pickerEnd > pickerStart ? x2Source.slice(pickerStart, pickerEnd) : '';
const listStart = x2Source.indexOf('function renderX2KhoLotsList(allocation)');
const listEnd = x2Source.indexOf('function khoSetLotsQuery(', listStart);
const listBlock = listStart >= 0 && listEnd > listStart ? x2Source.slice(listStart, listEnd) : '';
const summaryStart = fs.readFileSync(new URL('../js/utils.js', import.meta.url), 'utf8');
const stockSummaryStart = summaryStart.indexOf('function khoStockSummary(allocation)');
const stockSummaryEnd = summaryStart.indexOf('function khoVisibilityMap()', stockSummaryStart);
const stockSummaryBlock = stockSummaryStart >= 0 && stockSummaryEnd > stockSummaryStart
  ? summaryStart.slice(stockSummaryStart, stockSummaryEnd)
  : '';
check('HIá»†U NÄ‚NG: lá»c Kho Nan chia sáº» 1 FIFO allocation thay vÃ¬ tÃ­nh láº¡i cho tá»«ng lÃ´',
  pickerBlock.includes('khoLotRemainingOf(b, alloc)') &&
  !pickerBlock.includes('khoLotRemainingOf(b)') &&
  (listBlock.match(/khoFifoAllocation\(\)/g) || []).length === 1 &&
  listBlock.includes('khoLotPickerList(alloc)') &&
  listBlock.includes('khoLotRemainingOf(b, alloc)') &&
  listBlock.includes('khoLotCardHtml(b, alloc)'));
check('HIá»†U NÄ‚NG: tá»•ng Ä‘á»‘i chiáº¿u gom dá»¯ liá»‡u theo lÃ´ 1 lÆ°á»£t, khÃ´ng quÃ©t toÃ n bá»™ lá»‹ch sá»­ cho tá»«ng lÃ´',
  stockSummaryBlock.includes('khoDerivedOutByLot(pool)') &&
  !stockSummaryBlock.includes('khoDerivedOutOf(b.id)'));

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

