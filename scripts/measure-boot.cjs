// ═══════════════════════════════════════════════════════════════
// scripts/measure-boot.cjs — ĐO THỜI GIAN BOOT (công cụ phát triển)
// KHÔNG nằm trong chuỗi npm test (dễ flaky — xem quy tắc 41).
// Dựng stub DOM như tests/smoke.mjs, nạp js/main.js, bắn DOMContentLoaded,
// đo: thời gian nạp module + thời gian boot. Chạy: node scripts/measure-boot.cjs
// ═══════════════════════════════════════════════════════════════
'use strict';
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', src: '', href: '', title: '', files: [],
    options: [], selectedOptions: [], selectedIndex: 0, draggable: false, dataset: {}, style: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    removeEventListener(){}, dispatchEvent(){ return true; }, _h: {},
    appendChild(c) { return c; }, removeChild(c) { return c; }, insertBefore(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [], closest: () => null, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    scrollIntoView(){}, scrollTo(){}, focus(){}, blur(){}, click(){}, getContext: () => ctxStub(),
    animate(){ return { cancel(){} }; }
  };
  return el;
}
function ctxStub() {
  const grad = { addColorStop(){} };
  return new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (typeof k === 'string' && k === 'canvas') return makeEl();
      return () => undefined;
    },
    set() { return true; }
  });
}
const els = new Map();
const docHandlers = {};
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(t, f) { (docHandlers[t] = docHandlers[t] || []).push(f); },
  removeEventListener(){}, exitFullscreen(){}, fullscreenElement: null,
  createEvent: () => ({ initEvent(){} }), escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
let navigatorStub = {
  onLine: true, userAgent: 'node-measure', language: 'vi',
  clipboard: { writeText: async () => {} },
  serviceWorker: { register: async () => ({ update(){}, addEventListener(){} }) }
};
try { Object.defineProperty(global, 'navigator', { value: navigatorStub, configurable: true, writable: true }); }
catch (e) { try { Object.defineProperty(globalThis, 'navigator', { value: navigatorStub, configurable: true, writable: true }); } catch (e2) { navigatorStub = global.navigator; } }
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
const backing = new Map();
const storeShim = () => ({
  getItem: (k) => (backing.has(k) ? backing.get(k) : null),
  setItem: (k, v) => { backing.set(k, String(v)); },
  removeItem: (k) => { backing.delete(k); },
  clear: () => backing.clear(),
  key: (i) => [...backing.keys()][i] ?? null,
  get length() { return backing.size; }
});
global.localStorage = storeShim();
global.sessionStorage = storeShim();
global.window = global;
if (typeof global.addEventListener !== 'function') global.addEventListener = () => {};
if (typeof global.removeEventListener !== 'function') global.removeEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
global.CustomEvent = class { constructor(n, o) { this.type = n; Object.assign(this, o || {}); } };
global.MouseEvent = class { constructor(n, o) { this.type = n; Object.assign(this, o || {}); } };
global.FileReader = class { readAsArrayBuffer(){} readAsDataURL(){} };
global.Blob = class {};
global.fetch = async () => ({ ok: true, json: async () => ({}) });
global.alert = () => {}; global.confirm = () => false; global.prompt = () => null;
try { Object.defineProperty(global, 'navigator', { value: global.navigator, configurable: true, writable: true }); } catch (e) { /* Node đã cho getter — giữ nguyên */ }
global.Chart = class { constructor(){ this.data = { labels: [], datasets: [] }; this.options = {}; this.scales = {}; this.canvas = makeEl(); this.width = 800; this.height = 500; }
  update(){} resize(){} destroy(){} render(){} reset(){} stop(){} toBase64Image(){ return ''; } getDatasetMeta(){ return { data: [], controller: null }; } };
Chart.register = () => {};
global.lucide = { createIcons(){} };
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

(async () => {
  try {
    const t0 = performance.now();
    // Seed dữ liệu để boot không phải đường rỗng hoàn toàn (gần thực tế hơn):
    const batches = [];
    for (let i = 0; i < 300; i++) batches.push({ id: 'b' + i, code: '26' + String(i).padStart(6, '0'), stage: 'kho', quantity: 1000 + i, volume: 0.1, length: 1250, width: 18, thickness: 7 });
    backing.set('bamboo_tracker_data_v3', JSON.stringify(batches));
    const tImport0 = performance.now();
    await import('../js/main.js');
    const tImport1 = performance.now();
    const tBoot0 = performance.now();
    for (const f of docHandlers['DOMContentLoaded'] || []) await f({ preventDefault(){} });
    const tBoot1 = performance.now();
    if (!global.window.app) throw new Error('window.app không tồn tại sau khi boot');
    console.log('NẠP MODULE : ' + (tImport1 - tImport0).toFixed(1) + ' ms');
    console.log('BOOT       : ' + (tBoot1 - tBoot0).toFixed(1) + ' ms');
    console.log('TỔNG       : ' + (tBoot1 - t0).toFixed(1) + ' ms');
    process.exit(0);
  } catch (e) {
    console.error('MEASURE FAIL:', e && e.stack || e);
    process.exit(1);
  }
})();