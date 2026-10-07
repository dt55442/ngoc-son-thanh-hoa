'use strict';
// ═══════════════════════════════════════════════════════════════════
// make-loading-sprite.cjs — GHÉP 3 SHEET AI THÀNH SPRITE LOADING 18 FRAME
//   icons/loading/character.png (lưới 4×5) + bamboo.png (5×4) + FX sheet.png (6×3)
//   → icons/loading/tre-sprite.png (lưới 6×3 · 640×360 mỗi frame · 3840×1080)
// Chạy: node make-loading-sprite.cjs
// Các bước: đọc PNG (zlib thuần) → tách NỀN CHECKERBOARD (2 tông xám bị VẼ SƠN
//   vào ảnh, không phải alpha thật) → cắt ô theo ranh giới PHÂN SỐ (lưới không
//   chia hết) → ghép nông dân + tre + hiệu ứng theo BẢNG 18 FRAME đã khai.
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs');
const zlib = require('zlib');

const OUT = 'icons/loading/tre-sprite.png';
const FW = 640, FH = 360;          // 1 frame 16:9
const COLS = 6, ROWS = 3;          // sprite: 6 cột × 3 dòng = 18 frame
const GROUND_Y = 318;              // mặt đất trong frame

// ─── BẢNG 18 FRAME (index 1-based — đúng bảng người dùng khai) ───
// frame:        1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
const MAP_CHAR = [1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15,16,17,18];
const MAP_BAM  = [1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,14,16,18];
const MAP_FX   = [1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15,16,17,18];

// ─── BỐ TRÍ TRÊN KHUNG 640×360 (tx,ty = anchor · th = chiều cao mục tiêu) ───
const LAY = {
  char: { tx: 180, ty: GROUND_Y, th: 205 },   // nông dân — bên trái
  bam:  { tx: 470, ty: GROUND_Y, th: 300 },   // tre — bên phải
  fx:   { tx: 430, ty: 330,      th: 340 },   // hiệu ứng — phủ vùng chặt
};

// ─── ĐỌC PNG (RGB/RGBA 8-bit, không interlace) ───
function decodePng(file) {
  const b = fs.readFileSync(file);
  let pos = 8; const idat = []; let w = 0, h = 0, ct = 6, bd = 8, inter = 0;
  while (pos < b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString('ascii', pos + 4, pos + 8);
    const d = b.slice(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; inter = d[12]; }
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
  }
  if (bd !== 8 || inter !== 0 || (ct !== 6 && ct !== 2)) throw new Error(file + ': chỉ hỗ trợ 8-bit RGB(A) không interlace');
  const ch = ct === 6 ? 4 : 3, stride = w * ch;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const row = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const v = raw[p++];
      const a = x >= ch ? row[x - ch] : 0;
      const bb = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let r;
      switch (ft) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + bb; break;
        case 3: r = v + ((a + bb) >> 1); break;
        case 4: {
          const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
          r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c);
          break;
        }
        default: r = v;
      }
      row[x] = r & 255;
    }
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = out[i * ch];
    rgba[i * 4 + 1] = out[i * ch + 1];
    rgba[i * 4 + 2] = out[i * ch + 2];
    rgba[i * 4 + 3] = ch === 4 ? out[i * ch + 3] : 255;
  }
  return { w, h, data: rgba };
}
// ─── TÌM 2 TÔNG CHECKERBOARD (đỉnh histogram độ xám trung tính) ───
function grayTones(img) {
  const hist = new Map();
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4, R = img.data[o], G = img.data[o + 1], B = img.data[o + 2];
    if (Math.max(R, G, B) - Math.min(R, G, B) <= 12) hist.set(R, (hist.get(R) || 0) + 1);
  }
  const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  const p1 = sorted[0][0];
  let p2 = p1;
  for (const [k] of sorted) if (Math.abs(k - p1) > 25) { p2 = k; break; }
  return [Math.min(p1, p2), Math.max(p1, p2)];
}

// ─── TẠO ALPHA: xóa dải xám checkerboard, giữ viền mềm ───
//   pixel có SẮC ĐỘ (màu áo, da, tre xanh…) → giữ kín; pixel xám trung tính
//   trong dải 2 tông ±12 → trong suốt; ngoài dải → alpha tăng dần (viền mềm).
//   spreadMax: ngưỡng sắc độ — sheet FX cần 26 để tách ô checker CHỒNG LÊN
//   hiệu ứng bụi (blend xám-nâu rơi vào 15–26 nếu chỉ để 14).
//   loPad/hiPad: bề rộng dải xóa 2 tông · rampK: độ dốc alpha viền mềm.
function keyAlpha(img, spreadMax, loPad, hiPad, rampK) {
  const [t1, t2] = grayTones(img);
  const lo = t1 - loPad, hi = t2 + hiPad;
  console.log('  tông checker:', t1, '↔', t2, '→ dải xóa', lo, '..', hi, '(sắc độ ≤' + spreadMax + ')');
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4, R = img.data[o], G = img.data[o + 1], B = img.data[o + 2];
    const spread = Math.max(R, G, B) - Math.min(R, G, B);
    const avg = (R + G + B) / 3;
    if (spread > spreadMax) { img.data[o + 3] = 255; continue; }   // có sắc độ → nội dung
    if (avg >= lo && avg <= hi) { img.data[o + 3] = 0; continue; }  // trong dải checker → nền
    const d = avg < lo ? lo - avg : avg - hi;                       // ngoài dải → viền mềm
    img.data[o + 3] = Math.min(255, Math.round(d * rampK));
  }
  return img;
}

// ─── DỌN CHẤM NHỎ (nhiễu do AI vẽ rơi trong ô) ───
//   Cụm ≤ maxPx pixel, TRUNG BÌNH sáng ≥ minAvg và trung tính (spread ≤ maxSpread)
//   và CÔ LẬP (vòng ±4 chỉ gặp CỤM ỨNG VIÊN khác) → xóa. Số ngưỡng lấy từ
//   speckStats + log "bị chặn": nhiễu là vạch xám 10–400px (136–201); mắt/chibi
//   nằm giữa vùng tối → không cô lập → giữ; mảnh vụn gỗ/lá có sắc màu → giữ.
function despckle(img, maxPx, minAvg, maxSpread) {
  const N = img.w * img.h;
  const A = img.data;
  const seen = new Uint8Array(N);
  const compId = new Int32Array(N).fill(-1);
  const stack = [], comp = [];
  const cand = [], pixOf = [];         // ứng viên nhiễu + pixel của chúng
  const cSize = [], cAvg = [];
  let id = 0;
  // GĐ1: gán id từng cụm · đánh dấu ứng viên (nhỏ · sáng · trung tính)
  for (let i = 0; i < N; i++) {
    if (seen[i] || A[i * 4 + 3] < 40) continue;
    comp.length = 0; stack.length = 0; stack.push(i); seen[i] = 1;
    while (stack.length) {
      const p = stack.pop(); comp.push(p);
      const x = p % img.w;
      const nb = x > 0 ? [p - 1] : [];
      if (x < img.w - 1) nb.push(p + 1);
      if (p >= img.w) nb.push(p - img.w);
      if (p < N - img.w) nb.push(p + img.w);
      for (const q of nb) if (!seen[q] && A[q * 4 + 3] >= 40) { seen[q] = 1; stack.push(q); }
    }
    let sr = 0, sg = 0, sb = 0;
    for (const p of comp) { compId[p] = id; const o = p * 4; sr += A[o]; sg += A[o + 1]; sb += A[o + 2]; }
    const ar = sr / comp.length, ag = sg / comp.length, ab = sb / comp.length;
    const avgR = (ar + ag + ab) / 3;
    const isC = comp.length <= 3                 // chấm li ti: luôn ứng viên
      || (comp.length <= maxPx                    // vạch nhỏ · trung tính · sáng đủ
        && Math.max(ar, ag, ab) - Math.min(ar, ag, ab) <= maxSpread
        && avgR >= minAvg);
    cand.push(isC);
    cSize.push(comp.length);
    cAvg.push([(ar | 0), (ag | 0), (ab | 0)]);
    pixOf.push(isC ? comp.slice() : null);
    id++;
  }
  // GĐ2: vây quanh ứng viên bằng vòng ±4 — chỉ gặp CỤM ỨNG VIÊN khác → xóa;
  //   đụng phải nội dung thật (người/tre/lá…) → giữ.
  let removed = 0;
  const blocked = [];
  for (let c = 0; c < id; c++) {
    const px = pixOf[c];
    if (!px) continue;
    let doomed = true, blocker = -1;
    for (let k = 0; k < px.length && doomed; k++) {
      const p = px[k], x = p % img.w, y = (p / img.w) | 0;
      for (let dy = -4; dy <= 4 && doomed; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h) continue;
          const q = yy * img.w + xx;
          if (A[q * 4 + 3] < 40 || compId[q] === c) continue;
          if (!cand[compId[q]]) { doomed = false; blocker = compId[q]; break; }
        }
    }
    if (doomed) {
      for (const p of px) A[p * 4 + 3] = 0;
      removed++;
    } else if (cSize[c] >= 6 && blocked.length < 30) {
      blocked.push(`${cSize[c]}px(${cAvg[c]}) chặn bởi ${cSize[blocker]}px(${cAvg[blocker]})`);
    }
  }
  if (blocked.length) console.log('    bị chặn:', blocked.join(' · '));
  return removed;
}

// ─── THỐNG KÊ cụm nhỏ (để chỉnh ngưỡng despckle) ───
function speckStats(img, label) {
  const N = img.w * img.h, A = img.data;
  const seen = new Uint8Array(N);
  const stack = [], comp = [];
  const rows = [];
  for (let i = 0; i < N; i++) {
    if (seen[i] || A[i * 4 + 3] < 40) continue;
    comp.length = 0; stack.length = 0; stack.push(i); seen[i] = 1;
    while (stack.length) {
      const p = stack.pop(); comp.push(p);
      const x = p % img.w;
      const nb = x > 0 ? [p - 1] : [];
      if (x < img.w - 1) nb.push(p + 1);
      if (p >= img.w) nb.push(p - img.w);
      if (p < N - img.w) nb.push(p + img.w);
      for (const q of nb) if (!seen[q] && A[q * 4 + 3] >= 40) { seen[q] = 1; stack.push(q); }
    }
    if (comp.length > 40) continue;
    let sr = 0, sg = 0, sb = 0;
    for (const p of comp) { const o = p * 4; sr += A[o]; sg += A[o + 1]; sb += A[o + 2]; }
    rows.push({ size: comp.length, r: (sr / comp.length) | 0, g: (sg / comp.length) | 0, b: (sb / comp.length) | 0 });
  }
  rows.sort((a, b) => b.size - a.size);
  console.log('  [' + label + '] cụm ≤40px:', rows.length, '→',
    rows.slice(0, 8).map(r => `${r.size}px(${r.r},${r.g},${r.b})`).join(' '));
}

// ─── XÓA ĐƯỜNG LƯỚI Ô dính ở mép mỗi cell (lùi m px vào trong) ───
//   3 sheet đều do AI vẽ lưới trắng/xám phân ô → nếu giữ sẽ thành vạch
//   đứng/ngang chạy trong frame. Ảnh nội dung nằm ở giữa ô nên lùi 3–4 px an toàn.
function clearCellMargins(img, cols, rows, m) {
  for (let idx = 1; idx <= cols * rows; idx++) {
    const rc = cellRect(img, cols, rows, idx);
    for (let y = rc.y; y < rc.y + rc.h; y++)
      for (let x = rc.x; x < rc.x + rc.w; x++) {
        const onEdge = x < rc.x + m || x >= rc.x + rc.w - m || y < rc.y + m || y >= rc.y + rc.h - m;
        if (onEdge) img.data[(y * img.w + x) * 4 + 3] = 0;
      }
  }
}

// ─── CẮT Ô theo ranh giới PHÂN SỐ (lưới chia không hết pixel) ───
function cellRect(img, cols, rows, idx) {
  const c = (idx - 1) % cols, r = Math.floor((idx - 1) / cols);
  const x0 = Math.round(c * img.w / cols), x1 = Math.round((c + 1) * img.w / cols);
  const y0 = Math.round(r * img.h / rows), y1 = Math.round((r + 1) * img.h / rows);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ─── BBOX NỘI DUNG trong ô (bỏ nhiễu — yêu cầu ≥3 px mở mỗi hàng/cột) ───
function bboxOf(img, rc) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = rc.y; y < rc.y + rc.h; y++) {
    let n = 0;
    for (let x = rc.x; x < rc.x + rc.w; x++) if (img.data[(y * img.w + x) * 4 + 3] > 40) n++;
    if (n >= 3) { if (y < y0) y0 = y; y1 = y; }
  }
  for (let x = rc.x; x < rc.x + rc.w; x++) {
    let n = 0;
    for (let y = rc.y; y < rc.y + rc.h; y++) if (img.data[(y * img.w + x) * 4 + 3] > 40) n++;
    if (n >= 3) { if (x < x0) x0 = x; x1 = x; }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// ─── VẼ Ô LÊN FRAME (bilinear premultiplied + alpha-over, co giãn s) ───
function drawCell(dst, src, rc, dx, dy, s) {
  const dw = Math.round(rc.w * s), dh = Math.round(rc.h * s);
  const SW = src.w, SH = src.h, D = dst.data;
  for (let py = 0; py < dh; py++) {
    const Y = Math.round(dy + py);
    if (Y < 0 || Y >= FH) continue;
    let sy = rc.y + (py + 0.5) / s - 0.5;
    if (sy < 0) sy = 0;
    if (sy > SH - 1) sy = SH - 1;
    const y0 = sy | 0, y1 = Math.min(SH - 1, y0 + 1), fy = sy - y0;
    for (let px = 0; px < dw; px++) {
      const X = Math.round(dx + px);
      if (X < 0 || X >= FW) continue;
      let sx = rc.x + (px + 0.5) / s - 0.5;
      if (sx < 0) sx = 0;
      if (sx > SW - 1) sx = SW - 1;
      const x0 = sx | 0, x1 = Math.min(SW - 1, x0 + 1), fx = sx - x0;
      let pr = 0, pg = 0, pb = 0, pa = 0;
      for (let k = 0; k < 4; k++) {
        const ix = k & 1 ? x1 : x0, iy = k & 2 ? y1 : y0;
        const wgt = (k & 1 ? fx : 1 - fx) * (k & 2 ? fy : 1 - fy);
        if (wgt <= 0) continue;
        const o = (iy * SW + ix) * 4, a = src.data[o + 3] * wgt;
        pa += a;
        pr += src.data[o] * a;
        pg += src.data[o + 1] * a;
        pb += src.data[o + 2] * a;
      }
      if (pa < 1) continue;
      const sr = pr / pa, sg = pg / pa, sb = pb / pa, sa = Math.min(255, pa) / 255;
      const o = (Y * FW + X) * 4, da = D[o + 3] / 255, oa = sa + da * (1 - sa);
      if (oa <= 0) continue;
      D[o]     = Math.round((sr * sa + D[o]     * da * (1 - sa)) / oa);
      D[o + 1] = Math.round((sg * sa + D[o + 1] * da * (1 - sa)) / oa);
      D[o + 2] = Math.round((sb * sa + D[o + 2] * da * (1 - sa)) / oa);
      D[o + 3] = Math.round(oa * 255);
    }
  }
}
// ─── VẼ BÓNG ĐỔ (ellipse mờ) + ĐƯỜNG MẶT ĐẤT ───
function fillEllipse(dst, cx, cy, rx, ry, R, G, B, A) {
  for (let y = Math.ceil(cy - ry); y <= cy + ry; y++) {
    if (y < 0 || y >= FH) continue;
    for (let x = Math.ceil(cx - rx); x <= cx + rx; x++) {
      if (x < 0 || x >= FW) continue;
      const t = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (t > 1) continue;
      const a = A * (1 - t * t);
      const o = (y * FW + x) * 4, da = dst.data[o + 3] / 255, sa = a / 255, oa = sa + da * (1 - sa);
      if (oa <= 0) continue;
      dst.data[o]     = Math.round((R * sa + dst.data[o]     * da * (1 - sa)) / oa);
      dst.data[o + 1] = Math.round((G * sa + dst.data[o + 1] * da * (1 - sa)) / oa);
      dst.data[o + 2] = Math.round((B * sa + dst.data[o + 2] * da * (1 - sa)) / oa);
      dst.data[o + 3] = Math.round(oa * 255);
    }
  }
}
function fillLine(dst, x0, x1, y, half, R, G, B, A) {
  for (let yy = Math.round(y - half); yy <= y + half; yy++) {
    if (yy < 0 || yy >= FH) continue;
    const fade = 1 - Math.abs(yy - y) / (half + 1);
    for (let x = Math.round(x0); x <= x1; x++) {
      if (x < 0 || x >= FW) continue;
      const o = (yy * FW + x) * 4, sa = A * fade / 255, da = dst.data[o + 3] / 255, oa = sa + da * (1 - sa);
      if (oa <= 0) continue;
      dst.data[o]     = Math.round((R * sa + dst.data[o]     * da * (1 - sa)) / oa);
      dst.data[o + 1] = Math.round((G * sa + dst.data[o + 1] * da * (1 - sa)) / oa);
      dst.data[o + 2] = Math.round((B * sa + dst.data[o + 2] * da * (1 - sa)) / oa);
      dst.data[o + 3] = Math.round(oa * 255);
    }
  }
}

// ─── GHI PNG RGBA (zlib thuần) ───
const CRC_T = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, cr]);
}
function encodePng(w, h, rgba) {
  const stride = w * 4, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// ═══════════ CHẠY ═══════════
console.log('Đọc 3 sheet…');
const SHEETS = [
  //            key    file                          c  r  spread loPad hiPad rampK margin
  ['char', 'icons/loading/character.png', 4, 5, 14, 12, 12, 6, 3],
  ['bam',  'icons/loading/bamboo.png',    5, 4, 14, 12, 12, 6, 3],
  ['fx',   'icons/loading/FX sheet.png',  6, 3, 32, 20, 12, 10, 4],
];
const sheets = {};
for (const [key, file, cols, rows, spreadMax, loPad, hiPad, rampK, margin] of SHEETS) {
  console.log(file + ':');
  const img = keyAlpha(decodePng(file), spreadMax, loPad, hiPad, rampK);
  clearCellMargins(img, cols, rows, margin);
  speckStats(img, key);
  const nPk = despckle(img, 400, 86, 25);
  if (nPk) console.log('  bỏ', nPk, 'chấm trắng nhỏ cô lập');
  if (key === 'fx') {
    // xóa lưới ô còn sót (lùi 6px/lề) + số thứ tự vẽ trong góc trên-trái
    for (let i = 1; i <= 18; i++) {
      const rc = cellRect(img, cols, rows, i);
      for (let y = rc.y + 6; y < rc.y + 44; y++)
        for (let x = rc.x + 6; x < rc.x + 50; x++)
          img.data[(y * img.w + x) * 4 + 3] = 0;
    }
  }
  sheets[key] = { img, cols, rows };
}

// ─── SCALE + ANCHOR lấy từ Ô THAM CHIẾU (ô 1) của từng lớp ───
const refs = {};
for (const key of ['char', 'bam']) {
  const s = sheets[key], rc = cellRect(s.img, s.cols, s.rows, 1), bb = bboxOf(s.img, rc);
  if (!bb) throw new Error(key + ': ô tham chiếu rỗng');
  refs[key] = {
    scale: LAY[key].th / bb.h,
    ax: (bb.x - rc.x) + bb.w / 2,   // anchor giữa-ngang nội dung (toạ độ trong ô)
    ay: (bb.y - rc.y) + bb.h,       // anchor đáy nội dung
    rc,
  };
  console.log(key, 'ô1 bbox', JSON.stringify(bb), 'scale', refs[key].scale.toFixed(3));
}
const fxRc1 = cellRect(sheets.fx.img, 6, 3, 1);
const fxScale = LAY.fx.th / fxRc1.h;

// ═══ GHÉP 18 FRAME → SPRITE 6 cột × 3 dòng ═══
const SW = COLS * FW, SH = ROWS * FH;
const strip = Buffer.alloc(SW * SH * 4);
for (let f = 0; f < 18; f++) {
  const frame = Buffer.alloc(FW * FH * 4);
  const dst = { data: frame };
  // mặt đất + bóng đổ
  fillEllipse(dst, 180, 324, 66, 9, 0, 0, 0, 46);
  fillEllipse(dst, 470, 324, 58, 8, 0, 0, 0, 42);
  fillLine(dst, 40, 600, GROUND_Y + 4, 2, 139, 107, 69, 105);
  // lớp TRE (dưới cùng) — anchor độc lập tọa độ tuyệt đối của ô
  {
    const s = sheets.bam, i = MAP_BAM[f], rc = cellRect(s.img, s.cols, s.rows, i), R = refs.bam;
    const ox = LAY.bam.tx - R.ax * R.scale;
    const oy = LAY.bam.ty - R.ay * R.scale;
    drawCell(dst, s.img, rc, ox, oy, R.scale);
  }
  // lớp NÔNG DÂN
  {
    const s = sheets.char, i = MAP_CHAR[f], rc = cellRect(s.img, s.cols, s.rows, i), R = refs.char;
    const ox = LAY.char.tx - R.ax * R.scale;
    const oy = LAY.char.ty - R.ay * R.scale;
    drawCell(dst, s.img, rc, ox, oy, R.scale);
  }
  // lớp HIỆU ỨNG (trên cùng — anchor giữa-đáy ô)
  {
    const s = sheets.fx, i = MAP_FX[f], rc = cellRect(s.img, 6, 3, i);
    const ox = LAY.fx.tx - (rc.w / 2) * fxScale;
    const oy = LAY.fx.ty - rc.h * fxScale;
    drawCell(dst, s.img, rc, ox, oy, fxScale);
  }
  // dán vào sprite (hàng-trái→phải, đủ 6 cột/ràng)
  const col = f % COLS, row = Math.floor(f / COLS);
  for (let y = 0; y < FH; y++)
    frame.copy(strip, ((row * FH + y) * SW + col * FW) * 4, y * FW * 4, (y + 1) * FW * 4);
}
fs.writeFileSync(OUT, encodePng(SW, SH, strip));
console.log('Đã ghi', OUT, SW + '×' + SH, '(' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');

// ─── ẢNH PREVIEW 4 FRAME (1 · 10 · 14 · 18) ×50% để soi bằng mắt ───
fs.mkdirSync('tmp-edits', { recursive: true });
const pvFrames = [0, 5, 9, 14, 17], pvW = FW / 2, pvH = FH / 2;
const pv = Buffer.alloc(pvFrames.length * pvW * pvH * 4);
pvFrames.forEach((f, k) => {
  const col = f % COLS, row = Math.floor(f / COLS);
  for (let y = 0; y < pvH; y++)
    for (let x = 0; x < pvW; x++) {
      const sx = col * FW + x * 2, sy = row * FH + y * 2;
      const so = (sy * SW + sx) * 4, o = ((y * pvW + x) + k * pvW * pvH) * 4;
      pv[o] = strip[so]; pv[o + 1] = strip[so + 1]; pv[o + 2] = strip[so + 2]; pv[o + 3] = strip[so + 3];
    }
});
fs.writeFileSync('tmp-edits/preview4.png', encodePng(pvFrames.length * pvW, pvH, pv));
console.log('Đã ghi tmp-edits/preview4.png (frame 1 · 10 · 14 · 18)');



