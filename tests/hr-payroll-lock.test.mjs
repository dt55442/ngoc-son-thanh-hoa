// tests/hr-payroll-lock.test.mjs â€” QUYá»€N CHá»T CÃ”NG & THAO TÃC HÃ€NG LOáº T THEO Ká»²
// Giai Ä‘oáº¡n 1 (20/10/2026):
//  â€¢ 2 quyá»n RIÃŠNG do Admin cáº¥p: payApply (Ã¡p dá»¥ng/xÃ³a giá» mÃ¡y) Â· payLock (xá»­ lÃ½/chá»‘t)
//  â€¢ Ãp dá»¥ng / XÃ³a CHá»ˆ trong THÃNG Ä‘ang xem (trÆ°á»›c Ä‘Ã¢y Ã¡p cho má»i thÃ¡ng)
//  â€¢ Báº¯t buá»™c LÃ DO (lÆ°u vÃ o cháº¥m cÃ´ng: appliedBy/appliedAt/applyNote)
//  â€¢ Ká»³ Ä‘Ã£ CHá»T CÃ”NG thÃ¬ má»i thao tÃ¡c ghi Ä‘á»u bá»‹ cháº·n
'use strict';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng tests/hr-checkin-compare.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8'); // p: '../index.html'

const { state } = await import('../js/state.js');
const perms = await import('../js/permissions.js');
const hr = await import('../js/hr.js');

const MONTH = '2026-10';
const D_OCT = '2026-10-05';       // Thá»© 2
const D_SEP = '2026-09-07';       // Thá»© 2 (thÃ¡ng khÃ¡c â€” KHÃ”NG Ä‘Æ°á»£c Ä‘á»¥ng)

function reset(over) {
  state.currentUser = { id: 'u1', username: 'ed', role: 'editor', fullname: 'NgÆ°á»i Nháº­p Liá»‡u',
    editTabs: ['hr'], allowAdvanced: false, payApply: false, payLock: false };
  state.hrEmployees = [
    { id: 'e1', code: 'NV01', name: 'Nguyá»…n VÄƒn A', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'NV02', name: 'Tráº§n Thá»‹ B', department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] }
  ];
  state.hrPositions = [{ id: 'p1', name: 'Cáº¯t chá»n', department: 'XÆ°á»Ÿng 2' }];
  state.hrShifts = [];
  state.hrAssignments = [];
  state.hrAttendance = [];
  state.hrLeaves = [];
  state.hrOvertimes = [];
  state.hrCiAcks = [];
  state.hrWorkCalendar = {};
  state.hrPayLocks = [];
  state.hrPayRows = [];
  state.hrCheckins = [
    { id: 'ci-oct-e1', employeeId: 'e1', date: D_OCT, in: '07:00', out: '17:30', punchTimes: ['07:00', '17:30'], punches: 2 },
    { id: 'ci-oct-e2', employeeId: 'e2', date: D_OCT, in: '07:00', out: '17:30', punchTimes: ['07:00', '17:30'], punches: 2 },
    { id: 'ci-sep-e1', employeeId: 'e1', date: D_SEP, in: '07:00', out: '17:30', punchTimes: ['07:00', '17:30'], punches: 2 }
  ];
  localStorage.setItem('bamboo_tracker_hr_ci_ui_v1', JSON.stringify({ month: MONTH }));
  Object.assign(state, over || {});
  try { perms.syncPermissionUI(); } catch (e) {}
}
function grantPay(apply, lock) {
  state.currentUser.payApply = !!apply;
  state.currentUser.payLock = !!lock;
  perms.syncPermissionUI();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• A. QUYá»€N CHá»T CÃ”NG â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
reset();
check('A1. normalizeUser: máº·c Ä‘á»‹nh payApply/payLock = false',
  (() => { const u = perms.normalizeUser({ username: 'x', role: 'editor', editTabs: ['hr'] });
    return u.payApply === false && u.payLock === false; })());
check('A2. Editor cÃ³ quyá»n tab NhÃ¢n sá»± nhÆ°ng CHÆ¯A cÃ³ quyá»n chá»‘t cÃ´ng',
  perms.canEditTab('hr') === true && perms.canPayApply() === false && perms.canPayLock() === false);
check('A3. Cáº¥p payApply â†’ canPayApply true, canPayLock VáºªN false',
  (() => { grantPay(true, false); return perms.canPayApply() === true && perms.canPayLock() === false; })());
check('A4. Cáº¥p payLock â†’ canPayLock true',
  (() => { grantPay(false, true); return perms.canPayLock() === true && perms.canPayApply() === false; })());
check('A5. Admin luÃ´n cÃ³ cáº£ 2 quyá»n',
  (() => { state.currentUser = { username: 'admin', role: 'admin', editTabs: [] };
    return perms.canPayApply() === true && perms.canPayLock() === true; })());
check('A6. syncPermissionUI Ä‘áº·t body[data-pay-perms] = "apply lock"',
  (() => { reset(); grantPay(true, true); return document.body.dataset.payPerms === 'apply lock'; })());
check('A7. KhÃ´ng cÃ³ quyá»n â†’ data-pay-perms rá»—ng',
  (() => { reset(); return document.body.dataset.payPerms === ''; })());

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• B. ÃP Dá»¤NG / XÃ“A THEO Ká»² â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
reset();
check('B1. ChÆ°a cÃ³ quyá»n â†’ applyAllCheckins tráº£ false, KHÃ”NG cháº¥m cÃ´ng',
  hr.applyAllCheckins('test') === false && (state.hrAttendance || []).length === 0);
check('B2. ChÆ°a cÃ³ quyá»n â†’ deleteCheckinsAll tráº£ false, giá»¯ nguyÃªn dá»¯ liá»‡u',
  hr.deleteCheckinsAll('test') === false && state.hrCheckins.length === 3);

reset(); grantPay(true, false);
const planApply = hr.ciBulkPlanOf('apply');
check('B3. Káº¿ hoáº¡ch Ã¡p dá»¥ng chá»‰ tÃ­nh THÃNG Ä‘ang xem (2 ngÃ y Â· 2 NV)',
  planApply.month === MONTH && planApply.count === 2 && planApply.unit.indexOf('2 nhÃ¢n viÃªn') !== -1);
const nApplied = hr.applyAllCheckins('Ä‘á»‘i chiáº¿u thÃ¡ng 10');
check('B4. Ãp dá»¥ng Ä‘Ãºng 2 ngÃ y cá»§a thÃ¡ng 10 (KHÃ”NG Ä‘á»¥ng thÃ¡ng 9)', nApplied === 2);
check('B5. Chá»‰ thÃ¡ng 10 Ä‘Æ°á»£c cháº¥m Äi lÃ m',
  state.hrAttendance.length === 2 && state.hrAttendance.every(a => a.date === D_OCT && a.status === 'work'));
check('B6. LÆ°u váº¿t ngÆ°á»i Ã¡p dá»¥ng + lÃ½ do trÃªn báº£n ghi cháº¥m cÃ´ng',
  state.hrAttendance.every(a => a.appliedBy === 'NgÆ°á»i Nháº­p Liá»‡u' && a.applyNote === 'Ä‘á»‘i chiáº¿u thÃ¡ng 10' && !!a.appliedAt));
check('B7. Ãp dá»¥ng láº¡i láº§n 2 â†’ khÃ´ng cÃ²n ngÃ y nÃ o cáº§n Ã¡p dá»¥ng', hr.applyAllCheckins('láº§n 2') === false);

reset(); grantPay(true, false);
const planDel = hr.ciBulkPlanOf('delete');
check('B8. Káº¿ hoáº¡ch xÃ³a chá»‰ Ä‘áº¿m báº£n ghi thÃ¡ng 10 (2)', planDel.count === 2 && planDel.unit.indexOf('báº£n ghi') !== -1);
const nDeleted = hr.deleteCheckinsAll('náº¡p láº¡i file');
check('B9. XÃ³a Ä‘Ãºng 2 báº£n ghi thÃ¡ng 10, GIá»® báº£n ghi thÃ¡ng 9',
  nDeleted === 2 && state.hrCheckins.length === 1 && state.hrCheckins[0].date === D_SEP);
check('B10. XÃ³a cÃ³ tombstone (mÃ¡y khÃ¡c khÃ´ng há»“i sinh)',
  String(localStorage.getItem('bamboo_tracker_deleted_ids_v1') || '').indexOf('ci-oct-e1') !== -1);

// â”€â”€ Ká»³ Ä‘Ã£ chá»‘t cÃ´ng: má»i thao tÃ¡c ghi Ä‘á»u bá»‹ cháº·n â”€â”€
reset(); grantPay(true, true);
state.hrPayLocks = [{ id: 'paylock-2026-10', month: MONTH, status: 'da_chot', approvedByName: 'GiÃ¡m Äá»‘c' }];
check('B11. Ká»³ Ä‘Ã£ chá»‘t â†’ applyAllCheckins bá»‹ cháº·n',
  hr.applyAllCheckins('x') === false && (state.hrAttendance || []).length === 0);
check('B12. Ká»³ Ä‘Ã£ chá»‘t â†’ deleteCheckinsAll bá»‹ cháº·n, dá»¯ liá»‡u cÃ²n nguyÃªn',
  hr.deleteCheckinsAll('x') === false && state.hrCheckins.length === 3);
check('B13. Ká»³ Ä‘Ã£ chá»‘t â†’ xÃ³a 1 báº£n ghi cÅ©ng bá»‹ cháº·n',
  (() => { hr.deleteCheckin('ci-oct-e1'); return state.hrCheckins.length === 3; })());
check('B14. ciPayLockOfMonth tÃ¬m Ä‘Ãºng báº£n chá»‘t',
  hr.ciPayLockOfMonth(MONTH) && hr.ciPayLockOfMonth(MONTH).approvedByName === 'GiÃ¡m Äá»‘c');
check('B15. ciRequireMonthUnlocked cháº·n kÃ¨m thÃ´ng bÃ¡o',
  hr.ciRequireMonthUnlocked(MONTH, 'test') === false && hr.ciRequireMonthUnlocked('2026-09', 'test') === true);
check('B16. NhÃ£n ká»³ dáº¡ng MM/YYYY', hr.ciMonthShort('2026-10') === '10/2026');

// â”€â”€ Modal bulk â”€â”€
reset();
hr.openCiBulkModal('apply');
check('B17. ChÆ°a cÃ³ quyá»n â†’ modal bulk KHÃ”NG má»Ÿ',
  document.getElementById('modal-ci-bulk').classList.contains('show') === false);
reset(); grantPay(true, true);
hr.openCiBulkModal('apply');
check('B18. Modal bulk má»Ÿ, hiá»‡n Ä‘Ãºng ká»³ + sá»‘ ngÃ y',
  document.getElementById('modal-ci-bulk').classList.contains('show') === true &&
  document.getElementById('ci-bulk-scope-info').textContent.indexOf('ThÃ¡ng 10/2026') === 0 &&
  document.getElementById('ci-bulk-scope-info').textContent.indexOf('2') !== -1);
check('B19. Modal bulk: kind = apply', document.getElementById('ci-bulk-kind').value === 'apply');
hr.closeCiBulkModal();
check('B20. ÄÃ³ng modal bulk', document.getElementById('modal-ci-bulk').classList.contains('show') === false);
state.hrPayLocks = [{ id: 'paylock-2026-10', month: MONTH, status: 'da_chot', approvedByName: 'GiÃ¡m Äá»‘c' }];
hr.openCiBulkModal('delete');
check('B21. Modal bulk cáº£nh bÃ¡o khi ká»³ Ä‘Ã£ chá»‘t cÃ´ng',
  document.getElementById('ci-bulk-warn').hidden === false &&
  document.getElementById('ci-bulk-warn').textContent.indexOf('CHá»T CÃ”NG') !== -1);
check('B22. Modal bulk kind = delete', document.getElementById('ci-bulk-kind').value === 'delete');
hr.closeCiBulkModal();

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• C. Cáº¤U TRÃšC (index / js / css / sw) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const idxHtml = read('../index.html');
const hrSrc = read('../js/hr.js');
const cloudSrc = read('../js/cloud.js');
const permSrc = read('../js/permissions.js');
const authSrc = read('../js/auth.js');
const evSrc = read('../js/events.js');
const cssSrc = read('../styles.css');
const swSrc = read('../sw.js');
const stateSrc = read('../js/state.js');

check('C1. index cÃ³ modal bulk Ä‘áº§y Ä‘á»§ id',
  idxHtml.includes('id="modal-ci-bulk"') && idxHtml.includes('id="ci-bulk-form"') &&
  idxHtml.includes('id="ci-bulk-kind"') && idxHtml.includes('id="ci-bulk-scope-info"') &&
  idxHtml.includes('id="ci-bulk-reason"') && idxHtml.includes('id="ci-bulk-warn"'));
check('C2. index cÃ³ 4 Ã´ quyá»n chá»‘t cÃ´ng (2 modal ngÆ°á»i dÃ¹ng)',
  idxHtml.includes('id="new-user-pay-apply"') && idxHtml.includes('id="new-user-pay-lock"') &&
  idxHtml.includes('id="user-perms-pay-apply"') && idxHtml.includes('id="user-perms-pay-lock"'));
check('C3. NÃºt hÃ ng loáº¡t + Äiá»n giá» káº¿t thÃºc dÃ¹ng data-pay="apply" (khÃ´ng cÃ²n data-perm="hr")',
  /id="btn-apply-all-checkins"[^>]*data-pay="apply"/.test(idxHtml) &&
  /id="btn-delete-checkins-all"[^>]*data-pay="apply"/.test(idxHtml) &&
  /id="btn-ci-endfill"[^>]*data-pay="apply"/.test(idxHtml));
check('C4. hr.js gÃ¡c requirePayApply á»Ÿ 6 chá»— ghi dá»¯ liá»‡u cÃ´ng',
  (hrSrc.match(/requirePayApply\(\)/g) || []).length >= 6);
check('C5. NÃºt Ãp Dá»¥ng / XÃ³a tá»«ng dÃ²ng mang data-pay="apply"',
  (hrSrc.match(/data-pay="apply"/g) || []).length >= 2);
check('C6. cloud.js xuáº¥t requirePayApply + requirePayLock',
  cloudSrc.includes('function requirePayApply()') && cloudSrc.includes('function requirePayLock()') &&
  /\brequirePayApply,/.test(cloudSrc) && /\brequirePayLock,/.test(cloudSrc));
check('C7. cloud.js Ä‘á»c grants.payApply/payLock khi Ä‘Äƒng nháº­p Firebase',
  cloudSrc.includes('grants.payApply') && cloudSrc.includes('grants.payLock'));
check('C8. permissions.js cÃ³ canPayApply/canPayLock + dataset.payPerms',
  permSrc.includes('export function canPayApply()') && permSrc.includes('export function canPayLock()') &&
  permSrc.includes("body.dataset.payPerms"));
check('C9. normalizeUser KHÃ”NG tá»± cáº¥p quyá»n chá»‘t cÃ´ng',
  permSrc.includes('u.payApply = u.payApply === true') && permSrc.includes('u.payLock  = u.payLock === true'));
check('C10. auth.js lÆ°u payApply/payLock (+ khoXuat/khoApprove) vÃ o userGrants + Ä‘á»c checkbox',
  authSrc.includes('payApply, payLock, khoXuat, khoApprove }') && authSrc.includes("new-user-pay-apply") &&
  authSrc.includes("user-perms-pay-apply"));
check('C11. auth.js giá»¯ 2 quyá»n khi Admin chá»‰ Ä‘á»•i vai trÃ²',
  authSrc.includes('payApply: role === \'admin\' ? true : grants.payApply === true'));
check('C12. events.js ná»‘i modal bulk (form/Ä‘Ã³ng/má»Ÿ)',
  evSrc.includes("safeOn('ci-bulk-form', 'submit', ciBulkSubmit)") &&
  evSrc.includes("openCiBulkModal('apply')") && evSrc.includes("openCiBulkModal('delete')"));
check('C13. CSS áº©n nÃºt theo data-pay-perms',
  cssSrc.includes('body:not([data-pay-perms~="apply"]) [data-pay="apply"]') &&
  cssSrc.includes('body:not([data-pay-perms~="lock"]) [data-pay="lock"]'));
check('C14. Cache + APP_VERSION = v486',
  swSrc.includes("nha-may-ngoc-son-v486") && stateSrc.includes("'v486'"));
check('C15. hr.js xuáº¥t cÃ¡c hÃ m bulk/phá»¥ trá»£ cho test',
  hrSrc.includes('openCiBulkModal,') && hrSrc.includes('closeCiBulkModal,') &&
  hrSrc.includes('ciBulkSubmit,') && hrSrc.includes('ciPayLockOfMonth,'));
check('C16. Báº£ng Ä‘á»‘i chiáº¿u váº«n 8 cá»™t (khÃ´ng thÃªm cá»™t gÃ¢y trÃ n ngang)',
  (() => { const seg = idxHtml.slice(idxHtml.indexOf('id="hr-ci-table"'), idxHtml.indexOf('id="hr-ci-body"'));
    return (seg.match(/<th[\s>]/g) || []).length === 8; })());

console.log(`\nHR-PAYROLL-LOCK: ${passed} PASS, ${failed} FAIL`);
if (failed) process.exitCode = 1;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• D. Xá»¬ LÃ DÃ’NG CÃ”NG (GIAI ÄOáº N 2) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function seedWorkDay(over) {
  reset(Object.assign({
    hrAssignments: [{ id: 'a1', employeeId: 'e1', date: D_OCT, department: 'XÆ°á»Ÿng 2', positionId: 'p1', shiftIdx: 0, start: '07:00', end: '' }],
    hrCheckins: [{ id: 'ci-oct-e1', employeeId: 'e1', date: D_OCT, in: '07:00', out: '19:30', punchTimes: ['07:00', '19:30'], punches: 2 }]
  }, over || {}));
  grantPay(true, true);
}

seedWorkDay();
check('D1. ChÆ°a cÃ³ quyá»n chá»‘t cÃ´ng â†’ KHÃ”NG xá»­ lÃ½ Ä‘Æ°á»£c dÃ²ng',
  (() => { grantPay(false, false); return hr.payAcceptRow('e1', D_OCT, {}) === false && (state.hrPayRows || []).length === 0; })());

grantPay(true, true);
check('D2. Cháº¥p nháº­n giá» lÃ m (tÃ­nh TC theo mÃ¡y) â†’ ÄÃ£ chá»‘t, TC 2h',
  (() => {
    const ok = hr.payAcceptRow('e1', D_OCT, { otMode: 'asIs', reason: 'Ä‘Ã£ kiá»ƒm tra' });
    const row = hr.payRowOf('e1', D_OCT);
    const eff = hr.payEffectiveOf(row);
    return ok && row.status === 'da_chot' && row.action === 'accept' &&
      eff.hc === 540 && eff.tc === 120 && eff.otAcceptedMin === 120 && eff.otRejectedMin === 0;
  })());
check('D3. DÃ²ng Ä‘Ã£ chá»‘t lÆ°u áº£nh chá»¥p TRÆ¯á»šC khi xá»­ lÃ½ + ngÆ°á»i/lÃºc',
  (() => { const r = hr.payRowOf('e1', D_OCT);
    return r.before && r.before.hc === 540 && r.before.tc === 120 && r.before.otApprovedMin === 0 &&
      r.requestedBy === 'NgÆ°á»i Nháº­p Liá»‡u' && !!r.requestedAt && r.version === 1; })());

seedWorkDay(); grantPay(true, true);
hr.payAcceptRow('e1', D_OCT, { otMode: 'orderOnly' });
check('D4. Chá»n "chá»‰ tÃ­nh TC theo Ä‘Æ¡n" (Ä‘Æ¡n = 0) â†’ há»§y toÃ n bá»™ 2h TC',
  (() => { const e = hr.payEffectiveOf(hr.payRowOf('e1', D_OCT));
    return e.tc === 120 && e.otAcceptedMin === 0 && e.otRejectedMin === 120; })());
check('D5. Xá»­ lÃ½ láº¡i dÃ²ng â†’ tÄƒng version',
  (() => { hr.payAcceptRow('e1', D_OCT, { otMode: 'asIs' });
    return hr.payRowOf('e1', D_OCT).version === 2; })());

seedWorkDay(); grantPay(true, true);
check('D6. Há»§y TC vÆ°á»£t Ä‘Æ¡n â†’ CHá»œ DUYá»†T (chÆ°a chá»‘t)',
  (() => { const ok = hr.payRejectOtRow('e1', D_OCT, 'khÃ´ng Ä‘Äƒng kÃ½ trÆ°á»›c');
    const row = hr.payRowOf('e1', D_OCT);
    return ok && row.status === 'cho_duyet' && row.action === 'reject_ot' && row.after.otRejectedMin === 120; })());
check('D7. Há»§y TC thiáº¿u lÃ½ do â†’ bá»‹ cháº·n', hr.payRejectOtRow('e1', D_OCT, '') === false);
check('D8. Editor KHÃ”NG duyá»‡t Ä‘Æ°á»£c dÃ²ng cÃ´ng',
  (() => { state.currentUser = { username: 'ed', role: 'editor', editTabs: ['hr'], payApply: true, payLock: true };
    return hr.payApproveRow('e1', D_OCT) === false && hr.payRowOf('e1', D_OCT).status === 'cho_duyet'; })());
check('D9. Admin/BQL duyá»‡t â†’ ÄÃ£ chá»‘t',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'GiÃ¡m Äá»‘c', editTabs: [], payApply: true, payLock: true };
    const ok = hr.payApproveRow('e1', D_OCT);
    const row = hr.payRowOf('e1', D_OCT);
    return ok && row.status === 'da_chot' && row.approvedBy === 'GiÃ¡m Äá»‘c' && row.version === 2; })());

seedWorkDay(); grantPay(true, true);
check('D10. Sá»­a giá» mÃ¡y â†’ CHá»œ DUYá»†T, CHÆ¯A ghi vÃ o dá»¯ liá»‡u mÃ¡y',
  (() => { const ok = hr.payEditRequest('e1', D_OCT, { in: '07:00', out: '18:00' }, 'quáº¹t ra sai');
    const rec = state.hrCheckins.find(c => c.id === 'ci-oct-e1');
    const row = hr.payRowOf('e1', D_OCT);
    return ok && row.status === 'cho_duyet' && row.proposed.out === '18:00' && rec.out === '19:30'; })());
check('D11. Duyá»‡t sá»­a giá» mÃ¡y â†’ ghi vÃ o báº£n ghi mÃ¡y + tá»± chá»‘t (TC 30 phÃºt)',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'GiÃ¡m Äá»‘c', editTabs: [], payApply: true, payLock: true };
    const ok = hr.payApproveRow('e1', D_OCT);
    const rec = state.hrCheckins.find(c => c.id === 'ci-oct-e1');
    const row = hr.payRowOf('e1', D_OCT);
    return ok && rec.out === '18:00' && row.status === 'da_chot' && row.after.tc === 30; })());
check('D12. Sá»­a giá» mÃ¡y thiáº¿u lÃ½ do â†’ bá»‹ cháº·n', hr.payEditRequest('e1', D_OCT, { out: '18:00' }, '') === false);

seedWorkDay(); grantPay(true, true);
check('D13. Miá»…n trá»«: Editor/khÃ´ng pháº£i Admin bá»‹ cháº·n',
  hr.payWaiveRow('e1', D_OCT, 'quÃªn quáº¹t') === false);
check('D14. Miá»…n trá»«: Admin ghi nháº­n "Miá»…n trá»«" + lÃ½ do',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'GiÃ¡m Äá»‘c', editTabs: [], payApply: true, payLock: true };
    const ok = hr.payWaiveRow('e1', D_OCT, 'quÃªn quáº¹t mÃ¡y cÃ³ xÃ¡c nháº­n tá»• trÆ°á»Ÿng');
    const row = hr.payRowOf('e1', D_OCT);
    return ok && row.status === 'mien' && row.reason.indexOf('quÃªn quáº¹t') !== -1; })());

// â”€â”€ LIÃŠN Káº¾T ÄÆ N TÄ‚NG CA (bá»• sung â€” khÃ´ng giá»›i háº¡n ngÃ y) â”€â”€
seedWorkDay(); grantPay(true, true);
const otDraft = { id: 'ot-1', employeeId: 'e1', date: D_OCT, start: '17:30', end: '19:30', plannedMin: 120, status: 'pending' };
state.hrOvertimes = [otDraft];
hr.payMarkAddOt('e1', D_OCT, 'ot-1', 'bá»• sung Ä‘Æ¡n');
check('D15. Bá»• sung Ä‘Æ¡n TC â†’ dÃ²ng á»Ÿ tráº¡ng thÃ¡i CHá»œ DUYá»†T kÃ¨m mÃ£ Ä‘Æ¡n',
  (() => { const row = hr.payRowOf('e1', D_OCT);
    return row.action === 'add_ot' && row.status === 'cho_duyet' && row.otId === 'ot-1'; })());
check('D16. Duyá»‡t dÃ²ng kiá»ƒu "add_ot" bá»‹ cháº·n (pháº£i duyá»‡t ÄÆ N TC)',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'GiÃ¡m Äá»‘c', editTabs: [], payApply: true, payLock: true };
    return hr.payApproveRow('e1', D_OCT) === false && hr.payRowOf('e1', D_OCT).status === 'cho_duyet'; })());
otDraft.status = 'approved';
hr.paySyncOtApproved(otDraft);
check('D17. ÄÆ¡n TC Ä‘Æ°á»£c duyá»‡t Ä‘á»§ giá» â†’ DÃ’NG Tá»° CHá»T',
  (() => { const row = hr.payRowOf('e1', D_OCT);
    return row.status === 'da_chot' && row.after.otAcceptedMin === 120 && row.after.otRejectedMin === 0; })());

seedWorkDay(); grantPay(true, true);
const otSmall = { id: 'ot-2', employeeId: 'e1', date: D_OCT, start: '17:30', end: '18:00', plannedMin: 30, status: 'approved' };
state.hrOvertimes = [otSmall];
hr.payMarkAddOt('e1', D_OCT, 'ot-2', 'Ä‘Æ¡n thiáº¿u');
hr.paySyncOtApproved(otSmall);
check('D18. ÄÆ¡n duyá»‡t CHÆ¯A Ä‘á»§ giá» â†’ váº«n CHá»œ DUYá»†T + ghi rÃµ cÃ²n vÆ°á»£t',
  (() => { const row = hr.payRowOf('e1', D_OCT);
    return row.status === 'cho_duyet' && row.after.otAcceptedMin === 30 && row.after.otRejectedMin === 90 &&
      String(row.note || '').indexOf('cÃ²n vÆ°á»£t') !== -1; })());

seedWorkDay(); grantPay(true, true);
const otRej = { id: 'ot-3', employeeId: 'e1', date: D_OCT, plannedMin: 120, status: 'rejected' };
state.hrOvertimes = [otRej];
hr.payMarkAddOt('e1', D_OCT, 'ot-3', 'x');
hr.paySyncOtRejected(otRej, 'KhÃ´ng duyá»‡t');
check('D19. ÄÆ¡n TC bá»‹ tá»« chá»‘i â†’ dÃ²ng "Bá»‹ tá»« chá»‘i"',
  (() => { const row = hr.payRowOf('e1', D_OCT);
    return row.status === 'tu_choi' && String(row.rejectReason || '').indexOf('KhÃ´ng duyá»‡t') !== -1; })());

seedWorkDay(); grantPay(true, true);
hr.payAcceptRow('e1', D_OCT, { otMode: 'asIs' });
check('D20. Chip tráº¡ng thÃ¡i hiá»‡n "ÄÃ£ chá»‘t"',
  hr.payRowChipHtml('e1', D_OCT).indexOf('ÄÃ£ chá»‘t') !== -1 && hr.payRowChipHtml('e1', D_OCT).indexOf('ci-pay-chip') !== -1);
check('D21. NÃºt hÃ nh Ä‘á»™ng cÃ³ "Xá»­ lÃ½" + data-ci-pay (KHÃ”NG cÃ²n nÃºt "XÃ¡c Nháº­n")',
  (() => { const r = hr.ciCompareDay('e1', D_OCT);
    const html = hr.ciActionCell(r);
    return html.indexOf('Xá»­ lÃ½') !== -1 && html.indexOf('data-ci-pay="1"') !== -1 && html.indexOf('XÃ¡c Nháº­n') === -1; })());

// â”€â”€ Cáº¤U TRÃšC GIAI ÄOáº N 2 â”€â”€
check('D22. index cÃ³ modal xá»­ lÃ½ dÃ²ng cÃ´ng Ä‘áº§y Ä‘á»§',
  idxHtml.includes('id="modal-ci-pay"') && idxHtml.includes('id="ci-pay-form"') &&
  idxHtml.includes('id="ci-pay-action"') && idxHtml.includes('id="ci-pay-otmode-group"') &&
  idxHtml.includes('id="ci-pay-edit-group"') && idxHtml.includes('id="ci-pay-reason"'));
check('D23. index cÃ³ banner Ä‘Æ¡n TC bá»• sung trong form Ä‘Äƒng kÃ½ tÄƒng ca',
  idxHtml.includes('id="ot-ci-banner"'));
check('D24. events ná»‘i modal xá»­ lÃ½ + uá»· quyá»n nÃºt data-ci-pay',
  evSrc.includes("safeOn('ci-pay-form', 'submit', ciPaySubmit)") &&
  evSrc.includes("'[data-ci-pay],[data-ci-pay-approve],[data-ci-pay-reject]'"));
check('D25. hr.js cÃ³ openOvertimeModal(preset) Ä‘iá»n sáºµn + gáº¯n mÃ£ Ä‘Æ¡n vÃ o dÃ²ng',
  hrSrc.includes('function openOvertimeModal(preset)') && hrSrc.includes('payMarkAddOt(employeeId, date, otId') &&
  hrSrc.includes('autoFromCi: linked'));
check('D26. Ná»‘i Ä‘á»§ 2 key dÃ²ng cÃ´ng/báº£n chá»‘t (storage + cloud + history)',
  read('../js/storage.js').includes('hrPayRows') && read('../js/storage.js').includes('hrPayLocks') &&
  cloudSrc.includes('hrPayRows') && cloudSrc.includes('hrPayLocks') &&
  read('../js/history.js').includes('hrPayRows'));
check('D27. CSS cÃ³ chip tráº¡ng thÃ¡i + banner Ä‘Æ¡n TC',
  cssSrc.includes('.ci-pay-chip') && cssSrc.includes('.ot-ci-banner') && cssSrc.includes('.ci-pay-gap'));

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• E. CHá»T CÃ”NG THEO THÃNG (GIAI ÄOáº N 3) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function seedMonthOnly() {
  reset({
    hrAssignments: [{ id: 'a1', employeeId: 'e1', date: D_OCT, department: 'XÆ°á»Ÿng 2', positionId: 'p1', shiftIdx: 0, start: '07:00', end: '' }],
    hrCheckins: [{ id: 'ci-oct-e1', employeeId: 'e1', date: D_OCT, in: '07:00', out: '19:30', punchTimes: ['07:00', '19:30'], punches: 2 }]
  });
  grantPay(true, true);
}

seedMonthOnly();
const scan0 = hr.payLockScan(MONTH);
check('E1. QuÃ©t thÃ¡ng: cÃ³ dÃ²ng cÃ´ng + CHáº¶N vÃ¬ TC vÆ°á»£t Ä‘Æ¡n chÆ°a xá»­ lÃ½',
  scan0.rows.length === 1 && scan0.blockers.length === 1 &&
  scan0.blockers[0].reasons.join(' ').indexOf('TC vÆ°á»£t Ä‘Æ¡n') !== -1);
check('E2. ChÆ°a xá»­ lÃ½ dÃ²ng â†’ KHÃ”NG trÃ¬nh chá»‘t Ä‘Æ°á»£c (khÃ´ng táº¡o báº£n chá»‘t)',
  (() => { const r = hr.payPrepareLock(MONTH, {});
    return r.ok === false && (state.hrPayLocks || []).length === 0; })());

// xá»­ lÃ½ dÃ²ng rá»“i má»›i chá»‘t Ä‘Æ°á»£c
hr.payAcceptRow('e1', D_OCT, { otMode: 'asIs' });
const scan1 = hr.payLockScan(MONTH);
check('E3. Sau khi xá»­ lÃ½: KHÃ”NG cÃ²n dÃ²ng cháº·n', scan1.blockers.length === 0 && scan1.rows.length === 1);
check('E4. ChÆ°a cÃ³ quyá»n chá»‘t cÃ´ng â†’ khÃ´ng trÃ¬nh Ä‘Æ°á»£c',
  (() => { grantPay(false, false); const r = hr.payPrepareLock(MONTH, {}); return r.ok === false; })());
grantPay(true, true);
const prep = hr.payPrepareLock(MONTH, { note: 'chá»‘t thÃ¡ng 10', disputeDays: 5 });
const lock1 = hr.payLockOf(MONTH);
check('E5. TrÃ¬nh chá»‘t thÃ nh cÃ´ng â†’ "Chá» duyá»‡t" + Ä‘á»§ áº£nh chá»¥p/luáº­t/ca/bÄƒm',
  prep.ok === true && lock1 && lock1.status === 'cho_duyet' && lock1.version === 1 &&
  lock1.rows.length === 1 && !!lock1.hash && !!lock1.ruleSet && !!lock1.shiftSnap &&
  lock1.totals.length === 1 && lock1.disputeUntil > '');
check('E6. Báº£n chá»‘t lÆ°u Ä‘Ãºng sá»‘: HC 9h Â· TC 2h Â· TC ghi nháº­n 2h',
  (() => { const r = lock1.rows[0]; const t = lock1.totals[0];
    return r.hc === 540 && r.tc === 120 && r.otAcceptedMin === 120 && t.hcMin === 540 && t.tcMin === 120 && t.otMin === 120; })());
check('E7. Báº£n chá»‘t ghi ngÆ°á»i trÃ¬nh + phiÃªn báº£n app',
  lock1.preparedByName === 'NgÆ°á»i Nháº­p Liá»‡u' && lock1.appVersion === 'v486');
check('E8. BÄƒm táº¥t Ä‘á»‹nh (cÃ¹ng dá»¯ liá»‡u â†’ cÃ¹ng mÃ£)', hr.payHashStr('abc') === hr.payHashStr('abc') && hr.payHashStr('abc') !== hr.payHashStr('abd'));

check('E9. Editor KHÃ”NG duyá»‡t Ä‘Æ°á»£c chá»‘t cÃ´ng',
  (() => { state.currentUser = { username: 'ed', role: 'editor', editTabs: ['hr'], payApply: true, payLock: true };
    return hr.payApproveLock(MONTH) === false && hr.payLockOf(MONTH).status === 'cho_duyet'; })());
check('E10. Sá»‘ liá»‡u Ä‘á»•i sau khi trÃ¬nh â†’ CHáº¶N duyá»‡t (báº¯t trÃ¬nh láº¡i)',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'GiÃ¡m Äá»‘c', editTabs: [], payApply: true, payLock: true };
    const rec = state.hrCheckins.find(c => c.id === 'ci-oct-e1');
    rec.out = '18:00'; rec.punchTimes = ['07:00', '18:00'];
    const d = hr.payDriftOfLock(hr.payLockOf(MONTH));
    return d.changedCount > 0 && hr.payApproveLock(MONTH) === false; })());
check('E11. TrÃ¬nh láº¡i sau khi sá»‘ Ä‘á»•i â†’ duyá»‡t Ä‘Æ°á»£c (khÃ´ng cÃ²n lá»‡ch)',
  (() => { hr.payPrepareLock(MONTH, {});
    const ok = hr.payApproveLock(MONTH);
    const lk = hr.payLockOf(MONTH);
    return ok && lk.status === 'da_chot' && lk.approvedByName === 'GiÃ¡m Äá»‘c' && lk.selfApproved === true; })());
check('E12. Ká»³ Ä‘Ã£ chá»‘t â†’ KHÃ”NG trÃ¬nh láº¡i Ä‘Æ°á»£c', hr.payPrepareLock(MONTH, {}).ok === false);
check('E13. Ká»³ Ä‘Ã£ chá»‘t â†’ cháº·n Ã¡p dá»¥ng/xÃ³a giá» mÃ¡y',
  (() => { grantPay(true, true);
    return hr.applyAllCheckins('x') === false && hr.deleteCheckinsAll('x') === false; })());
check('E14. Má»Ÿ khÃ³a: Editor/khÃ´ng pháº£i Admin bá»‹ cháº·n',
  (() => { state.currentUser = { username: 'ad', role: 'manager', fullname: 'BQL', editTabs: ['hr'], payApply: true, payLock: true };
    return hr.payReopenLock(MONTH, 'lÃ½ do') === false; })());
check('E15. Má»Ÿ khÃ³a: Admin + lÃ½ do â†’ "ÄÃ£ má»Ÿ khÃ³a", version + 1, lÆ°u lá»‹ch sá»­',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'GiÃ¡m Äá»‘c', editTabs: [], payApply: true, payLock: true };
    const ok = hr.payReopenLock(MONTH, 'sá»­a giá» quáº¹t sai');
    const lk = hr.payLockOf(MONTH);
    return ok && lk.status === 'da_mo_khoa' && lk.version === 3 &&
      lk.reopenHistory.length === 1 && lk.reopenHistory[0].reason === 'sá»­a giá» quáº¹t sai'; })());
check('E16. Má»Ÿ khÃ³a thiáº¿u lÃ½ do â†’ bá»‹ cháº·n', hr.payReopenLock(MONTH, '') === false);
check('E17. Sau khi má»Ÿ khÃ³a â†’ trÃ¬nh láº¡i Ä‘Æ°á»£c (version tÄƒng)',
  (() => { const r = hr.payPrepareLock(MONTH, {});
    return r.ok === true && hr.payLockOf(MONTH).status === 'cho_duyet' && hr.payLockOf(MONTH).version === 4; })());

// â”€â”€ THáºº CHá»T CÃ”NG LÆ¯Æ NG â€” GIAO DIá»†N + Cáº¤U TRÃšC â”€â”€
hr.renderHrPayCard();
const payBodyHtml = document.getElementById('hr-pay-body').innerHTML;
check('E18. Tháº» chá»‘t cÃ´ng váº½ Ä‘Æ°á»£c: ká»³, tráº¡ng thÃ¡i, báº£ng theo nhÃ¢n viÃªn',
  payBodyHtml.indexOf('Ká»³:') !== -1 && payBodyHtml.indexOf('Chá» duyá»‡t') !== -1 &&
  payBodyHtml.indexOf('Nguyá»…n VÄƒn A') !== -1 && payBodyHtml.indexOf('NhÃ¢n ViÃªn') !== -1);
check('E19. Äáº¿m trÃªn mini card pháº£n Ã¡nh tráº¡ng thÃ¡i ká»³',
  hr.HR_CARD_DEFS['hr-pay-card'].count().indexOf('Chá» duyá»‡t') !== -1);
check('E20. index cÃ³ tháº» + modal chá»‘t cÃ´ng Ä‘áº§y Ä‘á»§',
  idxHtml.includes('id="hr-pay-card"') && idxHtml.includes('id="hr-pay-body"') &&
  idxHtml.includes('id="hr-pay-month"') && idxHtml.includes('id="btn-pay-prepare"') &&
  idxHtml.includes('id="btn-pay-approve"') && idxHtml.includes('id="btn-pay-reopen"') &&
  idxHtml.includes('id="modal-pay-lock"') && idxHtml.includes('id="pay-lock-form"') &&
  idxHtml.includes('id="pay-lock-dispute"'));
check('E21. events ná»‘i tháº» chá»‘t cÃ´ng + modal',
  evSrc.includes("safeOn('btn-pay-prepare', 'click'") && evSrc.includes("safeOn('hr-pay-month', 'change', renderHrPayCard)") &&
  evSrc.includes("safeOn('pay-lock-form', 'submit', payLockSubmit)"));
check('E22. hr.js render theo pháº§n + Ä‘Äƒng kÃ½ tháº» (pay)',
  hrSrc.includes("'hr-pay-card': ['pay']") && hrSrc.includes("renderHrPayCard();"));
check('E23. CSS cÃ³ tráº¡ng thÃ¡i/cáº£nh bÃ¡o/khá»‘i cháº·n cá»§a tháº» chá»‘t cÃ´ng',
  cssSrc.includes('.pay-lock-state') && cssSrc.includes('.pay-lock-drift') &&
  cssSrc.includes('.pay-lock-blockers') && cssSrc.includes('.pay-lock-meta'));
check('E24. NÃºt duyá»‡t chá»‰ hiá»‡n cho Admin/BQL, nÃºt má»Ÿ khÃ³a chá»‰ Admin',
  /id="btn-pay-approve"[^>]*data-manager-only|data-manager-only[^>]*id="btn-pay-approve"/.test(idxHtml) &&
  /id="btn-pay-reopen"[^>]*data-admin-only|data-admin-only[^>]*id="btn-pay-reopen"/.test(idxHtml));

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• F. IN PHIáº¾U CÃ”NG + BÃO CÃO (GIAI ÄOáº N 4) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const slipHtml = hr.paySlipPagesHtml(MONTH);
check('F1. Phiáº¿u cÃ´ng: má»—i nhÃ¢n viÃªn 1 trang + Ä‘á»§ 3 Ã´ kÃ½ + mÃ£ Ä‘á»‘i chiáº¿u',
  (slipHtml.match(/class="payslip-page"/g) || []).length === 1 &&
  slipHtml.indexOf('PHIáº¾U XÃC NHáº¬N CÃ”NG') !== -1 &&
  slipHtml.indexOf('NgÆ°á»i lao Ä‘á»™ng') !== -1 && slipHtml.indexOf('TrÆ°á»Ÿng bá»™ pháº­n') !== -1 &&
  slipHtml.indexOf('Káº¿ toÃ¡n / Quáº£n trá»‹') !== -1 && slipHtml.indexOf('MÃ£ Ä‘á»‘i chiáº¿u') !== -1);
check('F2. Ká»³ chÆ°a chá»‘t â†’ phiáº¿u ghi Báº¢N NHÃP',
  (() => { const saved = state.hrPayLocks; state.hrPayLocks = [];
    const html = hr.paySlipPagesHtml(MONTH);
    state.hrPayLocks = saved;
    return html.indexOf('Báº¢N NHÃP') !== -1; })());
check('F3. Phiáº¿u cÃ³ Ä‘á»§ cá»™t ngÃ y/giá» HC/giá» TC/TC ghi nháº­n + quy táº¯c lÃ m trÃ²n',
  slipHtml.indexOf('Giá» HC') !== -1 && slipHtml.indexOf('Giá» TC') !== -1 &&
  slipHtml.indexOf('TC ghi nháº­n') !== -1 && slipHtml.indexOf('lÃ m trÃ²n') !== -1);
check('F4. ÄÃ¡nh dáº¥u ÄÃƒ THU phiáº¿u giáº¥y lÆ°u vÃ o báº£n chá»‘t + hiá»‡n trÃªn phiáº¿u in',
  (() => {
    const ok = hr.payMarkPaperSigned('e1', true);
    const lk = hr.payLockOf(MONTH);
    const html = hr.paySlipPagesHtml(MONTH);
    return ok && lk.paperSigned.length === 1 && lk.paperSigned[0].employeeId === 'e1' &&
      html.indexOf('ÄÃƒ THU') !== -1;
  })());
check('F5. Bá» Ä‘Ã¡nh dáº¥u phiáº¿u giáº¥y',
  (() => { hr.payMarkPaperSigned('e1', false); return hr.payLockOf(MONTH).paperSigned.length === 0; })());
check('F6. In: Ä‘á»• ná»™i dung vÃ o vÃ¹ng in + báº­t body.pay-printing',
  (() => { let printed = false;
    globalThis.print = () => { printed = true; };
    hr.renderPayPrintPreview(MONTH);
    hr.doPayPrint();
    return printed === true && document.getElementById('pay-print-area').innerHTML.indexOf('payslip-page') !== -1 &&
      document.body.classList.contains('pay-printing'); })());
check('F7. index cÃ³ modal in phiáº¿u + vÃ¹ng in tháº­t',
  idxHtml.includes('id="modal-pay-print"') && idxHtml.includes('id="pay-print-preview"') &&
  idxHtml.includes('id="pay-print-area"') && idxHtml.includes('id="btn-pay-print-do"') &&
  idxHtml.includes('id="btn-pay-print"'));
check('F8. CSS in phiáº¿u: chá»‰ hiá»‡n #pay-print-area + ngáº¯t trang má»—i nhÃ¢n viÃªn',
  cssSrc.includes('body.pay-printing > *:not(#pay-print-area)') &&
  cssSrc.includes('body.pay-printing #pay-print-area') && cssSrc.includes('.payslip-page'));

const specs = await import('../js/report-specs.js');
check('F9. CÃ³ 3 bÃ¡o cÃ¡o chá»‘t cÃ´ng (báº£ng chá»‘t Â· tá»•ng há»£p Â· phiáº¿u cÃ´ng)',
  !!specs.reportById('hr-pay-lock') && !!specs.reportById('hr-pay-summary') && !!specs.reportById('hr-pay-slip') &&
  specs.reportById('hr-pay-lock').group === 'hr');
check('F10. NÃºt In Phiáº¿u chá»‰ hiá»‡n cho ngÆ°á»i cÃ³ quyá»n chá»‘t cÃ´ng',
  /id="btn-pay-print"[^>]*data-pay="lock"|data-pay="lock"[^>]*id="btn-pay-print"/.test(idxHtml));
check('F11. events ná»‘i in phiáº¿u + Ä‘Ã¡nh dáº¥u phiáº¿u giáº¥y',
  evSrc.includes("safeOn('btn-pay-print-do', 'click', doPayPrint)") &&
  evSrc.includes("'[data-pay-paper]'"));

