// ═══════════════════════════════════════════════════════════
// js/mech-work.js — KẾ HOẠCH CÔNG VIỆC CƠ ĐIỆN + cảnh báo liên kết
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { hrAssignmentWorktimeOf } from './hr.js';
import { canEditTab } from './permissions.js';
import { STORAGE_KEY_MECH_WORK_PLANS, state } from './state.js';
import { trackDeleted, untrackDeleted } from './tombstone.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';

const WORK_STATUS = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành'
};
const WORK_PRIORITY = { low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn cấp' };
const OVERTIME_STATUS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy'
};

let editingWorkId = '';

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function normalizeWorkPlan(record) {
  if (!record || !record.id || !/^\d{4}-\d{2}-\d{2}$/.test(String(record.date || '')) || !String(record.title || '').trim()) return null;
  return {
    ...record,
    id: String(record.id),
    title: String(record.title).trim(),
    description: String(record.description || ''),
    date: String(record.date),
    assigneeIds: Array.isArray(record.assigneeIds) ? [...new Set(record.assigneeIds.map(String).filter(Boolean))] : [],
    priority: Object.prototype.hasOwnProperty.call(WORK_PRIORITY, record.priority) ? record.priority : 'normal',
    status: Object.prototype.hasOwnProperty.call(WORK_STATUS, record.status) ? record.status : 'not_started',
    dueDate: String(record.dueDate || ''),
    outcome: String(record.outcome || '')
  };
}

function loadMechWorkPlans() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY_MECH_WORK_PLANS);
  } catch (error) {
    state.mechWorkPlans = [];
    showToast('Không đọc được Kế hoạch công việc Cơ điện từ bộ nhớ máy.', 'error');
    return state.mechWorkPlans;
  }
  if (!raw) {
    state.mechWorkPlans = [];
    return state.mechWorkPlans;
  }
  try {
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error('Dữ liệu kế hoạch không phải danh sách.');
    state.mechWorkPlans = records.map(normalizeWorkPlan).filter(Boolean);
  } catch (error) {
    state.mechWorkPlans = [];
    showToast('Dữ liệu Kế hoạch công việc Cơ điện bị lỗi, không thể nạp.', 'error');
  }
  return state.mechWorkPlans;
}

function saveMechWorkPlans() {
  try {
    localStorage.setItem(STORAGE_KEY_MECH_WORK_PLANS, JSON.stringify(state.mechWorkPlans || []));
  } catch (error) {
    showToast('Không lưu được Kế hoạch công việc Cơ điện vào bộ nhớ máy.', 'error');
    return false;
  }
  logDataChange(['mechWorkPlans']);
  firePushSync();
  renderMechCards();
  if (state.fileStorage.connected) {
    import('./storage.js').then(module => module.writeDataToFile()).catch(error => {
      console.error('[Cơ điện] Không ghi được dữ liệu vào file đã kết nối.', error);
      showToast('Đã lưu kế hoạch trên máy nhưng không ghi được vào file dữ liệu.', 'error');
    });
  }
  return true;
}

function mechanicEmployees(selectedIds) {
  const selected = new Set((selectedIds || []).map(String));
  return (state.hrEmployees || []).filter(employee => {
    if (!employee) return false;
    const department = String(employee.department || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
    return ((employee.status || 'active') === 'active' && department === 'co dien') ||
      selected.has(String(employee.id));
  });
}

function employeeName(id) {
  const employee = (state.hrEmployees || []).find(item => item && String(item.id) === String(id));
  return employee ? String(employee.name || employee.code || id) : 'Nhân viên không còn trong danh sách';
}

function minutesText(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  return `${hours}h${remainder ? String(remainder).padStart(2, '0') : ''}`;
}

function workDayHeading(date) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return formatDateDDMMYY(date);
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(parsed);
  return `${weekday.charAt(0).toLocaleUpperCase('vi-VN')}${weekday.slice(1)}, ${formatDateDDMMYY(date)}`;
}

function taskOvertimeInfo(employeeId, date) {
  const worktime = hrAssignmentWorktimeOf(employeeId, date);
  const forms = (state.hrOvertimes || []).filter(form =>
    form && String(form.employeeId) === String(employeeId) && String(form.date) === String(date));
  const statuses = [...new Set(forms.map(form => OVERTIME_STATUS[form.status] || 'Đã lập phiếu'))];
  return {
    ...worktime,
    formCount: forms.length,
    formStatus: statuses.join(' · '),
    missingForm: worktime.overtimeMin > 0 && forms.length === 0
  };
}

function workPlanMetrics() {
  const today = todayISO();
  const plans = state.mechWorkPlans || [];
  const openCount = plans.filter(plan => plan.status !== 'completed').length;
  const overdueCount = plans.filter(plan =>
    plan.status !== 'completed' && plan.dueDate && plan.dueDate < today).length;
  const missingForms = new Set();
  plans.forEach(plan => {
    (plan.assigneeIds || []).forEach(id => {
      const info = taskOvertimeInfo(id, plan.date);
      if (info.missingForm) missingForms.add(`${id}|${plan.date}`);
    });
  });
  return { openCount, overdueCount, missingOvertimeCount: missingForms.size };
}

function incidentMechMetrics(now = Date.now()) {
  const reports = state.x2IncidentReports || [];
  const hasRepair = report => (Array.isArray(report.repairAssigneeIds) && report.repairAssigneeIds.length > 0) ||
    !!(report.repairAssignedAt || report.repairStartedAt || report.repairDueAt || report.repairCompletedAt || report.repairOutcome);
  const notVerified = report => hasRepair(report) && report.repairStatus !== 'verified';
  return {
    pendingApproval: reports.filter(report => report && report.status === 'cho_duyet').length,
    repairOpen: reports.filter(report => report && notVerified(report)).length,
    repairOverdue: reports.filter(report => {
      if (!report || !notVerified(report) || !report.repairDueAt) return false;
      const due = Date.parse(report.repairDueAt);
      return Number.isFinite(due) && due < now;
    }).length
  };
}

function renderMechCards() {
  const workCount = document.getElementById('mech-work-plan-count');
  const incidentCount = document.getElementById('mech-incident-count');
  const workCard = document.getElementById('btn-open-mech-work-plan');
  const incidentCard = document.getElementById('btn-open-mech-incidents');
  if (workCount) {
    const metrics = workPlanMetrics();
    const warnings = metrics.overdueCount + metrics.missingOvertimeCount;
    workCount.textContent = `${metrics.openCount} việc mở · ${warnings} cảnh báo`;
    workCount.title = `${metrics.openCount} việc chưa hoàn thành · ${metrics.overdueCount} việc quá hạn · ${metrics.missingOvertimeCount} trường hợp có giờ tăng ca nhưng thiếu phiếu`;
    if (workCard) workCard.classList.toggle('mech-has-warning', warnings > 0);
  }
  if (incidentCount) {
    const metrics = incidentMechMetrics();
    const warnings = metrics.pendingApproval + metrics.repairOpen + metrics.repairOverdue;
    incidentCount.textContent = warnings
      ? `${metrics.pendingApproval} chờ duyệt · ${metrics.repairOpen} chưa nghiệm thu · ${metrics.repairOverdue} quá hạn`
      : 'Không có cảnh báo';
    incidentCount.title = `${metrics.pendingApproval} phiếu chờ duyệt · ${metrics.repairOpen} việc Cơ điện chưa nghiệm thu · ${metrics.repairOverdue} việc quá hạn`;
    if (incidentCard) incidentCard.classList.toggle('mech-has-warning', warnings > 0);
  }
  if (document.getElementById('modal-mech-work-plan')?.classList.contains('show')) renderMechWorkPlanList();
  return true;
}

function renderMechAssignees(task) {
  const ids = task.assigneeIds || [];
  if (!ids.length) return '<div class="mech-work-person muted">Chưa giao người phụ trách.</div>';
  return ids.map(id => {
    const info = taskOvertimeInfo(id, task.date);
    const periods = info.assignments.length
      ? info.assignments.map(row => `${escapeHTML(row.position)} ${escapeHTML(row.start || '—')}–${escapeHTML(row.end || '—')}`).join(' · ')
      : 'Chưa có bố trí trên Bảng phân bố vị trí HR';
    const overtimeBadge = info.missingForm
      ? '<span class="mech-warning-chip">Có giờ TC · chưa có phiếu</span>'
      : (info.overtimeMin > 0
        ? `<span class="mech-info-chip">Phiếu TC: ${escapeHTML(info.formStatus || 'Đã lập phiếu')}</span>`
        : '');
    return `<div class="mech-work-person">
      <strong>${escapeHTML(employeeName(id))}</strong>
      <span>${periods}</span>
      <span>Giờ theo HR: ${minutesText(info.regularMin)} HC · ${minutesText(info.overtimeMin)} TC</span>
      ${overtimeBadge}
    </div>`;
  }).join('');
}

function renderMechWorkPlanList() {
  const box = document.getElementById('mech-work-plan-list');
  const empty = document.getElementById('mech-work-plan-empty');
  if (!box) return false;
  const canEdit = canEditTab('qc');
  const allPlans = state.mechWorkPlans || [];
  const today = todayISO();
  const metrics = workPlanMetrics();
  const setSummary = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  };
  setSummary('mech-work-kpi-today', allPlans.filter(plan => plan.date === today).length);
  setSummary('mech-work-kpi-progress', allPlans.filter(plan => plan.status === 'in_progress').length);
  setSummary('mech-work-kpi-overdue', metrics.overdueCount);
  setSummary('mech-work-kpi-overtime', metrics.missingOvertimeCount);

  const dateFilter = String(document.getElementById('mech-work-date-filter')?.value || '');
  const statusFilter = String(document.getElementById('mech-work-status-filter')?.value || 'all');
  const plans = allPlans.filter(plan =>
    (!dateFilter || plan.date === dateFilter) &&
    (statusFilter === 'all' || plan.status === statusFilter));
  if (empty) empty.hidden = plans.length > 0;
  if (!plans.length && empty) {
    empty.textContent = allPlans.length
      ? 'Không có kế hoạch nào khớp ngày và trạng thái đang lọc.'
      : 'Chưa có kế hoạch công việc Cơ điện.';
  }
  const byDate = new Map();
  plans.forEach(plan => {
    if (!byDate.has(plan.date)) byDate.set(plan.date, []);
    byDate.get(plan.date).push(plan);
  });
  const priorityRank = { urgent: 4, high: 3, normal: 2, low: 1 };
  const statusRank = { in_progress: 0, not_started: 1, completed: 2 };
  const renderPlan = plan => {
    const overdue = plan.status !== 'completed' && plan.dueDate && plan.dueDate < todayISO();
    const actions = canEdit
      ? `<div class="mech-work-actions">
          <button type="button" class="btn btn-outline btn-sm" data-mech-act="edit" data-mech-id="${escapeHTML(plan.id)}"><i data-lucide="pencil"></i> Sửa</button>
          <button type="button" class="btn btn-outline btn-sm" data-mech-act="delete" data-mech-id="${escapeHTML(plan.id)}"><i data-lucide="trash-2"></i> Xóa</button>
        </div>`
      : '';
    return `<article class="mech-work-item priority-${escapeHTML(plan.priority)}${overdue ? ' is-overdue' : ''}">
      <div class="mech-work-head">
        <div class="mech-work-title-row"><h4>${escapeHTML(plan.title)}</h4>
          <span class="mech-work-priority priority-${escapeHTML(plan.priority)}">${escapeHTML(WORK_PRIORITY[plan.priority] || 'Bình thường')}</span>
          <span class="mech-work-status status-${escapeHTML(plan.status)}">${escapeHTML(WORK_STATUS[plan.status] || 'Chưa bắt đầu')}</span>
        </div>
      </div>
      ${plan.description ? `<p class="mech-work-description">${escapeHTML(plan.description)}</p>` : ''}
      <div class="mech-work-assignees">${renderMechAssignees(plan)}</div>
      <div class="mech-work-meta">
        <span>Hạn: ${plan.dueDate ? formatDateDDMMYY(plan.dueDate) : 'Chưa đặt'}${overdue ? ' · QUÁ HẠN' : ''}</span>
        ${plan.outcome ? `<span>Kết quả: ${escapeHTML(plan.outcome)}</span>` : ''}
      </div>
      ${actions}
    </article>`;
  };
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  box.innerHTML = dates.map(date => {
    const dayPlans = byDate.get(date).sort((a, b) =>
      (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0) ||
      (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3) ||
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    const openCount = dayPlans.filter(plan => plan.status !== 'completed').length;
    return `<section class="mech-work-day-card${date === today ? ' is-today' : ''}" aria-label="Kế hoạch ${escapeHTML(workDayHeading(date))}">
      <header class="mech-work-day-head">
        <div><h3>${escapeHTML(workDayHeading(date))}</h3>
          <span>${dayPlans.length} công việc · ${openCount} chưa hoàn thành</span>
        </div>
        ${date === today ? '<span class="mech-work-today-chip">Hôm nay</span>' : ''}
      </header>
      <div class="mech-work-day-list">${dayPlans.map(renderPlan).join('')}</div>
    </section>`;
  }).join('');
  initLucide();
  return true;
}

function shiftMechWorkPlanDate(offset) {
  const input = document.getElementById('mech-work-date-filter');
  if (!input) return false;
  const date = input.value ? new Date(`${input.value}T12:00:00`) : new Date();
  date.setDate(date.getDate() + Number(offset || 0));
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  input.value = date.toISOString().slice(0, 10);
  renderMechWorkPlanList();
  return true;
}

function setMechWorkPlanDateToday() {
  const input = document.getElementById('mech-work-date-filter');
  if (!input) return false;
  input.value = todayISO();
  renderMechWorkPlanList();
  return true;
}

function showAllMechWorkPlanDates() {
  const input = document.getElementById('mech-work-date-filter');
  if (!input) return false;
  input.value = '';
  renderMechWorkPlanList();
  return true;
}

function renderAssigneeOptions(selectedIds = []) {
  const select = document.getElementById('mech-work-assignees');
  if (!select) return;
  const selected = new Set(selectedIds.map(String));
  const employees = mechanicEmployees(selectedIds);
  select.innerHTML = employees.map(employee =>
    `<option value="${escapeHTML(employee.id)}"${selected.has(String(employee.id)) ? ' selected' : ''}>${escapeHTML(employee.name || employee.code || employee.id)}${employee.code ? ` (${escapeHTML(employee.code)})` : ''}</option>`
  ).join('');
  if (!employees.length) select.innerHTML = '<option value="" disabled>Chưa có nhân viên Cơ điện đang làm</option>';
}

function setWorkForm(plan = null) {
  editingWorkId = plan ? String(plan.id) : '';
  renderAssigneeOptions(plan ? plan.assigneeIds || [] : []);
  const values = {
    'mech-work-title': plan?.title || '',
    'mech-work-description': plan?.description || '',
    'mech-work-date': plan?.date || todayISO(),
    'mech-work-priority': plan?.priority || 'normal',
    'mech-work-status': plan?.status || 'not_started',
    'mech-work-due-date': plan?.dueDate || '',
    'mech-work-outcome': plan?.outcome || ''
  };
  Object.keys(values).forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = values[id];
  });
  const formTitle = document.getElementById('mech-work-form-title');
  if (formTitle) formTitle.textContent = editingWorkId ? 'Sửa kế hoạch công việc' : 'Thêm kế hoạch công việc';
  const form = document.getElementById('mech-work-plan-form');
  if (form) form.hidden = false;
  document.getElementById('mech-work-title')?.focus();
}

function openMechWorkPlan() {
  const modal = document.getElementById('modal-mech-work-plan');
  if (!modal) return false;
  const form = document.getElementById('mech-work-plan-form');
  if (form) form.hidden = true;
  const addButton = document.getElementById('btn-add-mech-work-plan');
  if (addButton) addButton.hidden = !canEditTab('qc');
  renderMechCards();
  renderMechWorkPlanList();
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  initLucide();
  return true;
}

function closeMechWorkPlan() {
  const modal = document.getElementById('modal-mech-work-plan');
  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
  cancelMechWorkPlanEdit();
  return true;
}

function startMechWorkPlan() {
  if (!canEditTab('qc')) return requireEditPermission();
  setWorkForm();
  document.getElementById('mech-work-plan-form')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  return true;
}

function cancelMechWorkPlanEdit() {
  editingWorkId = '';
  const form = document.getElementById('mech-work-plan-form');
  if (form) form.hidden = true;
  return true;
}

function handleMechWorkPlanSubmit(event) {
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
  if (!requireEditPermission()) return false;
  const value = id => String(document.getElementById(id)?.value || '').trim();
  const selectedAssignees = Array.from(document.getElementById('mech-work-assignees')?.selectedOptions || [])
    .map(option => String(option.value || '')).filter(Boolean);
  const title = value('mech-work-title');
  const date = value('mech-work-date');
  if (!title) { showToast('Nhập tên công việc Cơ điện.', 'error'); return false; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showToast('Chọn ngày thực hiện công việc.', 'error'); return false; }
  if (!selectedAssignees.length) { showToast('Chọn ít nhất một người phụ trách Cơ điện.', 'error'); return false; }
  const priority = value('mech-work-priority');
  const status = value('mech-work-status');
  if (!Object.prototype.hasOwnProperty.call(WORK_PRIORITY, priority) ||
      !Object.prototype.hasOwnProperty.call(WORK_STATUS, status)) {
    showToast('Mức ưu tiên hoặc trạng thái công việc không hợp lệ.', 'error');
    return false;
  }
  const now = new Date().toISOString();
  const patch = {
    title,
    description: value('mech-work-description'),
    date,
    assigneeIds: [...new Set(selectedAssignees)],
    priority,
    status,
    dueDate: value('mech-work-due-date'),
    outcome: value('mech-work-outcome'),
    updatedAt: now
  };
  const plans = state.mechWorkPlans || (state.mechWorkPlans = []);
  let saved;
  if (editingWorkId) {
    const idx = plans.findIndex(plan => plan && String(plan.id) === editingWorkId);
    if (idx < 0) { showToast('Không tìm thấy kế hoạch cần sửa (có thể đã bị xóa).', 'error'); return false; }
    saved = Object.assign({}, plans[idx], patch);
    plans[idx] = saved;
  } else {
    saved = Object.assign({
      id: `mech-work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now
    }, patch);
    plans.push(saved);
  }
  untrackDeleted('mechWorkPlans', saved.id);
  const wasEditing = !!editingWorkId;
  if (!saveMechWorkPlans()) return false;
  cancelMechWorkPlanEdit();
  renderMechWorkPlanList();
  showToast(wasEditing ? 'Đã cập nhật kế hoạch công việc Cơ điện.' : 'Đã thêm kế hoạch công việc Cơ điện.', 'success');
  return true;
}

function editMechWorkPlan(id) {
  const plan = (state.mechWorkPlans || []).find(record => record && String(record.id) === String(id));
  if (!plan) { showToast('Không tìm thấy kế hoạch công việc cần sửa.', 'error'); return false; }
  if (!requireEditPermission()) return false;
  setWorkForm(plan);
  document.getElementById('mech-work-plan-form')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  return true;
}

function deleteMechWorkPlan(id) {
  if (!requireEditPermission()) return false;
  const plans = state.mechWorkPlans || [];
  const idx = plans.findIndex(plan => plan && String(plan.id) === String(id));
  if (idx < 0) { showToast('Không tìm thấy kế hoạch công việc cần xóa.', 'error'); return false; }
  const plan = plans[idx];
  if (typeof confirm === 'function' && !confirm(`Xóa kế hoạch “${plan.title}” ngày ${formatDateDDMMYY(plan.date)}?`)) return false;
  plans.splice(idx, 1);
  trackDeleted('mechWorkPlans', plan.id);
  if (!saveMechWorkPlans()) return false;
  renderMechWorkPlanList();
  showToast('Đã xóa kế hoạch công việc Cơ điện.', 'info');
  return true;
}

function onMechWorkPlanListClick(event) {
  const target = event && event.target;
  if (!target || typeof target.closest !== 'function') return false;
  const button = target.closest('[data-mech-act]');
  if (!button) return false;
  const id = button.getAttribute('data-mech-id');
  if (button.getAttribute('data-mech-act') === 'edit') return editMechWorkPlan(id);
  if (button.getAttribute('data-mech-act') === 'delete') return deleteMechWorkPlan(id);
  return false;
}

export {
  WORK_PRIORITY,
  WORK_STATUS,
  deleteMechWorkPlan,
  handleMechWorkPlanSubmit,
  incidentMechMetrics,
  loadMechWorkPlans,
  minutesText,
  onMechWorkPlanListClick,
  openMechWorkPlan,
  renderMechCards,
  renderMechWorkPlanList,
  shiftMechWorkPlanDate,
  setMechWorkPlanDateToday,
  showAllMechWorkPlanDates,
  saveMechWorkPlans,
  startMechWorkPlan,
  taskOvertimeInfo,
  workPlanMetrics,
  closeMechWorkPlan,
  cancelMechWorkPlanEdit
};
