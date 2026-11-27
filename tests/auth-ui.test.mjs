// tests/auth-ui.test.mjs â€” ÄÄ‚NG NHáº¬P: TRáº NG THÃI CHá»œ + QUÃŠN Máº¬T KHáº¨U (P3 â€” 20/10/2026)
// Bao phá»§: báº£ng dá»‹ch lá»—i Firebase Â· chá»‘ng báº¥m nhiá»u láº§n (setAuthBusy/isAuthBusy) Â·
// khÃ´i phá»¥c nÃºt/Ã´ nháº­p Â· timeout tá»± nháº£ khoÃ¡ Â· cáº¥u trÃºc 2 panel (login â‡„ reset,
// KHÃ”NG cÃ²n form Ä‘Äƒng kÃ½) Â· Admin táº¡o tÃ i khoáº£n báº±ng APP PHá»¤ Â· ná»‘i events/cloud/sw.
'use strict';
import fs from 'node:fs';

const rd = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  âœ“ ' + name); }
  else { fail++; console.log('  âœ— ' + name); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// â•â•â• A. STUB DOM Tá»I THIá»‚U (chá»‰ Ä‘á»§ há»£p Ä‘á»“ng cá»§a js/auth-ui.js) â•â•â•
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
loginBtn.attrs['data-busy-label'] = 'Äang Ä‘Äƒng nháº­pâ€¦';
const loginForm = mkEl('login-form', 'form');
loginForm.children = [userInp, passInp, loginBtn];
const resetEmail = mkEl('reset-email', 'input');
const resetBtn = mkEl('', 'button');
resetBtn.className = 'js-auth-submit';
resetBtn.attrs['data-busy-label'] = 'Äang gá»­i emailâ€¦';
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

// â•â•â• B. Báº¢NG Dá»ŠCH Lá»–I FIREBASE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- B. Báº¢NG Dá»ŠCH Lá»–I ---');
check('B1: auth/admin-restricted-operation â†’ chá»‰ rÃµ báº­t "Create (sign-up)" vÃ  "Password reset" trong Firebase Console',
  AU.authErrorText('auth/admin-restricted-operation').includes('Create (sign-up)') &&
  AU.authErrorText('auth/admin-restricted-operation').includes('Password reset'));
check('B2: auth/operation-not-allowed â†’ hÆ°á»›ng dáº«n báº­t Email/Password',
  AU.authErrorText('auth/operation-not-allowed').includes('Email/Password'));
check('B3: cÃ¡c mÃ£ thÆ°á»ng gáº·p cÃ³ cÃ¢u tiáº¿ng Viá»‡t cÃ³ dáº¥u',
  AU.authErrorText('auth/invalid-credential') === 'Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng.' &&
  AU.authErrorText('auth/too-many-requests').includes('chá» vÃ i phÃºt') &&
  AU.authErrorText('auth/network-request-failed').includes('Máº¥t káº¿t ná»‘i máº¡ng') &&
  AU.authErrorText('auth/unauthorized-domain').includes('Authorized domains') &&
  AU.authErrorText('auth/email-already-in-use').includes('QuÃªn máº­t kháº©u'));
check('B4: mÃ£ Láº  dÃ¹ng fallback; khÃ´ng fallback thÃ¬ cÃ¢u máº·c Ä‘á»‹nh tiáº¿ng Viá»‡t',
  AU.authErrorText('auth/la-hoac', 'CÃ¢u riÃªng') === 'CÃ¢u riÃªng' &&
  AU.authErrorText('auth/la-hoac') === 'Thao tÃ¡c khÃ´ng thÃ nh cÃ´ng. Vui lÃ²ng thá»­ láº¡i.');
check('B5: AUTH_ERROR_MAP export Ä‘á»ƒ Ä‘á»‘i chiáº¿u + module KHÃ”NG import gÃ¬',
  AU.AUTH_ERROR_MAP && Object.keys(AU.AUTH_ERROR_MAP).length >= 15 &&
  !/^\s*import\s/m.test(rd('js/auth-ui.js')));

// â•â•â• C. CHá»NG Báº¤M NHIá»€U Láº¦N + KHÃ”I PHá»¤C â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- C. CHá»NG Báº¤M NHIá»€U Láº¦N ---');
const loginOrigHtml = loginBtn.innerHTML;
AU.setAuthBusy('login', true, 'Äang Ä‘Äƒng nháº­pâ€¦');
check('C1: báº­t chá» â†’ aria-busy trÃªn form + thanh tiáº¿n trÃ¬nh hiá»‡n + dÃ²ng tráº¡ng thÃ¡i Ä‘Ãºng nhÃ£n',
  loginForm.getAttribute('aria-busy') === 'true' && bar.hidden === false &&
  status.hidden === false && status.textContent === 'Äang Ä‘Äƒng nháº­pâ€¦');
check('C2: khoÃ¡ Má»ŒI Ã´ nháº­p + nÃºt trong form (chá»‘ng báº¥m láº·p á»Ÿ táº§ng DOM)',
  userInp.disabled === true && passInp.disabled === true && loginBtn.disabled === true);
check('C3: nÃºt submit Ä‘á»•i thÃ nh spinner + nhÃ£n data-busy-label',
  loginBtn.innerHTML.includes('btn-spinner') && loginBtn.innerHTML.includes('Äang Ä‘Äƒng nháº­pâ€¦'));
check('C4: isAuthBusy Ä‘Ãºng loáº¡i â€” login Ä‘ang báº­n, reset ráº£nh',
  AU.isAuthBusy() === true && AU.isAuthBusy('login') === true && AU.isAuthBusy('reset') === false);
check('C5: báº­t chá» láº§n 2 bá»‹ Tá»ª CHá»I (khÃ´ng chá»“ng request)',
  AU.setAuthBusy('login', true, 'Láº§n 2') === false && status.textContent === 'Äang Ä‘Äƒng nháº­pâ€¦');
check('C6: authMarkStep Ä‘á»•i nhÃ£n giá»¯a cÃ¡c bÆ°á»›c (xÃ¡c minh quyá»n)',
  AU.authMarkStep('Äang xÃ¡c minh quyá»nâ€¦') === true && status.textContent.includes('xÃ¡c minh'));
check('C7: táº¯t sai loáº¡i (reset) KHÃ”NG gá»¡ khoÃ¡ cá»§a login',
  AU.setAuthBusy('reset', false) === false && AU.isAuthBusy('login') === true);
AU.authNotifySettled();
check('C8: xÃ¡c thá»±c xong â†’ khÃ´i phá»¥c nÃºt/Ã´ nháº­p, áº©n thanh + dÃ²ng tráº¡ng thÃ¡i, háº¿t báº­n',
  AU.isAuthBusy() === false && userInp.disabled === false && passInp.disabled === false &&
  loginBtn.disabled === false && loginBtn.innerHTML === loginOrigHtml &&
  bar.hidden === true && status.hidden === true && status.textContent === '');
// Ã” vá»‘n Ä‘Ã£ disabled tá»« trÆ°á»›c pháº£i Ä‘Æ°á»£c tráº£ láº¡i ÄÃšNG tráº¡ng thÃ¡i cÅ©
userInp.disabled = true;
AU.setAuthBusy('login', true, 'Chá»â€¦');
AU.authNotifySettled();
check('C9: khÃ´i phá»¥c Ä‘Ãºng tráº¡ng thÃ¡i disabled TRÆ¯á»šC ÄÃ“ (khÃ´ng báº­t khoÃ¡ há»™ Ã´ vá»‘n bá»‹ khoÃ¡)',
  userInp.disabled === true);
userInp.disabled = false;

// â•â•â• D. TIMEOUT Tá»° NHáº¢ KHOÃ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- D. TIMEOUT ---');
const saveTimeout = AU.AUTH_TIMING.timeout;
AU.AUTH_TIMING.timeout = 20;
AU.setAuthBusy('reset', true, 'Äang gá»­iâ€¦');
await sleep(70);
check('D1: quÃ¡ háº¡n â†’ tá»± nháº£ khoÃ¡ (khÃ´ng treo vÄ©nh viá»…n)',
  AU.isAuthBusy() === false && resetBtn.disabled === false);
check('D2: bÃ¡o trÃªn dÃ²ng tráº¡ng thÃ¡i, KHÃ”NG im láº·ng',
  status.hidden === false && status.textContent.includes('cháº­m') && status.textContent.includes('thá»­ láº¡i'));
AU.AUTH_TIMING.timeout = saveTimeout;


// â•â•â• E. Cáº¤U TRÃšC 2 PANEL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- E. Cáº¤U TRÃšC (index.html) ---');
const idx = rd('index.html');
check('E1: form Ä‘Äƒng nháº­p cÃ³ data-auth-form="login" + nÃºt .js-auth-submit + data-busy-label',
  idx.includes('id="login-form"') && idx.includes('data-auth-form="login"') &&
  idx.includes('js-auth-submit') && idx.includes('data-busy-label="Äang Ä‘Äƒng nháº­pâ€¦"'));
check('E2: panel QuÃªn máº­t kháº©u cÃ³ data-auth-form="reset" + Ã´ email + nÃºt quay láº¡i',
  idx.includes('id="reset-form"') && idx.includes('data-auth-form="reset"') &&
  idx.includes('id="reset-email"') && idx.includes('id="btn-back-login"'));
check('E3: ÄÃƒ XOÃ Háº²N form Ä‘Äƒng kÃ½ + nÃºt Ä‘Äƒng kÃ½ (P3)',
  !idx.includes('id="register-form"') && !idx.includes('id="btn-toggle-register"') &&
  !idx.includes('id="reg-email"'));
check('E4: cÃ³ thanh chá» + dÃ²ng tráº¡ng thÃ¡i + nÃºt quÃªn máº­t kháº©u + hiá»‡n/áº©n máº­t kháº©u + nÃºt Ä‘Ã³ng',
  idx.includes('id="auth-busy-bar"') && idx.includes('id="auth-status"') &&
  idx.includes('role="status"') && idx.includes('aria-live="polite"') &&
  idx.includes('id="btn-forgot-password"') && idx.includes('id="btn-toggle-pass"') &&
  idx.includes('id="btn-close-login"'));
check('E5: dÃ²ng trá»£ giÃºp "liÃªn há»‡ Quáº£n trá»‹" + Ã´ email quáº£n trá»‹ Ä‘iá»n tá»± Ä‘á»™ng',
  idx.includes('id="login-owner-email"') && idx.includes('ChÆ°a cÃ³ tÃ i khoáº£n?'));
check('E6: Admin Panel cÃ³ Ã´ "Táº¡o tÃ i khoáº£n Ä‘Äƒng nháº­p" + gá»­i email tá»± Ä‘áº·t máº­t kháº©u + nÃºt gá»­i Ä‘áº·t láº¡i trong modal sá»­a',
  idx.includes('id="new-user-create-account"') && idx.includes('id="new-user-send-reset"') &&
  idx.includes('id="btn-user-edit-send-reset"'));
check('E7: cÃ¢n báº±ng <div> </div> (khÃ´ng lÃ m vá»¡ test cáº¥u trÃºc khÃ¡c)',
  (idx.match(/<div/g) || []).length === (idx.match(/<\/div>/g) || []).length);

console.log('--- E2. Cáº¤U TRÃšC (js) ---');
const authJs = rd('js/auth.js');
const evJs = rd('js/events.js');
const clJs = rd('js/cloud.js');
const css = rd('styles.css');
check('E8: auth.js KHÃ”NG cÃ²n handleRegisterSubmit; cÃ³ toggleAuthPanel/handleResetSubmit/sendPasswordResetToUser',
  !authJs.includes('handleRegisterSubmit') && authJs.includes('function toggleAuthPanel') &&
  authJs.includes('function handleResetSubmit') && authJs.includes('function sendPasswordResetToUser'));
check('E9: quÃªn máº­t kháº©u dÃ¹ng sendPasswordResetEmail + cÃ¢u TRUNG TÃNH + xá»­ lÃ½ auth/user-not-found',
  authJs.includes('sendPasswordResetEmail') &&
  authJs.includes('Náº¿u email cÃ³ trong há»‡ thá»‘ng') && authJs.includes("'auth/user-not-found'"));
check('E10: createAuthUserSecondary dÃ¹ng APP PHá»¤ (initializeApp(cfg, appName) â†’ signOut â†’ delete)',
  authJs.includes('function createAuthUserSecondary') &&
  authJs.includes("'bamboo-create-'") && /initializeApp\(cfg, appName\)/.test(authJs) &&
  authJs.includes('await secAuth.signOut()') && authJs.includes('await secApp.delete()'));
check('E11: Admin táº¡o tÃ i khoáº£n â†’ cáº¥p quyá»n roles + gá»­i email Ä‘áº·t máº­t kháº©u (tuá»³ chá»n)',
  authJs.includes('options.createAccount') && authJs.includes("'auth/email-already-in-use'") &&
  authJs.includes('options.sendReset'));
check('E12: events.js khÃ´ng cÃ²n ná»‘i form Ä‘Äƒng kÃ½; cÃ³ ná»‘i quÃªn máº­t kháº©u + Ã´ máº­t kháº©u',
  !evJs.includes('register-form') && !evJs.includes('btn-toggle-register') &&
  evJs.includes("'reset-form', 'submit', handleResetSubmit") &&
  evJs.includes("'btn-forgot-password'") && evJs.includes("'btn-toggle-pass'"));
check('E13: cháº·n báº¥m nhiá»u láº§n á»Ÿ handler Ä‘Äƒng nháº­p (isAuthBusy) + setAuthBusy + map lá»—i',
  evJs.includes('if (isAuthBusy()) return;') && evJs.includes("setAuthBusy('login', true") &&
  evJs.includes("setAuthBusy('login', false)") && evJs.includes('authErrorText(err && err.code'));
check('E14: KHÃ”NG trim máº­t kháº©u khi Ä‘Äƒng nháº­p (chá»‰ trim email)',
  /getElementById\('login-password'\)\.value \|\| ''/.test(evJs) &&
  !/getElementById\('login-password'\)\.value\.trim\(\)/.test(evJs));
check('E15: cloud.js bÃ¡o bÆ°á»›c + nháº£ khoÃ¡ khi xÃ¡c thá»±c xong, chá»‘ng toast láº·p khi refresh token',
  clJs.includes("authMarkStep('Äang xÃ¡c minh quyá»nâ€¦')") && clJs.includes('authNotifySettled()') &&
  clJs.includes('fbLastAuthUid'));
check('E16: cloud.js khÃ´ng renderAll vÃ´ Ã­ch khi phiÃªn Ä‘Ã£ null tá»« Ä‘áº§u (cá»•ng khÃ³a chá»‰ khi cÃ³ phiÃªn trÆ°á»›c)',
  clJs.includes('const hadSession = !!state.currentUser;') && clJs.includes('if (hadSession) checkAuthAndRenderFirebase();')
  && !/if \(!user\) \{[\s\S]{0,700}if \(hadSession\) renderAll\(\);/.test(clJs));
check('E17: main.js má»Ÿ API app.sendPasswordResetToUser cho nÃºt trong báº£ng ngÆ°á»i dÃ¹ng',
  rd('js/main.js').includes('sendPasswordResetToUser'));

console.log('--- E3. Cáº¤U TRÃšC (CSS + cache + test) ---');
function depthAt(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) return -1;
  const before = src.slice(0, i);
  return (before.match(/\{/g) || []).length - (before.match(/\}/g) || []).length;
}
check('E18: khá»‘i CSS Ä‘Äƒng nháº­p náº±m á»Ÿ Cáº¤P CAO NHáº¤T (Ä‘á»™ sÃ¢u ngoáº·c = 0 â€” quy táº¯c 68b)',
  depthAt(css, '.auth-busy-bar {') === 0 && depthAt(css, '.btn-spinner {') === 0 &&
  depthAt(css, '.auth-panel[hidden]') === 0 && depthAt(css, '.login-help-row {') === 0);
check('E19: CSS cÃ³ spinner + thanh cháº¡y + áº©n panel báº±ng [hidden] !important + tÃ´n trá»ng giáº£m hiá»‡u á»©ng',
  css.includes('@keyframes authSpin') && css.includes('@keyframes authBarSlide') &&
  css.includes('.auth-panel[hidden] { display: none !important; }') &&
  css.includes('body[data-fx="low"] .btn-spinner') && css.includes('prefers-reduced-motion: reduce'));
check('E20: ngoáº·c CSS cÃ¢n báº±ng', (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length);
const swJs = rd('sw.js');
check('E21: sw.js v486 + ./js/auth-ui.js trong APP_SHELL',
  swJs.includes("'nha-may-ngoc-son-v486'") && swJs.includes("'./js/auth-ui.js'"));
check('E22: APP_VERSION = v486 (khá»›p CACHE_NAME â€” quy táº¯c 73)',
  rd('js/state.js').includes("APP_VERSION = 'v486'"));
check('E23: tests/auth-ui.test.mjs Ä‘Ã£ náº±m trong chuá»—i npm test',
  rd('package.json').includes('tests/auth-ui.test.mjs'));

console.log('\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
console.log(`Káº¾T QUáº¢: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

