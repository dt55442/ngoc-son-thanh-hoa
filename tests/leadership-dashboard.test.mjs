import assert from 'node:assert/strict';
import fs from 'node:fs';
import { state } from '../js/state.js';
globalThis.window = { Chart: null };
globalThis.document = { addEventListener() {} };
const {
  buildLeadershipReportMarkup,
  buildLeadershipReportData,
  buildLeadershipSummary,
  canAccessLeadershipDashboard,
  printLeadershipReport,
  weekCompareEligible
} = await import('../js/leadership-dashboard.js');

const saved = {
  currentUser: state.currentUser,
  materialRecords: state.materialRecords,
  qcFinalRecords: state.qcFinalRecords,
  qcExports: state.qcExports,
  planningItems: state.planningItems,
  hrEmployees: state.hrEmployees,
  materialRates: state.materialRates,
  x2PhuPhamRecords: state.x2PhuPhamRecords,
  xuong2BulligRecords: state.xuong2BulligRecords,
  xuong2BoluongRecords: state.xuong2BoluongRecords,
  xuong2CutRecords: state.xuong2CutRecords,
  xuong2BoOngRecords: state.xuong2BoOngRecords,
  xuong2BaoThoRecords: state.xuong2BaoThoRecords,
  xuong2ChonNanThoRecords: state.xuong2ChonNanThoRecords,
  xuong2BaoTinhRecords: state.xuong2BaoTinhRecords,
  pressRecords: state.pressRecords,
  batches: state.batches,
  xuong1SaySinhRecords: state.xuong1SaySinhRecords,
  xuong1BocRecords: state.xuong1BocRecords,
  xuong1BoRecords: state.xuong1BoRecords,
  xuong1PhoiSayRecords: state.xuong1PhoiSayRecords,
  xuong1LocThanhRecords: state.xuong1LocThanhRecords,
  x1KhoExports: state.x1KhoExports
};

try {
  state.currentUser = { role: 'manager' };
  state.materialRecords = [
    { date: '2026-10-27', location: 'xuong-2', type: 'Luá»“ng á»‘ng', weight: 120, totalAmount: 120000 },
    { date: '2026-10-28', location: 'xuong-2', type: 'Luá»“ng cÃ¢y', weight: 20, totalAmount: 30000 },
    { date: '2026-10-31', location: 'XÆ°á»Ÿng 1', type: 'Luá»“ng cÃ¢y', weight: 30, totalAmount: 45000 },
    { date: '2026-11-01', location: 'lo-hoi', type: 'DÄƒm', weight: 5, totalAmount: 5000 },
    { date: '2026-10-20', location: 'xuong-2', type: 'Luá»“ng á»‘ng', weight: 40, totalAmount: 40000 },
    { date: '2026-11-02', location: 'xuong-2', weight: 999 }
  ];
  state.qcFinalRecords = [
    { id: 'q2', date: '2026-10-28', workshop: 'x2', qtyOk: 8, qtyExcept: 1, qtyReject: 1 },
    { id: 'q-bullig', date: '2026-10-29', workshop: 'x2', kind: 'thanh', productId: 'rate-bullig', qtyOk: 100, qtyReject: 5 },
    { id: 'q1', date: '2026-11-01', workshop: 'x1', qtyOk: 3, qtyExcept: 0, qtyReject: 1 },
    // QC "Kiá»ƒm thanh" cáº¥p phÃ¡t cho lÆ°á»£t BÃ o thanh (productId rate-bullig Ä‘á»ƒ khÃ´ng rÆ¡i vÃ o bucket cháº¥t lÆ°á»£ng)
    { id: 'q-bt1', date: '2026-10-30', workshop: 'x2', kind: 'thanh', productId: 'rate-bullig', sizeKey: '640Ã—12Ã—10', inputQty: 95, qtyOk: 80, qtyExcept: 5, qtyReject: 10 },
    { id: 'q-bt2', date: '2026-10-31', workshop: 'x2', kind: 'thanh', productId: 'rate-bullig', sizeKey: '640Ã—10Ã—8', inputQty: 10, qtyOk: 8, qtyExcept: 0, qtyReject: 2 }
  ];
  state.hrEmployees = [
    { id: 'e1', department: 'XÆ°á»Ÿng 2', status: 'active', joinDate: '2026-10-27' },
    { id: 'e2', department: 'XÆ°á»Ÿng 1', status: 'quit', joinDate: '2025-01-01', quitDate: '2026-10-30' },
    { id: 'e3', department: 'QC', status: 'active' }
  ];
  state.qcExports = [
    { year: 2026, week: 'Tuáº§n 44', weeks: [44], productId: 'rate-bullig', qty: 12 },
    { year: 2026, week: 'Tuáº§n 43', weeks: [43, 44], productId: 'rate-van', qty: 18 },
    { year: 2026, week: 'Tuáº§n 44', weeks: [44, 45], productId: 'rate-thanh', qty: 6 },
    { year: 2026, week: 'Tuáº§n 44', weeks: [44], name: 'HÃ ng ngoÃ i Ä‘á»‹nh má»©c', qty: 4 },
    { year: 2026, week: 'Tuáº§n 44', weeks: [44, 46], productId: 'rate-van', qty: 7 },
    { year: 2026, week: 'Tuáº§n 43', weeks: [43], productId: 'rate-van', qty: 99 }
  ];
  state.materialRates = [
    { id: 'rate-bullig', product: 'Bullig 1200x600x12', nanUse: 'Bullig', unit: 'Thanh' },
    { id: 'rate-thanh', product: 'Thanh 1200x50x12', nanUse: 'VÃ¡n', unit: 'Thanh' },
    { id: 'rate-van', product: 'VÃ¡n 1200x382x12', nanUse: 'VÃ¡n', unit: 'Táº¥m' }
  ];
  state.planningItems = [
    { year: 2026, week: 'Tuáº§n 44', productId: 'rate-bullig', qty: 10 },
    { year: 2026, week: 'Tuáº§n 44', productId: 'rate-thanh', qty: 15 },
    { year: 2026, week: 'Tuáº§n 45', productId: 'rate-thanh', qty: 5 },
    { year: 2026, week: 'Tuáº§n 43', productId: 'rate-van', qty: 30 },
    { year: 2026, week: 'Tuáº§n 44', productId: 'rate-van', qty: 40 },
    { year: 2026, week: 'Tuáº§n 45', productId: 'rate-van', qty: 10 }
  ];
  state.x2PhuPhamRecords = [
    { date: '2026-10-29', kind: 'ngon', kg: 100, price: 2000, amount: 200000, outType: 'sell' },
    { date: '2026-10-30', kind: 'mat', kg: 10, price: 1000, amount: 10000, outType: 'dispose' },
    { date: '2026-10-20', kind: 'ngon', kg: 50, price: 2000, amount: 100000, outType: 'sell' }
  ];
  state.xuong2BulligRecords = [
    { date: '2026-10-29', kind: 'ct', qtyOk: 7, qtyErr: 1 },
    { date: '2026-10-20', kind: 'ct', qtyOk: 4, qtyErr: 1 }
  ];
  state.xuong2BoluongRecords = [
    { date: '2026-10-27', inputWeight: 3000, carts: 5 },
    { date: '2026-10-30', inputWeight: 800, carts: 1 },
    { date: '2026-10-20', inputWeight: 2000, carts: 3 }
  ];
  state.xuong2CutRecords = [
    { id: 'cut-week-cart', date: '2026-10-27', inputKind: 'cart', inputWeight: 2500, klOngLuong: 1250, klOngLoi: 200, klMatLuong: 100, carts: 4 },
    { id: 'cut-week-ong', date: '2026-10-27', inputKind: 'ong', inputWeight: 1500, klOngLuong: 1350, klOngLoi: 50, carts: 2 },
    { id: 'cut-late-ong', date: '2026-10-30', inputKind: 'ong', inputWeight: 4000, klOngLuong: 3600, klOngLoi: 100, carts: 4 },
    { id: 'cut-previous-cart', date: '2026-10-20', inputKind: 'cart', inputWeight: 1500, klOngLuong: 1200, klOngLoi: 100, klMatLuong: 50, carts: 3 },
    { id: 'cut-previous-ong', date: '2026-10-20', inputKind: 'ong', inputWeight: 1000, klOngLuong: 900, klOngLoi: 50, carts: 1 }
  ];
  state.xuong2BoOngRecords = [
    { id: 'bo-week', cutId: 'cut-week-cart', date: '2026-10-28', inputOng: 1250, klOngBo: 1250, klOngLoai: 0 },
    { id: 'bo-after-output', cutId: 'cut-late-ong', date: '2026-10-30', inputOng: 2500, klOngBo: 2500, klOngLoai: 0 },
    { id: 'bo-previous', cutId: 'cut-previous-cart', date: '2026-10-20', inputOng: 1200, klOngBo: 1200, klOngLoai: 0 }
  ];
  state.xuong2BaoThoRecords = [
    { id: 'rough-week', boOngId: 'bo-week', date: '2026-10-29' },
    { id: 'rough-previous', boOngId: 'bo-previous', date: '2026-10-20' }
  ];
  state.xuong2ChonNanThoRecords = [
    { id: 'rough-out-week', date: '2026-10-29', baothoId: 'rough-week', cls: 'A', quantity: 200, unitVol: 0.00072, volume: 0.144 },
    { id: 'rough-reject-week', date: '2026-10-29', baothoId: 'rough-week', cls: 'reject', quantity: 10, unitVol: 0.00072, volume: 0.0072 },
    { id: 'rough-out-previous', date: '2026-10-20', baothoId: 'rough-previous', cls: 'A', quantity: 100, unitVol: 0.00072, volume: 0.072 },
    { id: 'rough-out-external', date: '2026-10-29', external: true, cls: 'A', quantity: 100, unitVol: 0.003, volume: 0.3 },
    { id: 'rough-out-unlinked', date: '2026-10-29', cls: 'A', quantity: 100, unitVol: 0.002, volume: 0.2 }
  ];
  state.xuong2BaoTinhRecords = [
    // tinh: vÃ o 1250Ã—24Ã—10 Ã—10 (Ä‘áº¡t 9 + lá»—i 1), ra 1250Ã—22Ã—8 â€” cá»¡ khÃ´ng Ä‘á»¥ng nhÃ¡nh Ã‰p VÃ¡n (1200x50x12)
    { id: 'bt-week', date: '2026-10-29', kind: 'tinh', inQty: 10, qtyOk: 9, qtyErr: 1, inDims: [1250, 24, 10], inSizeKey: '1250Ã—24Ã—10', outDims: [1250, 22, 8], outSizeKey: '1250Ã—22Ã—8' },
    // ha_cap: láº¥y thanh lá»—i cá»¡ 1250Ã—22Ã—8 Ã—4 (Ä‘áº¡t 3 + lá»—i 1), ra 1250Ã—20Ã—6
    { id: 'bt-hacap', date: '2026-10-28', kind: 'ha_cap', defectKey: '1250Ã—22Ã—8', defectDims: [1250, 22, 8], inQty: 4, qtyOk: 3, qtyErr: 1, inSizeKey: '1250Ã—22Ã—8', outDims: [1250, 20, 6], outSizeKey: '1250Ã—20Ã—6' },
    // bao_thanh nguá»“n press, Ä‘Ã£ kiá»ƒm xong (QC q-bt1: 95 Ä‘Ã£ kiá»ƒm, 85 Ä‘áº¡t)
    { id: 'bt-bt1', date: '2026-10-29', kind: 'bao_thanh', inSource: 'press', inQty: 95, inDims: [640, 14, 12], inSizeKey: '640Ã—14Ã—12', outDims: [640, 12, 10], outSizeKey: '640Ã—12Ã—10' },
    // bao_thanh nguá»“n defect (tÃ¡i dÃ¹ng lá»—i), Ä‘Ã£ kiá»ƒm xong (QC q-bt2: 10 Ä‘Ã£ kiá»ƒm, 8 Ä‘áº¡t)
    { id: 'bt-bt2', date: '2026-10-30', kind: 'bao_thanh', inSource: 'defect', inQty: 10, inDims: [640, 12, 10], inSizeKey: '640Ã—12Ã—10', outDims: [640, 10, 8], outSizeKey: '640Ã—10Ã—8' },
    // bao_thanh CHÆ¯A kiá»ƒm (háº¿t lÆ°á»£t QC) â†’ bá»‹ bá» qua, Ä‘áº¿m vÃ o skipped
    { id: 'bt-bt3', date: '2026-10-29', kind: 'bao_thanh', inSource: 'press', inQty: 50, inDims: [640, 14, 12], inSizeKey: '640Ã—14Ã—12', outDims: [640, 12, 10], outSizeKey: '640Ã—12Ã—10' },
    { id: 'bt-previous', date: '2026-10-20', kind: 'tinh', qtyOk: 8, qtyErr: 2, outDims: [1200, 50, 12] }
  ];
  state.pressRecords = [
    { date: '2026-10-29', sticks: [{ nanKey: '1200x50x12', sticks: 9 }], finishedQty: 7, fpDim: '1200x50x12' },
    { date: '2026-10-30', sticks: [{ nanKey: '1200x50x12', sticks: 5 }], vanTho: [{ vtDim: '1200x50x12', vtQty: 4 }] },
    { date: '2026-10-30', sticks: [{ nanKey: '1200x50x12', sticks: 3 }] },
    { date: '2026-10-20', sticks: [{ nanKey: '1200x50x12', sticks: 8 }], finishedQty: 6, fpDim: '1200x50x12' }
  ];
  state.batches = [
    { stage: 'say1', length: 1200, width: 600, thickness: 12, quantity: 100 },
    { stage: 'say2', length: 1200, width: 600, thickness: 12, quantity: 200 }
  ];
  state.xuong1SaySinhRecords = [
    { id: 'ss-yard-1', qty: 1000, date: '2026-10-28' },
    { id: 'ss-yard-2', qty: 400, date: '2026-10-29' }
  ];
  state.xuong1BocRecords = [
    { id: 'boc-yard-1', saySinhId: 'ss-yard-1', qty: 300, date: '2026-10-30' }
  ];
  state.xuong1BoRecords = [
    { id: 'bo-stock-1', qtyOk: 800, date: '2026-10-28' }
  ];
  state.xuong1PhoiSayRecords = [
    { id: 'dry-stock-1', boId: 'bo-stock-1', qtyIn: 800, qtyOk: 600, date: '2026-10-29' }
  ];
  state.xuong1LocThanhRecords = [
    { id: 'lt-finished-1', boId: 'bo-stock-1', mode: 'bo-xo', qtyIn: 200, qtyOk: 150, date: '2026-10-30' }
  ];
  state.x1KhoExports = [];

  const stage = (id, label, quantity, options = {}) => ({
    id, label, unit: 'xe/h', quantityUnit: 'xe', turns: 2, quantity,
    quantityKnown: true, estimated: false, capacity: 5, efficiency: 90,
    hours: 8, incidentHours: 1, ...options
  });
  const capacity = [
    { id: 'x2', label: 'XÆ°á»Ÿng 2', efficiency: 90, hours: 40, incidentHours: 3, bottleneck: null, stages: [
      stage('boluong', 'Bá»‘c luá»“ng', 10),
      stage('cut', 'Cáº¯t Chá»n', 10),
      stage('epvan', 'Ã‰p vÃ¡n', 0.5, { unit: 'mÂ³/h', quantityUnit: 'mÂ³' }),
      stage('bullig_ct', 'Bullig - Chá»n thanh', 100, { unit: 'thanh/h', quantityUnit: 'thanh' }),
      stage('bullig_gc', 'Bullig - gia cÃ´ng', 50),
      stage('catvan_cat', 'Cáº¯t vÃ¡n', 25),
      stage('baovan_bao', 'BÃ o vÃ¡n', 15)
    ] },
    { id: 'x1', label: 'XÆ°á»Ÿng 1', efficiency: null, hours: 0, incidentHours: 0, bottleneck: null, stages: [] }
  ];
  const previousCapacity = [
    { ...capacity[0], efficiency: 80, hours: 36, incidentHours: 4, stages: capacity[0].stages.map(item => ({
      ...item, quantity: item.id === 'cut' ? 8 : item.quantity, hours: 6, incidentHours: 2, efficiency: 80
    })) },
    capacity[1]
  ];
  const inventory = {
    remainingThanh: 50, remainingM3: 0.25, poolThanh: 80,
    poolSay1Thanh: 12, poolSay2Thanh: 18,
    pendingCount: 1, pendingQty: 4, mismatchThanh: 2
  };

  assert.equal(canAccessLeadershipDashboard(), true);
  const week = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory, previousCapacity);
  assert.deepEqual(week.range, { from: '2026-10-26', to: '2026-11-01' });
  assert.equal(week.purchases.weight, 175);
  assert.equal(week.purchases.amount, 200000);
  assert.equal(week.purchases.byLocation.find(row => row.key === 'xuong-2').weight, 140);
  assert.equal(week.purchases.byLocation.find(row => row.key === 'xuong-2').byType.length, 2);
  assert.equal(week.byproductSales.amount, 200000);
  assert.equal(week.previous.byproductSales.amount, 100000);
  assert.equal(week.capacity.find(row => row.id === 'x2').stages.find(row => row.id === 'boluong').quantity, 3800);
  assert.equal(week.capacity.find(row => row.id === 'x2').stages.find(row => row.id === 'boluong').quantityUnit, 'kg');
  assert.equal(week.capacity.find(row => row.id === 'x2').stages.find(row => row.id === 'cut').quantity, 8000);
  assert.equal(week.previous.capacity.find(row => row.id === 'x2').stages.find(row => row.id === 'cut').quantity, 2500);
  assert.equal(week.consumption.cart.input, 3800);
  assert.ok(Math.abs(week.consumption.cart.rate - (1250 / 3800 * 100)) < 1e-9);
  assert.equal(week.consumption.pipe.rate, 90);
  assert.equal(week.consumption.rough.inputKg, 1250);
  assert.equal(week.consumption.rough.outputM3, 0.3512);
  assert.equal(week.consumption.rough.inputThroughDate, '2026-10-28');
  assert.equal(week.consumption.rough.outputThroughDate, '2026-10-29');
  assert.ok(Math.abs(week.consumption.rough.consumption - (1250 / 0.3512)) < 1e-9);
  assert.equal(week.consumption.rough.unattributedRows, 1);
  assert.equal(week.consumption.rough.unattributedM3, 0.2);
  assert.ok(Math.abs(week.consumption.press.inputM3 - 0.01224) < 1e-9);
  assert.ok(Math.abs(week.consumption.press.outputM3 - 0.00792) < 1e-9);
  assert.ok(Math.abs(week.consumption.press.consumption - (0.01224 / 0.00792)) < 1e-9);
  // BÃ o tinh: Ä‘áº§u vÃ o CHá»ˆ tÃ­nh lÆ°á»£t 'tinh' gá»‘c; ha_cap (háº¡ cáº¥p thanh lá»—i) khÃ´ng tÃ­nh láº¡i Ä‘áº§u vÃ o,
  // Ä‘áº§u ra tÃ­nh thuáº§n = Ä‘áº§u ra má»›i âˆ’ pháº§n Ä‘áº§u ra cÅ© cá»§a cÃ¹ng sá»‘ thanh lá»—i (Ä‘Ã£ tÃ­nh 1 láº§n á»Ÿ lÆ°á»£t gá»‘c)
  const btIn = 10 * 1250 * 24 * 10 / 1e9;
  const btOut = 10 * 1250 * 22 * 8 / 1e9 + (4 * 1250 * 20 * 6 / 1e9 - 4 * 1250 * 22 * 8 / 1e9);
  assert.ok(Math.abs(week.consumption.baotinh.inM3 - btIn) < 1e-12);
  assert.ok(Math.abs(week.consumption.baotinh.outM3 - btOut) < 1e-12);
  assert.equal(week.consumption.baotinh.rows, 1);
  assert.equal(week.consumption.baotinh.downRows, 1);
  assert.ok(Math.abs(week.consumption.baotinh.consumption - btIn / btOut) < 1e-12);
  assert.ok(Math.abs(week.consumption.baotinh.lossPct - (1 - btOut / btIn) * 100) < 1e-9);
  // BÃ o thanh: chá»‰ lÆ°á»£t Ä‘Ã£ kiá»ƒm XONG (bt-bt3 háº¿t lÆ°á»£t QC â†’ skipped); nguá»“n 'defect' khÃ´ng tÃ­nh láº¡i Ä‘áº§u vÃ o
  const bthIn = 95 * 640 * 14 * 12 / 1e9;
  const bthOut = 95 * 640 * 12 * 10 / 1e9 + (10 * 640 * 10 * 8 / 1e9 - 10 * 640 * 12 * 10 / 1e9);
  assert.equal(week.consumption.baothanh.rows, 1);
  assert.equal(week.consumption.baothanh.skipped, 1);
  assert.ok(Math.abs(week.consumption.baothanh.inM3 - bthIn) < 1e-12);
  assert.ok(Math.abs(week.consumption.baothanh.outM3 - bthOut) < 1e-12);
  assert.ok(Math.abs(week.consumption.baothanh.consumption - bthIn / bthOut) < 1e-12);
  assert.equal(week.consumption.baothanh.checked, 105);
  assert.ok(Math.abs(week.consumption.baothanh.ok - 93) < 1e-9);
  assert.ok(Math.abs(week.consumption.baothanh.errPct - (1 - 93 / 105) * 100) < 1e-9);
  // TÃ¡i dÃ¹ng lá»—i: ha_cap 4 thanh cá»¡ 1250Ã—22Ã—8 + bÃ o thanh nguá»“n defect 10 thanh cá»¡ 640Ã—12Ã—10
  const reuseM3 = 4 * 1250 * 22 * 8 / 1e9 + 10 * 640 * 12 * 10 / 1e9;
  assert.ok(Math.abs(week.consumption.baothanh.reusedM3 - reuseM3) < 1e-12);
  assert.equal(week.consumption.baothanh.reusedRows, 2);
  // Tá»“n lá»—i hiá»‡n táº¡i (má»i ká»³): 1200Ã—50Ã—12 cÃ²n 2 (lÃ´ cÅ© bt-previous) + 1250Ã—20Ã—6 cÃ²n 1 + 640Ã—10Ã—8 cÃ²n 2
  assert.ok(Math.abs(week.consumption.baothanh.defectRemainingM3 -
    (2 * 1200 * 50 * 12 / 1e9 + 1 * 1250 * 20 * 6 / 1e9 + 2 * 640 * 10 * 8 / 1e9)) < 1e-12);
  assert.equal(week.quality.x2.checked, 18);
  assert.equal(week.quality.x2.passed, 16);
  assert.equal(week.quality.x2.byKind.bullig.checked, 8);
  assert.equal(week.quality.x2.byKind.bullig.rejected, 1);
  assert.equal(week.previous.quality.x2.byKind.bullig.checked, 5);
  assert.equal(week.quality.x1.checked, 4);
  assert.equal(week.labor.active, 2);
  assert.equal(week.labor.joined, 1);
  assert.equal(week.labor.left, 1);
  assert.equal(week.labor.netChange, 0);
  assert.equal(week.labor.departments.find(row => row.department === 'XÆ°á»Ÿng 2').joined, 1);
  assert.equal(week.labor.departments.find(row => row.department === 'XÆ°á»Ÿng 1').left, 1);
  assert.equal(week.labor.missingJoinDate, 1);
  assert.equal(week.shipments.quantity, 40);
  assert.equal(week.shipments.rows, 4);
  assert.equal(week.shipments.unattributedRows, 1);
  assert.equal(week.shipments.unclassifiedRows, 1);
  const shipmentBullig = week.shipments.byCategory.find(item => item.key === 'bullig');
  const shipmentThanh = week.shipments.byCategory.find(item => item.key === 'thanh');
  const shipmentVan = week.shipments.byCategory.find(item => item.key === 'van');
  assert.deepEqual(shipmentBullig.planWeeks, [44]);
  assert.equal(shipmentBullig.quantity, 12);
  assert.equal(shipmentBullig.planQuantity, 10);
  assert.equal(shipmentBullig.attainment, 120);
  assert.deepEqual(shipmentThanh.planWeeks, [44, 45]);
  assert.equal(shipmentThanh.quantity, 6);
  assert.equal(shipmentThanh.planQuantity, 20);
  assert.deepEqual(shipmentVan.planWeeks, [43, 44]);
  assert.equal(shipmentVan.quantity, 18);
  assert.equal(shipmentVan.planQuantity, 70);
  assert.ok(Math.abs(shipmentVan.volumeM3 - 0.0990144) < 1e-9);

  const savedEmployees = state.hrEmployees;
  state.hrEmployees = [
    { id: 'existing-office', department: 'VÄƒn PhÃ²ng', status: 'active', joinDate: '2025-01-01' },
    { id: 'left-x1', department: 'XÆ°á»Ÿng 1', status: 'quit', joinDate: '2025-01-01', quitDate: '2026-10-30' },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `joined-x2-${index}`, department: 'XÆ°á»Ÿng 2', status: 'active', joinDate: '2026-10-27'
    }))
  ];
  const movedLabor = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory);
  assert.equal(movedLabor.labor.netChange, 4);
  assert.equal(movedLabor.labor.departments.find(row => row.department === 'XÆ°á»Ÿng 2').netChange, 5);
  assert.equal(movedLabor.labor.departments.find(row => row.department === 'XÆ°á»Ÿng 1').netChange, -1);
  const movedMarkup = buildLeadershipReportMarkup(movedLabor);
  const movedLaborSection = movedMarkup.match(/<section class="leadership-section">\s*<header class="leadership-section-header"><span>05<\/span><h2>Lao Ä‘á»™ng<\/h2>[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(movedLaborSection, /<span>XÆ°á»Ÿng 2<\/span>[\s\S]*?title="Trong ká»³: \+5 vÃ o, âˆ’0 nghá»‰"/);
  assert.match(movedLaborSection, /<span>XÆ°á»Ÿng 1<\/span>[\s\S]*?title="Trong ká»³: \+0 vÃ o, âˆ’1 nghá»‰"/);
  assert.doesNotMatch(movedLaborSection, /ï¼ KhÃ´ng Ä‘á»•i/);
  state.hrEmployees = savedEmployees;

  const oddPairWeek = buildLeadershipSummary('week', '2026-W43', state, capacity, inventory, previousCapacity);
  assert.equal(oddPairWeek.shipments.quantity, 99);
  assert.equal(oddPairWeek.shipments.unattributedRows, 0);

  const markup = buildLeadershipReportMarkup(week);
  assert.equal((markup.match(/class="leadership-paper" data-report-page=/g) || []).length, 2);
  assert.doesNotMatch(markup, /leadership-kpi/);
  for (const heading of ['NguyÃªn liá»‡u mua vÃ o', 'Sáº£n xuáº¥t &amp; cÃ´ng suáº¥t', 'Tá»“n kho', 'Cháº¥t lÆ°á»£ng', 'Lao Ä‘á»™ng', 'Xuáº¥t hÃ ng']) {
    assert.ok(markup.includes(`<h2>${heading}</h2>`), `missing report heading: ${heading}`);
  }
  assert.match(markup, /class="is-pass" style="width:80%"/);
  assert.match(markup, /class="is-exception" style="width:10%"/);
  assert.match(markup, /class="is-reject" style="width:10%"/);
  assert.match(markup, /Sáº¥y 1 Â· 12/);
  assert.match(markup, /Sáº¥y 2 Â· 18/);
  assert.match(markup, /leadership-purchase-pie/);
  assert.equal((markup.match(/class="leadership-purchase-pie"/g) || []).length, 1);
  assert.equal((markup.match(/class="leadership-pie-location-boundary"/g) || []).length, 3);
  assert.equal((markup.match(/class="leadership-pie-position-ring"/g) || []).length, 3);
  assert.equal((markup.match(/class="leadership-pie-ring-separator"/g) || []).length, 3);
  assert.match(markup, /leadership-pie-location-boundary/);
  assert.match(markup, /<polyline points=/);
  assert.match(markup, /class="leadership-purchase-visual-row">[\s\S]*class="leadership-purchase-location-totals"/);
  assert.match(markup, /Tuáº§n 44-2026 vs Tuáº§n 43-2026/);
  assert.match(markup, /XÆ°á»Ÿng 2 Â· Luá»“ng á»‘ng/);
  assert.match(markup, /leadership-money-chart/);
  assert.match(markup, /Thu bÃ¡n phá»¥ pháº©m/);
  assert.match(markup, /leadership-quality-x2-grid/);
  assert.match(markup, /Bullig/);
  const shipmentSection = markup.match(/class="leadership-section leadership-shipment-section">[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(shipmentSection, /Bullig/);
  assert.match(shipmentSection, /Thanh/);
  assert.match(shipmentSection, /VÃ¡n/);
  assert.match(shipmentSection, /Äáº¡t 120%/);
  assert.match(shipmentSection, /KH <b>70 táº¥m<\/b>/);
  assert.match(shipmentSection, /mÂ³/);
  assert.match(shipmentSection, /ChÆ°a phÃ¢n loáº¡i/);
  assert.doesNotMatch(shipmentSection, /40 sáº£n pháº©m/);
  assert.match(markup, /leadership-stage-meta/);
  const stageMetaBlocks = markup.match(/<div class="leadership-stage-meta">[\s\S]*?<\/div>/g) || [];
  assert.ok(stageMetaBlocks.length > 0);
  assert.ok(stageMetaBlocks.every(block => !block.includes('%')));
  assert.match(markup, /leadership-main-stages/);
  assert.match(markup, /Giá» lÃ m/);
  assert.match(markup, /Sá»± cá»‘/);
  assert.match(markup, /mÂ³/);
  assert.match(markup, /Bullig - Chá»n thanh/);
  assert.match(markup, /leadership-delta is-unavailable/);
  assert.doesNotMatch(markup, /Bullig - gia cÃ´ng|Cáº¯t vÃ¡n|BÃ o vÃ¡n/);
  assert.doesNotMatch(markup, /Bá»‘c luá»“ng\/Cáº¯t chá»n quy Ä‘á»•i kg/);
  assert.ok(markup.indexOf('Bá»‘c luá»“ng') < markup.indexOf('leadership-main-stages'));
  assert.ok(markup.indexOf('leadership-main-stages') < markup.indexOf('Ã‰p vÃ¡n'));
  assert.match(markup, /Chá»‰ sá»‘ tiÃªu hao/);
  assert.match(markup, /Luá»“ng cÃ¢y â†’ á»‘ng Ä‘áº¡t/);
  assert.match(markup, /Tá»· lá»‡ Ä‘áº§u vÃ o \/ mÂ³ thanh thÃ´/);
  assert.ok(!markup.includes('kg Ä‘áº¿n'));
  assert.match(markup, /Thanh tinh â†’ BTP \/ thÃ nh pháº©m/);
  assert.match(markup, /BÃ o tinh Â· Thanh thÃ´ â†’ thanh tinh/);
  assert.match(markup, /BÃ o thanh Â· VÃ¡n\/lá»—i â†’ thanh \(QC\)/);
  assert.match(markup, /tÃ¡i dÃ¹ng/);
  assert.match(markup, /lÆ°á»£t chá» kiá»ƒm/);
  assert.doesNotMatch(markup, /ÄM \d/);
  assert.doesNotMatch(markup, /Pháº¡m vi &amp; lÆ°u Ã½ dá»¯ liá»‡u|leadership-data-notes/);
  const consumptionSection = markup.match(/<section class="leadership-section leadership-consumption-section">[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(consumptionSection, /leadership-data-note|phiáº¿u|truy nguá»“n/);

  const month = buildLeadershipSummary('month', '2026-10', state, capacity, inventory);
  assert.deepEqual(month.range, { from: '2026-10-01', to: '2026-10-31' });
  assert.equal(month.purchases.weight, 210);
  assert.equal(month.quality.x1.checked, 0);
  assert.equal(month.shipments.quantity, 99);
  assert.equal(month.shipments.unattributedRows, 5);
  assert.match(buildLeadershipReportMarkup(month), /ThÃ¡ng 10-2026 vs ThÃ¡ng 9-2026/);
  const emptyPeriod = buildLeadershipSummary('week', '2026-W41', state, capacity, inventory);
  assert.equal(emptyPeriod.consumption.cart.rate, null);
  assert.equal(emptyPeriod.consumption.pipe.rate, null);
  assert.equal(emptyPeriod.consumption.rough.consumption, null);
  assert.equal(emptyPeriod.consumption.press.consumption, null);
  assert.equal(emptyPeriod.consumption.baotinh.consumption, null);
  assert.equal(emptyPeriod.consumption.baotinh.rows, 0);
  assert.equal(emptyPeriod.consumption.baothanh.consumption, null);
  assert.equal(emptyPeriod.consumption.baothanh.rows, 0);
  assert.equal(emptyPeriod.consumption.baothanh.skipped, 0);
  assert.match(buildLeadershipReportMarkup(emptyPeriod), /ChÆ°a phÃ¡t sinh/);

  const report = buildLeadershipReportData(week);
  assert.equal(report.headerRow, 4);
  assert.equal(report.aoa[0][0], 'BÃO CÃO Tá»”NG Há»¢P BAN LÃƒNH Äáº O');
  assert.deepEqual(report.aoa[4], ['NhÃ³m', 'XÆ°á»Ÿng / Bá»™ pháº­n', 'Chá»‰ sá»‘', 'GiÃ¡ trá»‹', 'ÄÆ¡n vá»‹', 'Ghi chÃº']);
  assert.match(report.filename, /2026-W44/);
  assert.ok(report.aoa.some(row => row[0] === 'Giao hÃ ng' && row[1] === 'XÆ°á»Ÿng 1'));
  assert.ok(report.aoa.some(row => row[0] === 'Giao hÃ ng' && row[1] === 'XÆ°á»Ÿng 2 Â· Bullig' && row[3] === 12 && row[4] === 'thanh'));
  assert.ok(report.aoa.some(row => row[0] === 'Giao hÃ ng' && row[1] === 'XÆ°á»Ÿng 2 Â· Thanh' && row[2] === 'Tá»· lá»‡ Ä‘áº¡t káº¿ hoáº¡ch' && row[3] === 30));
  assert.ok(report.aoa.some(row => row[0] === 'Giao hÃ ng' && row[1] === 'XÆ°á»Ÿng 2 Â· VÃ¡n' && row[2] === 'Thá»ƒ tÃ­ch quy Ä‘á»•i' && row[4] === 'mÂ³'));
  assert.ok(report.aoa.some(row => row[0] === 'Giao hÃ ng' && row[1] === 'XÆ°á»Ÿng 2 Â· ChÆ°a phÃ¢n loáº¡i'));
  assert.ok(report.aoa.some(row => row[0] === 'Phá»¥ pháº©m' && row[2] === 'Thu bÃ¡n phá»¥ pháº©m' && row[3] === 200000));
  assert.ok(report.aoa.some(row => row[0] === 'Cháº¥t lÆ°á»£ng' && row[1] === 'Bullig'));
  assert.ok(report.aoa.some(row => row[0] === 'Sáº£n xuáº¥t' && row[2] === 'Giá» sá»± cá»‘'));
  assert.ok(report.aoa.some(row => row[0] === 'TiÃªu hao' && row[1] === 'XÆ°á»Ÿng 2 Â· Luá»“ng cÃ¢y' && row[2] === 'Tá»· lá»‡ á»‘ng Ä‘áº¡t / Ä‘áº§u vÃ o' && Math.abs(row[3] - (1250 / 3800 * 100)) < 1e-9));
  assert.ok(report.aoa.some(row => row[0] === 'TiÃªu hao' && row[1] === 'XÆ°á»Ÿng 2 Â· Thanh thÃ´' &&
    row[2] === 'á»ng bá»• Ä‘áº¡t Ä‘áº¿n 29/10' && row[3] === 1250 && row[4] === 'kg'));
  assert.ok(report.aoa.some(row => row[0] === 'TiÃªu hao' && row[1] === 'XÆ°á»Ÿng 2 Â· Thanh thÃ´' &&
    row[2] === 'Tá»· lá»‡ Ä‘áº§u vÃ o / mÂ³ thanh thÃ´' && Math.abs(row[3] - (1250 / 0.3512)) < 1e-9 &&
    row[4] === 'kg/mÂ³' && !String(row[5] || '').includes('chÆ°a Ä‘á»§ liÃªn káº¿t')));
  assert.ok(report.aoa.some(row => row[0] === 'TiÃªu hao' && row[1] === 'XÆ°á»Ÿng 2 Â· Ã‰p vÃ¡n' && row[4] === 'mÂ³/mÂ³'));
  assert.ok(report.aoa.some(row => row[0] === 'TiÃªu hao' && row[1] === 'XÆ°á»Ÿng 2 Â· BÃ o tinh' &&
    row[2] === 'TiÃªu hao thuáº§n cáº¯t gá»t / mÂ³ Ä‘áº§u ra' && row[4] === 'mÂ³/mÂ³' &&
    Math.abs(row[3] - week.consumption.baotinh.consumption) < 1e-12));
  assert.ok(report.aoa.some(row => row[0] === 'TiÃªu hao' && row[1] === 'XÆ°á»Ÿng 2 Â· BÃ o thanh' && row[4] === 'mÂ³/mÂ³'));
  assert.ok(report.aoa.some(row => row[0] === 'TiÃªu hao' && row[1] === 'XÆ°á»Ÿng 2 Â· TÃ¡i dÃ¹ng lá»—i' && row[4] === 'mÂ³' &&
    Math.abs(row[3] - week.consumption.baothanh.reusedM3) < 1e-12));
  assert.ok(report.aoa.some(row => row[0] === 'TiÃªu hao' && row[1] === 'XÆ°á»Ÿng 2 Â· Thanh lá»—i' && row[2] === 'Tá»“n lá»—i hiá»‡n táº¡i'));
  assert.ok(!report.aoa.some(row => /Bullig - gia cÃ´ng|Cáº¯t vÃ¡n|BÃ o vÃ¡n/.test(row[1] || '')));
  assert.ok(report.aoa.some(row => row[0] === 'NhÃ¢n sá»±' && row[1] === 'XÆ°á»Ÿng 2' &&
    row[2] === 'Biáº¿n Ä‘á»™ng trong ká»³' && row[3] === 1 && row[5] === '+1 vÃ o Â· âˆ’0 nghá»‰'));

  // â”€â”€â”€ Tá»’N NGOÃ€I BÃƒI + á»NG CHÆ¯A Bá»” â€” áº£nh chá»¥p Ä‘áº¿n chá»§ nháº­t cá»§a ká»³ (13/11/2026) â”€â”€
  const stockSummary = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory);
  const yard = stockSummary.inventory.yard;
  assert.equal(yard.asOf, '2026-11-01');
  // BÃ£i W44: Luá»“ng cÃ¢y 20 kg (28/10 chÆ°a bá»‘c) + Luá»“ng á»‘ng 120 + 40 kg (chÆ°a cáº¯t)
  //          + 2 xe Ä‘Ã£ bá»‘c chÆ°a cáº¯t Ã— 600 kg = 1.380 kg
  assert.equal(yard.cayKg, 20);
  assert.equal(yard.ongKg, 160);
  assert.equal(yard.cartCarts, 2);
  assert.equal(yard.cartKg, 1200);
  assert.equal(yard.totalKg, 1380);
  // á»ng chÆ°a bá»• W44: Î£ á»‘ng Ä‘áº¡t cáº¯t 8.300 âˆ’ Î£ á»‘ng Ä‘em bá»• 4.950 = 3.350 kg
  assert.equal(stockSummary.inventory.ongChuaBoKg, 3350);
  assert.equal(stockSummary.inventory.x1.yardKg, 1100);
  assert.equal(stockSummary.inventory.x1.unfinishedKg, 400);
  assert.equal(stockSummary.inventory.x1.finishedKg, 150);
  assert.equal(stockSummary.inventory.x1.finishedLegacyCount, 0);
  assert.equal(stockSummary.previous.inventory.x1.yardKg, 1100);
  // Ká»³ trÆ°á»›c W43 (chá»§ nháº­t 25/10): bÃ£i cÃ²n 40 kg (lÃ´ á»‘ng 20/10) Â· á»‘ng chÆ°a bá»• 900 kg
  assert.equal(stockSummary.previous.inventory.yard.totalKg, 40);
  assert.equal(stockSummary.previous.inventory.ongChuaBoKg, 900);
  const stockMarkup = buildLeadershipReportMarkup(stockSummary);
  assert.ok(stockMarkup.includes('Tá»“n táº¡i bÃ£i'));
  assert.ok(stockMarkup.includes('Tá»“n chÆ°a bá»•'));
  assert.ok(stockMarkup.includes('Chá»§ nháº­t 01/11'));
  assert.ok(stockMarkup.includes('Tá»“n táº¡i bÃ£i Â· chá» Bá»‘c'));
  assert.ok(stockMarkup.includes('Tá»“n dá»Ÿ dang Â· chÆ°a Lá»c/BÃ³'));
  assert.ok(stockMarkup.includes('Tá»“n thÃ nh pháº©m'));
  assert.ok(stockMarkup.includes('Tá»“n thanh'));
  assert.ok(stockMarkup.includes('áº¢nh chá»¥p hiá»‡n táº¡i'));
  const stockReport = buildLeadershipReportData(stockSummary);
  assert.ok(stockReport.aoa.some(row => row[0] === 'Tá»“n kho' && row[1] === 'XÆ°á»Ÿng 1 Â· BÃ£i'
    && row[3] === 1100 && row[4] === 'kg'));
  assert.ok(stockReport.aoa.some(row => row[0] === 'Tá»“n kho' && row[1] === 'XÆ°á»Ÿng 1 Â· Dá»Ÿ dang'
    && row[3] === 400 && row[4] === 'kg'));
  assert.ok(stockReport.aoa.some(row => row[0] === 'Tá»“n kho' && row[1] === 'XÆ°á»Ÿng 1 Â· Kho Nan'
    && row[2] === 'Tá»“n thÃ nh pháº©m' && row[3] === 150 && row[4] === 'kg'));
  assert.ok(stockReport.aoa.some(row => row[0] === 'Tá»“n kho' && row[1] === 'XÆ°á»Ÿng 2 Â· LÃ² sáº¥y'
    && row[2] === 'Tá»“n trung gian' && row[3] === 30 && row[4] === 'thanh'));
  assert.ok(stockReport.aoa.some(row => row[0] === 'Tá»“n kho' && row[1] === 'XÆ°á»Ÿng 2 Â· BÃ£i nguyÃªn liá»‡u'
    && row[3] === 1380 && row[4] === 'kg'));
  assert.ok(stockReport.aoa.some(row => row[0] === 'Tá»“n kho' && row[1] === 'XÆ°á»Ÿng 2 Â· Bá»• á»ng'
    && row[3] === 3350 && row[4] === 'kg'));
  const linkedBoOngRecords = state.xuong2BoOngRecords;
  // KhÃ´ng cÃ²n lÆ°á»£t bá»• trÆ°á»›c má»‘c Ä‘áº§u ra (chá»‰ cÃ²n lÆ°á»£t bá»• 30/10 â€” sau má»‘c chá»n nan 29/10)
  // â†’ khÃ´ng chá»‘t Ä‘Æ°á»£c má»‘c Ä‘áº§u vÃ o, hiá»ƒn thá»‹ tá»•ng riÃªng theo ká»³ thay vÃ¬ tá»· lá»‡.
  state.xuong2BoOngRecords = linkedBoOngRecords.filter(record => record.id !== 'bo-week');
  const unlinkedSummary = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory);
  assert.equal(unlinkedSummary.consumption.rough.consumption, null);
  assert.equal(unlinkedSummary.consumption.rough.periodInputKg, 2500);
  assert.equal(unlinkedSummary.consumption.rough.periodOutputM3, 0.3512);
  const unlinkedMarkup = buildLeadershipReportMarkup(unlinkedSummary);
  assert.match(unlinkedMarkup, /0,351 mÂ³/);
  assert.ok(!unlinkedMarkup.includes('Bá»‘c Luá»“ng + Luá»“ng á»‘ng'));
  const unlinkedReport = buildLeadershipReportData(unlinkedSummary);
  assert.ok(unlinkedReport.aoa.some(row => row[0] === 'TiÃªu hao' &&
    row[1] === 'XÆ°á»Ÿng 2 Â· á»ng bá»• Ä‘áº¡t' && row[2] === 'Äáº§u vÃ o trong ká»³ (tá»•ng riÃªng)' &&
    row[3] === 2500 && row[4] === 'kg'));
  assert.ok(unlinkedReport.aoa.some(row => row[0] === 'TiÃªu hao' &&
    row[1] === 'XÆ°á»Ÿng 2 Â· Chá»n Nan ThÃ´' && row[2] === 'Thá»ƒ tÃ­ch Ä‘áº§u ra trong ká»³ (tá»•ng riÃªng)' &&
    row[3] === 0.3512 && row[4] === 'mÂ³'));
  state.xuong2BoOngRecords = linkedBoOngRecords;

  const printClasses = new Set();
  let afterPrint;
  let printCalled = false;
  globalThis.document.body = { classList: {
    add: value => printClasses.add(value),
    remove: value => printClasses.delete(value)
  } };
  globalThis.document.getElementById = id => id === 'leadership-content'
    ? { querySelector: () => ({}) }
    : null;
  globalThis.window.addEventListener = (event, listener) => {
    if (event === 'afterprint') afterPrint = listener;
  };
  globalThis.window.print = () => { printCalled = true; };
  printLeadershipReport();
  assert.equal(printCalled, true);
  assert.equal(printClasses.has('leadership-printing'), true);
  afterPrint();
  assert.equal(printClasses.has('leadership-printing'), false);

  state.currentUser = { role: 'viewer' };
  assert.equal(canAccessLeadershipDashboard(), false);
  state.currentUser = { role: 'admin' };
  assert.equal(canAccessLeadershipDashboard(), true);

  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const moduleSource = fs.readFileSync(new URL('../js/leadership-dashboard.js', import.meta.url), 'utf8');
  const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.ok(index.includes('id="leadership-view"') && moduleSource.includes('data-leadership-target'));
  assert.ok(index.includes('id="btn-leadership-print"') && index.includes('user-scalable=yes'));
  assert.ok(styles.includes('@page leadership-report { size: A4 portrait; margin: 0; }'));
  assert.ok(styles.includes('body.leadership-printing .leadership-paper'));
  assert.ok(styles.includes('.leadership-pie-location-boundary'));
  assert.ok(styles.includes('.leadership-pie-position-ring'));
  assert.ok(styles.includes('.leadership-purchase-visual-row'));
  assert.ok(styles.includes('.leadership-quality-x2-grid'));
  assert.ok(styles.includes('.leadership-stage-meta > span:nth-child(2)'));
  assert.ok(styles.includes('flex-wrap: nowrap; align-items: baseline; gap: 0 3px; white-space: nowrap;'));
  assert.ok(styles.includes('.leadership-shipment-groups'));
  assert.ok(styles.includes('.leadership-shipment-progress'));
  assert.ok(styles.includes('.leadership-section-header'));
  assert.ok(styles.includes('.leadership-stock-workshops'));
  assert.ok(styles.includes('.leadership-stock-kpi'));
  assert.ok(moduleSource.includes("from './x2-pool.js'"));
  assert.ok(moduleSource.includes('x2YardStockAsOf') && moduleSource.includes('x2OngChuaBoAsOf'));
  assert.ok(styles.includes('.leadership-consumption-grid'));
  assert.ok(!styles.includes('.leadership-data-notes'));
  assert.ok(sw.includes("'nha-may-ngoc-son-v486'"));
  assert.ok(sw.includes("'./js/leadership-dashboard.js'"));
  assert.ok(fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes("APP_VERSION = 'v486'"));

  // â”€â”€ Tuáº§n 46 trá»Ÿ Ä‘i má»›i Ä‘Æ°á»£c so sÃ¡nh â–²/â–¼ â”€â”€
  assert.equal(weekCompareEligible('week', '2026-W44'), false, 'Tuáº§n 44 khÃ´ng Ä‘Æ°á»£c so sÃ¡nh');
  assert.equal(weekCompareEligible('week', '2026-W45'), false, 'Tuáº§n 45 khÃ´ng Ä‘Æ°á»£c so sÃ¡nh');
  assert.equal(weekCompareEligible('week', '2026-W46'), true, 'Tuáº§n 46 Ä‘Æ°á»£c so sÃ¡nh');
  assert.equal(weekCompareEligible('week', '2026-W52'), true, 'Tuáº§n 52 Ä‘Æ°á»£c so sÃ¡nh');
  assert.equal(weekCompareEligible('month', '2026-10'), true, 'Cháº¿ Ä‘á»™ thÃ¡ng váº«n so sÃ¡nh bÃ¬nh thÆ°á»ng');
  assert.equal(weekCompareEligible('week', ''), true, 'KhÃ³a ká»³ rá»—ng khÃ´ng cháº·n so sÃ¡nh');
  assert.equal(weekCompareEligible('week', 'invalid'), true, 'KhÃ³a ká»³ khÃ´ng há»£p lá»‡ khÃ´ng cháº·n so sÃ¡nh');

  // BÃ¡o cÃ¡o tuáº§n 44: khÃ´ng cÃ³ class is-up/is-down (mÅ©i tÃªn â–²/â–¼), chá»‰ cÃ³ is-unavailable
  const wk44Summary = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory);
  const wk44Markup = buildLeadershipReportMarkup(wk44Summary);
  assert.ok(!wk44Markup.includes('leadership-delta is-up') && !wk44Markup.includes('leadership-delta is-down'), 'Tuáº§n 44 khÃ´ng hiá»ƒn thá»‹ mÅ©i tÃªn tÄƒng/giáº£m');
  assert.ok(wk44Markup.includes('leadership-delta is-unavailable'), 'Tuáº§n 44 hiá»‡n "chÆ°a Ä‘á»§ dá»¯ liá»‡u"');
  assert.ok(wk44Markup.includes('leadership-delta is-unavailable'), 'Tuáº§n 44 hiá»‡n "chÆ°a Ä‘á»§ dá»¯ liá»‡u"');

  console.log('PASS leadership dashboard: periods, aggregates, role access, report data, app shell');
} finally {
  Object.assign(state, saved);
}

