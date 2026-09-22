// tests/theme.test.mjs — Kiểm thử BỘ CHỌN GIAO DIỆN (js/theme.js):
// 3 lựa chọn light/night/auto (+theo prefers-color-scheme), lưu theo MÁY và
// theo NGƯỜI DÙNG (bản đồ username → theme — đăng nhập là tự áp), công tắc
// Giảm hiệu ứng, defaults Chart.js đổi theo theme, lựa chọn sai bị bỏ qua.
'use strict';

// ─── Stubs môi trường ──────────────────────────────────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500, _attrs: {},
    setAttribute(k, v){ this._attrs[k] = String(v); },
    getAttribute(k){ return k in this._attrs ? this._attrs[k] : null; },
    removeAttribute(k){ delete this._attrs[k]; },
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    focus(){}, click(){}, animate(){ return { cancel(){} }; },
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 })
  };
  return el;
}
const els = new Map();
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
Object.defineProperty(global, "navigator", { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
let darkMode = false; // giả lập prefers-color-scheme của máy
global.matchMedia = (q) => ({ matches: darkMode && String(q).includes('dark'), media: String(q), addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
const storeBacking = new Map();
global.localStorage = {
  getItem: (k) => (storeBacking.has(k) ? storeBacking.get(k) : null),
  setItem: (k, v) => { storeBacking.set(k, String(v)); },
  removeItem: (k) => { storeBacking.delete(k); },
  clear: () => storeBacking.clear(),
  key: (i) => [...storeBacking.keys()][i] ?? null,
  get length() { return storeBacking.size; }
};
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
global.Chart = { defaults: {} }; // soi defaults màu trục/lưới khi đổi theme
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

const { state } = await import('../js/state.js');
const theme = await import('../js/theme.js');

const body = document.body;
const usersMap = () => { try { return JSON.parse(storeBacking.get('bamboo_tracker_ui_theme_users_v1') || '{}'); } catch (e) { return {}; } };

// ─── A. MẶT ĐỊNH: chưa chọn gì + máy sáng ──────────────────────
check('mặc định: lựa chọn là "auto"', theme.getThemeChoice() === 'auto');
const r0 = theme.initTheme(); // chưa đăng nhập + matchMedia trả "sáng"
check('initTheme (máy sáng): body KHÔNG có data-theme', body.getAttribute('data-theme') === null);
check('initTheme: giải quyết ra "light"', r0 === 'light');
check('data-fx mặc định là "normal"', body.getAttribute('data-fx') === 'normal');

// ─── B. CHỌN ĐÊM KÍNH (chưa đăng nhập — chỉ lưu theo máy) ───────
const r1 = theme.setTheme('night');
check('setTheme("night"): trả về night', r1 === 'night');
check('setTheme("night"): body có data-theme="night"', body.getAttribute('data-theme') === 'night');
check('lưu lựa chọn theo MÁY (localStorage)', storeBacking.get('bamboo_tracker_ui_theme_v1') === 'night');
check('Chart.js defaults đổi màu trục theo theme đêm', global.Chart.defaults.color === '#3a4535');

// ─── C. THEO NGƯỜI DÙNG: An thích đêm, Bình thích sáng ─────────
state.currentUser = { username: 'an', role: 'admin', fullname: 'Nguyễn Văn An' };
theme.setTheme('night'); // ghi nhớ sở thích của An
check('bản đồ người dùng ghi an→night', usersMap().an === 'night');
state.currentUser = { username: 'binh', role: 'editor', fullname: 'Trần Bình' };
theme.setTheme('light'); // Bình chọn sáng (máy đang đêm → đổi lại)
check('Bình chọn sáng: body về light', body.getAttribute('data-theme') === null);
check('bản đồ người dùng ghi binh→light (an giữ nguyên đêm)', usersMap().binh === 'light' && usersMap().an === 'night');
// An đăng nhập lại máy → tự áp Đêm Kính của An
state.currentUser = { username: 'an', role: 'admin', fullname: 'Nguyễn Văn An' };
const appliedAn = theme.applyThemeForUser('an');
check('An đăng nhập: tự áp lại Đêm Kính', appliedAn === true && body.getAttribute('data-theme') === 'night');
// Bình đăng nhập lại → về Sáng theo sở thích Bình
state.currentUser = { username: 'binh', role: 'editor', fullname: 'Trần Bình' };
theme.applyThemeForUser('binh');
check('Bình đăng nhập: tự về Sáng', body.getAttribute('data-theme') === null);
// Người chưa từng chọn: giữ nguyên giao diện máy, không lỗi
const appliedMoi = theme.applyThemeForUser('cu');
check('người mới chưa có sở thích: giữ giao diện máy (không lỗi)', appliedMoi === false);
// Mô phỏng boot: initTheme áp sở thích người đang đăng nhập
state.currentUser = { username: 'an', role: 'admin', fullname: 'Nguyễn Văn An' };
theme.initTheme();
check('boot: initTheme áp sở thích An (đêm)', body.getAttribute('data-theme') === 'night');

// ─── D. "AUTO" TỰ THEO SÁNG/TỐI CỦA MÁY ────────────────────────
theme.setTheme('auto');
check('auto: localStorage lưu "auto"', storeBacking.get('bamboo_tracker_ui_theme_v1') === 'auto');
darkMode = false; theme.initTheme();
check('auto + máy sáng: không có data-theme', body.getAttribute('data-theme') === null);
darkMode = true; theme.initTheme();
check('auto + máy TỐI (prefers dark): data-theme="night"', body.getAttribute('data-theme') === 'night');
darkMode = false; theme.initTheme();

// ─── E. GIẢM HIỆU ỨNG (MÁY YẾU) ────────────────────────────────
theme.setFxLow(true);
check('giảm hiệu ứng: data-fx="low"', body.getAttribute('data-fx') === 'low');
check('giảm hiệu ứng: lưu localStorage', storeBacking.get('bamboo_tracker_ui_fx_v1') === 'low');
check('giảm hiệu ứng: vẫn GIỮ data-theme (chỉ tắt kính/animation)', body.getAttribute('data-theme') === null);
theme.setFxLow(false);
check('bật lại hiệu ứng: data-fx="normal"', body.getAttribute('data-fx') === 'normal');

// ─── F. LỰA CHỌN SAI / ĐỔI NHANH ───────────────────────────────
const before = theme.getThemeChoice();
theme.setTheme('rainbow');
check('lựa chọn không hợp lệ: bị bỏ qua, giữ lựa chọn cũ', theme.getThemeChoice() === before);
const afterToggle = theme.toggleThemeQuick();
check('đổi nhanh: sáng ↔ đêm (night resolved)', afterToggle === 'night' && body.getAttribute('data-theme') === 'night');
check('đổi nhanh: ghi vào bản đồ người dùng đang đăng nhập', usersMap().an === 'night');

console.log('───────────────────────────');
console.log(`THEME: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
