// tests/x2-phu-pham.test.mjs â€” THáºº PHá»¤ PHáº¨M & BÄ‚M + CÃ‚N Äá»I + KIá»‚M KÃŠ (18/10/2026)
// Kiá»ƒm thá»­: NHáº¬P tá»± suy ra (ngá»n/máº¯t/á»‘ng lá»—i bÄƒm) Â· Tá»’N Â· doanh thu Â·
// GIÃ THÃ€NH 1 KG á»NG Äáº T Â· giáº£m trá»« NCC Â· CÃ‚N Äá»I khá»‘i lÆ°á»£ng Â· KIá»‚M KÃŠ bÃ£i
// (Ä‘iá»u chá»‰nh tá»“n) Â· Äá»ŠNH Má»¨C Tá»¶ Lá»† Â· render tháº» + ná»‘i state/storage/cloud/
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
  { id: 'm1', type: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿',    location: 'xuong-2', weight: 10000, unitPrice: 2000, totalAmount: 20000000, date: '2026-10-18', createdAt: '2026-10-18T01:00:00.000Z' },
  { id: 'm2', type: 'Luá»“ng á»‘ng',    supplier: 'NhÃ  Táº¿',    location: 'xuong-2', weight: 5000,  unitPrice: 2200, totalAmount: 11000000, date: '2026-10-18', createdAt: '2026-10-18T02:00:00.000Z' },
  { id: 'm3', type: 'Luá»“ng cÃ¢y khÃ´', supplier: 'NhÃ  Trung', location: 'xuong-2', weight: 5000,  unitPrice: 1800, totalAmount: 9000000,  date: '2026-10-18', createdAt: '2026-10-18T03:00:00.000Z' }
];
state.xuong2BoluongRecords = [
  { id: 'b1', date: '2026-10-18', tickets: [{ materialId: 'm1', kg: 10000 }], inputWeight: 10000, qty: 8000, carts: 13, kgPerCart: 615.38, ngonKg: 2000, ngonEst: true, materialType: 'Luá»“ng cÃ¢y xÃ´', supplier: 'NhÃ  Táº¿', supplierLabel: 'NhÃ  Táº¿' }
];
state.xuong2CutRecords = [
  { id: 'c1', date: '2026-10-18', inputKind: 'cart', carts: 10, kgPerCart: 600, inputWeight: 6000, klOngLuong: 5000, klOngLoi: 300, klMatLuong: 200, klNgonOngLoai: 500, rejectRoute: 'bam', supplierLabel: 'Nhiá»u nguá»“n (xe bá»‘c)', supplier: '' },
  { id: 'c2', date: '2026-10-18', inputKind: 'ong', tickets: [{ materialId: 'm2', kg: 5000 }], inputWeight: 5000, klOngLuong: 4600, klOngLoi: 400, klMatLuong: 0, klNgonOngLoai: 0, returnedKg: 400, rejectRoute: 'tra_ncc', supplier: 'NhÃ  Táº¿', supplierLabel: 'NhÃ  Táº¿' }
];
state.xuong2BoOngRecords = [
  { id: 'o1', date: '2026-10-18', cutId: '', poolMode: true, inputOng: 4000, klOngLoai: 100, klOngBo: 3900 }
];
state.x2PhuPhamRecords = [];
state.x2Stocktakes = [];
state.x2YieldRates = { cay: { ongDat: 88, ongLoi: 3, mat: 3 }, ong: { ongDat: 95, ongLoi: 5 } };
state.xuong2HoTroRecords = [];
state.hrEmployees = []; state.hrPositions = []; state.hrAssignments = [];
state.suppliers = [{ id: 's1', name: 'NhÃ  Táº¿', code: 'NCC01' }];

const pp = await import('../js/x2-phu-pham.js');
const pool = await import('../js/x2-pool.js');
const x2 = await import('../js/xuong2.js');
const specs = await import('../js/report-specs.js');
const xlsx = await import('../js/export-xlsx.js');

// â”€â”€â”€ A. NHáº¬P Tá»° SUY RA + Tá»’N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inRows = pp.x2PhuPhamInRows();
check('A1: NHáº¬P tá»± suy ra: ngá»n 2.000 kg (Bá»‘c) + máº¯t 200 + á»‘ng lá»—i bÄƒm 300 (Cáº¯t)',
  inRows.length === 3 &&
  inRows.find(r => r.kind === 'ngon').kg === 2000 &&
  inRows.find(r => r.kind === 'mat').kg === 200 &&
  inRows.find(r => r.kind === 'ong_loi').kg === 300);
check('A2: á»‘ng lá»—i TRáº¢ NCC KHÃ”NG vÃ o phá»¥ pháº©m (Ä‘i sá»• giáº£m trá»«)',
  !inRows.some(r => r.kind === 'ong_loi' && r.kg === 400));
check('A3: tá»“n ban Ä‘áº§u = 2.000 + 200 + 300 = 2.500 kg',
  pp.x2PhuPhamStockTotal() === 2500);
check('A4: má»—i nguá»“n cÃ³ tá»“n riÃªng (ngá»n 2.000 Â· máº¯t 200 Â· á»‘ng lá»—i 300)',
  pp.x2PhuPhamStock('ngon') === 2000 && pp.x2PhuPhamStock('mat') === 200 && pp.x2PhuPhamStock('ong_loi') === 300);
state.x2PhuPhamRecords = [
  { id: 'legacy-raw', date: '2026-10-18', kind: 'ngon', form: 'raw', outType: 'sale', kg: 0, price: 500, amount: 0 },
  { id: 'legacy-chipped', date: '2026-10-18', kind: 'ong_loi', form: 'chipped', outType: 'sale', kg: 0, price: 500, amount: 0 }
];
const legacyForms = pp.x2PhuPhamOutRows();
check('A5: dá»¯ liá»‡u cÅ© BÃ¡n nguyÃªn/BÄƒm hiá»ƒn thá»‹ thÃ nh Cá»c/RÃ¡c bÄƒm',
  legacyForms.find(r => r.id === 'legacy-raw').form === 'coc' &&
  legacyForms.find(r => r.id === 'legacy-chipped').form === 'rac_bam');
state.x2PhuPhamRecords = [];

// â”€â”€â”€ B. GHI BÃN / TIÃŠU Há»¦Y (handler tháº­t) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const g = id => document.getElementById(id);
g('x2-pp-date').value = '2026-10-18';
g('x2-pp-out-form').value = 'coc';
g('x2-pp-out-type').value = 'sale';
g('x2-pp-scale-in').value = '5000';
g('x2-pp-scale-out').value = '6000';
g('x2-pp-price').value = '500';
g('x2-pp-party').value = 'Tráº¡i náº¥m';
g('x2-pp-note').value = 'bÃ¡n ngá»n';
pp.onX2PhuPhamCalc();
check('B1: cÃ¢n thá»±c tá»± tÃ­nh = cÃ¢n ra 6.000 âˆ’ cÃ¢n vÃ o 5.000 = 1.000 kg',
  g('x2-pp-kg').value === '1000');
check('B2: dÃ²ng tá»± tÃ­nh thÃ nh tiá»n = 1.000 Ã— 500 = 500.000 Ä‘',
  String(g('x2-pp-amount').textContent).includes('500.000'));
pp.handleX2PhuPhamSubmit({ preventDefault(){} });
const sale = state.x2PhuPhamRecords[0];
check('B3: lÆ°u lÆ°á»£t bÃ¡n cÃ¹ng hai chá»‰ sá»‘ cÃ¢n vÃ  KL thá»±c tÃ­nh Ä‘Æ°á»£c',
  !!sale && sale.scaleInKg === 5000 && sale.scaleOutKg === 6000 &&
  sale.kg === 1000 && sale.price === 500 && sale.amount === 500000 && sale.party === 'Tráº¡i náº¥m');
check('B4: bÃ¡n khÃ´ng chá»n nguá»“n vÃ  trá»« vÃ o tá»“n gá»™p cÃ²n 1.500 kg',
  sale.kind === 'all' && pp.x2PhuPhamStockTotal() === 1500);
check('B5: doanh thu thÃ¡ng = 500.000 Ä‘', pp.x2PhuPhamRevenue('2026-10-01', '2026-10-31') === 500000);
pp.editX2PhuPham(sale.id);
check('B6: sá»­a lÆ°á»£t bÃ¡n náº¡p láº¡i chá»‰ sá»‘ cÃ¢n vÃ o/ra vÃ  KL thá»±c',
  g('x2-pp-scale-in').value === '5000' && g('x2-pp-scale-out').value === '6000' &&
  g('x2-pp-kg').value === '1000');
g('x2-pp-scale-out').value = '4000';
pp.onX2PhuPhamCalc();
const saleCount = state.x2PhuPhamRecords.length;
pp.handleX2PhuPhamSubmit({ preventDefault(){} });
check('B7: cÃ¢n ra tháº¥p hÆ¡n cÃ¢n vÃ o cho KL Ã¢m vÃ  khÃ´ng lÆ°u lÆ°á»£t sá»­a',
  g('x2-pp-kg').value === '-1000' && state.x2PhuPhamRecords.length === saleCount &&
  sale.kg === 1000);
pp.resetX2PhuPhamForm();
g('x2-pp-scale-in').value = '5000';
pp.onX2PhuPhamCalc();
const incompleteCount = state.x2PhuPhamRecords.length;
pp.handleX2PhuPhamSubmit({ preventDefault(){} });
check('B8: thiáº¿u má»™t chá»‰ sá»‘ cÃ¢n thÃ¬ khÃ´ng lÆ°u lÆ°á»£t má»›i',
  state.x2PhuPhamRecords.length === incompleteCount);
pp.resetX2PhuPhamForm();
// ThÃªm 1 lÆ°á»£t TIÃŠU Há»¦Y 100 kg (giÃ¡ 0)
state.x2PhuPhamRecords.push({ id: 'pp-dispose', date: '2026-10-18', kind: 'ngon', form: 'chipped', outType: 'dispose', kg: 100, price: 0, amount: 0, party: '', note: '' });
check('B9: tiÃªu há»§y 100 kg â†’ tá»•ng tá»“n cÃ²n 1.400 kg Â· doanh thu KHÃ”NG Ä‘á»•i',
  pp.x2PhuPhamStockTotal() === 1400 && pp.x2PhuPhamRevenue('2026-10-01', '2026-10-31') === 500000);


// â”€â”€â”€ C. GIÃ THÃ€NH 1 KG á»NG Äáº T â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cost = pp.x2CostingData('2026-10-01', '2026-10-31');
check('C1: tiá»n nguyÃªn liá»‡u = 10.000Ã—2.000 + 5.000Ã—2.200 = 31.000.000 Ä‘',
  cost.materialCost === 31000000);
check('C2: doanh thu 500.000 Â· giáº£m trá»« NCC 880.000 Â· chi phÃ­ thá»±c 29.620.000 Ä‘',
  cost.revenue === 500000 && cost.credit === 880000 && cost.netCost === 29620000);
check('C3: á»‘ng Ä‘áº¡t 9.600 kg Â· giÃ¡ thÃ nh 1 kg = 29.620.000 Ã· 9.600 = 3.085,42 Ä‘/kg',
  cost.ongDat === 9600 && cost.costPerKg === 3085.42);

// â”€â”€â”€ D. GIáº¢M TRá»ª NHÃ€ CUNG Cáº¤P (á»‘ng lá»—i tráº£ láº¡i) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const credits = pp.x2SupplierCreditRows('2026-10-01', '2026-10-31');
check('D1: 1 phiáº¿u tráº£ NCC: 400 kg Ã— 2.200 = 880.000 Ä‘',
  credits.length === 1 && credits[0].kg === 400 && credits[0].price === 2200 && credits[0].amount === 880000);
check('D2: tá»•ng giáº£m trá»« NCC = 880.000 Ä‘', pp.x2SupplierCreditTotal('2026-10-01', '2026-10-31') === 880000);

// â”€â”€â”€ E. CÃ‚N Äá»I KHá»I LÆ¯á»¢NG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const bal = pp.x2MassBalanceData('2026-10-01', '2026-10-31');
check('E1: nháº­p bÃ£i 15.000 kg luá»“ng cÃ¢y + 5.000 kg luá»“ng á»‘ng',
  bal.intakeCay === 15000 && bal.intakeOng === 5000);
check('E2: Bá»‘c 10.000 kg vÃ o Â· 8.000 kg lÃªn xe Â· 2.000 kg ngá»n/hao há»¥t',
  bal.boc.in === 10000 && bal.boc.out === 8000 && bal.boc.loss === 2000);
check('E3: Cáº¯t xe 6.000 kg â†’ Ä‘áº¡t 5.000 Â· lá»—i 300 Â· máº¯t 200 Â· hao 500',
  bal.cart.in === 6000 && bal.cart.dat === 5000 && bal.cart.loi === 300 && bal.cart.mat === 200 && bal.cart.loss === 500);
check('E4: Cáº¯t á»‘ng 5.000 kg â†’ Ä‘áº¡t 4.600 Â· lá»—i 400',
  bal.ong.in === 5000 && bal.ong.dat === 4600 && bal.ong.loi === 400);
check('E5: Bá»• 4.000 kg â†’ Ä‘áº¡t 3.900 Â· loáº¡i 100',
  bal.bo.in === 4000 && bal.bo.dat === 3900 && bal.bo.loi === 100);
check('E6: tá»· lá»‡ thá»±c táº¿ â€” cáº¯t xe á»‘ng Ä‘áº¡t 83,3% Â· cáº¯t á»‘ng á»‘ng lá»—i 8%',
  Math.round(bal.yields.cart.ongDat * 10) / 10 === 83.3 &&
  Math.round(bal.yields.ong.ongLoi * 10) / 10 === 8);

// â”€â”€â”€ F. KIá»‚M KÃŠ BÃƒI (Admin) â€” Ä‘iá»u chá»‰nh tá»“n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
g('x2-pp-st-date').value = '2026-10-18';
g('x2-pp-st-pool').value = 'phu_pham';
g('x2-pp-st-actual').value = '1200';
g('x2-pp-st-note').value = 'kiá»ƒm kÃª cuá»‘i tuáº§n';
pp.handleX2StocktakeSubmit({ preventDefault(){} });
const st1 = state.x2Stocktakes[0];
check('F1: phiáº¿u kiá»ƒm kÃª phá»¥ pháº©m: sá»• 1.400 â†’ thá»±c 1.200 Â· lá»‡ch âˆ’200',
  !!st1 && st1.bookKg === 1400 && st1.actualKg === 1200 && st1.diffKg === -200);
check('F2: tá»“n phá»¥ pháº©m sau Ä‘iá»u chá»‰nh = 1.200 kg', pp.x2PhuPhamStockTotal() === 1200);
g('x2-pp-st-pool').value = 'cay';
g('x2-pp-st-actual').value = '4800';
pp.handleX2StocktakeSubmit({ preventDefault(){} });
check('F3: kiá»ƒm kÃª bÃ£i luá»“ng cÃ¢y: sá»• 5.000 â†’ thá»±c 4.800 Â· tá»“n nhÃ³m = 4.800 kg',
  state.x2Stocktakes.length === 2 && pool.x2TicketTotals('cay').kg === 4800);

// â”€â”€â”€ G. Æ¯á»šC TÃNH MÃ™N Tá»ª NHáº¬T KÃ CÃ”NG ÄOáº N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
state.xuong2BoOngRecords.push({
  id: 'bo-rough', date: '2026-10-18', poolMode: true, inputOng: 2000, klOngLoai: 0, klOngBo: 2000
});
state.xuong2BaoThoRecords = [{
  id: 'rough-run', date: '2026-10-18', boOngIds: ['bo-rough'],
  dais: [1200], rongs: [18], thicks: [7]
}];
state.xuong2ChonNanThoRecords = [{
  id: 'rough-output', date: '2026-10-18', baothoId: 'rough-run', shiftIdx: null,
  quantity: 10000, unitVol: 0.0001512, volume: 1.512, cls: 'A'
}];
state.xuong2BaoTinhRecords = [
  {
    id: 'fine-run', date: '2026-10-18', kind: 'tinh', batchDims: [1200, 24, 7],
    inQty: 1000, qtyOk: 800, qtyErr: 200, outDims: [1200, 20, 6]
  },
  {
    id: 'downgrade-run', date: '2026-10-18', kind: 'ha_cap', batchDims: [1200, 20, 6],
    inQty: 100, qtyOk: 90, qtyErr: 10, outDims: [1200, 18, 5]
  },
  {
    id: 'planing-run', date: '2026-10-18', kind: 'bao_thanh', inDims: [1200, 18, 6],
    inQty: 100, qtyOk: 90, qtyErr: 10, outDims: [1200, 16, 5]
  }
];
const estimatedMÃ¹n = pp.x2PhuPhamInRows('2026-10-01', '2026-10-31')
  .filter(r => r.kind === 'mun_tuoi' || r.kind === 'mun_kho');
check('G1: MÃ¹n tÆ°Æ¡i = 2.000 kg á»‘ng vÃ o âˆ’ 1.512 kg thanh lÃ½ thuyáº¿t = 488 kg',
  estimatedMÃ¹n.find(r => r.kind === 'mun_tuoi').kg === 488);
check('G2: MÃ¹n khÃ´ suy ra theo thá»ƒ tÃ­ch hao há»¥t cá»§a BÃ o tinh + Háº¡ cáº¥p',
  estimatedMÃ¹n.filter(r => r.kind === 'mun_kho').reduce((s, r) => s + r.kg, 0) === 61.2 &&
  !estimatedMÃ¹n.some(r => r.id === 'in-btinh-planing-run'));
check('G3: mÃ¹n tá»± suy ra Ä‘Æ°á»£c cá»™ng vÃ o tá»“n phá»¥ pháº©m Æ°á»›c tÃ­nh gá»™p',
  pp.x2PhuPhamStockTotal() === 1749.2);
const totalBeforeInvalidEstimate = pp.x2PhuPhamStockTotal();
state.xuong2BoOngRecords.push({
  id: 'bo-negative', date: '2026-10-18', poolMode: true, inputOng: 1, klOngLoai: 0, klOngBo: 1
});
state.xuong2BaoThoRecords.push({
  id: 'rough-negative', date: '2026-10-18', boOngIds: ['bo-negative'],
  dais: [1200], rongs: [18], thicks: [7]
});
state.xuong2ChonNanThoRecords.push({
  id: 'rough-negative-output', date: '2026-10-18', baothoId: 'rough-negative', shiftIdx: null,
  quantity: 100, unitVol: 0.001, volume: 0.1, cls: 'A'
});
const invalidEstimate = pp.x2PhuPhamInRows().find(r => r.id === 'in-bt-rough-negative');
check('G4: khá»‘i lÆ°á»£ng lÃ½ thuyáº¿t vÆ°á»£t Ä‘áº§u vÃ o Ä‘Æ°á»£c cáº£nh bÃ¡o, khÃ´ng tÃ­nh mÃ¹n Ã¢m',
  !!invalidEstimate && invalidEstimate.warning === true && invalidEstimate.kg === 0 &&
  invalidEstimate.note.includes('cáº§n kiá»ƒm tra'));
check('G5: Æ°á»›c tÃ­nh báº¥t há»£p lÃ½ khÃ´ng lÃ m Ä‘á»•i tá»“n gá»™p',
  pp.x2PhuPhamStockTotal() === totalBeforeInvalidEstimate);

// â”€â”€â”€ H. Äá»ŠNH Má»¨C Tá»¶ Lá»† (Admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
g('x2-pp-y-cay-ongdat').value = '90';
g('x2-pp-y-cay-ongloi').value = '2';
g('x2-pp-y-cay-mat').value = '2';
g('x2-pp-y-ong-ongdat').value = '96';
g('x2-pp-y-ong-ongloi').value = '4';
pp.handleX2YieldRateSave();
check('H1: lÆ°u Ä‘á»‹nh má»©c tá»· lá»‡: xe 90/2/2 Â· á»‘ng 96/4',
  state.x2YieldRates.cay.ongDat === 90 && state.x2YieldRates.cay.mat === 2 &&
  state.x2YieldRates.ong.ongDat === 96 && state.x2YieldRates.ong.ongLoi === 4);
check('H2: Ä‘á»‹nh má»©c Ä‘Æ°á»£c ghi xuá»‘ng localStorage',
  JSON.parse(localStorage.getItem('bamboo_tracker_x2_yield_rate_v1') || '{}').cay.ongDat === 90);

// â”€â”€â”€ I. RENDER THáºº THáº¬T â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
pp.setPpMonth('2026-10');
pp.renderX2PhuPhamCard();
check('I1: thanh tá»“n chá»‰ hiá»‡n tá»•ng gá»™p, khÃ´ng hiá»‡n chip tá»«ng nguá»“n',
  String(g('x2-pp-stock-bar').innerHTML).includes('Tá»“n phá»¥ pháº©m') &&
  !String(g('x2-pp-stock-bar').innerHTML).includes('Ngá»n'));
check('I2: khá»‘i giÃ¡ thÃ nh hiá»‡n "GiÃ¡ thÃ nh 1 kg á»‘ng Ä‘áº¡t"',
  String(g('x2-pp-cost').innerHTML).includes('GiÃ¡ thÃ nh 1 kg á»‘ng Ä‘áº¡t'));
check('I3: khá»‘i cÃ¢n Ä‘á»‘i hiá»‡n "CÃ¢n Ä‘á»‘i khá»‘i lÆ°á»£ng"',
  String(g('x2-pp-balance').innerHTML).includes('CÃ¢n Ä‘á»‘i khá»‘i lÆ°á»£ng'));
check('I4: lá»‹ch sá»­ giá»¯ nguá»“n tá»± tÃ­nh, hiá»ƒn thá»‹ mÃ¹n vÃ  lÆ°á»£t bÃ¡n',
  String(g('x2-pp-day-cards').innerHTML).includes('Nháº­p Æ°á»›c tÃ­nh') &&
  String(g('x2-pp-day-cards').innerHTML).includes('Tráº¡i náº¥m') &&
  String(g('x2-pp-day-cards').innerHTML).includes('MÃ¹n tÆ°Æ¡i') &&
  String(g('x2-pp-day-cards').innerHTML).includes('MÃ¹n khÃ´'));
check('I5: sá»• giáº£m trá»« NCC hiá»‡n "NhÃ  Táº¿"',
  String(g('x2-pp-credit').innerHTML).includes('NhÃ  Táº¿'));
check('I6: má»Ÿ tháº» x2-phu-pham-card khÃ´ng lá»—i',
  x2.x2OpenCard('x2-phu-pham-card') === true);


// â”€â”€â”€ J. Cáº¤U TRÃšC + Ná»I 6 CHá»– + BÃO CÃO/XUáº¤T EXCEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const x2Src = fs.readFileSync(new URL('../js/xuong2.js', import.meta.url), 'utf8');

check('J1: state.js cÃ³ 3 key + 3 trÆ°á»ng dá»¯ liá»‡u má»›i',
  stSrc.includes("STORAGE_KEY_X2_PHU_PHAM = 'bamboo_tracker_x2_phu_pham_v1'") &&
  stSrc.includes("STORAGE_KEY_X2_STOCKTAKE = 'bamboo_tracker_x2_stocktake_v1'") &&
  stSrc.includes("STORAGE_KEY_X2_YIELD_RATE = 'bamboo_tracker_x2_yield_rate_v1'") &&
  stSrc.includes('x2PhuPhamRecords:') && stSrc.includes('x2Stocktakes:') && stSrc.includes('x2YieldRates:'));
check('J2: storage.js cÃ³ 3 hÃ m khÃ´i phá»¥c + ghi vÃ o file/backup + export',
  stgSrc.includes('function restoreX2PhuPham') && stgSrc.includes('function restoreX2Stocktakes') &&
  stgSrc.includes('function restoreX2YieldRates') && stgSrc.includes('x2PhuPhamRecords:') &&
  stgSrc.includes('x2Stocktakes:') && stgSrc.includes('x2YieldRates:') &&
  stgSrc.includes('restoreX2PhuPham,'));
check('J3: cloud.js cÃ³ snapshot/core/merge/persist/apply + RATE_DOMAINS',
  (cloudSrc.match(/x2PhuPhamRecords:/g) || []).length >= 2 &&
  (cloudSrc.match(/x2PhuPhamRecords\)/g) || []).length >= 2 &&
  cloudSrc.includes("STORAGE_KEY_X2_PHU_PHAM") &&
  cloudSrc.includes("'x2YieldRates'") &&
  cloudSrc.includes('if (data.x2PhuPhamRecords)'));
check('J4: history.js + main.js Ä‘Ã£ ná»‘i 3 miá»n',
  histSrc.includes('x2PhuPhamRecords:') && histSrc.includes('x2Stocktakes:') &&
  mainSrc.includes('loadX2PhuPham()') && mainSrc.includes('loadX2Stocktakes()') && mainSrc.includes('loadX2YieldRates()'));
const ppFormStart = idx.indexOf('<form id="x2-pp-form">');
const ppFirstRowStart = idx.indexOf('<div class="x2-form-row">', ppFormStart);
const ppSecondRowStart = idx.indexOf('<div class="x2-form-row">', ppFirstRowStart + 1);
const ppFirstRow = idx.slice(ppFirstRowStart, ppSecondRowStart);
check('J5: index.html cÃ³ mini card + form gá»n, cÃ¢n vÃ o/ra á»Ÿ hÃ ng Ä‘áº§u + cÃ¡c vÃ¹ng',
  idx.includes('data-x2-card="x2-phu-pham-card"') && idx.includes('id="x2-phu-pham-card"') &&
  idx.includes('id="x2-pp-form"') && idx.includes('id="x2-pp-st-form"') &&
  idx.includes('id="x2-pp-scale-in"') && idx.includes('id="x2-pp-scale-out"') &&
  ppFirstRow.includes('id="x2-pp-out-form"') && ppFirstRow.includes('id="x2-pp-out-type"') &&
  ppFirstRow.includes('id="x2-pp-scale-in"') && ppFirstRow.includes('id="x2-pp-scale-out"') &&
  ppFirstRow.includes('style="flex:0 0 175px;"') && ppFirstRow.includes('style="flex:0 0 190px;"') &&
  /<input[^>]*id="x2-pp-kg"[^>]*readonly/i.test(idx) &&
  idx.includes('id="x2-pp-stock-bar"') && idx.includes('id="x2-pp-cost"') &&
  idx.includes('id="x2-pp-balance"') && idx.includes('id="x2-pp-credit"') &&
  !idx.includes('id="x2-pp-kind"') && idx.includes('<option value="coc">Cá»c</option>') &&
  idx.includes('<option value="rac_bam">RÃ¡c bÄƒm</option>') &&
  idx.includes('<option value="mun_tuoi">MÃ¹n tÆ°Æ¡i</option>') &&
  idx.includes('<option value="mun_kho">MÃ¹n khÃ´</option>'));
check('J6: events.js ná»‘i form + kiá»ƒm kÃª + Ä‘á»‹nh má»©c + thÃ¡ng + sá»­a/xÃ³a',
  evSrc.includes('handleX2PhuPhamSubmit') && evSrc.includes('handleX2StocktakeSubmit') &&
  evSrc.includes("'x2-pp-scale-in'") && evSrc.includes("'x2-pp-scale-out'") &&
  evSrc.includes('handleX2YieldRateSave') && evSrc.includes("'x2-pp-month'") &&
  evSrc.includes('data-x2-pp-edit') && evSrc.includes('data-x2-pp-st-del'));
check('J7: sw.js cache v486 + náº¡p js/x2-phu-pham.js',
  /nha-may-ngoc-son-v486/.test(sw) && sw.includes("./js/x2-phu-pham.js"));
check('J8: styles.css cÃ³ khá»‘i .x2-pp-* + báº£ng supplier thÃªm cá»™t Giáº£m Trá»«',
  css.includes('.x2-pp-chip') && css.includes('.x2-pp-yield-chip') &&
  idx.includes('Giáº£m Trá»« (Ä‘)') && supSrc.includes('x2SupplierCreditRows'));
check('J9: tháº» Xá»­ lÃ½ lá»—i gá»™p 2 tháº» cÅ©, danh má»¥c cÃ³ nguá»“n xuáº¥t Ä‘á»§',
  xlsx.X2_EXPORT_SOURCES.length === 24 &&
  xlsx.X2_EXPORT_SOURCES.some(s => s.id === 'phupham') &&
  xlsx.X2_EXPORT_SOURCES.some(s => s.id === 'xulyloi') &&
  xlsx.X2_EXPORT_SOURCES.some(s => s.id === 'x1nanplan'));
check('J10: danh má»¥c bÃ¡o cÃ¡o cáº­p nháº­t sau gá»™p tháº» (47 bÃ¡o cÃ¡o)',
  specs.REPORT_SPECS.length === 47 &&
  specs.REPORT_SPECS.some(r => r.id === 'phupham') &&
  specs.REPORT_SPECS.some(r => r.kind === 'massBalance') &&
  specs.REPORT_SPECS.some(r => r.kind === 'costing'));
check('J11: report-center cÃ³ 2 builder cÃ¢n Ä‘á»‘i + giÃ¡ thÃ nh',
  rcSrc.includes('buildMassBalanceReport') && rcSrc.includes('buildCostingReport') &&
  rcSrc.includes("spec.kind === 'massBalance'") && rcSrc.includes("spec.kind === 'costing'"));
check('J12: BÃ o ThÃ´/BÃ o Tinh Ä‘Æ°á»£c Ä‘á»c qua adapter, khÃ´ng táº¡o key nháº­p mÃ¹n riÃªng',
  x2Src.includes('setX2PhuPhamStageDataReader') &&
  x2Src.includes('baoThoDisplay(r)') && x2Src.includes('baoTinhDisplay(r)') &&
  pp.PP_KIND_SHORT.mun_tuoi === 'MÃ¹n tÆ°Æ¡i' && pp.PP_FORM_LABEL.mun_kho === 'MÃ¹n khÃ´');
check('J13: report-center nháº­n dá»¯ liá»‡u BÃ o ThÃ´/BÃ o Tinh lÃ m nguá»“n phá»¥ pháº©m',
  rcSrc.includes('state.xuong2BaoThoRecords') && rcSrc.includes('state.xuong2BaoTinhRecords'));

console.log(`\nKáº¾T QUáº¢ PHá»¤ PHáº¨M & CÃ‚N Äá»I: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);

