// tests/x2-zone3.test.mjs — VÙNG 3 "LỊCH SỬ THEO NGÀY" (22/10/2026)
// • Không thụt lề trái/phải; khung lịch sử 1 TRỤC CUỘN (ngang) trên điện thoại
// • Nút ‹ › trượt ngang (xuong2.setupHistoryHScroll)
// • Cờ Công suất / Hiệu suất gắn đúng chỗ, KHÔNG gắn nhầm Đạt/Lỗi/Chờ QC
import fs from 'node:fs';

const x2 = fs.readFileSync('js/xuong2.js', 'utf8');
const pr = fs.readFileSync('js/press.js', 'utf8');
const ut = fs.readFileSync('js/utils.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const idx = fs.readFileSync('index.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');

let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ FAIL: ' + n); } };
const count = (s, sub) => s.split(sub).length - 1;

console.log('--- A. Cờ Công suất / Hiệu suất ---');
check('A1: xuong2 có ≥ 14 chỗ Công suất (see.perf.cap)', count(x2, 'data-flag-show="see.perf.cap"') >= 14);
check('A2: xuong2 có ≥ 10 chỗ Hiệu suất (see.perf.eff)', count(x2, 'data-flag-show="see.perf.eff"') >= 10);
check('A3: Ép Ván (press.js) có cả 2 cờ', count(pr, 'data-flag-show="see.perf.cap"') >= 2 && count(pr, 'data-flag-show="see.perf.eff"') >= 2);
check('A4: khối "Theo ca" (utils) có C.suất + H.suất', ut.includes('class="x2-shift-cap" data-flag-show="see.perf.cap"')
  && ut.includes('class="x2-shift-eff" data-flag-show="see.perf.eff"'));
check('A5: nhãn "So ca kia" bị ẩn cùng Hiệu suất', x2.includes('class="x2-shift-cmp ${cmp.better ? \'better\' : \'worse\'}" data-flag-show="see.perf.eff"'));
check('A6: KHÔNG gắn cờ vào "Đạt" / "Lỗi" / "Chờ QC"',
  !x2.includes('Đạt: <strong>${fmtThanh(tOk)}') || !x2.includes('data-flag-show="see.perf.eff" title="Tổng thanh ĐẠT'));
check('A7: KHÔNG gắn cờ vào ô "Chờ QC"', !/Chờ QC[^<]*<\/strong><\/span>/.test(x2) || !x2.includes('data-flag-show="see.perf.cap" title="Số thanh của ngày chưa có kết quả QC'));

console.log('--- B. Ô giờ sự cố không nhập tay ---');
check('B1: utils đọc cờ incident-manual', ut.includes("flagOn('incident-manual')"));
check('B2: xuong2 (Than Hóa) đọc cờ incident-manual', x2.includes("flagOn('incident-manual')"));
check('B3: mặc định render số chỉ đọc .x2-inc-val', ut.includes('class="x2-inc-val"') && x2.includes('class="x2-inc-val"'));
check('B4: vẫn còn nút "＋ Báo cáo" trên thẻ ngày', ut.includes('data-inc-new=') && x2.includes('data-inc-new="say|'));
check('B5: số nhập tay cũ vẫn hiện (chip "số cũ")', ut.includes('x2-inc-legacy'));

console.log('--- C. CSS vùng 3 ---');
check('C1: bỏ thụt lề trái/phải cho khung lịch sử', css.includes('.x2-zone[data-zone="3"]:has(> .x2-cut-table-wrap) { padding-top: 6px')
  && css.includes('.x2-zone[data-zone="3"] > .x2-cut-table-wrap,'));
check('C2: thẻ ngày không còn margin 2 bên trong vùng 3', css.includes('.x2-zone[data-zone="3"] .x2-day-card,'));
check('C3: điện thoại BỎ cuộn dọc bên trong khung lịch sử', /\.x2-zone\[data-zone="3"\] \.x2-cut-table-scroll[\s\S]{0,320}max-height: none/.test(css));
check('C4: điện thoại chỉ cuộn NGANG + touch-action', /overflow-x: auto;[\s\S]{0,200}overflow-y: hidden;[\s\S]{0,200}touch-action: pan-x pan-y/.test(css));
check('C5: thẻ ngày đủ rộng (min-width 760px) để bảng không bị bóp', css.includes('min-width: 760px;'));
check('C6: tiêu đề cột xuống dòng trên điện thoại', css.includes('.x2-day-table th { white-space: normal; }'));
check('C7: nút ‹ › có CSS + ẩn khi không tràn', css.includes('.x2-hscroll-nav[hidden] { display: none !important; }')
  && css.includes('.x2-hscroll-btn') && css.includes('.x2-hscroll-btn[disabled]'));
check('C8: nút Thu gọn không đẩy 2 nút ra giữa', css.includes('.x2-cut-table-head:has(.x2-hscroll-nav) .rate-toggle-btn { margin-left: 0; }'));

console.log('--- D. Cấu trúc + nối ---');
check('D1: 25 khung lịch sử dùng chung class', count(idx, 'class="x2-cut-table-scroll"') >= 20);
check('D2: main.js gọi setupHistoryHScroll (boot + chuyển tab)', count(main, 'setupHistoryHScroll()') >= 2);
check('D3: js/xuong2.js có hàm + export', x2.includes('function setupHistoryHScroll') && x2.includes('  setupHistoryHScroll,'));
check('D4: mỗi khung chỉ gắn sự kiện 1 lần (cờ data-hscroll-ready)', x2.includes("el.dataset.hscrollReady !== '1'"));
check('D5: không phá id khung lịch sử cũ', idx.includes('id="x2-day-cards"') && idx.includes('id="x2-cn-day-cards"') && idx.includes('id="x2-epv-day-cards"'));

console.log(`\nKẾT QUẢ: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exitCode = 1;
