// tests/theme.test.mjs — Kiểm thử GIAO DIỆN KHÓA CỨNG (js/theme.js, 28/09/2026):
// MỘT giao diện duy nhất (không còn chọn Sáng/Đêm Kính/Auto, đã xóa nút đổi
// nhanh ở header) — lựa chọn cũ đang lưu (light/auto) TỰ CHUYỂN về giao diện
// hiện tại; bản đồ theo người dùng: pref khác hiện tại bị bỏ qua; công tắc
// Giảm hiệu ứng vẫn hoạt động và luôn giữ data-theme; defaults Chart.js cố định
// theo nền kem sáng; kiểm tra cấu trúc: index.html/theme.js không còn dấu vết
// bộ chọn giao diện cũ.
'use strict';
import fs from 'node:fs';

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

// ─── A. MẶT ĐỊNH: chưa chọn gì — luôn là giao diện hiện tại ─────
check('KHÓA CỨNG: lựa chọn mặc định là giao diện hiện tại ("night")', theme.getThemeChoice() === 'night');
const r0 = theme.initTheme();
check('initTheme: luôn đặt data-theme="night"', r0 === 'night' && body.getAttribute('data-theme') === 'night');
check('data-fx mặc định là "normal"', body.getAttribute('data-fx') === 'normal');
check('Chart.js defaults cố định màu trục theo nền kem sáng', global.Chart.defaults.color === '#3a4535' && global.Chart.defaults.borderColor === 'rgba(90, 110, 70, 0.25)');

// ─── B. LỰA CHỌN CŨ TRONG MÁY (light/auto) TỰ VỀ GIAO DIỆN HIỆN TẠI ──
storeBacking.set('bamboo_tracker_ui_theme_v1', 'light');
check('máy từng chọn "light": getThemeChoice trả giao diện hiện tại', theme.getThemeChoice() === 'night');
theme.initTheme();
check('máy từng chọn "light": initTheme vẫn đặt data-theme="night"', body.getAttribute('data-theme') === 'night');
storeBacking.set('bamboo_tracker_ui_theme_v1', 'auto');
check('máy từng chọn "auto": getThemeChoice trả giao diện hiện tại', theme.getThemeChoice() === 'night');
storeBacking.set('bamboo_tracker_ui_theme_v1', 'rainbow');
check('lựa chọn rác/rainbow: tự về giao diện hiện tại', theme.getThemeChoice() === 'night');

// ─── C. THEO NGƯỜI DÙNG: pref khác giao diện hiện tại bị BỎ QUA ──
state.currentUser = { username: 'an', role: 'admin', fullname: 'Nguyễn Văn An' };
theme.noteUserTheme(); // ghi sở thích của An (chính là giao diện hiện tại)
check('bản đồ người dùng ghi an→night', usersMap().an === 'night');
state.currentUser = { username: 'binh', role: 'editor', fullname: 'Trần Bình' };
storeBacking.set('bamboo_tracker_ui_theme_users_v1', JSON.stringify({ an: 'night', binh: 'light' }));
// An đăng nhập lại máy → vẫn giao diện hiện tại
state.currentUser = { username: 'an', role: 'admin', fullname: 'Nguyễn Văn An' };
const appliedAn = theme.applyThemeForUser('an');
check('An đăng nhập: giao diện hiện tại không đổi', body.getAttribute('data-theme') === 'night');
// Bình có sở thích cũ "light" → bị BỎ QUA, vẫn giao diện hiện tại
state.currentUser = { username: 'binh', role: 'editor', fullname: 'Trần Bình' };
theme.applyThemeForUser('binh');
check('Bình từng chọn "light": pref cũ bị bỏ qua — vẫn giao diện hiện tại', body.getAttribute('data-theme') === 'night');
// Người chưa từng chọn: giữ nguyên giao diện máy, không lỗi
const appliedMoi = theme.applyThemeForUser('cu');
check('người mới chưa có sở thích: giữ giao diện máy (không lỗi)', appliedMoi === false);
// Mô phỏng boot: initTheme luôn áp giao diện hiện tại
theme.initTheme();
check('boot: initTheme luôn đặt data-theme="night"', body.getAttribute('data-theme') === 'night');

// ─── D. GIẢM HIỆU ỨNG (MÁY YẾU) — luôn giữ data-theme ──────────
theme.setFxLow(true);
check('giảm hiệu ứng: data-fx="low"', body.getAttribute('data-fx') === 'low');
check('giảm hiệu ứng: lưu localStorage', storeBacking.get('bamboo_tracker_ui_fx_v1') === 'low');
check('giảm hiệu ứng: vẫn GIỮ data-theme="night" (chỉ tắt kính/animation)', body.getAttribute('data-theme') === 'night');
theme.setFxLow(false);
check('bật lại hiệu ứng: data-fx="normal"', body.getAttribute('data-fx') === 'normal');
check('bật lại hiệu ứng: data-theme vẫn "night"', body.getAttribute('data-theme') === 'night');

// ─── E. CẤU TRÚC: KHÔNG CÒN DẤU VẾT BỘ CHỌN GIAO DIỆN CŨ ───────
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const themeJs = fs.readFileSync(new URL('../js/theme.js', import.meta.url), 'utf8');
const eventsJs = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): menu ⋮ không còn 3 nút chọn giao diện cũ',
  !idxHtml.includes('btn-theme-light') && !idxHtml.includes('btn-theme-night') && !idxHtml.includes('btn-theme-auto'));
check('CẤU TRÚC (index.html): header không còn nút đổi nhanh giao diện',
  !idxHtml.includes('btn-theme-toggle') && !idxHtml.includes('theme-toggle'));
check('CẤU TRÚC (index.html): vẫn còn nút "Giảm Hiệu Ứng" ở menu', idxHtml.includes('btn-fx-low'));
check('CẤU TRÚC (theme.js): không còn export setTheme/toggleThemeQuick',
  !themeJs.includes('export function setTheme') && !themeJs.includes('toggleThemeQuick'));
check('CẤU TRÚC (events.js): không còn wire nút chọn giao diện cũ',
  !eventsJs.includes('btn-theme-light') && !eventsJs.includes('toggleThemeQuick') && eventsJs.includes('btn-fx-low'));
check('CẤU TRÚC (theme.js): sổ đăng ký giao diện chỉ còn một lựa chọn', themeJs.includes("const THEMES = ['night'];"));

console.log('───────────────────────────');
console.log(`THEME: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
