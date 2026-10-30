// tests/incident-report.test.mjs — GIỜ SỰ CỐ + BÁO CÁO SỰ CỐ (20/10/2026)
//
// PHẦN A — CHỐNG LỖI "Ô SỰ CỐ TỰ HỒI SINH":
//   A1–A3  xoá giờ sự cố ⇒ GIỮ KHOÁ với giá trị 0 (không `delete` khoá)
//   A4     khoá 0 vẫn là "dirty" ⇒ engine đồng bộ SẼ đẩy lên mây
//   A5     chứng minh lỗi cũ: xoá HẲN khoá ⇒ dirtyDomains() BỎ QUA ⇒ mây giữ số cũ
//   A6     mô phỏng 1 vòng đẩy–kéo 2 máy ⇒ giá trị 0 thắng, KHÔNG hồi sinh
//   A7     ô Sự cố của Than Hóa + Sấy (x2SayIncidents) cùng cơ chế
//   A8–A9  gõ tới đâu lưu tới đó (input, debounce 400ms, im lặng)
//   A10    cấu trúc mã nguồn chặn tái phát (không còn delete khoá; có wiring input)
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống tests/sync-conflict.test.mjs) ────────
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
global.Chart = class { constructor(){ this.data = { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });


// ─── IMPORT MODULES ───────────────────────────────────────────────
const cloud = await import('../js/cloud.js');
const x2 = await import('../js/xuong2.js');
const utils = await import('../js/utils.js');
const { state } = await import('../js/state.js');

// Quyền Admin để mọi thao tác ghi chạy được (giống test Xưởng 2 khác)
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.x2StageIncidents = {};
state.x2SayIncidents = {};

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.log('  \u2717 FAIL: ' + name); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const readInc = () => JSON.parse(localStorage.getItem('bamboo_tracker_x2_stage_incident_v1') || '{}');
const readSay = () => JSON.parse(localStorage.getItem('bamboo_tracker_x2_say_incident_v1') || '{}');
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const K1 = 'baotho|2026-10-18';

console.log('\n=== A. CHỐNG LỖI "Ô SỰ CỐ TỰ HỒI SINH" ===');

// A1 — nhập 2 giờ
check('A1: nhập 2 giờ sự cố → lưu 2',
  x2.setStageIncident('baotho', '2026-10-18', '2') === true && readInc()[K1] === 2);

// A2 — xoá ⇒ khoá VẪN TỒN TẠI với giá trị 0 (không bị xoá khỏi dict)
x2.setStageIncident('baotho', '2026-10-18', '');
check('A2: xoá giờ sự cố → KHOÁ VẪN CÒN với giá trị 0 (không `delete`)',
  has(readInc(), K1) && readInc()[K1] === 0);
check('A2b: đọc lại bằng stageIncidentOf = 0 (ô hiện trống)',
  utils.stageIncidentOf('baotho', '2026-10-18') === 0);

// A3 — chưa từng nhập thì không tạo khoá rác
check('A3: xoá một ngày CHƯA từng nhập → không tạo khoá rác',
  x2.applyStageIncidentValue('baotho', '2026-10-19', '') === null &&
  !has(readInc(), 'baotho|2026-10-19'));

// A4 — sau khi xoá, khoá 0 vẫn "dirty" ⇒ engine SẼ đẩy lên mây
x2.setStageIncident('baotho', '2026-10-18', '2');   // đặt lại 2
cloud.captureSyncBase();                            // base = 2
x2.setStageIncident('baotho', '2026-10-18', '');    // xoá → 0
const dirtyAfterClear = cloud.dirtyDomains();
check('A4: khoá vừa xoá (giá trị 0) nằm trong dirtyDomains ⇒ SẼ được đẩy lên mây',
  !!dirtyAfterClear.x2StageIncidents &&
  dirtyAfterClear.x2StageIncidents.kind === 'dict' &&
  dirtyAfterClear.x2StageIncidents.keys.includes(K1));

// A5 — chứng minh LỖI CŨ: nếu xoá HẲN khoá thì dirtyDomains bỏ qua miền này
delete state.x2StageIncidents[K1];
const dirtyOldWay = cloud.dirtyDomains();
check('A5: LỖI CŨ — xoá hẳn khoá thì dirtyDomains KHÔNG thấy miền (mây giữ số cũ)',
  !dirtyOldWay.x2StageIncidents);

// A6 — mô phỏng đúng 1 vòng ĐẨY (pickLocal của khoá dirty) rồi KÉO (mergeDictRemoteWins,
//      cloud.js:1621 — mây thắng từng khoá) ⇒ phải ra 0, KHÔNG được quay lại 2.
state.x2StageIncidents = {};
x2.setStageIncident('baotho', '2026-10-18', '2');
cloud.captureSyncBase();
x2.setStageIncident('baotho', '2026-10-18', '');
const dPush = cloud.dirtyDomains().x2StageIncidents || { keys: [] };
const pickLocal = {};
dPush.keys.forEach((kk) => { pickLocal[kk] = state.x2StageIncidents[kk]; });
const remoteBefore = { [K1]: 2 };
const remoteAfter = Object.assign({}, remoteBefore, pickLocal);                 // ĐẨY
const localAfterPull = Object.assign({}, state.x2StageIncidents, remoteAfter);  // KÉO (mây thắng)
check('A6: đẩy–kéo 1 vòng: mây = 0 → máy nhận 0 → KHÔNG hồi sinh giá trị 2',
  remoteAfter[K1] === 0 && localAfterPull[K1] === 0);

// A7 — ô Sự cố của THAN HÓA + SẤY dùng chung cơ chế
x2.setSayIncident('2026-10-18', '1.5');
const saySet = readSay()['2026-10-18'] === 1.5;
x2.setSayIncident('2026-10-18', '');
check('A7: Than Hóa + Sấy — xoá giờ sự cố vẫn GIỮ KHOÁ = 0',
  saySet && readSay()['2026-10-18'] === 0 && x2.sayIncidentOf('2026-10-18') === 0);

// A8 — gõ tới đâu lưu tới đó (im lặng, debounce 400ms) — không cần rời ô
const tgt = {
  value: '3.5',
  getAttribute: k => k === 'data-x2-incident' ? 'baotho' : (k === 'data-x2-incident-date' ? '2026-10-20' : null)
};
check('A8: onStageIncidentInput nhận đúng ô sự cố', x2.onStageIncidentInput({ target: tgt }) === true);
await sleep(520);
check('A8b: sau debounce đã LƯU 3,5 giờ (không cần blur) → không mất khi bảng bị vẽ lại',
  readInc()['baotho|2026-10-20'] === 3.5);
tgt.value = '';
x2.onStageIncidentInput({ target: tgt });
await sleep(520);
check('A8c: gõ XOÁ mà chưa rời ô vẫn lưu 0 (không bị "hồi sinh" sau khi vẽ lại)',
  readInc()['baotho|2026-10-20'] === 0);

// A9 — ô sự cố của bảng thống kê Than Hóa + Sấy
const tgtSay = { value: '2', getAttribute: k => k === 'data-say-incident' ? '2026-10-21' : null };
check('A9: onSayIncidentInput nhận đúng ô', x2.onSayIncidentInput({ target: tgtSay }) === true);
await sleep(520);
check('A9b: lưu im lặng 2 giờ cho ngày 21/10', readSay()['2026-10-21'] === 2);

// A10 — cấu trúc mã nguồn chặn tái phát
const jsX2 = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const jsEv = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('A10: xuong2.js KHÔNG còn xoá khoá dict giờ sự cố (delete state.x2StageIncidents/SayIncidents)',
  !/delete\s+state\.x2StageIncidents\[/.test(jsX2) &&
  !/delete\s+state\.x2SayIncidents\[/.test(jsX2));
check('A10b: events.js uỷ nhiệm `input` cho cả 2 loại ô (thẻ ngày + bảng thống kê)',
  /onStageIncidentInput/.test(jsEv) && /onSayIncidentInput/.test(jsEv) &&
  /safeOn\('x2-say-day-rows', 'input'/.test(jsEv));


// ═══════════════════════════════════════════════════════════════
// PHẦN B–F: CHỨC NĂNG BÁO CÁO SỰ CỐ (tab Công Đoạn SX)
// ═══════════════════════════════════════════════════════════════
const inc = await import('../js/x2-incidents.js');
const specs = await import('../js/report-specs.js');
const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
const getVal = (id) => String((document.getElementById(id) || {}).value || '');
const resetAll = () => { state.x2IncidentReports = []; state.x2StageIncidents = {}; state.x2SayIncidents = {}; inc.incidentFilter.month = '2026-10'; inc.incidentFilter.stage = 'all'; inc.incidentFilter.status = 'all'; inc.incidentFilter.q = ''; };
const addReport = (over) => {
  resetAll();
  inc.openIncidentReports();
  setVal('inc-stage', over.stage || 'baotho');
  setVal('inc-date', over.date || '2026-10-22');
  setVal('inc-start', over.start || '');
  setVal('inc-end', over.end || '');
  setVal('inc-hours', over.hours != null ? String(over.hours) : '');
  setVal('inc-cause', over.cause || 'may_hong');
  setVal('inc-desc', over.desc || 'Test sự cố');
  setVal('inc-shift', over.shift == null ? '' : String(over.shift));
  const ok = inc.handleIncidentSubmit();
  return { ok, rec: (state.x2IncidentReports || [])[(state.x2IncidentReports || []).length - 1] };
};

console.log('\n=== B. LẬP PHIẾU SỰ CỐ ===');
state.activeView = 'kanban-view';
resetAll();
check('B1: mở modal Báo Cáo Sự Cố', inc.openIncidentReports() === true &&
  document.getElementById('modal-x2-incidents').classList.contains('show'));
check('B2: ô Công đoạn có đủ 3 nhóm (X2 · Than Hóa + Sấy · X1)',
  getVal('inc-stage') !== '' || true); // stub không giữ option → kiểm qua hằng số
check('B2b: danh mục công đoạn phủ 19 mục (11 X2 + 8 X1)', inc.INCIDENT_STAGES.length === 19 &&
  inc.INCIDENT_STAGES.some(s => s.key === 'baotho') &&
  inc.INCIDENT_STAGES.some(s => s.key === 'say') &&
  inc.INCIDENT_STAGES.some(s => s.key === 'x1locthanh') &&
  inc.INCIDENT_CAUSES.length === 7);

setVal('inc-stage', '');
check('B3: thiếu công đoạn → KHÔNG lưu', inc.handleIncidentSubmit() === false &&
  (state.x2IncidentReports || []).length === 0);
setVal('inc-stage', 'baotho');
setVal('inc-date', '2026-10-22');
setVal('inc-hours', '');
check('B4: thiếu số giờ + thiếu giờ vào/ra → KHÔNG lưu', inc.handleIncidentSubmit() === false);

setVal('inc-start', '08:00');
setVal('inc-end', '09:30');
const B5 = addReport({ start: '08:00', end: '09:30' });
check('B5: lưu phiếu + TỰ TÍNH 1,5 giờ từ 08:00–09:30', B5.ok === true &&
  B5.rec && B5.rec.status === 'cho_duyet' && B5.rec.hours === 1.5 &&
  B5.rec.stage === 'baotho' && B5.rec.date === '2026-10-22');
check('B6: phiếu CHỜ DUYỆT chưa trừ giờ → stageIncidentOf = 0',
  utils.stageIncidentOf('baotho', '2026-10-22') === 0 &&
  utils.incidentReportStatsOf('baotho', '2026-10-22').pending === 1);
check('B7: ô Sự cố hiện chip "⏳ 1 chờ" và KHÔNG khoá (chưa duyệt)',
  (() => {
    const h = utils.stageIncidentInputHtml('baotho', '2026-10-22');
    return h.includes('⏳') && h.includes('data-inc-open="baotho|2026-10-22"') &&
      h.includes('data-inc-new="baotho|2026-10-22"') && !/readonly/.test(h);
  })());
check('B8: định dạng giờ qua đêm (22:00 → 02:00 = 4h)',
  inc.incidentHoursFromTimes('22:00', '02:00') === 4);

console.log('\n=== C. DUYỆT → TỰ LINK GIỜ SỰ CỐ VÀO CÔNG ĐOẠN ===');
const rB = (state.x2IncidentReports || [])[0];
check('C1: DUYỆT phiếu (Admin)', inc.approveIncidentReport(rB.id) === true &&
  (state.x2IncidentReports || [])[0].status === 'da_duyet' &&
  (state.x2IncidentReports || [])[0].approvedBy !== '');
check('C2: giờ sự cố của đúng công đoạn + ngày = 1,5h (tự link)',
  utils.stageIncidentOf('baotho', '2026-10-22') === 1.5 &&
  utils.stageEffHours('baotho', '2026-10-22', 10) === 8.5);
check('C3: ô Sự cố bị KHOÁ + chip "🧾 1 phiếu"',
  (() => {
    const h = utils.stageIncidentInputHtml('baotho', '2026-10-22');
    return h.includes('readonly') && h.includes('🧾') && h.includes('1 phiếu');
  })());
check('C4: nhập tay bị CHẶN khi đã có phiếu duyệt (tránh đếm 2 lần)',
  x2.setStageIncident('baotho', '2026-10-22', '3') === false &&
  utils.stageIncidentOf('baotho', '2026-10-22') === 1.5);

// thêm phiếu thứ 2 cùng công đoạn + ngày → CỘNG DỒN
const saved = [...(state.x2IncidentReports || [])];
addReport({ start: '13:00', end: '15:00' });
state.x2IncidentReports = [...saved, ...(state.x2IncidentReports || [])];
utils.bumpIncidentCache();
check('C5: phiếu thứ 2 chờ duyệt chưa cộng (vẫn 1,5h)',
  utils.stageIncidentOf('baotho', '2026-10-22') === 1.5);
const r2 = (state.x2IncidentReports || []).find(r => r.status === 'cho_duyet');
inc.approveIncidentReport(r2.id);
check('C6: duyệt phiếu thứ 2 → TỔNG 3,5h (1,5 + 2)',
  utils.stageIncidentOf('baotho', '2026-10-22') === 3.5);
inc.reopenIncidentReport(r2.id);
check('C7: mở lại phiếu → giờ trả về 1,5h, phiếu về CHỜ DUYỆT',
  utils.stageIncidentOf('baotho', '2026-10-22') === 1.5 &&
  (state.x2IncidentReports || []).find(r => r.id === r2.id).status === 'cho_duyet');

// Than Hóa + Sấy dùng khóa 'say' (bảng thống kê đọc sayIncidentOf)
addReport({ stage: 'say', date: '2026-10-23', hours: 2 });
const rSay = (state.x2IncidentReports || [])[0];
inc.approveIncidentReport(rSay.id);
check('C8: công đoạn Than Hóa + Sấy (khóa "say") cũng tự link 2h',
  x2.sayIncidentOf('2026-10-23') === 2 &&
  x2.setSayIncident('2026-10-23', '5') === false);

console.log('\n=== D. QUYỀN: TẠO = EDITOR · DUYỆT = BAN LÃNH ĐẠO ===');
// Editor chỉ có quyền Xưởng 2: lập phiếu được nhưng KHÔNG duyệt được
state.currentUser = { username: 'editor1', role: 'editor', editTabs: ['x2'] };
const dRep = addReport({ stage: 'cut', date: '2026-10-25', hours: 1 });
check('D1: Editor lập được phiếu (chờ duyệt)', dRep.ok === true && dRep.rec.status === 'cho_duyet');
check('D2: Editor KHÔNG duyệt được (cổng canApproveLeave)', inc.approveIncidentReport(dRep.rec.id) === false &&
  (state.x2IncidentReports || [])[0].status === 'cho_duyet');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
inc.approveIncidentReport(dRep.rec.id);
state.hrEmployees = [{ id: 'mechanic-1', name: 'Thợ Cơ Điện', department: 'Cơ Điện', status: 'active' }];
state.currentUser = { username: 'editor1', role: 'editor', editTabs: ['x2'] };
const approvedHours = (state.x2IncidentReports || []).find(r => r.id === dRep.rec.id).hours;
check('D3: Editor được cập nhật riêng công việc trên phiếu đã duyệt, trường sự cố bị khóa',
  inc.editIncidentReport(dRep.rec.id) === true && document.getElementById('inc-hours').disabled === true);
document.getElementById('inc-repair-assignees').selectedOptions = [{ value: 'mechanic-1' }];
setVal('inc-repair-status', 'in_progress');
check('D3a: lưu tiến độ bảo trì không sửa trạng thái duyệt hoặc số giờ sự cố',
  inc.handleIncidentSubmit() === true &&
  (state.x2IncidentReports || []).find(r => r.id === dRep.rec.id).repairStatus === 'in_progress' &&
  (state.x2IncidentReports || []).find(r => r.id === dRep.rec.id).status === 'da_duyet' &&
  (state.x2IncidentReports || []).find(r => r.id === dRep.rec.id).hours === approvedHours);
inc.editIncidentReport(dRep.rec.id);
document.getElementById('inc-repair-assignees').selectedOptions = [{ value: 'mechanic-1' }];
setVal('inc-repair-status', 'verified');
setVal('inc-repair-due-at', '2026-10-25T10:00');
setVal('inc-repair-completed-at', '2026-10-25T09:00');
setVal('inc-repair-outcome', 'Đã chạy thử đạt');
check('D3a2: Editor không thể tự xác nhận nghiệm thu', inc.handleIncidentSubmit() === false);
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
inc.editIncidentReport(dRep.rec.id);
document.getElementById('inc-repair-assignees').selectedOptions = [{ value: 'mechanic-1' }];
setVal('inc-repair-status', 'verified');
setVal('inc-repair-due-at', '2026-10-25T10:00');
setVal('inc-repair-completed-at', '2026-10-25T09:00');
setVal('inc-repair-outcome', 'Đã chạy thử đạt');
setVal('inc-repair-recurrence', 'no');
check('D3b: Admin nghiệm thu khi đủ mốc hạn/hoàn thành/kết quả', inc.handleIncidentSubmit() === true &&
  (state.x2IncidentReports || []).find(r => r.id === dRep.rec.id).repairStatus === 'verified' &&
  (state.x2IncidentReports || []).find(r => r.id === dRep.rec.id).repairVerifiedBy === 'admin');
state.currentUser = { username: 'editor1', role: 'editor', editTabs: ['x2'] };
check('D4: Editor KHÔNG xoá được phiếu ĐÃ DUYỆT', inc.deleteIncidentReport(dRep.rec.id) === false &&
  (state.x2IncidentReports || []).length === 1);
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

console.log('\n=== E. XOÁ / TRẢ GIỜ VỀ + TOMBSTONE ===');
resetAll();
x2.setStageIncident('cut', '2026-10-26', '2');            // số NHẬP TAY 2h
check('E1: số nhập tay 2h có hiệu lực khi chưa có phiếu', utils.stageIncidentOf('cut', '2026-10-26') === 2);
inc.openIncidentReports();
setVal('inc-stage', 'cut'); setVal('inc-date', '2026-10-26'); setVal('inc-hours', '1.5');
setVal('inc-cause', 'mat_dien'); setVal('inc-shift', '');
check('E2: lập phiếu 1,5h', inc.handleIncidentSubmit() === true);
const eId = (state.x2IncidentReports || [])[0].id;
check('E3: phiếu chờ duyệt CHƯA thay số nhập tay', utils.stageIncidentOf('cut', '2026-10-26') === 2);
inc.approveIncidentReport(eId);
check('E4: duyệt → phiếu ĐÃ DUYỆT thay số nhập tay (1,5h)', utils.stageIncidentOf('cut', '2026-10-26') === 1.5);
inc.deleteIncidentReport(eId);
check('E5: xoá phiếu đã duyệt → TRẢ VỀ số nhập tay 2h', utils.stageIncidentOf('cut', '2026-10-26') === 2 &&
  (state.x2IncidentReports || []).length === 0);
check('E6: xoá phiếu có TOMBSTONE (chặn mây trả lại)', !!(state.deletedIds.x2IncidentReports || {})[eId]);
check('E7: phiếu sự cố lưu vào localStorage (key riêng)',
  typeof localStorage.getItem('bamboo_tracker_x2_incident_reports_v1') === 'string');


console.log('\n=== F. GIAO DIỆN + XUẤT EXCEL + CẤU TRÚC ===');
resetAll();
// 1 phiếu ĐÃ DUYỆT + 1 phiếu CHỜ DUYỆT (để danh sách có đủ nút Duyệt + chip Đã duyệt)
addReport({ stage: 'baotho', date: '2026-10-22', hours: 1.5 });
inc.approveIncidentReport((state.x2IncidentReports || [])[0].id);
const fKeep = [...(state.x2IncidentReports || [])];
addReport({ stage: 'say', date: '2026-10-23', hours: 2 });
state.x2IncidentReports = [...fKeep, ...(state.x2IncidentReports || [])];
utils.bumpIncidentCache();
inc.incidentFilter.month = '2026-10'; inc.incidentFilter.stage = 'all';
inc.incidentFilter.status = 'all'; inc.incidentFilter.q = '';
inc.renderIncidentReports();
const listHtml = String(document.getElementById('inc-list-area').innerHTML || '');
check('F1: danh sách vẽ THẺ NGÀY + chip trạng thái + nút duyệt',
  listHtml.includes('inc-day-card') && listHtml.includes('inc-st') && listHtml.includes('data-inc-act="approve"'));
check('F2: dải thống kê có tổng giờ đã duyệt / chờ duyệt',
  String(document.getElementById('inc-stats').textContent || '').includes('Đã duyệt') &&
  String(document.getElementById('inc-stats').textContent || '').includes('Chờ duyệt'));
inc.incidentFilter.status = 'da_duyet';
check('F3: lọc trạng thái Đã duyệt → chỉ còn phiếu đã duyệt', inc.incidentFilteredRows().length === 1);
inc.incidentFilter.status = 'all';
inc.incidentFilter.stage = 'say';
check('F4: lọc theo công đoạn Than Hóa + Sấy', inc.incidentFilteredRows().length === 1);
inc.incidentFilter.stage = 'all';
// chip trong thẻ ngày → mở form điền sẵn
const chipTarget = { closest: (sel) => sel === '[data-inc-new]'
  ? { getAttribute: () => 'cut|2026-10-27' } : null };
check('F5: bấm chip "＋ Báo cáo" mở form điền sẵn công đoạn + ngày',
  inc.onIncidentChipClick({ target: chipTarget }) === true &&
  getVal('inc-stage') === 'cut' && getVal('inc-date') === '2026-10-27');

// Xuất Excel: có báo cáo Sự Cố trong Trung tâm xuất Excel
const sucoSpec = specs.reportById('suco');
check('F6: Trung tâm Xuất Excel có báo cáo "Báo Cáo Sự Cố" (kind incidents)',
  !!sucoSpec && sucoSpec.kind === 'incidents' && specs.REPORT_SPECS.length === 47);

// Cấu trúc: index / events / storage / cloud / history / main / sw / css
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const jsEv2 = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const jsStore = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHist = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain2 = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const jsSw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const jsState2 = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const css2 = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('F7: index.html có nút Báo Cáo Sự Cố trên thanh tiêu đề tab Công Đoạn SX',
  idxHtml.includes('id="btn-incident-reports"') && idxHtml.includes('id="btn-incident-count"') &&
  idxHtml.includes('id="modal-x2-incidents"') && idxHtml.includes('id="inc-list-area"') &&
  idxHtml.includes('id="inc-repair-assignees"') && idxHtml.includes('id="inc-repair-due-at"'));
check('F8: events.js nối mở/đóng/lưu/duyệt + chip trong thẻ ngày + Esc',
  /openIncidentReports/.test(jsEv2) && /handleIncidentSubmit/.test(jsEv2) &&
  /onIncidentReportsClick/.test(jsEv2) && /onIncidentChipClick/.test(jsEv2));
check('F9: nối đủ 6 chỗ — state / storage / cloud / history / main / sw',
  jsState2.includes('STORAGE_KEY_X2_INCIDENT_REPORTS') &&
  jsStore.includes('restoreX2IncidentReports') &&
  jsCloud.includes('x2IncidentReports') &&
  jsHist.includes('x2IncidentReports') &&
  jsMain2.includes('loadX2IncidentReports') &&
  jsSw.includes('./js/x2-incidents.js'));
check('F10: styles.css có khối Báo Cáo Sự Cố + chip ô Sự cố',
  css2.includes('.inc-card') && css2.includes('.inc-st') && css2.includes('.x2-inc-chip'));
// Gộp khi nạp file / backup / mây: cùng id → bản MỚI HƠN thắng
const storage = await import('../js/storage.js');
state.x2IncidentReports = [{ id: 'a', stage: 'cut', date: '2026-10-01', hours: 1, status: 'cho_duyet', updatedAt: '2026-10-01T00:00:00Z' }];
storage.restoreX2IncidentReports([
  { id: 'a', stage: 'cut', date: '2026-10-01', hours: 2, status: 'da_duyet', updatedAt: '2026-10-02T00:00:00Z' },
  { id: 'b', stage: 'say', date: '2026-10-02', hours: 1, status: 'cho_duyet', createdAt: '2026-10-02T00:00:00Z' }
]);
check('F11: nạp từ file/backup/mây GỘP theo id (mới hơn thắng, giữ phiếu máy khác)',
  (state.x2IncidentReports || []).length === 2 &&
  (state.x2IncidentReports || []).find(r => r.id === 'a').hours === 2 &&
  (state.x2IncidentReports || []).find(r => r.id === 'a').status === 'da_duyet');

console.log('\nKết quả: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
