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
import { logDataChange } from './history.js';
import { canViewAdvanced } from './permissions.js';
import { STORAGE_KEY_HR_EMPLOYEES, STORAGE_KEY_HR_LEAVES, STORAGE_KEY_HR_RECRUITMENT, STORAGE_KEY_HR_POSITIONS, STORAGE_KEY_HR_ATTENDANCE, STORAGE_KEY_HR_CHECKINS, state } from './state.js';
import { escapeHTML, showToast } from './utils.js';

  // ─── HẰNG SỐ NHÂN SỰ ────────────────────────────────────────────
  // Bộ phận cố định theo mô hình nhà máy — thứ tự này cũng dùng để SẮP XẾP
  // nhóm bộ phận trên bảng chấm công (Văn Phòng -> Cơ Điện -> QC -> Xưởng 1 -> Xưởng 2)
  const HR_DEPARTMENTS = ['Văn Phòng', 'Cơ Điện', 'QC', 'Xưởng 1', 'Xưởng 2', 'Lò Hơi'];
  const EMP_STATUS  = { active: 'Đang làm việc', pause: 'Tạm nghỉ', quit: 'Đã nghỉ việc' };
  const LEAVE_TYPES  = ['Nghỉ phép', 'Nghỉ không lương', 'Ốm', 'Việc gia đình', 'Khác'];
  const LEAVE_STATUS = { pending: 'Chờ duyệt', approved: 'Đồng ý', rejected: 'Không đồng ý' };
  const RECRUIT_STATUS = { open: 'Đang tuyển', done: 'Đã đủ người' };
  // Chấm công thủ công: đi làm / vắng. Riêng "Nghỉ có phép" KHÔNG lưu trùng —
  // suy ra trực tiếp từ đơn nghỉ đã duyệt (xem approvedLeaveOn).
  const ATT_STATUS = { work: 'Đi làm', absent: 'Vắng (không phép)' };

  // Ban lãnh đạo = Admin & Ban Quản Lý (hoặc được cấp riêng) — duyệt đơn nghỉ
  function canApproveLeave() { return canViewAdvanced(); }

  // ─── LƯU / NẠP DỮ LIỆU ──────────────────────────────────────────
  function loadHrData() {
    try { state.hrEmployees  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_EMPLOYEES))  || []; } catch (e) { state.hrEmployees  = []; }
    try { state.hrLeaves     = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_LEAVES))     || []; } catch (e) { state.hrLeaves     = []; }
    try { state.hrRecruitment = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_RECRUITMENT)) || []; } catch (e) { state.hrRecruitment = []; }
    try { state.hrPositions  = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_POSITIONS))  || []; } catch (e) { state.hrPositions  = []; }
    try { state.hrAttendance = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_ATTENDANCE)) || []; } catch (e) { state.hrAttendance = []; }
    try { state.hrCheckins   = JSON.parse(localStorage.getItem(STORAGE_KEY_HR_CHECKINS))   || []; } catch (e) { state.hrCheckins   = []; }
  }

  function saveHrData() {
    localStorage.setItem(STORAGE_KEY_HR_EMPLOYEES, JSON.stringify(state.hrEmployees || []));
    localStorage.setItem(STORAGE_KEY_HR_LEAVES, JSON.stringify(state.hrLeaves || []));
    localStorage.setItem(STORAGE_KEY_HR_RECRUITMENT, JSON.stringify(state.hrRecruitment || []));
    localStorage.setItem(STORAGE_KEY_HR_POSITIONS, JSON.stringify(state.hrPositions || []));
    localStorage.setItem(STORAGE_KEY_HR_ATTENDANCE, JSON.stringify(state.hrAttendance || []));
    localStorage.setItem(STORAGE_KEY_HR_CHECKINS, JSON.stringify(state.hrCheckins || []));
    // Ghi lịch sử sửa đổi (tóm tắt ai đã thêm/sửa/xóa mục Nhân Sự nào)
    logDataChange(['hrEmployees', 'hrLeaves', 'hrRecruitment', 'hrPositions', 'hrAttendance', 'hrCheckins']);
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
    renderHrLeaveStats();
    renderHrAttendanceStats();
    renderHrRecruitmentTable();
    updateHrCardGrid();
    syncHrMiniActive();
    initLucide();
  }

  // Điền danh sách nhân viên vào select đơn nghỉ + select lọc bộ phận.
  // QUAN TRỌNG: giữ nguyên lựa chọn đang có (cur) qua các lần render lại —
  // nếu không, mỗi lần đổi bộ lọc (gọi renderHrView) select "Bộ phận" bị xây
  // lại và snap về "Tất Cả" khiến bộ lọc tưởng như không hoạt động.
  function populateHrSelects() {
    ['hr-emp-filter-dept', 'hr-recruit-filter-dept', 'hr-att-filter-dept'].forEach(selId => {
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
    // Kỹ năng — các vị trí nhân viên có thể làm (tick nhiều vị trí)
    renderEmployeeSkillsBox(id ? (hrEmpById(id)?.skills || []) : []);
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
      if (rec) state.hrAttendance.splice(idx, 1);
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
  function hrWorkersForPress(date) {
    return hrWorkersForPosition(date, /ép/i);
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
  function pressPositionPatternFor(productName) {
    return /bullig/i.test(String(productName || '')) ? BULLIG_POS_MATCHER : /ép/i;
  }
  // Danh sách công nhân theo THÀNH PHẨM của lượt ép (tên TP quyết định vị trí)
  function hrWorkersForProduct(date, productName) {
    return hrWorkersForPosition(date, pressPositionPatternFor(productName));
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

    // Lọc đang làm việc + bộ phận + tìm nhanh (tên / mã NV), rồi sắp xếp theo
    // NHÓM BỘ PHẬN (Văn Phòng -> Cơ Điện -> QC -> Xưởng 1 -> Xưởng 2 -> Lò Hơi),
    // trong cùng bộ phận xếp theo tên.
    const deptOrder = d => { const i = HR_DEPARTMENTS.indexOf(d); return i === -1 ? HR_DEPARTMENTS.length : i; };
    const list = (state.hrEmployees || []).filter(e => (e.status || 'active') === 'active')
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

      return `<tr${st === 'leave' ? ' style="opacity:0.75;"' : ''}>
        <td><strong>${escapeHTML(e.name || '')}</strong>${e.code ? `<br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(e.code)}</span>` : ''}</td>
        <td>${escapeHTML(e.department || '—')}</td>
        <td>${statusCell}${ciBadge}</td>
        <td>${leaveCell}</td>
        <td><div class="att-pos-chips">${posChips}</div></td>
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
    const s = String(v || '').trim();
    let m = s.match(/(\d{1,2})[:h](\d{2})/);
    if (m) return `${String(+m[1]).padStart(2, '0')}:${m[2]}`;
    if (/^\d{3,4}$/.test(s)) { const t = s.padStart(4, '0'); return `${t.slice(0, 2)}:${t.slice(2)}`; }
    return '';
  }
  // Giải mã 1 ô Ngày / Ngày-giờ -> { date 'yyyy-mm-dd', time 'HH:mm' | '' }
  function ciNormDateTime(v) {
    if (v instanceof Date) {
      return { date: `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`,
               time: `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}` };
    }
    const s = String(v || '').trim();
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
    const byCode = code ? (state.hrEmployees || []).find(e =>
      String(e.code || '').trim().toLowerCase() === String(code).trim().toLowerCase()) : null;
    if (byCode) return byCode;
    const byName = name ? (state.hrEmployees || []).find(e =>
      String(e.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()) : null;
    return byName || null;
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
        if (key && !res.unmatched.some(u => u.key === key && u.row === r + 1)) res.unmatched.push({ key, row: r + 1 });
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
        if (upsertCheckin(emp.id, dt.date, inT, outT, 1, fileName)) res.added++; else res.updated++;
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
        if (upsertCheckin(empId, date, times[0], times.length > 1 ? times[times.length - 1] : '', times.length, fileName)) res.added++; else res.updated++;
      });
    }
    res.matched = res.added + res.updated;
    saveHrData();
    return res;
  }
  // Upsert 1 bản ghi giờ máy. Trả về true nếu thêm mới, false nếu cập nhật.
  function upsertCheckin(employeeId, date, inT, outT, punchCount, fileName) {
    const rec = (state.hrCheckins || []).find(c => c.employeeId === employeeId && c.date === date);
    const now = new Date().toISOString();
    if (rec) {
      rec.in = inT || rec.in; rec.out = outT || rec.out;
      rec.punches = punchCount || rec.punches; rec.fileName = fileName || rec.fileName;
      rec.updatedAt = now;
      return false;
    }
    state.hrCheckins.push({ id: `ci-${date}-${employeeId}`, employeeId, date, in: inT, out: outT, punches: punchCount || 1, fileName: fileName || '', createdAt: now, updatedAt: now });
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
    state.hrCheckins = [];
    saveHrData();
    renderHrView();
    showToast('Đã xóa toàn bộ dữ liệu giờ máy chấm công đã nạp', 'info');
  }
  // Bảng đối chiếu: NV | Ngày | Giờ máy | Chấm tay | Trạng thái khớp | Thao tác
  function renderHrCheckinTable() {
    const tbody = document.getElementById('hr-ci-body');
    if (!tbody) return;
    const list = (state.hrCheckins || []).slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) ||
        String(hrEmpName(a.employeeId)).localeCompare(String(hrEmpName(b.employeeId)), 'vi'));
    const countEl = document.getElementById('hr-ci-count');
    if (countEl) {
      const miss = list.filter(c => attStatusOf(c.employeeId, c.date) === '').length;
      const lech = list.filter(c => attStatusOf(c.employeeId, c.date) === 'absent').length;
      countEl.textContent = `${list.length} ngày (${miss} chưa chấm tay${lech ? `, ${lech} lệch` : ''})`;
    }
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:26px;color:var(--text-muted);">
        <i data-lucide="clock" style="width:26px;height:26px;margin-bottom:6px;"></i>
        <p>Chưa nạp giờ nào. Bấm "Nạp Giờ Máy Chấm Công" để chọn file Excel máy xuất.</p></td></tr>`;
      initLucide();
      return;
    }
    tbody.innerHTML = list.slice(0, 400).map(c => {
      const st = attStatusOf(c.employeeId, c.date);
      const time = `${c.in || '?'}${c.out ? '–' + c.out : ''}${c.punches > 2 ? ` (${c.punches} lần quét)` : ''}`;
      let matchCell, action = '';
      if (st === 'leave') {
        matchCell = `<span class="hr-chip ok" title="Có đơn nghỉ đã được ban lãnh đạo duyệt — giờ máy không áp dụng">Nghỉ có phép</span>`;
      } else if (st === 'work') {
        matchCell = `<span class="hr-chip ok">Khớp ✓</span>`;
      } else if (st === 'absent') {
        matchCell = `<span class="hr-chip off" title="Chấm tay ghi Vắng nhưng máy có vân tay">⚠ Chấm tay "Vắng"</span>`;
        action = `<button class="btn btn-success btn-sm" onclick="app.hrApplyCheckin('${escapeHTML(c.employeeId)}','${escapeHTML(c.date)}')" title="Đổi thành Đi làm theo máy"><i data-lucide="check"></i> Áp Dụng</button>`;
      } else {
        matchCell = `<span class="hr-chip warn" title="Máy có vân tay nhưng chưa ai chấm tay">Chưa chấm tay</span>`;
        action = `<button class="btn btn-success btn-sm" onclick="app.hrApplyCheckin('${escapeHTML(c.employeeId)}','${escapeHTML(c.date)}')"><i data-lucide="check"></i> Áp Dụng</button>`;
      }
      return `<tr>
        <td><strong>${escapeHTML(hrEmpName(c.employeeId))}</strong>${hrEmpDept(c.employeeId) !== '—' ? `<br><span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(hrEmpDept(c.employeeId))}</span>` : ''}</td>
        <td>${fmtDateDMY(c.date)}</td>
        <td class="hr-emp-code">${escapeHTML(time)}</td>
        <td>${matchCell}</td>
        <td class="text-right">${action}</td>
        <td class="text-right"><button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeleteCheckin('${escapeHTML(c.id)}')" title="Xóa bản ghi giờ này" style="color:var(--danger);"><i data-lucide="trash-2"></i></button></td>
      </tr>`;
    }).join('');
    initLucide();
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
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
        for (let r = 1; r < dataAoa.length; r++) {
          const row = dataAoa[r];
          if (!row || !row.length) continue;
          const dt = ciNormDateTime(col.date >= 0 ? row[col.date] : '');
          if (dt.date) { valid++; if (ciResolveEmployee(col.code >= 0 ? row[col.code] : '', col.name >= 0 ? row[col.name] : '')) empOk++; }
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
        box.innerHTML = `<div style="font-size:0.75rem; line-height:1.7; padding:8px 10px; background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md);">
          <strong>${escapeHTML(file.name)}</strong> — tiêu đề tại dòng ${headerRow + 1}, nhận cột: ${escapeHTML(colDesc)}<br>
          ${valid} dòng có ngày hợp lệ · <strong>${empOk} khớp nhân viên</strong>${valid - empOk > 0 ? ` · <span style="color:var(--danger);">${valid - empOk} dòng không khớp Mã NV/Tên (bỏ qua)</span>` : ''}
        </div>`;
      } catch (err) {
        checkinImportSheet = null;
        doBtn.disabled = true;
        box.innerHTML = `<div style="font-size:0.75rem; color:var(--danger); padding:8px 10px; background:#fee2e2; border-radius:var(--radius-md);">Không đọc được file: ${escapeHTML(err.message || String(err))}. Hãy xuất file Excel (.xlsx/.xls/.csv) từ máy chấm công.</div>`;
      }
      initLucide();
    };
    reader.readAsArrayBuffer(file);
  }
  function doCheckinImport() {
    if (!requireEditPermission()) return;
    if (!checkinImportSheet) return;
    const col = checkinImportSheet.col;
    const mode = col.timeIn !== -1 ? 'theo ngày (giờ vào/ra riêng)'
      : (col.punchCols && col.punchCols.length ? `lưới "Lần 1..N" (${col.punchCols.length} cột lần quét, đầu = vào, cuối = ra)`
      : 'gộp từng lần quét (đầu = vào, cuối = ra)');
    const res = importCheckinsFromSheet(checkinImportSheet.aoa, col, checkinImportSheet.fileName);
    closeCheckinImportModal();
    renderHrView();
    showToast(`Nạp xong từ "${checkinImportSheet.fileName}" (${mode}): ${res.matched} ngày khớp nhân viên` +
      (res.unmatched.length ? ` · ${res.unmatched.length} dòng KHÔNG khớp Mã NV/Tên đã bỏ qua` : ''), 'success');
  }

  // ─── 6) THỐNG KÊ ĐI LÀM THEO THÁNG ───────────────────────────────
  // Tính theo ngày dương lịch trong tháng: đi làm / nghỉ có phép (đơn duyệt) /
  // vắng / chưa chấm. Tỷ lệ đi làm = đi làm / (đi làm + nghỉ phép + vắng).
  // Tháng hiện tại chỉ tính tới hôm nay; bỏ ngày trước ngày vào làm.
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
      .filter(e => (e.status || 'active') === 'active')
      .map(e => {
        const join = e.joinDate || '';
        let work = 0, leave = 0, absent = 0, unmarked = 0;
        dates.forEach(d => {
          if (join && d < join) return; // ngày trước khi vào làm
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

  function renderHrAttendanceStats() {
    if (!/^\d{4}-\d{2}$/.test(state.hrAttMonth || '')) state.hrAttMonth = hrTodayISO().slice(0, 7);
    const monthInput = document.getElementById('hr-att-month');
    if (monthInput && monthInput.value !== state.hrAttMonth) monthInput.value = state.hrAttMonth;

    const stats = computeAttendanceStats(state.hrAttMonth);
    const t = { work: 0, leave: 0, absent: 0, unmarked: 0 };
    stats.forEach(s => { t.work += s.work; t.leave += s.leave; t.absent += s.absent; t.unmarked += s.unmarked; });
    const countedAll = t.work + t.leave + t.absent;

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
    if (!tbody) return;
    if (!stats.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:22px;color:var(--text-muted);">Chưa có dữ liệu chấm công trong tháng này.</td></tr>`;
      return;
    }
    tbody.innerHTML = stats.map(s => `<tr>
        <td><strong>${escapeHTML(s.emp.name || '')}</strong>${s.emp.code ? ` <span style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(s.emp.code)}</span>` : ''}</td>
        <td>${escapeHTML(s.emp.department || '—')}</td>
        <td><strong>${s.work}</strong></td>
        <td>${s.leave}</td>
        <td>${s.absent ? `<strong style="color:var(--danger);">${s.absent}</strong>` : '0'}</td>
        <td>${s.unmarked}</td>
        <td>${s.rate === null ? '—' : `<strong>${s.rate}%</strong>`}</td>
      </tr>`).join('');
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
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrEditPosition('${p.id}')" title="Sửa"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.hrDeletePosition('${p.id}')" title="Xóa" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
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
    if (!name) { showToast('Tên vị trí không được để trống!', 'error'); return; }
    const dup = (state.hrPositions || []).find(p =>
      hrStripDiacritics(p.name) === hrStripDiacritics(name) && p.id !== id);
    if (dup) { showToast(`Đã có vị trí "${dup.name}"!`, 'error'); return; }
    const data = {
      name,
      department: document.getElementById('position-department').value,
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

// ─── 8) THẺ NÔI — LAUNCHER BẂG NHÂN SỰ ─────────────────────────
  // Każda bảng Nhân Sự ma skróconą, pływającą kartę (hr-mini-card) w siatce
  // 5 thẻ na wiersz (desktop) / 3 (tablet) / 2 (telefon w pionie).
  // Bấm thẻ → otwórz szczegółowy bảng (xem / edycja), ponowne bấm → schowaj.
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
  ATT_STATUS,
  approvedLeaveOn,
  attStatusOf,
  attRecordOf,
  autoMapEmployeeField,
  approveLeave,
  canApproveLeave,
  closeEmployeeImportModal,
  closeEmployeeModal,
  closeLeaveModal,
  closePositionModal,
  closeRecruitmentModal,
  collectEmployeeSkills,
  computeAttendanceStats,
  computeLeaveStats,
  deleteEmployee,
  deleteLeave,
  deletePosition,
  deleteRecruitment,
  doEmployeeImport,
  handleEmployeeImportFile,
  handleEmployeeSubmit,
  handleLeaveEmployeeKeydown,
  handleLeaveSubmit,
  handlePositionSubmit,
  handleRecruitmentSubmit,
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
  hrPosName,
  hrPositionsNamesOf,
  hrPressWorkersNamesOf,
    hrWorkersForPress,
  hrWorkersForProduct,
  pressPositionPatternFor,
  importEmployeesFromSheet,
  leaveEmployeeSuggestions,
  loadHrData,
  openEmployeeImportModal,
  openEmployeeModal,
  openLeaveModal,
  openPositionModal,
  openRecruitmentModal,
  pendingLeaveOn,
  pickLeaveEmployee,
  renderEmployeeSkillsBox,
  renderHrAttendanceCard,
  renderHrAttendanceStats,
  renderHrEmployeesTable,
  renderHrPositionsTable,
  renderHrRecruitmentTable,
  renderHrView,
  renderHrCheckinTable,
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
