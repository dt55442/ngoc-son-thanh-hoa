// ═══════════════════════════════════════════════════════════
// js/loading.js — ICON LOADING "ANH NÔNG DÂN CHẶT TRE" (SPRITE 18 FRAME)
// ───────────────────────────────────────────────────────────
// Overlay toàn màn hình (#tre-loading-overlay — markup ĐẦU <body>, hiện NGAY
// khi mở trang). Mọi chỗ CHỜ PHẢN HỒI gọi showTreLoading(...): boot · AI ·
// xuất Excel · đẩy/tải mây (2 nút thủ công) · backup · MỞ TAB LẦN ĐẦU.
// Cảnh 2 pha (styles.css): treChop frame 1–13 (~64ms/frame ≈ 0.83s/vòng —
// 6 vòng trong cửa sổ tải ~5s; CHỈ chế độ auto chạy lặp; game IDLE đứng yên
// frame 1) — mỗi nhát bấm game
// chạy đúng 1 vòng treHitOnce 600ms qua class .is-hitting → .is-fall
// treFall 700ms (frame 14–18 — cây GÃY) → .is-gone mờ dần.
// 2 CHẾ ĐỘ TIẾN ĐỘ (thanh #tre-progress 0→100% — 1 nguồn sự thật do đây ghi):
//   · auto (mặc định): ticker theo TRE_TIMING.load (~5s) — task xong + tròn
//     load mới gãy; task chậm hơn thì gãy ngay khi xong. Trong lúc chờ
//     main.js.preloadCoreViews() vẽ sẵn bảng Kanban → mở tab không lag.
//   · game "NGHI THỨC CẦP LUỒNG" (CHỈ BOOT — mỗi lần mở trang): bấm "Chặt!"
//     5%/nhát (20 nhát) đủ 100% cây MỚI gãy, MỚI thấy Dashboard (nền blur);
//     vội thì bấm NÚT "Bỏ qua" (skipTreLoading) — gãy ngay, không cần đủ nhát.
// Refcount: nhiều tác vụ chờ → chỉ kết thúc khi TẤT CẢ xong. LỖI (ok=false)
// → tre KHÔNG gãy. Timer unref() trong Node → test headless không bị giữ.
// Boot-guard (99999) luôn nổi TRÊN overlay (10050).
// ═══════════════════════════════════════════════════════════
const TRE_OVERLAY_ID = 'tre-loading-overlay';
const TRE_TEXT_ID = 'tre-loading-text';
const TRE_PROGRESS_ID = 'tre-progress';
const TRE_FILL_ID = 'tre-progress-fill';
const TRE_PCT_ID = 'tre-progress-pct';
const TRE_BTN_ID = 'tre-hit-btn';
const TRE_SKIP_ID = 'tre-skip-btn';   // nút "Bỏ qua" — vào thẳng khi đang game
const TRE_CARD_ID = 'tre-loading-card';
// Thời gian (ms) — export object mutable để test headless thu nhỏ cho nhanh:
//   load     = cửa sổ auto MẶC ĐỊNH (~5s — đủ thấy cảnh + preload chạy)
//   firstTab = cửa sổ MỞ TAB LẦN ĐẦU (switchView truyền qua opts.dur)
//   fall     = thời gian tre ngã trước khi overlay mờ (đồng bộ CSS 700ms)
//   hitStep  = % mỗi nhát bấm ở chế độ game (100 / 5 = 20 nhát)
const TRE_TIMING = { load: 5000, firstTab: 5000, fall: 700, hitStep: 5 };
let treDepth = 0;       // số tác vụ ĐANG chờ (refcount)
let treShownAt = 0;     // thời điểm hiện loading gần nhất
let treDur = 5000;      // cửa sổ auto của lần hiện này (ms)
let treMode = 'auto';   // 'auto' | 'game' — ghi nhận lúc show
let treGame = false;    // đang CHỜ người bấm đủ 100%?
let trePct = 0;         // tiến độ hiện tại 0..100
let treHideTimer = 0, treFallTimer = 0, treTickTimer = 0;
let treHitBound = false;

function treEl(id) {
  try { return document.getElementById(id); } catch (e) { return null; }
}
// setTimeout/setInterval có unref() trong Node (test headless thoát ngay)
function treLater(fn, ms) {
  const t = setTimeout(fn, ms);
  if (t && typeof t.unref === 'function') t.unref();
  return t;
}
function treClearTimers() {
  clearTimeout(treHideTimer); clearTimeout(treFallTimer);
  treHideTimer = 0; treFallTimer = 0;
}
function treStopTick() { clearInterval(treTickTimer); treTickTimer = 0; }

// ── TIẾN ĐỘ: ghi width + nhãn % + aria (chung cho 2 chế độ) ──────────
function treSetProgress(pct) {
  trePct = Math.max(0, Math.min(100, pct));
  const fill = treEl(TRE_FILL_ID);
  if (fill && fill.style) fill.style.width = trePct + '%';
  const pctEl = treEl(TRE_PCT_ID);
  if (pctEl) pctEl.textContent = Math.round(trePct) + '%';
  const bar = treEl(TRE_PROGRESS_ID);
  if (bar && bar.setAttribute) bar.setAttribute('aria-valuenow', String(Math.round(trePct)));
}
// auto: bắn đều ~100ms theo elapsed/dur (thanh mượt nhờ CSS transition)
function treStartTick() {
  treStopTick();
  const t = setInterval(() => {
    if (treGame) return; // game tự điều khiển — không đụng
    treSetProgress((Date.now() - treShownAt) / Math.max(1, treDur) * 100);
  }, 100);
  if (t && typeof t.unref === 'function') t.unref();
  treTickTimer = t;
}
// ── GÃY (auto xong / game đạt 100%) → is-fall → is-gone ──────────────
function treFall(el) {
  treStopTick();
  treSetProgress(100);
  el.classList.add('is-fall');
  const txt = treEl(TRE_TEXT_ID);
  if (txt) txt.textContent = 'Xong rồi!';
  treFallTimer = treLater(() => {
    treFallTimer = 0;
    el.classList.add('is-gone');
  }, TRE_TIMING.fall);
}
// Nhãn ở chế độ game — cập nhật sau mỗi nhát bấm
function treHint() {
  const txt = treEl(TRE_TEXT_ID);
  if (txt) {
    txt.textContent = 'Nghi thức cầu luồng — ' + Math.round(trePct) +
      '% (còn ' + Math.ceil((100 - trePct) / Math.max(1, TRE_TIMING.hitStep)) + ' nhát)';
  }
}
// ── CHẾ ĐỘ GAME: boot xong NHƯNG KHÔNG tự gãy — chờ người bấm ────────
function treEnterGame(el) {
  treStopTick();
  treGame = true;
  treSetProgress(0);
  el.classList.remove('is-fall', 'is-gone');
  el.classList.add('is-game');
  const btn = treEl(TRE_BTN_ID);
  if (btn) btn.hidden = false;   // hiện nút "Chặt! (+5%)"
  const skip = treEl(TRE_SKIP_ID);
  if (skip) skip.hidden = false; // hiện nút "Bỏ qua" (lối tắt vào thẳng)
  treHint();
  treBindHits(el);
}
// 1 nhát = +hitStep % → đủ 100% → gãy. Export hitTreLoading (test + handler).
function hitTreLoading() {
  if (!treGame) return trePct;   // không ở game → bỏ qua an toàn
  treSetProgress(trePct + TRE_TIMING.hitStep);
  const card = treEl(TRE_CARD_ID);
  if (card && card.classList) {  // rung nhẹ cho đã bấm
    card.classList.remove('tre-hit-punch');
    void card.offsetWidth;       // ép reflow để animation chạy lại
    card.classList.add('tre-hit-punch');
  }
  const ov = treEl(TRE_OVERLAY_ID); // CHẶT 1 NHÁT: .is-hitting → treHitOnce 600ms
  if (ov && ov.classList) {
    ov.classList.remove('is-hitting');
    void ov.offsetWidth;         // ép reflow → nhát mới chạy lại từ đầu
    ov.classList.add('is-hitting');
  }
  treHint();
  if (trePct >= 100) {           // CÂY HẾT — mở khoá Dashboard
    treGame = false;
    const btn = treEl(TRE_BTN_ID);
    if (btn) btn.hidden = true;
    const skip = treEl(TRE_SKIP_ID);
    if (skip) skip.hidden = true;
    if (ov) { ov.classList.remove('is-game', 'is-hitting'); treFall(ov); }
  }
  return trePct;
}
// ⏭ BỎ QUA NGHI THỨC — vào thẳng Dashboard không cần bấm đủ 20 nhát.
// Chỉ có tác dụng khi ĐANG ở game (boot đã xong, dữ liệu đã nạp); tái dùng
// đúng đường GÃY chuẩn (treFall → "Xong rồi!" → is-gone) — không nhánh riêng
// để khỏi lệch hành vi với nhánh đủ 100%.
function skipTreLoading() {
  if (!treGame) return trePct;    // không ở game → bỏ qua an toàn
  treGame = false;
  treSetProgress(100);
  const btn = treEl(TRE_BTN_ID);
  if (btn) btn.hidden = true;
  const skip = treEl(TRE_SKIP_ID);
  if (skip) skip.hidden = true;
  const ov = treEl(TRE_OVERLAY_ID);
  if (ov) { ov.classList.remove('is-game', 'is-hitting'); treFall(ov); }
  return trePct;
}
// Gắn click + phím Space/Enter 1 lần duy nhất (guard cho stub DOM khi test)
function treBindHits(el) {
  if (treHitBound) return;
  treHitBound = true;
  try {
    if (el && typeof el.addEventListener === 'function') {
      el.addEventListener('click', () => { if (treGame) hitTreLoading(); });
      // Nút "Bỏ qua" — bấm là treFall ngay (skipTreLoading tự chặn ngoài game)
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
//   opts.mode = 'game' → CHỈ dùng cho BOOT (mini game chặn Dashboard)
//   opts.dur  = cửa sổ auto thay TRE_TIMING.load (switchView truyền firstTab)
function showTreLoading(label, opts) {
  treDepth++;
  treMode = (opts && opts.mode === 'game') ? 'game' : 'auto';
  treGame = false;
  const el = treEl(TRE_OVERLAY_ID);
  if (!el) return;
  treClearTimers();
  el.classList.remove('is-fall', 'is-gone', 'is-game', 'is-hitting'); // mở lại từ đầu
  const btn = treEl(TRE_BTN_ID);
  if (btn) btn.hidden = true;
  const skip = treEl(TRE_SKIP_ID);
  if (skip) skip.hidden = true;
  treShownAt = Date.now();
  treDur = (opts && typeof opts.dur === 'number') ? opts.dur : TRE_TIMING.load;
  if (treMode === 'game') { treStopTick(); treSetProgress(0); }
  else treStartTick();
  if (label != null && label !== '') {
    const txt = treEl(TRE_TEXT_ID);
    if (txt) txt.textContent = String(label);
  }
}

// Ẩn loading — gọi khi ĐÃ CÓ kết quả (refcount--; về 0 mới kết thúc)
//   ok === false → LỖI → tre KHÔNG gãy, overlay mờ sau khoảng chờ
//   mode game + ok → KHÔNG gãy — vào chờ bấm (treEnterGame, vào NGAY)
//   opts.minShow → thời gian TỐI THIỂU thấy cảnh (switchView = firstTab)
function hideTreLoading(ok, opts) {
  if (treDepth > 0) treDepth--;
  if (treDepth > 0) return;                 // còn tác vụ khác vẫn đang chờ
  const el = treEl(TRE_OVERLAY_ID);
  if (!el) return;
  treClearTimers();
  const minShow = (opts && typeof opts.minShow === 'number') ? opts.minShow : treDur;
  const wait = (treMode === 'game' && ok !== false)
    ? 0                                     // game: vào ngay khi task xong
    : Math.max(0, minShow - (Date.now() - treShownAt));
  treHideTimer = treLater(() => {
    treHideTimer = 0;
    if (ok === false) { treStopTick(); el.classList.add('is-gone'); return; }
    if (treMode === 'game') { treEnterGame(el); return; }
    treFall(el);                            // auto: xong + đủ cửa sổ → GÃY
  }, wait);
}

export { TRE_OVERLAY_ID, TRE_TEXT_ID, TRE_TIMING, hideTreLoading, showTreLoading, hitTreLoading, skipTreLoading };