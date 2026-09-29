// ═══════════════════════════════════════════════════════════
// js/capacity.js — BẢNG TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT
// (thẻ #capacity-card — ĐẦU tab Tổng Quan, cho lãnh đạo nắm nhanh)
// ═══════════════════════════════════════════════════════════
// 3 TẦNG XỔ TẠI CHỖ (inline, không mở pop-up):
//   TẦNG 1 — TUẦN (cấp Xưởng) : mỗi dòng 1 tuần — số công đoạn có dữ liệu ·
//             tổng giờ · HIỆU SUẤT XƯỞNG (bình quân gia quyền theo giờ) ·
//             số công đoạn đạt ≥100% · nút thắt cổ chai (công đoạn thấp nhất).
//   TẦNG 2 — CÔNG ĐOẠN trong tuần: bấm 1 dòng tuần → xổ bảng công đoạn
//             (lượt · sản lượng · giờ HC/TC · công suất thực · định mức tuần ·
//             hiệu suất · so tuần trước) + nút "Mở thẻ công đoạn" để sang tab
//             Công Đoạn xem/sửa theo ngày.
//   TẦNG 3 — NGÀY: bấm 1 dòng công đoạn → xổ TỪNG NGÀY của tuần đó
//             (ngày · lượt · sản lượng · giờ · công suất · hiệu suất).
//
// 2 CHẾ ĐỘ XEM (nút chuyển ở đầu thẻ, nhớ theo máy — state.capUi.view):
//   • "Biểu đồ" (mặc định): GAUGE hiệu suất xưởng + THANG XẾP HẠNG công đoạn +
//     BẢN ĐỘ NHIỆT 8 tuần × công đoạn (SVG/CSS thuần) + BIỂU ĐỒ Chart.js của
//     công đoạn đang chọn (bấm hàng xếp hạng / ô bản đồ nhiệt để đổi).
//   • "Bảng dữ liệu": bảng 3 tầng như trên (chart combo cũng hiện trong tầng 2).
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
import {
  baoThoDisplay, baoTinhDisplay, boOngDisplay, bulligDisplay, chonNanDisplay, cutDisplay,
  baoThoRateOf, baoTinhRateOf, boOngRateOf, bulligRateOf, capRateOf, chonNanRateOf,
  sayChargeRows, sayRateEntryOf
} from './xuong2.js';
import { escapeHTML, formatDateDDMMYY } from './utils.js';

  // ─── ĐỊNH DẠNG SỐ ─────────────────────────────────────────────
  const fmtNum1 = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const fmtNum2 = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const fmtM3Cap = v => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 4 });

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

  // ─── SỔ ĐĂNG KÝ CÔNG ĐOẠN (thêm Xưởng 1 = thêm 1 dòng vào đây) ─
  // Mỗi dòng khai: ws (xưởng) · label · đơn vị công suất/đơn vị sản lượng ·
  // cardId (thẻ ở tab Công Đoạn để nút "Mở thẻ" nhảy đúng chỗ) · kind:
  //   'cap'  = công suất thường: sản lượng ÷ giờ ÷ định mức tháng;
  //   'time' = Than Hóa + Sấy: hiệu suất theo GIỜ CẦN ÷ (giờ thực − sự cố).
  // rows() trả MẢNG bản ghi thô đã quy về: { date, qty, qtyKnown, hours, hc, tc }
  // (hours = giờ CẢ NGÀY — chung cho mọi lượt cùng ngày; phần gộp sẽ đếm 1 lần/ngày).
  // Riêng kind 'time': thêm { need (giờ cần), incident (giờ sự cố CHIA THEO TỈ LỆ giờ cần) }.
  const CAP_STAGES = [
    {
      id: 'cut', ws: 'x2', label: 'Cắt Chọn', unit: 'kg/h', unitQty: 'kg', cardId: 'x2-cut-card', kind: 'cap',
      rows: () => (state.xuong2CutRecords || []).map(r => {
        const d = cutDisplay(r);
        return { date: d.date, qty: d.inputWeight, qtyKnown: true, hours: d.cutHours, hc: d.cutHoursHC, tc: d.cutHoursTC };
      }),
      rateOf: m => capRateOf(m)
    },
    {
      id: 'boong', ws: 'x2', label: 'Bổ Ống', unit: 'kg/h', unitQty: 'kg', cardId: 'x2-bo-ong-card', kind: 'cap',
      rows: () => (state.xuong2BoOngRecords || []).map(r => {
        const d = boOngDisplay(r);
        return { date: d.date, qty: d.inputOng, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => boOngRateOf(m)
    },
    {
      id: 'baotho', ws: 'x2', label: 'Chạy Máy Bào Thô', unit: 'thanh/h', unitQty: 'thanh', cardId: 'x2-bao-tho-card', kind: 'cap',
      rows: () => (state.xuong2BaoThoRecords || []).map(r => {
        const d = baoThoDisplay(r);
        // Chưa có số lượng tự động (chờ công đoạn Chọn Nan Thô) → qty null, qtyKnown false
        return { date: d.date, qty: d.qty, qtyKnown: d.qty != null, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => baoThoRateOf(m)
    },
    {
      id: 'chonnan', ws: 'x2', label: 'Chọn Nan Thô', unit: 'thanh/h', unitQty: 'thanh', cardId: 'x2-chon-nan-tho-card', kind: 'cap',
      rows: () => (state.xuong2ChonNanThoRecords || []).map(r => {
        const d = chonNanDisplay(r);
        // Sản lượng CHỈ tính phần CỘNG sang Bào Thô (bỏ lượt nan mua ngoài — external)
        return { date: d.date, qty: d.external ? 0 : d.quantity, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => chonNanRateOf(m)
    },
    {
      id: 'say1', ws: 'x2', label: 'Than Hóa + Sấy (Sấy 1)', unit: 'm³/h', unitQty: 'm³', cardId: 'x2-than-hoa-card', kind: 'time', sayStage: 'say1',
      rows: () => capSayDayRowsOf('say1'),
      rateTextOf: dates => capSayRateTextOf(dates, 'say1')
    },
    {
      id: 'say2', ws: 'x2', label: 'Than Hóa + Sấy (Sấy 2)', unit: 'm³/h', unitQty: 'm³', cardId: 'x2-than-hoa-card', kind: 'time', sayStage: 'say2',
      rows: () => capSayDayRowsOf('say2'),
      rateTextOf: dates => capSayRateTextOf(dates, 'say2')
    },
    {
      id: 'baotinh', ws: 'x2', label: 'Bào Tinh', unit: 'thanh/h', unitQty: 'thanh', cardId: 'x2-bao-tinh-card', kind: 'cap',
      rows: () => (state.xuong2BaoTinhRecords || []).map(r => {
        const d = baoTinhDisplay(r);
        return { date: d.date, qty: d.qtyIn, qtyKnown: true, hours: d.workHours, hc: d.workHoursHC, tc: d.workHoursTC };
      }),
      rateOf: m => baoTinhRateOf(m)
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
    }
  ];

  function capStagesOf(ws) { return CAP_STAGES.filter(s => s.ws === ws); }

  // ─── THAN HÓA + SẤY: dòng theo NGÀY của 1 công đoạn sấy ───────
  // Nguồn sayChargeRows() (đã export từ xuong2.js) — mỗi ngày trả groups theo
  // stage + giờ thật của ngày. Giờ/Sự cố CHIA cho công đoạn theo TỈ LỆ GIỜ CẦN
  // (giống cách thẻ chia giờ theo phút) → Σ 2 công đoạn vẫn đúng bằng giờ ngày.
  function capSayDayRowsOf(stageKey) {
    return (sayChargeRows() || []).map(day => {
      const g = (day.groups || []).find(x => x.stage === stageKey);
      if (!g || !g.charges || !g.charges.length) return null;
      const needDay = Number(day.need) || 0;
      const sNeed = g.charges.reduce((s, c) => s + (Number(c.need) || 0), 0);
      const w = needDay > 0 ? sNeed / needDay : 0;
      return {
        date: day.date,
        turns: g.count || g.charges.length,
        qty: Number(g.vol) || 0,
        need: sNeed,
        hours: g.charges.reduce((s, c) => s + (Number(c.hours) || 0), 0),
        hc: g.charges.reduce((s, c) => s + (Number(c.hc) || 0), 0),
        tc: g.charges.reduce((s, c) => s + (Number(c.tc) || 0), 0),
        incident: (Number(day.incident) || 0) * w
      };
    }).filter(Boolean);
  }
  // Nhãn định mức 1 lần than hóa theo các tháng có mặt: "105'/2,000m³" (phút/lần · m³/lần)
  function capSayRateTextOf(dates, stageKey) {
    const months = [...new Set((dates || []).map(d => String(d || '').slice(0, 7)).filter(Boolean))].sort();
    if (!months.length) return '';
    return months.map(m => {
      const e = sayRateEntryOf(m, stageKey);
      return `${fmtNum1(e.phut)}'/${fmtM3Cap(e.m3)}m³`;
    }).join(' · ');
  }

  // ─── GỘP DỮ LIỆU THEO TUẦN ────────────────────────────────────
  // 1 lượt quét rows() của mỗi công đoạn → Map tuần → bản ghi (tiết kiệm:
  // bảng tầng 1 vẽ ~26 tuần chỉ cần 9 lượt quét thay vì 26×9).
  function capStageRowsByWeek(st) {
    const map = new Map();
    (st.rows() || []).forEach(r => {
      if (!r || !r.date) return;
      const wk = capWeekKeyOf(r.date);
      if (!wk) return;
      if (!map.has(wk)) map.set(wk, []);
      map.get(wk).push(r);
    });
    return map;
  }
  // Dòng TUẦN của 1 công đoạn từ danh sách bản ghi thô của tuần đó.
  // Gom theo NGÀY — giờ đếm 1 LẦN/ngày (bản ghi ĐẦU của ngày mang giờ chung
  // của ngày đọc từ Bảng bố trí Nhân Sự / snapshot).
  function capStageWeekRowFromRecs(st, recs, weekKey) {
    const byDate = new Map();
    (recs || []).forEach(r => {
      if (!r || !r.date) return;
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date).push(r);
    });
    const days = [];
    byDate.forEach((list, date) => {
      const first = list[0];
      const qtyKnown = list.every(x => x.qtyKnown !== false);
      const day = {
        date,
        turns: list.length,
        qty: qtyKnown ? list.reduce((s, x) => s + (Number(x.qty) || 0), 0) : null,
        qtyKnown,
        hours: Number(first.hours) || 0,
        hc: Number(first.hc) || 0,
        tc: Number(first.tc) || 0,
        rate: st.kind === 'cap' ? st.rateOf(String(date).slice(0, 7)) : null
      };
      if (st.kind === 'time') {
        day.need = list.reduce((s, x) => s + (Number(x.need) || 0), 0);
        day.incident = list.reduce((s, x) => s + (Number(x.incident) || 0), 0);
      }
      days.push(day);
    });
    days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const turns = days.reduce((s, d) => s + d.turns, 0);
    const qtyKnown = days.every(d => d.qtyKnown !== false);
    const qty = qtyKnown ? days.reduce((s, d) => s + (d.qty || 0), 0) : null;
    const hours = days.reduce((s, d) => s + d.hours, 0);
    const hc = days.reduce((s, d) => s + d.hc, 0);
    const tc = days.reduce((s, d) => s + d.tc, 0);
    let cap = null, rate = null, eff = null, rateText = '';
    if (st.kind === 'cap') {
      cap = (qty != null && qty > 0 && hours > 0) ? qty / hours : null;
      rate = capWeekRateOf(st, days);
      eff = (cap != null && rate) ? (cap / rate) * 100 : null;
    } else {
      const need = days.reduce((s, d) => s + (d.need || 0), 0);
      const incident = days.reduce((s, d) => s + (d.incident || 0), 0);
      cap = (hours > 0 && qty != null && qty > 0) ? qty / hours : null;
      eff = (need > 0 && hours - incident > 0) ? (need / (hours - incident)) * 100 : null;
      rateText = st.rateTextOf ? st.rateTextOf(days.map(d => d.date)) : '';
    }
    return { stageId: st.id, weekKey, days, turns, qty, qtyKnown, hours, hc, tc, cap, rate, rateText, eff };
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
  // Dòng tuần của 1 công đoạn (tiện dùng ở test + sparkline)
  function capStageWeekRow(st, weekKey) {
    const recs = capStageRowsByWeek(st).get(weekKey);
    return recs ? capStageWeekRowFromRecs(st, recs, weekKey) : capEmptyStageRow(st, weekKey);
  }
  // Dòng theo NGÀY của 1 công đoạn trong tuần (tầng 3 + test)
  function capStageDayRows(st, weekKey) {
    return capStageWeekRow(st, weekKey).days;
  }
  // MẢNH DỮ LIỆU dùng chung cho tầng 1: 1 lượt quét → Map tuần → Map công đoạn
  function capWeekAggregates(ws) {
    const byWeek = new Map();
    capStagesOf(ws).forEach(st => {
      capStageRowsByWeek(st).forEach((recs, wk) => {
        if (!byWeek.has(wk)) byWeek.set(wk, new Map());
        byWeek.get(wk).set(st.id, capStageWeekRowFromRecs(st, recs, wk));
      });
    });
    return byWeek;
  }
  // Danh sách tuần CÓ dữ liệu của xưởng (mới nhất trước)
  function capWeekRowsFor(ws) {
    const set = new Set();
    capStagesOf(ws).forEach(st => capStageRowsByWeek(st).forEach((_, wk) => set.add(wk)));
    return [...set].sort().reverse();
  }
  // Dòng TUẦN cấp XƯỞNG (tầng 1) — từ Map đã quét 1 lần hoặc tự tính
  function capWorkshopWeekRowFromMap(ws, weekKey, byWeek) {
    const parts = capStagesOf(ws).map(st => {
      const w = byWeek && byWeek.get(weekKey);
      const row = (w && w.get(st.id)) || capEmptyStageRow(st, weekKey);
      return { st, row };
    });
    return capWorkshopAggregate(weekKey, parts);
  }
  function capWorkshopWeekRow(ws, weekKey) {
    return capWorkshopWeekRowFromMap(ws, weekKey, capWeekAggregates(ws));
  }
  // Hiệu suất XƯỞNG = bình quân gia quyền theo GIỀ giữa các công đoạn có hiệu suất
  function capWorkshopAggregate(weekKey, parts) {
    const withData = parts.filter(p => p.row.turns > 0);
    const withEff = withData.filter(p => p.row.eff != null && p.row.hours > 0);
    const hours = withData.reduce((s, p) => s + p.row.hours, 0);
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
      hours, eff,
      passCount, effCount: withEff.length,
      bottleneck
    };
  }

  // ─── TRẠNG THÁI UI (nhớ theo MÁY — không lên mây) ─────────────
  // { ws: 'x2'|'x1', week: 'YYYY-Wnn'|'' (rỗng = tự chọn tuần mới nhất có dữ liệu),
  //   weekOpen: tuần đang xổ tầng công đoạn, openStage: công đoạn đang xổ tầng ngày,
  //   collapsed: thu gọn thẻ }
  function loadCapacityUi() {
    let ui = null;
    try { ui = JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY_UI) || 'null'); } catch (e) { /* bỏ qua */ }
    state.capUi = Object.assign({ ws: 'x2', week: '', weekOpen: '', openStage: '', collapsed: false, view: 'visual', chartStage: '' }, (ui && typeof ui === 'object') ? ui : {});
    if (state.capUi.ws !== 'x1' && state.capUi.ws !== 'x2') state.capUi.ws = 'x2';
    if (state.capUi.week && !/^\d{4}-W\d{1,2}$/.test(String(state.capUi.week))) state.capUi.week = '';
    if (state.capUi.weekOpen && !/^\d{4}-W\d{1,2}$/.test(String(state.capUi.weekOpen))) state.capUi.weekOpen = '';
    if (typeof state.capUi.collapsed !== 'boolean') state.capUi.collapsed = false;
    // Chế độ xem chỉ được 'visual' | 'table'; công đoạn của chart phải có trong sổ đăng ký
    if (state.capUi.view !== 'table' && state.capUi.view !== 'visual') state.capUi.view = 'visual';
    if (state.capUi.chartStage && !CAP_STAGES.some(s => s.id === state.capUi.chartStage)) state.capUi.chartStage = '';
  }
  function saveCapacityUi() {
    try { localStorage.setItem(STORAGE_KEY_CAPACITY_UI, JSON.stringify(state.capUi || {})); } catch (e) { /* bỏ qua */ }
  }
  function capSelectedWeek() {
    const ws = (state.capUi && state.capUi.ws) || 'x2';
    if (state.capUi.week) return state.capUi.week;
    const weeks = capWeekRowsFor(ws);
    return weeks.length ? weeks[0] : capCurrentWeekKey();
  }

  // ─── HTML PHỤ ─────────────────────────────────────────────────
  function capEffBadgeHtml(eff, tip) {
    if (eff == null) {
      return `<span class="cap-eff cap-eff-none" title="${escapeHTML(tip || 'Chưa đủ dữ liệu (thiếu giờ làm hoặc chưa khai Định mức công suất của tháng)')}">—</span>`;
    }
    const cls = eff >= 100 ? 'cap-eff-good' : eff >= 70 ? 'cap-eff-mid' : 'cap-eff-low';
    return `<span class="cap-eff ${cls}" title="${escapeHTML(tip || '')}">${fmtNum1(eff)}%</span>`;
  }
  function capDeltaHtml(cur, prev) {
    if (cur == null || prev == null) return '<span class="cap-delta flat" title="Tuần trước chưa tính được hiệu suất để so sánh">—</span>';
    const d = cur - prev;
    if (Math.abs(d) < 0.05) return '<span class="cap-delta flat" title="Ngang bằng tuần trước">▬ 0</span>';
    return d > 0
      ? `<span class="cap-delta up" title="Cao hơn tuần trước ${fmtNum1(d)} điểm %">▲ ${fmtNum1(d)}</span>`
      : `<span class="cap-delta down" title="Thấp hơn tuần trước ${fmtNum1(-d)} điểm %">▼ ${fmtNum1(-d)}</span>`;
  }
  function capWeekRowHtml(w) {
    const sel = w.weekKey === capSelectedWeek() ? ' cap-row-active' : '';
    const open = w.weekKey === (state.capUi.weekOpen || '') ? ' cap-row-open' : '';
    const effTip = w.eff == null
      ? 'Chưa có công đoạn nào tính được hiệu suất (thiếu giờ làm hoặc chưa khai định mức)'
      : 'Hiệu suất xưởng = bình quân gia quyền theo GIỜ của các công đoạn có hiệu suất';
    const botTip = w.bottleneck ? `Công đoạn thấp nhất tuần này — nên kiểm tra trước: ${w.bottleneck.st.label}` : '';
    return `
      <tr class="cap-row${sel}${open}" data-cap-week-row="${w.weekKey}" title="Bấm để xem TỪNG CÔNG ĐOẠN của tuần này">
        <td><strong>Tuần ${capWeekNumOf(w.weekKey)}</strong><span class="cap-week-sub">${capWeekYearOf(w.weekKey)} · ${capWeekRangeLabel(w.weekKey)}</span></td>
        <td class="text-right">${w.dataCount}/${w.stagesCount}</td>
        <td class="text-right">${w.hours > 0 ? fmtNum1(w.hours) : '—'}</td>
        <td class="text-right">${capEffBadgeHtml(w.eff, effTip)}</td>
        <td class="text-right">${w.effCount ? `${w.passCount}/${w.effCount}` : '—'}</td>
        <td title="${escapeHTML(botTip)}">${w.bottleneck ? `${escapeHTML(w.bottleneck.st.label)} (${fmtNum1(w.bottleneck.row.eff)}%)` : '—'}</td>
        <td class="text-right cap-arrow"><i data-lucide="${open ? 'chevron-up' : 'chevron-down'}"></i></td>
      </tr>`;
  }
  // TẦNG 2 — bảng CÔNG ĐOẠN của tuần đang xổ (lồng vào dòng tuần)
  // Ở chế độ BẢNG DỮ LIỆU: tầng 2 mở công đoạn nào thì hiện luôn biểu đồ 8 tuần
  // của công đoạn đó (dùng chung canvas #cap-stage-chart với chế độ Biểu đồ).
  function capStageChartTrHtml(w) {
    if ((state.capUi.view || 'visual') !== 'table') return '';
    if (!state.capUi.openStage || !CAP_STAGES.some(s => s.id === state.capUi.openStage)) return '';
    return `<tr class="cap-day-tr cap-chart-tr"><td colspan="9">${capChartPanelHtml(w)}</td></tr>`;
  }
  function capStageBlockHtml(w) {
    if ((state.capUi.weekOpen || '') !== w.weekKey) return '';
    const rowsHtml = w.parts.map(p => capStageRowHtml(p, w.weekKey)).join('');
    const empty = w.dataCount === 0
      ? `<tr class="cap-day-empty"><td colspan="9">Không có lượt nào trong tuần này — bấm › (Tuần sau) hoặc chọn tuần khác ở bảng trên.</td></tr>`
      : '';
    return `
      <tr class="cap-stage-tr"><td colspan="7">
        <div class="cap-sub-wrap table-responsive">
          <table class="data-table cap-sub-table">
            <thead><tr>
              <th>Công đoạn</th>
              <th class="text-right">Lượt</th>
              <th class="text-right">Sản lượng</th>
              <th class="text-right">Giờ (HC/TC)</th>
              <th class="text-right">Công suất thực</th>
              <th class="text-right">Định mức tuần</th>
              <th class="text-right">Hiệu suất</th>
              <th class="text-right">So tuần trước</th>
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
      : `${fmtNum2(r.qty)} ${st.unitQty}`;
    const capTxt = r.cap != null ? `${fmtNum2(r.cap)} ${st.unit}` : '—';
    const rateTxt = st.kind === 'cap'
      ? (r.rate != null
        ? `${fmtNum2(r.rate)} ${st.unit}`
        : `<span class="cap-muted" title="Chưa khai Định mức công suất của tháng cho công đoạn này (thẻ công đoạn ở tab Công Đoạn)">chưa có ĐM</span>`)
      : (r.rateText
        ? `<span title="Định mức 1 lần than hóa theo tháng (phút/lần · m³/lần)">${escapeHTML(r.rateText)}</span>`
        : '—');
    const hoursTxt = r.hours > 0 ? `${fmtNum1(r.hours)} (${fmtNum1(r.hc)}/${fmtNum1(r.tc)})` : '—';
    const effTip = st.kind === 'cap'
      ? (r.eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ làm hoặc chưa khai Định mức công suất của tháng)'
        : `Hiệu suất = Công suất thực tuần (${fmtNum2(r.cap)} ${st.unit}) ÷ Định mức tuần (${fmtNum2(r.rate)} ${st.unit} — bình quân theo sản lượng các tháng)`)
      : (r.eff == null
        ? 'Chưa đủ dữ liệu (chưa có lần than hóa hoặc giờ thực tế bằng 0)'
        : 'Hiệu suất = Σ Giờ cần ÷ (Σ Giờ thực − Σ Giờ sự cố) — đúng công thức thẻ Than Hóa + Sấy');
    const prev = capStageWeekRow(st, capWeekShift(weekKey, -1));
    return `
      <tr class="cap-row${open}" data-cap-stage-row="${st.id}" title="Bấm để xổ TỪNG NGÀY của công đoạn này trong tuần">
        <td><span class="cap-stage-name">${escapeHTML(st.label)}</span><span class="cap-unit-chip">${escapeHTML(st.unit)}</span></td>
        <td class="text-right">${r.turns || '—'}</td>
        <td class="text-right">${qtyTxt}</td>
        <td class="text-right">${hoursTxt}</td>
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
      : `<tr class="cap-day-empty"><td colspan="7">Không có lượt nào trong tuần này.</td></tr>`;
    const head = st.kind === 'cap'
      ? `<tr><th>Ngày</th><th class="text-right">Lượt</th><th class="text-right">Sản lượng</th><th class="text-right">Giờ (HC/TC)</th><th class="text-right">Công suất</th><th class="text-right">Định mức tháng</th><th class="text-right">Hiệu suất</th></tr>`
      : `<tr><th>Ngày</th><th class="text-right">Lần TH</th><th class="text-right">Thể tích</th><th class="text-right">Giờ cần</th><th class="text-right">Giờ thực (HC/TC)</th><th class="text-right">Sự cố</th><th class="text-right">Hiệu suất</th></tr>`;
    return `
      <tr class="cap-day-tr"><td colspan="9">
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
      const cap = (d.qty != null && d.qty > 0 && d.hours > 0) ? d.qty / d.hours : null;
      const eff = (cap != null && d.rate) ? (cap / d.rate) * 100 : null;
      const effTip = eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ làm hoặc chưa khai Định mức công suất tháng)'
        : `Công suất ${fmtNum2(cap)} ${st.unit} ÷ Định mức tháng ${fmtNum2(d.rate)} ${st.unit}`;
      return `
        <tr class="cap-day-row">
          <td><i data-lucide="calendar-days"></i> ${dateTxt}</td>
          <td class="text-right">${d.turns}</td>
          <td class="text-right">${d.qty == null ? '—' : `${fmtNum2(d.qty)} ${st.unitQty}`}</td>
          <td class="text-right">${d.hours > 0 ? `${fmtNum1(d.hours)} (${fmtNum1(d.hc)}/${fmtNum1(d.tc)})` : '—'}</td>
          <td class="text-right">${cap != null ? `${fmtNum2(cap)} ${st.unit}` : '—'}</td>
          <td class="text-right">${d.rate != null ? `${fmtNum2(d.rate)} ${st.unit}` : '—'}</td>
          <td class="text-right">${capEffBadgeHtml(eff, effTip)}</td>
        </tr>`;
    }
    const eff = (d.need > 0 && d.hours - d.incident > 0) ? (d.need / (d.hours - d.incident)) * 100 : null;
    const effTip = eff == null
      ? 'Chưa đủ dữ liệu (chưa có lần than hóa hoặc giờ thực tế bằng 0)'
      : `Giờ cần ${fmtNum2(d.need)}h ÷ (Giờ thực ${fmtNum2(d.hours)}h − Sự cố ${fmtNum2(d.incident)}h)`;
    return `
      <tr class="cap-day-row">
        <td><i data-lucide="calendar-days"></i> ${dateTxt}</td>
        <td class="text-right">${d.turns}</td>
        <td class="text-right">${fmtM3Cap(d.qty)}</td>
        <td class="text-right">${fmtNum2(d.need)}</td>
        <td class="text-right">${d.hours > 0 ? `${fmtNum2(d.hours)} (${fmtNum1(d.hc)}/${fmtNum1(d.tc)})` : '—'}</td>
        <td class="text-right">${d.incident > 0 ? fmtNum2(d.incident) : '—'}</td>
        <td class="text-right">${capEffBadgeHtml(eff, effTip)}</td>
      </tr>`;
  }
  // Dải chip TỔNG QUAN của tuần đang chọn (trên bảng tầng 1)
  function capStripHtml(w) {
    const effTip = w.eff == null
      ? 'Chưa có công đoạn nào tính được hiệu suất (thiếu giờ làm hoặc chưa khai định mức)'
      : 'Bình quân gia quyền theo giờ của các công đoạn có hiệu suất';
    return `
      <span class="cap-chip cap-chip-info" title="Tuần đang xem"><i data-lucide="calendar-range"></i> ${escapeHTML(friendlyMaterialWeek(w.weekKey))} · ${capWeekRangeLabel(w.weekKey)}</span>
      <span class="cap-chip" title="Số công đoạn đã ghi lượt trong tuần / tổng số công đoạn của xưởng"><i data-lucide="layers"></i> <strong>${w.dataCount}/${w.stagesCount}</strong> CĐ có dữ liệu</span>
      <span class="cap-chip" title="Tổng giờ làm (HC+TC) của các công đoạn trong tuần — mỗi ngày chỉ đếm 1 lần"><i data-lucide="clock"></i> <strong>${w.hours > 0 ? fmtNum1(w.hours) : '—'}</strong> giờ</span>
      <span class="cap-chip" title="${escapeHTML(effTip)}">Hiệu suất xưởng: ${capEffBadgeHtml(w.eff, effTip)}</span>
      <span class="cap-chip" title="Số công đoạn đạt ≥100% định mức / số công đoạn tính được hiệu suất"><i data-lucide="circle-check"></i> Đạt: <strong>${w.effCount ? `${w.passCount}/${w.effCount}` : '—'}</strong></span>
      ${w.bottleneck ? `<span class="cap-chip cap-chip-warn" title="Công đoạn có hiệu suất thấp nhất tuần này — nên kiểm tra trước"><i data-lucide="alert-triangle"></i> Nút thắt: <strong>${escapeHTML(w.bottleneck.st.label)}</strong> ${fmtNum1(w.bottleneck.row.eff)}%</span>` : ''}`;
  }

  // ─── DẢI TRỰC QUAN (chế độ "Biểu đồ") ─────────────────────────
  // 4 khối: GAUGE hiệu suất xưởng · THANG XẾP HẠNG công đoạn · BẢN ĐỘ NHIỆT
  // 8 tuần × công đoạn · BIỂU ĐỒ Chart.js của công đoạn đang chọn.
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
  // ① ĐỒNG HỒ HIỆU SUẤT XƯỞNG (tuần đang chọn)
  function capGaugeHtml(w) {
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
      <div class="cap-gauge" title="${escapeHTML('Hiệu suất xưởng ' + friendlyMaterialWeek(w.weekKey) + ' — bình quân gia quyền theo giờ của các công đoạn có hiệu suất')}">
        <svg class="cap-gauge-svg" viewBox="0 0 132 132" role="img" aria-label="Đồng hồ hiệu suất xưởng">
          <path d="${capGaugeArc(240, CAP_GAUGE_R)}" fill="none" stroke="rgba(100,116,139,0.18)" stroke-width="10" stroke-linecap="round"></path>
          ${valPath}
          <line x1="${t1.x.toFixed(2)}" y1="${t1.y.toFixed(2)}" x2="${t2.x.toFixed(2)}" y2="${t2.y.toFixed(2)}" class="cap-gauge-tick"></line>
          <text x="${mark.x.toFixed(1)}" y="${(mark.y + 3).toFixed(1)}" class="cap-gauge-mark">100%</text>
          <text x="${CAP_GAUGE_CX}" y="${CAP_GAUGE_CY - 2}" class="cap-gauge-val" fill="${color}">${eff == null ? '—' : fmtNum1(eff) + '%'}</text>
          <text x="${CAP_GAUGE_CX}" y="${CAP_GAUGE_CY + 18}" class="cap-gauge-label">Hiệu suất xưởng</text>
        </svg>
        <div class="cap-gauge-chips">
          <span class="cap-chip" title="Số công đoạn đạt ≥100% định mức / số công đoạn tính được hiệu suất"><i data-lucide="circle-check"></i> Đạt: <strong>${w.effCount ? `${w.passCount}/${w.effCount}` : '—'}</strong></span>
          ${w.bottleneck
            ? `<span class="cap-chip cap-chip-warn" title="Công đoạn có hiệu suất thấp nhất tuần này — nên kiểm tra trước"><i data-lucide="alert-triangle"></i> Nút thắt: <strong>${escapeHTML(w.bottleneck.st.label)}</strong> ${fmtNum1(w.bottleneck.row.eff)}%</span>`
            : `<span class="cap-chip cap-chip-info" title="Chưa có công đoạn nào tính được hiệu suất (thiếu giờ làm hoặc chưa khai định mức)"><i data-lucide="info"></i> Chưa tính được hiệu suất</span>`}
        </div>
      </div>`;
  }
  // ② THANG XẾP HẠNG CÔNG ĐOẠN (tuần đang chọn) — bấm 1 hàng để xem biểu đồ 8 tuần
  function capRankTip(st, r) {
    if (r.turns === 0) return `${st.label}: chưa có lượt nào trong tuần — bấm để xem biểu đồ 8 tuần`;
    if (r.eff == null) return `${st.label}: có ${r.turns} lượt nhưng chưa khai định mức tháng — bấm để xem biểu đồ 8 tuần`;
    return `${st.label}: Hiệu suất ${fmtNum1(r.eff)}% = ${fmtNum2(r.cap)} ${st.unit} ÷ ĐM tuần ${fmtNum2(r.rate)} ${st.unit} — bấm để xem biểu đồ 8 tuần`;
  }
  function capRankHtml(w) {
    const withData = w.parts.filter(p => p.row.turns > 0)
      .sort((a, b) => ((b.row.eff == null ? -1 : b.row.eff) - (a.row.eff == null ? -1 : a.row.eff)));
    const noData = w.parts.filter(p => p.row.turns === 0);
    const rows = [...withData, ...noData].map(p => {
      const st = p.st, r = p.row;
      const eff = r.eff;
      const cls = eff == null ? 'cap-rank-none' : eff >= 100 ? 'cap-rank-good' : eff >= 70 ? 'cap-rank-mid' : 'cap-rank-low';
      const isBt = w.bottleneck && w.bottleneck.st.id === st.id;
      const pctW = eff == null ? 0 : (Math.max(0, Math.min(150, eff)) / 150) * 100;
      return `
        <button type="button" class="cap-rank-row ${cls}${state.capUi.chartStage === st.id ? ' cap-rank-active' : ''}" data-cap-rank="${st.id}" title="${escapeHTML(capRankTip(st, r))}">
          <span class="cap-rank-name">${escapeHTML(st.label)}${isBt ? ' <em class="cap-rank-bt">⚠ nút thắt</em>' : ''}</span>
          <span class="cap-rank-track"><span class="cap-rank-bar" style="width:${pctW.toFixed(1)}%;"></span><span class="cap-rank-mark"></span></span>
          <span class="cap-rank-val">${eff != null ? fmtNum1(eff) + '%' : '—'}</span>
        </button>`;
    }).join('');
    return `
      <div class="cap-rank">
        <div class="cap-rank-title"><i data-lucide="list-ordered"></i> Xếp hạng công đoạn — ${escapeHTML(friendlyMaterialWeek(w.weekKey))}</div>
        <div class="cap-rank-list">${rows}</div>
      </div>`;
  }
  // ③ BẢN ĐỒ NHIỆT: 8 TUẦN × CÔNG ĐOẠN — bấm ô = chọn tuần + công đoạn để vẽ biểu đồ
  function capHeatTip(st, row, wk) {
    const base = `${st.label} · ${friendlyMaterialWeek(wk)} (${capWeekRangeLabel(wk)})`;
    if (row.eff == null) {
      return row.turns > 0
        ? `${base}: có ${row.turns} lượt nhưng chưa khai định mức tháng — bấm để chọn`
        : `${base}: chưa có dữ liệu — bấm để chọn tuần này`;
    }
    return `${base}: Hiệu suất ${fmtNum1(row.eff)}% (${fmtNum2(row.cap)} ${st.unit} ÷ ĐM ${fmtNum2(row.rate)} ${st.unit})`;
  }
  function capHeatHtml(w) {
    // 8 cột tuần: tuần ĐANG CHỌN là cột phải nhất (viền đậm)
    const weeks = [];
    let cur = w.weekKey;
    for (let i = 0; i < 8; i++) { weeks.unshift(cur); cur = capWeekShift(cur, -1); }
    const stages = capStagesOf(state.capUi.ws || 'x2');
    const head = `<div class="cap-heat-corner">Công đoạn</div>` + weeks.map(wk =>
      `<button type="button" class="cap-heat-col${wk === w.weekKey ? ' cap-heat-col-active' : ''}" data-cap-heat-week="${wk}" title="Chỉ đổi tuần đang xem sang ${escapeHTML(friendlyMaterialWeek(wk))}">T${capWeekNumOf(wk)}</button>`).join('');
    const rows = stages.map(st => {
      const cells = weeks.map(wk => {
        const row = capStageWeekRow(st, wk);
        const eff = row.eff;
        const cls = eff == null ? 'cap-heat-none' : eff >= 100 ? 'cap-heat-good' : eff >= 70 ? 'cap-heat-mid' : 'cap-heat-low';
        const active = state.capUi.chartStage === st.id && wk === w.weekKey;
        return `<button type="button" class="cap-heat-cell ${cls}${active ? ' cap-heat-active' : ''}" data-cap-heat="${st.id}" data-cap-heat-week="${wk}" title="${escapeHTML(capHeatTip(st, row, wk))}">${eff == null ? '·' : Math.round(eff)}</button>`;
      }).join('');
      return `<div class="cap-heat-rowname" title="${escapeHTML(st.label + ' · ' + st.unit)}">${escapeHTML(st.label)}</div>${cells}`;
    }).join('');
    return `
      <div class="cap-heat">
        <div class="cap-heat-title"><i data-lucide="grid-3x3"></i> Bản đồ nhiệt hiệu suất — 8 tuần gần nhất (bấm ô để xem biểu đồ công đoạn)</div>
        <div class="cap-heat-grid" id="cap-heat-grid">${head}${rows}</div>
        <div class="cap-heat-legend">
          <span class="cap-legend-item"><i style="background:#94a3b8;"></i> chưa có ĐM / chưa có dữ liệu</span>
          <span class="cap-legend-item"><i style="background:#ea580c;"></i> dưới 70%</span>
          <span class="cap-legend-item"><i style="background:#d97706;"></i> 70 – 99%</span>
          <span class="cap-legend-item"><i style="background:#16a34a;"></i> đạt ≥ 100%</span>
        </div>
      </div>`;
  }
  // ④ BIỂU ĐỒ Chart.js CỦA CÔNG ĐOẠN ĐANG CHỌN (8 tuần)
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
  // Chuỗi 8 tuần của 1 công đoạn (neo = tuần đang chọn)
  function capStageWeekSeries(st, anchorWeekKey, weeks = 8) {
    const out = [];
    let cur = anchorWeekKey;
    for (let i = 0; i < weeks; i++) { out.unshift({ weekKey: cur, row: capStageWeekRow(st, cur) }); cur = capWeekShift(cur, -1); }
    return out;
  }
  // Khung panel biểu đồ (chips tiêu đề + canvas) — dùng cho CẢ 2 chế độ:
  // chế độ "Biểu đồ" đặt ở dải trực quan; chế độ "Bảng" đặt trong tầng 2.
  function capChartPanelHtml(w) {
    const st = CAP_STAGES.find(s => s.id === (state.capUi.chartStage || ''));
    if (!st) return `<div class="cap-stage-chart-panel" id="cap-stage-chart-panel" hidden></div>`;
    const row = capStageWeekRow(st, w.weekKey);
    const dmTxt = st.kind === 'cap'
      ? (row.rate != null ? `${fmtNum2(row.rate)} ${st.unit}` : 'chưa khai ĐM')
      : (row.rateText || '—');
    const tip = st.kind === 'cap'
      ? `Cột = sản lượng tuần (${st.unitQty}) · đường = hiệu suất % (công suất ÷ định mức tuần) · vạch đứt = mốc 100%`
      : `Cột = thể tích đưa vào sấy (m³) · đường = hiệu suất % (giờ cần ÷ (giờ thực − sự cố)) · vạch đứt = mốc 100%`;
    return `
      <div class="cap-stage-chart-panel" id="cap-stage-chart-panel">
        <div class="cap-chart-head" id="cap-chart-head">
          <span class="cap-chart-title" title="${escapeHTML(tip)}"><i data-lucide="line-chart"></i> <strong>${escapeHTML(st.label)}</strong> — 8 tuần gần nhất</span>
          <span class="cap-chart-chips">
            <span class="cap-chip cap-chip-info">${escapeHTML(friendlyMaterialWeek(w.weekKey))} · ${capWeekRangeLabel(w.weekKey)}</span>
            <span class="cap-chip" title="Định mức của tuần (bình quân theo sản lượng các tháng)">ĐM tuần: <strong>${escapeHTML(dmTxt)}</strong></span>
            <button type="button" class="btn btn-outline btn-icon btn-expand-chart" onclick="app.toggleChartExpand(this)" title="Mở rộng toàn màn hình (tự xoay ngang trên điện thoại)"><i data-lucide="maximize"></i></button>
          </span>
        </div>
        <div class="cap-stage-chart-box" id="cap-stage-chart-box">
          <canvas id="cap-stage-chart"></canvas>
        </div>
      </div>`;
  }
  // Vẽ/hủy biểu đồ công đoạn — gọi SAU khi render DOM (mỗi lần chỉ 1 canvas tồn tại)
  // ─── KÉO NGANG BẢN ĐỒ NHIỆT (chuột + cảm ứng) ─────────────────
  // .cap-heat-grid có overflow-x: auto nhưng chuột desktop không kéo được bằng
  // tay — thêm Pointer Events kéo scrollLeft. Qua ngưỡng 6px mới coi là KÉO
  // (phân biệt chạm/kéo — như mẫu FAB AI); sau lần kéo có NUỐT click tiếp theo
  // để không bấm nhầm vào ô nhiệt khi chỉ định kéo.
  let capHeatDragArmed = false;
  function capAttachHeatDrag() {
    const grid = document.getElementById('cap-heat-grid');
    if (!grid || grid.dataset.capDragBound === '1') return;
    grid.dataset.capDragBound = '1';
    let downX = 0, downY = 0, startLeft = 0, dragging = false, moved = false;
    grid.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      capHeatDragArmed = false; // lần chạm mới không kèm kéo → click vẫn hoạt động
      downX = e.clientX; downY = e.clientY; startLeft = grid.scrollLeft;
      dragging = true; moved = false;
    });
    grid.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (!moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        moved = true;
        grid.classList.add('cap-heat-dragging');
      }
      if (moved) {
        grid.scrollLeft = startLeft - dx;
        try { e.preventDefault(); } catch (err) { /* bỏ qua */ }
      }
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      grid.classList.remove('cap-heat-dragging');
      if (moved) {
        // Nuốt click ngay sau lần kéo (không bấm nhầm ô nhiệt / tiêu đề cột)
        capHeatDragArmed = true;
        grid.addEventListener('click', (ev) => {
          if (capHeatDragArmed) { ev.stopPropagation(); ev.preventDefault(); capHeatDragArmed = false; }
        }, { once: true, capture: true });
      }
    };
    grid.addEventListener('pointerup', endDrag);
    grid.addEventListener('pointercancel', endDrag);
    grid.addEventListener('pointerleave', endDrag);
  }
  function renderCapacityStageChart() {
    const panel = document.getElementById('cap-stage-chart-panel');
    if (!panel) return;
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
    const weeks8 = capStageWeekSeries(st, capSelectedWeek());
    const labels = weeks8.map(x => `T${capWeekNumOf(x.weekKey)}`);
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
                return `${friendlyMaterialWeek(wk)} · ${capWeekRangeLabel(wk)}`;
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
    const card = document.getElementById('capacity-card');
    if (!card) return;
    loadCapacityUi();
    const ws = state.capUi.ws || 'x2';
    card.setAttribute('data-cap-ws', ws);
    card.classList.toggle('cap-ws-x1', ws === 'x1');
    const labelEl = document.getElementById('capacity-mode-label');
    if (labelEl) labelEl.textContent = ws === 'x1' ? 'Xưởng 1' : 'Xưởng 2';
    const modeBtn = document.getElementById('capacity-mode-toggle');
    if (modeBtn) modeBtn.setAttribute('aria-pressed', ws === 'x1' ? 'true' : 'false');
    const week = capSelectedWeek();
    const weekLabel = document.getElementById('capacity-week-label');
    if (weekLabel) weekLabel.textContent = `${friendlyMaterialWeek(week)} · ${capWeekRangeLabel(week)}`;
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
    const stages = capStagesOf(ws);
    // Chế độ xem: Xưởng CHƯA có công đoạn nào → ép về chế độ Bảng (chỉ thông báo);
    // ngược lại theo state.capUi.view ('visual' mặc định | 'table')
    const view = (!stages.length || state.capUi.view === 'table') ? 'table' : 'visual';
    syncCapacityViewButtons(view);
    const visualRow = document.getElementById('cap-visual-row');
    const tableWrap = document.getElementById('cap-table-wrap');
    // Xưởng CHƯA có công đoạn nào có dữ liệu (Xưởng 1 hiện tại) → thông báo, KHÔNG bịa số
    if (!stages.length) {
      if (visualRow) { visualRow.hidden = true; visualRow.innerHTML = ''; }
      if (tableWrap) tableWrap.hidden = false;
      if (strip) {
        strip.innerHTML = `<span class="cap-chip cap-chip-info"><i data-lucide="hard-hat"></i> Xưởng 1 chưa có công đoạn nào có dữ liệu — khi Xưởng 1 có thẻ công đoạn (tab Công Đoạn), bảng tự tổng hợp.</span>`;
      }
      tbody.innerHTML = `<tr class="cap-empty-row"><td colspan="7">
        <div class="cap-empty"><i data-lucide="hard-hat"></i>
          <div><strong>Xưởng 1 — Sắp có.</strong> Chưa có công đoạn nào của Xưởng 1 được ghi số liệu.<br>
          Khi thẻ công đoạn Xưởng 1 ra đời (tab Công Đoạn), chỉ cần thêm 1 dòng vào sổ đăng ký công đoạn
          (<em>CAP_STAGES</em> trong js/capacity.js) là bảng này tự có số — không phải sửa gì khác.</div>
        </div>
      </td></tr>`;
      initLucide();
      return;
    }
    const byWeek = capWeekAggregates(ws);
    const sel = capWorkshopWeekRowFromMap(ws, week, byWeek);
    if (strip) strip.innerHTML = capStripHtml(sel);
    if (view === 'visual') {
      // Mặc định chọn NÚT THẮT của tuần (không có thì công đoạn đầu có dữ liệu)
      // — chỉ chọn TỰ ĐỘNG 1 lần; người dùng bấm đóng rồi thì không tự mở lại
      if (!state.capUi.chartStage && !state.capUi.chartClosed) {
        const cand = sel.bottleneck ? sel.bottleneck.st.id : (sel.withData.length ? sel.withData[0].st.id : '');
        if (cand) { state.capUi.chartStage = cand; saveCapacityUi(); }
      }
      if (visualRow) {
        visualRow.hidden = false;
        visualRow.innerHTML = capGaugeHtml(sel) + capRankHtml(sel) + capHeatHtml(sel) + capChartPanelHtml(sel);
        capAttachHeatDrag(); // KÉO NGANG bản đồ nhiệt (chuột + cảm ứng)
      }
      if (tableWrap) tableWrap.hidden = true;
    } else {
      // Chế độ Bảng: DỌN dải trực quan (tránh 2 canvas #cap-stage-chart cùng lúc)
      if (visualRow) { visualRow.hidden = true; visualRow.innerHTML = ''; }
      if (tableWrap) tableWrap.hidden = false;
    }
    // Danh sách tuần tầng 1: các tuần CÓ dữ liệu + tuần đang chọn + tuần hiện tại
    const keys = new Set(capWeekRowsFor(ws));
    keys.add(week);
    keys.add(capCurrentWeekKey());
    const weeks = [...keys].sort().reverse().slice(0, 26)
      .map(k => capWorkshopWeekRowFromMap(ws, k, byWeek));
    tbody.innerHTML = weeks.map(w => capWeekRowHtml(w) + capStageBlockHtml(w)).join('');
    // Vẽ biểu đồ công đoạn SAU CÙNG (canvas phải có sẵn trong DOM trước)
    renderCapacityStageChart();
    initLucide();
  }

  // ─── THAO TÁC UI (events.js gọi vào) ──────────────────────────
  function applyCapacityUi() { saveCapacityUi(); renderCapacityCard(); }
  function toggleCapacityWorkshop() {
    loadCapacityUi();
    state.capUi.ws = state.capUi.ws === 'x2' ? 'x1' : 'x2';
    state.capUi.week = '';      // đổi xưởng → tự chọn tuần mới nhất có dữ liệu của xưởng đó
    state.capUi.weekOpen = '';
    state.capUi.openStage = '';
    state.capUi.chartStage = '';   // đổi xưởng → đóng biểu đồ (chọn lại khi xem)
    state.capUi.chartClosed = false;
    applyCapacityUi();
  }
  function setCapacityWeek(weekKey) {
    loadCapacityUi();
    if (!/^\d{4}-W\d{1,2}$/.test(String(weekKey || ''))) return;
    state.capUi.week = weekKey;
    applyCapacityUi();
  }
  function shiftCapacityWeek(dir) {
    loadCapacityUi();
    state.capUi.week = capWeekShift(capSelectedWeek(), dir);
    state.capUi.weekOpen = state.capUi.week;  // điều hướng tuần → tự xổ tầng công đoạn
    state.capUi.openStage = '';
    applyCapacityUi();
  }
  function toggleCapacityWeekOpen(weekKey) {
    loadCapacityUi();
    if (!weekKey) return;
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
  // Chọn công đoạn cho BIỂU ĐỒ (bấm hàng xếp hạng / ô bản đồ nhiệt ở chế độ
  // "Biểu đồ"; bấm lần nữa vào cùng công đoạn + cùng tuần → đóng panel)
  function selectCapacityStage(stageId, weekKey) {
    loadCapacityUi();
    if (!CAP_STAGES.some(s => s.id === stageId)) return;
    const wkOk = (weekKey && /^\d{4}-W\d{1,2}$/.test(weekKey)) ? weekKey : '';
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
    { elId: 'x2-mini-spark-cut', stageIds: ['cut'] },
    { elId: 'x2-mini-spark-bo-ong', stageIds: ['boong'] },
    { elId: 'x2-mini-spark-bao-tho', stageIds: ['baotho'] },
    { elId: 'x2-mini-spark-chon-nan-tho', stageIds: ['chonnan'] },
    { elId: 'x2-mini-spark-than-hoa', stageIds: ['say1', 'say2'] },
    { elId: 'x2-mini-spark-bao-tinh', stageIds: ['baotinh'] },
    { elId: 'x2-mini-spark-ep-van', stageIds: ['epvan'] },
    { elId: 'x2-mini-spark-bullig', stageIds: ['bullig_gc', 'bullig_ct'] }
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
  // Chuỗi 8 tuần: neo = tuần MỚI NHẤT có dữ liệu của nhóm (hoặc tuần hiện tại), lùi dần
  function capSparkSeries(stageIds, weeks = 8) {
    let anchor = capCurrentWeekKey();
    const stageMap = new Map(stageIds.map(id => {
      const st = CAP_STAGES.find(s => s.id === id);
      return [id, st ? capStageRowsByWeek(st) : null];
    }));
    capWeekRowsFor('x2').some(wk => {
      const has = stageIds.some(id => {
        const m = stageMap.get(id);
        return m && m.has(wk);
      });
      if (has) { anchor = wk; return true; }
      return false;
    });
    const out = [];
    let cur = anchor;
    for (let i = 0; i < weeks; i++) {
      out.push({ weekKey: cur, eff: capSparkGroupWeekEff(stageIds, cur) });
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
  function renderX2MiniSparklines() {
    CAP_SPARKS.forEach(g => {
      const el = document.getElementById(g.elId);
      if (!el) return;
      try { el.innerHTML = capSparkSvg(capSparkSeries(g.stageIds)); } catch (e) { /* không phá thẻ launcher */ }
    });
  }

export {
  CAP_STAGES,
  CAP_SPARKS,
  // Tuần ISO
  capWeekKeyOf,
  capCurrentWeekKey,
  capWeekShift,
  capWeekNumOf,
  capWeekYearOf,
  capWeekRangeLabel,
  // Sổ đăng ký + tính toán (dùng cho test và mở rộng Xưởng 1)
  capStagesOf,
  capStageDayRows,
  capStageWeekRow,
  capWeekRowsFor,
  capWorkshopWeekRow,
  // UI
  loadCapacityUi,
  renderCapacityCard,
  renderX2MiniSparklines,
  toggleCapacityWorkshop,
  setCapacityWeek,
  shiftCapacityWeek,
  toggleCapacityWeekOpen,
  toggleCapacityStageDays,
  toggleCapacityCollapse,
  setCapacityView,
  selectCapacityStage,
  capSparkSeries
};
