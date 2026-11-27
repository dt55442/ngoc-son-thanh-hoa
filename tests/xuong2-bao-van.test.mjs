// tests/xuong2-bao-van.test.mjs â€” Kiá»ƒm thá»­ THáºº "BÃ€O VÃN" (XÆ°á»Ÿng 2) â€” 2 cÃ´ng Ä‘oáº¡n
// nhá» trong 1 tháº»: BÃ€O + CHÃ€ THÃ™NG â€” form CHá»ˆ cÃ³ Äáº¦U VÃ€O + Sá» LÆ¯á»¢NG (nhÆ° tháº» Cáº¯t
// vÃ¡n, KHÃ”NG cÃ³ Ã´ Äáº§u ra). Nguá»“n = vÃ¡n Ã‰p VÃ¡n theo ká»³ 1/2 tuáº§n, Tá»’N TRá»ª THEO Ká»²
// nhÆ°ng Sá»” RIÃŠNG (khÃ´ng trá»« chÃ©o vá»›i tháº» Cáº¯t VÃ¡n). Äá»‹nh má»©c Cáº¢ 2 = táº¥m/h â†’
// Báº£ng Tá»•ng Há»£p CÃ´ng Suáº¥t 2 dÃ²ng riÃªng.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-cat-van.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Dá»¯ liá»‡u máº«u: LÆ¯á»¢T Ã‰P VÃN (nguá»“n Äáº¦U VÃ€O â€” cÃ¹ng ká»³ 41/42 nhÆ° test Cáº¯t VÃ¡n) â”€â”€
const { state, STORAGE_KEY_XUONG2_BAO_VAN, STORAGE_KEY_X2_BAO_VAN_RATE, STORAGE_KEY_X2_BAO_VAN_SPAN } =
  await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.pressRecords = [
  { id: 'p1', date: '2026-10-06', week: 'Tuáº§n 41', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 20 }], sticks: [] },
  { id: 'p2', date: '2026-10-13', week: 'Tuáº§n 42', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 30 }], sticks: [] },
  { id: 'p3', date: '2026-10-13', week: 'Tuáº§n 42', year: 2026, finishedQty: 50,
    productName: 'VÃ¡n 1200x382x12', fpDim: '1200Ã—382Ã—12', vanTho: [], sticks: [] },
  { id: 'p4', date: '2026-09-30', week: 'Tuáº§n 40', year: 2026, finishedQty: 0, productName: '', fpDim: '',
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 999 }], sticks: [] }
];
state.xuong2BaoVanRecords = [];
state.x2BaoVanRates = { bao: {}, cha: {} };
state.x2BaoVanEditId = null;
state.x2BaoVanSpan = 1;
// THáºº Cáº®T VÃN Ä‘Ã£ cÃ³ lÆ°á»£t (sá»• RIÃŠNG â€” BÃ o VÃ¡n KHÃ”NG Ä‘Æ°á»£c trá»« pháº§n nÃ y)
state.xuong2CatVanRecords = [
  { id: 'cvseed', kind: 'cat', date: '2026-10-06', span: 2, periodKey: '2026-W41-42',
    inGroup: 'vantho', inSizeKey: '1220Ã—2440Ã—9', inDims: [1220, 2440, 9],
    qtyIn: 7, quantity: 7, createdAt: '2026-10-06T01:00:00.000Z' }
];
state.x2CatVanEditId = null;
state.x2CatVanSpan = 2;

// â”€â”€â”€ NhÃ¢n Sá»±: phÃ¢n vá»‹ "BÃ o VÃ¡n" + "ChÃ  ThÃ¹ng" (XÆ°á»Ÿng 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.hrEmployees = [
  { id: 'empBao', name: 'HoÃ ng VÄƒn BÃ o', quitDate: '' },
  { id: 'empCha', name: 'VÅ© Thá»‹ ChÃ ', quitDate: '' },
  { id: 'empOther', name: 'LÃª VÄƒn KhÃ¡c', quitDate: '' }
];
state.hrPositions = [
  { id: 'pbv', name: 'BÃ o VÃ¡n', department: 'XÆ°á»Ÿng 2' },
  { id: 'pct', name: 'ChÃ  ThÃ¹ng', department: 'XÆ°á»Ÿng 2' },
  { id: 'pkhac', name: 'BÃ o Tinh', department: 'XÆ°á»Ÿng 2' }
];
state.hrAssignments = [
  { id: 'a-bao', date: '2026-10-06', department: 'XÆ°á»Ÿng 2', positionId: 'pbv', employeeId: 'empBao', start: '07:00', end: '12:00' },
  { id: 'a-cha', date: '2026-10-06', department: 'XÆ°á»Ÿng 2', positionId: 'pct', employeeId: 'empCha', start: '13:00', end: '17:30' },
  { id: 'a-khac', date: '2026-10-06', department: 'XÆ°á»Ÿng 2', positionId: 'pkhac', employeeId: 'empOther', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');

// â”€â”€â”€ A. THáºº LAUNCHER + Má»ž POP-UP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.renderXuong2Cards();
check('THáºº: mini card BÃ o VÃ¡n chÆ°a cÃ³ lÆ°á»£t â†’ "ChÆ°a ghi"',
  document.getElementById('x2-mini-count-bao-van').textContent === 'ChÆ°a ghi');
check('THáºº: KHÃ”NG cÃ²n cá» "soon" (Ä‘Ã£ báº­t chá»©c nÄƒng)',
  !x2.X2_CARD_DEFS['x2-bao-van-card'].soon);
check('THáºº: má»Ÿ tháº» BÃ o VÃ¡n tráº£ vá» true (render khÃ´ng nÃ©m lá»—i)',
  x2.x2OpenCard('x2-bao-van-card') === true);
check('THáºº: pop-up báº­t + tháº» hiá»‡n (khÃ´ng cÃ²n x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bao-van-card').classList.contains('x2-card-hidden'));
check('THáºº: vÃ¹ng dá»¯ liá»‡u Lá»‹ch sá»­ + nguá»“n Xuáº¥t Excel cá»§a tháº» BÃ o VÃ¡n',
  state.x2OpenCardId === 'x2-bao-van-card' &&
  x2.x2OpenCardHistoryDomain() === 'xuong2BaoVanRecords' &&
  x2.x2OpenCardExportSource() === 'baovan');

// â”€â”€â”€ B. Ká»² Tá»’N 1/2 TUáº¦N (dÃ¹ng chung quy táº¯c cáº·p tuáº§n) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-bv-date').value = '2026-10-06';
x2.renderX2BaoVanCard();
check('Ká»² (1 tuáº§n): pool chá»‰ vÃ¡n thÃ´ tuáº§n 41 â€” 20 táº¥m (tuáº§n 40 + 42 KHÃ”NG lá»t)',
  (() => { const it = x2.baoVanInputPool('2026-10-06'); return it.length === 1 && it[0].total === 20 && it[0].group === 'vantho'; })());
check('Ká»² (1 tuáº§n): thanh tá»“n ghi "VÃ¡n thÃ´: 20 táº¥m" + ká»³ "Tuáº§n 41"',
  document.getElementById('x2-bv-stock-bar').innerHTML.includes('VÃ¡n thÃ´: <strong>20 táº¥m</strong>') &&
  document.getElementById('x2-bv-stock-bar').innerHTML.includes('Tuáº§n 41'));

// â”€â”€â”€ C. Sá»” RIÃŠNG: lÆ°á»£t Cáº®T VÃN KHÃ”NG trá»« sang BÃ o VÃ¡n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('Sá»” RIÃŠNG: Cáº¯t VÃ¡n Ä‘Ã£ dÃ¹ng 7 táº¥m (tá»“n cat = 43/50 ká»³ 2 tuáº§n) â€” BÃ o VÃ¡n ká»³ 1 tuáº§n VáºªN 20/20',
  x2.catVanInputPool('2026-10-06').find(x => x.key === 'vantho|1220Ã—2440Ã—9').remaining === 43 &&
  x2.baoVanInputPool('2026-10-06').find(x => x.key === 'vantho|1220Ã—2440Ã—9').remaining === 20);

// â”€â”€â”€ D. Äá»”I SANG 2 TUáº¦N (Cáº¶P 41â€“42) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.setX2BaoVanSpan(2);
check('Ká»² 2 TUáº¦N: pool cÃ³ vÃ¡n thÃ´ 50 + thÃ nh pháº©m 50 â€” tuáº§n 40 váº«n loáº¡i',
  (() => {
    const it = x2.baoVanInputPool('2026-10-06');
    const vt = it.find(x => x.group === 'vantho' && x.sizeKey === '1220Ã—2440Ã—9');
    const fp = it.find(x => x.group === 'thanhpham' && x.sizeKey === '1200Ã—382Ã—12');
    return !!vt && vt.total === 50 && !!fp && fp.total === 50;
  })());
check('Sá»” RIÃŠNG (cÃ¹ng ká»³ 2 tuáº§n): BÃ o VÃ¡n váº«n 50/50 â€” KHÃ”NG trá»« 7 táº¥m cá»§a Cáº¯t VÃ¡n',
  x2.baoVanInputPool('2026-10-06').find(x => x.key === 'vantho|1220Ã—2440Ã—9').remaining === 50);
check('Ká»² 2 TUáº¦N: nhÃ£n ká»³ "Tuáº§n 41â€“42" + remembered theo MÃY',
  document.getElementById('x2-bv-stock-bar').innerHTML.includes('Tuáº§n 41â€“42') &&
  localStorage.getItem(STORAGE_KEY_X2_BAO_VAN_SPAN) === '2');
check('CÃ”NG ÄOáº N: 2 lá»±a chá»n BÃ o / ChÃ  thÃ¹ng + form CHá»ˆ cÃ³ Äáº§u vÃ o + Sá»‘ lÆ°á»£ng (KHÃ”NG Ã´ Äáº§u ra)',
  (() => {
    const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const form = h.slice(h.indexOf('id="x2-bv-form"'), h.indexOf('</form>', h.indexOf('id="x2-bv-form"')));
    return h.includes('<option value="bao">BÃ o') && h.includes('<option value="cha">ChÃ  thÃ¹ng') &&
      !form.includes('x2-bv-out') && form.includes('id="x2-bv-qty"');
  })());
// â”€â”€â”€ E. LÆ¯U LÆ¯á»¢T BÃ€O (trá»« tá»“n theo ká»³ 2 tuáº§n â€” sá»• RIÃŠNG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-bv-kind').value = 'bao';
document.getElementById('x2-bv-date').value = '2026-10-06';
x2.renderX2BaoVanSource();
document.getElementById('x2-bv-source').value = 'vantho|1220Ã—2440Ã—9';
document.getElementById('x2-bv-qty').value = '12';
await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
const recBao = (state.xuong2BaoVanRecords || [])[0];
check('LÆ¯U BÃ€O: ghi 1 lÆ°á»£t kind=bao Â· qtyIn 12 Â· quantity 12 (táº¥m â€” khÃ´ng cÃ³ Ä‘áº§u ra)',
  state.xuong2BaoVanRecords.length === 1 && recBao.kind === 'bao' &&
  recBao.qtyIn === 12 && recBao.quantity === 12 && !recBao.outSizeKey);
check('LÆ¯U BÃ€O: periodKey cáº·p 2026-W41-42 + span 2 + Ä‘Ã£ ghi localStorage key riÃªng',
  recBao.periodKey === '2026-W41-42' && recBao.span === 2 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BAO_VAN) || '[]').length === 1);
check('LÆ¯U BÃ€O: Tá»’N Cá»˜T NGAY â€” vÃ¡n thÃ´ cÃ²n 38 / 50 táº¥m (sá»• RIÃŠNG)',
  document.getElementById('x2-bv-source').innerHTML.includes('1220Ã—2440Ã—9 â€” cÃ²n 38 / 50 táº¥m'));
check('LÆ¯U BÃ€O: chip mini card = "1 lÆ°á»£t Â· 12 táº¥m"',
  document.getElementById('x2-mini-count-bao-van').textContent === '1 lÆ°á»£t Â· 12 táº¥m');
{
  const before = state.xuong2BaoVanRecords.length;
  document.getElementById('x2-bv-qty').value = '40';   // 40 > 38 cÃ²n láº¡i
  await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
  check('CHáº¶N VÆ¯á»¢T: nháº­p 40 táº¥m (cÃ²n 38) â†’ KHÃ”NG ghi lÆ°á»£t má»›i',
    state.xuong2BaoVanRecords.length === before);
}

// â”€â”€â”€ F. LÆ¯á»¢T CHÃ€ THÃ™NG (cÃ¹ng form Äáº§u vÃ o + Sá»‘ lÆ°á»£ng) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-bv-kind').value = 'cha';
document.getElementById('x2-bv-source').value = 'vantho|1220Ã—2440Ã—9';
document.getElementById('x2-bv-qty').value = '10';
await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
const recCha = (state.xuong2BaoVanRecords || []).find(r => r.kind === 'cha');
check('LÆ¯U CHÃ€: ghi lÆ°á»£t kind=cha Â· qtyIn 10 Â· quantity 10 (táº¥m)',
  !!recCha && recCha.qtyIn === 10 && recCha.quantity === 10);
check('LÆ¯U CHÃ€: Tá»’N TRá»ª â€” vÃ¡n thÃ´ cÃ²n 28 / 50 táº¥m Â· thanh thÃ nh pháº©m khÃ´ng bá»‹ Ä‘á»¥ng (50/50)',
  document.getElementById('x2-bv-source').innerHTML.includes('1220Ã—2440Ã—9 â€” cÃ²n 28 / 50 táº¥m') &&
  document.getElementById('x2-bv-source').innerHTML.includes('1200Ã—382Ã—12 â€” cÃ²n 50 / 50 táº¥m'));

// â”€â”€â”€ G. Sá»¬A LÆ¯á»¢T â€” TRáº¢ Láº I PHáº¦N Cá»¦A NÃ“ (excludeId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.editXuong2BaoVan(recBao.id);
check('Sá»¬A: náº¡p láº¡i lÆ°á»£t (ká»³ váº«n 2 tuáº§n Â· sá»‘ lÆ°á»£ng 12)',
  state.x2BaoVanEditId === recBao.id && document.getElementById('x2-bv-qty').value == 12);
{
  // Pool LOáº I lÆ°á»£t Ä‘ang sá»­a â†’ cÃ²n 50 âˆ’ 10 = 40 â†’ nháº­p 45 bá»‹ cháº·n
  document.getElementById('x2-bv-qty').value = '45';
  await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
  check('Sá»¬A: nháº­p 45 táº¥m (chá»‰ cÃ²n 40 khi loáº¡i lÆ°á»£t nÃ y) â†’ bá»‹ cháº·n',
    state.x2BaoVanEditId === recBao.id && recBao.qtyIn === 12);
  document.getElementById('x2-bv-qty').value = '40';
  await x2.handleXuong2BaoVanSubmit({ preventDefault(){} });
  // LÆ°u xong form tá»± xoÃ¡ Ã´ NgÃ y â‡’ tá»“n tÃ­nh theo tuáº§n HIá»†N Táº I cá»§a mÃ¡y nÃªn test
  // sáº½ sai khi cháº¡y vÃ o tuáº§n khÃ¡c. Chá»n láº¡i ngÃ y cá»‘ Ä‘á»‹nh rá»“i váº½ láº¡i tá»“n.
  document.getElementById('x2-bv-date').value = '2026-10-06';
  x2.renderX2BaoVanSource();
  check('Sá»¬A: 40 táº¥m â†’ cáº­p nháº­t + thoÃ¡t cháº¿ Ä‘á»™ sá»­a (vÃ¡n thÃ´ = 40 + 10 chÃ  = 50)',
    recBao.qtyIn === 40 && state.x2BaoVanEditId === null &&
    document.getElementById('x2-bv-source').innerHTML.includes('1200Ã—382Ã—12 â€” cÃ²n 50 / 50 táº¥m') &&
    !document.getElementById('x2-bv-source').innerHTML.includes('1220Ã—2440Ã—9 â€” cÃ²n'));
}

// â”€â”€â”€ H. Äá»ŠNH Má»¨C â€” Cáº¢ 2 = táº¥m/h â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-bv-rate-kind').value = 'bao';
document.getElementById('x2-bv-rate-month').value = '2026-10';
document.getElementById('x2-bv-rate-value').value = '120';
x2.handleX2BaoVanRateSave();
document.getElementById('x2-bv-rate-kind').value = 'cha';
document.getElementById('x2-bv-rate-month').value = '2026-10';
document.getElementById('x2-bv-rate-value').value = '200';
x2.handleX2BaoVanRateSave();
check('Äá»ŠNH Má»¨C: bao = 120 táº¥m/h Â· cha = 200 táº¥m/h (state + localStorage)',
  state.x2BaoVanRates.bao['2026-10'] === 120 && state.x2BaoVanRates.cha['2026-10'] === 200 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_VAN_RATE)).bao['2026-10'] === 120 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_VAN_RATE)).cha['2026-10'] === 200);
check('Äá»ŠNH Má»¨C: baoVanRateOf Ä‘á»c Ä‘Ãºng tá»«ng cÃ´ng Ä‘oáº¡n',
  x2.baoVanRateOf('2026-10-06', 'bao') === 120 && x2.baoVanRateOf('2026-10-06', 'cha') === 200);
// â”€â”€â”€ I. THáºº NGÃ€Y CHIA 2 VÃ™NG + CÃ”NG SUáº¤T 2 DÃ’NG táº¥m/h â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-bv-date').value = '2026-10-06';
x2.renderX2BaoVanCard();
const dayHtml = document.getElementById('x2-bv-day-cards').innerHTML;
check('THáºº NGÃ€Y: cÃ³ VÃ™NG "BÃ o" + VÃ™NG "ChÃ  thÃ¹ng" (2 báº£ng riÃªng, cÃ¹ng cá»™t Äáº§u vÃ o/SL)',
  dayHtml.includes('BÃ o â€” Ä‘áº§u vÃ o tá»« Ã‰p VÃ¡n') && dayHtml.includes('ChÃ  thÃ¹ng â€” Ä‘áº§u vÃ o tá»« Ã‰p VÃ¡n'));
check('THáºº NGÃ€Y: Ä‘áº§u tháº» CS BÃ o + CS ChÃ  (Ä‘á»u táº¥m/h) + chip ká»³ + Ã´ sá»± cá»‘ baovan',
  dayHtml.includes('CS BÃ o:') && dayHtml.includes('CS ChÃ :') &&
  (dayHtml.match(/táº¥m\/h/g) || []).length >= 4 &&
  dayHtml.includes('Tuáº§n 41â€“42') && dayHtml.includes('data-x2-incident'));
check('THáºº NGÃ€Y: ngÆ°á»i BÃ o / ngÆ°á»i ChÃ  tá»« Báº£ng bá»‘ trÃ­ + dÃ²ng Tá»”NG 2 vÃ¹ng',
  dayHtml.includes('HoÃ ng VÄƒn BÃ o') && dayHtml.includes('VÅ© Thá»‹ ChÃ ') &&
  dayHtml.includes('táº¥m Ä‘Ã£ bÃ o') && dayHtml.includes('táº¥m Ä‘Ã£ chÃ  thÃ¹ng'));
check('THáºº NGÃ€Y: nÃºt Sá»­a/XÃ³a uá»· nhiá»‡m data-x2-bv-edit / data-x2-bv-delete',
  dayHtml.includes('data-x2-bv-edit=') && dayHtml.includes('data-x2-bv-delete='));

const cap = await import('../js/capacity.js');
const capSrc = fs.readFileSync(new URL('../js/capacity.js', import.meta.url), 'utf8');
check('CAPACITY: BÃ o vÃ  ChÃ  thÃ¹ng khÃ´ng cÃ²n dÃ²ng cÃ´ng suáº¥t Dashboard',
  !cap.CAP_STAGES.some(s => s.id === 'baovan_bao' || s.id === 'baovan_cha'));

// â”€â”€â”€ J. Cáº¤U TRÃšC Ná»I Äá»§ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const rd = (f) => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const jsStorage = rd('storage.js'), jsCloud = rd('cloud.js'), jsHistory = rd('history.js');
const jsMain = rd('main.js'), jsEvents = rd('events.js'), jsExport = rd('export-xlsx.js');

check('Cáº¤U TRÃšC (index.html): tháº» Ä‘á»§ â€” tá»“n Â· form (Ká»³ 1/2 + nÃºt ThÃªm) Â· thá»‘ng kÃª Â· lá»‹ch sá»­ Â· popup ÄM',
  ['id="x2-bv-stock-bar"', 'id="x2-bv-form"', 'id="x2-bv-kind"', 'id="x2-bv-source"',
   'id="x2-bv-qty"', 'id="x2-bv-span-btns"', 'id="x2-bv-period-label"', 'id="btn-x2-bv-add"',
   'id="x2-bv-calc"', 'id="x2-bv-stats"', 'id="x2-bv-day-cards"', 'id="btn-toggle-x2bv-table"',
   'id="btn-x2-bv-rate"', 'id="modal-x2-bv-rate"', 'id="btn-x2-bv-rate-save"']
    .every(s => idxHtml.includes(s)) &&
  idxHtml.includes('data-x2-bv-span="1"') && idxHtml.includes('data-x2-bv-span="2"') &&
  idxHtml.includes('BÃ o + ChÃ  thÃ¹ng'));
check('Cáº¤U TRÃšC (events.js): ná»‘i form + ká»³ + input + Ä‘á»‹nh má»©c + sá»­a/xÃ³a uá»· nhiá»‡m',
  jsEvents.includes("safeOn('x2-bv-form', 'submit', handleXuong2BaoVanSubmit)") &&
  jsEvents.includes("safeOn('x2-bv-span-btns'") &&
  jsEvents.includes("safeOn('x2-bv-date', 'change'") &&
  jsEvents.includes("safeOn('btn-x2-bv-rate-save', 'click', handleX2BaoVanRateSave)") &&
  jsEvents.includes("closest('[data-x2-bv-edit]')") &&
  jsEvents.includes("closest('[data-x2-bv-delete]')"));
check('Ná»I (state): 3 key + trÆ°á»ng state',
  fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8')
    .includes('bamboo_tracker_xuong2_bao_van_v1'));
check('Ná»I (storage): restore + 3 Ä‘Æ°á»ng náº¡p + 2 snapshot + export',
  jsStorage.includes('restoreXuong2BaoVan') && jsStorage.includes('restoreX2BaoVanRates') &&
  jsStorage.includes('xuong2BaoVanRecords: state.xuong2BaoVanRecords') &&
  jsStorage.includes('x2BaoVanRates: state.x2BaoVanRates'));
check('Ná»I (cloud): snapshot Â· cloudCore Â· merge Â· persist Â· apply Â· RATE_DOMAINS',
  jsCloud.includes('xuong2BaoVanRecords: state.xuong2BaoVanRecords') &&
  jsCloud.includes('xuong2BaoVanRecords: obj.xuong2BaoVanRecords') &&
  jsCloud.includes("clean('xuong2BaoVanRecords'") &&
  jsCloud.includes('STORAGE_KEY_X2_BAO_VAN_RATE') &&
  jsCloud.includes("'x2BaoVanRates'"));
check('Ná»I (history): 2 vÃ¹ng dá»¯ liá»‡u tab kanban',
  jsHistory.includes('xuong2BaoVanRecords') && jsHistory.includes('x2BaoVanRates'));
check('Ná»I (main): load 3 khoÃ¡ lÃºc boot',
  jsMain.includes('loadXuong2BaoVan()') && jsMain.includes('loadX2BaoVanRates()') &&
  jsMain.includes('loadX2BaoVanSpan()'));
check('Ná»I (export-xlsx): nguá»“n xuáº¥t "baovan" + cá»™t 2 cÃ´ng Ä‘oáº¡n',
  jsExport.includes("id: 'baovan'") && jsExport.includes("source === 'baovan'"));
check('Cáº¤U TRÃšC (styles + sw): dÃ¹ng láº¡i khá»‘i nÃºt ká»³ + CACHE_NAME v486',
  stylesCss.includes('.x2-cv-span-btn.active') && /nha-may-ngoc-son-v486/.test(swJs));

// â”€â”€â”€ K. XOÃ LÆ¯á»¢T (tombstone) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
{
  const before = state.xuong2BaoVanRecords.length;
  x2.deleteXuong2BaoVan(recCha.id);
  check('XÃ“A: giáº£m 1 lÆ°á»£t + cÃ³ tombstone (Ä‘á»“ng bá»™ xÃ³a Ä‘a mÃ¡y)',
    state.xuong2BaoVanRecords.length === before - 1 &&
    !!(state.deletedIds && state.deletedIds.xuong2BaoVanRecords && state.deletedIds.xuong2BaoVanRecords[recCha.id]));
  check('XÃ“A: vÃ¡n thÃ´ cá»§a lÆ°á»£t chÃ  ÄÆ¯á»¢C TRáº¢ Láº I ká»³ (40 + 10 â†’ cÃ²n 10 táº¥m)',
    document.getElementById('x2-bv-source').innerHTML.includes('1220Ã—2440Ã—9 â€” cÃ²n 10 / 50 táº¥m'));
}

console.log('Káº¾T QUáº¢: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);

