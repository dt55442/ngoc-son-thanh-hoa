'use strict';
const fs = require('fs');
let s = fs.readFileSync('js/xuong2.js', 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
function repOnce(o, n, label) {
  const oo = o.split('\n').join(nl), nn = n.split('\n').join(nl);
  const c = s.split(oo).length - 1;
  if (c !== 1) throw new Error('[' + label + '] khop ' + c + ' lan');
  s = s.split(oo).join(nn);
  console.log('OK', label);
}
repOnce(
"      cur.lots.push({ code: l.code, location: l.location, vol: l.vol, part: false });\n    });\n    if (cur.vol > 1e-9) charges.push(cur);\n    return charges;",
"      cur.lots.push({ id: l.id, code: l.code, location: l.location, vol: l.vol, part: false, type: l.type });\n    });\n    if (cur.vol > 1e-9) charges.push(cur);\n    charges.forEach(sayChargeEnrich);\n    return charges;",
"auto group type+enrich");
repOnce(
"      return charges.filter(c => c.vol > 1e-9);",
"      charges.forEach(sayChargeEnrich);\n      return charges.filter(c => c.vol > 1e-9);",
"manual branch enrich");
repOnce(
"    c.useFor = c.volBullig > c.volVan ? 'bullig' : 'van';\n    return c;\n  }",
"    c.useFor = c.volBullig > c.volVan ? 'bullig' : 'van';\n    return c;\n  }\n  // Bổ sung LOẠI + thể tích theo loại cho 1 lần (dùng cho cả nhánh điền tay & lô cũ)\n  function sayChargeEnrich(c) {\n    c.volVan = 0; c.volBullig = 0;\n    (c.lots || []).forEach(l => {\n      if (l.type === 'bullig') c.volBullig += l.vol; else c.volVan += l.vol;\n    });\n    c.useFor = c.volBullig > c.volVan ? 'bullig' : 'van';\n    return c;\n  }",
"them sayChargeEnrich");
fs.writeFileSync('js/xuong2.js', s, 'utf8');
console.log('FIX4 XONG');
