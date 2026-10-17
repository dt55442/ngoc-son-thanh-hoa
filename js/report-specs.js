// ═══════════════════════════════════════════════════════════════
// js/report-specs.js — DANH MỤC BÁO CÁO XUẤT EXCEL (CHỈ KHAI BÁO)
//   • Mỗi báo cáo = 1 mục trong REPORT_SPECS. Thêm công đoạn/thẻ mới
//     chỉ cần thêm 1 mục ở đây (không viết modal/hàm xuất riêng).
//   • `source`  → nguồn dữ liệu của tab Công Đoạn SX (engine js/export-xlsx.js)
//   • `builder` → hàm dựng dữ liệu có sẵn theo tab (planning/materials/qc/hr)
//   • `kind`    → báo cáo dựng trực tiếp trong js/report-center.js
//   • `filters` → các ô lọc cần hiện (engine tự vẽ, không code tay từng báo cáo)
//   KHÔNG import gì ở đây (tránh vòng import) — chỉ dữ liệu thuần.
// ═══════════════════════════════════════════════════════════════

export const REPORT_GROUPS = [
  { id: 'x2',        label: 'Xưởng 2',     short: 'X2' },
  { id: 'x1',        label: 'Xưởng 1',     short: 'X1' },
  { id: 'planning',  label: 'Kế Hoạch',    short: 'KH' },
  { id: 'materials', label: 'Nguyên Liệu', short: 'NL' },
  { id: 'qc',        label: 'QC',          short: 'QC' },
  { id: 'hr',        label: 'Nhân Sự',     short: 'NS' }
];

// 13 thẻ Xưởng 2 — id nguồn PHẢI khớp X2_EXPORT_SOURCES (js/export-xlsx.js)
const X2_REPORTS = [
  { id: 'batch',   label: 'Lô nan (Than Hóa + Sấy)',        cardId: 'x2-than-hoa-card' },
  { id: 'boluong', label: 'Bốc Luồng',                      cardId: 'x2-bo-luong-card' },
  { id: 'cut',     label: 'Nhật ký Cắt / Chọn',             cardId: 'x2-cut-card' },
  { id: 'boong',   label: 'Bổ Ống',                         cardId: 'x2-bo-ong-card' },
  { id: 'baotho',  label: 'Chạy Máy Bào Thô',               cardId: 'x2-bao-tho-card' },
  { id: 'chonnan', label: 'Chọn Nan Thô',                   cardId: 'x2-chon-nan-tho-card' },
  { id: 'baotinh', label: 'Bào Tinh',                       cardId: 'x2-bao-tinh-card' },
  { id: 'bullig',  label: 'Bullig (Gia công + Chọn thanh)', cardId: 'x2-bullig-card' },
  { id: 'catvan',  label: 'Cắt Ván (Cắt ván + Xẻ thanh)',   cardId: 'x2-cat-van-card' },
  { id: 'baovan',  label: 'Bào Ván (Bào + Chà thùng)',      cardId: 'x2-bao-van-card' },
  { id: 'hotro',   label: 'Hỗ Trợ + Công Đoạn Lẻ',          cardId: 'x2-ho-tro-card' },
  { id: 'kho',     label: 'Kho Nan (Tồn · Nhập / Xuất / Phiếu)', cardId: 'x2-kho-card' },
  { id: 'epvan',   label: 'Ép Ván',                         cardId: 'x2-ep-van-card' }
];

// 8 thẻ Xưởng 1 — trước 17/10/2026 bấm xuất bị rơi về 'batch' (SAI vùng dữ liệu)
const X1_REPORTS = [
  { id: 'x1catong',   label: 'Cắt Ống',           cardId: 'x1-cat-ong-card' },
  { id: 'x1saysinh',  label: 'Sấy Sinh',          cardId: 'x1-say-sinh-card' },
  { id: 'x1boc',      label: 'Bốc',               cardId: 'x1-boc-card' },
  { id: 'x1locong',   label: 'Lọc Ống',           cardId: 'x1-loc-ong-card' },
  { id: 'x1catmat',   label: 'Cắt Mắt',           cardId: 'x1-cat-mat-card' },
  { id: 'x1bo',       label: 'Bổ',                cardId: 'x1-bo-card' },
  { id: 'x1phoisay',  label: 'Phơi Sấy',          cardId: 'x1-phoi-say-card' },
  { id: 'x1locthanh', label: 'Lọc Thanh / Bó Xô', cardId: 'x1-loc-thanh-card' }
];

export const REPORT_SPECS = [
  // ── XƯỞNG 2 ───────────────────────────────────────────────────
  ...X2_REPORTS.map(r => ({ ...r, group: 'x2', source: r.id, filters: ['period'], code: `X2_${r.id}` })),
  // ── XƯỞNG 1 ───────────────────────────────────────────────────
  ...X1_REPORTS.map(r => ({ ...r, group: 'x1', source: r.id, filters: ['period'], code: `X1_${r.id}` })),

  // ── KẾ HOẠCH ──────────────────────────────────────────────────
  { id: 'plan-items', group: 'planning', label: 'Kế Hoạch Sản Xuất Theo Tuần',
    builder: 'planning', filters: ['year', 'week', 'planProduct'], code: 'KeHoach_SanXuat' },
  { id: 'plan-rates', group: 'planning', label: 'Định Mức Nguyên Vật Liệu',
    kind: 'planRates', filters: [], code: 'DinhMuc_NguyenVatLieu' },
  { id: 'plan-history', group: 'planning', label: 'Sổ Kế Hoạch Theo Tuần (1 dòng/tuần)',
    kind: 'planHistory', filters: ['period'], code: 'SoKeHoach_Tuan' },

  // ── NGUYÊN LIỆU ───────────────────────────────────────────────
  { id: 'mat-records', group: 'materials', label: 'Nhật Ký Nhập Nguyên Liệu',
    builder: 'materials', filters: ['period', 'matLoc', 'matType', 'matSup'], code: 'NhatKy_NguyenLieu' },
  { id: 'mat-suppliers', group: 'materials', label: 'Bảng Thông Tin Nhà Cung',
    kind: 'suppliers', filters: [], code: 'NhaCungCap' },

  // ── QC ────────────────────────────────────────────────────────
  { id: 'qc-export', group: 'qc', label: 'Bảng Xuất Hàng QC',
    builder: 'qc', filters: ['year', 'week', 'qcProduct'], code: 'QC_XuatHang' },
  { id: 'qc-final', group: 'qc', label: 'Kiểm Sau Sản Xuất',
    kind: 'qcFinal', filters: ['period', 'qcfKind'], code: 'QC_KiemSauSanXuat' },
  { id: 'qc-press', group: 'qc', label: 'Nhật Ký Theo Dõi Ép Ván',
    kind: 'qcPress', filters: ['period', 'verdict'], code: 'QC_NhatKyEpVan' },

  // ── NHÂN SỰ (10 thẻ nhanh — giữ nguyên id cũ) ─────────────────
  { id: 'hr-emp',         group: 'hr', label: 'Nhân Viên — Danh Sách Nhân Viên',     builder: 'hr', filters: ['dept'], code: 'NhanSu_NhanVien' },
  { id: 'hr-timesheet',   group: 'hr', label: 'Bảng Chấm Công Theo Tháng (HC/TC)',   builder: 'hr', filters: ['dept', 'month'], code: 'NhanSu_ChamCongThang' },
  { id: 'hr-att-day',     group: 'hr', label: 'Chấm Công & Phân Vị — Theo Ngày',     builder: 'hr', filters: ['dept', 'date'], code: 'NhanSu_ChamCongNgay' },
  { id: 'hr-att-stats',   group: 'hr', label: 'Thống Kê Đi Làm — Theo Tháng',        builder: 'hr', filters: ['dept', 'month'], code: 'NhanSu_TK_DiLam' },
  { id: 'hr-pos',         group: 'hr', label: 'Vị Trí Làm Việc & Kỹ Năng',           builder: 'hr', filters: ['dept'], code: 'NhanSu_ViTri' },
  { id: 'hr-ci',          group: 'hr', label: 'Giờ Máy Chấm Công',                   builder: 'hr', filters: ['dept'], code: 'NhanSu_GioMay' },
  { id: 'hr-leave',       group: 'hr', label: 'Đơn Xin Nghỉ Phép',                   builder: 'hr', filters: ['dept'], code: 'NhanSu_NghiPhep' },
  { id: 'hr-leave-stats', group: 'hr', label: 'Thống Kê Nghỉ Phép — Theo Nhân Viên', builder: 'hr', filters: ['dept'], code: 'NhanSu_TK_NghiPhep' },
  { id: 'hr-recruit',     group: 'hr', label: 'Nhân Sự Cần — Tuyển Dụng',            builder: 'hr', filters: [], code: 'NhanSu_TuyenDung' },
  { id: 'hr-posneed',     group: 'hr', label: 'Nhân Sự Cần Tại Các Vị Trí',          builder: 'hr', filters: [], code: 'NhanSu_NhanSuCan' }
];

export function reportById(id) {
  return REPORT_SPECS.find(r => r.id === id) || null;
}
export function reportsOfGroup(gid) {
  return REPORT_SPECS.filter(r => r.group === gid);
}
export function groupOfReport(id) {
  const r = reportById(id);
  return r ? REPORT_GROUPS.find(g => g.id === r.group) || null : null;
}
export function reportIdForCard(cardId) {
  const r = REPORT_SPECS.find(x => x.cardId === cardId);
  return r ? r.id : '';
}
export function defaultReportId() {
  return REPORT_SPECS[0].id;
}
