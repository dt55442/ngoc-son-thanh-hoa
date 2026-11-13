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
  batches: state.batches
};

try {
  state.currentUser = { role: 'manager' };
  state.materialRecords = [
    { date: '2026-10-27', location: 'xuong-2', type: 'Luồng ống', weight: 120, totalAmount: 120000 },
    { date: '2026-10-28', location: 'xuong-2', type: 'Luồng cây', weight: 20, totalAmount: 30000 },
    { date: '2026-10-31', location: 'Xưởng 1', type: 'Luồng cây', weight: 30, totalAmount: 45000 },
    { date: '2026-11-01', location: 'lo-hoi', type: 'Dăm', weight: 5, totalAmount: 5000 },
    { date: '2026-10-20', location: 'xuong-2', type: 'Luồng ống', weight: 40, totalAmount: 40000 },
    { date: '2026-11-02', location: 'xuong-2', weight: 999 }
  ];
  state.qcFinalRecords = [
    { id: 'q2', date: '2026-10-28', workshop: 'x2', qtyOk: 8, qtyExcept: 1, qtyReject: 1 },
    { id: 'q-bullig', date: '2026-10-29', workshop: 'x2', kind: 'thanh', productId: 'rate-bullig', qtyOk: 100, qtyReject: 5 },
    { id: 'q1', date: '2026-11-01', workshop: 'x1', qtyOk: 3, qtyExcept: 0, qtyReject: 1 },
    // QC "Kiểm thanh" cấp phát cho lượt Bào thanh (productId rate-bullig để không rơi vào bucket chất lượng)
    { id: 'q-bt1', date: '2026-10-30', workshop: 'x2', kind: 'thanh', productId: 'rate-bullig', sizeKey: '640×12×10', inputQty: 95, qtyOk: 80, qtyExcept: 5, qtyReject: 10 },
    { id: 'q-bt2', date: '2026-10-31', workshop: 'x2', kind: 'thanh', productId: 'rate-bullig', sizeKey: '640×10×8', inputQty: 10, qtyOk: 8, qtyExcept: 0, qtyReject: 2 }
  ];
  state.hrEmployees = [
    { id: 'e1', department: 'Xưởng 2', status: 'active', joinDate: '2026-10-27' },
    { id: 'e2', department: 'Xưởng 1', status: 'quit', joinDate: '2025-01-01', quitDate: '2026-10-30' },
    { id: 'e3', department: 'QC', status: 'active' }
  ];
  state.qcExports = [
    { year: 2026, week: 'Tuần 44', weeks: [44], productId: 'rate-bullig', qty: 12 },
    { year: 2026, week: 'Tuần 43', weeks: [43, 44], productId: 'rate-van', qty: 18 },
    { year: 2026, week: 'Tuần 44', weeks: [44, 45], productId: 'rate-thanh', qty: 6 },
    { year: 2026, week: 'Tuần 44', weeks: [44], name: 'Hàng ngoài định mức', qty: 4 },
    { year: 2026, week: 'Tuần 44', weeks: [44, 46], productId: 'rate-van', qty: 7 },
    { year: 2026, week: 'Tuần 43', weeks: [43], productId: 'rate-van', qty: 99 }
  ];
  state.materialRates = [
    { id: 'rate-bullig', product: 'Bullig 1200x600x12', nanUse: 'Bullig', unit: 'Thanh' },
    { id: 'rate-thanh', product: 'Thanh 1200x50x12', nanUse: 'Ván', unit: 'Thanh' },
    { id: 'rate-van', product: 'Ván 1200x382x12', nanUse: 'Ván', unit: 'Tấm' }
  ];
  state.planningItems = [
    { year: 2026, week: 'Tuần 44', productId: 'rate-bullig', qty: 10 },
    { year: 2026, week: 'Tuần 44', productId: 'rate-thanh', qty: 15 },
    { year: 2026, week: 'Tuần 45', productId: 'rate-thanh', qty: 5 },
    { year: 2026, week: 'Tuần 43', productId: 'rate-van', qty: 30 },
    { year: 2026, week: 'Tuần 44', productId: 'rate-van', qty: 40 },
    { year: 2026, week: 'Tuần 45', productId: 'rate-van', qty: 10 }
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
    // tinh: vào 1250×24×10 ×10 (đạt 9 + lỗi 1), ra 1250×22×8 — cỡ không đụng nhánh Ép Ván (1200x50x12)
    { id: 'bt-week', date: '2026-10-29', kind: 'tinh', inQty: 10, qtyOk: 9, qtyErr: 1, inDims: [1250, 24, 10], inSizeKey: '1250×24×10', outDims: [1250, 22, 8], outSizeKey: '1250×22×8' },
    // ha_cap: lấy thanh lỗi cỡ 1250×22×8 ×4 (đạt 3 + lỗi 1), ra 1250×20×6
    { id: 'bt-hacap', date: '2026-10-28', kind: 'ha_cap', defectKey: '1250×22×8', defectDims: [1250, 22, 8], inQty: 4, qtyOk: 3, qtyErr: 1, inSizeKey: '1250×22×8', outDims: [1250, 20, 6], outSizeKey: '1250×20×6' },
    // bao_thanh nguồn press, đã kiểm xong (QC q-bt1: 95 đã kiểm, 85 đạt)
    { id: 'bt-bt1', date: '2026-10-29', kind: 'bao_thanh', inSource: 'press', inQty: 95, inDims: [640, 14, 12], inSizeKey: '640×14×12', outDims: [640, 12, 10], outSizeKey: '640×12×10' },
    // bao_thanh nguồn defect (tái dùng lỗi), đã kiểm xong (QC q-bt2: 10 đã kiểm, 8 đạt)
    { id: 'bt-bt2', date: '2026-10-30', kind: 'bao_thanh', inSource: 'defect', inQty: 10, inDims: [640, 12, 10], inSizeKey: '640×12×10', outDims: [640, 10, 8], outSizeKey: '640×10×8' },
    // bao_thanh CHƯA kiểm (hết lượt QC) → bị bỏ qua, đếm vào skipped
    { id: 'bt-bt3', date: '2026-10-29', kind: 'bao_thanh', inSource: 'press', inQty: 50, inDims: [640, 14, 12], inSizeKey: '640×14×12', outDims: [640, 12, 10], outSizeKey: '640×12×10' },
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

  const stage = (id, label, quantity, options = {}) => ({
    id, label, unit: 'xe/h', quantityUnit: 'xe', turns: 2, quantity,
    quantityKnown: true, estimated: false, capacity: 5, efficiency: 90,
    hours: 8, incidentHours: 1, ...options
  });
  const capacity = [
    { id: 'x2', label: 'Xưởng 2', efficiency: 90, hours: 40, incidentHours: 3, bottleneck: null, stages: [
      stage('boluong', 'Bốc luồng', 10),
      stage('cut', 'Cắt Chọn', 10),
      stage('epvan', 'Ép ván', 0.5, { unit: 'm³/h', quantityUnit: 'm³' }),
      stage('bullig_ct', 'Bullig - Chọn thanh', 100, { unit: 'thanh/h', quantityUnit: 'thanh' }),
      stage('bullig_gc', 'Bullig - gia công', 50),
      stage('catvan_cat', 'Cắt ván', 25),
      stage('baovan_bao', 'Bào ván', 15)
    ] },
    { id: 'x1', label: 'Xưởng 1', efficiency: null, hours: 0, incidentHours: 0, bottleneck: null, stages: [] }
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
  // Bào tinh: đầu vào CHỈ tính lượt 'tinh' gốc; ha_cap (hạ cấp thanh lỗi) không tính lại đầu vào,
  // đầu ra tính thuần = đầu ra mới − phần đầu ra cũ của cùng số thanh lỗi (đã tính 1 lần ở lượt gốc)
  const btIn = 10 * 1250 * 24 * 10 / 1e9;
  const btOut = 10 * 1250 * 22 * 8 / 1e9 + (4 * 1250 * 20 * 6 / 1e9 - 4 * 1250 * 22 * 8 / 1e9);
  assert.ok(Math.abs(week.consumption.baotinh.inM3 - btIn) < 1e-12);
  assert.ok(Math.abs(week.consumption.baotinh.outM3 - btOut) < 1e-12);
  assert.equal(week.consumption.baotinh.rows, 1);
  assert.equal(week.consumption.baotinh.downRows, 1);
  assert.ok(Math.abs(week.consumption.baotinh.consumption - btIn / btOut) < 1e-12);
  assert.ok(Math.abs(week.consumption.baotinh.lossPct - (1 - btOut / btIn) * 100) < 1e-9);
  // Bào thanh: chỉ lượt đã kiểm XONG (bt-bt3 hết lượt QC → skipped); nguồn 'defect' không tính lại đầu vào
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
  // Tái dùng lỗi: ha_cap 4 thanh cỡ 1250×22×8 + bào thanh nguồn defect 10 thanh cỡ 640×12×10
  const reuseM3 = 4 * 1250 * 22 * 8 / 1e9 + 10 * 640 * 12 * 10 / 1e9;
  assert.ok(Math.abs(week.consumption.baothanh.reusedM3 - reuseM3) < 1e-12);
  assert.equal(week.consumption.baothanh.reusedRows, 2);
  // Tồn lỗi hiện tại (mọi kỳ): 1200×50×12 còn 2 (lô cũ bt-previous) + 1250×20×6 còn 1 + 640×10×8 còn 2
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
  assert.equal(week.labor.departments.find(row => row.department === 'Xưởng 2').joined, 1);
  assert.equal(week.labor.departments.find(row => row.department === 'Xưởng 1').left, 1);
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
    { id: 'existing-office', department: 'Văn Phòng', status: 'active', joinDate: '2025-01-01' },
    { id: 'left-x1', department: 'Xưởng 1', status: 'quit', joinDate: '2025-01-01', quitDate: '2026-10-30' },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `joined-x2-${index}`, department: 'Xưởng 2', status: 'active', joinDate: '2026-10-27'
    }))
  ];
  const movedLabor = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory);
  assert.equal(movedLabor.labor.netChange, 4);
  assert.equal(movedLabor.labor.departments.find(row => row.department === 'Xưởng 2').netChange, 5);
  assert.equal(movedLabor.labor.departments.find(row => row.department === 'Xưởng 1').netChange, -1);
  const movedMarkup = buildLeadershipReportMarkup(movedLabor);
  const movedLaborSection = movedMarkup.match(/<section class="leadership-section">\s*<header class="leadership-section-header"><span>05<\/span><h2>Lao động<\/h2>[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(movedLaborSection, /<span>Xưởng 2<\/span>[\s\S]*?title="Trong kỳ: \+5 vào, −0 nghỉ"/);
  assert.match(movedLaborSection, /<span>Xưởng 1<\/span>[\s\S]*?title="Trong kỳ: \+0 vào, −1 nghỉ"/);
  assert.doesNotMatch(movedLaborSection, /＝ Không đổi/);
  state.hrEmployees = savedEmployees;

  const oddPairWeek = buildLeadershipSummary('week', '2026-W43', state, capacity, inventory, previousCapacity);
  assert.equal(oddPairWeek.shipments.quantity, 99);
  assert.equal(oddPairWeek.shipments.unattributedRows, 0);

  const markup = buildLeadershipReportMarkup(week);
  assert.equal((markup.match(/class="leadership-paper" data-report-page=/g) || []).length, 2);
  assert.doesNotMatch(markup, /leadership-kpi/);
  for (const heading of ['Nguyên liệu mua vào', 'Sản xuất &amp; công suất', 'Tồn kho', 'Chất lượng', 'Lao động', 'Xuất hàng']) {
    assert.ok(markup.includes(`<h2>${heading}</h2>`), `missing report heading: ${heading}`);
  }
  assert.match(markup, /class="is-pass" style="width:80%"/);
  assert.match(markup, /class="is-exception" style="width:10%"/);
  assert.match(markup, /class="is-reject" style="width:10%"/);
  assert.match(markup, /Sấy 1 · 12/);
  assert.match(markup, /Sấy 2 · 18/);
  assert.match(markup, /leadership-purchase-pie/);
  assert.equal((markup.match(/class="leadership-purchase-pie"/g) || []).length, 1);
  assert.equal((markup.match(/class="leadership-pie-location-boundary"/g) || []).length, 3);
  assert.equal((markup.match(/class="leadership-pie-position-ring"/g) || []).length, 3);
  assert.equal((markup.match(/class="leadership-pie-ring-separator"/g) || []).length, 3);
  assert.match(markup, /leadership-pie-location-boundary/);
  assert.match(markup, /<polyline points=/);
  assert.match(markup, /class="leadership-purchase-visual-row">[\s\S]*class="leadership-purchase-location-totals"/);
  assert.match(markup, /Tuần 44-2026 vs Tuần 43-2026/);
  assert.match(markup, /Xưởng 2 · Luồng ống/);
  assert.match(markup, /leadership-money-chart/);
  assert.match(markup, /Thu bán phụ phẩm/);
  assert.match(markup, /leadership-quality-x2-grid/);
  assert.match(markup, /Bullig/);
  const shipmentSection = markup.match(/class="leadership-section leadership-shipment-section">[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(shipmentSection, /Bullig/);
  assert.match(shipmentSection, /Thanh/);
  assert.match(shipmentSection, /Ván/);
  assert.match(shipmentSection, /Đạt 120%/);
  assert.match(shipmentSection, /KH <b>70 tấm<\/b>/);
  assert.match(shipmentSection, /m³/);
  assert.match(shipmentSection, /Chưa phân loại/);
  assert.doesNotMatch(shipmentSection, /40 sản phẩm/);
  assert.match(markup, /leadership-stage-meta/);
  const stageMetaBlocks = markup.match(/<div class="leadership-stage-meta">[\s\S]*?<\/div>/g) || [];
  assert.ok(stageMetaBlocks.length > 0);
  assert.ok(stageMetaBlocks.every(block => !block.includes('%')));
  assert.match(markup, /leadership-main-stages/);
  assert.match(markup, /Giờ làm/);
  assert.match(markup, /Sự cố/);
  assert.match(markup, /m³/);
  assert.match(markup, /Bullig - Chọn thanh/);
  assert.match(markup, /leadership-delta is-unavailable/);
  assert.doesNotMatch(markup, /Bullig - gia công|Cắt ván|Bào ván/);
  assert.doesNotMatch(markup, /Bốc luồng\/Cắt chọn quy đổi kg/);
  assert.ok(markup.indexOf('Bốc luồng') < markup.indexOf('leadership-main-stages'));
  assert.ok(markup.indexOf('leadership-main-stages') < markup.indexOf('Ép ván'));
  assert.match(markup, /Chỉ số tiêu hao/);
  assert.match(markup, /Luồng cây → ống đạt/);
  assert.match(markup, /Tỷ lệ đầu vào \/ m³ thanh thô/);
  assert.ok(!markup.includes('kg đến'));
  assert.match(markup, /Thanh tinh → BTP \/ thành phẩm/);
  assert.match(markup, /Bào tinh · Thanh thô → thanh tinh/);
  assert.match(markup, /Bào thanh · Ván\/lỗi → thanh \(QC\)/);
  assert.match(markup, /tái dùng/);
  assert.match(markup, /lượt chờ kiểm/);
  assert.doesNotMatch(markup, /ĐM \d/);
  assert.doesNotMatch(markup, /Phạm vi &amp; lưu ý dữ liệu|leadership-data-notes/);
  const consumptionSection = markup.match(/<section class="leadership-section leadership-consumption-section">[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(consumptionSection, /leadership-data-note|phiếu|truy nguồn/);

  const month = buildLeadershipSummary('month', '2026-10', state, capacity, inventory);
  assert.deepEqual(month.range, { from: '2026-10-01', to: '2026-10-31' });
  assert.equal(month.purchases.weight, 210);
  assert.equal(month.quality.x1.checked, 0);
  assert.equal(month.shipments.quantity, 99);
  assert.equal(month.shipments.unattributedRows, 5);
  assert.match(buildLeadershipReportMarkup(month), /Tháng 10-2026 vs Tháng 9-2026/);
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
  assert.match(buildLeadershipReportMarkup(emptyPeriod), /Chưa phát sinh/);

  const report = buildLeadershipReportData(week);
  assert.equal(report.headerRow, 4);
  assert.equal(report.aoa[0][0], 'BÁO CÁO TỔNG HỢP BAN LÃNH ĐẠO');
  assert.deepEqual(report.aoa[4], ['Nhóm', 'Xưởng / Bộ phận', 'Chỉ số', 'Giá trị', 'Đơn vị', 'Ghi chú']);
  assert.match(report.filename, /2026-W44/);
  assert.ok(report.aoa.some(row => row[0] === 'Giao hàng' && row[1] === 'Xưởng 1'));
  assert.ok(report.aoa.some(row => row[0] === 'Giao hàng' && row[1] === 'Xưởng 2 · Bullig' && row[3] === 12 && row[4] === 'thanh'));
  assert.ok(report.aoa.some(row => row[0] === 'Giao hàng' && row[1] === 'Xưởng 2 · Thanh' && row[2] === 'Tỷ lệ đạt kế hoạch' && row[3] === 30));
  assert.ok(report.aoa.some(row => row[0] === 'Giao hàng' && row[1] === 'Xưởng 2 · Ván' && row[2] === 'Thể tích quy đổi' && row[4] === 'm³'));
  assert.ok(report.aoa.some(row => row[0] === 'Giao hàng' && row[1] === 'Xưởng 2 · Chưa phân loại'));
  assert.ok(report.aoa.some(row => row[0] === 'Phụ phẩm' && row[2] === 'Thu bán phụ phẩm' && row[3] === 200000));
  assert.ok(report.aoa.some(row => row[0] === 'Chất lượng' && row[1] === 'Bullig'));
  assert.ok(report.aoa.some(row => row[0] === 'Sản xuất' && row[2] === 'Giờ sự cố'));
  assert.ok(report.aoa.some(row => row[0] === 'Tiêu hao' && row[1] === 'Xưởng 2 · Luồng cây' && row[2] === 'Tỷ lệ ống đạt / đầu vào' && Math.abs(row[3] - (1250 / 3800 * 100)) < 1e-9));
  assert.ok(report.aoa.some(row => row[0] === 'Tiêu hao' && row[1] === 'Xưởng 2 · Thanh thô' &&
    row[2] === 'Ống bổ đạt đến 29/10' && row[3] === 1250 && row[4] === 'kg'));
  assert.ok(report.aoa.some(row => row[0] === 'Tiêu hao' && row[1] === 'Xưởng 2 · Thanh thô' &&
    row[2] === 'Tỷ lệ đầu vào / m³ thanh thô' && Math.abs(row[3] - (1250 / 0.3512)) < 1e-9 &&
    row[4] === 'kg/m³' && !String(row[5] || '').includes('chưa đủ liên kết')));
  assert.ok(report.aoa.some(row => row[0] === 'Tiêu hao' && row[1] === 'Xưởng 2 · Ép ván' && row[4] === 'm³/m³'));
  assert.ok(report.aoa.some(row => row[0] === 'Tiêu hao' && row[1] === 'Xưởng 2 · Bào tinh' &&
    row[2] === 'Tiêu hao thuần cắt gọt / m³ đầu ra' && row[4] === 'm³/m³' &&
    Math.abs(row[3] - week.consumption.baotinh.consumption) < 1e-12));
  assert.ok(report.aoa.some(row => row[0] === 'Tiêu hao' && row[1] === 'Xưởng 2 · Bào thanh' && row[4] === 'm³/m³'));
  assert.ok(report.aoa.some(row => row[0] === 'Tiêu hao' && row[1] === 'Xưởng 2 · Tái dùng lỗi' && row[4] === 'm³' &&
    Math.abs(row[3] - week.consumption.baothanh.reusedM3) < 1e-12));
  assert.ok(report.aoa.some(row => row[0] === 'Tiêu hao' && row[1] === 'Xưởng 2 · Thanh lỗi' && row[2] === 'Tồn lỗi hiện tại'));
  assert.ok(!report.aoa.some(row => /Bullig - gia công|Cắt ván|Bào ván/.test(row[1] || '')));
  assert.ok(report.aoa.some(row => row[0] === 'Nhân sự' && row[1] === 'Xưởng 2' &&
    row[2] === 'Biến động trong kỳ' && row[3] === 1 && row[5] === '+1 vào · −0 nghỉ'));

  // ─── TỒN NGOÀI BÃI + ỐNG CHƯA BỔ — ảnh chụp đến chủ nhật của kỳ (13/11/2026) ──
  const stockSummary = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory);
  const yard = stockSummary.inventory.yard;
  assert.equal(yard.asOf, '2026-11-01');
  // Bãi W44: Luồng cây 20 kg (28/10 chưa bốc) + Luồng ống 120 + 40 kg (chưa cắt)
  //          + 2 xe đã bốc chưa cắt × 600 kg = 1.380 kg
  assert.equal(yard.cayKg, 20);
  assert.equal(yard.ongKg, 160);
  assert.equal(yard.cartCarts, 2);
  assert.equal(yard.cartKg, 1200);
  assert.equal(yard.totalKg, 1380);
  // Ống chưa bổ W44: Σ ống đạt cắt 8.300 − Σ ống đem bổ 4.950 = 3.350 kg
  assert.equal(stockSummary.inventory.ongChuaBoKg, 3350);
  // Kỳ trước W43 (chủ nhật 25/10): bãi còn 40 kg (lô ống 20/10) · ống chưa bổ 900 kg
  assert.equal(stockSummary.previous.inventory.yard.totalKg, 40);
  assert.equal(stockSummary.previous.inventory.ongChuaBoKg, 900);
  const stockMarkup = buildLeadershipReportMarkup(stockSummary);
  assert.ok(stockMarkup.includes('Tồn ngoài bãi (luồng cây + ống)'));
  assert.ok(stockMarkup.includes('Tồn ống chưa bổ (Bổ Ống)'));
  assert.ok(stockMarkup.includes('Chủ nhật 01/11'));
  const stockReport = buildLeadershipReportData(stockSummary);
  assert.ok(stockReport.aoa.some(row => row[0] === 'Tồn kho' && row[1] === 'Xưởng 2 · Bãi nguyên liệu'
    && row[3] === 1380 && row[4] === 'kg'));
  assert.ok(stockReport.aoa.some(row => row[0] === 'Tồn kho' && row[1] === 'Xưởng 2 · Bổ Ống'
    && row[3] === 3350 && row[4] === 'kg'));
  const linkedBoOngRecords = state.xuong2BoOngRecords;
  // Không còn lượt bổ trước mốc đầu ra (chỉ còn lượt bổ 30/10 — sau mốc chọn nan 29/10)
  // → không chốt được mốc đầu vào, hiển thị tổng riêng theo kỳ thay vì tỷ lệ.
  state.xuong2BoOngRecords = linkedBoOngRecords.filter(record => record.id !== 'bo-week');
  const unlinkedSummary = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory);
  assert.equal(unlinkedSummary.consumption.rough.consumption, null);
  assert.equal(unlinkedSummary.consumption.rough.periodInputKg, 2500);
  assert.equal(unlinkedSummary.consumption.rough.periodOutputM3, 0.3512);
  const unlinkedMarkup = buildLeadershipReportMarkup(unlinkedSummary);
  assert.match(unlinkedMarkup, /0,351 m³/);
  assert.ok(!unlinkedMarkup.includes('Bốc Luồng + Luồng ống'));
  const unlinkedReport = buildLeadershipReportData(unlinkedSummary);
  assert.ok(unlinkedReport.aoa.some(row => row[0] === 'Tiêu hao' &&
    row[1] === 'Xưởng 2 · Ống bổ đạt' && row[2] === 'Đầu vào trong kỳ (tổng riêng)' &&
    row[3] === 2500 && row[4] === 'kg'));
  assert.ok(unlinkedReport.aoa.some(row => row[0] === 'Tiêu hao' &&
    row[1] === 'Xưởng 2 · Chọn Nan Thô' && row[2] === 'Thể tích đầu ra trong kỳ (tổng riêng)' &&
    row[3] === 0.3512 && row[4] === 'm³'));
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
  assert.ok(styles.includes('.leadership-stock-extra'));
  assert.ok(moduleSource.includes("from './x2-pool.js'"));
  assert.ok(moduleSource.includes('x2YardStockAsOf') && moduleSource.includes('x2OngChuaBoAsOf'));
  assert.ok(styles.includes('.leadership-consumption-grid'));
  assert.ok(!styles.includes('.leadership-data-notes'));
  assert.ok(sw.includes("'nha-may-ngoc-son-v408'"));
  assert.ok(sw.includes("'./js/leadership-dashboard.js'"));
  assert.ok(fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8').includes("APP_VERSION = 'v408'"));

  // ── Tuần 46 trở đi mới được so sánh ▲/▼ ──
  assert.equal(weekCompareEligible('week', '2026-W44'), false, 'Tuần 44 không được so sánh');
  assert.equal(weekCompareEligible('week', '2026-W45'), false, 'Tuần 45 không được so sánh');
  assert.equal(weekCompareEligible('week', '2026-W46'), true, 'Tuần 46 được so sánh');
  assert.equal(weekCompareEligible('week', '2026-W52'), true, 'Tuần 52 được so sánh');
  assert.equal(weekCompareEligible('month', '2026-10'), true, 'Chế độ tháng vẫn so sánh bình thường');
  assert.equal(weekCompareEligible('week', ''), true, 'Khóa kỳ rỗng không chặn so sánh');
  assert.equal(weekCompareEligible('week', 'invalid'), true, 'Khóa kỳ không hợp lệ không chặn so sánh');

  // Báo cáo tuần 44: không có class is-up/is-down (mũi tên ▲/▼), chỉ có is-unavailable
  const wk44Summary = buildLeadershipSummary('week', '2026-W44', state, capacity, inventory);
  const wk44Markup = buildLeadershipReportMarkup(wk44Summary);
  assert.ok(!wk44Markup.includes('leadership-delta is-up') && !wk44Markup.includes('leadership-delta is-down'), 'Tuần 44 không hiển thị mũi tên tăng/giảm');
  assert.ok(wk44Markup.includes('leadership-delta is-unavailable'), 'Tuần 44 hiện "chưa đủ dữ liệu"');
  assert.ok(wk44Markup.includes('leadership-delta is-unavailable'), 'Tuần 44 hiện "chưa đủ dữ liệu"');

  console.log('PASS leadership dashboard: periods, aggregates, role access, report data, app shell');
} finally {
  Object.assign(state, saved);
}
