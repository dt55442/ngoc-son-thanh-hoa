// tests/sys-settings.test.mjs — CÀI ĐẶT HỆ THỐNG (22/10/2026)
// Cờ hiển thị (admin bật/tắt chủ động) · 37 vùng quyền × 4 vai trò × 4 mức
// · ẩn nút theo vùng · ô Sự cố chỉ đọc · bảng và thẻ cuộn độc lập.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống tests/incident-report.test.mjs) ────
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
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
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

// ═══ A. DANH MỤC ═════════════════════════════════════════════
console.log('--- A. Danh mục cờ + vùng quyền ---');
check('A1: 5 cờ hiển thị', sys.UI_FLAGS.length === 5
  && ['see.perf.cap', 'see.perf.eff', 'see.cost', 'see.pay', 'incident-manual']
    .every(id => sys.UI_FLAGS.some(f => f.id === id)));
check('A2: 37 vùng quyền · 8 nhóm', sys.PERM_AREAS.length === 37 && sys.PERM_GROUPS.length === 8);
check('A3: đủ 6 cổng duyệt tách riêng', ['ap.kho', 'ap.leave', 'ap.ot', 'ap.incident', 'ap.rate', 'ap.pay']
  .every(id => sys.PERM_AREAS.some(a => a.id === id)));
check('A4: đủ vùng các module', ['x2.prod', 'x2.say', 'x2.kho.note', 'x2.kho.recon', 'x2.epvan', 'x2.phupham',
  'x1.prod', 'x1.close', 'x1.phoisay', 'plan.items', 'plan.rates', 'plan.stock',
  'mat.entry', 'mat.price', 'mat.supplier', 'qc.entry', 'hr.emp', 'hr.board', 'hr.att',
  'hr.machine', 'hr.calendar', 'hr.recruit', 'hr.ot.create', 'hr.leave.create',
  'sys.users', 'sys.settings', 'sys.backup', 'sys.cloud', 'sys.history', 'sys.bulk', 'sys.rates']
  .every(id => sys.PERM_AREAS.some(a => a.id === id)));
check('A5: ánh xạ thẻ → vùng', sys.AREA_BY_CARD['x2-than-hoa-card'] === 'x2.say'
  && sys.AREA_BY_CARD['x2-kho-card'] === 'x2.kho.note'
  && sys.AREA_BY_CARD['x2-phu-pham-card'] === 'x2.phupham');

// ═══ B. CỜ HIỂN THỊ ══════════════════════════════════════════
console.log('--- B. Cờ hiển thị (chủ động, KHÔNG hẹn giờ) ---');
reset();
asUser('admin');   const admCap = sys.flagOn('see.perf.cap');
asUser('manager'); const mgrEff = sys.flagOn('see.perf.eff');
asUser('editor');  const edCap = sys.flagOn('see.perf.cap');
asUser('viewer');  const vwEff = sys.flagOn('see.perf.eff');
check('B1: mặc định Admin + BQL thấy, Editor/Người xem KHÔNG', admCap && mgrEff && !edCap && !vwEff);
reset(); asUser('editor');
check('B2: mặc định KHÔNG cho nhập tay giờ sự cố', !sys.flagOn('incident-manual'));
sys.setFlagRole('see.perf.cap', 'editor', true);
check('B3: bật cho Editor → thấy ngay', sys.flagOn('see.perf.cap'));
sys.setFlagRole('see.perf.cap', 'editor', false);
check('B4: tắt lại → không thấy', !sys.flagOn('see.perf.cap'));
check('B5: dữ liệu cờ KHÔNG có hẹn giờ (không khoá from/to/override)',
  !Object.keys(sys.sysSettingsState().flags || {}).some(k => JSON.stringify(sys.sysSettingsState().flags[k]).includes('override')));

// ═══ C. MỨC QUYỀN THEO VÙNG ══════════════════════════════════
console.log('--- C. Quyền theo vùng ---');
reset(); asUser('admin');
check('C1: Admin LUÔN approve mọi vùng (khoá, chống tự khoá)', sys.PERM_AREAS.every(a => sys.roleLevel(a.id, 'admin') === 'approve'));
check('C2: không đổi được quyền của Admin', sys.setPermLevel('x2.prod', 'admin', 'none') === false);

reset(); asUser('editor', { editTabs: ['x2'] });
check('C3: Editor có tab x2 → sửa x2.prod (giữ hành vi cũ)', sys.levelOf('x2.prod') === 'edit');
check('C4: Editor có tab x2 nhưng KHÔNG có tab x1 → chỉ xem x1.prod', sys.levelOf('x1.prod') === 'view');
check('C5: Editor KHÔNG duyệt phiếu kho', sys.levelOf('ap.kho') === 'none');

reset(); asUser('manager', { editTabs: ['x2', 'planning'] });
check('C6: BQL mặc định DUYỆT phiếu kho/sự cố/nghỉ/TC/định mức',
  ['ap.kho', 'ap.incident', 'ap.leave', 'ap.ot', 'ap.rate'].every(a => sys.levelOf(a) === 'approve'));
check('C7: BQL chưa có payLock → chưa chốt công', sys.levelOf('ap.pay') === 'none');
check('C8: BQL chưa có payApply → chưa áp giờ máy', sys.levelOf('hr.machine') === 'none');

reset(); asUser('manager', { editTabs: ['hr'], payLock: true, payApply: true });
check('C9: có payLock → chốt công (approve)', sys.levelOf('ap.pay') === 'approve');
check('C10: có payApply → sửa giờ máy (edit)', sys.levelOf('hr.machine') === 'edit');

reset(); asUser('editor', { editTabs: ['x2'] });
sys.setPermLevel('x2.prod', 'editor', 'view');
check('C11: admin đặt Editor = "Chỉ xem" ở x2.prod → levelOf = view', sys.levelOf('x2.prod') === 'view');
check('C12: vùng đã cấu hình nhận biết qua areaConfigured', sys.areaConfigured('x2.prod') === true);
check('C13: vùng khác vẫn "Theo tab"', sys.areaConfigured('x2.say') === false);
check('C14: savedPermLevel trả giá trị đã đặt', sys.savedPermLevel('x2.prod', 'editor') === 'view');
sys.setPermLevel('x2.prod', 'editor', 'approve');
check('C15: nâng được Editor lên "Duyệt / khoá" khi admin muốn', sys.levelOf('x2.prod') === 'approve');

// ─── Ngữ cảnh → vùng (dùng cho cổng requireEditPermission) ────
reset(); asUser('editor', { editTabs: ['x2'] });
state.activeView = 'kanban-view';
check('C16: tab Công Đoạn không mở thẻ → vùng mặc định x2.prod', perm.currentAreaId() === 'x2.prod');
state.x2OpenCardId = 'x2-than-hoa-card';
check('C17: mở thẻ Than Hóa → vùng x2.say', perm.currentAreaId() === 'x2.say');
state.sysActiveArea = 'x1.close';
check('C18: vùng đặt tường minh được ưu tiên', perm.currentAreaId() === 'x1.close');

// ═══ D. LƯU / CHUẨN HOÁ / GỘP ════════════════════════════════
console.log('--- D. Lưu · chuẩn hoá · gộp giữa các máy ---');
reset(); asUser('admin');
sys.setFlagRole('see.perf.eff', 'viewer', true);
sys.setPermLevel('x2.say', 'editor', 'view');
sys.pushAudit('Test', 'a', 'b');
sys.saveSysSettings();
const savedRaw = JSON.parse(storeBacking.get('bamboo_tracker_sys_settings_v1') || '{}');
check('D1: ghi localStorage đúng key + có savedAt', !!savedRaw && savedRaw.savedAt > 0);
check('D2: nhật ký được lưu trong cùng bản ghi', Array.isArray(savedRaw.audit) && savedRaw.audit.length >= 1);
const norm = sys.normalizeSysSettings({ flags: { 'see.perf.cap': { roles: { editor: true } }, 'rác': {} }, perms: { 'x2.say': { editor: 'view', manager: 'sai-muc' }, 'rác': {} } });
check('D3: chuẩn hoá bỏ khoá lạ + mức không hợp lệ',
  !norm.flags['rác'] && !norm.perms['rác'] && norm.perms['x2.say'].editor === 'view' && !norm.perms['x2.say'].manager);
const older = { savedAt: 1000, perms: { 'x2.prod': { editor: 'none' } }, flags: {} };
const newer = { savedAt: 2000, perms: { 'x2.prod': { editor: 'edit' } }, flags: {} };
check('D4: gộp chọn bản LƯU SAU', sys.mergeSysSettings(older, newer).perms['x2.prod'].editor === 'edit');
check('D5: bằng mốc → giữ bản đang có', sys.mergeSysSettings(newer, older).perms['x2.prod'].editor === 'edit');
const exp = JSON.parse(sys.sysSettingsExport());
check('D6: xuất cấu hình chỉ gồm flags + perms + v', !!exp && !!exp.perms && exp.audit === undefined);
sys.resetSysSettings();
check('D7: khôi phục mặc định xoá mọi tuỳ chỉnh (giữ nhật ký)',
  Object.keys(sys.sysSettingsState().perms).length === 0 && sys.sysSettingsState().audit.length >= 1);

// ═══ E. ÁP LÊN <body> (CSS dùng các dataset này) ═════════════
console.log('--- E. Áp cài đặt lên body ---');
reset(); asUser('editor', { editTabs: ['x2'] });
const ds = sys.applySysSettings();
check('E1: body[data-on] phản ánh cờ theo vai trò', ds && ds.on !== undefined && !ds.on.includes('see.perf.cap'));
check('E2: body[data-area-edit] chứa vùng được sửa', ds.edit.includes('x2.prod'));
check('E3: body[data-area-approve] KHÔNG chứa vùng của editor', !ds.approve.includes('ap.kho'));
asUser('admin');
const ds2 = sys.applySysSettings();
check('E4: Admin có mọi vùng trong data-area-approve', ds2.approve.split(' ').length === sys.PERM_AREAS.length);
check('E5: Admin thấy mọi cờ mặc định', ds2.on.includes('see.perf.cap') && ds2.on.includes('see.perf.eff'));

// ═══ F. ẨN NÚT THEO VÙNG ═════════════════════════════════════
console.log('--- F. Ẩn nút theo vùng (data-perm) ---');
reset(); asUser('editor', { editTabs: ['x2'] });
funcSetPerm(); // đặt x2.prod = view để thử
function funcSetPerm() { sys.setPermLevel('x2.prod', 'editor', 'view'); }
const btnDeny = makeEl('b1'); const btnKeep = makeEl('b2');
btnDeny.closest = (sel) => (sel === '.planning-card[id]' ? { id: 'x2-cut-card' } : null);
btnKeep.closest = (sel) => (sel === '.planning-card[id]' ? { id: 'x2-than-hoa-card' } : null);
const oldQSA = global.document.querySelectorAll;
global.document.querySelectorAll = (sel) => (sel === '[data-perm]' ? [btnDeny, btnKeep] : []);
const hidden = sys.applySysAreaDom();
global.document.querySelectorAll = oldQSA;
check('F1: nút ở vùng "Chỉ xem" bị ẩn (area-denied)', btnDeny.classList.contains('area-denied'));
check('F2: nút ở vùng còn được sửa thì không bị ẩn', !btnKeep.classList.contains('area-denied'));
check('F3: trả về số nút bị ẩn', hidden === 1);
asUser('admin');
global.document.querySelectorAll = (sel) => (sel === '[data-perm]' ? [btnDeny, btnKeep] : []);
sys.applySysAreaDom();
global.document.querySelectorAll = oldQSA;
check('F4: Admin không bị ẩn nút nào', !btnDeny.classList.contains('area-denied'));

// ═══ G. NHẬT KÝ ══════════════════════════════════════════════
console.log('--- G. Nhật ký cài đặt ---');
reset(); asUser('admin'); state.currentUser.fullname = 'Quản Trị A';
sys.pushAudit('Cờ X', 'tắt', 'bật');
const a0 = sys.sysSettingsState().audit[0];
check('G1: ghi ai · đổi gì · từ gì → thành gì', a0.name === 'Quản Trị A' && a0.what === 'Cờ X' && a0.from === 'tắt' && a0.to === 'bật');
check('G2: có mốc thời gian ISO', /^\d{4}-\d{2}-\d{2}T/.test(a0.at));
for (let i = 0; i < 320; i++) sys.pushAudit('x' + i, '', '');
check('G3: giới hạn 300 mục (mục mới nhất đứng đầu)', sys.sysSettingsState().audit.length === 300);

// ═══ H. GIỜ SỰ CỐ: KHÔNG NHẬP TAY, CHỈ LẤY PHIẾU ĐÃ DUYỆT ════
console.log('--- H. Giờ sự cố (cờ incident-manual) ---');
reset(); asUser('editor');
state.x2IncidentReports = [];
const h1 = utils.stageIncidentInputHtml('baotho', '2026-10-22');
check('H1: mặc định ô Sự cố là CHỈ ĐỌC (không còn <input>)',
  !h1.includes('<input') && h1.includes('x2-inc-val'));
check('H2: vẫn giữ data-x2-incident + nút "＋ Báo cáo"',
  h1.includes('data-x2-incident="baotho"') && h1.includes('data-inc-new="baotho|2026-10-22"'));
check('H3: chưa có phiếu → hiện 0 h', h1.includes('data-x2-incident-value="0"'));
state.x2IncidentReports = [{ id: 'p1', stage: 'baotho', date: '2026-10-22', hours: 2, status: 'da_duyet', approvedBy: 'x' }];
const h2 = utils.stageIncidentInputHtml('baotho', '2026-10-22');
check('H4: phiếu ĐÃ DUYỆT → hiện đúng 2 h + chip số phiếu',
  h2.includes('data-x2-incident-value="2"') && h2.includes('1 phiếu'));
check('H5: stageIncidentOf đọc giờ phiếu đã duyệt', utils.stageIncidentOf('baotho', '2026-10-22') === 2);
asUser('admin');
const h3 = utils.stageIncidentInputHtml('baotho', '2026-10-22');
check('H6: Admin bật cờ → ô nhập tay hiện lại (dùng tạm khi sửa dữ liệu cũ)',
  h3.includes('<input') && h3.includes('data-x2-incident="baotho"'));
asUser('manager');
const h4 = utils.stageIncidentInputHtml('baotho', '2026-10-22');
check('H7: BQL mặc định vẫn chỉ đọc', !h4.includes('<input'));

// ═══ I. CẤU TRÚC (panel · CSS · nối mây) ═════════════════════
console.log('--- I. Cấu trúc panel + CSS + nối dữ liệu ---');
const idx = fs.readFileSync('index.html', 'utf8');
const authSrc = fs.readFileSync('js/auth.js', 'utf8');
const cssSrc = fs.readFileSync('styles.css', 'utf8');
const swSrc = fs.readFileSync('sw.js', 'utf8');
const stSrc = fs.readFileSync('js/state.js', 'utf8');
const cloudSrc = fs.readFileSync('js/cloud.js', 'utf8');
const storageSrc = fs.readFileSync('js/storage.js', 'utf8');
const histSrc = fs.readFileSync('js/history.js', 'utf8');
const mainSrc = fs.readFileSync('js/main.js', 'utf8');
check('I1: panel đổi tên "Cài Đặt Hệ Thống" + 4 tab',
  idx.includes('Cài Đặt Hệ Thống') && ['users', 'perms', 'flags', 'system'].every(t => idx.includes(`data-sys-tab="${t}"`)));
check('I2: có đủ khối ma trận / cờ / nhật ký',
  ['sys-perm-body', 'sys-flags-list', 'sys-audit-list', 'sys-mgr-chips', 'sys-perm-search'].every(id => idx.includes(id)));
check('I3: auth.js có hàm vẽ + xử lý sự kiện',
  ['renderSysPerms', 'renderSysFlags', 'renderSysStatus', 'renderSysAudit', 'onSysFlagToggle', 'onSysPermChange', 'sysSetTab']
    .every(fn => authSrc.includes(`function ${fn}`)));
check('I4: giữ nguyên id cũ của form/bảng người dùng',
  idx.includes('id="add-user-form"') && idx.includes('id="users-table-body"') && idx.includes('id="btn-cancel-users"'));
check('I5: CSS ẩn theo cờ + ẩn nút theo vùng + panel',
  cssSrc.includes('body:not([data-on~="see.perf.cap"])')
  && cssSrc.includes('[data-flag-show~="see.perf.eff"]')
  && cssSrc.includes('.area-denied') && cssSrc.includes('.sys-flag-card'));
check('I6: CSS vùng 3 không thụt lề + cuộn dọc/ngang trên điện thoại + nút ‹ ›',
  cssSrc.includes('.x2-zone[data-zone="3"]:has(> .x2-cut-table-wrap)')
  && cssSrc.includes('overflow-y: auto') && cssSrc.includes('.x2-hscroll-btn'));
check('I6a: thẻ QC/Xưởng 2 canh lề + bảng nhỏ có cuộn dọc riêng giới hạn chiều cao',
  cssSrc.includes('.qc-detail-content .x2-day-card,')
  && cssSrc.includes('.x2-cut-table-scroll .x2-day-card')
  && cssSrc.includes('.x2-detail-content .x2-cut-table-wrap')
  && cssSrc.includes('#qc-detail-content .table-responsive,')
  && cssSrc.includes('#qc-detail-content .x2-cut-table-scroll,')
  && cssSrc.includes('#x2-detail-content .table-responsive,')
  && cssSrc.includes('max-height: min(46vh, 340px)')
  && cssSrc.includes('overflow-y: auto'));
check('I6b: tay nắm cuộn dọc bảng QC rõ, tương phản và đủ lớn để chạm',
  cssSrc.includes('scrollbar-color: #66717f #e9ecef')
  && cssSrc.includes('#qc-detail-content .table-responsive::-webkit-scrollbar-thumb')
  && cssSrc.includes('min-height: 64px')
  && !fs.readFileSync('js/utils.js', 'utf8').includes('setupVScrollControls'));
check('I7: sw.js có js/sys-settings.js + cache v313', swSrc.includes("'./js/sys-settings.js'") && swSrc.includes('nha-may-ngoc-son-v318'));
check('I8: state.js có key riêng + APP_VERSION v313',
  stSrc.includes('bamboo_tracker_sys_settings_v1') && stSrc.includes("APP_VERSION = 'v318'"));
check('I9: nối đủ cloud / storage / history / main',
  cloudSrc.includes('sysSettings') && cloudSrc.includes("'sysSettings'")
  && storageSrc.includes('restoreSysSettings') && histSrc.includes('sysSettings') && mainSrc.includes('loadSysSettings'));
check('I10: requireEditPermission nhận vùng + derive ngữ cảnh',
  cloudSrc.includes('currentAreaId()') && fs.readFileSync('js/permissions.js', 'utf8').includes('function currentAreaId'));
check('I11: không còn ô nhập tay giờ sự cố mặc định trong utils',
  fs.readFileSync('js/utils.js', 'utf8').includes("flagOn('incident-manual')"));

// ═══ J. NÚT TRƯỢT NGANG ══════════════════════════════════════
console.log('--- J. Nút trượt ngang khung lịch sử ---');
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
check('J1: chèn 2 nút vào đầu khung lịch sử',
  !!navEl && (navEl.className === 'x2-hscroll-nav' || navEl.classList.contains('x2-hscroll-nav')));
check('J2: nút có data-hscroll trái/phải', String(navEl.innerHTML).includes('data-hscroll="left"') && String(navEl.innerHTML).includes('data-hscroll="right"'));
check('J3: đã đánh dấu khung (không gắn sự kiện lặp)', scrollEl.dataset.hscrollReady === '1' && wiredCount === 1);
check('J4: có gắn sự kiện scroll + click', (scrollEl._h.scroll || []).length === 1 && (navEl._h.click || []).length === 1);
navEl._h.click[0]({ target: { closest: () => ({ getAttribute: () => 'right' }) }, preventDefault() {} });
check('J5: bấm › trượt sang phải 80% bề ngang', scrollEl._scrollBy && scrollEl._scrollBy.left === Math.round(800 * 0.8));

const qcScrollEl = makeEl('qcp-table');
qcScrollEl.scrollWidth = 1600; qcScrollEl.clientWidth = 400;
qcScrollEl.scrollBy = (o) => { qcScrollEl._scrollBy = o; };
const qcHeadEl = makeEl('qc-day-head'); qcHeadEl.classList.add('x2-day-head');
const qcDayEl = makeEl('qc-day'); qcDayEl.children = [qcHeadEl];
qcScrollEl.parentElement = qcDayEl;
global.document.querySelectorAll = (sel) => (sel === '#qc-detail-content .table-responsive' ? [qcScrollEl] : []);
utils.setupHScrollNav('#qc-detail-content .table-responsive');
const qcNavEl = qcHeadEl.children[0];
check('J6: bảng QC được thêm nút cuộn trong tiêu đề ngày',
  !!qcNavEl && (qcNavEl.className === 'x2-hscroll-nav' || qcNavEl.classList.contains('x2-hscroll-nav')));
check('J7: bảng QC được nối sự kiện cuộn ngang',
  qcScrollEl.dataset.hscrollReady === '1' && (qcScrollEl._h.scroll || []).length === 1
  && (qcNavEl._h.click || []).length === 1);
qcNavEl._h.click[0]({ target: { closest: () => ({ getAttribute: () => 'right' }) }, preventDefault() {} });
check('J8: nút phải bảng QC trượt 80% bề ngang',
  qcScrollEl._scrollBy && qcScrollEl._scrollBy.left === Math.round(400 * 0.8));
global.document.querySelectorAll = oldQSA2;

console.log(`\nKẾT QUẢ: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exitCode = 1;
