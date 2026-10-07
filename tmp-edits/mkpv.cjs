'use strict';
// tmp-edits/mkpv.cjs — sinh preview dán nền ĐẶC (test loại PNG nào xem được)
const fs = require('fs');
const zlib = require('zlib');
const src = fs.readFileSync('icons/loading/tre-sprite.png');
// decode nhanh (RGBA 8-bit không interlace)
let pos = 8; const idat = []; let w = 0, h = 0, ct = 6;
while (pos < src.length) {
  const len = src.readUInt32BE(pos), type = src.toString('ascii', pos + 4, pos + 8);
  const d = src.slice(pos + 8, pos + 8 + len); pos += 12 + len;
  if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
  else if (type === 'IDAT') idat.push(d);
  else if (type === 'IEND') break;
}
const ch = ct === 6 ? 4 : 3, stride = w * ch;
const raw = zlib.inflateSync(Buffer.concat(idat));
const out = Buffer.alloc(h * stride);
let p = 0;
for (let y = 0; y < h; y++) {
  const ft = raw[p++], row = out.subarray(y * stride, (y + 1) * stride), prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
  for (let x = 0; x < stride; x++) {
    const v = raw[p++], a = x >= ch ? row[x - ch] : 0, b = prev ? prev[x] : 0, c = prev && x >= ch ? prev[x - ch] : 0;
    let r;
    switch (ft) {
      case 0: r = v; break; case 1: r = v + a; break; case 2: r = v + b; break; case 3: r = v + ((a + b) >> 1); break;
      case 4: { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
      default: r = v;
    }
    row[x] = r & 255;
  }
}
const pix = (x, y) => { const o = (y * w + x) * ch; return [out[o], out[o + 1], out[o + 2], ch === 4 ? out[o + 3] : 255]; };
// strip 5 frame ×25% (f 1·6·10·15·18) dán nền xanh đậm như overlay thật
const FW = 640, FH = 360, COLS = 6, s = 0.25, fw = FW * s, fh = FH * s;
const frames = [0, 5, 9, 14, 17];
const W = fw * frames.length, H = fh;
const BG = [16, 32, 24];
const strip = Buffer.alloc(W * H * 3);
frames.forEach((f, k) => {
  const col = f % COLS, row = Math.floor(f / COLS);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const sx = col * FW + Math.floor(x / s), sy = row * FH + Math.floor(y / s);
    const [r, g, b, a] = pix(sx, sy), al = a / 255, o = (y * W + k * fw + x) * 3;
    strip[o] = Math.round(r * al + BG[0] * (1 - al));
    strip[o + 1] = Math.round(g * al + BG[1] * (1 - al));
    strip[o + 2] = Math.round(b * al + BG[2] * (1 - al));
  }
});
// encode RGB (loại 2 — không alpha)
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } return (c ^ -1) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type, 'ascii'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, cr]); }
function encRgb(w2, h2, rgb) {
  const st = w2 * 3, r2 = Buffer.alloc(h2 * (st + 1));
  for (let y = 0; y < h2; y++) rgb.copy(r2, y * (st + 1) + 1, y * st, (y + 1) * st);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w2, 0); ihdr.writeUInt32BE(h2, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(r2, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
fs.writeFileSync('tmp-edits/pv-b1.png', encRgb(W, H, strip));
console.log('Ghi tmp-edits/pv-b1.png', W + '×' + H, fs.statSync('tmp-edits/pv-b1.png').size, 'bytes');
// Lưới 2×2 FULL-SIZE (f1 · f10 · f16 · f18) — soi chi tiết rìu/gốc/bụi
const big = [0, 9, 15, 17];
const BW = FW * 2, BH = FH * 2;
const bigRgb = Buffer.alloc(BW * BH * 3);
big.forEach((f, k) => {
  const col = f % COLS, row = Math.floor(f / COLS);
  const ox = (k % 2) * FW, oy = Math.floor(k / 2) * FH;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const [r, g, b, a] = pix(col * FW + x, row * FH + y), al = a / 255;
    const o = ((oy + y) * BW + ox + x) * 3;
    bigRgb[o] = Math.round(r * al + BG[0] * (1 - al));
    bigRgb[o + 1] = Math.round(g * al + BG[1] * (1 - al));
    bigRgb[o + 2] = Math.round(b * al + BG[2] * (1 - al));
  }
});
fs.writeFileSync('tmp-edits/pv-z1.png', encRgb(BW, BH, bigRgb));
console.log('Ghi tmp-edits/pv-z1.png', BW + '×' + BH, fs.statSync('tmp-edits/pv-z1.png').size, 'bytes');
