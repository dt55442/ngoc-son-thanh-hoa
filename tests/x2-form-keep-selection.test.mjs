// tests/x2-form-keep-selection.test.mjs â€” GIá»® Lá»°A CHá»ŒN Cá»¦A Ã” CHá»ŒN NGUá»’N
// (18/10/2026) Â· Lá»—i thá»±c táº¿: Ä‘ang Ä‘iá»n form thÃ¬ tháº» chi tiáº¿t Ä‘Æ°á»£c Váº¼ Láº I
// (renderAll khi Ä‘á»“ng bá»™ mÃ¢y / chuyá»ƒn tab / báº¥m Äá»“ng Bá»™ Ngayâ€¦) â†’ cÃ¡c hÃ m
// fill*Options dá»±ng láº¡i <option> â†’ trÃ¬nh duyá»‡t Ä‘áº·t selectedIndex = 0 â‡’ Ã´ chá»n
// Tá»° NHáº¢Y Vá»€ DÃ’NG Äáº¦U (lÃ´ Má»šI NHáº¤T) + Ã´ sá»‘ lÆ°á»£ng bá»‹ ghi Ä‘Ã¨.
//
// Kiá»ƒm thá»­:
//  Â· STUB mÃ´ phá»ng ÄÃšNG hÃ nh vi trÃ¬nh duyá»‡t: gÃ¡n innerHTML â‡’ value = option Ä‘áº§u.
//  Â· 4 tháº» XÆ°á»Ÿng 2 (Cáº¯t Chá»n Â· Bá»‘c Luá»“ng Â· Bá»• á»ng Â· Chá»n Nan ThÃ´) + Cáº¯t á»ng XÆ°á»Ÿng 1
//    giá»¯ nguyÃªn lá»±a chá»n khi tháº» Ä‘Æ°á»£c váº½ láº¡i (cáº£ khi danh sÃ¡ch Ä‘á»•i).
//  Â· Bá»• á»ng: KHÃ”NG ghi Ä‘Ã¨ "KL á»ng Bá»•" Ä‘Ã£ nháº­p; váº«n tá»± Ä‘iá»n khi Äá»”I LÃ” / Ã´ trá»‘ng.
//  Â· LÃ´ Ä‘Ã£ háº¿t tá»“n â†’ má»›i rÆ¡i vá» option Ä‘áº§u (Ä‘Ãºng nghiá»‡p vá»¥).
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng tests/xuong2-bo-ong.test.mjs) â”€â”€â”€â”€â”€â”€
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
// Ã” CHá»ŒN tháº­t: má»—i láº§n gÃ¡n innerHTML, trÃ¬nh duyá»‡t dá»±ng láº¡i danh sÃ¡ch option vÃ 
// CHá»ŒN option Äáº¦U TIÃŠN (selectedIndex = 0) â€” Ä‘Ã¢y chÃ­nh lÃ  nguá»“n gá»‘c lá»—i
// "tá»± nháº£y vá» dÃ²ng má»›i nháº¥t trÃªn cÃ¹ng". Stub pháº£i mÃ´ phá»ng Ä‘á»ƒ kiá»ƒm thá»­ Ä‘Ãºng.
function makeSelect(id) {
  const el = makeEl(id);
  let html = '';
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return html; },
    set(v) {
      html = String(v == null ? '' : v);
      const vals = [...html.matchAll(/<option[^>]*value="([^"]*)"/g)].map(m => m[1]);
      el.value = vals.length ? vals[0] : '';   // â† trÃ¬nh duyá»‡t: chá»n option Äáº¦U
    }
  });
  return el;
}
const SELECT_IDS = new Set([
  'x2-cut-material', 'x2-blg-material', 'x2-bo-ong-cut', 'x2-cn-baotho',
  'x1-cat-ong-material', 'x1-say-sinh-source', 'x1-boc-source',
  'x1-loc-ong-src', 'x1-cat-mat-src', 'x1-bo-src', 'x1-phoi-say-src', 'x1-loc-thanh-src'
]);
const els = new Map();
function elOf(id) {
  if (!els.has(id)) els.set(id, SELECT_IDS.has(id) ? makeSelect(id) : makeEl(id));
  return els.get(id);
}
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

// â”€â”€â”€ Dá»¯ liá»‡u máº«u â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 3 NHÃ“M LÃ” TÃCH Rá»œI Ä‘á»ƒ khÃ´ng láº«n danh sÃ¡ch cá»§a nhau:
//  Â· cutmat-* = lÃ´ XÆ°á»Ÿng 2 CHÆ¯A cáº¯t (nguá»“n cá»§a tháº» Cáº¯t Chá»n)
//  Â· blgmat-* = lÃ´ chá»©a "Luá»“ng cÃ¢y" (nguá»“n cá»§a tháº» Bá»‘c Luá»“ng)
//  Â· ongmat-* = lÃ´ ÄÃƒ cáº¯t â†’ 2 LÃ” á»NG cut-1/cut-2 (nguá»“n cá»§a tháº» Bá»• á»ng)
state.materialRecords = [
  { id: 'cutmat-1', type: 'á»ng trÃ²n loáº¡i 1', supplier: 'NhÃ  Táº¿', location: 'xuong-2', inputIndex: 1200, outputIndex: 200, weight: 1000, date: '2026-09-08', createdAt: '2026-09-08T02:00:00.000Z' },
  { id: 'cutmat-2', type: 'á»ng trÃ²n loáº¡i 2', supplier: 'NhÃ  Trung', location: 'xuong-2', inputIndex: 800, outputIndex: 0, weight: 800, date: '2026-09-09', createdAt: '2026-09-09T02:00:00.000Z' },
  { id: 'blgmat-1', type: 'Luá»“ng cÃ¢y khÃ´', supplier: 'NhÃ  Táº¿', location: 'xuong-2', inputIndex: 900, outputIndex: 0, weight: 900, date: '2026-09-05', createdAt: '2026-09-05T02:00:00.000Z' },
  { id: 'blgmat-2', type: 'Luá»“ng cÃ¢y tÆ°Æ¡i', supplier: 'NhÃ  Trung', location: 'xuong-2', inputIndex: 700, outputIndex: 0, weight: 700, date: '2026-09-06', createdAt: '2026-09-06T02:00:00.000Z' },
  { id: 'ongmat-1', type: 'á»ng luá»“ng A', supplier: 'NhÃ  Táº¿', location: 'xuong-2', inputIndex: 1000, outputIndex: 0, weight: 1000, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'ongmat-2', type: 'á»ng luá»“ng B', supplier: 'NhÃ  Trung', location: 'xuong-2', inputIndex: 800, outputIndex: 0, weight: 800, date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' }
];
// 2 LÃ” á»NG cá»§a Cáº¯t Chá»n (cut-2 Má»šI HÆ N â‡’ Ä‘á»©ng Ä‘áº§u Ã´ chá»n Bá»• á»ng)
state.xuong2CutRecords = [
  { id: 'cut-1', materialId: 'ongmat-1', materialType: 'á»ng luá»“ng A', supplier: 'NhÃ  Táº¿', date: '2026-09-10', inputWeight: 1000, klOngLuong: 400, klCuiDot: 100, klCayLoai: 150, createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'cut-2', materialId: 'ongmat-2', materialType: 'á»ng luá»“ng B', supplier: 'NhÃ  Trung', date: '2026-09-11', inputWeight: 800, klOngLuong: 300, klCuiDot: 50, klCayLoai: 100, createdAt: '2026-09-11T02:00:00.000Z' }
];
state.xuong2BoOngRecords = [];
state.xuong2BoluongRecords = [];
state.xuong2ChonNanThoRecords = [];
state.xuong2BaoThoRecords = [
  { id: 'bt-1', boOngIds: ['bo-1'], date: '2026-09-12', dais: [1250], rongs: [18], thicks: [7], createdAt: '2026-09-12T02:00:00.000Z' }
];
state.hrAssignments = [];
state.x2BoOngRates = {};
state.x2BoluongRates = {};
state.x1CatOngRecords = [];
state.x1CatOngEditId = null;

const x2 = await import('../js/xuong2.js');

console.log('--- A. Cáº®T CHá»ŒN: giá»¯ lÃ´ Ä‘ang chá»n khi tháº» váº½ láº¡i ---');
// 1. Váº½ tháº» â†’ Ã´ chá»n Ä‘á»©ng á»Ÿ lÃ´ Má»šI NHáº¤T (cutmat-2)
x2.renderXuong2CutCard();
const selCut = document.getElementById('x2-cut-material');
check('A1: láº§n váº½ Ä‘áº§u â€” Ã´ chá»n á»Ÿ lÃ´ Má»šI NHáº¤T (cutmat-2)', selCut.value === 'cutmat-2');
check('A2: danh sÃ¡ch cÃ³ cáº£ 2 lÃ´ chá» cáº¯t', selCut.innerHTML.includes('cutmat-1') && selCut.innerHTML.includes('cutmat-2'));
// 2. NgÆ°á»i dÃ¹ng CHá»ŒN lÃ´ cÅ© hÆ¡n (cutmat-1)
selCut.value = 'cutmat-1';
// 3. Tháº» Ä‘Æ°á»£c váº½ láº¡i (giáº£ láº­p renderAll khi Ä‘á»“ng bá»™ mÃ¢y) â€” danh sÃ¡ch KHÃ”NG Ä‘á»•i
x2.renderXuong2CutCard();
check('A3: váº½ láº¡i (danh sÃ¡ch y nguyÃªn) â€” KHÃ”NG nháº£y vá» lÃ´ má»›i nháº¥t', selCut.value === 'cutmat-1');
// 4. Dá»¯ liá»‡u Ä‘á»•i (thÃªm 1 lÃ´ má»›i hÆ¡n) â‡’ danh sÃ¡ch Ä‘á»•i â‡’ váº«n pháº£i giá»¯ lá»±a chá»n
state.materialRecords.push({
  id: 'cutmat-3', type: 'á»ng trÃ²n tÆ°Æ¡i', supplier: 'NhÃ  LÃ¢m', location: 'xuong-2',
  inputIndex: 600, outputIndex: 100, weight: 500, date: '2026-09-20', createdAt: '2026-09-20T02:00:00.000Z'
});
x2.renderXuong2CutCard();
check('A4: váº½ láº¡i khi CÃ“ lÃ´ má»›i hÆ¡n â€” váº«n giá»¯ lÃ´ Ä‘ang chá»n (cutmat-1)', selCut.value === 'cutmat-1');
check('A5: danh sÃ¡ch Ä‘Ã£ cáº­p nháº­t lÃ´ má»›i (cutmat-3 Ä‘á»©ng Ä‘áº§u)', selCut.innerHTML.indexOf('cutmat-3') < selCut.innerHTML.indexOf('cutmat-1'));

console.log('--- B. Bá»C LUá»’NG: giá»¯ lÃ´ "Luá»“ng cÃ¢y" Ä‘ang chá»n ---');
x2.renderXuong2BoluongCard();
const selBlg = document.getElementById('x2-blg-material');
check('B1: Ã´ chá»n Bá»‘c Luá»“ng chá»‰ cÃ³ lÃ´ "Luá»“ng cÃ¢y" + Ä‘á»©ng á»Ÿ lÃ´ má»›i nháº¥t (blgmat-2)', selBlg.value === 'blgmat-2');
selBlg.value = 'blgmat-1';
state.materialRecords.push({
  id: 'blgmat-3', type: 'Luá»“ng cÃ¢y tÆ°Æ¡i', supplier: 'NhÃ  SÆ¡n', location: 'xuong-2',
  inputIndex: 400, outputIndex: 0, weight: 400, date: '2026-09-21', createdAt: '2026-09-21T02:00:00.000Z'
});
x2.renderXuong2BoluongCard();
check('B2: váº½ láº¡i khi cÃ³ lÃ´ má»›i â€” váº«n giá»¯ lÃ´ Ä‘ang chá»n (blgmat-1)', selBlg.value === 'blgmat-1');
check('B3: danh sÃ¡ch Ä‘Ã£ cáº­p nháº­t lÃ´ má»›i (blgmat-3 Ä‘á»©ng Ä‘áº§u)', selBlg.innerHTML.indexOf('blgmat-3') < selBlg.innerHTML.indexOf('blgmat-1'));

console.log('--- C. Bá»” á»NG: giá»¯ lÃ´ + KHÃ”NG ghi Ä‘Ã¨ KL Ä‘Ã£ nháº­p ---');
x2.renderX2BoOngCard();
const selOng = document.getElementById('x2-bo-ong-cut');
const ongQty = () => document.getElementById('x2-bo-ong-bo').value;
check('C1: Ã´ chá»n Bá»• á»ng Ä‘á»©ng á»Ÿ lÃ´ má»›i nháº¥t (cut-2) + tá»± Ä‘iá»n KL = pháº§n cÃ²n láº¡i (300)',
  selOng.value === 'cut-2' && ongQty() === '300');
// NgÆ°á»i dÃ¹ng chá»n lÃ´ cÅ© (cut-1) â†’ handler 'change' cá»§a events.js
selOng.value = 'cut-1';
x2.updateXuong2BoOngLinked(true);
check('C2: Äá»”I LÃ” â†’ váº«n tá»± Ä‘iá»n KL á»ng Bá»• = pháº§n cÃ²n láº¡i cá»§a lÃ´ má»›i chá»n (400)', ongQty() === '400');
// NgÆ°á»i dÃ¹ng gÃµ sá»‘ khÃ¡c
document.getElementById('x2-bo-ong-bo').value = '123';
// Tháº» Ä‘Æ°á»£c váº½ láº¡i (Ä‘á»“ng bá»™ mÃ¢y) â€” dá»¯ liá»‡u KHÃ”NG Ä‘á»•i
x2.renderX2BoOngCard();
check('C3: váº½ láº¡i (danh sÃ¡ch y nguyÃªn) â€” lÃ´ á»‘ng KHÃ”NG nháº£y vá» lÃ´ má»›i nháº¥t', selOng.value === 'cut-1');
check('C4: váº½ láº¡i â€” KHÃ”NG ghi Ä‘Ã¨ KL á»ng Bá»• Ä‘ang nháº­p (giá»¯ 123)', ongQty() === '123');
// Dá»¯ liá»‡u Ä‘á»•i: thÃªm lÃ´ á»‘ng má»›i hÆ¡n â‡’ danh sÃ¡ch Ä‘á»•i â‡’ váº«n giá»¯ lá»±a chá»n + sá»‘ Ä‘Ã£ nháº­p
state.xuong2CutRecords.push({
  id: 'cut-9', materialId: 'mat-b', materialType: 'Luá»“ng á»‘ng', supplier: 'NhÃ  Trung',
  date: '2026-09-22', inputWeight: 500, klOngLuong: 200, klCuiDot: 0, klCayLoai: 0,
  createdAt: '2026-09-22T02:00:00.000Z'
});
x2.renderX2BoOngCard();
check('C5: váº½ láº¡i khi CÃ“ lÃ´ á»‘ng má»›i hÆ¡n â€” váº«n giá»¯ lÃ´ Ä‘ang chá»n (cut-1)', selOng.value === 'cut-1');
check('C6: váº«n giá»¯ KL Ä‘Ã£ nháº­p (123) dÃ¹ danh sÃ¡ch Ä‘á»•i', ongQty() === '123');
// LÃ´ Ä‘ang chá»n bá»‹ bá»• Háº¾T (háº¿t tá»“n) â†’ má»›i rÆ¡i vá» option Ä‘áº§u
state.xuong2BoOngRecords.push({
  id: 'tmp-full', cutId: 'cut-1', date: '2026-10-01', inputOng: 400, klOngLoai: 0, klOngBo: 400,
  createdAt: '2026-10-01T02:00:00.000Z'
});
x2.renderX2BoOngCard();
check('C7: lÃ´ Ä‘Ã£ bá»• háº¿t â†’ rÆ¡i vá» lÃ´ cÃ²n tá»“n Má»šI NHáº¤T (cut-9), khÃ´ng giá»¯ lÃ´ Ä‘Ã£ háº¿t',
  selOng.value === 'cut-9');
check('C8: rÆ¡i sang lÃ´ khÃ¡c â‡’ tá»± Ä‘iá»n láº¡i KL theo lÃ´ má»›i (200)', ongQty() === '200');
// Ã” KL trá»‘ng (vá»«a "LÃ m Má»›i Form") â†’ váº«n tá»± Ä‘iá»n nhÆ° cÅ©
document.getElementById('x2-bo-ong-bo').value = '';
selOng.value = 'cut-2';
x2.updateXuong2BoOngLinked(true);
check('C9: Ã´ KL Ä‘ang TRá»NG â†’ tá»± Ä‘iá»n pháº§n cÃ²n láº¡i (300)', ongQty() === '300');

console.log('--- C2. ÄANG Sá»¬A má»™t lÆ°á»£t: váº½ láº¡i KHÃ”NG Ä‘á»•i lÃ´ cá»§a báº£n ghi ---');
// LÆ°á»£t bá»• á»‘ng cá»§a lÃ´ cut-2 â†’ má»Ÿ cháº¿ Ä‘á»™ Sá»¬A rá»“i Ä‘á»ƒ tháº» bá»‹ váº½ láº¡i (Ä‘á»“ng bá»™ mÃ¢y).
// TrÆ°á»›c khi sá»­a: lÃ´ nháº£y vá» lÃ´ má»›i nháº¥t â‡’ báº¥m LÆ°u sáº½ ghi lÆ°á»£t sang SAI LÃ”.
state.xuong2BoOngRecords.push({
  id: 'r-edit', cutId: 'cut-2', date: '2026-10-02', inputOng: 100, klOngLoai: 0, klOngBo: 100,
  createdAt: '2026-10-02T02:00:00.000Z'
});
x2.renderX2BoOngCard();
x2.editXuong2BoOng('r-edit');
check('C10: vÃ o Sá»¬A â†’ Ã´ chá»n trá» Ä‘Ãºng lÃ´ cá»§a lÆ°á»£t (cut-2) + banner Ä‘ang sá»­a',
  selOng.value === 'cut-2' && state.x2BoOngEditId === 'r-edit');
x2.renderX2BoOngCard();   // giáº£ láº­p renderAll giá»¯a lÃºc Ä‘ang sá»­a
check('C11: váº½ láº¡i khi ÄANG Sá»¬A â†’ Ã´ chá»n VáºªN lÃ  lÃ´ cá»§a lÆ°á»£t (cut-2)', selOng.value === 'cut-2');
check('C12: váº½ láº¡i khi ÄANG Sá»¬A â†’ KL Ä‘Ã£ náº¡p cá»§a lÆ°á»£t KHÃ”NG bá»‹ ghi Ä‘Ã¨ (100)', ongQty() === '100');
x2.resetXuong2BoOngForm();

console.log('--- D. CHá»ŒN NAN THÃ”: giá»¯ LÃ” + giá»¯ "ThÃªm loáº¡i má»›i" (nan mua ngoÃ i) ---');
x2.renderX2ChonNanCard();
const selCn = document.getElementById('x2-cn-baotho');
check('D1: Ã´ LÃ´ BÃ o ThÃ´ Ä‘á»©ng á»Ÿ lÃ´ bÃ o thÃ´ má»›i nháº¥t (bt-1)', selCn.value === 'bt-1');
selCn.value = '__new__';   // "âž• ThÃªm loáº¡i má»›i" = nan mua NGOÃ€I cÃ´ng Ä‘oáº¡n
x2.renderX2ChonNanCard();
check('D2: váº½ láº¡i (danh sÃ¡ch y nguyÃªn) â€” váº«n á»Ÿ cháº¿ Ä‘á»™ "ThÃªm loáº¡i má»›i"', selCn.value === '__new__');
state.xuong2BaoThoRecords.push({
  id: 'bt-2', boOngIds: ['bo-2'], date: '2026-09-25', dais: [1300], rongs: [20], thicks: [8],
  createdAt: '2026-09-25T02:00:00.000Z'
});
x2.renderX2ChonNanCard();
check('D3: váº½ láº¡i khi cÃ³ lÃ´ bÃ o thÃ´ má»›i hÆ¡n â€” KHÃ”NG bá»‹ kÃ©o vá» lÃ´ má»›i nháº¥t', selCn.value === '__new__');
check('D4: danh sÃ¡ch Ä‘Ã£ cÃ³ lÃ´ má»›i (bt-2 Ä‘á»©ng Ä‘áº§u)', selCn.innerHTML.indexOf('bt-2') < selCn.innerHTML.indexOf('bt-1'));

console.log('--- E. XÆ¯á»žNG 1: Cáº®T á»NG giá»¯ lÃ´ Ä‘ang chá»n ---');
state.materialRecords.push(
  { id: 'x1m-1', type: 'Váº§u cÃ¢y tÆ°Æ¡i', supplier: 'Táº¿', location: 'xuong-1', weight: 800, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'x1m-2', type: 'Ná»©a cÃ¢y khÃ´', supplier: 'Trung', location: 'xuong-1', weight: 600, date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' }
);
x2.fillX1CatOngOptions();
const selX1 = document.getElementById('x1-cat-ong-material');
check('E1: Ã´ chá»n Cáº¯t á»ng Ä‘á»©ng á»Ÿ lÃ´ má»›i nháº¥t (x1m-2)', selX1.value === 'x1m-2');
selX1.value = 'x1m-1';
state.materialRecords.push({
  id: 'x1m-3', type: 'Váº§u cÃ¢y tÆ°Æ¡i', supplier: 'SÆ¡n', location: 'xuong-1',
  weight: 500, date: '2026-09-28', createdAt: '2026-09-28T02:00:00.000Z'
});
x2.fillX1CatOngOptions();
check('E2: váº½ láº¡i khi cÃ³ lÃ´ má»›i hÆ¡n â€” váº«n giá»¯ lÃ´ Ä‘ang chá»n (x1m-1)', selX1.value === 'x1m-1');

console.log('--- G. 8 THáºº XÆ¯á»žNG 1: LÆ¯U/LÃ€M Má»šI KHÃ”NG Máº¤T NGUá»’N ÄANG CHá»ŒN (19/10/2026) ---');
// form.reset() cá»§a TRÃŒNH DUYá»†T Ä‘Æ°a <select> vá» OPTION Äáº¦U TIÃŠN (má»›i nháº¥t).
// Stub máº·c Ä‘á»‹nh (reset(){}) lÃ  no-op nÃªn pháº£i giáº£ láº­p ÄÃšNG hÃ nh vi nÃ y.
function stubBrowserReset(formId, selId) {
  const f = document.getElementById(formId);
  const sel = document.getElementById(selId);
  f.reset = () => {
    const vals = [...String(sel.innerHTML || '').matchAll(/<option[^>]*value="([^"]*)"/g)].map(m => m[1]);
    sel.value = vals.length ? vals[0] : '';
  };
}
function optionValues(sel) {
  return [...String(sel.innerHTML || '').matchAll(/<option[^>]*value="([^"]*)"/g)]
    .map(m => m[1]).filter(Boolean);
}
function pickOlderSource(sel) {
  const vals = optionValues(sel);
  sel.value = vals[vals.length - 1];
  return sel.value;
}
// Dá»¯ liá»‡u chuá»—i XÆ°á»Ÿng 1 (má»—i cÃ´ng Ä‘oáº¡n 2 nguá»“n Ä‘á»ƒ cÃ³ "nguá»“n cÅ© hÆ¡n")
state.xuong1CatOngRecords = [
  { id: 'gco-1', materialId: 'x1m-1', materialType: 'Váº§u cÃ¢y', supplier: 'Táº¿', date: '2026-09-12', klDat: 400, klLoai: 10, klMat: 5, klNgon: 5, createdAt: '2026-09-12T02:00:00.000Z' },
  { id: 'gco-2', materialId: 'x1m-2', materialType: 'Ná»©a cÃ¢y', supplier: 'Trung', date: '2026-09-13', klDat: 300, klLoai: 8, klMat: 4, klNgon: 4, createdAt: '2026-09-13T02:00:00.000Z' }
];
state.xuong1SaySinhRecords = [
  { id: 'gss-1', catOngId: 'gco-1', date: '2026-09-14', qty: 300, createdAt: '2026-09-14T02:00:00.000Z' },
  { id: 'gss-2', catOngId: 'gco-2', date: '2026-09-15', qty: 200, createdAt: '2026-09-15T02:00:00.000Z' }
];
state.xuong1BocRecords = [
  { id: 'gboc-1', saySinhId: 'gss-1', date: '2026-09-16', qty: 280, createdAt: '2026-09-16T02:00:00.000Z' },
  { id: 'gboc-2', saySinhId: 'gss-2', date: '2026-09-17', qty: 180, createdAt: '2026-09-17T02:00:00.000Z' }
];
// Lá»c á»ng KHÃ”NG qua Cáº¯t á»ng (bocId rá»—ng) â†’ hiá»‡n Ä‘Æ°á»£c á»Ÿ Ã´ chá»n Cáº¯t Máº¯t
state.xuong1LocOngRecords = [
  { id: 'glo-1', bocId: '', date: '2026-09-18', qtyIn: 340, qtyOk: 320, qtyLoai: 20, createdAt: '2026-09-18T02:00:00.000Z' },
  { id: 'glo-2', bocId: '', date: '2026-09-19', qtyIn: 240, qtyOk: 220, qtyLoai: 20, createdAt: '2026-09-19T02:00:00.000Z' },
  { id: 'glo-3', bocId: '', date: '2026-09-26', qtyIn: 340, qtyOk: 320, qtyLoai: 20, createdAt: '2026-09-26T02:00:00.000Z' },
  { id: 'glo-4', bocId: '', date: '2026-09-27', qtyIn: 240, qtyOk: 220, qtyLoai: 20, createdAt: '2026-09-27T02:00:00.000Z' }
];
state.xuong1CatMatRecords = [
  { id: 'gcm-1', locOngId: 'glo-1', date: '2026-09-20', qtyIn: 310, qtyOk: 290, createdAt: '2026-09-20T02:00:00.000Z' },
  { id: 'gcm-2', locOngId: 'glo-2', date: '2026-09-21', qtyIn: 210, qtyOk: 190, createdAt: '2026-09-21T02:00:00.000Z' }
];
state.xuong1BoRecords = [
  { id: 'gbo-1', catMatId: 'gcm-1', date: '2026-09-22', qtyIn: 280, qtyOk: 260, createdAt: '2026-09-22T02:00:00.000Z' },
  { id: 'gbo-2', catMatId: 'gcm-2', date: '2026-09-23', qtyIn: 180, qtyOk: 160, createdAt: '2026-09-23T02:00:00.000Z' }
];
state.xuong1PhoiSayRecords = [
  { id: 'gps-1', boId: 'gbo-1', date: '2026-09-24', qtyIn: 250, qtyOk: 230, createdAt: '2026-09-24T02:00:00.000Z' },
  { id: 'gps-2', boId: 'gbo-2', date: '2026-09-25', qtyIn: 150, qtyOk: 130, createdAt: '2026-09-25T02:00:00.000Z' }
];
state.xuong1LocThanhRecords = [];
// Má»—i tháº»: render â†’ chá»n nguá»“n CÅ¨ â†’ giáº£ láº­p form.reset() â†’ gá»i hÃ m reset cá»§a
// Ä‘Æ°á»ng LÆ°u lÆ°á»£t / "LÃ m Má»›i Form" â†’ Ã´ chá»n PHáº¢I giá»¯ Ä‘Ãºng nguá»“n vá»«a chá»n.
function checkResetKeepsSource(cardLabel, formId, selId, renderFn, resetFn, editKey) {
  renderFn();
  const sel = document.getElementById(selId);
  const picked = pickOlderSource(sel);
  if (optionValues(sel).length < 2) {
    check(`GÂ· ${cardLabel}: cáº§n â‰¥2 nguá»“n Ä‘á»ƒ kiá»ƒm thá»­`, false);
    return;
  }
  stubBrowserReset(formId, selId);
  resetFn();
  check(`GÂ· ${cardLabel}: form.reset() KHÃ”NG lÃ m máº¥t nguá»“n Ä‘ang chá»n (${picked})`, sel.value === picked);
  check(`GÂ· ${cardLabel}: Ä‘Ã£ thoÃ¡t cháº¿ Ä‘á»™ Sá»¬A + áº©n banner "Äang sá»­a"`,
    (!editKey || state[editKey] === null));
}
checkResetKeepsSource('Cáº¯t á»ng', 'x1-cat-ong-form', 'x1-cat-ong-material',
  () => x2.renderX1CatOngCard(), () => x2.resetX1CatOngForm(), 'x1CatOngEditId');
checkResetKeepsSource('Sáº¥y Sinh', 'x1-say-sinh-form', 'x1-say-sinh-source',
  () => x2.renderX1SaySinhCard(), () => x2.resetX1SaySinhForm(), 'x1SaySinhEditId');
checkResetKeepsSource('Bá»‘c', 'x1-boc-form', 'x1-boc-source',
  () => x2.renderX1BocCard(), () => x2.resetX1BocForm(), 'x1BocEditId');
x2.X1_CHAIN_SPECS.forEach(sp => {
  checkResetKeepsSource(sp.title, 'x1-' + sp.prefix + '-form', 'x1-' + sp.prefix + '-src',
    () => x2.renderX1ChainCard(sp), () => x2.resetX1ChainForm(sp), sp.editKey);
});
// Nguá»“n Ä‘Ã£ Háº¾T Tá»’N (bá»‹ lá»c khá»i danh sÃ¡ch) â†’ KHÃ”NG giá»¯ cháº¿t, chuyá»ƒn nguá»“n cÃ²n hÃ ng
(() => {
  const sp = x2.X1_CHAIN_SPECS.find(s => s.key === 'locOng');
  x2.renderX1ChainCard(sp);
  const sel = document.getElementById('x1-loc-ong-src');
  const picked = pickOlderSource(sel);
  // Ghi 1 lÆ°á»£t dÃ¹ng Háº¾T pháº§n cÃ²n láº¡i cá»§a nguá»“n Ä‘ang chá»n (chÆ°a váº½ láº¡i)
  const srcRec = (state.xuong1BocRecords || []).find(b => b.id === picked) || {};
  const fullQty = Number(srcRec.qty) || 0;
  state.xuong1LocOngRecords.push({
    id: 'glo-full', bocId: picked, date: '2026-10-01', qtyIn: fullQty, qtyOk: 0,
    createdAt: '2026-10-01T02:00:00.000Z'
  });
  x2.resetX1ChainForm(sp);
  check('G9: nguá»“n Ä‘Ã£ háº¿t tá»“n â†’ Ã´ chá»n chuyá»ƒn sang nguá»“n CÃ’N HÃ€NG (khÃ´ng káº¹t nguá»“n cÅ©)',
    sel.value !== picked && optionValues(sel).includes(sel.value));
})();

console.log('--- F. Cáº¤U TRÃšC mÃ£ nguá»“n ---');
const xuong2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('F1: cÃ³ helper giá»¯ lá»±a chá»n + cache danh sÃ¡ch option',
  xuong2Src.includes('function setX2SelectOptions(sel, html)') && xuong2Src.includes('const x2SelHtmlCache = new Map();'));
const useCount = (xuong2Src.match(/setX2SelectOptions\(sel, html\)/g) || []).length;
check('F2: Ã¡p cho 8 hÃ m fill (4 tháº» XÆ°á»Ÿng 2 + 4 hÃ m XÆ°á»Ÿng 1) â€” ' + useCount + ' chá»—', useCount >= 8);
check('F3: Bá»• á»ng chá»‰ tá»± Ä‘iá»n KL khi Äá»”I LÃ” hoáº·c Ã´ TRá»NG (boOngFilledCutId)',
  xuong2Src.includes('let boOngFilledCutId = null;') &&
  /changedLot \|\| empty/.test(xuong2Src));
check('F4: X1 chá»‰ tá»± Ä‘iá»n Ã´ sá»‘ lÆ°á»£ng khi ÄANG TRá»NG (khÃ´ng xoÃ¡ sá»‘ Ä‘Ã£ nháº­p)',
  xuong2Src.includes('function x1SaySinhRenderAllocations()') &&
  xuong2Src.includes('current.has(id) ? current.get(id)') &&
  xuong2Src.includes("x1BocSyncLinked(!qtyEl") &&
  xuong2Src.includes("x1ChainSyncLinked(spec, !inEl"));
check('F5: sw.js Ä‘Ã£ tÄƒng cache cho giao diá»‡n má»›i', /nha-may-ngoc-son-v486/.test(swSrc));
check('F6: 8 tháº» XÆ°á»Ÿng 1 â€” 4 hÃ m reset dÃ¹ng helper giá»¯ nguá»“n qua form.reset()',
  xuong2Src.includes('function x1ResetKeepingSelect(formEl, selId)') &&
  (xuong2Src.match(/x1ResetKeepingSelect\(f, /g) || []).length === 4);

console.log(`\n=== Káº¾T QUáº¢ X2 FORM KEEP-SELECTION: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

