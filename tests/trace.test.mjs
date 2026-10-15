// tests/trace.test.mjs — Kiểm thử THẺ "TRUY XUẤT ĐẦU VÀO → ĐẦU RA"
// (Vùng Nâng Cao tab Tổng Quan — js/trace.js):
//   ① Chuỗi giá trị ĐO TRỰC TIẾP: luồng tươi → ống luồng → ống bổ đạt →
//      bào thô → chọn nan → bào tinh → m³ ván (kèm hao hụt từng chặng).
//   ② Truy xuất THEO TỪNG MÃ VÁN = ƯỚC TÍNH PHÂN BỔ theo tỷ lệ m³ trong kỳ
//      (kg tươi/1 m³ · kg tươi/1 đơn vị · đối chiếu định mức nan).
//   ③ Bộ lọc kỳ Tuần/Tháng/Năm (thuần UI theo máy) + ô chọn mã ván.
'use strict';
import fs from 'node:fs';

// ─── Stubs môi trường (giống xuong2-bao-van.test.mjs) ────────
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
const near = (a, b, tol) => Math.abs(Number(a) - Number(b)) <= (tol == null ? 0.01 : tol);

// ═══ DỮ LIỆU MẪU — kỳ THÁNG 10/2026 (tuần 41) ═══════════════════
const { state, STORAGE_KEY_MATERIAL_RATES, STORAGE_KEY_PLANNING_ITEMS, STORAGE_KEY_PRESS_RECORDS } =
  await import('../js/state.js');
state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// ĐỊNH MỨC ván 1200x382x12: 40 thanh/tấm · hiệu suất 70% · Dùng nan Ván · ĐVT Tấm
state.materialRates = [
  { id: 'rate-van', product: '1200x382x12', nanUse: 'Ván', unit: 'Tấm',
    nan1: '1250×18×7', nan1Qty: 40, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0,
    glue: 0, additive: 0, efficiency: 70 }
];
// NGUYÊN LIỆU: 2 lô Xưởng 2 trong kỳ · 1 lô Lò hơi (loại) · 1 lô Xưởng 2 NGOÀI kỳ
state.materialRecords = [
  { id: 'mat-a', date: '2026-10-05', location: 'xuong-2', type: 'Luồng cây xô', supplier: 'Nhà Tế', weight: 12100 },
  { id: 'mat-b', date: '2026-10-06', location: 'xuong-2', type: 'Luồng ống', supplier: 'Nhà Trung', weight: 5000 },
  { id: 'mat-c', date: '2026-10-06', location: 'lo-hoi', type: 'Gỗ', supplier: 'Nhà Triệu', weight: 2660 },
  { id: 'mat-d', date: '2026-09-15', location: 'xuong-2', type: 'Luồng cây xô', supplier: 'Nhà Tế', weight: 9999 }
];
// CẮT CHỌN: link lô mat-a → ống luồng 5.559 kg · củi 2.004 kg
state.xuong2CutRecords = [
  { id: 'cut-1', materialId: 'mat-a', date: '2026-10-05', week: '2026-W41',
    inputWeight: 12100, klOngLuong: 5559, klCuiDot: 2004, klCayLoai: 0 }
];
// BỔ ỐNG: đem bổ 5.205 kg → ống loại 50 kg ⇒ đạt 5.155 kg
state.xuong2BoOngRecords = [
  { id: 'bo-1', cutId: 'cut-1', date: '2026-10-06', inputOng: 5205, klOngLoai: 50, klOngBo: 5155 }
];
// BÀO THÔ: 1 lượt (số thanh lấy từ Chọn Nan Thô link đúng baothoId)
state.xuong2BaoThoRecords = [
  { id: 'bt-1', boOngId: 'bo-1', date: '2026-10-06', daiText: '1250', rongText: '18', dayText: '7' }
];
// CHỌN NAN THÔ: 2.100 (A) + 500 (Loại hẳn) thuộc chuỗi · 900 MUA NGOÀI (không tính)
state.xuong2ChonNanThoRecords = [
  { id: 'cn-1', baothoId: 'bt-1', date: '2026-10-06', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 2100, cls: 'A', external: false },
  { id: 'cn-2', baothoId: 'bt-1', date: '2026-10-06', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 500, cls: 'reject', external: false },
  { id: 'cn-3', baothoId: '', date: '2026-10-06', dims: [1250, 18, 7], unitVol: 0.0001575, quantity: 900, cls: 'A', external: true }
];
// BÀO TINH: vào 2.100 → đạt 2.000 · lỗi 100
state.xuong2BaoTinhRecords = [
  { id: 'btinh-1', kind: 'tinh', date: '2026-10-07', inDims: [1250, 18, 7], outDims: [1250, 18, 7],
    qtyOk: 2000, qtyErr: 100, unitVol: 0.0001575 }
];
// ÉP VÁN: 200 tấm 1200×382×12 ⇒ 0,0055008 × 200 = 1,10016 m³
state.pressRecords = [
  { id: 'p1', date: '2026-10-08', week: 'Tuần 41', year: 2026, productId: 'rate-van', finishedQty: 200,
    vanTho: [{ vtDim: '1200x382x12', vtQty: 200 }], sticks: [] }
];


const trace = await import('../js/trace.js');

// Chốt kỳ xem = THÁNG 10/2026 (không phụ thuộc ngày chạy máy)
function setPeriod(mode, key, productId) {
  const ui = trace.loadTraceUi();
  ui.mode = mode; ui.key = key; ui.productId = productId || '';
  trace.saveTraceUi();
}
setPeriod('month', '2026-10');

// ═══ A. KHÓA KỲ + DỊCH KỲ + NHÃN KỲ ════════════════════════════
check('A1: khóa kỳ TUẦN của 05/10/2026 = 2026-W41', trace.traceKeyOf('2026-10-05', 'week') === '2026-W41');
check('A2: khóa kỳ THÁNG = 2026-10', trace.traceKeyOf('2026-10-05', 'month') === '2026-10');
check('A3: khóa kỳ NĂM = 2026', trace.traceKeyOf('2026-10-05', 'year') === '2026');
check('A4: ngày rỗng → khóa rỗng', trace.traceKeyOf('', 'month') === '');
check('A5: dịch tuần +1 → 2026-W42', trace.traceShiftKey('2026-W41', 'week', 1) === '2026-W42');
check('A6: dịch tuần -1 → 2026-W40', trace.traceShiftKey('2026-W41', 'week', -1) === '2026-W40');
check('A7: dịch tháng -1 → 2026-09', trace.traceShiftKey('2026-10', 'month', -1) === '2026-09');
check('A8: dịch tháng +1 vắt năm → 2027-01', trace.traceShiftKey('2026-12', 'month', 1) === '2027-01');
check('A9: dịch năm +1 → 2027', trace.traceShiftKey('2026', 'year', 1) === '2027');
check('A10: nhãn kỳ THÁNG = "Tháng 10/2026"', trace.tracePeriodLabel('2026-10', 'month') === 'Tháng 10/2026');
check('A11: nhãn kỳ NĂM = "Năm 2026"', trace.tracePeriodLabel('2026', 'year') === 'Năm 2026');
check('A12: nhãn kỳ TUẦN có "Tuần 41" + khoảng ngày 05/10 – 11/10',
  trace.tracePeriodLabel('2026-W41', 'week').includes('Tuần 41') &&
  trace.tracePeriodLabel('2026-W41', 'week').includes('05/10') &&
  trace.tracePeriodLabel('2026-W41', 'week').includes('11/10'));

// ═══ B. TRẠNG THÁI UI THEO MÁY ══════════════════════════════════
check('B1: đổi chế độ → nhớ vào localStorage',
  (() => { trace.setTraceMode('week'); return JSON.parse(storeBacking.get(trace.TRACE_UI_KEY)).mode === 'week'; })());
check('B2: đổi chế độ → khóa kỳ tự về kỳ HIỆN TẠI của chế độ mới',
  trace.loadTraceUi().key === trace.traceDefaultKey('week'));
check('B3: dịch kỳ lùi 1 → khóa lưu đúng',
  (() => { setPeriod('month', '2026-10'); trace.shiftTracePeriod(-1); return trace.loadTraceUi().key === '2026-09'; })());
check('B4: chọn mã ván → lưu vào localStorage',
  (() => { trace.setTraceProduct('rate-van'); return JSON.parse(storeBacking.get(trace.TRACE_UI_KEY)).productId === 'rate-van'; })());
// B5/B6 cần module NẠP MỚI (bộ nhớ đệm UI trong module đã bị ghi ở các bước trên)
storeBacking.set(trace.TRACE_UI_KEY, JSON.stringify({ mode: 'sai-che-do', key: '', productId: '' }));
const traceFresh = await import('../js/trace.js?fresh=' + Date.now());
check('B5: chế độ lạ trong localStorage → tự về mặc định "month"', traceFresh.loadTraceUi().mode === 'month');
check('B6: khóa rỗng trong localStorage → tự điền kỳ hiện tại', !!traceFresh.loadTraceUi().key);


// ═══ C. CHUỖI GIÁ TRỊ ĐO TRỰC TIẾP (toàn nhà máy Xưởng 2) ═══════
setPeriod('month', '2026-10');
const chain = trace.traceChainData();
check('C1: luồng tươi = 17.100 kg (2 lô Xưởng 2 trong kỳ)', near(chain.tuoiKg, 17100, 0.5));
check('C2: KHÔNG tính lô Lò hơi (location khác) và lô NGOÀI kỳ', near(chain.tuoiKg, 17100, 0.5));
check('C3: cắt chọn — đầu vào 12.100 kg (sống theo lô nguyên liệu)', near(chain.cutIn, 12100, 0.5));
check('C4: cắt chọn — ống luồng 5.559 kg', near(chain.ongKg, 5559, 0.5));
check('C5: cắt chọn — củi đốt 2.004 kg · cây loại 0', near(chain.cuiKg, 2004, 0.5) && near(chain.cayLoaiKg, 0, 0.5));
check('C6: tỷ lệ ống/tươi = 45,9%', near(chain.ongRatioPct, 45.9421, 0.05));
check('C7: bổ ống — đem bổ 5.205 · đạt 5.155 · loại 50 kg',
  near(chain.ongBoIn, 5205, 0.5) && near(chain.ongBoKg, 5155, 0.5) && near(chain.ongBoLoai, 50, 0.5));
check('C8: bào thô — 2.600 thanh (2.100 + 500, KHÔNG tính 900 mua ngoài)', near(chain.baoThoThanh, 2600, 0.5));
check('C9: bào thô — thể tích quy đổi 0,4095 m³', near(chain.baoThoM3, 0.4095, 0.0002));
check('C10: chọn nan — 2.600 thanh · "Loại hẳn" 500 thanh',
  near(chain.chonNanThanh, 2600, 0.5) && near(chain.chonNanReject, 500, 0.5));
check('C11: bào tinh — vào 2.100 · đạt 2.000 · lỗi 100',
  near(chain.baoTinhIn, 2100, 0.5) && near(chain.baoTinhOk, 2000, 0.5) && near(chain.baoTinhErr, 100, 0.5));
check('C12: bào tinh — thể tích đạt 0,315 m³', near(chain.baoTinhM3Ok, 0.315, 0.0002));
check('C13: ép ván — 1,10016 m³ · 1 lượt ép', near(chain.pressM3, 1.10016, 0.0001) && chain.pressRuns === 1);
check('C14: tỷ lệ thanh/kg tươi của kỳ = 2.600 ÷ 17.100 = 0,15205',
  near(chain.thanhPerKgTuoi, 2600 / 17100, 0.00001));

// ═══ D. LỌC THEO KỲ (tuần / tháng / năm) ═══════════════════════
setPeriod('week', '2026-W41');
const chainW = trace.traceChainData();
check('D1: kỳ TUẦN 41 — vẫn đủ số (mọi bản ghi mẫu nằm trong tuần 41)', near(chainW.tuoiKg, 17100, 0.5) && near(chainW.pressM3, 1.10016, 0.0001));
setPeriod('week', '2026-W42');
const chainW42 = trace.traceChainData();
check('D2: kỳ TUẦN 42 (rỗng) — mọi chặng = 0', chainW42.tuoiKg === 0 && chainW42.pressM3 === 0 && chainW42.chonNanThanh === 0);
setPeriod('year', '2026');
const chainY = trace.traceChainData();
check('D3: kỳ NĂM 2026 — gồm cả lô 15/09 (9999 kg)', near(chainY.tuoiKg, 17100 + 9999, 0.5));
setPeriod('year', '2025');
check('D4: kỳ NĂM 2025 (rỗng) — không có dữ liệu', trace.traceChainData().tuoiKg === 0);
check('D5: traceInPeriod tôn trọng kỳ đang chọn',
  (() => { setPeriod('month', '2026-10'); const a = trace.traceInPeriod('2026-10-05'); const b = trace.traceInPeriod('2026-09-15'); return a === true && b === false; })());


// ═══ E. TRUY XUẤT THEO TỪNG MÃ VÁN (ƯỚC TÍNH PHÂN BỔ) ═══════════
setPeriod('month', '2026-10');
const prodAll = trace.traceProductRows();
check('E1: 1 mã ván có ép trong kỳ', prodAll.rows.length === 1 && prodAll.rows[0].productId === 'rate-van');
check('E2: nhãn mã ván = "Ván 1200x382x12"', prodAll.rows[0].label === 'Ván 1200x382x12');
check('E3: ĐVT = Tấm · Dùng nan = Ván · Hiệu suất 70%',
  prodAll.rows[0].unit === 'Tấm' && prodAll.rows[0].nanUse === 'Ván' && near(prodAll.rows[0].effPct, 70, 0.001));
check('E4: sản lượng 200 tấm · 1,10016 m³', near(prodAll.rows[0].outQty, 200, 0.5) && near(prodAll.rows[0].m3, 1.10016, 0.0001));
check('E5: chiếm 100% thể tích kỳ (chỉ 1 mã)', near(prodAll.rows[0].sharePct, 100, 0.01));
check('E6: kg tươi phân bổ = 17.100 kg', near(prodAll.rows[0].tuoiKg, 17100, 0.5));
check('E7: Kg tươi / 1 m³ = 17.100 ÷ 1,10016 ≈ 15.543',
  near(prodAll.rows[0].kgPerM3, 17100 / 1.10016, 0.5));
check('E8: Kg tươi / 1 tấm = 17.100 ÷ 200 = 85,5', near(prodAll.rows[0].kgPerUnit, 85.5, 0.01));
check('E9: Thanh ĐM / tấm = 40 ÷ 0,7 = 57,14', near(prodAll.rows[0].nanPerUnit, 40 / 0.7, 0.001));
check('E10: thể tích 1 tấm = 0,0055008 m³', near(prodAll.rows[0].unitVol, 0.0055008, 0.0000001));
check('E11: cột "nếu đúng ĐM nan" = (thanh/m³) ÷ (thanh/kg tươi kỳ)',
  near(prodAll.rows[0].kgPerM3LyThuyet, (1 / 0.0055008) * (40 / 0.7) / (2600 / 17100), 1));
check('E12: tổng kỳ = 1,10016 m³ · 17.100 kg', near(prodAll.totalM3, 1.10016, 0.0001) && near(prodAll.totalTuoi, 17100, 0.5));

// Phân bổ 2 mã: mã B chiếm 3/4 thể tích → nhận 3/4 kg tươi
state.materialRates.push({ id: 'rate-van-b', product: '1200x600x12', nanUse: 'Ván', unit: 'Tấm',
  nan1: '1250×18×7', nan1Qty: 20, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 });
state.pressRecords.push({ id: 'p2', date: '2026-10-09', week: 'Tuần 41', year: 2026, productId: 'rate-van-b',
  finishedQty: 100, vanTho: [{ vtDim: '1200x600x12', vtQty: 100 }], sticks: [] });
const prod2 = trace.traceProductRows();
const mA = prod2.rows.find(r => r.productId === 'rate-van');
const mB = prod2.rows.find(r => r.productId === 'rate-van-b');
check('E13: 2 mã trong kỳ · sắp theo thể tích giảm dần', prod2.rows.length === 2 && prod2.rows[0].productId === 'rate-van');
check('E14: phân bổ theo THANH ĐỊNH MỨC — mã A (11.428,6 thanh ĐM) nhận 80% kg tươi, mã B (2.857,1) nhận 20%',
  near(mA.sharePct, 80, 0.05) && near(mB.sharePct, 20, 0.05) &&
  near(mA.tuoiKg, 17100 * 0.8, 0.5) && near(mB.tuoiKg, 17100 * 0.2, 0.5));
check('E15: Kg tươi / 1 m³ KHÁC NHAU giữa 2 mã (A nặng định mức nan hơn → cao hơn)',
  near(mA.kgPerM3, (17100 * 0.8) / 1.10016, 0.5) &&
  near(mB.kgPerM3, (17100 * 0.2) / 0.864, 0.5) &&
  mA.kgPerM3 > mB.kgPerM3);
check('E16: tổng 2 mã vẫn = 17.100 kg tươi (không thất lạc)', near(mA.tuoiKg + mB.tuoiKg, 17100, 1));
setPeriod('month', '2026-10', 'rate-van-b');
const prodOne = trace.traceProductRows();
check('E17: chọn 1 mã → bảng chỉ còn đúng mã đó', prodOne.rows.length === 1 && prodOne.rows[0].productId === 'rate-van-b');
state.materialRates.pop();
state.pressRecords = state.pressRecords.filter(r => r.id !== 'p2');
setPeriod('month', '2026-11', '');
check('E18: kỳ KHÔNG có lượt ép → bảng rỗng', trace.traceProductRows().rows.length === 0);

// ═══ E2. ĐO THẬT TỪNG NGUỒN: VÁN (sticks) · BULLIG · THANH (QC) ══
// Ba nguồn số đo KHÁC NHAU — mỗi loại sản phẩm lấy đúng nguồn của nó.
setPeriod('month', '2026-10', '');
state.materialRates = [
  { id: 'rate-van', product: '1200x382x12', nanUse: 'Ván', unit: 'Tấm',
    nan1: '1250×18×7', nan1Qty: 40, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 },
  { id: 'rate-bullig', product: '1250x80x12', nanUse: 'Bullig', unit: 'Thanh',
    nan1: '1250×18×7', nan1Qty: 1 / 6, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 100 },
  { id: 'rate-thanh', product: '640x14x12', nanUse: 'Ván', unit: 'Thanh',
    nan1: '1250×18×7', nan1Qty: 10, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 100 }
];
// VÁN: thanh nan vào máy ép = sticks (9.384 + 1.000 = 10.384 thanh)
state.pressRecords = [
  { id: 'p1', date: '2026-10-08', week: 'Tuần 41', year: 2026, productId: 'rate-van', finishedQty: 200,
    vanTho: [{ vtDim: '1200x382x12', vtQty: 200 }],
    sticks: [{ nanKey: '1250×18×7', sticks: 9384 }, { nanKey: '1250×18×5', sticks: 1000 }] }
];
// BULLIG: gia công dùng 6.000 thanh THÔ → chọn thanh đạt 30.000 thành phẩm
state.xuong2BulligRecords = [
  { id: 'bl-gc', kind: 'gc', date: '2026-10-08', outDims: [1250, 80, 12], outSizeKey: '1250×80×12',
    quantity: 30000, qtyIn: 6000, convertFactor: 5, sources: [] },
  { id: 'bl-ct', kind: 'ct', date: '2026-10-08', inSizeKey: '1250×80×12', inDims: [1250, 80, 12],
    qtyOk: 30000, qtyErr: 0, unitVol: 0.0012 }
];
// THANH: Kiểm thanh (tab QC) đưa vào 2.000 → đạt 1.900
state.qcFinalRecords = [
  { id: 'q1', kind: 'thanh', date: '2026-10-09', workshop: 'x2', sizeKey: '640x14x12',
    inputQty: 2000, qtyOk: 1900, qtyExcept: 0, qtyReject: 100 }
];

const p3 = trace.traceProductRows();
const rVan = p3.rows.find(r => r.productId === 'rate-van');
const rBul = p3.rows.find(r => r.productId === 'rate-bullig');
const rTha = p3.rows.find(r => r.productId === 'rate-thanh');
check('E19: gom đủ 3 mã từ 3 nguồn khác nhau (ép ván · Bullig · kiểm thanh)',
  p3.rows.length === 3 && !!rVan && !!rBul && !!rTha && !p3.rows.some(r => r.unlinked));
check('E20: VÁN — thanh dùng = sticks của lượt ép (9.384 + 1.000 = 10.384)',
  near(rVan.thanhReal, 10384, 0.5) && rVan.basis === 'thanh thật' && rVan.sources === 'ép ván');
check('E21: BULLIG — thanh thô đã gia công 6.000 · sản lượng 30.000 · 36 m³',
  near(rBul.thanhReal, 6000, 0.5) && near(rBul.outQty, 30000, 0.5) && near(rBul.m3, 36, 0.001) &&
  rBul.sources === 'gia công Bullig');
check('E22: THANH — thanh đưa vào kiểm 2.000 · sản lượng đạt 1.900',
  near(rTha.thanhReal, 2000, 0.5) && near(rTha.outQty, 1900, 0.5) && rTha.sources === 'kiểm thanh');
check('E23: phân bổ theo thanh đo thật — 10.384 / 6.000 / 2.000 trên tổng 18.384',
  near(rVan.sharePct, (10384 / 18384) * 100, 0.02) && near(rBul.sharePct, (6000 / 18384) * 100, 0.02) &&
  near(rTha.sharePct, (2000 / 18384) * 100, 0.02));
check('E24: Kg tươi / 1 m³ KHÁC NHAU giữa 3 mã (không đánh đồng)',
  near(rVan.kgPerM3, (17100 * 10384 / 18384) / 1.10016, 0.5) &&
  near(rBul.kgPerM3, (17100 * 6000 / 18384) / 36, 0.5) &&
  near(rTha.kgPerM3, (17100 * 2000 / 18384) / 0.204288, 0.5) &&
  rVan.kgPerM3 !== rBul.kgPerM3 && rBul.kgPerM3 !== rTha.kgPerM3);
check('E25: tổng kg tươi phân bổ 3 mã = đúng 17.100 kg',
  near(rVan.tuoiKg + rBul.tuoiKg + rTha.tuoiKg, 17100, 1));

// ── CHUỖI 2 BƯỚC ÉP VÁN: tạo VÁN THÔ (từ thanh nan) → ÉP THÀNH PHẨM (từ ván thô)
// Thực tế dữ liệu: lượt tạo ván thô KHÔNG gắn mã (chưa biết thành phẩm), còn lượt
// ép thành phẩm ghi ĐẦU VÀO = TẤM VÁN THÔ. Phải nối 2 bước để gắn kg tươi về mã.
state.materialRates.push({ id: 'rate-vt', product: '1200x340x33', nanUse: 'Ván', unit: 'Tấm',
  nan1: '1250×18×7', nan1Qty: 140, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 });
state.pressRecords.push(
  { id: 'p-vt', date: '2026-10-07', week: 'Tuần 41', year: 2026, productId: '', finishedQty: 0,
    vanTho: [{ vtDim: '1200×340×18', vtQty: 100 }], sticks: [{ nanKey: '1250×18×7', sticks: 5000 }] },
  { id: 'p-tp', date: '2026-10-08', week: 'Tuần 41', year: 2026, productId: 'rate-vt', finishedQty: 50,
    vanTho: [], sticks: [{ nanKey: '1200×340×18', sticks: 100 }] }
);
const p4 = trace.traceProductRows();
const rVt = p4.rows.find(r => r.productId === 'rate-vt');
check('E26: BƯỚC 2 — lượt ép thành phẩm dùng 100 TẤM VÁN THÔ → quy ra 5.000 thanh nan',
  !!rVt && near(rVt.thanhReal, 5000, 0.5) && near(rVt.outQty, 50, 0.5) && near(rVt.m3, 0.7344, 0.0001));
check('E27: lượt CHỈ tạo ván thô KHÔNG tự chiếm kg tươi (không đếm 2 lần) → không có dòng "Chưa gắn mã"',
  !p4.rows.some(r => r.unlinked));
check('E28: lượt "chỉ tạo ván thô" không hiện thành dòng riêng trong bảng',
  !p4.rows.some(r => r.runs > 0 && r.outQty === 0 && r.productId === ''));

// Ván thô CHƯA vào thành phẩm (dở dang) → dòng "Chưa gắn mã" ở CUỐI, vẫn chia kg tươi
state.pressRecords.push(
  { id: 'p-wip', date: '2026-10-09', week: 'Tuần 41', year: 2026, productId: '', finishedQty: 0,
    vanTho: [{ vtDim: '1000×500×20', vtQty: 40 }], sticks: [{ nanKey: '1250×18×7', sticks: 3000 }] }
);
const p5 = trace.traceProductRows();
const rUn = p5.rows.find(r => r.unlinked);
check('E29: ván thô dở dang → dòng "Chưa gắn mã" ở CUỐI bảng, thanh = phần nan chưa gắn mã',
  !!rUn && p5.rows[p5.rows.length - 1].unlinked === true &&
  rUn.label.includes('Chưa gắn mã') && near(rUn.thanhReal, 3000, 0.5));
check('E30: dòng "Chưa gắn mã" VẪN được chia kg tươi + tổng không đổi 17.100 kg',
  rUn.tuoiKg > 0 && near(p5.rows.reduce((s, r) => s + r.tuoiKg, 0), 17100, 1));

// Mã KHÔNG có số đo thật → dùng thanh định mức (fallback)
state.pressRecords = state.pressRecords.filter(r => r.id === 'p1');
state.pressRecords[0].sticks = [];
const p6 = trace.traceProductRows();
const rVanNo = p6.rows.find(r => r.productId === 'rate-van');
check('E31: mã không có sticks → basis chuyển sang "thanh định mức"',
  rVanNo.thanhReal === 0 && rVanNo.basis === 'thanh định mức' && near(rVanNo.thanhTheory, 200 * (40 / 0.7), 0.5));

// Khôi phục về 1 mã để kiểm mục F (giao diện)
state.pressRecords = [
  { id: 'p1', date: '2026-10-08', week: 'Tuần 41', year: 2026, productId: 'rate-van', finishedQty: 200,
    vanTho: [{ vtDim: '1200x382x12', vtQty: 200 }], sticks: [] }
];
state.xuong2BulligRecords = [];
state.qcFinalRecords = [];
state.materialRates = [
  { id: 'rate-van', product: '1200x382x12', nanUse: 'Ván', unit: 'Tấm',
    nan1: '1250×18×7', nan1Qty: 40, nan2: '', nan2Qty: 0, nan3: '', nan3Qty: 0, glue: 0, additive: 0, efficiency: 70 }
];



// ═══ F. VẼ THẺ (KPI · bảng chuỗi · bảng mã ván · trạng thái rỗng) ═
setPeriod('month', '2026-10', '');
trace.renderTraceCard();
const kpiHtml = els.get('trace-kpis').innerHTML;
const chainHtml = els.get('trace-chain').innerHTML;
const prodHtml = els.get('trace-products').innerHTML;
check('F1: dải KPI có chỉ số CHÍNH "Luồng tươi / 1 m³"', kpiHtml.includes('Luồng tươi / 1 m³'));
check('F2: KPI có "Luồng tươi nhập" + "Sản phẩm ra" + "Sản lượng quy đổi"',
  kpiHtml.includes('Luồng tươi nhập') && kpiHtml.includes('Sản phẩm ra') && kpiHtml.includes('Sản lượng quy đổi'));
check('F3: KPI hiện số kg tươi/1 m³ ≈ 15.543', kpiHtml.includes('15.543') || kpiHtml.includes('15.542'));
check('F4: bảng chuỗi có đủ 7 chặng',
  chainHtml.includes('Luồng tươi nhập') && chainHtml.includes('Cắt chọn → Ống luồng') &&
  chainHtml.includes('Bổ ống → Ống bổ đạt') && chainHtml.includes('Chạy máy bào thô') &&
  chainHtml.includes('Chọn nan thô → Nan đạt') && chainHtml.includes('Bào tinh → Nan đạt') &&
  chainHtml.includes('Ép ván → Thành phẩm'));
check('F5: bảng chuỗi có 7 cột (ĐVT · Vào · Ra · Hao hụt · Tỷ lệ hao)',
  chainHtml.includes('Hao hụt') && chainHtml.includes('Tỷ lệ hao') && chainHtml.includes('ĐVT'));
check('F6: bảng chuỗi ghi phụ phẩm củi đốt 2.004 kg', chainHtml.includes('củi đốt 2.004 kg'));
check('F7: bảng mã ván có mã "Ván 1200x382x12" + chip Dùng nan', prodHtml.includes('Ván 1200x382x12') && prodHtml.includes('trace-tag-van'));
check('F8: bảng mã ván có dòng TỔNG', prodHtml.includes('trace-total-row') && prodHtml.includes('TỔNG 1 mã'));
check('F9: bảng mã ván ghi "ước tính" qua nhãn Kg tươi ước tính',
  prodHtml.includes('Kg tươi / 1 m³') && prodHtml.includes('Kg tươi / 1 đơn vị'));
check('F10: ô chọn mã ván được nạp (có "Tất cả mã ván" + mã ván)',
  els.get('trace-product').innerHTML.includes('— Tất cả mã ván —') && els.get('trace-product').innerHTML.includes('rate-van'));
check('F11: nhãn kỳ hiển thị "Tháng 10/2026"', els.get('trace-period-label').textContent === 'Tháng 10/2026');
// Kỳ rỗng → dải KPI báo chưa có dữ liệu, bảng mã ván báo trạng thái rỗng
setPeriod('month', '2026-11', '');
trace.renderTraceCard();
check('F12: kỳ rỗng → KPI báo "Chưa có dữ liệu"', els.get('trace-kpis').innerHTML.includes('Chưa có dữ liệu'));
check('F13: kỳ rỗng → bảng mã ván hiện trạng thái rỗng (trace-empty)',
  els.get('trace-products').innerHTML.includes('trace-empty') && els.get('trace-products').innerHTML.includes('Chưa có lượt ÉP VÁN'));
// Chi tiết công đoạn: ẨN mặc định — chỉ hiện khi bấm nút
setPeriod('month', '2026-10', '');
trace.renderTraceCard();
check('F14: bảng mã ván có cột "Thanh dùng (đo thật)" + nhãn "Mã ván / thanh / Bullig"',
  els.get('trace-products').innerHTML.includes('Thanh dùng (đo thật)') &&
  els.get('trace-products').innerHTML.includes('Mã ván / thanh / Bullig'));
check('F15: CHI TIẾT công đoạn ẨN mặc định (khối #trace-detail hidden)',
  els.get('trace-detail').hidden === true &&
  els.get('trace-detail-toggle').innerHTML.includes('Chi tiết từng công đoạn'));
check('F16: bảng chuỗi giá trị VẪN được vẽ sẵn trong khối ẩn (mở ra là thấy ngay)',
  els.get('trace-chain').innerHTML.includes('Cắt chọn → Ống luồng'));
trace.toggleTraceDetail();
check('F17: bấm nút → MỞ chi tiết + nhớ theo máy',
  els.get('trace-detail').hidden === false &&
  els.get('trace-detail-toggle').innerHTML.includes('Ẩn chi tiết công đoạn') &&
  JSON.parse(storeBacking.get(trace.TRACE_UI_KEY)).openDetail === true);
trace.toggleTraceDetail();
check('F18: bấm lần nữa → ẨN lại + lưu trạng thái đóng',
  els.get('trace-detail').hidden === true &&
  JSON.parse(storeBacking.get(trace.TRACE_UI_KEY)).openDetail === false);


// ═══ G. VÍ DỤ CHUẨN: ván 1200x382x12 · 40 thanh/tấm · hiệu suất 70% ══
const rateVan = state.materialRates.find(r => r.id === 'rate-van');
const dims = trace.traceRateDims(rateVan);
check('G1: đọc đúng kích thước định mức [1200, 382, 12]', JSON.stringify(dims) === JSON.stringify([1200, 382, 12]));
check('G2: kích thước hỏng → null', trace.traceRateDims({ product: 'không có số' }) === null);
check('G3: số thanh định mức/tấm = 40 ÷ 0,7 = 57,142857', near(trace.traceRateNanPerUnit(rateVan), 57.142857, 0.0001));
const unitVol = (1200 * 382 * 12) / 1e9;
check('G4: thể tích 1 tấm = 0,0055008 m³', near(unitVol, 0.0055008, 1e-9));
check('G5: 1 m³ = 181,8 tấm', near(1 / unitVol, 181.7917, 0.001));
check('G6: 1 m³ cần 10.388 thanh (theo định mức)', near((1 / unitVol) * (40 / 0.7), 10388.1, 1));
check('G7: với tỷ lệ thực tế 0,15205 thanh/kg → 1 m³ cần ~68.325 kg tươi (nếu đúng ĐM nan)',
  near(((1 / unitVol) * (40 / 0.7)) / (2600 / 17100), 68325, 50));


// ═══ H. CẤU TRÚC (index.html · events.js · sw.js · styles.css · storage.js) ═
const idxHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const dashSrc = fs.readFileSync(new URL('../js/dashboard.js', import.meta.url), 'utf8');
const swJs = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const storSrc = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const traceSrc = fs.readFileSync(new URL('../js/trace.js', import.meta.url), 'utf8');

check('H1: index.html có thẻ #trace-card NẰM TRONG Vùng Nâng Cao (trước thẻ khóa)',
  idxHtml.includes('id="trace-card"') &&
  idxHtml.indexOf('id="dash-zone-advanced"') < idxHtml.indexOf('id="trace-card"') &&
  idxHtml.indexOf('id="trace-card"') < idxHtml.indexOf('id="advanced-zone-lock"'));

check('H2: index.html đủ 6 id con (kpis · chain · products · product · period-label · prev/next)',
  ['trace-kpis', 'trace-chain', 'trace-products', 'trace-product', 'trace-period-label', 'trace-prev', 'trace-next']
    .every(id => idxHtml.includes(`id="${id}"`)));
check('H3: index.html có 3 nút chế độ kỳ Tuần/Tháng/Năm',
  ['week', 'month', 'year'].every(m => idxHtml.includes(`data-trace-mode="${m}"`)));
check('H4: index.html ghi rõ 2 phần ① tổng quan+chi tiết công đoạn · ② theo từng mã',
  idxHtml.includes('Tổng quan toàn xưởng &amp; chi tiết công đoạn') &&
  idxHtml.includes('Truy xuất theo từng mã ván / thanh / Bullig'));
check('H4b: index.html có nút #trace-detail-toggle + khối #trace-detail ẩn mặc định (hidden)',
  idxHtml.includes('id="trace-detail-toggle"') && idxHtml.includes('id="trace-detail" hidden') &&
  idxHtml.includes('aria-controls="trace-detail"'));
check('H5: index.html có ghi chú CÔNG THỂ TÍCH + ước tính phân bổ',
  idxHtml.includes('Dài × Rộng × Dày ÷ 1.000.000.000') && idxHtml.includes('Kg tươi của mã'));

check('H6: events.js import từ ./trace.js',
  evSrc.includes("from './trace.js'") && evSrc.includes('setTraceMode') && evSrc.includes('shiftTracePeriod') && evSrc.includes('setTraceProduct'));
check('H7: events.js wire trace-prev / trace-next / trace-product / [data-trace-mode]',
  evSrc.includes("safeOn('trace-prev'") && evSrc.includes("safeOn('trace-next'") &&
  evSrc.includes("safeOn('trace-product'") && evSrc.includes("[data-trace-mode]"));

check('H8: dashboard.js gọi renderTraceCard trong renderDashboardCharts (chỉ khi có quyền)',
  dashSrc.includes("from './trace.js'") && dashSrc.includes('if (canViewAdvanced()) renderTraceCard();'));

check('H9: sw.js có ./js/trace.js trong APP_SHELL', swJs.includes("'./js/trace.js'"));
check('H10: sw.js đã tăng cache lên v252', /nha-may-ngoc-son-v252/.test(swJs));

check('H11: styles.css có khối THẺ TRUY XUẤT (.trace-card/.trace-kpi/.trace-table)',
  cssSrc.includes('THẺ TRUY XUẤT ĐẦU VÀO → ĐẦU RA') &&
  cssSrc.includes('.trace-card') && cssSrc.includes('.trace-kpi-row') &&
  cssSrc.includes('.trace-table-wrap') && cssSrc.includes('.trace-mode-btn'));

check('H12: storage.js GHI 3 miền vào file (materialRates · planningItems · pressRecords)',
  /materialRates: state\.materialRates/.test(storSrc) &&
  /planningItems: state\.planningItems/.test(storSrc) &&
  /pressRecords: state\.pressRecords/.test(storSrc));
check('H13: storage.js có 3 hàm khôi phục + gọi trong loadDataFromLocalFile',
  storSrc.includes('function restoreMaterialRates') && storSrc.includes('function restorePlanningItems') &&
  storSrc.includes('function restorePressRecords') &&
  storSrc.includes('restoreMaterialRates(imported.materialRates)') &&
  storSrc.includes('restorePlanningItems(imported.planningItems)') &&
  storSrc.includes('restorePressRecords(imported.pressRecords)'));
check('H14: trace.js CHỈ ĐỌC — không đẩy mây, không import dashboard/main (tránh vòng import)',
  !traceSrc.includes('firePushSync') && !traceSrc.includes("from './dashboard.js'") && !traceSrc.includes("from './main.js'"));
check('H15: trace.js dùng ĐÚNG hàm hiển thị của các thẻ công đoạn',
  ['cutDisplay', 'boOngDisplay', 'baoThoDisplay', 'chonNanDisplay', 'baoTinhDisplay', 'pressRecordVolumeOf']
    .every(fn => traceSrc.includes(fn)));
check('H16: thẻ #trace-card có class advanced-only (tự ẩn với người không có quyền xem Vùng Nâng Cao)',
  /class="planning-card trace-card advanced-only"/.test(idxHtml) &&
  /body:not\(\.can-advanced\) \.advanced-only \{ display: none !important; \}/.test(cssSrc));
check('H17: events.js wire nút #trace-detail-toggle + import toggleTraceDetail',
  evSrc.includes('toggleTraceDetail') && evSrc.includes("safeOn('trace-detail-toggle', 'click', toggleTraceDetail)"));
check('H18: styles.css có .trace-detail-toggle + .trace-detail[hidden] + .trace-unlinked-row',
  cssSrc.includes('.trace-detail-toggle') && cssSrc.includes('.trace-detail[hidden] { display: none !important; }') &&
  cssSrc.includes('.trace-unlinked-row'));
check('H19: trace.js lấy ĐÚNG nguồn đo thật từng loại (chuỗi 2 bước ép ván · bullig · QC)',
  traceSrc.includes('pressRecordVolumeOf') && traceSrc.includes('traceRunNanSticks') &&
  traceSrc.includes('nanPerVtPiece') && traceSrc.includes('TRACE_NAN_PIECE_MAX_VOL') &&
  traceSrc.includes('bulligDisplay') && traceSrc.includes('bulligPlanProductId') &&
  traceSrc.includes('qcThanhPlanProductId') && traceSrc.includes('TRACE_UNLINKED_ID') &&
  traceSrc.includes("basis: 'thanh thật'"));

// ═══ I. 4 YÊU CẦU BỔ SUNG (15/10/2026) ══════════════════════════
// I1. BỎ CỘT "HIỆU SUẤT" — chỉ giữ hiệu suất tính ngầm ở cột "nếu đúng ĐM nan"
check('I1: bảng mã KHÔNG còn cột "Hiệu suất" (thead)',
  !traceSrc.includes('<th class="trace-num">Hiệu suất</th>') && !prodHtml.includes('>Hiệu suất<'));
check('I2: bảng mã còn đúng 8 cột',
  (prodHtml.match(/<th[ >]/g) || []).length === 8 && prodHtml.includes('>Mã ván / thanh / Bullig<'));
check('I3: vẫn giữ cột đối chiếu "Kg tươi / 1 m³ (nếu đúng ĐM nan)" (tính ngầm bằng ĐM + hiệu suất)',
  traceSrc.includes('nếu đúng ĐM nan') && traceSrc.includes('kgPerM3LyThuyet'));
check('I4: hiệu suất CHỈ nằm trong tooltip của ô tên mã (không hiển thị ra ngoài)',
  traceSrc.includes('Hiệu suất chuyển đổi nan khai trong định mức') &&
  traceSrc.includes('title="${escapeHTML(nameTitle(r))}"') &&
  !prodHtml.includes('· ĐM ') && !prodHtml.includes('>70%<'));

// I2. BANNER "ĐANG XÂY DỰNG" + nút ? chứa toàn bộ giải thích
check('I5: index.html có BANNER cảnh báo "đang trong quá trình xây dựng"',
  idxHtml.includes('class="trace-wip-banner"') &&
  idxHtml.includes('Chức năng đang trong quá trình xây dựng — kết quả có thể chưa đúng, hãy chờ admin sửa chữa.'));
check('I6: styles.css có khối .trace-wip-banner (nền vàng + viền nét đứt)',
  cssSrc.includes('.trace-wip-banner') && cssSrc.includes('#fef3c7') && cssSrc.includes('#f59e0b'));
check('I7: có nút #trace-help-btn chứa toàn bộ CÔNG THỨC + giải thích trong tooltip',
  idxHtml.includes('id="trace-help-btn"') &&
  idxHtml.includes('Công thức: Thể tích 1 đơn vị = Dài × Rộng × Dày ÷ 1.000.000.000'));
check('I8: khối .trace-note KHÔNG CÒN (chú thích đã chuyển hết vào tooltip / nút ?)',
  !idxHtml.includes('class="trace-note"') && !cssSrc.includes('.trace-note {'));
check('I9: dòng chú dưới tên mã đã thu gọn (chỉ ĐVT · lượt · %, còn lại ở tooltip)',
  !traceSrc.includes('· phân bổ theo ') && traceSrc.includes('Phân bổ theo: ') &&
  traceSrc.includes('Nguồn số đo: '));

// I3. VÙNG NÂNG CAO BIỂU ĐỒ — ĐÃ XÓA HẲN (không phải ẩn)
const expSrc = fs.readFileSync(new URL('../js/export-xlsx.js', import.meta.url), 'utf8');
const permSrc = fs.readFileSync(new URL('../js/permissions.js', import.meta.url), 'utf8');
check('I10: index.html KHÔNG còn nút + khung lưới + option "Nâng Cao" của builder',
  !idxHtml.includes('btn-add-chart-advanced') &&
  !idxHtml.includes('advanced-charts-grid') &&
  !idxHtml.includes('id="builder-zone"') &&
  !idxHtml.includes('Nâng Cao (Admin/BQL)'));
check('I11: dashboard.js KHÔNG còn code render/kéo-thả vùng nâng cao + ép builder về basic',
  !dashSrc.includes('advanced-charts-grid') && !dashSrc.includes('btn-add-chart-advanced') &&
  !dashSrc.includes("zone === 'advanced'") && dashSrc.includes("const zone = 'basic';"));
check('I12: events.js KHÔNG còn wire nút "Tạo Biểu Đồ Nâng Cao"', !evSrc.includes('btn-add-chart-advanced'));
check('I13: permissions.js ĐÃ XOÁ hàm canEditChartZone', !permSrc.includes('function canEditChartZone'));
check('I14: biểu đồ vùng nâng cao cũ ĐÃ DỌN hẳn (backup trước khi xóa + tombstone)',
  expSrc.includes("captureAutoBackup(`Trước khi dọn") && expSrc.includes("trackDeleted('customCharts'") &&
  expSrc.includes("c.zone !== 'advanced'"));

console.log('KẾT QUẢ: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);

