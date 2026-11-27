// tests/loading.test.mjs â€” Kiá»ƒm thá»­ ICON LOADING "ANH NÃ”NG DÃ‚N CHáº¶T TRE" (js/loading.js)
// Bao phá»§: cáº¥u trÃºc overlay (div .tre-scene SPRITE 18 FRAME + THANH TIáº¾N
// Äá»˜ #tre-progress + nÃºt CHáº¶T #tre-hit-btn + NÃšT Bá»Ž QUA #tre-skip-btn,
// <div> cÃ¢n báº±ng, khÃ´ng cÃ²n SVG),
// CSS (treChop 0.83s â‰ˆ 6 vÃ²ng/5s Â· game Ä‘á»©ng yÃªn + treHitOnce 600ms/.is-hitting Â· treFall
// 700ms Â· ná»n blur Â· treHitPunch Â· Giáº£m Hiá»‡u á»¨NG), wiring 5 nhÃ³m chá»— chá»
// (boot Â· AI Â· Excel Â· mÃ¢y Â· backup), sw.js +
// loading.js + sprite vÃ o APP_SHELL, HÃ€NH VI refcount 2 pha (stub DOM) vÃ 
// mini-game cháº¡y trong khi táº£i, tiáº¿n Ä‘á»™ riÃªng vÃ  tá»± Ä‘Ã³ng khi boot sáºµn sÃ ng.
'use strict';
import fs from 'node:fs';

const rd = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  âœ“ ' + name); }
  else { fail++; console.log('  âœ— ' + name); }
}

// â•â•â• A. Cáº¤U TRÃšC â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- A. Cáº¤U TRÃšC (index.html + styles.css) ---');
const idx = rd('index.html');
const css = rd('styles.css');
const ldJs = rd('js/loading.js');
const mnJs = rd('js/main.js');
const swJs = rd('sw.js');
const xlJs = rd('js/export-xlsx.js');
const clJs = rd('js/cloud.js');
const abJs = rd('js/autobackup.js');

check('A1: overlay #tre-loading-overlay á»Ÿ Äáº¦U <body> (hiá»‡n ngay khi má»Ÿ trang)',
  !!idx.match(/id="tre-loading-overlay"/) && idx.indexOf('id="tre-loading-overlay"') < idx.indexOf('<header class="app-header">'));
check('A2: cáº£nh = SPRITE div .tre-scene (Ä‘Ã£ gá»¡ SVG) + file sprite 18 frame Tá»’N Táº I',
  idx.includes('<div class="tre-scene"') && !idx.includes('<svg class="tre-scene"') &&
  !idx.includes('tre-stalk') &&
  fs.existsSync(new URL('../icons/loading/tre-sprite.png', import.meta.url)));
check('A3: sá»‘ <div> cÃ¢n báº±ng </div> (khÃ´ng lÃ m vá»¡ test cáº¥u trÃºc khÃ¡c)',
  (idx.match(/<div/g) || []).length === (idx.match(/<\/div>/g) || []).length);
check('A4: cÃ³ Ã´ nhÃ£n tiáº¿ng Viá»‡t chá» táº£i + id tre-loading-text',
  idx.includes('id="tre-loading-text"') && idx.includes('Äang táº£i dá»¯ liá»‡u nhÃ  mÃ¡y'));
check('A5: CSS cÃ³ 2 pha â€” treChop NHANH 0.83s â‰ˆ 6 vÃ²ng/5s (frame 1â€“13, 3 hÃ ng sprite) + treFall + ná»n 600% 300%',
  ['@keyframes treChop', '@keyframes treFall'].every(k => css.includes(k)) &&
  css.includes('600% 300%') && css.includes('steps(1)') &&
  css.includes('treChop 0.83s') &&
  /@keyframes treChop[\s\S]{0,1400}?92\.31%/.test(css));
check('A5b: THANH TIáº¾N Äá»˜ + NÃšT CHáº¶T + NÃšT Bá»Ž QUA + Ná»€N BLUR (má» Dashboard phÃ­a sau) Ä‘á»§ trong HTML/CSS',
  ['id="tre-progress"', 'id="tre-progress-fill"', 'id="tre-progress-pct"', 'id="tre-game-counter"', 'id="tre-hit-btn"', 'id="tre-skip-btn"', 'id="tre-loading-card"']
    .every(x => idx.includes(x)) &&
  css.includes('.tre-progress-fill') && css.includes('tre-hit-btn[hidden]') &&
  css.includes('.tre-skip-btn[hidden]') && ldJs.includes('function skipTreLoading') &&
  css.includes('@keyframes treHitPunch') && css.includes('backdrop-filter') &&
  css.includes('is-game'));
check('A5d: vÃ²ng chá» quay cáº¡nh nhÃ£n táº£i, cÃ³ giáº£m chuyá»ƒn Ä‘á»™ng cho FX tháº¥p/reduced-motion',
  idx.includes('class="tre-loading-spinner"') && css.includes('@keyframes treLoadingSpin') &&
  css.includes('animation: treLoadingSpin .9s linear infinite') &&
  css.includes('body[data-fx="low"] .tre-loading-spinner { animation: none; }') &&
  css.includes('.tre-loading-spinner { animation: none; }'));
check('A5c: thanh táº£i dÃ¹ng transform thÃ¢n thiá»‡n vá»›i compositor, khÃ´ng transition width',
  css.includes('transform: scaleX(0)') && css.includes('transform-origin: left center') &&
  !/\.tre-progress-fill\s*\{[^}]*transition:\s*width/.test(css));
const fallBlock = (css.match(/@keyframes treFall \{[\s\S]*?\n\}/) || [''])[0];
check('A6: GÃƒY = frame 14â€“18 (hÃ ng cuá»‘i Y=100%) Â· 700ms steps(1) forwards giá»¯ frame 18 (tre náº±m bÃªn PHáº¢I)',
  css.includes('animation: treFall 700ms steps(1) forwards') &&
  ['20% 100%', '40% 100%', '60% 100%', '80% 100%', '100% 100%'].every(p => fallBlock.includes(p)));
check('A7: khi is-fall â€” .tre-scene chuyá»ƒn sang treFall (tháº¯ng pha cháº·t) + overlay z-index trÃªn modal (10050 > 10000)',
  css.includes('.tre-loading.is-fall .tre-scene') && /z-index:\s*10050/.test(css));
check('A8: tÃ´n trá»ng Giáº£m Hiá»‡u á»¨NG (data-fx="low") + prefers-reduced-motion â€” táº¯t vÃ²ng láº·p cháº·t, VáºªN giá»¯ pha gÃ£y rÃºt ngáº¯n 350ms',
  css.includes('body[data-fx="low"] .tre-scene { animation: none; }') &&
  css.includes('prefers-reduced-motion: reduce') &&
  /body\[data-fx="low"\] \.tre-loading\.is-fall \.tre-scene\s*\{[^}]*treFall 350ms/.test(css) &&
  /prefers-reduced-motion: reduce\)[\s\S]{0,220}?\{[^}]*animation: treFall 350ms/.test(css));
check('A8b: CHáº¾ Äá»˜ GAME Ä‘á»©ng yÃªn khi idle (animation:none) + má»—i báº¥m cháº¡y ÄÃšNG 1 nhÃ¡t treHitOnce 600ms qua .is-hitting',
  css.includes('.tre-loading.is-game .tre-scene { animation: none; cursor: pointer; }') &&
  css.includes('.tre-loading.is-game.is-hitting .tre-scene { animation: treHitOnce .6s steps(1) 1; }') &&
  /@keyframes treHitOnce \{[\s\S]{0,900}?100%/.test(css) &&
  ldJs.includes("classList.add('is-hitting')") &&
  ldJs.includes("animationName === 'treHitOnce'"));
check('A8c: Giáº£m Hiá»‡u á»¨NG Táº®T cáº£ nhÃ¡t báº¥m (.is-hitting â†’ animation:none) á»Ÿ Cáº¢ 2 nhÃ¡nh data-fx + prefers-reduced-motion',
  css.includes('body[data-fx="low"] .tre-loading.is-game.is-hitting .tre-scene { animation: none; }') &&
  css.includes('  .tre-loading.is-game.is-hitting .tre-scene { animation: none; }'));
check('A9: KHÃ”NG dÃ¹ng class .modal-overlay (khÃ´ng lÃ m khoÃ¡ cuá»™n trang nháº§m â€” quy táº¯c 21)',
  !/class="modal-overlay[^"]*"[^>]*id="tre-loading-overlay"/.test(idx) &&
  !/id="tre-loading-overlay"[^>]*class="modal-overlay/.test(idx));

// â•â•â• B. WIRING 5 NHÃ“M CHá»– CHá»œ â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- B. WIRING 5 NHÃ“M CHá»– CHá»œ ---');
check('B1: js/loading.js â€” khÃ´ng import module nÃ o (khÃ´ng vÃ²ng import) + refcount show/hide',
  !/^\s*import\s/m.test(ldJs) && ldJs.includes('function showTreLoading') && ldJs.includes('function hideTreLoading'));
check('B2: boot dá»±ng giao diá»‡n cá»¥c bá»™ trÆ°á»›c; Firebase Ä‘á»“ng bá»™ ná»n khÃ´ng giá»¯ overlay',
  /showTreLoading\('Äang náº¡p dá»¯ liá»‡u nhÃ  mÃ¡yâ€¦',\s*\{\s*phrases:/.test(mnJs) &&
  !/showTreLoading\('Äang náº¡p dá»¯ liá»‡u nhÃ  mÃ¡yâ€¦',\s*\{\s*mode:\s*'game'/.test(mnJs) &&
  /Äang káº¿t ná»‘i Firebase á»Ÿ ná»n/.test(mnJs) &&
  /void initFirebase\(\)\.catch\(/.test(mnJs) &&
  !/await initFirebase\(\)/.test(mnJs) &&
  /hideTreLoading\(bootOk\)/.test(mnJs) &&
  /setTreLoadingStatus/.test(mnJs));
check('B3: module AI Ä‘Ã£ gá»¡ â€” khÃ´ng cÃ²n overlay chá» AI',
  !fs.existsSync(new URL('../js/ai.js', import.meta.url)) && !/Äang chá» AI tráº£ lá»i/.test(mnJs));
check('B4: Xuáº¥t Excel (export-xlsx.js) â€” bá»c exportDataToXlsx + finally hideTreLoading(treOk)',
  /showTreLoading\('Äang xuáº¥t file Excelâ€¦'\)/.test(xlJs) && /finally\s*\{\s*hideTreLoading\(treOk\);?\s*\}/.test(xlJs));
check('B5: MÃ¢y (cloud.js) â€” Ä‘Ãºng 2 nÃºt THá»¦ CÃ”NG (Ä‘áº©y + táº£i vá»), auto push ná»n KHÃ”NG hiá»‡n overlay',
  (clJs.match(/showTreLoading\(/g) || []).length === 2 && /hideTreLoading\(treOk\)/.test(clJs));
check('B6: Backup (autobackup.js) â€” 3 chá»—: phá»¥c há»“i mÃ¡y Â· phá»¥c há»“i mÃ¢y Â· danh sÃ¡ch backup mÃ¢y',
  (abJs.match(/showTreLoading\(/g) || []).length === 3 && (abJs.match(/hideTreLoading\(treOk\)/g) || []).length === 3);
check('B7: má»i chá»— lá»—i (ok=false) Ä‘á»u Ä‘i finally â†’ tre KHÃ”NG gÃ£y nhÆ°ng overlay váº«n Ä‘Æ°á»£c dá»n',
  [mnJs, xlJs, clJs, abJs].every(s => /hideTreLoading\((bootOk|treOk)(?:\s*,[^)]*)?\)/.test(s)));
// â”€â”€â”€ B2. CHUYá»‚N TAB KHÃ”NG CHá»œ ANIMATION HOáº¶C RENDER TRÆ¯á»šC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check('B8: switchView khÃ´ng Ä‘áº·t overlay cháº·n thao tÃ¡c á»Ÿ láº§n má»Ÿ tab Ä‘áº§u',
  /function switchView\(targetViewId\)\s*\{\s*switchViewCore\(targetViewId\)[^;]{0,200};\s*\}/.test(mnJs) &&
  !/firstVisit|treVisitedViews|VIEW_LOADING_LABELS/.test(mnJs));
check('B9: boot khÃ´ng váº½ sáºµn Kanban náº·ng; tab Ä‘Æ°á»£c dá»±ng khi ngÆ°á»i dÃ¹ng má»Ÿ',
  !mnJs.includes('preloadCoreViews') &&
  !/setTimeout\(preloadCoreViews/.test(mnJs));
check('B10: loading.js giá»¯ tÃ¹y chá»n minShow chung nhÆ°ng khÃ´ng cÃ³ cá»­a chá» riÃªng cho tab',
  /opts && typeof opts\.minShow === 'number'/.test(ldJs) &&
  !/firstTab/.test(ldJs));
check('B11: boot yield giá»¯a cÃ¡c nhÃ³m khá»Ÿi táº¡o Ä‘á»ƒ overlay cÃ³ cÆ¡ há»™i render',
  (mnJs.match(/await yieldBootFrame\(\)/g) || []).length >= 5 &&
  mnJs.includes('requestAnimationFrame'));

// â•â•â• C. SW.JS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- C. SW.JS ---');
check('C1: CACHE_NAME v486 (PWA khÃ´ng dÃ¹ng cache cÅ©) + loading.js & sprite vÃ o APP_SHELL',
  /nha-may-ngoc-son-v486/.test(swJs) && swJs.includes("'./js/loading.js'") &&
  swJs.includes("'./icons/loading/tre-sprite.png'"));

// â•â•â• D. HÃ€NH VI (stub DOM) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- D. HÃ€NH VI refcount + 2 pha (stub DOM) ---');
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
ld.TRE_TIMING.load = 0;      // test nhanh â€” cá»­a sá»• auto = 0 â†’ gÃ£y ngay
ld.TRE_TIMING.fall = 60;
ld.TRE_TIMING.progressFinish = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ov = document.getElementById('tre-loading-overlay');
const txt = document.getElementById('tre-loading-text');

ld.showTreLoading('Chá» tÃ¡c vá»¥ 1');
check('D1: showTreLoading â†’ overlay CHÆ¯A is-gone/is-fall (Ä‘ang cáº£nh cháº·t)', !ov.classList.contains('is-gone') && !ov.classList.contains('is-fall'));
ld.showTreLoading('Chá» tÃ¡c vá»¥ 2');
ld.hideTreLoading(true);
await sleep(100);
check('D2: refcount â€” 2 show + 1 hide â†’ cÃ²n 1 tÃ¡c vá»¥ chá» â†’ overlay váº«n hiá»‡n, chÆ°a gÃ£y',
  !ov.classList.contains('is-fall') && !ov.classList.contains('is-gone'));
ld.hideTreLoading(true);
await sleep(30);
check('D3: hide(true) láº§n cuá»‘i â†’ is-fall (cÃ¢y tre GÃƒY Ä‘á»• sang pháº£i)', ov.classList.contains('is-fall'));
check('D4: nhÃ£n Ä‘á»•i thÃ nh "Xong rá»“i!" khi tre gÃ£y', txt.textContent === 'Xong rá»“i!');
await sleep(120); // TRE_TIMING.fall = 60ms
check('D5: tre náº±m háº³n â†’ is-gone (overlay má» dáº§n rá»“i áº©n)', ov.classList.contains('is-gone'));
ld.showTreLoading('Thá»­ láº¡i');
check('D6: show láº¡i sau khi áº©n â†’ bá» is-gone/is-fall (quay láº¡i pha cháº·t)', !ov.classList.contains('is-gone') && !ov.classList.contains('is-fall'));
ld.hideTreLoading(false);
await sleep(30);
check('D7: hide(false) = Lá»–I â†’ KHÃ”NG is-fall (tre khÃ´ng gÃ£y) nhÆ°ng váº«n is-gone (dá»n overlay)',
  !ov.classList.contains('is-fall') && ov.classList.contains('is-gone'));

// â”€â”€ D2. opts.minShow â€” chá»‰ dÃ¹ng khi caller yÃªu cáº§u thá»i gian tá»‘i thiá»ƒu â”€
ld.TRE_TIMING.load = 0;
ld.showTreLoading('Chá» tá»‘i thiá»ƒu');
const tFirst = Date.now();
ld.hideTreLoading(true, { minShow: 150 }); // tÃ¡c vá»¥ xong NGAY (0ms)
await sleep(70);
check('D8: minShow â€” tÃ¡c vá»¥ xong tá»©c thÃ¬ nhÆ°ng CHÆ¯A gÃ£y khi chÆ°a Ä‘á»§ 150ms',
  !ov.classList.contains('is-fall') && (Date.now() - tFirst) < 150);
await sleep(120);
check('D9: qua má»‘c minShow â†’ overlay gÃ£y',
  ov.classList.contains('is-fall'));
// KhÃ´ng truyá»n opts â†’ dÃ¹ng TRE_TIMING.load (0) â†’ gÃ£y NGAY.
ld.showTreLoading('Chá» thÆ°á»ng');
ld.hideTreLoading(true); // khÃ´ng opts
await sleep(40);
check('D10: khÃ´ng truyá»n opts â†’ gÃ£y NGAY theo TRE_TIMING.load (0)',
  ov.classList.contains('is-fall') && !ov.classList.contains('is-gone'));


// â•â•â• E. MINI-GAME CHáº Y TRONG KHI Náº P â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- E. MINI-GAME CHáº Y TRONG KHI Náº P ---');
ld.TRE_TIMING.load = 0;
ld.TRE_TIMING.fall = 60;
ld.TRE_TIMING.hitStep = 5;
const btnHit = document.getElementById('tre-hit-btn');
const pctEl = document.getElementById('tre-progress-pct');
const gameCounter = document.getElementById('tre-game-counter');
ld.showTreLoading('Äang náº¡p dá»¯ liá»‡u nhÃ  mÃ¡yâ€¦', { mode: 'game' });
check('E1: mini-game + nÃºt bá» qua hiá»‡n ngay trong lÃºc boot Ä‘ang náº¡p',
  ov.classList.contains('is-game') && !ov.classList.contains('is-fall') &&
  !ov.classList.contains('is-gone') && btnHit.hidden === false);
check('E2: game counter tÃ¡ch biá»‡t vá»›i thanh tiáº¿n Ä‘á»™ táº£i',
  pctEl.textContent === '0%' && gameCounter.textContent.includes('0/20') &&
  gameCounter.hidden === false);
for (let i = 0; i < 4; i++) ld.hitTreLoading();
check('E3: 4 nhÃ¡t chá»‰ cáº­p nháº­t game counter, tiáº¿n Ä‘á»™ táº£i khÃ´ng Ä‘á»•i',
  pctEl.textContent === '0%' && gameCounter.textContent.includes('4/20') &&
  ov.classList.contains('is-game'));
await sleep(20);
check('E3b: má»—i nhÃ¡t gáº¯n .is-hitting (kÃ­ch hoáº¡t treHitOnce 1 nhÃ¡t â€” IDLE Ä‘á»©ng yÃªn, khÃ´ng láº·p)',
  ov.classList.contains('is-hitting'));
for (let i = 0; i < 16; i++) ld.hitTreLoading();
check('E4: hoÃ n thÃ nh mini-game khÃ´ng Ä‘Ã³ng overlay trÆ°á»›c khi boot xong',
  !ov.classList.contains('is-fall') && !ov.classList.contains('is-gone') &&
  btnHit.hidden === true && gameCounter.textContent.includes('ÄÃ£ cháº·t xong'));
check('E5: hit sau khi hoÃ n thÃ nh game khÃ´ng áº£nh hÆ°á»Ÿng boot',
  ld.hitTreLoading() === 100 && !ov.classList.contains('is-fall'));
ld.hideTreLoading(true);
await sleep(20);
check('E6: boot hoÃ n táº¥t â†’ cÃ¢y gÃ£y vÃ  tiáº¿n Ä‘á»™ Ä‘áº¡t 100%',
  ov.classList.contains('is-fall') && pctEl.textContent === '100%' &&
  txt.textContent === 'Xong rá»“i!');
await sleep(120);
check('E7: tre náº±m háº³n â†’ overlay áº©n', ov.classList.contains('is-gone'));
ld.showTreLoading('Boot lá»—i', { mode: 'game' });
ld.hideTreLoading(false);
await sleep(20);
check('E8: game + Lá»–I â†’ KHÃ”NG is-game / KHÃ”NG is-fall, chá»‰ is-gone (khÃ´ng nÃ³i dá»‘i)',
  !ov.classList.contains('is-game') && !ov.classList.contains('is-fall') &&
  ov.classList.contains('is-gone'));

ld.TRE_TIMING.progressFinish = 160;
ld.showTreLoading('Äang náº¡pâ€¦', { mode: 'game' });
await sleep(100);
const progressDuringLoad = Number.parseInt(pctEl.textContent, 10);
check('E9: tiáº¿n Ä‘á»™ tÄƒng dáº§n trong lÃºc táº£i nhÆ°ng chÆ°a Ä‘áº¡t 100%',
  progressDuringLoad > 0 && progressDuringLoad < 100);
ld.hideTreLoading(true);
await sleep(70);
check('E10: tiáº¿n Ä‘á»™ váº«n chÆ°a 100% trong pha hoÃ n táº¥t, overlay chÆ°a gÃ£y',
  Number.parseInt(pctEl.textContent, 10) < 100 && !ov.classList.contains('is-fall'));
await sleep(180);
check('E11: tiáº¿n Ä‘á»™ mÆ°á»£t tá»›i 100% rá»“i má»›i báº¯t Ä‘áº§u pha gÃ£y',
  pctEl.textContent === '100%' && ov.classList.contains('is-fall'));
await sleep(100);
ld.TRE_TIMING.progressFinish = 0;

// â•â•â• F. Bá»Ž MINI-GAME KHÃ”NG Bá»Ž QUA BOOT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('--- F. Bá»Ž MINI-GAME KHÃ”NG Bá»Ž QUA BOOT ---');
ld.TRE_TIMING.load = 0;
ld.TRE_TIMING.fall = 60;
const btnSkip = document.getElementById('tre-skip-btn');
ld.showTreLoading('Boot láº§n ná»¯a', { mode: 'game' });
check('F1: nÃºt bá» trÃ² chÆ¡i hiá»‡n cÃ¹ng mini-game',
  ov.classList.contains('is-game') && btnSkip.hidden === false && btnHit.hidden === false);
ld.skipTreLoading();
check('F2: bá» game chá»‰ áº©n nÃºt chÆ¡i; overlay váº«n chá» boot vÃ  tiáº¿n Ä‘á»™ chÆ°a hoÃ n táº¥t',
  !ov.classList.contains('is-fall') && !ov.classList.contains('is-gone') &&
  btnSkip.hidden === true && btnHit.hidden === true && pctEl.textContent !== '100%' &&
  txt.textContent.includes('Äang náº¡p dá»¯ liá»‡u'));
ld.hideTreLoading(true);
await sleep(120); // fall = 60ms
check('F3: boot hoÃ n táº¥t má»›i gÃ£y tre vÃ  Ä‘Ã³ng overlay', ov.classList.contains('is-fall'));
await sleep(80);
check('F4: skipTreLoading ngoÃ i game khÃ´ng lÃ m thay Ä‘á»•i tráº¡ng thÃ¡i',
  ld.skipTreLoading() === 0 && ov.classList.contains('is-gone'));

// â”€â”€ G. XOAY CÃ‚U VUI khi chá» (opts.phrases â€” 20/10/2026) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ld.TRE_TIMING.load = 0;
ld.TRE_TIMING.fall = 60;
ld.TRE_TIMING.phrase = 600;   // production clamp = tá»‘i thiá»ƒu 600ms/cÃ¢u
const PHRASES = ['CÃ¢u 1 ðŸŽ‹', 'CÃ¢u 2 ðŸŒ¿', 'CÃ¢u 3 ðŸ’ª'];
ld.showTreLoading('NhÃ£n máº·c Ä‘á»‹nh', { phrases: PHRASES });
check('G1: má»Ÿ overlay lÃ  hiá»‡n NGAY cÃ¢u Äáº¦U TIÃŠN (khÃ´ng pháº£i nhÃ£n máº·c Ä‘á»‹nh)', txt.textContent === 'CÃ¢u 1 ðŸŽ‹');
await sleep(700);
check('G2: tá»± xoay sang cÃ¢u káº¿ tiáº¿p khi chá» lÃ¢u', txt.textContent !== 'CÃ¢u 1 ðŸŽ‹' && PHRASES.includes(txt.textContent));
const lastPhrase = txt.textContent;
ld.hideTreLoading(false);
check('G3: xong/lá»—i â†’ Dá»ªNG xoay (khÃ´ng nháº£y cÃ¢u ná»¯a)', txt.textContent === lastPhrase || txt.textContent === 'Xong rá»“i!');
await sleep(80);
check('G4: sau khi dá»n overlay, cÃ¢u khÃ´ng tiáº¿p tá»¥c Ä‘á»•i', txt.textContent === lastPhrase || txt.textContent === 'Xong rá»“i!');
ld.showTreLoading('Chá»‰ má»™t nhÃ£n');
await sleep(50);
check('G5: KHÃ”NG truyá»n phrases â†’ giá»¯ nguyÃªn 1 nhÃ£n nhÆ° cÅ© (má»i chá»— chá» khÃ¡c khÃ´ng Ä‘á»•i)',
  txt.textContent === 'Chá»‰ má»™t nhÃ£n');
ld.hideTreLoading(true);
await sleep(120);
check('G6: cáº¥u trÃºc loading.js â€” cÃ³ TRE_TIMING.phrase + hÃ m xoay cÃ¢u (clear khi gÃ£y)',
  /phrase:\s*\d+/.test(fs.readFileSync(new URL('../js/loading.js', import.meta.url), 'utf8')) &&
  ldJs.includes('function treStartPhrases') && ldJs.includes('function treStopPhrases') &&
  /function treFall\(el\)[\s\S]{0,220}?treStopPhrases\(\)/.test(ldJs));

console.log(`\nKáº¾T QUáº¢: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

