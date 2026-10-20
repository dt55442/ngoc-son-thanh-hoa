// tests/x2-pool.test.mjs — SỔ NHÓM KHỐI LƯỢNG XƯỞNG 2 (Giai đoạn 1 — 18/10/2026)
// Kiểm thử: phân loại nguồn · phần còn lại của phiếu cân · nhóm XE BỐC ·
// nhóm ỐNG ĐẠT CHỜ BỔ · (hàm) cân mẫu CŨ chỉ để đọc dữ liệu · nhãn nhà cung cấp nhiều phiếu ·
// 3 luồng nhập mới (Bốc luồng → Cắt chọn → Bổ ống) + chặn vượt tồn +
// tương thích dữ liệu LÔ CŨ + cấu trúc index/events/styles/sw.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường ───────────────────────────────────────────
// Khác các test cũ: 3 phần tử giao diện MỚI có getAttribute('data-x2-pool')
// trả '1' để module nhận ra "trang đã nạp giao diện sổ nhóm" và chạy đường MỚI.
const POOL_IDS = new Set(['x2-blg-tickets', 'x2-cut-kind-switch', 'x2-bo-ong-pool-note']);
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){},
    getAttribute(n) { return (n === 'data-x2-pool' && POOL_IDS.has(id)) ? '1' : null; },
    querySelector: () => null, querySelectorAll: () => [],
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
  querySelector: () => null, querySelectorAll: () => [],
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
global.Chart = class { constructor(ctx, cfg) { this.ctx = ctx; this.config = cfg; this.data = (cfg && cfg.data) || { labels: [], datasets: [] }; } update(){} resize(){} destroy(){} render(){} reset(){} getDatasetMeta(){ return { data: [] }; } };
Chart.register = () => {};
global.XLSX = { utils: { book_new: () => ({ SheetNames: [] }), aoa_to_sheet: () => ({}), json_to_sheet: () => ({}), book_append_sheet(){}, encode_cell: () => 'A1', decode_range: () => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }) }, writeFile(){}, write: () => new ArrayBuffer(8) };
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

// ─── DỮ LIỆU MẪU: 5 phiếu cân ở bãi Xưởng 2 + 1 lô Xưởng 1 (phải bị loại) ──
state.materialRecords = [
  { id: 'm1', type: 'Luồng cây xô', supplier: 'Nhà Tế',    location: 'xuong-2', inputIndex: 12000, outputIndex: 0, weight: 12000, date: '2026-10-17', createdAt: '2026-10-17T01:00:00.000Z' },
  { id: 'm2', type: 'Luồng cây khô', supplier: 'Nhà Trung', location: 'xuong-2', inputIndex: 8000,  outputIndex: 0, weight: 8000,  date: '2026-10-18', createdAt: '2026-10-18T01:00:00.000Z' },
  { id: 'm3', type: 'Luồng ống',    supplier: 'Nhà Tế',    location: 'xuong-2', inputIndex: 5000,  outputIndex: 0, weight: 5000,  date: '2026-10-17', createdAt: '2026-10-17T02:00:00.000Z' },
  { id: 'm4', type: 'Luồng ống 2',  supplier: 'Nhà Trung', location: 'xuong-2', inputIndex: 3000,  outputIndex: 0, weight: 3000,  date: '2026-10-18', createdAt: '2026-10-18T02:00:00.000Z' },
  { id: 'm5', type: 'Luồng cây',    supplier: 'Nhà Tế',    location: 'xuong-1', inputIndex: 9000,  outputIndex: 0, weight: 9000,  date: '2026-10-17', createdAt: '2026-10-17T03:00:00.000Z' },
  { id: 'm6', type: 'Luồng ống cũ', supplier: 'Nhà Cũ',    location: 'xuong-2', inputIndex: 4000,  outputIndex: 0, weight: 4000,  date: '2026-09-01', createdAt: '2026-09-01T02:00:00.000Z' }
];
state.xuong2BoluongRecords = [];
state.xuong2CutRecords = [];
state.xuong2BoOngRecords = [];
// 1 lượt CẮT KIỂU CŨ (không có inputKind) → lô m6 đã tiêu thụ hết
state.xuong2CutRecords.push({ id: 'cut-legacy', materialId: 'm6', materialType: 'Luồng ống cũ', supplier: 'Nhà Cũ', date: '2026-09-02', inputWeight: 4000, klOngLuong: 3000, klCuiDot: 200, klCayLoai: 300, createdAt: '2026-09-02T02:00:00.000Z' });
state.hrEmployees = [];
state.hrPositions = [];
state.hrAssignments = [];
state.x2CapRates = {}; state.x2BoluongRates = {}; state.x2BoOngRates = {};

const pool = await import('../js/x2-pool.js');
const x2 = await import('../js/xuong2.js');
const x2pp = await import('../js/x2-phu-pham.js');
const jsX2 = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');
const jsPP = fs.readFileSync(new URL('../js/x2-phu-pham.js', import.meta.url), 'utf8');

// ─── A. SỔ NHÓM: PHÂN LOẠI + TỒN PHIẾU ──────────────────────────
check('A1: phân loại đúng 2 nhóm nguồn (luồng cây / luồng ống / khác)',
  pool.x2MaterialKindOf('Luồng cây xô') === 'cay' &&
  pool.x2MaterialKindOf('Luồng ống') === 'ong' &&
  pool.x2MaterialKindOf('Vầu cây') === 'khac');
check('A2: phiếu cân chỉ lấy ở bãi Xưởng 2 (bỏ lô Xưởng 1)',
  pool.x2PendingTickets('cay').every(m => m.location === 'xuong-2') &&
  !pool.x2PendingTickets('cay').some(m => m.id === 'm5'));
check('A3: phần còn lại của phiếu = khối lượng − đã lấy', pool.x2TicketRemainingOf(state.materialRecords[0]) === 12000);
check('A4: lô cũ đã có lượt cắt (không inputKind) → còn lại 0', pool.x2TicketRemainingOf(state.materialRecords[5]) === 0);
check('A5: nhóm xe rỗng; ống đạt chỉ có 3.000 kg của lượt cắt CŨ',
  pool.x2CartsAvailable() === 0 && pool.x2OngDatAvailable() === 3000);
check('A6: (CŨ) hàm cân mẫu vẫn giữ để ĐỌC dữ liệu cũ — bỏ trống trả null',
  pool.x2SampleAvg('590 610 600') === 600 &&
  pool.x2SampleAvg('590,5 610') === 600.25 &&
  pool.x2SampleAvg('') === null);


// ─── B. BỐC LUỒNG: NHIỀU PHIẾU CÂN + SỐ XE + NGỌN (ƯỚC TÍNH) ────
const g = id => document.getElementById(id);
g('x2-blg-date').value = '2026-10-18';
x2.onX2BoluongTicketToggle('m1', true);
x2.onX2BoluongTicketToggle('m2', true);
g('x2-blg-carts').value = '30';
g('x2-blg-kg-cart').value = '600';
x2.renderX2BoluongCalc();   // vẽ lại dòng tự tính theo Số xe × KL/xe vừa nhập
check('B1: ô "Cân mẫu" ĐÃ GỠ — Bốc Luồng chỉ dùng Số xe × KL/xe (600 kg)', Number(g('x2-blg-kg-cart').value) === 600);
check('B2: dòng tự tính hiện 2 phiếu · 20.000 kg · 30 xe = 18.000 kg · ngọn 2.000 kg',
  g('x2-blg-calc').innerHTML.includes('2 phiếu · 20.000 kg') &&
  g('x2-blg-calc').innerHTML.includes('18.000 kg') &&
  g('x2-blg-calc').innerHTML.includes('2.000 kg'));
g('x2-blg-carts').value = '40';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('B3: CHẶN lưu khi Số xe × KL/xe vượt KL phiếu đã chọn', state.xuong2BoluongRecords.length === 0);
g('x2-blg-carts').value = '30';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
const b1 = state.xuong2BoluongRecords[0];
check('B4: lưu lượt bốc: 30 xe · 18.000 kg lên xe · 20.000 kg lấy từ bãi',
  !!b1 && b1.carts === 30 && b1.qty === 18000 && b1.inputWeight === 20000);
check('B5: Ngọn + hao hụt (ước tính) = 2.000 kg + cờ ngonEst',
  b1.ngonKg === 2000 && b1.ngonEst === true);
check('B6: NHIỀU nhà cung cấp → supplier rỗng + supplierLabel gộp "Nhà Tế + Nhà Trung"',
  b1.supplier === '' && b1.supplierLabel === 'Nhà Tế + Nhà Trung');
check('B7: 2 phiếu đã lấy hết → phần còn lại = 0',
  pool.x2TicketRemainingOf(state.materialRecords[0]) === 0 &&
  pool.x2TicketRemainingOf(state.materialRecords[1]) === 0);
check('B8: nhóm XE BỐC = 30 xe · 18.000 kg chưa cắt',
  pool.x2CartsAvailable() === 30 && pool.x2CartsRemainingKg() === 18000);
x2.renderXuong2Cards();
check('B9: mini card Cắt Chọn = xe 18.000 + luồng ống 8.000 = "Tồn 26.000 kg"',
  g('x2-mini-count-cut').textContent === 'Tồn 26.000 kg');
check('B10: mini card Bốc Luồng = "Hết tồn" (đã bốc hết luồng cây)',
  g('x2-mini-count-bo-luong').textContent === 'Hết tồn');

// ─── C. CẮT CHỌN — XE LUỒNG CÂY (nhiều xe × KL/xe) ─────────────
x2.setX2CutInputKind('cart');
g('x2-cut-date').value = '2026-10-18';
g('x2-cut-carts').value = '10';
g('x2-cut-kg-cart').value = '600';
g('x2-cut-ongluong').value = '5000';
g('x2-cut-ongloi').value = '300';
g('x2-cut-matluong').value = '200';
x2.renderX2CutCalc();
check('C1: dòng tự tính KL vào 6.000 kg + hao hụt/khác 500 kg',
  g('x2-cut-calc').innerHTML.includes('6.000 kg') &&
  g('x2-cut-calc').innerHTML.includes('500 kg'));
x2.handleXuong2CutSubmit({ preventDefault(){} });
const c1 = state.xuong2CutRecords.find(r => r.id !== 'cut-legacy');
check('C2: lưu lượt cắt XE: inputKind cart · 10 xe × 600 = 6.000 kg',
  !!c1 && c1.inputKind === 'cart' && c1.carts === 10 && c1.inputWeight === 6000);
check('C3: 3 đầu ra + hao hụt: 5.000 đạt · 300 lỗi · 200 mắt · 500 khác',
  c1.klOngLuong === 5000 && c1.klOngLoi === 300 && c1.klMatLuong === 200 && c1.klNgonOngLoai === 500);
check('C4: xe luồng cây → ống lỗi + mắt luồng đi BĂM', c1.rejectRoute === 'bam');
check('C5: nhóm xe còn 20 xe · ống đạt chờ bổ 8.000 kg (3.000 cũ + 5.000)',
  pool.x2CartsAvailable() === 20 && pool.x2OngDatAvailable() === 8000);
check('C6: cutDisplay trả đúng loại đầu vào + số xe + KL/xe',
  x2.cutDisplay(c1).inputKindLabel === 'Xe luồng cây' &&
  x2.cutDisplay(c1).carts === 10 && x2.cutDisplay(c1).kgPerCart === 600);

// ─── D. CẮT CHỌN — LUỒNG ỐNG NGUYÊN LIỆU (chỉ lọc ống lỗi) ──────
x2.setX2CutInputKind('ong');
x2.onX2CutTicketToggle('m3', true);
x2.onX2CutTicketToggle('m4', true);
g('x2-cut-date').value = '2026-10-18';
g('x2-cut-ongluong').value = '';          // để trống = tự tính KL vào − ống lỗi
g('x2-cut-ongloi').value = '400';
g('x2-cut-reject-route').value = 'tra_ncc';
x2.handleXuong2CutSubmit({ preventDefault(){} });
const c2 = state.xuong2CutRecords.find(r => r.inputKind === 'ong');
check('D1: lưu lượt cắt ỐNG: 8.000 kg · ống đạt TỰ TÍNH 7.600 · ống lỗi 400',
  !!c2 && c2.inputWeight === 8000 && c2.klOngLuong === 7600 && c2.klOngLoi === 400);
check('D2: hướng "Trả NCC" → returnedKg = 400 (phục vụ giảm trừ tiền mua sau)',
  c2.rejectRoute === 'tra_ncc' && c2.returnedKg === 400);
check('D3: 2 phiếu luồng ống đã lấy hết',
  pool.x2TicketRemainingOf(state.materialRecords[2]) === 0 &&
  pool.x2TicketRemainingOf(state.materialRecords[3]) === 0);
check('D4: tồn nhóm ống đạt = 3.000 cũ + 5.000 (xe) + 7.600 (ống) = 15.600 kg', pool.x2OngDatAvailable() === 15600);
check('D5: mini card Bổ Ống = "Tồn 15.600 kg"',
  (() => { x2.renderXuong2Cards(); return g('x2-mini-count-bo-ong').textContent === 'Tồn 15.600 kg'; })());

// ─── E. BỔ ỐNG — CHỈ KHỐI LƯỢNG (không chọn lô) ────────────────
g('x2-bo-ong-date').value = '2026-10-18';
g('x2-bo-ong-bo').value = '6000';
g('x2-bo-ong-loai').value = '300';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
const o1 = state.xuong2BoOngRecords[0];
check('E1: lượt bổ KHÔNG có cutId + cờ poolMode', !!o1 && o1.cutId === '' && o1.poolMode === true);
check('E2: 6.000 kg đem bổ − 300 loại = 5.700 kg bổ đạt', o1.inputOng === 6000 && o1.klOngBo === 5700);
check('E3: nhãn nguồn "Nhiều nguồn (chỉ khối lượng)"', o1.materialType === 'Nhiều nguồn (chỉ khối lượng)');
check('E4: tồn nhóm ống đạt còn 9.600 kg', pool.x2OngDatAvailable() === 9600);
check('E5: boOngDisplay báo poolMode · không lô · không NCC',
  (() => { const d = x2.boOngDisplay(o1); return d.poolMode === true && d.lotRest === 0 && d.supplier === ''; })());


// ─── F. CHẶN VƯỢT TỒN NHÓM ─────────────────────────────────────
const nCut = state.xuong2CutRecords.length;
x2.setX2CutInputKind('cart');
g('x2-cut-date').value = '2026-10-18';
g('x2-cut-carts').value = '999';
g('x2-cut-kg-cart').value = '600';
g('x2-cut-ongluong').value = '1000';
g('x2-cut-ongloi').value = '0';
g('x2-cut-matluong').value = '0';
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('F1: CHẶN cắt vượt số xe đã bốc & chưa cắt', state.xuong2CutRecords.length === nCut);
const nBo = state.xuong2BoOngRecords.length;
g('x2-bo-ong-bo').value = '99999';
g('x2-bo-ong-loai').value = '0';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('F2: CHẶN bổ vượt tồn nhóm ống đạt chờ bổ', state.xuong2BoOngRecords.length === nBo);

// ─── G. TƯƠNG THÍCH DỮ LIỆU LÔ CŨ ─────────────────────────────
const legacy = state.xuong2CutRecords.find(r => r.id === 'cut-legacy');
const ld = x2.cutDisplay(legacy);
check('G1: lượt cũ giữ inputKind legacy + công thức cũ (ngọn/ống loại = 500)',
  ld.inputKind === 'legacy' && ld.klNgonOngLoai === 500);
check('G2: nhãn loại đầu vào của lượt cũ = "Lô cũ"', x2.cutInputKindLabel(legacy) === 'Lô cũ');
check('G3: lượt cũ KHÔNG tham gia nhóm xe / nhóm ống đạt', legacy.inputKind === undefined);
// Đang sửa lượt cũ → KHÔNG cho đổi loại đầu vào (tránh ghi đè mất dữ liệu lô cũ)
x2.editXuong2Cut('cut-legacy');
x2.setX2CutInputKind('cart');
check('G4: sửa lượt CŨ → nút đổi loại bị chặn (vẫn hiện khối lô cũ)',
  g('x2-cut-cart-group').style.display === 'none' &&
  g('x2-cut-legacy-group').style.display === '');
x2.resetXuong2CutForm();
check('G5: "Làm Mới Form" → về giao diện mới (chọn loại đầu vào hiện lại)',
  g('x2-cut-kind-switch').style.display === '' && g('x2-cut-legacy-group').style.display === 'none');

// ─── I. SỬA LẠI LƯỢT KIỂU MỚI (không mất liên kết, không tạo lượt mới) ──
x2.editXuong2Boluong(b1.id);
check('I1: mở sửa lượt bốc → nạp lại đúng 30 xe · 600 kg/xe (không còn ô Cân mẫu)',
  g('x2-blg-carts').value === '30' && g('x2-blg-kg-cart').value === '600');
g('x2-blg-carts').value = '31';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
const b1b = state.xuong2BoluongRecords.find(r => r.id === b1.id);
check('I2: sửa 30 → 31 xe (18.600 kg) cập nhật đúng lượt, KHÔNG tạo lượt mới',
  state.xuong2BoluongRecords.length === 1 && b1b.carts === 31 && b1b.qty === 18600 && b1b.ngonKg === 1400);

x2.editXuong2Cut(c1.id);
check('I3: mở sửa lượt cắt xe → nạp lại số xe + 3 đầu ra',
  g('x2-cut-carts').value === '10' && g('x2-cut-ongluong').value === '5000' &&
  g('x2-cut-ongloi').value === '300' && g('x2-cut-matluong').value === '200');
g('x2-cut-ongluong').value = '5100';
x2.handleXuong2CutSubmit({ preventDefault(){} });
const c1b = state.xuong2CutRecords.find(r => r.id === c1.id);
check('I4: sửa ống đạt 5.000 → 5.100 cập nhật đúng lượt',
  !!c1b && c1b.klOngLuong === 5100 && c1b.klNgonOngLoai === 400 &&
  state.xuong2CutRecords.filter(r => r.inputKind === 'cart').length === 1);

x2.editXuong2BoOng(o1.id);
check('I5: mở sửa lượt bổ → vẫn ở chế độ SỔ NHÓM (khối lô cũ ẩn)',
  g('x2-bo-ong-legacy-group').style.display === 'none' && g('x2-bo-ong-bo').value === '6000');
g('x2-bo-ong-bo').value = '5900';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
const o1b = state.xuong2BoOngRecords.find(r => r.id === o1.id);
check('I6: sửa KL đem bổ 6.000 → 5.900 cập nhật đúng lượt (bổ đạt 5.600)',
  !!o1b && o1b.inputOng === 5900 && o1b.klOngBo === 5600 && state.xuong2BoOngRecords.length === 1);

// ─── H. MỞ THẺ THẬT Ở GIAO DIỆN SỔ NHÓM (không lỗi) ──────────
check('H0a: mở thẻ Bốc Luồng ở giao diện sổ nhóm không lỗi', x2.x2OpenCard('x2-bo-luong-card') === true);
check('H0b: danh sách phiếu cân được vẽ (kể cả trạng thái rỗng)',
  String(g('x2-blg-tickets').innerHTML || '').length > 0);
check('H0c: mở thẻ Cắt Chọn → dòng tự tính được vẽ',
  x2.x2OpenCard('x2-cut-card') === true && String(g('x2-cut-calc').innerHTML || '').length > 0);
check('H0d: mở thẻ Bổ Ống → ghi chú sổ nhóm hiện + khối lô cũ ẩn',
  x2.x2OpenCard('x2-bo-ong-card') === true &&
  g('x2-bo-ong-pool-note').style.display === '' &&
  g('x2-bo-ong-legacy-group').style.display === 'none');
check('H0e: thẻ Bổ Ống tự tính theo TỒN NHÓM (không theo lô)',
  String(g('x2-bo-ong-calc').innerHTML || '').includes('Tồn nhóm ống đạt'));

// ─── H. CẤU TRÚC (index / events / styles / sw) ────────────────
const idx = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ev = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
check('H1: Bốc Luồng có NÚT mở sheet PHIẾU CÂN + Số xe + KL/xe + ô tự tính (KHÔNG còn Cân mẫu)',
  idx.includes('id="x2-blg-tickets"') && idx.includes('id="x2-blg-tickets-btn"') &&
  idx.includes('id="x2-blg-tickets-sheet"') && idx.includes('id="x2-blg-carts"') &&
  idx.includes('id="x2-blg-kg-cart"') && idx.includes('id="x2-blg-calc"') &&
  !idx.includes('id="x2-blg-sample"'));
check('H2: Cắt Chọn có công tắc 2 loại đầu vào + số xe + ống lỗi + mắt luồng + hướng ống lỗi + NÚT sheet phiếu',
  idx.includes('id="x2-cut-kind-switch"') && idx.includes('id="x2-cut-kind-ong"') &&
  idx.includes('id="x2-cut-carts"') && idx.includes('id="x2-cut-ongloi"') &&
  idx.includes('id="x2-cut-matluong"') && idx.includes('id="x2-cut-reject-route"') &&
  idx.includes('id="x2-cut-tickets-btn"') && idx.includes('id="x2-cut-tickets-sheet"') &&
  !idx.includes('id="x2-cut-sample"'));
check('H3: Bổ Ống có ghi chú sổ nhóm + khối lô cũ (ẩn mặc định)',
  idx.includes('id="x2-bo-ong-pool-note"') && idx.includes('id="x2-bo-ong-legacy-group"'));
check('H4: 3 phần tử đánh dấu giao diện sổ nhóm bằng data-x2-pool="1"',
  (idx.match(/data-x2-pool="1"/g) || []).length >= 3);
check('H5: ô chọn lô cũ KHÔNG còn required (tránh chặn submit khi ẩn)',
  !/id="x2-cut-material"[^>]*required/.test(idx) &&
  !/id="x2-bo-ong-cut"[^>]*required/.test(idx) &&
  !/id="x2-blg-material"[^>]*required/.test(idx));
check('H6: events nối 2 công tắc + bộ chọn phiếu + nút "Lấy Hết Tồn"',
  ev.includes('bindX2TicketPicker') && ev.includes("setX2CutInputKind('ong')") &&
  ev.includes("setX2CutInputKind('cart')") && ev.includes('btn-x2-ong-all'));
check('H7: CSS có khối sổ nhóm (công tắc · phiếu cân · dòng tự tính · ghi chú)',
  css.includes('.x2-kind-switch') && css.includes('.x2-ticket-picker') &&
  css.includes('.x2-pool-calc') && css.includes('.x2-pool-note'));
check('H8: sw.js cache v278 + nạp js/x2-pool.js vào APP_SHELL',
  /nha-may-ngoc-son-v289/.test(sw) && sw.includes("./js/x2-pool.js"));

// ═══ J. UI ĐIỆN THOẠI: SHEET CHỌN PHIẾU + Ô SỐ 6 CHỮ SỐ + KHÔNG CÒN KHOẢNG TRẮNG ═══
// (1) Sheet chọn phiếu cân: nút "N phiếu · X kg" → mở panel → chọn nhiều phiếu →
//     bấm "Xong" mới thu gọn (KHÔNG tự đóng sau mỗi lần tick).
check('J1: index có NÚT + SHEET cho cả 2 thẻ, sheet ẨN mặc định (thuộc tính hidden)',
  /id="x2-blg-tickets-btn"[^>]*aria-expanded="false"[^>]*aria-controls="x2-blg-tickets-sheet"/.test(idx) &&
  /id="x2-blg-tickets-sheet" hidden/.test(idx) &&
  /id="x2-cut-tickets-btn"[^>]*aria-expanded="false"[^>]*aria-controls="x2-cut-tickets-sheet"/.test(idx) &&
  /id="x2-cut-tickets-sheet" hidden/.test(idx));
check('J2: sheet có thanh tiêu đề + nút "Xong" để thu gọn',
  (idx.match(/class="x2-ticket-sheet-head"/g) || []).length === 2 &&
  idx.includes('id="x2-blg-tickets-close"') && idx.includes('id="x2-cut-tickets-close"'));
check('J3: nút hiện tổng kết "N phiếu · X kg" (2 id summary + 2 id sub)',
  idx.includes('id="x2-blg-tickets-summary"') && idx.includes('id="x2-blg-tickets-sub"') &&
  idx.includes('id="x2-cut-tickets-summary"') && idx.includes('id="x2-cut-tickets-sub"'));
check('J4: JS có X2_TICKET_SHEETS + toggle/close/summary + đăng ký vào X2_FLOAT_PAIRS',
  /const X2_TICKET_SHEETS/.test(jsX2) && /function toggleX2TicketSheet/.test(jsX2) &&
  /function closeX2TicketSheet/.test(jsX2) && /function renderX2TicketSummary/.test(jsX2) &&
  /function isX2TicketSheetOpen/.test(jsX2) &&
  /\['x2-blg-tickets-sheet', 'x2-blg-tickets-btn'\]/.test(jsX2) &&
  /\['x2-cut-tickets-sheet', 'x2-cut-tickets-btn'\]/.test(jsX2));
check('J5: events nối nút mở + nút "Xong" cho cả 2 sheet',
  ev.includes("toggleX2TicketSheet('cut')") && ev.includes("closeX2TicketSheet('cut')") &&
  ev.includes("toggleX2TicketSheet('boluong')") && ev.includes("closeX2TicketSheet('boluong')"));
check('J6: CSS sheet (nút · panel · thanh tiêu đề · bottom-sheet điện thoại)',
  css.includes('.x2-ticket-trigger') && css.includes('.x2-ticket-sheet') &&
  css.includes('.x2-ticket-sheet-head') && css.includes('.x2-ticket-sheet[hidden]') &&
  /\.x2-ticket-sheet \{[\s\S]{0,220}bottom: 8px !important/.test(css));
check('J7: CSS viền rõ từng dòng phiếu + khung dòng tự tính (4 cạnh)',
  /\.x2-ticket-row \{[\s\S]{0,200}border: 1px solid var\(--border\)/.test(css) &&
  /\.x2-pool-calc \{[\s\S]{0,260}border: 1px solid var\(--border\)/.test(css));
check('J8: CSS SỬA LỖI KHOẢNG TRẮNG điện thoại — .x2-form-row GIỮ hàng ngang + tự xuống dòng (KHÔNG column)',
  /@media \(max-width: 640px\) \{\s*\.x2-form-row \{\s*flex-direction: row;\s*flex-wrap: wrap;/.test(css) &&
  /\.x2-form-row > \.form-group,[\s\S]{0,120}flex: 1 1 100% !important/.test(css));
check('J9: CSS ô số 6 chữ số — desktop 128px · điện thoại 2 ô/hàng (50%)',
  /\.form-group\.x2-num6 \{ flex: 0 0 128px; \}/.test(css) &&
  /\.form-group\.x2-num6 \{\s*flex: 1 1 calc\(50% - 4px\) !important/.test(css));
check('J10: index gắn class x2-num6 + max="999999" cho Bốc · Cắt · Bổ · Phụ phẩm',
  (idx.match(/class="form-group x2-num6"/g) || []).length >= 9 &&
  (idx.match(/max="999999"/g) || []).length >= 9);
check('J11: JS chặn số > 999.999 ở Bốc · Cắt · Bổ (helper x2Num6Ok) + Phụ phẩm (ppNum6Ok)',
  /const X2_MAX6 = 999999;/.test(jsX2) && /function x2Num6Ok/.test(jsX2) &&
  (jsX2.match(/x2Num6Ok\(/g) || []).length >= 6 &&
  /const PP_MAX6 = 999999;/.test(jsPP) && /function ppNum6Ok/.test(jsPP) &&
  (jsPP.match(/ppNum6Ok\(/g) || []).length >= 4);

// ─── HÀNH VI: mở/đóng sheet + tổng kết + không tự đóng ──────────
state.materialRecords.push({ id: 'm7', type: 'Luồng cây mới', supplier: 'Nhà Tế', location: 'xuong-2', inputIndex: 5000, outputIndex: 0, weight: 5000, date: '2026-10-19', createdAt: '2026-10-19T01:00:00.000Z' });
g('x2-blg-tickets-sheet').hidden = true;
check('J12: bấm nút → MỞ sheet (hidden = false)', x2.toggleX2TicketSheet('boluong') === true && g('x2-blg-tickets-sheet').hidden === false);
check('J13: chưa chọn phiếu → nút ghi "Chưa chọn phiếu cân"',
  g('x2-blg-tickets-summary').textContent === 'Chưa chọn phiếu cân');
x2.onX2BoluongTicketToggle('m7', true);
check('J14: chọn 1 phiếu → nút ghi "1 phiếu · 5.000 kg" + nhãn NCC; sheet VẪN MỞ (không tự đóng)',
  g('x2-blg-tickets-summary').textContent === '1 phiếu · 5.000 kg' &&
  String(g('x2-blg-tickets-sub').textContent).includes('Nhà Tế') &&
  g('x2-blg-tickets-sheet').hidden === false);
check('J15: bấm "Xong" → THU GỌN sheet', x2.closeX2TicketSheet('boluong') === true && g('x2-blg-tickets-sheet').hidden === true);
g('x2-cut-tickets-sheet').hidden = true;
check('J16: sheet Cắt Chọn mở/đóng được',
  x2.toggleX2TicketSheet('cut') === true && g('x2-cut-tickets-sheet').hidden === false &&
  x2.closeX2TicketSheet('cut') === true && g('x2-cut-tickets-sheet').hidden === true);
// ĐIỆN THOẠI (≤639px): sheet neo ĐÁY overlay, full bề ngang
const _iw = window.innerWidth;
window.innerWidth = 390;
g('x2-blg-tickets-sheet').classList.add('x2-ticket-sheet');
g('x2-blg-tickets-sheet').hidden = false;
x2.positionX2FloatPicker('x2-blg-tickets-sheet', 'x2-blg-tickets-btn');
check('J17: điện thoại → BOTTOM-SHEET (left/right/bottom 8px · width auto · có maxHeight)',
  g('x2-blg-tickets-sheet').style.left === '8px' &&
  g('x2-blg-tickets-sheet').style.right === '8px' &&
  g('x2-blg-tickets-sheet').style.bottom === '8px' &&
  g('x2-blg-tickets-sheet').style.width === 'auto' &&
  /px$/.test(String(g('x2-blg-tickets-sheet').style.maxHeight || '')));
x2.closeX2TicketSheet('boluong');
window.innerWidth = _iw;

// ─── HÀNH VI: chặn số quá 6 chữ số (không lưu) ──────────────────
const _blgN = state.xuong2BoluongRecords.length;
g('x2-blg-date').value = '2026-10-19';
g('x2-blg-carts').value = '1000000';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('J18: Bốc Luồng — Số xe 1.000.000 (> 6 chữ số) bị CHẶN, không ghi lượt',
  state.xuong2BoluongRecords.length === _blgN);
g('x2-blg-carts').value = '1';
x2.handleXuong2BoluongSubmit({ preventDefault(){} });
check('J19: Số xe hợp lệ (1 xe × 600 = 600 kg) ghi được lượt', state.xuong2BoluongRecords.length === _blgN + 1);
const _cutN = state.xuong2CutRecords.length;
x2.setX2CutInputKind('cart');
g('x2-cut-date').value = '2026-10-19';
g('x2-cut-carts').value = '1000000';
x2.handleXuong2CutSubmit({ preventDefault(){} });
check('J20: Cắt Chọn — Số xe 1.000.000 bị CHẶN, không ghi lượt', state.xuong2CutRecords.length === _cutN);
const _boN = state.xuong2BoOngRecords.length;
g('x2-bo-ong-date').value = '2026-10-19';
g('x2-bo-ong-bo').value = '1000000';
x2.handleXuong2BoOngSubmit({ preventDefault(){} });
check('J21: Bổ Ống — KL đem bổ 1.000.000 bị CHẶN, không ghi lượt', state.xuong2BoOngRecords.length === _boN);
const _ppN = (state.x2PhuPhamRecords || []).length;
g('x2-pp-date').value = '2026-10-19';
g('x2-pp-kind').value = 'ngon';
g('x2-pp-out-form').value = 'raw';
g('x2-pp-out-type').value = 'sale';
g('x2-pp-kg').value = '1000000';
x2pp.handleX2PhuPhamSubmit({ preventDefault(){} });
check('J22: Phụ Phẩm — KL cân thực 1.000.000 bị CHẶN, không ghi lượt',
  (state.x2PhuPhamRecords || []).length === _ppN);

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

