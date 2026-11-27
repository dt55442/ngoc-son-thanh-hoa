// tests/xuong2-ho-tro.test.mjs â€” Kiá»ƒm thá»­ THáºº "Há»– TRá»¢ + CÃ”NG ÄOáº N Láºº" (tab CÃ´ng Äoáº¡n, XÆ°á»Ÿng 2):
// tháº» CHá»ˆ CÃ“ 2 VÃ™NG (â‘  nháº­p liá»‡u Â· â‘¡ báº£ng lá»‹ch sá»­ theo ngÃ y) â€” cÃ´ng viá»‡c PHÃT SINH nÃªn
// KHÃ”NG thanh tá»“n / thá»‘ng kÃª / Ä‘á»‹nh má»©c (KHÃ”NG cÃ´ng suáº¥t Â· KHÃ”NG hiá»‡u suáº¥t).
//   â€¢ form: NgÃ y Â· Ná»™i dung cÃ´ng viá»‡c (Ä‘iá»n tay) Â· NgÆ°á»i thá»±c hiá»‡n (CHá»ŒN Tá»ªNG NGÆ¯á»œI â€”
//     CHá»ˆ ngÆ°á»i Ä‘ang bá»‘ trÃ­ vá»‹ trÃ­ "Há»— Trá»£ + CÃ´ng Äoáº¡n Láº»" (XÆ°á»Ÿng 2) trong Báº£ng bá»‘ trÃ­
//     theo ngÃ y á»Ÿ tab NhÃ¢n Sá»± â€” 1 viá»‡c chá»n NHIá»€U ngÆ°á»i) Â· MÃ´ táº£ (Ä‘iá»n tay)
//   â€¢ GIá»œ LÃ€M tá»«ng cÃ´ng viá»‡c = tá»•ng khung giá» cá»§a ÄÃšNG nhá»¯ng ngÆ°á»i Ä‘Æ°á»£c chá»n (tÃ¡ch HC/TC);
//     Ä‘á»c Sá»NG khi bá»‘ trÃ­ cÃ²n, máº¥t bá»‘ trÃ­ â†’ SNAPSHOT lÆ°u lÃºc ghi.
//   â€¢ lÆ°u/sá»­a/xÃ³a (tombstone) + ná»‘i state/storage/cloud/history/main/events/export + sw v232.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-boc-luong.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const { state, STORAGE_KEY_XUONG2_HO_TRO } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// â”€â”€â”€ Dá»¯ liá»‡u NhÃ¢n Sá»± máº«u â€” Báº£ng bá»‘ trÃ­ theo ngÃ y (tab NhÃ¢n Sá»±) â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.hrEmployees = [
  { id: 'empA', name: 'Nguyá»…n VÄƒn A', quitDate: '' },
  { id: 'empB', name: 'Nguyá»…n VÄƒn B', quitDate: '' },
  { id: 'empC', name: 'Tráº§n VÄƒn C', quitDate: '' }
];
state.hrPositions = [
  { id: 'pht',  name: 'Há»— Trá»£ + CÃ´ng Äoáº¡n Láº»', department: 'XÆ°á»Ÿng 2' },
  { id: 'pcat', name: 'Cáº¯t Chá»n', department: 'XÆ°á»Ÿng 2' },
  { id: 'pbl',  name: 'Bá»‘c Luá»“ng', department: 'XÆ°á»Ÿng 2' },
  { id: 'pqc',  name: 'Kiá»ƒm cháº¥t', department: 'QC' }
];
state.hrAssignments = [
  { id: 'asg-1', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'pht',  employeeId: 'empA', start: '07:00', end: '12:00' },
  { id: 'asg-2', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'pht',  employeeId: 'empB', start: '13:00', end: '19:00' },
  { id: 'asg-3', date: '2026-09-10', department: 'QC',       positionId: 'pqc',  employeeId: 'empC', start: '07:30', end: '16:30' },
  { id: 'asg-4', date: '2026-09-11', department: 'XÆ°á»Ÿng 2', positionId: 'pht',  employeeId: 'empA', start: '07:00', end: '17:30' },
  // NgÆ°á»i á»Ÿ vá»‹ trÃ­ Cáº®T CHá»ŒN cÃ¹ng ngÃ y â†’ PHáº¢I Bá»Š LOáº I khá»i Ã´ chá»n Há»— trá»£
  { id: 'asg-5', date: '2026-09-10', department: 'XÆ°á»Ÿng 2', positionId: 'pcat', employeeId: 'empC', start: '08:00', end: '17:00' }
];
state.xuong2HoTroRecords = [];
state.x2HoTroEditId = null;

const hr = await import('../js/hr.js');
const x2 = await import('../js/xuong2.js');
const fmtGio = v => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRatio = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });

// â”€â”€â”€ A. THáºº LAUNCHER + Má»ž/ÄÃ“NG POP-UP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.renderXuong2Cards();
check('A1: chÆ°a ghi viá»‡c nÃ o â†’ chip mini card = "ChÆ°a ghi"',
  document.getElementById('x2-mini-count-ho-tro').textContent === 'ChÆ°a ghi');
check('A2: KHÃ”NG cÃ²n cá» soon (Ä‘Ã£ báº­t chá»©c nÄƒng)',
  !x2.X2_CARD_DEFS['x2-ho-tro-card'].soon);
check('A3: x2OpenCard tráº£ vá» true láº§n Ä‘áº§u', x2.x2OpenCard('x2-ho-tro-card') === true);
check('A4: pop-up báº­t (overlay show)',
  document.getElementById('x2-detail-overlay').classList.contains('show'));
check('A5: báº¥m láº¡i â†’ false (Ä‘Ã³ng)',
  x2.x2OpenCard('x2-ho-tro-card') === false &&
  !document.getElementById('x2-detail-overlay').classList.contains('show'));
x2.x2OpenCard('x2-ho-tro-card');

// â”€â”€â”€ B. Ã” CHá»ŒN NGÆ¯á»œI = CHá»ˆ Bá» TRÃ Vá»Š TRÃ "Há»– TRá»¢ + CÃ”NG ÄOáº N Láºº" â”€â”€â”€â”€â”€
const dateEl = document.getElementById('x2-ht-date');
dateEl.value = '2026-09-10';
x2.fillXuong2HoTroWorkers([]);
const sel = document.getElementById('x2-ht-workers');
check('B1: ngÃ y 10/09 cÃ³ 5 lÆ°á»£t bá»‘ trÃ­ nhÆ°ng CHá»ˆ 2 lÆ°á»£t vá»‹ trÃ­ "Há»— Trá»£ + CÃ´ng Äoáº¡n Láº»" lá»t vÃ o danh sÃ¡ch',
  (state.hrAssignments || []).length === 5 &&
  (sel.innerHTML.match(/<option/g) || []).length === 2);
check('B2: option ghi tÃªn Â· vá»‹ trÃ­ Há»— Trá»£ + CÃ´ng Äoáº¡n Láº» Â· bá»™ pháº­n Â· khung giá»',
  sel.innerHTML.includes('Nguyá»…n VÄƒn A â€” Há»— Trá»£ + CÃ´ng Äoáº¡n Láº» (XÆ°á»Ÿng 2)') &&
  sel.innerHTML.includes('07:00â€“12:00') &&
  sel.innerHTML.includes('07:30â€“16:30') === false); // Tráº§n VÄƒn C (QC â€” Kiá»ƒm cháº¥t) KHÃ”NG lá»t
check('B2b: KHÃ”NG liá»‡t kÃª ngÆ°á»i á»Ÿ vá»‹ trÃ­ khÃ¡c (Cáº¯t Chá»n) hay bá»™ pháº­n khÃ¡c (QC)',
  !sel.innerHTML.includes('Cáº¯t Chá»n') && !sel.innerHTML.includes('Kiá»ƒm cháº¥t') &&
  !sel.innerHTML.includes('Tráº§n VÄƒn C'));
check('B2c: isHoTraPos khá»›p má»m (bá» dáº¥u/hoa thÆ°á»ng) â€” "Há»— trá»£", "ho tro + cong doan le"â€¦',
  x2.isHoTroPos('Há»— Trá»£ + CÃ´ng Äoáº¡n Láº»') && x2.isHoTroPos('Há»– TRá»¢') &&
  x2.isHoTroPos('ho tro') && !x2.isHoTroPos('Cáº¯t Chá»n') && !x2.isHoTroPos('Kiá»ƒm cháº¥t'));
check('B3: chÆ°a chá»n ngÆ°á»i â†’ Ã´ tá»± tÃ­nh "ChÆ°a chá»n ngÆ°á»i thá»±c hiá»‡n"',
  document.getElementById('x2-ht-calc').innerHTML.includes('ChÆ°a chá»n ngÆ°á»i thá»±c hiá»‡n'));
check('B4: chá»n ngÆ°á»i â†’ Ã´ tá»± tÃ­nh hiá»‡n N ngÆ°á»i + giá» HC/TC',
  (() => {
    sel.options = [{ value: 'asg-1', selected: true, disabled: false }, { value: 'asg-2', selected: true, disabled: false }];
    x2.updateXuong2HoTroCalc();
    const t = document.getElementById('x2-ht-calc').innerHTML;
    return t.includes('2 ngÆ°á»i') && t.includes('h HC') && t.includes('Nguyá»…n VÄƒn A, Nguyá»…n VÄƒn B');
  })());
check('B5: ngÃ y khÃ´ng cÃ³ ai á»Ÿ vá»‹ trÃ­ Há»— Trá»£ â†’ placeholder dáº«n sang tab NhÃ¢n Sá»±',
  (() => {
    dateEl.value = '2026-09-25';
    x2.fillXuong2HoTroWorkers([]);
    return document.getElementById('x2-ht-workers').innerHTML.includes('chÆ°a cÃ³ ai á»Ÿ vá»‹ trÃ­');
  })());
dateEl.value = '2026-09-10';
x2.fillXuong2HoTroWorkers([]);
check('B6: nÃºt Chá»n táº¥t cáº£ / Bá» chá»n hoáº¡t Ä‘á»™ng',
  (() => {
    sel.options = [
      { value: 'asg-1', selected: false, disabled: false },
      { value: 'asg-2', selected: false, disabled: false }
    ];
    x2.hoTroPickAll();
    const allOn = sel.options.filter(o => o.selected).length === 2;
    x2.hoTroPickNone();
    return allOn && sel.options.filter(o => o.selected).length === 0;
  })());

// â”€â”€â”€ C. CHáº¶N LÆ¯U KHI THIáº¾U TRÆ¯á»œNG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const workEl = document.getElementById('x2-ht-work');
const descEl = document.getElementById('x2-ht-desc');
sel.options = [];
dateEl.value = '';
workEl.value = 'XÃ³a rÃ¡c khuÃ´n';
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
check('C1: thiáº¿u NgÃ y â†’ khÃ´ng ghi', (state.xuong2HoTroRecords || []).length === 0);
dateEl.value = '2026-09-10';
workEl.value = '';
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
check('C2: thiáº¿u Ná»™i Dung CÃ´ng Viá»‡c â†’ khÃ´ng ghi', (state.xuong2HoTroRecords || []).length === 0);
workEl.value = 'XÃ³a rÃ¡c khuÃ´n';
sel.options = [];
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
check('C3: thiáº¿u NgÆ°á»i Thá»±c Hiá»‡n â†’ khÃ´ng ghi', (state.xuong2HoTroRecords || []).length === 0);

// â”€â”€â”€ D. LÆ¯U 1 VIá»†C = NHIá»€U NGÆ¯á»œI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
sel.options = [
  { value: 'asg-1', selected: true, disabled: false },
  { value: 'asg-2', selected: true, disabled: false }
];
descEl.value = 'Dá»n dáº¹p khu vá»±c mÃ¡y Ã©p';
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
const list = state.xuong2HoTroRecords || [];
check('D1: Ä‘Ã£ ghi 1 cÃ´ng viá»‡c + localStorage Ä‘Ã£ ghi',
  list.length === 1 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_HO_TRO) || '[]').length === 1);
const rec = list[0];
check('D2: báº£n ghi Ä‘á»§ trÆ°á»ng NgÃ y Â· Ná»™i dung Â· MÃ´ táº£ Â· tuáº§n',
  rec.date === '2026-09-10' && rec.workName === 'XÃ³a rÃ¡c khuÃ´n' &&
  rec.desc === 'Dá»n dáº¹p khu vá»±c mÃ¡y Ã©p' && String(rec.week || '').startsWith('2026-W'));
check('D3: 1 viá»‡c = NHIá»€U NGÆ¯á»œI (asgIds 2 lÆ°á»£t bá»‘ trÃ­ + snapshot tÃªn)',
  Array.isArray(rec.asgIds) && rec.asgIds.length === 2 &&
  rec.worker === 'Nguyá»…n VÄƒn A, Nguyá»…n VÄƒn B');
check('D4: giá» HC/TC snapshot = HC + TC (07:00â€“12:00 + 13:00â€“19:00, Cáº¢ 2 > 0)',
  rec.workHoursHC > 0 && rec.workHoursTC > 0 &&
  Math.abs(rec.workHours - (rec.workHoursHC + rec.workHoursTC)) < 1e-9);
check('D5: snapshot asgSnap giá»¯ khung giá» tá»«ng ngÆ°á»i (phÃ²ng máº¥t bá»‘ trÃ­)',
  Array.isArray(rec.asgSnap) && rec.asgSnap.length === 2 &&
  rec.asgSnap[0].start === '07:00' && rec.asgSnap[1].start === '13:00');
check('D6: form reset vá» ghi má»›i (x2HoTroEditId = null)',
  state.x2HoTroEditId === null);

// â”€â”€â”€ E. Báº¢NG Lá»ŠCH Sá»¬ â€” THáºº NGÃ€Y (KHÃ”NG cÃ´ng suáº¥t / hiá»‡u suáº¥t) â”€â”€â”€â”€â”€â”€â”€â”€
check('E1: Ä‘áº¿m "1 cÃ´ng viá»‡c" á»Ÿ thanh tiÃªu Ä‘á» báº£ng',
  document.getElementById('x2-ht-table-count').textContent === '1 cÃ´ng viá»‡c');
const dayHtml = document.getElementById('x2-ht-day-cards').innerHTML;
check('E2: tháº» ngÃ y cÃ³ nhÃ£n NgÃ y Â· NgÆ°á»i thá»±c hiá»‡n Â· Giá» lÃ m + sá»‘ viá»‡c',
  dayHtml.includes('10/09/26') && dayHtml.includes('Nguyá»…n VÄƒn A') &&
  dayHtml.includes('Giá» lÃ m:') && dayHtml.includes('1 cÃ´ng viá»‡c'));
check('E3: KHÃ”NG cÃ³ CÃ´ng suáº¥t / Hiá»‡u suáº¥t (viá»‡c phÃ¡t sinh â€” Ä‘Ãºng yÃªu cáº§u)',
  !dayHtml.includes('CÃ´ng suáº¥t') && !dayHtml.includes('Hiá»‡u suáº¥t'));
check('E4: báº£ng dÃ²ng Ä‘á»§ cá»™t NgÃ y Â· Ná»™i dung Â· NgÆ°á»i Â· MÃ´ táº£ Â· Giá» HC Â· Giá» TC',
  dayHtml.includes('Ná»™i Dung CÃ´ng Viá»‡c') && dayHtml.includes('NgÆ°á»i Thá»±c Hiá»‡n') &&
  dayHtml.includes('MÃ´ Táº£') && dayHtml.includes('Giá» HC (h)') && dayHtml.includes('Giá» TC (h)'));
check('E5: dÃ²ng cÃ´ng viá»‡c hiá»‡n Ä‘Ãºng ná»™i dung + mÃ´ táº£ + giá»',
  dayHtml.includes('XÃ³a rÃ¡c khuÃ´n') && dayHtml.includes('Dá»n dáº¹p khu vá»±c mÃ¡y Ã©p') &&
  dayHtml.includes(fmtGio(rec.workHoursHC)));
check('E6: chip mini card = "1 viá»‡c"', document.getElementById('x2-mini-count-ho-tro').textContent === '1 viá»‡c');

// â”€â”€â”€ F. GIá»œ Äá»ŒC Sá»NG Tá»ª Báº¢NG Bá» TRÃ (sá»­a bá»‘ trÃ­ â†’ báº£ng tá»± Ä‘á»•i) â”€â”€â”€â”€â”€â”€â”€
// Ká»³ vá»ng = tá»•ng Cáº¢ 2 lÆ°á»£t bá»‘ trÃ­ cá»§a viá»‡c (asg-1 07:00â€“12:00 + asg-2 13:00â€“19:00)
const hcA1Old = hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-09-10', '07:00', '12:00', 0).hc;
const hcA2 = hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-09-10', '13:00', '19:00', 0).hc;
const expHcOld = (hcA1Old + hcA2) / 60;
const liveNew = (hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-09-10', '07:00', '16:00', 0).hc + hcA2) / 60;
state.hrAssignments[0].end = '16:00';
x2.renderXuong2HoTroTable();
check('F1: Ä‘á»•i giá» bá»‘ trÃ­ (12:00 â†’ 16:00) â†’ báº£ng Ä‘á»c Sá»NG, giá» HC Ä‘á»•i theo',
  liveNew > expHcOld &&
  document.getElementById('x2-ht-day-cards').innerHTML.includes(fmtGio(liveNew)));
check('F2: snapshot GIá»® NGUYÃŠN giá» lÃºc ghi (khÃ´ng bá»‹ sá»­a theo bá»‘ trÃ­)',
  Math.abs(rec.workHoursHC - expHcOld) < 1e-9 &&
  Math.abs(rec.workHours - (rec.workHoursHC + rec.workHoursTC)) < 1e-9);

// â”€â”€â”€ G. Máº¤T Bá» TRÃ â†’ VáºªN HIá»‚N THá»Š TÃŠN + GIá»œ Tá»ª SNAPSHOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const backupAsg = state.hrAssignments;
state.hrAssignments = [];
x2.renderXuong2HoTroTable();
const snapHtml = document.getElementById('x2-ht-day-cards').innerHTML;
check('G1: máº¥t Báº£ng bá»‘ trÃ­ â†’ váº«n hiá»‡n ngÆ°á»i tá»« snapshot',
  snapHtml.includes('Nguyá»…n VÄƒn A') && snapHtml.includes('Nguyá»…n VÄƒn B'));
check('G2: váº«n hiá»‡n giá» HC tá»« snapshot', snapHtml.includes(fmtGio(rec.workHoursHC)));
state.hrAssignments = backupAsg;
x2.renderXuong2HoTroTable();

// â”€â”€â”€ H. Äáº¦U THáºº NGÃ€Y KHÃ”NG Cá»˜P TRÃ™NG GIá»œ (2 viá»‡c cÃ¹ng 1 ngÆ°á»i) â”€â”€â”€â”€â”€â”€â”€
(state.xuong2HoTroRecords || []).push({
  id: 'x2ht-test-dup', date: '2026-09-10', week: '2026-W37',
  workName: 'Kiá»ƒm tra PCCC', desc: '', asgIds: ['asg-1'],
  asgSnap: rec.asgSnap.slice(0, 1), worker: 'Nguyá»…n VÄƒn A', workTime: '07:00â€“16:00',
  workHours: rec.workHoursHC, workHoursHC: rec.workHoursHC, workHoursTC: 0,
  createdAt: '2026-09-10T08:00:00.000Z'
});
x2.renderXuong2HoTroTable();
const dupHtml = document.getElementById('x2-ht-day-cards').innerHTML;
// Giá» Ä‘áº§u tháº» ngÃ y = Cáº¢ 2 lÆ°á»£t bá»‘ trÃ­ (asg-1 Ä‘Ã£ sá»­a â†’ 07:00â€“16:00 + asg-2 13:00â€“19:00),
// gá»™p theo lÆ°á»£t bá»‘ trÃ­ nÃªn 2 viá»‡c cÃ¹ng ngÆ°á»i chá»‰ tÃ­nh 1 Láº¦N.
const expDayHc = fmtRatio((hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-09-10', '07:00', '16:00', 0).hc + hcA2) / 60);
const expDayTc = fmtRatio((hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-09-10', '07:00', '16:00', 0).tc +
  hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-09-10', '13:00', '19:00', 0).tc) / 60);
check('H1: 2 viá»‡c cÃ¹ng ngÃ y cÃ¹ng ngÆ°á»i â†’ giá» Ä‘áº§u tháº» = 1 Láº¦N (khÃ´ng cá»™ng trÃ¹ng)',
  dupHtml.includes(`Giá» lÃ m: <span class="x2-hours-hc">${expDayHc}h HC</span><span class="x2-hours-tc">${expDayTc}h TC</span>`));
check('H2: Ä‘áº§u tháº» ghi "2 cÃ´ng viá»‡c"', dupHtml.includes('2 cÃ´ng viá»‡c'));
check('H3: chip mini = "2 viá»‡c"',
  (() => { x2.renderXuong2Cards(); return document.getElementById('x2-mini-count-ho-tro').textContent === '2 viá»‡c'; })());

// â”€â”€â”€ I. Sá»¬A CÃ”NG VIá»†C (náº¡p láº¡i form + banner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.editXuong2HoTro(rec.id);
check('I1: vÃ o cháº¿ Ä‘á»™ sá»­a + banner hiá»‡n + form náº¡p Ä‘Ãºng',
  state.x2HoTroEditId === rec.id &&
  document.getElementById('x2-ht-edit-banner').style.display === '' &&
  workEl.value === 'XÃ³a rÃ¡c khuÃ´n' && descEl.value === 'Dá»n dáº¹p khu vá»±c mÃ¡y Ã©p');
check('I2: chá»n láº¡i ÄÃšNG 2 ngÆ°á»i cá»§a lÆ°á»£t Ä‘ang sá»­a',
  sel.options.filter(o => o.selected).length === 2);
descEl.value = 'Dá»n dáº¹p + lau chÃ¹i mÃ¡y Ã©p';
x2.handleXuong2HoTroSubmit({ preventDefault(){} });
check('I3: lÆ°u Sá»¬A â†’ cáº­p nháº­t mÃ´ táº£, váº«n 2 viá»‡c, vá» ghi má»›i',
  rec.desc === 'Dá»n dáº¹p + lau chÃ¹i mÃ¡y Ã©p' &&
  (state.xuong2HoTroRecords || []).length === 2 &&
  state.x2HoTroEditId === null);

// â”€â”€â”€ J. XÃ“A (tombstone) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.deleteXuong2HoTro('x2ht-test-dup');
check('J1: Ä‘Ã£ xÃ³a 1 viá»‡c (cÃ²n 1) + ghi tombstone',
  (state.xuong2HoTroRecords || []).length === 1 &&
  !!(state.deletedIds && state.deletedIds.xuong2HoTroRecords && state.deletedIds.xuong2HoTroRecords['x2ht-test-dup']));
x2.deleteXuong2HoTro(rec.id);
check('J2: xÃ³a háº¿t â†’ chip "ChÆ°a ghi" + rá»—ng + localStorage rá»—ng',
  (state.xuong2HoTroRecords || []).length === 0 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_HO_TRO) || '[]').length === 0 &&
  document.getElementById('x2-mini-count-ho-tro').textContent === 'ChÆ°a ghi');

// â”€â”€â”€ K. Ná»I 6 CHá»– + Cáº¤U TRÃšC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const jsState = fs.readFileSync('js/state.js', 'utf8');
const jsStorage = fs.readFileSync('js/storage.js', 'utf8');
const jsCloud = fs.readFileSync('js/cloud.js', 'utf8');
const jsHist = fs.readFileSync('js/history.js', 'utf8');
const jsMain = fs.readFileSync('js/main.js', 'utf8');
const jsEvents = fs.readFileSync('js/events.js', 'utf8');
const jsXlsx = fs.readFileSync('js/export-xlsx.js', 'utf8');
const idxHtml = fs.readFileSync('index.html', 'utf8');
const cssCss = fs.readFileSync('styles.css', 'utf8');
const swJs = fs.readFileSync('sw.js', 'utf8');

check('K1 (state): key + state fields + export',
  jsState.includes('bamboo_tracker_xuong2_ho_tro_v1') &&
  jsState.includes('xuong2HoTroRecords: []') && jsState.includes('x2HoTroEditId: null'));
check('K2 (storage): restore + 2 Ä‘Æ°á»ng náº¡p file + 2 snapshot + import + export',
  jsStorage.includes('function restoreXuong2HoTro') &&
  (jsStorage.match(/restoreXuong2HoTro\(/g) || []).length >= 4 &&
  (jsStorage.match(/xuong2HoTroRecords: state/g) || []).length >= 2);
check('K3 (cloud): snapshot + core + merge + persistAllLocal + applyFireSnapshot',
  jsCloud.includes('xuong2HoTroRecords: state.xuong2HoTroRecords') &&
  jsCloud.includes('xuong2HoTroRecords: obj.xuong2HoTroRecords') &&
  jsCloud.includes('remote.xuong2HoTroRecords') &&
  jsCloud.includes('STORAGE_KEY_XUONG2_HO_TRO') &&
  jsCloud.includes('data.xuong2HoTroRecords'));
check('K4 (history): vÃ¹ng dá»¯ liá»‡u tab kanban', jsHist.includes('xuong2HoTroRecords'));
check('K5 (main): náº¡p lÃºc boot', jsMain.includes('loadXuong2HoTro()'));
check('K6 (events): wire submit + há»§y + Ä‘á»•i ngÃ y + chá»n ngÆ°á»i + thu gá»n + sá»­a/xÃ³a á»§y quyá»n',
  jsEvents.includes("safeOn('x2-ht-form', 'submit'") &&
  jsEvents.includes("safeOn('btn-cancel-x2-ht'") &&
  jsEvents.includes("safeOn('x2-ht-date', 'change'") &&
  jsEvents.includes("safeOn('x2-ht-workers', 'change'") &&
  jsEvents.includes("safeOn('btn-x2-ht-pick-all'") &&
  jsEvents.includes("safeOn('btn-toggle-x2ht-table'") &&
  jsEvents.includes("closest('[data-x2-ht-edit]')") &&
  jsEvents.includes("closest('[data-x2-ht-delete]')"));
check('K7 (index.html): form Ä‘á»§ 4 trÆ°á»ng + vÃ¹ng lá»‹ch sá»­ + nÃºt thu gá»n',
  idxHtml.includes('id="x2-ht-form"') && idxHtml.includes('id="x2-ht-date"') &&
  idxHtml.includes('id="x2-ht-work"') && idxHtml.includes('id="x2-ht-workers"') &&
  idxHtml.includes('id="x2-ht-desc"') && idxHtml.includes('id="x2-ht-day-cards"') &&
  idxHtml.includes('id="btn-toggle-x2ht-table"'));
check('K8 (index.html): Ä‘Ã£ gá»¡ placeholder ".x2-soon-note" cá»§a tháº» Há»— trá»£',
  !idxHtml.includes('Chá»©c nÄƒng Ä‘ang Ä‘Æ°á»£c bá»• sung') && !idxHtml.includes('id="x2-ho-tro-card"') === false &&
  idxHtml.slice(idxHtml.indexOf('id="x2-ho-tro-card"'), idxHtml.indexOf('id="x1-cat-ong-card"')).includes('x2-zone'));
check('K9 (styles.css): khá»‘i CSS riÃªng (.x2-ht-worker-tools + #x2-ht-workers + .x2-ht-calc)',
  cssCss.includes('.x2-ht-worker-tools') && cssCss.includes('#x2-ht-workers') &&
  cssCss.includes('.x2-ht-calc'));
check('K10 (export-xlsx): nguá»“n "hotro" + nhÃ¡nh cá»™t NgÃ y/Ná»™i dung/NgÆ°á»i/MÃ´ táº£/Giá»',
  jsXlsx.includes("id: 'hotro'") && jsXlsx.includes('state.xuong2HoTroRecords') &&
  jsXlsx.includes("source === 'hotro'"));
check('K11 (sw.js): Ä‘Ã£ tÄƒng CACHE_NAME v486', /nha-may-ngoc-son-v486/.test(swJs));
check('K12 (index.html): gá»£i Ã½ Ã´ ngÆ°á»i nÃªu rÃµ CHá»ˆ vá»‹ trÃ­ "Há»— Trá»£ + CÃ´ng Äoáº¡n Láº»" (XÆ°á»Ÿng 2)',
  idxHtml.includes('Chá»‰ hiá»‡n ngÆ°á»i Ä‘ang bá»‘ trÃ­ vá»‹ trÃ­ <b>"Há»— Trá»£ + CÃ´ng Äoáº¡n Láº»"</b>'));

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

