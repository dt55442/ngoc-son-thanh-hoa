// ═══════════════════════════════════════════════════════════
// js/chart-stems.js — VẼ CỘT BIỂU ĐỒ DẠNG "THÂN CÂY" (nguyên liệu)
// Dùng cho biểu đồ Kế Hoạch vs Thực Tế Nguyên Liệu (theo ngày):
//   • Xưởng 2 → CÂY TRE : thân xanh, có ĐỐT chia đều — mỗi vạch chia trục Y
//                         là 1 đốt (đếm đốt để đọc giá trị)
//   • Xưởng 1 → ỐNG NỨA : thẳng dài, KHÔNG mắt, chỉ 1 đốt ở đầu, vàng xám
//   • Lò hơi  → KHÚC GỖ : dựng đứng, thân TRƠN (không cành), vỏ nâu có vân
// CHỈ ĐỔI HÌNH DẠNG hiển thị — dữ liệu, trục, tooltip, nhãn, đường gióng,
// tỷ lệ hoàn thành… vẫn do Chart.js + các plugin cũ ở materials.js lo:
//   - Dataset KẾ HOẠCH (vỏ) → KHUNG RỖNG (mặt trong mờ, miệng ống hở)
//   - Dataset THỰC TẾ (lấp) → ĐẶC, cao theo giá trị ⇒ lấp đầy theo tỷ lệ
// Không phụ thuộc DOM/Chart.js nên chạy tốt trong test Node.
// ═══════════════════════════════════════════════════════════

// ─── HÌNH DẠNG ───────────────────────────────────────────────
export const STEM_BAMBOO = 'bamboo'; // cây tre
export const STEM_NUA = 'nua';       // ống nứa
export const STEM_LOG = 'log';       // khúc gỗ

// Vị trí nhập nguyên liệu → hình dạng (khớp MATERIAL_LOCATIONS ở materials.js)
export const STEM_BY_LOCATION = { 'lo-hoi': STEM_LOG, 'xuong-1': STEM_NUA, 'xuong-2': STEM_BAMBOO };
// Tên hình dạng để hiện ở chú thích (legend) cho người dùng hiểu màu nào là cây gì
export const STEM_LABELS = { log: 'khúc gỗ', nua: 'ống nứa', bamboo: 'cây tre' };

export function stemShapeForLocation(locKey) {
  return STEM_BY_LOCATION[locKey] || STEM_BAMBOO;
}
export function stemLabelForLocation(locKey) {
  return STEM_LABELS[stemShapeForLocation(locKey)];
}

// ─── TIỆN ÍCH MÀU ────────────────────────────────────────────
// Làm sáng/tối 1 màu hex (amount > 0 = sáng lên, < 0 = tối đi)
export function shade(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => {
    const v = amount >= 0 ? c + (255 - c) * amount : c * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  r = f(r); g = f(g); b = f(b);
  return `rgb(${r}, ${g}, ${b})`;
}
// Màu hex → rgba với độ trong suốt cho trước
export function withAlpha(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ─── VỊ TRÍ CÁC ĐỐT TRE ──────────────────────────────────────
// Khoảng cách đốt lấy từ VẠCH CHIA trục Y (mỗi vạch chia = 1 đốt);
// vạch quá thưa (> 96px) thì thêm đốt phụ, quá dày (< 14px) thì giãn ra.
export function nodeSpacingFromTicks(tickPixels) {
  const ys = (Array.isArray(tickPixels) ? tickPixels : [])
    .map(Number).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const diffs = [];
  for (let i = 1; i < ys.length; i++) {
    const d = Math.abs(ys[i] - ys[i - 1]);
    if (d > 0.5) diffs.push(d);
  }
  if (!diffs.length) return 28;                       // không có vạch chia → mặc định
  diffs.sort((a, b) => a - b);
  const mid = diffs[Math.floor(diffs.length / 2)];    // trung vị (bỏ vạch lỗi)
  if (mid < 14) return 14;
  if (mid > 96) return 40;
  return mid;
}

// Danh sách tọa độ y các vạch đốt: tính từ ĐÁY lên theo bội số khoảng cách đốt
// (đáy = mốc 0 nên vạch đốt trùng vạch chia trục Y ⇒ đếm đốt là ra giá trị)
export function nodeYs(base, top, spacing) {
  const out = [];
  const s = Number(spacing);
  if (!Number.isFinite(s) || s <= 1 || !Number.isFinite(base) || !Number.isFinite(top)) return out;
  for (let y = base - s; y > top + 1; y -= s) out.push(y);
  return out;
}

// ─── ĐƯỜNG VIỀN BO GÓC (không dùng ctx.roundRect để chạy được cả test) ──
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Hộp cột: { x: tâm ngang, top: đỉnh, base: đáy, width: bề rộng }
function normBox(box) {
  const x = Number(box && box.x) || 0;
  const top = Number(box && box.top) || 0;
  const base = Number(box && box.base) || 0;
  const width = Math.max(3, Number(box && box.width) || 12);
  return { x, top, base, width, h: base - top };
}

// ─── CÂY TRE (Xưởng 2): thân xanh + đốt chia đều ─────────────
export function drawBamboo(ctx, box, o) {
  const b = normBox(box);
  if (b.h <= 1) return 0;
  const left = b.x - b.width / 2, right = b.x + b.width / 2;
  const dark = shade(o.color, -0.38), light = shade(o.color, 0.26);
  const radius = Math.min(5, b.width / 2);
  ctx.save();
  if (o.filled) {
    const g = ctx.createLinearGradient(left, 0, right, 0);
    g.addColorStop(0, dark); g.addColorStop(0.42, light); g.addColorStop(1, shade(o.color, -0.18));
    ctx.fillStyle = g;
    roundRectPath(ctx, left, b.top, b.width, b.h, radius); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2; ctx.stroke();
  } else {
    ctx.fillStyle = withAlpha(o.color, 0.14);
    roundRectPath(ctx, left, b.top, b.width, b.h, radius); ctx.fill();
    ctx.strokeStyle = o.color; ctx.lineWidth = 1.6; ctx.stroke();
    // miệng ống hở ở đỉnh → thấy rõ đây là KHUNG RỖNG
    ctx.beginPath();
    ctx.ellipse(b.x, b.top + Math.min(3, b.h / 6), Math.max(1.5, b.width / 2 - 0.8),
      Math.max(1.6, b.width * 0.16), 0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(o.color, 0.30); ctx.fill();
    ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.stroke();
  }
  // Đốt tre: mỗi vạch chia trục Y = 1 đốt (gờ nổi nhô ra 1.5px mỗi bên)
  const ys = nodeYs(b.base, b.top, o.nodeSpacing);
  ys.forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(left - 1.5, y); ctx.lineTo(right + 1.5, y);
    ctx.strokeStyle = o.filled ? 'rgba(27, 61, 8, 0.55)' : withAlpha(o.color, 0.85);
    ctx.lineWidth = o.filled ? 1.4 : 1.1;
    ctx.stroke();
    ctx.beginPath(); // vạch sáng mảnh ngay dưới gờ → thân tre nổi khối
    ctx.moveTo(left, y + 1.6); ctx.lineTo(right, y + 1.6);
    ctx.strokeStyle = o.filled ? 'rgba(217, 242, 184, 0.35)' : withAlpha(o.color, 0.30);
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.restore();
  return ys.length;
}

// ─── ỐNG NỨA (Xưởng 1): thẳng dài, không mắt, chỉ 1 đốt, vàng xám ──
export function drawNua(ctx, box, o) {
  const b = normBox(box);
  if (b.h <= 1) return 0;
  const left = b.x - b.width / 2;
  const radius = Math.min(3, b.width / 2);
  ctx.save();
  if (o.filled) {
    const g = ctx.createLinearGradient(left, 0, left + b.width, 0);
    g.addColorStop(0, shade(o.color, -0.28));
    g.addColorStop(0.45, shade(o.color, 0.24));
    g.addColorStop(1, shade(o.color, -0.12));
    ctx.fillStyle = g;
    roundRectPath(ctx, left, b.top, b.width, b.h, radius); ctx.fill();
    ctx.strokeStyle = shade(o.color, -0.32); ctx.lineWidth = 1; ctx.stroke();
  } else {
    ctx.fillStyle = withAlpha(o.color, 0.16);
    roundRectPath(ctx, left, b.top, b.width, b.h, radius); ctx.fill();
    ctx.strokeStyle = shade(o.color, -0.06); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); // miệng ống hở
    ctx.ellipse(b.x, b.top + Math.min(2.5, b.h / 8), Math.max(1.4, b.width / 2 - 0.8),
      Math.max(1.4, b.width * 0.14), 0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(o.color, 0.28); ctx.fill();
    ctx.strokeStyle = shade(o.color, -0.12); ctx.lineWidth = 1; ctx.stroke();
  }
  // Ống nứa KHÔNG có mắt chia: chỉ 1 đốt ở sát đầu ống
  const y = Math.min(b.base - 2, b.top + 3);
  ctx.beginPath();
  ctx.moveTo(left - 1, y); ctx.lineTo(left + b.width + 1, y);
  ctx.strokeStyle = withAlpha(shade(o.color, -0.35), 0.8);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  return 1;
}

// ─── KHÚC GỖ (Lò hơi): dựng đứng, thân TRƠN (không cành) ─────
export function drawLog(ctx, box, o) {
  const b = normBox(box);
  if (b.h <= 1) return 0;
  const half = b.width / 2;
  const left = b.x - half + 1, right = b.x + half - 1;
  const dark = shade(o.color, -0.34), light = shade(o.color, 0.20);
  ctx.save();
  // Thân gỗ: hơi loe ở gốc (không thẳng tắp như ống) → nhìn ra khúc gỗ
  ctx.beginPath();
  ctx.moveTo(left, b.top);
  ctx.lineTo(right, b.top);
  ctx.lineTo(right + 1.6, b.base);
  ctx.lineTo(left - 1.6, b.base);
  ctx.closePath();
  if (o.filled) {
    const g = ctx.createLinearGradient(left, 0, right, 0);
    g.addColorStop(0, dark); g.addColorStop(0.40, light); g.addColorStop(1, shade(o.color, -0.20));
    ctx.fillStyle = g; ctx.fill();
  } else {
    ctx.fillStyle = withAlpha(o.color, 0.16); ctx.fill();
  }
  ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.stroke();
  // Vân vỏ dọc (3 đường lượn nhẹ) — gỗ tự nhiên, không phải ống nhẵn
  [-0.42, 0, 0.42].forEach((k) => {
    const vx = b.x + half * k;
    ctx.beginPath();
    ctx.moveTo(vx, b.top + 4);
    ctx.quadraticCurveTo(vx + half * 0.18, (b.top + b.base) / 2, vx, b.base - 4);
    ctx.strokeStyle = withAlpha(dark, o.filled ? 0.35 : 0.30);
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  // Mặt cắt trên cùng (vòng tuổi gỗ)
  ctx.beginPath();
  ctx.ellipse(b.x, b.top + 1.4, Math.max(1.6, half - 1), Math.max(1.6, half * 0.30), 0, 0, Math.PI * 2);
  ctx.fillStyle = o.filled ? shade(o.color, 0.34) : withAlpha(o.color, 0.26);
  ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(b.x, b.top + 1.4, Math.max(1, half * 0.5), Math.max(1, half * 0.15), 0, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(dark, 0.7); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();
  return 0; // gỗ không có đốt
}

// ─── ĐIỀU PHỐI: vẽ đúng hình theo yêu cầu ────────────────────
// opts: { shape: 'bamboo'|'nua'|'log', filled: bool, color: '#rrggbb', nodeSpacing: px }
// Trả về SỐ ĐỐT đã vẽ (0 với khúc gỗ).
export function drawStem(ctx, box, opts) {
  const o = {
    shape: (opts && opts.shape) || STEM_BAMBOO,
    filled: !!(opts && opts.filled),
    color: (opts && opts.color) || '#4caf50',
    nodeSpacing: Number(opts && opts.nodeSpacing) || 28
  };
  if (o.shape === STEM_NUA) return drawNua(ctx, box, o);
  if (o.shape === STEM_LOG) return drawLog(ctx, box, o);
  return drawBamboo(ctx, box, o);
}

// ─── PLUGIN CHART.JS: thay cột chữ nhật bằng thân cây ────────
// Bật bằng options.plugins.stemBars = { enabled: true }; dataset cần gắn:
//   stemShape: 'bamboo'|'nua'|'log'  ·  stemFilled: true/false (TT / KH)
// Khi bật, dataset phải tắt cột mặc định (backgroundColor 'transparent',
// borderWidth 0) để Chart.js chỉ còn lo trục/tooltip/vùng bắt chuột.
function ticksOfScale(scale) {
  try {
    const ticks = (scale && scale.ticks) || [];
    return ticks
      .map((t) => Number(scale.getPixelForValue(t && t.value != null ? t.value : t)))
      .filter((v) => Number.isFinite(v));
  } catch (e) {
    return [];
  }
}

export const stemBarsPlugin = {
  id: 'stemBars',
  afterDatasetsDraw(chart) {
    const cfg = (chart && chart.options && chart.options.plugins && chart.options.plugins.stemBars) || null;
    if (!cfg || cfg.enabled === false) return;
    const ctx = chart.ctx;
    const yScale = chart.scales && chart.scales.y;
    if (!ctx || !yScale) return;
    const nodeSpacing = nodeSpacingFromTicks(ticksOfScale(yScale));
    chart.data.datasets.forEach((ds, dIdx) => {
      if (!ds || !ds.stemShape) return;              // dataset thường → để Chart.js vẽ
      const meta = chart.getDatasetMeta(dIdx);
      if (!meta || meta.hidden || !meta.data) return;
      meta.data.forEach((bar, i) => {
        const value = Number(ds.data[i]) || 0;
        if (value <= 0) return;                      // không có dữ liệu → không vẽ cột
        drawStem(ctx, { x: bar.x, top: bar.y, base: bar.base, width: bar.width }, {
          shape: ds.stemShape,
          filled: !!ds.stemFilled,
          color: ds.stemColor || ds.borderColor || '#4caf50',
          nodeSpacing
        });
      });
    });
  }
};

