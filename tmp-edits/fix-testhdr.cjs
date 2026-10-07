// tmp-edits/fix-testhdr.cjs — thay 4 dòng header mô tả trong tests/loading.test.mjs
const fs = require('fs');
const P = 'tests/loading.test.mjs';
const lines = fs.readFileSync(P, 'utf8').split('\n');
const i = lines.findIndex(s => s.includes('Bao phủ: cấu trúc overlay'));
if (i < 0) { console.error('Không thấy đầu'); process.exit(1); }
let j = i;
while (j < lines.length && !lines[j].includes('stub DOM')) j++;
if (j >= lines.length) { console.error('Không thấy cuối'); process.exit(1); }
const nw = [
  '// Bao phủ: cấu trúc overlay trong index.html (div .tre-scene = SPRITE 18 FRAME',
  '// icons/loading/tre-sprite.png — 6×3 · 640×360, <div> cân bằng, KHÔNG còn SVG),',
  '// CSS 2 pha (treChop frame 1–13 lặp → treFall frame 14–18 gãy đổ sang PHẢI,',
  '// tôn trọng Giảm Hiệu ỨNG), wiring đủ 5 nhóm chỗ chờ (boot · AI · Excel · mây ·',
  '// backup), sw.js v220 + loading.js + sprite vào APP_SHELL, và HÀNH VI refcount',
  '// với stub DOM',
];
lines.splice(i, j - i + 1, ...nw);
fs.writeFileSync(P, lines.join('\n'));
console.log('Đã thay dòng', i + 1, '→', j + 1);
