// tests/sys-settings.test.mjs â€” CÃ€I Äáº¶T Há»† THá»NG (22/10/2026)
// Cá» hiá»ƒn thá»‹ (admin báº­t/táº¯t chá»§ Ä‘á»™ng) Â· 37 vÃ¹ng quyá»n Ã— 4 vai trÃ² Ã— 4 má»©c
// Â· áº©n nÃºt theo vÃ¹ng Â· Ã´ Sá»± cá»‘ chá»‰ Ä‘á»c Â· báº£ng vÃ  tháº» cuá»™n Ä‘á»™c láº­p.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng tests/incident-report.test.mjs) â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500, children: [], parentElement: null,
    scrollLeft: 0, scrollWidth: 800, clientWidth: 800,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c) { return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { el.children.push(c); c.parentElement = el; return c; },
    insertBefore(c) { el.children.unshift(c); c.parentElement = el; return c; },
    removeChild(c) { return c; }, remove() {},
    setAttribute(k, v) { el[k] = v; }, removeAttribute() {}, getAttribute: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset() {}, focus() {}, click() {}, animate() { return { cancel() {} }; }
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
  addEventListener() {}, removeEventListener() {}
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload() {} };
global.history = { replaceState() {}, pushState() {}, back() {}, state: null };
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
global.matchMedia = () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {} });
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
global.lucide = { createIcons() {} };
global.Chart = class { constructor() { this.data = { labels: [], datasets: [] }; } update() {} resize() {} destroy() {} render() {} reset() {} getDatasetMeta() { return { data: [] }; } };
global.Chart.register = () => {};
global.Chart.defaults = { font: {}, plugins: {}, scales: {}, color: '', borderColor: '', elements: {} };

const sys = await import('../js/sys-settings.js');
const { state } = await import('../js/state.js');
const perm = await import('../js/permissions.js');
const utils = await import('../js/utils.js');
const x2 = await import('../js/xuong2.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  âœ“ ' + name); }
  else { fail++; console.log('  âœ— FAIL: ' + name); }
}
function reset() {
  state.currentUser = null;
  state.sysSettings = {};
  state.x2OpenCardId = null;
  state.sysActiveArea = '';
  storeBacking.clear();
}
function asUser(role, extra) {
  state.currentUser = Object.assign({ id: 'u1', username: 'u1', fullname: 'U1', role, editTabs: [] }, extra || {});
  perm.normalizeUser(state.currentUser);
}

// â•â•â• A. DANH Má»¤C â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- A. Danh má»¥c cá» + vÃ¹ng quyá»n ---');
check('A1: 5 cá» hiá»ƒn thá»‹', sys.UI_FLAGS.length === 5
  && ['see.perf.cap', 'see.perf.eff', 'see.cost', 'see.pay', 'incident-manual']
    .every(id => sys.UI_FLAGS.some(f => f.id === id)));
check('A2: 37 vÃ¹ng quyá»n Â· 8 nhÃ³m', sys.PERM_AREAS.length === 37 && sys.PERM_GROUPS.length === 8);
check('A3: Ä‘á»§ 6 cá»•ng duyá»‡t tÃ¡ch riÃªng', ['ap.kho', 'ap.leave', 'ap.ot', 'ap.incident', 'ap.rate', 'ap.pay']
  .every(id => sys.PERM_AREAS.some(a => a.id === id)));
check('A4: Ä‘á»§ vÃ¹ng cÃ¡c module', ['x2.prod', 'x2.say', 'x2.kho.note', 'x2.kho.recon', 'x2.epvan', 'x2.phupham',
  'x1.prod', 'x1.close', 'x1.phoisay', 'plan.items', 'plan.rates', 'plan.stock',
  'mat.entry', 'mat.price', 'mat.supplier', 'qc.entry', 'hr.emp', 'hr.board', 'hr.att',
  'hr.machine', 'hr.calendar', 'hr.recruit', 'hr.ot.create', 'hr.leave.create',
  'sys.users', 'sys.settings', 'sys.backup', 'sys.cloud', 'sys.history', 'sys.bulk', 'sys.rates']
  .every(id => sys.PERM_AREAS.some(a => a.id === id)));
check('A5: Ã¡nh xáº¡ tháº» â†’ vÃ¹ng', sys.AREA_BY_CARD['x2-than-hoa-card'] === 'x2.say'
  && sys.AREA_BY_CARD['x2-kho-card'] === 'x2.kho.note'
  && sys.AREA_BY_CARD['x2-phu-pham-card'] === 'x2.phupham');

// â”€â”€â”€ N. QUYá»€N KHO NAN Cáº¤P THÃŠM Tá»ªNG NGÆ¯á»œI (22/11/2026 â€” khoXuat / khoApprove) â”€â”€â”€
// TÃ­ch = Cáº¤P THÃŠM quyá»n riÃªng (ká»ƒ cáº£ NgÆ°á»i Xem); bá» tÃ­ch = tráº£ vá» máº·c Ä‘á»‹nh vai trÃ²
// (KHÃ”NG thu háº¹p ai â€” Admin/BQL váº«n duyá»‡t, ngÆ°á»i cÃ³ tab CÃ´ng Äoáº¡n váº«n táº¡o phiáº¿u).

// â•â•â• B. Cá»œ HIá»‚N THá»Š â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- B. Cá» hiá»ƒn thá»‹ (chá»§ Ä‘á»™ng, KHÃ”NG háº¹n giá») ---');
reset();
asUser('admin');   const admCap = sys.flagOn('see.perf.cap');
asUser('manager'); const mgrEff = sys.flagOn('see.perf.eff');
asUser('editor');  const edCap = sys.flagOn('see.perf.cap');
asUser('viewer');  const vwEff = sys.flagOn('see.perf.eff');
check('B1: máº·c Ä‘á»‹nh Admin + BQL tháº¥y, Editor/NgÆ°á»i xem KHÃ”NG', admCap && mgrEff && !edCap && !vwEff);
reset(); asUser('editor');
check('B2: máº·c Ä‘á»‹nh KHÃ”NG cho nháº­p tay giá» sá»± cá»‘', !sys.flagOn('incident-manual'));
sys.setFlagRole('see.perf.cap', 'editor', true);
check('B3: báº­t cho Editor â†’ tháº¥y ngay', sys.flagOn('see.perf.cap'));
sys.setFlagRole('see.perf.cap', 'editor', false);
check('B4: táº¯t láº¡i â†’ khÃ´ng tháº¥y', !sys.flagOn('see.perf.cap'));
check('B5: dá»¯ liá»‡u cá» KHÃ”NG cÃ³ háº¹n giá» (khÃ´ng khoÃ¡ from/to/override)',
  !Object.keys(sys.sysSettingsState().flags || {}).some(k => JSON.stringify(sys.sysSettingsState().flags[k]).includes('override')));

// â•â•â• C. Má»¨C QUYá»€N THEO VÃ™NG â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- C. Quyá»n theo vÃ¹ng ---');
reset(); asUser('admin');
check('C1: Admin LUÃ”N approve má»i vÃ¹ng (khoÃ¡, chá»‘ng tá»± khoÃ¡)', sys.PERM_AREAS.every(a => sys.roleLevel(a.id, 'admin') === 'approve'));
check('C2: khÃ´ng Ä‘á»•i Ä‘Æ°á»£c quyá»n cá»§a Admin', sys.setPermLevel('x2.prod', 'admin', 'none') === false);

reset(); asUser('editor', { editTabs: ['x2'] });
check('C3: Editor cÃ³ tab x2 â†’ sá»­a x2.prod (giá»¯ hÃ nh vi cÅ©)', sys.levelOf('x2.prod') === 'edit');
check('C4: Editor cÃ³ tab x2 nhÆ°ng KHÃ”NG cÃ³ tab x1 â†’ chá»‰ xem x1.prod', sys.levelOf('x1.prod') === 'view');
check('C5: Editor KHÃ”NG duyá»‡t phiáº¿u kho', sys.levelOf('ap.kho') === 'none');

reset(); asUser('manager', { editTabs: ['x2', 'planning'] });
check('C6: BQL máº·c Ä‘á»‹nh DUYá»†T phiáº¿u kho/sá»± cá»‘/nghá»‰/TC/Ä‘á»‹nh má»©c',
  ['ap.kho', 'ap.incident', 'ap.leave', 'ap.ot', 'ap.rate'].every(a => sys.levelOf(a) === 'approve'));
check('C7: BQL chÆ°a cÃ³ payLock â†’ chÆ°a chá»‘t cÃ´ng', sys.levelOf('ap.pay') === 'none');
check('C8: BQL chÆ°a cÃ³ payApply â†’ chÆ°a Ã¡p giá» mÃ¡y', sys.levelOf('hr.machine') === 'none');

reset(); asUser('manager', { editTabs: ['hr'], payLock: true, payApply: true });
check('C9: cÃ³ payLock â†’ chá»‘t cÃ´ng (approve)', sys.levelOf('ap.pay') === 'approve');
check('C10: cÃ³ payApply â†’ sá»­a giá» mÃ¡y (edit)', sys.levelOf('hr.machine') === 'edit');

reset(); asUser('editor', { editTabs: ['x2'] });
sys.setPermLevel('x2.prod', 'editor', 'view');
check('C11: admin Ä‘áº·t Editor = "Chá»‰ xem" á»Ÿ x2.prod â†’ levelOf = view', sys.levelOf('x2.prod') === 'view');
check('C12: vÃ¹ng Ä‘Ã£ cáº¥u hÃ¬nh nháº­n biáº¿t qua areaConfigured', sys.areaConfigured('x2.prod') === true);
check('C13: vÃ¹ng khÃ¡c váº«n "Theo tab"', sys.areaConfigured('x2.say') === false);
check('C14: savedPermLevel tráº£ giÃ¡ trá»‹ Ä‘Ã£ Ä‘áº·t', sys.savedPermLevel('x2.prod', 'editor') === 'view');
sys.setPermLevel('x2.prod', 'editor', 'approve');
check('C15: nÃ¢ng Ä‘Æ°á»£c Editor lÃªn "Duyá»‡t / khoÃ¡" khi admin muá»‘n', sys.levelOf('x2.prod') === 'approve');

// â”€â”€â”€ Ngá»¯ cáº£nh â†’ vÃ¹ng (dÃ¹ng cho cá»•ng requireEditPermission) â”€â”€â”€â”€
reset(); asUser('editor', { editTabs: ['x2'] });
state.activeView = 'kanban-view';
check('C16: tab CÃ´ng Äoáº¡n khÃ´ng má»Ÿ tháº» â†’ vÃ¹ng máº·c Ä‘á»‹nh x2.prod', perm.currentAreaId() === 'x2.prod');
state.x2OpenCardId = 'x2-than-hoa-card';
check('C17: má»Ÿ tháº» Than HÃ³a â†’ vÃ¹ng x2.say', perm.currentAreaId() === 'x2.say');
state.sysActiveArea = 'x1.close';
check('C18: vÃ¹ng Ä‘áº·t tÆ°á»ng minh Ä‘Æ°á»£c Æ°u tiÃªn', perm.currentAreaId() === 'x1.close');

// â•â•â• D. LÆ¯U / CHUáº¨N HOÃ / Gá»˜P â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- D. LÆ°u Â· chuáº©n hoÃ¡ Â· gá»™p giá»¯a cÃ¡c mÃ¡y ---');
reset(); asUser('admin');
sys.setFlagRole('see.perf.eff', 'viewer', true);
sys.setPermLevel('x2.say', 'editor', 'view');
sys.pushAudit('Test', 'a', 'b');
sys.saveSysSettings();
const savedRaw = JSON.parse(storeBacking.get('bamboo_tracker_sys_settings_v1') || '{}');
check('D1: ghi localStorage Ä‘Ãºng key + cÃ³ savedAt', !!savedRaw && savedRaw.savedAt > 0);
check('D2: nháº­t kÃ½ Ä‘Æ°á»£c lÆ°u trong cÃ¹ng báº£n ghi', Array.isArray(savedRaw.audit) && savedRaw.audit.length >= 1);
const norm = sys.normalizeSysSettings({ flags: { 'see.perf.cap': { roles: { editor: true } }, 'rÃ¡c': {} }, perms: { 'x2.say': { editor: 'view', manager: 'sai-muc' }, 'rÃ¡c': {} } });
check('D3: chuáº©n hoÃ¡ bá» khoÃ¡ láº¡ + má»©c khÃ´ng há»£p lá»‡',
  !norm.flags['rÃ¡c'] && !norm.perms['rÃ¡c'] && norm.perms['x2.say'].editor === 'view' && !norm.perms['x2.say'].manager);
const older = { savedAt: 1000, perms: { 'x2.prod': { editor: 'none' } }, flags: {} };
const newer = { savedAt: 2000, perms: { 'x2.prod': { editor: 'edit' } }, flags: {} };
check('D4: gá»™p chá»n báº£n LÆ¯U SAU', sys.mergeSysSettings(older, newer).perms['x2.prod'].editor === 'edit');
check('D5: báº±ng má»‘c â†’ giá»¯ báº£n Ä‘ang cÃ³', sys.mergeSysSettings(newer, older).perms['x2.prod'].editor === 'edit');
const exp = JSON.parse(sys.sysSettingsExport());
check('D6: xuáº¥t cáº¥u hÃ¬nh chá»‰ gá»“m flags + perms + v', !!exp && !!exp.perms && exp.audit === undefined);
sys.resetSysSettings();
check('D7: khÃ´i phá»¥c máº·c Ä‘á»‹nh xoÃ¡ má»i tuá»³ chá»‰nh (giá»¯ nháº­t kÃ½)',
  Object.keys(sys.sysSettingsState().perms).length === 0 && sys.sysSettingsState().audit.length >= 1);

// â•â•â• E. ÃP LÃŠN <body> (CSS dÃ¹ng cÃ¡c dataset nÃ y) â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- E. Ãp cÃ i Ä‘áº·t lÃªn body ---');
reset(); asUser('editor', { editTabs: ['x2'] });
const ds = sys.applySysSettings();
check('E1: body[data-on] pháº£n Ã¡nh cá» theo vai trÃ²', ds && ds.on !== undefined && !ds.on.includes('see.perf.cap'));
check('E2: body[data-area-edit] chá»©a vÃ¹ng Ä‘Æ°á»£c sá»­a', ds.edit.includes('x2.prod'));
check('E3: body[data-area-approve] KHÃ”NG chá»©a vÃ¹ng cá»§a editor', !ds.approve.includes('ap.kho'));
check('N8: cáº¥u trÃºc â€” modal cÃ³ 2 Ã´ quyá»n kho + permissions chuáº©n hoÃ¡ + mÃ¢y Ä‘á»c grants + applyKho2AreaDom', (() => {
  const idx = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const perm = fs.readFileSync(new URL('../js/permissions.js', import.meta.url), 'utf8');
  const auth = fs.readFileSync(new URL('../js/auth.js', import.meta.url), 'utf8');
  const cloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
  const syss = fs.readFileSync(new URL('../js/sys-settings.js', import.meta.url), 'utf8');
  return idx.includes('id="user-perms-kho-xuat"') && idx.includes('id="user-perms-kho-approve"')
    && perm.includes('u.khoXuat = u.khoXuat === true') && perm.includes('u.khoApprove = u.khoApprove === true')
    && perm.includes('export function canKhoNoteCreate()') && perm.includes('export function canKhoApproveNote()')
    && auth.includes('grants.khoXuat') && auth.includes('grants.khoApprove')
    && auth.includes('khoXuat, khoApprove }')
    && cloud.includes('grants.khoXuat') && cloud.includes('grants.khoApprove')
    && syss.includes("area === 'x2.kho.note' && user && user.khoXuat === true")
    && syss.includes("area === 'ap.kho' && user && user.khoApprove === true")
    && syss.includes('export function applyKho2AreaDom')
    && idx.includes('data-perm="kho2"');
})());
// âš  Lá»–I ÄÃƒ Sá»¬A (17/11/2026): handleUserPermsSubmit tá»«ng dÃ¹ng 2 biáº¿n khoXuatCheck /
// khoApproveCheck CHá»ˆ khai bÃ¡o trong openUserPermsModal â‡’ báº¥m "LÆ°u Quyá»n" nÃ©m
// ReferenceError bá»‹ nuá»‘t láº·ng â†’ KHÃ”NG lÆ°u Ä‘Æ°á»£c quyá»n kho. Pháº£i fetch Ã´ ngay trong
// hÃ m submit.
check('N9: handleUserPermsSubmit tá»± fetch 2 Ã´ quyá»n kho (khÃ´ng phá»¥ thuá»™c biáº¿n cá»§a modal khÃ¡c)', (() => {
  const auth = fs.readFileSync(new URL('../js/auth.js', import.meta.url), 'utf8');
  const fn = auth.slice(auth.indexOf('async function handleUserPermsSubmit'));
  return fn.includes("getElementById('user-perms-kho-xuat')")
    && fn.includes("getElementById('user-perms-kho-approve')");
})());
console.log('--- N. Quyá»n kho nan cáº¥p thÃªm tá»«ng ngÆ°á»i (22/11/2026) ---');
reset(); asUser('viewer', { khoXuat: true, khoApprove: true });
check('N1: NgÆ°á»i Xem Ä‘Æ°á»£c cáº¥p khoXuat â†’ táº¡o/sá»­a phiáº¿u kho (vÃ¹ng x2.kho.note = edit)', sys.levelOf('x2.kho.note') === 'edit');
check('N2: NgÆ°á»i Xem Ä‘Æ°á»£c cáº¥p khoApprove â†’ duyá»‡t phiáº¿u kho (vÃ¹ng ap.kho = approve)', sys.levelOf('ap.kho') === 'approve');
check('N3: NgÆ°á»i Xem KHÃ”NG Ä‘Æ°á»£c cáº¥p gÃ¬ â†’ váº«n chá»‰ xem cáº£ 2 vÃ¹ng', (() => {
  asUser('viewer', {});
  return sys.levelOf('x2.kho.note') === 'view' && sys.levelOf('ap.kho') === 'none';
})());
check('N4: NgÆ°á»i Chá»‰nh Sá»­a cÃ³ tab CÃ´ng Äoáº¡n (kanban+x2) â†’ táº¡o phiáº¿u máº·c Ä‘á»‹nh (khÃ´ng cáº§n khoXuat)', (() => {
  asUser('editor', { editTabs: ['kanban', 'x2'] });
  return sys.levelOf('x2.kho.note') === 'edit' && sys.levelOf('ap.kho') === 'none';
})());
check('N5: Ban Quáº£n LÃ½ khÃ´ng tick khoApprove â†’ VáºªN duyá»‡t (khÃ´ng máº¥t quyá»n hiá»‡n há»¯u)', (() => {
  asUser('manager', { editTabs: ['kanban', 'x2'] });
  return sys.levelOf('ap.kho') === 'approve';
})());
check('N6: NgÆ°á»i Chá»‰nh Sá»­a tick khoApprove â†’ duyá»‡t Ä‘Æ°á»£c phiáº¿u kho', (() => {
  asUser('editor', { editTabs: ['kanban', 'x2'], khoApprove: true });
  return sys.levelOf('ap.kho') === 'approve';
})());
check('N7: NgÆ°á»i Chá»‰nh Sá»­a bá» tick khoApprove â†’ máº¥t quyá»n duyá»‡t (tráº£ vá» máº·c Ä‘á»‹nh)', (() => {
  asUser('editor', { editTabs: ['kanban', 'x2'] });
  return sys.levelOf('ap.kho') === 'none';
})());

reset(); asUser('admin');
const ds2 = sys.applySysSettings();
check('E4: Admin cÃ³ má»i vÃ¹ng trong data-area-approve', ds2.approve.split(' ').length === sys.PERM_AREAS.length);
check('E5: Admin tháº¥y má»i cá» máº·c Ä‘á»‹nh', ds2.on.includes('see.perf.cap') && ds2.on.includes('see.perf.eff'));

// â•â•â• F. áº¨N NÃšT THEO VÃ™NG â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- F. áº¨n nÃºt theo vÃ¹ng (data-perm) ---');
reset(); asUser('editor', { editTabs: ['x2'] });
funcSetPerm(); // Ä‘áº·t x2.prod = view Ä‘á»ƒ thá»­
function funcSetPerm() { sys.setPermLevel('x2.prod', 'editor', 'view'); }
const btnDeny = makeEl('b1'); const btnKeep = makeEl('b2');
btnDeny.closest = (sel) => (sel === '.planning-card[id]' ? { id: 'x2-cut-card' } : null);
btnKeep.closest = (sel) => (sel === '.planning-card[id]' ? { id: 'x2-than-hoa-card' } : null);
const oldQSA = global.document.querySelectorAll;
global.document.querySelectorAll = (sel) => (sel === '[data-perm]' ? [btnDeny, btnKeep] : []);
const hidden = sys.applySysAreaDom();
global.document.querySelectorAll = oldQSA;
check('F1: nÃºt á»Ÿ vÃ¹ng "Chá»‰ xem" bá»‹ áº©n (area-denied)', btnDeny.classList.contains('area-denied'));
check('F2: nÃºt á»Ÿ vÃ¹ng cÃ²n Ä‘Æ°á»£c sá»­a thÃ¬ khÃ´ng bá»‹ áº©n', !btnKeep.classList.contains('area-denied'));
check('F3: tráº£ vá» sá»‘ nÃºt bá»‹ áº©n', hidden === 1);
asUser('admin');
global.document.querySelectorAll = (sel) => (sel === '[data-perm]' ? [btnDeny, btnKeep] : []);
sys.applySysAreaDom();
global.document.querySelectorAll = oldQSA;
check('F4: Admin khÃ´ng bá»‹ áº©n nÃºt nÃ o', !btnDeny.classList.contains('area-denied'));

// â•â•â• G. NHáº¬T KÃ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- G. Nháº­t kÃ½ cÃ i Ä‘áº·t ---');
reset(); asUser('admin'); state.currentUser.fullname = 'Quáº£n Trá»‹ A';
sys.pushAudit('Cá» X', 'táº¯t', 'báº­t');
const a0 = sys.sysSettingsState().audit[0];
check('G1: ghi ai Â· Ä‘á»•i gÃ¬ Â· tá»« gÃ¬ â†’ thÃ nh gÃ¬', a0.name === 'Quáº£n Trá»‹ A' && a0.what === 'Cá» X' && a0.from === 'táº¯t' && a0.to === 'báº­t');
check('G2: cÃ³ má»‘c thá»i gian ISO', /^\d{4}-\d{2}-\d{2}T/.test(a0.at));
for (let i = 0; i < 320; i++) sys.pushAudit('x' + i, '', '');
check('G3: giá»›i háº¡n 300 má»¥c (má»¥c má»›i nháº¥t Ä‘á»©ng Ä‘áº§u)', sys.sysSettingsState().audit.length === 300);

// â•â•â• H. GIá»œ Sá»° Cá»: KHÃ”NG NHáº¬P TAY, CHá»ˆ Láº¤Y PHIáº¾U ÄÃƒ DUYá»†T â•â•â•â•
console.log('--- H. Giá» sá»± cá»‘ (cá» incident-manual) ---');
reset(); asUser('editor');
state.x2IncidentReports = [];
const h1 = utils.stageIncidentInputHtml('baotho', '2026-10-22');
check('H1: máº·c Ä‘á»‹nh Ã´ Sá»± cá»‘ lÃ  CHá»ˆ Äá»ŒC (khÃ´ng cÃ²n <input>)',
  !h1.includes('<input') && h1.includes('x2-inc-val'));
check('H2: váº«n giá»¯ data-x2-incident + nÃºt "ï¼‹ BÃ¡o cÃ¡o"',
  h1.includes('data-x2-incident="baotho"') && h1.includes('data-inc-new="baotho|2026-10-22"'));
check('H3: chÆ°a cÃ³ phiáº¿u â†’ hiá»‡n 0 h', h1.includes('data-x2-incident-value="0"'));
state.x2IncidentReports = [{ id: 'p1', stage: 'baotho', date: '2026-10-22', hours: 2, status: 'da_duyet', approvedBy: 'x' }];
const h2 = utils.stageIncidentInputHtml('baotho', '2026-10-22');
check('H4: phiáº¿u ÄÃƒ DUYá»†T â†’ hiá»‡n Ä‘Ãºng 2 h + chip sá»‘ phiáº¿u',
  h2.includes('data-x2-incident-value="2"') && h2.includes('1 phiáº¿u'));
check('H5: stageIncidentOf Ä‘á»c giá» phiáº¿u Ä‘Ã£ duyá»‡t', utils.stageIncidentOf('baotho', '2026-10-22') === 2);
asUser('admin');
const h3 = utils.stageIncidentInputHtml('baotho', '2026-10-22');
check('H6: Admin báº­t cá» â†’ Ã´ nháº­p tay hiá»‡n láº¡i (dÃ¹ng táº¡m khi sá»­a dá»¯ liá»‡u cÅ©)',
  h3.includes('<input') && h3.includes('data-x2-incident="baotho"'));
asUser('manager');
const h4 = utils.stageIncidentInputHtml('baotho', '2026-10-22');
check('H7: BQL máº·c Ä‘á»‹nh váº«n chá»‰ Ä‘á»c', !h4.includes('<input'));

// â•â•â• I. Cáº¤U TRÃšC (panel Â· CSS Â· ná»‘i mÃ¢y) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- I. Cáº¥u trÃºc panel + CSS + ná»‘i dá»¯ liá»‡u ---');
const idx = fs.readFileSync('index.html', 'utf8');
const authSrc = fs.readFileSync('js/auth.js', 'utf8');
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
const stSrc = fs.readFileSync('js/state.js', 'utf8');
const cloudSrc = fs.readFileSync('js/cloud.js', 'utf8');
const storageSrc = fs.readFileSync('js/storage.js', 'utf8');
const histSrc = fs.readFileSync('js/history.js', 'utf8');
const mainSrc = fs.readFileSync('js/main.js', 'utf8');
check('I1: panel Ä‘á»•i tÃªn "CÃ i Äáº·t Há»‡ Thá»‘ng" + 4 tab',
  idx.includes('CÃ i Äáº·t Há»‡ Thá»‘ng') && ['users', 'perms', 'flags', 'system'].every(t => idx.includes(`data-sys-tab="${t}"`)));
check('I2: cÃ³ Ä‘á»§ khá»‘i ma tráº­n / cá» / nháº­t kÃ½',
  ['sys-perm-body', 'sys-flags-list', 'sys-audit-list', 'sys-mgr-chips', 'sys-perm-search'].every(id => idx.includes(id)));
check('I3: auth.js cÃ³ hÃ m váº½ + xá»­ lÃ½ sá»± kiá»‡n',
  ['renderSysPerms', 'renderSysFlags', 'renderSysStatus', 'renderSysAudit', 'onSysFlagToggle', 'onSysPermChange', 'sysSetTab']
    .every(fn => authSrc.includes(`function ${fn}`)));
check('I4: giá»¯ nguyÃªn id cÅ© cá»§a form/báº£ng ngÆ°á»i dÃ¹ng',
  idx.includes('id="add-user-form"') && idx.includes('id="users-table-body"') && idx.includes('id="btn-cancel-users"'));
check('I5: CSS áº©n theo cá» + áº©n nÃºt theo vÃ¹ng + panel',
  cssSrc.includes('body:not([data-on~="see.perf.cap"])')
  && cssSrc.includes('[data-flag-show~="see.perf.eff"]')
  && cssSrc.includes('.area-denied') && cssSrc.includes('.sys-flag-card'));
check('I6: CSS vÃ¹ng 3 khÃ´ng thá»¥t lá» + cuá»™n dá»c/ngang trÃªn Ä‘iá»‡n thoáº¡i + nÃºt â€¹ â€º',
  cssSrc.includes('.x2-zone[data-zone="3"]:has(> .x2-cut-table-wrap)')
  && cssSrc.includes('overflow-y: auto') && cssSrc.includes('.x2-hscroll-btn'));
check('I6a: tháº» QC/XÆ°á»Ÿng 2 canh lá» + báº£ng nhá» cÃ³ cuá»™n dá»c riÃªng giá»›i háº¡n chiá»u cao',
  cssSrc.includes('.qc-detail-content .x2-day-card,')
  && cssSrc.includes('.x2-cut-table-scroll .x2-day-card')
  && cssSrc.includes('.x2-detail-content .x2-cut-table-wrap')
  && cssSrc.includes('#qc-detail-content .table-responsive,')
  && cssSrc.includes('#qc-detail-content .x2-cut-table-scroll,')
  && cssSrc.includes('#x2-detail-content .table-responsive,')
  && cssSrc.includes('max-height: min(46vh, 340px)')
  && cssSrc.includes('overflow-y: auto'));
check('I6b: tay náº¯m cuá»™n dá»c báº£ng QC rÃµ, tÆ°Æ¡ng pháº£n vÃ  Ä‘á»§ lá»›n Ä‘á»ƒ cháº¡m',
  cssSrc.includes('scrollbar-color: #66717f #e9ecef')
  && cssSrc.includes('#qc-detail-content .table-responsive::-webkit-scrollbar-thumb')
  && cssSrc.includes('min-height: 64px')
  && !fs.readFileSync('js/utils.js', 'utf8').includes('setupVScrollControls'));
check('I7: sw.js cÃ³ js/sys-settings.js + cache v486', swSrc.includes("'./js/sys-settings.js'") && swSrc.includes('nha-may-ngoc-son-v486'));
check('I8: state.js cÃ³ key riÃªng + APP_VERSION v486',
  stSrc.includes('bamboo_tracker_sys_settings_v1') && stSrc.includes("APP_VERSION = 'v486'"));
check('I9: ná»‘i Ä‘á»§ cloud / storage / history / main',
  cloudSrc.includes('sysSettings') && cloudSrc.includes("'sysSettings'")
  && storageSrc.includes('restoreSysSettings') && histSrc.includes('sysSettings') && mainSrc.includes('loadSysSettings'));
check('I10: requireEditPermission nháº­n vÃ¹ng + derive ngá»¯ cáº£nh',
  cloudSrc.includes('currentAreaId()') && fs.readFileSync('js/permissions.js', 'utf8').includes('function currentAreaId'));
check('I11: khÃ´ng cÃ²n Ã´ nháº­p tay giá» sá»± cá»‘ máº·c Ä‘á»‹nh trong utils',
  fs.readFileSync('js/utils.js', 'utf8').includes("flagOn('incident-manual')"));

// â•â•â• J. NÃšT TRÆ¯á»¢T NGANG â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- J. NÃºt trÆ°á»£t ngang khung lá»‹ch sá»­ ---');
const scrollEl = makeEl('sc');
scrollEl.scrollWidth = 2000; scrollEl.clientWidth = 800; scrollEl.scrollLeft = 0;
scrollEl.scrollBy = (o) => { scrollEl._scrollBy = o; };
const headEl = makeEl('head'); headEl.classList.add('x2-cut-table-head');
const wrapEl = makeEl('wrap'); wrapEl.children = [headEl];
scrollEl.parentElement = wrapEl;
const oldQSA2 = global.document.querySelectorAll;
global.document.querySelectorAll = (sel) => (sel === '.x2-cut-table-scroll' ? [scrollEl] : []);
const wiredCount = x2.setupHistoryHScroll();
global.document.querySelectorAll = oldQSA2;
const navEl = headEl.children[0];
check('J1: chÃ¨n 2 nÃºt vÃ o Ä‘áº§u khung lá»‹ch sá»­',
  !!navEl && (navEl.className === 'x2-hscroll-nav' || navEl.classList.contains('x2-hscroll-nav')));
check('J2: nÃºt cÃ³ data-hscroll trÃ¡i/pháº£i', String(navEl.innerHTML).includes('data-hscroll="left"') && String(navEl.innerHTML).includes('data-hscroll="right"'));
check('J3: Ä‘Ã£ Ä‘Ã¡nh dáº¥u khung (khÃ´ng gáº¯n sá»± kiá»‡n láº·p)', scrollEl.dataset.hscrollReady === '1' && wiredCount === 1);
check('J4: cÃ³ gáº¯n sá»± kiá»‡n scroll + click', (scrollEl._h.scroll || []).length === 1 && (navEl._h.click || []).length === 1);
navEl._h.click[0]({ target: { closest: () => ({ getAttribute: () => 'right' }) }, preventDefault() {} });
check('J5: báº¥m â€º trÆ°á»£t sang pháº£i 80% bá» ngang', scrollEl._scrollBy && scrollEl._scrollBy.left === Math.round(800 * 0.8));

const qcScrollEl = makeEl('qcp-table');
qcScrollEl.scrollWidth = 1600; qcScrollEl.clientWidth = 400;
qcScrollEl.scrollBy = (o) => { qcScrollEl._scrollBy = o; };
const qcHeadEl = makeEl('qc-day-head'); qcHeadEl.classList.add('x2-day-head');
const qcDayEl = makeEl('qc-day'); qcDayEl.children = [qcHeadEl];
qcScrollEl.parentElement = qcDayEl;
global.document.querySelectorAll = (sel) => (sel === '#qc-detail-content .table-responsive' ? [qcScrollEl] : []);
utils.setupHScrollNav('#qc-detail-content .table-responsive');
const qcNavEl = qcHeadEl.children[0];
check('J6: báº£ng QC Ä‘Æ°á»£c thÃªm nÃºt cuá»™n trong tiÃªu Ä‘á» ngÃ y',
  !!qcNavEl && (qcNavEl.className === 'x2-hscroll-nav' || qcNavEl.classList.contains('x2-hscroll-nav')));
check('J7: báº£ng QC Ä‘Æ°á»£c ná»‘i sá»± kiá»‡n cuá»™n ngang',
  qcScrollEl.dataset.hscrollReady === '1' && (qcScrollEl._h.scroll || []).length === 1
  && (qcNavEl._h.click || []).length === 1);
qcNavEl._h.click[0]({ target: { closest: () => ({ getAttribute: () => 'right' }) }, preventDefault() {} });
check('J8: nÃºt pháº£i báº£ng QC trÆ°á»£t 80% bá» ngang',
  qcScrollEl._scrollBy && qcScrollEl._scrollBy.left === Math.round(400 * 0.8));
global.document.querySelectorAll = oldQSA2;

console.log(`\nKáº¾T QUáº¢: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exitCode = 1;

