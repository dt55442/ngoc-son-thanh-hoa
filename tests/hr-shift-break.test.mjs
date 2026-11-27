// tests/hr-shift-break.test.mjs â€” GIá»œ NGHá»ˆ Cá»¦A CA (cháº¿ Ä‘á»™ "LÃ m ca") + Lá»–I GIá»œ ÄÃƒ Sá»¬A
// Quy táº¯c chá»‘t vá»›i ngÆ°á»i dÃ¹ng 16/10/2026 (phÆ°Æ¡ng Ã¡n B â€” xem .clinerules quy táº¯c 58/59):
//  â€¢ CÃ i Äáº·t Ca cÃ³ Ã´ "Nghá»‰ (giá»)" cho Tá»ªNG CA (chá»‰ cháº¿ Ä‘á»™ LÃ m ca).
//  â€¢ Giá» nghá»‰ bá»‹ TRá»ª VÃ€O CUá»I CA: giá» lÃ m hiá»‡u dá»¥ng = [vÃ o â†’ ra âˆ’ nghá»‰].
//  â€¢ Pháº§n nghá»‰ KHÃ”NG tÃ­nh vÃ o HC láº«n TC (giá»‘ng nghá»‰ trÆ°a hÃ nh chÃ­nh).
//  â€¢ GIá»œ RA TRá»NG = lÃ m Ä‘áº¿n Háº¾T CA (bá» háº³n hack "+ 480" tá»«ng khiáº¿n ca Ä‘Ãªm = 8h).
//  â€¢ HÃ€NH CHÃNH giá»¯ nguyÃªn 100% (07:00â€“17:30 â†’ 9h HC; lÃ m Ä‘áº¿n 19:00 â†’ 9h HC + 1h30 TC).
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng hr-board.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}
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
  addEventListener(){}, removeEventListener(){}
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
global.Chart = class { constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; } update(){} resize(){} destroy(){} };
Chart.register = () => {};

const fs = await import('fs');
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS â€” ' + name); } else { fail++; console.log('FAIL â€” ' + name); } }

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.hrWorkCalendar = {};
state.hrShifts = [];
state.hrAssignments = [];
state.hrEmployees = []; state.hrPositions = [];

const H = (dept, s, e, idx, date) => hr.hrSplitHoursHC(dept, s, e, idx, date);
const eq = (r, hc, tc) => r.hc === hc && r.tc === tc;
const CA12 = { id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [
  { name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: 1.5 },
  { name: 'Ca Ä‘Ãªm',  start: '19:00', end: '07:00', brk: 1 }
] };
const CA_CU = { id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [   // cáº¥u hÃ¬nh CÅ¨: chÆ°a khai nghá»‰
  { name: 'Ca ngÃ y', start: '07:00', end: '19:00' },
  { name: 'Ca Ä‘Ãªm',  start: '19:00', end: '07:00' }
] };


// â•â•â• A. HÃ€NH CHÃNH KHÃ”NG Äá»”I (há»“i quy) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
check('A1: HC 07:00 â†’ háº¿t ca = 9h HC (nghá»‰ trÆ°a tá»± loáº¡i)', eq(H('XÆ°á»Ÿng 2', '07:00', '', 0), 540, 0));
check('A2: HC 07:00â€“17:30 = 9h HC', eq(H('XÆ°á»Ÿng 2', '07:00', '17:30', 0), 540, 0));
check('A3: HC 07:00â€“19:00 = 9h HC + 1h30 TC (lÃ m thÃªm)', eq(H('XÆ°á»Ÿng 2', '07:00', '19:00', 0), 540, 90));
check('A4: HC 12:00â€“12:30 (Ä‘Ãºng nghá»‰ trÆ°a) = 0 HC Â· 0 TC', eq(H('XÆ°á»Ÿng 2', '12:00', '12:30', 0), 0, 0));
check('A5: HC 08:00â€“11:30 = 3h30 HC', eq(H('XÆ°á»Ÿng 2', '08:00', '11:30', 0), 210, 0));

// â•â•â• B. LÃ€M CA 12H â€” NGHá»ˆ TRá»ª VÃ€O CUá»I CA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
state.hrShifts = [CA12];
check('B1: Ca ngÃ y 07:00 â†’ háº¿t ca = 10h30 HC (12h âˆ’ 1h30 nghá»‰) Â· 0 TC',
  eq(H('XÆ°á»Ÿng 2', '07:00', '', 0), 630, 0));
check('B2: Ca ngÃ y 07:00â€“19:00 = 10h30 HC Â· 0 TC (KHÃ”NG cÃ²n 12h)', eq(H('XÆ°á»Ÿng 2', '07:00', '19:00', 0), 630, 0));
check('B3: Ca ngÃ y lÃ m thÃªm 07:00â€“20:30 = 10h30 HC + 1h30 TC', eq(H('XÆ°á»Ÿng 2', '07:00', '20:30', 0), 630, 90));
check('B4: Ca ngÃ y vÃ o trá»… 09:00â€“19:00 = 8h30 HC Â· 0 TC', eq(H('XÆ°á»Ÿng 2', '09:00', '19:00', 0), 510, 0));
check('B5: Ca Ä‘Ãªm 19:00 â†’ háº¿t ca = 11h HC (12h âˆ’ 1h nghá»‰) Â· 0 TC â€” KHÃ”NG cÃ²n 8h',
  eq(H('XÆ°á»Ÿng 2', '19:00', '', 1), 660, 0));
check('B6: Ca Ä‘Ãªm 19:00â€“07:00 (váº¯t qua ná»­a Ä‘Ãªm) = 11h HC Â· 0 TC', eq(H('XÆ°á»Ÿng 2', '19:00', '07:00', 1), 660, 0));
check('B7: Ca Ä‘Ãªm lÃ m thÃªm 19:00â€“08:00 = 11h HC + 1h TC', eq(H('XÆ°á»Ÿng 2', '19:00', '08:00', 1), 660, 60));
check('B8: Ca Ä‘Ãªm ra sá»›m 19:00â€“23:00 = 4h HC Â· 0 TC (chÆ°a tá»›i giá» nghá»‰)', eq(H('XÆ°á»Ÿng 2', '19:00', '23:00', 1), 240, 0));
check('B9: ca Ä‘Ãªm ra 01:00 (Ä‘Ã£ láº¹m 30\' vÃ o giá» nghá»‰ giá»¯a ca 00:30â€“01:30) = 5h30 HC Â· 0 TC',
  eq(H('XÆ°á»Ÿng 2', '19:00', '01:00', 1), 330, 0));
check('B9b: ca Ä‘Ãªm ra 00:30 (háº¿t pháº§n lÃ m TRÆ¯á»šC giá» nghá»‰) = 5h30 HC Â· 0 TC',
  eq(H('XÆ°á»Ÿng 2', '19:00', '00:30', 1), 330, 0));

// â•â•â• C. CA 10 GIá»œ â†’ NGHá»ˆ 1H = 9H (Ä‘Ãºng vÃ­ dá»¥ ngÆ°á»i dÃ¹ng) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
state.hrShifts = [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [
  { name: 'Ca ngÃ y', start: '07:00', end: '17:00', brk: 1 },
  { name: 'Ca Ä‘Ãªm',  start: '19:00', end: '05:00', brk: 1 }
] }];
check('C1: Ca 10h 07:00 â†’ háº¿t ca = 9h HC (10h âˆ’ 1h nghá»‰) Â· 0 TC', eq(H('XÆ°á»Ÿng 2', '07:00', '', 0), 540, 0));
check('C2: Ca 10h Ä‘á»ƒ TRá»NG giá» ra (ca Ä‘Ãªm 19:00) = 9h HC Â· 0 TC â€” khÃ´ng cÃ²n Ä‘oÃ¡n 8h',
  eq(H('XÆ°á»Ÿng 2', '19:00', '', 1), 540, 0));

// â•â•â• D. NGHá»ˆ = 0 â†’ KHÃ”NG TRá»ª (ngÆ°á»i dÃ¹ng chá»§ Ä‘á»™ng táº¯t) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
state.hrShifts = [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [
  { name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: 0 }
] }];
check('D1: Ca ngÃ y khai nghá»‰ 0 â†’ lÃ m Ä‘á»§ ca = 12h HC Â· 0 TC', eq(H('XÆ°á»Ÿng 2', '07:00', '19:00', 0), 720, 0));

// â•â•â• E. MIGRATE Cáº¤U HÃŒNH CÅ¨ (chÆ°a cÃ³ Ã´ nghá»‰) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
check('E1: ca 1 chÆ°a khai nghá»‰ â†’ máº·c Ä‘á»‹nh 1h30', hr.hrShiftBrkH(CA_CU, 0) === 1.5);
check('E2: ca 2 chÆ°a khai nghá»‰ â†’ máº·c Ä‘á»‹nh 1h', hr.hrShiftBrkH(CA_CU, 1) === 1);
check('E3: HÃ nh chÃ­nh luÃ´n 0 (nghá»‰ trÆ°a tá»± loáº¡i giá»¯a 2 buá»•i)',
  hr.hrShiftBrkH({ type: 'hanhchinh', shifts: [{ name: 'SÃ¡ng', start: '07:00', end: '11:30' }] }, 0) === 0);
check('E4: nghá»‰ khai báº±ng CHUá»–I "2" váº«n Ä‘á»c Ä‘Ãºng (form tráº£ string)', hr.hrShiftBrkH({ type: 'lamca', shifts: [{ brk: '2' }] }, 0) === 2);
check('E5: nghá»‰ Ä‘á»ƒ TRá»NG "" â†’ rÆ¡i vá» máº·c Ä‘á»‹nh', hr.hrShiftBrkH({ type: 'lamca', shifts: [{ brk: '' }] }, 0) === 1.5);
state.hrShifts = [CA_CU];
check('E6: cáº¥u hÃ¬nh CÅ¨ â†’ Ã¡p máº·c Ä‘á»‹nh (Ca ngÃ y 10h30 Â· Ca Ä‘Ãªm 11h)',
  eq(H('XÆ°á»Ÿng 2', '07:00', '19:00', 0), 630, 0) && eq(H('XÆ°á»Ÿng 2', '19:00', '07:00', 1), 660, 0));

// â•â•â• F. Má»C PHÃšT ÄÃƒ CHUáº¨N HOÃ (hrShiftRange) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
state.hrShifts = [CA12];
const rNgay = hr.hrShiftRange(CA12, 0), rDem = hr.hrShiftRange(CA12, 1);
check('F1: Ca ngÃ y â†’ startMin 420 Â· endMin 1140 Â· brkH 1.5', rNgay.startMin === 420 && rNgay.endMin === 1140 && rNgay.brkH === 1.5);
check('F2: Ca Ä‘Ãªm â†’ endMin Váº®T QUA Ná»¬A ÄÃŠM (1860) Â· brkH 1', rDem.startMin === 1140 && rDem.endMin === 1860 && rDem.brkH === 1);
const rHanh = hr.hrShiftRange(hr.hrShiftCfg('Bá»™ pháº­n chÆ°a cÃ i'), 0);
check('F3: HÃ nh chÃ­nh â†’ 07:00â€“17:30 (420â€“1050) Â· brkH 0', rHanh.startMin === 420 && rHanh.endMin === 1050 && rHanh.brkH === 0 && rHanh.label === 'HÃ nh chÃ­nh');

// â•â•â• G. NGÃ€Y NGHá»ˆ/Lá»„ ÄI LÃ€M â†’ TOÃ€N Bá»˜ GIá»œ SANG TC (giá»¯ nguyÃªn) â•â•â•â•â•â•â•â•â•â•â•
state.hrWorkCalendar = { '2026-10': { restDays: ['2026-10-05'] } };
const rLe = hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-10-05', '07:00', '19:00', 0);
check('G1: ngÃ y lá»… Ä‘i lÃ m (LÃ m ca) â†’ HC 0 Â· TC 10h30', rLe.hc === 0 && rLe.tc === 630);
state.hrWorkCalendar = {};
const rThuong = hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-10-06', '07:00', '19:00', 0);
check('G2: ngÃ y thÆ°á»ng â†’ HC 10h30 Â· TC 0', rThuong.hc === 630 && rThuong.tc === 0);

// â•â•â• H. CÃ€I Äáº¶T CA â€” Ã” "NGHá»ˆ (GIá»œ)" â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
hr.renderShiftRows({ type: 'lamca', shifts: [
  { name: 'Ca ngÃ y', start: '07:00', end: '19:00' },
  { name: 'Ca Ä‘Ãªm',  start: '19:00', end: '07:00' }
] });
const shiftHtml = els.get('shift-rows').innerHTML;
check('H1: cháº¿ Ä‘á»™ LÃ m ca â†’ má»—i ca cÃ³ 1 Ã´ nháº­p nghá»‰ (2 ca = 2 Ã´)',
  (shiftHtml.match(/data-shift-f="brk"/g) || []).length === 2);
check('H2: hÃ ng tiÃªu Ä‘á» ghi "Nghá»‰ (giá»)"', shiftHtml.includes('Nghá»‰ (giá»)') && shiftHtml.includes('shift-row-head'));
check('H3: Ã´ nghá»‰ náº¡p ÄÃšNG máº·c Ä‘á»‹nh (ca 1 = 1.5 Â· ca 2 = 1)',
  shiftHtml.includes('data-shift-f="brk" value="1.5"') && shiftHtml.includes('data-shift-f="brk" value="1"'));
check('H4: chÃº thÃ­ch nÃ³i rÃµ trá»« vÃ o GIá»®A CA + máº·c Ä‘á»‹nh', shiftHtml.includes('GIá»®A CA') && shiftHtml.includes('máº·c Ä‘á»‹nh ca 1 nghá»‰ 1h30'));
hr.renderShiftRows({ type: 'hanhchinh', shifts: [
  { name: 'SÃ¡ng', start: '07:00', end: '11:30' }, { name: 'Chiá»u', start: '13:00', end: '17:30' }
] });
const shiftHcHtml = els.get('shift-rows').innerHTML;
check('H5: HÃ nh chÃ­nh â†’ KHÃ”NG cÃ³ Ã´ nghá»‰, chá»‰ ghi chÃº "nghá»‰ trÆ°a"',
  !shiftHcHtml.includes('data-shift-f="brk"') && shiftHcHtml.includes('shift-row-na'));

// â•â•â• I. Cáº¤U TRÃšC (js / index / styles / sw) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const hrSrc = fs.readFileSync('js/hr.js', 'utf8');
const idxSrc = fs.readFileSync('index.html', 'utf8');
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
check('I1: ÄÃƒ Bá»Ž Háº²N hack "+ 480" (nguyÃªn nhÃ¢n ca Ä‘Ãªm ra 8h)', !hrSrc.includes('+ 480'));
check('I2: hr.js cÃ³ hrShiftBrkH + má»‘c endMin + quy Æ°á»›c ghi rÃµ',
  hrSrc.includes('function hrShiftBrkH') && hrSrc.includes('endMin') && hrSrc.includes('TRá»ª VÃ€O GIá»®A CA'));
check('I3: hrShiftBrkH + hrShiftRange + renderShiftRows Ä‘Ã£ export',
  typeof hr.hrShiftBrkH === 'function' && typeof hr.hrShiftRange === 'function' && typeof hr.renderShiftRows === 'function');
check('I4: index.html modal CÃ i Äáº·t Ca ghi rÃµ "giá» nghá»‰"', idxSrc.includes('Thá»i Gian Ca (tÃªn ca / báº¯t Ä‘áº§u / káº¿t thÃºc / giá» nghá»‰)'));
check('I5: styles.css cÃ³ báº£ng 4 cá»™t ca (.shift-row / -head / -na)',
  cssSrc.includes('.shift-row-head, .shift-row') && cssSrc.includes('.shift-row-na'));
check('I6: sw.js Ä‘Ã£ bump cache v486', /nha-may-ngoc-son-v486/.test(swSrc));

// â•â•â• J. Má»C HIá»†U Lá»°C â€” Ä‘á»•i ca giá»¯a ká»³ KHÃ”NG tÃ­nh láº¡i lá»‹ch sá»­ (11/2026) â•â•â•
const D_MOI = '2026-11-05';
const V1 = { id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [{ name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: 1.5 }, { name: 'Ca Ä‘Ãªm', start: '19:00', end: '07:00', brk: 1 }], effectiveFrom: '2026-10-01', versions: [] };
state.hrShifts = [JSON.parse(JSON.stringify(V1))];
check('J1: khÃ´ng truyá»n date â†’ cáº¥u hÃ¬nh HIá»†N Táº I', hr.hrShiftCfg('XÆ°á»Ÿng 2').shifts[0].end === '19:00');
check('J2: ngÃ y trÆ°á»›c má»‘c â†’ báº£n cÅ© nháº¥t (váº«n 19:00)', hr.hrShiftCfg('XÆ°á»Ÿng 2', '2026-09-20').shifts[0].end === '19:00');
hr.hrShiftApplyVersion('XÆ°á»Ÿng 2', { type: 'lamca', shifts: [{ name: 'Ca ngÃ y', start: '07:00', end: '17:30', brk: 1.5 }, { name: 'Ca Ä‘Ãªm', start: '20:00', end: '06:00', brk: 1 }], effectiveFrom: D_MOI });
check('J3: lÆ°u báº£n má»›i â†’ versions giá»¯ báº£n cÅ© (má»‘c 01/10)', state.hrShifts[0].versions.length === 1 && state.hrShifts[0].versions[0].effectiveFrom === '2026-10-01');
check('J4: báº£n hiá»‡n táº¡i Ä‘á»•i + má»‘c hiá»‡u lá»±c má»›i', state.hrShifts[0].shifts[0].end === '17:30' && state.hrShifts[0].effectiveFrom === D_MOI);
check('J5: ngÃ y 04/11 (trÆ°á»›c má»‘c má»›i) â†’ giá» CÅ¨ (19:00)', hr.hrShiftCfg('XÆ°á»Ÿng 2', '2026-11-04').shifts[0].end === '19:00');
check('J6: ngÃ y 05/11 (tá»« má»‘c má»›i) â†’ giá» Má»šI (17:30)', hr.hrShiftCfg('XÆ°á»Ÿng 2', D_MOI).shifts[0].end === '17:30');
check('J7: HÃ€M TÃNH GIá»œ theo ngÃ y â€” quÃ¡ khá»© 10h30, tá»« má»‘c má»›i 9h',
  eq(H('XÆ°á»Ÿng 2', '07:00', '', 0, '2026-11-04'), 630, 0) && eq(H('XÆ°á»Ÿng 2', '07:00', '', 0, D_MOI), 540, 0));
check('J8: di trÃº dá»¯ liá»‡u CÅ¨ (thiáº¿u effectiveFrom/versions + brk rÃ¡c) â†’ má»‘c tá»« Ä‘áº§u, giá» giá»¯ nguyÃªn', (() => {
  state.hrShifts = [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [{ name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: '05:03' }, { name: 'Ca Ä‘Ãªm', start: '19:00', end: '07:00' }] }];
  const touched = hr.migrateShiftEffectiveDates();
  const cfg = state.hrShifts[0];
  return touched === 1 && cfg.effectiveFrom === '2000-01-01' && Array.isArray(cfg.versions)
    && cfg.shifts[0].brk === undefined && hr.hrShiftBrkH(cfg, 0) === 1.5 && hr.hrShiftBrkH(cfg, 1) === 1
    && eq(H('XÆ°á»Ÿng 2', '07:00', '19:00', 0), 630, 0);
})());
check('J9: di trÃº cháº¡y láº¡i â†’ KHÃ”NG ghi thÃªm (idempotent)', hr.migrateShiftEffectiveDates() === 0);
check('J10: giá»›i háº¡n versions (tá»‘i Ä‘a 20 báº£n)', (() => {
  for (let i = 1; i <= 25; i++) hr.hrShiftApplyVersion('XÆ°á»Ÿng 2', { type: 'lamca', shifts: [{ name: 'C', start: '06:00', end: '16:00', brk: 1 }], effectiveFrom: '2027-01-' + String(i).padStart(2, '0') });
  return state.hrShifts[0].versions.length === 20;
})());

// â•â•â• K. GIá»œ NGHá»ˆ Cá»¤ THá»‚ (brkStartâ€“brkEnd) â€” máº·c Ä‘á»‹nh váº«n GIá»®A CA â•â•â•
const EX = { id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [
  { name: 'Ca ngÃ y', start: '07:00', end: '17:30', brk: 1.5, brkMode: 'exact', brkStart: '11:30', brkEnd: '13:00' },
  { name: 'Ca Ä‘Ãªm', start: '20:00', end: '06:00', brk: 1, brkMode: 'exact', brkStart: '00:30', brkEnd: '01:30' }
], effectiveFrom: '2026-11-01', versions: [] };
state.hrShifts = [EX];
check('K1: cá»­a sá»• nghá»‰ cá»¥ thá»ƒ ca ngÃ y (11:30â€“13:00 â†’ 690â€“780 Â· exact)', (() => {
  const w = hr.hrShiftBrkWin(EX, 0, hr.hrShiftRange(EX, 0));
  return w.gs0 === 690 && w.ge0 === 780 && w.minutes === 90 && w.exact === true;
})());
check('K2: cá»­a sá»• nghá»‰ ca Ä‘Ãªm váº¯t ná»­a Ä‘Ãªm (00:30â€“01:30 â†’ 1470â€“1530)', (() => {
  const w = hr.hrShiftBrkWin(EX, 1, hr.hrShiftRange(EX, 1));
  return w.gs0 === 1470 && w.ge0 === 1530 && w.minutes === 60;
})());
check('K3: ca ngÃ y Ä‘á»§ ca = 9h HC (nghá»‰ Ä‘Ãºng 11:30â€“13:00)', eq(H('XÆ°á»Ÿng 2', '07:00', '', 0), 540, 0));
check('K4: ná»­a ngÃ y 13:00â€“17:30 = 4h30 HC', eq(H('XÆ°á»Ÿng 2', '13:00', '17:30', 0), 270, 0));
check('K5: lÃ m ÄÃšNG lÃºc nghá»‰ 11:30â€“13:00 = 0 giá»', eq(H('XÆ°á»Ÿng 2', '11:30', '13:00', 0), 0, 0));
check('K6: ca Ä‘Ãªm Ä‘á»§ ca = 9h HC (12h âˆ’ 1h)', eq(H('XÆ°á»Ÿng 2', '20:00', '', 1), 540, 0));
check('K7: hrShiftBrkH suy ra tá»« giá» cá»¥ thá»ƒ = 1.5 / 1', hr.hrShiftBrkH(EX, 0) === 1.5 && hr.hrShiftBrkH(EX, 1) === 1);
check('K8: má»‘c nghá»‰ NGOÃ€I khung ca â†’ rÆ¡i vá» GIá»®A CA (khÃ´ng máº¥t nghá»‰)', (() => {
  const bad = { type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '17:30', brk: 1.5, brkStart: '23:00', brkEnd: '23:30' }] };
  const w = hr.hrShiftBrkWin(bad, 0, hr.hrShiftRange(bad, 0));
  return w.exact === false && w.minutes === 30;   // ngoÃ i khung ca â†’ GIá»®A CA, sá»‘ giá» suy tá»« cá»­a sá»• (30')
})());
check('K9: khai thiáº¿u 1 má»‘c / 2 má»‘c trÃ¹ng / khÃ´ng khai â†’ WinFrom null â†’ GIá»®A CA',
  hr.hrShiftBrkWinFrom({ brkStart: '11:30' }) === null && hr.hrShiftBrkWinFrom({ brkStart: '11:30', brkEnd: '11:30' }) === null && hr.hrShiftBrkWinFrom({}) === null);

// â•â•â• L. Cáº¤U TRÃšC MODAL Má»šI (index / events / css / js / history) â•â•â•
const evSrc = fs.readFileSync('js/events.js', 'utf8');
const histSrc = fs.readFileSync('js/history.js', 'utf8');
check('L1: modal cÃ³ Ã´ Ãp dá»¥ng tá»« ngÃ y + lá»‹ch sá»­ + modal-lg',
  idxSrc.includes('id="shift-effective"') && idxSrc.includes('id="shift-history"') && idxSrc.includes('id="shift-effective-note"') && idxSrc.includes('shift-card'));
check('L2: nhÃ£n báº£ng ca giá»¯ nguyÃªn (test cÅ©)', idxSrc.includes('Thá»i Gian Ca (tÃªn ca / báº¯t Ä‘áº§u / káº¿t thÃºc / giá» nghá»‰)'));
check('L3: báº£ng ca cÃ³ cháº¿ Ä‘á»™ nghá»‰ + Ã´ giá» cá»¥ thá»ƒ + xem trÆ°á»›c', (() => {
  hr.renderShiftRows({ type: 'lamca', shifts: [{ name: 'Ca ngÃ y', start: '07:00', end: '17:30', brk: 1.5, brkMode: 'exact', brkStart: '11:30', brkEnd: '13:00' }] });
  const h = els.get('shift-rows').innerHTML;
  return h.includes('data-shift-f="brkMode"') && h.includes('data-shift-f="brkStart"') && h.includes('data-shift-f="brkEnd"') && h.includes('data-shift-prev="0"') && h.includes('is-exact') && h.includes('Giá» cá»¥ thá»ƒ')
    && !h.includes('step="1800"');   // picker phÃºt PHáº¢I chá»n Ä‘Æ°á»£c 30 (vÃ  má»i phÃºt)
})());
check('L4: lá»‹ch sá»­ váº½ Ä‘Æ°á»£c', (() => {
  state.hrShifts = [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '17:30', brk: 1.5 }], effectiveFrom: '2026-11-05', versions: [{ effectiveFrom: '2026-10-01', type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '19:00', brk: 1.5 }] }] }];
  hr.renderShiftHistory(state.hrShifts[0]);
  const h = els.get('shift-history').innerHTML;
  return h.includes('Tá»« 01/10/2026') && h.includes('07:00â€“19:00');
})());
check('L5: events.js ná»‘i má»‘c hiá»‡u lá»±c + á»§y quyá»n báº£ng ca', evSrc.includes('shift-effective') && evSrc.includes('hrSyncShiftBreakCells') && evSrc.includes('hrRefreshShiftPreviews'));
check('L6: CSS cÃ³ khá»‘i má»›i + á»Ÿ cáº¥p cao nháº¥t (depth = 0)', (() => {
  const depth = sel => { const i = cssSrc.indexOf(sel); if (i < 0) return -1; let d = 0; for (let k = 0; k < i; k++) { if (cssSrc[k] === '{') d++; else if (cssSrc[k] === '}') d--; } return d; };
  return cssSrc.includes('.shift-row-brk') && cssSrc.includes('.shift-history-box') && cssSrc.includes('.shift-card')
    && depth('.shift-card {') === 0 && depth('.shift-history-box {') === 0;
})());
check('L7: history.js ghi nháº­t kÃ½ vÃ¹ng hrShifts', histSrc.includes('hrShifts:') && histSrc.includes('Cáº¥u hÃ¬nh ca lÃ m viá»‡c'));
check('L8: export hÃ m má»›i', typeof hr.hrShiftBrkWin === 'function' && typeof hr.hrShiftApplyVersion === 'function' && typeof hr.migrateShiftEffectiveDates === 'function' && typeof hr.renderShiftHistory === 'function' && typeof hr.hrShiftRowsFromDom === 'function');
check('L9: sw.js Ä‘Ã£ bump cache v486', /nha-may-ngoc-son-v486/.test(swSrc));
check('L10: hr.js cÃ³ hÃ m Ä‘iá»n sáºµn giá» nghá»‰ cá»¥ thá»ƒ (hrFillExactBreakDefault) + cfgIn xem trÆ°á»›c',
  hrSrc.includes('function hrFillExactBreakDefault') && hrSrc.includes('cfgIn || hrShiftCfg(dept, date)'));

console.log(`
=== GIá»œ NGHá»ˆ Cá»¦A CA (LÃ€M CA): ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);

