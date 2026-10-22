// ═══════════════════════════════════════════════════════════
// js/auth.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { FB_ROLES_DOC, FB_SETTINGS_COLL, applyRoleToUI, fbDb, initLucide, isFirebaseOnline } from './cloud.js';
// TRẠNG THÁI CHỜ + BẢNG LỖI XÁC THỰC (module không import gì — tránh vòng import)
import { authErrorText, isAuthBusy, setAuthBusy } from './auth-ui.js';
import { ALL_EDITABLE_IDS, ROLES, ROLE_ORDER, expandWsTabs, getTabDef, normalizeUser } from './permissions.js';
// CÀI ĐẶT HỆ THỐNG (22/10/2026) — panel 4 tab trong modal "Cài Đặt Hệ Thống"
import {
  PERM_GROUPS, PERM_AREAS, PERM_LEVEL_LABEL, PERM_LEVELS, UI_FLAGS, areaConfigured,
  flagRoles, pushAudit, resetSysSettings, roleLevel, saveSysSettings, savedPermLevel,
  setFlagRole, setPermLevel, sysSettingsExport, sysSettingsState
} from './sys-settings.js';
import { renderAll } from './main.js';
import { DEFAULT_USERS, STORAGE_KEY_SESSION, STORAGE_KEY_USERS, APP_VERSION, state } from './state.js';
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

  // ─── 2 PANEL XÁC THỰC: ĐĂNG NHẬP ⇄ QUÊN MẬT KHẨU (P3) ────────
  // P3 (20/10/2026 — chốt với người dùng): KHÔNG tự đăng ký trên UI.
  // Tài khoản do Admin tạo (modal Quản Lý Người Chỉnh Sửa hoặc Firebase Console)
  // ⇒ tránh việc ai đăng ký cũng đọc được dữ liệu, và tránh hiểu nhầm
  // "phải thêm email trước trên Firebase mới đăng ký được".
  function toggleAuthPanel(panel) {
    const want = panel === 'reset' ? 'reset' : 'login';
    const loginForm = document.getElementById('login-form');
    const resetForm = document.getElementById('reset-form');
    if (!loginForm || !resetForm) return;
    const showReset = want === 'reset';
    loginForm.hidden = showReset;
    loginForm.style.display = showReset ? 'none' : '';
    resetForm.hidden = !showReset;
    resetForm.style.display = showReset ? '' : 'none';
    // Dọn trạng thái chờ + dòng thông báo của panel trước
    const st = document.getElementById('auth-status');
    if (st) { st.textContent = ''; st.hidden = true; st.style.display = 'none'; }
    const bar = document.getElementById('auth-busy-bar');
    if (bar) { bar.hidden = true; bar.style.display = 'none'; }
    const focusEl = document.getElementById(showReset ? 'reset-email' : 'login-username');
    try { if (focusEl && focusEl.focus) focusEl.focus(); } catch (e) { /* bỏ qua */ }
    initLucide();
  }
  // Tương thích tên cũ (không còn form đăng ký) — luôn về panel Đăng Nhập
  function toggleRegisterForm() { toggleAuthPanel('login'); }

  // ─── QUÊN MẬT KHẨU (tự phục vụ qua email) ────────────────────
  async function handleResetSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isAuthBusy()) return; // chống bấm nhiều lần
    const emailEl = document.getElementById('reset-email');
    const email = String((emailEl && emailEl.value) || '').trim().toLowerCase();
    if (!email.includes('@')) { showToast('Email không hợp lệ!', 'error'); return; }
    if (!isFirebaseOnline()) {
      showToast('Gửi email đặt lại mật khẩu cần kết nối mạng. Tài khoản lưu trên máy này: liên hệ Quản trị để đổi mật khẩu.', 'error');
      return;
    }
    setAuthBusy('reset', true, 'Đang gửi email đặt lại mật khẩu…');
    // Thông điệp TRUNG TÍNH: không tiết lộ email có tồn tại hay không
    const neutral = 'Nếu email có trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra Hộp thư và thư rác.';
    try {
      await window.firebase.auth().sendPasswordResetEmail(email);
      showToast(neutral, 'success');
      const u = document.getElementById('login-username');
      if (u) u.value = email;
      toggleAuthPanel('login');
      const p = document.getElementById('login-password');
      if (p) { p.value = ''; try { p.focus(); } catch (err) { /* bỏ qua */ } }
    } catch (err) {
      const code = err && err.code;
      console.warn('[FB] Lỗi gửi email đặt lại mật khẩu', err);
      if (code === 'auth/user-not-found') {
        // Bảo mật: giữ câu trả lời trung tính (chống dò tài khoản)
        showToast(neutral, 'success');
        toggleAuthPanel('login');
      } else {
        showToast(authErrorText(code, (err && err.message) || 'Không gửi được email đặt lại mật khẩu.'), 'error');
      }
    } finally {
      setAuthBusy('reset', false);
    }
  }

  // Admin gửi email đặt lại mật khẩu cho 1 người dùng (online)
  async function sendPasswordResetToUser(emailRaw) {
    if (state.currentUser?.role !== 'admin') { showToast('Chỉ Admin mới có quyền!', 'error'); return false; }
    const email = String(emailRaw || '').trim().toLowerCase();
    if (!email.includes('@')) { showToast('Email không hợp lệ!', 'error'); return false; }
    if (!isFirebaseOnline()) { showToast('Chức năng này cần kết nối mạng.', 'error'); return false; }
    try {
      await window.firebase.auth().sendPasswordResetEmail(email);
      showToast('Đã gửi email đặt lại mật khẩu tới ' + email + '.', 'success');
      return true;
    } catch (err) {
      console.warn('[FB] Lỗi gửi email đặt lại', err);
      showToast(authErrorText(err && err.code, (err && err.message) || 'Không gửi được email.'), 'error');
      return false;
    }
  }

  // Tạo tài khoản Firebase Auth KHÔNG làm mất phiên Admin:
  // dùng APP PHỤ (persistence key tách theo appName) → tạo xong signOut + xoá app phụ.
  async function createAuthUserSecondary(email, password) {
    const cfg = window.FIREBASE_CONFIG;
    if (!window.firebase || typeof window.firebase.initializeApp !== 'function') {
      throw new Error('Chưa nạp Firebase SDK.');
    }
    if (!cfg) throw new Error('Thiếu cấu hình Firebase.');
    const appName = 'bamboo-create-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const secApp = window.firebase.initializeApp(cfg, appName);
    try {
      const secAuth = secApp.auth();
      await secAuth.createUserWithEmailAndPassword(email, password);
      try { await secAuth.signOut(); } catch (e) { /* bỏ qua */ }
      return true;
    } finally {
      try { await secApp.delete(); } catch (e) { console.warn('[FB] Không xoá được app phụ', e); }
    }
  }

  // ═══ CÀI ĐẶT HỆ THỐNG — 4 TAB (22/10/2026) ═══════════════════
  // Tab 1 Người dùng (giữ nguyên toàn bộ form/bảng cũ) · Tab 2 ma trận quyền
  // 37 vùng · Tab 3 cờ hiển thị (admin bật/tắt chủ động) · Tab 4 nhật ký.
  let sysTab = 'users';

  function sysEscape(s) { return escapeHTML(s == null ? '' : String(s)); }

  function sysSetTab(tab) {
    sysTab = ['users', 'perms', 'flags', 'system'].includes(tab) ? tab : 'users';
    document.querySelectorAll('#modal-users-mgr [data-sys-tab]').forEach(b => {
      const on = b.getAttribute('data-sys-tab') === sysTab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('#modal-users-mgr [data-sys-panel]').forEach(p => {
      const on = p.getAttribute('data-sys-panel') === sysTab;
      p.hidden = !on;
      p.style.display = on ? '' : 'none';
    });
    renderSysSettings();
    initLucide();
  }

  function renderSysSettings() {
    const chips = document.getElementById('sys-mgr-chips');
    if (chips) chips.innerHTML = sysChipsHtml();
    if (sysTab === 'perms') renderSysPerms();
    if (sysTab === 'flags') renderSysFlags();
    if (sysTab === 'system') { renderSysStatus(); renderSysAudit(); }
  }

  function sysChipsHtml() {
    const users = Array.isArray(state.users) ? state.users : [];
    const count = r => users.filter(u => u.role === r).length;
    return [
      `<span class="sys-chip"><i data-lucide="users"></i> ${users.length} người dùng</span>`,
      `<span class="sys-chip is-admin"><i data-lucide="shield"></i> ${count('admin')} Quản Trị</span>`,
      `<span class="sys-chip"><i data-lucide="briefcase"></i> ${count('manager')} BQL</span>`,
      `<span class="sys-chip"><i data-lucide="pencil"></i> ${count('editor')} Chỉnh sửa</span>`,
      `<span class="sys-chip ${isFirebaseOnline() ? 'is-on' : 'is-off'}"><i data-lucide="cloud"></i> ${isFirebaseOnline() ? 'Online' : 'Offline'}</span>`,
      `<span class="sys-chip is-ver">${sysEscape(APP_VERSION)}</span>`
    ].join('');
  }

  // ─── TAB 2: MA TRẬN QUYỀN THEO VÙNG ─────────────────────────
  function renderSysPerms() {
    const box = document.getElementById('sys-perm-body');
    if (!box) return;
    const qRaw = document.getElementById('sys-perm-search')?.value || '';
    const onlySet = !!document.getElementById('sys-perm-only-set')?.checked;
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
    const q = norm(qRaw.trim());
    const rows = [];
    let shown = 0;
    PERM_GROUPS.forEach(g => {
      const areas = PERM_AREAS.filter(a => a.group === g.id
        && (!onlySet || areaConfigured(a.id))
        && (!q || norm(`${a.label} ${a.id} ${a.desc || ''}`).includes(q)));
      if (!areas.length) return;
      rows.push(`<tr class="sys-perm-group"><td colspan="5">
        <span class="sys-perm-gname"><i data-lucide="${sysEscape(g.icon)}"></i> ${sysEscape(g.label)}</span>
        <span class="sys-perm-gdesc">${sysEscape(g.desc)}</span></td></tr>`);
      areas.forEach(a => { shown++; rows.push(sysPermRowHtml(a)); });
    });
    box.innerHTML = rows.length ? rows.join('')
      : '<tr><td colspan="5" class="sys-empty">Không có vùng phù hợp.</td></tr>';
    const cnt = document.getElementById('sys-perm-count');
    if (cnt) cnt.textContent = `${shown}/${PERM_AREAS.length} vùng`;
    initLucide();
  }

  function sysPermRowHtml(a) {
    const set = areaConfigured(a.id);
    const cell = (role) => {
      const saved = savedPermLevel(a.id, role);
      const eff = roleLevel(a.id, role);
      const opts = [`<option value=""${saved ? '' : ' selected'}>Theo tab</option>`]
        .concat(PERM_LEVELS.map(l =>
          `<option value="${l}"${saved === l ? ' selected' : ''}>${PERM_LEVEL_LABEL[l]}</option>`));
      return `<td class="sys-perm-cell">
        <select class="sys-perm-sel lv-${eff}" data-sys-perm="${a.id}|${role}"
          title="Mức hiệu lực hiện tại: ${PERM_LEVEL_LABEL[eff]}">${opts.join('')}</select></td>`;
    };
    return `<tr data-perm-row="${sysEscape(a.id)}" class="${set ? 'is-set' : ''}">
      <td class="sys-perm-name">
        <strong>${sysEscape(a.label)}</strong>
        ${a.desc ? `<span class="sys-perm-desc">${sysEscape(a.desc)}</span>` : ''}
        <span class="sys-perm-code">${sysEscape(a.id)}</span>
        ${set ? `<button type="button" class="sys-mini-link" data-sys-perm-reset="${sysEscape(a.id)}"
          title="Bỏ tuỳ chỉnh của vùng này, quay về 'Theo tab'">↺ bỏ đặt</button>` : ''}
      </td>
      <td class="sys-perm-cell"><span class="sys-lock" title="Admin luôn toàn quyền — không thể tự hạ (chống khoá mình)">
        <i data-lucide="lock"></i> Duyệt / khoá</span></td>
      ${cell('manager')}${cell('editor')}${cell('viewer')}
    </tr>`;
  }

  // ─── TAB 3: CỜ HIỂN THỊ (bật/tắt chủ động) ──────────────────
  const SYS_ROLE_LABEL = { admin: 'Quản Trị', manager: 'Ban Quản Lý', editor: 'Người Chỉnh Sửa', viewer: 'Người Xem' };

  function renderSysFlags() {
    const box = document.getElementById('sys-flags-list');
    if (!box) return;
    box.innerHTML = UI_FLAGS.map(sysFlagCardHtml).join('');
    initLucide();
  }

  function sysFlagCardHtml(f) {
    const roles = flagRoles(f.id);
    const seen = ['admin', 'manager', 'editor', 'viewer'].filter(r => roles[r]).map(r => SYS_ROLE_LABEL[r]);
    const chips = ['admin', 'manager', 'editor', 'viewer'].map(r => `
      <label class="sys-role-chip${roles[r] ? ' is-on' : ''}">
        <input type="checkbox" data-sys-flag="${f.id}|${r}"${roles[r] ? ' checked' : ''}>
        <span>${SYS_ROLE_LABEL[r]}</span>
      </label>`).join('');
    return `<section class="sys-flag-card" data-flag-card="${f.id}">
      <div class="sys-flag-head">
        <span class="sys-flag-ic"><i data-lucide="${sysEscape(f.icon)}"></i></span>
        <div class="sys-flag-title">
          <strong>${sysEscape(f.label)}</strong>
          <div class="sys-flag-desc">${sysEscape(f.desc)}</div>
        </div>
        <span class="sys-flag-state ${seen.length ? 'is-on' : 'is-off'}">${seen.length ? 'Đang hiện' : 'Đang ẩn'}</span>
      </div>
      <div class="sys-flag-roles">
        <span class="sys-flag-roles-lbl">Ai được thấy:</span>
        ${chips}
        <span class="sys-flag-quick">
          <button type="button" class="sys-mini-link" data-sys-flag-all="${f.id}">Tất cả</button>
          <button type="button" class="sys-mini-link" data-sys-flag-none="${f.id}">Không ai</button>
        </span>
      </div>
      <div class="sys-flag-note">Hiện với: <strong>${seen.length ? sysEscape(seen.join(', ')) : 'không ai'}</strong>
        · Mã: <code>${sysEscape(f.id)}</code></div>
    </section>`;
  }
  // Cờ được ẩn/hiện bằng CSS: body[data-on] + [data-flag-show] — không cần render lại thẻ.

  // ─── TAB 4: TÌNH TRẠNG + NHẬT KÝ ────────────────────────────
  function sysFmtAt(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso || '');
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function renderSysStatus() {
    const box = document.getElementById('sys-status');
    if (!box) return;
    const u = state.currentUser;
    const s = sysSettingsState();
    box.innerHTML = `
      <div class="sys-status-row"><i data-lucide="cloud"></i> Mây: <strong>${isFirebaseOnline() ? 'Đang kết nối' : 'Ngoại tuyến (lưu trên máy)'}</strong></div>
      <div class="sys-status-row"><i data-lucide="user-round"></i> Tài khoản: <strong>${sysEscape(u ? (u.fullname || u.username) : '—')}</strong> · ${sysEscape(u ? (ROLES[u.role]?.name || u.role) : '—')}</div>
      <div class="sys-status-row"><i data-lucide="layers"></i> Phiên bản: <strong>${sysEscape(APP_VERSION)}</strong></div>
      <div class="sys-status-row"><i data-lucide="list-checks"></i> Đã tuỳ chỉnh: <strong>${Object.keys(s.perms || {}).length} vùng quyền</strong> · <strong>${Object.keys(s.flags || {}).length} cờ</strong></div>`;
    initLucide();
  }

  function renderSysAudit() {
    const box = document.getElementById('sys-audit-list');
    if (!box) return;
    const list = (sysSettingsState().audit || []).slice(0, 40);
    box.innerHTML = list.length ? list.map(x => `
      <div class="sys-audit-row">
        <span class="sys-audit-at">${sysEscape(sysFmtAt(x.at))}</span>
        <span class="sys-audit-who">${sysEscape(x.name || x.by)}</span>
        <span class="sys-audit-what">${sysEscape(x.what)}</span>
        <span class="sys-audit-delta">${sysEscape(x.from || '—')} → <strong>${sysEscape(x.to || '—')}</strong></span>
      </div>`).join('')
      : '<div class="sys-empty">Chưa có thay đổi nào.</div>';
  }

  // ─── SỰ KIỆN CỦA PANEL (gọi từ js/events.js) ───────────────
  function onSysPermChange(e) {
    const t = e.target && e.target.closest ? e.target.closest('[data-sys-perm]') : null;
    if (!t) return false;
    const [area, role] = String(t.getAttribute('data-sys-perm')).split('|');
    const val = t.value;
    const s = sysSettingsState();
    if (!val) {
      if (s.perms[area]) {
        delete s.perms[area][role];
        if (!Object.keys(s.perms[area]).length) delete s.perms[area];
      }
      pushAudit(`Quyền: ${area} · ${SYS_ROLE_LABEL[role]}`, 'đã đặt', 'Theo tab');
    } else if (setPermLevel(area, role, val)) {
      pushAudit(`Quyền: ${area} · ${SYS_ROLE_LABEL[role]}`, '', PERM_LEVEL_LABEL[val]);
    } else {
      showToast('Không đổi được quyền này.', 'error');
      renderSysPerms();
      return false;
    }
    saveSysSettings();
    renderSysPerms();
    showToast('Đã lưu quyền — có hiệu lực ngay.', 'success');
    return true;
  }

  function onSysPermReset(area) {
    const s = sysSettingsState();
    if (!s.perms[area]) return false;
    delete s.perms[area];
    pushAudit(`Bỏ đặt quyền cả vùng ${area}`, 'đã đặt', 'Theo tab');
    saveSysSettings();
    renderSysPerms();
    return true;
  }

  function onSysFlagToggle(e) {
    const t = e.target && e.target.closest ? e.target.closest('[data-sys-flag]') : null;
    if (!t) return false;
    const [id, role] = String(t.getAttribute('data-sys-flag')).split('|');
    const on = !!t.checked;
    setFlagRole(id, role, on);
    const label = (UI_FLAGS.find(f => f.id === id) || {}).label || id;
    pushAudit(`Cờ "${label}": ${SYS_ROLE_LABEL[role]}`, on ? 'tắt' : 'bật', on ? 'bật' : 'tắt');
    saveSysSettings();
    renderSysFlags();
    renderAll(); // cờ "nhập tay giờ sự cố" đổi cách render ô Sự cố
    initLucide();
    return true;
  }

  function onSysFlagPreset(id, on) {
    ['admin', 'manager', 'editor', 'viewer'].forEach(r => setFlagRole(id, r, on));
    const label = (UI_FLAGS.find(f => f.id === id) || {}).label || id;
    pushAudit(`Cờ "${label}"`, '', on ? 'bật cho MỌI vai trò' : 'tắt với MỌI vai trò');
    saveSysSettings();
    renderSysFlags();
    renderAll();
    initLucide();
    return true;
  }

  function onSysReset() {
    if (!confirm('Khôi phục MẶC ĐỊNH toàn bộ cài đặt hệ thống?\n\n• Cờ hiển thị về mặc định\n• Mọi tuỳ chỉnh quyền theo vùng bị xoá (về "Theo tab")\n• Nhật ký được giữ lại\n\nThao tác này có ghi nhật ký.')) return false;
    resetSysSettings();
    renderSysSettings();
    renderAll();
    showToast('Đã khôi phục mặc định cài đặt hệ thống.', 'success');
    return true;
  }

  function onSysExport() {
    try {
      const blob = new Blob([sysSettingsExport()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cai-dat-he-thong-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      showToast('Đã xuất cấu hình.', 'success');
    } catch (err) {
      showToast('Không xuất được cấu hình.', 'error');
    }
    return true;
  }

  // ─── USER MANAGEMENT MODAL ────────────────────────────────────
  function openUsersMgrModal() {
    if (state.currentUser?.role !== 'admin') { showToast('Chỉ Admin mới có quyền!', 'error'); return; }
    // Cập nhật giao diện theo chế độ Online/Offline
    const isOnline = isFirebaseOnline();
    const noteEl = document.getElementById('users-mode-note');
    if (noteEl) {
      noteEl.innerHTML = isOnline
        ? '<strong>Chế độ Online (P3):</strong> Không còn tự đăng ký trên màn hình đăng nhập — <strong>Quản trị tạo tài khoản tại đây</strong>: nhập email + mật khẩu tạm bên dưới (hoặc tạo trong Firebase Console → Authentication → Users), rồi chọn vai trò và cấp quyền.<br>' +
          'Tài khoản mới nên bật <strong>"Gửi email để người dùng tự đặt mật khẩu"</strong> để họ không dùng mật khẩu tạm.'
        : '<strong>Chế độ Offline:</strong> Dữ liệu lưu trên máy này. Nhập tên đăng nhập + mật khẩu cho từng tài khoản. Chọn vai trò và tích <strong>tab được phép chỉnh sửa</strong> — Editor/Ban Quản Lý chỉ sửa được đúng tab đã cấp.';
    }
    // Ô mật khẩu: LUÔN hiện (online = mật khẩu tạm khi tạo tài khoản)
    const pwdGrp = document.getElementById('group-new-user-password');
    if (pwdGrp) pwdGrp.style.display = '';
    const pwdInp = document.getElementById('new-user-password');
    if (pwdInp) {
      pwdInp.required = !isOnline; // offline bắt buộc; online chỉ khi tích tạo tài khoản
      pwdInp.placeholder = isOnline ? 'Mật khẩu tạm ≥ 6 ký tự' : 'Mật khẩu đăng nhập máy này';
    }
    const pwdLabel = document.getElementById('new-user-password-label');
    if (pwdLabel) pwdLabel.textContent = isOnline ? 'Mật Khẩu Tạm (khi tạo tài khoản)' : 'Mật Khẩu';
    // Khối tuỳ chọn CHỈ có ở bản online
    const createGrp = document.getElementById('group-new-user-create');
    if (createGrp) createGrp.style.display = isOnline ? '' : 'none';
    const createChk = document.getElementById('new-user-create-account');
    if (createChk) createChk.checked = isOnline;
    const sendChk = document.getElementById('new-user-send-reset');
    if (sendChk) sendChk.checked = true;
    const createNote = document.getElementById('new-user-create-note');
    if (createNote) {
      createNote.textContent = isOnline
        ? 'Bỏ tích nếu email đã có tài khoản (chỉ cấp quyền). Nếu Firebase đang tắt "Create (sign-up)" thì hãy tạo tài khoản trong Firebase Console.'
        : '';
    }
    renderUsersTable();
    sysSetTab('users'); // Cài Đặt Hệ Thống: mở tab Người dùng + vẽ chip + các panel
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

  // Chip hiển thị quyền chi tiết (tab được sửa + vùng nâng cao + chốt công)
  function permsChipsHtml(userLike) {
    const role = userLike.role || 'viewer';
    if (role === 'admin') {
      return `<span class="perm-chip perm-chip-all"><i data-lucide="check-check"></i> Toàn quyền mọi tab</span>`
        + `<span class="perm-chip perm-chip-pay"><i data-lucide="lock"></i> Chốt công</span>`;
    }
    const tabs = Array.isArray(userLike.editTabs) ? expandWsTabs(userLike.editTabs) : [];
    const chips = tabs.length
      ? tabs.map(t => `<span class="perm-chip">${escapeHTML(getTabDef(t)?.short || t)}</span>`).join('')
      : `<span class="perm-chip perm-chip-none">Không sửa tab nào</span>`;
    const adv = userLike.allowAdvanced
      ? `<span class="perm-chip perm-chip-adv"><i data-lucide="shield"></i> Vùng nâng cao</span>` : '';
    // Quyền CHỐT CÔNG (20/10/2026) — cấp riêng, mặc định KHÔNG có
    const pay = (userLike.payApply
      ? `<span class="perm-chip perm-chip-pay" title="Được Áp dụng chấm công theo máy / Xóa giờ máy theo kỳ"><i data-lucide="check-square"></i> Áp dụng giờ máy</span>` : '')
      + (userLike.payLock
        ? `<span class="perm-chip perm-chip-pay" title="Được Xử lý dòng công + Trình chốt công / Mở khóa kỳ"><i data-lucide="lock"></i> Xử lý &amp; chốt công</span>` : '');
    return chips + adv + pay;
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
          const userLike = { role: ent.role, editTabs: grants.editTabs, allowAdvanced: grants.allowAdvanced,
            payApply: grants.payApply === true, payLock: grants.payLock === true };
          tr.innerHTML = `
            <td><strong>${escapeHTML(ent.key)}</strong></td>
            <td><code style="font-family:var(--font-mono);">${escapeHTML(ent.key)}</code></td>
            <td>${roleTagHtml(ent.role)}</td>
            <td>${permsChipsHtml(userLike)}</td>
            <td class="text-right">
              ${isSelf ? `
                <button class="btn btn-outline btn-icon btn-sm" onclick="app.openUserEditModal('${escapeHTML(ent.key)}')" title="Đổi tên hiển thị của bạn (Mr Khá...)"><i data-lucide="edit-3"></i></button>
                <span class="text-muted">Chính bạn</span>` : `
                <button class="btn btn-outline btn-icon btn-sm" onclick="app.openUserEditModal('${escapeHTML(ent.key)}')" title="Sửa thông tin / vai trò"><i data-lucide="edit-3"></i></button>
                <button class="btn btn-outline btn-icon btn-sm" onclick="app.openUserPermsModal('${escapeHTML(ent.key)}')" title="Cấu hình quyền chi tiết"><i data-lucide="user-cog"></i></button>
                <button class="btn btn-outline btn-icon btn-sm" onclick="app.sendPasswordResetToUser('${escapeHTML(ent.key)}')" title="Gửi email đặt lại mật khẩu"><i data-lucide="key-round"></i></button>
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
          ${u.username === 'admin' ? `
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.openUserEditModal('${u.id}')" title="Sửa họ tên / đổi mật khẩu Admin"><i data-lucide="edit-3"></i></button>
            <span class="text-muted">Mặc định</span>` : `
            <button class="btn btn-outline btn-icon btn-sm" onclick="app.openUserEditModal('${u.id}')" title="Sửa thông tin / đổi mật khẩu / vai trò"><i data-lucide="edit-3"></i></button>
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
    const password = document.getElementById('new-user-password').value; // KHÔNG trim mật khẩu (khớp đăng nhập)
    const role     = document.getElementById('new-user-role').value;
    const editTabs = readEditTabsChecks('new-user-edit-tabs') || [...ALL_EDITABLE_IDS];
    // Quyền CHỐT CÔNG — mặc định KHÔNG tích (Admin cấp riêng)
    const payApplyEl = document.getElementById('new-user-pay-apply');
    const payLockEl  = document.getElementById('new-user-pay-lock');
    const payApply = !!(payApplyEl && payApplyEl.checked);
    const payLock  = !!(payLockEl && payLockEl.checked);

    if (isFirebaseOnline()) {
      const createChk = document.getElementById('new-user-create-account');
      const sendChk = document.getElementById('new-user-send-reset');
      handleAddOnlineRole(username, role, fullname, editTabs, {
        createAccount: !!(createChk && createChk.checked),
        password,
        sendReset: !!(sendChk && sendChk.checked),
        payApply,
        payLock
      });
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
      payApply, payLock,
      createdAt: new Date().toISOString().split('T')[0]
    });
    state.users.push(newUser);
    saveUsers(); renderUsersTable();
    document.getElementById('add-user-form').reset();
    showToast(`Đã thêm người dùng ${fullname || username} (${ROLES[role]?.name || role}) thành công!`, 'success');
  }

  let adminCreateBusy = false; // chặn bấm "Thêm / Cấp Quyền" nhiều lần khi đang tạo tài khoản

  async function handleAddOnlineRole(emailRaw, role, fullname, editTabs, opts) {
    const email = (emailRaw || '').trim().toLowerCase();
    if (!email.includes('@')) { showToast('Chế độ Online cần nhập Email hợp lệ!', 'error'); return; }
    const options = opts || {};
    const roles = await fetchRolesDoc();
    const all = [...roles.adminEmails, ...roles.managerEmails, ...roles.editorEmails, ...roles.viewerEmails];
    if (all.includes(email)) { showToast('Email này đã có quyền!', 'error'); return; }

    // ① TẠO TÀI KHOẢN ĐĂNG NHẬP (tuỳ chọn) — dùng APP PHỤ, KHÔNG mất phiên Admin
    let created = false;
    if (options.createAccount) {
      if (adminCreateBusy) { showToast('Đang tạo tài khoản, vui lòng chờ…', 'info'); return; }
      const pwd = String(options.password || '');
      if (pwd.length < 6) {
        showToast('Mật khẩu tạm tối thiểu 6 ký tự — hoặc bỏ tích "Tạo tài khoản đăng nhập" nếu email đã có tài khoản.', 'error');
        return;
      }
      adminCreateBusy = true;
      let btn = null;
      try { btn = document.querySelector('#add-user-form button[type="submit"]'); } catch (e) { btn = null; }
      const oldHtml = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Đang tạo tài khoản…'; }
      try {
        await createAuthUserSecondary(email, pwd);
        created = true;
      } catch (err) {
        const code = err && err.code;
        if (code === 'auth/email-already-in-use') {
          showToast('Email đã có tài khoản đăng nhập — chỉ cấp quyền.', 'info');
        } else {
          console.warn('[FB] Lỗi tạo tài khoản', err);
          showToast(authErrorText(code, (err && err.message) || 'Không tạo được tài khoản đăng nhập.'), 'error');
          return;
        }
      } finally {
        adminCreateBusy = false;
        if (btn) { btn.disabled = false; btn.innerHTML = oldHtml; }
      }
    }

    // ② CẤP QUYỀN (settings/roles) — Admin ghi được theo firestore.rules
    roles[rolesDocKey(role)].push(email);
    // Lưu quyền chi tiết (tab được sửa + vùng nâng cao) nếu có chọn
    if (Array.isArray(editTabs)) {
      roles.userGrants = roles.userGrants || {};
      roles.userGrants[email] = {
        editTabs: role === 'admin' ? [...ALL_EDITABLE_IDS] : editTabs,
        allowAdvanced: role === 'admin' || role === 'manager',
        // Quyền CHỐT CÔNG — chỉ Admin cấp, mặc định false
        payApply: role === 'admin' ? true : !!(options && options.payApply),
        payLock:  role === 'admin' ? true : !!(options && options.payLock)
      };
    }
    try {
      await saveRolesDoc(roles);
      if (fullname) {
        // Ghi họ tên hiển thị (tùy chọn) vào doc phụ displayNames
        try {
          const un = fbDb.collection(FB_SETTINGS_COLL).doc('displayNames');
          await un.set({ [email]: fullname }, { merge: true });
        } catch (e) { /* bỏ qua */ }
      }
      // Gửi email để người dùng tự đặt mật khẩu (không phải dùng mật khẩu tạm)
      if (created && options.sendReset) {
        await sendPasswordResetToUser(email);
      }
      renderUsersTable();
      document.getElementById('add-user-form').reset();
      const roleName = ROLES[role]?.name || role;
      if (created && options.sendReset) {
        showToast(`Đã tạo tài khoản + cấp quyền ${roleName} cho ${email}. Đã gửi email để người dùng tự đặt mật khẩu.`, 'success');
      } else if (created) {
        showToast(`Đã tạo tài khoản + cấp quyền cho ${email}. Hãy gửi mật khẩu tạm cho người dùng và nhắc họ đổi mật khẩu.`, 'success');
      } else {
        showToast(`Đã cấp quyền ${roleName} cho ${email}!`, 'success');
      }
    } catch (err) {
      console.warn('[FB] Lỗi cấp quyền', err);
      showToast('Lỗi khi cấp quyền: ' + ((err && err.message) || err) + ' (Hãy đảm bảo là Admin và có kết nối)', 'error');
    }
  }

  // ─── MODAL SỬA THÔNG TIN NGƯỜI DÙNG (ADMIN ONLY) ──────────────
  // Offline: truyền user.id; Online: truyền email (email = tài khoản
  // Firebase Auth nên không đổi được — chỉ sửa họ tên hiển thị & vai trò)
  function openUserEditModal(userIdOrEmail) {
    if (state.currentUser?.role !== 'admin') { showToast('Chỉ Admin mới có quyền sửa!', 'error'); return; }
    const modal = document.getElementById('modal-user-edit');
    const targetInput = document.getElementById('user-edit-target');
    const usernameInput = document.getElementById('user-edit-username');
    const usernameNote = document.getElementById('user-edit-username-note');
    const pwdGrp = document.getElementById('group-user-edit-password');
    const roleSel = document.getElementById('user-edit-role');
    const titleEl = document.getElementById('user-edit-modal-title');
    const fullnameInput = document.getElementById('user-edit-fullname');
    const pwdInput = document.getElementById('user-edit-password');
    if (!modal || !targetInput || !usernameInput || !roleSel) return;
    roleSel.disabled = false;

    if (isFirebaseOnline()) {
      const email = String(userIdOrEmail || '').trim().toLowerCase();
      // Tự sửa chính mình: chỉ đổi tên hiển thị, khóa vai trò (tránh tự hạ quyền)
      const isSelf = state.currentUser && email === (state.currentUser.email || '').toLowerCase();
      fetchRolesDoc().then(roles => {
        const all = [...roles.adminEmails, ...roles.managerEmails, ...roles.editorEmails, ...roles.viewerEmails];
        if (!all.includes(email)) { showToast('Không tìm thấy người dùng này!', 'error'); return; }
        const role = roles.adminEmails.includes(email) ? 'admin'
          : roles.managerEmails.includes(email) ? 'manager'
          : roles.editorEmails.includes(email) ? 'editor' : 'viewer';
        targetInput.value = `email:${email}`;
        if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Người Dùng: ${escapeHTML(email)}`;
        if (fullnameInput) {
          fullnameInput.value = (isSelf && state.currentUser.fullname && state.currentUser.fullname !== email) ? state.currentUser.fullname : '';
          fullnameInput.placeholder = isSelf ? 'Đổi tên hiển thị. VD: Mr Khá' : 'Họ tên hiển thị (không bắt buộc)';
        }
        usernameInput.value = email;
        usernameInput.readOnly = true;
        if (usernameNote) {
          usernameNote.style.display = '';
          usernameNote.textContent = 'Email là tài khoản đăng nhập Firebase — không thể đổi. Mật khẩu do chính chủ tài khoản tự đổi.';
        }
        if (pwdGrp) pwdGrp.style.display = 'none';
        if (pwdInput) pwdInput.value = '';
        // Online: đổi mật khẩu qua EMAIL đặt lại (Firebase không cho admin biết mật khẩu)
        const resetRow = document.getElementById('user-edit-reset-row');
        if (resetRow) resetRow.style.display = '';
        roleSel.value = role;
        roleSel.disabled = isSelf;
        if (isSelf) roleSel.title = 'Không thể tự đổi vai trò của chính mình';
        modal.classList.add('show');
        initLucide();
      });
      return;
    }

    // OFFLINE: sửa họ tên / tên đăng nhập / mật khẩu / vai trò
    const user = state.users.find(u => u.id === userIdOrEmail);
    if (!user) { showToast('Không tìm thấy người dùng này!', 'error'); return; }
    const isDefaultAdmin = user.username === 'admin';
    targetInput.value = `id:${user.id}`;
    if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Sửa Người Dùng: ${escapeHTML(user.fullname || user.username)}`;
    if (fullnameInput) { fullnameInput.value = user.fullname || ''; fullnameInput.placeholder = 'VD: Nguyễn Văn A'; }
    usernameInput.value = user.username || '';
    usernameInput.readOnly = isDefaultAdmin;
    if (usernameNote) {
      usernameNote.style.display = isDefaultAdmin ? '' : 'none';
      if (isDefaultAdmin) usernameNote.textContent = 'Tài khoản Admin mặc định — không đổi được tên đăng nhập & vai trò.';
    }
    if (pwdGrp) pwdGrp.style.display = '';
    if (pwdInput) { pwdInput.value = ''; pwdInput.placeholder = 'Bỏ trống = giữ mật khẩu hiện tại'; }
    // Offline: đổi mật khẩu trực tiếp nên KHÔNG hiện nút gửi email đặt lại
    const resetRowOff = document.getElementById('user-edit-reset-row');
    if (resetRowOff) resetRowOff.style.display = 'none';
    roleSel.value = user.role || 'viewer';
    if (isDefaultAdmin) { roleSel.disabled = true; roleSel.title = 'Admin mặc định luôn toàn quyền'; }
    else roleSel.title = '';
    modal.classList.add('show');
    initLucide();
  }

  function closeUserEditModal() {
    document.getElementById('modal-user-edit')?.classList.remove('show');
  }

  async function handleUserEditSubmit(e) {
    e.preventDefault();
    if (state.currentUser?.role !== 'admin') { showToast('Chỉ Admin mới có quyền sửa!', 'error'); return; }
    const target = document.getElementById('user-edit-target').value || '';
    const [kind, ...rest] = target.split(':');
    const key = rest.join(':');
    const fullname = document.getElementById('user-edit-fullname').value.trim();
    const role = document.getElementById('user-edit-role').value;
    if (!role) { showToast('Vui lòng chọn vai trò!', 'error'); return; }

    // ONLINE: đổi vai trò (chuyển nhóm email) + lưu họ tên hiển thị
    if (kind === 'email') {
      const roles = await fetchRolesDoc();
      const exists = [...roles.adminEmails, ...roles.managerEmails, ...roles.editorEmails, ...roles.viewerEmails].includes(key);
      if (!exists) { showToast('Người dùng không còn trong danh sách!', 'error'); return; }
      roles.adminEmails   = roles.adminEmails.filter(x => x !== key);
      roles.managerEmails = roles.managerEmails.filter(x => x !== key);
      roles.editorEmails  = roles.editorEmails.filter(x => x !== key);
      roles.viewerEmails  = roles.viewerEmails.filter(x => x !== key);
      roles[rolesDocKey(role)].push(key);
      // Quyền chi tiết: giữ tab đã cấu hình (nếu có), cập nhật vùng nâng cao theo vai trò mới
      roles.userGrants = roles.userGrants || {};
      const grants = roles.userGrants[key] || {};
      roles.userGrants[key] = {
        editTabs: Array.isArray(grants.editTabs) && grants.editTabs.length ? grants.editTabs : [...ALL_EDITABLE_IDS],
        allowAdvanced: role === 'admin' || role === 'manager',
        // GIỮ 2 quyền CHỐT CÔNG khi Admin chỉ đổi vai trò (tránh xóa quyền oan)
        payApply: role === 'admin' ? true : grants.payApply === true,
        payLock: role === 'admin' ? true : grants.payLock === true
      };
      try {
        await saveRolesDoc(roles);
        if (fullname) {
          try {
            const un = fbDb.collection(FB_SETTINGS_COLL).doc('displayNames');
            await un.set({ [key]: fullname }, { merge: true });
          } catch (err) {}
        }
        renderUsersTable();
        closeUserEditModal();
        // Sửa chính mình → đổi tên hiển thị trên pill hồ sơ NGAY và giữ cho các lần đăng nhập sau
        if (state.currentUser && key === (state.currentUser.email || '').toLowerCase()) {
          if (fullname) state.currentUser.fullname = fullname;
          state.currentUser.role = role;
          saveSession();
          updateUserProfileHeader();
          applyRoleToUI(state.currentUser.role);
        }
        showToast(`Đã cập nhật ${key} (${ROLES[role]?.name || role})!`, 'success');
      } catch (err) {
        console.warn('[FB] Lỗi sửa người dùng', err);
        showToast('Lỗi khi lưu: ' + err.message, 'error');
      }
      return;
    }

    // OFFLINE: cập nhật user cục bộ
    const user = state.users.find(u => u.id === key);
    if (!user) { showToast('Không tìm thấy người dùng này!', 'error'); return; }
    const prevUsername = user.username;
    const usernameInput = document.getElementById('user-edit-username');
    const newUsername = usernameInput.readOnly ? user.username : usernameInput.value.trim();
    const newPassword = (document.getElementById('user-edit-password')?.value || '').trim();
    if (!newUsername) { showToast('Tên đăng nhập không được để trống!', 'error'); return; }
    if (state.users.some(u => u.id !== user.id && u.username.toLowerCase() === newUsername.toLowerCase())) {
      showToast('Tên đăng nhập đã tồn tại!', 'error'); return;
    }
    user.username = newUsername;
    user.fullname = fullname || user.fullname;
    if (user.username !== 'admin') user.role = role; // Admin mặc định giữ toàn quyền
    if (newPassword) user.password = newPassword;
    user.allowAdvanced = user.role === 'admin' || user.role === 'manager';
    saveUsers(); renderUsersTable(); closeUserEditModal();
    // Sửa chính mình → cập nhật phiên & giao diện phân quyền ngay
    if (state.currentUser && state.currentUser.username === prevUsername) {
      state.currentUser.username = user.username;
      state.currentUser.fullname = user.fullname;
      state.currentUser.role = user.role;
      state.currentUser.allowAdvanced = user.allowAdvanced;
      saveSession(); applyRoleToUI(user.role); updateUserProfileHeader(); renderAll();
    }
    showToast(`Đã cập nhật người dùng ${user.fullname || user.username}!`, 'success');
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
    // Quyền CHỐT CÔNG (20/10/2026)
    const payApplyCheck = document.getElementById('user-perms-pay-apply');
    const payLockCheck  = document.getElementById('user-perms-pay-lock');

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
        setEditTabsChecks('user-perms-edit-tabs', expandWsTabs(grants.editTabs) || (role === 'admin' ? [...ALL_EDITABLE_IDS] : []));
        advCheck.checked = !!grants.allowAdvanced || role === 'admin' || role === 'manager';
        if (payApplyCheck) payApplyCheck.checked = role === 'admin' || grants.payApply === true;
        if (payLockCheck) payLockCheck.checked = role === 'admin' || grants.payLock === true;
        initLucide();
      });
    } else {
      const user = state.users.find(u => u.id === userIdOrEmail);
      if (!user) return;
      targetInput.value = `id:${user.id}`;
      roleBadge.textContent = ROLES[user.role]?.name || user.role;
      roleBadge.dataset.role = user.role;
      // expandWsTabs: user cũ chỉ có 'kanban' → 2 ô Xưởng 1/Xưởng 2 phải TÍCH sẵn
      // (nếu không admin mở modal rồi lưu là mất quyền oan)
      setEditTabsChecks('user-perms-edit-tabs', expandWsTabs(user.editTabs) || []);
      advCheck.checked = !!user.allowAdvanced;
      if (payApplyCheck) payApplyCheck.checked = user.role === 'admin' || user.payApply === true;
      if (payLockCheck) payLockCheck.checked = user.role === 'admin' || user.payLock === true;
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
    // Quyền CHỐT CÔNG (20/10/2026)
    const payApplyCheck = document.getElementById('user-perms-pay-apply');
    const payLockCheck  = document.getElementById('user-perms-pay-lock');
    const payApply = !!(payApplyCheck && payApplyCheck.checked);
    const payLock  = !!(payLockCheck && payLockCheck.checked);

    if (kind === 'email') {
      // ONLINE: lưu vào roles.userGrants[email]
      const roles = await fetchRolesDoc();
      roles.userGrants = roles.userGrants || {};
      roles.userGrants[key] = { editTabs, allowAdvanced, payApply, payLock };
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
    user.payApply = payApply;
    user.payLock = payLock;
    saveUsers(); renderUsersTable(); closeUserPermsModal();
    // Nếu đang sửa chính mình thì cập nhật lại giao diện phân quyền
    if (state.currentUser && state.currentUser.username === user.username) {
      state.currentUser.editTabs = [...editTabs];
      state.currentUser.allowAdvanced = allowAdvanced;
      state.currentUser.payApply = payApply;
      state.currentUser.payLock = payLock;
      saveSession(); applyRoleToUI(state.currentUser.role);
      renderAll();
    }
    showToast(`Đã cập nhật quyền cho ${user.fullname || user.username}!`, 'success');
  }

export {
  checkAuthAndRender,
  closeUserEditModal,
  closeUserPermsModal,
  closeUsersMgrModal,
  createAuthUserSecondary,
  deleteOnlineRole,
  deleteUser,
  fetchRolesDoc,
  handleAddOnlineRole,
  handleAddUserSubmit,
  handleResetSubmit,
  handleUserEditSubmit,
  handleUserPermsSubmit,
  loadSession,
  loadUsers,
  onSysExport,
  onSysFlagPreset,
  onSysFlagToggle,
  onSysPermChange,
  onSysPermReset,
  onSysReset,
  openUserEditModal,
  openUserPermsModal,
  openUsersMgrModal,
  renderSysPerms,
  renderSysSettings,
  renderSysFlags,
  renderUsersTable,
  roleTagHtml,
  rolesDocKey,
  saveRolesDoc,
  saveSession,
  saveUsers,
  sendPasswordResetToUser,
  sysSetTab,
  toggleAuthPanel,
  toggleRegisterForm,
  updateUserProfileHeader
};
