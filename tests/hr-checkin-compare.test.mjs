// tests/hr-checkin-compare.test.mjs â€” Äá»I CHIáº¾U Báº¢NG Bá» TRÃ â†” MÃY CHáº¤M CÃ”NG
// Quy táº¯c chá»‘t 19/10/2026:
//  â€¢ Cháº¥m sá»›m tá»‘i Ä‘a < 30 phÃºt: tÃ­nh giá» lÃ m Tá»ª GIá»œ Báº®T Äáº¦U CA, khÃ´ng sinh TC.
//  â€¢ TÄƒng ca sau háº¿t ca: má»—i 30 phÃºt má»›i tÃ­nh â†’ LÃ€M TRÃ’N XUá»NG
//    (17:59 â†’ 0'; 18:10 â†’ 30'; 18:35 â†’ 60'; 19:30 â†’ 120').
//  â€¢ NgÃ y nghá»‰/lá»…: toÃ n bá»™ giá» Ä‘i lÃ m = TC, KHÃ”NG lÃ m trÃ²n.
//  â€¢ Nghá»‰ phÃ©p cáº£ ngÃ y + cÃ³ quáº¹t â†’ cá» Ä‘á»; nghá»‰ theo giá» â†’ so pháº§n cÃ²n pháº£i lÃ m.
//  â€¢ TÄƒng ca: TC mÃ¡y (Ä‘Ã£ trÃ²n) âŸ· Î£ Ä‘Æ¡n TC Ä‘Ã£ duyá»‡t.
//  â€¢ Tá»± Ä‘iá»n giá» káº¿t thÃºc: chá»‰ ngÃ y Ä‘Ã£ qua, Ã´ Ä‘ang trá»‘ng, lÆ°á»£t bá»‘ trÃ­ CUá»I.
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng tests/hr-timesheet.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    toDataURL: () => 'data:image/jpeg;base64,CANVASOK',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus(){}, click(){}, reset(){}, animate(){ return { cancel(){} }; }
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

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}
const fs = await import('node:fs');

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');

const Y = '2026-08-15';                 // ngÃ y thÆ°á»ng, Ä‘Ã£ qua
const TODAY = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');

function reset(over) {
  state.currentUser = { username: 'admin', role: 'admin', fullname: 'Test Admin', editTabs: ['hr'], allowAdvanced: true };
  state.hrEmployees = [{ id: 'e1', code: 'QS00327', name: 'HÃ  Thá»‹ MÃ¹i', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] }];
  state.hrPositions = [{ id: 'p1', name: 'Cáº¯t chá»n', department: 'XÆ°á»Ÿng 2' }];
  state.hrShifts = [];
  state.hrAssignments = [];
  state.hrAttendance = [];
  state.hrCheckins = [];
  state.hrLeaves = [];
  state.hrOvertimes = [];
  state.hrCiAcks = [];
  state.hrWorkCalendar = {};
  Object.assign(state, over || {});
}
function assign(over) {
  return Object.assign({ id: 'a1', date: Y, department: 'XÆ°á»Ÿng 2', positionId: 'p1', shiftIdx: 0,
    employeeId: 'e1', start: '07:00', end: '', createdAt: '', updatedAt: '' }, over || {});
}
function checkin(over) {
  return Object.assign({ id: 'ci-1', employeeId: 'e1', date: Y, in: '06:56', out: '18:35', punches: 2 }, over || {});
}
function attWork() {
  state.hrAttendance = [{ id: 'att-1', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' }];
}

// â”€â”€â”€ A. CHUáº¨N HOÃ GIá»œ / NGÃ€Y + NHáº¬N Cá»˜T FILE MÃY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('A1 ciNormTime cáº¯t giÃ¢y "06:56:23" -> 06:56', hr.ciNormTime('06:56:23') === '06:56');
check('A2 ciNormTime "7h05"', hr.ciNormTime('7h05') === '07:05');
check('A3 ciNormTime "0705"', hr.ciNormTime('0705') === '07:05');
check('A4 ciNormTime sá»‘ Excel 0.2951388 -> 07:05', hr.ciNormTime(425 / 1440) === '07:05');
check('A5 ciNormTime serial 46249.2951388 -> 07:05', hr.ciNormTime(46249 + 425 / 1440) === '07:05');
check('A6 ciNormDateTime "15-08-2026"', hr.ciNormDateTime('15-08-2026').date === '2026-08-15');
check('A7 ciNormDateTime serial 46249 -> 2026-08-15', hr.ciNormDateTime(46249).date === '2026-08-15');
check('A8 ciNormDateTime serial .5 -> 12:00', hr.ciNormDateTime(46249.5).time === '12:00');
check('A9 ciTimeFromNum Ã¢m / quÃ¡ lá»›n -> rá»—ng', hr.ciTimeFromNum(-1) === '' && hr.ciTimeFromNum(99999) === '');

const aoaImg = [
  ['CÃ”NG TY TNHH NGá»ŒC SÆ N'],
  ['BÃO CÃO Dá»® LIá»†U CHáº¤M CÃ”NG'],
  ['Tá»« ngÃ y 01-08-2026 Äáº¿n ngÃ y 31-08-2026'],
  [],
  ['STT', 'PhÃ²ng ban', 'MÃ£ NV', 'Há» TÃªn', 'Chá»©c danh', 'NgÃ y', 'Láº§n 1', 'Láº§n 2', 'Láº§n 3', 'Láº§n 4', 'Láº§n 5', 'Láº§n 6', 'Láº§n 7', 'Láº§n 8', 'Láº§n 9'],
  ['14', 'Tá»• 1', 'QS00327', 'HÃ  thá»‹ mÃ¹i', 'NhÃ¢n viÃªn', '15-08-2026', '06:56:23', '18:35:10'],
  ['43', 'Tá»• 2', 'QS00030', 'Pháº¡m Thá»‹ QuyÃªn', 'NhÃ¢n viÃªn', '16-08-2026', '06:44:09']
];
const hdr = hr.ciFindHeaderRow(aoaImg);
check('A10 tÃ¬m Ä‘Ãºng dÃ²ng tiÃªu Ä‘á» thá»© 5', hdr === 4);
const col = hr.ciAutoMapCols(aoaImg[hdr]);
check('A11 nháº­n cá»™t PhÃ²ng ban / MÃ£ NV / Há» TÃªn / NgÃ y + 9 cá»™t láº§n quÃ©t',
  col.dept === 1 && col.code === 2 && col.name === 3 && col.date === 5 && col.punchCols.length === 9);
reset({ hrEmployees: [
  { id: 'e1', code: 'QS00327', name: 'HÃ  Thá»‹ MÃ¹i', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
  { id: 'e2', code: 'QS00030', name: 'Pháº¡m Thá»‹ QuyÃªn', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] }
] });
const resImg = hr.importCheckinsFromSheet(aoaImg.slice(hdr), col, 'bao-cao-08-2026.xlsx');
check('A12 náº¡p 2 ngÃ y (2 NV), 3 láº§n quÃ©t', resImg.matched === 2 && resImg.punches === 3);
const ciImg = hr.checkinRecordOf('e1', '2026-08-15');
check('A13 dÃ²ng 15-08-2026 -> vÃ o 06:56, ra 18:35 (bá» giÃ¢y)', !!ciImg && ciImg.in === '06:56' && ciImg.out === '18:35');
check('A14 lÆ°u Äá»¦ danh sÃ¡ch láº§n quÃ©t (punchTimes)', Array.isArray(ciImg.punchTimes) && ciImg.punchTimes.length === 2);
const ciImg2 = hr.checkinRecordOf('e2', '2026-08-16');
check('A15 1 láº§n quÃ©t -> chá»‰ cÃ³ giá» vÃ o', !!ciImg2 && ciImg2.in === '06:44' && !ciImg2.out);

// â”€â”€â”€ B. QUY Táº®C GIá»œ: CHáº¤M Sá»šM / ÄI MUá»˜N / Vá»€ Sá»šM / TC KHá»I 30' â”€â”€â”€â”€
function setupDay(opts) {
  const o = opts || {};
  reset();
  state.hrAssignments = [assign({ end: o.end === undefined ? '' : o.end, start: o.start || '07:00' })];
  state.hrCheckins = [checkin({ in: o.in || '06:56', out: o.out === undefined ? '18:35' : o.out })];
  if (o.att !== false) attWork();
  return hr.ciCompareDay('e1', Y);
}
let r = setupDay({});
check('B1 bá»‘ trÃ­ 07:00â†’háº¿t ca = HC 9h, TC 0', r.plan.hc === 540 && r.plan.tc === 0);
check('B2 quáº¹t 06:56 Ä‘Æ°á»£c tÃ­nh tá»« 07:00 (khÃ´ng sinh TC sá»›m)', r.actual.inMin === 420);
check('B3 ra 18:35 -> lÃ m trÃ²n XUá»NG má»‘c 30\' = 18:30 -> TC 60 phÃºt', r.actual.tcRaw === 60 && r.actual.tc === 60);
check('B4 HC thá»±c táº¿ = 9h', r.actual.hc === 540);
check('B5 káº¿t luáº­n Khá»›p (khÃ´ng muá»™n / khÃ´ng sá»›m)', r.verdict === 'ok' && r.actual.lateMin === 0 && r.actual.earlyOutMin === 0);

r = setupDay({ in: '06:20', out: '17:30' });
check('B6 quáº¹t sá»›m 40 phÃºt -> cá» "quáº¹t sá»›m", váº«n tÃ­nh tá»« 07:00, TC 0',
  r.flags.includes('early_punch') && r.actual.inMin === 420 && r.actual.tc === 0);

r = setupDay({ in: '07:15' });
check('B7 vÃ o 07:15 -> lÃ m trÃ²n LÃŠN má»‘c 30\' = 07:30 -> Ä‘i muá»™n 30 phÃºt, káº¿t luáº­n "Äi muá»™n"', r.actual.lateMin === 30 && r.verdict === 'late');

r = setupDay({ out: '15:30' });
check('B8 ra 15:30 -> vá» sá»›m 120 phÃºt', r.actual.earlyOutMin === 120 && r.verdict === 'early');

r = setupDay({ out: '17:59' });
check('B9 ra 17:59 -> TC 0 (chÆ°a Ä‘á»§ 30 phÃºt)', r.actual.tc === 0);
r = setupDay({ out: '18:00' });
check('B10 ra 18:00 -> TC 30 phÃºt', r.actual.tc === 30);
r = setupDay({ out: '18:10' });
check('B11 ra 18:10 -> TC 30 phÃºt (lÃ m trÃ²n xuá»‘ng)', r.actual.tc === 30);
r = setupDay({ out: '18:29' });
check('B12 ra 18:29 -> TC 30 phÃºt', r.actual.tc === 30);
r = setupDay({ out: '18:30' });
check('B13 ra 18:30 -> TC 60 phÃºt', r.actual.tc === 60);
r = setupDay({ out: '19:30' });
check('B14 ra 19:30 -> TC 120 phÃºt', r.actual.tc === 120);

// â”€â”€â”€ C. NGÃ€Y NGHá»ˆ / Lá»„: TOÃ€N Bá»˜ LÃ€ TC, KHÃ”NG LÃ€M TRÃ’N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
reset({
  hrWorkCalendar: { '2026-09': { weekdaysOff: [], restDays: ['2026-09-02'] } },
  hrAssignments: [assign({ date: '2026-09-02' })],
  hrCheckins: [checkin({ date: '2026-09-02', in: '07:00', out: '17:30' })],
  hrAttendance: [{ id: 'att-r', employeeId: 'e1', date: '2026-09-02', status: 'work', positions: [], note: '' }]
});
const rRest = hr.ciCompareDay('e1', '2026-09-02');
check('C1 ngÃ y lá»… 02/09: Ä‘i lÃ m Ä‘á»§ ngÃ y -> HC 0, toÃ n bá»™ 540 = TC', rRest.actual.hc === 0 && rRest.actual.tc === 540);
check('C2 ngÃ y lá»… KHÃ”NG lÃ m trÃ²n 30 phÃºt', rRest.actual.tcRaw === rRest.actual.tc);

// â”€â”€â”€ D. CA ÄÃŠM: GHÃ‰P Láº¦N QUáº¸T SÃNG HÃ”M SAU LÃ€M GIá»œ RA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
reset({
  hrShifts: [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [
    { name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: 1.5 },
    { name: 'Ca Ä‘Ãªm', start: '19:00', end: '07:00', brk: 1 }] }],
  hrAssignments: [assign({ date: '2026-09-10', start: '19:00', end: '', shiftIdx: 1 })],
  hrCheckins: [
    checkin({ id: 'ci-n1', date: '2026-09-10', in: '18:55', out: '' }),
    checkin({ id: 'ci-n2', date: '2026-09-11', in: '07:05', out: '' })
  ],
  hrAttendance: [{ id: 'att-n', employeeId: 'e1', date: '2026-09-10', status: 'work', positions: [], note: '' }]
});
const rNight = hr.ciCompareDay('e1', '2026-09-10');
check('D1 ghÃ©p giá» ra qua Ä‘Ãªm (07:05 lÃ m trÃ²n xuá»‘ng má»‘c 30\' = 07:00)',
  rNight.actual.crossNight === true && rNight.actual.outMin === 1440 + 420);
check('D2 giá» HC ca Ä‘Ãªm = 11h (Ä‘Ã£ trá»« 1h nghá»‰ cuá»‘i ca), TC 0',
  rNight.actual.hc === 660 && rNight.actual.tc === 0);

// â”€â”€â”€ E. NGHá»ˆ PHÃ‰P: Cáº¢ NGÃ€Y / THEO GIá»œ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
reset({
  hrAssignments: [assign({})],
  hrCheckins: [checkin({ in: '07:00', out: '17:30' })],
  hrLeaves: [{ id: 'lv1', employeeId: 'e1', type: 'Nghá»‰ phÃ©p', from: Y, to: Y, days: 1,
    durationMode: 'full', status: 'approved', approvedBy: 'QL' }]
});
let rLeave = hr.ciCompareDay('e1', Y);
check('E1 nghá»‰ cáº£ ngÃ y nhÆ°ng CÃ“ quáº¹t mÃ¡y -> cá» Ä‘á» leave_punch',
  rLeave.verdict === 'leave_punch' && rLeave.needsReview === true);

reset({
  hrAssignments: [assign({})],
  hrLeaves: [{ id: 'lv2', employeeId: 'e1', type: 'Nghá»‰ phÃ©p', from: Y, to: Y, days: 1,
    durationMode: 'full', status: 'approved' }]
});
rLeave = hr.ciCompareDay('e1', Y);
check('E2 nghá»‰ cáº£ ngÃ y KHÃ”NG quáº¹t -> "Nghá»‰ cÃ³ phÃ©p" (khÃ´ng cáº§n xÃ¡c nháº­n)',
  rLeave.verdict === 'leave_ok' && rLeave.needsReview === false);

reset({
  hrAssignments: [assign({})],
  hrCheckins: [checkin({ in: '07:00', out: '13:00' })],
  hrLeaves: [{ id: 'lv3', employeeId: 'e1', type: 'Nghá»‰ phÃ©p', from: Y, to: Y, days: 0.5,
    durationMode: 'hours', hours: 4, status: 'approved' }],
  hrAttendance: [{ id: 'att-p', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' }]
});
rLeave = hr.ciCompareDay('e1', Y);
check('E3 nghá»‰ 4 giá»: cÃ²n pháº£i lÃ m 5h, thá»±c táº¿ 6h -> lá»‡ch +60 phÃºt, káº¿t luáº­n leave_hours',
  rLeave.leave.fullDay === false && rLeave.leaveDeltaMin === 60 && rLeave.verdict === 'leave_hours');

// â”€â”€â”€ F. TÄ‚NG CA: TC MÃY âŸ· ÄÆ N ÄÃƒ DUYá»†T â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setupOt(plannedMin, status) {
  setupDay({ out: '19:30' }); // TC mÃ¡y = 120
  if (plannedMin > 0) {
    state.hrOvertimes = [{ id: 'ot1', employeeId: 'e1', date: Y, start: '17:30', end: '19:30',
      plannedMin, status: status || 'approved', approvedBy: 'QL' }];
  }
  return hr.ciCompareDay('e1', Y);
}
let rOt = setupOt(120);
check('F1 Ä‘Æ¡n 120\' + mÃ¡y 120\' -> TC khá»›p Ä‘Æ¡n', rOt.otStatus === 'ok' && rOt.otDelta === 0);
rOt = setupOt(60);
check('F2 Ä‘Æ¡n 60\' + mÃ¡y 120\' -> TC vÆ°á»£t Ä‘Æ¡n +60\'', rOt.otStatus === 'over' && rOt.otDelta === 60);
rOt = setupOt(180);
check('F3 Ä‘Æ¡n 180\' + mÃ¡y 120\' -> TC thiáº¿u so Ä‘Æ¡n -60\'', rOt.otStatus === 'short' && rOt.otDelta === -60);
rOt = setupOt(0);
check('F4 mÃ¡y cÃ³ TC nhÆ°ng KHÃ”NG cÃ³ Ä‘Æ¡n -> "chÆ°a Ä‘Äƒng kÃ½"', rOt.otStatus === 'unregistered');
rOt = setupOt(120, 'pending');
check('F5 Ä‘Æ¡n chá» duyá»‡t -> cáº£nh bÃ¡o "chá» duyá»‡t"', rOt.otStatus === 'pending');

// â”€â”€â”€ G. Bá» TRÃ â†” MÃY â†” CHáº¤M TAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
reset({
  hrEmployees: [
    { id: 'e1', code: 'QS1', name: 'HÃ  Thá»‹ MÃ¹i', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'QS2', name: 'Pháº¡m Thá»‹ QuyÃªn', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] }
  ],
  hrAssignments: [assign({})],
  hrCheckins: [checkin({ id: 'ci-other', employeeId: 'e2', in: '07:00', out: '17:00' })] // mÃ¡y CÃ“ dá»¯ liá»‡u ngÃ y nÃ y
});
let rG = hr.ciCompareDay('e1', Y);
check('G1 cÃ³ bá»‘ trÃ­ + mÃ¡y cÃ³ dá»¯ liá»‡u nhÆ°ng NV khÃ´ng quáº¹t -> "KhÃ´ng quáº¹t mÃ¡y"',
  rG.verdict === 'no_punch' && rG.needsReview === true);

reset({
  hrCheckins: [checkin({ in: '07:00', out: '17:30' })],
  hrAttendance: []
});
rG = hr.ciCompareDay('e1', Y);
check('G2 mÃ¡y cÃ³ quáº¹t nhÆ°ng CHÆ¯A bá»‘ trÃ­, chÆ°a cháº¥m tay -> "MÃ¡y cÃ³ quáº¹t, chÆ°a bá»‘ trÃ­"',
  rG.verdict === 'no_plan' && rG.needsReview === true);

reset({
  hrCheckins: [checkin({ in: '07:00', out: '17:30' })],
  hrAttendance: [{ id: 'att-w', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' }]
});
rG = hr.ciCompareDay('e1', Y);
check('G3 chÆ°a bá»‘ trÃ­ nhÆ°ng cháº¥m tay Äi lÃ m -> coi lÃ  Khá»›p + nháº¯c "chÆ°a bá»‘ trÃ­"',
  rG.verdict === 'ok' && rG.flags.includes('no_plan_info'));

reset({
  hrAssignments: [assign({})],
  hrCheckins: [checkin({ in: '07:00', out: '17:30' })],
  hrAttendance: [{ id: 'att-a', employeeId: 'e1', date: Y, status: 'absent', positions: [], note: '' }]
});
rG = hr.ciCompareDay('e1', Y);
check('G4 cháº¥m tay "Váº¯ng" nhÆ°ng mÃ¡y cÃ³ quáº¹t -> cá» Ä‘á»', rG.verdict === 'absent_punch');

reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ in: '07:00', out: '17:30' })] });
rG = hr.ciCompareDay('e1', Y);
check('G5 mÃ¡y cÃ³ quáº¹t + chÆ°a ai cháº¥m tay -> "ChÆ°a cháº¥m tay"',
  rG.verdict === 'unmarked' && rG.needsReview === true);

// â”€â”€â”€ H. DANH SÃCH DÃ’NG + Bá»˜ Lá»ŒC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
reset({
  hrEmployees: [
    { id: 'e1', code: 'QS1', name: 'HÃ  Thá»‹ MÃ¹i', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'QS2', name: 'Pháº¡m Thá»‹ QuyÃªn', department: 'XÆ°á»Ÿng 1', status: 'active', skills: [] }
  ],
  hrAssignments: [assign({}), assign({ id: 'a2', employeeId: 'e2', date: Y, department: 'XÆ°á»Ÿng 1', positionId: 'p1' })],
  hrCheckins: [checkin({ out: '17:30' }), checkin({ id: 'ci-2', employeeId: 'e2', out: '17:30' })],
  hrAttendance: [
    { id: 'att-1', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' },
    { id: 'att-2', employeeId: 'e2', date: Y, status: 'work', positions: [], note: '' }
  ]
});
check('H1 láº¥y Ä‘á»§ dÃ²ng trong ká»³', hr.ciRowsForRange(Y, Y, {}).length === 2);
check('H2 lá»c theo bá»™ pháº­n', hr.ciRowsForRange(Y, Y, { dept: 'XÆ°á»Ÿng 1' }).length === 1);
check('H3 tÃ¬m nhanh bá» dáº¥u ("quyen")', hr.ciRowsForRange(Y, Y, { q: 'quyen' }).length === 1);
check('H4 "chá»‰ dÃ²ng cáº§n xÃ¡c nháº­n" loáº¡i dÃ²ng Khá»›p', hr.ciRowsForRange(Y, Y, { onlyIssues: true }).length === 0);
check('H5 thá»‘ng kÃª: 2 dÃ²ng, 2 khá»›p, 0 cáº§n xÃ¡c nháº­n',
  (() => { const s = hr.ciSummaryOf(hr.ciRowsForRange(Y, Y, {})); return s.total === 2 && s.ok === 2 && s.review === 0; })());

reset({
  hrLeaves: [{ id: 'lv9', employeeId: 'e1', type: 'Nghá»‰ phÃ©p', from: Y, to: Y, days: 1, durationMode: 'full', status: 'approved' }]
});
check('H6 ngÃ y nghá»‰ cÃ³ phÃ©p KHÃ”NG hiá»‡n máº·c Ä‘á»‹nh', hr.ciRowsForRange(Y, Y, {}).length === 0);
check('H7 báº­t "hiá»‡n ngÃ y nghá»‰" thÃ¬ cÃ³ dÃ²ng', hr.ciRowsForRange(Y, Y, { includeLeave: true }).length === 1);

// â”€â”€â”€ I. Tá»° ÄIá»€N GIá»œ Káº¾T THÃšC THá»°C Táº¾ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ out: '18:35' })] });
let sug = hr.ciSuggestEndFills({ round: false });
check('I1 cÃ³ 1 gá»£i Ã½ cho lÆ°á»£t bá»‘ trÃ­ Ä‘ang trá»‘ng giá» káº¿t thÃºc', sug.length === 1);
check('I2 cháº¿ Ä‘á»™ ÄÃšNG GIá»œ MÃY -> 18:30 (giá» ra Ä‘Ã£ lÃ m trÃ²n xuá»‘ng má»‘c 30\')', sug[0].newEnd === '18:30');
check('I3 gá»£i Ã½ kÃ¨m HC/TC trÆ°á»›c â†’ sau', sug[0].before.hc === 540 && sug[0].before.tc === 0 && sug[0].after.tc === 60);
sug = hr.ciSuggestEndFills({ round: true });
check('I4 cháº¿ Ä‘á»™ LÃ€M TRÃ’N XUá»NG 30\' -> 18:30', sug[0].newEnd === '18:30');

reset({ hrAssignments: [assign({ end: '17:30' })], hrCheckins: [checkin({})] });
check('I5 Ã´ giá» káº¿t thÃºc ÄÃƒ NHáº¬P TAY -> khÃ´ng gá»£i Ã½ (khÃ´ng ghi Ä‘Ã¨)', hr.ciSuggestEndFills({}).length === 0);

reset({ hrAssignments: [assign({ date: TODAY })], hrCheckins: [checkin({ date: TODAY, out: '18:00' })] });
check('I6 HÃ”M NAY chÆ°a xong ca -> khÃ´ng gá»£i Ã½', hr.ciSuggestEndFills({}).length === 0);

reset({ hrAssignments: [assign({}), assign({ id: 'a2', start: '13:00', end: '', positionId: 'p2' })], hrCheckins: [checkin({})] });
state.hrPositions.push({ id: 'p2', name: 'Bá»• á»‘ng', department: 'XÆ°á»Ÿng 2' });
sug = hr.ciSuggestEndFills({});
check('I7 nhiá»u lÆ°á»£t bá»‘ trÃ­ trong ngÃ y -> chá»‰ gá»£i Ã½ LÆ¯á»¢T CUá»I', sug.length === 1 && sug[0].assignId === 'a2');

reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ out: '18:35' })] });
const nFill = hr.ciApplyEndFills(hr.ciSuggestEndFills({}));
check('I8 Ã¡p dá»¥ng -> ghi giá» káº¿t thÃºc (Ä‘Ã£ lÃ m trÃ²n 30\') + Ä‘Ã¡nh dáº¥u láº¥y tá»« mÃ¡y',
  nFill === 1 && state.hrAssignments[0].end === '18:30' && state.hrAssignments[0].endSource === 'machine');
check('I9 Ã¡p dá»¥ng láº§n 2 -> khÃ´ng cÃ²n dÃ²ng nÃ o (khÃ´ng ghi Ä‘Ã¨)', hr.ciApplyEndFills(hr.ciSuggestEndFills({})) === 0);

// â”€â”€â”€ J. ÄÃNH Dáº¤U "ÄÃƒ XÃC NHáº¬N" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ out: '16:30' })] });
check('J1 trÆ°á»›c khi xÃ¡c nháº­n: cáº§n xÃ¡c nháº­n', hr.ciCompareDay('e1', Y).needsReview === true);
const ackRec = hr.ciAckDay('e1', Y, 'Ä‘Ã£ kiá»ƒm tra â€” vá» sá»›m cÃ³ phÃ©p');
check('J2 Admin xÃ¡c nháº­n -> lÆ°u sá»• (by/at/note)',
  !!ackRec && ackRec.by === 'Test Admin' && ackRec.note.includes('vá» sá»›m'));
const afterAck = hr.ciCompareDay('e1', Y);
check('J3 dÃ²ng Ä‘Ã£ xÃ¡c nháº­n KHÃ”NG cÃ²n tÃ­nh "cáº§n xÃ¡c nháº­n"', afterAck.ack !== null && afterAck.needsReview === false);
hr.ciUnackDay('e1', Y);
check('J4 bá» xÃ¡c nháº­n -> xoÃ¡ khá»i sá»• + tÃ­nh láº¡i cáº§n xÃ¡c nháº­n',
  state.hrCiAcks.length === 0 && hr.ciCompareDay('e1', Y).needsReview === true);
state.currentUser = { username: 'ed', role: 'editor', editTabs: ['hr'] };
check('J5 Editor KHÃ”NG Ä‘Æ°á»£c xÃ¡c nháº­n', hr.ciAckDay('e1', Y) === null);

// â”€â”€â”€ K. RENDER Báº¢NG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.currentUser = { username: 'admin', role: 'admin', fullname: 'Test Admin', editTabs: ['hr'], allowAdvanced: true };
reset({ hrAssignments: [assign({})], hrCheckins: [checkin({ in: '06:56', out: '18:35' })], hrAttendance: [] });
hr.renderHrCheckinTable();
const htmlK = document.getElementById('hr-ci-body').innerHTML;
check('K1 hiá»‡n giá» mÃ¡y dáº¡ng 06:56â€“18:35', htmlK.includes('06:56â€“18:35'));
check('K2 hiá»‡n "ChÆ°a cháº¥m tay" + nÃºt "Xá»­ lÃ½" (thay nÃºt XÃ¡c Nháº­n cÅ© â€” 20/10/2026)',
  htmlK.includes('ChÆ°a cháº¥m tay') && htmlK.includes('Xá»­ lÃ½') && htmlK.includes('data-ci-pay="1"') && !htmlK.includes('XÃ¡c Nháº­n'));
check('K3 hiá»‡n vá»‹ trÃ­ bá»‘ trÃ­ + "háº¿t ca"', htmlK.includes('Cáº¯t chá»n') && htmlK.includes('háº¿t ca'));
check('K4 dáº£i chip cÃ³ "Tá»•ng" vÃ  "Cáº§n xÃ¡c nháº­n"',
  document.getElementById('hr-ci-chips').innerHTML.includes('Tá»•ng:') &&
  document.getElementById('hr-ci-chips').innerHTML.includes('Cáº§n xÃ¡c nháº­n'));
check('K5 tiÃªu Ä‘á» Ä‘áº¿m dÃ²ng cÃ³ "cáº§n xÃ¡c nháº­n"',
  document.getElementById('hr-ci-count').textContent.includes('cáº§n xÃ¡c nháº­n'));

reset();
hr.renderHrCheckinTable();
check('K6 chÆ°a cÃ³ dá»¯ liá»‡u -> thÃ´ng bÃ¡o báº¥m Náº¡p Giá» MÃ¡y',
  document.getElementById('hr-ci-body').innerHTML.includes('Náº¡p Giá» MÃ¡y'));

// â”€â”€â”€ L. Cáº¤U TRÃšC FILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const hrSrc = fs.readFileSync(new URL('../js/hr.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('L1 index: Ä‘á»§ bá»™ lá»c + nÃºt Ä‘iá»n giá» káº¿t thÃºc + modal xem trÆ°á»›c',
  idxHtml.includes('id="hr-ci-month"') && idxHtml.includes('id="hr-ci-filter-dept"') &&
  idxHtml.includes('id="hr-ci-only-issues"') && idxHtml.includes('id="hr-ci-show-leave"') &&
  idxHtml.includes('id="btn-ci-endfill"') && idxHtml.includes('id="modal-ci-endfill"') &&
  idxHtml.includes('id="ci-endfill-body"') && idxHtml.includes('id="hr-ci-chips"'));
const ciTable = idxHtml.slice(idxHtml.indexOf('id="hr-ci-table"'), idxHtml.indexOf('id="hr-ci-body"'));
check('L2 index: báº£ng Ä‘á»‘i chiáº¿u 8 cá»™t', (ciTable.match(/<th[\s>]/g) || []).length === 8);
check('L3 index: tÃ¹y chá»n tá»± Ä‘iá»n khi náº¡p file',
  idxHtml.includes('id="checkin-import-autofill"') && idxHtml.includes('id="checkin-import-round"'));
check('L4 events ná»‘i Ä‘á»§ bá»™ lá»c + Ä‘iá»n giá» + xÃ¡c nháº­n',
  evSrc.includes("safeOn('hr-ci-month'") && evSrc.includes("safeOn('btn-ci-endfill'") &&
  evSrc.includes("safeOn('btn-ci-endfill-apply'") && evSrc.includes("'[data-ci-ack],[data-ci-unack]'"));
check('L5 hr.js cÃ³ engine + hÃ m chia giá» theo phÃºt',
  hrSrc.includes('function ciCompareDay(') && hrSrc.includes('function hrSplitHoursHCMin(') &&
  hrSrc.includes('CI_OT_BLOCK_MIN'));
check('L6 styles.css cÃ³ khá»‘i .ci-*',
  /\.ci-row-review\s*>\s*td\s*\{/.test(cssSrc) && /\.ci-ack-chip\s*\{/.test(cssSrc));
check('L7 sw.js cache v486', swSrc.includes('nha-may-ngoc-son-v486'));
const specsSrc = fs.readFileSync(new URL('../js/report-specs.js', import.meta.url), 'utf8');
const rcSrc = fs.readFileSync(new URL('../js/report-center.js', import.meta.url), 'utf8');
check('L8 bÃ¡o cÃ¡o "Äá»‘i Chiáº¿u Bá»‘ TrÃ­ â†” MÃ¡y" cÃ³ trong Trung tÃ¢m Xuáº¥t Excel',
  specsSrc.includes("id: 'hr-ci-compare'") && rcSrc.includes("spec.kind === 'ciCompare'"));

// â”€â”€â”€ M. CA ÄÃŠM: GHÃ‰P Cáº¶P QUA NGÃ€Y (20/10/2026) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MÃ¡y xuáº¥t Má»–I DÃ’NG = 1 NGÃ€Y dÆ°Æ¡ng lá»‹ch: ngÆ°á»i lÃ m ca Ä‘Ãªm 20:00â†’06:00 cÃ³
// 06:0x (RA cá»§a ca HÃ”M TRÆ¯á»šC) vÃ  19:4x (VÃ€O cá»§a ca HÃ”M NAY) trÃªn CÃ™NG dÃ²ng.
// Engine pháº£i ghÃ©p 19:46 hÃ´m nay â†” 06:02 NGÃ€Y Káº¾, KHÃ”NG Ä‘Æ°á»£c hiá»ƒu thÃ nh
// "06:00â†’19:46 = 13h45 Ä‘i lÃ m" (thá»±c cháº¥t lÃ  nghá»‰ á»Ÿ nhÃ ).
const N16 = '2026-10-16', N17 = '2026-10-17', N18 = '2026-10-18', N19 = '2026-10-19';
function nightAssign(id, date) {
  return { id, employeeId: 'e1', date, department: 'XÆ°á»Ÿng 2', positionId: 'p1',
    shiftIdx: 1, start: '20:00', end: '', createdAt: '', updatedAt: '' };
}
function ciRec(id, date, times) {
  return { id, employeeId: 'e1', date,
    in: times[0] || '', out: times.length > 1 ? times[times.length - 1] : '',
    punches: times.length, punchTimes: times.slice() };
}
function nightData(over) {
  reset(Object.assign({
    hrShifts: [{ id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [
      { name: 'Ca ngÃ y', start: '07:00', end: '19:00', brk: 1.5 },
      { name: 'Ca Ä‘Ãªm', start: '20:00', end: '06:00', brk: 1 }] }],
    hrAssignments: [nightAssign('n16', N16), nightAssign('n17', N17), nightAssign('n19', N19)],
    hrCheckins: [
      ciRec('c16', N16, ['06:00', '19:40']),
      ciRec('c17', N17, ['06:01', '19:46']),
      ciRec('c18', N18, ['06:02']),
      ciRec('c19', N19, ['19:42'])
    ],
    hrAttendance: [
      { id: 'att-16', employeeId: 'e1', date: N16, status: 'work', positions: [], note: '' },
      { id: 'att-17', employeeId: 'e1', date: N17, status: 'work', positions: [], note: '' },
      { id: 'att-19', employeeId: 'e1', date: N19, status: 'work', positions: [], note: '' }
    ]
  }, over || {}));
}
nightData();
const plan17 = hr.ciPlannedOf('e1', N17);
check('M1 nháº­n Ä‘Ãºng ca Ä‘Ãªm (khung 20:00â†’06:00 váº¯t qua ná»­a Ä‘Ãªm)', !!hr.ciPlanNightOf(plan17));
const pair17 = hr.ciNightPairOf('e1', N17, plan17);
check('M2 ghÃ©p VÃ€O 19:46 hÃ´m nay + RA 06:02 NGÃ€Y Káº¾ (+1440), dÃ¹ng Ä‘Ãºng láº§n quáº¹t sÃ¡ng',
  pair17 && pair17.inMin === 1186 && pair17.outMin === 1440 + 362 &&
  pair17.outNextDay === true && pair17.morningUsed.join(',') === '362');
check('M3 láº§n quáº¹t sÃ¡ng 06:01 cá»§a ngÃ y 17/10 bá»‹ ca Ä‘Ãªm 16/10 láº¥y â†’ KHÃ”NG dÃ¹ng cho ngÃ y 17/10',
  hr.ciUsablePunchesOf('e1', N17).join(',') === '1186');
const rN17 = hr.ciCompareDay('e1', N17);
check('M4 giá» vÃ o tÃ­nh tá»« 20:00 (quáº¹t 19:46 sá»›m 14\' < 30\'), giá» ra 06:02 â†’ lÃ m trÃ²n xuá»‘ng 06:00',
  rN17.actual.inMin === 1200 && rN17.actual.outMin === 1440 + 360 && rN17.actual.crossNight === true);
check('M5 HC 9h Â· TC 0 (2 phÃºt láº» lÃ m trÃ²n XUá»NG 0) â€” KHÃ”NG cÃ²n "06:00â†’19:46 = 13h45"',
  rN17.actual.hc === 540 && rN17.actual.tc === 0);
check('M6 káº¿t luáº­n "Khá»›p" â€” háº¿t "Vá» sá»›m âˆ’614\'" cá»§a cÃ¡ch tÃ­nh cÅ©',
  rN17.verdict === 'ok' && rN17.actual.earlyOutMin === 0 && !rN17.flags.includes('early'));
check('M7 cá»™t giá» mÃ¡y hiá»‡n cáº·p ÄÃƒ GHÃ‰P + Ä‘Ã¡nh dáº¥u qua ngÃ y',
  rN17.timeText === '19:46â€“06:02 (+1)');
const rN18 = hr.ciCompareDay('e1', N18);
check('M8 ngÃ y chá»‰ cÃ³ láº§n quáº¹t sÃ¡ng â†’ "Giá» ra ca Ä‘Ãªm hÃ´m trÆ°á»›c", KHÃ”NG cáº§n xÃ¡c nháº­n',
  rN18.verdict === 'night_out' && rN18.needsReview === false);
check('M9 chuá»—i giá» mÃ¡y ngÃ y Ä‘Ã³ ghi rÃµ lÃ  giá» ra ca Ä‘Ãªm hÃ´m trÆ°á»›c',
  rN18.timeText.includes('06:02') && rN18.timeText.includes('ra ca Ä‘Ãªm hÃ´m trÆ°á»›c'));
check('M10 biáº¿t nÃ³ thuá»™c ca Ä‘Ãªm ngÃ y 17/10', (hr.ciNightConsumedOf('e1', N18) || {}).fromDate === N17);
check('M11 áº©n khá»i danh sÃ¡ch "chá»‰ dÃ²ng cáº§n xÃ¡c nháº­n"',
  hr.ciRowsForRange(N18, N18, { onlyIssues: true }).length === 0);
const rN19 = hr.ciCompareDay('e1', N19);
check('M12 ca Ä‘Ãªm chÆ°a cÃ³ láº§n quáº¹t sÃ¡ng hÃ´m sau â†’ "Thiáº¿u giá» ra" (khÃ´ng bá»‹a giá»)',
  rN19.verdict === 'no_out' && rN19.actual.inMin === 1200 && rN19.actual.outMin === 0);
check('M13 Báº£ng cháº¥m cÃ´ng thÃ¡ng láº¥y Ä‘Ãºng HC ca Ä‘Ãªm (9h)',
  hr.ciTimesheetHours({ id: 'e1' }, 'XÆ°á»Ÿng 2', N17).hc === 540);
const sugN = hr.ciSuggestEndFills({ round: false });
const sugN17 = sugN.find(x => x.date === N17);
check('M14 tá»± Ä‘iá»n giá» káº¿t thÃºc ca Ä‘Ãªm = 06:00 (giá» ra ngÃ y káº¿, Ä‘Ã£ lÃ m trÃ²n 30\')',
  !!sugN17 && sugN17.newEnd === '06:00' && sugN17.punchOut === '06:00');

// NgÃ y sau CÃ“ bá»‘ trÃ­ nhÆ°ng chá»‰ quáº¹t giá» ra ca Ä‘Ãªm hÃ´m trÆ°á»›c
nightData({
  hrAssignments: [nightAssign('n17', N17), nightAssign('n18', N18)],
  hrCheckins: [ciRec('c17', N17, ['06:01', '19:46']), ciRec('c18', N18, ['06:02'])]
});
const rN18plan = hr.ciCompareDay('e1', N18);
check('M15 ngÃ y sau CÃ“ bá»‘ trÃ­ nhÆ°ng chá»‰ quáº¹t giá» ra ca Ä‘Ãªm â†’ "KhÃ´ng quáº¹t mÃ¡y" + nháº¯c rÃµ',
  rN18plan.verdict === 'no_punch' && rN18plan.flags.includes('night_out_only') &&
  rN18plan.needsReview === true);

nightData({ hrAttendance: [] });
hr.applyAllCheckins();
check('M16 Ãp Dá»¥ng Táº¥t Cáº£ KHÃ”NG cháº¥m "Äi lÃ m" cho ngÃ y chá»‰ cÃ³ giá» ra ca Ä‘Ãªm hÃ´m trÆ°á»›c',
  !state.hrAttendance.some(a => a.date === N18) && state.hrAttendance.some(a => a.date === N17));
nightData({ hrAttendance: [] });
hr.applyCheckinRecord('e1', N18);
check('M17 Ãp Dá»¥ng riÃªng ngÃ y Ä‘Ã³ cÅ©ng bá»‹ cháº·n (khÃ´ng ghi cháº¥m tay sai ngÃ y)',
  !state.hrAttendance.some(a => a.date === N18));

// Ca ngÃ y + ca Ä‘Ãªm trong CÃ™NG ngÃ y â†’ KHÃ”NG ghÃ©p (trÃ¡nh Ä‘oÃ¡n sai), giá»¯ cÃ¡ch tÃ­nh cÅ©
nightData({ hrAssignments: [
  { id: 'mix1', employeeId: 'e1', date: N17, department: 'XÆ°á»Ÿng 2', positionId: 'p1',
    shiftIdx: 0, start: '07:00', end: '19:00' },
  nightAssign('mix2', N17)
] });
check('M18 ngÃ y trá»™n ca ngÃ y + ca Ä‘Ãªm â†’ KHÃ”NG báº­t cháº¿ Ä‘á»™ ghÃ©p ca Ä‘Ãªm',
  hr.ciPlanNightOf(hr.ciPlannedOf('e1', N17)) === null);

// NgÃ y thÆ°á»ng (nhiá»u láº§n quáº¹t) váº«n láº¥y sá»›m nháº¥t = vÃ o, muá»™n nháº¥t = ra
reset({
  hrAssignments: [assign({})],
  hrCheckins: [{ id: 'ci-m', employeeId: 'e1', date: Y, in: '06:56', out: '18:35',
    punches: 4, punchTimes: ['06:56', '11:30', '13:00', '18:35'] }],
  hrAttendance: [{ id: 'att-m', employeeId: 'e1', date: Y, status: 'work', positions: [], note: '' }]
});
const rMulti = hr.ciCompareDay('e1', Y);
check('M19 ngÃ y thÆ°á»ng 4 láº§n quáº¹t: vÃ o 06:56â†’07:00 Â· ra 18:35â†’18:30 (HC 9h Â· TC 60\')',
  rMulti.actual.inMin === 420 && rMulti.actual.outMin === 1110 &&
  rMulti.actual.hc === 540 && rMulti.actual.tc === 60 && rMulti.verdict === 'ok');

// â”€â”€â”€ M2. Cáº¤U TRÃšC: LOADING + Cáº¢NH BÃO Äá»”I CA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('M20 náº¡p file: hiá»‡n LOADING NGAY khi chá»n file (TRÆ¯á»šC readAsArrayBuffer) + xoay cÃ¢u vui',
  hrSrc.indexOf('showTreLoading(funLabels[0], { dur: 800, phrases: funLabels })') > -1 &&
  hrSrc.indexOf('showTreLoading(funLabels[0]') < hrSrc.indexOf('reader.readAsArrayBuffer(file)') &&
  hrSrc.includes('Chá» xÃ­u nhaâ€¦ Ä‘ang bÃª file Excel cá»§a mÃ¡y cháº¥m cÃ´ng vá»'));
check('M21 náº¡p file: cÃ³ reader.onerror dá»n overlay + finally hideTreLoading(treOk, { minShow: 800 })',
  hrSrc.includes('reader.onerror = () =>') && hrSrc.includes('hideTreLoading(false)') &&
  hrSrc.includes('hideTreLoading(treOk, { minShow: 800 })'));
check('M22 báº¥m "Náº¡p Dá»¯ Liá»‡u" cÅ©ng cÃ³ LOADING + chá»‘ng báº¥m láº·p (ciImporting) + finally dá»n',
  /function doCheckinImport\(\)[\s\S]{0,1600}?ciImporting[\s\S]{0,1600}?showTreLoading\(funLabels\[0\]/.test(hrSrc) &&
  /function doCheckinImport\(\)[\s\S]{0,6000}?finally\s*\{[\s\S]{0,400}?hideTreLoading\(treOk, \{ minShow: 800 \}\)/.test(hrSrc));
check('M23 Ä‘á»•i giá»/nghá»‰ cá»§a ca cÃ³ dá»¯ liá»‡u â†’ Cáº¢NH BÃO theo Má»C HIá»†U Lá»°C (quÃ¡ khá»© giá»¯ nguyÃªn)',
  /const hasHistory = \(state\.hrAssignments \|\| \[\]\)\.some/.test(hrSrc) &&
  hrSrc.includes('sá»‘ liá»‡u lá»‹ch sá»­ KHÃ”NG bá»‹ thay Ä‘á»•i') && hrSrc.includes('Ã¡p dá»¥ng Tá»ª NGÃ€Y'));

// â”€â”€â”€ N. 3 Lá»–I CÃ”NG THá»¨C NGÆ¯á»œI DÃ™NG BÃO (20/10/2026) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  N1 (hÃ¬nh 2): nghá»‰ cá»§a ca Ä‘áº·t GIá»®A CA â€” ná»­a buá»•i chiá»u váº«n Ä‘á»§ 4h30.
//  N2 (hÃ¬nh 3): bá»‘ trÃ­ Gá»˜P khoáº£ng trÃ¹ng + giá» quáº¹t lÃ m trÃ²n má»‘c 30'.
//  N3 (hÃ¬nh 1): Ä‘oáº¡n 0 phÃºt KHÃ”NG phÃ¬nh thÃ nh cáº£ ca + cá» "thiáº¿u vá»‹ trÃ­ bá»‘ trÃ­".
const CA_NGAY = { id: 'XÆ°á»Ÿng 2', type: 'lamca', shifts: [
  { name: 'Ca ngÃ y', start: '07:00', end: '17:30', brk: 1.5 },
  { name: 'Ca Ä‘Ãªm', start: '20:00', end: '06:00', brk: 1 }] };
const D14 = '2026-10-14', D16 = '2026-10-16';
function nAssign(id, over) {
  return Object.assign({ id, employeeId: 'e1', date: D14, department: 'XÆ°á»Ÿng 2',
    positionId: 'p1', shiftIdx: 0, start: '07:00', end: '', createdAt: '', updatedAt: '' }, over || {});
}
// â”€â”€ N1: HÃŒNH 2 â€” khÃ´ng cÃ³ bá»‘ trÃ­, quáº¹t 12:59â€“17:34
reset({ hrShifts: [CA_NGAY], hrAssignments: [], hrCheckins: [checkin({ date: D14, in: '12:59', out: '17:34' })] });
const rN1 = hr.ciCompareDay('e1', D14);
check('N1 nghá»‰ giá»¯a ca (11:30â€“13:00) â†’ lÃ m 12:59â€“17:34 = HC 4h30 (trÆ°á»›c Ä‘Ã¢y 3h01)',
  rN1.actual.hc === 270 && rN1.actual.tc === 0);
check('N1b giá» quáº¹t lÃ m trÃ²n má»‘c 30\' â†’ vÃ o 13:00 Â· ra 17:30',
  rN1.actual.inMin === 780 && rN1.actual.outMin === 1050);

// â”€â”€ N2: HÃŒNH 3 â€” 2 vá»‹ trÃ­ CHá»’NG GIá»œ + quáº¹t 06:50â€“11:31
reset({ hrShifts: [CA_NGAY], hrAssignments: [nAssign('n2a'), nAssign('n2b', { start: '07:00', end: '11:30' })],
  hrCheckins: [checkin({ date: D14, in: '06:50', out: '11:31' })] });
const planN2 = hr.ciPlannedOf('e1', D14);
check('N2 bá»‘ trÃ­ Gá»˜P khoáº£ng trÃ¹ng â†’ 9h HC (trÆ°á»›c Ä‘Ã¢y cá»™ng dá»“n thÃ nh 13h30)',
  planN2.hc === 540 && planN2.tc === 0);
const rN2 = hr.ciCompareDay('e1', D14);
check('N2b ná»­a buá»•i 06:50â€“11:31 â†’ HC 4h30 Â· TC 0 (trÆ°á»›c Ä‘Ã¢y 4h31)',
  rN2.actual.hc === 270 && rN2.actual.tc === 0 && rN2.actual.outMin === 690);
reset({ hrShifts: [CA_NGAY], hrAssignments: [nAssign('n2c', { end: '09:30' }), nAssign('n2d', { id: 'n2d', start: '09:30' })] });
check('N2c 07:00â€“09:30 + 09:30â€“háº¿t ca = 9h HC (Ä‘Ãºng vÃ­ dá»¥ ngÆ°á»i dÃ¹ng)',
  hr.ciPlannedOf('e1', D14).hc === 540);

// â”€â”€ N3: HÃŒNH 1 â€” cÃ¹ng bá»‘ trÃ­ 17:30â€“19:30 (TC 2h), 2 ngÆ°á»i quáº¹t khÃ¡c nhau
reset({ hrShifts: [CA_NGAY],
  hrEmployees: [
    { id: 'e1', code: 'QS00398', name: 'LÆ°Æ¡ng Thá»‹ MÃ¹ng', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'QS00399', name: 'Pháº¡m Thá»‹ Hoan', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] }],
  hrAssignments: [
    nAssign('n3a', { employeeId: 'e1', date: D16, start: '17:30', end: '19:30' }),
    nAssign('n3b', { id: 'n3b', employeeId: 'e2', date: D16, start: '17:30', end: '19:30' })],
  hrCheckins: [
    checkin({ id: 'c1', employeeId: 'e1', date: D16, in: '06:47', out: '19:30' }),
    checkin({ id: 'c2', employeeId: 'e2', date: D16, in: '06:48', out: '17:30' })],
  hrAttendance: [
    { id: 'at1', employeeId: 'e1', date: D16, status: 'work', positions: [], note: '' },
    { id: 'at2', employeeId: 'e2', date: D16, status: 'work', positions: [], note: '' }] });
const rM = hr.ciCompareDay('e1', D16);
check('N3 quáº¹t 06:47â€“19:30 vá»›i bá»‘ trÃ­ 17:30â€“19:30 â†’ HC 0 Â· TC 2h (Khá»›p)',
  rM.actual.hc === 0 && rM.actual.tc === 120 && rM.verdict === 'ok');
const rH = hr.ciCompareDay('e2', D16);
check('N3b quáº¹t 06:48â€“17:30 â†’ 0 phÃºt lÃ m: HC 0 Â· TC 0 (KHÃ”NG cÃ²n "HC 9h Â· TC 13h30")',
  rH.actual.hc === 0 && rH.actual.tc === 0 && rH.actual.workedMin === 0);
check('N3c cá» zero_span + báº¥t thÆ°á»ng "quáº¹t dÃ i hÆ¡n bá»‘ trÃ­" (nghi thiáº¿u vá»‹ trÃ­ bá»‘ trÃ­)',
  rH.actual.flags.includes('zero_span') && rH.anomalies.includes('zero_span') && rH.anomalies.includes('punch_over_plan'));
check('N3d ngÆ°á»i quáº¹t cáº£ ngÃ y cÅ©ng Ä‘Æ°á»£c nháº¯c thiáº¿u vá»‹ trÃ­ bá»‘ trÃ­', rM.anomalies.includes('punch_over_plan'));
check('N3e thá»‘ng kÃª + lá»c "chá»‰ dÃ²ng báº¥t thÆ°á»ng"',
  (() => {
    const rows = hr.ciRowsForRange(D16, D16, {});
    return hr.ciSummaryOf(rows).bad === 2 &&
      hr.ciRowsForRange(D16, D16, { onlyAnomaly: true }).length === 2;
  })());

// â”€â”€ N4: LÃ€M TRÃ’N Má»C 30' HAI Äáº¦U (vÃ o lÃªn Â· ra xuá»‘ng)
reset({ hrShifts: [CA_NGAY], hrAssignments: [nAssign('n4')],
  hrCheckins: [checkin({ date: D14, in: '12:31', out: '17:29' })] });
const rN4 = hr.ciCompareDay('e1', D14);
check('N4 12:31 â†’ 13:00 vÃ  17:29 â†’ 17:00 (lÃ m trÃ²n má»‘c 30\' hai Ä‘áº§u)',
  rN4.actual.inMin === 780 && rN4.actual.outMin === 1020 && rN4.actual.hc === 240);

// â”€â”€ N5: Cáº¤U TRÃšC (lá»c báº¥t thÆ°á»ng + quy táº¯c má»›i trÃªn giao diá»‡n)
check('N5 index cÃ³ lá»c "Chá»‰ dÃ²ng báº¥t thÆ°á»ng" + hint quy táº¯c lÃ m trÃ²n 30\'/nghá»‰ giá»¯a ca',
  idxHtml.includes('id="hr-ci-only-anomaly"') && idxHtml.includes('lÃ m trÃ²n má»‘c 30') &&
  idxHtml.includes('GIá»®A CA'));
check('N5b styles.css cÃ³ dÃ²ng báº¥t thÆ°á»ng + chip cáº£nh bÃ¡o',
  cssSrc.includes('.ci-row-bad') && cssSrc.includes('.ci-bad-hint') && cssSrc.includes('.hr-stat-chip.is-danger'));
check('N5c events ná»‘i lá»c báº¥t thÆ°á»ng + hr.js cÃ³ ciAnomalyOf',
  evSrc.includes("safeOn('hr-ci-only-anomaly', 'change'") &&
  hrSrc.includes('function ciAnomalyOf(') && hrSrc.includes('CI_ANOMALY_LABEL'));

console.log(`\nHR-CHECKIN-COMPARE: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);





