// ═══════════════════════════════════════════════════════════
// js/theme.js — GIAO DIỆN ĐÃ KHÓA CỨNG (MỘT giao diện duy nhất)
// ───────────────────────────────────────────────────────────
// Từ 28/09/2026: BỎ hẳn việc chọn Sáng/Đêm Kính/Auto — mọi máy, mọi người
// dùng đều dùng giao diện hiện tại ('night' — nền kem "Tre Sáng"). Các lựa
// chọn cũ đang lưu trong máy (light/auto) TỰ CHUYỂN về giao diện hiện tại.
// Theme chỉ là LỚP TRÌNH BÀY: đặt data-theme/data-fx trên <body>, toàn bộ
// "da" nằm trong styles.css (khối THEME TRE SÁNG). Không đụng dữ liệu.
// Vẫn giữ khung máy để sau này muốn mở lại nhiều giao diện chỉ cần sửa đây.
//   · theo MÁY: bamboo_tracker_ui_theme_v1 (cũ light/auto → hiểu là night)
//   · theo NGƯỜI DÙNG: bamboo_tracker_ui_theme_users_v1 — pref khác night bị bỏ qua
// "Giảm hiệu ứng" riêng: bamboo_tracker_ui_fx_v1 — tắt kính/animation.
// ═══════════════════════════════════════════════════════════
import { state } from './state.js';

const THEME_KEY = 'bamboo_tracker_ui_theme_v1';
const THEME_USERS_KEY = 'bamboo_tracker_ui_theme_users_v1';
const FX_KEY = 'bamboo_tracker_ui_fx_v1';
// KHÓA CỨNG: chỉ còn MỘT giao diện — mọi giá trị cũ (light/auto) không hợp lệ
// nữa nên getThemeChoice() tự trả về giao diện hiện tại.
const THEMES = ['night'];
const THEME_DEFAULT = 'night';

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

// Lựa chọn đã lưu — giá trị cũ (light/auto/garbage) tự về giao diện hiện tại
export function getThemeChoice() {
  const v = lsGet(THEME_KEY);
  return THEMES.includes(v) ? v : THEME_DEFAULT;
}
export function getFxLow() { return lsGet(FX_KEY) === 'low'; }

// Giao diện đã khóa cứng: mọi lựa chọn đều giải quyết ra giao diện hiện tại
export function resolvedThemeOf() {
  return THEME_DEFAULT;
}

// Áp theme đã giải quyết lên <body> + mặc định trục/lưới Chart.js theo theme
export function applyTheme() {
  const resolved = resolvedThemeOf(getThemeChoice());
  try {
    document.body.setAttribute('data-theme', 'night');
    document.body.setAttribute('data-fx', getFxLow() ? 'low' : 'normal');
  } catch (e) { /* DOM stub / môi trường hạn chế — bỏ qua */ }
  // Biểu đồ Chart.js: màu chữ trục + nét lưới theo nền kem sáng của "Tre Sáng"
  // (dataset giữ nguyên bộ màu chuẩn hóa của dự án — đã kiểm không vi phạm quy tắc green/blue)
  if (typeof window !== 'undefined' && window.Chart && window.Chart.defaults) {
    window.Chart.defaults.color = '#3a4535'; // chữ trục + legend TỐI, dễ đọc trên nền kem sáng
    window.Chart.defaults.borderColor = 'rgba(90, 110, 70, 0.25)'; // lưới xanh rêu mờ
  }
  return resolved;
}

// Ghi lại giao diện người đang đăng nhập vào bản đồ người dùng
// (giữ nguyên khung để sau này mở lại nhiều giao diện — hiện chỉ ghi 'night')
export function noteUserTheme() {
  const u = state.currentUser;
  if (!u || !u.username) return;
  let map = {};
  try { map = JSON.parse(lsGet(THEME_USERS_KEY) || '{}'); } catch (e) {}
  map[u.username] = getThemeChoice();
  lsSet(THEME_USERS_KEY, JSON.stringify(map));
}
// Đăng nhập người khác → áp giao diện người đó đã chọn (nếu có trong bản đồ);
// sở thích cũ khác giao diện hiện tại (light/auto) bị BỎ QUA — không áp nữa
export function applyThemeForUser(username) {
  let map = {};
  try { map = JSON.parse(lsGet(THEME_USERS_KEY) || '{}'); } catch (e) {}
  const pref = map[String(username || '')];
  if (pref && THEMES.includes(pref) && pref !== getThemeChoice()) lsSet(THEME_KEY, pref);
  applyTheme();
  return !!pref;
}
// Khởi động (gọi 1 lần trong boot SAU loadSession — để biết ai đang đăng nhập)
export function initTheme() {
  const u = state.currentUser;
  if (u && u.username) {
    let map = {};
    try { map = JSON.parse(lsGet(THEME_USERS_KEY) || '{}'); } catch (e) {}
    const pref = map[u.username];
    if (pref && THEMES.includes(pref) && pref !== getThemeChoice()) lsSet(THEME_KEY, pref);
  }
  return applyTheme();
}
// Công tắc "Giảm hiệu ứng" (máy yếu): tắt kính/animation, giữ nguyên giao diện
export function setFxLow(on) {
  lsSet(FX_KEY, on ? 'low' : 'normal');
  applyTheme();
}
