// tests/auth-ui.test.mjs — ĐĂNG NHẬP: TRẠNG THÁI CHỜ + QUÊN MẬT KHẨU (P3 — 20/10/2026)
// Bao phủ: bảng dịch lỗi Firebase · chống bấm nhiều lần (setAuthBusy/isAuthBusy) ·
// khôi phục nút/ô nhập · timeout tự nhả khoá · cấu trúc 2 panel (login ⇄ reset,
// KHÔNG còn form đăng ký) · Admin tạo tài khoản bằng APP PHỤ · nối events/cloud/sw.
'use strict';
import fs from 'node:fs';

const rd = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ═══ A. STUB DOM TỐI THIỂU (chỉ đủ hợp đồng của js/auth-ui.js) ═══
function mkEl(id, tag) {
  const el = {
    id: id || '', tagName: (tag || 'div').toUpperCase(), className: '',
    hidden: false, disabled: false, value: '', type: 'text',
    textContent: '', innerHTML: '', style: {}, attrs: {}, children: [],
    addEventListener() {}, focus() { el.__focused = true; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(el.attrs, k) ? el.attrs[k] : null; },
    removeAttribute(k) { delete el.attrs[k]; },
    querySelector(sel) {
      if (sel === '.js-auth-submit') return el.children.find(c => String(c.className).includes('js-auth-submit')) || null;
      return null;
    },
    querySelectorAll() { return el.children.slice(); }
  };
  return el;
}
const bar = mkEl('auth-busy-bar');
const status = mkEl('auth-status', 'p');
const userInp = mkEl('login-username', 'input');
const passInp = mkEl('login-password', 'input');
passInp.type = 'password';
const loginBtn = mkEl('', 'button');
loginBtn.className = 'js-auth-submit';
loginBtn.attrs['data-busy-label'] = 'Đang đăng nhập…';
const loginForm = mkEl('login-form', 'form');
loginForm.children = [userInp, passInp, loginBtn];
const resetEmail = mkEl('reset-email', 'input');
const resetBtn = mkEl('', 'button');
resetBtn.className = 'js-auth-submit';
resetBtn.attrs['data-busy-label'] = 'Đang gửi email…';
const resetForm = mkEl('reset-form', 'form');
resetForm.children = [resetEmail, resetBtn];

const registry = new Map([
  ['auth-busy-bar', bar], ['auth-status', status],
  ['login-username', userInp], ['login-password', passInp],
  ['reset-email', resetEmail]
]);
global.document = {
  getElementById: (id) => registry.get(id) || null,
  querySelector: (sel) => {
    const m = /\[data-auth-form="(\w+)"\]/.exec(String(sel));
    if (m) return m[1] === 'reset' ? resetForm : loginForm;
    return null;
  }
};

const AU = await import('../js/auth-ui.js?t=' + Date.now());

// ═══ B. BẢNG DỊCH LỖI FIREBASE ═══════════════════════════════
console.log('--- B. BẢNG DỊCH LỖI ---');
check('B1: auth/admin-restricted-operation → chỉ rõ bật "Create (sign-up)" và "Password reset" trong Firebase Console',
  AU.authErrorText('auth/admin-restricted-operation').includes('Create (sign-up)') &&
  AU.authErrorText('auth/admin-restricted-operation').includes('Password reset'));
check('B2: auth/operation-not-allowed → hướng dẫn bật Email/Password',
  AU.authErrorText('auth/operation-not-allowed').includes('Email/Password'));
check('B3: các mã thường gặp có câu tiếng Việt có dấu',
  AU.authErrorText('auth/invalid-credential') === 'Email hoặc mật khẩu không đúng.' &&
  AU.authErrorText('auth/too-many-requests').includes('chờ vài phút') &&
  AU.authErrorText('auth/network-request-failed').includes('Mất kết nối mạng') &&
  AU.authErrorText('auth/unauthorized-domain').includes('Authorized domains') &&
  AU.authErrorText('auth/email-already-in-use').includes('Quên mật khẩu'));
check('B4: mã LẠ dùng fallback; không fallback thì câu mặc định tiếng Việt',
  AU.authErrorText('auth/la-hoac', 'Câu riêng') === 'Câu riêng' &&
  AU.authErrorText('auth/la-hoac') === 'Thao tác không thành công. Vui lòng thử lại.');
check('B5: AUTH_ERROR_MAP export để đối chiếu + module KHÔNG import gì',
  AU.AUTH_ERROR_MAP && Object.keys(AU.AUTH_ERROR_MAP).length >= 15 &&
  !/^\s*import\s/m.test(rd('js/auth-ui.js')));

// ═══ C. CHỐNG BẤM NHIỀU LẦN + KHÔI PHỤC ══════════════════════
console.log('--- C. CHỐNG BẤM NHIỀU LẦN ---');
const loginOrigHtml = loginBtn.innerHTML;
AU.setAuthBusy('login', true, 'Đang đăng nhập…');
check('C1: bật chờ → aria-busy trên form + thanh tiến trình hiện + dòng trạng thái đúng nhãn',
  loginForm.getAttribute('aria-busy') === 'true' && bar.hidden === false &&
  status.hidden === false && status.textContent === 'Đang đăng nhập…');
check('C2: khoá MỌI ô nhập + nút trong form (chống bấm lặp ở tầng DOM)',
  userInp.disabled === true && passInp.disabled === true && loginBtn.disabled === true);
check('C3: nút submit đổi thành spinner + nhãn data-busy-label',
  loginBtn.innerHTML.includes('btn-spinner') && loginBtn.innerHTML.includes('Đang đăng nhập…'));
check('C4: isAuthBusy đúng loại — login đang bận, reset rảnh',
  AU.isAuthBusy() === true && AU.isAuthBusy('login') === true && AU.isAuthBusy('reset') === false);
check('C5: bật chờ lần 2 bị TỪ CHỐI (không chồng request)',
  AU.setAuthBusy('login', true, 'Lần 2') === false && status.textContent === 'Đang đăng nhập…');
check('C6: authMarkStep đổi nhãn giữa các bước (xác minh quyền)',
  AU.authMarkStep('Đang xác minh quyền…') === true && status.textContent.includes('xác minh'));
check('C7: tắt sai loại (reset) KHÔNG gỡ khoá của login',
  AU.setAuthBusy('reset', false) === false && AU.isAuthBusy('login') === true);
AU.authNotifySettled();
check('C8: xác thực xong → khôi phục nút/ô nhập, ẩn thanh + dòng trạng thái, hết bận',
  AU.isAuthBusy() === false && userInp.disabled === false && passInp.disabled === false &&
  loginBtn.disabled === false && loginBtn.innerHTML === loginOrigHtml &&
  bar.hidden === true && status.hidden === true && status.textContent === '');
// Ô vốn đã disabled từ trước phải được trả lại ĐÚNG trạng thái cũ
userInp.disabled = true;
AU.setAuthBusy('login', true, 'Chờ…');
AU.authNotifySettled();
check('C9: khôi phục đúng trạng thái disabled TRƯỚC ĐÓ (không bật khoá hộ ô vốn bị khoá)',
  userInp.disabled === true);
userInp.disabled = false;

// ═══ D. TIMEOUT TỰ NHẢ KHOÁ ═══════════════════════════════════
console.log('--- D. TIMEOUT ---');
const saveTimeout = AU.AUTH_TIMING.timeout;
AU.AUTH_TIMING.timeout = 20;
AU.setAuthBusy('reset', true, 'Đang gửi…');
await sleep(70);
check('D1: quá hạn → tự nhả khoá (không treo vĩnh viễn)',
  AU.isAuthBusy() === false && resetBtn.disabled === false);
check('D2: báo trên dòng trạng thái, KHÔNG im lặng',
  status.hidden === false && status.textContent.includes('chậm') && status.textContent.includes('thử lại'));
AU.AUTH_TIMING.timeout = saveTimeout;


// ═══ E. CẤU TRÚC 2 PANEL ══════════════════════════════════════
console.log('--- E. CẤU TRÚC (index.html) ---');
const idx = rd('index.html');
check('E1: form đăng nhập có data-auth-form="login" + nút .js-auth-submit + data-busy-label',
  idx.includes('id="login-form"') && idx.includes('data-auth-form="login"') &&
  idx.includes('js-auth-submit') && idx.includes('data-busy-label="Đang đăng nhập…"'));
check('E2: panel Quên mật khẩu có data-auth-form="reset" + ô email + nút quay lại',
  idx.includes('id="reset-form"') && idx.includes('data-auth-form="reset"') &&
  idx.includes('id="reset-email"') && idx.includes('id="btn-back-login"'));
check('E3: ĐÃ XOÁ HẲN form đăng ký + nút đăng ký (P3)',
  !idx.includes('id="register-form"') && !idx.includes('id="btn-toggle-register"') &&
  !idx.includes('id="reg-email"'));
check('E4: có thanh chờ + dòng trạng thái + nút quên mật khẩu + hiện/ẩn mật khẩu + nút đóng',
  idx.includes('id="auth-busy-bar"') && idx.includes('id="auth-status"') &&
  idx.includes('role="status"') && idx.includes('aria-live="polite"') &&
  idx.includes('id="btn-forgot-password"') && idx.includes('id="btn-toggle-pass"') &&
  idx.includes('id="btn-close-login"'));
check('E5: dòng trợ giúp "liên hệ Quản trị" + ô email quản trị điền tự động',
  idx.includes('id="login-owner-email"') && idx.includes('Chưa có tài khoản?'));
check('E6: Admin Panel có ô "Tạo tài khoản đăng nhập" + gửi email tự đặt mật khẩu + nút gửi đặt lại trong modal sửa',
  idx.includes('id="new-user-create-account"') && idx.includes('id="new-user-send-reset"') &&
  idx.includes('id="btn-user-edit-send-reset"'));
check('E7: cân bằng <div> </div> (không làm vỡ test cấu trúc khác)',
  (idx.match(/<div/g) || []).length === (idx.match(/<\/div>/g) || []).length);

console.log('--- E2. CẤU TRÚC (js) ---');
const authJs = rd('js/auth.js');
const evJs = rd('js/events.js');
const clJs = rd('js/cloud.js');
const css = rd('styles.css');
check('E8: auth.js KHÔNG còn handleRegisterSubmit; có toggleAuthPanel/handleResetSubmit/sendPasswordResetToUser',
  !authJs.includes('handleRegisterSubmit') && authJs.includes('function toggleAuthPanel') &&
  authJs.includes('function handleResetSubmit') && authJs.includes('function sendPasswordResetToUser'));
check('E9: quên mật khẩu dùng sendPasswordResetEmail + câu TRUNG TÍNH + xử lý auth/user-not-found',
  authJs.includes('sendPasswordResetEmail') &&
  authJs.includes('Nếu email có trong hệ thống') && authJs.includes("'auth/user-not-found'"));
check('E10: createAuthUserSecondary dùng APP PHỤ (initializeApp(cfg, appName) → signOut → delete)',
  authJs.includes('function createAuthUserSecondary') &&
  authJs.includes("'bamboo-create-'") && /initializeApp\(cfg, appName\)/.test(authJs) &&
  authJs.includes('await secAuth.signOut()') && authJs.includes('await secApp.delete()'));
check('E11: Admin tạo tài khoản → cấp quyền roles + gửi email đặt mật khẩu (tuỳ chọn)',
  authJs.includes('options.createAccount') && authJs.includes("'auth/email-already-in-use'") &&
  authJs.includes('options.sendReset'));
check('E12: events.js không còn nối form đăng ký; có nối quên mật khẩu + ô mật khẩu',
  !evJs.includes('register-form') && !evJs.includes('btn-toggle-register') &&
  evJs.includes("'reset-form', 'submit', handleResetSubmit") &&
  evJs.includes("'btn-forgot-password'") && evJs.includes("'btn-toggle-pass'"));
check('E13: chặn bấm nhiều lần ở handler đăng nhập (isAuthBusy) + setAuthBusy + map lỗi',
  evJs.includes('if (isAuthBusy()) return;') && evJs.includes("setAuthBusy('login', true") &&
  evJs.includes("setAuthBusy('login', false)") && evJs.includes('authErrorText(err && err.code'));
check('E14: KHÔNG trim mật khẩu khi đăng nhập (chỉ trim email)',
  /getElementById\('login-password'\)\.value \|\| ''/.test(evJs) &&
  !/getElementById\('login-password'\)\.value\.trim\(\)/.test(evJs));
check('E15: cloud.js báo bước + nhả khoá khi xác thực xong, chống toast lặp khi refresh token',
  clJs.includes("authMarkStep('Đang xác minh quyền…')") && clJs.includes('authNotifySettled()') &&
  clJs.includes('fbLastAuthUid'));
check('E16: cloud.js không renderAll vô ích khi phiên đã null từ đầu',
  clJs.includes('const hadSession = !!state.currentUser;') && clJs.includes('if (hadSession) renderAll();'));
check('E17: main.js mở API app.sendPasswordResetToUser cho nút trong bảng người dùng',
  rd('js/main.js').includes('sendPasswordResetToUser'));

console.log('--- E3. CẤU TRÚC (CSS + cache + test) ---');
function depthAt(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) return -1;
  const before = src.slice(0, i);
  return (before.match(/\{/g) || []).length - (before.match(/\}/g) || []).length;
}
check('E18: khối CSS đăng nhập nằm ở CẤP CAO NHẤT (độ sâu ngoặc = 0 — quy tắc 68b)',
  depthAt(css, '.auth-busy-bar {') === 0 && depthAt(css, '.btn-spinner {') === 0 &&
  depthAt(css, '.auth-panel[hidden]') === 0 && depthAt(css, '.login-help-row {') === 0);
check('E19: CSS có spinner + thanh chạy + ẩn panel bằng [hidden] !important + tôn trọng giảm hiệu ứng',
  css.includes('@keyframes authSpin') && css.includes('@keyframes authBarSlide') &&
  css.includes('.auth-panel[hidden] { display: none !important; }') &&
  css.includes('body[data-fx="low"] .btn-spinner') && css.includes('prefers-reduced-motion: reduce'));
check('E20: ngoặc CSS cân bằng', (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length);
const swJs = rd('sw.js');
check('E21: sw.js v313 + ./js/auth-ui.js trong APP_SHELL',
  swJs.includes("'nha-may-ngoc-son-v313'") && swJs.includes("'./js/auth-ui.js'"));
check('E22: APP_VERSION = v313 (khớp CACHE_NAME — quy tắc 73)',
  rd('js/state.js').includes("APP_VERSION = 'v313'"));
check('E23: tests/auth-ui.test.mjs đã nằm trong chuỗi npm test',
  rd('package.json').includes('tests/auth-ui.test.mjs'));

console.log('\n────────────────────────────────────────');
console.log(`KẾT QUẢ: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

