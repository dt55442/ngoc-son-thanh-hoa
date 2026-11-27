// tests/mech-work-plan.test.mjs â€” Káº¿ hoáº¡ch cÃ´ng viá»‡c CÆ¡ Ä‘iá»‡n vÃ  liÃªn káº¿t HR/sá»± cá»‘.
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
  if (condition) { passed++; console.log(`PASS â€” ${name}`); }
  else { failed++; console.log(`FAIL â€” ${name}`); }
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
state.hrEmployees = [{ id: 'mech-1', name: 'Thá»£ CÆ¡ Ä‘iá»‡n', department: 'CÆ¡ Äiá»‡n', status: 'active' }];
const workDate = isoDay();
state.hrAssignments = [{
  id: 'assignment-mech-1',
  date: workDate,
  employeeId: 'mech-1',
  department: 'XÆ°á»Ÿng 1',
  positionId: 'maintenance',
  start: '07:00',
  end: '19:00',
  shiftIdx: 0
}];
state.hrOvertimes = [];
state.mechWorkPlans = [];
state.x2IncidentReports = [];

const actual = hr.hrAssignmentWorktimeOf('mech-1', workDate);
check('HR: tá»•ng há»£p vá»‹ trÃ­ vÃ  giá» TC tá»« phÃ¢n bá»‘ vá»‹ trÃ­', actual.assignments.length === 1 && actual.overtimeMin > 0);
const noForm = mech.taskOvertimeInfo('mech-1', workDate);
check('TC: cáº£nh bÃ¡o khi cÃ³ giá» thá»±c táº¿ nhÆ°ng chÆ°a cÃ³ phiáº¿u', noForm.missingForm === true);
state.hrOvertimes = [{ id: 'ot-1', employeeId: 'mech-1', date: workDate, status: 'pending' }];
const hasPendingForm = mech.taskOvertimeInfo('mech-1', workDate);
check('TC: phiáº¿u chá» duyá»‡t Ä‘Æ°á»£c phÃ¢n biá»‡t, khÃ´ng bÃ¡o thiáº¿u phiáº¿u', hasPendingForm.missingForm === false && hasPendingForm.formStatus === 'Chá» duyá»‡t');
state.hrOvertimes[0].status = 'rejected';
check('TC: phiáº¿u tá»« chá»‘i váº«n Ä‘Æ°á»£c hiá»ƒn thá»‹ Ä‘Ãºng tráº¡ng thÃ¡i', mech.taskOvertimeInfo('mech-1', workDate).formStatus === 'Tá»« chá»‘i');
state.hrOvertimes = [];

document.getElementById('mech-work-title').value = 'Kiá»ƒm tra mÃ¡y bÃ o';
document.getElementById('mech-work-description').value = 'Kiá»ƒm tra dÃ¢y curoa';
document.getElementById('mech-work-date').value = workDate;
document.getElementById('mech-work-assignees').selectedOptions = [{ value: 'mech-1' }];
document.getElementById('mech-work-priority').value = 'high';
document.getElementById('mech-work-status').value = 'in_progress';
document.getElementById('mech-work-due-date').value = isoDay(-1);
document.getElementById('mech-work-outcome').value = '';
check('Káº¿ hoáº¡ch: táº¡o viá»‡c há»£p lá»‡ vÃ  lÆ°u localStorage', mech.handleMechWorkPlanSubmit({ preventDefault() {} }) &&
  state.mechWorkPlans.length === 1 && JSON.parse(store.get(STORAGE_KEY_MECH_WORK_PLANS)).length === 1);
check('Äá»“ng bá»™: snapshot vÃ  cloudCore mang danh sÃ¡ch káº¿ hoáº¡ch', cloud.collectCloudSnapshot().mechWorkPlans.length === 1 &&
  cloud.cloudCore(cloud.collectCloudSnapshot()).includes('"mechWorkPlans"'));
const cloudPlan = { ...state.mechWorkPlans[0], title: 'Viá»‡c nháº­n tá»« mÃ¢y' };
cloud.applyFireSnapshot({ mechWorkPlans: [cloudPlan] });
check('Äá»“ng bá»™: nháº­n káº¿ hoáº¡ch tá»« snapshot mÃ¢y vÃ  lÆ°u localStorage', state.mechWorkPlans[0]?.title === 'Viá»‡c nháº­n tá»« mÃ¢y' &&
  JSON.parse(store.get(STORAGE_KEY_MECH_WORK_PLANS))[0]?.title === 'Viá»‡c nháº­n tá»« mÃ¢y');
state.mechWorkPlans[0] = { ...state.mechWorkPlans[0], title: 'Kiá»ƒm tra mÃ¡y bÃ o' };
store.set(STORAGE_KEY_MECH_WORK_PLANS, JSON.stringify(state.mechWorkPlans));
check('Backup/khÃ´i phá»¥c cá»¥c bá»™: náº¡p láº¡i danh sÃ¡ch Ä‘Ã£ lÆ°u', mech.loadMechWorkPlans().length === 1);
const planMetrics = mech.workPlanMetrics();
check('Káº¿ hoáº¡ch: Ä‘áº¿m viá»‡c má»Ÿ vÃ  viá»‡c quÃ¡ háº¡n', planMetrics.openCount === 1 && planMetrics.overdueCount === 1);
check('Káº¿ hoáº¡ch: khÃ´ng cháº¥m Ä‘iá»ƒm cÃ¡ nhÃ¢n', !JSON.stringify(state.mechWorkPlans[0]).includes('score'));

state.x2IncidentReports = [
  { id: 'inc-open', status: 'cho_duyet', repairAssigneeIds: ['mech-1'], repairStatus: 'in_progress', repairDueAt: `${isoDay(-1)}T10:00` },
  { id: 'inc-verified', status: 'da_duyet', repairAssigneeIds: ['mech-1'], repairStatus: 'verified', repairDueAt: `${isoDay(-2)}T10:00` },
  { id: 'inc-no-task', status: 'da_duyet', repairStatus: 'not_started' }
];
const incidentMetrics = mech.incidentMechMetrics(Date.now());
check('Sá»± cá»‘: Ä‘áº¿m phiáº¿u chá» duyá»‡t vÃ  viá»‡c CÆ¡ Ä‘iá»‡n chÆ°a nghiá»‡m thu/quÃ¡ háº¡n',
  incidentMetrics.pendingApproval === 1 && incidentMetrics.repairOpen === 1 && incidentMetrics.repairOverdue === 1);
mech.renderMechCards();
check('Tháº»: hiá»‡n cáº£nh bÃ¡o thiáº¿u phiáº¿u tÄƒng ca vÃ  tÃ¬nh tráº¡ng sá»± cá»‘', document.getElementById('mech-work-plan-count').textContent.includes('cáº£nh bÃ¡o') &&
  document.getElementById('mech-incident-count').textContent.includes('chá» duyá»‡t'));

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const events = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const incidentSource = fs.readFileSync(new URL('../js/x2-incidents.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const stateSource = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
check('UI: tÃªn tab vÃ  hai tháº» CÆ¡ Ä‘iá»‡n Ä‘Æ°á»£c khai bÃ¡o', html.includes('<span>QC + CÆ¡ Ä‘iá»‡n</span>') &&
  html.includes('id="btn-open-mech-work-plan"') && html.includes('id="btn-open-mech-incidents"'));
check('UI: tháº» QC náº±m 5 cá»™t desktop vÃ  sá»± cá»‘ má»Ÿ danh sÃ¡ch phiáº¿u hiá»‡n cÃ³', css.includes('grid-template-columns: repeat(5, minmax(0, 1fr))') &&
  events.includes("safeOn('btn-open-mech-incidents', 'click', openMechanicalIncidentCenter)"));
state.mechWorkPlans.push({ ...state.mechWorkPlans[0], id: 'mech-next-day', title: 'Viá»‡c ngÃ y káº¿ tiáº¿p', date: isoDay(1), status: 'completed' });
document.getElementById('mech-work-date-filter').value = '';
document.getElementById('mech-work-status-filter').value = 'all';
mech.renderMechWorkPlanList();
const groupedPlans = document.getElementById('mech-work-plan-list').innerHTML;
check('Agenda: káº¿ hoáº¡ch Ä‘Æ°á»£c gom thÃ nh nhÃ³m ngÃ y riÃªng', (groupedPlans.match(/mech-work-day-card/g) || []).length === 2 &&
  groupedPlans.includes('Viá»‡c ngÃ y káº¿ tiáº¿p') && groupedPlans.includes('Kiá»ƒm tra mÃ¡y bÃ o'));
document.getElementById('mech-work-date-filter').value = workDate;
mech.renderMechWorkPlanList();
check('Agenda: chá»n ngÃ y chá»‰ hiá»‡n cÃ´ng viá»‡c cá»§a ngÃ y Ä‘Ã³', document.getElementById('mech-work-plan-list').innerHTML.includes('Kiá»ƒm tra mÃ¡y bÃ o') &&
  !document.getElementById('mech-work-plan-list').innerHTML.includes('Viá»‡c ngÃ y káº¿ tiáº¿p'));
check('UI: hai mÃ n hÃ¬nh CÆ¡ Ä‘iá»‡n dÃ¹ng lá»›p phá»§ toÃ n mÃ n hÃ¬nh, cÃ³ tá»•ng quan vÃ  Ä‘iá»u hÆ°á»›ng ngÃ y',
  css.includes('#modal-mech-work-plan > .mech-work-modal') && css.includes('#modal-x2-incidents.is-mech-center > .inc-card') &&
  html.includes('id="mech-work-kpi-today"') && html.includes('id="btn-mech-work-date-today"'));
check('Sá»± cá»‘: tháº» CÆ¡ Ä‘iá»‡n má»Ÿ cháº¿ Ä‘á»™ riÃªng, váº«n nhÃ³m phiáº¿u theo ngÃ y vÃ  giá»¯ Ä‘iá»ƒm má»Ÿ cÅ©',
  incidentSource.includes('function openMechanicalIncidentCenter()') && incidentSource.includes('function incidentDayCardHtml') &&
  incidentSource.includes('byDate.get(dt)') && events.includes("safeOn('btn-incident-reports', 'click', () => openIncidentReports())"));
check('PWA: cache v486 Ä‘á»“ng bá»™ APP_VERSION vÃ  Ä‘Æ°a module CÆ¡ Ä‘iá»‡n vÃ o shell', sw.includes('nha-may-ngoc-son-v486') &&
  sw.includes("'./js/mech-work.js'") && stateSource.includes("APP_VERSION = 'v486'"));

console.log(`MECH-WORK-PLAN: ${passed} PASS, ${failed} FAIL`);
if (failed) process.exitCode = 1;

