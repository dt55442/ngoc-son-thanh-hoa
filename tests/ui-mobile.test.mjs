// tests/ui-mobile.test.mjs — HEADER MOBILE + NÚT THU GỌN ICON + MENU ⋮ CUỘN ĐƯỢC
// (19/10/2026): tên nhà máy xuống 2 dòng cân đối ≤540px · nút thu gọn Bảng bố
// trí chỉ còn icon · menu ⋮ giữ đủ 20 chức năng nhưng có nhãn nhóm, cuộn được
// (desktop = dropdown, điện thoại = bottom sheet nằm trên thanh nav dưới).
'use strict';
import fs from 'node:fs';

const idx = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const evSrc = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
const stateSrc = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.error('FAIL ' + name); }
}

// ─── A. HEADER: TÊN NHÀ MÁY XUỐNG 2 DÒNG TRÊN ĐIỆN THOẠI ────────
check('A1. index có thẻ ngắt dòng brand-br giữa "Nhà máy" và "Ngọc Sơn"',
  /<h1>\s*Nhà máy\s*<br class="brand-br">\s*Ngọc Sơn\s*<\/h1>/.test(idx));
check('A2. desktop: .brand-br ẩn (một dòng)', /\.brand-br\s*\{\s*display:\s*none;\s*\}/.test(css));
check('A3. điện thoại ≤540px: .brand-br hiện + line-height cân đối',
  /@media \(max-width: 540px\)\s*\{[\s\S]{0,260}?\.brand-br\s*\{\s*display:\s*inline;\s*\}[\s\S]{0,160}?\.logo-text h1\s*\{\s*line-height:\s*1\.12;\s*\}/.test(css));

// ─── B. NÚT THU GỌN BẢNG BỐ TRÍ = CHỈ ICON ──────────────────────
const boardBtn = (idx.match(/<button[^>]*id="btn-toggle-hr-board"[\s\S]*?<\/button>/) || [''])[0];
check('B1. nút thu gọn bảng bố trí còn tồn tại', !!boardBtn);
check('B2. nút dùng btn-icon (36×36) + có title/aria-label',
  boardBtn.includes('btn-icon') && boardBtn.includes('title="Thu gọn / Mở rộng"')
  && boardBtn.includes('aria-label="Thu gọn / Mở rộng"'));
check('B3. KHÔNG còn chữ "Thu gọn" trong nút (chỉ icon)',
  !boardBtn.includes('Thu gọn</span>') && !/<span>/.test(boardBtn) && boardBtn.includes('chevron-up'));

// ─── C. MENU ⋮: GIỮ ĐỦ CHỨC NĂNG + NHÃN NHÓM ────────────────────
const MENU_IDS = ['btn-sync-now', 'btn-save-local', 'btn-sync-conflicts', 'btn-hard-reload',
  'btn-select-data-folder', 'btn-disconnect-data-folder', 'btn-export-json', 'btn-import-json',
  'file-import-json', 'btn-open-autobackup', 'btn-open-cloud-backup',
  'btn-upload-cloud', 'btn-pull-cloud', 'btn-sync-photos', 'btn-pending-list',
  'btn-open-users-mgr', 'btn-fx-low', 'app-version-row', 'app-version-label', 'btn-logout'];
check('C1. giữ đủ 20 id chức năng (mỗi id đúng 1 lần)',
  MENU_IDS.every(id => (idx.match(new RegExp(`id="${id}"`, 'g')) || []).length === 1));
const menuStart = idx.indexOf('id="header-dropdown"');
const menuEnd = idx.indexOf('</header>', menuStart);
const menu = idx.slice(menuStart, menuEnd);
const labels = (menu.match(/<div class="dropdown-label">([^<]+)<\/div>/g) || [])
  .map(x => x.replace(/<[^>]+>/g, '').trim());
check('C2. 4 nhãn nhóm đúng thứ tự (Thường dùng → Dữ liệu & sao lưu → Đồng bộ mây → Khác)',
  labels.length === 4 && labels[0] === 'Thường dùng' && labels[1].indexOf('Dữ liệu') === 0
  && labels[2] === 'Đồng bộ mây' && labels[3] === 'Khác');
check('C3. mục thường dùng nằm trong nhóm 1 (trước nhãn "Dữ liệu")',
  menu.indexOf('id="btn-sync-now"') < menu.indexOf('Dữ liệu &amp; sao lưu')
  && menu.indexOf('id="btn-save-local"') < menu.indexOf('Dữ liệu &amp; sao lưu'));
check('C4. Đăng Xuất nằm CUỐI menu (sau nhãn "Khác")',
  menu.indexOf('id="btn-logout"') > menu.indexOf('Khác'));
check('C5. mục điều kiện vẫn giữ display:none (Ngắt kết nối / phục hồi tự động / bản cất mây)',
  /id="btn-disconnect-data-folder"[^>]*style="display:none;"/.test(menu)
  && /id="btn-open-autobackup"[^>]*style="display:none;"/.test(menu)
  && /id="btn-open-cloud-backup"[^>]*style="display:none;"/.test(menu));

// ─── D. CSS: MENU CUỘN ĐƯỢC + BOTTOM SHEET ─────────────────────
check('D1. menu có max-height + overflow-y auto + overscroll chứa',
  /\.dropdown-menu\s*\{[\s\S]{0,420}?max-height:\s*calc\(100dvh - 90px\);[\s\S]{0,220}?overflow-y:\s*auto;[\s\S]{0,220}?overscroll-behavior:\s*contain;/.test(css));
check('D2. có fallback 100vh cho trình duyệt cũ',
  /@supports not \(height: 100dvh\)[\s\S]{0,160}?max-height:\s*calc\(100vh - 90px\)/.test(css));
check('D3. điện thoại: bottom sheet fixed, nằm TRÊN thanh nav',
  /@media \(max-width: 640px\)\s*\{[\s\S]{0,400}?\.dropdown-menu\s*\{[\s\S]{0,420}?position:\s*fixed;[\s\S]{0,260}?bottom:\s*calc\(64px \+ env\(safe-area-inset-bottom, 0px\)\);[\s\S]{0,220}?max-height:\s*74dvh;/.test(css));
check('D4. bottom sheet có tay nắm + animation + item cao ≥44px',
  /\.dropdown-menu::before\s*\{[\s\S]{0,260}?height:\s*4px;/.test(css)
  && css.includes('@keyframes ddSheetUp')
  && /\.dropdown-item\s*\{\s*min-height:\s*44px;/.test(css));
check('D5. tôn trọng giảm hiệu ứng + ẩn khi in',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,160}?\.dropdown-menu\s*\{\s*animation:\s*none/.test(css)
  && /@media print\s*\{[\s\S]{0,120}?\.dropdown-menu\s*\{\s*display:\s*none/.test(css));

// ─── E. WIRING + PHIÊN BẢN ──────────────────────────────────────
check('E1. events giữ menu mở khi bấm vùng trống/nhãn nhóm (chỉ item mới đóng)',
  /dropdown\.addEventListener\('click'[\s\S]{0,220}?closest\('\.dropdown-item'\)[\s\S]{0,80}?stopPropagation\(\)/.test(evSrc));
check('E2. sw.js cache v295', swSrc.includes('nha-may-ngoc-son-v308'));
check('E3. APP_VERSION v308', stateSrc.includes("APP_VERSION = 'v308'"));

console.log(`\nUI-MOBILE: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
