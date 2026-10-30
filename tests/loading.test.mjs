// tests/loading.test.mjs — Kiểm thử ICON LOADING "ANH NÔNG DÂN CHẶT TRE" (js/loading.js)
// Bao phủ: cấu trúc overlay (div .tre-scene SPRITE 18 FRAME + THANH TIẾN
// ĐỘ #tre-progress + nút CHẶT #tre-hit-btn + NÚT BỎ QUA #tre-skip-btn,
// <div> cân bằng, không còn SVG),
// CSS (treChop 0.83s ≈ 6 vòng/5s · game đứng yên + treHitOnce 600ms/.is-hitting · treFall
// 700ms · nền blur · treHitPunch · Giảm Hiệu ỨNG), wiring 5 nhóm chỗ chờ
// (boot · AI · Excel · mây · backup), sw.js +
// loading.js + sprite vào APP_SHELL, HÀNH VI refcount 2 pha (stub DOM) và
// mini-game chạy trong khi tải, tiến độ riêng và tự đóng khi boot sẵn sàng.
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
  ['id="tre-progress"', 'id="tre-progress-fill"', 'id="tre-progress-pct"', 'id="tre-game-counter"', 'id="tre-hit-btn"', 'id="tre-skip-btn"', 'id="tre-loading-card"']
    .every(x => idx.includes(x)) &&
  css.includes('.tre-progress-fill') && css.includes('tre-hit-btn[hidden]') &&
  css.includes('.tre-skip-btn[hidden]') && ldJs.includes('function skipTreLoading') &&
  css.includes('@keyframes treHitPunch') && css.includes('backdrop-filter') &&
  css.includes('is-game'));
check('A5d: vòng chờ quay cạnh nhãn tải, có giảm chuyển động cho FX thấp/reduced-motion',
  idx.includes('class="tre-loading-spinner"') && css.includes('@keyframes treLoadingSpin') &&
  css.includes('animation: treLoadingSpin .9s linear infinite') &&
  css.includes('body[data-fx="low"] .tre-loading-spinner { animation: none; }') &&
  css.includes('.tre-loading-spinner { animation: none; }'));
check('A5c: thanh tải dùng transform thân thiện với compositor, không transition width',
  css.includes('transform: scaleX(0)') && css.includes('transform-origin: left center') &&
  !/\.tre-progress-fill\s*\{[^}]*transition:\s*width/.test(css));
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
check('B2: boot ẩn mini-game, xoay câu trạng thái và chờ Firebase trước khi kết thúc overlay',
  /showTreLoading\('Đang nạp dữ liệu nhà máy…',\s*\{\s*phrases:/.test(mnJs) &&
  !/showTreLoading\('Đang nạp dữ liệu nhà máy…',\s*\{\s*mode:\s*'game'/.test(mnJs) &&
  /Đang xác nhận số liệu mới nhất từ Firebase/.test(mnJs) &&
  /await initFirebase\(\)/.test(mnJs) &&
  /hideTreLoading\(bootOk\)/.test(mnJs) &&
  /setTreLoadingStatus/.test(mnJs));
check('B3: AI (ai.js) — hiện khi chờ Gemini + finally hideTreLoading(aiOk)',
  /showTreLoading\('Đang chờ AI trả lời…'\)/.test(aiJs) && /hideTreLoading\(aiOk\)/.test(aiJs));
check('B4: Xuất Excel (export-xlsx.js) — bọc exportDataToXlsx + finally hideTreLoading(treOk)',
  /showTreLoading\('Đang xuất file Excel…'\)/.test(xlJs) && /finally\s*\{\s*hideTreLoading\(treOk\);?\s*\}/.test(xlJs));
check('B5: Mây (cloud.js) — đúng 2 nút THỦ CÔNG (đẩy + tải về), auto push nền KHÔNG hiện overlay',
  (clJs.match(/showTreLoading\(/g) || []).length === 2 && /hideTreLoading\(treOk\)/.test(clJs));
check('B6: Backup (autobackup.js) — 3 chỗ: phục hồi máy · phục hồi mây · danh sách backup mây',
  (abJs.match(/showTreLoading\(/g) || []).length === 3 && (abJs.match(/hideTreLoading\(treOk\)/g) || []).length === 3);
check('B7: mọi chỗ lỗi (ok=false) đều đi finally → tre KHÔNG gãy nhưng overlay vẫn được dọn',
  [mnJs, aiJs, xlJs, clJs, abJs].every(s => /hideTreLoading\((bootOk|aiOk|treOk)(?:\s*,[^)]*)?\)/.test(s)));
// ─── B2. CHUYỂN TAB KHÔNG CHỜ ANIMATION HOẶC RENDER TRƯỚC ───────────
check('B8: switchView không đặt overlay chặn thao tác ở lần mở tab đầu',
  /function switchView\(targetViewId\)\s*\{\s*switchViewCore\(targetViewId\);\s*\}/.test(mnJs) &&
  !/firstVisit|treVisitedViews|VIEW_LOADING_LABELS/.test(mnJs));
check('B9: boot không vẽ sẵn Kanban nặng; tab được dựng khi người dùng mở',
  !mnJs.includes('preloadCoreViews') &&
  !/setTimeout\(preloadCoreViews/.test(mnJs));
check('B10: loading.js giữ tùy chọn minShow chung nhưng không có cửa chờ riêng cho tab',
  /opts && typeof opts\.minShow === 'number'/.test(ldJs) &&
  !/firstTab/.test(ldJs));
check('B11: boot yield giữa các nhóm khởi tạo để overlay có cơ hội render',
  (mnJs.match(/await yieldBootFrame\(\)/g) || []).length >= 5 &&
  mnJs.includes('requestAnimationFrame'));

// ═══ C. SW.JS ══════════════════════════════════════════════════
console.log('--- C. SW.JS ---');
check('C1: CACHE_NAME v318 (PWA không dùng cache cũ) + loading.js & sprite vào APP_SHELL',
  /nha-may-ngoc-son-v318/.test(swJs) && swJs.includes("'./js/loading.js'") &&
  swJs.includes("'./icons/loading/tre-sprite.png'"));

// ═══ D. HÀNH VI (stub DOM) ══════════════════════════════════════
console.log('--- D. HÀNH VI refcount + 2 pha (stub DOM) ---');
function makeEl(id) {
  const set = new Set();
  return {
    id: id || '', textContent: '', innerHTML: '', hidden: false, style: {},
    setAttribute() {},
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
ld.TRE_TIMING.progressFinish = 0;
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

// ── D2. opts.minShow — chỉ dùng khi caller yêu cầu thời gian tối thiểu ─
ld.TRE_TIMING.load = 0;
ld.showTreLoading('Chờ tối thiểu');
const tFirst = Date.now();
ld.hideTreLoading(true, { minShow: 150 }); // tác vụ xong NGAY (0ms)
await sleep(70);
check('D8: minShow — tác vụ xong tức thì nhưng CHƯA gãy khi chưa đủ 150ms',
  !ov.classList.contains('is-fall') && (Date.now() - tFirst) < 150);
await sleep(120);
check('D9: qua mốc minShow → overlay gãy',
  ov.classList.contains('is-fall'));
// Không truyền opts → dùng TRE_TIMING.load (0) → gãy NGAY.
ld.showTreLoading('Chờ thường');
ld.hideTreLoading(true); // không opts
await sleep(40);
check('D10: không truyền opts → gãy NGAY theo TRE_TIMING.load (0)',
  ov.classList.contains('is-fall') && !ov.classList.contains('is-gone'));


// ═══ E. MINI-GAME CHẠY TRONG KHI NẠP ═══════════════════════════════
console.log('--- E. MINI-GAME CHẠY TRONG KHI NẠP ---');
ld.TRE_TIMING.load = 0;
ld.TRE_TIMING.fall = 60;
ld.TRE_TIMING.hitStep = 5;
const btnHit = document.getElementById('tre-hit-btn');
const pctEl = document.getElementById('tre-progress-pct');
const gameCounter = document.getElementById('tre-game-counter');
ld.showTreLoading('Đang nạp dữ liệu nhà máy…', { mode: 'game' });
check('E1: mini-game + nút bỏ qua hiện ngay trong lúc boot đang nạp',
  ov.classList.contains('is-game') && !ov.classList.contains('is-fall') &&
  !ov.classList.contains('is-gone') && btnHit.hidden === false);
check('E2: game counter tách biệt với thanh tiến độ tải',
  pctEl.textContent === '0%' && gameCounter.textContent.includes('0/20') &&
  gameCounter.hidden === false);
for (let i = 0; i < 4; i++) ld.hitTreLoading();
check('E3: 4 nhát chỉ cập nhật game counter, tiến độ tải không đổi',
  pctEl.textContent === '0%' && gameCounter.textContent.includes('4/20') &&
  ov.classList.contains('is-game'));
await sleep(20);
check('E3b: mỗi nhát gắn .is-hitting (kích hoạt treHitOnce 1 nhát — IDLE đứng yên, không lặp)',
  ov.classList.contains('is-hitting'));
for (let i = 0; i < 16; i++) ld.hitTreLoading();
check('E4: hoàn thành mini-game không đóng overlay trước khi boot xong',
  !ov.classList.contains('is-fall') && !ov.classList.contains('is-gone') &&
  btnHit.hidden === true && gameCounter.textContent.includes('Đã chặt xong'));
check('E5: hit sau khi hoàn thành game không ảnh hưởng boot',
  ld.hitTreLoading() === 100 && !ov.classList.contains('is-fall'));
ld.hideTreLoading(true);
await sleep(20);
check('E6: boot hoàn tất → cây gãy và tiến độ đạt 100%',
  ov.classList.contains('is-fall') && pctEl.textContent === '100%' &&
  txt.textContent === 'Xong rồi!');
await sleep(120);
check('E7: tre nằm hẳn → overlay ẩn', ov.classList.contains('is-gone'));
ld.showTreLoading('Boot lỗi', { mode: 'game' });
ld.hideTreLoading(false);
await sleep(20);
check('E8: game + LỖI → KHÔNG is-game / KHÔNG is-fall, chỉ is-gone (không nói dối)',
  !ov.classList.contains('is-game') && !ov.classList.contains('is-fall') &&
  ov.classList.contains('is-gone'));

ld.TRE_TIMING.progressFinish = 160;
ld.showTreLoading('Đang nạp…', { mode: 'game' });
await sleep(100);
const progressDuringLoad = Number.parseInt(pctEl.textContent, 10);
check('E9: tiến độ tăng dần trong lúc tải nhưng chưa đạt 100%',
  progressDuringLoad > 0 && progressDuringLoad < 100);
ld.hideTreLoading(true);
await sleep(70);
check('E10: tiến độ vẫn chưa 100% trong pha hoàn tất, overlay chưa gãy',
  Number.parseInt(pctEl.textContent, 10) < 100 && !ov.classList.contains('is-fall'));
await sleep(180);
check('E11: tiến độ mượt tới 100% rồi mới bắt đầu pha gãy',
  pctEl.textContent === '100%' && ov.classList.contains('is-fall'));
await sleep(100);
ld.TRE_TIMING.progressFinish = 0;

// ═══ F. BỎ MINI-GAME KHÔNG BỎ QUA BOOT ═══════════════════════════════
console.log('--- F. BỎ MINI-GAME KHÔNG BỎ QUA BOOT ---');
ld.TRE_TIMING.load = 0;
ld.TRE_TIMING.fall = 60;
const btnSkip = document.getElementById('tre-skip-btn');
ld.showTreLoading('Boot lần nữa', { mode: 'game' });
check('F1: nút bỏ trò chơi hiện cùng mini-game',
  ov.classList.contains('is-game') && btnSkip.hidden === false && btnHit.hidden === false);
ld.skipTreLoading();
check('F2: bỏ game chỉ ẩn nút chơi; overlay vẫn chờ boot và tiến độ chưa hoàn tất',
  !ov.classList.contains('is-fall') && !ov.classList.contains('is-gone') &&
  btnSkip.hidden === true && btnHit.hidden === true && pctEl.textContent !== '100%' &&
  txt.textContent.includes('Đang nạp dữ liệu'));
ld.hideTreLoading(true);
await sleep(120); // fall = 60ms
check('F3: boot hoàn tất mới gãy tre và đóng overlay', ov.classList.contains('is-fall'));
await sleep(80);
check('F4: skipTreLoading ngoài game không làm thay đổi trạng thái',
  ld.skipTreLoading() === 0 && ov.classList.contains('is-gone'));

// ── G. XOAY CÂU VUI khi chờ (opts.phrases — 20/10/2026) ──────────
ld.TRE_TIMING.load = 0;
ld.TRE_TIMING.fall = 60;
ld.TRE_TIMING.phrase = 600;   // production clamp = tối thiểu 600ms/câu
const PHRASES = ['Câu 1 🎋', 'Câu 2 🌿', 'Câu 3 💪'];
ld.showTreLoading('Nhãn mặc định', { phrases: PHRASES });
check('G1: mở overlay là hiện NGAY câu ĐẦU TIÊN (không phải nhãn mặc định)', txt.textContent === 'Câu 1 🎋');
await sleep(700);
check('G2: tự xoay sang câu kế tiếp khi chờ lâu', txt.textContent !== 'Câu 1 🎋' && PHRASES.includes(txt.textContent));
const lastPhrase = txt.textContent;
ld.hideTreLoading(false);
check('G3: xong/lỗi → DỪNG xoay (không nhảy câu nữa)', txt.textContent === lastPhrase || txt.textContent === 'Xong rồi!');
await sleep(80);
check('G4: sau khi dọn overlay, câu không tiếp tục đổi', txt.textContent === lastPhrase || txt.textContent === 'Xong rồi!');
ld.showTreLoading('Chỉ một nhãn');
await sleep(50);
check('G5: KHÔNG truyền phrases → giữ nguyên 1 nhãn như cũ (mọi chỗ chờ khác không đổi)',
  txt.textContent === 'Chỉ một nhãn');
ld.hideTreLoading(true);
await sleep(120);
check('G6: cấu trúc loading.js — có TRE_TIMING.phrase + hàm xoay câu (clear khi gãy)',
  /phrase:\s*\d+/.test(fs.readFileSync(new URL('../js/loading.js', import.meta.url), 'utf8')) &&
  ldJs.includes('function treStartPhrases') && ldJs.includes('function treStopPhrases') &&
  /function treFall\(el\)[\s\S]{0,220}?treStopPhrases\(\)/.test(ldJs));

console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
