// tests/xuong2-boc-luong.test.mjs â€” Kiá»ƒm thá»­ THáºº "Bá»C LUá»’NG" (tab CÃ´ng Äoáº¡n, XÆ°á»Ÿng 2):
// chá»n lÃ´ "Luá»“ng cÃ¢y..." lÃ m Äáº§u vÃ o (lÃ´ bá»‘c Háº¾T khá»‘i lÆ°á»£ng tá»± áº©n), Khá»‘i lÆ°á»£ng thá»±c
// táº¿ (kg), popup Äá»‹nh má»©c kg/h, tháº» ngÃ y láº¥y NGÆ¯á»œI + GIá»œ vá»‹ trÃ­ "Bá»‘c Luá»“ng" tá»« tab
// NhÃ¢n Sá»± â†’ CÃ´ng suáº¥t + Hiá»‡u suáº¥t, lÆ°u/sá»­a/xÃ³a (tombstone), ná»‘i state/storage/cloud/
// history/main/capacity/export.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-cut.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const { state, STORAGE_KEY_XUONG2_BOLUONG, STORAGE_KEY_X2_BOLUONG_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// â”€â”€â”€ Dá»¯ liá»‡u nguyÃªn liá»‡u máº«u (tab NguyÃªn Liá»‡u) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.materialRecords = [
  { id: 'mat-a', type: 'Luá»“ng cÃ¢y xÃ´',  supplier: 'Táº¿',   location: 'xuong-2', code: 'MNL01', weight: 1000, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'mat-d', type: 'luong cÃ¢y tre', supplier: 'Trung', location: 'xuong-2', weight: 500,  date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' },
  { id: 'mat-b', type: 'Luá»“ng á»‘ng',     supplier: 'Trung', location: 'xuong-2', weight: 800,  date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'mat-c', type: 'Thanh tre thÃ´', supplier: 'KhÃ¡c',  location: 'xuong-1', weight: 500,  date: '2026-09-12', createdAt: '2026-09-12T02:00:00.000Z' }
];
state.xuong2BoluongRecords = [];
state.x2BoluongEditId = null;
state.x2BoluongRates = {};
state.suppliers = [{ id: 'sup-te', name: 'NhÃ  Táº¿', code: 'NCC01', createdAt: '2026-09-01T00:00:00.000Z' }];
// NhÃ¢n Sá»±: NGÆ¯á»œI Bá»C + GIá»œ Bá»C tá»± Ä‘á»™ng tá»« Báº£ng bá»‘ trÃ­ (vá»‹ trÃ­ tÃªn chá»©a "bá»‘c luá»“ng")
state.hrEmployees = [
  { id: 'empA', name: 'Nguyá»…n VÄƒn A', quitDate: '' },
  { id: 'empB', name: 'Nguyá»…n VÄƒn B', quitDate: '' },
  { id: 'empC', name: 'Tráº§n VÄƒn C', quitDate: '' }
];
state.hrPositions = [
  { id: 'pbl', name: 'Bá»‘c Luá»“ng', department: 'XÆ°á»Ÿng 2' },
  { id: 'pcat', name: 'Cáº¯t Chá»n', department: 'XÆ°á»Ÿng 2' }
];
state.hrAssignments = [
  { id: 'asg-1', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'pbl', employeeId: 'empA', start: '07:00', end: '12:00' },
  { id: 'asg-2', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'pbl', employeeId: 'empB', start: '13:00', end: '' },
  { id: 'asg-3', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'pcat', employeeId: 'empC', start: '07:00', end: '' }
];

const x2 = await import('../js/xuong2.js');

// â”€â”€â”€ A. THáºº LAUNCHER + Má»ž/ÄÃ“NG POP-UP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.renderXuong2Cards();
check('THáºº: mini card hiá»‡n Tá»’N LUá»’NG CÃ‚Y CHÆ¯A Bá»C = "Tá»“n 1.500 kg" (1000 + 500)',
  document.getElementById('x2-mini-count-bo-luong').textContent === 'Tá»“n 1.500 kg');
check('THáºº: KHÃ”NG cÃ²n cá» "soon" (chá»©c nÄƒng Ä‘Ã£ báº­t)',
  !x2.X2_CARD_DEFS['x2-bo-luong-card'].soon);
check('THáºº: x2OpenCard tráº£ vá» true láº§n Ä‘áº§u', x2.x2OpenCard('x2-bo-luong-card') === true);
check('THáºº: pop-up báº­t + tháº» hiá»‡n (khÃ´ng cÃ²n x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bo-luong-card').classList.contains('x2-card-hidden'));
check('THáºº: báº¥m láº¡i tháº» Ä‘ang má»Ÿ â†’ false (Ä‘Ã³ng) + overlay táº¯t',
  x2.x2OpenCard('x2-bo-luong-card') === false &&
  !document.getElementById('x2-detail-overlay').classList.contains('show'));
x2.x2OpenCard('x2-bo-luong-card');

// â”€â”€â”€ B. Ã” CHá»ŒN Äáº¦U VÃ€O â€” CHá»ˆ LÃ” "LUá»’NG CÃ‚Y" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const sel = document.getElementById('x2-blg-material');
const optHtml = sel.innerHTML;
check('Ã” CHá»ŒN: cÃ³ lÃ´ "Luá»“ng cÃ¢y xÃ´"', optHtml.includes('Luá»“ng cÃ¢y xÃ´'));
check('Ã” CHá»ŒN: khá»›p Má»€M chá»¯ "luá»“ng cÃ¢y" khÃ´ng dáº¥u + hoa/thÆ°á»ng ("luong cÃ¢y tre")',
  optHtml.includes('luong cÃ¢y tre'));
check('Ã” CHá»ŒN: KHÃ”NG chá»©a "Luá»“ng á»‘ng" (khÃ´ng pháº£i Luá»“ng cÃ¢y)', !optHtml.includes('Luá»“ng á»‘ng'));
check('Ã” CHá»ŒN: KHÃ”NG chá»©a lÃ´ XÆ°á»Ÿng 1 "Thanh tre thÃ´"', !optHtml.includes('Thanh tre thÃ´'));
check('Ã” CHá»ŒN: nhÃ£n kÃ¨m PHáº¦N CÃ’N Láº I "cÃ²n 1.000 / 1.000 kg"',
  optHtml.includes('cÃ²n 1.000 / 1.000 kg'));

// â”€â”€â”€ C. LINK NGÃ€Y + THANH Tá»’N + BANNER GHI Má»šI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
sel.value = 'mat-a';
x2.updateXuong2BoluongLinked();
check('LINK: NgÃ y bá»‘c máº·c Ä‘á»‹nh theo ngÃ y nháº­p NL = 2026-09-10',
  document.getElementById('x2-blg-date').value === '2026-09-10');
check('Tá»’N: thanh trÃªn cÃ¹ng = "2 lÃ´ Â· 1.500 kg" chá» bá»‘c',
  document.getElementById('x2-blg-stock-bar').innerHTML.includes('2 lÃ´ Â· 1.500 kg'));
check('BANNER: Ä‘ang ghi má»›i â†’ áº©n', document.getElementById('x2-blg-edit-banner').style.display === 'none');

// â”€â”€â”€ D. Cáº¤U TRÃšC index.html + popup Äá»ŠNH Má»¨C â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('HTML: form cÃ³ 3 Ã´ NgÃ y Â· Äáº§u vÃ o Â· Khá»‘i lÆ°á»£ng thá»±c táº¿ + nÃºt Äá»‹nh má»©c',
  idxHtml.includes('id="x2-blg-date"') && idxHtml.includes('id="x2-blg-material"') &&
  idxHtml.includes('id="x2-blg-qty"') && idxHtml.includes('id="btn-x2-blg-rate"'));
check('HTML: cÃ³ vÃ¹ng THáºº NGÃ€Y (x2-blg-day-cards) + nÃºt thu gá»n',
  idxHtml.includes('id="x2-blg-day-cards"') && idxHtml.includes('id="btn-toggle-x2blg-table"'));
check('HTML: popup Ä‘á»‹nh má»©c cáº¥p trang modal-x2-blg-rate + Ã´ thÃ¡ng/sá»‘/nÃºt LÆ°u/chip',
  idxHtml.includes('id="modal-x2-blg-rate"') && idxHtml.includes('id="x2-blg-rate-month"') &&
  idxHtml.includes('id="x2-blg-rate-value"') && idxHtml.includes('id="btn-x2-blg-rate-save"') &&
  idxHtml.includes('id="x2-blg-rate-chips"'));
check('HTML: KHÃ”NG cÃ²n ghi chÃº placeholder .x2-soon-note trong tháº» Bá»‘c Luá»“ng',
  !/<div class="planning-card x2-card-hidden" id="x2-bo-luong-card">[\s\S]{0,900}x2-soon-note/.test(idxHtml));
check('HTML: thanh tá»“n + khá»‘i thá»‘ng kÃª + báº£ng lá»‹ch sá»­ cÃ³ sáºµn',
  idxHtml.includes('id="x2-blg-stock-bar"') && idxHtml.includes('id="x2-blg-stats"') &&
  idxHtml.includes('id="x2-blg-table-wrap"'));

// Äá»ŠNH Má»¨C (21/10/2026): ÄÆ N Vá»Š Má»šI = Sá» XE/GIá»œ
document.getElementById('x2-blg-rate-month').value = '2026-09';
document.getElementById('x2-blg-rate-value').value = '0.8';
x2.handleX2BoluongRateSave();
check('Äá»ŠNH Má»¨C: state.x2BoluongRates["2026-09"] = 0,8 xe/h', state.x2BoluongRates['2026-09'] === 0.8);
check('Äá»ŠNH Má»¨C: localStorage Ä‘Ã£ ghi key riÃªng',
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BOLUONG_RATE) || '{}')['2026-09'] === 0.8);
check('Äá»ŠNH Má»¨C: boluongRateOf(2026-09-10) = 0,8 xe/h Â· thÃ¡ng khÃ¡c = null',
  x2.boluongRateOf('2026-09-10') === 0.8 && x2.boluongRateOf('2026-10-10') === null);
check('Äá»ŠNH Má»¨C: chip thÃ¡ng Ä‘Ã£ Ä‘áº·t hiá»ƒn thá»‹ "T9 = 0,8 xe/h"',
  document.getElementById('x2-blg-rate-chips').innerHTML.includes('T9 = 0,8 xe/h'));
check('Äá»ŠNH Má»¨C: sá»‘ CÅ¨ khai theo kg/h (500) tá»± quy Ä‘á»•i Ã· 600 â†’ 0,833 xe/h',
  x2.xeRateOf(500) === 0.833 && x2.xeRateOf(0.8) === 0.8);

// â”€â”€â”€ E. LÆ¯U LÆ¯á»¢T Bá»C LUá»’NG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-blg-qty').value = '400';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('LÆ¯U: state cÃ³ Ä‘Ãºng 1 lÆ°á»£t bá»‘c luá»“ng', (state.xuong2BoluongRecords || []).length === 1);
const rec = state.xuong2BoluongRecords[0];
check('LÆ¯U: materialId link Ä‘Ãºng lÃ´ + snapshot KL lÃ´ = 1000',
  rec.materialId === 'mat-a' && rec.inputWeight === 1000);
check('LÆ¯U: Khá»‘i lÆ°á»£ng thá»±c táº¿ = 400 kg', rec.qty === 400);
check('LÆ¯U: snapshot NCC ("Táº¿") + mÃ£ sá»‘ lÃ´ ("MNL01") + MÃ£ NCC hiá»ƒn thá»‹ "NCC01" (khá»›p má»m "Táº¿" â‰¡ "NhÃ  Táº¿")',
  rec.supplier === 'Táº¿' && rec.code === 'MNL01' && x2.boluongDisplay(rec).supplierCode === 'NCC01');
check('LÆ¯U: NGÆ¯á»œI Bá»C tá»± Ä‘á»™ng tá»« Báº£ng bá»‘ trÃ­ (vá»‹ trÃ­ Bá»‘c Luá»“ng, KHÃ”NG nháº§m Cáº¯t Chá»n)',
  rec.worker === 'Nguyá»…n VÄƒn A, Nguyá»…n VÄƒn B' && !String(rec.worker).includes('Tráº§n VÄƒn C'));
check('LÆ¯U: GIá»œ Bá»C = "07:00â€“12:00, 13:00 â†’ háº¿t ca" Â· 9h HC / 0h TC',
  rec.workTime === '07:00â€“12:00, 13:00 â†’ háº¿t ca' && rec.workHours === 9 &&
  rec.workHoursHC === 9 && rec.workHoursTC === 0);
check('LÆ¯U: tuáº§n tá»± táº¡o theo ngÃ y (2026-Wâ€¦)', String(rec.week || '').startsWith('2026-W'));
check('LÆ¯U: localStorage Ä‘Ã£ ghi danh sÃ¡ch',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BOLUONG) || '[]').length === 1);
check('LÆ¯U: form reset vá» ghi má»›i', state.x2BoluongEditId === null);
check('Lá»ŒC: lÃ´ cÃ²n 600 kg â†’ VáºªN hiá»‡n + nhÃ£n "cÃ²n 600 / 1.000 kg"',
  sel.innerHTML.includes('Luá»“ng cÃ¢y xÃ´') && sel.innerHTML.includes('cÃ²n 600 / 1.000 kg'));

// â”€â”€â”€ F. THáºº NGÃ€Y: NGÆ¯á»œI Â· GIá»œ Â· CÃ”NG SUáº¤T Â· HIá»†U SUáº¤T â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const day = document.getElementById('x2-blg-day-cards').innerHTML;
check('THáºº NGÃ€Y: cÃ³ ngÃ y 10/09/26 + ngÆ°á»i bá»‘c chÃ­nh + "+1 ngÆ°á»i khÃ¡c"',
  day.includes('10/09/26') && day.includes('Nguyá»…n VÄƒn A') && day.includes('+1 ngÆ°á»i khÃ¡c'));
check('THáºº NGÃ€Y: giá» bá»‘c badge "9h HC" / "0h TC"', day.includes('9h HC') && day.includes('0h TC'));
check('THáºº NGÃ€Y: CÃ”NG SUáº¤T = (400 kg â‰ˆ 0,67 xe) Ã· 9h = "0,07 xe/h"', day.includes('0,07 xe/h'));
check('THáºº NGÃ€Y: Ã´ Sá»‘ xe hiá»‡n "â‰ˆ 0,67" (xe tÆ°Æ¡ng Ä‘Æ°Æ¡ng quy Ä‘á»•i tá»« kg)', day.includes('â‰ˆ 0,67'));
check('THáºº NGÃ€Y: HIá»†U SUáº¤T = 0,074 xe/h Ã· 0,8 xe/h = "9,3%"', day.includes('9,3%'));
check('THáºº NGÃ€Y: tooltip váº«n ghi tÆ°Æ¡ng Ä‘Æ°Æ¡ng kg/h cÅ© ("44,44 kg/h")', day.includes('44,44 kg/h'));
check('THáºº NGÃ€Y: cÃ³ Ã´ nháº­p GIá»œ Sá»° Cá» (data-x2-incident=boluong)',
  day.includes('data-x2-incident="boluong"'));
check('Báº¢NG: Ä‘áº¿m "1 lÆ°á»£t Ä‘Ã£ bá»‘c luá»“ng"',
  document.getElementById('x2-blg-table-count').textContent === '1 lÆ°á»£t Ä‘Ã£ bá»‘c luá»“ng');
check('THá»NG KÃŠ: khá»‘i stats cÃ³ "LÆ°á»£t bá»‘c luá»“ng" + "Tá»“n chá» bá»‘c (kg)"',
  document.getElementById('x2-blg-stats').innerHTML.includes('LÆ°á»£t bá»‘c luá»“ng') &&
  document.getElementById('x2-blg-stats').innerHTML.includes('Tá»“n chá» bá»‘c (kg)'));
// Bá»‘ trÃ­ bá»‹ xÃ³a â†’ báº£ng dÃ¹ng SNAPSHOT Ä‘Ã£ lÆ°u
const hrBackup = state.hrAssignments;
state.hrAssignments = [];
x2.renderXuong2BoluongTable();
check('THáºº NGÃ€Y (SNAPSHOT): máº¥t bá»‘ trÃ­ váº«n hiá»‡n ngÆ°á»i bá»‘c Ä‘Ã£ lÆ°u',
  document.getElementById('x2-blg-day-cards').innerHTML.includes('Nguyá»…n VÄƒn A'));
state.hrAssignments = hrBackup;
x2.renderXuong2BoluongTable();

// â”€â”€â”€ G. Bá»C Háº¾T KHá»I LÆ¯á»¢NG â†’ LÃ” Tá»° áº¨N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-blg-material').value = 'mat-a';
document.getElementById('x2-blg-date').value = '2026-09-10';
document.getElementById('x2-blg-qty').value = '600';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('Bá»C Háº¾T: 2 lÆ°á»£t = 1.000 kg = toÃ n bá»™ lÃ´', (state.xuong2BoluongRecords || []).length === 2);
check('áº¨N LÃ”: lÃ´ Ä‘Ã£ bá»‘c Háº¾T tá»± áº©n khá»i Ã´ chá»n (khÃ´ng cÃ²n "Luá»“ng cÃ¢y xÃ´")',
  !document.getElementById('x2-blg-material').innerHTML.includes('Luá»“ng cÃ¢y xÃ´'));
check('Tá»’N: thanh trÃªn cÃ¹ng chá»‰ cÃ²n lÃ´ thá»© 2 = "1 lÃ´ Â· 500 kg"',
  document.getElementById('x2-blg-stock-bar').innerHTML.includes('1 lÃ´ Â· 500 kg'));
check('MINI CARD: tá»“n chá» bá»‘c = "Tá»“n 500 kg"',
  document.getElementById('x2-mini-count-bo-luong').textContent === 'Tá»“n 500 kg');

// â”€â”€â”€ H. CHáº¶N NHáº¬P VÆ¯á»¢T PHáº¦N CÃ’N Láº I â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-blg-material').value = 'mat-d';
document.getElementById('x2-blg-date').value = '2026-09-12';
document.getElementById('x2-blg-qty').value = '400';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
const recD = (state.xuong2BoluongRecords || []).find(r => r.materialId === 'mat-d');
check('LÆ¯U (lÃ´ thá»© 2): 400/500 kg thÃ nh cÃ´ng', !!recD && recD.qty === 400);
document.getElementById('x2-blg-material').value = 'mat-d';
document.getElementById('x2-blg-date').value = '2026-09-12';
document.getElementById('x2-blg-qty').value = '300'; // cÃ²n láº¡i chá»‰ 100 kg
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('CHáº¶N: vÆ°á»£t pháº§n cÃ²n láº¡i (300 > 100) â†’ KHÃ”NG thÃªm lÆ°á»£t má»›i',
  (state.xuong2BoluongRecords || []).length === 3);

// â”€â”€â”€ I. Sá»¬A LÆ¯á»¢T Bá»C LUá»’NG (pháº§n cá»§a lÆ°á»£t Ä‘Æ°á»£c tráº£ láº¡i) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.editXuong2Boluong(recD.id);
check('Sá»¬A: vÃ o cháº¿ Ä‘á»™ sá»­a + banner hiá»‡n', state.x2BoluongEditId === recD.id &&
  document.getElementById('x2-blg-edit-banner').style.display === '');
check('Sá»¬A: Ã´ Khá»‘i lÆ°á»£ng náº¡p láº¡i 400 + Ã´ chá»n trá» Ä‘Ãºng lÃ´',
  document.getElementById('x2-blg-qty').value === '400' &&
  document.getElementById('x2-blg-material').value === 'mat-d');
document.getElementById('x2-blg-qty').value = '100';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('Sá»¬A: qty cáº­p nháº­t 100 â†’ tá»“n lÃ´ cÃ²n láº¡i 400 kg',
  recD.qty === 100 && Math.round(x2.boluongRemainingOf(state.materialRecords.find(m => m.id === 'mat-d'))) === 400);
check('Sá»¬A: sau lÆ°u vá» ghi má»›i', state.x2BoluongEditId === null);
// Sá»­a láº¡i Ä‘Ãºng báº±ng toÃ n bá»™ lÃ´ (500) â†’ há»£p lá»‡ vÃ¬ pháº§n lÆ°á»£t Ä‘ang sá»­a Ä‘Æ°á»£c TRáº¢ Láº I
x2.editXuong2Boluong(recD.id);
document.getElementById('x2-blg-qty').value = '500';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('Sá»¬A: pháº§n lÆ°á»£t Ä‘ang sá»­a Ä‘Æ°á»£c TRáº¢ Láº I â†’ 500 kg (háº¿t lÃ´) váº«n há»£p lá»‡',
  recD.qty === 500);
// VÆ°á»£t má»©c â†’ bá»‹ cháº·n
x2.editXuong2Boluong(recD.id);
document.getElementById('x2-blg-qty').value = '501';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('Sá»¬A: vÆ°á»£t 500 kg (háº¿t lÃ´) â†’ giá»¯ nguyÃªn 500', recD.qty === 500);
x2.resetXuong2BoluongForm();

// â”€â”€â”€ J. XÃ“A LÆ¯á»¢T (+ TOMBSTONE) â†’ LÃ” QUAY Láº I DANH SÃCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.deleteXuong2Boluong(recD.id);
check('XÃ“A: danh sÃ¡ch giáº£m 1 lÆ°á»£t (cÃ²n 2 lÆ°á»£t cá»§a lÃ´ mat-a)',
  (state.xuong2BoluongRecords || []).length === 2);
check('XÃ“A: ghi tombstone (xuong2BoluongRecords)',
  !!(state.deletedIds && state.deletedIds.xuong2BoluongRecords && state.deletedIds.xuong2BoluongRecords[recD.id]));
check('XÃ“A: lÃ´ "luong cÃ¢y tre" hiá»‡n láº¡i Ã´ chá»n + tá»“n quay láº¡i 500 kg',
  document.getElementById('x2-blg-material').innerHTML.includes('luong cÃ¢y tre') &&
  document.getElementById('x2-mini-count-bo-luong').textContent === 'Tá»“n 500 kg');
// Bá»‘c ná»‘t lÃ´ thá»© 2 háº¿t â†’ má»i lÃ´ Ä‘á»u háº¿t â†’ placeholder bÃ¡o háº¿t
document.getElementById('x2-blg-material').value = 'mat-d';
document.getElementById('x2-blg-date').value = '2026-09-12';
document.getElementById('x2-blg-qty').value = '500';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('Háº¾T LÃ”: option placeholder "Háº¿t lÃ´ Luá»“ng cÃ¢y chá» bá»‘c"',
  document.getElementById('x2-blg-material').innerHTML.includes('Háº¿t lÃ´ "Luá»“ng cÃ¢y" chá» bá»‘c'));
check('Háº¾T LÃ”: thanh tá»“n + mini card = "Háº¿t tá»“n"',
  document.getElementById('x2-blg-stock-bar').innerHTML.includes('Háº¿t tá»“n') &&
  document.getElementById('x2-mini-count-bo-luong').textContent === 'Háº¿t tá»“n');

// â”€â”€â”€ K. THU Gá»ŒN Báº¢NG + POPUP Äá»ŠNH Má»¨C Má»ž/ÄÃ“NG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.toggleX2BoluongTable();
check('Báº¢NG: thu gá»n hoáº¡t Ä‘á»™ng (x2-cut-collapsed)', document.getElementById('x2-blg-table-wrap').classList.contains('x2-cut-collapsed'));
x2.toggleX2BoluongTable();
check('Báº¢NG: má»Ÿ rá»™ng láº¡i', !document.getElementById('x2-blg-table-wrap').classList.contains('x2-cut-collapsed'));
check('POPUP ÄM: má»Ÿ/Ä‘Ã³ng popup Ä‘á»‹nh má»©c cá»§a tháº» Bá»‘c Luá»“ng',
  x2.openX2RatePopup('modal-x2-blg-rate') === true &&
  document.getElementById('modal-x2-blg-rate').classList.contains('show') &&
  x2.closeX2RatePopup('modal-x2-blg-rate') === true);
check('POPUP ÄM: Ã¡nh xáº¡ X2_RATE_POPUPS cÃ³ cáº·p btn-x2-blg-rate â†’ modal-x2-blg-rate',
  x2.X2_RATE_POPUPS['btn-x2-blg-rate'] === 'modal-x2-blg-rate');

// â”€â”€â”€ L. Ná»I Äá»¦ CÃC MODULE KHÃC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const rd = f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const jsState = rd('state.js'), jsStorage = rd('storage.js'), jsCloud = rd('cloud.js');
const jsHist = rd('history.js'), jsMain = rd('main.js'), jsEvents = rd('events.js');
const jsCap = rd('capacity.js'), jsXlsx = rd('export-xlsx.js');
check('Ná»I (state): key riÃªng cá»§a 2 trÆ°á»ng',
  jsState.includes('bamboo_tracker_xuong2_boc_luong_v1') &&
  jsState.includes('bamboo_tracker_x2_boc_luong_rate_v1'));
check('Ná»I (storage): restore + 2 Ä‘Æ°á»ng náº¡p file + snapshot + import',
  jsStorage.includes('function restoreXuong2Boluong') && jsStorage.includes('function restoreX2BoluongRates') &&
  (jsStorage.match(/restoreXuong2Boluong\(/g) || []).length >= 4);
check('Ná»I (cloud): snapshot + core + merge + persistAllLocal',
  jsCloud.includes('xuong2BoluongRecords: state.xuong2BoluongRecords') &&
  jsCloud.includes('xuong2BoluongRecords: obj.xuong2BoluongRecords') &&
  jsCloud.includes('remote.xuong2BoluongRecords') &&
  jsCloud.includes('STORAGE_KEY_XUONG2_BOLUONG'));
check('Ná»I (history): 2 vÃ¹ng dá»¯ liá»‡u tab kanban',
  jsHist.includes('xuong2BoluongRecords') && jsHist.includes('x2BoluongRates'));
check('Ná»I (main): náº¡p lÃºc boot', jsMain.includes('loadXuong2Boluong()') && jsMain.includes('loadX2BoluongRates()'));
check('Ná»I (events): wire submit + há»§y + thu gá»n + lÆ°u Ä‘á»‹nh má»©c + sá»­a/xÃ³a á»§y quyá»n',
  jsEvents.includes("safeOn('x2-blg-form', 'submit'") &&
  jsEvents.includes("safeOn('btn-cancel-x2-blg'") &&
  jsEvents.includes("safeOn('btn-toggle-x2blg-table'") &&
  jsEvents.includes("safeOn('btn-x2-blg-rate-save'") &&
  jsEvents.includes("closest('[data-x2-blg-edit]')") &&
  jsEvents.includes("closest('[data-x2-blg-delete]')"));
check('Ná»I (capacity): dÃ²ng cÃ´ng Ä‘oáº¡n boluong + khÃ³a giá» sá»± cá»‘ + sparkline',
  jsCap.includes("id: 'boluong'") && jsCap.includes("boluong: 'boluong'") &&
  jsCap.includes('x2-mini-spark-bo-luong'));
check('Ná»I (export): nguá»“n "boluong" + cá»™t + nhÃ¡nh dá»±ng báº£ng',
  jsXlsx.includes("id: 'boluong'") && jsXlsx.includes("source === 'boluong'") &&
  jsXlsx.includes('boluongDisplay'));
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (sw.js): CACHE_NAME Ä‘Ã£ tÄƒng v486', /nha-may-ngoc-son-v486/.test(swSrc));

// â”€â”€â”€ M. Báº¢NG Tá»”NG Há»¢P CÃ”NG SUáº¤T Äá»ŒC ÄÃšC Dá»® LIá»†U THáºº â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cap = await import('../js/capacity.js');
const blgSt = cap.CAP_STAGES.find(s => s.id === 'boluong');
check('CAPACITY: dÃ²ng boluong Ä‘Æ¡n vá»‹ xe/h + cardId Ä‘Ãºng tháº»',
  !!blgSt && blgSt.unit === 'xe/h' && blgSt.unitQty === 'xe' && blgSt.cardId === 'x2-bo-luong-card');
state.xuong2BoluongRecords = [{
  id: 'x2blg-test', materialId: 'mat-a', materialType: 'Luá»“ng cÃ¢y xÃ´', supplier: 'Táº¿',
  inputWeight: 1000, qty: 300, date: '2026-09-10', week: '2026-W37',
  workHours: 9, workHoursHC: 9, workHoursTC: 0,
  createdAt: '2026-09-10T03:00:00.000Z'
}];
const blgRows = blgSt.rows();
check('CAPACITY: rows() tráº£ qty = 0,5 xe (300 kg Ã· 600) + giá» 9h (Ä‘Ãºng nguá»“n tháº» Bá»‘c Luá»“ng)',
  blgRows.length === 1 && Math.abs(blgRows[0].qty - 0.5) < 1e-9 && blgRows[0].hours === 9);
state.xuong2BoluongRecords = [];

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);




