// ═══════════════════════════════════════════════════════════════
// tests/login-gate.test.mjs — BẮT BUỘC ĐĂNG NHẬP + NẠP THEO VAI TRÒ (11/2026)
// ═══════════════════════════════════════════════════════════════
// A. SỬA LỖI "MẤT NÚT ĐĂNG NHẬP/ĐĂNG XUẤT": CSS điều kiện theo data-role
//    (trước đây body.can-edit ⇒ Người Xem đăng nhập mất CẢ pill lẫn Đăng Xuất).
// B. CỔNG KHÓA: checkAuthAndRender (auth.js) + checkAuthAndRenderFirebase
//    (cloud.js) mở modal khi chưa đăng nhập; events.js chặn nút Đóng; CSS ẩn
//    nút Đóng cho khách; index.html có dòng hướng dẫn đăng nhập offline.
// C. GIỮ PHIÊN CỤC BỘ: handleFirebaseAuth(null) KHÔNG xóa user không có uid.
// D. NẠP THEO VAI TRÒ: editor bỏ vẽ biểu đồ lúc boot (skipDashDecorBoot) +
//    mở tab nhập liệu đầu tiên; câu chờ riêng Admin/BQL; banner sync-fresh.
// E. Hành vi: stub DOM — chưa đăng nhập → modal .show; đăng nhập → tắt.
// ═══════════════════════════════════════════════════════════════
import fs from 'fs';
import assert from 'assert/strict';

const rd = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
};

// ─── A. CSS trạng thái đăng nhập theo data-role ─────────────────
const css = rd('styles.css');
check('A1. ẩn pill + Đăng Xuất theo body[data-role="guest"]',
  /body\[data-role="guest"\] #user-profile-badge,[\s\S]{0,120}body\[data-role="guest"\] #btn-logout\s*\{[^}]*display:\s*none !important/.test(css));
check('A2. ẩn nút Đăng Nhập khi ĐÃ đăng nhập (body:not guest)',
  /body:not\(\[data-role="guest"\]\) #btn-open-login\s*\{[^}]*display:\s*none !important/.test(css));
check('A3. KHÔNG còn điều kiện can-edit/is-admin cũ cho 3 nút',
  !css.includes('body.can-edit #btn-open-login') && !css.includes('body.is-admin #btn-open-login') && !css.includes('body:not(.can-edit) #user-profile-badge'));
check('A4. ẩn nút Đóng modal đăng nhập cho khách (cổng khóa)',
  /body\[data-role="guest"\] #btn-close-login\s*\{[^}]*display:\s*none !important/.test(css));

// ─── B. Cổng khóa đăng nhập ─────────────────────────────────────
const authSrc = rd('js/auth.js');
check('B1. checkAuthAndRender: gate = !currentUser + mở modal + nhớ loginGateWasOn',
  /const gate = !state\.currentUser;[\s\S]{0,400}state\.loginGateWasOn = gate;/.test(authSrc)
  && /if \(gate\) loginModal\.classList\.add\('show'\);\s*else if \(state\.loginGateWasOn\) loginModal\.classList\.remove\('show'\);/.test(authSrc));
const cloudSrc = rd('js/cloud.js');
check('B2. checkAuthAndRenderFirebase: cùng cổng khóa (không gỡ modal vô điều kiện)',
  /function checkAuthAndRenderFirebase\(\) \{[\s\S]{0,600}const gate = !state\.currentUser;/.test(cloudSrc)
  && !/function checkAuthAndRenderFirebase\(\) \{\s*document\.getElementById\('modal-login'\)\?\.classList\.remove\('show'\);/.test(cloudSrc));
const evSrc = rd('js/events.js');
check('B3. events.js chặn nút Đóng khi cổng bật (state.loginGate)',
  evSrc.includes("if (state.loginGate) { showToast('Cần đăng nhập để sử dụng ứng dụng.', 'info'); return; }"));
const idx = rd('index.html');
check('B4. modal đăng nhập có dòng hướng dẫn offline (login-offline-hint)', idx.includes('login-offline-hint'));
check('B5. state.js khai báo loginGate + loginGateWasOn',
  rd('js/state.js').includes('loginGate: false') && rd('js/state.js').includes('loginGateWasOn: false'));

// ─── C. Giữ phiên cục bộ khi Firebase chưa đăng nhập ────────────
check('C1. handleFirebaseAuth(null): user không có uid (cục bộ) được GIỮ',
  /if \(!user\) \{[\s\S]{0,700}if \(cur && !cur\.uid\) \{[\s\S]{0,300}applyRoleToUI\(cur\.role\);/.test(cloudSrc));
check('C2. hết phiên Firebase (hadSession) → gọi checkAuthAndRenderFirebase (mở cổng)',
  cloudSrc.includes('if (hadSession) checkAuthAndRenderFirebase();'));

// ─── D. Nạp theo vai trò ────────────────────────────────────────
const mainSrc = rd('js/main.js');
check('D1. editor bỏ vẽ biểu đồ lúc boot (skipDashDecorBoot trong renderAll)',
  mainSrc.includes('let skipDashDecorBoot = false;')
  && /if \(skipDashDecorBoot\) \{[\s\S]{0,300}dashboardDirty = true;/.test(mainSrc));
check('D2. boot: bật/tắt skipDashDecorBoot quanh checkAuthAndRender',
  /skipDashDecorBoot = true;[\s\S]{0,600}checkAuthAndRender\(\);[\s\S]{0,200}skipDashDecorBoot = false;/.test(mainSrc));
check('D3. editor mở tab nhập liệu đầu tiên (firstEditableDataView + syncActiveViewDom)',
  mainSrc.includes('function firstEditableDataView') && mainSrc.includes('function syncActiveViewDom')
  && /state\.currentUser\.role === 'editor'[\s\S]{0,300}firstEditableDataView\(\)/.test(mainSrc));
check('D4. câu chờ riêng Admin/BQL (bootPhrases)', mainSrc.includes('Tài khoản Quản Trị: đang nạp toàn bộ dữ liệu'));
check('D5. cloud.js export cloudInitialSyncPending + updateSyncFreshBanner',
  cloudSrc.includes('function cloudInitialSyncPending') && cloudSrc.includes('function updateSyncFreshBanner')
  && /export \{[\s\S]*cloudInitialSyncPending,/.test(cloudSrc));
check('D6. banner sync-fresh-banner trong index.html + CSS is-fresh',
  idx.includes('id="sync-fresh-banner"') && css.includes('.sync-pending-banner.is-fresh'));
check('D7. updateSyncBadge gọi updateSyncFreshBanner (1 điểm cập nhật chung)',
  cloudSrc.includes('try { updateSyncFreshBanner(); } catch (e) { /* bỏ qua */ }'));

// ─── E. Hành vi thật trên stub DOM ──────────────────────────────
function makeEl(id) {
  const el = { id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', src: '', href: '', title: '', files: [],
    options: [], selectedOptions: [], selectedIndex: 0, draggable: false, dataset: {}, style: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, on) { if (on === undefined) { if (this._s.has(c)) this._s.delete(c); else this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); }, removeEventListener(){}, dispatchEvent(){ return true; }, _h: {},
    appendChild(c) { return c; }, removeChild(c) { return c; }, insertBefore(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [], closest: () => null, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    scrollIntoView(){}, scrollTo(){}, focus(){}, blur(){}, click(){}, getContext: () => ({ measureText: () => ({ width: 10 }) }),
    animate(){ return { cancel(){} }; } };
  return el;
}
const els = new Map();
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}, exitFullscreen(){}, fullscreenElement: null,
  createEvent: () => ({ initEvent(){} }), escapeCSS: (s) => s
};
global.window = global;
if (typeof global.addEventListener !== 'function') global.addEventListener = () => {};
if (typeof global.removeEventListener !== 'function') global.removeEventListener = () => {};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){} });
const backing = new Map();
global.localStorage = {
  getItem: (k) => (backing.has(k) ? backing.get(k) : null),
  setItem: (k, v) => { backing.set(k, String(v)); },
  removeItem: (k) => { backing.delete(k); },
  clear: () => backing.clear(),
  key: (i) => [...backing.keys()][i] ?? null,
  get length() { return backing.size; }
};
global.sessionStorage = global.localStorage;
try { Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-gate', language: 'vi', clipboard: { writeText: async () => {} } }, configurable: true, writable: true }); } catch (e) { /* Node cho getter — giữ nguyên */ }
global.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
global.lucide = { createIcons(){} };
global.Chart = class { constructor(){ this.data = { labels: [], datasets: [] }; this.options = {}; this.scales = {}; this.canvas = makeEl(); this.width = 800; this.height = 500; }
  update(){} resize(){} destroy(){} render(){} reset(){} stop(){} toBase64Image(){ return ''; } getDatasetMeta(){ return { data: [], controller: null }; } };
Chart.register = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.fetch = async () => ({ ok: true, json: async () => ({}) });
global.alert = () => {}; global.confirm = () => false; global.prompt = () => null;
global.FileReader = class { readAsArrayBuffer(){} };

const { state } = await import('../js/state.js');
const authMod = await import('../js/auth.js');

// E1: chưa đăng nhập → cổng bật + modal .show + cờ loginGate
state.currentUser = null;
authMod.checkAuthAndRender();
check('E1. chưa đăng nhập: loginGate = true + modal-login có .show',
  state.loginGate === true && state.loginGateWasOn === true
  && els.get('modal-login').classList.contains('show'));

// E2: đăng nhập (user cục bộ viewer) → cổng tắt + modal tắt
state.currentUser = { username: 'viewer1', fullname: 'Người Xem', role: 'viewer' };
authMod.checkAuthAndRender();
check('E2. đã đăng nhập: loginGate = false + modal-login BỎ .show (do loginGateWasOn)',
  state.loginGate === false && !els.get('modal-login').classList.contains('show'));

// E3: đăng xuất (null lần nữa) → cổng bật lại
state.currentUser = null;
authMod.checkAuthAndRender();
check('E3. đăng xuất: cổng bật lại (modal-login .show)', state.loginGate === true && els.get('modal-login').classList.contains('show'));

console.log('─── KẾT QUẢ: ' + pass + ' PASS / ' + fail + ' FAIL ───');
if (fail) process.exit(1);
