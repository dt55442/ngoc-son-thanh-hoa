'use strict';
const fs = require('fs');
const read = f => fs.readFileSync('tmp-edits/' + f, 'utf8');
function normOf(rel, txt) {
  const s = fs.readFileSync(rel, 'utf8');
  return s.includes('\r\n') ? txt.replace(/\n/g, '\r\n') : txt;
}
function cutReplace(rel, startMark, endMark, chunkFile, label) {
  let s = fs.readFileSync(rel, 'utf8');
  const sm = normOf(rel, startMark), em = normOf(rel, endMark);
  const a = s.indexOf(sm);
  if (a < 0) throw new Error(rel + ' :: [' + label + '] khong thay DAU');
  const b = s.indexOf(em, a);
  if (b < 0) throw new Error(rel + ' :: [' + label + '] khong thay CUOI');
  s = s.slice(0, a) + normOf(rel, read(chunkFile)) + s.slice(b);
  fs.writeFileSync(rel, s, 'utf8');
  console.log('OK-cut', rel, '::', label);
}
function repOnce(rel, oldTxt, newTxt, label) {
  let s = fs.readFileSync(rel, 'utf8');
  const o = normOf(rel, oldTxt), n = normOf(rel, newTxt);
  const c = s.split(o).length - 1;
  if (c !== 1) throw new Error(rel + ' :: [' + label + '] tim ' + c + ' lan');
  fs.writeFileSync(rel, s.split(o).join(n), 'utf8');
  console.log('OK-rep', rel, '::', label);
}
// capacity.js — nhãn định mức 2 loại
cutReplace('js/capacity.js',
  '  // Nhãn định mức 1 lần than hóa theo các tháng có mặt',
  '  // ─── GỘP DỮ LIỆU THEO TUẦN',
  'n-cap.txt', 'capSayRateTextOf');
// main.js — import + window.app
repOnce('js/main.js', 'loadX2SayIncidents, loadX2SayRates, loadX2SayTimes,',
  'loadX2SayIncidents, loadX2SayRates, loadX2SayTimes, sayBatchChargeLabel,', 'main import');
repOnce('js/main.js', '    deleteBatch,', '    deleteBatch,\n    x2SayChargeLabel,', 'main app expose');
// kanban.js — chip lần than hóa trên thẻ
repOnce('js/kanban.js',
  '        <span class="tag-badge tag-use-' + '${batch.useFor}' + '">${escapeHTML(batch.useFor)}</span>',
  '        <span class="tag-badge tag-use-' + '${batch.useFor}' + '">${escapeHTML(batch.useFor)}</span>\n        ' + '${thChip}', 'kanban chip the');
repOnce('js/kanban.js', '      </label>`;',
  '      </label>`;\n    // Chip "LẦN THAN HÓA" (CHỈ ĐỌC) — lần vào công đoạn SẤY gần nhất của lô, lấy\n    // qua window.app.x2SayChargeLabel (logic ở js/xuong2.js); lô cũ không có mã\n    // mẻ hoặc chưa qua sấy → không hiện chip.\n    const thLabel = (typeof window !== \'undefined\' && window.app && typeof window.app.x2SayChargeLabel === \'function\') ? window.app.x2SayChargeLabel(batch) : \'\';\n    const thChip = thLabel ? `<span class="tag-badge tag-say-charge" title="Lô thuộc lần than hóa này (mã mẻ gắn lúc bấm Lưu của Thêm Lô Sấy Mới)"><i data-lucide="flame" style="width:10px;height:10px;"></i> ' + '${escapeHTML(thLabel)}</span>` : \'\';', 'kanban tinh chip');
// batch-modals.js — đếm đồng bộ lên nút inline
repOnce('js/batch-modals.js', '    const btn = document.getElementById(\'kb-pick-del\');\n    if (btn) btn.disabled = n === 0;', read('n-bm.txt'), 'bm sync inline');
console.log('APPLY1C XONG');
