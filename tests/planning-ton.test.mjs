// tests/planning-ton.test.mjs — Kiểm thử logic TỔNG TỒN (trượt tồn theo tuần)
// Quy tắc (tuần hiện tại là "n"):
//   - Tồn NGUYÊN LIỆU (ma trận Kế Hoạch): tuần ĐÃ QUÁ KHỨ (< n) trượt bằng số thanh
//     ĐÃ CHUYỂN BÀO TINH (thanh lỗi bị loại ở công đoạn này); tuần HIỆN TẠI trở đi
//     trượt bằng số thanh THEO KẾ HOẠCH ("Cần").
//   - Tồn THANH ĐẠT (đầu ra Bào Tinh, dùng cho "Có thể ép"): cộng ĐÃ BÀO TINH theo
//     tuần chuyển, trừ ĐÃ ÉP thực tế (quá khứ) / KẾ HOẠCH (hiện tại trở đi).
// Che phủ: getActualPressedByWeek, getBaoTinhConvertedByWeek,
//          computePlanningWeekData, getCumulativeInventoryByWeek,
//          computeBaoTinhEfficiencyByWeek (bảng Bào Tinh ↔ Đã Ép),
//          getBaoTinhConversion với b.baoTinhDate (ngày bào tinh thực tế đè tự động).
'use strict';

/* ── Stub môi trường trình duyệt (giống tests/smoke.mjs) ──────────────── */
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
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}, exitFullscreen(){}, fullscreenElement: null,
  createEvent: () => ({ initEvent(){} }),
  escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
function defGlobal(k, v) { try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch { global[k] = v; } }
defGlobal('navigator', {
  onLine: true, userAgent: 'node-test', language: 'vi',
  clipboard: { writeText: async () => {} }, serviceWorker: { register: async () => ({ update(){}, addEventListener(){} }) }
});
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
const storeBacking = new Map();
global.localStorage = {
  getItem: (k) => (storeBacking.has(k) ? storeBacking.get(k) : null),
  setItem: (k, v) => { storeBacking.set(k, String(v)); },
  removeItem: (k) => { storeBacking.delete(k); },
  clear: () => storeBacking.clear(),
  key: (i) => [...storeBacking.keys()][i] ?? null,
  get length() { return storeBacking.size; }
};
global.sessionStorage = { getItem: () => null, setItem(){}, removeItem(){}, clear(){}, key: () => null, get length() { return 0; } };
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
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
global.XLSX = { utils: {}, writeFile(){}, write: () => new ArrayBuffer(8) };
if (!global.URL.createObjectURL) global.URL.createObjectURL = () => 'blob:stub';
if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};

/* ── Bộ đếm kiểm thử ──────────────────────────────────────────────────── */
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name); }
}

(async () => {
  const plan = await import('../js/planning.js');
  const press = await import('../js/press.js');
  const mat = await import('../js/materials.js');
  const { state } = await import('../js/state.js');
  const { getISOWeekString } = await import('../js/utils.js');

  // Năm/tuần hiện tại: dữ liệu kiểm thử đặt QUANH tuần hiện tại để kiểm cả 2 chế độ
  const Y = new Date().getFullYear();
  const N = plan.getCurrentISOWeeks(); // tuần hiện tại "n"
  if (!(N >= 4 && N <= 50)) {
    console.log('Bỏ qua kiểm thử (đầu/cuối năm không đủ tuần quá khứ & tương lai)');
    return;
  }
  const P = N - 2;           // tuần ĐÃ QUÁ KHỨ
  const K = '1250×18×7@Ván'; // khóa composite kiểm thử

  /* ── PHẦN A: getActualPressedByWeek — ánh xạ sticks → khóa kế hoạch ── */
  console.log('--- PHẦN A: ÁNH XẠ SỐ THANH ĐÃ ÉP THỰC TẾ THEO TUẦN ---');
  state.materialRates = [
    // rate-2 khai báo 2 loại nan → mã riêng KHÔNG quy được qua định mức
    { id: 'rate-2', product: 'Ván 1250×382×18', efficiency: 100, nan1: '1250×18×7', nan1Qty: '6', nan2: '1250×24×7', nan2Qty: '6', glue: 0, additive: 0 }
  ];
  state.batches = [
    { id: 'bx9',  code: 'X9-01', stage: 'kho', length: 1250, width: 18, thickness: 7, quantity: 999, useFor: 'Ván',    bambooType: 'X9', week: `Tuần ${P - 1}`, date: `${Y}-03-05` },
    { id: 'by8a', code: 'Y8-01', stage: 'kho', length: 1250, width: 18, thickness: 7, quantity: 500, useFor: 'Ván',    bambooType: 'Y8', week: `Tuần ${P - 1}`, date: `${Y}-03-05` },
    { id: 'by8b', code: 'Y8-02', stage: 'kho', length: 1250, width: 24, thickness: 7, quantity: 500, useFor: 'Bullig', bambooType: 'Y8', week: `Tuần ${P - 1}`, date: `${Y}-03-05` }
  ];
  state.pressRecords = [
    // Mã riêng 'X9' — các lô cùng loại chỉ có 1 kích thước → suy được
    { id: 'a1', date: `${Y}-03-10`, week: `Tuần ${P}`, year: Y, productId: 'rate-2', finishedQty: 10, sticks: [{ nanKey: 'X9', sticks: 100 }], vanTho: [] },
    // Kích thước thô (viết 'x' thường) → chuẩn hóa, mục đích suy từ sản phẩm
    { id: 'a2', date: `${Y}-03-11`, week: `Tuần ${P}`, year: Y, productId: 'rate-2', finishedQty: 10, sticks: [{ nanKey: '1250x18x7', sticks: 300 }], vanTho: [] },
    // Mã không rõ nguồn (không định mức, không lô) → bỏ qua
    { id: 'a3', date: `${Y}-03-12`, week: `Tuần ${P}`, year: Y, productId: '', finishedQty: 10, sticks: [{ nanKey: 'ZZ', sticks: 70 }], vanTho: [] },
    // Mã 'Y8' trùng 2 kích thước → không suy được → bỏ qua
    { id: 'a4', date: `${Y}-03-12`, week: `Tuần ${P}`, year: Y, productId: 'rate-2', finishedQty: 10, sticks: [{ nanKey: 'Y8', sticks: 70 }], vanTho: [] }
  ];
  state.planningItems = [];
  state.planningForecast = {}; state.planningStock = {};

  const pressed = plan.getActualPressedByWeek(Y);
  check('A: mã X9 (lô cùng loại 1 kích thước) + kích thước thô → 100+300 = 400 @Ván', !!pressed[P] && pressed[P][K] === 400);
  check('A: chỉ ánh xạ đúng 1 khóa composite', !!pressed[P] && Object.keys(pressed[P]).length === 1);
  check('A: mã ZZ không suy được → bỏ qua', !pressed[P] || pressed[P]['ZZ@Ván'] == null);
  check('A: mã Y8 (2 kích thước) → bỏ qua, không tạo khóa Bullig', !pressed[P] || pressed[P]['1250×24×7@Bullig'] == null);
  check('A: không phát sinh số liệu ở tuần khác', Object.keys(pressed).length === 1 && !!pressed[P]);

  /* ── PHẦN B: trượt tồn — quá khứ trừ ĐÃ BÀO TINH, hiện tại trở đi trừ KẾ HOẠCH ── */
  console.log('--- PHẦN B: TRƯỢT TỒN THEO CHẾ ĐỘ (quá khứ / hiện tại) ---');
  // Định mức: 6 thanh 1250×18×7 / tấm, hiệu suất 100% → Cần = 6 × qty
  // Ngày đại diện thuộc đúng tuần ISO (để mốc chuyển bào tinh khớp tuần kiểm thử)
  const dateInWeek = (year, week) => {
    const d = new Date(`${year}-01-01T00:00:00`);
    for (let i = 0; i < 400; i++) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const m = getISOWeekString(iso).match(/Tuần\s*(\d+)/);
      if (m && parseInt(m[1]) === week && d.getFullYear() === year) return iso;
      d.setDate(d.getDate() + 1);
    }
    return `${year}-06-15`;
  };
  const datePm1 = dateInWeek(Y, P - 1), dateP = dateInWeek(Y, P);

  state.materialRates = [
    { id: 'rate-1', product: 'Ván 1250×382×12', efficiency: 100, nan1: '1250×18×7', nan1Qty: '6', nan2: '', nan2Qty: '', nan3: '', nan3Qty: '', glue: 0, additive: 0 }
  ];
  state.batches = [
    // Tuần quá khứ P: nhập 1000 thanh; tuần hiện tại N: nhập 200 thanh (còn ở Kho)
    { id: 'b1', code: 'L01', stage: 'kho', length: 1250, width: 18, thickness: 7, quantity: 1000, useFor: 'Ván', bambooType: 'A', week: `Tuần ${P}`, date: `${Y}-03-01` },
    { id: 'b2', code: 'L02', stage: 'kho', length: 1250, width: 18, thickness: 7, quantity: 200,  useFor: 'Ván', bambooType: 'A', week: `Tuần ${N}`, date: `${Y}-03-01` },
    // Lô nhập tuần P−1, CHUYỂN BÀO TINH ở tuần P: 1000 thanh rời kho nguyên liệu tại P
    { id: 'b3', code: 'L03', stage: 'bao_tinh', length: 1250, width: 18, thickness: 7, quantity: 1000, useFor: 'Ván', bambooType: 'A1', week: `Tuần ${P - 1}`, date: datePm1,
      stageHistory: [{ stage: 'say1', date: datePm1 }, { stage: 'bao_tinh', date: dateP }] }
  ];
  state.planningItems = [
    // Kế hoạch tuần quá khứ P: 200 tấm → Cần 1200 (KHÔNG dùng khi trượt tuần quá khứ)
    { id: 'p0', week: `Tuần ${P}`, year: Y, productId: 'rate-1', qty: 200 },
    // Kế hoạch tuần hiện tại N: 100 tấm → Cần 600 (DÙNG khi trượt từ tuần N)
    { id: 'p1', week: `Tuần ${N}`, year: Y, productId: 'rate-1', qty: 100 }
  ];
  state.pressRecords = [
    // Đã ép thực tế tuần quá khứ P: 300 thanh; tuần hiện tại N: 50 thanh
    { id: 'e1', date: `${Y}-03-10`, week: `Tuần ${P}`, year: Y, productId: 'rate-1', finishedQty: 40, sticks: [{ nanKey: '1250×18×7', sticks: 300 }], vanTho: [] },
    { id: 'e2', date: `${Y}-03-10`, week: `Tuần ${N}`, year: Y, productId: 'rate-1', finishedQty: 8,  sticks: [{ nanKey: '1250×18×7', sticks: 50 }],  vanTho: [] }
  ];
  state.planningForecast = {}; state.planningStock = {};

  // ── ĐÃ BÀO TINH theo tuần (mốc chuyển rời kho nguyên liệu) ──
  const convW = plan.getBaoTinhConvertedByWeek(Y);
  check('B: ĐÃ BÀO TINH tuần P = 1000 (mốc bao_tinh trong stageHistory)', !!convW[P] && convW[P][K] === 1000);
  check('B: không phát sinh đã bào tinh ở tuần khác', Object.keys(convW).length === 1 && !!convW[P]);

  // ── Tồn NGUYÊN LIỆU (ma trận): quá khứ trừ đã bào tinh, hiện tại trở đi trừ kế hoạch ──
  const wd = plan.computePlanningWeekData(Y);
  check('B: TỒN tuần P−1 = 1000 (lô b3 nhập tuần P−1)', wd[P - 1].nan[K].ton === 1000);
  check('B: TỒN tuần P = 1000 + 1000 (b1 nhập P) = 2000 (tuần P chưa trừ)', wd[P].nan[K].ton === 2000);
  check('B: TỒN tuần N = 2000 − 1000 (ĐÃ BÀO TINH P) + 200 = 1200 (KHÔNG trừ 300 đã ép)', wd[N].nan[K].ton === 1200);
  check('B: CẦN tuần quá khứ P = 1200 (chỉ hiển thị, không dùng trượt quá khứ)', wd[P].nan[K].can === 1200);
  check('B: CẦN tuần hiện tại N = 600', wd[N].nan[K].can === 600);
  check('B: TỒN tuần N+1 = 1200 − 600 (KẾ HOẠCH N) = 600', wd[N + 1].nan[K].ton === 600);
  check('B: TỒN tuần N+2 giữ 600', wd[N + 2].nan[K].ton === 600);

  // ── Tồn THANH ĐẠT (đầu ra bào tinh) cho "Có thể ép": cộng đã bào tinh, trừ đã ép/kế hoạch ──
  const cumP   = plan.getCumulativeInventoryByWeek(Y, P)[K];
  const cumN   = plan.getCumulativeInventoryByWeek(Y, N)[K];
  const cumN1  = plan.getCumulativeInventoryByWeek(Y, N + 1)[K];
  const cumAll = plan.getCumulativeInventoryByWeek(Y)[K];
  check('B: Thanh đạt đến P = 1000 (đã bào tinh tuần P)', cumP === 1000);
  check('B: Thanh đạt đến N = 1000 − 300 (ĐÃ ÉP P) = 700', cumN === 700);
  check('B: Thanh đạt đến N+1 = 700 − 600 (KẾ HOẠCH N) = 100', cumN1 === 100);
  check('B: Thanh đạt cả năm = 100', cumAll === 100);

  /* ── PHẦN C: bảng Bào Tinh ↔ Đã Ép (hiệu suất chuyển đổi theo tuần) ── */
  console.log('--- PHẦN C: BẢNG HIỆU SUẤT CHUYỂN ĐỔI BÀO TINH ---');
  const eff = press.computeBaoTinhEfficiencyByWeek(Y);
  check('C: bảng có 2 tuần có dữ liệu (P rồi N, sắp tăng)', eff.rows.length === 2 && eff.rows[0].week === P && eff.rows[1].week === N);
  check('C: tuần P — đã bào tinh 1000, đã ép 300', eff.rows[0].conv === 1000 && eff.rows[0].pressed === 300);
  check('C: tuần P — còn lại lũy kế 700, hiệu suất 30%', eff.rows[0].remaining === 700 && eff.rows[0].effPct === 30);
  check('C: tuần N — đã ép 50, còn lại lũy kế 650, hiệu suất 35%', eff.rows[1].pressed === 50 && eff.rows[1].remaining === 650 && eff.rows[1].effPct === 35);
  check('C: tổng lũy kế — bào tinh 1000, đã ép 350', eff.totalConv === 1000 && eff.totalPressed === 350);
  check('C: tồn bào tinh hiện tại quy về năm Y = 1000 (thanh đạt chờ ép)', eff.currentBtStock === 1000);
  check('C: ước tính thanh lỗi = max(0, 1000 − 350 − 1000) = 0', eff.estDefect === 0);

  /* ── PHẦN D: NGÀY BÀO TINH THỰC TẾ (b.baoTinhDate) đè nhận diện tự động ── */
  console.log('--- PHẦN D: NGÀY BÀO TINH THỰC TẾ (GHI ĐÈ TỰ ĐỘNG) ---');
  const dateN = dateInWeek(Y, N);
  state.batches[2].baoTinhDate = dateN; // lô b3: ngày bào tinh thật ở tuần N (khác mốc tự động @P)
  const convW2 = plan.getBaoTinhConvertedByWeek(Y);
  check('D: baoTinhDate ghi đè lịch sử → đã bào tinh dời sang tuần N', !!convW2[N] && convW2[N][K] === 1000 && !convW2[P]);
  delete state.batches[2].baoTinhDate;
  const convW3 = plan.getBaoTinhConvertedByWeek(Y);
  check('D: bỏ ghi đè → nhận diện tự động từ stageHistory (tuần P) trở lại', !!convW3[P] && convW3[P][K] === 1000);

  /* ── PHẦN E: sổ theo dõi ô TỔNG TỒN (tooltip biểu thức & hộp thoại chi tiết) ── */
  console.log('--- PHẦN E: SỔ THEO DÕI Ô TỔNG TỒN (TRACE) ---');
  const ledK = wd.ledger[K];
  check('E: ledger đủ 52 tuần cho từng ô tồn', Array.isArray(ledK) && ledK.length === 52);
  check('E: tuần P — nhập 1000, trừ 1000 (đã bào tinh), TỔNG TỒN 2000',
    ledK[P - 1].import === 1000 && ledK[P - 1].deduct === 1000 && /bào tinh/.test(ledK[P - 1].deductLabel) && ledK[P - 1].ton === 2000);
  check('E: tuần N — lũy kế đầu tuần 1000, nhập 200, TỔNG TỒN 1200, trừ kế hoạch 600',
    ledK[N - 1].carryIn === 1000 && ledK[N - 1].import === 200 && ledK[N - 1].ton === 1200 && ledK[N - 1].deduct === 600 && /kế hoạch/.test(ledK[N - 1].deductLabel));
  const exprN = plan.buildTonExpression(ledK[N - 1], ledK[P - 1]);
  check('E: biểu thức đủ thành phần (tồn P, đã bào tinh P, nhập N)',
    typeof exprN === 'string' && exprN.includes(' = ') && exprN.includes(`tồn tuần ${P}`) && exprN.includes(`đã bào tinh (thực tế) tuần ${P}`) && exprN.includes(`+ 200 nhập mới tuần ${N}`));
  const exprP1 = plan.buildTonExpression(ledK[0], null);
  check('E: tuần 1 — biểu thức không có thành phần tồn tuần trước', !/tồn tuần/.test(exprP1) && exprP1.includes(`nhập mới tuần 1`));

  /* ── PHẦN F: cửa sổ hiển thị biểu đồ ép ván (14 ngày máy tính / 7 ngày điện thoại) ── */
  console.log('--- PHẦN F: CỬA SỔ HIỂN THỊ BIỂU ĐỒ ÉP VÁN ---');
  check('F: môi trường test (stub màn hẹp) → 7 ngày/cửa sổ', press.pressWinSize() === 7);
  state.pressChartWinStart = null;
  const w20 = press.pressChartWindow(20);
  check('F: 20 ngày, cửa sổ 7 → mặc định neo cuối (13..19)', w20.size === 7 && w20.start === 13 && w20.total === 20);
  state.pressChartWinStart = 99;
  check('F: start vượt quá → kẹp về total − size', press.pressChartWindow(20).start === 13);
  state.pressChartWinStart = 2;
  check('F: start hợp lệ được giữ nguyên', press.pressChartWindow(20).start === 2);
  state.pressChartWinStart = -5;
  check('F: start âm → về mặc định neo cuối', press.pressChartWindow(20).start === 13);
  state.pressChartWinStart = null;
  const w2 = press.pressChartWindow(2);
  check('F: 2 ngày ≤ cửa sổ → hiện từ đầu, đủ hết dữ liệu', w2.start === 0 && w2.size === 2 && w2.total === 2);
  state.pressChartWinStart = null;

  /* ── PHẦN G: cửa sổ biểu đồ Nguyên liệu (42 cột MT / 21 cột ĐT trên phạm vi tuần→cuối năm) ── */
  console.log('--- PHẦN G: CỬA SỔ BIỂU ĐỒ NGUYÊN LIỆU (42/21 CỘT) ---');
  state.materialPlanChartWinStart = null;
  const mw = mat.mpChartWindow(84); // 84 cột = 4 tuần × 21
  check('G: stub màn hẹp → cửa sổ 21 cột (1 tuần) trên phạm vi 84 cột', mw.size === 21 && mw.start === 0 && mw.total === 84);
  state.materialPlanChartWinStart = 99;
  check('G: start 99 → kẹp về 63 (84 − 21)', mat.mpChartWindow(84).start === 63);
  state.materialPlanChartWinStart = 30;
  check('G: start hợp lệ giữ nguyên', mat.mpChartWindow(84).start === 30);
  state.materialPlanChartWinStart = -1;
  check('G: start âm → về đầu tuần', mat.mpChartWindow(84).start === 0);
  state.materialPlanChartWinStart = null;
  const mw21 = mat.mpChartWindow(21);
  check('G: phạm vi 21 cột (1 tuần) → hiển thị đủ cả T7, CN', mw21.size === 21 && mw21.start === 0);
  state.materialPlanChartWinStart = null;

  /* ── PHẦN H: cột lồng 3 vị trí (KH/TT) — null xen kẽ, KH co bằng TT ── */
  console.log('--- PHẦN H: CỘT LỒNG 3 VỊ TRÍ (KH/TT RIÊNG BIỆT) ---');
  const spanData = mat.buildMaterialPlanSpanData('2026-W33');
  check('H: mỗi tuần 21 cột (7 ngày × 3 vị trí)', spanData.slotCount === 3 && spanData.daySlots.length === spanData.labels.length && spanData.labels.length % 21 === 0);
  check('H: daySlots đánh dấu đúng vị trí (li = i % 3)', spanData.daySlots[0].li === 0 && spanData.daySlots[1].li === 1 && spanData.daySlots[2].li === 2 && spanData.daySlots[3].li === 0);
  const d0 = spanData.datasets[0].data; // cột KH của vị trí 1
  check('H: vị trí 1 chiếm cột 0,3,6 (lẽ ra null ở 1,2 — không gộp 3 vị trí)', d0[0] !== null && d0[1] === null && d0[2] === null && d0[3] !== null && d0[6] !== null);
  const d2 = spanData.datasets[2].data; // cột KH của vị trí 2
  check('H: vị trí 2 chiếm cột 1,4,7', d2[1] !== null && d2[0] === null && d2[2] === null && d2[4] !== null);
  check('H: cột KH co bằng cột TT (barPercentage 0.72)', spanData.datasets[0].barPercentage === 0.72 && spanData.datasets[1].barPercentage === 0.72);

  console.log(`\nKết quả: ${pass} pass, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('LỖI TEST:', e); process.exit(1); });

