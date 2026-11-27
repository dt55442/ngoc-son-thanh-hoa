// tests/hr-shift-schedule.test.mjs â€” CÃ€I Äáº¶T CA THEO Má»C HIá»†U Lá»°C (11/2026)
// Xá»­ lÃ½ tÃ¬nh huá»‘ng "lÃ£nh Ä‘áº¡o Ä‘á»•i giá» lÃ m viá»‡c giá»¯a ká»³":
//  â€¢ hrShiftCfg(dept, date) chá»n cáº¥u hÃ¬nh cÃ³ hiá»‡u lá»±c táº¡i ngÃ y â€” quÃ¡ khá»© giá»¯
//    nguyÃªn sá»‘ liá»‡u, hÃ´m nay/tÆ°Æ¡ng lai dÃ¹ng báº£n má»›i.
//  â€¢ hrShiftApplyVersion lÆ°u báº£n cÅ© vÃ o versions (má»‘c hiá»‡u lá»±c riÃªng).
//  â€¢ migrateShiftEffectiveDates di trÃº dá»¯ liá»‡u cÅ© (idempotent).
//  â€¢ Giá» nghá»‰: máº·c Ä‘á»‹nh GIá»®A CA (sá»‘ giá») + tuá»³ chá»n GIá»œ Cá»¤ THá»‚ trÃªn giao diá»‡n.
//  â€¢ handleShiftSubmit: Ä‘á»c form (DOM stub) â†’ validate â†’ lÆ°u theo má»‘c hiá»‡u lá»±c.
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng hr-shift-break.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const { state, STORAGE_KEY_HR_SHIFTS, STORAGE_KEY_HR_ASSIGN } = await import('../js/state.js');
const hr = await import('../js/hr.js');
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log('PASS â€”', name); } else { fail++; console.log('FAIL â€”', name); } };

state.currentUser = { username: 'admin', role: 'admin', fullname: 'Quáº£n Trá»‹', editTabs: [], allowAdvanced: true };
state.hrWorkCalendar = {};
state.hrEmployees = []; state.hrPositions = []; state.hrShifts = [];
state.hrAssignments = [{ id: 'asg-1', date: '2026-10-20', department: 'XÆ°á»Ÿng 2', positionId: 'p1', shiftIdx: 0, employeeId: 'e1', start: '07:00', end: '' }];
state.hrAttendance = []; state.hrCheckins = []; state.hrLeaves = [];
state.hrOvertimes = []; state.hrCiAcks = []; state.hrPayRows = []; state.hrPayLocks = [];
state.hrRecruitment = []; state.hrPositionNeeds = [];

// â”€â”€â”€ DOM giáº£ cho form CÃ i Äáº·t Ca â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// rows = [[i, field, value], ...] Â· tráº£ vá» hÃ m khÃ´i phá»¥c
function patchShiftForm(type, rows) {
  const origQ = global.document.querySelector.bind(global.document);
  const origQA = global.document.querySelectorAll.bind(global.document);
  const fakeInputs = rows.map(([i, f, v]) => ({
    value: v,
    getAttribute: (name) => (name === 'data-shift-i' ? String(i) : name === 'data-shift-f' ? f : null)
  }));
  global.document.querySelector = (sel) => sel.includes('shift-type') ? { value: type } : origQ(sel);
  global.document.querySelectorAll = (sel) => sel.includes('data-shift-i') ? fakeInputs : origQA(sel);
  const boxEl = document.getElementById('shift-rows');
  boxEl.querySelectorAll = (sel) => sel.includes('data-shift-i') ? fakeInputs : [];
  document.getElementById('shift-dept').value = 'XÆ°á»Ÿng 2';
  document.getElementById('shift-effective').value = '';
  return () => {
    global.document.querySelector = origQ;
    global.document.querySelectorAll = origQA;
  };
}
function submit(type, rows, eff) {
  const restore = patchShiftForm(type, rows);
  document.getElementById('shift-effective').value = eff || '';
  try { hr.handleShiftSubmit({ preventDefault() {} }); } finally { restore(); }
}
const H = (dept, s, e, idx, date) => hr.hrSplitHoursHC(dept, s, e, idx, date);
const eq = (r, hc, tc) => r.hc === hc && r.tc === tc;

// â•â•â• A. Äá»ŒC FORM (hrShiftRowsFromDom) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
check('A1: LÃ m ca 2 dÃ²ng há»£p lá»‡ â†’ 2 ca + máº·c Ä‘á»‹nh nghá»‰ 1.5/1', (() => {
  const restore = patchShiftForm('lamca', [
    [0, 'name', 'Ca ngÃ y'], [0, 'start', '07:00'], [0, 'end', '19:00'], [0, 'brk', ''], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', ''],
    [1, 'name', 'Ca Ä‘Ãªm'], [1, 'start', '19:00'], [1, 'end', '07:00'], [1, 'brk', ''], [1, 'brkMode', 'auto'], [1, 'brkStart', ''], [1, 'brkEnd', '']
  ]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.error === '' && r.shifts.length === 2 && r.shifts[0].brk === 1.5 && r.shifts[1].brk === 1;
})());
check('A2: Giá» cá»¥ thá»ƒ â†’ giá»¯ brkStart/brkEnd + brk suy ra', (() => {
  const restore = patchShiftForm('lamca', [
    [0, 'name', 'Ca ngÃ y'], [0, 'start', '07:00'], [0, 'end', '17:30'],
    [0, 'brk', '1.5'], [0, 'brkMode', 'exact'], [0, 'brkStart', '11:30'], [0, 'brkEnd', '13:00']
  ]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.error === '' && r.shifts.length === 1 && r.shifts[0].brkMode === 'exact' && r.shifts[0].brkStart === '11:30' && r.shifts[0].brkEnd === '13:00' && r.shifts[0].brk === 1.5;
})());
check('A3: giá» káº¿t thÃºc TRÃ™NG giá» báº¯t Ä‘áº§u â†’ bÃ¡o lá»—i rÃµ rÃ ng', (() => {
  const restore = patchShiftForm('lamca', [[0, 'name', 'C'], [0, 'start', '07:00'], [0, 'end', '07:00'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', '']]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.shifts.length === 0 && r.error.includes('pháº£i khÃ¡c giá» báº¯t Ä‘áº§u');
})());
check('A4: giá» khÃ´ng Ä‘Ãºng HH:MM â†’ bÃ¡o lá»—i', (() => {
  const restore = patchShiftForm('lamca', [[0, 'name', 'C'], [0, 'start', '7h00'], [0, 'end', '17:30'], [0, 'brk', '1'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', '']]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.shifts.length === 0 && r.error.includes('HH:MM');
})());
check('A5: chá»n Giá» cá»¥ thá»ƒ nhÆ°ng thiáº¿u 1 má»‘c â†’ bÃ¡o lá»—i', (() => {
  const restore = patchShiftForm('lamca', [[0, 'name', 'C'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'exact'], [0, 'brkStart', '11:30'], [0, 'brkEnd', '']]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.shifts.length === 0 && r.error.includes('Giá» cá»¥ thá»ƒ');
})());
check('A6: giá» nghá»‰ cá»¥ thá»ƒ dÃ i quÃ¡ 3 giá» â†’ bÃ¡o lá»—i', (() => {
  const restore = patchShiftForm('lamca', [[0, 'name', 'C'], [0, 'start', '07:00'], [0, 'end', '19:00'], [0, 'brk', '1.5'], [0, 'brkMode', 'exact'], [0, 'brkStart', '10:00'], [0, 'brkEnd', '14:30']]);
  const r = hr.hrShiftRowsFromDom('lamca');
  restore();
  return r.shifts.length === 0 && r.error.includes('3 giá»');
})());
check('A7: HÃ nh chÃ­nh â†’ brk = 0, khÃ´ng cáº§n Ã´ nghá»‰', (() => {
  const restore = patchShiftForm('hanhchinh', [
    [0, 'name', 'SÃ¡ng'], [0, 'start', '07:00'], [0, 'end', '11:30'],
    [1, 'name', 'Chiá»u'], [1, 'start', '13:00'], [1, 'end', '17:30']
  ]);
  const r = hr.hrShiftRowsFromDom('hanhchinh');
  restore();
  return r.error === '' && r.shifts.length === 2 && r.shifts[0].brk === 0 && r.shifts[0].start === '07:00';
})());

// A8: XEM TRÆ¯á»šC dÃ¹ng cfg Táº M THá»œI cá»§a dÃ²ng Ä‘ang nháº­p (khÃ´ng tra state) â€” ca Ä‘Ãªm 20:00â€“06:00 nghá»‰ 1h = 9h HC
check('A8: ca Ä‘Ãªm 20:00â€“06:00 nghá»‰ 1h qua cfgIn = 9h HC Â· 0 TC (khÃ´ng pháº£i tÄƒng ca)', (() => {
  const cfg = { type: 'lamca', shifts: [{ name: 'Ca Ä‘Ãªm', start: '20:00', end: '06:00', brk: 1 }] };
  const rng = hr.hrShiftRange(cfg, 0);
  const r = hr.hrSplitHoursHCMin('XÆ°á»Ÿng 2', rng.startMin, rng.endMin, 0, null, cfg);
  return r.hc === 540 && r.tc === 0;
})());
check('A9: cfgIn ca ngÃ y 07:00â€“17:00 nghá»‰ 1h30 = 8h30 HC (Ä‘Ãºng form Ä‘ang nháº­p)', (() => {
  const cfg = { type: 'lamca', shifts: [{ name: 'Ca ngÃ y', start: '07:00', end: '17:00', brk: 1.5 }] };
  const rng = hr.hrShiftRange(cfg, 0);
  const r = hr.hrSplitHoursHCMin('XÆ°á»Ÿng 2', rng.startMin, rng.endMin, 0, null, cfg);
  return r.hc === 510 && r.tc === 0;
})());
check('A10: cfgIn giá» nghá»‰ Cá»¤ THá»‚ ca Ä‘Ãªm (00:30â€“01:30) = 9h HC', (() => {
  const cfg = { type: 'lamca', shifts: [{ name: 'Ca Ä‘Ãªm', start: '20:00', end: '06:00', brk: 1, brkMode: 'exact', brkStart: '00:30', brkEnd: '01:30' }] };
  const rng = hr.hrShiftRange(cfg, 0);
  const r = hr.hrSplitHoursHCMin('XÆ°á»Ÿng 2', rng.startMin, rng.endMin, 0, null, cfg);
  return r.hc === 540 && r.tc === 0;
})());

// â•â•â• B. LÆ¯U THEO Má»C HIá»†U Lá»°C (handleShiftSubmit qua DOM giáº£) â•â•â•
state.hrShifts = [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [{ name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: 1.5 }, { name: 'Ca Ä‘Ãªm', start: '19:00', end: '07:00', brk: 1 }], effectiveFrom: '2026-10-01', versions: [] }];
storeBacking.clear();
submit('lamca', [
  [0, 'name', 'Ca ngÃ y'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', ''],
  [1, 'name', 'Ca Ä‘Ãªm'], [1, 'start', '20:00'], [1, 'end', '06:00'], [1, 'brk', '1'], [1, 'brkMode', 'auto'], [1, 'brkStart', ''], [1, 'brkEnd', '']
], '2026-11-05');
const cfg2 = state.hrShifts.find(s => s.id === 'XÆ°á»Ÿng 2');
check('B1: báº£n má»›i thÃ nh hiá»‡n hÃ nh + má»‘c 05/11', cfg2.shifts[0].end === '17:30' && cfg2.effectiveFrom === '2026-11-05');
check('B2: báº£n cÅ© (má»‘c 01/10) náº±m trong versions', cfg2.versions.length === 1 && cfg2.versions[0].effectiveFrom === '2026-10-01' && cfg2.versions[0].shifts[0].end === '19:00');
check('B3: Ä‘Ã£ ghi localStorage key hrShifts (cÃ³ versions)', (() => {
  const raw = storeBacking.get(STORAGE_KEY_HR_SHIFTS);
  return !!raw && raw.includes('versions') && raw.includes('2026-11-05');
})());
check('B4: báº£n ghi cÃ³ má»‘c thá»i gian (updatedAt) Ä‘á»ƒ mÃ¡y khÃ¡c nháº­n Ä‘Ãºng', !!cfg2.updatedAt);

// â•â•â• C. SAU KHI Äá»”I â€” QUÃ KHá»¨ GIá»® NGUYÃŠN, Tá»ª Má»C Má»šI DÃ™NG GIá»œ Má»šI â•â•â•
check('C1: ngÃ y 04/11 â†’ cáº¥u hÃ¬nh CÅ¨ (19:00)', hr.hrShiftCfg('XÆ°á»Ÿng 2', '2026-11-04').shifts[0].end === '19:00');
check('C2: ngÃ y 05/11 â†’ cáº¥u hÃ¬nh Má»šI (17:30)', hr.hrShiftCfg('XÆ°á»Ÿng 2', '2026-11-05').shifts[0].end === '17:30');
check('C3: hÃ´m nay (khÃ´ng truyá»n date) â†’ cáº¥u hÃ¬nh Má»šI', hr.hrShiftCfg('XÆ°á»Ÿng 2').shifts[0].end === '17:30');
check('C4: tÃ­nh giá» quÃ¡ khá»© (04/11, Ä‘á»§ ca) = 10h30 â€” KHÃ”NG bá»‹ tÃ­nh láº¡i', eq(H('XÆ°á»Ÿng 2', '07:00', '', 0, '2026-11-04'), 630, 0));
check('C5: tÃ­nh giá» tá»« má»‘c má»›i (05/11, Ä‘á»§ ca) = 9h', eq(H('XÆ°á»Ÿng 2', '07:00', '', 0, '2026-11-05'), 540, 0));
check('C6: ca Ä‘Ãªm má»›i (20:00â€“06:00) Ä‘á»§ ca = 10h HC (12h âˆ’ 1h máº·c Ä‘á»‹nh... 20:00â€“06:00 = 10h âˆ’ 1h = 9h)', eq(H('XÆ°á»Ÿng 2', '20:00', '', 1, '2026-11-05'), 540, 0));
check('C7: bá»‘ trÃ­ Ä‘á»ƒ trá»‘ng giá» ra (háº¿t ca) trÆ°á»›c má»‘c â†’ váº«n láº¥y giá» káº¿t thÃºc CÅ¨', (() => {
  // LÆ°á»£t bá»‘ trÃ­ ngÃ y 20/10 (trÆ°á»›c má»‘c 05/11), ca 0, end rá»—ng = háº¿t ca
  const a = state.hrAssignments[0];
  const rng = hr.hrShiftRange(hr.hrShiftCfg('XÆ°á»Ÿng 2', a.date), a.shiftIdx || 0);
  return rng.end === '19:00';
})());
// C8/C9/C10: hrSplitHoursHCDate (duong cham cong / xuong 2 / ep van) PHAI phan giai theo ngay
check('C8: hrSplitHoursHCDate 04/11 (truoc moc) = 10h30 â€” KHONG bi tinh lai', (() => {
  const r = hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-11-04', '07:00', '', 0);
  return r.hc === 630 && r.tc === 0;
})());
check('C9: hrSplitHoursHCDate 05/11 (tu moc) = 9h â€” dung gio moi', (() => {
  const r = hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-11-05', '07:00', '', 0);
  return r.hc === 540 && r.tc === 0;
})());
check('C10: khung ca doi theo ngay â€” 17:30-19:30: truoc moc (kt 19:00) = 1h30 HC + 30phut TC; tu moc (kt 17:30) = 0 HC + 2h TC', (() => {
  const truoc = hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-11-04', '17:30', '19:30', 0);
  const sau = hr.hrSplitHoursHCDate('XÆ°á»Ÿng 2', '2026-11-05', '17:30', '19:30', 0);
  return truoc.hc === 90 && truoc.tc === 30 && sau.hc === 0 && sau.tc === 120;
})());


// â•â•â• D. LÆ¯U Láº I / GIá»šI Háº N Lá»ŠCH Sá»¬ â•â•â•
submit('lamca', [
  [0, 'name', 'Ca ngÃ y'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', ''],
  [1, 'name', 'Ca Ä‘Ãªm'], [1, 'start', '20:00'], [1, 'end', '06:00'], [1, 'brk', '1'], [1, 'brkMode', 'auto'], [1, 'brkStart', ''], [1, 'brkEnd', '']
], '2026-11-05');
const cfg3 = state.hrShifts.find(s => s.id === 'XÆ°á»Ÿng 2');
check('D1: lÆ°u láº¡i cÃ¹ng má»‘c â†’ versions gá»™p trÃ¹ng (2 báº£n: 01/10 + báº£n táº¡m 05/11), KHÃ”NG phÃ¬nh thÃªm', (() => {
  if (cfg3.versions.length !== 2) return false;
  submit('lamca', [
    [0, 'name', 'Ca ngÃ y'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', ''],
    [1, 'name', 'Ca Ä‘Ãªm'], [1, 'start', '20:00'], [1, 'end', '06:00'], [1, 'brk', '1'], [1, 'brkMode', 'auto'], [1, 'brkStart', ''], [1, 'brkEnd', '']
  ], '2026-11-05');
  return state.hrShifts.find(x => x.id === 'XÆ°á»Ÿng 2').versions.length === 2;
})());
check('D2: lá»‹ch sá»­ tá»‘i Ä‘a 20 báº£n', (() => {
  for (let i = 1; i <= 25; i++) submit('lamca', [
    [0, 'name', 'C'], [0, 'start', '06:00'], [0, 'end', '16:00'], [0, 'brk', '1'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', '']
  ], '2027-02-' + String(i).padStart(2, '0'));
  return state.hrShifts.find(s => s.id === 'XÆ°á»Ÿng 2').versions.length === 20;
})());

// â•â•â• E. Bá»˜ PHáº¬N CHÆ¯A Tá»ªNG CÃ€I â†’ Táº O Má»šI â•â•â•
state.hrShifts = [];
submit('lamca', [
  [0, 'name', 'Ca ngÃ y'], [0, 'start', '07:00'], [0, 'end', '17:30'], [0, 'brk', '1.5'], [0, 'brkMode', 'auto'], [0, 'brkStart', ''], [0, 'brkEnd', '']
], '2026-11-13');
const cfgNew = state.hrShifts.find(s => s.id === 'XÆ°á»Ÿng 2');
check('E1: táº¡o má»›i báº£n ghi + má»‘c hiá»‡u lá»±c + versions SEED báº£n máº·c Ä‘á»‹nh (má»‘c tá»« Ä‘áº§u)', !!cfgNew && cfgNew.effectiveFrom === '2026-11-13' && Array.isArray(cfgNew.versions) && cfgNew.versions.length === 1 && cfgNew.versions[0].effectiveFrom === '2000-01-01');

// â•â•â• F. HÃ€NH CHÃNH QUA FORM â•â•â•
state.hrShifts = [];
submit('hanhchinh', [
  [0, 'name', 'SÃ¡ng'], [0, 'start', '07:00'], [0, 'end', '11:30'],
  [1, 'name', 'Chiá»u'], [1, 'start', '13:00'], [1, 'end', '17:30']
], '2026-11-13');
const cfgHc = state.hrShifts.find(s => s.id === 'XÆ°á»Ÿng 2');
check('F1: HÃ nh chÃ­nh lÆ°u Ä‘á»§ 2 ca + brk 0', !!cfgHc && cfgHc.type === 'hanhchinh' && cfgHc.shifts.length === 2 && cfgHc.shifts[0].brk === 0);
check('F2: hÃ nh chÃ­nh 07:00â€“17:30 = 9h HC (khÃ´ng Ä‘á»•i)', eq(H('XÆ°á»Ÿng 2', '07:00', '17:30', 0), 540, 0));

// â•â•â• G. DI TRÃš â•â•â•
state.hrShifts = [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [{ name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: '05:03' }] }];
const nMig = hr.migrateShiftEffectiveDates();
check('G1: di trÃº 1 bá»™ pháº­n (dÃ¡n má»‘c + dá»n brk rÃ¡c)', nMig === 1 && state.hrShifts[0].effectiveFrom === '2000-01-01' && state.hrShifts[0].shifts[0].brk === undefined);
check('G2: sau di trÃº váº«n tÃ­nh Ä‘Ãºng (máº·c Ä‘á»‹nh 1h30)', eq(H('XÆ°á»Ÿng 2', '07:00', '19:00', 0), 630, 0));
check('G3: idempotent â€” cháº¡y láº¡i khÃ´ng ghi', hr.migrateShiftEffectiveDates() === 0);

// â•â•â• H. Cáº¤U TRÃšC (index / events / css / history / cache) â•â•â•
const idxSrc = fs.readFileSync('index.html', 'utf8');
const evSrc = fs.readFileSync('js/events.js', 'utf8');
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const histSrc = fs.readFileSync('js/history.js', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
check('H1: index cÃ³ Ã´ má»‘c hiá»‡u lá»±c + lá»‹ch sá»­ + cháº¿ Ä‘á»™ nghá»‰',
  idxSrc.includes('id="shift-effective"') && idxSrc.includes('id="shift-history"') && idxSrc.includes('id="shift-history-count"') && idxSrc.includes('shift-card'));
check('H2: events.js wire má»‘c hiá»‡u lá»±c + Ã´ giá» nghá»‰ + xem trÆ°á»›c',
  evSrc.includes("safeOn('shift-effective', 'change'") && evSrc.includes('hrSyncShiftBreakCells') && evSrc.includes('hrRefreshShiftPreviews'));
check('H3: CSS khá»‘i má»›i á»Ÿ cáº¥p cao nháº¥t (depth = 0)', (() => {
  const depth = sel => { const i = cssSrc.indexOf(sel); if (i < 0) return -1; let d = 0; for (let k = 0; k < i; k++) { if (cssSrc[k] === '{') d++; else if (cssSrc[k] === '}') d--; } return d; };
  return depth('.shift-card {') === 0 && depth('.shift-history-box {') === 0;
})());
check('H4: history.js cÃ³ vÃ¹ng hrShifts (nháº­t kÃ½ Ä‘á»•i ca)', histSrc.includes('hrShifts:') && histSrc.includes('Cáº¥u hÃ¬nh ca lÃ m viá»‡c'));
check('H5: sw.js v486', /nha-may-ngoc-son-v486/.test(swSrc));
check('H6: parse/submit/version/migrate Ä‘Ã£ export',
  typeof hr.hrShiftRowsFromDom === 'function' && typeof hr.hrShiftApplyVersion === 'function' && typeof hr.migrateShiftEffectiveDates === 'function' && typeof hr.renderShiftHistory === 'function');

// â•â•â• I. Sá»¬A NHáº¦M Má»C HIá»†U Lá»°C: NÃšT XOÃ Báº¢N Lá»ŠCH Sá»¬ + NGÃ€Y Báº°NG CHá»¨NG â•â•â•
state.hrShifts = [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '17:00', brk: 1 }], effectiveFrom: '2026-11-12', versions: [
  { effectiveFrom: '2026-11-01', type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '19:00', brk: 1.5 }], at: '2026-11-13T02:00:00.000Z' },
  { effectiveFrom: '2000-01-01', type: 'lamca', shifts: [{ name: 'C', start: '07:00', end: '17:30', brk: 1.5 }] }
] }];
document.getElementById('shift-dept').value = 'XÆ°á»Ÿng 2';
hr.renderShiftHistory(state.hrShifts[0]);
const histHtml = els.get('shift-history').innerHTML;
check('I1: má»—i báº£n lá»‹ch sá»­ cÃ³ nÃºt xoÃ¡ (data-shift-del)',
  histHtml.includes('data-shift-del="2026-11-01"') && histHtml.includes('data-shift-del="2000-01-01"'));
check('I2: hrVnDateLong viáº¿t ngÃ y Báº°NG CHá»¨NG (trÃ¡nh nháº§m dd/mm)',
  hr.hrVnDateLong('2026-11-01') === 'ngÃ y 1 thÃ¡ng 11 nÄƒm 2026' && hr.hrVnDateLong('2026-11-12') === 'ngÃ y 12 thÃ¡ng 11 nÄƒm 2026');
check('I3: ghi chÃº má»‘c hiá»‡u lá»±c ghi rÃµ ngÃ y báº±ng chá»¯', (() => {
  document.getElementById('shift-effective').value = '2026-11-01';
  hr.hrRefreshShiftEffectiveNote();
  const h = els.get('shift-effective-note').innerHTML;
  return h.includes('01/11/2026') && h.includes('ngÃ y 1 thÃ¡ng 11 nÄƒm 2026') && h.includes('QUÃ KHá»¨');
})());
check('I4: xoÃ¡ báº£n nháº§m (01/11) â†’ ngÃ y 05/11 quay vá» báº£n CÅ¨ HÆ N (2000), khÃ´ng cÃ²n dÃ¹ng báº£n 01/11', (() => {
  hr.hrDeleteShiftVersion('2026-11-01');
  const cfg = state.hrShifts.find(x => x.id === 'XÆ°á»Ÿng 2');
  return cfg.versions.length === 1 && cfg.versions[0].effectiveFrom === '2000-01-01'
    && hr.hrShiftCfg('XÆ°á»Ÿng 2', '2026-11-05').shifts[0].end === '17:30';
})());
check('I5: events.js cÃ³ á»§y quyá»n nÃºt xoÃ¡ trong lá»‹ch sá»­',
  evSrc.includes('data-shift-del') && evSrc.includes('hrDeleteShiftVersion'));

// â•â•â• J. Bá»˜ PHáº¬N CHÆ¯A Tá»ªNG CÃ€I (QC / XÆ°á»¯á»œNG 1): ngÃ y trÆ°á»›c má»‘c pháº£i giá»¯ giá» Máº¶C Äá»ŠNH â•â•â•
state.hrShifts = [];
hr.hrShiftApplyVersion('QC', { type: 'hanhchinh', shifts: [{ name: 'SÃ¡ng', start: '07:00', end: '11:30' }, { name: 'Chiá»u', start: '12:30', end: '17:00' }], effectiveFrom: '2026-11-12' });
const qc = state.hrShifts.find(x => x.id === 'QC');
check('J1: táº¡o má»›i cho bá»™ pháº­n chÆ°a cÃ i â†’ versions ÄÆ¯á»¢C SEED báº£n máº·c Ä‘á»‹nh (má»‘c tá»« Ä‘áº§u)',
  qc.versions.length === 1 && qc.versions[0].effectiveFrom === '2000-01-01' && qc.versions[0].shifts.length === 2);
check('J2: ngÃ y TRÆ¯á»šC má»‘c (05/11) â†’ dÃ¹ng giá» Máº¶C Äá»ŠNH (07:00â€“17:30), khÃ´ng dÃ¹ng giá» má»›i',
  (() => {
    const cfg = hr.hrShiftCfg('QC', '2026-11-05');
    return cfg.type === 'hanhchinh' && cfg.shifts[cfg.shifts.length - 1].end === '17:30';
  })());
check('J3: tá»« má»‘c 12/11 â†’ dÃ¹ng giá» má»›i (Chiá»u 17:00)',
  hr.hrShiftCfg('QC', '2026-11-12').shifts[hr.hrShiftCfg('QC', '2026-11-12').shifts.length - 1].end === '17:00');
check('J4: hrSplitHoursHCDate 05/11 (trÆ°á»›c má»‘c) = 9h HC â€” KHÃ”NG bá»‹ tÃ­nh láº¡i theo giá» má»›i',
  (() => {
    const r = hr.hrSplitHoursHCDate('QC', '2026-11-05', '07:00', '17:30', 0);
    return r.hc === 540 && r.tc === 0;
  })());
check('J5: hrSplitHoursHCDate 12/11 (tá»« má»‘c) = 9h HC theo khung má»›i',
  (() => {
    const r = hr.hrSplitHoursHCDate('QC', '2026-11-12', '07:00', '17:00', 0);
    return r.hc === 540 && r.tc === 0;
  })());
check('J6: TC sau 17:00 â€” ngÃ y trÆ°á»›c má»‘c (khung cÅ© 17:30) cÃ²n HC 30p + TC 90p; tá»« má»‘c (khung 17:00) TC 120p',
  (() => {
    const truoc = hr.hrSplitHoursHCDate('QC', '2026-11-05', '17:00', '19:00', 0);
    const sau = hr.hrSplitHoursHCDate('QC', '2026-11-12', '17:00', '19:00', 0);
    return truoc.tc === 90 && sau.tc === 120;   // 17:00â€“19:00: cÅ© HC 30 + TC 90 Â· má»›i (háº¿t khung 17:00) TC 120
  })());
// Di trÃº entry do báº£n code trÆ°á»›c táº¡o (versions rá»—ng + má»‘c cá»¥ thá»ƒ)
state.hrShifts = [{ id: 'XÆ°á»Ÿng 1', type: 'hanhchinh', shifts: [{ name: 'SÃ¡ng', start: '07:00', end: '11:30' }, { name: 'Chiá»u', start: '12:30', end: '17:00' }], effectiveFrom: '2026-11-12', versions: [] }];
const nMig2 = hr.migrateShiftEffectiveDates();
check('J7: di trÃº seed báº£n máº·c Ä‘á»‹nh cho entry versions rá»—ng (XÆ°á»Ÿng 1)',
  nMig2 === 1 && state.hrShifts[0].versions.length === 1 && state.hrShifts[0].versions[0].effectiveFrom === '2000-01-01');
check('J8: sau di trÃº â€” ngÃ y 05/11 XÆ°á»Ÿng 1 quay vá» giá» Máº¶C Äá»ŠNH (17:30)',
  hr.hrShiftCfg('XÆ°á»Ÿng 1', '2026-11-05').shifts[hr.hrShiftCfg('XÆ°á»Ÿng 1', '2026-11-05').shifts.length - 1].end === '17:30');
check('J9: di trÃº cháº¡y láº¡i â†’ KHÃ”NG seed thÃªm (idempotent)', hr.migrateShiftEffectiveDates() === 0);

console.log('\n=== CÃ€I Äáº¶T CA THEO Má»C HIá»†U Lá»°C: ' + pass + ' PASS / ' + fail + ' FAIL ===');
process.exit(fail ? 1 : 0);

