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
import { firePushSync, initLucide, requireEditPermission, requireRatePermission } from './cloud.js';
import { canEditTab } from './permissions.js';   // SỬA NHANH inline trong thẻ ngày (chỉ người có quyền tab Công Đoạn)
import { pushUndo } from './events.js'; // hoàn tác khi thêm/sửa/xóa phiếu kho (chỉ dùng lúc chạy)
import { logDataChange } from './history.js';
import { canApproveLeave, hrSplitHoursHCDate } from './hr.js';
import { renderAll } from './main.js'; // vẽ lại toàn bộ (Kanban cột Kho ẩn lô hết) — dùng lúc chạy
import { materialWeekLabel } from './materials.js';
import { pressRecordWeek, pressVolumeTotalOf, renderX2EpVanCard } from './press.js';
import { rateNanUse } from './planning.js';
import { supplierKey } from './suppliers.js';
import { STORAGE_KEY_XUONG2_BAO_THO, STORAGE_KEY_XUONG2_BAO_TINH, STORAGE_KEY_XUONG2_BULLIG, STORAGE_KEY_XUONG2_BO_ONG, STORAGE_KEY_XUONG2_BOLUONG, STORAGE_KEY_XUONG2_CHON_NAN, STORAGE_KEY_XUONG2_CUTS, STORAGE_KEY_X2_BAO_THO_RATE, STORAGE_KEY_X2_BAO_TINH_RATE, STORAGE_KEY_X2_BULLIG_RATE, STORAGE_KEY_X2_BO_ONG_RATE, STORAGE_KEY_X2_BOLUONG_RATE, STORAGE_KEY_X2_CAP_RATE, STORAGE_KEY_X2_CHON_NAN_RATE, STORAGE_KEY_X2_KANBAN_COLLAPSED, STORAGE_KEY_X2_SAY_FRAME, STORAGE_KEY_X2_SAY_RATE, STORAGE_KEY_X2_SAY_TIMES, STORAGE_KEY_X2_SAY_INCIDENT, STORAGE_KEY_X2_STAGE_INCIDENT, STORAGE_KEY_X2_BAO_THANH_OUT_SIZES, STORAGE_KEY_KHO_NOTES, STORAGE_KEY_KHO_SHOW_USED, STORAGE_KEY_STAGE_WS, STORAGE_KEY_XUONG1_CAT_ONG, STORAGE_KEY_XUONG1_SAY_SINH, STORAGE_KEY_XUONG1_BOC, STORAGE_KEY_XUONG1_LOC_ONG, STORAGE_KEY_XUONG1_CAT_MAT, STORAGE_KEY_XUONG1_BO, STORAGE_KEY_XUONG1_PHOI_SAY, STORAGE_KEY_XUONG1_LOC_THANH, STORAGE_KEY_X1_RATES, state } from './state.js';
import { trackDeleted } from './tombstone.js';
import { calculateVolume, escapeHTML, formatDateDDMMYY, getBatchStageHistory, getHistoryEntryDays, getISOWeekString, showToast, stageEffHours, stageIncidentInputHtml, stageIncidentKey, stageIncidentOf, KHO_METHOD_LABELS, KHO_PURPOSE_LABELS, KHO_PURPOSE_ORDER, KHO_SOURCE_LABELS, khoApprovedScrapNotes, khoApprovedXuatNotes, khoDerivedOutOf, khoFifoAllocation, khoFirstInDateOf, khoInCountOf, khoLastInDateOf, khoLedgerEvents, khoLotRemainingOf, khoNormPurpose, khoOutRoundCountOf, khoPeriodKeyOf, khoStockSummary } from './utils.js';
import { renderKilnBoard } from './kiln.js'; // BẢNG ĐIỀU KHIỂN LÒ SẤY (khung mặc định thẻ Than Hóa + Sấy)

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
    'x2-bo-luong-card':     { el: 'x2-mini-count-bo-luong' },                   // Bốc Luồng (ĐÃ CÓ chức năng)
    'x2-cut-card':          { el: 'x2-mini-count-cut' },                      // Cắt Chọn (ĐÃ CÓ chức năng)
    'x2-bo-ong-card':       { el: 'x2-mini-count-bo-ong' },                   // Bổ Ống (ĐÃ CÓ chức năng)
    'x2-bao-tho-card':      { el: 'x2-mini-count-bao-tho' },                  // Chạy Máy Bào Thô (ĐÃ CÓ chức năng)
    'x2-chon-nan-tho-card': { el: 'x2-mini-count-chon-nan-tho' },            // Chọn Nan Thô (ĐÃ CÓ chức năng)
    'x2-than-hoa-card':     { el: 'x2-mini-count-than-hoa' },                 // Than Hóa + Sấy (CHỨA BẢNG KANBAN lô nan)
    'x2-kho-card':          { el: 'x2-mini-count-kho' },                      // Kho Nan (tồn · phiếu xuất/tiêu hủy/tái chế + sổ theo kỳ)
    'x2-bao-tinh-card':     { el: 'x2-mini-count-bao-tinh' },                 // Bào Tinh (ĐÃ CÓ chức năng)
    'x2-ep-van-card':       { el: 'x2-mini-count-ep-van' },                    // Ép Ván (ĐÃ CÓ chức năng — 2 khung: Lượt Ép / Biểu Đồ)
    'x2-bullig-card':       { el: 'x2-mini-count-bullig' },                   // Bullig (ĐÃ CÓ chức năng — Gia công + Chọn thanh)
    'x2-cat-van-card':      { el: 'x2-mini-count-cat-van',      soon: true }, // Cắt Ván
    'x2-bao-van-card':      { el: 'x2-mini-count-bao-van',      soon: true }, // Bào Ván
    'x2-ho-tro-card':       { el: 'x2-mini-count-ho-tro',       soon: true }, // Hỗ Trợ + Công Đoạn Lẻ

    // ─── XƯỞNG 1 — 8 CÔNG ĐOẠN (04/10/2026) ────────────────────
    // Thứ tự theo LUỒNG SX: Cắt Ống → Sấy Sinh → Bốc → Lọc Ống →
    // Cắt Mắt → Bổ → Phơi Sấy → Lọc Thanh/Bó Xô.
    // ws: 'x1' → thẻ thuộc khối Xưởng 1 (ẩn/hiện theo công tắc XƯỞNG 1/2);
    // `soon: true` → launcher placeholder, mở ra chỉ có chú thích "Sắp có".
    // Gỡ cờ soon = viết hàm render riêng + thêm nhánh trong x2OpenCard.
    'x1-cat-ong-card':      { el: 'x2-mini-count-x1-cat-ong',   ws: 'x1' },             // Cắt Ống (CÓ chức năng)
    'x1-say-sinh-card':     { el: 'x2-mini-count-x1-say-sinh',  ws: 'x1' },             // Sấy Sinh (CÓ chức năng)
    'x1-boc-card':          { el: 'x2-mini-count-x1-boc',       ws: 'x1' },             // Bốc (CÓ chức năng)
    'x1-loc-ong-card':      { el: 'x2-mini-count-x1-loc-ong',   ws: 'x1' },             // Lọc Ống
    'x1-cat-mat-card':      { el: 'x2-mini-count-x1-cat-mat',   ws: 'x1' },             // Cắt Mắt
    'x1-bo-card':           { el: 'x2-mini-count-x1-bo',        ws: 'x1' },             // Bổ
    'x1-phoi-say-card':     { el: 'x2-mini-count-x1-phoi-say',  ws: 'x1' },             // Phơi Sấy
    'x1-loc-thanh-card':    { el: 'x2-mini-count-x1-loc-thanh', ws: 'x1' }              // Lọc Thanh / Bó Xô
  };


  // ─── NÚT DÙNG CHUNG Ở TAB CÔNG ĐOẠN (Lịch Sử + Xuất Dữ Liệu X2) ──
  // Mỗi thẻ Xưởng 2 → VÙNG DỮ LIỆU (khóa trong DOMAINS của history.js) và
  // NGUỒN XUẤT Excel (khóa trong X2_EXPORT_SOURCES của export-xlsx.js) để 2 nút
  // dùng chung tự phục vụ đúng thẻ đang mở.
  const X2_CARD_HISTORY_DOMAIN = {
    'x2-bo-luong-card': 'xuong2BoluongRecords',
    'x2-cut-card': 'xuong2CutRecords',
    'x2-bo-ong-card': 'xuong2BoOngRecords',
    'x2-bao-tho-card': 'xuong2BaoThoRecords',
    'x2-chon-nan-tho-card': 'xuong2ChonNanThoRecords',
    'x2-than-hoa-card': 'batches',
    'x2-kho-card': 'khoNotes',
    'x2-bao-tinh-card': 'xuong2BaoTinhRecords',
    'x2-bullig-card': 'xuong2BulligRecords',
    'x2-ep-van-card': 'pressRecords',
    // XƯỞNG 1 — 8 công đoạn (05/10/2026)
    'x1-cat-ong-card': 'xuong1CatOngRecords',
    'x1-say-sinh-card': 'xuong1SaySinhRecords',
    'x1-boc-card': 'xuong1BocRecords',
    'x1-loc-ong-card': 'xuong1LocOngRecords',
    'x1-cat-mat-card': 'xuong1CatMatRecords',
    'x1-bo-card': 'xuong1BoRecords',
    'x1-phoi-say-card': 'xuong1PhoiSayRecords',
    'x1-loc-thanh-card': 'xuong1LocThanhRecords'
  };
  const X2_CARD_EXPORT_SOURCE = {
    'x2-bo-luong-card': 'boluong',
    'x2-cut-card': 'cut',
    'x2-bo-ong-card': 'boong',
    'x2-bao-tho-card': 'baotho',
    'x2-chon-nan-tho-card': 'chonnan',
    'x2-than-hoa-card': 'batch',
    'x2-kho-card': 'kho',
    'x2-bao-tinh-card': 'baotinh',
    'x2-bullig-card': 'bullig',
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
  // Vị trí BỐC LUỒNG (chứa "bốc luồng") — khớp "Bốc Luồng", "Bốc luồng 2"...
  function isBocLuongPos(name) {
    return normPosName(name).includes('boc luong');
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
  function hrBoluongAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isBocLuongPos); }
  function hrBoOngAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isBoOngPos); }
  function hrBaoThoAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isBaoThoPos); }
  function hrChonNanAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isChonNanPos); }
  // Chuỗi giờ 1 lượt bố trí: "07:00–12:00"; giờ ra TRỐNG = làm đến HẾT CA
  // (mặc định theo quy ước Bảng bố trí Nhân Sự) → hiển thị "07:00 → hết ca"
  const posTimeStr = a => (a.end ? `${a.start}–${a.end}` : `${a.start} → hết ca`);
  const cutTimeStr = posTimeStr; // tên cũ (lượt cắt/chọn) — giữ để không phá code khác

  // ─── THAN HÓA + SẤY: ĐỊNH MỨC 1 LẦN THAN HÓA (theo tháng + công đoạn sấy) ───
  // Mỗi LẦN than hóa là 1 mẻ: đưa nan vào lò than hóa → ra vị trí sấy.
  //   • Sấy 1: mọi lô nan trong lần đó đều qua 105 phút (mặc định)
  //   • Sấy 2: 50 phút (mặc định)
  //   • 1 lần than hóa chứa bao nhiêu m³ → dùng hệ số 2 m³/lần để QUY ĐỔI — CHỈ
  //     còn áp cho DỮ LIỆU CŨ (lô vào sấy TRƯỚC mốc SAY_NO_AUTO_FROM mà không có
  //     mã mẻ): lô 3,5 m³ → 2 lần than hóa.
  // Dữ liệu MỚI (từ 28/09/2026): mỗi lượt bấm "Lưu" của form Thêm Lô Sấy Mới =
  // 1 lần than hóa (mã mẻ sayCharges gắn lên từng lô — batch-modals.js), hoặc
  // điền tay số lần ở ô "Số lần TH" của bảng thống kê để ghi đè.
  function isThanHoaPos(name) {
    const n = normPosName(name);
    // Vị trí "Than hóa" là chính; nới thêm "sấy" phòng khi nhà máy khai riêng
    // một vị trí cho công đoạn sấy (bỏ dấu nên "Sấy" → "say").
    return n.includes('than hoa') || n.includes('say');
  }
  function hrThanHoaAssignmentsOf(dateVal) { return hrAssignmentsAt(dateVal, isThanHoaPos); }

  // Mặc định 1 LẦN than hóa: PHÚT mỗi lần RIÊNG THEO LOẠI (Ván / Bullig — thời
  // gian 2 loại KHÁC NHAU; 1 lò có thể chứa cả 2 loại) + hệ số quy đổi m³ mỗi
  // lần (2 m³/lần — CHỈ dùng để gộp LÔ CŨ trước mốc SAY_NO_AUTO_FROM). Bullig
  // chưa khai số riêng → tạm bằng Ván tới khi nhập trong POPUP "Định mức".
  const SAY_RATE_DEFAULT = {
    s1: { van: 105, bullig: 105, m3: 2 },
    s2: { van: 50, bullig: 50, m3: 2 }
  };
  const sayRateGroup = stage => (stage === 'say2' ? 's2' : 's1');
  const fmtPhut = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const fmtM3   = v => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
  const fmtGio  = v => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNum  = (v, d) => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Khóa LOẠI của lô/lần: 'bullig' hoặc 'van' — theo ô "Dùng Cho" của lô
  function sayTypeKeyOf(useFor) {
    return bulligNorm(useFor || '') === 'bullig' ? 'bullig' : 'van';
  }
  // Định mức của 1 THÁNG + công đoạn + LOẠI → { phut, m3, custom }
  // (custom = tháng đó đã được khai định mức riêng hay đang dùng mặc định)
  // Đọc được 3 DẠNG dữ liệu (tương thích dữ liệu cũ + máy khác tải mây về):
  //   • số thuần (bản rất cũ)             → hiểu là PHÚT mỗi lần (dùng chung 2 loại)
  //   • { phut, m3 }                      → phút dùng chung 2 loại
  //   • { van:{phut}, bullig:{phut}, m3 } → phút RIÊNG từng loại (dạng MỚI)
  function sayRateEntryOf(dateVal, stage, useFor) {
    const key = sayRateGroup(stage);
    const typeKey = sayTypeKeyOf(useFor);
    const defPhut = SAY_RATE_DEFAULT[key][typeKey];
    const defM3 = SAY_RATE_DEFAULT[key].m3;
    const g = ((state.x2SayRates || {})[key]) || {};
    const v = g[String(dateVal || '').slice(0, 7)];
    let phut = defPhut, m3 = defM3;
    if (typeof v === 'number') {
      if (v > 0) phut = v;
    } else if (v && typeof v === 'object') {
      if (v.van || v.bullig) {
        // Dạng MỚI: từng loại tự đọc — loại còn thiếu dùng MẶC ĐỊNH của loại đó
        const tv = (v[typeKey] && typeof v[typeKey] === 'object') ? v[typeKey] : null;
        if (tv && Number(tv.phut) > 0) phut = Number(tv.phut);
      } else if (Number(v.phut) > 0) {
        phut = Number(v.phut);
      }
      if (Number(v.m3) > 0) m3 = Number(v.m3);
    }
    return { phut, m3, custom: !!v };
  }
  // Số PHÚT của 1 lần than hóa THEO LOẠI (Ván / Bullig) của công đoạn + tháng
  // (không truyền useFor → hiểu là Ván)
  function sayMinutesPerCharge(dateVal, stage, useFor) { return sayRateEntryOf(dateVal, stage, useFor).phut; }
  // Số m³ quy đổi cho 1 lần than hóa (mặc định 2 m³/lần — số CHUNG của công đoạn,
  // không phân loại; chỉ còn dùng để tự gộp LÔ CŨ thành lần)
  function sayM3PerCharge(dateVal, stage) { return sayRateEntryOf(dateVal, stage, 'Ván').m3; }

  // Dọn định mức đã lưu: chấp nhận BẢN CŨ (số thuần = phút · { phut, m3 }) lẫn
  // bản MỚI ({ van:{phut}, bullig:{phut}, m3 }) — bản cũ chuyển thành phút RIÊNG
  // từng loại (cùng 1 số) + m³ giữ nguyên/mặc định.
  function loadX2SayRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_SAY_RATE);
    state.x2SayRates = { s1: {}, s2: {} };
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      ['s1', 's2'].forEach(k => {
        const g = (obj[k] && typeof obj[k] === 'object') ? obj[k] : {};
        const def = SAY_RATE_DEFAULT[k];
        const out = {};
        Object.keys(g).forEach(month => {
          if (!/^\d{4}-\d{2}$/.test(month)) return;
          const v = g[month];
          if (typeof v === 'number') {
            const phut = v > 0 ? v : def.van;
            out[month] = { van: { phut }, bullig: { phut }, m3: def.m3 };
          } else if (v && typeof v === 'object') {
            if (v.van || v.bullig) {
              const van = (v.van && typeof v.van === 'object') ? v.van : {};
              const bul = (v.bullig && typeof v.bullig === 'object') ? v.bullig : {};
              out[month] = {
                van: { phut: Number(van.phut) > 0 ? Number(van.phut) : def.van },
                bullig: { phut: Number(bul.phut) > 0 ? Number(bul.phut) : def.bullig },
                m3: Number(v.m3) > 0 ? Number(v.m3) : def.m3
              };
            } else {
              const phut = Number(v.phut) > 0 ? Number(v.phut) : def.van;
              out[month] = { van: { phut }, bullig: { phut }, m3: Number(v.m3) > 0 ? Number(v.m3) : def.m3 };
            }
          }
        });
        state.x2SayRates[k] = out;
      });
    } catch (e) {}
  }

  function saveX2SayRates() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_SAY_RATE, JSON.stringify(state.x2SayRates || { s1: {}, s2: {} }));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // ── POPUP "ĐỊNH MỨC" — bảng theo THÁNG, 4 cột phút/lần riêng Ván/Bullig ──
  // (Sấy 1 · Ván / Sấy 1 · Bullig / Sấy 2 · Ván / Sấy 2 · Bullig; ô trống = mặc định)
  function openX2SayRateModal() {
    if (!requireRatePermission()) return; // CHỈ admin mở bảng định mức
    const modal = document.getElementById('modal-x2-say-rate');
    if (!modal) return;
    renderX2SayRateModal();
    modal.classList.add('show');
    initLucide();
  }
  function closeX2SayRateModal() {
    const modal = document.getElementById('modal-x2-say-rate');
    if (modal) modal.classList.remove('show');
  }
  // Danh sách tháng của bảng: tháng đã khai + tháng có lô vào sấy + 18 tháng gần nhất
  function sayRateMonthsList() {
    const months = new Set();
    ['s1', 's2'].forEach(k => Object.keys((state.x2SayRates || {})[k] || {}).forEach(m => months.add(m)));
    sayChargeRows().forEach(r => months.add(String(r.date || '').slice(0, 7)));
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return [...months].filter(m => /^\d{4}-\d{2}$/.test(m)).sort((a, b) => b.localeCompare(a));
  }
  // 4 ô nhập của 1 hàng tháng (id: x2sr-<tháng>-<công đoạn>-<loại>)
  function sayRateRowInputs(month) {
    const g = id => document.getElementById(`x2sr-${month}-${id}`);
    return { s1van: g('s1-van'), s1bullig: g('s1-bullig'), s2van: g('s2-van'), s2bullig: g('s2-bullig') };
  }
  // Lưu 1 HÀNG (1 tháng): 4 ô phút/lần — trống = dùng mặc định của loại đó
  function handleX2SayRateRowSave(month) {
    if (!requireRatePermission()) return;
    const m = String(month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Tháng không hợp lệ!', 'error'); return; }
    const inp = sayRateRowInputs(m);
    const readPhut = (el, def) => {
      const raw = String((el && el.value) || '').trim().replace(',', '.');
      if (raw === '') return def;
      const v = Number(raw);
      return (Number.isFinite(v) && v > 0) ? v : 0;
    };
    const s1v = readPhut(inp.s1van, SAY_RATE_DEFAULT.s1.van);
    const s1b = readPhut(inp.s1bullig, SAY_RATE_DEFAULT.s1.bullig);
    const s2v = readPhut(inp.s2van, SAY_RATE_DEFAULT.s2.van);
    const s2b = readPhut(inp.s2bullig, SAY_RATE_DEFAULT.s2.bullig);
    if (s1v <= 0 || s1b <= 0 || s2v <= 0 || s2b <= 0) {
      showToast('Số PHÚT mỗi lần than hóa phải lớn hơn 0 (hoặc để trống = dùng mặc định)!', 'error');
      return;
    }
    state.x2SayRates = state.x2SayRates || { s1: {}, s2: {} };
    state.x2SayRates.s1 = state.x2SayRates.s1 || {};
    state.x2SayRates.s2 = state.x2SayRates.s2 || {};
    // m³/lần giữ nguyên giá trị đang có của tháng (chỉnh riêng ở dòng "m³/lần (lô cũ)")
    const m3Of = (old, def) => (old && Number(old.m3) > 0) ? Number(old.m3) : def;
    state.x2SayRates.s1[m] = { van: { phut: s1v }, bullig: { phut: s1b }, m3: m3Of(state.x2SayRates.s1[m], SAY_RATE_DEFAULT.s1.m3) };
    state.x2SayRates.s2[m] = { van: { phut: s2v }, bullig: { phut: s2b }, m3: m3Of(state.x2SayRates.s2[m], SAY_RATE_DEFAULT.s2.m3) };
    saveX2SayRates();
    renderX2SayRateModal();
    renderX2SayRateChip();
    renderX2SayStats();
    showToast(`Đã lưu định mức tháng ${m.slice(5)}/${m.slice(0, 4)}: S1 V${fmtPhut(s1v)}/B${fmtPhut(s1b)}' · S2 V${fmtPhut(s2v)}/B${fmtPhut(s2b)}'.`, 'success');
  }
  // Khôi phục MẶC ĐỊNH cho 1 tháng (xóa khai báo của tháng đó)
  function handleX2SayRateRowReset(month) {
    if (!requireRatePermission()) return;
    const m = String(month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) return;
    const has = !!(((state.x2SayRates || {}).s1 || {})[m] || ((state.x2SayRates || {}).s2 || {})[m]);
    if (!has) return;
    if (typeof confirm === 'function' && !confirm(`Khôi phục MẶC ĐỊNH định mức tháng ${m.slice(5)}/${m.slice(0, 4)}?`)) return;
    if (state.x2SayRates.s1) delete state.x2SayRates.s1[m];
    if (state.x2SayRates.s2) delete state.x2SayRates.s2[m];
    saveX2SayRates();
    renderX2SayRateModal();
    renderX2SayRateChip();
    renderX2SayStats();
    showToast(`Đã khôi phục mặc định định mức tháng ${m.slice(5)}/${m.slice(0, 4)}.`, 'info');
  }
  // Thêm 1 tháng mới vào bảng (tạo entry với giá trị mặc định để điền)
  function handleX2SayRateAddMonth() {
    if (!requireRatePermission()) return; // CHỈ admin được thêm tháng định mức
    const el = document.getElementById('x2sr-new-month');
    const m = String((el && el.value) || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Chưa chọn tháng để thêm!', 'error'); return; }
    state.x2SayRates = state.x2SayRates || { s1: {}, s2: {} };
    state.x2SayRates.s1 = state.x2SayRates.s1 || {};
    state.x2SayRates.s2 = state.x2SayRates.s2 || {};
    if (!state.x2SayRates.s1[m]) {
      state.x2SayRates.s1[m] = { van: { phut: SAY_RATE_DEFAULT.s1.van }, bullig: { phut: SAY_RATE_DEFAULT.s1.bullig }, m3: SAY_RATE_DEFAULT.s1.m3 };
      state.x2SayRates.s2[m] = { van: { phut: SAY_RATE_DEFAULT.s2.van }, bullig: { phut: SAY_RATE_DEFAULT.s2.bullig }, m3: SAY_RATE_DEFAULT.s2.m3 };
      saveX2SayRates();
    }
    renderX2SayRateModal();
    const first = document.getElementById(`x2sr-${m}-s1-van`);
    if (first) first.focus();
  }
  // Dòng "m³/lần (lô cũ)" — m³ là số CHUNG của công đoạn (không phân loại): chỉ
  // dùng để tự gộp các LÔ CŨ (trước 28/09/2026, không có mã mẻ) thành lần.
  function handleX2SayRateM3Save() {
    if (!requireRatePermission()) return;
    const monthEl = document.getElementById('x2sr-m3-month');
    const m = String((monthEl && monthEl.value) || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Chưa chọn tháng cho m³/lần!', 'error'); return; }
    const readM3 = (el, def) => {
      const raw = String((el && el.value) || '').trim().replace(',', '.');
      if (raw === '') return def;
      const v = Number(raw);
      return (Number.isFinite(v) && v > 0) ? v : 0;
    };
    const m1 = readM3(document.getElementById('x2sr-m3-s1'), SAY_RATE_DEFAULT.s1.m3);
    const m2 = readM3(document.getElementById('x2sr-m3-s2'), SAY_RATE_DEFAULT.s2.m3);
    if (m1 <= 0 || m2 <= 0) { showToast('Số m³ mỗi lần phải lớn hơn 0 (hoặc để trống = mặc định)!', 'error'); return; }
    state.x2SayRates = state.x2SayRates || { s1: {}, s2: {} };
    state.x2SayRates.s1 = state.x2SayRates.s1 || {};
    state.x2SayRates.s2 = state.x2SayRates.s2 || {};
    const setM3 = (grp, m3) => {
      const def = SAY_RATE_DEFAULT[grp];
      const cur = state.x2SayRates[grp][m];
      let base;
      if (cur && typeof cur === 'object' && (cur.van || cur.bullig)) {
        base = cur;
      } else {
        const phut = (cur && Number(cur.phut) > 0) ? Number(cur.phut) : def.van;
        base = { van: { phut }, bullig: { phut } };
      }
      base.m3 = m3;
      state.x2SayRates[grp][m] = base;
    };
    setM3('s1', m1);
    setM3('s2', m2);
    saveX2SayRates();
    renderX2SayRateModal();
    renderX2SayRateChip();
    renderX2SayStats();
    showToast(`Đã lưu m³/lần (lô cũ) tháng ${m.slice(5)}/${m.slice(0, 4)}: Sấy 1 ${fmtM3(m1)} · Sấy 2 ${fmtM3(m2)}.`, 'success');
  }
  // Điền giá trị m³/lần ĐANG DÙNG của tháng đang chọn vào 2 ô (đổi tháng → điền lại)
  function syncX2SayRateM3Inputs() {
    const m = String((document.getElementById('x2sr-m3-month') || {}).value || '');
    if (!/^\d{4}-\d{2}$/.test(m)) return;
    const s1El = document.getElementById('x2sr-m3-s1');
    const s2El = document.getElementById('x2sr-m3-s2');
    if (s1El) s1El.value = sayM3PerCharge(m, 'say1');
    if (s2El) s2El.value = sayM3PerCharge(m, 'say2');
  }
  // Vẽ BẢNG ĐỊNH MỨC trong popup: mỗi THÁNG 1 hàng — 4 ô phút/lần (trống = mặc định)
  function renderX2SayRateModal() {
    const tbody = document.getElementById('x2-say-rate-rows');
    if (!tbody) return;
    const months = sayRateMonthsList();
    const cell = (month, grp, typeKey) => {
      const stage = grp === 's1' ? 'say1' : 'say2';
      const cur = ((state.x2SayRates || {})[grp] || {})[month];
      const def = SAY_RATE_DEFAULT[grp][typeKey];
      const shown = cur ? sayRateEntryOf(month, stage, typeKey === 'bullig' ? 'Bullig' : 'Ván').phut : '';
      return `<td class="x2sr-cell"><input type="number" min="1" step="any" inputmode="decimal" class="x2sr-input" id="x2sr-${month}-${grp}-${typeKey}" value="${shown}" placeholder="mặc định ${def}" title="Phút/lần cho ${grp === 's1' ? 'Sấy 1' : 'Sấy 2'} · ${typeKey === 'bullig' ? 'Bullig' : 'Ván'} — trống = mặc định ${def}"></td>`;
    };
    tbody.innerHTML = months.map(m => {
      const custom = !!(((state.x2SayRates || {}).s1 || {})[m] || ((state.x2SayRates || {}).s2 || {})[m]);
      return `<tr${custom ? '' : ' class="x2sr-row-default"'}>
        <td class="x2sr-month">${escapeHTML(m.slice(5) + '/' + m.slice(0, 4))}${custom ? '' : ' <span class="x2sr-def-tag">(mặc định)</span>'}</td>
        ${cell(m, 's1', 'van')}
        ${cell(m, 's1', 'bullig')}
        ${cell(m, 's2', 'van')}
        ${cell(m, 's2', 'bullig')}
        <td class="x2sr-act">
          <button type="button" class="btn btn-primary btn-sm" data-x2sr-save="${escapeHTML(m)}" data-admin-only title="Lưu 4 ô phút/lần của tháng này"><i data-lucide="save"></i></button>
          <button type="button" class="btn btn-outline btn-sm" data-x2sr-reset="${escapeHTML(m)}" data-admin-only title="Khôi phục mặc định (xóa khai báo tháng này)"${custom ? '' : ' disabled'}><i data-lucide="rotate-ccw"></i></button>
        </td>
      </tr>`;
    }).join('');
    const m3Month = document.getElementById('x2sr-m3-month');
    if (m3Month) {
      m3Month.innerHTML = months.map(m => `<option value="${escapeHTML(m)}">${escapeHTML(m.slice(5) + '/' + m.slice(0, 4))}</option>`).join('');
      if (months.length) m3Month.value = months[0];
      syncX2SayRateM3Inputs();
    }
    initLucide();
  }
  // Chip tóm tắt định mức trên thẻ (thay thanh nhập cũ) — bấm nút "Định mức" để sửa
  function renderX2SayRateChip() {
    const el = document.getElementById('x2-say-rate-chip');
    if (!el) return;
    const cur = new Date().toISOString().slice(0, 7);
    const pairOf = (stage) => {
      const van = sayRateEntryOf(cur, stage, 'Ván');
      const bul = sayRateEntryOf(cur, stage, 'Bullig');
      return van.phut === bul.phut ? `${fmtPhut(van.phut)}'` : `V${fmtPhut(van.phut)}'/B${fmtPhut(bul.phut)}'`;
    };
    el.innerHTML = `Sấy 1 <b>${pairOf('say1')}</b> · Sấy 2 <b>${pairOf('say2')}</b> <span class="x2-say-rate-legacy">(lô cũ: ${fmtM3(sayRateEntryOf(cur, 'say1', 'Ván').m3)} m³/lần)</span>`;
  }

  // ─── SỐ LIỆU SẤY THEO NGÀY (m³ vào Sấy 1 / Sấy 2 + giờ than hóa) ───
  // Thể tích (m³) của 1 lô nan — lô dữ liệu cũ thiếu volume → tự tính lại
  // từ Dài × Rộng × Dày × số lượng.
  function batchVolumeOf(b) {
    if (!b) return 0;
    const v = Number(b.volume);
    if (Number.isFinite(v) && v > 0) return v;
    return unitVolOf(Number(b.length) || 0, Number(b.width) || 0, Number(b.thickness) || 0) * (Number(b.quantity) || 0);
  }
  // Lô có TỪNG đi qua 1 công đoạn hay không (dựa vào công đoạn hiện tại + mốc
  // stageHistory). Lô tạo THẲNG vào Kho (không qua Sấy 1) sẽ không bị tính nhầm
  // là đã vào Sấy 1; lô dữ liệu cũ chưa có stageHistory thì suy theo thứ tự
  // công đoạn (Sấy 1 → Sấy 2 → Kho → Bào Tinh).
  function batchPassedStage(b, stage) {
    if (!b) return false;
    if (b.stage === stage) return true;
    const hist = Array.isArray(b.stageHistory) ? b.stageHistory.filter(h => h && h.stage) : [];
    if (hist.length) return hist.some(h => h.stage === stage);
    const order = { say1: 0, say2: 1, kho: 2, bao_tinh: 3 };
    return (order[b.stage] || 0) >= (order[stage] || 0);
  }
  // NGÀY vào Sấy 2 THẬT của lô — chỉ khi có khai báo (say2Date hoặc mốc
  // stageHistory 'say2'); lô cũ không có thông tin thì trả '' (KHÔNG lấy ngày
  // tạo lô gán nhầm vào Sấy 2 rồi thổi phồng số liệu).
  function say2EntryDateOf(b) {
    if (!b) return '';
    const d = String(b.say2Date || '').trim();
    if (d) return d;
    const hist = (Array.isArray(b.stageHistory) ? b.stageHistory : []).filter(h => h && h.stage === 'say2' && h.date);
    return hist.length ? String(hist[hist.length - 1].date).trim() : '';
  }
  // ─── GOM LẦN THAN HÓA THEO NGÀY + CÔNG ĐOẠN SẤY ───────────────
  // Nguồn số lần của 1 NHÓM (ngày + công đoạn) — ưu tiên từ trên xuống:
  //   1) Nhập tay "Số lần TH" (state.x2SayTimes['YYYY-MM-DD|say1']) → chia ĐỀU
  //      tổng thể tích nhóm thành đúng N lần.
  //   2) MÃ MẺ trên lô (sayCharges.<say> gắn lúc bấm Lưu — batch-modals.js) →
  //      mỗi mã = 1 LẦN, xếp theo thời điểm lưu tăng dần; mỗi lần liệt kê ĐÚNG
  //      các lô của lượt lưu đó (m³ thật, không chia đều giả).
  //   3) Lô cũ KHÔNG mã mẻ:
  //      • ngày < SAY_NO_AUTO_FROM → tự gộp theo định mức m³/lần (dữ liệu cũ);
  //      • ngày ≥ SAY_NO_AUTO_FROM → gộp thành 1 lần (KHÔNG tự chia m³ nữa).
  // MỐC NGÀY chuyển chế độ: dữ liệu từ ngày này trở đi đếm theo LƯỢT LƯU/điền tay.
  const SAY_NO_AUTO_FROM = '2026-09-28';
  function sayTimesKey(dateVal, stage) {
    return `${String(dateVal || '').trim()}|${stage === 'say2' ? 'say2' : 'say1'}`;
  }
  // Số lần THẬT người dùng đã nhập cho nhóm (0 = chưa nhập → theo lượt lưu/mã mẻ)
  function sayManualTimesOf(dateVal, stage) {
    const v = Number((state.x2SayTimes || {})[sayTimesKey(dateVal, stage)]);
    return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
  }
  // MÃ MẺ than hóa gắn trên lô lúc bấm Lưu (sayCharges.say1 / sayCharges.say2)
  // — 0 = lô cũ không có mã (dữ liệu trước mốc SAY_NO_AUTO_FROM).
  function sayChargeIdOf(b, stage) {
    const v = b && b.sayCharges ? Number(b.sayCharges[stage === 'say2' ? 'say2' : 'say1']) : 0;
    return Number.isFinite(v) && v > 0 ? v : 0;
  }
  // Các lô của 1 nhóm (ngày vào công đoạn + công đoạn) — theo thứ tự trong
  // state.batches (lô mới đứng trước) để việc gộp nhóm ổn định, dễ đối chiếu.
  function sayGroupLots(dateVal, stage) {
    return (state.batches || []).filter(b => {
      if (!b || !batchPassedStage(b, stage)) return false;
      if (!(batchVolumeOf(b) > 0)) return false;
      const d = stage === 'say2' ? say2EntryDateOf(b) : String(b.date || '').trim();
      return d === dateVal;
    }).map(b => ({ batch: b, id: String(b.id || ''), code: b.code || '', location: b.location || '', vol: batchVolumeOf(b), type: sayTypeKeyOf(b.useFor) }));
  }
  // Nhãn của 1 lần: các mã lô (ghi kèm "(một phần)" nếu lô bị chia) + vị trí
  function sayChargeLocationText(charge) {
    return [...new Set((charge.lots || []).map(l => l.location).filter(Boolean))].join(' + ') || '—';
  }
  function sayChargeCodeText(charge) {
    return (charge.lots || []).map(l => `${l.code || '—'}${l.part ? ' (một phần)' : ''}`).join(' + ') || '—';
  }
  // Ô "Thành phần" của 1 lần: Ván - X m³ / Bullig - Y m³ (gọn thay danh sách mã
  // lô — mã lô giữ ở tooltip title của ô để không mất thông tin)
  function sayChargeCompText(c) {
    const parts = [];
    if ((c.volVan || 0) > 1e-9) parts.push(`Ván - ${fmtM3(c.volVan)} m³`);
    if ((c.volBullig || 0) > 1e-9) parts.push(`Bullig - ${fmtM3(c.volBullig)} m³`);
    return parts.length ? parts.join('<br>') : `${fmtM3(c.vol)} m³`;
  }
  // Dựng danh sách LẦN than hóa của 1 nhóm (ngày + công đoạn) — luật ưu tiên xem
  // đầu khối GOM LẦN phía trên (điền tay > mã mẻ > lô cũ gộp m³/lần hoặc 1 lần).
  function sayBuildCharges(dateVal, stage, perCharge) {
    const lots = sayGroupLots(dateVal, stage);
    if (!lots.length) return [];
    const cap = perCharge > 0 ? perCharge : 2;
    const manual = sayManualTimesOf(dateVal, stage);
    const charges = [];
    if (manual > 0) {
      // 1) ĐIỀN TAY: chia ĐỀU tổng thể tích nhóm thành đúng N lần (theo thứ tự
      //    lô, 1 lô có thể nằm ở 2 lần liền kề).
      const each = lots.reduce((s, l) => s + l.vol, 0) / manual;
      for (let i = 0; i < manual; i++) charges.push({ lots: [], vol: 0, part: false });
      let ci = 0, remain = each;
      lots.forEach(l => {
        let left = l.vol;
        while (left > 1e-9 && ci < manual) {
          const take = Math.min(left, remain);
          const part = take < l.vol - 1e-9;
          charges[ci].lots.push({ id: l.id, code: l.code, location: l.location, vol: take, part, type: l.type });
          charges[ci].vol += take;
          if (part) charges[ci].part = true;
          left -= take; remain -= take;
          if (remain <= 1e-9) { ci++; remain = each; }
        }
      });
      charges.forEach(sayChargeEnrich);
      return charges.filter(c => c.vol > 1e-9);
    }
    // 2) MÃ MẺ: mỗi lượt Lưu = 1 lần — gom lô theo mã, xếp thời điểm lưu tăng dần
    //    (Lần 1 = lượt lưu đầu tiên của ngày).
    const byMark = new Map();
    const oldLots = [];
    lots.forEach(l => {
      const mark = sayChargeIdOf(l.batch, stage);
      if (mark) {
        if (!byMark.has(mark)) byMark.set(mark, []);
        byMark.get(mark).push(l);
      } else {
        oldLots.push(l);
      }
    });
    [...byMark.keys()].sort((a, b) => a - b).forEach(mark => {
      charges.push(sayOneChargeFromLots(byMark.get(mark)));
    });
    // 3) Lô cũ KHÔNG có mã mẻ
    if (oldLots.length) {
      if (String(dateVal || '') >= SAY_NO_AUTO_FROM) {
        // Dữ liệu mới nhưng lô không có mã (sửa tay/đường khác) → mặc định 1 LẦN
        charges.push(sayOneChargeFromLots(oldLots));
      } else {
        // Dữ liệu cũ: gộp theo định mức m³/lần
        charges.push(...sayAutoGroupLots(oldLots, cap));
      }
    }
    return charges;
  }
  // Gom 1 nhóm lô thành 1 LẦN than hóa (giữ nguyên m³ thật của từng lô).
  // LOẠI của lần = loại chiếm THỂ TÍCH NHIỀU HƠN (lô cùng lượt Lưu thường cùng
  // loại; điền tay "Số lần TH" có thể chia trộn 2 loại trong 1 lần).
  function sayOneChargeFromLots(group) {
    const c = { lots: [], vol: 0, part: false, volVan: 0, volBullig: 0, useFor: 'van' };
    group.forEach(l => {
      c.lots.push({ id: l.id, code: l.code, location: l.location, vol: l.vol, part: false, type: l.type });
      c.vol += l.vol;
      if (l.type === 'bullig') c.volBullig += l.vol; else c.volVan += l.vol;
    });
    c.useFor = c.volBullig > c.volVan ? 'bullig' : 'van';
    return c;
  }
  // Bổ sung LOẠI + thể tích theo loại cho 1 lần (dùng cho cả nhánh điền tay & lô cũ)
  function sayChargeEnrich(c) {
    c.volVan = 0; c.volBullig = 0;
    (c.lots || []).forEach(l => {
      if (l.type === 'bullig') c.volBullig += l.vol; else c.volVan += l.vol;
    });
    c.useFor = c.volBullig > c.volVan ? 'bullig' : 'van';
    return c;
  }
  // TỰ GỘP các lô thành lần theo định mức m³/lần — CHỈ còn dùng cho DỮ LIỆU CŨ
  // (lô không có mã mẻ và vào sấy trước mốc SAY_NO_AUTO_FROM): gộp lần lượt theo
  // thứ tự lô cho đến khi thêm lô kế sẽ VƯỢT m³/lần thì đóng lần (phần còn lại =
  // lần cuối); lô đơn vượt m³/lần vẫn là 1 lần riêng (lô 5 m³ = 1 lần 5 m³).
  function sayAutoGroupLots(lots, cap) {
    const charges = [];
    let cur = { lots: [], vol: 0, part: false };
    lots.forEach(l => {
      if (cur.vol > 1e-9 && cur.vol + l.vol > cap + 1e-9) {
        charges.push(cur);
        cur = { lots: [], vol: 0, part: false };
      }
      cur.lots.push({ id: l.id, code: l.code, location: l.location, vol: l.vol, part: false, type: l.type });
      cur.vol += l.vol;
    });
    if (cur.vol > 1e-9) charges.push(cur);
    charges.forEach(sayChargeEnrich);
    return charges;
  }

  // NHÃN "LẦN THAN HÓA" trên thẻ Kanban (CHỈ ĐỌC — chỉnh số lần vẫn ở ô "Số lần
  // TH" của dòng nhóm): tính theo mã mẻ sayCharges cho TỪNG công đoạn sấy mà lô
  // đã qua, dùng chung nguồn số sayBuildCharges với bảng thống kê nên luôn khớp:
  //   • Chỉ qua 1 công đoạn → "Lần N/M · Sấy 1" (hoặc "… · Sấy 2") — giữ nguyên
  //     định dạng cũ;
  //   • Qua CẢ Sấy 1 và Sấy 2 → gộp "S1: Lần a/b · S2: Lần c/d";
  //   • Lô cũ không mã mẻ / chưa qua sấy nào → chuỗi rỗng (không hiện chip).
  // Lô có mã mẻ Sấy 1 nhưng sang Sấy 2 bằng đường không có mã vẫn hiện phần
  // Sấy 1 (hồi trước chỉ xét công đoạn gần nhất nên bị bỏ trống).
  function sayBatchChargeLabel(b) {
    if (!b) return '';
    const id = String(b.id || '');
    const parts = [];
    ['say1', 'say2'].forEach(stage => {
      if (!batchPassedStage(b, stage)) return;   // chưa qua công đoạn này
      if (!sayChargeIdOf(b, stage)) return;       // không có mã mẻ → bỏ qua
      const dateVal = stage === 'say2' ? say2EntryDateOf(b) : String(b.date || '').trim();
      if (!dateVal) return;
      const charges = sayBuildCharges(dateVal, stage, sayM3PerCharge(dateVal, stage));
      const idx = charges.findIndex(c => (c.lots || []).some(l => l.id === id));
      if (idx < 0) return;
      parts.push({ stage, text: `Lần ${idx + 1}/${charges.length}` });
    });
    if (!parts.length) return '';
    if (parts.length === 1) {
      const p = parts[0];
      return `${p.text} · ${p.stage === 'say2' ? 'Sấy 2' : 'Sấy 1'}`;
    }
    return parts.map(p => `${p.stage === 'say2' ? 'S2' : 'S1'}: ${p.text}`).join(' · ');
  }

  // Bảng thống kê than hóa: mỗi NGÀY 1 dòng đầu → mỗi NHÓM công đoạn 1 dòng
  // (mang ô nhập "Số lần TH" thật của nhóm) → MỖI LẦN THAN HÓA 1 dòng.
  function sayChargeRows() {
    const days = new Map();
    const dayOf = d => {
      if (!days.has(d)) days.set(d, { date: d, stages: new Set() });
      return days.get(d);
    };
    (state.batches || []).forEach(b => {
      if (!b) return;
      if (!(batchVolumeOf(b) > 0)) return;
      if (batchPassedStage(b, 'say1')) {
        const d1 = String(b.date || '').trim();
        if (d1) dayOf(d1).stages.add('say1');
      }
      if (batchPassedStage(b, 'say2')) {
        const d2 = say2EntryDateOf(b);
        if (d2) dayOf(d2).stages.add('say2');
      }
    });
    return [...days.values()].map(day => {
      // Mỗi công đoạn 1 NHÓM: gộp các lô trong ngày thành các lần than hóa
      const groups = ['say1', 'say2'].filter(st => day.stages.has(st)).map(stage => {
        const lotList = sayGroupLots(day.date, stage);
        // Phút/giờ cần TÍNH THEO TỪNG LẦN theo LOẠI của lần đó (Ván / Bullig khác nhau)
        const charges = sayBuildCharges(day.date, stage, sayM3PerCharge(day.date, stage))
          .map(c => {
            const minutes = sayMinutesPerCharge(day.date, stage, c.useFor === 'bullig' ? 'Bullig' : 'Ván');
            return {
              stage, lots: c.lots, vol: c.vol, useFor: c.useFor,
              volVan: c.volVan || 0, volBullig: c.volBullig || 0,
              locationText: sayChargeLocationText(c),
              codeText: sayChargeCodeText(c),
              minutes, need: minutes / 60
            };
          });
        const manual = sayManualTimesOf(day.date, stage);
        const hasMark = lotList.some(l => sayChargeIdOf(l.batch, stage) > 0);
        // Nguồn số lần: manual (điền tay) > saves (mã mẻ gắn lúc Lưu) > single
        // (ngày mới chưa có lượt lưu → mặc định 1 lần) > auto (dữ liệu cũ gộp m³/lần)
        const mode = manual > 0 ? 'manual'
          : hasMark ? 'saves'
          : (String(day.date || '') >= SAY_NO_AUTO_FROM ? 'single' : 'auto');
        return {
          stage, charges,
          lots: lotList.length,
          vol: charges.reduce((s, c) => s + c.vol, 0),
          count: charges.length,
          manual,
          per: sayM3PerCharge(day.date, stage),
          mode
        };
      });
      const charges = groups.flatMap(g => g.charges);
      // Giờ HC/TC THẬT của ngày (Bảng bố trí vị trí "Than hóa") chia cho các lần
      // theo tỉ lệ PHÚT (mỗi lần tiêu tốn đúng 105' hoặc 50') → cộng lại đúng
      // bằng giờ thật của ngày.
      const live = hrThanHoaAssignmentsOf(day.date);
      const split = live.length ? sumPosHoursSplit(live, day.date) : { hc: 0, tc: 0 };
      const totalMinutes = charges.reduce((s, c) => s + c.minutes, 0);
      charges.forEach((c, i) => {
        const share = totalMinutes > 0 ? c.minutes / totalMinutes : 0;
        c.lan = i + 1;                                   // Lần 1, 2, 3… trong ngày
        c.hc = split.hc * share;
        c.tc = split.tc * share;
        c.hours = c.hc + c.tc;
        c.cap = c.hours > 0 ? c.vol / c.hours : null;     // công suất của lần (m³/h)
      });
      // HIỆU SUẤT của NGÀY = Giờ cần ÷ (Giờ thực tế − Giờ sự cố cho phép)
      const hours = split.hc + split.tc;
      const need = charges.reduce((s, c) => s + c.need, 0);
      const incident = sayIncidentOf(day.date);
      const effBase = hours - incident;
      const eff = (need > 0 && effBase > 0) ? need / effBase : null;
      return {
        date: day.date,
        groups, charges,
        lanCount: charges.length,
        vol: charges.reduce((s, c) => s + c.vol, 0),
        need, hours, incident, eff,
        workers: [...new Set(live.map(a => a.name).filter(Boolean))],
        timeStr: live.map(posTimeStr).join(', '),
        hasAssign: live.length > 0,
        hc: split.hc, tc: split.tc
      };
    }).filter(d => d.lanCount > 0).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  function saveX2SayTimes() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_SAY_TIMES, JSON.stringify(state.x2SayTimes || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    logDataChange(['x2SayTimes']);
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }
  function loadX2SayTimes() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_SAY_TIMES);
    state.x2SayTimes = {};
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      Object.keys(obj).forEach(k => {
        const v = Number(obj[k]);
        if (/^\d{4}-\d{2}-\d{2}\|(say1|say2)$/.test(k) && Number.isFinite(v) && v > 0) state.x2SayTimes[k] = Math.round(v);
      });
    } catch (e) {}
  }
  // Lưu SỐ LẦN THAN HÓA THẬT của 1 NHÓM (ngày + công đoạn) — ô nhập trên bảng.
  // Để trống / 0 → xóa số nhập tay: quay lại tự gộp theo m³/lần (gần 2 m³/lần).
  function setSayGroupTimes(dateVal, stage, value) {
    if (!requireEditPermission()) return false;
    const keyStr = sayTimesKey(dateVal, stage);
    const v = Number(value);
    state.x2SayTimes = state.x2SayTimes || {};
    if (!Number.isFinite(v) || v <= 0) {
      if (state.x2SayTimes[keyStr] == null) return false;
      delete state.x2SayTimes[keyStr];
      const backTxt = String(dateVal || '') >= SAY_NO_AUTO_FROM
        ? 'theo số lượt đã Lưu (mỗi lượt bấm Lưu = 1 lần than hóa)'
        : `tự gộp theo ${fmtM3(sayM3PerCharge(dateVal, stage))} m³/lần (dữ liệu cũ)`;
      showToast(`Ngày ${formatDateDDMMYY(dateVal)} · ${stage === 'say2' ? 'Sấy 2' : 'Sấy 1'}: bỏ số lần nhập tay — ${backTxt}.`, 'info');
    } else {
      state.x2SayTimes[keyStr] = Math.round(v);
      showToast(`Ngày ${formatDateDDMMYY(dateVal)} · ${stage === 'say2' ? 'Sấy 2' : 'Sấy 1'}: ${state.x2SayTimes[keyStr]} lần than hóa.`, 'success');
    }
    saveX2SayTimes();
    renderX2SayStats();
    initLucide();
    return true;
  }

  function loadX2SayIncidents() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_SAY_INCIDENT);
    state.x2SayIncidents = {};
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      Object.keys(obj).forEach(k => {
        const v = Number(obj[k]);
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(v) && v > 0) state.x2SayIncidents[k] = v;
      });
    } catch (e) {}
  }
  function saveX2SayIncidents() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_SAY_INCIDENT, JSON.stringify(state.x2SayIncidents || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    logDataChange(['x2SayIncidents']);
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }
  // Giờ SỰ CỐ CHO PHÉP của 1 ngày (0 = chưa nhập)
  function sayIncidentOf(dateVal) {
    const v = Number((state.x2SayIncidents || {})[String(dateVal || '').trim()]);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }
  // Lưu Giờ sự cố cho phép của 1 NGÀY (ô nhập ở dòng đầu ngày của bảng thống kê).
  // Để trống / 0 → xoá (coi như không có sự cố).
  function setSayIncident(dateVal, value) {
    if (!requireEditPermission()) return false;
    const key = String(dateVal || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const v = Number(value);
    state.x2SayIncidents = state.x2SayIncidents || {};
    if (!Number.isFinite(v) || v <= 0) {
      if (state.x2SayIncidents[key] == null) return false;
      delete state.x2SayIncidents[key];
      showToast(`Ngày ${formatDateDDMMYY(key)}: bỏ giờ sự cố cho phép (coi như 0 giờ).`, 'info');
    } else {
      state.x2SayIncidents[key] = v;
      showToast(`Ngày ${formatDateDDMMYY(key)}: giờ sự cố cho phép ${fmtGio(v)}h.`, 'success');
    }
    saveX2SayIncidents();
    renderX2SayStats();
    initLucide();
    return true;
  }
  // Uỷ nhiệm change cho ô "Sự cố cho phép" (dòng đầu ngày)
  function onSayIncidentChange(e) {
    const t = e && e.target;
    if (!t || typeof t.getAttribute !== 'function') return;
    const dateVal = t.getAttribute('data-say-incident');
    if (!dateVal) return;
    setSayIncident(dateVal, t.value);
  }

  // ─── GIỜ SỰ CỐ CHO PHÉP CỦA 7 THẺ CÔNG ĐOẠN XƯỞNG 2 ────────────
  // state.x2StageIncidents = { '<cardId>|<YYYY-MM-DD>': giờ } — ô nhập nằm trên
  // ĐẦU THẺ NGÀN của từng thẻ; giờ bị TRỪ khỏi giờ làm khi tính Công suất →
  // Hiệu suất (xem utils.stageEffHours). cardId ∈ cut/boong/baotho/chonnan/
  // baotinh/bullig/epvan.
  function loadX2StageIncidents() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_STAGE_INCIDENT);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        state.x2StageIncidents = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
      } catch (e) { state.x2StageIncidents = {}; }
    } else {
      state.x2StageIncidents = {};
    }
  }
  function saveX2StageIncidents() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_STAGE_INCIDENT, JSON.stringify(state.x2StageIncidents || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    logDataChange(['x2StageIncidents']);
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }
  // Lưu giờ sự cố của 1 (thẻ, ngày) — để trống / 0 → xoá. Trả về true nếu có đổi.
  function setStageIncident(cardId, dateVal, value) {
    if (!requireEditPermission()) return false;
    const cid = String(cardId || '').trim();
    const key = String(dateVal || '').trim();
    if (!cid || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const k = stageIncidentKey(cid, key);
    const v = Number(value);
    state.x2StageIncidents = state.x2StageIncidents || {};
    if (!Number.isFinite(v) || v <= 0) {
      if (state.x2StageIncidents[k] == null) return false;
      delete state.x2StageIncidents[k];
      showToast(`Ngày ${formatDateDDMMYY(key)}: bỏ giờ sự cố cho phép (coi như 0 giờ).`, 'info');
    } else {
      state.x2StageIncidents[k] = v;
      showToast(`Ngày ${formatDateDDMMYY(key)}: giờ sự cố cho phép ${fmtGio(v)}h.`, 'success');
    }
    saveX2StageIncidents();
    return true;
  }
  // Uỷ nhiệm change cho ô "Sự cố cho phép" trên đầu thẻ ngày (data-x2-incident)
  function onStageIncidentChange(e) {
    const t = e && e.target;
    if (!t || typeof t.getAttribute !== 'function') return;
    const cardId = t.getAttribute('data-x2-incident');
    const dateVal = t.getAttribute('data-x2-incident-date');
    if (!cardId || !dateVal) return false;
    if (!setStageIncident(cardId, dateVal, t.value)) return false;
    // Vẽ lại THẺ NGÀN của đúng công đoạn để Hiệu suất cập nhật ngay
    if (cardId === 'boluong') renderXuong2BoluongTable();
    if (cardId === 'cut') renderXuong2CutTable();
    else if (cardId === 'boong') renderX2BoOngTable();
    else if (cardId === 'baotho') renderX2BaoThoTable();
    else if (cardId === 'chonnan') renderX2ChonNanTable();
    else if (cardId === 'baotinh') renderX2BaoTinhTable();
    else if (cardId === 'bullig') renderX2BulligTable();
    else if (cardId === 'epvan') renderX2EpVanCard();
    // XƯỞNG 1 — 3 công đoạn (khóa sự cố = id công đoạn; setStageIncident không whitelist)
    else if (cardId === 'x1catong') renderX1CatOngTable();
    else if (cardId === 'x1saysinh') renderX1SaySinhTable();
    else if (cardId === 'x1boc') renderX1BocTable();
    initLucide();
    return true;
  }

  // ─── BẢNG THỐNG KÊ THAN HÓA + SẤY THEO TỪNG LẦN THAN HÓA ──────
  // Mỗi NGÀY 1 DÒNG ĐẦU (Ngày · Người làm vị trí "Than hóa" · tổng lần · m³ ·
  // giờ cần · HC/TC) → mỗi NHÓM công đoạn 1 DÒNG NHÓM (Sấy 1/Sấy 2 · số lô · m³ ·
  // ô nhập "Số lần TH" thật của nhóm) → MỖI LẦN THAN HÓA 1 dòng:
  //   Lần N | Vị Trí | Thành phần (Ván/Bullig m³) | m³ | Phút | Giờ Cần | Giờ HC | Giờ TC
  function renderX2SayStats() {
    applyX2SayFrame();
    applyX2KanbanCollapsed();
    renderX2SayRateChip();
    renderKilnBoard(); // BẢNG ĐIỀU KHIỂN LÒ SẤY (khung mặc định — luôn vẽ dữ liệu mới nhất)
    const tbody = document.getElementById('x2-say-day-rows');
    const countEl = document.getElementById('x2-say-stats-count');
    if (!tbody) return;
    const all = sayChargeRows();
    const rows = all.slice(0, SAY_STATS_MAX_DAYS);
    if (countEl) {
      const lan = all.reduce((s, r) => s + r.lanCount, 0);
      const vol = all.reduce((s, r) => s + r.vol, 0);
      const need = all.reduce((s, r) => s + r.need, 0);
      const hc = all.reduce((s, r) => s + r.hc, 0);
      const tc = all.reduce((s, r) => s + r.tc, 0);
      countEl.textContent = all.length
        ? `${all.length} ngày · ${lan} lần than hóa · ${fmtM3(vol)} m³ · Giờ cần ${fmtGio(need)}h · HC ${fmtGio(hc)}h · TC ${fmtGio(tc)}h`
        : 'Chưa có lô nan nào vào Sấy 1 / Sấy 2';
    }
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="x2-say-empty">Chưa có số liệu — thêm lô ở Sấy 1 (nguồn: Chọn Nan Thô) hoặc chuyển lô sang Sấy 2 (nguồn: lô ở Kho) thì bảng tự cập nhật.</td></tr>`;
      return;
    }
    const dash = '<span class="x2-say-dash" title="Ngày này chưa có bố trí vị trí \'Than hóa\' ở Bảng bố trí Nhân Sự — chưa có giờ HC/TC">—</span>';
    const rowHtml = c => {
      return `<tr class="x2-say-row x2-say-row-${c.stage}">
        <td class="x2-say-lan"><span class="x2-say-lan-badge">Lần ${c.lan}</span></td>
        <td class="x2-say-loc">${escapeHTML(c.locationText || '—')}</td>
        <td class="x2-say-code" title="Mã lô: ${escapeHTML(c.codeText || '—')}">${sayChargeCompText(c)}</td>
        <td class="x2-say-vol">${fmtM3(c.vol)}</td>
        <td class="x2-say-min">${fmtPhut(c.minutes)}'</td>
        <td class="x2-say-need" title="1 lần than hóa = ${fmtPhut(c.minutes)} phút = ${fmtGio(c.need)} giờ">${fmtGio(c.need)} h</td>
        <td>${c.hours > 0 ? fmtGio(c.hc) : dash}</td>
        <td>${c.hours > 0 ? fmtGio(c.tc) : dash}</td>
      </tr>`;
    };
    // Dòng NHÓM (ngày + công đoạn): tổng lô/m³ + ô nhập "Số lần TH" THẬT của nhóm.
    // ĐÃ BỎ ghi chú "Tự gộp theo … m³/lần" (gây hiểu nhầm) — quy đổi m³/lần giờ
    // chỉ còn áp cho dữ liệu cũ; thay bằng CHIP NGUỒN số lần.
    const groupHtml = (day, g) => {
      const label = g.stage === 'say2' ? 'Sấy 2' : 'Sấy 1';
      const auto = g.count;
      const modeTxt = g.manual
        ? `Nhập tay ${g.manual} lần`
        : g.mode === 'saves' ? 'Theo lượt Lưu'
        : g.mode === 'single' ? '1 lần (chưa có lượt lưu)'
        : 'Dữ liệu cũ';
      const autoTitle = String(day.date || '') >= SAY_NO_AUTO_FROM
        ? 'để trống = theo số lượt đã Lưu (mỗi lượt bấm Lưu của "Thêm Lô Sấy Mới" = 1 lần than hóa); điền số lần THẬT vào ô này để ghi đè'
        : `để trống = tự gộp các lô cũ theo ${fmtM3(g.per)} m³/lần (dữ liệu trước ${formatDateDDMMYY(SAY_NO_AUTO_FROM)})`;
      return `<tr class="x2-say-group-head x2-say-row-${g.stage}">
        <td class="x2-say-lan"><span class="x2-say-lan-badge">${label}</span></td>
        <td class="x2-say-loc">${g.lots} lô</td>
        <td class="x2-say-code">${fmtM3(g.vol)} m³</td>
        <td class="x2-say-times-cell" colspan="3">
          <span class="x2-say-group-lbl">Số lần TH:</span>
          <input type="number" class="x2-say-times-input${g.manual ? ' manual' : ''}" data-say-times="${escapeHTML(day.date)}" data-say-stage="${g.stage}" min="1" step="1" value="${g.manual || ''}" placeholder="${auto}" title="Số lần than hóa THẬT của ${label} ngày ${escapeHTML(formatDateDDMMYY(day.date))} — ${autoTitle}">
          <span class="x2-say-times-auto">× ${auto} lần</span>
          <span class="x2-say-mode-chip mode-${g.mode}">${modeTxt}</span>
        </td>
        <td colspan="2"></td>
      </tr>`;
    };
    tbody.innerHTML = rows.map(r => {
      const effTxt = r.eff == null ? dash : `${fmtNum(r.eff * 100, 0)}%`;
      const effCls = r.eff == null ? '' : (r.eff >= 1 ? ' x2-say-eff-good' : ' x2-say-eff-low');
      const needTxt = `Giờ cần ${fmtGio(r.need)}h · Thực tế ${r.hasAssign ? fmtGio(r.hours) + 'h' : '—'}`;
      const workers = r.workers.length ? escapeHTML(r.workers.join(', ')) : 'chưa bố trí vị trí "Than hóa"';
      const head = `<tr class="x2-say-day-head"><td colspan="8">
        <span class="x2-say-day-date"><i data-lucide="calendar-days"></i> ${escapeHTML(formatDateDDMMYY(r.date))}</span>
        <span class="x2-say-day-workers" title="${escapeHTML(r.timeStr || '')}">${workers}</span>
        <span class="x2-say-day-inc">
          <label>Sự cố cho phép:</label>
          <input type="number" class="x2-say-inc-input" data-say-incident="${escapeHTML(r.date)}" min="0" step="any" value="${r.incident > 0 ? r.incident : ''}" placeholder="0" title="Giờ SỰ CỐ CHO PHÉP của ngày (giờ kết thúc dự kiến bị đẩy lùi do máy hỏng/thiếu nan…) — Hiệu suất = Giờ cần ÷ (Giờ thực tế − Giờ sự cố cho phép)">
          <span class="x2-say-inc-unit">h</span>
        </span>
        <span class="x2-say-eff-badge${effCls}" title="${needTxt}${r.incident > 0 ? ' · Sự cố ' + fmtGio(r.incident) + 'h' : ''} → Hiệu suất = Giờ cần ÷ (Giờ thực tế − Sự cố)">Hiệu suất ${effTxt}</span>
        <span class="x2-say-day-sum">${r.lanCount} lần · ${fmtM3(r.vol)} m³ · Cần ${fmtGio(r.need)}h · HC ${r.hasAssign ? fmtGio(r.hc) + 'h' : '—'} · TC ${r.hasAssign ? fmtGio(r.tc) + 'h' : '—'}</span>
      </td></tr>`;
      const body = r.groups.map(g => groupHtml(r, g) + (g.charges.length ? g.charges.map(rowHtml).join('') : '')).join('');
      return head + body;
    }).join('');
    initLucide();
  }

  // Ô "Số lần TH" của NHÓM (ngày + công đoạn): gõ số lần than hóa THẬT rồi
  // Enter / rời ô → lưu ngay (uỷ nhiệm sự kiện change trên tbody).
  function onSayTimesChange(e) {
    const t = e && e.target;
    if (!t || typeof t.getAttribute !== 'function') return;
    const dateVal = t.getAttribute('data-say-times');
    if (!dateVal) return;
    setSayGroupTimes(dateVal, t.getAttribute('data-say-stage') || 'say1', t.value);
  }



  // Số ngày gần nhất hiện trên bảng thống kê (bảng quá dài sẽ khó xem)
  const SAY_STATS_MAX_DAYS = 30;

  // (Bảng thống kê nay vẽ theo TỪNG LẦN than hóa — xem renderX2SayStats phía trên)

  // ─── THU GỌN BẢNG KANBAN LÔ NAN (thẻ Than Hóa + Sấy) ─────────
  // Bảng Kanban rất dài → cho thu gọn: khi thu gọn vẫn thấy thanh công cụ
  // (Thêm Lô Sấy Mới / Chuyển Kho), dòng tổng quan số lô từng công đoạn và bảng
  // thống kê sấy; trạng thái nhớ theo máy (localStorage).
  function kanbanCollapsedSaved() {
    try { return localStorage.getItem(STORAGE_KEY_X2_KANBAN_COLLAPSED) === '1'; } catch (e) { return false; }
  }
  // Dòng tổng quan: Sấy 1 / Sấy 2 / Kho — số lô · m³ · số thanh (hiện khi thu gọn)
  function renderX2KanbanSummary() {
    const el = document.getElementById('x2-kanban-summary');
    if (!el) return;
    const label = { say1: 'Sấy 1', say2: 'Sấy 2', kho: 'Kho' };
    const part = stage => {
      const list = (state.batches || []).filter(b => b && b.stage === stage);
      const vol = list.reduce((s, b) => s + batchVolumeOf(b), 0);
      const qty = list.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
      return `<span class="x2-kanban-sum-item"><b>${label[stage]}</b>: ${list.length} lô · ${fmtM3(vol)} m³ · ${qty.toLocaleString('vi-VN')} thanh</span>`;
    };
    el.innerHTML = ['say1', 'say2', 'kho'].map(part).join('');
  }
  // Áp trạng thái thu gọn đã lưu (gọi mỗi lần vẽ thẻ)
  function applyX2KanbanCollapsed() {
    const card = document.getElementById('x2-than-hoa-card');
    if (!card) return;
    const collapsed = kanbanCollapsedSaved();
    card.classList.toggle('kanban-board-collapsed', collapsed);
    const label = document.getElementById('x2-kanban-toggle-label');
    if (label) label.textContent = collapsed ? 'Mở bảng lô' : 'Thu gọn bảng lô';
    renderX2KanbanSummary();
  }
  function toggleX2KanbanBoard() {
    const card = document.getElementById('x2-than-hoa-card');
    if (!card) return;
    const next = !card.classList.contains('kanban-board-collapsed');
    card.classList.toggle('kanban-board-collapsed', next);
    try { localStorage.setItem(STORAGE_KEY_X2_KANBAN_COLLAPSED, next ? '1' : '0'); } catch (e) {}
    const label = document.getElementById('x2-kanban-toggle-label');
    if (label) label.textContent = next ? 'Mở bảng lô' : 'Thu gọn bảng lô';
    renderX2KanbanSummary();
    initLucide();
  }

  // ─── KHUNG THẺ THAN HÓA + SẤY: BẢNG ĐIỀU KHIỂN ↔ BẢNG DỮ LIỆU ──
  // Bảng điều khiển lò sấy (2 hàng thẻ icon — js/kiln.js) là khung MẶC ĐỊNH;
  // bấm tab "Bảng Dữ Liệu" mới thấy thống kê than hóa + Kanban lô nan như cũ.
  // Khung đang xem nhớ theo máy (localStorage — giống thu gọn bảng Kanban).
  function sayFrameSaved() {
    try { return localStorage.getItem(STORAGE_KEY_X2_SAY_FRAME) === 'data' ? 'data' : 'ctrl'; }
    catch (e) { return 'ctrl'; }
  }
  // Áp khung đã lưu (gọi mỗi lần vẽ thẻ — ẩn/hiện 2 khung + 2 nút tab)
  function applyX2SayFrame() {
    const card = document.getElementById('x2-than-hoa-card');
    if (!card) return;
    const frame = sayFrameSaved();
    card.classList.toggle('x2-say-frame-data', frame === 'data');
    const ctrl = document.getElementById('x2-say-frame-ctrl');
    const data = document.getElementById('x2-say-frame-data');
    if (ctrl) ctrl.hidden = frame !== 'ctrl';
    if (data) data.hidden = frame !== 'data';
    const tCtrl = document.getElementById('x2-say-tab-ctrl');
    const tData = document.getElementById('x2-say-tab-data');
    if (tCtrl) {
      tCtrl.classList.toggle('active', frame === 'ctrl');
      tCtrl.setAttribute('aria-selected', frame === 'ctrl' ? 'true' : 'false');
    }
    if (tData) {
      tData.classList.toggle('active', frame === 'data');
      tData.setAttribute('aria-selected', frame === 'data' ? 'true' : 'false');
    }
  }
  function switchX2SayFrame(frame) {
    try { localStorage.setItem(STORAGE_KEY_X2_SAY_FRAME, frame === 'data' ? 'data' : 'ctrl'); } catch (e) {}
    applyX2SayFrame();
    if (frame === 'ctrl') renderKilnBoard(); // đang mở khung điều khiển → vẽ lại bảng lò
    initLucide();
  }

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
    if (!requireRatePermission()) return;
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
  // Snapshot của lượt BỐC LUỒNG (người bốc + giờ bốc + số giờ tách HC/TC)
  function hrBoluongSnapshot(dateVal) {
    return workerSnapOf(hrPositionSnapshot(dateVal, hrBoluongAssignmentsOf(dateVal)));
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
    // Thẻ "Bốc Luồng": TỒN LUỒNG CÂY CHƯA BỐC — trả lời "còn bao nhiêu phải bốc"
    if (cardId === 'x2-bo-luong-card') {
      const pending = boluongPendingInputs();
      if (!pending.length) return 'Hết tồn';
      const totalW = pending.reduce((s, r) => s + boluongRemainingOf(r), 0);
      return `Tồn ${fmtKg(totalW)} kg`;
    }
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
      const ok = list.reduce((s, r) => s + baoTinhQtyOkOf(r), 0);
      return `${list.length} lượt · ${fmtThanh(ok)} thanh`;
    }
    // Thẻ "Bullig": số lượt (Gia công + Chọn thanh) + tổng thanh ĐẠT đã chọn
    if (cardId === 'x2-bullig-card') {
      const list = state.xuong2BulligRecords || [];
      if (!list.length) return 'Chưa ghi';
      const ok = list.filter(r => r.kind === 'ct').reduce((s, r) => s + (Number(r.qtyOk) || 0), 0);
      return `${list.length} lượt · ${fmtThanh(ok)} thanh`;
    }
    // ── XƯỞNG 1: 8 công đoạn (chip = TỒN CHỜ XỬ LÝ) ──
    if (cardId.startsWith('x1-')) {
      const t = x1CardCountText(cardId);
      return t === '–' ? (X2_CARD_DEFS[cardId] && X2_CARD_DEFS[cardId].soon ? 'Sắp có' : '–') : t;
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
    // Thẻ "Kho Nan": tồn kho thực (thanh) — phiếu xuất đã duyệt là số chính thức
    if (cardId === 'x2-kho-card') {
      const s = khoStockSummary();
      return s.remainingThanh > 0 ? `Tồn ${fmtThanh(Math.round(s.remainingThanh))} thanh` : 'Hết tồn';
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

  // ─── CÔNG TẮC CHUYỂN XƯỞNG (tab Công Đoạn SX) ─────────────────
  // 2 khối thẻ trong tab: #ws-x2-block (13 thẻ Xưởng 2) ↔ #ws-x1-block
  // (8 thẻ Xưởng 1). Pop-up thẻ chi tiết dùng CHUNG #x2-detail-overlay nên
  // không cần overlay mới. Trạng thái nhớ theo MÁY (thuần UI — không mây/backup).
  const STAGE_WS_LABELS = { x1: 'Xưởng 1', x2: 'Xưởng 2' };

  function loadStageWs() {
    try {
      const v = localStorage.getItem(STORAGE_KEY_STAGE_WS);
      state.stageWs = (v === 'x1') ? 'x1' : 'x2';
    } catch (e) { state.stageWs = 'x2'; }
    if (state.stageWs !== 'x1' && state.stageWs !== 'x2') state.stageWs = 'x2';
  }

  function saveStageWs() {
    try { localStorage.setItem(STORAGE_KEY_STAGE_WS, state.stageWs); } catch (e) {}
  }

  // Đổi/áp trạng thái lên DOM — gọi lúc boot, khi bấm nút và sau khi render thẻ
  function applyStageWsDom() {
    const ws = state.stageWs === 'x1' ? 'x1' : 'x2';
    const set = (id, on) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (on) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    };
    set('ws-x2-block', ws === 'x2');
    set('ws-x1-block', ws === 'x1');
    // Nút nào đang chọn → aria-selected + class active (CSS tô màu)
    ['x2', 'x1'].forEach(k => {
      const btn = document.getElementById('stage-ws-' + k);
      if (!btn) return;
      const on = (k === ws);
      btn.classList.toggle('stage-ws-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const hint = document.getElementById('stage-ws-hint');
    if (hint) {
      hint.textContent = ws === 'x1'
        ? '8 công đoạn · Vầu/nứa — nguồn liệu ở tab Nguyên Liệu (Xưởng 1)'
        : '13 vị trí · nan tre — nguồn liệu ở tab Nguyên Liệu (Xưởng 2)';
    }
  }

  // Bấm nút: đổi xưởng + đóng pop-up đang mở (thẻ thuộc xưởng khác → đừng treo)
  function setStageWs(ws) {
    const next = ws === 'x1' ? 'x1' : 'x2';
    if (state.stageWs === next) return;
    if (openX2Card) x2CloseOpenCard(); // trả thẻ về stack trước khi ẩn khối
    state.stageWs = next;
    saveStageWs();
    applyStageWsDom();
    // Thẻ mini của xưởng KHÁC không được giữ class "đang mở"
    syncX2MiniActive();
    initLucide();
  }

  function toggleStageWs() { setStageWs(state.stageWs === 'x1' ? 'x2' : 'x1'); }

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
    if (cardId === 'x2-bo-luong-card') renderXuong2BoluongCard();
    if (cardId === 'x2-cut-card') renderXuong2CutCard();
    if (cardId === 'x2-bo-ong-card') renderX2BoOngCard();
    if (cardId === 'x2-bao-tho-card') renderX2BaoThoCard();
    if (cardId === 'x2-chon-nan-tho-card') renderX2ChonNanCard();
    if (cardId === 'x2-than-hoa-card') renderX2SayStats(); // bảng thống kê Sấy 1/Sấy 2 theo ngày
    if (cardId === 'x2-kho-card') renderX2KhoCard(); // Kho Nan: tồn · phiếu kho · sổ nhập/xuất
    if (cardId === 'x2-bao-tinh-card') renderX2BaoTinhCard();
    if (cardId === 'x2-bullig-card') renderX2BulligCard();
    if (cardId === 'x2-ep-van-card') renderX2EpVanCard();
    // ── XƯỞNG 1 (8 công đoạn — tất cả đã có chức năng) ──
    renderX1CardOf(cardId);
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
    // Đóng hết dropdown nổi trước khi trả thẻ về ngăn xếp (tránh node mồ côi)
    x2FloatHideAll();
    state.x2BulligLotOpen = false; // đừng tự mở lại danh sách lô khi mở lại thẻ
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
      // Giờ SỰ CỐ CHO PHÉP (nhập trên đầu thẻ) được TRỪ khỏi giờ làm khi tính
      // CÔNG SUẤT → HIỆU SUẤT của ngày.
      const hoursEff = stageEffHours('cut', date, hours);
      const incH = stageIncidentOf('cut', date);
      const cap = hoursEff > 0 ? (totalIn / hoursEff) : null; // Công suất thực tế (kg/h)
      const rate = capRateOf(date); // Công suất định mức của tháng (kg/h)
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null; // Hiệu suất (%)
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ cắt / giờ sự cố ≥ giờ làm, hoặc chưa đặt Định mức công suất cho tháng này)'
        : `Hiệu suất = Công suất thực tế (${fmtKg(cap)} kg/h = ${fmtKg(totalIn)} kg ÷ ${fmtRatio(hoursEff)} giờ${incH > 0 ? ` [đã trừ ${fmtGio(incH)}h sự cố]` : ''}) ÷ Công suất định mức tháng ${Number(String(date).slice(5))} (${fmtKg(rate)} kg/h)`;
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
            <span class="x2-day-cap" title="Công suất thực tế = Tổng KL đầu vào (${fmtKg(totalIn)} kg) ÷ giờ làm việc hiệu dụng (${fmtRatio(hoursEff)} h${incH > 0 ? ` — đã TRỪ ${fmtGio(incH)}h sự cố cho phép` : ''})">Công suất thực tế: <strong>${cap != null ? `${fmtKg(cap)} kg/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
            ${stageIncidentInputHtml('cut', date)}
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

  // ═════════════════════════════════════════════════════════════
  // VỊ TRÍ: BỐC LUỒNG — Xưởng 2 (thẻ launcher tab Công Đoạn)
  // ═════════════════════════════════════════════════════════════
  // Nguồn ĐẦU VÀO = lô nguyên liệu "Luồng cây..." ở tab Nguyên Liệu
  // (state.materialRecords — khớp MỀM chữ "luồng cây" trong Loại NL).
  //   • Mỗi lượt = 1 lô + KHỐI LƯỢNG THỰC TẾ bốc được (kg);
  //   • Tồn lô = KL đầu vào − Σ khối lượng ĐÃ BỐC → bốc HẾT thì lô TỰ ẨN
  //     khỏi ô chọn (đang sửa lượt cũ vẫn thấy đúng lô của lượt đó);
  //   • NGƯỜI BỐC + GIỜ BỐC tự động từ Bảng bố trí Nhân Sự (vị trí chứa
  //     "bốc luồng" — Xưởng 2, đúng ngày; giờ tách HC/TC theo cửa sổ ca);
  //   • ĐỊNH MỨC CÔNG SUẤT BỐC LUỒNG theo THÁNG (kg/h) → Hiệu suất
  //     = Công suất thực tế ÷ Định mức.
  // Dữ liệu: state.xuong2BoluongRecords (localStorage + file + mây, tombstone).

  // Loại NL có chứa "Luồng cây" (bỏ dấu, không phân biệt hoa/thường)
  function boluongIsLuongCay(type) {
    return normPosName(type).includes('luong cay');
  }
  // Tất cả lô "Luồng cây..." — mới nhất lên đầu
  function boluongMaterialInputs() {
    return [...(state.materialRecords || [])]
      .filter(r => boluongIsLuongCay(r.type))
      .sort((a, b) => {
        if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }
  // Tổng khối lượng ĐÃ BỐC của 1 lô — excludeId = bỏ qua 1 lượt (đang SỬA:
  // phần của lượt đó được trả lại để người dùng nhập lại)
  function boluongUsedOf(materialId, excludeId) {
    if (!materialId) return 0;
    return (state.xuong2BoluongRecords || [])
      .filter(r => r.materialId === materialId && r.id !== excludeId)
      .reduce((s, r) => s + (Number(r.qty) || 0), 0);
  }
  // Phần CÒN LẠI của lô (kg) — nguồn ẩn lô đã bốc hết + chặn nhập vượt
  function boluongRemainingOf(mat, excludeId) {
    if (!mat) return 0;
    return Math.max(0, materialInputWeightOf(mat) - boluongUsedOf(mat.id, excludeId));
  }
  // Các lô "Luồng cây..." CÒN khối lượng chưa bốc
  function boluongPendingInputs() {
    return boluongMaterialInputs().filter(r => boluongRemainingOf(r) > 0);
  }

  // ─── NẠP / LƯU DỮ LIỆU BỐC LUỒNG ──────────────────────────────
  function loadXuong2Boluong() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG2_BOLUONG);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.xuong2BoluongRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.xuong2BoluongRecords = []; }
    } else {
      state.xuong2BoluongRecords = [];
    }
  }

  function saveXuong2Boluong() {
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_BOLUONG, JSON.stringify(state.xuong2BoluongRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    logDataChange(['xuong2BoluongRecords']); // ghi lịch sử sửa đổi
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ═══════════════════════════════════════════════════════════
  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT BỐC LUỒNG (link SỐNG tới lô NL) ──
  // Ưu tiên số liệu hiện tại của lô nguyên liệu; lô đã bị xóa → dùng số liệu
  // đã lưu (snapshot) khi ghi nhận.
  function boluongDisplay(r) {
    const mat = (state.materialRecords || []).find(m => m.id === r.materialId) || null;
    const inputWeight = mat ? materialInputWeightOf(mat) : (Number(r.inputWeight) || 0);
    const qty = Number(r.qty) || 0;
    const lotUsed = boluongUsedOf(r.materialId);
    // Người bốc + giờ bốc: SỐNG từ Bảng bố trí Nhân Sự theo ngày; mất bố trí → snapshot
    const live = hrBoluongAssignmentsOf(r.date || '');
    const workerRows = live.length
      ? live.map(a => ({ name: a.name, time: posTimeStr(a) }))
      : String(r.worker || '').split(',').map(s => s.trim()).filter(Boolean)
          .map((name, i) => ({ name, time: String(r.workTime || '').split(',').map(s => s.trim())[i] || '' }));
    // Giờ bốc: SỐNG từ Bảng bố trí (tách HC/TC theo cửa sổ ca); mất bố trí → snapshot
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
      materialType: mat ? (mat.type || '') : (r.materialType || ''),
      supplier: mat ? (mat.supplier || '') : (r.supplier || ''),
      supplierCode: mat ? supplierCodeOf(mat.supplier) : supplierCodeOf(r.supplier || ''),
      inputWeight,
      qty,
      lotUsed,
      lotRest: Math.max(0, inputWeight - lotUsed),
      workerRows,
      workHours,
      workHoursHC,
      workHoursTC
    };
  }

  // ─── TỒN LUỒNG CÂY CHỜ BỐC (thanh gọn TRÊN CÙNG thẻ) ──────────
  function renderX2BoluongStockBar() {
    const bar = document.getElementById('x2-blg-stock-bar');
    if (!bar) return;
    const pending = boluongPendingInputs();
    const totalW = pending.reduce((s, r) => s + boluongRemainingOf(r), 0);
    if (!pending.length) {
      bar.innerHTML = `<span class="x2-stock-title" title="Tất cả lô Luồng cây đã bốc hết khối lượng"><i data-lucide="check-circle-2"></i> Tồn chờ bốc: <strong>Hết tồn</strong></span>`;
    } else {
      bar.innerHTML = `<span class="x2-stock-title" title="Tổng khối lượng CÒN LẠI của các lô Luồng cây chưa bốc hết (chi tiết từng lô ở ô chọn trong form)"><i data-lucide="boxes"></i> Tồn chờ bốc: <strong>${pending.length} lô · ${fmtKg(totalW)} kg</strong></span>`;
    }
    initLucide();
  }

  // ─── FORM GHI NHẬN LƯỢT BỐC LUỒNG ─────────────────────────────
  // Đổ danh sách lô "Luồng cây..." CÒN khối lượng vào ô chọn — mỗi lô hiện
  // PHẦN CÒN LẠI. Lô bốc 1 phần vẫn nằm trong danh sách cho tới khi bốc hết;
  // đang SỬA 1 lượt → vẫn giữ lại đúng lô của lượt đó.
  function fillXuong2BoluongOptions() {
    const sel = document.getElementById('x2-blg-material');
    if (!sel) return;
    const editing = state.x2BoluongEditId
      ? (state.xuong2BoluongRecords || []).find(r => r.id === state.x2BoluongEditId)
      : null;
    const excl = editing ? editing.id : null;
    const mats = boluongMaterialInputs()
      .filter(m => boluongRemainingOf(m, excl) > 0 || (editing && m.id === editing.materialId));
    let html = mats.map(m => {
      const w = materialInputWeightOf(m);
      const rest = boluongRemainingOf(m, excl);
      return `<option value="${escapeHTML(m.id)}">${escapeHTML(m.type || 'Nguyên liệu')} · NCC ${escapeHTML(m.supplier || '—')} · ${formatDateDDMMYY(m.date)} · còn ${fmtKg(rest)} / ${fmtKg(w)} kg</option>`;
    }).join('');
    if (!html) html = `<option value="">— Hết lô "Luồng cây" chờ bốc (mọi lô đã bốc hết khối lượng) —</option>`;
    sel.innerHTML = html;
    updateXuong2BoluongLinked();
  }

  // Ô chọn lô đổi / đang sửa: mặc định Ngày bốc theo ngày nhập nguyên liệu (ghi mới)
  function updateXuong2BoluongLinked() {
    const sel = document.getElementById('x2-blg-material');
    const mat = (state.materialRecords || []).find(r => r.id === (sel ? sel.value : '')) || null;
    if (!state.x2BoluongEditId && mat) {
      const d = document.getElementById('x2-blg-date');
      if (d && !d.value) d.value = mat.date || todayISO();
    }
  }

  // Form về trạng thái "ghi mới" (sau Lưu / nút Làm Mới Form)
  function resetXuong2BoluongForm() {
    state.x2BoluongEditId = null;
    const qty = document.getElementById('x2-blg-qty');
    if (qty) qty.value = '';
    const d = document.getElementById('x2-blg-date');
    if (d) d.value = '';
    fillXuong2BoluongOptions();
    syncX2BoluongEditBanner();
  }

  function syncX2BoluongEditBanner() {
    const banner = document.getElementById('x2-blg-edit-banner');
    if (!banner) return;
    const txt = document.getElementById('x2-blg-edit-text');
    if (state.x2BoluongEditId) {
      const rec = (state.xuong2BoluongRecords || []).find(r => r.id === state.x2BoluongEditId);
      txt.textContent = rec
        ? `Đang sửa lượt bốc luồng ngày ${formatDateDDMMYY(rec.date)} — bấm "Lưu Lượt Bốc Luồng" hoặc "Làm Mới Form" để thoát.`
        : 'Đang sửa lượt bốc luồng.';
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  // ─── LƯU FORM (THÊM / SỬA) ─────────────────────────────────────
  function handleXuong2BoluongSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x2-blg-material');
    const materialId = sel ? sel.value : '';
    const mat = (state.materialRecords || []).find(r => r.id === materialId) || null;
    if (!mat) { showToast('Hãy chọn lô nguyên liệu "Luồng cây..." làm Đầu vào!', 'error'); return; }
    if (!boluongIsLuongCay(mat.type)) { showToast('Đầu vào phải là lô nguyên liệu có chữ "Luồng cây"!', 'error'); return; }

    const dateEl = document.getElementById('x2-blg-date');
    const dateVal = (dateEl && dateEl.value) || '';
    if (!dateVal) { showToast('Ngày bốc không được để trống!', 'error'); return; }

    const qty = Number((document.getElementById('x2-blg-qty') || {}).value) || 0;
    if (!(qty > 0)) { showToast('Khối lượng thực tế phải là số lớn hơn 0 kg!', 'error'); return; }
    // CHẶN VƯỢT phần còn lại của lô (đang sửa thì phần của lượt đó được trả lại)
    const excl = state.x2BoluongEditId || null;
    const rest = boluongRemainingOf(mat, excl);
    if (qty > rest + 1e-9) {
      showToast(`Khối lượng thực tế ${fmtKg(qty)} kg vượt phần còn lại ${fmtKg(rest)} kg của lô!`, 'error');
      return;
    }

    // NGƯỜI BỐC + GIỜ BỐC: TỰ ĐỘNG từ Bảng bố trí Nhân Sự (vị trí "bốc luồng" —
    // Xưởng 2, đúng ngày bốc) — không điền tay; lưu snapshot phòng khi bố trí bị xóa
    const snap = hrBoluongSnapshot(dateVal);

    // TỰ ĐỘNG LINK: snapshot nhà cung cấp / mã số / KL đầu vào từ lần nhập NL
    const payload = {
      materialId,
      materialType: mat.type || '',
      supplier: mat.supplier || '',
      code: materialCodeOf(mat),
      inputWeight: materialInputWeightOf(mat),
      date: dateVal,
      week: materialWeekLabel(dateVal),
      qty,
      worker: snap.worker, workTime: snap.workTime,
      workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC
    };

    if (state.x2BoluongEditId) {
      const rec = (state.xuong2BoluongRecords || []).find(r => r.id === state.x2BoluongEditId);
      if (!rec) { showToast('Không tìm thấy lượt bốc luồng cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong2Boluong();
      showToast('Đã cập nhật lượt bốc luồng!', 'success');
    } else {
      (state.xuong2BoluongRecords = state.xuong2BoluongRecords || []).push({
        id: 'x2blg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong2Boluong();
      showToast('Đã ghi lượt bốc luồng!', 'success');
    }

    resetXuong2BoluongForm();
    renderXuong2BoluongCard();
  }

  // ─── SỬA / XÓA LƯỢT BỐC LUỒNG (bảng lịch sử) ──────────────────
  function editXuong2Boluong(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2BoluongRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x2BoluongEditId = id;
    fillXuong2BoluongOptions(); // giữ lại đúng lô của lượt đang sửa
    const sel = document.getElementById('x2-blg-material');
    if (sel) sel.value = rec.materialId || '';
    const d = document.getElementById('x2-blg-date');
    if (d) d.value = rec.date || '';
    const qty = document.getElementById('x2-blg-qty');
    if (qty) qty.value = (rec.qty ?? '') === '' ? '' : String(rec.qty);
    syncX2BoluongEditBanner();
  }

  function deleteXuong2Boluong(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2BoluongRecords || []).find(r => r.id === id);
    if (!rec) return;
    const d = boluongDisplay(rec);
    if (!confirm(`Xóa lượt bốc luồng ngày ${formatDateDDMMYY(rec.date)} (${fmtKg(d.qty)} kg — lô ${d.materialType || '—'})?`)) return;
    trackDeleted('xuong2BoluongRecords', id); // tombstone: không bị mây/máy khác hồi sinh
    state.xuong2BoluongRecords = (state.xuong2BoluongRecords || []).filter(r => r.id !== id);
    if (state.x2BoluongEditId === id) resetXuong2BoluongForm(); // đang sửa chính nó → về form ghi mới
    saveXuong2Boluong();
    renderXuong2BoluongCard();
    showToast('Đã xóa lượt bốc luồng!', 'success');
  }

  // ─── THỐNG KÊ NHANH CỦA VỊ TRÍ BỐC LUỒNG ──────────────────────
  function renderXuong2BoluongStats() {
    const box = document.getElementById('x2-blg-stats');
    if (!box) return;
    const list = state.xuong2BoluongRecords || [];
    const totalQty = list.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const pending = boluongPendingInputs();
    const pendingW = pending.reduce((s, r) => s + boluongRemainingOf(r), 0);
    const days = new Set(list.map(r => r.date).filter(Boolean)).size;
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${list.length}</span>
        <span class="material-stat-label">Lượt bốc luồng</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalQty)}</span>
        <span class="material-stat-label">Tổng KL thực tế (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${days}</span>
        <span class="material-stat-label">Số ngày bốc</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(pendingW)}</span>
        <span class="material-stat-label">Tồn chờ bốc (kg)</span>
      </div>`;
  }

  // ─── BẢNG LỊCH SỬ BỐC LUỒNG — THẺ NGÀY (mỗi ngày 1 thẻ) ──────
  // DÒNG ĐẦU THẺ: Ngày | Người bốc | Giờ bốc HC/TC | Công suất thực tế |
  // Hiệu suất (= Công suất thực tế ÷ Công suất định mức của tháng).
  //   Công suất thực tế = TỔNG KHỐI LƯỢNG THỰC TẾ ÷ giờ làm việc hiệu dụng
  //   (giờ HC/TC từ Bảng bố trí Nhân Sự vị trí "Bốc Luồng", trừ giờ sự cố).
  // Sau đó các DÒNG LƯỢT trong ngày: Loại NL | NCC | KL thực tế | KL lô đầu vào |
  // Còn lại của lô | Thao tác.
  function renderXuong2BoluongTable() {
    const box = document.getElementById('x2-blg-day-cards');
    if (!box) return;
    const list = [...(state.xuong2BoluongRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const countEl = document.getElementById('x2-blg-table-count');
    if (countEl) countEl.textContent = list.length ? `${list.length} lượt đã bốc luồng` : '';
    if (!list.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="forklift"></i>
          <div>Chưa có lượt bốc luồng nào.<br>Chọn <strong>lô "Luồng cây..."</strong> ở form trên rồi bấm <strong>Lưu Lượt Bốc Luồng</strong>.</div>
        </div>`;
      initLucide();
      return;
    }
    // Gộp theo ngày (đã sort mới nhất lên đầu — Map giữ đúng thứ tự nhóm)
    const groups = new Map();
    list.forEach(r => {
      const key = r.date || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let html = '';
    for (const [date, recs] of groups) {
      const first = boluongDisplay(recs[0]); // thông tin CHUNG của ngày (người bốc/giờ)
      let totalQty = 0;
      const rowsHtml = recs.map(r => {
        const d = boluongDisplay(r);
        totalQty += d.qty;
        return `
        <tr class="x2-day-row" data-x2-blg-row="${escapeHTML(r.id)}">
          <td><strong>${escapeHTML(d.materialType || '—')}</strong></td>
          <td>${escapeHTML(d.supplier || '—')}${d.supplierCode ? ` <span style="color:var(--text-muted);">(${escapeHTML(d.supplierCode)})</span>` : ''}</td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(d.qty)}</strong></td>
          <td class="text-right">${fmtKg(d.inputWeight)}</td>
          <td class="text-right" title="Phần CÒN LẠI của lô sau các lượt bốc đã ghi">${fmtKg(d.lotRest)}</td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-perm="x2" data-x2-blg-edit="${escapeHTML(r.id)}"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-perm="x2" data-x2-blg-delete="${escapeHTML(r.id)}"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
      }).join('');
      // ── ĐẦU THẺ: thông tin chung của ngày + bảng các lượt bốc trong thẻ
      const hours = first.workHours || 0; // tổng giờ làm việc (HC + TC) từ Nhân Sự
      // Giờ SỰ CỐ CHO PHÉP (nhập trên đầu thẻ) được TRỪ khỏi giờ làm khi tính
      // CÔNG SUẤT → HIỆU SUẤT của ngày.
      const hoursEff = stageEffHours('boluong', date, hours);
      const incH = stageIncidentOf('boluong', date);
      const cap = hoursEff > 0 ? (totalQty / hoursEff) : null; // Công suất thực tế (kg/h)
      const rate = boluongRateOf(date);                        // Định mức của tháng (kg/h)
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null; // Hiệu suất (%)
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ bốc / giờ sự cố ≥ giờ làm, hoặc chưa đặt Định mức công suất cho tháng này)'
        : `Hiệu suất = Công suất thực tế (${fmtKg(cap)} kg/h = ${fmtKg(totalQty)} kg ÷ ${fmtRatio(hoursEff)} giờ${incH > 0 ? ` [đã trừ ${fmtGio(incH)}h sự cố]` : ''}) ÷ Công suất định mức tháng ${Number(String(date).slice(5))} (${fmtKg(rate)} kg/h)`;
      const hcTxt = first.workHoursHC != null ? fmtRatio(first.workHoursHC) : '—';
      const tcTxt = first.workHoursTC != null ? fmtRatio(first.workHoursTC) : '—';
      const workers = first.workerRows.filter(x => x.name);
      const workerMain = workers.length
        ? `${escapeHTML(workers[0].name)}${workers[0].time ? ` (${escapeHTML(workers[0].time)})` : ''}`
        : '';
      const workerMore = workers.length > 1
        ? `<em class="x2-day-cutters-more" title="Người khác cùng ngày: ${escapeHTML(workers.slice(1).map(x => `${x.name}${x.time ? ` (${x.time})` : ''}`).join(', '))}">+${workers.length - 1} người khác</em>`
        : '';
      html += `
        <div class="x2-day-card">
          <div class="x2-day-head">
            <span class="x2-day-date"><i data-lucide="calendar-days"></i> ${formatDateDDMMYY(date)}</span>
            <span class="x2-day-cutters" title="Người bốc tự động từ Bảng bố trí Nhân Sự (vị trí Bốc Luồng — Xưởng 2)"><i data-lucide="users"></i> ${workerMain || '<em style="color:var(--text-muted);">chưa bố trí người bốc</em>'}${workerMore}</span>
            <span class="x2-day-hours" title="Giờ bốc = tổng giờ công vị trí Bốc Luồng trong ngày (từ tab Nhân Sự), tách giờ hành chính (HC) / giờ tăng ca (TC)">Giờ bốc: <span class="x2-hours-hc">${hcTxt}h HC</span><span class="x2-hours-tc">${tcTxt}h TC</span></span>
            <span class="x2-day-cap" title="Công suất thực tế = Tổng KL thực tế (${fmtKg(totalQty)} kg) ÷ giờ làm việc hiệu dụng (${fmtRatio(hoursEff)} h${incH > 0 ? ` — đã TRỪ ${fmtGio(incH)}h sự cố cho phép` : ''})">Công suất thực tế: <strong>${cap != null ? `${fmtKg(cap)} kg/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
            ${stageIncidentInputHtml('boluong', date)}
          </div>
          <table class="data-table x2-day-table">
            <thead>
              <tr>
                <th>Loại nguyên liệu</th>
                <th>Nhà cung cấp</th>
                <th class="text-right">KL thực tế (kg)</th>
                <th class="text-right">KL lô đầu vào (kg)</th>
                <th class="text-right">Còn lại của lô (kg)</th>
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

  // Thu gọn / mở rộng BẢNG LỊCH SỬ bốc luồng (form vẫn hiện để tiếp tục nhập)
  function toggleX2BoluongTable() {
    const wrap = document.getElementById('x2-blg-table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('x2-cut-collapsed');
    initLucide();
  }

  // RENDER TOÀN BỘ THẺ CHI TIẾT BỐC LUỒNG (gọi khi mở thẻ + sau khi lưu/xóa)
  function renderXuong2BoluongCard() {
    fillXuong2BoluongOptions();
    renderX2BoluongStockBar();
    renderX2BoluongRateBar(); // Định mức công suất theo tháng (cho cột Hiệu suất)
    renderXuong2BoluongStats();
    renderXuong2BoluongTable();
    syncX2BoluongEditBanner(); // banner "Đang sửa" luôn đồng bộ trạng thái
    updateXuong2CardCounts();
  }


  // ═══════════════════════════════════════════════════════════
  // ─── ĐỊNH MỨC CÔNG SUẤT BỐC LUỒNG (kg/giờ) THEO TỪNG THÁNG ─────
  // Người quản lý đặt riêng cho từng tháng — nguồn cho cột "Hiệu suất"
  // = Công suất thực tế ÷ Công suất định mức.
  function loadX2BoluongRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_BOLUONG_RATE);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        state.x2BoluongRates = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
      } catch (e) { state.x2BoluongRates = {}; }
    } else {
      state.x2BoluongRates = {};
    }
  }

  function saveX2BoluongRates() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_BOLUONG_RATE, JSON.stringify(state.x2BoluongRates || {}));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // Định mức công suất bốc luồng của tháng chứa dateVal (kg/giờ) — null nếu chưa đặt
  function boluongRateOf(dateVal) {
    const key = String(dateVal || '').slice(0, 7);
    const v = Number((state.x2BoluongRates || {})[key]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  // Lưu định mức 1 tháng (từ popup "Định mức" trên form nhập)
  function handleX2BoluongRateSave() {
    if (!requireRatePermission()) return;
    const monthEl = document.getElementById('x2-blg-rate-month');
    const valEl = document.getElementById('x2-blg-rate-value');
    const month = String((monthEl && monthEl.value) || '').trim();
    const v = Number((valEl && valEl.value) || 0);
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Chưa chọn tháng để lưu định mức!', 'error'); return; }
    if (!Number.isFinite(v) || v <= 0) { showToast('Định mức công suất phải là số kg/giờ lớn hơn 0!', 'error'); return; }
    (state.x2BoluongRates = state.x2BoluongRates || {})[month] = v;
    saveX2BoluongRates();
    renderX2BoluongRateBar();
    renderXuong2BoluongTable(); // cột Hiệu suất tự cập nhật
    showToast(`Đã lưu định mức bốc luồng ${fmtKg(v)} kg/giờ cho tháng ${month.slice(5)}!`, 'success');
  }

  // Ô chọn tháng trong popup ĐỊNH MỨC (các tháng có lượt bốc + tháng đã đặt
  // định mức + tháng hiện tại) + dãy chip tháng ĐÃ ĐẶT (bấm chip để nạp lại)
  function renderX2BoluongRateBar() {
    const selEl = document.getElementById('x2-blg-rate-month');
    const valInput = document.getElementById('x2-blg-rate-value');
    if (!selEl) return;
    const months = new Set([
      ...(state.xuong2BoluongRecords || []).map(r => String(r.date || '').slice(0, 7)),
      ...Object.keys(state.x2BoluongRates || {}),
      new Date().toISOString().slice(0, 7)
    ]);
    const curMonth = selEl.value || new Date().toISOString().slice(0, 7);
    const list = [...months].filter(Boolean).sort((a, b) => b.localeCompare(a));
    selEl.innerHTML = list
      .map(m => `<option value="${escapeHTML(m)}">Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</option>`).join('');
    selEl.value = months.has(curMonth) ? curMonth : list[0] || '';
    if (valInput) {
      const v = Number((state.x2BoluongRates || {})[selEl.value]);
      valInput.value = Number.isFinite(v) && v > 0 ? v : '';
    }
    const chips = document.getElementById('x2-blg-rate-chips');
    if (chips) {
      const keys = Object.keys(state.x2BoluongRates || {})
        .filter(k => Number(state.x2BoluongRates[k]) > 0)
        .sort((a, b) => b.localeCompare(a));
      chips.innerHTML = keys.map(k => `<button type="button" class="x2-rate-chip" data-x2-boluong-rate="${escapeHTML(k)}" title="Bấm để nạp định mức tháng này vào ô nhập để sửa lại">T${Number(k.slice(5))} = ${fmtKg(state.x2BoluongRates[k])} kg/h</button>`).join('');
    }
    initLucide();
  }

  // ═════════════════════════════════════════════════════════════
  // VỊ TRÍ: BỔ ỐNG — Xưởng 2 (thẻ launcher tab Công Đoạn)
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
    if (!requireRatePermission()) return;
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
      // Giờ SỰ CỐ CHO PHÉP được TRỪ khỏi giờ làm khi tính CÔNG SUẤT → HIỆU SUẤT
      const hoursEff = stageEffHours('boong', date, hours);
      const incH = stageIncidentOf('boong', date);
      const cap = hoursEff > 0 ? (totalIn / hoursEff) : null; // Công suất thực tế (kg/h)
      const rate = boOngRateOf(date);                        // Định mức của tháng (kg/h)
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ bổ / giờ sự cố ≥ giờ làm, hoặc chưa đặt Định mức công suất bổ ống cho tháng này)'
        : `Hiệu suất = Công suất thực tế (${fmtKg(cap)} kg/h = ${fmtKg(totalIn)} kg ÷ ${fmtRatio(hoursEff)} giờ${incH > 0 ? ` [đã trừ ${fmtGio(incH)}h sự cố]` : ''}) ÷ Định mức bổ ống tháng ${Number(String(date).slice(5))} (${fmtKg(rate)} kg/h)`;
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
            <span class="x2-day-cap" title="Công suất thực tế = Tổng KL ống đầu vào (${fmtKg(totalIn)} kg) ÷ giờ làm việc hiệu dụng (${fmtRatio(hoursEff)} h${incH > 0 ? ` — đã TRỪ ${fmtGio(incH)}h sự cố cho phép` : ''})">Công suất thực tế: <strong>${cap != null ? `${fmtKg(cap)} kg/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
            ${stageIncidentInputHtml('boong', date)}
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
  // — lượt có thể CHỌN NHIỀU lô (boOngIds) nên đếm theo MẢNG; bản cũ chỉ có
  // boOngId đơn → coi như mảng 1 phần tử.
  function baoThoLotIdsOf(r) {
    if (!r) return [];
    if (Array.isArray(r.boOngIds) && r.boOngIds.length) return r.boOngIds.filter(Boolean);
    return r.boOngId ? [r.boOngId] : [];
  }
  function baoThoRunsOf(boOngId, excludeId) {
    return (state.xuong2BaoThoRecords || [])
      .filter(r => r.id !== excludeId && baoThoLotIdsOf(r).includes(boOngId)).length;
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
  // ─── POPUP "ĐỊNH MỨC" CỦA 6 THẺ CÔNG ĐOẠN (nút nằm TRONG form nhập) ──
  // ánh xạ nút mở → id popup · id đóng (btn-close-<popup>)
  const X2_RATE_POPUPS = {
    'btn-x2-blg-rate': 'modal-x2-blg-rate',
    'btn-x2-cut-rate': 'modal-x2-cut-rate',
    'btn-x2-ong-rate': 'modal-x2-ong-rate',
    'btn-x2-bt-rate': 'modal-x2-bt-rate',
    'btn-x2-cn-rate': 'modal-x2-cn-rate',
    'btn-x2-epv-rate': 'modal-x2-epv-rate',
    'btn-x2-bl-rate': 'modal-x2-bl-rate'
  };
  function openX2RatePopup(popupId) {
    if (!requireRatePermission()) return false; // CHỈ admin mở bảng định mức
    const m = document.getElementById(popupId);
    if (!m) return false;
    m.classList.add('show');
    return true;
  }
  function closeX2RatePopup(popupId) {
    const m = document.getElementById(popupId);
    if (!m) return false;
    m.classList.remove('show');
    return true;
  }
  // Bấm nút "Định mức" trên form → mở popup tương ứng
  function onX2RateBtnClick(e) {
    const btn = e && e.target && e.target.closest ? e.target.closest('[data-x2-rate-popup]') : null;
    if (!btn) return false;
    openX2RatePopup(btn.getAttribute('data-x2-rate-popup'));
    return true;
  }

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
    if (!requireRatePermission()) return;
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
  // LƯỢT CHỌN NHIỀU LÔ (boOngIds): NCC gộp "NCC A + NCC B" · loại NL gộp ·
  // KL ống bổ = TỔNG các lô · ngày bổ = ngày SỚM NHẤT trong các lô đã chọn.
  function baoThoDisplay(r) {
    const ids = baoThoLotIdsOf(r);
    const lots = ids.map(boOngLotOf).filter(Boolean);   // lô còn sống (đã xóa → bỏ)
    const lotDs = lots.map(boOngDisplay);
    const joinUniq = arr => [...new Set(arr.map(s => String(s || '').trim()).filter(Boolean))].join(' + ');
    const multi = lotDs.length > 1;
    const boDate = lotDs.length
      ? lotDs.map(d => d.date).filter(Boolean).sort()[0] || ''
      : '';
    const klOngBo = lotDs.reduce((s, d) => s + (Number(d.klOngBo) || 0), 0);
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
    // Có lô còn sống → tính SỐNG (gộp NCC/loại NL, cộng tổng KL); tất cả đã bị
    // xóa → dùng snapshot đã lưu khi ghi nhận.
    const liveOk = lotDs.length > 0;
    const cutDates = lotDs.map(d => d.cutDate).filter(Boolean).sort();
    return {
      date: r.date || '',
      materialType: liveOk ? joinUniq(lotDs.map(d => d.materialType)) : (r.materialType || ''),
      supplier: liveOk ? joinUniq(lotDs.map(d => d.supplier)) : (r.supplier || ''),
      boDate: liveOk ? (boDate || (r.boDate || '')) : (r.boDate || ''),
      cutDate: liveOk ? (cutDates[0] || '') : (r.cutDate || ''),
      klOngBo: liveOk ? klOngBo : (Number(r.klOngBo) || 0),
      lotCount: Math.max(lotDs.length, ids.length ? ids.length : 1),   // số lô trong lượt
      lotMulti: multi,                                                  // lượt chọn NHIỀU lô
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
  // Ô chọn = LÔ ĐÃ BỔ (từ công đoạn Bổ Ống) — CHỌN ĐƯỢC NHIỀU LÔ cho 1 lượt
  // chạy (select multiple + 2 nút Chọn tất cả / Bỏ chọn). Nhãn hiện đủ Loại NL ·
  // NCC · ngày bổ · KL ống bổ đạt + số lượt đã chạy.
  // Lấy danh sách lô ĐANG CHỌN — đọc selectedOptions (trình duyệt thật);
  // stub/test không có selectedOptions → fallback về sel.value (1 lô).
  function baoThoPickedIds() {
    const sel = document.getElementById('x2-bao-tho-lot');
    if (!sel) return [];
    if (sel.selectedOptions && sel.selectedOptions.length) {
      return Array.from(sel.selectedOptions).map(o => (o ? o.value : '')).filter(Boolean);
    }
    return sel.value ? [sel.value] : [];
  }
  // Đánh dấu chọn lại các lô theo mảng id (dùng khi nạp lại danh sách / sửa lượt)
  function setBaoThoPicked(ids) {
    const want = new Set((ids || []).filter(Boolean));
    const sel = document.getElementById('x2-bao-tho-lot');
    if (!sel) return;
    if (sel.options && sel.options.length) {
      for (const o of sel.options) o.selected = want.has(o.value);
    } else {
      sel.value = ids && ids.length ? ids[0] : ''; // stub/test: ghi thẳng giá trị
    }
    state.x2BaoThoPicked = [...want];
  }
  // Nút "Chọn tất cả" / "Bỏ chọn" dưới ô chọn lô
  function baoThoLotSelectAll() {
    const sel = document.getElementById('x2-bao-tho-lot');
    if (sel && sel.options) for (const o of sel.options) o.selected = true;
    updateXuong2BaoThoLinked();
  }
  function baoThoLotSelectNone() {
    const sel = document.getElementById('x2-bao-tho-lot');
    if (sel && sel.options) for (const o of sel.options) o.selected = false;
    state.x2BaoThoPicked = [];
    updateXuong2BaoThoLinked();
  }

  function fillXuong2BaoThoOptions() {
    const sel = document.getElementById('x2-bao-tho-lot');
    if (!sel) return;
    // GIỮ lựa chọn đang có qua lần vẽ lại (state → nếu rỗng thì đọc từ DOM)
    const keep = new Set((state.x2BaoThoPicked && state.x2BaoThoPicked.length)
      ? state.x2BaoThoPicked : baoThoPickedIds());
    const editing = state.x2BaoThoEditId
      ? (state.xuong2BaoThoRecords || []).find(r => r.id === state.x2BaoThoEditId)
      : null;
    const editId = editing ? editing.id : null;
    const lots = boOngLotList().map(bo => {
      const d = boOngDisplay(bo);
      const runs = baoThoRunsOf(bo.id, editId);
      const runTxt = runs > 0 ? ` · đã chạy ${runs} lượt` : '';
      const selAttr = keep.has(bo.id) ? ' selected' : '';
      return `<option value="${escapeHTML(bo.id)}"${selAttr}>${escapeHTML(d.materialType || 'Lô ống')} · NCC ${escapeHTML(d.supplier || '—')} · bổ ${formatDateDDMMYY(bo.date)} · ống bổ ${fmtKg(d.klOngBo)} kg${escapeHTML(runTxt)}</option>`;
    });
    let html = lots.join('');
    if (!html) html = `<option value="">— Chưa có lô đã bổ (ghi lượt ở thẻ Bổ Ống trước) —</option>`;
    sel.innerHTML = html;
    state.x2BaoThoPicked = [...keep];
    updateXuong2BaoThoLinked();
  }

  // Đổi lô đã bổ: điền sẵn NGÀY theo NGÀY BỔ SỚM NHẤT trong các lô đang chọn
  // (ghi mới) + vẽ ô kích thước tự tính (gồm TỔNG KL ống bổ của các lô đã chọn)
  function updateXuong2BaoThoLinked() {
    state.x2BaoThoPicked = baoThoPickedIds();
    const boDates = state.x2BaoThoPicked.map(id => boOngLotOf(id)).filter(Boolean)
      .map(b => b.date).filter(Boolean).sort();
    if (!state.x2BaoThoEditId && boDates.length) {
      const d = document.getElementById('x2-bao-tho-date');
      if (d && !d.value) d.value = boDates[0];
    }
    renderX2BaoThoCalc();
  }

  // Ô TỰ TÍNH: số lô đã chọn + TỔNG KL ống bổ (kg) · số tổ hợp kích thước ·
  // thể tích quy đổi 1 thanh (m³) · số lượng (chờ Chọn Nan Thô)
  function renderX2BaoThoCalc() {
    const box = document.getElementById('x2-bao-tho-calc');
    if (!box) return;
    const picks = (state.x2BaoThoPicked && state.x2BaoThoPicked.length)
      ? state.x2BaoThoPicked : baoThoPickedIds();
    const lotDs = picks.map(boOngLotOf).filter(Boolean).map(boOngDisplay);
    const totOng = lotDs.reduce((s, d) => s + (Number(d.klOngBo) || 0), 0);
    const lotItem = `<span class="x2-ong-calc-item x2-ong-calc-bo" title="TỔNG KL ống bổ đạt của CÁC LÔ đã chọn trong lượt này — chọn nhiều lô thì CỘNG TỔNG các lô"><span class="x2-ong-calc-label">Lô đã chọn:</span><strong>${picks.length} lô · ${fmtKg(totOng)} kg</strong></span>`;
    const dais = parseDimList((document.getElementById('x2-bao-tho-dai') || {}).value);
    const rongs = parseDimList((document.getElementById('x2-bao-tho-rong') || {}).value);
    const thicks = parseDimList((document.getElementById('x2-bao-tho-day') || {}).value);
    const combos = baoThoCombosOf(dais, rongs, thicks);
    if (!combos.length) {
      box.innerHTML = `${lotItem}<span class="x2-ong-calc-label">Nhập Dài / Rộng / Dày (mm) — nhiều giá trị ngăn cách bằng dấu phẩy</span>`;
      return;
    }
    const unit = Math.round((combos.reduce((s, c) => s + c.unitVol, 0) / combos.length) * 10000) / 10000;
    const tooMany = combos.length > BAO_THO_MAX_COMBOS;
    box.innerHTML = `${lotItem}
      <span class="x2-ong-calc-item x2-ong-calc-in" title="Số tổ hợp kích thước = số Dài × số Rộng × số Dày đã nhập"><span class="x2-ong-calc-label">Tổ hợp kích thước:</span><strong style="${tooMany ? 'color:#dc2626;' : ''}">${combos.length}</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-bo" title="Thể tích quy đổi TRUNG BÌNH 1 thanh = Dài × Rộng × Dày (mm) ÷ 1 tỷ"><span class="x2-ong-calc-label">Thể tích 1 thanh (TB):</span><strong>${unit.toFixed(4)} m³</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-after" title="Số lượng thanh lấy TỰ ĐỘNG từ công đoạn Chọn Nan Thô (chưa có dữ liệu)"><span class="x2-ong-calc-label">Số lượng:</span><strong>chờ Chọn Nan Thô</strong></span>`;
  }

  function resetXuong2BaoThoForm() {
    state.x2BaoThoEditId = null;
    state.x2BaoThoPicked = [];          // bỏ hết lô đang chọn
    ['x2-bao-tho-dai', 'x2-bao-tho-rong', 'x2-bao-tho-day'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const d = document.getElementById('x2-bao-tho-date');
    if (d) d.value = '';
    const sel = document.getElementById('x2-bao-tho-lot');
    if (sel) {
      if (sel.options) for (const o of sel.options) o.selected = false;
      sel.value = '';
    }
    fillXuong2BaoThoOptions();
    syncX2BaoThoEditBanner();
  }

  // ─── LƯU FORM CHẠY MÁY BÀO THÔ (THÊM / SỬA) ──────────────────
  function handleXuong2BaoThoSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const boIds = baoThoPickedIds();                       // CHỌN ĐƯỢC NHIỀU lô
    const lots = boIds.map(boOngLotOf).filter(Boolean);
    if (!lots.length) { showToast('Hãy chọn ít nhất 1 LÔ ĐÃ BỔ (từ công đoạn Bổ Ống)!', 'error'); return; }

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
    // Gộp THÔNG TIN CÁC LÔ: NCC "Nhà A + Nhà B" · loại NL gộp · KL ống bổ = TỔNG
    const lotDs = lots.map(boOngDisplay);
    const joinUniq = arr => [...new Set(arr.map(s => String(s || '').trim()).filter(Boolean))].join(' + ');
    const dates = lotDs.map(d => d.date).filter(Boolean).sort();
    const cutDates = lotDs.map(d => d.cutDate).filter(Boolean).sort();
    const payload = {
      boOngId: lots[0].id,            // lô ĐẦU (giữ tên trường cũ — dữ liệu cũ vẫn đọc được)
      boOngIds: lots.map(l => l.id),   // MỌI lô đã chọn trong lượt chạy này
      materialId: lots[0].materialId || '',
      materialType: joinUniq(lotDs.map(d => d.materialType)),
      supplier: joinUniq(lotDs.map(d => d.supplier)),   // "Nhà Tế + Nhà Trung"
      boDate: dates[0] || '',          // ngày bổ SỚM NHẤT trong các lô đã chọn
      cutDate: cutDates[0] || '',
      klOngBo: lotDs.reduce((s, d) => s + (Number(d.klOngBo) || 0), 0), // TỔNG KL ống bổ
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
    // Nạp lại CẢ MẢNG lô của lượt (dữ liệu cũ chỉ có boOngId đơn → mảng 1 phần tử)
    state.x2BaoThoPicked = baoThoLotIdsOf(rec);
    fillXuong2BaoThoOptions();
    setBaoThoPicked(baoThoLotIdsOf(rec));
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
      // Giờ SỰ CỐ CHO PHÉP được TRỪ khỏi giờ chạy máy khi tính CÔNG SUẤT → HIỆU SUẤT
      const hoursEff = stageEffHours('baotho', date, hours);
      const incH = stageIncidentOf('baotho', date);
      const cap = (allQtyKnown && hoursEff > 0) ? (totalQty / hoursEff) : null;
      const rate = baoThoRateOf(date);                           // định mức tháng (thanh/h)
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? (allQtyKnown ? 'Chưa đặt Định mức công suất bào thô cho tháng này (hoặc giờ sự cố ≥ giờ chạy máy)' : 'Chờ số lượng thanh từ công đoạn Chọn Nan Thô')
        : `Hiệu suất = Công suất thực tế (${fmtThanh(cap)} thanh/h = ${fmtThanh(totalQty)} thanh ÷ ${fmtRatio(hoursEff)} giờ${incH > 0 ? ` [đã trừ ${fmtGio(incH)}h sự cố]` : ''}) ÷ Định mức bào thô tháng ${Number(String(date).slice(5))} (${fmtThanh(rate)} thanh/h)`;
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
            <span class="x2-day-cap" title="Công suất = Tổng số thanh ${allQtyKnown ? `(${fmtThanh(totalQty)} thanh)` : '(chờ Chọn Nan Thô)'} ÷ giờ chạy máy hiệu dụng (${fmtRatio(hoursEff)} h${incH > 0 ? ` — đã TRỪ ${fmtGio(incH)}h sự cố` : ''})">Công suất: <strong>${cap != null ? `${fmtThanh(cap)} thanh/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
            ${stageIncidentInputHtml('baotho', date)}
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
    // Nguồn: 1 lô = "Lô đã bổ <ngày>"; NHIỀU lô = "N lô đã bổ" + cộng tổng KL
    const srcNote = d.lotMulti
      ? `${d.lotCount} lô đã bổ ${formatDateDDMMYY(d.boDate)} · NCC ${escapeHTML(d.supplier || '—')} · ống bổ tổng ${fmtKg(d.klOngBo)} kg`
      : `Lô đã bổ ${formatDateDDMMYY(d.boDate)} · NCC ${escapeHTML(d.supplier || '—')} · ống bổ đạt ${fmtKg(d.klOngBo)} kg`;
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
    if (!requireRatePermission()) return;
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

  // ═══════════════════════════════════════════════════════════
  // THÔNG BÁO "ĐÃ CHỌN THAN HÓA" + SỬA NHANH TẠI BẢNG LỊCH SỬ (04/10/2026)
  // ═══════════════════════════════════════════════════════════
  // Lô Sấy 1 tạo từ thẻ nan (form "Thêm Lô Sấy Mới" — js/batch-modals.js) giữ
  // link batch.sourceChonNanId → đếm số thanh ĐÃ than hóa + CÒN LẠI của thẻ.
  function nanSay1UseOf(recId) {
    const lots = (state.batches || [])
      .filter(b => b && b.sourceChonNanId === recId)
      .map(b => ({
        id: b.id, code: b.code || '', date: b.date || '',
        location: b.location || '', quantity: Number(b.quantity) || 0
      }));
    const used = lots.reduce((s, l) => s + l.quantity, 0);
    return { lots, count: lots.length, used };
  }
  // Chip trên DÒNG NHÁNH — chỉ hiện khi thẻ nan đã có lô Sấy 1; đọc SỐNG nên
  // tự đổi khi có lô mới / xóa lô / sửa số lượng ngay tại bảng.
  function chonNanSay1ChipHtml(d) {
    const use = nanSay1UseOf(d.id);
    if (!use.count || use.used <= 0) return '';
    const total = Number(d.quantity) || 0;
    const remaining = Math.max(0, total - use.used);
    const tip = `Thẻ nan này đã chọn than hóa ${use.count} lô Sấy 1: ` + use.lots
      .map(l => `${l.code || '(chưa có mã)'} · ${formatDateDDMMYY(l.date)} · ${l.location || '—'} · ${fmtThanh(l.quantity)} thanh`)
      .join('  |  ');
    const full = remaining <= 0;
    const label = full
      ? `Đã than hóa hết · ${fmtThanh(use.used)} thanh`
      : `Đã chọn than hóa ${fmtThanh(use.used)}/${fmtThanh(total)} thanh · còn ${fmtThanh(remaining)}`;
    return `<div><span class="x2-nan-say1${full ? ' say1-full' : ''}" title="${escapeHTML(tip)}"><i data-lucide="flame"></i> ${escapeHTML(label)}</span></div>`;
  }
  // Ô PHÂN LOẠI trong bảng: chip màu (chỉ xem) hoặc SELECT sửa nhanh (có quyền)
  function chonNanClsCellHtml(d) {
    if (!canEditTab('x2')) {
      return `<span class="x2-nan-cls x2-nan-cls-${escapeHTML(d.cls)}" title="${escapeHTML(nanClassLabel(d.cls))}">${escapeHTML(nanClassLabel(d.cls))}</span>`;
    }
    const opts = NAN_CLASSES.map(c =>
      `<option value="${escapeHTML(c.id)}"${c.id === d.cls ? ' selected' : ''}>${escapeHTML(c.label)}</option>`).join('');
    return `<select class="x2-cn-inline-cls x2-nan-cls x2-nan-cls-${escapeHTML(d.cls)}" data-x2-cn-cls="${escapeHTML(d.id)}" title="Sửa nhanh PHÂN LOẠI ngay tại bảng">${opts}</select>`;
  }
  // Ô SỐ LƯỢNG trong bảng: chữ đậm (chỉ xem) hoặc ô nhập sửa nhanh (có quyền)
  function chonNanQtyCellHtml(d) {
    if (!canEditTab('x2')) {
      return `<strong>${fmtThanh(d.quantity)}</strong> <small style="color:var(--text-muted);">thanh</small>`;
    }
    return `<span class="x2-cn-inline-qty-wrap"><input type="number" class="x2-cn-inline-qty" data-x2-cn-qty="${escapeHTML(d.id)}" min="1" step="1" inputmode="numeric" value="${Number(d.quantity) || 0}" title="Sửa nhanh SỐ LƯỢNG ngay tại bảng (thanh)"><small style="color:var(--text-muted);">thanh</small></span>`;
  }
  // ─── SỬA NHANH TẠI BẢNG — uỷ nhiệm `change` trên #x2-cn-day-cards ──
  // 2 TRƯỜNG sửa trực tiếp: Phân loại (select) · Số lượng (input). Vẽ lại PHẦN
  // DỮ LIỆU (bảng + thống kê + tồn + chip mini) và GIỮ NGUYÊN form đang nhập —
  // KHÔNG gọi renderX2ChonNanCard() (hàm đó reset lựa chọn ô LÔ của form).
  function onChonNanInlineEdit(e) {
    const t = e && e.target;
    if (!t || typeof t.getAttribute !== 'function') return false;
    const clsId = t.getAttribute('data-x2-cn-cls');
    const qtyId = t.getAttribute('data-x2-cn-qty');
    if (!clsId && !qtyId) return false;
    if (!requireEditPermission()) { renderX2ChonNanTable(); return false; } // không có quyền → đưa ô nhập về số cũ
    const id = String(clsId || qtyId);
    const rec = (state.xuong2ChonNanThoRecords || []).find(r => r && r.id === id);
    if (!rec) return false;
    if (clsId) {
      const v = String(t.value == null ? '' : t.value);
      if (!NAN_CLASSES.some(c => c.id === v) || v === rec.cls) return false;
      rec.cls = v;
    } else {
      const q = Math.floor(Number(t.value));
      if (!Number.isFinite(q) || q <= 0) {
        showToast('Số lượng phải là số thanh lớn hơn 0!', 'error');
        renderX2ChonNanTable();                                  // khôi phục ô nhập về số cũ
        return false;
      }
      if (q === Number(rec.quantity)) return false;
      const dims = Array.isArray(rec.dims) ? rec.dims : [];
      const unitVol = (rec.unitVol != null) ? Number(rec.unitVol)
        : unitVolOf(dims[0], dims[1], dims[2]);
      rec.quantity = q;
      rec.volume = Math.round(q * unitVol * 10000) / 10000;   // thể tích lượt = số thanh × thể tích 1 thanh
    }
    rec.updatedAt = new Date().toISOString();
    saveXuong2ChonNan();
    // Vẽ lại dữ liệu — form nhập phía trên KHÔNG bị đụng tới
    renderX2ChonNanStats();
    renderX2ChonNanTable();
    renderX2ChonNanStockBar();
    const sel = document.getElementById('x2-cn-baotho');
    const isNew = !!(sel && sel.value === CN_NEW_LOT_VALUE);
    renderX2ChonNanSizeOptions(isNew ? null : baoThoLotOf(sel ? sel.value : '')); // làm mới "đã chọn X thanh" — GIỮ lựa chọn
    renderX2ChonNanCalc();
    updateXuong2CardCounts();
    return true;
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
    // Giờ SỰ CỐ CHO PHÉP được TRỪ khỏi giờ làm khi tính CÔNG SUẤT → HIỆU SUẤT
    const hoursEff = stageEffHours('chonnan', date, hours);
    const incH = stageIncidentOf('chonnan', date);
    const cap = hoursEff > 0 ? (totalQty / hoursEff) : null; // công suất thực tế (thanh/h)
    const rate = chonNanRateOf(date);                   // định mức tháng (thanh/h)
    const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
    const effTxt = eff == null
      ? '<em style="color:var(--text-muted);">—</em>'
      : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
    const effTip = eff == null
      ? 'Chưa đủ dữ liệu (thiếu giờ chọn nan / giờ sự cố ≥ giờ làm, hoặc chưa đặt Định mức công suất chọn nan cho tháng này)'
      : `Hiệu suất = Công suất thực tế (${fmtThanh(cap)} thanh/h = ${fmtThanh(totalQty)} thanh ÷ ${fmtRatio(hoursEff)} giờ${incH > 0 ? ` [đã trừ ${fmtGio(incH)}h sự cố]` : ''}) ÷ Định mức chọn nan tháng ${Number(String(date).slice(5))} (${fmtThanh(rate)} thanh/h)`;
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
          <span class="x2-day-cap" title="Công suất thực tế = Tổng số thanh (${fmtThanh(totalQty)} thanh) ÷ giờ chọn nan hiệu dụng (${fmtRatio(hoursEff)} h${incH > 0 ? ` — đã TRỪ ${fmtGio(incH)}h sự cố` : ''})">Công suất: <strong>${cap != null ? `${fmtThanh(cap)} thanh/h` : '—'}</strong></span>
          <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
          ${stageIncidentInputHtml('chonnan', date)}
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
    const clsCell = chonNanClsCellHtml(d);        // chip (chỉ xem) hoặc ô SELECT sửa nhanh
    const qtyCell = chonNanQtyCellHtml(d);        // số đậm hoặc ô NHẬP sửa nhanh
    const say1Cell = chonNanSay1ChipHtml(d);      // chip "ĐÃ CHỌN THAN HÓA" (nếu thẻ đã có lô Sấy 1)
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
        <td>${clsCell}${extChip}${say1Cell}</td>
        <td class="text-right">${qtyCell}</td>
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
  // VỊ TRÍ: BULLIG — Xưởng 2 (thẻ launcher tab Công Đoạn)
  // ═══════════════════════════════════════════════════════════
  // 2 công đoạn nhỏ chạy ĐỒNG THỜI trong 1 thẻ (bảng lịch sử chia 2 VÙNG trên 1 thẻ ngày):
  //   • 'gc' GIA CÔNG  — nguồn = LÔ Ở KHO đã qua Sấy 2, Dùng Cho = Bullig;
  //     SL nhập "x / tổng đã chọn" (chọn được nhiều lô) + KÍCH THƯỚC THÀNH PHẨM
  //     (gợi ý từ lịch sử gia công đã nhập, có thể sửa lại).
  //   • 'ct' CHỌN THANH — nguồn = THÀNH PHẨM GIA CÔNG (chọn Loại thanh = kích thước
  //     thành phẩm) → SL ĐẠT + SL LỖI → TỔNG tự tính = đạt + lỗi.
  //   • NGƯỜI LÀM + GIỜ HC/TC tự động từ Bảng bố trí Nhân Sự (vị trí chứa
  //     "gia công" hoặc "chọn thanh" — Xưởng 2, đúng ngày; giờ tách HC/TC).
  //   • ĐỊNH MỨC CÔNG SUẤT theo THÁNG + TỪNG CÔNG ĐOẠN NHỎ (thanh/giờ) → Hiệu suất.
  // Dữ liệu: state.xuong2BulligRecords (localStorage + file + mây, tombstone).
  const BULLIG_KINDS = [
    { id: 'gc', label: 'Gia công' },
    { id: 'ct', label: 'Chọn thanh' }
  ];
  function bulligKindLabel(id) { const k = BULLIG_KINDS.find(x => x.id === id); return k ? k.label : (id || '—'); }
  // So khớp MỀM chuỗi trong thẻ Bullig (bỏ dấu, 'đ'→'d', thường hóa) — dùng cho
  // "Dùng Cho = Bullig" và ô tìm nhanh (KHÔNG phụ thuộc module khác).
  function bulligNorm(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
  }
  // Đọc KÍCH THƯỚC THÀNH PHẨM từ ô nhập 1 dòng: chấp nhận "1250x80x12",
  // "1250 × 80 × 12", "1250*80*12" hoặc "1250,80,12" — GIỮ ĐÚNG THỨ TỰ
  // Dài → Rộng → Dày (KHÔNG dùng parseDimList vì hàm đó sắp xếp lại giá trị,
  // chỉ hợp với ô MỘT loại kích thước của Chạy Máy Bào Thô).
  function bulligParseOutDims(text) {
    return String(text || '')
      .split(/[x×*,;\s]+/)
      .map(s => Number(String(s).trim()))
      .filter(v => Number.isFinite(v) && v > 0)
      .slice(0, 3);
  }
  // ─── HỆ SỐ QUY ĐỔI "1 THANH THÔ = N THANH GIA CÔNG" ────────────
  // Lấy từ ĐỊNH MỨC của BẢNG KẾ HOẠCH (tab Kế Hoạch → Định Mức Nguyên Vật
  // Liệu): ô "Số thanh nan cho 1 sản phẩm" nhập dạng PHÂN SỐ '1/6' nghĩa là
  // 1 thanh nan (thanh thô) làm được 6 sản phẩm ⇒ hệ số = 1 ÷ (1/6) = 6.
  //   • Sản phẩm nhận diện theo TÊN chứa "bullig" (bỏ dấu).
  //   • Ưu tiên bản định mức khớp KÍCH THƯỚC thành phẩm đang nhập (VD '304×14×7');
  //     không khớp mà chỉ có ĐÚNG 1 định mức Bullig thì dùng luôn bản đó.
  //   • Chưa khai định mức Bullig → hệ số 1 (1 thô = 1 thành phẩm) + cảnh báo.
  function bulligRateFactorOf(rate) {
    const qs = [rate.nan1Qty, rate.nan2Qty, rate.nan3Qty]
      .map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0);
    if (!qs.length) return 1;
    const q = Math.min(...qs);                                  // phần nan nhỏ nhất = loại nan chính
    return Math.max(1, Math.round((1 / q) * 1000) / 1000);       // ≥ 1 thanh thành phẩm / 1 thanh thô
  }
  // Bộ số trong 1 chuỗi (tên sản phẩm / kích thước) — dùng để khớp định mức theo cỡ
  function bulligNumsOf(s) {
    return (String(s || '').match(/\d+(?:[.,]\d+)?/g) || []).map(x => x.replace(',', '.'));
  }
  // { factor, rateName, hasRate, matched } cho kích thước thành phẩm đang chọn
  // Nhận diện định mức Bullig theo trường "Sử Dụng Nan" (dữ liệu mới) HOẶC tên
  // chứa "bullig" (dữ liệu cũ) — tên sản phẩm nay chỉ còn kích thước.
  function bulligConvertInfo(outSizeKey) {
    const entries = (state.materialRates || []).filter(r => r && (r.nanUse === 'Bullig' || bulligNorm(r.product).includes('bullig')));
    if (!entries.length) return { factor: 1, rateName: '', hasRate: false, matched: false };
    const want = bulligNumsOf(outSizeKey);
    let hit = null;
    if (want.length === 3) {
      hit = entries.find(r => { const nums = bulligNumsOf(r.product); return want.every(w => nums.includes(w)); }) || null;
    }
    const rate = hit || (entries.length === 1 ? entries[0] : null);
    if (!rate) return { factor: 1, rateName: '', hasRate: true, matched: false };
    return { factor: bulligRateFactorOf(rate), rateName: rate.product || '', hasRate: true, matched: true };
  }
  // NGƯỜI LÀM lấy từ Bảng bố trí Nhân Sự theo TỪNG CÔNG ĐOẠN NHỎ:
  //   • Gia công    → phân vị "Gia công Bullig"
  //   • Chọn thanh  → phân vị "Chọn thanh Bullig"
  // Khớp mềm tên vị trí (bỏ dấu): phải có CẢ "bullig" và từ khóa công đoạn.
  // Nếu hôm đó bảng bố trí KHÔNG có vị trí nào kèm "bullig" thì mới nới ra
  // tên rộng hơn ("Gia công…" / "Chọn thanh…") để vẫn hiện được người làm.
  function isBulligGcPos(name) {
    const n = normPosName(name);
    return n.includes('gia cong') && n.includes('bullig');
  }
  function isBulligCtPos(name) {
    const n = normPosName(name);
    return n.includes('chon thanh') && n.includes('bullig');
  }
  function hrBulligGcAssignmentsOf(dateVal) {
    const strict = hrAssignmentsAt(dateVal, isBulligGcPos);
    if (strict.length) return strict;
    return hrAssignmentsAt(dateVal, n => normPosName(n).includes('gia cong'));
  }
  function hrBulligCtAssignmentsOf(dateVal) {
    const strict = hrAssignmentsAt(dateVal, isBulligCtPos);
    if (strict.length) return strict;
    return hrAssignmentsAt(dateVal, n => normPosName(n).includes('chon thanh'));
  }
  function hrBulligSnapshot(dateVal, kind) {
    return workerSnapOf(hrPositionSnapshot(dateVal, kind === 'ct' ? hrBulligCtAssignmentsOf(dateVal) : hrBulligGcAssignmentsOf(dateVal)));
  }

  // ─── Nguồn GIA CÔNG: LÔ Ở KHO có Dùng Cho = Bullig (đã qua Sấy 2) ──
  function bulligLotList() {
    return [...(state.batches || [])]
      .filter(b => b && b.stage === 'kho' && bulligNorm(b.useFor || '') === 'bullig')
      .sort((a, b) => {
        if ((b.khoDate || b.date || '') !== (a.khoDate || a.date || '')) return (b.khoDate || b.date || '').localeCompare(a.khoDate || a.date || '');
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }
  function bulligLotOf(id) { return (state.batches || []).find(b => b && b.id === id) || null; }
  // Số thanh ĐÃ gia công lấy từ 1 lô (trừ chính lượt đang sửa)
  function bulligLotUsedOf(batchId, excludeId) {
    const id = String(batchId || '');
    if (!id) return 0;
    return (state.xuong2BulligRecords || []).reduce((s, r) => {
      if (!r || r.kind !== 'gc' || r.id === excludeId) return s;
      if (Array.isArray(r.sources) && r.sources.length) {
        return s + r.sources.reduce((a, src) => a + ((src && String(src.batchId) === id) ? (Number(src.qty) || 0) : 0), 0);
      }
      return s + (String(r.batchId || '') === id ? (Number(r.quantity) || 0) : 0);
    }, 0);
  }
  function bulligLotRemainingOf(b, excludeId) {
    if (!b) return 0;
    return Math.max(0, (Number(b.quantity) || 0) - bulligLotUsedOf(b.id, excludeId));
  }

  // ─── Nguồn CHỌN THANH: cỡ thành phẩm GIA CÔNG CÒN LẠI ───────────
  // Tổng ĐÃ gia công theo cỡ (dành cho Chọn thanh)
  function bulligGcQtyOf(sizeKey, excludeId) {
    return (state.xuong2BulligRecords || [])
      .filter(r => r && r.kind === 'gc' && r.id !== excludeId && (r.outSizeKey || '') === sizeKey)
      .reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  }
  // Tổng ĐÃ chọn thanh theo cỡ (đạt + lỗi)
  function bulligCtQtyOf(sizeKey, excludeId) {
    return (state.xuong2BulligRecords || [])
      .filter(r => r && r.kind === 'ct' && r.id !== excludeId && (r.inSizeKey || '') === sizeKey)
      .reduce((s, r) => s + (Number(r.qtyOk) || 0) + (Number(r.qtyErr) || 0), 0);
  }
  // Danh sách cỡ thành phẩm còn lại (nhiều nhất → ít nhất)
  function bulligCtCandidates() {
    const map = new Map();
    (state.xuong2BulligRecords || []).forEach(r => {
      if (!r || r.kind !== 'gc') return;
      const k = String(r.outSizeKey || '');
      if (!k) return;
      const cur = map.get(k) || { sizeKey: k, dims: Array.isArray(r.outDims) ? r.outDims.map(Number) : [] };
      map.set(k, cur);
    });
    return [...map.values()]
      .map(x => ({ ...x, remaining: Math.max(0, bulligGcQtyOf(x.sizeKey) - bulligCtQtyOf(x.sizeKey)) }))
      .filter(x => x.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);
  }
  // Tồn thanh đang chờ CHỌN thanh (thanh).
  function bulligCtPending() {
    return bulligCtCandidates().reduce((s, x) => s + x.remaining, 0);
  }
  // Tồn thanh thô lô Bullig ở Kho CHƯA gia công (thanh)
  function bulligGcPending() {
    return bulligLotList().reduce((s, b) => s + bulligLotRemainingOf(b), 0);
  }

  // ─── Gợi ý KÍCH THƯỚC THÀNH PHẨM (từ lịch sử gia công đã nhập) ──
  function bulligOutSizeSuggestions() {
    const seen = new Map();
    [...(state.xuong2BulligRecords || [])].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .forEach(r => {
        if (!r || r.kind !== 'gc' || !r.outSizeKey) return;
        if (!seen.has(r.outSizeKey)) seen.set(r.outSizeKey, Array.isArray(r.outDims) ? r.outDims.map(Number) : []);
      });
    return [...seen.entries()].map(([sizeKey, dims]) => ({ sizeKey, dims }));
  }

  // ─── ĐỊNH MỨC CÔNG SUẤT BULLIG (thanh/giờ) THEO THÁNG + CÔNG ĐOẠN ──
  function loadX2BulligRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_BULLIG_RATE);
    state.x2BulligRates = { gc: {}, ct: {} };
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          state.x2BulligRates = {
            gc: (obj.gc && typeof obj.gc === 'object') ? obj.gc : {},
            ct: (obj.ct && typeof obj.ct === 'object') ? obj.ct : {}
          };
        }
      } catch (e) {}
    }
  }

  function saveX2BulligRates() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_BULLIG_RATE, JSON.stringify(state.x2BulligRates || { gc: {}, ct: {} }));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error');
    }
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  function bulligRateOf(dateVal, kind) {
    const grp = ((state.x2BulligRates || {})[kind === 'ct' ? 'ct' : 'gc']) || {};
    const v = Number(grp[String(dateVal || '').slice(0, 7)]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function handleX2BulligRateSave() {
    if (!requireRatePermission()) return;
    const monthEl = document.getElementById('x2-bl-rate-month');
    const valEl = document.getElementById('x2-bl-rate-value');
    const kindSel = document.getElementById('x2-bl-rate-kind');
    const month = String((monthEl && monthEl.value) || '').trim();
    const v = Number((valEl && valEl.value) || 0);
    const kind = (kindSel && kindSel.value === 'ct') ? 'ct' : 'gc';
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Chưa chọn tháng để lưu định mức!', 'error'); return; }
    if (!Number.isFinite(v) || v <= 0) { showToast('Định mức công suất phải là số thanh/giờ lớn hơn 0!', 'error'); return; }
    (state.x2BulligRates = state.x2BulligRates || { gc: {}, ct: {} })[kind] = state.x2BulligRates[kind] || {};
    state.x2BulligRates[kind][month] = v;
    saveX2BulligRates();
    renderX2BulligRateBar();
    renderX2BulligTable();
    showToast(`Đã lưu định mức ${bulligKindLabel(kind)} ${fmtThanh(v)} thanh/giờ cho tháng ${month.slice(5)}!`, 'success');
  }

  function renderX2BulligRateBar() {
    const selEl = document.getElementById('x2-bl-rate-month');
    const valInput = document.getElementById('x2-bl-rate-value');
    const kindSel = document.getElementById('x2-bl-rate-kind');
    if (!selEl) return;
    const allRecs = state.xuong2BulligRecords || [];
    const months = new Set([...Object.keys(state.x2BulligRates.gc || {}), ...Object.keys(state.x2BulligRates.ct || {}), new Date().toISOString().slice(0, 7)]);
    allRecs.forEach(r => { if (r && r.date) months.add(String(r.date).slice(0, 7)); });
    const curMonth = selEl.value || new Date().toISOString().slice(0, 7);
    const list = [...months].filter(Boolean).sort((a, b) => b.localeCompare(a));
    selEl.innerHTML = list.map(m => `<option value="${escapeHTML(m)}">Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</option>`).join('');
    selEl.value = months.has(curMonth) ? curMonth : list[0] || '';
    const curKind = (kindSel && kindSel.value === 'ct') ? 'ct' : 'gc';
    if (valInput) {
      const v = Number((state.x2BulligRates[curKind] || {})[selEl.value]);
      valInput.value = Number.isFinite(v) && v > 0 ? v : '';
    }
    const chips = document.getElementById('x2-bl-rate-chips');
    if (chips) {
      const keys = Object.keys(state.x2BulligRates.gc || {}).filter(k => Number(state.x2BulligRates.gc[k]) > 0)
        .map(k => ({ kind: 'gc', k })).concat(
        Object.keys(state.x2BulligRates.ct || {}).filter(k => Number(state.x2BulligRates.ct[k]) > 0)
          .map(k => ({ kind: 'ct', k })));
      keys.sort((a, b) => b.k.localeCompare(a.k));
      chips.innerHTML = keys.map(x => `<button type="button" class="x2-rate-chip" data-x2-bl-rate="${escapeHTML(x.k)}" data-x2-bl-rate-kind="${x.kind}" title="Bấm để nạp định mức tháng này vào ô nhập để sửa lại">${bulligKindLabel(x.kind)} T${Number(x.k.slice(5))} = ${fmtThanh(state.x2BulligRates[x.kind][x.k])} thanh/h</button>`).join('');
    }
    initLucide();
  }

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT BULLIG ────────────────────────
  function bulligDisplay(r) {
    const gc = r.kind === 'gc';
    const lots = gc && Array.isArray(r.sources)
      ? r.sources.map(src => ({ batch: bulligLotOf(src.batchId), qty: Number(src.qty) || 0 })).filter(x => x.batch)
      : [];
    const firstLot = lots.length ? lots[0].batch : (gc ? bulligLotOf(r.batchId) : null);
    // Kích thước thành phẩm của lượt GIA CÔNG (nếu chưa lưu → suy từ lô)
    let outDims = Array.isArray(r.outDims) ? r.outDims.map(Number) : [];
    if (gc && !(outDims[0] > 0 && outDims[1] > 0 && outDims[2] > 0) && firstLot) {
      // Lượt cũ chưa lưu k.thước thành phẩm → suy từ kích thước lô (giữ đúng thứ tự)
      outDims = Array.isArray(firstLot.dimensions)
        ? firstLot.dimensions.map(Number)
        : bulligParseOutDims(String(firstLot.dimensions || ''));
    }
    // HỆ SỐ QUY ĐỔI (1 thanh thô = N thanh thành phẩm) — chốt trong lượt lúc lưu
    // (định mức thay đổi sau vẫn đúng); lượt cũ chưa có → 1 (1 thô = 1 thành phẩm)
    const factor = Number(r.convertFactor) > 0 ? Number(r.convertFactor) : 1;
    const inSizeKey = String(r.inSizeKey || '').trim();
    const outSizeKey = gc ? (r.outSizeKey || dimKeyOf(outDims[0], outDims[1], outDims[2])) : inSizeKey;
    const inDims = gc ? outDims : (Array.isArray(r.inDims) ? r.inDims.map(Number) : []);
    const quantity = gc ? (Number(r.quantity) || 0) : 0;                 // SỐ LƯỢNG GIA CÔNG ĐƯỢC (thành phẩm)
    const qtyIn = gc ? (Number(r.qtyIn) > 0 ? Number(r.qtyIn) : quantity) : 0; // thanh THÔ đã dùng
    const gcTotalPicked = gc ? (Number(r.gcTotalPicked) || 0) : 0;       // tổng thanh thô đã chọn
    const maxOut = gc ? Math.floor(gcTotalPicked * factor) : 0;          // gia công được tối đa
    const qtyOk = gc ? 0 : (Number(r.qtyOk) || 0);
    const qtyErr = gc ? 0 : (Number(r.qtyErr) || 0);
    const inQty = gc ? quantity : qtyOk + qtyErr;
    const unitVol = gc
      ? (outDims[0] > 0 ? unitVolOf(outDims[0], outDims[1], outDims[2]) : 0)
      : (r.unitVol != null ? Number(r.unitVol) : (inDims[0] > 0 ? unitVolOf(inDims[0], inDims[1], inDims[2]) : 0));
    const volume = Math.round((gc ? quantity : qtyOk) * unitVol * 10000) / 10000;
    // Người làm + giờ: SỐNG từ Bảng bố trí Nhân Sự theo ngày; mất bố trí → snapshot
    const live = gc ? hrBulligGcAssignmentsOf(r.date || '') : hrBulligCtAssignmentsOf(r.date || '');
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
    } else {
      workHours = snapshotCutHours(r.workTime);
    }
    return {
      id: r.id,
      kind: r.kind || 'gc',
      kindLabel: bulligKindLabel(r.kind || 'gc'),
      date: r.date || '',
      lots, firstLot,
      materialType: firstLot ? (firstLot.materialType || firstLot.bambooType || '') : '',
      supplier: firstLot ? (firstLot.supplier || '') : '',
      lotCodes: lots.map(x => x.batch.code || '').filter(Boolean).join(', '),
      outDims, outSizeKey, inSizeKey, inDims,
      quantity, qtyOk, qtyErr, inQty,
      qtyIn, convertFactor: factor, maxOut,
      unitVol, volume,
      gcTotalPicked,
      workerRows, workHours, workHoursHC, workHoursTC
    };
  }

  // ─── THANH TỒN (form Bullig) ───────────────────────────────────
  function renderX2BulligStockBar() {
    const bar = document.getElementById('x2-bl-stock-bar');
    if (!bar) return;
    const gcPending = bulligGcPending();
    const ctPending = bulligCtPending();
    // Đếm theo số lô CÒN thanh thô (lô đã dùng hết không còn nằm trong danh sách chọn)
    const liveLots = bulligLotList().filter(b => bulligLotRemainingOf(b) > 0);
    bar.innerHTML = `
      <span class="x2-stock-title" title="Tổng số thanh thô còn lại của các lô ở Kho (Dùng Cho = Bullig) chưa được gia công">
        <i data-lucide="warehouse"></i> Tồn thanh thô chờ Gia công: <strong>${fmtThanh(gcPending)} thanh</strong> (${liveLots.length} lô)
      </span>
      <span class="x2-stock-title" title="Tổng số thanh thành phẩm đã Gia công nhưng chưa được Chọn thanh">
        <i data-lucide="layers"></i> Tồn thành phẩm chờ Chọn thanh: <strong>${fmtThanh(ctPending)} thanh</strong>
      </span>`;
    initLucide();
  }

  // ─── Ô CHỌN LÔ (Gia công) + Ô LOẠI THANH (Chọn thanh) ──────────
  function fillXuong2BulligOptions() {
    const sel = document.getElementById('x2-bl-gc-lot');
    if (sel) {
      const cur = sel.value;
      const lots = bulligLotList();
      let html = lots.map(b => {
        const rem = bulligLotRemainingOf(b);
        return `<option value="${escapeHTML(b.id)}">${escapeHTML(b.code || '—')} · ${escapeHTML(b.location || '—')} · ${fmtThanh(b.quantity)} thanh${rem < b.quantity ? ` (còn ${fmtThanh(rem)})` : ''}</option>`;
      }).join('');
      if (!html) html = `<option value="" disabled>— Chưa có lô Bullig ở Kho (lô đã qua Sấy 2, Dùng Cho = Bullig) —</option>`;
      sel.innerHTML = html;
      if (cur && sel.innerHTML.includes(`value="${escapeHTML(cur)}"`)) sel.value = cur;
    }
    const ctSel = document.getElementById('x2-bl-ct-size');
    if (ctSel) {
      const cur = ctSel.value;
      const cands = bulligCtCandidates();
      let html = cands.map(c => `<option value="${escapeHTML(c.sizeKey)}">${comboLabel({ d: c.dims[0], r: c.dims[1], t: c.dims[2] })} — còn ${fmtThanh(c.remaining)} thanh</option>`).join('');
      if (!html) html = `<option value="">— Chưa có thành phẩm Gia công (hãy ghi lượt Gia công trước) —</option>`;
      ctSel.innerHTML = html;
      if (cur && ctSel.innerHTML.includes(`value="${escapeHTML(cur)}"`)) ctSel.value = cur;
      else if (cands.length) ctSel.value = cands[0].sizeKey;
    }
  }

  // ─── Gợi ý KÍCH THƯỚC THÀNH PHẨM (datalist từ lịch sử) ─────────
  function fillX2BulligOutSuggestions() {
    const dl = document.getElementById('x2-bl-out-list');
    if (!dl) return;
    dl.innerHTML = bulligOutSizeSuggestions()
      .map(s => `<option value="${escapeHTML(s.sizeKey)}"></option>`).join('');
  }

  // ─── GỢI Ý "/ TỐI ĐA" + CHIP "1 THANH THÔ = N THANH GIA CÔNG" ──
  // Đồng bộ mỗi lần chọn/bỏ chọn lô, đổi kích thước thành phẩm hoặc gõ số lượng.
  // Số nhập VƯỢT khả năng (hoặc chưa chọn lô nào mà đã nhập) → tô ĐỎ.
  function syncX2BulligQtyHint(totalTho, conv) {
    const c = conv || bulligConvertInfo('');
    const sum = Number(totalTho) || 0;
    const maxOut = Math.floor(sum * c.factor);
    const qty = Number((document.getElementById('x2-bl-gc-qty') || {}).value) || 0;
    const hint = document.getElementById('x2-bl-gc-total-hint');
    if (hint) {
      hint.textContent = `/ ${fmtThanh(maxOut)}`;
      hint.title = sum > 0
        ? `Gia công được TỐI ĐA ${fmtThanh(maxOut)} thanh = ${fmtThanh(sum)} thanh thô × ${fmtThanh(c.factor)} thanh/thô`
        : 'Chưa chọn lô nào — bấm "Mở danh sách lô Bullig" để chọn lô thanh thô';
      hint.classList.toggle('over', qty > maxOut);
    }
    const chip = document.getElementById('x2-bl-gc-conv-hint');
    if (chip) {
      chip.textContent = `1 thanh thô = ${fmtThanh(c.factor)} thanh gia công`;
      chip.title = c.rateName
        ? `Theo ĐỊNH MỨC "${c.rateName}" ở tab Kế Hoạch: 1 thanh thô làm được ${fmtThanh(c.factor)} thanh thành phẩm`
        : 'Chưa có định mức cho sản phẩm Bullig ở tab Kế Hoạch — tạm tính 1 thanh thô = 1 thanh thành phẩm (khai định mức với số thanh nan dạng "1/6" để đúng hệ số)';
      chip.classList.toggle('warn', !c.matched);
    }
  }

  // ─── Ô TỰ TÍNH của form (đổi theo công đoạn nhỏ) ───────────────
  function renderX2BulligCalc() {
    const box = document.getElementById('x2-bl-calc');
    if (!box) return;
    const kind = ((document.getElementById('x2-bl-kind') || {}).value) || 'gc';
    // Tổng THANH THÔ còn lại của các lô đã chọn (dùng cho gợi ý số lượng)
    const totalTho = bulligPickedTotal();
    // Kích thước thành phẩm đang nhập + HỆ SỐ QUY ĐỔI theo định mức Bullig
    const outV = ((document.getElementById('x2-bl-out') || {}).value || '').trim();
    const outDims = bulligParseOutDims(outV);
    const outKey = (outDims[0] > 0 && outDims[1] > 0 && outDims[2] > 0) ? dimKeyOf(outDims[0], outDims[1], outDims[2]) : '';
    const conv = bulligConvertInfo(outKey);
    const maxOut = Math.floor(totalTho * conv.factor);
    syncX2BulligQtyHint(totalTho, conv);
    if (kind === 'ct') {
      const ok = Number((document.getElementById('x2-bl-ct-ok') || {}).value) || 0;
      const err = Number((document.getElementById('x2-bl-ct-err') || {}).value) || 0;
      // THÀNH PHẨM sau Chọn thanh = ĐÚNG kích thước đã chọn ở ô Loại thanh
      const sizeKey = String((document.getElementById('x2-bl-ct-size') || {}).value || '');
      box.innerHTML = `
        <span class="x2-ong-calc-item x2-ong-calc-in" title="Thành phẩm sau Chọn thanh CHÍNH LÀ kích thước đã chọn (không đổi kích thước)"><span class="x2-ong-calc-label">Thành phẩm:</span><strong>${sizeKey ? escapeHTML(sizeKey) : '—'}</strong></span>
        <span class="x2-ong-calc-item" title="Tổng số thanh chọn = thanh đạt + thanh lỗi"><span class="x2-ong-calc-label">Tổng số lượng chọn:</span><strong>${fmtThanh(ok + err)} thanh</strong></span>
        <span class="x2-ong-calc-item" title="Tỷ lệ đạt = thanh đạt ÷ tổng số thanh chọn"><span class="x2-ong-calc-label">Tỷ lệ đạt:</span><strong>${ok + err > 0 ? fmtRatio((ok / (ok + err)) * 100) + '%' : '—'}</strong></span>
        <span class="x2-ong-calc-item x2-ong-calc-after" title="Loại thanh lấy từ thành phẩm Gia công — chọn xong TRỪ vào tồn thành phẩm"><span class="x2-ong-calc-label">Nguồn:</span><strong style="color:#0f766e;">thành phẩm Gia công</strong></span>`;
      return;
    }
    // GIA CÔNG (nguồn = phiếu xuất): tổng hợp từ BẢNG theo kích thước
    const gcs = bulligGcGroups();
    const tIn = gcs.reduce((s, g) => s + g.inQty, 0);
    let tQty = 0, tTho = 0, tErr = 0;
    gcs.forEach(g => {
      const qty = blNumDraft(blQtyDraft, g.key);
      const err = blNumDraft(blErrDraft, g.key);
      const f = blConvOf(g.key).factor;
      tQty += qty;
      tTho += f > 0 ? Math.round((qty / f) * 1000) / 1000 : qty;
      tErr += err;
    });
    const tTon = Math.max(0, Math.round((tIn - tTho - tErr) * 1000) / 1000);
    box.innerHTML = `
      <span class="x2-ong-calc-item x2-ong-calc-in" title="Tổng thanh thô CÒN LẠI của các phiếu xuất đã chọn (theo kích thước trong phiếu)"><span class="x2-ong-calc-label">Thô vào:</span><strong>${fmtThanh(tIn)} thanh</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-bo" title="Tổng số thanh THÀNH PHẨM gia công được (nhập trong bảng tổng hợp)"><span class="x2-ong-calc-label">Gia công:</span><strong>${fmtThanh(tQty)} thanh</strong></span>
      <span class="x2-ong-calc-item" title="Tổng thanh thô TƯƠNG ĐƯỢNG đã dùng = Σ (SL gia công ÷ hệ số định mức)"><span class="x2-ong-calc-label">Thô tương đương:</span><strong>${fmtThanh(tTho)} thanh</strong></span>
      <span class="x2-ong-calc-item" title="Tổng thanh THÔ LỖI nhập tay trong bảng tổng hợp"><span class="x2-ong-calc-label">Lỗi:</span><strong>${fmtThanh(tErr)} thanh</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-after" title="Tồn = vào − thô tương đương − lỗi — phần phiếu CHƯA dùng, làm tiếp ngày sau"><span class="x2-ong-calc-label">Tồn:</span><strong>${fmtThanh(tTon)} thanh</strong></span>
      <span class="x2-ong-calc-item" title="Kích thước thành phẩm nhập trong bảng tổng hợp (1 dòng/cỡ)"><span class="x2-ong-calc-label">K.thước TP:</span><strong>${blOutDraft.size ? [...blOutDraft.values()].filter(Boolean).join(' · ') : '—'}</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-after" title="Số thanh lấy từ PHIẾU XUẤT KHO mục đích Bullig (mục đích = Bullig)"><span class="x2-ong-calc-label">Nguồn:</span><strong style="color:#0f766e;">phiếu xuất Bullig</strong></span>`;
  }

  // ─── DANH SÁCH THẺ PHIẾU XUẤT (Gia công) — chọn được NHIỀU ─────
  function bulligPicked() { return state.x2BulligPicked || []; }
  // Tổng THANH THÔ còn lại của các PHIẾU đã chọn (nguồn mới = phiếu xuất mục Bullig)
  function bulligPickedTotal() {
    let total = 0;
    bulligPicked().forEach(id => {
      const p = (khoNoteInputPool('bullig', state.x2BulligEditId) || []).find(x => x.id === String(id));
      if (p && !p.pending) total += p.remaining;
    });
    return total;
  }
  function bulligClearPicks() { state.x2BulligPicked = []; }

  // Kích thước 1 lô: ưu tiên 3 trường Dài/Rộng/Dày, không có thì dùng mảng dimensions
  // → luôn hiện "1250 × 80 × 12 mm" (KHÔNG dùng parseDimList vì hàm đó SẮP XẾP LẠI giá trị)
  function bulligLotDimText(b) {
    const d = (Number(b.length) > 0 && Number(b.width) > 0 && Number(b.thickness) > 0)
      ? [b.length, b.width, b.thickness]
      : (Array.isArray(b.dimensions) && b.dimensions.length === 3 ? b.dimensions : null);
    if (!d) return '—';
    return comboLabel({ d: d[0], r: d[1], t: d[2] }) + ' mm';
  }
  // Kích thước lô GỌN (không khoảng trắng, không đơn vị): "1250×24×7" —
  // dùng cho dòng NGUỒN LÔ của bảng lịch sử: 1250×24×7(A1,2.016)
  function bulligLotSizeText(b) {
    const d = (Number(b.length) > 0 && Number(b.width) > 0 && Number(b.thickness) > 0)
      ? [b.length, b.width, b.thickness]
      : (Array.isArray(b.dimensions) && b.dimensions.length === 3 ? b.dimensions : null);
    return d ? `${Number(d[0])}×${Number(d[1])}×${Number(d[2])}` : '—';
  }
  // Số NGÀY đã ở từng công đoạn của 1 lô: { say1, say2, kho } — cùng cách đếm với
  // badge đếm ngày của THẺ NGUỒN "Thêm Lô Sấy Mới" (S1 cam · S2 xanh dương · K xanh lá)
  function bulligLotDaysOf(b) {
    const out = { say1: 0, say2: 0, kho: 0 };
    if (!b) return out;
    const hist = getBatchStageHistory(b);
    hist.forEach((h, idx) => {
      if (!h || !(h.stage in out)) return;
      out[h.stage] += getHistoryEntryDays(hist, idx) || 0;
    });
    return out;
  }

  // Mỗi PHIẾU XUẤT = 1 THẺ theo khuôn THẺ NGUỒN (`.al-card`, 2 DÒNG):
  //   Dòng 1 = "Xuất Bullig · dd/mm/yyyy · còn X/Y thanh"
  //   Dòng 2 = chip Bullig + chip "Chờ duyệt" (phiếu chưa duyệt — KHÔNG chọn được)
  //   title  = tooltip liệt kê kích thước & số lượng: "1250x18x7 SL:1500 · …"
  function renderX2BulligLotList() {
    const box = document.getElementById('x2-bl-gc-list');
    if (!box) return;
    const q = bulligNorm(String((document.getElementById('x2-bl-gc-search') || {}).value || ''));
    const pool = khoNoteInputPool('bullig', state.x2BulligEditId);
    const list = pool.filter(p => {
      if (!q) return true;
      const tip = khoNoteSizeTooltip(p.sizes);
      return bulligNorm(`${formatDateDDMMYY(p.date)} ${tip} ${((p.note && p.note.purposeNote) || '')}`).includes(q);
    });
    if (!list.length) {
      box.innerHTML = `<div class="al-empty">${pool.length
        ? '— Không có phiếu xuất nào khớp —'
        : '— Chưa có PHIẾU XUẤT KHO mục đích "Bullig" nào (tạo phiếu ở thẻ Kho Nan) —'}</div>`;
      initLucide(); return;
    }
    box.innerHTML = list.map(p => {
      const dateTxt = p.date ? formatDateDDMMYY(p.date) : '—';
      const qtyTxt = (p.total > 0 && p.remaining < p.total)
        ? `${fmtThanh(p.remaining)}/${fmtThanh(p.total)} thanh (còn)`
        : `${fmtThanh(p.remaining)} thanh`;
      const on = bulligPicked().includes(p.id);
      const main = `Xuất Bullig · ${dateTxt} · ${qtyTxt}`;
      const chips = [
        `<span class="al-use-tag use-bullig">Bullig</span>`,
        p.pending
          ? `<span class="al-day-badge day-pending" title="Phiếu chưa được Ban lãnh đạo duyệt — CHỌN ĐƯỢC SAU KHI DUYỆT">Chờ duyệt</span>`
          : `<span class="al-day-badge day-k" title="Số kích thước thanh thô trong phiếu">${p.sizes.length} kích thước</span>`
      ];
      const titleTxt = `Ngày xuất ${dateTxt} — ${khoNoteSizeTooltip(p.sizes)}`;
      return `<button type="button" class="al-card${on ? ' picked' : ''}${p.pending ? ' al-card-pending' : ''}" data-bl-pick="${escapeHTML(p.id)}" aria-pressed="${on ? 'true' : 'false'}"${p.pending ? ' aria-disabled="true"' : ''} title="${escapeHTML(titleTxt)}">
        <span class="al-card-body">
          <span class="al-card-main">${escapeHTML(main)}</span>
          <span class="al-card-sub">${chips.join(' ')}</span>
        </span>
      </button>`;
    }).join('');
    initLucide();
  }

  function bulligTogglePick(id) {
    const key = String(id || '');
    // Phiếu CHỜ DUYỆT → hiện nhưng CHỌN KHÔNG ĐƯỢC
    const p = (khoNoteInputPool('bullig', state.x2BulligEditId) || []).find(x => x.id === key);
    if (p && p.pending) {
      showToast('Phiếu này CHỜ DUYỆT — chọn được sau khi Ban lãnh đạo duyệt phiếu kho.', 'error');
      return;
    }
    const cur = bulligPicked();
    const i = cur.indexOf(key);
    if (i >= 0) cur.splice(i, 1); else cur.push(key);
    state.x2BulligPicked = cur;
  }

  function onBulligListClick(e) {
    const card = e.target.closest && e.target.closest('[data-bl-pick]');
    if (!card) return;
    bulligTogglePick(card.getAttribute('data-bl-pick'));
    renderX2BulligLotList();
    renderX2BulligGroups();     // bảng tổng hợp theo kích thước của các phiếu đã chọn
    renderX2BulligCalc();
  }

  // ─── BẢNG TỔNG HỢP GIA CÔNG theo KÍCH THƯỚC (nguồn = PHIẾU XUẤT) ──
  // Nháp theo kích thước: KT thành phẩm (text) · SL gia công được · SL thanh lỗi.
  // SL thô tương đương TỰ TÍNH = SL gia công ÷ hệ số định mức Bullig;
  // Tồn = vào − thô tương đương − lỗi (phần phiếu CHƯA dùng).
  const blOutDraft = new Map();    // sizeKey → text "1250x80x12"
  const blQtyDraft = new Map();    // sizeKey → SL gia công được (thành phẩm)
  const blErrDraft = new Map();    // sizeKey → SL thanh THÔ lỗi
  // Nhóm các kích thước CÒN LẠI của các phiếu Gia công đã chọn (gộp cùng cỡ)
  function bulligGcGroups() {
    const map = new Map();
    const exId = state.x2BulligEditId;
    bulligPicked().forEach(id => {
      const p = (khoNoteInputPool('bullig', exId) || []).find(x => x.id === String(id));
      if (!p || p.pending) return;
      p.sizes.forEach(s => {
        if (!(Number(s.remaining) > 0)) return;
        const cur = map.get(s.sizeKey) || { key: s.sizeKey, dims: s.dims, inQty: 0, noteIds: [] };
        cur.inQty += Number(s.remaining) || 0;
        if (!cur.noteIds.includes(p.id)) cur.noteIds.push(p.id);
        map.set(s.sizeKey, cur);
      });
    });
    return [...map.values()].sort((a, b) => b.inQty - a.inQty);
  }
  function blNumDraft(map, key) { return Math.max(0, Math.round(Number(map.get(key)) || 0)); }
  // Hệ số quy đổi cho 1 dòng (theo kích thước thành phẩm đang nhập)
  function blConvOf(key) {
    const raw = String(blOutDraft.get(key) || '').trim();
    const d = raw ? raw.split(/[x×*,;\s]+/).map(s => Number(String(s).trim())).filter(v => Number.isFinite(v) && v > 0) : [];
    const outKey = d.length >= 3 ? dimKeyOf(d[0], d[1], d[2]) : '';
    return bulligConvertInfo(outKey);
  }
  // Vẽ bảng tổng hợp (ẩn khi chưa chọn phiếu / đang ở Chọn thanh)
  function renderX2BulligGroups() {
    const box = document.getElementById('x2-bl-groups');
    if (!box) return;
    const kind = ((document.getElementById('x2-bl-kind') || {}).value) || 'gc';
    if (kind !== 'gc') { box.style.display = 'none'; box.innerHTML = ''; return; }
    const groups = bulligGcGroups();
    if (!groups.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = '';
    const rows = groups.map(g => {
      const raw = String(blOutDraft.get(g.key) || '');
      const qty = blNumDraft(blQtyDraft, g.key);
      const err = blNumDraft(blErrDraft, g.key);
      const conv = blConvOf(g.key);
      const tho = conv.factor > 0 ? Math.round((qty / conv.factor) * 1000) / 1000 : qty;
      const ton = Math.max(0, Math.round((g.inQty - tho - err) * 1000) / 1000);
      const inCell = `<span class="x2-nan-chip">${comboLabel({ d: g.dims[0], r: g.dims[1], t: g.dims[2] })}</span>${g.noteIds.length > 1 ? ` <small class="x2-btinh-src">${g.noteIds.length} phiếu</small>` : ''}`;
      return `<tr data-bl-row="${escapeHTML(g.key)}">
        <td class="x2-btinh-in-cell">${inCell}</td>
        <td class="text-right x2-btinh-qty-cell"><strong>${fmtThanh(g.inQty)}</strong></td>
        <td class="x2-btinh-out-cell"><input type="text" class="x2-btinh-out-text" data-bl-out="${escapeHTML(g.key)}" list="x2-bl-out-list" placeholder="VD: 1250x80x12" autocomplete="off" value="${escapeHTML(raw)}"></td>
        <td class="x2-btinh-ok-cell"><input type="number" class="x2-btinh-ok" data-bl-qty="${escapeHTML(g.key)}" min="0" step="1" placeholder="0" value="${qty ? qty : ''}"></td>
        <td class="text-right x2-btinh-ton-cell"><strong class="x2-bl-tho">${fmtThanh(tho)}</strong></td>
        <td class="x2-btinh-ok-cell"><input type="number" class="x2-btinh-ok" data-bl-err="${escapeHTML(g.key)}" min="0" step="1" placeholder="0" value="${err ? err : ''}"></td>
        <td class="text-right x2-btinh-ton-cell"><strong class="x2-btinh-ton">${fmtThanh(ton)}</strong></td>
      </tr>`;
    }).join('');
    box.innerHTML = `
      <div class="x2-btinh-groups-head">
        <i data-lucide="calculator"></i> Tổng hợp theo <strong>kích thước thanh thô trong phiếu xuất</strong> — nhập <strong>K.thước thành phẩm</strong> + <strong>SL gia công</strong> · <strong>Thô tương đương</strong> tự tính theo định mức · <strong>Tồn = vào − thô tương đương − lỗi</strong>
      </div>
      <div class="x2-btinh-group-scroll">
        <table class="data-table x2-btinh-group-table">
          <thead><tr>
            <th title="Kích thước thanh thô TRƯỚC khi gia công (trong phiếu xuất)">K.thước vào</th>
            <th class="text-right" title="Tổng thanh thô của kích thước này còn lại trong phiếu">SL vào</th>
            <th title="Kích thước THÀNH PHẨM làm ra (nhập 1 dòng, VD 1250x80x12)">K.thước thành phẩm</th>
            <th title="Số thanh THÀNH PHẨM gia công được">SL gia công</th>
            <th class="text-right" title="Số thanh thô TƯƠNG ĐƯỢNG = SL gia công ÷ hệ số định mức Bullig (tự tính)">Thô tương đương</th>
            <th title="Số thanh THÔ bị lỗi trong lúc gia công">SL lỗi</th>
            <th class="text-right" title="Tồn = vào − thô tương đương − lỗi — phần phiếu CHƯA dùng">Tồn</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    initLucide();
  }
  // Nhập liệu bảng tổng hợp Gia công (uỷ nhiệm 'input' trên #x2-bl-groups)
  function onBulligGroupInput(e) {
    const t = e && e.target;
    if (!t || typeof t.getAttribute !== 'function') return;
    const raw = t.value;
    const v = Number(raw);
    const bad = (raw === '' || raw == null || !Number.isFinite(v));
    const outKey = t.getAttribute('data-bl-out');
    if (outKey) { blOutDraft.set(outKey, String(raw || '').trim()); updateBulligGroupNumbers(); return; }
    const qtyKey = t.getAttribute('data-bl-qty');
    if (qtyKey) {
      if (bad) blQtyDraft.delete(qtyKey); else blQtyDraft.set(qtyKey, Math.max(0, Math.floor(v)));
      updateBulligGroupNumbers(); return;
    }
    const errKey = t.getAttribute('data-bl-err');
    if (errKey) {
      if (bad) blErrDraft.delete(errKey); else blErrDraft.set(errKey, Math.max(0, Math.floor(v)));
      updateBulligGroupNumbers(); return;
    }
  }
  // Cập nhật cột Thô tương đương + Tồn của TỪNG dòng (KHÔNG vẽ lại bảng → giữ con trỏ)
  function updateBulligGroupNumbers() {
    const box = document.getElementById('x2-bl-groups');
    if (!box || typeof box.querySelectorAll !== 'function') return;
    const rows = box.querySelectorAll('tr[data-bl-row]');
    if (!rows || !rows.length) return;
    bulligGcGroups().forEach((g, i) => {
      const row = rows[i];
      if (!row || typeof row.querySelector !== 'function') return;
      const qty = blNumDraft(blQtyDraft, g.key);
      const err = blNumDraft(blErrDraft, g.key);
      const conv = blConvOf(g.key);
      const tho = conv.factor > 0 ? Math.round((qty / conv.factor) * 1000) / 1000 : qty;
      const ton = Math.max(0, Math.round((g.inQty - tho - err) * 1000) / 1000);
      const thoEl = row.querySelector('.x2-bl-tho');
      const tonEl = row.querySelector('.x2-btinh-ton');
      if (thoEl) thoEl.textContent = fmtThanh(tho);
      if (tonEl) tonEl.textContent = fmtThanh(ton);
    });
  }

  // ─── ẨN/HIỆN FORM theo CÔNG ĐOẠN NHỎ ───────────────────────────
  // ─── RESET FORM BULLIG (về GIA CÔNG, trắng sạch) ───────────────
  function resetXuong2BulligForm() {
    state.x2BulligEditId = null;
    state.x2BulligLotOpen = false;   // đóng danh sách phiếu
    bulligClearPicks();
    blOutDraft.clear();
    blQtyDraft.clear();
    blErrDraft.clear();
    ['x2-bl-gc-qty', 'x2-bl-out', 'x2-bl-ct-ok', 'x2-bl-ct-err'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const d = document.getElementById('x2-bl-date');
    if (d) d.value = '';
    const kind = document.getElementById('x2-bl-kind');
    if (kind) kind.value = 'gc';
    fillXuong2BulligOptions();
    fillX2BulligOutSuggestions();
    renderX2BulligLotList();
    syncX2BulligKindRows();
    renderX2BulligGroups();
    renderX2BulligCalc();
    syncX2BulligEditBanner();
  }

  // Sau khi LƯU GHI MỚI: giữ ngày + công đoạn nhỏ + lựa chọn để nhập tiếp;
  // ─── LƯU FORM BULLIG (THÊM / SỬA) ──────────────────────────────
  function handleXuong2BulligSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const kind = syncX2BulligKindRows();
    const dateVal = (document.getElementById('x2-bl-date') || {}).value || '';
    if (!dateVal) { showToast('Ngày không được để trống!', 'error'); return; }
    const snap = hrBulligSnapshot(dateVal, kind);

    let payload;
    if (kind === 'ct') {
      // ── CHỌN THANH ──
      const sizeKey = ((document.getElementById('x2-bl-ct-size') || {}).value) || '';
      const cand = bulligCtCandidates().find(c => c.sizeKey === sizeKey);
      const remaining = cand ? bulligGcQtyOf(sizeKey) - bulligCtQtyOf(sizeKey) : 0;
      const ok = Number((document.getElementById('x2-bl-ct-ok') || {}).value) || 0;
      const err = Number((document.getElementById('x2-bl-ct-err') || {}).value) || 0;
      if (!sizeKey || !cand) { showToast('Hãy chọn Loại thanh (kích thước thành phẩm đã Gia công)!', 'error'); return; }
      if (!Number.isFinite(ok) || ok < 0 || !Number.isFinite(err) || err < 0) { showToast('Số lượng đạt/lỗi phải là số không âm!', 'error'); return; }
      if (ok + err <= 0) { showToast('Tổng số lượng chọn (đạt + lỗi) phải lớn hơn 0!', 'error'); return; }
      if (ok + err > remaining) { showToast(`Vượt số thanh còn lại của cỡ này (còn ${fmtThanh(remaining)} thanh)!`, 'error'); return; }
      const dims = cand.dims;
      const unitVol = dims[0] > 0 ? unitVolOf(dims[0], dims[1], dims[2]) : 0;
      payload = {
        kind: 'ct',
        date: dateVal,
        week: materialWeekLabel(dateVal),
        inSizeKey: sizeKey,
        inDims: dims,
        qtyOk: ok,
        qtyErr: err,
        unitVol,
        worker: snap.worker, workTime: snap.workTime,
        workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC
      };
    } else {
      // ── GIA CÔNG (nguồn = PHIẾU XUẤT mục Bullig — bảng tổng hợp theo kích thước) ──
      // Mỗi dòng = 1 kích thước: KT thành phẩm · SL gia công · SL thô tương đương
      // (÷ hệ số định mức) · SL thanh lỗi → phân bổ FIFO từ các phiếu đã chọn.
      const groups = bulligGcGroups();
      if (!bulligPicked().length) { showToast('Hãy chọn ít nhất 1 PHIẾU XUẤT mục đích "Bullig"!', 'error'); return; }
      if (!groups.length) { showToast('Chưa có kích thước nào trong các phiếu đã chọn!', 'error'); return; }
      const recs = [];
      let skipped = 0;
      for (const g of groups) {
        const raw = String(blOutDraft.get(g.key) || '').trim();
        const outDims = raw ? raw.split(/[x×*,;\s]+/).map(s => Number(String(s).trim())).filter(v => Number.isFinite(v) && v > 0).slice(0, 3) : [];
        const quantity = blNumDraft(blQtyDraft, g.key);
        const errTho = blNumDraft(blErrDraft, g.key);
        if (quantity <= 0 && errTho <= 0) { skipped++; continue; }
        if (quantity <= 0) {
          showToast(`Kích thước ${g.key}: nhập SỐ LƯỢNG GIA CÔNG ĐƯỢC (lớn hơn 0) — nhập rồi bấm Lưu!`, 'error');
          return;
        }
        if (outDims.length < 3 || !(outDims[0] > 0 && outDims[1] > 0 && outDims[2] > 0)) {
          showToast(`Kích thước ${g.key}: nhập KÍCH THƯỚC THÀNH PHẨM (VD 1250x80x12) cho dòng này!`, 'error');
          return;
        }
        const outSizeKey = dimKeyOf(outDims[0], outDims[1], outDims[2]);
        const conv = bulligConvertInfo(outSizeKey);
        const factor = conv.factor;
        const qtyIn = factor > 0 ? Math.round((quantity / factor) * 1000) / 1000 : quantity;
        const need = Math.round((qtyIn + errTho) * 1000) / 1000;
        if (need > g.inQty) {
          showToast(`Kích thước ${g.key}: thô tương đương (${fmtThanh(qtyIn)}) + lỗi (${fmtThanh(errTho)}) vượt SL vào (${fmtThanh(g.inQty)}) — kiểm tra lại!`, 'error');
          return;
        }
        // Phân bổ FIFO từ các PHIẾU đã chọn (phiếu cũ trước)
        const alloc = khoNoteAllocate(g.noteIds, g.key, need, state.x2BulligEditId);
        if (!alloc.ok) {
          showToast(`Kích thước ${g.key}: các phiếu đã chọn không đủ ${fmtThanh(need)} thanh thô (còn ${fmtThanh(alloc.left)})!`, 'error');
          return;
        }
        const unitVol = unitVolOf(outDims[0], outDims[1], outDims[2]);
        recs.push({
          kind: 'gc',
          date: dateVal,
          week: materialWeekLabel(dateVal),
          batchId: alloc.lots[0] ? alloc.lots[0].batchId : '',
          sources: alloc.lots.map(l => ({ batchId: l.batchId, code: l.code || '', qty: l.qty })),
          noteUses: alloc.uses,
          gcTotalPicked: g.inQty,
          quantity,                       // SỐ LƯỢNG GIA CÔNG ĐƯỢC (thành phẩm)
          qtyIn,                          // thanh thô thực dùng
          qtyErr: errTho,                 // thanh thô LỖI (cộng vào rút phiếu)
          convertFactor: factor,          // chốt hệ số lúc lưu (định mức đổi sau vẫn đúng)
          inSizeKey: g.key,               // kích thước THÔ nguồn (trong phiếu)
          inDims: g.dims,
          outDims,
          outSizeKey,
          unitVol,
          volume: Math.round(quantity * unitVol * 10000) / 10000,
          worker: snap.worker, workTime: snap.workTime,
          workHours: snap.workHours, workHoursHC: snap.workHoursHC, workHoursTC: snap.workHoursTC
        });
      }
      if (!recs.length) {
        showToast('Chưa nhập số liệu cho dòng nào — nhập K.thước thành phẩm + SL gia công rồi bấm Lưu!', 'error');
        return;
      }
      if (state.x2BulligEditId) {
        const rec = (state.xuong2BulligRecords || []).find(r2 => r2.id === state.x2BulligEditId);
        if (!rec) { showToast('Không tìm thấy lượt Bullig cần sửa!', 'error'); return; }
        Object.assign(rec, recs[0], { updatedAt: new Date().toISOString() });
        saveXuong2Bullig();
        showToast('Đã cập nhật lượt Gia công!', 'success');
        resetXuong2BulligForm();
      } else {
        (state.xuong2BulligRecords = state.xuong2BulligRecords || []);
        recs.forEach((rc, i) => {
          state.xuong2BulligRecords.push(Object.assign({
            id: 'x2bl-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 7),
            createdAt: new Date().toISOString()
          }, rc));
        });
        saveXuong2Bullig();
        showToast(`Đã ghi ${recs.length} lượt Gia công (Bullig)` + (skipped ? ` · bỏ qua ${skipped} dòng chưa nhập số liệu` : '') + '!', 'success');
        keepBulligFormAfterSave();
      }
      renderX2BulligCard();
      return;
    }

    if (state.x2BulligEditId) {
      const rec = (state.xuong2BulligRecords || []).find(r2 => r2.id === state.x2BulligEditId);
      if (!rec) { showToast('Không tìm thấy lượt Bullig cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong2Bullig();
      showToast('Đã cập nhật lượt Bullig!', 'success');
      resetXuong2BulligForm();
    } else {
      (state.xuong2BulligRecords = state.xuong2BulligRecords || []).push({
        id: 'x2bl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong2Bullig();
      showToast(`Đã ghi lượt ${bulligKindLabel(payload.kind)} (Bullig)!`, 'success');
      keepBulligFormAfterSave();
    }
    renderX2BulligCard();
  }

  // ─── SỬA / XÓA LƯỢT BULLIG ─────────────────────────────────────
  function editXuong2Bullig(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2BulligRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x2BulligEditId = id;
    const kindEl = document.getElementById('x2-bl-kind');
    if (kindEl) kindEl.value = rec.kind === 'ct' ? 'ct' : 'gc';
    syncX2BulligKindRows();
    const d = document.getElementById('x2-bl-date');
    if (d) d.value = rec.date || '';
    if (rec.kind === 'ct') {
      fillXuong2BulligOptions();
      const s = document.getElementById('x2-bl-ct-size');
      if (s) s.value = rec.inSizeKey || '';
      const ok = document.getElementById('x2-bl-ct-ok');
      if (ok) ok.value = Number(rec.qtyOk) || 0;
      const er = document.getElementById('x2-bl-ct-err');
      if (er) er.value = Number(rec.qtyErr) || 0;
    } else {
      blOutDraft.clear();
      blQtyDraft.clear();
      blErrDraft.clear();
      // Nguồn PHIẾU XUẤT: chọn lại đúng phiếu đã dùng (noteUses) hoặc dữ liệu cũ (lô)
      if (Array.isArray(rec.noteUses) && rec.noteUses.length) {
        const noteIds = [...new Set(rec.noteUses.map(u => String(u.noteId)))];
        state.x2BulligPicked = noteIds;
      } else {
        const srcs = Array.isArray(rec.sources) && rec.sources.length ? rec.sources : (rec.batchId ? [{ batchId: rec.batchId }] : []);
        state.x2BulligPicked = srcs.map(x => String(x.batchId || '')).filter(Boolean);
      }
      // Khôi phục BẢNG TỔNG HỢP theo dòng: kích thước THÔ nguồn (key) → TP · SL · lỗi
      const od0 = Array.isArray(rec.outDims) ? rec.outDims : [];
      const inKey = String(rec.inSizeKey ||
        (rec.inDims && rec.inDims.length === 3 ? dimKeyOf(rec.inDims[0], rec.inDims[1], rec.inDims[2]) : '') || '');
      if (inKey) {
        blOutDraft.set(inKey, (od0[0] > 0) ? `${od0[0]}x${od0[1]}x${od0[2]}` : '');
        blQtyDraft.set(inKey, Math.round(Number(rec.quantity) || 0));
        if (Number(rec.qtyErr)) blErrDraft.set(inKey, Math.round(Number(rec.qtyErr)));
      }
      fillXuong2BulligOptions();
      renderX2BulligLotList();
      renderX2BulligGroups();
      const q = document.getElementById('x2-bl-gc-qty');
      if (q) q.value = Number(rec.quantity) || 0;
      const outEl = document.getElementById('x2-bl-out');
      if (outEl) outEl.value = (od0[0] > 0) ? `${od0[0]}x${od0[1]}x${od0[2]}` : '';
    }
    fillX2BulligOutSuggestions();
    renderX2BulligCalc();
    syncX2BulligEditBanner();
  }

  function deleteXuong2Bullig(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2BulligRecords || []).find(r => r.id === id);
    if (!rec) return;
    const d = bulligDisplay(rec);
    const desc = rec.kind === 'ct'
      ? `${comboLabel({ d: d.inDims[0], r: d.inDims[1], t: d.inDims[2] })} · đạt ${fmtThanh(d.qtyOk)} / lỗi ${fmtThanh(d.qtyErr)} thanh`
      : `${fmtThanh(d.quantity)}/${fmtThanh(d.gcTotalPicked)} thanh · ${d.outSizeKey}`;
    if (!confirm(`Xóa lượt ${bulligKindLabel(rec.kind)} ngày ${formatDateDDMMYY(rec.date)} (${desc})?`)) return;
    trackDeleted('xuong2BulligRecords', id);
    state.xuong2BulligRecords = (state.xuong2BulligRecords || []).filter(r => r.id !== id);
    if (state.x2BulligEditId === id) resetXuong2BulligForm();
    saveXuong2Bullig();
    renderX2BulligCard();
    showToast('Đã xóa lượt Bullig!', 'success');
  }

  // ─── THỐNG KÊ NHANH CỦA VỊ TRÍ BULLIG ──────────────────────────
  function renderX2BulligStats() {
    const box = document.getElementById('x2-bl-stats');
    if (!box) return;
    const disp = (state.xuong2BulligRecords || []).map(bulligDisplay);
    const gc = disp.filter(d => d.kind === 'gc');
    const ct = disp.filter(d => d.kind === 'ct');
    const gcTho = gc.reduce((s, d) => s + d.qtyIn, 0);        // thanh THÔ đã dùng để gia công
    const gcOut = gc.reduce((s, d) => s + d.quantity, 0);     // SỐ THÀNH PHẨM gia công được
    const okQty = ct.reduce((s, d) => s + d.qtyOk, 0);
    const errQty = ct.reduce((s, d) => s + d.qtyErr, 0);
    const rate = (okQty + errQty) > 0 ? (okQty / (okQty + errQty)) * 100 : null;
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${gc.length}</span>
        <span class="material-stat-label">Lượt Gia công</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(gcTho)}</span>
        <span class="material-stat-label">Thanh thô đã Gia công</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(gcOut)}</span>
        <span class="material-stat-label">Thành phẩm Gia công được</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${ct.length}</span>
        <span class="material-stat-label">Lượt Chọn thanh</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(okQty)}</span>
        <span class="material-stat-label">Thanh Đạt (Chọn thanh)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtThanh(errQty)}</span>
        <span class="material-stat-label">Thanh Lỗi</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${rate == null ? '—' : fmtRatio(rate) + '%'}</span>
        <span class="material-stat-label">Tỷ lệ đạt (Chọn thanh)</span>
      </div>`;
  }

  // ─── BẢNG LỊCH SỬ BULLIG — NHÓM THEO NGÀY, THẺ NGÀY CHIA 2 VÙNG ──
  // 1 thẻ ngày chứa cả 2 công đoạn nhỏ chạy đồng thời:
  //   • VÙNG 1 "Gia công": nguồn lô · SL x/tổng đã chọn · K.thước thành phẩm · Thể tích
  //   • VÙNG 2 "Chọn thanh": Loại thanh · SL đạt · SL lỗi · Tổng · Tỷ lệ đạt
  // Đầu thẻ (chung): Ngày · Người làm 2 phân vị · Giờ HC/TC từng phân vị ·
  // Công suất + Hiệu suất TỪNG công đoạn (÷ định mức tháng tương ứng).
  function renderX2BulligTable() {
    const box = document.getElementById('x2-bl-day-cards');
    if (!box) return;
    const list = [...(state.xuong2BulligRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const countEl = document.getElementById('x2-bl-table-count');
    // TỔNG số thanh THÔ đã sử dụng của toàn bộ lịch sử (hiện ngay ở thanh tiêu đề)
    const totalTho = list.map(bulligDisplay).filter(d => d.kind === 'gc').reduce((s, d) => s + (Number(d.qtyIn) || 0), 0);
    if (countEl) countEl.textContent = list.length ? `${list.length} lượt Bullig · thô đã dùng ${fmtThanh(totalTho)} thanh` : '';
    if (!list.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="package"></i>
          <div>Chưa có lượt Bullig nào.<br>Chọn <strong>Công đoạn</strong> (Gia công / Chọn thanh) ở form trên rồi bấm <strong>Lưu Lượt Bullig</strong>.</div>
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
    for (const [date, rows] of groups) html += bulligDayCardHtml(date, rows);
    box.innerHTML = html;
    initLucide();
  }

  // Tính công suất + hiệu suất 1 công đoạn nhỏ trong ngày
  function bulligCapOf(disp, kind) {
    const rows = disp.filter(d => d.kind === kind);
    const qty = kind === 'ct'
      ? rows.reduce((s, d) => s + d.qtyOk + d.qtyErr, 0)
      : rows.reduce((s, d) => s + d.quantity, 0);
    const hours = rows.reduce((s, d) => s + (d.workHours || 0), 0);
    const date = disp.length ? disp[0].date : '';
    // Giờ SỰ CỐ CHO PHÉP được TRỪ khỏi giờ làm khi tính CÔNG SUẤT → HIỆU SUẤT
    const hoursEff = stageEffHours('bullig', date, hours);
    const incH = stageIncidentOf('bullig', date);
    const cap = hoursEff > 0 ? (qty / hoursEff) : null;
    const rate = bulligRateOf(date, kind);
    const eff = (cap != null && rate) ? (cap / rate) * 100 : null;
    return { qty, hours, hoursEff, incH, cap, rate, eff };
  }

  // Nhãn Hiệu suất của 1 công đoạn nhỏ (kèm tooltip giải thích cách tính)
  function bulligEffHtml(capInfo, kindLabel) {
    const eff = capInfo.eff;
    const effTxt = eff == null
      ? '<em style="color:var(--text-muted);">—</em>'
      : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
    const effTip = eff == null
      ? `Chưa đủ dữ liệu (thiếu giờ ${kindLabel} / giờ sự cố ≥ giờ làm, hoặc chưa đặt Định mức công suất ${kindLabel} cho tháng này)`
      : `Hiệu suất = Công suất thực tế (${fmtThanh(capInfo.cap)} thanh/h = ${fmtThanh(capInfo.qty)} thanh ÷ ${fmtRatio(capInfo.hoursEff)} giờ${capInfo.incH > 0 ? ` [đã trừ ${fmtGio(capInfo.incH)}h sự cố]` : ''}) ÷ Định mức ${kindLabel} (${fmtThanh(capInfo.rate)} thanh/h)`;
    return `<span class="x2-day-eff" title="${escapeHTML(effTip)}">H.suất ${kindLabel}: <strong>${effTxt}</strong></span>`;
  }

  // 1 DÒNG NHÁNH VÙNG 1: GIA CÔNG — nguồn lô ghi rõ KÍCH THƯỚC + PHÂN LOẠI +
  // SỐ LƯỢNG thô: "1250×24×7(A1,2.016)" · SL gia công được / tối đa · k.thước TP
  function bulligGcRowHtml(d) {
    const srcTxt = d.lots.length
      ? d.lots.map(x => `${bulligLotSizeText(x.batch)}(${escapeHTML(x.batch.bambooType || '—')},${fmtThanh(x.qty)})`).join(' + ')
      : '—';
    const lotCodes = d.lots.map(x => x.batch.code || '—').filter(Boolean).join(' + ');
    return `
      <tr class="x2-day-row" data-x2-bl-row="${escapeHTML(d.id)}">
        <td>${srcTxt}<div class="x2-row-note">Lô ${escapeHTML(lotCodes || '—')}${d.materialType ? ` · ${escapeHTML(d.materialType)}` : ''}${d.supplier ? ` · NCC ${escapeHTML(d.supplier)}` : ''}</div></td>
        <td class="text-right"><strong>${fmtThanh(d.quantity)}</strong> <small style="color:var(--text-muted);">/ ${fmtThanh(d.maxOut)} thanh</small><div class="x2-row-note">Thô dùng: ${fmtThanh(d.qtyIn)} thanh (1 thô = ${fmtThanh(d.convertFactor)})</div></td>
        <td><span class="x2-nan-chip">${escapeHTML(d.outSizeKey || '—')}</span></td>
        <td class="text-right"><strong style="color:#0f766e;">${d.volume.toFixed(4)}</strong> <small style="color:var(--text-muted);">m³</small></td>
        <td class="text-right">
          <button class="btn btn-icon btn-outline" title="Sửa" data-x2-bl-edit="${escapeHTML(d.id)}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-icon btn-danger" title="Xóa" data-x2-bl-delete="${escapeHTML(d.id)}"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
  }

  // 1 DÒNG NHÁNH VÙNG 2: CHỌN THANH (Loại thanh = THÀNH PHẨM sau Chọn thanh ·
  // đạt · lỗi · tổng · tỷ lệ đạt)
  function bulligCtRowHtml(d) {
    const rate = (d.qtyOk + d.qtyErr) > 0 ? (d.qtyOk / (d.qtyOk + d.qtyErr)) * 100 : null;
    return `
      <tr class="x2-day-row" data-x2-bl-row="${escapeHTML(d.id)}">
        <td><span class="x2-nan-chip">${escapeHTML(d.inSizeKey || '—')}</span><div class="x2-row-note">Thành phẩm sau Gia công = đúng kích thước này</div></td>
        <td class="text-right"><strong style="color:#16a34a;">${fmtThanh(d.qtyOk)}</strong></td>
        <td class="text-right"><strong style="color:#b45309;">${fmtThanh(d.qtyErr)}</strong></td>
        <td class="text-right"><strong>${fmtThanh(d.inQty)}</strong> <small style="color:var(--text-muted);">thanh</small></td>
        <td class="text-right">${rate == null ? '—' : `<strong style="color:${rate >= 90 ? '#16a34a' : '#b45309'};">${fmtRatio(rate)}%</strong>`}</td>
        <td class="text-right">
          <button class="btn btn-icon btn-outline" title="Sửa" data-x2-bl-edit="${escapeHTML(d.id)}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-icon btn-danger" title="Xóa" data-x2-bl-delete="${escapeHTML(d.id)}"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
  }

  // 1 THẺ NGÀY của vị trí Bullig — chia 2 VÙNG công đoạn nhỏ trên CÙNG thẻ
  function bulligDayCardHtml(date, rows) {
    const disp = rows.map(bulligDisplay);
    const gcDisp = disp.filter(d => d.kind === 'gc');
    const ctDisp = disp.filter(d => d.kind === 'ct');
    // Người làm + giờ HC/TC: dữ liệu SỐNG từ Bảng bố trí; mất bố trí → snapshot lượt
    const liveGc = hrBulligGcAssignmentsOf(date);
    const liveCt = hrBulligCtAssignmentsOf(date);
    const workerBlock = (live, snapRows, label) => {
      const workers = live.length
        ? live.map(a => ({ name: a.name, time: posTimeStr(a) }))
        : snapRows;
      if (!workers.length) return '';
      const main = `${escapeHTML(workers[0].name)}${workers[0].time ? ` (${escapeHTML(workers[0].time)})` : ''}`;
      const more = workers.length > 1
        ? `<em class="x2-day-cutters-more" title="Người khác cùng ngày: ${escapeHTML(workers.slice(1).map(x => `${x.name}${x.time ? ` (${x.time})` : ''}`).join(', '))}">+${workers.length - 1} người khác</em>`
        : '';
      return `<span class="x2-day-cutters" title="Người ${label} — tự động từ Bảng bố trí vị trí '${label}' (tab Nhân Sự) đúng ngày">
        <i data-lucide="users"></i> ${label}: ${main} ${more}</span>`;
    };
    const spGc = liveGc.length ? sumPosHoursSplit(liveGc, date) : null;
    const spCt = liveCt.length ? sumPosHoursSplit(liveCt, date) : null;
    const hoursTxt = (sp) => {
      if (!sp) return '<em style="color:var(--text-muted);">—</em>';
      return `<span class="x2-hours-hc">${fmtRatio(sp.hc)}h HC</span><span class="x2-hours-tc">${fmtRatio(sp.tc)}h TC</span>`;
    };
    const hoursTip = 'Thời gian = tổng giờ công phân vị trong ngày (từ tab Nhân Sự), tách giờ hành chính (HC) / giờ tăng ca (TC)';
    const gcCap = bulligCapOf(disp, 'gc');
    const ctCap = bulligCapOf(disp, 'ct');
    const gcWorkerRows = gcDisp.length ? gcDisp[0].workerRows : [];
    const ctWorkerRows = ctDisp.length ? ctDisp[0].workerRows : [];
    const gcRows = gcDisp.map(d => bulligGcRowHtml(d)).join('');
    const ctRows = ctDisp.map(d => bulligCtRowHtml(d)).join('');
    // TỔNG của ngày: thành phẩm gia công được + TỔNG SỐ THANH THÔ ĐÃ SỬ DỤNG
    const gcOutSum = gcDisp.reduce((s, d) => s + (Number(d.quantity) || 0), 0);
    const gcThoSum = gcDisp.reduce((s, d) => s + (Number(d.qtyIn) || 0), 0);
    const ctOkSum = ctDisp.reduce((s, d) => s + (Number(d.qtyOk) || 0), 0);
    const ctErrSum = ctDisp.reduce((s, d) => s + (Number(d.qtyErr) || 0), 0);
    const ctRate = (ctOkSum + ctErrSum) > 0 ? (ctOkSum / (ctOkSum + ctErrSum)) * 100 : null;
    const gcFoot = gcDisp.length
      ? `<tfoot><tr class="x2-bl-day-total"><td colspan="2">Tổng ngày: <strong>${fmtThanh(gcOutSum)}</strong> thanh gia công được</td><td colspan="3" class="text-right">Tổng số thanh thô đã sử dụng: <strong>${fmtThanh(gcThoSum)}</strong> thanh</td></tr></tfoot>`
      : '';
    const ctFoot = ctDisp.length
      ? `<tfoot><tr class="x2-bl-day-total"><td colspan="6">Tổng ngày: đạt <strong>${fmtThanh(ctOkSum)}</strong> · lỗi <strong>${fmtThanh(ctErrSum)}</strong> · tổng <strong>${fmtThanh(ctOkSum + ctErrSum)}</strong> thanh${ctRate == null ? '' : ` · Tỷ lệ đạt <strong>${fmtRatio(ctRate)}%</strong>`}</td></tr></tfoot>`
      : '';
    const emptyZone = (msg) => `
      <tr class="x2-day-row"><td colspan="5" style="color:var(--text-muted); font-style:italic; text-align:center; padding:8px;">${msg}</td></tr>`;
    return `
      <div class="x2-day-card">
        <div class="x2-day-head">
          <span class="x2-day-date"><i data-lucide="calendar"></i> ${formatDateDDMMYY(date)}</span>
          ${workerBlock(liveGc, gcWorkerRows, 'Gia công')}
          ${workerBlock(liveCt, ctWorkerRows, 'Chọn thanh')}
          <span class="x2-day-hours" title="${escapeHTML(hoursTip)}">Giờ Gia công: ${hoursTxt(spGc)}</span>
          <span class="x2-day-hours" title="${escapeHTML(hoursTip)}">Giờ Chọn thanh: ${hoursTxt(spCt)}</span>
          <span class="x2-day-cap" title="Công suất Gia công = tổng thanh thô gia công ÷ tổng giờ Gia công">CS Gia công: <strong>${gcCap.cap != null ? `${fmtThanh(gcCap.cap)} thanh/h` : '—'}</strong></span>
          ${bulligEffHtml(gcCap, 'Gia công')}
          <span class="x2-day-cap" title="Công suất Chọn thanh = tổng thanh chọn (đạt + lỗi) ÷ tổng giờ Chọn thanh">CS Chọn: <strong>${ctCap.cap != null ? `${fmtThanh(ctCap.cap)} thanh/h` : '—'}</strong></span>
          ${bulligEffHtml(ctCap, 'Chọn thanh')}
          ${stageIncidentInputHtml('bullig', date)}
        </div>
        <!-- VÙNG 1: GIA CÔNG -->
        <div class="x2-bl-zone-head x2-bl-zone-gc"><i data-lucide="wrench"></i> Gia công — Chọn thanh thô từ lô Bullig (Kho)</div>
        <table class="data-table x2-day-table">
          <thead>
            <tr>
              <th>Nguồn lô Kho (Kích thước · Phân loại · Số lượng thô)</th>
              <th class="text-right">SL gia công được (x/tối đa)</th>
              <th>K.thước thành phẩm</th>
              <th class="text-right">Thể tích</th>
              <th class="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>${gcRows || emptyZone('Chưa có lượt Gia công nào trong ngày.')}</tbody>
          ${gcFoot}
        </table>
        <!-- VÙNG 2: CHỌN THANH -->
        <div class="x2-bl-zone-head x2-bl-zone-ct"><i data-lucide="check-square"></i> Chọn thanh — thành phẩm Gia công</div>
        <table class="data-table x2-day-table">
          <thead>
            <tr>
              <th>Loại thanh = THÀNH PHẨM sau Chọn thanh</th>
              <th class="text-right">SL Đạt</th>
              <th class="text-right">SL Lỗi</th>
              <th class="text-right">Tổng chọn (tự tính)</th>
              <th class="text-right">Tỷ lệ đạt</th>
              <th class="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>${ctRows || emptyZone('Chưa có lượt Chọn thanh nào trong ngày.')}</tbody>
          ${ctFoot}
        </table>
      </div>`;
  }

  // ─── RENDER BẢNG CHI TIẾT BULLIG ──────────────────────────────
  function renderX2BulligCard() {
    fillXuong2BulligOptions();     // ô chọn lô (Gia công) + ô Loại thanh (Chọn thanh)
    fillX2BulligOutSuggestions();  // gợi ý kích thước thành phẩm từ lịch sử
    renderX2BulligStockBar();      // thanh tồn: thanh thô chờ Gia công + thành phẩm chờ Chọn
    renderX2BulligRateBar();       // định mức công suất theo tháng + công đoạn (thanh/h)
    renderX2BulligStats();
    renderX2BulligTable();         // thẻ ngày chia 2 vùng Gia công / Chọn thanh
    renderX2BulligLotList();
    syncX2BulligKindRows();
    renderX2BulligCalc();
    syncX2BulligEditBanner();
    updateXuong2CardCounts();
  }

  // Banner cam "đang sửa" của form Bullig
  function syncX2BulligEditBanner() {
    const banner = document.getElementById('x2-bl-edit-banner');
    const text = document.getElementById('x2-bl-edit-text');
    if (!banner || !text) return;
    if (state.x2BulligEditId) {
      const rec = (state.xuong2BulligRecords || []).find(r => r.id === state.x2BulligEditId);
      text.textContent = rec
        ? `Đang sửa lượt ${bulligKindLabel(rec.kind)} ngày ${formatDateDDMMYY(rec.date)}.`
        : 'Đang sửa lượt Bullig.';
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  // Thu gọn / mở rộng BẢNG LỊCH SỬ Bullig (form vẫn hiện để tiếp tục nhập)
  function toggleX2BulligTable() {
    const wrap = document.getElementById('x2-bl-table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('x2-cut-collapsed');
    initLucide();
  }

  // Sau khi LƯU GHI MỚI: giữ ngày + công đoạn nhỏ để nhập tiếp; XOÁ bảng tổng hợp cũ
  function keepBulligFormAfterSave() {
    state.x2BulligEditId = null;
    ['x2-bl-gc-qty', 'x2-bl-ct-ok', 'x2-bl-ct-err'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    bulligClearPicks();
    blOutDraft.clear();
    blQtyDraft.clear();
    blErrDraft.clear();
    fillXuong2BulligOptions();
    renderX2BulligLotList();
    renderX2BulligGroups();
    renderX2BulligCalc();
    syncX2BulligEditBanner();
  }

  // ─── ẨN/HIỆN FORM theo CÔNG ĐOẠN NHỎ ───────────────────────────
  // Danh sách THẺ LÔ (Gia công) chỉ mở khi người dùng bấm nút "Mở danh sách lô"
  // (cờ state.x2BulligLotOpen) — vẽ lại thẻ KHÔNG tự mở, và chuyển sang
  // "Chọn thanh" thì luôn ẩn.
  function syncX2BulligKindRows() {
    const kind = ((document.getElementById('x2-bl-kind') || {}).value) || 'gc';
    const gc = kind !== 'ct';
    const lotOpen = !!state.x2BulligLotOpen;
    const set = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
    // Hàng 1: nút MỞ DANH SÁCH PHIẾU (đứng chung hàng với Ngày + Công Đoạn)
    set('x2-bl-gc-btn-group', gc);
    // Hàng 2 (CŨ): K.thước thành phẩm + Số lượng — ĐÃ THAY bằng BẢNG TỔNG HỢP theo
    // kích thước trong phiếu xuất (#x2-bl-groups) → ẩn hẳn hàng cũ.
    set('x2-bl-gc-group', false);
    set('x2-bl-ct-size-group', !gc);
    set('x2-bl-ct-ok-group', !gc);
    set('x2-bl-ct-err-group', !gc);
    renderX2BulligGroups();
    // KHUNG DANH SÁCH LÔ = dropdown NỔI (portal ra overlay — không đẩy form xuống)
    const pick = document.getElementById('x2-bl-gc-picker');
    const wantOpen = gc && lotOpen;
    if (pick && pick.hidden !== !wantOpen) {
      if (wantOpen) x2FloatShow('x2-bl-gc-picker', 'x2-bl-gc-btn');
      else x2FloatHide('x2-bl-gc-picker', 'x2-bl-gc-btn');
    }
    return kind;
  }

  // ─── NẠP DỮ LIỆU BULLIG ────────────────────────────────────────
  function loadXuong2Bullig() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG2_BULLIG);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.xuong2BulligRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.xuong2BulligRecords = []; }
    } else {
      state.xuong2BulligRecords = [];
    }
  }

  function saveXuong2Bullig() {
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_BULLIG, JSON.stringify(state.xuong2BulligRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    logDataChange(['xuong2BulligRecords']);
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }

  // ═══════════════════════════════════════════════════════════
  // VỊ TRÍ: BÀO TINH — Xưởng 2 (thẻ launcher tab Công Đoạn)
  // ═══════════════════════════════════════════════════════════
  // Mỗi lượt ghi: NGÀY BÀO · LOẠI BÀO · nguồn thanh ("Chọn thanh") ·
  // KÍCH THƯỚC SAU BÀO · SL thanh ĐẠT · SL thanh LỖI.
  //   • Loại bào = 'tinh'      → nguồn = LÔ ĐANG Ở KHO (thanh đã qua Sấy 2).
  //                              Bào 1 phần được: số dùng = đạt + lỗi, lô còn lại hiện "còn X thanh".
  //   • Loại bào = 'ha_cap'    → nguồn = THANH LỖI sinh ra ở công đoạn Bào Tinh,
  //                              gom THEO CỠ (kích thước sau bào) để hạ cấp lại.
  //   • Loại bào = 'bao_thanh' → NGUỒN TỰ ĐỘNG + LINK QC:
  //       ① CHỌN THANH ĐẦU VÀO = danh sách cỡ thanh lấy từ ÉP VÁN (khối "Ván Thô
  //          Tạo Ra" — thanh BÁN THÀNH PHẨM nhận diện BẰNG THỂ TÍCH: thể tích 1
  //          thanh < BAO_THANH_PIECE_MAX_VOL 0,0015 m³; ván thô 1220×2440×9 =
  //          0,0268 m³ bị loại) + thanh LỖI của Bào thanh (để bào nhỏ tận dụng).
  //          Thẻ hiện "còn X / Y thanh" (Y = 0 → làm mờ, không chọn được).
  //          ⚠ CẢ 2 NHÓM ĐỀU KHÔNG LỌC THEO CẶP TUẦN (đã bỏ lọc theo tuần).
  //       ② SỐ LƯỢNG = số thanh đem bào (≤ phần còn lại của nguồn).
  //       ③ ĐẦU RA = dropdown nổi: 4 cỡ mặc định (BAO_THANH_OUT_DEFAULT) + cỡ
  //          người dùng thêm (nút "Thêm") — LỌC theo nguyên tắc
  //          Rộng_vào × Dày_vào > Rộng_ra × Dày_ra.
  //       ④ SỐ LƯỢNG ĐẠT = LINK từ tab QC ("Kiểm thanh" — thẻ Kiểm Sau Sản Xuất):
  //          Σ (Đạt + Ngoại lệ) của các lượt kiểm cùng cỡ, PHÂN BỔ FIFO theo ngày
  //          để nhiều lượt cùng cỡ không cộng trùng. Lỗi = đã kiểm − đạt;
  //          "chờ kiểm" = vào − đã kiểm. CHƯA kiểm → đạt 0 (KHÔNG bịa lỗi).
  //   • NGƯỜI BÀO + THỜI GIAN tự động từ Bảng bố trí Nhân Sự (Xưởng 2, đúng ngày,
  //     vị trí chứa "bào tinh" hoặc "bào thanh"; giờ tách HC/TC theo cửa sổ ca)
  //   • ĐỊNH MỨC CÔNG SUẤT theo THÁNG (THANH/GIỜ) → Hiệu suất = Công suất ÷ Định mức
  // Dữ liệu: state.xuong2BaoTinhRecords (localStorage + file + mây, tombstone).
  const BAO_TINH_KINDS = [
    { id: 'tinh',      label: 'Bào tinh' },
    { id: 'ha_cap',    label: 'Bào tinh hạ cấp' },
    { id: 'bao_thanh', label: 'Bào thanh' }
  ];
  // Cỡ ĐẦU RA mặc định của "Bào thanh" (Dài×Rộng×Dày mm) — 4 cỡ hay dùng
  const BAO_THANH_OUT_DEFAULT = ['640x14x12', '640x12x10', '1200x10x10', '1200x10x8'];
  // NGƯỠNG THỂ TÍCH 1 THANH (m³): dưới ngưỡng = THANH BÁN THÀNH PHẨM của Ép Ván
  // (ván thô 1220×2440×9 = 0,0268 m³ · 1200×600×9 = 0,00648 m³ ⇒ bị loại;
  //  thanh BTP 1200×18×15 = 0,000324 m³ · 1200×38×16 = 0,00073 m³ ⇒ được nhận)
  const BAO_THANH_PIECE_MAX_VOL = 0.0015;

  // ─── CỠ ĐẦU RA KHAI BÁO THÊM (localStorage + file + mây) ──────
  function loadX2BaoThanhOutSizes() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_BAO_THANH_OUT_SIZES);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.x2BaoThanhOutSizes = Array.isArray(arr) ? arr.filter(v => String(v || '').trim()) : [];
      } catch (e) { state.x2BaoThanhOutSizes = []; }
    } else {
      state.x2BaoThanhOutSizes = [];
    }
  }
  function saveX2BaoThanhOutSizes() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_BAO_THANH_OUT_SIZES, JSON.stringify(state.x2BaoThanhOutSizes || []));
    } catch (err) { /* bộ nhớ đầy — bỏ qua, vẫn còn trên state */ }
    logDataChange(['x2BaoThanhOutSizes']);
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
  }
  // Danh sách cỡ đầu ra đang dùng = 4 cỡ MẶC ĐỊNH + cỡ khai báo THÊM (bỏ trùng)
  function baoThanhOutList() {
    const defaultKeys = new Set();
    BAO_THANH_OUT_DEFAULT.forEach(raw => {
      const dims = baoThanhParseDims(raw);
      if (dims) defaultKeys.add(dimKeyOf(dims[0], dims[1], dims[2]));
    });
    const out = [];
    const seen = new Set();
    BAO_THANH_OUT_DEFAULT.concat(Array.isArray(state.x2BaoThanhOutSizes) ? state.x2BaoThanhOutSizes : [])
      .forEach(raw => {
        const dims = baoThanhParseDims(raw);
        if (!dims) return;
        const key = dimKeyOf(dims[0], dims[1], dims[2]);
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ sizeKey: key, dims, isDefault: defaultKeys.has(key) });
      });
    return out;
  }

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

  // ─── TỒN THANH LỖI THEO CỠ ────────────────────────────────────
  // Tổng lỗi = Σ lỗi của MỌI lượt bào tinh ghi ra cỡ đó (loại 'bao_thanh' đọc
  // LIVE từ tab QC). Số "đã dùng" = Σ của các lượt HẠ CẤP + Σ của các lượt
  // BÀO THANH lấy nguồn "thanh lỗi" (inSource 'defect') + phiếu kho đã duyệt.
  // VD: bào 500 thanh ra 480 đạt + 20 lỗi (cỡ 1240×16×6) → lỗi cỡ đó = 20;
  // hạ cấp dùng 15 → còn 5.
  // THAM SỐ TÙY CHỌN (mặc định = hành vi cũ, không truyền là như trước):
  // • `excludeId` — bỏ qua lượt đang SỬA khi tính phần đã dùng (trả lại phần của nó).
  // • `totalKinds` — mảng LOẠI bào được tính vào TỔNG (VD ['bao_thanh'] = chỉ đếm
  //   LỖI ĐẦU RA của Bào thanh → dùng cho ô chọn đầu vào của chính Bào thanh;
  //   không truyền = đếm tất cả tinh / ha_cap / bao_thanh).
  function baoTinhDefectStock(excludeId, totalKinds) {
    const recs = state.xuong2BaoTinhRecords || [];
    const kinds = Array.isArray(totalKinds) && totalKinds.length ? totalKinds : null;
    const map = new Map();
    recs.forEach(r => {
      if (kinds && kinds.indexOf(String(r.kind || '')) < 0) return;   // không tính loại này vào TỔNG
      const dims = Array.isArray(r.outDims) ? r.outDims.map(Number) : [0, 0, 0];
      const sizeKey = String(r.outSizeKey || dimKeyOf(dims[0], dims[1], dims[2]));
      if (!sizeKey) return;
      const cur = map.get(sizeKey) || { sizeKey, dims, total: 0, used: 0 };
      // 'bao_thanh' → LỖI đọc LIVE từ tab QC (qtyErr lưu là 0); loại khác đọc số đã lưu
      cur.total += baoTinhQtyErrOf(r);
      map.set(sizeKey, cur);
    });
    recs.forEach(r => {
      if (excludeId && r.id === excludeId) return;   // lượt đang SỬA → không trừ phần của nó
      let usedKey = '', usedQty = 0;
      if (r.kind === 'ha_cap') {
        // Lượt HẠ CẤP lấy thanh lỗi của cỡ đó (thanh vào = số lấy ra)
        usedKey = String(r.defectKey || '');
        usedQty = baoTinhQtyInOf(r);
      } else if (r.kind === 'bao_thanh' && String(r.inSource || '') === 'defect') {
        // Lượt BÀO THANH lấy lại thanh lỗi (nguồn 'defect') — trừ vào CỠ ĐẦU VÀO
        usedKey = String(r.inSizeKey || '');
        usedQty = Number(r.inQty) || 0;
      } else return;
      const cur = map.get(usedKey);
      if (cur) cur.used += usedQty;
    });
    // PHIẾU KHO ĐÃ DUYỆT (tiêu hủy / tái chế thanh lỗi Bào Tinh) — trừ phần đã xử lý
    khoApprovedScrapNotes('baotinh_loi').forEach(n => {
      const cur = map.get(String(n.sizeKey || ''));
      if (cur) cur.used += Number(n.qty) || 0;
    });
    return [...map.values()]
      .map(x => ({ ...x, remaining: Math.max(0, x.total - x.used) }))
      .sort((a, b) => b.remaining - a.remaining);
  }
  function baoTinhDefectStockOf(sizeKey) {
    const key = String(sizeKey || '');
    return baoTinhDefectStock().find(x => x.sizeKey === key) || null;
  }

  // ─── NGUỒN ĐẦU VÀO CỦA "BÀO THANH" (2 NHÓM: thanh BTP Ép Ván + thanh lỗi của chính Bào thanh) ──
  // ① THANH BTP ÉP VÁN — NHẬN DIỆN BẰNG THỂ TÍCH 1 THANH < BAO_THANH_PIECE_MAX_VOL
  //   (0,0015 m³): đọc khối "Ván Thô Tạo Ra" của lượt ép (`pressRecord.vanTho[].vtDim`)
  //   — ván thô 1220×2440×9 = 0,0268 m³ · 1200×600×9 = 0,00648 m³ ⇒ LOẠI;
  //   thanh BTP 1200×18×15 = 0,000324 m³ ⇒ nhận. LOẠI nhóm sản phẩm BULLIG (Định mức
  //   nanUse / tên sản phẩm). KHÔNG đọc `fpDim` (đã tính ra từ vanTho → đọc cả 2 nhân đôi).
  // ② THANH LỖI CỦA BÀO THANH — xem baoThanhDefectPool() (dưới đây).
  // ⚠ KHÔNG LỌC THEO CẶP TUẦN cho cả 2 nhóm (đã bỏ — hàng có thể tồn lâu hơn 1 cặp tuần).
  // Số thanh của 1 cỡ ĐÃ DÙNG = Σ inQty của các lượt Bào thanh cùng inSizeKey (trừ lượt
  // đang sửa) — với nguồn 'defect' phần này nằm ở baoTinhDefectStock(excludeId, ['bao_thanh']).
  function baoThanhQtyInUsedOf(sizeKey, excludeId) {
    const key = String(sizeKey || '');
    if (!key) return 0;
    return (state.xuong2BaoTinhRecords || []).reduce((s, r) => {
      if (!r || r.kind !== 'bao_thanh' || r.id === excludeId) return s;
      if (String(r.inSizeKey || '') !== key) return s;
      return s + (Number(r.inQty) || 0);
    }, 0);
  }
  // Lượt ép thuộc NHÓM SẢN PHẨM BULLIG? → KHÔNG lấy làm nguồn đầu vào Bào thanh
  function baoThanhIsBulligPress(r) {
    if (!r) return false;
    const rate = (state.materialRates || []).find(x => x && String(x.id) === String(r.productId));
    if (rate) return rateNanUse(rate) === 'Bullig';
    return /bullig/i.test(String(r.productName || ''));
  }
  // Tồn thanh BÁN THÀNH PHẨM (Ép Ván) theo cỡ — LOẠI nhóm Bullig, KHÔNG lọc theo tuần
  function baoThanhPressPool() {
    const ex = state.x2BaoTinhEditId || '';
    const map = new Map();
    (state.pressRecords || []).forEach(r => {
      if (baoThanhIsBulligPress(r)) return;                       // nhóm Bullig → bỏ
      (Array.isArray(r && r.vanTho) ? r.vanTho : []).forEach(l => {
        const dims = baoThanhParseDims(l && l.vtDim);
        if (!dims) return;
        if (unitVolOf(dims[0], dims[1], dims[2]) >= BAO_THANH_PIECE_MAX_VOL) return; // ván thô → bỏ
        const key = dimKeyOf(dims[0], dims[1], dims[2]);
        const cur = map.get(key) || { sizeKey: key, dims, total: 0, lots: 0 };
        cur.total += Number(l.vtQty) || 0;
        cur.lots += 1;
        map.set(key, cur);
      });
    });
    return [...map.values()].map(x => {
      const used = baoThanhQtyInUsedOf(x.sizeKey, ex);
      return { sizeKey: x.sizeKey, dims: x.dims, total: x.total, lots: x.lots, used, remaining: Math.max(0, x.total - used) };
    }).sort((a, b) => b.remaining - a.remaining || b.total - a.total);
  }
  // ─── TỒN THANH LỖI ĐẦU RA CỦA CHÍNH CÁC LƯỢT "BÀO THANH" ──────
  // Tồn lỗi theo cỡ nhưng CHỈ đếm lỗi của các lượt Bào thanh (totalKinds = ['bao_thanh'])
  // — KHÔNG lấy lỗi của Bào tinh / Bào tinh hạ cấp. Số lỗi đọc LIVE từ tab QC
  // ("Kiểm thanh": LỖI = đã kiểm − đạt). Đã dùng = lượt HẠ CẤP cùng cỡ +
  // lượt Bào thanh bào lại nguồn 'defect' cùng cỡ + phiếu kho đã duyệt (sổ dùng chung).
  // KHÔNG lọc theo tuần. id tiền tố 'd:<cỡ>'.
  function baoThanhDefectPool() {
    const ex = state.x2BaoTinhEditId || '';
    return baoTinhDefectStock(ex, ['bao_thanh'])
      .filter(x => Number(x.total) > 0)
      .map(x => ({
        id: 'd:' + x.sizeKey, inSource: 'defect', sizeKey: x.sizeKey, dims: x.dims,
        total: x.total, used: x.used, remaining: x.remaining,
        code: '', location: 'Thanh lỗi Bào thanh', cls: 'Thanh lỗi',
        useFor: '', materialType: '', supplier: '', days: null, isLot: false
      }));
  }
  // DANH SÁCH THẺ nguồn đầu vào của "Bào thanh" = ① thanh BTP Ép Ván (id 'p:<cỡ>')
  //            + ② thanh LỖI do chính Bào thanh tạo ra (id 'd:<cỡ>')
  function baoTinhInputPool() {
    return baoThanhPressPool().map(x => ({
      id: 'p:' + x.sizeKey, inSource: 'press', sizeKey: x.sizeKey, dims: x.dims,
      total: x.total, used: x.used, remaining: x.remaining,
      code: '', location: 'Ép Ván (Ván thô tạo ra)', cls: 'Thanh BTP',
      useFor: '', materialType: '', supplier: '', days: null, isLot: false
    })).concat(baoThanhDefectPool());
  }
  // Cỡ ĐẦU RA hợp lệ với 1 kích thước ĐẦU VÀO: Rộng_vào × Dày_vào > Rộng_ra × Dày_ra
  function baoThanhOutCandidates(inDims) {
    const list = baoThanhOutList();
    if (!inDims || !(Number(inDims[1]) > 0 && Number(inDims[2]) > 0)) return list;
    const side = Number(inDims[1]) * Number(inDims[2]);
    return list.filter(o => side > (o.dims[1] * o.dims[2]));
  }
  // Cỡ đầu ra `sizeKey` có hợp lệ với đầu vào `inDims` không (dùng khi LƯU)
  function baoTinhBaoThanhOutCandidatesOk(inDims, sizeKey) {
    const key = String(sizeKey || '');
    return !!key && baoThanhOutCandidates(inDims).some(o => o.sizeKey === key);
  }
  // Thêm 1 cỡ ĐẦU RA mới (nút "Thêm" trong dropdown Đầu Ra) — lưu state + mây/file
  function addBaoThanhOutSize() {
    if (!requireEditPermission()) return;
    const raw = (typeof prompt === 'function')
      ? prompt('Nhập kích thước ĐẦU RA mới (Dài × Rộng × Dày, mm) — VD: 640x16x10')
      : '';
    const dims = baoThanhParseDims(raw);
    if (!dims) { showToast('Kích thước không hợp lệ — nhập dạng Dài×Rộng×Dày (mm), VD 640x16x10!', 'error'); return; }
    const key = dimKeyOf(dims[0], dims[1], dims[2]);
    if (baoThanhOutList().some(o => o.sizeKey === key)) {
      setBaoThanhOut(key);
      showToast(`Cỡ ${key} đã có trong danh sách — đã chọn luôn.`, 'info');
      return;
    }
    state.x2BaoThanhOutSizes = (Array.isArray(state.x2BaoThanhOutSizes) ? state.x2BaoThanhOutSizes : []).concat([key]);
    saveX2BaoThanhOutSizes();
    setBaoThanhOut(key);
    showToast(`Đã thêm cỡ đầu ra ${key}!`, 'success');
  }

  // ─── SỐ THANH ĐƯA VÀO của 1 lượt ──────────────────────────────
  // 'bao_thanh' = số thanh ĐEM BÀO (lưu `inQty` — kết quả lấy từ QC); các loại
  // khác = thanh đạt + thanh lỗi.
  function baoTinhQtyInOf(rec) {
    if (rec && rec.kind === 'bao_thanh') return Number(rec.inQty) || 0;
    // Nguồn phiếu xuất: số RÚT = Đạt + Lỗi + Tóp + Khác (Tóp/Khác là 0 với lượt cũ)
    if (rec && rec.kind === 'tinh' && (Number(rec.qtyTop) || Number(rec.qtyOther))) {
      return (Number(rec.qtyOk) || 0) + (Number(rec.qtyErr) || 0) +
        (Number(rec.qtyTop) || 0) + (Number(rec.qtyOther) || 0);
    }
    return (Number(rec && rec.qtyOk) || 0) + (Number(rec && rec.qtyErr) || 0);
  }

  // ─── ĐỌC KÍCH THƯỚC TỪ CHUỖI ──────────────────────────────────
  // Nhận '1200x18x15' · '1200 × 18 × 15' · '1200*18*15' · '1200,18,15' →
  // [dài, rộng, dày]; GIỮ ĐÚNG THỨ TỰ (không sắp xếp lại như parseDimList).
  function baoThanhParseDims(text) {
    const parts = String(text || '').split(/[x×*,;\s]+/).map(s => Number(String(s).trim()));
    if (parts.length < 3) return null;
    const d = parts[0], r = parts[1], t = parts[2];
    if (![d, r, t].every(v => Number.isFinite(v) && v > 0)) return null;
    return [d, r, t];
  }

  // ─── LINK SỐ LƯỢNG ĐẠT TỪ TAB QC ("Kiểm thanh") ────────────────
  // Bản ghi QC "Kiểm thanh" lưu `sizeKey` = cỡ thanh được kiểm → lượt Bào thanh
  // đọc lại Σ (Đạt + Ngoại lệ) của các lượt kiểm CÙNG CỠ.
  // PHÂN BỔ FIFO theo NGÀY: lượt bào CŨ hơn nhận trước, mỗi lượt không nhận quá
  // `inQty` của mình ⇒ tổng các lượt luôn bằng đúng số QC (KHÔNG cộng trùng khi
  // 2 lượt cùng xuất ra 1 cỡ). Lượt QC chưa có cỡ (dữ liệu cũ) bị bỏ qua.
  // Trả Map: id lượt bào thanh → { checked, ok }
  function getBaoTinhQcAlloc() {
    const alloc = new Map();
    const lots = (state.xuong2BaoTinhRecords || [])
      .filter(r => r && r.kind === 'bao_thanh' && String(r.outSizeKey || '').trim() && (Number(r.inQty) || 0) > 0)
      .sort((a, b) => {
        if ((a.date || '') !== (b.date || '')) return (a.date || '').localeCompare(b.date || '');
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
    const lotsBySize = new Map();
    lots.forEach(r => {
      const k = String(r.outSizeKey).trim();
      if (!lotsBySize.has(k)) lotsBySize.set(k, []);
      lotsBySize.get(k).push(r.id);
    });
    if (!lotsBySize.size) return alloc;
    const qcs = (state.qcFinalRecords || [])
      .filter(r => r && r.kind === 'thanh' && String(r.sizeKey || '').trim() && (Number(r.inputQty) || 0) > 0)
      .map(r => ({
        sizeKey: String(r.sizeKey).trim(),
        date: String(r.date || ''),
        checked: Number(r.inputQty) || 0,
        ok: (Number(r.qtyOk) || 0) + (Number(r.qtyExcept) || 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const room = new Map();   // id lượt → số thanh còn nhận được
    lots.forEach(r => room.set(r.id, Number(r.inQty) || 0));
    const cursor = new Map(); // sizeKey → chỉ số lượt kế tiếp
    qcs.forEach(q => {
      const ids = lotsBySize.get(q.sizeKey);
      if (!ids || !ids.length) return;
      const ratio = q.checked > 0 ? q.ok / q.checked : 0;
      let left = q.checked;
      let i = cursor.get(q.sizeKey) || 0;
      while (left > 0 && i < ids.length) {
        const id = ids[i];
        const free = room.get(id) || 0;
        if (free <= 0) { i += 1; continue; }
        const take = Math.min(free, left);
        const cur = alloc.get(id) || { checked: 0, ok: 0 };
        cur.checked += take;
        cur.ok += Math.round(take * ratio * 100) / 100;
        alloc.set(id, cur);
        room.set(id, free - take);
        left -= take;
        if (take >= free) i += 1;
      }
      cursor.set(q.sizeKey, i);
    });
    return alloc;
  }
  // Số thanh ĐÃ KIỂM của 1 lượt (đọc LIVE — 'bao_thanh' lấy từ QC)
  function baoTinhCheckedOf(r) {
    if (!r || r.kind !== 'bao_thanh') return baoTinhQtyInOf(r);
    const a = getBaoTinhQcAlloc().get(r.id);
    return a ? a.checked : 0;
  }
  // Số thanh ĐẠT của 1 lượt (đọc LIVE — 'bao_thanh' = Σ Đạt + Ngoại lệ của QC)
  function baoTinhQtyOkOf(r) {
    if (!r) return 0;
    if (r.kind !== 'bao_thanh') return Number(r.qtyOk) || 0;
    const a = getBaoTinhQcAlloc().get(r.id);
    return a ? a.ok : 0;
  }
  // Số thanh LỖI của 1 lượt (đọc LIVE — 'bao_thanh' = đã kiểm − đạt)
  function baoTinhQtyErrOf(r) {
    if (!r) return 0;
    if (r.kind !== 'bao_thanh') return Number(r.qtyErr) || 0;
    return Math.max(0, baoTinhCheckedOf(r) - baoTinhQtyOkOf(r));
  }
  // Số thanh CHỜ KIỂM của lượt bào thanh = vào − đã kiểm
  function baoTinhPendingOf(r) {
    if (!r || r.kind !== 'bao_thanh') return 0;
    return Math.max(0, (Number(r.inQty) || 0) - baoTinhCheckedOf(r));
  }
  // Tồn CHỜ KIỂM / ĐÃ KIỂM / ĐẠT của 1 CỠ ĐẦU RA (gộp mọi lượt cùng cỡ)
  function baoThanhOutSizeQcStats(sizeKey) {
    const key = String(sizeKey || '');
    const stats = { total: 0, checked: 0, ok: 0, pending: 0 };
    if (!key) return stats;
    const alloc = getBaoTinhQcAlloc();
    (state.xuong2BaoTinhRecords || []).forEach(r => {
      if (!r || r.kind !== 'bao_thanh' || String(r.outSizeKey || '') !== key) return;
      stats.total += Number(r.inQty) || 0;
      const a = alloc.get(r.id);
      stats.checked += a ? a.checked : 0;
      stats.ok += a ? a.ok : 0;
    });
    stats.pending = Math.max(0, stats.total - stats.checked);
    return stats;
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

  // ─── ĐỊNH MỨC 3 CỘT: Bào tinh · Bào tinh hạ cấp · Bào thanh (thanh/giờ) ──
  // state.x2BaoTinhRates[tháng] = { tinh, ha_cap, bao_thanh }.
  // Dữ liệu CŨ lưu số thuần { 'YYYY-MM': 800 } → hiểu là định mức "Bào tinh".
  const BAO_TINH_RATE_KINDS = ['tinh', 'ha_cap', 'bao_thanh'];
  function baoTinhRateLabel(kind) {
    return kind === 'ha_cap' ? 'Bào tinh hạ cấp'
      : (kind === 'bao_thanh' ? 'Bào thanh' : 'Bào tinh');
  }
  // Đọc 1 tháng → { tinh, ha_cap, bao_thanh } (bản cũ: số thuần = Bào tinh)
  function baoTinhRateEntryOf(monthKey) {
    const raw = (state.x2BaoTinhRates || {})[String(monthKey || '')];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        tinh: Number(raw.tinh) || 0,
        ha_cap: Number(raw.ha_cap) || 0,
        bao_thanh: Number(raw.bao_thanh) || 0
      };
    }
    return { tinh: Number(raw) || 0, ha_cap: 0, bao_thanh: 0 };
  }
  // Định mức của LOẠI bào tại tháng chứa dateVal (thanh/giờ) — null nếu chưa đặt.
  // kind mặc định 'tinh' (bảng Tổng hợp công suất trộn 3 loại dùng ĐM Bào tinh).
  function baoTinhRateOf(dateVal, kind) {
    const k = BAO_TINH_RATE_KINDS.includes(String(kind || '')) ? String(kind) : 'tinh';
    const v = Number(baoTinhRateEntryOf(String(dateVal || '').slice(0, 7))[k]);
    return Number.isFinite(v) && v > 0 ? v : null;
  }
  // Danh sách tháng hiện trong popup ĐỊNH MỨC (mới nhất lên đầu)
  function baoTinhRateMonthsList() {
    const months = new Set(Object.keys(state.x2BaoTinhRates || {}));
    (state.xuong2BaoTinhRecords || []).forEach(r => months.add(String(r.date || '').slice(0, 7)));
    months.add(new Date().toISOString().slice(0, 7));
    return [...months].filter(m => /^\d{4}-\d{2}$/.test(m)).sort((a, b) => b.localeCompare(a));
  }
  function openX2BaoTinhRateModal() {
    if (!requireRatePermission()) return; // CHỈ admin mở bảng định mức
    const m = document.getElementById('modal-x2-btinh-rate');
    if (!m) return;
    renderX2BaoTinhRateModal();
    m.classList.add('show');
    initLucide();
  }
  function closeX2BaoTinhRateModal() {
    const m = document.getElementById('modal-x2-btinh-rate');
    if (m) m.classList.remove('show');
    const inM = document.getElementById('x2-btinh-rate-new-month');
    if (inM) inM.value = '';
  }

  // Bảng popup: THÁNG | Bào tinh | Bào tinh hạ cấp | Bào thanh | Lưu · Xóa
  function renderX2BaoTinhRateModal() {
    const tbody = document.getElementById('x2-btinh-rate-rows');
    if (!tbody) return;
    const cell = (m, kind) => {
      const v = Number(baoTinhRateEntryOf(m)[kind]) || 0;
      return `<td class="qcf-rate-cell"><input type="number" min="0" step="any" inputmode="decimal" class="qcf-rate-input" id="x2-btinh-rate-${m}-${kind}" value="${v > 0 ? v : ''}" placeholder="—" title="Định mức ${baoTinhRateLabel(kind)} của tháng (thanh/giờ) — trống = chưa đặt"></td>`;
    };
    const rows = baoTinhRateMonthsList();
    tbody.innerHTML = rows.length ? rows.map(m => {
      const e = baoTinhRateEntryOf(m);
      const custom = e.tinh > 0 || e.ha_cap > 0 || e.bao_thanh > 0;
      return `<tr${custom ? '' : ' class="qcf-rate-row-default"'}>
        <td><strong>Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</strong></td>
        ${cell(m, 'tinh')}${cell(m, 'ha_cap')}${cell(m, 'bao_thanh')}
        <td class="text-right">
          <button type="button" class="btn btn-outline btn-icon btn-sm" data-x2-btinh-rate-save="${escapeHTML(m)}" data-admin-only title="Lưu định mức tháng này"><i data-lucide="save"></i></button>
          <button type="button" class="btn btn-outline btn-icon btn-sm" style="color:var(--danger);" data-x2-btinh-rate-reset="${escapeHTML(m)}" data-admin-only title="Xóa định mức tháng này"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
    }).join('') : '<tr><td colspan="5"><em style="color:var(--text-muted);">Chưa có tháng nào — dùng ô "Thêm tháng" bên dưới.</em></td></tr>';
    initLucide();
  }
  // Lưu 1 HÀNG (1 tháng): 3 ô thanh/giờ — trống = chưa đặt LOẠI đó
  function handleX2BaoTinhRateRowSave(month) {
    if (!requireRatePermission()) return;
    const m = String(month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Tháng không hợp lệ!', 'error'); return; }
    const readVal = id => {
      const raw = String((document.getElementById(id) || {}).value || '').trim().replace(',', '.');
      if (raw === '') return 0;
      const v = Number(raw);
      return (Number.isFinite(v) && v > 0) ? v : -1;   // -1 = số sai
    };
    const tinh = readVal(`x2-btinh-rate-${m}-tinh`);
    const haCap = readVal(`x2-btinh-rate-${m}-ha_cap`);
    const baoThanh = readVal(`x2-btinh-rate-${m}-bao_thanh`);
    if (tinh < 0 || haCap < 0 || baoThanh < 0) {
      showToast('Định mức phải là số lớn hơn 0 (hoặc để trống = chưa đặt)!', 'error');
      return;
    }
    (state.x2BaoTinhRates = state.x2BaoTinhRates || {})[m] = { tinh, ha_cap: haCap, bao_thanh: baoThanh };
    saveX2BaoTinhRates();
    renderX2BaoTinhRateModal();
    renderX2BaoTinhTable();   // chip Hiệu suất từng loại trên thẻ ngày tự cập nhật
    showToast(`Đã lưu định mức 3 loại cho tháng ${Number(m.slice(5))}/${m.slice(0, 4)}!`, 'success');
  }
  function handleX2BaoTinhRateRowReset(month) {
    if (!requireRatePermission()) return;
    const m = String(month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) return;
    delete (state.x2BaoTinhRates || {})[m];
    saveX2BaoTinhRates();
    renderX2BaoTinhRateModal();
    renderX2BaoTinhTable();
    showToast(`Đã xóa định mức tháng ${Number(m.slice(5))}/${m.slice(0, 4)}`, 'info');
  }
  function handleX2BaoTinhRateAddMonth() {
    if (!requireRatePermission()) return;
    const inM = document.getElementById('x2-btinh-rate-new-month');
    const m = String((inM && inM.value) || '').trim();
    if (!/^\d{4}-\d{2}$/.test(m)) { showToast('Chọn tháng cần thêm!', 'error'); return; }
    (state.x2BaoTinhRates = state.x2BaoTinhRates || {})[m] =
      baoTinhRateMonthsList().includes(m) ? baoTinhRateEntryOf(m) : { tinh: 0, ha_cap: 0, bao_thanh: 0 };
    saveX2BaoTinhRates();
    renderX2BaoTinhRateModal();
    if (inM) inM.value = '';
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
    const qtyOk = baoTinhQtyOkOf(r);        // 'bao_thanh' → LIVE từ tab QC ("Kiểm thanh")
    const qtyErr = baoTinhQtyErrOf(r);
    const qtyIn = baoTinhQtyInOf(r);
    const checked = baoTinhCheckedOf(r);     // số thanh ĐÃ KIỂM (bao_thanh)
    const pending = baoTinhPendingOf(r);     // số thanh CHỜ KIỂM (bao_thanh)
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
      batchDims: (r.kind === 'bao_thanh')
        ? (Array.isArray(r.inDims) ? r.inDims.map(Number) : [])
        : (lot
          ? [Number(lot.length) || 0, Number(lot.width) || 0, Number(lot.thickness) || 0]
          : (Array.isArray(r.batchDims) ? r.batchDims.map(Number) : [])),
      batchQty: lot ? (Number(lot.quantity) || 0) : (Number(r.batchQty) || 0),
      batchRemaining: lot ? baoTinhLotRemainingOf(lot) : null,
      inDims: Array.isArray(r.inDims) && r.inDims.length === 3 ? r.inDims.map(Number) : [],
      inQty: Number(r.inQty) || 0,
      inSource: String(r.inSource || ''),
      defectKey: r.defectKey || '',
      defectDims: Array.isArray(r.defectDims) && r.defectDims.length === 3 ? r.defectDims.map(Number) : [],
      outDims, outSizeKey, unitVol,
      qtyOk, qtyErr, qtyIn, checked, pending,
      // TÓP / KHÁC — chỉ nguồn phiếu xuất (cột mới ở bảng tổng hợp + thẻ ngày)
      qtyTop: Number(r.qtyTop) || 0,
      qtyOther: Number(r.qtyOther) || 0,
      otherNote: String(r.otherNote || ''),
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
      // ── NGUỒN PHIẾU XUẤT KHO (mới): in ngày phiếu + kích thước trong phiếu ──
      const uses = Array.isArray(r.noteUses) ? r.noteUses.filter(u => u && u.noteId) : [];
      if (uses.length) {
        const noteIds = [...new Set(uses.map(u => String(u.noteId)))];
        const notes = noteIds.map(id => khoNoteOf(id)).filter(Boolean);
        const noteTxt = notes.map(n => formatDateDDMMYY(n.date)).join(', ');
        const sizes = [...new Set(uses.map(u => String(u.sizeKey || '')))].filter(Boolean);
        const locs = [...new Set((Array.isArray(r.sources) ? r.sources : []).map(s => String(s.location || '')))].filter(Boolean);
        return `Phiếu xuất${notes.length > 1 ? 's' : ''} Bào Tinh ${noteTxt}`
          + (sizes.length ? ` · ${sizes.join(', ')}` : '')
          + (locs.length ? ` · ${locs.join(', ')}` : '');
      }
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
    const srcLbl = d.inSource === 'press'
      ? 'Thanh BTP Ép Ván'
      : (d.inSource === 'defect' ? 'Thanh lỗi Bào thanh' : 'Tự nhập');
    const pend = d.pending > 0 ? ` · chờ QC ${fmtThanh(d.pending)} thanh` : '';
    return `${srcLbl}${dims ? ` · ${dims} mm` : ''}${d.inQty ? ` · ${fmtThanh(d.inQty)} thanh` : ''}${pend}`;
  }

  // ─── FORM GHI NHẬN LƯỢT BÀO TINH ─────────────────────────────
  // "Chọn thanh" đổi theo Loại bào: lô ở Kho · cỡ thanh lỗi · tự nhập.
  function baoTinhRecOf(id) {
    return (state.xuong2BaoTinhRecords || []).find(r => r && r.id === id) || null;
  }
  function baoTinhKindOf() {
    return String((document.getElementById('x2-btinh-kind') || {}).value || 'tinh');
  }
  // KÍCH THƯỚC SAU BÀO + SL thanh ĐẠT nhập THEO TỪNG DÒNG (key = sizeKey — loại
  // 'tinh' / 'ha_cap'; riêng 'bao_thanh' đọc LIVE từ tab QC, xem getBaoTinhQcAlloc)
  const btinhOutDraft = new Map();       // key → { d, r, t }
  function baoTinhOutDrafts() { return btinhOutDraft; }
  // KÍCH THƯỚC SAU BÀO của 1 dòng (theo key) → [d, r, t]
  // Nguồn phiếu xuất nhập THÔ 1 dòng ("1250x20x5") → ưu tiên btinhOutRaw;
  // nhánh HẠ CẤP vẫn nhập 3 ô riêng (btinhOutDraft { d, r, t }).
  function baoTinhOutDimsOf(key) {
    const k = String(key);
    const raw = String(btinhOutRaw.get(k) || '').trim();
    if (raw) {
      const p = raw.split(/[x×*,;\s]+/).map(s => Number(String(s).trim())).filter(v => Number.isFinite(v) && v > 0);
      if (p.length >= 3) return [p[0], p[1], p[2]];
      if (p.length) return [p[0], p[1] || 0, p[2] || 0];
      return [0, 0, 0];
    }
    const o = btinhOutDraft.get(k) || {};
    return [Number(o.d) || 0, Number(o.r) || 0, Number(o.t) || 0];
  }
  // ─── CHỌN THANH: nút mở DANH SÁCH THẺ — bấm 1 thẻ = CHỌN, bấm lần nữa = BỎ CHỌN ──
  // (không dùng ô vuông tích; thẻ 2 DÒNG CHUẨN như phần chọn thanh thô của thẻ Bullig:
  //  dòng 1 = mã lô · vị trí · k.thước · loại · số thanh (còn) — dòng 2 = chip Dùng cho
  //  + badge đếm ngày S1/S2/K + luồng NL + NCC; kèm Ô TÌM NHANH lọc bỏ dấu)
  let btinhPicked = [];                 // id các phiếu / thẻ đang chọn
  const btinhOkDraft = new Map();       // sizeKey → SL thanh ĐẠT đã nhập (giữ khi vẽ lại)
  // Bản nháp RIÊNG cho nguồn PHIẾU XUẤT (kind 'tinh'): Lỗi · Tóp · Khác · nội dung Khác
  const btinhErrDraft = new Map();
  const btinhTopDraft = new Map();
  const btinhOtherDraft = new Map();
  const btinhOtherNoteDraft = new Map();  // sizeKey → ghi chú "Khác"
  const btinhOutRaw = new Map();          // sizeKey → KT sau bào NHẬP 1 DÒNG (VD "1250x20x5")
  function baoTinhPickedIds() { return btinhPicked.slice(); }
  function baoTinhOkDrafts() { return btinhOkDraft; }
  // Danh sách thẻ nguồn theo Loại bào — BẢN THÔ (kèm số thanh còn lại + phần của lượt
  // đang sửa), CHƯA lọc số lượng → gồm cả thẻ đã DÙNG HẾT (qty = 0)
  function baoTinhCandidateRaw() {
    const kind = baoTinhKindOf();
    const editing = state.x2BaoTinhEditId ? baoTinhRecOf(state.x2BaoTinhEditId) : null;
    if (kind === 'tinh') {
      // ── NGUỒN = PHIẾU XUẤT KHO mục đích "Bào Tinh" (làm nhiều ngày mới hết) ──
      const exId = editing && editing.kind === 'tinh' ? editing.id : null;
      // includeUsed = true → bản THÔ giữ cả phiếu đã rút hết (baoTinhCandidates lọc qty>0,
      // baoTinhUsedUpItems trả lại cho dòng GIẢI THÍCH "ĐÃ DÙNG HẾT")
      return khoNoteInputPool('baotinh', exId, true).map(p => ({
        id: p.id, isNote: true, pending: p.pending, note: p.note,
        dims: (p.sizes[0] && p.sizes[0].dims) || [0, 0, 0],   // 1 size đại diện (group tách theo từng size)
        cls: p.pending ? 'Chờ duyệt' : '—',
        qty: p.remaining, total: p.total,
        location: p.note && p.note.purposeNote ? String(p.note.purposeNote) : 'Kho',
        code: '',
        useFor: 'Bào Tinh', materialType: '', supplier: '',
        noteSizes: p.sizes, noteDate: p.date, days: null
      }));
    }
    if (kind === 'ha_cap') {
      return baoTinhDefectStock().map(x => {
        const selfUse = (editing && editing.kind === 'ha_cap' && String(editing.defectKey) === String(x.sizeKey))
          ? baoTinhQtyInOf(editing) : 0;
        return {
          id: x.sizeKey, dims: x.dims, cls: 'Thanh lỗi', qty: x.remaining + selfUse,
          location: 'Bào Tinh (chờ hạ cấp)', code: '',
          // Thẻ THÀNH LỖI không phải lô — vẫn đủ trường cho khuôn 2 dòng chuẩn
          isLot: false, total: 0, useFor: '', materialType: '', supplier: '', days: null
        };
      });
    }
    return [];
  }
  // Danh sách thẻ nguồn theo Loại bào — CHỈ thẻ CÒN HÀNG (qty > 0): thẻ đã dùng hết
  // bị ẨN khỏi danh sách (hành vi cũ giữ nguyên) → xem baoTinhUsedUpItems() để giải thích
  function baoTinhCandidates() {
    return baoTinhCandidateRaw().filter(c => c.qty > 0 || btinhPicked.includes(String(c.id)));
  }
  // Thẻ nguồn đã DÙNG HẾT (qty <= 0, chưa chọn) — bị ẩn; dùng cho dòng GIẢI THÍCH
  // khi người dùng tìm mà không thấy ở ô "Chọn Thanh" (B1 — 06/10/2026)
  function baoTinhUsedUpItems() {
    return baoTinhCandidateRaw().filter(c => c.qty <= 0 && !btinhPicked.includes(String(c.id)));
  }
  // Ngày (dd/mm/yyyy) của lượt Bào Tinh MỚI NHẤT đã rút thanh từ lô — cho dòng giải thích
  function baoTinhLastTurnDateOf(batchId) {
    const id = String(batchId || '');
    if (!id) return '';
    let last = '';
    (state.xuong2BaoTinhRecords || []).forEach(r => {
      if (!r || r.kind !== 'tinh') return;
      let hit = false;
      if (Array.isArray(r.sources) && r.sources.length) hit = r.sources.some(s => s && String(s.batchId) === id);
      else hit = String(r.batchId || '') === id;
      if (hit && String(r.date || '') > last) last = String(r.date || '');
    });
    // Hiện ĐỦ dd/mm/yyyy (quy tắc 3) — khác chip ngắn dd/mm/yy của thẻ Kanban
    return last ? `${last.slice(8, 10)}/${last.slice(5, 7)}/${last.slice(0, 4)}` : '';
  }
  // Block .al-warn-usedup giải thích các thẻ bị ẨN vì đã dùng hết — CHỈ khi có ít nhất 1 ô tìm
  // không rỗng (trừ khi always = true: danh sách trống vì TẤT CẢ đã dùng hết)
  function baoTinhUsedUpHintHtml(always) {
    const qTxt = baoTinhSearchQuery();
    const qQty = baoTinhQtyQuery();
    if (!always && !qTxt && !qQty) return '';
    const all = baoTinhUsedUpItems();
    const hits = (qTxt || qQty) ? all.filter(baoTinhListMatch) : all;
    if (!hits.length) return '';
    const lines = hits.map(it => {
      const when = it.isLot ? baoTinhLastTurnDateOf(it.id) : '';
      return `<div class="al-warn-line">⚠ <strong>ĐÃ DÙNG HẾT — ẩn khỏi danh sách</strong>: ${escapeHTML(baoTinhCardOf(it).main)}${when ? ` — lượt Bào Tinh ${when}` : ''}</div>`;
    });
    return `<div class="al-warn-usedup">${lines.join('')}</div>`;
  }
  // Nhãn CHIP "ĐÃ BÀO X/Y THANH" cho thẻ lô (Kanban + Thẻ Kho) — rỗng nếu chưa bào (B2)
  function baoTinhUsedLabel(batch) {
    if (!batch) return '';
    const used = baoTinhLotUsedOf(batch.id);
    if (used <= 0) return '';
    return `Đã bào ${fmtThanh(used)}/${fmtThanh(Number(batch.quantity) || 0)} thanh`;
  }
  // GỘP theo KÍCH THƯỚC CHUNG (KHÔNG chia phân loại) — kèm kích thước SAU BÀO của TỪNG dòng
  // [{ key, manual, dims, sizeKey, inQty, sources }]  (outDims đọc qua baoTinhOutDimsOf(key))
  function baoTinhGroups() {
    const kind = baoTinhKindOf();
    if (kind === 'bao_thanh') {
      // 'Bào thanh': 1 LƯỢT = 1 cặp (Chọn thanh đầu vào → Đầu ra) — dòng CHỈ ĐỌC
      const inItem = baoTinhBaoThanhInItem();
      const outItem = baoTinhBaoThanhOutItem();
      return [{
        key: 'bt-cur', manual: false, btinh: true,
        dims: inItem ? inItem.dims : [],
        sizeKey: inItem ? inItem.sizeKey : '',
        inQty: baoTinhBaoThanhQtyIn(),
        sources: [],
        inSource: inItem ? inItem.inSource : '',
        inTotal: inItem ? inItem.total : 0,
        inRemaining: inItem ? inItem.remaining : 0,
        outDims: outItem ? outItem.dims : [],
        outSizeKey: outItem ? outItem.sizeKey : ''
      }];
    }
    const map = new Map();
    baoTinhCandidates().filter(c => btinhPicked.includes(String(c.id))).forEach(c => {
      // ── THẺ PHIẾU XUẤT: 1 phiếu nhiều kích thước → tách mỗi kích thước 1 dòng ──
      if (c.isNote) {
        (c.noteSizes || []).forEach(s => {
          if (!(Number(s.remaining) > 0)) return;
          const cur = map.get(s.sizeKey) || { key: s.sizeKey, manual: false, dims: s.dims, sizeKey: s.sizeKey, inQty: 0, sources: [], noteIds: [] };
          cur.inQty += Number(s.remaining) || 0;
          if (!cur.noteIds.includes(String(c.id))) cur.noteIds.push(String(c.id));
          cur.sources.push(c);
          map.set(s.sizeKey, cur);
        });
        return;
      }
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
  // Dựng nội dung 1 THẺ 2 DÒNG CHUẨN — giống phần chọn thanh thô đầu vào của thẻ Bullig:
  //   Dòng 1 (main) = Mã lô · Vị trí · K.thước · Loại · Số thanh (còn)
  //   Dòng 2 (sub)  = chip Dùng cho + badge đếm ngày S1/S2/K + luồng NL + NCC
  // plain = chuỗi BỎ THẺ HTML để so khớp Ô TÌM NHANH (chuẩn hóa qua bulligNorm).
  function baoTinhCardOf(it) {
    const size = `${comboLabel({ d: it.dims[0], r: it.dims[1], t: it.dims[2] })} mm`;
    // ── THẺ PHIẾU XUẤT KHO (nguồn mới của Bào tinh) — dòng 1 = tóm tắt ngày
    // xuất + tồn phiếu; di chuột hiện tooltip liệt kê kích thước & số lượng ──
    if (it.isNote) {
      const dateTxt = it.noteDate ? formatDateDDMMYY(it.noteDate) : '—';
      const qtyTxt = (it.total > 0 && it.qty < it.total)
        ? `${fmtThanh(it.qty)}/${fmtThanh(it.total)} thanh (còn)`
        : `${fmtThanh(it.qty)} thanh`;
      const mainNoQty = `Xuất Bào Tinh · ${dateTxt}`;
      const main = `${mainNoQty} · ${qtyTxt}`;
      const tip = khoNoteSizeTooltip(it.noteSizes);
      const chips = [
        `<span class="al-use-tag use-van">Bào Tinh</span>`,
        it.pending
          ? `<span class="al-day-badge day-pending" title="Phiếu chưa được Ban lãnh đạo duyệt — CHỌN ĐƯỢC SAU KHI DUYỆT">Chờ duyệt</span>`
          : `<span class="al-day-badge day-k" title="Số kích thước nan khác nhau trong phiếu">${it.noteSizes.length} kích thước</span>`
      ];
      const sub = chips.join(' ');
      return {
        main, sub,
        titleTxt: tip ? `Ngày xuất ${dateTxt} — ${tip}` : main,
        plain: `${main} Bào Tinh phiếu xuất`,
        plainTxt: `${mainNoQty} Bào Tinh phiếu xuất`,   // CHỮ — ô tìm nhanh
        pending: !!it.pending
      };
    }
    if (it.isLot) {
      // Lô đã bào một phần → hiện "còn X/Y thanh" (cùng cách thẻ thanh thô Bullig)
      const qtyTxt = (it.total > 0 && it.qty < it.total)
        ? `${fmtThanh(it.qty)}/${fmtThanh(it.total)} thanh (còn)`
        : `${fmtThanh(it.qty)} thanh`;
      // DÒNG 1 TÁCH phần số lượng sang Ô RIÊNG — chữ giữ: mã · vị trí · kích thước · loại
      const mainNoQty = `${it.code || '—'} · ${it.location || '—'} · ${size} · ${it.cls || '—'}`;
      const main = `${mainNoQty} · ${qtyTxt}`;
      const d = it.days || { say1: 0, say2: 0, kho: 0 };
      const useLbl = String(it.useFor || '').trim() || '—';
      const chips = [
        `<span class="al-use-tag use-${bulligNorm(useLbl).replace(/[^a-z]/g, '') || 'khac'}">${escapeHTML(useLbl)}</span>`,
        `<span class="al-day-badge day-s1" title="Số ngày đã ở Sấy 1">S1-${d.say1} ngày</span>`,
        `<span class="al-day-badge day-s2" title="Số ngày đã ở Sấy 2">S2-${d.say2} ngày</span>`,
        `<span class="al-day-badge day-k" title="Số ngày đã ở Kho">K-${d.kho} ngày</span>`
      ];
      if (it.materialType) chips.push(`<span class="al-day-badge day-luuong" title="Luồng nguyên liệu">${escapeHTML(it.materialType)}</span>`);
      if (it.supplier) chips.push(`<span class="al-day-badge day-ext" title="Nhà cung cấp">${escapeHTML(it.supplier)}</span>`);
      const sub = chips.join(' ');
      const chipsTxt = chips.map(c => c.replace(/<[^>]*>/g, ' ')).join(' ');
      return {
        main, sub,
        titleTxt: `${main} · S1-${d.say1} ngày · S2-${d.say2} ngày · K-${d.kho} ngày`,
        plain: `${main} ${chipsTxt}`,
        plainTxt: `${mainNoQty} ${chipsTxt}`   // CHỮ (không số lượng) — ô tìm nhanh
      };
    }
    // Thẻ THANH LỖI (Bào tinh hạ cấp) — không có lô/ngày, vẫn đúng khuôn 2 dòng
    const mainNoQty = `${it.location || '—'} · ${size} · ${it.cls || '—'}`;
    const main = `${mainNoQty} · ${fmtThanh(it.qty)} thanh`;
    const sub = `<span class="al-use-tag use-khac">Bào tinh hạ cấp</span> `
      + `<span class="al-day-badge day-luuong" title="Thanh lỗi của công đoạn Bào Tinh chờ hạ cấp">Lỗi Bào Tinh</span>`;
    return {
      main, sub, titleTxt: main,
      plain: `${main} Bào tinh hạ cấp Lỗi Bào Tinh`,
      plainTxt: `${mainNoQty} Bào tinh hạ cấp Lỗi Bào Tinh`   // CHỮ — ô tìm nhanh
    };
  }
  // ── 2 Ô TÌM KẾT HỢP (điều kiện VÀ) — tách riêng ô SỐ LƯỢNG như form "Thêm Lô Sấy Mới":
  //    ô ① = CHỮ (mã lô · vị trí · kích thước · loại · Dùng cho · NL · NCC)
  //    ô ② = CHỈ số lượng (còn lại / tổng) — thẻ chỉ hiện khi khớp CẢ HAI ──
  // Ô ①: đọc + chuẩn hóa từ khóa (bỏ dấu, 'đ'→'d' + BỎ DẤU PHÂN CÁCH
  // NGHÌN → gõ "1000" khớp "1.000") — KHÔNG dùng alNorm
  function baoTinhSearchQuery() {
    return baoTinhSearchNorm(String((document.getElementById('x2-btinh-search') || {}).value || '')).trim();
  }
  // Ô ②: từ khóa TÌM THEO SỐ LƯỢNG (đọc trực tiếp ô #x2-btinh-qty-search)
  function baoTinhQtyQuery() {
    return String((document.getElementById('x2-btinh-qty-search') || {}).value || '').trim();
  }
  // Chuẩn chuỗi số: bỏ MỌI ký tự không phải chữ số → gõ "1.000" khớp 1000
  function baoTinhQtyDigits(s) {
    return String(s == null ? '' : s).replace(/\D/g, '');
  }
  // So SỐ LƯỢNG (mảng giá trị cho trước) với từ khóa số — dạng CHỨA;
  // từ khóa rỗng / không có chữ số → không lọc (hiện mọi thẻ)
  function baoTinhQtyMatchVals(vals, qtyQuery) {
    const q = baoTinhQtyDigits(qtyQuery);
    if (!q) return true;
    return (vals || []).some(v => Number(v) > 0 && String(Math.round(Number(v))).includes(q));
  }
  // Thẻ nguồn có khớp CẢ 2 ô không (ô chữ ∧ ô số lượng)
  function baoTinhListMatch(it) {
    const q = baoTinhSearchQuery();
    if (q && !baoTinhSearchNorm(`${baoTinhCardOf(it).plainTxt} ${it.code || ''} ${it.id}`).includes(q)) return false;
    return baoTinhQtyMatchVals([it.qty, it.total], baoTinhQtyQuery());
  }
  // Từ khóa hiển thị khi không có thẻ nào khớp (gộp 2 ô, giữ nguyên ký tự người gõ)
  function baoTinhQueryKeys() {
    return [
      String((document.getElementById('x2-btinh-search') || {}).value || '').trim(),
      baoTinhQtyQuery()
    ].filter(Boolean).join(' · ');
  }
  // Danh sách thẻ ĐANG HIỂN THỊ (lọc KẾT HỢP 2 ô) — dùng cho render + "Chọn tất cả"
  function baoTinhVisibleItems() {
    return baoTinhCandidates().filter(baoTinhListMatch);
  }
  // Vẽ danh sách THẺ theo CHUẨN 2 DÒNG như thanh thô của thẻ Bullig (KHÔNG ô vuông tích —
  // bấm cả thẻ để CHỌN/BỎ CHỌN; có Ô TÌM NHANH lọc mã · vị trí · kích thước · loại · Dùng cho · NL · NCC)
  function renderX2BaoTinhList() {
    const listEl  = document.getElementById('x2-btinh-list');
    const countEl = document.getElementById('x2-btinh-picked-count');
    const textEl  = document.getElementById('x2-btinh-picker-text');
    const kind = baoTinhKindOf();
    if (textEl) textEl.textContent = kind === 'ha_cap' ? 'Chọn thanh lỗi' : 'Chọn thanh nan';
    if (kind === 'bao_thanh') {   // 'Bào thanh' dùng danh sách nguồn riêng (renderBaoThanhInputList)
      if (listEl) listEl.innerHTML = '';
      return;
    }
    if (countEl) {
      countEl.textContent = btinhPicked.length ? `${btinhPicked.length} đã chọn` : 'Chưa chọn';
      countEl.classList.toggle('has-pick', btinhPicked.length > 0);
    }
    if (!listEl) return;
    const items = baoTinhCandidates();
    if (!items.length) {
      // Không còn thẻ NÀO — phân biệt "chưa có" vs "ĐÃ DÙNG HẾT" cho người dùng rõ
      const usedUpAll = baoTinhUsedUpItems();
      listEl.innerHTML = usedUpAll.length
        ? `<div class="al-empty">— Tất cả thẻ nguồn đã DÙNG HẾT (đã ghi hết ở các lượt Bào Tinh) —</div>` + baoTinhUsedUpHintHtml(true)
        : `<div class="al-empty">${kind === 'ha_cap'
          ? '— Chưa có thanh lỗi nào chờ hạ cấp (ghi lượt Bào tinh có SL thanh lỗi trước) —'
          : '— Kho chưa có thanh nào (chuyển lô vào Kho ở thẻ Than Hóa + Sấy trước) —'}</div>`;
      return;
    }
    // Lọc KẾT HỢP 2 ô: chữ (mã · vị trí · kích thước · loại · …) ∧ số lượng
    const rows = items.filter(baoTinhListMatch).map(it => ({ it, card: baoTinhCardOf(it) }));
    // Dòng GIẢI THÍCH (block .al-warn-usedup): thẻ KHỚP tìm kiếm nhưng bị ẨN vì đã dùng hết (nếu có)
    const warn = baoTinhUsedUpHintHtml();
    if (!rows.length) {
      listEl.innerHTML = `<div class="al-empty">— Không tìm thấy thẻ nào khớp "${escapeHTML(baoTinhQueryKeys())}" —</div>` + warn;
      return;
    }
    listEl.innerHTML = rows.map(({ it, card }) => {
      const on = btinhPicked.includes(String(it.id));
      const pend = !!card.pending;
      return `<button type="button" class="al-card x2-btinh-card${on ? ' picked' : ''}${pend ? ' al-card-pending' : ''}" data-btinh-pick="${escapeHTML(String(it.id))}" aria-pressed="${on ? 'true' : 'false'}"${pend ? ' aria-disabled="true"' : ''} title="${escapeHTML(card.titleTxt)}">
        <span class="al-card-body">
          <span class="al-card-main">${escapeHTML(card.main)}</span>
          <span class="al-card-sub">${card.sub}</span>
        </span>
      </button>`;
    }).join('') + warn;
    initLucide();
  }
  // Bấm 1 thẻ → CHỌN; bấm lần nữa → BỎ CHỌN (rồi vẽ lại bảng tổng hợp + ô tổng kết)
  function toggleBaoTinhPick(id) {
    const key = String(id || '');
    if (!key) return btinhPicked.slice();
    // Phiếu CHỜ DUYỆT → hiện nhưng CHỌN KHÔNG ĐƯỢC (chờ Ban lãnh đạo duyệt)
    const cand = baoTinhCandidates().find(c => String(c.id) === key);
    if (cand && cand.pending) {
      showToast('Phiếu này CHỜ DUYỆT — chọn được sau khi Ban lãnh đạo duyệt phiếu kho.', 'error');
      return btinhPicked.slice();
    }
    btinhPicked = btinhPicked.includes(key) ? btinhPicked.filter(x => x !== key) : [...btinhPicked, key];
    renderX2BaoTinhList();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
    return btinhPicked.slice();
  }
  function baoTinhPickAll() {
    // "Chọn tất cả" = các thẻ ĐANG HIỂN THỊ (đã lọc theo ô tìm nhanh) — BỎ phiếu chờ duyệt
    const visible = baoTinhVisibleItems().filter(c => !c.pending);
    btinhPicked = btinhPicked.filter(id => visible.some(c => String(c.id) === String(id)))
      .concat(visible.map(c => String(c.id)).filter(id => !btinhPicked.includes(id)));
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
  // ═══════════════════════════════════════════════════════════════
  // DROPDOWN NỔI DÙNG CHO CÁC PICKER TRONG THẺ XƯỞNG 2
  // (Bào Tinh — Chọn Thanh / Đầu vào / Đầu ra · Bullig — Danh sách lô)
  // ═══════════════════════════════════════════════════════════════
  // Khi MỞ: kéo node panel ra làm CON TRỰC TIẾP của `#x2-detail-overlay` (lớp
  // fixed phủ toàn màn hình) + neo INLINE `position:absolute` theo rect của nút
  // → danh sách NỔI đè lên nội dung, KHÔNG bị `.x2-detail-content` (overflow:auto)
  // cắt, KHÔNG đẩy form xuống — cùng cơ chế dropdown nổi của thẻ "Kiểm Sau Sản
  // Xuất" (js/qc-final.js). ĐÓNG thì đưa node về lại chỗ cũ trong form.
  const x2FloatHome = new Map();   // panelId -> { parent, next }

  // Neo panel vào đúng vị trí nút (gọi lúc mở + khi cuộn / đổi cỡ màn hình)
  function positionX2FloatPicker(panelId, btnId) {
    const panel = document.getElementById(panelId);
    const btn = btnId ? document.getElementById(btnId) : null;
    if (!panel || panel.hidden) return;
    if (!btn || typeof btn.getBoundingClientRect !== 'function') return;
    const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1280;
    const vh = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800;
    const ov = document.getElementById('x2-detail-overlay');
    const ovRect = (ov && typeof ov.getBoundingClientRect === 'function')
      ? ov.getBoundingClientRect()
      : { left: 0, top: 0, bottom: vh, width: vw, height: vh };
    const rect = btn.getBoundingClientRect();
    const width = Math.max(Math.min(Math.max(rect.width, 300), vw - 16), 240);
    const left = Math.max(8, Math.min(rect.left - ovRect.left, vw - width - 8));
    const spaceBelow = ovRect.bottom - rect.bottom;
    const spaceAbove = rect.top - ovRect.top;
    const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
    panel.style.position = 'absolute';   // INLINE — thắng stylesheet cũ (SW cache)
    panel.style.zIndex = '260';
    panel.style.overflow = 'auto';
    panel.style.left = `${Math.round(left)}px`;
    panel.style.width = `${Math.round(width)}px`;
    panel.style.maxHeight = `${Math.round(Math.max(openUp ? spaceAbove - 12 : spaceBelow - 12, 180))}px`;
    if (openUp) {
      panel.style.top = 'auto';
      panel.style.bottom = `${Math.round(ovRect.bottom - rect.top + 6)}px`;
    } else {
      panel.style.bottom = 'auto';
      panel.style.top = `${Math.round(rect.bottom - ovRect.top + 6)}px`;
    }
  }

  // MỞ dropdown nổi. renderFn (tuỳ chọn) vẽ nội dung panel TRƯỚC khi neo.
  function x2FloatShow(panelId, btnId, renderFn) {
    const panel = document.getElementById(panelId);
    if (!panel) return false;
    panel.hidden = false;
    if (typeof renderFn === 'function') { try { renderFn(); } catch (err) { /* bỏ qua */ } }
    const ov = document.getElementById('x2-detail-overlay') || (document.body || null);
    if (ov && typeof ov.appendChild === 'function' && panel.parentElement !== ov) {
      if (!x2FloatHome.has(panelId)) {
        x2FloatHome.set(panelId, { parent: panel.parentElement, next: panel.nextSibling });
      }
      ov.appendChild(panel);
    }
    positionX2FloatPicker(panelId, btnId);
    const btn = btnId ? document.getElementById(btnId) : null;
    if (btn && typeof btn.setAttribute === 'function') btn.setAttribute('aria-expanded', 'true');
    return true;
  }

  // ĐÓNG dropdown nổi — đưa node về lại chỗ cũ trong form + xoá neo inline
  function x2FloatHide(panelId, btnId) {
    const panel = document.getElementById(panelId);
    if (!panel) return false;
    panel.hidden = true;
    const home = x2FloatHome.get(panelId);
    if (home && home.parent && typeof home.parent.insertBefore === 'function'
        && panel.parentElement !== home.parent) {
      try {
        if (home.next && home.next.parentElement === home.parent) {
          home.parent.insertBefore(panel, home.next);
        } else {
          home.parent.appendChild(panel);
        }
      } catch (err) { /* bố cục đã đổi — bỏ qua */ }
      x2FloatHome.delete(panelId);
    }
    if (panel.style) {
      panel.style.position = ''; panel.style.zIndex = ''; panel.style.overflow = '';
      panel.style.left = ''; panel.style.top = ''; panel.style.bottom = '';
      panel.style.width = ''; panel.style.maxHeight = '';
    }
    const btn = btnId ? document.getElementById(btnId) : null;
    if (btn && typeof btn.setAttribute === 'function') btn.setAttribute('aria-expanded', 'false');
    return true;
  }

  // Danh sách (panel, nút) của TẤT CẢ dropdown nổi Xưởng 2
  const X2_FLOAT_PAIRS = [
    ['x2-btinh-picker', 'x2-btinh-picker-btn'],
    ['x2-btinh-bt-in-picker', 'x2-btinh-bt-in-btn'],
    ['x2-btinh-bt-out-picker', 'x2-btinh-bt-out-btn'],
    ['x2-bl-gc-picker', 'x2-bl-gc-btn']
  ];
  // Đóng TẤT CẢ dropdown nổi (gọi khi đóng pop-up thẻ / chuyển tab)
  function x2FloatHideAll() {
    X2_FLOAT_PAIRS.forEach(([p, b]) => {
      const el = document.getElementById(p);
      if (el && !el.hidden) x2FloatHide(p, b);
    });
  }
  // Bấm RA NGOÀI panel/nút → tự đóng (uỷ nhiệm document)
  function x2FloatMaybeClose(e) {
    const t = e && e.target;
    if (!t || typeof t.closest !== 'function') return false;
    if (typeof document.contains === 'function' && !document.contains(t)) return false;
    let closed = false;
    X2_FLOAT_PAIRS.forEach(([p, b]) => {
      const el = document.getElementById(p);
      if (!el || el.hidden) return;
      if (t.closest(`#${p}`) || t.closest(`#${b}`)) return;
      x2FloatHide(p, b);
      closed = true;
    });
    return closed;
  }
  // Neo lại các dropdown đang mở khi CUỘN / ĐỔI CỠ màn hình
  function x2FloatRepositionAll() {
    X2_FLOAT_PAIRS.forEach(([p, b]) => {
      const el = document.getElementById(p);
      if (el && !el.hidden) positionX2FloatPicker(p, b);
    });
  }

  // Bật/tắt dropdown nổi "Chọn Thanh" của thẻ Bào Tinh
  function x2BaoTinhTogglePicker() {
    const panel = document.getElementById('x2-btinh-picker');
    if (!panel) return false;
    if (panel.hidden) x2FloatShow('x2-btinh-picker', 'x2-btinh-picker-btn', renderX2BaoTinhList);
    else x2FloatHide('x2-btinh-picker', 'x2-btinh-picker-btn');
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
    // ── NGUỒN PHIẾU XUẤT: KT sau bào nhập 1 DÒNG · SL Lỗi / Tóp / Khác / ghi chú Khác ──
    const rawKey = t.getAttribute('data-btinh-out-raw');
    if (rawKey) {
      btinhOutRaw.set(rawKey, String(raw || '').trim());
      renderX2BaoTinhNumbers();
      renderX2BaoTinhCalc();
      return;
    }
    const numKey =
      t.getAttribute('data-btinh-err') || t.getAttribute('data-btinh-top') ||
      t.getAttribute('data-btinh-other');
    if (numKey) {
      const map = t.getAttribute('data-btinh-err') ? btinhErrDraft
        : t.getAttribute('data-btinh-top') ? btinhTopDraft : btinhOtherDraft;
      if (bad) map.delete(numKey); else map.set(numKey, Math.max(0, Math.floor(v)));
      renderX2BaoTinhNumbers();
      renderX2BaoTinhCalc();
      return;
    }
    const noteKey = t.getAttribute('data-btinh-other-note');
    if (noteKey) {
      const s = String(raw || '').trim();
      if (s) btinhOtherNoteDraft.set(noteKey, s); else btinhOtherNoteDraft.delete(noteKey);
      return;
    }
    // 'bao_thanh' không còn ô nhập tay (nguồn chọn từ danh sách + SL đạt LINK từ QC)
  }
  // Bấm nút xóa HÀNG nhập tay — ĐÃ BỎ (Bào thanh không còn hàng nhập tay)
  function onBaoTinhGroupClick() { return false; }
  // Nút "Thêm hàng thông tin khác" — ĐÃ BỎ (Bào thanh = 1 lượt 1 cặp đầu vào → đầu ra)
  function baoTinhAddRow() { return false; }
  // Hiện/ẩn ô nhập theo Loại bào + reset lựa chọn khi ĐỔI loại bào
  function syncX2BaoTinhKindRows(keepPicks) {
    const kind = baoTinhKindOf();
    const set = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
    set('x2-btinh-picker-row', kind !== 'bao_thanh');  // Bào thanh dùng DÒNG 4 TRƯỜNG riêng
    set('x2-btinh-bt-row', kind === 'bao_thanh');
    // Ghi chú loại bào hiện khi DÊ CHUỘT (không in ra màn hình cho gọn ô)
    const sel = document.getElementById('x2-btinh-kind');
    if (sel) sel.title = kind === 'ha_cap'
      ? 'Bào tinh hạ cấp — lấy thanh lỗi của công đoạn Bào Tinh (gom theo cỡ)'
      : kind === 'bao_thanh'
        ? 'Bào thanh — Chọn thanh đầu vào từ Ép Ván (Ván Thô Tạo Ra) / thanh lỗi · chọn cỡ Đầu ra; Số lượng đạt LINK từ tab QC (Kiểm thanh)'
        : 'Bào tinh — lấy thanh từ Kho (đã qua Sấy 2)';
    if (!keepPicks) {
      btinhPicked = [];
      btinhOkDraft.clear();
      btinhOutDraft.clear();
      btinhErrDraft.clear();
      btinhTopDraft.clear();
      btinhOtherDraft.clear();
      btinhOtherNoteDraft.clear();
      btinhOutRaw.clear();
      btinhBtIn = '';
      btinhBtOut = '';
      const q = document.getElementById('x2-btinh-bt-qty');
      if (q) q.value = '';
    }
    return kind;
  }
  // Đổi Loại bào → vẽ lại thẻ + bảng tổng hợp + ô tổng kết
  function updateXuong2BaoTinhLinked() {
    syncX2BaoTinhKindRows();
    renderX2BaoTinhList();
    renderX2BaoThanhForm();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
  }

  // BẢNG TÓM TẮT CHỈ ĐỌC của "Bào thanh" — nguồn đầu vào · SL vào · cỡ đầu ra ·
  // ĐẠT (LINK từ tab QC "Kiểm thanh") · LỖI (đã kiểm − đạt) · CHỜ KIỂM.
  function renderBaoThanhSummaryTable(box) {
    const inItem = baoTinhBaoThanhInItem();
    const outItem = baoTinhBaoThanhOutItem();
    const inQty = baoTinhBaoThanhQtyIn();
    const editing = state.x2BaoTinhEditId ? baoTinhRecOf(state.x2BaoTinhEditId) : null;
    let ok = 0, err = 0, pend = 0, checked = 0;
    if (editing && editing.kind === 'bao_thanh' && outItem && String(editing.outSizeKey || '') === outItem.sizeKey) {
      ok = baoTinhQtyOkOf(editing); err = baoTinhQtyErrOf(editing);
      checked = baoTinhCheckedOf(editing); pend = baoTinhPendingOf(editing);
    }
    const inCell = inItem
      ? `<span class="x2-nan-chip">${comboLabel({ d: inItem.dims[0], r: inItem.dims[1], t: inItem.dims[2] })}</span> <small class="x2-btinh-src">${escapeHTML(inItem.cls)} · còn ${fmtThanh(inItem.remaining)}/${fmtThanh(inItem.total)}</small>`
      : '<em style="color:var(--text-muted);">Chưa chọn thanh đầu vào</em>';
    const outCell = outItem
      ? `<span class="x2-nan-chip">${comboLabel({ d: outItem.dims[0], r: outItem.dims[1], t: outItem.dims[2] })}</span>`
      : '<em style="color:var(--text-muted);">Chưa chọn đầu ra</em>';
    const pendCell = pend > 0
      ? `<strong style="color:#b45309;">${fmtThanh(pend)}</strong>`
      : '<em style="color:var(--text-muted);">—</em>';
    box.innerHTML = `
      <div class="x2-btinh-groups-head">
        <i data-lucide="calculator"></i> <strong>Bào thanh</strong> — nguồn tự động từ <strong>Ép Ván (Ván Thô Tạo Ra)</strong> + <strong>thanh lỗi Bào thanh</strong>; <strong>Số lượng đạt LINK từ tab QC (Kiểm thanh)</strong>
      </div>
      <div class="x2-btinh-group-scroll">
        <table class="data-table x2-btinh-group-table">
          <thead><tr>
            <th title="Thanh đem bào — chọn từ danh sách nguồn (Ép Ván / thanh lỗi)">Thanh đầu vào</th>
            <th class="text-right" title="Số thanh đem bào của lượt này">SL vào</th>
            <th title="Cỡ thanh sau khi bào (Dài × Rộng × Dày, mm)">Đầu ra</th>
            <th class="text-right" title="Số thanh ĐẠT — LINK LIVE từ tab QC 'Kiểm thanh' (Σ Đạt + Ngoại lệ của các lượt kiểm cùng cỡ)">SL đạt (từ QC)</th>
            <th class="text-right" title="Số thanh LỖI = đã kiểm − đạt">Lỗi</th>
            <th class="text-right" title="Số thanh chưa có kết quả QC">Chờ kiểm</th>
          </tr></thead>
          <tbody><tr>
            <td class="x2-btinh-in-cell">${inCell}</td>
            <td class="text-right"><strong>${fmtThanh(inQty)}</strong></td>
            <td class="x2-btinh-out-cell">${outCell}</td>
            <td class="text-right"><strong style="color:#16a34a;">${fmtThanh(ok)}</strong>${checked > 0 ? ` <small style="color:var(--text-muted);">/${fmtThanh(checked)}</small>` : ''}</td>
            <td class="text-right"><strong style="color:#b45309;">${fmtThanh(err)}</strong></td>
            <td class="text-right">${pendCell}</td>
          </tr></tbody>
          <tfoot><tr>
            <td><strong>Tổng</strong></td>
            <td class="text-right"><strong>${fmtThanh(inQty)}</strong></td>
            <td></td>
            <td class="text-right"><strong>${fmtThanh(ok)}</strong></td>
            <td class="text-right"><strong>${fmtThanh(err)}</strong></td>
            <td class="text-right"><strong>${fmtThanh(pend)}</strong></td>
          </tr></tfoot>
        </table>
      </div>`;
    initLucide();
  }

  // BẢNG TỔNG HỢP: Kích thước vào · Số lượng vào · KÍCH THƯỚC SAU BÀO (mỗi dòng) · SL thanh ĐẠT
  // KHÔNG hiện SL thanh lỗi ở form (lỗi = vào − đạt, chỉ hiện ở bảng lịch sử)
  function renderX2BaoTinhGroups() {
    const box = document.getElementById('x2-btinh-groups');
    const actions = document.getElementById('x2-btinh-actions');
    if (!box) return;
    const kind = baoTinhKindOf();
    if (kind === 'bao_thanh') {
      // 'Bào thanh': dòng CHỈ ĐỌC (nguồn + SL vào + cỡ đầu ra + ĐẠT từ QC + lỗi + chờ kiểm)
      if (actions) actions.style.display = 'none';
      box.style.display = '';
      renderBaoThanhSummaryTable(box);
      return;
    }
    const groups = baoTinhGroups();
    const show = groups.length > 0;
    box.style.display = show ? '' : 'none';
    if (actions) actions.style.display = show ? '' : 'none';
    if (!show) { box.innerHTML = ''; return; }
    const dimCellOut = (g, part, ph) => {
      const o = btinhOutDraft.get(g.key) || {};
      const v = (o[part] == null || o[part] === '') ? '' : String(o[part]);
      return `<input type="number" class="x2-btinh-dim" data-btinh-out="${escapeHTML(g.key)}" data-out-part="${part}" min="0" step="any" placeholder="${ph}" value="${escapeHTML(v)}">`;
    };
    // Ô nháp: SL LỖI · TÓP · KHÁC (số) + NỘI DUNG "Khác" — chỉ nguồn PHIẾU XUẤT
    const numCell = (attr, map, key, ph) => {
      const v = map.get(key);
      return `<input type="number" class="x2-btinh-ok" data-${attr}="${escapeHTML(key)}" min="0" step="1" placeholder="${ph}" value="${(v == null) ? '' : escapeHTML(String(v))}">`;
    };
    const numDraft = (map, key) => Math.max(0, Math.round(Number(map.get(key)) || 0));
    const rows = groups.map(g => {
      const ok = btinhOkDraft.get(g.key);
      const okTxt = (ok == null) ? '' : String(ok);
      const inCell = `<span class="x2-nan-chip">${comboLabel({ d: g.dims[0], r: g.dims[1], t: g.dims[2] })}</span>${g.sources.length > 1 ? ` <small class="x2-btinh-src">${g.sources.length} phiếu</small>` : ''}`;
      const qtyCell = `<strong>${fmtThanh(g.inQty)}</strong>`;
      // ── NGUỒN PHIẾU XUẤT: KT sau bào nhập 1 DÒNG TEXT · thêm Lỗi / Tóp / Khác + Tồn ──
      if (kind === 'tinh') {
        const raw = btinhOutRaw.get(g.key) || '';
        const errN = numDraft(btinhErrDraft, g.key);
        const topN = numDraft(btinhTopDraft, g.key);
        const othN = numDraft(btinhOtherDraft, g.key);
        const othNote = btinhOtherNoteDraft.get(g.key) || '';
        const ton = Math.max(0, g.inQty - (Math.max(0, Math.round(Number(ok) || 0)) + errN + topN + othN));
        return `<tr data-btinh-row="${escapeHTML(g.key)}">
          <td class="x2-btinh-in-cell">${inCell}</td>
          <td class="text-right x2-btinh-qty-cell">${qtyCell}</td>
          <td class="x2-btinh-out-cell"><input type="text" class="x2-btinh-out-text" data-btinh-out-raw="${escapeHTML(g.key)}" placeholder="VD: 1250x20x5" autocomplete="off" value="${escapeHTML(raw)}"></td>
          <td class="x2-btinh-ok-cell">${numCell('btinh-ok', btinhOkDraft, g.key, '0')}</td>
          <td class="x2-btinh-ok-cell">${numCell('btinh-err', btinhErrDraft, g.key, '0')}</td>
          <td class="x2-btinh-ok-cell">${numCell('btinh-top', btinhTopDraft, g.key, '0')}</td>
          <td class="x2-btinh-ok-cell">${numCell('btinh-other', btinhOtherDraft, g.key, '0')} <input type="text" class="x2-btinh-other-note" data-btinh-other-note="${escapeHTML(g.key)}" placeholder="nội dung khác…" autocomplete="off" value="${escapeHTML(othNote)}"></td>
          <td class="text-right x2-btinh-ton-cell"><strong class="x2-btinh-ton">${fmtThanh(ton)}</strong></td>
        </tr>`;
      }
      // ── HẠ CẤP: giữ nguyên 3 ô kích thước + SL đạt (lỗi = vào − đạt, tự tính) ──
      return `<tr data-btinh-row="${escapeHTML(g.key)}">
        <td class="x2-btinh-in-cell">${inCell}</td>
        <td class="text-right x2-btinh-qty-cell">${qtyCell}</td>
        <td class="x2-btinh-out-cell"><span class="x2-btinh-dims">${dimCellOut(g, 'd', 'Dài')}<span class="x2-dim-x">×</span>${dimCellOut(g, 'r', 'Rộng')}<span class="x2-dim-x">×</span>${dimCellOut(g, 't', 'Dày')}</span></td>
        <td class="x2-btinh-ok-cell"><input type="number" class="x2-btinh-ok" data-btinh-ok="${escapeHTML(g.key)}" min="0" step="1" placeholder="0" value="${escapeHTML(okTxt)}"></td>
        <td class="text-right"></td>
      </tr>`;
    }).join('');
    const tIn = groups.reduce((s, g) => s + g.inQty, 0);
    const tOk = groups.reduce((s, g) => s + Math.min(Math.max(0, Math.round(Number(btinhOkDraft.get(g.key)) || 0)), g.inQty), 0);
    // Tổng Lỗi / Tóp / Khác / Tồn — chỉ nhánh NGUỒN PHIẾU (kind 'tinh')
    const dOf = (m, g) => Math.max(0, Math.round(Number(m.get(g.key)) || 0));
    const tErr = kind === 'tinh' ? groups.reduce((s, g) => s + dOf(btinhErrDraft, g), 0) : 0;
    const tTop = kind === 'tinh' ? groups.reduce((s, g) => s + dOf(btinhTopDraft, g), 0) : 0;
    const tOth = kind === 'tinh' ? groups.reduce((s, g) => s + dOf(btinhOtherDraft, g), 0) : 0;
    const tTon = kind === 'tinh' ? groups.reduce((s, g) => s + Math.max(0, g.inQty - (dOf(btinhOkDraft, g) + dOf(btinhErrDraft, g) + dOf(btinhTopDraft, g) + dOf(btinhOtherDraft, g))), 0) : 0;
    box.innerHTML = `
      <div class="x2-btinh-groups-head">
        ${(kind === 'tinh')
          ? `<i data-lucide="calculator"></i> Tổng hợp theo <strong>kích thước trong phiếu xuất</strong> — nhập <strong>KT sau bào</strong> 1 dòng (VD 1250x20x5) · Đạt · Lỗi · Tóp · Khác. <strong>Tồn = tổng − Đạt − Lỗi − Tóp − Khác</strong> (phần chưa làm vẫn ở trong phiếu, làm tiếp ngày sau)`
          : `<i data-lucide="calculator"></i> Tổng hợp theo <strong>kích thước chung</strong> (không chia phân loại) — mỗi dòng điền <strong>kích thước sau bào</strong> + <strong>SL thanh đạt</strong>`}
      </div>
      <div class="x2-btinh-group-scroll">
        <table class="data-table x2-btinh-group-table">
          ${(kind === 'tinh')
            ? `<thead><tr>
                <th title="Kích thước thanh TRƯỚC khi bào (trong phiếu xuất)">K.thước vào</th>
                <th class="text-right" title="Tổng số thanh của kích thước này còn lại trong phiếu">SL vào</th>
                <th title="Kích thước SAU khi bào — nhập 1 dòng, VD 1250x20x5">KT sau bào</th>
                <th title="Số thanh ĐẠT của dòng này">SL đạt</th>
                <th title="Số thanh LỖI nhập tay">SL lỗi</th>
                <th title="Số thanh TÓP (hao hụt)">Tóp</th>
                <th title="Số thanh KHÁC + ghi rõ nội dung loại khác">Khác</th>
                <th class="text-right" title="Tồn = tổng − Đạt − Lỗi − Tóp − Khác — phần CHƯA LÀM còn ở trong phiếu">Tồn</th>
              </tr></thead>`
            : `<thead><tr>
                <th title="Kích thước thanh TRƯỚC khi bào (kích thước chung của các thẻ đã chọn)">K.thước vào</th>
                <th class="text-right" title="Tổng số thanh lấy từ các thẻ của kích thước này">SL vào</th>
                <th title="Kích thước SAU khi bào (Dài × Rộng × Dày, mm)">K.thước sau bào</th>
                <th title="Số thanh ĐẠT của dòng này — SL thanh LỖI tự tính = thanh vào − thanh đạt (hiện ở bảng lịch sử)">SL đạt</th>
                <th></th>
              </tr></thead>`}
          <tbody>${rows}</tbody>
          ${(kind === 'tinh')
            ? `<tfoot><tr>
                <td><strong>Tổng</strong></td>
                <td class="text-right"><strong>${fmtThanh(tIn)}</strong></td>
                <td></td>
                <td><strong>${fmtThanh(tOk)}</strong></td>
                <td><strong>${fmtThanh(tErr)}</strong></td>
                <td><strong>${fmtThanh(tTop)}</strong></td>
                <td><strong>${fmtThanh(tOth)}</strong></td>
                <td class="text-right"><strong>${fmtThanh(tTon)}</strong></td>
              </tr></tfoot>`
            : `<tfoot><tr>
                <td><strong>Tổng</strong></td>
                <td class="text-right"><strong>${fmtThanh(tIn)}</strong></td>
                <td></td>
                <td><strong>${fmtThanh(tOk)}</strong></td>
                <td></td>
              </tr></tfoot>`}
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
    // Nguồn phiếu xuất: còn 4 ô Tổng nữa — Lỗi · Tóp · Khác · Tồn (8 cột)
    if (tds.length >= 8 && baoTinhKindOf() === 'tinh') {
      const dOf = (m, g) => Math.max(0, Math.round(Number(m.get(g.key)) || 0));
      const tErr = groups.reduce((s, g) => s + dOf(btinhErrDraft, g), 0);
      const tTop = groups.reduce((s, g) => s + dOf(btinhTopDraft, g), 0);
      const tOth = groups.reduce((s, g) => s + dOf(btinhOtherDraft, g), 0);
      const tTon = groups.reduce((s, g) => s + Math.max(0, g.inQty - (dOf(btinhOkDraft, g) + dOf(btinhErrDraft, g) + dOf(btinhTopDraft, g) + dOf(btinhOtherDraft, g))), 0);
      tds[4].innerHTML = `<strong>${fmtThanh(tErr)}</strong>`;
      tds[5].innerHTML = `<strong>${fmtThanh(tTop)}</strong>`;
      tds[6].innerHTML = `<strong>${fmtThanh(tOth)}</strong>`;
      tds[7].innerHTML = `<strong>${fmtThanh(tTon)}</strong>`;
      // Cập nhật TỒN từng dòng (không vẽ lại bảng → giữ con trỏ ô nhập)
      groups.forEach(g => {
        const esc = (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') ? CSS.escape(g.key) : String(g.key).replace(/"/g, '\\"');
        const row = (typeof box.querySelector === 'function') ? box.querySelector(`tr[data-btinh-row="${esc}"]`) : null;
        const tonEl = row && typeof row.querySelector === 'function' ? row.querySelector('.x2-btinh-ton') : null;
        if (tonEl) {
          const v = Math.max(0, g.inQty - (dOf(btinhOkDraft, g) + dOf(btinhErrDraft, g) + dOf(btinhTopDraft, g) + dOf(btinhOtherDraft, g)));
          tonEl.textContent = fmtThanh(v);
        }
      });
    }
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
    const isBt = (kind === 'bao_thanh');
    const btEditing = isBt && state.x2BaoTinhEditId ? baoTinhRecOf(state.x2BaoTinhEditId) : null;
    // 'Bào thanh' → ĐẠT đọc LIVE từ QC (lượt đang sửa); lượt mới = 0 (chờ QC)
    const tOk = isBt
      ? ((btEditing && btEditing.kind === 'bao_thanh') ? baoTinhQtyOkOf(btEditing) : 0)
      : groups.reduce((s, g) => s + Math.min(Math.max(0, Math.round(Number(btinhOkDraft.get(g.key)) || 0)), g.inQty), 0);
    const okPct = tIn > 0 ? (tOk / tIn) * 100 : null;
    // Thể tích đạt: cộng theo TỪNG dòng (mỗi dòng 1 kích thước sau bào riêng)
    let volOk = 0;
    let volAny = false;
    groups.forEach(g => {
      const o = (isBt && g.outDims && g.outDims.length === 3) ? g.outDims : baoTinhOutDimsOf(g.key);
      if (!(o[0] > 0 && o[1] > 0 && o[2] > 0)) return;
      volAny = true;
      const q = Math.min(Math.max(0, Math.round(Number(btinhOkDraft.get(g.key)) || 0)), g.inQty);
      volOk += q * unitVolOf(o[0], o[1], o[2]);
    });
    const kindTxt = kind === 'bao_thanh'
      ? '<strong style="color:#b45309;">bào thanh (đầu vào Ép Ván / thanh lỗi · đạt LINK từ QC)</strong>'
      : kind === 'ha_cap'
        ? '<strong style="color:#b45309;">thanh lỗi (hạ cấp)</strong>'
        : '<strong style="color:#0f766e;">PHIẾU XUẤT KHO mục đích Bào Tinh (qua Sấy 2)</strong>';
    // Nguồn phiếu: còn Lỗi · Tóp · Khác · TỒN (phần chưa làm — vẫn ở trong phiếu)
    const nOf = (m, g) => Math.max(0, Math.round(Number(m.get(g.key)) || 0));
    const isNoteRows = (kind === 'tinh');
    const tErr2 = isNoteRows ? groups.reduce((s, g) => s + nOf(btinhErrDraft, g), 0) : 0;
    const tTop2 = isNoteRows ? groups.reduce((s, g) => s + nOf(btinhTopDraft, g), 0) : 0;
    const tOth2 = isNoteRows ? groups.reduce((s, g) => s + nOf(btinhOtherDraft, g), 0) : 0;
    const tTon2 = isNoteRows ? groups.reduce((s, g) => s + Math.max(0, g.inQty - (nOf(btinhOkDraft, g) + nOf(btinhErrDraft, g) + nOf(btinhTopDraft, g) + nOf(btinhOtherDraft, g))), 0) : 0;
    box.innerHTML = `
      <span class="x2-ong-calc-item x2-ong-calc-in" title="Tổng số thanh của các phiếu đã chọn (cộng cả các hàng tự nhập)"><span class="x2-ong-calc-label">Tổng vào:</span><strong>${fmtThanh(tIn)} thanh</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-bo" title="Tổng SL thanh ĐẠT đã nhập trong bảng tổng hợp"><span class="x2-ong-calc-label">Đạt:</span><strong>${fmtThanh(tOk)} thanh</strong></span>
      ${isNoteRows ? `
      <span class="x2-ong-calc-item" title="SL thanh LỖI nhập tay của dòng"><span class="x2-ong-calc-label">Lỗi:</span><strong>${fmtThanh(tErr2)} thanh</strong></span>
      <span class="x2-ong-calc-item" title="SL thanh TÓP (hao hụt) — vào tồn trung gian chờ xử lý"><span class="x2-ong-calc-label">Tóp:</span><strong>${fmtThanh(tTop2)} thanh</strong></span>
      <span class="x2-ong-calc-item" title="SL thanh KHÁC — vào tồn trung gian chờ xử lý"><span class="x2-ong-calc-label">Khác:</span><strong>${fmtThanh(tOth2)} thanh</strong></span>
      <span class="x2-ong-calc-item x2-ong-calc-after" title="Tồn = tổng − Đạt − Lỗi − Tóp − Khác — phần CHƯA LÀM vẫn ở trong phiếu, làm tiếp ngày sau"><span class="x2-ong-calc-label">Tồn:</span><strong>${fmtThanh(tTon2)} thanh</strong></span>` : ''}
      <span class="x2-ong-calc-item" title="Tỷ lệ đạt = tổng thanh đạt ÷ tổng thanh vào (SL thanh lỗi tự tính chỉ hiện ở bảng lịch sử)"><span class="x2-ong-calc-label">Tỷ lệ đạt:</span><strong>${okPct == null ? '—' : `${fmtRatio(okPct)}%`}</strong></span>
      <span class="x2-ong-calc-item" title="Thể tích thanh ĐẠT: cộng theo TỪNG dòng, mỗi dòng dùng kích thước SAU BÀO của nó"><span class="x2-ong-calc-label">Thể tích đạt:</span><strong>${volAny ? `${(Math.round(volOk * 10000) / 10000).toFixed(4)} m³` : '—'}</strong></span>
      <span class="x2-ong-calc-item" title="Nguồn thanh của lượt bào này"><span class="x2-ong-calc-label">Nguồn:</span>${kindTxt}</span>`;
  }

  // Vẽ 4 trường của "Bào thanh": Chọn thanh đầu vào · Số lượng · Đầu ra · SL đạt (từ QC)
  function renderX2BaoThanhForm() {
    const inItem = baoTinhBaoThanhInItem();
    const outItem = baoTinhBaoThanhOutItem();
    const inText = document.getElementById('x2-btinh-bt-in-text');
    if (inText) {
      inText.textContent = inItem
        ? `${comboLabel({ d: inItem.dims[0], r: inItem.dims[1], t: inItem.dims[2] })} · ${inItem.cls}`
        : 'Chọn thanh đầu vào';
    }
    const inCount = document.getElementById('x2-btinh-bt-in-count');
    if (inCount) inCount.textContent = inItem ? `còn ${fmtThanh(inItem.remaining)}/${fmtThanh(inItem.total)}` : 'Chưa chọn';
    const outText = document.getElementById('x2-btinh-bt-out-text');
    if (outText) {
      outText.textContent = outItem
        ? comboLabel({ d: outItem.dims[0], r: outItem.dims[1], t: outItem.dims[2] })
        : 'Chọn kích thước đầu ra';
    }
    const hint = document.getElementById('x2-btinh-bt-qty-hint');
    if (hint) {
      hint.textContent = inItem
        ? `Tối đa ${fmtThanh(inItem.remaining)} thanh (còn lại của nguồn)`
        : 'Chọn thanh đầu vào trước';
    }
    // Ô SỐ LƯỢNG ĐẠT — LINK LIVE từ tab QC ("Kiểm thanh" — thẻ Kiểm Sau Sản Xuất)
    const okEl = document.getElementById('x2-btinh-bt-ok');
    const okHint = document.getElementById('x2-btinh-bt-ok-hint');
    const editing = state.x2BaoTinhEditId ? baoTinhRecOf(state.x2BaoTinhEditId) : null;
    if (okEl) {
      if (editing && editing.kind === 'bao_thanh' && outItem && String(editing.outSizeKey || '') === outItem.sizeKey) {
        const pend = baoTinhPendingOf(editing);
        okEl.value = fmtThanh(baoTinhQtyOkOf(editing));
        if (okHint) {
          okHint.textContent = pend > 0
            ? `Đã kiểm ${fmtThanh(baoTinhCheckedOf(editing))}/${fmtThanh(editing.inQty)} · lỗi ${fmtThanh(baoTinhQtyErrOf(editing))} · còn ${fmtThanh(pend)} chờ QC`
            : `Đã kiểm đủ · lỗi ${fmtThanh(baoTinhQtyErrOf(editing))} thanh`;
        }
      } else if (outItem) {
        const st = baoThanhOutSizeQcStats(outItem.sizeKey);
        okEl.value = '0';
        if (okHint) {
          okHint.textContent = st.total > 0
            ? `Cỡ này đã có ${fmtThanh(st.total)} thanh (đã kiểm ${fmtThanh(st.checked)} · còn ${fmtThanh(st.pending)} chờ QC)`
            : 'Lượt mới — số đạt tự cập nhật khi QC "Kiểm thanh" nhập kết quả cho cỡ này';
        }
      } else {
        okEl.value = '—';
        if (okHint) okHint.textContent = 'Chọn kích thước đầu ra để xem số đạt từ QC';
      }
    }
    renderBaoThanhInputList();
    renderBaoThanhOutList();
  }

  // Chuẩn hóa chuỗi TÌM NHANH: bỏ dấu + bỏ dấu phân cách nghìn
  // → gõ "1000" khớp "1.000", gõ "500" khớp "còn 500/1.000 thanh"
  function baoTinhSearchNorm(s) {
    return bulligNorm(s).replace(/(\d)\.(\d)/g, '$1$2');
  }
  // Danh sách THẺ nguồn đầu vào Bào thanh — 2 NHÓM: thanh BTP Ép Ván + thanh LỖI
  // do chính Bào thanh tạo ra (đọc LIVE từ tab QC): 2 dòng: kích thước · nguồn ·
  // "còn X/Y thanh" / chip nguồn + số tổng. KHÔNG lọc theo tuần — lọc 2 Ô KẾT HỢP
  // (ô chữ = kích thước/nguồn/loại · ô RIÊNG = CHỈ số lượng — điều kiện VÀ).
  function renderBaoThanhInputList() {
    const listEl = document.getElementById('x2-btinh-bt-in-list');
    if (!listEl) return;
    const head = `<div class="al-picker-head"><i data-lucide="calendar-range"></i> Nguồn đầu vào: <strong>thanh BTP Ép Ván</strong> + <strong>thanh lỗi Bào thanh</strong> (không lọc theo tuần)</div>`;
    const all = baoTinhInputPool();
    if (!all.length) {
      listEl.innerHTML = head +
        '<div class="al-empty">Chưa có nguồn nào — ghi lượt Ép Ván (khối "Ván Thô Tạo Ra") hoặc nhập kết quả QC ("Kiểm thanh") cho lượt Bào thanh (phần LỖI sẽ tự hiện ở đây).</div>';
      initLucide();
      return;
    }
    const qTxt = baoTinhSearchNorm(String((document.getElementById('x2-btinh-bt-in-search') || {}).value || '')).trim();
    const qQty = String((document.getElementById('x2-btinh-bt-in-qty-search') || {}).value || '').trim();
    // 2 ô LỌC KẾT HỢP (điều kiện VÀ): chữ (kích thước · nguồn · loại) ∧ số lượng (còn X/Y)
    const hits = all.filter(it =>
      (!qTxt || baoTinhSearchNorm(
        `${it.cls} ${it.location} ${comboLabel({ d: it.dims[0], r: it.dims[1], t: it.dims[2] })} ${it.sizeKey}`).includes(qTxt))
      && baoTinhQtyMatchVals([it.remaining, it.total], qQty));
    if (!hits.length) {
      const keys = [
        String((document.getElementById('x2-btinh-bt-in-search') || {}).value || '').trim(),
        String((document.getElementById('x2-btinh-bt-in-qty-search') || {}).value || '').trim()
      ].filter(Boolean).join(' · ');
      listEl.innerHTML = head + `<div class="al-empty">— Không tìm thấy thanh nào khớp "${escapeHTML(keys)}" —</div>`;
      initLucide();
      return;
    }
    listEl.innerHTML = head + hits.map(it => {
      const size = `${comboLabel({ d: it.dims[0], r: it.dims[1], t: it.dims[2] })} mm`;
      const on = String(it.id) === String(btinhBtIn);
      const dead = it.remaining <= 0;
      const main = `${it.cls} · ${size} · còn ${fmtThanh(it.remaining)}/${fmtThanh(it.total)} thanh`;
      const sub = `<span class="al-day-badge day-luuong" title="Nguồn thanh đầu vào">${escapeHTML(it.location)}</span>`
        + (it.used > 0 ? `<span class="al-day-badge day-k" title="Đã dùng trong cặp tuần này">đã dùng ${fmtThanh(it.used)}</span>` : '');
      return `<button type="button" class="al-card x2-btinh-card${on ? ' picked' : ''}${dead ? ' disabled' : ''}" data-btinh-bt-in="${escapeHTML(it.id)}" aria-pressed="${on ? 'true' : 'false'}"${dead ? ' aria-disabled="true"' : ''} title="${escapeHTML(main)}">
        <span class="al-card-body">
          <span class="al-card-main">${escapeHTML(main)}</span>
          <span class="al-card-sub">${sub}</span>
        </span>
      </button>`;
    }).join('');
    initLucide();
  }
  // Dropdown nổi CỠ ĐẦU RA — chỉ hiện cỡ thoả Rộng_vào × Dày_vào > Rộng_ra × Dày_ra
  function renderBaoThanhOutList() {
    const listEl = document.getElementById('x2-btinh-bt-out-list');
    if (!listEl) return;
    const inItem = baoTinhBaoThanhInItem();
    const inDims = inItem ? inItem.dims : null;
    const head = document.getElementById('x2-btinh-bt-out-head');
    if (head) {
      head.textContent = inDims
        ? `Cỡ hợp lệ: Rộng × Dày đầu vào ${inDims[1]}×${inDims[2]} > Rộng × Dày đầu ra`
        : 'Chưa chọn thanh đầu vào — đang hiện tất cả cỡ';
    }
    const cands = baoThanhOutCandidates(inDims);
    if (!cands.length) {
      listEl.innerHTML = '<div class="al-empty">— Không có cỡ nào nhỏ hơn kích thước đầu vào — chọn thanh đầu vào khác hoặc bấm "Thêm" —</div>';
      return;
    }
    listEl.innerHTML = cands.map(o => {
      const on = String(o.sizeKey) === String(btinhBtOut);
      const main = `${comboLabel({ d: o.dims[0], r: o.dims[1], t: o.dims[2] })} mm`;
      const sub = `<span class="al-day-badge day-luuong" title="Rộng × Dày đầu ra">R×D ${o.dims[1]}×${o.dims[2]}</span>`
        + (o.isDefault ? '' : '<span class="al-day-badge day-ext" title="Cỡ do người dùng khai báo thêm">tự thêm</span>');
      return `<button type="button" class="al-card x2-btinh-card${on ? ' picked' : ''}" data-btinh-bt-out="${escapeHTML(o.sizeKey)}" aria-pressed="${on ? 'true' : 'false'}" title="${escapeHTML(main)}">
        <span class="al-card-body">
          <span class="al-card-main">${escapeHTML(main)}</span>
          <span class="al-card-sub">${sub}</span>
        </span>
      </button>`;
    }).join('');
    initLucide();
  }

  // ─── TRẠNG THÁI FORM "BÀO THANH" (chọn đầu vào / đầu ra) ───────
  let btinhBtIn = '';    // id thẻ nguồn đầu vào đang chọn ('p:…' Ép Ván / 'd:…' lỗi)
  let btinhBtOut = '';   // sizeKey cỡ ĐẦU RA đang chọn
  function baoTinhBaoThanhInItem() {
    if (!btinhBtIn) return null;
    return baoTinhInputPool().find(x => x.id === btinhBtIn) || null;
  }
  function baoTinhBaoThanhOutItem() {
    if (!btinhBtOut) return null;
    return baoThanhOutList().find(x => x.sizeKey === btinhBtOut) || null;
  }
  function baoTinhBaoThanhQtyIn() {
    const el = document.getElementById('x2-btinh-bt-qty');
    const v = Number((el && el.value) || 0);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }
  function setBaoThanhInput(id) {
    btinhBtIn = String(id || '');
    const panel = document.getElementById('x2-btinh-bt-in-picker');
    if (panel) panel.hidden = true;
    const btn = document.getElementById('x2-btinh-bt-in-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    renderX2BaoThanhForm();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
  }
  function setBaoThanhOut(sizeKey) {
    btinhBtOut = String(sizeKey || '');
    const panel = document.getElementById('x2-btinh-bt-out-picker');
    if (panel) panel.hidden = true;
    const btn = document.getElementById('x2-btinh-bt-out-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    renderX2BaoThanhForm();
    renderX2BaoTinhGroups();
    renderX2BaoTinhCalc();
  }
  function toggleBaoThanhInputPicker() {
    const panel = document.getElementById('x2-btinh-bt-in-picker');
    if (!panel) return false;
    if (panel.hidden) x2FloatShow('x2-btinh-bt-in-picker', 'x2-btinh-bt-in-btn', renderBaoThanhInputList);
    else x2FloatHide('x2-btinh-bt-in-picker', 'x2-btinh-bt-in-btn');
    return !panel.hidden;
  }
  function toggleBaoThanhOutPicker() {
    const panel = document.getElementById('x2-btinh-bt-out-picker');
    if (!panel) return false;
    if (panel.hidden) x2FloatShow('x2-btinh-bt-out-picker', 'x2-btinh-bt-out-btn', renderBaoThanhOutList);
    else x2FloatHide('x2-btinh-bt-out-picker', 'x2-btinh-bt-out-btn');
    return !panel.hidden;
  }

  function resetXuong2BaoTinhForm() {
    state.x2BaoTinhEditId = null;
    btinhPicked = [];
    btinhOkDraft.clear();
    btinhOutDraft.clear();
    btinhErrDraft.clear();
    btinhTopDraft.clear();
    btinhOtherDraft.clear();
    btinhOtherNoteDraft.clear();
    btinhOutRaw.clear();
    btinhBtIn = '';
    btinhBtOut = '';
    const d = document.getElementById('x2-btinh-date');
    if (d) d.value = '';
    const k = document.getElementById('x2-btinh-kind');
    if (k) k.value = 'tinh';
    const q = document.getElementById('x2-btinh-bt-qty');
    if (q) q.value = '';
    ['x2-btinh-picker', 'x2-btinh-bt-in-picker', 'x2-btinh-bt-out-picker'].forEach(id => {
      const panel = document.getElementById(id);
      if (panel) panel.hidden = true;
    });
    syncX2BaoTinhKindRows(true);
    renderX2BaoTinhList();
    renderX2BaoThanhForm();
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

    // ── NGUỒN THANH ───────────────────────────────────────────────
    // 'tinh' / 'ha_cap' → các THẺ đã chọn, gộp theo KÍCH THƯỚC CHUNG (không chia phân loại)
    // 'bao_thanh'      → 1 cặp (Chọn thanh đầu vào → Đầu ra); ĐẠT đọc LIVE từ tab QC
    let defectKey = '', defectDims = [], inDims = [];
    let btInItem = null, btOutItem = null;
    if (kind === 'bao_thanh') {
      btInItem = baoTinhBaoThanhInItem();
      btOutItem = baoTinhBaoThanhOutItem();
      if (!btInItem) { showToast('Bấm "Chọn thanh đầu vào" rồi chọn 1 cỡ thanh đem bào!', 'error'); return; }
      const qtyIn = baoTinhBaoThanhQtyIn();
      if (qtyIn <= 0) { showToast('Nhập SỐ LƯỢNG thanh đem bào (lớn hơn 0)!', 'error'); return; }
      if (qtyIn > btInItem.remaining) {
        showToast(`Số lượng vượt phần CÒN LẠI của nguồn (còn ${fmtThanh(btInItem.remaining)}/${fmtThanh(btInItem.total)} thanh) — kiểm tra lại!`, 'error');
        return;
      }
      if (!btOutItem) { showToast('Bấm "Đầu ra" rồi chọn cỡ thanh SAU khi bào!', 'error'); return; }
      if (!baoTinhBaoThanhOutCandidatesOk(btInItem.dims, btOutItem.sizeKey)) {
        showToast('Cỡ đầu ra phải NHỎ HƠN kích thước đầu vào (Rộng × Dày đầu vào > Rộng × Dày đầu ra)!', 'error');
        return;
      }
    } else {
      const picked = btinhPicked.slice();
      if (!picked.length) {
        showToast(kind === 'ha_cap'
          ? 'Bấm "Chọn thanh lỗi" rồi chọn (các) cỡ thanh lỗi cần hạ cấp!'
          : 'Bấm "Chọn thanh nan" rồi chọn (các) thẻ thanh cần bào!', 'error');
        return;
      }
      const all = baoTinhCandidates().filter(c => picked.includes(String(c.id)));
      if (!all.length) { showToast('Không tìm thấy thẻ thanh đã chọn — chọn lại giúp!', 'error'); return; }
    }

    // BẢNG TỔNG HỢP: mỗi dòng → KÍCH THƯỚC SAU BÀO + SL thanh ĐẠT
    // SL thanh LỖI = vào − đạt (tự tính, chỉ hiện ở bảng lịch sử)
    const groups = baoTinhGroups();
    const plans = [];
    let skipped = 0;
    const exId = state.x2BaoTinhEditId || null;   // lượt đang sửa → kho NoteSizeRows cộng lại phần cũ
    if (kind === 'bao_thanh') {
      // 1 LƯỢT = 1 cặp (đầu vào → đầu ra). qtyOk/qtyErr KHÔNG lưu cứng —
      // đọc LIVE từ tab QC ("Kiểm thanh") qua getBaoTinhQcAlloc().
      plans.push({ g: groups[0], outDims: btOutItem.dims, qtyOk: 0, qtyErr: 0 });
    } else {
      if (!groups.length) { showToast('Chưa có số liệu để lưu — kiểm tra kích thước/số lượng thanh!', 'error'); return; }
      for (const g of groups) {
        const out = baoTinhOutDimsOf(g.key);
        // ── NGUỒN PHIẾU XUẤT (kind 'tinh'): Đạt · Lỗi · Tóp · Khác NHẬP TAY ──
        // Số RÚT khỏi phiếu = Đạt + Lỗi + Tóp + Khác · Tồn = vào − số rút (ở lại phiếu)
        if (kind === 'tinh') {
          const n = (m) => Math.max(0, Math.round(Number(m.get(g.key)) || 0));
          const okRaw = n(btinhOkDraft), errRaw = n(btinhErrDraft), topRaw = n(btinhTopDraft), othRaw = n(btinhOtherDraft);
          const taken = okRaw + errRaw + topRaw + othRaw;
          if (taken <= 0 && !(out[0] > 0)) { skipped++; continue; }
          if (!g.sizeKey || g.inQty <= 0) {
            showToast('Có dòng chưa nhập đủ KÍCH THƯỚC TRƯỚC BÀO hoặc SỐ LƯỢNG — kiểm tra bảng tổng hợp!', 'error');
            return;
          }
          if (taken <= 0) {
            showToast(`Kích thước ${g.sizeKey}: chưa nhập số liệu (Đạt/Lỗi/Tóp/Khác) — nhập rồi bấm Lưu!`, 'error');
            return;
          }
          if (taken > g.inQty) {
            showToast(`Kích thước ${g.sizeKey}: tổng Đạt+Lỗi+Tóp+Khác (${fmtThanh(taken)}) vượt SL vào (${fmtThanh(g.inQty)}) — kiểm tra lại!`, 'error');
            return;
          }
          if (!(out[0] > 0 && out[1] > 0 && out[2] > 0)) {
            showToast(`Kích thước ${g.sizeKey}: nhập KÍCH THƯỚC SAU BÀO (VD 1250x20x5) cho dòng này!`, 'error');
            return;
          }
          // Phân bổ FIFO số rút vào các PHIẾU đã chọn (phiếu cũ trước, trong phiếu theo lô)
          const alloc = khoNoteAllocate(g.noteIds || [], g.sizeKey, taken, exId);
          if (!alloc.ok) {
            showToast(`Kích thước ${g.sizeKey}: các phiếu đã chọn không đủ ${fmtThanh(taken)} thanh (còn ${fmtThanh(alloc.left)}) — chọn thêm phiếu hoặc giảm số liệu!`, 'error');
            return;
          }
          plans.push({
            g, outDims: out, qtyOk: okRaw, qtyErr: errRaw,
            qtyTop: topRaw, qtyOther: othRaw,
            otherNote: btinhOtherNoteDraft.get(g.key) || '',
            taken, alloc
          });
          continue;
        }
        // ── HẠ CẤP: lỗi = vào − đạt (tự tính như cũ) ──
        const okRaw = Math.round(Math.max(0, Number(btinhOkDraft.get(g.key)) || 0));
        if (okRaw <= 0 && !(out[0] > 0 || out[1] > 0 || out[2] > 0)) { skipped++; continue; }
        if (!g.sizeKey || g.inQty <= 0) {
          showToast('Có dòng chưa nhập đủ KÍCH THƯỚC TRƯỚC BÀO hoặc SỐ LƯỢNG — kiểm tra bảng tổng hợp!', 'error');
          return;
        }
        if (okRaw <= 0) {
          showToast(`Kích thước ${g.sizeKey}: chưa nhập SL thanh ĐẠT — nhập rồi bấm Lưu!`, 'error');
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
    }

    // NGƯỜI BÀO + THỜI GIAN: TỰ ĐỘNG từ Bảng bố trí Nhân Sự (vị trí Bào tinh / Bào thanh)
    const snap = hrBaoTinhSnapshot(dateVal);
    const recOfGroup = (plan) => {
      const g = plan.g;
      const outDims = plan.outDims;                                  // KÍCH THƯỚC SAU BÀO của RIÊNG dòng này
      const unitVol = unitVolOf(outDims[0], outDims[1], outDims[2]);
      const outSizeKey = dimKeyOf(outDims[0], outDims[1], outDims[2]);
      const isBt = (kind === 'bao_thanh');
      const isNote = (kind === 'tinh' && plan.alloc);   // nguồn = PHIẾU XUẤT KHO
      // ── NGUỒN PHIẾU XUẤT: sources = lô được phân bổ FIFO trong phiếu (link
      //    planning/đối chiếu) · noteUses = số rút theo (phiếu, lô) ──
      const allocLots = isNote ? plan.alloc.lots : [];
      const first = isNote ? (allocLots[0] || null) : ((g.sources || []).filter(s => kind === 'tinh')[0] || null);
      const defect = kind === 'ha_cap' ? baoTinhDefectStockOf(g.sizeKey) : null;
      const taken = isNote ? (plan.taken || 0) : 0;
      return {
        date: dateVal,
        week: materialWeekLabel(dateVal),
        kind,
        // Nguồn (kèm snapshot phòng khi lô/cỡ bị xóa)
        sources: isNote
          ? allocLots.map(l => ({ batchId: l.batchId, code: l.code || '', location: l.location || '', dims: l.dims, qty: l.qty }))
          : (g.sources || []).filter(s => kind === 'tinh').map(s => ({
              batchId: s.id, code: s.code || '', location: s.location || '', dims: s.dims, qty: Number(s.qty) || 0
            })),
        // SỐ RÚT khỏi phiếu xuất theo từng (phiếu, lô, kích thước) — tồn phiếu tính từ đây
        noteUses: isNote ? plan.alloc.uses : [],
        batchId: first ? first.batchId || first.id : '',
        batchCode: first ? (first.code || '') : '',
        batchLocation: first ? (first.location || '') : '',
        batchDims: first ? first.dims : [],
        batchQty: first ? (Number(first.qty) || 0) : 0,
        defectKey: kind === 'ha_cap' ? g.sizeKey : '',
        defectDims: defect ? defect.dims : (kind === 'ha_cap' ? g.dims : []),
        // 'bao_thanh': nguồn = thanh BTP Ép Ván ('press') hoặc thanh LỖI của chính
        // Bào thanh ('defect') — nhớ đúng nhóm nguồn người dùng vừa chọn
        inSource: isBt ? ((btInItem && btInItem.inSource) || 'press') : '',
        inDims: isBt ? (btInItem ? btInItem.dims : []) : [],
        manualRowId: '',
        // Số thanh RÚT khỏi nguồn của dòng (phiếu: Đạt+Lỗi+Tóp+Khác; hạ cấp: tổng vào)
        inQty: isBt ? baoTinhBaoThanhQtyIn() : (isNote ? taken : g.inQty),
        inSizeKey: isBt ? (btInItem ? btInItem.sizeKey : '') : g.sizeKey,
        // Kết quả — 'bao_thanh' để 0 (ĐẠT/LỖI đọc LIVE từ tab QC "Kiểm thanh")
        outDims,
        outSizeKey,
        unitVol,
        qtyOk: isBt ? 0 : plan.qtyOk,
        qtyErr: isBt ? 0 : plan.qtyErr,   // phiếu: NHẬP TAY · hạ cấp: vào − đạt (tự tính)
        // TÓP / KHÁC + ghi chú loại khác — chỉ nguồn phiếu xuất (tồn trung gian chờ xử lý)
        qtyTop: isNote ? (plan.qtyTop || 0) : 0,
        qtyOther: isNote ? (plan.qtyOther || 0) : 0,
        otherNote: isNote ? (plan.otherNote || '') : '',
        volumeOk: isBt ? 0 : Math.round(plan.qtyOk * unitVol * 10000) / 10000,
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
      const doneMsg = (kind === 'bao_thanh')
        ? `Đã ghi lượt Bào thanh: ${fmtThanh(plans[0].g.inQty)} thanh ${btInItem ? btInItem.sizeKey : ''} → ${btOutItem ? btOutItem.sizeKey : ''} (số ĐẠT sẽ tự cập nhật từ tab QC "Kiểm thanh")!`
        : `Đã ghi ${plans.length} lượt bào tinh (${plans.reduce((s, p) => s + p.qtyOk, 0).toLocaleString('vi-VN')} thanh đạt)` +
          (skipped ? ` · bỏ qua ${skipped} kích thước chưa nhập SL đạt` : '') + '!';
      showToast(doneMsg, 'success');
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
    btinhErrDraft.clear();
    btinhTopDraft.clear();
    btinhOtherDraft.clear();
    btinhOtherNoteDraft.clear();
    btinhOutRaw.clear();
    btinhBtIn = '';
    btinhBtOut = '';
    const k = document.getElementById('x2-btinh-kind');
    if (k) k.value = rec.kind || 'tinh';
    const d = document.getElementById('x2-btinh-date');
    if (d) d.value = rec.date || '';
    // Nguồn: chọn lại ĐÚNG thẻ của lượt này (PHIẾU XUẤT / cỡ thanh lỗi)
    if (rec.kind === 'tinh') {
      if (Array.isArray(rec.noteUses) && rec.noteUses.length) {
        // Phiếu mới: chọn lại các PHIẾU mà lượt này đã rút số liệu
        const noteIds = [...new Set(rec.noteUses.map(u => String(u.noteId)))];
        btinhPicked = noteIds.filter(id2 => baoTinhCandidates().some(c => String(c.id) === id2));
        if (!btinhPicked.length) btinhPicked = noteIds;   // phiếu đã hết tồn → vẫn chọn để sửa
      } else {
        // Dữ liệu cũ: nguồn = lô ở Kho
        const srcs = Array.isArray(rec.sources) && rec.sources.length ? rec.sources : (rec.batchId ? [{ batchId: rec.batchId }] : []);
        btinhPicked = srcs.map(s => String(s.batchId)).filter(Boolean);
      }
    } else if (rec.kind === 'ha_cap') {
      btinhPicked = rec.defectKey ? [String(rec.defectKey)] : [];
    } else if (rec.kind === 'bao_thanh') {
      // 'bao_thanh': khôi phục nguồn đầu vào + cỡ đầu ra + số lượng
      const src = String(rec.inSource || '');
      const inKey = String(rec.inSizeKey || '');
      const pref = src === 'press' ? 'p:' : (src === 'defect' ? 'd:' : '');
      if (pref && inKey) btinhBtIn = pref + inKey;
      btinhBtOut = String(rec.outSizeKey || '');
      const q = document.getElementById('x2-btinh-bt-qty');
      if (q) q.value = rec.inQty ? String(rec.inQty) : '';
    }
    // KHÓA của dòng: Bào thanh = 'bt-cur' (1 cặp) · còn lại = kích thước chung (đầu vào)
    let rowKey = '';
    if (rec.kind === 'bao_thanh') {
      rowKey = 'bt-cur';
    } else {
      rowKey = String(rec.inSizeKey
        || dimKeyOf.apply(null, (Array.isArray(rec.inDims) && rec.inDims.length === 3 ? rec.inDims : (Array.isArray(rec.batchDims) && rec.batchDims.length === 3 ? rec.batchDims : rec.defectDims || []))) || '');
    }
    // SL thanh ĐẠT của dòng + KÍCH THƯỚC SAU BÀO của dòng (nhập theo dòng)
    if (rowKey && rec.kind !== 'bao_thanh') {
      btinhOkDraft.set(rowKey, Math.round(Number(rec.qtyOk) || 0));
      const outDims = Array.isArray(rec.outDims) ? rec.outDims : [];
      if (rec.kind === 'tinh') {
        // Nguồn phiếu: KT sau bào nhập 1 DÒNG + Lỗi / Tóp / Khác / ghi chú Khác
        btinhOutRaw.set(rowKey, outDims.length === 3 && outDims[0] > 0
          ? `${outDims[0]}x${outDims[1]}x${outDims[2]}` : '');
        if (Number(rec.qtyErr)) btinhErrDraft.set(rowKey, Math.round(Number(rec.qtyErr)));
        if (Number(rec.qtyTop)) btinhTopDraft.set(rowKey, Math.round(Number(rec.qtyTop)));
        if (Number(rec.qtyOther)) btinhOtherDraft.set(rowKey, Math.round(Number(rec.qtyOther)));
        if (rec.otherNote) btinhOtherNoteDraft.set(rowKey, String(rec.otherNote));
      } else {
        btinhOutDraft.set(rowKey, { d: outDims[0] || '', r: outDims[1] || '', t: outDims[2] || '' });
      }
    }
    syncX2BaoTinhKindRows(true);
    renderX2BaoTinhList();
    renderX2BaoThanhForm();
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

  // ─── BỘ LỌC KỲ: TUẦN / THÁNG / NĂM ────────────────────────────
  // DÙNG CHUNG cho dải ô "Thống kê nhanh" + bảng "Lịch Sử Bào Tinh".
  // Trạng thái thuần UI (KHÔNG đồng bộ mây/backup) — mẫu bamboo_tracker_pv_chart_mode_v1.
  const X2_BTINH_FILTER_KEY = 'bamboo_tracker_x2_btinh_filter_v1';
  let btinhFilter = { mode: 'week', key: '' };   // mode 'week'|'month'|'year' · key 'YYYY-Wnn'|'YYYY-MM'|'YYYY'
  let btinhFilterLoaded = false;
  // Khóa kỳ theo NGÀY THAM CHIẾU (mặc định hôm nay)
  function btinhFilterPeriodKey(mode, refDate) {
    const d = String(refDate || todayISO());
    if (mode === 'month') return d.slice(0, 7);
    if (mode === 'year') return d.slice(0, 4);
    const m = getISOWeekString(d).match(/Tuần\s*(\d+)/i);
    return m ? `${d.slice(0, 4)}-W${String(Number(m[1])).padStart(2, '0')}` : '';
  }
  function loadX2BaoTinhFilter() {
    if (btinhFilterLoaded) return;
    btinhFilterLoaded = true;
    try {
      const raw = localStorage.getItem(X2_BTINH_FILTER_KEY);
      const obj = raw ? JSON.parse(raw) : null;
      if (obj && ['week', 'month', 'year'].includes(obj.mode) && obj.key) {
        btinhFilter = { mode: obj.mode, key: String(obj.key) };
      }
    } catch (e) { /* localStorage lỗi → giữ mặc định */ }
    if (!btinhFilter.key) btinhFilter.key = btinhFilterPeriodKey('week');
  }
  function saveX2BaoTinhFilter() {
    try { localStorage.setItem(X2_BTINH_FILTER_KEY, JSON.stringify(btinhFilter)); } catch (e) { /* bỏ qua */ }
  }
  // Khoảng ngày của 1 tuần ISO ('2026-W39' → '21/09/2026 – 27/09/2026')
  function isoWeekRangeLabel(key) {
    const m = /^(\d{4})-W(\d{2})$/.exec(String(key || ''));
    if (!m) return '';
    const wn = Number(m[2]);
    const jan1 = new Date(Date.UTC(Number(m[1]), 0, 4));
    const dow = jan1.getUTCDay() || 7;
    const start = new Date(jan1);
    start.setUTCDate(jan1.getUTCDate() - dow + 1 + (wn - 1) * 7);
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
    const f = d => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
    return `${f(start)} – ${f(end)}`;
  }
  // Nhãn kỳ đang lọc
  function btinhFilterLabel() {
    const k = String(btinhFilter.key || '');
    if (btinhFilter.mode === 'month') return `Tháng ${Number(k.slice(5, 7))}/${k.slice(0, 4)}`;
    if (btinhFilter.mode === 'year') return `Năm ${k}`;
    const range = isoWeekRangeLabel(k);
    return `Tuần ${Number(k.slice(6) || 0)}${range ? ` (${range})` : ''}`;
  }
  // 1 ngày có nằm trong KỲ đang lọc không
  function btinhFilterHit(dateISO) {
    const d = String(dateISO || '');
    if (!d) return false;
    if (btinhFilter.mode === 'month') return d.slice(0, 7) === btinhFilter.key;
    if (btinhFilter.mode === 'year') return d.slice(0, 4) === btinhFilter.key;
    return btinhFilterPeriodKey('week', d) === btinhFilter.key;
  }
  function setX2BaoTinhFilterMode(mode) {
    if (!['week', 'month', 'year'].includes(mode) || btinhFilter.mode === mode) return;
    btinhFilter.mode = mode;
    // Đổi loại kỳ → chốt lại khóa theo NGÀY HÔM NAY
    btinhFilter.key = btinhFilterPeriodKey(mode);
    saveX2BaoTinhFilter();
    renderX2BaoTinhFilterBar();
    refreshX2BaoTinhPeriodViews();
  }
  // ‹ › nhảy ±1 kỳ
  function shiftX2BaoTinhFilter(dir) {
    const step = Number(dir) >= 0 ? 1 : -1;
    const k = String(btinhFilter.key || '');
    if (btinhFilter.mode === 'year') {
      const y = Number(k.slice(0, 4)) + step;
      if (!Number.isFinite(y) || y < 2000) return;
      btinhFilter.key = String(y);
    } else if (btinhFilter.mode === 'month') {
      const y = Number(k.slice(0, 4)), mo = Number(k.slice(5, 7)) + step;
      const d = new Date(Date.UTC(y, mo - 1, 1));
      btinhFilter.key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    } else {
      const y = Number(k.slice(0, 4)), w = Number(k.slice(6, 8)) + step;
      if (w < 1) { const d = new Date(Date.UTC(y - 1, 11, 28)); btinhFilter.key = btinhFilterPeriodKey('week', d.toISOString().slice(0, 10)); }
      else if (w > 53) btinhFilter.key = `${y + 1}-W01`;
      else btinhFilter.key = `${y}-W${String(w).padStart(2, '0')}`;
    }
    saveX2BaoTinhFilter();
    renderX2BaoTinhFilterBar();
    refreshX2BaoTinhPeriodViews();
  }
  // Vẽ thanh bộ lọc + thanh tiêu đề bảng
  function renderX2BaoTinhFilterBar() {
    const bar = document.getElementById('x2-btinh-period-bar');
    if (!bar) return;
    const btn = mode => `<button type="button" class="x2-period-btn${btinhFilter.mode === mode ? ' active' : ''}" data-x2-btinh-period="${mode}">${mode === 'week' ? 'Tuần' : (mode === 'month' ? 'Tháng' : 'Năm')}</button>`;
    bar.innerHTML = `
      <button type="button" class="btn btn-outline btn-icon btn-sm" data-x2-btinh-period-dir="-1" title="Kỳ trước"><i data-lucide="chevron-left"></i></button>
      <div class="x2-period-btns">${btn('week')}${btn('month')}${btn('year')}</div>
      <button type="button" class="btn btn-outline btn-icon btn-sm" data-x2-btinh-period-dir="1" title="Kỳ sau"><i data-lucide="chevron-right"></i></button>
      <span class="x2-period-label"><i data-lucide="calendar-range"></i> ${escapeHTML(btinhFilterLabel())}</span>`;
    initLucide();
  }
  function refreshX2BaoTinhPeriodViews() {
    renderX2BaoTinhStats();
    renderX2BaoTinhTable();
  }

  // ─── THỐNG KÊ NHANH CỦA VỊ TRÍ BÀO TINH ──────────────────────
  function renderX2BaoTinhStats() {
    const box = document.getElementById('x2-btinh-stats');
    if (!box) return;
    loadX2BaoTinhFilter();
    // LỌC THEO KỲ (Tuần / Tháng / Năm) — dùng chung với bảng lịch sử.
    // Riêng ô "Thanh lỗi chờ hạ cấp" là TỒN TẠI TẠI nên KHÔNG lọc.
    const disp = (state.xuong2BaoTinhRecords || [])
      .filter(r => btinhFilterHit(r.date || ''))
      .map(baoTinhDisplay);
    const totalIn  = disp.reduce((s, d) => s + d.qtyIn, 0);
    const totalOk  = disp.reduce((s, d) => s + d.qtyOk, 0);
    const totalErr = disp.reduce((s, d) => s + d.qtyErr, 0);
    const totalVol = disp.reduce((s, d) => s + d.volumeOk, 0);
    const hours = disp.reduce((s, d) => s + (d.workHours || 0), 0);
    const capAvg = hours > 0 ? totalIn / hours : null;
    const errPct = totalIn > 0 ? (totalErr / totalIn) * 100 : null;
    const stock = baoTinhDefectStock().reduce((s, x) => s + x.remaining, 0);
    box.innerHTML = `
      <div class="material-stat material-stat-period">
        <span class="material-stat-value">${escapeHTML(btinhFilterLabel().replace(/\s*\(.*\)$/, ''))}</span>
        <span class="material-stat-label">Kỳ thống kê · ${disp.length} lượt</span>
      </div>
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
    renderX2BaoThanhForm();       // 'Bào thanh': 4 trường (đầu vào · SL · đầu ra · ĐẠT từ QC)
    renderX2BaoTinhList();        // danh sách THẺ thanh (2 dòng, bấm để chọn/bỏ chọn)
    renderX2BaoTinhGroups();      // bảng tổng hợp theo kích thước chung + ô SL thanh ĐẠT
    renderX2BaoTinhStockBar();    // thanh lỗi chờ hạ cấp
    renderX2BaoTinhFilterBar();    // thanh bộ lọc Tuần / Tháng / Năm (dùng chung)
    renderX2BaoTinhStats();
    renderX2BaoTinhTable();       // thẻ ngày: đầu thẻ chung + các nhánh trong thẻ
    renderX2BaoTinhCalc();
    syncX2BaoTinhEditBanner();
    updateXuong2CardCounts();
  }

  // ─── BẢNG LỊCH SỬ BÀO TINH = THẺ NGÀY (đầu thẻ chung + nhánh trong thẻ) ──
  function renderX2BaoTinhTable() {
    const box = document.getElementById('x2-btinh-day-cards');
    if (!box) return;
    loadX2BaoTinhFilter();
    // LỌC THEO KỲ (Tuần / Tháng / Năm) — dùng chung với dải ô thống kê
    const list = (state.xuong2BaoTinhRecords || [])
      .filter(r => btinhFilterHit(r.date || ''))
      .sort((a, b) => {
        if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    const countEl = document.getElementById('x2-btinh-table-count');
    if (countEl) countEl.textContent = list.length ? `${list.length} lượt · ${btinhFilterLabel().replace(/\s*\(.*\)$/, '')}` : '';
    if (!list.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="sparkles"></i>
          <div><strong>Không có lượt nào trong kỳ ${escapeHTML(btinhFilterLabel().replace(/\s*\(.*\)$/, ''))}</strong><br>Dùng nút ‹ › hoặc chuyển Tuần / Tháng / Năm ở thanh tiêu đề để xem kỳ khác.<br><span style="font-size:0.72rem;">Người bào + giờ HC/TC tự lấy từ Bảng bố trí Nhân Sự (vị trí Bào tinh).</span></div>
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
      // Giờ SỰ CỐ CHO PHÉP được TRỪ khỏi giờ bào khi tính CÔNG SUẤT → HIỆU SUẤT
      const hoursEff = stageEffHours('baotinh', date, hours);
      const incH = stageIncidentOf('baotinh', date);
      const cap = hoursEff > 0 ? (tIn / hoursEff) : null;
      // CHIP ĐỊNH MỨC · CÔNG SUẤT · HIỆU SUẤT THEO TỪNG LOẠI BÀO có trong ngày
      // (mỗi loại có 1 ĐM riêng trong popup "Định mức" 3 cột của thẻ)
      const kindOrder = [];
      rows.forEach(r => { const k = r.kind || 'tinh'; if (!kindOrder.includes(k)) kindOrder.push(k); });
      const kindChips = kindOrder.map(k => {
        const qtyK = rows.reduce((s, r) => s + (((r.kind || 'tinh') === k) ? baoTinhQtyInOf(r) : 0), 0);
        const rateK = baoTinhRateOf(date, k);
        const capK = hoursEff > 0 ? qtyK / hoursEff : null;
        const effK = (capK != null && rateK) ? (capK / rateK) * 100 : null;
        const ratePart = rateK ? ` · ĐM ${fmtThanh(rateK)} thanh/h` : ' (chưa đặt Định mức)';
        const effPart = effK == null ? ''
          : ` · Hiệu suất <strong style="color:${effK >= 100 ? '#16a34a' : effK >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(effK)}%</strong>`;
        return `<span class="x2-day-cap" title="Loại ${baoTinhRateLabel(k)}: ${fmtThanh(qtyK)} thanh ÷ ${fmtRatio(hoursEff)} giờ bào${incH > 0 ? ` [đã trừ ${fmtGio(incH)}h sự cố]` : ''}${rateK ? ` · Định mức ${fmtThanh(rateK)} thanh/h` : ''}">${escapeHTML(baoTinhRateLabel(k))}: <strong>${capK != null ? `${fmtThanh(capK)} thanh/h` : '—'}</strong>${ratePart}${effPart}</span>`;
      }).join('');
      const hcTxt = first.workHoursHC != null ? fmtRatio(first.workHoursHC) : '—';
      const tcTxt = first.workHoursTC != null ? fmtRatio(first.workHoursTC) : '—';
      const errPct = tIn > 0 ? (tErr / tIn) * 100 : null;
      const tPend = rows.reduce((s, r) => s + baoTinhPendingOf(r), 0);
      const pendChip = tPend > 0
        ? `<span class="x2-day-cap" title="Số thanh của ngày chưa có kết quả QC 'Kiểm thanh' (bấm tab QC để nhập kết quả kiểm cho cỡ thanh này)">Chờ QC: <strong style="color:#b45309;">${fmtThanh(tPend)} thanh</strong></span>`
        : '';
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
            <span class="x2-day-cap" title="Công suất thực tế = Tổng thanh đưa vào (${fmtThanh(tIn)} thanh) ÷ giờ bào hiệu dụng (${fmtRatio(hoursEff)} h${incH > 0 ? ` — đã TRỪ ${fmtGio(incH)}h sự cố` : ''})">Công suất: <strong>${cap != null ? `${fmtThanh(cap)} thanh/h` : '—'}</strong></span>
            ${stageIncidentInputHtml('baotinh', date)}
            ${kindChips}
            <span class="x2-day-cap" title="Tổng thanh ĐẠT trong ngày">Đạt: <strong>${fmtThanh(tOk)} thanh</strong></span>
            <span class="x2-day-eff" title="Tổng thanh LỖI trong ngày${errPct == null ? '' : ` (tỷ lệ ${fmtRatio(errPct)}%)`}">Lỗi: <strong style="color:${errPct != null && errPct > 10 ? '#b45309' : '#0f766e'};">${fmtThanh(tErr)} thanh</strong></span>
            ${pendChip}
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
    // Nguồn phiếu xuất: có Tóp/Khác → thêm chú thích dưới dòng nguồn
    const topOther = (d.qtyTop || d.qtyOther)
      ? ` · Tóp ${fmtThanh(d.qtyTop)} · Khác ${fmtThanh(d.qtyOther)}${d.otherNote ? ` (${escapeHTML(d.otherNote)})` : ''}`
      : '';
    return `
      <tr class="x2-day-row" data-x2-btinh-row="${escapeHTML(r.id)}">
        <td>
          ${kindChip}
          <div class="x2-row-note">${escapeHTML(baoTinhSourceText(r, d))}${(d.kind === 'tinh' && d.batchRemaining != null && (!Array.isArray(r.sources) || r.sources.length <= 1)) ? ` · còn ${fmtThanh(d.batchRemaining)} thanh` : ''}${(d.kind === 'bao_thanh' && d.pending > 0) ? ` · CHỜ QC KIỂM ${fmtThanh(d.pending)} thanh` : ''}${topOther}</div>
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
    if (openX2Card && openX2Card.id === 'x2-bo-luong-card') renderXuong2BoluongCard();
    if (openX2Card && openX2Card.id === 'x2-cut-card') renderXuong2CutCard();
    if (openX2Card && openX2Card.id === 'x2-bo-ong-card') renderX2BoOngCard();
    if (openX2Card && openX2Card.id === 'x2-bao-tho-card') renderX2BaoThoCard();
    if (openX2Card && openX2Card.id === 'x2-chon-nan-tho-card') renderX2ChonNanCard();
    if (openX2Card && openX2Card.id === 'x2-than-hoa-card') renderX2SayStats(); // thống kê Sấy theo ngày
    if (openX2Card && openX2Card.id === 'x2-kho-card') renderX2KhoCard(); // Kho Nan — tự làm mới theo dữ liệu
    if (openX2Card && openX2Card.id === 'x2-bao-tinh-card') renderX2BaoTinhCard();
    if (openX2Card && openX2Card.id === 'x2-bullig-card') renderX2BulligCard();
    if (openX2Card && openX2Card.id === 'x2-ep-van-card') renderX2EpVanCard();
    // Xưởng 1 — cả 8 công đoạn đều có chức năng
    if (openX2Card) renderX1CardOf(openX2Card.id);
  }

  // ═══════════════════════════════════════════════════════════
  // THẺ "KHO NAN" (launcher Xưởng 2) — Tồn kho · Phiếu kho · Sổ nhập/xuất
  // ───────────────────────────────────────────────────────────
  // • PHIẾU KHO: Tổ trưởng (người có quyền nhập Tab Công Đoạn) tạo phiếu
  //   XUẤT kho (mục đích: Sấy 2 / Bào Tinh / Bullig / Khác) hoặc phiếu XỬ LÝ
  //   tồn trung gian (tiêu hủy / tái chế thanh lỗi · nan Loại hẳn) theo NGÀY;
  //   sổ xem gộp theo NGÀY / TUẦN / THÁNG.
  // • Ban lãnh đạo (Admin / Ban Quản Lý — cổng canApproveLeave của js/hr.js)
  //   DUYỆT / TỪ CHỐI; CHỈ phiếu đã duyệt mới trừ tồn.
  // • SỐ CHÍNH THỨC trừ tồn = phiếu xuất ĐÃ DUYỆT; số hệ thống SUY RA từ các
  //   thẻ Bào Tinh / Bullig / quay lại Sấy 2 chỉ dùng để ĐỐI CHIẾU (cột "suy ra").
  // • Kho KHÔNG có vị trí nhân sự riêng → không có "Người nhập kho"/giờ HC/TC;
  //   phiếu ghi Người tạo (tài khoản) + Người duyệt.
  // • Số liệu tính toán nằm ở js/utils.js (khoStockSummary/khoLedgerEvents/...)
  //   để js/kanban.js + js/planning.js dùng CHUNG, không lệch số.
  // ═══════════════════════════════════════════════════════════

  // Loại phiếu đang nhập ('xuat' = xuất kho | 'xu_ly' = tiêu hủy / tái chế)
  let khoNoteType = 'xuat';
  let khoNoteEditId = null;        // id phiếu đang sửa (null = ghi mới)
  let khoLotsOpen = false;         // danh sách thẻ lô (gắn lô cho phiếu xuất) đang mở?
  let khoLotsQuery = '';           // tìm nhanh trong danh sách thẻ lô (CHỮ: mã/vị trí/k.thước)
  let khoLotsQtyQuery = '';        // tìm THEO SỐ LƯỢNG còn lại của lô (lọc KẾT HỢP điều kiện VÀ)
  let khoLedgerQuery = '';         // tìm nhanh trong sổ (mã lô / kích thước / vị trí)
  let khoStockQuery = '';          // tìm nhanh trong bảng TỒN
  let khoPeriodMode = 'day';       // 'day' | 'tuan' | 'thang' — nhóm sổ theo kỳ
  let khoLedgerOpen = true;        // bảng sổ đang mở?
  let khoStockOpen = true;         // bảng TỒN đang mở?
  let khoNotePicked = {};          // { batchId: số thanh xuất gắn lô (mặc định = tồn lô) }
  const khoPickIds = new Set();    // phiếu đang tích chọn để duyệt hàng loạt

  // Tên / khóa người dùng đang đăng nhập (Người tạo · Người duyệt phiếu)
  function khoUserName() {
    const u = state.currentUser || {};
    return u.fullname || u.name || u.username || u.email || '—';
  }
  function khoUserKey() {
    const u = state.currentUser || {};
    return u.email || u.username || '—';
  }

  // ─── NẠP / LƯU DỮ LIỆU PHIẾU KHO (nối storage/cloud/history/main) ──
  function loadKhoNotes() {
    const raw = localStorage.getItem(STORAGE_KEY_KHO_NOTES);
    if (raw) {
      try { state.khoNotes = JSON.parse(raw) || []; }
      catch (e) { state.khoNotes = []; }
    } else {
      state.khoNotes = [];
    }
    if (!Array.isArray(state.khoNotes)) state.khoNotes = [];
    state.khoShowUsed = localStorage.getItem(STORAGE_KEY_KHO_SHOW_USED) === '1';
  }
  function saveKhoNotes() {
    try { localStorage.setItem(STORAGE_KEY_KHO_NOTES, JSON.stringify(state.khoNotes || [])); }
    catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    try { localStorage.setItem(STORAGE_KEY_KHO_SHOW_USED, state.khoShowUsed ? '1' : '0'); } catch (e) {}
    logDataChange(['khoNotes']); // ghi lịch sử sửa đổi
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── TỒN TRUNG GIAN (WIP) — nằm ở TỪNG CÔNG ĐOẠN, KHÔNG nằm ở Kho ──
  // • Thanh lỗi BÀO TINH: baoTinhDefectStock() (đã có) + trừ phiếu xử lý ĐÃ DUYỆT.
  // • Thành phẩm Bullig chờ CHỌN thanh: bulligCtPending() (đã có).
  // • Thanh LỖI CHỌN THANH Bullig: trước đây KHÔNG có tồn (mất dấu) → hàm mới.
  // • Nan "Loại hẳn" của Chọn Nan Thô: trước đây chỉ tính tỷ lệ loại → hàm mới.
  function bulligDefectStock() {
    const map = new Map();
    (state.xuong2BulligRecords || []).forEach(r => {
      if (!r || r.kind !== 'ct') return;
      const k = String(r.inSizeKey || '');
      if (!k) return;
      const cur = map.get(k) || { sizeKey: k, dims: Array.isArray(r.inDims) ? r.inDims.map(Number) : [], total: 0, used: 0 };
      cur.total += Number(r.qtyErr) || 0;
      map.set(k, cur);
    });
    khoApprovedScrapNotes('bullig_loi').forEach(n => {
      const cur = map.get(String(n.sizeKey || ''));
      if (cur) cur.used += Number(n.qty) || 0;
    });
    return [...map.values()]
      .map(x => Object.assign({}, x, { remaining: Math.max(0, x.total - x.used) }))
      .filter(x => x.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);
  }
  function nanRejectStock() {
    const map = new Map();
    (state.xuong2ChonNanThoRecords || []).forEach(r => {
      if (!r || r.cls !== 'reject') return;
      const dims = Array.isArray(r.dims) ? r.dims.map(Number) : [0, 0, 0];
      const k = String(r.sizeKey || dimKeyOf(dims[0], dims[1], dims[2]));
      if (!k) return;
      const cur = map.get(k) || { sizeKey: k, dims, total: 0, used: 0 };
      cur.total += Number(r.quantity) || 0;
      map.set(k, cur);
    });
    khoApprovedScrapNotes('nan_loai_han').forEach(n => {
      const cur = map.get(String(n.sizeKey || ''));
      if (cur) cur.used += Number(n.qty) || 0;
    });
    return [...map.values()]
      .map(x => Object.assign({}, x, { remaining: Math.max(0, x.total - x.used) }))
      .filter(x => x.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);
  }

  // ─── FORM PHIẾU KHO ──────────────────────────────────────────
  function khoNoteTypeOf() { return khoNoteType === 'xu_ly' ? 'xu_ly' : 'xuat'; }
  // Tồn khả dụng để DUYỆT phiếu xuất (Σ nhập kho − Σ xuất đã duyệt) — không cho âm
  function khoAvailableForApproval() { return khoStockSummary().honestThanh; }
  // ── CHẶN XUẤT THEO TỒN TỪNG LÔ (06/10/2026) ──────────────────────
  // Trước đây chặn theo TỔNG kho (honestThanh) → khi sổ bị lệch (phiếu bù cũ ghi
  // nhiều hơn sức chứa → "Tổng trong nhà máy" nhỏ hơn số đã ghi) thì honestThanh = 0
  // và KHÔNG TẠO ĐƯỢC PHIẾU NÀO dù lô vẫn còn hàng thật.
  // Nay chặn theo PHẦN CÒN LẠI CỦA TỪNG LÔ đang gắn phiếu — đúng với dữ liệu thật;
  // cảnh báo lệch SỔ chỉ là cảnh báo (hiện ở ô tự tính), không khóa thao tác mới.
  // Trả [{ id, code, qty, cap }] = các lô gắn phiếu xuất quá phần còn lại của nó.
  function khoLotsOverflow(lots) {
    const bad = [];
    (lots || []).forEach(l => {
      const b = (state.batches || []).find(x => x && x.id === String((l && l.batchId) || ''));
      if (!b) return;
      const cap = khoLotRemainingOf(b);     // phiếu SỬA LUÔN là chờ duyệt → chưa trừ FIFO → cap đúng
      const qty = Number(l.qty) || 0;
      if (qty > cap) bad.push({ id: b.id, code: b.code || b.id, qty, cap });
    });
    return bad;
  }
  // Tồn lỗi khả dụng của 1 nguồn xử lý (theo kích thước) — null = không chặn theo cỡ
  function khoScrapRemainingOf(source, sizeKey) {
    const k = String(sizeKey || '');
    if (source === 'baotinh_loi') return (baoTinhDefectStockOf(k) || {}).remaining || 0;
    if (source === 'bullig_loi') return (bulligDefectStock().find(x => x.sizeKey === k) || {}).remaining || 0;
    if (source === 'nan_loai_han') return (nanRejectStock().find(x => x.sizeKey === k) || {}).remaining || 0;
    if (source === 'top_other') return baoTinhTopOtherStock().remaining;   // Tóp/Khác Bào Tinh — không theo cỡ
    return null;
  }
  // Danh sách LÔ đang ở Kho CÒN HÀNG (chọn gắn lô cho phiếu xuất) — mới nhất lên đầu
  function khoLotPickerList() {
    return (state.batches || []).filter(b => b && b.stage === 'kho' && khoLotRemainingOf(b) > 0)
      .sort((a, b) => khoFirstInDateOf(b).localeCompare(khoFirstInDateOf(a)));
  }
  function khoPickLot(id) {
    const b = (state.batches || []).find(x => x && x.id === id);
    if (!b) return;
    if (khoNotePicked[id] != null) delete khoNotePicked[id];
    else khoNotePicked[id] = khoLotRemainingOf(b); // mặc định lấy NGUYÊN phần còn lại của lô
    renderX2KhoLotsList();
    renderX2KhoCalc();
  }
  function khoPickedQtyOf(id) { return Number(khoNotePicked[id]) || 0; }
  function khoPickedTotal() { return Object.keys(khoNotePicked).reduce((s, id) => s + khoPickedQtyOf(id), 0); }
  // m³ của phiếu: chỉ tính CHÍNH XÁC khi phiếu gắn lô (theo kích thước từng lô)
  function khoNoteM3Of(lots) {
    if (!Array.isArray(lots) || !lots.length) return 0;
    return lots.reduce((s, l) => {
      const b = (state.batches || []).find(x => x && x.id === l.batchId);
      if (!b) return s;
      return s + calculateVolume(khoLotLenOf(b), khoLotWidOf(b), khoLotThkOf(b), Number(l.qty) || 0);
    }, 0);
  }
  // Kích thước lô: 3 trường riêng, không có thì dùng mảng dimensions (dữ liệu cũ)
  function khoLotLenOf(b) { return Number(b && b.length) > 0 ? Number(b.length) : (b && Array.isArray(b.dimensions) ? Number(b.dimensions[0]) || 0 : 0); }
  function khoLotWidOf(b) { return Number(b && b.width) > 0 ? Number(b.width) : (b && Array.isArray(b.dimensions) ? Number(b.dimensions[1]) || 0 : 0); }
  function khoLotThkOf(b) { return Number(b && b.thickness) > 0 ? Number(b.thickness) : (b && Array.isArray(b.dimensions) ? Number(b.dimensions[2]) || 0 : 0); }

  // ═══════════════════════════════════════════════════════════════════
  // PHIẾU XUẤT KHO LÀM ĐẦU VÀO CÔNG ĐOẠN (Bào Tinh · Bullig)
  // ═══════════════════════════════════════════════════════════════════
  // Thanh đã qua Sấy 2 có thể XUẤT 1 phiếu nhưng làm NHIỀU NGÀY mới hết —
  // nên nguồn đầu vào của Bào Tinh / Gia công Bullig = PHIẾU XUẤT (mục đích
  // 'baotinh' / 'bullig'), làm tới khi hết tồn phiếu mới thôi.
  //   • Phiếu ĐÃ DUYỆT còn tồn → CHỌN ĐƯỢC.
  //   • Phiếu CHỜ DUYỆT → vẫn hiện nhưng mờ + chip "Chờ duyệt", KHÔNG chọn được.
  //   • Số đã dùng = Σ noteUses của các lượt Bào Tinh ('tinh') + Bullig ('gc');
  //     mỗi lượt lưu noteUses: [{ noteId, batchId, sizeKey, qty }] → tồn phiếu
  //     tính đúng theo TỪNG KÍCH THƯỚC và vẫn link được lô (planning/đối chiếu).
  function khoNoteOf(id) {
    return (state.khoNotes || []).find(n => n && String(n.id) === String(id)) || null;
  }
  // Số thanh của 1 phiếu đã bị các lượt công đoạn dùng (loại trừ lượt đang sửa)
  function khoNoteUsedOf(noteId, excludeId) {
    let used = 0;
    const scan = (recs) => (recs || []).forEach(r => {
      if (!r || String(r.id) === String(excludeId)) return;
      (Array.isArray(r.noteUses) ? r.noteUses : []).forEach(u => {
        if (u && String(u.noteId) === String(noteId)) used += Number(u.qty) || 0;
      });
    });
    scan(state.xuong2BaoTinhRecords);
    scan(state.xuong2BulligRecords);
    return used;
  }
  // Số thanh của 1 lô trong 1 phiếu đã bị dùng — cho phân bổ sources
  function khoNoteBatchUsedOf(noteId, batchId, excludeId) {
    let used = 0;
    const scan = (recs) => (recs || []).forEach(r => {
      if (!r || String(r.id) === String(excludeId)) return;
      (Array.isArray(r.noteUses) ? r.noteUses : []).forEach(u => {
        if (u && String(u.noteId) === String(noteId) && String(u.batchId) === String(batchId)) used += Number(u.qty) || 0;
      });
    });
    scan(state.xuong2BaoTinhRecords);
    scan(state.xuong2BulligRecords);
    return used;
  }
  // Tồn THEO KÍCH THƯỚC của 1 phiếu: [{ sizeKey, dims, total, used, remaining }]
  function khoNoteSizeRows(note, excludeId) {
    const map = new Map();
    if (!note) return [];
    (Array.isArray(note.lots) ? note.lots : []).forEach(l => {
      const b = (state.batches || []).find(x => x && x.id === String((l && l.batchId) || ''));
      if (!b) return;
      // Kích thước lô: 3 trường riêng, không có thì dùng mảng dimensions (dữ liệu cũ)
      const dims = (Number(b.length) > 0 && Number(b.width) > 0 && Number(b.thickness) > 0)
        ? [Number(b.length), Number(b.width), Number(b.thickness)]
        : (Array.isArray(b.dimensions) && b.dimensions.length === 3
          ? b.dimensions.map(Number) : [0, 0, 0]);
      const key = dimKeyOf(dims[0], dims[1], dims[2]);
      const cur = map.get(key) || { sizeKey: key, dims, total: 0, used: 0 };
      cur.total += Number(l.qty) || 0;
      map.set(key, cur);
    });
    const scan = (recs) => (recs || []).forEach(r => {
      if (!r) return;
      const isEdit = String(r.id) === String(excludeId);
      (Array.isArray(r.noteUses) ? r.noteUses : []).forEach(u => {
        if (!u || String(u.noteId) !== String(note.id)) return;
        const row = map.get(String(u.sizeKey || ''));
        if (row) row.used += (isEdit ? -(Number(u.qty) || 0) : (Number(u.qty) || 0));
      });
    });
    scan(state.xuong2BaoTinhRecords);
    scan(state.xuong2BulligRecords);
    return [...map.values()].map(r => Object.assign(r, { remaining: Math.max(0, r.total - r.used) }));
  }
  // DANH SÁCH PHIẾU LÀM ĐẦU VÀO — purpose: 'baotinh' | 'bullig'.
  // Trả [{ id, note, pending, total, used, remaining, sizes, date }]:
  //   pending = phiếu CHỜ DUYỆT (hiện mờ, chưa chọn được) · còn lại = phần CHƯA làm.
  // includeUsed = true → GIỮ phiếu đã rút hết (remaining = 0) cho dòng GIẢI THÍCH
  //   "ĐÃ DÙNG HẾT" của Bào Tinh; mặc định vẫn ẨN như cũ.
  function khoNoteInputPool(purpose, excludeId, includeUsed) {
    const out = [];
    (state.khoNotes || []).forEach(n => {
      if (!n || n.type !== 'xuat' || khoNormPurpose(n.purpose) !== purpose) return;
      const total = Number(n.qty) || 0;
      const used = khoNoteUsedOf(n.id, excludeId);
      const remaining = Math.max(0, total - used);
      const pending = n.status !== 'da_duyet';
      if (!includeUsed && !pending && remaining <= 0) return;   // đã làm hết → ẨN
      out.push({
        id: String(n.id), note: n, pending, total, used, remaining,
        date: n.date || '',
        sizes: khoNoteSizeRows(n, excludeId).filter(s => s.remaining > 0 || pending || includeUsed)
      });
    });
    return out.sort((a, b) => String(a.date).localeCompare(String(b.date))); // cũ trước (FIFO)
  }
  // Tooltip nhanh liệt kê kích thước + số lượng của phiếu: "1250x18x7 SL:1500 · …"
  function khoNoteSizeTooltip(sizes) {
    return (sizes || []).map(s =>
      `${Number(s.dims[0])}x${Number(s.dims[1])}x${Number(s.dims[2])} SL:${Math.round(s.remaining)}`).join(' · ');
  }
  // PHÂN BỔ qty thanh (sizeKey) từ các phiếu đã chọn →
  //   { ok, uses: [{noteId,batchId,sizeKey,qty}], lots: [{batchId,code,location,dims,qty}], left }
  // FIFO: phiếu CŨ trước · trong phiếu, lô theo thứ tự gắn; thiếu → ok=false.
  function khoNoteAllocate(noteIds, sizeKey, qty, excludeId) {
    let left = Math.round(Number(qty) || 0);
    const uses = [], lots = [];
    const picks = (noteIds || []).map(id => khoNoteOf(id)).filter(Boolean)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    for (const n of picks) {
      if (left <= 0) break;
      const row = khoNoteSizeRows(n, excludeId).find(r => r.sizeKey === sizeKey);
      if (!row || row.remaining <= 0) continue;
      const take = Math.min(row.remaining, left);
      if (take <= 0) continue;
      let sub = take;
      for (const l of (Array.isArray(n.lots) ? n.lots : [])) {
        if (sub <= 0) break;
        const b = (state.batches || []).find(x => x && x.id === String((l && l.batchId) || ''));
        if (!b) continue;
        const d = (Number(b.length) > 0 && Number(b.width) > 0 && Number(b.thickness) > 0)
          ? [Number(b.length), Number(b.width), Number(b.thickness)]
          : (Array.isArray(b.dimensions) && b.dimensions.length === 3 ? b.dimensions.map(Number) : [0, 0, 0]);
        if (dimKeyOf(d[0], d[1], d[2]) !== sizeKey) continue;
        const lotRem = Math.max(0, (Number(l.qty) || 0) - khoNoteBatchUsedOf(n.id, b.id, excludeId));
        const takeLot = Math.min(lotRem, sub);
        if (takeLot <= 0) continue;
        uses.push({ noteId: String(n.id), batchId: String(b.id), sizeKey, qty: takeLot });
        lots.push({ batchId: String(b.id), code: b.code || '', location: b.location || '', dims: d, qty: takeLot });
        sub -= takeLot;
      }
      left -= take;
    }
    return { ok: left <= 0, uses, lots, left: Math.max(0, left) };
  }

  // Ẩn/hiện các ô theo LOẠI PHIẾU: xuất (mục đích + gắn lô) vs xử lý lỗi (nguồn + cỡ)
  function syncX2KhoNoteTypeRows() {
    const type = khoNoteTypeOf();
    const setDisp = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
    setDisp('x2-kho-purpose-group', type === 'xuat');
    setDisp('x2-kho-lots-group', type === 'xuat');
    setDisp('x2-kho-source-group', type === 'xu_ly');
    setDisp('x2-kho-method-group', type === 'xu_ly');
    setDisp('x2-kho-size-group', type === 'xu_ly');
    // Ô SỐ LƯỢNG: CHỈ phiếu XỬ LÝ LỖI mới nhập tay — phiếu XUẤT tự cộng từ thẻ lô
    setDisp('x2-kho-qty-group', type === 'xu_ly');
    // banner cam "đang sửa phiếu" (mẫu banner sửa của thẻ Cắt Chọn)
    const banner = document.getElementById('x2-kho-edit-banner');
    const text = document.getElementById('x2-kho-edit-text');
    if (banner) banner.style.display = khoNoteEditId ? '' : 'none';
    if (text && khoNoteEditId) {
      const n = (state.khoNotes || []).find(x => x && x.id === khoNoteEditId);
      text.textContent = n
        ? `Đang sửa phiếu ngày ${formatDateDDMMYY(n.date)} · ${n.type === 'xuat'
          ? ('Xuất → ' + (KHO_PURPOSE_LABELS[khoNormPurpose(n.purpose)] || ''))
          : ('Xử lý ' + (KHO_SOURCE_LABELS[n.source] || ''))}`
        : '';
    }
    const bX = document.getElementById('x2-kho-type-xuat');
    const bS = document.getElementById('x2-kho-type-scr');
    if (bX) bX.classList.toggle('active', type === 'xuat');
    if (bS) bS.classList.toggle('active', type === 'xu_ly');
  }
  function setKhoNoteType(t) {
    khoNoteType = (t === 'xu_ly') ? 'xu_ly' : 'xuat';
    syncX2KhoNoteTypeRows();
    fillX2KhoSizeSuggestions();
    renderX2KhoCalc();
  }
  function khoToggleLotsPanel(force) {
    khoLotsOpen = (force != null) ? !!force : !khoLotsOpen;
    const p = document.getElementById('x2-kho-lots-panel');
    if (p) p.hidden = !khoLotsOpen;
    const btnText = document.getElementById('x2-kho-lots-btn-text');
    if (btnText) btnText.textContent = khoLotsOpen ? 'Đóng danh sách lô' : 'Chọn Lô Gắn Phiếu';
    if (khoLotsOpen) renderX2KhoLotsList();
  }
  // Thẻ lô trong danh sách gắn phiếu (2 dòng như thẻ nguồn "Thêm Lô Sấy Mới")
  function khoLotCardHtml(b) {
    const rem = khoLotRemainingOf(b);
    const picked = khoNotePicked[b.id] != null;
    const useCls = String(b.useFor || '').toLowerCase().includes('bullig') ? 'use-bullig' : 'use-van';
    const outRounds = khoOutRoundCountOf(b);
    const btLbl = baoTinhUsedLabel(b);   // chip "ĐÃ BÀO X/Y THANH" — đối chiếu ô Chọn Thanh của thẻ Bào Tinh
    return `<div class="kho-lot-card${picked ? ' picked' : ''}" data-kho-lot="${escapeHTML(b.id)}">
      <div class="kho-lot-line1"><strong>${escapeHTML(b.code || '—')}</strong> · ${escapeHTML(b.location || '—')} · ${khoLotLenOf(b)}×${khoLotWidOf(b)}×${khoLotThkOf(b)} mm · ${escapeHTML(b.bambooType || '—')} · còn <strong>${fmtThanh(rem)}</strong> thanh</div>
      <div class="kho-lot-line2"><span class="al-use-tag ${useCls}">${escapeHTML(b.useFor || 'Ván')}</span>
        <span class="kho-round-badge" title="Số lần lô này đã RA khỏi kho (sang Sấy 2) rồi NHẬP lại — không phải nhiều lô">ra/vào kho ${outRounds} lần</span>
        <span class="kho-in-date">vào kho ${formatDateDDMMYY(khoLastInDateOf(b))}</span>${btLbl ? `<span class="tag-badge tag-baotinh-used" title="Số thanh lô này đã ghi ở các lượt Bào Tinh — đối chiếu với ô Chọn Thanh của thẻ Bào Tinh"><i data-lucide="sparkles" style="width:10px;height:10px;"></i> ${escapeHTML(btLbl)}</span>` : ''}</div>
      ${picked ? `<div class="kho-lot-qty-row"><label>Số thanh xuất từ lô này:</label><input type="number" min="1" max="${rem}" step="1" value="${khoPickedQtyOf(b.id)}" data-kho-lot-qty="${escapeHTML(b.id)}"></div>` : ''}
    </div>`;
  }
  function renderX2KhoLotsList() {
    const list = document.getElementById('x2-kho-lots-list');
    if (!list) return;
    const q = khoLotsQuery.trim().toLowerCase();
    const qQty = khoLotsQtyQuery.trim();
    let items = khoLotPickerList();
    if (q) items = items.filter(b => `${b.code || ''} ${b.location || ''} ${b.length}x${b.width}x${b.thickness} ${b.bambooType || ''} ${b.useFor || ''}`.toLowerCase().includes(q));
    // Ô ② — TÌM THEO SỐ LƯỢNG: chỉ so SỐ (bỏ dấu phân cách nghìn) — điều kiện VÀ với ô chữ
    if (qQty) {
      const digits = qQty.replace(/\D/g, '');
      if (digits) items = items.filter(b => String(Math.round(khoLotRemainingOf(b))).includes(digits));
    }
    if (!items.length) {
      list.innerHTML = (q || qQty)
        ? `<div class="al-empty">— Không có lô nào khớp "${escapeHTML([q, qQty].filter(Boolean).join(' · '))}" —</div>`
        : '<div class="al-empty">— Không có lô nào còn hàng ở Kho —</div>';
    }
    else list.innerHTML = items.map(khoLotCardHtml).join('');
    // chip đếm "N đã chọn" trên nút mở danh sách (mẫu ô đếm của Thêm Lô Sấy Mới)
    const countEl = document.getElementById('x2-kho-picked-count');
    if (countEl) {
      const n = Object.keys(khoNotePicked).length;
      countEl.textContent = n ? `${n} đã chọn` : 'Chưa chọn';
      countEl.classList.toggle('has-pick', n > 0);
    }
  }
  function khoSetLotsQuery(v) { khoLotsQuery = String(v || ''); renderX2KhoLotsList(); }
  function khoSetLotsQtyQuery(v) { khoLotsQtyQuery = String(v || ''); renderX2KhoLotsList(); }

  // Bấm thẻ = CHỌN / BỎ CHỌN (không ô vuông tích — như thẻ nguồn Thêm Lô Sấy Mới)
  function khoOnLotsPanelClick(e) {
    if (e.target && e.target.closest && e.target.closest('[data-kho-lot-qty]')) return; // ô số lượng tự xử qua input
    const card = e.target && e.target.closest ? e.target.closest('[data-kho-lot]') : null;
    if (card) khoPickLot(card.getAttribute('data-kho-lot'));
  }
  // Gõ ô số lượng = đổi phần xuất của lô đó (kẹp trong phần còn lại của lô)
  function khoOnLotsQtyInput(e) {
    const input = e.target && e.target.closest ? e.target.closest('[data-kho-lot-qty]') : null;
    if (!input) return;
    khoSetLotQty(input.getAttribute('data-kho-lot-qty'), input.value, input);
  }
  // Đặt số thanh xuất của 1 thẻ lô (dùng cho ô nhập trong thẻ + test) — kẹp 0..còn lại
  function khoSetLotQty(id, qty, inputEl) {
    const b = (state.batches || []).find(x => x && x.id === id);
    const max = b ? khoLotRemainingOf(b) : 0;
    let v = Math.floor(Number(qty) || 0);
    const el = inputEl || null;
    if (v > max) { v = max; if (el && el != null) el.value = max; }
    if (v <= 0) { delete khoNotePicked[id]; renderX2KhoLotsList(); }
    else khoNotePicked[id] = v;
    renderX2KhoCalc();
    return v;
  }
  // Gợi ý kích thước TỒN LỖI theo nguồn đang chọn (datalist)
  function fillX2KhoSizeSuggestions() {
    const dl = document.getElementById('x2-kho-size-list');
    const src = (document.getElementById('x2-kho-source') || {}).value || 'baotinh_loi';
    // Nguồn "Tóp / Khác Bào Tinh" KHÔNG theo cỡ → ẩn ô kích thước
    const grp = document.getElementById('x2-kho-size-group');
    if (grp) grp.style.display = (src === 'top_other' || src === 'khac') ? 'none' : '';
    if (!dl) return;
    let rows = [];
    if (src === 'baotinh_loi') rows = baoTinhDefectStock();
    else if (src === 'bullig_loi') rows = bulligDefectStock();
    else if (src === 'nan_loai_han') rows = nanRejectStock();
    dl.innerHTML = rows.map(x => `<option value="${escapeHTML(x.sizeKey)}"></option>`).join('');
  }
  // Ô tự tính: nguồn · số thanh · m³ · chặn vượt tồn (tô đỏ ô số lượng)
  function renderX2KhoCalc() {
    const el = document.getElementById('x2-kho-calc');
    if (!el) return;
    const type = khoNoteTypeOf();
    const qtyEl = document.getElementById('x2-kho-qty');
    const qty = Math.floor(Number((qtyEl || {}).value) || 0);
    if (type === 'xuat') {
      // PHIẾU XUẤT: không còn ô số lượng — tổng LUÔN = Σ thanh của các thẻ lô đã gắn
      const picked = khoPickedTotal();
      let text = '';
      if (picked > 0) {
        const pickedLots = Object.keys(khoNotePicked).map(id => ({ batchId: id, qty: khoPickedQtyOf(id) }));
        const m3 = khoNoteM3Of(pickedLots);
        text = `Tổng phiếu (tự cộng từ ${Object.keys(khoNotePicked).length} thẻ lô): <strong>${fmtThanh(picked)}</strong> thanh · ${m3.toFixed(3)} m³`;
        // ① Chặn theo TỒN TỪNG LÔ đang gắn (dữ liệu thật) → đỏ, bấm Lưu sẽ bị từ chối
        const bad = khoLotsOverflow(pickedLots);
        if (bad.length) {
          const b0 = bad[0];
          text += ` · <span class="kho-warn" title="Mỗi lô không được xuất quá phần CÒN LẠI của chính nó — bấm Lưu sẽ bị từ chối">VƯỢT tồn lô ${escapeHTML(b0.code)} (còn ${fmtThanh(b0.cap)} thanh)</span>`;
        }
        // ② Lệch SỔ (phiếu bù cũ ghi hơn sức chứa) → CHỈ cảnh báo vàng, KHÔNG chặn
        else {
          const sum = khoStockSummary();
          if (sum.mismatchThanh >= 1 || sum.honestThanh < picked) {
            text += ` · <span class="kho-warn" style="color:#b45309;" title="Sổ kho đang lệch (phiếu bù cũ ghi nhiều hơn sức chứa, xem chip ⚠ ở thanh tồn) — chỉ là CẢNH BÁO, vẫn tạo được phiếu nếu các lô đã chọn còn tồn">⚠ Sổ kho lệch — không chặn phiếu gắn lô còn tồn</span>`;
          }
        }
      } else {
        text = 'Chưa chọn thẻ lô — bấm \"Chọn Lô Gắn Phiếu\" (tổng phiếu tự cộng từ số thanh các thẻ)';
      }
      el.innerHTML = text;
      if (qtyEl) qtyEl.classList.remove('kho-qty-bad');
    } else {
      const src = (document.getElementById('x2-kho-source') || {}).value || 'baotinh_loi';
      const sizeKey = ((document.getElementById('x2-kho-size') || {}).value || '').trim();
      const avail = khoScrapRemainingOf(src, sizeKey);
      let text = `Nguồn: <strong>${KHO_SOURCE_LABELS[src] || escapeHTML(src)}</strong>`;
      if (sizeKey) text += ` · cỡ <strong>${escapeHTML(sizeKey)}</strong>`;
      if (avail != null) {
        text += ` · tồn lỗi: <strong>${fmtThanh(avail)}</strong> thanh`;
        if (qty > avail) text += ` · <span class="kho-warn">VƯỢT tồn lỗi</span>`;
      }
      el.innerHTML = text;
      if (qtyEl && avail != null) qtyEl.classList.toggle('kho-qty-bad', qty > avail);
    }
  }

  // ─── TỒN TRUNG GIAN MỚI: TÓP / KHÁC của BÀO TINH ────────────────
  // Số thanh ghi vào cột Tóp / Khác ở các lượt Bào Tinh (nguồn phiếu xuất) —
  // CHƯA tính phiếu xử lý (tiêu hủy/tái chế gắn cờ topOther) trừ ra.
  function baoTinhTopOtherStock() {
    let total = 0, used = 0;
    (state.xuong2BaoTinhRecords || []).forEach(r => {
      if (!r || (r.kind !== 'tinh' && r.kind !== 'ha_cap')) return;
      total += (Number(r.qtyTop) || 0) + (Number(r.qtyOther) || 0);
    });
    khoApprovedScrapNotes('top_other').forEach(n => { used += Number(n.qty) || 0; });
    return { total, used, remaining: Math.max(0, total - used) };
  }

  // ─── RENDER CÁC KHỐI CỦA THẺ KHO NAN ─────────────────────────
  // Thanh tồn trên cùng: 3 Ô KPI (Tồn Kho · Đang sấy · Tổng trong nhà máy) + chip chờ duyệt / thiếu phiếu
  function renderX2KhoStockBar() {
    const bar = document.getElementById('x2-kho-stock-bar');
    if (!bar) return;
    const s = khoStockSummary();
    const fmt = v => Math.round(v).toLocaleString('vi-VN');
    // 3 Ô KPI — nhãn NGẮN; mọi câu giải thích chỉ nằm trong title (tooltip)
    const parts = [
      `<span class="kho-kpi kho-kpi-kho" title="Tồn Kho THỰC = (số lần nhập kho × số lượng) − phiếu xuất ĐÃ DUYỆT. Lô đã xuất hết được ẨN (công tắc ở bảng Tồn Theo Lô)."><span class="kho-kpi-label"><i data-lucide="warehouse"></i> Tồn Kho:</span> <strong>${fmt(s.remainingThanh)} thanh</strong> · ${s.remainingM3.toFixed(2)} m³ · ${s.liveLots} lô</span>`,
      `<span class="kho-kpi kho-kpi-say" title="Nan ĐANG SẤY (Sấy 1 + Sấy 2 — chưa vào kho). Số này KHÔNG trừ phiếu kho."><span class="kho-kpi-label"><i data-lucide="flame"></i> Đang sấy:</span> <strong>${fmt(s.poolSayThanh)} thanh</strong> · S1 ${fmt(s.poolSay1Thanh)} + S2 ${fmt(s.poolSay2Thanh)}</span>`,
      `<span class="kho-kpi kho-kpi-total" title="TỔNG nan trong nhà máy = Tồn Kho + nan đang sấy — con số dùng cho bảng Kế Hoạch."><span class="kho-kpi-label"><i data-lucide="layers"></i> Tổng trong nhà máy:</span> <strong>${fmt(s.poolThanh)} thanh</strong></span>`
    ];
    if (s.pendingCount) parts.push(`<span class="kho-pending-chip" title="Phiếu chờ Ban lãnh đạo duyệt — CHƯA trừ tồn"><i data-lucide="clock"></i> ${s.pendingCount} phiếu chờ duyệt (${fmt(s.pendingQty)} thanh)</span>`);
    if (s.overAlloc > 0) parts.push(`<span class="kho-warn-chip" title="Phiếu đã duyệt vượt sức chứa của các lô đang ở Kho — hãy gắn lô hoặc nhập kho bổ sung">⚠ Vượt ${fmt(s.overAlloc)} thanh chưa gắn lô</span>`);
    if (s.mismatchThanh >= 1) parts.push(`<span class="kho-warn-chip" title="Hệ thống ghi đã dùng (Bào Tinh / Bullig / quay lại Sấy 2) nhiều hơn số phiếu kho ĐÃ DUYỆT — tức là còn THIẾU phiếu. Bấm nút 'Tạo phiếu bù' ở bảng Tồn Theo Lô để sinh phiếu bù (chỉ Admin / Ban Quản Lý).">⚠ Thiếu phiếu kho ${fmt(s.mismatchThanh)} thanh</span>`);
    bar.innerHTML = parts.join('');
  }
  // Khối TỒN TRUNG GIAN (WIP): mỗi dòng bấm = mở thẳng thẻ công đoạn tương ứng
  function renderX2KhoWipBar() {
    const bar = document.getElementById('x2-kho-wip-bar');
    if (!bar) return;
    const bt = baoTinhDefectStock().reduce((s, x) => s + x.remaining, 0);
    const blCt = bulligCtPending();
    const blErr = bulligDefectStock().reduce((s, x) => s + x.remaining, 0);
    const rej = nanRejectStock().reduce((s, x) => s + x.remaining, 0);
    const gcPending = bulligGcPending();
    const rows = [
      { label: 'Thanh lỗi Bào Tinh (chờ hạ cấp)', qty: bt, card: 'x2-bao-tinh-card' },
      { label: 'Tóp / Khác Bào Tinh (chờ xử lý)', qty: baoTinhTopOtherStock().remaining, card: 'x2-kho-card' },
      { label: 'Thành phẩm Bullig (chờ Chọn thanh)', qty: blCt, card: 'x2-bullig-card' },
      { label: 'Thanh lỗi Chọn thanh Bullig (chờ xử lý)', qty: blErr, card: 'x2-bullig-card' },
      { label: 'Nan Loại hẳn — Chọn Nan Thô (chờ xử lý)', qty: rej, card: 'x2-chon-nan-tho-card' },
      { label: 'Thanh thô Bullig chờ Gia công (đang tính trong Tồn Kho)', qty: gcPending, card: 'x2-bullig-card' }
    ];
    bar.innerHTML = `<div class="kho-wip-title"><i data-lucide="layers"></i> Tồn trung gian (nằm ở TỪNG CÔNG ĐOẠN — không phải tồn Kho):</div>` +
      rows.map(r => `<button type="button" class="kho-wip-row${r.qty > 0 ? '' : ' zero'}" data-kho-open-card="${r.card}" title="Mở thẻ công đoạn để xem chi tiết / xử lý">
        <span>${escapeHTML(r.label)}</span><strong>${r.qty > 0 ? fmtThanh(r.qty) + ' thanh' : '—'}</strong></button>`).join('');
  }
  // Thống kê nhanh (material-stats)
  function renderX2KhoStats() {
    const box = document.getElementById('x2-kho-stats');
    if (!box) return;
    const s = khoStockSummary();
    const fmt = v => Math.round(v).toLocaleString('vi-VN');
    const byPurpose = {};
    KHO_PURPOSE_ORDER.forEach(p => { byPurpose[p] = 0; });
    khoApprovedXuatNotes().forEach(n => { byPurpose[khoNormPurpose(n.purpose)] += Number(n.qty) || 0; });
    box.innerHTML = `
      <div class="material-stat" title="Tồn trong kho = (số lần nhập kho × số lượng) − phiếu xuất ĐÃ DUYỆT"><span class="material-stat-label">Tồn kho (thanh)</span><span class="material-stat-value">${fmt(s.remainingThanh)}</span></div>
      <div class="material-stat" title="Tồn trong kho quy đổi theo mét khối"><span class="material-stat-label">Tồn kho (m³)</span><span class="material-stat-value">${s.remainingM3.toFixed(2)}</span></div>
      <div class="material-stat" title="Số lô còn hàng trong kho (lô xuất hết bị ẩn)"><span class="material-stat-label">Lô còn hàng</span><span class="material-stat-value">${s.liveLots}</span></div>
      <div class="material-stat" title="Lô đã xuất hết — đang bị ẩn ở bảng Tồn Theo Lô"><span class="material-stat-label">Lô đã xuất hết (ẩn)</span><span class="material-stat-value">${s.usedUpLots}</span></div>
      <div class="material-stat" title="Nan ĐANG SẤY (Sấy 1 + Sấy 2) — chưa vào kho, không trừ phiếu kho"><span class="material-stat-label">Đang sấy (S1+S2)</span><span class="material-stat-value">${fmt(s.poolSayThanh)}</span></div>
      <div class="material-stat" title="TỔNG nan trong nhà máy = Tồn Kho + nan đang sấy — số dùng cho bảng Kế Hoạch"><span class="material-stat-label">Tổng trong nhà máy</span><span class="material-stat-value">${fmt(s.poolThanh)}</span></div>
      <div class="material-stat" title="Phiếu chờ Ban lãnh đạo duyệt — CHƯA trừ tồn"><span class="material-stat-label">Phiếu chờ duyệt</span><span class="material-stat-value">${s.pendingCount} · ${fmt(s.pendingQty)} thanh</span></div>
      <div class="material-stat" title="Hệ thống ghi đã dùng nhiều hơn phiếu kho ĐÃ DUYỆT — bấm 'Tạo phiếu bù' ở bảng Tồn Theo Lô"><span class="material-stat-label">Thiếu phiếu kho</span><span class="material-stat-value">${s.mismatchThanh >= 1 ? fmt(s.mismatchThanh) + ' thanh' : 'Khớp'}</span></div>
      <div class="material-stat" title="Tổng phiếu xuất ĐÃ DUYỆT theo mục đích (Sấy 2 · Bào Tinh · Bullig · Khác)"><span class="material-stat-label">Xuất đã duyệt (S2 · BT · BL · Khác)</span><span class="material-stat-value">${KHO_PURPOSE_ORDER.map(p => fmt(byPurpose[p])).join(' · ')} thanh</span></div>`;
  }

  // ─── BẢNG PHIẾU CHỜ DUYỆT (Ban lãnh đạo duyệt) ───────────────
  function khoPendingNotes() {
    return (state.khoNotes || []).filter(n => n && n.status === 'cho_duyet')
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }
  // Cột "Hệ thống suy ra": tổng số thanh hệ thống tự tính CÙNG NGÀY + CÙNG loại
  // (bào tinh / bullig / quay lại Sấy 2) — để lãnh đạo đối chiếu trước khi duyệt
  function khoDerivedTextOf(n) {
    if (n.type !== 'xuat') return '—';
    const p = khoNormPurpose(n.purpose);
    if (p === 'khac') return '—';
    const dv = khoLedgerEvents().derived.filter(d => d.date === n.date && d.kind === p);
    return dv.length ? `${fmtThanh(dv.reduce((s, d) => s + d.qty, 0))} thanh` : '0 thanh';
  }
  function khoNoteRowHtml(n) {
    const canApprove = canApproveLeave();
    const picked = khoPickIds.has(n.id);
    const kind = n.type === 'xuat'
      ? `Xuất → <strong>${KHO_PURPOSE_LABELS[khoNormPurpose(n.purpose)] || '—'}</strong>${n.purposeNote ? ` (${escapeHTML(n.purposeNote)})` : ''}`
      : `${KHO_METHOD_LABELS[n.method] || escapeHTML(n.type || '')} · ${KHO_SOURCE_LABELS[n.source] || escapeHTML(n.source || '—')}${n.sizeKey ? ` · cỡ ${escapeHTML(n.sizeKey)}` : ''}`;
    const lotsTxt = (Array.isArray(n.lots) && n.lots.length)
      ? n.lots.map(l => {
          const b = (state.batches || []).find(x => x && x.id === l.batchId);
          return `${b ? (b.code || l.batchId) : l.batchId} (${fmtThanh(l.qty)})`;
        }).join(' + ')
      : 'Tổng (tự phân bổ FIFO)';
    return `<div class="kho-note-row" data-kho-note="${escapeHTML(n.id)}">
      <label class="kho-note-pick" title="Chọn để duyệt hàng loạt"><input type="checkbox" data-kho-note-pick="${escapeHTML(n.id)}" ${picked ? 'checked' : ''}></label>
      <div class="kho-note-main">
        <div class="kho-note-line1"><span class="kho-badge kho-badge-${n.type === 'xuat' ? 'xuat' : 'xu_ly'}">${n.type === 'xuat' ? 'Xuất kho' : 'Xử lý lỗi'}</span> ${kind} · <strong>${fmtThanh(Number(n.qty) || 0)}</strong> thanh · ngày ${formatDateDDMMYY(n.date)}</div>
        <div class="kho-note-line2">Gắn lô: ${escapeHTML(lotsTxt)} · Người tạo: ${escapeHTML(n.createdByName || n.createdBy || '—')} · Hệ thống suy ra cùng ngày: ${khoDerivedTextOf(n)}${n.note ? ` · Ghi chú: ${escapeHTML(n.note)}` : ''}</div>
      </div>
      <div class="kho-note-actions">
        ${canApprove ? `<button type="button" class="btn btn-success btn-sm" data-kho-approve="${escapeHTML(n.id)}" title="Duyệt phiếu (số liệu chính thức trừ tồn)"><i data-lucide="check"></i> Duyệt</button>
        <button type="button" class="btn btn-outline btn-sm" data-kho-reject="${escapeHTML(n.id)}" title="Từ chối phiếu"><i data-lucide="x"></i> Từ chối</button>` : '<span class="kho-note-wait">Chờ Ban lãnh đạo duyệt</span>'}
        ${n.status === 'cho_duyet' ? `<button type="button" class="btn btn-outline btn-icon btn-sm" data-kho-edit="${escapeHTML(n.id)}" title="Sửa phiếu"><i data-lucide="pencil"></i></button>` : ''}
        <button type="button" class="btn btn-outline btn-icon btn-sm" data-kho-delete="${escapeHTML(n.id)}" title="Xóa phiếu" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
  }
  function renderX2KhoPending() {
    const wrap = document.getElementById('x2-kho-pending-wrap');
    if (!wrap) return;
    const rows = khoPendingNotes();
    const count = document.getElementById('x2-kho-pending-count');
    if (count) count.textContent = rows.length ? `${rows.length} phiếu chờ duyệt` : '';
    const list = document.getElementById('x2-kho-pending-rows');
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<div class="al-empty">— Không có phiếu nào chờ duyệt —</div>';
      wrap.classList.add('empty');
    } else {
      wrap.classList.remove('empty');
      list.innerHTML = rows.map(khoNoteRowHtml).join('');
    }
    const approveAll = document.getElementById('x2-kho-approve-all');
    if (approveAll) approveAll.style.display = (rows.length && canApproveLeave()) ? '' : 'none';
    initLucide();
  }

  // ─── SỔ NHẬP/XUẤT THEO KỲ (Ngày / Tuần / Tháng) ──────────────
  function khoGroupLabelOf(key, mode) {
    if (mode === 'tuan') { const m = /^(\d{4})-W(\d{1,2})$/.exec(String(key || '')); return m ? `Tuần ${m[2]} / ${m[1]}` : String(key || ''); }
    if (mode === 'thang') { const m = /^(\d{4})-(\d{2})$/.exec(String(key || '')); return m ? `Tháng ${m[2]}/${m[1]}` : String(key || ''); }
    return formatDateDDMMYY(key);
  }
  function khoInRowHtml(r, showDate) {
    return `<tr>
      ${showDate ? `<td>${formatDateDDMMYY(r.date)}</td>` : ''}
      <td>Lần ${r.round}</td><td>${escapeHTML(r.code)}</td><td>${Number(r.length) || 0}×${Number(r.width) || 0}×${Number(r.thickness) || 0}</td>
      <td>${escapeHTML(r.bambooType || '—')}</td><td>${escapeHTML(r.useFor || '—')}</td><td>${escapeHTML(r.location || '—')}</td>
      <td>${fmtThanh(r.qty)}</td><td>${(Number(r.m3) || 0).toFixed(4)}</td></tr>`;
  }
  function khoOutRowHtml(r, showDate) {
    const lotsTxt = r.lotIds.length
      ? r.lotIds.map(id => { const b = (state.batches || []).find(x => x && x.id === id); return b ? (b.code || id) : id; }).join(', ')
      : 'Tổng (FIFO)';
    return `<tr>
      ${showDate ? `<td>${formatDateDDMMYY(r.date)}</td>` : ''}
      <td><span class="kho-purpose-chip kho-purpose-${r.purpose}">${KHO_PURPOSE_LABELS[r.purpose] || r.purpose}</span>${r.purposeNote ? ` ${escapeHTML(r.purposeNote)}` : ''}</td>
      <td>${escapeHTML(lotsTxt)}</td><td>${fmtThanh(r.qty)}</td><td>${r.m3 ? Number(r.m3).toFixed(3) : '—'}</td><td>${escapeHTML(r.note || '')}</td></tr>`;
  }
  function khoDerivedRowHtml(r, showDate) {
    const kindLabel = { baotinh: 'Bào Tinh', bullig: 'Bullig (gia công)', say2: 'Quay lại Sấy 2' }[r.kind] || r.kind;
    return `<tr>${showDate ? `<td>${formatDateDDMMYY(r.date)}</td>` : ''}<td>${kindLabel}</td><td>${escapeHTML(r.code)}</td><td>${fmtThanh(r.qty)}</td></tr>`;
  }
  function khoGroupCardHtml(g, mode) {
    const showDate = mode !== 'day';
    const inRowsHtml = g.inRows.map(r => khoInRowHtml(r, showDate)).join('');
    const outRowsHtml = g.outRows.map(r => khoOutRowHtml(r, showDate)).join('');
    const dvRowsHtml = (g.derivedRows || []).map(r => khoDerivedRowHtml(r, showDate)).join('');
    return `<div class="kho-day-card">
      <div class="x2-day-head">
        <span class="x2-day-date"><i data-lucide="warehouse"></i> ${escapeHTML(khoGroupLabelOf(g.key, mode))}</span>
        <span class="kho-sum kho-sum-in">Nhập: ${g.inRows.length} lô · ${fmtThanh(g.inQty)} thanh · ${g.inM3.toFixed(3)} m³</span>
        <span class="kho-sum kho-sum-out">Xuất: ${g.outRows.length} phiếu · ${fmtThanh(g.outQty)} thanh · ${g.outM3.toFixed(3)} m³</span>
        <span class="kho-sum kho-sum-end">Tồn cuối kỳ: ${fmtThanh(g.endThanh)} thanh</span>
      </div>
      <div class="kho-note-hint">1 lô có thể ra/vào kho NHIỀU LẦN — sổ ghi từng lần (Lần 1, Lần 2…); bảng Tồn bên dưới chỉ hiện MỖI lô 1 dòng.</div>
      <div class="kho-zone kho-zone-in"><div class="kho-zone-head">NHẬP KHO</div>
        <table class="kho-table"><thead><tr>${showDate ? '<th>Ngày</th>' : ''}<th>Lần</th><th>Mã lô</th><th>K.thước</th><th>Loại</th><th>Dùng cho</th><th>Vị trí</th><th>Thanh</th><th>m³</th></tr></thead>
        <tbody>${inRowsHtml || '<tr><td colspan="9">— Không có lô nhập trong kỳ này —</td></tr>'}</tbody></table></div>
      <div class="kho-zone kho-zone-out"><div class="kho-zone-head">XUẤT KHO (phiếu ĐÃ DUYỆT)</div>
        <table class="kho-table"><thead><tr>${showDate ? '<th>Ngày</th>' : ''}<th>Mục đích</th><th>Lô gắn</th><th>Thanh</th><th>m³</th><th>Ghi chú</th></tr></thead>
        <tbody>${outRowsHtml || '<tr><td colspan="6">— Không có phiếu xuất đã duyệt trong kỳ này —</td></tr>'}</tbody></table></div>
      ${dvRowsHtml ? `<div class="kho-zone kho-zone-dv"><div class="kho-zone-head">ĐỐI CHIẾU — hệ thống suy ra (không trừ tồn)</div>
        <table class="kho-table"><thead><tr>${showDate ? '<th>Ngày</th>' : ''}<th>Nguồn</th><th>Mã lô</th><th>Thanh</th></tr></thead><tbody>${dvRowsHtml}</tbody></table></div>` : ''}
    </div>`;
  }

  function renderX2KhoLedger() {
    const box = document.getElementById('x2-kho-day-cards');
    if (!box) return;
    const mode = khoPeriodMode;
    const from = ((document.getElementById('x2-kho-from') || {}).value || '').trim();
    const to = ((document.getElementById('x2-kho-to') || {}).value || '').trim();
    const q = khoLedgerQuery.trim().toLowerCase();
    const { inRows, outRows, derived } = khoLedgerEvents();
    const inRange = d => (!from || String(d || '') >= from) && (!to || String(d || '') <= to);
    const groups = new Map();
    const groupOf = (date) => {
      const key = khoPeriodKeyOf(date, mode);
      if (!key) return null;
      let g = groups.get(key);
      if (!g) { g = { key, dates: new Set(), inRows: [], outRows: [], derivedRows: [] }; groups.set(key, g); }
      return g;
    };
    const rowMatch = text => !q || String(text || '').toLowerCase().includes(q);
    inRows.forEach(r => {
      if (!inRange(r.date)) return;
      const g = groupOf(r.date);
      if (!g) return;
      g.dates.add(r.date);
      if (rowMatch(`${r.code} ${r.length}x${r.width}x${r.thickness} ${r.location} ${r.useFor} ${r.bambooType}`)) g.inRows.push(r);
    });
    outRows.forEach(r => {
      if (!inRange(r.date)) return;
      const g = groupOf(r.date);
      if (!g) return;
      g.dates.add(r.date);
      if (rowMatch(`${KHO_PURPOSE_LABELS[r.purpose] || ''} ${r.note} ${r.createdBy}`)) g.outRows.push(r);
    });
    derived.forEach(r => {
      if (!inRange(r.date)) return;
      const g = groupOf(r.date);
      if (!g) return;
      g.dates.add(r.date);
      if (rowMatch(r.code)) g.derivedRows.push(r);
    });
    // TỒN CUỐI KỲ — TÍNH NGƯỢC từ tồn thực (không lệch với các thẻ khác):
    //   Tồn(D) = Tồn thực hiện tại − Σ NHẬP (sau D) + Σ XUẤT (sau D)
    const summary = khoStockSummary();
    const list = [...groups.values()].map(g => {
      const dates = [...g.dates].sort();
      const dMax = dates[dates.length - 1] || '';
      const inAfter = inRows.filter(r => r.date > dMax).reduce((s, r) => s + r.qty, 0);
      const outAfter = outRows.filter(r => r.date > dMax).reduce((s, r) => s + r.qty, 0);
      g.endThanh = Math.max(0, summary.honestThanh - inAfter + outAfter);
      g.inQty = g.inRows.reduce((s, r) => s + r.qty, 0);
      g.inM3 = g.inRows.reduce((s, r) => s + r.m3, 0);
      g.outQty = g.outRows.reduce((s, r) => s + r.qty, 0);
      g.outM3 = g.outRows.reduce((s, r) => s + r.m3, 0);
      return g;
    }).sort((a, b) => String(b.key).localeCompare(String(a.key)));
    box.innerHTML = list.length
      ? list.map(g => khoGroupCardHtml(g, mode)).join('')
      : '<div class="al-empty">— Chưa có nhập/xuất kho nào trong khoảng đã chọn —</div>';
    const count = document.getElementById('x2-kho-table-count');
    if (count) count.textContent = `${list.length} kỳ · ${list.reduce((s, g) => s + g.inRows.length, 0)} dòng nhập · ${list.reduce((s, g) => s + g.outRows.length, 0)} dòng xuất`;
    initLucide();
  }

  // ─── BẢNG TỒN (mỗi lô 1 dòng — lô đã xuất hết ẨN mặc định) ───
  function khoStockRowHtml(b, rem, used) {
    const inN = khoInCountOf(b);
    const cap = inN * (Number(b.quantity) || 0);
    const outR = khoOutRoundCountOf(b);
    return `<div class="kho-stock-row${rem <= 0 ? ' used' : ''}">
      <div class="kho-stock-line1"><strong>${escapeHTML(b.code || '—')}</strong> · ${escapeHTML(b.location || '—')} · ${Number(b.length) || 0}×${Number(b.width) || 0}×${Number(b.thickness) || 0} mm
        <span class="tag-badge tag-type-${escapeHTML(b.bambooType || 'A')}">Loại ${escapeHTML(b.bambooType || '—')}</span>
        <span class="tag-badge tag-use-${escapeHTML(b.useFor || 'Van')}">${escapeHTML(b.useFor || '—')}</span></div>
      <div class="kho-stock-line2">
        <span>SL gốc ${fmtThanh(b.quantity)} × ${inN} lần nhập = ${fmtThanh(cap)}</span>
        <span>Đã xuất: <strong>${fmtThanh(used)}</strong></span>
        <span>Còn lại: <strong>${fmtThanh(rem)}</strong> thanh · ${(calculateVolume(b.length, b.width, b.thickness, rem)).toFixed(3)} m³</span>
        <span>vào kho ${formatDateDDMMYY(khoLastInDateOf(b))}</span>
        <span class="kho-round-badge" title="Số lần lô ra khỏi kho (sang Sấy 2) rồi nhập lại — KHÔNG phải nhiều lô">ra/vào ${outR} lần</span>
      </div>
      <div class="card-actions" data-perm="x2">
        <button class="btn btn-outline btn-icon btn-sm" onclick="app.openEditModal('${escapeHTML(b.id)}')" title="Sửa thẻ nan"><i data-lucide="edit-3"></i></button>
        <button class="btn btn-outline btn-icon btn-sm" onclick="app.deleteBatch('${escapeHTML(b.id)}')" title="Xóa thẻ" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
  }
  function renderX2KhoStockTable() {
    const box = document.getElementById('x2-kho-stock-rows');
    if (!box) return;
    const alloc = khoFifoAllocation();
    const q = khoStockQuery.trim().toLowerCase();
    const lots = (state.batches || []).filter(b => b && b.stage === 'kho')
      .sort((a, b) => khoFirstInDateOf(b).localeCompare(khoFirstInDateOf(a)));
    const rows = [];
    lots.forEach(b => {
      const rem = khoLotRemainingOf(b, alloc);
      if (rem <= 0 && !state.khoShowUsed) return; // ẨN lô đã xuất hết (mặc định)
      rows.push({ b, rem, used: Math.max(0, khoInCountOf(b) * (Number(b.quantity) || 0) - rem) });
    });
    const filtered = q
      ? rows.filter(x => `${x.b.code || ''} ${x.b.location || ''} ${x.b.length}x${x.b.width}x${x.b.thickness} ${x.b.bambooType || ''} ${x.b.useFor || ''}`.toLowerCase().includes(q))
      : rows;
    box.innerHTML = filtered.length
      ? filtered.map(x => khoStockRowHtml(x.b, x.rem, x.used)).join('')
      : '<div class="al-empty">— Không có lô nào ở Kho (hoặc tất cả đã xuất hết — bật "Hiện lô đã xuất hết" để xem) —</div>';
    const count = document.getElementById('x2-kho-stock-count');
    if (count) count.textContent = `${filtered.length} lô`;
    const chk = document.getElementById('x2-kho-show-used');
    if (chk) chk.checked = !!state.khoShowUsed;
    initLucide();
  }
  // Nút gạt kỳ sổ Ngày / Tuần / Tháng
  function syncKhoPeriodButtons() {
    [['x2-kho-period-day', 'day'], ['x2-kho-period-tuan', 'tuan'], ['x2-kho-period-thang', 'thang']].forEach(([id, m]) => {
      const b = document.getElementById(id);
      if (b) b.classList.toggle('active', khoPeriodMode === m);
    });
  }
  function setKhoPeriodMode(m) {
    khoPeriodMode = ['tuan', 'thang'].includes(m) ? m : 'day';
    syncKhoPeriodButtons();
    renderX2KhoLedger();
  }
  // Công tắc "Hiện lô đã xuất hết" (mặc định ẨN — nhớ theo máy)
  function khoSetShowUsed(v) {
    state.khoShowUsed = !!v;
    try { localStorage.setItem(STORAGE_KEY_KHO_SHOW_USED, state.khoShowUsed ? '1' : '0'); } catch (e) {}
    renderX2KhoStockTable();
    renderAll();
  }
  // Điểm render DUY NHẤT của thẻ Kho Nan (gọi khi mở thẻ + sau mọi thao tác dữ liệu)
  function renderX2KhoCard() {
    renderX2KhoStockBar();
    renderX2KhoWipBar();
    syncX2KhoNoteTypeRows();
    if (khoLotsOpen) renderX2KhoLotsList();
    fillX2KhoSizeSuggestions();
    renderX2KhoCalc();
    renderX2KhoStats();
    renderX2KhoPending();
    renderX2KhoLedger();
    renderX2KhoStockTable();
    syncKhoPeriodButtons();
    initLucide();
  }

  // ─── THAO TÁC PHIẾU KHO ──────────────────────────────────────
  // Xóa trắng form: giữ NGÀY + LOẠI PHIẾU (keepHeader) để nhập phiếu kế tiếp nhanh
  function resetX2KhoNoteForm(keepHeader) {
    const today = new Date().toISOString().split('T')[0];
    if (!keepHeader) {
      const dateEl = document.getElementById('x2-kho-date');
      if (dateEl) dateEl.value = today;
      khoNoteType = 'xuat';
    }
    const qtyEl = document.getElementById('x2-kho-qty');
    if (qtyEl) { qtyEl.value = ''; qtyEl.classList.remove('kho-qty-bad'); }
    const sizeEl = document.getElementById('x2-kho-size');
    if (sizeEl) sizeEl.value = '';
    const noteEl = document.getElementById('x2-kho-note');
    if (noteEl) noteEl.value = '';
    const pnEl = document.getElementById('x2-kho-purpose-note');
    if (pnEl) pnEl.value = '';
    khoNotePicked = {};
    khoNoteEditId = null;
    if (khoLotsOpen) khoToggleLotsPanel(false);
    syncX2KhoNoteTypeRows();
    renderX2KhoCalc();
  }
  // Sửa phiếu — CHỈ phiếu 'cho_duyet' (phiếu đã duyệt đã trừ tồn: xóa rồi tạo lại)
  function khoEditNote(id) {
    if (!requireEditPermission()) return;
    const n = (state.khoNotes || []).find(x => x && x.id === id);
    if (!n) return;
    if (n.status !== 'cho_duyet') { showToast('Phiếu ĐÃ DUYỆT đã trừ tồn — hãy xóa phiếu rồi tạo phiếu mới (cần quyền duyệt).', 'error'); return; }
    khoNoteEditId = id;
    khoNoteType = n.type === 'xuat' ? 'xuat' : 'xu_ly';
    const dateEl = document.getElementById('x2-kho-date');
    if (dateEl) dateEl.value = n.date || '';
    const purposeEl = document.getElementById('x2-kho-purpose');
    if (purposeEl) purposeEl.value = khoNormPurpose(n.purpose);
    const pnEl = document.getElementById('x2-kho-purpose-note');
    if (pnEl) pnEl.value = n.purposeNote || '';
    const srcEl = document.getElementById('x2-kho-source');
    if (srcEl) srcEl.value = n.source || 'baotinh_loi';
    const methodEl = document.getElementById('x2-kho-method');
    if (methodEl) methodEl.value = n.method || 'tieu_huy';
    const sizeEl = document.getElementById('x2-kho-size');
    if (sizeEl) sizeEl.value = n.sizeKey || '';
    const qtyEl = document.getElementById('x2-kho-qty');
    if (qtyEl) qtyEl.value = Number(n.qty) || 0;
    const noteEl = document.getElementById('x2-kho-note');
    if (noteEl) noteEl.value = n.note || '';
    khoNotePicked = {};
    (Array.isArray(n.lots) ? n.lots : []).forEach(l => {
      if (l && l.batchId) khoNotePicked[String(l.batchId)] = Number(l.qty) || 0;
    });
    if (Object.keys(khoNotePicked).length) khoToggleLotsPanel(true);
    syncX2KhoNoteTypeRows();
    fillX2KhoSizeSuggestions();
    renderX2KhoCalc();
  }

  // LƯU PHIẾU KHO (thêm mới / cập nhật phiếu chờ duyệt)
  function handleKhoNoteSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!requireEditPermission()) return;
    const isEdit = !!khoNoteEditId;
    const type = khoNoteTypeOf();
    const dateVal = ((document.getElementById('x2-kho-date') || {}).value || '').trim();
    const note = ((document.getElementById('x2-kho-note') || {}).value || '').trim();
    if (!dateVal) { showToast('Chọn NGÀY phiếu!', 'error'); return; }
    const now = new Date().toISOString();
    let data;
    if (type === 'xuat') {
      // ── PHIẾU XUẤT: KHÔNG có ô số lượng — tổng = Σ số thanh của các thẻ lô đã gắn ──
      const purpose = khoNormPurpose((document.getElementById('x2-kho-purpose') || {}).value);
      const purposeNote = ((document.getElementById('x2-kho-purpose-note') || {}).value || '').trim();
      const lots = Object.keys(khoNotePicked).map(id => ({ batchId: id, qty: khoPickedQtyOf(id) }));
      const qty = lots.reduce((s, l) => s + l.qty, 0);
      if (!lots.length || qty <= 0) { showToast('Chọn ít nhất 1 THẺ LÔ để gắn phiếu — tổng phiếu tự cộng từ số thanh của các thẻ!', 'error'); return; }
      // ── CHẶN THEO TỒN TỪNG LÔ (không dùng tổng kho — sổ có thể lệch do phiếu bù cũ) ──
      // Mỗi lô không được xuất quá phần CÒN LẠI của chính nó; chạy CẢ khi sửa phiếu
      // (phiếu đang sửa chưa duyệt → chưa từng trừ FIFO → tồn lô vẫn là số đúng).
      const badLots = khoLotsOverflow(lots);
      if (badLots.length) {
        const b0 = badLots[0];
        showToast(`Lô ${b0.code} chỉ còn ${Math.round(b0.cap).toLocaleString('vi-VN')} thanh — phiếu ghi ${Math.round(b0.qty).toLocaleString('vi-VN')} thanh!`, 'error');
        return;
      }
      data = { type: 'xuat', purpose, purposeNote, qty, m3: khoNoteM3Of(lots), lots };
    } else {
      // ── PHIẾU XỬ LÝ LỖI: vẫn nhập tay ô Số Lượng (riêng phiếu này) ──
      const qty = Math.floor(Number((document.getElementById('x2-kho-qty') || {}).value) || 0);
      if (qty <= 0) { showToast('Nhập số lượng thanh!', 'error'); return; }
      const source = (document.getElementById('x2-kho-source') || {}).value || 'baotinh_loi';
      const method = (document.getElementById('x2-kho-method') || {}).value || 'tieu_huy';
      let sizeKey = ((document.getElementById('x2-kho-size') || {}).value || '').trim();
      if (source !== 'khac' && source !== 'top_other' && !sizeKey) { showToast('Chọn / nhập KÍCH THƯỚC của tồn lỗi cần xử lý!', 'error'); return; }
      if (source === 'top_other') sizeKey = '';   // Tóp/Khác Bào Tinh — không theo cỡ
      const avail = khoScrapRemainingOf(source, sizeKey);
      if (avail != null) {
        const old = isEdit ? (state.khoNotes || []).find(x => x && x.id === khoNoteEditId) : null;
        const cap = avail + (old ? (Number(old.qty) || 0) : 0); // khi sửa: trả lại phần phiếu cũ trước khi so
        if (qty > cap) {
          showToast(`Vượt tồn lỗi của cỡ này (${Math.round(cap).toLocaleString('vi-VN')} thanh)!`, 'error');
          return;
        }
      }
      data = { type: method === 'taiche' ? 'taiche' : 'tieuhuy', source, method, sizeKey, qty, m3: 0, lots: [] };
    }
    pushUndo(isEdit ? 'Sửa phiếu kho' : 'Thêm phiếu kho');
    if (isEdit) {
      const n = (state.khoNotes || []).find(x => x && x.id === khoNoteEditId);
      if (n) Object.assign(n, data, { note, updatedAt: now });
    } else {
      state.khoNotes = [...(state.khoNotes || []), Object.assign({
        id: `kho-note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: dateVal, note,
        status: 'cho_duyet',                     // CHỜ BAN LÃNH ĐẠO DUYỆT
        createdBy: khoUserKey(), createdByName: khoUserName(), createdAt: now
      }, data, { updatedAt: now })];
    }
    saveKhoNotes();
    resetX2KhoNoteForm(true); // giữ ngày + loại phiếu để nhập phiếu kế tiếp
    renderAll();
    showToast(isEdit ? 'Đã cập nhật phiếu kho!' : 'Đã gửi phiếu kho — chờ Ban lãnh đạo duyệt!', 'success');
  }
  // XÓA PHIẾU (phiếu đã duyệt chỉ Admin/Ban Quản Lý được xóa — vì đã trừ tồn)
  function khoDeleteNote(id) {
    if (!requireEditPermission()) return;
    const n = (state.khoNotes || []).find(x => x && x.id === id);
    if (!n) return;
    if (n.status === 'da_duyet' && !canApproveLeave()) {
      showToast('Phiếu ĐÃ DUYỆT — chỉ Quản Trị / Ban Quản Lý xóa được.', 'error');
      return;
    }
    const label = n.type === 'xuat'
      ? `phiếu xuất ${KHO_PURPOSE_LABELS[khoNormPurpose(n.purpose)] || ''} ngày ${formatDateDDMMYY(n.date)} (${fmtThanh(n.qty)} thanh)`
      : `phiếu xử lý ${KHO_SOURCE_LABELS[n.source] || ''} ngày ${formatDateDDMMYY(n.date)}`;
    if (!confirm(`Xóa ${label}?`)) return;
    pushUndo('Xóa phiếu kho');
    trackDeleted('khoNotes', id); // tombstone: chặn mây/máy khác hồi sinh phiếu đã xóa
    state.khoNotes = (state.khoNotes || []).filter(x => x && x.id !== id);
    if (khoNoteEditId === id) khoNoteEditId = null;
    saveKhoNotes();
    renderAll();
    showToast('Đã xóa phiếu kho!', 'success');
  }

  // ── KIỂM TỒN TRƯỚC KHI DUYỆT 1 PHIẾU XUẤT — trả thông báo lỗi (null = OK) ──
  // Phiếu GẮN LÔ → kiểm theo TỒN TỪNG LÔ (sổ tổng có thể lệch do phiếu bù cũ).
  // Phiếu KHÔNG gắn lô (phiếu bù dữ liệu cũ) → giữ nguyên kiểm theo tổng kho.
  function khoApproveCheckError(n) {
    if (!n || n.type !== 'xuat') return null;
    const lots = Array.isArray(n.lots) ? n.lots : [];
    if (lots.length) {
      const bad = khoLotsOverflow(lots);
      if (bad.length) {
        const b0 = bad[0];
        return `Lô ${b0.code} chỉ còn ${Math.round(b0.cap).toLocaleString('vi-VN')} thanh — phiếu ghi ${Math.round(b0.qty).toLocaleString('vi-VN')} thanh. Hãy sửa phiếu trước khi duyệt!`;
      }
      return null;
    }
    const otherOut = khoApprovedXuatNotes().reduce((s, x) => s + (Number(x.qty) || 0), 0);
    const inTotal = (state.batches || []).filter(b => b && b.stage === 'kho')
      .reduce((s, b) => s + khoInCountOf(b) * (Number(b.quantity) || 0), 0);
    return ((Number(n.qty) || 0) > Math.max(0, inTotal - otherOut))
      ? 'Phiếu vượt tồn kho hiện tại — hãy sửa số lượng trước khi duyệt!'
      : null;
  }
  // DUYỆT / TỪ CHỐI — chỉ Ban lãnh đạo (Admin / Ban Quản Lý, cổng canApproveLeave)
  function khoApproveNote(id) {
    if (!requireEditPermission()) return;
    if (!canApproveLeave()) { showToast('Chỉ Quản Trị / Ban Quản Lý duyệt được phiếu kho!', 'error'); return; }
    const n = (state.khoNotes || []).find(x => x && x.id === id);
    if (!n || n.status !== 'cho_duyet') return;
    if (n.type === 'xuat') {
      // KIỂM LẠI tồn LÚC DUYỆT (tồn có thể đã đổi do phiếu khác được duyệt trước)
      const err = khoApproveCheckError(n);
      if (err) { showToast(err, 'error'); return; }
    } else {
      const avail = khoScrapRemainingOf(n.source, n.sizeKey);
      if (avail != null && (Number(n.qty) || 0) > avail) {
        showToast('Phiếu vượt tồn lỗi của cỡ này — hãy sửa số lượng trước khi duyệt!', 'error');
        return;
      }
    }
    pushUndo('Duyệt phiếu kho');
    const now = new Date().toISOString();
    n.status = 'da_duyet';
    n.approvedBy = khoUserKey(); n.approvedByName = khoUserName(); n.approvedAt = now; n.updatedAt = now;
    saveKhoNotes();
    renderAll();
    showToast('Đã duyệt phiếu kho — số liệu tồn đã cập nhật!', 'success');
  }
  function khoRejectNote(id) {
    if (!requireEditPermission()) return;
    if (!canApproveLeave()) { showToast('Chỉ Quản Trị / Ban Quản Lý duyệt được phiếu kho!', 'error'); return; }
    const n = (state.khoNotes || []).find(x => x && x.id === id);
    if (!n || n.status !== 'cho_duyet') return;
    const reason = (typeof prompt === 'function') ? (prompt('Lý do từ chối phiếu (ghi chú cho người tạo):', '') || '') : '';
    pushUndo('Từ chối phiếu kho');
    const now = new Date().toISOString();
    n.status = 'tu_choi';
    n.rejectReason = String(reason).trim();
    n.approvedBy = khoUserKey(); n.approvedByName = khoUserName(); n.approvedAt = now; n.updatedAt = now;
    saveKhoNotes();
    renderAll();
    showToast('Đã từ chối phiếu kho!', 'success');
  }
  // Chọn NHIỀU phiếu để duyệt hàng loạt
  function khoTogglePick(id) {
    if (khoPickIds.has(id)) khoPickIds.delete(id);
    else khoPickIds.add(id);
    renderX2KhoPending();
  }
  function khoPickAllPending() {
    const rows = khoPendingNotes();
    const allPicked = rows.length && rows.every(n => khoPickIds.has(n.id));
    khoPickIds.clear();
    if (!allPicked) rows.forEach(n => khoPickIds.add(n.id));
    renderX2KhoPending();
  }
  function khoApprovePicked() {
    if (!requireEditPermission()) return;
    if (!canApproveLeave()) { showToast('Chỉ Quản Trị / Ban Quản Lý duyệt được phiếu kho!', 'error'); return; }
    const ids = [...khoPickIds];
    if (!ids.length) { showToast('Chưa chọn phiếu nào để duyệt!', 'error'); return; }
    pushUndo('Duyệt nhiều phiếu kho');
    const now = new Date().toISOString();
    let ok = 0, skipped = 0;
    ids.forEach(id => {
      const n = (state.khoNotes || []).find(x => x && x.id === id);
      if (!n || n.status !== 'cho_duyet') return;
      // Phiếu xuất: kiểm tồn LÚC DUYỆT (đã duyệt 1 phiếu thì tồn lô đã giảm → phiếu sau kiểm tiếp)
      if (n.type === 'xuat' && khoApproveCheckError(n)) { skipped++; return; }
      n.status = 'da_duyet';
      n.approvedBy = khoUserKey(); n.approvedByName = khoUserName(); n.approvedAt = now; n.updatedAt = now;
      ok++;
    });
    khoPickIds.clear();
    saveKhoNotes();
    renderAll();
    showToast(skipped
      ? `Đã duyệt ${ok} phiếu kho — ${skipped} phiếu vượt tồn đã bị BỎ QUA (sửa số lượng rồi duyệt lại)!`
      : `Đã duyệt ${ok} phiếu kho!`, skipped ? 'error' : 'success');
  }
  // Bấm vào 1 dòng phiếu chờ duyệt (uỷ nhiệm sự kiện — wire trong js/events.js)
  function khoOnPendingClick(e) {
    const t = e.target;
    const approve = t && t.closest ? t.closest('[data-kho-approve]') : null;
    if (approve) { khoApproveNote(approve.getAttribute('data-kho-approve')); return; }
    const reject = t && t.closest ? t.closest('[data-kho-reject]') : null;
    if (reject) { khoRejectNote(reject.getAttribute('data-kho-reject')); return; }
    const edit = t && t.closest ? t.closest('[data-kho-edit]') : null;
    if (edit) { khoEditNote(edit.getAttribute('data-kho-edit')); return; }
    const del = t && t.closest ? t.closest('[data-kho-delete]') : null;
    if (del) { khoDeleteNote(del.getAttribute('data-kho-delete')); return; }
    const pick = t && t.closest ? t.closest('[data-kho-note-pick]') : null;
    if (pick) { khoTogglePick(pick.getAttribute('data-kho-note-pick')); return; }
  }
  // Bấm 1 dòng WIP → mở thẳng thẻ công đoạn tương ứng
  function khoOnWipClick(e) {
    const btn = e.target && e.target.closest ? e.target.closest('[data-kho-open-card]') : null;
    if (btn) x2OpenCard(btn.getAttribute('data-kho-open-card'));
  }
  // Nút thu gọn bảng sổ / bảng tồn — dùng class `x2-cut-collapsed` (CHUẨN của khối
  // `.x2-cut-table-wrap`, có CSS `.x2-cut-collapsed .x2-cut-table-scroll {display:none}`).
  // Trước đây dùng `rate-table-collapsed` (CSS chỉ áp cho .planning-card) → bấm không ăn.
  function toggleX2KhoTable() {
    khoLedgerOpen = !khoLedgerOpen;
    const wrap = document.getElementById('x2-kho-table-wrap');
    if (wrap) wrap.classList.toggle('x2-cut-collapsed', !khoLedgerOpen);
    const btn = document.getElementById('btn-toggle-x2kho-table');
    if (btn) btn.innerHTML = `<i data-lucide="${khoLedgerOpen ? 'chevron-up' : 'chevron-down'}"></i> <span>${khoLedgerOpen ? 'Thu gọn' : 'Mở rộng'}</span>`;
    initLucide();
  }
  function toggleX2KhoStockTable() {
    khoStockOpen = !khoStockOpen;
    const wrap = document.getElementById('x2-kho-stock-wrap');
    if (wrap) wrap.classList.toggle('x2-cut-collapsed', !khoStockOpen);   // class CHUẨN của khối .x2-cut-table-wrap
    const btn = document.getElementById('btn-toggle-x2kho-stock');
    if (btn) btn.innerHTML = `<i data-lucide="${khoStockOpen ? 'chevron-up' : 'chevron-down'}"></i> <span>${khoStockOpen ? 'Thu gọn' : 'Mở rộng'}</span>`;
    initLucide();
  }

  // ─── PHIẾU BÙ DỮ LIỆU CŨ (chạy 1 lần khi vừa bật sổ kho) ─────
  // Mọi lượt Bào Tinh / Bullig / quay lại Sấy 2 ghi TRƯỚC khi có sổ kho đều
  // KHÔNG có phiếu ⇒ tồn sẽ bị "phồng". Hàm này sinh phiếu ĐÃ DUYỆT (kèm ghi
  // chú "Khởi tạo từ dữ liệu cũ") — CHẠY 2 LẦN KHÔNG SINH TRÙNG (so phần lô
  // đã có phiếu). Chỉ Admin / Ban Quản Lý.
  // Số thanh của lô đã QUA KHO → SẤY 2 (mỗi vòng ra/vào = 1 lần × số lượng).
  // Dùng khi tạo phiếu bù: phần này phải ghi purpose 'say2' — nan VẪN nằm trong
  // nhóm Sấy 1/2/Kho nên KHÔNG trừ "Tổng nan trong nhà máy" / tồn Kế Hoạch,
  // chỉ trừ Tồn Kho. (Bản cũ gộp vào 'khac' → tổng toàn nhóm bị trừ oan.)
  function khoS2ExitQtyOf(b) {
    if (b == null) return 0;
    let qty = 0, inKho = false;
    getBatchStageHistory(b).forEach(h => {
      if (h == null || !h.stage) return;
      if (h.stage === 'kho') inKho = true;
      else if (h.stage === 'say2' && inKho) { qty += Number(b.quantity) || 0; inKho = false; }
    });
    return qty;
  }
  function khoBackfillFromLegacy() {
    if (!requireEditPermission()) return;
    if (!canApproveLeave()) { showToast('Chỉ Quản Trị / Ban Quản Lý tạo được phiếu bù dữ liệu cũ.', 'error'); return; }
    // Σ hệ thống suy ra theo từng lô (đang ở nhóm Sấy 1/2/Kho)
    const derived = new Map();
    (state.batches || []).forEach(b => {
      if (!b) return;
      const d = khoDerivedOutOf(b.id);
      if (d > 0) derived.set(b.id, d);
    });
    // Phần ĐÃ có phiếu = PHÂN BỔ HIỆN TẠI (gắn lô tường minh + phần FIFO đã trừ vào
    // từng lô) — so với phần suy ra để CHỈ sinh phiếu cho phần còn THIẾU, chạy 2
    // lần không sinh trùng.
    const alloc = khoFifoAllocation();
    const have = new Map();
    alloc.byLot.forEach((qty, id) => have.set(id, qty));
    (state.khoNotes || []).forEach(n => {
      if (!n || !Array.isArray(n.lots)) return;
      n.lots.forEach(l => {
        const id = String((l && l.batchId) || '');
        if (id && !have.has(id)) have.set(id, 0); // lô đã rời kho — phiếu cũ vẫn tính
      });
    });
    const now = new Date().toISOString();
    const created = [];
    derived.forEach((qty, id) => {
      const need = Math.round(qty) - Math.round(have.get(id) || 0);
      if (need <= 0) return;
      const b = (state.batches || []).find(x => x && x.id === id);
      if (!b) return;
      // TÁCH phần "quay lại Sấy 2" (nan VẪN nằm trong nhóm Sấy 1/2/Kho) ra purpose
      // 'say2' — purpose này KHÔNG trừ "Tổng nan trong nhà máy" / tồn Kế Hoạch,
      // CHỈ trừ Tồn Kho. (Bản cũ gộp vào 'khac' → tổng toàn nhóm bị trừ oan.)
      const s2Exit = khoS2ExitQtyOf(b);
      let s2Have = 0;
      (state.khoNotes || []).forEach(n => {
        if (n == null || n.status !== 'da_duyet' || n.type !== 'xuat' || khoNormPurpose(n.purpose) !== 'say2') return;
        (Array.isArray(n.lots) ? n.lots : []).forEach(l => { if (l && String(l.batchId) === id) s2Have += Number(l.qty) || 0; });
      });
      const s2Part = Math.max(0, Math.min(need, s2Exit - s2Have));
      [
        { purpose: 'khac', qty: need - s2Part, note: 'Phiếu bù tự sinh từ nhật ký Bào Tinh / Bullig trước khi có sổ kho' },
        { purpose: 'say2', qty: s2Part, note: 'Phiếu bù tự sinh: nan QUAY LẠI SẤY 2 (vẫn nằm trong nhóm Sấy/Kho)' }
      ].filter(p => p.qty > 0).forEach(p => created.push({
        id: `kho-note-${Date.now()}-${created.length + 1}`, 
        type: 'xuat', date: khoLastInDateOf(b) || b.date || '',
        purpose: p.purpose, purposeNote: 'Khởi tạo từ dữ liệu cũ',
        qty: p.qty, m3: calculateVolume(b.length, b.width, b.thickness, p.qty),
        lots: [{ batchId: id, qty: p.qty }],
        note: p.note,
        status: 'da_duyet',
        createdBy: 'system', createdByName: 'Hệ thống (khởi tạo)', createdAt: now,
        approvedBy: 'system', approvedByName: 'Hệ thống (khởi tạo)', approvedAt: now,
        updatedAt: now
      }));
    });
    if (!created.length) { showToast('Không có dữ liệu cũ nào cần tạo phiếu bù — sổ kho đã khớp!', 'success'); return; }
    const total = created.reduce((s, n) => s + n.qty, 0);
    if (!confirm(`Tạo ${created.length} phiếu xuất bù (ĐÃ DUYỆT) cho dữ liệu cũ — tổng ${total.toLocaleString('vi-VN')} thanh?`)) return;
    pushUndo('Tạo phiếu bù dữ liệu cũ');
    state.khoNotes = [...(state.khoNotes || []), ...created];
    saveKhoNotes();
    renderAll();
    showToast(`Đã tạo ${created.length} phiếu bù (tổng ${total.toLocaleString('vi-VN')} thanh) — tồn kho đã khớp số suy ra!`, 'success');
  }

  // ═════════════════════════════════════════════════════════════
  // XƯỞNG 1 — CÁC CÔNG ĐOẠN (04/10/2026)
  // ═════════════════════════════════════════════════════════════
  // LUỒNG SX: Cắt Ống → Sấy Sinh → Bốc → Lọc Ống → Cắt Mắt → Bổ →
  //           Phơi Sấy → Lọc Thanh / Bó Xô
  // GIAI ĐOẠN 1: 3 thẻ ĐẦU có chức năng — Cắt Ống · Sấy Sinh · Bốc
  // (5 thẻ đuôi là launcher "Sắp có" — nay ĐÃ CÓ chức năng, gỡ cờ soon ở
  //  X2_CARD_DEFS + thêm SPEC vào X1_CHAIN_SPECS).
  //
  // Nguồn nguyên liệu ĐẦU VÀO = tab Nguyên Liệu, vị trí "Xưởng 1"
  // (state.materialRecords location === 'xuong-1' — Vầu/nứa).
  // Người + giờ HC/TC = Bảng bố trí Nhân Sự, bộ phận "Xưởng 1".
  // Định mức công suất theo tháng = state.x1Rates { <khối>: { 'YYYY-MM': kg/h } }
  //   → Hiệu suất = Công suất thực tế (KL ÷ giờ hiệu dụng) ÷ Định mức.
  //
  // CHUỖI LIÊN KẾT (giống mẫu X2: Bổ Ống ← Cắt Chọn):
  //   Cắt Ống  ← lô NL Xưởng 1
  //   Sấy Sinh ← lượt Cắt Ống   (tiêu thụ phần ống ĐẠT chưa sấy)
  //   Bốc      ← lượt Sấy Sinh  (tiêu thụ phần đã sấy chưa bốc)
  // Tồn của công đoạn trước = phần CHƯA bị công đoạn sau tiêu thụ →
  // xong hết tự ẨN khỏi ô chọn; đang sửa 1 lượt thì phần của nó được trả lại.
  // ─── NGUỒN LIỆU XƯỞNG 1 ─────────────────────────────────────
  function x1MaterialInputs() {
    return [...(state.materialRecords || [])]
      .filter(r => String(r.location || '') === 'xuong-1')
      .sort((a, b) => {
        if ((b.date || '') !== (a.date || '')) return String(b.date || '').localeCompare(String(a.date || ''));
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
  }

  // ─── NGƯỜI LÀM + GIỜ LÀM CỦA XƯỞNG 1 (bộ phận "Xưởng 1") ─────
  // Khác bản X2 đúng 1 chỗ: lọc theo department 'Xưởng 1' (hrAssignmentsAt
  // cứng 'Xưởng 2' nên không dùng lại được). Khớp tên vị trí vẫn MỀM (bỏ dấu).
  function hrX1AssignmentsAt(dateVal, matchPos) {
    if (!dateVal) return [];
    const posNameOf = id => {
      const p = (state.hrPositions || []).find(x => x.id === id);
      return String((p && p.name) || '').trim();
    };
    const emplOf = id => (state.hrEmployees || []).find(x => x.id === id) || null;
    return (state.hrAssignments || [])
      .filter(a => a.date === dateVal &&
                   String(a.department || '').trim() === 'Xưởng 1' &&
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
  // Giờ tách HC/TC theo cửa sổ ca của bộ phận Xưởng 1 (trả GIỜ, không phải phút)
  function sumPosHoursSplitX1(list, dateVal) {
    let hc = 0, tc = 0;
    (list || []).forEach(a => {
      if (!a.start) return;
      const r = hrSplitHoursHCDate('Xưởng 1', dateVal, a.start, a.end, a.shiftIdx || 0);
      hc += r.hc || 0; tc += r.tc || 0;
    });
    return { hc: hc / 60, tc: tc / 60 };
  }
  // Khớp tên vị trí Xưởng 1 (bỏ dấu, không phân biệt hoa/thường)
  function isX1CatOngPos(name)  { return normPosName(name).includes('cat ong'); }
  function isX1SaySinhPos(name) { return normPosName(name).includes('say sinh'); }
  // "Bốc" của Xưởng 1 — loại trừ "bốc luồng" (đó là vị trí của Xưởng 2)
  function isX1BocPos(name) { const s = normPosName(name); return s.includes('boc') && !s.includes('boc luong'); }

  const x1CatOngAssignmentsOf  = d => hrX1AssignmentsAt(d, isX1CatOngPos);
  const x1SaySinhAssignmentsOf = d => hrX1AssignmentsAt(d, isX1SaySinhPos);
  const x1BocAssignmentsOf     = d => hrX1AssignmentsAt(d, isX1BocPos);

  // SNAPSHOT người + giờ lúc lưu (phòng khi Bảng bố trí bị xóa về sau)
  function x1Snapshot(dateVal, list) {
    const split = sumPosHoursSplitX1(list, dateVal);
    return {
      names: list.map(a => a.name).filter(Boolean).join(', '),
      timeStr: list.map(posTimeStr).filter(s => s).join(', '),
      hours: split.hc + split.tc,
      hc: split.hc,
      tc: split.tc
    };
  }
  // Hiển thị người làm của 1 lượt: ƯU TIÊN bố trí SỐNG, mất thì dùng snapshot
  function x1WorkerRows(r, liveList) {
    const live = (liveList || []).map(a => ({ name: a.name, time: posTimeStr(a) }));
    if (live.length) return live;
    return String(r.worker || '').split(',').map(s => s.trim()).filter(Boolean)
      .map((name, i) => ({ name, time: String(r.workTime || '').split(',').map(s => s.trim())[i] || '' }));
  }
  // ─── ĐỊNH MỨC CÔNG SUẤT XƯỞNG 1 THEO THÁNG ───────────────────
  // state.x1Rates = { <8 khối>: { 'YYYY-MM': kg/h } }
  // (1 dict cho cả 8 công đoạn — theo mẫu x2SayRates s1/s2, x2BulligRates gc/ct)
  const X1_RATE_KINDS = [
    { id: 'catOng',    label: 'Cắt Ống',        cardId: 'x1-cat-ong-card' },
    { id: 'saySinh',   label: 'Sấy Sinh',        cardId: 'x1-say-sinh-card' },
    { id: 'boc',       label: 'Bốc',             cardId: 'x1-boc-card' },
    { id: 'locOng',    label: 'Lọc Ống',         cardId: 'x1-loc-ong-card' },
    { id: 'catMat',    label: 'Cắt Mắt',         cardId: 'x1-cat-mat-card' },
    { id: 'bo',        label: 'Bổ',              cardId: 'x1-bo-card' },
    { id: 'phoiSay',   label: 'Phơi Sấy',        cardId: 'x1-phoi-say-card' },
    { id: 'locThanh',  label: 'Lọc Thanh/Bó Xô', cardId: 'x1-loc-thanh-card' }
  ];
  function defaultX1Rates() {
    const o = {};
    X1_RATE_KINDS.forEach(k => { o[k.id] = {}; });
    return o;
  }
  // Chuẩn hoá bản đọc về (thiếu khối → thêm, không bỏ dữ liệu cũ)
  function normalizeX1Rates(o) {
    const out = defaultX1Rates();
    if (o && typeof o === 'object') {
      X1_RATE_KINDS.forEach(k => { if (o[k.id] && typeof o[k.id] === 'object') out[k.id] = { ...o[k.id] }; });
    }
    return out;
  }
  function x1RateOf(dateVal, kind) {
    const m = String(dateVal || '').slice(0, 7);
    if (!m) return 0;
    const v = Number(((state.x1Rates || {})[kind] || {})[m]);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }
  function loadX1Rates() {
    const raw = localStorage.getItem(STORAGE_KEY_X1_RATES);
    if (raw) {
      try { state.x1Rates = normalizeX1Rates(JSON.parse(raw)); }
      catch (e) { state.x1Rates = defaultX1Rates(); }
    } else state.x1Rates = defaultX1Rates();
  }
  function saveX1Rates() {
    try { localStorage.setItem(STORAGE_KEY_X1_RATES, JSON.stringify(state.x1Rates || defaultX1Rates())); }
    catch (e) { showToast('Không lưu được định mức Xưởng 1 (bộ nhớ đầy?).', 'error'); return; }
    logDataChange(['x1Rates']);
    if (state.fileStorage.connected) storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    firePushSync();
  }
  // ─── THẺ NGÀY DÙNG CHUNG CHO 3 THẺ XƯỞNG 1 ──────────────────
  // cfg = { boxId, countId, records, disp, qtyOf, incKey, rateKind,
  //         headName, thead, rowHtml(r, d), emptyIcon, emptyText }
  // Đầu thẻ = Ngày · Người · Giờ HC/TC · Công suất · Hiệu suất · ô Sự cố
  // (đúng khuôn thẻ ngày của Xưởng 2).
  function x1RenderDayCards(cfg) {
    const box = document.getElementById(cfg.boxId);
    if (!box) return;
    const recs = [...(cfg.records || [])].sort((a, b) => {
      if (String(b.date || '') !== String(a.date || '')) return String(b.date || '').localeCompare(String(a.date || ''));
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    const countEl = document.getElementById(cfg.countId);
    if (countEl) countEl.textContent = recs.length ? `${recs.length} lượt` : '';
    if (!recs.length) {
      box.innerHTML = `
        <div class="x2-day-card x2-day-card-empty">
          <i data-lucide="${escapeHTML(cfg.emptyIcon || 'inbox')}"></i>
          <div>${cfg.emptyText}</div>
        </div>`;
      initLucide();
      return;
    }
    const groups = new Map();
    recs.forEach(r => {
      const k = String(r.date || '');
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    let html = '';
    for (const [date, list] of groups) {
      const d0 = cfg.disp(list[0]);
      const totalQty = list.reduce((s, r) => s + (Number(cfg.qtyOf(r)) || 0), 0);
      const hours = Number(d0.workHours) || 0;
      const incH = stageIncidentOf(cfg.incKey, date);
      const hoursEff = stageEffHours(cfg.incKey, date, hours);
      const cap = hoursEff > 0 ? totalQty / hoursEff : null;         // kg/h
      const rate = x1RateOf(date, cfg.rateKind);                     // định mức tháng
      const eff = (cap != null && rate) ? (cap / rate) * 100 : null; // %
      const effTxt = eff == null
        ? '<em style="color:var(--text-muted);">—</em>'
        : `<strong style="color:${eff >= 100 ? '#16a34a' : eff >= 70 ? '#0f766e' : '#b45309'};">${fmtRatio(eff)}%</strong>`;
      const effTip = eff == null
        ? 'Chưa đủ dữ liệu (thiếu giờ làm, hoặc chưa đặt Định mức công suất cho tháng này)'
        : `Hiệu suất = Công suất thực tế (${fmtKg(cap)} kg/h = ${fmtKg(totalQty)} kg ÷ ${fmtRatio(hoursEff)} giờ${incH > 0 ? ` [đã trừ ${fmtGio(incH)}h sự cố]` : ''}) ÷ Định mức tháng ${Number(String(date).slice(5))} (${fmtKg(rate)} kg/h)`;
      const hcTxt = d0.workHoursHC != null ? fmtRatio(d0.workHoursHC) : '—';
      const tcTxt = d0.workHoursTC != null ? fmtRatio(d0.workHoursTC) : '—';
      const rows0 = (d0.workerRows || []).filter(x => x.name);
      const main = rows0.length
        ? `${escapeHTML(rows0[0].name)}${rows0[0].time ? ` (${escapeHTML(rows0[0].time)})` : ''}` : '';
      const more = rows0.length > 1
        ? `<em class="x2-day-cutters-more" title="Người khác cùng ngày: ${escapeHTML(rows0.slice(1).map(x => `${x.name}${x.time ? ` (${x.time})` : ''}`).join(', '))}">+${rows0.length - 1} người khác</em>` : '';
      const rowsHtml = list.map(r => cfg.rowHtml(r, cfg.disp(r))).join('');
      html += `
        <div class="x2-day-card">
          <div class="x2-day-head">
            <span class="x2-day-date"><i data-lucide="calendar-days"></i> ${formatDateDDMMYY(date)}</span>
            <span class="x2-day-cutters" title="${escapeHTML(cfg.headName)} tự động từ Bảng bố trí Nhân Sự (bộ phận Xưởng 1)"><i data-lucide="users"></i> ${main || `<em style="color:var(--text-muted);">chưa bố trí ${escapeHTML(cfg.headName.toLowerCase())}</em>`}${more}</span>
            <span class="x2-day-hours" title="Tổng giờ làm vị trí này trong ngày (từ tab Nhân Sự), tách giờ hành chính (HC) / tăng ca (TC)">Giờ làm: <span class="x2-hours-hc">${hcTxt}h HC</span><span class="x2-hours-tc">${tcTxt}h TC</span></span>
            <span class="x2-day-cap" title="Công suất thực tế = Tổng KL (${fmtKg(totalQty)} kg) ÷ giờ hiệu dụng (${fmtRatio(hoursEff)} h${incH > 0 ? ` — đã TRỪ ${fmtGio(incH)}h sự cố cho phép` : ''})">Công suất thực tế: <strong>${cap != null ? `${fmtKg(cap)} kg/h` : '—'}</strong></span>
            <span class="x2-day-eff" title="${escapeHTML(effTip)}">Hiệu suất: <strong>${effTxt}</strong></span>
            ${stageIncidentInputHtml(cfg.incKey, date)}
          </div>
          <table class="data-table x2-day-table">
            <thead><tr>${cfg.thead}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }
    box.innerHTML = html;
    initLucide();
  }
  // ═════════════════════════════════════════════════════════════
  // THẺ 1 — CẮT ỐNG (x1-cat-ong-card) · nguồn = lô NL Xưởng 1
  // ═════════════════════════════════════════════════════════════
  // Mỗi lượt = 1 lô Vầu/nứa nhập Xưởng 1 → nhập KL Ống Đạt + KL Loại;
  // KL còn lại TỰ TÍNH = KL đầu vào − đạt − loại (âm = báo lỗi).
  // Lô đã cắt TỰ ẨN khỏi ô chọn (đang sửa lượt cũ vẫn thấy đúng lô đó).
  function x1CatOngMaterialIds() {
    return new Set((state.xuong1CatOngRecords || []).map(r => r.materialId));
  }
  function x1CatOngPendingInputs() {
    const used = x1CatOngMaterialIds();
    return x1MaterialInputs().filter(r => !used.has(r.id));
  }
  // Lượt Cắt Ống còn CHƯA được Sấy Sinh tiêu thụ hết → vẫn hiện ở ô chọn
  function x1CatOngRemainingOf(rec, excludeId) {
    if (!rec) return 0;
    const used = (state.xuong1SaySinhRecords || [])
      .filter(r => r.catOngId === rec.id && r.id !== excludeId)
      .reduce((s, r) => s + (Number(r.qty) || 0), 0);
    return Math.max(0, (Number(rec.klDat) || 0) - used);
  }

  function loadXuong1CatOng() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG1_CAT_ONG);
    if (raw) {
      try { const a = JSON.parse(raw); state.xuong1CatOngRecords = Array.isArray(a) ? a : []; }
      catch (e) { state.xuong1CatOngRecords = []; }
    } else state.xuong1CatOngRecords = [];
  }
  function saveXuong1CatOng() {
    try { localStorage.setItem(STORAGE_KEY_XUONG1_CAT_ONG, JSON.stringify(state.xuong1CatOngRecords || [])); }
    catch (err) { showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error'); }
    logDataChange(['xuong1CatOngRecords']);
    if (state.fileStorage.connected) storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    firePushSync();
  }

  // Số liệu hiển thị của 1 lượt cắt ống (link SỐNG tới nguyên liệu)
  function x1CatOngDisplay(r) {
    const mat = (state.materialRecords || []).find(m => m.id === r.materialId) || null;
    const inputWeight = mat ? materialInputWeightOf(mat) : (Number(r.inputWeight) || 0);
    const klDat  = Number(r.klDat) || 0;
    const klLoai = Number(r.klLoai) || 0;
    const live = x1CatOngAssignmentsOf(r.date || '');
    const hours = live.length ? sumPosHoursSplitX1(live, r.date || '') : null;
    const workHours = hours ? hours.hc + hours.tc : (Number(r.workHours) || 0);
    return {
      date: r.date || '',
      materialType: mat ? (mat.type || '') : (r.materialType || ''),
      supplier: mat ? (mat.supplier || '') : (r.supplier || ''),
      supplierCode: mat ? supplierCodeOf(mat.supplier) : supplierCodeOf(r.supplier || ''),
      inputWeight, klDat, klLoai,
      remain: inputWeight - klDat - klLoai,
      ratio: inputWeight > 0 ? (klDat / inputWeight) * 100 : null,
      note: r.note || '',
      workerRows: x1WorkerRows(r, live),
      workHours,
      workHoursHC: hours ? hours.hc : (r.workHoursHC != null ? Number(r.workHoursHC) : null),
      workHoursTC: hours ? hours.tc : (r.workHoursTC != null ? Number(r.workHoursTC) : null)
    };
  }

  function fillX1CatOngOptions() {
    const sel = document.getElementById('x1-cat-ong-material');
    if (!sel) return;
    const editing = state.x1CatOngEditId
      ? (state.xuong1CatOngRecords || []).find(r => r.id === state.x1CatOngEditId) : null;
    const used = x1CatOngMaterialIds();
    const mats = x1MaterialInputs().filter(r => !used.has(r.id) || (editing && r.id === editing.materialId));
    sel.innerHTML = mats.length
      ? mats.map(r => `<option value="${escapeHTML(r.id)}">${escapeHTML(r.type || 'Vầu/nứa')} · NCC ${escapeHTML(r.supplier || '—')} · ${formatDateDDMMYY(r.date)} · ${fmtKg(materialInputWeightOf(r))} kg</option>`).join('')
      : `<option value="">— Hết lô Vầu/nứa chờ cắt (nhập thêm ở tab Nguyên Liệu · Xưởng 1) —</option>`;
    x1CatOngSyncLinked(true);
  }
  // Đổi lô (hoặc đang sửa): điền sẵn KL Ống Đạt = toàn bộ KL đầu vào
  function x1CatOngSyncLinked(autoFill) {
    const sel = document.getElementById('x1-cat-ong-material');
    const mat = (state.materialRecords || []).find(m => m.id === (sel ? sel.value : '')) || null;
    const w = mat ? materialInputWeightOf(mat) : 0;
    const datEl = document.getElementById('x1-cat-ong-kl-dat');
    if (autoFill && datEl && !datEl.value) datEl.value = w > 0 ? String(Math.round(w)) : '';
    x1CatOngCalc();
  }
  function x1CatOngCalc() {
    const box = document.getElementById('x1-cat-ong-calc');
    if (!box) return;
    const sel = document.getElementById('x1-cat-ong-material');
    const mat = (state.materialRecords || []).find(m => m.id === (sel ? sel.value : '')) || null;
    const inputWeight = mat ? materialInputWeightOf(mat) : 0;
    const val = id => Number((document.getElementById(id) || {}).value) || 0;
    const dat = val('x1-cat-ong-kl-dat'), loai = val('x1-cat-ong-kl-loai');
    const rest = inputWeight - dat - loai;
    const ratio = inputWeight > 0 ? (dat / inputWeight) * 100 : null;
    box.innerHTML = `
      <span>Đầu vào: <strong>${fmtKg(inputWeight)} kg</strong></span>
      <span>Còn lại: <strong style="color:${rest < 0 ? '#dc2626' : 'inherit'};">${fmtKg(rest)} kg</strong></span>
      <span>Tỷ lệ QĐ: <strong style="color:#0f766e;">${ratio == null ? '—' : fmtRatio(ratio) + '%'}</strong></span>`;
  }
  // ─── LƯU LƯỢT CẮT ỐNG ────────────────────────────────────────
  function handleX1CatOngSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x1-cat-ong-material');
    const materialId = sel ? sel.value : '';
    const mat = (state.materialRecords || []).find(m => m.id === materialId) || null;
    if (!mat) { showToast('Chưa chọn lô Vầu/nứa đầu vào của Xưởng 1!', 'error'); return; }
    const dateEl = document.getElementById('x1-cat-ong-date');
    const dateVal = (dateEl && dateEl.value) || '';
    if (!dateVal) { showToast('Ngày cắt ống không được để trống!', 'error'); return; }
    const val = id => Number((document.getElementById(id) || {}).value) || 0;
    const klDat = val('x1-cat-ong-kl-dat'), klLoai = val('x1-cat-ong-kl-loai');
    if (klDat < 0 || klLoai < 0) { showToast('Các khối lượng phải là số không âm!', 'error'); return; }
    const inputWeight = materialInputWeightOf(mat);
    if (klDat + klLoai > inputWeight + 1e-9) {
      showToast('KL Ống Đạt + KL Loại đã vượt KL đầu vào — kiểm tra lại!', 'error'); return;
    }
    const note = (((document.getElementById('x1-cat-ong-note') || {}).value) || '').trim();
    const snap = x1Snapshot(dateVal, x1CatOngAssignmentsOf(dateVal)); // người + giờ Xưởng 1
    const payload = {
      materialId,
      materialType: mat.type || '',
      supplier: mat.supplier || '',
      code: materialCodeOf(mat),
      inputWeight,
      date: dateVal,
      week: materialWeekLabel(dateVal),
      klDat, klLoai,
      worker: snap.names, workTime: snap.timeStr,
      workHours: snap.hours, workHoursHC: snap.hc, workHoursTC: snap.tc,
      note
    };
    if (state.x1CatOngEditId) {
      const rec = (state.xuong1CatOngRecords || []).find(r => r.id === state.x1CatOngEditId);
      if (!rec) { showToast('Không tìm thấy lượt cắt ống cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong1CatOng();
      showToast('Đã cập nhật lượt cắt ống!', 'success');
    } else {
      (state.xuong1CatOngRecords = state.xuong1CatOngRecords || []).push({
        id: 'x1co-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong1CatOng();
      showToast('Đã ghi lượt cắt ống!', 'success');
    }
    resetX1CatOngForm();
    renderX1CatOngCard();
  }

  function editX1CatOng(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong1CatOngRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x1CatOngEditId = id;
    fillX1CatOngOptions();
    const sel = document.getElementById('x1-cat-ong-material');
    if (sel) sel.value = rec.materialId || '';
    const d = document.getElementById('x1-cat-ong-date');
    if (d) d.value = rec.date || '';
    const dat = document.getElementById('x1-cat-ong-kl-dat');
    if (dat) dat.value = (rec.klDat ?? '') === '' ? '' : String(rec.klDat);
    const loai = document.getElementById('x1-cat-ong-kl-loai');
    if (loai) loai.value = (rec.klLoai ?? '') === '' ? '' : String(rec.klLoai);
    const note = document.getElementById('x1-cat-ong-note');
    if (note) note.value = rec.note || '';
    x1CatOngSyncLinked(false);
    syncX1EditBanner('x1-cat-ong');
    document.getElementById('x1-cat-ong-card')?.scrollIntoView({ block: 'nearest' });
  }

  function deleteX1CatOng(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong1CatOngRecords || []).find(r => r.id === id);
    if (!rec) return;
    const linked = (state.xuong1SaySinhRecords || []).filter(r => r.catOngId === id).length;
    const warn = linked ? `\nLưu ý: có ${linked} lượt SẤY SINH đang link lượt cắt này (số liệu sấy sinh vẫn giữ, nhưng mất link nguồn).` : '';
    if (!confirm(`Xóa lượt cắt ống ngày ${formatDateDDMMYY(rec.date)}?${warn}`)) return;
    trackDeleted('xuong1CatOngRecords', id);
    state.xuong1CatOngRecords = (state.xuong1CatOngRecords || []).filter(r => r.id !== id);
    if (state.x1CatOngEditId === id) resetX1CatOngForm();
    saveXuong1CatOng();
    renderX1CatOngCard();
    showToast('Đã xóa lượt cắt ống!', 'success');
  }

  function resetX1CatOngForm() {
    const f = document.getElementById('x1-cat-ong-form');
    if (f) f.reset();
    state.x1CatOngEditId = null;
    fillX1CatOngOptions();
    x1CatOngSyncLinked(true);
    syncX1EditBanner('x1-cat-ong');
  }

  // Banner "Đang sửa" — dùng chung cho 8 thẻ Xưởng 1.
  // Nhận TIỀN TỐ chuỗi ('x1-cat-ong') HOẶC một SPEC của chuỗi X1 (object).
  function syncX1EditBanner(prefixOrSpec) {
    const spec = (prefixOrSpec && typeof prefixOrSpec === 'object') ? prefixOrSpec : null;
    const base = spec ? `x1-${spec.prefix}` : String(prefixOrSpec || '');
    const banner = document.getElementById(base + '-edit-banner');
    if (!banner) return;
    const txt = document.getElementById(base + '-edit-text');
    const editId = spec
      ? state[spec.editKey]
      : state[base === 'x1-cat-ong' ? 'x1CatOngEditId'
        : base === 'x1-say-sinh' ? 'x1SaySinhEditId' : 'x1BocEditId'];
    if (editId) {
      if (txt) txt.textContent = 'Đang sửa 1 lượt — bấm nút Lưu hoặc "Làm Mới Form" để thoát.';
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }
  function renderX1CatOngCard() {
    fillX1CatOngOptions();
    renderX1CatOngStockBar();
    renderX1CatOngStats();
    renderX1CatOngTable();
    syncX1EditBanner('x1-cat-ong');
    updateXuong2CardCounts();
  }

  // Thanh TỒN: lô Vầu/nứa Xưởng 1 CHƯA cắt
  function renderX1CatOngStockBar() {
    const bar = document.getElementById('x1-cat-ong-stock-bar');
    if (!bar) return;
    const pending = x1CatOngPendingInputs();
    const totalW = pending.reduce((s, r) => s + materialInputWeightOf(r), 0);
    bar.innerHTML = pending.length
      ? `<span class="x2-stock-title" title="Tổng khối lượng lô Vầu/nứa nhập Xưởng 1 CHƯA được cắt (chi tiết từng lô ở ô chọn trong form)"><i data-lucide="boxes"></i> Tồn chờ cắt: <strong>${pending.length} lô · ${fmtKg(totalW)} kg</strong></span>`
      : `<span class="x2-stock-title" title="Tất cả lô Vầu/nứa Xưởng 1 đã được cắt"><i data-lucide="check-circle-2"></i> Tồn chờ cắt: <strong>Hết tồn</strong></span>`;
    initLucide();
  }

  function renderX1CatOngStats() {
    const box = document.getElementById('x1-cat-ong-stats');
    if (!box) return;
    const disp = (state.xuong1CatOngRecords || []).map(x1CatOngDisplay);
    const totalIn   = disp.reduce((s, d) => s + d.inputWeight, 0);
    const totalDat  = disp.reduce((s, d) => s + d.klDat, 0);
    const totalLoai = disp.reduce((s, d) => s + Math.max(0, d.klLoai), 0);
    box.innerHTML = `
      <div class="material-stat"><span class="material-stat-value">${disp.length}</span><span class="material-stat-label">Lượt cắt ống</span></div>
      <div class="material-stat"><span class="material-stat-value">${Math.round(totalIn).toLocaleString('vi-VN')}</span><span class="material-stat-label">Tổng KL đầu vào (kg)</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(totalDat)}</span><span class="material-stat-label">Tổng KL ống đạt (kg)</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(totalLoai)}</span><span class="material-stat-label">Tổng KL loại (kg)</span></div>`;
  }

  // Thẻ ngày — dùng chung x1RenderDayCards
  function renderX1CatOngTable() {
    x1RenderDayCards({
      boxId: 'x1-cat-ong-day-cards',
      countId: 'x1-cat-ong-table-count',
      records: state.xuong1CatOngRecords || [],
      disp: x1CatOngDisplay,
      qtyOf: r => Number(r.inputWeight) || 0,   // công suất tính theo KL ĐẦU VÀO
      incKey: 'x1catong',
      rateKind: 'catOng',
      headName: 'Người cắt',
      emptyIcon: 'scissors',
      emptyText: 'Chưa có lượt cắt ống nào.<br>Chọn <strong>lô Vầu/nứa nhập Xưởng 1</strong> ở form trên rồi bấm <strong>Lưu Lượt Cắt Ống</strong>.',
      thead: `<th>Loại nguyên liệu</th><th>Nhà cung cấp</th>
              <th class="text-right">KL đầu vào</th><th class="text-right">KL ống đạt</th>
              <th class="text-right">KL loại</th><th class="text-right">Còn lại</th>
              <th class="text-right">Tỷ lệ QĐ</th><th>Ghi chú</th><th class="text-right">Thao tác</th>`,
      rowHtml: (r, d) => `
        <tr class="x2-day-row">
          <td><strong>${escapeHTML(d.materialType || '—')}</strong></td>
          <td>${escapeHTML(d.supplier || '—')}${d.supplierCode ? ` <span class="x2-nan-code">${escapeHTML(d.supplierCode)}</span>` : ''}</td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(d.inputWeight)}</strong></td>
          <td class="text-right">${fmtKg(d.klDat)}</td>
          <td class="text-right"><strong style="color:#b45309;">${fmtKg(d.klLoai)}</strong></td>
          <td class="text-right">${fmtKg(d.remain)}</td>
          <td class="text-right"><strong style="color:#0f766e;">${d.ratio == null ? '—' : fmtRatio(d.ratio) + '%'}</strong></td>
          <td>${d.note ? `<div class="x2-row-note">${escapeHTML(d.note)}</div>` : '<span style="color:var(--text-muted);">—</span>'}</td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-x1-cat-ong-edit="${escapeHTML(r.id)}" data-perm="x1"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-x1-cat-ong-delete="${escapeHTML(r.id)}" data-perm="x1"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`
    });
  }
  // ═════════════════════════════════════════════════════════════
  // THẺ 2 — SẤY SINH (x1-say-sinh-card) · nguồn = lượt CẮT ỐNG
  // ═════════════════════════════════════════════════════════════
  // Mỗi lượt = 1 lượt Cắt Ống + KL sấy (kg). Lượt Cắt Ống chỉ còn
  // PHẦN CHƯA SẤY mới hiện ở ô chọn (còn 0 → tự ẩn).
  function x1SaySinhSourceOptions() {
    const editing = state.x1SaySinhEditId
      ? (state.xuong1SaySinhRecords || []).find(r => r.id === state.x1SaySinhEditId) : null;
    return (state.xuong1CatOngRecords || [])
      .filter(c => {
        const rest = x1CatOngRemainingOf(c, editing ? editing.id : null);
        return rest > 0 || (editing && c.id === editing.catOngId);
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }
  function x1SaySinhRemainingOf(rec, excludeId) {
    if (!rec) return 0;
    const used = (state.xuong1BocRecords || [])
      .filter(r => r.saySinhId === rec.id && r.id !== excludeId)
      .reduce((s, r) => s + (Number(r.qty) || 0), 0);
    return Math.max(0, (Number(rec.qty) || 0) - used);
  }

  function loadXuong1SaySinh() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG1_SAY_SINH);
    if (raw) {
      try { const a = JSON.parse(raw); state.xuong1SaySinhRecords = Array.isArray(a) ? a : []; }
      catch (e) { state.xuong1SaySinhRecords = []; }
    } else state.xuong1SaySinhRecords = [];
  }
  function saveXuong1SaySinh() {
    try { localStorage.setItem(STORAGE_KEY_XUONG1_SAY_SINH, JSON.stringify(state.xuong1SaySinhRecords || [])); }
    catch (err) { showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error'); }
    logDataChange(['xuong1SaySinhRecords']);
    if (state.fileStorage.connected) storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    firePushSync();
  }

  function x1SaySinhDisplay(r) {
    const src = (state.xuong1CatOngRecords || []).find(c => c.id === r.catOngId) || null;
    const sd = src ? x1CatOngDisplay(src) : null;
    const live = x1SaySinhAssignmentsOf(r.date || '');
    const hours = live.length ? sumPosHoursSplitX1(live, r.date || '') : null;
    return {
      date: r.date || '',
      // Nguồn hiển thị: loại ống · NCC · ngày cắt (mất link → theo snapshot)
      srcType: sd ? sd.materialType : (r.srcType || ''),
      srcSupplier: sd ? sd.supplier : (r.srcSupplier || ''),
      srcDate: src ? src.date : (r.srcDate || ''),
      srcRest: src ? x1CatOngRemainingOf(src, null) : 0,
      qty: Number(r.qty) || 0,
      note: r.note || '',
      workerRows: x1WorkerRows(r, live),
      workHours: hours ? hours.hc + hours.tc : (Number(r.workHours) || 0),
      workHoursHC: hours ? hours.hc : (r.workHoursHC != null ? Number(r.workHoursHC) : null),
      workHoursTC: hours ? hours.tc : (r.workHoursTC != null ? Number(r.workHoursTC) : null)
    };
  }

  function fillX1SaySinhOptions() {
    const sel = document.getElementById('x1-say-sinh-source');
    if (!sel) return;
    const list = x1SaySinhSourceOptions();
    sel.innerHTML = list.length
      ? list.map(c => {
          const d = x1CatOngDisplay(c);
          const rest = x1CatOngRemainingOf(c, state.x1SaySinhEditId || null);
          return `<option value="${escapeHTML(c.id)}">${escapeHTML(d.materialType || 'Vầu/nứa')} · NCC ${escapeHTML(d.supplier || '—')} · cắt ${formatDateDDMMYY(c.date)} · còn ${fmtKg(rest)} kg</option>`;
        }).join('')
      : `<option value="">— Hết lượt Cắt Ống chờ sấy —</option>`;
    x1SaySinhSyncLinked(true);
  }
  function x1SaySinhSyncLinked(autoFill) {
    const sel = document.getElementById('x1-say-sinh-source');
    const src = (state.xuong1CatOngRecords || []).find(c => c.id === (sel ? sel.value : '')) || null;
    const rest = src ? x1CatOngRemainingOf(src, state.x1SaySinhEditId || null) : 0;
    const dateEl = document.getElementById('x1-say-sinh-date');
    if (autoFill && dateEl && !dateEl.value && src && src.date) dateEl.value = src.date;
    const qtyEl = document.getElementById('x1-say-sinh-qty');
    if (autoFill && qtyEl && rest > 0) qtyEl.value = String(Math.round(rest));
    x1SaySinhCalc();
  }
  function x1SaySinhCalc() {
    const box = document.getElementById('x1-say-sinh-calc');
    if (!box) return;
    const sel = document.getElementById('x1-say-sinh-source');
    const src = (state.xuong1CatOngRecords || []).find(c => c.id === (sel ? sel.value : '')) || null;
    const rest = src ? x1CatOngRemainingOf(src, state.x1SaySinhEditId || null) : 0;
    const qty = Number((document.getElementById('x1-say-sinh-qty') || {}).value) || 0;
    const over = qty > rest + 1e-9;
    box.innerHTML = `
      <span>Còn chưa sấy: <strong>${fmtKg(rest)} kg</strong></span>
      <span>Lượt này: <strong style="color:${over ? '#dc2626' : 'inherit'};">${fmtKg(qty)} kg</strong></span>
      <span>Sau lượt: <strong>${fmtKg(Math.max(0, rest - qty))} kg</strong></span>`;
  }
  function handleX1SaySinhSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x1-say-sinh-source');
    const catOngId = sel ? sel.value : '';
    const src = (state.xuong1CatOngRecords || []).find(c => c.id === catOngId) || null;
    if (!src) { showToast('Chưa chọn lượt Cắt Ống làm nguồn!', 'error'); return; }
    const dateEl = document.getElementById('x1-say-sinh-date');
    const dateVal = (dateEl && dateEl.value) || '';
    if (!dateVal) { showToast('Ngày sấy sinh không được để trống!', 'error'); return; }
    const qty = Number((document.getElementById('x1-say-sinh-qty') || {}).value) || 0;
    if (qty <= 0) { showToast('KL sấy phải lớn hơn 0!', 'error'); return; }
    const rest = x1CatOngRemainingOf(src, state.x1SaySinhEditId || null);
    if (qty > rest + 1e-9) {
      showToast(`KL sấy (${fmtKg(qty)} kg) vượt phần còn chưa sấy (${fmtKg(rest)} kg) — kiểm tra lại!`, 'error'); return;
    }
    const sd = x1CatOngDisplay(src);
    const note = (((document.getElementById('x1-say-sinh-note') || {}).value) || '').trim();
    const snap = x1Snapshot(dateVal, x1SaySinhAssignmentsOf(dateVal));
    const payload = {
      catOngId,
      srcType: sd.materialType, srcSupplier: sd.supplier, srcDate: src.date,
      date: dateVal, qty,
      worker: snap.names, workTime: snap.timeStr,
      workHours: snap.hours, workHoursHC: snap.hc, workHoursTC: snap.tc,
      note
    };
    if (state.x1SaySinhEditId) {
      const rec = (state.xuong1SaySinhRecords || []).find(r => r.id === state.x1SaySinhEditId);
      if (!rec) { showToast('Không tìm thấy lượt sấy sinh cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong1SaySinh();
      showToast('Đã cập nhật lượt sấy sinh!', 'success');
    } else {
      (state.xuong1SaySinhRecords = state.xuong1SaySinhRecords || []).push({
        id: 'x1ss-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong1SaySinh();
      showToast('Đã ghi lượt sấy sinh!', 'success');
    }
    resetX1SaySinhForm();
    renderX1SaySinhCard();
  }

  function editX1SaySinh(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong1SaySinhRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x1SaySinhEditId = id;
    fillX1SaySinhOptions();
    const sel = document.getElementById('x1-say-sinh-source');
    if (sel) sel.value = rec.catOngId || '';
    const d = document.getElementById('x1-say-sinh-date');
    if (d) d.value = rec.date || '';
    const q = document.getElementById('x1-say-sinh-qty');
    if (q) q.value = (rec.qty ?? '') === '' ? '' : String(rec.qty);
    const note = document.getElementById('x1-say-sinh-note');
    if (note) note.value = rec.note || '';
    x1SaySinhSyncLinked(false);
    syncX1EditBanner('x1-say-sinh');
    document.getElementById('x1-say-sinh-card')?.scrollIntoView({ block: 'nearest' });
  }

  function deleteX1SaySinh(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong1SaySinhRecords || []).find(r => r.id === id);
    if (!rec) return;
    const linked = (state.xuong1BocRecords || []).filter(r => r.saySinhId === id).length;
    const warn = linked ? `\nLưu ý: có ${linked} lượt BỐC đang link lượt sấy này (số liệu bốc vẫn giữ, nhưng mất link nguồn).` : '';
    if (!confirm(`Xóa lượt sấy sinh ngày ${formatDateDDMMYY(rec.date)}?${warn}`)) return;
    trackDeleted('xuong1SaySinhRecords', id);
    state.xuong1SaySinhRecords = (state.xuong1SaySinhRecords || []).filter(r => r.id !== id);
    if (state.x1SaySinhEditId === id) resetX1SaySinhForm();
    saveXuong1SaySinh();
    renderX1SaySinhCard();
    showToast('Đã xóa lượt sấy sinh!', 'success');
  }

  function resetX1SaySinhForm() {
    const f = document.getElementById('x1-say-sinh-form');
    if (f) f.reset();
    state.x1SaySinhEditId = null;
    fillX1SaySinhOptions();
    syncX1EditBanner('x1-say-sinh');
  }
  function renderX1SaySinhCard() {
    fillX1SaySinhOptions();
    renderX1SaySinhStockBar();
    renderX1SaySinhStats();
    renderX1SaySinhTable();
    syncX1EditBanner('x1-say-sinh');
    updateXuong2CardCounts();
  }
  function renderX1SaySinhStockBar() {
    const bar = document.getElementById('x1-say-sinh-stock-bar');
    if (!bar) return;
    const pend = (state.xuong1CatOngRecords || []).filter(c => x1CatOngRemainingOf(c, null) > 0);
    const totalW = pend.reduce((s, c) => s + x1CatOngRemainingOf(c, null), 0);
    bar.innerHTML = pend.length
      ? `<span class="x2-stock-title" title="Tổng phần ống ĐẠT của các lượt Cắt Ống CHƯA sấy hết"><i data-lucide="boxes"></i> Tồn chờ sấy: <strong>${pend.length} lượt · ${fmtKg(totalW)} kg</strong></span>`
      : `<span class="x2-stock-title"><i data-lucide="check-circle-2"></i> Tồn chờ sấy: <strong>Hết tồn</strong></span>`;
    initLucide();
  }
  function renderX1SaySinhStats() {
    const box = document.getElementById('x1-say-sinh-stats');
    if (!box) return;
    const disp = (state.xuong1SaySinhRecords || []).map(x1SaySinhDisplay);
    const total = disp.reduce((s, d) => s + d.qty, 0);
    const pend = (state.xuong1CatOngRecords || []).reduce((s, c) => s + x1CatOngRemainingOf(c, null), 0);
    box.innerHTML = `
      <div class="material-stat"><span class="material-stat-value">${disp.length}</span><span class="material-stat-label">Lượt sấy sinh</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(total)}</span><span class="material-stat-label">Tổng KL sấy (kg)</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(pend)}</span><span class="material-stat-label">Còn chờ sấy (kg)</span></div>`;
  }
  function renderX1SaySinhTable() {
    x1RenderDayCards({
      boxId: 'x1-say-sinh-day-cards',
      countId: 'x1-say-sinh-table-count',
      records: state.xuong1SaySinhRecords || [],
      disp: x1SaySinhDisplay,
      qtyOf: r => Number(r.qty) || 0,
      incKey: 'x1saysinh',
      rateKind: 'saySinh',
      headName: 'Người sấy',
      emptyIcon: 'flame-kindling',
      emptyText: 'Chưa có lượt sấy sinh nào.<br>Chọn <strong>lượt Cắt Ống</strong> ở form trên rồi bấm <strong>Lưu Lượt Sấy Sinh</strong>.',
      thead: `<th>Nguồn (lượt Cắt Ống)</th><th>Nhà cung cấp</th><th>Ngày cắt</th>
              <th class="text-right">KL sấy</th><th class="text-right">Còn chưa sấy</th>
              <th>Ghi chú</th><th class="text-right">Thao tác</th>`,
      rowHtml: (r, d) => `
        <tr class="x2-day-row">
          <td><strong>${escapeHTML(d.srcType || 'Vầu/nứa')}</strong></td>
          <td>${escapeHTML(d.srcSupplier || '—')}</td>
          <td>${d.srcDate ? formatDateDDMMYY(d.srcDate) : '—'}</td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(d.qty)}</strong></td>
          <td class="text-right">${fmtKg(d.srcRest)}</td>
          <td>${d.note ? `<div class="x2-row-note">${escapeHTML(d.note)}</div>` : '<span style="color:var(--text-muted);">—</span>'}</td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-x1-say-sinh-edit="${escapeHTML(r.id)}" data-perm="x1"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-x1-say-sinh-delete="${escapeHTML(r.id)}" data-perm="x1"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`
    });
  }
  // ═════════════════════════════════════════════════════════════
  // THẺ 3 — BỐC (x1-boc-card) · nguồn = lượt SẤY SINH
  // ═════════════════════════════════════════════════════════════
  function x1BocSourceOptions() {
    const editing = state.x1BocEditId
      ? (state.xuong1BocRecords || []).find(r => r.id === state.x1BocEditId) : null;
    return (state.xuong1SaySinhRecords || [])
      .filter(s => {
        const rest = x1SaySinhRemainingOf(s, editing ? editing.id : null);
        return rest > 0 || (editing && s.id === editing.saySinhId);
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }
  function x1BocPending() {
    return (state.xuong1SaySinhRecords || []).filter(s => x1SaySinhRemainingOf(s, null) > 0);
  }

  function loadXuong1Boc() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG1_BOC);
    if (raw) {
      try { const a = JSON.parse(raw); state.xuong1BocRecords = Array.isArray(a) ? a : []; }
      catch (e) { state.xuong1BocRecords = []; }
    } else state.xuong1BocRecords = [];
  }
  function saveXuong1Boc() {
    try { localStorage.setItem(STORAGE_KEY_XUONG1_BOC, JSON.stringify(state.xuong1BocRecords || [])); }
    catch (err) { showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error'); }
    logDataChange(['xuong1BocRecords']);
    if (state.fileStorage.connected) storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    firePushSync();
  }

  function x1BocDisplay(r) {
    const src = (state.xuong1SaySinhRecords || []).find(s => s.id === r.saySinhId) || null;
    const cd = src ? (state.xuong1CatOngRecords || []).find(c => c.id === src.catOngId) : null;
    const cdisp = cd ? x1CatOngDisplay(cd) : null;
    const live = x1BocAssignmentsOf(r.date || '');
    const hours = live.length ? sumPosHoursSplitX1(live, r.date || '') : null;
    return {
      date: r.date || '',
      srcType: cdisp ? cdisp.materialType : (r.srcType || ''),
      srcSupplier: cdisp ? cdisp.supplier : (r.srcSupplier || ''),
      srcSayDate: src ? src.date : (r.srcSayDate || ''),
      srcRest: src ? x1SaySinhRemainingOf(src, null) : 0,
      qty: Number(r.qty) || 0,
      note: r.note || '',
      workerRows: x1WorkerRows(r, live),
      workHours: hours ? hours.hc + hours.tc : (Number(r.workHours) || 0),
      workHoursHC: hours ? hours.hc : (r.workHoursHC != null ? Number(r.workHoursHC) : null),
      workHoursTC: hours ? hours.tc : (r.workHoursTC != null ? Number(r.workHoursTC) : null)
    };
  }

  function fillX1BocOptions() {
    const sel = document.getElementById('x1-boc-source');
    if (!sel) return;
    const list = x1BocSourceOptions();
    sel.innerHTML = list.length
      ? list.map(s => {
          const ss = (state.xuong1CatOngRecords || []).find(c => c.id === s.catOngId);
          const cd = ss ? x1CatOngDisplay(ss) : null;
          const rest = x1SaySinhRemainingOf(s, state.x1BocEditId || null);
          return `<option value="${escapeHTML(s.id)}">${escapeHTML(cd ? cd.materialType : 'Vầu/nứa')} · sấy ${formatDateDDMMYY(s.date)} · còn ${fmtKg(rest)} kg</option>`;
        }).join('')
      : `<option value="">— Hết lượt Sấy Sinh chờ bốc —</option>`;
    x1BocSyncLinked(true);
  }
  function x1BocSyncLinked(autoFill) {
    const sel = document.getElementById('x1-boc-source');
    const src = (state.xuong1SaySinhRecords || []).find(s => s.id === (sel ? sel.value : '')) || null;
    const rest = src ? x1SaySinhRemainingOf(src, state.x1BocEditId || null) : 0;
    const dateEl = document.getElementById('x1-boc-date');
    if (autoFill && dateEl && !dateEl.value && src && src.date) dateEl.value = src.date;
    const qtyEl = document.getElementById('x1-boc-qty');
    if (autoFill && qtyEl && rest > 0) qtyEl.value = String(Math.round(rest));
    x1BocCalc();
  }
  function x1BocCalc() {
    const box = document.getElementById('x1-boc-calc');
    if (!box) return;
    const sel = document.getElementById('x1-boc-source');
    const src = (state.xuong1SaySinhRecords || []).find(s => s.id === (sel ? sel.value : '')) || null;
    const rest = src ? x1SaySinhRemainingOf(src, state.x1BocEditId || null) : 0;
    const qty = Number((document.getElementById('x1-boc-qty') || {}).value) || 0;
    const over = qty > rest + 1e-9;
    box.innerHTML = `
      <span>Còn chưa bốc: <strong>${fmtKg(rest)} kg</strong></span>
      <span>Lượt này: <strong style="color:${over ? '#dc2626' : 'inherit'};">${fmtKg(qty)} kg</strong></span>
      <span>Sau lượt: <strong>${fmtKg(Math.max(0, rest - qty))} kg</strong></span>`;
  }
  function handleX1BocSubmit(e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x1-boc-source');
    const saySinhId = sel ? sel.value : '';
    const src = (state.xuong1SaySinhRecords || []).find(s => s.id === saySinhId) || null;
    if (!src) { showToast('Chưa chọn lượt Sấy Sinh làm nguồn!', 'error'); return; }
    const dateEl = document.getElementById('x1-boc-date');
    const dateVal = (dateEl && dateEl.value) || '';
    if (!dateVal) { showToast('Ngày bốc không được để trống!', 'error'); return; }
    const qty = Number((document.getElementById('x1-boc-qty') || {}).value) || 0;
    if (qty <= 0) { showToast('KL bốc phải lớn hơn 0!', 'error'); return; }
    const rest = x1SaySinhRemainingOf(src, state.x1BocEditId || null);
    if (qty > rest + 1e-9) {
      showToast(`KL bốc (${fmtKg(qty)} kg) vượt phần còn chưa bốc (${fmtKg(rest)} kg) — kiểm tra lại!`, 'error'); return;
    }
    const catOng = (state.xuong1CatOngRecords || []).find(c => c.id === src.catOngId) || null;
    const cd = catOng ? x1CatOngDisplay(catOng) : null;
    const note = (((document.getElementById('x1-boc-note') || {}).value) || '').trim();
    const snap = x1Snapshot(dateVal, x1BocAssignmentsOf(dateVal));
    const payload = {
      saySinhId,
      srcType: cd ? cd.materialType : '', srcSupplier: cd ? cd.supplier : '', srcSayDate: src.date,
      date: dateVal, qty,
      worker: snap.names, workTime: snap.timeStr,
      workHours: snap.hours, workHoursHC: snap.hc, workHoursTC: snap.tc,
      note
    };
    if (state.x1BocEditId) {
      const rec = (state.xuong1BocRecords || []).find(r => r.id === state.x1BocEditId);
      if (!rec) { showToast('Không tìm thấy lượt bốc cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong1Boc();
      showToast('Đã cập nhật lượt bốc!', 'success');
    } else {
      (state.xuong1BocRecords = state.xuong1BocRecords || []).push({
        id: 'x1boc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong1Boc();
      showToast('Đã ghi lượt bốc!', 'success');
    }
    resetX1BocForm();
    renderX1BocCard();
  }

  function editX1Boc(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong1BocRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x1BocEditId = id;
    fillX1BocOptions();
    const sel = document.getElementById('x1-boc-source');
    if (sel) sel.value = rec.saySinhId || '';
    const d = document.getElementById('x1-boc-date');
    if (d) d.value = rec.date || '';
    const q = document.getElementById('x1-boc-qty');
    if (q) q.value = (rec.qty ?? '') === '' ? '' : String(rec.qty);
    const note = document.getElementById('x1-boc-note');
    if (note) note.value = rec.note || '';
    x1BocSyncLinked(false);
    syncX1EditBanner('x1-boc');
    document.getElementById('x1-boc-card')?.scrollIntoView({ block: 'nearest' });
  }

  function deleteX1Boc(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong1BocRecords || []).find(r => r.id === id);
    if (!rec) return;
    if (!confirm(`Xóa lượt bốc ngày ${formatDateDDMMYY(rec.date)}?`)) return;
    trackDeleted('xuong1BocRecords', id);
    state.xuong1BocRecords = (state.xuong1BocRecords || []).filter(r => r.id !== id);
    if (state.x1BocEditId === id) resetX1BocForm();
    saveXuong1Boc();
    renderX1BocCard();
    showToast('Đã xóa lượt bốc!', 'success');
  }

  function resetX1BocForm() {
    const f = document.getElementById('x1-boc-form');
    if (f) f.reset();
    state.x1BocEditId = null;
    fillX1BocOptions();
    syncX1EditBanner('x1-boc');
  }
  function renderX1BocCard() {
    fillX1BocOptions();
    renderX1BocStockBar();
    renderX1BocStats();
    renderX1BocTable();
    syncX1EditBanner('x1-boc');
    updateXuong2CardCounts();
  }
  function renderX1BocStockBar() {
    const bar = document.getElementById('x1-boc-stock-bar');
    if (!bar) return;
    const pend = x1BocPending();
    const totalW = pend.reduce((s, x) => s + x1SaySinhRemainingOf(x, null), 0);
    bar.innerHTML = pend.length
      ? `<span class="x2-stock-title" title="Tổng phần đã sấy CHƯA bốc"><i data-lucide="boxes"></i> Tồn chờ bốc: <strong>${pend.length} lượt · ${fmtKg(totalW)} kg</strong></span>`
      : `<span class="x2-stock-title"><i data-lucide="check-circle-2"></i> Tồn chờ bốc: <strong>Hết tồn</strong></span>`;
    initLucide();
  }
  function renderX1BocStats() {
    const box = document.getElementById('x1-boc-stats');
    if (!box) return;
    const disp = (state.xuong1BocRecords || []).map(x1BocDisplay);
    const total = disp.reduce((s, d) => s + d.qty, 0);
    const pend = x1BocPending().reduce((s, x) => s + x1SaySinhRemainingOf(x, null), 0);
    box.innerHTML = `
      <div class="material-stat"><span class="material-stat-value">${disp.length}</span><span class="material-stat-label">Lượt bốc</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(total)}</span><span class="material-stat-label">Tổng KL bốc (kg)</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(pend)}</span><span class="material-stat-label">Còn chờ bốc (kg)</span></div>`;
  }
  function renderX1BocTable() {
    x1RenderDayCards({
      boxId: 'x1-boc-day-cards',
      countId: 'x1-boc-table-count',
      records: state.xuong1BocRecords || [],
      disp: x1BocDisplay,
      qtyOf: r => Number(r.qty) || 0,
      incKey: 'x1boc',
      rateKind: 'boc',
      headName: 'Người bốc',
      emptyIcon: 'forklift',
      emptyText: 'Chưa có lượt bốc nào.<br>Chọn <strong>lượt Sấy Sinh</strong> ở form trên rồi bấm <strong>Lưu Lượt Bốc</strong>.',
      thead: `<th>Nguồn (lượt Sấy Sinh)</th><th>Nhà cung cấp</th><th>Ngày sấy</th>
              <th class="text-right">KL bốc</th><th class="text-right">Còn chưa bốc</th>
              <th>Ghi chú</th><th class="text-right">Thao tác</th>`,
      rowHtml: (r, d) => `
        <tr class="x2-day-row">
          <td><strong>${escapeHTML(d.srcType || 'Vầu/nứa')}</strong></td>
          <td>${escapeHTML(d.srcSupplier || '—')}</td>
          <td>${d.srcSayDate ? formatDateDDMMYY(d.srcSayDate) : '—'}</td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(d.qty)}</strong></td>
          <td class="text-right">${fmtKg(d.srcRest)}</td>
          <td>${d.note ? `<div class="x2-row-note">${escapeHTML(d.note)}</div>` : '<span style="color:var(--text-muted);">—</span>'}</td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-x1-boc-edit="${escapeHTML(r.id)}" data-perm="x1"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-x1-boc-delete="${escapeHTML(r.id)}" data-perm="x1"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`
    });
  }

  // ═════════════════════════════════════════════════════════════
  // 5 CÔNG ĐOẠN ĐUÔI — KHUNG THẺ DÙNG CHUNG (Giai đoạn 2 · 05/10/2026)
  // ═════════════════════════════════════════════════════════════
  //   Lọc Ống ← Bốc · Cắt Mắt ← Lọc Ống · Bổ ← Cắt Mắt ·
  //   Phơi Sấy ← Bổ · Lọc Thanh/Bó Xô ← Phơi Sấy
  //
  // Thay vì 5 bộ hàm gần giống nhau, mỗi công đoạn chỉ là 1 SPEC mô tả;
  // các hàm load/save/display/submit/render nhận `spec` và chạy chung.
  //
  // LƯỢT LƯU: { id, date, <srcField>, qtyIn, qtyOk, qtyLoai, srcType,
  //   srcSupplier, srcDate, worker, workTime, workHours, workHoursHC/TC, note }
  //   qtyIn  = khối lượng ĐEM XỬ LÝ trong lượt này (≤ phần CÒN LẠI của nguồn)
  //   qtyOk  = sản lượng ĐẠT sau công đoạn · qtyLoai = phần LOẠI
  //   qtyOk + qtyLoai ≤ qtyIn
  // TỒN của nguồn = sản lượng nguồn − Σ qtyIn các lượt liên kết
  // (đang SỬA 1 lượt → excludeId trả lại phần của chính nó; hết → tự ẩn).
  const X1_CHAIN_SPECS = [
    {
      key: 'locOng', prefix: 'loc-ong', cardId: 'x1-loc-ong-card',
      stateKey: 'xuong1LocOngRecords', storeKey: STORAGE_KEY_XUONG1_LOC_ONG,
      editKey: 'x1LocOngEditId', srcField: 'bocId', idPfx: 'x1lo',
      rateKind: 'locOng', incKey: 'x1locong',
      title: 'Lọc Ống', icon: 'list-filter',
      headName: 'Người lọc', srcName: 'Bốc',
      inLabel: 'KL ống đem lọc', okLabel: 'KL ống đạt', loaiLabel: 'KL loại',
      unitWord: 'ống', statWord: 'Lượt lọc ống',
      srcRecords: () => state.xuong1BocRecords || [],
      srcOutputOf: r => Number(r.qty) || 0,
      posMatch: n => normPosName(n).includes('loc ong'),
      emptyIcon: 'list-filter',
      srcHint: 'Chỉ hiện lượt Bốc còn CHƯA lọc hết'
    },
    {
      key: 'catMat', prefix: 'cat-mat', cardId: 'x1-cat-mat-card',
      stateKey: 'xuong1CatMatRecords', storeKey: STORAGE_KEY_XUONG1_CAT_MAT,
      editKey: 'x1CatMatEditId', srcField: 'locOngId', idPfx: 'x1cm',
      rateKind: 'catMat', incKey: 'x1catmat',
      title: 'Cắt Mắt', icon: 'crop',
      headName: 'Người cắt', srcName: 'Lọc Ống',
      inLabel: 'KL đem cắt', okLabel: 'KL đạt', loaiLabel: 'KL mắt/ống loại',
      unitWord: 'ống', statWord: 'Lượt cắt mắt',
      srcRecords: () => state.xuong1LocOngRecords || [],
      srcOutputOf: r => Number(r.qtyOk) || 0,
      posMatch: n => normPosName(n).includes('cat mat'),
      emptyIcon: 'crop',
      srcHint: 'Chỉ hiện lượt Lọc Ống còn CHƯA cắt mắt hết'
    },
    {
      key: 'bo', prefix: 'bo', cardId: 'x1-bo-card',
      stateKey: 'xuong1BoRecords', storeKey: STORAGE_KEY_XUONG1_BO,
      editKey: 'x1BoEditId', srcField: 'catMatId', idPfx: 'x1bo',
      rateKind: 'bo', incKey: 'x1bo',
      title: 'Bổ', icon: 'split',
      headName: 'Người bổ', srcName: 'Cắt Mắt',
      inLabel: 'KL đem bổ', okLabel: 'KL bổ đạt', loaiLabel: 'KL loại',
      unitWord: 'ống', statWord: 'Lượt bổ',
      srcRecords: () => state.xuong1CatMatRecords || [],
      srcOutputOf: r => Number(r.qtyOk) || 0,
      posMatch: n => { const s = normPosName(n); return s === 'bo' || s.startsWith('bo '); },
      emptyIcon: 'split',
      srcHint: 'Chỉ hiện lượt Cắt Mắt còn CHƯA bổ hết'
    },
    {
      key: 'phoiSay', prefix: 'phoi-say', cardId: 'x1-phoi-say-card',
      stateKey: 'xuong1PhoiSayRecords', storeKey: STORAGE_KEY_XUONG1_PHOI_SAY,
      editKey: 'x1PhoiSayEditId', srcField: 'boId', idPfx: 'x1ps',
      rateKind: 'phoiSay', incKey: 'x1phoisay',
      title: 'Phơi Sấy', icon: 'sun',
      headName: 'Người phơi', srcName: 'Bổ',
      inLabel: 'KL đem phơi', okLabel: 'KL phơi đạt', loaiLabel: 'KL ẩm/mốc loại',
      unitWord: 'nan', statWord: 'Lượt phơi sấy',
      srcRecords: () => state.xuong1BoRecords || [],
      srcOutputOf: r => Number(r.qtyOk) || 0,
      posMatch: n => normPosName(n).includes('phoi say'),
      emptyIcon: 'sun',
      srcHint: 'Chỉ hiện lượt Bổ còn CHƯA phơi hết'
    },
    {
      key: 'locThanh', prefix: 'loc-thanh', cardId: 'x1-loc-thanh-card',
      stateKey: 'xuong1LocThanhRecords', storeKey: STORAGE_KEY_XUONG1_LOC_THANH,
      editKey: 'x1LocThanhEditId', srcField: 'phoiSayId', idPfx: 'x1lt',
      rateKind: 'locThanh', incKey: 'x1locthanh',
      title: 'Lọc Thanh / Bó Xô', icon: 'package-check',
      headName: 'Người lọc', srcName: 'Phơi Sấy',
      inLabel: 'KL đem lọc/bó', okLabel: 'KL thành phẩm', loaiLabel: 'KL loại',
      unitWord: 'thanh', statWord: 'Lượt lọc thanh',
      srcRecords: () => state.xuong1PhoiSayRecords || [],
      srcOutputOf: r => Number(r.qtyOk) || 0,
      posMatch: n => normPosName(n).includes('loc thanh'),
      emptyIcon: 'package-check',
      srcHint: 'Chỉ hiện lượt Phơi Sấy còn CHƯA lọc/bó hết'
    }
  ];
  function x1ChainSpec(cardId) { return X1_CHAIN_SPECS.find(s => s.cardId === cardId) || null; }
  function x1ChainSpecByKey(k) { return X1_CHAIN_SPECS.find(s => s.key === k) || null; }
  // VẼ LẠI THẺ XƯỞNG 1 theo id (dùng cho cả 8 công đoạn) — trả về true nếu có.
  function renderX1CardOf(cardId) {
    if (cardId === 'x1-cat-ong-card') { renderX1CatOngCard(); return true; }
    if (cardId === 'x1-say-sinh-card') { renderX1SaySinhCard(); return true; }
    if (cardId === 'x1-boc-card') { renderX1BocCard(); return true; }
    const spec = x1ChainSpec(cardId);
    if (spec) { renderX1ChainCard(spec); return true; }
    return false;
  }
  // id của các phần tử form — suy ra từ `prefix` để SPEC gọn
  const x1Id = (s, part) => `x1-${s.prefix}-${part}`;

  // Sản lượng NGUỒN: loài nguồn đang là Bốc (chỉ có `qty`) hay chuỗi (có `qtyOk`)
  const x1SrcTypeOf   = r => (r && (r.materialType || r.srcType)) || '';
  const x1SrcSupplierOf = r => (r && (r.supplier || r.srcSupplier)) || '';

  // Phần CÒN LẠI của 1 nguồn (excludeId = lượt ĐANG SỬA → phần đó được trả lại)
  function x1ChainUsedOf(spec, srcId, excludeId) {
    if (!srcId) return 0;
    return (state[spec.stateKey] || [])
      .filter(r => r[spec.srcField] === srcId && r.id !== excludeId)
      .reduce((s, r) => s + (Number(r.qtyIn) || 0), 0);
  }
  function x1ChainRemainingOf(spec, src, excludeId) {
    if (!src) return 0;
    return Math.max(0, (spec.srcOutputOf(src) || 0) - x1ChainUsedOf(spec, src.id, excludeId));
  }
  function x1ChainPending(spec) {
    return (spec.srcRecords() || []).filter(r => x1ChainRemainingOf(spec, r, null) > 0);
  }
  // ─── NẠP / LƯU ──────────────────────────────────────────────────
  function loadX1Chain(spec) {
    const raw = localStorage.getItem(spec.storeKey);
    if (raw) {
      try { const a = JSON.parse(raw); state[spec.stateKey] = Array.isArray(a) ? a : []; }
      catch (e) { state[spec.stateKey] = []; }
    } else state[spec.stateKey] = [];
  }
  function saveX1Chain(spec) {
    try { localStorage.setItem(spec.storeKey, JSON.stringify(state[spec.stateKey] || [])); }
    catch (e) { showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error'); }
    logDataChange([spec.stateKey]);
    if (state.fileStorage.connected) storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    firePushSync();
  }
  // Nạp cả 5 mảng chuỗi X1 lúc boot (gọi từ js/main.js)
  function loadX1ChainAll() { X1_CHAIN_SPECS.forEach(loadX1Chain); }

  // ─── SỐ LIỆU HIỂN THỊ (link SỐNG tới nguồn) ────────────────────
  function x1ChainDisplay(spec, r) {
    const src = (spec.srcRecords() || []).find(s => s.id === r[spec.srcField]) || null;
    const live = hrX1AssignmentsAt(r.date || '', spec.posMatch);
    const hours = live.length ? sumPosHoursSplitX1(live, r.date || '') : null;
    return {
      date: r.date || '',
      // Nguồn: lấy TỪ NGUỒN (sống) nếu vẫn còn, không thì theo snapshot lúc lưu
      srcType: src ? x1SrcTypeOf(src) : (r.srcType || ''),
      srcSupplier: src ? x1SrcSupplierOf(src) : (r.srcSupplier || ''),
      srcDate: src ? (src.date || '') : (r.srcDate || ''),
      srcRest: src ? x1ChainRemainingOf(spec, src, null) : 0,
      qtyIn: Number(r.qtyIn) || 0,
      qtyOk: Number(r.qtyOk) || 0,
      qtyLoai: Number(r.qtyLoai) || 0,
      ratio: (Number(r.qtyIn) || 0) > 0 ? ((Number(r.qtyOk) || 0) / (Number(r.qtyIn) || 0)) * 100 : null,
      note: r.note || '',
      workerRows: x1WorkerRows(r, live),
      workHours: hours ? hours.hc + hours.tc : (Number(r.workHours) || 0),
      workHoursHC: hours ? hours.hc : (r.workHoursHC != null ? Number(r.workHoursHC) : null),
      workHoursTC: hours ? hours.tc : (r.workHoursTC != null ? Number(r.workHoursTC) : null)
    };
  }

  // ─── FORM: đổ nguồn + ô tự tính ─────────────────────────────────
  function fillX1ChainOptions(spec) {
    const sel = document.getElementById(x1Id(spec, 'src'));
    if (!sel) return;
    const editId = state[spec.editKey] || null;
    const list = (spec.srcRecords() || []).filter(s =>
      x1ChainRemainingOf(spec, s, editId) > 0 ||
      (editId && (state[spec.stateKey] || []).some(r => r.id === editId && r[spec.srcField] === s.id)));
    sel.innerHTML = list.length
      ? list.map(s => {
          const rest = x1ChainRemainingOf(spec, s, editId);
          const nm = x1SrcTypeOf(s) || 'Vầu/nứa';
          return `<option value="${escapeHTML(s.id)}">${escapeHTML(nm)} · ${escapeHTML(spec.srcName)} ${formatDateDDMMYY(s.date)} · còn ${fmtKg(rest)} kg</option>`;
        }).join('')
      : `<option value="">— Hết lượt ${escapeHTML(spec.srcName)} chờ ${escapeHTML(spec.title.toLowerCase())} —</option>`;
    // Trình duyệt TỰ chọn option đầu sau khi gán innerHTML — ghi rõ ra đây để
    // đúng hành vi ở cả DOM stub (test Node) lẫn khi người dùng chọn bằng tay.
    if (list.length && !sel.value) sel.value = list[0].id;
    x1ChainSyncLinked(spec, true);
  }
  function x1ChainSyncLinked(spec, autoFill) {
    const sel = document.getElementById(x1Id(spec, 'src'));
    const src = (spec.srcRecords() || []).find(s => s.id === (sel ? sel.value : '')) || null;
    const rest = src ? x1ChainRemainingOf(spec, src, state[spec.editKey] || null) : 0;
    const dateEl = document.getElementById(x1Id(spec, 'date'));
    if (autoFill && dateEl && !dateEl.value && src && src.date) dateEl.value = src.date;
    const inEl = document.getElementById(x1Id(spec, 'in'));
    if (autoFill && inEl && rest > 0) inEl.value = String(Math.round(rest));
    x1ChainCalc(spec);
  }
  function x1ChainCalc(spec) {
    const box = document.getElementById(x1Id(spec, 'calc'));
    if (!box) return;
    const val = id => Number((document.getElementById(id) || {}).value) || 0;
    const qtyIn  = val(x1Id(spec, 'in'));
    const qtyOk  = val(x1Id(spec, 'ok'));
    const qtyLoai = val(x1Id(spec, 'loai'));
    const sel = document.getElementById(x1Id(spec, 'src'));
    const src = (spec.srcRecords() || []).find(s => s.id === (sel ? sel.value : '')) || null;
    const rest = src ? x1ChainRemainingOf(spec, src, state[spec.editKey] || null) : 0;
    const bad = qtyIn > rest + 1e-9 || qtyOk + qtyLoai > qtyIn + 1e-9;
    const ratio = qtyIn > 0 ? (qtyOk / qtyIn) * 100 : null;
    box.innerHTML = `
      <span>Còn lại của nguồn: <strong>${fmtKg(rest)} kg</strong></span>
      <span>Đem xử lý: <strong style="color:${qtyIn > rest + 1e-9 ? '#dc2626' : 'inherit'};">${fmtKg(qtyIn)} kg</strong></span>
      <span>Đạt + Loại: <strong style="color:${qtyOk + qtyLoai > qtyIn + 1e-9 ? '#dc2626' : 'inherit'};">${fmtKg(qtyOk + qtyLoai)} / ${fmtKg(qtyIn)} kg</strong></span>
      <span>Tỷ lệ đạt: <strong style="color:${bad ? '#dc2626' : '#0f766e'};">${ratio == null ? '—' : fmtRatio(ratio) + '%'}</strong></span>`;
  }
  function handleX1ChainSubmit(spec, e) {
    e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById(x1Id(spec, 'src'));
    const srcId = sel ? sel.value : '';
    const src = (spec.srcRecords() || []).find(s => s.id === srcId) || null;
    if (!src) { showToast(`Chưa chọn nguồn (${spec.srcName})!`, 'error'); return; }
    const dateEl = document.getElementById(x1Id(spec, 'date'));
    const dateVal = (dateEl && dateEl.value) || '';
    if (!dateVal) { showToast(`Ngày ${spec.title.toLowerCase()} không được để trống!`, 'error'); return; }
    const val = id => Number((document.getElementById(id) || {}).value) || 0;
    const qtyIn = val(x1Id(spec, 'in')), qtyOk = val(x1Id(spec, 'ok')), qtyLoai = val(x1Id(spec, 'loai'));
    if (qtyIn <= 0) { showToast(`${spec.inLabel} phải lớn hơn 0!`, 'error'); return; }
    if (qtyIn < 0 || qtyOk < 0 || qtyLoai < 0) { showToast('Các khối lượng phải là số không âm!', 'error'); return; }
    if (qtyOk + qtyLoai > qtyIn + 1e-9) {
      showToast(`${spec.okLabel} (${fmtKg(qtyOk)}) + ${spec.loaiLabel} (${fmtKg(qtyLoai)}) vượt ${spec.inLabel} (${fmtKg(qtyIn)}) — kiểm tra lại!`, 'error');
      return;
    }
    const editId = state[spec.editKey] || null;
    const rest = x1ChainRemainingOf(spec, src, editId);
    if (qtyIn > rest + 1e-9) {
      showToast(`${spec.inLabel} (${fmtKg(qtyIn)} kg) vượt phần còn lại của nguồn (${fmtKg(rest)} kg) — kiểm tra lại!`, 'error');
      return;
    }
    const note = ((document.getElementById(x1Id(spec, 'note')) || {}).value || '').trim();
    const snap = x1Snapshot(dateVal, hrX1AssignmentsAt(dateVal, spec.posMatch));
    const payload = {
      [spec.srcField]: srcId,
      date: dateVal, qtyIn, qtyOk, qtyLoai,
      srcType: x1SrcTypeOf(src), srcSupplier: x1SrcSupplierOf(src), srcDate: src.date || '',
      worker: snap.names, workTime: snap.timeStr,
      workHours: snap.hours, workHoursHC: snap.hc, workHoursTC: snap.tc,
      note
    };
    const list = state[spec.stateKey] || (state[spec.stateKey] = []);
    if (editId) {
      const rec = list.find(r => r.id === editId);
      if (!rec) { showToast('Không tìm thấy lượt cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveX1Chain(spec);
      showToast(`Đã cập nhật lượt ${spec.title}!`, 'success');
    } else {
      list.push({
        id: `${spec.idPfx}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveX1Chain(spec);
      showToast(`Đã ghi lượt ${spec.title}!`, 'success');
    }
    resetX1ChainForm(spec);
    renderX1ChainCard(spec);
  }

  function editX1Chain(spec, id) {
    if (!requireEditPermission()) return;
    const rec = (state[spec.stateKey] || []).find(r => r.id === id);
    if (!rec) return;
    state[spec.editKey] = id;
    fillX1ChainOptions(spec);
    const sel = document.getElementById(x1Id(spec, 'src'));
    if (sel) sel.value = rec[spec.srcField] || '';
    const d = document.getElementById(x1Id(spec, 'date'));
    if (d) d.value = rec.date || '';
    [['in', 'qtyIn'], ['ok', 'qtyOk'], ['loai', 'qtyLoai']].forEach(([part, fld]) => {
      const el = document.getElementById(x1Id(spec, part));
      if (el) el.value = (rec[fld] ?? '') === '' ? '' : String(rec[fld]);
    });
    const note = document.getElementById(x1Id(spec, 'note'));
    if (note) note.value = rec.note || '';
    x1ChainSyncLinked(spec, false);
    syncX1EditBanner(spec);
    document.getElementById(spec.cardId)?.scrollIntoView({ block: 'nearest' });
  }

  function deleteX1Chain(spec, id) {
    if (!requireEditPermission()) return;
    const rec = (state[spec.stateKey] || []).find(r => r.id === id);
    if (!rec) return;
    // Cảnh báo nếu công đoạn TIẾP THEO đang link lượt này (mất link nguồn)
    const next = X1_CHAIN_SPECS.find(s => s.srcRecords() && s.srcField && s.srcRecords().length &&
      (state[s.stateKey] || []).some(r => r[s.srcField] === id));
    const warn = next ? `\nLưu ý: có lượt ${next.title} đang link lượt này (số liệu vẫn giữ, nhưng mất link nguồn).` : '';
    if (!confirm(`Xóa lượt ${spec.title} ngày ${formatDateDDMMYY(rec.date)}?${warn}`)) return;
    trackDeleted(spec.stateKey, id);
    state[spec.stateKey] = (state[spec.stateKey] || []).filter(r => r.id !== id);
    if (state[spec.editKey] === id) resetX1ChainForm(spec);
    saveX1Chain(spec);
    renderX1ChainCard(spec);
    showToast(`Đã xóa lượt ${spec.title}!`, 'success');
  }

  function resetX1ChainForm(spec) {
    const f = document.getElementById(x1Id(spec, 'form'));
    if (f) f.reset();
    state[spec.editKey] = null;
    fillX1ChainOptions(spec);
    syncX1EditBanner(spec);
  }
  function renderX1ChainCard(spec) {
    fillX1ChainOptions(spec);
    renderX1ChainStockBar(spec);
    renderX1ChainStats(spec);
    renderX1ChainTable(spec);
    syncX1EditBanner(spec);
    updateXuong2CardCounts();
  }
  function renderX1ChainStockBar(spec) {
    const bar = document.getElementById(x1Id(spec, 'stock-bar'));
    if (!bar) return;
    const pend = x1ChainPending(spec);
    const total = pend.reduce((s, x) => s + x1ChainRemainingOf(spec, x, null), 0);
    bar.innerHTML = pend.length
      ? `<span class="x2-stock-title" title="Tổng phần đã làm ở ${escapeHTML(spec.srcName)} CHƯA làm ${escapeHTML(spec.title.toLowerCase())}"><i data-lucide="boxes"></i> Tồn chờ ${escapeHTML(spec.title.toLowerCase())}: <strong>${pend.length} lượt · ${fmtKg(total)} kg</strong></span>`
      : `<span class="x2-stock-title"><i data-lucide="check-circle-2"></i> Tồn chờ ${escapeHTML(spec.title.toLowerCase())}: <strong>Hết tồn</strong></span>`;
    initLucide();
  }
  function renderX1ChainStats(spec) {
    const box = document.getElementById(x1Id(spec, 'stats'));
    if (!box) return;
    const disp = (state[spec.stateKey] || []).map(r => x1ChainDisplay(spec, r));
    const totalIn = disp.reduce((s, d) => s + d.qtyIn, 0);
    const totalOk = disp.reduce((s, d) => s + d.qtyOk, 0);
    const pend = x1ChainPending(spec).reduce((s, x) => s + x1ChainRemainingOf(spec, x, null), 0);
    const ratio = totalIn > 0 ? (totalOk / totalIn) * 100 : null;
    box.innerHTML = `
      <div class="material-stat"><span class="material-stat-value">${disp.length}</span><span class="material-stat-label">${escapeHTML(spec.statWord)}</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(totalIn)}</span><span class="material-stat-label">Tổng ${escapeHTML(spec.inLabel.toLowerCase())} (kg)</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(totalOk)}</span><span class="material-stat-label">Tổng ${escapeHTML(spec.okLabel.toLowerCase())} (kg)</span></div>
      <div class="material-stat"><span class="material-stat-value">${ratio == null ? '—' : fmtRatio(ratio) + '%'}</span><span class="material-stat-label">Tỷ lệ đạt</span></div>
      <div class="material-stat"><span class="material-stat-value">${fmtKg(pend)}</span><span class="material-stat-label">Còn chờ (kg)</span></div>`;
  }
  function renderX1ChainTable(spec) {
    x1RenderDayCards({
      boxId: x1Id(spec, 'day-cards'),
      countId: x1Id(spec, 'table-count'),
      records: state[spec.stateKey] || [],
      disp: r => x1ChainDisplay(spec, r),
      qtyOf: r => Number(r.qtyIn) || 0,
      incKey: spec.incKey,
      rateKind: spec.rateKind,
      headName: spec.headName,
      emptyIcon: spec.emptyIcon,
      emptyText: `Chưa có lượt ${escapeHTML(spec.title.toLowerCase())} nào.<br>Chọn <strong>${escapeHTML(spec.srcName)}</strong> ở form trên rồi bấm <strong>Lưu Lượt ${escapeHTML(spec.title)}</strong>.`,
      thead: `<th>Nguồn (${escapeHTML(spec.srcName)})</th><th>Nhà cung cấp</th><th>Ngày nguồn</th>
              <th class="text-right">${escapeHTML(spec.inLabel)}</th><th class="text-right">${escapeHTML(spec.okLabel)}</th>
              <th class="text-right">${escapeHTML(spec.loaiLabel)}</th><th class="text-right">Tỷ lệ đạt</th>
              <th>Ghi chú</th><th class="text-right">Thao tác</th>`,
      rowHtml: (r, d) => `
        <tr class="x2-day-row">
          <td><strong>${escapeHTML(d.srcType || 'Vầu/nứa')}</strong></td>
          <td>${escapeHTML(d.srcSupplier || '—')}</td>
          <td>${d.srcDate ? formatDateDDMMYY(d.srcDate) : '—'}</td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(d.qtyIn)}</strong></td>
          <td class="text-right"><strong style="color:#16a34a;">${fmtKg(d.qtyOk)}</strong></td>
          <td class="text-right" style="color:#dc2626;">${fmtKg(d.qtyLoai)}</td>
          <td class="text-right">${d.ratio == null ? '—' : fmtRatio(d.ratio) + '%'}</td>
          <td>${d.note ? `<div class="x2-row-note">${escapeHTML(d.note)}</div>` : '<span style="color:var(--text-muted);">—</span>'}</td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-x1-edit="${escapeHTML(r.id)}" data-x1-card="${escapeHTML(spec.cardId)}" data-perm="x1"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-x1-delete="${escapeHTML(r.id)}" data-x1-card="${escapeHTML(spec.cardId)}" data-perm="x1"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`
    });
  }
  // ─── (X1-CHAIN) HẾT ───

  // ─── CHÍP TRÊN THẺ LAUNCHER (đếm nhanh) ──────────────────────
  function x1CardCountText(cardId) {
    if (cardId === 'x1-cat-ong-card') {
      const pend = x1CatOngPendingInputs();
      if (!pend.length) return 'Hết tồn';
      return `Tồn ${fmtKg(pend.reduce((s, r) => s + materialInputWeightOf(r), 0))} kg`;
    }
    if (cardId === 'x1-say-sinh-card') {
      const pend = (state.xuong1CatOngRecords || []).filter(c => x1CatOngRemainingOf(c, null) > 0);
      if (!pend.length) return 'Hết tồn';
      return `Tồn ${fmtKg(pend.reduce((s, c) => s + x1CatOngRemainingOf(c, null), 0))} kg`;
    }
    if (cardId === 'x1-boc-card') {
      const pend = x1BocPending();
      if (!pend.length) return 'Hết tồn';
      return `Tồn ${fmtKg(pend.reduce((s, x) => s + x1SaySinhRemainingOf(x, null), 0))} kg`;
    }
    // 5 công đoạn đuôi — cùng 1 nhánh (SPEC)
    const spec = x1ChainSpec(cardId);
    if (spec) {
      const pend = x1ChainPending(spec);
      if (!pend.length) return 'Hết tồn';
      return `Tồn ${fmtKg(pend.reduce((s, x) => s + x1ChainRemainingOf(spec, x, null), 0))} kg`;
    }
    return '–';
  }
  // ─── POPUP ĐỊNH MỨC XƯỞNG 1 (1 popup cho cả 8 công đoạn) ──────
  // Mở: openX1RatePopup('catOng'|'saySinh'|'boc'|'locOng'|'catMat'|'bo'|'phoiSay'|'locThanh')
  function openX1RatePopup(kind) {
    if (!requireRatePermission()) return;
    const sel = document.getElementById('x1-rate-kind');
    if (sel) sel.value = X1_RATE_KINDS.some(k => k.id === kind) ? kind : 'catOng';
    renderX1RatePopup();
    document.getElementById('modal-x1-rate')?.classList.add('show');
    initLucide();
  }
  function closeX1RatePopup() {
    document.getElementById('modal-x1-rate')?.classList.remove('show');
  }
  function renderX1RatePopup() {
    const kind = (document.getElementById('x1-rate-kind') || {}).value || 'catOng';
    const srcDates = [
      ...(state.xuong1CatOngRecords || []),
      ...(state.xuong1SaySinhRecords || []),
      ...(state.xuong1BocRecords || [])
    ].map(r => String(r.date || '').slice(0, 7)).filter(Boolean);
    const months = [...new Set([...Object.keys(((state.x1Rates || {})[kind]) || {}), ...srcDates])];
    if (!months.includes(new Date().toISOString().slice(0, 7))) months.push(new Date().toISOString().slice(0, 7));
    const sel = document.getElementById('x1-rate-month');
    if (sel) {
      const cur = sel.value || new Date().toISOString().slice(0, 7);
      const arr = months.filter(Boolean).sort((a, b) => b.localeCompare(a));
      sel.innerHTML = arr.map(m => `<option value="${escapeHTML(m)}">Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}</option>`).join('');
      sel.value = arr.includes(cur) ? cur : (arr[0] || '');
    }
    const month = sel ? sel.value : '';
    const valEl = document.getElementById('x1-rate-value');
    if (valEl) {
      const v = Number((((state.x1Rates || {})[kind]) || {})[month]);
      valEl.value = Number.isFinite(v) && v > 0 ? v : '';
    }
    const chips = document.getElementById('x1-rate-chips');
    if (chips) {
      const dict = (state.x1Rates || {})[kind] || {};
      const keys = Object.keys(dict).filter(k => Number(dict[k]) > 0).sort().reverse();
      chips.innerHTML = keys.length
        ? keys.map(k => `<span class="x2-rate-chip" title="Tháng ${Number(k.slice(5))}/${k.slice(0, 4)} — ${fmtKg(dict[k])} kg/h">${Number(k.slice(5))}/${k.slice(0, 4)}</span>`).join('')
        : '<span style="color:var(--text-muted); font-size:0.75rem;">Chưa đặt định mức tháng nào</span>';
    }
  }
  function handleX1RateSave() {
    if (!requireRatePermission()) return;
    const kind = (document.getElementById('x1-rate-kind') || {}).value || 'catOng';
    const month = (document.getElementById('x1-rate-month') || {}).value || '';
    if (!month) { showToast('Chưa chọn tháng cần đặt định mức!', 'error'); return; }
    const v = Number((document.getElementById('x1-rate-value') || {}).value) || 0;
    if (v <= 0) { showToast('Định mức công suất phải lớn hơn 0 (kg/giờ)!', 'error'); return; }
    state.x1Rates = normalizeX1Rates(state.x1Rates);
    state.x1Rates[kind] = state.x1Rates[kind] || {};
    state.x1Rates[kind][month] = v;
    saveX1Rates();
    renderX1RatePopup();
    if (openX2Card) renderX1CardOf(openX2Card.id);
    showToast(`Đã lưu định mức ${fmtKg(v)} kg/giờ cho tháng ${Number(month.slice(5))}/${month.slice(0, 4)}!`, 'success');
  }
  function handleX1RateReset() {
    if (!requireRatePermission()) return;
    const kind = (document.getElementById('x1-rate-kind') || {}).value || 'catOng';
    const month = (document.getElementById('x1-rate-month') || {}).value || '';
    if (!month) return;
    state.x1Rates = normalizeX1Rates(state.x1Rates);
    state.x1Rates[kind] = state.x1Rates[kind] || {};
    delete state.x1Rates[kind][month];
    saveX1Rates();
    renderX1RatePopup();
    showToast(`Đã xóa định mức tháng ${Number(month.slice(5))}/${month.slice(0, 4)}.`, 'info');
  }
  // ─── (X1) HẾT KHỐI ───

export {
  X2_CARD_DEFS,
  // ── CÔNG TẮC CHUYỂN XƯỞNG (tab Công Đoạn SX) ──
  loadStageWs,
  saveStageWs,
  applyStageWsDom,
  setStageWs,
  toggleStageWs,
  // ── XƯỞNG 1: 8 THẺ CÔNG ĐOẠN + ĐỊNH MỨC ──
  loadXuong1CatOng,
  loadXuong1SaySinh,
  loadXuong1Boc,
  loadX1Rates,
  loadX1ChainAll,
  handleX1CatOngSubmit,
  handleX1SaySinhSubmit,
  handleX1BocSubmit,
  editX1CatOng,
  editX1SaySinh,
  editX1Boc,
  deleteX1CatOng,
  deleteX1SaySinh,
  deleteX1Boc,
  renderX1CatOngCard,
  renderX1SaySinhCard,
  renderX1BocCard,
  resetX1CatOngForm,
  resetX1SaySinhForm,
  resetX1BocForm,
  fillX1CatOngOptions,
  fillX1SaySinhOptions,
  fillX1BocOptions,
  x1CatOngSyncLinked,
  x1SaySinhSyncLinked,
  x1BocSyncLinked,
  x1CatOngCalc,
  x1SaySinhCalc,
  x1BocCalc,
  x1CatOngRemainingOf,
  x1SaySinhRemainingOf,
  x1CardCountText,
  // Hiển thị 1 lượt (dùng cho BẢNG TỔNG HỢP CÔNG SUẤT — js/capacity.js)
  x1CatOngDisplay,
  x1SaySinhDisplay,
  x1BocDisplay,
  // ── 5 CÔNG ĐOẠN ĐUÔI (khung SPEC dùng chung) ──
  X1_CHAIN_SPECS,
  x1ChainSpec,
  x1ChainSpecByKey,
  renderX1CardOf,
  loadX1Chain,
  saveX1Chain,
  x1ChainDisplay,
  x1ChainUsedOf,
  x1ChainRemainingOf,
  x1ChainPending,
  fillX1ChainOptions,
  x1ChainSyncLinked,
  x1ChainCalc,
  handleX1ChainSubmit,
  editX1Chain,
  deleteX1Chain,
  resetX1ChainForm,
  renderX1ChainCard,
  openX1RatePopup,
  closeX1RatePopup,
  renderX1RatePopup,
  handleX1RateSave,
  handleX1RateReset,
  x1RateOf,
  // ── KHO NAN: thẻ launcher + phiếu kho (xuất / tiêu hủy / tái chế) + sổ theo kỳ ──
  loadKhoNotes,
  saveKhoNotes,
  renderX2KhoCard,
  renderX2KhoStockBar,
  renderX2KhoWipBar,
  renderX2KhoStats,
  renderX2KhoPending,
  renderX2KhoLedger,
  renderX2KhoStockTable,
  renderX2KhoLotsList,
  renderX2KhoCalc,
  fillX2KhoSizeSuggestions,
  syncX2KhoNoteTypeRows,
  setKhoNoteType,
  setKhoPeriodMode,
  khoSetShowUsed,
  khoToggleLotsPanel,
  khoOnLotsPanelClick,
  khoOnLotsQtyInput,
  khoSetLotsQuery,
  khoSetLotsQtyQuery,
  khoPickLot,
  khoSetLotQty,
  khoNoteOf,
  khoNoteUsedOf,
  khoNoteSizeRows,
  khoNoteInputPool,
  khoNoteAllocate,
  khoNoteSizeTooltip,
  baoTinhTopOtherStock,
  khoOnPendingClick,
  khoOnWipClick,
  handleKhoNoteSubmit,
  resetX2KhoNoteForm,
  khoEditNote,
  khoDeleteNote,
  khoApproveNote,
  khoRejectNote,
  khoApprovePicked,
  khoPickAllPending,
  toggleX2KhoTable,
  toggleX2KhoStockTable,
  khoBackfillFromLegacy,
  bulligDefectStock,
  nanRejectStock,
  khoLotPickerList,
  khoAvailableForApproval,
  khoLotsOverflow,
  khoApproveCheckError,
  // ── Than Hóa + Sấy: bảng thống kê theo TỪNG LẦN than hóa + thu gọn bảng Kanban ──
  isThanHoaPos,
  hrThanHoaAssignmentsOf,
  loadX2SayRates,
  openX2SayRateModal,
  closeX2SayRateModal,
  renderX2SayRateModal,
  renderX2SayRateChip,
  handleX2SayRateRowSave,
  handleX2SayRateRowReset,
  handleX2SayRateAddMonth,
  handleX2SayRateM3Save,
  syncX2SayRateM3Inputs,
  renderX2SayStats,
  sayChargeRows,
  sayGroupLots,
  sayBuildCharges,
  sayManualTimesOf,
  setSayGroupTimes,
  onSayTimesChange,
  loadX2SayTimes,
  sayIncidentOf,
  setSayIncident,
  onSayIncidentChange,
  loadX2SayIncidents,
  loadX2StageIncidents,
  setStageIncident,
  onStageIncidentChange,
  sayRateEntryOf,
  sayMinutesPerCharge,
  sayM3PerCharge,
  sayTypeKeyOf,
  sayBatchChargeLabel,
  batchVolumeOf,
  batchPassedStage,
  toggleX2KanbanBoard,
  applyX2KanbanCollapsed,
  applyX2SayFrame,
  switchX2SayFrame,
  renderX2KanbanSummary,
  SAY_RATE_DEFAULT,
  // ── Hàm đọc ĐỊNH MỨC công suất theo tháng của từng công đoạn — dùng chung cho
  //    Bảng Tổng Hợp Công Suất & Hiệu Suất (js/capacity.js) để định mức chỉ có
  //    MỘT nguồn chân lý (không đọc lại state.x2*Rates ở nơi khác):
  capRateOf,
  boOngRateOf,
  baoThoRateOf,
  chonNanRateOf,
  baoTinhRateOf,
  bulligRateOf,
  NAN_CLASSES,
  deleteXuong2BaoTho,
  deleteXuong2BoOng,
  deleteXuong2ChonNan,
  deleteXuong2Cut,
  editXuong2BaoTho,
  editXuong2BoOng,
  editXuong2ChonNan,
  nanSay1UseOf,
  onChonNanInlineEdit,
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
  handleX2BaoTinhRateRowSave,
  handleX2BaoTinhRateRowReset,
  handleX2BaoTinhRateAddMonth,
  openX2BaoTinhRateModal,
  closeX2BaoTinhRateModal,
  renderX2BaoTinhRateModal,
  baoTinhRateEntryOf,
  baoTinhRateLabel,
  baoTinhRateMonthsList,
  handleXuong2BaoThoSubmit,
  handleXuong2BoOngSubmit,
  handleXuong2ChonNanSubmit,
  handleXuong2BaoTinhSubmit,
  deleteXuong2BaoTinh,
  deleteXuong2Bullig,
  editXuong2Bullig,
  handleXuong2BulligSubmit,
  handleX2BulligRateSave,
  loadXuong2Bullig,
  loadX2BulligRates,
  renderX2BulligCard,
  renderX2BulligRateBar,
  renderX2BulligTable,
  renderX2BulligCalc,
  renderX2BulligStockBar,
  resetXuong2BulligForm,
  toggleX2BulligTable,
  syncX2BulligKindRows,
  onBulligListClick,
  onBulligGroupInput,
  renderX2BulligGroups,
  renderX2BulligLotList,
  bulligLotSizeText,
  bulligConvertInfo,
  bulligDisplay,
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
  renderX2BaoTinhFilterBar,
  refreshX2BaoTinhPeriodViews,
  setX2BaoTinhFilterMode,
  shiftX2BaoTinhFilter,
  btinhFilterHit,
  renderX2BaoTinhStats,
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
  saveXuong2Bullig,
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
  x2FloatHideAll,
  x2FloatMaybeClose,
  x2FloatRepositionAll,
  onBaoTinhListClick,
  onBaoTinhGroupInput,
  onBaoTinhGroupClick,
  baoTinhAddRow,
  baoTinhOutDrafts,
  baoTinhOutDimsOf,
  renderX2BaoTinhList,
  renderX2BaoTinhGroups,
  // ── BÀO THANH: nguồn đầu vào Ép Ván + LINK "Số lượng đạt" từ tab QC ──
  BAO_THANH_OUT_DEFAULT,
  BAO_THANH_PIECE_MAX_VOL,
  loadX2BaoThanhOutSizes,
  saveX2BaoThanhOutSizes,
  baoThanhOutList,
  baoThanhParseDims,
  baoTinhInputPool,
  baoThanhPressPool,
  baoThanhDefectPool,
  baoThanhIsBulligPress,
  baoTinhSearchNorm,
  baoThanhOutCandidates,
  baoTinhBaoThanhOutCandidatesOk,
  addBaoThanhOutSize,
  baoTinhBaoThanhInItem,
  baoTinhBaoThanhOutItem,
  baoTinhBaoThanhQtyIn,
  setBaoThanhInput,
  setBaoThanhOut,
  toggleBaoThanhInputPicker,
  toggleBaoThanhOutPicker,
  renderBaoThanhInputList,
  renderBaoThanhOutList,
  renderX2BaoThanhForm,
  renderBaoThanhSummaryTable,
  getBaoTinhQcAlloc,
  baoTinhQtyOkOf,
  baoTinhQtyErrOf,
  baoTinhCheckedOf,
  baoTinhPendingOf,
  baoThanhOutSizeQcStats,
  syncX2MiniActive,
  toggleX2BaoThoTable,
  toggleX2BoOngTable,
  toggleX2ChonNanTable,
  toggleX2BaoTinhTable,
  baoTinhLotRemainingOf,
  baoTinhUsedLabel,
    baoTinhUsedUpItems,
  baoTinhDefectStock,
  toggleX2CutTable,
  updateXuong2BaoThoLinked,
  baoThoLotSelectAll,
  baoThoLotSelectNone,
  baoThoPickedIds,
  X2_RATE_POPUPS,
  openX2RatePopup,
  closeX2RatePopup,
  updateXuong2BoOngLinked,
  updateXuong2CardCounts,
  updateXuong2ChonNanLinked,
  updateXuong2BaoTinhLinked,
  updateXuong2CutLinked,
  x2CloseOpenCard,
  x2OpenCard,
  x2PositionDetailOverlay,
  // BỐC LUỒNG (thẻ x2-bo-luong-card — tab Công Đoạn)
  loadXuong2Boluong,
  loadX2BoluongRates,
  handleXuong2BoluongSubmit,
  editXuong2Boluong,
  deleteXuong2Boluong,
  renderXuong2BoluongCard,
  renderXuong2BoluongTable,
  renderXuong2BoluongStats,
  renderX2BoluongStockBar,
  renderX2BoluongRateBar,
  handleX2BoluongRateSave,
  fillXuong2BoluongOptions,
  updateXuong2BoluongLinked,
  resetXuong2BoluongForm,
  syncX2BoluongEditBanner,
  toggleX2BoluongTable,
  boluongRateOf,
  boluongUsedOf,
  boluongRemainingOf,
  boluongPendingInputs,
  boluongMaterialInputs,
  // Số liệu hiển thị của từng vị trí (dùng cho XUẤT EXCEL Xưởng 2 — export-xlsx.js)
  boluongDisplay,
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
