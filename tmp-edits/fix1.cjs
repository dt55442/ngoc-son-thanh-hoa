'use strict';
const fs = require('fs');
function fix(rel, pairs) {
  let s = fs.readFileSync(rel, 'utf8');
  pairs.forEach(([o, n, label]) => {
    const c = s.split(o).length - 1;
    if (c !== 1) throw new Error(rel + ' :: [' + label + '] tim ' + c + ' lan');
    s = s.split(o).join(n);
  });
  fs.writeFileSync(rel, s, 'utf8');
  console.log('FIX OK', rel);
}
fix('js/xuong2.js', [
  ['  renderX2SayStats,\r\n  renderX2SayStats,', '  renderX2SayStats,', 'dup renderX2SayStats'],
  ['  sayBatchChargeLabel,\r\n  sayM3PerCharge,', '  sayBatchChargeLabel,', 'dup sayM3PerCharge'],
  ['  //   Lần N | Vị Trí | Thành phần (Ván/Bullig m³) | m³ | Phút | Giờ Cần | Giờ HC | Giờ TC\r\n  //   Lần N | Vị Trí | Lô | m³ | Phút | Giờ Cần | Giờ HC | Giờ TC | Hiệu Suất',
   '  //   Lần N | Vị Trí | Thành phần (Ván/Bullig m³) | m³ | Phút | Giờ Cần | Giờ HC | Giờ TC', 'dup comment cot']
]);
fix('js/kanban.js', [
  ['        <span>Chọn</span>\r\n      </label>`;',
   '        <span>Chọn</span>\r\n      </label>`;\r\n    // Chip "LẦN THAN HÓA" (CHỈ ĐỌC) — lần vào công đoạn SẤY gần nhất của lô, lấy\r\n    // qua window.app.x2SayChargeLabel (logic ở js/xuong2.js); lô cũ không có mã\r\n    // mẻ hoặc chưa qua sấy → không hiện chip.\r\n    const thLabel = (typeof window !== \'undefined\' && window.app && typeof window.app.x2SayChargeLabel === \'function\') ? window.app.x2SayChargeLabel(batch) : \'\';\r\n    const thChip = thLabel ? `<span class="tag-badge tag-say-charge" title="Lô thuộc lần than hóa này (mã mẻ gắn lúc bấm Lưu của Thêm Lô Sấy Mới)"><i data-lucide="flame" style="width:10px;height:10px;"></i> ${escapeHTML(thLabel)}</span>` : \'\';',
   'kanban dinh nghia chip']
]);
console.log('FIX1 XONG');
