// _smoke_esm.js — kiểm thử headless bộ 14 ES modules sau khi tách
'use strict';

function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', src: '', href: '', title: '',
    files: [], options: [], selectedOptions: [], selectedIndex: 0, draggable: false,
    dataset: {}, style: {}, offsetWidth: 800, offsetHeight: 500,
    classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    removeEventListener(){}, dispatchEvent(){ return true; },
    _h: {},
    appendChild(c) { return c; }, removeChild(c) { return c; }, insertBefore(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    scrollIntoView(){}, scrollTo(){}, focus(){}, blur(){}, click(){},
    getContext: () => ctxStub(),
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
      if (typeof k === 'string' && ['canvas'].includes(k)) return makeEl();
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
  createEvent: () => ({ initEvent(){} }),
  escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
function defGlobal(k, v) { try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch { global[k] = v; } }
defGlobal('navigator', {
  onLine: true, userAgent: 'node-smoke', language: 'vi',
  clipboard: { writeText: async () => {} }, serviceWorker: { register: async () => ({ update(){}, addEventListener(){} }) }
});
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
const storeBacking = new Map();
function storeShim() {
  return {
    getItem: (k) => (storeBacking.has(k) ? storeBacking.get(k) : null),
    setItem: (k, v) => { storeBacking.set(k, String(v)); },
    removeItem: (k) => { storeBacking.delete(k); },
    clear: () => storeBacking.clear(),
    key: (i) => [...storeBacking.keys()][i] ?? null,
    get length() { return storeBacking.size; }
  };
}
global.localStorage = storeShim();
global.sessionStorage = storeShim();
// Node không có EventTarget cấp global như trình duyệt
const gHandlers = {};
global.addEventListener = (t, f) => { (gHandlers[t] = gHandlers[t] || []).push(f); };
global.removeEventListener = () => {};
global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global;
global.self = global;
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.CSS = global.CSS || { escape: (s) => s.replace(/[^a-zA-Z0-9_-]/g, '\\$&'), supports: () => false };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; this.options = (cfg && cfg.options) || {}; this.scales = {}; this.canvas = makeEl(); this.width = 800; this.height = 500; }
  update(){} resize(){} destroy(){} render(){} reset(){} stop(){} toBase64Image(){ return ''; } getDatasetMeta(){ return { data: [], controller: null }; }
};
Chart.register = () => {};
global.lucide = { createIcons(){} };
global.XLSX = {
  utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) },
  writeFile(){}, write: () => new ArrayBuffer(8)
};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

(async () => {
  try {
    await import('../js/main.js');
    // Bắn sự kiện DOMContentLoaded để chạy luồng khởi động thật
    for (const f of docHandlers['DOMContentLoaded'] || []) f({ preventDefault(){} });
    const app = global.window.app;
    if (!app) throw new Error('window.app không tồn tại sau khi boot');
    const nExports = Object.keys(app).length;
    console.log('BOOT OK - exports:', nExports);
    if (nExports < 25) throw new Error('exports quá ít: ' + nExports);

    // Gọi thử một số API đại diện các module khác nhau (lỗi riêng lẻ chỉ WARN)
    const tryCall = (label, fn, ...args) => {
      try { fn && fn(...args); console.log('OK   ' + label); }
      catch (e) { console.log('WARN ' + label + ': ' + (e && e.message)); }
    };
    tryCall('undoLastAction', app.undoLastAction);
    tryCall('forecastAssumeWeek', () => app.forecastAssumeWeek());
    tryCall('removePressLine', () => app.removePressLine(makeEl()));
    if (typeof app.uploadLocalDataToCloud !== 'function') throw new Error('thiếu uploadLocalDataToCloud');
    console.log('API CALLS DONE');
    process.exit(0);
  } catch (e) {
    console.error('SMOKE FAIL:', e && e.stack || e);
    process.exit(1);
  }
})();
