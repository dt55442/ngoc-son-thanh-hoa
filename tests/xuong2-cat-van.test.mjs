// tests/xuong2-cat-van.test.mjs â€” Kiá»ƒm thá»­ THáºº "Cáº®T VÃN" (XÆ°á»Ÿng 2) â€” 2 cÃ´ng Ä‘oáº¡n
// nhá» trong 1 tháº»: Cáº®T VÃN (Ä‘áº§u vÃ o = vÃ¡n á»Ÿ Ã‰p VÃ¡n â†’ sá»‘ táº¥m cáº¯t) + Xáºº THANH (Ä‘áº§u vÃ o
// = vÃ¡n Ã‰p VÃ¡n â†’ kÃ­ch thÆ°á»›c Ä‘áº§u ra â†’ sá»‘ thanh) + nÃºt "ThÃªm" cho TÆ¯Æ NG LAI.
// Tá»’N Äáº¦U VÃ€O TRá»ª THEO Ká»²: nÃºt 1 tuáº§n / 2 tuáº§n (cáº·p láº»â€“cháºµn VD 41â€“42) â€” má»—i lÆ°á»£t
// lÆ°u kÃ¨m periodKey, ká»³ CHá»’NG NHAU váº«n trá»« (khÃ´ng cáº¯t trÃ¹ng khi Ä‘á»•i cháº¿ Ä‘á»™).
// Äá»‹nh má»©c RIÃŠNG: Cáº¯t vÃ¡n = táº¥m/h Â· Xáº» thanh = thanh/h â†’ 2 dÃ²ng Báº£ng Tá»•ng Há»£p.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-bullig.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Dá»¯ liá»‡u máº«u: LÆ¯á»¢T Ã‰P VÃN (nguá»“n Äáº¦U VÃ€O cá»§a Cáº¯t VÃ¡n) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tuáº§n ISO 2026: 05â€“11/10 = tuáº§n 41 Â· 12â€“18/10 = tuáº§n 42 Â· 30/09 = tuáº§n 40.
const { state, STORAGE_KEY_XUONG2_CAT_VAN, STORAGE_KEY_X2_CAT_VAN_RATE, STORAGE_KEY_X2_CAT_VAN_SPAN } =
  await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.pressRecords = [
  // p1 â€” tuáº§n 41: vÃ¡n thÃ´ 1220Ã—2440Ã—9 Ã— 20 táº¥m
  { id: 'p1', date: '2026-10-06', week: 'Tuáº§n 41', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 20 }], sticks: [] },
  // p2 â€” tuáº§n 42: vÃ¡n thÃ´ cÃ¹ng cá»¡ Ã— 30 táº¥m (CHá»ˆ Náº°M TRONG Cáº¶P 41â€“42)
  { id: 'p2', date: '2026-10-13', week: 'Tuáº§n 42', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 30 }], sticks: [] },
  // p3 â€” tuáº§n 42: THÃ€NH PHáº¨M 1200Ã—382Ã—12 Ã— 50 táº¥m
  { id: 'p3', date: '2026-10-13', week: 'Tuáº§n 42', year: 2026, finishedQty: 50,
    productName: 'VÃ¡n 1200x382x12', fpDim: '1200Ã—382Ã—12', vanTho: [], sticks: [] },
  // p4 â€” tuáº§n 40 (NGOÃ€I ká»³ 41 vÃ  cáº·p 41â€“42) â†’ KHÃ”NG Ä‘Æ°á»£c vÃ o pool
  { id: 'p4', date: '2026-09-30', week: 'Tuáº§n 40', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 999 }], sticks: [] }
];
state.xuong2CatVanRecords = [];
state.x2CatVanRates = { cat: {}, xe: {} };
state.x2CatVanEditId = null;
state.x2CatVanSpan = 1;

// â”€â”€â”€ NhÃ¢n Sá»±: phÃ¢n vá»‹ "Cáº¯t VÃ¡n" + "Xáº» Thanh" (XÆ°á»Ÿng 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.hrEmployees = [
  { id: 'empCat', name: 'Pháº¡m VÄƒn Cáº¯t', quitDate: '' },
  { id: 'empXe', name: 'Äá»— Thá»‹ Xáº»', quitDate: '' },
  { id: 'empOther', name: 'LÃª VÄƒn KhÃ¡c', quitDate: '' }
];
state.hrPositions = [
  { id: 'pcv', name: 'Cáº¯t VÃ¡n', department: 'XÆ°á»Ÿng 2' },
  { id: 'pxe', name: 'Xáº» Thanh', department: 'XÆ°á»Ÿng 2' },
  { id: 'pkhac', name: 'BÃ o Tinh', department: 'XÆ°á»Ÿng 2' }
];
state.hrAssignments = [
  { id: 'a-cat', date: '2026-10-06', department: 'XÆ°á»Ÿng 2', positionId: 'pcv', employeeId: 'empCat', start: '07:00', end: '12:00' },
  { id: 'a-xe', date: '2026-10-06', department: 'XÆ°á»Ÿng 2', positionId: 'pxe', employeeId: 'empXe', start: '13:00', end: '17:30' },
  { id: 'a-khac', date: '2026-10-06', department: 'XÆ°á»Ÿng 2', positionId: 'pkhac', employeeId: 'empOther', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');
// â”€â”€â”€ A. Ká»² Tá»’N: 1 TUáº¦N / 2 TUáº¦N (Cáº¶P Láººâ€“CHáº´N) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('Ká»²: 1 tuáº§n 06/10 â†’ tuáº§n 41 (khÃ´ng cÃ³ tuáº§n káº¿t)',
  x2.catVanPeriodOf('2026-10-06', 1).start === 41 && x2.catVanPeriodOf('2026-10-06', 1).end == null);
check('Ká»²: 2 tuáº§n 06/10 â†’ Cáº¶P 41â€“42 (tuáº§n láº» = Ä‘áº§u cáº·p)',
  (() => { const p = x2.catVanPeriodOf('2026-10-06', 2); return p.start === 41 && p.end === 42; })());
check('Ká»²: 2 tuáº§n 13/10 (tuáº§n 42 CHáº¶N) â†’ VáºªN Cáº¶P 41â€“42 (khÃ´ng chá»“ng láº¥n)',
  (() => { const p = x2.catVanPeriodOf('2026-10-13', 2); return p.start === 41 && p.end === 42; })());
check('Ká»²: periodKey 1 tuáº§n = 2026-W41 Â· 2 tuáº§n = 2026-W41-42',
  x2.catVanPeriodKeyOf('2026-10-06', 1) === '2026-W41' &&
  x2.catVanPeriodKeyOf('2026-10-06', 2) === '2026-W41-42');
check('Ká»²: nhÃ£n 2 tuáº§n 13/10 = "Tuáº§n 41â€“42"',
  x2.catVanPeriodLabel('2026-10-13', 2) === 'Tuáº§n 41â€“42');

// â”€â”€â”€ B. THáºº LAUNCHER + Má»ž POP-UP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.renderXuong2Cards();
check('THáºº: mini card Cáº¯t VÃ¡n chÆ°a cÃ³ lÆ°á»£t â†’ "ChÆ°a ghi"',
  document.getElementById('x2-mini-count-cat-van').textContent === 'ChÆ°a ghi');
check('THáºº: KHÃ”NG cÃ²n cá» "soon" (Ä‘Ã£ báº­t chá»©c nÄƒng)',
  !x2.X2_CARD_DEFS['x2-cat-van-card'].soon);
check('THáºº: má»Ÿ tháº» Cáº¯t VÃ¡n tráº£ vá» true (render khÃ´ng nÃ©m lá»—i)',
  x2.x2OpenCard('x2-cat-van-card') === true);
check('THáºº: pop-up báº­t + tháº» hiá»‡n (khÃ´ng cÃ²n x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-cat-van-card').classList.contains('x2-card-hidden'));
check('THáºº: tháº» Ä‘ang má»Ÿ ghi vÃ o state + vÃ¹ng dá»¯ liá»‡u/Xuáº¥t Excel',
  state.x2OpenCardId === 'x2-cat-van-card' &&
  x2.x2OpenCardHistoryDomain() === 'xuong2CatVanRecords' &&
  x2.x2OpenCardExportSource() === 'catvan');

// â”€â”€â”€ C. POOL NGUá»’N Äáº¦U VÃ€O THEO Ká»² (1 TUáº¦N) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-cv-date').value = '2026-10-06';
x2.renderX2CatVanCard();
check('NGUá»’N (1 tuáº§n): chá»‰ vÃ¡n thÃ´ tuáº§n 41 â€” 20 táº¥m (tuáº§n 40 + tuáº§n 42 KHÃ”NG lá»t)',
  (() => { const it = x2.catVanInputPool('2026-10-06'); return it.length === 1 && it[0].sizeKey === '1220Ã—2440Ã—9' && it[0].total === 20 && it[0].group === 'vantho'; })());
check('NGUá»’N (1 tuáº§n): Ã´ Äáº§u vÃ o cÃ³ optgroup "VÃ¡n thÃ´ (Ã‰p VÃ¡n)" + cÃ²n 20/20 táº¥m',
  document.getElementById('x2-cv-source').innerHTML.includes('optgroup label="VÃ¡n thÃ´ (Ã‰p VÃ¡n)"') &&
  document.getElementById('x2-cv-source').innerHTML.includes('1220Ã—2440Ã—9 â€” cÃ²n 20 / 20 táº¥m'));
check('Tá»’N (1 tuáº§n): thanh tá»“n ghi "VÃ¡n thÃ´: 20 táº¥m" + ká»³ "Tuáº§n 41"',
  document.getElementById('x2-cv-stock-bar').innerHTML.includes('VÃ¡n thÃ´: <strong>20 táº¥m</strong>') &&
  document.getElementById('x2-cv-stock-bar').innerHTML.includes('Tuáº§n 41'));

// â”€â”€â”€ D. Äá»”I SANG 2 TUáº¦N (Cáº¶P 41â€“42) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.setX2CatVanSpan(2);
check('Ká»² 2 TUáº¦N: pool cÃ³ Cáº¢ vÃ¡n thÃ´ (20+30=50) + thÃ nh pháº©m (50) â€” tuáº§n 40 váº«n loáº¡i',
  (() => {
    const it = x2.catVanInputPool('2026-10-06');
    const vt = it.find(x => x.group === 'vantho' && x.sizeKey === '1220Ã—2440Ã—9');
    const fp = it.find(x => x.group === 'thanhpham' && x.sizeKey === '1200Ã—382Ã—12');
    return !!vt && vt.total === 50 && !!fp && fp.total === 50;
  })());
check('Ká»² 2 TUáº¦N: thanh tá»“n ghi nhÃ£n "Tuáº§n 41â€“42"',
  document.getElementById('x2-cv-stock-bar').innerHTML.includes('Tuáº§n 41â€“42'));
check('Ká»² 2 TUáº¦N: remembered theo MÃY (localStorage)',
  localStorage.getItem(STORAGE_KEY_X2_CAT_VAN_SPAN) === '2');
check('Ká»² 2 TUáº¦N: 2 optgroup trong Ã´ Äáº§u vÃ o (VÃ¡n thÃ´ + ThÃ nh pháº©m)',
  document.getElementById('x2-cv-source').innerHTML.includes('optgroup label="VÃ¡n thÃ´ (Ã‰p VÃ¡n)"') &&
  document.getElementById('x2-cv-source').innerHTML.includes('optgroup label="ThÃ nh pháº©m (Ã‰p VÃ¡n)"'));
// â”€â”€â”€ E. LÆ¯U LÆ¯á»¢T Cáº®T VÃN (trá»« tá»“n theo ká»³ 2 tuáº§n) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-cv-kind').value = 'cat';
document.getElementById('x2-cv-date').value = '2026-10-06';
x2.renderX2CatVanSource();
document.getElementById('x2-cv-source').value = 'vantho|1220Ã—2440Ã—9';
document.getElementById('x2-cv-qty').value = '12';
await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
const recCat = (state.xuong2CatVanRecords || [])[0];
check('LÆ¯U Cáº®T: ghi 1 lÆ°á»£t kind=cat Â· qtyIn 12 Â· quantity 12 (táº¥m)',
  state.xuong2CatVanRecords.length === 1 && recCat.kind === 'cat' &&
  recCat.qtyIn === 12 && recCat.quantity === 12);
check('LÆ¯U Cáº®T: periodKey = cáº·p 2026-W41-42 + span 2 + kÃ­ch thÆ°á»›c nguá»“n',
  recCat.periodKey === '2026-W41-42' && recCat.span === 2 &&
  recCat.inGroup === 'vantho' && recCat.inSizeKey === '1220Ã—2440Ã—9' &&
  recCat.inDims[0] === 1220);
check('LÆ¯U Cáº®T: Ä‘Ã£ ghi localStorage (key riÃªng cá»§a Cáº¯t VÃ¡n)',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_CAT_VAN) || '[]').length === 1);
check('LÆ¯U Cáº®T: Tá»’N Cá»˜T NGAY â€” vÃ¡n thÃ´ cÃ²n 38 / 50 táº¥m',
  document.getElementById('x2-cv-source').innerHTML.includes('1220Ã—2440Ã—9 â€” cÃ²n 38 / 50 táº¥m'));
check('LÆ¯U Cáº®T: chip mini card = "1 lÆ°á»£t Â· 12 táº¥m"',
  document.getElementById('x2-mini-count-cat-van').textContent === '1 lÆ°á»£t Â· 12 táº¥m');

// â”€â”€â”€ F. CHáº¶N VÆ¯á»¢T Tá»’N Ká»² â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const before = state.xuong2CatVanRecords.length;
  document.getElementById('x2-cv-source').value = 'vantho|1220Ã—2440Ã—9';
  document.getElementById('x2-cv-qty').value = '40';   // 40 > 38 cÃ²n láº¡i
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('CHáº¶N VÆ¯á»¢T: nháº­p 40 táº¥m (cÃ²n 38) â†’ KHÃ”NG ghi lÆ°á»£t má»›i',
    state.xuong2CatVanRecords.length === before);
  document.getElementById('x2-cv-qty').value = '30';   // 30 â‰¤ 38
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('LÆ¯U TIáº¾P: nháº­p 30 táº¥m â†’ Ä‘Æ°á»£c (cÃ²n 8 táº¥m)',
    state.xuong2CatVanRecords.length === before + 1 &&
    document.getElementById('x2-cv-source').innerHTML.includes('cÃ²n 8 / 50 táº¥m'));
}
// â”€â”€â”€ G. LÆ¯á»¢T Xáºº THANH (thÃªm Ã´ Äáº§u ra + Sá»‘ thanh ra) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-cv-kind').value = 'xe';
x2.syncX2CatVanKindRows();
document.getElementById('x2-cv-source').value = 'vantho|1220Ã—2440Ã—9';
document.getElementById('x2-cv-qty').value = '5';
document.getElementById('x2-cv-out').value = '1200x18x15';
document.getElementById('x2-cv-out-qty').value = '600';
await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
const recXe = (state.xuong2CatVanRecords || []).find(r => r.kind === 'xe');
check('LÆ¯U Xáºº: ghi lÆ°á»£t kind=xe Â· vÃ¡n vÃ o 5 táº¥m Â· THANH RA 600',
  !!recXe && recXe.qtyIn === 5 && recXe.quantity === 600);
check('LÆ¯U Xáºº: kÃ­ch thÆ°á»›c Ä‘áº§u ra chuáº©n hoÃ¡ 1200Ã—18Ã—15 + unitVol 0,000324 mÂ³',
  !!recXe && recXe.outSizeKey === '1200Ã—18Ã—15' && Math.abs(recXe.unitVol - 0.000324) < 1e-9);
check('LÆ¯U Xáºº: Tá»’N TRá»ª â€” vÃ¡n thÃ´ cÃ²n 3 / 50 táº¥m',
  document.getElementById('x2-cv-source').innerHTML.includes('cÃ²n 3 / 50 táº¥m'));
{
  const before = state.xuong2CatVanRecords.length;
  document.getElementById('x2-cv-qty').value = '1';
  document.getElementById('x2-cv-out').value = '';     // thiáº¿u Äáº§u ra
  document.getElementById('x2-cv-out-qty').value = '100';
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('Xáºº: thiáº¿u KÃCH THÆ¯á»šC Äáº¦U RA â†’ cháº·n (khÃ´ng ghi lÆ°á»£t)',
    state.xuong2CatVanRecords.length === before);
}

// â”€â”€â”€ H. Sá»¬A LÆ¯á»¢T â€” TRáº¢ Láº I PHáº¦N Cá»¦A NÃ“ (excludeId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.editXuong2CatVan(recCat.id);
check('Sá»¬A: náº¡p láº¡i lÆ°á»£t (ká»³ váº«n 2 tuáº§n Â· Ã´ Ä‘áº§u ra trá»‘ng vÃ¬ lÆ°á»£t Cáº®T khÃ´ng cÃ³ Ä‘áº§u ra)',
  state.x2CatVanEditId === recCat.id &&
  document.getElementById('x2-cv-qty').value == 12 &&
  document.getElementById('x2-cv-out').value === '');
{
  // Pool LOáº I lÆ°á»£t Ä‘ang sá»­a â†’ cÃ²n 50 âˆ’ 30 âˆ’ 5 = 15 táº¥m â†’ nháº­p 20 bá»‹ cháº·n
  document.getElementById('x2-cv-qty').value = '20';
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  check('Sá»¬A: nháº­p 20 táº¥m (chá»‰ cÃ²n 15 khi loáº¡i lÆ°á»£t nÃ y) â†’ bá»‹ cháº·n',
    state.x2CatVanEditId === recCat.id && recCat.qtyIn === 12);
  document.getElementById('x2-cv-qty').value = '15';
  await x2.handleXuong2CatVanSubmit({ preventDefault(){} });
  // LÆ°u xong form tá»± xoÃ¡ Ã´ NgÃ y â‡’ tá»“n Ä‘Æ°á»£c tÃ­nh theo tuáº§n HIá»†N Táº I cá»§a mÃ¡y,
  // nÃªn test sáº½ sai khi cháº¡y vÃ o tuáº§n khÃ¡c. Chá»n láº¡i ngÃ y cá»‘ Ä‘á»‹nh rá»“i váº½ láº¡i tá»“n.
  document.getElementById('x2-cv-date').value = '2026-10-06';
  x2.renderX2CatVanSource();
  check('Sá»¬A: 15 táº¥m â†’ cáº­p nháº­t + thoÃ¡t cháº¿ Ä‘á»™ sá»­a (dÃ¹ng háº¿t vÃ¡n thÃ´ ká»³ nÃ y)',
    recCat.qtyIn === 15 && state.x2CatVanEditId === null &&
    document.getElementById('x2-cv-source').innerHTML.includes('1200Ã—382Ã—12 â€” cÃ²n 50 / 50 táº¥m') &&
    !document.getElementById('x2-cv-source').innerHTML.includes('1220Ã—2440Ã—9 â€” cÃ²n'));
}

// â”€â”€â”€ I. Äá»ŠNH Má»¨C 2 ÄÆ N Vá»Š (táº¥m/h Â· thanh/h) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-cv-rate-kind').value = 'cat';
document.getElementById('x2-cv-rate-month').value = '2026-10';
document.getElementById('x2-cv-rate-value').value = '60';
x2.handleX2CatVanRateSave();
document.getElementById('x2-cv-rate-kind').value = 'xe';
document.getElementById('x2-cv-rate-month').value = '2026-10';
document.getElementById('x2-cv-rate-value').value = '200';
x2.handleX2CatVanRateSave();
check('Äá»ŠNH Má»¨C: cat = 60 táº¥m/h Â· xe = 200 thanh/h (state + localStorage)',
  state.x2CatVanRates.cat['2026-10'] === 60 && state.x2CatVanRates.xe['2026-10'] === 200 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_CAT_VAN_RATE)).cat['2026-10'] === 60 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_CAT_VAN_RATE)).xe['2026-10'] === 200);
check('Äá»ŠNH Má»¨C: catVanRateOf Ä‘á»c Ä‘Ãºng tá»«ng cÃ´ng Ä‘oáº¡n + Ä‘Æ¡n vá»‹',
  x2.catVanRateOf('2026-10-06', 'cat') === 60 && x2.catVanRateOf('2026-10-06', 'xe') === 200);
// â”€â”€â”€ J. THáºº NGÃ€Y CHIA 2 VÃ™NG + CÃ”NG SUáº¤T 2 ÄÆ N Vá»Š â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-cv-date').value = '2026-10-06';
x2.renderX2CatVanCard();
const dayHtml = document.getElementById('x2-cv-day-cards').innerHTML;
check('THáºº NGÃ€Y: cÃ³ VÃ™NG "Cáº¯t vÃ¡n" + VÃ™NG "Xáº» thanh" (2 báº£ng riÃªng)',
  dayHtml.includes('Cáº¯t vÃ¡n â€” Ä‘áº§u vÃ o tá»« Ã‰p VÃ¡n') && dayHtml.includes('Xáº» thanh â€” vÃ¡n Ã‰p VÃ¡n â†’ kÃ­ch thÆ°á»›c thanh'));
check('THáºº NGÃ€Y: Ä‘áº§u tháº» cÃ³ CS Cáº¯t (táº¥m/h) + CS Xáº» (thanh/h) + chip ká»³',
  dayHtml.includes('CS Cáº¯t:') && dayHtml.includes('táº¥m/h') &&
  dayHtml.includes('CS Xáº»:') && dayHtml.includes('thanh/h') &&
  dayHtml.includes('Tuáº§n 41â€“42'));
check('THáºº NGÃ€Y: ngÆ°á»i Cáº®T / ngÆ°á»i Xáºº tá»« Báº£ng bá»‘ trÃ­ + Ã´ giá» sá»± cá»‘ catvan',
  dayHtml.includes('Pháº¡m VÄƒn Cáº¯t') && dayHtml.includes('Äá»— Thá»‹ Xáº»') &&
  dayHtml.includes('data-x2-incident'));
check('THáºº NGÃ€Y: dÃ²ng Tá»”NG 2 vÃ¹ng (táº¥m cáº¯t Â· vÃ¡n vÃ o/thanh ra)',
  dayHtml.includes('táº¥m vÃ¡n Ä‘Ã£ cáº¯t') && dayHtml.includes('xáº» ra'));
check('THáºº NGÃ€Y: nÃºt Sá»­a/XÃ³a uá»· nhiá»‡m data-x2-cv-edit / data-x2-cv-delete',
  dayHtml.includes('data-x2-cv-edit=') && dayHtml.includes('data-x2-cv-delete='));

// â”€â”€â”€ K. Báº¢NG Tá»”NG Há»¢P CÃ”NG SUáº¤T â€” 2 DÃ’NG RIÃŠNG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cap = await import('../js/capacity.js');
const capSrc = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
check('CAPACITY: Cáº¯t VÃ¡n vÃ  Xáº» thanh khÃ´ng cÃ²n dÃ²ng cÃ´ng suáº¥t Dashboard',
  !cap.CAP_STAGES.some(s => s.id === 'catvan_cat' || s.id === 'catvan_xe'));
// â”€â”€â”€ L. Cáº¤U TRÃšC Ná»I Äá»¦ (index Â· styles Â· events Â· 6 chá»— dá»¯ liá»‡u) â”€â”€â”€â”€â”€
const rd = (f) => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const jsStorage = rd('storage.js'), jsCloud = rd('cloud.js'), jsHistory = rd('history.js');
const jsMain = rd('main.js'), jsEvents = rd('events.js'), jsExport = rd('export-xlsx.js');

check('Cáº¤U TRÃšC (index.html): tháº» Ä‘á»§ 3 vÃ¹ng â€” tá»“n Â· form (Ká»³ 1/2 tuáº§n + nÃºt ThÃªm) Â· thá»‘ng kÃª Â· lá»‹ch sá»­',
  ['id="x2-cv-stock-bar"', 'id="x2-cv-form"', 'id="x2-cv-kind"', 'id="x2-cv-source"',
   'id="x2-cv-qty"', 'id="x2-cv-out"', 'id="x2-cv-out-qty"', 'id="x2-cv-span-btns"',
   'id="x2-cv-period-label"', 'id="btn-x2-cv-add"', 'id="x2-cv-calc"', 'id="x2-cv-stats"',
   'id="x2-cv-day-cards"', 'id="btn-toggle-x2cv-table"', 'id="btn-x2-cv-rate"']
    .every(s => idxHtml.includes(s)) &&
  idxHtml.includes('data-x2-cv-span="1"') && idxHtml.includes('data-x2-cv-span="2"'));
check('Cáº¤U TRÃšC (index.html): popup Ä‘á»‹nh má»©c + launcher mÃ´ táº£ 2 cÃ´ng Ä‘oáº¡n',
  idxHtml.includes('id="modal-x2-cv-rate"') && idxHtml.includes('id="btn-x2-cv-rate-save"') &&
  idxHtml.includes('Cáº¯t vÃ¡n + Xáº» thanh'));
check('Cáº¤U TRÃšC (styles.css): khá»‘i nÃºt ká»³ 1/2 tuáº§n + chip ká»³ trÃªn tháº» ngÃ y',
  stylesCss.includes('.x2-cv-span-btns') && stylesCss.includes('.x2-cv-span-btn.active') &&
  stylesCss.includes('.x2-day-period'));
check('Cáº¤U TRÃšC (events.js): ná»‘i form + ká»³ + input + Ä‘á»‹nh má»©c + sá»­a/xÃ³a uá»· nhiá»‡m',
  jsEvents.includes("safeOn('x2-cv-form', 'submit', handleXuong2CatVanSubmit)") &&
  jsEvents.includes("safeOn('x2-cv-span-btns'") &&
  jsEvents.includes("safeOn('x2-cv-date', 'change'") &&
  jsEvents.includes("safeOn('btn-x2-cv-rate-save', 'click', handleX2CatVanRateSave)") &&
  jsEvents.includes("closest('[data-x2-cv-edit]')") &&
  jsEvents.includes("closest('[data-x2-cv-delete]')"));
check('Ná»I (state): 3 key + trÆ°á»ng state',
  fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8')
    .includes('bamboo_tracker_xuong2_cat_van_v1'));
check('Ná»I (storage): restore + 3 Ä‘Æ°á»ng náº¡p file/backup + 2 snapshot + export',
  jsStorage.includes('restoreXuong2CatVan') && jsStorage.includes('restoreX2CatVanRates') &&
  jsStorage.includes('xuong2CatVanRecords: state.xuong2CatVanRecords') &&
  jsStorage.includes('x2CatVanRates: state.x2CatVanRates'));
check('Ná»I (cloud): snapshot Â· cloudCore Â· merge Â· persist Â· apply Â· RATE_DOMAINS',
  jsCloud.includes('xuong2CatVanRecords: state.xuong2CatVanRecords') &&
  jsCloud.includes('xuong2CatVanRecords: obj.xuong2CatVanRecords') &&
  jsCloud.includes("clean('xuong2CatVanRecords'") &&
  jsCloud.includes('STORAGE_KEY_X2_CAT_VAN_RATE') &&
  jsCloud.includes("'x2CatVanRates'"));
check('Ná»I (history): 2 vÃ¹ng dá»¯ liá»‡u tab kanban',
  jsHistory.includes('xuong2CatVanRecords') && jsHistory.includes('x2CatVanRates'));
check('Ná»I (main): load 3 khoÃ¡ lÃºc boot',
  jsMain.includes('loadXuong2CatVan()') && jsMain.includes('loadX2CatVanRates()') &&
  jsMain.includes('loadX2CatVanSpan()'));
check('Ná»I (export-xlsx): nguá»“n xuáº¥t "catvan" + cá»™t 2 cÃ´ng Ä‘oáº¡n',
  jsExport.includes("id: 'catvan'") && jsExport.includes('source === \'catvan\''));
check('Cáº¤U TRÃšC (sw.js): CACHE_NAME v486 (PWA khÃ´ng dÃ¹ng cache cÅ©)',
  /nha-may-ngoc-son-v486/.test(swJs));

// â”€â”€â”€ M. XOÃ LÆ¯á»¢T (tombstone) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const before = state.xuong2CatVanRecords.length;
  x2.deleteXuong2CatVan(recXe.id);
  check('XÃ“A: giáº£m 1 lÆ°á»£t + cÃ³ tombstone (Ä‘á»“ng bá»™ xÃ³a Ä‘a mÃ¡y)',
    state.xuong2CatVanRecords.length === before - 1 &&
    !!(state.deletedIds && state.deletedIds.xuong2CatVanRecords && state.deletedIds.xuong2CatVanRecords[recXe.id]));
  check('XÃ“A: vÃ¡n thÃ´ cá»§a lÆ°á»£t xáº» ÄÆ¯á»¢C TRáº¢ Láº I ká»³ (cÃ²n 5 táº¥m = 15+30)',
    document.getElementById('x2-cv-source').innerHTML.includes('1220Ã—2440Ã—9 â€” cÃ²n 5 / 50 táº¥m'));
}

console.log('Káº¾T QUáº¢: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);




