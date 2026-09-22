// tests/chart-stems.test.mjs — Kiểm thử HÌNH DẠNG CỘT "THÂN CÂY" (js/chart-stems.js)
// Dùng cho biểu đồ Kế Hoạch vs Thực Tế Nguyên Liệu:
//   • ánh xạ vị trí → hình (Xưởng 2 = cây tre · Xưởng 1 = ống nứa · Lò hơi = khúc gỗ)
//   • khoảng cách ĐỐT lấy từ vạch chia trục Y + vị trí các vạch đốt tính từ đáy
//   • tiện ích màu shade/withAlpha
//   • vẽ từng hình: KH = khung rỗng (có miệng ống/mặt cắt) · TT = đặc; nứa đúng 1 đốt;
//     gỗ TRƠN (không cành); cột quá thấp thì không vẽ
//   • plugin stemBars: chỉ vẽ dataset có stemShape, bỏ giá trị 0/âm, tôn trọng enabled:false
'use strict';

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

const stems = await import('../js/chart-stems.js');
const {
  STEM_LABELS, drawStem, nodeSpacingFromTicks, nodeYs, shade, stemBarsPlugin,
  stemLabelForLocation, stemShapeForLocation, withAlpha
} = stems;

// ─── Canvas 2D stub: ghi lại lời gọi để soi hình vẽ ───────────────
function makeCtx() {
  const calls = [];
  const push = (n, extra) => calls.push(Object.assign({ n }, extra || {}));
  const ctx = {
    calls,
    lineWidth: 1, lineCap: 'butt', strokeStyle: '', fillStyle: '', font: '', globalAlpha: 1,
    save() { push('save'); },
    restore() { push('restore'); },
    beginPath() { push('beginPath'); },
    closePath() { push('closePath'); },
    moveTo(...a) { push('moveTo', { a }); },
    lineTo(...a) { push('lineTo', { a }); },
    quadraticCurveTo(...a) { push('quadraticCurveTo', { a }); },
    arc(...a) { push('arc', { a }); },
    ellipse(...a) { push('ellipse', { a }); },
    rect(...a) { push('rect', { a }); },
    fill() { push('fill', { style: this.fillStyle }); },
    stroke() { push('stroke', { style: this.strokeStyle, lw: this.lineWidth }); },
    fillText() { push('fillText'); },
    setLineDash() {},
    createLinearGradient(...a) { push('createLinearGradient', { a }); return { addColorStop() {} }; },
    createRadialGradient(...a) { push('createRadialGradient', { a }); return { addColorStop() {} }; },
    measureText() { return { width: 10 }; }
  };
  return ctx;
}
const countOf = (ctx, n) => ctx.calls.filter(c => c.n === n).length;

// ─── 1. Ánh xạ VỊ TRÍ → HÌNH DẠNG ────────────────────────────────
check('Xưởng 2 → cây tre', stemShapeForLocation('xuong-2') === 'bamboo');
check('Xưởng 1 → ống nứa', stemShapeForLocation('xuong-1') === 'nua');
check('Lò hơi → khúc gỗ', stemShapeForLocation('lo-hoi') === 'log');
check('vị trí lạ → mặc định cây tre', stemShapeForLocation('khong-co') === 'bamboo');
check('nhãn hình dạng đúng tiếng Việt',
  stemLabelForLocation('xuong-2') === 'cây tre'
  && stemLabelForLocation('xuong-1') === 'ống nứa'
  && stemLabelForLocation('lo-hoi') === 'khúc gỗ');

// ─── 2. KHOẢNG CÁCH ĐỐT theo vạch chia trục Y ────────────────────
check('khoảng đốt = khoảng vạch chia trục Y', nodeSpacingFromTicks([300, 250, 200, 150]) === 50);
check('không có vạch chia → mặc định 28px', nodeSpacingFromTicks([]) === 28);
check('vạch quá thưa (>96px) → thêm đốt phụ 40px', nodeSpacingFromTicks([400, 200, 0]) === 40);
check('vạch quá dày (<14px) → giãn 14px', nodeSpacingFromTicks([100, 108, 116]) === 14);
check('bỏ qua vạch trùng nhau', nodeSpacingFromTicks([100, 150, 150, 200]) === 50);

// ─── 3. VỊ TRÍ CÁC VẠCH ĐỐT ──────────────────────────────────────
check('đốt tính từ ĐÁY lên, trùng vạch chia',
  JSON.stringify(nodeYs(300, 100, 50)) === JSON.stringify([250, 200, 150]));
check('cột cao hơn 1 khoảng → có 1 đốt', nodeYs(300, 260, 20).length === 1);
check('cột rất thấp → không đốt', nodeYs(300, 292, 20).length === 0);
check('khoảng cách không hợp lệ → không đốt', nodeYs(300, 100, 0).length === 0);

// ─── 4. TIỆN ÍCH MÀU ─────────────────────────────────────────────
check('shade: làm tối 50% từ #4caf50', shade('#4caf50', -0.5) === 'rgb(38, 88, 40)');
check('shade: làm sáng 50% từ #4caf50', shade('#4caf50', 0.5) === 'rgb(166, 215, 168)');
check('withAlpha: hex → rgba', withAlpha('#8b5e34', 0.4) === 'rgba(139, 94, 52, 0.4)');
check('màu không phải hex → giữ nguyên', shade('none', -0.2) === 'none' && withAlpha('red', 0.5) === 'red');

// ─── 5. VẼ CÂY TRE (Xưởng 2) ─────────────────────────────────────
const BOX = { x: 100, top: 60, base: 260, width: 18 }; // cột cao 200px
const cTreKH = makeCtx();
const nodesTreKH = drawStem(cTreKH, BOX, { shape: 'bamboo', filled: false, color: '#4caf50', nodeSpacing: 50 });
check('tre (KH): 3 đốt cho cột 200px với khoảng đốt 50px', nodesTreKH === 3);
check('tre (KH): khung RỖNG có miệng ống hở (1 ellipse)', countOf(cTreKH, 'ellipse') === 1);
check('tre (KH): KHÔNG dùng gradient (chỉ viền rỗng)',
  countOf(cTreKH, 'createLinearGradient') === 0 && countOf(cTreKH, 'fill') >= 1);
const nodeYsUsed = cTreKH.calls.filter(c => c.n === 'moveTo' && [210, 160, 110].includes(c.a[1])).map(c => c.a[1]);
check('tre: vạch đốt trùng vạch chia (210 / 160 / 110 = cách đáy 50/100/150px)', new Set(nodeYsUsed).size === 3);
check('tre (KH): có nét gờ đốt nhô ra ngoài thân',
  cTreKH.calls.some(c => c.n === 'moveTo' && c.a[0] < 100 - 18 / 2));

const cTreTT = makeCtx();
drawStem(cTreTT, BOX, { shape: 'bamboo', filled: true, color: '#4caf50', nodeSpacing: 50 });
check('tre (TT): thân ĐẶC có gradient ngang (nổi khối)', countOf(cTreTT, 'createLinearGradient') === 1);
check('tre (TT): không vẽ miệng ống hở', countOf(cTreTT, 'ellipse') === 0);
check('tre (TT): vẫn có đốt chia (gờ + vạch sáng)',
  countOf(cTreTT, 'stroke') === 1 + 3 * 2);

// ─── 6. VẼ ỐNG NỨA (Xưởng 1) ─────────────────────────────────────
const cNua = makeCtx();
const nodesNua = drawStem(cNua, BOX, { shape: 'nua', filled: true, color: '#b3a271', nodeSpacing: 50 });
check('nứa: CHỈ 1 đốt (thẳng dài, không mắt chia)', nodesNua === 1);
check('nứa: đổi khoảng đốt cũng không thêm đốt',
  drawStem(makeCtx(), BOX, { shape: 'nua', filled: false, color: '#b3a271', nodeSpacing: 10 }) === 1);
check('nứa: chỉ 2 nét (viền thân + 1 đốt), không chia mắt',
  cNua.calls.filter(c => c.n === 'moveTo').length <= 2);
const cNuaKH = makeCtx();
drawStem(cNuaKH, BOX, { shape: 'nua', filled: false, color: '#b3a271' });
check('nứa (KH): khung rỗng có miệng ống hở', countOf(cNuaKH, 'ellipse') === 1);

// ─── 7. VẼ KHÚC GỖ (Lò hơi) ──────────────────────────────────────
const cGo = makeCtx();
const nodesGo = drawStem(cGo, BOX, { shape: 'log', filled: true, color: '#8b5e34', nodeSpacing: 50 });
check('gỗ: KHÔNG có đốt tre', nodesGo === 0);
check('gỗ: mặt cắt đỉnh (viền + vòng tuổi) = 2 ellipse', countOf(cGo, 'ellipse') === 2);
check('gỗ TRƠN: KHÔNG có nhánh cành (không nét dày ≥5px)',
  cGo.calls.every(c => c.n !== 'stroke' || c.lw < 5));
const maxLineX = Math.max(...cGo.calls.filter(c => c.n === 'lineTo' || c.n === 'moveTo').map(c => c.a[0]));
check('gỗ trơn: mọi nét nằm gọn trong thân (không chìa ra ngoài)',
  maxLineX <= BOX.x + BOX.width / 2 + 2);
check('gỗ: thân không thẳng tắp (có vân gỗ lượn)',
  countOf(cGo, 'quadraticCurveTo') >= 3);

// ─── 8. CỘT QUÁ THẤP → KHÔNG VẼ ───────────────────────────────────
const cThap = makeCtx();
check('cột ≤ 1px: không vẽ gì',
  drawStem(cThap, { x: 10, top: 100, base: 100.5, width: 12 }, { shape: 'bamboo', filled: true, color: '#4caf50' }) === 0
  && cThap.calls.length === 0);

// ─── 9. PLUGIN STEMBARS ───────────────────────────────────────────
function makeChart(datasets, enabled) {
  const ctx = makeCtx();
  const metas = datasets.map((ds) => ({
    hidden: false,
    data: (ds.data || []).map((v, j) => ({ x: 40, y: 100 + j, base: 300, width: 14 }))
  }));
  return {
    ctx,
    options: { plugins: { stemBars: { enabled } } },
    data: { datasets },
    scales: { y: { ticks: [{ value: 0 }, { value: 10 }, { value: 20 }], getPixelForValue: (v) => 300 - v * 10 } },
    getDatasetMeta: (i) => metas[i]
  };
}
check('plugin: id = stemBars', stemBarsPlugin.id === 'stemBars');
const dsPlan = { data: [5], stemShape: 'bamboo', stemFilled: false, borderColor: '#4caf50' };
const dsTT = { data: [3], stemShape: 'bamboo', stemFilled: true, stemColor: '#4caf50' };
const dsThuong = { data: [9], borderColor: '#999999' }; // dataset chữ nhật thường
const chart9 = makeChart([dsPlan, dsTT, dsThuong], true);
stemBarsPlugin.afterDatasetsDraw(chart9);
check('plugin: vẽ 2 cột thân cây, BỎ QUA dataset chữ nhật thường', countOf(chart9.ctx, 'save') === 2);
check('plugin: dùng màu của dataset (hex → rgba)', chart9.ctx.calls.some(c => c.n === 'fill' && String(c.style).includes('76, 175, 80')));
check('plugin: khoảng đốt lấy từ vạch chia (vạch thưa → 40px)',
  new Set(chart9.ctx.calls.filter(c => c.n === 'moveTo' && [260, 220, 180, 140].includes(c.a[1])).map(c => c.a[1])).size === 4);

const chartZero = makeChart([{ data: [0], stemShape: 'bamboo', stemFilled: true }], true);
stemBarsPlugin.afterDatasetsDraw(chartZero);
check('plugin: giá trị 0 → không vẽ cột', countOf(chartZero.ctx, 'save') === 0);

const chartOff = makeChart([dsPlan], false);
stemBarsPlugin.afterDatasetsDraw(chartOff);
check('plugin: tắt (enabled:false) → không vẽ', countOf(chartOff.ctx, 'save') === 0);

const chartHidden = makeChart([dsPlan], true);
chartHidden.getDatasetMeta = () => ({ hidden: true, data: [] });
stemBarsPlugin.afterDatasetsDraw(chartHidden);
check('plugin: dataset bị ẩn → không vẽ', countOf(chartHidden.ctx, 'save') === 0);

const chartNoPlugin = { data: { datasets: [dsPlan] }, options: {}, scales: { y: { ticks: [], getPixelForValue: () => 0 } }, ctx: makeCtx(), getDatasetMeta: () => ({ hidden: false, data: [] }) };
stemBarsPlugin.afterDatasetsDraw(chartNoPlugin);
check('plugin: chưa bật → không vẽ', chartNoPlugin.ctx.calls.length === 0);

// ─── 10. NHÃN HÌNH DẠNG DÙNG CHO CHÚ THÍCH (legend) ──────────────
check('STEM_LABELS đủ 3 hình', Object.keys(STEM_LABELS).length === 3);

console.log(`\nCHART-STEMS: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);

