// tests/qc-press.test.mjs — THẺ "NHẬT KÝ THEO DÕI ÉP VÁN" (tab QC — js/qc-press.js).
// Bao phủ: tên/số lượng ƯU TIÊN ô Ván Thô → fallback ô Thành Phẩm · đổi keo/phụ
// gia KG → GAM · tỷ lệ pha trộn "100g - 12g" · độ phủ = (keo + phụ gia) ÷ SL ·
// verdict PASS/Fail 1-1 (ghi đè) + lưu localStorage · lọc PASS/Fail/chưa kiểm ·
// tìm nhanh · render thẻ ngày (nhãn PASS NGHIÊNG + 2 nút ✅/❌) · mini card ·
// cấu trúc (index.html · qc.js · events.js · state/storage/cloud/history/main ·
// sw.js v226 · styles.css · package.json).
'use strict';

// ─── Stubs môi trường (giống qc-final.test.mjs) ──────────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    parentElement: null,
    appendChild(c) { if (c && typeof c === 'object') c.parentElement = el; return c; },
    removeChild(c) { if (c && typeof c === 'object') c.parentElement = null; return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
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
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';
global.lucide = { createIcons(){} };
global.Chart = class {
  constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; }
  update(){} resize(){} destroy(){} render(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}
const approx = (a, b) => Math.abs(a - b) < 1e-6;

// ─── IMPORT MODULES (sau khi stub xong) ────────────────────────────────
const { state, STORAGE_KEY_QC_PRESS } = await import('../js/state.js');
const qcp = await import('../js/qc-press.js');
const fsMod = await import('node:fs');

// ─── DỮ LIỆU GIẢ ───────────────────────────────────────────────
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true, fullname: 'Quản Trị' };
state.pressRecords = [
  // p1: chỉ điền Thành Phẩm (ván thô qty=0 → fallback Thành phẩm)
  { id: 'p1', date: '2026-09-22', productId: 'sp1', productName: 'Ván 1220x2440x9', fpDim: '1220x2440x9',
    finishedQty: 300, vanTho: [{ vtDim: '1220x2440x9', vtQty: 0 }], sticks: [],
    forceH: 18, forceV: 22, tempC: 120, pressMin: 25, glue: 2.5, additive: 0.25, glueName: 'Keo UF', additiveName: 'Bột mì' },
  // p2: CÓ ván thô > 0 → PHẢI ưu tiên ván thô (kể cả khi có thành phẩm)
  { id: 'p2', date: '2026-09-24', productId: 'sp1', productName: 'Ván 1220x2440x9', fpDim: '1220x2440x9',
    finishedQty: 200, vanTho: [{ vtDim: '1200x600x12', vtQty: 150 }], sticks: [],
    forceH: 20, forceV: 24, tempC: 125, pressMin: 30, glue: 0.1, additive: 0.012, glueName: 'Keo UF', additiveName: 'Bột mì' },
  // p3: không ván thô → Thành phẩm (thiếu thông số/keo → hiện "—")
  { id: 'p3', date: '2026-09-30', productId: 'sp2', productName: 'Bullig 1200x300x50', fpDim: '',
    finishedQty: 120, vanTho: [], sticks: [], forceH: 0, forceV: 0, tempC: 0, pressMin: 0, glue: 0, additive: 0 },
  // p4: cùng ngày p3 (gom thẻ ngày) + chỉ có ván thô
  { id: 'p4', date: '2026-09-30', productId: 'sp2', productName: '', fpDim: '',
    finishedQty: 0, vanTho: [{ vtDim: '1220x2440x9', vtQty: 80 }], sticks: [],
    forceH: 16, forceV: 20, tempC: 118, pressMin: 22, glue: 0.1, additive: 0.012, glueName: '', additiveName: '' }
];
state.qcPressLogs = [];
qcp.loadQcPressLogs();

// ═══ A. TÊN + SỐ LƯỢNG ƯU TIÊN VÁN THÔ ═══
console.log('--- A. TÊN + SỐ LƯỢNG (ưu tiên Ván Thô) ---');
check('TÊN: p2 CÓ ván thô > 0 → lấy ván thô "1200x600x12" (150), KHÔNG lấy thành phẩm',
  (() => { const d = qcp.qcPressNameQtyOf(state.pressRecords[1]); return d.source === 'vanTho' && d.name === '1200x600x12' && d.qty === 150; })());
check('TÊN: p1 ván thô qty=0 → fallback Thành Phẩm (300)',
  (() => { const d = qcp.qcPressNameQtyOf(state.pressRecords[0]); return d.source === 'thanhPham' && d.qty === 300; })());
check('TÊN: p3 không ván thô → Thành Phẩm "Bullig 1200x300x50" (120)',
  (() => { const d = qcp.qcPressNameQtyOf(state.pressRecords[2]); return d.source === 'thanhPham' && d.name === 'Bullig 1200x300x50'; })());
check('TÊN: p4 chỉ có ván thô → ván thô "1220x2440x9" (80)',
  (() => { const d = qcp.qcPressNameQtyOf(state.pressRecords[3]); return d.source === 'vanTho' && d.qty === 80; })());

// ═══ B. ĐƠN VỊ: KG → GAM · TỶ LỆ · ĐỘ PHỦ ═══
console.log('--- B. GAM · TỶ LỆ PHA TRỘN · ĐỘ PHỦ ---');
const d2 = qcp.qcPressDisplay(state.pressRecords[1]);
check('GAM: keo 0.1kg → 100g · phụ gia 0.012kg → 12g', d2.glueG === 100 && d2.additiveG === 12);
check('TỶ LỆ: đúng dạng "100g - 12g"', d2.mixText === '100g - 12g');
check('ĐỘ PHỦ: (100+12)g ÷ 150 thanh ván thô', approx(d2.coverage, 112 / 150));
check('ĐỘ PHỦ p4: (100+12) ÷ 80 = 1,4 g/tấm', approx(qcp.qcPressDisplay(state.pressRecords[3]).coverage, 1.4));
const d3 = qcp.qcPressDisplay(state.pressRecords[2]);
check('THIẾU keo/phụ gia → tỷ lệ "—" · độ phủ null', d3.mixText === '—' && d3.coverage === null);
check('THÔNG SỐ KT: p1 đọc đủ lực ép ngang/đứng · nhiệt độ · thời gian',
  (() => { const d = qcp.qcPressDisplay(state.pressRecords[0]); return d.forceH === 18 && d.forceV === 22 && d.tempC === 120 && d.pressMin === 25; })());

// ═══ C. VERDICT 1-1 (ghi đè) + LƯU ═══
console.log('--- C. VERDICT PASS/FAIL 1-1 + LƯU ---');
check('CHẤM PASS: tạo 1 log mới + ghi localStorage', (() => {
  const ok = qcp.setQcPressVerdict('p2', 'pass');
  return ok && state.qcPressLogs.length === 1 && state.qcPressLogs[0].verdict === 'pass' &&
    JSON.parse(storeBacking.get(STORAGE_KEY_QC_PRESS) || '[]').length === 1;
})());
check('MINI CARD: "1/4 đã kiểm"', qcp.qcPressCardCount() === '1/4 đã kiểm');
check('CHẤM LẠI: vẫn 1 log (1 lượt 1 kết quả) → ghi đè thành fail', (() => {
  qcp.setQcPressVerdict('p2', 'fail');
  return state.qcPressLogs.length === 1 && qcp.qcPressVerdictOf('p2') === 'fail';
})());
check('LƯỢT ÉP KHÔNG TỒN TẠI → chặn + không tạo log', (() => {
  const n = state.qcPressLogs.length;
  return qcp.setQcPressVerdict('p999', 'pass') === false && state.qcPressLogs.length === n;
})());
check('CHẤM PASS p1 → 2 log, p3 chưa kiểm', (() => {
  qcp.setQcPressVerdict('p1', 'pass');
  return state.qcPressLogs.length === 2 && qcp.qcPressVerdictOf('p1') === 'pass' && qcp.qcPressVerdictOf('p3') === '';
})());
check('NGƯỜI KIỂM snapshot vào log (checkedBy = fullname + checkedAt)',
  state.qcPressLogs.every(l => l.checkedBy === 'Quản Trị' && !!l.checkedAt));
check('LƯU: localStorage khớp state.qcPressLogs',
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_PRESS) || '[]').length === state.qcPressLogs.length);

// ═══ D. LỌC + TÌM NHANH ═══
console.log('--- D. LỌC PASS/FAIL/CHƯA KIỂM + TÌM ---');
check('LỌC mặc định: đủ 4 lượt ép', qcp.qcPressRowsFiltered().length === 4);
check('LỌC "unchecked": chỉ p3 + p4', (() => {
  qcp.setQcPressFilter('unchecked');
  const ids = qcp.qcPressRowsFiltered().map(r => r.id).sort().join(',');
  qcp.setQcPressFilter('all');
  return ids === 'p3,p4';
})());
check('LỌC "pass": chỉ p1', (() => {
  qcp.setQcPressFilter('pass');
  const ids = qcp.qcPressRowsFiltered().map(r => r.id).join(',');
  qcp.setQcPressFilter('all');
  return ids === 'p1';
})());
check('TÌM "bullig" → chỉ 1 dòng (bỏ hoa/thường + dấu)', (() => {
  qcp.setQcPressSearchQ('BULLIG');
  const n = qcp.qcPressRowsFiltered().length;
  qcp.setQcPressSearchQ('');
  return n === 1;
})());

// ═══ E. RENDER THẺ NGÀY + NHÃN PASS ═══
console.log('--- E. RENDER: thẻ ngày · nhãn PASS nghiêng · nút ✅/❌ ---');
qcp.renderQcPressCard();
const statsHtml = document.getElementById('qcp-stats').innerHTML;
check('THỐNG KÊ: Lượt ép · Đã kiểm · PASS · Fail · Chưa kiểm',
  statsHtml.includes('Lượt ép') && statsHtml.includes('Đã kiểm') && statsHtml.includes('PASS') &&
  statsHtml.includes('Fail') && statsHtml.includes('Chưa kiểm'));
check('ĐẾM: chip đầu bảng "4/4 lượt ép"', document.getElementById('qcp-day-count').textContent === '4/4 lượt ép');
const dayHtml = document.getElementById('qcp-day-cards').innerHTML;
check('THẺ NGÀY: gom theo ngày + đếm PASS/Fail trong ngày',
  dayHtml.includes('x2-day-card') && dayHtml.includes('PASS: <strong>1</strong>') && dayHtml.includes('Fail: <strong>1</strong>'));
check('BẢNG: hiện tỷ lệ "100g - 12g" + cột Độ phủ "g/tấm"',
  dayHtml.includes('100g - 12g') && dayHtml.includes('g/tấm'));
check('BẢNG: đủ tiêu đề (Lực ép ngang/đứng · Nhiệt độ · Thời gian ép · QC kiểm)',
  dayHtml.includes('Lực ép ngang') && dayHtml.includes('Lực ép đứng') && dayHtml.includes('Nhiệt độ') &&
  dayHtml.includes('Thời gian ép') && dayHtml.includes('QC kiểm'));
check('NHÃN: PASS nghiêng (.qcp-stamp-pass) trên dòng đã chấm',
  dayHtml.includes('qcp-stamp-pass') && dayHtml.includes('>PASS</span>'));
check('NHÃN: Fail + 2 nút ✅/❌ (data-qcp-verdict) bọc data-perm="qc"',
  dayHtml.includes('qcp-stamp-fail') && dayHtml.includes('data-qcp-verdict="pass"') &&
  dayHtml.includes('data-qcp-verdict="fail"') && dayHtml.includes('data-perm="qc"'));
check('CHƯA KIỂM: dòng p3/p4 hiện "Chưa kiểm"',
  dayHtml.includes('qcp-stamp-none') && dayHtml.includes('Chưa kiểm'));
check('CHIP NGUỒN: "Ván thô" (ưu tiên) + "TP" (fallback Thành phẩm)',
  dayHtml.includes('qcp-src-tag') && dayHtml.includes('qcp-src-fp'));
check('RỖNG: xóa hết lượt ép → hướng dẫn nhập ở Ép Ván', (() => {
  const keep = state.pressRecords.slice();
  state.pressRecords = [];
  qcp.renderQcPressTable();
  const empty = document.getElementById('qcp-day-cards').innerHTML.includes('Chưa có lượt ép nào');
  state.pressRecords = keep;
  qcp.renderQcPressTable();
  return empty;
})());
check('ỦY QUYỀN: click nút ✅/❌ trong bảng → onQcPressTableClick trả về true', (() => {
  const ev = { target: { closest: (sel) => sel === '[data-qcp-verdict]'
    ? { getAttribute: (a) => a === 'data-qcp-id' ? 'p3' : 'pass' } : null } };
  return qcp.onQcPressTableClick(ev) === true && qcp.qcPressVerdictOf('p3') === 'pass';
})());

// ═══ F. CẤU TRÚC CÁC FILE ═══
console.log('--- F. CẤU TRÚC (index · qc · events · 6 chỗ nối · sw · css · package) ---');
const idxHtml = fsMod.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const qcJs = fsMod.readFileSync(new URL('../js/qc.js', import.meta.url), 'utf8');
const evJs = fsMod.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const stJs = fsMod.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const stoJs = fsMod.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const clJs = fsMod.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const hiJs = fsMod.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const mnJs = fsMod.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const swJs = fsMod.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cssHtml = fsMod.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const pkgJson = fsMod.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
check('index.html: launcher qc-press-card + thẻ (qcp-stats · qcp-day-cards · qcp-search · qcp-filter)',
  idxHtml.includes('data-qc-card="qc-press-card"') && idxHtml.includes('id="qc-press-card"') &&
  idxHtml.includes('id="qcp-stats"') && idxHtml.includes('id="qcp-day-cards"') &&
  idxHtml.includes('id="qcp-search"') && idxHtml.includes('id="qcp-filter"') &&
  idxHtml.includes('id="qc-mini-count-press"'));
check('qc.js: import qc-press + QC_CARD_DEFS có qc-press-card + render trong renderQcView',
  qcJs.includes("from './qc-press.js'") && qcJs.includes("'qc-press-card':") && qcJs.includes('renderQcPressCard();'));
check('events.js: wire ô tìm + phễu + ủy quyền nút PASS/Fail',
  evJs.includes("safeOn('qcp-search', 'input'") && evJs.includes("safeOn('qcp-filter', 'change'") &&
  evJs.includes('onQcPressTableClick'));
check('state.js: key bamboo_tracker_qc_press_v1 + state.qcPressLogs + export',
  stJs.includes('bamboo_tracker_qc_press_v1') && stJs.includes('qcPressLogs: []') &&
  stJs.includes('STORAGE_KEY_QC_PRESS,'));
check('storage.js: restoreQcPressLogs (gộp file/backup) + snapshot 2 đường + export',
  stoJs.includes('function restoreQcPressLogs') && stoJs.includes('restoreQcPressLogs(loaded.qcPressLogs)') &&
  stoJs.includes('restoreQcPressLogs(imported.qcPressLogs)') && stoJs.includes('qcPressLogs: state.qcPressLogs') &&
  stoJs.includes('restoreQcPressLogs,'));
check('cloud.js: snapshot + cloudCore + gộp khi nhận + persistAllLocal + applyFireSnapshot',
  clJs.includes('qcPressLogs: state.qcPressLogs') && clJs.includes('qcPressLogs: obj.qcPressLogs') &&
  clJs.includes('state.qcPressLogs = m(') && clJs.includes('STORAGE_KEY_QC_PRESS') &&
  clJs.includes("state.qcPressLogs = clean('qcPressLogs'"));
check('history.js: miền qcPressLogs thuộc tab qc',
  hiJs.includes('qcPressLogs:') && hiJs.includes("label: 'Nhật ký ép ván (QC kiểm)'"));
check('main.js: loadQcPressLogs lúc boot', mnJs.includes('loadQcPressLogs'));
check('sw.js: CACHE_NAME v226 + js/qc-press.js vào APP_SHELL',
  /nha-may-ngoc-son-v229/.test(swJs) && swJs.includes("'./js/qc-press.js'"));
check('styles.css: launcher hồng + stamp PASS NGHIÊNG (font-style: italic) + nút ✅/❌',
  cssHtml.includes('qc-press-card') && cssHtml.includes('.qcp-stamp-pass') &&
  cssHtml.includes('font-style: italic') && cssHtml.includes('.qcp-check-pass') &&
  cssHtml.includes('.qcp-check-fail'));
check('package.json: có trong chuỗi npm test', pkgJson.includes('tests/qc-press.test.mjs'));

console.log(`\nKẾT QUẢ: ${passed} pass, ${failed} fail`);
if (failed > 0) process.exit(1);

