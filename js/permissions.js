// ═══════════════════════════════════════════════════════════
// js/permissions.js — TRUNG TÂM PHÂN QUYỀN CỦA ỨNG DỤNG
// ───────────────────────────────────────────────────────────
// Mô hình vai trò (role):
//   admin   : Toàn quyền — xem cả 2 vùng, sửa mọi tab, quản lý người dùng
//   manager : Ban Quản Lý — xem vùng nâng cao, sửa theo tab được chỉ định
//   editor  : Chỉ xem vùng cơ bản, sửa theo tab được chỉ định
//   viewer / khách: Chỉ xem vùng cơ bản, không sửa
// Quyền chi tiết theo từng người (cấp riêng lẻ, admin có thể cấu hình):
//   editTabs[]    : Danh sách tab ID được phép chỉnh sửa
//   allowAdvanced : Được xem Vùng Nâng Cao (VD: Ban quản lý, cộng tác viên)
// ═══════════════════════════════════════════════════════════
import { state } from './state.js';

// ─── ĐỊNH NGHĨA VAI TRÒ ───────────────────────────────────────
export const ROLES = {
  admin:   { id: 'admin',   name: 'Quản Trị',          desc: 'Toàn quyền hệ thống',            canAdvanced: true,  editAll: true  },
  manager: { id: 'manager', name: 'Ban Quản Lý',        desc: 'Xem vùng nâng cao + sửa theo tab', canAdvanced: true,  editAll: false },
  editor:  { id: 'editor',  name: 'Người Chỉnh Sửa',   desc: 'Xem cơ bản + sửa theo tab',       canAdvanced: false, editAll: false },
  viewer:  { id: 'viewer',  name: 'Người Xem',          desc: 'Chỉ xem vùng cơ bản',             canAdvanced: false, editAll: false }
};
export const ROLE_ORDER = ['admin', 'manager', 'editor', 'viewer'];

// ─── DANH SÁCH TAB CÓ DỮ LIỆU (mở rộng cho tab tương lai) ────
// Khi thêm tab mới: thêm 1 dòng tại đây — Dashboard, vùng biểu đồ và
// bảng phân quyền sẽ tự động nhận tab mới.
export const APP_TABS = [
  { id: 'kanban',   viewId: 'kanban-view',   name: 'Công Đoạn (Kanban)', short: 'Công Đoạn',  icon: 'layout-grid',    color: 'var(--primary)' },
  { id: 'planning', viewId: 'planning-view', name: 'Kế Hoạch Sản Xuất',  short: 'Kế Hoạch',   icon: 'clipboard-list', color: '#7c3aed' },
  { id: 'press',    viewId: 'press-view',    name: 'Sản Lượng Ép Ván',   short: 'Ép Ván',     icon: 'factory',        color: '#ea580c' },
  { id: 'materials',viewId: 'materials-view',name: 'Nhập Nguyên Liệu',   short: 'Nguyên Liệu',icon: 'package-plus',   color: '#059669' }
];

// Tab dùng cho chỉnh sửa = các tab dữ liệu + Dashboard (biểu đồ)
export const EDITABLE_TAB_IDS = APP_TABS.map(t => t.id);
export const ALL_EDITABLE_IDS = [...EDITABLE_TAB_IDS, 'dashboard'];

export function getTabDef(tabId) { return APP_TABS.find(t => t.id === tabId) || null; }
export function getTabByView(viewId) { return APP_TABS.find(t => t.viewId === viewId) || null; }

function roleInfo(role) { return ROLES[role] || ROLES.viewer; }
function currentUser() { return state.currentUser || null; }

// ─── CHUẨN HÓA USER (migrate dữ liệu cũ) ─────────────────────
// Đảm bảo mọi user đều có editTabs & allowAdvanced. Với dữ liệu cũ
// chưa cấu hình: editor/manager được sửa toàn bộ (giữ tương thích), viewer không.
export function normalizeUser(u) {
  if (!u) return u;
  const info = roleInfo(u.role);
  if (!Array.isArray(u.editTabs)) {
    u.editTabs = info.editAll || info.id === 'editor' || info.id === 'manager'
      ? [...ALL_EDITABLE_IDS]
      : [];
  }
  if (typeof u.allowAdvanced !== 'boolean') u.allowAdvanced = !!info.canAdvanced;
  return u;
}

// ─── TRUY VẤN QUYỀN ───────────────────────────────────────────
export function getUserRole() { return currentUser()?.role || null; }
export function isAdmin() { return getUserRole() === 'admin'; }

// Vùng Nâng Cao: admin + manager + người được cấp riêng (allowAdvanced)
export function canViewAdvanced() {
  const u = currentUser();
  if (!u) return false;
  if (roleInfo(u.role).canAdvanced) return true;
  return u.allowAdvanced === true;
}

// Danh sách tab được sửa của người dùng hiện tại
export function getEditableTabs() {
  const u = currentUser();
  if (!u) return [];
  if (roleInfo(u.role).editAll) return [...ALL_EDITABLE_IDS];
  const tabs = Array.isArray(u.editTabs) ? u.editTabs : [];
  return tabs.filter(t => ALL_EDITABLE_IDS.includes(t));
}

export function canEditTab(tabId) {
  const u = currentUser();
  if (!u) return false;
  if (roleInfo(u.role).editAll) return true;
  return getEditableTabs().includes(tabId);
}

// Sửa được biểu đồ ở vùng nào (biểu đồ vùng nâng cao cần cả 2 quyền)
export function canEditChartZone(zone, source) {
  if (zone === 'advanced' && !canViewAdvanced()) return false;
  return canEditTab(source || 'dashboard');
}

// Sửa được ít nhất một thứ gì đó (dùng cho nút Undo, module chung...)
export function canEditAnything() {
  return isAdmin() || getEditableTabs().length > 0;
}

// Tab ID ứng với view đang mở (để gate thao tác theo ngữ cảnh)
export function currentTabId() {
  return getTabByView(state.activeView)?.id || 'dashboard';
}

// ─── ĐỒNG BỘ GIAO DIỆN THEO QUYỀN ────────────────────────────
// Gọi lại hàm này sau mỗi lần đổi user/role. CSS dựa vào class &
// data-attribute của <body> để ẩn/hiện đúng vùng.
export function syncPermissionUI() {
  const u = currentUser();
  const role = u?.role || null;
  const body = document.body;
  if (u) normalizeUser(u);
  const canEdit = canEditAnything();
  body.classList.toggle('is-admin', role === 'admin');
  body.classList.toggle('is-manager', role === 'manager');
  body.classList.toggle('can-edit', canEdit);
  body.classList.toggle('read-only', !canEdit);
  body.classList.toggle('can-advanced', canViewAdvanced());
  body.dataset.editTabs = getEditableTabs().join(' ');
  body.dataset.role = role || 'guest';
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  // Mục chỉ dành cho Admin trong menu
  show('btn-open-users-mgr', role === 'admin');
  show('btn-dropdown-share', role === 'admin');
  show('btn-import-json', role === 'admin');
  // Khách: hiện nút Đăng Nhập, ẩn pill hồ sơ; đã đăng nhập: ngược lại
  show('btn-open-login', !u);
  show('user-profile-badge', !!u);
}