// tests/x2-ep-van.test.mjs â€” Kiá»ƒm thá»­ THáºº "Ã‰P VÃN" (launcher tab CÃ´ng Äoáº¡n) sau khi
// Dá»œI module Sáº£n LÆ°á»£ng Ã‰p VÃ¡n tá»« tab riÃªng vÃ o tháº»:
//   â€¢ Tab Ã‰p VÃ¡n Ä‘Ã£ bá»‹ XÃ“A (nav desktop + nav Ä‘iá»‡n thoáº¡i + section press-view).
//   â€¢ Tháº» Ã‰p VÃ¡n cÃ³ 2 KHUNG: "LÆ°á»£t Ã‰p" (tháº» NGÃ€Y: NgÃ y Â· NgÆ°á»i Ã©p tá»± Ä‘á»™ng Â·
//     Giá» HC/TC Â· CÃ´ng suáº¥t mÂ³/ngÃ y [Â· mÂ³/h + Hiá»‡u suáº¥t khi cÃ³ Ä‘á»‹nh má»©c] Â·
//     ThÃ nh pháº©m) vÃ  "Biá»ƒu Äá»“" (biá»ƒu Ä‘á»“ thá»ƒ tÃ­ch vÃ¡n Ã©p theo ngÃ y).
//   â€¢ Äá»‹nh má»©c cÃ´ng suáº¥t Ã©p vÃ¡n theo thÃ¡ng (mÂ³/h) + ná»‘i storage/cloud/history.
//   â€¢ Báº£ng "BÃ o Tinh â†” ÄÃ£ Ã‰p" Ä‘Ã£ Gá»  Háº²N (30/09/2026 â€” khÃ´ng dÃ¹ng Ä‘áº¿n).
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-bao-tinh.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


const { state, STORAGE_KEY_X2_EP_VAN_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// â”€â”€â”€ Dá»¯ liá»‡u máº«u: 1 lÆ°á»£t Ã©p (vÃ¡n thÃ´ 2000Ã—600Ã—20 Ã— 50 táº¥m = 1,2 mÂ³) â”€â”€â”€
const D = '2026-09-21';
state.pressRecords = [{
  id: 'pr-1', date: D, year: 2026, week: '2026-W39',
  productId: 'prod-1', productName: 'VÃ¡n 2000x600x20', fpDim: '2000x600x20',
  finishedQty: 50, glue: 30, additive: 2.5,
  vanTho: [{ vtDim: '2000x600x20', vtQty: 50 }],
  sticks: [{ nanKey: '1250x18x7', sticks: 1000 }],
  createdAt: '2026-09-21T02:00:00.000Z'
}];
state.pressNotes = [];
state.materialRates = [{ id: 'prod-1', product: 'VÃ¡n 2000x600x20', rate: 1 }];
state.x2EpVanRates = {};
state.xuong2BaoTinhRecords = [];
state.batches = [];
state.planningItems = [];
// NhÃ¢n Sá»±: vá»‹ trÃ­ "Ã‰p" (khá»›p) + "BÃ o tinh" (KHÃ”NG khá»›p) + cháº¥m cÃ´ng Ä‘i lÃ m
state.hrEmployees = [
  { id: 'empEp', name: 'Nguyá»…n VÄƒn Ã‰p', status: 'active', department: 'XÆ°á»Ÿng 2' },
  { id: 'empKhac', name: 'Tráº§n VÄƒn KhÃ¡c', status: 'active', department: 'XÆ°á»Ÿng 2' }
];
state.hrPositions = [
  { id: 'p-ep', name: 'Ã‰p', department: 'XÆ°á»Ÿng 2' },
  { id: 'p-btinh', name: 'BÃ o tinh', department: 'XÆ°á»Ÿng 2' }
];
state.hrAssignments = [
  { id: 'asg-1', date: D, department: 'XÆ°á»Ÿng 2', positionId: 'p-ep', employeeId: 'empEp', start: '07:00', end: '12:00' },
  { id: 'asg-2', date: D, department: 'XÆ°á»Ÿng 2', positionId: 'p-ep', employeeId: 'empEp', start: '13:00', end: '' },
  { id: 'asg-3', date: D, department: 'XÆ°á»Ÿng 2', positionId: 'p-btinh', employeeId: 'empKhac', start: '07:00', end: '12:00' }
];
state.hrAttendance = [
  { id: 'att-1', date: D, employeeId: 'empEp', status: 'work', positions: ['p-ep'] },
  { id: 'att-2', date: D, employeeId: 'empKhac', status: 'work', positions: ['p-btinh'] }
];
state.hrLeaves = [];
state.hrWorkCalendar = {};

const x2 = await import('../js/xuong2.js');
const press = await import('../js/press.js');

// â”€â”€â”€ A. THáºº LAUNCHER + 2 KHUNG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.renderXuong2Cards();
check('THáºº: mini card Ã‰p VÃ¡n Ä‘áº¿m "1 lÆ°á»£t Â· 1,2 mÂ³" (KHÃ”NG cÃ²n "Sáº¯p cÃ³")',
  document.getElementById('x2-mini-count-ep-van').textContent === '1 lÆ°á»£t Â· 1,2 mÂ³' &&
  !document.getElementById('x2-mini-count-ep-van').classList.contains('x2-count-soon'));
// Khung Biá»ƒu Äá»“ trong index.html cÃ³ thuá»™c tÃ­nh `hidden` â€” stub DOM khÃ´ng Ä‘á»c HTML
// nÃªn Ä‘áº·t láº¡i Ä‘Ãºng tráº¡ng thÃ¡i ban Ä‘áº§u trÆ°á»›c khi má»Ÿ tháº»
document.getElementById('x2-epv-frame-chart').hidden = true;
document.getElementById('x2-epv-tab-list').classList.add('active');
check('THáºº: má»Ÿ tháº» Ã‰p VÃ¡n tráº£ vá» true + pop-up báº­t + tháº» khÃ´ng cÃ²n áº©n',
  x2.x2OpenCard('x2-ep-van-card') === true &&
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-ep-van-card').classList.contains('x2-card-hidden'));
check('KHUNG: máº·c Ä‘á»‹nh má»Ÿ khung "LÆ°á»£t Ã‰p" â€” khung Biá»ƒu Äá»“ áº©n',
  document.getElementById('x2-epv-frame-list').hidden === false &&
  document.getElementById('x2-epv-frame-chart').hidden === true);
press.switchX2EpVanFrame('chart');
check('KHUNG: báº¥m tab "Biá»ƒu Äá»“" â†’ khung biá»ƒu Ä‘á»“ hiá»‡n, khung lÆ°á»£t Ã©p áº©n, tab Ä‘á»•i active',
  document.getElementById('x2-epv-frame-chart').hidden === false &&
  document.getElementById('x2-epv-frame-list').hidden === true &&
  document.getElementById('x2-epv-tab-chart').classList.contains('active') &&
  !document.getElementById('x2-epv-tab-list').classList.contains('active'));
press.switchX2EpVanFrame('list');
check('KHUNG: quay láº¡i tab "LÆ°á»£t Ã‰p" â†’ Ä‘Ãºng tráº¡ng thÃ¡i ban Ä‘áº§u + tab LÆ°á»£t Ã‰p active',
  document.getElementById('x2-epv-frame-list').hidden === false &&
  document.getElementById('x2-epv-frame-chart').hidden === true &&
  document.getElementById('x2-epv-tab-list').classList.contains('active'));

// â”€â”€â”€ B. KHUNG 1: THáºº NGÃ€Y (ngÆ°á»i Ã©p Â· giá» HC/TC Â· cÃ´ng suáº¥t mÂ³/ngÃ y) â”€â”€
const snap = press.epVanSnapshotOf(D);
check('Tá»° Äá»˜NG: giá» HC/TC láº¥y tá»« Báº£ng bá»‘ trÃ­ vá»‹ trÃ­ "Ã‰p" (khÃ´ng láº¥y "BÃ o tinh")',
  snap.hours > 0 && snap.hoursHC > 0 && snap.hoursTC === 0 &&
  snap.workers.length === 1 && snap.workers[0].name === 'Nguyá»…n VÄƒn Ã‰p');
check('Tá»° Äá»˜NG: nguá»“n giá» cá»§a Ã‰p VÃ¡n chá»‰ gá»“m vá»‹ trÃ­ "Ã‰p" (posRows) â€” phá»¥c vá»¥ tooltip',
  Array.isArray(snap.posRows) && snap.posRows.length === 2 && snap.posRows.every(r => r.name === 'Ã‰p' && r.employee === 'Nguyá»…n VÄƒn Ã‰p'));
{
  // ThÃªm bá»‘ trÃ­ á»Ÿ vá»‹ trÃ­ "Chá»n thanh Bullig" cÃ¹ng ngÃ y â†’ Ã‰p VÃ¡n PHáº¢I bá» qua (giá» khÃ´ng Ä‘á»•i)
  state.hrPositions.push({ id: 'p-bull', name: 'Chá»n thanh Bullig', department: 'XÆ°á»Ÿng 2' });
  state.hrAssignments.push({ id: 'asg-4', date: D, department: 'XÆ°á»Ÿng 2', positionId: 'p-bull', employeeId: 'empKhac', start: '13:00', end: '' });
  const snapBull = press.epVanSnapshotOf(D);
  check('Tá»° Äá»˜NG: Ã‰P VÃN KHÃ”NG cá»™ng thá»i gian cá»§a cÃ´ng Ä‘oáº¡n Chá»n thanh Bullig (giá» giá»¯ nguyÃªn, ngÆ°á»i Ã©p khÃ´ng Ä‘á»•i)',
    Math.abs(snapBull.hours - snap.hours) < 0.001 && snapBull.hoursHC === snap.hoursHC &&
    snapBull.posRows.length === 2 && snapBull.workers.length === 1 &&
    snapBull.workers[0].name === 'Nguyá»…n VÄƒn Ã‰p');
  // Vá»‹ trÃ­ gá»™p tÃªn cáº£ 2 cÃ´ng Ä‘oáº¡n cÅ©ng KHÃ”NG Ä‘Æ°á»£c tÃ­nh vÃ o Ã‰p VÃ¡n
  state.hrPositions.push({ id: 'p-mix', name: 'Ã‰p vÃ¡n + Chá»n thanh Bullig', department: 'XÆ°á»Ÿng 2' });
  state.hrAssignments.push({ id: 'asg-5', date: D, department: 'XÆ°á»Ÿng 2', positionId: 'p-mix', employeeId: 'empKhac', start: '07:00', end: '11:30' });
  const snapMix = press.epVanSnapshotOf(D);
  check('Tá»° Äá»˜NG: vá»‹ trÃ­ gá»™p "Ã‰p vÃ¡n + Chá»n thanh Bullig" cÅ©ng bá»‹ loáº¡i khá»i giá» Ã‰p VÃ¡n',
    Math.abs(snapMix.hours - snap.hours) < 0.001);
  state.hrAssignments.pop(); state.hrAssignments.pop();
  state.hrPositions.pop(); state.hrPositions.pop();
}
check('MÂ³: thá»ƒ tÃ­ch 1 lÆ°á»£t = vÃ¡n thÃ´ táº¡o ra (2000Ã—600Ã—20 Ã— 50 = 1,2 mÂ³)',
  Math.round(press.pressRecordVolumeOf(state.pressRecords[0]) * 100) / 100 === 1.2);
const dayHtml = document.getElementById('x2-epv-day-cards').innerHTML;
check('THáºº NGÃ€Y: cÃ³ NgÃ y 21/09/26 Â· NgÆ°á»i Ã©p Â· Giá» HC/TC Â· CÃ´ng suáº¥t mÂ³/ngÃ y Â· ThÃ nh pháº©m',
  dayHtml.includes('21/09/26') && dayHtml.includes('Nguyá»…n VÄƒn Ã‰p') &&
  dayHtml.includes('h HC') && dayHtml.includes('CÃ´ng suáº¥t:') && dayHtml.includes('1,2 mÂ³/ngÃ y') &&
  dayHtml.includes('50</strong> táº¥m'));
check('THáºº NGÃ€Y: tá»«ng lÆ°á»£t Ã©p 1 dÃ²ng cÃ³ nÃºt Sá»­a/XÃ³a (quyá»n press) + keo Â· phá»¥ gia Â· mÂ³',
  dayHtml.includes('x2-epv-row') && dayHtml.includes("app.editPressRecord('pr-1')") &&
  dayHtml.includes("app.deletePressRecord('pr-1')") && dayHtml.includes('data-perm="press"') &&
  dayHtml.includes('30.00') && dayHtml.includes('2.50'));
check('THáºº NGÃ€Y: CHÆ¯A Ä‘áº·t Ä‘á»‹nh má»©c â†’ KHÃ”NG hiá»‡n mÂ³/h vÃ  Hiá»‡u suáº¥t',
  !dayHtml.includes('mÂ³/h:') && !dayHtml.includes('Hiá»‡u suáº¥t'));

// â”€â”€â”€ C. Äá»ŠNH Má»¨C CÃ”NG SUáº¤T Ã‰P VÃN (mÂ³/h) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
press.renderX2EpVanRateBar();
check('Äá»ŠNH Má»¨C: chÆ°a Ä‘áº·t â†’ chip bÃ¡o "ChÆ°a Ä‘áº·t Ä‘á»‹nh má»©c"',
  document.getElementById('x2-epv-rate-chips').innerHTML.includes('ChÆ°a Ä‘áº·t Ä‘á»‹nh má»©c'));
document.getElementById('x2-epv-rate-month').value = '2026-09';
document.getElementById('x2-epv-rate-value').value = '2';
press.handleX2EpVanRateSave();
check('Äá»ŠNH Má»¨C: lÆ°u thÃ¡ng 9 = 2 mÂ³/h â†’ state + localStorage + chip "T9/26 = 2 mÂ³/h"',
  state.x2EpVanRates['2026-09'] === 2 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_EP_VAN_RATE) || '{}')['2026-09'] === 2 &&
  document.getElementById('x2-epv-rate-chips').innerHTML.includes('T9/26 = 2 mÂ³/h'));
const dayHtml2 = document.getElementById('x2-epv-day-cards').innerHTML;
check('Äá»ŠNH Má»¨C: CÃ“ Ä‘á»‹nh má»©c â†’ tháº» ngÃ y hiá»‡n thÃªm mÂ³/h + Hiá»‡u suáº¥t + nhÃ£n ÄM',
  dayHtml2.includes('mÂ³/h:') && dayHtml2.includes('Hiá»‡u suáº¥t') && dayHtml2.includes('ÄM:'));
check('Äá»ŠNH Má»¨C: mÂ³/h = thá»ƒ tÃ­ch Ã· giá» bá»‘ trÃ­ Â· hiá»‡u suáº¥t = mÂ³/h Ã· Ä‘á»‹nh má»©c (Ä‘Ãºng sá»‘)',
  (function () {
    const raw = 1.2 / snap.hours;                                  // mÂ³/h chÆ°a lÃ m trÃ²n
    const shown = raw.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    const eff = ((raw / 2) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
    return dayHtml2.includes(shown) && dayHtml2.includes(eff + '%');
  })());
check('Äá»ŠNH Má»¨C: cháº·n lÆ°u khi Ä‘á»ƒ trá»‘ng/0',
  (function () {
    document.getElementById('x2-epv-rate-value').value = '0';
    press.handleX2EpVanRateSave();
    return state.x2EpVanRates['2026-09'] === 2;
  })());


// â”€â”€â”€ D. Báº¢NG "BÃ€O TINH â†” ÄÃƒ Ã‰P" ÄÃƒ Gá»  Háº²N (khÃ´ng dÃ¹ng Ä‘áº¿n) â”€â”€â”€
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pressSrc = fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8');
const eventsSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const xuong2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
check('Gá»  Báº¢NG: index.html khÃ´ng cÃ²n #baotinh-eff-card Â· #baotinh-eff-table Â· #bt-year-filter',
  !idxHtml.includes('id="baotinh-eff-card"') && !idxHtml.includes('id="baotinh-eff-table"') &&
  !idxHtml.includes('id="bt-year-filter"') && !idxHtml.includes('BÃ o Tinh â†” ÄÃ£ Ã‰p'));
check('Gá»  Báº¢NG: press.js khÃ´ng cÃ²n hÃ m/export renderBaoTinhEffTable (hÃ m dá»¯ liá»‡u compute váº«n giá»¯)',
  !pressSrc.includes('renderBaoTinhEffTable') && pressSrc.includes('computeBaoTinhEfficiencyByWeek'));
check('Gá»  Báº¢NG: events.js + xuong2.js khÃ´ng cÃ²n import/gá»i renderBaoTinhEffTable',
  !eventsSrc.includes('renderBaoTinhEffTable') && !xuong2Src.includes('renderBaoTinhEffTable'));

// â”€â”€â”€ E. TAB Ã‰P VÃN ÄÃƒ XÃ“A + Cáº¤U TRÃšC Má»šI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('XÃ“A TAB: index.html khÃ´ng cÃ²n section press-view, nÃºt nav desktop (#nav-press) vÃ  nav Ä‘iá»‡n thoáº¡i',
  !idxHtml.includes('id="press-view"') && !idxHtml.includes('id="nav-press"') &&
  !idxHtml.includes('data-target="press-view"'));
check('Cáº¤U TRÃšC: tháº» Ã‰p VÃ¡n cÃ³ 2 khung + 2 tab chuyá»ƒn khung + Ä‘á»‹nh má»©c mÂ³/h + tháº» ngÃ y',
  idxHtml.includes('id="x2-epv-frame-list"') && idxHtml.includes('id="x2-epv-frame-chart"') &&
  idxHtml.includes('id="x2-epv-tab-list"') && idxHtml.includes('id="x2-epv-tab-chart"') &&
  idxHtml.includes('id="x2-epv-day-cards"') && idxHtml.includes('id="x2-epv-rate-month"') &&
  idxHtml.includes('id="x2-epv-rate-value"') && idxHtml.includes('id="btn-x2-epv-rate-save"'));
check('Cáº¤U TRÃšC: biá»ƒu Ä‘á»“ + nÃºt ThÃªm LÆ°á»£t Ã‰p náº±m trong tháº» Ã‰p VÃ¡n Â· báº£ng "Danh SÃ¡ch LÆ°á»£t Ã‰p" Ä‘Ã£ gá»¡',
  idxHtml.includes('id="press-chart"') && !idxHtml.includes('id="press-table-body"') &&
  !idxHtml.includes('press-table-card') && !idxHtml.includes('btn-toggle-press-table') &&
  idxHtml.includes('id="press-year-filter"') && idxHtml.includes('id="btn-add-press-2"') &&
  idxHtml.includes('id="btn-add-press-note-2"'));
// Footer biá»ƒu Ä‘á»“ Ä‘Ã£ gá»¡: bá» nÃºt "ThÃªm LÆ°á»£t Ã‰p"/"Ghi ChÃº Giáº£i TrÃ¬nh" (Ä‘Ã£ cÃ³ khung LÆ°á»£t Ã‰p),
// dá»i "Hiá»‡n Ghi ChÃº" lÃªn thanh tiÃªu Ä‘á», bá» chÃº thÃ­ch "Vuá»‘t trÃ¡i/pháº£iâ€¦"
check('BIá»‚U Äá»’: footer Ä‘Ã£ gá»¡ (khÃ´ng cÃ²n press-chart-footer Â· nÃºt btn-add-press/note Â· chÃº thÃ­ch vuá»‘t)',
  !idxHtml.includes('press-chart-footer') && !idxHtml.includes('id="btn-add-press"') &&
  !idxHtml.includes('id="btn-add-press-note"') && !idxHtml.includes('Vuá»‘t trÃ¡i/pháº£i trÃªn biá»ƒu Ä‘á»“'));
check('BIá»‚U Äá»’: "Hiá»‡n Ghi ChÃº" á»Ÿ THANH TIÃŠU Äá»€ (trÆ°á»›c canvas) + mÅ©i tÃªn â€¹ â€º cáº¡nh Ã´ Tuáº§n',
  idxHtml.includes('id="btn-toggle-press-notes"') &&
  idxHtml.indexOf('id="btn-toggle-press-notes"') < idxHtml.indexOf('id="press-chart"') &&
  idxHtml.includes('id="press-week-prev"') && idxHtml.includes('id="press-week-next"') &&
  idxHtml.indexOf('id="press-week-prev"') < idxHtml.indexOf('id="press-week-filter"') &&
  idxHtml.indexOf('id="press-week-filter"') < idxHtml.indexOf('id="press-week-next"'));
const jsPress = fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC: press.js KHÃ”NG cÃ²n renderPressView/renderPressTable Â· main.js khÃ´ng gá»i hÃ m nÃ y',
  !/function renderPressView/.test(jsPress) && !/function renderPressTable/.test(jsPress) &&
  !/renderPressView/.test(jsMain) && jsMain.includes('loadX2EpVanRates'));
check('Cáº¤U TRÃšC: events.js ná»‘i tab chuyá»ƒn khung + nÃºt thÃªm lÆ°á»£t + lÆ°u Ä‘á»‹nh má»©c',
  (function () {
    const jsE = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
    return jsE.includes("safeOn('x2-epv-tab-list'") && jsE.includes("safeOn('x2-epv-tab-chart'") &&
      jsE.includes("safeOn('btn-add-press-2'") && jsE.includes("safeOn('btn-x2-epv-rate-save'") &&
      jsE.includes("safeOn('x2-epv-rate-month'");
  })());
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (styles.css): khá»‘i THáºº Ã‰P VÃN 2 KHUNG (tab active Â· khung áº©n Â· dÃ²ng lÆ°á»£t Ã©p)',
  cssHtml.includes('THáºº Ã‰P VÃN (launcher tab CÃ´ng Äoáº¡n) â€” 2 KHUNG') &&
  cssHtml.includes('.x2-epv-tab.active') && cssHtml.includes('.x2-epv-frame[hidden]') &&
  cssHtml.includes('.x2-epv-row-main'));
check('Cáº¤U TRÃšC: Ä‘á»‹nh má»©c Ã©p vÃ¡n ná»‘i storage/cloud/history (x2EpVanRates)',
  (function () {
    const st = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
    const cl = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
    const hi = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
    return st.includes('restoreX2EpVanRates') && st.includes('x2EpVanRates') &&
      cl.includes('x2EpVanRates') && cl.includes('STORAGE_KEY_X2_EP_VAN_RATE') &&
      hi.includes('x2EpVanRates');
  })());
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (sw.js): Ä‘Ã£ tÄƒng CACHE_NAME v486', /nha-may-ngoc-son-v486/.test(swJs));

// â•â•â• E2. MÅ¨I Táº¦N â€¹ â€º Cáº NH Ã” TUáº¦N â€” nháº£y nhanh cáº£ tuáº§n (bao vÃ²ng) â•â•â•
state.pressRecords.push({
  id: 'pr-2', date: '2026-09-14', year: 2026, week: '2026-W38',
  productId: 'prod-1', productName: 'VÃ¡n 2000x600x20', fpDim: '2000x600x20',
  finishedQty: 20, glue: 12, additive: 1,
  vanTho: [{ vtDim: '2000x600x20', vtQty: 20 }], sticks: [],
  createdAt: '2026-09-14T02:00:00.000Z'
});
state.pressYearFilter = 'all';
state.pressWeekFilter = 'all';
press.populatePressWeekFilter();
press.shiftPressWeekFilter(1);
check('MÅ¨I TUáº¦N: tá»« "Táº¥t cáº£" báº¥m â€º â†’ tuáº§n nhá» nháº¥t cÃ³ lÆ°á»£t Ã©p (38)', state.pressWeekFilter === '38');
press.shiftPressWeekFilter(1);
check('MÅ¨I TUáº¦N: â€º tiáº¿p â†’ tuáº§n káº¿ (39)', state.pressWeekFilter === '39');
press.shiftPressWeekFilter(1);
check('MÅ¨I TUáº¦N: â€º á»Ÿ tuáº§n cuá»‘i â†’ bao vÃ²ng vá» tuáº§n 38', state.pressWeekFilter === '38');
press.shiftPressWeekFilter(-1);
check('MÅ¨I TUáº¦N: â€¹ á»Ÿ tuáº§n Ä‘áº§u â†’ bao vÃ²ng vá» tuáº§n 39', state.pressWeekFilter === '39');
check('MÅ¨I TUáº¦N: Ã´ Tuáº§n tá»± Ä‘á»“ng bá»™ giÃ¡ trá»‹ má»›i (select.value = 39)',
  document.getElementById('press-week-filter').value === '39');
check('MÅ¨I TUáº¦N: tháº» ngÃ y chá»‰ cÃ²n tuáº§n Ä‘ang chá»n (21/09 â‰  14/09)',
  document.getElementById('x2-epv-day-cards').innerHTML.includes('21/09/26') &&
  !document.getElementById('x2-epv-day-cards').innerHTML.includes('14/09/26'));
check('MÅ¨I TUáº¦N: events.js ná»‘i 2 nÃºt â€¹ â€º cáº¡nh Ã´ Tuáº§n',
  (function () {
    const jsE = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
    return jsE.includes("safeOn('press-week-prev'") && jsE.includes("safeOn('press-week-next'") &&
      !jsE.includes("safeOn('btn-add-press'") && !jsE.includes("safeOn('btn-add-press-note'") &&
      jsE.includes("safeOn('btn-toggle-press-notes'");
  })());
state.pressWeekFilter = 'all'; // tráº£ bá»™ lá»c vá» máº·c Ä‘á»‹nh cho cÃ¡c section sau
press.renderX2EpVanDayCards();

// â•â•â• F. BÆ¯á»šC 4/5: NÃšT DÃ™NG CHUNG (Lá»ŠCH Sá»¬ theo tháº» + XUáº¤T EXCEL theo tháº») â•â•â•
check('DÃ™NG CHUNG: tháº» Ä‘ang má»Ÿ â†’ vÃ¹ng dá»¯ liá»‡u + nguá»“n xuáº¥t Excel tÆ°Æ¡ng á»©ng',
  x2.x2OpenCardId() === 'x2-ep-van-card' &&
  x2.x2OpenCardHistoryDomain() === 'pressRecords' &&
  x2.x2OpenCardExportSource() === 'epvan');
x2.x2CloseOpenCard();
check('DÃ™NG CHUNG: Ä‘Ã³ng tháº» â†’ khÃ´ng cÃ²n tháº» Ä‘ang má»Ÿ (vÃ¹ng dá»¯ liá»‡u máº·c Ä‘á»‹nh rá»—ng)',
  x2.x2OpenCardId() === null && x2.x2OpenCardHistoryDomain() === '' &&
  state.x2OpenCardId === null);
const mapCn = x2.X2_CARD_HISTORY_DOMAIN, mapEx = x2.X2_CARD_EXPORT_SOURCE;
// GIAI ÄOáº N 2 (05/10/2026): 8 cÃ´ng Ä‘oáº¡n XÆ°á»Ÿng 1 Ä‘Ã£ thÃªm vÃ o báº£n Ä‘á»“ VÃ™NG Dá»® LIá»†U;
// Kho Nan XÆ°á»Ÿng 1 dÃ¹ng chung dá»¯ liá»‡u Lá»c Thanh/BÃ³ XÃ´.
// (nÃºt "Lá»‹ch Sá»­" cá»§a tháº» X1 tá»± lá»c Ä‘Ãºng vÃ¹ng) + Cáº¯t VÃ¡n Â· BÃ o VÃ¡n (09/10/2026)
// + Há»— Trá»£ + CÃ´ng Äoáº¡n Láº» (10/10/2026).
// 17/10/2026: NGUá»’N XUáº¤T EXCEL cá»§a 8 tháº» X1 ÄÃƒ KHAI BÃO (trÆ°á»›c Ä‘Ã¢y rÆ¡i vá» 'batch'
// â‡’ báº¥m "Xuáº¥t Dá»¯ Liá»‡u" trÃªn tháº» XÆ°á»Ÿng 1 láº¡i xuáº¥t LÃ´ nan).
check('DÃ™NG CHUNG: tháº» Xá»­ lÃ½ lá»—i thay 2 tháº» cÅ©, báº£n Ä‘á»“ giá»¯ Ä‘á»§ vÃ¹ng dá»¯ liá»‡u',
  Object.keys(mapCn).length === 25 && Object.keys(mapEx).length === 25 &&
  mapCn['x2-bo-luong-card'] === 'xuong2BoluongRecords' && mapEx['x2-bo-luong-card'] === 'boluong' &&
  mapCn['x2-kho-card'] === 'khoNotes' && mapEx['x2-kho-card'] === 'kho' &&
  mapCn['x2-bao-tinh-card'] === 'xuong2BaoTinhRecords' && mapEx['x2-bao-tinh-card'] === 'baotinh' &&
  mapCn['x2-bullig-card'] === 'xuong2BulligRecords' && mapEx['x2-bullig-card'] === 'bullig' &&
  mapCn['x2-cat-van-card'] === 'xuong2CatVanRecords' && mapEx['x2-cat-van-card'] === 'catvan' &&
  mapCn['x2-bao-van-card'] === 'xuong2BaoVanRecords' && mapEx['x2-bao-van-card'] === 'baovan' &&
  mapCn['x2-ho-tro-card'] === 'xuong2HoTroRecords' && mapEx['x2-ho-tro-card'] === 'hotro' &&
  mapCn['x2-than-hoa-card'] === 'batches' && mapEx['x2-than-hoa-card'] === 'batch' &&
  mapCn['x1-kho-card'] === 'xuong1LocThanhRecords' && mapEx['x1-kho-card'] === 'x1locthanh' &&
  mapEx['x1-cat-ong-card'] === 'x1catong' && mapEx['x1-say-sinh-card'] === 'x1saysinh' &&
  mapEx['x1-boc-card'] === 'x1boc' && mapEx['x1-loc-ong-card'] === 'x1locong' &&
  mapEx['x1-cat-mat-card'] === 'x1catmat' && mapEx['x1-bo-card'] === 'x1bo' &&
  mapEx['x1-phoi-say-card'] === 'x1phoisay' && mapEx['x1-loc-thanh-card'] === 'x1locthanh' &&
  mapCn['x1-nan-plan-card'] === 'x1NanPlans' && mapEx['x1-nan-plan-card'] === 'x1nanplan');
check('DÃ™NG CHUNG: 8 cÃ´ng Ä‘oáº¡n XÆ°á»Ÿng 1 vÃ  Kho Nan cÃ³ vÃ¹ng dá»¯ liá»‡u Ä‘Ãºng',
  ['x1-cat-ong-card', 'x1-say-sinh-card', 'x1-boc-card',
   'x1-loc-ong-card', 'x1-cat-mat-card', 'x1-bo-card',
   'x1-phoi-say-card', 'x1-loc-thanh-card']
    .every(id => !!mapCn[id]) &&
  mapCn['x1-loc-ong-card'] === 'xuong1LocOngRecords' &&
  mapCn['x1-loc-thanh-card'] === 'xuong1LocThanhRecords');

// Lá»‹ch sá»­: modal cÃ³ bá»™ lá»c VÃ™NG Dá»® LIá»†U (nÃºt dÃ¹ng chung má»Ÿ Ä‘Ãºng vÃ¹ng cá»§a tháº»)
const history = await import('../js/history.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true, fullname: 'Quáº£n trá»‹ viÃªn' };
state.history = [
  { id: 'h1', ts: Date.now(), user: 'Quáº£n trá»‹ viÃªn', action: 'add', tab: 'kanban', domain: 'pressRecords', domainLabel: 'LÆ°á»£t Ã©p vÃ¡n', detail: 'ThÃªm 1 lÆ°á»£t Ã©p' },
  { id: 'h2', ts: Date.now() - 1000, user: 'Quáº£n trá»‹ viÃªn', action: 'add', tab: 'kanban', domain: 'xuong2BaoTinhRecords', domainLabel: 'BÃ o tinh XÆ°á»Ÿng 2', detail: 'ThÃªm 1 lÆ°á»£t bÃ o tinh' }
];
history.openHistoryModal('kanban', 'pressRecords');
const histHtml = document.getElementById('history-list').innerHTML;
check('Lá»ŠCH Sá»¬: má»Ÿ theo vÃ¹ng pressRecords â†’ chá»‰ hiá»‡n dÃ²ng cá»§a vÃ¹ng Ä‘Ã³',
  histHtml.includes('LÆ°á»£t Ã©p vÃ¡n') && !histHtml.includes('ThÃªm 1 lÆ°á»£t bÃ o tinh'));
check('Lá»ŠCH Sá»¬: cÃ³ dropdown VÃ™NG Dá»® LIá»†U (#history-domain-filter) + tiÃªu Ä‘á» ghi rÃµ vÃ¹ng',
  idxHtml.includes('id="history-domain-filter"') &&
  document.getElementById('history-modal-title').innerHTML.includes('LÆ°á»£t Ã©p vÃ¡n'));


// Xuáº¥t Excel XÆ°á»Ÿng 2: form tá»± chá»n nguá»“n theo tháº» + dá»±ng Ä‘Æ°á»£c dá»¯ liá»‡u
const xlsx = await import('../js/export-xlsx.js');
check('XUáº¤T X2: modal cÃ³ dropdown nguá»“n + khoáº£ng ngÃ y + nÃºt dÃ¹ng chung (index.html)',
  idxHtml.includes('id="modal-export-x2"') && idxHtml.includes('id="export-x2-source"') &&
  idxHtml.includes('id="export-x2-from"') && idxHtml.includes('id="export-x2-to"') &&
  idxHtml.includes('id="btn-export-x2"'));
// Dá»¯ liá»‡u máº«u 2 nguá»“n: LÃ´ nan + BÃ o tinh
state.batches = [{ id: 'b1', code: '260921-01', stage: 'say2', location: 'LS3', length: 1250, width: 18, thickness: 7, quantity: 500, bambooType: 'A1', useFor: 'VÃ¡n', createdAt: '2026-09-21T02:00:00.000Z', say2Date: '2026-09-21' }];
state.xuong2BaoTinhRecords = [{
  id: 'bt1', date: D, week: '2026-W39', kind: 'tinh',
  sources: [{ batchId: 'b1', code: '260921-01', location: 'LS3', dims: [1250, 18, 7], qty: 500 }],
  batchId: 'b1', batchCode: '260921-01', batchLocation: 'LS3', batchDims: [1250, 18, 7], batchQty: 500,
  inQty: 500, inSizeKey: '1250Ã—18Ã—7', inDims: [], manualRowId: '',
  outDims: [1245, 17, 6], outSizeKey: '1245Ã—17Ã—6', unitVol: 0.0127,
  qtyOk: 480, qtyErr: 20, qtyIn: 500, volumeOk: 6.1,
  worker: '', workTime: '', workHours: 0, workHoursHC: 0, workHoursTC: 0,
  createdAt: '2026-09-21T03:00:00.000Z'
}];
document.getElementById('export-x2-from').value = '';
document.getElementById('export-x2-to').value = '';
const dBatch = xlsx.buildX2ExportData('batch');
check('XUáº¤T X2 (LÃ´ nan): cÃ³ tiÃªu Ä‘á» + hÃ ng cá»™t + dÃ²ng dá»¯ liá»‡u + tÃªn file .xlsx',
  !!dBatch && dBatch.aoa[0][0].includes('LÃ” NAN') && dBatch.aoa[4][0] === 'Stt' &&
  dBatch.aoa.length >= 6 && /Xuong2_batch_.*\.xlsx/.test(dBatch.filename));
const dBtinh = xlsx.buildX2ExportData('baotinh');
check('XUáº¤T X2 (BÃ o tinh): cá»™t cÃ³ "K.ThÆ°á»›c Sau BÃ o" + "Thanh Lá»—i" + dÃ²ng tá»•ng káº¿t Ä‘Ãºng sá»‘',
  !!dBtinh && dBtinh.aoa[4].join('|').includes('K.ThÆ°á»›c Sau BÃ o') &&
  dBtinh.aoa[4].join('|').includes('Thanh Lá»—i') &&
  dBtinh.aoa[2][0].includes('Tá»•ng Ä‘áº¡t 480') && /Xuong2_baotinh_.*\.xlsx/.test(dBtinh.filename));
check('XUáº¤T X2: lá»c theo khoáº£ng ngÃ y â€” ngoÃ i khoáº£ng thÃ¬ khÃ´ng cÃ³ dá»¯ liá»‡u (tráº£ null)',
  (function () {
    document.getElementById('export-x2-to').value = '2026-09-01';
    const d = xlsx.buildX2ExportData('baotinh');
    document.getElementById('export-x2-to').value = '';
    return d === null;
  })());
check('XUáº¤T X2: chá»n nguá»“n "Ã‰p VÃ¡n" â†’ tá»± chuyá»ƒn sang form xuáº¥t Ã‰p VÃ¡n chuyÃªn sÃ¢u',
  (function () {
    xlsx.openX2ExportModal('epvan');
    const wasOpen = document.getElementById('modal-export-x2').classList.contains('show');
    document.getElementById('export-x2-source').value = 'epvan';
    xlsx.handleX2ExportSubmit({ preventDefault(){} });
    return wasOpen && !document.getElementById('modal-export-x2').classList.contains('show') &&
      document.getElementById('modal-export-press').classList.contains('show');
  })());
check('XUáº¤T X2: má»Ÿ form theo tháº» â†’ tá»± chá»n Ä‘Ãºng nguá»“n (BÃ o Tinh â†’ baotinh) + hiá»‡n modal',
  (function () {
    document.getElementById('modal-export-x2').classList.remove('show');
    xlsx.openX2ExportModal('baotinh');
    return document.getElementById('export-x2-source').value === 'baotinh' &&
      document.getElementById('modal-export-x2').classList.contains('show');
  })());
check('Cáº¤U TRÃšC: nÃºt dÃ¹ng chung Ä‘Ã£ ná»‘i á»Ÿ events.js + Ä‘Ã£ bá» 2 nÃºt cÅ© trong tháº» Ã‰p VÃ¡n',
  (function () {
    const jsE = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
    return jsE.includes("safeOn('btn-export-x2'") && jsE.includes("safeOn('btn-history-x2'") &&
      jsE.includes("safeOn('history-domain-filter'") && jsE.includes("safeOn('x2-export-form'") &&
      !jsE.includes("safeOn('btn-open-export-press'") && !jsE.includes("safeOn('btn-history-press'") &&
      !idxHtml.includes('id="btn-open-export-press"') && !idxHtml.includes('id="btn-history-press"');
  })());
check('Cáº¤U TRÃšC: 2 nÃºt dÃ¹ng chung náº±m TRONG thanh tiÃªu Ä‘á» pop-up tháº» XÆ°á»Ÿng 2 (.x2-detail-actions)',
  (function () {
    const iShell = idxHtml.indexOf('id="x2-detail-overlay"');
    const iHeader = idxHtml.indexOf('x2-detail-actions', iShell);
    const iTitle = idxHtml.indexOf('id="x2-detail-title"', iShell);
    const iClose = idxHtml.indexOf('id="btn-close-x2-detail"', iShell);
    const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    return iTitle > iShell && iHeader > iTitle && iHeader < iClose &&
      idxHtml.includes('id="btn-history-x2"') && css.includes('.x2-detail-actions');
  })());


// â•â•â• G. NHÃƒN Dáº¢I TUáº¦N KÃˆM TRUNG BÃŒNH Ã‰P VÃN NGÃ€Y (Má»˜T DÃ’NG) â•â•â•â•â•â•â•
// Má»–I NGÃ€Y BIá»‚U Äá»’ Váº¼ 2 Cá»˜T RIÃŠNG BIá»†T:
//   â€¢ Cá»˜T TRÃI (stack 'ep')  = táº¥t cáº£ cÃ¡c loáº¡i trong ngÃ y (t1+t2+t3)
//   â€¢ Cá»˜T PHáº¢I (stack 'fp')  = thÃ nh pháº©m tÆ°Æ¡ng Ä‘Æ°Æ¡ng (fp)
// â†’ Trung bÃ¬nh pháº£i tÃ­nh theo Tá»ªNG Cá»˜T, KHÃ”NG cá»™ng gá»™p cáº£ 2 cá»™t.
//
// Tuáº§n 39/2026 (21â€“27/09) cÃ³ 3 ngÃ y Ã©p:
//   21/09: trÃ¡i = 2 (t1), pháº£i = 1 (fp)
//   22/09: trÃ¡i = 3 (t2), pháº£i = 0 (fp)
//   23/09: trÃ¡i = 2 (t3), pháº£i = 2 (fp)
// Máº«u sá»‘ = sá»‘ ngÃ y CÃ“ lÆ°á»£t Ã©p = 3
//   avgProduct (Cá»˜T PHáº¢I) = (1+0+2) Ã· 3 = 1
//   avgAll     (Cá»˜T TRÃI) = (2+3+2) Ã· 3 = 7/3 â‰ˆ 2,33
state.pressRecords = [
  { id: 'w1', date: '2026-09-21', year: 2026, week: '2026-W39', worker: 'A',
    sticks: [{ nanKey: '1000Ã—1000Ã—1000', sticks: 100 }],
    vanTho: [{ vtDim: '1000Ã—1000Ã—1000', vtQty: 2 }],
    productId: 'prod-1', productName: 'VÃ¡n 2000x600x20',
    fpDim: '1000Ã—1000Ã—1000', finishedQty: 1, glue: 10, additive: 1 },
  { id: 'w2', date: '2026-09-22', year: 2026, week: '2026-W39', worker: 'B',
    sticks: [{ nanKey: '1000Ã—1000Ã—1000', sticks: 100 }],
    vanTho: [{ vtDim: '1000Ã—1000Ã—1000', vtQty: 3 }],
    productId: '', productName: '' },
  { id: 'w3', date: '2026-09-23', year: 2026, week: '2026-W39', worker: 'C',
    sticks: [{ nanKey: '1000Ã—1000Ã—1000', sticks: 2 }],
    vanTho: [],
    productId: 'prod-1', productName: 'VÃ¡n 2000x600x20',
    fpDim: '1000Ã—1000Ã—1000', finishedQty: 2, glue: 8, additive: 0.5 }
];
state.pressYearFilter = 'all';
state.pressWeekFilter = 'all';
state.pressChartWinStart = null;
press.renderPressChart();
const epvCfg = state.pressChartInstance.config;
const wbOpts = epvCfg.options.plugins.pressWeekBands;
check('TB TUáº¦N: nháº­n Ä‘á»§ nhÃ³m tuáº§n + stats (week 39)',
  Array.isArray(wbOpts.groups) && wbOpts.groups.length === 1 &&
  wbOpts.groups[0].week === 39 && wbOpts.groups[0].i0 === 0 && wbOpts.groups[0].i1 === 2 &&
  !!wbOpts.stats);
check('TB TUáº¦N: máº«u sá»‘ = 3 ngÃ y CÃ“ lÆ°á»£t Ã©p (khÃ´ng chia 7)',
  wbOpts.stats[39] && wbOpts.stats[39].days === 3);
check('TB TUáº¦N: avgProduct = TB ngÃ y Cá»˜T PHáº¢I "ThÃ nh pháº©m tÆ°Æ¡ng Ä‘Æ°Æ¡ng" (1+0+2)/3 = 1 mÂ³',
  wbOpts.stats[39] && Math.abs(wbOpts.stats[39].avgProduct - 1) < 1e-9);
check('TB TUáº¦N: avgAll = TB ngÃ y Cá»˜T TRÃI "táº¥t cáº£ cÃ¡c loáº¡i" (2+3+2)/3 â‰ˆ 2,33 mÂ³',
  wbOpts.stats[39] && Math.abs(wbOpts.stats[39].avgAll - 7 / 3) < 1e-9);
check('TB TUáº¦N: 2 giÃ¡ trá»‹ KHÃ”NG bá»‹ cá»™ng gá»™p (sumAll = t1+t2+t3, KHÃ”NG chá»©a fp)',
  wbOpts.stats[39] && Math.abs(wbOpts.stats[39].avgAll - 7 / 3) < 1e-9 &&
  Math.abs(wbOpts.stats[39].avgAll - wbOpts.stats[39].avgProduct) > 1);
check('TB TUáº¦N: dataset váº«n váº½ Ä‘Ãºng theo cá»­a sá»• (4 dataset Â· 3 cá»™t)',
  epvCfg.data.datasets.length === 4 &&
  JSON.stringify(epvCfg.data.datasets[3].data) === JSON.stringify([1, 0, 2]) &&
  JSON.stringify(epvCfg.data.datasets[0].data) === JSON.stringify([2, 0, 0]));
// Gá»i trá»±c tiáº¿p plugin dáº£i tuáº§n vá»›i ctx giáº£ â€” báº¯t chá»¯ fillText THáº¬T trÃªn canvas.
// measureText bÃ¡m theo ctx.font (0,6 Ã— cá»¡ chá»¯/kÃ½ tá»±) Ä‘á»ƒ kiá»ƒm tra cáº£ nhÃ¡nh
// tá»± GIáº¢M Cá»  CHá»® khi dáº£i háº¹p.
function fakeChart(areaRight) {
  const drawn = [];
  return {
    drawn,
    height: 220,
    chartArea: { left: 50, right: areaRight, top: 0, bottom: 200 },
    scales: { x: { getPixelForValue: v => 100 + v * 100 } },
    ctx: {
      font: '600 10px system-ui',
      save() {}, restore() {}, beginPath() {}, fill() {}, rect() {}, roundRect() {},
      measureText(t) {
        const m = /(\d+(?:\.\d+)?)px/.exec(this.font || ''); // láº¥y Cá»  CHá»® trong "600 10px â€¦"
        const px = m ? parseFloat(m[1]) : 10;
        return { width: t.length * px * 0.6 };
      },
      fillText: t => drawn.push(t)
    }
  };
}
const weekBandPlugin = epvCfg.plugins.find(p => p && p.id === 'pressWeekBands');
check('TB TUáº¦N: plugin dáº£i tuáº§n cÃ³ trong danh sÃ¡ch plugin cá»§a biá»ƒu Ä‘á»“',
  !!weekBandPlugin && typeof weekBandPlugin.afterDraw === 'function');
const wide = fakeChart(500);
weekBandPlugin.afterDraw(wide, {}, wbOpts);
check('TB TUáº¦N: nhÃ£n 1 DÃ’NG "Tuáº§n 39 Â· TB ngÃ y 1/2,33 mÂ³" (Ä‘á»§ chá»¯ khi dáº£i rá»™ng)',
  wide.drawn.length === 1 && wide.drawn[0] === 'Tuáº§n 39 Â· TB ngÃ y 1/2,33 mÂ³');
check('TB TUáº¦N: khÃ´ng xuá»‘ng dÃ²ng (chá»‰ 1 láº§n fillText, khÃ´ng cÃ³ kÃ½ tá»± xuá»‘ng dÃ²ng)',
  wide.drawn.length === 1 && !/[\n\r]/.test(wide.drawn[0]));
const narrow = fakeChart(120);
weekBandPlugin.afterDraw(narrow, {}, wbOpts);
check('TB TUáº¦N: dáº£i háº¹p â†’ tá»± rÃºt gá»n nhÆ°ng VáºªN giá»¯ 2 sá»‘ trung bÃ¬nh',
  narrow.drawn.length === 1 && narrow.drawn[0].includes('/2,33') &&
  /^T?\d{2}/.test(narrow.drawn[0]) && !/[\n\r]/.test(narrow.drawn[0]));
check('TB TUáº¦N: press.js cÃ³ mÃ£ váº½ "TB ngÃ y" + 2 biáº¿n trung bÃ¬nh (cáº¥u trÃºc)',
  pressSrc.includes('TB ngÃ y') && pressSrc.includes('avgProduct') && pressSrc.includes('avgAll') &&
  pressSrc.includes('stats: weekStats'));


// â•â•â• G. FORM 5 Cá»¤M NÃšT Má»ž PANEL + HEADER ICON + TRÆ¯á»œNG Má»šI (06/10/2026) â•â•â•
const countId = (id) => (idxHtml.match(new RegExp('id="' + id + '"', 'g')) || []).length;
check('HEADER: 3 nÃºt icon chuyá»ƒn lÃªn (gá»™p tÃªn) â€” má»—i id chá»‰ xuáº¥t hiá»‡n ÄÃšNG 1 láº§n (khÃ´ng trÃ¹ng)',
  idxHtml.includes('class="x2-epv-head-btns"') &&
  countId('btn-add-press-2') === 1 && countId('btn-add-press-note-2') === 1 &&
  countId('btn-x2-epv-rate') === 1 &&
  idxHtml.includes('x2-epv-note-warn') &&
  !idxHtml.includes('btn-x2-epv-rate-head'));
check('HEADER: nÃºt Ä‘á»‹nh má»©c giá»¯ data-admin-only + data-perm="press" (quy táº¯c 34)',
  /id="btn-x2-epv-rate"[^>]*data-admin-only/.test(idxHtml) &&
  /id="btn-x2-epv-rate"[^>]*data-perm="press"/.test(idxHtml));
check('FORM: 5 nÃºt cá»¥m (NgÃ y Â· Äáº§u vÃ o Â· Äáº§u ra Â· ThÃ´ng sá»‘ KT Â· HÃ³a cháº¥t) + 5 panel + 5 tick xanh',
  ['date', 'input', 'output', 'tech', 'chem'].every(k =>
    idxHtml.includes('data-press-sec="' + k + '"') &&
    idxHtml.includes('data-press-panel="' + k + '"') &&
    idxHtml.includes('data-press-check="' + k + '"')));
check('FORM: Ã´ má»›i ThÃ´ng sá»‘ KT (lá»±c Ã©p ngang/Ä‘á»©ng Ä‘Æ¡n vá»‹ MPa Â· nhiá»‡t Ä‘á»™ Â· thá»i gian) + HÃ³a cháº¥t (tÃªn keo/phá»¥ gia)',
  ['press-force-h', 'press-force-v', 'press-temp', 'press-time', 'press-glue-name', 'press-additive-name'].every(id =>
    idxHtml.includes('id="' + id + '"')));
const qcPressSrc = fs.readFileSync(new URL('../js/qc-press.js', import.meta.url), 'utf8');
check('ÄÆ N Vá»Š MPa (16/10/2026): form nháº­p + tháº» ngÃ y + báº£ng QC Ä‘á»u theo MPa â€” KHÃ”NG cÃ²n "Kg/cmÂ²"',
  idxHtml.includes('Lá»±c Ã‰p Ngang (MPa)') && idxHtml.includes('Lá»±c Ã‰p Äá»©ng (MPa)') &&
  !idxHtml.includes('Kg/cmÂ²') && !pressSrc.includes('Kg/cmÂ²') && !qcPressSrc.includes('Kg/cmÂ²'));
check('ÄÆ N Vá»Š MPa: giá»¯ NGUYÃŠN sá»‘ liá»‡u (khÃ´ng quy Ä‘á»•i 0,098) â€” 18 váº«n lÃ  18',
  idxHtml.includes('placeholder="VD: 18"') && idxHtml.includes('placeholder="VD: 22"') &&
  !pressSrc.includes('0.0980665') && !pressSrc.includes('forceUnit'));
check('FORM: ThÃ nh pháº©m + Sá»‘ LÆ°á»£ng TP CÃ™NG DÃ’NG (.press-fp-row) Â· SL nháº­p tay (khÃ´ng cÃ²n "Tá»± Ä‘á»™ng tÃ­nh tá»« vÃ¡n thÃ´")',
  idxHtml.includes('press-fp-row') && !idxHtml.includes('Tá»± Ä‘á»™ng tÃ­nh tá»« vÃ¡n thÃ´'));
check('FORM: chÃº thÃ­ch dÃ i Ä‘Ã£ chuyá»ƒn sang title (khÃ´ng cÃ²n nhÃ£n "(1 Ä‘áº¿n 3 loáº¡i â€” gÃµ kÃ­ tá»± Ä‘á»ƒ tháº¥y gá»£i Ã½)")',
  !idxHtml.includes('(1 Ä‘áº¿n 3 loáº¡i â€” gÃµ kÃ­ tá»± Ä‘á»ƒ tháº¥y gá»£i Ã½)</span>') &&
  idxHtml.includes('title="Thanh thÃ´ tá»« BÃ o Tinh hoáº·c vÃ¡n thÃ´ Ä‘Ã£ Ã©p trÆ°á»›c Ä‘Ã³ (1 Ä‘áº¿n 3 loáº¡i â€” gÃµ kÃ­ tá»± Ä‘á»ƒ tháº¥y gá»£i Ã½)"'));
check('PRESS.JS: cÃ³ hÃ m gá»£i Ã½ sau BÃ o Tinh +5 cá»¥m panel + text thÃ´ng sá»‘ (Ä‘Ã£ export)',
  pressSrc.includes('function pressBaoTinhHintOf') &&
  pressSrc.includes('function pressToggleSec') &&
  pressSrc.includes('function pressSecFilled') &&
  pressSrc.includes('function pressTechTextOf') &&
  /pressTechTextOf,/.test(pressSrc));
check('EVENTS.JS: ná»‘i nÃºt cá»¥m + Ä‘á»“ng bá»™ tick + gá»£i Ã½ BÃ o Tinh (á»§y quyá»n trong modal)',
  eventsSrc.includes('pressToggleSec') && eventsSrc.includes('refreshPressSecChecks') &&
  eventsSrc.includes('refreshPressStickHints'));
check('STYLES.CSS: khá»‘i header icon + tick xanh + gá»£i Ã½ BÃ o Tinh + SL cÃ¹ng dÃ²ng',
  cssHtml.includes('.x2-epv-head-btns') && cssHtml.includes('.press-sec-check') &&
  cssHtml.includes('.ps-bt-hint') && cssHtml.includes('.press-fp-row') &&
  cssHtml.includes('.press-sec-panel'));

// â”€â”€ Gá»£i Ã½ KÃCH THÆ¯á»šC SAU BÃ€O TINH dÆ°á»›i Ã´ Ä‘áº§u vÃ o â”€â”€
state.xuong2BaoTinhRecords = [
  { id: 'bt-hint-1', kind: 'tinh', date: '2026-09-20', inSizeKey: '1250Ã—22Ã—7', outSizeKey: '1250Ã—20Ã—5', qtyOk: 1000, qtyErr: 50 }
];
const btHint = press.pressBaoTinhHintOf('1250x22x7');
check('Gá»¢I Ã: chá»n 1250x22x7 â†’ hiá»‡n "1250Ã—20Ã—5 (KÃ­ch thÆ°á»›c sau bÃ o tinh) Â· 1.000 thanh (SL Ä‘áº¡t tá»“n)"',
  btHint.includes('1250Ã—20Ã—5') && btHint.includes('KÃ­ch thÆ°á»›c sau bÃ o tinh') &&
  btHint.includes('1.000') && btHint.includes('SL Ä‘áº¡t tá»“n tá»« BÃ o Tinh'));
check('Gá»¢I Ã: Ä‘áº§u vÃ o khÃ´ng pháº£i kÃ­ch thÆ°á»›c (A1) â†’ khÃ´ng hiá»‡n gÃ¬', press.pressBaoTinhHintOf('A1') === '');
check('Gá»¢I Ã: kÃ­ch thÆ°á»›c chÆ°a cÃ³ lÆ°á»£t BÃ o Tinh â†’ khÃ´ng hiá»‡n gÃ¬', press.pressBaoTinhHintOf('999x99x9') === '');

// â”€â”€ ThÃ´ng sá»‘ ká»¹ thuáº­t + tÃªn hÃ³a cháº¥t hiá»ƒn thá»‹ trÃªn THáºº NGÃ€Y â”€â”€
state.pressRecords = [{
  id: 'pr-tech', date: D, year: 2026, week: '2026-W39',
  productId: 'prod-1', productName: 'VÃ¡n 2000x600x20', fpDim: '2000x600x20',
  finishedQty: 10, glue: 5, additive: 1,
  glueName: 'Keo UF', additiveName: 'Bá»™t mÃ¬',
  forceH: 18, forceV: 22, tempC: 120, pressMin: 25,
  vanTho: [{ vtDim: '2000x600x20', vtQty: 10 }], sticks: [],
  createdAt: '2026-09-21T02:00:00.000Z'
}];
state.pressYearFilter = 'all';
state.pressWeekFilter = 'all';
press.renderX2EpVanDayCards();
const techHtml = String(document.getElementById('x2-epv-day-cards').innerHTML || '');
check('THáºº NGÃ€Y: hiá»‡n ThÃ´ng sá»‘ KT theo MPa (Ã‰p ngang 18 Â· Ã‰p Ä‘á»©ng 22 Â· 120Â°C Â· 25 phÃºt/lÆ°á»£t)',
  techHtml.includes('Ã‰p ngang 18 MPa') && techHtml.includes('Ã‰p Ä‘á»©ng 22 MPa') &&
  techHtml.includes('120Â°C') && techHtml.includes('25 phÃºt/lÆ°á»£t'));
check('THáºº NGÃ€Y: hiá»‡n TÃŠN keo + TÃŠN phá»¥ gia cáº¡nh sá»‘ kg', techHtml.includes('Keo UF') && techHtml.includes('Bá»™t mÃ¬'));
check('THáºº NGÃ€Y: giá» HC/TC hiá»ƒn thá»‹ láº¡i Ä‘áº§y Ä‘á»§ (khÃ´ng cÃ²n stub)', techHtml.includes('h HC') && techHtml.includes('h TC'));

// â”€â”€ Tick xanh tá»«ng cá»¥m + dÃ²ng tá»•ng há»£p â”€â”€
document.getElementById('press-date').value = '2026-09-21';
check('TICK: cá»¥m "NgÃ y" Ä‘Ã£ Ä‘iá»n â†’ pressSecFilled("date") = true', press.pressSecFilled('date') === true);
check('TICK: cá»¥m "ThÃ´ng sá»‘ KT" chÆ°a Ä‘iá»n 4 Ã´ â†’ false', press.pressSecFilled('tech') === false);
press.refreshPressSecChecks();
check('TICK: dÃ²ng tá»•ng há»£p ghi "ÄÃ£ nháº­p 1/5 cá»¥m"',
  String(document.getElementById('press-sec-sum').textContent).includes('1/5'));
check('PANEL: pressToggleSec cháº¡y khÃ´ng lá»—i trÃªn stub DOM',
  (() => { try { press.pressToggleSec('tech'); return true; } catch (e) { return false; } })());

// â•â•â• R. MÂ³ Cá»¦A LÆ¯á»¢T Ã‰P â€” Æ¯U TIÃŠN Äáº¦U RA + Äáº¦U VÃ€O THEO THANH ÄÃƒ BÃ€O TINH
//    (17/10/2026) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Quy Æ°á»›c má»›i: â‘  VÃ¡n thÃ´ táº¡o ra â†’ â‘¡ ThÃ nh pháº©m (khi khÃ´ng khai vÃ¡n thÃ´) â†’
// â‘¢ thá»ƒ tÃ­ch Äáº¦U VÃ€O tÃ­nh theo THANH ÄÃƒ BÃ€O TINH (chá»‰ khi lÆ°á»£t khÃ´ng khai Ä‘áº§u
// ra nÃ o). Ã” Ä‘áº§u vÃ o ghi nhiá»u cá»¡ â†’ tá»•ng thá»ƒ tÃ­ch cÃ¡c cá»¡ (chia Ä‘á»u sá»‘ lÆ°á»£ng).
state.xuong2BaoTinhRecords = [
  { id: 'r-bt1', kind: 'tinh', date: '2026-09-18', inSizeKey: '1250Ã—18Ã—7', outSizeKey: '1250Ã—18Ã—5', qtyOk: 3000 },
  { id: 'r-bt2', kind: 'tinh', date: '2026-09-19', inSizeKey: '1250Ã—18Ã—7', outSizeKey: '1250Ã—16Ã—5', qtyOk: 1000 },
  // BÃ o thanh KHÃ”NG Ä‘Æ°á»£c dÃ¹ng lÃ m nguá»“n quy Ä‘á»•i cho Ä‘áº§u vÃ o Ã‰p VÃ¡n
  { id: 'r-bt3', kind: 'bao_thanh', date: '2026-09-19', inSizeKey: '1250Ã—18Ã—7', outSizeKey: '1250Ã—999Ã—999', qtyOk: 9999 }
];

const rVt = {
  id: 'r-vt', vanTho: [{ vtDim: '1200Ã—382Ã—12', vtQty: 30 }],
  fpDim: '1200Ã—382Ã—12', finishedQty: 30, sticks: [{ nanKey: '1250Ã—18Ã—7', sticks: 1080 }]
};
check('R1: CÃ“ VÃ¡n thÃ´ â†’ mÂ³ = vÃ¡n thÃ´ (0,165) Â· cÆ¡ sá»Ÿ tÃ­nh = vanTho',
  Math.abs(press.pressRecordVolumeOf(rVt) - 0.165024) < 1e-9 &&
  press.pressRecordVolumeBasisOf(rVt) === 'vanTho');

const rTp = {
  id: 'r-tp', vanTho: [], fpDim: '1200Ã—382Ã—12', finishedQty: 30,
  sticks: [{ nanKey: '1250Ã—18Ã—7', sticks: 1080 }]
};
check('R2: KHÃ”NG khai VÃ¡n thÃ´ â†’ mÂ³ = THÃ€NH PHáº¨M 0,165 (KHÃ”NG láº¥y thanh thÃ´ 0,2592) Â· cÆ¡ sá»Ÿ = thanhPham',
  Math.abs(press.pressRecordVolumeOf(rTp) - 0.165024) < 1e-9 &&
  press.pressRecordVolumeBasisOf(rTp) === 'thanhPham');

const rBoard = {
  id: 'r-board', vanTho: [], fpDim: '1200Ã—340Ã—33', finishedQty: 203,
  sticks: [{ nanKey: '1200Ã—340Ã—18', sticks: 406 }]
};
check('R3: chá»‰ ThÃ nh pháº©m + Ä‘áº§u vÃ o lÃ  VÃN THÃ” â†’ váº«n láº¥y thá»ƒ tÃ­ch thÃ nh pháº©m',
  Math.abs(press.pressRecordVolumeOf(rBoard) - (1200 * 340 * 33 / 1e9) * 203) < 1e-9 &&
  press.pressRecordVolumeBasisOf(rBoard) === 'thanhPham');

// 1250Ã—18Ã—7 â†’ 1250Ã—18Ã—5 (3.000) + 1250Ã—16Ã—5 (1.000):
// bÃ¬nh quÃ¢n gia quyá»n = (0,0001125Ã—3000 + 0,0001Ã—1000) Ã· 4000 = 0,000109375 mÂ³
const unitBt = press.pressStickUnitVolOf('1250Ã—18Ã—7');
check('R4: thá»ƒ tÃ­ch 1 thanh láº¥y theo SAU BÃ€O TINH (0,000109375 mÂ³ â€” khÃ´ng pháº£i thanh thÃ´ 0,0001575)',
  Math.abs(unitBt - 0.000109375) < 1e-12 &&
  Math.abs(unitBt - 0.0001575) > 1e-9);

const rIn = { id: 'r-in', vanTho: [], fpDim: '', finishedQty: 0, sticks: [{ nanKey: '1250Ã—18Ã—7', sticks: 1080 }] };
check('R5: KHÃ”NG cÃ³ Ä‘áº§u ra â†’ mÂ³ = Äáº¦U VÃ€O theo thanh Ä‘Ã£ bÃ o tinh (1080 Ã— 0,000109375 = 0,118125)',
  Math.abs(press.pressRecordVolumeOf(rIn) - 0.118125) < 1e-9 &&
  press.pressRecordVolumeBasisOf(rIn) === 'dauVao');
check('R5b: lÆ°á»£t "BÃ o thanh" bá»‹ LOáº I khá»i nguá»“n quy Ä‘á»•i (náº¿u lá»t vÃ o, thá»ƒ tÃ­ch Ä‘Ã£ khÃ¡c)',
  press.pressBaoTinhOutOfStick('1250Ã—18Ã—7').every(o => o.outKey !== '1250Ã—999Ã—999'));

// Ã” Ä‘áº§u vÃ o ghi NHIá»€U cá»¡ (dá»¯ liá»‡u tháº­t) â†’ thá»ƒ tÃ­ch = tá»•ng thá»ƒ tÃ­ch cÃ¡c cá»¡
const multiKey = '1250 x 22 x 10 ; 1250 x 22 x 8';
const unitMulti = press.pressStickUnitVolOf(multiKey);
check('R6: Ã´ nhiá»u cá»¡ â†’ thá»ƒ tÃ­ch 1 thanh = bÃ¬nh quÃ¢n cÃ¡c cá»¡ (0,0002475 mÂ³)',
  Math.abs(unitMulti - 0.0002475) < 1e-12 &&
  press.parseDimListLoose(multiKey).length === 2);
check('R6b: tá»•ng thá»ƒ tÃ­ch Ä‘áº§u vÃ o Ã´ nhiá»u cá»¡ = 2.052 Ã— 0,0002475 = 0,50787 mÂ³ (khÃ´ng Ä‘áº¿m trÃ¹ng)', 
  Math.abs(press.pressInputVolumeOf({ sticks: [{ nanKey: multiKey, sticks: 2052 }] }) - 0.50787) < 1e-9);

// (A) Dá»® LIá»†U Má»šI: má»—i cá»¡ 1 Ã´ Sá» LÆ¯á»¢NG RIÃŠNG â†’ tá»•ng = Î£ thá»ƒ tÃ­ch tá»«ng cá»¡
const twoSizes = [
  { dim: '1250Ã—24Ã—8', qty: 1000 },
  { dim: '1250Ã—24Ã—10', qty: 2000 }
];
check('R6c: SL riÃªng tá»«ng cá»¡ â†’ 1.000Ã—0,00024 + 2.000Ã—0,00030 = 0,84 mÂ³',
  Math.abs(press.pressStickVolOf('', twoSizes) - 0.84) < 1e-9);
check('R6d: báº£n ghi 2 dÃ²ng sticks (1.000 + 2.000) â†’ thá»ƒ tÃ­ch Ä‘áº§u vÃ o 0,84 mÂ³',
  Math.abs(press.pressInputVolumeOf({ sticks: [
    { nanKey: '1250Ã—24Ã—8', sticks: 1000 },
    { nanKey: '1250Ã—24Ã—10', sticks: 2000 }
  ] }) - 0.84) < 1e-9);

// â”€â”€ MÃ´ phá»ng DOM: tÃ¡ch Ã´ sá»‘ lÆ°á»£ng theo tá»«ng cá»¡ + giá»¯ sá»‘ Ä‘Ã£ nháº­p â”€â”€
function fakeStickRow(key, total) {
  const sizes = [];
  const list = {
    hidden: true,
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) {
      this._html = v;
      sizes.length = 0;
      const re = /data-size="([^"]+)"[^>]*value="([^"]*)"/g;
      let m;
      while ((m = re.exec(v))) {
        const dim = m[1];
        sizes.push({ value: m[2], getAttribute: () => dim });
      }
    }
  };
  const nanInp = { value: key };
  const totalInp = { value: String(total || ''), hidden: false };
  const label = { textContent: '' };
  const row = {
    dataset: {}, _sizes: sizes, _list: list, _total: totalInp, _label: label, _nan: nanInp,
    querySelector(sel) {
      if (sel === '.ps-nan') return nanInp;
      if (sel === '.ps-sticks') return totalInp;
      if (sel === '.ps-qty-list') return list;
      if (sel === '.ps-qty-label') return label;
      return null;
    },
    querySelectorAll(sel) { return sel === '.ps-size-qty' ? sizes : []; }
  };
  return row;
}
const fk = fakeStickRow('1250Ã—24Ã—8 ; 1250Ã—24Ã—10', 3000);
press.syncPressStickQtyInputs(fk);
check('R19: Ã´ nhiá»u cá»¡ â†’ tÃ¡ch N Ã´ SL riÃªng, chia Ä‘á»u tá»•ng cÅ© 3.000 (1.500/1.500) + ghi chÃº',
  fk._sizes.length === 2 && fk._sizes[0].value === '1500' && fk._sizes[1].value === '1500' &&
  fk._total.hidden === true && fk._label.textContent.includes('tá»«ng cá»¡') &&
  fk._list.innerHTML.includes('Chia Ä‘á»u tá»•ng cÅ©'));
fk._sizes[0].value = '1000';
fk._sizes[1].value = '2000';
check('R20: sá»­a sá»‘ tá»«ng cá»¡ â†’ thá»ƒ tÃ­ch = 1.000Ã—0,00024 + 2.000Ã—0,00030 = 0,84 mÂ³',
  Math.abs(press.pressStickVolOf('', press.readPressSizeQtys(fk)) - 0.84) < 1e-9);
fk._nan.value = '1250Ã—24Ã—8';
press.syncPressStickQtyInputs(fk);
check('R21: quay vá» 1 cá»¡ â†’ cá»™ng dá»“n sá»‘ Ä‘Ã£ nháº­p vÃ o Ã´ Sá»‘ lÆ°á»£ng chung (3.000) + áº©n danh sÃ¡ch',
  fk._sizes.length === 0 && fk._total.hidden === false && fk._total.value === '3000' &&
  fk._label.textContent === 'Sá»‘ lÆ°á»£ng');
check('R6e: cÃ³ lÆ°á»£t BÃ o tinh 1250Ã—24Ã—10 â†’ 1250Ã—22Ã—8 thÃ¬ tá»•ng = 0,24 + 0,44 = 0,68 mÂ³',
  (() => {
    state.xuong2BaoTinhRecords.push({ id: 'r-bt4', kind: 'tinh', date: '2026-09-20', inSizeKey: '1250Ã—24Ã—10', outSizeKey: '1250Ã—22Ã—8', qtyOk: 1700 });
    return Math.abs(press.pressStickVolOf('', twoSizes) - 0.68) < 1e-9;
  })());
const infoSizes = press.pressStickInfoHtml('1250Ã—24Ã—8 ; 1250Ã—24Ã—10', twoSizes);
check('R6f: form in tá»«ng cá»¡ "Ã— 1.000 = 0,24 mÂ³" Â· "Ã— 2.000 = 0,44 mÂ³" + tá»•ng 0,68 mÂ³',
  infoSizes.includes('1250Ã—24Ã—8') && infoSizes.includes('1.000') && infoSizes.includes('0,24 mÂ³') &&
  infoSizes.includes('1250Ã—24Ã—10') && infoSizes.includes('2.000') && infoSizes.includes('0,44 mÂ³') &&
  infoSizes.includes('Tá»•ng thá»ƒ tÃ­ch Ä‘áº§u vÃ o') && infoSizes.includes('0,68 mÂ³'));
check('R6g: dá»¯ liá»‡u CÅ¨ (chá»‰ cÃ³ tá»•ng SL) â†’ ghi rÃµ "â‰ˆ Æ°á»›c tÃ­nh â€” chia Ä‘á»u N cá»¡"',
  press.pressStickInfoHtml(multiKey, 2052).includes('Æ°á»›c tÃ­nh') &&
  press.pressStickInfoHtml(multiKey, 2052).includes('chia Ä‘á»u 2 cá»¡'));



// Khá»‘i 3 dÃ²ng dÆ°á»›i má»—i dÃ²ng Äáº¦U VÃ€O trong form
const infoBt = press.pressStickInfoHtml('1250Ã—18Ã—7', 1080);
check('R7: form hiá»‡n dÃ²ng 1 thanh thÃ´ + dÃ²ng 2 sau bÃ o tinh (tá»“n BT) + dÃ²ng 3 thá»ƒ tÃ­ch Ä‘áº§u vÃ o',
  infoBt.includes('Thanh thÃ´') && infoBt.includes('1250Ã—18Ã—7') &&
  infoBt.includes('Sau bÃ o tinh') && infoBt.includes('1250Ã—18Ã—5') &&
  infoBt.includes('tá»“n BT 3.000') && infoBt.includes('Thá»ƒ tÃ­ch Ä‘áº§u vÃ o') &&
  infoBt.includes('0,1181'));
const infoNoBt = press.pressStickInfoHtml('999Ã—99Ã—9', 10);
check('R8: cá»¡ chÆ°a cÃ³ lÆ°á»£t BÃ o tinh â†’ cáº£nh bÃ¡o táº¡m tÃ­nh theo kÃ­ch thÆ°á»›c Ä‘Ã£ ghi',
  infoNoBt.includes('ChÆ°a cÃ³ lÆ°á»£t BÃ o tinh') && infoNoBt.includes('táº¡m tÃ­nh theo kÃ­ch thÆ°á»›c Ä‘Ã£ ghi'));
check('R9: mÃ£ khÃ´ng pháº£i kÃ­ch thÆ°á»›c (A1) â†’ khÃ´ng tÃ­nh thá»ƒ tÃ­ch',
  press.pressStickInfoHtml('A1', 5).includes('khÃ´ng pháº£i kÃ­ch thÆ°á»›c'));

// Tháº» ngÃ y: chip CÆ  Sá»ž TÃNH + sá»‘ mÂ³ cá»§a tá»«ng lÆ°á»£t
state.pressRecords = [rTp, rIn];
state.pressYearFilter = 'all';
state.pressWeekFilter = 'all';
state.pressChartWinStart = null;
state.pressNotes = [];
press.renderX2EpVanDayCards();
const rDayHtml = String(document.getElementById('x2-epv-day-cards').innerHTML || '');
check('R10: tháº» ngÃ y in sá»‘ mÂ³ thÃ nh pháº©m 0,17 + chip "mÂ³ thÃ nh pháº©m"',
  rDayHtml.includes('0,17 mÂ³') && rDayHtml.includes('press-vol-basis') && rDayHtml.includes('mÂ³ thÃ nh pháº©m'));
check('R10b: lÆ°á»£t khÃ´ng cÃ³ Ä‘áº§u ra â†’ chip "mÂ³ Ä‘áº§u vÃ o (bÃ o tinh)" + sá»‘ 0,12 mÂ³',
  rDayHtml.includes('mÂ³ Ä‘áº§u vÃ o (bÃ o tinh)') && rDayHtml.includes('0,12 mÂ³'));

// Biá»ƒu Ä‘á»“: nhÃ¡nh "BTP sang TP" dÃ¹ng thá»ƒ tÃ­ch THÃ€NH PHáº¨M (khÃ´ng pháº£i Ä‘áº§u vÃ o)
state.pressRecords = [{
  id: 'r-chart', date: '2026-09-23', year: 2026, week: '2026-W39',
  productId: '', productName: '', fpDim: '1000Ã—1000Ã—1000', finishedQty: 2,
  vanTho: [], sticks: [{ nanKey: '1000Ã—1000Ã—1000', sticks: 3 }]
}];
press.renderPressChart();
const rDs = state.pressChartInstance.config.data.datasets;
check('R11: biá»ƒu Ä‘á»“ "BTP sang TP" = 2 mÂ³ (thá»ƒ tÃ­ch thÃ nh pháº©m, KHÃ”NG pháº£i Ä‘áº§u vÃ o 3 mÂ³)',
  JSON.stringify(rDs[2].data) === JSON.stringify([2]));

// Cáº¥u trÃºc form / sá»± kiá»‡n / CSS / cache
check('R12: form cÃ³ Ã´ tá»•ng thá»ƒ tÃ­ch Ä‘áº§u vÃ o (#press-input-vol-total Â· tÃ­nh theo thanh Ä‘Ã£ bÃ o tinh)',
  idxHtml.includes('id="press-input-vol-total"') && idxHtml.includes('THANH ÄÃƒ BÃ€O TINH'));
check('R13: events.js tÃ­nh láº¡i thá»ƒ tÃ­ch khi gÃµ Sá» LÆ¯á»¢NG (.ps-sticks) vÃ  Sá» LÆ¯á»¢NG Tá»ªNG Cá»  (.ps-size-qty)',
  eventsSrc.includes("cl.contains('ps-sticks')") && eventsSrc.includes("cl.contains('ps-size-qty')"));
check('R14: CSS cÃ³ khá»‘i 3 dÃ²ng Ä‘áº§u vÃ o + tá»•ng thá»ƒ tÃ­ch + chip cÆ¡ sá»Ÿ tÃ­nh',
  cssHtml.includes('.ps-bt-line') && cssHtml.includes('.press-input-vol-total') &&
  cssHtml.includes('.press-vol-basis'));
check('R15: sw.js Ä‘Ã£ tÄƒng cache (v265) Ä‘á»ƒ PWA khÃ´ng dÃ¹ng báº£n cÅ©',
  fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8').includes('nha-may-ngoc-son-v486'));
check('R16: Ã´ nhiá»u cá»¡ cÃ³ khung .ps-qty-list + N Ã´ .ps-size-qty (hÃ m Ä‘á»“ng bá»™ riÃªng)',
  pressSrc.includes('ps-qty-list') && pressSrc.includes('ps-size-qty') &&
  pressSrc.includes('function syncPressStickQtyInputs') && pressSrc.includes('function readPressSizeQtys'));
check('R17: lÆ°u tÃ¡ch má»—i cá»¡ 1 dÃ²ng sticks (collectPressSticks) + nÃ¢ng tá»‘i Ä‘a 6 dÃ²ng Ä‘áº§u vÃ o',
  /readPressSizeQtys\(row\)/.test(pressSrc) && pressSrc.includes('Tá»‘i Ä‘a 6 dÃ²ng Ä‘áº§u vÃ o'));
check('R18: CSS Ã´ sá»‘ lÆ°á»£ng tá»«ng cá»¡ + ghi chÃº "chia Ä‘á»u tá»•ng cÅ©"',
  cssHtml.includes('.ps-qty-list') && cssHtml.includes('.ps-size-qty') &&
  cssHtml.includes('.ps-qty-note'));

// â•â•â• S. NÃšT "?" TRá»¢ GIÃšP â€” HÆ¯á»šNG DáºªN ÄIá»€N + CÃCH TÃNH (17/10/2026) â•â•â•â•â•â•â•
check('S1: header tháº» Ã‰p VÃ¡n cÃ³ nÃºt "?" (aria-haspopup=dialog)',
  idxHtml.includes('id="btn-epv-help"') && idxHtml.includes('aria-haspopup="dialog"'));
check('S2: form nháº­p lÆ°á»£t Ã©p cÃ³ nÃºt "HÆ°á»›ng Dáº«n" (#btn-press-help)',
  idxHtml.includes('id="btn-press-help"') && idxHtml.includes('HÆ°á»›ng Dáº«n'));
check('S3: modal #modal-epv-help Ä‘á»§ khung + nÃºt Ä‘Ã³ng + "ÄÃ£ Hiá»ƒu"',
  idxHtml.includes('id="modal-epv-help"') && idxHtml.includes('id="epv-help-body"') &&
  idxHtml.includes('id="btn-close-epv-help"') && idxHtml.includes('id="btn-epv-help-ok"'));
check('S4: press.js cÃ³ EPV_HELP + 3 hÃ m trá»£ giÃºp (Ä‘Ã£ export)',
  typeof press.EPV_HELP === 'string' && press.EPV_HELP.length > 500 &&
  typeof press.buildEpvHelpHtml === 'function' &&
  typeof press.openEpvHelp === 'function' && typeof press.closeEpvHelp === 'function');
check('S5: ná»™i dung Ä‘á»§ 5 khá»‘i + vÃ­ dá»¥ sá»‘ THáº¬T (0,84 Â· 0,68 Â· 120% Â· 114,3%)',
  press.EPV_HELP.includes('CÃ¡ch Ä‘iá»n 1 lÆ°á»£t Ã©p') && press.EPV_HELP.includes('CÃ¡ch tÃ­nh thá»ƒ tÃ­ch') &&
  press.EPV_HELP.includes('CÃ´ng suáº¥t') && press.EPV_HELP.includes('CÃ¡ch Ä‘á»c biá»ƒu Ä‘á»“') &&
  press.EPV_HELP.includes('Lá»—i thÆ°á»ng gáº·p') &&
  press.EPV_HELP.includes('0,84 mÂ³') && press.EPV_HELP.includes('0,68 mÂ³') &&
  press.EPV_HELP.includes('120%') && press.EPV_HELP.includes('114,3%') &&
  press.EPV_HELP.includes('KHÃ”NG cá»™ng sá»‘ lÆ°á»£ng cÃ¡c cá»¡ rá»“i chia Ä‘á»u'));
check('S6: má»Ÿ modal â†’ Ä‘á»• ná»™i dung + .show; Ä‘Ã³ng â†’ gá»¡ .show',
  (() => {
    press.openEpvHelp();
    const modal = document.getElementById('modal-epv-help');
    const okOpen = modal.classList.contains('show') &&
      String(document.getElementById('epv-help-body').innerHTML).includes('CÃ¡ch tÃ­nh thá»ƒ tÃ­ch');
    press.closeEpvHelp();
    return okOpen && !modal.classList.contains('show');
  })());
check('S7: events.js ná»‘i 2 nÃºt má»Ÿ + 2 nÃºt Ä‘Ã³ng + Esc + báº¥m ná»n má»',
  eventsSrc.includes("safeOn('btn-epv-help'") && eventsSrc.includes("safeOn('btn-press-help'") &&
  eventsSrc.includes("safeOn('btn-close-epv-help'") && eventsSrc.includes("safeOn('btn-epv-help-ok'") &&
  eventsSrc.includes("closeEpvHelp"));
check('S8: CSS modal trá»£ giÃºp (.epv-help-card Â· báº£ng vÃ­ dá»¥ Â· chip Â· ghi chÃº)',
  cssHtml.includes('.epv-help-card') && cssHtml.includes('#epv-help-body') &&
  cssHtml.includes('.epv-help-ex') && cssHtml.includes('.epv-help-chip') &&
  cssHtml.includes('.epv-help-note'));

// â”€â”€ T. Lá»°C Ã‰P Dáº NG KHOáº¢NG "8-10" MPa (19/10/2026) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Cho phÃ©p nháº­p 1 sá»‘ (18) hoáº·c 1 khoáº£ng (8-10 = tá»« 8 Ä‘áº¿n 10 MPa). LÆ°u forceH =
// cáº­n dÆ°á»›i (Sá», tÆ°Æ¡ng thÃ­ch dá»¯ liá»‡u cÅ©) + forceHMax = cáº­n trÃªn (chá»‰ khi lÃ  khoáº£ng).
console.log('--- T. Lá»°C Ã‰P: NHáº¬P 1 Sá» HOáº¶C KHOáº¢NG (8-10) ---');
const utils = await import('../js/utils.js');
const r810 = utils.parseNumRange('8-10');
check('T1: parse "8-10" â†’ min 8 Â· max 10 Â· isRange true',
  r810.ok && !r810.empty && r810.min === 8 && r810.max === 10 && r810.isRange === true);
check('T2: nháº­n dáº¥u â€“ ~ Ã· vÃ  chá»¯ "Ä‘áº¿n" (8 â€“ 10 Â· 8~10 Â· 8Ã·10 Â· 8 Ä‘áº¿n 10)',
  ['8 â€“ 10', '8~10', '8Ã·10', '8 Ä‘áº¿n 10'].every(t => {
    const r = utils.parseNumRange(t);
    return r.ok && r.min === 8 && r.max === 10;
  }));
check('T3: "18" â†’ 1 sá»‘ (min = max = 18, isRange false)',
  (() => { const r = utils.parseNumRange('18'); return r.ok && r.min === 18 && r.max === 18 && r.isRange === false; })());
check('T4: tháº­p phÃ¢n kiá»ƒu Viá»‡t Nam "8,5-10,5" â†’ 8,5 Â· 10,5',
  (() => { const r = utils.parseNumRange('8,5-10,5'); return r.ok && r.min === 8.5 && r.max === 10.5; })());
check('T5: tá»« chá»‘i sá»‘ Ä‘áº§u > sá»‘ sau ("10-8") + nÃªu cÃ¡ch sá»­a',
  (() => { const r = utils.parseNumRange('10-8'); return r.ok === false && /sá»‘ Ä‘áº§u/.test(r.error); })());
check('T6: tá»« chá»‘i "abc" Â· "-5" Â· "8-" Â· "8-10-12"',
  ['abc', '-5', '8-', '8-10-12'].every(t => utils.parseNumRange(t).ok === false));
check('T7: Ä‘á»ƒ trá»‘ng â†’ ok + empty (khÃ´ng bÃ¡o lá»—i)',
  (() => { const r = utils.parseNumRange(''); return r.ok === true && r.empty === true; })());
check('T8: numRangeText: (8,10)="8-10" Â· (18,0)="18" Â· (8.5,10.5)="8,5-10,5" Â· (0,0)=""',
  utils.numRangeText(8, 10) === '8-10' && utils.numRangeText(18, 0) === '18' &&
  utils.numRangeText(8.5, 10.5) === '8,5-10,5' && utils.numRangeText(0, 0) === '');
check('T9: pressForceFieldsOf("8-10") â†’ lÆ°u forceH 8 + forceHMax 10',
  (() => { const f = press.pressForceFieldsOf('8-10'); return f.ok && f.forceH === 8 && f.forceHMax === 10; })());
check('T10: pressForceFieldsOf("18") â†’ forceH 18, KHÃ”NG cÃ³ forceHMax (nhÆ° dá»¯ liá»‡u 1 sá»‘ cÅ©)',
  (() => { const f = press.pressForceFieldsOf('18'); return f.ok && f.forceH === 18 && f.forceHMax === undefined; })());
check('T11: pressForceFieldsOf("10-8") â†’ ok false + error rÃµ',
  (() => { const f = press.pressForceFieldsOf('10-8'); return f.ok === false && !!f.error; })());
check('T12: THáºº NGÃ€Y hiá»‡n "Ã‰p ngang 8-10 MPa"; dá»¯ liá»‡u cÅ© váº«n "Ã‰p ngang 18 MPa"',
  press.pressTechTextOf({ forceH: 8, forceHMax: 10 }).includes('Ã‰p ngang 8-10 MPa') &&
  press.pressTechTextOf({ forceH: 18 }).includes('Ã‰p ngang 18 MPa'));
check('T13: index.html 2 Ã´ lá»±c Ã©p lÃ  type="text" (gÃµ Ä‘Æ°á»£c dáº¥u "-") + cÃ³ gá»£i Ã½ .press-force-hint',
  /type="text"[^>]*id="press-force-h"/.test(idxHtml) &&
  /type="text"[^>]*id="press-force-v"/.test(idxHtml) &&
  !/id="press-force-h"[^>]*type="number"/.test(idxHtml) &&
  idxHtml.includes('press-force-hint') && idxHtml.includes('VD 8-10'));
check('T14: submit dÃ¹ng pressForceFieldsOf + ghi forceHMax/forceVMax; sá»­a lÆ°á»£t náº¡p numRangeText',
  pressSrc.includes('pressForceFieldsOf(') && pressSrc.includes('recordData.forceHMax') &&
  pressSrc.includes('recordData.forceVMax') &&
  pressSrc.includes('numRangeText(rec.forceH, rec.forceHMax)'));
check('T15: CSS .press-force-hint cÃ³ trong styles.css', cssHtml.includes('.press-force-hint'));
check('T16: tick xanh cá»¥m "ThÃ´ng sá»‘ KT" cháº¥p nháº­n khoáº£ng (pressSecFilled dÃ¹ng parseNumRange)',
  pressSrc.includes('parseNumRange(val(id))'));

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

