'use strict';
const fs = require('fs');
const read = f => fs.readFileSync('tmp-edits/' + f, 'utf8');
function norm(rel, txt) {
  const s = fs.readFileSync(rel, 'utf8');
  return s.includes('\r\n') ? txt.replace(/\n/g, '\r\n') : txt;
}
function cutReplace(rel, startMark, endMark, chunkFile, label) {
  let s = fs.readFileSync(rel, 'utf8');
  const sm = norm(rel, startMark), em = norm(rel, endMark);
  const a = s.indexOf(sm);
  if (a < 0) throw new Error(rel + ' :: [' + label + '] khong thay DAU');
  const b = s.indexOf(em, a);
  if (b < 0) throw new Error(rel + ' :: [' + label + '] khong thay CUOI');
  s = s.slice(0, a) + norm(rel, read(chunkFile)) + s.slice(b);
  fs.writeFileSync(rel, s, 'utf8');
  console.log('OK-cut', rel, '::', label);
}
function insertBefore(rel, mark, chunkFile, label) {
  let s = fs.readFileSync(rel, 'utf8');
  const m = norm(rel, mark);
  const a = s.indexOf(m);
  if (a < 0) throw new Error(rel + ' :: [' + label + '] khong thay MOC');
  s = s.slice(0, a) + norm(rel, read(chunkFile)) + s.slice(a);
  fs.writeFileSync(rel, s, 'utf8');
  console.log('OK-ins', rel, '::', label);
}
// xuong2: thay block handleX2SayRateSave + renderX2SayRateBar bằng POPUP handlers
cutReplace('js/xuong2.js',
  '  // Lưu định mức 1 LẦN than hóa cho công đoạn + tháng đang chọn (PHÚT/lần + m³/lần)',
  '  // ─── SỐ LIỆU SẤY THEO NGÀY (m³ vào Sấy 1 / Sấy 2 + giờ than hóa) ───',
  'n4.txt', 'popup handlers');
// xuong2: chèn sayChargeCompText trướcmarker "Dựng danh sách LẦN"
insertBefore('js/xuong2.js', '  // Dựng danh sách LẦN than hóa của 1 nhóm', 'n9.txt', 'sayChargeCompText');
// xuong2: chèn sayBatchChargeLabel trước comment "Bảng thống kê than hóa"
insertBefore('js/xuong2.js', '  // Bảng thống kê than hóa: mỗi NGÀY 1 dòng đầu', 'n13.txt', 'sayBatchChargeLabel');
// xuong2: renderX2SayRateBar -> renderX2SayRateChip (trong renderX2SayStats)
cutReplace('js/xuong2.js', '    renderX2SayRateBar();\n    renderKilnBoard();', '    renderKilnBoard();', 'n11a.txt', 'stats goi chip');
// xuong2: comment cột Lô -> Thành phần
cutReplace('js/xuong2.js', '  //   Lần N | Vị Trí | Lô | m³ | Phút | Giờ Cần | Giờ HC | Giờ TC | Hiệu Suất\n', '  //   Lần N |', 'n11b.txt', 'comment cot');
// xuong2: exports
cutReplace('js/xuong2.js', '  loadX2SayRates,\n  handleX2SayRateSave,\n  renderX2SayRateBar,\n  renderX2SayStats,', '  renderX2SayStats,', 'n12a.txt', 'exports nhom 1');
cutReplace('js/xuong2.js', '  sayRateEntryOf,\n  sayMinutesPerCharge,\n  sayM3PerCharge,', '  sayM3PerCharge,', 'n12b.txt', 'exports nhom 2');
console.log('APPLY1B-XUONG2 XONG');
