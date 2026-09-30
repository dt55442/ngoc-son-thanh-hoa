'use strict';
const fs = require('fs');
const read = f => fs.readFileSync('tmp-edits/' + f, 'utf8');
function normOf(rel, txt) {
  const s = fs.readFileSync(rel, 'utf8');
  return s.includes('\r\n') ? txt.replace(/\n/g, '\r\n') : txt;
}
function repOnce(rel, oldTxt, newTxt, label) {
  let s = fs.readFileSync(rel, 'utf8');
  const o = normOf(rel, oldTxt), n = normOf(rel, newTxt);
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
// ── index.html ──
repOnce('index.html', read('o-toolbar.txt'), read('n-toolbar.txt'), 'toolbar inline pick');
repOnce('index.html', read('o-rate-bar.html'), read('n-rate-line.html'), 'rate bar -> rate line');
insertBefore('index.html', '  <!-- ═══ THANH NỔI "XÓA NHIỀU LÔ"', 'n-modal.html', 'popup dinh muc');
repOnce('index.html', '<th>Lô</th>', '<th>Thành phần</th>', 'thead Lo -> Thanh phan');
repOnce('index.html', read('o-note.html'), read('n-note.html'), 'ghi chu say-note');
// ── styles.css — nối khối mới ở CUỐI file ──
{
  let css = fs.readFileSync('styles.css', 'utf8');
  if (!css.endsWith('\n')) css += '\n';
  css += normOf('styles.css', read('n-css.txt'));
  fs.writeFileSync('styles.css', css, 'utf8');
  console.log('OK-app styles.css');
}
// ── js/events.js ──
repOnce('js/events.js', read('o-import-ev.txt'), read('n-import-ev.txt'), 'import xuong2');
repOnce('js/events.js', read('o-wire.txt'), read('n-wire.txt'), 'wire popup dinh muc');
repOnce('js/events.js', read('o-multidel.txt'), read('n-multidel.txt'), 'btn-multi-delete tu chuyen khung');
repOnce('js/events.js', read('o-cancel.txt'), read('n-cancel.txt'), 'wire inline pick');
{
  // gỡ chip delegation cũ (data-x2-say-rate)
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
console.log('APPLY2 XONG');
