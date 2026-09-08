// ═══════════════════════════════════════════════════════════
// js/hr.js — TAB NHÂN SỰ (Quản lý nhân sự)
// ───────────────────────────────────────────────────────────
// Gồm:
//   1. DANH SÁCH NHÂN VIÊN (thông tin cơ sở, thêm/sửa/xóa, lọc theo bộ phận)
//   2. XIN NGHỈ PHÉP (gửi đơn; ban lãnh đạo (Admin/Ban Quản Lý) duyệt
//      Đồng ý / Không đồng ý)
//   3. THỐNG KÊ NGHỈ PHÉP + TOP NHÂN VIÊN THEO SỐ NGÀY NGHỈ
//   4. NHÂN SỰ CẦN — TUYỂN DỤNG (dữ liệu cho biểu đồ kiểm soát nhân sự)
// Lưu localStorage + đồng bộ mây (firePushSync) như các tab khác.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { canViewAdvanced } from './permissions.js';
import { STORAGE_KEY_HR_EMPLOYEES, STORAGE_KEY_HR_LEAVES, STORAGE_KEY_HR_RECRUITMENT, state } from './state.js';
import { escapeHTML, showToast } from './utils.js';

  // ─── HẰNG SỐ NHÂN SỰ ────────────────────────────────────────────
  // Bộ phận cố định theo mô hình nhà máy (ma trận vị trí làm việc
  // theo ngày sẽ được bổ sung ở giai đoạn sau trên nền này)
  const HR_DEPARTMENTS = ['Văn Phòng', 'QC', 'Cơ Điện', 'Xưởng 1', 'Xưởng 2', 'Lò Hơi'];
  const EMP_STATUS  = { active: 'Đang làm việc', pause: 'Tạm nghỉ', quit: 'Đã nghỉ việc' };
  const LEAVE_TYPES  = ['Nghỉ phép', 'Nghỉ không lương', 'Ốm', 'Việc gia đình', 'Khác'];
  const LEAVE_STATUS = { pending: 'Chờ duyệt', approved: 'Đồng ý', rejected: 'Không đồng ý' };
  const RECRUIT_STATUS = { open: 'Đang tuyển', done: 'Đã đủ người' };

  // Ban lãnh đạo = Admin & Ban Quản Lý (hoặc được cấp riêng) — duyệt đơn nghỉ
  function canApproveLeave() { return canViewAdvanced(); }

  // ─── LƯU / NẠP DỮ LIỆU ──────────────────────────────────────────
  function loadHrData() {
    try { state.hrEmployees  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_EMPLOYEES))  || []; } catch (e) { state.hrEmployees  = []; }
    try { state.hrLeaves     = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_LEAVES))     || []; } catch (e) { state.hrLeaves     = []; }
    try { state.hrRecruitment = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_RECRUITMENT)) || []; } catch (e) { state.hrRecruitment = []; }
  }

  function saveHrData() {
    localStorage.setItem(STORAGE_KEY_HR_EMPLOYEES, JSON.stringify(state.hrEmployees || []));
    localStorage.setItem(STORAGE_KEY_HR_LEAVES, JSON.stringify(state.hrLeaves || []));
    localStorage.setItem(STORAGE_KEY_HR_RECRUITMENT, JSON.stringify(state.hrRecruitment || []));
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── HELPERS ────────────────────────────────────────────────────
  function hrEmpById(id) { return (state.hrEmployees || []).find(e => e.id === id) || null; }
  function hrEmpName(id) { const e = hrEmpById(id); return e ? e.name : 'Nhân viên đã xóa'; }
  function hrEmpDept(id) { const e = hrEmpById(id); return e ? e.department : '—'; }
  function fmtDateDMY(iso) {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('-');
    return d && m ? `${d}/${m}/${y}` : iso;
  }
  // Số ngày nghỉ = số ngày từ "từ ngày" → "đến ngày" (gộp cả 2 đầu)
  function leaveDaysCount(from, to) {
    if (!from || !to || to < from) return 1;
    return Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  }

  // ─── RENDER TOÀN TAB ────────────────────────────────────────────
  function renderHrView() {
    populateHrSelects();
    renderHrEmployeesTable();
    renderHrLeavesTable();
    renderHrLeaveStats();
    renderHrRecruitmentTable();
    initLucide();
  }

  // Điền danh sách nhân viên vào select đơn nghỉ + select lọc bộ phận
  function populateHrSelects() {
    ['hr-emp-filter-dept', 'hr-recruit-filter-dept'].forEach(selId => {
      const sel = document.getElementById(selId);
      if (sel) sel.innerHTML = '<option value="all">Tất Cả Bộ Phận</option>' +
        HR_DEPARTMENTS.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
    });
  }

  // ─── 1) DANH SÁCH NHÂN VIÊN ──────────────────────────────────────
  function renderHrEmployeesTable() {
    const tbody = document.getElementById('hr-employees-body');
    if (!tbody) return;
    const dept   = document.getElementById('hr-emp-filter-dept')?.value || 'all';
    const status = document.getElementById('hr-emp-filter-status')?.value || 'all';
    const q      = (document.getElementById('hr-emp-search')?.value || '').trim().toLowerCase();

    const list = (state.hrEmployees || []).filter(e => {
      if (dept !== 'all' && e.department !== dept) return false;
      if (status !== 'all' && (e.status || 'active') !== status) return false;
      if (q) {
        const hay = `${e.name || ''} ${e.code || ''} ${e.phone || ''} ${e.position || ''} ${e.title || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const countEl = document.getElementById('hr-employees-count');
    if (countEl) countEl.textContent = `${list.length} / ${(state.hrEmployees || []).length} nhân viên`;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="users" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>${(state.hrEmployees || []).length ? 'Không có nhân viên nào khớp bộ lọc.' : 'Chưa có nhân viên nào. Bấm "Thêm Nhân Viên" để bắt đầu.'}</p></td></tr>`;
      initLucide();
      return;
    }

    tbody.innerHTML = list.map(e => {
      const st = e.status || 'active';
      const stCls = st === 'active' ? 'ok' : (st === 'pause' ? 'warn' : 'off');
      return `<tr>
        <td class="hr-emp-code">${escapeHTML(e.code || '—')}</td>
        <td><strong>${escapeHTML(e.name || '')}</strong></td>
        <td>${escapeHTML(e.gender || '—')}</td>
        <td>${fmtDateDMY(e.birthDate)}</td>
        <td>${escapeHTML(e.phone || '—')}</td>
        <td>${escapeHTML(e.department || '—')}</td>
        <td>${escapeHTML(e.position || '—')}</td>
        <td>${escapeHTML(e.title || '—')}</td>
        <td>${fmtDateDMY(e.joinDate)}</td>
        <td><span class="hr-chip ${stCls}">${EMP_STATUS[st]}</span></td>
        <td class="hr-notes" title="${escapeHTML(e.notes || '')}">${escapeHTML(e.notes || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrEditEmployee('${e.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteEmployee('${e.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function openEmployeeModal(id) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-employee');
    const form = document.getElementById('employee-form');
    if (!modal || !form) return;
    form.reset();
    const deptSel = document.getElementById('employee-department');
    if (deptSel) deptSel.innerHTML = hrDeptOptions();
    const titleEl = document.getElementById('employee-modal-title');

    if (id) {
      const e = hrEmpById(id);
      if (!e) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Nhân Viên: ${escapeHTML(e.name)}`;
      document.getElementById('employee-id').value = e.id;
      document.getElementById('employee-code').value = e.code || '';
      document.getElementById('employee-name').value = e.name || '';
      document.getElementById('employee-gender').value = e.gender || 'Nam';
      document.getElementById('employee-birth').value = e.birthDate || '';
      document.getElementById('employee-phone').value = e.phone || '';
      document.getElementById('employee-idcard').value = e.idCard || '';
      document.getElementById('employee-address').value = e.address || '';
      document.getElementById('employee-department').value = e.department || HR_DEPARTMENTS[0];
      document.getElementById('employee-position').value = e.position || '';
      document.getElementById('employee-title').value = e.title || '';
      document.getElementById('employee-joindate').value = e.joinDate || '';
      document.getElementById('employee-status').value = e.status || 'active';
      document.getElementById('employee-notes').value = e.notes || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="user-plus"></i> Thêm Nhân Viên Mới`;
      document.getElementById('employee-id').value = '';
      document.getElementById('employee-status').value = 'active';
      document.getElementById('employee-gender').value = 'Nam';
      document.getElementById('employee-code').value = `NV${String((state.hrEmployees || []).length + 1).padStart(3, '0')}`;
    }
    modal.classList.add('show');
    initLucide();
  }

  function closeEmployeeModal() {
    document.getElementById('modal-employee')?.classList.remove('show');
  }

  function handleEmployeeSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('employee-id').value;
    const name = document.getElementById('employee-name').value.trim();
    if (!name) { showToast('Họ và tên không được để trống!', 'error'); return; }

    const data = {
      id: id || `emp-${Date.now()}`,
      code: document.getElementById('employee-code').value.trim(),
      name,
      gender: document.getElementById('employee-gender').value,
      birthDate: document.getElementById('employee-birth').value,
      phone: document.getElementById('employee-phone').value.trim(),
      idCard: document.getElementById('employee-idcard').value.trim(),
      address: document.getElementById('employee-address').value.trim(),
      department: document.getElementById('employee-department').value,
      position: document.getElementById('employee-position').value.trim(),
      title: document.getElementById('employee-title').value.trim(),
      joinDate: document.getElementById('employee-joindate').value,
      status: document.getElementById('employee-status').value,
      notes: document.getElementById('employee-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };

    if (id) {
      const idx = state.hrEmployees.findIndex(x => x.id === id);
      if (idx !== -1) state.hrEmployees[idx] = { ...state.hrEmployees[idx], ...data };
      showToast(`Đã cập nhật nhân viên ${name}!`, 'success');
    } else {
      data.createdAt = new Date().toISOString();
      state.hrEmployees.push(data);
      showToast(`Đã thêm nhân viên ${name}!`, 'success');
    }
    saveHrData();
    closeEmployeeModal();
    renderHrView();
  }

  function deleteEmployee(id) {
    if (!requireEditPermission()) return;
    const e = hrEmpById(id);
    if (!e) return;
    if (!confirm(`Xóa nhân viên "${e.name}"? Các đơn nghỉ phép của người này cũng bị xóa.`)) return;
    state.hrEmployees = state.hrEmployees.filter(x => x.id !== id);
    state.hrLeaves = (state.hrLeaves || []).filter(l => l.employeeId !== id);
    saveHrData();
    renderHrView();
    showToast(`Đã xóa nhân viên ${e.name}`, 'info');
  }

  // ─── Ô GỢI Ý NHÂN VIÊN (COMBOBOX) TRONG FORM XIN NGHỈ PHÉP ──────
  // Gõ tên / mã NV / SĐT → lọc không phân biệt dấu → bấm chọn (hoặc ↑↓ Enter)
  function leaveEmployeeSuggestions(q) {
    const key = hrStripDiacritics(q);
    return (state.hrEmployees || [])
      .filter(e => (e.status || 'active') !== 'quit')
      .filter(e => !key || hrStripDiacritics(`${e.name} ${e.code} ${e.phone} ${e.department} ${e.position}`).includes(key))
      .slice(0, 30);
  }

  function renderLeaveEmployeeSuggestions() {
    const box = document.getElementById('leave-employee-suggest');
    if (!box) return;
    const list = leaveEmployeeSuggestions(document.getElementById('leave-employee')?.value || '');
    if (!list.length) {
      box.innerHTML = '<div class="hr-combobox-empty">Không tìm thấy nhân viên nào</div>';
      box.style.display = 'block';
      return;
    }
    box.innerHTML = list.map(e => `
      <div class="hr-combobox-item" data-emp-id="${escapeHTML(e.id)}">
        <strong>${escapeHTML(e.name)}</strong>
        <span class="hr-combobox-meta">${escapeHTML((e.code ? e.code + ' · ' : '') + (e.department || '') + (e.position ? ' · ' + e.position : ''))}</span>
      </div>`).join('');
    box.style.display = 'block';
  }

  function hideLeaveEmployeeSuggestions() {
    const box = document.getElementById('leave-employee-suggest');
    if (box) box.style.display = 'none';
  }

  // Chọn 1 nhân viên từ danh sách gợi ý
  function pickLeaveEmployee(id) {
    const e = hrEmpById(id);
    const input = document.getElementById('leave-employee');
    const hidden = document.getElementById('leave-employee-id');
    if (e && input) input.value = e.name;
    if (hidden) hidden.value = id;
    hideLeaveEmployeeSuggestions();
  }

  // Điều hướng bằng bàn phím: ↑↓ di chuyển, Enter chọn, Esc đóng
  function handleLeaveEmployeeKeydown(evt) {
    const box = document.getElementById('leave-employee-suggest');
    if (!box || box.style.display === 'none') return;
    const items = box.querySelectorAll ? Array.from(box.querySelectorAll('.hr-combobox-item')) : [];
    if (!items.length) return;
    let activeIdx = items.findIndex(it => it.classList && it.classList.contains('active'));
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      evt.preventDefault();
      const delta = evt.key === 'ArrowDown' ? 1 : -1;
      activeIdx = (activeIdx + delta + items.length) % items.length;
      items.forEach((it, i) => it.classList && it.classList.toggle('active', i === activeIdx));
      if (items[activeIdx] && items[activeIdx].scrollIntoView) items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (evt.key === 'Enter') {
      evt.preventDefault();
      const target = items[activeIdx >= 0 ? activeIdx : 0];
      if (target) pickLeaveEmployee(target.getAttribute('data-emp-id'));
    } else if (evt.key === 'Escape') {
      hideLeaveEmployeeSuggestions();
    }
  }

  // ─── 2) XIN NGHỈ PHÉP ────────────────────────────────────────────
  function renderHrLeavesTable() {
    const tbody = document.getElementById('hr-leaves-body');
    if (!tbody) return;
    const leaves = state.hrLeaves || [];
    const countEl = document.getElementById('hr-leaves-count');
    if (countEl) {
      const pending = leaves.filter(l => (l.status || 'pending') === 'pending').length;
      countEl.textContent = `${leaves.length} đơn (${pending} chờ duyệt)`;
    }
    if (!leaves.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="calendar-x" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có đơn xin nghỉ phép nào. Bấm "Xin Nghỉ Phép" để gửi đơn.</p></td></tr>`;
      initLucide();
      return;
    }
    const sorted = [...leaves].sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const approver = canApproveLeave();

    tbody.innerHTML = sorted.map(l => {
      const st = l.status || 'pending';
      const stCls = st === 'approved' ? 'ok' : (st === 'rejected' ? 'off' : 'warn');
      const actions = [];
      if (st === 'pending' && approver) {
        actions.push(`<button class="btn btn-success btn-sm" onclick="app.hrApproveLeave('${l.id}')" title="Duyệt Đồng ý"><i data-lucide="check"></i> Đồng Ý</button>`);
        actions.push(`<button class="btn btn-outline btn-sm" onclick="app.hrRejectLeave('${l.id}')" title="Không duyệt" style="color:var(--danger);"><i data-lucide="x"></i> Không Đồng Ý</button>`);
      }
      if (requireEditPermission() || approver) {
        actions.push(`<button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteLeave('${l.id}')" title="Xóa đơn" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>`);
      }
      return `<tr>
        <td><strong>${escapeHTML(hrEmpName(l.employeeId))}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(hrEmpDept(l.employeeId))}</span></td>
        <td>${escapeHTML(l.type || 'Nghỉ phép')}</td>
        <td>${fmtDateDMY(l.from)}</td>
        <td>${fmtDateDMY(l.to)}</td>
        <td><strong>${l.days || leaveDaysCount(l.from, l.to)}</strong> ngày</td>
        <td class="hr-notes" title="${escapeHTML(l.reason || '')}">${escapeHTML(l.reason || '—')}</td>
        <td><span class="hr-chip ${stCls}">${LEAVE_STATUS[st]}</span>${l.approvedBy ? `<br><span style="font-size:0.68rem;color:var(--text-muted);">bởi ${escapeHTML(l.approvedBy)}</span>` : ''}</td>
        <td class="text-right"><div style="display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap;">${actions.join('')}</div></td>
      </tr>`;
    }).join('');
  }

  function openLeaveModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-leave');
    const form = document.getElementById('leave-form');
    if (!modal || !form) return;
    form.reset();
    if (!(state.hrEmployees || []).length) {
      showToast('Chưa có nhân viên nào — thêm nhân viên trước khi xin nghỉ phép!', 'error');
      return;
    }
    const typeSel = document.getElementById('leave-type');
    if (typeSel) typeSel.innerHTML = LEAVE_TYPES.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('leave-from').value = today;
    document.getElementById('leave-to').value = today;
    // Xóa nội dung ô tìm kiếm nhân viên + ẩn gợi ý
    const empInput = document.getElementById('leave-employee');
    if (empInput) empInput.value = '';
    const empHidden = document.getElementById('leave-employee-id');
    if (empHidden) empHidden.value = '';
    hideLeaveEmployeeSuggestions();
    modal.classList.add('show');
    initLucide();
  }

  function closeLeaveModal() {
    document.getElementById('modal-leave')?.classList.remove('show');
  }

  function handleLeaveSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    // Nhân viên: ưu tiên id đã chọn từ gợi ý; nếu gõ tay mà trùng khớp đúng 1 tên thì chấp nhận
    const empInput = (document.getElementById('leave-employee')?.value || '').trim();
    let employeeId = document.getElementById('leave-employee-id')?.value || '';
    if (!employeeId && empInput) {
      const exact = (state.hrEmployees || []).filter(x =>
        (x.status || 'active') !== 'quit' && x.name.toLowerCase() === empInput.toLowerCase());
      if (exact.length === 1) employeeId = exact[0].id;
    }
    if (!employeeId) { showToast('Vui lòng gõ tên và chọn nhân viên từ danh sách gợi ý!', 'error'); return; }
    const type = document.getElementById('leave-type').value;
    const from = document.getElementById('leave-from').value;
    const to = document.getElementById('leave-to').value;
    const reason = document.getElementById('leave-reason').value.trim();
    if (!employeeId) { showToast('Vui lòng chọn nhân viên!', 'error'); return; }
    if (!from || !to) { showToast('Vui lòng chọn ngày nghỉ (từ ngày → đến ngày)!', 'error'); return; }
    if (to < from) { showToast('"Đến ngày" không được trước "Từ ngày"!', 'error'); return; }

    state.hrLeaves.push({
      id: `leave-${Date.now()}`,
      employeeId, type, from, to,
      days: leaveDaysCount(from, to),
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    saveHrData();
    closeLeaveModal();
    renderHrView();
    showToast(`Đã gửi đơn nghỉ ${leaveDaysCount(from, to)} ngày cho ${hrEmpName(employeeId)} — chờ ban lãnh đạo duyệt`, 'success');
  }

  // Ban lãnh đạo duyệt: Đồng ý / Không đồng ý (chỉ đơn đang chờ)
  function approveLeave(id) {
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý (ban lãnh đạo) mới được duyệt đơn nghỉ phép!', 'error');
      return;
    }
    const l = (state.hrLeaves || []).find(x => x.id === id);
    if (!l || (l.status || 'pending') !== 'pending') return;
    l.status = 'approved';
    l.approvedBy = state.currentUser?.fullname || state.currentUser?.email || 'Ban lãnh đạo';
    l.approvedAt = new Date().toISOString();
    saveHrData();
    renderHrView();
    showToast(`Đã ĐỒNG Ý đơn nghỉ của ${hrEmpName(l.employeeId)} (${l.days} ngày)`, 'success');
  }

  function rejectLeave(id) {
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý (ban lãnh đạo) mới được duyệt đơn nghỉ phép!', 'error');
      return;
    }
    const l = (state.hrLeaves || []).find(x => x.id === id);
    if (!l || (l.status || 'pending') !== 'pending') return;
    l.status = 'rejected';
    l.approvedBy = state.currentUser?.fullname || state.currentUser?.email || 'Ban lãnh đạo';
    l.approvedAt = new Date().toISOString();
    saveHrData();
    renderHrView();
    showToast(`Đã KHÔNG ĐỒNG Ý đơn nghỉ của ${hrEmpName(l.employeeId)}`, 'info');
  }

  function deleteLeave(id) {
    if (!requireEditPermission() && !canApproveLeave()) return;
    state.hrLeaves = (state.hrLeaves || []).filter(l => l.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa đơn nghỉ phép', 'info');
  }

  // ─── 3) THỐNG KÊ NGHỈ PHÉP + TOP NGHỈ ────────────────────────────
  // Chỉ tính đơn ĐÃ ĐƯỢC DUYỆT (Đồng ý) — thống kê theo từng nhân viên,
  // sắp xếp giảm dần theo số ngày nghỉ = bảng xếp hạng (TOP).
  function computeLeaveStats() {
    const stats = {}; // employeeId -> { name, dept, times, days }
    (state.hrLeaves || []).forEach(l => {
      if ((l.status || 'pending') !== 'approved') return;
      if (!stats[l.employeeId]) {
        stats[l.employeeId] = { name: hrEmpName(l.employeeId), dept: hrEmpDept(l.employeeId), times: 0, days: 0 };
      }
      stats[l.employeeId].times += 1;
      stats[l.employeeId].days += (l.days || leaveDaysCount(l.from, l.to));
    });
    return Object.values(stats).sort((a, b) => b.days - a.days);
  }

  function renderHrLeaveStats() {
    const stats = computeLeaveStats();
    const approved = stats.reduce((s, x) => s + x.times, 0);
    const totalDays = stats.reduce((s, x) => s + x.days, 0);
    const pending = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;

    const chipsEl = document.getElementById('hr-leave-stat-chips');
    if (chipsEl) {
      chipsEl.innerHTML = `
        <span class="hr-stat-chip"><i data-lucide="calendar-x"></i> Đã duyệt: <strong>${approved} đơn</strong></span>
        <span class="hr-stat-chip"><i data-lucide="clock"></i> Chờ duyệt: <strong>${pending} đơn</strong></span>
        <span class="hr-stat-chip"><i data-lucide="hourglass"></i> Tổng ngày nghỉ: <strong>${totalDays} ngày</strong></span>`;
    }

    const tbody = document.getElementById('hr-leave-stats-body');
    if (!tbody) return;
    if (!stats.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:22px;color:var(--text-muted);">Chưa có đơn nghỉ nào được duyệt.</td></tr>`;
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    tbody.innerHTML = stats.map((s, i) => `<tr>
        <td><strong>${medals[i] || '#' + (i + 1)}</strong></td>
        <td><strong>${escapeHTML(s.name)}</strong></td>
        <td>${escapeHTML(s.dept)}</td>
        <td>${s.times} lần</td>
        <td><strong>${s.days}</strong> ngày</td>
      </tr>`).join('');
  }

  // ─── 4) NHÂN SỰ CẦN — TUYỂN DỤNG ────────────────────────────────
  // Dữ liệu cho biểu đồ kiểm soát mảng nhân sự (tích hợp sau).
  function renderHrRecruitmentTable() {
    const tbody = document.getElementById('hr-recruit-body');
    if (!tbody) return;
    const dept = document.getElementById('hr-recruit-filter-dept')?.value || 'all';
    const list = (state.hrRecruitment || []).filter(r => dept === 'all' || r.department === dept);

    const countEl = document.getElementById('hr-recruit-count');
    if (countEl) {
      const can = (state.hrRecruitment || []).reduce((s, r) => s + (r.needQty || 0), 0);
      const hired = (state.hrRecruitment || []).reduce((s, r) => s + (r.hiredQty || 0), 0);
      countEl.textContent = `Cần ${can} — đã tuyển ${hired} — còn thiếu ${Math.max(0, can - hired)} (đang tuyển ${list.filter(r => (r.status || 'open') === 'open').length} vị trí)`;
    }

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:22px;color:var(--text-muted);">
        <i data-lucide="user-search" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có nhu cầu tuyển dụng nào. Bấm "Nhân Sự Cần" để thêm.</p></td></tr>`;
      initLucide();
      return;
    }

    tbody.innerHTML = [...list].sort((a, b) =>
      String(a.department || '').localeCompare(String(b.department || ''), 'vi')).map(r => {
      const missing = Math.max(0, (r.needQty || 0) - (r.hiredQty || 0));
      const st = r.status || 'open';
      return `<tr>
        <td>${escapeHTML(r.department || '—')}</td>
        <td><strong>${escapeHTML(r.position || '—')}</strong></td>
        <td>${r.needQty || 0}</td>
        <td>${r.hiredQty || 0}</td>
        <td><strong style="color:${missing > 0 ? 'var(--danger)' : '#16a34a'};">${missing}</strong></td>
        <td>${fmtDateDMY(r.needDate)}</td>
        <td><span class="hr-chip ${st === 'open' ? 'warn' : 'ok'}">${RECRUIT_STATUS[st]}</span></td>
        <td class="hr-notes" title="${escapeHTML(r.notes || '')}">${escapeHTML(r.notes || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrEditRecruitment('${r.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteRecruitment('${r.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function openRecruitmentModal(id) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-recruitment');
    const form = document.getElementById('recruitment-form');
    if (!modal || !form) return;
    form.reset();
    const deptSel = document.getElementById('recruit-department');
    if (deptSel) deptSel.innerHTML = HR_DEPARTMENTS.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
    const titleEl = document.getElementById('recruitment-modal-title');

    if (id) {
      const r = (state.hrRecruitment || []).find(x => x.id === id);
      if (!r) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Nhu Cầu: ${escapeHTML(r.position || '')}`;
      document.getElementById('recruit-id').value = r.id;
      document.getElementById('recruit-department').value = r.department || HR_DEPARTMENTS[0];
      document.getElementById('recruit-position').value = r.position || '';
      document.getElementById('recruit-need').value = r.needQty || 1;
      document.getElementById('recruit-hired').value = r.hiredQty || 0;
      document.getElementById('recruit-needdate').value = r.needDate || '';
      document.getElementById('recruit-status').value = r.status || 'open';
      document.getElementById('recruit-notes').value = r.notes || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="user-search"></i> Thêm Nhu Cầu Nhân Sự`;
      document.getElementById('recruit-id').value = '';
      document.getElementById('recruit-need').value = 1;
      document.getElementById('recruit-hired').value = 0;
      document.getElementById('recruit-status').value = 'open';
    }
    modal.classList.add('show');
    initLucide();
  }

  function closeRecruitmentModal() {
    document.getElementById('modal-recruitment')?.classList.remove('show');
  }

  function handleRecruitmentSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('recruit-id').value;
    const position = document.getElementById('recruit-position').value.trim();
    const needQty = parseInt(document.getElementById('recruit-need').value) || 0;
    if (!position) { showToast('Vị trí tuyển không được để trống!', 'error'); return; }
    if (needQty <= 0) { showToast('Số người cần phải lớn hơn 0!', 'error'); return; }

    const data = {
      id: id || `rec-${Date.now()}`,
      department: document.getElementById('recruit-department').value,
      position,
      needQty,
      hiredQty: parseInt(document.getElementById('recruit-hired').value) || 0,
      needDate: document.getElementById('recruit-needdate').value,
      status: document.getElementById('recruit-status').value,
      notes: document.getElementById('recruit-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (id) {
      const idx = state.hrRecruitment.findIndex(x => x.id === id);
      if (idx !== -1) state.hrRecruitment[idx] = { ...state.hrRecruitment[idx], ...data };
      showToast(`Đã cập nhật nhu cầu tuyển "${position}"!`, 'success');
    } else {
      data.createdAt = new Date().toISOString();
      state.hrRecruitment.push(data);
      showToast(`Đã thêm nhu cầu tuyển "${position}"!`, 'success');
    }
    saveHrData();
    closeRecruitmentModal();
    renderHrView();
  }

  function deleteRecruitment(id) {
    if (!requireEditPermission()) return;
    state.hrRecruitment = (state.hrRecruitment || []).filter(r => r.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa nhu cầu tuyển dụng', 'info');
  }


  // ─── NHẬP NHÂN VIÊN TỪ FILE EXCEL ──────────────────────────────
  // Đọc file .xlsx/.xls/.csv → tự nhận cột theo tiêu đề → xem trước &
  // đổi ánh xạ cột → nhập: thêm mới tất cả HOẶC cập nhật theo Mã NV.
  const EMPLOYEE_IMPORT_FIELDS = [
    { key: 'code',       label: 'Mã NV',        hints: ['ma nv', 'ma nhan vien', 'manv', 'code', 'staff code', 'ma so', 'msnv'] },
    { key: 'name',       label: 'Họ và Tên',    hints: ['ho va ten', 'ho ten', 'ten nhan vien', 'full name', 'ho ten nv'] },
    { key: 'gender',     label: 'Giới Tính',    hints: ['gioi tinh', 'gender', 'gt'] },
    { key: 'birthDate',  label: 'Ngày Sinh',    hints: ['ngay sinh', 'nam sinh', 'birthday'] },
    { key: 'phone',      label: 'SĐT',          hints: ['sdt', 'so dien thoai', 'dien thoai', 'phone', 'mobile'] },
    { key: 'idCard',     label: 'CCCD / CMND',  hints: ['cccd', 'cmnd', 'so cccd', 'cmt', 'can cuoc'] },
    { key: 'address',    label: 'Địa Chỉ',       hints: ['dia chi', 'address', 'noi o', 'que quan'] },
    { key: 'department', label: 'Bộ Phận',       hints: ['bo phan', 'phong ban', 'department', 'xuong'] },
    { key: 'position',   label: 'Vị Trí',       hints: ['vi tri', 'chuc danh', 'position', 'cong viec'] },
    { key: 'title',      label: 'Chức Vụ',       hints: ['chuc vu', 'title', 'cap bac'] },
    { key: 'joinDate',   label: 'Ngày Vào Làm',  hints: ['ngay vao lam', 'ngay vao', 'ngay tuyen', 'ngay bat dau', 'join date', 'ngay vao cty'] },
    { key: 'status',     label: 'Trạng Thái',    hints: ['trang thai', 'status', 'tinh trang'] },
    { key: 'notes',      label: 'Ghi Chú',       hints: ['ghi chu', 'note', 'notes', 'remark', 'dien giai'] }
  ];

  // Bỏ dấu tiếng Việt + lowercase để so khớp tiêu đề cột
  function hrStripDiacritics(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  }

  // Tự ánh xạ 1 tiêu đề cột → trường nhân viên (tránh trùng trường đã dùng)
  function autoMapEmployeeField(headerText, usedKeys) {
    const t = hrStripDiacritics(headerText);
    if (!t) return null;
    for (const f of EMPLOYEE_IMPORT_FIELDS) {
      if (usedKeys.has(f.key)) continue;
      if (f.hints.some(h => t === h || t.includes(h))) return f.key;
    }
    return null;
  }

  function hrPad2(n) { return String(n).padStart(2, '0'); }

  // Chuẩn hóa ngày về yyyy-MM-dd: nhận Date, số serial Excel, dd/MM/yyyy, yyyy-MM-dd...
  function hrNormDate(v) {
    if (v === undefined || v === null || v === '') return '';
    if (v instanceof Date && !isNaN(v.getTime())) {
      return `${v.getFullYear()}-${hrPad2(v.getMonth() + 1)}-${hrPad2(v.getDate())}`;
    }
    if (typeof v === 'number' && isFinite(v)) {
      // Excel serial date (mốc 1899-12-30, theo UTC để không lệch ngày theo múi giờ)
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
      return `${d.getUTCFullYear()}-${hrPad2(d.getUTCMonth() + 1)}-${hrPad2(d.getUTCDate())}`;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);   // yyyy-MM-dd
    if (m) return `${m[1]}-${hrPad2(m[2])}-${hrPad2(m[3])}`;
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);        // dd/MM/yyyy
    if (m) return `${m[3]}-${hrPad2(m[2])}-${hrPad2(m[1])}`;
    return '';
  }

  function hrNormGender(v) {
    const t = hrStripDiacritics(v);
    if (!t) return 'Nam';
    if (t.startsWith('nu') || t.includes('female') || t === 'f') return 'Nữ';
    return 'Nam';
  }

  function hrNormStatus(v) {
    const t = hrStripDiacritics(v);
    if (!t) return 'active';
    if (t.includes('tam nghi')) return 'pause';
    if (t.includes('nghi viec') || t.includes('da nghi')) return 'quit';
    return 'active';
  }

  // Chuẩn hóa bộ phận về 1 trong 6 bộ phận chuẩn; không khớp thì giữ nguyên tên gốc
  function hrNormDept(v) {
    const raw = String(v || '').trim();
    const t = hrStripDiacritics(raw);
    if (!t) return HR_DEPARTMENTS[0];
    if (t.includes('van phong')) return 'Văn Phòng';
    if (t.includes('qc') || t.includes('chat luong')) return 'QC';
    if (t.includes('co dien')) return 'Cơ Điện';
    if (t.includes('lo hoi')) return 'Lò Hơi';
    if (t.includes('xuong 1') || t === 'x1') return 'Xưởng 1';
    if (t.includes('xuong 2') || t === 'x2') return 'Xưởng 2';
    return raw;
  }

  // Danh sách tùy chọn Bộ Phận: 6 bộ phận chuẩn + các bộ phận có sẵn trong dữ liệu
  function hrDeptOptions() {
    const extra = [...new Set((state.hrEmployees || []).map(e => (e.department || '').trim()).filter(Boolean))]
      .filter(d => !HR_DEPARTMENTS.includes(d));
    return [...HR_DEPARTMENTS, ...extra].map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
  }

  // ── Luồng nhập: chọn file → đọc sheet → tự ánh xạ cột → xem trước → nhập
  let employeeImportSheet = null; // { aoa, mapping, fileName }

  function openEmployeeImportModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-employee-import');
    if (!modal) return;
    employeeImportSheet = null;
    const fileInput = document.getElementById('employee-import-file');
    if (fileInput) fileInput.value = '';
    const box = document.getElementById('emp-import-mapping-box');
    if (box) box.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;margin:0;">Chưa chọn file — bấm chọn file Excel để hệ thống đọc tiêu đề cột và tự ánh xạ.</p>';
    const doBtn = document.getElementById('btn-do-employee-import');
    if (doBtn) doBtn.disabled = true;
    modal.classList.add('show');
    initLucide();
  }

  function closeEmployeeImportModal() {
    document.getElementById('modal-employee-import')?.classList.remove('show');
  }

  function handleEmployeeImportFile(e) {
    const file = e && e.target && e.target.files && e.target.files[0];
    if (!file) return;
    if (!window.XLSX) { showToast('Thư viện đọc Excel chưa sẵn sàng. Kiểm tra kết nối mạng!', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { showToast('File không có sheet dữ liệu!', 'error'); return; }
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
        // Dòng tiêu đề = dòng đầu tiên có ≥2 ô không trống (tránh dòng tiêu đề trang trí)
        let headerIdx = 0;
        for (let i = 0; i < Math.min(aoa.length, 10); i++) {
          const filled = (aoa[i] || []).filter(c => String(c || '').trim() !== '').length;
          if (filled >= 2) { headerIdx = i; break; }
        }
        const headers = (aoa[headerIdx] || []).map(c => String(c || '').trim());
        const rows = aoa.slice(headerIdx + 1).filter(r => (r || []).some(c => String(c || '').trim() !== ''));
        if (!rows.length) { showToast('File không có dòng dữ liệu nào!', 'error'); return; }
        // Tự ánh xạ cột theo tiêu đề
        const mapping = {};
        const used = new Set();
        headers.forEach((h, col) => {
          const key = h ? autoMapEmployeeField(h, used) : null;
          mapping[col] = key;
          if (key) used.add(key);
        });
        employeeImportSheet = { aoa: [headers, ...rows], mapping, fileName: file.name };
        renderEmployeeImportMapping(headers, rows, mapping);
        const doBtn = document.getElementById('btn-do-employee-import');
        if (doBtn) doBtn.disabled = false;
        showToast(`Đã đọc ${rows.length} dòng từ "${file.name}" — kiểm tra ánh xạ cột rồi bấm Nhập`, 'success');
      } catch (err) {
        showToast('Không đọc được file Excel: ' + (err && err.message), 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function renderEmployeeImportMapping(headers, rows, mapping) {
    const box = document.getElementById('emp-import-mapping-box');
    if (!box) return;
    const fieldOptions = '<option value="">-- Bỏ qua --</option>' +
      EMPLOYEE_IMPORT_FIELDS.map(f => `<option value="${f.key}">${escapeHTML(f.label)}</option>`).join('');
    const mapRows = headers.map((h, col) => `
      <tr>
        <td><strong>${escapeHTML(h || ('Cột ' + (col + 1)))}</strong></td>
        <td><select data-import-col="${col}">${fieldOptions}</select></td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(String((rows[0] || [])[col] || ''))}">${escapeHTML(String((rows[0] || [])[col] || ''))}</td>
      </tr>`).join('');
    box.innerHTML = `
      <p style="font-size:0.78rem; margin:0 0 8px; font-weight:700;">Ánh xạ cột file Excel → trường nhân viên</p>
      <div class="table-responsive" style="max-height:260px; border:1px solid var(--border-color); border-radius:var(--radius-md);">
        <table class="data-table">
          <thead><tr><th>Cột trong file</th><th>Trường nhân viên</th><th>Ví dụ (dòng đầu)</th></tr></thead>
          <tbody>${mapRows}</tbody>
        </table>
      </div>`;
    // Gán giá trị tự ánh xạ vào từng select
    Object.keys(mapping).forEach(col => {
      const sel = box.querySelector(`select[data-import-col="${col}"]`);
      if (sel) sel.value = mapping[col] || '';
    });
  }

  // Nhập toàn bộ sheet vào state theo ánh xạ + chế độ.
  // mode 'add': thêm mới tất cả; 'upsert': trùng Mã NV thì cập nhật, thiếu thì thêm.
  // Trả về { added, updated, skipped }.
  function importEmployeesFromSheet(aoa, mapping, mode) {
    const result = { added: 0, updated: 0, skipped: 0 };
    // mapping từ UI dạng { colIndex: fieldKey } → đảo thành { fieldKey: colIndex }
    const colByField = {};
    Object.keys(mapping).forEach(col => {
      const f = mapping[col];
      if (f) colByField[f] = parseInt(col, 10);
    });
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row || !row.length) continue;
      const get = field => {
        const col = colByField[field];
        return (col === undefined || col === null) ? '' : row[col];
      };
      const name = String(get('name') || '').trim();
      if (!name) { result.skipped++; continue; }
      const emp = {
        code: String(get('code') || '').trim(),
        name,
        gender: hrNormGender(get('gender')),
        birthDate: hrNormDate(get('birthDate')),
        phone: String(get('phone') || '').trim(),
        idCard: String(get('idCard') || '').trim(),
        address: String(get('address') || '').trim(),
        department: hrNormDept(get('department')),
        position: String(get('position') || '').trim(),
        title: String(get('title') || '').trim(),
        joinDate: hrNormDate(get('joinDate')),
        status: hrNormStatus(get('status')),
        notes: String(get('notes') || '').trim(),
        updatedAt: new Date().toISOString()
      };
      const codeKey = emp.code.toLowerCase();
      const idx = codeKey
        ? (state.hrEmployees || []).findIndex(e => String(e.code || '').trim().toLowerCase() === codeKey)
        : -1;
      if (mode === 'upsert' && idx !== -1) {
        state.hrEmployees[idx] = { ...state.hrEmployees[idx], ...emp, id: state.hrEmployees[idx].id };
        result.updated++;
      } else {
        emp.id = `emp-${Date.now()}-${r}`;
        emp.createdAt = new Date().toISOString();
        state.hrEmployees.push(emp);
        result.added++;
      }
    }
    return result;
  }

  // Bấm "Nhập Dữ Liệu": đọc lại ánh xạ + chế độ rồi nhập vào state
  function doEmployeeImport() {
    if (!requireEditPermission()) return;
    if (!employeeImportSheet) return;
    const mapping = {};
    document.querySelectorAll('#emp-import-mapping-box select[data-import-col]').forEach(sel => {
      mapping[parseInt(sel.getAttribute('data-import-col'), 10)] = sel.value || null;
    });
    const upsertEl = document.getElementById('emp-import-mode-upsert');
    const mode = (upsertEl && upsertEl.checked) ? 'upsert' : 'add';
    const fileName = employeeImportSheet.fileName;
    const res = importEmployeesFromSheet(employeeImportSheet.aoa, mapping, mode);
    saveHrData();
    closeEmployeeImportModal();
    renderHrView();
    showToast(`Nhập xong từ "${fileName}": thêm mới ${res.added}, cập nhật ${res.updated}, bỏ qua ${res.skipped} dòng thiếu tên`,
      (res.added + res.updated) > 0 ? 'success' : 'info');
  }

export {
  HR_DEPARTMENTS,
  autoMapEmployeeField,
  approveLeave,
  canApproveLeave,
  closeEmployeeImportModal,
  closeEmployeeModal,
  closeLeaveModal,
  closeRecruitmentModal,
  computeLeaveStats,
  deleteEmployee,
  deleteLeave,
  deleteRecruitment,
  doEmployeeImport,
  handleEmployeeImportFile,
  handleEmployeeSubmit,
  handleLeaveEmployeeKeydown,
  handleLeaveSubmit,
  handleRecruitmentSubmit,
  hideLeaveEmployeeSuggestions,
  importEmployeesFromSheet,
  leaveEmployeeSuggestions,
  loadHrData,
  openEmployeeImportModal,
  openEmployeeModal,
  openLeaveModal,
  openRecruitmentModal,
  pickLeaveEmployee,
  renderLeaveEmployeeSuggestions,
  rejectLeave,
  renderHrView
};
