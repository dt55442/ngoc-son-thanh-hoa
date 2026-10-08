// tests/dashboard-pv-merge.test.mjs — Kiểm thử THẺ GỘP 2 BIỂU ĐỒ ở tab Tổng Quan:
// 1. "Kế Hoạch vs Đã Ép (Theo Sản Phẩm)" + "Khả Năng Đáp Ứng Kế Hoạch" nằm trong
//    MỘT thẻ duy nhất (#plan-vs-press-card) — thẻ #plan-capacity-card cũ đã XÓA.
// 2. NÚT CHUYỂN ĐỔI = CHÍNH TÊN BIỂU ĐỒ (#pv-mode-toggle): chỉ hiện tên của biểu
//    đồ đang xem; bấm nút là biểu đồ + tên + thanh công cụ đổi CÙNG NHAU.
// 3. Hiệu ứng nút: NỔI lên khi xem Kế Hoạch vs Đã Ép (data-pv-mode="plan",
//    gradient tím→lục), THỤT vào khi xem Khả Năng Đáp Ứng (data-pv-mode="cap",
//    gradient chàm→lam + bóng inset); khung biểu đồ trồi/lún khi đổi.
// 4. Chỉ vẽ biểu đồ ĐANG xem; chế độ nhớ theo máy (bamboo_tracker_pv_chart_mode_v1).
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống than-hoa.test.mjs) ───────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ctxStub(),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
function ctxStub() {
  return new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
      return () => undefined;
    },
    set() { return true; }
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
// Chart stub: đếm số lần tạo instance để kiểm tra "chỉ vẽ biểu đồ đang xem"
let chartCreated = 0;
global.Chart = class { constructor(c, g) { this.ctx = c; this.config = g; this.data = (g && g.data) || { labels: [], datasets: [] }; chartCreated++; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){} });

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}

const { state, STORAGE_KEY_PV_CHART_MODE } = await import('../js/state.js');
const press = await import('../js/press.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'dashboard-view';

// ─── Dữ liệu mẫu: 1 sản phẩm có định mức + kế hoạch tuần hiện tại ───
// LƯU Ý: planningItems.week dùng định dạng "Tuần N" (getWeekNumber đọc nhãn tiếng Việt)
const curYear = String(new Date().getFullYear());
state.materialRates = [{ id: 'p1', product: 'Ván 1200x382x9', nan1: 10 }];
state.planningItems = [
  { id: 'pl1', productId: 'p1', year: curYear, week: 'Tuần 40', qty: 100 }
];

// ─── 1. HÀNH VI: mặc định chỉ vẽ biểu đồ KẾ HOẠCH vs ĐÃ ÉP ───
check('MẶC ĐỊNH: state.pvChartMode = "plan" (không đọc localStorage khi render)', state.pvChartMode === 'plan');
press.renderPlanVsPressChart();
check('MẶC ĐỊNH: vẽ biểu đồ Kế Hoạch vs Đã Ép (planVsPressInstance được tạo)', !!state.planVsPressInstance);
check('MẶC ĐỊNH: KHÔNG vẽ biểu đồ Khả Năng Đáp Ứng (planCapacityInstance rỗng)', state.planCapacityInstance == null);
check('MẶC ĐỊNH: thẻ có data-pv-mode="plan"', document.getElementById('plan-vs-press-card').dataset.pvMode === 'plan');
check('MẶC ĐỊNH: nút tên hiện đúng TÊN biểu đồ Kế Hoạch vs Đã Ép', document.getElementById('pv-mode-label').textContent === 'Kế Hoạch vs Đã Ép (Theo Sản Phẩm)');
check('MẶC ĐỊNH: toolbar Kế Hoạch hiện · toolbar Khả Năng + gợi ý + khung Khả Năng ĐANG ẨN',
  document.getElementById('pv-toolbar-plan').hidden === false &&
  document.getElementById('pv-toolbar-cap').hidden === true &&
  document.getElementById('pv-cap-hint-row').hidden === true &&
  document.getElementById('pv-chart-box-plan').hidden === false &&
  document.getElementById('pv-chart-box-cap').hidden === true);
const planInstanceBefore = state.planVsPressInstance;

// ─── 2. HÀNH VI: setPvChartMode('cap') → đổi biểu đồ + tên + công cụ CÙNG NHAU ───
press.setPvChartMode('cap');
check('CHUYỂN ĐỔI: state.pvChartMode = "cap" + lưu localStorage (nhớ theo máy)',
  state.pvChartMode === 'cap' && localStorage.getItem(STORAGE_KEY_PV_CHART_MODE) === 'cap');
check('CHUYỂN ĐỔI: nút tên hiện đúng TÊN biểu đồ Khả Năng Đáp Ứng Kế Hoạch',
  document.getElementById('pv-mode-label').textContent === 'Khả Năng Đáp Ứng Kế Hoạch');
check('CHUYỂN ĐỔI: thẻ có data-pv-mode="cap" (CSS nút THỤT vào + đổi icon gauge)',
  document.getElementById('plan-vs-press-card').dataset.pvMode === 'cap');
check('CHUYỂN ĐỔI: vẽ biểu đồ Khả Năng Đáp Ứng (planCapacityInstance được tạo)', !!state.planCapacityInstance);
check('CHUYỂN ĐỔI: hoán đổi toolbar + gợi ý màu + 2 khung canvas',
  document.getElementById('pv-toolbar-plan').hidden === true &&
  document.getElementById('pv-toolbar-cap').hidden === false &&
  document.getElementById('pv-cap-hint-row').hidden === false &&
  document.getElementById('pv-chart-box-plan').hidden === true &&
  document.getElementById('pv-chart-box-cap').hidden === false);
const capInstanceAfter = state.planCapacityInstance;

// ─── 3. HÀNH VI: render biểu đồ ĐANG ẨN thì BỎ QUA (không vẽ lại) ───
state.planVsPressInstance = planInstanceBefore;
press.renderPlanVsPressChart(); // đang ở chế độ 'cap' → phải return sớm
check('GUARD: renderPlanVsPressChart() khi đang xem Khả Năng → KHÔNG dựng lại instance',
  state.planVsPressInstance === planInstanceBefore);
press.togglePlanVsPressMode(); // quay về 'plan'
check('ĐẢO CHIỀU: togglePlanVsPressMode() quay lại "plan" + dựng lại biểu đồ Kế Hoạch',
  state.pvChartMode === 'plan' && !!state.planVsPressInstance && state.planVsPressInstance !== planInstanceBefore);
check('ĐẢO CHIỀU: biểu đồ Khả Năng GIỮ nguyên instance (chỉ ẩn, không hủy)',
  state.planCapacityInstance === capInstanceAfter);
press.togglePlanVsPressMode(); // sang 'cap' lần nữa
check('ĐẢO CHIỀU: toggle lần nữa sang "cap" — biểu đồ Khả Năng được dựng LẠI (canvas đã đổi kích thước)',
  state.pvChartMode === 'cap' && !!state.planCapacityInstance && state.planCapacityInstance !== capInstanceAfter);
check('HIỆU ỨNG: khung vừa hiện được gắn class trồi/lún (pv-sink-in khi xem Khả Năng)',
  document.getElementById('pv-chart-box-cap').classList.contains('pv-sink-in'));

// ─── 4. HÀNH VI: loadPvChartMode đọc lại chế độ đã nhớ ───
state.pvChartMode = 'plan';
localStorage.setItem(STORAGE_KEY_PV_CHART_MODE, 'cap');
check('NHỚ THEO MÁY: loadPvChartMode() nạp "cap" từ localStorage', press.loadPvChartMode() === 'cap');
state.pvChartMode = 'plan'; // giả lập máy KHÔNG có chế độ đã lưu
localStorage.setItem(STORAGE_KEY_PV_CHART_MODE, 'trash-value');
check('NHỚ THEO MÁY: giá trị lạ → bỏ qua, giữ nguyên trạng thái hiện tại ("plan")', press.loadPvChartMode() === 'plan');
press.applyPvChartModeDom();
check('ĐỒNG BỘ DOM: applyPvChartModeDom() cập nhật nhãn + data-pv-mode theo state',
  document.getElementById('pv-mode-label').textContent === 'Kế Hoạch vs Đã Ép (Theo Sản Phẩm)' &&
  document.getElementById('plan-vs-press-card').dataset.pvMode === 'plan');

// ─── 5. CẤU TRÚC: index.html — chỉ còn 1 thẻ, đủ nút/toolbar/khung ───
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssHtml = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const jsPress = fs.readFileSync(new URL('../js/press.js', import.meta.url), 'utf8');
const jsState = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsEvents = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const jsDash = fs.readFileSync(new URL('../js/dashboard.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): 2 biểu đồ nằm trong MỘT thẻ #plan-vs-press-card (có data-pv-mode)',
  idxHtml.includes('id="plan-vs-press-card"') && idxHtml.includes('data-pv-mode="plan"'));
check('CẤU TRÚC (index.html): thẻ cũ #plan-capacity-card đã XÓA HẲN',
  !idxHtml.includes('id="plan-capacity-card"'));
check('CẤU TRÚC (index.html): nút chuyển đổi = TÊN biểu đồ (#pv-mode-toggle + #pv-mode-label + icon ⇄)',
  idxHtml.includes('id="pv-mode-toggle"') && idxHtml.includes('id="pv-mode-label"') &&
  idxHtml.includes('pv-mode-swap') && idxHtml.includes('pv-mode-ico-plan') && idxHtml.includes('pv-mode-ico-cap'));
check('CẤU TRÚC (index.html): 2 canvas + 2 toolbar + dòng gợi ý màu đều còn nguyên id cũ',
  idxHtml.includes('id="plan-vs-press-chart"') && idxHtml.includes('id="plan-capacity-chart"') &&
  idxHtml.includes('id="pv-toolbar-plan"') && idxHtml.includes('id="pv-toolbar-cap"') &&
  idxHtml.includes('id="pv-cap-hint-row"') && idxHtml.includes('id="pv-chart-box-plan"') &&
  idxHtml.includes('id="pv-chart-box-cap"') &&
  idxHtml.includes('id="pv-cap-year-filter"') && idxHtml.includes('id="pv-cap-prev"') &&
  idxHtml.includes('id="pv-cap-window-label"') && idxHtml.includes('id="pv-cap-next"'));
check('CẤU TRÚC (index.html): toolbar Khả Năng + khung Khả Năng + gợi ý màu khởi đầu ở trạng thái hidden',
  /id="pv-toolbar-cap" hidden/.test(idxHtml) &&
  /id="pv-cap-hint-row" hidden/.test(idxHtml) &&
  /id="pv-chart-box-cap" hidden/.test(idxHtml));

// ─── 6. CẤU TRÚC: styles.css — nút NỔI / THỤT + hiệu ứng đổi biểu đồ ───
check('CẤU TRÚC (styles.css): nút tên biểu đồ .pv-mode-btn + gradient tím→lục (Kế Hoạch vs Đã Ép)',
  cssHtml.includes('.pv-mode-btn') && cssHtml.includes('#7c3aed') && cssHtml.includes('#16a34a') &&
  cssHtml.includes('pvModeShift'));
check('CẤU TRÚC (styles.css): đang xem Khả Năng → nút THỤT vào (data-pv-mode="cap" + bóng inset + chàm→lam)',
  cssHtml.includes('#plan-vs-press-card[data-pv-mode="cap"] .pv-mode-btn') &&
  cssHtml.includes('inset 0 4px') && cssHtml.includes('#4338ca') && cssHtml.includes('#0ea5e9'));
check('CẤU TRÚC (styles.css): hiệu ứng đổi biểu đồ trồi/lún (pvChartRise + pvChartSink + pv-rise-in/pv-sink-in)',
  cssHtml.includes('@keyframes pvChartRise') && cssHtml.includes('@keyframes pvChartSink') &&
  cssHtml.includes('.pv-rise-in') && cssHtml.includes('.pv-sink-in'));
check('CẤU TRÚC (styles.css): hidden của toolbar/khung/gợi ý THẮNG display:flex (rule tường minh !important)',
  cssHtml.includes('.pv-toolbar[hidden],') && cssHtml.includes('display: none !important'));
check('CẤU TRÚC (styles.css): tôn trọng chế độ giảm hiệu ứng (data-fx="low")',
  cssHtml.includes('body[data-fx="low"] .pv-mode-btn'));

// ─── 7. CẤU TRÚC: js — guard theo state.pvChartMode + nối sự kiện + resize đúng biểu đồ ───
check('CẤU TRÚC (press.js): 2 hàm render TỰ BỎ QUA khi không phải chế độ đang xem',
  jsPress.includes("if (state.pvChartMode !== 'plan') return;") &&
  jsPress.includes("if (state.pvChartMode !== 'cap') return;"));
check('CẤU TRÚC (press.js): chế độ nhớ theo máy (STORAGE_KEY_PV_CHART_MODE) + hiệu ứng trồi/lún',
  jsPress.includes('STORAGE_KEY_PV_CHART_MODE') && jsPress.includes('pv-rise-in') && jsPress.includes('pv-sink-in'));
check('CẤU TRÚC (state.js): key riêng cho chế độ biểu đồ (bamboo_tracker_pv_chart_mode_v1)',
  jsState.includes('bamboo_tracker_pv_chart_mode_v1'));
check('CẤU TRÚC (events.js): bấm nút TÊN biểu đồ → togglePlanVsPressMode()',
  jsEvents.includes("safeOn('pv-mode-toggle', 'click', () => togglePlanVsPressMode())"));
check('CẤU TRÚC (dashboard.js): nạp chế độ đã nhớ trước khi vẽ + resize theo CHẾ ĐỘ ĐANG XEM',
  jsDash.includes('loadPvChartMode();') && jsDash.includes("state.pvChartMode === 'cap'"));
check('CẤU TRÚC (press.js): hiệu ứng trượt cửa sổ tuần Khả Năng dùng khung MỚI (#pv-chart-box-cap)',
  jsPress.includes("document.getElementById('pv-chart-box-cap')"));
check('CẤU TRÚC (sw.js): đã tăng CACHE_NAME (PWA không dùng cache cũ)',
  /nha-may-ngoc-son-v226/.test(swJs));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

