// ═══════════════════════════════════════════════════════════
// js/trace.js — TRUY XUẤT ĐẦU VÀO → ĐẦU RA (VÙNG NÂNG CAO)
// (thẻ #trace-card — đầu Vùng Nâng Cao tab Tổng Quan)
// ═══════════════════════════════════════════════════════════
// Mục đích: trả lời câu hỏi quản trị "1 m³ ván tốn bao nhiêu kg luồng
// tươi, hao hụt mất ở chặng nào" — theo KỲ (Tuần / Tháng / Năm) và
// theo TỪNG MÃ VÁN (định mức nguyên vật liệu ở tab Kế Hoạch).
//
// ─── CHUỖI GIÁ TRỊ ĐO TRỰC TIẾP (không phân bổ) ───────────────
//   Luồng tươi nhập (kg)  →  Cắt chọn ra ống luồng (kg)  →
//   Bổ ống đạt (kg)  →  Bào thô (thanh)  →  Chọn nan đạt (thanh)
//   →  Bào tinh đạt (thanh)  →  Ép ván (m³)
// Mỗi chặng lấy ĐÚNG hàm hiển thị của thẻ công đoạn tương ứng
// (cutDisplay / boOngDisplay / baoThoDisplay / chonNanDisplay /
// baoTinhDisplay + pressRecordVolumeOf) nên số liệu LUÔN KHỚP màn hình.
//
// ─── TRUY XUẤT THEO MÃ VÁN = ƯỚC TÍNH PHÂN BỔ ────────────────
// Số kg ở đầu chuỗi là số CHUNG (chưa gắn mã ván), còn tấm/m³ ở cuối
// chuỗi đã gắn sản phẩm. Vì vậy phần theo mã ván là số ƯỚC TÍNH, phân
// bổ kg đầu vào theo TỶ LỆ THỂ TÍCH (m³) mà mã đó chiếm trong kỳ:
//     kg tươi của mã  =  Σ kg tươi cả kỳ  ×  (m³ của mã ÷ Σ m³ cả kỳ)
// Giao diện ghi rõ chữ "ước tính phân bổ" — KHÔNG phải số cân thật
// từng mã (muốn số cân thật phải khai mã ván ngay từ công đoạn Cắt Chọn).
// Đi kèm cột "Lý thuyết định mức" để đối chiếu (định mức nan + hiệu suất
// ÷ tỷ lệ thanh/kg tươi thực tế của kỳ).
//
// NGUYÊN TẮC: chỉ ĐỌC — không state dữ liệu mới, KHÔNG đồng bộ mây/backup.
// Trạng thái bộ lọc (kỳ + mã ván) là THUẦN GIAO DIỆN THEO MÁY (như
// bamboo_tracker_capacity_ui_v1) — không đưa vào state.js.
// ═══════════════════════════════════════════════════════════
import { initLucide } from './cloud.js';
import { friendlyMaterialWeek, materialWeekLabel } from './materials.js';
import { parseFractionValue, rateDisplayLabel, rateNanUse, rateUnit } from './planning.js';
import { bulligPlanProductId, dimVolume, pressRecordVolumeOf, qcThanhPlanProductId } from './press.js';
import { state } from './state.js';
import { escapeHTML } from './utils.js';
import { baoThoDisplay, baoTinhDisplay, boOngDisplay, bulligDisplay, chonNanDisplay, cutDisplay } from './xuong2.js';

  // ─── ĐỊNH DẠNG SỐ ─────────────────────────────────────────────
  const fmtKgT = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  const fmtNumT = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const fmtM3T = v => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
  const fmtPctT = v => (v == null || !Number.isFinite(Number(v))) ? '—' : `${(Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

  // ─── TRẠNG THÁI BỘ LỌC (THUẦN UI THEO MÁY) ────────────────────
  const TRACE_UI_KEY = 'bamboo_tracker_trace_ui_v1';
  const TRACE_MODES = ['week', 'month', 'year'];
  // Panel "KHỐI LƯỢNG BÌNH QUÂN THEO TỪNG CỠ THANH" — mở từ ô KPI
  // "Kg tươi / 1 thanh nan" bằng DROPDOWN NỔI (không đẩy/không biến dạng khung).
  const TRACE_SIZE_PANEL_ID = 'trace-size-panel';
  const TRACE_SIZE_BTN_ID = 'trace-size-btn';
  let traceUi = null;
  let traceSizeOpen = false;      // panel đang mở?
  let traceSizeQuery = '';        // ô tìm nhanh theo cỡ thanh (thuần phiên)

  function traceTodayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Khóa kỳ của một ngày: tuần 'YYYY-Wnn' · tháng 'YYYY-MM' · năm 'YYYY'
  function traceKeyOf(dateISO, mode) {
    const s = String(dateISO || '');
    if (!s) return '';
    if (mode === 'year') return s.slice(0, 4);
    if (mode === 'month') return s.slice(0, 7);
    return materialWeekLabel(s);
  }

  function traceDefaultKey(mode) {
    return traceKeyOf(traceTodayISO(), mode);
  }

  function loadTraceUi() {
    if (traceUi) return traceUi;
    traceUi = { mode: 'month', key: '', productId: '', openDetail: false };
    try {
      const raw = localStorage.getItem(TRACE_UI_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          if (TRACE_MODES.includes(o.mode)) traceUi.mode = o.mode;
          if (o.key) traceUi.key = String(o.key);
          if (o.productId) traceUi.productId = String(o.productId);
          if (o.openDetail === true) traceUi.openDetail = true; // mặc định ẨN chi tiết công đoạn
        }
      }
    } catch (e) { /* dữ liệu UI hỏng → dùng mặc định */ }
    if (!traceUi.key) traceUi.key = traceDefaultKey(traceUi.mode);
    return traceUi;
  }

  function saveTraceUi() {
    try { localStorage.setItem(TRACE_UI_KEY, JSON.stringify(loadTraceUi())); } catch (e) { /* bộ nhớ đầy */ }
  }

  // ─── TUẦN ISO: khóa 'YYYY-Wnn' ↔ mốc Thứ Hai ↔ dịch kỳ ────────
  function traceWeekMonday(weekKey) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(String(weekKey || ''));
    if (!m) return null;
    const year = Number(m[1]), week = Number(m[2]);
    const jan4 = new Date(year, 0, 4);
    const dayNr = (jan4.getDay() + 6) % 7;
    const week1Mon = new Date(year, 0, 4 - dayNr);
    return new Date(week1Mon.getFullYear(), week1Mon.getMonth(), week1Mon.getDate() + (week - 1) * 7);
  }
  function traceISOOfLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function traceMonthShift(monthKey, dir) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    if (!m) return String(monthKey || '');
    const d = new Date(Number(m[1]), Number(m[2]) - 1 + dir, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function traceYearShift(yearKey, dir) {
    const y = parseInt(yearKey, 10);
    return Number.isFinite(y) ? String(y + dir) : String(yearKey || '');
  }

  // Dịch kỳ ±1 theo chế độ đang xem
  function traceShiftKey(key, mode, dir) {
    if (mode === 'year') return traceYearShift(key, dir);
    if (mode === 'month') return traceMonthShift(key, dir);
    const mon = traceWeekMonday(key);
    if (!mon) return String(key || '');
    return materialWeekLabel(traceISOOfLocal(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + dir * 7)));
  }

  // Nhãn kỳ hiển thị trên thanh công cụ
  function tracePeriodLabel(key, mode) {
    if (mode === 'year') return `Năm ${key}`;
    if (mode === 'month') {
      const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
      return m ? `Tháng ${Number(m[2])}/${m[1]}` : String(key || '');
    }
    const mon = traceWeekMonday(key);
    if (!mon) return friendlyMaterialWeek(key);
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    const f = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${friendlyMaterialWeek(key)} · ${f(mon)} – ${f(sun)}`;
  }

  // ─── LỌC BẢN GHI THEO KỲ ĐANG CHỌN ────────────────────────────
  function traceInPeriod(dateISO) {
    const ui = loadTraceUi();
    const k = traceKeyOf(dateISO, ui.mode);
    return !!k && k === ui.key;
  }

  // ─── CHUỖI GIÁ TRỊ TOÀN NHÀ MÁY (XƯỞNG 2) — ĐO TRỰC TIẾP ──────
  // Mỗi chặng lấy đúng hàm hiển thị của thẻ công đoạn → khớp màn hình.
  // `matchFn(dateISO)` = bộ lọc ngày: KỲ đang xem, hoặc MỘT THÁNG bất kỳ khi
  // dựng CỬA SỔ THAM CHIẾU (xem traceReferenceWindow).
  function traceChainFor(matchFn) {
    const match = typeof matchFn === 'function' ? matchFn : () => false;
    // ① Luồng tươi nhập (kg) — nguyên liệu nhập cho Xưởng 2
    let tuoiKg = 0;
    (state.materialRecords || []).forEach(m => {
      if (!m || String(m.location || '') !== 'xuong-2') return;
      if (!match(m.date)) return;
      tuoiKg += Number(m.weight) || 0;
    });

    // ② Cắt chọn: đầu vào (kg) → ống luồng (kg) + phụ phẩm (củi đốt / cây loại)
    let cutIn = 0, ongKg = 0, cuiKg = 0, cayLoaiKg = 0;
    (state.xuong2CutRecords || []).forEach(r => {
      if (!r || !match(r.date)) return;
      const d = cutDisplay(r);
      cutIn += Number(d.inputWeight) || 0;
      ongKg += Number(d.klOngLuong) || 0;
      cuiKg += Number(d.klCuiDot) || 0;
      cayLoaiKg += Number(d.klCayLoai) || 0;
    });

    // ③ Bổ ống: ống đem bổ (kg) → ống bổ đạt (kg) + ống loại
    let ongBoIn = 0, ongBoKg = 0, ongBoLoai = 0;
    (state.xuong2BoOngRecords || []).forEach(r => {
      if (!r || !match(r.date)) return;
      const d = boOngDisplay(r);
      ongBoIn += Number(d.inputOng) || 0;
      ongBoKg += Number(d.klOngBo) || 0;
      ongBoLoai += Number(d.klOngLoai) || 0;
    });

    // ④ Chạy máy bào thô: số thanh + thể tích quy đổi (m³)
    let baoThoThanh = 0, baoThoM3 = 0;
    (state.xuong2BaoThoRecords || []).forEach(r => {
      if (!r || !match(r.date)) return;
      const d = baoThoDisplay(r);
      baoThoThanh += Number(d.qty) || 0;
      baoThoM3 += Number(d.volume) || 0;
    });

    // ⑤ Chọn nan thô: thanh đạt trong chuỗi + thanh MUA NGOÀI (đếm RIÊNG)
    let chonNanThanh = 0, chonNanM3 = 0, chonNanReject = 0, chonNanExtThanh = 0;
    (state.xuong2ChonNanThoRecords || []).forEach(r => {
      if (!r || !match(r.date)) return;
      const d = chonNanDisplay(r);
      const q = Number(d.quantity) || 0;
      if (r.external) { chonNanExtThanh += q; return; }  // nan mua ngoài — KHÔNG thuộc chuỗi
      chonNanThanh += q;
      chonNanM3 += Number(d.volume) || 0;
      if (d.cls === 'reject') chonNanReject += q;   // "Loại hẳn" → tỷ lệ loại
    });

    // ⑥ Bào tinh: chỉ lượt kind 'tinh' (thanh chờ ép) — đầu vào → đạt/lỗi
    let baoTinhIn = 0, baoTinhOk = 0, baoTinhErr = 0, baoTinhM3Ok = 0;
    (state.xuong2BaoTinhRecords || []).forEach(r => {
      if (!r || r.kind !== 'tinh' || !match(r.date)) return;
      const d = baoTinhDisplay(r);
      baoTinhIn += Number(d.qtyIn) || 0;
      baoTinhOk += Number(d.qtyOk) || 0;
      baoTinhErr += Number(d.qtyErr) || 0;
      baoTinhM3Ok += Number(d.volumeOk) || 0;
    });

    // ⑦ Ép ván: m³ thành phẩm (nguồn chung của mọi mã ván trong kỳ)
    //    Tách rõ: pressM3 = MỌI lượt (ván thô tạo ra + ván thô đem ép thành phẩm),
    //    pressFinishedM3 = CHỈ lượt có thành phẩm (không đếm trùng ván thô),
    //    pressVtM3 = thể tích VÁN THÔ tạo ra trong kỳ.
    let pressM3 = 0, pressRuns = 0, pressFinishedM3 = 0, pressVtM3 = 0;
    (state.pressRecords || []).forEach(r => {
      if (!r || !match(r.date)) return;
      const vol = pressRecordVolumeOf(r);
      pressM3 += vol;
      pressRuns += 1;
      if (Number(r.finishedQty) > 0) pressFinishedM3 += vol;
      (Array.isArray(r.vanTho) ? r.vanTho : []).forEach(l => {
        if (l && l.vtDim) pressVtM3 += dimVolume(l.vtDim, l.vtQty);
      });
    });

    // ── KG TƯƠI CHO 1 THANH NAN theo CHÍNH CHUỖI của kỳ ──
    // KHÔNG lấy "kg tươi NHẬP kỳ ÷ thanh kỳ" (sai khi còn tồn chưa cắt → số vống
    // lên nhiều lần, đúng lỗi người dùng phản ánh). Lấy theo TỶ LỆ CHUỖI:
    //   kg ống cho 1 thanh (bổ ống → bào thô) ÷ tỷ lệ ống/tươi (cắt chọn).
    const ongPerThanh = (baoThoThanh > 0 && ongBoKg > 0) ? (ongBoKg / baoThoThanh) : 0;
    const ongRatio = cutIn > 0 ? (ongKg / cutIn) : 0;
    const kgPerThanh = (ongPerThanh > 0 && ongRatio > 0) ? (ongPerThanh / ongRatio) : 0;

    return {
      tuoiKg,
      cutIn, ongKg, cuiKg, cayLoaiKg,
      ongBoIn, ongBoKg, ongBoLoai,
      baoThoThanh, baoThoM3,
      chonNanThanh, chonNanM3, chonNanReject, chonNanExtThanh,
      baoTinhIn, baoTinhOk, baoTinhErr, baoTinhM3Ok,
      pressM3, pressRuns, pressFinishedM3, pressVtM3,
      // Tỷ lệ quy đổi thực tế của kỳ
      thanhPerKgTuoi: tuoiKg > 0 ? chonNanThanh / tuoiKg : 0,
      ongRatioPct: cutIn > 0 ? (ongKg / cutIn) * 100 : null,
      ongPerThanh, kgPerThanh,
      // KỲ ĐẦY ĐỦ = đo được cả 4 mốc chính của chuỗi (điều kiện vào cửa sổ tham chiếu)
      complete: cutIn > 0 && ongKg > 0 && ongBoKg > 0 && baoThoThanh > 0
    };
  }

  // Chuỗi giá trị của KỲ đang chọn (theo bộ lọc Tuần/Tháng/Năm trên thẻ)
  function traceChainData() {
    return traceChainFor(d => traceInPeriod(d));
  }

  // Nhãn tháng ngắn: '2026-10' → 'T10/2026'
  function traceMonthLabelOf(monthKey) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    return m ? `T${Number(m[2])}/${m[1]}` : String(monthKey || '');
  }

  // ─── CỬA SỔ THAM CHIẾU (các THÁNG ĐẦY ĐỦ) ─────────────────────
  // VÌ SAO CẦN: dữ liệu nhập luồng tươi chỉ có từ tháng 10/2026; tháng 8–9
  // KHÔNG có kg tươi nhưng VẪN có sản lượng ép (nan lấy từ tồn) ⇒ "kg tươi kỳ
  // ÷ m³ kỳ" cho ra 0 (tháng 8) hoặc số ảo (tháng 9). Nay: các THÁNG ĐẦY ĐỦ
  // hợp thành cửa sổ chuẩn → rút `kgPerThanh` (kg tươi cho 1 thanh nan); kỳ
  // thiếu dữ liệu MƯỢN hệ số này (gắn cờ "số tham chiếu") thay vì bịa số.
  function traceReferenceWindow() {
    const months = new Set();
    const add = (d) => { const k = String(d || '').slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) months.add(k); };
    (state.materialRecords || []).forEach(r => add(r && r.date));
    (state.xuong2CutRecords || []).forEach(r => add(r && r.date));
    (state.xuong2BoOngRecords || []).forEach(r => add(r && r.date));
    (state.xuong2BaoThoRecords || []).forEach(r => add(r && r.date));
    (state.pressRecords || []).forEach(r => add(r && r.date));

    const comp = [];
    Array.from(months).sort().forEach(mk => {
      const c = traceChainFor(d => String(d || '').slice(0, 7) === mk);
      if (c.complete && c.kgPerThanh > 0) comp.push({ mk, c });
    });
    if (!comp.length) return { kgPerThanh: 0, months: [], label: '', complete: false };

    const sum = (f) => comp.reduce((s, x) => s + f(x.c), 0);
    const ongPerThanh = sum(c => c.ongBoKg) / sum(c => c.baoThoThanh);
    const ongRatio = sum(c => c.ongKg) / sum(c => c.cutIn);
    const list = comp.map(x => x.mk);
    return {
      kgPerThanh: ongRatio > 0 ? (ongPerThanh / ongRatio) : 0,
      ongRatio,                      // tỷ lệ ống/tươi gộp (dùng khi kỳ thiếu dữ liệu cắt)
      ongPerThanh,                   // kg ống bổ đạt cho 1 thanh (gộp)
      months: list,
      label: list.length === 1 ? traceMonthLabelOf(list[0])
        : `${traceMonthLabelOf(list[0])}–${traceMonthLabelOf(list[list.length - 1])}`,
      complete: true
    };
  }

  // ─── KÍCH THƯỚC ĐỊNH MỨC → m³/1 đơn vị (Tấm hoặc Thanh) ───────
  function traceRateDims(rate) {
    const m = String((rate && rate.product) || '').match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i);
    if (!m) return null;
    return [
      parseFloat(String(m[1]).replace(',', '.')),
      parseFloat(String(m[2]).replace(',', '.')),
      parseFloat(String(m[3]).replace(',', '.'))
    ];
  }

  // Số thanh nan theo định mức cho 1 đơn vị sản phẩm (÷ hiệu suất chuyển đổi)
  function traceRateNanPerUnit(rate) {
    const eff = (Number(rate && rate.efficiency) || 70) / 100;
    let nan = 0;
    ['nan1', 'nan2', 'nan3'].forEach(f => {
      if (!rate || !rate[f]) return;
      nan += parseFractionValue(rate[f + 'Qty']) || 0;
    });
    return eff > 0 ? nan / eff : 0;
  }

  // ─── BẢNG TRUY XUẤT THEO TỪNG MÃ (ƯỚC TÍNH PHÂN BỔ) ───────────
  // CƠ SỞ PHÂN BỔ = **SỐ THANH ĐO THẬT** mà mỗi mã tiêu thụ trong kỳ — KHÔNG
  // dùng thanh định mức (mọi mã sẽ ra số gần giống nhau ⇒ đánh đồng vô nghĩa).
  // Mỗi loại sản phẩm có ĐÚNG nguồn đo của nó (đều là dữ liệu đã có sẵn):
  //   • VÁN (ĐVT Tấm)   = `pressRecords[].sticks[]` — thanh nan vào máy ép
  //                       (VD Đầu vào 1250×18×7 · 9.384 thanh)
  //   • BULLIG           = thẻ Bullig: lượt GIA CÔNG `qtyIn` (thanh thô đã dùng);
  //                       sản lượng lấy ở lượt CHỌN THANH `qtyOk` (khớp mã bằng
  //                       `bulligPlanProductId` — so 3 số kích thước thành phẩm)
  //   • THANH (ĐVT Thanh) = lượt KIỂM THANH (tab QC) — `inputQty` (thanh đưa vào
  //                       kiểm) + `qtyOk` (đạt); khớp mã bằng `qcThanhPlanProductId`
  // Trọng số = thanh đo thật; mã không có số đo → thanh định mức; cuối cùng
  // mới dùng m³. Lượt KHÔNG khớp mã nào gom vào dòng "Chưa gắn mã" (không
  // thất lạc số) và VẪN được chia kg tươi như mọi mã khác.
  const TRACE_UNLINKED_ID = '__unlinked__';
  // Ngưỡng thể tích 1 thế: nhỏ hơn = THANH NAN; lớn hơn = tấm VÁN THÔ (BTP).
  // Dùng đúng ngưỡng của thẻ Bào Tinh (BAO_THANH_PIECE_MAX_VOL) — 1 thanh BTP
  // 1200×18×15 = 0,000324 m³ · ván thô 1200×340×18 = 0,007344 m³.
  const TRACE_NAN_PIECE_MAX_VOL = 0.0015;

  // Đọc 3 số kích thước từ chuỗi cỡ ('1250×18×7' / '1200x340x33')
  function traceDimsNums(str) {
    const m = String(str || '').match(/\d+(?:[.,]\d+)?/g) || [];
    if (m.length !== 3) return null;
    return m.map(x => parseFloat(String(x).replace(',', '.')));
  }
  // Thể tích 1 đơn vị (m³) từ chuỗi cỡ
  function traceSizeUnitVol(str) {
    const d = traceDimsNums(str);
    return d ? (d[0] * d[1] * d[2]) / 1000000000 : 0;
  }
  // Thế này là THANH NAN (nhỏ) hay TẤM VÁN THÔ (lớn)?
  function traceIsNanPiece(sizeKey) {
    const uv = traceSizeUnitVol(sizeKey);
    return uv > 0 && uv < TRACE_NAN_PIECE_MAX_VOL;
  }
  // CHUẨN HÓA chuỗi cỡ: nhận 'x' / '×' / '*' / dấu cách / số thập phân → 'D×R×D'
  // (VD '1200x340x18' và ' 1200 × 340 × 18 ' đều thành '1200×340×18') — nhờ vậy
  // gõ lệch ký tự phân cách vẫn KHỚP, không rơi vào "không truy được gốc".
  function traceNormSize(sizeKey) {
    const d = traceDimsNums(sizeKey);
    return d ? `${d[0]}×${d[1]}×${d[2]}` : String(sizeKey || '').trim();
  }
  // Thanh NAN trực tiếp của 1 lượt ép (chỉ đếm dòng sticks là cỡ nan)
  function traceRunNanSticks(r) {
    let n = 0;
    (Array.isArray(r && r.sticks) ? r.sticks : []).forEach(x => {
      const q = Number(x && x.sticks) || 0;
      if (q > 0 && traceIsNanPiece(x && x.nanKey)) n += q;
    });
    return n;
  }

  function traceProductRows(chain) {
    const c = chain || traceChainData();
    const rates = Array.isArray(state.materialRates) ? state.materialRates.filter(Boolean) : [];
    const acc = new Map();

    const accOf = (pid) => {
      let a = acc.get(pid);
      if (!a) {
        a = { productId: pid, outQty: 0, m3: 0, runs: 0, thanhReal: 0, thanhTheory: 0,
              unmatchedPieces: 0, src: new Set() };
        acc.set(pid, a);
      }
      return a;
    };
    let unmatchedTotal = 0; // số TẤM VÁN THÔ ghi cỡ không khớp lượt tạo ván thô nào

    // ① VÁN — CHUỖI 2 BƯỚC trong công đoạn Ép Ván:
    //    • Lượt ÉP RA VÁN THÔ  : sticks = thanh NAN → gom `nanPerVtPiece` theo cỡ
    //      ván thô tạo ra (VD 1 tấm 1200×340×18 cần 66 thanh nan).
    //    • Lượt ÉP THÀNH PHẨM  : sticks = TẤM VÁN THÔ đầu vào (VD 2 tấm/tấm TP)
    //      → quy ra thanh nan qua `nanPerVtPiece`. Nhờ vậy kg tươi gắn đúng vào
    //      MÃ THÀNH PHẨM chứ không dồn hết vào lượt tạo ván thô (không gắn mã).
    const vtMade = new Map(); // cỡ ván thô -> { nan, qty }
    (state.pressRecords || []).forEach(r => {
      if (!r || !traceInPeriod(r.date)) return;
      const vt = (Array.isArray(r.vanTho) ? r.vanTho : []).filter(l => l && l.vtDim && (Number(l.vtQty) || 0) > 0);
      if (!vt.length) return;
      const runNan = traceRunNanSticks(r);
      if (runNan <= 0) return;
      const totQ = vt.reduce((s, l) => s + (Number(l.vtQty) || 0), 0);
      if (totQ <= 0) return;
      vt.forEach(l => {
        const q = Number(l.vtQty) || 0;
        const key = traceNormSize(l.vtDim);              // CHUẨN HÓA cỡ ván thô
        const cur = vtMade.get(key) || { nan: 0, qty: 0 };
        cur.nan += runNan * (q / totQ);
        cur.qty += q;
        vtMade.set(key, cur);
      });
    });
    const nanPerVtPiece = (size) => {
      const cur = vtMade.get(traceNormSize(size));
      return (cur && cur.qty > 0) ? cur.nan / cur.qty : 0;
    };
    const nanTotalMade = Array.from(vtMade.values()).reduce((s, x) => s + x.nan, 0);

    (state.pressRecords || []).forEach(r => {
      if (!r || !traceInPeriod(r.date)) return;
      // Lượt CHỈ tạo ván thô (chưa có thành phẩm) → KHÔNG tính riêng: nan của nó
      // đã chảy sang các mã thành phẩm dùng tấm ván thô đó (tránh đếm 2 lần).
      const hasVt = (Array.isArray(r.vanTho) ? r.vanTho : []).some(l => l && (Number(l.vtQty) || 0) > 0);
      if (hasVt && !(Number(r.finishedQty) > 0)) return;

      const pid = String(r.productId || '') || TRACE_UNLINKED_ID;
      const a = accOf(pid);
      a.outQty += Number(r.finishedQty) || 0;
      a.m3 += pressRecordVolumeOf(r);
      a.runs += 1;
      let nan = 0;
      (Array.isArray(r.sticks) ? r.sticks : []).forEach(x => {
        const q = Number(x && x.sticks) || 0;
        if (q <= 0) return;
        if (traceIsNanPiece(x && x.nanKey)) { nan += q; return; }   // đầu vào là THANH NAN
        const per = nanPerVtPiece(x && x.nanKey);                   // đầu vào là TẤM VÁN THÔ
        if (per > 0) { nan += q * per; return; }
        // Cỡ ván thô KHÔNG khớp lượt tạo ván thô nào trong kỳ → KHÔNG im lặng bỏ
        // qua: đếm lại để CẢNH BÁO (người dùng sửa tên cỡ cho đúng).
        a.unmatchedPieces += q;
        unmatchedTotal += q;
      });
      if (nan > 0) { a.thanhReal += nan; a.src.add('ép ván'); }
    });

    // Ván thô CHƯA vào thành phẩm (dở dang) → phần nan còn lại chưa gắn mã nào
    const attributedPressNan = Array.from(acc.values()).reduce((s, x) => s + x.thanhReal, 0);
    const wipNan = Math.max(0, nanTotalMade - attributedPressNan);
    if (wipNan > 0) {
      const a = accOf(TRACE_UNLINKED_ID);
      a.thanhReal += wipNan;
      a.src.add('ván thô chưa vào thành phẩm');
    }

    // ② BULLIG — gia công (thanh thô dùng) + chọn thanh (thành phẩm đạt)
    (state.xuong2BulligRecords || []).forEach(r => {
      if (!r || !traceInPeriod(r.date)) return;
      const d = bulligDisplay(r);
      const matchKey = d.kind === 'gc' ? (d.outSizeKey || d.inSizeKey) : d.inSizeKey;
      const pid = bulligPlanProductId(matchKey) || TRACE_UNLINKED_ID;
      const a = accOf(pid);
      a.runs += 1;
      if (d.kind === 'gc') {
        const q = Number(d.qtyIn) || 0;                 // thanh THÔ đã dùng
        if (q > 0) { a.thanhReal += q; a.src.add('gia công Bullig'); }
      } else {
        const q = Number(d.qtyOk) || 0;                 // thành phẩm đạt
        a.outQty += q;
        a.m3 += q * (Number(d.unitVol) || 0);
      }
    });

    // ③ THANH — lượt KIỂM THANH (tab QC): thanh đưa vào kiểm + số đạt
    (state.qcFinalRecords || []).forEach(r => {
      if (!r || String(r.kind || '') !== 'thanh' || !traceInPeriod(r.date)) return;
      const pid = qcThanhPlanProductId(r.sizeKey) || TRACE_UNLINKED_ID;
      const a = accOf(pid);
      a.runs += 1;
      const inputQ = Number(r.inputQty) || 0;
      if (inputQ > 0) { a.thanhReal += inputQ; a.src.add('kiểm thanh'); }
      const q = Number(r.qtyOk) || 0;
      a.outQty += q;
      a.m3 += q * traceSizeUnitVol(r.sizeKey);
    });

    const totalM3 = Array.from(acc.values()).reduce((s, x) => s + x.m3, 0);

    // Thanh ĐỊNH MỨC (dự phòng khi mã chưa có số đo thật) + trọng số phân bổ
    const staged = [];
    let theorySum = 0, m3WithTheory = 0;
    acc.forEach(a => {
      const rate = rates.find(r => String(r.id) === a.productId) || null;
      const nanPerUnit = traceRateNanPerUnit(rate);
      a.thanhTheory = (nanPerUnit > 0 && a.outQty > 0) ? a.outQty * nanPerUnit : 0;
      if (a.thanhTheory > 0) { theorySum += a.thanhTheory; m3WithTheory += a.m3; }
      staged.push({ a, rate, nanPerUnit });
    });
    const theoryPerM3 = m3WithTheory > 0 ? theorySum / m3WithTheory : 0;

    // ── KG TƯƠI CHO 1 THANH NAN ──
    // DÙNG HỆ SỐ CỦA CỬA SỔ THAM CHIẾU (các tháng đầy đủ) cho MỌI kỳ, để các kỳ
    // SO SÁNH ĐƯỢC với nhau: dữ liệu luồng tươi ↔ sản phẩm không khớp trong cùng
    // một tháng (vật tư qua cắt/bổ/bào thô dở dang nhiều kỳ) nên hệ số riêng của
    // từng tháng dao động rất mạnh (0,94 ↔ 3,32 kg/thanh) — dùng riêng sẽ ra số
    // ảo như "0,02 kg/thanh" người dùng phản ánh. Hệ số của kỳ vẫn được hiển thị
    // để đối chiếu. Không có tháng đầy đủ nào → dùng hệ số riêng của kỳ.
    const ref = traceReferenceWindow();
    const ownKgPerThanh = c.kgPerThanh > 0 ? c.kgPerThanh : 0;
    const useRef = ref.kgPerThanh > 0;
    const kgPerThanh = useRef ? ref.kgPerThanh : ownKgPerThanh;
    const basisSuffix = useRef ? ` · hệ số tham chiếu ${ref.label}` : '';

    // Trọng số = thanh ĐO THẬT → thanh định mức → bình quân thanh/m³ → m³.
    // (B3 — 15/10/2026) CƠ SỞ QUY ĐỔI = **KL ỐNG LUỒNG**: mỗi thanh nan "mang"
    // hệ số kg ống/1 thanh (kgPerThanh đã tính = ống bổ đạt/1 thanh ÷ tỷ lệ ống/tươi)
    // ⇒ trọng số thực chất là "thanh × KL ống/cỡ"; kg tươi = trọng số × hệ số ÷ cuối
    // (một phép chia duy nhất, LUÔN nhất quán với bảng "KL theo cỡ thanh").
    const weightOf = (st) => {
      const a = st.a;
      if (a.thanhReal > 0) return { w: a.thanhReal, basis: 'thanh thật × KL ống/1 thanh' + basisSuffix };
      if (a.thanhTheory > 0) return { w: a.thanhTheory, basis: 'thanh định mức × KL ống/1 thanh' };
      if (theoryPerM3 > 0) return { w: a.m3 * theoryPerM3, basis: 'bình quân thanh/m³ × KL ống/1 thanh' };
      return { w: a.m3, basis: 'theo m³' };
    };
    const weightSum = staged.reduce((s, st) => s + weightOf(st).w, 0);
    // LƯỢNG KG TƯƠI ĐỂ CHIA của kỳ: có hệ số kg/thanh → thanh × hệ số (khớp chuỗi);
    // không có → dùng thẳng kg tươi NHẬP trong kỳ (hành vi cũ).
    const poolKg = kgPerThanh > 0 ? (weightSum * kgPerThanh) : c.tuoiKg;

    const ui = loadTraceUi();
    const rows = [];

    staged.forEach(st => {
      const a = st.a, rate = st.rate;
      if (ui.productId && String(ui.productId) !== a.productId) return;
      const wo = weightOf(st);
      const share = weightSum > 0 ? wo.w / weightSum : 0;
      const tuoiP = poolKg * share;
      const kgPerM3 = a.m3 > 0 ? tuoiP / a.m3 : null;
      const kgPerUnit = a.outQty > 0 ? tuoiP / a.outQty : null;

      // Lý thuyết theo định mức nguyên vật liệu (tab Kế Hoạch):
      //   thanh/m³ theo ĐM × kg tươi cho 1 thanh (hệ số chuỗi) → kg tươi/1 m³
      const dims = traceRateDims(rate);
      const unitVol = dims ? (dims[0] * dims[1] * dims[2]) / 1000000000 : 0;
      const perM3 = unitVol > 0 ? 1 / unitVol : 0;              // số đơn vị trong 1 m³
      const thanhPerM3 = perM3 * st.nanPerUnit;
      const kgPerM3LyThuyet = (kgPerThanh > 0 && thanhPerM3 > 0) ? thanhPerM3 * kgPerThanh : null;

      rows.push({
        productId: a.productId,
        unlinked: a.productId === TRACE_UNLINKED_ID,
        label: a.productId === TRACE_UNLINKED_ID
          ? 'Chưa gắn mã (ván thô chưa vào thành phẩm / không khớp định mức)'
          : (rate ? rateDisplayLabel(rate) : 'Sản phẩm đã xóa'),
        unit: rate ? rateUnit(rate) : (a.thanhReal > 0 ? 'Thanh' : 'Tấm'),
        nanUse: rate ? rateNanUse(rate) : '',
        effPct: rate ? (Number(rate.efficiency) || 70) : null,
        nanPerUnit: st.nanPerUnit,
        unitVol,
        runs: a.runs,
        outQty: a.outQty,
        m3: a.m3,
        thanhReal: a.thanhReal,
        thanhTheory: a.thanhTheory,
        unmatchedPieces: a.unmatchedPieces,
        basis: wo.basis,
        sources: Array.from(a.src).join(' · '),
        sharePct: share * 100,
        tuoiKg: tuoiP,
        kgPerM3,
        kgPerUnit,
        kgPerM3LyThuyet
      });
    });

    // Sắp: mã có thể tích/sản lượng giảm dần, dòng "Chưa gắn mã" xuống CUỐI
    rows.sort((x, y) => (x.unlinked ? 1 : 0) - (y.unlinked ? 1 : 0) || y.m3 - x.m3 || y.outQty - x.outQty);
    return {
      rows,
      totalM3,
      totalTuoi: poolKg,                 // kg tươi ĐÃ CHIA cho các mã (theo hệ số chuỗi)
      tuoiNhap: c.tuoiKg,                // kg tươi NHẬP trong kỳ (số thực, để đối chiếu)
      kgPerThanh,                        // kg tươi cho 1 thanh nan ĐANG DÙNG (hệ số tham chiếu)
      kgPerThanhRef: ref.kgPerThanh,     // hệ số của cửa sổ tham chiếu
      ownKgPerThanh,                     // hệ số riêng của kỳ (để đối chiếu)
      periodComplete: !!c.complete,      // kỳ này có đo đủ 4 mốc chuỗi không
      useRef,                            // hệ số đang dùng có phải của cửa sổ tham chiếu?
      refLabel: ref.label,
      refMonths: ref.months,
      unmatchedTotal                     // tấm ván thô ghi cỡ không khớp (cần cảnh báo)
    };
  }
  // ─── DANH SÁCH KHỐI LƯỢNG BÌNH QUÂN THEO TỪNG CỠ THANH ────────
  // Mục đích: MỖI CỠ nan có khối lượng riêng (thanh 1250×24×8 KHÁC 1250×18×7),
  // KHÔNG quy chung 1 con số. 3 cột số theo ĐÚNG thứ tự chuỗi giá trị:
  //   ① KL ỐNG LUỒNG / 1 thanh — CƠ SỞ (lượng ống cần để ra 1 thanh cỡ đó)
  //   ② KL tươi quy đổi / 1 thanh = ① ÷ TỶ LỆ ống/tươi kỳ — SUY RA TỪ ỐNG
  //      (một phép chia duy nhất ⇒ 2 cột LUÔN nhất quán, không lệch pha)
  //   ③ KL thanh thực tế ≈ (lý thuyết, đối chiếu) = thể tích 1 thanh × 1.000
  //      (tre tươi ~1 kg/L) — KHÔNG cần nhập thêm số liệu. Thứ tự vật lý đúng:
  //      ③ thực tế < ① ống < ② tươi (mỗi chặng đều hao hụt trước khi ra thanh).
  // Cách tính (bám đúng chuỗi liên kết đã có trong dữ liệu):
  //   Chọn nan thô (baothoId) → lượt Bào thô → các lượt Bổ ống (boOngIds[])
  //   → lượt Cắt chọn (cutId) → kg đầu vào / kg ống luồng.
  // Hao hụt giữa các công đoạn KHÔNG tách được theo cỡ ⇒ chia kg của nhóm cho
  // từng cỡ theo TỈ TRỌNG THỂ TÍCH (thanh × thể tích 1 thanh) — giả định duy
  // nhất kiểm chứng được, đã ghi rõ trong tooltip panel.
  // Mắt link đứt → gom dòng "Không rõ (mất link)" chứ KHÔNG vứt số.
  function traceOngSizeRows(matchFn) {
    const match = typeof matchFn === 'function' ? matchFn : (d => traceInPeriod(d));
    const c = traceChainFor(match);
    const ref = traceReferenceWindow();
    // Tỷ lệ ống/tươi (DẠNG THẬP PHÂN): của kỳ; kỳ thiếu dữ liệu cắt → mượn cửa
    // sổ tham chiếu. Lưu ý: chuỗi kỳ trả `ongRatioPct` (phần trăm) — phải ÷100.
    const ownRatio = (c.ongRatioPct != null && c.ongRatioPct > 0) ? (c.ongRatioPct / 100) : 0;
    const ongRatio = ownRatio > 0 ? ownRatio : (ref.ongRatio || 0);

    const KEY_UNK = '__unknown__';
    const rowsBySize = new Map();   // sizeKey -> { sizeKey, thanh, kgLuong, unitVol, groups:Set, isUnknown }
    const groups = new Map();       // baothoId -> { vol, bySize: Map(size -> {thanh, vol}) }
    let rejectThanh = 0, externalThanh = 0;

    const rowOf = (sizeKey, isUnknown) => {
      let r = rowsBySize.get(sizeKey);
      if (!r) {
        r = { sizeKey, thanh: 0, kgLuong: 0, unitVol: 0, groups: new Set(), isUnknown: !!isUnknown };
        rowsBySize.set(sizeKey, r);
      }
      return r;
    };

    // ① GOM theo nhóm Bào thô: thể tích từng cỡ + tổng thể tích nhóm
    (state.xuong2ChonNanThoRecords || []).forEach(r => {
      if (!r || !match(r.date)) return;
      const d = chonNanDisplay(r);
      const q = Number(d.quantity) || 0;
      if (q <= 0) return;
      if (r.external) { externalThanh += q; return; }       // nan MUA NGOÀI: không thuộc chuỗi
      if (d.cls === 'reject') { rejectThanh += q; return; } // "Loại hẳn": đếm riêng
      const sizeKey = traceNormSize(d.sizeKey || (Array.isArray(d.dims) ? d.dims.join('×') : ''));
      const vol = q * (Number(d.unitVol) || 0);
      const gid = String(r.baothoId || '') || KEY_UNK;
      const g = groups.get(gid) || { vol: 0, bySize: new Map() };
      const s = g.bySize.get(sizeKey) || { thanh: 0, vol: 0, unitVol: Number(d.unitVol) || 0 };
      s.thanh += q; s.vol += vol;
      g.bySize.set(sizeKey, s);
      g.vol += vol;
      groups.set(gid, g);
    });

    // ② KG của từng nhóm: kg ống bổ đạt (bổ ống) + kg ống luồng (cắt chọn)
    //    Lượt bổ dùng CHUNG cho nhiều lượt bào thô → chia kg theo TỈ TRỌNG THỂ TÍCH
    //    của các nhóm cùng dùng lượt bổ đó.
    const boOf = (id) => (state.xuong2BoOngRecords || []).find(x => x && x.id === id) || null;
    const btOf = (id) => (state.xuong2BaoThoRecords || []).find(x => x && x.id === id) || null;
    const cutOf = (id) => (state.xuong2CutRecords || []).find(x => x && x.id === id) || null;
    // Tổng inputOng của MỌI lượt bổ cùng một lượt cắt (để chia kg ống luồng lô cắt)
    const cutInOngSum = new Map();
    (state.xuong2BoOngRecords || []).forEach(bo => {
      if (!bo || !bo.cutId) return;
      const v = Number(boOngDisplay(bo).inputOng) || 0;
      cutInOngSum.set(bo.cutId, (cutInOngSum.get(bo.cutId) || 0) + v);
    });

    // Thể tích các nhóm dùng chung 1 lượt bổ (để chia kg của lượt bổ đó)
    const boToGroups = new Map();   // boId -> Map(gid -> vol)
    groups.forEach((g, gid) => {
      const bt = btOf(gid);
      if (!bt) return;
      const ids = Array.isArray(bt.boOngIds) && bt.boOngIds.length
        ? bt.boOngIds.filter(Boolean)
        : (bt.boOngId ? [bt.boOngId] : []);
      ids.forEach(bid => {
        const m = boToGroups.get(bid) || new Map();
        m.set(gid, (m.get(gid) || 0) + g.vol);
        boToGroups.set(bid, m);
      });
    });

    const gTotals = new Map();      // gid -> { kgOngBo, kgLuong, hasLink }
    groups.forEach((g, gid) => gTotals.set(gid, { kgOngBo: 0, kgLuong: 0, hasLink: false }));
    boToGroups.forEach((gidVols, boId) => {
      const bo = boOf(boId);
      if (!bo) return;
      const bd = boOngDisplay(bo);
      const volSum = Array.from(gidVols.values()).reduce((s, v) => s + v, 0);
      if (volSum <= 0) return;
      const cut = bo.cutId ? cutOf(bo.cutId) : null;
      // KG ống luồng của lượt bổ = phần của lô cắt theo tỉ trọng inputOng
      let ongKgOfBo = 0;
      if (cut) {
        const cd = cutDisplay(cut);
        const sumIn = cutInOngSum.get(bo.cutId) || 0;
        const my = Number(bd.inputOng) || 0;
        ongKgOfBo = sumIn > 0 ? (Number(cd.klOngLuong) || 0) * (my / sumIn) : 0;
      } else {
        ongKgOfBo = Number(bd.lotOng) || 0;   // mất link cắt → dùng snapshot KL ống của lô
      }
      gidVols.forEach((v, gid) => {
        const t = gTotals.get(gid);
        const w = v / volSum;
        t.kgOngBo += (Number(bd.klOngBo) || 0) * w;
        t.kgLuong += ongKgOfBo * w;
        if (cut) t.hasLink = true;
      });
    });

    // ③ Rải về từng cỡ theo TỈ TRỌNG THỂ TÍCH trong nhóm
    groups.forEach((g, gid) => {
      const t = gTotals.get(gid) || { kgOngBo: 0, kgLuong: 0, hasLink: false };
      const noLink = !btOf(gid) || !(g.vol > 0) || (t.kgOngBo === 0 && t.kgLuong === 0);
      const target = noLink ? rowOf('__unknown__', true) : null;
      g.bySize.forEach((s, sizeKey) => {
        const row = target || rowOf(sizeKey, false);
        const w = g.vol > 0 ? (s.vol / g.vol) : 0;
        row.thanh += s.thanh;
        row.kgLuong += t.kgLuong * w;          // CƠ SỞ = kg ống luồng (quy về Cắt chọn)
        if (!target && s.unitVol > 0) row.unitVol = s.unitVol;   // thể tích 1 thanh (cùng cỡ = cùng vol)
        row.groups.add(gid);
      });
    });

    const rows = Array.from(rowsBySize.values()).map(r => {
      // ① KL ống luồng / thanh — CƠ SỞ
      const kgPerThanhLuong = (r.thanh > 0 && r.kgLuong > 0) ? r.kgLuong / r.thanh : null;
      // ② KL tươi quy đổi / thanh = ① ÷ tỷ lệ ống/tươi (suy ra — luôn nhất quán với ①)
      const kgPerThanhTuoi = (kgPerThanhLuong != null && ongRatio > 0) ? kgPerThanhLuong / ongRatio : null;
      // ③ KL thanh thực tế ≈ (lý thuyết) = thể tích 1 thanh × 1.000 (tre tươi ~1 kg/L)
      const unitVol = Number(r.unitVol) || 0;
      const kgRealTheoLyThuyet = unitVol > 0 ? unitVol * 1000 : null;
      return {
        sizeKey: r.sizeKey,
        isUnknown: r.isUnknown,
        thanh: r.thanh,
        kgLuong: r.kgLuong,
        kgPerThanhTuoi,
        kgPerThanhLuong,
        kgRealTheoLyThuyet,
        groups: r.groups.size
      };
    });
    // Sắp: cỡ nhiều thanh trước, dòng "Không rõ" xuống CUỐI
    rows.sort((x, y) => (x.isUnknown ? 1 : 0) - (y.isUnknown ? 1 : 0) || y.thanh - x.thanh);

    const known = rows.filter(r => !r.isUnknown);
    const totalThanh = rows.reduce((s, r) => s + r.thanh, 0);
    const knownThanh = known.reduce((s, r) => s + r.thanh, 0);
    const totalKgLuong = known.reduce((s, r) => s + r.kgLuong, 0);
    // KG tươi tổng = ống luồng tổng ÷ tỷ lệ ống/tươi (một phép chia duy nhất — nhất quán từng dòng)
    const totalKgTuoi = ongRatio > 0 ? totalKgLuong / ongRatio : 0;
    return {
      rows, totalThanh, knownThanh, totalKgTuoi, totalKgLuong,
      // BÌNH QUÂN chỉ tính trên các cỡ ĐO ĐƯỢC kg (bỏ dòng "Không rõ" khỏi mẫu
      // số — nếu không, số bình quân bị hụt vì có thanh mà không có kg).
      kgPerThanhTuoi: knownThanh > 0 ? totalKgTuoi / knownThanh : null,
      kgPerThanhLuong: knownThanh > 0 ? totalKgLuong / knownThanh : null,
      rejectThanh, externalThanh,
      ongRatio, usingRefRatio: !(ownRatio > 0) && ref.ongRatio > 0,
      refLabel: ref.label,
      hasData: totalThanh > 0
    };
  }



  // ─── VẼ: DẢI CHỈ SỐ TỔNG QUAN ─────────────────────────────────
  // `btnId` (tuỳ chọn) → ô KPI trở thành NÚT mở panel chi tiết (dropdown nổi)
  function traceKpiCardHtml(label, value, unit, tone, title, btnId) {
    const cls = `trace-kpi${tone ? ' trace-kpi-' + tone : ''}`;
    if (btnId) {
      return `<button type="button" class="${cls} trace-kpi-btn" id="${escapeHTML(btnId)}"
        aria-haspopup="true" aria-expanded="false" aria-controls="${TRACE_SIZE_PANEL_ID}"
        title="${escapeHTML(title || '')}">
        <div class="trace-kpi-label">${escapeHTML(label)} <span class="trace-kpi-more">▾ chi tiết theo cỡ</span></div>
        <div class="trace-kpi-value">${value}<span class="trace-kpi-unit">${escapeHTML(unit)}</span></div>
      </button>`;
    }
    return `<div class="${cls}" title="${escapeHTML(title || '')}">
      <div class="trace-kpi-label">${escapeHTML(label)}</div>
      <div class="trace-kpi-value">${value}<span class="trace-kpi-unit">${escapeHTML(unit)}</span></div>
    </div>`;
  }

  function traceKpiHtml(chain, prod) {
    // M³ ĐẦU RA = tổng m³ của BẢNG MÃ (không đếm trùng ván thô + thành phẩm)
    const outM3 = prod && prod.totalM3 > 0 ? prod.totalM3 : 0;
    // KG TƯƠI DÙNG ĐỂ TÍNH = kg đã chia theo hệ số chuỗi (kỳ thiếu → hệ số tham chiếu)
    const poolKg = prod && prod.totalTuoi > 0 ? prod.totalTuoi : chain.tuoiKg;
    const hasData = chain.tuoiKg > 0 || outM3 > 0 || poolKg > 0;
    const kgPerM3All = outM3 > 0 ? poolKg / outM3 : null;
    const m3PerTon = poolKg > 0 && outM3 > 0 ? (outM3 / poolKg) * 1000 : null;
    const single = prod.rows.length === 1 ? prod.rows[0] : null;
    // (B2 — 15/10/2026) ĐÃ GỠ div chip "hệ số tham chiếu" khỏi dải KPI — chuyển
    // hết nội dung vào tooltip của ô KPI "Kg tươi / 1 thanh nan" (tooltipKpiRef).
    const tooltipKpiRef = prod.useRef
      ? (prod.periodComplete
        ? ` Đang dùng CỬA SỔ THAM CHIẾU ${prod.refLabel} (${prod.refMonths.join(', ')}) để các kỳ so sánh được; hệ số riêng của kỳ này: ${prod.ownKgPerThanh > 0 ? fmtNumT(prod.ownKgPerThanh) + ' kg/thanh' : '— (kỳ chưa đo đủ các mốc chuỗi)'}.`
        : ` ⚠ KỲ THIẾU ĐẦU VÀO (chưa đo đủ các mốc chuỗi: cắt chọn / bổ ống / bào thô) — dùng hệ số kg tươi/1 thanh của CỬA SỔ THAM CHIẾU ${prod.refLabel} (${prod.refMonths.join(', ')}); số hiển thị là ƯỚC TÍNH THAM CHIẾU, không phải số đo trực tiếp của kỳ.`)
      : '';
    const extKg = chain.chonNanExtThanh > 0 && prod.kgPerThanh > 0 ? chain.chonNanExtThanh * prod.kgPerThanh : 0;

    if (!hasData) {
      return `<div class="trace-kpi-row">${traceKpiCardHtml('Kỳ đang xem', 'Chưa có dữ liệu', 'trong kỳ', 'muted',
        'Chưa có nguyên liệu nhập hoặc lượt ép nào trong kỳ này')}</div>`;
    }

    return `<div class="trace-kpi-row">
      ${traceKpiCardHtml('Luồng tươi nhập', fmtKgT(chain.tuoiKg), 'kg', '',
        'SỐ THỰC nhập trong kỳ (tab Nguyên Liệu). Lưu ý: phần chưa qua cắt vẫn còn tồn, nên con số này KHÔNG dùng làm mẫu số tính kg/m³ (xem ô bên cạnh).')}
      ${traceKpiCardHtml('Ống luồng cắt ra', fmtKgT(chain.ongKg), 'kg', '',
        `Cắt chọn tạo ra ${fmtPctT(chain.ongRatioPct)} khối lượng đầu vào`)}
      ${traceKpiCardHtml('Thanh chọn nan đạt', fmtKgT(chain.chonNanThanh), 'thanh', '',
        'Thanh nan đạt sau Chọn Nan Thô (không tính lượt nan mua ngoài)')}
      ${traceKpiCardHtml('Sản phẩm ra', fmtM3T(outM3), 'm³', '',
        `Tổng thể tích của ${prod.rows.length} mã ván/thanh/Bullig trong kỳ (đã trừ trùng ván thô ↔ thành phẩm) · ván thô tạo ra ${fmtM3T(chain.pressVtM3)} m³`)}
      ${traceKpiCardHtml('Luồng tươi / 1 m³', kgPerM3All == null ? '—' : fmtKgT(kgPerM3All), 'kg/m³', 'head',
        'CHỈ SỐ CHÍNH: kg luồng tươi ĐÃ CHIA cho các mã ÷ tổng m³ sản phẩm. Kg tươi chia = thanh nan × hệ số kg tươi/1 thanh lấy theo CHUỖI của kỳ (không lấy kg nhập kỳ, vì còn tồn chưa cắt).')}
      ${traceKpiCardHtml('Kg tươi / 1 thanh nan', prod.kgPerThanh > 0 ? fmtNumT(prod.kgPerThanh) : '—', 'kg/thanh',
        'pick',
        `Hệ số đang dùng = kg ống bổ đạt ÷ thanh bào thô ÷ tỷ lệ ống/tươi.${tooltipKpiRef} BẤM ĐỂ XEM KHỐI LƯỢNG BÌNH QUÂN THEO TỪNG CỠ THANH (KL ống luồng / thanh — CƠ SỞ · KL tươi quy đổi · KL thanh thực tế ≈).`,
        TRACE_SIZE_BTN_ID)}
      ${traceKpiCardHtml('Sản lượng quy đổi', m3PerTon == null ? '—' : fmtNumT(m3PerTon), 'm³/tấn', '',
        'Hiệu quả chung: số m³ sản phẩm thu được từ 1 tấn luồng tươi (theo kg tươi đã chia)')}
      ${extKg > 0 ? traceKpiCardHtml('Nan mua ngoài (ngoài chuỗi)', fmtKgT(chain.chonNanExtThanh), 'thanh', 'pick',
        `Thanh nan MUA NGOÀI công đoạn trong kỳ — KHÔNG thuộc chuỗi luồng tươi nên không cộng vào bảng mã. Quy đổi tương đương ≈ ${fmtKgT(extKg)} kg tươi (theo hệ số chuỗi). Nếu gộp: kg tươi/1 m³ ≈ ${outM3 > 0 ? fmtKgT((poolKg + extKg) / outM3) : '—'} kg/m³.`) : ''}
      ${single ? traceKpiCardHtml('Mã đang chọn · kg/m³', single.kgPerM3 == null ? '—' : fmtKgT(single.kgPerM3), 'kg/m³', 'pick',
        `Ước tính phân bổ cho ${single.label}`) : ''}
      ${single ? traceKpiCardHtml('Mã đang chọn · kg/' + (single.unit === 'Thanh' ? 'thanh' : 'tấm'),
        single.kgPerUnit == null ? '—' : fmtNumT(single.kgPerUnit), 'kg', `Ước tính phân bổ cho ${single.label}`) : ''}
    </div>`;
  }

  // ─── VẼ: BẢNG CHUỖI GIÁ TRỊ (7 CHẶNG) ─────────────────────────
  function traceStepRow(no, name, unit, inVal, outVal, lossVal, note) {
    const inN = Number(inVal), outN = Number(outVal);
    const hasBoth = Number.isFinite(inN) && Number.isFinite(outN) && inN > 0;
    const loss = Number.isFinite(Number(lossVal)) ? Number(lossVal) : (hasBoth ? inN - outN : null);
    const pct = (hasBoth && loss != null) ? (loss / inN) * 100 : null;
    return `<tr>
      <td class="trace-step-no">${no}</td>
      <td class="trace-step-name">${escapeHTML(name)}${note ? `<div class="trace-step-note">${escapeHTML(note)}</div>` : ''}</td>
      <td class="trace-step-unit">${escapeHTML(unit)}</td>
      <td class="trace-num">${Number.isFinite(inN) ? fmtNumT(inN) : '—'}</td>
      <td class="trace-num trace-out">${Number.isFinite(outN) ? fmtNumT(outN) : '—'}</td>
      <td class="trace-num ${loss != null && loss > 0 ? 'trace-loss' : ''}">${loss == null ? '—' : fmtNumT(loss)}</td>
      <td class="trace-num ${pct != null && pct > 0 ? 'trace-loss' : ''}">${pct == null ? '—' : fmtPctT(pct)}</td>
    </tr>`;
  }

  function traceChainTableHtml(chain) {
    const rows = [
      traceStepRow(1, 'Luồng tươi nhập', 'kg', null, chain.tuoiKg, null, 'Nguyên liệu Xưởng 2 nhập trong kỳ'),
      traceStepRow(2, 'Cắt chọn → Ống luồng', 'kg', chain.cutIn, chain.ongKg, chain.cutIn - chain.ongKg,
        `Phụ phẩm: củi đốt ${fmtKgT(chain.cuiKg)} kg · cây loại ${fmtKgT(chain.cayLoaiKg)} kg`),
      traceStepRow(3, 'Bổ ống → Ống bổ đạt', 'kg', chain.ongBoIn, chain.ongBoKg, chain.ongBoLoai,
        `Ống loại ${fmtKgT(chain.ongBoLoai)} kg · phần ống chưa bổ còn ở tồn chờ bổ`),
      traceStepRow(4, 'Chạy máy bào thô', 'thanh', null, chain.baoThoThanh, null,
        `Thể tích quy đổi ${fmtM3T(chain.baoThoM3)} m³`),
      traceStepRow(5, 'Chọn nan thô → Nan đạt', 'thanh', chain.baoThoThanh, chain.chonNanThanh,
        chain.baoThoThanh - chain.chonNanThanh,
        `Nan "Loại hẳn" ${fmtKgT(chain.chonNanReject)} thanh`),
      traceStepRow(6, 'Bào tinh → Nan đạt', 'thanh', chain.baoTinhIn, chain.baoTinhOk, chain.baoTinhErr,
        `Thể tích đạt ${fmtM3T(chain.baoTinhM3Ok)} m³`),
      traceStepRow(7, 'Ép ván → Thành phẩm', 'm³', null, chain.pressFinishedM3, null,
        `${chain.pressRuns} lượt ép · ván thô tạo ra ${fmtM3T(chain.pressVtM3)} m³`)
    ].join('');

    return `<div class="table-responsive table-scroll trace-table-wrap">
      <table class="data-table trace-table" id="trace-chain-table">
        <thead><tr>
          <th class="trace-step-no">#</th>
          <th>Chặng</th>
          <th class="trace-step-unit">ĐVT</th>
          <th class="trace-num">Vào</th>
          <th class="trace-num">Ra</th>
          <th class="trace-num">Hao hụt</th>
          <th class="trace-num">Tỷ lệ hao</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // ─── VẼ: BẢNG TRUY XUẤT THEO TỪNG MÃ ──────────────────────────
  function traceProductsTableHtml(prod) {
    // CẢNH BÁO CỨNG: tấm ván thô ghi cỡ KHÔNG khớp lượt tạo ván thô nào trong kỳ
    // → không truy được gốc nan (trước đây im lặng bỏ qua). Nay nêu rõ để sửa.
    const warn = prod.unmatchedTotal > 0
      ? `<div class="trace-warn" title="Các lượt ép thành phẩm có ghi Đầu vào = tấm ván thô, nhưng CỠ đó không khớp cỡ ván thô nào được tạo trong kỳ (có thể gõ sai tên cỡ). Phần này KHÔNG truy được gốc về thanh nan nên bị loại khỏi phép chia kg tươi.">
          <i data-lucide="alert-triangle"></i>
          ${fmtNumT(prod.unmatchedTotal)} tấm ván thô ghi cỡ KHÔNG khớp lượt tạo ván thô nào trong kỳ — không truy được gốc nan (kiểm tra lại tên cỡ đã nhập).
        </div>`
      : '';

    if (!prod.rows.length) {
      return `${warn}<div class="trace-empty"><i data-lucide="inbox"></i>
        <p>Chưa có lượt ÉP VÁN / Bullig / KIỂM THANH nào trong kỳ này — chưa truy xuất được theo mã.</p></div>`;
    }
    const totalOut = prod.rows.reduce((s, r) => s + r.outQty, 0);
    const totalThanh = prod.rows.reduce((s, r) => s + r.thanhReal, 0);
    const totalRow = `<tr class="trace-total-row">
      <td colspan="2">TỔNG ${prod.rows.length} mã</td>
      <td class="trace-num">${fmtNumT(totalOut)}</td>
      <td class="trace-num">${fmtM3T(prod.totalM3)}</td>
      <td class="trace-num">${totalThanh > 0 ? fmtNumT(totalThanh) : '—'}</td>
      <td class="trace-num">${fmtNumT(prod.totalTuoi)}</td>
      <td class="trace-num">${prod.totalM3 > 0 ? fmtKgT(prod.totalTuoi / prod.totalM3) : '—'}</td>
      <td class="trace-num"></td>
    </tr>`;

    // Chi tiết giải thích (cơ sở phân bổ · nguồn số · ĐM thanh/đơn vị) CHỈ ở
    // tooltip title của ô tên mã — không hiển thị ra ngoài (gọn bảng, theo yêu cầu).
    const nameTitle = (r) => [
      `${r.unit} · ${r.runs} lượt · chiếm ${fmtPctT(r.sharePct)} thể tích kỳ`,
      `Phân bổ theo: ${r.basis}`,
      r.sources ? `Nguồn số đo: ${r.sources}` : '',
      r.nanPerUnit ? `Định mức: ${fmtNumT(r.nanPerUnit)} thanh cho 1 ${r.unit === 'Thanh' ? 'thanh' : 'tấm'}` : '',
      r.effPct != null ? `Hiệu suất chuyển đổi nan khai trong định mức: ${fmtPctT(r.effPct)}` : ''
    ].filter(Boolean).join(' — ');

    const body = prod.rows.map(r => `<tr${r.unlinked ? ' class="trace-unlinked-row"' : ''}>
      <td class="trace-prod-name" title="${escapeHTML(nameTitle(r))}">${escapeHTML(r.label)}
        ${r.nanUse ? `<span class="trace-tag trace-tag-${r.nanUse === 'Bullig' ? 'bullig' : 'van'}">${escapeHTML(r.nanUse)}</span>` : ''}
        ${r.unmatchedPieces > 0 ? `<span class="trace-tag trace-tag-warn" title="${fmtNumT(r.unmatchedPieces)} tấm ván thô của mã này ghi cỡ không khớp lượt tạo ván thô nào → phần đó không truy được gốc nan">⚠ cỡ lệch</span>` : ''}
        <div class="trace-step-note">${escapeHTML(r.unit)} · ${r.runs} lượt · chiếm ${fmtPctT(r.sharePct)}</div>
      </td>
      <td class="trace-num">${fmtNumT(r.outQty)}</td>
      <td class="trace-num">${fmtM3T(r.m3)}</td>
      <td class="trace-num">${r.thanhReal > 0 ? fmtNumT(r.thanhReal) : '—'}</td>
      <td class="trace-num">${fmtNumT(r.tuoiKg)}</td>
      <td class="trace-num trace-head-num">${r.kgPerM3 == null ? '—' : fmtKgT(r.kgPerM3)}</td>
      <td class="trace-num">${r.kgPerUnit == null ? '—' : fmtNumT(r.kgPerUnit)}</td>
      <td class="trace-num ${r.kgPerM3LyThuyet != null && r.kgPerM3 != null && r.kgPerM3 > r.kgPerM3LyThuyet ? 'trace-loss' : ''}">
        ${r.kgPerM3LyThuyet == null ? '—' : fmtKgT(r.kgPerM3LyThuyet)}</td>
    </tr>`).join('');

    return `${warn}<div class="table-responsive table-scroll trace-table-wrap">
      <table class="data-table trace-table trace-prod-table" id="trace-product-table">
        <thead><tr>
          <th>Mã ván / thanh / Bullig</th>
          <th class="trace-num">Sản lượng</th>
          <th class="trace-num">Thể tích (m³)</th>
          <th class="trace-num" title="Số thanh ĐO THẬT mỗi mã tiêu thụ trong kỳ: ván = thanh nan vào máy ép (khối Đầu vào của lượt ép) · Bullig = thanh thô đã gia công · Thanh = thanh đưa vào kiểm (tab QC). Đây là CƠ SỞ PHÂN BỔ kg tươi.">Thanh dùng (đo thật)</th>
          <th class="trace-num">Kg tươi ước tính</th>
          <th class="trace-num">Kg tươi / 1 m³</th>
          <th class="trace-num">Kg tươi / 1 đơn vị</th>
          <th class="trace-num" title="Số kg luồng tươi cần cho 1 m³ NẾU chuỗi nan đạt đúng định mức nan ở tab Kế Hoạch (số thanh nan định mức ÷ hiệu suất chuyển đổi nan, chia cho tỷ lệ thanh/kg tươi thực tế của kỳ). So với cột 'Kg tươi / 1 m³' để biết phần vượt do chuỗi nan.">Kg tươi / 1 m³ (nếu đúng ĐM nan)</th>
        </tr></thead>
        <tbody>${body}${totalRow}</tbody>
      </table>
    </div>`;
  }

  // ─── NẠP DANH SÁCH MÃ VÁN VÀO Ô CHỌN ──────────────────────────
  function renderTraceProductOptions() {
    const sel = document.getElementById('trace-product');
    if (!sel) return;
    const ui = loadTraceUi();
    const rates = (Array.isArray(state.materialRates) ? state.materialRates : []).filter(Boolean);
    const opts = rates
      .map(r => ({ id: String(r.id), label: rateDisplayLabel(r) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    const keep = opts.some(o => o.id === ui.productId) ? ui.productId : '';
    if (keep !== ui.productId) { ui.productId = keep; saveTraceUi(); }
    sel.innerHTML = `<option value="">— Tất cả mã ván —</option>` +
      opts.map(o => `<option value="${escapeHTML(o.id)}"${o.id === keep ? ' selected' : ''}>${escapeHTML(o.label)}</option>`).join('');
  }

  // ─── ĐỒNG BỘ THANH CÔNG CỤ (nút chế độ + nhãn kỳ) ─────────────
  function syncTraceToolbar() {
    const ui = loadTraceUi();
    const label = document.getElementById('trace-period-label');
    if (label) label.textContent = tracePeriodLabel(ui.key, ui.mode);
    document.querySelectorAll('[data-trace-mode]').forEach(b => {
      const on = b.getAttribute('data-trace-mode') === ui.mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  // ─── THU GỌN / MỞ CHI TIẾT TỪNG CÔNG ĐOẠN (mặc định ẨN) ───────
  // Chi tiết đầu vào/ra của các công đoạn nằm trong khối #trace-detail; chỉ
  // hiện khi người dùng bấm nút "Chi tiết từng công đoạn". Nhớ theo MÁY.
  function syncTraceDetail() {
    const ui = loadTraceUi();
    const box = document.getElementById('trace-detail');
    if (box) box.hidden = !ui.openDetail;
    const btn = document.getElementById('trace-detail-toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', ui.openDetail ? 'true' : 'false');
      btn.innerHTML = ui.openDetail
        ? '<i data-lucide="chevron-up"></i> Ẩn chi tiết công đoạn'
        : '<i data-lucide="chevron-down"></i> Chi tiết từng công đoạn';
    }
  }

  function toggleTraceDetail() {
    const ui = loadTraceUi();
    ui.openDetail = !ui.openDetail;
    saveTraceUi();
    syncTraceDetail();
    initLucide();
  }
  // ─── PANEL "KHỐI LƯỢNG BÌNH QUÂN THEO TỪNG CỠ THANH" ──────────
  // DROPDOWN NỔI neo vào ô KPI (KHÔNG nằm trong luồng trang) nên điện thoại
  // KHÔNG bị kéo dài bảng / biến dạng khung: panel là con của THẺ, position
  // absolute + z-index đặt bằng INLINE STYLE (thắng mọi stylesheet, kể cả bản
  // do SW cache), tự mở XUỐNG khi đủ chỗ / mở LÊN khi thiếu chỗ, kẹp viewport.
  const traceSizeNorm = (s) => String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

  function traceSizeMatch(row) {
    const q = traceSizeQuery.trim();
    if (!q) return true;
    return traceSizeNorm(row.sizeKey).includes(traceSizeNorm(q));
  }

  function renderTraceSizePanel() {
    const panel = document.getElementById(TRACE_SIZE_PANEL_ID);
    if (!panel) return;
    const data = traceOngSizeRows();
    const fmtKg2 = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

    if (!data.hasData) {
      panel.innerHTML = `<div class="trace-size-head">Khối lượng bình quân theo từng cỡ thanh</div>
        <div class="trace-empty" style="padding:16px 12px;"><i data-lucide="inbox"></i>
          <p>Kỳ này chưa có lượt CHỌN NAN THÔ nào (có link về lô bào thô) — chưa tính được khối lượng theo cỡ.</p></div>`;
      initLucide();
      return;
    }

    const shown = data.rows.filter(traceSizeMatch);
    const shownKnown = shown.filter(r => !r.isUnknown);
    const sumThanh = shownKnown.reduce((s, r) => s + r.thanh, 0);
    // Tổng KG tươi suy từ ống (một phép chia — nhất quán với từng dòng)
    const sumKgTuoi = shownKnown.reduce((s, r) => s + (r.kgPerThanhTuoi != null ? r.kgPerThanhTuoi * r.thanh : 0), 0);
    const sumKgLuong = shownKnown.reduce((s, r) => s + r.kgLuong, 0);
    const bqTuoi = sumThanh > 0 ? sumKgTuoi / sumThanh : null;
    const bqLuong = sumThanh > 0 ? sumKgLuong / sumThanh : null;
    const unkThanh = shown.filter(r => r.isUnknown).reduce((s, r) => s + r.thanh, 0);
    // Chip cảnh báo: KL thanh thực tế (lý thuyết) lệch KL ống luồng quá ±60%
    // → đầu vào cắt/bổ lệch mạnh so với thể tích lý thuyết (dữ liệu sai hoặc ống mỏng bất thường).
    const sizeWarnOf = (r) => {
      if (r.isUnknown || r.kgPerThanhLuong == null || !(r.kgPerThanhLuong > 0)) return '';
      const real = Number(r.kgRealTheoLyThuyet);
      if (!Number.isFinite(real) || !(real > 0)) return '';
      const dev = Math.abs(real - r.kgPerThanhLuong) / r.kgPerThanhLuong;
      return dev > 0.6 ? `<span class="trace-size-warn" title="KL thanh thực tế (lý thuyết ${fmtKg2(real)} kg) lệch KL ống luồng (${fmtKg2(r.kgPerThanhLuong)} kg) hơn ±60% — kiểm tra số liệu đầu vào hoặc độ dày ống bất thường.">⚠ lệch</span>` : '';
    };

    const body = shown.map(r => `<tr${r.isUnknown ? ' class="trace-unlinked-row"' : ''}>
      <td class="trace-size-key" title="${escapeHTML(r.isUnknown
        ? 'Không tra được chuỗi liên kết Chọn nan thô → Bào thô → Bổ ống (bản ghi cũ đã xóa hoặc thiếu mã lô) nên CHƯA tính được kg — số thanh vẫn được giữ ở đây, không bị bỏ và KHÔNG tính vào bình quân.'
        : 'Cỡ thanh nan (Dài × Rộng × Dày, mm)')}">${escapeHTML(r.isUnknown ? 'Không rõ (mất link)' : r.sizeKey)}</td>
      <td class="trace-num">${fmtNumT(r.thanh)}</td>
      <td class="trace-num trace-head-num" title="KL ỐNG LUỒNG / 1 thanh — CƠ SỞ: kg ống luồng của lô cắt (quy về Cắt chọn) chia theo tỉ trọng thể tích rồi ÷ số thanh cỡ này.">${r.kgPerThanhLuong == null ? '—' : fmtKg2(r.kgPerThanhLuong)}</td>
      <td class="trace-num" title="KL TƯƠI quy đổi / 1 thanh = cột ỐNG LUỒNG ÷ tỷ lệ ống/tươi kỳ — SUY RA TỪ ỐNG nên 2 cột luôn nhất quán.">${r.kgPerThanhTuoi == null ? '—' : fmtKg2(r.kgPerThanhTuoi)}</td>
      <td class="trace-num" title="KL THẬT TẾ ≈ của 1 thanh (lý thuyết, đối chiếu) = thể tích 1 thanh × 1.000 (tre tươi ~1 kg/L) — KHÔNG phải số cân thật. Thứ tự đúng: thực tế &lt; ống luồng &lt; tươi quy đổi.">${r.kgRealTheoLyThuyet == null ? '—' : fmtKg2(r.kgRealTheoLyThuyet)}${sizeWarnOf(r)}</td>
      <td class="trace-num">${fmtNumT(r.groups)}</td>
    </tr>`).join('');

    const totalRow = `<tr class="trace-total-row">
      <td>TỔNG ${shownKnown.length} cỡ</td>
      <td class="trace-num">${fmtNumT(sumThanh)}</td>
      <td class="trace-num">${bqLuong == null ? '—' : fmtKg2(bqLuong)}</td>
      <td class="trace-num">${bqTuoi == null ? '—' : fmtKg2(bqTuoi)}</td>
      <td class="trace-num"></td>
      <td class="trace-num"></td>
    </tr>`;

    const extras = [];
    if (unkThanh > 0) extras.push(`còn ${fmtNumT(unkThanh)} thanh ở dòng "Không rõ (mất link)" chưa tính được kg (không đưa vào bình quân)`);
    if (data.rejectThanh > 0) extras.push(`Loại hẳn ${fmtNumT(data.rejectThanh)} thanh (đếm riêng)`);
    if (data.externalThanh > 0) extras.push(`nan mua ngoài ${fmtNumT(data.externalThanh)} thanh (ngoài chuỗi)`);

    panel.innerHTML = `
      <div class="trace-size-head">
        <span><i data-lucide="ruler"></i> Khối lượng bình quân theo từng cỡ thanh</span>
        <button type="button" class="trace-size-close" id="trace-size-close" title="Đóng">✕</button>
      </div>
      <div class="trace-size-tools">
        <input type="text" class="trace-size-search" id="trace-size-search"
               placeholder="Tìm theo cỡ thanh (VD 1250×18×7)…" value="${escapeHTML(traceSizeQuery)}">
      </div>
      <div class="trace-size-scroll">
        <table class="data-table trace-table trace-size-table">
          <thead><tr>
            <th>Cỡ thanh (mm)</th>
            <th class="trace-num">Số thanh</th>
            <th class="trace-num" title="KL ỐNG LUỒNG / 1 thanh — CƠ SỞ: kg ống luồng của lô cắt (quy về Cắt chọn) chia theo tỉ trọng thể tích rồi ÷ số thanh cỡ này. Đây là số ĐẦU VÀO để suy ra cột KL tươi.">KL ống luồng / thanh (cơ sở)</th>
            <th class="trace-num" title="KL TƯƠI quy đổi / 1 thanh = cột ỐNG LUỒNG ÷ tỷ lệ ống/tươi kỳ (suy ra — 2 cột luôn nhất quán).">KL tươi quy đổi / thanh</th>
            <th class="trace-num" title="KL THẬT TẾ ≈ của 1 thanh (lý thuyết, đối chiếu) = thể tích 1 thanh × 1.000 (tre tươi ~1 kg/L) — KHÔNG phải số cân thật. Thứ tự đúng: thực tế &lt; ống luồng &lt; tươi quy đổi.">KL thanh thực tế ≈</th>
            <th class="trace-num" title="Số nhóm lô bào thô đóng góp vào cỡ này">Lượt</th>
          </tr></thead>
          <tbody>${body}${totalRow}</tbody>
        </table>
      </div>
      <div class="trace-size-note">
        <i data-lucide="info"></i>
        <span>CƠ SỞ TÍNH = <strong>KL ống luồng / thanh</strong> (quy về Cắt chọn); KL tươi quy đổi = cột cơ sở ÷ tỷ lệ ống/tươi (${fmtNumT(data.ongRatio * 100)}%)${data.usingRefRatio ? ` (mượn cửa sổ tham chiếu ${escapeHTML(data.refLabel)} — kỳ này thiếu dữ liệu cắt)` : ''} — 2 cột SUY RA TỪ ỐNG nên luôn nhất quán. Cột <strong>KL thanh thực tế ≈</strong> chỉ là tham chiếu lý thuyết (thể tích × 1.000), để đối chiếu thứ tự: thực tế &lt; ống &lt; tươi.
        Kg của mỗi lô được chia cho từng cỡ theo <strong>tỉ trọng thể tích</strong> (số thanh × thể tích 1 thanh) vì hao hụt giữa các công đoạn không tách riêng được theo cỡ.
        ${extras.length ? escapeHTML(extras.join(' · ')) + '.' : ''}</span>
      </div>`;
    initLucide();
  }
  // Neo panel vào ô KPI: đủ chỗ mở XUỐNG, thiếu chỗ mở LÊN; kẹp trong khung nhìn
  function positionTraceSizePanel() {
    if (!traceSizeOpen) return;
    const panel = document.getElementById(TRACE_SIZE_PANEL_ID);
    const btn = document.getElementById(TRACE_SIZE_BTN_ID);
    const card = document.getElementById('trace-card');
    if (!panel || !btn || !card) return;
    const cr = card.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    panel.style.position = 'absolute';
    panel.style.zIndex = '260';
    const pad = 8;
    const width = Math.max(260, Math.min(cr.width - pad * 2, 620));
    panel.style.width = width + 'px';
    panel.style.maxWidth = 'calc(100vw - 16px)';
    const h = panel.offsetHeight || 320;
    const below = window.innerHeight - br.bottom - pad;
    const openUp = below < Math.min(h, 240) && (br.top - pad) > below;
    const top = openUp ? (br.top - cr.top - h - 6) : (br.bottom - cr.top + 6);
    let left = br.left - cr.left;
    if (left + width > cr.width - pad) left = Math.max(pad, cr.width - width - pad);
    if (left < pad) left = pad;
    panel.style.top = Math.round(top) + 'px';
    panel.style.left = Math.round(left) + 'px';
    panel.classList.toggle('open-up', !!openUp);
  }

  function syncTraceSizeBtn() {
    const btn = document.getElementById(TRACE_SIZE_BTN_ID);
    if (btn) btn.setAttribute('aria-expanded', traceSizeOpen ? 'true' : 'false');
  }

  function openTraceSizePanel() {
    const panel = document.getElementById(TRACE_SIZE_PANEL_ID);
    if (!panel) return false;
    traceSizeOpen = true;
    renderTraceSizePanel();      // vẽ TRƯỚC khi đo chiều cao để neo đúng
    panel.hidden = false;
    positionTraceSizePanel();
    syncTraceSizeBtn();
    return true;
  }

  function closeTraceSizePanel() {
    const panel = document.getElementById(TRACE_SIZE_PANEL_ID);
    if (panel) panel.hidden = true;
    traceSizeOpen = false;
    syncTraceSizeBtn();
  }

  function toggleTraceSizePanel() {
    if (traceSizeOpen) { closeTraceSizePanel(); return false; }
    return openTraceSizePanel();
  }

  function traceSizePanelOpen() { return traceSizeOpen; }

  // Ô tìm nhanh trong panel (chỉ vẽ lại THÂN panel, neo lại vị trí)
  function setTraceSizeQuery(q) {
    traceSizeQuery = String(q || '');
    if (!traceSizeOpen) return;
    renderTraceSizePanel();
    positionTraceSizePanel();
  }

  function traceSizeQueryOf() { return traceSizeQuery; }




  // ─── RENDER THẺ TRUY XUẤT ─────────────────────────────────────
  function renderTraceCard() {
    const card = document.getElementById('trace-card');
    if (!card) return;
    loadTraceUi();
    renderTraceProductOptions();
    syncTraceToolbar();
    syncTraceDetail();

    const chain = traceChainData();
    const prod = traceProductRows(chain);

    const kpiBox = document.getElementById('trace-kpis');
    if (kpiBox) kpiBox.innerHTML = traceKpiHtml(chain, prod);

    const chainBox = document.getElementById('trace-chain');
    if (chainBox) chainBox.innerHTML = traceChainTableHtml(chain);

    const prodBox = document.getElementById('trace-products');
    if (prodBox) prodBox.innerHTML = traceProductsTableHtml(prod);

    // Panel cỡ thanh (nếu đang mở) → vẽ lại theo kỳ mới + neo lại vị trí
    if (traceSizeOpen) { renderTraceSizePanel(); positionTraceSizePanel(); }
    syncTraceSizeBtn();

    initLucide();
  }

  // ─── HÀM ĐIỀU KHIỂN (gọi từ js/events.js) ─────────────────────
  function setTraceMode(mode) {
    const ui = loadTraceUi();
    if (!TRACE_MODES.includes(mode) || ui.mode === mode) return;
    ui.mode = mode;
    ui.key = traceDefaultKey(mode);
    saveTraceUi();
    renderTraceCard();
  }

  function shiftTracePeriod(dir) {
    const ui = loadTraceUi();
    ui.key = traceShiftKey(ui.key, ui.mode, dir > 0 ? 1 : -1);
    saveTraceUi();
    renderTraceCard();
  }

  function setTraceProduct(productId) {
    const ui = loadTraceUi();
    ui.productId = String(productId || '');
    saveTraceUi();
    renderTraceCard();
  }

export {
  TRACE_UI_KEY,
  TRACE_UNLINKED_ID,
  loadTraceUi,
  saveTraceUi,
  traceKeyOf,
  traceDefaultKey,
  traceShiftKey,
  tracePeriodLabel,
  traceInPeriod,
  traceChainData,
  traceChainFor,
  traceReferenceWindow,
  traceMonthLabelOf,
  traceNormSize,
  traceDimsNums,
  traceSizeUnitVol,
  traceRateDims,
  traceRateNanPerUnit,
  traceProductRows,
  traceOngSizeRows,
  TRACE_SIZE_PANEL_ID,
  TRACE_SIZE_BTN_ID,
  renderTraceSizePanel,
  positionTraceSizePanel,
  openTraceSizePanel,
  closeTraceSizePanel,
  toggleTraceSizePanel,
  traceSizePanelOpen,
  setTraceSizeQuery,
  traceSizeQueryOf,
  renderTraceCard,
  renderTraceProductOptions,
  syncTraceToolbar,
  syncTraceDetail,
  toggleTraceDetail,
  setTraceMode,
  shiftTracePeriod,
  setTraceProduct
};
