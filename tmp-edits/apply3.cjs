'use strict';
const fs = require('fs');
const read = f => fs.readFileSync('tmp-edits/' + f, 'utf8');
let s = fs.readFileSync('tests/than-hoa.test.mjs', 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const conv = t => t.replace(/\n/g, nl);
function repOnce(re, to, label) {
  const all = s.match(new RegExp(re.source, 'g')) || [];
  if (all.length !== 1) throw new Error('than-hoa :: [' + label + '] khop ' + all.length + ' lan');
  s = s.replace(re, to);
  console.log('OK', label);
}
// A) thay kho dinh muc cu
repOnce(/\/\/ Định mức 1 LẦN than hóa theo THÁNG[\s\S]*?\/\/ Vẽ bảng thống kê/,
  conv(read('ta.html')) + '// Vẽ bảng thống kê', 'A kho dinh muc');
// B) chen test render + popup truoc // THU GỌN
repOnce(/\/\/ THU GỌN \/ MỞ LẠI bảng Kanban \(nhớ theo máy\)/,
  conv(read('tb.html')) + nl + '// THU GỌN / MỞ LẠI bảng Kanban (nhớ theo máy)', 'B render + popup');
// C) cau truc index: 3 doi + thong diep
repOnce(/idxHtml\.includes\('id="x2-say-rate-bar"'\) && idxHtml\.includes\('id="x2-say-rate-stage"'\) &&/,
  "idxHtml.includes('id=\"btn-x2-say-rate\"') && idxHtml.includes('id=\"modal-x2-say-rate\"') &&", 'C1');
repOnce(/idxHtml\.includes\('id="x2-say-rate-phut"'\) && idxHtml\.includes\('id="x2-say-rate-m3"'\) &&/,
  "idxHtml.includes('id=\"x2-say-rate-rows\"') && idxHtml.includes('id=\"btn-x2sr-add-month\"') &&", 'C2');
repOnce(/idxHtml\.includes\('btn-x2-say-rate-save'\) &&/,
  "idxHtml.includes('id=\"btn-x2sr-m3-save\"') && idxHtml.includes('m³/lần (lô cũ)') && !idxHtml.includes('id=\"x2-say-rate-bar\"') && idxHtml.includes('<th>Thành phần</th>') &&", 'C3');
repOnce(/bảng theo TỪNG LẦN than hóa \+ định mức phút\/lần \+ m³\/lần \+ nút thu gọn bảng KANBAN/,
  'bảng theo TỪNG LẦN than hóa + NÚT Định mức + POPUP 4 cột phút/lần + m³/lần (lô cũ) + nút thu gọn bảng KANBAN', 'C4 thong diep');
// D) events check
repOnce(/jsEvents\.includes\('btn-x2-say-rate-save'\) &&/,
  "jsEvents.includes('btn-x2-say-rate') && jsEvents.includes('data-x2sr-save') &&", 'D events');
// E) chen check xoa nhieu de thay sau check exitKanbanPickMode
repOnce(/  jsMain\.includes\('exitKanbanPickMode'\)\);/,
  '  jsMain.includes(\'exitKanbanPickMode\'));\n' + conv(read('te.html')), 'E xoa nhieu de thay');
// F) chen chip kanban truoc // ─── N.
repOnce(/\/\/ ─── N\. XÓA NHIỀU LÔ \(ADMIN — chế độ tích chọn trên Kanban\) ────────/,
  conv(read('tf.html')) + '// ─── N. XÓA NHIỀU LÔ (ADMIN — chế độ tích chọn trên Kanban) ────────', 'F chip kanban');
fs.writeFileSync('tests/than-hoa.test.mjs', s, 'utf8');
console.log('APPLY3 TEST XONG');
