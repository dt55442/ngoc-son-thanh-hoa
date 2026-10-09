// tests/loading.test.mjs — Kiểm thử ICON LOADING "ANH NÔNG DÂN CHẶT TRE" (js/loading.js)
// Bao phủ: cấu trúc overlay (div .tre-scene SPRITE 18 FRAME + THANH TIẾN
// ĐỘ #tre-progress + nút CHẶT #tre-hit-btn + NÚT BỎ QUA #tre-skip-btn,
// <div> cân bằng, không còn SVG),
// CSS (treChop 0.83s ≈ 6 vòng/5s · game đứng yên + treHitOnce 600ms/.is-hitting · treFall
// 700ms · nền blur · treHitPunch · Giảm Hiệu ỨNG), wiring 5 nhóm chỗ chờ
// (boot · AI · Excel · mây · backup), sw.js +
// loading.js + sprite vào APP_SHELL, HÀNH VI refcount 2 pha (stub DOM) và
// CHẾ ĐỘ GAME "NGHI THỨC CẦP LUỒNG" (boot = mini game 20 nhát ×5% → 100%
// mới gãy, hoặc nút "Bỏ qua" vào thẳng; lỗi → không gãy).
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
check('A5: CSS có 2 pha — treChop NHANH 0.83s ≈ 6 vòng/5s (frame 1–13, 3 hàng sprite) + treFall + nền 600% 300%',
  ['@keyframes treChop', '@keyframes treFall'].every(k => css.includes(k)) &&
  css.includes('600% 300%') && css.includes('steps(1)') &&
  css.includes('treChop 0.83s') &&
  /@keyframes treChop[\s\S]{0,1400}?92\.31%/.test(css));
check('A5b: THANH TIẾN ĐỘ + NÚT CHẶT + NÚT BỎ QUA + NỀN BLUR (mờ Dashboard phía sau) đủ trong HTML/CSS',
  ['id="tre-progress"', 'id="tre-progress-fill"', 'id="tre-progress-pct"', 'id="tre-hit-btn"', 'id="tre-skip-btn"', 'id="tre-loading-card"']
    .every(x => idx.includes(x)) &&
  css.includes('.tre-progress-fill') && css.includes('tre-hit-btn[hidden]') &&
  css.includes('.tre-skip-btn[hidden]') && css.includes('skipTreLoading') &&
  css.includes('@keyframes treHitPunch') && css.includes('backdrop-filter') &&
  css.includes('is-game'));
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
check('A8b: CHẾ ĐỘ GAME đứng yên khi idle (animation:none) + mỗi bấm chạy ĐÚNG 1 nhát treHitOnce 600ms qua .is-hitting',
  css.includes('.tre-loading.is-game .tre-scene { animation: none; cursor: pointer; }') &&
  css.includes('.tre-loading.is-game.is-hitting .tre-scene { animation: treHitOnce .6s steps(1) 1; }') &&
  /@keyframes treHitOnce \{[\s\S]{0,900}?100%/.test(css) &&
  ldJs.includes("classList.add('is-hitting')") &&
  ldJs.includes("animationName === 'treHitOnce'"));
check('A8c: Giảm Hiệu ỨNG TẮT cả nhát bấm (.is-hitting → animation:none) ở CẢ 2 nhánh data-fx + prefers-reduced-motion',
  css.includes('body[data-fx="low"] .tre-loading.is-game.is-hitting .tre-scene { animation: none; }') &&
  css.includes('  .tre-loading.is-game.is-hitting .tre-scene { animation: none; }'));
check('A9: KHÔNG dùng class .modal-overlay (không làm khoá cuộn trang nhầm — quy tắc 21)',
  !/class="modal-overlay[^"]*"[^>]*id="tre-loading-overlay"/.test(idx) &&
  !/id="tre-loading-overlay"[^>]*class="modal-overlay/.test(idx));

// ═══ B. WIRING 5 NHÓM CHỖ CHỜ ══════════════════════════════════
console.log('--- B. WIRING 5 NHÓM CHỖ CHỜ ---');
check('B1: js/loading.js — không import module nào (không vòng import) + refcount show/hide',
  !/^\s*import\s/m.test(ldJs) && ldJs.includes('function showTreLoading') && ldJs.includes('function hideTreLoading'));
check('B2: boot (main.js) — showTreLoading CHẾ ĐỘ GAME đầu DOMContentLoaded + finally hideTreLoading(bootOk)',
  /showTreLoading\('Đang nạp dữ liệu nhà máy…',\s*\{\s*mode:\s*'game'\s*\}\)/.test(mnJs) &&
  /finally\s*\{\s*hideTreLoading\(bootOk\)/.test(mnJs));
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
check('B11: main.js — preloadCoreViews() chạy sau boot khi bootOk (tải sẵn Kanban dưới overlay)',
  mnJs.includes('function preloadCoreViews') &&
  /if \(bootOk\)[\s\S]{0,240}preloadCoreViews/.test(mnJs));

// ═══ C. SW.JS ══════════════════════════════════════════════════
console.log('--- C. SW.JS ---');
check('C1: CACHE_NAME v229 (PWA không dùng cache cũ) + loading.js & sprite vào APP_SHELL',
  /nha-may-ngoc-son-v229/.test(swJs) && swJs.includes("'./js/loading.js'") &&
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
ld.TRE_TIMING.load = 0;      // test nhanh — cửa sổ auto = 0 → gãy ngay
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
ld.TRE_TIMING.load = 0;
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
// Không truyền opts → dùng TRE_TIMING.load (0) → gãy NGAY, KHÔNG chờ firstTab
ld.showTreLoading('Chờ thường');
ld.hideTreLoading(true); // không opts
await sleep(40);
check('D10: không truyền opts → gãy NGAY theo TRE_TIMING.load (0), KHÔNG chờ firstTab=150 — các chỗ chờ auto giữ nguyên',
  ov.classList.contains('is-fall') && !ov.classList.contains('is-gone'));


// ═══ E. CHẾ ĐỘ GAME (BOOT — mỗi lần mở trang) ═════════════════════
console.log('--- E. CHẾ ĐỘ GAME (mini game chặn Dashboard) ---');
ld.TRE_TIMING.load = 0;
ld.TRE_TIMING.fall = 60;
ld.TRE_TIMING.hitStep = 5;
const btnHit = document.getElementById('tre-hit-btn');
const pctEl = document.getElementById('tre-progress-pct');
ld.showTreLoading('Đang nạp dữ liệu nhà máy…', { mode: 'game' });
ld.hideTreLoading(true);
await sleep(20);
check('E1: game — boot xong KHÔNG tự gãy: vào is-game + nút Chặt + nút Bỏ qua hiện, chưa is-fall/is-gone',
  ov.classList.contains('is-game') && !ov.classList.contains('is-fall') &&
  !ov.classList.contains('is-gone') && btnHit.hidden === false);
check('E2: tiến độ reset 0% + hint ghi "0%" và "còn 20 nhát"',
  pctEl.textContent === '0%' && txt.textContent.includes('0%') &&
  txt.textContent.includes('còn 20 nhát'));
for (let i = 0; i < 4; i++) ld.hitTreLoading();
check('E3: 4 nhát × 5% → 20% (còn 16 nhát), vẫn is-game',
  pctEl.textContent === '20%' && ov.classList.contains('is-game'));
check('E3b: mỗi nhát gắn .is-hitting (kích hoạt treHitOnce 1 nhát — IDLE đứng yên, không lặp)',
  ov.classList.contains('is-hitting'));
for (let i = 0; i < 16; i++) ld.hitTreLoading();
check('E4: đủ 100% → is-fall NGAY + nhãn "Xong rồi!" + nút ẩn + hết is-game',
  ov.classList.contains('is-fall') && txt.textContent === 'Xong rồi!' &&
  btnHit.hidden === true && !ov.classList.contains('is-game'));
check('E4b: đủ 100% → gỡ .is-hitting (không để nhát chặt đè pha gãy treFall)',
  !ov.classList.contains('is-hitting'));
await sleep(120); // fall = 60ms
check('E5: tre nằm hẳn → is-gone (Dashboard hiện ra)', ov.classList.contains('is-gone'));
check('E6: hit khi KHÔNG còn game → bỏ qua an toàn (trả % cũ, overlay giữ nguyên)',
  ld.hitTreLoading() === 100 && ov.classList.contains('is-gone'));
ld.showTreLoading('Boot lỗi', { mode: 'game' });
ld.hideTreLoading(false);
await sleep(20);
check('E7: game + LỖI → KHÔNG is-game / KHÔNG is-fall, chỉ is-gone (không nói dối)',
  !ov.classList.contains('is-game') && !ov.classList.contains('is-fall') &&
  ov.classList.contains('is-gone'));

// ═══ F. NÚT "BỎ QUÁ" — vào thẳng Dashboard không cần đủ 20 nhát ═════
console.log('--- F. NÚT BỎ QUÁ (skipTreLoading) ---');
ld.TRE_TIMING.load = 0;
ld.TRE_TIMING.fall = 60;
const btnSkip = document.getElementById('tre-skip-btn');
ld.showTreLoading('Boot lần nữa', { mode: 'game' });
ld.hideTreLoading(true);
await sleep(20);
check('F1: game — nút "Bỏ qua" hiện CÙNG nút chặt + hint đổi thành "Nghi thức cầu luồng"',
  ov.classList.contains('is-game') && btnSkip.hidden === false && btnHit.hidden === false &&
  txt.textContent.includes('Nghi thức cầu luồng'));
ld.showTreLoading('Đang chuyển cảnh', { mode: 'game' });
check('F2: showTreLoading → ẩn CẢ 2 nút (reset trước khi vào cảnh mới, không sót nút cũ)',
  btnSkip.hidden === true && btnHit.hidden === true);
ld.hideTreLoading(true);
await sleep(20);
check('F3: vào game lần nữa → cả 2 nút hiện lại', ov.classList.contains('is-game') && btnSkip.hidden === false);
ld.skipTreLoading();
check('F4: bấm Bỏ qua → is-fall NGAY + gỡ is-game + ẩn CẢ 2 nút + nhãn "Xong rồi!" (tiến độ 100%)',
  ov.classList.contains('is-fall') && !ov.classList.contains('is-game') &&
  btnSkip.hidden === true && btnHit.hidden === true && txt.textContent === 'Xong rồi!');
await sleep(120); // fall = 60ms
check('F5: tre nằm hẳn → is-gone (Dashboard hiện ra — không cần bấm đủ 20 nhát)',
  ov.classList.contains('is-gone'));
check('F6: skipTreLoading khi KHÔNG còn game → bỏ qua an toàn (trả % cũ, overlay giữ nguyên)',
  ld.skipTreLoading() === 100 && ov.classList.contains('is-gone'));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
