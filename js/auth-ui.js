// ═══════════════════════════════════════════════════════════
// js/auth-ui.js — TRẠNG THÁI CHỜ + BẢNG LỖI ĐĂNG NHẬP (P3 — 20/10/2026)
// ───────────────────────────────────────────────────────────
// Module KHÔNG import gì (giống js/loading.js) để js/auth.js và js/cloud.js
// dùng chung mà KHÔNG vòng import.
//
// VÌ SAO CẦN: trước đây bấm "Đăng Nhập" chỉ gọi signInWithEmailAndPassword()
// với .catch() — không có loading, không khoá nút ⇒ người dùng bấm nhiều lần,
// Firebase rate-limit (auth/too-many-requests) và cảm giác bị treo (sau khi
// Firebase trả về còn phải đọc settings/roles + renderAll vài trăm ms).
//
// HỢP ĐỒNG DOM (index.html):
//   · form đăng nhập    : [data-auth-form="login"] + nút .js-auth-submit
//   · form quên mật khẩu: [data-auth-form="reset"] + nút .js-auth-submit
//   · #auth-busy-bar    : thanh tiến trình vô định
//   · #auth-status      : dòng trạng thái (role="status" aria-live="polite")
//
// QUY TẮC KHI SỬA TIẾP:
//   1. Mọi submit liên quan xác thực PHẢI qua setAuthBusy() để chặn bấm lặp.
//   2. Lỗi Firebase PHẢI dịch qua authErrorText() (không hiện chuỗi tiếng Anh).
//   3. Timeout AUTH_TIMING.timeout tự nhả khoá — không bao giờ treo vĩnh viễn.
// ═══════════════════════════════════════════════════════════

// Thời gian tối đa giữ trạng thái chờ (ms) — export mutable để test thu nhỏ
const AUTH_TIMING = { timeout: 25000 };

const AUTH_STATUS_ID = 'auth-status';
const AUTH_BAR_ID = 'auth-busy-bar';
const AUTH_FORM_ATTR = 'data-auth-form';

// ─── BẢNG LỖI FIREBASE AUTH → TIẾNG VIỆT CÓ DẤU ──────────────
// Bổ sung khi gặp mã mới. Câu chữ nêu RÕ cách khắc phục cho người dùng.
const AUTH_ERROR_MAP = {
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
  'auth/wrong-password': 'Mật khẩu không đúng.',
  'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
  'auth/invalid-email': 'Email không hợp lệ.',
  'auth/missing-email': 'Vui lòng nhập email.',
  'auth/user-disabled': 'Tài khoản này đã bị khoá. Vui lòng liên hệ Quản trị viên.',
  'auth/too-many-requests': 'Bạn thao tác quá nhiều lần. Vui lòng chờ vài phút rồi thử lại.',
  'auth/network-request-failed': 'Mất kết nối mạng. Kiểm tra Wi-Fi/4G rồi thử lại.',
  'auth/operation-not-allowed': 'Firebase chưa bật phương thức đăng nhập Email/Mật khẩu. Quản trị vào Firebase Console → Authentication → Sign-in method → bật Email/Password.',
  'auth/admin-restricted-operation': 'Firebase đang TẮT chức năng tạo tài khoản hoặc đặt lại mật khẩu qua ứng dụng. Quản trị vào Firebase Console → Authentication → Settings → User actions → bật "Create (sign-up)" và "Password reset".',
  'auth/unauthorized-domain': 'Tên miền này chưa được cho phép trong Firebase (Authentication → Settings → Authorized domains).',
  'auth/email-already-in-use': 'Email này đã có tài khoản đăng nhập. Hãy đăng nhập hoặc dùng "Quên mật khẩu".',
  'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự).',
  'auth/requires-recent-login': 'Phiên đăng nhập đã cũ vì lý do bảo mật. Vui lòng đăng xuất rồi đăng nhập lại.',
  'auth/internal-error': 'Máy chủ xác thực gặp lỗi tạm thời. Vui lòng thử lại sau ít phút.',
  'auth/invalid-api-key': 'Cấu hình Firebase không hợp lệ (apiKey). Liên hệ Quản trị viên.',
  'auth/app-deleted': 'Ứng dụng Firebase đã bị xoá. Liên hệ Quản trị viên.',
  'auth/quota-exceeded': 'Đã vượt hạn mức gửi email của Firebase hôm nay. Vui lòng thử lại sau.'
};

let authBusyKind = '';        // '' = rảnh | 'login' | 'reset'
let authBusyAt = 0;           // thời điểm bắt đầu chờ
let authTimer = 0;            // timer timeout
let authBusyForm = null;      // form đang khoá (để gỡ aria-busy)
let authBtnRestore = null;    // { el, html } khôi phục nút submit
let authDisabled = [];        // [{ el, was }] khôi phục trạng thái disabled

// setTimeout có unref() trong Node → test headless không bị giữ sống
function authLater(fn, ms) {
  const t = setTimeout(fn, ms);
  if (t && typeof t.unref === 'function') t.unref();
  return t;
}

function authEl(id) {
  try { return document.getElementById(id); } catch (e) { return null; }
}

function authFormOf(kind) {
  try { return document.querySelector('[' + AUTH_FORM_ATTR + '="' + (kind || 'login') + '"]'); } catch (e) { return null; }
}

// Ẩn/hiện chắc chắn: đặt CẢ thuộc tính hidden LẪN inline display
// (vì .login-form-body có display:flex — thuộc tính hidden của UA bị đè)
function authSetHidden(el, hidden) {
  if (!el) return;
  try { el.hidden = !!hidden; } catch (e) { /* stub DOM */ }
  try { if (el.style) el.style.display = hidden ? 'none' : ''; } catch (e) { /* bỏ qua */ }
}

function authClearTimer() {
  if (authTimer) { clearTimeout(authTimer); authTimer = 0; }
}

function authSetStatus(text) {
  const st = authEl(AUTH_STATUS_ID);
  if (!st) return;
  try { st.textContent = text || ''; } catch (e) { /* bỏ qua */ }
  authSetHidden(st, !text);
}

// Khôi phục toàn bộ DOM về trạng thái bình thường
function authRestore() {
  authClearTimer();
  if (authBtnRestore && authBtnRestore.el) {
    try { authBtnRestore.el.innerHTML = authBtnRestore.html; } catch (e) { /* bỏ qua */ }
    try { authBtnRestore.el.removeAttribute('aria-busy'); } catch (e) { /* bỏ qua */ }
  }
  authBtnRestore = null;
  authDisabled.forEach(item => {
    try { item.el.disabled = item.was; } catch (e) { /* bỏ qua */ }
  });
  authDisabled = [];
  if (authBusyForm) {
    try { authBusyForm.removeAttribute('aria-busy'); } catch (e) { /* bỏ qua */ }
  }
  authBusyForm = null;
  authSetHidden(authEl(AUTH_BAR_ID), true);
  authSetStatus('');
  authBusyKind = '';
  authBusyAt = 0;
}

// Dịch mã lỗi Firebase → câu tiếng Việt. fallback dùng khi mã lạ.
function authErrorText(code, fallback) {
  const key = String(code || '').trim();
  if (key && AUTH_ERROR_MAP[key]) return AUTH_ERROR_MAP[key];
  return fallback || 'Thao tác không thành công. Vui lòng thử lại.';
}

function isAuthBusy(kind) {
  return !!authBusyKind && (!kind || authBusyKind === kind);
}

function authBusyLabelNow() {
  const st = authEl(AUTH_STATUS_ID);
  return st && typeof st.textContent === 'string' ? st.textContent : '';
}

// Bật/tắt trạng thái chờ cho 1 panel xác thực.
//   setAuthBusy('login', true, 'Đang đăng nhập…')  → khoá + spinner
//   setAuthBusy('login', false)                    → khôi phục
//   Trả về true nếu ĐÃ bật/tắt được (false khi đang bận việc khác).
function setAuthBusy(kind, on, label) {
  const k = kind || 'login';
  const want = on !== false;

  if (!want) {
    // Chỉ khôi phục ĐÚNG loại đang bận (tránh panel khác gỡ khoá hộ)
    if (!authBusyKind || authBusyKind !== k) return false;
    authRestore();
    return true;
  }

  if (authBusyKind) return false; // đã bận → KHÔNG chồng request

  authBusyKind = k;
  authBusyAt = Date.now();
  const txt = label || 'Đang xử lý…';

  // ① thanh tiến trình + dòng trạng thái
  authSetHidden(authEl(AUTH_BAR_ID), false);
  authSetStatus(txt);

  // ② nút submit: spinner + nhãn chờ (lưu HTML gốc để khôi phục)
  const form = authFormOf(k);
  authBusyForm = form;
  let btn = null;
  try { btn = form && form.querySelector ? form.querySelector('.js-auth-submit') : null; } catch (e) { btn = null; }
  if (btn) {
    authBtnRestore = { el: btn, html: btn.innerHTML || '' };
    let busyLabel = txt;
    try {
      const own = btn.getAttribute ? btn.getAttribute('data-busy-label') : '';
      if (own) busyLabel = own;
    } catch (e) { /* bỏ qua */ }
    try { btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> ' + busyLabel; } catch (e) { /* bỏ qua */ }
    try { btn.setAttribute('aria-busy', 'true'); } catch (e) { /* bỏ qua */ }
  }

  // ③ khoá mọi ô nhập / nút trong form (chống bấm nhiều lần ở tầng DOM)
  let nodes = [];
  try {
    const scope = form || (typeof document !== 'undefined' ? document : null);
    if (scope && scope.querySelectorAll) nodes = Array.from(scope.querySelectorAll('input, button, select, textarea'));
  } catch (e) { nodes = []; }
  authDisabled = [];
  nodes.forEach(el => {
    authDisabled.push({ el, was: !!el.disabled });
    try { el.disabled = true; } catch (e) { /* bỏ qua */ }
  });

  if (form) {
    try { form.setAttribute('aria-busy', 'true'); } catch (e) { /* bỏ qua */ }
  }

  // ④ Timeout: tự nhả khoá, báo trên dòng trạng thái (không treo vĩnh viễn)
  authClearTimer();
  authTimer = authLater(() => {
    authTimer = 0;
    const secs = Math.max(1, Math.round((Date.now() - authBusyAt) / 1000));
    authRestore();
    authSetStatus('Máy chủ phản hồi chậm sau ' + secs + ' giây. Vui lòng kiểm tra mạng rồi thử lại.');
  }, AUTH_TIMING.timeout);

  return true;
}

// Đổi nhãn giữa các bước (đăng nhập → xác minh quyền → tải dữ liệu)
function authMarkStep(label) {
  if (!authBusyKind) return false;
  authSetStatus(label || '');
  return true;
}

// cloud.js gọi khi đã xác thực xong (thành công hoặc lỗi) → nhả khoá
function authNotifySettled() {
  if (!authBusyKind) return false;
  authRestore();
  return true;
}

// Dọn thủ công (đăng xuất / đổi panel) — an toàn khi đang rảnh
function authReset() {
  if (!authBusyKind) { authSetHidden(authEl(AUTH_BAR_ID), true); authSetStatus(''); return; }
  authRestore();
}

export {
  AUTH_ERROR_MAP,
  AUTH_FORM_ATTR,
  AUTH_TIMING,
  authBusyLabelNow,
  authErrorText,
  authMarkStep,
  authNotifySettled,
  authReset,
  isAuthBusy,
  setAuthBusy
};

