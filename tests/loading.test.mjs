// tests/loading.test.mjs — Kiểm thử ICON LOADING "ANH NÔNG DÂN CHẶT TRE" (js/loading.js)
// Bao phủ: cấu trúc overlay trong index.html (div .tre-scene = SPRITE 18 FRAME
// icons/loading/tre-sprite.png — 6×3 · 640×360, <div> cân bằng, KHÔNG còn SVG),
// CSS 2 pha (treChop frame 1–13 lặp → treFall frame 14–18 gãy đổ sang PHẢI,
// tôn trọng Giảm Hiệu ỨNG), wiring đủ 5 nhóm chỗ chờ (boot · AI · Excel · mây ·
// backup), sw.js v220 + loading.js + sprite vào APP_SHELL, và HÀNH VI refcount
// với stub DOM
// (2 show + 1 hide → vẫn hiện; tải xong → is-fall + "Xong rồi!" → is-gone;
// lỗi → không is-fall; mở TAB LẦN ĐẦU → chờ đủ TRE_TIMING.firstTab mới gãy).
'use strict';
import fs from 'node:fs';

const rd = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name); }
}

// ═══ A. CẤU TRÚC ═══════════════════════════════════════════════
console.log('--- A. CẤU TRÚC (index.html + styles.css) ---');
const idx = rd('index.html');
const css = rd('styles.css');
const ldJs = rd('js/loading.js');
const mnJs = rd('js/main.js');
const swJs = rd('sw.js');
const aiJs = rd('js/ai.js');
const xlJs = rd('js/export-xlsx.js');
const clJs = rd('js/cloud.js');
const abJs = rd('js/autobackup.js');

check('A1: overlay #tre-loading-overlay ở ĐẦU <body> (hiện ngay khi mở trang)',
  !!idx.match(/id="tre-loading-overlay"/) && idx.indexOf('id="tre-loading-overlay"') < idx.indexOf('<header class="app-header">'));
check('A2: cảnh = SPRITE div .tre-scene (đã gỡ SVG) + file sprite 18 frame TỒN TẠI',
  idx.includes('<div class="tre-scene"') && !idx.includes('<svg class="tre-scene"') &&
  !idx.includes('tre-stalk') &&
  fs.existsSync(new URL('../icons/loading/tre-sprite.png', import.meta.url)));
check('A3: số <div> cân bằng </div> (không làm vỡ test cấu trúc khác)',
  (idx.match(/<div/g) || []).length === (idx.match(/<\/div>/g) || []).length);
check('A4: có ô nhãn tiếng Việt chờ tải + id tre-loading-text',
  idx.includes('id="tre-loading-text"') && idx.includes('Đang tải dữ liệu nhà máy'));
check('A5: CSS có 2 pha — treChop (frame 1–13, duyệt đủ 3 hàng sprite) + treFall + nền 600% 300%',
  ['@keyframes treChop', '@keyframes treFall'].every(k => css.includes(k)) &&
  css.includes('600% 300%') && css.includes('steps(1)') &&
  /@keyframes treChop[\s\S]{0,1400}?92\.31%/.test(css));
const fallBlock = (css.match(/@keyframes treFall \{[\s\S]*?\n\}/) || [''])[0];
check('A6: GÃY = frame 14–18 (hàng cuối Y=100%) · 700ms steps(1) forwards giữ frame 18 (tre nằm bên PHẢI)',
  css.includes('animation: treFall 700ms steps(1) forwards') &&
  ['20% 100%', '40% 100%', '60% 100%', '80% 100%', '100% 100%'].every(p => fallBlock.includes(p)));
check('A7: khi is-fall — .tre-scene chuyển sang treFall (thắng pha chặt) + overlay z-index trên modal (10050 > 10000)',
  css.includes('.tre-loading.is-fall .tre-scene') && /z-index:\s*10050/.test(css));
check('A8: tôn trọng Giảm Hiệu ỨNG (data-fx="low") + prefers-reduced-motion — tắt vòng lặp chặt, VẪN giữ pha gãy rút ngắn 350ms',
  css.includes('body[data-fx="low"] .tre-scene { animation: none; }') &&
  css.includes('prefers-reduced-motion: reduce') &&
  /body\[data-fx="low"\] \.tre-loading\.is-fall \.tre-scene\s*\{[^}]*treFall 350ms/.test(css) &&
  /prefers-reduced-motion: reduce\)[\s\S]{0,220}?\{[^}]*animation: treFall 350ms/.test(css));
check('A9: KHÔNG dùng class .modal-overlay (không làm khoá cuộn trang nhầm — quy tắc 21)',
  !/class="modal-overlay[^"]*"[^>]*id="tre-loading-overlay"/.test(idx) &&
  !/id="tre-loading-overlay"[^>]*class="modal-overlay/.test(idx));

// ═══ B. WIRING 5 NHÓM CHỖ CHỜ ══════════════════════════════════
console.log('--- B. WIRING 5 NHÓM CHỖ CHỜ ---');
check('B1: js/loading.js — không import module nào (không vòng import) + refcount show/hide',
  !/^\s*import\s/m.test(ldJs) && ldJs.includes('function showTreLoading') && ldJs.includes('function hideTreLoading'));
check('B2: boot (main.js) — showTreLoading đầu DOMContentLoaded + finally hideTreLoading(bootOk)',
  /showTreLoading\('Đang nạp dữ liệu nhà máy…'\)/.test(mnJs) && /finally\s*\{\s*hideTreLoading\(bootOk\)/.test(mnJs));
check('B3: AI (ai.js) — hiện khi chờ Gemini + finally hideTreLoading(aiOk)',
  /showTreLoading\('Đang chờ AI trả lời…'\)/.test(aiJs) && /hideTreLoading\(aiOk\)/.test(aiJs));
check('B4: Xuất Excel (export-xlsx.js) — bọc exportDataToXlsx + finally hideTreLoading(treOk)',
  /showTreLoading\('Đang xuất file Excel…'\)/.test(xlJs) && /finally\s*\{\s*hideTreLoading\(treOk\);?\s*\}/.test(xlJs));
check('B5: Mây (cloud.js) — đúng 2 nút THỦ CÔNG (đẩy + tải về), auto push nền KHÔNG hiện overlay',
  (clJs.match(/showTreLoading\(/g) || []).length === 2 && /hideTreLoading\(treOk\)/.test(clJs));
check('B6: Backup (autobackup.js) — 3 chỗ: phục hồi máy · phục hồi mây · danh sách backup mây',
  (abJs.match(/showTreLoading\(/g) || []).length === 3 && (abJs.match(/hideTreLoading\(treOk\)/g) || []).length === 3);
check('B7: mọi chỗ lỗi (ok=false) đều đi finally → tre KHÔNG gãy nhưng overlay vẫn được dọn',
  [mnJs, aiJs, xlJs, clJs, abJs].every(s => /hideTreLoading\((bootOk|aiOk|treOk)\)/.test(s)));
// ─── B2. MỞ TAB LẦN ĐẦU TRONG PHIÊN → CHẠY HẾT ANIMATION ──────────
check('B8: main.js — switchView bọc showTreLoading khi LẦN ĐẦU mở tab + finally hideTreLoading(tabOk, { minShow: TRE_TIMING.firstTab })',
  /const firstVisit = targetViewId !== state\.activeView && !treVisitedViews\.has\(targetViewId\)/.test(mnJs) &&
  /hideTreLoading\(tabOk,\s*\{\s*minShow:\s*TRE_TIMING\.firstTab\s*\}\)/.test(mnJs) &&
  mnJs.includes('import { TRE_TIMING, hideTreLoading, showTreLoading }'));
check('B9: bộ nhớ tab ĐÃ MỞ (treVisitedViews) bắt đầu với dashboard (boot đã chạy sẵn) + nhãn tiếng Việt 6 tab',
  mnJs.includes("new Set(['dashboard-view'])") &&
  ['Đang tải tab Tổng Quan', 'Đang tải tab Công Đoạn SX', 'Đang tải tab Kế Hoạch',
   'Đang tải tab Nguyên Liệu', 'Đang tải tab QC', 'Đang tải tab Nhân Sự'].every(s => mnJs.includes(s)));
check('B10: loading.js — có TRE_TIMING.firstTab riêng + hideTreLoading nhận opts.minShow (tab cũ không đổi hành vi)',
  /firstTab:\s*\d+/.test(ldJs) && /opts && typeof opts\.minShow === 'number'/.test(ldJs));

// ═══ C. SW.JS ══════════════════════════════════════════════════
console.log('--- C. SW.JS ---');
check('C1: CACHE_NAME v220 (PWA không dùng cache cũ) + loading.js & sprite vào APP_SHELL',
  /nha-may-ngoc-son-v220/.test(swJs) && swJs.includes("'./js/loading.js'") &&
  swJs.includes("'./icons/loading/tre-sprite.png'"));

// ═══ D. HÀNH VI (stub DOM) ══════════════════════════════════════
console.log('--- D. HÀNH VI refcount + 2 pha (stub DOM) ---');
function makeEl(id) {
  const set = new Set();
  return {
    id: id || '', textContent: '', innerHTML: '',
    classList: {
      add(c) { set.add(c); }, remove(...cs) { cs.forEach(c => set.delete(c)); },
      contains(c) { return set.has(c); },
      toggle(c) { if (set.has(c)) set.delete(c); else set.add(c); return set.has(c); }
    }
  };
}
const els = new Map();
global.document = {
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); }
};
const ld = await import('../js/loading.js');
ld.TRE_TIMING.minShow = 0;   // test nhanh — không cần chờ thời gian tối thiểu
ld.TRE_TIMING.fall = 60;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ov = document.getElementById('tre-loading-overlay');
const txt = document.getElementById('tre-loading-text');

ld.showTreLoading('Chờ tác vụ 1');
check('D1: showTreLoading → overlay CHƯA is-gone/is-fall (đang cảnh chặt)', !ov.classList.contains('is-gone') && !ov.classList.contains('is-fall'));
ld.showTreLoading('Chờ tác vụ 2');
ld.hideTreLoading(true);
await sleep(100);
check('D2: refcount — 2 show + 1 hide → còn 1 tác vụ chờ → overlay vẫn hiện, chưa gãy',
  !ov.classList.contains('is-fall') && !ov.classList.contains('is-gone'));
ld.hideTreLoading(true);
await sleep(30);
check('D3: hide(true) lần cuối → is-fall (cây tre GÃY đổ sang phải)', ov.classList.contains('is-fall'));
check('D4: nhãn đổi thành "Xong rồi!" khi tre gãy', txt.textContent === 'Xong rồi!');
await sleep(120); // TRE_TIMING.fall = 60ms
check('D5: tre nằm hẳn → is-gone (overlay mờ dần rồi ẩn)', ov.classList.contains('is-gone'));
ld.showTreLoading('Thử lại');
check('D6: show lại sau khi ẩn → bỏ is-gone/is-fall (quay lại pha chặt)', !ov.classList.contains('is-gone') && !ov.classList.contains('is-fall'));
ld.hideTreLoading(false);
await sleep(30);
check('D7: hide(false) = LỖI → KHÔNG is-fall (tre không gãy) nhưng vẫn is-gone (dọn overlay)',
  !ov.classList.contains('is-fall') && ov.classList.contains('is-gone'));

// ── D2. opts.minShow (mở tab lần đầu) — chờ ĐỦ firstTab rồi mới gãy ──
ld.TRE_TIMING.minShow = 0;
ld.TRE_TIMING.firstTab = 150;
ld.showTreLoading('Chuyển tab lần đầu');
const tFirst = Date.now();
ld.hideTreLoading(true, { minShow: ld.TRE_TIMING.firstTab }); // render xong NGAY (0ms)
await sleep(70);
check('D8: lần đầu tab — render xong tức thì nhưng CHƯA gãy khi chưa đủ firstTab (150ms)',
  !ov.classList.contains('is-fall') && (Date.now() - tFirst) < 150);
await sleep(120);
check('D9: qua mốc firstTab → tre GÃY (animation chạy trọn dù tab đã render xong)',
  ov.classList.contains('is-fall'));
// Không truyền opts → dùng TRE_TIMING.minShow (0) → gãy NGAY, KHÔNG chờ firstTab
ld.showTreLoading('Chờ thường');
ld.hideTreLoading(true); // không opts
await sleep(40);
check('D10: không truyền opts → gãy NGAY theo minShow (0), KHÔNG chờ firstTab=150 — các chỗ chờ cũ giữ nguyên',
  ov.classList.contains('is-fall') && !ov.classList.contains('is-gone'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
