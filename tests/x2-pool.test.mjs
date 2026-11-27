// tests/x2-pool.test.mjs â€” Sá»” NHÃ“M KHá»I LÆ¯á»¢NG XÆ¯á»žNG 2 (Giai Ä‘oáº¡n 1 â€” 18/10/2026)
// Kiá»ƒm thá»­: phÃ¢n loáº¡i nguá»“n Â· pháº§n cÃ²n láº¡i cá»§a phiáº¿u cÃ¢n Â· nhÃ³m XE Bá»C Â·
// nhÃ³m á»NG Äáº T CHá»œ Bá»” Â· (hÃ m) cÃ¢n máº«u CÅ¨ chá»‰ Ä‘á»ƒ Ä‘á»c dá»¯ liá»‡u Â· nhÃ£n nhÃ  cung cáº¥p nhiá»u phiáº¿u Â·
// 3 luá»“ng nháº­p má»›i (Bá»‘c luá»“ng â†’ Cáº¯t chá»n â†’ Bá»• á»‘ng) + cháº·n vÆ°á»£t tá»“n +
// tÆ°Æ¡ng thÃ­ch dá»¯ liá»‡u LÃ” CÅ¨ + cáº¥u trÃºc index/events/styles/sw.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// KhÃ¡c cÃ¡c test cÅ©: 3 pháº§n tá»­ giao diá»‡n Má»šI cÃ³ getAttribute('data-x2-pool')
// tráº£ '1' Ä‘á»ƒ module nháº­n ra "trang Ä‘Ã£ náº¡p giao diá»‡n sá»• nhÃ³m" vÃ  cháº¡y Ä‘Æ°á»ng Má»šI.
const POOL_IDS = new Set(['x2-blg-tickets', 'x2-cut-kind-switch', 'x2-bo-ong-pool-note']);
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){},
    getAttribute(n) { return (n === 'data-x2-pool' && POOL_IDS.has(id)) ? '1' : null; },
    querySelector: () => null, querySelectorAll: () => [],
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
  querySelector: () => null, querySelectorAll: () => [],
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
global.Chart = class { constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
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

// â”€â”€â”€ Dá»® LIá»†U MáºªU: 5 phiáº¿u cÃ¢n á»Ÿ bÃ£i XÆ°á»Ÿng 2 + 1 lÃ´ XÆ°á»Ÿng 1 (pháº£i bá»‹ loáº¡i) â”€â”€
state.materialRecords = [
  { id: 'm1', type: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿',    location: 'xuong-2', inputIndex: 12000, outputIndex: 0, weight: 12000, date: '2026-10-17', createdAt: '2026-10-17T01:00:00.000Z' },
  { id: 'm2', type: 'Luá»“ng cÃ¢y khÃ´', supplier: 'NhÃ  Trung', location: 'xuong-2', inputIndex: 8000,  outputIndex: 0, weight: 8000,  date: '2026-10-18', createdAt: '2026-10-18T01:00:00.000Z' },
  { id: 'm3', type: 'Luá»“ng á»‘ng',    supplier: 'NhÃ  Táº¿',    location: 'xuong-2', inputIndex: 5000,  outputIndex: 0, weight: 5000,  date: '2026-10-17', createdAt: '2026-10-17T02:00:00.000Z' },
  { id: 'm4', type: 'Luá»“ng á»‘ng 2',  supplier: 'NhÃ  Trung', location: 'xuong-2', inputIndex: 3000,  outputIndex: 0, weight: 3000,  date: '2026-10-18', createdAt: '2026-10-18T02:00:00.000Z' },
  { id: 'm5', type: 'Luá»“ng cÃ¢y',    supplier: 'NhÃ  Táº¿',    location: 'xuong-1', inputIndex: 9000,  outputIndex: 0, weight: 9000,  date: '2026-10-17', createdAt: '2026-10-17T03:00:00.000Z' },
  { id: 'm6', type: 'Luá»“ng á»‘ng cÅ©', supplier: 'NhÃ  CÅ©',    location: 'xuong-2', inputIndex: 4000,  outputIndex: 0, weight: 4000,  date: '2026-09-01', createdAt: '2026-09-01T02:00:00.000Z' }
];
state.xuong2BoluongRecords = [];
state.xuong2CutRecords = [];
state.xuong2BoOngRecords = [];
// 1 lÆ°á»£t Cáº®T KIá»‚U CÅ¨ (khÃ´ng cÃ³ inputKind) â†’ lÃ´ m6 Ä‘Ã£ tiÃªu thá»¥ háº¿t
state.xuong2CutRecords.push({ id: 'cut-legacy', materialId: 'm6', materialType: 'Luá»“ng á»‘ng cÅ©', supplier: 'NhÃ  CÅ©', date: '2026-09-02', inputWeight: 4000, klOngLuong: 3000, klCuiDot: 200, klCayLoai: 300, createdAt: '2026-09-02T02:00:00.000Z' });
state.hrEmployees = [];
state.hrPositions = [];
state.hrAssignments = [];
state.x2CapRates = {}; state.x2BoluongRates = {}; state.x2BoOngRates = {};

const pool = await import('../js/x2-pool.js');
const x2 = await import('../js/xuong2.js');
const x2pp = await import('../js/x2-phu-pham.js');
const jsX2 = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const jsPP = fs.readFileSync(new URL('../js/x2-phu-pham.js', import.meta.url), 'utf8');

// â”€â”€â”€ A. Sá»” NHÃ“M: PHÃ‚N LOáº I + Tá»’N PHIáº¾U â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('A1: phÃ¢n loáº¡i Ä‘Ãºng 2 nhÃ³m nguá»“n (luá»“ng cÃ¢y / luá»“ng á»‘ng / khÃ¡c)',
  pool.x2MaterialKindOf('Luá»“ng cÃ¢y xÃ´') === 'cay' &&
  pool.x2MaterialKindOf('Luá»“ng á»‘ng') === 'ong' &&
  pool.x2MaterialKindOf('Váº§u cÃ¢y') === 'khac');
check('A2: phiáº¿u cÃ¢n chá»‰ láº¥y á»Ÿ bÃ£i XÆ°á»Ÿng 2 (bá» lÃ´ XÆ°á»Ÿng 1)',
  pool.x2PendingTickets('cay').every(m => m.location === 'xuong-2') &&
  !pool.x2PendingTickets('cay').some(m => m.id === 'm5'));
check('A3: pháº§n cÃ²n láº¡i cá»§a phiáº¿u = khá»‘i lÆ°á»£ng âˆ’ Ä‘Ã£ láº¥y', pool.x2TicketRemainingOf(state.materialRecords[0]) === 12000);
check('A4: lÃ´ cÅ© Ä‘Ã£ cÃ³ lÆ°á»£t cáº¯t (khÃ´ng inputKind) â†’ cÃ²n láº¡i 0', pool.x2TicketRemainingOf(state.materialRecords[5]) === 0);
check('A5: nhÃ³m xe rá»—ng; á»‘ng Ä‘áº¡t chá»‰ cÃ³ 3.000 kg cá»§a lÆ°á»£t cáº¯t CÅ¨',
  pool.x2CartsAvailable() === 0 && pool.x2OngDatAvailable() === 3000);
check('A6: (CÅ¨) hÃ m cÃ¢n máº«u váº«n giá»¯ Ä‘á»ƒ Äá»ŒC dá»¯ liá»‡u cÅ© â€” bá» trá»‘ng tráº£ null',
  pool.x2SampleAvg('590 610 600') === 600 &&
  pool.x2SampleAvg('590,5 610') === 600.25 &&
  pool.x2SampleAvg('') === null);


// â”€â”€â”€ B. Bá»C LUá»’NG: NHIá»€U PHIáº¾U CÃ‚N + Sá» XE + NGá»ŒN (Æ¯á»šC TÃNH) â”€â”€â”€â”€
const g = id => document.getElementById(id);
g('x2-blg-date').value = '2026-10-18';
x2.onX2BoluongTicketToggle('m1', true);
x2.onX2BoluongTicketToggle('m2', true);
g('x2-blg-carts').value = '30';
g('x2-blg-kg-cart').value = '600';
x2.renderX2BoluongCalc();   // váº½ láº¡i dÃ²ng tá»± tÃ­nh theo Sá»‘ xe Ã— KL/xe vá»«a nháº­p
check('B1: Ã´ "CÃ¢n máº«u" ÄÃƒ Gá»  â€” Bá»‘c Luá»“ng chá»‰ dÃ¹ng Sá»‘ xe Ã— KL/xe (600 kg)', Number(g('x2-blg-kg-cart').value) === 600);
check('B2: dÃ²ng tá»± tÃ­nh hiá»‡n 2 phiáº¿u Â· 20.000 kg Â· 30 xe = 18.000 kg Â· ngá»n 2.000 kg',
  g('x2-blg-calc').innerHTML.includes('2 phiáº¿u Â· 20.000 kg') &&
  g('x2-blg-calc').innerHTML.includes('18.000 kg') &&
  g('x2-blg-calc').innerHTML.includes('2.000 kg'));
g('x2-blg-carts').value = '40';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('B3: CHáº¶N lÆ°u khi Sá»‘ xe Ã— KL/xe vÆ°á»£t KL phiáº¿u Ä‘Ã£ chá»n', state.xuong2BoluongRecords.length === 0);
g('x2-blg-carts').value = '30';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
const b1 = state.xuong2BoluongRecords[0];
check('B4: lÆ°u lÆ°á»£t bá»‘c: 30 xe Â· 18.000 kg lÃªn xe Â· 20.000 kg láº¥y tá»« bÃ£i',
  !!b1 && b1.carts === 30 && b1.qty === 18000 && b1.inputWeight === 20000);
check('B5: Ngá»n + hao há»¥t (Æ°á»›c tÃ­nh) = 2.000 kg + cá» ngonEst',
  b1.ngonKg === 2000 && b1.ngonEst === true);
check('B6: NHIá»€U nhÃ  cung cáº¥p â†’ supplier rá»—ng + supplierLabel gá»™p "NhÃ  Táº¿ + NhÃ  Trung"',
  b1.supplier === '' && b1.supplierLabel === 'NhÃ  Táº¿ + NhÃ  Trung');
check('B7: 2 phiáº¿u Ä‘Ã£ láº¥y háº¿t â†’ pháº§n cÃ²n láº¡i = 0',
  pool.x2TicketRemainingOf(state.materialRecords[0]) === 0 &&
  pool.x2TicketRemainingOf(state.materialRecords[1]) === 0);
check('B8: nhÃ³m XE Bá»C = 30 xe Â· 18.000 kg chÆ°a cáº¯t',
  pool.x2CartsAvailable() === 30 && pool.x2CartsRemainingKg() === 18000);
x2.renderXuong2Cards();
check('B9: mini card Cáº¯t Chá»n = xe 18.000 + luá»“ng á»‘ng 8.000 = "Tá»“n 26.000 kg"',
  g('x2-mini-count-cut').textContent === 'Tá»“n 26.000 kg');
check('B10: mini card Bá»‘c Luá»“ng = "Háº¿t tá»“n" (Ä‘Ã£ bá»‘c háº¿t luá»“ng cÃ¢y)',
  g('x2-mini-count-bo-luong').textContent === 'Háº¿t tá»“n');

// â”€â”€â”€ C. Cáº®T CHá»ŒN â€” XE LUá»’NG CÃ‚Y (nhiá»u xe Ã— KL/xe) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.setX2CutInputKind('cart');
g('x2-cut-date').value = '2026-10-18';
g('x2-cut-carts').value = '10';
g('x2-cut-kg-cart').value = '600';
g('x2-cut-ongluong').value = '5000';
g('x2-cut-ongloi').value = '300';
g('x2-cut-matluong').value = '200';
x2.renderX2CutCalc();
check('C1: dÃ²ng tá»± tÃ­nh KL vÃ o 6.000 kg + hao há»¥t/khÃ¡c 500 kg',
  g('x2-cut-calc').innerHTML.includes('6.000 kg') &&
  g('x2-cut-calc').innerHTML.includes('500 kg'));
x2.handleXuong2CutSubmit({ preventDefault(){} });
const c1 = state.xuong2CutRecords.find(r => r.id !== 'cut-legacy');
check('C2: lÆ°u lÆ°á»£t cáº¯t XE: inputKind cart Â· 10 xe Ã— 600 = 6.000 kg',
  !!c1 && c1.inputKind === 'cart' && c1.carts === 10 && c1.inputWeight === 6000);
check('C3: 3 Ä‘áº§u ra + hao há»¥t: 5.000 Ä‘áº¡t Â· 300 lá»—i Â· 200 máº¯t Â· 500 khÃ¡c',
  c1.klOngLuong === 5000 && c1.klOngLoi === 300 && c1.klMatLuong === 200 && c1.klNgonOngLoai === 500);
check('C4: xe luá»“ng cÃ¢y â†’ á»‘ng lá»—i + máº¯t luá»“ng Ä‘i BÄ‚M', c1.rejectRoute === 'bam');
check('C5: nhÃ³m xe cÃ²n 20 xe Â· á»‘ng Ä‘áº¡t chá» bá»• 8.000 kg (3.000 cÅ© + 5.000)',
  pool.x2CartsAvailable() === 20 && pool.x2OngDatAvailable() === 8000);
check('C6: cutDisplay tráº£ Ä‘Ãºng loáº¡i Ä‘áº§u vÃ o + sá»‘ xe + KL/xe',
  x2.cutDisplay(c1).inputKindLabel === 'Xe luá»“ng cÃ¢y' &&
  x2.cutDisplay(c1).carts === 10 && x2.cutDisplay(c1).kgPerCart === 600);

// â”€â”€â”€ D. Cáº®T CHá»ŒN â€” LUá»’NG á»NG NGUYÃŠN LIá»†U (chá»‰ lá»c á»‘ng lá»—i) â”€â”€â”€â”€â”€â”€
x2.setX2CutInputKind('ong');
x2.onX2CutTicketToggle('m3', true);
x2.onX2CutTicketToggle('m4', true);
g('x2-cut-date').value = '2026-10-18';
g('x2-cut-ongluong').value = '';          // Ä‘á»ƒ trá»‘ng = tá»± tÃ­nh KL vÃ o âˆ’ á»‘ng lá»—i
g('x2-cut-ongloi').value = '400';
g('x2-cut-reject-route').value = 'tra_ncc';
x2.handleXuong2CutSubmit({ preventDefault(){} });
const c2 = state.xuong2CutRecords.find(r => r.inputKind === 'ong');
check('D1: lÆ°u lÆ°á»£t cáº¯t á»NG: 8.000 kg Â· á»‘ng Ä‘áº¡t Tá»° TÃNH 7.600 Â· á»‘ng lá»—i 400',
  !!c2 && c2.inputWeight === 8000 && c2.klOngLuong === 7600 && c2.klOngLoi === 400);
check('D2: hÆ°á»›ng "Tráº£ NCC" â†’ returnedKg = 400 (phá»¥c vá»¥ giáº£m trá»« tiá»n mua sau)',
  c2.rejectRoute === 'tra_ncc' && c2.returnedKg === 400);
check('D3: 2 phiáº¿u luá»“ng á»‘ng Ä‘Ã£ láº¥y háº¿t',
  pool.x2TicketRemainingOf(state.materialRecords[2]) === 0 &&
  pool.x2TicketRemainingOf(state.materialRecords[3]) === 0);
check('D4: tá»“n nhÃ³m á»‘ng Ä‘áº¡t = 3.000 cÅ© + 5.000 (xe) + 7.600 (á»‘ng) = 15.600 kg', pool.x2OngDatAvailable() === 15600);
check('D5: mini card Bá»• á»ng = "Tá»“n 15.600 kg"',
  (() => { x2.renderXuong2Cards(); return g('x2-mini-count-bo-ong').textContent === 'Tá»“n 15.600 kg'; })());

// â”€â”€â”€ E. Bá»” á»NG â€” CHá»ˆ KHá»I LÆ¯á»¢NG (khÃ´ng chá»n lÃ´) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
g('x2-bo-ong-date').value = '2026-10-18';
g('x2-bo-ong-bo').value = '6000';
g('x2-bo-ong-loai').value = '300';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
const o1 = state.xuong2BoOngRecords[0];
check('E1: lÆ°á»£t bá»• KHÃ”NG cÃ³ cutId + cá» poolMode', !!o1 && o1.cutId === '' && o1.poolMode === true);
check('E2: 6.000 kg Ä‘em bá»• âˆ’ 300 loáº¡i = 5.700 kg bá»• Ä‘áº¡t', o1.inputOng === 6000 && o1.klOngBo === 5700);
check('E3: nhÃ£n nguá»“n "Nhiá»u nguá»“n (chá»‰ khá»‘i lÆ°á»£ng)"', o1.materialType === 'Nhiá»u nguá»“n (chá»‰ khá»‘i lÆ°á»£ng)');
check('E4: tá»“n nhÃ³m á»‘ng Ä‘áº¡t cÃ²n 9.600 kg', pool.x2OngDatAvailable() === 9600);
check('E5: boOngDisplay bÃ¡o poolMode Â· khÃ´ng lÃ´ Â· khÃ´ng NCC',
  (() => { const d = x2.boOngDisplay(o1); return d.poolMode === true && d.lotRest === 0 && d.supplier === ''; })());


// â”€â”€â”€ F. CHáº¶N VÆ¯á»¢T Tá»’N NHÃ“M â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const nCut = state.xuong2CutRecords.length;
x2.setX2CutInputKind('cart');
g('x2-cut-date').value = '2026-10-18';
g('x2-cut-carts').value = '999';
g('x2-cut-kg-cart').value = '600';
g('x2-cut-ongluong').value = '1000';
g('x2-cut-ongloi').value = '0';
g('x2-cut-matluong').value = '0';
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('F1: CHáº¶N cáº¯t vÆ°á»£t sá»‘ xe Ä‘Ã£ bá»‘c & chÆ°a cáº¯t', state.xuong2CutRecords.length === nCut);
const nBo = state.xuong2BoOngRecords.length;
g('x2-bo-ong-bo').value = '99999';
g('x2-bo-ong-loai').value = '0';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('F2: CHáº¶N bá»• vÆ°á»£t tá»“n nhÃ³m á»‘ng Ä‘áº¡t chá» bá»•', state.xuong2BoOngRecords.length === nBo);

// â”€â”€â”€ G. TÆ¯Æ NG THÃCH Dá»® LIá»†U LÃ” CÅ¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const legacy = state.xuong2CutRecords.find(r => r.id === 'cut-legacy');
const ld = x2.cutDisplay(legacy);
check('G1: lÆ°á»£t cÅ© giá»¯ inputKind legacy + cÃ´ng thá»©c cÅ© (ngá»n/á»‘ng loáº¡i = 500)',
  ld.inputKind === 'legacy' && ld.klNgonOngLoai === 500);
check('G2: nhÃ£n loáº¡i Ä‘áº§u vÃ o cá»§a lÆ°á»£t cÅ© = "LÃ´ cÅ©"', x2.cutInputKindLabel(legacy) === 'LÃ´ cÅ©');
check('G3: lÆ°á»£t cÅ© KHÃ”NG tham gia nhÃ³m xe / nhÃ³m á»‘ng Ä‘áº¡t', legacy.inputKind === undefined);
// Äang sá»­a lÆ°á»£t cÅ© â†’ KHÃ”NG cho Ä‘á»•i loáº¡i Ä‘áº§u vÃ o (trÃ¡nh ghi Ä‘Ã¨ máº¥t dá»¯ liá»‡u lÃ´ cÅ©)
x2.editXuong2Cut('cut-legacy');
x2.setX2CutInputKind('cart');
check('G4: sá»­a lÆ°á»£t CÅ¨ â†’ nÃºt Ä‘á»•i loáº¡i bá»‹ cháº·n (váº«n hiá»‡n khá»‘i lÃ´ cÅ©)',
  g('x2-cut-cart-group').style.display === 'none' &&
  g('x2-cut-legacy-group').style.display === '');
x2.resetXuong2CutForm();
check('G5: "LÃ m Má»›i Form" â†’ vá» giao diá»‡n má»›i (chá»n loáº¡i Ä‘áº§u vÃ o hiá»‡n láº¡i)',
  g('x2-cut-kind-switch').style.display === '' && g('x2-cut-legacy-group').style.display === 'none');

// â”€â”€â”€ I. Sá»¬A Láº I LÆ¯á»¢T KIá»‚U Má»šI (khÃ´ng máº¥t liÃªn káº¿t, khÃ´ng táº¡o lÆ°á»£t má»›i) â”€â”€
x2.editXuong2Boluong(b1.id);
check('I1: má»Ÿ sá»­a lÆ°á»£t bá»‘c â†’ náº¡p láº¡i Ä‘Ãºng 30 xe Â· 600 kg/xe (khÃ´ng cÃ²n Ã´ CÃ¢n máº«u)',
  g('x2-blg-carts').value === '30' && g('x2-blg-kg-cart').value === '600');
g('x2-blg-carts').value = '31';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
const b1b = state.xuong2BoluongRecords.find(r => r.id === b1.id);
check('I2: sá»­a 30 â†’ 31 xe (18.600 kg) cáº­p nháº­t Ä‘Ãºng lÆ°á»£t, KHÃ”NG táº¡o lÆ°á»£t má»›i',
  state.xuong2BoluongRecords.length === 1 && b1b.carts === 31 && b1b.qty === 18600 && b1b.ngonKg === 1400);

x2.editXuong2Cut(c1.id);
check('I3: má»Ÿ sá»­a lÆ°á»£t cáº¯t xe â†’ náº¡p láº¡i sá»‘ xe + 3 Ä‘áº§u ra',
  g('x2-cut-carts').value === '10' && g('x2-cut-ongluong').value === '5000' &&
  g('x2-cut-ongloi').value === '300' && g('x2-cut-matluong').value === '200');
g('x2-cut-ongluong').value = '5100';
x2.handleXuong2CutSubmit({ preventDefault(){} });
const c1b = state.xuong2CutRecords.find(r => r.id === c1.id);
check('I4: sá»­a á»‘ng Ä‘áº¡t 5.000 â†’ 5.100 cáº­p nháº­t Ä‘Ãºng lÆ°á»£t',
  !!c1b && c1b.klOngLuong === 5100 && c1b.klNgonOngLoai === 400 &&
  state.xuong2CutRecords.filter(r => r.inputKind === 'cart').length === 1);

x2.editXuong2BoOng(o1.id);
check('I5: má»Ÿ sá»­a lÆ°á»£t bá»• â†’ váº«n á»Ÿ cháº¿ Ä‘á»™ Sá»” NHÃ“M (khá»‘i lÃ´ cÅ© áº©n)',
  g('x2-bo-ong-legacy-group').style.display === 'none' && g('x2-bo-ong-bo').value === '6000');
g('x2-bo-ong-bo').value = '5900';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
const o1b = state.xuong2BoOngRecords.find(r => r.id === o1.id);
check('I6: sá»­a KL Ä‘em bá»• 6.000 â†’ 5.900 cáº­p nháº­t Ä‘Ãºng lÆ°á»£t (bá»• Ä‘áº¡t 5.600)',
  !!o1b && o1b.inputOng === 5900 && o1b.klOngBo === 5600 && state.xuong2BoOngRecords.length === 1);

// â”€â”€â”€ H. Má»ž THáºº THáº¬T á»ž GIAO DIá»†N Sá»” NHÃ“M (khÃ´ng lá»—i) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('H0a: má»Ÿ tháº» Bá»‘c Luá»“ng á»Ÿ giao diá»‡n sá»• nhÃ³m khÃ´ng lá»—i', x2.x2OpenCard('x2-bo-luong-card') === true);
check('H0b: danh sÃ¡ch phiáº¿u cÃ¢n Ä‘Æ°á»£c váº½ (ká»ƒ cáº£ tráº¡ng thÃ¡i rá»—ng)',
  String(g('x2-blg-tickets').innerHTML || '').length > 0);
check('H0c: má»Ÿ tháº» Cáº¯t Chá»n â†’ dÃ²ng tá»± tÃ­nh Ä‘Æ°á»£c váº½',
  x2.x2OpenCard('x2-cut-card') === true && String(g('x2-cut-calc').innerHTML || '').length > 0);
check('H0d: má»Ÿ tháº» Bá»• á»ng â†’ ghi chÃº sá»• nhÃ³m hiá»‡n + khá»‘i lÃ´ cÅ© áº©n',
  x2.x2OpenCard('x2-bo-ong-card') === true &&
  g('x2-bo-ong-pool-note').style.display === '' &&
  g('x2-bo-ong-legacy-group').style.display === 'none');
check('H0e: tháº» Bá»• á»ng tá»± tÃ­nh theo Tá»’N NHÃ“M (khÃ´ng theo lÃ´)',
  String(g('x2-bo-ong-calc').innerHTML || '').includes('Tá»“n nhÃ³m á»‘ng Ä‘áº¡t'));

// â”€â”€â”€ H. Cáº¤U TRÃšC (index / events / styles / sw) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idx = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ev = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('H1: Bá»‘c Luá»“ng cÃ³ NÃšT má»Ÿ sheet PHIáº¾U CÃ‚N + Sá»‘ xe + KL/xe + Ã´ tá»± tÃ­nh (KHÃ”NG cÃ²n CÃ¢n máº«u)',
  idx.includes('id="x2-blg-tickets"') && idx.includes('id="x2-blg-tickets-btn"') &&
  idx.includes('id="x2-blg-tickets-sheet"') && idx.includes('id="x2-blg-carts"') &&
  idx.includes('id="x2-blg-kg-cart"') && idx.includes('id="x2-blg-calc"') &&
  !idx.includes('id="x2-blg-sample"'));
check('H2: Cáº¯t Chá»n cÃ³ cÃ´ng táº¯c 2 loáº¡i Ä‘áº§u vÃ o + sá»‘ xe + á»‘ng lá»—i + máº¯t luá»“ng + hÆ°á»›ng á»‘ng lá»—i + NÃšT sheet phiáº¿u',
  idx.includes('id="x2-cut-kind-switch"') && idx.includes('id="x2-cut-kind-ong"') &&
  idx.includes('id="x2-cut-carts"') && idx.includes('id="x2-cut-ongloi"') &&
  idx.includes('id="x2-cut-matluong"') && idx.includes('id="x2-cut-reject-route"') &&
  idx.includes('id="x2-cut-tickets-btn"') && idx.includes('id="x2-cut-tickets-sheet"') &&
  !idx.includes('id="x2-cut-sample"'));
check('H3: Bá»• á»ng cÃ³ ghi chÃº sá»• nhÃ³m + khá»‘i lÃ´ cÅ© (áº©n máº·c Ä‘á»‹nh)',
  idx.includes('id="x2-bo-ong-pool-note"') && idx.includes('id="x2-bo-ong-legacy-group"'));
check('H4: 3 pháº§n tá»­ Ä‘Ã¡nh dáº¥u giao diá»‡n sá»• nhÃ³m báº±ng data-x2-pool="1"',
  (idx.match(/data-x2-pool="1"/g) || []).length >= 3);
check('H5: Ã´ chá»n lÃ´ cÅ© KHÃ”NG cÃ²n required (trÃ¡nh cháº·n submit khi áº©n)',
  !/id="x2-cut-material"[^>]*required/.test(idx) &&
  !/id="x2-bo-ong-cut"[^>]*required/.test(idx) &&
  !/id="x2-blg-material"[^>]*required/.test(idx));
check('H6: events ná»‘i 2 cÃ´ng táº¯c + bá»™ chá»n phiáº¿u + nÃºt "Láº¥y Háº¿t Tá»“n"',
  ev.includes('bindX2TicketPicker') && ev.includes("setX2CutInputKind('ong')") &&
  ev.includes("setX2CutInputKind('cart')") && ev.includes('btn-x2-ong-all'));
check('H7: CSS cÃ³ khá»‘i sá»• nhÃ³m (cÃ´ng táº¯c Â· phiáº¿u cÃ¢n Â· dÃ²ng tá»± tÃ­nh Â· ghi chÃº)',
  css.includes('.x2-kind-switch') && css.includes('.x2-ticket-picker') &&
  css.includes('.x2-pool-calc') && css.includes('.x2-pool-note'));
check('H8: sw.js cache v278 + náº¡p js/x2-pool.js vÃ o APP_SHELL',
  /nha-may-ngoc-son-v486/.test(sw) && sw.includes("./js/x2-pool.js"));

// â•â•â• J. UI ÄIá»†N THOáº I: SHEET CHá»ŒN PHIáº¾U + Ã” Sá» 6 CHá»® Sá» + KHÃ”NG CÃ’N KHOáº¢NG TRáº®NG â•â•â•
// (1) Sheet chá»n phiáº¿u cÃ¢n: nÃºt "N phiáº¿u Â· X kg" â†’ má»Ÿ panel â†’ chá»n nhiá»u phiáº¿u â†’
//     báº¥m "Xong" má»›i thu gá»n (KHÃ”NG tá»± Ä‘Ã³ng sau má»—i láº§n tick).
check('J1: index cÃ³ NÃšT + SHEET cho cáº£ 2 tháº», sheet áº¨N máº·c Ä‘á»‹nh (thuá»™c tÃ­nh hidden)',
  /id="x2-blg-tickets-btn"[^>]*aria-expanded="false"[^>]*aria-controls="x2-blg-tickets-sheet"/.test(idx) &&
  /id="x2-blg-tickets-sheet" hidden/.test(idx) &&
  /id="x2-cut-tickets-btn"[^>]*aria-expanded="false"[^>]*aria-controls="x2-cut-tickets-sheet"/.test(idx) &&
  /id="x2-cut-tickets-sheet" hidden/.test(idx));
check('J2: sheet cÃ³ thanh tiÃªu Ä‘á» + nÃºt "Xong" Ä‘á»ƒ thu gá»n',
  (idx.match(/class="x2-ticket-sheet-head"/g) || []).length === 2 &&
  idx.includes('id="x2-blg-tickets-close"') && idx.includes('id="x2-cut-tickets-close"'));
check('J3: nÃºt hiá»‡n tá»•ng káº¿t "N phiáº¿u Â· X kg" (2 id summary + 2 id sub)',
  idx.includes('id="x2-blg-tickets-summary"') && idx.includes('id="x2-blg-tickets-sub"') &&
  idx.includes('id="x2-cut-tickets-summary"') && idx.includes('id="x2-cut-tickets-sub"'));
check('J4: JS cÃ³ X2_TICKET_SHEETS + toggle/close/summary + Ä‘Äƒng kÃ½ vÃ o X2_FLOAT_PAIRS',
  /const X2_TICKET_SHEETS/.test(jsX2) && /function toggleX2TicketSheet/.test(jsX2) &&
  /function closeX2TicketSheet/.test(jsX2) && /function renderX2TicketSummary/.test(jsX2) &&
  /function isX2TicketSheetOpen/.test(jsX2) &&
  /\['x2-blg-tickets-sheet', 'x2-blg-tickets-btn'\]/.test(jsX2) &&
  /\['x2-cut-tickets-sheet', 'x2-cut-tickets-btn'\]/.test(jsX2));
check('J5: events ná»‘i nÃºt má»Ÿ + nÃºt "Xong" cho cáº£ 2 sheet',
  ev.includes("toggleX2TicketSheet('cut')") && ev.includes("closeX2TicketSheet('cut')") &&
  ev.includes("toggleX2TicketSheet('boluong')") && ev.includes("closeX2TicketSheet('boluong')"));
check('J6: CSS sheet (nÃºt Â· panel Â· thanh tiÃªu Ä‘á» Â· bottom-sheet Ä‘iá»‡n thoáº¡i)',
  css.includes('.x2-ticket-trigger') && css.includes('.x2-ticket-sheet') &&
  css.includes('.x2-ticket-sheet-head') && css.includes('.x2-ticket-sheet[hidden]') &&
  /\.x2-ticket-sheet \{[\s\S]{0,220}bottom: 8px !important/.test(css));
check('J7: CSS viá»n rÃµ tá»«ng dÃ²ng phiáº¿u + khung dÃ²ng tá»± tÃ­nh (4 cáº¡nh)',
  /\.x2-ticket-row \{[\s\S]{0,200}border: 1px solid var\(--border\)/.test(css) &&
  /\.x2-pool-calc \{[\s\S]{0,260}border: 1px solid var\(--border\)/.test(css));
check('J8: CSS Sá»¬A Lá»–I KHOáº¢NG TRáº®NG Ä‘iá»‡n thoáº¡i â€” .x2-form-row GIá»® hÃ ng ngang + tá»± xuá»‘ng dÃ²ng (KHÃ”NG column)',
  /@media \(max-width: 640px\) \{\s*\.x2-form-row \{\s*flex-direction: row;\s*flex-wrap: wrap;/.test(css) &&
  /\.x2-form-row > \.form-group,[\s\S]{0,120}flex: 1 1 100% !important/.test(css));
check('J9: CSS Ã´ sá»‘ 6 chá»¯ sá»‘ â€” desktop 128px Â· Ä‘iá»‡n thoáº¡i 2 Ã´/hÃ ng (50%)',
  /\.form-group\.x2-num6 \{ flex: 0 0 128px; \}/.test(css) &&
  /\.form-group\.x2-num6 \{\s*flex: 1 1 calc\(50% - 4px\) !important/.test(css));
check('J10: index gáº¯n class x2-num6 + max="999999" cho Bá»‘c Â· Cáº¯t Â· Bá»• Â· Phá»¥ pháº©m',
  (idx.match(/class="form-group x2-num6"/g) || []).length >= 9 &&
  (idx.match(/max="999999"/g) || []).length >= 9);
check('J11: JS cháº·n sá»‘ > 999.999 á»Ÿ Bá»‘c Â· Cáº¯t Â· Bá»• (helper x2Num6Ok) + Phá»¥ pháº©m (ppNum6Ok)',
  /const X2_MAX6 = 999999;/.test(jsX2) && /function x2Num6Ok/.test(jsX2) &&
  (jsX2.match(/x2Num6Ok\(/g) || []).length >= 6 &&
  /const PP_MAX6 = 999999;/.test(jsPP) && /function ppNum6Ok/.test(jsPP) &&
  (jsPP.match(/ppNum6Ok\(/g) || []).length >= 4);

// â”€â”€â”€ HÃ€NH VI: má»Ÿ/Ä‘Ã³ng sheet + tá»•ng káº¿t + khÃ´ng tá»± Ä‘Ã³ng â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.materialRecords.push({ id: 'm7', type: 'Luá»“ng cÃ¢y má»›i', supplier: 'NhÃ  Táº¿', location: 'xuong-2', inputIndex: 5000, outputIndex: 0, weight: 5000, date: '2026-10-19', createdAt: '2026-10-19T01:00:00.000Z' });
g('x2-blg-tickets-sheet').hidden = true;
check('J12: báº¥m nÃºt â†’ Má»ž sheet (hidden = false)', x2.toggleX2TicketSheet('boluong') === true && g('x2-blg-tickets-sheet').hidden === false);
check('J13: chÆ°a chá»n phiáº¿u â†’ nÃºt ghi "ChÆ°a chá»n phiáº¿u cÃ¢n"',
  g('x2-blg-tickets-summary').textContent === 'ChÆ°a chá»n phiáº¿u cÃ¢n');
x2.onX2BoluongTicketToggle('m7', true);
check('J14: chá»n 1 phiáº¿u â†’ nÃºt ghi "1 phiáº¿u Â· 5.000 kg" + nhÃ£n NCC; sheet VáºªN Má»ž (khÃ´ng tá»± Ä‘Ã³ng)',
  g('x2-blg-tickets-summary').textContent === '1 phiáº¿u Â· 5.000 kg' &&
  String(g('x2-blg-tickets-sub').textContent).includes('NhÃ  Táº¿') &&
  g('x2-blg-tickets-sheet').hidden === false);
check('J15: báº¥m "Xong" â†’ THU Gá»ŒN sheet', x2.closeX2TicketSheet('boluong') === true && g('x2-blg-tickets-sheet').hidden === true);
g('x2-cut-tickets-sheet').hidden = true;
check('J16: sheet Cáº¯t Chá»n má»Ÿ/Ä‘Ã³ng Ä‘Æ°á»£c',
  x2.toggleX2TicketSheet('cut') === true && g('x2-cut-tickets-sheet').hidden === false &&
  x2.closeX2TicketSheet('cut') === true && g('x2-cut-tickets-sheet').hidden === true);
// ÄIá»†N THOáº I (â‰¤639px): sheet neo ÄÃY overlay, full bá» ngang
const _iw = window.innerWidth;
window.innerWidth = 390;
g('x2-blg-tickets-sheet').classList.add('x2-ticket-sheet');
g('x2-blg-tickets-sheet').hidden = false;
x2.positionX2FloatPicker('x2-blg-tickets-sheet', 'x2-blg-tickets-btn');
check('J17: Ä‘iá»‡n thoáº¡i â†’ BOTTOM-SHEET (left/right/bottom 8px Â· width auto Â· cÃ³ maxHeight)',
  g('x2-blg-tickets-sheet').style.left === '8px' &&
  g('x2-blg-tickets-sheet').style.right === '8px' &&
  g('x2-blg-tickets-sheet').style.bottom === '8px' &&
  g('x2-blg-tickets-sheet').style.width === 'auto' &&
  /px$/.test(String(g('x2-blg-tickets-sheet').style.maxHeight || '')));
x2.closeX2TicketSheet('boluong');
window.innerWidth = _iw;

// â”€â”€â”€ HÃ€NH VI: cháº·n sá»‘ quÃ¡ 6 chá»¯ sá»‘ (khÃ´ng lÆ°u) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _blgN = state.xuong2BoluongRecords.length;
g('x2-blg-date').value = '2026-10-19';
g('x2-blg-carts').value = '1000000';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('J18: Bá»‘c Luá»“ng â€” Sá»‘ xe 1.000.000 (> 6 chá»¯ sá»‘) bá»‹ CHáº¶N, khÃ´ng ghi lÆ°á»£t',
  state.xuong2BoluongRecords.length === _blgN);
g('x2-blg-carts').value = '1';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('J19: Sá»‘ xe há»£p lá»‡ (1 xe Ã— 600 = 600 kg) ghi Ä‘Æ°á»£c lÆ°á»£t', state.xuong2BoluongRecords.length === _blgN + 1);
const _cutN = state.xuong2CutRecords.length;
x2.setX2CutInputKind('cart');
g('x2-cut-date').value = '2026-10-19';
g('x2-cut-carts').value = '1000000';
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('J20: Cáº¯t Chá»n â€” Sá»‘ xe 1.000.000 bá»‹ CHáº¶N, khÃ´ng ghi lÆ°á»£t', state.xuong2CutRecords.length === _cutN);
const _boN = state.xuong2BoOngRecords.length;
g('x2-bo-ong-date').value = '2026-10-19';
g('x2-bo-ong-bo').value = '1000000';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('J21: Bá»• á»ng â€” KL Ä‘em bá»• 1.000.000 bá»‹ CHáº¶N, khÃ´ng ghi lÆ°á»£t', state.xuong2BoOngRecords.length === _boN);
const _ppN = (state.x2PhuPhamRecords || []).length;
g('x2-pp-date').value = '2026-10-19';
g('x2-pp-kind').value = 'ngon';
g('x2-pp-out-form').value = 'raw';
g('x2-pp-out-type').value = 'sale';
g('x2-pp-kg').value = '1000000';
x2pp.handleX2PhuPhamSubmit({ preventDefault(){} });
check('J22: Phá»¥ Pháº©m â€” KL cÃ¢n thá»±c 1.000.000 bá»‹ CHáº¶N, khÃ´ng ghi lÆ°á»£t',
  (state.x2PhuPhamRecords || []).length === _ppN);

// â•â•â• K. Sá»” Ã‚M â€” Cáº¢NH BÃO KHI Bá»” VÆ¯á»¢T Cáº®T (11/11/2026) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Bá»• thÃªm (dÆ° sá»• + 500) kg â†’ sá»• Ã¢m 500 kg:
//   â€¢ x2OngDatRawOf tráº£ sá»‘ Ã‚M (khÃ´ng káº¹p 0) Â· x2OngDatAvailable váº«n káº¹p 0
//   â€¢ chip mini card + thanh tá»“n + Ã´ tá»± tÃ­nh hiá»‡n "Sá»• Ã¢m â€¦" thay vÃ¬ "Háº¿t tá»“n"
const rawBefore = pool.x2OngDatRawOf();
state.xuong2BoOngRecords.push({ id: 'bo-am-test', date: '2026-10-19', inputOng: rawBefore + 500, klOngBo: rawBefore + 500, klOngLoai: 0, poolMode: true, createdAt: '2026-10-19T00:00:00.000Z' });
check('K1: x2OngDatRawOf tráº£ Ã‚M khi bá»• vÆ°á»£t cáº¯t (khÃ´ng káº¹p 0)',
  pool.x2OngDatRawOf() < 0 && Math.abs(pool.x2OngDatRawOf() + 500) < 1e-6);
check('K2: x2OngDatAvailable váº«n káº¹p vá» 0 khi sá»• Ã¢m (tÆ°Æ¡ng thÃ­ch má»i chá»— cÅ©)',
  pool.x2OngDatAvailable() === 0);
check('K3: chip mini card Bá»• á»ng = "Sá»• Ã¢m 500 kg"',
  (() => { x2.renderXuong2Cards(); return g('x2-mini-count-bo-ong').textContent === 'Sá»• Ã¢m 500 kg'; })());
x2.renderX2BoOngStockBar();
check('K4: thanh tá»“n hiá»‡n cáº£nh bÃ¡o Sá»” Ã‚M (khÃ´ng cÃ²n "Háº¿t tá»“n")',
  String(g('x2-ong-stock-bar').innerHTML || '').includes('x2-stock-warn') &&
  String(g('x2-ong-stock-bar').innerHTML || '').includes('Sá»• Ã¢m 500 kg') &&
  !String(g('x2-ong-stock-bar').innerHTML || '').includes('Háº¿t tá»“n'));
check('K5: Ã´ tá»± tÃ­nh form cÃ³ nhÃ¡nh "Sá»• Ã¢m" (nguá»“n js/xuong2.js)',
  /restAm \? `Sá»• Ã¢m \$\{fmtKg\(-rest\)\} kg`/.test(jsX2) &&
  /restAm \? 'Sá»” Ã‚M: tá»•ng KL Ä‘em bá»•/.test(jsX2));
state.xuong2BoOngRecords = state.xuong2BoOngRecords.filter(r => r.id !== 'bo-am-test');
check('K6: bá» lÆ°á»£t bá»• vÆ°á»£t â†’ sá»• vá» Ä‘Ãºng dÆ° cÅ©', pool.x2OngDatRawOf() === rawBefore);
check('K7: CSS cáº£nh bÃ¡o sá»• Ã¢m + sw.js v486',
  css.includes('.x2-stock-title.x2-stock-warn') && /nha-may-ngoc-son-v486/.test(sw));

// â•â•â• L. CHáº¶N XÃ“A/GIáº¢M LÆ¯á»¢T Cáº®T KHI Sá»” á»NG Äáº T Sáº¼ Ã‚M (13/11/2026) â•â•â•â•â•â•â•
// NguyÃªn táº¯c: tá»“n cÃ´ng Ä‘oáº¡n sau â‰¥ 0 so vá»›i cÃ´ng Ä‘oáº¡n trÆ°á»›c. XÃ³a/GIáº¢M
// klOngLuong cá»§a lÆ°á»£t cáº¯t sau khi Ä‘Ã£ cÃ³ lÆ°á»£t bá»• láº¥y sá»‘ â‡’ sá»• Ã¢m â‡’ confirm().
const _confirmTrue = global.confirm;
const rawL = pool.x2OngDatRawOf();   // dÆ° sá»• gá»‘c trÆ°á»›c khi thá»­
// Ã‰p sá»• Ã¢m báº±ng 1 lÆ°á»£t bá»• thá»­ (Ä‘áº©y tháº³ng state â€” bá» qua cháº·n lÃºc lÆ°u)
state.xuong2BoOngRecords.push({ id: 'bo-am-l', date: '2026-10-20', inputOng: rawL + 200, klOngBo: rawL + 200, klOngLoai: 0, poolMode: true, createdAt: '2026-10-20T00:00:00.000Z' });
check('L0 setup: sá»• Ã¢m âˆ’200', pool.x2OngDatRawOf() === rawL - (rawL + 200) && pool.x2OngDatRawOf() < 0);
// ThÃªm 1 lÆ°á»£t cáº¯t 500 kg â†’ dÆ° sá»• = 300
state.xuong2CutRecords.push({ id: 'cut-am-test', date: '2026-10-20', inputKind: 'cart', carts: 5, kgPerCart: 600, inputWeight: 3000, klOngLuong: 500, klOngLoi: 0, klMatLuong: 0, createdAt: '2026-10-20T00:00:00.000Z' });
global.confirm = () => false;
x2.deleteXuong2Cut('cut-am-test');
check('L1: XÃ“A lÃ m sá»• Ã¢m (300âˆ’500) + xÃ¡c nháº­n Há»¦Y â†’ lÆ°á»£t cáº¯t giá»¯ nguyÃªn', !!state.xuong2CutRecords.find(r => r.id === 'cut-am-test'));
check('L2: Há»§y xÃ³a â†’ dÆ° sá»• giá»¯ 300', Math.abs(pool.x2OngDatRawOf() - 300) < 1e-6);
global.confirm = () => true;
x2.deleteXuong2Cut('cut-am-test');
check('L3: xÃ¡c nháº­n OK â†’ xÃ³a Ä‘Æ°á»£c, dÆ° sá»• vá» âˆ’200', !state.xuong2CutRecords.find(r => r.id === 'cut-am-test') && Math.abs(pool.x2OngDatRawOf() + 200) < 1e-6);
// Sá»¬A GIáº¢M á»‘ng Ä‘áº¡t qua form (Ä‘Æ°á»ng sá»• nhÃ³m 'ong'): sá»• sáº½ Ã¢m â†’ cháº·n khi Há»§y
state.materialRecords.push({ id: 'm9-am-test', type: 'Luá»“ng á»‘ng (thá»­ sá»• Ã¢m)', supplier: 'NhÃ  Thá»­', location: 'xuong-2', inputIndex: 2000, outputIndex: 0, weight: 2000, date: '2026-10-21', createdAt: '2026-10-21T00:00:00.000Z' });
state.xuong2CutRecords.push({ id: 'cut-am-edit', date: '2026-10-21', inputKind: 'ong', tickets: [{ materialId: 'm9-am-test', kg: 2000 }], inputWeight: 2000, klOngLuong: 500, klOngLoi: 0, klMatLuong: 0, createdAt: '2026-10-21T00:00:00.000Z' });
x2.editXuong2Cut('cut-am-edit');
g('x2-cut-ongluong').value = '100';           // giáº£m máº¡nh â†’ sá»• sáº½ Ã¢m (300âˆ’500+100)
global.confirm = () => false;
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('L4: Sá»¬A GIáº¢M lÃ m sá»• Ã¢m + xÃ¡c nháº­n Há»¦Y â†’ klOngLuong giá»¯ nguyÃªn 500',
  state.xuong2CutRecords.find(r => r.id === 'cut-am-edit').klOngLuong === 500);
global.confirm = () => true;
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('L5: xÃ¡c nháº­n OK â†’ klOngLuong cáº­p nháº­t 100 kg', state.xuong2CutRecords.find(r => r.id === 'cut-am-edit').klOngLuong === 100);
// Sá»­a TÄ‚NG khÃ´ng bao giá» bá»‹ cháº·n (khÃ´ng gá»i confirm)
x2.editXuong2Cut('cut-am-edit');
g('x2-cut-ongluong').value = '250';           // tÄƒng â†’ khÃ´ng cáº§n confirm
let _confirmCalled = false;
global.confirm = () => { _confirmCalled = true; return false; };
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('L6: Sá»¬A TÄ‚NG á»‘ng Ä‘áº¡t â†’ KHÃ”NG gá»i confirm, lÆ°u bÃ¬nh thÆ°á»ng',
  _confirmCalled === false && state.xuong2CutRecords.find(r => r.id === 'cut-am-edit').klOngLuong === 250);
// Dá»n: bá» lÆ°á»£t cáº¯t thá»­ + lÆ°á»£t bá»• thá»­ â†’ dÆ° sá»• vá» gá»‘c
state.xuong2CutRecords = state.xuong2CutRecords.filter(r => r.id !== 'cut-am-edit');
state.xuong2BoOngRecords = state.xuong2BoOngRecords.filter(r => r.id !== 'bo-am-l');
check('L7: dá»n lÆ°á»£t thá»­ â†’ dÆ° sá»• vá» Ä‘Ãºng giÃ¡ trá»‹ gá»‘c', Math.abs(pool.x2OngDatRawOf() - rawL) < 1e-6);
check('L8: cá»•ng cháº·n cÃ³ á»Ÿ Cáº¢ nhÃ¡nh sá»­a (sá»• nhÃ³m + lÃ´ cÅ©) vÃ  nhÃ¡nh xÃ³a',
  (jsX2.match(/confirmCutOngDatAm\(rec, payload\.klOngLuong\)/g) || []).length === 2 &&
  /const okAm = confirmCutOngDatAm\(rec, null\)/.test(jsX2));
global.confirm = _confirmTrue;

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

