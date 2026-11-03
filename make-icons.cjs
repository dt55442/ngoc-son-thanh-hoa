/**
 * make-icons.cjs
 * Tạo lại 4 icon PWA cho BAMBU:
 *   icon-192.png / icon-512.png            -> nền bo tròn (góc trong suốt), biểu tượng lá tre
 *   icon-maskable-192.png / icon-maskable-512.png -> nền full vuông, biểu tượng nằm trong vùng an toàn
 * Thiết kế: chữ A cách điệu từ hai lá tre trên nền xanh chuyển sắc theo logo BAMBU.
 * Thuần Node.js (zlib) - không cần thư viện ngoài. Chạy: node make-icons.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- PNG encoder (RGBA, 8-bit) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Màu thương hiệu ----------
const BG_TOP = [0x18, 0x9b, 0x4e];
const BG_BOTTOM = [0x00, 0x48, 0x30];
const LEAF_LEFT = [0xa3, 0xe6, 0x35];
const LEAF_RIGHT = [0x6e, 0xe7, 0xb7];
const FG = [0xf0, 0xfd, 0xf4];

// ---------- Chữ A cách điệu bằng hai lá tre (lưới 24x24) ----------
const LEAVES = [
  { poly: [[12, 1.8], [10.4, 4], [8.8, 7], [7.3, 10], [6.2, 13], [5.7, 16], [6, 19], [7.1, 22], [8.8, 19], [10.2, 16], [11.2, 12], [11.7, 8]], color: LEAF_LEFT },
  { poly: [[12, 1.8], [13.6, 4], [15.2, 7], [16.7, 10], [17.8, 13], [18.3, 16], [18, 19], [16.9, 22], [15.2, 19], [13.8, 16], [12.8, 12], [12.3, 8]], color: LEAF_RIGHT },
];

function inPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundRect(px, py, N, r) {
  const cx = Math.min(Math.max(px, r), N - r);
  const cy = Math.min(Math.max(py, r), N - r);
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Vẽ icon kích thước `size` với supersample x3 rồi downsample (khử răng cưa).
 * maskable=true -> nền full vuông + glyph thu nhỏ nằm gọn trong vùng an toàn của OS.
 */
function render(size, maskable) {
  const SS = 3;
  const N = size * SS;
  const buf = Buffer.alloc(N * N * 4);
  // Tỷ lệ pixel trên 1 đơn vị lưới 24 (glyph rộng 20 đơn vị, cao 18 đơn vị)
  const S = N * (maskable ? 0.036 : 0.04);
  const x0 = N / 2 - 12 * S;
  const y0 = N / 2 - 12 * S;
  const r = N * 0.22; // bo góc nền
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const ux = (px + 0.5 - x0) / S;
      const uy = (py + 0.5 - y0) / S;
      const gradient = (px + py) / (2 * (N - 1));
      const bg = BG_TOP.map((c, i) => Math.round(c + (BG_BOTTOM[i] - c) * gradient));
      let rgb = [0, 0, 0], alpha = 0;
      if (maskable || inRoundRect(px + 0.5, py + 0.5, N, r)) {
        rgb = bg; alpha = 255;
      }
      for (const leaf of LEAVES) {
        if (inPoly(ux, uy, leaf.poly)) {
          rgb = leaf.color;
          alpha = 255;
        }
      }
      if (ux >= 8.1 && ux <= 15.9 && uy >= 13.1 && uy <= 15.1) {
        rgb = FG;
        alpha = 255;
      }
      const o = (py * N + px) * 4;
      buf[o] = rgb[0]; buf[o + 1] = rgb[1]; buf[o + 2] = rgb[2]; buf[o + 3] = alpha;
    }
  }
  // Downsample SS x SS -> size x size (trộn có trọng số alpha)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rS = 0, gS = 0, bS = 0, aS = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const o = ((y * SS + sy) * N + (x * SS + sx)) * 4;
          const a = buf[o + 3];
          rS += buf[o] * a; gS += buf[o + 1] * a; bS += buf[o + 2] * a; aS += a;
        }
      }
      const o2 = (y * size + x) * 4;
      if (aS > 0) {
        out[o2] = Math.round(rS / aS);
        out[o2 + 1] = Math.round(gS / aS);
        out[o2 + 2] = Math.round(bS / aS);
      }
      out[o2 + 3] = Math.round(aS / (SS * SS));
    }
  }
  return encodePNG(size, size, out);
}

const iconDir = path.join(__dirname, 'icons');
const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-192.png', 192, true],
  ['icon-maskable-512.png', 512, true],
];
for (const [name, size, maskable] of targets) {
  const png = render(size, maskable);
  fs.writeFileSync(path.join(iconDir, name), png);
  console.log(`Da tao icons/${name} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}
console.log('Xong! Icon BAMBU voi bieu tuong la tre tren nen xanh.');