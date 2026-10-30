// ═══════════════════════════════════════════════════════════
// js/loading.js — ICON LOADING "ANH NÔNG DÂN CHẶT TRE" (SPRITE 18 FRAME)
// ───────────────────────────────────────────────────────────
// Overlay toàn màn hình (#tre-loading-overlay — markup ĐẦU <body>, hiện NGAY
// khi mở trang). Mọi chỗ CHỜ PHẢN HỒI gọi showTreLoading(...): boot · AI ·
// xuất Excel · đẩy/tải mây (2 nút thủ công) · backup.
// Cảnh 2 pha (styles.css): treChop frame 1–13 (~64ms/frame ≈ 0.83s/vòng —
// 6 vòng trong cửa sổ tải ~5s; CHỈ chế độ auto chạy lặp; game IDLE đứng yên
// frame 1) — mỗi nhát bấm game
// chạy đúng 1 vòng treHitOnce 600ms qua class .is-hitting → .is-fall
// treFall 700ms (frame 14–18 — cây GÃY) → .is-gone mờ dần.
// 2 CHẾ ĐỘ TIẾN ĐỘ (thanh #tre-progress 0→100% — 1 nguồn sự thật do đây ghi):
//   · auto (mặc định): ticker theo TRE_TIMING.load — task xong + tròn
//     load mới gãy; task chậm hơn thì gãy ngay khi xong.
//   · game "NGHI THỨC CẦP LUỒNG": chơi trong lúc ứng dụng nạp; tự kết thúc khi
//     boot sẵn sàng. Bộ đếm game tách biệt với thanh tiến độ tải.
// Refcount: nhiều tác vụ chờ → chỉ kết thúc khi TẤT CẢ xong. LỖI (ok=false)
// → tre KHÔNG gãy. Timer unref() trong Node → test headless không bị giữ.
// Boot-guard (99999) luôn nổi TRÊN overlay (10050).
// ═══════════════════════════════════════════════════════════
const TRE_OVERLAY_ID = 'tre-loading-overlay';
const TRE_TEXT_ID = 'tre-loading-text';
const TRE_PROGRESS_ID = 'tre-progress';
const TRE_FILL_ID = 'tre-progress-fill';
const TRE_PCT_ID = 'tre-progress-pct';
const TRE_SCENE_ID = 'tre-loading-scene';
const TRE_BTN_ID = 'tre-hit-btn';
const TRE_SKIP_ID = 'tre-skip-btn';   // nút "Bỏ qua" — vào thẳng khi đang game
const TRE_CARD_ID = 'tre-loading-card';
// Thời gian (ms) — export object mutable để test headless thu nhỏ cho nhanh:
//   load     = cửa sổ auto mặc định
//   fall     = thời gian tre ngã trước khi overlay mờ (đồng bộ CSS 700ms)
//   hitStep  = số phần trăm quy đổi mỗi nhát (100 / 5 = 20 nhát)
//   progressFinish = thời gian hoàn tất thanh tải sau khi boot xong
const TRE_TIMING = { load: 5000, fall: 700, hitStep: 5, phrase: 1800, progressFinish: 360 };
let treDepth = 0;       // số tác vụ ĐANG chờ (refcount)
let treShownAt = 0;     // thời điểm hiện loading gần nhất
let treDur = 5000;      // cửa sổ auto của lần hiện này (ms)
let treMode = 'auto';   // 'auto' | 'game' — ghi nhận lúc show
let treGame = false;    // game có thể chơi trong lúc tải
let treGameHits = 0;
let trePct = 0;         // tiến độ hiện tại 0..100
let treHideTimer = 0, treFallTimer = 0, treTickFrame = 0, treFinishFrame = 0;
let treHitBound = false;
let treHitFrame = 0;
// ── XOAY CÂU VUI (opts.phrases) ──────────────────────────────────────
// Nhiều câu → đổi nhãn mỗi TRE_TIMING.phrase ms để người dùng thấy app vẫn
// đang chạy (không tưởng máy treo). Chỉ dùng khi caller truyền opts.phrases;
// không truyền → giữ nguyên 1 nhãn như cũ.
let trePhrases = [];
let trePhraseIdx = 0;
let trePhraseTimer = 0;
function treStopPhrases() {
  if (trePhraseTimer) clearInterval(trePhraseTimer);
  trePhraseTimer = 0;
}
function treStartPhrases(list) {
  treStopPhrases();
  trePhrases = Array.isArray(list) ? list.filter(s => typeof s === 'string' && s) : [];
  trePhraseIdx = 0;
  if (trePhrases.length < 2) return;
  const gap = Math.max(600, Number(TRE_TIMING.phrase) || 2200);
  trePhraseTimer = setInterval(() => {
    trePhraseIdx = (trePhraseIdx + 1) % trePhrases.length;
    const txt = treEl(TRE_TEXT_ID);
    if (txt) txt.textContent = trePhrases[trePhraseIdx];
  }, gap);
  if (trePhraseTimer && typeof trePhraseTimer.unref === 'function') trePhraseTimer.unref();
}

function treEl(id) {
  try { return document.getElementById(id); } catch (e) { return null; }
}
// setTimeout/setInterval có unref() trong Node (test headless thoát ngay)
function treLater(fn, ms) {
  const t = setTimeout(fn, ms);
  if (t && typeof t.unref === 'function') t.unref();
  return t;
}
function treRequestFrame(fn) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return treLater(() => fn(Date.now()), 16);
}
function treCancelFrame(id) {
  if (!id) return;
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
}
function treClearTimers() {
  clearTimeout(treHideTimer); clearTimeout(treFallTimer);
  treHideTimer = 0; treFallTimer = 0;
  treCancelFrame(treFinishFrame);
  treFinishFrame = 0;
}
function treStopTick() {
  treCancelFrame(treTickFrame);
  treTickFrame = 0;
}

// ── TIẾN ĐỘ: ghi width + nhãn % + aria (chung cho 2 chế độ) ──────────
function treSetProgress(pct) {
  trePct = Math.max(0, Math.min(100, pct));
  const fill = treEl(TRE_FILL_ID);
  if (fill && fill.style) fill.style.transform = 'scaleX(' + (trePct / 100) + ')';
  const pctEl = treEl(TRE_PCT_ID);
  if (pctEl) pctEl.textContent = Math.round(trePct) + '%';
  const bar = treEl(TRE_PROGRESS_ID);
  if (bar && bar.setAttribute) bar.setAttribute('aria-valuenow', String(Math.round(trePct)));
}
// Tiến độ minh họa: tăng đều, giới hạn ở 90% cho đến khi công việc hoàn tất.
function treStartTick() {
  treStopTick();
  let lastFrameAt = null;
  const tick = (timestamp) => {
    const now = Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now();
    if (lastFrameAt !== null) {
      const frameMs = Math.min(32, Math.max(0, now - lastFrameAt));
      treSetProgress(Math.min(90, trePct + frameMs * 0.018));
    }
    lastFrameAt = now;
    treTickFrame = treRequestFrame(tick);
  };
  treTickFrame = treRequestFrame(tick);
}
function treFinishProgress(el) {
  treStopTick();
  const start = trePct;
  let startedAt = null;
  const duration = Math.max(0, Number(TRE_TIMING.progressFinish) || 0);
  if (!duration) {
    treSetProgress(100);
    treFall(el);
    return;
  }
  const finish = (timestamp) => {
    const now = Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now();
    if (startedAt === null) startedAt = now;
    const t = Math.min(1, Math.max(0, (now - startedAt) / duration));
    const eased = 1 - Math.pow(1 - t, 3);
    treSetProgress(start + (100 - start) * eased);
    if (t < 1) treFinishFrame = treRequestFrame(finish);
    else {
      treFinishFrame = 0;
      treFall(el);
    }
  };
  treFinishFrame = treRequestFrame(finish);
}
// ── GÃY khi tải hoàn tất → is-fall → is-gone ─────────────────────────
function treFall(el) {
  treStopTick();
  treCancelFrame(treHitFrame);
  treHitFrame = 0;
  treStopPhrases();      // dừng xoay câu — nhãn chuyển "Xong rồi!"
  treSetProgress(100);
  treGame = false;
  treSetGameButtons(true);
  const counter = treEl('tre-game-counter');
  if (counter) counter.hidden = true;
  el.classList.remove('is-game', 'is-hitting');
  el.classList.add('is-fall');
  const txt = treEl(TRE_TEXT_ID);
  if (txt) txt.textContent = 'Xong rồi!';
  treFallTimer = treLater(() => {
    treFallTimer = 0;
    el.classList.add('is-gone');
  }, TRE_TIMING.fall);
}
function treSetGameButtons(hidden) {
  const btn = treEl(TRE_BTN_ID);
  if (btn) btn.hidden = hidden;
  const skip = treEl(TRE_SKIP_ID);
  if (skip) skip.hidden = hidden;
}
function treSetLoadingStatus(label) {
  if (!label) return;
  const value = String(label);
  if (trePhrases.length) {
    trePhrases[0] = value;
    trePhraseIdx = 0;
  }
  const txt = treEl(TRE_TEXT_ID);
  if (txt) txt.textContent = value;
}
// Bộ đếm game không dùng phần trăm của tiến độ tải.
function treHint() {
  const counter = treEl('tre-game-counter');
  if (counter) {
    counter.hidden = false;
    counter.textContent = treGameHits >= 20
      ? 'Đã chặt xong! Đang nạp tiếp…'
      : 'Nghi thức cầu luồng · ' + treGameHits + '/20 nhát';
  }
}
// ── MINI-GAME: có thể chơi trong lúc ứng dụng đang nạp ───────────────
function treEnterGame(el) {
  treGame = true;
  treGameHits = 0;
  el.classList.remove('is-fall', 'is-gone');
  el.classList.add('is-game');
  treSetGameButtons(false);
  treHint();
  treBindHits(el);
}
function treScheduleHitAnimation(el) {
  if (!el || !el.classList || treHitFrame) return;
  el.classList.remove('is-hitting');
  treHitFrame = treRequestFrame(() => {
    treHitFrame = 0;
    el.classList.add('is-hitting');
  });
}
// 1 nhát = +1/20 game step; loading progress remains independent.
function hitTreLoading() {
  if (!treGame) return treGameHits * TRE_TIMING.hitStep;
  treGameHits = Math.min(20, treGameHits + 1);
  const card = treEl(TRE_CARD_ID);
  if (card && card.classList) {
    if (typeof card.animate === 'function') {
      card.animate([
        { transform: 'translateX(0) scale(1)' },
        { transform: 'translateX(-3px) scale(.985)' },
        { transform: 'translateX(3px) scale(1.012)' },
        { transform: 'translateX(0) scale(1)' }
      ], { duration: 160, easing: 'ease-out' });
    } else {
      card.classList.remove('tre-hit-punch');
      treRequestFrame(() => card.classList.add('tre-hit-punch'));
    }
  }
  const ov = treEl(TRE_OVERLAY_ID);
  treScheduleHitAnimation(ov);
  treHint();
  if (treGameHits >= 20) {
    treGame = false;
    treSetGameButtons(true);
    treHint();
  }
  return treGameHits * TRE_TIMING.hitStep;
}
// Bỏ phần chơi, nhưng không đóng overlay hay bỏ qua việc nạp dữ liệu.
function skipTreLoading() {
  if (!treGame) return treGameHits * TRE_TIMING.hitStep;
  treGame = false;
  treSetGameButtons(true);
  const counter = treEl('tre-game-counter');
  if (counter) counter.hidden = true;
  treSetLoadingStatus('Đã bỏ qua trò chơi · Đang nạp dữ liệu…');
  return treGameHits * TRE_TIMING.hitStep;
}
// Gắn click + phím Space/Enter 1 lần duy nhất (guard cho stub DOM khi test)
function treBindHits(el) {
  if (treHitBound) return;
  treHitBound = true;
  try {
    if (el && typeof el.addEventListener === 'function') {
      const scene = treEl(TRE_SCENE_ID);
      if (scene && typeof scene.addEventListener === 'function')
        scene.addEventListener('click', () => { if (treGame) hitTreLoading(); });
      const hitButton = treEl(TRE_BTN_ID);
      if (hitButton && typeof hitButton.addEventListener === 'function')
        hitButton.addEventListener('click', () => { if (treGame) hitTreLoading(); });
      const skip = treEl(TRE_SKIP_ID);
      if (skip && typeof skip.addEventListener === 'function') {
        skip.addEventListener('click', () => { skipTreLoading(); });
      }
      // xong 1 nhát treHitOnce → tự gỡ .is-hitting (cảnh về frame 1 đứng yên)
      el.addEventListener('animationend', (e) => {
        if (e && e.animationName === 'treHitOnce' && el.classList)
          el.classList.remove('is-hitting');
      });
    }
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        if (!treGame) return;
        if (e && e.target && e.target !== el && e.target !== treEl(TRE_SCENE_ID)) return;
        const k = e && e.key;
        if (k === ' ' || k === 'Enter') {
          if (e.preventDefault) e.preventDefault(); // chặn kích hoạt nút lần 2
          hitTreLoading();
        }
      });
    }
  } catch (e) { /* môi trường thiếu addEventListener — bỏ qua */ }
}

// Hiện loading — gọi khi BẮT ĐẦU chờ (refcount++)
//   opts.mode = 'game' → bật chế độ mini-game tùy chọn
//   opts.dur  = cửa sổ auto thay TRE_TIMING.load
function showTreLoading(label, opts) {
  treDepth++;
  treMode = (opts && opts.mode === 'game') ? 'game' : 'auto';
  treGame = false;
  const el = treEl(TRE_OVERLAY_ID);
  if (!el) return;
  treClearTimers();
  treCancelFrame(treHitFrame);
  treHitFrame = 0;
  el.classList.remove('is-fall', 'is-gone', 'is-game', 'is-hitting'); // mở lại từ đầu
  const btn = treEl(TRE_BTN_ID);
  if (btn) btn.hidden = true;
  const skip = treEl(TRE_SKIP_ID);
  if (skip) skip.hidden = true;
  const counter = treEl('tre-game-counter');
  if (counter) counter.hidden = true;
  treShownAt = Date.now();
  treDur = (opts && typeof opts.dur === 'number') ? opts.dur : TRE_TIMING.load;
  treSetProgress(0);
  treStartTick();
  // Nhãn: opts.phrases[0] (nếu có) → xoay tiếp mỗi TRE_TIMING.phrase
  const list = (opts && Array.isArray(opts.phrases)) ? opts.phrases.filter(s => typeof s === 'string' && s) : [];
  const shownLabel = list.length ? list[0] : label;
  if (shownLabel != null && shownLabel !== '') {
    const txt = treEl(TRE_TEXT_ID);
    if (txt) txt.textContent = String(shownLabel);
  }
  treStartPhrases(list);
  if (treMode === 'game') treEnterGame(el);
}

// Ẩn loading — gọi khi ĐÃ CÓ kết quả (refcount--; về 0 mới kết thúc)
//   ok === false → LỖI → tre KHÔNG gãy, overlay mờ sau khoảng chờ
//   mode game + ok → hoàn tất tiến độ rồi tự ẩn, không chờ đủ lượt chơi
//   opts.minShow → thời gian TỐI THIỂU thấy cảnh
function hideTreLoading(ok, opts) {
  if (treDepth > 0) treDepth--;
  if (treDepth > 0) return;                 // còn tác vụ khác vẫn đang chờ
  const el = treEl(TRE_OVERLAY_ID);
  if (!el) return;
  treClearTimers();
  const minShow = (opts && typeof opts.minShow === 'number') ? opts.minShow : treDur;
  const wait = (treMode === 'game' && ok !== false)
    ? 0
    : Math.max(0, minShow - (Date.now() - treShownAt));
  treHideTimer = treLater(() => {
    treHideTimer = 0;
    if (ok === false) {
      treStopTick();
      treStopPhrases();
      treGame = false;
      treSetGameButtons(true);
      const counter = treEl('tre-game-counter');
      if (counter) counter.hidden = true;
      el.classList.remove('is-game', 'is-hitting');
      el.classList.add('is-gone');
      return;
    }
    treStopPhrases();
    treFinishProgress(el);
  }, wait);
}

export { TRE_OVERLAY_ID, TRE_TEXT_ID, TRE_TIMING, hideTreLoading, showTreLoading, hitTreLoading, skipTreLoading, treSetLoadingStatus as setTreLoadingStatus };