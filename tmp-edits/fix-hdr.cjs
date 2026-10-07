// tmp-edits/fix-hdr.cjs — thay khối mô tả "2 PHA" trong styles.css theo VỊ TRÍ DÒNG
const fs = require('fs');
const P = 'styles.css';
const lines = fs.readFileSync(P, 'utf8').split('\n');
const i = lines.findIndex(s => s.includes('2 PHA:  ① ĐANG CHẶT'));
if (i < 0) { console.error('Không thấy đầu khối 2 PHA'); process.exit(1); }
let j = i;
while (j < lines.length && !lines[j].includes('tre KHÔNG gãy. */')) j++;
if (j >= lines.length) { console.error('Không thấy cuối khối'); process.exit(1); }
const nw = [
  '   2 PHA (SPRITE 18 FRAME — icons/loading/tre-sprite.png · 6 cột × 3 dòng · 640×360):',
  '           ① ĐANG CHẶT (treChop, lặp): frame 1–13 — nông dân đứng → giơ rìu →',
  '              vung (lưỡi lam) → BỔ TRÚNG (mảnh gỗ văng) → lá bay; 80ms/frame;',
  '           ② TẢI XONG → .is-fall (treFall, chạy 1 lần — 700ms = TRE_TIMING.fall):',
  '              frame 14–18 — tre GÃY đổ sang PHẢI (NGƯỢC phía người đứng chặt',
  '              bên trái) → bụi mù → gốc cây + bột trắng, giữ frame cuối; sau',
  '              TRE_TIMING.fall → .is-gone mờ dần. LỖI (ok=false) → chỉ .is-gone,',
  '              tre KHÔNG gãy. 700ms trong CSS phải ĐỒNG BỘ TRE_TIMING.fall',
  '              trong js/loading.js (test D5 đang fallback đúng mốc này). */',
];
lines.splice(i, j - i + 1, ...nw);
fs.writeFileSync(P, lines.join('\n'));
console.log('Đã thay dòng', i + 1, '→', j + 1, 'bằng', nw.length, 'dòng mới');
