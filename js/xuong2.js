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
import { supplierKey } from './suppliers.js';
import { STORAGE_KEY_XUONG2_BAO_THO, STORAGE_KEY_XUONG2_BO_ONG, STORAGE_KEY_XUONG2_CUTS, STORAGE_KEY_X2_BAO_THO_RATE, STORAGE_KEY_X2_BO_ONG_RATE, STORAGE_KEY_X2_CAP_RATE, state } from './state.js';
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
    'x2-chon-nan-tho-card': { el: 'x2-mini-count-chon-nan-tho', soon: true }, // Chọn Nan Thô
    'x2-than-hoa-card':     { el: 'x2-mini-count-than-hoa' },                 // Than Hóa + Sấy (CHỨA BẢNG KANBAN lô nan)
    'x2-bao-tinh-card':     { el: 'x2-mini-count-bao-tinh',     soon: true }, // Bào Tinh
    'x2-ep-van-card':       { el: 'x2-mini-count-ep-van',       soon: true }, // Ép Ván
    'x2-bullig-card':       { el: 'x2-mini-count-bullig',       soon: true }, // Bullig
    'x2-cat-van-card':      { el: 'x2-mini-count-cat-van',      soon: true }, // Cắt Ván
    'x2-bao-van-card':      { el: 'x2-mini-count-bao-van',      soon: true }, // Bào Ván
    'x2-ho-tro-card':       { el: 'x2-mini-count-ho-tro',       soon: true }  // Hỗ Trợ + Công Đoạn Lẻ
  };


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
    // Thẻ mới thêm CHƯA có bảng số liệu → chip "Sắp có" (chức năng bổ sung sau)
    const def = X2_CARD_DEFS[cardId];
    if (def && def.soon) return 'Sắp có';
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
    // Luôn vẽ dữ liệu mới nhất mỗi lần mở — 3 thẻ đã có chức năng (Cắt Chọn,
    // Bổ Ống, Chạy Máy Bào Thô); các thẻ "Sắp có" chỉ hiện placeholder.
    if (cardId === 'x2-cut-card') renderXuong2CutCard();
    if (cardId === 'x2-bo-ong-card') renderX2BoOngCard();
    if (cardId === 'x2-bao-tho-card') renderX2BaoThoCard();
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
  // NGUỒN CHÍNH (sẽ bật khi làm xong công đoạn "Chọn Nan Thô"): số thanh ĐẠT
  // theo kích thước ghi ở bảng chọn nan. Hiện công đoạn đó CHƯA có dữ liệu
  // (state.xuong2ChonNanThoRecords chưa ra đời) → trả null = CHƯA CÓ SỐ LIỆU
  // (thẻ hiện "Chờ Chọn Nan Thô" — KHÔNG bịa số).
  function chonNanQtyOf(rec) {
    const src = state.xuong2ChonNanThoRecords;
    if (!Array.isArray(src) || !src.length) return null;
    const keys = new Set(baoThoCombos(rec).map(c => dimKeyOf(c.d, c.r, c.t)));
    const hit = src.filter(x => keys.has(dimKeyOf((x.dims || [])[0], (x.dims || [])[1], (x.dims || [])[2])));
    if (!hit.length) return null;
    return {
      qty: hit.reduce((s, x) => s + (Number(x.quantity) || 0), 0),
      records: hit.length,
      source: 'chonnan'
    };
  }
  // Số lượng thanh tự động của 1 lượt chạy máy: { qty|null, records, source }
  function baoThoQtyOf(rec) {
    const official = chonNanQtyOf(rec);
    if (official) return official;
    return { qty: null, records: 0, source: 'none' };
  }
  // THỂ TÍCH QUY ĐỔI (m³) = số thanh × thể tích TRUNG BÌNH 1 thanh của các tổ
  // hợp kích thước đã nhập (chưa có số lượng → null: thẻ hiện "Chờ Chọn Nan Thô")
  function baoThoVolumeOf(rec) {
    const q = baoThoQtyOf(rec);
    const unit = baoThoUnitVolAvg(rec);
    if (q.qty == null || unit == null) return null;
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

  // ─── RENDER KHU VỰC XƯỞNG 2 (gọi từ main.js) ─────────────────
  function renderXuong2Cards() {
    updateXuong2CardCounts();
    // Bảng chi tiết đang mở → làm mới luôn (nguồn dữ liệu có thể vừa đổi).
    // 3 thẻ đã có chức năng (Cắt Chọn, Bổ Ống, Chạy Máy Bào Thô) render động;
    // các thẻ "Sắp có" là placeholder tĩnh.
    if (openX2Card && openX2Card.id === 'x2-cut-card') renderXuong2CutCard();
    if (openX2Card && openX2Card.id === 'x2-bo-ong-card') renderX2BoOngCard();
    if (openX2Card && openX2Card.id === 'x2-bao-tho-card') renderX2BaoThoCard();
  }

export {
  X2_CARD_DEFS,
  deleteXuong2BaoTho,
  deleteXuong2BoOng,
  deleteXuong2Cut,
  editXuong2BaoTho,
  editXuong2BoOng,
  editXuong2Cut,
  fillXuong2BaoThoOptions,
  fillXuong2BoOngOptions,
  fillXuong2CutMaterialOptions,
  handleX2BaoThoRateSave,
  handleX2BoOngRateSave,
  handleX2CapRateSave,
  handleXuong2BaoThoSubmit,
  handleXuong2BoOngSubmit,
  handleXuong2CutSubmit,
  loadX2BaoThoRates,
  loadX2BoOngRates,
  loadX2CapRates,
  loadXuong2BaoTho,
  loadXuong2BoOng,
  loadXuong2Cuts,
  renderX2BaoThoCalc,
  renderX2BaoThoCard,
  renderX2BaoThoRateBar,
  renderX2BaoThoTable,
  renderX2BoOngCard,
  renderX2BoOngRateBar,
  renderX2BoOngStockBar,
  renderX2BoOngTable,
  renderX2RateBar,
  renderX2StockBar,
  renderXuong2Cards,
  renderXuong2CutCard,
  resetXuong2BaoThoForm,
  resetXuong2BoOngForm,
  resetXuong2CutForm,
  saveXuong2BaoTho,
  saveXuong2BoOng,
  saveXuong2Cuts,
  syncX2MiniActive,
  toggleX2BaoThoTable,
  toggleX2BoOngTable,
  toggleX2CutTable,
  updateXuong2BaoThoLinked,
  updateXuong2BoOngLinked,
  updateXuong2CardCounts,
  updateXuong2CutLinked,
  x2CloseOpenCard,
  x2OpenCard,
  x2PositionDetailOverlay
};
