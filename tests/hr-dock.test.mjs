// tests/hr-dock.test.mjs â€” DOCK 3 Cáº¤P TAB NHÃ‚N Sá»° (19/10/2026)
// Cáº¥p 1: nÃºt HOME ná»•i giá»¯a dÆ°á»›i â†’ Cáº¥p 2: 4 nhÃ³m (Há»“ sÆ¡ Â· NgÃ y cÃ´ng Â·
// Thá»‘ng kÃª Â· Tuyá»ƒn dá»¥ng) â†’ Cáº¥p 3: dáº£i tháº» cá»§a nhÃ³m (má»Ÿ pop-up chi tiáº¿t).
// Báº£ng bá»‘ trÃ­ vá»‹ trÃ­ lÃ  ná»™i dung Máº¶C Äá»ŠNH cá»§a tab.
'use strict';
import fs from 'node:fs';

// â”€â”€â”€ Stubs mÃ´i trÆ°á»ng (giá»‘ng tests/hr-cards.test.mjs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, _attrs: {},
    setAttribute(k, v) { el._attrs[k] = String(v); },
    removeAttribute(k) { delete el._attrs[k]; },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(el._attrs, k) ? el._attrs[k] : null; },
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
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
Object.defineProperty(global, 'navigator', { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){} });
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
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';
global.lucide = { createIcons(){} };
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = {
  utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) },
  writeFile(){}, write: () => new ArrayBuffer(8)
};
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.Image = class { set src(_) {} addEventListener(){} };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });

// â”€â”€â”€ KHUNG CHáº Y TEST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.error('FAIL ' + name); }
}

const { state } = await import('../js/state.js');
const hr = await import('../js/hr.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: ['hr'], allowAdvanced: true };
state.hrAttDate = '2024-06-05';
state.hrAttMonth = '2024-06';
state.hrEmployees = [
  { id: 'empA', code: 'NV001', name: 'Nguyá»…n VÄƒn A', department: 'XÆ°á»Ÿng 1', status: 'active', skills: [], joinDate: '' },
  { id: 'empB', code: 'NV002', name: 'Tráº§n Thá»‹ B',   department: 'XÆ°á»Ÿng 2', status: 'active', skills: [] },
  { id: 'empC', code: 'NV003', name: 'LÃª VÄƒn C',     department: 'LÃ² HÆ¡i',  status: 'quit',   skills: [] }
];
state.hrPositions = [{ id: 'pos1', name: 'Ã‰p vÃ¡n', department: 'XÆ°á»Ÿng 1', note: '' }];
state.hrAttendance = [];
state.hrCheckins = [];
state.hrLeaves = [
  { id: 'leave-1', employeeId: 'empA', type: 'Nghá»‰ phÃ©p', from: '2024-07-10', to: '2024-07-10', days: 1, status: 'approved' },
  { id: 'leave-2', employeeId: 'empB', type: 'Nghá»‰ phÃ©p', from: '2024-08-01', to: '2024-08-01', days: 1, status: 'pending' }
];
state.hrOvertimes = [];
state.hrRecruitment = [{ id: 'rec1', department: 'XÆ°á»Ÿng 1', position: 'Ã‰p vÃ¡n', needQty: 3, hiredQty: 1, status: 'open' }];
state.hrPositionNeeds = [];

// â”€â”€â”€ A. MÃY TRáº NG THÃI 3 Cáº¤P â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('A1. Ban Ä‘áº§u dock ÄÃ“NG (cáº¥p 0, khÃ´ng nhÃ³m)', hr.hrDockState().level === 0 && hr.hrDockState().group === '');
check('A2. hrDockToggle má»Ÿ Cáº¤P 2 (chá»n nhÃ³m)', hr.hrDockToggle() === 1 && hr.hrDockState().level === 1);
check('A3. data-level = "1" + aria-expanded = "true"',
  document.getElementById('hr-dock').getAttribute('data-level') === '1'
  && document.getElementById('hr-dock-home').getAttribute('aria-expanded') === 'true');
check('A3b. cáº¥p 1: khá»‘i nhÃ³m HIá»†N, panel áº¨N',
  document.getElementById('hr-dock-groups').hidden === false
  && document.getElementById('hr-dock-panel').hidden === true);
check('A4. hrDockToggle láº§n 2 Ä‘Ã³ng dock', hr.hrDockToggle() === 0 && hr.hrDockState().level === 0);
check('A4b. Ä‘Ã³ng -> data-level = "0" + aria-expanded = "false"',
  document.getElementById('hr-dock').getAttribute('data-level') === '0'
  && document.getElementById('hr-dock-home').getAttribute('aria-expanded') === 'false');

check('A5. má»Ÿ nhÃ³m há»£p lá»‡ -> Cáº¤P 3 Ä‘Ãºng nhÃ³m', hr.hrDockOpenGroup('ngaycong') === true
  && hr.hrDockState().level === 2 && hr.hrDockState().group === 'ngaycong');
check('A6. cáº¥p 3: panel HIá»†N, khá»‘i nhÃ³m áº¨N',
  document.getElementById('hr-dock-panel').hidden === false
  && document.getElementById('hr-dock-groups').hidden === true);
check('A7. tiÃªu Ä‘á» panel = tÃªn nhÃ³m', document.getElementById('hr-dock-title').textContent === 'NgÃ y cÃ´ng');
check('A8. nhÃ³m KHÃ”NG há»£p lá»‡ -> false + giá»¯ nguyÃªn tráº¡ng thÃ¡i',
  hr.hrDockOpenGroup('khong-co') === false && hr.hrDockState().group === 'ngaycong');
hr.hrDockBack();
check('A9. hrDockBack quay láº¡i Cáº¤P 2', hr.hrDockState().level === 1 && hr.hrDockState().group === '');
hr.hrDockClose();
check('A10. hrDockClose vá» Cáº¤P 1 (Ä‘Ã³ng háº³n)', hr.hrDockState().level === 0);

// â”€â”€â”€ B. RENDER TAB + BADGE NHÃ“M â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let threw = false, errMsg = '';
try { hr.renderHrView(); } catch (e) { threw = true; errMsg = String((e && e.message) || e); }
check('B1. renderHrView cháº¡y khÃ´ng lá»—i khi cÃ³ dock', !threw);
if (threw) console.log('   lá»—i:', errMsg);
check('B2. váº«n cáº­p nháº­t count tháº» NhÃ¢n ViÃªn', document.getElementById('hr-mini-count-emp').textContent === '2/3 NV');
check('B3. badge Há»“ sÆ¡ = sá»‘ NV Ä‘ang lÃ m', document.getElementById('hr-dock-badge-hoso').textContent === '2 NV');
check('B4. badge NgÃ y cÃ´ng = sá»‘ Ä‘Æ¡n chá» duyá»‡t', document.getElementById('hr-dock-badge-ngaycong').textContent === '1 chá»');
check('B5. badge Tuyá»ƒn dá»¥ng = sá»‘ ngÆ°á»i cÃ²n thiáº¿u', document.getElementById('hr-dock-badge-tuyendung').textContent === 'thiáº¿u 2');
check('B6. badge cÃ³ class is-on khi cÃ³ sá»‘', document.getElementById('hr-dock-badge-hoso').classList.contains('is-on'));
check('B7. hrDockRender gá»i láº·p khÃ´ng lá»—i',
  (() => { try { hr.hrDockRender(); hr.hrDockRender(); return true; } catch (e) { return false; } })());

// â”€â”€â”€ C. Cáº¤U TRÃšC index.html â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const idx = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const idxDock = idx.slice(idx.indexOf('id="hr-dock"'), idx.indexOf('id="hr-detail-overlay"'));

check('C1. Ä‘á»§ id dock / Home / nhÃ³m / panel / tiÃªu Ä‘á» / nÃºt',
  ['hr-dock', 'hr-dock-home', 'hr-dock-groups', 'hr-dock-panel', 'hr-dock-back', 'hr-dock-close',
    'hr-dock-title', 'hr-dock-badge-hoso', 'hr-dock-badge-ngaycong', 'hr-dock-badge-thongke',
    'hr-dock-badge-tuyendung'].every(id => idx.includes(`id="${id}"`)));
const groupOrder = (idxDock.match(/data-hr-group="([a-z]+)"/g) || []).map(x => x.split('"')[1]);
check('C2. Ä‘Ãºng 4 nhÃ³m + Ä‘Ãºng thá»© tá»± Há»“ sÆ¡ â†’ NgÃ y cÃ´ng â†’ Thá»‘ng kÃª â†’ Tuyá»ƒn dá»¥ng',
  groupOrder.length === 4 && groupOrder.join(',') === 'hoso,ngaycong,thongke,tuyendung');
check('C3. Ä‘Ãºng 4 khá»‘i tháº» theo nhÃ³m',
  (idxDock.match(/data-hr-group-panel="/g) || []).length === 4);

const CARD_IDS = ['hr-emp-card', 'hr-pos-card', 'hr-att-card', 'hr-pay-card', 'hr-ci-card', 'hr-leave-card',
  'hr-ot-card', 'hr-stats-card', 'hr-att-stats-card', 'hr-worker-eval-card', 'hr-recruit-card', 'hr-posneed-card'];
const cardIds = (idxDock.match(/data-hr-card="([a-z-]+)"/g) || []).map(x => x.split('"')[1]);
check('C4. Ä‘á»§ 12 tháº» mini + Ä‘Ãºng data-hr-card',
  cardIds.length === 12 && CARD_IDS.every(id => cardIds.includes(id)));

claimOk:
{
  const a = idxDock.indexOf('data-hr-group-panel="hoso"');
  const b = idxDock.indexOf('data-hr-group-panel="ngaycong"');
  const c = idxDock.indexOf('data-hr-group-panel="thongke"');
  const d = idxDock.indexOf('data-hr-group-panel="tuyendung"');
  const e = idxDock.indexOf('id="hr-dock-home"');
  const sec = (s, t) => idxDock.slice(s, t);
  check('C5. tháº» náº±m ÄÃšNG nhÃ³m',
    sec(a, b).includes('data-hr-card="hr-emp-card"') && sec(a, b).includes('data-hr-card="hr-pos-card"') && !sec(a, b).includes('data-hr-card="hr-att-card"')
    && sec(b, c).includes('data-hr-card="hr-att-card"') && sec(b, c).includes('data-hr-card="hr-ci-card"')
    && sec(b, c).includes('data-hr-card="hr-pay-card"')
    && sec(b, c).includes('data-hr-card="hr-leave-card"') && sec(b, c).includes('data-hr-card="hr-ot-card"')
    && sec(c, d).includes('data-hr-card="hr-stats-card"') && sec(c, d).includes('data-hr-card="hr-att-stats-card"')
    && sec(d, e).includes('data-hr-card="hr-recruit-card"') && sec(d, e).includes('data-hr-card="hr-posneed-card"'));
}
check('C6. #hr-cards-grid náº±m TRONG #hr-dock-panel',
  idxDock.indexOf('id="hr-cards-grid"') > idxDock.indexOf('id="hr-dock-panel"')
  && idxDock.indexOf('id="hr-cards-grid"') < idxDock.indexOf('id="hr-dock-home"'));
check('C7. Báº£ng bá»‘ trÃ­ váº«n lÃ  ná»™i dung Máº¶C Äá»ŠNH (ngoÃ i dock, khÃ´ng bá»‹ áº©n)',
  idx.indexOf('id="hr-board-card"') > 0 && idx.indexOf('id="hr-board-card"') < idx.indexOf('id="hr-dock"')
  && !/id="hr-board-card"[^>]*hr-card-hidden/.test(idx) && !/hr-card-hidden[^>]*id="hr-board-card"/.test(idx));
check('C8. bá» nhÃ£n cá»¥m cÅ© (hr-cards-cluster) + launcher cÅ© khÃ´ng cÃ²n tháº»',
  !idx.includes('hr-cards-cluster')
  && idx.indexOf('id="hr-cards-grid"') > idx.indexOf('id="hr-dock-panel"'));
check('C9. thanh tiÃªu Ä‘á» gá»n cÃ³ Má»Ÿ Báº£ng + Xuáº¥t Excel + Lá»‹ch Sá»­',
  idx.includes('id="btn-hr-dock-open"') && idx.includes('id="btn-open-export-hr"')
  && idx.includes('id="btn-history-hr"') && idx.includes('hr-cards-overview hr-hero'));

// â”€â”€â”€ D. CSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
check('D1. dock cá»‘ Ä‘á»‹nh giá»¯a dÆ°á»›i, z-index 1200',
  /\.hr-dock\s*\{[\s\S]{0,400}?position:\s*fixed;[\s\S]{0,160}?left:\s*50%;[\s\S]{0,160}?bottom:\s*20px;[\s\S]{0,160}?z-index:\s*1200;/.test(css));
check('D2. nÃºt Home trÃ²n + gradient xanh tre',
  /\.hr-dock-home\s*\{[\s\S]{0,400}?border-radius:\s*50%;/.test(css) && css.includes('linear-gradient(135deg, #2e7d32, #15803d)'));
check('D3. khá»‘i nhÃ³m ná»n kem + viá»n tre xanh',
  /\.hr-dock-groups\s*\{[\s\S]{0,500}?border-top:\s*3px solid #a5cf95;/.test(css));
check('D4. panel dáº£i tháº» + tháº» khung tre máº£nh 6px',
  /\.hr-dock-panel\s*\{/.test(css) && /#hr-dock \.hr-mini-card\s*\{[\s\S]{0,300}?border-width:\s*6px;/.test(css));
check('D5. tab NhÃ¢n Sá»± cÃ³ padding-bottom chá»«a chá»— cho dock',
  /#hr-view\s*\{\s*padding-bottom:\s*128px;\s*\}/.test(css));
check('D6. Ä‘iá»‡n thoáº¡i: dock náº±m TRÃŠN thanh nav',
  /@media \(max-width: 959\.98px\)\s*\{[\s\S]{0,400}?bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom\)\)/.test(css));
check('D7. tÃ´n trá»ng giáº£m hiá»‡u á»©ng',
  css.includes('body[data-fx="low"] .hr-dock-ping') && css.includes('@media (prefers-reduced-motion: reduce)'));

// â”€â”€â”€ E. WIRING + PHIÃŠN Báº¢N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const mainSrc = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('E1. events ná»‘i Home / Má»Ÿ Báº£ng / NhÃ³m / Back / Close',
  evSrc.includes("safeOn('hr-dock-home'") && evSrc.includes("safeOn('btn-hr-dock-open'")
  && evSrc.includes("safeOn('hr-dock-back'") && evSrc.includes("safeOn('hr-dock-close'")
  && evSrc.includes("closest('[data-hr-group]')"));
check('E2. events cÃ³ Esc Ä‘Ã³ng dock (Æ°u tiÃªn Ä‘Ã³ng pop-up chi tiáº¿t)',
  /hrDockState\(\)\.level === 0[\s\S]{0,400}?hrDockClose\(\)/.test(evSrc));
check('E3. rá»i tab NhÃ¢n Sá»± tá»± Ä‘Ã³ng dock (main.js)',
  mainSrc.includes('hrDockClose') && /closeViewScopedModals[\s\S]{0,900}?hrDockClose/.test(mainSrc));
check('E4. sw.js cache v486', swSrc.includes('nha-may-ngoc-son-v486'));

console.log(`\nHR-DOCK: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);

