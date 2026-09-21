// tests/ai-fab-drag.test.mjs — Kiểm thử nút AI KÉO DI CHUYỂN ĐƯỢC (js/ai.js):
// giữ + rê (Pointer Events) để di chuyển nút, ngưỡng 6px phân biệt chạm/kéo,
// kẹp trong khung nhìn, lưu/khôi phục vị trí localStorage dạng tỉ lệ.
'use strict';

// ─── Stubs môi trường (giống ai.test.mjs) ──────────────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    focus(){}, click(){}, reset(){}, select(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function fire(el, type, ev) { (el._h[type] || []).forEach((f) => f(ev)); }
// Rect của nút phản chiếu vị trí style.left/top (như trình duyệt thật),
// rơi về vị trí gốc 100/200 khi chưa từng đặt style
function patchRect(btn, origLeft, origTop) {
  btn.getBoundingClientRect = () => ({
    left: parseFloat(btn.style.left) || origLeft, top: parseFloat(btn.style.top) || origTop,
    width: 48, height: 48, right: (parseFloat(btn.style.left) || origLeft) + 48, bottom: (parseFloat(btn.style.top) || origTop) + 48
  });
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
global.innerWidth = 400; global.innerHeight = 600; // khung nhìn mô phỏng
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── IMPORT & GẮN KÉO ──────────────────────────────────────────────
// Nút gốc: đang ở vị trí trái 100 / trên 200 (rect 48×48)
const btn = makeEl('btn-open-ai');
patchRect(btn, 100, 200);
els.set('btn-open-ai', btn);
const ai = await import('../js/ai.js');
ai.initAiFabDrag();

check('init: đã gắn đúng 1 bộ sự kiện pointerdown', (btn._h['pointerdown'] || []).length === 1);
check('init: chưa từng kéo → giữ vị trí CSS mặc định', btn.style.left === undefined);

// ─── 1) CHẠM NHẸ (dưới ngưỡng 6px) → KHÔNG phải kéo, KHÔNG chặn click ──
fire(btn, 'pointerdown', { button: 0, pointerId: 7, clientX: 110, clientY: 210, cancelable: true });
fire(btn, 'pointermove', { pointerId: 7, clientX: 112, clientY: 212, cancelable: true });
check('chạm nhẹ (2px): không đổi vị trí', btn.style.left === undefined);
fire(btn, 'pointerup', { pointerId: 7 });
check('chạm nhẹ: cờ kéo KHÔNG bật (click mở modal bình thường)', ai.aiFabDragConsumed() === false);

// ─── 2) KÉO THẬT (vượt ngưỡng) → dời nút + lưu vị trí + chặn click ──
fire(btn, 'pointerdown', { button: 0, pointerId: 1, clientX: 110, clientY: 210, cancelable: true });
fire(btn, 'pointermove', { pointerId: 1, clientX: 112, clientY: 212, cancelable: true }); // ~2.8px — còn trong ngưỡng
check('kéo trong ngưỡng: chưa dời', btn.style.left === undefined);
fire(btn, 'pointermove', { pointerId: 1, clientX: 200, clientY: 260, cancelable: true }); // +90/+50 → 190/250
check('kéo: nút dời tới left=190px', btn.style.left === '190px');
check('kéo: nút dời tới top=250px', btn.style.top === '250px');
check('kéo: nút đổi kiểu right/bottom thành auto', btn.style.right === 'auto' && btn.style.bottom === 'auto');
check('kéo: có class hiệu ứng ai-fab-dragging', btn.classList.contains('ai-fab-dragging'));
fire(btn, 'pointerup', { pointerId: 1 });
check('thả tay: bỏ class ai-fab-dragging', !btn.classList.contains('ai-fab-dragging'));
const saved = JSON.parse(global.localStorage.getItem('bamboo_tracker_ai_fab_pos_v1') || '{}');
check('thả tay: đã lưu tỉ lệ fx ≈ 190/352', typeof saved.fx === 'number' && Math.abs(saved.fx - 190 / 352) < 1e-9);
check('thả tay: đã lưu tỉ lệ fy ≈ 250/552', typeof saved.fy === 'number' && Math.abs(saved.fy - 250 / 552) < 1e-9);
check('sau kéo: click sinh ra bị CHẶN (không mở modal)', ai.aiFabDragConsumed() === true);
check('cờ chặn chỉ dùng 1 lần rồi tự xoá', ai.aiFabDragConsumed() === false);

// ─── 3) KÉO TRÀN MÉP → bị kẹp trong khung nhìn 400×600 ────────────
fire(btn, 'pointerdown', { button: 0, pointerId: 2, clientX: 150, clientY: 250, cancelable: true });
fire(btn, 'pointermove', { pointerId: 2, clientX: 900, clientY: 900, cancelable: true });
check('kéo tràn: kẹp mép phải (344px = 400−48−8)', btn.style.left === '344px');
check('kéo tràn: kẹp mép dưới (544px = 600−48−8)', btn.style.top === '544px');
fire(btn, 'pointercancel', { pointerId: 2 });
const saved2 = JSON.parse(global.localStorage.getItem('bamboo_tracker_ai_fab_pos_v1') || '{}');
check('huỷ kéo (pointercancel): không ghi đè chỗ đã lưu', Math.abs(saved2.fx - 190 / 352) < 1e-9);

// ─── 4) CHUỘT PHẢI không kéo nút ───────────────────────────────────
fire(btn, 'pointerdown', { button: 2, pointerId: 3, clientX: 200, clientY: 300, cancelable: true });
fire(btn, 'pointermove', { pointerId: 3, clientX: 350, clientY: 500, cancelable: true });
check('chuột phải: bỏ qua, nút đứng yên', btn.style.left === '344px');
fire(btn, 'pointerup', { pointerId: 3 });

// ─── 5) TẢI LẠI TRANG → khôi phục đúng vị trí đã lưu ──────────────
const btn2 = makeEl('btn-open-ai'); // phần tử mới — chưa có style inline
patchRect(btn2, 100, 200);
els.set('btn-open-ai', btn2);
ai.initAiFabDrag();
check('tải lại: nút trở về đúng chỗ đã kéo (190/250)', btn2.style.left === '190px' && btn2.style.top === '250px');
check('tải lại: chống gắn trùng — vẫn đúng 1 bộ sự kiện', (btn2._h['pointerdown'] || []).length === 1);

console.log(`\nKết quả: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
