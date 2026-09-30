'use strict';
const fs = require('fs');
let s = fs.readFileSync('js/xuong2.js', 'utf8');
function rep(re, to, label) {
  const m = s.match(re);
  if (!m) throw new Error('xuong2 :: [' + label + '] khong khop');
  const n = s.match(new RegExp(re.source, 'g')).length;
  if (n !== 1) throw new Error('xuong2 :: [' + label + '] khop ' + n + ' lan');
  s = s.replace(re, to);
  console.log('OK', label);
}
rep(/  renderX2SayStats,(\r?\n)  renderX2SayStats,/, '  renderX2SayStats,', 'dup renderX2SayStats');
rep(/  sayBatchChargeLabel,(\r?\n)  sayM3PerCharge,/, '  sayBatchChargeLabel,', 'dup sayM3PerCharge');
rep(/  \/\/   Lần N \| Vị Trí \| Thành phần \(Ván\/Bullig m³\) \| m³ \| Phút \| Giờ Cần \| Giờ HC \| Giờ TC(\r?\n)  \/\/   Lần N \| Vị Trí \| Lô \| m³ \| Phút \| Giờ Cần \| Giờ HC \| Giờ TC \| Hiệu Suất/,
  '  //   Lần N | Vị Trí | Thành phần (Ván/Bullig m³) | m³ | Phút | Giờ Cần | Giờ HC | Giờ TC', 'dup comment cot');
fs.writeFileSync('js/xuong2.js', s, 'utf8');
// kanban.js — chèn định nghĩa chip sau khối pickHtml (giu nguyên kiểu kết thúc dòng của vùng)
let k = fs.readFileSync('js/kanban.js', 'utf8');
const re = /        <span>Chọn<\/span>(\r?\n)      <\/label>`;/;
const m = k.match(re);
if (!m || k.match(new RegExp(re.source, 'g')).length !== 1) throw new Error('kanban anchor');
const nl = m[1];
const chunk = [
  '    // Chip "LẦN THAN HÓA" (CHỈ ĐỌC) — lần vào công đoạn SẤY gần nhất của lô, lấy',
  '    // qua window.app.x2SayChargeLabel (logic ở js/xuong2.js); lô cũ không có mã',
  '    // mẻ hoặc chưa qua sấy → không hiện chip.',
  "    const thLabel = (typeof window !== 'undefined' && window.app && typeof window.app.x2SayChargeLabel === 'function') ? window.app.x2SayChargeLabel(batch) : '';",
  '    const thChip = thLabel ? `<span class="tag-badge tag-say-charge" title="Lô thuộc lần than hóa này (mã mẻ gắn lúc bấm Lưu của Thêm Lô Sấy Mới)"><i data-lucide="flame" style="width:10px;height:10px;"></i> ${escapeHTML(thLabel)}</span>` : \'\';'
].join(nl);
k = k.replace(re, (mm, nn) => mm + nl + chunk);
fs.writeFileSync('js/kanban.js', k, 'utf8');
console.log('OK kanban chip');
