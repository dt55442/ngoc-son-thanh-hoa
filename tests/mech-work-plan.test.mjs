// tests/mech-work-plan.test.mjs — Kế hoạch công việc Cơ điện và liên kết HR/sự cố.
'use strict';
import fs from 'node:fs';

function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, force) { const add = force === undefined ? !this._s.has(c) : force; if (add) this._s.add(c); else this._s.delete(c); return add; },
      contains(c) { return this._s.has(c); }
    },
    addEventListener(type, fn) { (el._h[type] = el._h[type] || []).push(fn); },
    appendChild(child) { return child; },
    removeChild(child) { return child; },
    remove() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    click() {},
    getBoundingClientRect() { return { top: 0, bottom: 600, left: 0, right: 900, width: 900, height: 600 }; }
  };
  return el;
}

const elements = new Map();
global.document = {
  body: makeEl('body'),
  head: makeEl('head'),
  documentElement: makeEl('html'),
  getElementById(id) { if (!elements.has(id)) elements.set(id, makeEl(id)); return elements.get(id); },
  createElement() { return makeEl(); },
  querySelector() { return makeEl(); },
  querySelectorAll() { return []; },
  addEventListener() {},
  removeEventListener() {}
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '' };
global.history = { replaceState() {}, pushState() {}, back() {}, state: null };
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
global.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {} });
const store = new Map();
global.localStorage = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); },
  clear() { store.clear(); },
  key(index) { return [...store.keys()][index] || null; },
  get length() { return store.size; }
};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.dispatchEvent = () => true;
global.requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global;
global.self = global;
global.alert = () => {};
global.confirm = () => true;
global.prompt = () => '';
global.lucide = { createIcons() {} };
global.Chart = class {
  constructor(ctx, config) { this.data = (config && config.data) || { labels: [], datasets: [] }; }
  update() {}
  resize() {}
  destroy() {}
  render() {}
  reset() {}
  getDatasetMeta() { return { data: [] }; }
};
Chart.register = () => {};
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.XLSX = { utils: {} };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) { passed++; console.log(`PASS — ${name}`); }
  else { failed++; console.log(`FAIL — ${name}`); }
}
function isoDay(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const { state, STORAGE_KEY_MECH_WORK_PLANS } = await import('../js/state.js');
const hr = await import('../js/hr.js');
const cloud = await import('../js/cloud.js');
const mech = await import('../js/mech-work.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'qc-view';
state.hrEmployees = [{ id: 'mech-1', name: 'Thợ Cơ điện', department: 'Cơ Điện', status: 'active' }];
const workDate = isoDay();
state.hrAssignments = [{
  id: 'assignment-mech-1',
  date: workDate,
  employeeId: 'mech-1',
  department: 'Xưởng 1',
  positionId: 'maintenance',
  start: '07:00',
  end: '19:00',
  shiftIdx: 0
}];
state.hrOvertimes = [];
state.mechWorkPlans = [];
state.x2IncidentReports = [];

const actual = hr.hrAssignmentWorktimeOf('mech-1', workDate);
check('HR: tổng hợp vị trí và giờ TC từ phân bố vị trí', actual.assignments.length === 1 && actual.overtimeMin > 0);
const noForm = mech.taskOvertimeInfo('mech-1', workDate);
check('TC: cảnh báo khi có giờ thực tế nhưng chưa có phiếu', noForm.missingForm === true);
state.hrOvertimes = [{ id: 'ot-1', employeeId: 'mech-1', date: workDate, status: 'pending' }];
const hasPendingForm = mech.taskOvertimeInfo('mech-1', workDate);
check('TC: phiếu chờ duyệt được phân biệt, không báo thiếu phiếu', hasPendingForm.missingForm === false && hasPendingForm.formStatus === 'Chờ duyệt');
state.hrOvertimes[0].status = 'rejected';
check('TC: phiếu từ chối vẫn được hiển thị đúng trạng thái', mech.taskOvertimeInfo('mech-1', workDate).formStatus === 'Từ chối');
state.hrOvertimes = [];

document.getElementById('mech-work-title').value = 'Kiểm tra máy bào';
document.getElementById('mech-work-description').value = 'Kiểm tra dây curoa';
document.getElementById('mech-work-date').value = workDate;
document.getElementById('mech-work-assignees').selectedOptions = [{ value: 'mech-1' }];
document.getElementById('mech-work-priority').value = 'high';
document.getElementById('mech-work-status').value = 'in_progress';
document.getElementById('mech-work-due-date').value = isoDay(-1);
document.getElementById('mech-work-outcome').value = '';
check('Kế hoạch: tạo việc hợp lệ và lưu localStorage', mech.handleMechWorkPlanSubmit({ preventDefault() {} }) &&
  state.mechWorkPlans.length === 1 && JSON.parse(store.get(STORAGE_KEY_MECH_WORK_PLANS)).length === 1);
check('Đồng bộ: snapshot và cloudCore mang danh sách kế hoạch', cloud.collectCloudSnapshot().mechWorkPlans.length === 1 &&
  cloud.cloudCore(cloud.collectCloudSnapshot()).includes('"mechWorkPlans"'));
const cloudPlan = { ...state.mechWorkPlans[0], title: 'Việc nhận từ mây' };
cloud.applyFireSnapshot({ mechWorkPlans: [cloudPlan] });
check('Đồng bộ: nhận kế hoạch từ snapshot mây và lưu localStorage', state.mechWorkPlans[0]?.title === 'Việc nhận từ mây' &&
  JSON.parse(store.get(STORAGE_KEY_MECH_WORK_PLANS))[0]?.title === 'Việc nhận từ mây');
state.mechWorkPlans[0] = { ...state.mechWorkPlans[0], title: 'Kiểm tra máy bào' };
store.set(STORAGE_KEY_MECH_WORK_PLANS, JSON.stringify(state.mechWorkPlans));
check('Backup/khôi phục cục bộ: nạp lại danh sách đã lưu', mech.loadMechWorkPlans().length === 1);
const planMetrics = mech.workPlanMetrics();
check('Kế hoạch: đếm việc mở và việc quá hạn', planMetrics.openCount === 1 && planMetrics.overdueCount === 1);
check('Kế hoạch: không chấm điểm cá nhân', !JSON.stringify(state.mechWorkPlans[0]).includes('score'));

state.x2IncidentReports = [
  { id: 'inc-open', status: 'cho_duyet', repairAssigneeIds: ['mech-1'], repairStatus: 'in_progress', repairDueAt: `${isoDay(-1)}T10:00` },
  { id: 'inc-verified', status: 'da_duyet', repairAssigneeIds: ['mech-1'], repairStatus: 'verified', repairDueAt: `${isoDay(-2)}T10:00` },
  { id: 'inc-no-task', status: 'da_duyet', repairStatus: 'not_started' }
];
const incidentMetrics = mech.incidentMechMetrics(Date.now());
check('Sự cố: đếm phiếu chờ duyệt và việc Cơ điện chưa nghiệm thu/quá hạn',
  incidentMetrics.pendingApproval === 1 && incidentMetrics.repairOpen === 1 && incidentMetrics.repairOverdue === 1);
mech.renderMechCards();
check('Thẻ: hiện cảnh báo thiếu phiếu tăng ca và tình trạng sự cố', document.getElementById('mech-work-plan-count').textContent.includes('cảnh báo') &&
  document.getElementById('mech-incident-count').textContent.includes('chờ duyệt'));

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const events = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const incidentSource = fs.readFileSync(new URL('../js/x2-incidents.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const stateSource = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
check('UI: tên tab và hai thẻ Cơ điện được khai báo', html.includes('<span>QC + Cơ điện</span>') &&
  html.includes('id="btn-open-mech-work-plan"') && html.includes('id="btn-open-mech-incidents"'));
check('UI: thẻ QC nằm 5 cột desktop và sự cố mở danh sách phiếu hiện có', css.includes('grid-template-columns: repeat(5, minmax(0, 1fr))') &&
  events.includes("safeOn('btn-open-mech-incidents', 'click', openMechanicalIncidentCenter)"));
state.mechWorkPlans.push({ ...state.mechWorkPlans[0], id: 'mech-next-day', title: 'Việc ngày kế tiếp', date: isoDay(1), status: 'completed' });
document.getElementById('mech-work-date-filter').value = '';
document.getElementById('mech-work-status-filter').value = 'all';
mech.renderMechWorkPlanList();
const groupedPlans = document.getElementById('mech-work-plan-list').innerHTML;
check('Agenda: kế hoạch được gom thành nhóm ngày riêng', (groupedPlans.match(/mech-work-day-card/g) || []).length === 2 &&
  groupedPlans.includes('Việc ngày kế tiếp') && groupedPlans.includes('Kiểm tra máy bào'));
document.getElementById('mech-work-date-filter').value = workDate;
mech.renderMechWorkPlanList();
check('Agenda: chọn ngày chỉ hiện công việc của ngày đó', document.getElementById('mech-work-plan-list').innerHTML.includes('Kiểm tra máy bào') &&
  !document.getElementById('mech-work-plan-list').innerHTML.includes('Việc ngày kế tiếp'));
check('UI: hai màn hình Cơ điện dùng lớp phủ toàn màn hình, có tổng quan và điều hướng ngày',
  css.includes('#modal-mech-work-plan > .mech-work-modal') && css.includes('#modal-x2-incidents.is-mech-center > .inc-card') &&
  html.includes('id="mech-work-kpi-today"') && html.includes('id="btn-mech-work-date-today"'));
check('Sự cố: thẻ Cơ điện mở chế độ riêng, vẫn nhóm phiếu theo ngày và giữ điểm mở cũ',
  incidentSource.includes('function openMechanicalIncidentCenter()') && incidentSource.includes('function incidentDayCardHtml') &&
  incidentSource.includes('byDate.get(dt)') && events.includes("safeOn('btn-incident-reports', 'click', () => openIncidentReports())"));
check('PWA: cache v403 đồng bộ APP_VERSION và đưa module Cơ điện vào shell', sw.includes('nha-may-ngoc-son-v403') &&
  sw.includes("'./js/mech-work.js'") && stateSource.includes("APP_VERSION = 'v403'"));

console.log(`MECH-WORK-PLAN: ${passed} PASS, ${failed} FAIL`);
if (failed) process.exitCode = 1;
