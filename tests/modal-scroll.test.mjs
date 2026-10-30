// tests/modal-scroll.test.mjs — CHUẨN MODAL & BẢNG RỘNG (20/10/2026)
// Mục đích: chặn tái phát lỗi "phải kéo xuống CUỐI mới thấy thanh cuộn ngang"
// và "cuộn ngang xong quên mất dòng đó là ai" ở các pop-up/form/bảng lớn.
//   A. Vỏ modal: tiêu đề + thanh nút DÍNH ở MỌI kích thước màn hình.
//   B. Bảng trong modal: khung cuộn riêng (thanh ngang trong tầm mắt) + thead dính.
//   C. Cột nhận diện dính TRÁI (.tbl-pin1 / .tbl-pin2) + nền đúng sắc dòng.
//   D. Modal chứa bảng rộng hơn (.modal-wide / .modal-lg) + class đã gắn đúng.
//   E. Điện thoại: modal lớn = bottom sheet (trừ .modal-sm và 3 shell chi tiết).
//   F. Cấu trúc CSS: selector ở cấp cao nhất, ngoặc cân bằng, không phá khối cũ.
//   G. Phiên bản: sw.js CACHE_NAME khớp APP_VERSION trong state.js.
'use strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const idx = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const stSrc = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const incSrc = fs.readFileSync(new URL('../js/x2-incidents.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.error('FAIL ' + name); }
}

// Độ sâu ngoặc tại vị trí selector (0 = cấp cao nhất, >0 = nằm trong @media/khối khác)
function depthAt(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) return -1;
  let d = 0;
  for (let k = 0; k < i; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') d--;
  }
  return d;
}

// ─── A. VỎ MODAL: TIÊU ĐỀ + THANH NÚT DÍNH (mọi kích thước) ─────
check('A1. `.modal-card > .modal-header` khai ở CẤP CAO NHẤT (không nằm trong @media)',
  depthAt(css, '.modal-card > .modal-header {') === 0);
check('A2. header modal dùng position sticky + top 0',
  /\.modal-card > \.modal-header \{\s*position:\s*sticky;\s*top:\s*0;/.test(css));
check('A3. `.modal-footer` sticky ở CẤP CAO NHẤT (trước đây chỉ có trong @media ≤540/≤639)',
  /\.modal-card > \.modal-footer,\s*\n\.modal-footer \{\s*position:\s*sticky;\s*bottom:\s*0;/.test(css) &&
  depthAt(css, '.modal-card > .modal-footer,') === 0);
check('A4. có rule theme thắng `position: relative` (modal .hud-frame vẫn dính)',
  /body\[data-theme="night"\] \.modal-card > \.modal-header,\s*\nbody\[data-theme="night"\] \.modal-card > \.modal-footer \{\s*position:\s*sticky;/.test(css));
check('A5. rule `body[data-theme="night"] .hud-frame > *` vẫn còn (đã có rule thắng ở A4)',
  css.includes('body[data-theme="night"] .hud-frame > *'));

// ─── B. BẢNG TRONG MODAL: KHUNG CUỘN RIÊNG + THEAD DÍNH ─────────
check('B1. bảng trong modal có max-height + overflow auto (thanh ngang trong tầm mắt)',
  /\.modal-card \.table-responsive:not\(\.table-scroll\):not\(\.hr-table-scroll\) \{\s*max-height:\s*min\(55dvh, 480px\);\s*overflow:\s*auto;/.test(css));
check('B2. bảng trong modal có thead sticky (luôn biết đang xem cột nào)',
  /\.modal-card \.table-responsive:not\(\.table-scroll\):not\(\.hr-table-scroll\) thead th \{\s*position:\s*sticky;\s*top:\s*0;/.test(css));
check('B3. miễn trừ `.table-scroll` / `.hr-table-scroll` (đã có chuẩn riêng 60vh)',
  css.includes(':not(.table-scroll):not(.hr-table-scroll)'));

// ─── C. CỘT NHẬN DIỆN DÍNH TRÁI ─────────────────────────────────
check('C1. `.tbl-pin1` dùng border-collapse separate (không mất viền ô dính)',
  /\.tbl-pin1,\s*\n\.tbl-pin2 \{\s*border-collapse:\s*separate;\s*border-spacing:\s*0;/.test(css));
check('C2. ô dính dùng position sticky + left 0 + nền đục + bóng phải',
  /\.tbl-pin1 th:first-child,[\s\S]{0,220}?position:\s*sticky;\s*left:\s*0;[\s\S]{0,120}?background:\s*#fffdf6;[\s\S]{0,80}?box-shadow:\s*1px 0 0/.test(css));
check('C3. ô tiêu đề dính có z-index cao hơn ô dữ liệu (không bị cột khác đè)',
  /\.tbl-pin1 thead th:first-child,\s*\n\.tbl-pin2 thead th:nth-child\(2\) \{\s*z-index:\s*6;/.test(css));
check('C4. Tre Sáng: dòng CHẴN giữ sắc nền khi cột bị dính',
  /body\[data-theme="night"\] \.tbl-pin1 tbody tr:nth-child\(even\) td:first-child/.test(css));
check('C5. Tre Sáng: rê chuột giữ sắc nền khi cột bị dính',
  /body\[data-theme="night"\] \.tbl-pin1 tbody tr:hover td:first-child/.test(css));
check('C6. có biến thể `.tbl-pin2` cho bảng có cột checkbox ở đầu',
  css.includes('.tbl-pin2 td:nth-child(2)') && css.includes('.tbl-pin2 thead th:nth-child(2)'));

// ─── D. MODAL RỘNG HƠN + CLASS ĐÃ GẮN ───────────────────────────
check('D1. `.modal-card.modal-wide` = min(1180px, 96vw)',
  /\.modal-card\.modal-wide \{ max-width: min\(1180px, 96vw\); \}/.test(css));
check('D2. `.modal-card.modal-lg` = min(980px, 96vw) (class trước đây KHÔNG có CSS)',
  /\.modal-card\.modal-lg \{ max-width: min\(980px, 96vw\); \}/.test(css));

check('D3. #modal-users-mgr (modal trong ảnh báo lỗi) dùng modal-wide',
  /id="modal-users-mgr"[\s\S]{0,200}?modal-card modal-wide/.test(idx));
check('D4. Bảng Người Dùng bọc `.table-scroll` + cột 1 dính trái (tbl-pin1)',
  /table-responsive table-scroll">\s*\n\s*<table class="data-table tbl-pin1">\s*\n\s*<thead>\s*\n\s*<tr>\s*\n\s*<th>Họ và Tên<\/th>/.test(idx));
check('D5. #modal-ci-endfill dùng modal-wide (bỏ inline 1000px)',
  /id="modal-ci-endfill"[\s\S]{0,160}?modal-card modal-wide/.test(idx) &&
  !idx.includes('style="max-width: 1000px;"'));
check('D6. Bảng "Tự điền giờ kết thúc" dính 2 cột (Chọn + Nhân Viên)',
  idx.includes('class="data-table tbl-pin2" id="ci-endfill-table"'));
check('D7. #modal-matrix-trace dùng modal-wide (bỏ inline 760px)',
  /id="modal-matrix-trace"[\s\S]{0,160}?modal-card modal-wide/.test(idx) &&
  !idx.includes('style="max-width:760px; width:94vw;"'));
check('D8. Bảng chi tiết ma trận dính cột Tuần (tbl-pin1)',
  idx.includes('class="data-table planning-table tbl-pin1" id="matrix-trace-table"'));
check('D9. Bảng công nhân ép dính 2 cột (# + Họ Tên)',
  idx.includes('class="data-table tbl-pin2" id="press-workers-table"'));
check('D10. Modal Lịch Sử dùng modal-lg',
  idx.includes('class="modal-card modal-history-card hud-frame modal-lg"'));
check('D11. Bảng Sự cố (sinh bằng JS) dính cột Công đoạn',
  incSrc.includes('<table class="inc-table tbl-pin1">'));
const PIN1_TABLES = ['planning-matrix-table', 'supplier-table',
  'hr-employees-table', 'hr-leaves-table', 'hr-att-stats-table', 'hr-recruit-table'];
check('D12. 6 bảng rộng ngoài modal có tbl-pin1',
  PIN1_TABLES.every((id) => new RegExp('tbl-pin1" id="' + id + '"').test(idx)));
check('D13. Bảng Nguyên Liệu dính cột NGÀY (cột 1 là Ảnh nên dùng tbl-pin2)',
  idx.includes('class="data-table tbl-pin2" id="material-table"'));

// ─── E. ĐIỆN THOẠI: MODAL LỚN = BOTTOM SHEET ────────────────────
check('E1. overlay dồn modal xuống đáy (align-items flex-end, padding 0) trong @media ≤639.98px',
  /@media \(max-width: 639\.98px\) \{\s*\/\* Khung phủ: dồn modal xuống ĐÁY màn hình \*\/\s*\.modal-overlay\.show \{ align-items: flex-end; padding: 0; \}/.test(css));
check('E2. modal lớn: rộng 100% + max-height 92dvh + animation sheetUp',
  /\.modal-card:not\(\.modal-sm\):not\(\.x2-detail-modal\):not\(\.qc-detail-modal\):not\(\.hr-detail-modal\) \{\s*position:\s*relative;\s*width:\s*100%;\s*max-width:\s*100% !important;\s*max-height:\s*92dvh;\s*border-radius:\s*18px 18px 0 0;\s*animation:\s*sheetUp/.test(css));
check('E3. `.modal-sm` (hộp xác nhận nhỏ) KHÔNG bị đổi thành sheet',
  css.includes('.modal-card:not(.modal-sm):not(.x2-detail-modal)'));
check('E4. 3 shell pop-up thẻ chi tiết được loại trừ (đã có khối "CHỈ GIỮ 1 KHUNG")',
  css.includes(':not(.x2-detail-modal):not(.qc-detail-modal):not(.hr-detail-modal)'));
check('E5. có tay nắm ::before (content rỗng + thanh 44×4px)',
  /::before \{\s*content:\s*"";[\s\S]{0,200}?width:\s*44px; height:\s*4px;/.test(css));
check('E6. @keyframes sheetUp tồn tại (trượt từ dưới lên)',
  /@keyframes sheetUp \{\s*from \{ transform: translateY\(28px\); opacity: 0\.65; \}[\s\S]{0,80}?to\s*\{ transform: translateY\(0\);\s*opacity: 1; \}\s*\}/.test(css));
check('E7. "Giảm Hiệu Ứng" tắt animation của sheet',
  /body\[data-fx="low"\] \.modal-card \{ animation: none; \}/.test(css));
check('E8. khung tre trên điện thoại hạ về 14px (thêm ~16px bề ngang cho bảng)',
  /body\[data-theme="night"\] \.modal-card \{\s*border-width:\s*14px !important;\s*border-image-width:\s*14px !important;/.test(css));
check('E9. thanh nút chừa vạch home iPhone (safe-area-inset-bottom)',
  /\.modal-footer \{ padding-bottom: calc\(12px \+ env\(safe-area-inset-bottom, 0px\)\); \}/.test(css));

// ─── F. CẤU TRÚC CSS ────────────────────────────────────────────
check('F1. `.tbl-pin1` khai ở cấp cao nhất', depthAt(css, '.tbl-pin1,') === 0);
check('F2. `.modal-card.modal-wide` khai ở cấp cao nhất', depthAt(css, '.modal-card.modal-wide {') === 0);
check('F3. ngoặc styles.css cân bằng', (function () {
  let d = 0;
  for (const ch of css) { if (ch === '{') d++; else if (ch === '}') d--; }
  return d === 0;
})());
check('F4. KHÔNG phá khối CSS cũ `#modal-add-lot .modal-card` (test than-hoa phụ thuộc)',
  css.includes('#modal-add-lot .modal-card') && css.includes('#modal-transfer-kho .modal-card'));
check('F5. vẫn giữ khung cuộn dùng chung `.table-scroll, .hr-table-scroll` 60vh + thead sticky',
  /\.table-scroll,\s*\n\.hr-table-scroll \{\s*max-height:\s*60vh;/.test(css));

// ─── G. PHIÊN BẢN ───────────────────────────────────────────────
const swVer = (swSrc.match(/CACHE_NAME = 'nha-may-ngoc-son-(v\d+)'/) || [])[1];
const appVer = (stSrc.match(/APP_VERSION = '(v\d+)'/) || [])[1];
check('G1. sw.js CACHE_NAME = v313 (đã tăng cache)', swVer === 'v323');
check('G2. APP_VERSION trong state.js = CACHE_NAME của sw.js', swVer === appVer);

console.log('\nKẾT QUẢ: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail === 0 ? 0 : 1);

