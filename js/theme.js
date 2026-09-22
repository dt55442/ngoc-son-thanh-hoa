// ═══════════════════════════════════════════════════════════
// js/theme.js — BỘ CHỌN GIAO DIỆN (Sáng / Đêm Kính Sci-Fi)
// ───────────────────────────────────────────────────────────
// 3 lựa chọn: 'light' (mặc định xưởng) | 'night' (Sci-Fi HUD) | 'auto'
// (theo sáng/tối của hệ điều hành). Theme chỉ là LỚP TRÌNH BÀY: đặt
// data-theme/data-fx trên <body>, toàn bộ "da" nằm trong styles.css
// (khối THEME ĐÊM KÍNH). Không đụng dữ liệu, không đụng logic.
// Lưu 2 lớp (đúng như đã bàn):
//   · theo MÁY: bamboo_tracker_ui_theme_v1 — mỗi máy nhớ riêng (offline)
//   · theo NGƯỜI DÙNG: bamboo_tracker_ui_theme_users_v1 — bản đồ
//     username → theme, chia sẻ máy ai đăng nhập là áp giao diện người đó
// "Giảm hiệu ứng" riêng: bamboo_tracker_ui_fx_v1 — tắt kính/animation.
// ═══════════════════════════════════════════════════════════
import { state } from './state.js';

const THEME_KEY = 'bamboo_tracker_ui_theme_v1';
const THEME_USERS_KEY = 'bamboo_tracker_ui_theme_users_v1';
const FX_KEY = 'bamboo_tracker_ui_fx_v1';
const THEMES = ['light', 'night', 'auto'];

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

// Lựa chọn thô đã lưu (chưa giải quyết 'auto')
export function getThemeChoice() {
  const v = lsGet(THEME_KEY);
  return THEMES.includes(v) ? v : 'auto';
}
export function getFxLow() { return lsGet(FX_KEY) === 'low'; }

// 'auto' → soi `prefers-color-scheme` của máy quyết định sáng/tối
export function resolvedThemeOf(choice) {
  if (choice === 'night') return 'night';
  if (choice === 'auto') {
    try {
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'night';
    } catch (e) { /* môi trường không hỗ trợ — coi như sáng */ }
    return 'light';
  }
  return 'light';
}

// Áp theme đã giải quyết lên <body> + mặc định trục/lưới Chart.js theo theme
export function applyTheme() {
  const resolved = resolvedThemeOf(getThemeChoice());
  try {
    if (resolved === 'night') document.body.setAttribute('data-theme', 'night');
    else document.body.removeAttribute('data-theme');
    document.body.setAttribute('data-fx', getFxLow() ? 'low' : 'normal');
  } catch (e) { /* DOM stub / môi trường hạn chế — bỏ qua */ }
  // Biểu đồ Chart.js: màu chữ trục + nét lưới đổi theo nền (dataset giữ nguyên
  // bộ màu chuẩn hóa của dự án — đã kiểm không vi phạm quy tắc green/blue)
  if (typeof window !== 'undefined' && window.Chart && window.Chart.defaults) {
    if (resolved === 'night') {
      window.Chart.defaults.color = '#3a4535'; // chữ trục + legend TỐI, dễ đọc trên nền kem sáng
      window.Chart.defaults.borderColor = 'rgba(90, 110, 70, 0.25)'; // lưới xanh rêu mờ
    } else {
      window.Chart.defaults.color = '#666666';
      window.Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
    }
  }
  return resolved;
}

// Ghi lựa chọn: theo máy + (nếu có người đăng nhập) ghi chú cho người đó
export function setTheme(choice) {
  if (!THEMES.includes(choice)) return resolvedThemeOf(getThemeChoice());
  lsSet(THEME_KEY, choice);
  noteUserTheme();
  applyTheme();
  return resolvedThemeOf(choice);
}
// Ghi lại giao diện người đang đăng nhập vào bản đồ người dùng
export function noteUserTheme() {
  const u = state.currentUser;
  if (!u || !u.username) return;
  let map = {};
  try { map = JSON.parse(lsGet(THEME_USERS_KEY) || '{}'); } catch (e) {}
  map[u.username] = getThemeChoice();
  lsSet(THEME_USERS_KEY, JSON.stringify(map));
}
// Đăng nhập người khác → áp giao diện người đó đã chọn (nếu có trong bản đồ);
// không có sở thích riêng thì giữ giao diện hiện tại của máy
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
// Công tắc "Giảm hiệu ứng" (máy yếu): tắt kính mờ + animation, giữ màu theme
export function setFxLow(on) {
  lsSet(FX_KEY, on ? 'low' : 'normal');
  applyTheme();
}
// Đổi nhanh 1 phát (nút header): sáng ↔ tối, rồi trả về giao diện hiện tại
export function toggleThemeQuick() {
  const cur = resolvedThemeOf(getThemeChoice());
  setTheme(cur === 'night' ? 'light' : 'night');
  return resolvedThemeOf(getThemeChoice());
}
