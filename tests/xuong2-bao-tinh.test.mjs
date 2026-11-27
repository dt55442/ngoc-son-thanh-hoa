// tests/xuong2-bao-tinh.test.mjs â€” Kiá»ƒm thá»­ Vá»Š TRÃ "BÃ€O TINH" (XÆ°á»Ÿng 2):
// form gá»n (NgÃ y BÃ o Â· Loáº¡i BÃ o: BÃ o tinh / BÃ o tinh háº¡ cáº¥p / BÃ o thanh Â·
// NÃšT "Chá»n thanh" má»Ÿ DANH SÃCH THáºº â€” báº¥m tháº» Ä‘á»ƒ chá»n/bá» chá»n, tháº» 2 DÃ’NG
// CHUáº¨N nhÆ° thanh thÃ´ cá»§a tháº» Bullig (dÃ²ng 1 = mÃ£ Â· vá»‹ trÃ­ Â· k.thÆ°á»›c Â· loáº¡i Â·
// SL, dÃ²ng 2 = chip DÃ¹ng cho + badge ngÃ y S1/S2/K + luá»“ng NL + NCC) + Ã´ tÃ¬m
// nhanh, KHÃ”NG cÃ³ Ã´ vuÃ´ng tÃ­ch),
// Báº¢NG Tá»”NG Há»¢P THEO KÃCH THÆ¯á»šC CHUNG (gá»™p, khÃ´ng chia phÃ¢n loáº¡i): nháº­p SL
// thanh Äáº T + SL thanh Lá»–I (háº¡ cáº¥p CHáº Y 1 PHáº¦N â€” pháº§n CÃ²n láº¡i giá»¯ á»Ÿ tá»“n),
// KÃ­ch thÆ°á»›c sau bÃ o, Ä‘á»‹nh má»©c cÃ´ng suáº¥t theo thÃ¡ng Gá»˜P 1 chá»‰ sá»‘ BÃ o tinh (thanh/h),
// tháº» ngÃ y (hiá»‡u suáº¥t CHUNG cáº£ 3 nhÃ¡nh), lÆ°u/sá»­a/xÃ³a + tombstone, Ä‘á»“ng bá»™.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng xuong2-chon-nan-tho.test.mjs) â”€â”€â”€â”€â”€â”€â”€
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
// Giáº£ láº­p Ã´ nháº­p trong Báº¢NG Tá»”NG Há»¢P (Ã´ táº¡o Ä‘á»™ng) â†’ gá»i handler tháº­t
function fakeGroupInput(keyAttr, key, partAttr, part, value) {
  const map = {};
  map[keyAttr] = String(key);
  if (partAttr) map[partAttr] = String(part);
  return { target: { value: String(value), getAttribute: (k) => (k in map ? map[k] : null) } };
}
function fakeOkInput(sizeKey, value) { return fakeGroupInput('data-btinh-ok', sizeKey, null, null, value); }
function fakeOutInput(key, part, value) { return fakeGroupInput('data-btinh-out', key, 'data-out-part', part, value); }
// NHÃ“M Má»šI (nguá»“n PHIáº¾U XUáº¤T): KT sau bÃ o nháº­p 1 DÃ’NG Â· SL Lá»—i / TÃ³p / KhÃ¡c
function fakeRawOutInput(key, value) { return fakeGroupInput('data-btinh-out-raw', key, null, null, value); }
function fakeErrInput(key, value) { return fakeGroupInput('data-btinh-err', key, null, null, value); }
function fakeTopInput(key, value) { return fakeGroupInput('data-btinh-top', key, null, null, value); }
function fakeOtherInput(key, value) { return fakeGroupInput('data-btinh-other', key, null, null, value); }
function fakeOtherNoteInput(key, value) { return fakeGroupInput('data-btinh-other-note', key, null, null, value); }
// Nháº­p Ä‘á»§ 1 dÃ²ng NGUá»’N PHIáº¾U: kÃ­ch thÆ°á»›c sau bÃ o (1 dÃ²ng) + Äáº¡t + Lá»—i
function fillNoteRow(key, outRaw, ok, err) {
  x2.onBaoTinhGroupInput(fakeRawOutInput(key, outRaw));
  if (ok != null) x2.onBaoTinhGroupInput(fakeOkInput(key, ok));
  if (err != null) x2.onBaoTinhGroupInput(fakeErrInput(key, err));
}
// Nháº­p Ä‘á»§ 1 dÃ²ng (nhÃ¡nh Háº  Cáº¤P): kÃ­ch thÆ°á»›c sau bÃ o 3 Ã´ + SL Ä‘áº¡t
function fillOut(key, d, r, t) {
  x2.onBaoTinhGroupInput(fakeOutInput(key, 'd', d));
  x2.onBaoTinhGroupInput(fakeOutInput(key, 'r', r));
  x2.onBaoTinhGroupInput(fakeOutInput(key, 't', t));
}

const { state, STORAGE_KEY_XUONG2_BAO_TINH, STORAGE_KEY_X2_BAO_TINH_RATE } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// â”€â”€â”€ Dá»¯ liá»‡u máº«u: 3 LÃ” á»ž KHO (2 lÃ´ CÃ™NG kÃ­ch thÆ°á»›c) + 1 lÃ´ KHÃ”NG á»Ÿ Kho â”€â”€â”€
state.batches = [
  { id: 'k-1', code: '260910-01', stage: 'kho', date: '2026-09-10', location: 'K11',
    length: 1250, width: 18, thickness: 7, quantity: 800, bambooType: 'A1', useFor: 'VÃ¡n',
    createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'k-3', code: '260911-01', stage: 'kho', date: '2026-09-11', location: 'K13',
    length: 1250, width: 18, thickness: 7, quantity: 300, bambooType: 'A', useFor: 'VÃ¡n',
    createdAt: '2026-09-11T02:00:00.000Z' },
  { id: 'k-2', code: '260912-01', stage: 'kho', date: '2026-09-12', location: 'K12',
    length: 1300, width: 20, thickness: 8, quantity: 500, bambooType: 'A', useFor: 'VÃ¡n',
    createdAt: '2026-09-12T02:00:00.000Z' },
  { id: 's-1', code: '260913-01', stage: 'say2', date: '2026-09-13', location: 'LS2',
    length: 1250, width: 18, thickness: 7, quantity: 400, bambooType: 'A', useFor: 'VÃ¡n',
    createdAt: '2026-09-13T02:00:00.000Z' }
];
state.xuong2BaoTinhRecords = [];
state.x2BaoTinhRates = {};
// â”€â”€ NGUá»’N Má»šI: PHIáº¾U XUáº¤T KHO má»¥c Ä‘Ã­ch BÃ o Tinh (thay cho chá»n trá»±c tiáº¿p lÃ´) â”€â”€
// nt-1: 2 lÃ´ cÃ¹ng cá»¡ 1250Ã—18Ã—7 (800 + 300 = 1.100) Â· nt-2: lÃ´ 1300Ã—20Ã—8 (500)
// nt-3: CHá»œ DUYá»†T (hiá»‡n má», khÃ´ng chá»n Ä‘Æ°á»£c) Â· nt-4: má»¥c Bullig (khÃ´ng lá»t)
state.khoNotes = [
  { id: 'nt-1', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-09-14', qty: 1100,
    lots: [{ batchId: 'k-1', qty: 800 }, { batchId: 'k-3', qty: 300 }] },
  { id: 'nt-2', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-09-15', qty: 500,
    lots: [{ batchId: 'k-2', qty: 500 }] },
  { id: 'nt-3', type: 'xuat', purpose: 'baotinh', status: 'cho_duyet', date: '2026-09-16', qty: 400,
    lots: [{ batchId: 'k-1', qty: 400 }] },
  // nt-5: phiáº¿u CÃ™NG kÃ­ch thÆ°á»›c 1250Ã—18Ã—7 (ngÃ y 18/09) â€” dÃ¹ng Ä‘á»ƒ test Gá»˜P 2 PHIáº¾U
  { id: 'nt-5', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-09-18', qty: 400,
    lots: [{ batchId: 'k-3', qty: 400 }] },
  { id: 'nt-4', type: 'xuat', purpose: 'bullig', status: 'da_duyet', date: '2026-09-17', qty: 600,
    lots: [{ batchId: 'k-1', qty: 600 }] }
];
// NhÃ¢n Sá»±: vá»‹ trÃ­ "BÃ o Tinh" (khá»›p) + "BÃ o thÃ´" (KHÃ”NG khá»›p) + "BÃ o VÃ¡n" (KHÃ”NG khá»›p)
state.hrEmployees = [
  { id: 'empTN', name: 'Pháº¡m VÄƒn TÃº', quitDate: '' },
  { id: 'empTho', name: 'LÃª VÄƒn BÃ¬nh', quitDate: '' },
  { id: 'empVan', name: 'Äá»— VÄƒn CÆ°á»ng', quitDate: '' }
];
state.hrPositions = [
  { id: 'p-tinh', name: 'BÃ o Tinh', department: 'XÆ°á»Ÿng 2' },
  { id: 'p-tho',  name: 'BÃ o thÃ´',  department: 'XÆ°á»Ÿng 2' },
  { id: 'p-van',  name: 'BÃ o VÃ¡n',  department: 'XÆ°á»Ÿng 2' }
];
state.hrAssignments = [
  { id: 'asg-tinh1', date: '2026-09-21', department: 'XÆ°á»Ÿng 2', positionId: 'p-tinh', employeeId: 'empTN', start: '07:00', end: '12:00' },
  { id: 'asg-tinh2', date: '2026-09-21', department: 'XÆ°á»Ÿng 2', positionId: 'p-tinh', employeeId: 'empTN', start: '13:00', end: '' },
  { id: 'asg-tho',   date: '2026-09-21', department: 'XÆ°á»Ÿng 2', positionId: 'p-tho',  employeeId: 'empTho', start: '07:00', end: '12:00' },
  { id: 'asg-van',   date: '2026-09-21', department: 'XÆ°á»Ÿng 2', positionId: 'p-van',  employeeId: 'empVan', start: '07:00', end: '12:00' }
];

const x2 = await import('../js/xuong2.js');

// â”€â”€â”€ A. THáºº LAUNCHER + Má»ž POP-UP + FORM Gá»ŒN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.renderXuong2Cards();
// Bá»˜ Lá»ŒC Ká»² (Tuáº§n/ThÃ¡ng/NÄƒm) máº·c Ä‘á»‹nh = tuáº§n HÃ”M NAY â†’ test data (21/09/2026)
// náº±m ngoÃ i ká»³ Ä‘Ã³ â†’ chuyá»ƒn sang cháº¿ Ä‘á»™ NÄ‚M 2026 Ä‘á»ƒ xem toÃ n bá»™ dá»¯ liá»‡u máº«u
x2.setX2BaoTinhFilterMode('year');
check('THáºº: mini card BÃ o Tinh chÆ°a cÃ³ lÆ°á»£t â†’ "ChÆ°a bÃ o"',
  document.getElementById('x2-mini-count-bao-tinh').textContent === 'ChÆ°a bÃ o');
check('THáºº: KHÃ”NG cÃ²n chip "Sáº¯p cÃ³" (chá»©c nÄƒng Ä‘Ã£ báº­t)',
  !document.getElementById('x2-mini-count-bao-tinh').classList.contains('x2-count-soon'));
check('THáºº: má»Ÿ tháº» BÃ o Tinh tráº£ vá» true', x2.x2OpenCard('x2-bao-tinh-card') === true);
check('THáºº: pop-up báº­t + tháº» BÃ o Tinh hiá»‡n (khÃ´ng cÃ²n x2-card-hidden)',
  document.getElementById('x2-detail-overlay').classList.contains('show') &&
  !document.getElementById('x2-bao-tinh-card').classList.contains('x2-card-hidden'));
check('TIáº¾N Äá»˜: chÆ°a cÃ³ thanh lá»—i â†’ "Thanh lá»—i chá» háº¡ cáº¥p: chÆ°a cÃ³"',
  document.getElementById('x2-btinh-stock-bar').innerHTML.includes('Thanh lá»—i chá» háº¡ cáº¥p') &&
  document.getElementById('x2-btinh-stock-bar').innerHTML.includes('chÆ°a cÃ³'));
document.getElementById('x2-btinh-kind').value = 'tinh';   // (trÃ¬nh duyá»‡t tá»± chá»n option Ä‘áº§u)
x2.updateXuong2BaoTinhLinked();
check('FORM Gá»ŒN: Loáº¡i bÃ o BÃ o tinh â†’ hiá»‡n NÃšT "Chá»n thanh", áº©n DÃ’NG "BÃ o thanh" (4 trÆ°á»ng)',
  document.getElementById('x2-btinh-picker-row').style.display === '' &&
  document.getElementById('x2-btinh-bt-row').style.display === 'none' &&
  document.getElementById('x2-btinh-picker-text').textContent === 'Chá»n thanh nan');
check('FORM Gá»ŒN: chÆ°a chá»n tháº» â†’ báº£ng tá»•ng há»£p áº¨N + Ä‘áº¿m "ChÆ°a chá»n"',
  document.getElementById('x2-btinh-groups').style.display === 'none' &&
  document.getElementById('x2-btinh-picked-count').textContent === 'ChÆ°a chá»n');

// â”€â”€â”€ B. NÃšT "CHá»ŒN THANH" â†’ DANH SÃCH THáºº (báº¥m chá»n / báº¥m ná»¯a bá» chá»n) â”€â”€
check('NÃšT CHá»ŒN THANH: báº¥m má»Ÿ danh sÃ¡ch tháº» rá»“i báº¥m láº¡i thÃ¬ Ä‘Ã³ng',
  (document.getElementById('x2-btinh-picker').hidden = true, true) &&   // tráº¡ng thÃ¡i ban Ä‘áº§u: Ä‘Ã³ng
  x2.x2BaoTinhTogglePicker() === true &&
  document.getElementById('x2-btinh-picker').hidden === false &&
  x2.x2BaoTinhTogglePicker() === false);
const listHtml = document.getElementById('x2-btinh-list').innerHTML;
// â”€â”€â”€ THáºº NGUá»’N = PHIáº¾U XUáº¤T KHO (dÃ²ng 1 tÃ³m táº¯t Â· dÃ²ng 2 chip + badge) â”€â”€
check('THáºº PHIáº¾U: dÃ²ng 1 = "Xuáº¥t BÃ o Tinh Â· 14/09/26 Â· 1.100 thanh"',
  listHtml.includes('Xuáº¥t BÃ o Tinh Â· 14/09/26 Â· 1.100 thanh'));
check('THáºº PHIáº¾U: dÃ²ng 2 chip "BÃ o Tinh" + badge "N kÃ­ch thÆ°á»›c"',
  listHtml.includes('al-use-tag use-van') && listHtml.includes('>BÃ o Tinh</span>') &&
  listHtml.includes('al-day-badge day-k') && listHtml.includes('kÃ­ch thÆ°á»›c'));
check('THáºº PHIáº¾U CHá»œ DUYá»†T: chip "Chá» duyá»‡t" + class al-card-pending (khÃ´ng chá»n Ä‘Æ°á»£c)',
  listHtml.includes('Chá» duyá»‡t') && listHtml.includes('al-card-pending'));
check('PHIáº¾U Má»¤C BULLIG KHÃ”NG Lá»ŒT vÃ o danh sÃ¡ch BÃ o Tinh (17/09 khÃ´ng cÃ³)',
  !listHtml.includes('17/09/26'));
check('TOOLTIP liá»‡t kÃª kÃ­ch thÆ°á»›c + sá»‘ lÆ°á»£ng: "1250x18x7 SL:1100" Â· "1300x20x8 SL:500"',
  listHtml.includes('1250x18x7 SL:1100') && listHtml.includes('1300x20x8 SL:500'));
check('THáºº PHIáº¾U: KHÃ”NG cÃ³ Ã´ vuÃ´ng tÃ­ch (khÃ´ng dÃ¹ng al-card-check)',
  !listHtml.includes('al-card-check'));
// â”€â”€â”€ 2 Ã” TÃŒM: Ã´ CHá»® (ngÃ y phiáº¿u) + Ã´ RIÃŠNG Sá» LÆ¯á»¢NG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('x2-btinh-search').value = '14/09/26';
x2.renderX2BaoTinhList();
check('Ã” CHá»®: gÃµ "14/09/26" â†’ chá»‰ cÃ²n phiáº¿u ngÃ y 14/09 (nt-1)',
  document.getElementById('x2-btinh-list').innerHTML.includes('1.100 thanh') &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('15/09/26'));
document.getElementById('x2-btinh-search').value = 'zzzz';
x2.renderX2BaoTinhList();
check('Ã” CHá»®: khÃ´ng khá»›p â†’ thÃ´ng bÃ¡o "KhÃ´ng tÃ¬m tháº¥y tháº» nÃ o khá»›p"',
  document.getElementById('x2-btinh-list').innerHTML.includes('KhÃ´ng tÃ¬m tháº¥y tháº» nÃ o khá»›p'));
document.getElementById('x2-btinh-search').value = '';
x2.renderX2BaoTinhList();
check('Ã” CHá»®: xoÃ¡ Ã´ tÃ¬m â†’ hiá»‡n láº¡i toÃ n bá»™ phiáº¿u',
  document.getElementById('x2-btinh-list').innerHTML.includes('14/09/26') &&
  document.getElementById('x2-btinh-list').innerHTML.includes('15/09/26'));
document.getElementById('x2-btinh-qty-search').value = '1100';
x2.renderX2BaoTinhList();
check('Ã” Sá» LÆ¯á»¢NG (riÃªng): gÃµ "1100" â†’ chá»‰ phiáº¿u 1.100 thanh (nt-1)',
  document.getElementById('x2-btinh-list').innerHTML.includes('1.100 thanh') &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('15/09/26'));
document.getElementById('x2-btinh-search').value = '1100';
x2.renderX2BaoTinhList();
check('Ã” CHá»® tÃ¡ch riÃªng: gÃµ "1100" (lÃ  Sá» LÆ¯á»¢NG) á»Ÿ Ã´ tÃ¬m nhanh â†’ khÃ´ng phiáº¿u nÃ o',
  document.getElementById('x2-btinh-list').innerHTML.includes('KhÃ´ng tÃ¬m tháº¥y tháº» nÃ o khá»›p'));
document.getElementById('x2-btinh-search').value = '15/09/26';
document.getElementById('x2-btinh-qty-search').value = '500';
x2.renderX2BaoTinhList();
check('Káº¾T Há»¢P 2 Ã” (VÃ€): chá»¯ "15/09/26" + sá»‘ "500" â†’ Ä‘Ãºng phiáº¿u nt-2',
  document.getElementById('x2-btinh-list').innerHTML.includes('15/09/26') &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('14/09/26'));
document.getElementById('x2-btinh-qty-search').value = '1100';
x2.renderX2BaoTinhList();
check('Káº¾T Há»¢P 2 Ã” (VÃ€): chá»¯ "15/09/26" + sá»‘ "1100" â†’ khÃ´ng phiáº¿u (nt-2 chá»‰ 500)',
  document.getElementById('x2-btinh-list').innerHTML.includes('KhÃ´ng tÃ¬m tháº¥y tháº» nÃ o khá»›p'));
document.getElementById('x2-btinh-search').value = '';
document.getElementById('x2-btinh-qty-search').value = '';
x2.renderX2BaoTinhList();
// â”€â”€â”€ CHá»ŒN PHIáº¾U: phiáº¿u CHá»œ DUYá»†T KHÃ”NG chá»n Ä‘Æ°á»£c â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.toggleBaoTinhPick('nt-3');
check('PHIáº¾U CHá»œ DUYá»†T: báº¥m tháº» â†’ KHÃ”NG Ä‘Æ°á»£c chá»n (toast + váº«n 0 phiáº¿u)',
  x2.baoTinhPickedIds().length === 0);
x2.toggleBaoTinhPick('nt-1');
check('Báº¤M THáºº = CHá»ŒN (tháº» tÃ´ chip picked + Ä‘áº¿m "1 Ä‘Ã£ chá»n")',
  x2.baoTinhPickedIds().join(',') === 'nt-1' &&
  document.getElementById('x2-btinh-picked-count').textContent === '1 Ä‘Ã£ chá»n' &&
  document.getElementById('x2-btinh-list').innerHTML.includes('x2-btinh-card picked'));
x2.toggleBaoTinhPick('nt-1');
check('Báº¤M Láº¦N Ná»®A = Bá»Ž CHá»ŒN (háº¿t chá»n + báº£ng tá»•ng há»£p áº©n láº¡i)',
  x2.baoTinhPickedIds().length === 0 &&
  document.getElementById('x2-btinh-groups').style.display === 'none');
x2.toggleBaoTinhPick('nt-1');
check('Gá»˜P THEO KÃCH THÆ¯á»šC: 1 phiáº¿u nt-1 â†’ 1 nhÃ³m 1250Ã—18Ã—7 = 1.100 thanh',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].sizeKey === '1250Ã—18Ã—7' &&
  x2.baoTinhGroups()[0].inQty === 1100 &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('1.100'));
x2.toggleBaoTinhPick('nt-5');
check('Gá»˜P 2 PHIáº¾U CÃ™NG Cá»  â†’ 1 nhÃ³m 1.500 thanh + hiá»‡n "2 phiáº¿u"',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].inQty === 1500 &&
  x2.baoTinhGroups()[0].noteIds.join(',') === 'nt-1,nt-5' &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('2 phiáº¿u'));
x2.toggleBaoTinhPick('nt-5');   // bá» nt-5 â†’ nhÃ³m vá» 1.100 (chá»‰ nt-1 tham gia lÆ°u)
check('Bá»Ž CHá»ŒN nt-5 â†’ nhÃ³m 1250Ã—18Ã—7 trá»Ÿ láº¡i 1.100 thanh (1 phiáº¿u)',
  x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].inQty === 1100);
x2.toggleBaoTinhPick('nt-2');
check('CHá»ŒN THÃŠM cá»¡ KHÃC â†’ 2 nhÃ³m riÃªng, má»—i nhÃ³m cÃ³ Ã´ nháº­p SL thanh Äáº T',
  x2.baoTinhGroups().length === 2 &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-ok="1250Ã—18Ã—7"') &&
  document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-ok="1300Ã—20Ã—8"'));
check('Báº¢NG NGUá»’N PHIáº¾U: cá»™t KT sau bÃ o (1 dÃ²ng) + SL lá»—i + TÃ³p + KhÃ¡c + Tá»“n',
  (() => { const h = document.getElementById('x2-btinh-groups').innerHTML;
    return h.includes('data-btinh-out-raw="1250Ã—18Ã—7"') && h.includes('data-btinh-err="1250Ã—18Ã—7"') &&
      h.includes('data-btinh-top="1250Ã—18Ã—7"') && h.includes('data-btinh-other="1250Ã—18Ã—7"') &&
      h.includes('data-btinh-other-note="1250Ã—18Ã—7"') && h.includes('x2-btinh-ton'); })());

// â”€â”€â”€ C. NHáº¬P KT SAU BÃ€O (1 DÃ’NG) + Äáº¡t + Lá»—i + TÃ³p + KhÃ¡c â†’ LÆ¯U â”€â”€
fillNoteRow('1250Ã—18Ã—7', '1240x16x6', 1000, 100);
fillNoteRow('1300Ã—20Ã—8', '1240x16x6', 450, 50);
check('NHáº¬P THEO DÃ’NG: nhÃ¡p Äáº¡t Â· Lá»—i + KT sau bÃ o (1 dÃ²ng) riÃªng tá»«ng nhÃ³m',
  x2.baoTinhOkDrafts().get('1250Ã—18Ã—7') === 1000 && x2.baoTinhOkDrafts().get('1300Ã—20Ã—8') === 450 &&
  x2.baoTinhOutDimsOf('1250Ã—18Ã—7').join('Ã—') === '1240Ã—16Ã—6' &&
  x2.baoTinhOutDimsOf('1300Ã—20Ã—8').join('Ã—') === '1240Ã—16Ã—6');
check('CÃ“ cá»™t SL Lá»–I nháº­p tay (nguá»“n phiáº¿u â€” KHÃ”NG cÃ²n lá»—i tá»± tÃ­nh á»Ÿ form)',
  document.getElementById('x2-btinh-groups').innerHTML.includes('data-btinh-err="1250Ã—18Ã—7"'));
check('CHáº¶N: nháº­p Äáº¡t + Lá»—i VÆ¯á»¢T SL vÃ o â†’ khÃ´ng lÆ°u',
  (function () {
    x2.onBaoTinhGroupInput(fakeErrInput('1250Ã—18Ã—7', '2000'));
    document.getElementById('x2-btinh-date').value = '2026-09-21';
    const n = state.xuong2BaoTinhRecords.length;
    x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
    const ok = state.xuong2BaoTinhRecords.length === n;
    x2.onBaoTinhGroupInput(fakeErrInput('1250Ã—18Ã—7', '100'));   // tráº£ láº¡i 100
    return ok;
  })());
check('CHáº¶N: xoÃ¡ háº¿t sá»‘ liá»‡u cáº£ 2 dÃ²ng â†’ khÃ´ng lÆ°u (chÆ°a nháº­p dÃ²ng nÃ o)',
  (function () {
    ['1250Ã—18Ã—7', '1300Ã—20Ã—8'].forEach(k => {
      x2.onBaoTinhGroupInput(fakeOkInput(k, ''));
      x2.onBaoTinhGroupInput(fakeErrInput(k, ''));
      x2.onBaoTinhGroupInput(fakeRawOutInput(k, ''));
    });
    document.getElementById('x2-btinh-date').value = '2026-09-21';
    const n = state.xuong2BaoTinhRecords.length;
    x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
    return state.xuong2BaoTinhRecords.length === n;
  })());
// Nháº­p láº¡i dÃ²ng 1250Ã—18Ã—7 (Ä‘áº¡t 1000 Â· lá»—i 100 Â· tÃ³p 20 Â· khÃ¡c 10 = 1130 > 1100!)
// â†’ tÃ³p/khÃ¡c pháº£i náº±m TRONG sá»‘ vÃ o: Ä‘áº¡t 1000 + lá»—i 60 + tÃ³p 20 + khÃ¡c 20 = 1100
fillNoteRow('1250Ã—18Ã—7', '1240x16x6', 1000, 60);
x2.onBaoTinhGroupInput(fakeTopInput('1250Ã—18Ã—7', 20));
x2.onBaoTinhGroupInput(fakeOtherInput('1250Ã—18Ã—7', 20));
x2.onBaoTinhGroupInput(fakeOtherNoteInput('1250Ã—18Ã—7', 'nan ngáº¯n'));
check('TÃ“P + KHÃC + GHI CHÃš: nhÃ¡p lÆ°u Ä‘Ãºng khi báº¥m LÆ°u (dÃ²ng 1300 Ä‘á»ƒ trá»‘ng)', (() => {
  x2.renderX2BaoTinhGroups();   // váº½ láº¡i báº£ng Ä‘á»ƒ tháº¥y giÃ¡ trá»‹ nhÃ¡p
  const h = document.getElementById('x2-btinh-groups').innerHTML;
  return h.includes('data-btinh-top="1250Ã—18Ã—7"') && h.includes('nan ngáº¯n') &&
    h.includes('data-btinh-other="1250Ã—18Ã—7"');
})());
check('Tá»”NG Káº¾T: vÃ o 1.600 Â· Ä‘áº¡t 1.000 Â· cÃ³ tá»· lá»‡ Ä‘áº¡t + thá»ƒ tÃ­ch Ä‘áº¡t + nguá»“n PHIáº¾U XUáº¤T',
  document.getElementById('x2-btinh-calc').innerHTML.includes('1.600') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('1.000') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('PHIáº¾U XUáº¤T KHO má»¥c Ä‘Ã­ch BÃ o Tinh') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('%') &&
  document.getElementById('x2-btinh-calc').innerHTML.includes('mÂ³'));
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('LÆ¯U: dÃ²ng 1300Ã—20Ã—8 Ä‘á»ƒ TRá»NG bá»‹ bá» qua â†’ chá»‰ ghi 1 lÆ°á»£t (má»—i kÃ­ch thÆ°á»›c = 1 lÆ°á»£t)',
  state.xuong2BaoTinhRecords.length === 1);
const r1 = state.xuong2BaoTinhRecords[0];
check('LÆ¯U: kind = tinh Â· 1250Ã—18Ã—7 Â· RÃšT 1.100 Â· Ä‘áº¡t 1.000 Â· lá»—i 60 Â· tÃ³p 20 Â· khÃ¡c 20',
  r1.kind === 'tinh' && r1.inSizeKey === '1250Ã—18Ã—7' && r1.inQty === 1100 &&
  r1.qtyOk === 1000 && r1.qtyErr === 60 && r1.qtyTop === 20 && r1.qtyOther === 20 &&
  r1.otherNote === 'nan ngáº¯n');
check('LÆ¯U: noteUses ghi theo (phiáº¿u, lÃ´) + sources phÃ¢n bá»• FIFO tá»« phiáº¿u nt-1 (k-1, k-3)',
  Array.isArray(r1.noteUses) && r1.noteUses.length === 2 &&
  r1.noteUses.every(u => u.noteId === 'nt-1') &&
  Array.isArray(r1.sources) && r1.sources.length === 2 &&
  r1.sources.map(s => s.batchId).sort().join(',') === 'k-1,k-3');
check('LÆ¯U: kÃ­ch thÆ°á»›c SAU BÃ€O 1240Ã—16Ã—6 + ngÆ°á»i bÃ o/giá» tá»± Ä‘á»™ng (9h HC, khÃ´ng láº¥y BÃ o thÃ´/BÃ o VÃ¡n)',
  r1.outDims[0] === 1240 && r1.outDims[1] === 16 && r1.outDims[2] === 6 &&
  String(r1.worker).includes('Pháº¡m VÄƒn TÃº') && !String(r1.worker).includes('LÃª VÄƒn BÃ¬nh') &&
  r1.workHours === 9 && r1.workHoursHC === 9 && r1.workHoursTC === 0);
check('Tá»’N PHIáº¾U: nt-1 Ä‘Ã£ rÃºt háº¿t 1.100 â†’ áº¨N khá»i danh sÃ¡ch Â· nt-5 cÃ²n 400 váº«n hiá»‡n',
  (x2.khoNoteInputPool('baotinh', null).find(p => p.id === 'nt-1') === undefined) &&
  ((x2.khoNoteInputPool('baotinh', null).find(p => p.id === 'nt-5') || {}).remaining === 400) &&
  !document.getElementById('x2-btinh-list').innerHTML.includes('14/09/26') &&
  document.getElementById('x2-btinh-list').innerHTML.includes('18/09/26'));
x2.toggleBaoTinhPick('nt-2');
document.getElementById('x2-btinh-date').value = '2026-09-21';
fillNoteRow('1300Ã—20Ã—8', '1240x16x6', 450, 50);
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r2 = state.xuong2BaoTinhRecords[1];
check('LÆ¯U lÆ°á»£t 2: cá»¡ 1300Ã—20Ã—8 rÃºt 500 Â· Ä‘áº¡t 450 Â· lá»—i 50 (nháº­p tay) Â· nguá»“n 1 lÃ´ nt-2',
  !!r2 && r2.inSizeKey === '1300Ã—20Ã—8' && r2.inQty === 500 && r2.qtyOk === 450 && r2.qtyErr === 50 &&
  r2.sources.length === 1 && r2.sources[0].batchId === 'k-2' &&
  r2.noteUses.length === 1 && r2.noteUses[0].noteId === 'nt-2');
check('ÄÃƒ GHI localStorage (key riÃªng cá»§a BÃ o Tinh): 2 lÆ°á»£t',
  JSON.parse(localStorage.getItem(STORAGE_KEY_XUONG2_BAO_TINH) || '[]').length === 2);

// â”€â”€â”€ D. BÃ€O TINH Háº  Cáº¤P (nguá»“n = thanh Lá»–I cá»§a BÃ o Tinh, gom theo cá»¡) â”€â”€
document.getElementById('x2-btinh-kind').value = 'ha_cap';
x2.updateXuong2BaoTinhLinked();
check('Äá»”I LOáº I BÃ€O: bá» háº¿t tháº» Ä‘Ã£ chá»n + nÃºt Ä‘á»•i thÃ nh "Chá»n thanh lá»—i"',
  x2.baoTinhPickedIds().length === 0 &&
  document.getElementById('x2-btinh-picker-text').textContent === 'Chá»n thanh lá»—i');
const defectList = document.getElementById('x2-btinh-list').innerHTML;
check('THáºº Lá»–I: chuáº©n 2 dÃ²ng â€” "BÃ o Tinh (chá» háº¡ cáº¥p) Â· 1240 Ã— 16 Ã— 6 mm Â· Thanh lá»—i Â· 110 thanh"',
  defectList.includes('BÃ o Tinh (chá» háº¡ cáº¥p) Â· 1240 Ã— 16 Ã— 6 mm Â· Thanh lá»—i Â· 110 thanh'));
check('THáºº Lá»–I: dÃ²ng 2 cÃ³ chip "BÃ o tinh háº¡ cáº¥p" + badge "Lá»—i BÃ o Tinh"',
  defectList.includes('al-card-sub') && defectList.includes('>BÃ o tinh háº¡ cáº¥p</span>') &&
  defectList.includes('>Lá»—i BÃ o Tinh</span>'));
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.toggleBaoTinhPick('1240Ã—16Ã—6');
x2.onBaoTinhGroupInput(fakeOkInput('1240Ã—16Ã—6', 90));    // Äáº T 90
x2.onBaoTinhGroupInput(fakeErrInput('1240Ã—16Ã—6', 20));   // Lá»–I 20 (nháº­p tay) â†’ Ä‘em cháº¡y 110 = háº¿t cá»¡
fillOut('1240Ã—16Ã—6', 1230, 14, 5);
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r3 = state.xuong2BaoTinhRecords[2];
check('LÆ¯U Háº  Cáº¤P: kind = ha_cap Â· nguá»“n cá»¡ lá»—i 1240Ã—16Ã—6 Â· Ä‘em cháº¡y 110 = Ä‘áº¡t 90 + lá»—i 20 NHáº¬P TAY',
  !!r3 && r3.kind === 'ha_cap' && r3.defectKey === '1240Ã—16Ã—6' && r3.inQty === 110 &&
  r3.qtyOk === 90 && r3.qtyErr === 20 && r3.outDims[0] === 1230 && r3.outDims[2] === 5);
check('Tá»’N Lá»–I: cá»¡ 1240Ã—16Ã—6 Ä‘Ã£ háº¡ cáº¥p háº¿t (cÃ²n 0) Â· cá»¡ má»›i 1230Ã—14Ã—5 cÃ³ 20 thanh lá»—i',
  (x2.baoTinhDefectStock().find(x => x.sizeKey === '1240Ã—16Ã—6') || {}).remaining === 0 &&
  (x2.baoTinhDefectStock().find(x => x.sizeKey === '1230Ã—14Ã—5') || {}).remaining === 20);

// â”€â”€â”€ E. BÃ€O THANH: nguá»“n Ã‰P VÃN (nháº­n diá»‡n Báº°NG THá»‚ TÃCH) + LINK Äáº T tá»« QC â”€â”€
// Nguá»“n Ä‘áº§u vÃ o = khá»‘i "VÃ¡n ThÃ´ Táº¡o Ra" cá»§a lÆ°á»£t Ã‰p VÃ¡n: thanh BTP (thá»ƒ tÃ­ch 1
// thanh < 0,0015 mÂ³) Ä‘Æ°á»£c nháº­n; vÃ¡n thÃ´ (1220Ã—2440Ã—9 = 0,0268 mÂ³) bá»‹ loáº¡i.
state.pressRecords = [
  { id: 'pr1', date: '2026-09-22', week: '2026-W39', year: 2026, productId: 'rate-x',
    productName: 'VÃ¡n 1220x2440x9', fpDim: '1220Ã—2440Ã—9', finishedQty: 40,
    vanTho: [{ vtDim: '1220x2440x9', vtQty: 40, ratio: 1 }, { vtDim: '1200x18x15', vtQty: 1000, ratio: 1 }],
    sticks: [{ nanKey: '1200Ã—24Ã—8', sticks: 5000 }] }
];
document.getElementById('x2-btinh-date').value = '2026-09-21';   // NgÃ y BÃ o (nguá»“n KHÃ”NG cÃ²n lá»c theo tuáº§n)
const pressPool = x2.baoTinhInputPool();
const pressItem = pressPool.find(x => x.id === 'p:1200Ã—18Ã—15') || {};
check('BÃ€O THANH â€” NGUá»’N Ã‰P VÃN: nháº­n thanh BTP 1200Ã—18Ã—15 (0,000324 mÂ³) Â· LOáº I vÃ¡n thÃ´ 1220Ã—2440Ã—9 (0,0268 mÂ³)',
  !!pressItem.inSource && pressItem.inSource === 'press' &&
  pressItem.total === 1000 && pressItem.remaining === 1000 &&
  !pressPool.some(x => x.sizeKey === '1220Ã—2440Ã—9'));
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();
check('BÃ€O THANH: áº©n nÃºt "Chá»n thanh" cÅ© + hiá»‡n DÃ’NG 4 TRÆ¯á»œNG (Ä‘áº§u vÃ o Â· SL Â· Ä‘áº§u ra Â· Äáº T tá»« QC)',
  document.getElementById('x2-btinh-picker-row').style.display === 'none' &&
  document.getElementById('x2-btinh-bt-row').style.display === '' &&
  document.getElementById('x2-btinh-bt-in-text').textContent === 'Chá»n thanh Ä‘áº§u vÃ o' &&
  document.getElementById('x2-btinh-bt-out-text').textContent === 'Chá»n kÃ­ch thÆ°á»›c Ä‘áº§u ra');
const btInList = document.getElementById('x2-btinh-bt-in-list').innerHTML;
check('DANH SÃCH NGUá»’N: 1 tháº» "Thanh BTP Â· 1200 Ã— 18 Ã— 15 mm Â· cÃ²n 1.000/1.000 thanh" + khÃ´ng cÃ³ Ã´ vuÃ´ng tÃ­ch',
  btInList.includes('Thanh BTP Â· 1200 Ã— 18 Ã— 15 mm Â· cÃ²n 1.000/1.000 thanh') &&
  btInList.includes('Ã‰p VÃ¡n (VÃ¡n thÃ´ táº¡o ra)') && !btInList.includes('al-card-check'));
check('Cá»  Äáº¦U RA: Ä‘áº§u vÃ o 1200Ã—18Ã—15 (RÃ—D 270) â†’ Ä‘á»§ 4 cá»¡ máº·c Ä‘á»‹nh 640Ã—14Ã—12 Â· 640Ã—12Ã—10 Â· 1200Ã—10Ã—10 Â· 1200Ã—10Ã—8',
  x2.baoTinhBaoThanhOutCandidatesOk([1200, 18, 15], '640Ã—14Ã—12') &&
  x2.baoTinhBaoThanhOutCandidatesOk([1200, 18, 15], '640Ã—12Ã—10') &&
  x2.baoTinhBaoThanhOutCandidatesOk([1200, 18, 15], '1200Ã—10Ã—10') &&
  x2.baoTinhBaoThanhOutCandidatesOk([1200, 18, 15], '1200Ã—10Ã—8'));
check('Cá»  Äáº¦U RA: Ä‘áº§u vÃ o 640Ã—14Ã—12 (RÃ—D 168) â†’ chá»‰ cÃ²n 640Ã—12Ã—10 Â· 1200Ã—10Ã—10 Â· 1200Ã—10Ã—8 (loáº¡i chÃ­nh nÃ³)',
  !x2.baoTinhBaoThanhOutCandidatesOk([640, 14, 12], '640Ã—14Ã—12') &&
  x2.baoTinhBaoThanhOutCandidatesOk([640, 14, 12], '640Ã—12Ã—10') &&
  x2.baoTinhBaoThanhOutCandidatesOk([640, 14, 12], '1200Ã—10Ã—10') &&
  x2.baoTinhBaoThanhOutCandidatesOk([640, 14, 12], '1200Ã—10Ã—8'));
state.x2BaoThanhOutSizes = [];
check('Cá»  Äáº¦U RA: 4 cá»¡ máº·c Ä‘á»‹nh, chÆ°a thÃªm cá»¡ nÃ o',
  x2.baoThanhOutList().length === 4 && x2.baoThanhOutList().every(o => o.isDefault));
global.prompt = () => '640x16x10';
x2.addBaoThanhOutSize();
check('Cá»  Äáº¦U RA: nÃºt "ThÃªm kÃ­ch thÆ°á»›c" â†’ 5 cá»¡ (cá»¡ má»›i 640Ã—16Ã—10, isDefault false) + lÆ°u localStorage',
  x2.baoThanhOutList().length === 5 &&
  x2.baoThanhOutList().some(o => o.sizeKey === '640Ã—16Ã—10' && !o.isDefault) &&
  JSON.parse(localStorage.getItem('bamboo_tracker_x2_bao_thanh_out_sizes_v1') || '[]').includes('640Ã—16Ã—10'));
state.x2BaoThanhOutSizes = [];   // tráº£ láº¡i 4 cá»¡ máº·c Ä‘á»‹nh cho cÃ¡c bÆ°á»›c sau
// â‘  Chá»n thanh Ä‘áº§u vÃ o (báº¥m tháº» nguá»“n) + â‘¡ Sá»‘ lÆ°á»£ng + â‘¢ Äáº§u ra
x2.setBaoThanhInput('p:1200Ã—18Ã—15');
check('CHá»ŒN Äáº¦U VÃ€O: nÃºt hiá»‡n "1200 Ã— 18 Ã— 15 Â· Thanh BTP" + Ä‘áº¿m "cÃ²n 1.000/1.000"',
  document.getElementById('x2-btinh-bt-in-text').textContent === '1200 Ã— 18 Ã— 15 Â· Thanh BTP' &&
  document.getElementById('x2-btinh-bt-in-count').textContent === 'cÃ²n 1.000/1.000');
document.getElementById('x2-btinh-bt-qty').value = '300';
x2.renderX2BaoThanhForm();
check('Sá» LÆ¯á»¢NG: gá»£i Ã½ tá»‘i Ä‘a = pháº§n cÃ²n láº¡i cá»§a nguá»“n (1.000 thanh)',
  document.getElementById('x2-btinh-bt-qty-hint').textContent.includes('Tá»‘i Ä‘a 1.000 thanh'));
x2.setBaoThanhOut('640Ã—14Ã—12');
check('CHá»ŒN Äáº¦U RA: nÃºt hiá»‡n "640 Ã— 14 Ã— 12" + Ã´ Äáº T máº·c Ä‘á»‹nh 0 (chá» QC)',
  document.getElementById('x2-btinh-bt-out-text').textContent === '640 Ã— 14 Ã— 12' &&
  document.getElementById('x2-btinh-bt-ok').value === '0');
check('Báº¢NG TÃ“M Táº®T (CHá»ˆ Äá»ŒC): 1 dÃ²ng â€” cá»¡ vÃ o Â· SL vÃ o 300 Â· cá»¡ ra 640Ã—14Ã—12 Â· Äáº T 0 Â· Chá» kiá»ƒm',
  (() => {
    const h = document.getElementById('x2-btinh-groups').innerHTML;
    return x2.baoTinhGroups().length === 1 && x2.baoTinhGroups()[0].inQty === 300 &&
      h.includes('SL Ä‘áº¡t (tá»« QC)') && h.includes('Chá» kiá»ƒm') &&
      !h.includes('data-btinh-in-qty') && !h.includes('data-btinh-in-dim');
  })());
check('BÃ€O THANH: KHÃ”NG cÃ²n nÃºt "ThÃªm hÃ ng thÃ´ng tin khÃ¡c" (1 lÆ°á»£t = 1 cáº·p Ä‘áº§u vÃ o â†’ Ä‘áº§u ra)',
  x2.baoTinhAddRow() === false);
// Cháº·n: vÆ°á»£t pháº§n cÃ²n láº¡i cá»§a nguá»“n
document.getElementById('x2-btinh-date').value = '2026-09-21';
const nE = state.xuong2BaoTinhRecords.length;
document.getElementById('x2-btinh-bt-qty').value = '1200';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('CHáº¶N (bÃ o thanh): SL vÆ°á»£t pháº§n CÃ’N Láº I cá»§a nguá»“n â†’ khÃ´ng lÆ°u',
  state.xuong2BaoTinhRecords.length === nE);
// LÆ°u lÆ°á»£t A: 300 thanh â†’ 640Ã—14Ã—12
document.getElementById('x2-btinh-bt-qty').value = '300';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r4 = state.xuong2BaoTinhRecords[nE];
check('LÆ¯U (bÃ o thanh A): kind bao_thanh Â· nguá»“n Ã‰P VÃN Â· vÃ o 300 Â· ra 640Ã—14Ã—12 Â· Äáº T/Lá»–I = 0 (chá» QC)',
  state.xuong2BaoTinhRecords.length === nE + 1 && !!r4 &&
  r4.kind === 'bao_thanh' && r4.inSource === 'press' && r4.inSizeKey === '1200Ã—18Ã—15' &&
  r4.inDims.join('Ã—') === '1200Ã—18Ã—15' && r4.inQty === 300 &&
  r4.outSizeKey === '640Ã—14Ã—12' && r4.outDims.join('Ã—') === '640Ã—14Ã—12' &&
  r4.qtyOk === 0 && r4.qtyErr === 0);
check('LÆ¯U (bÃ o thanh): lÆ°u xong form vá» máº·c Ä‘á»‹nh "BÃ o tinh" + xoÃ¡ lá»±a chá»n/sá»‘ lÆ°á»£ng',
  document.getElementById('x2-btinh-kind').value === 'tinh' &&
  document.getElementById('x2-btinh-bt-qty').value === '' &&
  x2.baoTinhBaoThanhInItem() === null && x2.baoTinhBaoThanhOutItem() === null);
document.getElementById('x2-btinh-date').value = '2026-09-21';
check('NGUá»’N ÄÃƒ TRá»ª: tá»“n thanh BTP cÃ²n 700/1.000 thanh (lÆ°á»£t A Ä‘Ã£ dÃ¹ng 300)',
  (x2.baoTinhInputPool().find(x => x.id === 'p:1200Ã—18Ã—15') || {}).remaining === 700 &&
  (x2.baoTinhInputPool().find(x => x.id === 'p:1200Ã—18Ã—15') || {}).used === 300);
// LÆ°u lÆ°á»£t B: 200 thanh â†’ 1200Ã—10Ã—8 (giá»¯ nguyÃªn tá»•ng 500 vÃ o cá»§a ngÃ y â€” nhÆ° báº£n cÅ©)
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();
x2.setBaoThanhInput('p:1200Ã—18Ã—15');
document.getElementById('x2-btinh-bt-qty').value = '200';
x2.setBaoThanhOut('1200Ã—10Ã—8');
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const r5 = state.xuong2BaoTinhRecords[nE + 1];
check('LÆ¯U (bÃ o thanh B): vÃ o 200 Â· ra 1200Ã—10Ã—8 Â· nguá»“n Ã‰P VÃN',
  !!r5 && r5.kind === 'bao_thanh' && r5.inQty === 200 && r5.outSizeKey === '1200Ã—10Ã—8' &&
  r5.inSource === 'press');
// â”€â”€â”€ LINK Tá»ª TAB QC ("Kiá»ƒm thanh"): Äáº T = Î£ (Äáº¡t + Ngoáº¡i lá»‡) Â· Lá»–I = Ä‘Ã£ kiá»ƒm âˆ’ Ä‘áº¡t â”€â”€
state.qcFinalRecords = [
  { id: 'qcfA', date: '2026-09-22', workshop: 'x2', kind: 'thanh', sizeKey: '640Ã—14Ã—12', sizeDims: [640, 14, 12],
    inputQty: 300, qtyOk: 290, qtyExcept: 0, qtyReject: 10 },
  { id: 'qcfB', date: '2026-09-22', workshop: 'x2', kind: 'thanh', sizeKey: '1200Ã—10Ã—8', sizeDims: [1200, 10, 8],
    inputQty: 200, qtyOk: 200, qtyExcept: 0, qtyReject: 0 }
];
check('LINK QC: lÆ°á»£t A â€” Ä‘Ã£ kiá»ƒm 300/300 Â· Äáº T 290 Â· Lá»–I 10 (Ä‘Ã£ kiá»ƒm âˆ’ Ä‘áº¡t) Â· chá» kiá»ƒm 0',
  x2.baoTinhCheckedOf(r4) === 300 && x2.baoTinhQtyOkOf(r4) === 290 &&
  x2.baoTinhQtyErrOf(r4) === 10 && x2.baoTinhPendingOf(r4) === 0);
check('LINK QC: lÆ°á»£t B â€” Äáº T 200 Â· Lá»–I 0 Â· KHÃ”NG láº¥y nháº§m sá»‘ cá»§a cá»¡ khÃ¡c',
  x2.baoTinhQtyOkOf(r5) === 200 && x2.baoTinhQtyErrOf(r5) === 0);
check('LINK QC: 2 lÆ°á»£t CÃ™NG cá»¡ â†’ PHÃ‚N Bá»” theo ngÃ y (tá»•ng Ä‘áº¡t khÃ´ng vÆ°á»£t sá»‘ Ä‘Ã£ kiá»ƒm)',
  (() => {
    // lÆ°á»£t thá»© 3 CÃ™NG cá»¡ 640Ã—14Ã—12 (500 thanh) + QC cá»™ng thÃªm 350 â†’ lÆ°á»£t CÅ¨ nháº­n Ä‘á»§ 300 trÆ°á»›c,
    // lÆ°á»£t má»›i nháº­n 350 (KHÃ”NG cá»™ng trÃ¹ng vÃ o lÆ°á»£t cÅ©)
    document.getElementById('x2-btinh-kind').value = 'bao_thanh';
    x2.updateXuong2BaoTinhLinked();
    x2.setBaoThanhInput('p:1200Ã—18Ã—15');
    document.getElementById('x2-btinh-bt-qty').value = '500';
    x2.setBaoThanhOut('640Ã—14Ã—12');
    document.getElementById('x2-btinh-date').value = '2026-09-23';
    x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
    const r6 = state.xuong2BaoTinhRecords[nE + 2];
    state.qcFinalRecords.push({ id: 'qcfA2', date: '2026-09-24', workshop: 'x2', kind: 'thanh',
      sizeKey: '640Ã—14Ã—12', sizeDims: [640, 14, 12], inputQty: 350, qtyOk: 315, qtyExcept: 0, qtyReject: 35 });
    const totalOk = x2.baoTinhQtyOkOf(r4) + x2.baoTinhQtyOkOf(r6);
    const ok = x2.baoTinhCheckedOf(r4) === 300 && x2.baoTinhQtyOkOf(r4) === 290 &&   // lÆ°á»£t CÅ¨ nháº­n trÆ°á»›c
      x2.baoTinhCheckedOf(r6) === 350 && x2.baoTinhQtyOkOf(r6) === 315 &&          // lÆ°á»£t má»›i nháº­n pháº§n cÃ²n
      Math.abs(totalOk - 605) < 0.01;                                               // = 290 + 315
    state.xuong2BaoTinhRecords = state.xuong2BaoTinhRecords.filter(x => x !== r6);   // dá»n lÆ°á»£t + QC phá»¥
    state.qcFinalRecords = state.qcFinalRecords.filter(x => x.id !== 'qcfA2');
    return ok;
  })());
check('CHá»œ KIá»‚M: lÆ°á»£t CHÆ¯A cÃ³ káº¿t quáº£ QC â†’ Äáº T 0 (KHÃ”NG bá»‹a thÃ nh lá»—i) Â· chá» kiá»ƒm = sá»‘ thanh vÃ o',
  x2.baoTinhQtyOkOf({ id: 'x', kind: 'bao_thanh', inQty: 300, outSizeKey: '999Ã—9Ã—9' }) === 0 &&
  x2.baoTinhQtyErrOf({ id: 'x', kind: 'bao_thanh', inQty: 300, outSizeKey: '999Ã—9Ã—9' }) === 0 &&
  x2.baoTinhPendingOf({ id: 'x', kind: 'bao_thanh', inQty: 300, outSizeKey: '999Ã—9Ã—9' }) === 300);
// â”€â”€ NGUá»’N Äáº¦U VÃ€O BÃ€O THANH: thanh BTP Ã‰p VÃ¡n + THáºº Lá»–I cá»§a chÃ­nh BÃ o thanh â”€â”€
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();          // váº½ láº¡i Ã´ chá»n Ä‘áº§u vÃ o
const bthPool = x2.baoTinhInputPool();
check('THáºº Lá»–I BÃ€O THANH á»ž Ã” CHá»ŒN Äáº¦U VÃ€O: tháº» "d:640Ã—14Ã—12" (lá»—i 10 thanh tá»« lÆ°á»£t A) Â· inSource "defect" Â· cls "Thanh lá»—i"',
  bthPool.some(x => x.id === 'd:640Ã—14Ã—12' && x.inSource === 'defect' && x.cls === 'Thanh lá»—i' &&
    x.total === 10 && x.remaining === 10) &&
  document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('Thanh lá»—i BÃ o thanh'));
check('CHá»ˆ Lá»–I Cá»¦A BÃ€O THANH: lá»—i do "BÃ o tinh" (cá»¡ 1240Ã—16Ã—6) vÃ  do "Háº¡ cáº¥p" (cá»¡ 1230Ã—14Ã—5) KHÃ”NG vÃ o Ã´ chá»n',
  !bthPool.some(x => x.id === 'd:1240Ã—16Ã—6') && !bthPool.some(x => x.id === 'd:1230Ã—14Ã—5'));
document.getElementById('x2-btinh-kind').value = 'ha_cap';
x2.updateXuong2BaoTinhLinked();
check('Sá»” Tá»’N Lá»–I DÃ™NG CHUNG 1 Cá» : tháº» "Thanh lá»—i chá» háº¡ cáº¥p" váº«n tháº¥y 640Ã—14Ã—12 = 10 thanh (chÆ°a lÆ°á»£t nÃ o bÃ o láº¡i)',
  ((x2.baoTinhDefectStock().find(x => x.sizeKey === '640Ã—14Ã—12') || {}).remaining === 10));
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();

// â”€â”€ LOáº I BULLIG + KHÃ”NG Lá»ŒC THEO TUáº¦N + KHÃ”NG PHá»¤ THUá»˜C NGÃ€Y BÃ€O â”€â”€
document.getElementById('x2-btinh-date').value = '2026-09-21';
state.materialRates = [{ id: 'rate-bullig', product: '1200x18x15', nanUse: 'Bullig', unit: 'Thanh' }];
state.pressRecords.push({ id: 'pr2', date: '2026-09-24', week: '2026-W39', year: 2026,
  productId: 'rate-bullig', productName: '1200x18x15',
  vanTho: [{ vtDim: '1200x18x15', vtQty: 700 }] });
check('LOáº I BULLIG: lÆ°á»£t Ã©p sáº£n pháº©m Bullig (700 thanh) KHÃ”NG vÃ o nguá»“n â€” tá»•ng váº«n 1.000 (khÃ´ng 1.700)',
  (x2.baoTinhInputPool().find(x => x.id === 'p:1200Ã—18Ã—15') || {}).total === 1000 &&
  x2.baoThanhIsBulligPress(state.pressRecords.find(r => r.id === 'pr2')));
state.pressRecords.push({ id: 'pr3', date: '2026-09-10', week: '2026-W37', year: 2026,
  productId: 'rate-x', productName: 'VÃ¡n 1220x2440x9',
  vanTho: [{ vtDim: '1200x18x15', vtQty: 500 }] });
check('KHÃ”NG Lá»ŒC THEO TUáº¦N: lÆ°á»£t Ã©p tuáº§n 37 (ngoÃ i tuáº§n NgÃ y BÃ o 21/09) VáºªN vÃ o nguá»“n â€” tá»•ng 1.500',
  (x2.baoTinhInputPool().find(x => x.id === 'p:1200Ã—18Ã—15') || {}).total === 1500);
check('ÄÃƒ XÃ“A Háº²N Cáº¶P TUáº¦N: khÃ´ng cÃ²n hÃ m baoTinhPairWeeks/baoTinhInPairOf + Ä‘Ã£ cÃ³ baoThanhDefectPool',
  typeof x2.baoTinhPairWeeks === 'undefined' && typeof x2.baoTinhInPairOf === 'undefined' &&
  typeof x2.baoThanhDefectPool === 'function');
state.pressRecords = state.pressRecords.filter(r => r.id !== 'pr3');   // dá»n lÆ°á»£t phá»¥
check('KHÃ”NG PHá»¤ THUá»˜C NGÃ€Y BÃ€O: Ä‘á»ƒ trá»‘ng NgÃ y BÃ o danh sÃ¡ch nguá»“n VáºªN Ä‘á»§ (tháº» lá»—i + BTP)', (() => {
  document.getElementById('x2-btinh-date').value = '';
  x2.renderX2BaoThanhForm();
  const h = document.getElementById('x2-btinh-bt-in-list').innerHTML;
  const pool = x2.baoTinhInputPool();
  document.getElementById('x2-btinh-date').value = '2026-09-21';
  x2.renderX2BaoThanhForm();
  return h.includes('khÃ´ng lá»c theo tuáº§n') &&
    pool.some(x => x.id === 'p:1200Ã—18Ã—15') && pool.some(x => x.id === 'd:640Ã—14Ã—12');
})());
// â”€â”€â”€ 2 Ã” TÃŒM Káº¾T Há»¢P: Ã´ CHá»® (kÃ­ch thÆ°á»›c/nguá»“n/loáº¡i) + Ã´ RIÃŠNG Sá» LÆ¯á»¢NG (Ä‘iá»u kiá»‡n VÃ€) â”€â”€
document.getElementById('x2-btinh-date').value = '2026-09-21';
document.getElementById('x2-btinh-bt-in-qty-search').value = '500';
x2.renderBaoThanhInputList();
check('TÃŒM Sá» LÆ¯á»¢NG (Ã´ RIÃŠNG): gÃµ "500" khá»›p tháº» "cÃ²n 500/1.000 thanh"', (() => {
  const ok = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('cÃ²n 500/1.000 thanh');
  document.getElementById('x2-btinh-bt-in-qty-search').value = '99999';
  x2.renderBaoThanhInputList();
  const none = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('KhÃ´ng tÃ¬m tháº¥y');
  document.getElementById('x2-btinh-bt-in-qty-search').value = '';
  x2.renderBaoThanhInputList();
  return ok && none;
})());
check('Ã” CHá»® tÃ¡ch riÃªng: gÃµ "500" (lÃ  Sá» LÆ¯á»¢NG) á»Ÿ Ã´ tÃ¬m nhanh â†’ khÃ´ng tháº» nÃ o khá»›p', (() => {
  document.getElementById('x2-btinh-bt-in-search').value = '500';
  x2.renderBaoThanhInputList();
  const none = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('KhÃ´ng tÃ¬m tháº¥y');
  document.getElementById('x2-btinh-bt-in-search').value = '';
  x2.renderBaoThanhInputList();
  return none;
})());
check('Káº¾T Há»¢P 2 Ã” (VÃ€): chá»¯ "1200" + sá»‘ "500" â†’ Ä‘Ãºng tháº» BTP; chá»¯ "640" + sá»‘ "500" â†’ khÃ´ng tháº»', (() => {
  document.getElementById('x2-btinh-bt-in-search').value = '1200';
  document.getElementById('x2-btinh-bt-in-qty-search').value = '500';
  x2.renderBaoThanhInputList();
  const hit = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('cÃ²n 500/1.000 thanh');
  document.getElementById('x2-btinh-bt-in-search').value = '640';
  x2.renderBaoThanhInputList();
  const miss = document.getElementById('x2-btinh-bt-in-list').innerHTML.includes('KhÃ´ng tÃ¬m tháº¥y');
  document.getElementById('x2-btinh-bt-in-search').value = '';
  document.getElementById('x2-btinh-bt-in-qty-search').value = '';
  x2.renderBaoThanhInputList();
  return hit && miss;
})());
check('TÃŒM NHANH CHUNG: chuáº©n hÃ³a bá» dáº¥u phÃ¢n cÃ¡ch nghÃ¬n (gÃµ 1000 khá»›p 1.000)',
  x2.baoTinhSearchNorm('1.000') === '1000' && x2.baoTinhSearchNorm('1.000/1.000').includes('1000'));
state.materialRates = [];   // dá»n dá»¯ liá»‡u phá»¥
// Sá»¬A lÆ°á»£t bÃ o thanh: khÃ´i phá»¥c nguá»“n + cá»¡ Ä‘áº§u ra + sá»‘ lÆ°á»£ng (Äáº T Ä‘á»c LIVE tá»« QC)
x2.editXuong2BaoTinh(r4.id);
check('Sá»¬A (bÃ o thanh): khÃ´i phá»¥c nguá»“n Ã‰p VÃ¡n 1200Ã—18Ã—15 + cá»¡ ra 640Ã—14Ã—12 + SL 300 + Äáº T 290 (live tá»« QC)',
  x2.baoTinhBaoThanhInItem() && x2.baoTinhBaoThanhInItem().id === 'p:1200Ã—18Ã—15' &&
  x2.baoTinhBaoThanhOutItem() && x2.baoTinhBaoThanhOutItem().sizeKey === '640Ã—14Ã—12' &&
  document.getElementById('x2-btinh-bt-qty').value === '300' &&
  document.getElementById('x2-btinh-bt-ok').value === '290');
x2.resetXuong2BaoTinhForm();
x2.renderX2BaoTinhCard();   // váº½ láº¡i tháº» ngÃ y theo sá»‘ Äáº T/Lá»–I LIVE tá»« QC
check('THáºº NGÃ€Y (bÃ o thanh): nhÃ¡nh ghi nguá»“n "Thanh BTP Ã‰p VÃ¡n Â· 1200 Ã— 18 Ã— 15 mm Â· 300 thanh"',
  document.getElementById('x2-btinh-day-cards').innerHTML.includes('Thanh BTP Ã‰p VÃ¡n Â· 1200 Ã— 18 Ã— 15 mm Â· 300 thanh'));

// â”€â”€â”€ F. THáºº NGÃ€Y + Äá»ŠNH Má»¨C CÃ”NG SUáº¤T (thanh/h) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const dayHtml = document.getElementById('x2-btinh-day-cards').innerHTML;
check('THáºº NGÃ€Y: Ä‘áº§u tháº» hiá»‡n NgÃ y 21/09/26 + ngÆ°á»i bÃ o + giá» HC/TC',
  dayHtml.includes('x2-day-head') && dayHtml.includes('21/09/26') &&
  dayHtml.includes('Pháº¡m VÄƒn TÃº') && dayHtml.includes('9h HC') && dayHtml.includes('0h TC'));
check('THáºº NGÃ€Y: Ä‘á»§ 3 nhÃ¡nh theo Loáº¡i bÃ o (BÃ o tinh Â· BÃ o tinh háº¡ cáº¥p Â· BÃ o thanh)',
  dayHtml.includes('BÃ o tinh') && dayHtml.includes('BÃ o tinh háº¡ cáº¥p') && dayHtml.includes('BÃ o thanh'));
check('THáºº NGÃ€Y: nhÃ¡nh bÃ o tinh ghi nguá»“n PHIáº¾U XUáº¤T (ngÃ y 14/09/26 Â· 1250Ã—18Ã—7 Â· K11, K13)',
  dayHtml.includes('Phiáº¿u xuáº¥t BÃ o Tinh 14/09/26') && dayHtml.includes('1250Ã—18Ã—7') &&
  dayHtml.includes('K11, K13'));
check('THáºº NGÃ€Y: nhÃ¡nh háº¡ cáº¥p ghi "Thanh lá»—i cá»§a BÃ o Tinh Â· cá»¡ 1240 Ã— 16 Ã— 6"',
  dayHtml.includes('Thanh lá»—i cá»§a BÃ o Tinh') && dayHtml.includes('1240 Ã— 16 Ã— 6'));
check('THáºº NGÃ€Y: tá»•ng vÃ o 2.210 Â· Ä‘áº¡t 2.030 Â· lá»—i 140 Â· cÃ´ng suáº¥t 2.210 Ã· 9 = 246 thanh/h',
  dayHtml.includes('2.210 thanh') && dayHtml.includes('2.030 thanh') &&
  dayHtml.includes('140 thanh') && dayHtml.includes('246 thanh/h'));
// â”€â”€ Äá»ŠNH Má»¨C 1 Cá»˜T â€” Gá»˜P cáº£ 3 nhÃ¡nh vá» 1 chá»‰ sá»‘ (popup trong form nháº­p) â”€â”€
x2.openX2BaoTinhRateModal();
check('POPUP Äá»ŠNH Má»¨C: má»Ÿ Ä‘Æ°á»£c + hÃ ng thÃ¡ng 2026-09 vá»›i 1 Ã´ nháº­p CHUNG (khÃ´ng cÃ²n Ã´ theo loáº¡i)', (() => {
  const h = document.getElementById('x2-btinh-rate-rows').innerHTML;
  return document.getElementById('modal-x2-btinh-rate').classList.contains('show') &&
    h.includes('ThÃ¡ng 9/2026') && h.includes('id="x2-btinh-rate-2026-09"') &&
    !h.includes('x2-btinh-rate-2026-09-tinh') && !h.includes('x2-btinh-rate-2026-09-ha_cap') &&
    !h.includes('x2-btinh-rate-2026-09-bao_thanh');
})());
document.getElementById('x2-btinh-rate-2026-09').value = '600';
x2.handleX2BaoTinhRateRowSave('2026-09');
check('Äá»ŠNH Má»¨C 1 Cá»˜T: lÆ°u thÃ¡ng 9 = 600 (Sá» thuáº§n â€” state + localStorage)',
  state.x2BaoTinhRates['2026-09'] === 600 &&
  JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_TINH_RATE) || '{}')['2026-09'] === 600);
check('Äá»ŠNH Má»¨C: báº£n CÅ¨ sá»‘ thuáº§n váº«n Ä‘á»c Ä‘Æ°á»£c + baoTinhRateNorm gá»™p object 3 trÆ°á»ng â†’ 1 sá»‘', (() => {
  state.x2BaoTinhRates['2026-08'] = 500;
  const ok = x2.baoTinhRateEntryOf('2026-08') === 500 && x2.baoTinhRateOf('2026-08-05') === 500 &&
    x2.baoTinhRateNorm({ tinh: 700, ha_cap: 300, bao_thanh: 100 }) === 700 &&
    x2.baoTinhRateNorm({ ha_cap: 0, bao_thanh: 500 }) === 500;
  delete state.x2BaoTinhRates['2026-08'];
  return ok;
})());
check('THáºº NGÃ€Y: 1 chip HIá»†U SUáº¤T CHUNG â€” 40,9% (2.210Ã·9Ã·600) Â· ÄM 600 thanh/h (khÃ´ng cÃ²n 3 hiá»‡u suáº¥t riÃªng)', (() => {
  const h = document.getElementById('x2-btinh-day-cards').innerHTML;
  return h.includes('Hiá»‡u suáº¥t: <strong') && h.includes('40,9%') && h.includes('ÄM 600 thanh/h') &&
    !h.includes('ÄM 300 thanh/h') && !h.includes('ÄM 100 thanh/h');
})());
check('THáºº NGÃ€Y: dÃ²ng chi tiáº¿t sáº£n lÆ°á»£ng Tá»ªNG NHÃNH (chá»‰ theo dÃµi) "NhÃ¡nh: BÃ o tinh 1.600 Â· Háº¡ cáº¥p 110 Â· BÃ o thanh 500"', (() => {
  const h = document.getElementById('x2-btinh-day-cards').innerHTML;
  return h.includes('x2-day-kind-detail') && h.includes('NhÃ¡nh:') &&
    h.includes('BÃ o tinh 1.600') && h.includes('BÃ o tinh háº¡ cáº¥p 110') && h.includes('BÃ o thanh 500');
})());
x2.closeX2BaoTinhRateModal();
check('POPUP Äá»ŠNH Má»¨C: Ä‘Ã³ng Ä‘Æ°á»£c (overlay bá» class show)',
  !document.getElementById('modal-x2-btinh-rate').classList.contains('show'));
check('MINI CARD: 5 lÆ°á»£t Â· 2.030 thanh Ä‘áº¡t',
  document.getElementById('x2-mini-count-bao-tinh').textContent === '5 lÆ°á»£t Â· 2.030 thanh');

// â”€â”€â”€ G. Sá»¬A / XÃ“A / THU Gá»ŒN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
x2.editXuong2BaoTinh(r1.id);
check('Sá»¬A: náº¡p láº¡i ÄÃšNG phiáº¿u nt-1 + SL Ä‘áº¡t cÅ© 1.000 + KT sau bÃ o 1240Ã—16Ã—6 cá»§a dÃ²ng',
  x2.baoTinhPickedIds().join(',') === 'nt-1' &&
  x2.baoTinhOkDrafts().get('1250Ã—18Ã—7') === 1000 &&
  x2.baoTinhOutDimsOf('1250Ã—18Ã—7').join('Ã—') === '1240Ã—16Ã—6' &&
  state.x2BaoTinhEditId === r1.id);
x2.onBaoTinhGroupInput(fakeOkInput('1250Ã—18Ã—7', 900));
document.getElementById('x2-btinh-date').value = '2026-09-21';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('Sá»¬A: Ä‘áº¡t 1.000 â†’ 900 (lá»—i/giá»¯ 60 Â· tÃ³p 20 Â· khÃ¡c 20 = 1.000 rÃºt) Â· váº«n 5 lÆ°á»£t Â· thoÃ¡t cháº¿ Ä‘á»™ sá»­a',
  state.xuong2BaoTinhRecords.length === 5 && r1.qtyOk === 900 && r1.qtyErr === 60 &&
  r1.qtyTop === 20 && r1.qtyOther === 20 && r1.inQty === 1000 &&
  state.x2BaoTinhEditId === null);
x2.deleteXuong2BaoTinh(r4.id);
check('XÃ“A: xÃ³a lÆ°á»£t bÃ o thanh + ghi tombstone (xuong2BaoTinhRecords)',
  !state.xuong2BaoTinhRecords.some(r => r.id === r4.id) &&
  !!(state.deletedIds && state.deletedIds.xuong2BaoTinhRecords && state.deletedIds.xuong2BaoTinhRecords[r4.id]));
check('XÃ“A: mini card cÃ²n "4 lÆ°á»£t Â· 1.640 thanh" (900 + 450 + 90 + 200)',
  document.getElementById('x2-mini-count-bao-tinh').textContent === '4 lÆ°á»£t Â· 1.640 thanh');
x2.toggleX2BaoTinhTable();
check('Báº¢NG: nÃºt thu gá»n hoáº¡t Ä‘á»™ng (wrap cÃ³ class x2-cut-collapsed)',
  document.getElementById('x2-btinh-table-wrap').classList.contains('x2-cut-collapsed'));
x2.toggleX2BaoTinhTable();

// â”€â”€â”€ M2. "ÄÃƒ DÃ™NG Háº¾T": PHIáº¾U Ä‘Ã£ rÃºt háº¿t bá»‹ áº¨N + dÃ²ng GIáº¢I THÃCH khi tÃ¬m + CHIP "ÄÃƒ BÃ€O" â”€â”€â”€
// Phiáº¿u nt-usedup 700 thanh ÄÃƒ bá»‹ lÆ°á»£t BÃ o Tinh rÃºt háº¿t â†’ áº©n; phiáº¿u nt-fresh 400 thanh â†’ váº«n hiá»‡n
state.batches.push({ id: 'k-usedup', code: '261001-09', stage: 'kho', date: '2026-10-01', khoDate: '2026-10-01', week: 'Tuáº§n 40', length: 1250, width: 22, thickness: 7, quantity: 700, volume: 0.14, bambooType: 'A1', useFor: 'VÃ¡n', location: 'K19', stageHistory: [{ stage: 'kho', date: '2026-10-01' }] });
state.batches.push({ id: 'k-fresh', code: '261001-10', stage: 'kho', date: '2026-10-01', khoDate: '2026-10-01', week: 'Tuáº§n 40', length: 1250, width: 22, thickness: 7, quantity: 400, volume: 0.085, bambooType: 'A1', useFor: 'VÃ¡n', location: 'K20', stageHistory: [{ stage: 'kho', date: '2026-10-01' }] });
state.khoNotes.push(
  { id: 'nt-usedup', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-10-01', qty: 700,
    lots: [{ batchId: 'k-usedup', qty: 700 }] },
  { id: 'nt-fresh', type: 'xuat', purpose: 'baotinh', status: 'da_duyet', date: '2026-10-02', qty: 400,
    lots: [{ batchId: 'k-fresh', qty: 400 }] }
);
state.xuong2BaoTinhRecords.push({ id: 'bt-usedup', date: '2026-10-04', week: '2026-W40', kind: 'tinh',
  noteUses: [{ noteId: 'nt-usedup', batchId: 'k-usedup', sizeKey: '1250Ã—22Ã—7', qty: 700 }],
  sources: [{ batchId: 'k-usedup', code: '261001-09', location: 'K19', qty: 700 }],
  batchId: 'k-usedup', batchCode: '261001-09', inQty: 700, inSizeKey: '1250Ã—22Ã—7',
  outSizeKey: '1250Ã—20Ã—5', outDims: [1250, 20, 5], qtyOk: 660, qtyErr: 40 });
x2.baoTinhClearPicks();
document.getElementById('x2-btinh-kind').value = 'tinh';
document.getElementById('x2-btinh-search').value = '';
document.getElementById('x2-btinh-qty-search').value = '';
x2.updateXuong2BaoTinhLinked();
x2.renderX2BaoTinhList();
check('DÃ™NG Háº¾T: phiáº¿u Ä‘Ã£ rÃºt háº¿t 700/700 KHÃ”NG cÃ³ tháº» chá»n (data-btinh-pick) Â· phiáº¿u má»›i váº«n hiá»‡n',
  document.getElementById('x2-btinh-list').innerHTML.includes('data-btinh-pick="nt-fresh"') &&
  document.getElementById('x2-btinh-list').innerHTML.includes('data-btinh-pick="nt-usedup"') === false);
check('DÃ™NG Háº¾T: baoTinhUsedUpItems tráº£ phiáº¿u Ä‘Ã£ áº©n (nt-usedup Â· qty 0 Â· total 700)',
  x2.baoTinhUsedUpItems().some(it => it.id === 'nt-usedup' && it.qty === 0 && it.total === 700));
document.getElementById('x2-btinh-qty-search').value = '700';
x2.renderX2BaoTinhList();
check('DÃ™NG Háº¾T: Ã´ Sá» "700" â†’ "KhÃ´ng tÃ¬m tháº¥y" + dÃ²ng GIáº¢I THÃCH (0/700 thanh)', (() => {
  const h = document.getElementById('x2-btinh-list').innerHTML;
  return h.includes('KhÃ´ng tÃ¬m tháº¥y tháº» nÃ o khá»›p') && h.includes('al-warn') &&
    h.includes('Xuáº¥t BÃ o Tinh') && h.includes('0/700');
})());
document.getElementById('x2-btinh-qty-search').value = '';
document.getElementById('x2-btinh-search').value = 'nt-usedup';
x2.renderX2BaoTinhList();
check('DÃ™NG Háº¾T: Ã´ CHá»® gÃµ id phiáº¿u cÅ©ng hiá»‡n dÃ²ng GIáº¢I THÃCH', (() => {
  const h = document.getElementById('x2-btinh-list').innerHTML;
  return h.includes('al-warn') && h.includes('0/700');
})());
document.getElementById('x2-btinh-search').value = 'zzzz';
x2.renderX2BaoTinhList();
check('DÃ™NG Háº¾T: tá»« khÃ³a láº¡ â†’ "KhÃ´ng tÃ¬m tháº¥y" NHÆ¯NG khÃ´ng dÃ²ng giáº£i thÃ­ch', (() => {
  const h = document.getElementById('x2-btinh-list').innerHTML;
  return h.includes('KhÃ´ng tÃ¬m tháº¥y') && h.includes('al-warn') === false;
})());
document.getElementById('x2-btinh-search').value = '';
x2.renderX2BaoTinhList();
check('DÃ™NG Háº¾T: xoÃ¡ Ã´ chá»¯ â†’ phiáº¿u chÆ°a bÃ o hiá»‡n láº¡i + khÃ´ng cÃ²n dÃ²ng giáº£i thÃ­ch', (() => {
  const h = document.getElementById('x2-btinh-list').innerHTML;
  return h.includes('data-btinh-pick="nt-fresh"') && h.includes('al-warn') === false;
})());
check('CHIP "ÄÃƒ BÃ€O": nhÃ£n "ÄÃ£ bÃ o 700/700 thanh" Â· khÃ´ng truyá»n lÃ´ â†’ chuá»—i rá»—ng',
  x2.baoTinhUsedLabel(state.batches.find(b => b.id === 'k-usedup')) === 'ÄÃ£ bÃ o 700/700 thanh' &&
  x2.baoTinhUsedLabel(null) === '');
// Dá»n dá»¯ liá»‡u test â€” khÃ´ng áº£nh hÆ°á»Ÿng cÃ¡c má»¥c sau
state.xuong2BaoTinhRecords = state.xuong2BaoTinhRecords.filter(r => r.id !== 'bt-usedup');
state.batches = state.batches.filter(b => b.id !== 'k-usedup' && b.id !== 'k-fresh');

// â”€â”€â”€ F2. Háº  Cáº¤P CHáº Y 1 PHáº¦N + MIGRATE Äá»ŠNH Má»¨C CÅ¨ (16/10/2026) â”€â”€
// Nguá»“n lá»—i má»›i 40 thanh (lÆ°á»£t tinh 26/09) â†’ háº¡ cáº¥p CHá»ˆ 25 thanh (Ä‘áº¡t 10 + lá»—i 15),
// pháº§n CÃ²n láº¡i 15 PHáº¢I giá»¯ á»Ÿ tá»“n (lá»—i cÅ©: luÃ´n Ã´m trá»n cáº£ cá»¡ vÃ¬ thiáº¿u Ã´ lá»—i).
state.xuong2BaoTinhRecords.push({ id: 'bt-partial-src', date: '2026-09-26', week: '2026-W39', kind: 'tinh',
  noteUses: [], sources: [], inQty: 100, inSizeKey: '1400Ã—24Ã—8',
  outSizeKey: '1400Ã—22Ã—6', outDims: [1400, 22, 6], qtyOk: 60, qtyErr: 40 });
document.getElementById('x2-btinh-kind').value = 'ha_cap';
document.getElementById('x2-btinh-date').value = '2026-09-26';
x2.updateXuong2BaoTinhLinked();
x2.toggleBaoTinhPick('1400Ã—22Ã—6');
x2.onBaoTinhGroupInput(fakeOkInput('1400Ã—22Ã—6', 10));
x2.onBaoTinhGroupInput(fakeErrInput('1400Ã—22Ã—6', 15));   // Ä‘em cháº¡y 25/40
fillOut('1400Ã—22Ã—6', 1400, 20, 5);
check('Báº¢NG Háº  Cáº¤P: dÃ²ng cÃ³ Ã´ SL lá»—i (data-btinh-err) + cá»™t "CÃ²n láº¡i" = 15 (40 âˆ’ 25)', (() => {
  x2.renderX2BaoTinhGroups();
  const h = document.getElementById('x2-btinh-groups').innerHTML;
  return h.includes('data-btinh-err="1400Ã—22Ã—6"') && h.includes('CÃ²n láº¡i') &&
    h.includes('class="x2-btinh-ton">15<') && h.includes('SL lá»—i');
})());
check('Tá»”NG Káº¾T hiá»‡n Lá»—i 15 + CÃ²n láº¡i 15 (khÃ´ng cÃ²n báº¯t buá»™c cháº¡y háº¿t cá»¡)', (() => {
  x2.renderX2BaoTinhCalc();
  const h = document.getElementById('x2-btinh-calc').innerHTML;
  return h.includes('Lá»—i:') && h.includes('CÃ²n láº¡i:');
})());
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const rp = state.xuong2BaoTinhRecords.find(r => r.id !== 'bt-partial-src' && r.kind === 'ha_cap' && r.date === '2026-09-26');
check('CHáº Y 1 PHáº¦N: lÆ°á»£t lÆ°u inQty = 25 (Äáº¡t 10 + Lá»—i 15) â€” KHÃ”NG Ã´m trá»n 40 thanh',
  !!rp && rp.inQty === 25 && rp.qtyOk === 10 && rp.qtyErr === 15 && rp.defectKey === '1400Ã—22Ã—6');
check('Tá»’N Lá»–I sau cháº¡y 1 pháº§n: cá»¡ 1400Ã—22Ã—6 cÃ²n 15 (40âˆ’25) Â· cá»¡ má»›i 1400Ã—20Ã—5 cÃ³ 15 lá»—i',
  ((x2.baoTinhDefectStock().find(x => x.sizeKey === '1400Ã—22Ã—6') || {}).remaining === 15) &&
  ((x2.baoTinhDefectStock().find(x => x.sizeKey === '1400Ã—20Ã—5') || {}).remaining === 15));
check('CHáº¶N: Äáº¡t + Lá»—i (20) vÆ°á»£t tá»“n lá»—i cÃ²n láº¡i (15) â†’ KHÃ”NG lÆ°u', (() => {
  x2.resetXuong2BaoTinhForm();                       // form vá» máº·c Ä‘á»‹nh 'tinh'
  document.getElementById('x2-btinh-kind').value = 'ha_cap';
  document.getElementById('x2-btinh-date').value = '2026-09-26';
  x2.updateXuong2BaoTinhLinked();
  x2.toggleBaoTinhPick('1400Ã—22Ã—6');                 // cÃ²n 15 thanh
  x2.onBaoTinhGroupInput(fakeOkInput('1400Ã—22Ã—6', 10));
  x2.onBaoTinhGroupInput(fakeErrInput('1400Ã—22Ã—6', 10));
  fillOut('1400Ã—22Ã—6', 1400, 20, 5);
  const n = state.xuong2BaoTinhRecords.length;
  x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
  return state.xuong2BaoTinhRecords.length === n;
})());
check('MIGRATE Äá»ŠNH Má»¨C CÅ¨: object 3 trÆ°á»ng â†’ 1 sá»‘ (Æ°u tiÃªn tinh Â· khÃ´ng tinh thÃ¬ max) + ghi láº¡i localStorage', (() => {
  const cur = JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_TINH_RATE) || '{}');
  localStorage.setItem(STORAGE_KEY_X2_BAO_TINH_RATE, JSON.stringify(Object.assign({}, cur,
    { '2026-12': { tinh: 700, ha_cap: 300, bao_thanh: 100 }, '2027-01': { ha_cap: 0, bao_thanh: 500 } })));
  x2.loadX2BaoTinhRates();
  const st = state.x2BaoTinhRates;
  const ls = JSON.parse(localStorage.getItem(STORAGE_KEY_X2_BAO_TINH_RATE) || '{}');
  return st['2026-12'] === 700 && st['2027-01'] === 500 && ls['2026-12'] === 700 &&
    ls['2027-01'] === 500 && st['2026-09'] === 600;
})());
// dá»n dá»¯ liá»‡u F2
state.xuong2BaoTinhRecords = state.xuong2BaoTinhRecords.filter(r => r.id !== 'bt-partial-src' && r.date !== '2026-09-26');
x2.resetXuong2BaoTinhForm();

// â”€â”€â”€ H. Cáº¤U TRÃšC + Ná»I Äá»’NG Bá»˜ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (index.html): NgÃ y BÃ o Â· Loáº¡i BÃ o Â· nÃºt "Chá»n thanh" cÃ¹ng 1 HÃ€NG + DÃ’NG "BÃ o thanh" 4 trÆ°á»ng (Ä‘Ã£ bá» Ã´ nháº­p tay cÅ©)',
  idxHtml.includes('id="x2-btinh-picker-btn"') && idxHtml.includes('id="x2-btinh-list"') &&
  idxHtml.includes('id="x2-btinh-search"') &&
  idxHtml.includes('id="x2-btinh-top-row"') && idxHtml.includes('id="x2-btinh-groups"') &&
  idxHtml.includes('id="x2-btinh-bt-row"') && idxHtml.includes('id="x2-btinh-bt-in-btn"') &&
  idxHtml.includes('id="x2-btinh-bt-in-list"') && idxHtml.includes('id="x2-btinh-bt-qty"') &&
  idxHtml.includes('id="x2-btinh-bt-out-btn"') && idxHtml.includes('id="x2-btinh-bt-out-list"') &&
  idxHtml.includes('id="x2-btinh-bt-out-add"') && idxHtml.includes('id="x2-btinh-bt-ok"') &&
  !idxHtml.includes('id="x2-btinh-add-row"') &&
  !idxHtml.includes('id="x2-btinh-manual-row"') &&
  !idxHtml.includes('id="x2-btinh-in-dai"') && !idxHtml.includes('id="x2-btinh-out-dai"') &&
  !idxHtml.includes('id="x2-btinh-qty-ok"') && !idxHtml.includes('id="x2-btinh-qty-err"') &&
  !idxHtml.includes('id="x2-btinh-lot"') && !idxHtml.includes('id="x2-btinh-defect"'));
check('Cáº¤U TRÃšC (index.html): NgÃ y BÃ o Â· Loáº¡i BÃ o Â· bá»™ lá»c ká»³ Â· nÃºt Äá»‹nh má»©c + popup 1 cá»™t (bá» thanh rate-bar cÅ©)',
  idxHtml.includes('id="x2-btinh-date"') && idxHtml.includes('id="x2-btinh-kind"') &&
  idxHtml.includes('id="x2-btinh-day-cards"') &&
  idxHtml.includes('id="x2-btinh-period-bar"') &&
  idxHtml.includes('id="btn-x2-btinh-rate"') &&
  idxHtml.includes('id="modal-x2-btinh-rate"') && idxHtml.includes('id="x2-btinh-rate-rows"') &&
  idxHtml.includes('id="x2-btinh-rate-new-month"') && idxHtml.includes('id="x2-btinh-bt-in-search"') &&
  !idxHtml.includes('id="x2-btinh-rate-bar"') && !idxHtml.includes('id="x2-btinh-rate-month"') &&
  !idxHtml.includes('id="x2-btinh-rate-chips"'));
check('Cáº¤U TRÃšC (index.html): popup Äá»‹nh má»©c Gá»˜P 1 Cá»˜T "BÃ o tinh (thanh/h)" â€” KHÃ”NG cÃ²n 2 cá»™t riÃªng',
  /<th>BÃ o tinh \(thanh\/h\)<\/th>/.test(idxHtml) &&
  !/<th>BÃ o tinh háº¡ cáº¥p \(thanh\/h\)<\/th>/.test(idxHtml) &&
  !/<th>BÃ o thanh \(thanh\/h\)<\/th>/.test(idxHtml) &&
  fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8').includes('x2-day-kind-detail'));
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (styles.css): khá»‘i THáºº BÃ€O TINH FORM Gá»ŒN (tháº» 2 dÃ²ng Â· báº£ng tá»•ng há»£p Â· Ã´ k.thÆ°á»›c háº¹p Â· dÃ²ng chi tiáº¿t nhÃ¡nh)',
  cssHtml.includes('THáºº BÃ€O TINH â€” FORM Gá»ŒN') && cssHtml.includes('.x2-btinh-card .al-card-sub') &&
  cssHtml.includes('.x2-btinh-ok {') && cssHtml.includes('.x2-btinh-group-table {') &&
  cssHtml.includes('.x2-btinh-dim') && cssHtml.includes('.x2-btinh-actions {') &&
  cssHtml.includes('.x2-day-kind-detail {'));
check('Cáº¤U TRÃšC (styles.css): Ã´ tÃ¬m nhanh .al-search trong picker + KHÃ”NG cÃ²n khá»‘i CSS lÆ¡ lá»­ng ({} cÃ¢n báº±ng)',
  cssHtml.includes('.x2-btinh-picker .al-card-list') && cssHtml.includes('.al-search {') &&
  !cssHtml.includes('inset 0 0 0 1px var(--primary-border);\n}') &&
  (() => { let d = 0; for (const ch of cssHtml) { if (ch === '{') d++; else if (ch === '}') d--; } return d === 0; })());
const jsEventsSt = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (events.js): ná»‘i nÃºt chá»n tháº» + báº¥m tháº» + báº£ng tá»•ng há»£p + 4 trÆ°á»ng BÃ o thanh',
  jsEventsSt.includes("safeOn('x2-btinh-picker-btn'") && jsEventsSt.includes("safeOn('x2-btinh-search'") &&
  jsEventsSt.includes("safeOn('x2-btinh-list'") &&
  jsEventsSt.includes("safeOn('x2-btinh-groups', 'input'") &&
  jsEventsSt.includes("safeOn('x2-btinh-groups', 'click'") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-in-btn'") && jsEventsSt.includes("safeOn('x2-btinh-bt-in-list'") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-qty'") && jsEventsSt.includes("safeOn('x2-btinh-bt-out-btn'") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-out-list'") && jsEventsSt.includes("safeOn('x2-btinh-bt-out-add'") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-in-search'") &&
  jsEventsSt.includes("safeOn('x2-btinh-period-bar'") &&
  jsEventsSt.includes("safeOn('btn-x2-btinh-rate'") &&
  jsEventsSt.includes("safeOn('btn-close-x2-btinh-rate'") &&
  jsEventsSt.includes("safeOn('btn-x2-btinh-rate-add-month'") &&
  jsEventsSt.includes("safeOn('x2-btinh-rate-rows'") &&
  !jsEventsSt.includes("safeOn('x2-btinh-add-row'") &&
  !jsEventsSt.includes("safeOn('btn-x2-btinh-rate-save'") &&
  jsEventsSt.includes("safeOn('btn-toggle-x2btinh-table'"));
check('Cáº¤U TRÃšC (styles.css): thanh bá»™ lá»c Ká»² + chip ká»³ thá»‘ng kÃª (khá»‘i {} cÃ¢n báº±ng)', (() => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  let d = 0; for (const ch of css) { if (ch === '{') d++; else if (ch === '}') d--; }
  return css.includes('.x2-btinh-period-bar') && css.includes('.x2-period-btn') &&
    css.includes('.material-stat-period') && d === 0;
})());
const jsStorage = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (js): ná»‘i storage/cloud/history/main',
  jsStorage.includes('xuong2BaoTinhRecords') && jsCloud.includes('x2BaoTinhRates') &&
  jsHistory.includes('xuong2BaoTinhRecords') && jsMain.includes('loadXuong2BaoTinh'));
// Cá»  Äáº¦U RA "BÃ o thanh" â€” key riÃªng pháº£i ná»‘i Ä‘á»§ state/storage/cloud/history/main/events
const jsState = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsX2 = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
check('Cáº¤U TRÃšC (key má»›i): state.js cÃ³ STORAGE_KEY_X2_BAO_THANH_OUT_SIZES + state.x2BaoThanhOutSizes',
  jsState.includes("'bamboo_tracker_x2_bao_thanh_out_sizes_v1'") &&
  jsState.includes('x2BaoThanhOutSizes: []'));
check('Cáº¤U TRÃšC (ná»‘i Ä‘á»§ 6 chá»—): storage Â· cloud Â· history Â· main Â· xUong2 (load/save) Â· events',
  jsStorage.includes('restoreX2BaoThanhOutSizes') && jsStorage.includes('x2BaoThanhOutSizes: state.x2BaoThanhOutSizes') &&
  jsCloud.includes('x2BaoThanhOutSizes') && jsCloud.includes('STORAGE_KEY_X2_BAO_THANH_OUT_SIZES') &&
  jsHistory.includes('x2BaoThanhOutSizes') && jsMain.includes('loadX2BaoThanhOutSizes') &&
  jsX2.includes('loadX2BaoThanhOutSizes') && jsX2.includes('saveX2BaoThanhOutSizes') &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-out-add'"));
check('Cáº¤U TRÃšC: Ã‰p VÃ¡n KHÃ”NG cá»™ng tá»“n cá»§a lÆ°á»£t "BÃ o thanh" vÃ o gá»£i Ã½ Ä‘áº§u vÃ o (Ä‘áº§u vÃ o BÃ o thanh lÃ  thÃ nh pháº©m Ã‰p VÃ¡n)',
  fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8')
    .includes("if (!r || r.kind === 'bao_thanh') return;"));

// â”€â”€â”€ I. VÃ’NG Äá»œI "Sá»” Sá»¬ Dá»¤NG PHIáº¾U" (06/10/2026) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Chá»n/bá» chá»n tháº» nguá»“n lÃ  thao tÃ¡c UI â†’ CHÆ¯A Ä‘Æ°á»£c ghi vÃ o lá»‹ch sá»­ sá»­ dá»¥ng;
// chá»‰ cÃ¡c lÆ°á»£t ÄÃƒ Báº¤M LÆ¯U má»›i ghi noteUses; xÃ³a lÆ°á»£t â†’ sá»• tráº£ vá» Ä‘á»§.
check('Sá»” PHIáº¾U (chÆ°a lÆ°u): chá»n nt-2 â†’ dÃ¹ng KHÃ”NG Ä‘á»•i Â· bá» chá»n â†’ VáºªN KHÃ”NG Äá»”I (khÃ´ng trá»« lá»‹ch sá»­)', (() => {
  x2.baoTinhClearPicks();
  const before = x2.khoNoteUsedOf('nt-2');          // nt-2 Ä‘Ã£ bá»‹ lÆ°á»£t r2 rÃºt 500 tá»« má»¥c C
  x2.toggleBaoTinhPick('nt-2');
  const mid = x2.khoNoteUsedOf('nt-2');
  x2.toggleBaoTinhPick('nt-2');
  return before === 500 && mid === 500 && x2.khoNoteUsedOf('nt-2') === 500 &&
    x2.baoTinhPickedIds().length === 0;
})());
check('Sá»” PHIáº¾U (Ä‘Ã£ lÆ°u + Ä‘Ã£ sá»­a): nt-1 ghi nháº­n Ä‘Ãºng pháº§n RÃšT = 1.000 thanh (khÃ´ng thá»«a/thiáº¿u)',
  x2.khoNoteUsedOf('nt-1') === 1000);
check('Sá»” PHIáº¾U (xÃ³a lÆ°á»£t): xÃ³a r1 â†’ nt-1 dÃ¹ng = 0 + tá»“n phiáº¿u tráº£ Ä‘á»§ 1.100', (() => {
  const n = state.xuong2BaoTinhRecords.length;
  x2.deleteXuong2BaoTinh(r1.id);
  const p1 = (x2.khoNoteInputPool('baotinh', null) || []).find(p => p.id === 'nt-1');
  return state.xuong2BaoTinhRecords.length === n - 1 &&
    x2.khoNoteUsedOf('nt-1') === 0 && !!p1 && p1.remaining === 1100;
})());

// â”€â”€â”€ M. VÃ Dá»¤ Äáº¦U - CUá»I: Lá»–I Äáº¦U RA Cá»¦A "BÃ€O THANH" QUAY Láº I LÃ€M Äáº¦U VÃ€O â”€â”€â”€
// (Äáº§u vÃ o 1200Ã—18Ã—15 Â· 1.000 thanh â†’ Äáº§u ra 640Ã—14Ã—12; QC kiá»ƒm Ä‘áº¡t 800 Â· lá»—i 200
//  â†’ 200 thanh 640Ã—14Ã—12 pháº£i hiá»‡n á»Ÿ danh sÃ¡ch chá»n Ä‘áº§u vÃ o, vÃ  bá»‹ TRá»ª khi bÃ o láº¡i)
state.xuong2BaoTinhRecords = [];
state.qcFinalRecords = [];
state.materialRates = [];
state.pressRecords = [{ id: 'prM', date: '2026-10-01', week: '2026-W40', year: 2026,
  productId: '', productName: 'VÃ¡n 1220x2440x9',
  vanTho: [{ vtDim: '1200x18x15', vtQty: 1000, ratio: 1 }] }];
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
document.getElementById('x2-btinh-date').value = '2026-10-01';
x2.updateXuong2BaoTinhLinked();
x2.setBaoThanhInput('p:1200Ã—18Ã—15');
document.getElementById('x2-btinh-bt-qty').value = '1000';
x2.setBaoThanhOut('640Ã—14Ã—12');
const nM = state.xuong2BaoTinhRecords.length;
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const rM = state.xuong2BaoTinhRecords[nM];
check('VÃ Dá»¤ (lÆ°á»£t 1): vÃ o 1.000 thanh 1200Ã—18Ã—15 â†’ Ä‘áº§u ra 640Ã—14Ã—12 Â· nguá»“n Ã‰p VÃ¡n',
  !!rM && rM.kind === 'bao_thanh' && rM.inQty === 1000 && rM.inSource === 'press' &&
  rM.outSizeKey === '640Ã—14Ã—12');
state.qcFinalRecords.push({ id: 'qcfM', date: '2026-10-02', workshop: 'x2', kind: 'thanh',
  sizeKey: '640Ã—14Ã—12', sizeDims: [640, 14, 12], inputQty: 1000,
  qtyOk: 800, qtyExcept: 0, qtyReject: 200 });
check('VÃ Dá»¤ (QC): QC kiá»ƒm Ä‘áº¡t 800 Â· lá»—i 200 â†’ lÆ°á»£t 1 Ä‘á»c LIVE Ä‘Ãºng',
  x2.baoTinhQtyOkOf(rM) === 800 && x2.baoTinhQtyErrOf(rM) === 200);
check('VÃ Dá»¤ (nguá»“n lá»—i): tá»“n lá»—i 640Ã—14Ã—12 = 200 thanh VÃ€ hiá»‡n á»Ÿ Ã´ chá»n Ä‘áº§u vÃ o (tháº» "d:640Ã—14Ã—12")',
  ((x2.baoThanhDefectPool().find(x => x.sizeKey === '640Ã—14Ã—12') || {}).remaining === 200) &&
  x2.baoTinhInputPool().some(x => x.id === 'd:640Ã—14Ã—12') &&
  (() => { x2.renderBaoThanhInputList();
    const h = document.getElementById('x2-btinh-bt-in-list').innerHTML;
    return h.includes('Thanh lá»—i Â· 640 Ã— 14 Ã— 12 mm Â· cÃ²n 200/200 thanh') &&
      h.includes('Thanh lá»—i BÃ o thanh'); })());
document.getElementById('x2-btinh-date').value = '2026-10-01';
document.getElementById('x2-btinh-kind').value = 'bao_thanh';
x2.updateXuong2BaoTinhLinked();
x2.setBaoThanhInput('d:640Ã—14Ã—12');
check('VÃ Dá»¤ (chá»n lá»—i): nÃºt Ä‘áº§u vÃ o hiá»‡n "640 Ã— 14 Ã— 12 Â· Thanh lá»—i" + cÃ²n 200/200 + gá»£i Ã½ tá»‘i Ä‘a 200',
  document.getElementById('x2-btinh-bt-in-text').textContent === '640 Ã— 14 Ã— 12 Â· Thanh lá»—i' &&
  document.getElementById('x2-btinh-bt-in-count').textContent === 'cÃ²n 200/200' &&
  document.getElementById('x2-btinh-bt-qty-hint').textContent.includes('Tá»‘i Ä‘a 200 thanh'));
const nM2 = state.xuong2BaoTinhRecords.length;
document.getElementById('x2-btinh-bt-qty').value = '500';
x2.setBaoThanhOut('640Ã—12Ã—10');
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
check('VÃ Dá»¤ (cháº·n): SL 500 vÆ°á»£t pháº§n cÃ²n láº¡i 200 cá»§a nguá»“n lá»—i â†’ KHÃ”NG lÆ°u',
  state.xuong2BaoTinhRecords.length === nM2);
document.getElementById('x2-btinh-bt-qty').value = '200';
x2.handleXuong2BaoTinhSubmit({ preventDefault(){} });
const rM2 = state.xuong2BaoTinhRecords[nM2];
check('VÃ Dá»¤ (lÆ°á»£t 2): vÃ o 200 thanh 640Ã—14Ã—12 tá»« NGUá»’N Lá»–I (inSource "defect") â†’ Ä‘áº§u ra 640Ã—12Ã—10',
  !!rM2 && rM2.inSource === 'defect' && rM2.inSizeKey === '640Ã—14Ã—12' &&
  rM2.inQty === 200 && rM2.outSizeKey === '640Ã—12Ã—10');
check('VÃ Dá»¤ (trá»« tá»“n): tá»“n lá»—i 640Ã—14Ã—12 vá» 0 â†’ tháº» "cÃ²n 0/200 thanh" + lá»›p disabled (khÃ´ng chá»n Ä‘Æ°á»£c)',
  ((x2.baoThanhDefectPool().find(x => x.sizeKey === '640Ã—14Ã—12') || {}).remaining === 0) &&
  (() => { x2.renderBaoThanhInputList();
    const h = document.getElementById('x2-btinh-bt-in-list').innerHTML;
    return h.includes('cÃ²n 0/200 thanh') && h.includes('disabled'); })());
check('VÃ Dá»¤ (sá»­a lÆ°á»£t): khÃ´i phá»¥c Ä‘Ãºng nguá»“n lá»—i "d:640Ã—14Ã—12" + tá»“n tráº£ láº¡i 200 khi Ä‘ang sá»­a',
  (() => { x2.editXuong2BaoTinh(rM2.id);
    const cur = x2.baoTinhBaoThanhInItem();
    const stock = (x2.baoThanhDefectPool().find(x => x.sizeKey === '640Ã—14Ã—12') || {});
    x2.resetXuong2BaoTinhForm();
    return !!cur && cur.id === 'd:640Ã—14Ã—12' && stock.remaining === 200; })());
check('Cáº¤U TRÃšC (js): baoTinhDefectStock nháº­n (excludeId, totalKinds) + baoThanhDefectPool chá»‰ Ä‘áº¿m kind bao_thanh',
  /function baoTinhDefectStock\(excludeId, totalKinds\)/.test(jsX2) &&
  /baoTinhDefectStock\(ex, \['bao_thanh'\]\)/.test(jsX2));
// â”€â”€â”€ Cáº¤U TRÃšC B1/B2: dÃ²ng giáº£i thÃ­ch "Ä‘Ã£ dÃ¹ng háº¿t" + chip "ÄÃƒ BÃ€O X/Y THANH" â”€â”€â”€
const jsKanban = fs.readFileSync(new URL('../js/kanban.js', import.meta.url), 'utf8');
check('B1 (js): xuong2 cÃ³ baoTinhCandidateRaw + baoTinhUsedUpItems + baoTinhUsedUpHintHtml + baoTinhLastTurnDateOf',
  jsX2.includes('function baoTinhCandidateRaw') && jsX2.includes('function baoTinhUsedUpItems') &&
  jsX2.includes('function baoTinhUsedUpHintHtml') && jsX2.includes('function baoTinhLastTurnDateOf'));
check('B1 (css + render): khá»‘i .al-warn + renderX2BaoTinhList ná»‘i warn (cáº£ nhÃ¡nh "Táº¥t cáº£ Ä‘Ã£ dÃ¹ng háº¿t")',
  cssHtml.includes('.al-warn-usedup {') && cssHtml.includes('.al-warn-line') &&
  jsX2.includes('baoTinhUsedUpHintHtml(true)') && jsX2.includes('+ warn'));
check('B2 (js): main.js Ä‘Æ°a x2BaoTinhUsedLabel vÃ o window.app + kanban.js gáº¯n chip tag-baotinh-used',
  jsMain.includes('x2BaoTinhUsedLabel: baoTinhUsedLabel') && jsKanban.includes('x2BaoTinhUsedLabel') &&
  jsKanban.includes('tag-baotinh-used') && jsKanban.includes('const btChip ='));
check('B2 (css + xuong2): chip .tag-baotinh-used + tháº» lÃ´ Kho dÃ¹ng baoTinhUsedLabel + Ä‘Ã£ export',
  cssHtml.includes('.tag-badge.tag-baotinh-used') && jsX2.includes('baoTinhUsedLabel(b)') &&
  jsX2.includes('baoTinhUsedLabel,') && jsX2.includes('baoTinhUsedUpItems,'));
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
// â”€â”€â”€ Cáº¤U TRÃšC Má»šI: khung lá»‹ch sá»­ khÃ´ng láº·p + 2 Ã´ tÃ¬m Káº¾T Há»¢P â”€â”€â”€â”€â”€â”€
check('Cáº¤U TRÃšC (index.html): khung "Lá»‹ch Sá»­ BÃ o Tinh" KHÃ”NG cÃ²n Láº¶P â€” 1 khung Â· 1 tiÃªu Ä‘á» Â· 1 nÃºt thu gá»n',
  (idxHtml.match(/id="x2-btinh-table-wrap"/g) || []).length === 1 &&
  (idxHtml.match(/id="btn-toggle-x2btinh-table"/g) || []).length === 1 &&
  (idxHtml.match(/id="x2-btinh-table-count"/g) || []).length === 1 &&
  (idxHtml.match(/id="x2-btinh-day-cards"/g) || []).length === 1);
check('Cáº¤U TRÃšC (index.html): sá»‘ <div> cÃ¢n báº±ng </div> (tháº» card Ä‘Ã³ng Ä‘Ãºng, khÃ´ng lá»“ng nháº§m)',
  (idxHtml.match(/<div/g) || []).length === (idxHtml.match(/<\/div>/g) || []).length);
check('Cáº¤U TRÃšC (index.html): 2 Ã´ tÃ¬m (Ã´ chá»¯ + Ã´ Sá» LÆ¯á»¢NG) á»Ÿ cáº£ 2 danh sÃ¡ch tháº» BÃ o Tinh',
  idxHtml.includes('id="x2-btinh-qty-search"') && idxHtml.includes('id="x2-btinh-bt-in-qty-search"') &&
  idxHtml.indexOf('id="x2-btinh-qty-search"') > idxHtml.indexOf('id="x2-btinh-search"') &&
  idxHtml.indexOf('id="x2-btinh-bt-in-qty-search"') > idxHtml.indexOf('id="x2-btinh-bt-in-search"'));
check('Cáº¤U TRÃšC (events.js + xuong2.js): ná»‘i 2 Ã´ sá»‘ lÆ°á»£ng + hÃ m lá»c sá»‘ lÆ°á»£ng & khá»›p 2 Ã´',
  jsEventsSt.includes("safeOn('x2-btinh-qty-search', 'input', renderX2BaoTinhList)") &&
  jsEventsSt.includes("safeOn('x2-btinh-bt-in-qty-search', 'input', renderBaoThanhInputList)") &&
  jsX2.includes('function baoTinhQtyQuery') && jsX2.includes('function baoTinhListMatch') &&
  jsX2.includes('baoTinhQtyMatchVals([it.remaining, it.total], qQty)') && jsX2.includes('plainTxt'));
check('Cáº¤U TRÃšC (styles.css): Ã´ tÃ¬m sá»‘ lÆ°á»£ng .al-search-qty dÃ¹ng chung', cssHtml.includes('.al-search-qty {'));
check('Cáº¤U TRÃšC (sw.js): Ä‘Ã£ tÄƒng CACHE_NAME v486', /nha-may-ngoc-son-v486/.test(swJs));
console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

