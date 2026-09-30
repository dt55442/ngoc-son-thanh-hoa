'use strict';
const fs = require('fs');
const read = f => fs.readFileSync('tmp-edits/' + f, 'utf8');
function apply(rel, pairs) {
  let s = fs.readFileSync(rel, 'utf8');
  const crlf = s.includes('\r\n');
  const conv = t => (crlf ? t.replace(/\n/g, '\r\n') : t);
  pairs.forEach(([oldTxtFile, newTxtFile, label]) => {
    const oldTxt = conv(read(oldTxtFile));
    const newTxt = newTxtFile ? conv(read(newTxtFile)) : '';
    const n = s.split(oldTxt).length - 1;
    if (n !== 1) throw new Error(rel + ' :: [' + label + '] tim ' + n + ' lan (mong 1)');
    s = s.split(oldTxt).join(newTxt);
  });
  fs.writeFileSync(rel, s, 'utf8');
  console.log('OK', rel, '(' + pairs.length + ' thay the)');
}
// ── js/xuong2.js ──
apply('js/xuong2.js', [
  ['o1.txt', 'n1.txt', 'SAY_RATE_DEFAULT theo loai'],
  ['o2.txt', 'n2.txt', 'sayRateEntryOf 3 tham so'],
  ['o3.txt', 'n3.txt', 'loadX2SayRates migrate'],
  ['o5.txt', 'n5.txt', 'sayGroupLots them id+type'],
  ['o6.txt', 'n6.txt', 'manual push id+type'],
  ['o7.txt', 'n7.txt', 'sayOneChargeFromLots volVan/Bullig'],
  ['o8.txt', 'n8.txt', 'sayChargeRows phut theo lan'],
  ['o10.txt', 'n10.txt', 'cot Thanh phan']
]);
console.log('APPLY1-PHAN-1 XONG');
