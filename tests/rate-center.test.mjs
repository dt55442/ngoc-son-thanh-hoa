// tests/rate-center.test.mjs â€” Báº¢NG Äá»ŠNH Má»¨C Tá»”NG Há»¢P + PHÃŠ DUYá»†T (js/rate-center.js)
// 1. Registry: XÆ°á»Ÿng 2 = 14 cÃ´ng Ä‘oáº¡n (19 cá»™t â€” Than HÃ³a + Sáº¥y 6 cá»™t),
//    XÆ°á»Ÿng 1 = 8 cÃ´ng Ä‘oáº¡n.
// 2. ThÃ¡ng: gom tá»« Ä‘á»‹nh má»©c Ä‘Ã£ cÃ³ + dá»¯ liá»‡u sáº£n xuáº¥t + thÃ¡ng hiá»‡n táº¡i.
// 3. LÆ°u & trÃ¬nh: ghi Ä‘Ãºng dict (ká»ƒ cáº£ say lá»“ng), Ã´ trá»‘ng = 0 (KHÃ”NG xoÃ¡ khoÃ¡),
//    say trá»‘ng = máº·c Ä‘á»‹nh, cháº·n sá»‘ Ã¢m; táº¡o báº£n ghi chá» duyá»‡t + áº£nh chá»¥p values.
// 4. PhÃª duyá»‡t: Admin + Ban Quáº£n LÃ½ duyá»‡t Ä‘Æ°á»£c; Editor/NgÆ°á»i xem bá»‹ cháº·n.
//    Sá»­a Ä‘á»‹nh má»©c sau khi duyá»‡t â†’ "Cáº§n duyá»‡t láº¡i" (so áº£nh chá»¥p), khÃ´ng duyá»‡t Ä‘Æ°á»£c.
// 5. NgÆ°á»i xem: chá»‰ Ä‘á»c sá»‘ + "Duyá»‡t bá»Ÿi ..." (khÃ´ng cÃ³ input/nÃºt LÆ°u).
// 6. Cáº¥u trÃºc: nÃºt cáº¡nh Lá»‹ch Sá»­, modal, ná»‘i storage/cloud/history/main/sw v295.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng cÃ¡c test tháº» XÆ°á»Ÿng 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
state.currentUser = { username: 'admin', role: 'admin', name: 'Quáº£n Trá»‹ A', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';
state.batches = [];
const rc = await import('../js/rate-center.js');

// â”€â”€â”€ DOM GIáº¢: dÃ²ng thÃ¡ng + Ã´ nháº­p cá»§a báº£ng Ä‘á»‹nh má»©c â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let rowInputs = {};
global.document.querySelector = (sel) => {
  if (typeof sel === 'string' && sel.indexOf('#rc-body tr[data-rc-month=') === 0) {
    return {
      querySelector: (s) => {
        const m = /data-rc-field="([^"]+)"/.exec(String(s || ''));
        return m ? (rowInputs[m[1]] || null) : null;
      }
    };
  }
  return makeEl();
};
function setInputs(map) {
  rowInputs = {};
  Object.keys(map || {}).forEach(k => { rowInputs[k] = { value: String(map[k]) }; });
}
function baseMap(overrides) {
  const m = {};
  rc.RC_WORKSHOPS.x2.fields.forEach(f => { m[f.key] = ''; });
  return Object.assign(m, overrides || {});
}

// â”€â”€â”€ A. REGISTRY: Äá»¦ CÃ”NG ÄOáº N Cá»¦A Tá»ªNG XÆ¯á»žNG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const x2Groups = [...new Set(rc.RC_WORKSHOPS.x2.fields.map(f => f.group))];
const X2_DOUBLE = ['Bullig', 'Cáº¯t VÃ¡n', 'BÃ o VÃ¡n'];
const x2StageUnits = rc.RC_WORKSHOPS.x2.fields.filter(f => X2_DOUBLE.includes(f.group)).length +
  new Set(rc.RC_WORKSHOPS.x2.fields.filter(f => !X2_DOUBLE.includes(f.group)).map(f => f.group)).size;
check('A1: Ä‘Äƒng kÃ½ 2 xÆ°á»Ÿng (x2 Â· x1), máº·c Ä‘á»‹nh má»Ÿ theo xÆ°á»Ÿng Ä‘ang xem',
  Object.keys(rc.RC_WORKSHOPS).length === 2 && rc.RC_WORKSHOPS.x1.label === 'XÆ°á»Ÿng 1' && rc.RC_WORKSHOPS.x2.label === 'XÆ°á»Ÿng 2');
check('A2: XÆ°á»Ÿng 2 = 10 cÃ´ng Ä‘oáº¡n cÃ²n cÃ´ng suáº¥t Â· Cáº¯t VÃ¡n/BÃ o VÃ¡n khÃ´ng cÃ²n dÃ²ng ÄM',
  x2StageUnits === 10 && rc.RC_WORKSHOPS.x2.fields.every(f =>
    f.group !== 'Cáº¯t VÃ¡n' && f.group !== 'BÃ o VÃ¡n'));
check('A3: Than HÃ³a + Sáº¥y cÃ³ 6 cá»™t (S1/S2 Ã— VÃ¡n/Bullig phÃºt + mÂ³/láº§n lÃ´ cÅ©)',
  rc.RC_WORKSHOPS.x2.fields.filter(f => f.group === 'Than HÃ³a + Sáº¥y').length === 6);
check('A4: XÆ°á»Ÿng 1 = 8 cÃ´ng Ä‘oáº¡n, Cáº¢ 8 Ä‘Æ¡n vá»‹ kg/h',
  rc.RC_WORKSHOPS.x1.fields.length === 8 && rc.RC_WORKSHOPS.x1.fields.every(f => f.sub === 'kg/h'));
check('A5: chá»‰ Bullig cÃ²n 2 chá»‰ sá»‘; Ã‰p VÃ¡n giá»¯ mÂ³/h',
  rc.RC_WORKSHOPS.x2.fields.filter(f => f.group === 'Bullig').length === 2 &&
  rc.RC_WORKSHOPS.x2.fields.some(f => f.group === 'Ã‰p VÃ¡n' && f.sub === 'mÂ³/h'));

// â”€â”€â”€ B. DANH SÃCH THÃNG + GIÃ TRá»Š â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Äá»‹nh má»©c Bá»‘c Luá»“ng Â· Cáº¯t Chá»n nay lÃ  Sá» XE/GIá»œ (21/10/2026)
state.x2CapRates = { '2026-09': 2.5 };
state.xuong2CutRecords = [{ id: 'c1', date: '2026-10-05' }];
const months2 = rc.rcMonthsOf('x2');
check('B1: gom thÃ¡ng Ä‘Ã£ cÃ³ Ä‘á»‹nh má»©c + thÃ¡ng cÃ³ dá»¯ liá»‡u sáº£n xuáº¥t',
  months2.includes('2026-09') && months2.includes('2026-10'));
check('B2: sáº¯p xáº¿p má»›i nháº¥t trÆ°á»›c', months2.indexOf('2026-10') < months2.indexOf('2026-09'));
check('B3: hÃ¬nh chá»¥p giÃ¡ trá»‹ chá»‰ gá»“m chá»‰ sá»‘ > 0',
  rc.rcMonthValues('x2', '2026-09').cut === 2.5 &&
  Object.keys(rc.rcMonthValues('x2', '2026-09')).length === 1);
check('B4: 2 cá»™t Bá»‘c Luá»“ng Â· Cáº¯t Chá»n dÃ¹ng Ä‘Æ¡n vá»‹ xe/h',
  ['boluong', 'cut'].every(k => rc.RC_WORKSHOPS.x2.fields.find(f => f.key === k).sub === 'xe/h'));
check('B5: sá»‘ CÅ¨ khai theo kg/h Ä‘Æ°á»£c quy Ä‘á»•i Ã· 600 (1500 â†’ 2,5 xe/h), sá»‘ xe/h giá»¯ nguyÃªn',
  rc.rcXeRate(1500) === 2.5 && rc.rcXeRate(2.5) === 2.5);

// â”€â”€â”€ C. LÆ¯U & TRÃŒNH DUYá»†T â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
setInputs(baseMap({
  cut: 2.6, boluong: 2, baotho: 900,
  'say.s1.van': 110, 'say.s1.bullig': 100, 'say.s2.van': 55,
  'say.s2.bullig': 50, 'say.s1.m3': 2.5, 'say.s2.m3': 2
}));
const okSave = rc.rcSaveMonth('x2', '2026-10');
check('C1: Admin lÆ°u Ä‘Æ°á»£c â€” ghi Ä‘Ãºng dict cáº¯t/bá»‘c (xe/h) + bÃ o thÃ´ (thanh/h)',
  okSave === true && state.x2CapRates['2026-10'] === 2.6 &&
  state.x2BoluongRates['2026-10'] === 2 && state.x2BaoThoRates['2026-10'] === 900);
check('C2: Than HÃ³a + Sáº¥y ghi Ä‘Ãºng object lá»“ng van/bullig/m3',
  state.x2SayRates.s1['2026-10'].van.phut === 110 &&
  state.x2SayRates.s1['2026-10'].bullig.phut === 100 &&
  state.x2SayRates.s2['2026-10'].van.phut === 55 &&
  state.x2SayRates.s1['2026-10'].m3 === 2.5);
check('C3: Ã´ trá»‘ng â†’ ghi 0 vÃ  GIá»® khoÃ¡ thÃ¡ng (khÃ´ng xoÃ¡ khoÃ¡ â€” quy táº¯c 80)',
  state.x2BoOngRates['2026-10'] === 0 && Object.prototype.hasOwnProperty.call(state.x2BoOngRates, '2026-10'));
const rec1 = rc.rcApprovalOf('x2', '2026-10');
check('C4: táº¡o báº£n ghi CHá»œ DUYá»†T + áº£nh chá»¥p values + ngÆ°á»i trÃ¬nh',
  !!rec1 && rec1.status === 'cho_duyet' && rec1.values.cut === 2.6 &&
  rec1.values['say.s1.van'] === 110 && rec1.submittedByName === 'Quáº£n Trá»‹ A');
check('C5: localStorage lÆ°u báº£n ghi phÃª duyá»‡t + dict Ä‘á»‹nh má»©c',
  String(localStorage.getItem('bamboo_tracker_rate_approvals_v1') || '').includes('rc-x2-2026-10') &&
  String(localStorage.getItem('bamboo_tracker_x2_capacity_rate_v1') || '').includes('2.6'));

// Sá»‘ Ã¢m bá»‹ cháº·n, khÃ´ng ghi gÃ¬
setInputs(baseMap({ cut: '-5' }));
const okNeg = rc.rcSaveMonth('x2', '2026-10');
check('C6: cháº·n sá»‘ Ã¢m â€” tráº£ false vÃ  KHÃ”NG Ä‘á»•i Ä‘á»‹nh má»©c',
  okNeg === false && state.x2CapRates['2026-10'] === 2.6);

// Ã” trá»‘ng cá»§a Than HÃ³a + Sáº¥y â†’ ghi Máº¶C Äá»ŠNH (105/50/2)
setInputs(baseMap({ cut: 2.6 }));
rc.rcSaveMonth('x2', '2026-10');
check('C7: Than HÃ³a + Sáº¥y Ä‘á»ƒ trá»‘ng â†’ máº·c Ä‘á»‹nh S1 105 Â· S2 50 Â· 2 mÂ³',
  state.x2SayRates.s1['2026-10'].van.phut === 105 &&
  state.x2SayRates.s2['2026-10'].van.phut === 50 &&
  state.x2SayRates.s1['2026-10'].m3 === 2);

// â”€â”€â”€ D. PHÃŠ DUYá»†T: QUYá»€N + Tá»° PHÃT HIá»†N Sá» ÄÃƒ Äá»”I â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const recD = rc.rcApprovalOf('x2', '2026-10');
state.currentUser = { username: 'admin', role: 'admin', name: 'Quáº£n Trá»‹ A', editTabs: [], allowAdvanced: true };
const okApprove = rc.rcApproveMonth('x2', '2026-10');
check('D1: Admin duyá»‡t Ä‘Æ°á»£c â€” ghi ngÆ°á»i duyá»‡t + thá»i Ä‘iá»ƒm',
  okApprove === true && recD.status === 'da_duyet' &&
  recD.approvedByName === 'Quáº£n Trá»‹ A' && !!recD.approvedAt);
check('D2: tráº¡ng thÃ¡i chuyá»ƒn "ÄÃ£ duyá»‡t"', rc.rcApprovalState('x2', '2026-10').code === 'approved');

// Sá»­a Ä‘á»‹nh má»©c trá»±c tiáº¿p (mÃ´ phá»ng popup Ä‘á»‹nh má»©c cÅ© cá»§a tháº») â†’ phÃ¡t hiá»‡n lá»‡ch
state.x2CapRates['2026-10'] = 2.7;
check('D3: sá»‘ Ä‘á»•i sau khi duyá»‡t â†’ "Cáº§n duyá»‡t láº¡i" (so áº£nh chá»¥p)',
  rc.rcApprovalState('x2', '2026-10').code === 'changed');
check('D4: KHÃ”NG duyá»‡t láº¡i Ä‘Æ°á»£c khi sá»‘ Ä‘Ã£ Ä‘á»•i (pháº£i lÆ°u láº¡i trÆ°á»›c)',
  rc.rcApproveMonth('x2', '2026-10') === false);

// Admin lÆ°u láº¡i = trÃ¬nh duyá»‡t láº¡i vá»›i áº£nh chá»¥p má»›i
setInputs(baseMap({ cut: 2.7 }));
rc.rcSaveMonth('x2', '2026-10');
const recD5 = rc.rcApprovalOf('x2', '2026-10');
check('D5: lÆ°u láº¡i â†’ Chá» duyá»‡t + áº£nh chá»¥p má»›i + xoÃ¡ ngÆ°á»i duyá»‡t cÅ©',
  recD5.status === 'cho_duyet' && recD5.values.cut === 2.7 && recD5.approvedAt === '' && recD5.approvedByName === '');

// Ban Quáº£n LÃ½ (Ban lÃ£nh Ä‘áº¡o): duyá»‡t Ä‘Æ°á»£c nhÆ°ng KHÃ”NG nháº­p Ä‘á»‹nh má»©c
state.currentUser = { username: 'ql1', role: 'manager', name: 'Ban QL B', editTabs: [], allowAdvanced: true };
check('D6: Ban Quáº£n LÃ½ duyá»‡t Ä‘Æ°á»£c',
  rc.rcApproveMonth('x2', '2026-10') === true &&
  rc.rcApprovalOf('x2', '2026-10').approvedByName === 'Ban QL B');
setInputs(baseMap({ cut: 1900 }));
const okMgrSave = rc.rcSaveMonth('x2', '2026-10');
check('D7: Ban Quáº£n LÃ½ KHÃ”NG Ä‘Æ°á»£c nháº­p Ä‘á»‹nh má»©c (giá»¯ quy táº¯c 34)',
  okMgrSave === false && state.x2CapRates['2026-10'] === 2.7);

state.currentUser = { username: 'ed1', role: 'editor', name: 'Editor C' };
check('D8: NgÆ°á»i chá»‰nh sá»­a KHÃ”NG duyá»‡t Ä‘Æ°á»£c', rc.rcApproveMonth('x2', '2026-10') === false);
state.currentUser = { username: 'v1', role: 'viewer', name: 'NgÆ°á»i Xem D' };
check('D9: NgÆ°á»i xem KHÃ”NG duyá»‡t Ä‘Æ°á»£c + KHÃ”NG nháº­p Ä‘Æ°á»£c',
  rc.rcApproveMonth('x2', '2026-10') === false && rc.rcSaveMonth('x2', '2026-10') === false);

// â”€â”€â”€ E. HIá»‚N THá»Š THEO QUYá»€N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const body = document.getElementById('rc-body');
state.currentUser = { username: 'admin', role: 'admin', name: 'Quáº£n Trá»‹ A', editTabs: [], allowAdvanced: true };
rc.renderRateCenter();
check('E1: Admin tháº¥y Ã´ nháº­p + nÃºt "LÆ°u & trÃ¬nh"',
  body.innerHTML.includes('data-rc-field="cut"') && body.innerHTML.includes('LÆ°u &amp; trÃ¬nh'));

state.currentUser = { username: 'v1', role: 'viewer', name: 'NgÆ°á»i Xem D' };
rc.renderRateCenter();
check('E2: NgÆ°á»i xem chá»‰ Ä‘á»c â€” KHÃ”NG cÃ³ Ã´ nháº­p / nÃºt LÆ°u',
  !body.innerHTML.includes('<input') && !body.innerHTML.includes('data-rc-save'));
check('E3: NgÆ°á»i xem tháº¥y thÃ´ng tin "Duyá»‡t bá»Ÿi â€¦"',
  body.innerHTML.includes('Duyá»‡t bá»Ÿi Ban QL B'));

// ThÃ¡ng Ä‘ang CHá»œ DUYá»†T â†’ Ban Quáº£n LÃ½ tháº¥y nÃºt Duyá»‡t
state.rateApprovals.push({
  id: 'rc-x2-2026-08', ws: 'x2', month: '2026-08', status: 'cho_duyet',
  values: { cut: 2.5 }, submittedBy: 'admin@x', submittedByName: 'Quáº£n Trá»‹ A',
  submittedAt: '2026-08-31T08:00:00.000Z', createdAt: '2026-08-31T08:00:00.000Z',
  updatedAt: '2026-08-31T08:00:00.000Z'
});
state.x2CapRates['2026-08'] = 2.5;
state.currentUser = { username: 'ql1', role: 'manager', name: 'Ban QL B', editTabs: [], allowAdvanced: true };
rc.renderRateCenter();
check('E4: Ban Quáº£n LÃ½ tháº¥y nÃºt Duyá»‡t cho thÃ¡ng CHá»œ DUYá»†T',
  body.innerHTML.includes('data-rc-approve="2026-08"'));
check('E5: Than HÃ³a + Sáº¥y cÃ³ Ã´ máº·c Ä‘á»‹nh (placeholder) khi chÆ°a khai',
  (() => {
    state.x2SayRates = { s1: {}, s2: {} };
    state.currentUser = { username: 'admin', role: 'admin', name: 'Quáº£n Trá»‹ A', editTabs: [], allowAdvanced: true };
    rc.renderRateCenter();
    return body.innerHTML.includes('placeholder="105"') && body.innerHTML.includes('placeholder="2"');
  })());

// â”€â”€â”€ F. HUY HIá»†U Sá» THÃNG CHá»œ DUYá»†T â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
rc.updateRatePendingBadge();
const badge = document.getElementById('btn-rate-pending');
const pendingN = rc.rcPendingCount();
check('F1: badge Ä‘áº¿m Ä‘Ãºng sá»‘ thÃ¡ng chá» duyá»‡t / cáº§n duyá»‡t láº¡i',
  badge.textContent === String(pendingN) && badge.hidden === (pendingN === 0) && pendingN >= 1);

// â”€â”€â”€ G. Náº P / LÆ¯U Báº¢N GHI (gá»™p trÃ¹ng id, báº£n má»›i hÆ¡n tháº¯ng) â”€â”€â”€â”€
state.rateApprovals = [
  { id: 'rc-x1-2026-09', ws: 'x1', month: '2026-09', status: 'cho_duyet', values: {}, updatedAt: '2026-09-01T00:00:00.000Z' },
  { id: 'rc-x1-2026-09', ws: 'x1', month: '2026-09', status: 'da_duyet', values: {}, approvedByName: 'QL', updatedAt: '2026-09-02T00:00:00.000Z' }
];
rc.saveRateApprovals();
check('G1: lÆ°u xuá»‘ng localStorage â€” gá»™p trÃ¹ng id cÃ²n 1 báº£n ghi',
  (() => {
    const arr = JSON.parse(localStorage.getItem('bamboo_tracker_rate_approvals_v1') || '[]');
    return arr.filter(r => r.id === 'rc-x1-2026-09').length === 1 &&
      arr.find(r => r.id === 'rc-x1-2026-09').status === 'da_duyet';
  })());
state.rateApprovals = [];
rc.loadRateApprovals();
check('G2: náº¡p láº¡i tá»« localStorage â€” giá»¯ báº£n má»›i hÆ¡n',
  state.rateApprovals.some(r => r.id === 'rc-x1-2026-09' && r.status === 'da_duyet'));

// â”€â”€â”€ I. SO áº¢NH CHá»¤P GIÃ TRá»Š â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('I1: cÃ¹ng khoÃ¡/giÃ¡ trá»‹ (khÃ¡c thá»© tá»±) â†’ khá»›p',
  rc.rcSameValues({ a: 1, b: 2 }, { b: 2, a: 1 }) === true);
check('I2: lá»‡ch giÃ¡ trá»‹ hoáº·c thiáº¿u khoÃ¡ â†’ KHÃ”NG khá»›p',
  rc.rcSameValues({ a: 1 }, { a: 2 }) === false && rc.rcSameValues({ a: 1 }, {}) === false);

// â”€â”€â”€ J. Má»ž / CHUYá»‚N XÆ¯á»žNG / ÄÃ“NG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.currentUser = { username: 'admin', role: 'admin', name: 'Quáº£n Trá»‹ A', editTabs: [], allowAdvanced: true };
rc.openRateCenter('x1');
check('J1: má»Ÿ báº£ng theo XÆ°á»Ÿng 1 â†’ 8 cÃ´ng Ä‘oáº¡n + modal hiá»‡n',
  body.innerHTML.includes('Lá»c Thanh/BÃ³ XÃ´') &&
  document.getElementById('modal-rate-center').classList.contains('show'));
check('J2: chuyá»ƒn sang XÆ°á»Ÿng 2 ngay trong modal', rc.setRateCenterWs('x2') === true &&
  body.innerHTML.includes('Ã‰p VÃ¡n') && body.innerHTML.includes('Than HÃ³a + Sáº¥y'));
check('J3: Ä‘Ã³ng modal', rc.closeRateCenter() === true &&
  !document.getElementById('modal-rate-center').classList.contains('show'));

// â”€â”€â”€ H. Cáº¤U TRÃšC MÃƒ NGUá»’N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const readSrc = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const idx = readSrc('index.html');
const ev = readSrc('js/events.js');
const sw = readSrc('sw.js');
const stSrc = readSrc('js/state.js');
const stg = readSrc('js/storage.js');
const cl = readSrc('js/cloud.js');
const hist = readSrc('js/history.js');
const main = readSrc('js/main.js');
const css = readSrc('styles.css');
const pkg = readSrc('package.json');
check('H1: nÃºt "Äá»‹nh Má»©c" Ä‘á»©ng ngay TRÆ¯á»šC nÃºt "Lá»‹ch Sá»­" trÃªn thanh tiÃªu Ä‘á»',
  idx.indexOf('id="btn-rate-center"') > 0 &&
  idx.indexOf('id="btn-rate-center"') < idx.indexOf('id="btn-history-kanban"'));
check('H2: index.html cÃ³ Ä‘á»§ modal + id báº¯t buá»™c',
  ['modal-rate-center', 'btn-close-rate-center', 'rc-body', 'btn-rc-close', 'btn-rate-pending']
    .every(id => idx.includes(`id="${id}"`)));
check('H3: Ä‘Ã£ áº©n 19 nÃºt Ä‘á»‹nh má»©c cÅ© trong cÃ¡c tháº» (giá»¯ id cho tÆ°Æ¡ng thÃ­ch)',
  (idx.match(/id="btn-(?:x2|x1)-[a-z-]+-rate" hidden/g) || []).length >= 19);
check('H4: events.js ná»‘i má»Ÿ/Ä‘Ã³ng + uá»· nhiá»‡m click trong #rc-body',
  ev.includes("safeOn('btn-rate-center'") && ev.includes("safeOn('rc-body'") &&
  ev.includes('onRateCenterClick') && ev.includes("safeOn('btn-rc-close'"));
check('H5: sw.js CACHE_NAME v486 + js/rate-center.js trong APP_SHELL',
  sw.includes('nha-may-ngoc-son-v486') && sw.includes("'./js/rate-center.js'"));
check('H6: state.js cÃ³ key + máº£ng rateApprovals + APP_VERSION v486',
  stSrc.includes('bamboo_tracker_rate_approvals_v1') &&
  stSrc.includes('rateApprovals: []') && stSrc.includes("APP_VERSION = 'v486'"));
check('H7: storage.js ná»‘i restore + ghi vÃ o 2 file snapshot',
  stg.includes('function restoreRateApprovals') &&
  (stg.match(/rateApprovals: state\.rateApprovals \|\| \[\]/g) || []).length >= 2);
check('H8: cloud.js ná»‘i snapshot / cloudCore / gá»™p mÃ¢y / persist / applyFireSnapshot',
  ['rateApprovals: state.rateApprovals || []', 'rateApprovals: obj.rateApprovals || []',
    "clean('rateApprovals'", 'STORAGE_KEY_RATE_APPROVALS'].every(s => cl.includes(s)));
check('H9: rateApprovals KHÃ”NG náº±m trong tÆ°á»ng lá»­a RATE_DOMAINS (BQL pháº£i Ä‘áº©y Ä‘Æ°á»£c báº£n duyá»‡t)',
  (() => {
    const start = cl.indexOf('const RATE_DOMAINS');
    const blk = cl.slice(start, cl.indexOf(']);', start));
    return start > 0 && !blk.includes("'rateApprovals'");
  })());
check('H10: history.js + main.js ná»‘i Ä‘á»§ (DOMAIN + load boot + badge renderAll)',
  hist.includes('rateApprovals:') && main.includes('loadRateApprovals') &&
  main.includes('updateRatePendingBadge'));
check('H11: styles.css cÃ³ báº£ng + chip tráº¡ng thÃ¡i + badge chá» duyá»‡t',
  css.includes('.rc-table {') && css.includes('.rc-status.is-ok') &&
  css.includes('.rc-pending-chip') && css.includes('.rate-center-card'));
check('H12: package.json Ä‘Ã£ thÃªm tests/rate-center.test.mjs vÃ o chuá»—i npm test',
  pkg.includes('tests/rate-center.test.mjs'));

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

