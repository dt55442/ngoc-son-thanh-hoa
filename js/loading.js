// ═══════════════════════════════════════════════════════════
// js/loading.js — ICON LOADING "ANH NÔNG DÂN CHẶT TRE"
// ───────────────────────────────────────────────────────────
// Overlay toàn màn hình (#tre-loading-overlay trong index.html — markup đặt
// ĐẦU <body> nên hiện NGAY khi mở trang, che khoảng trắng lúc app khởi động).
// Mọi chỗ file/thao tác đang CHỜ PHẢN HỒI đều gọi showTreLoading(...):
//   khởi động app · Trợ lý AI · xuất Excel · đẩy/tải mây (2 nút thủ công) ·
//   backup (phục hồi máy/mây + danh sách backup mây) · MỞ TAB LẦN ĐẦU
//   trong phiên (switchView — chờ đủ TRE_TIMING.firstTab rồi mới gãy).
// Cảnh = SPRITE 18 FRAME (icons/loading/tre-sprite.png — 6 cột × 3 dòng · 640×360,
// ghép bởi make-loading-sprite.cjs từ 3 sheet AI): PHA CHẶT = frame 1–13
// (keyframes treChop trong styles.css — lặp, 80ms/frame: nông dân vung rìu bổ
// tre, mảnh gỗ + lá văng). KHI NỘI ĐÃ TẢI XONG → class .is-fall = frame 14–18
// (treFall 700ms = TRE_TIMING.fall) — tre GÃY đổ sang PHẢI (ngược phía người
// đứng chặt bên trái), bụi mù, giữ frame gốc cây + bột trắng; sau TRE_TIMING.fall
// overlay mờ dần (class .is-gone).
// · Refcount: nhiều tác vụ chờ song song → chỉ ẩn khi TẤT CẢ đã xong.
// · LỖI (ok === false) → tre KHÔNG gãy, overlay mờ luôn (không nói dối "xong").
// · Timer dùng setTimeout có unref() trong Node → test headless không bị giữ sống.
// · Nền lỗi watchdog (boot-guard, z-index 99999) luôn nổi TRÊN overlay (10050).
// ═══════════════════════════════════════════════════════════
const TRE_OVERLAY_ID = 'tre-loading-overlay';
const TRE_TEXT_ID = 'tre-loading-text';
// Thời gian (ms) — export object mutable để test headless thu nhỏ cho nhanh:
//   minShow  = thời gian TỐI THIỂU phải thấy cảnh "đang chặt" trước khi gãy
//              (các chỗ chờ ĐANG CÓ: AI · Excel · mây · backup — giữ nguyên)
//   firstTab = thời gian TỐI THIỂU riêng cho MỞ TAB LẦN ĐẦU trong phiên
//              (switchView truyền qua hideTreLoading(ok, { minShow: firstTab })
//              → chạy TRỌN cảnh chặt → gãy → mờ, KỂ CẢ tab đã render xong)
//   fall     = thời gian cây tre ngã + nằm yên trước khi overlay mờ dần
const TRE_TIMING = { minShow: 220, firstTab: 900, fall: 700 };
let treDepth = 0;       // số tác vụ ĐANG chờ (refcount)
let treShownAt = 0;     // thời điểm hiện loading gần nhất
let treHideTimer = 0;
let treFallTimer = 0;

function treEl(id) {
  try { return document.getElementById(id); } catch (e) { return null; }
}
// setTimeout có unref() trong Node (test headless thoát ngay, không chờ timer);
// trình duyệt trả về number → typeof t.unref !== 'function' → bỏ qua.
function treLater(fn, ms) {
  const t = setTimeout(fn, ms);
  if (t && typeof t.unref === 'function') t.unref();
  return t;
}
function treClearTimers() {
  clearTimeout(treHideTimer); clearTimeout(treFallTimer);
  treHideTimer = 0; treFallTimer = 0;
}

// Hiện loading — gọi khi BẮT ĐẦU chờ (refcount++)
function showTreLoading(label) {
  treDepth++;
  const el = treEl(TRE_OVERLAY_ID);
  if (!el) return;
  treClearTimers();
  el.classList.remove('is-fall', 'is-gone');  // mở lại từ đầu: quay lại pha CHẶT
  treShownAt = Date.now();
  if (label != null && label !== '') {
    const txt = treEl(TRE_TEXT_ID);
    if (txt) txt.textContent = String(label);
  }
}

// Ẩn loading — gọi khi ĐÃ CÓ kết quả (refcount--; về 0 mới thực sự ẩn).
//   ok !== false → nội dung tải xong → cây tre GÃY rồi overlay mờ.
//   ok === false → lỗi → tre đứng im, overlay mờ luôn.
//   opts.minShow (tùy chọn) → thời gian tối thiểu thấy cảnh "đang chặt" THAY
//   cho TRE_TIMING.minShow — switchView truyền TRE_TIMING.firstTab khi mở TAB
//   LẦN ĐẦU để animation chạy đủ dù tab render xong tức thì.
function hideTreLoading(ok, opts) {
  if (treDepth > 0) treDepth--;
  if (treDepth > 0) return;                 // còn tác vụ khác vẫn đang chờ
  const el = treEl(TRE_OVERLAY_ID);
  if (!el) return;
  treClearTimers();
  // Trả đủ thời gian tối thiểu để người thấy cảnh "đang chặt" trước khi gãy
  // (trường hợp chờ quá nhanh — ví dụ xuất Excel chạy sync trong 1 frame)
  const minShow = (opts && typeof opts.minShow === 'number') ? opts.minShow : TRE_TIMING.minShow;
  const wait = Math.max(0, minShow - (Date.now() - treShownAt));
  treHideTimer = treLater(() => {
    treHideTimer = 0;
    if (ok === false) {                      // LỖI → tre KHÔNG gãy
      el.classList.add('is-gone');
      return;
    }
    el.classList.add('is-fall');             // TẢI XONG → GÃY nguyên cây sang phải
    const txt = treEl(TRE_TEXT_ID);
    if (txt) txt.textContent = 'Xong rồi!';
    treFallTimer = treLater(() => {
      treFallTimer = 0;
      el.classList.add('is-gone');           // tre đã nằm hẳn → mờ dần
    }, TRE_TIMING.fall);
  }, wait);
}

export { TRE_OVERLAY_ID, TRE_TEXT_ID, TRE_TIMING, hideTreLoading, showTreLoading };