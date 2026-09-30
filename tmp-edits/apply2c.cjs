'use strict';
const fs = require('fs');
let s = fs.readFileSync('js/batch-modals.js', 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const o = [
  "    const btn = document.getElementById('kb-pick-del');",
  '    if (btn) btn.disabled = n === 0;'
].join(nl);
const n = [
  "    const btn = document.getElementById('kb-pick-del');",
  '    if (btn) btn.disabled = n === 0;',
  '    // Nhóm nút XÓA NHIỀU ngay trên thanh công cụ (hiện khi đang bật chế độ chọn)',
  "    const cntInline = document.getElementById('kb-pick-inline-count');",
  '    if (cntInline) cntInline.textContent = String(n);',
  "    const btnInline = document.getElementById('kb-pick-inline-del');",
  '    if (btnInline) btnInline.disabled = n === 0;'
].join(nl);
const c = s.split(o).length - 1;
if (c !== 1) throw new Error('batch-modals :: tim ' + c + ' lan');
fs.writeFileSync('js/batch-modals.js', s.split(o).join(n), 'utf8');
console.log('OK batch-modals sync inline');
