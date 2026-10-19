// tests/x2-form-keep-selection.test.mjs — GIỮ LỰA CHỌN CỦA Ô CHỌN NGUỒN
// (18/10/2026) · Lỗi thực tế: đang điền form thì thẻ chi tiết được VẼ LẠI
// (renderAll khi đồng bộ mây / chuyển tab / bấm Đồng Bộ Ngay…) → các hàm
// fill*Options dựng lại <option> → trình duyệt đặt selectedIndex = 0 ⇒ ô chọn
// TỰ NHẢY VỀ DÒNG ĐẦU (lô MỚI NHẤT) + ô số lượng bị ghi đè.
//
// Kiểm thử:
//  · STUB mô phỏng ĐÚNG hành vi trình duyệt: gán innerHTML ⇒ value = option đầu.
//  · 4 thẻ Xưởng 2 (Cắt Chọn · Bốc Luồng · Bổ Ống · Chọn Nan Thô) + Cắt Ống Xưởng 1
//    giữ nguyên lựa chọn khi thẻ được vẽ lại (cả khi danh sách đổi).
//  · Bổ Ống: KHÔNG ghi đè "KL Ống Bổ" đã nhập; vẫn tự điền khi ĐỔI LÔ / ô trống.
//  · Lô đã hết tồn → mới rơi về option đầu (đúng nghiệp vụ).
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống tests/xuong2-bo-ong.test.mjs) ──────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    reset(){}, focus(){}, click(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
// Ô CHỌN thật: mỗi lần gán innerHTML, trình duyệt dựng lại danh sách option và
// CHỌN option ĐẦU TIÊN (selectedIndex = 0) — đây chính là nguồn gốc lỗi
// "tự nhảy về dòng mới nhất trên cùng". Stub phải mô phỏng để kiểm thử đúng.
function makeSelect(id) {
  const el = makeEl(id);
  let html = '';
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return html; },
    set(v) {
      html = String(v == null ? '' : v);
      const vals = [...html.matchAll(/<option[^>]*value="([^"]*)"/g)].map(m => m[1]);
      el.value = vals.length ? vals[0] : '';   // ← trình duyệt: chọn option ĐẦU
    }
  });
  return el;
}
const SELECT_IDS = new Set([
  'x2-cut-material', 'x2-blg-material', 'x2-bo-ong-cut', 'x2-cn-baotho',
  'x1-cat-ong-material', 'x1-say-sinh-source', 'x1-boc-source',
  'x1-loc-ong-src', 'x1-cat-mat-src', 'x1-bo-src', 'x1-phoi-say-src', 'x1-loc-thanh-src'
]);
const els = new Map();
function elOf(id) {
  if (!els.has(id)) els.set(id, SELECT_IDS.has(id) ? makeSelect(id) : makeEl(id));
  return els.get(id);
}
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { return elOf(id); },
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
global.fetch = async () => ({ ok: false, status: 0, statusText: 'offline-stub', json: async () => ({}), text: async () => '' });
global.Image = class { set src(_) {} addEventListener(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };


let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}

const { state } = await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };
state.activeView = 'kanban-view';

// ─── Dữ liệu mẫu ────────────────────────────────────────────────
// 3 NHÓM LÔ TÁCH RỜI để không lẫn danh sách của nhau:
//  · cutmat-* = lô Xưởng 2 CHƯA cắt (nguồn của thẻ Cắt Chọn)
//  · blgmat-* = lô chứa "Luồng cây" (nguồn của thẻ Bốc Luồng)
//  · ongmat-* = lô ĐÃ cắt → 2 LÔ ỐNG cut-1/cut-2 (nguồn của thẻ Bổ Ống)
state.materialRecords = [
  { id: 'cutmat-1', type: 'Ống tròn loại 1', supplier: 'Nhà Tế', location: 'xuong-2', inputIndex: 1200, outputIndex: 200, weight: 1000, date: '2026-09-08', createdAt: '2026-09-08T02:00:00.000Z' },
  { id: 'cutmat-2', type: 'Ống tròn loại 2', supplier: 'Nhà Trung', location: 'xuong-2', inputIndex: 800, outputIndex: 0, weight: 800, date: '2026-09-09', createdAt: '2026-09-09T02:00:00.000Z' },
  { id: 'blgmat-1', type: 'Luồng cây khô', supplier: 'Nhà Tế', location: 'xuong-2', inputIndex: 900, outputIndex: 0, weight: 900, date: '2026-09-05', createdAt: '2026-09-05T02:00:00.000Z' },
  { id: 'blgmat-2', type: 'Luồng cây tươi', supplier: 'Nhà Trung', location: 'xuong-2', inputIndex: 700, outputIndex: 0, weight: 700, date: '2026-09-06', createdAt: '2026-09-06T02:00:00.000Z' },
  { id: 'ongmat-1', type: 'Ống luồng A', supplier: 'Nhà Tế', location: 'xuong-2', inputIndex: 1000, outputIndex: 0, weight: 1000, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'ongmat-2', type: 'Ống luồng B', supplier: 'Nhà Trung', location: 'xuong-2', inputIndex: 800, outputIndex: 0, weight: 800, date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' }
];
// 2 LÔ ỐNG của Cắt Chọn (cut-2 MỚI HƠN ⇒ đứng đầu ô chọn Bổ Ống)
state.xuong2CutRecords = [
  { id: 'cut-1', materialId: 'ongmat-1', materialType: 'Ống luồng A', supplier: 'Nhà Tế', date: '2026-09-10', inputWeight: 1000, klOngLuong: 400, klCuiDot: 100, klCayLoai: 150, createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'cut-2', materialId: 'ongmat-2', materialType: 'Ống luồng B', supplier: 'Nhà Trung', date: '2026-09-11', inputWeight: 800, klOngLuong: 300, klCuiDot: 50, klCayLoai: 100, createdAt: '2026-09-11T02:00:00.000Z' }
];
state.xuong2BoOngRecords = [];
state.xuong2BoluongRecords = [];
state.xuong2ChonNanThoRecords = [];
state.xuong2BaoThoRecords = [
  { id: 'bt-1', boOngIds: ['bo-1'], date: '2026-09-12', dais: [1250], rongs: [18], thicks: [7], createdAt: '2026-09-12T02:00:00.000Z' }
];
state.hrAssignments = [];
state.x2BoOngRates = {};
state.x2BoluongRates = {};
state.x1CatOngRecords = [];
state.x1CatOngEditId = null;

const x2 = await import('../js/xuong2.js');

console.log('--- A. CẮT CHỌN: giữ lô đang chọn khi thẻ vẽ lại ---');
// 1. Vẽ thẻ → ô chọn đứng ở lô MỚI NHẤT (cutmat-2)
x2.renderXuong2CutCard();
const selCut = document.getElementById('x2-cut-material');
check('A1: lần vẽ đầu — ô chọn ở lô MỚI NHẤT (cutmat-2)', selCut.value === 'cutmat-2');
check('A2: danh sách có cả 2 lô chờ cắt', selCut.innerHTML.includes('cutmat-1') && selCut.innerHTML.includes('cutmat-2'));
// 2. Người dùng CHỌN lô cũ hơn (cutmat-1)
selCut.value = 'cutmat-1';
// 3. Thẻ được vẽ lại (giả lập renderAll khi đồng bộ mây) — danh sách KHÔNG đổi
x2.renderXuong2CutCard();
check('A3: vẽ lại (danh sách y nguyên) — KHÔNG nhảy về lô mới nhất', selCut.value === 'cutmat-1');
// 4. Dữ liệu đổi (thêm 1 lô mới hơn) ⇒ danh sách đổi ⇒ vẫn phải giữ lựa chọn
state.materialRecords.push({
  id: 'cutmat-3', type: 'Ống tròn tươi', supplier: 'Nhà Lâm', location: 'xuong-2',
  inputIndex: 600, outputIndex: 100, weight: 500, date: '2026-09-20', createdAt: '2026-09-20T02:00:00.000Z'
});
x2.renderXuong2CutCard();
check('A4: vẽ lại khi CÓ lô mới hơn — vẫn giữ lô đang chọn (cutmat-1)', selCut.value === 'cutmat-1');
check('A5: danh sách đã cập nhật lô mới (cutmat-3 đứng đầu)', selCut.innerHTML.indexOf('cutmat-3') < selCut.innerHTML.indexOf('cutmat-1'));

console.log('--- B. BỐC LUỒNG: giữ lô "Luồng cây" đang chọn ---');
x2.renderXuong2BoluongCard();
const selBlg = document.getElementById('x2-blg-material');
check('B1: ô chọn Bốc Luồng chỉ có lô "Luồng cây" + đứng ở lô mới nhất (blgmat-2)', selBlg.value === 'blgmat-2');
selBlg.value = 'blgmat-1';
state.materialRecords.push({
  id: 'blgmat-3', type: 'Luồng cây tươi', supplier: 'Nhà Sơn', location: 'xuong-2',
  inputIndex: 400, outputIndex: 0, weight: 400, date: '2026-09-21', createdAt: '2026-09-21T02:00:00.000Z'
});
x2.renderXuong2BoluongCard();
check('B2: vẽ lại khi có lô mới — vẫn giữ lô đang chọn (blgmat-1)', selBlg.value === 'blgmat-1');
check('B3: danh sách đã cập nhật lô mới (blgmat-3 đứng đầu)', selBlg.innerHTML.indexOf('blgmat-3') < selBlg.innerHTML.indexOf('blgmat-1'));

console.log('--- C. BỔ ỐNG: giữ lô + KHÔNG ghi đè KL đã nhập ---');
x2.renderX2BoOngCard();
const selOng = document.getElementById('x2-bo-ong-cut');
const ongQty = () => document.getElementById('x2-bo-ong-bo').value;
check('C1: ô chọn Bổ Ống đứng ở lô mới nhất (cut-2) + tự điền KL = phần còn lại (300)',
  selOng.value === 'cut-2' && ongQty() === '300');
// Người dùng chọn lô cũ (cut-1) → handler 'change' của events.js
selOng.value = 'cut-1';
x2.updateXuong2BoOngLinked(true);
check('C2: ĐỔI LÔ → vẫn tự điền KL Ống Bổ = phần còn lại của lô mới chọn (400)', ongQty() === '400');
// Người dùng gõ số khác
document.getElementById('x2-bo-ong-bo').value = '123';
// Thẻ được vẽ lại (đồng bộ mây) — dữ liệu KHÔNG đổi
x2.renderX2BoOngCard();
check('C3: vẽ lại (danh sách y nguyên) — lô ống KHÔNG nhảy về lô mới nhất', selOng.value === 'cut-1');
check('C4: vẽ lại — KHÔNG ghi đè KL Ống Bổ đang nhập (giữ 123)', ongQty() === '123');
// Dữ liệu đổi: thêm lô ống mới hơn ⇒ danh sách đổi ⇒ vẫn giữ lựa chọn + số đã nhập
state.xuong2CutRecords.push({
  id: 'cut-9', materialId: 'mat-b', materialType: 'Luồng ống', supplier: 'Nhà Trung',
  date: '2026-09-22', inputWeight: 500, klOngLuong: 200, klCuiDot: 0, klCayLoai: 0,
  createdAt: '2026-09-22T02:00:00.000Z'
});
x2.renderX2BoOngCard();
check('C5: vẽ lại khi CÓ lô ống mới hơn — vẫn giữ lô đang chọn (cut-1)', selOng.value === 'cut-1');
check('C6: vẫn giữ KL đã nhập (123) dù danh sách đổi', ongQty() === '123');
// Lô đang chọn bị bổ HẾT (hết tồn) → mới rơi về option đầu
state.xuong2BoOngRecords.push({
  id: 'tmp-full', cutId: 'cut-1', date: '2026-10-01', inputOng: 400, klOngLoai: 0, klOngBo: 400,
  createdAt: '2026-10-01T02:00:00.000Z'
});
x2.renderX2BoOngCard();
check('C7: lô đã bổ hết → rơi về lô còn tồn MỚI NHẤT (cut-9), không giữ lô đã hết',
  selOng.value === 'cut-9');
check('C8: rơi sang lô khác ⇒ tự điền lại KL theo lô mới (200)', ongQty() === '200');
// Ô KL trống (vừa "Làm Mới Form") → vẫn tự điền như cũ
document.getElementById('x2-bo-ong-bo').value = '';
selOng.value = 'cut-2';
x2.updateXuong2BoOngLinked(true);
check('C9: ô KL đang TRỐNG → tự điền phần còn lại (300)', ongQty() === '300');

console.log('--- C2. ĐANG SỬA một lượt: vẽ lại KHÔNG đổi lô của bản ghi ---');
// Lượt bổ ống của lô cut-2 → mở chế độ SỬA rồi để thẻ bị vẽ lại (đồng bộ mây).
// Trước khi sửa: lô nhảy về lô mới nhất ⇒ bấm Lưu sẽ ghi lượt sang SAI LÔ.
state.xuong2BoOngRecords.push({
  id: 'r-edit', cutId: 'cut-2', date: '2026-10-02', inputOng: 100, klOngLoai: 0, klOngBo: 100,
  createdAt: '2026-10-02T02:00:00.000Z'
});
x2.renderX2BoOngCard();
x2.editXuong2BoOng('r-edit');
check('C10: vào SỬA → ô chọn trỏ đúng lô của lượt (cut-2) + banner đang sửa',
  selOng.value === 'cut-2' && state.x2BoOngEditId === 'r-edit');
x2.renderX2BoOngCard();   // giả lập renderAll giữa lúc đang sửa
check('C11: vẽ lại khi ĐANG SỬA → ô chọn VẪN là lô của lượt (cut-2)', selOng.value === 'cut-2');
check('C12: vẽ lại khi ĐANG SỬA → KL đã nạp của lượt KHÔNG bị ghi đè (100)', ongQty() === '100');
x2.resetXuong2BoOngForm();

console.log('--- D. CHỌN NAN THÔ: giữ LÔ + giữ "Thêm loại mới" (nan mua ngoài) ---');
x2.renderX2ChonNanCard();
const selCn = document.getElementById('x2-cn-baotho');
check('D1: ô Lô Bào Thô đứng ở lô bào thô mới nhất (bt-1)', selCn.value === 'bt-1');
selCn.value = '__new__';   // "➕ Thêm loại mới" = nan mua NGOÀI công đoạn
x2.renderX2ChonNanCard();
check('D2: vẽ lại (danh sách y nguyên) — vẫn ở chế độ "Thêm loại mới"', selCn.value === '__new__');
state.xuong2BaoThoRecords.push({
  id: 'bt-2', boOngIds: ['bo-2'], date: '2026-09-25', dais: [1300], rongs: [20], thicks: [8],
  createdAt: '2026-09-25T02:00:00.000Z'
});
x2.renderX2ChonNanCard();
check('D3: vẽ lại khi có lô bào thô mới hơn — KHÔNG bị kéo về lô mới nhất', selCn.value === '__new__');
check('D4: danh sách đã có lô mới (bt-2 đứng đầu)', selCn.innerHTML.indexOf('bt-2') < selCn.innerHTML.indexOf('bt-1'));

console.log('--- E. XƯỞNG 1: CẮT ỐNG giữ lô đang chọn ---');
state.materialRecords.push(
  { id: 'x1m-1', type: 'Vầu cây tươi', supplier: 'Tế', location: 'xuong-1', weight: 800, date: '2026-09-10', createdAt: '2026-09-10T02:00:00.000Z' },
  { id: 'x1m-2', type: 'Nứa cây khô', supplier: 'Trung', location: 'xuong-1', weight: 600, date: '2026-09-11', createdAt: '2026-09-11T02:00:00.000Z' }
);
x2.fillX1CatOngOptions();
const selX1 = document.getElementById('x1-cat-ong-material');
check('E1: ô chọn Cắt Ống đứng ở lô mới nhất (x1m-2)', selX1.value === 'x1m-2');
selX1.value = 'x1m-1';
state.materialRecords.push({
  id: 'x1m-3', type: 'Vầu cây tươi', supplier: 'Sơn', location: 'xuong-1',
  weight: 500, date: '2026-09-28', createdAt: '2026-09-28T02:00:00.000Z'
});
x2.fillX1CatOngOptions();
check('E2: vẽ lại khi có lô mới hơn — vẫn giữ lô đang chọn (x1m-1)', selX1.value === 'x1m-1');

console.log('--- F. CẤU TRÚC mã nguồn ---');
const xuong2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('F1: có helper giữ lựa chọn + cache danh sách option',
  xuong2Src.includes('function setX2SelectOptions(sel, html)') && xuong2Src.includes('const x2SelHtmlCache = new Map();'));
const useCount = (xuong2Src.match(/setX2SelectOptions\(sel, html\)/g) || []).length;
check('F2: áp cho 8 hàm fill (4 thẻ Xưởng 2 + 4 hàm Xưởng 1) — ' + useCount + ' chỗ', useCount >= 8);
check('F3: Bổ Ống chỉ tự điền KL khi ĐỔI LÔ hoặc ô TRỐNG (boOngFilledCutId)',
  xuong2Src.includes('let boOngFilledCutId = null;') &&
  /changedLot \|\| empty/.test(xuong2Src));
check('F4: X1 chỉ tự điền ô số lượng khi ĐANG TRỐNG (không xoá số đã nhập)',
  xuong2Src.includes("x1SaySinhSyncLinked(!qtyEl") &&
  xuong2Src.includes("x1BocSyncLinked(!qtyEl") &&
  xuong2Src.includes("x1ChainSyncLinked(spec, !inEl"));
check('F5: sw.js đã tăng cache (v275)', /nha-may-ngoc-son-v286/.test(swSrc));

console.log(`\n=== KẾT QUẢ X2 FORM KEEP-SELECTION: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

