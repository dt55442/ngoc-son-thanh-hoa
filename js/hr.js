// ═══════════════════════════════════════════════════════════
// js/hr.js — TAB NHÂN SỰ (Quản lý nhân sự)
// ───────────────────────────────────────────────────────────
// Gồm:
//   1. DANH SÁCH NHÂN VIÊN (thông tin cơ sở, thêm/sửa/xóa, lọc theo bộ phận,
//      kỹ năng — các vị trí có thể làm)
//   2. XIN NGHỈ PHÉP (gửi đơn; ban lãnh đạo (Admin/Ban Quản Lý) duyệt
//      Đồng ý / Không đồng ý)
//   3. THỐNG KÊ NGHỈ PHÉP + TOP NHÂN VIÊN THEO SỐ NGÀY NGHỈ
//   4. NHÂN SỰ CẦN — TUYỂN DỤNG (dữ liệu cho biểu đồ kiểm soát nhân sự)
//   5. CHẤM CÔNG & PHÂN VỊ THEO NGÀY (đi làm / vắng; "nghỉ có phép" suy ra
//      từ đơn nghỉ ĐÃ DUYỆT; phân vị trí theo kỹ năng từng người)
//   6. VỊ TRÍ LÀM VIỆC & KỸ NĂNG (danh mục vị trí; mỗi NV 1-nhiều vị trí)
//   7. THỐNG KÊ ĐI LÀM THEO THÁNG (ngày công, nghỉ phép, vắng, tỷ lệ đi làm)
// Lưu localStorage + đồng bộ mây (firePushSync) như các tab khác.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { trackDeleted } from './tombstone.js';
import { logDataChange } from './history.js';
import { STORAGE_KEY_HR_EMPLOYEES, STORAGE_KEY_HR_LEAVES, STORAGE_KEY_HR_RECRUITMENT, STORAGE_KEY_HR_POSNEEDS, STORAGE_KEY_HR_SHIFTS, STORAGE_KEY_HR_ASSIGN, STORAGE_KEY_HR_POSITIONS, STORAGE_KEY_HR_ATTENDANCE, STORAGE_KEY_HR_CHECKINS, STORAGE_KEY_HR_CI_ACKS, STORAGE_KEY_HR_OVERTIMES, STORAGE_KEY_HR_CALENDAR, state } from './state.js';
import { escapeHTML, showToast } from './utils.js';
import { hideTreLoading, showTreLoading } from './loading.js'; // LOADING nông dân chặt tre — che lúc đọc file Excel

  // ─── HẰNG SỐ NHÂN SỰ ────────────────────────────────────────────
  // Bộ phận cố định theo mô hình nhà máy — thứ tự này cũng dùng để SẮP XẾP
  // nhóm bộ phận trên bảng chấm công (Văn Phòng -> Cơ Điện -> QC -> Xưởng 1 -> Xưởng 2)
  const HR_DEPARTMENTS = ['Văn Phòng', 'Cơ Điện', 'QC', 'Xưởng 1', 'Xưởng 2', 'Lò Hơi'];
  const EMP_STATUS  = { active: 'Đang làm việc', pause: 'Tạm nghỉ', quit: 'Đã nghỉ việc' };
  const LEAVE_TYPES  = ['Nghỉ phép', 'Nghỉ chờ việc', 'Nghỉ không lương', 'Ốm', 'Việc gia đình', 'Khác'];
  const LEAVE_STATUS = { pending: 'Chờ duyệt', approved: 'Đồng ý', rejected: 'Không đồng ý' };
  const RECRUIT_STATUS = { open: 'Đang tuyển', done: 'Đã đủ người' };
  // Chấm công thủ công: đi làm / vắng. Riêng "Nghỉ có phép" KHÔNG lưu trùng —
  // suy ra trực tiếp từ đơn nghỉ đã duyệt (xem approvedLeaveOn).
  const ATT_STATUS = { work: 'Đi làm', absent: 'Vắng (không phép)' };

  // Duyệt/xóa đơn nghỉ: CHỈ Admin & Ban Quản Lý — xét theo VAI TRÒ (trước đây
  // dựa trên quyền "xem vùng nâng cao" nên editor được cấp riêng vẫn duyệt được).
  // Editor dù được cấp tab Nhân Sự cũng chỉ được TẠO đơn mới, không được duyệt/xóa.
  function canApproveLeave() {
    const role = state.currentUser ? state.currentUser.role : null;
    return role === 'admin' || role === 'manager';
  }

  // ─── LƯU / NẠP DỮ LIỆU ──────────────────────────────────────────
  function loadHrData() {
    try { state.hrEmployees  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_EMPLOYEES))  || []; } catch (e) { state.hrEmployees  = []; }
    try { state.hrLeaves     = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_LEAVES))     || []; } catch (e) { state.hrLeaves     = []; }
    try { state.hrRecruitment = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_RECRUITMENT)) || []; } catch (e) { state.hrRecruitment = []; }
    try { state.hrPositionNeeds = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_POSNEEDS)) || []; } catch (e) { state.hrPositionNeeds = []; }
    try { state.hrShifts = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_SHIFTS)) || []; } catch (e) { state.hrShifts = []; }
    try { state.hrAssignments = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_ASSIGN)) || []; } catch (e) { state.hrAssignments = []; }
    try { state.hrPositions  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_POSITIONS))  || []; } catch (e) { state.hrPositions  = []; }
    try { state.hrAttendance = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_ATTENDANCE)) || []; } catch (e) { state.hrAttendance = []; }
    try { state.hrCheckins   = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_CHECKINS))   || []; } catch (e) { state.hrCheckins   = []; }
    try { state.hrCiAcks     = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_CI_ACKS))    || []; } catch (e) { state.hrCiAcks     = []; }
    if (!Array.isArray(state.hrCiAcks)) state.hrCiAcks = [];
    try { state.hrOvertimes  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_OVERTIMES))  || []; } catch (e) { state.hrOvertimes  = []; }
    // Lịch làm việc theo tháng (ngày nghỉ/lễ) — object theo khóa 'YYYY-MM'
    try { state.hrWorkCalendar = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_CALENDAR)) || {}; } catch (e) { state.hrWorkCalendar = {}; }
    if (!state.hrWorkCalendar || typeof state.hrWorkCalendar !== 'object') state.hrWorkCalendar = {};
  }

  function saveHrData() {
    localStorage.setItem(STORAGE_KEY_HR_EMPLOYEES, JSON.stringify(state.hrEmployees || []));
    localStorage.setItem(STORAGE_KEY_HR_LEAVES, JSON.stringify(state.hrLeaves || []));
    localStorage.setItem(STORAGE_KEY_HR_RECRUITMENT, JSON.stringify(state.hrRecruitment || []));
    localStorage.setItem(STORAGE_KEY_HR_POSNEEDS, JSON.stringify(state.hrPositionNeeds || []));
    localStorage.setItem(STORAGE_KEY_HR_SHIFTS, JSON.stringify(state.hrShifts || []));
    localStorage.setItem(STORAGE_KEY_HR_ASSIGN, JSON.stringify(state.hrAssignments || []));
    localStorage.setItem(STORAGE_KEY_HR_POSITIONS, JSON.stringify(state.hrPositions || []));
    localStorage.setItem(STORAGE_KEY_HR_ATTENDANCE, JSON.stringify(state.hrAttendance || []));
    localStorage.setItem(STORAGE_KEY_HR_CHECKINS, JSON.stringify(state.hrCheckins || []));
    localStorage.setItem(STORAGE_KEY_HR_CI_ACKS, JSON.stringify(state.hrCiAcks || []));
    localStorage.setItem(STORAGE_KEY_HR_OVERTIMES, JSON.stringify(state.hrOvertimes || []));
    localStorage.setItem(STORAGE_KEY_HR_CALENDAR, JSON.stringify(state.hrWorkCalendar || {}));
    // Ghi lịch sử sửa đổi (tóm tắt ai đã thêm/sửa/xóa mục Nhân Sự nào)
    logDataChange(['hrEmployees', 'hrLeaves', 'hrRecruitment', 'hrPositionNeeds', 'hrShifts', 'hrAssignments', 'hrPositions', 'hrAttendance', 'hrCheckins', 'hrCiAcks', 'hrOvertimes', 'hrWorkCalendar']);
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

  // ─── THỜI GIAN NGHỈ: cả ngày / nửa ngày (0.5) / theo giờ ─────────
  // 1 ngày làm việc chuẩn = 8 giờ. Chế độ "theo giờ" quy đổi ra ngày lẻ
  // (VD: 4 giờ = 0.5 ngày) để thống kê ngày nghỉ vẫn cộng đúng.
  const LEAVE_WORK_HOURS_PER_DAY = 8;
  // Nhãn dạng chữ (toast/thống kê): "3 ngày" | "0.5 ngày" | "4 giờ (≈ 0.5 ngày)"
  function leaveDurationText(l) {
    const days = l.days || leaveDaysCount(l.from, l.to);
    if (l.durationMode === 'hours' && l.hours) {
      return `${Number(l.hours).toLocaleString('vi-VN')} giờ (≈ ${days} ngày)`;
    }
    return `${days} ngày`;
  }
  // Nhãn dạng HTML cho bảng đơn nghỉ (bản ghi cũ không có durationMode → như trước)
  function leaveDurationLabel(l) {
    const days = l.days || leaveDaysCount(l.from, l.to);
    if (l.durationMode === 'hours' && l.hours) {
      return `<strong>${Number(l.hours).toLocaleString('vi-VN')} giờ</strong> <span style="font-size:0.68rem;color:var(--text-muted);">(≈ ${days} ngày)</span>`;
    }
    return `<strong>${days}</strong> ngày`;
  }
  // Đồng bộ UI form theo chế độ thời gian đã chọn:
  //  - "Cả ngày": chọn khoảng từ ngày → đến ngày (như cũ)
  //  - "Nửa ngày" / "Theo giờ": nghỉ TRONG MỘT ngày → khóa "Đến ngày" = "Từ ngày";
  //    riêng "Theo giờ" hiện thêm ô nhập số giờ.
  function syncLeaveDurationUI() {
    const mode = document.getElementById('leave-duration')?.value || 'full';
    const fromInput = document.getElementById('leave-from');
    const toInput = document.getElementById('leave-to');
    const hoursGroup = document.getElementById('group-leave-hours');
    if (!toInput) return;
    if (mode === 'full') {
      toInput.disabled = false;
      if (hoursGroup) hoursGroup.style.display = 'none';
      return;
    }
    if (fromInput && fromInput.value) toInput.value = fromInput.value;
    toInput.disabled = true;
    if (hoursGroup) hoursGroup.style.display = mode === 'hours' ? '' : 'none';
  }
  function hrPosById(id) { return (state.hrPositions || []).find(p => p.id === id) || null; }
  function hrPosName(id) { const p = hrPosById(id); return p ? p.name : 'Vị trí đã xóa'; }
  // Hôm nay theo GIỜ MÁY (yyyy-mm-dd) — không dùng toISOString (UTC) để tránh lệch ngày buổi tối
  function hrTodayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  // Cộng/trừ n ngày trên chuỗi yyyy-mm-dd (đi qua Date địa phương, an toàn timezone)
  function hrShiftDateISO(iso, days) {
    const [y, m, d] = String(iso).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, (d || 1) + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  // ─── RENDER TOÀN TAB ────────────────────────────────────────────
  function renderHrView() {
    populateHrSelects();
    renderHrEmployeesTable();
    renderHrAttendanceCard();
    renderHrCheckinTable();
    renderHrPositionsTable();
    renderHrLeavesTable();
    renderHrOvertimesTable();
    renderHrLeaveStats();
    renderHrAttendanceStats();
    renderHrRecruitmentTable();
    renderPositionNeedsTable();
    renderHrBoard();
    updateHrCardGrid();
    hrDockRender();     // đồng bộ trạng thái dock 3 cấp (Home → nhóm → thẻ)
    syncHrMiniActive();
    initLucide();
  }

  // Điền danh sách nhân viên vào select đơn nghỉ + select lọc bộ phận.
  // QUAN TRỌNG: giữ nguyên lựa chọn đang có (cur) qua các lần render lại —
  // nếu không, mỗi lần đổi bộ lọc (gọi renderHrView) select "Bộ phận" bị xây
  // lại và snap về "Tất Cả" khiến bộ lọc tưởng như không hoạt động.
  function populateHrSelects() {
    ['hr-emp-filter-dept', 'hr-recruit-filter-dept', 'hr-att-filter-dept', 'hr-ci-filter-dept', 'hr-attstats-filter-dept', 'hr-posneed-filter-dept'].forEach(selId => {
      const sel = document.getElementById(selId);
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="all">Tất Cả Bộ Phận</option>' +
        HR_DEPARTMENTS.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
      if (cur) sel.value = cur;
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
      // Người đã nghỉ việc: chip trạng thái kèm NGÀY NGHỈ VIỆC (ngày làm cuối)
      const stCell = `<span class="hr-chip ${stCls}">${EMP_STATUS[st]}</span>` +
        (st === 'quit' && e.quitDate ? ` <span style="font-size:0.68rem; color:var(--text-muted); white-space:nowrap;">nghỉ ${fmtDateDMY(e.quitDate)}</span>` : '');
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
        <td>${stCell}</td>
        <td class="hr-notes" title="${escapeHTML(e.notes || '')}">${escapeHTML(e.notes || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;" data-perm="hr">
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrEditEmployee('${e.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteEmployee('${e.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // Ẩn/hiện ô "Ngày Nghỉ Việc" theo Trạng Thái (chỉ hiện khi "Đã nghỉ việc")
  function syncEmployeeQuitDateRow() {
    const row = document.getElementById('employee-quitdate-row');
    if (row) row.style.display = document.getElementById('employee-status')?.value === 'quit' ? '' : 'none';
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
      document.getElementById('employee-quitdate').value = e.quitDate || '';
      document.getElementById('employee-notes').value = e.notes || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="user-plus"></i> Thêm Nhân Viên Mới`;
      document.getElementById('employee-id').value = '';
      document.getElementById('employee-status').value = 'active';
      document.getElementById('employee-gender').value = 'Nam';
      document.getElementById('employee-code').value = `NV${String((state.hrEmployees || []).length + 1).padStart(3, '0')}`;
    }
    // Kỹ năng — các vị trí nhân viên có thể làm (tick nhiều vị trí)
    renderEmployeeSkillsBox(id ? (hrEmpById(id)?.skills || []) : []);
    syncEmployeeQuitDateRow();
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

    const status = document.getElementById('employee-status').value;
    const quitDate = status === 'quit' ? (document.getElementById('employee-quitdate')?.value || '') : '';
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
      status,
      // Ngày nghỉ việc (ngày làm cuối) — chỉ có ý nghĩa khi "Đã nghỉ việc";
      // bảng chấm công vẫn xuất người này đến hết tháng nghỉ, tháng sau tự ẩn.
      quitDate,
      skills: collectEmployeeSkills(),
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
    if (!confirm(`Xóa nhân viên "${e.name}"? Các đơn nghỉ phép & dữ liệu chấm công/phân vị của người này cũng bị xóa.`)) return;
    trackDeleted('hrEmployees', id);
    // Cascade xóa: đơn nghỉ + chấm công + giờ máy chấm công của người này cũng bị xóa
    trackDeleted('hrLeaves', (state.hrLeaves || []).filter(l => l.employeeId === id).map(l => l.id));
    trackDeleted('hrAttendance', (state.hrAttendance || []).filter(a => a.employeeId === id).map(a => a.id));
    trackDeleted('hrCheckins', (state.hrCheckins || []).filter(c => c.employeeId === id).map(c => c.id));
    state.hrEmployees = state.hrEmployees.filter(x => x.id !== id);
    state.hrLeaves = (state.hrLeaves || []).filter(l => l.employeeId !== id);
    state.hrAttendance = (state.hrAttendance || []).filter(a => a.employeeId !== id);
    state.hrCheckins = (state.hrCheckins || []).filter(c => c.employeeId !== id);
    saveHrData();
    renderHrView();
    showToast(`Đã xóa nhân viên ${e.name}`, 'info');
  }

  // ─── KỸ NĂNG NHÂN VIÊN (vị trí có thể làm) TRONG MODAL NHÂN VIÊN ──
  // Nhóm chip tick: bấm chọn nhiều vị trí; chip "on" = đã chọn.
  // Vị trí hiển thị THEO BỘ PHẬN đang chọn của nhân viên (+ vị trí chưa phân
  // bộ phận + những kỹ năng đã chọn trước đó để vẫn bỏ tick được).
  function renderEmployeeSkillsBox(selected) {
    const box = document.getElementById('employee-skills-box');
    if (!box) return;
    const list = state.hrPositions || [];
    if (!list.length) {
      box.innerHTML = '<span style="font-size:0.72rem;color:var(--text-muted);">Chưa có vị trí nào — thêm ở bảng "Vị Trí Làm Việc" bên dưới để đánh dấu kỹ năng.</span>';
      return;
    }
    const dept = document.getElementById('employee-department')?.value || '';
    const sel = selected || [];
    const visible = list.filter(p => !p.department || p.department === dept || sel.includes(p.id));
    if (!visible.length) {
      box.innerHTML = '<span style="font-size:0.72rem;color:var(--text-muted);">Bộ phận này chưa có vị trí làm việc — thêm ở bảng "Vị Trí Làm Việc" (chọn cùng bộ phận).</span>';
      return;
    }
    box.innerHTML = visible.map(p => `
      <label class="att-pos-chip${sel.includes(p.id) ? ' on' : ''}" title="Bấm chọn nếu nhân viên làm được vị trí này">
        <input type="checkbox" value="${escapeHTML(p.id)}" ${sel.includes(p.id) ? 'checked' : ''} style="display:none;">
        ${escapeHTML(p.name)}${p.department ? ` <span style="font-weight:400;opacity:0.75;">· ${escapeHTML(p.department)}</span>` : ''}
      </label>`).join('');
    box.querySelectorAll('input[type="checkbox"]').forEach(inp => {
      inp.addEventListener('change', () => {
        inp.closest('.att-pos-chip')?.classList.toggle('on', inp.checked);
      });
    });
  }

  function collectEmployeeSkills() {
    return [...document.querySelectorAll('#employee-skills-box input[type="checkbox"]:checked')].map(i => i.value);
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
      // IM LẶNG lúc render: dùng canEditTab('hr') thay vì requireEditPermission()
      // (trước đây render bảng đơn nghỉ bắn toast "không có quyền" MỖI lần
      // chuyển sang tab Nhân Sự — nguyên nhân chính của cảnh báo phiền toái).
      // Xóa đơn: chỉ ban lãnh đạo (Admin & Ban Quản Lý) — editor chỉ tạo đơn mới
      if (approver) {
        actions.push(`<button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteLeave('${l.id}')" title="Xóa đơn" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>`);
      }
      return `<tr>
        <td><strong>${escapeHTML(hrEmpName(l.employeeId))}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(hrEmpDept(l.employeeId))}</span></td>
        <td>${escapeHTML(l.type || 'Nghỉ phép')}</td>
        <td>${fmtDateDMY(l.from)}</td>
        <td>${fmtDateDMY(l.to)}</td>
        <td>${leaveDurationLabel(l)}</td>
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
    // Thời gian nghỉ về mặc định "Cả ngày" (reset form đã trả select về mặc định)
    syncLeaveDurationUI();
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
    let to = document.getElementById('leave-to').value;
    const reason = document.getElementById('leave-reason').value.trim();
    if (!employeeId) { showToast('Vui lòng chọn nhân viên!', 'error'); return; }
    if (!from || !to) { showToast('Vui lòng chọn ngày nghỉ (từ ngày → đến ngày)!', 'error'); return; }
    if (to < from) { showToast('"Đến ngày" không được trước "Từ ngày"!', 'error'); return; }

    // Thời gian nghỉ: Cả ngày / Nửa ngày (0.5) / Theo giờ (1 ngày làm = 8 giờ)
    const mode = document.getElementById('leave-duration')?.value || 'full';
    let days = leaveDaysCount(from, to);
    let hours = null;
    if (mode === 'half') {
      to = from;            // nửa ngày chỉ áp dụng TRONG MỘT ngày
      days = 0.5;
    } else if (mode === 'hours') {
      to = from;            // nghỉ theo giờ cũng trong 1 ngày
      hours = parseFloat((document.getElementById('leave-hours')?.value || '').replace(',', '.'));
      if (!hours || hours <= 0) { showToast('Vui lòng nhập số giờ nghỉ (VD: 4)!', 'error'); return; }
      if (hours > 12) { showToast('Số giờ nghỉ tối đa 12 giờ (1 ngày làm = 8 giờ).', 'error'); return; }
      days = Math.round((hours / LEAVE_WORK_HOURS_PER_DAY) * 100) / 100; // VD: 4 giờ = 0.5 ngày
    }

    state.hrLeaves.push({
      id: `leave-${Date.now()}`,
      employeeId, type, from, to,
      days,
      durationMode: mode,                    // 'full' | 'half' | 'hours'
      hours: (mode === 'hours') ? hours : null,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    saveHrData();
    closeLeaveModal();
    renderHrView();
    showToast(`Đã gửi đơn nghỉ ${leaveDurationText({ durationMode: mode, hours, days, from, to })} cho ${hrEmpName(employeeId)} — chờ ban lãnh đạo duyệt`, 'success');
  }

  // ═══ 2b) ĐĂNG KÝ TĂNG CA (mini card tương đồng "Xin Nghỉ Phép") ═══
  // Người đăng ký nhập GIỜ DỰ KIẾN (từ → đến). Giờ tăng ca THỰC TẾ KHÔNG
  // lưu cứng — tự tính từ Bảng bố trí vị trí theo ngày (hrAssignments):
  // khi giờ làm được cập nhật lại (sự cố, kéo dài ca) thì số giờ TC hiển
  // thị tự thay đổi theo (overtimeActualMin + hrSplitHoursHC).
  function toMinT(t) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; }

  // Giờ TC THỰC TẾ (phút) của 1 đăng ký: tổng phần NGOÀI ca chuẩn của các
  // lượt gán người đó trong ngày trên Bảng bố trí. Chưa có dữ liệu → 0.
  function overtimeActualMin(ot) {
    if (!ot || !ot.employeeId || !ot.date) return 0;
    return (state.hrAssignments || [])
      .filter(a => a.date === ot.date && a.employeeId === ot.employeeId)
      .reduce((sum, a) => sum + hrSplitHoursHCDate(a.department || hrEmpDept(ot.employeeId), ot.date, a.start, a.end, a.shiftIdx).tc, 0);
  }
  // Nhãn giờ DỰ KIẾN: "17:30 → 19:30 · 2h"
  function overtimePlannedText(ot) {
    let m = toMinT(ot.end) - toMinT(ot.start);
    if (m <= 0) m += 1440; // qua nửa đêm
    return `${fmtHour(ot.start)} → ${fmtHour(ot.end)} · ${fmtHm(m)}`;
  }

  function renderHrOvertimesTable() {
    const tbody = document.getElementById('hr-ot-body');
    if (!tbody) return;
    const list = state.hrOvertimes || [];
    const countEl = document.getElementById('hr-ot-count');
    if (countEl) {
      const pend = list.filter(o => (o.status || 'pending') === 'pending').length;
      countEl.textContent = `${list.length} đơn (${pend} chờ duyệt)`;
    }
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="clock-plus" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có đăng ký tăng ca nào. Bấm "Đăng Ký Tăng Ca" để gửi đăng ký.</p></td></tr>`;
      initLucide();
      return;
    }
    const approver = canApproveLeave(); // duyệt/xóa: chỉ Admin & Ban Quản Lý
    const sorted = [...list].sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || '')) ||
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    tbody.innerHTML = sorted.map(o => {
      const st = o.status || 'pending';
      const stCls = st === 'approved' ? 'ok' : (st === 'rejected' ? 'off' : 'warn');
      const actMin = overtimeActualMin(o);
      const actHtml = actMin > 0
        ? `<span class="hr-chip on" title="Giờ tăng ca THỰC TẾ — tự tính từ Bảng bố trí theo ngày (tự cập nhật khi sửa giờ/sự cố)"><i data-lucide="check"></i> TC <strong>${fmtHm(actMin)}</strong></span>`
        : '<span style="color:var(--text-muted);font-size:0.75rem;" title="Chưa có giờ làm trong Bảng bố trí theo ngày">— chưa có</span>';
      const actions = [];
      if (st === 'pending' && approver) {
        actions.push(`<button class="btn btn-success btn-sm" onclick="app.hrApproveOvertime('${o.id}')" title="Duyệt Đồng ý"><i data-lucide="check"></i> Đồng Ý</button>`);
        actions.push(`<button class="btn btn-outline btn-sm" onclick="app.hrRejectOvertime('${o.id}')" title="Không duyệt" style="color:var(--danger);"><i data-lucide="x"></i> Không Đồng Ý</button>`);
      }
      if (approver) {
        actions.push(`<button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteOvertime('${o.id}')" title="Xóa đăng ký" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>`);
      }
      return `<tr>
        <td><strong>${escapeHTML(hrEmpName(o.employeeId))}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(hrEmpDept(o.employeeId))}</span></td>
        <td>${fmtDateDMY(o.date)}</td>
        <td>${overtimePlannedText(o)}</td>
        <td>${actHtml}</td>
        <td><span class="hr-chip ${stCls}">${LEAVE_STATUS[st]}</span>${o.approvedBy ? `<br><span style="font-size:0.68rem;color:var(--text-muted);">bởi ${escapeHTML(o.approvedBy)}</span>` : ''}</td>
        <td class="hr-notes" title="${escapeHTML(o.reason || '')}">${escapeHTML(o.reason || '—')}</td>
        <td class="text-right"><div style="display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap;">${actions.join('')}</div></td>
      </tr>`;
    }).join('');
  }

  // ─── Ô gợi ý nhân viên (combobox) trong form Đăng Ký Tăng Ca ─────
  // Tái dùng bộ lọc leaveEmployeeSuggestions; riêng phần DOM dùng id "ot-"
  function renderOvertimeEmployeeSuggestions() {
    const box = document.getElementById('ot-employee-suggest');
    if (!box) return;
    const list = leaveEmployeeSuggestions(document.getElementById('ot-employee')?.value || '');
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

  function hideOvertimeEmployeeSuggestions() {
    const box = document.getElementById('ot-employee-suggest');
    if (box) box.style.display = 'none';
  }

  function pickOvertimeEmployee(id) {
    const e = hrEmpById(id);
    const input = document.getElementById('ot-employee');
    const hidden = document.getElementById('ot-employee-id');
    if (e && input) input.value = e.name;
    if (hidden) hidden.value = id;
    hideOvertimeEmployeeSuggestions();
  }

  function handleOvertimeEmployeeKeydown(evt) {
    const box = document.getElementById('ot-employee-suggest');
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
      if (target) pickOvertimeEmployee(target.getAttribute('data-emp-id'));
    } else if (evt.key === 'Escape') {
      hideOvertimeEmployeeSuggestions();
    }
  }

  function openOvertimeModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-overtime');
    const form = document.getElementById('ot-form');
    if (!modal || !form) return;
    form.reset();
    if (!(state.hrEmployees || []).length) {
      showToast('Chưa có nhân viên nào — thêm nhân viên trước khi đăng ký tăng ca!', 'error');
      return;
    }
    // Danh sách mốc 30 phút (05:00 → 23:30) cho giờ dự kiến
    const opts = `<option value="">--</option>` + hrHalfHourOptions().map(t => `<option value="${t}">${t}</option>`).join('');
    const startSel = document.getElementById('ot-start');
    const endSel = document.getElementById('ot-end');
    if (startSel) startSel.innerHTML = opts;
    if (endSel) endSel.innerHTML = opts;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('ot-date').value = today;
    if (startSel) startSel.value = '17:30';
    if (endSel) endSel.value = '19:30';
    const empInput = document.getElementById('ot-employee');
    const empHidden = document.getElementById('ot-employee-id');
    if (empInput) empInput.value = '';
    if (empHidden) empHidden.value = '';
    hideOvertimeEmployeeSuggestions();
    modal.classList.add('show');
    initLucide();
  }

  function closeOvertimeModal() {
    document.getElementById('modal-overtime')?.classList.remove('show');
  }

  function handleOvertimeSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const empInput = (document.getElementById('ot-employee')?.value || '').trim();
    let employeeId = document.getElementById('ot-employee-id')?.value || '';
    if (!employeeId && empInput) {
      const exact = (state.hrEmployees || []).filter(x =>
        (x.status || 'active') !== 'quit' && x.name.toLowerCase() === empInput.toLowerCase());
      if (exact.length === 1) employeeId = exact[0].id;
    }
    if (!employeeId) { showToast('Vui lòng gõ tên và chọn nhân viên từ danh sách gợi ý!', 'error'); return; }
    const date = document.getElementById('ot-date')?.value || '';
    const start = document.getElementById('ot-start')?.value || '';
    const end = document.getElementById('ot-end')?.value || '';
    const reason = (document.getElementById('ot-reason')?.value || '').trim();
    if (!date) { showToast('Vui lòng chọn ngày tăng ca!', 'error'); return; }
    if (!start || !end) { showToast('Vui lòng chọn giờ tăng ca dự kiến (từ → đến)!', 'error'); return; }
    let plannedMin = toMinT(end) - toMinT(start);
    if (plannedMin < 0) plannedMin += 1440; // làm qua nửa đêm
    if (plannedMin === 0) { showToast('Giờ kết thúc phải khác giờ bắt đầu!', 'error'); return; }

    state.hrOvertimes.push({
      id: `ot-${Date.now()}`,
      employeeId, date, start, end,
      plannedMin,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    saveHrData();
    closeOvertimeModal();
    renderHrView();
    showToast(`Đã gửi đăng ký tăng ca ${fmtHour(start)} → ${fmtHour(end)} (${fmtHm(plannedMin)}) cho ${hrEmpName(employeeId)} — chờ ban lãnh đạo duyệt`, 'success');
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
    showToast(`Đã ĐỒNG Ý đơn nghỉ của ${hrEmpName(l.employeeId)} (${leaveDurationText(l)})`, 'success');
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

  // Duyệt / không duyệt / xóa đăng ký tăng ca — chỉ Admin & Ban Quản Lý
  // (dùng chung cổng canApproveLeave với đơn nghỉ; editor chỉ gửi đăng ký).
  function approveOvertime(id) {
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý mới được duyệt đăng ký tăng ca!', 'error');
      return;
    }
    const o = (state.hrOvertimes || []).find(x => x.id === id);
    if (!o || (o.status || 'pending') !== 'pending') return;
    o.status = 'approved';
    o.approvedBy = state.currentUser ? (state.currentUser.fullname || state.currentUser.username) : '';
    o.approvedAt = new Date().toISOString();
    o.updatedAt = o.approvedAt;
    saveHrData();
    renderHrView();
    const act = overtimeActualMin(o);
    showToast(`Đã ĐỒNG Ý tăng ca của ${hrEmpName(o.employeeId)} (${overtimePlannedText(o)}${act > 0 ? ` · thực tế TC ${fmtHm(act)}` : ''})`, 'success');
  }

  function rejectOvertime(id) {
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý mới được duyệt đăng ký tăng ca!', 'error');
      return;
    }
    const o = (state.hrOvertimes || []).find(x => x.id === id);
    if (!o || (o.status || 'pending') !== 'pending') return;
    o.status = 'rejected';
    o.approvedBy = state.currentUser ? (state.currentUser.fullname || state.currentUser.username) : '';
    o.approvedAt = new Date().toISOString();
    o.updatedAt = o.approvedAt;
    saveHrData();
    renderHrView();
    showToast(`Đã KHÔNG duyệt đăng ký tăng ca của ${hrEmpName(o.employeeId)}`, 'info');
  }

  function deleteOvertime(id) {
    // Chỉ Admin & Ban Quản Lý — editor chỉ được GỬI đăng ký mới
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý mới được xóa đăng ký tăng ca!', 'error');
      return;
    }
    trackDeleted('hrOvertimes', id);
    state.hrOvertimes = (state.hrOvertimes || []).filter(o => o.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa đăng ký tăng ca', 'info');
  }

  function deleteLeave(id) {
    // Chỉ Admin & Ban Quản Lý được xóa đơn nghỉ — editor chỉ được TẠO đơn mới
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý mới được xóa đơn nghỉ phép!', 'error');
      return;
    }
    trackDeleted('hrLeaves', id);
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

  // ─── 5) CHẤM CÔNG & PHÂN VỊ THEO NGÀY ────────────────────────────
  // Mỗi nhân viên/ngày tối đa 1 bản ghi (sparse: chỉ lưu người ĐÃ chấm).
  // "Nghỉ có phép" KHÔNG lưu trùng — suy ra trực tiếp từ đơn nghỉ ĐÃ DUYỆT
  // (hrLeaves) phủ ngày đang xem, nên luôn khớp phê duyệt của ban lãnh đạo.
  function attRecordOf(employeeId, date) {
    return (state.hrAttendance || []).find(a => a.employeeId === employeeId && a.date === date) || null;
  }

  // Đơn nghỉ ĐÃ DUYỆT phủ đúng ngày của nhân viên (nếu có)
  function approvedLeaveOn(employeeId, date) {
    return (state.hrLeaves || []).find(l => l.employeeId === employeeId
      && (l.status || 'pending') === 'approved' && String(l.from) <= date && date <= String(l.to)) || null;
  }
  // Đơn nghỉ CHỜ DUYỆT phủ ngày (chỉ để gợi ý trên bảng chấm công)
  function pendingLeaveOn(employeeId, date) {
    return (state.hrLeaves || []).find(l => l.employeeId === employeeId
      && (l.status || 'pending') === 'pending' && String(l.from) <= date && date <= String(l.to)) || null;
  }

  // Trạng thái chấm công hiển thị: 'work' | 'absent' | 'leave' (phép đã duyệt) | '' (chưa chấm)
  function attStatusOf(employeeId, date) {
    const rec = attRecordOf(employeeId, date);
    if (rec && (rec.status === 'work' || rec.status === 'absent')) return rec.status;
    if (approvedLeaveOn(employeeId, date)) return 'leave';
    return '';
  }

  function ensureAttRecord(employeeId, date) {
    let rec = attRecordOf(employeeId, date);
    if (!rec) {
      rec = { id: `att-${date}-${employeeId}`, date, employeeId, status: 'work', positions: [], note: '', createdAt: new Date().toISOString() };
      state.hrAttendance.push(rec);
    }
    return rec;
  }

  function setAttendanceStatus(employeeId, date, status) {
    if (!requireEditPermission()) return;
    const idx = (state.hrAttendance || []).findIndex(a => a.employeeId === employeeId && a.date === date);
    const rec = idx !== -1 ? state.hrAttendance[idx] : null;
    if (status === '') {
      // Bỏ chấm: xóa hẳn bản ghi (hỏi lại nếu đã có phân vị / ghi chú)
      if (rec && (((rec.positions || []).length) || (rec.note || '').trim())) {
        if (!confirm('Bỏ chấm sẽ xóa cả phân vị & ghi chú của ngày này. Tiếp tục?')) { renderHrAttendanceCard(); return; }
      }
      if (rec) { trackDeleted('hrAttendance', rec.id); state.hrAttendance.splice(idx, 1); }
      saveHrData();
      renderHrAttendanceCard();
      showToast(`Đã bỏ chấm công ${hrEmpName(employeeId)} ngày ${fmtDateDMY(date)}`, 'info');
      return;
    }
    if (status !== 'work' && status !== 'absent') return;
    const r = ensureAttRecord(employeeId, date);
    r.status = status;
    r.updatedAt = new Date().toISOString();
    saveHrData();
    renderHrAttendanceCard();
    showToast(status === 'work'
      ? `Đã chấm ĐI LÀM: ${hrEmpName(employeeId)} (${fmtDateDMY(date)})`
      : `Đã ghi VẮNG (không phép): ${hrEmpName(employeeId)} (${fmtDateDMY(date)})`, status === 'work' ? 'success' : 'info');
  }

  // Bật/tắt 1 vị trí trong ngày. Nếu ngày chưa chấm → tự chấm "Đi làm".
  function toggleAttendancePosition(employeeId, date, positionId) {
    if (!requireEditPermission()) return;
    if (attStatusOf(employeeId, date) === 'leave') {
      showToast(`${hrEmpName(employeeId)} đang nghỉ CÓ PHÉP (đơn đã duyệt) — không phân vị trí.`, 'info');
      return;
    }
    const autoWork = !attRecordOf(employeeId, date);
    const r = ensureAttRecord(employeeId, date);
    r.positions = Array.isArray(r.positions) ? r.positions : [];
    const i = r.positions.indexOf(positionId);
    if (i === -1) {
      r.positions.push(positionId);
      const emp = hrEmpById(employeeId);
      if (emp && !(emp.skills || []).includes(positionId)) {
        showToast(`Lưu ý: ${hrEmpName(employeeId)} chưa có kỹ năng "${hrPosName(positionId)}" — vẫn cho phân nếu thực tế làm được.`, 'info');
      }
    } else {
      r.positions.splice(i, 1);
    }
    r.updatedAt = new Date().toISOString();
    saveHrData();
    renderHrAttendanceCard();
    if (autoWork) showToast(`Đã chấm ĐI LÀM: ${hrEmpName(employeeId)} (${fmtDateDMY(date)})`, 'success');
  }

  function setAttendanceNote(employeeId, date, note) {
    if (!requireEditPermission()) return;
    const rec = attRecordOf(employeeId, date);
    if (!rec) {
      if (!(note || '').trim()) return; // chưa chấm + ghi chú rỗng → bỏ qua
      const r = ensureAttRecord(employeeId, date);
      r.note = (note || '').trim();
      r.updatedAt = new Date().toISOString();
      saveHrData();
      return;
    }
    rec.note = (note || '').trim();
    rec.updatedAt = new Date().toISOString();
    saveHrData(); // cố ý KHÔNG render lại — tránh mất focus khi đang gõ
  }

  // Điều hướng ngày trên bảng chấm công
  function hrAttSetDate(iso) {
    state.hrAttDate = /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? iso : hrTodayISO();
    renderHrAttendanceCard();
  }
  function hrAttShiftDay(delta) { hrAttSetDate(hrShiftDateISO(state.hrAttDate || hrTodayISO(), delta)); }
  function hrAttGoToday() { hrAttSetDate(hrTodayISO()); }
  function hrAttSetMonth(v) {
    state.hrAttMonth = /^\d{4}-\d{2}$/.test(String(v || '')) ? v : hrTodayISO().slice(0, 7);
    renderHrAttendanceStats();
  }

  // Vị trí hiển thị theo BỘ PHẬN của nhân viên: chọn bộ phận nào thì chỉ hiện
  // vị trí của bộ phận đó + vị trí chưa phân bộ phận (dùng chung) + những vị trí
  // người đó đã có kỹ năng (★) để vẫn phân được khi kỹ năng chéo bộ phận.
  // Sắp xếp: kỹ năng có sẵn (★) lên đầu, còn lại theo thứ tự danh mục.
  function attPositionsFor(emp) {
    const skills = (emp && emp.skills) || [];
    const dept = (emp && emp.department) || '';
    const all = state.hrPositions || [];
    const visible = all.filter(p => !p.department || p.department === dept || skills.includes(p.id));
    return [...visible.filter(p => skills.includes(p.id)), ...visible.filter(p => !skills.includes(p.id))];
  }

  // ─── LIÊN KẾT NHÂN SỰ ↔ SẢN LƯỢNG ÉP VÁN ────────────────────────
  // Tra nhân viên theo TÊN (bỏ dấu, không phân biệt hoa/thường, gộp khoảng
  // trắng thừa — tên nhập tay hay bị "Nguyễn Văn  A" 2 dấu cách).
  function hrEmpByName(name) {
    const key = hrStripForMatch(name);
    if (!key) return null;
    return (state.hrEmployees || []).find(e => hrStripForMatch(e.name || '') === key) || null;
  }
  // Tên các vị trí được phân trong ngày của 1 nhân viên (từ bảng chấm công)
  function hrPositionsNamesOf(employeeId, date) {
    const rec = attRecordOf(employeeId, date);
    return ((rec && rec.positions) || []).map(pid => hrPosName(pid));
  }
  // Danh sách công nhân được phân VỊ ÉP (tên vị trí chứa "ép") trong ngày date —
  // nguồn dữ liệu: bảng Chấm Công & Phân Vị Theo Ngày (tab Nhân Sự). Chỉ nhận
  // người đang ĐI LÀM (status work — người nghỉ có phép/vắng không tính).
  // Dùng cho: cột "Công nhân ép" tự động của lượt ép ván + bảng đối chiếu.
  function hrWorkersForPosition(date, positionPattern) {
    return (state.hrEmployees || [])
      .filter(e => (e.status || 'active') === 'active')
      .filter(e => attStatusOf(e.id, date) === 'work')
      .map(e => {
        const positions = hrPositionsNamesOf(e.id, date);
        return { id: e.id, name: e.name || '', code: e.code || '', department: e.department || '', positions, isPress: positions.some(n => positionPattern.test(n)) };
      })
      .filter(w => w.isPress)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
  }
  // Vị trí ÉP VÁN thực sự — dùng cho giờ/công nhân của công đoạn ÉP VÁN:
  //   • Tên vị trí PHẢI chứa "ép" (giữ dấu — nên "Xếp nan" KHÔNG bị nhận nhầm)
  //   • KHÔNG được là vị trí của các công đoạn Xưởng 2 đã có thẻ + giờ riêng
  //     (Bullig / Chọn thanh / Gia công) — Ép Ván KHÔNG cộng giờ của chúng.
  function isPressEpPos(name) {
    const s = String(name || '');
    if (!/ép/i.test(s)) return false;
    const n = hrStripDiacritics(s);
    return !/bullig|chon thanh|gia cong/.test(n);
  }
  function hrWorkersForPress(date) {
    return hrWorkersForPosition(date, { test: isPressEpPos });
  }
  // Vị trí phân theo LOẠI THÀNH PHẨM của lượt ép:
  //  - Thành phẩm "Bullig..." → vị trí "Chọn thanh Bullig" (CHỈ khớp tên vị trí
  //    đầy đủ "Chọn thanh Bullig" — KHÔNG khớp các vị trí "Bullig" khác)
  //  - Thành phẩm thường (Ván...) → vị trí Ép (tên vị trí chứa "ép")
  // Matcher so khớp BỎ DẤU + không phân biệt hoa/thường (ổ/ó/ỏ... đều nhận)
  const BULLIG_POS_MATCHER = {
    test(name) {
      return /chon\s+thanh\s+bullig/i.test(hrStripDiacritics(String(name || '')));
    }
  };
  // Vị trí ÉP VÁN thật (dùng chung isPressEpPos: loại vị trí công đoạn Xưởng 2 —
  // Bullig / Chọn thanh / Gia công để Ép Ván KHÔNG cộng giờ của các công đoạn đó)
  const PRESS_EP_PATTERN = { test: isPressEpPos, source: 'ép' };
  function pressPositionPatternFor(productName, isBullig) {
    const bull = isBullig === true || /bullig/i.test(String(productName || ''));
    return bull ? BULLIG_POS_MATCHER : PRESS_EP_PATTERN;
  }
  // Danh sách công nhân theo THÀNH PHẨM của lượt ép (tên TP quyết định vị trí;
  // isBullig = true khi định mức có "Sử Dụng Nan = Bullig" — tên nay chỉ kích thước)
  function hrWorkersForProduct(date, productName, isBullig) {
    return hrWorkersForPosition(date, pressPositionPatternFor(productName, isBullig));
  }
  // Chỉ danh sách TÊN công nhân ép trong ngày (dùng cho Dashboard/Xuất Excel)
  function hrPressWorkersNamesOf(date) {
    return hrWorkersForPress(date).map(w => w.name);
  }

  function renderHrAttendanceCard() {
    if (!state.hrAttDate) state.hrAttDate = hrTodayISO();
    const dateInput = document.getElementById('hr-att-date');
    if (dateInput && dateInput.value !== state.hrAttDate) dateInput.value = state.hrAttDate;
    const dept = document.getElementById('hr-att-filter-dept')?.value || 'all';
    const q = hrStripDiacritics(document.getElementById('hr-att-search')?.value || '');

    // Lọc đang làm việc (+ người ĐÃ NGHỈ VIỆC nhưng CHƯA qua ngày nghỉ — vẫn
    // hiện trên chấm công để chấm đủ ngày làm cuối) + bộ phận + tìm nhanh,
    // rồi sắp xếp theo NHÓM BỘ PHẬN (Văn Phòng -> Cơ Điện -> QC -> Xưởng 1 -> Xưởng 2 -> Lò Hơi),
    // trong cùng bộ phận xếp theo tên.
    const deptOrder = d => { const i = HR_DEPARTMENTS.indexOf(d); return i === -1 ? HR_DEPARTMENTS.length : i; };
    const list = (state.hrEmployees || []).filter(e => {
      const st = e.status || 'active';
      if (st === 'quit') {
        const qd = String(e.quitDate || '');
        return /^\d{4}-\d{2}-\d{2}$/.test(qd) && qd >= state.hrAttDate; // hiện tới ngày nghỉ việc
      }
      return st === 'active';
    })
      .filter(e => dept === 'all' || e.department === dept)
      .filter(e => !q || hrStripDiacritics(`${e.name || ''} ${e.code || ''}`).includes(q))
      .sort((a, b) => deptOrder(a.department) - deptOrder(b.department) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'vi'));

    // Đếm tổng hợp theo ngày + số người mỗi vị trí (để tổ trưởng nhìn bao quát)
    let work = 0, leave = 0, absent = 0, unmarked = 0;
    const posCount = {};
    list.forEach(e => {
      const st = attStatusOf(e.id, state.hrAttDate);
      if (st === 'work') {
        work++;
        (attRecordOf(e.id, state.hrAttDate)?.positions || []).forEach(pid => { posCount[pid] = (posCount[pid] || 0) + 1; });
      }
      else if (st === 'leave') leave++;
      else if (st === 'absent') absent++;
      else unmarked++;
    });

    const chipsEl = document.getElementById('hr-att-chips');
    if (chipsEl) {
      const posPart = Object.keys(posCount).map(pid => `${escapeHTML(hrPosName(pid))}: <strong>${posCount[pid]}</strong>`).join(' · ');
      chipsEl.innerHTML =
        `<span class="hr-stat-chip"><i data-lucide="users"></i> Tổng: <strong>${list.length}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="check-circle-2"></i> Đi làm: <strong>${work}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="calendar-check"></i> Nghỉ có phép: <strong>${leave}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="user-x"></i> Vắng: <strong>${absent}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="circle-dashed"></i> Chưa chấm: <strong>${unmarked}</strong></span>` +
        (posPart ? `<span class="hr-stat-chip"><i data-lucide="git-branch"></i> Phân vị: ${posPart}</span>` : '');
    }

    const countEl = document.getElementById('hr-att-count');
    if (countEl) countEl.textContent = `Ngày ${fmtDateDMY(state.hrAttDate)}`;

    const tbody = document.getElementById('hr-att-body');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="clipboard-list" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có nhân viên đang làm việc. Thêm nhân viên ở bảng trên.</p></td></tr>`;
      initLucide();
      return;
    }

    tbody.innerHTML = list.map(e => {
      const st = attStatusOf(e.id, state.hrAttDate);
      const rec = attRecordOf(e.id, state.hrAttDate);
      const leaveL = approvedLeaveOn(e.id, state.hrAttDate);
      const pendL = pendingLeaveOn(e.id, state.hrAttDate);
      const skills = e.skills || [];
      const ci = checkinRecordOf(e.id, state.hrAttDate);
      const ciBadge = ci ? `<br><span class="hr-emp-code" style="font-size:0.68rem;color:var(--text-muted);" title="Giờ máy chấm công đã nạp">⏱ ${escapeHTML(ci.in || '?')}${ci.out ? '–' + escapeHTML(ci.out) : ''}</span>` : '';

      // Ngày có đơn nghỉ ĐÃ DUYỆT → hiển thị chip, khóa select (trừ khi đã
      // chấm tay "Đi làm" — trường hợp hủy nghỉ, đơn vẫn quản lý ở tab nghỉ phép)
      let statusCell;
      if (st === 'leave') {
        statusCell = `<span class="hr-chip warn" title="Có đơn nghỉ đã được ban lãnh đạo duyệt">Nghỉ Có Phép ✓</span>`;
      } else {
        statusCell = `<select data-att-emp="${escapeHTML(e.id)}" data-att-field="status" title="Chọn trạng thái đi làm ngày này">
          <option value="" ${st === '' ? 'selected' : ''}>— Chưa chấm —</option>
          <option value="work" ${st === 'work' ? 'selected' : ''}>${ATT_STATUS.work}</option>
          <option value="absent" ${st === 'absent' ? 'selected' : ''}>${ATT_STATUS.absent}</option>
        </select>`;
      }

      let leaveCell = '<span style="color:var(--text-muted);">—</span>';
      if (leaveL) {
        leaveCell = `<span class="hr-chip ok" title="${escapeHTML((leaveL.type || '') + (leaveL.reason ? ' — ' + leaveL.reason : ''))}">${escapeHTML(leaveL.type || 'Nghỉ phép')}</span>` +
          `<br><span style="font-size:0.68rem;color:var(--text-muted);">duyệt bởi ${escapeHTML(leaveL.approvedBy || 'ban lãnh đạo')}</span>`;
      } else if (pendL) {
        leaveCell = `<span class="hr-chip warn" title="Có đơn nghỉ đang chờ ban lãnh đạo duyệt">Đơn chờ duyệt</span>`;
      }

      const posChips = attPositionsFor(e).map(p => {
        const on = (rec?.positions || []).includes(p.id);
        const skilled = skills.includes(p.id);
        return `<button type="button" class="att-pos-chip${on ? ' on' : ''}${skilled ? ' skilled' : ''}"` +
          ` data-att-emp="${escapeHTML(e.id)}" data-att-pos="${escapeHTML(p.id)}"` +
          `${st === 'leave' ? ' disabled' : ''}` +
          ` title="${escapeHTML(p.name)}${p.department ? ' · ' + escapeHTML(p.department) : ''}${skilled ? ' (kỹ năng có sẵn)' : ''}">${skilled ? '★ ' : ''}${escapeHTML(p.name)}</button>`;
      }).join('') || '<span style="font-size:0.72rem;color:var(--text-muted);">Chưa có vị trí nào</span>';

      // CỘT VỊ TRÍ TRONG NGÀY — gọn theo dữ liệu Board:
      //  • Có bố trí qua Board -> chỉ hiện ĐÚNG các vị trí đã gán hôm đó (kèm
      //    giờ làm) + badge tổng HC (giờ hành chính) / TC (tăng ca) trong ngày.
      //  • Chưa có dữ liệu Board -> giữ chip phân vị thủ công như cũ (fallback).
      const dayAs = hrAssignmentsOf(state.hrAttDate).filter(a => a.employeeId === e.id)
        .sort((a, b) => String(a.start).localeCompare(String(b.start)));
      let posCell;
      if (dayAs.length) {
        const chips = dayAs.map(a =>
          `<span class="att-pos-chip on" title="${escapeHTML(hrPosName(a.positionId))} · ${fmtHour(a.start)}${a.end ? '–' + fmtHour(a.end) : ' → hết ca'}">` +
          `${escapeHTML(hrPosName(a.positionId))} <b style="font-weight:600;">${fmtHour(a.start)}${a.end ? '–' + fmtHour(a.end) : ''}</b></span>`).join('');
        const tot = dayAs.reduce((acc, a) => {
          const r = hrSplitHoursHCDate(a.department || e.department, state.hrAttDate, a.start, a.end, a.shiftIdx || 0);
          acc.hc += r.hc; acc.tc += r.tc; return acc;
        }, { hc: 0, tc: 0 });
        const badge = `<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">
          <span class="hr-chip" title="Giờ làm trong giờ hành chính/ca chuẩn của bộ phận">HC <strong>${fmtHm(tot.hc)}</strong></span>` +
          (tot.tc > 0 ? `<span class="hr-chip warn" title="Giờ tăng ca — ngoài giờ ca chuẩn">TC <strong>${fmtHm(tot.tc)}</strong></span>` : '') +
          `</div>`;
        posCell = `<div class="att-pos-chips">${chips}</div>${badge}`;
      } else {
        posCell = `<div class="att-pos-chips">${posChips}</div>`;
      }

      return `<tr${st === 'leave' ? ' style="opacity:0.75;"' : ''}>
        <td><strong>${escapeHTML(e.name || '')}</strong>${e.code ? `<br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(e.code)}</span>` : ''}</td>
        <td>${escapeHTML(e.department || '—')}</td>
        <td>${statusCell}${ciBadge}</td>
        <td>${leaveCell}</td>
        <td>${posCell}</td>
        <td><input type="text" data-att-emp="${escapeHTML(e.id)}" data-att-field="note" value="${escapeHTML(rec?.note || '')}" placeholder="Ghi chú..." style="min-width:110px;"></td>
      </tr>`;
    }).join('');
    initLucide();
  }

  // ─── 8) NẠP GIỜ TỪ MÁY CHẤM CÔNG (EXCEL) + ĐỐI CHIẾU ─────────────
  // Máy xuất file mỗi hãng một kiểu — TỰ NHẬN CỘT (Mã NV/Tên, Ngày, Giờ vào,
  // Giờ ra). Máy xuất từng LẦN QUÉT (cột "Thời gian"): gộp theo NV+ngày,
  // lần quét ĐẦU = giờ vào, lần CUỐI = giờ ra. Giờ máy chỉ dùng ĐỐI CHIẾU +
  // ÁP DỤNG (tự chấm Đi làm cho ngày thiếu/lech), không ghi đè đơn nghỉ đã duyệt.
  function ciNormTime(v) {
    if (v instanceof Date) return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`;
    if (typeof v === 'number' && isFinite(v)) return ciTimeFromNum(v);
    const s = String(v || '').trim();
    let m = s.match(/(\d{1,2})[:h](\d{2})/);
    if (m) return `${String(+m[1]).padStart(2, '0')}:${m[2]}`;
    if (/^\d{3,4}$/.test(s)) { const t = s.padStart(4, '0'); return `${t.slice(0, 2)}:${t.slice(2)}`; }
    // Ô GIỜ lưu dạng SỐ của Excel: 0.295 = 07:05 · 45000.295 = serial + giờ
    if (/^\d+(?:[.,]\d+)?$/.test(s)) return ciTimeFromNum(Number(s.replace(',', '.')));
    return '';
  }
  // Số Excel (phân số ngày 0..1 HOẶC serial datetime) -> 'HH:mm'
  function ciTimeFromNum(n) {
    if (!isFinite(n)) return '';
    let frac = -1;
    if (n >= 0 && n < 1) frac = n;
    else if (n >= 1 && n < 60000) frac = n - Math.floor(n);
    if (frac < 0) return '';
    const mins = Math.round(frac * 1440) % 1440;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  // Serial ngày của Excel (1899-12-30 = 0) -> { date, time } — KHÔNG lệch múi giờ
  function ciSerialToDateTime(n) {
    const days = Math.floor(n);
    const mins = Math.round((n - days) * 1440) % 1440;
    const dt = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
    return {
      date: `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`,
      time: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
    };
  }
  // Giải mã 1 ô Ngày / Ngày-giờ -> { date 'yyyy-mm-dd', time 'HH:mm' | '' }
  function ciNormDateTime(v) {
    if (v instanceof Date) {
      return { date: `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`,
               time: `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}` };
    }
    if (typeof v === 'number' && isFinite(v)) {
      // 20000..80000 = serial ngày của Excel (1954..2119); < 1 = chỉ có giờ
      if (v >= 20000 && v < 80000) return ciSerialToDateTime(v);
      return { date: '', time: ciTimeFromNum(v) };
    }
    const s = String(v || '').trim();
    // Ô NGÀY lưu dạng SỐ của Excel (file máy xuất không định dạng ngày)
    if (/^\d{5}(?:[.,]\d+)?$/.test(s)) {
      const n = Number(s.replace(',', '.'));
      if (n >= 20000 && n < 80000) return ciSerialToDateTime(n);
    }
    // Thử định dạng ISO (yyyy-MM-dd [HH:mm]) TRƯỚC để regex dd/MM không khớp nhầm "2024-06-05"
    let m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T]+(\d{1,2})[:h.](\d{2}))?/);
    if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? ciNormTime(`${m[4]}:${m[5]}`) : '' };
    m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T]+(\d{1,2})[:h.](\d{2}))?/); // dd/MM/yyyy [HH:mm]
    if (m) {
      let y = +m[3]; if (y < 100) y += 2000;
      return { date: `${y}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`,
               time: m[4] ? ciNormTime(`${m[4]}:${m[5]}`) : '' };
    }
    return { date: '', time: '' };
  }

  // Tìm dòng tiêu đề: quét ~20 dòng đầu (file máy chấm công có các dòng đầu trang
  // "Công ty TNHH..." / "BÁO CÁO DỮ LIỆU CHẤM CÔNG" / "Từ ngày... Đến ngày...")
  function ciFindHeaderRow(aoa) {
    const limit = Math.min(aoa.length, 20);
    for (let r = 0; r < limit; r++) {
      const cells = (aoa[r] || []).map(h => hrStripDiacritics(String(h ?? '')));
      if (!cells.length) continue;
      const hasCode = cells.some(h => /ma ?nv|ma nhan vien|user ?id|userid/.test(h));
      const hasName = cells.some(h => /ho ?ten|ten nhan vien|^ten$|name/.test(h));
      const hasDate = cells.some(h => /ngay|date/.test(h));
      if ((hasCode || hasName) && hasDate) return r;
    }
    return -1;
  }
  // Tự nhận cột theo tiêu đề (bỏ dấu, không phân biệt hoa/thường)
  function ciAutoMapCols(headers) {
    const norm = headers.map(h => hrStripDiacritics(h));
    const find = (pred) => norm.findIndex(pred);
    const col = {
      code:     find(h => /ma ?nv|ma nhan vien|ma ?the|user ?id|userid|enroll|ma ?so/.test(h)),
      name:     find(h => /ho ?ten|ten nhan vien|^ten$|name/.test(h)),
      dept:     find(h => /phong ?ban|bo ?phan|department|dept/.test(h)),
      date:     find(h => /ngay|date/.test(h) && !/ngay ?gio|thoi ?gian/.test(h)),
      timeIn:   find(h => /gio ?vao|check ?in|^in$|vao ?lam/.test(h)),
      timeOut:  find(h => /gio ?ra|check ?out|^out$/.test(h)),
      dateTime: find(h => /thoi ?gian|ngay ?gio|time|checkpoint/.test(h)),
      // Các cột "Lần 1".."Lần N" — máy chấm công xuất mỗi lần quét một cột (ngang)
      punchCols: norm
        .map((h, i) => ({ h, i }))
        .filter(x => /^lan\s*\d+$/.test(x.h))
        .sort((a, b) => (parseInt(a.h.replace(/\D/g, ''), 10) || 0) - (parseInt(b.h.replace(/\D/g, ''), 10) || 0))
        .map(x => x.i)
    };
    // Không có cột Ngày riêng -> cột "Thời gian/Ngày giờ" chính là datetime từng lần quét
    if (col.date === -1 && col.dateTime !== -1) { col.date = col.dateTime; col.dateTime = -1; }
    return col;
  }
  function ciResolveEmployee(code, name) {
    const list = state.hrEmployees || [];
    const codeK = hrNormCode(code);
    const nameK = hrNormNameKey(name);
    // 1) Mã NV đã CHUẨN HOÁ: "NV 001" ≡ "nv001" ≡ số 1 (máy hay xuất mã khác kiểu)
    if (codeK) {
      const byCode = list.filter(e => hrNormCode(e.code) === codeK);
      if (byCode.length === 1) return byCode[0];
    }
    // 2) Họ tên CHUẨN HOÁ (bỏ dấu, gộp khoảng trắng) — chỉ nhận khi DUY NHẤT
    if (nameK) {
      const byName = list.filter(e => hrNormNameKey(e.name) === nameK);
      if (byName.length === 1) return byName[0];
    }
    // 3) Dự phòng: so khớp tuyệt đối như trước (tên có ký tự đặc biệt)
    const byCode2 = code ? list.find(e => String(e.code || '').trim().toLowerCase() === String(code).trim().toLowerCase()) : null;
    if (byCode2) return byCode2;
    const byName2 = name ? list.find(e => String(e.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()) : null;
    return byName2 || null;
  }


  // Đọc lại ánh xạ + nhập sheet vào state.hrCheckins.
  // Hỗ trợ 3 kiểu file máy chấm công:
  //   (a) từng dòng 1 NGÀY có cột Giờ vào / Giờ ra riêng;
  //   (b) từng dòng 1 LẦN QUÉT (cột "Thời gian" datetime) -> gộp theo NV+ngày;
  //   (c) lưới cột "Lần 1".."Lần N" (mỗi dòng 1 ngày, các lần quét nằm ngang,
  //       giờ HH:MM:SS) -> lần đầu = vào, lần cuối = ra.
  function importCheckinsFromSheet(aoa, col, fileName) {
    const res = { punches: 0, added: 0, updated: 0, unmatched: [], matched: 0 };
    const hasInOut = col.timeIn !== -1;                 // kiểu (a): dòng theo NGÀY
    const punchCols = (col.timeIn === -1 && Array.isArray(col.punchCols)) ? col.punchCols : []; // kiểu (c)
    const punches = []; // [{empId, date, time}] — cho kiểu (b) và (c)
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row || !row.length) continue;
      const get = i => (i === undefined || i === null || i < 0) ? '' : row[i];
      const emp = ciResolveEmployee(get(col.code), get(col.name));
      if (!emp) {
        const key = String(get(col.code) || get(col.name) || '').trim();
        if (key && !res.unmatched.some(u => u.key === key && u.row === r + 1)) {
          res.unmatched.push({ key, row: r + 1, name: String(get(col.name) || '').trim(), dept: String(get(col.dept) || '').trim() });
        }
        continue;
      }
      if (hasInOut) {
        // Kiểu (a): dòng theo ngày, giờ vào/ra riêng
        const dt = ciNormDateTime(get(col.date));
        if (!dt.date) continue;
        const inT = ciNormTime(get(col.timeIn));
        const outT = ciNormTime(get(col.timeOut));
        if (!inT && !outT) continue;
        res.punches++;
        if (upsertCheckin(emp.id, dt.date, inT, outT, 1, fileName, [inT, outT].filter(Boolean))) res.added++; else res.updated++;
      } else if (punchCols.length) {
        // Kiểu (c): lưới cột "Lần 1..N" — mỗi dòng 1 ngày, thời gian HH:MM(:SS)
        const dt = ciNormDateTime(get(col.date));
        if (!dt.date) continue;
        const times = punchCols.map(i => ciNormTime(get(i))).filter(Boolean).sort();
        if (!times.length) continue; // ngày không quét (nghỉ) -> bỏ qua
        times.forEach(t => punches.push({ empId: emp.id, date: dt.date, time: t }));
        res.punches += times.length;
      } else {
        // Kiểu (b): từng lần quét — cột Ngày (datetime) chứa cả ngày & giờ
        const dt = ciNormDateTime(get(col.date));
        if (!dt.date || !dt.time) continue;
        punches.push({ empId: emp.id, date: dt.date, time: dt.time });
        res.punches++;
      }
    }
    if (!hasInOut && punches.length) {
      // Gộp lần quét theo NV + ngày (chung cho kiểu b & c)
      const groups = {};
      punches.forEach(p => { (groups[`${p.empId}|${p.date}`] = groups[`${p.empId}|${p.date}`] || []).push(p.time); });
      Object.keys(groups).forEach(k => {
        const [empId, date] = k.split('|');
        const times = [...groups[k]].sort();
        if (upsertCheckin(empId, date, times[0], times.length > 1 ? times[times.length - 1] : '', times.length, fileName, times)) res.added++; else res.updated++;
      });
    }
    res.matched = res.added + res.updated;
    saveHrData();
    return res;
  }
  // Upsert 1 bản ghi giờ máy. Trả về true nếu thêm mới, false nếu cập nhật.
  // punchTimes = ĐỦ danh sách lần quét trong ngày (phục vụ đối chiếu/audit)
  function upsertCheckin(employeeId, date, inT, outT, punchCount, fileName, punchTimes) {
    const rec = (state.hrCheckins || []).find(c => c.employeeId === employeeId && c.date === date);
    const now = new Date().toISOString();
    const times = Array.isArray(punchTimes) ? punchTimes.filter(Boolean) : null;
    if (rec) {
      // Giữ lần quẹt SỚM NHẤT làm giờ vào, MUỘN NHẤT làm giờ ra (file có thể
      // nhiều dòng / nhiều lần quét cho cùng 1 ngày) — nạp lại vẫn idempotent.
      if (inT) rec.in = (rec.in && rec.in < inT) ? rec.in : inT;
      if (outT) rec.out = (rec.out && rec.out > outT) ? rec.out : outT;
      rec.punches = Math.max(Number(rec.punches) || 0, Number(punchCount) || 0, 1);
      rec.fileName = fileName || rec.fileName;
      if (times && times.length) rec.punchTimes = times.slice();
      rec.updatedAt = now;
      return false;
    }
    state.hrCheckins.push({ id: `ci-${date}-${employeeId}`, employeeId, date, in: inT, out: outT,
      punches: punchCount || 1, punchTimes: times || [], fileName: fileName || '', createdAt: now, updatedAt: now });
    return true;
  }
  function checkinRecordOf(employeeId, date) {
    return (state.hrCheckins || []).find(c => c.employeeId === employeeId && c.date === date) || null;
  }

  // Áp dụng 1 ngày theo máy chấm công: tự chấm "Đi làm" (không đụng đơn nghỉ đã duyệt)
  function applyCheckinRecord(employeeId, date) {
    if (!requireEditPermission()) return;
    const rec = checkinRecordOf(employeeId, date);
    if (!rec) return;
    if (attStatusOf(employeeId, date) === 'leave') {
      showToast(`${hrEmpName(employeeId)} ngày ${fmtDateDMY(date)} đang nghỉ CÓ PHÉP (đơn đã duyệt) — không áp dụng theo máy.`, 'info');
      return;
    }
    const hadOld = !!attRecordOf(employeeId, date);
    ensureAttRecord(employeeId, date).status = 'work';
    saveHrData();
    renderHrView();
    showToast(`Đã chấm ĐI LÀM theo máy chấm công: ${hrEmpName(employeeId)} ${fmtDateDMY(date)} (${rec.in || '?'}${rec.out ? '–' + rec.out : ''})${hadOld ? ' (đã đổi từ trạng thái cũ)' : ''}`, 'success');
  }
  // Áp dụng TẤT CẢ ngày máy xác nhận mà chấm tay còn thiếu / lệch
  function applyAllCheckins() {
    if (!requireEditPermission()) return;
    const targets = (state.hrCheckins || []).filter(c => {
      const st = attStatusOf(c.employeeId, c.date);
      return st === '' || st === 'absent';
    });
    if (!targets.length) { showToast('Không có ngày nào cần áp dụng — chấm tay đã khớp máy chấm công.', 'info'); return; }
    if (!confirm(`Áp dụng "Đi làm" theo máy chấm công cho ${targets.length} ngày (ngày còn thiếu hoặc đang ghi Vắng)? Tiếp tục?`)) return;
    targets.forEach(c => {
      const r = ensureAttRecord(c.employeeId, c.date);
      r.status = 'work';
      r.updatedAt = new Date().toISOString();
    });
    saveHrData();
    renderHrView();
    showToast(`Đã áp dụng "Đi làm" theo máy chấm công cho ${targets.length} ngày`, 'success');
  }
  function deleteCheckin(id) {
    if (!requireEditPermission()) return;
    trackDeleted('hrCheckins', id);
    state.hrCheckins = (state.hrCheckins || []).filter(c => c.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa 1 bản ghi giờ máy chấm công', 'info');
  }
  function deleteCheckinsAll() {
    if (!requireEditPermission()) return;
    const n = (state.hrCheckins || []).length;
    if (!n) return;
    if (!confirm(`Xóa toàn bộ ${n} bản ghi giờ đã nạp từ máy chấm công? (Không ảnh hưởng dữ liệu chấm công tay)`)) return;
    trackDeleted('hrCheckins', (state.hrCheckins || []).map(c => c.id));
    state.hrCheckins = [];
    saveHrData();
    renderHrView();
    showToast('Đã xóa toàn bộ dữ liệu giờ máy chấm công đã nạp', 'info');
  }
  // Bảng đối chiếu Bố trí ↔ Máy chấm công — engine + giao diện ở khối 8b bên dưới.
  // Giữ tên cũ để renderHrView / test cũ gọi được.
  function renderHrCheckinTable() { ciRenderCheckinTable(); }

  // ═══════════════════════════════════════════════════════════════
  // 8b) ĐỐI CHIẾU BẢNG BỐ TRÍ ↔ MÁY CHẤM CÔNG
  // ───────────────────────────────────────────────────────────────
  // Quy tắc (chốt 19/10/2026):
  //  • Chấm sớm tối đa < 30 phút: máy cho phép quẹt trước — giờ làm tính TỪ
  //    GIỜ BẮT ĐẦU CA, KHÔNG sinh TC cho phần sớm.
  //  • Tăng ca sau hết ca: mỗi 30 phút mới tính → LÀM TRÒN XUỐNG
  //    (17:59 → 0'; 18:10 → 30'; 18:35 → 60'; 19:30 → 120').
  //  • Ngày nghỉ/lễ (Lịch làm việc tháng): toàn bộ giờ đi làm = TC, KHÔNG tròn.
  //  • Đi muộn / về sớm: hiện số phút THẬT, chỉ gắn cờ khi vượt CI_LATE_TOL_MIN.
  //  • Nghỉ phép cả ngày + có quẹt máy → cờ đỏ; nghỉ theo GIỜ → so phần còn
  //    phải làm (giờ bố trí − số giờ nghỉ).
  //  • Tăng ca: TC máy (đã tròn) ⟷ Σ đơn TC ĐÃ DUYỆT (thiếu / vượt / chưa ĐK).
  //  • Bố trí mà KHÔNG quẹt: chỉ báo khi NGÀY ĐÓ máy có dữ liệu (tránh báo oan
  //    ngày chưa nạp file) và không phải ngày nghỉ theo lịch.
  //  • Ca đêm thiếu giờ ra: ghép lần quẹt sáng sớm NGÀY KẾ TIẾP làm giờ ra.
  //  • Engine CHỈ ĐỌC dữ liệu; chỉ 3 hàm ghi: ciApplyEndFills (điền giờ kết
  //    thúc vào Bảng bố trí), ciAckDay / ciUnackDay (đánh dấu đã xác nhận).
  // ═══════════════════════════════════════════════════════════════
  const CI_EARLY_ALLOW_MIN  = 30; // chấm sớm tối đa (< 30') — tính từ giờ bắt đầu ca
  const CI_OT_BLOCK_MIN     = 30; // mỗi 30 phút mới tính tăng ca (làm tròn XUỐNG)
  const CI_LATE_TOL_MIN     = 5;  // ngưỡng báo đi muộn / về sớm (phút)
  const CI_WORK_DAY_MAX_MIN = 16 * 60;
  const CI_MAX_ROWS         = 400;
  const HR_CI_UI_KEY        = 'bamboo_tracker_hr_ci_ui_v1'; // THUẦN UI THEO MÁY (không mây/backup)
  const CI_VERDICT = {
    ok:           { label: 'Khớp ✓',                         cls: 'ok' },
    late:         { label: 'Đi muộn',                        cls: 'warn' },
    early:        { label: 'Về sớm',                         cls: 'warn' },
    no_out:       { label: 'Thiếu giờ ra',                   cls: 'warn' },
    no_punch:     { label: 'Không quẹt máy',                 cls: 'off' },
    no_plan:      { label: 'Máy có quẹt, chưa bố trí',       cls: 'warn' },
    leave_ok:     { label: 'Nghỉ có phép',                   cls: 'ok' },
    leave_punch:  { label: 'Nghỉ có phép nhưng có quẹt máy', cls: 'off' },
    leave_hours:  { label: 'Nghỉ theo giờ — lệch giờ làm',   cls: 'warn' },
    absent_punch: { label: 'Chấm tay "Vắng"',                cls: 'off' },
    unmarked:     { label: 'Chưa chấm tay',                  cls: 'warn' }
  };
  const CI_OT_LABEL = {
    none: '', ok: 'TC khớp đơn', short: 'TC thiếu so đơn', over: 'TC vượt đơn',
    unregistered: 'TC chưa đăng ký', pending: 'Đơn TC chờ duyệt',
    waiting: 'Chờ giờ ra để đối chiếu TC'
  };

  let ciMachineDaysCache = null;
  let ciEndfillRows = [];
  // ── CHỈ MỤC TẠM theo (NV|ngày) cho 1 lượt vẽ bảng ────────────────
  // Với ~6.000 dòng/tháng, quét tuyến tính từng dòng sẽ là O(n²). Khi
  // ciRowsForRange / ciSuggestEndFills chạy, dựng Map 1 lần rồi tra O(1);
  // gọi lẻ (test, export) thì tự quay về quét tuyến tính như cũ.
  let ciCtx = null;
  function ciBuildCtx() {
    const asgByKey = new Map(), ciByKey = new Map(), attByKey = new Map(), otByKey = new Map(), lvByEmp = new Map();
    (state.hrAssignments || []).forEach(a => {
      if (!a || !a.employeeId || !a.date) return;
      const k = `${a.employeeId}|${a.date}`;
      if (!asgByKey.has(k)) asgByKey.set(k, []);
      asgByKey.get(k).push(a);
    });
    asgByKey.forEach(list => list.sort((x, y) => ciToMin(x.start) - ciToMin(y.start)));
    (state.hrCheckins || []).forEach(c => { if (c && c.employeeId) ciByKey.set(`${c.employeeId}|${c.date}`, c); });
    (state.hrAttendance || []).forEach(a => { if (a && a.employeeId) attByKey.set(`${a.employeeId}|${a.date}`, a); });
    (state.hrOvertimes || []).forEach(o => {
      if (!o || !o.employeeId) return;
      const k = `${o.employeeId}|${o.date}`;
      if (!otByKey.has(k)) otByKey.set(k, []);
      otByKey.get(k).push(o);
    });
    (state.hrLeaves || []).forEach(l => {
      if (!l || !l.employeeId) return;
      if (!lvByEmp.has(l.employeeId)) lvByEmp.set(l.employeeId, []);
      lvByEmp.get(l.employeeId).push(l);
    });
    return { asgByKey, ciByKey, attByKey, otByKey, lvByEmp };
  }
  function ciWithCtx(fn) {
    const prev = ciCtx;
    ciCtx = ciBuildCtx();
    try { return fn(); } finally { ciCtx = prev; }
  }
  function ciCheckinOf(employeeId, date) {
    if (ciCtx) return ciCtx.ciByKey.get(`${employeeId}|${date}`) || null;
    return (state.hrCheckins || []).find(c => c.employeeId === employeeId && c.date === date) || null;
  }
  function ciAttRecordOf(employeeId, date) {
    if (ciCtx) return ciCtx.attByKey.get(`${employeeId}|${date}`) || null;
    return (state.hrAttendance || []).find(a => a.employeeId === employeeId && a.date === date) || null;
  }
  function ciApprovedLeaveOf(employeeId, date) {
    const list = ciCtx ? (ciCtx.lvByEmp.get(employeeId) || [])
      : (state.hrLeaves || []).filter(l => l && l.employeeId === employeeId);
    return list.find(l => (l.status || 'pending') === 'approved' && String(l.from) <= date && date <= String(l.to)) || null;
  }
  function ciAttStatusOf(employeeId, date) {
    const rec = ciAttRecordOf(employeeId, date);
    if (rec && (rec.status === 'work' || rec.status === 'absent')) return rec.status;
    if (ciApprovedLeaveOf(employeeId, date)) return 'leave';
    return '';
  }
  function ciOtListOf(employeeId, date) {
    if (ciCtx) return ciCtx.otByKey.get(`${employeeId}|${date}`) || [];
    return (state.hrOvertimes || []).filter(o => o && o.employeeId === employeeId && o.date === date);
  }


  function ciPad2(n) { return String(n).padStart(2, '0'); }
  function ciToMin(t) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
  function ciFromMin(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${ciPad2(Math.floor(m / 60))}:${ciPad2(m % 60)}`; }
  // Tách HC/TC theo PHÚT + xét ngày nghỉ/lễ (ngày nghỉ → toàn bộ giờ = TC)
  function ciSplitForDate(dept, date, startMin, endMin, shiftIdx) {
    const r = hrSplitHoursHCMin(dept, startMin, endMin, shiftIdx);
    if (date && hrIsRestDay(date) && r.hc > 0) return { hc: 0, tc: r.hc + r.tc };
    return r;
  }
  // Tập NGÀY máy có dữ liệu (để biết ngày nào đã nạp file) — cache theo số bản ghi
  function ciMachineDays() {
    const list = state.hrCheckins || [];
    const sig = `${list.length}|${list[0] ? list[0].date : ''}|${list[list.length - 1] ? list[list.length - 1].date : ''}`;
    if (ciMachineDaysCache && ciMachineDaysCache.sig === sig) return ciMachineDaysCache.set;
    const set = new Set(list.map(c => String(c.date || '')));
    ciMachineDaysCache = { sig, set };
    return set;
  }
  function ciAckOf(employeeId, date) {
    return (state.hrCiAcks || []).find(a => a && a.employeeId === employeeId && a.date === date) || null;
  }
  function ciAssignmentsOn(employeeId, date) {
    if (ciCtx) return ciCtx.asgByKey.get(`${employeeId}|${date}`) || [];
    return (state.hrAssignments || [])
      .filter(a => a && a.employeeId === employeeId && a.date === date)
      .slice().sort((x, y) => ciToMin(x.start) - ciToMin(y.start));
  }
  // Giờ BỐ TRÍ của 1 NV trong ngày: khung sớm nhất → muộn nhất + HC/TC + ca
  function ciPlannedOf(employeeId, date) {
    const em = hrEmpById(employeeId);
    const dept0 = em && em.department ? em.department : '';
    const list = ciAssignmentsOn(employeeId, date);
    let hc = 0, tc = 0, startMin = null, endMin = null;
    const shifts = new Set();
    list.forEach(a => {
      const ad = a.department || dept0;
      const r = hrSplitHoursHCDate(ad, date, a.start, a.end, a.shiftIdx || 0);
      hc += r.hc; tc += r.tc;
      const range = hrShiftRange(hrShiftCfg(ad), a.shiftIdx || 0);
      const s = ciToMin(a.start) || range.startMin;
      let e = ciToMin(a.end);
      if (!e || e <= s) e = (e && e < s) ? e + 1440 : range.endMin;
      if (e <= s) e += 1440;
      startMin = startMin === null ? s : Math.min(startMin, s);
      endMin = endMin === null ? e : Math.max(endMin, e);
      shifts.add(`${a.shiftIdx || 0}|${ad}`);
    });
    return {
      assignments: list, hasPlan: list.length > 0, dept: dept0,
      startMin, endMin, hc, tc,
      shiftIdx: list.length ? (list[0].shiftIdx || 0) : 0,
      multiShift: shifts.size > 1
    };
  }
  // Đoán CA khi ngày đó KHÔNG có bố trí (bảng chấm công tháng dùng): chọn ca có
  // giờ bắt đầu gần giờ quẹt nhất (Hành chính luôn ca 0)
  function ciShiftGuess(dept, inMin) {
    const cfg = hrShiftCfg(dept);
    if (cfg.type !== 'lamca') return 0;
    let best = 0, bestDiff = Infinity;
    (cfg.shifts || []).forEach((s, i) => {
      const r = hrShiftRange(cfg, i);
      const startRel = r.startMin % 1440;
      const diff = Math.min(Math.abs(inMin - startRel), 1440 - Math.abs(inMin - startRel));
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    return best;
  }
  function ciOtOf(employeeId, date) {
    const list = ciOtListOf(employeeId, date);
    const approved = list.filter(o => (o.status || 'pending') === 'approved');
    const pending = list.filter(o => (o.status || 'pending') === 'pending');
    const approvedMin = approved.reduce((s, o) => s + (Number(o.plannedMin) || Math.max(0, ciToMin(o.end) - ciToMin(o.start))), 0);
    let earlyStartMin = null;
    approved.forEach(o => {
      const st = ciToMin(o.start);
      if (st && (earlyStartMin === null || st < earlyStartMin)) earlyStartMin = st;
    });
    return { list, approved, pending, approvedMin, earlyStartMin };
  }

  // Giờ THỰC TẾ của 1 NV trong ngày (từ máy): HC/TC đã áp quy tắc 30' + ca đêm
  function ciActualSplit(employeeId, date, planIn) {
    const rec = ciCheckinOf(employeeId, date);
    const plan = planIn || ciPlannedOf(employeeId, date);
    const dept = plan.dept || hrEmpDept(employeeId);
    const inMin0 = rec ? ciToMin(rec.in) : 0;
    let outMin0 = rec ? ciToMin(rec.out) : 0;
    let crossNight = false;
    if (!outMin0 && inMin0) {
      // Ca đêm: lần quẹt SÁNG SỚM ngày kế tiếp chính là giờ ra
      const cfg0 = hrShiftCfg(dept);
      const idx0 = plan.hasPlan ? plan.shiftIdx : ciShiftGuess(dept, inMin0 % 1440);
      const range0 = hrShiftRange(cfg0, idx0);
      if (cfg0.type === 'lamca' && range0.endMin > 1440) {
        const next = ciCheckinOf(employeeId, hrShiftDateISO(date, 1));
        const nIn = next ? ciToMin(next.in) : 0;
        if (nIn && nIn <= 12 * 60) { outMin0 = nIn + 1440; crossNight = true; }
      }
    }
    if (!inMin0 && !outMin0) {
      return { hasPunch: false, incomplete: true, inMin: 0, outMin: 0, hc: null, tc: null,
        tcRaw: null, workedMin: null, dept, shiftIdx: 0, crossNight: false,
        flags: [], lateMin: 0, earlyOutMin: 0, planStart: 0 };
    }
    const shiftIdx = plan.hasPlan ? plan.shiftIdx : ciShiftGuess(dept, (inMin0 || outMin0) % 1440);
    const range = hrShiftRange(hrShiftCfg(dept), shiftIdx);
    const planStart = plan.hasPlan ? plan.startMin : range.startMin;
    const ot = ciOtOf(employeeId, date);
    const flags = [];
    // ── CHẤM SỚM: máy cho phép quẹt trước < 30' → tính từ giờ bắt đầu ca.
    // Nếu có ĐƠN TĂNG CA đã duyệt bắt đầu TRƯỚC ca thì giữ phần trong đơn.
    let inMin = inMin0;
    if (inMin && planStart && inMin < planStart) {
      const early = planStart - inMin;
      if (ot.earlyStartMin != null && ot.earlyStartMin < planStart) {
        inMin = Math.max(inMin, ot.earlyStartMin);
      } else {
        inMin = planStart;
      }
      if (early >= CI_EARLY_ALLOW_MIN) flags.push('early_punch');
    }
    const incomplete = !outMin0;
    let hc = null, tc = null, tcRaw = null, workedMin = null;
    if (inMin && outMin0) {
      let outMin = outMin0;
      if (outMin <= inMin) outMin += 1440;
      workedMin = outMin - inMin;
      const r = ciSplitForDate(dept, date, inMin, outMin, shiftIdx);
      hc = r.hc; tcRaw = r.tc;
      // TC tính theo khối 30' — ngày nghỉ/lễ giữ nguyên (đó là ngày công)
      tc = hrIsRestDay(date) ? r.tc : Math.floor(r.tc / CI_OT_BLOCK_MIN) * CI_OT_BLOCK_MIN;
    }
    return {
      hasPunch: true, incomplete, inMin, outMin: outMin0,
      inRaw: inMin0, outRaw: rec ? ciToMin(rec.out) : 0,
      hc, tc, tcRaw, workedMin, dept, shiftIdx, crossNight, flags, planStart,
      lateMin: (plan.hasPlan && inMin0 && plan.startMin) ? Math.max(0, inMin0 - plan.startMin) : 0,
      earlyOutMin: (plan.hasPlan && outMin0 && plan.endMin) ? Math.max(0, plan.endMin - outMin0) : 0
    };
  }

  // Đơn nghỉ ĐÃ DUYỆT phủ ngày — tách cả ngày / theo giờ
  function ciLeaveInfoOf(employeeId, date) {
    const lv = ciApprovedLeaveOf(employeeId, date);
    if (!lv) return null;
    const mode = lv.durationMode || 'full';
    let hours = 0;
    if (mode === 'hours') hours = Number(lv.hours) || 0;
    else if (mode === 'half') hours = Number(lv.hours) || LEAVE_WORK_HOURS_PER_DAY / 2;
    return {
      leave: lv, mode, hours,
      fullDay: mode === 'full' || !hours,
      label: leaveDurationText(lv)
    };
  }

  // ĐỐI CHIẾU 1 NGÀY: bố trí ⟷ máy ⟷ chấm tay ⟷ nghỉ phép ⟷ tăng ca
  function ciCompareDay(employeeId, date) {
    const plan = ciPlannedOf(employeeId, date);
    const rec = ciCheckinOf(employeeId, date);
    const act = ciActualSplit(employeeId, date, plan);
    const leave = ciLeaveInfoOf(employeeId, date);
    const att = ciAttStatusOf(employeeId, date);
    const ot = ciOtOf(employeeId, date);
    const ack = ciAckOf(employeeId, date);
    const machineHas = ciMachineDays().has(String(date));
    const flags = [];
    let verdict = 'ok';
    if (leave && leave.fullDay && rec) { verdict = 'leave_punch'; flags.push('leave_punch'); }
    else if (leave && leave.fullDay) { verdict = 'leave_ok'; }
    else if (plan.hasPlan && !rec && machineHas && !hrIsRestDay(date)) { verdict = 'no_punch'; flags.push('no_punch'); }
    else if (rec && !rec.out && act.incomplete) { verdict = 'no_out'; flags.push('no_out'); }
    else if (att === 'absent' && rec) { verdict = 'absent_punch'; flags.push('absent_punch'); }
    else {
      // Ngày KHÔNG có bố trí nhưng đã chấm tay "Đi làm" → coi là khớp (chỉ nhắc
      // nhẹ "chưa bố trí"), tránh báo động cả tháng khi Bảng bố trí chưa nhập.
      if (!plan.hasPlan && rec) flags.push('no_plan_info');
      if (!plan.hasPlan && rec && att !== 'work') { verdict = 'no_plan'; flags.push('no_plan'); }
      // Nghỉ THEO GIỜ: không so "về sớm" theo giờ hết ca (nghỉ buổi chiều là đúng)
      const partialLeave = !!(leave && !leave.fullDay);
      if (!partialLeave && act.lateMin > CI_LATE_TOL_MIN) { verdict = 'late'; flags.push('late'); }
      if (!partialLeave && act.earlyOutMin > CI_LATE_TOL_MIN) { if (verdict === 'ok') verdict = 'early'; flags.push('early'); }
      if (rec && att === '' && !leave) { if (verdict === 'ok') verdict = 'unmarked'; flags.push('unmarked'); }
      if (act.flags && act.flags.indexOf('early_punch') !== -1) flags.push('early_punch');
    }
    // Nghỉ theo GIỜ — so phần còn phải làm
    let leaveDeltaMin = 0;
    if (leave && !leave.fullDay && act.workedMin != null && plan.hasPlan) {
      const expected = plan.hc + plan.tc - Math.round(leave.hours * 60);
      leaveDeltaMin = act.workedMin - expected;
      if (Math.abs(leaveDeltaMin) > CI_LATE_TOL_MIN) {
        flags.push('leave_mismatch');
        if (verdict === 'ok' || verdict === 'unmarked') verdict = 'leave_hours';
      }
    }
    // Tăng ca: TC máy ⟷ Σ đơn đã duyệt
    let otStatus = 'none';
    if (ot.pending.length) otStatus = 'pending';
    if (ot.approvedMin > 0) {
      if (act.incomplete) otStatus = 'waiting';
      else {
        const d = (act.tc || 0) - ot.approvedMin;
        otStatus = d < -(CI_OT_BLOCK_MIN / 2) ? 'short' : (d > (CI_OT_BLOCK_MIN / 2) ? 'over' : 'ok');
      }
    } else if ((act.tc || 0) > 0 && !ot.pending.length) {
      otStatus = 'unregistered';
    }
    const otDelta = (act.tc || 0) - ot.approvedMin;
    const needsReview = !ack && (
      ['late', 'early', 'no_out', 'no_punch', 'no_plan', 'leave_punch', 'absent_punch',
        'unmarked', 'leave_hours'].indexOf(verdict) !== -1
      || ['short', 'over', 'unregistered', 'pending'].indexOf(otStatus) !== -1
      || flags.indexOf('early_punch') !== -1
    );
    const em = hrEmpById(employeeId);
    return {
      employeeId, employeeName: hrEmpName(employeeId), dept: hrEmpDept(employeeId),
      empCode: em ? (em.code || '') : '', date, rec, plan, actual: act, leave, att, ot,
      otStatus, otDelta, ack, verdict, flags, needsReview, machineHas, leaveDeltaMin,
      timeText: rec ? `${rec.in || '?'}${rec.out ? '–' + rec.out : ''}` : ''
    };
  }

  // ── DANH SÁCH DÒNG ĐỐI CHIẾU (hợp của Bố trí ∪ Giờ máy ∪ Đơn tăng ca) ──
  function ciRowsForRange(from, to, opts) {
    return ciWithCtx(() => ciRowsForRangeInner(from, to, opts));
  }
  function ciRowsForRangeInner(from, to, opts) {
    const o = opts || {};
    const inRange = d => (!from || d >= from) && (!to || d <= to);
    const keys = new Map();
    const add = (empId, date) => {
      if (!empId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return;
      if (!inRange(date)) return;
      keys.set(`${empId}|${date}`, { employeeId: empId, date });
    };
    (state.hrAssignments || []).forEach(a => add(a.employeeId, a.date));
    (state.hrCheckins || []).forEach(c => add(c.employeeId, c.date));
    (state.hrOvertimes || []).forEach(ov => add(ov.employeeId, ov.date));
    // Ngày nghỉ có phép (chỉ khi bật "Hiện ngày nghỉ có phép")
    if (o.includeLeave) {
      (state.hrLeaves || []).forEach(l => {
        if (!l || (l.status || 'pending') !== 'approved') return;
        const d0 = String(l.from || '');
        const d1 = String(l.to || l.from || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d0) || !/^\d{4}-\d{2}-\d{2}$/.test(d1)) return;
        if (from && d1 < from) return;
        if (to && d0 > to) return;
        let d = d0, guard = 0;
        for (; d <= d1 && guard < 400; d = hrShiftDateISO(d, 1), guard++) {
          if (inRange(d)) add(l.employeeId, d);
        }
      });
    }
    const dept = o.dept || 'all';
    const q = hrStripDiacritics(o.q || '');
    let rows = [];
    keys.forEach(k => {
      const em = hrEmpById(k.employeeId);
      if (dept !== 'all' && (!em || (em.department || '—') !== dept)) return;
      if (q) {
        const hay = hrStripDiacritics(`${em ? em.name : ''} ${em ? em.code : ''} ${k.date} ${(em && em.department) || ''}`);
        if (hay.indexOf(q) === -1) return;
      }
      rows.push(ciCompareDay(k.employeeId, k.date));
    });
    if (!o.includeLeave) rows = rows.filter(r => r.verdict !== 'leave_ok');
    if (o.onlyIssues) rows = rows.filter(r => r.needsReview);
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) ||
      String(a.employeeName).localeCompare(String(b.employeeName), 'vi'));
    return rows;
  }

  function ciSummaryOf(rows) {
    const s = { total: rows.length, ok: 0, review: 0, late: 0, early: 0, noOut: 0,
      noPunch: 0, noPlan: 0, leavePunch: 0, absent: 0, otDiff: 0, ack: 0 };
    rows.forEach(r => {
      if (r.ack) s.ack++;
      if (r.needsReview) s.review++;
      if (!r.ack && r.verdict === 'ok') s.ok++;
      if (r.flags.indexOf('late') !== -1) s.late++;
      if (r.flags.indexOf('early') !== -1) s.early++;
      if (r.verdict === 'no_out') s.noOut++;
      if (r.verdict === 'no_punch') s.noPunch++;
      if (r.verdict === 'no_plan') s.noPlan++;
      if (r.verdict === 'leave_punch') s.leavePunch++;
      if (r.verdict === 'absent_punch') s.absent++;
      if (['short', 'over', 'unregistered', 'pending'].indexOf(r.otStatus) !== -1) s.otDiff++;
    });
    return s;
  }

  // ── TRẠNG THÁI BỘ LỌC (nhớ theo MÁY — thuần UI, không mây/backup) ──
  function ciUiSaved() {
    try { return JSON.parse(localStorage.getItem(HR_CI_UI_KEY)) || {}; } catch (e) { return {}; }
  }
  function ciSaveUi(patch) {
    try { localStorage.setItem(HR_CI_UI_KEY, JSON.stringify(Object.assign({}, ciUiSaved(), patch || {}))); } catch (e) {}
  }
  function ciMonthRange(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return { from: '', to: '' };
    const [y, m] = month.split('-').map(Number);
    const n = new Date(y, m, 0).getDate();
    return { from: `${month}-01`, to: `${month}-${ciPad2(n)}` };
  }
  // Tháng mặc định = tháng có dữ liệu (máy hoặc bố trí) MỚI NHẤT — mở thẻ là thấy ngay
  function ciDefaultMonth() {
    const ds = (state.hrCheckins || []).map(c => String(c.date || '').slice(0, 7))
      .concat((state.hrAssignments || []).map(a => String(a.date || '').slice(0, 7)))
      .filter(m => /^\d{4}-\d{2}$/.test(m)).sort();
    return ds.length ? ds[ds.length - 1] : hrTodayISO().slice(0, 7);
  }
  function ciReadUi() {
    const gv = id => { const el = document.getElementById(id); return el ? String(el.value || '') : ''; };
    const saved = ciUiSaved();
    // KỲ = tháng đã lưu (đổi qua select/nút ‹ › đều ghi vào đây); chưa có → tháng
    // có dữ liệu máy MỚI NHẤT. KHÔNG đọc thẳng value của ô month (ô chỉ là hiển thị
    // — nếu đọc, dữ liệu của tháng khác vừa nạp sẽ bị lọc mất).
    const month = /^\d{4}-\d{2}$/.test(saved.month || '') ? saved.month : ciDefaultMonth();
    // Bộ phận: ưu tiên lựa chọn đã lưu (mọi thay đổi đều được ghi lại) — ô select
    // trên giao diện chỉ là hiển thị, tránh bị snap về "Tất Cả" khi render lại.
    let dept = saved.dept || gv('hr-ci-filter-dept') || 'all';
    // Bộ phận đã lưu không còn nhân viên nào → về "Tất Cả" (tránh bảng trống khó hiểu)
    if (dept !== 'all' && !(state.hrEmployees || []).some(e => (e.department || '—') === dept)) dept = 'all';
    const onlyEl = document.getElementById('hr-ci-only-issues');
    const leaveEl = document.getElementById('hr-ci-show-leave');
    return {
      month, dept, q: gv('hr-ci-search'),
      onlyIssues: onlyEl ? !!onlyEl.checked : true,
      includeLeave: leaveEl ? !!leaveEl.checked : false
    };
  }
  function ciSyncToolbar(ui) {
    const mEl = document.getElementById('hr-ci-month');
    if (mEl && mEl.value !== ui.month) mEl.value = ui.month;
    const dEl = document.getElementById('hr-ci-filter-dept');
    if (dEl && ui.dept && dEl.value !== ui.dept) dEl.value = ui.dept;
    const qEl = document.getElementById('hr-ci-search');
    if (qEl && !qEl.value && ui.q) qEl.value = ui.q;
  }
  function ciShiftMonth(delta) {
    const ui = ciReadUi();
    const [y, m] = ui.month.split('-').map(Number);
    const d = new Date(y, m - 1 + Number(delta || 0), 1);
    const month = `${d.getFullYear()}-${ciPad2(d.getMonth() + 1)}`;
    const el = document.getElementById('hr-ci-month');
    if (el) el.value = month;
    ciSaveUi({ month });
    renderHrCheckinTable();
  }

  // ── Ô HIỂN THỊ ─────────────────────────────────────────────────
  function ciChip(label, cls, title) {
    return `<span class="hr-chip ${escapeHTML(cls || '')}"${title ? ` title="${escapeHTML(title)}"` : ''}>${escapeHTML(label)}</span>`;
  }
  function ciPlanCell(r) {
    if (!r.plan.hasPlan) return '<span class="ci-none">— chưa bố trí —</span>';
    const items = r.plan.assignments.map(a => {
      const range = hrShiftRange(hrShiftCfg(a.department || r.dept), a.shiftIdx || 0);
      const time = `${fmtHour(a.start)}${a.end ? '–' + fmtHour(a.end) : ' → hết ca (' + fmtHour(range.end) + ')'}`;
      return `<span class="ci-plan-item" title="${escapeHTML(hrPosName(a.positionId) + ' · ' + time)}">
        <strong>${escapeHTML(hrPosName(a.positionId))}</strong> ${escapeHTML(time)}</span>`;
    }).join('');
    const total = r.plan.hc + r.plan.tc;
    return `<div class="ci-plan-list">${items}</div>
      <div class="ci-sub">Bố trí <strong>${escapeHTML(fmtHm(total))}</strong>${r.plan.tc ? ` · HC ${escapeHTML(fmtHm(r.plan.hc))} + TC ${escapeHTML(fmtHm(r.plan.tc))}` : ''}</div>`;
  }
  function ciMachineCell(r) {
    if (!r.rec) return '<span class="ci-none ci-none-off">Không quẹt máy</span>';
    const extras = [];
    if (r.rec.punches > 2) extras.push(`${r.rec.punches} lần quét`);
    if (r.actual.crossNight) extras.push('ghép qua đêm');
    if (r.actual.incomplete) extras.push('thiếu giờ ra');
    return `<span class="hr-emp-code">${escapeHTML(r.timeText)}</span>` +
      (extras.length ? `<div class="ci-sub">${escapeHTML(extras.join(' · '))}</div>` : '');
  }
  function ciActualCell(r) {
    const a = r.actual;
    if (!a.hasPunch) return '<span class="ci-none">—</span>';
    if (a.hc == null) return '<span class="ci-none">— chờ giờ ra —</span>';
    const rounded = (a.tcRaw != null && a.tc != null && a.tc !== a.tcRaw)
      ? `<div class="ci-sub">TC gốc ${escapeHTML(fmtHm(a.tcRaw))} → tròn 30' = ${escapeHTML(fmtHm(a.tc))}</div>` : '';
    return `<strong>HC ${escapeHTML(fmtHm(a.hc))}</strong> · <strong>TC ${escapeHTML(fmtHm(a.tc))}</strong>${rounded}`;
  }
  function ciDiffCell(r) {
    const v = CI_VERDICT[r.verdict] || CI_VERDICT.ok;
    let html = ciChip(v.label, v.cls, r.needsReview ? 'Cần xác nhận' : (r.ack ? 'Đã xác nhận' : 'Khớp'));
    if (r.verdict === 'late' && r.actual.lateMin) html += ` <span class="ci-min">+${r.actual.lateMin}'</span>`;
    if (r.flags.indexOf('early') !== -1 && r.actual.earlyOutMin) html += ` <span class="ci-min">−${r.actual.earlyOutMin}'</span>`;
    if (r.flags.indexOf('early_punch') !== -1) html += ` <span class="ci-min ci-min-hint" title="Quẹt sớm hơn giờ bắt đầu ca từ 30 phút trở lên">quẹt sớm</span>`;
    if (r.flags.indexOf('no_plan_info') !== -1) html += ` <span class="ci-min ci-min-hint" title="Ngày này chưa có bố trí trong Bảng bố trí — chỉ để tham khảo, không tính là lỗi khi chấm tay đã Đi làm">chưa bố trí</span>`;
    if (r.flags.indexOf('leave_mismatch') !== -1) {
      html += ` <span class="ci-min ci-min-hint" title="Giờ làm thực tế lệch với phần còn phải làm sau khi trừ giờ nghỉ">lệch ${escapeHTML(fmtHm(Math.abs(r.leaveDeltaMin || 0)))}</span>`;
    }
    if (r.ack) html += ` <span class="ci-ack-chip" title="${escapeHTML('Xác nhận bởi ' + (r.ack.by || '') + (r.ack.at ? ' lúc ' + String(r.ack.at).slice(0, 16).replace('T', ' ') : '') + (r.ack.note ? ' — ' + r.ack.note : ''))}">✓ đã xác nhận</span>`;
    return html;
  }
  function ciLeaveOtCell(r) {
    const parts = [];
    if (r.leave) {
      const title = `${r.leave.label}${r.leave.fullDay ? '' : ' — còn phải làm ' + fmtHm(Math.max(0, r.plan.hc + r.plan.tc - Math.round(r.leave.hours * 60)))}`
        + (r.leave.leave.approvedBy ? ' · duyệt bởi ' + r.leave.leave.approvedBy : '');
      parts.push(ciChip(r.leave.label, r.leave.fullDay ? 'ok' : 'warn', title));
    }
    if (r.ot.approvedMin > 0) parts.push(ciChip(`TC đơn ${fmtHm(r.ot.approvedMin)}`, 'warn', 'Tổng giờ tăng ca đã được duyệt trong ngày'));
    if (r.ot.pending.length) {
      const pendMin = r.ot.pending.reduce((s, o) => s + (Number(o.plannedMin) || 0), 0);
      parts.push(ciChip(`TC chờ duyệt ${fmtHm(pendMin)}`, 'warn', 'Đơn tăng ca chưa được duyệt'));
    }
    if (r.otStatus === 'short' || r.otStatus === 'over') {
      const sign = r.otDelta > 0 ? '+' : '−';
      parts.push(ciChip(`${CI_OT_LABEL[r.otStatus]} ${sign}${fmtHm(Math.abs(r.otDelta))}`, r.otDelta > 0 ? 'warn' : 'off',
        `Máy ${fmtHm(r.actual.tc || 0)} · đơn ${fmtHm(r.ot.approvedMin)}`));
    } else if (r.otStatus === 'unregistered') {
      parts.push(ciChip(CI_OT_LABEL.unregistered, 'off', `Máy ${fmtHm(r.actual.tc || 0)} nhưng chưa có đơn tăng ca được duyệt`));
    } else if (r.otStatus === 'pending') {
      if (!r.ot.pending.length) parts.push(ciChip(CI_OT_LABEL.pending, 'warn'));
    }
    return parts.length ? parts.join(' ') : '<span class="ci-none">—</span>';
  }
  function ciActionCell(r) {
    const btns = [];
    const canApply = r.rec && !r.leave && (r.att === '' || r.att === 'absent');
    if (canApply) {
      btns.push(`<button class="btn btn-success btn-sm" data-perm="hr" onclick="app.hrApplyCheckin('${escapeHTML(r.employeeId)}','${escapeHTML(r.date)}')" title="Chấm tay thành Đi làm theo máy"><i data-lucide="check"></i> Áp Dụng</button>`);
    }
    if (r.ack) {
      btns.push(`<button class="btn btn-outline btn-sm" data-ci-unack="1" data-ci-emp="${escapeHTML(r.employeeId)}" data-ci-date="${escapeHTML(r.date)}" title="Bỏ đánh dấu đã xác nhận" style="color:var(--text-muted);"><i data-lucide="undo-2"></i></button>`);
    } else {
      btns.push(`<button class="btn btn-outline btn-sm" data-ci-ack="1" data-ci-emp="${escapeHTML(r.employeeId)}" data-ci-date="${escapeHTML(r.date)}" data-manager-only title="Xác nhận đã kiểm tra dòng này (không còn tính vào 'cần xác nhận')"><i data-lucide="badge-check"></i> Xác Nhận</button>`);
    }
    if (r.rec) {
      btns.push(`<button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrDeleteCheckin('${escapeHTML(r.rec.id)}')" title="Xóa bản ghi giờ này" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>`);
    }
    return `<div class="ci-actions">${btns.join('')}</div>`;
  }

  // ── RENDER BẢNG ĐỐI CHIẾU ──────────────────────────────────────
  function ciRenderCheckinTable() {
    const tbody = document.getElementById('hr-ci-body');
    if (!tbody) return;
    const ui = ciReadUi();
    ciSyncToolbar(ui);
    const range = ciMonthRange(ui.month);
    const allRows = ciRowsForRange(range.from, range.to, Object.assign({}, ui, { onlyIssues: false }));
    const sum = ciSummaryOf(allRows);
    const rows = ui.onlyIssues ? allRows.filter(r => r.needsReview) : allRows;
    const countEl = document.getElementById('hr-ci-count');
    if (countEl) {
      countEl.textContent = `${allRows.length} dòng · ${sum.review} cần xác nhận`
        + (sum.ack ? ` · ${sum.ack} đã xác nhận` : '');
    }
    const chipsEl = document.getElementById('hr-ci-chips');
    if (chipsEl) {
      const chip = (label, n, cls) => n ? `<span class="hr-stat-chip${cls ? ' ' + cls : ''}">${escapeHTML(label)}: <strong>${n}</strong></span>` : '';
      chipsEl.innerHTML =
        `<span class="hr-stat-chip"><i data-lucide="rows-3"></i> Tổng: <strong>${allRows.length}</strong></span>` +
        chip('Khớp', sum.ok) + chip('Cần xác nhận', sum.review, 'is-warn') +
        chip('Đi muộn', sum.late) + chip('Về sớm', sum.early) +
        chip('Thiếu giờ ra', sum.noOut) + chip('Không quẹt máy', sum.noPunch) +
        chip('Chưa bố trí', sum.noPlan) + chip('Nghỉ có quẹt', sum.leavePunch) +
        chip('Chấm tay Vắng', sum.absent) + chip('TC lệch', sum.otDiff);
    }
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="clock" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>${allRows.length ? 'Không có dòng nào cần xác nhận trong kỳ này — bỏ tích “Chỉ dòng cần xác nhận” để xem tất cả.' : 'Chưa có dữ liệu trong kỳ. Bấm “Nạp Giờ Máy” để chọn file Excel máy chấm công xuất ra.'}</p></td></tr>`;
      initLucide();
      return;
    }
    const shown = rows.slice(0, CI_MAX_ROWS);
    tbody.innerHTML = shown.map(r => `<tr class="${r.needsReview ? 'ci-row-review' : ''}">
        <td><strong>${escapeHTML(r.employeeName)}</strong><br><span class="ci-sub">${escapeHTML(r.dept || '—')}${r.empCode ? ' · ' + escapeHTML(r.empCode) : ''}</span></td>
        <td>${escapeHTML(fmtDateDMY(r.date))}</td>
        <td>${ciPlanCell(r)}</td>
        <td>${ciMachineCell(r)}</td>
        <td>${ciActualCell(r)}</td>
        <td>${ciDiffCell(r)}</td>
        <td>${ciLeaveOtCell(r)}</td>
        <td class="text-right">${ciActionCell(r)}</td>
      </tr>`).join('') +
      (rows.length > CI_MAX_ROWS
        ? `<tr><td colspan="8" class="text-center" style="color:var(--text-muted);padding:12px;">Đang hiện ${CI_MAX_ROWS}/${rows.length} dòng — dùng bộ lọc (tháng / bộ phận / tìm nhanh) để xem tiếp.</td></tr>`
        : '');
    initLucide();
  }

  // ── TỰ ĐIỀN GIỜ KẾT THÚC THỰC TẾ VÀO BẢNG BỐ TRÍ ───────────────
  // Chỉ: ngày TRƯỚC hôm nay · lô đang để trống `end` · là LƯỢT BỐ TRÍ CUỐI
  // của ngày · có giờ ra từ máy · thời lượng hợp lý. KHÔNG ghi đè ô đã nhập.
  function ciSuggestEndFills(opts) {
    return ciWithCtx(() => ciSuggestEndFillsInner(opts));
  }
  function ciSuggestEndFillsInner(opts) {
    const o = opts || {};
    const today = hrTodayISO();
    const from = o.from || '', to = o.to || '';
    const deptFilter = o.dept || 'all';
    const round = !!o.round;
    const out = [];
    (state.hrAssignments || []).forEach(a => {
      if (!a || a.end) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a.date || ''))) return;
      if (a.date >= today) return;                       // chỉ ngày đã qua
      if (from && a.date < from) return;
      if (to && a.date > to) return;
      const em = hrEmpById(a.employeeId);
      if (deptFilter !== 'all' && (!em || (em.department || '—') !== deptFilter)) return;
      const rec = ciCheckinOf(a.employeeId, a.date);
      if (!rec || !rec.out) return;                      // chưa có giờ ra → chờ file sau
      const list = ciAssignmentsOn(a.employeeId, a.date);
      if (!list.length || list[list.length - 1].id !== a.id) return; // chỉ lượt cuối
      const dept = a.department || (em && em.department) || '';
      const range = hrShiftRange(hrShiftCfg(dept), a.shiftIdx || 0);
      const startM = ciToMin(a.start) || range.startMin;
      let outM = ciToMin(rec.out);
      if (!outM) return;
      if (outM <= startM) outM += 1440;
      const dur = outM - startM;
      if (dur < CI_OT_BLOCK_MIN || dur > CI_WORK_DAY_MAX_MIN) return;
      // Làm tròn: TỔNG thời lượng làm việc xuống khối 30' (khớp quy tắc TC)
      const newEndM = round ? startM + Math.floor(dur / CI_OT_BLOCK_MIN) * CI_OT_BLOCK_MIN : outM;
      let oldEndM = ciToMin(a.end);
      if (!oldEndM || oldEndM <= startM) oldEndM = range.endMin;
      if (oldEndM <= startM) oldEndM += 1440;
      const before = ciSplitForDate(dept, a.date, startM, oldEndM, a.shiftIdx || 0);
      const after = ciSplitForDate(dept, a.date, startM, newEndM, a.shiftIdx || 0);
      out.push({
        assignId: a.id, employeeId: a.employeeId, employeeName: hrEmpName(a.employeeId),
        dept: em ? (em.department || '') : '', date: a.date,
        positionName: hrPosName(a.positionId),
        startText: fmtHour(a.start), oldEndText: `hết ca (${fmtHour(range.end)})`,
        newEnd: ciFromMin(newEndM % 1440), punchOut: rec.out,
        deltaMin: newEndM - oldEndM, before, after
      });
    });
    out.sort((x, y) => String(y.date).localeCompare(String(x.date)) ||
      String(x.employeeName).localeCompare(String(y.employeeName), 'vi'));
    return out;
  }

  // Ghi giờ kết thúc vào Bảng bố trí — KHÔNG đụng ô đã có `end`
  function ciApplyEndFills(list) {
    if (!requireEditPermission()) return 0;
    const rows = Array.isArray(list) ? list : [];
    if (!rows.length) return 0;
    const now = new Date().toISOString();
    let n = 0;
    rows.forEach(it => {
      const a = (state.hrAssignments || []).find(x => x.id === it.assignId);
      if (!a || a.end) return;
      a.end = it.newEnd;
      a.endSource = 'machine';   // đánh dấu: giờ kết thúc lấy từ máy chấm công
      a.updatedAt = now;
      n++;
    });
    if (n) { saveHrData(); renderHrView(); }
    return n;
  }

  // Modal xem trước "Điền Giờ Kết Thúc" (bắt buộc xem trước — đổi giờ công đoạn)
  function openCiEndfillModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-ci-endfill');
    if (!modal) return;
    const f = document.getElementById('ci-endfill-from');
    if (f && !f.value) f.value = '';
    const t = document.getElementById('ci-endfill-to');
    if (t && !t.value) t.value = hrShiftDateISO(hrTodayISO(), -1);
    renderCiEndfillList();
    modal.classList.add('show');
    initLucide();
  }
  function closeCiEndfillModal() {
    document.getElementById('modal-ci-endfill')?.classList.remove('show');
  }
  function renderCiEndfillList() {
    const body = document.getElementById('ci-endfill-body');
    if (!body) return;
    const round = (document.getElementById('ci-endfill-round')?.value || 'exact') === 'round30';
    const from = document.getElementById('ci-endfill-from')?.value || '';
    const to = document.getElementById('ci-endfill-to')?.value || '';
    const dept = document.getElementById('hr-ci-filter-dept')?.value || 'all';
    ciEndfillRows = ciSuggestEndFills({ from, to, dept, round });
    const sumEl = document.getElementById('ci-endfill-summary');
    if (sumEl) {
      sumEl.innerHTML = ciEndfillRows.length
        ? `<span class="hr-stat-chip"><i data-lucide="list-checks"></i> <strong>${ciEndfillRows.length}</strong> lượt bố trí đang để trống giờ kết thúc &amp; đã có giờ ra từ máy</span>
           <span class="hr-stat-chip"><i data-lucide="info"></i> Chỉ áp dụng cho <strong>ngày trước hôm nay</strong> · lượt bố trí <strong>cuối</strong> của ngày · không đè ô đã nhập tay</span>`
        : `<div style="padding:10px 12px;background:var(--bg-subtle);border:1px solid var(--border-color);border-radius:var(--radius-md);font-size:0.78rem;color:var(--text-muted);">
             Không có lượt bố trí nào cần điền. (Cần: ngày đã qua + ô “Giờ kết thúc” đang để trống + máy đã có giờ ra.)</div>`;
    }
    body.innerHTML = ciEndfillRows.length ? ciEndfillRows.map(r => `<tr>
        <td class="text-center"><input type="checkbox" data-ci-fill="${escapeHTML(r.assignId)}" checked></td>
        <td><strong>${escapeHTML(r.employeeName)}</strong><br><span class="ci-sub">${escapeHTML(r.dept || '—')}</span></td>
        <td>${escapeHTML(fmtDateDMY(r.date))}</td>
        <td>${escapeHTML(r.positionName)}</td>
        <td>${escapeHTML(r.startText)} → ${escapeHTML(r.oldEndText)}</td>
        <td class="hr-emp-code">…${escapeHTML(r.punchOut)}</td>
        <td><strong>${escapeHTML(r.startText)}–${escapeHTML(r.newEnd)}</strong><div class="ci-sub">HC ${escapeHTML(fmtHm(r.before.hc))}/${escapeHTML(fmtHm(r.after.hc))} · TC ${escapeHTML(fmtHm(r.before.tc))}/${escapeHTML(fmtHm(r.after.tc))}</div></td>
      </tr>`).join('') : `<tr><td colspan="7" class="text-center" style="padding:20px;color:var(--text-muted);">— không có dòng nào —</td></tr>`;
    initLucide();
  }
  function applyCiEndfill() {
    if (!requireEditPermission()) return;
    const picks = [];
    const nodes = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-ci-fill]')) : [];
    nodes.forEach(el => {
      if (!el || !el.checked) return;
      const id = el.getAttribute('data-ci-fill');
      const r = ciEndfillRows.find(x => x.assignId === id);
      if (r) picks.push(r);
    });
    if (!picks.length) { showToast('Chưa chọn dòng nào để điền giờ kết thúc.', 'error'); return; }
    if (!confirm(`Điền giờ kết thúc thực tế cho ${picks.length} lượt bố trí theo máy chấm công?\n\nLƯU Ý: giờ công đoạn của các ngày này sẽ thay đổi theo (công suất / hiệu suất).`)) return;
    const n = ciApplyEndFills(picks);
    closeCiEndfillModal();
    showToast(`Đã điền giờ kết thúc cho ${n} lượt bố trí theo máy chấm công`, 'success');
  }

  // ── ĐÁNH DẤU "ĐÃ XÁC NHẬN" DÒNG ĐỐI CHIẾU (Admin / Ban Quản Lý) ──
  function ciAckDay(employeeId, date, note) {
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý (ban lãnh đạo) mới được xác nhận dòng đối chiếu!', 'error');
      return null;
    }
    if (!employeeId || !date) return null;
    if (!Array.isArray(state.hrCiAcks)) state.hrCiAcks = [];
    const id = `ciack-${date}-${employeeId}`;
    const now = new Date().toISOString();
    const who = (state.currentUser && (state.currentUser.fullname || state.currentUser.email)) || 'Ban lãnh đạo';
    let rec = state.hrCiAcks.find(a => a && a.id === id);
    if (rec) {
      rec.note = note || rec.note || '';
      rec.by = who; rec.at = now; rec.updatedAt = now;
    } else {
      rec = { id, employeeId, date, note: note || '', by: who, at: now, createdAt: now, updatedAt: now };
      state.hrCiAcks.push(rec);
    }
    saveHrData();
    renderHrView();
    showToast(`Đã xác nhận đối chiếu ${hrEmpName(employeeId)} ngày ${fmtDateDMY(date)}`, 'success');
    return rec;
  }
  function ciUnackDay(employeeId, date) {
    if (!canApproveLeave()) {
      showToast('Chỉ Admin & Ban Quản Lý mới được bỏ xác nhận!', 'error');
      return;
    }
    const id = `ciack-${date}-${employeeId}`;
    const rec = (state.hrCiAcks || []).find(a => a && a.id === id);
    if (!rec) return;
    trackDeleted('hrCiAcks', rec.id);
    state.hrCiAcks = (state.hrCiAcks || []).filter(a => a.id !== id);
    saveHrData();
    renderHrView();
    showToast(`Đã bỏ xác nhận ${hrEmpName(employeeId)} ngày ${fmtDateDMY(date)}`, 'info');
  }
  // Giờ chấm công máy dùng cho BẢNG CHẤM CÔNG THÁNG (khi ngày đó KHÔNG có bố trí)
  function ciTimesheetHours(e, dept, date) {
    const rec = ciCheckinOf(e.id, date);
    if (!rec || !rec.in || !rec.out) return { hc: 0, tc: 0, worked: false };
    const act = ciActualSplit(e.id, date);
    if (!act || act.hc == null) return { hc: 0, tc: 0, worked: false };
    return { hc: act.hc, tc: act.tc, worked: (act.hc + act.tc) > 0 };
  }












  // Modal nạp file Excel máy chấm công
  let checkinImportSheet = null;
  function openCheckinImportModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-checkin-import');
    if (!modal) return;
    if (!(state.hrEmployees || []).length) {
      showToast('Chưa có nhân viên nào — máy chấm công cần MÃ NV trùng "Mã Nhân Viên" trong danh sách!', 'error');
      return;
    }
    checkinImportSheet = null;
    const fileEl = document.getElementById('checkin-import-file');
    if (fileEl) fileEl.value = '';
    document.getElementById('checkin-import-summary').innerHTML = '';
    document.getElementById('btn-do-checkin-import').disabled = true;
    modal.classList.add('show');
    initLucide();
  }
  function closeCheckinImportModal() {
    document.getElementById('modal-checkin-import')?.classList.remove('show');
  }
  function handleCheckinImportFile(e) {
    const file = e.target && e.target.files && e.target.files[0];
    const box = document.getElementById('checkin-import-summary');
    const doBtn = document.getElementById('btn-do-checkin-import');
    if (!file || !box || !doBtn) return;
    if (file.size > 30 * 1024 * 1024) {
      checkinImportSheet = null;
      doBtn.disabled = true;
      box.innerHTML = `<div style="font-size:0.75rem;color:var(--danger);padding:8px 10px;background:#fee2e2;border-radius:var(--radius-md);">File quá lớn (${Math.round(file.size / 1024 / 1024)} MB). Hãy xuất Excel theo từng tháng (tối đa 30 MB).</div>`;
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buf = ev.target.result;
      showTreLoading('Đang đọc file giờ máy chấm công…');
      setTimeout(() => {
        let treOk = false;
        try {
          const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          // VÙNG DÙNG THẬT của sheet (chống treo khi file có !ref phình) + trần dòng/cột
          const used = hrSheetUsedRange(ws);
          if (!used.rows) throw new Error('File rỗng');
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false, range: used.range });
          if (!aoa.length) throw new Error('File rỗng');
          // File máy chấm công thường có các dòng đầu trang (tên công ty, "Từ ngày... Đến ngày...")
          const headerRow = ciFindHeaderRow(aoa);
          if (headerRow === -1) throw new Error('Không tìm thấy dòng tiêu đề (cần cột Mã NV / Họ Tên và Ngày)');
          const headers = (aoa[headerRow] || []).map(h => String(h ?? ''));
          const col = ciAutoMapCols(headers);
          if (col.code === -1 && col.name === -1) throw new Error('Không nhận ra cột Mã NV / Họ tên');
          if (col.date === -1) throw new Error('Không nhận ra cột Ngày');
          const dataAoa = aoa.slice(headerRow); // nạp từ dòng tiêu đề trở xuống
          // Đếm nhanh số dòng hợp lệ + khớp NV để hiển thị trước khi nạp
          let valid = 0, empOk = 0;
          const missing = [];
          for (let r = 1; r < dataAoa.length; r++) {
            const row = dataAoa[r];
            if (!row || !row.length) continue;
            const dt = ciNormDateTime(col.date >= 0 ? row[col.date] : '');
            if (!dt.date) continue;
            valid++;
            const emp = ciResolveEmployee(col.code >= 0 ? row[col.code] : '', col.name >= 0 ? row[col.name] : '');
            if (emp) empOk++;
            else if (missing.length < 8) {
              missing.push({
                code: String(col.code >= 0 ? (row[col.code] ?? '') : '').trim(),
                name: String(col.name >= 0 ? (row[col.name] ?? '') : '').trim(),
                dept: String(col.dept >= 0 ? (row[col.dept] ?? '') : '').trim()
              });
            }
          }
          checkinImportSheet = { aoa: dataAoa, col, fileName: file.name };
          doBtn.disabled = false;
          const colDesc = [
            col.code !== -1 ? `Mã NV "${headers[col.code]}"` : null,
            col.name !== -1 ? `Họ tên "${headers[col.name]}"` : null,
            `Ngày "${headers[col.date]}"`,
            col.timeIn !== -1
              ? `Giờ vào "${headers[col.timeIn]}"` + (col.timeOut !== -1 ? ` / Giờ ra "${headers[col.timeOut]}"` : '')
              : (col.punchCols && col.punchCols.length
                ? `${col.punchCols.length} cột lần quét ("Lần 1" → "Lần ${col.punchCols.length}") → đầu = vào, cuối = ra`
                : `Từng lần quét "${col.dateTime !== -1 ? headers[col.dateTime] : headers[col.date]}" → đầu = vào, cuối = ra`)
          ].filter(Boolean).join(' · ');
          const missHtml = missing.length
            ? `<div class="ci-miss-list" style="margin-top:6px;padding:6px 8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--radius-sm);">
                 <strong>Không khớp hồ sơ (${valid - empOk} dòng):</strong>
                 ${missing.map(m => `<div>• ${escapeHTML(m.code || '(không mã)')} — ${escapeHTML(m.name || '(không tên)')}${m.dept ? ' · ' + escapeHTML(m.dept) : ''}</div>`).join('')}
                 ${valid - empOk > missing.length ? `<div>… và ${valid - empOk - missing.length} dòng khác</div>` : ''}
                 <div style="margin-top:4px;color:var(--text-muted);">Sửa “Mã Nhân Viên” trong hồ sơ cho khớp, hoặc kiểm tra lại Họ tên (khớp theo mã đã chuẩn hoá, sau đó theo họ tên bỏ dấu).</div>
               </div>` : '';
          box.innerHTML = `<div style="font-size:0.75rem; line-height:1.7; padding:8px 10px; background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md);">
            <strong>${escapeHTML(file.name)}</strong> — tiêu đề tại dòng ${headerRow + 1}, nhận cột: ${escapeHTML(colDesc)}<br>
            ${valid} dòng có ngày hợp lệ · <strong>${empOk} khớp nhân viên</strong>${valid - empOk > 0 ? ` · <span style="color:var(--danger);">${valid - empOk} dòng không khớp Mã NV/Tên (bỏ qua)</span>` : ''}
            ${used.rowsCapped || used.colsCapped ? `<br><span style="color:var(--danger);">File có ${used.rows} dòng / ${used.cols} cột — chỉ đọc tối đa ${HR_IMPORT_MAX_ROWS} dòng × ${HR_IMPORT_MAX_COLS} cột. Hãy xuất theo từng tháng.</span>` : ''}
          </div>${missHtml}`;
          treOk = true;
        } catch (err) {
          checkinImportSheet = null;
          doBtn.disabled = true;
          box.innerHTML = `<div style="font-size:0.75rem; color:var(--danger); padding:8px 10px; background:#fee2e2; border-radius:var(--radius-md);">Không đọc được file: ${escapeHTML(err.message || String(err))}. Hãy xuất file Excel (.xlsx/.xls/.csv) từ máy chấm công.</div>`;
        } finally {
          hideTreLoading(treOk);
          initLucide();
        }
      }, 0);
    };
    reader.readAsArrayBuffer(file);
  }

  function doCheckinImport() {
    if (!requireEditPermission()) return;
    if (!checkinImportSheet) return;
    const sheet = checkinImportSheet;
    const col = sheet.col;
    const mode = col.timeIn !== -1 ? 'theo ngày (giờ vào/ra riêng)'
      : (col.punchCols && col.punchCols.length ? `lưới "Lần 1..N" (${col.punchCols.length} cột lần quét, đầu = vào, cuối = ra)`
      : 'gộp từng lần quét (đầu = vào, cuối = ra)');
    const res = importCheckinsFromSheet(sheet.aoa, col, sheet.fileName);
    // Tùy chọn ngay trong modal: tự điền giờ kết thúc thực tế cho NGÀY ĐÃ QUA
    const autoEl = document.getElementById('checkin-import-autofill');
    const roundEl = document.getElementById('checkin-import-round');
    const autoFill = !!(autoEl && autoEl.checked);
    const round = !!(roundEl && roundEl.value === 'round30');
    closeCheckinImportModal();
    // Nhảy kỳ sang THÁNG MỚI NHẤT có dữ liệu máy (file vừa nạp thường là tháng mới)
    const latestMonth = (state.hrCheckins || [])
      .map(c => String(c.date || '').slice(0, 7))
      .filter(m => /^\d{4}-\d{2}$/.test(m)).sort().pop();
    if (latestMonth) ciSaveUi({ month: latestMonth, dept: 'all' });
    renderHrView();
    showToast(`Nạp xong từ "${sheet.fileName}" (${mode}): ${res.matched} ngày khớp nhân viên` +
      (res.unmatched.length ? ` · ${res.unmatched.length} dòng KHÔNG khớp Mã NV/Tên đã bỏ qua` : ''), 'success');
    if (!autoFill) return;
    // Mở XEM TRƯỚC (không tự ghi) — người dùng xác nhận từng dòng
    const rows = ciSuggestEndFills({ from: '', to: '', dept: 'all', round });
    if (!rows.length) { showToast('Không có lượt bố trí nào cần điền giờ kết thúc (chưa có giờ ra hoặc đã điền).', 'info'); return; }
    const fEl = document.getElementById('ci-endfill-from'); if (fEl) fEl.value = '';
    const tEl = document.getElementById('ci-endfill-to'); if (tEl) tEl.value = hrShiftDateISO(hrTodayISO(), -1);
    const rEl = document.getElementById('ci-endfill-round'); if (rEl) rEl.value = round ? 'round30' : 'exact';
    renderCiEndfillList();
    const modal = document.getElementById('modal-ci-endfill');
    if (modal) { modal.classList.add('show'); initLucide(); }
  }


  // ─── 6) THỐNG KÊ ĐI LÀM THEO THÁNG ───────────────────────────────
  // Tính theo ngày dương lịch trong tháng: đi làm / nghỉ có phép (đơn duyệt) /
  // vắng / chưa chấm. Tỷ lệ đi làm = đi làm / (đi làm + nghỉ phép + vắng).
  // Tháng hiện tại chỉ tính tới hôm nay; bỏ ngày trước ngày vào làm. Người ĐÃ
  // NGHỈ VIỆC vẫn tính đến hết tháng nghỉ (ngày sau ngày nghỉ không tính gì).
  function computeAttendanceStats(month) {
    const [y, m] = String(month || '').split('-').map(Number);
    if (!y || !m) return [];
    const today = hrTodayISO();
    const monthStart = `${month}-01`;
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;
    const lastDay = monthEnd > today ? today : monthEnd;
    const dates = [];
    for (let d = monthStart; d <= lastDay; d = hrShiftDateISO(d, 1)) dates.push(d);

    return (state.hrEmployees || [])
      .filter(e => {
        const st = e.status || 'active';
        if (st === 'active') return true;
        if (st === 'quit') {
          const qd = String(e.quitDate || '');
          return /^\d{4}-\d{2}-\d{2}$/.test(qd) && qd >= monthStart; // còn trong tháng nghỉ
        }
        return false;
      })
      .map(e => {
        const join = e.joinDate || '';
        const quit = (e.status || 'active') === 'quit' ? String(e.quitDate || '') : '';
        let work = 0, leave = 0, absent = 0, unmarked = 0;
        dates.forEach(d => {
          if (join && d < join) return; // ngày trước khi vào làm
          if (quit && d > quit) return; // ngày sau khi nghỉ việc — không tính
          const st = attStatusOf(e.id, d);
          if (st === 'work') work++;
          else if (st === 'leave') leave++;
          else if (st === 'absent') absent++;
          else unmarked++;
        });
        const counted = work + leave + absent;
        return { emp: e, work, leave, absent, unmarked, counted, rate: counted ? Math.round(work * 1000 / counted) / 10 : null };
      })
      .filter(s => s.counted > 0 || s.unmarked > 0)
      .sort((a, b) => (b.absent - a.absent) || ((a.rate ?? 101) - (b.rate ?? 101)) ||
        String(a.emp.name || '').localeCompare(String(b.emp.name || ''), 'vi'));
  }

  // Tỷ lệ đi làm GỘP THEO BỘ PHẬN (không phụ thuộc bộ lọc): gộp ngày công /
  // nghỉ phép / vắng của tất cả NV cùng bộ phận rồi tính % — mỗi NV trong
  // bảng hiển thị tỷ lệ của bộ phận mình đang thuộc.
  function computeDeptAttendanceRates(month) {
    const stats = computeAttendanceStats(month);
    const map = new Map(); // dept -> { work, leave, absent }
    stats.forEach(s => {
      const d = s.emp.department || '—';
      if (!map.has(d)) map.set(d, { work: 0, leave: 0, absent: 0 });
      const t = map.get(d);
      t.work += s.work; t.leave += s.leave; t.absent += s.absent;
    });
    const rates = new Map();
    map.forEach((t, d) => {
      const counted = t.work + t.leave + t.absent;
      rates.set(d, counted ? Math.round(t.work * 1000 / counted) / 10 : null);
    });
    return rates;
  }

  function renderHrAttendanceStats() {
    if (!/^\d{4}-\d{2}$/.test(state.hrAttMonth || '')) state.hrAttMonth = hrTodayISO().slice(0, 7);
    const monthInput = document.getElementById('hr-att-month');
    if (monthInput && monthInput.value !== state.hrAttMonth) monthInput.value = state.hrAttMonth;

    const allStats = computeAttendanceStats(state.hrAttMonth);
    // Bộ lọc bộ phận chỉ THU HẸP bảng hiển thị; chips + tỷ lệ bộ phận vẫn tính từ toàn bộ nhân viên
    const deptFilter = document.getElementById('hr-attstats-filter-dept')?.value || 'all';
    const stats = deptFilter === 'all' ? allStats : allStats.filter(s => (s.emp.department || '—') === deptFilter);
    const t = { work: 0, leave: 0, absent: 0, unmarked: 0 };
    allStats.forEach(s => { t.work += s.work; t.leave += s.leave; t.absent += s.absent; t.unmarked += s.unmarked; });
    const countedAll = t.work + t.leave + t.absent;
    const deptRates = computeDeptAttendanceRates(state.hrAttMonth);

    const chipsEl = document.getElementById('hr-att-stats-chips');
    if (chipsEl) {
      chipsEl.innerHTML =
        `<span class="hr-stat-chip"><i data-lucide="check-circle-2"></i> Ngày công: <strong>${t.work}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="calendar-check"></i> Nghỉ phép: <strong>${t.leave}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="user-x"></i> Vắng: <strong>${t.absent}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="circle-dashed"></i> Chưa chấm: <strong>${t.unmarked}</strong></span>` +
        `<span class="hr-stat-chip"><i data-lucide="percent"></i> Tỷ lệ đi làm: <strong>${countedAll ? (Math.round(t.work * 1000 / countedAll) / 10) + '%' : '—'}</strong></span>`;
    }

    const tbody = document.getElementById('hr-att-stats-body');

    // ── TẦNG 1: THẺ TÓM TẮT TỪNG BỘ PHẬN (bấm thẻ = lọc bảng cá nhân tầng 2;
    //    bấm lại đúng thẻ đang lọc = về "Tất Cả") ──
    // Số liệu gộp TOÀN BỘ NV từng bộ phận (không phụ thuộc bộ lọc dưới).
    const deptsBox = document.getElementById('hr-att-stats-depts');
    if (deptsBox) {
      const totals = new Map(); // dept -> { work, leave, absent }
      allStats.forEach(s => {
        const d = s.emp.department || '—';
        if (!totals.has(d)) totals.set(d, { work: 0, leave: 0, absent: 0 });
        const g = totals.get(d);
        g.work += s.work; g.leave += s.leave; g.absent += s.absent;
      });
      // Thứ tự chuẩn theo HR_DEPARTMENTS, bộ phận ngoài danh mục (nếu có) xếp sau
      const order = HR_DEPARTMENTS.concat([...totals.keys()].filter(d => !HR_DEPARTMENTS.includes(d)));
      deptsBox.innerHTML = order.filter(d => totals.has(d)).map(d => {
        const g = totals.get(d);
        const counted = g.work + g.leave + g.absent;
        const rate = counted ? Math.round(g.work * 1000 / counted) / 10 : null;
        const tone = rate === null ? 'na' : (rate >= 90 ? 'good' : (rate >= 70 ? 'mid' : 'low'));
        const active = deptFilter === d;
        return `<button type="button" class="hr-att-dept tone-${tone}${active ? ' active' : ''}" data-attstats-dept="${escapeHTML(d)}"` +
          ` title="Bấm để lọc bảng cá nhân theo bộ phận ${escapeHTML(d)}${active ? ' (bấm lại = Tất Cả)' : ''}">` +
          `<span class="hr-att-dept-name">${escapeHTML(d)}</span>` +
          `<span class="hr-att-dept-rate">${rate === null ? '—' : rate + '%'}</span>` +
          `<span class="hr-att-dept-bar"><span style="width:${rate === null ? 0 : Math.min(100, rate)}%"></span></span>` +
          `<span class="hr-att-dept-meta">${g.work} công · ${g.leave} nghỉ · ${g.absent} vắng</span>` +
        `</button>`;
      }).join('');
    }
    if (!tbody) return;
    if (!stats.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:22px;color:var(--text-muted);">${allStats.length ? 'Không có nhân viên nào khớp bộ lọc bộ phận trong tháng này.' : 'Chưa có dữ liệu chấm công trong tháng này.'}</td></tr>`;
      return;
    }
    tbody.innerHTML = stats.map(s => {
      const deptRate = deptRates.get(s.emp.department || '—');
      return `<tr>
        <td><strong>${escapeHTML(s.emp.name || '')}</strong>${s.emp.code ? ` <span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(s.emp.code)}</span>` : ''}</td>
        <td>${escapeHTML(s.emp.department || '—')}</td>
        <td><strong>${s.work}</strong></td>
        <td>${s.leave}</td>
        <td>${s.absent ? `<strong style="color:var(--danger);">${s.absent}</strong>` : '0'}</td>
        <td>${s.unmarked}</td>
        <td>${s.rate === null ? '—' : `<strong>${s.rate}%</strong>`}</td>
        <td>${deptRate === null || deptRate === undefined ? '—' : `<strong>${deptRate}%</strong>`}</td>
      </tr>`;
    }).join('');
  }

  // ─── 7) VỊ TRÍ LÀM VIỆC & KỸ NĂNG ────────────────────────────────
  // Danh mục vị trí của xưởng (Ép ván, Bào tinh, Sấy, Lò hơi...). Nhân viên
  // đánh dấu kỹ năng theo vị trí này (1-nhiều) và được phân vị theo ngày.
  function renderHrPositionsTable() {
    const tbody = document.getElementById('hr-positions-body');
    if (!tbody) return;
    const list = state.hrPositions || [];
    const countEl = document.getElementById('hr-positions-count');
    if (countEl) countEl.textContent = `${list.length} vị trí`;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="git-branch" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có vị trí làm việc nào. Bấm "Thêm Vị Trí" (VD: Ép ván, Bào tinh, Sấy, Lò hơi, Đóng gói...).</p></td></tr>`;
      initLucide();
      return;
    }
    tbody.innerHTML = list.map(p => {
      const skilled = (state.hrEmployees || []).filter(e => (e.status || 'active') === 'active' && (e.skills || []).includes(p.id));
      // Số NV "từng được phân" vị trí này theo ngày (lịch sử chấm công) — gợi ý để đồng bộ
      const everSet = new Set((state.hrAttendance || [])
        .filter(a => Array.isArray(a.positions) && a.positions.includes(p.id))
        .map(a => a.employeeId)
        .filter(id => { const e = hrEmpById(id); return e && (e.status || 'active') === 'active'; }));
      const cellTitle = skilled.length
        ? skilled.map(x => x.name).join(', ')
        : (everSet.size
          ? `Chưa ai được TICK kỹ năng này trong hồ sơ. Nhưng ${everSet.size} NV từng được phân vị theo ngày — bấm "Đồng Bộ Kỹ Năng" để tự cập nhật.`
          : 'Chưa có ai được tick kỹ năng — mở Sửa Nhân Viên để tick, hoặc phân vị theo ngày rồi bấm "Đồng Bộ Kỹ Năng".');
      return `<tr>
        <td><strong>${escapeHTML(p.name)}</strong></td>
        <td>${escapeHTML(p.department || '—')}</td>
        <td title="${escapeHTML(cellTitle)}"><span class="hr-chip ${skilled.length ? 'ok' : 'off'}">${skilled.length} NV</span>
          <span style="font-size:0.72rem;color:var(--text-muted);">${escapeHTML(skilled.slice(0, 3).map(x => x.name).join(', '))}${skilled.length > 3 ? ` +${skilled.length - 3}` : ''}</span>${(!skilled.length && everSet.size) ? `<br><span style="font-size:0.68rem;color:#a16207;" title="Bấm Đồng Bộ Kỹ Năng để tự thêm từ lịch sử phân vị">từng phân: ${everSet.size} NV</span>` : ''}</td>
        <td class="hr-notes" title="${escapeHTML(p.note || '')}">${escapeHTML(p.note || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrEditPosition('${p.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrDeletePosition('${p.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
    initLucide();
  }

  // Đồng bộ kỹ năng từ lịch sử phân vị: quét toàn bộ bản ghi chấm công
  // (hrAttendance.positions), gộp cặp (NV, vị trí) đã từng phân vào
  // hrEmployees.skills. Tường minh (bấm nút) — không tự ghi khi bấm chip
  // để tránh kỹ năng "ảo" từ phân ca tạm thời 1 ngày.
  function syncSkillsFromAssignments() {
    if (!requireEditPermission()) return;
    // Lập kế hoạch trước (chưa đụng dữ liệu) để confirm đúng số liệu
    const plan = new Map(); // empId -> Set(posId cần thêm)
    (state.hrAttendance || []).forEach(a => {
      if (!a.employeeId || !Array.isArray(a.positions)) return;
      if (!hrEmpById(a.employeeId)) return;
      const skills = Array.isArray(hrEmpById(a.employeeId).skills) ? hrEmpById(a.employeeId).skills : [];
      a.positions.forEach(pid => {
        if (!pid || !hrPosById(pid)) return;
        if (!skills.includes(pid)) {
          if (!plan.has(a.employeeId)) plan.set(a.employeeId, new Set());
          plan.get(a.employeeId).add(pid);
        }
      });
    });
    const empCount = plan.size;
    const posCount = [...plan.values()].reduce((s, set) => s + set.size, 0);
    if (!empCount) {
      showToast('Không có kỹ năng mới nào để đồng bộ — lịch sử phân vị đã khớp với kỹ năng hiện có.', 'info');
      return;
    }
    if (!confirm(`Đồng bộ kỹ năng từ lịch sử phân vị theo ngày?\n\nSẽ thêm ${posCount} kỹ năng cho ${empCount} nhân viên (kỹ năng đã có giữ nguyên, không tự xóa kỹ năng nào).`)) return;
    plan.forEach((set, empId) => {
      const emp = hrEmpById(empId);
      emp.skills = Array.isArray(emp.skills) ? emp.skills : [];
      set.forEach(pid => emp.skills.push(pid));
      emp.updatedAt = new Date().toISOString();
    });
    saveHrData();
    renderHrView();
    showToast(`Đã đồng bộ: thêm ${posCount} kỹ năng cho ${empCount} nhân viên (theo lịch sử phân vị)`, 'success');
  }

  function openPositionModal(id) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-position');
    const form = document.getElementById('position-form');
    if (!modal || !form) return;
    form.reset();
    const deptSel = document.getElementById('position-department');
    if (deptSel) deptSel.innerHTML = '<option value="">— Không phân bộ phận —</option>' +
      HR_DEPARTMENTS.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
    const titleEl = document.getElementById('position-modal-title');
    if (id) {
      const p = hrPosById(id);
      if (!p) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Vị Trí: ${escapeHTML(p.name)}`;
      document.getElementById('position-id').value = p.id;
      document.getElementById('position-name').value = p.name || '';
      document.getElementById('position-department').value = p.department || '';
      document.getElementById('position-note').value = p.note || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="git-branch-plus"></i> Thêm Vị Trí Làm Việc`;
      document.getElementById('position-id').value = '';
      // Mặc định Bộ Phận theo bộ phận ĐANG XEM trên Board (nếu có) — tránh
      // thêm nhầm vào "Không phân bộ phận" rồi không thấy vị trí trên Board
      const defDept = state.hrBoardDept || '';
      if (deptSel && defDept && HR_DEPARTMENTS.includes(defDept)) deptSel.value = defDept;
    }
    modal.classList.add('show');
    initLucide();
  }

  function closePositionModal() {
    document.getElementById('modal-position')?.classList.remove('show');
  }

  function handlePositionSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('position-id').value;
    const name = document.getElementById('position-name').value.trim();
    const department = document.getElementById('position-department').value;
    if (!name) { showToast('Tên vị trí không được để trống!', 'error'); return; }
    // Trùng = cùng TÊN + cùng BỘ PHẬN (khác bộ phận vẫn thêm được — VD
    // "Ép ván" có ở cả Xưởng 1 và Xưởng 2 là 2 vị trí riêng biệt)
    const dup = (state.hrPositions || []).find(p =>
      hrStripDiacritics(p.name) === hrStripDiacritics(name) &&
      (p.department || '') === (department || '') && p.id !== id);
    if (dup) { showToast(`Đã có vị trí "${dup.name}" tại bộ phận ${department || 'chưa phân bộ phận'}!`, 'error'); return; }
    const data = {
      name,
      department,
      note: document.getElementById('position-note').value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (id) {
      const p = hrPosById(id);
      if (!p) return;
      Object.assign(p, data);
      showToast(`Đã cập nhật vị trí ${name}!`, 'success');
    } else {
      data.id = `pos-${Date.now()}`;
      data.createdAt = new Date().toISOString();
      state.hrPositions.push(data);
      showToast(`Đã thêm vị trí ${name}!`, 'success');
    }
    saveHrData();
    closePositionModal();
    renderHrView();
  }

  function deletePosition(id) {
    if (!requireEditPermission()) return;
    const p = hrPosById(id);
    if (!p) return;
    const users = (state.hrEmployees || []).filter(e => (e.skills || []).includes(id)).length;
    if (!confirm(`Xóa vị trí "${p.name}"? Kỹ năng này sẽ gỡ khỏi ${users} nhân viên và khỏi phân vị đã lưu.`)) return;
    trackDeleted('hrPositions', id);
    state.hrPositions = (state.hrPositions || []).filter(x => x.id !== id);
    (state.hrEmployees || []).forEach(e => { if (Array.isArray(e.skills)) e.skills = e.skills.filter(s => s !== id); });
    (state.hrAttendance || []).forEach(a => { if (Array.isArray(a.positions)) a.positions = a.positions.filter(s => s !== id); });
    saveHrData();
    renderHrView();
    showToast(`Đã xóa vị trí ${p.name}`, 'info');
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
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrEditRecruitment('${r.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrDeleteRecruitment('${r.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
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
    trackDeleted('hrRecruitment', id);
    state.hrRecruitment = (state.hrRecruitment || []).filter(r => r.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa nhu cầu tuyển dụng', 'info');
  }

  // ─── 4b) NHÂN SỰ CẦN TẠI CÁC VỊ TRÍ — BẢNG DỮ LIỆU TRUNG GIAN ────
  // Mỗi dòng = 1 vị trí của 1 bộ phận: SỐ NGƯỜI CẦN + SỐ NGƯỜI HIỆN CÓ.
  // Đây là bảng trung gian: dữ liệu có thể NHẬP TAY hoặc LẤY TỪ BẢNG KHÁC
  // (nút "Đồng Bộ Từ Hồ Sơ" đếm tự động từ danh sách nhân viên), đồng thời
  // CUNG CẤP DỮ LIỆU cho các bảng/chức năng sắp bổ sung (biểu đồ kiểm soát
  // nhân sự, so sánh kế hoạch - hiện trạng...).
  function renderPositionNeedsTable() {
    const tbody = document.getElementById('hr-posneed-body');
    if (!tbody) return;
    // TỰ ĐỘNG NẠP: mỗi vị trí trong danh mục (hrPositions) có 1 dòng trong bảng
    // (chỉ thêm lần đầu / khi có vị trí mới — dòng đã xóa tay không hồi sinh).
    ensurePositionNeedsFromPositions();
    const dept = document.getElementById('hr-posneed-filter-dept')?.value || 'all';
    const list = (state.hrPositionNeeds || []).filter(r => dept === 'all' || r.department === dept);

    const countEl = document.getElementById('hr-posneed-count');
    if (countEl) {
      const need = (state.hrPositionNeeds || []).reduce((s, r) => s + (r.needQty || 0), 0);
      const have = (state.hrPositionNeeds || []).reduce((s, r) => s + (r.haveQty || 0), 0);
      countEl.textContent = `Cần ${need} — hiện có ${have} — còn thiếu ${Math.max(0, need - have)} (${list.length} dòng)`;
    }

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:22px;color:var(--text-muted);">
        <i data-lucide="target" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa có vị trí nào — thêm Vị Trí Làm Việc ở thẻ <b>"Vị Trí &amp; Kỹ Năng"</b>, dòng sẽ tự động xuất hiện tại đây. Có thể bấm "Thêm Vị Trí Cần" để tạo dòng thủ công.</p></td></tr>`;
      initLucide();
      return;
    }

    tbody.innerHTML = [...list].sort((a, b) =>
      String(a.department || '').localeCompare(String(b.department || ''), 'vi') ||
      String(a.position || '').localeCompare(String(b.position || ''), 'vi')).map(r => {
      const missing = Math.max(0, (r.needQty || 0) - (r.haveQty || 0));
      return `<tr>
        <td>${escapeHTML(r.department || '—')}</td>
        <td><strong>${escapeHTML(r.position || '—')}</strong></td>
        <td><input type="number" min="0" class="form-input" style="width:74px;padding:3px 6px;" value="${parseInt(r.needQty, 10) || 0}"
          onchange="app.hrSetPositionNeedQty('${r.id}','needQty',this.value)" title="Số người cần (chỉnh sửa tay)"></td>
        <td><input type="number" min="0" class="form-input" style="width:74px;padding:3px 6px;" value="${parseInt(r.haveQty, 10) || 0}"
          onchange="app.hrSetPositionNeedQty('${r.id}','haveQty',this.value)" title="Số người hiện có (chỉnh sửa tay hoặc bấm Đồng Bộ)"></td>
        <td><strong style="color:${missing > 0 ? 'var(--danger)' : '#16a34a'};">${missing}</strong></td>
        <td class="hr-notes" title="${escapeHTML(r.notes || '')}">${escapeHTML(r.notes || '—')}</td>
        <td class="text-right">
          <div style="display:flex;justify-content:flex-end;gap:4px;">
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrEditPositionNeed('${r.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" data-perm="hr" onclick="app.hrDeletePositionNeed('${r.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function openPositionNeedModal(id) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-position-need');
    const form = document.getElementById('position-need-form');
    if (!modal || !form) return;
    form.reset();
    const deptSel = document.getElementById('posneed-department');
    if (deptSel) deptSel.innerHTML = hrDeptOptions();
    const titleEl = document.getElementById('posneed-modal-title');

    if (id) {
      const r = (state.hrPositionNeeds || []).find(x => x.id === id);
      if (!r) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Vị Trí Cần: ${escapeHTML(r.position || '')}`;
      document.getElementById('posneed-id').value = r.id;
      document.getElementById('posneed-department').value = r.department || HR_DEPARTMENTS[0];
      fillPosNeedPositionSelect(r.positionId, r.position);
      document.getElementById('posneed-need').value = r.needQty || 1;
      document.getElementById('posneed-have').value = r.haveQty || 0;
      document.getElementById('posneed-notes').value = r.notes || '';
    } else {
      if (titleEl) titleEl.innerHTML = `<i data-lucide="target"></i> Thêm Vị Trí Cần Nhân Sự`;
      document.getElementById('posneed-id').value = '';
      fillPosNeedPositionSelect();
      document.getElementById('posneed-need').value = 1;
      document.getElementById('posneed-have').value = 0;
    }
    modal.classList.add('show');
    initLucide();
  }

  // Điền select Vị Trí trong modal (lọc theo bộ phận đang chọn; vị trí
  // "chung" không gán bộ phận luôn hiển thị). Giữ lại tên vị trí cũ nếu
  // không còn trong danh mục (dòng dữ liệu cũ vẫn sửa được).
  function fillPosNeedPositionSelect(positionId, keepName) {
    const sel = document.getElementById('posneed-position');
    if (!sel) return;
    const dept = document.getElementById('posneed-department')?.value || '';
    const opts = (state.hrPositions || [])
      .filter(p => !dept || !p.department || p.department === dept)
      .map(p => `<option value="${escapeHTML(p.name)}" data-pos-id="${escapeHTML(p.id)}">${escapeHTML(p.name)}${p.department ? ' — ' + escapeHTML(p.department) : ''}</option>`).join('');
    sel.innerHTML = '<option value="">— Chọn vị trí —</option>' + opts +
      (keepName && !(state.hrPositions || []).some(p => p.name === keepName)
        ? `<option value="${escapeHTML(keepName)}">${escapeHTML(keepName)} (không còn trong danh mục)</option>` : '');
    if (keepName) sel.value = keepName; else if (positionId) {
      const p = (state.hrPositions || []).find(x => x.id === positionId);
      if (p) sel.value = p.name;
    }
  }

  function closePositionNeedModal() {
    document.getElementById('modal-position-need')?.classList.remove('show');
  }

  function handlePositionNeedSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const id = document.getElementById('posneed-id').value;
    const position = document.getElementById('posneed-position').value.trim();
    const department = document.getElementById('posneed-department').value;
    const needQty = parseInt(document.getElementById('posneed-need').value) || 0;
    if (!position) { showToast('Vị trí không được để trống!', 'error'); return; }
    // Trùng (bộ phận + vị trí): yêu cầu sửa dòng có sẵn thay vì tạo dòng trùng lặp
    const dup = (state.hrPositionNeeds || []).find(r =>
      r.id !== id && r.department === department && (r.position || '').trim() === position);
    if (dup) { showToast(`Vị trí "${position}" của bộ phận ${department} đã có trong bảng — sửa dòng đã có nhé!`, 'error'); return; }
    if (needQty <= 0) { showToast('Số người cần phải lớn hơn 0!', 'error'); return; }
    const posDef = (state.hrPositions || []).find(p => p.name === position);
    const data = {
      id: id || `posneed-${Date.now()}`,
      department,
      position,
      positionId: posDef ? posDef.id : '',
      needQty,
      haveQty: parseInt(document.getElementById('posneed-have').value) || 0,
      notes: document.getElementById('posneed-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (id) {
      const idx = state.hrPositionNeeds.findIndex(x => x.id === id);
      if (idx !== -1) state.hrPositionNeeds[idx] = { ...state.hrPositionNeeds[idx], ...data };
      showToast(`Đã cập nhật "${position}" (${department})!`, 'success');
    } else {
      data.createdAt = new Date().toISOString();
      state.hrPositionNeeds.push(data);
      showToast(`Đã thêm "${position}" (${department})!`, 'success');
    }
    saveHrData();
    closePositionNeedModal();
    renderHrView();
  }

  function deletePositionNeed(id) {
    if (!requireEditPermission()) return;
    trackDeleted('hrPositionNeeds', id);
    state.hrPositionNeeds = (state.hrPositionNeeds || []).filter(r => r.id !== id);
    saveHrData();
    renderHrView();
    showToast('Đã xóa dòng "Nhân sự cần tại vị trí" (vị trí sẽ không tự nạp lại)', 'info');
  }

  // ── TỰ ĐỘNG NẠP VỊ TRÍ VÀO BẢNG TRUNG GIAN ──────────────────────
  // Mỗi vị trí trong danh mục (hrPositions) được bảo đảm có 1 dòng trong
  // bảng "Nhân sự cần tại các vị trí": gọi khi mở tab (nạp lần đầu / vị trí
  // mới) và khi thêm vị trí mới trong thẻ "Vị Trí & Kỹ Năng". Dòng dùng id
  // ổn định `posneed-pos-<vị trí id>` — nếu người dùng XÓA dòng đó, dấu vết
  // xóa (tombstone) giữ cho vị trí không được nạp lại. Số người hiện có
  // mặc định được đếm tự động từ hồ sơ; số người cần = 1 (chỉnh sửa tay).
  function posNeedIdForPosition(posId) { return `posneed-pos-${posId}`; }

  function ensurePositionNeedsFromPositions() {
    const positions = state.hrPositions || [];
    if (!positions.length) return false;
    const have = new Set((state.hrPositionNeeds || []).map(r => r.id));
    const dead = (state.deletedIds && state.deletedIds.hrPositionNeeds) || {};
    let added = false;
    positions.forEach(p => {
      const id = posNeedIdForPosition(p.id);
      if (have.has(id) || dead[id]) return;
      state.hrPositionNeeds = state.hrPositionNeeds || [];
      state.hrPositionNeeds.push({
        id,
        department: p.department || 'Chung',
        position: p.name,
        positionId: p.id,
        needQty: 1,
        haveQty: hrCountEmployeesAtPosition(p.department || '', p.id, p.name),
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        autoFrom: 'hrPositions' // nguồn dữ liệu (bảng khác) — dùng cho chức năng sắp bổ sung
      });
      added = true;
    });
    if (added) {
      saveHrData();
      updateHrCardGrid();
    }
    return added;
  }

  // CHỈNH SỬA TAY từng ô "Số người cần" / "Số người hiện có" ngay trên bảng
  function hrSetPositionNeedQty(id, field, rawVal) {
    if (!requireEditPermission()) return;
    const r = (state.hrPositionNeeds || []).find(x => x.id === id);
    if (!r || (field !== 'needQty' && field !== 'haveQty')) return;
    const v = Math.max(0, parseInt(rawVal, 10) || 0);
    r[field] = v;
    r.updatedAt = new Date().toISOString();
    saveHrData();
    renderHrView();
  }

  // LẤY DỮ LIỆU TỪ BẢNG KHÁC: cập nhật "Số người hiện có" của mọi dòng
  // bằng cách đếm từ danh sách nhân viên (trạng thái "Đang làm việc").
  function syncPositionNeedsFromEmployees() {
    if (!requireEditPermission()) return;
    const list = state.hrPositionNeeds || [];
    if (!list.length) { showToast('Chưa có dòng nào để đồng bộ.', 'info'); return; }
    list.forEach(r => { r.haveQty = hrCountEmployeesAtPosition(r.department, r.positionId, r.position); r.updatedAt = new Date().toISOString(); });
    saveHrData();
    renderHrView();
    showToast(`Đã đồng bộ số người hiện có cho ${list.length} dòng từ hồ sơ nhân viên.`, 'success');
  }

  // Đếm số nhân viên ĐANG LÀM VIỆC tại 1 vị trí của 1 bộ phận:
  //   - ưu tiên khớp kỹ năng (skills chứa positionId), nếu không có
  //     positionId thì khớp theo tên vị trí trong hồ sơ nhân viên.
  function hrCountEmployeesAtPosition(department, positionId, positionName) {
    return (state.hrEmployees || []).filter(e => {
      if ((e.status || 'active') !== 'active') return false;
      if (department && (e.department || '') !== department) return false;
      if (positionId && Array.isArray(e.skills) && e.skills.includes(positionId)) return true;
      return positionName && (e.position || '').trim() === positionName.trim();
    }).length;
  }



  // ─── 9) BỐ TRÍ VỊ TRÍ THEO NGÀY — BẢNG ĐIỀU KHIỂN TRỰC QUAN ──────
  // Cột Y = số người (ô xếp chồng theo "Số Người Cần" của bảng trung gian),
  // cột X = các vị trí, mỗi bộ phận hiển thị riêng (mặc định Xưởng 2).
  // Ô trống = "?" màu xám; ô đã gán người = xanh + tên rút gọn (Hà Văn Chiến
  // → H.V.Chiến) + giờ làm. Bộ phận "Hành chính" hiển thị 1 cột/vị trí,
  // "Làm ca" hiển thị 2 cột (Ca ngày / Ca đêm — chỉnh trong Cài Đặt Ca).
  // Dữ liệu giờ (hrAssignments) là nguồn cho bảng chấm công: công thường + tăng ca.
  const BOARD_SHIFT_PRESETS = {
    hanhchinh: { type: 'hanhchinh', shifts: [
      { name: 'Sáng',  start: '07:00', end: '11:30' },
      { name: 'Chiều', start: '13:00', end: '17:30' }
    ] },
    // brk = số GIỜ NGHỈ của ca (CHỈ chế độ Làm ca) — TRỪ VÀO CUỐI CA:
    // giờ làm việc hiệu dụng = [giờ vào → giờ ra − brk]; giờ nghỉ KHÔNG tính
    // vào HC lẫn TC (xem hrSplitHoursHC). Sửa được trong Cài Đặt Ca.
    lamca: { type: 'lamca', shifts: [
      { name: 'Ca ngày', start: '07:00', end: '19:00', brk: 1.5 },
      { name: 'Ca đêm',  start: '19:00', end: '07:00', brk: 1 }
    ] }
  };

  // Cấu hình ca của 1 bộ phận (mặc định Hành chính cho mọi bộ phận)
  function hrShiftCfg(dept) {
    return (state.hrShifts || []).find(s => s.id === dept) || { id: dept, type: 'hanhchinh', shifts: BOARD_SHIFT_PRESETS.hanhchinh.shifts };
  }
  // Số GIỜ NGHỈ của 1 ca (chỉ chế độ Làm ca; Hành chính = 0 vì nghỉ trưa nằm
  // giữa 2 buổi, đã tự loại). Cấu hình CŨ chưa khai `brk` → mặc định ca 1 =
  // 1h30 (bằng nghỉ trưa hành chính 11:30–13:00), các ca sau = 1h.
  function hrShiftBrkH(cfg, shiftIdx) {
    if (!cfg || cfg.type !== 'lamca') return 0;
    const idx = Number(shiftIdx) || 0;
    const sh = cfg.shifts[idx] || cfg.shifts[0];
    if (!sh) return 0;
    const raw = sh.brk;
    if (raw === '' || raw == null) return idx === 0 ? 1.5 : 1;
    const v = Number(raw);
    return (Number.isFinite(v) && v > 0) ? v : 0;
  }
  // Tên rút gọn "Hà Văn Chiến" → "H.V.Chiến" (chữ cuối nguyên vẹn, các chữ đầu lấy nguyên âm đầu)
  function hrShortName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return parts[0] || '';
    const cap = w => (w[0] || '').toUpperCase() + (w.length > 1 ? w.slice(1) : '');
    return parts.slice(0, -1).map(w => cap(w[0]) + '.').join('') + cap(parts[parts.length - 1]);
  }
  // '07:00' → '7h00' (hiển thị trên board & chấm công)
  function fmtHour(t) {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? `${+m[1]}h${m[2]}` : (t || '—');
  }
  // Danh sách mốc giờ 30 phút (05:00 → 23:30) cho select giờ bắt đầu/kết thúc
  function hrHalfHourOptions() {
    const out = [];
    for (let h = 5; h <= 23; h++) { out.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`); }
    return out;
  }
  // Khoảng giờ làm của 1 cột (shift) trong ngày: hành chính gộp Sáng+Chiều.
  //  • Ca đêm (giờ ra <= giờ vào) tự hiểu là VẮT QUA NỬA ĐÊM → endMin = end + 1440
  //  • startMin/endMin = mốc phút ĐÃ CHUẨN HOÁ (nguồn duy nhất để tính giờ —
  //    xem hrSplitHoursHC + handleBoardAssignSubmit)
  //  • brkH = số giờ NGHỈ của ca (0 với Hành chính) — trừ vào CUỐI CA
  function hrShiftRange(cfg, shiftIdx) {
    const toM = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
    if (!cfg.shifts.length) return { start: '07:00', end: '17:30', label: 'Hành chính', brkH: 0, startMin: 420, endMin: 1050 };
    if (cfg.type === 'hanhchinh') {
      const last = cfg.shifts[cfg.shifts.length - 1];
      return { start: cfg.shifts[0].start, end: last.end, label: 'Hành chính', brkH: 0, startMin: toM(cfg.shifts[0].start), endMin: toM(last.end) };
    }
    const idx = Number(shiftIdx) || 0;
    const s = cfg.shifts[idx] || cfg.shifts[0];
    const startMin = toM(s.start);
    let endMin = toM(s.end);
    if (!endMin || endMin <= startMin) endMin += 1440;   // ca đêm vắt qua nửa đêm
    return { start: s.start, end: s.end, label: s.name, brkH: hrShiftBrkH(cfg, idx), startMin, endMin };
  }
  // Các bản ghi gán người của 1 ngày (tùy chọn lọc vị trí)
  function hrAssignmentsOf(date, positionId) {
    return (state.hrAssignments || [])
      .filter(a => a.date === date && (!positionId || a.positionId === positionId));
  }
  // Giờ làm của 1 nhân viên trong ngày (từ board) — nguồn cho chấm công/tăng ca:
  // [{ position, positionId, start, end, shiftLabel }] đã sắp theo giờ bắt đầu
  function hrAssignTimesOf(employeeId, date) {
    return (state.hrAssignments || [])
      .filter(a => a.date === date && a.employeeId === employeeId)
      .map(a => ({ position: hrPosName(a.positionId), positionId: a.positionId, start: a.start, end: a.end, shiftLabel: a.shiftLabel || '' }))
      .sort((x, y) => String(x.start).localeCompare(String(y.start)));
  }

  // '540' phút -> '9h' / '390' -> '6h30'
  function fmtHm(min) {
    min = Math.max(0, Math.round(min));
    const h = Math.floor(min / 60), m = min % 60;
    return `${h}h${m ? String(m).padStart(2, '0') : ''}`;
  }

  // Tách giờ làm việc thành HC (hành chính) và TC (tăng ca) theo quy tắc:
  //  • HC  = phần làm việc NẰM TRONG giờ ca chuẩn của bộ phận (theo Cài Đặt
  //    Ca). Hành chính 07:00–17:30 có 1h30 nghỉ trưa 11:30–13:00 — nghỉ trưa
  //    KHÔNG tính vào HC lẫn TC → làm đủ ngày = 9h HC.
  //  • TC  = chỉ tính phần NGOÀI giờ ca chuẩn (trước giờ vào / sau giờ ra,
  //    VD làm đến 18h00 → 9h HC + 0h30 TC). Làm ca: ngoài khung ca đã chọn.
  //  • CA ĐÊM (giờ ra <= giờ vào) tự động tính sang ngày hôm sau.
  //  • GIỜ RA TRỐNG = làm đến HẾT CA (kể cả ca đêm) — KHÔNG còn đoán 8h.
  //  • NGHỈ (chế độ Làm ca — ô "Nghỉ (giờ)" ở Cài Đặt Ca) TRỪ VÀO CUỐI CA:
  //    giờ làm hiệu dụng = [vào → ra − nghỉ]; phần nghỉ KHÔNG vào HC lẫn TC.
  //    VD Ca ngày 07:00–19:00 nghỉ 1h30 → làm đủ ca = 10h30 HC · 0 TC;
  //       Ca đêm 19:00–07:00 nghỉ 1h → làm đủ ca = 11h HC · 0 TC.
  // Trả về phút: { hc, tc } (giờ nghỉ không nằm trong cả hai).
  function hrSplitHoursHC(dept, start, end, shiftIdx) {
    const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
    return hrSplitHoursHCMin(dept, toMin(start), toMin(end), shiftIdx);
  }
  // Bản dùng PHÚT trực tiếp — engine đối chiếu chấm công cần mốc > 1440 (ca đêm)
  function hrSplitHoursHCMin(dept, startMin, endMin, shiftIdx) {
    const cfg = hrShiftCfg(dept);
    const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
    let s = Number(startMin) || 0;
    let e = Number(endMin) || 0;
    // Khung ca của cột ca đang dùng — mốc phút ĐÃ CHUẨN HOÁ (ca đêm vắt đêm)
    const range = hrShiftRange(cfg, shiftIdx);
    const rStart = range.startMin, rEnd = range.endMin;
    if (!e || e === s) e = rEnd;  // giờ ra TRỐNG = HẾT CA (đúng cho cả ca đêm)
    if (e <= s) e += 1440;        // làm qua nửa đêm

    // Các cửa sổ giờ HC (hành chính: từng buổi, đã loại nghỉ trưa)
    const hcWindows = [];
    if (cfg.type === 'lamca') {
      hcWindows.push([rStart, rEnd]);
    } else {
      cfg.shifts.forEach(sh => hcWindows.push([toMin(sh.start), toMin(sh.end)]));
    }
    // HC = giao của giờ làm với các cửa sổ HC
    let hc = 0;
    hcWindows.forEach(([ws, we]) => {
      [0, 1440].forEach(off => {
        const a = Math.max(s, ws + off), b = Math.min(e, we + off);
        if (b > a) hc += b - a;
      });
    });
    // ─── PHẦN NGHỈ (không tính vào HC lẫn TC) ───
    //  • Hành chính: khoảng hở GIỮA các buổi (nghỉ trưa 11:30–13:00)
    //  • Làm ca: số giờ nghỉ khai ở Cài Đặt Ca, TRỪ VÀO CUỐI CA → [ra − nghỉ, ra]
    let gap = 0;
    if (cfg.type === 'lamca') {
      const brk = Math.max(0, Number(range.brkH) || 0) * 60;
      if (brk > 0) {
        const gs = Math.max(rStart, rEnd - brk), ge = rEnd;
        [0, 1440].forEach(off => {
          const a = Math.max(s, gs + off), b = Math.min(e, ge + off);
          if (b > a) gap += b - a;
        });
      }
      // Nghỉ nằm GIỮA cửa sổ ca → phải TRỪ khỏi HC (khác nghỉ trưa hành chính
      // nằm NGOÀI các buổi nên HC không bị trừ)
      hc = Math.max(0, hc - gap);
    } else {
      for (let i = 0; i < hcWindows.length - 1; i++) {
        const gs = hcWindows[i][1], ge = hcWindows[i + 1][0];
        [0, 1440].forEach(off => {
          const a = Math.max(s, gs + off), b = Math.min(e, ge + off);
          if (b > a) gap += b - a;
        });
      }
    }
    // TC = phần còn lại của giờ làm ngoài HC và ngoài nghỉ
    //     (= làm trước giờ vào / sau giờ ra của ca chuẩn)
    return { hc, tc: Math.max(0, (e - s) - hc - gap) };
  }

  // ─── LỊCH LÀM VIỆC THEO THÁNG (ngày nghỉ / lễ) ──────────────────
  // Cấu hình theo từng tháng { 'YYYY-MM': { weekdaysOff, restDays, workDays } }:
  //  • weekdaysOff: nghỉ ĐỊNH KỲ theo thứ (mặc định [0] = nghỉ Chủ nhật;
  //    mảng RỖNG = tắt hẳn nghỉ định kỳ — mọi ngày đều là ngày làm việc)
  //  • restDays   : nghỉ/LỄ RIÊNG của tháng (1/9, 2/9, nghỉ toàn nhà máy...)
  //  • workDays   : LÀM BÙ theo TỪNG ngày — đi làm bình thường dù rơi vào thứ
  //    nghỉ (VD Chủ nhật làm bù; các Chủ nhật khác vẫn nghỉ theo thứ)
  // Quy tắc tính giờ: đi làm vào ngày nghỉ/lễ → TOÀN BỘ giờ làm trong ngày
  // (theo cửa sổ ca chuẩn của bộ phận, đã trừ nghỉ trưa) được tính vào TC.
  const HR_DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; // theo Date.getDay() (0 = Chủ nhật)
  const HR_DOW_GRID  = [1, 2, 3, 4, 5, 6, 0];                      // thứ tự lưới lịch bắt đầu Thứ 2
  // Cấu hình lịch của 1 tháng (null nếu chưa cài — mặc định nghỉ Chủ nhật)
  function hrCalCfgOf(month) {
    const cal = state.hrWorkCalendar;
    if (!cal || typeof cal !== 'object') return null;
    const cfg = cal[month];
    return (cfg && typeof cfg === 'object') ? cfg : null;
  }
  // Loại ngày: 'work' (ngày làm việc — gồm cả LÀM BÙ) | 'off' (nghỉ định kỳ
  // theo thứ) | 'holiday' (nghỉ/lễ riêng). Ưu tiên: restDays > workDays > weekdaysOff.
  function hrDayKindOf(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return 'work';
    const cfg = hrCalCfgOf(String(iso).slice(0, 7));
    if (cfg && Array.isArray(cfg.restDays) && cfg.restDays.includes(iso)) return 'holiday';
    if (cfg && Array.isArray(cfg.workDays) && cfg.workDays.includes(iso)) return 'work'; // ngày làm bù
    const wdOff = (cfg && Array.isArray(cfg.weekdaysOff)) ? cfg.weekdaysOff : [0]; // mặc định nghỉ CN
    let dow = -1;
    try { dow = new Date(iso + 'T00:00:00').getDay(); } catch (e) { dow = -1; }
    return (dow >= 0 && wdOff.includes(dow)) ? 'off' : 'work';
  }
  // Ngày nghỉ (định kỳ hoặc lễ) — đi làm ngày này thì giờ làm tính vào TC
  function hrIsRestDay(iso) { return hrDayKindOf(iso) !== 'work'; }
  // Tách giờ HC/TC CÓ XÉT LỊCH THÁNG: ngày nghỉ/lễ thì phần giờ nằm trong
  // cửa sổ ca chuẩn KHÔNG tính HC nữa mà chuyển hết sang TC (hc=0, tc=hc+tc).
  function hrSplitHoursHCDate(dept, date, start, end, shiftIdx) {
    const r = hrSplitHoursHC(dept, start, end, shiftIdx);
    if (date && hrIsRestDay(date) && r.hc > 0) return { hc: 0, tc: r.hc + r.tc };
    return r;
  }

  // ── MODAL CÀI ĐẶT LỊCH LÀM VIỆC THEO THÁNG ──
  // Bản nháp đang chỉnh (Lưu mới ghi vào state + localStorage + mây)
  let hrCalDraft = { month: '', weekdaysOff: [0], restDays: [], workDays: [] };

  function openHrCalendarModal() {
    if (!requireEditPermission()) return;
    const input = document.getElementById('hr-calendar-month');
    const month = (input && /^\d{4}-\d{2}$/.test(input.value)) ? input.value
      : (/^\d{4}-\d{2}$/.test(state.hrCalMonth || '') ? state.hrCalMonth : hrTodayISO().slice(0, 7));
    hrCalSetMonth(month);
    const modal = document.getElementById('modal-hr-calendar');
    if (modal) { modal.classList.add('show'); initLucide(); }
  }

  function closeHrCalendarModal() {
    document.getElementById('modal-hr-calendar')?.classList.remove('show');
  }

  // Đổi tháng trong modal — nạp cấu hình hiện có vào bản nháp rồi vẽ lại
  function hrCalSetMonth(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return;
    state.hrCalMonth = month;
    const cfg = hrCalCfgOf(month) || {};
    hrCalDraft = {
      month,
      weekdaysOff: Array.isArray(cfg.weekdaysOff) ? [...cfg.weekdaysOff] : [0],
      restDays: Array.isArray(cfg.restDays) ? [...cfg.restDays] : [],
      workDays: Array.isArray(cfg.workDays) ? [...cfg.workDays] : []
    };
    const input = document.getElementById('hr-calendar-month');
    if (input && input.value !== month) input.value = month;
    renderHrCalendarModal();
  }

  // Bật/tắt trạng thái của 1 ngày (click ô lịch) — chu kỳ:
  //   ngày làm việc  → nghỉ/lễ riêng → (bấm nữa) ngày làm việc
  //   nghỉ theo thứ  → LÀM BÙ (đi làm bình thường) → (bấm nữa) nghỉ theo thứ
  function hrCalToggleDay(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) || iso.slice(0, 7) !== hrCalDraft.month) return;
    let dow = -1;
    try { dow = new Date(iso + 'T00:00:00').getDay(); } catch (e) { dow = -1; }
    const iRest = hrCalDraft.restDays.indexOf(iso);
    const iWork = hrCalDraft.workDays.indexOf(iso);
    if (iRest !== -1) {
      hrCalDraft.restDays.splice(iRest, 1);              // đang nghỉ/lễ riêng -> bỏ đánh dấu
    } else if (iWork !== -1) {
      hrCalDraft.workDays.splice(iWork, 1);              // đang làm bù -> trả lại nghỉ theo thứ
    } else if (dow >= 0 && hrCalDraft.weekdaysOff.includes(dow)) {
      hrCalDraft.workDays.push(iso);                     // nghỉ theo thứ -> LÀM BÙ ngày này
      showToast(`Đã đánh dấu LÀM BÙ ngày ${iso} — đi làm bình thường, giờ tính như ngày làm việc. (Các ${HR_DOW_SHORT[dow]} khác vẫn nghỉ)`, 'info');
    } else {
      hrCalDraft.restDays.push(iso);                     // ngày làm việc -> nghỉ/lễ riêng
    }
    renderHrCalendarModal();
  }

  // Bật/tắt nghỉ định kỳ theo thứ (CN..T7)
  function hrCalToggleWeekday(dow) {
    const i = hrCalDraft.weekdaysOff.indexOf(dow);
    if (i !== -1) hrCalDraft.weekdaysOff.splice(i, 1);
    else hrCalDraft.weekdaysOff.push(dow);
    renderHrCalendarModal();
  }

  // Vẽ nội dung modal lịch (grid tháng + các nút nghỉ theo thứ)
  function renderHrCalendarModal() {
    const labelEl = document.getElementById('hr-calendar-month-label');
    if (labelEl) labelEl.textContent = hrCalDraft.month;
    // Các nút "Nghỉ định kỳ theo thứ"
    const wdBox = document.getElementById('hr-calendar-weekdays');
    if (wdBox) {
      wdBox.innerHTML = HR_DOW_GRID.map(d =>
        `<button type="button" class="hr-cal-wd${hrCalDraft.weekdaysOff.includes(d) ? ' on' : ''}" data-cal-wd="${d}" ` +
        `title="${hrCalDraft.weekdaysOff.includes(d) ? 'Nghỉ' : 'Làm việc'} định kỳ mỗi ${HR_DOW_SHORT[d]}">${HR_DOW_SHORT[d]}</button>`).join('');
    }
    // Lưới ngày của tháng (bắt đầu Thứ 2)
    const grid = document.getElementById('hr-calendar-grid');
    if (grid && /^\d{4}-\d{2}$/.test(hrCalDraft.month)) {
      const [yy, mm] = hrCalDraft.month.split('-').map(Number);
      const nDays = new Date(yy, mm, 0).getDate();
      const firstDow = new Date(yy, mm - 1, 1).getDay();        // 0 = CN
      const pad = (firstDow + 6) % 7;                            // lưới bắt đầu T2
      const todayISO = hrTodayISO();
      let html = '';
      for (let p = 0; p < pad; p++) html += '<span class="hr-cal-cell hr-cal-empty"></span>';
      for (let d = 1; d <= nDays; d++) {
        const iso = `${hrCalDraft.month}-${String(d).padStart(2, '0')}`;
        const dow = new Date(yy, mm - 1, d).getDay();
        const inRest = hrCalDraft.restDays.includes(iso);
        const inWork = hrCalDraft.workDays.includes(iso);
        const isOff = hrCalDraft.weekdaysOff.includes(dow);
        const kind = inRest ? 'holiday' : (inWork ? 'workday' : (isOff ? 'off' : 'work'));
        const cls = kind === 'holiday' ? 'hr-cal-holiday'
          : (kind === 'workday' ? 'hr-cal-workday'
          : (kind === 'off' ? 'hr-cal-off' : 'hr-cal-work'));
        const tips = {
          work: 'Ngày làm việc',
          workday: 'Ngày LÀM BÙ — đi làm bình thường dù rơi vào thứ nghỉ (bấm để trả lại nghỉ theo thứ)',
          off: `Nghỉ định kỳ (${HR_DOW_SHORT[dow]}) — bấm để đánh dấu LÀM BÙ cho riêng ngày này`,
          holiday: 'Nghỉ/Lễ riêng — đi làm sẽ tính hết giờ vào TC'
        };
        html += `<button type="button" class="hr-cal-cell ${cls}${iso === todayISO ? ' today' : ''}" data-cal-day="${iso}" title="${tips[kind]}">` +
          `<b>${d}</b><span>${HR_DOW_SHORT[dow]}${kind === 'workday' ? ' · bù' : ''}</span></button>`;
      }
      grid.innerHTML = html;
    }
    // Dòng trạng thái
    const stEl = document.getElementById('hr-calendar-status');
    if (stEl) {
      const nRest = hrCalDraft.restDays.length;
      const nWork = hrCalDraft.workDays.length;
      const wdTxt = hrCalDraft.weekdaysOff.length
        ? 'nghỉ định kỳ: ' + hrCalDraft.weekdaysOff.slice().sort((a, b) => a - b).map(d => HR_DOW_SHORT[d]).join(', ')
        : 'KHÔNG nghỉ định kỳ theo thứ nào (mọi ngày đều là ngày làm việc)';
      stEl.textContent = `${hrCalDraft.month} — ${wdTxt} · ${nRest} ngày nghỉ/lễ riêng · ${nWork} ngày làm bù`;
    }
    initLucide();
  }

  // Lưu lịch tháng đang chỉnh vào state + localStorage (+ đồng bộ mây qua saveHrData)
  function handleHrCalendarSubmit(e) {
    e.preventDefault();
    const month = hrCalDraft.month;
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Tháng không hợp lệ — hãy chọn tháng trước khi lưu!', 'error'); return; }
    state.hrWorkCalendar[month] = {
      weekdaysOff: [...new Set(hrCalDraft.weekdaysOff)].sort((a, b) => a - b),
      restDays: [...new Set(hrCalDraft.restDays)].sort(),
      workDays: [...new Set(hrCalDraft.workDays)].sort(),
      updatedAt: new Date().toISOString(),
      updatedBy: state.currentUser ? (state.currentUser.email || state.currentUser.username || '') : ''
    };
    saveHrData();
    closeHrCalendarModal();
    renderHrView();
    const saved = state.hrWorkCalendar[month];
    showToast(`Đã lưu lịch làm việc tháng ${month} (${saved.restDays.length} ngày nghỉ/lễ riêng` +
      `${saved.workDays.length ? ` · ${saved.workDays.length} ngày làm bù` : ''})`, 'success');
  }

  // Đồng bộ cột "Vị Trí Trong Ngày" của chấm công theo dữ liệu Board:
  // rec.positions = các vị trí ĐANG được gán trong ngày (nguồn cho liên kết
  // công nhân ép ván + thống kê phân vị)
  function hrSyncAttPositionsFromAssignments(employeeId, date) {
    const rec = attRecordOf(employeeId, date);
    if (!rec) return;
    rec.positions = [...new Set((state.hrAssignments || [])
      .filter(a => a.date === date && a.employeeId === employeeId)
      .map(a => a.positionId))];
    rec.updatedAt = new Date().toISOString();
  }

  // ── RENDER BOARD — BẢNG ĐIỀU KHIỂN TRỰC QUAN (kiểu Kanban) ──────
  // Mỗi VỊ TRÍ = 1 thẻ cột; bên trong là các Ô NGƯỜI xếp chồng (số ô =
  // "Số Người Cần" của bảng trung gian). Ô trống "?" xám; ô đã gán = chip
  // xanh avatar + tên rút gọn + giờ. Bộ phận "Làm ca" tách 2 cột ca/thẻ.
  function hrInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function renderHrBoard() {
    const board = document.getElementById('hr-board');
    if (!board) return;
    if (!state.hrBoardDate) state.hrBoardDate = hrTodayISO();
    if (!state.hrBoardDept) state.hrBoardDept = 'Xưởng 2';
    const dateInput = document.getElementById('hr-board-date');
    if (dateInput && dateInput.value !== state.hrBoardDate) dateInput.value = state.hrBoardDate;
    const deptTabs = document.getElementById('hr-board-dept-tabs');
    if (deptTabs) {
      deptTabs.innerHTML = HR_DEPARTMENTS.map(d =>
        `<button type="button" class="hr-board-tab${d === state.hrBoardDept ? ' on' : ''}" data-board-dept="${escapeHTML(d)}">${escapeHTML(d)}</button>`).join('');
    }
    const dept = state.hrBoardDept;
    const cfg = hrShiftCfg(dept);
    const colCount = cfg.type === 'lamca' ? Math.max(1, cfg.shifts.length) : 1;
    const positions = (state.hrPositions || []).filter(p => p.department === dept);
    const posNeedOf = pid => (state.hrPositionNeeds || []).find(r => r.positionId === pid);
    const assigns = hrAssignmentsOf(state.hrBoardDate).filter(a => positions.some(p => p.id === a.positionId));

    // Chip tổng hợp tinh gọn trên đầu board
    const countEl = document.getElementById('hr-board-count');
    if (countEl) {
      const totalNeed = positions.reduce((s, p) => s + (Math.max(0, parseInt(posNeedOf(p.id)?.needQty, 10) || 1)) * colCount, 0);
      const fullCols = positions.reduce((s, p) => {
        for (let si = 0; si < colCount; si++) {
          const c = assigns.filter(a => a.positionId === p.id && (a.shiftIdx || 0) === si).length;
          s += Math.min(c, Math.max(0, parseInt(posNeedOf(p.id)?.needQty, 10) || 1));
        }
        return s;
      }, 0);
      countEl.innerHTML =
        `<span class="hr-stat-chip"><i data-lucide="calendar-days"></i> ${fmtDateDMY(state.hrBoardDate)}</span>` +
        `<span class="hr-stat-chip"><i data-lucide="layout-panel-left"></i> ${escapeHTML(dept)}</span>` +
        `<span class="hr-stat-chip"><i data-lucide="${cfg.type === 'lamca' ? 'moon-star' : 'sun'}"></i> ${cfg.type === 'lamca' ? colCount + ' ca' : 'Hành chính'}</span>` +
        `<span class="hr-stat-chip"><i data-lucide="users"></i> Đã bố trí <strong>${assigns.length}</strong>/${totalNeed}</span>`;
    }

    if (!positions.length) {
      board.innerHTML = `<div class="board-empty">
        <i data-lucide="layout-panel-left"></i>
        <p>Chưa có vị trí nào thuộc bộ phận <b>${escapeHTML(dept)}</b>.<br>Thêm ở thẻ "Vị Trí &amp; Kỹ Năng" (chọn Bộ Phận = ${escapeHTML(dept)}) — board tự lên cột.</p>
      </div>`;
      initLucide();
      return;
    }

    board.innerHTML = positions.map(p => {
      const need = Math.max(0, parseInt(posNeedOf(p.id)?.needQty, 10) || 1);
      let complete = true;
      const shifts = Array.from({ length: colCount }, (_, si) => {
        const range = hrShiftRange(cfg, si);
        const mine = assigns.filter(a => a.positionId === p.id && (a.shiftIdx || 0) === si)
          .sort((a, b) => String(a.start).localeCompare(String(b.start)));
        if (mine.length < need) complete = false;
        const slots = mine.map(a => {
          const emp = hrEmpById(a.employeeId);
          const timeTxt = `${fmtHour(a.start)}${a.end ? '–' + fmtHour(a.end) : ' → hết ca'}`;
          return `<div class="slot filled" draggable="true" title="${escapeHTML(emp?.name || '')} · ${escapeHTML(timeTxt)}"
            ondragstart="app.hrBoardDragStart(event, '${a.id}')" ondragend="this.classList.remove('dragging')" onclick="app.hrBoardOpenAssign('${p.id}', ${si}, '${a.id}')">
            <span class="slot-ava">${escapeHTML(hrInitials(emp?.name))}</span>
            <span class="slot-info"><b>${escapeHTML(hrShortName(emp?.name || 'Đã xóa'))}</b><i>${escapeHTML(timeTxt)}</i></span>
            <button type="button" class="slot-x" title="Bỏ người khỏi vị trí" onclick="event.stopPropagation(); app.hrBoardRemoveAssign('${a.id}')"><i data-lucide="x"></i></button>
          </div>`;
        });
        for (let k = mine.length; k < need; k++) {
          slots.push(`<div class="slot empty" title="Chưa có người — bấm để thêm"
            onclick="app.hrBoardOpenAssign('${p.id}', ${si}, '')"
            ondragover="event.preventDefault()" ondragenter="this.classList.add('over')" ondragleave="this.classList.remove('over')"
            ondrop="app.hrBoardDrop(event, '${p.id}', ${si})"><span>?</span></div>`);
        }
        // Nút "+" thêm nhanh nhân viên cho vị trí (mở cùng hộp thoại 3 bước)
        slots.push(`<button type="button" class="slot add" title="Thêm nhân viên cho vị trí này"
          onclick="app.hrBoardOpenAssign('${p.id}', ${si}, '')"><i data-lucide="plus"></i><span>Thêm người</span></button>`);
        return `<div class="board-shift">
          <div class="board-shift-name">${escapeHTML(colCount > 1 ? (cfg.shifts[si]?.name || ('Ca ' + (si + 1))) : 'Hành chính')}<span>${fmtHour(range.start)}–${fmtHour(range.end)}${range.brkH ? ' · nghỉ ' + fmtHm(range.brkH * 60) : ''}</span></div>
          <div class="board-slots">${slots.join('')}</div>
        </div>`;
      }).join('');
      return `<div class="board-col${complete ? ' complete' : ''}">
        <div class="board-col-head">
          <span class="board-col-title" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</span>
          <span class="board-col-need">cần ${need}${colCount > 1 ? `×${colCount}` : ''}</span>
          <span class="board-col-dot${complete ? ' ok' : ' warn'}" title="${complete ? 'Đã đủ người' : 'Chưa đủ người'}"></span>
        </div>
        <div class="board-col-body">${shifts}</div>
      </div>`;
    }).join('');
    initLucide();
  }

  function hrBoardSetDate(d) { state.hrBoardDate = d || hrTodayISO(); renderHrBoard(); }
  function hrBoardShiftDay(days) { state.hrBoardDate = hrShiftDateISO(state.hrBoardDate || hrTodayISO(), days); renderHrBoard(); }
  function hrBoardGoToday() { state.hrBoardDate = hrTodayISO(); renderHrBoard(); }
  function hrBoardSetDept(dept) { if (!dept) return; state.hrBoardDept = dept; renderHrBoard(); }

  // ── MODAL GÁN NGƯỜI VÀO Ô (3 bước: nhân viên → giờ bắt đầu → giờ kết thúc) ──
  // mode: '' = thêm mới (bấm ô trống) | id bản ghi = sửa | 'move:<id>' = kéo ô
  // sang vị trí khác (điền giờ bắt đầu mới tại vị trí mới, bản ghi cũ được dời)
  let hrBoardSuggestFor = ''; // positionId đang gợi ý nhân viên (ưu tiên kỹ năng)
  function hrBoardAssignCandidates(positionId, q) {
    const pos = hrPosById(positionId);
    const dept = pos?.department || '';
    const key = hrStripForMatch(q || '');
    return (state.hrEmployees || [])
      .filter(e => (e.status || 'active') === 'active')
      .filter(e => !key || hrStripForMatch(`${e.name || ''} ${e.code || ''}`).includes(key))
      .sort((a, b) => {
        const sk = x => ((x.skills || []).includes(positionId) ? 0 : 1);
        const dp = x => (x.department === dept ? 0 : 1);
        return sk(a) - sk(b) || dp(a) - dp(b) || String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      });
  }
  function renderBoardAssignSuggestions(q) {
    const box = document.getElementById('board-assign-suggest');
    if (!box || !hrBoardSuggestFor) return;
    const list = hrBoardAssignCandidates(hrBoardSuggestFor, q).slice(0, 12);
    if (!list.length) {
      box.innerHTML = '<div class="hr-combobox-empty">Không tìm thấy nhân viên nào</div>';
      box.style.display = 'block';
      return;
    }
    box.innerHTML = list.map(e => {
      const skilled = (e.skills || []).includes(hrBoardSuggestFor);
      // Người đã được bố trí trong ngày -> đánh dấu "Đã bố trí: ..." ngay trên
      // dòng gợi ý (VẪN chọn được — phục vụ 1 người nhiều công đoạn theo khung giờ)
      const mine = hrAssignmentsOf(state.hrBoardDate).filter(a => a.employeeId === e.id)
        .sort((a, b) => String(a.start).localeCompare(String(b.start)));
      const mineTxt = mine.length
        ? ` · Đã bố trí: ${mine.map(a => `${hrPosName(a.positionId)} ${fmtHour(a.start)}${a.end ? '–' + fmtHour(a.end) : '→hết ca'}`).join(', ')}`
        : '';
      return `<div class="hr-combobox-item${mine.length ? ' picked' : ''}" data-emp-id="${escapeHTML(e.id)}">
        <strong>${escapeHTML(e.name)}</strong>
        <span class="hr-combobox-meta">${escapeHTML((e.code ? e.code + ' · ' : '') + (e.department || ''))}${skilled ? ' · ★ có kỹ năng' : ''}${escapeHTML(mineTxt)}</span>
      </div>`;
    }).join('');
    box.style.display = 'block';
  }
  function pickBoardAssignEmployee(id) {
    const e = hrEmpById(id);
    const input = document.getElementById('board-assign-employee');
    const hidden = document.getElementById('board-assign-employee-id');
    if (e && input) input.value = e.name;
    if (hidden) hidden.value = id;
    const box = document.getElementById('board-assign-suggest');
    if (box) box.style.display = 'none';
  }
  function fillBoardAssignTimeSelects(cfg, shiftIdx, defStart, defEnd) {
    const startSel = document.getElementById('board-assign-start');
    const endSel = document.getElementById('board-assign-end');
    if (!startSel || !endSel) return;
    const range = hrShiftRange(cfg, shiftIdx);
    const opts = hrHalfHourOptions();
    startSel.innerHTML = opts.map(t => `<option value="${t}" ${t === (defStart || range.start) ? 'selected' : ''}>${fmtHour(t)}</option>`).join('');
    endSel.innerHTML = `<option value="">— Hết ca (${fmtHour(range.end)}) —</option>` +
      opts.map(t => `<option value="${t}" ${t === defEnd ? 'selected' : ''}>${fmtHour(t)}</option>`).join('');
  }

  function hrBoardOpenAssign(positionId, shiftIdx, assignId) {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-board-assign');
    const form = document.getElementById('board-assign-form');
    if (!modal || !form) return;
    form.reset();
    const dept = state.hrBoardDept || 'Xưởng 2';
    const cfg = hrShiftCfg(dept);
    hrBoardSuggestFor = positionId;
    const pos = hrPosById(positionId);
    const mode = String(assignId || '').startsWith('move:') ? 'move' : (assignId ? 'edit' : 'new');
    const srcId = mode === 'move' ? String(assignId).slice(5) : assignId;
    const src = srcId ? (state.hrAssignments || []).find(a => a.id === srcId) : null;
    const range = hrShiftRange(cfg, shiftIdx);

    document.getElementById('board-assign-mode').value = mode === 'edit' ? srcId : '';
    document.getElementById('board-assign-movefrom').value = mode === 'move' ? srcId : '';
    document.getElementById('board-assign-date').value = state.hrBoardDate;
    document.getElementById('board-assign-pos').value = positionId;
    document.getElementById('board-assign-shiftidx').value = shiftIdx;
    const titleEl = document.getElementById('board-assign-title');
    if (titleEl) {
      titleEl.innerHTML = mode === 'new'
        ? `<i data-lucide="user-plus"></i> Bố Trí: ${escapeHTML(pos?.name || '')} (${escapeHTML(range.label || '')})`
        : mode === 'move'
          ? `<i data-lucide="move"></i> Dời Người → ${escapeHTML(pos?.name || '')} <span style="font-weight:400;font-size:0.72rem;">(giờ mới = giờ kết thúc tại vị trí cũ)</span>`
          : `<i data-lucide="edit-3"></i> Sửa Bố Trí: ${escapeHTML(pos?.name || '')}`;
    }
    if (src && mode !== 'new') {
      pickBoardAssignEmployee(src.employeeId);
      fillBoardAssignTimeSelects(cfg, shiftIdx, src.start, mode === 'move' ? '' : src.end);
    } else {
      fillBoardAssignTimeSelects(cfg, shiftIdx, range.start, '');
      const inp = document.getElementById('board-assign-employee');
      if (inp) inp.value = '';
    }
    const box = document.getElementById('board-assign-suggest');
    if (box) box.style.display = 'none';
    modal.classList.add('show');
    initLucide();
  }

  function closeBoardAssignModal() {
    document.getElementById('modal-board-assign')?.classList.remove('show');
    hrBoardSuggestFor = '';
  }

  function handleBoardAssignSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const date = document.getElementById('board-assign-date').value;
    const positionId = document.getElementById('board-assign-pos').value;
    const shiftIdx = parseInt(document.getElementById('board-assign-shiftidx').value, 10) || 0;
    const employeeId = document.getElementById('board-assign-employee-id').value;
    const start = document.getElementById('board-assign-start').value;
    const end = document.getElementById('board-assign-end').value; // '' = mặc định hết ca
    const editId = document.getElementById('board-assign-mode').value;
    const moveFromId = document.getElementById('board-assign-movefrom').value;
    if (!employeeId) { showToast('Chọn nhân viên trước đã!', 'error'); return; }
    if (!date || !positionId) { showToast('Thiếu vị trí / ngày.', 'error'); return; }
    const dept = state.hrBoardDept || 'Xưởng 2';
    const cfg = hrShiftCfg(dept);
    const data = {
      // Khóa sinh nhật + suffix ngẫu nhiên: 2 lượt gán trong CÙNG 1 mili-giây
      // (kéo thẻ liên tiếp / máy nhanh) từng bị TRÙNG id → find(id) lấy nhầm bản
      // ghi khác → cắt sai giờ lịch sử. suffix làm id luôn DUY NHẤT.
      id: editId || `asg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date, department: dept, positionId, shiftIdx,
      employeeId, start, end,
      shiftLabel: cfg.type === 'lamca' ? (cfg.shifts[shiftIdx]?.name || '') : 'Hành chính',
      updatedAt: new Date().toISOString()
    };
    // Dời ô (kéo thả): LUÔN GIỮ LỊCH SỬ tại vị trí cũ — bản ghi cũ được chấm
    // dứt lúc giờ bắt đầu của vị trí mới (giờ mới = giờ kết thúc cũ, VD:
    // L.V.Tuấn 7h00–9h00 tại Bổ ống 2 → 9h00–hết ca tại Bốc luồng). Nếu giờ
    // mới <= giờ cũ thì bản ghi cũ GIỮ NGUYÊN — không bao giờ xóa lịch sử.
    if (moveFromId && moveFromId !== editId) {
      const src = (state.hrAssignments || []).find(a => a.id === moveFromId);
      if (src) {
        if (start > src.start) {
          src.end = start;
          src.updatedAt = new Date().toISOString();
        }
        hrSyncAttPositionsFromAssignments(src.employeeId, src.date);
      }
    }
    // Chặn TRÙNG: cùng người + cùng vị trí + cùng cột ca mà KHUNG GIỜ giao
    // nhau -> chặn (tránh ghi nhầm 2 lần). Người làm thêm ở KHUNG GIỜ KHÁC
    // nhau (kể cả quay lại đúng vị trí cũ) vẫn thêm bình thường.
    const toMinT = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
    const newStart = toMinT(start);
    let newEnd = toMinT(end);
    if (!newEnd || newEnd <= newStart) { const r = hrShiftRange(cfg, shiftIdx); newEnd = newEnd ? newEnd + 1440 : r.endMin; if (newEnd <= newStart) newEnd += 1440; }
    const conflict = (state.hrAssignments || []).find(a =>
      a.id !== editId && a.id !== moveFromId && a.date === date &&
      a.employeeId === employeeId && a.positionId === positionId && (a.shiftIdx || 0) === shiftIdx &&
      (() => {
        const as = toMinT(a.start);
        let ae = toMinT(a.end);
        if (!ae || ae <= as) { ae = ae ? ae + 1440 : hrShiftRange(cfg, a.shiftIdx || 0).endMin; if (ae <= as) ae += 1440; }
        return as < newEnd && newStart < ae;
      })());
    if (conflict) {
      showToast(`Đã bố trí ${hrEmpName(employeeId)} tại "${hrPosName(positionId)}" lúc ${fmtHour(conflict.start)}${conflict.end ? '–' + fmtHour(conflict.end) : ' → hết ca'} — trùng khung giờ. Chọn khung giờ khác nếu muốn làm thêm.`, 'error');
      return;
    }
    if (editId) {
      const idx = (state.hrAssignments || []).findIndex(a => a.id === editId);
      if (idx !== -1) state.hrAssignments[idx] = { ...state.hrAssignments[idx], ...data };
      else state.hrAssignments.push(data);
    } else {
      data.createdAt = new Date().toISOString();
      state.hrAssignments.push(data);
    }
    // ĐIỀN TAY (thêm mới / sửa giờ) tại vị trí khác — KHUNG GIỜ KHÁC: giờ BẮT
    // ĐẦU tại vị trí mới cũng là GIỜ KẾT THÚC tại các vị trí cũ của cùng nhân
    // viên (cùng ngày + cùng cột ca + cùng bộ phận) — giờ cũ tự cắt, không
    // chồng lấn. Chỉ cắt khi giờ mới MUỘN hơn giờ bắt đầu cũ (giữ lịch sử, GIỐNG
    // logic kéo thẻ: L.V.Tuấn 7h00–9h00 tại Bổ ống 2 → 9h00–hết ca tại Bốc luồng).
    const cutPos = [];
    (state.hrAssignments || []).forEach(a => {
      if (a.id === editId || a.id === moveFromId) return; // bỏ qua bản đang tạo/sửa/dời
      if (a.date !== date || a.employeeId !== employeeId) return;
      if (a.department !== dept || (a.shiftIdx || 0) !== shiftIdx) return;
      const as = toMinT(a.start);
      let ae = toMinT(a.end);
      if (!ae || ae <= as) { ae = hrShiftRange(cfg, a.shiftIdx || 0).endMin; if (ae <= as) ae += 1440; }
      if (newStart > as && ae > newStart) {
        a.end = start;
        a.updatedAt = new Date().toISOString();
        cutPos.push(hrPosName(a.positionId));
      }
    });
    // Gán người = có mặt làm việc: tự chấm "Đi làm" nếu ngày chưa chấm tay
    const rec = ensureAttRecord(employeeId, date);
    if (rec.status !== 'leave') rec.status = 'work';
    rec.updatedAt = new Date().toISOString();
    // Cột "Vị Trí Trong Ngày" của chấm công = đúng các vị trí được gán hôm đó
    hrSyncAttPositionsFromAssignments(employeeId, date);
    // Người làm vị trí này → tự học kỹ năng (như cơ chế phân vị chấm công)
    const emp = hrEmpById(employeeId);
    if (emp && !(emp.skills || []).includes(positionId)) emp.skills = [...(emp.skills || []), positionId];
    saveHrData();
    closeBoardAssignModal();
    renderHrView();
    showToast(`Đã bố trí ${hrEmpName(employeeId)} — ${hrPosName(positionId)} ${fmtHour(start)}${end ? '–' + fmtHour(end) : ''}`, 'success');
    if (cutPos.length) {
      showToast(`Giờ ${fmtHour(start)} tại "${hrPosName(positionId)}" cũng là giờ kết thúc tại: ${cutPos.join(', ')} — lịch sử cũ được giữ lại.`, 'info');
    }
  }

  function hrBoardRemoveAssign(id) {
    if (!requireEditPermission()) return;
    const a = (state.hrAssignments || []).find(x => x.id === id);
    if (!a) return;
    trackDeleted('hrAssignments', id);
    state.hrAssignments = (state.hrAssignments || []).filter(x => x.id !== id);
    hrSyncAttPositionsFromAssignments(a.employeeId, a.date);
    saveHrData();
    renderHrView();
    showToast(`Đã bỏ ${hrEmpName(a.employeeId)} khỏi ${hrPosName(a.positionId)}`, 'info');
  }

  // ── KÉO Ô NGƯỜI SANG VỊ TRÍ KHÁC ────────────────────────────────
  let hrBoardDraggingId = '';
  function hrBoardDragStart(ev, assignId) {
    hrBoardDraggingId = assignId;
    if (ev && ev.target && ev.target.classList) ev.target.classList.add('dragging'); // hiệu ứng mờ chip đang kéo
    if (ev && ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      try { ev.dataTransfer.setData('text/plain', assignId); } catch (e) {}
    }
  }
  function hrBoardDrop(ev, positionId, shiftIdx) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const id = hrBoardDraggingId || (ev && ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '');
    hrBoardDraggingId = '';
    if (!id) return;
    const src = (state.hrAssignments || []).find(a => a.id === id);
    if (!src) return;
    if (src.positionId === positionId && (src.shiftIdx || 0) === shiftIdx) return;
    // Dời người: giữ nguyên nhân viên, điền giờ bắt đầu mới tại vị trí mới
    hrBoardOpenAssign(positionId, shiftIdx, `move:${id}`);
    const cfg = hrShiftCfg(state.hrBoardDept || 'Xưởng 2');
    fillBoardAssignTimeSelects(cfg, shiftIdx, src.start, '');
    showToast(`Giờ chọn tại vị trí mới cũng là giờ kết thúc tại "${hrPosName(src.positionId)}" — lịch sử cũ được giữ lại.`, 'info');
  }

  // ── CÀI ĐẶT CA LÀM VIỆC THEO BỘ PHẬN (bảng cấu hình — linh hoạt chỉnh sau) ──
  function openShiftModal() {
    if (!requireEditPermission()) return;
    const modal = document.getElementById('modal-shift');
    if (!modal) return;
    const dept = state.hrBoardDept || 'Xưởng 2';
    const cfg = hrShiftCfg(dept);
    document.getElementById('shift-dept').value = dept;
    const labelEl = document.getElementById('shift-dept-label');
    if (labelEl) labelEl.textContent = dept;
    renderShiftRows(cfg);
    document.getElementById('modal-shift').classList.add('show');
    initLucide();
  }
  // Vẽ các dòng thời gian ca: hành chính = Sáng/Chiều; làm ca = Ca ngày/Ca đêm
  // Bảng cấu hình ca: Tên ca · Bắt đầu · Kết thúc · Nghỉ (giờ — chỉ Làm ca)
  function renderShiftRows(cfg) {
    const type = cfg.type || 'hanhchinh';
    const preset = BOARD_SHIFT_PRESETS[type];
    const shifts = (cfg.shifts && cfg.shifts.length) ? cfg.shifts : preset.shifts;
    document.querySelectorAll('input[name="shift-type"]').forEach(r => { r.checked = r.value === type; });
    const box = document.getElementById('shift-rows');
    if (!box) return;
    const isCa = type === 'lamca';
    box.innerHTML = `<div class="shift-row-head">
        <span>Tên ca</span><span>Bắt đầu</span><span>Kết thúc</span><span>Nghỉ (giờ)</span>
      </div>` +
      shifts.map((s, i) => {
        const brk = hrShiftBrkH({ type, shifts }, i);
        return `
      <div class="shift-row">
        <input type="text" data-shift-i="${i}" data-shift-f="name" value="${escapeHTML(s.name || '')}" placeholder="Tên ca">
        <input type="time" data-shift-i="${i}" data-shift-f="start" value="${escapeHTML(s.start || '')}" step="1800">
        <input type="time" data-shift-i="${i}" data-shift-f="end" value="${escapeHTML(s.end || '')}" step="1800">
        ${isCa
          ? `<input type="number" data-shift-i="${i}" data-shift-f="brk" value="${brk}" min="0" max="6" step="0.5"
               title="Số giờ NGHỈ của ca — trừ vào CUỐI CA, KHÔNG tính vào HC lẫn TC (VD 1.5 = 1h30)">`
          : `<span class="shift-row-na" title="Nghỉ trưa nằm giữa 2 buổi — hệ thống tự loại khỏi HC/TC">— nghỉ trưa —</span>`}
      </div>`;
      }).join('') +
      `<div style="font-size:0.72rem;color:var(--text-muted);">Hành chính: các ca gộp thành 1 cột/ngày · Làm ca: mỗi ca là 1 cột riêng — ô <b>Nghỉ (giờ)</b> chỉ dùng ở <b>Làm ca</b> và bị trừ vào <b>CUỐI CA</b> (VD Ca ngày 07:00–19:00 nghỉ 1h30 → làm đủ ca = 10h30 HC; để trống = mặc định ca 1 nghỉ 1h30, ca sau nghỉ 1h).</div>`;
  }
  // Đổi loại ca trong modal → nạp lại giờ mặc định của loại đó (chưa lưu)
  function setShiftTypePreset(type) {
    if (!BOARD_SHIFT_PRESETS[type]) return;
    const dept = state.hrBoardDept || 'Xưởng 2';
    const cfg = hrShiftCfg(dept);
    const preset = BOARD_SHIFT_PRESETS[type];
    const cur = { ...cfg, type };
    cur.shifts = (cfg.type === type) ? (cfg.shifts || preset.shifts) : preset.shifts;
    renderShiftRows(cur);
  }
  function closeShiftModal() {
    document.getElementById('modal-shift')?.classList.remove('show');
  }
  function handleShiftSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const dept = document.getElementById('shift-dept').value;
    const typeEl = document.querySelector('input[name="shift-type"]:checked');
    const type = typeEl ? typeEl.value : 'hanhchinh';
    const rows = {};
    document.querySelectorAll('#shift-rows [data-shift-i]').forEach(inp => {
      const i = inp.getAttribute('data-shift-i');
      rows[i] = rows[i] || { name: '', start: '', end: '', brk: '' };
      rows[i][inp.getAttribute('data-shift-f')] = inp.value.trim();
    });
    // NGHỈ (giờ) của ca — chỉ Làm ca; để trống = mặc định (ca 1 = 1h30, ca sau = 1h);
    // Hành chính luôn 0 (nghỉ trưa tự loại giữa 2 buổi)
    const shifts = Object.keys(rows).sort((a, b) => a - b).map(i => rows[i]).filter(s => s.start && s.end)
      .map((s, i) => {
        const raw = String(s.brk == null ? '' : s.brk).replace(',', '.');
        let brk = Number(raw);
        if (raw === '' || !Number.isFinite(brk) || brk < 0) brk = (type === 'lamca') ? (i === 0 ? 1.5 : 1) : 0;
        return { name: s.name, start: s.start, end: s.end, brk: Math.min(brk, 6) };
      });
    if (!shifts.length) { showToast('Cần ít nhất 1 ca có giờ bắt đầu và giờ kết thúc!', 'error'); return; }
    const idx = (state.hrShifts || []).findIndex(s => s.id === dept);
    const cfg = { id: dept, type, shifts, updatedAt: new Date().toISOString() };
    if (idx !== -1) state.hrShifts[idx] = { ...state.hrShifts[idx], ...cfg };
    else { cfg.createdAt = new Date().toISOString(); state.hrShifts.push(cfg); }
    saveHrData();
    closeShiftModal();
    renderHrView();
    showToast(`Đã lưu ca làm việc cho ${dept}: ${type === 'lamca' ? shifts.length + ' ca' : 'Hành chính'}`, 'success');
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
    { key: 'quitDate',   label: 'Ngày Nghỉ Việc', hints: ['ngay nghi viec', 'ngay nghi', 'nghi viec', 'quit date', 'ngay ket thuc'] },
    { key: 'status',     label: 'Trạng Thái',    hints: ['trang thai', 'status', 'tinh trang'] },
    { key: 'notes',      label: 'Ghi Chú',       hints: ['ghi chu', 'note', 'notes', 'remark', 'dien giai'] }
  ];

  // Bỏ dấu tiếng Việt + lowercase để so khớp tiêu đề cột
  function hrStripDiacritics(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  }
  // Chuẩn hóa tên để SO KHỚP (gộp khoảng trắng thừa — nhập tay hay bị
  // "Nguyễn Văn  A" 2 dấu cách). Dùng chung cho HR + Xuất Excel + Biểu đồ.
  function hrStripForMatch(s) {
    return hrStripDiacritics(s).replace(/\s+/g, ' ');
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
  // CHỐNG TREO (19/10/2026): `sheet_to_json` đọc theo `ws['!ref']` (vùng Excel tự
  // khai báo), KHÔNG theo ô có dữ liệu. File có kẻ khung/format ở cột xa hoặc
  // hàng trống rất nhiều ⇒ `!ref` phình (VD A1:ZZ20000 dù chỉ có 200 dòng thật)
  // ⇒ materialize hàng trăm nghìn ô, đo thật 10,3 giây / 283 MB → "Page
  // Unresponsive". Vì vậy: (1) tự tính VÙNG DÙNG THẬT rồi truyền `range`;
  // (2) cắt cột/dòng trống cuối + chặn trần; (3) hiện overlay chờ.
  const HR_IMPORT_MAX_COLS = 80;    // trần số cột đưa vào bảng ánh xạ
  const HR_IMPORT_MAX_ROWS = 5000;  // trần số dòng dữ liệu
  const HR_IMPORT_WARN_MB  = 12;    // cảnh báo file lớn
  const HR_IMPORT_MAX_MB   = 30;    // từ chối file quá lớn

  let employeeImportSheet = null; // { aoa, headers, rows, mapping, fileName, sheetName }

  // Đổi địa chỉ ô ("AB12") → { r, c } (0-based) — parse tay để không phụ thuộc XLSX
  function hrCellAddrToRC(addr) {
    const m = String(addr || '').match(/^([A-Za-z]+)(\d+)$/);
    if (!m) return null;
    const letters = m[1].toUpperCase();
    let c = 0;
    for (let i = 0; i < letters.length; i++) c = c * 26 + (letters.charCodeAt(i) - 64);
    return { r: parseInt(m[2], 10) - 1, c: c - 1 };
  }

  // VÙNG DÙNG THẬT của sheet (chỉ tính ô có giá trị) + cờ vượt trần cột/dòng.
  // Tuyệt đối không tin `!ref`: file thật hay khai báo tới cột XFD hàng chục
  // nghìn dòng trống ⇒ đọc hết sẽ treo trình duyệt.
  function hrSheetUsedRange(ws) {
    const empty = { range: { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }, cols: 0, rows: 0, colsCapped: false, rowsCapped: false };
    if (!ws || typeof ws !== 'object') return empty;
    let maxR = -1, maxC = -1;
    Object.keys(ws).forEach(addr => {
      if (!addr || addr.charCodeAt(0) === 33) return; // bỏ !ref / !merges / !cols / !margins…
      const cell = ws[addr];
      if (!cell || typeof cell !== 'object') return;
      const v = cell.v;
      if (v === undefined || v === null || String(v).trim() === '') return; // ô format suông / ô rỗng
      const pos = hrCellAddrToRC(addr);
      if (!pos) return;
      if (pos.r > maxR) maxR = pos.r;
      if (pos.c > maxC) maxC = pos.c;
    });
    if (maxR < 0 || maxC < 0) return empty;
    return {
      range: {
        s: { r: 0, c: 0 },
        e: { r: Math.min(maxR, HR_IMPORT_MAX_ROWS - 1), c: Math.min(maxC, HR_IMPORT_MAX_COLS - 1) }
      },
      cols: maxC + 1,
      rows: maxR + 1,
      colsCapped: (maxC + 1) > HR_IMPORT_MAX_COLS,
      rowsCapped: (maxR + 1) > HR_IMPORT_MAX_ROWS
    };
  }

  // ─── CHUẨN HÓA KHÓA SO KHỚP (chống tạo dòng trùng khi nạp) ────────
  // Mã NV: bỏ khoảng trắng/ký tự lạ, IN HOA, bỏ số 0 vô nghĩa:
  // "NV 001" · "nv001" · số 1 (Excel lưu dạng số) → cùng khóa "NV1".
  function hrNormCode(v) {
    if (v === undefined || v === null) return '';
    let s = String(v).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!s) return '';
    s = s.replace(/^([A-Z]*)0+(\d)/, '$1$2');
    return s;
  }

  // Tên để so khớp: bỏ dấu + bỏ ký tự lạ + gộp khoảng trắng + lowercase
  // ("Nguyễn  Văn A." ≡ "nguyen van a").
  function hrNormNameKey(v) {
    return hrStripForMatch(v).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Chỉ giữ chữ số, lấy 9 số cuối (SĐT/CCCD hay ghi +84 / 0… lệch đầu số)
  function hrDigits9(v) {
    const d = String(v === undefined || v === null ? '' : v).replace(/\D/g, '');
    return d.length >= 9 ? d.slice(-9) : '';
  }

  // Giới tính / Trạng thái dạng CHẶT: không nhận ra thì trả '' (KHÔNG mặc định)
  // — dùng khi CẬP NHẬT để ô ghi chữ lạ không tự đổi dữ liệu đang đúng.
  function hrNormGenderStrict(v) {
    const t = hrStripDiacritics(v);
    if (!t) return '';
    if (t.startsWith('nu') || t.includes('female') || t === 'f') return 'Nữ';
    if (t.startsWith('nam') || t.includes('male') || t === 'm') return 'Nam';
    return '';
  }
  function hrNormStatusStrict(v) {
    const t = hrStripDiacritics(v);
    if (!t) return '';
    if (t.includes('tam nghi')) return 'pause';
    if (t.includes('nghi viec') || t.includes('da nghi') || t.includes('nghi huu')) return 'quit';
    if (t.includes('dang lam') || t.includes('lam viec') || t.includes('di lam') || t === 'active' || t.includes('hoat dong')) return 'active';
    return '';
  }

  // Mã NV kế tiếp chưa dùng (NV001, NV002…) — cùng quy ước với form Thêm nhân viên.
  // `usedSet` (tùy chọn) để nạp hàng loạt không phải quét lại nhiều lần.
  function hrNextEmployeeCode(usedSet) {
    const used = usedSet || new Set((state.hrEmployees || []).map(e => hrNormCode(e.code)).filter(Boolean));
    for (let i = 1; i <= 99999; i++) {
      const code = 'NV' + String(i).padStart(3, '0');
      const key = hrNormCode(code);
      if (!used.has(key)) { used.add(key); return code; }
    }
    return 'NV' + Date.now();
  }

  // Lập chỉ mục nhân viên đã có (Mã NV · Họ tên · SĐT) — O(N) một lần cho cả file
  function hrEmpIndexBuild(list) {
    const byCode = new Map(), byName = new Map(), byPhone = new Map();
    (list || []).forEach(e => {
      const ck = hrNormCode(e.code);
      if (ck && !byCode.has(ck)) byCode.set(ck, e);
      const nk = hrNormNameKey(e.name);
      if (nk) {
        if (!byName.has(nk)) byName.set(nk, []);
        byName.get(nk).push(e);
      }
      const p9 = hrDigits9(e.phone);
      if (p9 && !byPhone.has(p9)) byPhone.set(p9, e);
    });
    return { byCode, byName, byPhone };
  }

  function hrEmpIndexAdd(index, emp) {
    const ck = hrNormCode(emp.code);
    if (ck && !index.byCode.has(ck)) index.byCode.set(ck, emp);
    const nk = hrNormNameKey(emp.name);
    if (nk) {
      if (!index.byName.has(nk)) index.byName.set(nk, []);
      index.byName.get(nk).push(emp);
    }
    const p9 = hrDigits9(emp.phone);
    if (p9 && !index.byPhone.has(p9)) index.byPhone.set(p9, emp);
  }

  // Tìm nhân viên đã có ứng với 1 dòng file.
  // Trả { emp, how:'code'|'name'|'phone' } · { emp:null, ambiguous:[...] } ·
  //      { emp:null, conflict:'trùng tên nhưng khác Mã NV' } · { emp:null }
  function hrFindEmployeeMatch(row, index) {
    const codeK = hrNormCode(row.code);
    const nameK = hrNormNameKey(row.name);
    const p9 = hrDigits9(row.phone);
    const idc = hrDigits9(row.idCard);
    if (codeK && index.byCode.has(codeK)) return { emp: index.byCode.get(codeK), how: 'code' };

    const sameName = nameK ? (index.byName.get(nameK) || []) : [];
    if (sameName.length === 1) {
      const found = sameName[0];
      // Người cũ ĐÃ CÓ mã, dòng mới có mã KHÁC ⇒ coi là người khác (trùng tên),
      // KHÔNG ghi đè lên hồ sơ người cũ.
      if (codeK && hrNormCode(found.code) && hrNormCode(found.code) !== codeK) {
        return { emp: null, conflict: 'trùng tên nhưng khác Mã NV' };
      }
      return { emp: found, how: 'name' };
    }
    if (sameName.length > 1) {
      // Nhiều người cùng tên → thu hẹp bằng SĐT / CCCD / ngày sinh; vẫn mơ hồ
      // thì KHÔNG tự sửa (tránh sửa nhầm người).
      let pool = sameName;
      if (p9) { const p = pool.filter(e => hrDigits9(e.phone) === p9); if (p.length) pool = p; }
      if (pool.length > 1 && idc) { const p = pool.filter(e => hrDigits9(e.idCard) === idc); if (p.length) pool = p; }
      if (pool.length > 1 && row.birthDate) { const p = pool.filter(e => String(e.birthDate || '') === row.birthDate); if (p.length) pool = p; }
      if (pool.length === 1) return { emp: pool[0], how: 'name' };
      return { emp: null, ambiguous: sameName.map(e => e.name) };
    }
    if (p9 && index.byPhone.has(p9)) return { emp: index.byPhone.get(p9), how: 'phone' };
    return { emp: null };
  }

  // mapping UI dạng { colIndex: fieldKey } → { fieldKey: colIndex }
  function hrImportColMap(mapping) {
    const colByField = {};
    Object.keys(mapping || {}).forEach(col => {
      const f = mapping[col];
      if (f) colByField[f] = parseInt(col, 10);
    });
    return colByField;
  }

  // Đọc 1 dòng file → giá trị ĐÃ CHUẨN HÓA; ô trống trả '' (để luật "ô trống
  // KHÔNG ghi đè dữ liệu đang có" hoạt động đúng).
  function hrImportRowValues(row, colByField) {
    if (!row || !row.length) return null;
    const get = field => {
      const col = colByField[field];
      return (col === undefined || col === null) ? '' : row[col];
    };
    const text = v => String(v === undefined || v === null ? '' : v).trim();
    const has = v => text(v) !== '';
    const name = text(get('name'));
    const incoming = {
      code: hrNormCode(get('code')) ? text(get('code')) : '',
      name,
      gender: has(get('gender')) ? hrNormGenderStrict(get('gender')) : '',
      birthDate: hrNormDate(get('birthDate')),
      phone: text(get('phone')),
      idCard: text(get('idCard')),
      address: text(get('address')),
      department: has(get('department')) ? hrNormDept(get('department')) : '',
      position: text(get('position')),
      title: text(get('title')),
      joinDate: hrNormDate(get('joinDate')),
      status: has(get('status')) ? hrNormStatusStrict(get('status')) : '',
      notes: text(get('notes'))
    };
    return { name, incoming, get };
  }

  // Đếm số dòng trong file TRÙNG nhân viên đã có (cảnh báo trước khi chọn
  // "Thêm mới tất cả" — tránh nhân đôi danh sách khi nạp lại cùng 1 file).
  function hrCountImportMatches(aoa, mapping) {
    const colByField = hrImportColMap(mapping);
    const index = hrEmpIndexBuild(state.hrEmployees || []);
    let n = 0;
    for (let r = 1; r < (aoa || []).length; r++) {
      const vals = hrImportRowValues(aoa[r], colByField);
      if (!vals || !vals.name) continue;
      if (hrFindEmployeeMatch(vals.incoming, index).emp) n++;
    }
    return n;
  }

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
    // Xóa kết quả của lần nạp trước (nếu có)
    const resBox = document.getElementById('emp-import-result');
    if (resBox) { resBox.hidden = true; resBox.innerHTML = ''; }
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
    const sizeMb = (file.size || 0) / 1048576;
    if (sizeMb > HR_IMPORT_MAX_MB) {
      showToast(`File "${file.name}" quá lớn (${sizeMb.toFixed(1)} MB > ${HR_IMPORT_MAX_MB} MB). Hãy tách bớt dữ liệu rồi nạp lại!`, 'error');
      return;
    }
    // Reset trạng thái cũ — tránh nạp nhầm file trước khi đọc file mới
    employeeImportSheet = null;
    const doBtn0 = document.getElementById('btn-do-employee-import');
    if (doBtn0) doBtn0.disabled = true;
    const box0 = document.getElementById('emp-import-mapping-box');
    if (box0) box0.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;margin:0;">Đang đọc file… (file lớn có thể mất vài giây)</p>';
    const resBox0 = document.getElementById('emp-import-result');
    if (resBox0) { resBox0.hidden = true; resBox0.innerHTML = ''; }

    const reader = new FileReader();
    showTreLoading('Đang đọc file Excel…');
    reader.onload = (evt) => {
      // Nhường 1 nhịp để overlay chờ kịp vẽ (XLSX.read + sheet_to_json là ĐỒNG BỘ)
      setTimeout(() => {
        let treOk = true;
        try {
          const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array', cellDates: true });
          const sheetName = (wb.SheetNames && wb.SheetNames[0]) || '';
          const ws = sheetName ? wb.Sheets[sheetName] : null;
          if (!ws) throw new Error('File không có sheet dữ liệu!');

          // ─── ĐỌC THEO VÙNG DÙNG THẬT (chống treo "Page Unresponsive") ───
          const used = hrSheetUsedRange(ws);
          const aoa = XLSX.utils.sheet_to_json(ws, {
            header: 1, raw: true, defval: '', blankrows: false, range: used.range
          });
          // Dòng tiêu đề = dòng đầu tiên có ≥2 ô không trống (tránh dòng trang trí)
          let headerIdx = 0;
          for (let i = 0; i < Math.min(aoa.length, 10); i++) {
            const filled = (aoa[i] || []).filter(c => String(c === undefined || c === null ? '' : c).trim() !== '').length;
            if (filled >= 2) { headerIdx = i; break; }
          }
          const rawHeaders = (aoa[headerIdx] || []).map(c => String(c === undefined || c === null ? '' : c).trim());
          if (!rawHeaders.filter(Boolean).length) throw new Error('Không tìm thấy dòng tiêu đề cột (cần ≥2 ô có chữ ở dòng đầu).');
          // Cắt cột trống ở CUỐI (Excel hay khai báo thừa cột)
          let lastCol = rawHeaders.length - 1;
          while (lastCol >= 0 && rawHeaders[lastCol] === '') lastCol--;
          const headers = rawHeaders.slice(0, lastCol + 1);
          let rows = aoa.slice(headerIdx + 1)
            .map(r => (Array.isArray(r) ? r.slice(0, lastCol + 1) : []))
            .filter(r => r.some(c => String(c === undefined || c === null ? '' : c).trim() !== ''));
          if (!rows.length) throw new Error('File không có dòng dữ liệu nào!');
          const trimmedRows = rows.length > HR_IMPORT_MAX_ROWS;
          if (trimmedRows) rows = rows.slice(0, HR_IMPORT_MAX_ROWS);

          // Tự ánh xạ cột theo tiêu đề
          const mapping = {};
          const usedKeys = new Set();
          headers.forEach((h, col) => {
            const key = h ? autoMapEmployeeField(h, usedKeys) : null;
            mapping[col] = key;
            if (key) usedKeys.add(key);
          });

          employeeImportSheet = { aoa: [headers, ...rows], headers, rows, mapping, fileName: file.name, sheetName };
          renderEmployeeImportMapping(headers, rows, mapping);
          const doBtn = document.getElementById('btn-do-employee-import');
          if (doBtn) doBtn.disabled = false;

          const warns = [];
          if (used.colsCapped) warns.push(`chỉ đọc ${HR_IMPORT_MAX_COLS}/${used.cols} cột`);
          if (trimmedRows) warns.push(`chỉ đọc ${HR_IMPORT_MAX_ROWS}/${used.rows} dòng`);
          if (sizeMb > HR_IMPORT_WARN_MB) warns.push(`file ${sizeMb.toFixed(1)} MB`);
          showToast(`Đã đọc ${rows.length} dòng từ "${file.name}"` +
            (warns.length ? ` (${warns.join(' · ')})` : '') +
            ' — kiểm tra ánh xạ cột rồi bấm Nhập', warns.length ? 'info' : 'success');
        } catch (err) {
          treOk = false;
          const box = document.getElementById('emp-import-mapping-box');
          if (box) box.innerHTML = `<p style="color:#dc2626;font-size:0.8rem;margin:0;">⚠ ${escapeHTML(String((err && err.message) || err))}</p>`;
          showToast('Không đọc được file Excel: ' + String((err && err.message) || err), 'error');
        } finally {
          hideTreLoading(treOk);
        }
      }, 0);
    };
    reader.onerror = () => {
      hideTreLoading(false);
      showToast('Không đọc được file (lỗi FileReader)!', 'error');
    };
    reader.readAsArrayBuffer(file);
  }

  function renderEmployeeImportMapping(headers, rows, mapping) {
    const box = document.getElementById('emp-import-mapping-box');
    if (!box) return;
    const fieldOptions = '<option value="">-- Bỏ qua --</option>' +
      EMPLOYEE_IMPORT_FIELDS.map(f => `<option value="${f.key}">${escapeHTML(f.label)}</option>`).join('');
    // Chỉ vẽ tối đa HR_IMPORT_MAX_COLS cột — mỗi cột là 1 <select> + 14 <option>,
    // vẽ hàng nghìn cột sẽ treo trình duyệt.
    const cols = headers.slice(0, HR_IMPORT_MAX_COLS);
    const mapRows = cols.map((h, col) => {
      const sample = String(((rows[0] || [])[col]) === undefined || ((rows[0] || [])[col]) === null ? '' : (rows[0] || [])[col]);
      return `
      <tr>
        <td><strong>${escapeHTML(h || ('Cột ' + (col + 1)))}</strong></td>
        <td><select data-import-col="${col}">${fieldOptions}</select></td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(sample)}">${escapeHTML(sample)}</td>
      </tr>`;
    }).join('');
    const droppedCols = Math.max(0, headers.length - cols.length);
    box.innerHTML = `
      <p style="font-size:0.78rem; margin:0 0 8px; font-weight:700;">Ánh xạ cột file Excel → trường nhân viên</p>
      <div class="table-responsive" style="max-height:260px; border:1px solid var(--border-color); border-radius:var(--radius-md);">
        <table class="data-table">
          <thead><tr><th>Cột trong file</th><th>Trường nhân viên</th><th>Ví dụ (dòng đầu)</th></tr></thead>
          <tbody>${mapRows}</tbody>
        </table>
      </div>
      ${droppedCols ? `<p style="font-size:0.72rem;color:var(--text-muted);margin:6px 0 0;">Đã bỏ ${droppedCols} cột vượt trần ${HR_IMPORT_MAX_COLS} cột (chỉ đọc ${HR_IMPORT_MAX_COLS} cột đầu).</p>` : ''}`;
    // Gán giá trị tự ánh xạ vào từng select
    Object.keys(mapping).forEach(col => {
      const sel = box.querySelector(`select[data-import-col="${col}"]`);
      if (sel) sel.value = mapping[col] || '';
    });
  }

  // Nhập toàn bộ sheet vào state theo ánh xạ + chế độ.
  //   mode 'upsert' : khớp Mã NV → Họ tên (→ SĐT) thì CẬP NHẬT, chưa có thì thêm mới.
  //   mode 'add'    : thêm mới tất cả (vẫn đếm dòng "nghi trùng" để báo).
  // LUẬT GỘP "chỉ điền, không xóa": ô TRỐNG trong file KHÔNG ghi đè dữ liệu đang
  // có; ô CÓ dữ liệu thì cập nhật ⇒ nạp file thiếu cột = BỔ SUNG thông tin còn thiếu.
  // Trả về { added, updated, filled, unchanged, skipped, duplicates, ambiguous,
  //          nameConflicts, addedNames, updatedNames, duplicateNames,
  //          ambiguousNames, conflictNames }.
  function importEmployeesFromSheet(aoa, mapping, mode) {
    const result = {
      added: 0, updated: 0, filled: 0, unchanged: 0, skipped: 0,
      duplicates: 0, ambiguous: 0, nameConflicts: 0,
      addedNames: [], updatedNames: [], duplicateNames: [],
      ambiguousNames: [], conflictNames: []
    };
    const colByField = hrImportColMap(mapping);
    const list = state.hrEmployees || (state.hrEmployees = []);
    const index = hrEmpIndexBuild(list);
    const usedIds = new Set(list.map(e => e.id));
    const usedCodes = new Set(list.map(e => hrNormCode(e.code)).filter(Boolean));
    const pushName = (arr, n) => { if (arr.length < 10) arr.push(n); };
    let seq = 0;
    let codeSeq = 1;
    const takeCode = () => {
      for (let i = codeSeq; i <= 99999; i++) {
        const code = 'NV' + String(i).padStart(3, '0');
        const key = hrNormCode(code);
        if (!usedCodes.has(key)) { usedCodes.add(key); codeSeq = i + 1; return code; }
      }
      return 'NV' + Date.now();
    };

    for (let r = 1; r < aoa.length; r++) {
      const vals = hrImportRowValues(aoa[r], colByField);
      if (!vals) continue;
      const { name, incoming, get } = vals;
      if (!name) { result.skipped++; continue; }

      const match = hrFindEmployeeMatch(incoming, index);

      // ── CẬP NHẬT (chỉ ở chế độ upsert) ──────────────────────────────
      if (mode === 'upsert' && match.emp) {
        const cur = match.emp;
        const patch = {};
        let filled = 0;
        ['code', 'gender', 'birthDate', 'phone', 'idCard', 'address',
          'department', 'position', 'title', 'joinDate', 'status', 'notes'].forEach(f => {
          const val = incoming[f];
          // Ô TRỐNG trong file ⇒ GIỮ NGUYÊN dữ liệu đang có (không xóa oan)
          if (val === undefined || val === null || String(val).trim() === '') return;
          const oldVal = String(cur[f] === undefined || cur[f] === null ? '' : cur[f]).trim();
          if (oldVal === String(val).trim()) return;
          patch[f] = val;
          if (!oldVal) filled++;   // đang trống → nay được BỔ SUNG
        });
        if (String(cur.name || '').trim() !== name) patch.name = name;
        // Trạng thái nghỉ việc phải khớp quitDate (giống form Thêm/Sửa nhân viên)
        const nextStatus = patch.status || (cur.status || 'active');
        if (nextStatus === 'quit') {
          const qd = hrNormDate(get('quitDate')) || String(cur.quitDate || '');
          if (qd && qd !== String(cur.quitDate || '')) patch.quitDate = qd;
        } else if (cur.quitDate) {
          patch.quitDate = '';
        }
        if (Object.keys(patch).length) {
          patch.updatedAt = new Date().toISOString();
          Object.assign(cur, patch); // giữ id / createdAt / skills / dữ liệu khác
          result.updated++;
          result.filled += filled;
          pushName(result.updatedNames, name);
        } else {
          result.unchanged++;
        }
        continue;
      }

      // ── Không rõ là ai (nhiều người trùng tên) ⇒ KHÔNG tự sửa, KHÔNG thêm ──
      if (mode === 'upsert' && match.ambiguous) {
        result.ambiguous++;
        pushName(result.ambiguousNames, name);
        continue;
      }
      if (match.emp) {
        // "Thêm mới tất cả": dòng trùng người đã có → vẫn thêm nhưng ĐẾM để báo
        result.duplicates++;
        pushName(result.duplicateNames, name);
      } else if (match.conflict) {
        result.nameConflicts++;
        pushName(result.conflictNames, name);
      }

      // ── THÊM MỚI ───────────────────────────────────────────────────
      let newId;
      do {
        newId = `emp-${Date.now().toString(36)}-${(++seq).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      } while (usedIds.has(newId));
      usedIds.add(newId);

      const emp = {
        id: newId,
        code: incoming.code || takeCode(),
        name,
        gender: incoming.gender || hrNormGender(''),         // trống → 'Nam'
        birthDate: incoming.birthDate,
        phone: incoming.phone,
        idCard: incoming.idCard,
        address: incoming.address,
        department: incoming.department || hrNormDept(''),  // trống → bộ phận đầu
        position: incoming.position,
        title: incoming.title,
        joinDate: incoming.joinDate,
        status: incoming.status || hrNormStatus(''),        // trống → 'active'
        notes: incoming.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (emp.status === 'quit') {
        const qd = hrNormDate(get('quitDate'));
        if (qd) emp.quitDate = qd;
      }
      list.push(emp);
      hrEmpIndexAdd(index, emp);
      result.added++;
      pushName(result.addedNames, name);
    }
    return result;
  }

  // Bấm "Nhập Dữ Liệu": đọc lại ánh xạ + chế độ rồi nhập vào state
  function doEmployeeImport() {
    if (!requireEditPermission()) return;
    if (!employeeImportSheet) { showToast('Chưa chọn file Excel!', 'error'); return; }
    // Ánh xạ: bắt đầu từ bản TỰ NHẬN, chỉ đè các cột người dùng đã đổi trong bảng
    const mapping = Object.assign({}, employeeImportSheet.mapping || {});
    document.querySelectorAll('#emp-import-mapping-box select[data-import-col]').forEach(sel => {
      mapping[parseInt(sel.getAttribute('data-import-col'), 10)] = sel.value || null;
    });
    const upsertEl = document.getElementById('emp-import-mode-upsert');
    const mode = (upsertEl && upsertEl.checked) ? 'upsert' : 'add';
    const fileName = employeeImportSheet.fileName;

    // CẢNH BÁO TRÙNG trước khi "Thêm mới tất cả" — tránh nhân đôi danh sách
    // khi bấm nạp 2 lần cùng một file.
    if (mode === 'add') {
      const dup = hrCountImportMatches(employeeImportSheet.aoa, mapping);
      if (dup > 0 && !confirm(`Có ${dup} dòng trong file trùng nhân viên đã có (Mã NV / Họ tên / SĐT).\n\nOK = vẫn THÊM MỚI ${dup} dòng (danh sách sẽ có 2 dòng cùng người).\nCancel = quay lại đổi sang chế độ "Cập nhật".`)) return;
    }

    const res = importEmployeesFromSheet(employeeImportSheet.aoa, mapping, mode);
    saveHrData();
    renderHrView();
    renderEmployeeImportResult(res, fileName);
    const parts = [`thêm mới ${res.added}`, `cập nhật ${res.updated}`];
    if (res.filled) parts.push(`bổ sung ${res.filled} ô trống`);
    if (res.skipped) parts.push(`bỏ qua ${res.skipped} dòng thiếu tên`);
    if (res.duplicates) parts.push(`nghi trùng ${res.duplicates}`);
    if (res.ambiguous) parts.push(`trùng tên chưa rõ ${res.ambiguous}`);
    showToast(`Nạp xong từ "${fileName}": ${parts.join(' · ')}`,
      (res.added + res.updated) > 0 ? 'success' : 'info');
  }

  // Khối KẾT QUẢ NẠP — giữ modal mở để người dùng đối chiếu (không tự đóng),
  // nhờ vậy thấy ngay có bị tạo thêm dòng mới hay không.
  function renderEmployeeImportResult(res, fileName) {
    const box = document.getElementById('emp-import-result');
    if (!box) return;
    const row = (label, val, cls) => `<div class="emp-ires-row"><span class="emp-ires-k ${cls || ''}">${label}</span><span class="emp-ires-v">${val}</span></div>`;
    const names = arr => (arr && arr.length)
      ? escapeHTML(arr.slice(0, 6).join(', ')) + (arr.length > 6 ? ` … (+${arr.length - 6})` : '')
      : '—';
    box.innerHTML = `
      <p class="emp-ires-title">Kết quả nạp từ "${escapeHTML(fileName || '')}"</p>
      ${row('Thêm mới', res.added, 'is-add')}
      ${row('Cập nhật', res.updated, 'is-upd')}
      ${row('Bổ sung ô đang trống', res.filled || 0, 'is-fill')}
      ${row('Không đổi', res.unchanged || 0)}
      ${row('Bỏ qua (thiếu tên)', res.skipped || 0)}
      ${res.duplicates ? row('Nghi trùng — đã thêm mới', `${res.duplicates}: ${names(res.duplicateNames)}`, 'is-warn') : ''}
      ${res.nameConflicts ? row('Trùng tên khác Mã NV — đã thêm mới', `${res.nameConflicts}: ${names(res.conflictNames)}`, 'is-warn') : ''}
      ${res.ambiguous ? row('Trùng tên — KHÔNG tự sửa', `${res.ambiguous}: ${names(res.ambiguousNames)}`, 'is-warn') : ''}
      <p class="emp-ires-hint">Ô trống trong file KHÔNG ghi đè dữ liệu đang có. Hãy kiểm tra danh sách nhân viên trước khi đóng.</p>`;
    box.hidden = false;
  }

// ─── 8) THẺ NÔI — LAUNCHER BẂG NHÂN SỰ ─────────────────────────
  // Każda bảng Nhân Sự ma skróconą, pływającą kartę (hr-mini-card) w siatce
  // 5 thẻ na wiersz (desktop) / 3 (tablet) / 2 (telefon w pionie).
  // Bấm thẻ → otwórz szczegółowy bảng (xem / edycja), ponowne bấm → schowaj.
  // ─── 8) THẺ NÔI — LAUNCHER BẰNG DOCK 3 CẤP (19/10/2026) ────────
  // Cấp 1: nút HOME nổi giữa dưới → Cấp 2: 4 icon nhóm → Cấp 3: dải thẻ của
  // nhóm (các .hr-mini-card cũ, giữ nguyên id + listener). Trạng thái THUẦN UI
  // theo phiên (không lưu mây/backup); rời tab Nhân Sự thì tự đóng (main.js).
  const HR_DOCK_GROUPS = [
    { id: 'hoso',      label: 'Hồ sơ',      icon: 'users',       color: '#0284c7' },
    { id: 'ngaycong',  label: 'Ngày công',  icon: 'clock',       color: '#d97706' },
    { id: 'thongke',   label: 'Thống kê',   icon: 'bar-chart-3', color: '#0d9488' },
    { id: 'tuyendung', label: 'Tuyển dụng', icon: 'user-search', color: '#db2777' }
  ];
  let hrDockLevel = 0;   // 0 = đóng · 1 = chọn nhóm · 2 = chọn thẻ
  let hrDockGroup = '';

  function hrDockState() { return { level: hrDockLevel, group: hrDockGroup }; }
  function hrDockSetHidden(el, hidden) {
    if (!el) return;
    el.hidden = !!hidden;
    try { el.setAttribute('aria-hidden', hidden ? 'true' : 'false'); } catch (e) {}
  }
  function hrDockRender() {
    const dock = document.getElementById('hr-dock');
    if (!dock) return;
    try { dock.setAttribute('data-level', String(hrDockLevel)); } catch (e) {}
    if (dock.classList) {
      dock.classList.toggle('is-open', hrDockLevel > 0);
      dock.classList.toggle('is-group', hrDockLevel === 2);
    }
    const home = document.getElementById('hr-dock-home');
    if (home) {
      try {
        home.setAttribute('aria-expanded', hrDockLevel > 0 ? 'true' : 'false');
        home.setAttribute('title', hrDockLevel > 0 ? 'Đóng bảng Nhân Sự' : 'Mở bảng Nhân Sự');
      } catch (e) {}
    }
    hrDockSetHidden(document.getElementById('hr-dock-groups'), hrDockLevel !== 1);
    hrDockSetHidden(document.getElementById('hr-dock-panel'), hrDockLevel !== 2);
    const g = HR_DOCK_GROUPS.find(x => x.id === hrDockGroup) || null;
    const title = document.getElementById('hr-dock-title');
    if (title) title.textContent = g ? g.label : 'Bảng Nhân Sự';
    const countEl = document.getElementById('hr-dock-count');
    if (countEl) {
      let n = 0;
      if (hrDockGroup && typeof document.querySelector === 'function') {
        const panelEl = document.querySelector(`[data-hr-group-panel="${hrDockGroup}"]`);
        if (panelEl && typeof panelEl.querySelectorAll === 'function') {
          n = panelEl.querySelectorAll('.hr-mini-card').length;
        }
      }
      countEl.textContent = n ? `${n} bảng` : '';
    }
    const panel = document.getElementById('hr-dock-panel');
    if (panel && panel.style && typeof panel.style.setProperty === 'function') {
      panel.style.setProperty('--dock-g', g ? g.color : 'var(--primary)');
    }
    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('[data-hr-group-panel]').forEach(p => {
        if (p && p.classList) p.classList.toggle('is-active', p.getAttribute('data-hr-group-panel') === hrDockGroup);
      });
      document.querySelectorAll('[data-hr-group]').forEach(b => {
        const on = b && b.getAttribute('data-hr-group') === hrDockGroup;
        if (b && b.classList) b.classList.toggle('is-active', !!on);
        if (b) { try { b.setAttribute('aria-expanded', on ? 'true' : 'false'); } catch (e) {} }
      });
    }
  }
  function hrDockToggle() {
    hrDockLevel = hrDockLevel > 0 ? 0 : 1;
    hrDockGroup = '';
    hrDockRender();
    return hrDockLevel;
  }
  function hrDockOpenGroup(id) {
    if (!HR_DOCK_GROUPS.some(g => g.id === id)) return false;
    hrDockGroup = id;
    hrDockLevel = 2;
    hrDockRender();
    return true;
  }
  function hrDockBack() {
    if (hrDockLevel !== 2) return;
    hrDockLevel = 1;
    hrDockGroup = '';
    hrDockRender();
  }
  function hrDockClose() {
    if (hrDockLevel === 0 && !hrDockGroup) return;
    hrDockLevel = 0;
    hrDockGroup = '';
    hrDockRender();
  }
  // Badge trên bong bóng nhóm — chỉ hiện khi có số đáng chú ý
  function hrDockBadges() {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text || '';
      if (el.classList) el.classList.toggle('is-on', !!text);
    };
    const emps = state.hrEmployees || [];
    const act = emps.filter(e => (e.status || 'active') === 'active').length;
    set('hr-dock-badge-hoso', emps.length ? `${act} NV` : '');
    const pendLv = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;
    const pendOt = (state.hrOvertimes || []).filter(o => (o.status || 'pending') === 'pending').length;
    set('hr-dock-badge-ngaycong', (pendLv + pendOt) ? `${pendLv + pendOt} chờ` : '');
    set('hr-dock-badge-thongke', '');
    const missing = (state.hrRecruitment || [])
      .filter(r => (r.status || 'open') === 'open')
      .reduce((s, r) => s + Math.max(0, (r.needQty || 0) - (r.hiredQty || 0)), 0);
    set('hr-dock-badge-tuyendung', missing ? `thiếu ${missing}` : '');
  }

  const HR_CARD_DEFS = {
    'hr-emp-card': { el: 'hr-mini-count-emp', count: () => {
      const all = state.hrEmployees || [];
      const act = all.filter(e => (e.status || 'active') === 'active').length;
      return all.length ? `${act}/${all.length} NV` : '0 NV';
    } },
    'hr-att-card': { el: 'hr-mini-count-att', count: () => {
      const d = state.hrAttDate || hrTodayISO();
      const work = (state.hrAttendance || []).filter(a => a.date === d && a.status === 'work').length;
      const pend = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;
      return `${fmtDateDMY(d)} · ${work} đi làm${pend ? ` · ${pend} chờ` : ''}`;
    } },
    'hr-pos-card': { el: 'hr-mini-count-pos', count: () => `${(state.hrPositions || []).length} vị trí` },
    'hr-ci-card': { el: 'hr-mini-count-ci', count: () => `${(state.hrCheckins || []).length} giờ máy` },
    'hr-leave-card': { el: 'hr-mini-count-leave', count: () => {
      const pend = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;
      return pend ? `${pend} chờ duyệt` : `${(state.hrLeaves || []).length} đơn`;
    } },
    'hr-ot-card': { el: 'hr-mini-count-ot', count: () => {
      const list = state.hrOvertimes || [];
      const pend = list.filter(o => (o.status || 'pending') === 'pending').length;
      return pend ? `${pend} chờ duyệt` : `${list.length} đơn`;
    } },
    'hr-stats-card': { el: 'hr-mini-count-stats', count: () => {
      const days = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'approved')
        .reduce((s, l) => s + (l.days || leaveDaysCount(l.from, l.to)), 0);
      return `${days} ngày nghỉ`;
    } },
    'hr-att-stats-card': { el: 'hr-mini-count-att-stats', count: () => {
      if (!/^\d{4}-\d{2}$/.test(state.hrAttMonth || '')) state.hrAttMonth = hrTodayISO().slice(0, 7);
      const stats = computeAttendanceStats(state.hrAttMonth);
      let work = 0, leave = 0, absent = 0;
      stats.forEach(s => { work += s.work; leave += s.leave; absent += s.absent; });
      const c = work + leave + absent;
      const rate = c ? Math.round(work * 1000 / c) / 10 : null;
      return rate === null ? `${state.hrAttMonth}` : `${rate}% đi làm`;
    } },
    'hr-recruit-card': { el: 'hr-mini-count-recruit', count: () => {
      const open = (state.hrRecruitment || []).filter(r => (r.status || 'open') === 'open');
      const missing = open.reduce((s, r) => s + Math.max(0, (r.needQty || 0) - (r.hiredQty || 0)), 0);
      return `${open.length} tuyển${missing ? ` · ${missing} thiếu` : ''}`;
    } },
    'hr-posneed-card': { el: 'hr-mini-count-posneed', count: () => {
      const list = state.hrPositionNeeds || [];
      const need = list.reduce((s, r) => s + (r.needQty || 0), 0);
      const missing = list.reduce((s, r) => s + Math.max(0, (r.needQty || 0) - (r.haveQty || 0)), 0);
      return `${list.length} vị trí${missing ? ` · thiếu ${missing}` : ''}`;
    } }
  };

  // Odśwież liczniki na thẻ — wywoływane z renderHrView po wlożeniu danych.
  function updateHrCardGrid() {
    Object.keys(HR_CARD_DEFS).forEach(cardId => {
      try {
        const el = document.getElementById(HR_CARD_DEFS[cardId].el);
        if (el) el.textContent = String(HR_CARD_DEFS[cardId].count());
      } catch (e) { /* nie blokuj rendera tab Nhân Sự */ }
    });
    try { hrDockBadges(); } catch (e) {}
  }

  // Zsynchronizuj podświetlenie thẻ ze stanem bảng — otwarta = widoczna
  // (bez hr-card-hidden) i rozwinięta (bez rate-table-collapsed).
  function syncHrMiniActive() {
    let openId = null;
    Object.keys(HR_CARD_DEFS).forEach(cardId => {
      const c = document.getElementById(cardId);
      if (c && !c.classList.contains('hr-card-hidden') && !c.classList.contains('rate-table-collapsed')) openId = cardId;
    });
    document.querySelectorAll('.hr-mini-card').forEach(t => {
      const act = t.getAttribute('data-hr-card') === openId;
      t.classList.toggle('hr-mini-active', act);
      t.setAttribute('aria-expanded', act ? 'true' : 'false');
    });
  }

  // Bang chi tiet Nhan Su bat dang POP-UP (noi len tren overlay) thay vi
  // truot xuong duoi. Bam the → bang (DOM node, giu nguyen bang Live + su kien)
  // duoc di chuyen vao modal overlay; bam lai cung the / nut Dong / bam
  // nen mo → dong va tra bang ve stack goc (accordion: chi 1 bang mo).
    let openDetailCard = null;
  // Đặt đỉnh pop-up ngay dưới header — header không bị che / không bị làm mờ
  function hrPositionDetailOverlay() {
    const overlay = document.getElementById("hr-detail-overlay");
    if (!overlay) return;
    const header = document.querySelector('.app-header');
    if (header && typeof header.getBoundingClientRect === 'function') {
      const bottom = header.getBoundingClientRect().bottom;
      if (bottom > 0) overlay.style.top = Math.round(bottom) + 'px';
    }
  }
  function hrOpenCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return false;
    // Bam lai the dang mo → dong popup (dong = tra ve condensed view)
    if (openDetailCard === card) { hrCloseOpenCard(); return false; }
    // Dong bang dang mo (neu co) truoc khi mo bang moi (accordion)
    if (openDetailCard) hrCloseOpenCard();
    // Mo bang: bo an + di chuyen DOM node vao trong modal overlay
    card.classList.remove('hr-card-hidden');
    card.classList.remove('rate-table-collapsed');
    const content = document.getElementById("hr-detail-content");
    if (content) content.appendChild(card);
    openDetailCard = card;
    const h4 = card.querySelector && card.querySelector('.planning-card-header h4');
    const titleText = (h4 && typeof h4.textContent === 'string') ? h4.textContent.trim() : '';
    const titleEl = document.getElementById("hr-detail-title");
    if (titleEl) titleEl.textContent = titleText || 'Chi Tiết Nhân Sự';
    const overlay = document.getElementById("hr-detail-overlay");
        if (overlay) {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
      hrPositionDetailOverlay();
      if (typeof overlay.focus === 'function') overlay.focus({ preventScroll: true });
    }
    syncHrMiniActive();
    initLucide();
    return true;
  }
  function hrCloseOpenCard() {
    const overlay = document.getElementById("hr-detail-overlay");
    if (!openDetailCard) {
      if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
      return;
    }
    const card = openDetailCard;
    const stack = document.getElementById("hr-details-stack");
    if (stack) stack.appendChild(card); else document.getElementById('hr-view')?.appendChild(card);
    card.classList.add('hr-card-hidden');
    openDetailCard = null;
    if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
    syncHrMiniActive();
    initLucide();
  }

export {
  HR_DEPARTMENTS,
  LEAVE_TYPES,
  ATT_STATUS,
  approvedLeaveOn,
  attStatusOf,
  attRecordOf,
  autoMapEmployeeField,
  hrSheetUsedRange,
  hrCellAddrToRC,
  hrNormCode,
  hrNormNameKey,
  hrDigits9,
  hrNormGenderStrict,
  hrNormStatusStrict,
  hrEmpIndexBuild,
  hrFindEmployeeMatch,
  hrImportColMap,
  hrImportRowValues,
  hrCountImportMatches,
  hrNextEmployeeCode,
  renderEmployeeImportResult,
  HR_IMPORT_MAX_COLS,
  HR_IMPORT_MAX_ROWS,
  approveLeave,
  canApproveLeave,
  syncLeaveDurationUI,
  overtimeActualMin,
  renderHrOvertimesTable,
  openOvertimeModal,
  closeOvertimeModal,
  handleOvertimeSubmit,
  approveOvertime,
  rejectOvertime,
  deleteOvertime,
  renderOvertimeEmployeeSuggestions,
  pickOvertimeEmployee,
  handleOvertimeEmployeeKeydown,
  hideOvertimeEmployeeSuggestions,
  closeEmployeeImportModal,
  closeEmployeeModal,
  closeLeaveModal,
  closePositionModal,
  closeRecruitmentModal,
  closePositionNeedModal,
  collectEmployeeSkills,
  computeAttendanceStats,
  computeLeaveStats,
  deleteEmployee,
  deleteLeave,
  deletePosition,
  deleteRecruitment,
  deletePositionNeed,
  hrSetPositionNeedQty,
  ensurePositionNeedsFromPositions,
  doEmployeeImport,
  handleEmployeeImportFile,
  handleEmployeeSubmit,
  handleLeaveEmployeeKeydown,
  handleLeaveSubmit,
  handlePositionSubmit,
  handleRecruitmentSubmit,
  handlePositionNeedSubmit,
  hideLeaveEmployeeSuggestions,
  hrAttGoToday,
  hrAttSetDate,
  hrAttSetMonth,
  hrAttShiftDay,
  hrTodayISO,
  hrEmpByName,
      hrOpenCard,
  hrCloseOpenCard,
  hrPositionDetailOverlay,
  HR_CARD_DEFS,
  // DOCK 3 CẤP (Home → nhóm → thẻ)
  HR_DOCK_GROUPS,
  hrDockState,
  hrDockRender,
  hrDockToggle,
  hrDockOpenGroup,
  hrDockBack,
  hrDockClose,
  hrDockBadges,
  hrPosName,
  hrPositionsNamesOf,
  hrPressWorkersNamesOf,
    hrWorkersForPress,
  isPressEpPos,
  hrWorkersForProduct,
  pressPositionPatternFor,
  importEmployeesFromSheet,
  leaveEmployeeSuggestions,
  loadHrData,
  openEmployeeImportModal,
  openEmployeeModal,
  syncEmployeeQuitDateRow,
  openLeaveModal,
  openPositionModal,
  openRecruitmentModal,
  openPositionNeedModal,
  pendingLeaveOn,
  pickLeaveEmployee,
  renderEmployeeSkillsBox,
  renderHrAttendanceCard,
  renderHrAttendanceStats,
  renderHrEmployeesTable,
  renderHrPositionsTable,
  renderHrRecruitmentTable,
  renderPositionNeedsTable,
  renderHrBoard,
  hrBoardSetDate,
  hrBoardShiftDay,
  hrBoardGoToday,
  hrBoardSetDept,
  hrBoardOpenAssign,
  closeBoardAssignModal,
  handleBoardAssignSubmit,
  hrBoardRemoveAssign,
  hrBoardDragStart,
  hrBoardDrop,
  renderBoardAssignSuggestions,
  pickBoardAssignEmployee,
  openShiftModal,
  closeShiftModal,
  handleShiftSubmit,
  setShiftTypePreset,
  hrShiftCfg,
  hrShiftRange,
  hrShiftBrkH,
  renderShiftRows,
  hrAssignTimesOf,
  hrSplitHoursHC,
  hrCalCfgOf,
  hrDayKindOf,
  hrIsRestDay,
  hrSplitHoursHCDate,
  openHrCalendarModal,
  closeHrCalendarModal,
  hrCalSetMonth,
  hrCalToggleDay,
  hrCalToggleWeekday,
  renderHrCalendarModal,
  handleHrCalendarSubmit,
  HR_DOW_SHORT,
  hrShortName,
  fmtHour,
  BOARD_SHIFT_PRESETS,
  renderHrView,
  renderHrCheckinTable,
  // ĐỐI CHIẾU BỐ TRÍ ↔ MÁY CHẤM CÔNG (engine + thao tác)
  ciCompareDay,
  ciRowsForRange,
  ciSummaryOf,
  ciSuggestEndFills,
  ciApplyEndFills,
  ciAckDay,
  ciUnackDay,
  ciActualSplit,
  ciPlannedOf,
  ciTimesheetHours,
  ciShiftMonth,
  ciSaveUi,
  ciReadUi,
  ciToMin,
  ciFromMin,
  ciTimeFromNum,
  ciSerialToDateTime,
  ciResolveEmployee,
  openCiEndfillModal,
  closeCiEndfillModal,
  renderCiEndfillList,
  applyCiEndfill,
  hrSplitHoursHCMin,
  CI_EARLY_ALLOW_MIN,
  CI_OT_BLOCK_MIN,
  CI_LATE_TOL_MIN,
  CI_VERDICT,
  HR_CI_UI_KEY,
  applyAllCheckins,
  applyCheckinRecord,
  checkinRecordOf,
  ciAutoMapCols,
  ciFindHeaderRow,
  ciNormDateTime,
  ciNormTime,
  closeCheckinImportModal,
  deleteCheckin,
  deleteCheckinsAll,
  doCheckinImport,
  handleCheckinImportFile,
  importCheckinsFromSheet,
  openCheckinImportModal,
  renderLeaveEmployeeSuggestions,
  rejectLeave,
  syncPositionNeedsFromEmployees,
  setAttendanceNote,
  setAttendanceStatus,
  syncHrMiniActive,
  syncSkillsFromAssignments,
  toggleAttendancePosition,
  updateHrCardGrid,
  // Helpers dùng chung cho Sản Lượng Ép + Xuất Excel + Biểu đồ
  hrStripForMatch,
  hrStripDiacritics
};
