// ═══════════════════════════════════════════════════════════
// js/capacity.js — BẢNG TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT
// (thẻ #capacity-card — ĐẦU tab Tổng Quan, cho lãnh đạo nắm nhanh)
// ═══════════════════════════════════════════════════════════
// 3 TẦNG XỔ TẠI CHỘ (inline, không mở pop-up) — xem theo TUẦN ISO hoặc THÁNG
//   (nút "Tuần ⇄ Tháng" + ô chọn tháng ở đầu thẻ, nhớ theo máy — state.capUi.mode):
//   TẦNG 1 — KỲ (cấp Xưởng): mỗi dòng 1 tuần/tháng — số công đoạn có dữ liệu ·
//             GIỜ HC · GIỜ TC · tổng giờ · HIỆU SUẤT XƯỞNG (bình quân gia quyền
//             theo giờ) · số công đoạn đạt ≥100% · nút thắt cổ chai (thấp nhất).
//   TẦNG 2 — CÔNG ĐOẠN trong kỳ: bấm 1 dòng kỳ → xổ bảng công đoạn
//             (lượt · sản lượng · giờ HC · giờ TC · tổng giờ · công suất thực ·
//             định mức kỳ · hiệu suất · so kỳ trước) + nút "Mở thẻ công đoạn"
//             để sang tab Công Đoạn xem/sửa theo ngày.
//   TẦNG 3 — NGÀY: bấm 1 dòng công đoạn → xổ TỪNG NGÀY của kỳ đó
//             (ngày · lượt · sản lượng · giờ HC/TC · công suất · hiệu suất).
//
// NÚT "IN BÁO CÁO" (#btn-cap-print): in ra giấy báo cáo CHỈ gồm THÔNG TIN CHUNG
//   của TẤT CẢ bộ phận (sổ CAP_WORKSHOPS — mỗi xưởng 1 bảng công đoạn + dòng
//   TỔNG xưởng), KHÔNG in gauge/thang xếp hạng/biểu đồ 8 kỳ
//   (vùng in riêng #cap-print-area + body.cap-printing — xem styles.css).
//
// 2 CHẾ ĐỘ XEM (nút chuyển ở đầu thẻ, nhớ theo máy — state.capUi.view):
//   • "Biểu đồ" (mặc định): GAUGE hiệu suất xưởng + THANG XẾP HẠNG công đoạn +
//     BIỂU ĐỒ Chart.js của công đoạn đang chọn (bấm hàng xếp hạng để đổi).
//   • "Bảng dữ liệu": bảng 3 tầng như trên (chart combo cũng hiện trong tầng 2).
//   (BẢN ĐỒ NHIỆT 8 kỳ × công đoạn ĐÃ GỠ 21/10/2026 — tốn diện tích, thay bằng
//    khối CẢNH BÁO DỮ LIỆU QUÁ HẠN bên dưới.)
//
// CẢNH BÁO DỮ LIỆU QUÁ HẠN (#cap-stale — banner + #cap-stale-panel chi tiết):
//   mỗi công đoạn lấy ngày cập nhật cuối = max(date) trong rows(); nếu đã trôi
//   QUÁ 1 NGÀY LÀM VIỆC (bỏ qua CN/ngày nghỉ ở Lịch Làm Việc tháng, trừ ngày làm
//   bù) thì cảnh báo — nêu rõ XƯỞNG, CÔNG ĐOẠN, ngày cập nhật cuối, số ngày và
//   ẢNH HƯỞNG (hiệu suất hụt/sai, xếp hạng & nút thắt sai, báo cáo in/Excel/AI/
//   truy xuất lệch, kế hoạch & chốt công lương lệch, lịch sử không dựng lại được).
//   Công đoạn CHƯA TỪNG có bản ghi → chỉ hiện XÁM trong panel ("có thể chưa vận
//   hành"), KHÔNG tính vào số cảnh báo đỏ.
//
// NGUỒN SỐ LIỆU = đúng các hàm hiển thị của từng thẻ công đoạn (cutDisplay,
// boOngDisplay, baoThoDisplay, chonNanDisplay, baoTinhDisplay, bulligDisplay,
// sayChargeRows, pressRecordVolumeOf + epVanSnapshotOf) nên số liệu LUÔN KHỚP
// màn hình. Bảng chỉ ĐỌC — không có state dữ liệu mới, không đồng bộ mây.
//
// 2 LUẬT TÍNH QUAN TRỌNG:
//   1) GIỜ là số của CẢ NGÀY (đọc từ Bảng bố trí Nhân Sự theo ngày, mọi lượt
//      cùng ngày dùng chung) → khi gộp tuần phải đếm giờ 1 LẦN cho mỗi
//      (công đoạn, ngày) — KHÔNG cộng theo từng bản ghi (1 ngày 3 lượt cắt
//      sẽ bị nhân 3 giờ).
//   2) ĐỊNH MỨC là theo THÁNG, tổng hợp là theo TUẦN → tuần vắt 2 tháng thì
//      định mức tuần = bình quân GIA QUYỀN THEO SẢN LƯỢNG của các tháng:
//      Σ(qty_tháng × rate_tháng) ÷ Σqty_tháng.
// Riêng THAN HÓA + SẤY: hiệu suất = Σ GIỜ CẦN ÷ (Σ GIỜ THỰC − Σ GIỜ SỰ CỐ)
// (đúng công thức thẻ Than Hóa + Sấy — không dùng kiểu công suất/định mức).
// ═══════════════════════════════════════════════════════════
import { initLucide } from './cloud.js';
import { friendlyMaterialWeek, materialWeekLabel } from './materials.js';
import { epVanRateOf, epVanSnapshotOf, pressRecordVolumeOf } from './press.js';
import { STORAGE_KEY_CAPACITY_UI, state } from './state.js';
import { attStatusOf, computeAttendanceStats, hrAssignmentsOf } from './hr.js';
import { qcFinalDisplay } from './qc-final.js';
import {
  baoThoDisplay, baoTinhDisplay, boOngDisplay, boluongDisplay, bulligDisplay, chonNanDisplay, cutDisplay,
  baoThoRateOf, baoTinhRateOf, boOngRateOf, boluongRateOf, bulligRateOf, capRateOf, chonNanRateOf,
  x2ChonNanLiveRecordsOf,
  catVanDisplay, catVanRateOf,
  baoVanDisplay, baoVanRateOf,
  sayChargeRows, sayShiftPerfOf, sayRateEntryOf,
  workerAssignmentsForCapacityMonth,
  // Chip ca dùng chung ở chi tiết Dashboard cho Than Hóa + Sấy và các công đoạn
  // nhập sản lượng theo ca; một nguồn hiển thị nhãn ca.
  x2ShiftChipHtml,
  // XƯỞNG 1 — 8 công đoạn (04–05/10/2026)
  x1CatOngDisplay, x1SaySinhDisplay, x1BocDisplay,
  x1ChainSpecByKey, x1ChainDisplay
} from './xuong2.js';
import { escapeHTML, formatDateDDMMYY, stageIncidentOf } from './utils.js';

  // ─── ĐỊNH DẠNG SỐ ─────────────────────────────────────────────
  const fmtNum1 = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const fmtNum2 = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const fmtM3Cap = v => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
  const fmtKg = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

  // ─── TUẦN ISO: khóa 'YYYY-Wnn' ↔ mốc thứ Hai ↔ dịch tuần ──────
  // Dùng lại materialWeekLabel (chuẩn của app — tab Nguyên Liệu/Kế Hoạch cũng
  // dùng) để khóa tuần LUÔN KHỚP với trường week đã lưu trong bản ghi.
  function todayISO() { return new Date().toISOString().split('T')[0]; }
  function capWeekKeyOf(dateStr) { return materialWeekLabel(dateStr); }
  function capCurrentWeekKey() { return capWeekKeyOf(todayISO()); }
  // Thứ Hai của tuần ISO (tính theo GIỜ ĐỊA PHƯƠNG — khớp materialWeekLabel)
  function capWeekMonday(weekKey) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(String(weekKey || ''));
    if (!m) return null;
    const year = Number(m[1]), week = Number(m[2]);
    const jan4 = new Date(year, 0, 4);
    const dayNr = (jan4.getDay() + 6) % 7;            // 0 = Thứ 2
    const week1Mon = new Date(year, 0, 4 - dayNr);    // Thứ 2 của tuần 1
    return new Date(week1Mon.getFullYear(), week1Mon.getMonth(), week1Mon.getDate() + (week - 1) * 7);
  }
  // ISO 'YYYY-MM-DD' từ Date ĐỊA PHƯƠNG (không dùng toISOString để tránh lệch múi giờ)
  function capISOOfLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function capWeekShift(weekKey, dir) {
    const mon = capWeekMonday(weekKey);
    if (!mon) return String(weekKey || '');
    return capWeekKeyOf(capISOOfLocal(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + dir * 7)));
  }
  function capWeekNumOf(weekKey) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(String(weekKey || ''));
    return m ? Number(m[2]) : 0;
  }
  function capWeekYearOf(weekKey) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(String(weekKey || ''));
    return m ? m[1] : '';
  }
  // Nhãn khoảng ngày của tuần: "22/09 – 28/09"
  function capWeekRangeLabel(weekKey) {
    const mon = capWeekMonday(weekKey);
    if (!mon) return '';
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    const f = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${f(mon)} – ${f(sun)}`;
  }

  // ─── THÁNG: khóa 'YYYY-MM' ↔ dịch tháng ↔ nhãn ────────────────
  function capMonthKeyValid(key) { return /^\d{4}-\d{2}$/.test(String(key || '')); }
  // Dịch ±1 tháng — dùng Date(vắt năm tự nhiên): 2025-01 −1 = 2024-12
  function capMonthShift(monthKey, dir) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    if (!m) return String(monthKey || '');
    const d = new Date(Number(m[1]), Number(m[2]) - 1 + dir, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  // "Tháng 9/2026"
  function capMonthHeadLabel(monthKey) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    if (!m) return String(monthKey || '');
    return `Tháng ${Number(m[2])}/${m[1]}`;
  }
  // Khoảng ngày của tháng: "01/09 – 30/09"
  function capMonthRangeLabel(monthKey) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    if (!m) return '';
    const last = new Date(Number(m[1]), Number(m[2]), 0).getDate();
    return `01/${m[2]} – ${String(last).padStart(2, '0')}/${m[2]}`;
  }

  // ─── KỲ CHUNG (TUẦN ISO | THÁNG): 1 đường code cho cả 2 chế độ xem ──
  // mode = 'week' (mặc định) | 'month'. Khóa kỳ lưu chung trường state.capUi.week
  // (tuần = 'YYYY-Wnn' · tháng = 'YYYY-MM') nên mọi state/test cũ vẫn khớp.
  function capModeOf() { return (state.capUi && state.capUi.mode === 'month') ? 'month' : 'week'; }
  function capPeriodKeyValid(key, mode) {
    return (mode || capModeOf()) === 'month' ? capMonthKeyValid(key) : /^\d{4}-W\d{1,2}$/.test(String(key || ''));
  }
  function capPeriodKeyOfDate(dateStr, mode) {
    return (mode || capModeOf()) === 'month' ? String(dateStr || '').slice(0, 7) : capWeekKeyOf(dateStr);
  }
  function capCurrentPeriodKey(mode) {
    return (mode || capModeOf()) === 'month' ? todayISO().slice(0, 7) : capCurrentWeekKey();
  }
  function capPeriodShift(key, dir, mode) {
    return (mode || capModeOf()) === 'month' ? capMonthShift(key, dir) : capWeekShift(key, dir);
  }
  // Nhãn CHÍNH của kỳ: "Tuần 39 (2026)" / "Tháng 9/2026"
  function capPeriodHeadLabel(key, mode) {
    return (mode || capModeOf()) === 'month' ? capMonthHeadLabel(key) : friendlyMaterialWeek(key);
  }
  // Nhãn PHỤ dưới nhãn chính: "2026 · 22/09 – 28/09" / "2026 · 01/09 – 30/09"
  function capPeriodSubLabel(key, mode) {
    return (mode || capModeOf()) === 'month'
      ? `${String(key || '').slice(0, 4)} · ${capMonthRangeLabel(key)}`
      : `${capWeekYearOf(key)} · ${capWeekRangeLabel(key)}`;
  }
  // Nhãn ĐẦY ĐỦ 1 dòng (chip / thanh điều hướng)
  function capPeriodLabel(key, mode) {
    return (mode || capModeOf()) === 'month'
      ? `${capMonthHeadLabel(key)} · ${capMonthRangeLabel(key)}`
      : `${friendlyMaterialWeek(key)} · ${capWeekRangeLabel(key)}`;
  }
  // Khoảng ngày và kỳ trước — dùng chung cho strip điều hành, chấm công và QC.
  function capPeriodRangeOf(key, mode) {
    const m = (mode || capModeOf()) === 'month';
    if (m) {
      const km = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
      if (!km) return null;
      const y = Number(km[1]), month = Number(km[2]);
      if (!y || month < 1 || month > 12) return null;
      const last = new Date(y, month, 0).getDate();
      return { from: `${y}-${String(month).padStart(2, '0')}-01`, to: `${y}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}` };
    }
    const mon = capWeekMonday(key);
    if (!mon) return null;
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    return { from: capISOOfLocal(mon), to: capISOOfLocal(sun) };
  }
  function capPreviousPeriodKey(key, mode) {
    return (mode || capModeOf()) === 'month' ? capMonthShift(key, -1) : capWeekShift(key, -1);
  }
  // Nhãn RÚT GỌN cho trục biểu đồ: "T39" / "T9"
  function capPeriodShortLabel(key, mode) {
    return (mode || capModeOf()) === 'month'
      ? `T${Number(String(key || '').slice(5, 7))}`
      : `T${capWeekNumOf(key)}`;
  }

  // ─── SỔ ĐĂNG KÝ CÔNG ĐOẠN (thêm Xưởng 1 = thêm 1 dòng vào đây) ─
  // Mỗi dòng khai: ws (xưởng) · label · đơn vị công suất/đơn vị sản lượng ·
  // cardId (thẻ ở tab Công Đoạn để nút "Mở thẻ" nhảy đúng chỗ) · kind:
  //   'cap'  = công suất thường: sản lượng ÷ giờ ÷ định mức tháng;
  //   'time' = Than Hóa + Sấy: hiệu suất theo GIỜ CẦN ÷ (giờ thực − sự cố).
  // rows() trả bản ghi chuẩn { date, qty, qtyKnown, hours, hc, tc }.
  // Bổ Ống/Bào Thô/Chọn Nan mang thêm shiftIdx và giờ của ca; công đoạn còn lại
  // dùng giờ cả ngày chung cho mọi lượt cùng ngày.
  // Riêng kind 'time': thêm { need (giờ cần), incident (giờ sự cố CHIA THEO TỈ LỆ giờ cần) }.
  const CAP_STAGES = [
    {
      id: 'boluong', ws: 'x2', label: 'Bốc Luồng', unit: 'kg/h', unitQty: 'kg', rateUnit: 'xe/h', cardId: 'x2-bo-luong-card', kind: 'cap',
      rows: () => (state.xuong2BoluongRecords || []).map(r => {
        const d = boluongDisplay(r);
        // Sản lượng hiển thị bằng KG; xe chỉ dùng để quy đổi ĐỊNH MỨC/HỮU.
        const actualQty = Number(d.qty) > 0 ? Number(d.qty) : (Number(d.inputWeight) > 0 ? Number(d.inputWeight) : 0);
        const qty = actualQty > 0 ? actualQty : (Number(d.cartsEq) > 0 ? Number(d.cartsEq) * 600 : 0);
        return {
          date: d.date,
          qty,
          qtyKnown: qty > 0,
          qtyEstimated: actualQty <= 0 && Number(d.cartsEq) > 0,
          cartsEq: Number(d.cartsEq) || 0,
          cartsEst: !!d.cartsEst,
          kgPerCart: Number(d.kgPerCart) > 0 ? Number(d.kgPerCart) : 600,
          hours: d.workHours,
          hc: d.workHoursHC,
          tc: d.workHoursTC
        };
      }),
      rateOf: m => boluongRateOf(m)
    },
    {
      id: 'cut', ws: 'x2', label: 'Cắt Chọn', unit: 'kg/h', unitQty: 'kg', rateUnit: 'xe/h', cardId: 'x2-cut-card', kind: 'cap',
      rows: () => (state.xuong2CutRecords || []).map(r => {
        const d = cutDisplay(r);
        // cutDisplay.inputWeight/material weight là nguồn đầu vào; chỉ xe tương đương mới là ước tính.
        const actualQty = Number(d.inputWeight) > 0 ? Number(d.inputWeight) : 0;
        const qty = actualQty > 0 ? actualQty : (Number(d.cartsEq) > 0 ? Number(d.cartsEq) * 600 : 0);
        return {
          date: d.date,
          qty,
          qtyKnown: qty > 0,
          qtyEstimated: actualQty <= 0 && Number(d.cartsEq) > 0,
          cartsEq: Number(d.cartsEq) || 0,
          cartsEst: !!d.cartsEst,
          kgPerCart: Number(d.kgPerCart) > 0 ? Number(d.kgPerCart) : 600,
          hours: d.cutHours,
          hc: d.cutHoursHC,
          tc: d.cutHoursTC
        };
      }),
      rateOf: m => capRateOf(m)
    },
    {
      id: 'boong', ws: 'x2', label: 'Bổ Ống', unit: 'kg/h', unitQty: 'kg', cardId: 'x2-bo-ong-card', kind: 'cap',
      rows: () => (state.xuong2BoOngRecords || []).map(r => {
        const d = boOngDisplay(r);
        return { date: d.date, shiftIdx: d.shiftIdx, qty: d.inputOng, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => boOngRateOf(m)
    },
    {
      id: 'baotho', ws: 'x2', label: 'Chạy Máy Bào Thô', unit: 'thanh/h', unitQty: 'thanh', cardId: 'x2-bao-tho-card', kind: 'cap',
      rows: () => (state.xuong2BaoThoRecords || []).map(r => {
        const d = baoThoDisplay(r);
        // Chưa có số lượng tự động (chờ công đoạn Chọn Nan Thô) → qty null, qtyKnown false
        return { date: d.date, shiftIdx: d.shiftIdx, qty: d.qty, qtyKnown: d.qty != null, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => baoThoRateOf(m)
    },
    {
      id: 'chonnan', ws: 'x2', label: 'Chọn Nan Thô', unit: 'thanh/h', unitQty: 'thanh', cardId: 'x2-chon-nan-tho-card', kind: 'cap',
      rows: () => {
        const liveIds = new Set(x2ChonNanLiveRecordsOf().map(r => r.id));
        return (state.xuong2ChonNanThoRecords || []).map(r => {
          const d = chonNanDisplay(r);
          // Sản lượng CHỈ tính phần CỘNG sang Bào Thô; bỏ nan ngoài công đoạn
          // và bỏ lượt orphan/mismatch ca để khớp tổng thẻ live.
          const live = !d.external && liveIds.has(r.id);
          return { date: d.date, shiftIdx: d.shiftIdx, qty: live ? d.quantity : 0, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
        });
      },
      rateOf: m => chonNanRateOf(m)
    },
    {
      // THAN HÓA + SẤY = 1 CÔNG ĐOẠN (18/10/2026 — chốt với người dùng): KHÔNG
      // tách 2 dòng Sấy 1 / Sấy 2 nữa. Hiệu suất tính TRONG TỪNG CA (Σ giờ cần ÷
      // Σ (giờ thực của ca − sự cố)) rồi gộp cả kỳ — xem capSayShiftRowsOf().
      id: 'say', ws: 'x2', label: 'Than Hóa + Sấy', unit: 'm³/h', unitQty: 'm³', cardId: 'x2-than-hoa-card', kind: 'time',
      rows: () => capSayShiftRowsOf(),
      rateTextOf: dates => capSayRateTextOf(dates)
    },
    {
      id: 'baotinh', ws: 'x2', label: 'Bào Tinh', unit: 'thanh/h', unitQty: 'thanh', cardId: 'x2-bao-tinh-card', kind: 'cap',
      rows: () => (state.xuong2BaoTinhRecords || []).map(r => {
        const d = baoTinhDisplay(r);
        return { date: d.date, qty: d.qtyIn, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => baoTinhRateOf(m)   // định mức ĐÃ GỘP 1 chỉ số Bào tinh (dùng chung cả 3 nhánh)
    },
    {
      id: 'epvan', ws: 'x2', label: 'Ép Ván', unit: 'm³/h', unitQty: 'm³', cardId: 'x2-ep-van-card', kind: 'cap',
      rows: () => (state.pressRecords || []).map(r => {
        const s = epVanSnapshotOf(r.date || '');
        return { date: r.date || '', qty: pressRecordVolumeOf(r), qtyKnown: true, hours: s.hours, hc: s.hoursHC, tc: s.hoursTC };
      }),
      rateOf: m => epVanRateOf(m)
    },
    {
      id: 'bullig_gc', ws: 'x2', label: 'Bullig — Gia công', unit: 'thanh/h', unitQty: 'thanh', cardId: 'x2-bullig-card', kind: 'cap',
      rows: () => (state.xuong2BulligRecords || []).filter(r => (r.kind || 'gc') === 'gc').map(r => {
        const d = bulligDisplay(r);
        return { date: d.date, qty: d.quantity, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => bulligRateOf(m, 'gc')
    },
    {
      id: 'bullig_ct', ws: 'x2', label: 'Bullig — Chọn thanh', unit: 'thanh/h', unitQty: 'thanh', cardId: 'x2-bullig-card', kind: 'cap',
      rows: () => (state.xuong2BulligRecords || []).filter(r => r.kind === 'ct').map(r => {
        const d = bulligDisplay(r);
        return { date: d.date, qty: (Number(d.qtyOk) || 0) + (Number(d.qtyErr) || 0), qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => bulligRateOf(m, 'ct')
    },
    // ─── XƯỞNG 1 — 3 CÔNG ĐOẠN ĐẦU (04/10/2026) ────────────────
    // ws:'x1' → bảng Tổng hợp + gauge + xếp hạng + báo cáo in
    // tự nhận diện qua capStagesOf('x1'); cardId → nút "Mở thẻ" nhảy đúng.
    {
      id: 'x1catong', ws: 'x1', label: 'Cắt Ống', unit: 'kg/h', unitQty: 'kg', cardId: 'x1-cat-ong-card', kind: 'cap',
      rows: () => (state.xuong1CatOngRecords || []).map(r => {
        const d = x1CatOngDisplay(r);
        // KL CẮT ĐƯỢC CỦA LƯỢT (turnKg) — cắt nhiều lần không đếm trùng đầu vào
        return { date: d.date, qty: d.turnKg, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => Number((((state.x1Rates || {}).catOng) || {})[m]) || 0
    },
    {
      id: 'x1saysinh', ws: 'x1', label: 'Sấy Sinh', unit: 'kg/h', unitQty: 'kg', cardId: 'x1-say-sinh-card', kind: 'cap',
      rows: () => (state.xuong1SaySinhRecords || []).map(r => {
        const d = x1SaySinhDisplay(r);
        return { date: d.date, qty: d.qty, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => Number((((state.x1Rates || {}).saySinh) || {})[m]) || 0
    },
    {
      id: 'x1boc', ws: 'x1', label: 'Bốc', unit: 'kg/h', unitQty: 'kg', cardId: 'x1-boc-card', kind: 'cap',
      rows: () => (state.xuong1BocRecords || []).map(r => {
        const d = x1BocDisplay(r);
        return { date: d.date, qty: d.qty, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => Number((((state.x1Rates || {}).boc) || {})[m]) || 0
    },
    // ─── XƯỞNG 1 — 5 CÔNG ĐOẠN ĐUÔI (05/10/2026) ────────────────
    // Cùng khung SPEC của js/xuong2.js: tồn = phần nguồn chưa bị xài,
    // qtyIn = khối lượng đem xử lý trong lượt.
    // ⚠ CHỈ GỌI hàm của xuong2.js BÊN TRONG closure (rows/rateOf) —
    //   gọi ở đây sẽ vỡ TDZ khi 2 module có vòng import.
    ...[
      { id: 'x1locong',   spec: 'locOng',    label: 'Lọc Ống',          cardId: 'x1-loc-ong-card' },
      { id: 'x1catmat',   spec: 'catMat',    label: 'Cắt Mắt',          cardId: 'x1-cat-mat-card' },
      { id: 'x1bo',       spec: 'bo',        label: 'Bổ',               cardId: 'x1-bo-card' },
      { id: 'x1locthanh', spec: 'locThanh',  label: 'Lọc Thanh/Bó Xô',  cardId: 'x1-loc-thanh-card' }
    ].map(c => ({
      id: c.id, ws: 'x1', label: c.label, unit: 'kg/h', unitQty: 'kg',
      cardId: c.cardId, kind: 'cap',
      rows: () => {
        const sp = x1ChainSpecByKey(c.spec);
        return (state[sp.stateKey] || []).map(r => {
          const d = x1ChainDisplay(sp, r);
          return { date: d.date, qty: d.qtyIn, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
        });
      },
      rateOf: m => {
        const sp = x1ChainSpecByKey(c.spec);
        return Number((((state.x1Rates || {})[sp.rateKind]) || {})[m]) || 0;
      }
    }))
  ];

  // Khóa GIỜ SỰ CỐ CHO PHÉP (state.x2StageIncidents) của từng công đoạn:
  // 2 dòng Bullig dùng chung 1 khóa 'bullig' (cùng ngày = cùng ô sự cố trên thẻ).
  const CAP_INC_KEY = {
    boluong: 'boluong',
    cut: 'cut', boong: 'boong', baotho: 'baotho', chonnan: 'chonnan',
    baotinh: 'baotinh', epvan: 'epvan', bullig_gc: 'bullig', bullig_ct: 'bullig',
    // XƯỞNG 1 (04–05/10/2026) — khóa giờ sự cố = đúng id công đoạn (khớp incKey
    // mà x1RenderDayCards truyền vào → bảng tổng hợp TRỪ giờ sự cố giống thẻ ngày)
    x1catong: 'x1catong', x1saysinh: 'x1saysinh', x1boc: 'x1boc',
    x1locong: 'x1locong', x1catmat: 'x1catmat', x1bo: 'x1bo',
    x1locthanh: 'x1locthanh'
  };
  function capIncKeyOf(st) { return CAP_INC_KEY[st.id] || null; }

  function capStagesOf(ws) { return CAP_STAGES.filter(s => s.ws === ws); }

  // ─── SỔ ĐĂNG KÝ BỘ PHẬN / XƯỞNG ────────────────────────────────
  // Báo cáo in (#btn-cap-print) chạy qua TẤT CẢ bộ phận trong sổ này —
  // sau này thêm xưởng mới chỉ cần thêm 1 dòng (công đoạn khai ở CAP_STAGES).
  const CAP_WORKSHOPS = [
    { id: 'x2', label: 'Xưởng 2' },
    { id: 'x1', label: 'Xưởng 1' },
    { id: 'qc', label: 'QC' }
  ];

  // ─── THAN HÓA + SẤY: dòng theo (NGÀY, CA) — HIỆU SUẤT TÍNH TRONG CA ──
  // (18/10/2026 — chốt với người dùng) KHÔNG còn 2 dòng Sấy 1 / Sấy 2. Bản cũ
  // chia giờ của ngày cho 2 công đoạn theo TỈ LỆ GIỜ CẦN → cả 2 dòng ra CÙNG một
  // hiệu suất (thừa) và tooltip in "÷ ĐM 0 m³/h" vô nghĩa.
  // Nay mỗi (ngày, ca) 1 dòng, số liệu lấy từ sayShiftPerfOf() của thẻ:
  //   qty = m³ của ca · need = Σ giờ cần của ca · hours = giờ THẬT của ca
  //   (Bảng bố trí vị trí "Than hóa") · incident = sự cố ngày chia theo tỉ lệ phút.
  // ⇒ Σ giờ các ca = đúng giờ của ngày (KHÔNG nhân đôi). Ngày có lần KHÔNG ghi ca
  // lẫn với ca đã ghi → tính CẢ NGÀY (giờ chỉ có 1 con số, không chia bừa).
  function capSayShiftRowsOf() {
    const out = [];
    (sayChargeRows() || []).forEach(day => {
      const shifts = (sayShiftPerfOf(day) || []).filter(s => s.turns > 0);
      if (!shifts.length) return;
      const assigned = shifts.filter(s => s.shiftIdx != null);
      const mixed = assigned.length > 0 && assigned.length !== shifts.length;
      if (!assigned.length || mixed) {
        // Ngày KHÔNG ghi ca (dữ liệu cũ) HOẶC ghi ca không đầy đủ → 1 dòng cả ngày
        out.push({
          date: day.date, shiftIdx: null, turns: shifts.reduce((a, s) => a + s.turns, 0),
          qty: shifts.reduce((a, s) => a + (Number(s.vol) || 0), 0),
          need: shifts.reduce((a, s) => a + (Number(s.need) || 0), 0),
          hours: Number(day.hours) || 0, hc: Number(day.hc) || 0, tc: Number(day.tc) || 0,
          incident: Number(day.incident) || 0
        });
        return;
      }
      assigned.forEach(s => {
        out.push({
          date: day.date, shiftIdx: s.shiftIdx, turns: s.turns,
          qty: Number(s.vol) || 0, need: Number(s.need) || 0,
          hours: Number(s.hours) || 0, hc: Number(s.hc) || 0, tc: Number(s.tc) || 0,
          incident: Number(s.incH) || 0
        });
      });
    });
    return out;
  }
  // Nhãn định mức 1 lần than hóa (phút/lần · m³/lần) của CẢ 2 công đoạn sấy theo
  // các tháng có mặt — phút RIÊNG Ván/Bullig: cùng số → "105'"; khác → "V105'·B90'".
  function capSayRateTextOf(dates) {
    const months = [...new Set((dates || []).map(d => String(d || '').slice(0, 7)).filter(Boolean))].sort();
    if (!months.length) return '';
    const stageTxt = (m, stage) => {
      const van = sayRateEntryOf(m, stage, 'Ván');
      const bul = sayRateEntryOf(m, stage, 'Bullig');
      const phutTxt = van.phut === bul.phut
        ? `${fmtNum1(van.phut)}'`
        : `V${fmtNum1(van.phut)}'·B${fmtNum1(bul.phut)}'`;
      return `${phutTxt}/${fmtM3Cap(van.m3)}m³`;
    };
    return months.map(m => `S1 ${stageTxt(m, 'say1')} · S2 ${stageTxt(m, 'say2')}`).join(' · ');
  }

  // ─── GỘP DỮ LIỆU THEO KỲ (TUẦN ISO | THÁNG) ───────────────────
  // 1 lượt quét rows() của mỗi công đoạn → Map kỳ → bản ghi (tiết kiệm:
  // bảng tầng 1 vẽ ~26 kỳ chỉ cần 9 lượt quét thay vì 26×9).
  // ─── CACHE PHIÊN RENDER (tối ưu tốc độ chuyển tab — 10/2026) ─────────
  // st.rows() quét TOÀN BỘ nhật ký công đoạn. Cửa sổ 8 kỳ + tầng 2/3 + cảnh báo
  // dữ liệu quá hạn từng gọi nó HÀNG CHỤC LẦN mỗi lần render
  // (đo thật: bảng Tổng hợp ~130ms, sparkline mini card ~155ms — treo cả
  // GIÂY khi dữ liệu ×10). Cache này CHỈ SỐNG TRONG 1 LỜI GỌI hàm render
  // (JS đơn luồng — dữ liệu KHÔNG đổi giữa chừng) nên KHÔNG BAO GIỜ trả số
  // cũ: capRenderPass(fn) = bật cache → chạy fn → tắt (kể cả khi fn lỗi).
  // Gọi LẺ capStageRowsByPeriod/capStagePeriodRow (test, hàm tương tác) →
  // không bật pass → vẫn quét trực tiếp như cũ (không đổi hành vi).
  let capPass = null;
  function capRenderPass(fn) {
    const prev = capPass;
    capPass = new Map();
    try { return fn(); }
    finally { capPass = prev; }
  }
  function capStageRowsByPeriod(st, mode) {
    const ck = capPass ? 'r:' + st.id + '|' + mode : '';
    if (capPass && capPass.has(ck)) return capPass.get(ck);
    const map = new Map();
    (st.rows() || []).forEach(r => {
      if (!r || !r.date) return;
      const pk = capPeriodKeyOfDate(r.date, mode);
      if (!pk) return;
      if (!map.has(pk)) map.set(pk, []);
      map.get(pk).push(r);
    });
    if (capPass) capPass.set(ck, map);
    return map;
  }
  // Bản TUẦN ISO — sparkline mini card + kiểm thử cũ vẫn dùng
  function capStageRowsByWeek(st) { return capStageRowsByPeriod(st, 'week'); }
  // Dòng KỲ của 1 công đoạn từ danh sách bản ghi thô của kỳ đó (mode 'week'|'month').
  // Công đoạn ghi sản lượng theo ca gom theo (NGÀY, CA); công đoạn cũ gom theo
  // NGÀY và giờ chỉ đếm 1 lần. Nếu một ngày trộn bản ghi có/không có ca thì giữ
  // cách gom cả ngày để không cộng nhầm giờ snapshot cả ngày với giờ của một ca.
  function capStagePeriodRowFromRecs(st, recs, key, mode) {
    const byDate = new Map();
    (recs || []).forEach(r => {
      if (!r || !r.date) return;
      const date = String(r.date);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(r);
    });
    const groups = [];
    byDate.forEach(list => {
      if (st.kind === 'time') {
        const byShift = new Map();
        list.forEach(r => {
          const shiftIdx = r.shiftIdx == null ? null : Number(r.shiftIdx);
          const gk = shiftIdx == null ? '' : String(shiftIdx);
          if (!byShift.has(gk)) byShift.set(gk, []);
          byShift.get(gk).push(r);
        });
        byShift.forEach((shiftRows, gk) => {
          groups.push({ list: shiftRows, shiftIdx: gk === '' ? null : Number(gk) });
        });
        return;
      }

      const allHaveShift = list.length > 0 && list.every(r =>
        r.shiftIdx != null && r.shiftIdx !== '' && Number.isFinite(Number(r.shiftIdx)));
      if (!allHaveShift) {
        groups.push({ list, shiftIdx: null });
        return;
      }

      const byShift = new Map();
      list.forEach(r => {
        const shiftIdx = Number(r.shiftIdx);
        if (!byShift.has(shiftIdx)) byShift.set(shiftIdx, []);
        byShift.get(shiftIdx).push(r);
      });
      const shiftGroups = [...byShift.entries()];
      const totalShiftHours = shiftGroups.reduce((sum, [, shiftRows]) =>
        sum + (Number(shiftRows[0].hours) || 0), 0);
      const fallbackShiftIdx = shiftGroups.length
        ? Math.min(...shiftGroups.map(([shiftIdx]) => shiftIdx))
        : null;
      shiftGroups.forEach(([shiftIdx, shiftRows]) => {
        groups.push({ list: shiftRows, shiftIdx, splitByShift: true, totalShiftHours, fallbackShiftIdx });
      });
    });
    const days = [];
    groups.forEach(({ list, shiftIdx, splitByShift, totalShiftHours, fallbackShiftIdx }) => {
      const first = list[0];
      const perRowHours = st.kind === 'time' && list.length > 1;
      const sum = fn => perRowHours
        ? list.reduce((s, x) => s + (Number(x[fn]) || 0), 0)
        : (Number(first[fn]) || 0);
      const qtyKnown = list.every(x => x.qtyKnown !== false);
      const day = {
        date: String(first.date),
        shiftIdx: (shiftIdx == null ? null : Number(shiftIdx)),
        // THAN HÓA + SẤY: "Lượt" = số LẦN than hóa của ca (không phải số dòng)
        turns: st.kind === 'time' ? list.reduce((a, x) => a + (Number(x.turns) || 0), 0) : list.length,
        qty: qtyKnown ? list.reduce((s, x) => s + (Number(x.qty) || 0), 0) : null,
        qtyKnown,
        qtyEstimated: list.some(x => x.qtyEstimated === true),
        cartsEq: list.reduce((s, x) => s + (Number(x.cartsEq) || 0), 0),
        kgPerCart: (() => {
          const kgPerCarts = list.map(x => Number(x.kgPerCart) || 0).filter(v => v > 0);
          return kgPerCarts.length ? kgPerCarts.reduce((s, v) => s + v, 0) / kgPerCarts.length : 600;
        })(),
        hours: sum('hours'),
        hc: sum('hc'),
        tc: sum('tc'),
        rate: st.kind === 'cap' ? st.rateOf(String(first.date).slice(0, 7)) : null
      };
      if (st.kind === 'time') {
        day.need = list.reduce((s, x) => s + (Number(x.need) || 0), 0);
        day.incident = list.reduce((s, x) => s + (Number(x.incident) || 0), 0);
      } else {
        // Giờ sự cố nhập theo ngày; chia theo tỉ lệ giờ để tổng kỳ chỉ trừ đúng
        // một lần, thay vì trừ toàn bộ sự cố cho từng ca.
        const incident = capIncKeyOf(st) ? stageIncidentOf(capIncKeyOf(st), first.date) : 0;
        day.incident = splitByShift
          ? (totalShiftHours > 0
            ? incident * day.hours / totalShiftHours
            : (day.shiftIdx === fallbackShiftIdx ? incident : 0))
          : incident;
      }
      days.push(day);
    });
    // Cùng ngày có nhiều ca → xếp Ca 1, Ca 2… (dòng "cả ngày" xuống cuối)
    days.sort((a, b) => String(a.date).localeCompare(String(b.date))
      || ((a.shiftIdx == null ? 99 : a.shiftIdx) - (b.shiftIdx == null ? 99 : b.shiftIdx)));
    const turns = days.reduce((s, d) => s + d.turns, 0);
    const qtyKnown = days.every(d => d.qtyKnown !== false);
    const qty = qtyKnown ? days.reduce((s, d) => s + (d.qty || 0), 0) : null;
    const qtyEstimated = days.some(d => d.qtyEstimated === true);
    const cartsEq = days.reduce((s, d) => s + (Number(d.cartsEq) || 0), 0);
    const lastDate = days.map(d => String(d.date || '')).filter(Boolean).sort().pop() || '';
    const hours = days.reduce((s, d) => s + d.hours, 0);
    const hc = days.reduce((s, d) => s + d.hc, 0);
    const tc = days.reduce((s, d) => s + d.tc, 0);
    let cap = null, rate = null, eff = null, rateText = '';
    if (st.kind === 'cap') {
      // Giờ SỰ CỐ CHO PHÉP của từng ngày được TRỪ khỏi giờ làm (nhất quán với thẻ ngày)
      const incident = days.reduce((s, d) => s + (Number(d.incident) || 0), 0);
      const hoursEff = Math.max(0, hours - incident);
      cap = (qty != null && qty > 0 && hoursEff > 0) ? qty / hoursEff : null;
      // Định mức: THÁNG → ĐM của chính tháng; TUẦN → bình quân gia quyền (tuần vắt 2 tháng)
      rate = mode === 'month' ? st.rateOf(String(key).slice(0, 7)) : capWeekRateOf(st, days);
      if (st.id === 'boluong' || st.id === 'cut') {
        // Bốc Luồng / Cắt Chọn: hiển thị sản lượng và công suất bằng kg.
        // Định mức vẫn là xe/h → quy đổi công suất thực về xe/h bằng tỷ lệ kg/xe
        // của lượt (fallback 600 kg/xe). Giữ xe/h chỉ là đơn vị chuyển đổi.
        if (cartsEq > 0) {
          const kgPerCart = qty / cartsEq;
          const capXe = cap != null ? cap / kgPerCart : null;
          eff = (capXe != null && rate) ? (capXe / rate) * 100 : null;
        } else {
          eff = (cap != null && rate) ? (cap / rate) * 100 : null;
        }
      } else {
        eff = (cap != null && rate) ? (cap / rate) * 100 : null;
      }
    } else {
      const need = days.reduce((s, d) => s + (d.need || 0), 0);
      const incident = days.reduce((s, d) => s + (d.incident || 0), 0);
      cap = (hours > 0 && qty != null && qty > 0) ? qty / hours : null;
      eff = (need > 0 && hours - incident > 0) ? (need / (hours - incident)) * 100 : null;
      rateText = st.rateTextOf ? st.rateTextOf(days.map(d => d.date)) : '';
    }
    return { stageId: st.id, weekKey: key, days, turns, qty, qtyKnown, qtyEstimated, cartsEq, lastDate, hours, hc, tc, cap, rate, rateText, eff };
  }
  function capStageDayEfficiency(st, day) {
    if (!day || !(Number(day.hours) > 0)) return null;
    if (st.kind === 'time') {
      const hoursEff = Math.max(0, Number(day.hours) - (Number(day.incident) || 0));
      const need = Number(day.need) || 0;
      return need > 0 && hoursEff > 0 ? need / hoursEff * 100 : null;
    }
    if (day.qtyKnown === false || !(Number(day.qty) > 0)) return null;
    const hoursEff = Math.max(0, Number(day.hours) - (Number(day.incident) || 0));
    const rate = Number(st.rateOf(String(day.date || '').slice(0, 7))) || 0;
    if (!(hoursEff > 0) || !(rate > 0)) return null;
    const qtyPerHour = Number(day.qty) / hoursEff;
    if (st.id === 'boluong' || st.id === 'cut') {
      if (Number(day.cartsEq) > 0) {
        const kgPerCart = Number(day.qty) / Number(day.cartsEq);
        return ((qtyPerHour / kgPerCart) / rate) * 100;
      }
      return (qtyPerHour / rate) * 100;
    }
    return (qtyPerHour / rate) * 100;
  }
  function computeWorkerStageEfficiency(month) {
    const monthKey = String(month || '');
    const result = new Map();
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return result;

    const stageById = new Map(CAP_STAGES.map(stage => [stage.id, stage]));
    const dailyByStage = new Map();
    CAP_STAGES.forEach(stage => {
      const recs = capStageRowsByPeriod(stage, 'month').get(monthKey) || [];
      if (!recs.length) return;
      const period = capStagePeriodRowFromRecs(stage, recs, monthKey, 'month');
      const days = new Map();
      period.days.forEach(day => {
        const key = `${day.date}|${day.shiftIdx == null ? '*' : day.shiftIdx}`;
        days.set(key, {
          efficiency: capStageDayEfficiency(stage, day),
          hours: Number(day.hours) || 0,
          incident: Number(day.incident) || 0,
          estimated: day.qtyEstimated === true
        });
      });
      dailyByStage.set(stage.id, days);
    });

    const assignments = workerAssignmentsForCapacityMonth(monthKey, { includeUnmatched: true });
    const byEmployeeDate = new Map();
    assignments.forEach(assignment => {
      const key = `${assignment.employeeId}|${assignment.date}`;
      if (!byEmployeeDate.has(key)) byEmployeeDate.set(key, []);
      byEmployeeDate.get(key).push(assignment);
    });
    const overlaps = new Set();
    const overlapConflictsById = new Map();
    byEmployeeDate.forEach(list => {
      for (let i = 0; i < list.length; i++) {
        const aStart = list[i].startMin;
        const aEnd = list[i].endMin;
        if (!Number.isFinite(aStart) || !Number.isFinite(aEnd) || aEnd <= aStart) continue;
        for (let j = i + 1; j < list.length; j++) {
          const bStart = list[j].startMin;
          const bEnd = list[j].endMin;
          if (!Number.isFinite(bStart) || !Number.isFinite(bEnd) || bEnd <= bStart) continue;
          if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
            overlaps.add(list[i].id);
            overlaps.add(list[j].id);
            if (!overlapConflictsById.has(list[i].id)) overlapConflictsById.set(list[i].id, []);
            if (!overlapConflictsById.has(list[j].id)) overlapConflictsById.set(list[j].id, []);
            overlapConflictsById.get(list[i].id).push(list[j]);
            overlapConflictsById.get(list[j].id).push(list[i]);
          }
        }
      }
    });

    const totals = new Map();
    const ensureTotal = employeeId => {
      if (!totals.has(employeeId)) totals.set(employeeId, {
        overlapCount: 0,
        unmatchedCount: 0,
        overlapAssignments: [],
        unmatchedAssignments: [],
        stages: new Map()
      });
      return totals.get(employeeId);
    };
    const ensureStage = (total, stageId) => {
      if (!total.stages.has(stageId)) total.stages.set(stageId, {
        weightedEfficiency: 0, validHours: 0, assignedHours: 0, estimatedHours: 0
      });
      return total.stages.get(stageId);
    };
    const issueAssignment = (assignment, reason, conflicts = []) => ({
      id: assignment.id,
      date: assignment.date,
      department: assignment.department,
      positionName: assignment.positionName || '',
      start: assignment.start || '',
      end: assignment.end || '',
      reason,
      conflicts: conflicts.map(other => ({
        positionName: other.positionName || '',
        start: other.start || '',
        end: other.end || ''
      }))
    });
    const groups = new Map();
    assignments.forEach(assignment => {
      const total = ensureTotal(assignment.employeeId);
      if (overlaps.has(assignment.id)) {
        total.overlapCount++;
        total.overlapAssignments.push(issueAssignment(
          assignment,
          'Phân công có khoảng giờ giao nhau',
          overlapConflictsById.get(assignment.id) || []
        ));
      }
      if (!stageById.has(assignment.stageId)) {
        total.unmatchedCount++;
        total.unmatchedAssignments.push(issueAssignment(
          assignment,
          assignment.unmatchedReason || 'Không nhận diện được công đoạn hoặc giờ'
        ));
      }
      if (overlaps.has(assignment.id) || !stageById.has(assignment.stageId)) {
        return;
      }
      ensureStage(total, assignment.stageId).assignedHours += assignment.hours;
      const key = `${assignment.stageId}|${assignment.date}|${assignment.shiftIdx == null ? '*' : assignment.shiftIdx}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(assignment);
    });
    groups.forEach(list => {
      const first = list[0];
      const stage = stageById.get(first.stageId);
      const dayRows = dailyByStage.get(first.stageId);
      const dayKey = `${first.date}|${first.shiftIdx == null ? '*' : first.shiftIdx}`;
      const day = dayRows && (dayRows.get(dayKey) || dayRows.get(`${first.date}|*`));
      if (!day || !Number.isFinite(day.efficiency) || !(day.hours > 0)) return;
      const scheduledHours = list.reduce((sum, assignment) => sum + assignment.hours, 0);
      if (Math.abs(scheduledHours - day.hours) > 0.05) return;
      const effectiveHours = Math.max(0, day.hours - day.incident);
      const weightScale = effectiveHours / day.hours;
      if (!(weightScale > 0)) return;
      list.forEach(assignment => {
        const weightHours = assignment.hours * weightScale;
        const total = ensureStage(ensureTotal(assignment.employeeId), stage.id);
        total.weightedEfficiency += day.efficiency * weightHours;
        total.validHours += weightHours;
        if (day.estimated) total.estimatedHours += weightHours;
      });
    });

    totals.forEach((total, employeeId) => {
      const candidates = [...total.stages].map(([stageId, stage]) => ({
        id: stageId,
        label: stageById.get(stageId).label,
        assignedMinutes: Math.round(stage.assignedHours * 60),
        assignedHours: Math.round(stage.assignedHours * 100) / 100,
        validHours: Math.round(stage.validHours * 100) / 100,
        coverageRate: stage.assignedHours > 0 ? Math.round(stage.validHours * 1000 / stage.assignedHours) / 10 : null,
        estimatedHours: Math.round(stage.estimatedHours * 100) / 100,
        rawEfficiency: stage.validHours > 0 ? stage.weightedEfficiency / stage.validHours : null
      }));
      const maxMinutes = Math.max(0, ...candidates.map(stage => stage.assignedMinutes));
      const tied = candidates.filter(stage => stage.assignedMinutes === maxMinutes);
      const measured = tied.filter(stage => stage.rawEfficiency !== null);
      const highest = measured.length ? Math.max(...measured.map(stage => stage.rawEfficiency)) : null;
      const selected = highest === null
        ? [] : measured.filter(stage => Math.abs(stage.rawEfficiency - highest) < 1e-9);
      const stageDetails = tied.map(stage => ({
        ...stage,
        efficiency: stage.rawEfficiency === null ? null : Math.round(stage.rawEfficiency * 10) / 10,
        selected: selected.includes(stage)
      }));
      const chosen = stageDetails.filter(stage => stage.selected);
      const single = chosen.length === 1 ? chosen[0] : null;
      result.set(employeeId, {
        efficiency: chosen.length ? Math.round(highest * 10) / 10 : null,
        validHours: single ? single.validHours : null,
        assignedHours: single ? single.assignedHours : null,
        coverageRate: single ? single.coverageRate : null,
        estimatedHours: single ? single.estimatedHours : null,
        overlapCount: total.overlapCount,
        unmatchedCount: total.unmatchedCount,
        overlapAssignments: total.overlapAssignments,
        unmatchedAssignments: total.unmatchedAssignments,
        tieMissing: tied.length > 1 && measured.length > 0 && measured.length < tied.length,
        stageDetails,
        stages: chosen.length
      });
    });
    return result;
  }
  // Bản TUẦN ISO (giữ tên cũ — kiểm thử cũ + chỗ khác gọi vẫn chạy)
  function capStageWeekRowFromRecs(st, recs, weekKey) {
    return capStagePeriodRowFromRecs(st, recs, weekKey, 'week');
  }
  // Định mức TUẦN = bình quân gia quyền theo sản lượng giữa các tháng trong tuần
  function capWeekRateOf(st, days) {
    const byMonth = new Map();
    days.forEach(d => {
      const m = String(d.date || '').slice(0, 7);
      if (!m) return;
      if (!byMonth.has(m)) byMonth.set(m, { qty: 0, rate: st.rateOf(m) });
      byMonth.get(m).qty += (d.qty || 0);
    });
    let num = 0, den = 0;
    byMonth.forEach(({ qty, rate }) => {
      if (rate && qty > 0) { num += qty * rate; den += qty; }
    });
    return den > 0 ? num / den : null;
  }
  function capEmptyStageRow(st, weekKey) {
    return { stageId: st.id, weekKey, days: [], turns: 0, qty: null, qtyKnown: true, hours: 0, hc: 0, tc: 0, cap: null, rate: null, rateText: '', eff: null };
  }
  // Dòng KỲ của 1 công đoạn (mode 'week' | 'month')
  function capStagePeriodRow(st, key, mode) {
    // Trong Phiên Render: nhớ luôn dòng của kỳ (cửa sổ 8 kỳ + tầng 2/3
    // trước đây tính lại dòng này hàng chục lần trên cùng dữ liệu)
    const ck = capPass ? 'w:' + st.id + '|' + mode + '|' + key : '';
    if (capPass && capPass.has(ck)) return capPass.get(ck);
    const recs = capStageRowsByPeriod(st, mode).get(key);
    const row = recs ? capStagePeriodRowFromRecs(st, recs, key, mode) : capEmptyStageRow(st, key);
    if (capPass) capPass.set(ck, row);
    return row;
  }
  // Bản TUẦN của 1 công đoạn (tiện dùng ở test + sparkline mini card)
  function capStageWeekRow(st, weekKey) {
    return capStagePeriodRow(st, weekKey, 'week');
  }
  // Dòng theo NGÀY của 1 công đoạn trong kỳ (tầng 3 + test)
  function capStageDayRows(st, weekKey) {
    return capStageWeekRow(st, weekKey).days;
  }
  // MẢNH DỮ LIỆU dùng chung cho tầng 1: 1 lượt quét → Map kỳ → Map công đoạn
  function capPeriodAggregates(ws, mode) {
    const byWeek = new Map();
    capStagesOf(ws).forEach(st => {
      capStageRowsByPeriod(st, mode).forEach((recs, wk) => {
        if (!byWeek.has(wk)) byWeek.set(wk, new Map());
        byWeek.get(wk).set(st.id, capStagePeriodRowFromRecs(st, recs, wk, mode));
      });
    });
    return byWeek;
  }
  // Bản TUẦN ISO (kiểm thử cũ vẫn dùng)
  function capWeekAggregates(ws) { return capPeriodAggregates(ws, 'week'); }
  // Danh sách kỳ CÓ dữ liệu của xưởng (mới nhất trước) — sắp chuỗi đúng cả 2 dạng khóa
  function capPeriodsFor(ws, mode) {
    const set = new Set();
    capStagesOf(ws).forEach(st => capStageRowsByPeriod(st, mode).forEach((_, wk) => set.add(wk)));
    return [...set].sort().reverse();
  }
  function capWeekRowsFor(ws) { return capPeriodsFor(ws, 'week'); }
  // Dòng KỲ cấp XƯỞNG (tầng 1) — từ Map đã quét 1 lần hoặc tự tính
  function capWorkshopPeriodRowFromMap(ws, key, byWeek, mode) {
    const parts = capStagesOf(ws).map(st => {
      const w = byWeek && byWeek.get(key);
      const row = (w && w.get(st.id)) || capEmptyStageRow(st, key);
      return { st, row };
    });
    return capWorkshopAggregate(key, parts);
  }
  function leadershipCapacitySnapshot(key, mode) {
    return CAP_WORKSHOPS.map(workshop => {
      const aggregate = capWorkshopPeriodRowFromMap(
        workshop.id, key, capPeriodAggregates(workshop.id, mode), mode
      );
      return {
        id: workshop.id,
        label: workshop.label,
        efficiency: aggregate.eff,
        hours: aggregate.hours,
        incidentHours: aggregate.parts.reduce((total, part) => total
          + part.row.days.reduce((hours, day) => hours + (Number(day.incident) || 0), 0), 0),
        bottleneck: aggregate.bottleneck
          ? {
            label: aggregate.bottleneck.st.label,
            efficiency: aggregate.bottleneck.row.eff
          }
          : null,
        stages: aggregate.parts.map(({ st, row }) => ({
          id: st.id,
          label: st.label,
          unit: st.unit,
          quantityUnit: st.unitQty,
          turns: row.turns,
          quantity: row.qty,
          quantityKnown: row.qtyKnown !== false,
          estimated: row.qtyEstimated === true,
          hours: row.hours,
          incidentHours: row.days.reduce((total, day) => total + (Number(day.incident) || 0), 0),
          capacity: row.cap,
          efficiency: row.eff
        }))
      };
    });
  }
  // Bản TUẦN ISO (kiểm thử cũ + sparkline vẫn dùng)
  function capWorkshopWeekRowFromMap(ws, weekKey, byWeek) {
    return capWorkshopPeriodRowFromMap(ws, weekKey, byWeek, 'week');
  }
  function capWorkshopWeekRow(ws, weekKey) {
    return capWorkshopWeekRowFromMap(ws, weekKey, capWeekAggregates(ws));
  }
  // Hiệu suất XƯỞNG = bình quân gia quyền theo GIỀ giữa các công đoạn có hiệu suất
  // (giờ HC/TC tổng theo công đoạn có dữ liệu — để tầng 1 + báo cáo in tách riêng)
  function capWorkshopAggregate(weekKey, parts) {
    const withData = parts.filter(p => p.row.turns > 0);
    const withEff = withData.filter(p => p.row.eff != null && p.row.hours > 0);
    const turns = withData.reduce((s, p) => s + p.row.turns, 0);
    const hours = withData.reduce((s, p) => s + p.row.hours, 0);
    const hc = withData.reduce((s, p) => s + p.row.hc, 0);
    const tc = withData.reduce((s, p) => s + p.row.tc, 0);
    let eff = null;
    if (withEff.length) {
      const num = withEff.reduce((s, p) => s + p.row.eff * p.row.hours, 0);
      const den = withEff.reduce((s, p) => s + p.row.hours, 0);
      eff = den > 0 ? num / den : null;
    }
    const passCount = withEff.filter(p => p.row.eff >= 100).length;
    let bottleneck = null;
    withEff.forEach(p => { if (!bottleneck || p.row.eff < bottleneck.row.eff) bottleneck = p; });
    return {
      weekKey, parts, withData,
      stagesCount: parts.length,
      dataCount: withData.length,
      turns, hours, hc, tc, eff,
      passCount, effCount: withEff.length,
      bottleneck
    };
  }

  // ─── TRẠNG THÁI UI (nhớ theo MÁY — không lên mây) ─────────────
  // { ws: 'x2'|'x1'|'qc', mode: 'week'|'month',
  //   week: khóa KỲ đang xem ('YYYY-Wnn' hoặc 'YYYY-MM'|'' = tự chọn kỳ mới nhất
  //   có dữ liệu), weekOpen: kỳ đang xổ tầng công đoạn, openStage: công đoạn đang
  //   xổ tầng ngày, collapsed: thu gọn thẻ, view: 'visual'|'table', chartStage }
  function loadCapacityUi() {
    let ui = null;
    try { ui = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || 'null'); } catch (e) { /* bỏ qua */ }
    state.capUi = Object.assign({ ws: 'x2', mode: 'week', week: '', weekOpen: '', openStage: '', collapsed: false, view: 'visual', chartStage: '', staleOpen: false }, (ui && typeof ui === 'object') ? ui : {});
    if (state.capUi.ws !== 'x1' && state.capUi.ws !== 'x2' && state.capUi.ws !== 'qc') state.capUi.ws = 'x2';
    if (state.capUi.mode !== 'month') state.capUi.mode = 'week';
    if (typeof state.capUi.staleOpen !== 'boolean') state.capUi.staleOpen = false;
    // Khóa kỳ phải khớp CHẾ ĐỘ đang xem (tuần 'YYYY-Wnn' / tháng 'YYYY-MM')
    const pkRe = state.capUi.mode === 'month' ? /^\d{4}-\d{2}$/ : /^\d{4}-W\d{1,2}$/;
    if (state.capUi.week && !pkRe.test(String(state.capUi.week))) state.capUi.week = '';
    if (state.capUi.weekOpen && !pkRe.test(String(state.capUi.weekOpen))) state.capUi.weekOpen = '';
    if (typeof state.capUi.collapsed !== 'boolean') state.capUi.collapsed = false;
    // Chế độ xem chỉ được 'visual' | 'table'; công đoạn của chart phải có trong sổ đăng ký
    if (state.capUi.view !== 'table' && state.capUi.view !== 'visual') state.capUi.view = 'visual';
    // MIGRATE 18/10/2026: 2 công đoạn sấy cũ (say1/say2) đã GỘP thành 'say'
    // ("Than Hóa + Sấy") — máy đang lưu lựa chọn cũ thì trỏ sang dòng gộp.
    if (state.capUi.chartStage === 'say1' || state.capUi.chartStage === 'say2') state.capUi.chartStage = 'say';
    if (state.capUi.openStage === 'say1' || state.capUi.openStage === 'say2') state.capUi.openStage = 'say';
    if (state.capUi.chartStage && !CAP_STAGES.some(s => s.id === state.capUi.chartStage)) state.capUi.chartStage = '';
    if (state.capUi.openStage && !CAP_STAGES.some(s => s.id === state.capUi.openStage)) state.capUi.openStage = '';
  }
  function saveCapacityUi() {
    try { localStorage.setItem(STORAGE_KEY_CAPACITY_UI, JSON.stringify(state.capUi || {})); } catch (e) { /* bỏ qua */ }
  }
  // Kỳ đang xem (đã theo chế độ Tuần/Tháng) — rỗng thì tự chọn kỳ mới nhất có dữ liệu
  function capSelectedPeriod() {
    const ws = (state.capUi && state.capUi.ws) || 'x2';
    const mode = capModeOf();
    if (state.capUi.week) return state.capUi.week;
    const keys = capPeriodsFor(ws, mode);
    return keys.length ? keys[0] : capCurrentPeriodKey(mode);
  }
  // Bản cũ (luôn trả khóa TUẦN theo chế độ hiện có) — kiểm thử cũ vẫn gọi
  function capSelectedWeek() { return capSelectedPeriod(); }

  // ─── HTML PHỤ ─────────────────────────────────────────────────
  function capEffBadgeHtml(eff, tip) {
    if (eff == null) {
      return `<span class="cap-eff cap-eff-none" title="${escapeHTML(tip || 'Chưa đủ dữ liệu (thiếu giờ làm hoặc chưa khai Định mức công suất của tháng)')}">—</span>`;
    }
    const cls = eff >= 100 ? 'cap-eff-good' : eff >= 70 ? 'cap-eff-mid' : 'cap-eff-low';
    return `<span class="cap-eff ${cls}" title="${escapeHTML(tip || '')}">${fmtNum1(eff)}%</span>`;
  }
  function capDeltaHtml(cur, prev) {
    if (cur == null || prev == null) return '<span class="cap-delta flat" title="Kỳ trước chưa tính được hiệu suất để so sánh">—</span>';
    const d = cur - prev;
    if (Math.abs(d) < 0.05) return '<span class="cap-delta flat" title="Ngang bằng kỳ trước">▬ 0</span>';
    return d > 0
      ? `<span class="cap-delta up" title="Cao hơn kỳ trước ${fmtNum1(d)} điểm %">▲ ${fmtNum1(d)}</span>`
      : `<span class="cap-delta down" title="Thấp hơn kỳ trước ${fmtNum1(-d)} điểm %">▼ ${fmtNum1(-d)}</span>`;
  }
  // Ô GIỜ HC / TC (tách riêng 2 cột — lãnh đạo đọc thẳng số giờ hành chính/tăng ca)
  function capHcTd(hc) {
    return `<td class="text-right cap-hc" title="Giờ HÀNH CHÍNH (HC) của kỳ — mỗi ca công đoạn chỉ đếm 1 lần; không tách ca thì tính một lần/ngày">${hc > 0 ? fmtNum1(hc) : '—'}</td>`;
  }
  function capTcTd(tc) {
    return `<td class="text-right cap-tc" title="Giờ TĂNG CA (TC) của kỳ — ngày nghỉ/lễ đi làm tính toàn giờ tăng ca">${tc > 0 ? fmtNum1(tc) : '—'}</td>`;
  }
  // TẦNG 1 — dòng KỲ (TUẦN / THÁNG) cấp Xưởng
  function capWeekRowHtml(w) {
    const mode = capModeOf();
    const sel = w.weekKey === capSelectedPeriod() ? ' cap-row-active' : '';
    const open = w.weekKey === (state.capUi.weekOpen || '') ? ' cap-row-open' : '';
    const effTip = w.eff == null
      ? 'Chưa có công đoạn nào tính được hiệu suất (thiếu giờ làm hoặc chưa khai định mức)'
      : 'Hiệu suất xưởng = bình quân gia quyền theo GIỜ của các công đoạn có hiệu suất';
    const botTip = w.bottleneck ? `Công đoạn thấp nhất kỳ này — nên kiểm tra trước: ${w.bottleneck.st.label}` : '';
    return `
      <tr class="cap-row${sel}${open}" data-cap-week-row="${w.weekKey}" title="Bấm để xem TỪNG CÔNG ĐOẠN của kỳ này">
        <td><strong>${escapeHTML(capPeriodHeadLabel(w.weekKey, mode))}</strong><span class="cap-week-sub">${escapeHTML(capPeriodSubLabel(w.weekKey, mode))}</span></td>
        <td class="text-right">${w.dataCount}/${w.stagesCount}</td>
        ${capHcTd(w.hc)}
        ${capTcTd(w.tc)}
        <td class="text-right cap-hours" title="Tổng giờ làm (HC + TC) — mỗi ca công đoạn chỉ đếm 1 lần; không tách ca thì tính một lần/ngày">${w.hours > 0 ? fmtNum1(w.hours) : '—'}</td>
        <td class="text-right">${capEffBadgeHtml(w.eff, effTip)}</td>
        <td class="text-right">${w.effCount ? `${w.passCount}/${w.effCount}` : '—'}</td>
        <td title="${escapeHTML(botTip)}">${w.bottleneck ? `${escapeHTML(w.bottleneck.st.label)} (${fmtNum1(w.bottleneck.row.eff)}%)` : '—'}</td>
        <td class="text-right cap-arrow"><i data-lucide="${open ? 'chevron-up' : 'chevron-down'}"></i></td>
      </tr>`;
  }
  // TẦNG 2 — bảng CÔNG ĐOẠN của kỳ đang xổ (lồng vào dòng kỳ)
  // Ở chế độ BẢNG DỮ LIỆU: tầng 2 mở công đoạn nào thì hiện luôn biểu đồ 8 kỳ
  // của công đoạn đó (dùng chung canvas #cap-stage-chart với chế độ Biểu đồ).
  function capStageChartTrHtml(w) {
    if ((state.capUi.view || 'visual') !== 'table') return '';
    if (!state.capUi.openStage || !CAP_STAGES.some(s => s.id === state.capUi.openStage)) return '';
    return `<tr class="cap-day-tr cap-chart-tr"><td colspan="11">${capChartPanelHtml(w)}</td></tr>`;
  }
  function capStageBlockHtml(w) {
    if ((state.capUi.weekOpen || '') !== w.weekKey) return '';
    const rowsHtml = w.parts.map(p => capStageRowHtml(p, w.weekKey)).join('');
    const empty = w.dataCount === 0
      ? `<tr class="cap-day-empty"><td colspan="11">Không có lượt nào trong ${capModeOf() === 'month' ? 'tháng' : 'tuần'} này — bấm › (kỳ kế tiếp) hoặc chọn kỳ khác ở bảng trên.</td></tr>`
      : '';
    return `
      <tr class="cap-stage-tr"><td colspan="9">
        <div class="cap-sub-wrap table-responsive">
          <table class="data-table cap-sub-table">
            <thead><tr>
              <th>Công đoạn</th>
              <th class="text-right">Lượt</th>
              <th class="text-right">Sản lượng</th>
              <th class="text-right">Giờ HC</th>
              <th class="text-right">Giờ TC</th>
              <th class="text-right">Tổng giờ</th>
              <th class="text-right">Công suất thực</th>
              <th class="text-right">${capModeOf() === 'month' ? 'Định mức tháng' : 'Định mức tuần'}</th>
              <th class="text-right">Hiệu suất</th>
              <th class="text-right">${capModeOf() === 'month' ? 'So tháng trước' : 'So tuần trước'}</th>
              <th class="text-right">Thao tác</th>
            </tr></thead>
            <tbody>${rowsHtml}${empty}${capStageChartTrHtml(w)}</tbody>
          </table>
        </div>
      </td></tr>`;
  }
  // 1 dòng CÔNG ĐOẠN (tầng 2) + khối NGÀY xổ ngay dưới (tầng 3) nếu đang mở
  function capStageRowHtml(p, weekKey) {
    const st = p.st, r = p.row;
    const open = state.capUi.openStage === st.id ? ' cap-row-open' : '';
    const qtyTxt = r.qty == null
      ? `<span title="Chưa đủ số lượng (công đoạn Chạy Máy Bào Thô chờ số thanh tự động từ Chọn Nan Thô)">—</span>`
      : `${r.qtyEstimated ? '≈ ' : ''}${fmtNum2(r.qty)} ${st.unitQty}${r.qtyEstimated ? ' — ước tính 600 kg/xe' : ''}`;
    const capTxt = r.cap != null ? `${fmtNum2(r.cap)} ${st.unit}` : '—';
    const rateTxt = st.kind === 'cap'
      ? (r.rate != null
        ? `${fmtNum2(r.rate)} ${st.rateUnit || st.unit}`
        : `<span class="cap-muted" title="Chưa khai Định mức công suất của tháng cho công đoạn này (thẻ công đoạn ở tab Công Đoạn)">chưa có ĐM</span>`)
      : (r.rateText
        ? `<span title="Định mức 1 lần than hóa theo tháng (phút/lần · m³/lần)">${escapeHTML(r.rateText)}</span>`
        : '—');
    const hoursTxt = r.hours > 0 ? fmtNum1(r.hours) : '—';
    const effTip = st.kind === 'cap'
      ? (r.eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ làm hoặc chưa khai Định mức công suất của tháng)'
        : (st.rateUnit
          ? `Hiệu suất = Công suất thực tuần (${fmtNum2(r.qty)} ${st.unitQty} ÷ ${fmtNum1(r.hours)}h ≈ ${fmtNum2(r.cap)} ${st.unit}) quy đổi thành xe/h ÷ Định mức tuần (${fmtNum2(r.rate)} ${st.rateUnit} — bình quân theo sản lượng các tháng)`
          : `Hiệu suất = Công suất thực tuần (${fmtNum2(r.cap)} ${st.unit}) ÷ Định mức tuần (${fmtNum2(r.rate)} ${st.unit} — bình quân theo sản lượng các tháng)`))
      : (r.eff == null
        ? 'Chưa đủ dữ liệu (chưa có lần than hóa hoặc giờ thực tế bằng 0)'
        : 'Hiệu suất = Σ Giờ cần ÷ (Σ Giờ thực − Σ Giờ sự cố) — tính RIÊNG TỪNG CA (gộp cả Sấy 1 + Sấy 2, không chia theo công đoạn), đúng công thức thẻ Than Hóa + Sấy');
    const prev = capStagePeriodRow(st, capPeriodShift(weekKey, -1, capModeOf()), capModeOf());
    return `
      <tr class="cap-row${open}" data-cap-stage-row="${st.id}" title="Bấm để xổ TỪNG NGÀY của công đoạn này trong kỳ">
        <td><span class="cap-stage-name">${escapeHTML(st.label)}</span><span class="cap-unit-chip">${escapeHTML(st.unit)}</span></td>
        <td class="text-right">${r.turns || '—'}</td>
        <td class="text-right">${qtyTxt}</td>
        ${capHcTd(r.hc)}
        ${capTcTd(r.tc)}
        <td class="text-right cap-hours" title="Tổng giờ làm (HC + TC) — mỗi ca chỉ đếm 1 lần nếu có dữ liệu ca, ngược lại một lần/ngày">${hoursTxt}</td>
        <td class="text-right">${capTxt}</td>
        <td class="text-right">${rateTxt}</td>
        <td class="text-right">${capEffBadgeHtml(r.eff, effTip)}</td>
        <td class="text-right">${capDeltaHtml(r.eff, prev.eff)}</td>
        <td class="text-right"><button type="button" class="btn btn-icon btn-outline cap-open-btn" data-cap-open-card="${st.cardId}" title="Mở thẻ ${escapeHTML(st.label)} (tab Công Đoạn) để xem/sửa theo ngày"><i data-lucide="external-link"></i></button></td>
      </tr>
      ${state.capUi.openStage === st.id ? capDayBlockHtml(st, r) : ''}`;
  }
  // TẦNG 3 — bảng NGÀY của công đoạn đang xổ
  function capDayBlockHtml(st, weekRow) {
    const days = weekRow.days || [];
    const body = days.length
      ? days.map(d => capDayRowHtml(st, d)).join('')
      : `<tr class="cap-day-empty"><td colspan="9">Không có lượt nào trong kỳ này.</td></tr>`;
    const head = st.kind === 'cap'
      ? `<tr><th>Ngày</th><th class="text-right">Lượt</th><th class="text-right">Sản lượng</th><th class="text-right">Giờ HC</th><th class="text-right">Giờ TC</th><th class="text-right">Tổng giờ</th><th class="text-right">Công suất</th><th class="text-right">Định mức tháng</th><th class="text-right">Hiệu suất</th></tr>`
      : `<tr><th>Ngày</th><th class="text-right">Lần TH</th><th class="text-right">Thể tích</th><th class="text-right">Giờ cần</th><th class="text-right">Giờ HC</th><th class="text-right">Giờ TC</th><th class="text-right">Giờ thực</th><th class="text-right">Sự cố</th><th class="text-right">Hiệu suất</th></tr>`;
    return `
      <tr class="cap-day-tr"><td colspan="11">
        <div class="cap-sub-wrap table-responsive">
          <table class="data-table cap-sub-table cap-day-table">
            <thead>${head}</thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </td></tr>`;
  }
  function capDayRowHtml(st, d) {
    const dateTxt = formatDateDDMMYY(d.date);
    if (st.kind === 'cap') {
      // Trừ giờ SỰ CỐ CHO PHÉP (nhập trên đầu thẻ ngày) khỏi giờ làm
      const hoursEff = Math.max(0, (Number(d.hours) || 0) - (Number(d.incident) || 0));
      const cap = (d.qty != null && d.qty > 0 && hoursEff > 0) ? d.qty / hoursEff : null;
      const eff = (() => {
        if (cap == null || !d.rate) return null;
        if (st.id === 'boluong' || st.id === 'cut') {
          if (Number(d.cartsEq) > 0) {
            const kgPerCart = Number(d.qty) / Number(d.cartsEq);
            return ((cap / kgPerCart) / d.rate) * 100;
          }
          return (cap / d.rate) * 100;
        }
        return (cap / d.rate) * 100;
      })();
      const effTip = eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ làm / giờ sự cố ≥ giờ làm, hoặc chưa khai Định mức công suất tháng)'
        : `Công suất ${fmtNum2(cap)} ${st.unit} = ${fmtNum2(d.qty)} ÷ ${fmtNum1(hoursEff)} giờ${d.incident > 0 ? ` [đã trừ ${fmtNum2(d.incident)}h sự cố]` : ''} ÷ Định mức tháng ${fmtNum2(d.rate)} ${st.unit}`;
      return `
        <tr class="cap-day-row">
          <td><i data-lucide="calendar-days"></i> ${dateTxt}${d.shiftIdx != null ? ` ${x2ShiftChipHtml(d.shiftIdx, 'Xưởng 2')}` : ''}</td>
          <td class="text-right">${d.turns}</td>
          <td class="text-right">${d.qty == null ? '—' : `${fmtNum2(d.qty)} ${st.unitQty}`}</td>
          ${capHcTd(d.hc)}
          ${capTcTd(d.tc)}
          <td class="text-right cap-hours">${d.hours > 0 ? fmtNum1(d.hours) : '—'}</td>
          <td class="text-right">${cap != null ? `${fmtNum2(cap)} ${st.unit}` : '—'}</td>
          <td class="text-right">${d.rate != null ? `${fmtNum2(d.rate)} ${st.unit}` : '—'}</td>
          <td class="text-right">${capEffBadgeHtml(eff, effTip)}</td>
        </tr>`;
    }
    const eff = (d.need > 0 && d.hours - d.incident > 0) ? (d.need / (d.hours - d.incident)) * 100 : null;
    const effTip = eff == null
      ? 'Chưa đủ dữ liệu (chưa có lần than hóa hoặc giờ thực tế bằng 0)'
      : `Hiệu suất ${d.shiftIdx != null ? 'CỦA CA' : 'CẢ NGÀY'} = Giờ cần ${fmtNum2(d.need)}h ÷ (Giờ thực ${fmtNum2(d.hours)}h − Sự cố ${fmtNum2(d.incident)}h) — gộp cả Sấy 1 và Sấy 2 trong ca, KHÔNG chia theo công đoạn`;
    return `
      <tr class="cap-day-row">
        <td><i data-lucide="calendar-days"></i> ${dateTxt}${d.shiftIdx != null ? ` ${x2ShiftChipHtml(d.shiftIdx, 'Xưởng 2')}` : ''}</td>
        <td class="text-right">${d.turns}</td>
        <td class="text-right">${fmtM3Cap(d.qty)}</td>
        <td class="text-right">${fmtNum2(d.need)}</td>
        ${capHcTd(d.hc)}
        ${capTcTd(d.tc)}
        <td class="text-right cap-hours" title="Tổng giờ thực (HC + TC)">${d.hours > 0 ? fmtNum2(d.hours) : '—'}</td>
        <td class="text-right">${d.incident > 0 ? fmtNum2(d.incident) : '—'}</td>
        <td class="text-right">${capEffBadgeHtml(eff, effTip)}</td>
      </tr>`;
  }
  // ─── TỔNG QUAN ĐIỀU HÀNH + QC ─────────────────────────────────────────
  function capActiveEmployeeIdsForWorkshop(ws, range) {
    const employees = state.hrEmployees || [];
    const active = new Set(employees.filter(e => (e.status || 'active') === 'active').map(e => String(e.id)));
    const employeeById = new Map(employees.map(e => [String(e.id), e]));
    if (!range) return new Set();
    const ids = new Set();
    const today = capTodayLocalISO();
    const effective = {
      from: String(range.from || ''),
      to: String(range.to || '') > today ? today : String(range.to || '')
    };
    if (!effective.from || !effective.to || effective.to < effective.from || effective.from > today) return ids;
    for (let d = effective.from; d <= effective.to; d = hrShiftDateISOCompat(d, 1)) {
      const rows = typeof hrAssignmentsOf === 'function' ? hrAssignmentsOf(d) : [];
      rows.forEach(a => {
        if (!a) return;
        const employee = employeeById.get(String(a.employeeId || ''));
        const dept = String(a.department || employee?.department || '').toLowerCase();
        const wsMatch = ws === 'x1' ? dept.includes('xưởng 1') || dept.includes('x1') : dept.includes('xưởng 2') || dept.includes('x2');
        const eid = String(a.employeeId || '');
        if (wsMatch && active.has(eid)) ids.add(eid);
      });
    }
    return ids;
  }
  function hrShiftDateISOCompat(dateStr, delta) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return dateStr;
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function capWorkshopWorkforceOf(ws, key, mode) {
    const range = capPeriodRangeOf(key, mode);
    if (!range) return null;
    const employees = state.hrEmployees || [];
    const active = new Set(employees.filter(e => (e.status || 'active') === 'active').map(e => String(e.id)));
    if (!active.size) return null;
    const ids = capActiveEmployeeIdsForWorkshop(ws, range);
    return ids.size || (typeof hrAssignmentsOf === 'function' && (state.hrAssignments || []).length === 0 ? null : 0);
  }
  // Tổng số nhân viên đang hoạt động của xưởng (mẫu số cho tỷ lệ đi làm theo người).
  // Không phụ thuộc có phân công/lịch trong kỳ hay không — tính từ danh sách nhân viên active.
  function capTotalActiveWorkforce(ws) {
    const employees = state.hrEmployees || [];
    let count = 0;
    employees.forEach(e => {
      if (!e || (e.status || 'active') !== 'active') return;
      const dept = String(e.department || '').toLowerCase();
      const match = ws === 'x1'
        ? dept.includes('xưởng 1') || dept.includes('x1')
        : dept.includes('xưởng 2') || dept.includes('x2');
      if (match) count++;
    });
    return count || 0;
  }
  NEW_FUNCTION_HEREfunction capAttendanceRateOf(ws, key, mode) {
    const range = capPeriodRangeOf(key, mode);
    if (!range) return { rate: null, coverage: 0, scheduled: 0, marked: 0 };
    const ids = capActiveEmployeeIdsForWorkshop(ws, range);
    if (ids.size) return capAttendanceRateForIds(ids, range);

    const fallbackIds = new Set();
    (state.hrEmployees || []).forEach(e => {
      if (!e || (e.status || 'active') !== 'active') return;
      const dept = String(e.department || '').toLowerCase();
      const match = ws === 'x1'
        ? dept.includes('xưởng 1') || dept.includes('x1')
        : dept.includes('xưởng 2') || dept.includes('x2');
      if (match) fallbackIds.add(String(e.id));
    });
    return fallbackIds.size
      ? capAttendanceRateForIds(fallbackIds, range)
      : { rate: null, coverage: 0, scheduled: 0, marked: 0 };
  }
  function capAttendanceCategoryText(attendance) {
    const leave = Number(attendance && attendance.leave) || 0;
    const absent = Number(attendance && attendance.absent) || 0;
    const unmarked = Number(attendance && attendance.unmarked) || 0;
    return `Nghỉ ${leave} · Vắng ${absent} · Chưa chấm ${unmarked}`;
  }
  function capEffectiveRangeForAttendance(range) {
    if (!range) return null;
    const today = capTodayLocalISO();
    const from = String(range.from || '');
    let to = String(range.to || '');
    if (!from || !to) return null;
    if (to > today) to = today;
    if (from > today || to < from) return null;
    return { from, to };
  }
  function capAttendanceTodayForIds(ids) {
    const today = capTodayLocalISO();
    return capAttendanceRateForIds(ids, { from: today, to: today });
  }
  function capAttendanceTodayForWorkshop(ws) {
    const today = capTodayLocalISO();
    const ids = capActiveEmployeeIdsForWorkshop(ws, { from: today, to: today });
    if (ids.size) return capAttendanceTodayForIds(ids);
    const fallback = new Set();
    (state.hrEmployees || []).forEach(e => {
      if (!e || (e.status || 'active') !== 'active') return;
      const dept = String(e.department || '').toLowerCase();
      if (ws === 'x1' ? dept.includes('xưởng 1') || dept.includes('x1') : dept.includes('xưởng 2') || dept.includes('x2')) fallback.add(String(e.id));
    });
    return fallback.size ? capAttendanceTodayForIds(fallback) : { rate: null, work: 0, scheduled: 0 };
  }
  // ĐẾM SỐ ĐƠN THEO TRẠNG THÁI (đã duyệt / chờ duyệt / từ chối) trong kỳ —
  // sửa lỗi "thẻ báo 0 đơn" khi có đơn chưa duyệt: bản cũ chỉ trả trạng thái ✓/!
  // nên không phản ánh số lượng đơn nghỉ phép / tăng ca đang chờ xử lý.
  function capApprovalTilesForPeriod(range) {
    const blank = () => ({ approved: 0, pending: 0, rejected: 0, total: 0, state: 'ok', text: '' });
    const result = { leave: blank(), overtime: blank() };
    if (!range) {
      result.leave.text = 'Chưa xác định kỳ';
      result.overtime.text = 'Chưa xác định kỳ';
      return result;
    }
    const bucketOf = (st) => {
      if (st === 'approved' || st === 'approve') return 'approved';
      if (st === 'rejected' || st === 'cancelled') return 'rejected';
      return 'pending';
    };
    const leaves = (state.hrLeaves || []).filter(l => l &&
      String(l.from || '') <= range.to && String(l.to || range.from) >= range.from);
    leaves.forEach(l => {
      result.leave[bucketOf(l.status || 'pending')]++;
      result.leave.total++;
    });
    const overtime = (state.hrOvertimes || []).filter(o => o &&
      String(o.date || '') >= range.from && String(o.date || '') <= range.to);
    overtime.forEach(o => {
      // Cả phiếu gốc và từng phiếu sửa đổi (amendments) đều là 1 đơn cần duyệt
      result.overtime[bucketOf(o.status || 'pending')]++;
      result.overtime.total++;
      (o.amendments || []).forEach(a => {
        if (!a) return;
        result.overtime[bucketOf(a.status || 'pending')]++;
        result.overtime.total++;
      });
    });
    [result.leave, result.overtime].forEach(t => {
      t.state = t.pending > 0 ? 'bad' : (t.rejected > 0 ? 'warn' : 'ok');
    });
    return result;
  }
  function capDeltaText(current, previous, suffix = '') {
    if (current == null || previous == null) return '—';
    const delta = current - previous;
    const sign = delta > 0.049 ? '+' : delta < -0.049 ? '−' : '';
    const value = Math.abs(delta) < 0.05 ? '0' : fmtNum1(Math.abs(delta));
    return `${sign}${value}${suffix}`;
  }
  function capTrendSpark(values, label) {
    const points = (values || []).map((v, i) => ({ v, i })).filter(p => p.v != null);
    if (points.length < 2) return '<span class="cap-spark-none">Chưa đủ dữ liệu</span>';
    const vals = points.map(p => p.v);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min;
    const coords = points.map(p => {
      const x = 4 + (p.i / Math.max(1, values.length - 1)) * 52;
      const y = span > 0 ? 20 - ((p.v - min) / span) * 16 : 12;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `<svg class="cap-spark-svg" viewBox="0 0 60 24" aria-label="${escapeHTML(label)}" role="img">
      <path class="cap-spark-base" d="M4 20 H56"></path>
      <polyline class="cap-spark-val" points="${coords.join(' ')}"></polyline>
    </svg>`;
  }
  function capStripHtml(w, ws) {
    const mode = capModeOf();
    const byWeek = capPeriodAggregates(ws, mode);
    const previousKey = capPreviousPeriodKey(w.weekKey, mode);
    const prev = capWorkshopPeriodRowFromMap(ws, previousKey, byWeek, mode);
    const effTip = w.eff == null
      ? 'Chưa có công đoạn nào tính được hiệu suất (thiếu giờ làm hoặc chưa khai định mức)'
      : 'Bình quân gia quyền theo giờ của các công đoạn có hiệu suất';
    const effDelta = capDeltaText(w.eff, prev.eff, '%');
    const hcDelta = w.hc > 0 || prev.hc > 0 ? capDeltaText(w.hc, prev.hc, 'h') : '—';
    const tcDelta = w.tc > 0 || prev.tc > 0 ? capDeltaText(w.tc, prev.tc, 'h') : '—';
    const totalDelta = w.hours > 0 || prev.hours > 0 ? capDeltaText(w.hours, prev.hours, 'h') : '—';
    const workforce = capWorkshopWorkforceOf(ws, w.weekKey, mode);
    const attendance = capAttendanceRateOf(ws, w.weekKey, mode);
    const attendanceText = attendance.fallback
      ? (attendance.scheduled > 0 ? `bản ghi đã đánh dấu ${attendance.marked}/${attendance.scheduled}` : 'không có lịch · không có bản ghi')
      : (attendance.scheduled > 0
        ? `phủ dữ liệu ${attendance.marked}/${attendance.scheduled} ngày công`
        : 'chưa đủ lịch phân công');
    const attendanceCategory = capAttendanceCategoryText(attendance);
    const keys = [];
    let key = w.weekKey;
    for (let i = 0; i < 8; i++) { keys.unshift(key); key = capPreviousPeriodKey(key, mode); }
    const history = keys.map(k => capWorkshopPeriodRowFromMap(ws, k, byWeek, mode));
    const effTrend = capTrendSpark(history.map(r => r.eff), 'Xu hướng hiệu suất');
    const hourTrend = capTrendSpark(history.map(r => r.hours > 0 ? r.hours : null), 'Xu hướng tổng giờ');
    const stageText = w.bottleneck
      ? `Nút thắt · Hiệu suất ${w.bottleneck.row.eff == null ? '—' : `${fmtNum1(w.bottleneck.row.eff)}%`}`
      : `Công đoạn: ${w.effCount ? `${w.passCount}/${w.effCount} đạt ≥100%` : 'chưa đủ dữ liệu'}`;
    return `
      <div class="cap-exec-overview" aria-label="Tổng quan điều hành kỳ đang chọn">
        <article class="cap-exec-card cap-exec-eff" title="${escapeHTML(effTip)}">
          <span class="cap-exec-label"><i data-lucide="gauge"></i> Hiệu suất</span>
          <strong class="cap-exec-value">${w.eff == null ? '—' : `${fmtNum1(w.eff)}%`}</strong>
          <small class="cap-exec-delta">${effDelta === '—' ? 'chưa có kỳ trước' : `so kỳ trước ${effDelta}`}</small>
        </article>
        <button type="button" class="cap-exec-card cap-exec-stage" data-cap-open-stage="${w.bottleneck ? escapeHTML(w.bottleneck.st.id) : ''}" title="Mở chi tiết công đoạn">
          <span class="cap-exec-label"><i data-lucide="alert-triangle"></i> Công đoạn</span>
          <strong class="cap-exec-value cap-exec-stage-value">${w.bottleneck ? escapeHTML(w.bottleneck.st.label) : 'Chưa đủ dữ liệu'}</strong>
          <small>${escapeHTML(stageText)} · Xem chi tiết</small>
        </button>
        <article class="cap-exec-card">
          <span class="cap-exec-label"><i data-lucide="users"></i> Lao động</span>
          <strong class="cap-exec-value">${workforce == null ? '—' : `${fmtNum1(workforce)} người`}</strong>
          <small>đang hoạt động trong kỳ</small>
        </article>
        <article class="cap-exec-card">
          <span class="cap-exec-label"><i data-lucide="clock-3"></i> Giờ làm</span>
          <strong class="cap-exec-value">${w.hours > 0 ? `${fmtNum1(w.hours)}h` : '—'}</strong>
          <small>Giờ HC ${w.hc > 0 ? `${fmtNum1(w.hc)}h` : '—'} · Giờ TC ${w.tc > 0 ? `${fmtNum1(w.tc)}h` : '—'} · Tổng ${w.hours > 0 ? `${fmtNum1(w.hours)}h` : '—'}</small>
          <small class="cap-exec-delta">Δ HC ${hcDelta} · TC ${tcDelta} · Tổng ${totalDelta}</small>
        </article>
        <article class="cap-exec-card">
          <span class="cap-exec-label"><i data-lucide="calendar-check"></i> Đi làm</span>
          <strong class="cap-exec-value">${attendance.rate == null ? '—' : `${fmtNum1(attendance.rate)}%`}</strong>
          <small>${escapeHTML(attendanceText)}</small>
        </article>
        <article class="cap-exec-card cap-exec-trend">
          <span class="cap-exec-label"><i data-lucide="activity"></i> Xu hướng</span>
          <div class="cap-trend-row"><span>Hiệu suất</span>${effTrend}</div>
          <div class="cap-trend-row"><span>Giờ</span>${hourTrend}</div>
        </article>
      </div>`;
  }

  function capQcShippedQtyOf(ws, key, mode) {
    const range = capPeriodRangeOf(key, mode);
    if (!range) return null;
    const rows = state.qcExports || [];
    let qty = 0, hasQty = false;
    rows.forEach(r => {
      if (!r) return;
      let inPeriod = false;
      if (mode === 'week') {
        const weekNum = capWeekNumOf(key);
        const weekYear = capWeekYearOf(key);
        const rowWeeks = Array.isArray(r.weeks) ? r.weeks : (r.week != null ? [r.week] : []);
        inPeriod = rowWeeks.map(Number).filter(Number.isFinite).includes(weekNum)
          && (!r.year || String(r.year) === String(weekYear));
        if (!inPeriod && r.exportDate) inPeriod = String(r.exportDate).slice(0, 10) >= range.from && String(r.exportDate).slice(0, 10) <= range.to;
      } else {
        if (r.exportDate) {
          inPeriod = String(r.exportDate).slice(0, 7) === key;
        } else {
          const year = key.slice(0, 4);
          const rowWeeks = Array.isArray(r.weeks) ? r.weeks : (r.week != null ? [r.week] : []);
          inPeriod = (!r.year || String(r.year) === year) && rowWeeks.some(w => {
            const mon = capWeekMonday(`${year}-W${String(w).padStart(2, '0')}`);
            return mon && capISOOfLocal(mon) <= range.to && hrShiftDateISOCompat(capISOOfLocal(mon), 6) >= range.from;
          });
        }
      }
      if (!inPeriod) return;
      const v = Number(r.qty);
      if (Number.isFinite(v)) { qty += v; hasQty = true; }
    });
    return hasQty ? qty : null;
  }

  function capQcOverviewHtml(ws, key, mode) {
    const range = capPeriodRangeOf(key, mode);
    if (!range) return `<section class="cap-qc-card"><div class="cap-qc-empty">Chưa có dữ liệu kỳ QC</div></section>`;
    const workshopKey = ws === 'x1' ? 'x1' : 'x2';
    const records = (state.qcFinalRecords || []).filter(r =>
      r && String(r.date || '') >= range.from && String(r.date || '') <= range.to
      && (r.workshop || 'x2') === workshopKey
    );
    if (!records.length) {
      return `<section class="cap-qc-card">
        <div class="cap-qc-card-head"><i data-lucide="clipboard-check"></i><strong>QC · tổng quan kỳ</strong></div>
        <div class="cap-qc-grid">
          <div class="cap-qc-metric"><span>Hiệu suất</span><strong>—</strong></div>
          <div class="cap-qc-metric"><span>Nhân công</span><strong>—</strong></div>
          <div class="cap-qc-metric"><span>Giờ HC / TC / Tổng</span><strong>— / — / —</strong></div>
          <div class="cap-qc-metric"><span>Đi làm</span><strong>—</strong><small>chưa đủ lịch phân công</small></div>
          <div class="cap-qc-metric"><span>Hàng xuất</span><strong>${capQcShippedQtyOf(ws, key, mode) == null ? '—' : fmtNum1(capQcShippedQtyOf(ws, key, mode))}</strong></div>
        </div>
      </section>`;
    }
    const displays = records.map(r => qcFinalDisplay(r)).filter(Boolean);
    const effParts = displays.map(d => ({ eff: d.eff, hours: d.workHours > 0 ? d.workHours : null, qty: d.qtyChecked > 0 ? d.qtyChecked : null }));
    let eff = null;
    const weightedHours = effParts.reduce((sum, p) => sum + (p.eff != null && p.hours != null ? p.hours : 0), 0);
    if (weightedHours > 0) {
      eff = effParts.reduce((sum, p) => sum + (p.eff != null && p.hours != null ? p.eff * p.hours : 0), 0) / weightedHours;
    } else {
      const effs = effParts.map(p => p.eff).filter(v => v != null);
      if (effs.length) eff = effs.reduce((sum, v) => sum + v, 0) / effs.length;
    }
    const names = new Set();
    const ids = new Set();
    const employees = state.hrEmployees || [];
    displays.forEach(d => {
      (d.workers || []).forEach(w => {
        const name = String(w && w.name || '').trim();
        if (name) {
          names.add(name);
          const emp = employees.find(e => String(e.name || '').trim() === name);
          if (emp) ids.add(String(emp.id));
        }
      });
    });
    let hc = null, tc = null, total = null;
    let hcSum = 0, tcSum = 0, totalSum = 0;
    displays.forEach(d => {
      if (d.workHoursHC != null) hcSum += Number(d.workHoursHC) || 0;
      if (d.workHoursTC != null) tcSum += Number(d.workHoursTC) || 0;
      if (d.workHours > 0) totalSum += d.workHours;
    });
    if (hcSum > 0) hc = hcSum;
    if (tcSum > 0) tc = tcSum;
    if (totalSum > 0) total = totalSum;
    if (hc == null && tc == null && total != null) { hc = null; tc = null; }
    const attendance = ids.size
      ? capAttendanceRateForIds(ids, range)
      : { rate: null, coverage: 0, scheduled: 0, marked: 0 };
    const attendanceText = attendance.scheduled > 0
      ? `phủ dữ liệu ${attendance.marked}/${attendance.scheduled} ngày công`
      : 'chưa đủ lịch phân công';
    const shipped = capQcShippedQtyOf(ws, key, mode);
    return `<section class="cap-qc-card">
      <div class="cap-qc-card-head"><i data-lucide="clipboard-check"></i><strong>QC · tổng quan kỳ</strong></div>
      <div class="cap-qc-grid">
        <div class="cap-qc-metric"><span>Hiệu suất</span><strong>${eff == null ? '—' : `${fmtNum1(eff)}%`}</strong></div>
        <div class="cap-qc-metric"><span>Nhân công / người kiểm</span><strong>${names.size ? `${names.size} người` : '—'}</strong></div>
        <div class="cap-qc-metric"><span>Giờ HC / TC / Tổng</span><strong>${hc == null ? '—' : `${fmtNum1(hc)}h`} / ${tc == null ? '—' : `${fmtNum1(tc)}h`} / ${total == null ? '—' : `${fmtNum1(total)}h`}</strong></div>
        <div class="cap-qc-metric"><span>Đi làm</span><strong>${attendance.rate == null ? '—' : `${fmtNum1(attendance.rate)}%`}</strong><small>${escapeHTML(attendanceText)}</small><small class="cap-att-category">${escapeHTML(attendanceCategory)}</small></div>
        <div class="cap-qc-metric"><span>Hàng xuất</span><strong>${shipped == null ? '—' : fmtNum1(shipped)}</strong></div>
      </div>
    </section>`;
  }

  // ─── DASHBOARD CÔNG SUẤT: 3 THẺ TÓM TẮT (Biểu đồ) ─────────────
  // Hai thẻ đầu nằm cùng một hàng desktop; thẻ lao động/công suất có thể
  // trải toàn hàng nhưng luôn giữ 1/3 — 2/3 trong nội dung.
  function capRecentPeriodKeys(key, mode, count = 8) {
    const keys = [];
    let cur = key;
    for (let i = 0; i < count; i++) {
      keys.unshift(cur);
      cur = capPreviousPeriodKey(cur, mode);
    }
    return keys;
  }
  function capGaugeMiniHtml(eff, label) {
    const v = eff == null ? 0 : Math.max(0, Math.min(150, eff));
    const color = capEffColorOf(eff);
    const cx = 66, cy = 64, r = 46;
    const point = (deg) => {
      const a = (deg - 90) * Math.PI / 180;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    };
    const arc = (deg) => {
      const start = point(-120), end = point(-120 + Math.max(0, Math.min(240, deg)));
      const large = deg > 180 ? 1 : 0;
      return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    };
    return `<div class="cap-mini-gauge" title="${escapeHTML(label)}">
      <svg viewBox="0 0 132 132" role="img" aria-label="${escapeHTML(label)}">
        <path d="${arc(240)}" fill="none" stroke="rgba(100,116,139,0.18)" stroke-width="10" stroke-linecap="round"></path>
        ${v > 0.5 ? `<path d="${arc(240 * v / 150)}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"></path>` : ''}
        <text x="${cx}" y="69" text-anchor="middle" fill="${color}" class="cap-mini-gauge-value">${eff == null ? '—' : fmtNum1(eff) + '%'}</text>
        <text x="${cx}" y="88" text-anchor="middle" class="cap-mini-gauge-label">Hiệu suất</text>
      </svg>
    </div>`;
  }

  function capNormalEfficiencyCard(w, ws) {
    const mode = capModeOf();
    const rows = w.parts
      .slice()
      .sort((a, b) => ((b.row.eff == null ? -1 : b.row.eff) - (a.row.eff == null ? -1 : a.row.eff)));
    const bottleneck = w.bottleneck;
    const bottleneckHtml = bottleneck
      ? `<div class="cap-card-bottleneck"><span>Nút thắt</span><strong>${escapeHTML(bottleneck.st.label)}</strong><em>${bottleneck.row.eff == null ? '—' : fmtNum1(bottleneck.row.eff) + '%'}</em></div>`
      : `<div class="cap-card-bottleneck"><span>Nút thắt</span><strong>Chưa đủ dữ liệu</strong></div>`;
    const quantityByUnit = new Map();
    w.parts.forEach(p => {
      if (p.row.qty == null || p.row.qtyKnown === false) return;
      const unit = String(p.st.unitQty || '').trim();
      if (!unit) return;
      quantityByUnit.set(unit, (quantityByUnit.get(unit) || 0) + (Number(p.row.qty) || 0));
    });
    const quantityHtml = quantityByUnit.size
      ? `<div class="cap-card-period-qty"><span>Sản lượng cả kỳ</span><div>${Array.from(quantityByUnit.entries()).map(([unit, qty]) => `<strong>${fmtNum1(qty)} <small>${escapeHTML(unit)}</small></strong>`).join('')}</div></div>`
      : `<div class="cap-card-period-qty"><span>Sản lượng cả kỳ</span><strong>—</strong></div>`;
    const rowHtml = rows.length ? rows.map(p => {
      const eff = p.row.eff;
      const qtyText = p.row.qty == null
        ? '—'
        : `${fmtNum2(p.row.qty)} ${p.st.unitQty}${p.row.qtyEstimated ? ' (ước tính ≈)' : ''}`;
      const lastDate = p.row.lastDate
        ? `${p.row.lastDate.slice(8, 10)}/${p.row.lastDate.slice(5, 7)}`
        : '';
      const cls = eff == null ? 'none' : eff >= 100 ? 'good' : eff >= 70 ? 'mid' : 'low';
      const pct = eff == null ? 0 : Math.max(0, Math.min(150, eff));
      return `<button type="button" class="cap-stage-eff-row ${cls}" data-cap-open-stage="${escapeHTML(p.st.id)}" style="--eff-fill:${(pct / 150 * 100).toFixed(1)}%" title="Mở chi tiết công đoạn ${escapeHTML(p.st.label)} — sản lượng kỳ ${escapeHTML(qtyText)}">
        ${lastDate ? `<span class="cap-stage-eff-date">${escapeHTML(lastDate)}</span>` : ''}
        <span class="cap-stage-eff-name">${escapeHTML(p.st.label)}</span>
        <strong class="cap-stage-eff-val">${eff == null ? '—' : fmtNum1(eff) + '%'}</strong>
      </button>`;
    }).join('') : `<div class="cap-card-empty">Chưa có công đoạn có dữ liệu trong kỳ.</div>`;
    return `<section class="cap-summary-card cap-efficiency-card" aria-label="Hiệu suất công đoạn">
      <div class="cap-summary-card-left">${capGaugeMiniHtml(w.eff, `Hiệu suất tổng ${capPeriodHeadLabel(w.weekKey, mode)}`)}${bottleneckHtml}${quantityHtml}</div>
      <div class="cap-summary-card-right">
        <div class="cap-card-title"><i data-lucide="list-ordered"></i><strong>Xếp hạng hiệu suất công đoạn</strong></div>
        <div class="cap-stage-eff-list">${rowHtml}</div>
      </div>
    </section>`;
  }

  function capQcRecordsForPeriod(key, mode) {
    const range = capPeriodRangeOf(key, mode);
    if (!range) return [];
    return (state.qcFinalRecords || []).filter(r =>
      r && String(r.date || '') >= range.from && String(r.date || '') <= range.to
    );
  }
  function capQcKindRowsForPeriod(key, mode) {
    const kinds = [
      { kind: 'thanh', label: 'Thanh' },
      { kind: 'van', label: 'Ván' }
    ];
    return kinds.map(k => {
      const records = capQcRecordsForPeriod(key, mode).filter(r => String(r.kind || 'van') === k.kind);
      const rows = records.map(r => qcFinalDisplay(r)).filter(Boolean);
      const weighted = rows.reduce((sum, d) => sum + (d.eff != null && d.workHours > 0 ? d.eff * d.workHours : 0), 0);
      const hours = rows.reduce((sum, d) => sum + (d.eff != null && d.workHours > 0 ? d.workHours : 0), 0);
      let eff = hours > 0 ? weighted / hours : null;
      if (eff == null) {
        const values = rows.map(d => d.eff).filter(v => v != null);
        if (values.length) eff = values.reduce((sum, v) => sum + v, 0) / values.length;
      }
      return { ...k, eff, turns: rows.length };
    });
  }
  function capQcEfficiencyCard(key, mode) {
    const kinds = capQcKindRowsForPeriod(key, mode);
    const withEff = kinds.filter(k => k.eff != null);
    const weighted = kinds.reduce((sum, k) => sum + (k.eff != null ? k.eff : 0), 0);
    const overall = withEff.length ? weighted / withEff.length : null;
    const bottleneck = withEff.length
      ? [...withEff].sort((a, b) => a.eff - b.eff)[0]
      : null;
    const bottleneckHtml = bottleneck
      ? `<div class="cap-card-bottleneck"><span>Nút thắt</span><strong>${escapeHTML(bottleneck.label)}</strong><em>${fmtNum1(bottleneck.eff)}%</em></div>`
      : `<div class="cap-card-bottleneck"><span>Nút thắt</span><strong>Chưa đủ dữ liệu</strong></div>`;
    const rows = kinds.map(k => {
      const cls = k.eff == null ? 'none' : k.eff >= 100 ? 'good' : k.eff >= 70 ? 'mid' : 'low';
      const pct = k.eff == null ? 0 : Math.max(0, Math.min(150, k.eff));
      return `<button type="button" class="cap-stage-eff-row ${cls}" data-cap-qc-kind="${k.kind}" style="--eff-fill:${(pct / 150 * 100).toFixed(1)}%" title="Loại kiểm ${escapeHTML(k.label)}">
        <span class="cap-stage-eff-name">${escapeHTML(k.label)}</span>
        <strong class="cap-stage-eff-val">${k.eff == null ? '—' : fmtNum1(k.eff) + '%'}</strong>
      </button>`;
    }).join('');
    return `<section class="cap-summary-card cap-efficiency-card" aria-label="Hiệu suất QC Thanh và Ván">
      <div class="cap-summary-card-left">${capGaugeMiniHtml(overall, `Hiệu suất QC ${capPeriodHeadLabel(key, mode)}`)}${bottleneckHtml}</div>
      <div class="cap-summary-card-right">
        <div class="cap-card-title"><i data-lucide="clipboard-check"></i><strong>Hiệu suất QC theo loại</strong></div>
        <div class="cap-stage-eff-list">${rows}</div>
      </div>
    </section>`;
  }

  function capHoursCard(w, ws) {
    const title = ws === 'qc' ? 'Giờ kiểm QC' : 'Giờ làm';
    return `<section class="cap-summary-card cap-hours-card" aria-label="${escapeHTML(title)}">
      <div class="cap-hours-body">
        <div class="cap-card-title"><i data-lucide="clock-3"></i><strong>${escapeHTML(title)}</strong></div>
        <div class="cap-hours-kpis">
          <div><span>Tổng</span><strong>${w.hours > 0 ? fmtNum1(w.hours) + 'h' : '—'}</strong></div>
          <div><span>HC</span><strong>${w.hc > 0 ? fmtNum1(w.hc) + 'h' : '—'}</strong></div>
          <div><span>TC</span><strong>${w.tc > 0 ? fmtNum1(w.tc) + 'h' : '—'}</strong></div>
        </div>
        <div class="cap-hours-chart-wrap">
          <div class="cap-summary-chart"><canvas id="cap-hours-chart" role="img" aria-label="Biểu đồ giờ HC và TC 8 kỳ gần nhất"></canvas></div>
        </div>
      </div>
    </section>`;
  }
  function capQcHoursValues(key, mode) {
    const rows = capQcRecordsForPeriod(key, mode).map(r => qcFinalDisplay(r)).filter(Boolean);
    let hc = 0, tc = 0;
    rows.forEach(d => { hc += d.workHoursHC != null ? Number(d.workHoursHC) || 0 : 0; tc += d.workHoursTC != null ? Number(d.workHoursTC) || 0 : 0; });
    const hours = hc + tc || rows.reduce((sum, d) => sum + (d.workHours > 0 ? d.workHours : 0), 0);
    return { weekKey: key, hc: hc > 0 ? hc : null, tc: tc > 0 ? tc : null, hours: hours > 0 ? hours : 0 };
  }

  function capQcEmployeeIds(records) {
    const ids = new Set();
    const employees = state.hrEmployees || [];
    records.forEach(r => {
      const d = qcFinalDisplay(r);
      (d.workers || []).forEach(w => {
        const emp = employees.find(e => String(e.name || '').trim() === String(w.name || '').trim());
        if (emp) ids.add(String(emp.id));
      });
    });
    if (!ids.size) {
      employees.forEach(e => {
        if ((e.status || 'active') === 'active' && String(e.department || '').toLowerCase().includes('qc')) ids.add(String(e.id));
      });
    }
    return ids;
  }
  // Đếm số NGƯỜI (không trùng) đã đi làm có chấm công trong kỳ — làm mẫu số
  // "tỷ lệ đi làm trong kỳ" (VD 60 người / 64 lao động). Tái dùng quét lịch
  // phân công theo ngày như capAttendanceRateForIds nhưng chỉ lấy 1 lần/người.
  function capDistinctWorkPeople(ids, range) {
    if (!range || !ids || !ids.size) return 0;
    const today = capTodayLocalISO();
    const from = String(range.from || '');
    let to = String(range.to || '');
    if (!from || !to) return 0;
    if (to > today) to = today;
    if (from > today || to < from) return 0;
    const worked = new Set();
    for (let d = from; d <= to; d = hrShiftDateISOCompat(d, 1)) {
      const rows = typeof hrAssignmentsOf === 'function' ? hrAssignmentsOf(d) : [];
      rows.forEach(a => {
        if (!a) return;
        const eid = String(a.employeeId || '');
        if (!ids.has(eid) || worked.has(eid)) return;
        let st = typeof attStatusOf === 'function' ? attStatusOf(eid, d) : '';
        if (st !== 'work') {
          const rec = (state.hrAttendance || []).find(x =>
            x && String(x.employeeId) === eid && String(x.date) === d);
          st = rec && rec.status ? String(rec.status) : '';
        }
        if (st === 'work') worked.add(eid);
      });
    }
    return worked.size;
  }
  // Số người ĐÃ ĐI LÀM của xưởng trong 1 ngày (đếm theo trạng thái chấm công,
  // KHÔNG yêu cầu có phân công — để tử/mẫu số nhất quán với tổng lao động).
  function capWorkedPeopleOnDate(ws, date) {
    if (!date) return 0;
    const worked = new Set();
    (state.hrEmployees || []).forEach(e => {
      if (!e || (e.status || 'active') !== 'active') return;
      const dept = String(e.department || '').toLowerCase();
      const match = ws === 'x1'
        ? dept.includes('xưởng 1') || dept.includes('x1')
        : dept.includes('xưởng 2') || dept.includes('x2');
      if (!match) return;
      let st = typeof attStatusOf === 'function' ? attStatusOf(String(e.id), String(date)) : '';
      if (st !== 'work') {
        const rec = (state.hrAttendance || []).find(x =>
          x && String(x.employeeId) === String(e.id) && String(x.date) === String(date));
        st = rec && rec.status ? String(rec.status) : '';
      }
      if (st === 'work') worked.add(String(e.id));
    });
    return worked.size;
  }
  // Số ngày CÓ HOẠT ĐỘNG (có ít nhất 1 lượt bố trí của xưởng) trong kỳ hiệu lực —
  // nhân với tổng lao động để ra "công nếu đi làm đủ".
  function capWorkshopActiveDays(ws, range) {
    if (!range) return 0;
    const today = capTodayLocalISO();
    const from = String(range.from || '');
    let to = String(range.to || '');
    if (!from || !to) return 0;
    if (to > today) to = today;
    if (from > today || to < from) return 0;
    let days = 0;
    for (let d = from; d <= to; d = hrShiftDateISOCompat(d, 1)) {
      const rows = typeof hrAssignmentsOf === 'function' ? hrAssignmentsOf(d) : [];
      const hasAny = rows.some(a => {
        if (!a) return false;
        const dept = String(a.department || '').toLowerCase();
        return ws === 'x1'
          ? dept.includes('xưởng 1') || dept.includes('x1')
          : dept.includes('xưởng 2') || dept.includes('x2');
      });
      if (hasAny) days++;
    }
    return days;
  }
  function capLaborKpiCard(ws, w, key, mode) {
    let workforce = null, attendance = null;
    let ids = null;
    if (ws === 'qc') {
      const records = capQcRecordsForPeriod(key, mode);
      ids = capQcEmployeeIds(records);
      workforce = ids.size ? ids.size : null;
      attendance = ids.size ? capAttendanceRateForIds(ids, capPeriodRangeOf(key, mode)) : { rate: null, coverage: 0, scheduled: 0, marked: 0 };
    } else {
      // Mẫu số = tổng nhân viên đang hoạt động của xưởng (không phụ thuộc có phân công trong kỳ hay không).
      workforce = capTotalActiveWorkforce(ws);
      attendance = capAttendanceRateOf(ws, key, mode);
      ids = capActiveEmployeeIdsForWorkshop(ws, capPeriodRangeOf(key, mode));
      if (!ids.size) {
        ids = new Set();
        (state.hrEmployees || []).forEach(e => {
          if (!e || (e.status || 'active') !== 'active') return;
          const dept = String(e.department || '').toLowerCase();
          if (ws === 'x1' ? dept.includes('xưởng 1') || dept.includes('x1') : dept.includes('xưởng 2') || dept.includes('x2')) ids.add(String(e.id));
        });
      }
    }
    const coverageText = attendance.fallback
      ? (attendance.scheduled > 0 ? `bản ghi đã đánh dấu ${attendance.marked}/${attendance.scheduled}` : 'không có lịch · không có bản ghi')
      : (attendance.scheduled > 0
        ? `phủ dữ liệu ${attendance.marked}/${attendance.scheduled} ngày công`
        : 'chưa đủ lịch phân công');
    const categoryText = capAttendanceCategoryText(attendance);
    const todayAttendance = ws === 'qc'
      ? (ids && ids.size ? capAttendanceTodayForIds(ids) : { rate: null, work: 0, scheduled: 0 })
      : capAttendanceTodayForWorkshop(ws);
    const periodRange = capPeriodRangeOf(key, mode);
    const periodEffective = capEffectiveRangeForAttendance(periodRange);
    const periodAttendance = ids && ids.size && periodEffective
      ? capAttendanceRateForIds(ids, periodEffective)
      : { rate: null, work: 0, scheduled: 0, leave: 0, absent: 0, unmarked: 0 };
    const approvals = capApprovalTilesForPeriod(periodEffective);
    const shipped = ws === 'qc' ? capQcShippedQtyOf(ws, key, mode) : null;
    const deptLabel = ws === 'qc' ? 'QC' : ws === 'x1' ? 'Xưởng 1' : 'Xưởng 2';
    // Tỷ lệ đi làm trong kỳ THEO NGƯỜI: người đã đi làm / tổng lao động bộ phận
    const presentPeople = capDistinctWorkPeople(ids, periodEffective);
    const workforceTotal = workforce == null ? 0 : Number(workforce) || 0;
    const presentRate = periodAttendance.rate != null ? periodAttendance.rate : null;
    // SỬA LỖI "LUÔN 100%": Hôm nay = người đi làm hôm nay / TỔNG lao động xưởng
    // (không chia cho số người có lịch hôm nay); Cả kỳ = công đi làm /
    // (tổng lao động × số ngày có hoạt động) = công nếu đi làm đủ.
    const workedToday = ws === 'qc'
      ? (todayAttendance.work || 0)
      : capWorkedPeopleOnDate(ws, capTodayLocalISO());
    const denomToday = ws === 'qc'
      ? (todayAttendance.scheduled > 0 ? todayAttendance.scheduled : workforceTotal)
      : workforceTotal;
    const activeDays = ws === 'qc' ? 0 : capWorkshopActiveDays(ws, periodEffective);
    const fullCong = workforceTotal > 0 && activeDays > 0 ? workforceTotal * activeDays : 0;
    const caKyHtml = fullCong > 0
      ? `${periodAttendance.work || 0}/${fullCong}`
      : (periodAttendance.scheduled > 0 ? `${periodAttendance.work}/${periodAttendance.scheduled}` : '—');
    const todayHtml = denomToday > 0 ? `${workedToday}/${denomToday}` : '—';
    const approvalTile = (label, t) => `<div class="cap-att-approval ${t.state}" title="${escapeHTML(label)} trong kỳ · tổng ${t.total} đơn">
        <span>${escapeHTML(label)}</span>
        <strong>${t.pending > 0 ? t.pending : (t.total > 0 ? '✓' : '—')}</strong>
        <small>${t.pending > 0 ? 'đơn chờ duyệt' : (t.total > 0 ? 'đã xử lý hết' : 'không có đơn trong kỳ')}</small>
        <small class="cap-att-counts">duyệt ${t.approved} · chờ ${t.pending} · từ chối ${t.rejected}</small>
      </div>`;
    return `<section class="cap-summary-card cap-labor-card cap-labor-kpi-card" aria-label="Lao động và chấm công">
      <div class="cap-card-title"><i data-lucide="users"></i><strong>Lao động / chấm công</strong></div>
      <div class="cap-labor-grid">
        <div class="cap-labor-mini" title="Số lao động đang hoạt động của bộ phận (danh sách Nhân sự, không phụ thuộc phân công)">
          <span>Tổng lao động trong kỳ</span>
          <strong>${workforceTotal > 0 ? workforceTotal + ' người' : '—'}</strong>
          <small>${escapeHTML(deptLabel)} · đang hoạt động</small>
        </div>
        <div class="cap-labor-mini is-rate" title="Tỷ lệ đi làm trong kỳ theo NGƯỜI — ai từng đi làm ít nhất 1 ngày được tính 1 lần">
          <span>Tỷ lệ đi làm trong kỳ</span>
          <strong>${presentRate == null ? '—' : fmtNum1(presentRate) + '%'}</strong>
          <small>Bình quân tỷ lệ đi làm theo ngày · ${escapeHTML(deptLabel)}</small>
        </div>
        <div class="cap-labor-mini" title="Số người đi làm hôm nay / tổng lao động của xưởng">
          <span>Hôm nay</span>
          <strong>${todayHtml}</strong>
          <small>người đi làm / lao động ${escapeHTML(deptLabel)}</small>
        </div>
        <div class="cap-labor-mini" title="Tổng công đã đi làm / tổng công nếu tất cả đi làm đủ các ngày có hoạt động trong kỳ">
          <span>Cả kỳ</span>
          <strong>${caKyHtml}</strong>
          <small>công đi làm / công nếu đi làm đủ</small>
        </div>
      </div>
      <div class="cap-labor-approvals">
        ${approvalTile('Nghỉ phép', approvals.leave)}
        ${approvalTile('Tăng ca', approvals.overtime)}
      </div>
    </section>`;
  }

  function capLaborChartCard(ws, w, key, mode) {
    return `<section class="cap-summary-card cap-labor-card cap-labor-chart-card" aria-label="Xu hướng lực lượng &amp; đi làm">
      <div class="cap-card-title"><i data-lucide="activity"></i><strong>Xu hướng lực lượng &amp; đi làm</strong></div>
      <div class="cap-labor-charts">
        <div class="cap-labor-chart-half">
          <span class="cap-labor-half-title">Lực lượng lao động (người)</span>
          <div class="cap-summary-chart"><canvas id="cap-labor-wf-chart" role="img" aria-label="Biểu đồ lực lượng lao động 8 kỳ gần nhất"></canvas></div>
        </div>
        <div class="cap-labor-chart-half">
          <span class="cap-labor-half-title">Tỷ lệ đi làm (%)</span>
          <div class="cap-summary-chart"><canvas id="cap-labor-att-chart" role="img" aria-label="Biểu đồ tỷ lệ đi làm 8 kỳ gần nhất"></canvas></div>
        </div>
      </div>
    </section>`;
  }

  function capDashboardCardsHtml(ws, w) {
    const mode = capModeOf();
    const efficiency = ws === 'qc'
      ? capQcEfficiencyCard(w.weekKey, mode)
      : capNormalEfficiencyCard(w, ws);
    const hoursW = ws === 'qc' ? capQcHoursValues(w.weekKey, mode) : w;
    const hours = capHoursCard(hoursW, ws);
    const laborKpi = capLaborKpiCard(ws, w, w.weekKey, mode);
    const laborChart = capLaborChartCard(ws, w, w.weekKey, mode);
    // BỎ CHART "8 tuần gần nhất" (11/2026 — không dùng): dải trực quan chỉ còn
    // 4 thẻ xếp 2 hàng; chế độ Bảng vẫn giữ chart combo trong tầng 2.
    return `<div class="cap-dashboard-grid">
      <div class="cap-dash-row cap-dash-row-top">${efficiency}${hours}</div>
      <div class="cap-dash-row cap-dash-row-bottom">${laborKpi}${laborChart}</div>
    </div>`;
  }

  function destroyCapacitySummaryCharts() {
    if (state.capacityHoursInstance) {
      try { state.capacityHoursInstance.destroy(); } catch (e) { /* bỏ qua */ }
      state.capacityHoursInstance = null;
    }
    if (state.capacityLaborWfInstance) {
      try { state.capacityLaborWfInstance.destroy(); } catch (e) { /* bỏ qua */ }
      state.capacityLaborWfInstance = null;
    }
    if (state.capacityLaborInstance) {
      try { state.capacityLaborInstance.destroy(); } catch (e) { /* bỏ qua */ }
      state.capacityLaborInstance = null;
    }
  }
  function renderCapacitySummaryCharts(ws, w) {
    destroyCapacitySummaryCharts();
    if (!window.Chart) return;
    const mode = capModeOf();
    const recentKeys = capRecentPeriodKeys(w.weekKey, mode, 8);
    const hoursAllRows = recentKeys.map(k => ws === 'qc'
      ? capQcHoursValues(k, mode)
      : capWorkshopPeriodRowFromMap(ws, k, capPeriodAggregates(ws, mode), mode));
    const filtered = recentKeys.map((k, i) => ({
      key: k,
      row: hoursAllRows[i]
    })).filter(x => (Number(x.row.hc) > 0 || Number(x.row.tc) > 0));
    // Khóa kỳ dùng chung cho cả hai chart; khai báo trước mọi chart/options
    // để tooltip không phụ thuộc biến cục bộ hay biến đã khai báo ở nơi khác.
    const hoursKeys = filtered.map(x => x.key);
    const labels = hoursKeys.map(k => capPeriodShortLabel(k, mode));
    const capVerticalHoverPlugin = {
      id: 'capVerticalHover',
      afterDraw(chart) {
        const active = chart.getActiveElements && chart.getActiveElements();
        if (!active || !active.length) return;
        const point = active[0].element;
        if (!point || !Number.isFinite(point.x)) return;
        const area = chart.chartArea;
        if (!area) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.38)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(point.x, area.top);
        ctx.lineTo(point.x, area.bottom);
        ctx.stroke();
        ctx.restore();
      }
    };
    let compactChart = false;
    try {
      compactChart = window.matchMedia
        ? window.matchMedia('(max-width: 639.98px)').matches
        : (typeof window.innerWidth === 'number' && window.innerWidth <= 639.98);
    } catch (e) { compactChart = typeof window.innerWidth === 'number' && window.innerWidth <= 639.98; }
    const chartLegendFontSize = compactChart ? 9 : 11;
    const chartLegendBoxSize = compactChart ? 8 : 10;
    const chartAxisFontSize = compactChart ? 10 : 11;
    const chartMaxTicks = compactChart ? 4 : 8;
    const fmtChartExact = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 6 });
    const hoursRows = filtered.map(x => x.row);
    const hoursCanvas = document.getElementById('cap-hours-chart');
    if (hoursCanvas) {
      state.capacityHoursInstance = new window.Chart(hoursCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'HC', data: hoursRows.map(r => r.hc ? Math.round(r.hc * 100) / 100 : null), borderColor: '#0f766e', backgroundColor: 'rgba(15,118,110,0.10)', borderWidth: 2, pointRadius: 3, tension: 0.32, yAxisID: 'y' },
            { label: 'TC', data: hoursRows.map(r => r.tc ? Math.round(r.tc * 100) / 100 : null), borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.10)', borderWidth: 2, pointRadius: 3, tension: 0.32, yAxisID: 'y' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          devicePixelRatio: Math.max(1, window.devicePixelRatio || 1),
          layout: { padding: { top: 14, right: 8, bottom: 2, left: 2 } },
          interaction: { intersect: false, mode: 'index' },
          scales: {
            x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: chartMaxTicks, font: { size: chartAxisFontSize } } },
            y: { beginAtZero: true, position: 'left', ticks: { maxTicksLimit: chartMaxTicks, font: { size: chartAxisFontSize }, callback: v => v + 'h' } },
          },
          plugins: {
            bambooDataLabels: false,
            legend: { display: true, labels: { boxWidth: chartLegendBoxSize, boxHeight: chartLegendBoxSize, padding: compactChart ? 6 : 10, font: { size: chartLegendFontSize } } },
            datalabels: { display: false },
            tooltip: {
              intersect: false,
              mode: 'index',
              callbacks: {
                title: items => items && items[0] ? capPeriodLabel(hoursKeys[items[0].dataIndex], mode) : '',
                label: ctx => ctx.datasetIndex === 0
                  ? ` Giờ HC: ${fmtChartExact(ctx.parsed.y)}h`
                  : ` Giờ TC: ${fmtChartExact(ctx.parsed.y)}h`
              }
            }
          }
        },
        plugins: [capVerticalHoverPlugin]
      });
    }
    const laborRows = hoursKeys.map(k => {
      const idsK = ws === 'qc'
        ? capQcEmployeeIds(capQcRecordsForPeriod(k, mode))
        : capActiveEmployeeIdsForWorkshop(ws, capPeriodRangeOf(k, mode));
      const attK = ws === 'qc'
        ? (idsK && idsK.size ? capAttendanceRateForIds(idsK, capPeriodRangeOf(k, mode)) : { rate: null, work: 0, scheduled: 0 })
        : capAttendanceRateOf(ws, k, mode);
      return {
        workforce: capWorkshopWorkforceOf(ws, k, mode),
        attendance: attK.rate,
        present: attK.work || 0,
        scheduled: attK.scheduled || 0
      };
    });
    // NỬA 1: Lực lượng lao động (người) — cột nhạt + đường
    const laborWfCanvas = document.getElementById('cap-labor-wf-chart');
    if (laborWfCanvas) {
      state.capacityLaborWfInstance = new window.Chart(laborWfCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: hoursKeys.map(k => capPeriodShortLabel(k, mode)),
          datasets: [{ label: 'Lực lượng (người)', data: laborRows.map(r => r.workforce), borderColor: '#0f766e', backgroundColor: 'rgba(15,118,110,0.12)', borderWidth: 2, pointRadius: 3, tension: 0.32, fill: true }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          devicePixelRatio: Math.max(1, window.devicePixelRatio || 1),
          layout: { padding: { top: 16, right: 8, bottom: 2, left: 2 } },
          interaction: { intersect: false, mode: 'index' },
          scales: {
            x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: chartMaxTicks, font: { size: chartAxisFontSize } } },
            y: { beginAtZero: true, position: 'left', ticks: { maxTicksLimit: chartMaxTicks, font: { size: chartAxisFontSize }, callback: v => (Number(v) || 0).toLocaleString('vi-VN') } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              intersect: false, mode: 'index',
              callbacks: {
                title: items => items && items[0] ? capPeriodLabel(hoursKeys[items[0].dataIndex], mode) : '',
                label: ctx => ` Lực lượng: ${fmtChartExact(ctx.parsed.y)} người`
              }
            }
          }
        },
        plugins: [capVerticalHoverPlugin]
      });
    }
    // NỬA 2: Tỷ lệ đi làm (%)
    const laborAttCanvas = document.getElementById('cap-labor-att-chart');
    if (laborAttCanvas) {
      state.capacityLaborInstance = new window.Chart(laborAttCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: hoursKeys.map(k => capPeriodShortLabel(k, mode)),
          datasets: [{ label: 'Đi làm (%)', data: laborRows.map(r => r.attendance), borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.08)', borderWidth: 2, pointRadius: 3, tension: 0.32, fill: true }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          devicePixelRatio: Math.max(1, window.devicePixelRatio || 1),
          layout: { padding: { top: 18, right: 8, bottom: 2, left: 2 } },
          interaction: { intersect: false, mode: 'index' },
          scales: {
            x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: chartMaxTicks, font: { size: chartAxisFontSize } } },
            y: {
              beginAtZero: false,
              min: 0,
              max: 100,
              position: 'left',
              ticks: { stepSize: 20, maxTicksLimit: 6, font: { size: chartAxisFontSize }, callback: v => v + '%' },
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              intersect: false, mode: 'index',
              callbacks: {
                title: items => items && items[0] ? capPeriodLabel(hoursKeys[items[0].dataIndex], mode) : '',
                label: ctx => {
                  const r = laborRows[ctx.dataIndex] || {};
                  return ` Đi làm: ${r.present}/${r.scheduled} · ${fmtChartExact(ctx.parsed.y)}%`;
                }
              }
            }
          }
        },
        plugins: [capVerticalHoverPlugin]
      });
    }
  }

  // ─── DẢI TRỰC QUAN (chế độ "Biểu đồ") ─────────────────────────
  // 3 khối: GAUGE hiệu suất xưởng · THANG XẾP HẠNG công đoạn ·
  // BIỂU ĐỒ Chart.js của công đoạn đang chọn.
  // (BẢN ĐỒ NHIỆT 8 kỳ × công đoạn ĐÃ GỠ 21/10/2026 — xem khối cảnh báo quá hạn.)
  // Số liệu lấy THẲNG từ capWorkshopWeekRow/capStageWeekRow — không tính lại.
  // Màu theo quy tắc 12: ≥100 xanh lá #16a34a · 70–99 hổ phách #d97706 ·
  // <70 cam #ea580c · chưa có dữ liệu xám #94a3b8.

  // Đường cung SVG của đồng hồ: bắt đầu góc 150° (dưới-trái), quét theo chiều
  // kim đồng hồ (trục Y của SVG hướng xuống nên góc tăng = quét qua đỉnh) —
  // thang 0–150% trải trên 240°; mốc 100% nằm ở góc 150° + 240×100/150 = 310°.
  const CAP_GAUGE_CX = 66, CAP_GAUGE_CY = 66, CAP_GAUGE_R = 52;
  function capGaugePoint(deg, r) {
    const rad = deg * Math.PI / 180;
    return { x: CAP_GAUGE_CX + r * Math.cos(rad), y: CAP_GAUGE_CY + r * Math.sin(rad) };
  }
  function capGaugeArc(sweepDeg, r) {
    const s = capGaugePoint(150, r);
    const e = capGaugePoint(150 + sweepDeg, r);
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }
  function capEffColorOf(eff) {
    if (eff == null) return '#94a3b8';
    return eff >= 100 ? '#16a34a' : eff >= 70 ? '#d97706' : '#ea580c';
  }
  // ① ĐỒNG HỒ HIỆU SUẤT XƯỞNG (kỳ đang chọn)
  function capGaugeHtml(w) {
    const mode = capModeOf();
    const eff = w.eff;
    const v = eff == null ? 0 : Math.max(0, Math.min(150, eff));
    const color = capEffColorOf(eff);
    const tickA = 150 + 240 * 100 / 150;
    const t1 = capGaugePoint(tickA, 44), t2 = capGaugePoint(tickA, 60);
    const mark = capGaugePoint(tickA, 72);
    const valPath = v > 0.5
      ? `<path d="${capGaugeArc(240 * v / 150, CAP_GAUGE_R)}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"></path>`
      : '';
    return `
      <div class="cap-gauge" title="${escapeHTML('Hiệu suất xưởng ' + capPeriodHeadLabel(w.weekKey, mode) + ' — bình quân gia quyền theo giờ của các công đoạn có hiệu suất')}">
        <svg class="cap-gauge-svg" viewBox="0 0 132 132" role="img" aria-label="Đồng hồ Hiệu suất">
          <path d="${capGaugeArc(240, CAP_GAUGE_R)}" fill="none" stroke="rgba(100,116,139,0.18)" stroke-width="10" stroke-linecap="round"></path>
          ${valPath}
          <line x1="${t1.x.toFixed(2)}" y1="${t1.y.toFixed(2)}" x2="${t2.x.toFixed(2)}" y2="${t2.y.toFixed(2)}" class="cap-gauge-tick"></line>
          <text x="${mark.x.toFixed(1)}" y="${(mark.y + 3).toFixed(1)}" class="cap-gauge-mark">100%</text>
          <text x="${CAP_GAUGE_CX}" y="${CAP_GAUGE_CY - 2}" class="cap-gauge-val" fill="${color}">${eff == null ? '—' : fmtNum1(eff) + '%'}</text>
          <text x="${CAP_GAUGE_CX}" y="${CAP_GAUGE_CY + 18}" class="cap-gauge-label">Hiệu suất</text>
        </svg>
        <div class="cap-gauge-chips">
          <span class="cap-chip" title="Số công đoạn đạt ≥100% định mức / số công đoạn tính được hiệu suất"><i data-lucide="circle-check"></i> Đạt: <strong>${w.effCount ? `${w.passCount}/${w.effCount}` : '—'}</strong></span>
          ${w.bottleneck
            ? `<span class="cap-chip cap-chip-warn" title="Công đoạn có hiệu suất thấp nhất kỳ này — nên kiểm tra trước"><i data-lucide="alert-triangle"></i> Nút thắt: <strong>${escapeHTML(w.bottleneck.st.label)}</strong> ${fmtNum1(w.bottleneck.row.eff)}%</span>`
            : `<span class="cap-chip cap-chip-info" title="Chưa có công đoạn nào tính được hiệu suất (thiếu giờ làm hoặc chưa khai định mức)"><i data-lucide="info"></i> Chưa tính được hiệu suất</span>`}
        </div>
      </div>`;
  }
  // ② THANG XẾP HẠNG CÔNG ĐOẠN (kỳ đang chọn) — bấm 1 hàng để xem biểu đồ 8 kỳ
  function capRankTip(st, r) {
    const chartTxt = capModeOf() === 'month' ? 'biểu đồ 8 tháng' : 'biểu đồ 8 tuần';
    const dmTxt = capModeOf() === 'month' ? 'ĐM tháng' : 'ĐM tuần';
    if (r.turns === 0) return `${st.label}: chưa có lượt nào trong kỳ — bấm để xem ${chartTxt}`;
    if (r.eff == null) return `${st.label}: có ${r.turns} lượt nhưng chưa khai định mức tháng — bấm để xem ${chartTxt}`;
    // THAN HÓA + SẤY: hiệu suất = Σ giờ cần ÷ Σ (giờ thực theo CA − sự cố) — KHÔNG
    // có "định mức công suất" nên tuyệt đối không in "÷ ĐM 0 m³/h" (lỗi cũ).
    if (st.kind === 'time') {
      return `${st.label}: Hiệu suất ${fmtNum1(r.eff)}% = Giờ cần ÷ (Giờ thực − Sự cố), tính RIÊNG TỪNG CA (gộp Sấy 1 + Sấy 2, không chia công đoạn) — bấm để xem ${chartTxt}`;
    }
    return `${st.label}: Hiệu suất ${fmtNum1(r.eff)}% = ${fmtNum2(r.cap)} ${st.unit} ÷ ${dmTxt} ${fmtNum2(r.rate)} ${st.unit} — bấm để xem ${chartTxt}`;
  }
  function capRankHtml(w) {
    const staleMap = new Map((capStaleNow || []).map(r => [r.stageId, r]));
    const withData = w.parts.filter(p => p.row.turns > 0)
      .sort((a, b) => ((b.row.eff == null ? -1 : b.row.eff) - (a.row.eff == null ? -1 : a.row.eff)));
    const noData = w.parts.filter(p => p.row.turns === 0);
    const rows = [...withData, ...noData].map(p => {
      const st = p.st, r = p.row;
      const eff = r.eff;
      const cls = eff == null ? 'cap-rank-none' : eff >= 100 ? 'cap-rank-good' : eff >= 70 ? 'cap-rank-mid' : 'cap-rank-low';
      const pctW = eff == null ? 0 : (Math.max(0, Math.min(150, eff)) / 150) * 100;
      // Công đoạn QUÁ HẠN cập nhật → chip nhắc ngay trên hàng xếp hạng
      const stale = staleMap.get(st.id);
      const staleChip = (stale && stale.status === 'late')
        ? ` <em class="cap-rank-stale" title="${escapeHTML(`Số liệu cập nhật cuối ${formatDateDDMMYY(stale.lastDate)} — đã ${stale.workDays} ngày làm việc chưa cập nhật`)}"><i data-lucide="triangle-alert" aria-hidden="true"></i> cuối ${escapeHTML(formatDateDDMMYY(stale.lastDate))}</em>`
        : '';
      return `
        <button type="button" class="cap-rank-row ${cls}${state.capUi.chartStage === st.id ? ' cap-rank-active' : ''}" data-cap-rank="${st.id}" title="${escapeHTML(capRankTip(st, r))}">
          <span class="cap-rank-name">${escapeHTML(st.label)}${staleChip}</span>
          <span class="cap-rank-track"><span class="cap-rank-bar" style="width:${pctW.toFixed(1)}%;"></span><span class="cap-rank-mark"></span></span>
          <span class="cap-rank-val">${eff != null ? fmtNum1(eff) + '%' : '—'}</span>
        </button>`;
    }).join('');
    return `
      <div class="cap-rank">
        <div class="cap-rank-title"><i data-lucide="list-ordered"></i> Xếp hạng công đoạn — ${escapeHTML(capPeriodHeadLabel(w.weekKey, capModeOf()))}</div>
        <div class="cap-rank-list">${rows}</div>
      </div>`;
  }
  // ─── ③ CẢNH BÁO DỮ LIỆU QUÁ HẠN (21/10/2026 — thay BẢN ĐỒ NHIỆT đã gỡ) ──
  // QUY TẮC (chốt với người dùng): đếm NGÀY LÀM VIỆC trôi qua kể từ NGÀY CẬP
  // NHẬT CUỐI của từng công đoạn; QUÁ 1 ngày làm việc (tức >= 2) mới cảnh báo
  // (hôm nay chưa nhập / mới 1 ngày → không báo, tránh phiền buổi sáng).
  //   • Ngày nghỉ = Chủ nhật + restDays của Lịch Làm Việc tháng (state.hrWorkCalendar),
  //     trừ workDays (ngày làm bù) → KHÔNG tính là quá hạn.
  //   • Công đoạn CHƯA TỪNG có bản ghi → status 'never' (xám trong panel, KHÔNG đỏ).
  //   • "Hôm nay" lấy theo GIỜ MÁY (capISOOfLocal) — KHÔNG dùng toISOString (UTC)
  //     vì sáng sớm VN sẽ bị lùi 1 ngày.
  // Khối hàm chi tiết: capStaleScan → capStaleHtml → renderCapStale → toggleCapStale
  const CAP_STALE_DAYS = 1;
  // Kết quả quét cảnh báo của LƯỢT VẼ HIỆN TẠI — thang xếp hạng dùng lại để gắn
  // chip "⚠ cuối dd/mm" cho công đoạn quá hạn (không quét lại lần 2).
  let capStaleNow = null;
  function capTodayLocalISO() { return capISOOfLocal(new Date()); }
  // Cấu hình Lịch Làm Việc của tháng — đọc trực tiếp state (KHÔNG import hr.js
  // để tránh vòng import); mặc định không khai = nghỉ Chủ nhật.
  function capCalCfgOf(monthKey) {
    const cal = state.hrWorkCalendar || {};
    const cfg = cal[monthKey];
    return (cfg && typeof cfg === 'object') ? cfg : null;
  }
  function capIsWorkDay(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false;
    const cfg = capCalCfgOf(String(iso).slice(0, 7));
    if (cfg && Array.isArray(cfg.restDays) && cfg.restDays.includes(iso)) return false;
    if (cfg && Array.isArray(cfg.workDays) && cfg.workDays.includes(iso)) return true; // ngày làm bù
    const off = (cfg && Array.isArray(cfg.weekdaysOff)) ? cfg.weekdaysOff : [0];
    let dow = -1;
    try { dow = new Date(iso + 'T00:00:00').getDay(); } catch (e) { dow = -1; }
    return !(dow >= 0 && off.includes(dow));
  }
  // Số NGÀY LÀM VIỆC trong khoảng (fromISO, toISO] — KHÔNG tính chính ngày from
  function capWorkDaysSince(fromISO, toISO) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromISO || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(toISO || ''))) return 0;
    if (String(fromISO) >= String(toISO)) return 0;
    const start = new Date(String(fromISO) + 'T00:00:00');
    const end = new Date(String(toISO) + 'T00:00:00');
    let n = 0, guard = 0;
    for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      if (capIsWorkDay(capISOOfLocal(d))) n++;
      if (++guard > 4000) break; // chặn vòng lặp vô hạn khi dữ liệu rác
    }
    return n;
  }
  // Số NGÀY LỊCH trong khoảng (fromISO, toISO]
  function capCalendarDaysSince(fromISO, toISO) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromISO || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(toISO || ''))) return 0;
    const a = new Date(String(fromISO) + 'T00:00:00');
    const b = new Date(String(toISO) + 'T00:00:00');
    const n = Math.round((b - a) / 86400000);
    return n > 0 ? n : 0;
  }
  // Ngày cập nhật cuối + số lượt (toàn bộ) + số lượt TRONG KỲ đang xem.
  // Cache trong phiên render để không quét rows() nhiều lần.
  function capStageStaleInfo(st, periodKey, mode) {
    const ck = capPass ? 'stale:' + st.id + '|' + mode + '|' + (periodKey || '') : '';
    if (capPass && capPass.has(ck)) return capPass.get(ck);
    let lastDate = '', turns = 0, turnsInPeriod = 0;
    let rows = [];
    try { rows = st.rows() || []; } catch (e) { rows = []; }
    rows.forEach(r => {
      const d = String((r && r.date) || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      turns++;
      if (periodKey && capPeriodKeyOfDate(d, mode) === periodKey) turnsInPeriod++;
      if (d > lastDate) lastDate = d;
    });
    const out = { lastDate, turns, turnsInPeriod };
    if (capPass) capPass.set(ck, out);
    return out;
  }
  // Công đoạn phía sau (để câu ảnh hưởng nêu đúng hệ quả dây chuyền)
  const CAP_STALE_DOWNSTREAM = {
    boluong: 'Cắt Chọn', cut: 'Bổ Ống', boong: 'Chạy Máy Bào Thô', baotho: 'Chọn Nan Thô',
    chonnan: 'Bào Thô và Than Hóa + Sấy', say: 'Ép Ván (thiếu nan)', baotinh: 'Ép Ván',
    epvan: 'Cắt Ván · Bào Ván · QC kiểm ván', bullig_gc: 'Bullig — Chọn thanh', bullig_ct: 'xuất Bullig',
    catvan_cat: 'Xẻ thanh', catvan_xe: 'các bước sau', baovan_bao: 'Chà thùng', baovan_cha: 'QC thành phẩm',
    x1catong: 'Sấy Sinh', x1saysinh: 'Bốc', x1boc: 'Lọc Ống',
    x1locong: 'Cắt Mắt / Bổ', x1catmat: 'Bổ', x1bo: 'Lọc Thanh/Bó Xô',
    x1locthanh: 'nhập kho thành phẩm Xưởng 1'
  };
  // Quét TOÀN BỘ công đoạn của CẢ 2 XƯỞNG (không phụ thuộc xưởng đang xem) để
  // cảnh báo nêu đúng "công đoạn nào · xưởng nào".
  function capStaleScan(todayISOArg) {
    if (!state.capUi) loadCapacityUi(); // gọi lẻ (test/harness) chưa render lần nào
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(todayISOArg || '')) ? String(todayISOArg) : capTodayLocalISO();
    const mode = capModeOf();
    const periodKey = capSelectedPeriod();
    const out = CAP_STAGES.map(st => {
      const info = capStageStaleInfo(st, periodKey, mode);
      const row = {
        ws: st.ws,
        wsLabel: (CAP_WORKSHOPS.find(w => w.id === st.ws) || {}).label || st.ws,
        stageId: st.id, stageLabel: st.label, cardId: st.cardId, kind: st.kind,
        lastDate: info.lastDate, turns: info.turns, turnsInPeriod: info.turnsInPeriod,
        calDays: info.lastDate ? capCalendarDaysSince(info.lastDate, today) : 0,
        workDays: info.lastDate ? capWorkDaysSince(info.lastDate, today) : 0,
        status: 'ok'
      };
      if (!info.turns || !info.lastDate) row.status = 'never';
      else if (row.workDays > CAP_STALE_DAYS) row.status = 'late';
      return row;
    });
    // Cảnh báo trước: Xưởng 2 → Xưởng 1 · lâu nhất trước
    const order = { x2: 0, x1: 1 };
    out.sort((a, b) => (order[a.ws] - order[b.ws]) || (b.workDays - a.workDays)
      || String(a.stageLabel).localeCompare(String(b.stageLabel)));
    return out;
  }
  // Câu ẢNH HƯỞNG của từng dòng cảnh báo
  function capStaleImpactOf(row) {
    if (!row) return '';
    const base = row.kind === 'time'
      ? 'Thiếu lần than hóa ⇒ tổng giờ cần thấp, hiệu suất theo ca bị đẩy lên cao giả tạo.'
      : 'Thiếu sản lượng ⇒ công suất/hiệu suất kỳ này thấp hơn thực tế; nhập bù dồn một ngày sẽ làm công suất vọt cao.';
    const after = CAP_STALE_DOWNSTREAM[row.stageId];
    return after ? `${base} Công đoạn sau (${after}) cũng thiếu đầu vào tương ứng.` : base;
  }
  // Tóm tắt 1 dòng: "Xưởng 2: Bào Tinh (3 ngày) · Xưởng 1: Bốc (2 ngày)"
  function capStaleSummaryOf(rows) {
    return CAP_WORKSHOPS.map(w => {
      const list = (rows || []).filter(r => r.ws === w.id);
      if (!list.length) return '';
      return `${w.label}: ${list.map(r => `${r.stageLabel} (${r.workDays} ngày)`).join(', ')}`;
    }).filter(Boolean).join(' · ');
  }
  function capStaleNeverTextOf(never) {
    return CAP_WORKSHOPS.map(w => {
      const list = (never || []).filter(r => r.ws === w.id);
      if (!list.length) return '';
      return `${w.label}: ${list.map(r => r.stageLabel).join(', ')}`;
    }).filter(Boolean).join(' · ');
  }
  // HTML khối cảnh báo (banner + panel chi tiết). late = dòng quá hạn,
  // never = công đoạn chưa từng có số liệu (chỉ hiện xám trong panel).
  function capStaleHtml(late, never) {
    const list = late || [];
    if (!list.length) return '';
    const open = !!state.capUi.staleOpen;
    const rowsHtml = list.map(r => `
      <tr>
        <td><span class="cap-stale-ws">${escapeHTML(r.wsLabel)}</span></td>
        <td><strong>${escapeHTML(r.stageLabel)}</strong></td>
        <td class="text-right">${r.lastDate ? escapeHTML(formatDateDDMMYY(r.lastDate)) : '—'}</td>
        <td class="text-right"><strong>${fmtNum1(r.workDays)}</strong> ngày làm việc
          <div class="cap-stale-sub">${fmtNum1(r.calDays)} ngày lịch</div></td>
        <td class="text-right">${fmtNum1(r.turnsInPeriod || 0)}</td>
        <td class="cap-stale-impact-cell">${escapeHTML(capStaleImpactOf(r))}</td>
        <td class="text-right"><button type="button" class="btn btn-icon btn-outline cap-open-btn" data-cap-open-card="${escapeHTML(r.cardId)}" title="Mở thẻ ${escapeHTML(r.stageLabel)} để nhập bù số liệu"><i data-lucide="external-link"></i></button></td>
      </tr>`).join('');
    const neverHtml = (never && never.length)
      ? `<details class="cap-stale-never">
           <summary>Chưa từng có số liệu — ${never.length} công đoạn (có thể chưa vận hành)</summary>
           <div class="cap-stale-never-list">${escapeHTML(capStaleNeverTextOf(never))}</div>
         </details>`
      : '';
    return `
      <button type="button" class="cap-stale-head" id="cap-stale-toggle" aria-expanded="${open ? 'true' : 'false'}" aria-controls="cap-stale-panel"
              title="Cảnh báo số liệu công đoạn không được cập nhật — bấm để xem chi tiết và ảnh hưởng">
        <i data-lucide="alert-triangle"></i>
        <strong>${list.length} công đoạn chưa cập nhật quá ${CAP_STALE_DAYS} ngày làm việc</strong>
        <span class="cap-stale-sum">${escapeHTML(capStaleSummaryOf(list))}</span>
        <span class="cap-stale-more">${open ? 'Thu gọn ▴' : 'Chi tiết &amp; ảnh hưởng ▾'}</span>
      </button>
      <div class="cap-stale-panel" id="cap-stale-panel"${open ? '' : ' hidden'}>
        <div class="table-responsive table-scroll cap-stale-table-wrap">
          <table class="data-table cap-stale-table">
            <thead>
              <tr>
                <th>Xưởng</th>
                <th>Công đoạn</th>
                <th class="text-right">Ngày cập nhật cuối</th>
                <th class="text-right">Chưa cập nhật</th>
                <th class="text-right" title="Số lượt đã ghi trong kỳ đang xem">Lượt trong kỳ</th>
                <th>Ảnh hưởng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        ${neverHtml}
        ${capStaleImpactHtml()}
      </div>`;
  }
  // Khối nhắc ẢNH HƯỞNG (dùng chung — chỉ hiện trong panel chi tiết)
  function capStaleImpactHtml() {
    return `
        <div class="cap-stale-impact">
          <div class="cap-stale-impact-title"><i data-lucide="info"></i> Số liệu không cập nhật thì ảnh hưởng thế nào?</div>
          <ul>
            <li><strong>Hiệu suất xưởng tuần/tháng bị hụt hoặc sai</strong> — tử số sản lượng thiếu nhưng mẫu số giờ làm vẫn đủ; nhập bù dồn một ngày thì công suất vọt cao giả tạo.</li>
            <li><strong>Xếp hạng công đoạn và “nút thắt” chọn sai</strong> — có thể chỉ đạo nhầm công đoạn thay vì công đoạn đang tắc thật.</li>
            <li><strong>Báo cáo In · Xuất Excel · Trợ lý AI · Truy xuất đầu vào → đầu ra</strong> đều đọc số này nên kết luận không phản ánh đúng thực tế.</li>
            <li><strong>Kế hoạch sản xuất</strong> (tồn, khả năng đáp ứng, tiến độ) và <strong>chốt công – lương / đối chiếu chấm công</strong> bị lệch theo.</li>
            <li><strong>Lịch sử không dựng lại được</strong> — nhập bù muộn không khôi phục đúng ngày/giờ thực tế đã làm.</li>
          </ul>
          <div class="cap-stale-note">Ngày nghỉ (Chủ nhật + ngày nghỉ trong Lịch Làm Việc) không tính là quá hạn; ngày làm bù vẫn tính. Mốc cảnh báo: quá ${CAP_STALE_DAYS} ngày làm việc kể từ ngày cập nhật cuối.</div>
        </div>`;
  }
  // Đổ banner + chip cảnh báo vào DOM. suppress = xưởng chưa có số liệu (đã có
  // thông báo riêng) → ẩn cảnh báo để không chồng 2 thông báo.
  function renderCapStale(scan, suppress) {
    const late = (scan || []).filter(r => r.status === 'late');
    const never = (scan || []).filter(r => r.status === 'never');
    const chip = document.getElementById('cap-stale-chip');
    if (chip) {
      const showChip = !suppress && late.length > 0;
      chip.hidden = !showChip;
      chip.innerHTML = showChip
        ? `<i data-lucide="triangle-alert"></i> CĐ quá hạn: <strong>${late.length}</strong>`
        : '';
      if (showChip && typeof chip.setAttribute === 'function') {
        chip.setAttribute('aria-label', `${late.length} công đoạn quá hạn dữ liệu`);
      } else if (typeof chip.removeAttribute === 'function') {
        chip.removeAttribute('aria-label');
        chip.removeAttribute('title');
      }
    }
    const box = document.getElementById('cap-stale');
    if (!box) return;
    // Luôn giữ banner khối lớn ở trạng thái ẩn; chip vẫn là điểm truy cập
    // thông tin quá hạn, panel chi tiết không chồng lên dải trực quan mặc định.
    box.hidden = true;
    box.innerHTML = '';
  }
  // Bật/tắt panel chi tiết (nhớ theo MÁY trong state.capUi.staleOpen)
  function toggleCapStale(force) {
    loadCapacityUi();
    state.capUi.staleOpen = (force === undefined) ? !state.capUi.staleOpen : !!force;
    if (state.capUi.staleOpen && state.capUi.collapsed) state.capUi.collapsed = false; // mở rộng thẻ để thấy panel
    saveCapacityUi();
    renderCapacityCard();
    if (state.capUi.staleOpen) {
      const box = document.getElementById('cap-stale');
      if (box && typeof box.scrollIntoView === 'function') {
        try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* bỏ qua */ }
      }
    }
  }



  // ④ BIỂU ĐỒ Chart.js CỦA CÔNG ĐOẠN ĐANG CHỌN (8 kỳ: tuần/tháng theo chế độ)
  // Plugin nội bộ: vẽ VẠCH ĐỊNH MỨC 100% nét đứt trên trục Hiệu suất (y1)
  const capTargetLinePlugin = {
    id: 'capTargetLine',
    afterDraw(chart) {
      const y1 = chart.scales && chart.scales.y1;
      const area = chart.chartArea;
      if (!y1 || !area) return;
      const y = y1.getPixelForValue(100);
      if (y < area.top || y > area.bottom) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(area.left, y);
      ctx.lineTo(area.right, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(71, 85, 105, 0.9)';
      ctx.font = '600 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('ĐM 100%', area.right - 4, y - 4);
      ctx.restore();
    }
  };
  // Chuỗi 8 KỲ của 1 công đoạn (neo = kỳ đang chọn; mode 'week'|'month')
  function capStagePeriodSeries(st, anchorKey, mode, n = 8) {
    const out = [];
    let cur = anchorKey;
    for (let i = 0; i < n; i++) { out.unshift({ weekKey: cur, row: capStagePeriodRow(st, cur, mode) }); cur = capPeriodShift(cur, -1, mode); }
    return out;
  }
  // Bản TUẦN ISO (kiểm thử cũ vẫn dùng)
  function capStageWeekSeries(st, anchorWeekKey, weeks = 8) {
    return capStagePeriodSeries(st, anchorWeekKey, 'week', weeks);
  }
  // Khung panel biểu đồ (chips tiêu đề + canvas) — dùng cho CẢ 2 chế độ:
  // chế độ "Biểu đồ" đặt ở dải trực quan; chế độ "Bảng" đặt trong tầng 2.
  function capChartPanelHtml(w) {
    const mode = capModeOf();
    const st = CAP_STAGES.find(s => s.id === (state.capUi.chartStage || ''));
    if (!st) return `<div class="cap-stage-chart-panel" id="cap-stage-chart-panel" hidden></div>`;
    const row = capStagePeriodRow(st, w.weekKey, mode);
    const dmTxt = st.kind === 'cap'
      ? (row.rate != null ? `${fmtNum2(row.rate)} ${st.unit}` : 'chưa khai ĐM')
      : (row.rateText || '—');
    const tip = st.kind === 'cap'
      ? `Cột = sản lượng ${mode === 'month' ? 'tháng' : 'tuần'} (${st.unitQty}) · đường = hiệu suất % (công suất ÷ định mức ${mode === 'month' ? 'tháng' : 'tuần'}) · vạch đứt = mốc 100%`
      : `Cột = thể tích đưa vào sấy (m³) · đường = hiệu suất % (giờ cần ÷ (giờ thực − sự cố)) · vạch đứt = mốc 100%`;
    return `
      <div class="cap-stage-chart-panel" id="cap-stage-chart-panel">
        <div class="cap-chart-head" id="cap-chart-head">
          <span class="cap-chart-title" title="${escapeHTML(tip)}"><i data-lucide="line-chart"></i> <strong>${escapeHTML(st.label)}</strong> — 8 ${mode === 'month' ? 'tháng' : 'tuần'} gần nhất</span>
          <span class="cap-chart-chips">
            <span class="cap-chip cap-chip-info">${escapeHTML(capPeriodLabel(w.weekKey, mode))}</span>
            <span class="cap-chip" title="Định mức của ${mode === 'month' ? 'THÁNG đang xem' : 'tuần (bình quân theo sản lượng các tháng)'}">${mode === 'month' ? 'ĐM tháng' : 'ĐM tuần'}: <strong>${escapeHTML(dmTxt)}</strong></span>
            <button type="button" class="btn btn-outline btn-icon btn-expand-chart" onclick="app.toggleChartExpand(this)" title="Mở rộng toàn màn hình (tự xoay ngang trên điện thoại)"><i data-lucide="maximize"></i></button>
          </span>
        </div>
        <div class="cap-stage-chart-box" id="cap-stage-chart-box">
          <canvas id="cap-stage-chart"></canvas>
        </div>
      </div>`;
  }
  // Vẽ/hủy biểu đồ công đoạn — gọi SAU khi render DOM (mỗi lần chỉ 1 canvas tồn tại)
  function renderCapacityStageChart() {
    const panel = document.getElementById('cap-stage-chart-panel');
    if (!panel) {
      if (state.capacityStageInstance) {
        try { state.capacityStageInstance.destroy(); } catch (e) { /* bỏ qua */ }
        state.capacityStageInstance = null;
      }
      return;
    }
    // Hủy instance cũ TRƯỚC khi vẽ lại (mẫu state.pressChartInstance)
    if (state.capacityStageInstance) {
      try { state.capacityStageInstance.destroy(); } catch (e) { /* bỏ qua */ }
      state.capacityStageInstance = null;
    }
    const st = CAP_STAGES.find(s => s.id === (state.capUi.chartStage || ''));
    if (!st) { panel.hidden = true; return; }
    panel.hidden = false;
    const box = document.getElementById('cap-stage-chart-box');
    if (!box) return;
    if (!window.Chart) {
      // Test headless / máy thiếu vendor: hiện text thay thế, KHÔNG crash
      box.innerHTML = `<div class="cap-chart-fallback">Thư viện biểu đồ (Chart.js) chưa nạp — số liệu vẫn xem được ở chế độ <strong>Bảng dữ liệu</strong>.</div>`;
      return;
    }
    if (box.firstElementChild && box.firstElementChild.classList && box.firstElementChild.classList.contains('cap-chart-fallback')) {
      box.innerHTML = `<canvas id="cap-stage-chart"></canvas>`; // khôi phục canvas sau fallback
    }
    const canvas = document.getElementById('cap-stage-chart');
    if (!canvas) return;
    if (typeof canvas.setAttribute === 'function') {
      canvas.setAttribute('role', 'img');
      const ariaMode = capModeOf();
      canvas.setAttribute('aria-label', `${st.label}: biểu đồ ${ariaMode === 'month' ? '8 tháng gần nhất' : '8 tuần gần nhất'}, sản lượng và hiệu suất`);
    }
    const mode = capModeOf();
    const weeks8 = capStagePeriodSeries(st, capSelectedPeriod(), mode);
    const labels = weeks8.map(x => capPeriodShortLabel(x.weekKey, mode));
    const qtyData = weeks8.map(x => (x.row.qty == null ? null : Math.round(x.row.qty * 1000) / 1000));
    const effData = weeks8.map(x => (x.row.eff == null ? null : Math.round(x.row.eff * 100) / 100));
    const fxLow = typeof document !== 'undefined' && document.body && document.body.dataset && document.body.dataset.fx === 'low';
    state.capacityStageInstance = new window.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `Sản lượng (${st.unitQty})`,
            data: qtyData,
            backgroundColor: 'rgba(124, 58, 237, 0.72)',
            borderColor: '#7c3aed',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 34,
            yAxisID: 'y',
            order: 2
          },
          {
            type: 'line',
            label: 'Hiệu suất (%)',
            data: effData,
            borderColor: '#ea580c',
            backgroundColor: '#ea580c',
            borderWidth: 2.5,
            pointRadius: 3.5,
            pointHoverRadius: 5,
            tension: 0.35,
            yAxisID: 'y1',
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: fxLow ? false : { duration: 350 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { boxWidth: 12, boxHeight: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              title: (items) => {
                const i = items && items[0] ? items[0].dataIndex : 0;
                const wk = weeks8[i] ? weeks8[i].weekKey : '';
                return capPeriodLabel(wk, mode);
              },
              label: (ctx) => {
                const r = weeks8[ctx.dataIndex] ? weeks8[ctx.dataIndex].row : null;
                if (!r) return '';
                if (ctx.datasetIndex === 0) {
                  return ` Sản lượng: ${r.qty != null ? fmtNum2(r.qty) + ' ' + st.unitQty : '—'}`;
                }
                return r.eff != null
                  ? ` Hiệu suất: ${fmtNum1(r.eff)}% (${fmtNum2(r.cap)} ${st.unit} ÷ ĐM ${fmtNum2(r.rate)} ${st.unit})`
                  : ' Hiệu suất: — (chưa khai ĐM)';
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, title: { display: true, text: `Sản lượng (${st.unitQty})`, font: { size: 11 } }, ticks: { font: { size: 11 } } },
          y1: { position: 'right', min: 0, suggestedMax: 150, title: { display: true, text: 'Hiệu suất (%)', font: { size: 11 } }, grid: { drawOnChartArea: false }, ticks: { font: { size: 11 }, callback: v => v + '%' } }
        }
      },
      plugins: [capTargetLinePlugin]
    });
  }
  // Đồng bộ trạng thái active của 2 nút chuyển chế độ "Biểu đồ ⇄ Bảng dữ liệu"
  function syncCapacityViewButtons(view) {
    const btnVisual = document.getElementById('cap-view-visual');
    const btnTable = document.getElementById('cap-view-table');
    if (btnVisual) btnVisual.classList.toggle('active', view === 'visual');
    if (btnTable) btnTable.classList.toggle('active', view === 'table');
  }

  function renderCapacityCard() {
    capRenderPass(renderCapacityCardBody);
    // DOM vừa được dựng/hủy lại — chỉ sau đó mới bám canvas Chart.js.
    // Biểu đồ 8 tuần của công đoạn chỉ dùng ở chế độ BẢNG (combo trong tầng 2);
    // chế độ trực quan đã BỎ panel này nên không vẽ lại nữa.
    if ((state.capUi && state.capUi.view) === 'table') renderCapacityStageChart();
  }
  function renderCapacityCardBody() {
    const card = document.getElementById('capacity-card');
    if (!card) return;
    loadCapacityUi();
    const ws = state.capUi.ws || 'x2';
    card.setAttribute('data-cap-ws', ws);
    card.classList.toggle('cap-ws-x1', ws === 'x1');
    card.classList.toggle('cap-ws-qc', ws === 'qc');
    const labelEl = document.getElementById('capacity-mode-label');
    if (labelEl) labelEl.textContent = ws === 'x1' ? 'Xưởng 1' : ws === 'qc' ? 'QC' : 'Xưởng 2';
    document.querySelectorAll('[data-cap-workshop]').forEach(btn => {
      const active = btn.getAttribute('data-cap-workshop') === ws;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const mode = capModeOf();
    const week = capSelectedPeriod();
    const weekLabel = document.getElementById('capacity-week-label');
    if (weekLabel) weekLabel.textContent = capPeriodLabel(week, mode);
    // Đồng bộ nút TUẦN ⇄ THÁNG + ô chọn tháng (chỉ hiện ở chế độ Tháng)
    const btnModeWeek = document.getElementById('cap-mode-week');
    const btnModeMonth = document.getElementById('cap-mode-month');
    if (btnModeWeek) btnModeWeek.classList.toggle('active', mode === 'week');
    if (btnModeMonth) btnModeMonth.classList.toggle('active', mode === 'month');
    const monthInput = document.getElementById('cap-month');
    if (monthInput) {
      monthInput.hidden = mode !== 'month';
      if (mode === 'month' && /^\d{4}-\d{2}$/.test(week)) monthInput.value = week;
    }
    const body = document.getElementById('capacity-body');
    const collapsed = !!state.capUi.collapsed;
    if (body) body.hidden = collapsed;
    const togLabel = document.getElementById('cap-toggle-label');
    if (togLabel) togLabel.textContent = collapsed ? 'Mở rộng' : 'Thu gọn';
    const togIco = document.getElementById('cap-toggle-ico');
    if (togIco) togIco.setAttribute('data-lucide', collapsed ? 'chevron-down' : 'chevron-up');
    const strip = document.getElementById('cap-summary-strip');
    const tbody = document.getElementById('capacity-week-rows');
    if (!tbody) return;
    const stages = ws === 'qc' ? [] : capStagesOf(ws);
    // Xưởng đã khai CÔNG ĐOẠN nhưng CHƯA có lượt nào ghi số liệu → cũng phải
    // báo "chưa có số liệu" (không bịa số), chứ không vẽ gauge/rỗng trông như lỗi)
    const hasData = ws === 'qc'
      ? ((state.qcFinalRecords || []).length > 0 || (state.qcExports || []).length > 0)
      : capPeriodsFor(ws, mode).length > 0;
    // Chế độ xem: Xưởng chưa có công đoạn / chưa có số liệu → ép về chế độ Bảng
    // (chỉ thông báo); ngược lại theo state.capUi.view ('visual' mặc định | 'table')
    const view = ws === 'qc'
      ? (state.capUi.view === 'table' ? 'table' : 'visual')
      : ((!stages.length || !hasData || state.capUi.view === 'table') ? 'table' : 'visual');
    syncCapacityViewButtons(view);
    // CẢNH BÁO DỮ LIỆU QUÁ HẠN (quét CẢ 2 xưởng — không phụ thuộc xưởng đang xem).
    // Xưởng chưa có số liệu → suppress (đã có thông báo riêng bên dưới).
    capStaleNow = capStaleScan();
    renderCapStale(capStaleNow, !stages.length || !hasData);
    const visualRow = document.getElementById('cap-visual-row');
    const tableWrap = document.getElementById('cap-table-wrap');
    // Xưởng CHƯA có công đoạn nào, hoặc đã khai nhưng CHƯA ghi số liệu → thông báo
    if (ws !== 'qc' && (!stages.length || !hasData)) {
      const noStageYet = !stages.length;
      if (visualRow) { visualRow.hidden = true; visualRow.innerHTML = ''; }
      if (tableWrap) tableWrap.hidden = false;
      if (strip) { strip.hidden = true; strip.innerHTML = ''; }
      tbody.innerHTML = `<tr class="cap-empty-row"><td colspan="9">
        <div class="cap-empty"><i data-lucide="hard-hat"></i>
          <div><strong>Xưởng 1 — ${noStageYet ? 'Sắp có.' : 'chưa có số liệu.'}</strong> ${noStageYet
            ? 'Chưa có công đoạn nào của Xưởng 1 được ghi số liệu.<br>Khi thẻ công đoạn Xưởng 1 ra đời (tab Công Đoạn), chỉ cần thêm 1 dòng vào sổ đăng ký công đoạn (<em>CAP_STAGES</em> trong js/capacity.js) là bảng này tự có số — không phải sửa gì khác.'
            : `Đã có ${stages.length} công đoạn (${stages.map(s => escapeHTML(s.label)).join(' · ')}) nhưng chưa ghi lượt nào — nhập liệu ở tab <strong>Công Đoạn SX → Xưởng 1</strong> để bảng tổng hợp.`}</div>
        </div>
      </td></tr>`;
      initLucide();
      return;
    }
    if (ws === 'qc') {
      const qcW = capQcHoursValues(week, mode);
      const sel = { weekKey: week, eff: null, hc: qcW.hc || 0, tc: qcW.tc || 0, hours: qcW.hours || 0 };
      if (strip) { strip.hidden = true; strip.innerHTML = ''; }
      const visualRow = document.getElementById('cap-visual-row');
      const tableWrap = document.getElementById('cap-table-wrap');
      if (view === 'visual') {
        if (visualRow) { visualRow.hidden = false; visualRow.innerHTML = capDashboardCardsHtml('qc', sel); }
        if (tableWrap) tableWrap.hidden = true;
      } else {
        if (visualRow) { visualRow.hidden = true; visualRow.innerHTML = ''; destroyCapacitySummaryCharts(); }
        if (tableWrap) tableWrap.hidden = true;
      }
      tbody.innerHTML = '';
      if (view === 'visual') renderCapacitySummaryCharts('qc', sel);
      initLucide();
      return;
    }
    const byWeek = capPeriodAggregates(ws, mode);
    const sel = capWorkshopPeriodRowFromMap(ws, week, byWeek, mode);
    if (strip) { strip.hidden = true; strip.innerHTML = ''; }
    if (view === 'visual') {
      // ĐÃ BỎ chart "8 tuần gần nhất" ở dải trực quan (11/2026) — không tự
      // chọn công đoạn cho biểu đồ nữa (bấm chip công đoạn = mở thẻ công đoạn).
      if (visualRow) {
        visualRow.hidden = false;
        visualRow.innerHTML = capDashboardCardsHtml(ws, sel);
      }
      if (tableWrap) tableWrap.hidden = true;
    } else {
      // Chế độ Bảng: dọn 3 thẻ trực quan và giữ nguyên bảng 3 tầng.
      if (visualRow) { visualRow.hidden = true; visualRow.innerHTML = ''; destroyCapacitySummaryCharts(); }
      if (tableWrap) tableWrap.hidden = false;
    }
    // Danh sách kỳ tầng 1: các kỳ CÓ dữ liệu + kỳ đang chọn + kỳ hiện tại
    const keys = new Set(capPeriodsFor(ws, mode));
    keys.add(week);
    keys.add(capCurrentPeriodKey(mode));
    const weeks = [...keys].sort().reverse().slice(0, 26)
      .map(k => capWorkshopPeriodRowFromMap(ws, k, byWeek, mode));
    tbody.innerHTML = weeks.map(w => capWeekRowHtml(w) + capStageBlockHtml(w)).join('');
    if (view === 'visual') {
      renderCapacitySummaryCharts(ws, sel);
    } else {
      destroyCapacitySummaryCharts();
    }
    initLucide();
  }

  // ─── THAO TÁC UI (events.js gọi vào) ──────────────────────────
  function applyCapacityUi() {
    saveCapacityUi();
    renderCapacityCard();
  }
  function setCapacityWorkshop(ws) {
    loadCapacityUi();
    if (ws !== 'x1' && ws !== 'x2' && ws !== 'qc') return;
    if (state.capUi.ws === ws) { applyCapacityUi(); return; }
    state.capUi.ws = ws;
    state.capUi.week = '';
    state.capUi.weekOpen = '';
    state.capUi.openStage = '';
    state.capUi.chartStage = '';
    state.capUi.chartClosed = false;
    applyCapacityUi();
  }
  function toggleCapacityWorkshop() {
    loadCapacityUi();
    setCapacityWorkshop(state.capUi.ws === 'x2' ? 'x1' : 'x2');
  }
  function setCapacityWeek(weekKey) {
    loadCapacityUi();
    // Khóa kỳ phải khớp chế độ đang xem (tuần 'YYYY-Wnn' / tháng 'YYYY-MM')
    if (!capPeriodKeyValid(weekKey, capModeOf())) return;
    state.capUi.week = weekKey;
    applyCapacityUi();
  }
  // Đổi CHẾ ĐỘ kỳ xem: TUẦN ⇄ THÁNG — chọn lại kỳ mới nhất có dữ liệu,
  // đóng tầng xổ + biểu đồ (như khi đổi xưởng) để tránh khóa lệch dạng cũ
  function setCapacityMode(m) {
    loadCapacityUi();
    const next = m === 'month' ? 'month' : 'week';
    if (state.capUi.mode === next) { applyCapacityUi(); return; }
    state.capUi.mode = next;
    state.capUi.week = '';       // đổi kỳ xem → tự chọn kỳ mới nhất có dữ liệu
    state.capUi.weekOpen = '';
    state.capUi.openStage = '';
    state.capUi.chartStage = ''; // đổi chế độ → đóng biểu đồ (chọn lại khi xem)
    state.capUi.chartClosed = false;
    applyCapacityUi();
  }
  // Ô chọn THÁNG (type="month" trả 'YYYY-MM') — chỉ có hiệu lực ở chế độ Tháng
  function setCapacityMonth(monthKey) {
    loadCapacityUi();
    if (capModeOf() !== 'month') return;
    if (!capMonthKeyValid(monthKey)) return;
    state.capUi.week = monthKey;
    state.capUi.weekOpen = monthKey;
    state.capUi.openStage = '';
    applyCapacityUi();
  }
  function shiftCapacityWeek(dir) {
    loadCapacityUi();
    const mode = capModeOf();
    state.capUi.week = capPeriodShift(capSelectedPeriod(), dir, mode);
    state.capUi.weekOpen = state.capUi.week;  // điều hướng kỳ → tự xổ tầng công đoạn
    state.capUi.openStage = '';
    applyCapacityUi();
  }
  function toggleCapacityWeekOpen(weekKey) {
    loadCapacityUi();
    if (!weekKey || !capPeriodKeyValid(weekKey, capModeOf())) return;
    if (state.capUi.week !== weekKey) {
      state.capUi.week = weekKey;
      state.capUi.weekOpen = weekKey;
      state.capUi.openStage = '';
    } else {
      state.capUi.weekOpen = state.capUi.weekOpen === weekKey ? '' : weekKey;
      if (!state.capUi.weekOpen) state.capUi.openStage = '';
    }
    applyCapacityUi();
  }
  function toggleCapacityStageDays(stageId) {
    loadCapacityUi();
    if (!stageId) return;
    const opening = state.capUi.openStage !== stageId;
    state.capUi.openStage = opening ? stageId : '';
    // Mở tầng ngày ở chế độ Bảng → đồng bộ luôn biểu đồ 8 tuần của công đoạn đó;
    // đóng tầng ngày → gọn luôn biểu đồ (nếu đang là công đoạn vừa đóng)
    if (opening) state.capUi.chartStage = stageId;
    else if (state.capUi.chartStage === stageId) state.capUi.chartStage = '';
    applyCapacityUi();
  }
  function openCapacityStageDetails(stageId) {
    loadCapacityUi();
    const id = String(stageId || '').trim();
    if (!CAP_STAGES.some(s => s.id === id)) return false;
    const selected = capSelectedPeriod();
    state.capUi.week = selected;
    state.capUi.weekOpen = selected;
    state.capUi.openStage = id;
    state.capUi.chartStage = id;
    state.capUi.collapsed = false;
    state.capUi.view = 'table';
    applyCapacityUi();
    return true;
  }
  function toggleCapacityCollapse() {
    loadCapacityUi();
    state.capUi.collapsed = !state.capUi.collapsed;
    applyCapacityUi();
  }
  // Chuyển CHẾ ĐỘ xem: 'visual' (Biểu đồ — dải trực quan) ⇄ 'table' (Bảng 3 tầng)
  function setCapacityView(v) {
    loadCapacityUi();
    state.capUi.view = v === 'table' ? 'table' : 'visual';
    applyCapacityUi();
  }
  // Chọn công đoạn cho BIỂU ĐỒ (bấm hàng xếp hạng ở chế độ
  // "Biểu đồ"; bấm lần nữa vào cùng công đoạn + cùng tuần → đóng panel)
  function selectCapacityStage(stageId, weekKey) {
    loadCapacityUi();
    if (!CAP_STAGES.some(s => s.id === stageId)) return;
    const wkOk = (weekKey && capPeriodKeyValid(weekKey, capModeOf())) ? weekKey : '';
    const sameStage = state.capUi.chartStage === stageId;
    const sameWeek = !wkOk || state.capUi.week === wkOk;
    if (sameStage && sameWeek) {
      state.capUi.chartStage = '';
      state.capUi.chartClosed = true; // người dùng chủ động đóng → không tự mở lại
    } else {
      if (wkOk && state.capUi.week !== wkOk) state.capUi.week = wkOk;
      state.capUi.chartStage = stageId;
      state.capUi.chartClosed = false;
    }
    applyCapacityUi();
  }

  // ─── SPARKLINE HIỆU SUẤT 8 TUẦN trên MINI CARD (tab Công Đoạn) ─
  // SVG thuần (KHÔNG Chart.js — mỗi mini card 1 canvas sẽ nặng/giật); theo mẫu
  // sparkline SVG của mini card "Thống Kê Đi Làm" (hr.js). Mỗi nhóm = bình quân
  // gia quyền theo giờ của các công đoạn trong nhóm.
  const CAP_SPARKS = [
    { elId: 'x2-mini-spark-bo-luong', stageIds: ['boluong'] },
    { elId: 'x2-mini-spark-cut', stageIds: ['cut'] },
    { elId: 'x2-mini-spark-bo-ong', stageIds: ['boong'] },
    { elId: 'x2-mini-spark-bao-tho', stageIds: ['baotho'] },
    { elId: 'x2-mini-spark-chon-nan-tho', stageIds: ['chonnan'] },
    { elId: 'x2-mini-spark-than-hoa', stageIds: ['say'] },
    { elId: 'x2-mini-spark-bao-tinh', stageIds: ['baotinh'] },
    { elId: 'x2-mini-spark-ep-van', stageIds: ['epvan'] },
    { elId: 'x2-mini-spark-bullig', stageIds: ['bullig_gc', 'bullig_ct'] },
    // XƯỞNG 1 — 7 công đoạn thao tác (Phơi Sấy là tồn trung gian)
    { elId: 'x2-mini-spark-x1-cat-ong', stageIds: ['x1catong'] },
    { elId: 'x2-mini-spark-x1-say-sinh', stageIds: ['x1saysinh'] },
    { elId: 'x2-mini-spark-x1-boc', stageIds: ['x1boc'] },
    { elId: 'x2-mini-spark-x1-loc-ong', stageIds: ['x1locong'] },
    { elId: 'x2-mini-spark-x1-cat-mat', stageIds: ['x1catmat'] },
    { elId: 'x2-mini-spark-x1-bo', stageIds: ['x1bo'] },
    { elId: 'x2-mini-spark-x1-loc-thanh', stageIds: ['x1locthanh'] }
  ];
  function capSparkGroupWeekEff(stageIds, weekKey) {
    const rows = stageIds
      .map(id => CAP_STAGES.find(s => s.id === id))
      .filter(Boolean)
      .map(st => capStageWeekRow(st, weekKey))
      .filter(r => r.turns > 0 && r.eff != null && r.hours > 0);
    if (!rows.length) return null;
    const num = rows.reduce((s, r) => s + r.eff * r.hours, 0);
    const den = rows.reduce((s, r) => s + r.hours, 0);
    return den > 0 ? num / den : null;
  }
  // Chuỗi 8 tuần: neo = tuần MỚI NHẤT có dữ liệu của nhóm (hoặc tuần hiện tại), lùi dần.
  // TỐI ƯU 10/10/2026 (chuyển tab Công Đoạn SX bị chậm): mỗi công đoạn chỉ quét
  // MỘT LẦN + dựng dòng theo kỳ MỘT LẦN cho cả 8 tuần. Trước đây:
  //   • capWeekRowsFor('x2') quét TOÀN BỘ 11 công đoạn Xưởng 2 chỉ để tìm mốc tuần;
  //   • mỗi tuần lại capSparkGroupWeekEff → capStageWeekRow → quét lại toàn bộ;
  // → ~358 lượt quét/lần vẽ 17 sparkline (đo thật 155ms với dữ liệu mẫu,
  //   ~5 GIÂY khi dữ liệu ×10). Số liệu VẪNG NGUYÊN — cùng công thức bình
  //   quân gia quyền theo giờ (xem capSparkGroupWeekEff giữ nguyên cho test).
  function capSparkSeries(stageIds, weeks = 8) {
    const byPeriods = stageIds
      .map(id => CAP_STAGES.find(s => s.id === id))
      .filter(Boolean)
      .map(st => ({ st, byPeriod: capStageRowsByWeek(st) }));
    // Dòng của từng (công đoạn, kỳ) — tính 1 lần cho mọi kỳ có dữ liệu của nhóm
    const rowsByKey = new Map(); // weekKey → Map(stageId → row)
    byPeriods.forEach(({ st, byPeriod }) => {
      byPeriod.forEach((recs, wk) => {
        if (!rowsByKey.has(wk)) rowsByKey.set(wk, new Map());
        rowsByKey.get(wk).set(st.id, capStagePeriodRowFromRecs(st, recs, wk, 'week'));
      });
    });
    // Mốc neo = tuần MỚI NHẤT mà nhóm có dữ liệu — chuỗi 'YYYY-Wnn' sắp xếp
    // tăng dần đúng thứ tự thời gian, không cần quét cả Xưởng 2 nữa
    const newest = [...rowsByKey.keys()].sort().pop();
    const anchor = newest || capCurrentWeekKey();
    const effOf = (wk) => {
      const m = rowsByKey.get(wk);
      if (!m) return null;
      let num = 0, den = 0;
      m.forEach(r => {
        if (r.turns > 0 && r.eff != null && r.hours > 0) { num += r.eff * r.hours; den += r.hours; }
      });
      return den > 0 ? num / den : null;
    };
    const out = [];
    let cur = anchor;
    for (let i = 0; i < weeks; i++) {
      out.push({ weekKey: cur, eff: effOf(cur) });
      cur = capWeekShift(cur, -1);
    }
    return out.reverse();
  }
  function capSparkSvg(series) {
    const pts = (series || []).filter(p => p && p.eff != null);
    if (!pts.length) return `<span class="cap-spark-none" title="Chưa khai Định mức công suất của tháng nên chưa tính được hiệu suất">chưa có ĐM</span>`;
    const W = 100, H = 30;
    const yOf = v => H - 2 - (Math.max(0, Math.min(150, v)) / 150) * (H - 4);
    const step = pts.length > 1 ? (W - 4) / (pts.length - 1) : 0;
    const coords = pts.map((p, i) => `${(2 + i * step).toFixed(1)},${yOf(p.eff).toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    const color = last.eff >= 100 ? '#16a34a' : last.eff >= 70 ? '#0f766e' : '#b45309';
    const tip = `Hiệu suất 8 tuần gần nhất — tuần này ${fmtNum1(last.eff)}% · vạch ngang = mốc 100% định mức`;
    return `
      <svg class="cap-spark-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" title="${escapeHTML(tip)}">
        <line x1="0" y1="${yOf(100).toFixed(1)}" x2="${W}" y2="${yOf(100).toFixed(1)}" class="cap-spark-base"></line>
        <polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></polyline>
        <circle cx="${(2 + (pts.length - 1) * step).toFixed(1)}" cy="${yOf(last.eff).toFixed(1)}" r="2.4" fill="${color}"></circle>
      </svg>
      <span class="cap-spark-val" style="color:${color};" title="${escapeHTML(tip)}">${fmtNum1(last.eff)}%</span>`;
  }
  function renderX2MiniSparklines() { capRenderPass(renderX2MiniSparklinesBody); }
  function renderX2MiniSparklinesBody() {
    CAP_SPARKS.forEach(g => {
      const el = document.getElementById(g.elId);
      if (!el) return;
      try { el.innerHTML = capSparkSvg(capSparkSeries(g.stageIds)); } catch (e) { /* không phá thẻ launcher */ }
      try {
        const button = el.closest ? el.closest('.x2-mini-card') : null;
        if (!button) return;
        let period = button.querySelector('.x2-mini-period');
        let update = button.querySelector('.x2-mini-update');
        if (!period) {
          period = document.createElement('span');
          period.className = 'x2-mini-period';
          button.appendChild(period);
        }
        if (!update) {
          update = document.createElement('span');
          update.className = 'x2-mini-update';
          button.appendChild(update);
        }
        const mode = capModeOf();
        const key = capSelectedPeriod();
        const stageRows = g.stageIds
          .map(id => CAP_STAGES.find(s => s.id === id))
          .filter(Boolean)
          .map(st => capStagePeriodRow(st, key, mode));
        const qtyRows = stageRows.filter(r => r && r.qty != null);
        if (!qtyRows.length) {
          period.textContent = 'Kỳ: chưa có sản lượng';
          period.title = 'Chưa có số liệu sản lượng trong kỳ đang chọn';
        } else {
          let qty = 0;
          let unit = '';
          let estimated = false;
          qtyRows.forEach(r => {
            qty += Number(r.qty) || 0;
            const st = g.stageIds.map(id => CAP_STAGES.find(s => s.id === id)).find(s => s && s.id === r.stageId);
            if (st && !unit) unit = st.unitQty;
            if (r.qtyEstimated) estimated = true;
          });
          const periodLabel = mode === 'month'
            ? `Tháng ${String(key).slice(5)}/${String(key).slice(0, 4)}`
            : `Tuần ${capWeekNumOf(key)}`;
          period.textContent = `${periodLabel}: ${fmtNum2(qty)} ${unit || ''}${estimated ? ' ≈ ước tính' : ''}`;
          period.title = 'Sản lượng trong kỳ đang chọn';
        }
        let lastDate = '';
        g.stageIds.forEach(id => {
          const st = CAP_STAGES.find(s => s.id === id);
          if (!st) return;
          (st.rows() || []).forEach(r => {
            const d = String(r && r.date || '').slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (!lastDate || d > lastDate)) lastDate = d;
          });
        });
        if (lastDate) {
          update.textContent = `${lastDate.slice(8, 10)}/${lastDate.slice(5, 7)}`;
          update.title = `Cập nhật cuối ${formatDateDDMMYY(lastDate)}`;
        } else {
          update.textContent = '';
          update.title = 'Chưa có ngày cập nhật';
        }
      } catch (e) { /* không phá thẻ launcher */ }
    });
  }

  // ─── IN BÁO CÁO (#btn-cap-print) — CHỈ THÔNG TIN CHUNG CỦA TẤT CẢ BỘ PHẬN ──
  // Báo cáo in: mỗi xưởng 1 bảng công đoạn (giờ HC/TC tách riêng) + dòng TỔNG
  // xưởng; KHÔNG in gauge/thang xếp hạng/BẢN ĐỒ NHIỆT/biểu đồ 8 kỳ. Vùng in
  // #cap-print-area + body.cap-printing (@media print — khối cuối styles.css).
  // KHÔNG cộng sản lượng TỔNG (kg/thanh/m³ khác đơn vị — quy tắc dự án).
  function capPrintStageRowHtml(st, r) {
    const qtyTxt = r.qty == null ? '—' : `${fmtNum2(r.qty)} ${st.unitQty}`;
    const capTxt = r.cap != null ? `${fmtNum2(r.cap)} ${st.unit}` : '—';
    const dmTxt = st.kind === 'cap'
      ? (r.rate != null ? `${fmtNum2(r.rate)} ${st.unit}` : 'chưa khai ĐM')
      : (r.rateText || '—');
    const effTxt = r.eff == null ? '—' : `${fmtNum1(r.eff)}%`;
    return `<tr>
      <td class="txt">${escapeHTML(st.label)}</td>
      <td class="num">${r.turns || '—'}</td>
      <td class="num">${escapeHTML(qtyTxt)}</td>
      <td class="num">${r.hc > 0 ? fmtNum1(r.hc) : '—'}</td>
      <td class="num">${r.tc > 0 ? fmtNum1(r.tc) : '—'}</td>
      <td class="num">${r.hours > 0 ? fmtNum1(r.hours) : '—'}</td>
      <td class="num">${escapeHTML(capTxt)}</td>
      <td class="num">${escapeHTML(dmTxt)}</td>
      <td class="num">${escapeHTML(effTxt)}</td>
    </tr>`;
  }
  function capPrintWorkshopBlock(wsId, key, mode) {
    const meta = CAP_WORKSHOPS.find(x => x.id === wsId) || { id: wsId, label: String(wsId).toUpperCase() };
    const stages = capStagesOf(wsId);
    // Chưa khai công đoạn HOẶC đã khai nhưng CHƯA ghi lượt nào → ghi chú ngắn
    // (không in bảng rỗng trông như lỗi)
    const anyData = stages.length > 0 && capPeriodsFor(wsId, mode).length > 0;
    if (!anyData) {
      return `<div class="cap-print-ws">
        <div class="cap-print-ws-title">${escapeHTML(meta.label)}</div>
        <p class="cap-print-empty">Chưa có công đoạn nào của ${escapeHTML(meta.label)} có dữ liệu.</p>
      </div>`;
    }
    const w = capWorkshopPeriodRowFromMap(wsId, key, capPeriodAggregates(wsId, mode), mode);
    const rowsHtml = w.parts.map(p => capPrintStageRowHtml(p.st, p.row)).join('');
    const effTxt = w.eff == null ? '—' : `${fmtNum1(w.eff)}%`;
    const dmHead = mode === 'month' ? 'Định mức tháng' : 'Định mức tuần';
    return `<div class="cap-print-ws">
      <div class="cap-print-ws-title">${escapeHTML(meta.label)} — ${escapeHTML(capPeriodLabel(key, mode))}</div>
      <table class="cap-print-table">
        <thead><tr>
          <th class="txt">Công đoạn</th><th>Lượt</th><th>Sản lượng</th>
          <th>Giờ HC</th><th>Giờ TC</th><th>Tổng giờ</th>
          <th>Công suất thực</th><th>${escapeHTML(dmHead)}</th><th>Hiệu suất</th>
        </tr></thead>
        <tbody>
          ${rowsHtml}
          <tr class="cap-print-total">
            <td class="txt">TỔNG ${escapeHTML(meta.label)}</td>
            <td class="num">${w.turns || 0}</td>
            <td class="num" title="Các công đoạn khác đơn vị (kg/thanh/m³) — KHÔNG cộng gộp">—</td>
            <td class="num">${fmtNum1(w.hc)}</td>
            <td class="num">${fmtNum1(w.tc)}</td>
            <td class="num">${fmtNum1(w.hours)}</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td class="num">${escapeHTML(effTxt)}</td>
          </tr>
        </tbody>
      </table>
      <div class="cap-print-sumline">Hiệu suất ${escapeHTML(meta.label)}: ${escapeHTML(effTxt)} (bình quân gia quyền theo giờ) · Đạt ≥100%: ${w.effCount ? `${w.passCount}/${w.effCount}` : '—'} · Nút thắt: ${w.bottleneck ? `${escapeHTML(w.bottleneck.st.label)} ${fmtNum1(w.bottleneck.row.eff)}%` : '—'}</div>
    </div>`;
  }
  // HTML đầy đủ của báo cáo (dùng cho nút In + kiểm thử)
  function buildCapacityReportHtml() {
    loadCapacityUi();
    const mode = capModeOf();
    const key = capSelectedPeriod();
    const now = new Date();
    const printedAt = `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const who = state.currentUser ? (state.currentUser.displayName || state.currentUser.username || state.currentUser.email || '') : '';
    const blocks = CAP_WORKSHOPS.map(x => capPrintWorkshopBlock(x.id, key, mode)).join('');
    return `<div class="cap-print-doc">
      <div class="cap-print-head">
        <div class="cap-print-title">NHÀ MÁY NGỌC SƠN THANH HÓA</div>
        <div class="cap-print-subtitle">BÁO CÁO CÔNG SUẤT &amp; HIỆU SUẤT SẢN XUẤT — THEO ${mode === 'month' ? 'THÁNG' : 'TUẦN'}</div>
        <div class="cap-print-meta">Kỳ báo cáo: <strong>${escapeHTML(capPeriodLabel(key, mode))}</strong> · In lúc ${escapeHTML(printedAt)}${who ? ` · Người in: ${escapeHTML(who)}` : ''}</div>
      </div>
      ${blocks}
      <div class="cap-print-note">Ghi chú: Công suất thực = sản lượng ÷ giờ làm (giờ lấy tự động từ Bảng bố trí Nhân Sự — ngày nghỉ/lễ đi làm tính toàn giờ tăng ca) · Hiệu suất = công suất thực ÷ định mức kỳ (tuần vắt 2 tháng thì bình quân theo sản lượng) · Riêng Than Hóa + Sấy: hiệu suất = Σ giờ cần ÷ (Σ giờ thực − Σ giờ sự cố) · Báo cáo chỉ gồm thông tin chung của các bộ phận, không kèm biểu đồ 8 kỳ.</div>
    </div>`;
  }
  // Nút "In báo cáo": đổ HTML vào vùng in → body.cap-printing → window.print()
  function printCapacityReport() {
    loadCapacityUi();
    const area = document.getElementById('cap-print-area');
    if (!area) return;
    area.innerHTML = buildCapacityReportHtml();
    document.body.classList.add('cap-printing');
    const cleanup = () => {
      document.body.classList.remove('cap-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500); // dự phòng trình duyệt/PWA không bắn sự kiện afterprint
  }

export {
  CAP_STAGES,
  CAP_WORKSHOPS,
  CAP_SPARKS,
  // Tuần ISO
  capWeekKeyOf,
  capCurrentWeekKey,
  capWeekShift,
  capWeekNumOf,
  capWeekYearOf,
  capWeekRangeLabel,
  // Kỳ chung (TUẦN | THÁNG)
  capModeOf,
  capPeriodKeyValid,
  capMonthShift,
  capMonthHeadLabel,
  capMonthRangeLabel,
  capPeriodLabel,
  capPeriodHeadLabel,
  capPeriodShortLabel,
  capSelectedPeriod,
  capPeriodRangeOf,
  capPreviousPeriodKey,
  capWorkshopWorkforceOf,
  capAttendanceRateForIds,
  capAttendanceRateOf,
  capQcShippedQtyOf,
  capQcOverviewHtml,
  // Sổ đăng ký + tính toán (dùng cho test và mở rộng Xưởng 1)
  capStagesOf,
  capStageDayRows,
  capStageWeekRow,
  capStagePeriodRow,
  leadershipCapacitySnapshot,
  computeWorkerStageEfficiency,
  capWeekRowsFor,
  capPeriodsFor,
  capWorkshopWeekRow,
  capWorkshopPeriodRowFromMap as capWorkshopPeriodRow,
  // UI
  loadCapacityUi,
  renderCapacityCard,
  renderX2MiniSparklines,
  toggleCapacityWorkshop,
  setCapacityWorkshop,
  setCapacityWeek,
  setCapacityWeek as setCapacityPeriod,
  setCapacityMode,
  setCapacityMonth,
  shiftCapacityWeek,
  toggleCapacityWeekOpen,
  toggleCapacityStageDays,
  openCapacityStageDetails,
  toggleCapacityCollapse,
  setCapacityView,
  selectCapacityStage,
  renderCapacityStageChart,
  // CẢNH BÁO DỮ LIỆU QUÁ HẠN (21/10/2026 — thay bản đồ nhiệt đã gỡ)
  CAP_STALE_DAYS,
  capTodayLocalISO,
  capIsWorkDay,
  capWorkDaysSince,
  capCalendarDaysSince,
  capStaleScan,
  capStaleImpactOf,
  capStaleSummaryOf,
  capStaleHtml,
  capStaleImpactHtml,
  renderCapStale,
  toggleCapStale,
  // In báo cáo (thông tin chung của TẤT CẢ bộ phận)
  buildCapacityReportHtml,
  printCapacityReport,
  capTotalActiveWorkforce,
capWorkedPeopleOnDate,
capWorkshopActiveDays,
capLaborKpiCard,
  capLaborChartCard,
  capApprovalTilesForPeriod,
  capSparkSeries
};
