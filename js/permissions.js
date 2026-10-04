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
//   LƯU Ý (04/10/2026): tab "kanban" là TAB CHA của Công Đoạn SX, gồm 2 XƯỞNG
//   riêng biệt: x1 (Xưởng 1) + x2 (Xưởng 2) — khai báo phân quyền RIÊNG từng xưởng
//   (thẻ Xưởng 1 có data-perm="x1", thẻ Xưởng 2 có data-perm="x2").
//   • `kanban` PHẢI đứng ĐẦU mảng (getTabByView('kanban-view') trả phần tử đầu —
//     currentTabId() của tab Công Đoạn SX phải là 'kanban');
//   • x1/x2 có viewId: null → getTabByView KHÔNG khớp, chỉ dùng cho phân quyền.
export const APP_TABS = [
  { id: 'kanban',   viewId: 'kanban-view',   name: 'Công Đoạn SX',            short: 'Công Đoạn',  icon: 'layout-grid',    color: '#059669' },
  { id: 'x1',       viewId: null,            name: 'Công Đoạn SX — Xưởng 1',  short: 'Xưởng 1',     icon: 'warehouse',      color: '#b45309' },
  { id: 'x2',       viewId: null,            name: 'Công Đoạn SX — Xưởng 2',  short: 'Xưởng 2',     icon: 'factory',        color: '#0f766e' },
  { id: 'planning', viewId: 'planning-view', name: 'Kế Hoạch Sản Xuất',  short: 'Kế Hoạch',   icon: 'clipboard-list', color: '#7c3aed' },
  { id: 'press',    viewId: 'press-view',    name: 'Sản Lượng Ép Ván',   short: 'Ép Ván',     icon: 'factory',        color: '#ea580c' },
  { id: 'materials',viewId: 'materials-view',name: 'Nhập Nguyên Liệu',   short: 'Nguyên Liệu',icon: 'package-plus',   color: '#db2777' },
  { id: 'qc',       viewId: 'qc-view',       name: 'QC — Xuất Hàng',     short: 'QC',         icon: 'clipboard-check',color: '#0d9488' },
  { id: 'hr',       viewId: 'hr-view',       name: 'Nhân Sự',            short: 'Nhân Sự',     icon: 'users',         color: '#2563eb' }
];

// Tab dùng cho chỉnh sửa = các tab dữ liệu + Dashboard (biểu đồ)
export const EDITABLE_TAB_IDS = APP_TABS.map(t => t.id);
export const ALL_EDITABLE_IDS = [...EDITABLE_TAB_IDS, 'dashboard'];

// Hai xưởng của tab Công Đoạn SX — dùng cho migration quyền dữ liệu CŨ
export const WS_TAB_IDS = ['x1', 'x2'];

// Mở rộng quyền xưởng: user cũ chỉ có 'kanban' mà CHƯA có x1/x2 → cấp cả 2.
// Idempotent (chạy nhiều lần vẫn cho cùng kết quả) — dùng cho normalizeUser
// lẫn getEditableTabs (test/thứ 3 set state.currentUser trực tiếp, không qua normalize).
export function expandWsTabs(tabs) {
  if (!Array.isArray(tabs) || !tabs.includes('kanban')) return tabs;
  if (WS_TAB_IDS.some(t => tabs.includes(t))) return tabs;
  return [...tabs, ...WS_TAB_IDS];
}

export function getTabDef(tabId) { return APP_TABS.find(t => t.id === tabId) || null; }
export function getTabByView(viewId) { return APP_TABS.find(t => t.viewId === viewId) || null; }

function roleInfo(role) { return ROLES[role] || ROLES.viewer; }
function currentUser() { return state.currentUser || null; }

// ─── CHUẨN HÓA USER (migrate dữ liệu cũ) ─────────────────────
// Đảm bảo mọi user đều có editTabs & allowAdvanced. Với dữ liệu cũ
// chưa cấu hình: editor/manager được sửa toàn bộ (giữ tương thích), viewer không.
//
// MIGRATION QUYỀN XƯỞNG (04/10/2026): trước đây tab Công Đoạn chỉ có 1 quyền
// 'kanban'; nay tách thành 2 xưởng riêng biệt x1 / x2. Dữ liệu người dùng cũ
// CHỈ CÓ 'kanban' mà CHƯA có 'x1'/'x2' → được cấp CẢ HAI xưởng (không mất quyền).
// Sau khi admin tách quyền (editTabs đã chứa x1 hoặc x2) → KHÔNG tự cấp lại.
export function normalizeUser(u) {
  if (!u) return u;
  const info = roleInfo(u.role);
  if (!Array.isArray(u.editTabs)) {
    u.editTabs = info.editAll || info.id === 'editor' || info.id === 'manager'
      ? [...ALL_EDITABLE_IDS]
      : [];
  }
  // MIGRATION quyền xưởng: user cũ chỉ có 'kanban' → cấp thêm cả 2 xưởng
  // (dùng chung expandWsTabs — idempotent, chạy lại vẫn cho cùng kết quả)
  u.editTabs = expandWsTabs(u.editTabs);
  if (typeof u.allowAdvanced !== 'boolean') u.allowAdvanced = !!info.canAdvanced;
  return u;
}

// ─── TRUY VẤN QUYỀN ───────────────────────────────────────────
export function getUserRole() { return currentUser()?.role || null; }
export function isAdmin() { return getUserRole() === 'admin'; }

// Quyền sửa của tab CHA 'kanban' (Công Đoạn SX) = có ít nhất MỘT xưởng
// (x1 hoặc x2) — vì requireEditPermission() kiểm theo currentTabId() = 'kanban'
// khi người dùng đang đứng ở tab Công Đoạn SX.
function canEditKanbanTab(tabs) {
  return tabs.includes('kanban') || WS_TAB_IDS.some(t => tabs.includes(t));
}

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
  // expandWsTabs: user cũ chỉ có 'kanban' → coi như có CẢ 2 xưởng
  // (idempotent, không ghi ngược lại u.editTabs)
  return expandWsTabs(tabs).filter(t => ALL_EDITABLE_IDS.includes(t));
}

// Nguồn biểu đồ 'materialsPlan' (Kế hoạch vs Thực tế nguyên liệu) thuộc quyền
// chỉnh sửa của tab Nguyên Liệu — ánh xạ để nút sửa/xóa hiện đúng cho editor.
const CHART_SOURCE_TAB_ALIAS = { materialsPlan: 'materials' };

export function canEditTab(tabId) {
  const u = currentUser();
  if (!u) return false;
  const t = CHART_SOURCE_TAB_ALIAS[tabId] || tabId;
  if (roleInfo(u.role).editAll) return true;
  const tabs = getEditableTabs();
  // Tab cha 'kanban' = hợp của 2 xưởng (user chỉ được cấp 1 xưởng vẫn sửa
  // được các thao tác chung của tab; nút riêng từng xưởng lo phần còn lại)
  if (t === 'kanban') return canEditKanbanTab(tabs);
  return tabs.includes(t);
}

// ─── QUYỀN CẬP NHẬT ĐỊNH MỨC ────────────────────────────────────
// Chỉ QUẢN TRỊ (admin) mới được sửa ĐỊNH MỨC (công suất Xưởng 2, định mức
// nguyên vật liệu, định mức kiểm QC…) — người được cấp tab vẫn KHÔNG đủ.
// Mọi nơi lưu định mức đều đi qua cloud.requireRatePermission() → cổng này,
// nên muốn đổi chính sách chỉ cần sửa tại đây.
export function canEditRate() { return isAdmin(); }

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
  show('btn-import-json', role === 'admin');
  // Auto backup (phục hồi bản cất trên máy / trên mây) — chỉ Admin
  show('btn-open-autobackup', role === 'admin');
  show('btn-open-cloud-backup', role === 'admin');
  // Khách: hiện nút Đăng Nhập, ẩn pill hồ sơ; đã đăng nhập: ngược lại
  show('btn-open-login', !u);
  show('user-profile-badge', !!u);
}