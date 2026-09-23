// ═══════════════════════════════════════════════════════════
// js/xuong2.js — Tab CÔNG ĐOẠN: KHU VỰC XƯỞNG 2 (thẻ mini / launcher)
// ═══════════════════════════════════════════════════════════
// Mỗi VỊ TRÍ công đoạn của Xưởng 2 là 1 thẻ mini (launcher) — bấm thẻ
// mở bảng chi tiết NỔI LÊN dạng pop-up (giống thẻ Nhân Sự — hr.js).
//
// Vị trí đầu tiên: "Cắt Chọn" — chọn luồng từ nguyên liệu ĐẦU VÀO của
// Xưởng 2 (tab Nguyên Liệu: "Luồng cây xô", "Luồng ống", ...).
//   • TỰ ĐỘNG LINK từ lần nhập nguyên liệu được chọn:
//       - Tên nhà cung cấp  (rec.supplier)
//       - Mã số             (rec.code — tab Nguyên Liệu sẽ bổ sung trường này;
//                            trước khi có thì hiển thị "Chưa có")
//       - KL đầu vào (kg)   (rec.weight = chỉ số đầu vào − chỉ số đầu ra)
//   • Trường nhập thêm: Ngày cắt/chọn, KL ống luồng, KL củi đốt, KL cây loại
//     và KL ngọn/ống loại TỰ TÍNH = KL đầu vào − ống luồng − củi đốt − cây loại.
//
// Dữ liệu state.xuong2CutRecords: lưu localStorage + file + mây (firePushSync).
//
// Vị trí thứ hai: "Bổ Ống" (xem khối "VỊ TRÍ: BỔ ỐNG" ở cuối file) — bổ ống
// luồng của các LÔ ỐNG sinh ra từ Cắt Chọn: nhập KL ống loại → KL ống bổ tự
// tính; người bổ + giờ bổ HC/TC tự động từ Bảng bố trí Nhân Sự (vị trí "Bổ
// Ống"); định mức công suất bổ ống theo tháng (kg/h) → Hiệu suất.
// Dữ liệu: state.xuong2BoOngRecords + state.x2BoOngRates.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { hrSplitHoursHCDate } from './hr.js';
import { materialWeekLabel } from './materials.js';
import { pressVolumeTotalOf, renderBaoTinhEffTable, renderX2EpVanCard } from './press.js';
import { supplierKey } from './suppliers.js';
import { STORAGE_KEY_XUONG2_BAO_THO, STORAGE_KEY_XUONG2_BAO_TINH, STORAGE_KEY_XUONG2_BO_ONG, STORAGE_KEY_XUONG2_CHON_NAN, STORAGE_KEY_XUONG2_CUTS, STORAGE_KEY_X2_BAO_THO_RATE, STORAGE_KEY_X2_BAO_TINH_RATE, STORAGE_KEY_X2_BO_ONG_RATE, STORAGE_KEY_X2_CAP_RATE, STORAGE_KEY_X2_CHON_NAN_RATE, state } from './state.js';
import { trackDeleted } from './tombstone.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';

  // Ghi file dữ liệu qua storage.js (import động để tránh vòng phụ thuộc module
  // — giống cách materials.js dùng)
  function storageModule() {
    return import('./storage.js').catch(() => null);
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  // ─── HẰNG SỐ: CÁC VỊ TRÍ CÔNG ĐOẠN XƯỞNG 2 (launcher) ────────
  // 12 vị trí theo đúng LUỒNG SX (thứ tự hiển thị trong #x2-cards-grid —
  // index.html). Bổ sung vị trí mới: thêm 1 thẻ button trong index.html
  // + 1 dòng ở đây (cardId ↔ id ô đếm trên thẻ).
  //   soon: true → thẻ chỉ là LAUNCHER PLACEHOLDER (bảng chi tiết hiện ghi
  //   chú "Sắp có" — .x2-soon-note). Khi bổ sung chức năng cho vị trí:
  //   gỡ cờ `soon`, viết hàm render riêng + thêm nhánh trong x2OpenCard.
  const X2_CARD_DEFS = {
    'x2-bo-luong-card':     { el: 'x2-mini-count-bo-luong',     soon: true }, // Bốc Luồng
    'x2-cut-card':          { el: 'x2-mini-count-cut' },                      // Cắt Chọn (ĐÃ CÓ chức năng)
    'x2-bo-ong-card':       { el: 'x2-mini-count-bo-ong' },                   // Bổ Ống (ĐÃ CÓ chức năng)
    'x2-bao-tho-card':      { el: 'x2-mini-count-bao-tho' },                  // Chạy Máy Bào Thô (ĐÃ CÓ chức năng)
    'x2-chon-nan-tho-card': { el: 'x2-mini-count-chon-nan-tho' },            // Chọn Nan Thô (ĐÃ CÓ chức năng)
    'x2-than-hoa-card':     { el: 'x2-mini-count-than-hoa' },                 // Than Hóa + Sấy (CHỨA BẢNG KANBAN lô nan)
    'x2-bao-tinh-card':     { el: 'x2-mini-count-bao-tinh' },                 // Bào Tinh (ĐÃ CÓ chức năng)
    'x2-ep-van-card':       { el: 'x2-mini-count-ep-van' },                    // Ép Ván (ĐÃ CÓ chức năng — 2 khung: Lượt Ép / Biểu Đồ)
    'x2-bullig-card':       { el: 'x2-mini-count-bullig',       soon: true }, // Bullig
    'x2-cat-van-card':      { el: 'x2-mini-count-cat-van',      soon: true }, // Cắt Ván
    'x2-bao-van-card':      { el: 'x2-mini-count-bao-van',      soon: true }, // Bào Ván
    'x2-ho-tro-card':       { el: 'x2-mini-count-ho-tro',       soon: true }  // Hỗ Trợ + Công Đoạn Lẻ
  };


  // ─── NÚT DÙNG CHUNG Ở TAB CÔNG ĐOẠN (Lịch Sử + Xuất Dữ Liệu X2) ──
  // Mỗi thẻ Xưởng 2 → VÙNG DỮ LIỆU (khóa trong DOMAINS của history.js) và
  // NGUỒN XUẤT Excel (khóa trong X2_EXPORT_SOURCES của export-xlsx.js) để 2 nút
  // dùng chung tự phục vụ đúng thẻ đang mở.
  const X2_CARD_HISTORY_DOMAIN = {
    'x2-cut-card': 'xuong2CutRecords',
    'x2-bo-ong-card': 'xuong2BoOngRecords',
    'x2-bao-tho-card': 'xuong2BaoThoRecords',
    'x2-chon-nan-tho-card': 'xuong2ChonNanThoRecords',
    'x2-than-hoa-card': 'batches',
    'x2-bao-tinh-card': 'xuong2BaoTinhRecords',
    'x2-ep-van-card': 'pressRecords'
  };
  const X2_CARD_EXPORT_SOURCE = {
    'x2-cut-card': 'cut',
    'x2-bo-ong-card': 'boong',
    'x2-bao-tho-card': 'baotho',
    'x2-chon-nan-tho-card': 'chonnan',
    'x2-than-hoa-card': 'batch',
    'x2-bao-tinh-card': 'baotinh',
    'x2-ep-van-card': 'epvan'
  };
  // Thẻ đang mở (null = không thẻ nào) — Lịch Sử/Xuất Excel dùng chung + gợi ý AI
  function x2OpenCardId() { return openX2Card ? openX2Card.id : null; }
  function x2OpenCardHistoryDomain() {
    const id = x2OpenCardId();
    return (id && X2_CARD_HISTORY_DOMAIN[id]) || '';
  }
  function x2OpenCardExportSource() {
    const id = x2OpenCardId();
    return (id && X2_CARD_EXPORT_SOURCE[id]) || 'batch';
  }

  // ─── NGUỒN DỮ LIỆU: NGUYÊN LIỆU ĐẦU VÀO CỦA XƯỞNG 2 ──────────
  // Các lượt nhập nguyên liệu cho vị trí 'xuong-2' ở tab Nguyên Liệu
  // (Luồng cây xô, Luồng ống, ...) — mới nhất lên đầu.
  function xuong2MaterialInputs() {
    return [...(state.materialRecords || [])]
      .filter(r => r.location === 'xuong-2')
      .sort((a, b) => {
        if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }

  // Mã số của lần nhập nguyên liệu — trường SẮP BỔ SUNG bên tab Nguyên Liệu.
  // Đọc dự phòng nhiều tên trường ('code' / 'matCode' / 'maSo') để khi tab
  // Nguyên Liệu thêm mã số, thẻ Cắt Chọn TỰ ĐỘNG link ra không cần sửa gì.
  function materialCodeOf(rec) {
    if (!rec) return '';
    return String(rec.code ?? rec.matCode ?? rec.maSo ?? '').trim();
  }

  // KL đầu vào (kg) của lần nhập nguyên liệu = trọng lượng đã lưu
  // (weight = chỉ số đầu vào − chỉ số đầu ra); dự phòng tính lại nếu thiếu.
  function materialInputWeightOf(rec) {
    if (!rec) return 0;
    const w = Number(rec.weight);
    if (Number.isFinite(w)) return w;
    return (Number(rec.inputIndex) || 0) - (Number(rec.outputIndex) || 0);
  }

  const fmtKg = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const fmtRatio = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });

  // ─── TỒN CHƯA CẮT + MÃ NCC + NGƯỜI CẮT (nguồn tab Nhân Sự) ────
  // Tồn hiện tại = các lô nguyên liệu đầu vào Xưởng 2 CHƯA có lượt cắt/chọn nào
  function cutMaterialIds() {
    return new Set((state.xuong2CutRecords || []).map(r => r.materialId).filter(Boolean));
  }
  function xuong2PendingInputs() {
    const cutIds = cutMaterialIds();
    return xuong2MaterialInputs().filter(r => !cutIds.has(r.id));
  }
  // Mã NCC từ Bảng Thông Tin Nhà Cung (khớp tên mềm "Tế" ≡ "Nhà Tế")
  function supplierCodeOf(name) {
    const k = supplierKey(name);
    if (!k) return '';
    const sup = (state.suppliers || []).find(s => supplierKey(s.name) === k);
    return sup ? String(sup.code || '').trim() : '';
  }
  // ─── NGƯỜI LÀM + THỜI GIAN LÀM — TỰ ĐỘNG từ tab Nhân Sự ────────
  // Nguồn: Bảng bố trí vị trí theo ngày (hrAssignments) — các lượt bố trí tại
  // bộ phận "Xưởng 2" vào ĐÚNG VỊ TRÍ công đoạn (Cắt Chọn / Bổ Ống...) đúng
  // ngày. Trả về MẢNG (một ngày có thể nhiều người/ca) để tính công suất:
  // [{ employeeId, name, positionName, shiftIdx, start, end }]
  // Tên vị trí so khớp MỀM: bỏ dấu, không phân biệt hoa/thường (isCutSelectPos
  // → "cắt chọn" — KHÔNG nhầm "Cắt ván"; isBoOngPos → "bổ ống", khớp cả
  // "Bổ Ống", "Bổ ống 2"...).
  function normPosName(name) {
    return String(name || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  function isCutSelectPos(name) {
    return normPosName(name).includes('cat chon');
  }
  function isBoOngPos(name) {
    return normPosName(name).includes('bo ong');
  }
  // Vị trí CHẠY MÁY BÀO THÔ (chứa "bào thô") — KHÔNG nhầm "Bào tinh"/"Bào ván"
  function isBaoThoPos(name) {
    return normPosName(name).includes('bao tho');
  }
  // Vị trí CHỌN NAN THÔ (chứa "chọn nan") — khớp "Chọn Nan Thô", "Chọn nan thô 2"...
  function isChonNanPos(name) {
    return normPosName(name).includes('chon nan');
  }
  // Bố trí của 1 vị trí trong ngày (matchPos = hàm khớp tên vị trí)
  function hrAssignmentsAt(dateVal, matchPos) {
    if (!dateVal) return [];
    const posNameOf = id => {
      const p = (state.hrPositions || []).find(x => x.id === id);
      return String((p && p.name) || '').trim();
    };
    const emplOf = id => (state.hrEmployees || []).find(x => x.id === id) || null;
    return (state.hrAssignments || [])
      .filter(a => a.date === dateVal &&
                   String(a.department || '').trim() === 'Xưởng 2' &&
                   matchPos(posNameOf(a.positionId)))
      .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))
      .map(a => {
        const e = emplOf(a.employeeId);
        return {
          employeeId: a.employeeId || '',
          name: String((e && e.name) || a.employeeId || '').trim(),
          positionName: posNameOf(a.positionId),
          shiftIdx: Number(a.shiftIdx) || 0,
          start: String(a.start || '').trim(),
          end: String(a.end || '').trim()
        };
      });
  }
  function hrCutAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isCutSelectPos); }
  function hrBoOngAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isBoOngPos); }
  function hrBaoThoAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isBaoThoPos); }
  function hrChonNanAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isChonNanPos); }
  // Chuỗi giờ 1 lượt bố trí: "07:00–12:00"; giờ ra TRỐNG = làm đến HẾT CA
  // (mặc định theo quy ước Bảng bố trí Nhân Sự) → hiển thị "07:00 → hết ca"
  const posTimeStr = a => (a.end ? `${a.start}–${a.end}` : `${a.start} → hết ca`);
  const cutTimeStr = posTimeStr; // tên cũ (lượt cắt/chọn) — giữ để không phá code khác

  // ─── ĐỊNH MỨC CÔNG SUẤT CẮT (kg/giờ) THEO TỪNG THÁNG ─────────
  // Người quản lý đặt riêng cho từng tháng (VD tháng 9 = 3000 kg/h, tháng 10 = 3200
  // kg/h) — nguồn cho cột "Hiệu suất" = Công suất thực tế ÷ Công suất định mức.
  function loadX2CapRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_CAP_RATE);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        state.x2CapRates = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
      } catch (e) { state.x2CapRates = {}; }
    } else {
      state.x2CapRates = {};
    }
  }

  function saveX2CapRates() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_CAP_RATE, JSON.stringify(state.x2CapRates || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    // Ghi file + đồng bộ mây (định mức ít đổi — gọn, gởi cùng dữ liệu)
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // Định mức công suất của tháng chứa dateVal (kg/giờ) — null nếu chưa đặt
  function capRateOf(dateVal) {
    const key = String(dateVal || '').slice(0, 7);
    const v = Number((state.x2CapRates || {})[key]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  // Lưu định mức 1 tháng (từ thanh điền nhanh trên bảng)
  function handleX2CapRateSave() {
    if (!requireEditPermission()) return;
    const monthEl = document.getElementById('x2-rate-month');
    const valEl = document.getElementById('x2-rate-value');
    const month = String((monthEl && monthEl.value) || '').trim();
    const v = Number((valEl && valEl.value) || 0);
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Chưa chọn tháng để lưu định mức!', 'error'); return; }
    if (!Number.isFinite(v) || v <= 0) { showToast('Định mức công suất phải là số kg/giờ lớn hơn 0!', 'error'); return; }
    (state.x2CapRates = state.x2CapRates || {})[month] = v;
    saveX2CapRates();
    renderX2RateBar();
    renderXuong2CutTable(); // cột Hiệu suất tự cập nhật
    showToast(`Đã lưu định mức công suất ${fmtKg(v)} kg/giờ cho tháng ${month.slice(5)}!`, 'success');
  }

  // Thanh điền ĐỊNH MỨC: chọn tháng (gợi ý các tháng có lượt cắt + tháng hiện tại)
  function renderX2RateBar() {
    const bar = document.getElementById('x2-rate-bar');
    if (!bar) return;
    const sel = bar.querySelector('#x2-rate-month');
    const valEl = bar.querySelector('#x2-rate-value');
    if (!sel) return;
    const months = new Set([...(state.xuong2CutRecords || []).map(r => String(r.date || '').slice(0, 7)), new Date().toISOString().slice(0, 7)]);
    const curMonth = sel.value || new Date().toISOString().slice(0, 7);
    sel.innerHTML = [...months].filter(Boolean).sort((a, b) => b.localeCompare(a))
      .map(m => `<option value="${escapeHTML(m)}">Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</option>`).join('');
    sel.value = months.has(curMonth) ? curMonth : [...months][0] || '';
    if (valEl) {
      const v = Number((state.x2CapRates || {})[sel.value]);
      valEl.value = Number.isFinite(v) && v > 0 ? v : '';
    }
  }

  // ─── SỐ GIỜ CẮT — TÁCH HC/TC (dùng cho CÔNG SUẤT) ────────────
  function hhmmToMin(s) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
    return m ? (parseInt(m[1], 10) * 60) + parseInt(m[2], 10) : null;
  }
  // Tổng SỐ GIỜ LÀM tách theo HC/TC (giờ hành chính / giờ tăng ca) — dùng cho
  // MỌI vị trí công đoạn (Cắt Chọn, Bổ Ống...): mỗi lượt bố trí (giờ vào–giờ ra)
  // được tách theo CỬA SỔ CA làm việc của bộ phận Xưởng 2
  // (hrSplitHoursHCDate — ngày nghỉ/lễ đi làm → toàn TC).
  // GIỜ RA TRỐNG = làm đến HẾT CA (quy ước Bảng bố trí) — hrSplitHoursHCDate
  // tự mặc định giờ ra = giờ kết thúc ca → VD 07:00 → hết ca = 9h HC.
  function sumPosHoursSplit(list, dateVal) {
    let hc = 0, tc = 0;
    (list || []).forEach(a => {
      if (!a.start) return;
      const r = hrSplitHoursHCDate('Xưởng 2', dateVal, a.start, a.end, a.shiftIdx || 0);
      hc += r.hc || 0; tc += r.tc || 0;
    });
    return { hc: hc / 60, tc: tc / 60 }; // giờ
  }
  const sumCutHoursSplit = sumPosHoursSplit;
  // Giờ cắt từ SNAPSHOT cutTime lưu cùng lượt ("07:00–12:00, 13:00–17:00") —
  // dự phòng khi bố trí Nhân Sự đã bị xóa; lượt chỉ có giờ vào = 0 giờ
  function snapshotCutHours(cutTimeStr) {
    let min = 0;
    String(cutTimeStr || '').split(',').forEach(part => {
      const rng = part.trim().split('–');
      if (rng.length === 2) {
        const st = hhmmToMin(rng[0]), en = hhmmToMin(rng[1]);
        if (st != null && en != null && en > st) min += en - st;
      }
    });
    return min / 60;
  }

  // Snapshot NGƯỜI LÀM + GIỜ LÀM lúc lưu lượt (phòng khi bố trí Nhân Sự bị
  // xóa về sau) — dùng chung mọi vị trí công đoạn:
  //   names = "Tên A, Tên B" · timeStr = "07:00–12:00, 13:00–17:00" ·
  //   hours = tổng giờ · hc/tc = giờ tách theo HC/TC
  function hrPositionSnapshot(dateVal, list) {
    const split = sumPosHoursSplit(list, dateVal);
    return {
      names: list.map(a => a.name).filter(Boolean).join(', '),
      timeStr: list.map(posTimeStr).filter(s => s).join(', '),
      hours: split.hc + split.tc,
      hc: split.hc,
      tc: split.tc
    };
  }
  // Snapshot của lượt CẮT/CHỌN (tên trường cũ — giữ nguyên để không phá dữ liệu cũ)
  function hrCutSnapshot(dateVal) {
    const s = hrPositionSnapshot(dateVal, hrCutAssignmentsOf(dateVal));
    return {
      cutter: s.names,
      cutTime: s.timeStr,
      cutHours: s.hours,
      cutHoursHC: s.hc,
      cutHoursTC: s.tc
    };
  }
  // Snapshot của lượt BỔ ỐNG (người bổ + thời gian bổ + số giờ tách HC/TC)
  function hrBoOngSnapshot(dateVal) {
    return workerSnapOf(hrPositionSnapshot(dateVal, hrBoOngAssignmentsOf(dateVal)));
  }
  // Snapshot của lượt CHẠY MÁY BÀO THÔ (người chạy máy + thời gian + giờ HC/TC)
  function hrBaoThoSnapshot(dateVal) {
    return workerSnapOf(hrPositionSnapshot(dateVal, hrBaoThoAssignmentsOf(dateVal)));
  }
  // Snapshot của lượt CHỌN NAN THÔ (người chọn nan + thời gian + giờ HC/TC)
  function hrChonNanSnapshot(dateVal) {
    return workerSnapOf(hrPositionSnapshot(dateVal, hrChonNanAssignmentsOf(dateVal)));
  }
  // Đổi tên trường chung (names/timeStr/hours/hc/tc) → tên dùng trong nhật ký vị trí
  function workerSnapOf(s) {
    return {
      worker: s.names,
      workTime: s.timeStr,
      workHours: s.hours,
      workHoursHC: s.hc,
      workHoursTC: s.tc
    };
  }

  // ─── NẠP / LƯU DỮ LIỆU CẮT CHỌN ──────────────────────────────
  function loadXuong2Cuts() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG2_CUTS);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.xuong2CutRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.xuong2CutRecords = []; }
    } else {
      state.xuong2CutRecords = [];
    }
  }

  function saveXuong2Cuts() {
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_CUTS, JSON.stringify(state.xuong2CutRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    // Ghi lịch sử sửa đổi (tóm tắt ai đã thêm/sửa/xóa lượt cắt/chọn nào)
    logDataChange(['xuong2CutRecords']);
    // Ghi file bamboo_data.json NGAY LẶP TỨC (như saveMaterialRecords)
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT CẮT/CHỌN (link SỐNG tới nguyên liệu) ──
  // Ưu tiên giá trị hiện tại của bản ghi nguyên liệu (tự động link); bản ghi
  // nguyên liệu đã bị xóa → dùng số liệu đã lưu (snapshot) khi ghi nhận.
  function cutDisplay(r) {
    const mat = (state.materialRecords || []).find(m => m.id === r.materialId) || null;
    const inputWeight = mat ? materialInputWeightOf(mat) : (Number(r.inputWeight) || 0);
    const klOngLuong = Number(r.klOngLuong) || 0;
    const klCuiDot   = Number(r.klCuiDot)   || 0;
    const klCayLoai  = Number(r.klCayLoai)  || 0;
    // Người cắt + giờ cắt: SỐNG từ Bảng bố trí Nhân Sự theo ngày; mất bố trí → snapshot
    const liveCut = hrCutAssignmentsOf(r.date || '');
    const cutterRows = liveCut.length
      ? liveCut.map(a => ({ name: a.name, time: cutTimeStr(a) }))
      : String(r.cutter || '').split(',').map(s => s.trim()).filter(Boolean)
          .map((name, i) => ({ name, time: String(r.cutTime || '').split(',').map(s => s.trim())[i] || '' }));
    // Giờ cắt: SỐNG từ Bảng bố trí (tách HC/TC theo cửa sổ ca); mất bố trí →
    // snapshot (cutHoursHC/TC của bản mới; cutHours tổng của bản cũ — chưa tách)
    let cutHours = 0, cutHoursHC = null, cutHoursTC = null;
    if (liveCut.length) {
      const sp = sumCutHoursSplit(liveCut, r.date || '');
      cutHours = sp.hc + sp.tc;
      cutHoursHC = sp.hc; cutHoursTC = sp.tc;
    } else if (Number.isFinite(Number(r.cutHoursHC)) || Number.isFinite(Number(r.cutHoursTC))) {
      cutHoursHC = Number(r.cutHoursHC) || 0;
      cutHoursTC = Number(r.cutHoursTC) || 0;
      cutHours = cutHoursHC + cutHoursTC;
      if (!cutHours && Number(r.cutHours) > 0) cutHours = Number(r.cutHours);
    } else if (Number(r.cutHours) > 0) {
      cutHours = Number(r.cutHours); // bản cũ chỉ có tổng (chưa tách HC/TC)
    } else {
      cutHours = snapshotCutHours(r.cutTime);
    }
    return {
      date: r.date || '',
      materialType: mat ? (mat.type || '') : (r.materialType || ''),
      supplier: mat ? (mat.supplier || '') : (r.supplier || ''),
      // Mã NCC: từ Bảng Thông Tin Nhà Cung (khớp mềm tên NCC; mất gốc → theo snapshot)
      supplierCode: mat ? supplierCodeOf(mat.supplier) : supplierCodeOf(r.supplier || ''),
      // Người cắt (từng người kèm giờ) + SỐ GIỜ CẮT ngày (tách HC/TC theo ca)
      cutterRows,
      cutHours,
      cutHoursHC,
      cutHoursTC,
      inputWeight,
      klOngLuong,
      klCuiDot,
      klCayLoai,
      // KL ngọn/ống loại = KL đầu vào − KL ống luồng − KL củi đốt − KL cây loại
      klNgonOngLoai: inputWeight - klOngLuong - klCuiDot - klCayLoai,
      // Tỷ lệ quy đổi = KL ống luồng : KL đầu vào (%)
      ratio: inputWeight > 0 ? (klOngLuong / inputWeight) * 100 : null,
      note: r.note || ''
    };
  }

  // ─── THẺ LAUNCHER: ĐẾM TRÊN THẺ ──────────────────────────────
  function updateXuong2CardCounts() {
    Object.keys(X2_CARD_DEFS).forEach(cardId => {
      const el = document.getElementById(X2_CARD_DEFS[cardId].el);
      if (!el) return;
      const txt = x2CardCountText(cardId);
      el.textContent = txt;
      // Chip "Sắp có" tô XÁM (thẻ chưa có bảng số liệu); khi bổ sung số liệu
      // thật (text khác 'Sắp có') chip tự về màu accent của thẻ đó.
      if (txt === 'Sắp có') el.classList.add('x2-count-soon');
      else el.classList.remove('x2-count-soon');
    });
  }

  function x2CardCountText(cardId) {
    if (cardId === 'x2-cut-card') {
      // Trả lời "tồn nguyên liệu X2 còn lại bao nhiêu" ngay trên mini card:
      // tổng KL các lô đầu vào Xưởng 2 CHƯA có lượt cắt/chọn
      const pending = xuong2PendingInputs();
      if (!pending.length) return 'Hết tồn';
      const totalW = pending.reduce((s, r) => s + materialInputWeightOf(r), 0);
      return `Tồn ${fmtKg(totalW)} kg`;
    }
    // Thẻ "Bổ Ống": cũng cho biết TỒN ỐNG CHỜ BỔ = phần ống CÒN LẠI của các lô
    // Cắt Chọn chưa bổ hết (trả lời "còn bao nhiêu ống chưa bổ")
    if (cardId === 'x2-bo-ong-card') {
      const pending = xuong2PendingOngs();
      if (!pending.length) return 'Hết tồn';
      const totalW = pending.reduce((s, c) => s + boOngRemainingOf(c), 0);
      return `Tồn ${fmtKg(totalW)} kg`;
    }
    // Thẻ "Chạy Máy Bào Thô": số lượt chạy máy đã ghi (+ tổng thanh khi đã có
    // số liệu tự động theo kích thước từ công đoạn Chọn Nan Thô)
    if (cardId === 'x2-bao-tho-card') {
      const list = state.xuong2BaoThoRecords || [];
      if (!list.length) return 'Chưa chạy';
      const known = list.map(baoThoDisplay).filter(d => d.qty != null);
      if (!known.length) return `${list.length} lượt`;
      const totalQty = known.reduce((s, d) => s + d.qty, 0);
      return `${list.length} lượt · ${fmtThanh(totalQty)} thanh`;
    }
    // Thẻ "Chọn Nan Thô": số lượt chọn nan + tổng số thanh đã chọn
    if (cardId === 'x2-chon-nan-tho-card') {
      const list = state.xuong2ChonNanThoRecords || [];
      if (!list.length) return 'Chưa chọn';
      const qty = list.filter(x => !x.external).reduce((s, x) => s + (Number(x.quantity) || 0), 0);
      return `${list.length} lượt · ${fmtThanh(qty)} thanh`;
    }
    // Thẻ "Bào Tinh": số lượt bào + tổng SL thanh ĐẠT (+ tồn thanh lỗi chờ hạ cấp)
    if (cardId === 'x2-bao-tinh-card') {
      const list = state.xuong2BaoTinhRecords || [];
      if (!list.length) return 'Chưa bào';
      const ok = list.reduce((s, r) => s + (Number(r.qtyOk) || 0), 0);
      return `${list.length} lượt · ${fmtThanh(ok)} thanh`;
    }
    // Thẻ mới thêm CHƯA có bảng số liệu → chip "Sắp có" (chức năng bổ sung sau)
    const def = X2_CARD_DEFS[cardId];
    if (def && def.soon) return 'Sắp có';
    // Thẻ "Ép Ván": số lượt ép + tổng thể tích đã ép (m³) — số liệu module Ép Ván
    if (cardId === 'x2-ep-van-card') {
      const list = state.pressRecords || [];
      if (!list.length) return 'Chưa ép';
      const vol = pressVolumeTotalOf(list).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
      return `${list.length} lượt · ${vol} m³`;
    }
    // Thẻ "Than Hóa + Sấy" chứa bảng Kanban lô nan → chip = số lô đang có
    if (cardId === 'x2-than-hoa-card') {
      const n = (state.batches || []).length;
      return `${n.toLocaleString('vi-VN')} lô`;
    }
    return '–';
  }

  // Đồng bộ trạng thái "đang mở" của thẻ (accordion 1 thẻ mở tại 1 thời điểm)
  function syncX2MiniActive() {
    let openId = null;
    Object.keys(X2_CARD_DEFS).forEach(cardId => {
      const c = document.getElementById(cardId);
      if (c && !c.classList.contains('x2-card-hidden')) openId = cardId;
    });
    document.querySelectorAll('.x2-mini-card').forEach(t => {
      const act = t.getAttribute('data-x2-card') === openId;
      t.classList.toggle('x2-mini-active', act);
      t.setAttribute('aria-expanded', act ? 'true' : 'false');
    });
  }

  // ─── POP-UP: NỔI LÊN KHI BẤM THẺ (như tab Nhân Sự) ───────────
  let openX2Card = null;

  // Đặt đỉnh pop-up ngay dưới header — header không bị che / không bị làm mờ
  function x2PositionDetailOverlay() {
    const overlay = document.getElementById('x2-detail-overlay');
    if (!overlay) return;
    const header = document.querySelector('.app-header');
    if (header && typeof header.getBoundingClientRect === 'function') {
      const bottom = header.getBoundingClientRect().bottom;
      if (bottom > 0) overlay.style.top = Math.round(bottom) + 'px';
    }
  }

  function x2OpenCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return false;
    // Bấm lại thẻ đang mở → đóng pop-up (trả về chế độ thu gọn)
    if (openX2Card === card) { x2CloseOpenCard(); return false; }
    // Đóng thẻ đang mở (nếu có) trước khi mở thẻ mới (accordion)
    if (openX2Card) x2CloseOpenCard();
    card.classList.remove('x2-card-hidden');
    card.classList.remove('rate-table-collapsed');
    const content = document.getElementById('x2-detail-content');
    if (content) content.appendChild(card);
    openX2Card = card;
    state.x2OpenCardId = card.id; // để AI + nút Lịch Sử/Xuất Excel dùng chung biết thẻ đang mở
    // Luôn vẽ dữ liệu mới nhất mỗi lần mở — 5 thẻ đã có chức năng (Cắt Chọn,
    // Bổ Ống, Chạy Máy Bào Thô, Chọn Nan Thô); các thẻ "Sắp có" chỉ placeholder.
    if (cardId === 'x2-cut-card') renderXuong2CutCard();
    if (cardId === 'x2-bo-ong-card') renderX2BoOngCard();
    if (cardId === 'x2-bao-tho-card') renderX2BaoThoCard();
    if (cardId === 'x2-chon-nan-tho-card') renderX2ChonNanCard();
    if (cardId === 'x2-bao-tinh-card') renderX2BaoTinhCard();
    if (cardId === 'x2-ep-van-card') renderX2EpVanCard();
    const h4 = card.querySelector && card.querySelector('.planning-card-header h4');
    const titleText = (h4 && typeof h4.textContent === 'string') ? h4.textContent.trim() : '';
    const titleEl = document.getElementById('x2-detail-title');
    if (titleEl) titleEl.textContent = titleText || 'Vị Trí Xưởng 2';
    const overlay = document.getElementById('x2-detail-overlay');
    if (overlay) {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
      x2PositionDetailOverlay();
      if (typeof overlay.focus === 'function') overlay.focus({ preventScroll: true });
    }
    syncX2MiniActive();
    initLucide();
    return true;
  }

  function x2CloseOpenCard() {
    const overlay = document.getElementById('x2-detail-overlay');
    if (!openX2Card) {
      if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
      return;
    }
    const card = openX2Card;
    const stack = document.getElementById('x2-details-stack');
    if (stack) stack.appendChild(card); else document.getElementById('kanban-view')?.appendChild(card);
    card.classList.add('x2-card-hidden');
    openX2Card = null;
    state.x2OpenCardId = null;
    if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
    syncX2MiniActive();
    initLucide();
  }

  // ─── FORM GHI NHẬN LƯỢT CẮT/CHỌN ─────────────────────────────
  // Đổ danh sách nguyên liệu đầu vào của Xưởng 2 vào ô chọn.
  // CHỈ hiện các lô CHƯA cắt/chọn (lô đã cắt tự ẩn); đang SỬA 1 lượt cắt
  // → vẫn giữ lại đúng lô của lượt đó để chỉnh số liệu.
  function fillXuong2CutMaterialOptions() {
    const sel = document.getElementById('x2-cut-material');
    if (!sel) return;
    const cutIds = cutMaterialIds();
    const editing = state.x2CutEditId ? (state.xuong2CutRecords || []).find(r => r.id === state.x2CutEditId) : null;
    const mats = xuong2MaterialInputs().filter(r => !cutIds.has(r.id) || (editing && r.id === editing.materialId));
    let html = mats.map(r => {
      const w = materialInputWeightOf(r);
      return `<option value="${escapeHTML(r.id)}">${escapeHTML(r.type || 'Nguyên liệu')} · NCC ${escapeHTML(r.supplier || '—')} · ${formatDateDDMMYY(r.date)} · ${fmtKg(w)} kg</option>`;
    }).join('');
    if (!html) html = `<option value="">— Hết lô chờ cắt (mọi lô Xưởng 2 đã được cắt/chọn) —</option>`;
    sel.innerHTML = html;
    updateXuong2CutLinked();
  }

  // Ô chọn lô đổi / đang sửa: mặc định Ngày cắt theo ngày nhập nguyên liệu (ghi mới).
  // (Đã gỡ khối "thông tin lặp lại" và dòng tự tính dưới form — bảng lịch sử
  //  + bảng công suất là nơi hiển thị các số liệu này.)
  function updateXuong2CutLinked() {
    const sel = document.getElementById('x2-cut-material');
    const mat = (state.materialRecords || []).find(r => r.id === (sel ? sel.value : '')) || null;
    if (!state.x2CutEditId && mat) {
      const d = document.getElementById('x2-cut-date');
      if (d && !d.value) d.value = mat.date || todayISO();
    }
  }

    // KL ngọn/ống loại TỰ TÍNH = KL đầu vào − KL ống luồng − KL củi đốt − KL cây loại
    // (đã gỡ dòng hiển thị tự tính dưới form — chỉ còn dùng trong handleXuong2CutSubmit)

  // Form về trạng thái "ghi mới" (sau Lưu / nút Làm Mới Form)
  function resetXuong2CutForm() {
    state.x2CutEditId = null;
    ['x2-cut-ongluong', 'x2-cut-cuidot', 'x2-cut-cayloai', 'x2-cut-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const d = document.getElementById('x2-cut-date');
    if (d) d.value = '';
    fillXuong2CutMaterialOptions(); // gồm cả updateXuong2CutLinked
    syncX2CutEditBanner();
  }

  // ─── LƯU FORM (THÊM / SỬA) ───────────────────────────────────
  function handleXuong2CutSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x2-cut-material');
    const materialId = sel ? sel.value : '';
    const mat = (state.materialRecords || []).find(r => r.id === materialId) || null;
    if (!mat) { showToast('Hãy chọn lần nhập nguyên liệu đầu vào của Xưởng 2!', 'error'); return; }

    const dateEl = document.getElementById('x2-cut-date');
    const dateVal = (dateEl && dateEl.value) || '';
    if (!dateVal) { showToast('Ngày cắt/chọn không được để trống!', 'error'); return; }

    const val = id => Number((document.getElementById(id) || {}).value) || 0;
    const klOngLuong = val('x2-cut-ongluong');
    const klCuiDot   = val('x2-cut-cuidot');
    const klCayLoai  = val('x2-cut-cayloai');
    if (klOngLuong < 0 || klCuiDot < 0 || klCayLoai < 0) {
      showToast('Các khối lượng phải là số không âm!', 'error'); return;
    }
    const inputWeight = materialInputWeightOf(mat);
    const klNgonOngLoai = inputWeight - klOngLuong - klCuiDot - klCayLoai;
    if (klNgonOngLoai < 0) {
      showToast('KL ống luồng + củi đốt + cây loại đã vượt KL đầu vào — kiểm tra lại!', 'error');
      return;
    }
    const note = (((document.getElementById('x2-cut-note') || {}).value) || '').trim();
    // NGƯỜI CẮT + THỜI GIAN CẮT: TỰ ĐỘNG từ Bảng bố trí Nhân Sự (vị trí "cắt" —
    // Xưởng 2, đúng ngày cắt) — không điền tay; lưu snapshot phòng khi bố trí bị xóa
    const snap = hrCutSnapshot(dateVal);

    // TỰ ĐỘNG LINK: snapshot nhà cung cấp / mã số / KL đầu vào từ lần nhập NL
    const payload = {
      materialId,
      materialType: mat.type || '',
      supplier: mat.supplier || '',
      code: materialCodeOf(mat),
      inputWeight,
      date: dateVal,
      week: materialWeekLabel(dateVal),
      klOngLuong, klCuiDot, klCayLoai, klNgonOngLoai,
      cutter: snap.cutter, cutTime: snap.cutTime,
      cutHours: snap.cutHours, cutHoursHC: snap.cutHoursHC, cutHoursTC: snap.cutHoursTC,
      note
    };

    if (state.x2CutEditId) {
      const rec = (state.xuong2CutRecords || []).find(r => r.id === state.x2CutEditId);
      if (!rec) { showToast('Không tìm thấy lượt cắt/chọn cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong2Cuts();
      showToast('Đã cập nhật lượt cắt/chọn!', 'success');
    } else {
      (state.xuong2CutRecords = state.xuong2CutRecords || []).push({
        id: 'x2cut-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong2Cuts();
      showToast('Đã ghi lượt cắt/chọn!', 'success');
    }

    resetXuong2CutForm();
    renderXuong2CutCard();
  }

  // ─── SỬA / XÓA LƯỢT CẮT/CHỌN (bảng lịch sử) ──────────────────
  function editXuong2Cut(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2CutRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x2CutEditId = id;
    fillXuong2CutMaterialOptions(); // có fallback nếu bản ghi NL gốc đã xóa
    const sel = document.getElementById('x2-cut-material');
    if (sel) sel.value = rec.materialId || '';
    updateXuong2CutLinked();
    const d = document.getElementById('x2-cut-date');
    if (d) d.value = rec.date || '';
    const ong = document.getElementById('x2-cut-ongluong');
    if (ong) ong.value = (rec.klOngLuong ?? '') === '' ? '' : String(rec.klOngLuong);
    const cui = document.getElementById('x2-cut-cuidot');
    if (cui) cui.value = (rec.klCuiDot ?? '') === '' ? '' : String(rec.klCuiDot);
    const cay = document.getElementById('x2-cut-cayloai');
    if (cay) cay.value = (rec.klCayLoai ?? '') === '' ? '' : String(rec.klCayLoai);
    const note = document.getElementById('x2-cut-note');
    if (note) note.value = rec.note || '';
    syncX2CutEditBanner();
  }

  function deleteXuong2Cut(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2CutRecords || []).find(r => r.id === id);
    if (!rec) return;
    const d = cutDisplay(rec);
    // Cảnh báo nếu lô ống của lượt cắt này đã được bổ → lượt bổ ống sẽ mất nguồn
    // (vẫn giữ số liệu snapshot, nhưng nên biết trước khi xóa)
    const linked = (state.xuong2BoOngRecords || []).filter(r => r.cutId === id).length;
    const warn = linked ? `\nLưu ý: có ${linked} lượt BỔ ỐNG đang link lô ống này (số liệu bổ ống vẫn giữ, nhưng mất link nguồn).` : '';
    if (!confirm(`Xóa lượt cắt/chọn ngày ${formatDateDDMMYY(rec.date)} (NCC ${d.supplier || '—'})?${warn}`)) return;
    trackDeleted('xuong2CutRecords', id); // tombstone: không bị mây/máy khác hồi sinh
    state.xuong2CutRecords = (state.xuong2CutRecords || []).filter(r => r.id !== id);
    if (state.x2CutEditId === id) resetXuong2CutForm(); // đang sửa chính nó → về form ghi mới
    saveXuong2Cuts();
    renderXuong2CutCard();
    showToast('Đã xóa lượt cắt/chọn!', 'success');
  }

  function syncX2CutEditBanner() {
    const banner = document.getElementById('x2-cut-edit-banner');
    if (!banner) return;
    const txt = document.getElementById('x2-cut-edit-text');
    if (state.x2CutEditId) {
      const rec = (state.xuong2CutRecords || []).find(r => r.id === state.x2CutEditId);
      txt.textContent = rec
        ? `Đang sửa lượt cắt/chọn ngày ${formatDateDDMMYY(rec.date)} — bấm "Lưu Lượt Cắt/Chọn" hoặc "Làm Mới Form" để thoát.`
        : 'Đang sửa lượt cắt/chọn.';
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  // ─── RENDER BẢNG CHI TIẾT CẮT/CHỌN ───────────────────────────
  function renderXuong2CutCard() {
    fillXuong2CutMaterialOptions();
    renderX2StockBar();
    renderX2RateBar(); // Định mức công suất theo tháng (cho cột Hiệu suất)
    renderXuong2CutStats();
    renderXuong2CutTable(); // nhóm theo ngày: nhóm ngày (chung) + các dòng lô
    syncX2CutEditBanner(); // banner "Đang sửa" luôn đồng bộ trạng thái
    updateXuong2CardCounts();
  }


  // Thống kê nhanh của vị trí Cắt Chọn
  // (Tồn chờ cắt hiển thị riêng ở THANH TRÊN CÙNG thẻ — x2-stock-bar)
  function renderXuong2CutStats() {
    const box = document.getElementById('x2-cut-stats');
    if (!box) return;
    const disp = (state.xuong2CutRecords || []).map(cutDisplay);
    const totalIn   = disp.reduce((s, d) => s + d.inputWeight, 0);
    const totalOng  = disp.reduce((s, d) => s + d.klOngLuong, 0);
    const totalLoai = disp.reduce((s, d) => s + Math.max(0, d.klNgonOngLoai) + d.klCuiDot + d.klCayLoai, 0);
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${disp.length}</span>
        <span class="material-stat-label">Lượt cắt/chọn</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${Math.round(totalIn).toLocaleString('vi-VN')}</span>
        <span class="material-stat-label">Tổng KL đầu vào (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalOng)}</span>
        <span class="material-stat-label">Tổng KL ống luồng (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalLoai)}</span>
        <span class="material-stat-label">Tổng KL loại (củi + cây + ngọn/ống)</span>
      </div>`;
  }

  // ─── BẢNG LỊCH SỬ CẮT/CHỌN — NHÓM THEO NGÀY (theo mẫu Excel) ─
  // DÒNG NHÓM NGÀY: Ngày | Người cắt | Giờ cắt HC | TC | Công suất thực tế |
  // Hiệu suất (= Công suất thực tế ÷ Công suất định mức của tháng).
  //   Công suất thực tế = TỔNG KL ĐẦU VÀO ÷ tổng số giờ làm việc (kg/h) —
  //   tổng giờ làm việc lấy từ tab Nhân Sự (Bảng bố trí/chấm công vị trí Cắt).
  // Sau đó các DÒNG LÔ trong ngày: Loại NL | NCC | KL đầu vào | KL ống đạt |
  // KL củi đốt | KL cây loại | KL ngọn/ống loại | Tỷ lệ QĐ | Giá ống tương đương |
  // Thao tác. Nguồn giờ cắt: Bảng bố trí Nhân Sự (dữ liệu SỐNG); mất bố trí → snapshot.
  function renderXuong2CutTable() {
    const box = document.getElementById('x2-day-cards');
    if (!box) return;
    const cuts = [...(state.xuong2CutRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const countEl = document.getElementById('x2-cut-table-count');
    if (countEl) countEl.textContent = cuts.length ? `${cuts.length} lượt đã cắt/chọn` : '';
    if (!cuts.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="scissors"></i>
          <div>Chưa có lượt cắt/chọn nào.<br>Chọn <strong>nguyên liệu đầu vào của Xưởng 2</strong> ở form trên rồi bấm <strong>Lưu Lượt Cắt/Chọn</strong>.</div>
        </div>`;
      initLucide();
      return;
    }
    // Gộp theo ngày (đã sort mới nhất lên đầu — Map giữ đúng thứ tự nhóm)
    const groups = new Map();
    cuts.forEach(r => {
      const key = r.date || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let html = '';
    for (const [date, list] of groups) {
      const first = cutDisplay(list[0]); // thông tin CHUNG của ngày (người cắt/giờ)
      let totalIn = 0;
      const rowsHtml = list.map(r => {
        const d = cutDisplay(r);
        totalIn += d.inputWeight;
        const ratioTxt = d.ratio == null ? '—' : `${fmtRatio(d.ratio)}%`;
        return `
        <tr class="x2-day-row" data-x2-cut-row="${escapeHTML(r.id)}">
          <td><strong>${escapeHTML(d.materialType || '—')}</strong></td>
          <td>${escapeHTML(d.supplier || '—')}${d.note ? `<div class="x2-row-note">${escapeHTML(d.note)}</div>` : ''}</td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(d.inputWeight)}</strong></td>
          <td class="text-right">${fmtKg(d.klOngLuong)}</td>
          <td class="text-right">${fmtKg(d.klCuiDot)}</td>
          <td class="text-right">${fmtKg(d.klCayLoai)}</td>
          <td class="text-right"><strong style="color:#b45309;">${fmtKg(d.klNgonOngLoai)}</strong></td>
          <td class="text-right"><strong style="color:#0f766e;" title="Tỷ lệ quy đổi = KL ống luồng : KL đầu vào">${ratioTxt}</strong></td>
          <td class="text-right"><span style="color:var(--text-muted);" title="Giá ống tương đương — bổ sung sau">—</span></td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-x2-cut-edit="${escapeHTML(r.id)}"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-x2-cut-delete="${escapeHTML(r.id)}"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
      }).join('');
      // ── ĐẦU THẺ: thông tin chung của ngày + bảng lô trong thẻ
      const hours = first.cutHours || 0; // tổng giờ làm việc (HC + TC) từ Nhân Sự
      const cap = hours > 0 ? (totalIn / hours) : null; // Công suất thực tế (kg/h)
      const rate = capRateOf(date); // Công suất định mức của tháng (kg/h)
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null; // Hiệu suất (%)
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ cắt hoặc chưa đặt Định mức công suất cho tháng này)'
        : `Hiệu suất = Công suất thực tế (${fmtKg(cap)} kg/h) ÷ Công suất định mức tháng ${Number(String(date).slice(5))} (${fmtKg(rate)} kg/h)`;
      const hcTxt = first.cutHoursHC != null ? fmtRatio(first.cutHoursHC) : '—';
      const tcTxt = first.cutHoursTC != null ? fmtRatio(first.cutHoursTC) : '—';
      const cutters = first.cutterRows.filter(x => x.name);
      const cuttersMain = cutters.length
        ? `${escapeHTML(cutters[0].name)}${cutters[0].time ? ` (${escapeHTML(cutters[0].time)})` : ''}`
        : '';
      const cuttersMore = cutters.length > 1
        ? `<em class="x2-day-cutters-more" title="Người khác cùng ngày: ${escapeHTML(cutters.slice(1).map(x => `${x.name}${x.time ? ` (${x.time})` : ''}`).join(', '))}">+${cutters.length - 1} người khác</em>`
        : '';
      html += `
        <div class="x2-day-card">
          <div class="x2-day-head">
            <span class="x2-day-date"><i data-lucide="calendar-days"></i> ${formatDateDDMMYY(date)}</span>
            <span class="x2-day-cutters" title="Người cắt/chọn tự động từ Bảng bố trí Nhân Sự (vị trí Cắt — Xưởng 2)"><i data-lucide="users"></i> ${cuttersMain || '<em style="color:var(--text-muted);">chưa bố trí người cắt</em>'}${cuttersMore}</span>
            <span class="x2-day-hours" title="Số giờ cắt = tổng giờ công vị trí Cắt trong ngày (từ tab Nhân Sự), tách giờ hành chính (HC) / giờ tăng ca (TC)">Giờ cắt: <span class="x2-hours-hc">${hcTxt}h HC</span><span class="x2-hours-tc">${tcTxt}h TC</span></span>
            <span class="x2-day-cap" title="Công suất thực tế = Tổng KL đầu vào (${fmtKg(totalIn)} kg) ÷ tổng số giờ làm việc (${fmtRatio(hours)} h)">Công suất thực tế: <strong>${cap != null ? `${fmtKg(cap)} kg/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
          </div>
          <table class="data-table x2-day-table">
            <thead>
              <tr>
                <th>Loại nguyên liệu</th>
                <th>Nhà cung cấp</th>
                <th class="text-right">KL đầu vào</th>
                <th class="text-right">KL ống đạt</th>
                <th class="text-right">KL củi đốt</th>
                <th class="text-right">KL cây loại</th>
                <th class="text-right">KL ngọn/ống loại</th>
                <th class="text-right">Tỷ lệ QĐ</th>
                <th class="text-right">Giá ống tương đương</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }
    box.innerHTML = html;
    initLucide();
  }

  // Thu gọn / mở rộng BẢNG LỊCH SỬ cắt/chọn (form vẫn hiện để tiếp tục nhập)
  function toggleX2CutTable() {
    const wrap = document.getElementById('x2-cut-table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('x2-cut-collapsed');
    initLucide();
  }

  // ═══════════════════════════════════════════════════════════
  // VỊ TRÍ: BỔ ỐNG — Xưởng 2 (thẻ launcher tab Công Đoạn)
  // ═══════════════════════════════════════════════════════════
  // Nguồn "lô ống" = các lượt CẮT CHỌN đã ghi (xuong2CutRecords): mỗi lượt cắt
  // cho ra 1 LÔ ỐNG (KL ống luồng). Mỗi lô ống chỉ bổ 1 lần — lô đã bổ tự ẩn
  // khỏi ô chọn (giống cách Cắt Chọn ẩn lô nguyên liệu đã cắt).
  //   • Nhập: Lô ống chọn · Ngày bổ · KL ống loại
  //   • KL ỐNG BỔ tự tính = KL ống đầu vào (của lô cắt) − KL ống loại
  //   • NGƯỜI BỔ + THỜI GIAN BỔ tự động từ Bảng bố trí Nhân Sự (vị trí chứa
  //     "bổ ống" — Xưởng 2, đúng ngày; giờ tách HC/TC theo cửa sổ ca)
  //   • ĐỊNH MỨC CÔNG SUẤT BỔ ỐNG theo THÁNG (kg/h) → Hiệu suất
  //     = Công suất thực tế ÷ Định mức
  // Dữ liệu: state.xuong2BoOngRecords (localStorage + file + mây, có tombstone).

  // Danh sách lượt cắt/chọn (mới nhất lên đầu — dùng chung cho bảng + ô chọn)
  function sortedCutRecords() {
    return [...(state.xuong2CutRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }
  function cutRecordOf(id) {
    return (state.xuong2CutRecords || []).find(r => r.id === id) || null;
  }
  // KL ống luồng (kg) của 1 lượt cắt/chọn = "KL ống đạt" của công đoạn Cắt Chọn
  function cutOngWeight(rec) {
    return Number(rec && rec.klOngLuong) || 0;
  }
  // SỐ LƯỢNG ỐNG (kg) ĐÃ đem bổ của 1 lô cắt = tổng "KL ống đầu vào" của MỌI
  // lượt bổ ống link lô đó. excludeId = bỏ qua 1 lượt (dùng khi SỬA: phần của
  // chính lượt đang sửa được TRẢ LẠI để người dùng nhập lại).
  function boOngUsedOf(cutId, excludeId) {
    if (!cutId) return 0;
    return (state.xuong2BoOngRecords || [])
      .filter(r => r.cutId === cutId && r.id !== excludeId)
      .reduce((s, r) => s + boOngInputOf(r), 0);
  }
  // KL ống đầu vào (đem bổ) của 1 lượt bổ ống (bản cũ thiếu trường → suy ra)
  function boOngInputOf(r) {
    const v = Number(r && r.inputOng);
    if (Number.isFinite(v)) return v;
    return (Number(r && r.klOngBo) || 0) + (Number(r && r.klOngLoai) || 0);
  }
  // PHẦN ỐNG CÒN LẠI của 1 lô cắt (kg) = KL ống luồng của lô − đã đem bổ
  function boOngRemainingOf(cut, excludeId) {
    if (!cut) return 0;
    return Math.max(0, cutOngWeight(cut) - boOngUsedOf(cut.id, excludeId));
  }
  // TỒN ỐNG CHỜ BỔ = các lô ống CÒN phần CHƯA bổ (KL ống > 0). Bổ 1 PHẦN thì lô
  // vẫn nằm trong ô chọn (kèm số kg còn lại) cho tới khi bổ hết.
  function xuong2PendingOngs() {
    return sortedCutRecords().filter(c => boOngRemainingOf(c) > 0);
  }

  // ─── ĐỊNH MỨC CÔNG SUẤT BỔ ỐNG (kg/giờ) THEO TỪNG THÁNG ──────
  // Người quản lý đặt riêng cho từng tháng (VD tháng 9 = 2500 kg/giờ, tháng 10 =
  // 2700 kg/giờ) — nguồn cho cột "Hiệu suất" của thẻ ngày Bổ Ống.
  function loadX2BoOngRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_BO_ONG_RATE);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        state.x2BoOngRates = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
      } catch (e) { state.x2BoOngRates = {}; }
    } else {
      state.x2BoOngRates = {};
    }
  }

  function saveX2BoOngRates() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_BO_ONG_RATE, JSON.stringify(state.x2BoOngRates || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // Định mức công suất bổ ống của tháng chứa dateVal (kg/giờ) — null nếu chưa đặt
  function boOngRateOf(dateVal) {
    const key = String(dateVal || '').slice(0, 7);
    const v = Number((state.x2BoOngRates || {})[key]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  // Lưu định mức 1 tháng (từ thanh định mức trên bảng Bổ Ống)
  function handleX2BoOngRateSave() {
    if (!requireEditPermission()) return;
    const monthEl = document.getElementById('x2-ong-rate-month');
    const valEl = document.getElementById('x2-ong-rate-value');
    const month = String((monthEl && monthEl.value) || '').trim();
    const v = Number((valEl && valEl.value) || 0);
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Chưa chọn tháng để lưu định mức!', 'error'); return; }
    if (!Number.isFinite(v) || v <= 0) { showToast('Định mức công suất phải là số kg/giờ lớn hơn 0!', 'error'); return; }
    (state.x2BoOngRates = state.x2BoOngRates || {})[month] = v;
    saveX2BoOngRates();
    renderX2BoOngRateBar();
    renderX2BoOngTable(); // cột Hiệu suất tự cập nhật
    showToast(`Đã lưu định mức bổ ống ${fmtKg(v)} kg/giờ cho tháng ${month.slice(5)}!`, 'success');
  }

  // Thanh ĐỊNH MỨC: chọn tháng (các tháng có lượt bổ + tháng đã đặt định mức +
  // tháng hiện tại) + dãy chip tháng ĐÃ ĐẶT (bấm chip để nạp vào ô nhập chỉnh lại)
  function renderX2BoOngRateBar() {
    const selEl = document.getElementById('x2-ong-rate-month');
    const valInput = document.getElementById('x2-ong-rate-value');
    if (!selEl) return;
    const months = new Set([
      ...(state.xuong2BoOngRecords || []).map(r => String(r.date || '').slice(0, 7)),
      ...Object.keys(state.x2BoOngRates || {}),
      new Date().toISOString().slice(0, 7)
    ]);
    const curMonth = selEl.value || new Date().toISOString().slice(0, 7);
    const list = [...months].filter(Boolean).sort((a, b) => b.localeCompare(a));
    selEl.innerHTML = list
      .map(m => `<option value="${escapeHTML(m)}">Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</option>`).join('');
    selEl.value = months.has(curMonth) ? curMonth : list[0] || '';
    if (valInput) {
      const v = Number((state.x2BoOngRates || {})[selEl.value]);
      valInput.value = Number.isFinite(v) && v > 0 ? v : '';
    }
    const chips = document.getElementById('x2-ong-rate-chips');
    if (chips) {
      const keys = Object.keys(state.x2BoOngRates || {})
        .filter(k => Number(state.x2BoOngRates[k]) > 0)
        .sort((a, b) => b.localeCompare(a));
      chips.innerHTML = keys.map(k => `<button type="button" class="x2-rate-chip" data-x2-ong-rate="${escapeHTML(k)}" title="Bấm để nạp định mức tháng này vào ô nhập để sửa lại">T${Number(k.slice(5))} = ${fmtKg(state.x2BoOngRates[k])} kg/h</button>`).join('');
    }
    initLucide();
  }

  // ─── NẠP / LƯU DỮ LIỆU BỔ ỐNG ────────────────────────────────
  function loadXuong2BoOng() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG2_BO_ONG);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.xuong2BoOngRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.xuong2BoOngRecords = []; }
    } else {
      state.xuong2BoOngRecords = [];
    }
  }

  function saveXuong2BoOng() {
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_BO_ONG, JSON.stringify(state.xuong2BoOngRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    logDataChange(['xuong2BoOngRecords']); // ghi lịch sử sửa đổi
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT BỔ ỐNG (link SỐNG tới lô cắt) ──
  // Ưu tiên số liệu hiện tại của lượt Cắt Chọn (KL ống luồng có thể vừa sửa);
  // lượt cắt đã bị xóa → dùng số liệu đã lưu (snapshot) khi ghi nhận.
  function boOngDisplay(r) {
    const cut = cutRecordOf(r.cutId);
    const cutD = cut ? cutDisplay(cut) : null;
    // KL ống của CẢ LÔ (sống theo lượt Cắt Chọn; lượt cắt đã xóa → snapshot lotOng)
    const lotOng = cutD ? cutD.klOngLuong : (Number(r.lotOng) || boOngInputOf(r));
    // KL ống ĐEM BỔ trong lượt này (bổ 1 phần thì nhỏ hơn KL ống của lô)
    const inputOng = boOngInputOf(r);
    const klOngLoai = Number(r.klOngLoai) || 0;
    // KL ống bổ (đạt) = KL ống đem bổ − KL ống loại (không âm)
    const klOngBo = Math.max(0, inputOng - klOngLoai);
    // Phần ống CÒN LẠI của lô SAU lượt này (vẫn hiện trong ô chọn để bổ tiếp)
    const lotRest = Math.max(0, lotOng - boOngUsedOf(r.cutId));
    // Người bổ + giờ bổ: SỐNG từ Bảng bố trí Nhân Sự theo ngày; mất bố trí → snapshot
    const live = hrBoOngAssignmentsOf(r.date || '');
    const workerRows = live.length
      ? live.map(a => ({ name: a.name, time: posTimeStr(a) }))
      : String(r.worker || '').split(',').map(s => s.trim()).filter(Boolean)
          .map((name, i) => ({ name, time: String(r.workTime || '').split(',').map(s => s.trim())[i] || '' }));
    // Giờ bổ: SỐNG từ Bảng bố trí (tách HC/TC theo cửa sổ ca); mất bố trí → snapshot
    let workHours = 0, workHoursHC = null, workHoursTC = null;
    if (live.length) {
      const sp = sumPosHoursSplit(live, r.date || '');
      workHours = sp.hc + sp.tc;
      workHoursHC = sp.hc; workHoursTC = sp.tc;
    } else if (Number.isFinite(Number(r.workHoursHC)) || Number.isFinite(Number(r.workHoursTC))) {
      workHoursHC = Number(r.workHoursHC) || 0;
      workHoursTC = Number(r.workHoursTC) || 0;
      workHours = workHoursHC + workHoursTC;
      if (!workHours && Number(r.workHours) > 0) workHours = Number(r.workHours);
    } else if (Number(r.workHours) > 0) {
      workHours = Number(r.workHours); // bản cũ chỉ có tổng (chưa tách HC/TC)
    } else {
      workHours = snapshotCutHours(r.workTime);
    }
    return {
      date: r.date || '',
      materialType: cutD ? cutD.materialType : (r.materialType || ''),
      supplier: cutD ? cutD.supplier : (r.supplier || ''),
      cutDate: cut ? (cut.date || '') : (r.cutDate || ''),
      lotOng,
      lotRest,
      inputOng,
      klOngLoai,
      klOngBo,
      // Tỷ lệ đạt = KL ống bổ : KL ống đem bổ (%)
      ratio: inputOng > 0 ? (klOngBo / inputOng) * 100 : null,
      workerRows,
      workHours,
      workHoursHC,
      workHoursTC
    };
  }

  // ─── TỒN ỐNG CHỜ BỔ (thanh gọn TRÊN CÙNG thẻ Bổ Ống) ─────────
  function renderX2BoOngStockBar() {
    const bar = document.getElementById('x2-ong-stock-bar');
    if (!bar) return;
    const pending = xuong2PendingOngs();
    const totalRest = pending.reduce((s, c) => s + boOngRemainingOf(c), 0);
    if (!pending.length) {
      bar.innerHTML = `<span class="x2-stock-title" title="Mọi lô ống của Cắt Chọn đã được bổ hết"><i data-lucide="check-circle-2"></i> Tồn ống chờ bổ: <strong>Hết tồn</strong></span>`;
    } else {
      bar.innerHTML = `<span class="x2-stock-title" title="Phần ống CÒN LẠI của các lô Cắt Chọn chưa bổ hết — lô bổ 1 phần vẫn nằm trong ô chọn cho tới khi hết ống"><i data-lucide="boxes"></i> Tồn ống chờ bổ: <strong>${pending.length} lô · ${fmtKg(totalRest)} kg còn lại</strong></span>`;
    }
    initLucide();
  }

  // ─── TỒN NGUYÊN LIỆU CHỜ CẮT (thanh gọn TRÊN CÙNG thẻ) ────────
  // Trả lời "tồn nguyên liệu Xưởng 2 còn lại bao nhiêu" — MỘT Ô NHỎ tóm tắt
  // số lô + tổng kg (chi tiết từng lô đã có ở ô chọn trong form).
  function renderX2StockBar() {
    const bar = document.getElementById('x2-stock-bar');
    if (!bar) return;
    const pending = xuong2PendingInputs();
    const totalW = pending.reduce((s, r) => s + materialInputWeightOf(r), 0);
    if (!pending.length) {
      bar.innerHTML = `<span class="x2-stock-title" title="Tất cả lô nguyên liệu Xưởng 2 đã được cắt/chọn"><i data-lucide="check-circle-2"></i> Tồn chờ cắt: <strong>Hết tồn</strong></span>`;
    } else {
      bar.innerHTML = `<span class="x2-stock-title" title="Tổng khối lượng các lô nguyên liệu Xưởng 2 CHƯA được cắt/chọn (chi tiết từng lô ở ô chọn trong form)"><i data-lucide="boxes"></i> Tồn chờ cắt: <strong>${pending.length} lô · ${fmtKg(totalW)} kg</strong></span>`;
    }
    initLucide();
  }

  // ─── FORM GHI NHẬN LƯỢT BỔ ỐNG ───────────────────────────────
  // Đổ danh sách LÔ ỐNG (từ các lượt Cắt Chọn) vào ô chọn — mỗi lô hiện kèm
  // PHẦN ỐNG CÒN LẠI. Lô bổ 1 PHẦN vẫn nằm trong danh sách cho tới khi bổ hết;
  // đang SỬA 1 lượt bổ → vẫn giữ lại đúng lô ống của lượt đó.
  function fillXuong2BoOngOptions() {
    const sel = document.getElementById('x2-bo-ong-cut');
    if (!sel) return;
    const editing = state.x2BoOngEditId
      ? (state.xuong2BoOngRecords || []).find(r => r.id === state.x2BoOngEditId)
      : null;
    const editId = editing ? editing.id : null;
    const cuts = sortedCutRecords().filter(c => boOngRemainingOf(c, editId) > 0 || (editing && c.id === editing.cutId));
    let html = cuts.map(c => {
      const d = cutDisplay(c);
      const rest = boOngRemainingOf(c, editId);
      return `<option value="${escapeHTML(c.id)}">${escapeHTML(d.materialType || 'Ống luồng')} · NCC ${escapeHTML(d.supplier || '—')} · cắt ${formatDateDDMMYY(c.date)} · còn ${fmtKg(rest)} / ${fmtKg(d.klOngLuong)} kg</option>`;
    }).join('');
    if (!html) html = `<option value="">— Hết lô ống chờ bổ (mọi lô Cắt Chọn đã bổ hết) —</option>`;
    sel.innerHTML = html;
    updateXuong2BoOngLinked(true);
  }

  // Ô chọn lô ống đổi (hoặc đang sửa): mặc định Ngày bổ theo ngày cắt/chọn và
  // ĐIỀN SẴN ô "KL Ống Bổ" = PHẦN CÒN LẠI của lô (bổ hết lô = không phải sửa gì);
  // ngày đó chỉ bổ 1 phần thì sửa lại số nhỏ hơn → phần dư vẫn ở lại ô chọn.
  // autoFillDefault = false (đang gõ số) → KHÔNG ghi đè số người dùng đã nhập.
  function updateXuong2BoOngLinked(autoFillDefault) {
    const sel = document.getElementById('x2-bo-ong-cut');
    const cut = cutRecordOf(sel ? sel.value : '');
    const editing = state.x2BoOngEditId
      ? (state.xuong2BoOngRecords || []).find(r => r.id === state.x2BoOngEditId)
      : null;
    if (!editing && cut) {
      const d = document.getElementById('x2-bo-ong-date');
      if (d && !d.value) d.value = cut.date || todayISO();
      if (autoFillDefault) {
        const boEl = document.getElementById('x2-bo-ong-bo');
        if (boEl) boEl.value = String(Number(boOngRemainingOf(cut).toFixed(2)));
      }
    }
    renderX2BoOngCalc(cut);
  }

  // Ô TỰ TÍNH: Còn lại của lô · Ống bổ đạt (= KL ống bổ − KL ống loại) ·
  // Còn sau lượt (phần dư sẽ vẫn hiện trong ô chọn để bổ tiếp)
  function renderX2BoOngCalc(cut) {
    const box = document.getElementById('x2-bo-ong-calc');
    if (!box) return;
    if (!cut) {
      box.innerHTML = `<span class="x2-ong-calc-label">Chọn lô ống để xem khối lượng</span>`;
      return;
    }
    const editing = state.x2BoOngEditId
      ? (state.xuong2BoOngRecords || []).find(r => r.id === state.x2BoOngEditId)
      : null;
    const rest = boOngRemainingOf(cut, editing ? editing.id : null); // còn lại TRƯỚC lượt này
    const bo = Number((document.getElementById('x2-bo-ong-bo') || {}).value) || 0;
    const loai = Number((document.getElementById('x2-bo-ong-loai') || {}).value) || 0;
    const dat = Math.max(0, bo - loai);      // ống bổ đạt
    const after = rest - bo;                 // còn sau lượt (âm = nhập vượt)
    box.innerHTML = `
      <span class="x2-ong-calc-item x2-ong-calc-in" title="Phần ống của lô CHƯA bổ (trước lượt này)"><span class="x2-ong-calc-label">Còn lại của lô:</span><strong>${fmtKg(rest)} kg</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-bo" title="KL ống bổ đạt = KL ống đem bổ − KL ống loại"><span class="x2-ong-calc-label">Ống bổ đạt:</span><strong>${fmtKg(dat)} kg</strong><em class="x2-ong-calc-eq">(= ${fmtKg(bo)} − ${fmtKg(loai)})</em></span>
      <span class="x2-ong-calc-item x2-ong-calc-after" title="Phần ống dư của lô sau lượt này — vẫn hiện trong ô chọn để bổ tiếp"><span class="x2-ong-calc-label">Còn sau lượt:</span><strong${after < 0 ? ' style="color:#dc2626;"' : ''}>${fmtKg(after)} kg</strong></span>`;
  }

  // Form về trạng thái "ghi mới" (sau Lưu / nút Làm Mới Form)
  function resetXuong2BoOngForm() {
    state.x2BoOngEditId = null;
    ['x2-bo-ong-bo', 'x2-bo-ong-loai'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const d = document.getElementById('x2-bo-ong-date');
    if (d) d.value = '';
    fillXuong2BoOngOptions(); // gồm cả updateXuong2BoOngLinked (điền sẵn phần còn lại)
    syncX2BoOngEditBanner();
  }

  // ─── LƯU FORM BỔ ỐNG (THÊM / SỬA) ────────────────────────────
  function handleXuong2BoOngSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x2-bo-ong-cut');
    const cutId = sel ? sel.value : '';
    const cut = cutRecordOf(cutId);
    if (!cut) { showToast('Hãy chọn lô ống (từ công đoạn Cắt Chọn)!', 'error'); return; }

    const dateEl = document.getElementById('x2-bo-ong-date');
    const dateVal = (dateEl && dateEl.value) || '';
    if (!dateVal) { showToast('Ngày bổ không được để trống!', 'error'); return; }

    const inputOng = Number((document.getElementById('x2-bo-ong-bo') || {}).value) || 0;
    if (!Number.isFinite(inputOng) || inputOng <= 0) { showToast('KL ống bổ phải là số lớn hơn 0!', 'error'); return; }
    const klOngLoai = Number((document.getElementById('x2-bo-ong-loai') || {}).value) || 0;
    if (klOngLoai < 0) { showToast('KL ống loại phải là số không âm!', 'error'); return; }
    if (klOngLoai > inputOng) { showToast('KL ống loại không được lớn hơn KL ống bổ!', 'error'); return; }
    const klOngBo = inputOng - klOngLoai;
    // BỔ 1 PHẦN: số lượng bổ không được VƯỢT phần ống CÒN LẠI của lô (khi SỬA,
    // phần của chính lượt đang sửa được trả lại trước khi so sánh)
    const editing = state.x2BoOngEditId
      ? (state.xuong2BoOngRecords || []).find(r => r.id === state.x2BoOngEditId)
      : null;
    const avail = boOngRemainingOf(cut, editing ? editing.id : null);
    if (inputOng > avail + 1e-6) {
      showToast(`KL ống bổ (${fmtKg(inputOng)} kg) vượt phần CÒN LẠI của lô (${fmtKg(avail)} kg) — kiểm tra lại!`, 'error');
      return;
    }
    // NGƯỜI BỔ + THỜI GIAN BỔ: TỰ ĐỘNG từ Bảng bố trí Nhân Sự (vị trí "Bổ Ống" —
    // Xưởng 2, đúng ngày bổ) — không điền tay; lưu snapshot phòng khi bố trí bị xóa
    const snap = hrBoOngSnapshot(dateVal);

    // TỰ ĐỘNG LINK: snapshot loại NL / NCC / ngày cắt / KL ống của cả lô
    const cutD = cutDisplay(cut);
    const payload = {
      cutId,
      materialId: cut.materialId || '',
      materialType: cutD.materialType || '',
      supplier: cutD.supplier || '',
      cutDate: cut.date || '',
      lotOng: cutOngWeight(cut),   // KL ống của CẢ LÔ (để hiển thị phần còn lại)
      inputOng,                    // KL ống ĐEM BỔ trong lượt này (có thể là 1 phần)
      klOngLoai,
      klOngBo,
      date: dateVal,
      week: materialWeekLabel(dateVal),
      worker: snap.worker, workTime: snap.workTime,
      workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC
    };

    if (state.x2BoOngEditId) {
      const rec = (state.xuong2BoOngRecords || []).find(r => r.id === state.x2BoOngEditId);
      if (!rec) { showToast('Không tìm thấy lượt bổ ống cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong2BoOng();
      showToast('Đã cập nhật lượt bổ ống!', 'success');
    } else {
      (state.xuong2BoOngRecords = state.xuong2BoOngRecords || []).push({
        id: 'x2bo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong2BoOng();
      showToast('Đã ghi lượt bổ ống!', 'success');
    }

    resetXuong2BoOngForm();
    renderX2BoOngCard();
  }

  // ─── SỬA / XÓA LƯỢT BỔ ỐNG (bảng lịch sử) ────────────────────
  function editXuong2BoOng(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2BoOngRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x2BoOngEditId = id;
    fillXuong2BoOngOptions(); // có fallback nếu lô cắt gốc đã bị xóa
    const sel = document.getElementById('x2-bo-ong-cut');
    if (sel) sel.value = rec.cutId || '';
    updateXuong2BoOngLinked();
    const d = document.getElementById('x2-bo-ong-date');
    if (d) d.value = rec.date || '';
    const boEl = document.getElementById('x2-bo-ong-bo');
    if (boEl) boEl.value = (rec.inputOng ?? '') === '' ? '' : String(rec.inputOng);
    const loai = document.getElementById('x2-bo-ong-loai');
    if (loai) loai.value = (rec.klOngLoai ?? '') === '' ? '' : String(rec.klOngLoai);
    renderX2BoOngCalc(cutRecordOf(rec.cutId));
    syncX2BoOngEditBanner();
  }

  function deleteXuong2BoOng(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2BoOngRecords || []).find(r => r.id === id);
    if (!rec) return;
    const d = boOngDisplay(rec);
    if (!confirm(`Xóa lượt bổ ống ngày ${formatDateDDMMYY(rec.date)} (lô ${d.materialType || '—'} · NCC ${d.supplier || '—'})?`)) return;
    trackDeleted('xuong2BoOngRecords', id); // tombstone: không bị mây/máy khác hồi sinh
    state.xuong2BoOngRecords = (state.xuong2BoOngRecords || []).filter(r => r.id !== id);
    if (state.x2BoOngEditId === id) resetXuong2BoOngForm(); // đang sửa chính nó → về form ghi mới
    saveXuong2BoOng();
    renderX2BoOngCard();
    showToast('Đã xóa lượt bổ ống!', 'success');
  }

  function syncX2BoOngEditBanner() {
    const banner = document.getElementById('x2-bo-ong-edit-banner');
    if (!banner) return;
    const txt = document.getElementById('x2-bo-ong-edit-text');
    if (state.x2BoOngEditId) {
      const rec = (state.xuong2BoOngRecords || []).find(r => r.id === state.x2BoOngEditId);
      if (txt) {
        txt.textContent = rec
          ? `Đang sửa lượt bổ ống ngày ${formatDateDDMMYY(rec.date)} — bấm "Lưu Lượt Bổ Ống" hoặc "Làm Mới Form" để thoát.`
          : 'Đang sửa lượt bổ ống.';
      }
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  // Thu gọn / mở rộng BẢNG LỊCH SỬ bổ ống (form vẫn hiện để tiếp tục nhập)
  function toggleX2BoOngTable() {
    const wrap = document.getElementById('x2-ong-table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('x2-cut-collapsed');
    initLucide();
  }

  // Thống kê nhanh của vị trí Bổ Ống
  // (Tồn ống chờ bổ hiển thị riêng ở THANH TRÊN CÙNG thẻ — x2-ong-stock-bar)
  function renderX2BoOngStats() {
    const box = document.getElementById('x2-ong-stats');
    if (!box) return;
    const disp = (state.xuong2BoOngRecords || []).map(boOngDisplay);
    const totalIn   = disp.reduce((s, d) => s + d.inputOng, 0);
    const totalBo   = disp.reduce((s, d) => s + d.klOngBo, 0);
    const totalLoai = disp.reduce((s, d) => s + d.klOngLoai, 0);
    const totalRest = xuong2PendingOngs().reduce((s, c) => s + boOngRemainingOf(c), 0);
    const ratioAvg = totalIn > 0 ? (totalBo / totalIn) * 100 : null;
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${disp.length}</span>
        <span class="material-stat-label">Lượt bổ ống</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalIn)}</span>
        <span class="material-stat-label">Tổng KL ống đem bổ (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalBo)}</span>
        <span class="material-stat-label">Tổng KL ống bổ (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalLoai)}</span>
        <span class="material-stat-label">Tổng KL ống loại (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalRest)}</span>
        <span class="material-stat-label">Còn chờ bổ (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${ratioAvg == null ? '—' : `${fmtRatio(ratioAvg)}%`}</span>
        <span class="material-stat-label">Tỷ lệ đạt bình quân</span>
      </div>`;
  }

  // ─── BẢNG LỊCH SỬ BỔ ỐNG — NHÓM THEO NGÀY (mỗi ngày 1 THỂ RIÊNG) ──
  // ĐẦU THẺ (nội dung CHUNG của ngày): Ngày · Người bổ (tự động từ Bảng bố trí
  // Nhân Sự) · Giờ bổ tách HC/TC · Công suất thực tế · Hiệu suất.
  // TRONG THẺ (nội dung RIÊNG từng nhánh): mỗi lô ống đã bổ 1 dòng —
  // Lô ống (từ Cắt Chọn) · KL ống đầu vào · KL ống bổ · KL ống loại · Tỷ lệ đạt.
  //   Công suất thực tế = TỔNG KL ỐNG ĐẦU VÀO ÷ tổng số giờ bổ (kg/h)
  //   Hiệu suất = Công suất thực tế ÷ Định mức công suất bổ ống của tháng (%)
  function renderX2BoOngTable() {
    const box = document.getElementById('x2-ong-day-cards');
    if (!box) return;
    const list = [...(state.xuong2BoOngRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const countEl = document.getElementById('x2-ong-table-count');
    if (countEl) countEl.textContent = list.length ? `${list.length} lượt đã bổ ống` : '';
    if (!list.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="split"></i>
          <div>Chưa có lượt bổ ống nào.<br>Chọn <strong>lô ống (từ Cắt Chọn)</strong> ở form trên rồi bấm <strong>Lưu Lượt Bổ Ống</strong>.<br><span style="font-size:0.72rem;">Lô bổ 1 phần vẫn nằm trong ô chọn (kèm số kg còn lại) để bổ tiếp các ngày sau.</span></div>
        </div>`;
      initLucide();
      return;
    }
    // Gộp theo NGÀY (đã sort mới nhất lên đầu — Map giữ đúng thứ tự nhóm)
    const groups = new Map();
    list.forEach(r => {
      const key = r.date || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let html = '';
    for (const [date, rows] of groups) {
      const first = boOngDisplay(rows[0]); // thông tin CHUNG của ngày (người bổ/giờ)
      let totalIn = 0;
      const rowsHtml = rows.map(r => {
        const d = boOngDisplay(r);
        totalIn += d.inputOng;
        const ratioTxt = d.ratio == null ? '—' : `${fmtRatio(d.ratio)}%`;
        return `
        <tr class="x2-day-row" data-x2-ong-row="${escapeHTML(r.id)}">
          <td>
            <strong>${escapeHTML(d.materialType || '—')}</strong>
            <div class="x2-row-note">NCC ${escapeHTML(d.supplier || '—')} · cắt ${formatDateDDMMYY(d.cutDate)} · lô ${fmtKg(d.lotOng)} kg${d.lotRest > 0 ? ` · <span class="x2-ong-rest" title="Phần ống CÒN LẠI của lô sau lượt bổ này — vẫn nằm trong ô chọn để bổ tiếp">còn ${fmtKg(d.lotRest)} kg</span>` : ''}</div>
          </td>
          <td class="text-right">${fmtKg(d.inputOng)}</td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(d.klOngBo)}</strong></td>
          <td class="text-right"><strong style="color:#b45309;">${fmtKg(d.klOngLoai)}</strong></td>
          <td class="text-right"><strong style="color:#0f766e;" title="Tỷ lệ đạt = KL ống bổ : KL ống đem bổ">${ratioTxt}</strong></td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-x2-ong-edit="${escapeHTML(r.id)}"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-x2-ong-delete="${escapeHTML(r.id)}"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
      }).join('');

      const hours = first.workHours || 0;                    // tổng giờ bổ (HC + TC)
      const cap = hours > 0 ? (totalIn / hours) : null;      // Công suất thực tế (kg/h)
      const rate = boOngRateOf(date);                        // Định mức của tháng (kg/h)
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ bổ hoặc chưa đặt Định mức công suất bổ ống cho tháng này)'
        : `Hiệu suất = Công suất thực tế (${fmtKg(cap)} kg/h) ÷ Định mức bổ ống tháng ${Number(String(date).slice(5))} (${fmtKg(rate)} kg/h)`;
      const hcTxt = first.workHoursHC != null ? fmtRatio(first.workHoursHC) : '—';
      const tcTxt = first.workHoursTC != null ? fmtRatio(first.workHoursTC) : '—';
      const workers = first.workerRows.filter(x => x.name);
      const workersMain = workers.length
        ? `${escapeHTML(workers[0].name)}${workers[0].time ? ` (${escapeHTML(workers[0].time)})` : ''}`
        : '<em style="color:var(--text-muted);">Chưa có bố trí vị trí Bổ Ống</em>';
      const workersMore = workers.length > 1
        ? `<em class="x2-day-cutters-more" title="Người khác cùng ngày: ${escapeHTML(workers.slice(1).map(x => `${x.name}${x.time ? ` (${x.time})` : ''}`).join(', '))}">+${workers.length - 1} người khác</em>`
        : '';
      html += `
        <div class="x2-day-card">
          <div class="x2-day-head">
            <span class="x2-day-date"><i data-lucide="calendar"></i> ${formatDateDDMMYY(date)}</span>
            <span class="x2-day-cutters" title="Người bổ — tự động từ Bảng bố trí vị trí 'Bổ Ống' (tab Nhân Sự) đúng ngày">
              <i data-lucide="users"></i> ${workersMain} ${workersMore}
            </span>
            <span class="x2-day-hours" title="Số giờ bổ = tổng giờ công vị trí Bổ Ống trong ngày (từ tab Nhân Sự), tách giờ hành chính (HC) / giờ tăng ca (TC)">Giờ bổ: <span class="x2-hours-hc">${hcTxt}h HC</span><span class="x2-hours-tc">${tcTxt}h TC</span></span>
            <span class="x2-day-cap" title="Công suất thực tế = Tổng KL ống đầu vào (${fmtKg(totalIn)} kg) ÷ tổng số giờ bổ (${fmtRatio(hours)} h)">Công suất thực tế: <strong>${cap != null ? `${fmtKg(cap)} kg/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
          </div>
          <table class="data-table x2-day-table">
            <thead>
              <tr>
                <th>Lô ống (từ Cắt Chọn)</th>
                <th class="text-right">KL ống đầu vào</th>
                <th class="text-right">KL ống bổ</th>
                <th class="text-right">KL ống loại</th>
                <th class="text-right">Tỷ lệ đạt</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }
    box.innerHTML = html;
    initLucide();
  }

  // ─── RENDER BẢNG CHI TIẾT BỔ ỐNG ────────────────────────────
  function renderX2BoOngCard() {
    fillXuong2BoOngOptions();       // ô chọn lô ống (từ Cắt Chọn) + ô tự tính KL ống bổ
    renderX2BoOngStockBar();        // tồn ống chờ bổ (thanh trên cùng)
    renderX2BoOngRateBar();         // định mức công suất bổ ống theo tháng
    renderX2BoOngStats();
    renderX2BoOngTable();           // thẻ ngày: đầu thẻ chung + các nhánh trong thẻ
    syncX2BoOngEditBanner();
    updateXuong2CardCounts();
  }

  // ═══════════════════════════════════════════════════════════
  // VỊ TRÍ: CHẠY MÁY BÀO THÔ — Xưởng 2 (thẻ launcher tab Công Đoạn)
  // ═══════════════════════════════════════════════════════════
  // Nguồn "lô đã bổ" = các lượt BỔ ỐNG (state.xuong2BoOngRecords) đã có ống bổ.
  // Mỗi lượt chạy máy link 1 lô đã bổ + KHAI BÁO LOẠI NAN theo 3 thông tin
  // Dài / Rộng / Dày (mm) — mỗi ô có thể nhiều giá trị ngăn cách bằng dấu phẩy
  // (VD Dài: 1250,1300) → sinh ra nhiều TỔ HỢP kích thước cho lượt đó.
  //   • NGƯỜI CHẠY MÁY + THỜI GIAN tự động từ Bảng bố trí Nhân Sự (vị trí chứa
  //     "bào thô" — Xưởng 2, đúng ngày; giờ tách HC/TC theo cửa sổ ca)
  //   • ĐỊNH MỨC CÔNG SUẤT theo THÁNG (THANH/GIỜ) → Hiệu suất
  //     = Công suất thực tế (thanh/h) ÷ Định mức
  //   • SỐ LƯỢNG (thanh) + THỂ TÍCH QUY ĐỔI (m³) lấy TỰ ĐỘNG theo kích thước từ
  //     công đoạn CHỌN NAN THÔ (sắp làm) — xem chonNanQtyOf(); chưa có nguồn thì
  //     hiện "Chờ Chọn Nan Thô" (KHÔNG bịa số).
  // Dữ liệu: state.xuong2BaoThoRecords (localStorage + file + mây, có tombstone).

  // ─── NGUỒN "LÔ ĐÃ BỔ" (từ công đoạn Bổ Ống) ──────────────────
  function boOngLotList() {
    return [...(state.xuong2BoOngRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }
  function boOngLotOf(id) {
    return (state.xuong2BoOngRecords || []).find(r => r.id === id) || null;
  }
  // Số lượt chạy máy đã ghi cho 1 lô đã bổ (1 lô có thể chạy máy nhiều lượt/ngày)
  function baoThoRunsOf(boOngId, excludeId) {
    return (state.xuong2BaoThoRecords || [])
      .filter(r => r.boOngId === boOngId && r.id !== excludeId).length;
  }

  // ─── LOẠI NAN: DÀI / RỘNG / DÀY (mỗi ô nhiều giá trị, ngăn cách dấu phẩy) ──
  // "1250, 1300" → [1250, 1300] — bỏ giá trị rỗng/không hợp lệ, sắp tăng dần.
  // TỔ HỢP KÍCH THƯỚC = tích số giá trị của 3 chiều (VD 2×2×1 = 4 tổ hợp).
  const BAO_THO_MAX_COMBOS = 400; // chặn nhập quá nhiều tổ hợp (lỗi gõ)
  function parseDimList(text) {
    return [...new Set(String(text || '')
      .split(/[,;]+/)
      .map(s => Number(String(s).trim()))
      .filter(v => Number.isFinite(v) && v > 0))]
      .sort((a, b) => a - b);
  }
  // Số thanh hiển thị gọn: 1.200 (không thập phân)
  function fmtThanh(v) {
    return (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  }
  // Thể tích 1 thanh (m³) — d×r×t (mm) ÷ 1 tỷ. GIỮ NHIỀU CHỮ SỐ THẬP PHÂN
  // (chỉ làm tròn khi HIỂN THỊ / khi ra TỔNG) để không bị sai số khi nhân với số
  // thanh lớn — cùng cách tính với lô nan (utils.calculateVolume làm tròn 1 lần).
  const unitVolOf = (d, r, t) => (Number(d) || 0) * (Number(r) || 0) * (Number(t) || 0) / 1e9;
  // Danh sách tổ hợp kích thước từ 3 mảng giá trị (Dài × Rộng × Dày)
  function baoThoCombosOf(dais, rongs, thicks) {
    const out = [];
    (dais || []).forEach(d => (rongs || []).forEach(r => (thicks || []).forEach(t => {
      out.push({ d, r, t, unitVol: unitVolOf(d, r, t) });
    })));
    return out;
  }
  function baoThoCombos(rec) {
    return baoThoCombosOf(rec && rec.dais, rec && rec.rongs, rec && rec.thicks);
  }
  // Thể tích quy đổi TRUNG BÌNH 1 thanh (m³) của các tổ hợp trong lượt
  // (giữ 8 chữ số thập phân — đủ chính xác cho tổng thể tích)
  function baoThoUnitVolAvg(rec) {
    const combos = baoThoCombos(rec);
    if (!combos.length) return null;
    const avg = combos.reduce((s, c) => s + c.unitVol, 0) / combos.length;
    return Math.round(avg * 1e8) / 1e8;
  }
  const dimKeyOf = (d, r, t) => `${Number(d) || 0}×${Number(r) || 0}×${Number(t) || 0}`;

  // ─── SỐ LƯỢNG THANH — TỰ ĐỘNG theo kích thước ─────────────────
  // NGUỒN: công đoạn CHỌN NAN THÔ (state.xuong2ChonNanThoRecords) — cộng số thanh
  // của các lượt chọn nan ĐÃ LINK đúng lô bào thô này (baothoId), BỎ QUA các lượt
  // "nhập ở NGOÀI công đoạn" (external = true → không cộng sang Bào Thô).
  // Gồm CẢ nan bị "Loại hẳn" vì máy vẫn phải chạy ra số thanh đó (tỷ lệ loại
  // phản ánh chất lượng). Trả null = CHƯA CÓ SỐ LIỆU (thẻ hiện "Chờ Chọn Nan Thô").
  function chonNanQtyOf(rec) {
    const src = state.xuong2ChonNanThoRecords;
    if (!Array.isArray(src) || !src.length) return null;
    const hit = src.filter(x => !x.external && x.baothoId === rec.id);
    if (!hit.length) return null;
    let qty = 0, volume = 0;
    const byClass = { A: 0, A1: 0, B: 0, reject: 0 };
    hit.forEach(x => {
      const q = Number(x.quantity) || 0;
      qty += q;
      // Thể tích CHÍNH XÁC của từng lượt chọn (đã lưu) — không dùng trung bình
      volume += Number.isFinite(Number(x.volume)) ? (Number(x.volume) || 0) : q * (Number(x.unitVol) || 0);
      if (byClass[x.cls] != null) byClass[x.cls] += q;
    });
    return { qty, volume, records: hit.length, byClass, source: 'chonnan' };
  }
  // Số lượng thanh tự động của 1 lượt chạy máy: { qty|null, volume|null, records, source }
  function baoThoQtyOf(rec) {
    const official = chonNanQtyOf(rec);
    if (official) return official;
    return { qty: null, volume: null, records: 0, source: 'none' };
  }
  // THỂ TÍCH QUY ĐỔI (m³) của 1 lượt chạy máy:
  //   • Có số liệu Chọn Nan Thô → TỔNG thể tích chính xác của các lượt chọn nan
  //   • Chưa có → null (thẻ hiện "Chờ Chọn Nan Thô")
  function baoThoVolumeOf(rec) {
    const q = baoThoQtyOf(rec);
    if (q.qty == null) return null;
    if (q.volume != null) return Math.round(q.volume * 10000) / 10000;
    const unit = baoThoUnitVolAvg(rec);
    if (unit == null) return null;
    return Math.round(q.qty * unit * 10000) / 10000;
  }

  // ─── ĐỊNH MỨC CÔNG SUẤT BÀO THÔ (thanh/giờ) THEO TỪNG THÁNG ───
  // Người quản lý đặt riêng cho từng tháng (VD tháng 9 = 900 thanh/giờ) —
  // nguồn cho cột "Hiệu suất" của thẻ ngày Chạy Máy Bào Thô.
  function loadX2BaoThoRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_BAO_THO_RATE);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        state.x2BaoThoRates = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
      } catch (e) { state.x2BaoThoRates = {}; }
    } else {
      state.x2BaoThoRates = {};
    }
  }

  function saveX2BaoThoRates() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_BAO_THO_RATE, JSON.stringify(state.x2BaoThoRates || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // Định mức công suất bào thô của tháng chứa dateVal (thanh/giờ) — null nếu chưa đặt
  function baoThoRateOf(dateVal) {
    const key = String(dateVal || '').slice(0, 7);
    const v = Number((state.x2BaoThoRates || {})[key]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function handleX2BaoThoRateSave() {
    if (!requireEditPermission()) return;
    const monthEl = document.getElementById('x2-bt-rate-month');
    const valEl = document.getElementById('x2-bt-rate-value');
    const month = String((monthEl && monthEl.value) || '').trim();
    const v = Number((valEl && valEl.value) || 0);
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Chưa chọn tháng để lưu định mức!', 'error'); return; }
    if (!Number.isFinite(v) || v <= 0) { showToast('Định mức công suất phải là số thanh/giờ lớn hơn 0!', 'error'); return; }
    (state.x2BaoThoRates = state.x2BaoThoRates || {})[month] = v;
    saveX2BaoThoRates();
    renderX2BaoThoRateBar();
    renderX2BaoThoTable(); // cột Hiệu suất tự cập nhật
    showToast(`Đã lưu định mức bào thô ${fmtThanh(v)} thanh/giờ cho tháng ${month.slice(5)}!`, 'success');
  }

  // Thanh ĐỊNH MỨC (thanh/giờ): chọn tháng + chip tháng ĐÃ ĐẶT (bấm để nạp lại)
  function renderX2BaoThoRateBar() {
    const selEl = document.getElementById('x2-bt-rate-month');
    const valInput = document.getElementById('x2-bt-rate-value');
    if (!selEl) return;
    const months = new Set([
      ...(state.xuong2BaoThoRecords || []).map(r => String(r.date || '').slice(0, 7)),
      ...Object.keys(state.x2BaoThoRates || {}),
      new Date().toISOString().slice(0, 7)
    ]);
    const curMonth = selEl.value || new Date().toISOString().slice(0, 7);
    const list = [...months].filter(Boolean).sort((a, b) => b.localeCompare(a));
    selEl.innerHTML = list
      .map(m => `<option value="${escapeHTML(m)}">Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</option>`).join('');
    selEl.value = months.has(curMonth) ? curMonth : list[0] || '';
    if (valInput) {
      const v = Number((state.x2BaoThoRates || {})[selEl.value]);
      valInput.value = Number.isFinite(v) && v > 0 ? v : '';
    }
    const chips = document.getElementById('x2-bt-rate-chips');
    if (chips) {
      const keys = Object.keys(state.x2BaoThoRates || {})
        .filter(k => Number(state.x2BaoThoRates[k]) > 0)
        .sort((a, b) => b.localeCompare(a));
      chips.innerHTML = keys.map(k => `<button type="button" class="x2-rate-chip" data-x2-bt-rate="${escapeHTML(k)}" title="Bấm để nạp định mức tháng này vào ô nhập để sửa lại">T${Number(k.slice(5))} = ${fmtThanh(state.x2BaoThoRates[k])} thanh/h</button>`).join('');
    }
    initLucide();
  }

  // ─── NẠP / LƯU DỮ LIỆU CHẠY MÁY BÀO THÔ ──────────────────────
  function loadXuong2BaoTho() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG2_BAO_THO);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.xuong2BaoThoRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.xuong2BaoThoRecords = []; }
    } else {
      state.xuong2BaoThoRecords = [];
    }
  }

  function saveXuong2BaoTho() {
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_BAO_THO, JSON.stringify(state.xuong2BaoThoRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    logDataChange(['xuong2BaoThoRecords']); // ghi lịch sử sửa đổi
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT CHẠY MÁY BÀO THÔ ─────────────
  // Link SỐNG tới lô đã bổ (lượt Bổ Ống): NCC/loại NL/KL ống bổ đạt luôn theo dữ
  // liệu hiện tại; lượt bổ đã bị xóa → dùng snapshot đã lưu khi ghi nhận.
  function baoThoDisplay(r) {
    const bo = boOngLotOf(r.boOngId);
    const boD = bo ? boOngDisplay(bo) : null;
    const combos = baoThoCombos(r);
    const q = baoThoQtyOf(r);
    // Người chạy máy + giờ chạy: SỐNG từ Bảng bố trí Nhân Sự theo ngày; mất bố trí → snapshot
    const live = hrBaoThoAssignmentsOf(r.date || '');
    const workerRows = live.length
      ? live.map(a => ({ name: a.name, time: posTimeStr(a) }))
      : String(r.worker || '').split(',').map(s => s.trim()).filter(Boolean)
          .map((name, i) => ({ name, time: String(r.workTime || '').split(',').map(s => s.trim())[i] || '' }));
    let workHours = 0, workHoursHC = null, workHoursTC = null;
    if (live.length) {
      const sp = sumPosHoursSplit(live, r.date || '');
      workHours = sp.hc + sp.tc;
      workHoursHC = sp.hc; workHoursTC = sp.tc;
    } else if (Number.isFinite(Number(r.workHoursHC)) || Number.isFinite(Number(r.workHoursTC))) {
      workHoursHC = Number(r.workHoursHC) || 0;
      workHoursTC = Number(r.workHoursTC) || 0;
      workHours = workHoursHC + workHoursTC;
      if (!workHours && Number(r.workHours) > 0) workHours = Number(r.workHours);
    } else if (Number(r.workHours) > 0) {
      workHours = Number(r.workHours);
    } else {
      workHours = snapshotCutHours(r.workTime);
    }
    // Công suất thực tế (thanh/h) = tổng số thanh ÷ tổng giờ chạy máy
    const cap = (q.qty != null && workHours > 0) ? q.qty / workHours : null;
    return {
      date: r.date || '',
      materialType: boD ? boD.materialType : (r.materialType || ''),
      supplier: boD ? boD.supplier : (r.supplier || ''),
      boDate: bo ? (bo.date || '') : (r.boDate || ''),
      cutDate: bo ? (bo.cutDate || '') : (r.cutDate || ''),
      klOngBo: boD ? boD.klOngBo : (Number(r.klOngBo) || 0),
      daiText: r.daiText || '', rongText: r.rongText || '', dayText: r.dayText || '',
      combos,
      unitVolAvg: baoThoUnitVolAvg(r),
      qty: q.qty, qtySource: q.source, qtyRecords: q.records,
      volume: baoThoVolumeOf(r),
      cap,
      workerRows,
      workHours,
      workHoursHC,
      workHoursTC
    };
  }

  // Chuỗi mô tả kích thước 1 tổ hợp: "1250 × 80 × 12"
  const comboLabel = c => `${Number(c.d)} × ${Number(c.r)} × ${Number(c.t)}`;

  // ─── SỐ LƯỢNG THANH hiển thị (chờ Chọn Nan Thô khi chưa có nguồn) ──
  function qtyCellHtml(d) {
    if (d.qty == null) {
      return `<span class="x2-qty-pending" title="Số lượng thanh lấy TỰ ĐỘNG từ công đoạn CHỌN NAN THÔ (theo kích thước Dài × Rộng × Dày) — công đoạn đó chưa có dữ liệu"><i data-lucide="hourglass"></i> Chờ Chọn Nan Thô</span>`;
    }
    const src = d.qtySource === 'chonnan'
      ? `từ ${d.qtyRecords} dòng chọn nan thô`
      : 'tự động';
    return `<strong>${fmtThanh(d.qty)}</strong> <small style="color:var(--text-muted);">thanh</small>
      <div class="x2-row-note" title="Số thanh lấy tự động theo kích thước">${escapeHTML(src)}</div>`;
  }

  // ─── FORM GHI NHẬN LƯỢT CHẠY MÁY BÀO THÔ ─────────────────────
  // Ô chọn = LÔ ĐÃ BỔ (từ công đoạn Bổ Ống) — nhãn hiện đủ Loại NL · NCC · ngày
  // bổ · KL ống bổ đạt để chọn nhanh (gõ vào ô chọn để tìm theo NCC/ngày).
  // Lô đã chạy máy vẫn chọn lại được (chạy nhiều lượt) — có chip "đã chạy N lượt".
  function fillXuong2BaoThoOptions() {
    const sel = document.getElementById('x2-bao-tho-lot');
    if (!sel) return;
    const editing = state.x2BaoThoEditId
      ? (state.xuong2BaoThoRecords || []).find(r => r.id === state.x2BaoThoEditId)
      : null;
    const editId = editing ? editing.id : null;
    const lots = boOngLotList().map(bo => {
      const d = boOngDisplay(bo);
      const runs = baoThoRunsOf(bo.id, editId);
      const runTxt = runs > 0 ? ` · đã chạy ${runs} lượt` : '';
      return `<option value="${escapeHTML(bo.id)}">${escapeHTML(d.materialType || 'Lô ống')} · NCC ${escapeHTML(d.supplier || '—')} · bổ ${formatDateDDMMYY(bo.date)} · ống bổ ${fmtKg(d.klOngBo)} kg${escapeHTML(runTxt)}</option>`;
    });
    let html = lots.join('');
    if (!html) html = `<option value="">— Chưa có lô đã bổ (ghi lượt ở thẻ Bổ Ống trước) —</option>`;
    sel.innerHTML = html;
    updateXuong2BaoThoLinked();
  }

  // Đổi lô đã bổ: điền sẵn NGÀY theo ngày bổ (ghi mới) + vẽ ô kích thước tự tính
  function updateXuong2BaoThoLinked() {
    const sel = document.getElementById('x2-bao-tho-lot');
    const bo = boOngLotOf(sel ? sel.value : '');
    if (!state.x2BaoThoEditId && bo) {
      const d = document.getElementById('x2-bao-tho-date');
      if (d && !d.value) d.value = bo.date || todayISO();
    }
    renderX2BaoThoCalc();
  }

  // Ô TỰ TÍNH: số tổ hợp kích thước + thể tích quy đổi 1 thanh (m³)
  function renderX2BaoThoCalc() {
    const box = document.getElementById('x2-bao-tho-calc');
    if (!box) return;
    const dais = parseDimList((document.getElementById('x2-bao-tho-dai') || {}).value);
    const rongs = parseDimList((document.getElementById('x2-bao-tho-rong') || {}).value);
    const thicks = parseDimList((document.getElementById('x2-bao-tho-day') || {}).value);
    const combos = baoThoCombosOf(dais, rongs, thicks);
    if (!combos.length) {
      box.innerHTML = `<span class="x2-ong-calc-label">Nhập Dài / Rộng / Dày (mm) — nhiều giá trị ngăn cách bằng dấu phẩy</span>`;
      return;
    }
    const unit = Math.round((combos.reduce((s, c) => s + c.unitVol, 0) / combos.length) * 10000) / 10000;
    const tooMany = combos.length > BAO_THO_MAX_COMBOS;
    box.innerHTML = `
      <span class="x2-ong-calc-item x2-ong-calc-in" title="Số tổ hợp kích thước = số Dài × số Rộng × số Dày đã nhập"><span class="x2-ong-calc-label">Tổ hợp kích thước:</span><strong style="${tooMany ? 'color:#dc2626;' : ''}">${combos.length}</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-bo" title="Thể tích quy đổi TRUNG BÌNH 1 thanh = Dài × Rộng × Dày (mm) ÷ 1 tỷ"><span class="x2-ong-calc-label">Thể tích 1 thanh (TB):</span><strong>${unit.toFixed(4)} m³</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-after" title="Số lượng thanh lấy TỰ ĐỘNG từ công đoạn Chọn Nan Thô (chưa có dữ liệu)"><span class="x2-ong-calc-label">Số lượng:</span><strong>chờ Chọn Nan Thô</strong></span>`;
  }

  function resetXuong2BaoThoForm() {
    state.x2BaoThoEditId = null;
    ['x2-bao-tho-dai', 'x2-bao-tho-rong', 'x2-bao-tho-day'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const d = document.getElementById('x2-bao-tho-date');
    if (d) d.value = '';
    fillXuong2BaoThoOptions();
    syncX2BaoThoEditBanner();
  }

  // ─── LƯU FORM CHẠY MÁY BÀO THÔ (THÊM / SỬA) ──────────────────
  function handleXuong2BaoThoSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x2-bao-tho-lot');
    const boOngId = sel ? sel.value : '';
    const bo = boOngLotOf(boOngId);
    if (!bo) { showToast('Hãy chọn LÔ ĐÃ BỔ (từ công đoạn Bổ Ống)!', 'error'); return; }

    const dateVal = (document.getElementById('x2-bao-tho-date') || {}).value || '';
    if (!dateVal) { showToast('Ngày chạy máy không được để trống!', 'error'); return; }

    // LOẠI NAN: Dài / Rộng / Dày — mỗi ô có thể nhiều giá trị (ngăn cách dấu phẩy)
    const dais   = parseDimList((document.getElementById('x2-bao-tho-dai')  || {}).value);
    const rongs  = parseDimList((document.getElementById('x2-bao-tho-rong') || {}).value);
    const thicks = parseDimList((document.getElementById('x2-bao-tho-day')  || {}).value);
    if (!dais.length || !rongs.length || !thicks.length) {
      showToast('Nhập đủ Dài / Rộng / Dày (mm) của loại nan — nhiều giá trị thì ngăn cách bằng dấu phẩy!', 'error');
      return;
    }
    const nCombo = dais.length * rongs.length * thicks.length;
    if (nCombo > BAO_THO_MAX_COMBOS) {
      showToast(`Quá nhiều tổ hợp kích thước (${nCombo}) — kiểm tra lại 3 ô Dài/Rộng/Dày!`, 'error');
      return;
    }
    // NGƯỜI CHẠY MÁY + THỜI GIAN: TỰ ĐỘNG từ Bảng bố trí Nhân Sự (vị trí "Bào thô")
    const snap = hrBaoThoSnapshot(dateVal);
    const boD = boOngDisplay(bo);
    const payload = {
      boOngId,
      materialId: bo.materialId || '',
      materialType: boD.materialType || '',
      supplier: boD.supplier || '',
      boDate: bo.date || '',
      cutDate: bo.cutDate || '',
      klOngBo: boD.klOngBo,          // KL ống bổ đạt của lô (để đối chiếu)
      date: dateVal,
      week: materialWeekLabel(dateVal),
      daiText:  String((document.getElementById('x2-bao-tho-dai')  || {}).value || '').trim(),
      rongText: String((document.getElementById('x2-bao-tho-rong') || {}).value || '').trim(),
      dayText:  String((document.getElementById('x2-bao-tho-day')  || {}).value || '').trim(),
      dais, rongs, thicks,
      worker: snap.worker, workTime: snap.workTime,
      workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC
    };

    if (state.x2BaoThoEditId) {
      const rec = (state.xuong2BaoThoRecords || []).find(r => r.id === state.x2BaoThoEditId);
      if (!rec) { showToast('Không tìm thấy lượt chạy máy cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong2BaoTho();
      showToast('Đã cập nhật lượt chạy máy bào thô!', 'success');
    } else {
      (state.xuong2BaoThoRecords = state.xuong2BaoThoRecords || []).push({
        id: 'x2bt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong2BaoTho();
      showToast('Đã ghi lượt chạy máy bào thô!', 'success');
    }
    resetXuong2BaoThoForm();
    renderX2BaoThoCard();
  }

  // ─── SỬA / XÓA LƯỢT CHẠY MÁY (bảng lịch sử) ──────────────────
  function editXuong2BaoTho(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2BaoThoRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x2BaoThoEditId = id;
    fillXuong2BaoThoOptions();
    const sel = document.getElementById('x2-bao-tho-lot');
    if (sel) sel.value = rec.boOngId || '';
    const d = document.getElementById('x2-bao-tho-date');
    if (d) d.value = rec.date || '';
    const fields = { 'x2-bao-tho-dai': rec.daiText, 'x2-bao-tho-rong': rec.rongText, 'x2-bao-tho-day': rec.dayText };
    Object.keys(fields).forEach(fid => {
      const el = document.getElementById(fid);
      if (el) el.value = fields[fid] || '';
    });
    renderX2BaoThoCalc();
    syncX2BaoThoEditBanner();
  }

  function deleteXuong2BaoTho(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2BaoThoRecords || []).find(r => r.id === id);
    if (!rec) return;
    const d = baoThoDisplay(rec);
    if (!confirm(`Xóa lượt chạy máy bào thô ngày ${formatDateDDMMYY(rec.date)} (lô ${d.materialType || '—'} · NCC ${d.supplier || '—'})?`)) return;
    trackDeleted('xuong2BaoThoRecords', id); // tombstone: không bị mây/máy khác hồi sinh
    state.xuong2BaoThoRecords = (state.xuong2BaoThoRecords || []).filter(r => r.id !== id);
    if (state.x2BaoThoEditId === id) resetXuong2BaoThoForm();
    saveXuong2BaoTho();
    renderX2BaoThoCard();
    showToast('Đã xóa lượt chạy máy bào thô!', 'success');
  }

  function syncX2BaoThoEditBanner() {
    const banner = document.getElementById('x2-bao-tho-edit-banner');
    if (!banner) return;
    const txt = document.getElementById('x2-bao-tho-edit-text');
    if (state.x2BaoThoEditId) {
      const rec = (state.xuong2BaoThoRecords || []).find(r => r.id === state.x2BaoThoEditId);
      if (txt) {
        txt.textContent = rec
          ? `Đang sửa lượt chạy máy ngày ${formatDateDDMMYY(rec.date)} — bấm "Lưu Lượt Chạy Máy" hoặc "Làm Mới Form" để thoát.`
          : 'Đang sửa lượt chạy máy bào thô.';
      }
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  // Thu gọn / mở rộng BẢNG LỊCH SỬ chạy máy (form vẫn hiện để tiếp tục nhập)
  function toggleX2BaoThoTable() {
    const wrap = document.getElementById('x2-bt-table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('x2-cut-collapsed');
    initLucide();
  }

  // ─── THỐNG KÊ NHANH CỦA VỊ TRÍ CHẠY MÁY BÀO THÔ ──────────────
  function renderX2BaoThoStats() {
    const box = document.getElementById('x2-bt-stats');
    if (!box) return;
    const disp = (state.xuong2BaoThoRecords || []).map(baoThoDisplay);
    const known = disp.filter(d => d.qty != null);
    const haveQty = known.length > 0;
    const totalQty = known.reduce((s, d) => s + d.qty, 0);
    const totalVol = known.reduce((s, d) => s + (d.volume || 0), 0);
    const totalHours = disp.reduce((s, d) => s + (d.workHours || 0), 0);
    const capAvg = (haveQty && totalHours > 0) ? totalQty / totalHours : null;
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${disp.length}</span>
        <span class="material-stat-label">Lượt chạy máy</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${haveQty ? fmtThanh(totalQty) : '—'}</span>
        <span class="material-stat-label">Tổng số thanh${haveQty ? '' : ' (chờ Chọn Nan Thô)'}</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${haveQty ? totalVol.toFixed(4) : '—'}</span>
        <span class="material-stat-label">Thể tích quy đổi (m³)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtRatio(totalHours)}</span>
        <span class="material-stat-label">Tổng giờ chạy máy</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${capAvg == null ? '—' : `${fmtThanh(capAvg)}`}</span>
        <span class="material-stat-label">Công suất TB (thanh/h)</span>
      </div>`;
  }

  // ─── BẢNG LỊCH SỬ CHẠY MÁY BÀO THÔ — NHÓM THEO NGÀY (thẻ ngày) ──
  // ĐẦU THẺ (nội dung CHUNG của ngày): Ngày · Người chạy máy (tự động từ Bảng bố
  // trí Nhân Sự) · Thời gian (giờ HC/TC) · Công suất (thanh/h) · Hiệu suất.
  // TRONG THẺ (nội dung RIÊNG từng nhánh): Loại nan (các tổ hợp Dài×Rộng×Dày) ·
  // Số lượng thanh (tự động theo kích thước) · Thể tích quy đổi (m³).
  //   Công suất thực tế = TỔNG SỐ THANH ÷ tổng giờ chạy máy (thanh/h)
  //   Hiệu suất = Công suất thực tế ÷ Định mức bào thô của tháng (thanh/h)
  function renderX2BaoThoTable() {
    const box = document.getElementById('x2-bt-day-cards');
    if (!box) return;
    const list = [...(state.xuong2BaoThoRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const countEl = document.getElementById('x2-bt-table-count');
    if (countEl) countEl.textContent = list.length ? `${list.length} lượt chạy máy` : '';
    if (!list.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="cog"></i>
          <div>Chưa có lượt chạy máy nào.<br>Chọn <strong>Lô Đã Bổ</strong> + khai báo <strong>Dài / Rộng / Dày</strong> ở form trên rồi bấm <strong>Lưu Lượt Chạy Máy</strong>.<br><span style="font-size:0.72rem;">Số lượng thanh + thể tích quy đổi sẽ tự lấy từ công đoạn Chọn Nan Thô.</span></div>
        </div>`;
      initLucide();
      return;
    }
    // Gộp theo NGÀY (đã sort mới nhất lên đầu — Map giữ đúng thứ tự nhóm)
    const groups = new Map();
    list.forEach(r => {
      const key = r.date || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let html = '';
    for (const [date, rows] of groups) {
      const first = baoThoDisplay(rows[0]); // thông tin CHUNG của ngày (người chạy máy/giờ)
      let totalQty = 0, allQtyKnown = true;
      const rowsHtml = rows.map(r => {
        const d = baoThoDisplay(r);
        if (d.qty == null) allQtyKnown = false; else totalQty += d.qty;
        return baoThoRowHtml(r, d);
      }).join('');
      const hours = first.workHours || 0;                        // tổng giờ chạy máy (HC + TC)
      const cap = (allQtyKnown && hours > 0) ? (totalQty / hours) : null;
      const rate = baoThoRateOf(date);                           // định mức tháng (thanh/h)
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? (allQtyKnown ? 'Chưa đặt Định mức công suất bào thô cho tháng này' : 'Chờ số lượng thanh từ công đoạn Chọn Nan Thô')
        : `Hiệu suất = Công suất thực tế (${fmtThanh(cap)} thanh/h) ÷ Định mức bào thô tháng ${Number(String(date).slice(5))} (${fmtThanh(rate)} thanh/h)`;
      const hcTxt = first.workHoursHC != null ? fmtRatio(first.workHoursHC) : '—';
      const tcTxt = first.workHoursTC != null ? fmtRatio(first.workHoursTC) : '—';
      const workers = first.workerRows.filter(x => x.name);
      const workersMain = workers.length
        ? `${escapeHTML(workers[0].name)}${workers[0].time ? ` (${escapeHTML(workers[0].time)})` : ''}`
        : '<em style="color:var(--text-muted);">Chưa có bố trí vị trí Bào Thô</em>';
      const workersMore = workers.length > 1
        ? `<em class="x2-day-cutters-more" title="Người khác cùng ngày: ${escapeHTML(workers.slice(1).map(x => `${x.name}${x.time ? ` (${x.time})` : ''}`).join(', '))}">+${workers.length - 1} người khác</em>`
        : '';
      html += `
        <div class="x2-day-card">
          <div class="x2-day-head">
            <span class="x2-day-date"><i data-lucide="calendar"></i> ${formatDateDDMMYY(date)}</span>
            <span class="x2-day-cutters" title="Người chạy máy — tự động từ Bảng bố trí vị trí 'Bào thô' (tab Nhân Sự) đúng ngày">
              <i data-lucide="users"></i> ${workersMain} ${workersMore}
            </span>
            <span class="x2-day-hours" title="Thời gian = tổng giờ công vị trí Bào Thô trong ngày (từ tab Nhân Sự), tách giờ hành chính (HC) / giờ tăng ca (TC)">Thời gian: <span class="x2-hours-hc">${hcTxt}h HC</span><span class="x2-hours-tc">${tcTxt}h TC</span></span>
            <span class="x2-day-cap" title="Công suất thực tế = Tổng số thanh ${allQtyKnown ? `(${fmtThanh(totalQty)} thanh)` : '(chờ Chọn Nan Thô)'} ÷ tổng giờ chạy máy (${fmtRatio(hours)} h)">Công suất: <strong>${cap != null ? `${fmtThanh(cap)} thanh/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
          </div>
          <table class="data-table x2-day-table">
            <thead>
              <tr>
                <th>Loại nan (Dài × Rộng × Dày)</th>
                <th class="text-right">Số lượng</th>
                <th class="text-right">Thể tích quy đổi</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }
    box.innerHTML = html;
    initLucide();
  }

  // 1 DÒNG NHÁNH của thẻ ngày: Loại nan (tổ hợp) · Số lượng · Thể tích quy đổi
  function baoThoRowHtml(r, d) {
    const combos = d.combos || [];
    const shown = combos.slice(0, 6);
    const chips = shown.map(c => `<span class="x2-nan-chip">${comboLabel(c)}</span>`).join('');
    const more = combos.length > shown.length
      ? `<span class="x2-nan-chip x2-nan-chip-more" title="Còn ${combos.length - shown.length} tổ hợp kích thước khác">+${combos.length - shown.length}</span>`
      : '';
    const unitTxt = d.unitVolAvg == null ? '' : `${d.unitVolAvg.toFixed(4)} m³/thanh`;
    const srcNote = `Lô đã bổ ${formatDateDDMMYY(d.boDate)} · NCC ${escapeHTML(d.supplier || '—')} · ống bổ đạt ${fmtKg(d.klOngBo)} kg`;
    return `
      <tr class="x2-day-row" data-x2-bt-row="${escapeHTML(r.id)}">
        <td>
          <div class="x2-nan-chips" title="Dài × Rộng × Dày (mm) — nhiều giá trị cách nhau dấu phẩy">
            ${chips}${more}
          </div>
          <div class="x2-row-note">${srcNote}${unitTxt ? ` · ${unitTxt}` : ''}</div>
        </td>
        <td class="text-right">${qtyCellHtml(d)}</td>
        <td class="text-right">
          ${d.volume == null
            ? `<span class="x2-row-note" title="Thể tích quy đổi = số thanh × thể tích 1 thanh — chờ số lượng từ công đoạn Chọn Nan Thô">—</span>`
            : `<strong style="color:#0f766e;">${d.volume.toFixed(4)}</strong> <small style="color:var(--text-muted);">m³</small>`}
        </td>
        <td class="text-right">
          <button class="btn btn-icon btn-outline" title="Sửa" data-x2-bt-edit="${escapeHTML(r.id)}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-icon btn-danger" title="Xóa" data-x2-bt-delete="${escapeHTML(r.id)}"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
  }

  // ─── RENDER BẢNG CHI TIẾT CHẠY MÁY BÀO THÔ ───────────────────
  function renderX2BaoThoCard() {
    fillXuong2BaoThoOptions();   // ô chọn lô đã bổ + ô kích thước tự tính
    renderX2BaoThoRateBar();     // định mức công suất bào thô theo tháng (thanh/h)
    renderX2BaoThoStats();
    renderX2BaoThoTable();       // thẻ ngày: đầu thẻ chung + các nhánh trong thẻ
    syncX2BaoThoEditBanner();
    updateXuong2CardCounts();
  }

  // ═══════════════════════════════════════════════════════════
  // VỊ TRÍ: CHỌN NAN THÔ — Xưởng 2 (thẻ launcher tab Công Đoạn)
  // ═══════════════════════════════════════════════════════════
  // Nguồn "lô": các lượt CHẠY MÁY BÀO THÔ (state.xuong2BaoThoRecords) — chọn theo
  // NGÀY BÀO THÔ; mỗi lượt chọn nan link 1 lô bào thô + 1 KÍCH THƯỚC (chọn từ
  // danh sách kích thước của lô đó, hoặc THÊM MỚI khi nan nhập ở ngoài công đoạn)
  // + PHÂN LOẠI (A / A1 – ít bọng cật / B – nhiều bọng cật / Loại hẳn) + SỐ LƯỢNG.
  //   • Lượt "thêm mới" (ngoài công đoạn) đánh dấu external = true → KHÔNG cộng
  //     vào tổng số thanh/thể tích của Chạy Máy Bào Thô.
  //   • NGƯỜI CHỌN NAN + THỜI GIAN tự động từ Bảng bố trí Nhân Sự (vị trí chứa
  //     "chọn nan" — Xưởng 2, đúng ngày; giờ tách HC/TC theo cửa sổ ca)
  //   • ĐỊNH MỨC CÔNG SUẤT theo THÁNG (THANH/GIỜ) → Hiệu suất
  //     = Công suất thực tế (thanh/h) ÷ Định mức
  // Dữ liệu: state.xuong2ChonNanThoRecords (localStorage + file + mây, tombstone).

  // ─── PHÂN LOẠI NAN (đúng thuật ngữ của xưởng) ─────────────────
  const NAN_CLASSES = [
    { id: 'A',      label: 'A',                  hint: 'Nan loại A (đẹp nhất)' },
    { id: 'A1',     label: 'A1 – Ít bọng cật',   hint: 'Nan loại A1 — ít bọng cật' },
    { id: 'B',      label: 'B – Nhiều bọng cật', hint: 'Nan loại B — nhiều bọng cật' },
    { id: 'reject', label: 'Loại hẳn',           hint: 'Nan bị loại hẳn (tính vào TỶ LỆ LOẠI)' }
  ];
  function nanClassLabel(id) {
    const c = NAN_CLASSES.find(x => x.id === id);
    return c ? c.label : (id || '—');
  }

  // ─── NGUỒN "LÔ ĐÃ BÀO THÔ" (chọn theo ngày bào thô) ───────────
  function baoThoLotList() {
    return [...(state.xuong2BaoThoRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }
  function baoThoLotOf(id) {
    return (state.xuong2BaoThoRecords || []).find(r => r.id === id) || null;
  }
  // Số thanh ĐÃ chọn cho 1 kích thước của 1 lô bào thô (chỉ tính lượt chọn CÓ
  // cộng sang Bào Thô — tức không phải "nhập ngoài công đoạn")
  function chonNanQtyBySizeOf(baothoId, sizeKey, excludeId) {
    return (state.xuong2ChonNanThoRecords || [])
      .filter(x => x.baothoId === baothoId && !x.external && x.sizeKey === sizeKey && x.id !== excludeId)
      .reduce((s, x) => s + (Number(x.quantity) || 0), 0);
  }
  // Số lượt chọn nan đã ghi cho 1 lô bào thô (hiện chip "đã chọn N lượt")
  function chonNanRunsOf(baothoId, excludeId) {
    return (state.xuong2ChonNanThoRecords || [])
      .filter(x => x.baothoId === baothoId && x.id !== excludeId).length;
  }

  // ─── ĐỊNH MỨC CÔNG SUẤT CHỌN NAN THÔ (thanh/giờ) THEO TỪNG THÁNG ──
  function loadX2ChonNanRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_CHON_NAN_RATE);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        state.x2ChonNanRates = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
      } catch (e) { state.x2ChonNanRates = {}; }
    } else {
      state.x2ChonNanRates = {};
    }
  }

  function saveX2ChonNanRates() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_CHON_NAN_RATE, JSON.stringify(state.x2ChonNanRates || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // Định mức công suất chọn nan của tháng chứa dateVal (thanh/giờ) — null nếu chưa đặt
  function chonNanRateOf(dateVal) {
    const key = String(dateVal || '').slice(0, 7);
    const v = Number((state.x2ChonNanRates || {})[key]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function handleX2ChonNanRateSave() {
    if (!requireEditPermission()) return;
    const monthEl = document.getElementById('x2-cn-rate-month');
    const valEl = document.getElementById('x2-cn-rate-value');
    const month = String((monthEl && monthEl.value) || '').trim();
    const v = Number((valEl && valEl.value) || 0);
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Chưa chọn tháng để lưu định mức!', 'error'); return; }
    if (!Number.isFinite(v) || v <= 0) { showToast('Định mức công suất phải là số thanh/giờ lớn hơn 0!', 'error'); return; }
    (state.x2ChonNanRates = state.x2ChonNanRates || {})[month] = v;
    saveX2ChonNanRates();
    renderX2ChonNanRateBar();
    renderX2ChonNanTable(); // cột Hiệu suất tự cập nhật
    showToast(`Đã lưu định mức chọn nan ${fmtThanh(v)} thanh/giờ cho tháng ${month.slice(5)}!`, 'success');
  }

  // Thanh ĐỊNH MỨC (thanh/giờ): chọn tháng + chip tháng ĐÃ ĐẶT (bấm để nạp lại)
  function renderX2ChonNanRateBar() {
    const selEl = document.getElementById('x2-cn-rate-month');
    const valInput = document.getElementById('x2-cn-rate-value');
    if (!selEl) return;
    const months = new Set([
      ...(state.xuong2ChonNanThoRecords || []).map(r => String(r.date || '').slice(0, 7)),
      ...Object.keys(state.x2ChonNanRates || {}),
      new Date().toISOString().slice(0, 7)
    ]);
    const curMonth = selEl.value || new Date().toISOString().slice(0, 7);
    const list = [...months].filter(Boolean).sort((a, b) => b.localeCompare(a));
    selEl.innerHTML = list
      .map(m => `<option value="${escapeHTML(m)}">Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</option>`).join('');
    selEl.value = months.has(curMonth) ? curMonth : list[0] || '';
    if (valInput) {
      const v = Number((state.x2ChonNanRates || {})[selEl.value]);
      valInput.value = Number.isFinite(v) && v > 0 ? v : '';
    }
    const chips = document.getElementById('x2-cn-rate-chips');
    if (chips) {
      const keys = Object.keys(state.x2ChonNanRates || {})
        .filter(k => Number(state.x2ChonNanRates[k]) > 0)
        .sort((a, b) => b.localeCompare(a));
      chips.innerHTML = keys.map(k => `<button type="button" class="x2-rate-chip" data-x2-cn-rate="${escapeHTML(k)}" title="Bấm để nạp định mức tháng này vào ô nhập để sửa lại">T${Number(k.slice(5))} = ${fmtThanh(state.x2ChonNanRates[k])} thanh/h</button>`).join('');
    }
    initLucide();
  }

  // ─── NẠP / LƯU DỮ LIỆU CHỌN NAN THÔ ──────────────────────────
  function loadXuong2ChonNan() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG2_CHON_NAN);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.xuong2ChonNanThoRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.xuong2ChonNanThoRecords = []; }
    } else {
      state.xuong2ChonNanThoRecords = [];
    }
  }

  function saveXuong2ChonNan() {
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_CHON_NAN, JSON.stringify(state.xuong2ChonNanThoRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    logDataChange(['xuong2ChonNanThoRecords']); // ghi lịch sử sửa đổi
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT CHỌN NAN THÔ ────────────────
  // Link SỐNG tới lô đã bào thô (ngày bào thô · loại NL · NCC); lượt bào thô đã bị
  // xóa → dùng snapshot đã lưu khi ghi nhận.
  function chonNanDisplay(r) {
    const bt = baoThoLotOf(r.baothoId);
    const btD = bt ? baoThoDisplay(bt) : null;
    const dims = Array.isArray(r.dims) && r.dims.length === 3
      ? r.dims.map(Number)
      : parseDimList(String(r.sizeKey || '').replace(/×/g, ','));
    const unitVol = (r.unitVol != null) ? Number(r.unitVol) : unitVolOf(dims[0], dims[1], dims[2]);
    const quantity = Number(r.quantity) || 0;
    // Người chọn nan + giờ chọn: SỐNG từ Bảng bố trí Nhân Sự theo ngày; mất bố trí → snapshot
    const live = hrChonNanAssignmentsOf(r.date || '');
    const workerRows = live.length
      ? live.map(a => ({ name: a.name, time: posTimeStr(a) }))
      : String(r.worker || '').split(',').map(s => s.trim()).filter(Boolean)
          .map((name, i) => ({ name, time: String(r.workTime || '').split(',').map(s => s.trim())[i] || '' }));
    let workHours = 0, workHoursHC = null, workHoursTC = null;
    if (live.length) {
      const sp = sumPosHoursSplit(live, r.date || '');
      workHours = sp.hc + sp.tc;
      workHoursHC = sp.hc; workHoursTC = sp.tc;
    } else if (Number.isFinite(Number(r.workHoursHC)) || Number.isFinite(Number(r.workHoursTC))) {
      workHoursHC = Number(r.workHoursHC) || 0;
      workHoursTC = Number(r.workHoursTC) || 0;
      workHours = workHoursHC + workHoursTC;
      if (!workHours && Number(r.workHours) > 0) workHours = Number(r.workHours);
    } else if (Number(r.workHours) > 0) {
      workHours = Number(r.workHours);
    } else {
      workHours = snapshotCutHours(r.workTime);
    }
    return {
      id: r.id,
      date: r.date || '',
      external: !!r.external,
      materialType: btD ? btD.materialType : (r.materialType || ''),
      supplier: btD ? btD.supplier : (r.supplier || ''),
      boDate: btD ? btD.boDate : (r.boDate || ''),
      btDate: bt ? (bt.date || '') : (r.btDate || ''),
      dims, unitVol,
      sizeKey: r.sizeKey || dimKeyOf(dims[0], dims[1], dims[2]),
      cls: r.cls || 'A',
      quantity,
      // Thể tích của lượt = số thanh × thể tích 1 thanh (làm tròn 4 số khi hiển thị)
      volume: Math.round(quantity * unitVol * 10000) / 10000,
      workerRows,
      workHours,
      workHoursHC,
      workHoursTC
    };
  }

  // ─── THANH TIẾN ĐỘ: LÔ BÀO THÔ CHƯA ĐƯỢC CHỌN NAN ────────────
  function renderX2ChonNanStockBar() {
    const bar = document.getElementById('x2-cn-stock-bar');
    if (!bar) return;
    const lots = baoThoLotList();
    const pending = lots.filter(bt => chonNanRunsOf(bt.id) === 0);
    if (!lots.length) {
      bar.innerHTML = `<span class="x2-stock-title" title="Chưa có lô nào được chạy máy bào thô"><i data-lucide="alert-circle"></i> Chờ chọn nan: <strong>Chưa có lô bào thô</strong></span>`;
    } else if (!pending.length) {
      bar.innerHTML = `<span class="x2-stock-title" title="Mọi lô đã chạy máy bào thô đều đã có lượt chọn nan"><i data-lucide="check-circle-2"></i> Chờ chọn nan: <strong>Đã chọn hết ${lots.length} lô</strong></span>`;
    } else {
      bar.innerHTML = `<span class="x2-stock-title" title="Các lô đã chạy máy bào thô NHƯNG chưa ghi lượt chọn nan nào (chi tiết ở ô chọn lô trong form)"><i data-lucide="hourglass"></i> Chờ chọn nan: <strong>${pending.length} / ${lots.length} lô bào thô chưa chọn</strong></span>`;
    }
    initLucide();
  }

  // ─── FORM GHI NHẬN LƯỢT CHỌN NAN THÔ ─────────────────────────
  // Ô chọn lô = các lượt CHẠY MÁY BÀO THÔ (chọn theo NGÀY BÀO THÔ) — nhãn GỌN:
  // ngày bào thô · loại NL · NCC (+ số lượt đã chọn). KHÔNG liệt kê kích thước ở
  // đây (kích thước đã có ở ô "Loại nan" ngay dưới).
  // NGOÀI RA ô chọn lô còn có lựa chọn "➕ Thêm loại mới" = nan mua ở NGOÀI công
  // đoạn (không gắn lô bào thô nào): khi chọn, ô "Loại nan" được THAY bằng ô
  // "Nhà cung cấp" (tự khai NCC) và hiện 3 ô Dài/Rộng/Dày để nhập kích thước.
  const CN_NEW_LOT_VALUE = '__new__'; // lựa chọn "Thêm loại mới" trong ô LÔ BÀO THÔ
  function fillXuong2ChonNanOptions() {
    const sel = document.getElementById('x2-cn-baotho');
    if (!sel) return;
    const lots = baoThoLotList().map(bt => {
      const d = baoThoDisplay(bt);
      const runs = chonNanRunsOf(bt.id);
      const runTxt = runs > 0 ? ` · đã chọn ${runs} lượt` : '';
      return `<option value="${escapeHTML(bt.id)}">Bào thô ${formatDateDDMMYY(bt.date)} · ${escapeHTML(d.materialType || '—')} · NCC ${escapeHTML(d.supplier || '—')}${escapeHTML(runTxt)}</option>`;
    });
    let html = lots.join('');
    if (!html) html = `<option value="" disabled>— Chưa có lô bào thô (vẫn có thể chọn "Thêm loại mới") —</option>`;
    // Lựa chọn "Thêm loại mới" — nan nhập NGOÀI công đoạn (tự khai NCC + kích thước)
    html += `<option value="${CN_NEW_LOT_VALUE}">➕ Thêm loại mới (nan mua ngoài — tự khai Nhà cung cấp)</option>`;
    sel.innerHTML = html;
    fillX2ChonNanNccSuggestions();
    updateXuong2ChonNanLinked();
  }

  // Gợi ý Nhà cung cấp cho ô nhập tay (nan mua ngoài): lấy từ danh mục Nhà cung
  // cấp (tab Nguyên Liệu) + các NCC đã từng nhập ở nhật ký nguyên liệu.
  function fillX2ChonNanNccSuggestions() {
    const dl = document.getElementById('x2-cn-ncc-list');
    if (!dl) return;
    const names = new Set();
    (state.suppliers || []).forEach(s => { if (s && s.name) names.add(String(s.name).trim()); });
    (state.materialRecords || []).forEach(r => { if (r && r.supplier) names.add(String(r.supplier).trim()); });
    dl.innerHTML = [...names].filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'))
      .map(n => `<option value="${escapeHTML(n)}"></option>`).join('');
  }

  // Ô chọn lô bào thô / đổi lô → nạp lại danh sách LOẠI NAN (kích thước của lô đó)
  // + điền sẵn ngày chọn theo ngày bào thô (khi ghi mới) + vẽ ô tự tính.
  // Chọn "Thêm loại mới" ở ô LÔ → đổi sang chế độ NAN MUA NGOÀI (ô Nhà cung cấp).
  function updateXuong2ChonNanLinked() {
    const sel = document.getElementById('x2-cn-baotho');
    const isNew = !!(sel && sel.value === CN_NEW_LOT_VALUE);
    const bt = baoThoLotOf(sel ? sel.value : '');
    if (!state.x2ChonNanEditId && bt) {
      const d = document.getElementById('x2-cn-date');
      if (d && !d.value) d.value = bt.date || todayISO();
    }
    renderX2ChonNanSizeOptions(isNew ? null : bt);
    syncX2ChonNanExternalFields();
    renderX2ChonNanCalc();
  }

  // Danh sách LOẠI NAN = các tổ hợp kích thước của LÔ ĐÃ BÀO THÔ đang chọn
  // (mỗi loại hiện kèm số thanh đã chọn để biết còn phải chọn bao nhiêu).
  // Nan mua NGOÀI công đoạn KHÔNG nằm ở đây — chọn ở ô Lô ("Thêm loại mới").
  function renderX2ChonNanSizeOptions(bt) {
    const sel = document.getElementById('x2-cn-size');
    if (!sel) return;
    const editing = state.x2ChonNanEditId
      ? (state.xuong2ChonNanThoRecords || []).find(r => r.id === state.x2ChonNanEditId)
      : null;
    const cur = sel.value;
    const combos = bt ? baoThoDisplay(bt).combos : [];
    let html = combos.map(c => {
      const key = dimKeyOf(c.d, c.r, c.t);
      const done = chonNanQtyBySizeOf(bt.id, key, editing ? editing.id : null);
      const doneTxt = done > 0 ? ` — đã chọn ${fmtThanh(done)} thanh` : '';
      return `<option value="${escapeHTML(key)}">${comboLabel(c)}${escapeHTML(doneTxt)}</option>`;
    }).join('');
    if (!html) html = `<option value="">— Chọn lô bào thô có kích thước (hoặc "Thêm loại mới" ở ô Lô) —</option>`;
    sel.innerHTML = html;
    // GIỮ NGUYÊN lựa chọn trước đó để bấm Lưu số lượng liên tiếp không phải chọn lại
    if (cur && sel.innerHTML.includes(`value="${escapeHTML(cur)}"`)) sel.value = cur;
  }

  // Hiện/ẩn theo 2 CHẾ ĐỘ của form (đổi ở ô LÔ ĐÃ BÀO THÔ):
  //   • Lô có sẵn      → hiện ô "Loại nan" (kích thước của lô), ẩn NCC + 3 ô kích thước
  //   • "Thêm loại mới" → ẩn ô "Loại nan", hiện ô "Nhà cung cấp" + 3 ô Dài/Rộng/Dày
  function syncX2ChonNanExternalFields() {
    const sel = document.getElementById('x2-cn-baotho');
    const isNew = !!(sel && sel.value === CN_NEW_LOT_VALUE);
    const sizeGroup = document.getElementById('x2-cn-size-group');
    if (sizeGroup) sizeGroup.style.display = isNew ? 'none' : '';
    const nccGroup = document.getElementById('x2-cn-ncc-group');
    if (nccGroup) nccGroup.style.display = isNew ? '' : 'none';
    const wrap = document.getElementById('x2-cn-new-size-row');
    if (wrap) wrap.style.display = isNew ? '' : 'none';
    return isNew;
  }

  // Kích thước đang chọn của form: { dims:[d,r,t], sizeKey, external }
  //   • chọn LÔ có sẵn → lấy cỡ nan ở ô "Loại nan" của lô đó, external = false (CỘNG sang Bào Thô)
  //   • chọn "Thêm loại mới" ở ô LÔ → lấy 3 ô Dài/Rộng/Dày, external = true (KHÔNG cộng)
  function currentChonNanSize() {
    const lotSel = document.getElementById('x2-cn-baotho');
    const external = !!(lotSel && lotSel.value === CN_NEW_LOT_VALUE);
    if (external) {
      const dims = [
        Number((document.getElementById('x2-cn-dai') || {}).value) || 0,
        Number((document.getElementById('x2-cn-rong') || {}).value) || 0,
        Number((document.getElementById('x2-cn-day') || {}).value) || 0
      ];
      return { dims, sizeKey: dimKeyOf(dims[0], dims[1], dims[2]), external: true };
    }
    const v = ((document.getElementById('x2-cn-size') || {}).value) || '';
    const parts = String(v || '').split('×').map(s => Number(String(s).trim()));
    return { dims: parts, sizeKey: v, external: false };
  }

  // Ô TỰ TÍNH: thể tích 1 thanh · thể tích lượt + cảnh báo NGUỒN (cộng/không cộng)
  function renderX2ChonNanCalc() {
    const box = document.getElementById('x2-cn-calc');
    if (!box) return;
    const size = currentChonNanSize();
    const [d, r, t] = size.dims;
    if (!(d > 0 && r > 0 && t > 0)) {
      box.innerHTML = `<span class="x2-ong-calc-label">Chọn loại nan (hoặc nhập Dài/Rộng/Dày khi thêm mới)</span>`;
      return;
    }
    const unit = unitVolOf(d, r, t);
    const qty = Number((document.getElementById('x2-cn-qty') || {}).value) || 0;
    const vol = Math.round(qty * unit * 10000) / 10000;
    const srcTxt = size.external
      ? '<strong style="color:#b45309;">ngoài công đoạn</strong>'
      : '<strong style="color:#0f766e;">từ lô bào thô</strong>';
    box.innerHTML = `
      <span class="x2-ong-calc-item x2-ong-calc-in" title="Thể tích 1 thanh = Dài × Rộng × Dày (mm) ÷ 1 tỷ"><span class="x2-ong-calc-label">Thể tích 1 thanh:</span><strong>${unit.toFixed(4)} m³</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-bo" title="Thể tích của lượt = số lượng × thể tích 1 thanh"><span class="x2-ong-calc-label">Thể tích lượt:</span><strong>${vol.toFixed(4)} m³</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-after" title="${size.external ? 'Loại nan nhập ở NGOÀI công đoạn → số lượng này KHÔNG cộng vào tổng của Chạy Máy Bào Thô' : 'Loại nan lấy từ lô bào thô → số lượng CỘNG vào tổng của Chạy Máy Bào Thô'}"><span class="x2-ong-calc-label">Nguồn:</span>${srcTxt}</span>`;
  }

  function resetXuong2ChonNanForm() {
    state.x2ChonNanEditId = null;
    ['x2-cn-dai', 'x2-cn-rong', 'x2-cn-day', 'x2-cn-qty', 'x2-cn-ncc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const cls = document.getElementById('x2-cn-class');
    if (cls) cls.value = 'A';
    const d = document.getElementById('x2-cn-date');
    if (d) d.value = '';
    const sizeSel = document.getElementById('x2-cn-size');
    if (sizeSel) sizeSel.value = '';
    fillXuong2ChonNanOptions();          // nạp lại lô + chế độ lô/NCC + cỡ nan của lô đầu
    // Về CHẾ ĐỘ LÔ CÓ SẴN (thoát "Thêm loại mới"): chọn lô bào thô đầu danh sách
    const lotSel = document.getElementById('x2-cn-baotho');
    const lots = baoThoLotList();
    if (lotSel) lotSel.value = lots.length ? lots[0].id : '';
    updateXuong2ChonNanLinked();
    syncX2ChonNanEditBanner();
  }

  // ─── SAU KHI LƯU (ghi mới): GIỮ NGUYÊN Lô · Ngày · Loại nan · Phân loại ──
  // Người chọn nan thường nhập liên tiếp nhiều số lượng cho cùng một loại nan /
  // nhiều phân loại → chỉ XOÁ ô Số lượng, không bắt chọn lại từ đầu.
  function keepChonNanFormAfterSave() {
    state.x2ChonNanEditId = null;
    const qty = document.getElementById('x2-cn-qty');
    if (qty) qty.value = '';
    const sel = document.getElementById('x2-cn-baotho');
    const isNew = !!(sel && sel.value === CN_NEW_LOT_VALUE);
    const bt = baoThoLotOf(sel ? sel.value : '');
    renderX2ChonNanSizeOptions(isNew ? null : bt); // nạp lại số "đã chọn X thanh" nhưng GIỮ lựa chọn
    syncX2ChonNanExternalFields();                 // giữ nguyên chế độ lô / nan mua ngoài
    renderX2ChonNanCalc();
    syncX2ChonNanEditBanner();
  }

  // ─── LƯU FORM CHỌN NAN THÔ (THÊM / SỬA) ──────────────────────
  function handleXuong2ChonNanSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x2-cn-baotho');
    const lotVal = sel ? sel.value : '';
    const isExternalLot = lotVal === CN_NEW_LOT_VALUE;   // "Thêm loại mới" = nan mua NGOÀI công đoạn
    const baothoId = isExternalLot ? '' : lotVal;
    const bt = baoThoLotOf(lotVal);
    if (!bt && !isExternalLot) {
      showToast('Hãy chọn LÔ ĐÃ BÀO THÔ (hoặc "Thêm loại mới" khi nan mua ngoài)!', 'error');
      return;
    }

    const dateVal = (document.getElementById('x2-cn-date') || {}).value || '';
    if (!dateVal) { showToast('Ngày chọn nan không được để trống!', 'error'); return; }

    // LOẠI NAN: chọn từ danh sách kích thước của lô, hoặc nhập mới (nan mua ngoài)
    const size = currentChonNanSize();
    const [d, r, t] = size.dims;
    if (!(d > 0 && r > 0 && t > 0)) {
      showToast(size.external
        ? 'Nhập đủ Dài / Rộng / Dày (mm) cho loại nan thêm mới!'
        : 'Hãy chọn Loại nan (kích thước) cho lượt chọn này!', 'error');
      return;
    }
    // NHÀ CUNG CẤP: nan mua ngoài → nhập tay (bắt buộc); lô có sẵn → lấy NCC của lô
    const nccInput = ((document.getElementById('x2-cn-ncc') || {}).value || '').trim();
    if (size.external && !nccInput) {
      showToast('Nan mua ngoài công đoạn: hãy ghi Nhà cung cấp!', 'error');
      return;
    }
    const cls = (document.getElementById('x2-cn-class') || {}).value || 'A';
    if (!NAN_CLASSES.some(c => c.id === cls)) { showToast('Hãy chọn phân loại nan!', 'error'); return; }
    const quantity = Number((document.getElementById('x2-cn-qty') || {}).value) || 0;
    if (!Number.isFinite(quantity) || quantity <= 0) { showToast('Số lượng phải là số thanh lớn hơn 0!', 'error'); return; }

    // NGƯỜI CHỌN NAN + THỜI GIAN: TỰ ĐỘNG từ Bảng bố trí Nhân Sự (vị trí "Chọn nan")
    const snap = hrChonNanSnapshot(dateVal);
    const btD = bt ? baoThoDisplay(bt) : null;
    const unitVol = unitVolOf(d, r, t);
    const payload = {
      baothoId,
      external: !!size.external,   // true = nan mua ngoài công đoạn → KHÔNG cộng sang Bào Thô
      materialId: bt ? (bt.materialId || '') : '',
      materialType: btD ? (btD.materialType || '') : '',
      supplier: size.external ? nccInput : (btD ? (btD.supplier || '') : ''), // NCC: ngoài công đoạn → nhập tay
      boDate: btD ? (btD.boDate || '') : '',
      btDate: bt ? (bt.date || '') : '',
      date: dateVal,
      week: materialWeekLabel(dateVal),
      dims: [d, r, t],
      sizeKey: size.sizeKey || dimKeyOf(d, r, t),
      cls,
      quantity,
      unitVol,
      volume: Math.round(quantity * unitVol * 10000) / 10000,
      worker: snap.worker, workTime: snap.workTime,
      workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC
    };

    if (state.x2ChonNanEditId) {
      const rec = (state.xuong2ChonNanThoRecords || []).find(r2 => r2.id === state.x2ChonNanEditId);
      if (!rec) { showToast('Không tìm thấy lượt chọn nan cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong2ChonNan();
      showToast('Đã cập nhật lượt chọn nan thô!', 'success');
      resetXuong2ChonNanForm();          // sửa xong → về form ghi mới (trắng)
    } else {
      (state.xuong2ChonNanThoRecords = state.xuong2ChonNanThoRecords || []).push({
        id: 'x2cn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong2ChonNan();
      showToast('Đã ghi lượt chọn nan thô!', 'success');
      keepChonNanFormAfterSave();        // GIỮ lô/ngày/loại nan/phân loại để nhập tiếp
    }
    renderX2ChonNanCard();
  }

  // ─── SỬA / XÓA LƯỢT CHỌN NAN (bảng lịch sử) ──────────────────
  function editXuong2ChonNan(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2ChonNanThoRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x2ChonNanEditId = id;
    fillXuong2ChonNanOptions();
    const sel = document.getElementById('x2-cn-baotho');
    // Lượt nan MUA NGOÀI (external) không gắn lô bào thô → chọn lại "Thêm loại mới"
    if (sel) sel.value = rec.external ? CN_NEW_LOT_VALUE : (rec.baothoId || '');
    renderX2ChonNanSizeOptions(rec.external ? null : baoThoLotOf(rec.baothoId));
    const sizeSel = document.getElementById('x2-cn-size');
    if (sizeSel && !rec.external) sizeSel.value = rec.sizeKey || '';
    const nccEl = document.getElementById('x2-cn-ncc');
    if (nccEl) nccEl.value = rec.external ? (rec.supplier || '') : '';
    syncX2ChonNanExternalFields();
    const d = document.getElementById('x2-cn-date');
    if (d) d.value = rec.date || '';
    const dims = Array.isArray(rec.dims) ? rec.dims : [];
    const setVal = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = (v == null || v === '') ? '' : String(v); };
    setVal('x2-cn-dai', dims[0]); setVal('x2-cn-rong', dims[1]); setVal('x2-cn-day', dims[2]);
    setVal('x2-cn-qty', rec.quantity);
    const cls = document.getElementById('x2-cn-class');
    if (cls) cls.value = rec.cls || 'A';
    renderX2ChonNanCalc();
    syncX2ChonNanEditBanner();
  }

  function deleteXuong2ChonNan(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2ChonNanThoRecords || []).find(r => r.id === id);
    if (!rec) return;
    const d = chonNanDisplay(rec);
    if (!confirm(`Xóa lượt chọn nan ngày ${formatDateDDMMYY(rec.date)} (${comboLabel({ d: d.dims[0], r: d.dims[1], t: d.dims[2] })} · ${nanClassLabel(d.cls)} · ${fmtThanh(d.quantity)} thanh)?`)) return;
    trackDeleted('xuong2ChonNanThoRecords', id); // tombstone: không bị mây/máy khác hồi sinh
    state.xuong2ChonNanThoRecords = (state.xuong2ChonNanThoRecords || []).filter(r => r.id !== id);
    if (state.x2ChonNanEditId === id) resetXuong2ChonNanForm();
    saveXuong2ChonNan();
    renderX2ChonNanCard();
    showToast('Đã xóa lượt chọn nan thô!', 'success');
  }

  function syncX2ChonNanEditBanner() {
    const banner = document.getElementById('x2-cn-edit-banner');
    if (!banner) return;
    const txt = document.getElementById('x2-cn-edit-text');
    if (state.x2ChonNanEditId) {
      const rec = (state.xuong2ChonNanThoRecords || []).find(r => r.id === state.x2ChonNanEditId);
      if (txt) {
        txt.textContent = rec
          ? `Đang sửa lượt chọn nan ngày ${formatDateDDMMYY(rec.date)} — bấm "Lưu Lượt Chọn Nan" hoặc "Làm Mới Form" để thoát.`
          : 'Đang sửa lượt chọn nan thô.';
      }
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  // Thu gọn / mở rộng BẢNG LỊCH SỬ chọn nan (form vẫn hiện để tiếp tục nhập)
  function toggleX2ChonNanTable() {
    const wrap = document.getElementById('x2-cn-table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('x2-cut-collapsed');
    initLucide();
  }

  // ─── THỐNG KÊ NHANH CỦA VỊ TRÍ CHỌN NAN THÔ ──────────────────
  function renderX2ChonNanStats() {
    const box = document.getElementById('x2-cn-stats');
    if (!box) return;
    const disp = (state.xuong2ChonNanThoRecords || []).map(chonNanDisplay);
    const main = disp.filter(d => !d.external);   // phần CỘNG sang Bào Thô
    const ext = disp.filter(d => d.external);     // nhập ngoài công đoạn
    const sumQty = arr => arr.reduce((s, d) => s + d.quantity, 0);
    const sumVol = arr => arr.reduce((s, d) => s + d.volume, 0);
    const totalQty = sumQty(main);
    const rejQty = main.filter(d => d.cls === 'reject').reduce((s, d) => s + d.quantity, 0);
    const rejPct = totalQty > 0 ? (rejQty / totalQty) * 100 : null;
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${disp.length}</span>
        <span class="material-stat-label">Lượt chọn nan</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(sumQty(main))}</span>
        <span class="material-stat-label">Thanh nan thô (cộng sang Bào Thô)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${sumVol(main).toFixed(4)}</span>
        <span class="material-stat-label">Thể tích nan thô (m³)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${rejPct == null ? '—' : `${fmtRatio(rejPct)}%`}</span>
        <span class="material-stat-label">Tỷ lệ loại hẳn</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(sumQty(ext))}</span>
        <span class="material-stat-label">Thanh nhập ngoài (không cộng)</span>
      </div>`;
  }

  // ─── BẢNG LỊCH SỬ CHỌN NAN THÔ — NHÓM THEO NGÀY (thẻ ngày) ────
  // ĐẦU THẺ (nội dung CHUNG của ngày): Ngày · Người chọn nan (tự động từ Bảng bố
  // trí Nhân Sự) · Thời gian (giờ HC/TC) · Công suất (thanh/h) · Hiệu suất ·
  // TỔNG SỐ THANH · TỔNG THỂ TÍCH · Tỷ lệ loại.
  // TRONG THẺ (nội dung RIÊNG từng nhánh): Loại nan (kích thước) · Phân loại ·
  // Số lượng · Thể tích · Tỷ lệ loại (của chính cỡ nan đó trong ngày).
  //   Công suất thực tế = TỔNG SỐ THANH ÷ tổng giờ chọn nan (thanh/h)
  //   Hiệu suất = Công suất thực tế ÷ Định mức chọn nan của tháng (thanh/h)
  function renderX2ChonNanTable() {
    const box = document.getElementById('x2-cn-day-cards');
    if (!box) return;
    const list = [...(state.xuong2ChonNanThoRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const countEl = document.getElementById('x2-cn-table-count');
    if (countEl) countEl.textContent = list.length ? `${list.length} lượt chọn nan` : '';
    if (!list.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="list-checks"></i>
          <div>Chưa có lượt chọn nan nào.<br>Chọn <strong>Lô Đã Bào Thô</strong> + <strong>Loại nan</strong> + <strong>Phân loại</strong> + <strong>Số lượng</strong> ở form trên rồi bấm <strong>Lưu Lượt Chọn Nan</strong>.<br><span style="font-size:0.72rem;">Số lượng của loại nan lấy từ lô bào thô sẽ tự cộng sang thẻ Chạy Máy Bào Thô.</span></div>
        </div>`;
      initLucide();
      return;
    }
    // Gộp theo NGÀY (đã sort mới nhất lên đầu — Map giữ đúng thứ tự nhóm)
    const groups = new Map();
    list.forEach(r => {
      const key = r.date || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let html = '';
    for (const [date, rows] of groups) html += chonNanDayCardHtml(date, rows);
    box.innerHTML = html;
    initLucide();
  }

  // 1 THẺ NGÀY của công đoạn Chọn Nan Thô (đầu thẻ chung + bảng nhánh)
  function chonNanDayCardHtml(date, rows) {
    const first = chonNanDisplay(rows[0]); // thông tin CHUNG của ngày (người chọn/giờ)
    const disp = rows.map(chonNanDisplay);
    // Tổng của ngày (CHỈ tính phần cộng sang Bào Thô — bỏ lượt nhập ngoài công đoạn)
    const main = disp.filter(d => !d.external);
    const totalQty = main.reduce((s, d) => s + d.quantity, 0);
    const totalVol = main.reduce((s, d) => s + d.volume, 0);
    // Tỷ lệ loại theo TỪNG CỠ: số thanh "Loại hẳn" ÷ tổng số thanh của cỡ đó (trong ngày)
    const sizeTotals = {};
    main.forEach(d => {
      const k = d.sizeKey;
      sizeTotals[k] = sizeTotals[k] || { qty: 0, rej: 0 };
      sizeTotals[k].qty += d.quantity;
      if (d.cls === 'reject') sizeTotals[k].rej += d.quantity;
    });
    const rejQty = main.filter(d => d.cls === 'reject').reduce((s, d) => s + d.quantity, 0);
    const rejPct = totalQty > 0 ? (rejQty / totalQty) * 100 : null;
    const rowsHtml = disp.map(d => chonNanRowHtml(d, sizeTotals[d.sizeKey])).join('');
    const hours = first.workHours || 0;                 // tổng giờ chọn nan (HC + TC)
    const cap = hours > 0 ? (totalQty / hours) : null;  // công suất thực tế (thanh/h)
    const rate = chonNanRateOf(date);                   // định mức tháng (thanh/h)
    const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
    const effTxt = eff == null
      ? '<em style="color:var(--text-muted);">—</em>'
      : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
    const effTip = eff == null
      ? 'Chưa đủ dữ liệu (thiếu giờ chọn nan hoặc chưa đặt Định mức công suất chọn nan cho tháng này)'
      : `Hiệu suất = Công suất thực tế (${fmtThanh(cap)} thanh/h) ÷ Định mức chọn nan tháng ${Number(String(date).slice(5))} (${fmtThanh(rate)} thanh/h)`;
    const hcTxt = first.workHoursHC != null ? fmtRatio(first.workHoursHC) : '—';
    const tcTxt = first.workHoursTC != null ? fmtRatio(first.workHoursTC) : '—';
    const workers = first.workerRows.filter(x => x.name);
    const workersMain = workers.length
      ? `${escapeHTML(workers[0].name)}${workers[0].time ? ` (${escapeHTML(workers[0].time)})` : ''}`
      : '<em style="color:var(--text-muted);">Chưa có bố trí vị trí Chọn Nan Thô</em>';
    const workersMore = workers.length > 1
      ? `<em class="x2-day-cutters-more" title="Người khác cùng ngày: ${escapeHTML(workers.slice(1).map(x => `${x.name}${x.time ? ` (${x.time})` : ''}`).join(', '))}">+${workers.length - 1} người khác</em>`
      : '';
    return `
      <div class="x2-day-card">
        <div class="x2-day-head">
          <span class="x2-day-date"><i data-lucide="calendar"></i> ${formatDateDDMMYY(date)}</span>
          <span class="x2-day-cutters" title="Người chọn nan — tự động từ Bảng bố trí vị trí 'Chọn Nan Thô' (tab Nhân Sự) đúng ngày">
            <i data-lucide="users"></i> ${workersMain} ${workersMore}
          </span>
          <span class="x2-day-hours" title="Thời gian = tổng giờ công vị trí Chọn Nan Thô trong ngày (từ tab Nhân Sự), tách giờ hành chính (HC) / giờ tăng ca (TC)">Thời gian: <span class="x2-hours-hc">${hcTxt}h HC</span><span class="x2-hours-tc">${tcTxt}h TC</span></span>
          <span class="x2-day-cap" title="Công suất thực tế = Tổng số thanh (${fmtThanh(totalQty)} thanh) ÷ tổng giờ chọn nan (${fmtRatio(hours)} h)">Công suất: <strong>${cap != null ? `${fmtThanh(cap)} thanh/h` : '—'}</strong></span>
          <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
          <span class="x2-day-sum" title="Tổng số thanh nan thô đã chọn trong ngày (KHÔNG gồm các lượt nhập ở ngoài công đoạn)"><i data-lucide="hash"></i> Tổng thanh: <strong>${fmtThanh(totalQty)}</strong></span>
          <span class="x2-day-sum" title="Tổng thể tích quy đổi của số thanh đã chọn trong ngày"><i data-lucide="box"></i> Tổng thể tích: <strong>${totalVol.toFixed(4)} m³</strong></span>
          <span class="x2-day-sum" title="Tỷ lệ loại = số thanh 'Loại hẳn' ÷ tổng số thanh đã chọn trong ngày"><i data-lucide="alert-triangle"></i> Tỷ lệ loại: <strong>${rejPct == null ? '—' : `${fmtRatio(rejPct)}%`}</strong></span>
        </div>
        <table class="data-table x2-day-table">
          <thead>
            <tr>
              <th>Loại nan (Dài × Rộng × Dày)</th>
              <th>Phân loại</th>
              <th class="text-right">Số lượng</th>
              <th class="text-right">Thể tích</th>
              <th class="text-right">Tỷ lệ loại</th>
              <th class="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }

  // 1 DÒNG NHÁNH: Loại nan · Phân loại · Số lượng · Thể tích · Tỷ lệ loại (theo cỡ)
  function chonNanRowHtml(d, sizeStat) {
    const rejPct = (sizeStat && sizeStat.qty > 0) ? (sizeStat.rej / sizeStat.qty) * 100 : null;
    const clsChip = `<span class="x2-nan-cls x2-nan-cls-${escapeHTML(d.cls)}" title="${escapeHTML(nanClassLabel(d.cls))}">${escapeHTML(nanClassLabel(d.cls))}</span>`;
    const extChip = d.external
      ? `<div><span class="x2-nan-ext" title="Loại nan nhập ở NGOÀI công đoạn — KHÔNG cộng vào tổng của Chạy Máy Bào Thô"><i data-lucide="alert-triangle"></i> ngoài công đoạn</span></div>`
      : '';
    // Nan mua ngoài: KHÔNG có lô bào thô → ghi rõ nhà cung cấp tự khai
    const noteLine = d.external
      ? `Nan mua ngoài · NCC ${escapeHTML(d.supplier || '—')}`
      : `Bào thô ${formatDateDDMMYY(d.btDate)} · ${escapeHTML(d.materialType || '—')} · NCC ${escapeHTML(d.supplier || '—')}`;
    return `
      <tr class="x2-day-row" data-x2-cn-row="${escapeHTML(d.id)}">
        <td>
          <span class="x2-nan-chip">${comboLabel({ d: d.dims[0], r: d.dims[1], t: d.dims[2] })}</span>
          <div class="x2-row-note">${noteLine}</div>
        </td>
        <td>${clsChip}${extChip}</td>
        <td class="text-right"><strong>${fmtThanh(d.quantity)}</strong> <small style="color:var(--text-muted);">thanh</small></td>
        <td class="text-right"><strong style="color:#0f766e;">${d.volume.toFixed(4)}</strong> <small style="color:var(--text-muted);">m³</small></td>
        <td class="text-right">${rejPct == null ? '—' : `<strong style="color:${rejPct > 10 ? '#b45309' : '#0f766e'};">${fmtRatio(rejPct)}%</strong>`}</td>
        <td class="text-right">
          <button class="btn btn-icon btn-outline" title="Sửa" data-x2-cn-edit="${escapeHTML(d.id)}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-icon btn-danger" title="Xóa" data-x2-cn-delete="${escapeHTML(d.id)}"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
  }

  // ─── RENDER BẢNG CHI TIẾT CHỌN NAN THÔ ───────────────────────
  function renderX2ChonNanCard() {
    fillXuong2ChonNanOptions();   // ô chọn lô bào thô + danh sách loại nan + ô tự tính
    renderX2ChonNanStockBar();    // tiến độ: lô bào thô chưa chọn nan
    renderX2ChonNanRateBar();     // định mức công suất chọn nan theo tháng (thanh/h)
    renderX2ChonNanStats();
    renderX2ChonNanTable();       // thẻ ngày: đầu thẻ chung + các nhánh trong thẻ
    syncX2ChonNanEditBanner();
    updateXuong2CardCounts();
    // Số thanh vừa chọn → cập nhật lại thẻ CHẠY MÁY BÀO THÔ nếu đang mở (chỉ 1
    // thẻ được mở tại một thời điểm nên không thể là chính thẻ này → không lặp)
    if (openX2Card && openX2Card.id === 'x2-bao-tho-card') renderX2BaoThoCard();
  }

  // ─── RENDER KHU VỰC XƯỞNG 2 (gọi từ main.js) ─────────────────
  // ═══════════════════════════════════════════════════════════
  // VỊ TRÍ: BÀO TINH — Xưởng 2 (thẻ launcher tab Công Đoạn)
  // ═══════════════════════════════════════════════════════════
  // Mỗi lượt ghi: NGÀY BÀO · LOẠI BÀO · nguồn thanh ("Chọn thanh") ·
  // KÍCH THƯỚC SAU BÀO · SL thanh ĐẠT · SL thanh LỖI.
  //   • Loại bào = 'tinh'      → nguồn = LÔ ĐANG Ở KHO (thanh đã qua Sấy 2).
  //                              Bào 1 phần được: số dùng = đạt + lỗi, lô còn lại hiện "còn X thanh".
  //   • Loại bào = 'ha_cap'    → nguồn = THANH LỖI sinh ra ở công đoạn Bào Tinh,
  //                              gom THEO CỠ (kích thước sau bào) để hạ cấp lại.
  //   • Loại bào = 'bao_thanh' → TỰ NHẬP kích thước thanh (Dài/Rộng/Dày) + số lượng.
  //   • NGƯỜI BÀO + THỜI GIAN tự động từ Bảng bố trí Nhân Sự (Xưởng 2, đúng ngày,
  //     vị trí chứa "bào tinh" hoặc "bào thanh"; giờ tách HC/TC theo cửa sổ ca)
  //   • ĐỊNH MỨC CÔNG SUẤT theo THÁNG (THANH/GIỜ) → Hiệu suất = Công suất ÷ Định mức
  // Dữ liệu: state.xuong2BaoTinhRecords (localStorage + file + mây, tombstone).
  const BAO_TINH_KINDS = [
    { id: 'tinh',      label: 'Bào tinh' },
    { id: 'ha_cap',    label: 'Bào tinh hạ cấp' },
    { id: 'bao_thanh', label: 'Bào thanh' }
  ];
  function baoTinhKindLabel(id) {
    const k = BAO_TINH_KINDS.find(x => x.id === id);
    return k ? k.label : (id || '—');
  }
  // Vị trí BÀO TINH (chứa "bào tinh") — cũng nhận "Bào thanh" (cùng thẻ này)
  function isBaoTinhPos(name) {
    const n = normPosName(name);
    return n.includes('bao tinh') || n.includes('bao thanh');
  }
  function hrBaoTinhAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isBaoTinhPos); }
  // Snapshot của lượt BÀO TINH (người bào + thời gian + giờ HC/TC)
  function hrBaoTinhSnapshot(dateVal) {
    return workerSnapOf(hrPositionSnapshot(dateVal, hrBaoTinhAssignmentsOf(dateVal)));
  }

  // ─── NGUỒN "LÔ ĐANG Ở KHO" (thanh đã qua Sấy 2) ────────────────
  function baoTinhLotList() {
    return [...(state.batches || [])]
      .filter(b => b && b.stage === 'kho')
      .sort((a, b) => {
        if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }
  function baoTinhLotOf(id) {
    return (state.batches || []).find(b => b && b.id === id) || null;
  }
  // Số thanh ĐÃ bào tinh của 1 lô = Σ số thanh lấy từ lô đó ở các lượt loại 'tinh'.
  // Lượt mới lưu `sources: [{ batchId, qty }]` (chọn được NHIỀU thẻ cùng lúc);
  // bản cũ chỉ có batchId → dùng inQty (= đạt + lỗi).
  function baoTinhLotUsedOf(batchId, excludeId) {
    const id = String(batchId || '');
    if (!id) return 0;
    return (state.xuong2BaoTinhRecords || []).reduce((s, r) => {
      if (!r || r.kind !== 'tinh' || r.id === excludeId) return s;
      if (Array.isArray(r.sources) && r.sources.length) {
        return s + r.sources.reduce((a, src) => a + ((src && String(src.batchId) === id) ? (Number(src.qty) || 0) : 0), 0);
      }
      return s + (String(r.batchId || '') === id ? baoTinhQtyInOf(r) : 0);
    }, 0);
  }
  // Số thanh CÒN LẠI của lô (chưa bào tinh)
  function baoTinhLotRemainingOf(b) {
    if (!b) return 0;
    return Math.max(0, (Number(b.quantity) || 0) - baoTinhLotUsedOf(b.id));
  }

  // ─── TỒN THANH LỖI THEO CỠ (nguồn của "Bào tinh hạ cấp") ──────
  // Tồn = Σ lỗi của MỌI lượt bào tinh ghi ra cỡ đó − Σ(dùng) của các lượt hạ cấp
  // lấy từ cỡ đó. VD: bào 500 thanh ra 480 đạt + 20 lỗi (cỡ 1240×16×6) → tồn
  // lỗi cỡ 1240×16×6 = 20 thanh; hạ cấp dùng 15 → còn 5.
  function baoTinhDefectStock() {
    const recs = state.xuong2BaoTinhRecords || [];
    const map = new Map();
    recs.forEach(r => {
      const dims = Array.isArray(r.outDims) ? r.outDims.map(Number) : [0, 0, 0];
      const sizeKey = String(r.outSizeKey || dimKeyOf(dims[0], dims[1], dims[2]));
      if (!sizeKey) return;
      const cur = map.get(sizeKey) || { sizeKey, dims, total: 0, used: 0 };
      cur.total += Number(r.qtyErr) || 0;
      map.set(sizeKey, cur);
    });
    recs.forEach(r => {
      if (r.kind !== 'ha_cap') return;
      const cur = map.get(String(r.defectKey || ''));
      if (!cur) return;
      cur.used += baoTinhQtyInOf(r);
    });
    return [...map.values()]
      .map(x => ({ ...x, remaining: Math.max(0, x.total - x.used) }))
      .sort((a, b) => b.remaining - a.remaining);
  }
  function baoTinhDefectStockOf(sizeKey) {
    const key = String(sizeKey || '');
    return baoTinhDefectStock().find(x => x.sizeKey === key) || null;
  }

  // ─── SỐ THANH ĐƯA VÀO của 1 lượt = đạt + lỗi ──────────────────
  function baoTinhQtyInOf(rec) {
    return (Number(rec && rec.qtyOk) || 0) + (Number(rec && rec.qtyErr) || 0);
  }

  // ─── ĐỊNH MỨC CÔNG SUẤT BÀO TINH (thanh/giờ) THEO TỪNG THÁNG ──
  function loadX2BaoTinhRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_BAO_TINH_RATE);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        state.x2BaoTinhRates = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
      } catch (e) { state.x2BaoTinhRates = {}; }
    } else {
      state.x2BaoTinhRates = {};
    }
  }

  function saveX2BaoTinhRates() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_BAO_TINH_RATE, JSON.stringify(state.x2BaoTinhRates || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // Định mức công suất bào tinh của tháng chứa dateVal (thanh/giờ) — null nếu chưa đặt
  function baoTinhRateOf(dateVal) {
    const key = String(dateVal || '').slice(0, 7);
    const v = Number((state.x2BaoTinhRates || {})[key]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function handleX2BaoTinhRateSave() {
    if (!requireEditPermission()) return;
    const monthEl = document.getElementById('x2-btinh-rate-month');
    const valEl = document.getElementById('x2-btinh-rate-value');
    const month = String((monthEl && monthEl.value) || '').trim();
    const v = Number((valEl && valEl.value) || 0);
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Chưa chọn tháng để lưu định mức!', 'error'); return; }
    if (!Number.isFinite(v) || v <= 0) { showToast('Định mức công suất phải là số thanh/giờ lớn hơn 0!', 'error'); return; }
    (state.x2BaoTinhRates = state.x2BaoTinhRates || {})[month] = v;
    saveX2BaoTinhRates();
    renderX2BaoTinhRateBar();
    renderX2BaoTinhTable(); // cột Hiệu suất tự cập nhật
    showToast(`Đã lưu định mức bào tinh ${fmtThanh(v)} thanh/giờ cho tháng ${month.slice(5)}!`, 'success');
  }

  // Thanh ĐỊNH MỨC (thanh/giờ): chọn tháng + chip tháng ĐÃ ĐẶT (bấm để nạp lại)
  function renderX2BaoTinhRateBar() {
    const selEl = document.getElementById('x2-btinh-rate-month');
    const valInput = document.getElementById('x2-btinh-rate-value');
    if (!selEl) return;
    const months = new Set([
      ...(state.xuong2BaoTinhRecords || []).map(r => String(r.date || '').slice(0, 7)),
      ...Object.keys(state.x2BaoTinhRates || {}),
      new Date().toISOString().slice(0, 7)
    ]);
    const curMonth = selEl.value || new Date().toISOString().slice(0, 7);
    const list = [...months].filter(Boolean).sort((a, b) => b.localeCompare(a));
    selEl.innerHTML = list
      .map(m => `<option value="${escapeHTML(m)}">Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</option>`).join('');
    selEl.value = months.has(curMonth) ? curMonth : list[0] || '';
    if (valInput) {
      const v = Number((state.x2BaoTinhRates || {})[selEl.value]);
      valInput.value = Number.isFinite(v) && v > 0 ? v : '';
    }
    const chips = document.getElementById('x2-btinh-rate-chips');
    if (chips) {
      const keys = Object.keys(state.x2BaoTinhRates || {})
        .filter(k => Number(state.x2BaoTinhRates[k]) > 0)
        .sort((a, b) => b.localeCompare(a));
      chips.innerHTML = keys.map(k => `<button type="button" class="x2-rate-chip" data-x2-btinh-rate="${escapeHTML(k)}" title="Bấm để nạp định mức tháng này vào ô nhập để sửa lại">T${Number(k.slice(5))} = ${fmtThanh(state.x2BaoTinhRates[k])} thanh/h</button>`).join('');
    }
    initLucide();
  }

  // ─── NẠP / LƯU DỮ LIỆU BÀO TINH ──────────────────────────────
  function loadXuong2BaoTinh() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG2_BAO_TINH);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.xuong2BaoTinhRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.xuong2BaoTinhRecords = []; }
    } else {
      state.xuong2BaoTinhRecords = [];
    }
  }

  function saveXuong2BaoTinh() {
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_BAO_TINH, JSON.stringify(state.xuong2BaoTinhRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    logDataChange(['xuong2BaoTinhRecords']); // ghi lịch sử sửa đổi
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT BÀO TINH ────────────────────
  // Link SỐNG tới lô ở Kho (nguồn) và tới Bảng bố trí Nhân Sự theo ngày.
  function baoTinhDisplay(r) {
    const lot = r.kind === 'tinh' ? baoTinhLotOf(r.batchId) : null;
    const outDims = Array.isArray(r.outDims) ? r.outDims.map(Number) : [0, 0, 0];
    const outSizeKey = r.outSizeKey || dimKeyOf(outDims[0], outDims[1], outDims[2]);
    const unitVol = (r.unitVol != null) ? Number(r.unitVol) : unitVolOf(outDims[0], outDims[1], outDims[2]);
    const qtyOk = Number(r.qtyOk) || 0;
    const qtyErr = Number(r.qtyErr) || 0;
    const qtyIn = qtyOk + qtyErr;
    // Người bào + giờ bào: SỐNG từ Bảng bố trí Nhân Sự theo ngày; mất bố trí → snapshot
    const live = hrBaoTinhAssignmentsOf(r.date || '');
    const workerRows = live.length
      ? live.map(a => ({ name: a.name, time: posTimeStr(a) }))
      : String(r.worker || '').split(',').map(s => s.trim()).filter(Boolean)
          .map((name, i) => ({ name, time: String(r.workTime || '').split(',').map(s => s.trim())[i] || '' }));
    let workHours = 0, workHoursHC = null, workHoursTC = null;
    if (live.length) {
      const sp = sumPosHoursSplit(live, r.date || '');
      workHours = sp.hc + sp.tc;
      workHoursHC = sp.hc; workHoursTC = sp.tc;
    } else if (Number.isFinite(Number(r.workHoursHC)) || Number.isFinite(Number(r.workHoursTC))) {
      workHoursHC = Number(r.workHoursHC) || 0;
      workHoursTC = Number(r.workHoursTC) || 0;
      workHours = workHoursHC + workHoursTC;
      if (!workHours && Number(r.workHours) > 0) workHours = Number(r.workHours);
    } else if (Number(r.workHours) > 0) {
      workHours = Number(r.workHours);
    } else {
      workHours = snapshotCutHours(r.workTime);
    }
    // Công suất thực tế (thanh/h) = tổng số thanh đưa vào ÷ tổng giờ bào
    const cap = workHours > 0 ? qtyIn / workHours : null;
    return {
      date: r.date || '',
      kind: r.kind || 'tinh',
      kindLabel: baoTinhKindLabel(r.kind),
      // Nguồn
      batchCode: lot ? (lot.code || '') : (r.batchCode || ''),
      batchLocation: lot ? (lot.location || '') : (r.batchLocation || ''),
      batchDims: lot
        ? [Number(lot.length) || 0, Number(lot.width) || 0, Number(lot.thickness) || 0]
        : (Array.isArray(r.batchDims) ? r.batchDims.map(Number) : []),
      batchQty: lot ? (Number(lot.quantity) || 0) : (Number(r.batchQty) || 0),
      batchRemaining: lot ? baoTinhLotRemainingOf(lot) : null,
      inDims: Array.isArray(r.inDims) && r.inDims.length === 3 ? r.inDims.map(Number) : [],
      inQty: Number(r.inQty) || 0,
      defectKey: r.defectKey || '',
      defectDims: Array.isArray(r.defectDims) && r.defectDims.length === 3 ? r.defectDims.map(Number) : [],
      outDims, outSizeKey, unitVol,
      qtyOk, qtyErr, qtyIn,
      volumeOk: Math.round(qtyOk * unitVol * 10000) / 10000,
      cap,
      workerRows,
      workHours, workHoursHC, workHoursTC
    };
  }
  // Chuỗi mô tả NGUỒN của 1 lượt (dùng ở thẻ ngày + hộp xác nhận xóa)
  function baoTinhSourceText(r, d) {
    if (!d) d = baoTinhDisplay(r);
    if (d.kind === 'tinh') {
      const srcs = Array.isArray(r.sources) && r.sources.length ? r.sources : null;
      const dims = d.batchDims.length === 3 ? d.batchDims.map(Number).join(' × ') : '';
      if (srcs && srcs.length > 1) {
        const locs = [...new Set(srcs.map(s => String(s.location || '—')))].join(', ');
        return `${srcs.length} lô ở Kho · ${locs}`;
      }
      return `Lô ở Kho ${d.batchCode || '—'} · ${d.batchLocation || '—'}${dims ? ` · ${dims} mm` : ''}`;
    }
    if (d.kind === 'ha_cap') {
      const dims = d.defectDims.length === 3 ? d.defectDims.map(Number).join(' × ') : (d.defectKey || '—');
      return `Thanh lỗi của Bào Tinh · cỡ ${dims}`;
    }
    const dims = d.inDims.length === 3 ? d.inDims.map(Number).join(' × ') : '';
    return `Tự nhập${dims ? ` · ${dims} mm` : ''}${d.inQty ? ` · ${fmtThanh(d.inQty)} thanh` : ''}`;
  }

  // ─── FORM GHI NHẬN LƯỢT BÀO TINH ─────────────────────────────
  // "Chọn thanh" đổi theo Loại bào: lô ở Kho · cỡ thanh lỗi · tự nhập.
  function baoTinhRecOf(id) {
    return (state.xuong2BaoTinhRecords || []).find(r => r && r.id === id) || null;
  }
  function baoTinhKindOf() {
    return String((document.getElementById('x2-btinh-kind') || {}).value || 'tinh');
  }
  // KÍCH THƯỚC SAU BÀO + SL thanh ĐẠT nhập THEO TỪNG DÒNG (key = sizeKey hoặc id hàng nhập tay)
  const btinhOutDraft = new Map();       // key → { d, r, t }
  // 'Bào thanh': các HÀNG nhập tay (kích thước TRƯỚC bào + số lượng) — thêm/xóa được
  let btinhManualRows = [];
  let btinhRowSeq = 0;
  function baoTinhManualRows() { return btinhManualRows; }
  function baoTinhOutDrafts() { return btinhOutDraft; }
  function baoTinhNewRowId() { btinhRowSeq += 1; return `btrow-${btinhRowSeq}`; }
  function baoTinhAddManualRow(row) {
    const r = Object.assign({ id: baoTinhNewRowId(), dai: '', rong: '', day: '', qty: '' }, row || {});
    btinhManualRows.push(r);
    return r.id;
  }
  function baoTinhRemoveManualRow(id) {
    const key = String(id || '');
    btinhManualRows = btinhManualRows.filter(r => r.id !== key);
    btinhOkDraft.delete(key);
    btinhOutDraft.delete(key);
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
  }
  function baoTinhManualRowOf(key) {
    return btinhManualRows.find(r => r.id === String(key)) || null;
  }
  // KÍCH THƯỚC SAU BÀO của 1 dòng (theo key) → [d, r, t]
  function baoTinhOutDimsOf(key) {
    const o = btinhOutDraft.get(String(key)) || {};
    return [Number(o.d) || 0, Number(o.r) || 0, Number(o.t) || 0];
  }
  // ─── CHỌN THANH: nút mở DANH SÁCH THẺ — bấm 1 thẻ = CHỌN, bấm lần nữa = BỎ CHỌN ──
  // (không dùng ô vuông tích; thẻ hiện 2 dòng: kích thước · loại nan · số lượng / vị trí)
  let btinhPicked = [];                 // id các thẻ đang chọn (lô ở Kho / cỡ thanh lỗi)
  const btinhOkDraft = new Map();       // sizeKey → SL thanh ĐẠT đã nhập (giữ khi vẽ lại)
  function baoTinhPickedIds() { return btinhPicked.slice(); }
  function baoTinhOkDrafts() { return btinhOkDraft; }
  // Danh sách thẻ nguồn theo Loại bào (kèm số thanh còn lại + phần của lượt đang sửa)
  function baoTinhCandidates() {
    const kind = baoTinhKindOf();
    const editing = state.x2BaoTinhEditId ? baoTinhRecOf(state.x2BaoTinhEditId) : null;
    if (kind === 'tinh') {
      return baoTinhLotList().map(b => {
        let selfQty = 0;
        if (editing && editing.kind === 'tinh') {
          if (Array.isArray(editing.sources) && editing.sources.length) {
            selfQty = editing.sources
              .filter(x => String(x.batchId) === String(b.id))
              .reduce((s, x) => s + (Number(x.qty) || 0), 0);
          } else if (String(editing.batchId) === String(b.id)) {
            selfQty = baoTinhQtyInOf(editing);
          }
        }
        return {
          id: b.id, dims: [Number(b.length) || 0, Number(b.width) || 0, Number(b.thickness) || 0],
          cls: b.bambooType || '—', qty: baoTinhLotRemainingOf(b) + selfQty,
          location: b.location || '—', code: b.code || ''
        };
      }).filter(c => c.qty > 0 || btinhPicked.includes(String(c.id)));
    }
    if (kind === 'ha_cap') {
      return baoTinhDefectStock().map(x => {
        const selfUse = (editing && editing.kind === 'ha_cap' && String(editing.defectKey) === String(x.sizeKey))
          ? baoTinhQtyInOf(editing) : 0;
        return {
          id: x.sizeKey, dims: x.dims, cls: 'Thanh lỗi', qty: x.remaining + selfUse,
          location: 'Bào Tinh (chờ hạ cấp)', code: ''
        };
      }).filter(c => c.qty > 0 || btinhPicked.includes(String(c.id)));
    }
    return [];
  }
  // GỘP theo KÍCH THƯỚC CHUNG (KHÔNG chia phân loại) — kèm kích thước SAU BÀO của TỪNG dòng
  // [{ key, manual, dims, sizeKey, inQty, sources }]  (outDims đọc qua baoTinhOutDimsOf(key))
  function baoTinhGroups() {
    const kind = baoTinhKindOf();
    if (kind === 'bao_thanh') {
      // 'Bào thanh': mỗi HÀNG nhập tay = 1 dòng (kích thước trước bào + số lượng tự nhập)
      return btinhManualRows.map(row => {
        const dims = [Number(row.dai) || 0, Number(row.rong) || 0, Number(row.day) || 0];
        const valid = dims[0] > 0 && dims[1] > 0 && dims[2] > 0;
        return {
          key: row.id, manual: true, dims,
          sizeKey: valid ? dimKeyOf(dims[0], dims[1], dims[2]) : '',
          inQty: Number(row.qty) || 0,
          sources: []
        };
      });
    }
    const map = new Map();
    baoTinhCandidates().filter(c => btinhPicked.includes(String(c.id))).forEach(c => {
      const key = dimKeyOf(c.dims[0], c.dims[1], c.dims[2]);
      const cur = map.get(key) || { key, manual: false, dims: c.dims, sizeKey: key, inQty: 0, sources: [] };
      cur.inQty += Number(c.qty) || 0;
      cur.sources.push(c);
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.inQty - a.inQty);
  }
  // Dòng có ĐỦ dữ liệu để lưu: thanh vào > 0 · kích thước sau bào > 0 · SL đạt > 0
  function baoTinhGroupReady(g) {
    const out = baoTinhOutDimsOf(g.key);
    const ok = Math.max(0, Math.round(Number(btinhOkDraft.get(g.key)) || 0));
    return g.inQty > 0 && !!g.sizeKey && out[0] > 0 && out[1] > 0 && out[2] > 0 && ok > 0;
  }
  // Vẽ danh sách THẺ (2 dòng, KHÔNG có ô vuông tích — bấm cả thẻ để chọn/bỏ chọn)
  function renderX2BaoTinhList() {
    const listEl  = document.getElementById('x2-btinh-list');
    const countEl = document.getElementById('x2-btinh-picked-count');
    const textEl  = document.getElementById('x2-btinh-picker-text');
    const kind = baoTinhKindOf();
    if (textEl) textEl.textContent = kind === 'ha_cap' ? 'Chọn thanh lỗi' : 'Chọn thanh nan';
    if (countEl) {
      countEl.textContent = btinhPicked.length ? `${btinhPicked.length} đã chọn` : 'Chưa chọn';
      countEl.classList.toggle('has-pick', btinhPicked.length > 0);
    }
    if (!listEl) return;
    const items = baoTinhCandidates();
    if (!items.length) {
      listEl.innerHTML = `<div class="al-empty">${kind === 'ha_cap'
        ? '— Chưa có thanh lỗi nào chờ hạ cấp (ghi lượt Bào tinh có SL thanh lỗi trước) —'
        : '— Kho chưa có thanh nào (chuyển lô vào Kho ở thẻ Than Hóa + Sấy trước) —'}</div>`;
      return;
    }
    listEl.innerHTML = items.map(it => {
      const on = btinhPicked.includes(String(it.id));
      const size = `${it.dims[0]} × ${it.dims[1]} × ${it.dims[2]}`;
      return `<button type="button" class="al-card x2-btinh-card${on ? ' picked' : ''}" data-btinh-pick="${escapeHTML(String(it.id))}" aria-pressed="${on ? 'true' : 'false'}">
        <span class="al-card-body">
          <span class="al-card-main"><strong>${escapeHTML(size)}</strong> · ${escapeHTML(it.cls || '—')} · ${fmtThanh(it.qty)} thanh</span>
          <span class="al-card-sub">${escapeHTML(it.location || '—')}${it.code ? ` · ${escapeHTML(it.code)}` : ''}</span>
        </span>
      </button>`;
    }).join('');
    initLucide();
  }
  // Bấm 1 thẻ → CHỌN; bấm lần nữa → BỎ CHỌN (rồi vẽ lại bảng tổng hợp + ô tổng kết)
  function toggleBaoTinhPick(id) {
    const key = String(id || '');
    if (!key) return btinhPicked.slice();
    btinhPicked = btinhPicked.includes(key) ? btinhPicked.filter(x => x !== key) : [...btinhPicked, key];
    renderX2BaoTinhList();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
    return btinhPicked.slice();
  }
  function baoTinhPickAll() {
    btinhPicked = baoTinhCandidates().map(c => String(c.id));
    renderX2BaoTinhList();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
    return btinhPicked.slice();
  }
  function baoTinhClearPicks() {
    btinhPicked = [];
    btinhOkDraft.clear();
    renderX2BaoTinhList();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
    return [];
  }
  function onBaoTinhListClick(e) {
    const btn = (e && e.target && typeof e.target.closest === 'function') ? e.target.closest('[data-btinh-pick]') : null;
    if (!btn) return;
    toggleBaoTinhPick(btn.getAttribute('data-btinh-pick'));
  }
  // Ẩn/hiện danh sách thẻ (nút "Chọn thanh")
  function x2BaoTinhTogglePicker() {
    const panel = document.getElementById('x2-btinh-picker');
    const btn   = document.getElementById('x2-btinh-picker-btn');
    if (!panel) return false;
    panel.hidden = !panel.hidden;
    if (btn) btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    if (!panel.hidden) {
      renderX2BaoTinhList();
      if (btn && typeof btn.scrollIntoView === 'function') {
        try { btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (err) { /* bỏ qua */ }
      }
    }
    return !panel.hidden;
  }
  // Nhập liệu trong BẢNG TỔNG HỢP (uỷ nhiệm 'input'): SL thanh ĐẠT · KÍCH THƯỚC SAU BÀO ·
  // (Bào thanh) kích thước TRƯỚC bào + số lượng → cập nhật nháp + dòng TỔNG + ô tổng kết
  function onBaoTinhGroupInput(e) {
    const t = e && e.target;
    if (!t || typeof t.getAttribute !== 'function') return;
    const raw = t.value;
    const v = Number(raw);
    const bad = (raw === '' || raw == null || !Number.isFinite(v));
    const okKey = t.getAttribute('data-btinh-ok');
    if (okKey) {
      if (bad) btinhOkDraft.delete(okKey); else btinhOkDraft.set(okKey, Math.max(0, v));
      renderX2BaoTinhNumbers();
      renderX2BaoTinhCalc();
      return;
    }
    const outKey = t.getAttribute('data-btinh-out');
    if (outKey) {
      const cur = btinhOutDraft.get(outKey) || {};
      cur[t.getAttribute('data-out-part') || 'd'] = bad ? '' : v;
      btinhOutDraft.set(outKey, cur);
      renderX2BaoTinhCalc();
      return;
    }
    const inKey = t.getAttribute('data-btinh-in-dim');
    if (inKey) {
      const row = baoTinhManualRowOf(inKey);
      if (row) row[t.getAttribute('data-in-part') || 'dai'] = bad ? '' : v;
      renderX2BaoTinhNumbers();
      renderX2BaoTinhCalc();
      return;
    }
    const qKey = t.getAttribute('data-btinh-in-qty');
    if (qKey) {
      const row = baoTinhManualRowOf(qKey);
      if (row) row.qty = bad ? '' : v;
      renderX2BaoTinhNumbers();
      renderX2BaoTinhCalc();
    }
  }
  // Bấm nút xóa HÀNG nhập tay (uỷ nhiệm 'click' trong bảng tổng hợp)
  function onBaoTinhGroupClick(e) {
    const btn = (e && e.target && typeof e.target.closest === 'function') ? e.target.closest('[data-btinh-row-del]') : null;
    if (!btn) return;
    baoTinhRemoveManualRow(btn.getAttribute('data-btinh-row-del'));
  }
  // Nút "Thêm hàng thông tin khác" (chỉ 'Bào thanh')
  function baoTinhAddRow() {
    baoTinhAddManualRow();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
  }
  // Hiện/ẩn ô nhập tay (chỉ "Bào thanh") theo Loại bào + reset lựa chọn khi ĐỔI loại bào
  function syncX2BaoTinhKindRows(keepPicks) {
    const kind = baoTinhKindOf();
    const set = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
    set('x2-btinh-picker-row', kind !== 'bao_thanh');
    set('x2-btinh-add-row', kind === 'bao_thanh');
    // Ghi chú loại bào hiện khi DÊ CHUỘT (không in ra màn hình cho gọn ô)
    const sel = document.getElementById('x2-btinh-kind');
    if (sel) sel.title = kind === 'ha_cap'
      ? 'Bào tinh hạ cấp — lấy thanh lỗi của công đoạn Bào Tinh (gom theo cỡ)'
      : kind === 'bao_thanh'
        ? 'Bào thanh — tự nhập kích thước trước/sau bào + số lượng (thêm được nhiều hàng)'
        : 'Bào tinh — lấy thanh từ Kho (đã qua Sấy 2)';
    if (!keepPicks) { btinhPicked = []; btinhOkDraft.clear(); btinhOutDraft.clear(); }
    if (kind === 'bao_thanh' && !btinhManualRows.length) baoTinhAddManualRow();
    if (kind !== 'bao_thanh') btinhManualRows = [];
    return kind;
  }
  // Đổi Loại bào → vẽ lại thẻ + bảng tổng hợp + ô tổng kết
  function updateXuong2BaoTinhLinked() {
    syncX2BaoTinhKindRows();
    renderX2BaoTinhList();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
  }

  // BẢNG TỔNG HỢP: Kích thước vào · Số lượng vào · KÍCH THƯỚC SAU BÀO (mỗi dòng) · SL thanh ĐẠT
  // KHÔNG hiện SL thanh lỗi ở form (lỗi = vào − đạt, chỉ hiện ở bảng lịch sử)
  function renderX2BaoTinhGroups() {
    const box = document.getElementById('x2-btinh-groups');
    const actions = document.getElementById('x2-btinh-actions');
    if (!box) return;
    const kind = baoTinhKindOf();
    const groups = baoTinhGroups();
    const show = groups.length > 0;
    box.style.display = show ? '' : 'none';
    if (actions) actions.style.display = show ? '' : 'none';
    const addBtn = document.getElementById('x2-btinh-add-row');
    if (addBtn) addBtn.style.display = (kind === 'bao_thanh') ? '' : 'none';
    if (!show) { box.innerHTML = ''; return; }
    const dimCellIn = (g, part, ph) => {
      const row = baoTinhManualRowOf(g.key) || {};
      const v = (row[part] == null || row[part] === '') ? '' : String(row[part]);
      return `<input type="number" class="x2-btinh-dim" data-btinh-in-dim="${escapeHTML(g.key)}" data-in-part="${part}" min="0" step="any" placeholder="${ph}" value="${escapeHTML(v)}">`;
    };
    const dimCellOut = (g, part, ph) => {
      const o = btinhOutDraft.get(g.key) || {};
      const v = (o[part] == null || o[part] === '') ? '' : String(o[part]);
      return `<input type="number" class="x2-btinh-dim" data-btinh-out="${escapeHTML(g.key)}" data-out-part="${part}" min="0" step="any" placeholder="${ph}" value="${escapeHTML(v)}">`;
    };
    const rows = groups.map(g => {
      const ok = btinhOkDraft.get(g.key);
      const okTxt = (ok == null) ? '' : String(ok);
      const inCell = g.manual
        ? `<span class="x2-btinh-dims">${dimCellIn(g, 'dai', 'Dài')}<span class="x2-dim-x">×</span>${dimCellIn(g, 'rong', 'Rộng')}<span class="x2-dim-x">×</span>${dimCellIn(g, 'day', 'Dày')}</span>`
        : `<span class="x2-nan-chip">${comboLabel({ d: g.dims[0], r: g.dims[1], t: g.dims[2] })}</span>${g.sources.length > 1 ? ` <small class="x2-btinh-src">${g.sources.length} thẻ</small>` : ''}`;
      const qtyCell = g.manual
        ? `<input type="number" class="x2-btinh-qty" data-btinh-in-qty="${escapeHTML(g.key)}" min="0" step="1" placeholder="0" value="${g.inQty ? escapeHTML(String(g.inQty)) : ''}">`
        : `<strong>${fmtThanh(g.inQty)}</strong>`;
      const delCell = g.manual
        ? `<button type="button" class="btn btn-icon btn-danger btn-sm" data-btinh-row-del="${escapeHTML(g.key)}" title="Xóa hàng này"><i data-lucide="trash-2"></i></button>`
        : '';
      return `<tr data-btinh-row="${escapeHTML(g.key)}">
        <td class="x2-btinh-in-cell">${inCell}</td>
        <td class="text-right x2-btinh-qty-cell">${qtyCell}</td>
        <td class="x2-btinh-out-cell"><span class="x2-btinh-dims">${dimCellOut(g, 'd', 'Dài')}<span class="x2-dim-x">×</span>${dimCellOut(g, 'r', 'Rộng')}<span class="x2-dim-x">×</span>${dimCellOut(g, 't', 'Dày')}</span></td>
        <td class="x2-btinh-ok-cell"><input type="number" class="x2-btinh-ok" data-btinh-ok="${escapeHTML(g.key)}" min="0" step="1" placeholder="0" value="${escapeHTML(okTxt)}"></td>
        <td class="text-right">${delCell}</td>
      </tr>`;
    }).join('');
    const tIn = groups.reduce((s, g) => s + g.inQty, 0);
    const tOk = groups.reduce((s, g) => s + Math.min(Math.max(0, Math.round(Number(btinhOkDraft.get(g.key)) || 0)), g.inQty), 0);
    box.innerHTML = `
      <div class="x2-btinh-groups-head">
        <i data-lucide="calculator"></i> Tổng hợp theo <strong>kích thước chung</strong> (không chia phân loại) — mỗi dòng điền <strong>kích thước sau bào</strong> + <strong>SL thanh đạt</strong>
      </div>
      <div class="x2-btinh-group-scroll">
        <table class="data-table x2-btinh-group-table">
          <thead><tr>
            <th title="Kích thước thanh TRƯỚC khi bào (kích thước chung của các thẻ đã chọn)">K.thước vào</th>
            <th class="text-right" title="Tổng số thanh lấy từ các thẻ của kích thước này">SL vào</th>
            <th title="Kích thước SAU khi bào (Dài × Rộng × Dày, mm)">K.thước sau bào</th>
            <th title="Số thanh ĐẠT của dòng này — SL thanh LỖI tự tính = thanh vào − thanh đạt (hiện ở bảng lịch sử)">SL đạt</th>
            <th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td><strong>Tổng</strong></td>
            <td class="text-right"><strong>${fmtThanh(tIn)}</strong></td>
            <td></td>
            <td><strong>${fmtThanh(tOk)}</strong></td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>`;
    initLucide();
  }
  // Cập nhật lại dòng TỔNG khi gõ (KHÔNG vẽ lại ô nhập → không mất con trỏ)
  function renderX2BaoTinhNumbers() {
    const groups = baoTinhGroups();
    const box = document.getElementById('x2-btinh-groups');
    const foot = (box && typeof box.querySelector === 'function') ? box.querySelector('tfoot') : null;
    const tds = (foot && typeof foot.querySelectorAll === 'function') ? foot.querySelectorAll('td') : null;
    if (!tds || tds.length < 4) return;
    const tIn = groups.reduce((s, g) => s + g.inQty, 0);
    const tOk = groups.reduce((s, g) => s + Math.min(Math.max(0, Math.round(Number(btinhOkDraft.get(g.key)) || 0)), g.inQty), 0);
    tds[1].innerHTML = `<strong>${fmtThanh(tIn)}</strong>`;
    tds[3].innerHTML = `<strong>${fmtThanh(tOk)}</strong>`;
  }

  // Ô TỔNG KẾT (tự tính): tổng thanh vào · tổng đạt · tỷ lệ đạt · thể tích đạt (tính theo TỪNG dòng
  // với kích thước SAU BÀO riêng) · nguồn.
  // LƯU Ý: SL thanh LỖI (= vào − đạt) KHÔNG hiện ở form nhập, chỉ hiện ở bảng lịch sử.
  function renderX2BaoTinhCalc() {
    const box = document.getElementById('x2-btinh-calc');
    if (!box) return;
    const kind = baoTinhKindOf();
    const groups = baoTinhGroups();
    const tIn = groups.reduce((s, g) => s + g.inQty, 0);
    const tOk = groups.reduce((s, g) => s + Math.min(Math.max(0, Math.round(Number(btinhOkDraft.get(g.key)) || 0)), g.inQty), 0);
    const okPct = tIn > 0 ? (tOk / tIn) * 100 : null;
    // Thể tích đạt: cộng theo TỪNG dòng (mỗi dòng 1 kích thước sau bào riêng)
    let volOk = 0;
    let volAny = false;
    groups.forEach(g => {
      const o = baoTinhOutDimsOf(g.key);
      if (!(o[0] > 0 && o[1] > 0 && o[2] > 0)) return;
      volAny = true;
      const q = Math.min(Math.max(0, Math.round(Number(btinhOkDraft.get(g.key)) || 0)), g.inQty);
      volOk += q * unitVolOf(o[0], o[1], o[2]);
    });
    const kindTxt = kind === 'bao_thanh'
      ? '<strong style="color:#b45309;">bào thanh (tự nhập)</strong>'
      : kind === 'ha_cap'
        ? '<strong style="color:#b45309;">thanh lỗi (hạ cấp)</strong>'
        : '<strong style="color:#0f766e;">lô ở Kho (qua Sấy 2)</strong>';
    box.innerHTML = `
      <span class="x2-ong-calc-item x2-ong-calc-in" title="Tổng số thanh của các thẻ đã chọn (cộng cả các hàng tự nhập)"><span class="x2-ong-calc-label">Tổng vào:</span><strong>${fmtThanh(tIn)} thanh</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-bo" title="Tổng SL thanh ĐẠT đã nhập trong bảng tổng hợp"><span class="x2-ong-calc-label">Đạt:</span><strong>${fmtThanh(tOk)} thanh</strong></span>
      <span class="x2-ong-calc-item" title="Tỷ lệ đạt = tổng thanh đạt ÷ tổng thanh vào (SL thanh lỗi tự tính chỉ hiện ở bảng lịch sử)"><span class="x2-ong-calc-label">Tỷ lệ đạt:</span><strong>${okPct == null ? '—' : `${fmtRatio(okPct)}%`}</strong></span>
      <span class="x2-ong-calc-item" title="Thể tích thanh ĐẠT: cộng theo TỪNG dòng, mỗi dòng dùng kích thước SAU BÀO của nó"><span class="x2-ong-calc-label">Thể tích đạt:</span><strong>${volAny ? `${(Math.round(volOk * 10000) / 10000).toFixed(4)} m³` : '—'}</strong></span>
      <span class="x2-ong-calc-item" title="Nguồn thanh của lượt bào này"><span class="x2-ong-calc-label">Nguồn:</span>${kindTxt}</span>`;
  }

  function resetXuong2BaoTinhForm() {
    state.x2BaoTinhEditId = null;
    btinhPicked = [];
    btinhOkDraft.clear();
    btinhOutDraft.clear();
    btinhManualRows = [];
    const d = document.getElementById('x2-btinh-date');
    if (d) d.value = '';
    const k = document.getElementById('x2-btinh-kind');
    if (k) k.value = 'tinh';
    const panel = document.getElementById('x2-btinh-picker');
    if (panel) panel.hidden = true;
    syncX2BaoTinhKindRows(true);
    renderX2BaoTinhList();
    renderX2BaoTinhGroups();
    syncX2BaoTinhEditBanner();
    renderX2BaoTinhCalc();
  }

  // ─── LƯU FORM BÀO TINH (THÊM / SỬA) ──────────────────────────
  function handleXuong2BaoTinhSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const kind = baoTinhKindOf();
    if (!BAO_TINH_KINDS.some(k => k.id === kind)) { showToast('Hãy chọn Loại bào!', 'error'); return; }

    const dateVal = (document.getElementById('x2-btinh-date') || {}).value || '';
    if (!dateVal) { showToast('Ngày bào không được để trống!', 'error'); return; }

    // ── NGUỒN THANH: các THẺ đã chọn → gộp theo KÍCH THƯỚC CHUNG (không chia phân loại) ──
    // 'Bào thanh' → nguồn là các HÀNG tự nhập (kích thước trước bào + số lượng) ở bảng tổng hợp
    let defectKey = '', defectDims = [], inDims = [];
    if (kind === 'tinh' || kind === 'ha_cap') {
      const picked = btinhPicked.slice();
      if (!picked.length) {
        showToast(kind === 'ha_cap'
          ? 'Bấm "Chọn thanh lỗi" rồi chọn (các) cỡ thanh lỗi cần hạ cấp!'
          : 'Bấm "Chọn thanh nan" rồi chọn (các) thẻ thanh cần bào!', 'error');
        return;
      }
      const all = baoTinhCandidates().filter(c => picked.includes(String(c.id)));
      if (!all.length) { showToast('Không tìm thấy thẻ thanh đã chọn — chọn lại giúp!', 'error'); return; }
    } else if (!btinhManualRows.length) {
      showToast('Bấm "Thêm hàng thông tin khác" để nhập kích thước + số lượng thanh!', 'error');
      return;
    }

    // BẢNG TỔNG HỢP: mỗi dòng (kích thước chung HOẶC hàng tự nhập) → KÍCH THƯỚC SAU BÀO + SL thanh ĐẠT
    // SL thanh LỖI = vào − đạt (tự tính, chỉ hiện ở bảng lịch sử)
    const groups = baoTinhGroups();
    if (!groups.length) { showToast('Chưa có số liệu để lưu — kiểm tra kích thước/số lượng thanh!', 'error'); return; }
    const plans = [];
    let skipped = 0;
    for (const g of groups) {
      const okRaw = Math.round(Math.max(0, Number(btinhOkDraft.get(g.key)) || 0));
      const out = baoTinhOutDimsOf(g.key);
      if (okRaw <= 0 && !(out[0] > 0 || out[1] > 0 || out[2] > 0)) { skipped++; continue; }
      if (!g.sizeKey || g.inQty <= 0) {
        showToast('Có dòng chưa nhập đủ KÍCH THƯỚC TRƯỚC BÀO hoặc SỐ LƯỢNG — kiểm tra bảng tổng hợp!', 'error');
        return;
      }
      if (okRaw <= 0) {
        showToast(`Kích thước ${g.sizeKey}: chưa nhập SL thanh ĐẠT — nhập rồi bấm Lưu (hoặc bấm thùng rác để xóa hàng đó)!`, 'error');
        return;
      }
      if (okRaw > g.inQty) {
        showToast(`Kích thước ${g.sizeKey}: SL thanh đạt (${fmtThanh(okRaw)}) vượt thanh vào (${fmtThanh(g.inQty)}) — kiểm tra lại!`, 'error');
        return;
      }
      if (!(out[0] > 0 && out[1] > 0 && out[2] > 0)) {
        showToast(`Kích thước ${g.sizeKey}: nhập đủ KÍCH THƯỚC SAU BÀO (Dài × Rộng × Dày) cho dòng này!`, 'error');
        return;
      }
      plans.push({ g, outDims: out, qtyOk: okRaw, qtyErr: Math.max(0, g.inQty - okRaw) });
    }
    if (!plans.length) {
      showToast('Chưa nhập số liệu cho dòng nào — nhập KÍCH THƯỚC SAU BÀO + SL thanh ĐẠT rồi bấm Lưu!', 'error');
      return;
    }
    if (state.x2BaoTinhEditId && plans.length > 1) {
      showToast('Đang SỬA 1 lượt — chỉ nhập số liệu cho đúng dòng của lượt đó!', 'error');
      return;
    }

    // ── KÍCH THƯỚC SAU BÀO: nhập THEO TỪNG DÒNG trong bảng tổng hợp (mỗi dòng 1 cỡ riêng) ──
    if (state.x2BaoTinhEditId && plans.length > 1) {
      showToast('Đang SỬA 1 lượt — chỉ nhập số liệu cho đúng dòng của lượt đó!', 'error');
      return;
    }

    // NGƯỜI BÀO + THỜI GIAN: TỰ ĐỘNG từ Bảng bố trí Nhân Sự (vị trí Bào tinh / Bào thanh)
    const snap = hrBaoTinhSnapshot(dateVal);
    const recOfGroup = (plan) => {
      const g = plan.g;
      const outDims = plan.outDims;                                  // KÍCH THƯỚC SAU BÀO của RIÊNG dòng này
      const unitVol = unitVolOf(outDims[0], outDims[1], outDims[2]);
      const outSizeKey = dimKeyOf(outDims[0], outDims[1], outDims[2]);
      // Nguồn của dòng: thẻ lô ở Kho → danh sách lô (sources); thẻ lỗi → defectKey; bào thanh → cỡ tự nhập
      const lots = (g.sources || []).filter(s => kind === 'tinh');
      const first = lots[0] || null;
      const defect = kind === 'ha_cap' ? baoTinhDefectStockOf(g.sizeKey) : null;
      const row = (kind === 'bao_thanh') ? baoTinhManualRowOf(g.key) : null;
      return {
        date: dateVal,
        week: materialWeekLabel(dateVal),
        kind,
        // Nguồn (kèm snapshot phòng khi lô/cỡ bị xóa)
        sources: lots.map(s => ({
          batchId: s.id, code: s.code || '', location: s.location || '', dims: s.dims, qty: Number(s.qty) || 0
        })),
        batchId: first ? first.id : '',
        batchCode: first ? (first.code || '') : '',
        batchLocation: first ? (first.location || '') : '',
        batchDims: first ? first.dims : [],
        batchQty: first ? (Number(first.qty) || 0) : 0,
        defectKey: kind === 'ha_cap' ? g.sizeKey : '',
        defectDims: defect ? defect.dims : (kind === 'ha_cap' ? g.dims : []),
        inDims: kind === 'bao_thanh' ? (g.dims || []) : [],
        manualRowId: row ? row.id : '',
        inQty: g.inQty,                 // số thanh đưa vào của dòng
        inSizeKey: g.sizeKey,           // kích thước chung (đầu vào) của dòng
        // Kết quả
        outDims,
        outSizeKey,
        unitVol,
        qtyOk: plan.qtyOk,
        qtyErr: plan.qtyErr,            // TỰ TÍNH = thanh vào − thanh đạt
        volumeOk: Math.round(plan.qtyOk * unitVol * 10000) / 10000,
        worker: snap.worker, workTime: snap.workTime,
        workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC
      };
    };

    if (state.x2BaoTinhEditId) {
      const rec = baoTinhRecOf(state.x2BaoTinhEditId);
      if (!rec) { showToast('Không tìm thấy lượt bào tinh cần sửa!', 'error'); return; }
      Object.assign(rec, recOfGroup(plans[0]), { updatedAt: new Date().toISOString() });
      saveXuong2BaoTinh();
      showToast('Đã cập nhật lượt bào tinh!', 'success');
    } else {
      state.xuong2BaoTinhRecords = state.xuong2BaoTinhRecords || [];
      plans.forEach((plan, i) => {
        state.xuong2BaoTinhRecords.push({
          id: 'x2btinh-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 7),
          ...recOfGroup(plan),
          createdAt: new Date().toISOString()
        });
      });
      saveXuong2BaoTinh();
      showToast(`Đã ghi ${plans.length} lượt bào tinh (${plans.reduce((s, p) => s + p.qtyOk, 0).toLocaleString('vi-VN')} thanh đạt)` +
        (skipped ? ` · bỏ qua ${skipped} kích thước chưa nhập SL đạt` : '') + '!', 'success');
    }
    resetXuong2BaoTinhForm();
    renderX2BaoTinhCard();
  }

  // ─── SỬA / XÓA LƯỢT BÀO TINH (bảng lịch sử) ──────────────────
  function editXuong2BaoTinh(id) {
    if (!requireEditPermission()) return;
    const rec = baoTinhRecOf(id);
    if (!rec) return;
    state.x2BaoTinhEditId = id;
    btinhPicked = [];
    btinhOkDraft.clear();
    btinhOutDraft.clear();
    btinhManualRows = [];          // Bào thanh: lấy lại đúng HÀNG đã ghi
    const k = document.getElementById('x2-btinh-kind');
    if (k) k.value = rec.kind || 'tinh';
    const d = document.getElementById('x2-btinh-date');
    if (d) d.value = rec.date || '';
    // Nguồn: chọn lại ĐÚNG thẻ của lượt này (lô ở Kho / cỡ thanh lỗi)
    if (rec.kind === 'tinh') {
      const srcs = Array.isArray(rec.sources) && rec.sources.length ? rec.sources : (rec.batchId ? [{ batchId: rec.batchId }] : []);
      btinhPicked = srcs.map(s => String(s.batchId)).filter(Boolean);
    } else if (rec.kind === 'ha_cap') {
      btinhPicked = rec.defectKey ? [String(rec.defectKey)] : [];
    }
    // KHÓA của dòng: Bào thanh = id hàng nhập tay · còn lại = kích thước chung (đầu vào)
    let rowKey = '';
    if (rec.kind === 'bao_thanh') {
      const inD = Array.isArray(rec.inDims) ? rec.inDims : [];
      const newId = baoTinhAddManualRow({ dai: inD[0], rong: inD[1], day: inD[2], qty: rec.inQty });
      const row = baoTinhManualRowOf(newId);
      if (row && rec.manualRowId) row.id = String(rec.manualRowId);   // giữ id hàng cũ nếu có
      rowKey = row ? row.id : newId;
    } else {
      rowKey = String(rec.inSizeKey
        || dimKeyOf.apply(null, (Array.isArray(rec.inDims) && rec.inDims.length === 3 ? rec.inDims : (Array.isArray(rec.batchDims) && rec.batchDims.length === 3 ? rec.batchDims : rec.defectDims || []))) || '');
    }
    // SL thanh ĐẠT của dòng + KÍCH THƯỚC SAU BÀO của dòng (nhập theo dòng)
    if (rowKey) {
      btinhOkDraft.set(rowKey, Math.round(Number(rec.qtyOk) || 0));
      const outDims = Array.isArray(rec.outDims) ? rec.outDims : [];
      btinhOutDraft.set(rowKey, { d: outDims[0] || '', r: outDims[1] || '', t: outDims[2] || '' });
    }
    syncX2BaoTinhKindRows(true);
    renderX2BaoTinhList();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
    syncX2BaoTinhEditBanner();
  }

  function deleteXuong2BaoTinh(id) {
    if (!requireEditPermission()) return;
    const rec = baoTinhRecOf(id);
    if (!rec) return;
    const d = baoTinhDisplay(rec);
    if (!confirm(`Xóa lượt bào tinh ngày ${formatDateDDMMYY(rec.date)} (${d.kindLabel} · ${baoTinhSourceText(rec, d)} · đạt ${fmtThanh(d.qtyOk)} + lỗi ${fmtThanh(d.qtyErr)} thanh)?`)) return;
    trackDeleted('xuong2BaoTinhRecords', id); // tombstone: không bị mây/máy khác hồi sinh
    state.xuong2BaoTinhRecords = (state.xuong2BaoTinhRecords || []).filter(r => r.id !== id);
    if (state.x2BaoTinhEditId === id) resetXuong2BaoTinhForm();
    saveXuong2BaoTinh();
    renderX2BaoTinhCard();
    showToast('Đã xóa lượt bào tinh!', 'success');
  }

  function syncX2BaoTinhEditBanner() {
    const banner = document.getElementById('x2-btinh-edit-banner');
    if (!banner) return;
    const txt = document.getElementById('x2-btinh-edit-text');
    if (state.x2BaoTinhEditId) {
      const rec = baoTinhRecOf(state.x2BaoTinhEditId);
      if (txt) {
        txt.textContent = rec
          ? `Đang sửa lượt bào tinh ngày ${formatDateDDMMYY(rec.date)} — bấm "Lưu Lượt Bào Tinh" hoặc "Làm Mới Form" để thoát.`
          : 'Đang sửa lượt bào tinh.';
      }
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  // Thu gọn / mở rộng BẢNG LỊCH SỬ bào tinh (form vẫn hiện để tiếp tục nhập)
  function toggleX2BaoTinhTable() {
    const wrap = document.getElementById('x2-btinh-table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('x2-cut-collapsed');
    initLucide();
  }

  // ─── THANH TIẾN ĐỘ: THANH LỖI CHỜ HẠ CẤP ─────────────────────
  function renderX2BaoTinhStockBar() {
    const bar = document.getElementById('x2-btinh-stock-bar');
    if (!bar) return;
    const stock = baoTinhDefectStock();
    const remain = stock.reduce((s, x) => s + x.remaining, 0);
    const total = stock.reduce((s, x) => s + x.total, 0);
    if (!total) {
      bar.innerHTML = `<span class="x2-stock-title" title="Thanh lỗi = SL thanh lỗi ghi ở các lượt Bào tinh (nguồn của Bào tinh hạ cấp)"><i data-lucide="alert-circle"></i> Thanh lỗi chờ hạ cấp: <strong>chưa có</strong></span>`;
    } else if (!remain) {
      bar.innerHTML = `<span class="x2-stock-title" title="Toàn bộ thanh lỗi đã được hạ cấp lại"><i data-lucide="check-circle-2"></i> Thanh lỗi chờ hạ cấp: <strong>đã hạ cấp hết ${fmtThanh(total)} thanh</strong></span>`;
    } else {
      const detail = stock.filter(x => x.remaining > 0)
        .map(x => `${comboLabel({ d: x.dims[0], r: x.dims[1], t: x.dims[2] })}: ${fmtThanh(x.remaining)}`)
        .join(' · ');
      bar.innerHTML = `<span class="x2-stock-title" title="Chi tiết theo cỡ — ${escapeHTML(detail)}"><i data-lucide="hourglass"></i> Thanh lỗi chờ hạ cấp: <strong>${fmtThanh(remain)} thanh</strong> · ${stock.filter(x => x.remaining > 0).length} cỡ</span>`;
    }
    initLucide();
  }

  // ─── THỐNG KÊ NHANH CỦA VỊ TRÍ BÀO TINH ──────────────────────
  function renderX2BaoTinhStats() {
    const box = document.getElementById('x2-btinh-stats');
    if (!box) return;
    const disp = (state.xuong2BaoTinhRecords || []).map(baoTinhDisplay);
    const totalIn  = disp.reduce((s, d) => s + d.qtyIn, 0);
    const totalOk  = disp.reduce((s, d) => s + d.qtyOk, 0);
    const totalErr = disp.reduce((s, d) => s + d.qtyErr, 0);
    const totalVol = disp.reduce((s, d) => s + d.volumeOk, 0);
    const hours = disp.reduce((s, d) => s + (d.workHours || 0), 0);
    const capAvg = hours > 0 ? totalIn / hours : null;
    const errPct = totalIn > 0 ? (totalErr / totalIn) * 100 : null;
    const stock = baoTinhDefectStock().reduce((s, x) => s + x.remaining, 0);
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${disp.length}</span>
        <span class="material-stat-label">Lượt bào tinh</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(totalIn)}</span>
        <span class="material-stat-label">Thanh đưa vào (đạt + lỗi)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(totalOk)}</span>
        <span class="material-stat-label">Thanh đạt</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(totalErr)}</span>
        <span class="material-stat-label">Thanh lỗi</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${errPct == null ? '—' : `${fmtRatio(errPct)}%`}</span>
        <span class="material-stat-label">Tỷ lệ lỗi</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${totalVol.toFixed(4)}</span>
        <span class="material-stat-label">Thể tích đạt (m³)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${capAvg == null ? '—' : fmtThanh(capAvg)}</span>
        <span class="material-stat-label">Công suất TB (thanh/h)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(stock)}</span>
        <span class="material-stat-label">Thanh lỗi chờ hạ cấp</span>
      </div>`;
  }

  // ─── RENDER BẢNG CHI TIẾT BÀO TINH ───────────────────────────
  function renderX2BaoTinhCard() {
    syncX2BaoTinhKindRows(true);  // hiện/ẩn ô nguồn theo Loại bào (giữ lựa chọn thẻ)
    renderX2BaoTinhList();        // danh sách THẺ thanh (2 dòng, bấm để chọn/bỏ chọn)
    renderX2BaoTinhGroups();      // bảng tổng hợp theo kích thước chung + ô SL thanh ĐẠT
    renderX2BaoTinhStockBar();    // thanh lỗi chờ hạ cấp
    renderX2BaoTinhRateBar();     // định mức công suất bào tinh theo tháng (thanh/h)
    renderX2BaoTinhStats();
    renderX2BaoTinhTable();       // thẻ ngày: đầu thẻ chung + các nhánh trong thẻ
    renderBaoTinhEffTable();      // bảng phụ "Bào Tinh ↔ Đã Ép" (dời từ tab Ép Ván về đây)
    renderX2BaoTinhCalc();
    syncX2BaoTinhEditBanner();
    updateXuong2CardCounts();
  }

  // ─── BẢNG LỊCH SỬ BÀO TINH = THẺ NGÀY (đầu thẻ chung + nhánh trong thẻ) ──
  function renderX2BaoTinhTable() {
    const box = document.getElementById('x2-btinh-day-cards');
    if (!box) return;
    const list = [...(state.xuong2BaoTinhRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const countEl = document.getElementById('x2-btinh-table-count');
    if (countEl) countEl.textContent = list.length ? `${list.length} lượt bào tinh` : '';
    if (!list.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="sparkles"></i>
          <div>Chưa có lượt bào tinh nào.<br>Chọn <strong>Ngày Bào</strong> + <strong>Loại Bào</strong> + <strong>Chọn thanh</strong>, nhập <strong>kích thước sau bào</strong> và <strong>SL thanh đạt / lỗi</strong> rồi bấm <strong>Lưu Lượt Bào Tinh</strong>.<br><span style="font-size:0.72rem;">Người bào + giờ HC/TC tự lấy từ Bảng bố trí Nhân Sự (vị trí Bào tinh).</span></div>
        </div>`;
      initLucide();
      return;
    }
    const groups = new Map();
    list.forEach(r => {
      const key = r.date || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let html = '';
    for (const [date, rows] of groups) {
      const first = baoTinhDisplay(rows[0]);   // thông tin CHUNG của ngày (người bào/giờ)
      let tIn = 0, tOk = 0, tErr = 0;
      const rowsHtml = rows.map(r => {
        const d = baoTinhDisplay(r);
        tIn += d.qtyIn; tOk += d.qtyOk; tErr += d.qtyErr;
        return baoTinhRowHtml(r, d);
      }).join('');
      const hours = first.workHours || 0;                       // tổng giờ bào (HC + TC)
      const cap = hours > 0 ? (tIn / hours) : null;
      const rate = baoTinhRateOf(date);                         // định mức tháng (thanh/h)
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? 'Chưa đặt Định mức công suất bào tinh cho tháng này (hoặc chưa có giờ bào)'
        : `Hiệu suất = Công suất thực tế (${fmtThanh(cap)} thanh/h) ÷ Định mức bào tinh tháng ${Number(String(date).slice(5))} (${fmtThanh(rate)} thanh/h)`;
      const hcTxt = first.workHoursHC != null ? fmtRatio(first.workHoursHC) : '—';
      const tcTxt = first.workHoursTC != null ? fmtRatio(first.workHoursTC) : '—';
      const errPct = tIn > 0 ? (tErr / tIn) * 100 : null;
      const workers = first.workerRows.filter(x => x.name);
      const workersMain = workers.length
        ? `${escapeHTML(workers[0].name)}${workers[0].time ? ` (${escapeHTML(workers[0].time)})` : ''}`
        : '<em style="color:var(--text-muted);">Chưa có bố trí vị trí Bào tinh</em>';
      const workersMore = workers.length > 1
        ? `<em class="x2-day-cutters-more" title="Người khác cùng ngày: ${escapeHTML(workers.slice(1).map(x => `${x.name}${x.time ? ` (${x.time})` : ''}`).join(', '))}">+${workers.length - 1} người khác</em>`
        : '';
      html += `
        <div class="x2-day-card">
          <div class="x2-day-head">
            <span class="x2-day-date"><i data-lucide="calendar"></i> ${formatDateDDMMYY(date)}</span>
            <span class="x2-day-cutters" title="Người bào — tự động từ Bảng bố trí vị trí 'Bào tinh' (tab Nhân Sự) đúng ngày">
              <i data-lucide="users"></i> ${workersMain} ${workersMore}
            </span>
            <span class="x2-day-hours" title="Thời gian = tổng giờ công vị trí Bào tinh trong ngày (từ tab Nhân Sự), tách giờ hành chính (HC) / giờ tăng ca (TC)">Thời gian: <span class="x2-hours-hc">${hcTxt}h HC</span><span class="x2-hours-tc">${tcTxt}h TC</span></span>
            <span class="x2-day-cap" title="Công suất thực tế = Tổng thanh đưa vào (${fmtThanh(tIn)} thanh) ÷ tổng giờ bào (${fmtRatio(hours)} h)">Công suất: <strong>${cap != null ? `${fmtThanh(cap)} thanh/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
            <span class="x2-day-cap" title="Tổng thanh ĐẠT trong ngày">Đạt: <strong>${fmtThanh(tOk)} thanh</strong></span>
            <span class="x2-day-eff" title="Tổng thanh LỖI trong ngày${errPct == null ? '' : ` (tỷ lệ ${fmtRatio(errPct)}%)`}">Lỗi: <strong style="color:${errPct != null && errPct > 10 ? '#b45309' : '#0f766e'};">${fmtThanh(tErr)} thanh</strong></span>
          </div>
          <table class="data-table x2-day-table">
            <thead>
              <tr>
                <th>Loại bào · Nguồn thanh</th>
                <th>Kích thước sau bào</th>
                <th class="text-right">Thanh đưa vào</th>
                <th class="text-right">Thanh đạt</th>
                <th class="text-right">Thanh lỗi</th>
                <th class="text-right">Thể tích đạt</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }
    box.innerHTML = html;
    initLucide();
  }

  // 1 DÒNG NHÁNH của thẻ ngày bào tinh
  function baoTinhRowHtml(r, d) {
    const kindChip = `<span class="x2-nan-chip" title="Loại bào của lượt này">${escapeHTML(d.kindLabel)}</span>`;
    const errPct = d.qtyIn > 0 ? (d.qtyErr / d.qtyIn) * 100 : null;
    return `
      <tr class="x2-day-row" data-x2-btinh-row="${escapeHTML(r.id)}">
        <td>
          ${kindChip}
          <div class="x2-row-note">${escapeHTML(baoTinhSourceText(r, d))}${(d.kind === 'tinh' && d.batchRemaining != null && (!Array.isArray(r.sources) || r.sources.length <= 1)) ? ` · còn ${fmtThanh(d.batchRemaining)} thanh` : ''}</div>
        </td>
        <td><span class="x2-nan-chip">${comboLabel({ d: d.outDims[0], r: d.outDims[1], t: d.outDims[2] })}</span></td>
        <td class="text-right"><strong>${fmtThanh(d.qtyIn)}</strong> <small style="color:var(--text-muted);">thanh</small></td>
        <td class="text-right"><strong style="color:#16a34a;">${fmtThanh(d.qtyOk)}</strong> <small style="color:var(--text-muted);">thanh</small></td>
        <td class="text-right"><strong style="color:${errPct != null && errPct > 10 ? '#b45309' : '#0f766e'};">${fmtThanh(d.qtyErr)}</strong>${errPct == null ? '' : ` <small style="color:var(--text-muted);">${fmtRatio(errPct)}%</small>`}</td>
        <td class="text-right"><strong style="color:#0f766e;">${d.volumeOk.toFixed(4)}</strong> <small style="color:var(--text-muted);">m³</small></td>
        <td class="text-right">
          <button class="btn btn-icon btn-outline" title="Sửa" data-x2-btinh-edit="${escapeHTML(r.id)}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-icon btn-danger" title="Xóa" data-x2-btinh-delete="${escapeHTML(r.id)}"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
  }

  function renderXuong2Cards() {
    updateXuong2CardCounts();
    // Bảng chi tiết đang mở → làm mới luôn (nguồn dữ liệu có thể vừa đổi).
    // 5 thẻ đã có chức năng render động; các thẻ "Sắp có" là placeholder tĩnh.
    if (openX2Card && openX2Card.id === 'x2-cut-card') renderXuong2CutCard();
    if (openX2Card && openX2Card.id === 'x2-bo-ong-card') renderX2BoOngCard();
    if (openX2Card && openX2Card.id === 'x2-bao-tho-card') renderX2BaoThoCard();
    if (openX2Card && openX2Card.id === 'x2-chon-nan-tho-card') renderX2ChonNanCard();
    if (openX2Card && openX2Card.id === 'x2-bao-tinh-card') renderX2BaoTinhCard();
    if (openX2Card && openX2Card.id === 'x2-ep-van-card') renderX2EpVanCard();
  }

export {
  X2_CARD_DEFS,
  NAN_CLASSES,
  deleteXuong2BaoTho,
  deleteXuong2BoOng,
  deleteXuong2ChonNan,
  deleteXuong2Cut,
  editXuong2BaoTho,
  editXuong2BoOng,
  editXuong2ChonNan,
  editXuong2BaoTinh,
  editXuong2Cut,
  fillXuong2BaoThoOptions,
  fillXuong2BoOngOptions,
  fillXuong2ChonNanOptions,
  fillXuong2CutMaterialOptions,
  handleX2BaoThoRateSave,
  handleX2BoOngRateSave,
  handleX2CapRateSave,
  handleX2ChonNanRateSave,
  handleX2BaoTinhRateSave,
  handleXuong2BaoThoSubmit,
  handleXuong2BoOngSubmit,
  handleXuong2ChonNanSubmit,
  handleXuong2BaoTinhSubmit,
  deleteXuong2BaoTinh,
  handleXuong2CutSubmit,
  loadX2BaoThoRates,
  loadX2BoOngRates,
  loadX2CapRates,
  loadX2ChonNanRates,
  loadX2BaoTinhRates,
  loadXuong2BaoTho,
  loadXuong2BoOng,
  loadXuong2ChonNan,
  loadXuong2BaoTinh,
  loadXuong2Cuts,
  renderX2BaoThoCalc,
  renderX2BaoThoCard,
  renderX2BaoThoRateBar,
  renderX2BaoThoTable,
  renderX2BoOngCard,
  renderX2BoOngRateBar,
  renderX2BoOngStockBar,
  renderX2BoOngTable,
  renderX2ChonNanCalc,
  renderX2BaoTinhCalc,
  renderX2BaoTinhCard,
  renderX2BaoTinhRateBar,
  renderX2BaoTinhTable,
  renderX2ChonNanCard,
  renderX2ChonNanRateBar,
  renderX2ChonNanTable,
  renderX2RateBar,
  renderX2StockBar,
  renderXuong2Cards,
  renderXuong2CutCard,
  resetXuong2BaoThoForm,
  resetXuong2BoOngForm,
  resetXuong2ChonNanForm,
  resetXuong2BaoTinhForm,
  resetXuong2CutForm,
  saveXuong2BaoTho,
  saveXuong2BoOng,
  saveXuong2ChonNan,
  saveXuong2Cuts,
  syncX2ChonNanExternalFields,
  syncX2BaoTinhKindRows,
  toggleBaoTinhPick,
  baoTinhPickAll,
  baoTinhClearPicks,
  baoTinhPickedIds,
  baoTinhOkDrafts,
  baoTinhCandidates,
  baoTinhGroups,
  x2BaoTinhTogglePicker,
  onBaoTinhListClick,
  onBaoTinhGroupInput,
  onBaoTinhGroupClick,
  baoTinhAddRow,
  baoTinhOutDrafts,
  baoTinhManualRows,
  baoTinhOutDimsOf,
  renderX2BaoTinhList,
  renderX2BaoTinhGroups,
  syncX2MiniActive,
  toggleX2BaoThoTable,
  toggleX2BoOngTable,
  toggleX2ChonNanTable,
  toggleX2BaoTinhTable,
  baoTinhLotRemainingOf,
  baoTinhDefectStock,
  toggleX2CutTable,
  updateXuong2BaoThoLinked,
  updateXuong2BoOngLinked,
  updateXuong2CardCounts,
  updateXuong2ChonNanLinked,
  updateXuong2BaoTinhLinked,
  updateXuong2CutLinked,
  x2CloseOpenCard,
  x2OpenCard,
  x2PositionDetailOverlay,
  // Số liệu hiển thị của từng vị trí (dùng cho XUẤT EXCEL Xưởng 2 — export-xlsx.js)
  cutDisplay,
  boOngDisplay,
  baoThoDisplay,
  chonNanDisplay,
  baoTinhDisplay,
  // Thẻ đang mở → vùng dữ liệu Lịch sử + nguồn Xuất Excel (nút dùng chung tab Công Đoạn)
  x2OpenCardId,
  x2OpenCardHistoryDomain,
  x2OpenCardExportSource,
  X2_CARD_HISTORY_DOMAIN,
  X2_CARD_EXPORT_SOURCE
};
