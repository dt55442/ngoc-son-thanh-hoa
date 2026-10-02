// ═══════════════════════════════════════════════════════════
// js/qc-final.js — THẺ "KIỂM SAU SẢN XUẤT" (tab QC — qc-final-card)
// ═══════════════════════════════════════════════════════════
// QC kiểm THÀNH PHẨM sau Ép Ván trước khi xuất xưởng, ghi theo NGÀY + VỊ TRÍ
// (Xưởng 1 / Xưởng 2). Mỗi lượt kiểm nhập:
//   • ĐẦU VÀO KIỂM  — Xưởng 2: CHỌN thành phẩm từ danh sách Ép Ván của CẶP
//     2 TUẦN xuất hàng (tuần lẻ + tuần kế — giống nút "2 tuần" của biểu đồ
//     "Kế Hoạch vs Đã Ép": kiểm tuần 39 hay tuần 40 đều lấy cặp 39–40) → tự
//     điền tổng số lượng (sửa được); Xưởng 1: "Sắp có" (nhập tay số lượng).
//   • SỐ LƯỢNG ĐẠT · NGOẠI LỆ · LOẠI (số lượng bị LOẠI = lỗi).
// Công thức bảng dữ liệu (đã chốt với người dùng):
//   Tổng số lượng kiểm = Đạt + Ngoại lệ + Loại
//   Tổng đạt           = Đạt + Ngoại lệ
//   Tỉ lệ lỗi          = Loại ÷ Tổng số lượng kiểm
//   Công suất (tấm/h)  = Tổng số lượng kiểm ÷ giờ kiểm (từ Bảng bố trí Nhân Sự,
//                        vị trí bộ phận QC có tên chứa "kiểm" — "QC Kiểm ván+thanh")
//   Hiệu suất          = Công suất ÷ Định mức kiểm của tháng (tấm/h) — có định
//                        mức mới hiện (chức năng làm trước, số điền sau).
// Bảng dữ liệu = THẺ NGÀY (giống các thẻ công đoạn Xưởng 2): đầu thẻ chung +
// bảng lượt kiểm trong thẻ. Người kiểm + giờ HC/TC TỰ ĐỘNG từ Nhân Sự, có lưu
// SNAPSHOT cùng lượt phòng khi bố trí bị xóa.
// Dữ liệu: state.qcFinalRecords + state.qcFinalRates — localStorage + file + mây.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { hrSplitHoursHCDate } from './hr.js';
import { pressRecordWeek } from './press.js';
import { STORAGE_KEY_QC_FINAL, STORAGE_KEY_QC_FINAL_RATE, state } from './state.js';
import { trackDeleted } from './tombstone.js';
import { escapeHTML, formatDateDDMMYY, getISOWeekString, showToast } from './utils.js';

  // ─── HẰNG SỐ ─────────────────────────────────────────────────
  const QC_FINAL_WORKSHOPS = {
    x1: { label: 'Xưởng 1', soon: true },  // Đầu vào kiểm Xưởng 1 — sắp bổ sung
    x2: { label: 'Xưởng 2', soon: false }
  };
  // 2 LOẠI KIỂM: Kiểm Thanh (nan — đơn vị THANH) · Kiểm Ván (thành phẩm Ép Ván —
  // đơn vị TẤM). Định mức cũng tách riêng 2 loại: { thanh: thanh/h, van: tấm/h }.
  const QC_FINAL_KINDS = {
    thanh: { label: 'Kiểm Thanh', unit: 'thanh' },
    van:   { label: 'Kiểm Ván',   unit: 'tấm' }
  };
  const qcFinalKindOf = k => (QC_FINAL_KINDS[String(k || 'van')] ? String(k || 'van') : 'van');
  const qcFinalUnitOf = k => QC_FINAL_KINDS[qcFinalKindOf(k)].unit;

  // ─── TIỆN ÍCH CHUNG ──────────────────────────────────────────
  function qcFinalTodayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }
  const qcFinalFmt = (v, d = 0) => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: d });
  // Năm của 1 ngày ISO ('2026-09-30' → 2026; sai định dạng → năm hiện tại)
  function qcFinalYearOf(dateStr) {
    const y = parseInt(String(dateStr || '').split('-')[0], 10);
    return isNaN(y) ? new Date().getFullYear() : y;
  }
  // Số tuần ISO của 1 ngày (getISOWeekString trả "Tuần N")
  function qcFinalWeekNumOf(dateISO) {
    const m = getISOWeekString(dateISO).match(/Tuần\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : 0;
  }
  // So khớp mềm tên vị trí (bỏ dấu, lowercase) — giống các thẻ công đoạn Xưởng 2
  function qcFinalNormName(name) {
    return String(name || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  // Vị trí KIỂM của QC: tên chứa "kiểm" ("QC Kiểm ván+thanh", "Kiểm chất"...)
  function isQcFinalPos(name) {
    return qcFinalNormName(name).includes('kiem');
  }
  // ═══ PHẦN 1 ═══

  // ─── NGƯỜI KIỂM + GIỜ KIỂM — TỰ ĐỘNG từ tab Nhân Sự ──────────
  // Nguồn: Bảng bố trí vị trí theo ngày (hrAssignments) tại vị trí có tên chứa
  // "kiem". Trả về MẢNG (1 ngày có thể nhiều người/ca):
  // [{ employeeId, name, positionName, shiftIdx, start, end }]
  // Ưu tiên bộ phận QC; ngày đó không có bố trí QC nào khớp thì nới ra mọi bộ
  // phận có vị trí tên chứa cả "kiem" lẫn "qc" (VD "QC Kiểm ván+thanh" khai
  // nhầm bộ phận khác vẫn ra người kiểm).
  function hrQcFinalAssignmentsOf(dateVal) {
    if (!dateVal) return [];
    const posNameOf = id => {
      const p = (state.hrPositions || []).find(x => x.id === id);
      return String((p && p.name) || '').trim();
    };
    const emplOf = id => (state.hrEmployees || []).find(x => x.id === id) || null;
    const rows = (state.hrAssignments || [])
      .filter(a => a.date === dateVal && isQcFinalPos(posNameOf(a.positionId)))
      .map(a => {
        const e = emplOf(a.employeeId);
        return {
          employeeId: a.employeeId || '',
          name: String((e && e.name) || a.employeeId || '').trim(),
          positionName: posNameOf(a.positionId),
          department: String(a.department || '').trim(),
          shiftIdx: Number(a.shiftIdx) || 0,
          start: String(a.start || '').trim(),
          end: String(a.end || '').trim(),
          time: qcFinalTimeStr(a) // "07:00–11:30" · "07:00 → hết ca" (giờ ra trống)
        };
      });
    const strict = rows.filter(r => r.department === 'QC');
    if (strict.length) return strict.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const loose = rows.filter(r => qcFinalNormName(r.positionName).includes('qc'));
    return loose.sort((a, b) => String(a.start).localeCompare(String(b.start)));
  }
  // Tổng GIỜ KIỂM tách HC/TC (hrSplitHoursHCDate trả PHÚT → chia 60; ngày nghỉ/lễ
  // đi làm → toàn TC; giờ ra TRỐNG = làm đến HẾT CA)
  function sumQcFinalHoursSplit(list, dateVal) {
    let hc = 0, tc = 0;
    (list || []).forEach(a => {
      if (!a.start) return;
      const r = hrSplitHoursHCDate(a.department || 'QC', dateVal, a.start, a.end, a.shiftIdx || 0);
      hc += r.hc || 0; tc += r.tc || 0;
    });
    return { hc: hc / 60, tc: tc / 60 }; // giờ
  }
  const qcFinalTimeStr = a => (a.end ? `${a.start}–${a.end}` : `${a.start} → hết ca`);
  // Snapshot NGƯỜI KIỂM + GIỜ lúc lưu lượt (phòng khi bố trí Nhân Sự bị xóa)
  function hrQcFinalSnapshot(dateVal) {
    const list = hrQcFinalAssignmentsOf(dateVal);
    const split = sumQcFinalHoursSplit(list, dateVal);
    return {
      workers: list.map(a => ({ name: a.name, time: qcFinalTimeStr(a) })),
      workerNames: list.map(a => a.name).filter(Boolean).join(', '),
      workTime: list.map(qcFinalTimeStr).filter(Boolean).join(', '),
      workHours: split.hc + split.tc,
      workHoursHC: split.hc,
      workHoursTC: split.tc
    };
  }
  // ═══ PHẦN 2 ═══

  // ─── CẶP 2 TUẦN XUẤT HÀNG (giống nút "2 tuần" — Kế Hoạch vs Đã Ép) ──
  // Tuần LẺ = ĐẦU cặp: 39 → [39, 40] · Tuần CHẴN lùi về tuần lẻ trước: 40 → [39, 40]
  // Tuần 53 lẻ không có tuần 54 → tính riêng [53].
  function qcFinalPairWeeks(dateISO) {
    const wk = qcFinalWeekNumOf(dateISO);
    if (!wk) return { start: 0, end: null };
    const start = wk % 2 === 1 ? wk : wk - 1;
    const end = start >= 53 ? null : start + 1;
    return { start, end };
  }
  function qcFinalPairLabel(dateISO) {
    const p = qcFinalPairWeeks(dateISO);
    if (!p.start) return '';
    return p.end ? `Tuần ${p.start}–${p.end}` : `Tuần ${p.start}`;
  }
  // Khóa CẶP TUẦN của 1 ngày ('2026-39-40' · tuần 53 → '2026-53') — lưu CÙNG lượt
  // kiểm để tính "ĐÃ KIỂM" đúng cặp (1 cặp có thể kiểm nhiều ngày mới hết số).
  function qcFinalPairKeyOf(dateISO) {
    const p = qcFinalPairWeeks(dateISO);
    if (!p.start) return '';
    return `${qcFinalYearOf(dateISO)}-${p.start}${p.end ? `-${p.end}` : ''}`;
  }
  // Tồn KIỂM theo thành phẩm của cặp 2 tuần: TỔNG Ép Ván − ĐÃ KIỂM (Σ Đầu vào
  // kiểm của các lượt cùng sản phẩm + cùng cặp tuần) = CÒN LẠI.
  // Dữ liệu kiểm cũ KHÔNG có pairKey → suy lại từ ngày kiểm.
  function qcFinalProductStocks(dateISO) {
    const key = qcFinalPairKeyOf(dateISO);
    const rows = qcFinalProducts2Weeks(dateISO).map(p => ({
      productId: p.productId, name: p.name, total: p.qty, used: 0
    }));
    if (!key) return rows.map(r => Object.assign(r, { remain: r.total }));
    const byKey = new Map(rows.map(r => [r.productId || `name:${r.name}`, r]));
    (state.qcFinalRecords || []).forEach(rec => {
      if (!rec) return;
      if ((rec.pairKey || qcFinalPairKeyOf(rec.date)) !== key) return;
      const row = byKey.get(rec.productId || `name:${rec.productName || ''}`);
      if (row) row.used += Number(rec.inputQty) || 0;
    });
    return rows.map(r => Object.assign(r, { remain: Math.max(0, r.total - r.used) }));
  }
  // Danh sách THÀNH PHẨM Ép Ván của cặp 2 tuần chứa ngày kiểm: gộp finishedQty
  // theo sản phẩm (ưu tiên productId), CHỈ nhận lượt ép cùng NĂM với ngày kiểm
  // (tránh trùng số tuần khác năm). Sắp theo tổng số lượng giảm dần.
  function qcFinalProducts2Weeks(dateISO) {
    const pair = qcFinalPairWeeks(dateISO);
    if (!pair.start) return [];
    const year = String(qcFinalYearOf(dateISO));
    const map = new Map();
    (state.pressRecords || []).forEach(r => {
      if (!r) return;
      const w = pressRecordWeek(r);
      if (!w || (w !== pair.start && (pair.end == null || w !== pair.end))) return;
      if (String(r.year || qcFinalYearOf(r.date)) !== year) return;
      const id = r.productId || '';
      const name = String(r.productName || '').trim() || 'Thành phẩm chưa đặt tên';
      const key = id || `name:${name}`;
      const cur = map.get(key) || { productId: id, name, qty: 0 };
      cur.qty += Number(r.finishedQty) || 0;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }
  // ═══ PHẦN 3 ═══

  // ─── NẠP / LƯU DỮ LIỆU (localStorage + file + mây) ───────────
  function loadQcFinal() {
    const raw = localStorage.getItem(STORAGE_KEY_QC_FINAL);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.qcFinalRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.qcFinalRecords = []; }
    } else {
      state.qcFinalRecords = [];
    }
  }
  function loadQcFinalRates() {
    const raw = localStorage.getItem(STORAGE_KEY_QC_FINAL_RATE);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        state.qcFinalRates = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
      } catch (e) { state.qcFinalRates = {}; }
    } else {
      state.qcFinalRates = {};
    }
  }
  function saveQcFinal() {
    try {
      localStorage.setItem(STORAGE_KEY_QC_FINAL, JSON.stringify(state.qcFinalRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    logDataChange(['qcFinalRecords']); // ghi lịch sử sửa đổi
    if (state.fileStorage.connected) {
      import('./storage.js').then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }
  function saveQcFinalRates() {
    try {
      localStorage.setItem(STORAGE_KEY_QC_FINAL_RATE, JSON.stringify(state.qcFinalRates || {}));
    } catch (err) { /* bộ nhớ đầy — bỏ qua, vẫn còn trên state */ }
    logDataChange(['qcFinalRates']);
    if (state.fileStorage.connected) {
      import('./storage.js').then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // ─── ĐỊNH MỨC 2 LOẠI: { 'YYYY-MM': { thanh: thanh/h, van: tấm/h } } ──
  // Đọc được bản CŨ (số thuần → hiểu là định mức Kiểm Ván tấm/h).
  function qcFinalRateEntryOf(monthKey) {
    const raw = (state.qcFinalRates || {})[monthKey];
    if (raw && typeof raw === 'object') {
      return { thanh: Number(raw.thanh) || 0, van: Number(raw.van) || 0 };
    }
    return { thanh: 0, van: Number(raw) || 0 };
  }
  // Định mức của LOẠI kiểm tại tháng của 1 ngày (chưa đặt → null)
  function qcFinalRateOf(dateISO, kind) {
    const e = qcFinalRateEntryOf(String(dateISO || '').slice(0, 7));
    const v = Number(e[qcFinalKindOf(kind)]) || 0;
    return v > 0 ? v : null;
  }
  // Giờ kiểm THỰC của 1 NGÀY — KHÔNG nhân số lượt kiểm trong ngày (giờ lấy từ
  // Bảng bố trí Nhân Sự theo NGÀY, mọi lượt cùng ngày dùng chung một khung giờ):
  function qcFinalDayHoursOf(date, dispList) {
    const live = hrQcFinalAssignmentsOf(date);
    if (live.length) {
      const sp = sumQcFinalHoursSplit(live, date);
      return { hours: sp.hc + sp.tc, hc: sp.hc, tc: sp.tc };
    }
    let hours = 0, hc = 0, tc = 0;
    (dispList || []).forEach(d => {
      if (Number.isFinite(d.workHoursHC) || Number.isFinite(d.workHoursTC)) {
        hc = Math.max(hc, d.workHoursHC || 0); tc = Math.max(tc, d.workHoursTC || 0);
      } else if (d.workHours > 0) hours = Math.max(hours, d.workHours);
    });
    return { hours: hours || hc + tc, hc, tc };
  }
  // ═══ PHẦN 4 ═══

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT KIỂM ────────────────────────
  // Link SỐNG tới Bảng bố trí Nhân Sự theo ngày; mất bố trí → snapshot đã lưu.
  function qcFinalDisplay(r) {
    const ws = QC_FINAL_WORKSHOPS[r.workshop] || QC_FINAL_WORKSHOPS.x2;
    const kind = qcFinalKindOf(r.kind);          // 'thanh' | 'van' (mặc định van)
    const unit = qcFinalUnitOf(kind);
    const inputQty = Number(r.inputQty) || 0;
    const qtyOk = Number(r.qtyOk) || 0;
    const qtyExcept = Number(r.qtyExcept) || 0;
    const qtyReject = Number(r.qtyReject) || 0;
    const qtyChecked = qtyOk + qtyExcept + qtyReject; // Tổng số lượng kiểm
    const qtyPass = qtyOk + qtyExcept;                // Tổng đạt
    const errPct = qtyChecked > 0 ? (qtyReject / qtyChecked) * 100 : null;
    // Người kiểm + giờ kiểm: SỐNG từ Bảng bố trí Nhân Sự; mất bố trí → snapshot
    const live = hrQcFinalAssignmentsOf(r.date || '');
    const workers = live.length
      ? live.map(a => ({ name: a.name, time: qcFinalTimeStr(a) }))
      : String(r.workerNames || '').split(',').map(s => s.trim()).filter(Boolean)
          .map((name, i) => ({ name, time: String(r.workTime || '').split(',').map(s => s.trim())[i] || '' }));
    let workHours = 0, workHoursHC = null, workHoursTC = null;
    if (live.length) {
      const sp = sumQcFinalHoursSplit(live, r.date || '');
      workHours = sp.hc + sp.tc;
      workHoursHC = sp.hc; workHoursTC = sp.tc;
    } else if (Number.isFinite(Number(r.workHoursHC)) || Number.isFinite(Number(r.workHoursTC))) {
      workHoursHC = Number(r.workHoursHC) || 0;
      workHoursTC = Number(r.workHoursTC) || 0;
      workHours = workHoursHC + workHoursTC;
      if (!workHours && Number(r.workHours) > 0) workHours = Number(r.workHours);
    } else if (Number(r.workHours) > 0) {
      workHours = Number(r.workHours);
    }
    // Công suất thực tế (= Tổng số lượng kiểm ÷ tổng giờ kiểm, đơn vị theo loại)
    const cap = workHours > 0 ? qtyChecked / workHours : null;
    // Định mức của LOẠI kiểm tại tháng → Hiệu suất = Công suất ÷ Định mức
    const rate = qcFinalRateOf(r.date, kind);
    const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
    return {
      id: r.id,
      date: r.date || '',
      workshop: r.workshop || 'x2',
      workshopLabel: ws.label,
      kind, kindLabel: QC_FINAL_KINDS[kind].label, unit,
      productId: r.productId || '',
      productName: String(r.productName || '').trim(),
      sizeKey: String(r.sizeKey || ''),
      sizeDims: Array.isArray(r.sizeDims) ? r.sizeDims.map(Number) : [],
      inputQty, qtyOk, qtyExcept, qtyReject,
      qtyChecked, qtyPass, errPct,
      workers, workerNames: workers.map(w => w.name).filter(Boolean).join(', '),
      workHours, workHoursHC, workHoursTC,
      cap, rate, eff
    };
  }
  // ═══ PHẦN 5 ═══

  // ─── TRẠNG THÁI FORM (riêng module — events.js điều khiển qua hàm xuất) ──
  let qcFinalEditId = null;      // id lượt kiểm đang sửa (null = ghi mới)
  let qcFinalPickerOpen = false; // danh sách thành phẩm Ép Ván đang mở?
  let qcFinalPicked = null;      // thành phẩm đã chọn: { productId, name, qty }
  let qcFinalPickedSize = null;  // 'Kiểm thanh': CỠ thanh Bào thanh đã chọn: { sizeKey, dims, remain }
  let qcFinalSearchQ = '';       // từ khóa tìm nhanh trong danh sách thành phẩm

  // ─── TỒN KIỂM THEO CỠ THANH (cho "Kiểm thanh" — LINK với thẻ Bào Tinh) ──
  // TỔNG = Σ số thanh ĐEM BÀO (inQty) của các lượt Bào thanh cùng cỡ đầu ra;
  // ĐÃ KIỂM = Σ Đầu vào kiểm của các lượt QC "Kiểm thanh" cùng cỡ ⇒ CÒN LẠI.
  // `excludeId` = lượt QC đang SỬA (trả lại phần của chính nó).
  function qcFinalThanhSizeStocks(excludeId) {
    const map = new Map();
    (state.xuong2BaoTinhRecords || []).forEach(r => {
      if (!r || r.kind !== 'bao_thanh') return;
      const key = String(r.outSizeKey || '').trim();
      if (!key) return;
      const cur = map.get(key) || {
        sizeKey: key, dims: Array.isArray(r.outDims) ? r.outDims.map(Number) : [], total: 0, used: 0
      };
      cur.total += Number(r.inQty) || 0;
      map.set(key, cur);
    });
    (state.qcFinalRecords || []).forEach(r => {
      if (!r || r.kind !== 'thanh' || r.id === excludeId) return;
      const cur = map.get(String(r.sizeKey || '').trim());
      if (cur) cur.used += Number(r.inputQty) || 0;
    });
    return [...map.values()]
      .map(x => Object.assign(x, { remain: Math.max(0, x.total - x.used) }))
      .sort((a, b) => b.remain - a.remain || b.total - a.total);
  }
  // Nhãn cỡ thanh 'Dài × Rộng × Dày'
  function qcFinalSizeLabel(dims) {
    const d = Array.isArray(dims) && dims.length === 3 ? dims : [];
    return d.length === 3 ? `${Number(d[0])} × ${Number(d[1])} × ${Number(d[2])}` : '—';
  }

  // So khớp tìm nhanh (bỏ dấu — giống ô tìm nhanh của các thẻ công đoạn)
  function qcFinalStripQ(s) {
    return qcFinalNormName(s).replace(/đ/g, 'd');
  }

  // ─── BANNER "ĐANG SỬA" (chỉ hiện khi đang sửa 1 lượt) ────────
  function updateQcFinalBanner() {
    const banner = document.getElementById('qcf-edit-banner');
    const text = document.getElementById('qcf-edit-text');
    if (!banner || !text) return;
    if (qcFinalEditId) {
      const r = (state.qcFinalRecords || []).find(x => x.id === qcFinalEditId);
      const ws = r ? (QC_FINAL_WORKSHOPS[r.workshop] || QC_FINAL_WORKSHOPS.x2).label : '';
      text.textContent = `Đang sửa lượt kiểm ${r ? formatDateDDMMYY(r.date) : ''} — ${ws}. Lưu để ghi đè, "Làm Mới Form" để bỏ.`;
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
      text.textContent = '';
    }
  }

  // ─── ĐỒNG BỘ FORM theo VỊ TRÍ + LOẠI KIỂM ────────────────────
  // Danh sách nguồn đầu vào CHỈ dùng cho Xưởng 2:
  //   • Kiểm Ván   → danh sách THÀNH PHẨM Ép Ván của cặp 2 tuần
  //   • Kiểm Thanh → danh sách CỠ thanh ĐẦU RA của công đoạn Bào thanh
  //                  (còn chờ kiểm) — LINK kết quả về thẻ Bào Tinh
  //   • Xưởng 1    → "Sắp có" (nhập tay số lượng)
  function syncQcFinalWorkshopFields() {
    const wsSel = document.getElementById('qcf-workshop');
    const kindSel = document.getElementById('qcf-kind');
    const ws = (wsSel && wsSel.value) || 'x2';
    const kind = qcFinalKindOf((kindSel && kindSel.value) || 'van');
    const pickerBtn = document.getElementById('qcf-picker-btn');
    const soonChip = document.getElementById('qcf-in-soon');
    const showPicker = ws === 'x2';   // cả Kiểm Ván LẪN Kiểm Thanh đều có danh sách nguồn
    if (pickerBtn) pickerBtn.hidden = !showPicker;
    if (soonChip) soonChip.hidden = ws !== 'x1';
    if (!showPicker) {
      // Xưởng 1: nhập tay — bỏ lựa chọn + đóng danh sách
      qcFinalPicked = null;
      qcFinalPickedSize = null;
      setQcFinalPickerOpen(false);
      const text = document.getElementById('qcf-picker-text');
      if (text) text.textContent = 'Đầu vào kiểm (nhập tay)';
      const count = document.getElementById('qcf-picked-count');
      if (count) count.textContent = 'Sắp có';
    } else {
      syncQcFinalPickerText();
    }
  }
  // Đổi LOẠI KIỂM (Thanh / Ván) → đổi ĐƠN VỊ các ô số lượng + đổi nguồn danh sách
  function syncQcFinalKindFields() {
    const kindSel = document.getElementById('qcf-kind');
    const kind = qcFinalKindOf((kindSel && kindSel.value) || 'van');
    const unit = qcFinalUnitOf(kind);
    ['qcf-unit-in', 'qcf-unit-ok', 'qcf-unit-ex', 'qcf-unit-re'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = unit;
    });
    // Đổi loại kiểm → nguồn khác hẳn → bỏ lựa chọn cũ (giữ nguyên nếu đang SỬA)
    if (!qcFinalEditId) {
      if (kind === 'thanh') qcFinalPicked = null;
      else qcFinalPickedSize = null;
      const inputQty = document.getElementById('qcf-input-qty');
      if (inputQty) inputQty.value = '';
      qcFinalSearchQ = '';
      const s = document.getElementById('qcf-search');
      if (s) s.value = '';
      setQcFinalPickerOpen(false);
    }
    syncQcFinalWorkshopFields();
  }
  function syncQcFinalPickerText() {
    const kindSel = document.getElementById('qcf-kind');
    const kind = qcFinalKindOf((kindSel && kindSel.value) || 'van');
    const unit = qcFinalUnitOf(kind);
    const text = document.getElementById('qcf-picker-text');
    const count = document.getElementById('qcf-picked-count');
    if (kind === 'thanh') {
      if (text) text.textContent = qcFinalPickedSize
        ? `Cỡ ${qcFinalSizeLabel(qcFinalPickedSize.dims)}`
        : 'Cỡ thanh Bào thanh';
      if (count) {
        count.textContent = qcFinalPickedSize
          ? `Còn lại: ${qcFinalFmt(qcFinalPickedSize.remain)} ${unit}`
          : 'Chưa chọn';
      }
      return;
    }
    if (text) text.textContent = qcFinalPicked ? qcFinalPicked.name : 'Thành phẩm Ép Ván';
    if (count) {
      count.textContent = qcFinalPicked ? `Còn lại: ${qcFinalFmt(qcFinalPicked.qty)} ${unit}` : 'Chưa chọn';
    }
  }

  // ─── DANH SÁCH THÀNH PHẨM ÉP VÁN (cặp 2 tuần của ngày đang chọn) ──
  // Cơ chế POP-UP NỔI: khi mở, node `#qcf-picker` được KÉO RA làm CON TRỰC TIẾP
  // của `#qc-detail-overlay` (lớp fixed đã phủ toàn màn hình, z:200) + neo bằng
  // INLINE `position:absolute` theo rect của nút "Thành phẩm Ép Ván":
  //   • Inline style THẮNG MỌI stylesheet (kể cả bản CSS cũ do SW cache giữ
  //     `position:absolute theo body` / `static`) → LUÔN nổi đúng chỗ nút,
  //     KHÔNG bao giờ rơi xuống đáy trang, KHÔNG biến dạng form.
  //   • Đóng thì đưa node về lại chỗ cũ trong form.
  function setQcFinalPickerOpen(open) {
    qcFinalPickerOpen = !!open;
    const box = document.getElementById('qcf-picker');
    const btn = document.getElementById('qcf-picker-btn');
    if (!box) return;
    if (qcFinalPickerOpen) {
      // PORTAL: kéo node ra làm con trực tiếp của lớp overlay (nổi trên mọi thứ)
      const ov = document.getElementById('qc-detail-overlay') || document.body;
      if (box.parentElement !== ov && ov.appendChild) {
        ov.appendChild(box);
      }
      box.hidden = false;
      renderQcFinalProductList();
      positionQcFinalPicker(); // neo ngay dưới nút (thiếu chỗ thì mở lên trên)
    } else {
      box.hidden = true;
      // Đưa node về lại ô Đầu vào kiểm (giữ markup đúng chỗ cho lần mở sau)
      const holder = document.getElementById('qcf-in-controls-holder') ||
                     document.querySelector('.qcf-in-controls');
      if (holder && box.parentElement !== holder && holder.appendChild) {
        holder.appendChild(box);
      }
    }
    if (btn) btn.setAttribute('aria-expanded', qcFinalPickerOpen ? 'true' : 'false');
  }
  // Neo danh sách nổi vào đúng vị trí nút (gọi lúc mở + khi cuộn/thay đổi cỡ màn hình):
  //   • Đủ chỗ phía dưới → mở XUỐNG dưới nút · thiếu chỗ → mở LÊN trên nút
  //   • Toạ độ tính THEO RECT CỦA OVERLAY (box là con trực tiếp của overlay) ·
  //     kẹp trong vùng nhìn (lệch 8px) · rộng = nút, tối thiểu 300px
  //   • `position:absolute` + `z-index:240` set bằng INLINE STYLE — thắng MỌI
  //     stylesheet cũ (kể cả bản do SW cache) → không phụ thuộc cache nữa.
  function positionQcFinalPicker() {
    if (!qcFinalPickerOpen) return;
    const box = document.getElementById('qcf-picker');
    const btn = document.getElementById('qcf-picker-btn');
    if (!box || !btn || typeof btn.getBoundingClientRect !== 'function') return;
    const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1280;
    const vh = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800;
    const ov = document.getElementById('qc-detail-overlay');
    const ovRect = (ov && typeof ov.getBoundingClientRect === 'function')
      ? ov.getBoundingClientRect()
      : { left: 0, top: 0, bottom: vh, width: vw, height: vh };
    const rect = btn.getBoundingClientRect();
    const width = Math.max(Math.min(Math.max(rect.width, 300), vw - 16), 240);
    const left = Math.max(8, Math.min(rect.left - ovRect.left, vw - width - 8));
    const spaceBelow = ovRect.bottom - rect.bottom;
    const spaceAbove = rect.top - ovRect.top;
    const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
    box.style.position = 'absolute';   // INLINE — thắng mọi stylesheet cũ (static/absolute theo body)
    box.style.zIndex = '240';          // INLINE — trên khung nội dung trong overlay
    box.style.overflow = 'auto';
    box.style.left = `${Math.round(left)}px`;
    box.style.width = `${Math.round(width)}px`;
    box.style.maxHeight = `${Math.round(Math.max(openUp ? spaceAbove - 12 : spaceBelow - 12, 180))}px`;
    if (openUp) {
      box.style.top = 'auto';
      box.style.bottom = `${Math.round(ovRect.bottom - rect.top + 6)}px`;
    } else {
      box.style.bottom = 'auto';
      box.style.top = `${Math.round(rect.bottom - ovRect.top + 6)}px`;
    }
  }
  function toggleQcFinalPicker() {
    setQcFinalPickerOpen(!qcFinalPickerOpen);
  }
  function setQcFinalSearchQ(q) {
    qcFinalSearchQ = String(q || '');
    renderQcFinalProductList();
  }
  function renderQcFinalProductList() {
    const listEl = document.getElementById('qcf-product-list');
    if (!listEl) return;
    const kindSel = document.getElementById('qcf-kind');
    const kind = qcFinalKindOf((kindSel && kindSel.value) || 'van');
    if (kind === 'thanh') { renderQcFinalThanhList(listEl); return; }
    const dateVal = (document.getElementById('qcf-date') || {}).value || qcFinalTodayISO();
    const pairTxt = qcFinalPairLabel(dateVal);
    // Tồn kiểm theo thành phẩm: TỔNG Ép Ván của cặp − ĐÃ KIỂM = CÒN LẠI
    // (1 cặp có thể kiểm NHIỀU NGÀY mới hết số)
    const rows = qcFinalProductStocks(dateVal);
    const q = qcFinalStripQ(qcFinalSearchQ);
    const hits = q ? rows.filter(r => qcFinalStripQ(r.name).includes(q)) : rows;
    const head = `<div class="qcf-pick-head"><i data-lucide="calendar-range"></i> Thành phẩm Ép Ván — <strong>${escapeHTML(pairTxt || '—')}</strong></div>`;
    if (!rows.length) {
      listEl.innerHTML = head + `<div class="al-empty">Chưa có lượt Ép Ván nào trong ${escapeHTML(pairTxt || 'cặp tuần này')}. Kiểm tra lại Ngày hoặc ghi lượt ép ở thẻ Ép Ván.</div>`;
      initLucide();
      return;
    }
    if (!hits.length) {
      listEl.innerHTML = head + `<div class="al-empty">Không có thành phẩm nào khớp "${escapeHTML(qcFinalSearchQ)}".</div>`;
      initLucide();
      return;
    }
    listEl.innerHTML = head + hits.map(p => {
      const done = p.remain <= 0;
      return `
      <button type="button" class="al-card qcf-product${qcFinalPicked && qcFinalPicked.productId === p.productId && qcFinalPicked.name === p.name ? ' picked' : ''}" data-qcf-product="${escapeHTML(p.productId || p.name)}" title="Chọn thành phẩm này — tự điền số CÒN LẠI (tổng Ép Ván của cặp tuần trừ phần đã kiểm các ngày trước) vào ô Đầu vào kiểm (sửa được)">
        <span class="qcf-product-line1">
          <span class="qcf-product-name">${escapeHTML(p.name)}</span>
          ${done ? '<span class="qcf-done">Đã kiểm đủ cặp tuần</span>' : ''}
        </span>
        <span class="qcf-product-meta">Tổng <strong>${qcFinalFmt(p.total)}</strong> · Đã kiểm ${qcFinalFmt(p.used)} · <b class="qcf-remain${done ? ' zero' : ''}">Còn lại ${qcFinalFmt(p.remain)}</b></span>
      </button>`;
    }).join('');
    initLucide();
  }
  // ─── DANH SÁCH CỠ THANH ĐẦU RA (cho "Kiểm thanh") ─────────────
  // Nguồn = các cỡ đầu ra của lượt Bào thanh (thẻ Bào Tinh); mỗi thẻ hiện
  // Tổng (số thanh đem bào của cỡ đó) · Đã kiểm · CÒN LẠI; chọn → tự điền
  // Đầu vào kiểm = CÒN LẠI và LINK kết quả về đúng lượt Bào thanh cùng cỡ.
  function renderQcFinalThanhList(listEl) {
    const rows = qcFinalThanhSizeStocks(qcFinalEditId || '');
    const q = qcFinalStripQ(qcFinalSearchQ);
    const hits = q ? rows.filter(r => qcFinalStripQ(`${r.sizeKey} ${qcFinalSizeLabel(r.dims)}`).includes(q)) : rows;
    const head = `<div class="qcf-pick-head"><i data-lucide="ruler"></i> Cỡ thanh ĐẦU RA của <strong>Bào thanh</strong> (còn chờ kiểm)</div>`;
    if (!rows.length) {
      listEl.innerHTML = head + '<div class="al-empty">Chưa có lượt Bào thanh nào ghi cỡ đầu ra. Ghi lượt ở thẻ Bào Tinh (tab Công Đoạn → Loại bào = Bào thanh) trước.</div>';
      initLucide();
      return;
    }
    if (!hits.length) {
      listEl.innerHTML = head + `<div class="al-empty">Không có cỡ nào khớp "${escapeHTML(qcFinalSearchQ)}".</div>`;
      initLucide();
      return;
    }
    listEl.innerHTML = head + hits.map(p => {
      const done = p.remain <= 0;
      const on = qcFinalPickedSize && qcFinalPickedSize.sizeKey === p.sizeKey;
      return `
      <button type="button" class="al-card qcf-product${on ? ' picked' : ''}${done ? ' qcf-product-done' : ''}" data-qcf-size="${escapeHTML(p.sizeKey)}" title="Chọn cỡ thanh này — tự điền số CÒN LẠI vào ô Đầu vào kiểm; kết quả kiểm sẽ LINK về thẻ Bào Tinh cùng cỡ">
        <span class="qcf-product-line1">
          <span class="qcf-product-name">${escapeHTML(qcFinalSizeLabel(p.dims))} mm</span>
          ${done ? '<span class="qcf-done">Đã kiểm đủ</span>' : ''}
        </span>
        <span class="qcf-product-meta">Tổng <strong>${qcFinalFmt(p.total)}</strong> · Đã kiểm ${qcFinalFmt(p.used)} · <b class="qcf-remain${done ? ' zero' : ''}">Còn lại ${qcFinalFmt(p.remain)}</b></span>
      </button>`;
    }).join('');
    initLucide();
  }
  // Chọn 1 mục trong danh sách nguồn (ủy quyền click từ events.js):
  //   • Kiểm Ván   → thành phẩm Ép Ván, tự điền số CÒN LẠI của cặp 2 tuần
  //   • Kiểm Thanh → CỠ thanh đầu ra của Bào thanh, tự điền số CÒN LẠI (chờ kiểm)
  function onQcFinalListClick(e) {
    const sizeBtn = e.target && e.target.closest ? e.target.closest('[data-qcf-size]') : null;
    if (sizeBtn) {
      const key = sizeBtn.getAttribute('data-qcf-size') || '';
      const row = qcFinalThanhSizeStocks(qcFinalEditId || '').find(p => p.sizeKey === key);
      if (!row) return false;
      qcFinalPickedSize = { sizeKey: row.sizeKey, dims: row.dims, remain: row.remain };
      qcFinalPicked = null;
      const inputQty = document.getElementById('qcf-input-qty');
      if (inputQty) inputQty.value = row.remain ? String(row.remain) : '';
      syncQcFinalPickerText();
      setQcFinalPickerOpen(false);
      renderQcFinalProductList();
      if (row.remain <= 0) {
        showToast(`Cỡ ${qcFinalSizeLabel(row.dims)} đã kiểm đủ — nếu còn tồn dư hãy sửa số Đầu vào kiểm.`, 'info');
      }
      return true;
    }
    const btn = e.target && e.target.closest ? e.target.closest('[data-qcf-product]') : null;
    if (!btn) return false;
    const key = btn.getAttribute('data-qcf-product') || '';
    const dateVal = (document.getElementById('qcf-date') || {}).value || qcFinalTodayISO();
    const row = qcFinalProductStocks(dateVal).find(p => (p.productId || p.name) === key);
    if (!row) return false;
    qcFinalPicked = { productId: row.productId, name: row.name, qty: row.remain };
    qcFinalPickedSize = null;
    const inputQty = document.getElementById('qcf-input-qty');
    if (inputQty) inputQty.value = row.remain ? String(row.remain) : '';
    syncQcFinalPickerText();
    setQcFinalPickerOpen(false);
    renderQcFinalProductList();
    if (row.remain <= 0) {
      showToast(`"${row.name}" đã kiểm đủ trong cặp tuần — nếu còn tồn dư hãy sửa số Đầu vào kiểm.`, 'info');
    }
    return true;
  }
  // ═══ PHẦN 6 ═══

  // ─── POPUP "ĐỊNH MỨC" — bảng theo THÁNG, 2 cột Kiểm Thanh (thanh/h) ·
  // Kiểm Ván (tấm/h). Nút "Định mức" nằm trong form nhập của thẻ; ô trống =
  // chưa đặt (thẻ ngày ẩn Hiệu suất của loại đó). Mẫu theo popup Định mức
  // Than Hóa (#modal-x2-say-rate). ──
  let qcFinalRateDraftMonth = ''; // tháng vừa bấm "Thêm" chưa lưu (hiện hàng trống)
  function qcFinalRateMonthsList() {
    const months = new Set(Object.keys(state.qcFinalRates || {}));
    (state.qcFinalRecords || []).forEach(r => months.add(String(r.date || '').slice(0, 7)));
    months.add(qcFinalTodayISO().slice(0, 7));
    if (qcFinalRateDraftMonth) months.add(qcFinalRateDraftMonth);
    return [...months].filter(m => /^\d{4}-\d{2}$/.test(m)).sort((a, b) => b.localeCompare(a));
  }
  function openQcFinalRateModal() {
    const modal = document.getElementById('modal-qcf-rate');
    if (!modal) return;
    renderQcFinalRateModal();
    modal.classList.add('show');
    initLucide();
  }
  function closeQcFinalRateModal() {
    const modal = document.getElementById('modal-qcf-rate');
    if (modal) modal.classList.remove('show');
    qcFinalRateDraftMonth = '';
  }
  function renderQcFinalRateModal() {
    const tbody = document.getElementById('qcf-rate-rows');
    if (!tbody) return;
    const months = qcFinalRateMonthsList();
    const cell = (m, kind) => {
      const v = Number(qcFinalRateEntryOf(m)[kind]) || 0;
      const unit = qcFinalUnitOf(kind);
      return `<td class="qcf-rate-cell"><input type="number" min="0" step="any" inputmode="decimal" class="qcf-rate-input" id="qcf-rate-${m}-${kind}" value="${v > 0 ? v : ''}" placeholder="—" title="Định mức ${QC_FINAL_KINDS[kind].label} của tháng (${unit}/giờ) — trống = chưa đặt"></td>`;
    };
    tbody.innerHTML = months.map(m => {
      const e = qcFinalRateEntryOf(m);
      const custom = !!(e.thanh > 0 || e.van > 0);
      return `<tr${custom ? '' : ' class="qcf-rate-row-default"'}>
        <td><strong>Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</strong></td>
        ${cell(m, 'thanh')}${cell(m, 'van')}
        <td class="text-right">
          <button type="button" class="btn btn-outline btn-icon btn-sm" data-qcf-rate-save="${m}" title="Lưu định mức tháng này"><i data-lucide="save"></i></button>
          <button type="button" class="btn btn-outline btn-icon btn-sm" style="color:var(--danger);" data-qcf-rate-reset="${m}" title="Xóa định mức tháng này"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
    }).join('');
    initLucide();
  }
  // Lưu 1 HÀNG (1 tháng): 2 ô Thanh/h · Ván/h — trống = chưa đặt loại đó
  function handleQcFinalRateRowSave(month) {
    if (!requireEditPermission()) return;
    const m = String(month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Tháng không hợp lệ!', 'error'); return; }
    const readVal = id => {
      const raw = String((document.getElementById(id) || {}).value || '').trim().replace(',', '.');
      if (raw === '') return 0;
      const v = Number(raw);
      return (Number.isFinite(v) && v > 0) ? v : -1; // -1 = số sai
    };
    const thanh = readVal(`qcf-rate-${m}-thanh`);
    const van = readVal(`qcf-rate-${m}-van`);
    if (thanh < 0 || van < 0) { showToast('Định mức phải là số lớn hơn 0 (hoặc để trống = chưa đặt)!', 'error'); return; }
    if (thanh <= 0 && van <= 0) { showToast('Cần nhập ít nhất 1 định mức (Kiểm Thanh hoặc Kiểm Ván)!', 'error'); return; }
    state.qcFinalRates = Object.assign({}, state.qcFinalRates || {}, { [m]: { thanh, van } });
    if (qcFinalRateDraftMonth === m) qcFinalRateDraftMonth = '';
    saveQcFinalRates();
    renderQcFinalRateModal();
    renderQcFinalTable(); // ĐM + Hiệu suất trên thẻ ngày cập nhật ngay
    showToast(`Đã lưu định mức tháng ${Number(m.slice(5))}/${m.slice(0, 4)}: Thanh ${thanh > 0 ? `${qcFinalFmt(thanh)} thanh/h` : '—'} · Ván ${van > 0 ? `${qcFinalFmt(van)} tấm/h` : '—'}.`, 'success');
  }
  // Xóa định mức của 1 tháng
  function handleQcFinalRateRowReset(month) {
    if (!requireEditPermission()) return;
    const m = String(month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) return;
    if (!(m in (state.qcFinalRates || {}))) return;
    if (!confirm(`Xóa định mức kiểm tháng ${Number(m.slice(5))}/${m.slice(0, 4)}?`)) return;
    const next = Object.assign({}, state.qcFinalRates || {});
    delete next[m];
    state.qcFinalRates = next;
    saveQcFinalRates();
    renderQcFinalRateModal();
    renderQcFinalTable();
    showToast(`Đã xóa định mức tháng ${Number(m.slice(5))}/${m.slice(0, 4)}.`, 'info');
  }
  // Thêm 1 tháng mới vào bảng (hàng trống để điền — lưu mới ghi vào state)
  function handleQcFinalRateAddMonth() {
    const el = document.getElementById('qcf-rate-new-month');
    const m = String((el && el.value) || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Chưa chọn tháng để thêm!', 'error'); return; }
    qcFinalRateDraftMonth = m;
    renderQcFinalRateModal();
    const first = document.getElementById(`qcf-rate-${m}-thanh`);
    if (first) first.focus();
  }
  // Ủy quyền click Lưu / Xóa trong bảng định mức (events.js gọi)
  function onQcFinalRateRowClick(e) {
    const saveBtn = e.target && e.target.closest ? e.target.closest('[data-qcf-rate-save]') : null;
    if (saveBtn) { handleQcFinalRateRowSave(saveBtn.getAttribute('data-qcf-rate-save')); return true; }
    const resetBtn = e.target && e.target.closest ? e.target.closest('[data-qcf-rate-reset]') : null;
    if (resetBtn) { handleQcFinalRateRowReset(resetBtn.getAttribute('data-qcf-rate-reset')); return true; }
    return false;
  }
  // ═══ PHẦN 7 ═══

  // ─── THỐNG KÊ NHANH CỦA VỊ TRÍ KIỂM SAU SẢN XUẤT ─────────────
  function renderQcFinalStats() {
    const box = document.getElementById('qcf-stats');
    if (!box) return;
    const disp = (state.qcFinalRecords || []).map(qcFinalDisplay);
    const totalChecked = disp.reduce((s, d) => s + d.qtyChecked, 0);
    const totalPass = disp.reduce((s, d) => s + d.qtyPass, 0);
    const totalReject = disp.reduce((s, d) => s + d.qtyReject, 0);
    const totalInput = disp.reduce((s, d) => s + d.inputQty, 0);
    const errPct = totalChecked > 0 ? (totalReject / totalChecked) * 100 : null;
    // Giờ kiểm đếm 1 LẦN mỗi NGÀY (mọi lượt cùng ngày dùng chung khung giờ bố trí)
    const seenDate = new Set();
    let hours = 0;
    disp.forEach(d => {
      if (!seenDate.has(d.date)) { seenDate.add(d.date); hours += d.workHours || 0; }
    });
    const capAvg = hours > 0 ? totalChecked / hours : null;
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${disp.length}</span>
        <span class="material-stat-label">Lượt kiểm</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${qcFinalFmt(totalInput)}</span>
        <span class="material-stat-label">Đầu vào kiểm (tấm + thanh)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${qcFinalFmt(totalChecked)}</span>
        <span class="material-stat-label">Tổng số lượng kiểm</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value" style="color:#16a34a;">${qcFinalFmt(totalPass)}</span>
        <span class="material-stat-label">Tổng đạt (Đạt + Ngoại lệ)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value" style="color:#b45309;">${qcFinalFmt(totalReject)}</span>
        <span class="material-stat-label">Loại (lỗi)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${errPct == null ? '—' : `${qcFinalFmt(errPct, 1)}%`}</span>
        <span class="material-stat-label">Tỉ lệ lỗi</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${capAvg == null ? '—' : qcFinalFmt(capAvg, 1)}</span>
        <span class="material-stat-label">Công suất TB (/h)</span>
      </div>`;
  }

  // ─── HUY HIỆU NGƯỜI KIỂM (người chính + giờ, "+N người khác") ──
  function qcFinalWorkerBadge(workers) {
    if (!workers || !workers.length) {
      return `<span class="x2-day-cap" title="Ngày này chưa bố trí vị trí kiểm ở Bảng bố trí Nhân Sự (tab Nhân Sự) — hoặc bố trí đã bị xóa (lượt kiểm vẫn giữ snapshot cũ)"><i data-lucide="users"></i> Người kiểm: <em style="color:var(--text-muted);">—</em></span>`;
    }
    const main = workers[0];
    const tip = workers.map(w => `${w.name}${w.time ? ` — ${w.time}` : ''}`).join(' · ');
    const more = workers.length > 1 ? ` <b title="${escapeHTML(tip)}">+${workers.length - 1} người khác</b>` : '';
    return `<span class="x2-day-cap" title="${escapeHTML('Người kiểm tự động từ Bảng bố trí Nhân Sự — vị trí bộ phận QC có tên chứa "kiểm" (QC Kiểm ván+thanh). ' + tip)}"><i data-lucide="users"></i> Người kiểm: <strong>${escapeHTML(main.name)}</strong>${main.time ? ` <small>${escapeHTML(main.time)}</small>` : ''}${more}</span>`;
  }
  // ═══ PHẦN 8 ═══

  // ─── BẢNG DỮ LIỆU = THẺ NGÀY (đầu thẻ chung + bảng lượt kiểm trong thẻ) ──
  // Đầu thẻ: Ngày · Vị trí · Người kiểm · Giờ HC/TC · Tổng số lượng kiểm ·
  //          Tổng đạt · Tỉ lệ lỗi · Công suất · Hiệu suất (khi có định mức)
  function renderQcFinalTable() {
    const box = document.getElementById('qcf-day-cards');
    if (!box) return;
    const records = [...(state.qcFinalRecords || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const countEl = document.getElementById('qcf-day-count');
    if (countEl) countEl.textContent = records.length ? `${records.length} lượt kiểm` : '';
    if (!records.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="badge-check"></i>
          <div>Chưa có lượt kiểm nào. Nhập form phía trên rồi bấm <strong>Lưu</strong> để ghi nhận kết quả kiểm thành phẩm.</div>
        </div>`;
      initLucide();
      return;
    }
    // Gom theo ngày (1 ngày có thể kiểm nhiều vị trí / nhiều thành phẩm)
    const groups = new Map();
    records.forEach(r => {
      const key = r.date || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let html = '';
    for (const [date, rows] of groups) {
      html += qcFinalDayCardHtml(date, rows);
    }
    box.innerHTML = html;
    initLucide();
  }
  // ═══ PHẦN 8b ═══

  // Dựng HTML 1 THẺ NGÀY (gọi từ renderQcFinalTable)
  function qcFinalDayCardHtml(date, rows) {
    const disp = rows.map(qcFinalDisplay);
    const dChecked = disp.reduce((s, d) => s + d.qtyChecked, 0);
    const dPass = disp.reduce((s, d) => s + d.qtyPass, 0);
    const dReject = disp.reduce((s, d) => s + d.qtyReject, 0);
    const dErrPct = dChecked > 0 ? (dReject / dChecked) * 100 : null;
    // Giờ kiểm THỰC của NGÀY (mọi lượt cùng ngày dùng chung khung giờ bố trí —
    // KHÔNG nhân số lượt kiểm trong ngày)
    const dayH = qcFinalDayHoursOf(date, disp);
    const dHours = dayH.hours, dHC = dayH.hc, dTC = dayH.tc;
    // Người kiểm của NGÀY (gộp hết các lượt — trùng tên + giờ chỉ lấy 1)
    const seen = new Set();
    const dayWorkers = [];
    disp.forEach(d => d.workers.forEach(w => {
      const k = `${w.name}|${w.time}`;
      if (!seen.has(k)) { seen.add(k); dayWorkers.push(w); }
    }));
    // Định mức + Công suất + Hiệu suất theo TỪNG LOẠI kiểm có trong ngày
    // (Thanh = thanh/h · Ván = tấm/h — cùng ngày có 2 loại thì hiện 2 nhóm chip)
    const kindsPresent = [...new Set(disp.map(d => d.kind))];
    const kindChips = kindsPresent.map(k => {
      const checkedK = disp.filter(d => d.kind === k).reduce((s, d) => s + d.qtyChecked, 0);
      const capK = dHours > 0 ? checkedK / dHours : null;
      const rateK = qcFinalRateOf(date, k);
      const unit = qcFinalUnitOf(k);
      let html = '';
      if (rateK) {
        html += `<span class="x2-day-cap" title="Định mức ${QC_FINAL_KINDS[k].label} của tháng">ĐM ${unit}: <strong>${qcFinalFmt(rateK)} ${unit}/h</strong></span>`;
      }
      if (capK != null) {
        html += `<span class="x2-day-cap" title="Công suất = Tổng số lượng kiểm (${unit}) ÷ giờ kiểm trong ngày"><i data-lucide="gauge"></i> Công suất: <strong>${qcFinalFmt(capK, 1)}</strong> ${unit}/h</span>`;
      }
      if (capK != null && rateK) {
        const effK = (capK / rateK) * 100;
        html += `<span class="x2-day-eff" title="Hiệu suất = Công suất (${unit}/h) ÷ Định mức ${QC_FINAL_KINDS[k].label} tháng ${Number(String(date).slice(5, 7))}">Hiệu suất: <strong style="color:${effK >= 100 ? '#16a34a' : effK >= 70 ? '#0f766e' : '#b45309'};">${qcFinalFmt(effK, 1)}%</strong></span>`;
      }
      return html;
    }).join('');
    // Vị trí của ngày: 1 vị trí → chip riêng; 2 vị trí → "Xưởng 1 + Xưởng 2"
    const wsSet = [...new Set(disp.map(d => d.workshopLabel))];
    const wsTxt = wsSet.length === 1 ? wsSet[0] : wsSet.join(' + ');
    const hourTxt = dHours > 0
      ? `<span class="x2-day-hours" title="Thời gian = tổng giờ công vị trí KIỂM của bộ phận QC trong ngày (tab Nhân Sự), tách giờ hành chính (HC) / giờ tăng ca (TC)"><span class="x2-hours-hc">${qcFinalFmt(dHC, 1)}h HC</span><span class="x2-hours-tc">${qcFinalFmt(dTC, 1)}h TC</span></span>`
      : '';
    const rowsHtml = rows.map(r => {
      const d = qcFinalDisplay(r);
      const errCls = d.errPct != null && d.errPct > 10 ? 'color:#b45309;' : 'color:#0f766e;';
      return `
        <div class="qcf-row">
          <div class="qcf-row-main">
            <span class="qcf-ws-chip" title="Vị trí kiểm">${escapeHTML(d.workshopLabel)}</span>
            <span class="qcf-kind-chip" title="Loại kiểm — quyết định đơn vị + định mức dùng tính Hiệu suất">${escapeHTML(d.kindLabel)}</span>
            ${(d.kind === 'thanh' && d.sizeKey)
              ? `<span class="x2-nan-chip" title="Cỡ thanh đầu ra của Bào thanh được kiểm — kết quả LINK về thẻ Bào Tinh cùng cỡ">Cỡ ${escapeHTML(qcFinalSizeLabel(d.sizeDims))}</span>`
              : `<span class="x2-nan-chip" title="Thành phẩm được kiểm">${escapeHTML(d.productName || '— (không gắn thành phẩm)')}</span>`}
            <span>Đầu vào <strong>${qcFinalFmt(d.inputQty)}</strong></span>
            <span>Đạt <strong style="color:#16a34a;">${qcFinalFmt(d.qtyOk)}</strong></span>
            <span>Ngoại lệ <strong>${qcFinalFmt(d.qtyExcept)}</strong></span>
            <span>Loại <strong style="${errCls}">${qcFinalFmt(d.qtyReject)}</strong></span>
            <span title="Tổng số lượng kiểm = Đạt + Ngoại lệ + Loại">Tổng kiểm <strong>${qcFinalFmt(d.qtyChecked)}</strong></span>
            <span title="Tổng đạt = Đạt + Ngoại lệ">Tổng đạt <strong style="color:#16a34a;">${qcFinalFmt(d.qtyPass)}</strong></span>
            <span title="Tỉ lệ lỗi = Loại ÷ Tổng số lượng kiểm">Lỗi <strong style="${errCls}">${d.errPct == null ? '—' : `${qcFinalFmt(d.errPct, 1)}%`}</strong></span>
            ${d.cap != null ? `<span title="Công suất = Tổng số lượng kiểm ÷ giờ kiểm">${qcFinalFmt(d.cap, 1)} ${d.unit}/h</span>` : ''}
          </div>
          <div class="qcf-row-actions" data-perm="qc">
            <button class="btn btn-outline btn-icon btn-sm" data-qcf-edit="${escapeHTML(r.id)}" title="Sửa lượt kiểm"><i data-lucide="pencil"></i></button>
            <button class="btn btn-outline btn-icon btn-sm" style="color:var(--danger);" data-qcf-delete="${escapeHTML(r.id)}" title="Xóa lượt kiểm"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="x2-day-card" data-date="${escapeHTML(date)}">
        <div class="x2-day-head">
          <span class="x2-day-date"><i data-lucide="calendar"></i> ${formatDateDDMMYY(date)}</span>
          <span class="qcf-ws-chip" title="Vị trí kiểm trong ngày">${escapeHTML(wsTxt)}</span>
          ${qcFinalWorkerBadge(dayWorkers)}
          ${hourTxt}
          <span class="x2-day-cap" title="Tổng số lượng kiểm = Đạt + Ngoại lệ + Loại (cả ngày)"><i data-lucide="clipboard-check"></i> Tổng kiểm: <strong>${qcFinalFmt(dChecked)}</strong></span>
          <span class="x2-day-cap" title="Tổng đạt = Đạt + Ngoại lệ (cả ngày)">Tổng đạt: <strong style="color:#16a34a;">${qcFinalFmt(dPass)}</strong></span>
          <span class="x2-day-cap" title="Tỉ lệ lỗi = Loại ÷ Tổng số lượng kiểm (cả ngày)">Tỉ lệ lỗi: <strong style="color:${dErrPct != null && dErrPct > 10 ? '#b45309' : '#0f766e'};">${dErrPct == null ? '—' : `${qcFinalFmt(dErrPct, 1)}%`}</strong></span>
          ${kindChips}
        </div>
        <div class="qcf-rows">${rowsHtml}</div>
      </div>`;
  }
  // ═══ PHẦN 9 ═══

  // ─── RENDER TOÀN BỘ THẺ (gọi từ renderQcView + sau mỗi thao tác) ──
  function renderQcFinalCard() {
    const dateEl = document.getElementById('qcf-date');
    if (dateEl && !dateEl.value) dateEl.value = qcFinalTodayISO(); // mở lần đầu → hôm nay
    syncQcFinalKindFields(); // đơn vị các ô + ẩn/hiện picker theo Loại kiểm + Vị trí
    updateQcFinalBanner();
    renderQcFinalStats();
    renderQcFinalTable();
    initLucide();
  }

  // ─── ĐẾM TRÊN THẺ MINI (launcher) ────────────────────────────
  function qcFinalCardCount() {
    const list = state.qcFinalRecords || [];
    if (!list.length) return 'Chưa kiểm';
    const pass = list.reduce((s, r) => s + (Number(r.qtyOk) || 0) + (Number(r.qtyExcept) || 0), 0);
    return `${list.length} lượt · ${qcFinalFmt(pass)} tấm đạt`;
  }

  // ─── LƯU / SỬA / XÓA LƯỢT KIỂM ───────────────────────────────
  const qcFinalNumOf = id => {
    const el = document.getElementById(id);
    const v = Number((el || {}).value);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  function resetQcFinalForm() {
    qcFinalEditId = null;
    qcFinalPicked = null;
    qcFinalPickedSize = null;
    qcFinalSearchQ = '';
    const dateEl = document.getElementById('qcf-date');
    if (dateEl) dateEl.value = qcFinalTodayISO();
    ['qcf-input-qty', 'qcf-ok', 'qcf-except', 'qcf-reject'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const searchEl = document.getElementById('qcf-search');
    if (searchEl) searchEl.value = '';
    syncQcFinalPickerText();
    setQcFinalPickerOpen(false);
    updateQcFinalBanner();
    renderQcFinalProductList();
  }
  function handleQcFinalSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const dateEl = document.getElementById('qcf-date');
    const wsEl = document.getElementById('qcf-workshop');
    const kindEl = document.getElementById('qcf-kind');
    const date = (dateEl || {}).value || '';
    const workshop = (wsEl && wsEl.value) || 'x2';
    const kind = qcFinalKindOf((kindEl && kindEl.value) || 'van');
    if (!date) { showToast('Vui lòng chọn Ngày kiểm!', 'error'); return; }
    const inputQty = qcFinalNumOf('qcf-input-qty');
    const qtyOk = qcFinalNumOf('qcf-ok');
    const qtyExcept = qcFinalNumOf('qcf-except');
    const qtyReject = qcFinalNumOf('qcf-reject');
    if (inputQty <= 0) { showToast('Vui lòng nhập ĐẦU VÀO KIỂM (số tấm đem kiểm)!', 'error'); return; }
    if (qtyOk + qtyExcept + qtyReject <= 0) {
      showToast('Chưa có kết quả kiểm — hãy nhập ít nhất Số lượng đạt / Ngoại lệ / Loại!', 'error');
      return;
    }
    if (qtyOk + qtyExcept + qtyReject > inputQty) {
      showToast('Tổng số (Đạt + Ngoại lệ + Loại) không thể lớn hơn Đầu vào kiểm!', 'error');
      return;
    }
    const snap = hrQcFinalSnapshot(date);
    const now = new Date().toISOString();
    // 'Kiểm thanh' → gắn CỠ thanh được kiểm (LINK về thẻ Bào Tinh cùng cỡ)
    const sizeFields = kind === 'thanh'
      ? { sizeKey: qcFinalPickedSize ? qcFinalPickedSize.sizeKey : '', sizeDims: qcFinalPickedSize ? qcFinalPickedSize.dims : [] }
      : { sizeKey: '', sizeDims: [] };
    if (qcFinalEditId) {
      const r = (state.qcFinalRecords || []).find(x => x.id === qcFinalEditId);
      if (!r) { qcFinalEditId = null; }
      else {
        Object.assign(r, {
          date, workshop, kind, inputQty, qtyOk, qtyExcept, qtyReject,
          pairKey: qcFinalPairKeyOf(date),
          productId: qcFinalPicked ? qcFinalPicked.productId : '',
          productName: qcFinalPicked ? qcFinalPicked.name : '',
          sizeKey: sizeFields.sizeKey, sizeDims: sizeFields.sizeDims,
          workerNames: snap.workerNames, workTime: snap.workTime,
          workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC,
          updatedAt: now
        });
        saveQcFinal();
        resetQcFinalForm();
        renderQcFinalCard();
        showToast(`Đã cập nhật lượt kiểm ${formatDateDDMMYY(date)}!`, 'success');
        return;
      }
    }
    state.qcFinalRecords = state.qcFinalRecords || [];
    state.qcFinalRecords.push({
      id: `qcf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date, workshop, kind, inputQty, qtyOk, qtyExcept, qtyReject,
      pairKey: qcFinalPairKeyOf(date),
      productId: qcFinalPicked ? qcFinalPicked.productId : '',
      productName: qcFinalPicked ? qcFinalPicked.name : '',
      sizeKey: sizeFields.sizeKey, sizeDims: sizeFields.sizeDims,
      workerNames: snap.workerNames, workTime: snap.workTime,
      workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC,
      createdAt: now, updatedAt: now
    });
    saveQcFinal();
    resetQcFinalForm();
    renderQcFinalCard();
    showToast(`Đã lưu lượt kiểm ${formatDateDDMMYY(date)} — ${QC_FINAL_WORKSHOPS[workshop].label}!`, 'success');
  }
  // ═══ PHẦN 10 ═══

  // Nạp 1 lượt vào form để SỬA (ủy quyền click data-qcf-edit)
  function editQcFinalRecord(id) {
    if (!requireEditPermission()) return;
    const r = (state.qcFinalRecords || []).find(x => x.id === id);
    if (!r) return;
    qcFinalEditId = id;
    qcFinalPicked = r.productId || r.productName
      ? { productId: r.productId || '', name: r.productName || '', qty: Number(r.inputQty) || 0 }
      : null;
    qcFinalPickedSize = (qcFinalKindOf(r.kind) === 'thanh' && r.sizeKey)
      ? { sizeKey: String(r.sizeKey), dims: Array.isArray(r.sizeDims) ? r.sizeDims.map(Number) : [], remain: Number(r.inputQty) || 0 }
      : null;
    const dateEl = document.getElementById('qcf-date');
    if (dateEl) dateEl.value = r.date || '';
    const wsEl = document.getElementById('qcf-workshop');
    if (wsEl) wsEl.value = r.workshop || 'x2';
    const kindEl = document.getElementById('qcf-kind');
    if (kindEl) kindEl.value = qcFinalKindOf(r.kind);
    const set = (id2, v) => {
      const el = document.getElementById(id2);
      if (el) el.value = (v == null || v === 0) ? '' : String(v);
    };
    set('qcf-input-qty', r.inputQty);
    set('qcf-ok', r.qtyOk);
    set('qcf-except', r.qtyExcept);
    set('qcf-reject', r.qtyReject);
    syncQcFinalKindFields();
    syncQcFinalPickerText();
    updateQcFinalBanner();
    renderQcFinalTable();
    initLucide();
  }
  // Xóa 1 lượt kiểm (tombstone chặn mây đẩy ngược — giống mọi danh sách khác)
  function deleteQcFinalRecord(id) {
    if (!requireEditPermission()) return;
    const r = (state.qcFinalRecords || []).find(x => x.id === id);
    if (!r) return;
    if (!confirm(`Xóa lượt kiểm ${formatDateDDMMYY(r.date)} — ${(QC_FINAL_WORKSHOPS[r.workshop] || QC_FINAL_WORKSHOPS.x2).label}?`)) return;
    trackDeleted('qcFinalRecords', id);
    state.qcFinalRecords = (state.qcFinalRecords || []).filter(x => x.id !== id);
    if (qcFinalEditId === id) qcFinalEditId = null;
    saveQcFinal();
    updateQcFinalBanner();
    renderQcFinalCard();
    showToast('Đã xóa lượt kiểm.', 'info');
  }
  // Ủy quyền click Sửa/Xóa trong bảng thẻ ngày (events.js gọi)
  function onQcFinalTableClick(e) {
    const editBtn = e.target && e.target.closest ? e.target.closest('[data-qcf-edit]') : null;
    if (editBtn) { editQcFinalRecord(editBtn.getAttribute('data-qcf-edit')); return true; }
    const delBtn = e.target && e.target.closest ? e.target.closest('[data-qcf-delete]') : null;
    if (delBtn) { deleteQcFinalRecord(delBtn.getAttribute('data-qcf-delete')); return true; }
    return false;
  }
  // Bấm RA NGOÀI danh sách nổi → tự đóng (giống các picker khác). Danh sách đã
  // PORTAL ra `document.body` nên ngoài `#qcf-in-group` phải giữ nguyên khi bấm
  // TRONG `#qcf-picker` (ô tìm nhanh / thẻ thành phẩm).
  function qcFinalMaybeClosePicker(e) {
    if (!qcFinalPickerOpen) return false;
    if (e.target && e.target.closest && (e.target.closest('#qcf-in-group') || e.target.closest('#qcf-picker'))) return false;
    setQcFinalPickerOpen(false);
    return true;
  }
  // ĐỔI NGÀY KIỂM: thành phẩm đã chọn gắn với cặp tuần CŨ → bỏ chọn + xoá ô
  // Đầu vào kiểm (trừ khi đang SỬA 1 lượt — giữ nguyên số đang nạp), rồi vẽ lại
  // danh sách thành phẩm Ép Ván của cặp 2 tuần mới.
  function qcFinalOnDateChange() {
    // Kiểm Ván: thành phẩm gắn với cặp tuần → đổi ngày là bỏ chọn.
    // Kiểm Thanh: cỡ thanh KHÔNG phụ thuộc ngày → giữ nguyên lựa chọn.
    const kindSel = document.getElementById('qcf-kind');
    const kind = qcFinalKindOf((kindSel && kindSel.value) || 'van');
    if (!qcFinalEditId && kind !== 'thanh') {
      qcFinalPicked = null;
      const inputQty = document.getElementById('qcf-input-qty');
      if (inputQty) inputQty.value = '';
      syncQcFinalPickerText();
    }
    renderQcFinalProductList();
  }

export {
  QC_FINAL_KINDS,
  QC_FINAL_WORKSHOPS,
  closeQcFinalRateModal,
  deleteQcFinalRecord,
  editQcFinalRecord,
  handleQcFinalRateAddMonth,
  handleQcFinalRateRowReset,
  handleQcFinalRateRowSave,
  handleQcFinalSubmit,
  hrQcFinalAssignmentsOf,
  hrQcFinalSnapshot,
  isQcFinalPos,
  loadQcFinal,
  loadQcFinalRates,
  onQcFinalListClick,
  onQcFinalRateRowClick,
  onQcFinalTableClick,
  openQcFinalRateModal,
  positionQcFinalPicker,
  qcFinalCardCount,
  qcFinalDayHoursOf,
  qcFinalDisplay,
  qcFinalKindOf,
  qcFinalMaybeClosePicker,
  qcFinalOnDateChange,
  qcFinalPairKeyOf,
  qcFinalPairLabel,
  qcFinalPairWeeks,
  qcFinalProductStocks,
  qcFinalProducts2Weeks,
  // ── 'KIỂM THANH': cỡ thanh ĐẦU RA của Bào thanh (LINK về thẻ Bào Tinh) ──
  qcFinalThanhSizeStocks,
  qcFinalSizeLabel,
  qcFinalRateEntryOf,
  qcFinalRateOf,
  qcFinalTodayISO,
  qcFinalUnitOf,
  renderQcFinalCard,
  renderQcFinalProductList,
  renderQcFinalRateModal,
  renderQcFinalStats,
  renderQcFinalTable,
  resetQcFinalForm,
  saveQcFinal,
  saveQcFinalRates,
  setQcFinalPickerOpen,
  setQcFinalSearchQ,
  sumQcFinalHoursSplit,
  syncQcFinalKindFields,
  syncQcFinalWorkshopFields,
  toggleQcFinalPicker,
  updateQcFinalBanner
};
