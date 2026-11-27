// tests/hr-ci-period-chip.test.mjs â€” Ká»² NGÃ€Y/TUáº¦N/THÃNG + CHÃP Lá»ŒC + NHáº¢Y DÃ’NG
// (21/10/2026): 2 yÃªu cáº§u cá»§a ngÆ°á»i dÃ¹ng cho tháº» "Äá»‘i Chiáº¿u Bá»‘ TrÃ­ â†” MÃ¡y Cháº¥m CÃ´ng":
//  â‘  Chá»n ká»³ theo NGÃ€Y / TUáº¦N (ISO: Thá»© 2 â†’ Chá»§ nháº­t) / THÃNG
//  â‘¡ Báº¥m CHÃP thÃ´ng tin = lá»c nhÃ³m + nháº£y tá»›i dÃ²ng Ä‘áº§u tiÃªn + TÃ” SÃNG
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng tests/hr-payroll-lock.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');

const UI_KEY = 'bamboo_tracker_hr_ci_ui_v1';
const MONTH = '2026-10';
const D1 = '2026-10-05';   // Thá»© 2 (tuáº§n ISO 41)
const D2 = '2026-10-06';   // Thá»© 3 â€” cÃ¹ng tuáº§n 41
const D3 = '2026-10-14';   // Thá»© 4 â€” tuáº§n 42
const DS = '2026-09-30';   // Thá»© 4 â€” tuáº§n 40 (váº¯t sang thÃ¡ng 10)

function setUi(patch) {
  let cur = {};
  try { cur = JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { cur = {}; }
  localStorage.setItem(UI_KEY, JSON.stringify(Object.assign({}, cur, patch || {})));
}
function reset(over) {
  state.currentUser = { username: 'admin', role: 'admin', fullname: 'Quáº£n Trá»‹', editTabs: [], payApply: true, payLock: true };
  state.hrEmployees = [
    { id: 'e1', code: 'NV01', name: 'Nguyá»…n VÄƒn A', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'NV02', name: 'Tráº§n Thá»‹ B', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
    { id: 'e3', code: 'NV03', name: 'LÃª VÄƒn C', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] }
  ];
  state.hrPositions = [{ id: 'p1', name: 'Cáº¯t chá»n', department: 'XÆ°á»Ÿng 2' }];
  state.hrShifts = [];
  state.hrAssignments = [];
  state.hrAttendance = [];
  state.hrCheckins = [];
  state.hrLeaves = [];
  state.hrOvertimes = [];
  state.hrCiAcks = [];
  state.hrPayRows = [];
  state.hrPayLocks = [];
  state.hrWorkCalendar = {};
  Object.assign(state, over || {});
  ['hr-ci-search'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('hr-ci-only-issues').checked = true;
  document.getElementById('hr-ci-show-leave').checked = false;
  document.getElementById('hr-ci-only-anomaly').checked = false;
  localStorage.setItem(UI_KEY, JSON.stringify({ mode: 'month', month: MONTH }));
}
function asg(emp, date) {
  return { id: `a-${emp}-${date}`, employeeId: emp, date, department: 'XÆ°á»Ÿng 2', positionId: 'p1', shiftIdx: 0, start: '07:00', end: '' };
}
function ci(emp, date, inT, outT) {
  return { id: `ci-${emp}-${date}`, employeeId: emp, date, in: inT, out: outT, punchTimes: [inT, outT].filter(Boolean), punches: outT ? 2 : 1 };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• A. TUáº¦N ISO (Thá»© 2 â†’ Chá»§ nháº­t) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
check('A1. 05/10/2026 lÃ  Thá»© 2', new Date(D1 + 'T00:00:00').getDay() === 1);
check('A2. Tuáº§n ISO cá»§a 05/10/2026 = tuáº§n 41', hr.ciIsoWeekOf(D1).year === 2026 && hr.ciIsoWeekOf(D1).week === 41);
check('A3. KhoÃ¡ tuáº§n dáº¡ng YYYY-Www', hr.ciIsoWeekKey(D1) === '2026-W41');
check('A4. Tuáº§n 41: Thá»© 2 05/10 â†’ Chá»§ nháº­t 11/10',
  (() => { const r = hr.ciIsoWeekRange('2026-W41'); return r.from === '2026-10-05' && r.to === '2026-10-11'; })());
check('A5. Tuáº§n Váº®T 2 THÃNG: W40 = 28/09 â†’ 04/10',
  (() => { const r = hr.ciIsoWeekRange('2026-W40'); return r.from === '2026-09-28' && r.to === '2026-10-04'; })());
check('A6. NÄƒm cÃ³ 53 tuáº§n: W53/2026 = 28/12/2026 â†’ 03/01/2027',
  (() => { const r = hr.ciIsoWeekRange('2026-W53'); return r.from === '2026-12-28' && r.to === '2027-01-03'; })());
check('A7. Tuáº§n khÃ´ng há»£p lá»‡ â†’ rá»—ng (khÃ´ng nÃ©m lá»—i)',
  (() => { const r = hr.ciIsoWeekRange('abc'); return r.from === '' && r.to === ''; })());

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• B. KHOáº¢NG NGÃ€Y THEO CHáº¾ Äá»˜ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
reset();
setUi({ mode: 'day', day: D2 });
check('B1. Cháº¿ Ä‘á»™ NGÃ€Y: from = to = ngÃ y chá»n',
  (() => { const r = hr.ciRangeOf(); return r.from === D2 && r.to === D2 && r.mode === 'day'; })());
check('B2. NhÃ£n cháº¿ Ä‘á»™ NgÃ y = dd/mm/yyyy', hr.ciRangeOf().label.indexOf('06/10/2026') !== -1);
setUi({ mode: 'week', week: '2026-W41', day: D1 });
check('B3. Cháº¿ Ä‘á»™ TUáº¦N: Thá»© 2 â†’ Chá»§ nháº­t',
  (() => { const r = hr.ciRangeOf(); return r.from === '2026-10-05' && r.to === '2026-10-11' && r.mode === 'week'; })());
check('B4. NhÃ£n tuáº§n ghi sá»‘ tuáº§n + khoáº£ng ngÃ y',
  (() => { const l = hr.ciRangeOf().label; return l.indexOf('Tuáº§n 41') === 0 && l.indexOf('05/10/2026') !== -1 && l.indexOf('11/10/2026') !== -1; })());
setUi({ mode: 'month', month: MONTH });
check('B5. Cháº¿ Ä‘á»™ THÃNG: trá»n thÃ¡ng',
  (() => { const r = hr.ciRangeOf(); return r.from === '2026-10-01' && r.to === '2026-10-31' && r.mode === 'month'; })());
check('B6. KhÃ´ng lÆ°u gÃ¬ â†’ máº·c Ä‘á»‹nh THÃNG (khÃ´ng Ä‘á»•i hÃ nh vi cÅ©)',
  (() => { localStorage.removeItem(UI_KEY); const ui = hr.ciReadUi(); return ui.mode === 'month'; })());
check('B7. Ká»³ tuáº§n váº¯t 2 thÃ¡ng â†’ ciMonthsOfRange tráº£ Cáº¢ 2 thÃ¡ng',
  (() => { const ms = [...hr.ciMonthsOfRange(hr.ciIsoWeekRange('2026-W40'))].sort();
    return ms.length === 2 && ms[0] === '2026-09' && ms[1] === '2026-10'; })());

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• C. Äá»”I CHáº¾ Äá»˜ + â€¹ â€º + HÃ”M NAY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
reset();
setUi({ mode: 'day', day: D2, month: MONTH });
check('C1. Sang cháº¿ Ä‘á»™ TUáº¦N giá»¯ ngÃ y Ä‘ang xem lÃ m má»‘c',
  (() => { hr.ciSetPeriodMode('week');
    const ui = hr.ciReadUi(); return ui.mode === 'week' && ui.week === '2026-W41'; })());
check('C2. Sang cháº¿ Ä‘á»™ THÃNG láº¥y thÃ¡ng cá»§a ngÃ y Ä‘ang xem',
  (() => { hr.ciSetPeriodMode('month'); const ui = hr.ciReadUi(); return ui.mode === 'month' && ui.month === MONTH; })());
check('C3. Cháº¿ Ä‘á»™ khÃ´ng há»£p lá»‡ bá»‹ bá» qua', hr.ciSetPeriodMode('year') === false);
setUi({ mode: 'day', day: D1 });
hr.ciShiftPeriod(1);
check('C4. â€¹ â€º á»Ÿ cháº¿ Ä‘á»™ NGÃ€Y: +1 ngÃ y', hr.ciReadUi().day === '2026-10-06');
setUi({ mode: 'week', week: '2026-W41', day: D1 });
hr.ciShiftPeriod(1);
check('C5. â€¹ â€º á»Ÿ cháº¿ Ä‘á»™ TUáº¦N: +7 ngÃ y â†’ tuáº§n 42',
  (() => { const ui = hr.ciReadUi(); return ui.week === '2026-W42' && ui.day === '2026-10-12'; })());
setUi({ mode: 'month', month: MONTH });
hr.ciShiftPeriod(1);
check('C6. â€¹ â€º á»Ÿ cháº¿ Ä‘á»™ THÃNG: sang thÃ¡ng 11', hr.ciReadUi().month === '2026-11');
hr.ciShiftPeriod(-2);
check('C7. â€¹ â€º lÃ¹i 2 thÃ¡ng: vá» thÃ¡ng 9', hr.ciReadUi().month === '2026-09');
hr.ciGoToday();
check('C8. HÃ´m Nay â†’ cháº¿ Ä‘á»™ NGÃ€Y Ä‘Ãºng hÃ´m nay',
  (() => { const ui = hr.ciReadUi(); const t = new Date();
    const iso = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    return ui.mode === 'day' && ui.day === iso; })());
setUi({ mode: 'week', week: '2026-W41', day: D1 });
hr.ciOnDayInput('2026-10-14');
check('C9. Äá»•i Ã´ NgÃ y á»Ÿ cháº¿ Ä‘á»™ TUáº¦N â†’ nháº£y sang tuáº§n chá»©a ngÃ y Ä‘Ã³',
  (() => { const ui = hr.ciReadUi(); return ui.week === '2026-W42' && ui.day === '2026-10-14'; })());
setUi({ mode: 'month', month: MONTH });
hr.ciOnDayInput('2026-09-30');
check('C10. Äá»•i Ã´ NgÃ y á»Ÿ cháº¿ Ä‘á»™ THÃNG â†’ cáº­p nháº­t thÃ¡ng theo ngÃ y', hr.ciReadUi().month === '2026-09');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• D. PHáº M VI "ÃP Dá»¤NG / XÃ“A" THEO Ká»² ÄANG XEM â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function seed3() {
  reset({
    hrAssignments: [asg('e1', D1), asg('e2', D2), asg('e1', DS)],
    hrCheckins: [ci('e1', D1, '07:00', '17:30'), ci('e2', D2, '07:00', '17:30'), ci('e1', DS, '07:00', '17:30')]
  });
}
seed3();
setUi({ mode: 'month', month: MONTH });
check('D1. Cháº¿ Ä‘á»™ THÃNG: káº¿ hoáº¡ch Ã¡p dá»¥ng Ä‘áº¿m 2 ngÃ y cá»§a thÃ¡ng 10', hr.ciBulkPlanOf('apply').count === 2);
setUi({ mode: 'day', day: D1 });
check('D2. Cháº¿ Ä‘á»™ NGÃ€Y: chá»‰ Ä‘áº¿m Ä‘Ãºng ngÃ y 05/10',
  (() => { const p = hr.ciBulkPlanOf('apply'); return p.count === 1 && p.range.from === D1 && p.range.to === D1; })());
check('D3. Cháº¿ Ä‘á»™ NGÃ€Y: nhÃ£n ká»³ trong modal Ä‘Ãºng ngÃ y', hr.ciBulkPlanOf('apply').range.label.indexOf('05/10/2026') !== -1);
hr.applyAllCheckins('theo ngÃ y');
check('D4. Ãp dá»¥ng á»Ÿ cháº¿ Ä‘á»™ NGÃ€Y chá»‰ cháº¥m 1 ngÃ y',
  state.hrAttendance.length === 1 && state.hrAttendance[0].date === D1);
seed3();
setUi({ mode: 'week', week: '2026-W41', day: D1 });
check('D5. Cháº¿ Ä‘á»™ TUáº¦N: Ä‘áº¿m 2 ngÃ y trong tuáº§n 41', hr.ciBulkPlanOf('apply').count === 2);
check('D6. Tuáº§n 41 KHÃ”NG tÃ­nh ngÃ y 30/09 (tuáº§n 40)',
  (() => { const p = hr.ciBulkPlanOf('delete'); return p.count === 2; })());
hr.deleteCheckinsAll('xÃ³a tuáº§n');
check('D7. XÃ³a á»Ÿ cháº¿ Ä‘á»™ TUáº¦N chá»‰ xÃ³a 2 báº£n ghi trong tuáº§n, giá»¯ 30/09',
  state.hrCheckins.length === 1 && state.hrCheckins[0].date === DS);
reset({
  hrAssignments: [asg('e1', DS), asg('e2', '2026-10-02')],
  hrCheckins: [ci('e1', DS, '07:00', '17:30'), ci('e2', '2026-10-02', '07:00', '17:30')]
});
setUi({ mode: 'week', week: '2026-W40', day: DS });
check('D8. Tuáº§n Váº®T 2 THÃNG Ä‘áº¿m Ä‘Ãºng ngÃ y 30/09 + 02/10', hr.ciBulkPlanOf('apply').count === 2);
state.hrPayLocks = [{ id: 'paylock-2026-09', month: '2026-09', status: 'da_chot', approvedByName: 'GÄ' }];
check('D9. Tuáº§n váº¯t 2 thÃ¡ng: thÃ¡ng 9 Ä‘Ã£ chá»‘t â†’ CHáº¶N thao tÃ¡c',
  hr.applyAllCheckins('x') === false && (state.hrAttendance || []).length === 0);
check('D10. Modal bulk cáº£nh bÃ¡o Ä‘Ãºng thÃ¡ng bá»‹ khÃ³a',
  (() => { hr.openCiBulkModal('apply');
    const w = document.getElementById('ci-bulk-warn');
    const ok = w.hidden === false && w.textContent.indexOf('09/2026') !== -1;
    hr.closeCiBulkModal();
    return ok; })());

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• E. CHÃP Lá»ŒC + NHáº¢Y + TÃ” SÃNG â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function seedChips() {
  reset({
    hrAssignments: [asg('e1', D1), asg('e2', D1), asg('e3', D1)],
    hrCheckins: [ci('e1', D1, '07:30', '17:30'), ci('e2', D1, '07:00', '17:30')],
    hrAttendance: [
      { id: 'att-e1', employeeId: 'e1', date: D1, status: 'work' },
      { id: 'att-e2', employeeId: 'e2', date: D1, status: 'work' }
    ]
  });
  setUi({ mode: 'day', day: D1, onlyIssues: false });
  document.getElementById('hr-ci-only-issues').checked = false;
}
seedChips();
const rowsAll = hr.ciRowsForRange(D1, D1, { onlyIssues: false, onlyAnomaly: false });
const sumAll = hr.ciSummaryOf(rowsAll);
check('E1. Dá»¯ liá»‡u máº«u: 1 Ä‘i muá»™n + 1 khá»›p + 1 khÃ´ng quáº¹t mÃ¡y',
  rowsAll.length === 3 && sumAll.late === 1 && sumAll.ok >= 1 && sumAll.noPunch === 1);
check('E2. ChÃ­p sinh Ä‘á»§ data-ci-chip (Tá»•ng + nhÃ³m cÃ³ sá»‘)',
  (() => { const html = hr.ciChipsHtml(sumAll, rowsAll.length, { chip: '' });
    return html.indexOf('data-ci-chip="all"') !== -1 && html.indexOf('data-ci-chip="late"') !== -1 &&
      html.indexOf('data-ci-chip="noPunch"') !== -1 && html.indexOf('is-active') !== -1; })());
hr.ciOnChipClick('late');
const uiLate = hr.ciReadUi();
const bodyLate = document.getElementById('hr-ci-body').innerHTML;
check('E3. Báº¥m chÃ­p "Äi muá»™n" â†’ lÆ°u chip + tá»± bá» tick cáº§n xÃ¡c nháº­n',
  uiLate.chip === 'late' && uiLate.onlyIssues === false);
check('E4. Báº£ng chá»‰ cÃ²n dÃ²ng Ä‘i muá»™n + TÃ” SÃNG dÃ²ng Ä‘áº§u + cÃ³ data-ci-row',
  bodyLate.indexOf('Nguyá»…n VÄƒn A') !== -1 && bodyLate.indexOf('Tráº§n Thá»‹ B') === -1 &&
  bodyLate.indexOf('ci-row-flash') !== -1 && bodyLate.indexOf('data-ci-row="e1|' + D1 + '"') !== -1);
check('E5. ChÃ­p Ä‘ang chá»n cÃ³ is-active + aria-pressed=true',
  (() => { const html = document.getElementById('hr-ci-chips').innerHTML;
    return /data-ci-chip="late"[^>]*aria-pressed="true"/.test(html) || /aria-pressed="true"[^>]*data-ci-chip="late"/.test(html); })());
check('E6. Dáº£i chÃ­p váº«n Ä‘áº¿m theo Ká»² (Tá»•ng 3, khÃ´ng co láº¡i theo lá»c)',
  document.getElementById('hr-ci-chips').innerHTML.indexOf('Tá»•ng: <strong>3</strong>') !== -1);
check('E7. TiÃªu Ä‘á» Ä‘áº¿m ghi Ä‘ang lá»c nhÃ³m nÃ o',
  document.getElementById('hr-ci-count').textContent.indexOf('Ä‘ang lá»c: Äi muá»™n') !== -1);
hr.ciOnChipClick('late');
check('E8. Báº¥m láº¡i chÃ­p Ä‘ang chá»n â†’ Bá»Ž lá»c + tráº£ láº¡i "chá»‰ dÃ²ng cáº§n xÃ¡c nháº­n"',
  (() => { const ui = hr.ciReadUi(); return ui.chip === '' && ui.onlyIssues === true; })());
hr.ciOnChipClick('noPunch');
check('E9. ChÃ­p "KhÃ´ng quáº¹t mÃ¡y" lá»c Ä‘Ãºng dÃ²ng cÃ³ bá»‘ trÃ­ nhÆ°ng khÃ´ng quáº¹t',
  document.getElementById('hr-ci-body').innerHTML.indexOf('LÃª VÄƒn C') !== -1 &&
  document.getElementById('hr-ci-body').innerHTML.indexOf('Nguyá»…n VÄƒn A') === -1);
hr.ciOnChipClick('all');
check('E10. ChÃ­p "Tá»•ng" = bá» lá»c chip', hr.ciReadUi().chip === '');
check('E11. ciChipCountOf + ciChipLabelOf Ä‘Ãºng',
  hr.ciChipCountOf('late', sumAll) === 1 && hr.ciChipLabelOf('noPunch') === 'KhÃ´ng quáº¹t mÃ¡y');
check('E12. NhÃ³m khÃ´ng cÃ³ dÃ²ng â†’ chÃ­p áº©n (khÃ´ng hiá»‡n sá»‘ 0)',
  hr.ciChipsHtml({ ok: 0, review: 0, bad: 0, late: 1, early: 0, noOut: 0, noIn: 0, nightOut: 0, noPunch: 0, noPlan: 0, leavePunch: 0, absent: 0, otDiff: 0 }, 3, { chip: '' }).indexOf('Vá» sá»›m') === -1);
check('E13. ciScrollToFirstRow khÃ´ng nÃ©m lá»—i khi thiáº¿u DOM tháº­t', typeof hr.ciScrollToFirstRow() === 'boolean');
check('E14. Lá»c chÃ­p khÃ´ng cÃ³ káº¿t quáº£ â†’ thÃ´ng bÃ¡o Ä‘Ãºng nhÃ³m',
  (() => {
    reset({
      hrAssignments: [asg('e2', D3)],
      hrCheckins: [ci('e2', D3, '07:00', '17:30')],
      hrAttendance: [{ id: 'att-e2-d3', employeeId: 'e2', date: D3, status: 'work' }]
    });
    setUi({ mode: 'day', day: D3 });
    hr.ciOnChipClick('late');
    const html = document.getElementById('hr-ci-body').innerHTML;
    const ok = html.indexOf('KhÃ´ng cÃ³ dÃ²ng nÃ o thuá»™c nhÃ³m') !== -1;
    hr.ciOnChipClick('all');
    return ok;
  })());

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• F. Cáº¤U TRÃšC + ÄIá»€U HÆ¯á»šNG NGÆ¯á»¢C â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const idxHtml = read('../index.html');
const hrSrc = read('../js/hr.js');
const evSrc = read('../js/events.js');
const cssSrc = read('../styles.css');
const swSrc = read('../sw.js');
const stateSrc = read('../js/state.js');

check('F1. index cÃ³ 3 nÃºt cháº¿ Ä‘á»™ + Ã´ ngÃ y + nÃºt HÃ´m Nay + nhÃ£n ká»³',
  (idxHtml.match(/data-ci-mode=/g) || []).length === 3 && idxHtml.includes('id="hr-ci-day"') &&
  idxHtml.includes('id="btn-ci-today"') && idxHtml.includes('id="hr-ci-period-label"'));
check('F2. Ã” NgÃ y/ThÃ¡ng máº·c Ä‘á»‹nh áº©n (JS báº­t theo cháº¿ Ä‘á»™)',
  /id="hr-ci-day"[^>]*hidden/.test(idxHtml) && /id="hr-ci-month"[^>]*hidden/.test(idxHtml));
check('F3. events ná»‘i Ä‘á»§ cháº¿ Ä‘á»™ + chÃ­p + hÃ´m nay + â€¹ â€º',
  evSrc.includes("safeOn('hr-ci-day', 'change'") && evSrc.includes("safeOn('btn-ci-today', 'click', ciGoToday)") &&
  evSrc.includes('ciShiftPeriod(-1)') && evSrc.includes('ciShiftPeriod(1)') &&
  evSrc.includes("closest('[data-ci-mode]')") && evSrc.includes("closest('[data-ci-chip]')"));
check('F4. events ná»‘i Ä‘iá»u hÆ°á»›ng ngÆ°á»£c (ngÃ y / tÃªn NV / giá» mÃ¡y)',
  evSrc.includes("closest('[data-ci-goto-day]')") && evSrc.includes("[data-ci-emp].ci-cell-link"));
check('F5. CSS cÃ³ thanh cháº¿ Ä‘á»™ + chÃ­p active + hiá»‡u á»©ng tÃ´ sÃ¡ng',
  cssSrc.includes('.ci-period-btn') && cssSrc.includes('.ci-period-label') &&
  cssSrc.includes('.hr-stat-chip.ci-chip') && cssSrc.includes('@keyframes ciFlash') &&
  cssSrc.includes('tr.ci-row-flash > td'));
check('F6. CSS cÃ³ link báº¥m Ä‘Æ°á»£c trong Ã´ (NgÃ y / tÃªn NV)', cssSrc.includes('.ci-cell-link'));
check('F7. Báº£ng váº«n 8 cá»™t (khÃ´ng thÃªm cá»™t gÃ¢y trÃ n ngang)',
  (() => { const seg = idxHtml.slice(idxHtml.indexOf('id="hr-ci-table"'), idxHtml.indexOf('id="hr-ci-body"'));
    return (seg.match(/<th[\s>]/g) || []).length === 8; })());
check('F8. DÃ²ng cÃ³ data-ci-row + Ã´ NgÃ y/TÃªn báº¥m Ä‘Æ°á»£c + giá» mÃ¡y má»Ÿ Xá»­ lÃ½',
  hrSrc.includes('data-ci-row="${escapeHTML(key)}"') &&
  hrSrc.includes('data-ci-goto-day=') && hrSrc.includes('data-ci-emp="${escapeHTML(r.employeeId)}"') &&
  hrSrc.includes('data-ci-open-pay="1"'));
check('F9. Chip lÃ  BUTTON (khÃ´ng cÃ²n span tÄ©nh) + cÃ³ aria-pressed',
  hrSrc.includes('data-ci-chip="${d.key}"') && hrSrc.includes('aria-pressed='));
check('F10. Cache + APP_VERSION = v486',
  swSrc.includes("nha-may-ngoc-son-v486") && stateSrc.includes("'v486'"));
check('F11. Modal bulk ghi rÃµ Ká»² (ngÃ y/tuáº§n/thÃ¡ng) chá»© khÃ´ng chá»‰ thÃ¡ng',
  idxHtml.includes('Ká»² Ä‘ang xem') && hrSrc.includes('plan.range && plan.range.label'));

console.log(`\nCI-PERIOD-CHIP: ${passed} PASS, ${failed} FAIL`);
if (failed) process.exitCode = 1;

