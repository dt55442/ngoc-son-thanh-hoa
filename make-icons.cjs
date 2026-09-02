/**
 * make-icons.cjs
 * Tạo lại 4 icon PWA cho "Nhà máy Ngọc Sơn Thanh Hóa":
 *   icon-192.png / icon-512.png            -> nền bo tròn (góc trong suốt), glyph nhà máy trắng
 *   icon-maskable-192.png / icon-maskable-512.png -> nền full vuông, glyph nằm trong vùng an toàn
 * Thiết kế: nhà máy trắng trên nền xanh đậm #14532d (theo theme màu của ứng dụng).
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
const BG = [0x14, 0x53, 0x2d]; // #14532d - xanh lá đậm (theme_color của app)
const FG = [255, 255, 255];    // glyph trắng

// ---------- Hình nhà máy (lưới 24x24, phong cách icon Lucide "factory") ----------
// Tháp cao bên trái + 2 mái răng cưa + thân nhà
const FACTORY = [[2, 4], [8, 4], [8, 13], [15, 8], [15, 13], [22, 8], [22, 22], [2, 22]];
// Cửa sổ đục lỗ (vẽ đè màu nền) [x0, y0, x1, y1]
const WINDOWS = [
  [4.5, 17.0, 6.5, 19.0],
  [10.5, 17.0, 12.5, 19.0],
  [16.0, 17.0, 18.0, 19.0],
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
  const S = maskable ? N * 0.026 : (N * 0.62) / 20;
  const x0 = N / 2 - 10 * S; // tâm glyph (12,13) khớp tâm canvas
  const y0 = N / 2 - 9 * S;
  const r = N * 0.22; // bo góc nền
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const ux = (px + 0.5 - x0) / S;
      const uy = (py + 0.5 - y0) / S;
      let rgb = [0, 0, 0], alpha = 0;
      if (maskable || inRoundRect(px + 0.5, py + 0.5, N, r)) {
        rgb = BG; alpha = 255;
      }
      if (inPoly(ux, uy, FACTORY)) {
        rgb = FG; alpha = 255;
        // Đục lỗ cửa sổ (vẽ đè màu nền lên glyph trắng)
        for (const w of WINDOWS) {
          if (ux >= w[0] && ux <= w[2] && uy >= w[1] && uy <= w[3]) { rgb = BG; alpha = 255; break; }
        }
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
console.log('Xong! Icon nha may tren nen xanh #14532d.');