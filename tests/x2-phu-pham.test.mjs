// tests/x2-phu-pham.test.mjs — THẺ PHỤ PHẨM & BĂM + CÂN ĐỐI + KIỂM KÊ (18/10/2026)
// Kiểm thử: NHẬP tự suy ra (ngọn/mắt/ống lỗi băm) · TỒN · doanh thu ·
// GIÁ THÀNH 1 KG ỐNG ĐẠT · giảm trừ NCC · CÂN ĐỐI khối lượng · KIỂM KÊ bãi
// (điều chỉnh tồn) · ĐỊNH MỨC TỶ LỆ · render thẻ + nối state/storage/cloud/
// history/main/index/report/export/suppliers.
'use strict';
import fs from 'node:fs';

function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, removeAttribute(){},
    getAttribute() { return null; },
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
state.materialRecords = [
  { id: 'm1', type: 'Luồng cây xô', supplier: 'Nhà Tế',    location: 'xuong-2', weight: 10000, unitPrice: 2000, totalAmount: 20000000, date: '2026-10-18', createdAt: '2026-10-18T01:00:00.000Z' },
  { id: 'm2', type: 'Luồng ống',    supplier: 'Nhà Tế',    location: 'xuong-2', weight: 5000,  unitPrice: 2200, totalAmount: 11000000, date: '2026-10-18', createdAt: '2026-10-18T02:00:00.000Z' },
  { id: 'm3', type: 'Luồng cây khô', supplier: 'Nhà Trung', location: 'xuong-2', weight: 5000,  unitPrice: 1800, totalAmount: 9000000,  date: '2026-10-18', createdAt: '2026-10-18T03:00:00.000Z' }
];
state.xuong2BoluongRecords = [
  { id: 'b1', date: '2026-10-18', tickets: [{ materialId: 'm1', kg: 10000 }], inputWeight: 10000, qty: 8000, carts: 13, kgPerCart: 615.38, ngonKg: 2000, ngonEst: true, materialType: 'Luồng cây xô', supplier: 'Nhà Tế', supplierLabel: 'Nhà Tế' }
];
state.xuong2CutRecords = [
  { id: 'c1', date: '2026-10-18', inputKind: 'cart', carts: 10, kgPerCart: 600, inputWeight: 6000, klOngLuong: 5000, klOngLoi: 300, klMatLuong: 200, klNgonOngLoai: 500, rejectRoute: 'bam', supplierLabel: 'Nhiều nguồn (xe bốc)', supplier: '' },
  { id: 'c2', date: '2026-10-18', inputKind: 'ong', tickets: [{ materialId: 'm2', kg: 5000 }], inputWeight: 5000, klOngLuong: 4600, klOngLoi: 400, klMatLuong: 0, klNgonOngLoai: 0, returnedKg: 400, rejectRoute: 'tra_ncc', supplier: 'Nhà Tế', supplierLabel: 'Nhà Tế' }
];
state.xuong2BoOngRecords = [
  { id: 'o1', date: '2026-10-18', cutId: '', poolMode: true, inputOng: 4000, klOngLoai: 100, klOngBo: 3900 }
];
state.x2PhuPhamRecords = [];
state.x2Stocktakes = [];
state.x2YieldRates = { cay: { ongDat: 88, ongLoi: 3, mat: 3 }, ong: { ongDat: 95, ongLoi: 5 } };
state.xuong2HoTroRecords = [];
state.hrEmployees = []; state.hrPositions = []; state.hrAssignments = [];
state.suppliers = [{ id: 's1', name: 'Nhà Tế', code: 'NCC01' }];

const pp = await import('../js/x2-phu-pham.js');
const pool = await import('../js/x2-pool.js');
const x2 = await import('../js/xuong2.js');
const specs = await import('../js/report-specs.js');
const xlsx = await import('../js/export-xlsx.js');

// ─── A. NHẬP TỰ SUY RA + TỒN ────────────────────────────────────
const inRows = pp.x2PhuPhamInRows();
check('A1: NHẬP tự suy ra: ngọn 2.000 kg (Bốc) + mắt 200 + ống lỗi băm 300 (Cắt)',
  inRows.length === 3 &&
  inRows.find(r => r.kind === 'ngon').kg === 2000 &&
  inRows.find(r => r.kind === 'mat').kg === 200 &&
  inRows.find(r => r.kind === 'ong_loi').kg === 300);
check('A2: ống lỗi TRẢ NCC KHÔNG vào phụ phẩm (đi sổ giảm trừ)',
  !inRows.some(r => r.kind === 'ong_loi' && r.kg === 400));
check('A3: tồn ban đầu = 2.000 + 200 + 300 = 2.500 kg',
  pp.x2PhuPhamStockTotal() === 2500);
check('A4: mỗi nguồn có tồn riêng (ngọn 2.000 · mắt 200 · ống lỗi 300)',
  pp.x2PhuPhamStock('ngon') === 2000 && pp.x2PhuPhamStock('mat') === 200 && pp.x2PhuPhamStock('ong_loi') === 300);

// ─── B. GHI BÁN / TIÊU HỦY (handler thật) ─────────────────────
const g = id => document.getElementById(id);
g('x2-pp-date').value = '2026-10-18';
g('x2-pp-kind').value = 'ngon';
g('x2-pp-out-form').value = 'raw';
g('x2-pp-out-type').value = 'sale';
g('x2-pp-kg').value = '1000';
g('x2-pp-price').value = '500';
g('x2-pp-party').value = 'Trại nấm';
g('x2-pp-note').value = 'bán ngọn';
pp.onX2PhuPhamCalc();
check('B1: dòng tự tính thành tiền = 1.000 × 500 = 500.000 đ',
  String(g('x2-pp-amount').textContent).includes('500.000'));
pp.handleX2PhuPhamSubmit({ preventDefault(){} });
const sale = state.x2PhuPhamRecords[0];
check('B2: lưu lượt bán: 1.000 kg · 500 đ/kg · 500.000 đ · người mua',
  !!sale && sale.kg === 1000 && sale.price === 500 && sale.amount === 500000 && sale.party === 'Trại nấm');
check('B3: tồn giảm: ngọn còn 1.000 kg · tổng còn 1.500 kg',
  pp.x2PhuPhamStock('ngon') === 1000 && pp.x2PhuPhamStockTotal() === 1500);
check('B4: doanh thu tháng = 500.000 đ', pp.x2PhuPhamRevenue('2026-10-01', '2026-10-31') === 500000);
// Thêm 1 lượt TIÊU HỦY 100 kg (giá 0)
state.x2PhuPhamRecords.push({ id: 'pp-dispose', date: '2026-10-18', kind: 'ngon', form: 'chipped', outType: 'dispose', kg: 100, price: 0, amount: 0, party: '', note: '' });
check('B5: tiêu hủy 100 kg → tổng tồn còn 1.400 kg · doanh thu KHÔNG đổi',
  pp.x2PhuPhamStockTotal() === 1400 && pp.x2PhuPhamRevenue('2026-10-01', '2026-10-31') === 500000);


// ─── C. GIÁ THÀNH 1 KG ỐNG ĐẠT ─────────────────────────────────
const cost = pp.x2CostingData('2026-10-01', '2026-10-31');
check('C1: tiền nguyên liệu = 10.000×2.000 + 5.000×2.200 = 31.000.000 đ',
  cost.materialCost === 31000000);
check('C2: doanh thu 500.000 · giảm trừ NCC 880.000 · chi phí thực 29.620.000 đ',
  cost.revenue === 500000 && cost.credit === 880000 && cost.netCost === 29620000);
check('C3: ống đạt 9.600 kg · giá thành 1 kg = 29.620.000 ÷ 9.600 = 3.085,42 đ/kg',
  cost.ongDat === 9600 && cost.costPerKg === 3085.42);

// ─── D. GIẢM TRỪ NHÀ CUNG CẤP (ống lỗi trả lại) ─────────────────
const credits = pp.x2SupplierCreditRows('2026-10-01', '2026-10-31');
check('D1: 1 phiếu trả NCC: 400 kg × 2.200 = 880.000 đ',
  credits.length === 1 && credits[0].kg === 400 && credits[0].price === 2200 && credits[0].amount === 880000);
check('D2: tổng giảm trừ NCC = 880.000 đ', pp.x2SupplierCreditTotal('2026-10-01', '2026-10-31') === 880000);

// ─── E. CÂN ĐỐI KHỐI LƯỢNG ────────────────────────────────────
const bal = pp.x2MassBalanceData('2026-10-01', '2026-10-31');
check('E1: nhập bãi 15.000 kg luồng cây + 5.000 kg luồng ống',
  bal.intakeCay === 15000 && bal.intakeOng === 5000);
check('E2: Bốc 10.000 kg vào · 8.000 kg lên xe · 2.000 kg ngọn/hao hụt',
  bal.boc.in === 10000 && bal.boc.out === 8000 && bal.boc.loss === 2000);
check('E3: Cắt xe 6.000 kg → đạt 5.000 · lỗi 300 · mắt 200 · hao 500',
  bal.cart.in === 6000 && bal.cart.dat === 5000 && bal.cart.loi === 300 && bal.cart.mat === 200 && bal.cart.loss === 500);
check('E4: Cắt ống 5.000 kg → đạt 4.600 · lỗi 400',
  bal.ong.in === 5000 && bal.ong.dat === 4600 && bal.ong.loi === 400);
check('E5: Bổ 4.000 kg → đạt 3.900 · loại 100',
  bal.bo.in === 4000 && bal.bo.dat === 3900 && bal.bo.loi === 100);
check('E6: tỷ lệ thực tế — cắt xe ống đạt 83,3% · cắt ống ống lỗi 8%',
  Math.round(bal.yields.cart.ongDat * 10) / 10 === 83.3 &&
  Math.round(bal.yields.ong.ongLoi * 10) / 10 === 8);

// ─── F. KIỂM KÊ BÃI (Admin) — điều chỉnh tồn ──────────────────
g('x2-pp-st-date').value = '2026-10-18';
g('x2-pp-st-pool').value = 'phu_pham';
g('x2-pp-st-actual').value = '1200';
g('x2-pp-st-note').value = 'kiểm kê cuối tuần';
pp.handleX2StocktakeSubmit({ preventDefault(){} });
const st1 = state.x2Stocktakes[0];
check('F1: phiếu kiểm kê phụ phẩm: sổ 1.400 → thực 1.200 · lệch −200',
  !!st1 && st1.bookKg === 1400 && st1.actualKg === 1200 && st1.diffKg === -200);
check('F2: tồn phụ phẩm sau điều chỉnh = 1.200 kg', pp.x2PhuPhamStockTotal() === 1200);
g('x2-pp-st-pool').value = 'cay';
g('x2-pp-st-actual').value = '4800';
pp.handleX2StocktakeSubmit({ preventDefault(){} });
check('F3: kiểm kê bãi luồng cây: sổ 5.000 → thực 4.800 · tồn nhóm = 4.800 kg',
  state.x2Stocktakes.length === 2 && pool.x2TicketTotals('cay').kg === 4800);

// ─── G. ĐỊNH MỨC TỶ LỆ (Admin) ───────────────────────────────
g('x2-pp-y-cay-ongdat').value = '90';
g('x2-pp-y-cay-ongloi').value = '2';
g('x2-pp-y-cay-mat').value = '2';
g('x2-pp-y-ong-ongdat').value = '96';
g('x2-pp-y-ong-ongloi').value = '4';
pp.handleX2YieldRateSave();
check('G1: lưu định mức tỷ lệ: xe 90/2/2 · ống 96/4',
  state.x2YieldRates.cay.ongDat === 90 && state.x2YieldRates.cay.mat === 2 &&
  state.x2YieldRates.ong.ongDat === 96 && state.x2YieldRates.ong.ongLoi === 4);
check('G2: định mức được ghi xuống localStorage',
  JSON.parse(localStorage.getItem('bamboo_tracker_x2_yield_rate_v1') || '{}').cay.ongDat === 90);

// ─── H. RENDER THẺ THẬT ───────────────────────────────────────
pp.renderX2PhuPhamCard();
check('H1: thanh tồn hiện "Tồn phụ phẩm" + chip từng nguồn',
  String(g('x2-pp-stock-bar').innerHTML).includes('Tồn phụ phẩm') &&
  String(g('x2-pp-stock-bar').innerHTML).includes('Ngọn'));
check('H2: khối giá thành hiện "Giá thành 1 kg ống đạt"',
  String(g('x2-pp-cost').innerHTML).includes('Giá thành 1 kg ống đạt'));
check('H3: khối cân đối hiện "Cân đối khối lượng"',
  String(g('x2-pp-balance').innerHTML).includes('Cân đối khối lượng'));
check('H4: bảng lịch sử có dòng "Nhập ước tính" + lượt bán',
  String(g('x2-pp-day-cards').innerHTML).includes('Nhập ước tính') &&
  String(g('x2-pp-day-cards').innerHTML).includes('Trại nấm'));
check('H5: sổ giảm trừ NCC hiện "Nhà Tế"',
  String(g('x2-pp-credit').innerHTML).includes('Nhà Tế'));
check('H6: mở thẻ x2-phu-pham-card không lỗi',
  x2.x2OpenCard('x2-phu-pham-card') === true);


// ─── I. CẤU TRÚC + NỐI 6 CHỖ + BÁO CÁO/XUẤT EXCEL ─────────────
const stSrc = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const stgSrc = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const cloudSrc = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const histSrc = fs.readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const mainSrc = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const idx = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const supSrc = fs.readFileSync(new URL('../js/suppliers.js', import.meta.url), 'utf8');
const rcSrc = fs.readFileSync(new URL('../js/report-center.js', import.meta.url), 'utf8');

check('I1: state.js có 3 key + 3 trường dữ liệu mới',
  stSrc.includes("STORAGE_KEY_X2_PHU_PHAM = 'bamboo_tracker_x2_phu_pham_v1'") &&
  stSrc.includes("STORAGE_KEY_X2_STOCKTAKE = 'bamboo_tracker_x2_stocktake_v1'") &&
  stSrc.includes("STORAGE_KEY_X2_YIELD_RATE = 'bamboo_tracker_x2_yield_rate_v1'") &&
  stSrc.includes('x2PhuPhamRecords:') && stSrc.includes('x2Stocktakes:') && stSrc.includes('x2YieldRates:'));
check('I2: storage.js có 3 hàm khôi phục + ghi vào file/backup + export',
  stgSrc.includes('function restoreX2PhuPham') && stgSrc.includes('function restoreX2Stocktakes') &&
  stgSrc.includes('function restoreX2YieldRates') && stgSrc.includes('x2PhuPhamRecords:') &&
  stgSrc.includes('x2Stocktakes:') && stgSrc.includes('x2YieldRates:') &&
  stgSrc.includes('restoreX2PhuPham,'));
check('I3: cloud.js có snapshot/core/merge/persist/apply + RATE_DOMAINS',
  (cloudSrc.match(/x2PhuPhamRecords:/g) || []).length >= 2 &&
  (cloudSrc.match(/x2PhuPhamRecords\)/g) || []).length >= 2 &&
  cloudSrc.includes("STORAGE_KEY_X2_PHU_PHAM") &&
  cloudSrc.includes("'x2YieldRates'") &&
  cloudSrc.includes('if (data.x2PhuPhamRecords)'));
check('I4: history.js + main.js đã nối 3 miền',
  histSrc.includes('x2PhuPhamRecords:') && histSrc.includes('x2Stocktakes:') &&
  mainSrc.includes('loadX2PhuPham()') && mainSrc.includes('loadX2Stocktakes()') && mainSrc.includes('loadX2YieldRates()'));
check('I5: index.html có mini card + thẻ chi tiết + form + các vùng',
  idx.includes('data-x2-card="x2-phu-pham-card"') && idx.includes('id="x2-phu-pham-card"') &&
  idx.includes('id="x2-pp-form"') && idx.includes('id="x2-pp-st-form"') &&
  idx.includes('id="x2-pp-stock-bar"') && idx.includes('id="x2-pp-cost"') &&
  idx.includes('id="x2-pp-balance"') && idx.includes('id="x2-pp-credit"'));
check('I6: events.js nối form + kiểm kê + định mức + tháng + sửa/xóa',
  evSrc.includes('handleX2PhuPhamSubmit') && evSrc.includes('handleX2StocktakeSubmit') &&
  evSrc.includes('handleX2YieldRateSave') && evSrc.includes("'x2-pp-month'") &&
  evSrc.includes('data-x2-pp-edit') && evSrc.includes('data-x2-pp-st-del'));
check('I7: sw.js cache v277 + nạp js/x2-phu-pham.js',
  /nha-may-ngoc-son-v280/.test(sw) && sw.includes("./js/x2-phu-pham.js"));
check('I8: styles.css có khối .x2-pp-* + bảng supplier thêm cột Giảm Trừ',
  css.includes('.x2-pp-chip') && css.includes('.x2-pp-yield-chip') &&
  idx.includes('Giảm Trừ (đ)') && supSrc.includes('x2SupplierCreditRows'));
check('I9: 14 nguồn X2 + 22 thẻ có nguồn xuất (đủ 8 X1)',
  xlsx.X2_EXPORT_SOURCES.length === 22 &&
  xlsx.X2_EXPORT_SOURCES.some(s => s.id === 'phupham') &&
  Object.keys(x2.X2_CARD_EXPORT_SOURCE).length === 22 &&
  Object.keys(x2.X2_CARD_HISTORY_DOMAIN).length === 22);
check('I10: danh mục báo cáo 42 (X2 có phụ phẩm + cân đối + giá thành)',
  specs.REPORT_SPECS.length === 42 &&
  specs.REPORT_SPECS.some(r => r.id === 'phupham') &&
  specs.REPORT_SPECS.some(r => r.kind === 'massBalance') &&
  specs.REPORT_SPECS.some(r => r.kind === 'costing'));
check('I11: report-center có 2 builder cân đối + giá thành',
  rcSrc.includes('buildMassBalanceReport') && rcSrc.includes('buildCostingReport') &&
  rcSrc.includes("spec.kind === 'massBalance'") && rcSrc.includes("spec.kind === 'costing'"));

console.log(`\nKẾT QUẢ PHỤ PHẨM & CÂN ĐỐI: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

