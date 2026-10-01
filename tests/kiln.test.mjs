// tests/kiln.test.mjs — BẢNG ĐIỀU KHIỂN LÒ SẤY (thẻ Than Hóa + Sấy) + THẺ
// "ĐỘ ẨM LÒ SẤY" (tab QC). Bao phủ: suy loại sấy tự động · thể tích/ngày sấy ·
// 3 màu trạng thái (xanh/vàng/xám) · ngưỡng độ ẩm đạt · load/save + mây +
// tombstone · vẽ bảng 2 hàng · khung Điều Khiển ↔ Dữ Liệu (mặc định Điều Khiển)
// · chuyển Kho nhanh (icon + kéo thả + hàm chung) · menu chạm Thêm lô (vị trí
// điền sẵn) · bảng QC nhập độ ẩm · lịch sử 7 ngày · cấu trúc HTML/CSS/sw/4 nơi.
'use strict';

// ─── Stubs môi trường (giống qc.test.mjs) ──────────────────────────
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
  update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; }
};
Chart.register = () => {};
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── IMPORT MODULES (sau khi stub xong) ────────────────────────────
const { state, STORAGE_KEY_QC_KILN_HUMIDITY, STORAGE_KEY_QC_KILN_THRESHOLD, STORAGE_KEY_X2_SAY_FRAME } = await import('../js/state.js');
const kiln = await import('../js/kiln.js');
const bm = await import('../js/batch-modals.js');
const x2 = await import('../js/xuong2.js');
const cloud = await import('../js/cloud.js');
const fsMod = await import('node:fs');

const todayIso = kiln.kilnTodayISO();
const daysAgoIso = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.batches = [
  // Lô đang ở Sấy 1 tại LS3 (5 ngày) + 1 lô ở KHO cùng vị trí (KHÔNG tính vào lò)
  { id: 'k1', code: '261001-01', stage: 'say1', date: daysAgoIso(5), location: 'LS3', length: 1250, width: 20, thickness: 10, quantity: 500, volume: 1.5, bambooType: 'A', useFor: 'Ván', stageHistory: [{ stage: 'say1', date: daysAgoIso(5) }] },
  { id: 'k1b', code: '261001-03', stage: 'kho', date: daysAgoIso(1), location: 'LS3', length: 1250, width: 20, thickness: 10, quantity: 100, volume: 0.2, stageHistory: [{ stage: 'kho', date: daysAgoIso(1) }] },
  // Lô đang ở Sấy 2 tại LS4 (2 ngày — đã qua Sấy 1 + Kho)
  { id: 'k2', code: '261001-02', stage: 'say2', date: daysAgoIso(2), location: 'LS4', length: 1250, width: 20, thickness: 10, quantity: 300, volume: 0.9, useFor: 'Bullig', stageHistory: [{ stage: 'say1', date: daysAgoIso(9) }, { stage: 'kho', date: daysAgoIso(7) }, { stage: 'say2', date: daysAgoIso(2) }] }
];

// ─── A. DỮ LIỆU LÒ: suy loại sấy · thể tích · ngày · trạng thái ──
check('DANH SÁCH LÒ: mặc định 15 lò LS1..LS15 + vị trí khai báo thêm (không trùng)',
  kiln.kilnLocations().length === 15 && kiln.kilnLocations()[0] === 'LS1' && kiln.kilnLocations()[14] === 'LS15');
state.x2LotLocations = ['Lò 16'];
check('DANH SÁCH LÒ: vị trí khai báo thêm được nối vào (16 lò)',
  kiln.kilnLocations().length === 16 && kiln.kilnLocations()[15] === 'Lò 16');
state.x2LotLocations = [];

check('LOẠI SẤY TỰ ĐỘNG: LS3 có lô Sấy 1 → "say1" (lô ở KHO cùng vị trí KHÔNG tính)',
  kiln.kilnStageOf('LS3') === 'say1' && kiln.kilnStageOf('LS4') === 'say2' && kiln.kilnStageOf('LS5') === '');
check('THỂ TÍCH + SỐ LƯỢNG LÒ: LS3 = 1,5 m³ · 500 thanh (chỉ cộng lô đang sấy)',
  Math.abs(kiln.kilnInfoOf('LS3').volume - 1.5) < 1e-9 && kiln.kilnInfoOf('LS3').qty === 500);
check('NGÀY ĐÃ SẤY: LS3 ≈ 5 ngày · LS4 ≈ 2 ngày (tính theo lần vào công đoạn HIỆN TẠI)',
  kiln.kilnInfoOf('LS3').days >= 4 && kiln.kilnInfoOf('LS3').days <= 6 &&
  kiln.kilnInfoOf('LS4').days >= 1 && kiln.kilnInfoOf('LS4').days <= 3);
check('TRẠNG THÁI XÁM: lò trống (LS5) = idle · thể tích 0',
  kiln.kilnInfoOf('LS5').status === 'idle' && kiln.kilnInfoOf('LS5').volume === 0);
check('TRẠNG THÁI XANH: đang sấy chưa đo độ ẩm (LS3) = active',
  kiln.kilnInfoOf('LS3').status === 'active' && kiln.kilnInfoOf('LS3').humidity === null);

// ─── B. ĐỘ ẨM + 3 MÀU TRẠNG THÁI ─────────────────────────────
check('UPSERT ĐỘ ẨM: lưu số đo hôm nay (id kh-<ngày>-<lò>) + đạt ngưỡng → VÀNG (ready)',
  kiln.upsertKilnReading(todayIso, 'LS3', 14) === true &&
  (state.qcKilnReadings || []).some(r => r.id === `kh-${todayIso}-LS3` && r.value === 14) &&
  kiln.kilnInfoOf('LS3').humidity === 14 && kiln.kilnInfoOf('LS3').status === 'ready');
check('CẬP NHẬT SỐ ĐO: ghi lại cùng ngày/lò → ghi đè (không nhân đôi)',
  kiln.upsertKilnReading(todayIso, 'LS3', 18) === true &&
  state.qcKilnReadings.filter(r => r.location === 'LS3').length === 1 &&
  kiln.kilnInfoOf('LS3').value !== 14 && kiln.kilnInfoOf('LS3').humidity === 18 &&
  kiln.kilnInfoOf('LS3').status === 'active'); // 18 > ngưỡng 15 → vẫn đang sấy (xanh)
check('SỐ ĐO CŨ 4 NGÀY: quá hạn 3 ngày → coi như CHƯA có độ ẩm (humidity null)',
  kiln.upsertKilnReading(daysAgoIso(4), 'LS4', 11) === true &&
  kiln.kilnInfoOf('LS4').humidity === null && kiln.kilnInfoOf('LS4').status === 'active');
check('SỐ ĐO TRONG 3 NGÀY: vẫn dùng được (LS4 đo 2 ngày trước ≤ 12% → VÀNG)',
  kiln.upsertKilnReading(daysAgoIso(2), 'LS4', 12) === true &&
  kiln.kilnInfoOf('LS4').humidity === 12 && kiln.kilnInfoOf('LS4').status === 'ready');
check('LÒ TRỐNG có số đo → vẫn XÁM (idle), không vàng',
  kiln.upsertKilnReading(todayIso, 'LS5', 10) === true && kiln.kilnInfoOf('LS5').status === 'idle');
check('XÓA SỐ ĐO: upsert giá trị rỗng → gỡ bản ghi + tombstone chặn mây',
  kiln.upsertKilnReading(todayIso, 'LS5', '') === true &&
  !state.qcKilnReadings.some(r => r.location === 'LS5') &&
  !!(state.deletedIds.qcKilnReadings || {})[`kh-${todayIso}-LS5`]);

// ─── C. NGƯỠNG ĐỘ ẨM ĐẠT ─────────────────────────────────────
check('NGƯỠNG MẶC ĐỊNH: Sấy 1 ≤ 15% · Sấy 2 ≤ 12%',
  kiln.kilnThresholdOf('say1') === 15 && kiln.kilnThresholdOf('say2') === 12);
document.getElementById('kiln-th-say1').value = '13.5';
document.getElementById('kiln-th-say2').value = '10';
kiln.handleKilnThresholdSave();
check('LƯU NGƯỠNG: Sấy 1 = 13,5% · Sấy 2 = 10% (state + localStorage)',
  state.qcKilnThresholds.say1 === 13.5 && state.qcKilnThresholds.say2 === 10 &&
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_KILN_THRESHOLD)).say1 === 13.5);
document.getElementById('kiln-th-say1').value = '120';
kiln.handleKilnThresholdSave();
check('CHẶN NGƯỠNG SAI: >100% không lưu', state.qcKilnThresholds.say1 === 13.5);
document.getElementById('kiln-th-say1').value = '15';
document.getElementById('kiln-th-say2').value = '12';
kiln.handleKilnThresholdSave();

// ─── D. LOAD / SAVE + ĐỒNG BỘ MÂY ────────────────────────────
kiln.saveKilnReadings();
check('SAVE READINGS: ghi localStorage key riêng',
  Array.isArray(JSON.parse(storeBacking.get(STORAGE_KEY_QC_KILN_HUMIDITY) || '[]')) &&
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_KILN_HUMIDITY)).length === state.qcKilnReadings.length);
state.qcKilnReadings = [];
kiln.loadKilnData();
check('LOAD KILN DATA: nạp lại readings + ngưỡng từ localStorage',
  state.qcKilnReadings.length === 3 && state.qcKilnThresholds.say1 === 15);
const snap = cloud.collectCloudSnapshot();
check('MÂY: snapshot chứa qcKilnReadings + qcKilnThresholds',
  Array.isArray(snap.qcKilnReadings) && snap.qcKilnReadings.length === 3 && snap.qcKilnThresholds.say1 === 15);
check('MÂY: cloudCore có 2 khóa mới',
  cloud.cloudCore(snap).includes('"qcKilnReadings"') && cloud.cloudCore(snap).includes('"qcKilnThresholds"'));
const kept = state.qcKilnReadings;
cloud.applyFireSnapshot({ qcKilnReadings: [{ id: 'kh-remote', date: todayIso, location: 'LS9', value: 9, updatedAt: new Date().toISOString() }], qcKilnThresholds: { say1: 14, say2: 11 } });
check('MÂY: applyFireSnapshot nhận số đo từ mây + ngưỡng theo mây',
  state.qcKilnReadings.some(r => r.id === 'kh-remote') && state.qcKilnThresholds.say1 === 14);
cloud.applyFireSnapshot({ qcKilnReadings: kept });
state.qcKilnThresholds = { say1: 15, say2: 12 }; // trả ngưỡng chuẩn cho các test sau

// ─── E. VẼ BẢNG ĐIỀU KHIỂN (2 hàng) + 3 MÀU + CHÚ GIẢI ───────
kiln.renderKilnBoard();
const boardEl = document.getElementById('x2-kiln-board');
const boardHtml = boardEl.innerHTML;
check('VẼ BẢNG LÒ: 15 thẻ · 2 hàng · xếp TỪ PHẢI SANG TRÁI (LS12 trái … LS1 phải — đúng sơ đồ xưởng)',
  (boardHtml.match(/data-kiln="/g) || []).length === 15 &&
  (boardHtml.match(/class="kiln-row"/g) || []).length === 2 &&
  boardHtml.indexOf('data-kiln="LS12"') < boardHtml.indexOf('data-kiln="LS1"') &&
  boardHtml.indexOf('data-kiln="LS1"') < boardHtml.indexOf('data-kiln="LS13"'));
check('HÀNG 2 NGƯỢC CHIỀU: LS15 bên trái → LS14 → LS13 bên phải (đúng sơ đồ)',
  boardHtml.indexOf('data-kiln="LS15"') < boardHtml.indexOf('data-kiln="LS14"') &&
  boardHtml.indexOf('data-kiln="LS14"') < boardHtml.indexOf('data-kiln="LS13"'));
check('LÒ RỘNG + LỐI ĐI: LS13/14/15 gắn class kiln-wide (x2) + dải "Lối đi" nằm GIỮA 2 hàng',
  (boardHtml.match(/kiln-wide/g) || []).length === 3 &&
  boardHtml.includes('kiln-aisle') && boardHtml.includes('Lối đi') &&
  boardHtml.indexOf('kiln-aisle') > boardHtml.indexOf('data-kiln="LS12"') &&
  boardHtml.indexOf('kiln-aisle') < boardHtml.indexOf('data-kiln="LS13"'));
check('3 MÀU TRẠNG THÁI: LS4 vàng (kiln--ready + chip Đạt ẩm) · LS3 xanh (kiln--active) · lò trống xám (kiln--idle)',
  boardHtml.includes('kiln--ready') && boardHtml.includes('kiln--active') && boardHtml.includes('kiln--idle') &&
  boardHtml.includes('Đạt ẩm'));
check('THẺ LÒ: mã lò + chip loại sấy (Sấy 1/Sấy 2) + icon Vào Kho + ngày sấy + độ ẩm',
  boardHtml.includes('data-kiln-kho="LS3"') && boardHtml.includes('kiln-stage-say1') && boardHtml.includes('kiln-stage-say2') &&
  /kiln-days/.test(boardHtml) && /kiln-hum/.test(boardHtml));
const legendHtml = document.getElementById('x2-kiln-legend').innerHTML;
check('CHÚ GIẢI: đếm trạng thái + ngưỡng đạt (Sấy 1 ≤ 15% · Sấy 2 ≤ 12%)',
  legendHtml.includes('Đang sấy') && legendHtml.includes('Đạt ẩm') && legendHtml.includes('Chưa dùng') &&
  legendHtml.includes('15%') && legendHtml.includes('12%'));

// ─── E2. DANH SÁCH NAN TRÊN THẺ LÒ (rê chuột / chạm → xem nhanh) ──
// Thêm 1 lô nữa vào LS3 để kiểm tra nhiều dòng — dòng ĐÚNG MẪU
// "1250x22x7 A SL 1500" (không mã lô, không m³/ngày/độ ẩm — đã có trên thẻ).
state.batches.push({ id: 'k1c', code: '261003-01', stage: 'say1', date: daysAgoIso(1), location: 'LS3', length: 1250, width: 22, thickness: 7, quantity: 1500, volume: 0.7, bambooType: 'A', stageHistory: [{ stage: 'say1', date: daysAgoIso(1) }] });
kiln.renderKilnBoard();
const boardHtml2 = document.getElementById('x2-kiln-board').innerHTML;
// Cắt nội dung 1 thẻ lò (từ data-kiln="LSx" tới thẻ lò kế tiếp)
function tileSliceOf(html, loc) {
  const i = html.indexOf(`data-kiln="${loc}"`);
  if (i < 0) return '';
  const j = html.indexOf('data-kiln="', i + 10);
  return html.slice(i, j < 0 ? html.length : j);
}
check('DANH SÁCH NAN: thẻ lò có pop .kiln-nan-pop — mỗi lô 1 dòng đúng mẫu "1250x22x7 A SL 1500"',
  boardHtml2.includes('kiln-nan-pop') && boardHtml2.includes('1250x22x7 A SL 1500') &&
  boardHtml2.includes('1250x20x10 A SL 500'));
check('DANH SÁCH NAN — BỎ THÔNG TIN CŨ: hết title "N lô: …" (không lặp mã lô/m³/ngày đã có trên thẻ)',
  !boardHtml2.includes(' lô: ') && !boardHtml2.includes('title="LS'));
check('DANH SÁCH NAN — LÒ TRỐNG: LS5 KHÔNG có pop danh sách (chỉ lò có lô mới hiện)',
  !tileSliceOf(boardHtml2, 'LS5').includes('kiln-nan-pop'));
// Chạm mở menu (LS3) → danh sách nằm TRONG thẻ, TRƯỚC các nút menu (không đè nút)
const tileLS3 = { getAttribute: (a) => (a === 'data-kiln' ? 'LS3' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS3 : null) } });
const htmlOpenLS3 = document.getElementById('x2-kiln-board').innerHTML; // class kiln-open nằm ở THẺ gốc (trước data-kiln)
const sliceLS3 = tileSliceOf(htmlOpenLS3, 'LS3');
check('DANH SÁCH NAN — CHẠM MỞ MENU: khối danh sách nằm TRƯỚC nút menu (Thêm lô / Vào Kho vẫn bấm được)',
  htmlOpenLS3.includes('kiln-open') && sliceLS3.includes('kiln-nan-pop') &&
  sliceLS3.indexOf('kiln-nan-pop') < sliceLS3.indexOf('kiln-menu'));
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS3 : null) } }); // chạm nữa = đóng

// ─── E3. HÀNG 2: LS13/14/15 = 2× lò thường + 6 ô "Chờ xây thêm" ──
kiln.renderKilnBoard();
const boardHtml3 = document.getElementById('x2-kiln-board').innerHTML;
check('HÀNG 2 — Ô CHỜ XÂY THÊM: đúng 6 ô kiln-todo (12 cột khớp hàng 1: 6 ô ×1 + 3 lô rộng ×2)',
  (boardHtml3.match(/class="kiln-tile kiln-todo"/g) || []).length === 6 &&
  boardHtml3.includes('Chờ xây thêm'));
check('HÀNG 2 — CĂN PHẢI: ô chờ xây đứng TRƯỚC LS15 (bên trái), LS13 nằm sau cùng (bên phải — dưới LS1+LS2)',
  boardHtml3.indexOf('kiln-todo') < boardHtml3.indexOf('data-kiln="LS15"') &&
  boardHtml3.indexOf('data-kiln="LS13"') > boardHtml3.indexOf('data-kiln="LS14"'));
check('HÀNG 2 — Ô CHỜ XÂY: KHÔNG có data-kiln (đếm lò thật vẫn 15) · không kéo thả được',
  (boardHtml3.match(/data-kiln="/g) || []).length === 15);
// Chạm ô "Chờ xây thêm" → KHÔNG mở menu (tile .kiln-todo bị chặn trong handler)
const todoTile = { getAttribute: () => null, classList: { contains: () => true } };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? todoTile : null) } });
check('HÀNG 2 — CHẠM Ô CHỜ XÂY: không mở menu (không có kiln-open trên bảng)',
  !document.getElementById('x2-kiln-board').innerHTML.includes('kiln-open'));

// ─── F. KHUNG: BẢNG ĐIỀU KHIỂN (mặc định) ↔ BẢNG DỮ LIỆU ─────
localStorage.removeItem(STORAGE_KEY_X2_SAY_FRAME);
x2.applyX2SayFrame();
check('KHUNG MẶC ĐỊNH: Bảng Điều Khiển hiện · Bảng Dữ Liệu ẩn · tab Điều Khiển active',
  document.getElementById('x2-say-frame-ctrl').hidden === false &&
  document.getElementById('x2-say-frame-data').hidden === true &&
  document.getElementById('x2-say-tab-ctrl').classList.contains('active'));
x2.switchX2SayFrame('data');
check('CHUYỂN KHUNG: bấm "Bảng Dữ Liệu" → khung dữ liệu hiện + nhớ theo máy',
  document.getElementById('x2-say-frame-data').hidden === false &&
  document.getElementById('x2-say-frame-ctrl').hidden === true &&
  storeBacking.get(STORAGE_KEY_X2_SAY_FRAME) === 'data');
x2.switchX2SayFrame('ctrl');
check('QUAY LẠI: bấm "Bảng Điều Khiển" → khung điều khiển hiện + bảng lò vẽ lại',
  document.getElementById('x2-say-frame-ctrl').hidden === false &&
  document.getElementById('x2-kiln-board').innerHTML.includes('data-kiln="LS1"'));

// ─── G. CHUYỂN KHO NHANH + MENU CHẠM THÊM LÔ ─────────────────
state.batches.push({ id: 'k9', code: '261002-09', stage: 'say1', date: daysAgoIso(1), location: 'LS6', length: 1250, width: 18, thickness: 7, quantity: 200, volume: 0.3, stageHistory: [{ stage: 'say1', date: daysAgoIso(1) }] });
const moved = bm.quickTransferLotsToKho('say1', 'LS6', todayIso);
const k9 = state.batches.find(b => b.id === 'k9');
check('CHUYỂN KHO NHANH (hàm chung): lô LS6 vào Kho · ngày hôm nay · lịch sử +kho · có undo',
  moved === 1 && k9.stage === 'kho' && k9.khoDate === todayIso &&
  k9.stageHistory.some(h => h.stage === 'kho' && h.date === todayIso) && state.undoStack.length > 0);
check('CHUYỂN KHO NHANH: lò LS6 về trạng thái XÁM (không còn lô đang sấy)',
  kiln.kilnInfoOf('LS6').status === 'idle');

// VÀO KHO CÓ ĐỔI VỊ TRÍ (prompt): nhập K99 → lô vào Kho đúng vị trí mới
state.batches.push({ id: 'k11', code: '261002-11', stage: 'say2', date: daysAgoIso(1), location: 'LS8', quantity: 50, volume: 0.08, stageHistory: [{ stage: 'say2', date: daysAgoIso(1) }] });
const oldPrompt = global.prompt;
global.prompt = () => 'K99';
const khoBtnLS8 = { getAttribute: (a) => (a === 'data-kiln-kho' ? 'LS8' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '[data-kiln-kho]' ? khoBtnLS8 : null) } });
global.prompt = oldPrompt;
const k11 = state.batches.find(b => b.id === 'k11');
check('VÀO KHO + ĐỔI VỊ TRÍ: nhập K99 ở prompt → lô LS8 vào Kho đúng vị trí mới',
  k11.stage === 'kho' && k11.location === 'K99');
// Hủy prompt → KHÔNG chuyển
state.batches.push({ id: 'k12', code: '261002-12', stage: 'say1', date: daysAgoIso(1), location: 'LS9', quantity: 10, volume: 0.02, stageHistory: [{ stage: 'say1', date: daysAgoIso(1) }] });
global.prompt = () => null;
const khoBtnLS9 = { getAttribute: (a) => (a === 'data-kiln-kho' ? 'LS9' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '[data-kiln-kho]' ? khoBtnLS9 : null) } });
global.prompt = oldPrompt;
check('VÀO KHO — HỦY PROMPT: lô vẫn ở Sấy 1 (không chuyển)',
  state.batches.find(b => b.id === 'k12').stage === 'say1');

// Menu chạm trên LÒ TRỐNG → 2 nút Thêm (Sấy 1 / Sấy 2)
const tileLS5 = { getAttribute: (a) => (a === 'data-kiln' ? 'LS5' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS5 : null) } });
let htmlLS5 = document.getElementById('x2-kiln-board').innerHTML;
check('MENU CHẠM (lò trống): hiện menu + "Thêm Sấy 1" / "Thêm Sấy 2"',
  htmlLS5.includes('kiln-menu') && htmlLS5.includes('Thêm Sấy 1') && htmlLS5.includes('Thêm Sấy 2'));
const addBtn = { getAttribute: () => 'say1' };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '[data-kiln-add]' ? addBtn : null) } });
check('THÊM LÔ TỪ LÒ: mở form Thêm Lô Sấy Mới — vị trí LS5 + công đoạn Sấy 1 điền sẵn',
  document.getElementById('modal-add-lot').classList._s.has('show') &&
  bm.alCurrentLocation() === 'LS5' && document.getElementById('al-stage').value === 'say1');
bm.closeAddLotModal();
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS5 : null) } }); // chạm nữa = đóng

// Menu trên LÒ ĐANG SẤY (LS4) → "Thêm lô" + "Vào Kho"
const tileLS4 = { getAttribute: (a) => (a === 'data-kiln' ? 'LS4' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '.kiln-tile' ? tileLS4 : null) } });
const htmlLS4 = document.getElementById('x2-kiln-board').innerHTML;
check('MENU CHẠM (lò đang sấy): có "Thêm lô" + "Vào Kho"',
  htmlLS4.includes('Thêm lô') && htmlLS4.includes('Vào Kho') && htmlLS4.includes('data-kiln-kho="LS4"'));

// KÉO THẺ LÒ thả vào ô KHO = chuyển nhanh (LS4 — lô Sấy 2)
let dragPayload = '';
kiln.kilnTileDragStart({ target: { closest: (sel) => (sel === '.kiln-tile' ? { getAttribute: () => 'LS4' } : null) }, dataTransfer: { setData: (k, v) => { dragPayload = v; }, effectAllowed: '' } });
kiln.onKilnKhoDrop({ preventDefault(){}, dataTransfer: { getData: () => dragPayload } });
check('KÉO THẢ VÀO KHO: thả thẻ lò LS4 → lô Sấy 2 vào Kho (payload đúng lò)',
  JSON.parse(dragPayload).kiln === 'LS4' && state.batches.find(b => b.id === 'k2').stage === 'kho');

// ICON kho trên thẻ lò = chuyển nhanh (LS3 — lô Sấy 1)
const khoBtnLS3 = { getAttribute: (a) => (a === 'data-kiln-kho' ? 'LS3' : null) };
kiln.onKilnBoardClick({ target: { closest: (sel) => (sel === '[data-kiln-kho]' ? khoBtnLS3 : null) } });
check('ICON VÀO KHO: bấm icon kho trên thẻ lò LS3 → lô Sấy 1 vào Kho',
  state.batches.find(b => b.id === 'k1').stage === 'kho');

// ─── H. MA TRẬN ĐỘ ẨM (tab QC — ngày × lò, tối ưu điện thoại) ─────
const savedReadings = state.qcKilnReadings;
state.qcKilnReadings = [];
check('MINI CARD: chưa nhập hôm nay → "Chưa nhập hôm nay"', kiln.kilnHumidityCardCount() === 'Chưa nhập hôm nay');
state.qcKilnReadings = savedReadings;
check('MINI CARD: có số đo hôm nay → "Hôm nay: n/… lò" (gộp 2 lần đo theo LÒ)',
  kiln.kilnHumidityCardCount().startsWith('Hôm nay:'));

// Lô đang sấy tại LS7 (Sấy 1 — ngưỡng 15) để có ô tô vàng ĐẠT ẨM trên ma trận
state.batches.push({ id: 'k10', code: '261003-10', stage: 'say1', date: daysAgoIso(3), location: 'LS7', length: 1250, width: 18, thickness: 7, quantity: 100, volume: 0.15, stageHistory: [{ stage: 'say1', date: daysAgoIso(3) }] });
// Số đo CŨ ĐỊNH DẠNG CŨ (không có slot) tại LS7 — 3 ngày trước, đạt ngưỡng → Lần 1
state.qcKilnReadings.push({ id: `kh-${daysAgoIso(3)}-LS7`, date: daysAgoIso(3), location: 'LS7', value: 14, createdAt: '', updatedAt: '' });

kiln.renderKilnHumidityCard();
const mx = document.getElementById('kiln-hum-matrix').innerHTML;
check('MA TRẬN: 15 hàng lò · 14 ngày (mỗi ngày 2 cột L1/L2) · 30 ô nhập hôm nay (15 lò × 2 lần)',
  (mx.match(/class="km-kiln"/g) || []).length === 15 &&
  (mx.match(/class="km-day/g) || []).length === 14 &&
  (mx.match(/class="km-input"/g) || []).length === 30);
check('MA TRẬN — HÔM NAY TRÁI NHẤT: chip "Hôm nay" đứng trước mọi ô ngày cũ, ngày càng cũ càng sang phải',
  mx.includes('km-today-chip') &&
  mx.indexOf('km-today-chip') < mx.indexOf('data-km-date=') &&
  mx.indexOf(`data-km-date="${daysAgoIso(1)}"`) < mx.indexOf(`data-km-date="${daysAgoIso(2)}"`));
check('MA TRẬN — BỎ THEO YÊU CẦU: không còn cột "Đang chứa" / lịch sử riêng / ô chọn ngày',
  !mx.includes('Đang chứa') && !mx.includes('data-kiln-hum-load'));
check('MA TRẬN — ĐẠT ẨM: số đo ≤ ngưỡng loại sấy tô vàng (km-ok) + số cũ không slot hiểu Lần 1 + giá trị điền sẵn',
  mx.includes('km-ok') && mx.includes('data-kiln-hum="LS7"') && mx.includes('value="18"'));
check('MA TRẬN — NGƯỠNG: điền sẵn Sấy 1 = 15% · Sấy 2 = 12%',
  String(document.getElementById('kiln-th-say1').value) === '15' &&
  String(document.getElementById('kiln-th-say2').value) === '12');

// LƯU HÔM NAY: điền L1 LS1 = "14,5" (dấu phẩy) · L2 LS1 = 13 · L1 LS2 = trống (xóa)
const kmInputs = [];
const mkInput = (loc, slot, val) => Object.assign(makeEl(`km-${loc}-${slot}`), {
  getAttribute: (a) => (a === 'data-kiln-hum' ? loc : (a === 'data-kiln-slot' ? String(slot) : null)),
  value: val
});
kmInputs.push(mkInput('LS1', 1, '14,5'));
kmInputs.push(mkInput('LS1', 2, '13'));
kmInputs.push(mkInput('LS2', 1, ''));
const realQSA = document.querySelectorAll;
document.querySelectorAll = (sel) => (String(sel).includes('.km-input') ? kmInputs : realQSA(sel));
kiln.saveKilnHumidityForm();
document.querySelectorAll = realQSA;
const rL1 = state.qcKilnReadings.find(r => r.id === `kh-${todayIso}-LS1`);
const rL2 = state.qcKilnReadings.find(r => r.id === `kh-${todayIso}-LS1-s2`);
check('LƯU HÔM NAY: L1 nhận "14,5" = 14.5 (giữ id cũ) · L2 tạo id -s2 · ô trống không tạo số',
  rL1 && rL1.value === 14.5 && Number(rL1.slot) === 1 &&
  rL2 && rL2.value === 13 && Number(rL2.slot) === 2 &&
  !state.qcKilnReadings.some(r => r.location === 'LS2' && r.date === todayIso));
check('LƯU HÔM NAY: ghi localStorage + mini card đếm "Hôm nay: 2/… lò" (LS3 cũ + LS1 mới)',
  JSON.parse(storeBacking.get(STORAGE_KEY_QC_KILN_HUMIDITY) || '[]').some(r => r.id === `kh-${todayIso}-LS1-s2`) &&
  kiln.kilnHumidityCardCount().startsWith('Hôm nay: 2/'));

// SỬA Ô QUÁ KHỨ: bấm ô LS2 — 3 ngày trước (Lần 1) → prompt nhập 11
const cellLS2 = { getAttribute: (a) => ({ 'data-km-cell': 'LS2', 'data-km-date': daysAgoIso(3), 'data-km-slot': '1' }[a] || null) };
const oldPrompt2 = global.prompt;
global.prompt = () => '11';
kiln.onKilnMatrixClick({ target: { closest: (sel) => (sel === '[data-km-cell]' ? cellLS2 : null) } });
check('MA TRẬN — SỬA Ô QUÁ KHỨ: prompt nhập 11 → lưu đúng (ngày, lò, Lần 1)',
  state.qcKilnReadings.some(r => r.date === daysAgoIso(3) && r.location === 'LS2' && Number(r.slot || 1) === 1 && r.value === 11));
// Ô quá khứ — SỐ SAI (250) bị chặn
global.prompt = () => '250';
kiln.onKilnMatrixClick({ target: { closest: (sel) => (sel === '[data-km-cell]' ? cellLS2 : null) } });
check('MA TRẬN — CHẶN SAI: 250 ngoài 0–100 → không lưu',
  !state.qcKilnReadings.some(r => r.location === 'LS2' && r.value === 250));
// Ô quá khứ — để trống = XÓA (tombstone)
global.prompt = () => '';
kiln.onKilnMatrixClick({ target: { closest: (sel) => (sel === '[data-km-cell]' ? cellLS2 : null) } });
global.prompt = oldPrompt2;
check('MA TRẬN — XÓA Ô: để trống → gỡ số đo + tombstone',
  !state.qcKilnReadings.some(r => r.date === daysAgoIso(3) && r.location === 'LS2') &&
  !!(state.deletedIds.qcKilnReadings || {})[`kh-${daysAgoIso(3)}-LS2`]);

// ─── I. CẤU TRÚC (index.html · styles.css · sw.js · 4 nơi nối dữ liệu) ───
const idxHtml = fsMod.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssHtml = fsMod.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const swJs = fsMod.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const jsState = fsMod.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const jsStorage = fsMod.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const jsCloud = fsMod.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const jsHistory = fsMod.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const jsMain = fsMod.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const jsEvents = fsMod.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
check('CẤU TRÚC (index.html): 2 tab chuyển khung + 2 khung + bảng lò + ô Kho + chú giải',
  idxHtml.includes('id="x2-say-tab-ctrl"') && idxHtml.includes('id="x2-say-tab-data"') &&
  idxHtml.includes('id="x2-say-frame-ctrl"') && idxHtml.includes('id="x2-say-frame-data"') &&
  idxHtml.includes('id="x2-kiln-board"') && idxHtml.includes('id="x2-kiln-kho-drop"') &&
  idxHtml.includes('id="x2-kiln-legend"'));
check('CẤU TRÚC (index.html): thẻ QC "Độ Ẩm Lò Sấy" — launcher + ngưỡng + MA TRẬN (đã bỏ lịch sử / cột Đang chứa / ô chọn ngày)',
  idxHtml.includes('data-qc-card="qc-humidity-card"') && idxHtml.includes('id="qc-humidity-card"') &&
  idxHtml.includes('id="kiln-th-say1"') && idxHtml.includes('id="kiln-th-say2"') &&
  idxHtml.includes('id="btn-kiln-th-save"') && idxHtml.includes('id="btn-kiln-hum-save"') &&
  idxHtml.includes('id="kiln-hum-matrix"') && idxHtml.includes('id="qc-mini-count-humidity"') &&
  !idxHtml.includes('id="kiln-hum-history-rows"') && !idxHtml.includes('id="kiln-hum-date"') &&
  !idxHtml.includes('id="kiln-hum-rows"') && !idxHtml.includes('Đang chứa (lô'));
check('CẤU TRÚC (styles.css): khung ẩn + 3 màu + chip đạt ẩm + menu + lối đi + lò rộng + MA TRẬN (sticky cột Lò · highlight hôm nay · ô nhập số)',
  cssHtml.includes('.x2-say-frame[hidden]') && cssHtml.includes('.kiln-tile.kiln--active') &&
  cssHtml.includes('.kiln-tile.kiln--ready') && cssHtml.includes('.kiln-tile.kiln--idle') &&
  cssHtml.includes('.kiln-ready-chip') && cssHtml.includes('.kiln-menu') &&
  cssHtml.includes('.kiln-legend') && cssHtml.includes('.kiln-kho-drop.kiln-drop-over') &&
  cssHtml.includes('.kiln-aisle') && cssHtml.includes('.kiln-tile.kiln-wide') &&
  cssHtml.includes('.kiln-hum-matrix-wrap') && cssHtml.includes('.km-kiln') &&
  cssHtml.includes('.km-today-chip') && cssHtml.includes('.km-input') && cssHtml.includes('.km-ok'));
check('CẤU TRÚC (styles.css): DANH SÁCH NAN trên thẻ lò — pop hover (media hover:hover) + khối tĩnh khi mở menu',
  cssHtml.includes('.kiln-nan-pop') && cssHtml.includes('@media (hover: hover)') &&
  cssHtml.includes('.kiln-tile.kiln-open .kiln-nan-pop') && cssHtml.includes('.kiln-nan-line'));
check('CẤU TRÚC (styles.css): pop NỔI TRÊN CÙNG (hover có z-index:40) + hàng 2 căn phải + lô rộng 2× (calc) + ô chờ xây',
  /\.kiln-tile:hover \{ transform:[^}]*z-index: 40;/.test(cssHtml) &&
  /\.kiln-row\.kiln-row-2\s*\{[^}]*justify-content: flex-end|\.kiln-row:last-child \{ justify-content: flex-end; \}/.test(cssHtml) &&
  cssHtml.includes('calc((100% - 11 * 8px) / 6 + 8px)') &&
  cssHtml.includes('.kiln-tile.kiln-todo'));
check('CẤU TRÚC (sw.js): CACHE_NAME v191 + js/kiln.js trong APP_SHELL',
  /nha-may-ngoc-son-v191/.test(swJs) && swJs.includes("'./js/kiln.js'"));
check('CẤU TRÚC (js): key riêng + nối đủ state/storage/cloud/history/main/events',
  jsState.includes('bamboo_tracker_qc_kiln_humidity_v1') && jsState.includes('bamboo_tracker_qc_kiln_threshold_v1') &&
  jsState.includes('bamboo_tracker_x2_say_frame_v1') && jsStorage.includes('restoreQcKilnReadings') &&
  jsStorage.includes('qcKilnThresholds') && jsCloud.includes('qcKilnReadings') &&
  jsHistory.includes('qcKilnReadings') && jsMain.includes('loadKilnData') &&
  jsEvents.includes('x2-say-tab-ctrl') && jsEvents.includes('btn-kiln-hum-save') &&
  jsEvents.includes('x2-kiln-kho-drop') && jsEvents.includes('kiln-hum-matrix'));

console.log(`\nKẾT QUẢ: ${passed} pass, ${failed} fail`);
if (failed) process.exit(1);


