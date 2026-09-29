// ═══════════════════════════════════════════════════════════
// js/kiln.js — BẢNG ĐIỀU KHIỂN LÒ SẤY (thẻ "Than Hóa + Sấy" — tab Công Đoạn)
//               + BẢNG ĐỘ ẨM LÒ SẤY (tab QC — QC đo & nhập hàng ngày)
// ═══════════════════════════════════════════════════════════
// • Bảng điều khiển = 2 HÀNG lô theo sơ đồ xưởng: hàng 1 = LS1..LS12,
//   hàng 2 = LS13..LS15 (+ vị trí đã khai báo thêm). Mỗi lò 1 THẺ ICON:
//     Vị trí (LS3) · Loại sấy (SUY TỰ ĐỘNG từ lô đang ở lò — 1 lò tại 1 thời
//     điểm chỉ có 1 loại) · thể tích (m³) · số NGÀY đã sấy · ĐỘ ẨM hiện tại.
//   Màu trạng thái: XANH = đang sấy · VÀNG = ĐẠT ẨM (độ ẩm ≤ ngưỡng của loại
//   sấy) · XÁM = chưa sử dụng (lò trống — lô đã chuyển đi).
// • Thao tác nhanh:
//     – KÉO thẻ lò thả vào ô KHO (desktop) hoặc bấm icon kho trên thẻ /
//       menu chạm → chuyển nhanh TẤT CẢ lô trong lò vào Kho (tái dùng logic
//       modal "Chuyển Kho" qua quickTransferLotsToKho — js/batch-modals.js).
//     – CHẠM chọn lò → hiện menu lựa chọn THÊM (các lô nan để sấy — mở form
//       "Thêm Lô Sấy Mới" với vị trí + công đoạn điền sẵn).
// • Độ ẩm: QC nhập trong THẺ "Độ Ẩm Lò Sấy" (tab QC) hàng ngày; ngưỡng đạt
//   chỉnh được (mặc định Sấy 1 ≤ 15% · Sấy 2 ≤ 12%). Độ ẩm "hiện tại" = số đo
//   của HÔM NAY (chưa có thì lấy lần đo trong vòng 3 ngày — chip ghi ngày cũ;
//   quá 3 ngày coi như chưa có, lò vẫn tính là đang sấy).
// ═══════════════════════════════════════════════════════════
import { khoLocationsInUse, openAddLotModal, quickTransferLotsToKho } from './batch-modals.js';
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { trackDeleted } from './tombstone.js';
import { STORAGE_KEY_QC_KILN_HUMIDITY, STORAGE_KEY_QC_KILN_THRESHOLD, STAGES, state } from './state.js';
import { calculateVolume, escapeHTML, formatDateDDMMYY, getBatchStageHistory, getHistoryEntryDays, showToast } from './utils.js';

  // ─── HẰNG SỐ ─────────────────────────────────────────────────
  const KILN_BASE = Array.from({ length: 15 }, (_, i) => `LS${i + 1}`);
  const KILN_ROW_SPLIT = 12;            // hàng 1 = 12 lò đầu, hàng 2 = phần còn lại
  // 3 lò CUỐI (LS13..LS15) là lò RỘNG — chiều ngang GẤP ĐÔI lò thường (theo sơ đồ
  // xưởng); chỉ áp desktop (≥640px) — điện thoại giữ lưới đều như cũ.
  const KILN_WIDE_LOCS = new Set(['LS13', 'LS14', 'LS15']);
  const KILN_HUMIDITY_FRESH_DAYS = 3;   // số đo cũ quá 3 ngày coi như CHƯA có độ ẩm
  const KILN_THRESHOLD_DEFAULT = { say1: 15, say2: 12 };
  const KILN_MATRIX_DAYS = 14;          // ma trận độ ẩm hiển thị 14 ngày gần nhất (cuộn ngang)

  // ─── TIỆN ÍCH NGÀY ───────────────────────────────────────────
  function kilnTodayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }
  // Số ngày giữa 2 ngày ISO (tới − từ; âm nếu "tới" trước "từ"; null nếu sai định dạng)
  function kilnDayDiff(fromIso, toIso) {
    const a = new Date(`${String(fromIso || '').slice(0, 10)}T00:00:00`);
    const b = new Date(`${String(toIso || '').slice(0, 10)}T00:00:00`);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    return Math.round((b - a) / 86400000);
  }

  // ─── DANH SÁCH LÒ (LS1..LS15 + vị trí đã khai báo thêm) ──────
  // Tự tính tại chỗ — không import batch-modals để không tăng vòng phụ thuộc
  function kilnLocations() {
    const extra = (state.x2LotLocations || []).map(v => String(v || '').trim()).filter(Boolean);
    const seen = new Set();
    return [...KILN_BASE, ...extra].filter(l => {
      const k = l.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // ─── ĐỌC DỮ LIỆU LÒ TỪ state.batches ────────────────────────
  // Thể tích 1 lô (m³) — thiếu volume thì tự tính từ kích thước × số lượng
  function kilnBatchVolumeOf(b) {
    if (!b) return 0;
    if (Number(b.volume) > 0) return Number(b.volume);
    const len = Number(b.length) || 0, w = Number(b.width) || 0, t = Number(b.thickness) || 0, q = Number(b.quantity) || 0;
    return (len > 0 && w > 0 && t > 0 && q > 0) ? calculateVolume(len, w, t, q) : 0;
  }
  // Các lô nan ĐANG SẤY trong 1 lò (stage say1/say2 tại đúng vị trí)
  function kilnLotsOf(location) {
    const key = String(location || '').trim();
    return (state.batches || []).filter(b =>
      b && (b.stage === 'say1' || b.stage === 'say2') && String(b.location || '').trim() === key);
  }
  // Loại sấy hiện tại của lò = công đoạn của lô đang nằm trong lò
  // (dữ liệu lạ trộn 2 loại cùng lúc → ưu tiên loại có NHIỀU lô hơn, hòa thì Sấy 1)
  function kilnStageOf(location) {
    const lots = kilnLotsOf(location);
    if (!lots.length) return '';
    const n1 = lots.filter(b => b.stage === 'say1').length;
    const n2 = lots.filter(b => b.stage === 'say2').length;
    if (n1 && n2) return n1 >= n2 ? 'say1' : 'say2';
    return n1 ? 'say1' : 'say2';
  }
  // Số NGÀY lô đã nằm ở CÔNG ĐOẠN HIỆN TẠI (từ lần vào gần nhất của công đoạn đó)
  function kilnLotDaysOf(b) {
    if (!b) return 0;
    const hist = getBatchStageHistory(b);
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i] && hist[i].stage === b.stage) return getHistoryEntryDays(hist, i) || 0;
    }
    return 0;
  }

  // ─── ĐỘ ẨM + NGƯỠNG ĐẠT ─────────────────────────────────────
  // Ngưỡng độ ẩm ĐẠT của 1 công đoạn sấy (%) — đạt khi độ ẩm ≤ ngưỡng
  function kilnThresholdOf(stage) {
    const th = (state.qcKilnThresholds && typeof state.qcKilnThresholds === 'object') ? state.qcKilnThresholds : {};
    const v = Number(stage === 'say2' ? th.say2 : th.say1);
    if (Number.isFinite(v) && v > 0) return v;
    return Number(stage === 'say2' ? KILN_THRESHOLD_DEFAULT.say2 : KILN_THRESHOLD_DEFAULT.say1);
  }
  // Số đo MỚI NHẤT của 1 lò (ưu tiên ngày, rồi đến LẦN ĐO — Lần 2 thắng Lần 1
  // cùng ngày) — dùng cho "Độ ẩm hiện tại" + màu đạt ẩm của Bảng Điều Khiển
  function kilnReadingOf(location) {
    const key = String(location || '').trim();
    const keyOf = r => `${String((r && r.date) || '')}|${Number((r && r.slot) || 1)}`;
    let best = null;
    (state.qcKilnReadings || []).forEach(r => {
      if (!r || String(r.location || '').trim() !== key) return;
      if (!best || keyOf(r) > keyOf(best)) best = r;
    });
    return best;
  }
  // Thông tin tổng hợp 1 lò để vẽ thẻ + bảng QC:
  // { location, stage, lots, volume, qty, days, reading, readingAge, humidity, threshold, status }
  // status: 'idle' (trống) | 'ready' (đạt ẩm) | 'active' (đang sấy)
  function kilnInfoOf(location) {
    const lots = kilnLotsOf(location);
    const stage = kilnStageOf(location);
    const volume = lots.reduce((s, b) => s + kilnBatchVolumeOf(b), 0);
    const qty = lots.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
    const days = lots.reduce((m, b) => Math.max(m, kilnLotDaysOf(b)), 0);
    const reading = kilnReadingOf(location);
    const age = reading ? kilnDayDiff(reading.date, kilnTodayISO()) : null;
    const humidity = (reading && age !== null && age >= 0 && age <= KILN_HUMIDITY_FRESH_DAYS)
      ? Number(reading.value) : null;
    const threshold = stage ? kilnThresholdOf(stage) : null;
    const status = !lots.length ? 'idle'
      : (humidity != null && threshold != null && humidity <= threshold ? 'ready' : 'active');
    return { location: String(location || '').trim(), stage, lots, volume, qty, days, reading, readingAge: age, humidity, threshold, status };
  }

  // ─── LOAD / SAVE (localStorage riêng — như qcExports) ────────
  function loadKilnReadings() {
    const raw = localStorage.getItem(STORAGE_KEY_QC_KILN_HUMIDITY);
    if (!raw) { state.qcKilnReadings = []; return; }
    try {
      const arr = JSON.parse(raw);
      state.qcKilnReadings = Array.isArray(arr) ? arr.filter(r => r && r.id) : [];
    } catch (e) { state.qcKilnReadings = []; }
  }
  function saveKilnReadings() {
    try { localStorage.setItem(STORAGE_KEY_QC_KILN_HUMIDITY, JSON.stringify(state.qcKilnReadings || [])); }
    catch (e) { showToast('Không lưu được độ ẩm vào bộ nhớ máy (bộ nhớ đầy?).', 'error'); }
    logDataChange(['qcKilnReadings']);
    firePushSync();
  }
  function loadKilnThresholds() {
    const raw = localStorage.getItem(STORAGE_KEY_QC_KILN_THRESHOLD);
    if (!raw) { state.qcKilnThresholds = Object.assign({}, KILN_THRESHOLD_DEFAULT); return; }
    try {
      const obj = JSON.parse(raw);
      state.qcKilnThresholds = (obj && typeof obj === 'object' && !Array.isArray(obj))
        ? obj : Object.assign({}, KILN_THRESHOLD_DEFAULT);
    } catch (e) { state.qcKilnThresholds = Object.assign({}, KILN_THRESHOLD_DEFAULT); }
  }
  function saveKilnThresholds() {
    try { localStorage.setItem(STORAGE_KEY_QC_KILN_THRESHOLD, JSON.stringify(state.qcKilnThresholds || {})); } catch (e) {}
    logDataChange(['qcKilnThresholds']);
    firePushSync();
  }
  // Nạp CẢ HAI key lúc boot (js/main.js)
  function loadKilnData() { loadKilnReadings(); loadKilnThresholds(); }

  // Cập nhật / thêm 1 số đo độ ẩm của (ngày, lò, LẦN ĐO). value rỗng → XÓA số đo
  // đó (có tombstone để lần xóa lan truyền qua mây). Trả về true nếu có thay đổi.
  // slot: 1 = Lần 1 (id cũ `kh-<ngày>-<lò>` — dữ liệu cũ không có slot tự hiểu Lần 1)
  //       2 = Lần 2 (id `kh-<ngày>-<lò>-s2`)
  function upsertKilnReading(dateIso, location, value, note = '', slot = 1) {
    const date = String(dateIso || '').slice(0, 10);
    const loc = String(location || '').trim();
    const slotNum = Number(slot) === 2 ? 2 : 1;
    if (!date || !loc) return false;
    const id = slotNum === 2 ? `kh-${date}-${loc}-s2` : `kh-${date}-${loc}`;
    const list = state.qcKilnReadings || (state.qcKilnReadings = []);
    const idx = list.findIndex(r => r && r.id === id);
    if (value === '' || value === null || value === undefined || !(Number(value) >= 0)) {
      if (idx < 0) return false;
      trackDeleted('qcKilnReadings', id);
      list.splice(idx, 1);
      return true;
    }
    const now = new Date().toISOString();
    const by = state.currentUser ? (state.currentUser.fullname || state.currentUser.username || state.currentUser.email || '') : '';
    if (idx >= 0) {
      const rec = list[idx];
      rec.value = Number(value);
      rec.slot = slotNum;
      rec.note = note || rec.note || '';
      rec.by = by || rec.by || '';
      rec.updatedAt = now;
    } else {
      list.push({ id, date, location: loc, slot: slotNum, value: Number(value), note, by, createdAt: now, updatedAt: now });
    }
    return true;
  }

  // ─── BẢNG ĐIỀU KHIỂN LÒ SẤY (khung mặc định thẻ Than Hóa + Sấy) ──
  let kilnOpenMenu = '';   // vị trí lò đang mở menu chạm chọn ('' = đóng hết)
  function kilnStageBadge(stage) {
    if (!stage) return '<span class="kiln-stage kiln-stage-none" title="Lò trống — chưa xác định loại sấy">—</span>';
    const cls = stage === 'say1' ? 'kiln-stage-say1' : 'kiln-stage-say2';
    const name = (STAGES[stage] && STAGES[stage].short) || (stage === 'say1' ? 'Sấy 1' : 'Sấy 2');
    return `<span class="kiln-stage ${cls}">${escapeHTML(name)}</span>`;
  }
  function kilnFmt(v) { return (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 }); }
  // ─── DANH SÁCH NAN CỦA LÒ (rê chuột / chạm thẻ lò → xem nhanh) ──
  // Mỗi lô 1 dòng ĐÚNG MẪU "1250x22x7 A SL 1500" — KHÔNG lặp mã lô, m³, ngày
  // sấy, độ ẩm… (những thông tin đó đã có sẵn trên thẻ lò).
  function kilnNanLineOf(b) {
    const len = Number(b.length) || '?', wid = Number(b.width) || '?', thi = Number(b.thickness) || '?';
    return `${len}x${wid}x${thi} ${String(b.bambooType || '—')} SL ${Number(b.quantity) || 0}`;
  }
  // Danh sách CHỈ hiện khi lò CÓ lô (lò trống → không pop). Chỉ render 1 khối —
  // CSS đổi kiểu trình bày theo ngữ cảnh: RÊ CHUỘT = pop-up nổi dưới thẻ
  // (hàng lò cuối mở lên trên); CHẠM MỞ MENU (.kiln-open) = khối tĩnh nằm ngay
  // trên các nút Thêm lô / Vào Kho (không đè nút bấm, không hiện 2 lần).
  function kilnNanListHtml(info) {
    if (!info.lots.length) return '';
    const lines = info.lots.map(b => `<span class="kiln-nan-line">${escapeHTML(kilnNanLineOf(b))}</span>`).join('');
    return `<span class="kiln-nan-pop">${lines}</span>`;
  }
  // Menu CHẠM chọn trên thẻ lò: lò trống → chọn Thêm (Sấy 1 / Sấy 2 — vì lò
  // trống chưa có loại sấy); lò đang sấy → Thêm lô (cùng loại) + Vào Kho nhanh
  function kilnMenuHtml(info) {
    const adds = info.lots.length
      ? `<button type="button" class="kiln-act kiln-act-add" data-kiln-add="${info.stage}" data-perm="kanban" title="Mở form Thêm Lô Sấy Mới — vị trí ${escapeHTML(info.location)} đã điền sẵn"><i data-lucide="plus-circle"></i> Thêm lô</button>`
      : `<button type="button" class="kiln-act kiln-act-add" data-kiln-add="say1" data-perm="kanban" title="Thêm lô nan mới vào Sấy 1 tại ${escapeHTML(info.location)}"><i data-lucide="plus-circle"></i> Thêm Sấy 1</button>
         <button type="button" class="kiln-act kiln-act-add" data-kiln-add="say2" data-perm="kanban" title="Chuyển lô từ Kho sang Sấy 2 tại ${escapeHTML(info.location)}"><i data-lucide="plus-circle"></i> Thêm Sấy 2</button>`;
    return `<span class="kiln-menu">
      ${adds}
      ${info.lots.length ? `<button type="button" class="kiln-act kiln-act-kho" data-kiln-kho="${escapeHTML(info.location)}" data-perm="kanban" title="Chuyển TẤT CẢ lô trong lò vào Kho"><i data-lucide="warehouse"></i> Vào Kho</button>` : ''}
    </span>`;
  }
  function kilnTileHtml(info) {
    const open = kilnOpenMenu === info.location;
    const wide = KILN_WIDE_LOCS.has(info.location); // LS13/14/15 = lò rộng gấp đôi (desktop)
    const hum = info.humidity != null ? `${kilnFmt(info.humidity)}%` : '—';
    const humTitle = info.reading
      ? `Số đo ngày ${formatDateDDMMYY(info.reading.date)}${info.readingAge ? ` (${info.readingAge} ngày trước)` : ' (hôm nay)'}`
      : 'QC chưa đo độ ẩm lò này';
    const humCls = info.humidity != null ? (info.status === 'ready' ? 'kiln-hum-ok' : 'kiln-hum-high') : 'kiln-hum-none';
    const stageName = info.stage ? ((STAGES[info.stage] && STAGES[info.stage].short) || '') : '';
    // NHÃN ARIA (không hiển thị) — thay cho title cũ từng lặp lại toàn bộ thông tin
    const aria = info.lots.length
      ? `Lò ${info.location}${stageName ? ' — ' + stageName : ''} — chạm để xem danh sách nan và thao tác Thêm lô / Vào Kho`
      : `Lò ${info.location} — lò trống, chạm để thêm lô nan vào sấy`;
    return `
      <div class="kiln-tile kiln--${info.status}${wide ? ' kiln-wide' : ''}${open ? ' kiln-open' : ''}" data-kiln="${escapeHTML(info.location)}" tabindex="0" role="button"
           draggable="${info.lots.length ? 'true' : 'false'}" aria-label="${escapeHTML(aria)}">
        <span class="kiln-head">
          <b class="kiln-code">${escapeHTML(info.location)}</b>
          ${kilnStageBadge(info.stage)}
          ${info.lots.length ? `<span class="kiln-kho-btn" data-kiln-kho="${escapeHTML(info.location)}" data-perm="kanban" title="Chuyển nhanh TẤT CẢ lô trong lò vào Kho"><i data-lucide="warehouse"></i></span>` : ''}
        </span>
        <span class="kiln-main">${info.lots.length ? `${kilnFmt(info.volume)} m³ · ${info.qty.toLocaleString('vi-VN')} thanh` : 'Đang chờ'}</span>
        <span class="kiln-sub">
          <span class="kiln-days" title="Số ngày đã sấy (lô lâu nhất trong lò)"><i data-lucide="calendar-days"></i> ${info.lots.length ? `${info.days} ngày` : '—'}</span>
          <span class="kiln-hum ${humCls}" title="${escapeHTML(humTitle)}"><i data-lucide="droplets"></i> ${hum}</span>
        </span>
        ${info.status === 'ready' ? '<span class="kiln-ready-chip">Đạt ẩm</span>' : ''}
        ${kilnNanListHtml(info)}
        ${open ? kilnMenuHtml(info) : ''}
      </div>`;
  }
  // Ô "CHỜ XÂY THÊM" (hàng lò 2): lấp phần trống để hàng 2 khớp 12 cột của hàng 1 —
  // LS13/14/15 (mỗi lò chiếm 2 ô lò thường) nằm BÊN PHẢI, các ô trống nằm bên trái.
  // Chỉ hiển thị thông tin — KHÔNG có data-kiln (không tính là lò thật), không
  // kéo thả, không mở menu.
  function kilnTodoHtml() {
    return `<div class="kiln-tile kiln-todo" title="Vị trí dự kiến — lò chưa xây">
      <span class="kiln-todo-label"><i data-lucide="hammer"></i> Chờ xây thêm</span>
    </div>`;
  }
  function kilnRowHtml(locs, isSecond) {
    // Hàng 2 (LS13/14/15 + vị trí khai báo thêm): điền ô "Chờ xây thêm" vào phần
    // TRỐNG bên trái — mỗi lô rộng chiếm 2 ô lò thường, tổng luôn khớp 12 ô của
    // hàng 1: số ô trống = 12 − 2×(3 lô rộng) − (số vị trí thêm) = 9 − locs.length
    const todos = isSecond
      ? Array.from({ length: Math.max(0, 9 - locs.length) }, () => kilnTodoHtml()).join('')
      : '';
    return `<div class="kiln-row">${todos}${locs.map(loc => kilnTileHtml(kilnInfoOf(loc))).join('')}</div>`;
  }
  // Chú giải + đếm tổng: N đang sấy · M đạt ẩm · Z chưa dùng + ngưỡng từng loại
  function renderKilnLegend() {
    const el = document.getElementById('x2-kiln-legend');
    if (!el) return;
    const infos = kilnLocations().map(kilnInfoOf);
    const nActive = infos.filter(i => i.status === 'active').length;
    const nReady = infos.filter(i => i.status === 'ready').length;
    const nIdle = infos.filter(i => i.status === 'idle').length;
    el.innerHTML = `
      <span class="kiln-lg kiln-lg-active"><i data-lucide="flame"></i> Đang sấy: <b>${nActive}</b></span>
      <span class="kiln-lg kiln-lg-ready"><i data-lucide="check-circle-2"></i> Đạt ẩm: <b>${nReady}</b></span>
      <span class="kiln-lg kiln-lg-idle"><i data-lucide="circle-slash-2"></i> Chưa dùng: <b>${nIdle}</b></span>
      <span class="kiln-lg kiln-lg-th" title="Ngưỡng độ ẩm ĐẠT theo công đoạn sấy — chỉnh trong tab QC (thẻ Độ Ẩm Lò Sấy)"><i data-lucide="target"></i> Ngưỡng đạt: Sấy 1 ≤ <b>${kilnFmt(kilnThresholdOf('say1'))}%</b> · Sấy 2 ≤ <b>${kilnFmt(kilnThresholdOf('say2'))}%</b></span>`;
  }
  // Dải LỐI ĐI giữa 2 hàng lò (mô phỏng khoảng trống đi lại trong xưởng)
  function kilnAisleHtml() {
    return '<div class="kiln-aisle" title="Lối đi giữa 2 hàng lò — theo sơ đồ xưởng"><span>Lối đi</span></div>';
  }
  // Vẽ bảng lò 2 hàng theo SƠ ĐỒ XƯỞNG: đánh số TỪ PHẢI SANG TRÁI —
  //   hàng 1: LS12 (bên trái) … LS1 (bên phải); hàng 2: (vị trí thêm) … LS15 · LS14 · LS13
  //   (LS13/14/15 là lò RỘNG gấp đôi — class kiln-wide, chỉ desktop).
  // Giữa 2 hàng chừa dải LỐI ĐI (nét đứt — ẩn trên điện thoại).
  function renderKilnBoard() {
    const box = document.getElementById('x2-kiln-board');
    if (!box) return;
    const locs = kilnLocations();
    const row1 = locs.slice(0, KILN_ROW_SPLIT).reverse(); // LS12…LS1 (LS1 bên phải)
    const row2 = locs.slice(KILN_ROW_SPLIT).reverse();    // (thêm)…LS15 · LS14 · LS13
    box.innerHTML = `${row1.length ? kilnRowHtml(row1) : ''}` +
      `${(row1.length && row2.length) ? kilnAisleHtml() : ''}` +
      `${row2.length ? kilnRowHtml(row2, true) : ''}`;
    renderKilnLegend();
    initLucide();
  }
  function closeKilnMenus() {
    if (!kilnOpenMenu) return;
    kilnOpenMenu = '';
    renderKilnBoard();
  }

  // ─── SỰ KIỆN TRÊN BẢNG LÒ (uỷ nhiệm — wire trong js/events.js) ──
  function onKilnBoardClick(e) {
    const khoBtn = e.target.closest && e.target.closest('[data-kiln-kho]');
    if (khoBtn) { kilnQuickToKho(khoBtn.getAttribute('data-kiln-kho')); return; }
    const addBtn = e.target.closest && e.target.closest('[data-kiln-add]');
    if (addBtn) { kilnOpenAdd(addBtn.getAttribute('data-kiln-add'), kilnOpenMenu); return; }
    const tile = e.target.closest && e.target.closest('.kiln-tile');
    if (!tile) return;
    // Ô "Chờ xây thêm" chỉ hiển thị thông tin — không mở menu, không thao tác
    if (tile.classList && tile.classList.contains('kiln-todo')) return;
    const loc = tile.getAttribute('data-kiln') || '';
    kilnOpenMenu = (kilnOpenMenu === loc) ? '' : loc;  // chạm nữa = đóng menu
    renderKilnBoard();
  }
  // Chuyển nhanh TẤT CẢ lô trong lò vào Kho (tái dùng logic modal "Chuyển Kho").
  // HỎI VỊ TRÍ MỚI Ở KHO (prompt): bỏ trống = giữ nguyên vị trí cũ · hủy = không chuyển.
  function kilnQuickToKho(location) {
    if (!requireEditPermission()) return;
    const info = kilnInfoOf(location);
    if (!info.lots.length) { showToast('Lò này đang trống — không có lô để chuyển!', 'info'); return; }
    kilnOpenMenu = '';
    let newLoc = '';
    if (typeof prompt === 'function') {
      const used = khoLocationsInUse();
      const goiY = used.length ? `\nGợi ý (vị trí Kho đang có): ${used.slice(0, 8).join(', ')}` : '';
      const ans = prompt(`Vị trí mới ở KHO cho các lô từ ${info.location} (bỏ trống = giữ nguyên vị trí cũ):${goiY}`, '');
      if (ans === null) return; // người dùng hủy → không chuyển
      newLoc = String(ans || '').trim();
    }
    const moved = quickTransferLotsToKho(info.stage, info.location, kilnTodayISO(), newLoc);
    if (moved) renderKilnBoard();
  }
  // Mở form "Thêm Lô Sấy Mới" với Vị trí + Công đoạn điền sẵn
  function kilnOpenAdd(stage, location) {
    if (!requireEditPermission()) return;
    kilnOpenMenu = '';
    openAddLotModal({ stage: stage === 'say2' ? 'say2' : 'say1', location });
  }
  // KÉO THẺ LÒ → thả vào ô KHO = chuyển nhanh (desktop; điện thoại dùng icon/menu)
  function kilnTileDragStart(e) {
    const tile = e.target && e.target.closest ? e.target.closest('.kiln-tile') : null;
    if (!tile) { e.preventDefault(); return; }
    // Ô "Chờ xây thêm" không kéo thả được (không phải lò thật)
    if (tile.classList && tile.classList.contains('kiln-todo')) { e.preventDefault(); return; }
    const info = kilnInfoOf(tile.getAttribute('data-kiln'));
    if (!info.lots.length) { e.preventDefault(); return; }
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ kiln: info.location, stage: info.stage }));
      e.dataTransfer.effectAllowed = 'move';
    } catch (err) { /* trình duyệt cũ: bỏ qua — vẫn còn icon Vào Kho */ }
  }
  function onKilnKhoDragOver(e) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const drop = document.getElementById('x2-kiln-kho-drop');
    if (drop) drop.classList.add('kiln-drop-over');
  }
  function onKilnKhoDragLeave() {
    const drop = document.getElementById('x2-kiln-kho-drop');
    if (drop) drop.classList.remove('kiln-drop-over');
  }
  function onKilnKhoDrop(e) {
    e.preventDefault();
    onKilnKhoDragLeave();
    let payload = '';
    try { payload = e.dataTransfer ? e.dataTransfer.getData('text/plain') : ''; } catch (err) {}
    let loc = '';
    try { loc = (JSON.parse(payload || '{}') || {}).kiln || ''; } catch (err) { loc = ''; }
    if (!loc) return; // thả thứ không phải thẻ lò → bỏ qua
    kilnQuickToKho(loc);
  }

  // ─── THẺ "ĐỘ ẨM LÒ SẤY" (tab QC) — MA TRẬN ngày × lò ─────────
  // Kiểm tra độ ẩm mang tính DI ĐỘNG → tối ưu điện thoại:
  //   • Hàng = lò (cột Lò DÍNH TRÁI khi cuộn ngang) · Cột = NGÀY, mỗi ngày 2 ô
  //     (Lần 1 · Lần 2) · cột HÔM NAY (đặt TRÁI nhất) highlight + ô nhập trực tiếp.
  //   • Ô quá khứ = chỉ đọc, BẤM vào → hộp thoại sửa nhanh (để trống = xóa).
  //   • Bỏ cột "Đang chứa" + bảng lịch sử riêng (ma trận chính là lịch sử).
  // Dịch ngày ISO ± n ngày (tính theo GIỜ MÁY, tránh lệch múi giờ)
  function kilnDayShift(iso, n) {
    const d = new Date(`${String(iso || '').slice(0, 10)}T00:00:00`);
    if (isNaN(d.getTime())) return String(iso || '').slice(0, 10);
    d.setDate(d.getDate() + Number(n) || 0);
    const p = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  // Danh sách ngày trên ma trận: [hôm nay, hôm qua, …] — mới nhất bên TRÁI
  function kilnMatrixDays() {
    const today = kilnTodayISO();
    const out = [];
    for (let i = 0; i < KILN_MATRIX_DAYS; i++) out.push(kilnDayShift(today, -i));
    return out;
  }
  // Số đo 1 ô: (ngày, lò, lần) — bản CŨ không có trường slot tự hiểu Lần 1
  function kilnReadingAt(dateIso, location, slot) {
    const date = String(dateIso || '').slice(0, 10);
    const loc = String(location || '').trim();
    const slotNum = Number(slot) === 2 ? 2 : 1;
    return (state.qcKilnReadings || []).find(r =>
      r && r.date === date && String(r.location || '').trim() === loc &&
      Number(r.slot || 1) === slotNum) || null;
  }
  // Đọc số nhập độ ẩm: nhận cả "14,5" lẫn "14.5"; rỗng → null; sai → NaN
  function parseHumVal(v) {
    const s = String(v ?? '').trim().replace(',', '.');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  // MA TRẬN: tiêu đề 2 tầng (ngày gộp 2 cột + L1/L2) · hàng lò có chip loại sấy
  function kilnMatrixHtml() {
    const days = kilnMatrixDays();
    const today = kilnTodayISO();
    const dayHeads = days.map(d => {
      const isToday = d === today;
      return `<th colspan="2" class="km-day${isToday ? ' km-today' : ''}" title="Ngày ${formatDateDDMMYY(d)}${isToday ? ' — HÔM NAY: nhập trực tiếp vào 2 ô Lần 1/Lần 2 rồi bấm Lưu Hôm Nay' : ''}">${escapeHTML(formatDateDDMMYY(d).slice(0, 5))}${isToday ? '<span class="km-today-chip">Hôm nay</span>' : ''}</th>`;
    }).join('');
    const slotHeads = days.map(() => '<th class="km-slot" title="Lần đo 1 trong ngày">L1</th><th class="km-slot" title="Lần đo 2 trong ngày">L2</th>').join('');
    const rows = kilnLocations().map(loc => {
      const info = kilnInfoOf(loc);
      const stageChip = info.stage
        ? `<span class="km-stage km-stage-${info.stage}" title="Loại sấy hiện tại của lò (từ lô đang ở lò)">${escapeHTML((STAGES[info.stage] && STAGES[info.stage].short) || '')}</span>`
        : '';
      const cells = days.map(d => {
        const isToday = d === today;
        return [1, 2].map(slot => {
          const rec = kilnReadingAt(d, loc, slot);
          if (isToday) {
            return `<td class="km-cell km-today"><input type="text" inputmode="decimal" class="km-input" data-kiln-hum="${escapeHTML(loc)}" data-kiln-slot="${slot}" value="${rec ? escapeHTML(kilnFmt(rec.value)) : ''}" placeholder="–" title="Độ ẩm (%) lò ${escapeHTML(loc)} — ${slot === 1 ? 'Lần 1' : 'Lần 2'} hôm nay; để trống = xóa số đo lần này"></td>`;
          }
          if (!rec) return `<td class="km-cell" data-km-cell="${escapeHTML(loc)}" data-km-date="${d}" data-km-slot="${slot}" title="Bấm để sửa/xóa số đo"><span class="km-empty">–</span></td>`;
          const ok = info.threshold != null && Number(rec.value) <= info.threshold;
          return `<td class="km-cell" data-km-cell="${escapeHTML(loc)}" data-km-date="${d}" data-km-slot="${slot}" title="Độ ẩm ${escapeHTML(loc)} — ${formatDateDDMMYY(d)} (Lần ${slot})${ok ? ' — ĐẠT ẨM' : ''}"><span class="km-val${ok ? ' km-ok' : ''}">${escapeHTML(kilnFmt(rec.value))}</span></td>`;
        }).join('');
      }).join('');
      return `<tr><th class="km-kiln" scope="row">${escapeHTML(loc)}${stageChip}</th>${cells}</tr>`;
    }).join('');
    return `<table class="data-table km-table">
      <thead>
        <tr><th class="km-kiln km-corner" rowspan="2" scope="col">Lò</th>${dayHeads}</tr>
        <tr>${slotHeads}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }
  function renderKilnMatrix() {
    const box = document.getElementById('kiln-hum-matrix');
    if (!box) return;
    box.innerHTML = kilnMatrixHtml();
    initLucide();
  }
  // Dòng trạng thái "đã lưu lúc nào / bởi ai" của HÔM NAY
  function renderKilnHumInfo() {
    const el = document.getElementById('kiln-hum-info');
    if (!el) return;
    const d = kilnTodayISO();
    const recs = (state.qcKilnReadings || []).filter(r => r && r.date === d);
    if (!recs.length) { el.innerHTML = '<span class="kiln-hum-info-none">Hôm nay chưa có số đo nào — điền vào 2 ô Lần 1/Lần 2 rồi bấm Lưu Hôm Nay.</span>'; return; }
    const last = recs.reduce((a, r) => (String(r.updatedAt || '') > String(a.updatedAt || '') ? r : a), recs[0]);
    const ts = String(last.updatedAt || '');
    el.innerHTML = `<i data-lucide="check-circle-2"></i> Đã lưu <b>${recs.length} số đo</b> hôm nay — lần cuối ${ts ? `${formatDateDDMMYY(ts.slice(0, 10))} ${ts.slice(11, 16)}` : '—'}${last.by ? ` · bởi ${escapeHTML(last.by)}` : ''}`;
  }
  // Vẽ toàn bộ thẻ Độ Ẩm Lò Sấy (gọi từ renderQcView): ngưỡng + MA TRẬN + trạng thái
  function renderKilnHumidityCard() {
    const th = state.qcKilnThresholds || {};
    [['kiln-th-say1', 'say1'], ['kiln-th-say2', 'say2']].forEach(([id, stage]) => {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = kilnThresholdOf(stage);
    });
    renderKilnMatrix();
    renderKilnHumInfo();
    initLucide();
  }
  // Số trên mini card launcher: đếm SỐ LÒ đã có số đo hôm nay (gộp 2 lần đo)
  function kilnHumidityCardCount() {
    const today = kilnTodayISO();
    const locs = new Set((state.qcKilnReadings || [])
      .filter(r => r && r.date === today).map(r => String(r.location || '').trim()));
    const n = locs.size;
    if (!n) return 'Chưa nhập hôm nay';
    const occupied = kilnLocations().filter(loc => kilnLotsOf(loc).length).length;
    return `Hôm nay: ${n}/${Math.max(occupied, n)} lò`;
  }
  // Lưu toàn bộ ô độ ẩm HÔM NAY trên ma trận (2 lần đo × mọi lò; để trống = xóa
  // số đo của lần đó). Nhận cả "14,5" lẫn "14.5"; sai số (ngoài 0–100) tô đỏ chặn lưu.
  function saveKilnHumidityForm() {
    if (!requireEditPermission()) return;
    const date = kilnTodayISO();
    const inputs = document.querySelectorAll('#kiln-hum-matrix .km-input');
    let changed = 0, bad = 0;
    inputs.forEach(inp => {
      const loc = inp.getAttribute('data-kiln-hum');
      const slot = inp.getAttribute('data-kiln-slot');
      if (!loc) return;
      const raw = String(inp.value ?? '').trim();
      if (raw === '') { if (upsertKilnReading(date, loc, '', '', slot)) changed++; return; }
      const n = parseHumVal(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) { bad++; inp.classList.add('km-input-bad'); return; }
      inp.classList.remove('km-input-bad');
      if (upsertKilnReading(date, loc, n, '', slot)) changed++;
    });
    if (bad) { showToast(`${bad} ô có số không hợp lệ (0–100) — đã tô đỏ, sửa lại rồi bấm Lưu!`, 'error'); return; }
    if (!changed) { showToast('Chưa có số nào thay đổi để lưu.', 'info'); return; }
    saveKilnReadings();
    renderKilnHumidityCard();
    renderKilnBoard(); // màu đạt ẩm trên Bảng Điều Khiển (tab Công Đoạn) cập nhật ngay
    showToast(`Đã lưu độ ẩm hôm nay (${formatDateDDMMYY(date)})!`, 'success');
  }
  // Lưu NGƯỠNG độ ẩm đạt theo công đoạn sấy (Sấy 1 / Sấy 2)
  function handleKilnThresholdSave() {
    if (!requireEditPermission()) return;
    const s1 = Number((document.getElementById('kiln-th-say1') || {}).value);
    const s2 = Number((document.getElementById('kiln-th-say2') || {}).value);
    if (!(s1 > 0 && s1 <= 100) || !(s2 > 0 && s2 <= 100)) { showToast('Ngưỡng phải nằm trong khoảng 0–100%!', 'error'); return; }
    state.qcKilnThresholds = Object.assign({}, state.qcKilnThresholds || {}, { say1: s1, say2: s2 });
    saveKilnThresholds();
    renderKilnHumidityCard();
    renderKilnBoard();
    showToast(`Đã lưu ngưỡng đạt: Sấy 1 ≤ ${kilnFmt(s1)}% · Sấy 2 ≤ ${kilnFmt(s2)}%!`, 'success');
  }
  // BẤM ô QUÁ KHỨ trên ma trận → hộp thoại sửa nhanh: nhập số mới / để trống = xóa
  function onKilnMatrixClick(e) {
    const cell = e.target.closest && e.target.closest('[data-km-cell]');
    if (!cell) return;
    if (!requireEditPermission()) return;
    const loc = cell.getAttribute('data-km-cell');
    const date = cell.getAttribute('data-km-date');
    const slot = cell.getAttribute('data-km-slot');
    if (!loc || !date) return;
    const rec = kilnReadingAt(date, loc, slot);
    const ans = prompt(`Độ ẩm (%) lò ${loc} — ${formatDateDDMMYY(date)} (Lần ${slot}):\nNhập số mới (0–100, nhận cả "14,5"); để trống = XÓA số đo này.`, rec ? kilnFmt(rec.value) : '');
    if (ans === null) return; // hủy → không đổi gì
    const raw = String(ans || '').trim();
    if (raw === '') {
      if (upsertKilnReading(date, loc, '', '', slot)) {
        saveKilnReadings(); renderKilnHumidityCard(); renderKilnBoard();
        showToast('Đã xóa số đo.', 'info');
      }
      return;
    }
    const n = parseHumVal(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) { showToast('Số độ ẩm phải nằm trong khoảng 0–100%!', 'error'); return; }
    if (upsertKilnReading(date, loc, n, '', slot)) {
      saveKilnReadings(); renderKilnHumidityCard(); renderKilnBoard();
      showToast(`Đã lưu ${kilnFmt(n)}% — ${formatDateDDMMYY(date)} (Lần ${slot}).`, 'success');
    }
  }

export {
  KILN_BASE,
  KILN_THRESHOLD_DEFAULT,
  closeKilnMenus,
  handleKilnThresholdSave,
  kilnBatchVolumeOf,
  kilnHumidityCardCount,
  kilnInfoOf,
  kilnLocations,
  kilnLotDaysOf,
  kilnLotsOf,
  kilnReadingAt,
  kilnReadingOf,
  kilnStageOf,
  kilnThresholdOf,
  kilnTileDragStart,
  kilnTodayISO,
  loadKilnData,
  loadKilnReadings,
  loadKilnThresholds,
  onKilnBoardClick,
  onKilnKhoDragLeave,
  onKilnKhoDragOver,
  onKilnKhoDrop,
  onKilnMatrixClick,
  renderKilnBoard,
  renderKilnHumidityCard,
  renderKilnLegend,
  saveKilnHumidityForm,
  saveKilnReadings,
  saveKilnThresholds,
  upsertKilnReading
};







