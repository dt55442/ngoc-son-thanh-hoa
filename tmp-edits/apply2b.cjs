'use strict';
const fs = require('fs');
const read = f => fs.readFileSync('tmp-edits/' + f, 'utf8');
const trim = t => t.replace(/\n+$/, '').replace(/^\n+/, '');
function normOf(rel, txt) {
  const s = fs.readFileSync(rel, 'utf8');
  return s.includes('\r\n') ? txt.replace(/\n/g, '\r\n') : txt;
}
function repOnce(rel, oldTxt, newTxt, label, opts) {
  let s = fs.readFileSync(rel, 'utf8');
  const useTrim = opts && opts.trim;
  const o = normOf(rel, useTrim ? trim(oldTxt) : oldTxt);
  const n = normOf(rel, useTrim ? trim(newTxt) : newTxt);
  const c = s.split(o).length - 1;
  if (c !== 1) throw new Error(rel + ' :: [' + label + '] tim ' + c + ' lan');
  fs.writeFileSync(rel, s.split(o).join(n), 'utf8');
  console.log('OK-rep', rel, '::', label);
}
function insertBefore(rel, mark, chunkFile, label) {
  let s = fs.readFileSync(rel, 'utf8');
  const m = normOf(rel, mark);
  const a = s.indexOf(m);
  if (a < 0) throw new Error(rel + ' :: [' + label + '] khong thay MOC');
  s = s.slice(0, a) + normOf(rel, read(chunkFile)) + s.slice(a);
  fs.writeFileSync(rel, s, 'utf8');
  console.log('OK-ins', rel, '::', label);
}
// 1) index.html — note còn lại (chunk 1 dòng: bỏ \n cuối trước khi so khớp)
repOnce('index.html', read('o-note.html'), read('n-note.html'), 'ghi chu say-note', { trim: true });
// 2) styles.css — nối khối CSS mới ở cuối
{
  let css = fs.readFileSync('styles.css', 'utf8');
  if (!css.endsWith('\n')) css += '\n';
  css += normOf('styles.css', read('n-css.txt'));
  fs.writeFileSync('styles.css', css, 'utf8');
  console.log('OK-app styles.css');
}
// 3) events.js
repOnce('js/events.js', read('o-import-ev.txt'), read('n-import-ev.txt'), 'import xuong2', { trim: true });
repOnce('js/events.js', read('o-wire.txt'), read('n-wire.txt'), 'wire popup dinh muc');
repOnce('js/events.js', read('o-multidel.txt'), read('n-multidel.txt'), 'btn-multi-delete tu chuyen khung');
repOnce('js/events.js', read('o-cancel.txt'), read('n-cancel.txt'), 'wire inline pick');
{
  let s = fs.readFileSync('js/events.js', 'utf8');
  const sm = normOf('js/events.js', '      // Chip tháng đã đặt THỜI GIAN THAN HÓA → nạp công đoạn + tháng vào ô nhập');
  const em = normOf('js/events.js', '      const btinhEdit = e.target.closest');
  const a = s.indexOf(sm);
  if (a < 0) throw new Error('events :: khong thay dau chip block');
  const b = s.indexOf(em, a);
  if (b < 0) throw new Error('events :: khong thay cuoi chip block');
  s = s.slice(0, a) + s.slice(b);
  fs.writeFileSync('js/events.js', s, 'utf8');
  console.log('OK-cut js/events.js :: chip block cu');
}
console.log('APPLY2B XONG');
