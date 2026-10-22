// ═══════════════════════════════════════════════════════════
// js/sys-settings.js — CÀI ĐẶT HỆ THỐNG (admin chủ động bật/tắt)
// ───────────────────────────────────────────────────────────
// ① CỜ HIỂN THỊ (UI_FLAGS): admin bật/tắt chủ động — KHÔNG hẹn giờ.
//    Mỗi cờ có danh sách VAI TRÒ được thấy; CSS ẩn theo data-flag-show.
// ② QUYỀN THEO VÙNG (PERM_AREAS): 37 vùng × 4 vai trò × 4 mức
//    none / view / edit / approve. Admin LUÔN approve (khoá, chống tự khoá).
//
// NGUYÊN TẮC AN TOÀN: ô nào CHƯA cấu hình = GIỮ HÀNH VI CŨ (vai trò + editTabs).
// Nhờ vậy bật tính năng này KHÔNG làm ai mất quyền; admin chỉnh ô nào mới siết ô đó.
//
// Module CHỈ import state.js (không import module khác) để permissions.js
// import được mà KHÔNG vòng import (utils/cloud đều import permissions).
// ═══════════════════════════════════════════════════════════
import { STORAGE_KEY_SYS_SETTINGS, state } from './state.js';

// ─── 4 MỨC QUYỀN ─────────────────────────────────────────────
export const PERM_LEVELS = ['none', 'view', 'edit', 'approve'];
export const PERM_LEVEL_LABEL = {
  none: 'Không thấy',
  view: 'Chỉ xem',
  edit: 'Được sửa',
  approve: 'Duyệt / khoá'
};
const LEVEL_RANK = { none: 0, view: 1, edit: 2, approve: 3 };

// ─── ① CỜ HIỂN THỊ ───────────────────────────────────────────
export const UI_FLAGS = [
  {
    id: 'see.perf.cap', label: 'Công suất', icon: 'gauge', group: 'Hiệu quả sản xuất',
    desc: 'Công suất thực tế trên đầu thẻ ngày (xe/h · kg/h · thanh/h · m³/h · tấm/h). '
      + 'TẮT với Người Chỉnh Sửa / Người Xem để tránh thấy số thấp rồi sửa dữ liệu.',
    roles: { admin: true, manager: true, editor: false, viewer: false }
  },
  {
    id: 'see.perf.eff', label: 'Hiệu suất', icon: 'target', group: 'Hiệu quả sản xuất',
    desc: 'Hiệu suất so định mức · ĐM của tháng · chip "So ca kia". '
      + 'TẮT với Người Chỉnh Sửa / Người Xem (số liệu sản lượng vẫn giữ).',
    roles: { admin: true, manager: true, editor: false, viewer: false }
  },
  {
    id: 'see.cost', label: 'Giá mua & giá thành', icon: 'circle-dollar-sign', group: 'Số liệu nhạy cảm',
    desc: 'Đơn giá / thành tiền nguyên liệu · giá thành 1 kg ống đạt · doanh thu phụ phẩm.',
    roles: { admin: true, manager: true, editor: false, viewer: false }
  },
  {
    id: 'see.pay', label: 'Chốt công & lương', icon: 'wallet', group: 'Số liệu nhạy cảm',
    desc: 'Bảng chốt công / phiếu lương chi tiết ở tab Nhân Sự.',
    roles: { admin: true, manager: true, editor: false, viewer: false }
  },
  {
    id: 'incident-manual', label: 'Cho phép nhập tay giờ sự cố', icon: 'alert-triangle', group: 'Nhập liệu',
    desc: 'TẮT (khuyến nghị) = giờ sự cố CHỈ lấy từ phiếu "Báo Cáo Sự Cố" ĐÃ DUYỆT. '
      + 'Bật tạm khi cần chỉnh dữ liệu cũ, xong tắt lại (tránh sửa số liệu).',
    roles: { admin: true, manager: false, editor: false, viewer: false }
  }
];
export const UI_FLAG_IDS = UI_FLAGS.map(f => f.id);
export const flagDef = id => UI_FLAGS.find(f => f.id === id) || null;

// ─── ② NHÓM VÙNG QUYỀN ──────────────────────────────────────
export const PERM_GROUPS = [
  { id: 'ap', label: 'Cổng duyệt', icon: 'shield-check',
    desc: 'Ai được DUYỆT / TỪ CHỐI / MỞ LẠI phiếu — tách riêng từng loại (trước đây dùng chung 1 cổng).' },
  { id: 'x2', label: 'Công đoạn — Xưởng 2', icon: 'factory',
    desc: 'Nhập liệu sản xuất · Than Hóa + Sấy · Kho nan · Ép Ván · Phụ phẩm.' },
  { id: 'x1', label: 'Công đoạn — Xưởng 1', icon: 'warehouse',
    desc: 'Nhập liệu 8 công đoạn Xưởng 1 + chốt lô Cắt Ống.' },
  { id: 'plan', label: 'Kế hoạch sản xuất', icon: 'clipboard-list',
    desc: 'Kế hoạch tuần · định mức nguyên vật liệu · tồn đầu kỳ.' },
  { id: 'mat', label: 'Nguyên liệu', icon: 'package-plus',
    desc: 'Nhập lô nguyên liệu · đơn giá mua · danh mục nhà cung cấp.' },
  { id: 'qc', label: 'QC', icon: 'clipboard-check',
    desc: 'Nhập kết quả kiểm (xuất hàng · kiểm sau sản xuất · nhật ký ép).' },
  { id: 'hr', label: 'Nhân sự', icon: 'users',
    desc: 'Hồ sơ · bảng bố trí (giờ công) · chấm công · giờ máy · ca/lịch · tuyển dụng · đơn từ.' },
  { id: 'sys', label: 'Hệ thống', icon: 'settings',
    desc: 'Người dùng · cài đặt · sao lưu · đồng bộ mây · lịch sử · xoá hàng loạt · định mức.' }
];

// legacy = cách suy ra mức quyền khi ô CHƯA cấu hình (giữ hành vi cũ):
//   'approve'  → Admin + Ban Quản Lý
//   'admin'    → chỉ Admin
//   'payApply' → theo quyền riêng payApply của user
//   'tab'      → theo tab được cấp (editTabs), còn lại xem
export const PERM_AREAS = [
  // ── Cổng duyệt ──
  { id: 'ap.kho', group: 'ap', label: 'Duyệt phiếu Kho · chốt lệch tồn', tab: 'kanban', legacy: 'approve',
    desc: 'Duyệt / từ chối / mở lại phiếu xuất–tiêu huỷ–tái chế; chốt lệch tồn kho.' },
  { id: 'ap.leave', group: 'ap', label: 'Duyệt đơn nghỉ phép', tab: 'hr', legacy: 'approve' },
  { id: 'ap.ot', group: 'ap', label: 'Duyệt đơn tăng ca', tab: 'hr', legacy: 'approve' },
  { id: 'ap.incident', group: 'ap', label: 'Duyệt phiếu báo cáo sự cố', tab: 'kanban', legacy: 'approve',
    desc: 'Duyệt xong thì giờ của phiếu tự thành GIỜ SỰ CỐ của công đoạn + ngày.' },
  { id: 'ap.rate', group: 'ap', label: 'Duyệt định mức', tab: 'kanban', legacy: 'approve' },
  { id: 'ap.pay', group: 'ap', label: 'Chốt công · mở khoá kỳ lương', tab: 'hr', legacy: 'payLock' },

  // ── Xưởng 2 ──
  { id: 'x2.prod', group: 'x2', label: 'Nhập liệu 10 công đoạn thường', tab: 'x2', legacy: 'tab',
    desc: 'Cắt chọn · Bốc luồng · Bổ ống · Bào thô · Chọn nan · Bào tinh · Bullig · Cắt ván · Bào ván · Hỗ trợ.' },
  { id: 'x2.say', group: 'x2', label: 'Than Hóa + Sấy (tạo lô · chuyển kho)', tab: 'x2', legacy: 'tab' },
  { id: 'x2.kho.note', group: 'x2', label: 'Lập / sửa phiếu kho (chờ duyệt)', tab: 'kanban', legacy: 'tab' },
  { id: 'x2.kho.recon', group: 'x2', label: 'Rà soát sổ kho · tạo phiếu bù', tab: 'kanban', legacy: 'approve' },
  { id: 'x2.epvan', group: 'x2', label: 'Lượt ép ván', tab: 'press', legacy: 'tab' },
  { id: 'x2.phupham', group: 'x2', label: 'Bán/tiêu huỷ phụ phẩm · kiểm kê', tab: 'x2', legacy: 'tab',
    desc: 'Dính doanh thu + giá thành ⇒ nên chỉ Admin / Ban Quản Lý.' },

  // ── Xưởng 1 ──
  { id: 'x1.prod', group: 'x1', label: 'Nhập liệu 8 công đoạn Xưởng 1', tab: 'x1', legacy: 'tab' },
  { id: 'x1.close', group: 'x1', label: 'Chốt lô Cắt Ống (khoá hao hụt)', tab: 'x1', legacy: 'tab',
    desc: 'Tick "đã cắt xong" — khoá phần còn lại và chốt hao hụt của lô.' },
  { id: 'x1.phoisay', group: 'x1', label: 'Phơi sấy', tab: 'x1', legacy: 'tab' },

  // ── Kế hoạch ──
  { id: 'plan.items', group: 'plan', label: 'Kế hoạch tuần', tab: 'planning', legacy: 'tab' },
  { id: 'plan.rates', group: 'plan', label: 'Định mức nguyên vật liệu', tab: 'planning', legacy: 'admin' },
  { id: 'plan.stock', group: 'plan', label: 'Tồn đầu kỳ (kế hoạch)', tab: 'planning', legacy: 'tab' },

  // ── Nguyên liệu ──
  { id: 'mat.entry', group: 'mat', label: 'Nhập lô nguyên liệu + ảnh', tab: 'materials', legacy: 'tab' },
  { id: 'mat.price', group: 'mat', label: 'Đơn giá / tiền mua', tab: 'materials', legacy: 'tab',
    desc: 'Số liệu tiền — nên chỉ Admin / Ban Quản Lý.' },
  { id: 'mat.supplier', group: 'mat', label: 'Danh mục nhà cung cấp', tab: 'materials', legacy: 'tab' },

  // ── QC ──
  { id: 'qc.entry', group: 'qc', label: 'Nhập kết quả kiểm', tab: 'qc', legacy: 'tab' },

  // ── Nhân sự ──
  { id: 'hr.emp', group: 'hr', label: 'Hồ sơ nhân viên + nạp Excel', tab: 'hr', legacy: 'tab' },
  { id: 'hr.board', group: 'hr', label: 'Bảng bố trí (giờ công)', tab: 'hr', legacy: 'tab',
    desc: 'Ảnh hưởng trực tiếp giờ công → công suất → lương.' },
  { id: 'hr.att', group: 'hr', label: 'Chấm công tay', tab: 'hr', legacy: 'tab' },
  { id: 'hr.machine', group: 'hr', label: 'Áp dụng / xoá giờ máy chấm công', tab: 'hr', legacy: 'payApply',
    desc: 'Ghi đè dữ liệu chấm công thô — mặc định chỉ Admin.' },
  { id: 'hr.calendar', group: 'hr', label: 'Cài đặt ca · Lịch tháng', tab: 'hr', legacy: 'tab',
    desc: 'Đổi khung giờ ca làm thay đổi giờ công TOÀN BỘ lịch sử.' },
  { id: 'hr.recruit', group: 'hr', label: 'Tuyển dụng · nhu cầu vị trí', tab: 'hr', legacy: 'tab' },
  { id: 'hr.ot.create', group: 'hr', label: 'Tạo đơn tăng ca', tab: 'hr', legacy: 'tab' },
  { id: 'hr.leave.create', group: 'hr', label: 'Tạo đơn nghỉ phép', tab: 'hr', legacy: 'tab' },

  // ── Hệ thống ──
  { id: 'sys.users', group: 'sys', label: 'Người dùng & phân quyền', tab: 'dashboard', legacy: 'admin' },
  { id: 'sys.settings', group: 'sys', label: 'Cài đặt hệ thống (panel này)', tab: 'dashboard', legacy: 'admin' },
  { id: 'sys.backup', group: 'sys', label: 'Sao lưu / phục hồi / nạp JSON', tab: 'dashboard', legacy: 'admin' },
  { id: 'sys.cloud', group: 'sys', label: 'Đẩy / tải mây · đồng bộ ảnh', tab: 'dashboard', legacy: 'admin' },
  { id: 'sys.history', group: 'sys', label: 'Lịch sử sửa đổi', tab: 'dashboard', legacy: 'admin' },
  { id: 'sys.bulk', group: 'sys', label: 'Xoá hàng loạt / rà soát dữ liệu', tab: 'dashboard', legacy: 'admin' },
  { id: 'sys.rates', group: 'sys', label: 'Sửa mọi loại định mức', tab: 'dashboard', legacy: 'admin' }
];
export const PERM_AREA_IDS = PERM_AREAS.map(a => a.id);
export const permAreaDef = id => PERM_AREAS.find(a => a.id === id) || null;

// ─── ÁNH XẠ NGỮ CẢNH → VÙNG QUYỀN ───────────────────────────
// Dùng cho cổng requireEditPermission(): biết người dùng đang thao tác ở VÙNG
// nào (thẻ công đoạn đang mở / tab mặc định) để kiểm đúng quyền, KHÔNG phải
// sửa 142 chỗ gọi cổng cũ.
export const AREA_BY_CARD = {
  'x2-cut-card': 'x2.prod',
  'x2-bo-luong-card': 'x2.prod',
  'x2-bo-ong-card': 'x2.prod',
  'x2-bao-tho-card': 'x2.prod',
  'x2-chon-nan-tho-card': 'x2.prod',
  'x2-bao-tinh-card': 'x2.prod',
  'x2-bullig-card': 'x2.prod',
  'x2-cat-van-card': 'x2.prod',
  'x2-bao-van-card': 'x2.prod',
  'x2-ho-tro-card': 'x2.prod',
  'x2-phu-pham-card': 'x2.phupham',
  'x2-than-hoa-card': 'x2.say',
  'x2-kho-card': 'x2.kho.note',
  'x2-ep-van-card': 'x2.epvan',
  'x1-cat-ong-card': 'x1.prod',
  'x1-say-sinh-card': 'x1.prod',
  'x1-boc-card': 'x1.prod',
  'x1-loc-ong-card': 'x1.prod',
  'x1-cat-mat-card': 'x1.prod',
  'x1-bo-card': 'x1.prod',
  'x1-phoi-say-card': 'x1.phoisay',
  'x1-loc-thanh-card': 'x1.prod'
};
// Modal đang MỞ (class .show) → vùng quyền tương ứng. Kiểm tại thời điểm gọi
// nên KHÔNG cần dọn trạng thái khi đóng modal.
export const AREA_BY_MODAL = {
  'modal-add-lot': 'x2.say',
  'modal-transfer-kho': 'x2.say',
  'modal-batch-form': 'x2.say',
  'modal-material-rate': 'plan.rates',
  'modal-planning-item': 'plan.items',
  'modal-planning-edit': 'plan.items',
  'modal-press-record': 'x2.epvan',
  'modal-press-note': 'x2.epvan',
  'modal-qc-export': 'qc.entry',
  'modal-employee': 'hr.emp',
  'modal-employee-import': 'hr.emp',
  'modal-leave': 'hr.leave.create',
  'modal-overtime': 'hr.ot.create',
  'modal-recruitment': 'hr.recruit',
  'modal-board-assign': 'hr.board',
  'modal-shift': 'hr.calendar',
  'modal-hr-calendar': 'hr.calendar',
  'modal-position-need': 'hr.recruit',
  'modal-position': 'hr.recruit',
  'modal-checkin-import': 'hr.machine',
  'modal-ci-endfill': 'hr.machine',
  'modal-ci-bulk': 'hr.machine',
  'modal-ci-pay': 'ap.pay',
  'modal-pay-lock': 'ap.pay',
  'modal-material': 'mat.entry',
  'modal-supplier': 'mat.supplier',
  'modal-material-photo': 'mat.entry',
  'modal-export-x2': 'x2.prod',
  'modal-autobackup': 'sys.backup',
  'modal-cloud-backup': 'sys.backup',
  'modal-save-local': 'sys.backup',
  'modal-history': 'sys.history',
  'modal-chart-builder': 'plan.items',
  'modal-rate-center': 'sys.rates',
  'modal-x2-say-rate': 'sys.rates',
  'modal-x2-btinh-rate': 'sys.rates',
  'modal-qcf-rate': 'sys.rates',
  'modal-x2-blg-rate': 'sys.rates',
  'modal-x2-cut-rate': 'sys.rates',
  'modal-x1-rate': 'sys.rates',
  'modal-x2-ong-rate': 'sys.rates',
  'modal-x2-bt-rate': 'sys.rates',
  'modal-x2-cn-rate': 'sys.rates',
  'modal-x2-epv-rate': 'sys.rates',
  'modal-x2-bl-rate': 'sys.rates',
  'modal-x2-cv-rate': 'sys.rates',
  'modal-x2-bv-rate': 'sys.rates'
};

// Tab → vùng mặc định khi không biết chính xác thẻ/modal đang mở
export const AREA_BY_TAB = {
  kanban: 'x2.prod',
  x1: 'x1.prod',
  x2: 'x2.prod',
  press: 'x2.epvan',
  materials: 'mat.entry',
  qc: 'qc.entry',
  planning: 'plan.items',
  hr: 'hr.emp',
  dashboard: 'plan.items'
};


// ─── STATE ───────────────────────────────────────────────────
function settings() {
  if (!state.sysSettings || typeof state.sysSettings !== 'object') {
    state.sysSettings = { v: 1, flags: {}, perms: {}, audit: [] };
  }
  const s = state.sysSettings;
  if (!s.flags || typeof s.flags !== 'object') s.flags = {};
  if (!s.perms || typeof s.perms !== 'object') s.perms = {};
  if (!Array.isArray(s.audit)) s.audit = [];
  if (!s.v) s.v = 1;
  return s;
}
export function sysSettingsState() { return settings(); }

// ─── VAI TRÒ ─────────────────────────────────────────────────
function currentRole() { return (state.currentUser && state.currentUser.role) || 'viewer'; }
const ROLES_FOR_SETTINGS = ['manager', 'editor', 'viewer'];

// Tab được sửa của user hiện tại (bản rút gọn permissions.getEditableTabs —
// KHÔNG import permissions để tránh vòng import). null = toàn quyền (admin).
function userEditTabs() {
  const u = state.currentUser;
  if (!u) return [];
  if (u.role === 'admin') return null;
  let tabs = Array.isArray(u.editTabs) ? u.editTabs.slice() : [];
  if (tabs.includes('kanban') && !tabs.includes('x1') && !tabs.includes('x2')) {
    tabs = tabs.concat(['x1', 'x2']);
  }
  return tabs;
}

// ─── ① CỜ HIỂN THỊ — đọc / ghi ───────────────────────────────
export function flagRoles(id) {
  const def = flagDef(id);
  const base = Object.assign({ admin: true, manager: true, editor: true, viewer: true },
    def ? def.roles : {});
  const saved = settings().flags[id];
  if (saved && saved.roles && typeof saved.roles === 'object') {
    ['admin', 'manager', 'editor', 'viewer'].forEach(r => {
      if (typeof saved.roles[r] === 'boolean') base[r] = saved.roles[r];
    });
  }
  return base;
}

// Cờ có đang BẬT với người dùng hiện tại? (Admin luôn thấy để còn quản trị)
export function flagOn(id) {
  const roles = flagRoles(id);
  const role = currentRole();
  if (role === 'admin') return roles.admin !== false;
  return roles[role] !== false;
}

export function setFlagRole(id, role, on) {
  const s = settings();
  if (!s.flags[id]) s.flags[id] = { roles: {} };
  if (!s.flags[id].roles) s.flags[id].roles = {};
  s.flags[id].roles[role] = !!on;
}

export function setFlagRoles(id, roles) {
  Object.keys(roles || {}).forEach(r => setFlagRole(id, r, roles[r]));
}

// ─── ② QUYỀN THEO VÙNG — mức hiệu lực ────────────────────────
function legacyLevel(area, role) {
  const def = permAreaDef(area);
  if (!def) return 'view';
  if (role === 'admin') return 'approve';
  if (def.legacy === 'approve') return role === 'manager' ? 'approve' : 'none';
  if (def.legacy === 'admin') return 'none';
  if (def.legacy === 'payApply') {
    const u = state.currentUser;
    return (u && u.payApply === true) ? 'edit' : 'none';
  }
  if (def.legacy === 'payLock') {
    const u = state.currentUser;
    return (u && u.payLock === true) ? 'approve' : 'none';
  }
  // 'tab' = theo tab được cấp (giữ đúng hành vi cũ)
  const tabs = userEditTabs();
  if (tabs === null) return 'approve';
  if (role === 'viewer') return 'view';
  if (role === 'manager' || role === 'editor') return tabs.includes(def.tab) ? 'edit' : 'view';
  return 'view';
}

// Mức quyền của 1 VAI TRÒ với 1 vùng (Admin luôn approve — không cho hạ)
export function roleLevel(area, role) {
  if (role === 'admin') return 'approve';
  const saved = settings().perms[area];
  const raw = saved && saved[role];
  if (PERM_LEVELS.includes(raw)) return raw;
  return legacyLevel(area, role);
}

// Mức quyền hiệu lực của NGƯỜI DÙNG hiện tại
export function levelOf(area) {
  const user = state.currentUser;
  const role = (user && user.role) || 'viewer';
  if (role === 'admin') return 'approve';
  let lv = roleLevel(area, role);
  // Quyền riêng chỉ có thể THU HẸP (không mở rộng)
  const def = permAreaDef(area);
  if (def && def.legacy === 'payApply' && user && user.payApply !== true) {
    if (LEVEL_RANK[lv] > LEVEL_RANK.view) lv = 'view';
  }
  return lv;
}

export function canLevel(area, need) {
  return LEVEL_RANK[levelOf(area)] >= LEVEL_RANK[need || 'view'];
}

export function setPermLevel(area, role, level) {
  if (role === 'admin') return false;              // khoá cột Admin
  if (!permAreaDef(area)) return false;
  if (!PERM_LEVELS.includes(level)) return false;
  const s = settings();
  if (!s.perms[area]) s.perms[area] = {};
  s.perms[area][role] = level;
  return true;
}

// Mức đã LƯU TAY của 1 vai trò ('' = chưa đặt → UI hiện "Theo tab")
export function savedPermLevel(area, role) {
  const saved = settings().perms[area];
  return (saved && PERM_LEVELS.includes(saved[role])) ? saved[role] : '';
}

// Vùng đã được cấu hình tay chưa (UI hiện "Theo tab" ⇄ "Đã đặt")
export function areaConfigured(area) {
  const saved = settings().perms[area];
  return !!(saved && ROLES_FOR_SETTINGS.some(r => PERM_LEVELS.includes(saved[r])));
}

// ─── ÁP DỤNG LÊN <body> (CSS ẩn/hiện dùng các dataset này) ───
export function applySysSettings() {
  if (typeof document === 'undefined' || !document.body) return null;
  const body = document.body;
  const on = UI_FLAGS.filter(f => flagOn(f.id)).map(f => f.id);
  body.dataset.on = on.join(' ');
  const edit = [], approve = [], view = [];
  PERM_AREAS.forEach(a => {
    const lv = levelOf(a.id);
    if (lv === 'none') return;
    view.push(a.id);
    if (lv === 'edit' || lv === 'approve') edit.push(a.id);
    if (lv === 'approve') approve.push(a.id);
  });
  body.dataset.areaEdit = edit.join(' ');
  body.dataset.areaApprove = approve.join(' ');
  body.dataset.areaView = view.join(' ');
  // Ẩn nút theo vùng (nút nào có data-perm) — chạy kèm mỗi lần áp cài đặt
  applySysAreaDom();
  return { on: body.dataset.on, edit: body.dataset.areaEdit, approve: body.dataset.areaApprove };
}

export function mergeSysSettings(local, remote) {
  const a = normalizeSysSettings(local);
  const b = normalizeSysSettings(remote);
  // Bản nào LƯU SAU thì thắng; bằng nhau → giữ bản đang có (local)
  return Number(b.savedAt || 0) > Number(a.savedAt || 0) ? b : a;
}

// ─── NHẬT KÝ CÀI ĐẶT (ai · lúc nào · đổi gì) ─────────────────
export const SYS_AUDIT_LIMIT = 300;

export function pushAudit(what, from, to) {
  const s = settings();
  const u = state.currentUser || {};
  s.audit.unshift({
    at: new Date().toISOString(),
    by: u.username || 'system',
    name: u.fullname || u.username || 'Hệ thống',
    what: String(what || ''),
    from: from == null ? '' : String(from),
    to: to == null ? '' : String(to)
  });
  if (s.audit.length > SYS_AUDIT_LIMIT) s.audit.length = SYS_AUDIT_LIMIT;
}

// ─── LƯU (localStorage + lịch sử + đẩy mây) ──────────────────
// KHÔNG import storage/cloud/history trực tiếp (vòng import) → import động.
export function saveSysSettings() {
  settings();
  state.sysSettings.savedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY_SYS_SETTINGS, JSON.stringify(state.sysSettings));
  } catch (e) { /* bỏ qua khi không có localStorage */ }
  applySysSettings();
  import('./history.js')
    .then(m => { if (typeof m.logDataChange === 'function') m.logDataChange(['sysSettings']); })
    .catch(() => {});
  import('./cloud.js')
    .then(m => { if (typeof m.firePushSync === 'function') m.firePushSync(); })
    .catch(() => {});
}

// ─── CHUẨN HOÁ + NẠP ─────────────────────────────────────────
export function normalizeSysSettings(raw) {
  const out = { v: 1, savedAt: 0, flags: {}, perms: {}, audit: [] };
  if (!raw || typeof raw !== 'object') return out;
  out.savedAt = Number(raw.savedAt) || 0;
  if (raw.flags && typeof raw.flags === 'object') {
    UI_FLAGS.forEach(f => {
      const v = raw.flags[f.id];
      if (!v || typeof v !== 'object') return;
      const roles = {};
      ['admin', 'manager', 'editor', 'viewer'].forEach(r => {
        if (v.roles && typeof v.roles[r] === 'boolean') roles[r] = v.roles[r];
      });
      out.flags[f.id] = { roles };
    });
  }
  if (raw.perms && typeof raw.perms === 'object') {
    PERM_AREAS.forEach(a => {
      const v = raw.perms[a.id];
      if (!v || typeof v !== 'object') return;
      const row = {};
      ROLES_FOR_SETTINGS.forEach(r => {
        if (PERM_LEVELS.includes(v[r])) row[r] = v[r];
      });
      if (Object.keys(row).length) out.perms[a.id] = row;
    });
  }
  if (Array.isArray(raw.audit)) {
    out.audit = raw.audit.filter(x => x && x.at).slice(0, SYS_AUDIT_LIMIT);
  }
  return out;
}

// Nạp từ localStorage lúc boot — GỘP với cấu hình đang có (mây vừa nhận thắng)
export function loadSysSettings() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY_SYS_SETTINGS) || 'null');
  } catch (e) { raw = null; }
  const cur = normalizeSysSettings(state.sysSettings);
  if (raw) {
    const disk = normalizeSysSettings(raw);
    state.sysSettings = normalizeSysSettings({
      savedAt: Math.max(Number(cur.savedAt) || 0, Number(disk.savedAt) || 0),
      flags: Object.assign({}, disk.flags, cur.flags),
      perms: Object.assign({}, disk.perms, cur.perms),
      audit: (cur.audit.length ? cur.audit : disk.audit).slice(0, SYS_AUDIT_LIMIT)
    });
  } else {
    state.sysSettings = cur;
  }
  applySysSettings();
  return state.sysSettings;
}

// ─── KHÔI PHỤC MẶC ĐỊNH ─────────────────────────────────────
export function resetSysSettings() {
  state.sysSettings = { v: 1, flags: {}, perms: {}, audit: [] };
  pushAudit('Khôi phục mặc định', 'đã cấu hình', 'mặc định');
  saveSysSettings();
  return state.sysSettings;
}

// ─── XUẤT CẤU HÌNH (JSON để sao lưu) ────────────────────────
export function sysSettingsExport() {
  const s = settings();
  return JSON.stringify({ v: s.v, flags: s.flags, perms: s.perms }, null, 2);
}

export function levelLabel(level) { return PERM_LEVEL_LABEL[level] || level; }

// ─── ẨN NÚT THEO VÙNG (tự động, không phải gắn data-area-perm từng nút) ──
// Quét mọi nút đang có `data-perm` (cơ chế phân quyền theo TAB cũ), xác định
// VÙNG của nút qua: thẻ công đoạn đang chứa nó → modal → tab đang xem, rồi
// gắn class `area-denied` nếu vai trò hiện tại KHÔNG có mức "edit" ở vùng đó.
// Nhờ vậy chỉ cần 1 hàm dùng chung cho cả nút tĩnh trong index.html lẫn nút
// do JS render (gọi lại sau mỗi lần vẽ).
export function applySysAreaDom(root) {
  if (typeof document === 'undefined' || !document.querySelectorAll) return 0;
  const scope = root && root.querySelectorAll ? root : document;
  const viewTab = { 'kanban-view': 'kanban', 'planning-view': 'planning', 'materials-view': 'materials', 'qc-view': 'qc', 'hr-view': 'hr' };
  let hidden = 0;
  const nodes = scope.querySelectorAll('[data-perm]');
  nodes.forEach(el => {
    let area = '';
    const card = el.closest ? el.closest('.planning-card[id]') : null;
    if (card && card.id && AREA_BY_CARD[card.id]) area = AREA_BY_CARD[card.id];
    if (!area) {
      const ov = el.closest ? el.closest('.modal-overlay[id]') : null;
      if (ov && ov.id && AREA_BY_MODAL[ov.id]) area = AREA_BY_MODAL[ov.id];
    }
    if (!area) {
      const view = el.closest ? el.closest('.view-panel[id]') : null;
      if (view && view.id && viewTab[view.id]) area = AREA_BY_TAB[viewTab[view.id]] || '';
    }
    if (!area) {
      // Thẻ trong pop-up đã bị chuyển DOM sang overlay → dùng thẻ đang mở
      const openId = state.x2OpenCardId;
      if (openId && AREA_BY_CARD[openId]) area = AREA_BY_CARD[openId];
    }
    const deny = !!area && !canLevel(area, 'edit');
    if (el.classList) {
      if (deny) { el.classList.add('area-denied'); hidden++; }
      else el.classList.remove('area-denied');
    }
  });
  return hidden;
}



