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
  let traceUi = null;

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
  function traceChainData() {
    // ① Luồng tươi nhập (kg) — nguyên liệu nhập cho Xưởng 2
    let tuoiKg = 0;
    (state.materialRecords || []).forEach(m => {
      if (!m || String(m.location || '') !== 'xuong-2') return;
      if (!traceInPeriod(m.date)) return;
      tuoiKg += Number(m.weight) || 0;
    });

    // ② Cắt chọn: đầu vào (kg) → ống luồng (kg) + phụ phẩm (củi đốt / cây loại)
    let cutIn = 0, ongKg = 0, cuiKg = 0, cayLoaiKg = 0;
    (state.xuong2CutRecords || []).forEach(r => {
      if (!r || !traceInPeriod(r.date)) return;
      const d = cutDisplay(r);
      cutIn += Number(d.inputWeight) || 0;
      ongKg += Number(d.klOngLuong) || 0;
      cuiKg += Number(d.klCuiDot) || 0;
      cayLoaiKg += Number(d.klCayLoai) || 0;
    });

    // ③ Bổ ống: ống đem bổ (kg) → ống bổ đạt (kg) + ống loại
    let ongBoIn = 0, ongBoKg = 0, ongBoLoai = 0;
    (state.xuong2BoOngRecords || []).forEach(r => {
      if (!r || !traceInPeriod(r.date)) return;
      const d = boOngDisplay(r);
      ongBoIn += Number(d.inputOng) || 0;
      ongBoKg += Number(d.klOngBo) || 0;
      ongBoLoai += Number(d.klOngLoai) || 0;
    });

    // ④ Chạy máy bào thô: số thanh + thể tích quy đổi (m³)
    let baoThoThanh = 0, baoThoM3 = 0;
    (state.xuong2BaoThoRecords || []).forEach(r => {
      if (!r || !traceInPeriod(r.date)) return;
      const d = baoThoDisplay(r);
      baoThoThanh += Number(d.qty) || 0;
      baoThoM3 += Number(d.volume) || 0;
    });

    // ⑤ Chọn nan thô: thanh đạt (bỏ lượt nan MUA NGOÀI — không thuộc chuỗi)
    let chonNanThanh = 0, chonNanM3 = 0, chonNanReject = 0;
    (state.xuong2ChonNanThoRecords || []).forEach(r => {
      if (!r || r.external || !traceInPeriod(r.date)) return;
      const d = chonNanDisplay(r);
      const q = Number(d.quantity) || 0;
      chonNanThanh += q;
      chonNanM3 += Number(d.volume) || 0;
      if (d.cls === 'reject') chonNanReject += q;   // "Loại hẳn" → tỷ lệ loại
    });

    // ⑥ Bào tinh: chỉ lượt kind 'tinh' (thanh chờ ép) — đầu vào → đạt/lỗi
    let baoTinhIn = 0, baoTinhOk = 0, baoTinhErr = 0, baoTinhM3Ok = 0;
    (state.xuong2BaoTinhRecords || []).forEach(r => {
      if (!r || r.kind !== 'tinh' || !traceInPeriod(r.date)) return;
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
      if (!r || !traceInPeriod(r.date)) return;
      const vol = pressRecordVolumeOf(r);
      pressM3 += vol;
      pressRuns += 1;
      if (Number(r.finishedQty) > 0) pressFinishedM3 += vol;
      (Array.isArray(r.vanTho) ? r.vanTho : []).forEach(l => {
        if (l && l.vtDim) pressVtM3 += dimVolume(l.vtDim, l.vtQty);
      });
    });

    return {
      tuoiKg,
      cutIn, ongKg, cuiKg, cayLoaiKg,
      ongBoIn, ongBoKg, ongBoLoai,
      baoThoThanh, baoThoM3,
      chonNanThanh, chonNanM3, chonNanReject,
      baoTinhIn, baoTinhOk, baoTinhErr, baoTinhM3Ok,
      pressM3, pressRuns, pressFinishedM3, pressVtM3,
      // Tỷ lệ quy đổi thực tế của kỳ
      thanhPerKgTuoi: tuoiKg > 0 ? chonNanThanh / tuoiKg : 0,
      ongRatioPct: cutIn > 0 ? (ongKg / cutIn) * 100 : null
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
        a = { productId: pid, outQty: 0, m3: 0, runs: 0, thanhReal: 0, thanhTheory: 0, src: new Set() };
        acc.set(pid, a);
      }
      return a;
    };

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
        const cur = vtMade.get(String(l.vtDim)) || { nan: 0, qty: 0 };
        cur.nan += runNan * (q / totQ);
        cur.qty += q;
        vtMade.set(String(l.vtDim), cur);
      });
    });
    const nanPerVtPiece = (size) => {
      const cur = vtMade.get(String(size || '').trim());
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
        nan += q * nanPerVtPiece(x && x.nanKey);                    // đầu vào là TẤM VÁN THÔ
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

    // Trọng số = thanh ĐO THẬT → thanh định mức → bình quân thanh/m³ → m³
    const weightOf = (st) => {
      const a = st.a;
      if (a.thanhReal > 0) return { w: a.thanhReal, basis: 'thanh thật' };
      if (a.thanhTheory > 0) return { w: a.thanhTheory, basis: 'thanh định mức' };
      if (theoryPerM3 > 0) return { w: a.m3 * theoryPerM3, basis: 'bình quân thanh/m³' };
      return { w: a.m3, basis: 'theo m³' };
    };
    const weightSum = staged.reduce((s, st) => s + weightOf(st).w, 0);

    const ui = loadTraceUi();
    const rows = [];

    staged.forEach(st => {
      const a = st.a, rate = st.rate;
      if (ui.productId && String(ui.productId) !== a.productId) return;
      const wo = weightOf(st);
      const share = weightSum > 0 ? wo.w / weightSum : 0;
      const tuoiP = c.tuoiKg * share;
      const kgPerM3 = a.m3 > 0 ? tuoiP / a.m3 : null;
      const kgPerUnit = a.outQty > 0 ? tuoiP / a.outQty : null;

      // Lý thuyết theo định mức nguyên vật liệu (tab Kế Hoạch)
      const dims = traceRateDims(rate);
      const unitVol = dims ? (dims[0] * dims[1] * dims[2]) / 1000000000 : 0;
      const perM3 = unitVol > 0 ? 1 / unitVol : 0;              // số đơn vị trong 1 m³
      const thanhPerM3 = perM3 * st.nanPerUnit;
      const kgPerM3LyThuyet = (c.thanhPerKgTuoi > 0 && thanhPerM3 > 0) ? thanhPerM3 / c.thanhPerKgTuoi : null;

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
    return { rows, totalM3, totalTuoi: c.tuoiKg };
  }

  // ─── VẼ: DẢI CHỈ SỐ TỔNG QUAN ─────────────────────────────────
  function traceKpiCardHtml(label, value, unit, tone, title) {
    return `<div class="trace-kpi${tone ? ' trace-kpi-' + tone : ''}" title="${escapeHTML(title || '')}">
      <div class="trace-kpi-label">${escapeHTML(label)}</div>
      <div class="trace-kpi-value">${value}<span class="trace-kpi-unit">${escapeHTML(unit)}</span></div>
    </div>`;
  }

  function traceKpiHtml(chain, prod) {
    // M³ ĐẦU RA = tổng m³ của BẢNG MÃ (không đếm trùng ván thô + thành phẩm)
    const outM3 = prod && prod.totalM3 > 0 ? prod.totalM3 : 0;
    const hasData = chain.tuoiKg > 0 || outM3 > 0;
    const kgPerM3All = outM3 > 0 ? chain.tuoiKg / outM3 : null;
    const m3PerTon = chain.tuoiKg > 0 && outM3 > 0 ? (outM3 / chain.tuoiKg) * 1000 : null;
    const single = prod.rows.length === 1 ? prod.rows[0] : null;

    if (!hasData) {
      return `<div class="trace-kpi-row">${traceKpiCardHtml('Kỳ đang xem', 'Chưa có dữ liệu', 'trong kỳ', 'muted',
        'Chưa có nguyên liệu nhập hoặc lượt ép nào trong kỳ này')}</div>`;
    }

    return `<div class="trace-kpi-row">
      ${traceKpiCardHtml('Luồng tươi nhập', fmtKgT(chain.tuoiKg), 'kg', '',
        'Tổng khối lượng luồng tươi nhập cho Xưởng 2 trong kỳ (tab Nguyên Liệu)')}
      ${traceKpiCardHtml('Ống luồng cắt ra', fmtKgT(chain.ongKg), 'kg', '',
        `Cắt chọn tạo ra ${fmtPctT(chain.ongRatioPct)} khối lượng đầu vào`)}
      ${traceKpiCardHtml('Thanh chọn nan đạt', fmtKgT(chain.chonNanThanh), 'thanh', '',
        'Thanh nan đạt sau Chọn Nan Thô (không tính lượt nan mua ngoài)')}
      ${traceKpiCardHtml('Sản phẩm ra', fmtM3T(outM3), 'm³', '',
        `Tổng thể tích của ${prod.rows.length} mã ván/thanh/Bullig trong kỳ (đã trừ trùng ván thô ↔ thành phẩm) · ván thô tạo ra ${fmtM3T(chain.pressVtM3)} m³`)}
      ${traceKpiCardHtml('Luồng tươi / 1 m³', kgPerM3All == null ? '—' : fmtKgT(kgPerM3All), 'kg/m³', 'head',
        'CHỈ SỐ CHÍNH: bình quân toàn nhà máy — tổng kg luồng tươi ÷ tổng m³ sản phẩm trong kỳ')}
      ${traceKpiCardHtml('Sản lượng quy đổi', m3PerTon == null ? '—' : fmtNumT(m3PerTon), 'm³/tấn', '',
        'Hiệu quả chung: số m³ sản phẩm thu được từ 1 tấn luồng tươi')}
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
    if (!prod.rows.length) {
      return `<div class="trace-empty"><i data-lucide="inbox"></i>
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

    return `<div class="table-responsive table-scroll trace-table-wrap">
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
  traceDimsNums,
  traceSizeUnitVol,
  traceRateDims,
  traceRateNanPerUnit,
  traceProductRows,
  renderTraceCard,
  renderTraceProductOptions,
  syncTraceToolbar,
  syncTraceDetail,
  toggleTraceDetail,
  setTraceMode,
  shiftTracePeriod,
  setTraceProduct
};
