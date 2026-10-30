// tests/hr-payroll-lock.test.mjs — QUYỀN CHỐT CÔNG & THAO TÁC HÀNG LOẠT THEO KỲ
// Giai đoạn 1 (20/10/2026):
//  • 2 quyền RIÊNG do Admin cấp: payApply (áp dụng/xóa giờ máy) · payLock (xử lý/chốt)
//  • Áp dụng / Xóa CHỈ trong THÁNG đang xem (trước đây áp cho mọi tháng)
//  • Bắt buộc LÝ DO (lưu vào chấm công: appliedBy/appliedAt/applyNote)
//  • Kỳ đã CHỐT CÔNG thì mọi thao tác ghi đều bị chặn
'use strict';

// ─── Stubs môi trường (giống tests/hr-checkin-compare.test.mjs) ──────────
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
const D_OCT = '2026-10-05';       // Thứ 2
const D_SEP = '2026-09-07';       // Thứ 2 (tháng khác — KHÔNG được đụng)

function reset(over) {
  state.currentUser = { id: 'u1', username: 'ed', role: 'editor', fullname: 'Người Nhập Liệu',
    editTabs: ['hr'], allowAdvanced: false, payApply: false, payLock: false };
  state.hrEmployees = [
    { id: 'e1', code: 'NV01', name: 'Nguyễn Văn A', department: 'Xưởng 2', status: 'active', skills: [] },
    { id: 'e2', code: 'NV02', name: 'Trần Thị B', department: 'Xưởng 2', status: 'active', skills: [] }
  ];
  state.hrPositions = [{ id: 'p1', name: 'Cắt chọn', department: 'Xưởng 2' }];
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

// ═══════════════════ A. QUYỀN CHỐT CÔNG ═══════════════════
reset();
check('A1. normalizeUser: mặc định payApply/payLock = false',
  (() => { const u = perms.normalizeUser({ username: 'x', role: 'editor', editTabs: ['hr'] });
    return u.payApply === false && u.payLock === false; })());
check('A2. Editor có quyền tab Nhân sự nhưng CHƯA có quyền chốt công',
  perms.canEditTab('hr') === true && perms.canPayApply() === false && perms.canPayLock() === false);
check('A3. Cấp payApply → canPayApply true, canPayLock VẪN false',
  (() => { grantPay(true, false); return perms.canPayApply() === true && perms.canPayLock() === false; })());
check('A4. Cấp payLock → canPayLock true',
  (() => { grantPay(false, true); return perms.canPayLock() === true && perms.canPayApply() === false; })());
check('A5. Admin luôn có cả 2 quyền',
  (() => { state.currentUser = { username: 'admin', role: 'admin', editTabs: [] };
    return perms.canPayApply() === true && perms.canPayLock() === true; })());
check('A6. syncPermissionUI đặt body[data-pay-perms] = "apply lock"',
  (() => { reset(); grantPay(true, true); return document.body.dataset.payPerms === 'apply lock'; })());
check('A7. Không có quyền → data-pay-perms rỗng',
  (() => { reset(); return document.body.dataset.payPerms === ''; })());

// ═══════════════════ B. ÁP DỤNG / XÓA THEO KỲ ═══════════════════
reset();
check('B1. Chưa có quyền → applyAllCheckins trả false, KHÔNG chấm công',
  hr.applyAllCheckins('test') === false && (state.hrAttendance || []).length === 0);
check('B2. Chưa có quyền → deleteCheckinsAll trả false, giữ nguyên dữ liệu',
  hr.deleteCheckinsAll('test') === false && state.hrCheckins.length === 3);

reset(); grantPay(true, false);
const planApply = hr.ciBulkPlanOf('apply');
check('B3. Kế hoạch áp dụng chỉ tính THÁNG đang xem (2 ngày · 2 NV)',
  planApply.month === MONTH && planApply.count === 2 && planApply.unit.indexOf('2 nhân viên') !== -1);
const nApplied = hr.applyAllCheckins('đối chiếu tháng 10');
check('B4. Áp dụng đúng 2 ngày của tháng 10 (KHÔNG đụng tháng 9)', nApplied === 2);
check('B5. Chỉ tháng 10 được chấm Đi làm',
  state.hrAttendance.length === 2 && state.hrAttendance.every(a => a.date === D_OCT && a.status === 'work'));
check('B6. Lưu vết người áp dụng + lý do trên bản ghi chấm công',
  state.hrAttendance.every(a => a.appliedBy === 'Người Nhập Liệu' && a.applyNote === 'đối chiếu tháng 10' && !!a.appliedAt));
check('B7. Áp dụng lại lần 2 → không còn ngày nào cần áp dụng', hr.applyAllCheckins('lần 2') === false);

reset(); grantPay(true, false);
const planDel = hr.ciBulkPlanOf('delete');
check('B8. Kế hoạch xóa chỉ đếm bản ghi tháng 10 (2)', planDel.count === 2 && planDel.unit.indexOf('bản ghi') !== -1);
const nDeleted = hr.deleteCheckinsAll('nạp lại file');
check('B9. Xóa đúng 2 bản ghi tháng 10, GIỮ bản ghi tháng 9',
  nDeleted === 2 && state.hrCheckins.length === 1 && state.hrCheckins[0].date === D_SEP);
check('B10. Xóa có tombstone (máy khác không hồi sinh)',
  String(localStorage.getItem('bamboo_tracker_deleted_ids_v1') || '').indexOf('ci-oct-e1') !== -1);

// ── Kỳ đã chốt công: mọi thao tác ghi đều bị chặn ──
reset(); grantPay(true, true);
state.hrPayLocks = [{ id: 'paylock-2026-10', month: MONTH, status: 'da_chot', approvedByName: 'Giám Đốc' }];
check('B11. Kỳ đã chốt → applyAllCheckins bị chặn',
  hr.applyAllCheckins('x') === false && (state.hrAttendance || []).length === 0);
check('B12. Kỳ đã chốt → deleteCheckinsAll bị chặn, dữ liệu còn nguyên',
  hr.deleteCheckinsAll('x') === false && state.hrCheckins.length === 3);
check('B13. Kỳ đã chốt → xóa 1 bản ghi cũng bị chặn',
  (() => { hr.deleteCheckin('ci-oct-e1'); return state.hrCheckins.length === 3; })());
check('B14. ciPayLockOfMonth tìm đúng bản chốt',
  hr.ciPayLockOfMonth(MONTH) && hr.ciPayLockOfMonth(MONTH).approvedByName === 'Giám Đốc');
check('B15. ciRequireMonthUnlocked chặn kèm thông báo',
  hr.ciRequireMonthUnlocked(MONTH, 'test') === false && hr.ciRequireMonthUnlocked('2026-09', 'test') === true);
check('B16. Nhãn kỳ dạng MM/YYYY', hr.ciMonthShort('2026-10') === '10/2026');

// ── Modal bulk ──
reset();
hr.openCiBulkModal('apply');
check('B17. Chưa có quyền → modal bulk KHÔNG mở',
  document.getElementById('modal-ci-bulk').classList.contains('show') === false);
reset(); grantPay(true, true);
hr.openCiBulkModal('apply');
check('B18. Modal bulk mở, hiện đúng kỳ + số ngày',
  document.getElementById('modal-ci-bulk').classList.contains('show') === true &&
  document.getElementById('ci-bulk-scope-info').textContent.indexOf('Tháng 10/2026') === 0 &&
  document.getElementById('ci-bulk-scope-info').textContent.indexOf('2') !== -1);
check('B19. Modal bulk: kind = apply', document.getElementById('ci-bulk-kind').value === 'apply');
hr.closeCiBulkModal();
check('B20. Đóng modal bulk', document.getElementById('modal-ci-bulk').classList.contains('show') === false);
state.hrPayLocks = [{ id: 'paylock-2026-10', month: MONTH, status: 'da_chot', approvedByName: 'Giám Đốc' }];
hr.openCiBulkModal('delete');
check('B21. Modal bulk cảnh báo khi kỳ đã chốt công',
  document.getElementById('ci-bulk-warn').hidden === false &&
  document.getElementById('ci-bulk-warn').textContent.indexOf('CHỐT CÔNG') !== -1);
check('B22. Modal bulk kind = delete', document.getElementById('ci-bulk-kind').value === 'delete');
hr.closeCiBulkModal();

// ═══════════════════ C. CẤU TRÚC (index / js / css / sw) ═══════════════════
const idxHtml = read('../index.html');
const hrSrc = read('../js/hr.js');
const cloudSrc = read('../js/cloud.js');
const permSrc = read('../js/permissions.js');
const authSrc = read('../js/auth.js');
const evSrc = read('../js/events.js');
const cssSrc = read('../styles.css');
const swSrc = read('../sw.js');
const stateSrc = read('../js/state.js');

check('C1. index có modal bulk đầy đủ id',
  idxHtml.includes('id="modal-ci-bulk"') && idxHtml.includes('id="ci-bulk-form"') &&
  idxHtml.includes('id="ci-bulk-kind"') && idxHtml.includes('id="ci-bulk-scope-info"') &&
  idxHtml.includes('id="ci-bulk-reason"') && idxHtml.includes('id="ci-bulk-warn"'));
check('C2. index có 4 ô quyền chốt công (2 modal người dùng)',
  idxHtml.includes('id="new-user-pay-apply"') && idxHtml.includes('id="new-user-pay-lock"') &&
  idxHtml.includes('id="user-perms-pay-apply"') && idxHtml.includes('id="user-perms-pay-lock"'));
check('C3. Nút hàng loạt + Điền giờ kết thúc dùng data-pay="apply" (không còn data-perm="hr")',
  /id="btn-apply-all-checkins"[^>]*data-pay="apply"/.test(idxHtml) &&
  /id="btn-delete-checkins-all"[^>]*data-pay="apply"/.test(idxHtml) &&
  /id="btn-ci-endfill"[^>]*data-pay="apply"/.test(idxHtml));
check('C4. hr.js gác requirePayApply ở 6 chỗ ghi dữ liệu công',
  (hrSrc.match(/requirePayApply\(\)/g) || []).length >= 6);
check('C5. Nút Áp Dụng / Xóa từng dòng mang data-pay="apply"',
  (hrSrc.match(/data-pay="apply"/g) || []).length >= 2);
check('C6. cloud.js xuất requirePayApply + requirePayLock',
  cloudSrc.includes('function requirePayApply()') && cloudSrc.includes('function requirePayLock()') &&
  /\brequirePayApply,/.test(cloudSrc) && /\brequirePayLock,/.test(cloudSrc));
check('C7. cloud.js đọc grants.payApply/payLock khi đăng nhập Firebase',
  cloudSrc.includes('grants.payApply') && cloudSrc.includes('grants.payLock'));
check('C8. permissions.js có canPayApply/canPayLock + dataset.payPerms',
  permSrc.includes('export function canPayApply()') && permSrc.includes('export function canPayLock()') &&
  permSrc.includes("body.dataset.payPerms"));
check('C9. normalizeUser KHÔNG tự cấp quyền chốt công',
  permSrc.includes('u.payApply = u.payApply === true') && permSrc.includes('u.payLock  = u.payLock === true'));
check('C10. auth.js lưu payApply/payLock vào userGrants + đọc checkbox',
  authSrc.includes('payApply, payLock }') && authSrc.includes("new-user-pay-apply") &&
  authSrc.includes("user-perms-pay-apply"));
check('C11. auth.js giữ 2 quyền khi Admin chỉ đổi vai trò',
  authSrc.includes('payApply: role === \'admin\' ? true : grants.payApply === true'));
check('C12. events.js nối modal bulk (form/đóng/mở)',
  evSrc.includes("safeOn('ci-bulk-form', 'submit', ciBulkSubmit)") &&
  evSrc.includes("openCiBulkModal('apply')") && evSrc.includes("openCiBulkModal('delete')"));
check('C13. CSS ẩn nút theo data-pay-perms',
  cssSrc.includes('body:not([data-pay-perms~="apply"]) [data-pay="apply"]') &&
  cssSrc.includes('body:not([data-pay-perms~="lock"]) [data-pay="lock"]'));
check('C14. Cache + APP_VERSION = v313',
  swSrc.includes("nha-may-ngoc-son-v313") && stateSrc.includes("'v313'"));
check('C15. hr.js xuất các hàm bulk/phụ trợ cho test',
  hrSrc.includes('openCiBulkModal,') && hrSrc.includes('closeCiBulkModal,') &&
  hrSrc.includes('ciBulkSubmit,') && hrSrc.includes('ciPayLockOfMonth,'));
check('C16. Bảng đối chiếu vẫn 8 cột (không thêm cột gây tràn ngang)',
  (() => { const seg = idxHtml.slice(idxHtml.indexOf('id="hr-ci-table"'), idxHtml.indexOf('id="hr-ci-body"'));
    return (seg.match(/<th[\s>]/g) || []).length === 8; })());

console.log(`\nHR-PAYROLL-LOCK: ${passed} PASS, ${failed} FAIL`);
if (failed) process.exitCode = 1;

// ═══════════════ D. XỬ LÝ DÒNG CÔNG (GIAI ĐOẠN 2) ═══════════════
function seedWorkDay(over) {
  reset(Object.assign({
    hrAssignments: [{ id: 'a1', employeeId: 'e1', date: D_OCT, department: 'Xưởng 2', positionId: 'p1', shiftIdx: 0, start: '07:00', end: '' }],
    hrCheckins: [{ id: 'ci-oct-e1', employeeId: 'e1', date: D_OCT, in: '07:00', out: '19:30', punchTimes: ['07:00', '19:30'], punches: 2 }]
  }, over || {}));
  grantPay(true, true);
}

seedWorkDay();
check('D1. Chưa có quyền chốt công → KHÔNG xử lý được dòng',
  (() => { grantPay(false, false); return hr.payAcceptRow('e1', D_OCT, {}) === false && (state.hrPayRows || []).length === 0; })());

grantPay(true, true);
check('D2. Chấp nhận giờ làm (tính TC theo máy) → Đã chốt, TC 2h',
  (() => {
    const ok = hr.payAcceptRow('e1', D_OCT, { otMode: 'asIs', reason: 'đã kiểm tra' });
    const row = hr.payRowOf('e1', D_OCT);
    const eff = hr.payEffectiveOf(row);
    return ok && row.status === 'da_chot' && row.action === 'accept' &&
      eff.hc === 540 && eff.tc === 120 && eff.otAcceptedMin === 120 && eff.otRejectedMin === 0;
  })());
check('D3. Dòng đã chốt lưu ảnh chụp TRƯỚC khi xử lý + người/lúc',
  (() => { const r = hr.payRowOf('e1', D_OCT);
    return r.before && r.before.hc === 540 && r.before.tc === 120 && r.before.otApprovedMin === 0 &&
      r.requestedBy === 'Người Nhập Liệu' && !!r.requestedAt && r.version === 1; })());

seedWorkDay(); grantPay(true, true);
hr.payAcceptRow('e1', D_OCT, { otMode: 'orderOnly' });
check('D4. Chọn "chỉ tính TC theo đơn" (đơn = 0) → hủy toàn bộ 2h TC',
  (() => { const e = hr.payEffectiveOf(hr.payRowOf('e1', D_OCT));
    return e.tc === 120 && e.otAcceptedMin === 0 && e.otRejectedMin === 120; })());
check('D5. Xử lý lại dòng → tăng version',
  (() => { hr.payAcceptRow('e1', D_OCT, { otMode: 'asIs' });
    return hr.payRowOf('e1', D_OCT).version === 2; })());

seedWorkDay(); grantPay(true, true);
check('D6. Hủy TC vượt đơn → CHỜ DUYỆT (chưa chốt)',
  (() => { const ok = hr.payRejectOtRow('e1', D_OCT, 'không đăng ký trước');
    const row = hr.payRowOf('e1', D_OCT);
    return ok && row.status === 'cho_duyet' && row.action === 'reject_ot' && row.after.otRejectedMin === 120; })());
check('D7. Hủy TC thiếu lý do → bị chặn', hr.payRejectOtRow('e1', D_OCT, '') === false);
check('D8. Editor KHÔNG duyệt được dòng công',
  (() => { state.currentUser = { username: 'ed', role: 'editor', editTabs: ['hr'], payApply: true, payLock: true };
    return hr.payApproveRow('e1', D_OCT) === false && hr.payRowOf('e1', D_OCT).status === 'cho_duyet'; })());
check('D9. Admin/BQL duyệt → Đã chốt',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'Giám Đốc', editTabs: [], payApply: true, payLock: true };
    const ok = hr.payApproveRow('e1', D_OCT);
    const row = hr.payRowOf('e1', D_OCT);
    return ok && row.status === 'da_chot' && row.approvedBy === 'Giám Đốc' && row.version === 2; })());

seedWorkDay(); grantPay(true, true);
check('D10. Sửa giờ máy → CHỜ DUYỆT, CHƯA ghi vào dữ liệu máy',
  (() => { const ok = hr.payEditRequest('e1', D_OCT, { in: '07:00', out: '18:00' }, 'quẹt ra sai');
    const rec = state.hrCheckins.find(c => c.id === 'ci-oct-e1');
    const row = hr.payRowOf('e1', D_OCT);
    return ok && row.status === 'cho_duyet' && row.proposed.out === '18:00' && rec.out === '19:30'; })());
check('D11. Duyệt sửa giờ máy → ghi vào bản ghi máy + tự chốt (TC 30 phút)',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'Giám Đốc', editTabs: [], payApply: true, payLock: true };
    const ok = hr.payApproveRow('e1', D_OCT);
    const rec = state.hrCheckins.find(c => c.id === 'ci-oct-e1');
    const row = hr.payRowOf('e1', D_OCT);
    return ok && rec.out === '18:00' && row.status === 'da_chot' && row.after.tc === 30; })());
check('D12. Sửa giờ máy thiếu lý do → bị chặn', hr.payEditRequest('e1', D_OCT, { out: '18:00' }, '') === false);

seedWorkDay(); grantPay(true, true);
check('D13. Miễn trừ: Editor/không phải Admin bị chặn',
  hr.payWaiveRow('e1', D_OCT, 'quên quẹt') === false);
check('D14. Miễn trừ: Admin ghi nhận "Miễn trừ" + lý do',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'Giám Đốc', editTabs: [], payApply: true, payLock: true };
    const ok = hr.payWaiveRow('e1', D_OCT, 'quên quẹt máy có xác nhận tổ trưởng');
    const row = hr.payRowOf('e1', D_OCT);
    return ok && row.status === 'mien' && row.reason.indexOf('quên quẹt') !== -1; })());

// ── LIÊN KẾT ĐƠN TĂNG CA (bổ sung — không giới hạn ngày) ──
seedWorkDay(); grantPay(true, true);
const otDraft = { id: 'ot-1', employeeId: 'e1', date: D_OCT, start: '17:30', end: '19:30', plannedMin: 120, status: 'pending' };
state.hrOvertimes = [otDraft];
hr.payMarkAddOt('e1', D_OCT, 'ot-1', 'bổ sung đơn');
check('D15. Bổ sung đơn TC → dòng ở trạng thái CHỜ DUYỆT kèm mã đơn',
  (() => { const row = hr.payRowOf('e1', D_OCT);
    return row.action === 'add_ot' && row.status === 'cho_duyet' && row.otId === 'ot-1'; })());
check('D16. Duyệt dòng kiểu "add_ot" bị chặn (phải duyệt ĐƠN TC)',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'Giám Đốc', editTabs: [], payApply: true, payLock: true };
    return hr.payApproveRow('e1', D_OCT) === false && hr.payRowOf('e1', D_OCT).status === 'cho_duyet'; })());
otDraft.status = 'approved';
hr.paySyncOtApproved(otDraft);
check('D17. Đơn TC được duyệt đủ giờ → DÒNG TỰ CHỐT',
  (() => { const row = hr.payRowOf('e1', D_OCT);
    return row.status === 'da_chot' && row.after.otAcceptedMin === 120 && row.after.otRejectedMin === 0; })());

seedWorkDay(); grantPay(true, true);
const otSmall = { id: 'ot-2', employeeId: 'e1', date: D_OCT, start: '17:30', end: '18:00', plannedMin: 30, status: 'approved' };
state.hrOvertimes = [otSmall];
hr.payMarkAddOt('e1', D_OCT, 'ot-2', 'đơn thiếu');
hr.paySyncOtApproved(otSmall);
check('D18. Đơn duyệt CHƯA đủ giờ → vẫn CHỜ DUYỆT + ghi rõ còn vượt',
  (() => { const row = hr.payRowOf('e1', D_OCT);
    return row.status === 'cho_duyet' && row.after.otAcceptedMin === 30 && row.after.otRejectedMin === 90 &&
      String(row.note || '').indexOf('còn vượt') !== -1; })());

seedWorkDay(); grantPay(true, true);
const otRej = { id: 'ot-3', employeeId: 'e1', date: D_OCT, plannedMin: 120, status: 'rejected' };
state.hrOvertimes = [otRej];
hr.payMarkAddOt('e1', D_OCT, 'ot-3', 'x');
hr.paySyncOtRejected(otRej, 'Không duyệt');
check('D19. Đơn TC bị từ chối → dòng "Bị từ chối"',
  (() => { const row = hr.payRowOf('e1', D_OCT);
    return row.status === 'tu_choi' && String(row.rejectReason || '').indexOf('Không duyệt') !== -1; })());

seedWorkDay(); grantPay(true, true);
hr.payAcceptRow('e1', D_OCT, { otMode: 'asIs' });
check('D20. Chip trạng thái hiện "Đã chốt"',
  hr.payRowChipHtml('e1', D_OCT).indexOf('Đã chốt') !== -1 && hr.payRowChipHtml('e1', D_OCT).indexOf('ci-pay-chip') !== -1);
check('D21. Nút hành động có "Xử lý" + data-ci-pay (KHÔNG còn nút "Xác Nhận")',
  (() => { const r = hr.ciCompareDay('e1', D_OCT);
    const html = hr.ciActionCell(r);
    return html.indexOf('Xử lý') !== -1 && html.indexOf('data-ci-pay="1"') !== -1 && html.indexOf('Xác Nhận') === -1; })());

// ── CẤU TRÚC GIAI ĐOẠN 2 ──
check('D22. index có modal xử lý dòng công đầy đủ',
  idxHtml.includes('id="modal-ci-pay"') && idxHtml.includes('id="ci-pay-form"') &&
  idxHtml.includes('id="ci-pay-action"') && idxHtml.includes('id="ci-pay-otmode-group"') &&
  idxHtml.includes('id="ci-pay-edit-group"') && idxHtml.includes('id="ci-pay-reason"'));
check('D23. index có banner đơn TC bổ sung trong form đăng ký tăng ca',
  idxHtml.includes('id="ot-ci-banner"'));
check('D24. events nối modal xử lý + uỷ quyền nút data-ci-pay',
  evSrc.includes("safeOn('ci-pay-form', 'submit', ciPaySubmit)") &&
  evSrc.includes("'[data-ci-pay],[data-ci-pay-approve],[data-ci-pay-reject]'"));
check('D25. hr.js có openOvertimeModal(preset) điền sẵn + gắn mã đơn vào dòng',
  hrSrc.includes('function openOvertimeModal(preset)') && hrSrc.includes('payMarkAddOt(employeeId, date, otId') &&
  hrSrc.includes('autoFromCi: linked'));
check('D26. Nối đủ 2 key dòng công/bản chốt (storage + cloud + history)',
  read('../js/storage.js').includes('hrPayRows') && read('../js/storage.js').includes('hrPayLocks') &&
  cloudSrc.includes('hrPayRows') && cloudSrc.includes('hrPayLocks') &&
  read('../js/history.js').includes('hrPayRows'));
check('D27. CSS có chip trạng thái + banner đơn TC',
  cssSrc.includes('.ci-pay-chip') && cssSrc.includes('.ot-ci-banner') && cssSrc.includes('.ci-pay-gap'));

// ═══════════════ E. CHỐT CÔNG THEO THÁNG (GIAI ĐOẠN 3) ═══════════════
function seedMonthOnly() {
  reset({
    hrAssignments: [{ id: 'a1', employeeId: 'e1', date: D_OCT, department: 'Xưởng 2', positionId: 'p1', shiftIdx: 0, start: '07:00', end: '' }],
    hrCheckins: [{ id: 'ci-oct-e1', employeeId: 'e1', date: D_OCT, in: '07:00', out: '19:30', punchTimes: ['07:00', '19:30'], punches: 2 }]
  });
  grantPay(true, true);
}

seedMonthOnly();
const scan0 = hr.payLockScan(MONTH);
check('E1. Quét tháng: có dòng công + CHẶN vì TC vượt đơn chưa xử lý',
  scan0.rows.length === 1 && scan0.blockers.length === 1 &&
  scan0.blockers[0].reasons.join(' ').indexOf('TC vượt đơn') !== -1);
check('E2. Chưa xử lý dòng → KHÔNG trình chốt được (không tạo bản chốt)',
  (() => { const r = hr.payPrepareLock(MONTH, {});
    return r.ok === false && (state.hrPayLocks || []).length === 0; })());

// xử lý dòng rồi mới chốt được
hr.payAcceptRow('e1', D_OCT, { otMode: 'asIs' });
const scan1 = hr.payLockScan(MONTH);
check('E3. Sau khi xử lý: KHÔNG còn dòng chặn', scan1.blockers.length === 0 && scan1.rows.length === 1);
check('E4. Chưa có quyền chốt công → không trình được',
  (() => { grantPay(false, false); const r = hr.payPrepareLock(MONTH, {}); return r.ok === false; })());
grantPay(true, true);
const prep = hr.payPrepareLock(MONTH, { note: 'chốt tháng 10', disputeDays: 5 });
const lock1 = hr.payLockOf(MONTH);
check('E5. Trình chốt thành công → "Chờ duyệt" + đủ ảnh chụp/luật/ca/băm',
  prep.ok === true && lock1 && lock1.status === 'cho_duyet' && lock1.version === 1 &&
  lock1.rows.length === 1 && !!lock1.hash && !!lock1.ruleSet && !!lock1.shiftSnap &&
  lock1.totals.length === 1 && lock1.disputeUntil > '');
check('E6. Bản chốt lưu đúng số: HC 9h · TC 2h · TC ghi nhận 2h',
  (() => { const r = lock1.rows[0]; const t = lock1.totals[0];
    return r.hc === 540 && r.tc === 120 && r.otAcceptedMin === 120 && t.hcMin === 540 && t.tcMin === 120 && t.otMin === 120; })());
check('E7. Bản chốt ghi người trình + phiên bản app',
  lock1.preparedByName === 'Người Nhập Liệu' && lock1.appVersion === 'v313');
check('E8. Băm tất định (cùng dữ liệu → cùng mã)', hr.payHashStr('abc') === hr.payHashStr('abc') && hr.payHashStr('abc') !== hr.payHashStr('abd'));

check('E9. Editor KHÔNG duyệt được chốt công',
  (() => { state.currentUser = { username: 'ed', role: 'editor', editTabs: ['hr'], payApply: true, payLock: true };
    return hr.payApproveLock(MONTH) === false && hr.payLockOf(MONTH).status === 'cho_duyet'; })());
check('E10. Số liệu đổi sau khi trình → CHẶN duyệt (bắt trình lại)',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'Giám Đốc', editTabs: [], payApply: true, payLock: true };
    const rec = state.hrCheckins.find(c => c.id === 'ci-oct-e1');
    rec.out = '18:00'; rec.punchTimes = ['07:00', '18:00'];
    const d = hr.payDriftOfLock(hr.payLockOf(MONTH));
    return d.changedCount > 0 && hr.payApproveLock(MONTH) === false; })());
check('E11. Trình lại sau khi số đổi → duyệt được (không còn lệch)',
  (() => { hr.payPrepareLock(MONTH, {});
    const ok = hr.payApproveLock(MONTH);
    const lk = hr.payLockOf(MONTH);
    return ok && lk.status === 'da_chot' && lk.approvedByName === 'Giám Đốc' && lk.selfApproved === true; })());
check('E12. Kỳ đã chốt → KHÔNG trình lại được', hr.payPrepareLock(MONTH, {}).ok === false);
check('E13. Kỳ đã chốt → chặn áp dụng/xóa giờ máy',
  (() => { grantPay(true, true);
    return hr.applyAllCheckins('x') === false && hr.deleteCheckinsAll('x') === false; })());
check('E14. Mở khóa: Editor/không phải Admin bị chặn',
  (() => { state.currentUser = { username: 'ad', role: 'manager', fullname: 'BQL', editTabs: ['hr'], payApply: true, payLock: true };
    return hr.payReopenLock(MONTH, 'lý do') === false; })());
check('E15. Mở khóa: Admin + lý do → "Đã mở khóa", version + 1, lưu lịch sử',
  (() => { state.currentUser = { username: 'ad', role: 'admin', fullname: 'Giám Đốc', editTabs: [], payApply: true, payLock: true };
    const ok = hr.payReopenLock(MONTH, 'sửa giờ quẹt sai');
    const lk = hr.payLockOf(MONTH);
    return ok && lk.status === 'da_mo_khoa' && lk.version === 3 &&
      lk.reopenHistory.length === 1 && lk.reopenHistory[0].reason === 'sửa giờ quẹt sai'; })());
check('E16. Mở khóa thiếu lý do → bị chặn', hr.payReopenLock(MONTH, '') === false);
check('E17. Sau khi mở khóa → trình lại được (version tăng)',
  (() => { const r = hr.payPrepareLock(MONTH, {});
    return r.ok === true && hr.payLockOf(MONTH).status === 'cho_duyet' && hr.payLockOf(MONTH).version === 4; })());

// ── THẺ CHỐT CÔNG LƯƠNG — GIAO DIỆN + CẤU TRÚC ──
hr.renderHrPayCard();
const payBodyHtml = document.getElementById('hr-pay-body').innerHTML;
check('E18. Thẻ chốt công vẽ được: kỳ, trạng thái, bảng theo nhân viên',
  payBodyHtml.indexOf('Kỳ:') !== -1 && payBodyHtml.indexOf('Chờ duyệt') !== -1 &&
  payBodyHtml.indexOf('Nguyễn Văn A') !== -1 && payBodyHtml.indexOf('Nhân Viên') !== -1);
check('E19. Đếm trên mini card phản ánh trạng thái kỳ',
  hr.HR_CARD_DEFS['hr-pay-card'].count().indexOf('Chờ duyệt') !== -1);
check('E20. index có thẻ + modal chốt công đầy đủ',
  idxHtml.includes('id="hr-pay-card"') && idxHtml.includes('id="hr-pay-body"') &&
  idxHtml.includes('id="hr-pay-month"') && idxHtml.includes('id="btn-pay-prepare"') &&
  idxHtml.includes('id="btn-pay-approve"') && idxHtml.includes('id="btn-pay-reopen"') &&
  idxHtml.includes('id="modal-pay-lock"') && idxHtml.includes('id="pay-lock-form"') &&
  idxHtml.includes('id="pay-lock-dispute"'));
check('E21. events nối thẻ chốt công + modal',
  evSrc.includes("safeOn('btn-pay-prepare', 'click'") && evSrc.includes("safeOn('hr-pay-month', 'change', renderHrPayCard)") &&
  evSrc.includes("safeOn('pay-lock-form', 'submit', payLockSubmit)"));
check('E22. hr.js render theo phần + đăng ký thẻ (pay)',
  hrSrc.includes("'hr-pay-card': ['pay']") && hrSrc.includes("renderHrPayCard();"));
check('E23. CSS có trạng thái/cảnh báo/khối chặn của thẻ chốt công',
  cssSrc.includes('.pay-lock-state') && cssSrc.includes('.pay-lock-drift') &&
  cssSrc.includes('.pay-lock-blockers') && cssSrc.includes('.pay-lock-meta'));
check('E24. Nút duyệt chỉ hiện cho Admin/BQL, nút mở khóa chỉ Admin',
  /id="btn-pay-approve"[^>]*data-manager-only|data-manager-only[^>]*id="btn-pay-approve"/.test(idxHtml) &&
  /id="btn-pay-reopen"[^>]*data-admin-only|data-admin-only[^>]*id="btn-pay-reopen"/.test(idxHtml));

// ═══════════════ F. IN PHIẾU CÔNG + BÁO CÁO (GIAI ĐOẠN 4) ═══════════════
const slipHtml = hr.paySlipPagesHtml(MONTH);
check('F1. Phiếu công: mỗi nhân viên 1 trang + đủ 3 ô ký + mã đối chiếu',
  (slipHtml.match(/class="payslip-page"/g) || []).length === 1 &&
  slipHtml.indexOf('PHIẾU XÁC NHẬN CÔNG') !== -1 &&
  slipHtml.indexOf('Người lao động') !== -1 && slipHtml.indexOf('Trưởng bộ phận') !== -1 &&
  slipHtml.indexOf('Kế toán / Quản trị') !== -1 && slipHtml.indexOf('Mã đối chiếu') !== -1);
check('F2. Kỳ chưa chốt → phiếu ghi BẢN NHÁP',
  (() => { const saved = state.hrPayLocks; state.hrPayLocks = [];
    const html = hr.paySlipPagesHtml(MONTH);
    state.hrPayLocks = saved;
    return html.indexOf('BẢN NHÁP') !== -1; })());
check('F3. Phiếu có đủ cột ngày/giờ HC/giờ TC/TC ghi nhận + quy tắc làm tròn',
  slipHtml.indexOf('Giờ HC') !== -1 && slipHtml.indexOf('Giờ TC') !== -1 &&
  slipHtml.indexOf('TC ghi nhận') !== -1 && slipHtml.indexOf('làm tròn') !== -1);
check('F4. Đánh dấu ĐÃ THU phiếu giấy lưu vào bản chốt + hiện trên phiếu in',
  (() => {
    const ok = hr.payMarkPaperSigned('e1', true);
    const lk = hr.payLockOf(MONTH);
    const html = hr.paySlipPagesHtml(MONTH);
    return ok && lk.paperSigned.length === 1 && lk.paperSigned[0].employeeId === 'e1' &&
      html.indexOf('ĐÃ THU') !== -1;
  })());
check('F5. Bỏ đánh dấu phiếu giấy',
  (() => { hr.payMarkPaperSigned('e1', false); return hr.payLockOf(MONTH).paperSigned.length === 0; })());
check('F6. In: đổ nội dung vào vùng in + bật body.pay-printing',
  (() => { let printed = false;
    globalThis.print = () => { printed = true; };
    hr.renderPayPrintPreview(MONTH);
    hr.doPayPrint();
    return printed === true && document.getElementById('pay-print-area').innerHTML.indexOf('payslip-page') !== -1 &&
      document.body.classList.contains('pay-printing'); })());
check('F7. index có modal in phiếu + vùng in thật',
  idxHtml.includes('id="modal-pay-print"') && idxHtml.includes('id="pay-print-preview"') &&
  idxHtml.includes('id="pay-print-area"') && idxHtml.includes('id="btn-pay-print-do"') &&
  idxHtml.includes('id="btn-pay-print"'));
check('F8. CSS in phiếu: chỉ hiện #pay-print-area + ngắt trang mỗi nhân viên',
  cssSrc.includes('body.pay-printing > *:not(#pay-print-area)') &&
  cssSrc.includes('body.pay-printing #pay-print-area') && cssSrc.includes('.payslip-page'));

const specs = await import('../js/report-specs.js');
check('F9. Có 3 báo cáo chốt công (bảng chốt · tổng hợp · phiếu công)',
  !!specs.reportById('hr-pay-lock') && !!specs.reportById('hr-pay-summary') && !!specs.reportById('hr-pay-slip') &&
  specs.reportById('hr-pay-lock').group === 'hr');
check('F10. Nút In Phiếu chỉ hiện cho người có quyền chốt công',
  /id="btn-pay-print"[^>]*data-pay="lock"|data-pay="lock"[^>]*id="btn-pay-print"/.test(idxHtml));
check('F11. events nối in phiếu + đánh dấu phiếu giấy',
  evSrc.includes("safeOn('btn-pay-print-do', 'click', doPayPrint)") &&
  evSrc.includes("'[data-pay-paper]'"));
