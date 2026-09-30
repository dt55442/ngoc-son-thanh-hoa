'use strict';
const fs = require('fs');
let s = fs.readFileSync('js/xuong2.js', 'utf8');
function rep(re, to, label) {
  const all = s.match(new RegExp(re.source, 'g')) || [];
  if (all.length !== 1) throw new Error('[' + label + '] khop ' + all.length + ' lan');
  s = s.replace(re, to);
  console.log('OK', label);
}
// a) auto-group: them id + type vao lot
rep(/cur\.lots\.push\(\{ code: l\.code, location: l\.location, vol: l\.vol, part: false \}\);/,
  'cur.lots.push({ id: l.id, code: l.code, location: l.location, vol: l.vol, part: false, type: l.type });',
  'auto push id+type');
// b) auto-group: enrich truoc khi tra ve
rep(/if \(cur\.vol > 1e-9\) charges\.push\(cur\);(\r?\n)    return charges;/,
  'if (cur.vol > 1e-9) charges.push(cur);$1    charges.forEach(sayChargeEnrich);$1    return charges;',
  'auto enrich');
// c) manual branch: enrich truoc khi loc
rep(/return charges\.filter\(c => c\.vol > 1e-9\);/,
  'charges.forEach(sayChargeEnrich);\n      return charges.filter(c => c.vol > 1e-9);',
  'manual enrich');
// d) them helper sayChargeEnrich sau sayOneChargeFromLots
rep(/    c\.useFor = c\.volBullig > c\.volVan \? 'bullig' : 'van';(\r?\n)    return c;(\r?\n)  \}/,
  "    c.useFor = c.volBullig > c.volVan ? 'bullig' : 'van';$1    return c;$2  }$2  // Bổ sung LOẠI + thể tích theo loại cho 1 lần (dùng cho cả nhánh điền tay & lô cũ)$2  function sayChargeEnrich(c) {$2    c.volVan = 0; c.volBullig = 0;$2    (c.lots || []).forEach(l => {$2      if (l.type === 'bullig') c.volBullig += l.vol; else c.volVan += l.vol;$2    });$2    c.useFor = c.volBullig > c.volVan ? 'bullig' : 'van';$2    return c;$2  }",
  'them sayChargeEnrich');
fs.writeFileSync('js/xuong2.js', s, 'utf8');
console.log('FIX4B XONG');
