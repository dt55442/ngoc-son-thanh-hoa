// ═══════════════════════════════════════════════════════════
// js/auth.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { FB_ROLES_DOC, FB_SETTINGS_COLL, applyRoleToUI, fbDb, initLucide, isFirebaseOnline } from './cloud.js';
import { ALL_EDITABLE_IDS, ROLES, ROLE_ORDER, normalizeUser } from './permissions.js';
import { renderAll } from './main.js';
import { DEFAULT_USERS, STORAGE_KEY_SESSION, STORAGE_KEY_USERS, state } from './state.js';
import { writeDataToFile } from './storage.js';
import { escapeHTML, showToast } from './utils.js';

  // ─── USERS & SESSION ──────────────────────────────────────────
  function loadUsers() {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      try {
        state.users = JSON.parse(raw);
        const adminUser = state.users.find(u => u.username === 'admin');
        if (adminUser) adminUser.fullname = 'Quản trị';
      } catch (e) { state.users = [...DEFAULT_USERS]; }
    } else {
      state.users = [...DEFAULT_USERS];
      saveUsers();
    }
    // Chuẩn hóa quyền chi tiết (migrate dữ liệu cũ: thêm editTabs & allowAdvanced)
    state.users = state.users.map(u => normalizeUser({ ...u }));
  }

  function saveUsers() {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(state.users));
    // Đồng thời ghi vào file nếu đã kết nối thư mục dữ liệu
    if (state.fileStorage.connected) {
      writeDataToFile();
    }
  }

  function loadSession() {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (raw) {
      try {
        state.currentUser = JSON.parse(raw);
        if (state.currentUser && state.currentUser.username === 'admin') {
          state.currentUser.fullname = 'Quản trị';
        }
      } catch (e) { state.currentUser = null; }
    }
    if (state.currentUser) normalizeUser(state.currentUser);
  }

  function saveSession() {
    if (state.currentUser) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }

  function checkAuthAndRender() {
    // XEM CÔNG KHAI: không ép đăng nhập; ai cũng xem được
    document.getElementById('modal-login')?.classList.remove('show');
    if (state.currentUser) {
      updateUserProfileHeader();
      applyRoleToUI(state.currentUser.role);
    } else {
      applyRoleToUI(null);
    }
    renderAll();
  }

  function updateUserProfileHeader() {
    if (!state.currentUser) return;
    document.getElementById('current-user-name').textContent = state.currentUser.fullname || state.currentUser.username;
    const roleTag = document.getElementById('current-user-role');
    const role = state.currentUser.role;
    roleTag.textContent = (ROLES[role]?.name || role).toUpperCase();
    if (role === 'admin') {
      roleTag.style.backgroundColor = 'var(--primary-light)';
      roleTag.style.color = 'var(--primary)';
    } else if (role === 'manager') {
      roleTag.style.backgroundColor = '#fff7ed';
      roleTag.style.color = '#c2410c';
    } else if (role === 'editor') {
      roleTag.style.backgroundColor = '#eff6ff';
      roleTag.style.color = '#1d4ed8';
    } else {
      roleTag.style.backgroundColor = '#fef9c3';
      roleTag.style.color = '#a16207';
    }
  }

  // ─── ĐĂNG KÝ TÀI KHOẢN (ONLINE) ──────────────────────────────
  function toggleRegisterForm(show) {
    const regForm = document.getElementById('register-form');
    const logForm = document.getElementById('login-form');
    const toggleBtn = document.getElementById('btn-toggle-register');
    if (!regForm || !logForm) return;
    const toReg = (typeof show === 'boolean') ? show : (regForm.style.display === 'none');
    regForm.style.display = toReg ? '' : 'none';
    logForm.style.display = toReg ? 'none' : '';
    if (toggleBtn) toggleBtn.style.display = toReg ? 'none' : '';
    if (toReg) initLucide();
  }

  function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!isFirebaseOnline()) { showToast('Đăng ký chỉ dùng ở bản Online (cần kết nối mạng + SDK)', 'error'); return; }
    const email   = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass    = document.getElementById('reg-password').value;
    const pass2   = document.getElementById('reg-password-confirm').value;
    if (!email.includes('@')) { showToast('Email không hợp lệ!', 'error'); return; }
    if (pass.length < 6) { showToast('Mật khẩu tối thiểu 6 ký tự!', 'error'); return; }
    if (pass !== pass2) { showToast('Xác nhận mật khẩu không khớp!', 'error'); return; }
    window.firebase.auth().createUserWithEmailAndPassword(email, pass)
      .then(async () => {
        // Tài khoản chưa có quyền -> mặc định là Viewer để admin thấy & cấp quyền
        try {
          if (isFirebaseOnline()) {
            const roles = await fetchRolesDoc();
            const all = [...roles.adminEmails, ...roles.managerEmails, ...roles.editorEmails, ...roles.viewerEmails];
            if (!all.includes(email)) {
              roles.viewerEmails.push(email);
              await saveRolesDoc(roles);
            }
          }
        } catch (err) { console.warn('[FB] Không gán viewer mặc định', err); }
        // Đăng xuất để họ đăng nhập chính thức (tránh phiên lạ)
        await window.firebase.auth().signOut();
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-password-confirm').value = '';
        toggleRegisterForm(false);
        showToast('Tạo tài khoản thành công! Vui lòng đăng nhập.', 'success');
      })
      .catch((err) => {
        console.warn('[FB] Lỗi đăng ký', err);
        let msg = err && err.message ? err.message : 'Đăng ký thất bại';
        if (err && err.code === 'auth/email-already-in-use') msg = 'Email này đã được đăng ký. Hãy đăng nhập.';
        if (err && err.code === 'auth/invalid-email') msg = 'Email không hợp lệ.';
        if (err && err.code === 'auth/weak-password') msg = 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
        showToast(msg, 'error');
      });
  }

  // ─── USER MANAGEMENT MODAL ────────────────────────────────────
  function openUsersMgrModal() {
    if (state.currentUser?.role !== 'admin') { showToast('Chỉ Admin mới có quyền!', 'error'); return; }
    // Cập nhật giao diện theo chế độ Online/Offline
    const isOnline = isFirebaseOnline();
    const noteEl = document.getElementById('users-mode-note');
    if (noteEl) {
      noteEl.innerHTML = isOnline
        ? '<strong>Chế độ Online:</strong> Ai cũng XEM được dữ liệu. Muốn sửa phải đăng nhập với vai trò <strong>Ban Quản Lý / Editor</strong> hoặc <strong>Admin</strong>.<br>' +
          'Nhập <strong>email</strong> + chọn vai trò rồi bấm "Thêm / Cấp Quyền". <strong>Ban Quản Lý</strong> được xem Vùng Nâng Cao; <strong>Editor</strong> chỉ sửa các tab được chỉ định. Người được thêm sẽ tự đăng ký tài khoản qua nút "Đăng Ký" ở màn hình đăng nhập (bằng đúng email này) — KHÔNG cần vào Firebase Console.'
        : '<strong>Chế độ Offline:</strong> Dữ liệu lưu trên máy này. Nhập tên đăng nhập + mật khẩu cho từng tài khoản. Chọn vai trò và tích <strong>tab được phép chỉnh sửa</strong> — Editor/Ban Quản Lý chỉ sửa được đúng tab đã cấp.';
    }
    const pwdGrp = document.getElementById('group-new-user-password');
    if (pwdGrp) {
      pwdGrp.style.display = isOnline ? 'none' : '';
      const inp = document.getElementById('new-user-password');
      if (inp) inp.required = !isOnline;
    }
    renderUsersTable();
    document.getElementById('modal-users-mgr')?.classList.add('show');
    initLucide();
  }

  function closeUsersMgrModal() {
    document.getElementById('modal-users-mgr')?.classList.remove('show');
  }

  // ── HỖ TRỢ FIREBASE ROLES ────────────────────────────────────
  function rolesDocKey(role) {
    if (role === 'admin') return 'adminEmails';
    if (role === 'manager') return 'managerEmails';
    if (role === 'editor') return 'editorEmails';
    return 'viewerEmails';
  }
  async function fetchRolesDoc() {
    if (!isFirebaseOnline()) return { adminEmails: [], managerEmails: [], editorEmails: [], viewerEmails: [] };
    try {
      const snap = await fbDb.collection(FB_SETTINGS_COLL).doc(FB_ROLES_DOC).get();
      const d = snap.exists ? (snap.data() || {}) : {};
      return {
        adminEmails:   Array.isArray(d.adminEmails)   ? d.adminEmails   : [],
        managerEmails: Array.isArray(d.managerEmails) ? d.managerEmails : [],
        editorEmails:  Array.isArray(d.editorEmails)  ? d.editorEmails  : [],
        viewerEmails:  Array.isArray(d.viewerEmails)  ? d.viewerEmails  : [],
        userGrants:    (d.userGrants && typeof d.userGrants === 'object') ? d.userGrants : {}
      };
    } catch (e) {
      console.warn('[FB] Lỗi đọc roles', e);
      return { adminEmails: [], managerEmails: [], editorEmails: [], viewerEmails: [] };
    }
  }
  async function saveRolesDoc(roles) {
    await fbDb.collection(FB_SETTINGS_COLL).doc(FB_ROLES_DOC).set(roles);
  }
  function roleTagHtml(role) {
    const info = ROLES[role] || ROLES.viewer;
    const bg = role === 'admin' ? 'var(--primary-light)' : (role === 'manager' ? '#fff7ed' : (role === 'editor' ? '#eff6ff' : '#fef9c3'));
    const color = role === 'admin' ? 'var(--primary)' : (role === 'manager' ? '#c2410c' : (role === 'editor' ? '#1d4ed8' : '#a16207'));
    return `<span class="role-tag" style="background:${bg};color:${color}" title="${escapeHTML(info.desc)}">${escapeHTML(info.name)}</span>`;
  }

  // Chip hiển thị quyền chi tiết (tab được sửa + vùng nâng cao)
  function permsChipsHtml(userLike) {
    const role = userLike.role || 'viewer';
    if (role === 'admin') {
      return `<span class="perm-chip perm-chip-all"><i data-lucide="check-check"></i> Toàn quyền mọi tab</span>`;
    }
    const tabs = Array.isArray(userLike.editTabs) ? userLike.editTabs : [];
    const chips = tabs.length
      ? tabs.map(t => {
          const names = { kanban: 'Công Đoạn', planning: 'Kế Hoạch', press: 'Ép Ván', dashboard: 'Dashboard', materials: 'Nguyên Liệu' };
          return `<span class="perm-chip">${escapeHTML(names[t] || t)}</span>`;
        }).join('')
      : `<span class="perm-chip perm-chip-none">Không sửa tab nào</span>`;
    const adv = userLike.allowAdvanced
      ? `<span class="perm-chip perm-chip-adv"><i data-lucide="shield"></i> Vùng nâng cao</span>` : '';
    return chips + adv;
  }

  function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (isFirebaseOnline()) {
      fetchRolesDoc().then(roles => {
        const entries = [];
        (roles.adminEmails  || []).forEach(e => entries.push({ key: e, role: 'admin'  }));
        (roles.managerEmails || []).forEach(e => entries.push({ key: e, role: 'manager' }));
        (roles.editorEmails || []).forEach(e => entries.push({ key: e, role: 'editor' }));
        (roles.viewerEmails || []).forEach(e => entries.push({ key: e, role: 'viewer' }));
        if (entries.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--text-muted); padding:20px;">Chưa có ai được cấp quyền. Hãy thêm email đầu tiên bên trên.</td></tr>`;
          initLucide();
          return;
        }
        entries.forEach(ent => {
          const tr = document.createElement('tr');
          const isSelf = state.currentUser && ent.key === state.currentUser.email;
          // Quyền chi tiết cấp riêng cho email này (nếu có)
          const grants = (roles.userGrants || {})[ent.key] || {};
          const userLike = { role: ent.role, editTabs: grants.editTabs, allowAdvanced: grants.allowAdvanced };
          tr.innerHTML = `
            <td><strong>${escapeHTML(ent.key)}</strong></td>
            <td><code style="font-family:var(--font-mono);">${escapeHTML(ent.key)}</code></td>
            <td>${roleTagHtml(ent.role)}</td>
            <td>${permsChipsHtml(userLike)}</td>
            <td class="text-right">
              ${isSelf ? '<span class="text-muted">Chính bạn</span>' : `
                <button class="btn btn-outline btn-icon btn-sm" onclick="app.openUserPermsModal('${escapeHTML(ent.key)}')" title="Cấu hình quyền chi tiết"><i data-lucide="user-cog"></i></button>
                <button class="btn btn-outline btn-icon btn-sm" onclick="app.deleteUser('${escapeHTML(ent.key)}')" style="color:var(--danger);" title="Xóa quyền"><i data-lucide="trash-2"></i></button>`}
            </td>`;
          tbody.appendChild(tr);
        });
        initLucide();
      });
      return;
    }
    // OFFLINE: bảng users cục bộ
    state.users.forEach(u => {
      const tr = document.createElement('tr');
      const isSelf = state.currentUser && u.username === state.currentUser.username;
      tr.innerHTML = `
        <td><strong>${escapeHTML(u.fullname)}</strong></td>
        <td><code style="font-family:var(--font-mono);">${escapeHTML(u.username)}</code></td>
        <td>${roleTagHtml(u.role)}</td>
        <td>${permsChipsHtml(u)}</td>
        <td class="text-right">
          ${u.username === 'admin' ? '<span class="text-muted">Mặc định</span>' : `
            ${!isSelf ? `<button class="btn btn-outline btn-icon btn-sm" onclick="app.openUserPermsModal('${u.id}')" title="Cấu hình quyền chi tiết"><i data-lucide="user-cog"></i></button>` : ''}
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.deleteUser('${u.id}')" style="color:var(--danger);" title="Xóa"><i data-lucide="trash-2"></i></button>`}
        </td>`;
      tbody.appendChild(tr);
    });
    initLucide();
  }

  // Đọc danh sách tab được tích trong 1 nhóm checkbox edit-tabs
  function readEditTabsChecks(containerId) {
    const box = document.getElementById(containerId);
    if (!box) return null;
    const checks = box.querySelectorAll('input[type="checkbox"]');
    if (!checks.length) return null;
    return Array.from(checks).filter(c => c.checked).map(c => c.value).filter(v => ALL_EDITABLE_IDS.includes(v));
  }

  function handleAddUserSubmit(e) {
    e.preventDefault();
    const fullname = document.getElementById('new-user-fullname').value.trim();
    const username = document.getElementById('new-user-username').value.trim();
    const password = document.getElementById('new-user-password').value.trim();
    const role     = document.getElementById('new-user-role').value;
    const editTabs = readEditTabsChecks('new-user-edit-tabs') || [...ALL_EDITABLE_IDS];

    if (isFirebaseOnline()) {
      handleAddOnlineRole(username, role, fullname, editTabs);
      return;
    }
    // OFFLINE
    if (!username) { showToast('Vui lòng nhập tên đăng nhập!', 'error'); return; }
    if (!password) { showToast('Vui lòng nhập mật khẩu!', 'error'); return; }
    if (state.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      showToast('Tên đăng nhập đã tồn tại!', 'error'); return;
    }
    const newUser = normalizeUser({
      id: `usr-${Date.now()}`, username, password, fullname, role,
      editTabs, allowAdvanced: role === 'admin' || role === 'manager',
      createdAt: new Date().toISOString().split('T')[0]
    });
    state.users.push(newUser);
    saveUsers(); renderUsersTable();
    document.getElementById('add-user-form').reset();
    showToast(`Đã thêm người dùng ${fullname || username} (${ROLES[role]?.name || role}) thành công!`, 'success');
  }

  async function handleAddOnlineRole(emailRaw, role, fullname, editTabs) {
    const email = (emailRaw || '').trim().toLowerCase();
    if (!email.includes('@')) { showToast('Chế độ Online cần nhập Email hợp lệ!', 'error'); return; }
    const roles = await fetchRolesDoc();
    const all = [...roles.adminEmails, ...roles.managerEmails, ...roles.editorEmails, ...roles.viewerEmails];
    if (all.includes(email)) { showToast('Email này đã có quyền!', 'error'); return; }
    roles[rolesDocKey(role)].push(email);
    // Lưu quyền chi tiết (tab được sửa + vùng nâng cao) nếu có chọn
    if (Array.isArray(editTabs)) {
      roles.userGrants = roles.userGrants || {};
      roles.userGrants[email] = {
        editTabs: role === 'admin' ? [...ALL_EDITABLE_IDS] : editTabs,
        allowAdvanced: role === 'admin' || role === 'manager'
      };
    }
    try {
      await saveRolesDoc(roles);
      if (fullname) {
        // Ghi họ tên hiển thị (tùy chọn) vào doc phụ displayNames
        try {
          const un = fbDb.collection(FB_SETTINGS_COLL).doc('displayNames');
          await un.set({ [email]: fullname }, { merge: true });
        } catch (e) {}
      }
      renderUsersTable();
      document.getElementById('add-user-form').reset();
      showToast(`Đã cấp quyền ${role.toUpperCase()} cho ${email}!`, 'success');
    } catch (err) {
      console.warn('[FB] Lỗi cấp quyền', err);
      showToast('Lỗi khi cấp quyền: ' + err.message + ' (Hãy đảm bảo là Admin và có kết nối)', 'error');
    }
  }

  function deleteUser(userIdOrEmail) {
    // Trong chế độ online, tham số là email
    if (isFirebaseOnline()) {
      deleteOnlineRole(userIdOrEmail);
      return;
    }
    const user = state.users.find(u => u.id === userIdOrEmail);
    if (!user) return;
    if (user.username === 'admin') { showToast('Không thể xóa tài khoản Admin!', 'error'); return; }
    if (confirm(`Xóa người dùng "${user.fullname}"?`)) {
      state.users = state.users.filter(u => u.id !== userIdOrEmail);
      saveUsers(); renderUsersTable();
      showToast('Đã xóa người dùng', 'info');
    }
  }

  async function deleteOnlineRole(email) {
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm) return;
    if (state.currentUser && emailNorm === (state.currentUser.email || '').toLowerCase()) {
      showToast('Không thể xóa quyền của chính bạn!', 'error'); return;
    }
    if (!confirm(`Gỡ quyền truy cập của "${emailNorm}"?`)) return;
    const roles = await fetchRolesDoc();
    roles.adminEmails   = roles.adminEmails.filter(e => e !== emailNorm);
    roles.managerEmails = roles.managerEmails.filter(e => e !== emailNorm);
    roles.editorEmails  = roles.editorEmails.filter(e => e !== emailNorm);
    roles.viewerEmails  = roles.viewerEmails.filter(e => e !== emailNorm);
    if (roles.userGrants) delete roles.userGrants[emailNorm];
    try {
      await saveRolesDoc(roles);
      renderUsersTable();
      showToast(`Đã gỡ quyền của ${emailNorm}`, 'info');
    } catch (err) {
      console.warn('[FB] Lỗi gỡ quyền', err);
      showToast('Lỗi khi gỡ quyền: ' + err.message, 'error');
    }
  }

  // ─── MODAL CẤU HÌNH QUYỀN CHI TIẾT THEO NGƯỜI DÙNG ───────────
  // Offline: userIdOrEmail là user.id; Online: là email
  function openUserPermsModal(userIdOrEmail) {
    if (state.currentUser?.role !== 'admin') { showToast('Chỉ Admin mới có quyền cấu hình!', 'error'); return; }
    const targetInput = document.getElementById('user-perms-target');
    const roleBadge = document.getElementById('user-perms-role-badge');
    const advCheck = document.getElementById('user-perms-allow-advanced');

    if (isFirebaseOnline()) {
      const email = (userIdOrEmail || '').trim().toLowerCase();
      targetInput.value = `email:${email}`;
      fetchRolesDoc().then(roles => {
        let role = 'viewer';
        if ((roles.adminEmails || []).includes(email)) role = 'admin';
        else if ((roles.managerEmails || []).includes(email)) role = 'manager';
        else if ((roles.editorEmails || []).includes(email)) role = 'editor';
        const grants = (roles.userGrants || {})[email] || {};
        roleBadge.textContent = ROLES[role]?.name || role;
        roleBadge.dataset.role = role;
        setEditTabsChecks('user-perms-edit-tabs', grants.editTabs || (role === 'admin' ? [...ALL_EDITABLE_IDS] : []));
        advCheck.checked = !!grants.allowAdvanced || role === 'admin' || role === 'manager';
        initLucide();
      });
    } else {
      const user = state.users.find(u => u.id === userIdOrEmail);
      if (!user) return;
      targetInput.value = `id:${user.id}`;
      roleBadge.textContent = ROLES[user.role]?.name || user.role;
      roleBadge.dataset.role = user.role;
      setEditTabsChecks('user-perms-edit-tabs', user.editTabs || []);
      advCheck.checked = !!user.allowAdvanced;
    }
    document.getElementById('modal-user-perms')?.classList.add('show');
    initLucide();
  }

  function closeUserPermsModal() {
    document.getElementById('modal-user-perms')?.classList.remove('show');
  }

  function setEditTabsChecks(containerId, tabs) {
    const box = document.getElementById(containerId);
    if (!box) return;
    box.querySelectorAll('input[type="checkbox"]').forEach(c => {
      c.checked = Array.isArray(tabs) && tabs.includes(c.value);
    });
  }

  async function handleUserPermsSubmit(e) {
    e.preventDefault();
    if (state.currentUser?.role !== 'admin') { showToast('Chỉ Admin mới có quyền cấu hình!', 'error'); return; }
    const target = document.getElementById('user-perms-target').value || '';
    const [kind, ...rest] = target.split(':');
    const key = rest.join(':');
    const editTabs = readEditTabsChecks('user-perms-edit-tabs') || [];
    const allowAdvanced = document.getElementById('user-perms-allow-advanced')?.checked || false;

    if (kind === 'email') {
      // ONLINE: lưu vào roles.userGrants[email]
      const roles = await fetchRolesDoc();
      roles.userGrants = roles.userGrants || {};
      roles.userGrants[key] = { editTabs, allowAdvanced };
      try {
        await saveRolesDoc(roles);
        renderUsersTable();
        closeUserPermsModal();
        showToast(`Đã lưu quyền chi tiết cho ${key}!`, 'success');
      } catch (err) {
        showToast('Lỗi lưu quyền: ' + err.message, 'error');
      }
      return;
    }
    // OFFLINE: cập nhật user cục bộ
    const user = state.users.find(u => u.id === key);
    if (!user) return;
    if (user.username === 'admin') { showToast('Admin luôn có toàn quyền, không cần cấu hình!', 'info'); return; }
    user.editTabs = editTabs;
    user.allowAdvanced = allowAdvanced;
    saveUsers(); renderUsersTable(); closeUserPermsModal();
    // Nếu đang sửa chính mình thì cập nhật lại giao diện phân quyền
    if (state.currentUser && state.currentUser.username === user.username) {
      state.currentUser.editTabs = [...editTabs];
      state.currentUser.allowAdvanced = allowAdvanced;
      saveSession(); applyRoleToUI(state.currentUser.role);
      renderAll();
    }
    showToast(`Đã cập nhật quyền cho ${user.fullname || user.username}!`, 'success');
  }

export {
  checkAuthAndRender,
  closeUserPermsModal,
  closeUsersMgrModal,
  deleteOnlineRole,
  deleteUser,
  fetchRolesDoc,
  handleAddOnlineRole,
  handleAddUserSubmit,
  handleRegisterSubmit,
  handleUserPermsSubmit,
  loadSession,
  loadUsers,
  openUserPermsModal,
  openUsersMgrModal,
  renderUsersTable,
  roleTagHtml,
  rolesDocKey,
  saveRolesDoc,
  saveSession,
  saveUsers,
  toggleRegisterForm,
  updateUserProfileHeader
};
