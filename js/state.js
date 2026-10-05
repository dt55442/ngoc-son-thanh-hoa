// ═══════════════════════════════════════════════════════════
// js/state.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
  'use strict';

  // LocalStorage Keys
  const STORAGE_KEY_DATA          = 'bamboo_tracker_data_v3';
  const STORAGE_KEY_USERS         = 'bamboo_tracker_users_v3';
  const STORAGE_KEY_SESSION       = 'bamboo_tracker_session_v3';
  const STORAGE_KEY_CUSTOM_CHARTS = 'bamboo_tracker_custom_charts_v1';
  const STORAGE_KEY_MATERIAL_PLAN = 'bamboo_tracker_material_plan_v1';
  const STORAGE_KEY_MATERIAL_RATES = 'bamboo_tracker_material_rates_v1';
  const STORAGE_KEY_PLANNING_ITEMS = 'bamboo_tracker_planning_items_v1';
  const STORAGE_KEY_PLANNING_FORECAST = 'bamboo_tracker_planning_forecast_v1';
  const STORAGE_KEY_PLANNING_STOCK = 'bamboo_tracker_planning_stock_v1';
  const STORAGE_KEY_PRESS_RECORDS = 'bamboo_tracker_press_records_v1';
  const STORAGE_KEY_PRESS_NOTES = 'bamboo_tracker_press_notes_v1';
  // THẺ GỘP 2 BIỂU ĐỒ DASHBOARD ("Kế Hoạch vs Đã Ép" + "Khả Năng Đáp Ứng Kế
  // Hoạch"): chế độ đang xem — nhớ theo MÁY (thuần UI, không lên mây).
  const STORAGE_KEY_PV_CHART_MODE = 'bamboo_tracker_pv_chart_mode_v1';
  // Bảng TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT (thẻ #capacity-card — tab Tổng Quan):
  // chỉ nhớ TRẠNG THÁI UI theo máy (xưởng đang xem · tuần chọn · tầng đang mở ·
  // thu gọn) — KHÔNG đồng bộ mây/backup, giống STORAGE_KEY_PV_CHART_MODE.
  const STORAGE_KEY_CAPACITY_UI = 'bamboo_tracker_capacity_ui_v1';
  // CÔNG TẮC CHUYỂN XƯỞNG ở tab Công Đoạn SX: 'x1' | 'x2' — xưởng ĐANG XEM.
  // Thuần UI theo MÁY (như STORAGE_KEY_PV_CHART_MODE) — KHÔNG đồng bộ mây/backup.
  const STORAGE_KEY_STAGE_WS = 'bamboo_tracker_stage_ws_v1';
  // ── XƯỞNG 1 — 3 THẺ CÔNG ĐOẠN ĐẦU (04/10/2026) ──────────────
  // Nhật ký công đoạn Xưởng 1 (Vầu/nứa) — cùng mẫu với nhật ký Xưởng 2
  // (localStorage + file + mây + tombstone khi xóa).
  const STORAGE_KEY_XUONG1_CAT_ONG  = 'bamboo_tracker_xuong1_cat_ong_v1';
  const STORAGE_KEY_XUONG1_SAY_SINH = 'bamboo_tracker_xuong1_say_sinh_v1';
  const STORAGE_KEY_XUONG1_BOC      = 'bamboo_tracker_xuong1_boc_v1';
  // 5 công đoạn ĐUÔI của chuỗi Xưởng 1 (Giai đoạn 2 — 05/10/2026):
  //   Lọc Ống ← Bốc · Cắt Mắt ← Lọc Ống · Bổ ← Cắt Mắt ·
  //   Phơi Sấy ← Bổ · Lọc Thanh/Bó Xô ← Phơi Sấy
  const STORAGE_KEY_XUONG1_LOC_ONG    = 'bamboo_tracker_xuong1_loc_ong_v1';
  const STORAGE_KEY_XUONG1_CAT_MAT    = 'bamboo_tracker_xuong1_cat_mat_v1';
  const STORAGE_KEY_XUONG1_BO         = 'bamboo_tracker_xuong1_bo_v1';
  const STORAGE_KEY_XUONG1_PHOI_SAY   = 'bamboo_tracker_xuong1_phoi_say_v1';
  const STORAGE_KEY_XUONG1_LOC_THANH  = 'bamboo_tracker_xuong1_loc_thanh_v1';
  // Định mức công suất Xưởng 1 theo tháng (kg/h) — { <khối>: { 'YYYY-MM': kg/h } }
  // Khối = 8 công đoạn X1: catOng · saySinh · boc · locOng · catMat · bo · phoiSay · locThanh
  const STORAGE_KEY_X1_RATES = 'bamboo_tracker_x1_rates_v1';
  const STORAGE_KEY_MATERIALS = 'bamboo_tracker_material_records_v1';
  // Vị trí công đoạn Xưởng 2 (thẻ launcher ở tab Công Đoạn): nhật ký cắt/chọn.
  // Mỗi lượt cắt/chọn link 1 lượt nhập nguyên liệu đầu vào của Xưởng 2 (tab Nguyên Liệu)
  const STORAGE_KEY_XUONG2_CUTS = 'bamboo_tracker_xuong2_cuts_v1';
  // ĐỊNH MỨC CÔNG SUẤT CẮT (kg/giờ) theo TỪNG THÁNG — dùng tính Hiệu suất
  // của công đoạn Cắt Chọn Xưởng 2 (Hiệu suất = Công suất thực tế ÷ Định mức).
  // { 'YYYY-MM': số kg/h } — VD tháng 9 đặt 3000, tháng 10 đặt 3200.
  const STORAGE_KEY_X2_CAP_RATE = 'bamboo_tracker_x2_capacity_rate_v1';
  // Vị trí "BỐC LUỒNG" Xưởng 2 (thẻ launcher ở tab Công Đoạn): nhật ký bốc luồng —
  // mỗi lượt link 1 LÔ NGUYÊN LIỆU "Luồng cây..." của tab Nguyên Liệu + khối lượng
  // thực tế bốc được (kg). Lô bốc HẾT khối lượng sẽ tự ẩn khỏi ô chọn Đầu vào.
  const STORAGE_KEY_XUONG2_BOLUONG = 'bamboo_tracker_xuong2_boc_luong_v1';
  // ĐỊNH MỨC CÔNG SUẤT BỐC LUỒNG (kg/giờ) theo TỪNG THÁNG — dùng tính Hiệu suất
  // của công đoạn Bốc Luồng Xưởng 2 (Hiệu suất = Công suất thực tế ÷ Định mức).
  // { 'YYYY-MM': số kg/h } — VD tháng 9 đặt 4000, tháng 10 đặt 4200.
  const STORAGE_KEY_X2_BOLUONG_RATE = 'bamboo_tracker_x2_boc_luong_rate_v1';
  // Vị trí "BỔ ỐNG" Xưởng 2 (thẻ launcher ở tab Công Đoạn): nhật ký bổ ống —
  // mỗi lượt bổ link 1 LÔ ỐNG của công đoạn Cắt Chọn (xuong2CutRecords).
  const STORAGE_KEY_XUONG2_BO_ONG = 'bamboo_tracker_xuong2_bo_ong_v1';
  // ĐỊNH MỨC CÔNG SUẤT BỔ ỐNG (kg/giờ) theo TỪNG THÁNG — dùng tính Hiệu suất
  // của công đoạn Bổ Ống (Hiệu suất = Công suất thực tế ÷ Định mức).
  // { 'YYYY-MM': số kg/h } — VD tháng 9 đặt 2500, tháng 10 đặt 2700.
  const STORAGE_KEY_X2_BO_ONG_RATE = 'bamboo_tracker_x2_bo_ong_rate_v1';
  // Vị trí "CHẠY MÁY BÀO THÔ" Xưởng 2: nhật ký chạy máy — mỗi lượt link 1 LÔ ĐÃ
  // BỔ (lượt Bổ Ống) + khai báo loại nan (Dài/Rộng/Dày, mỗi thông tin có thể
  // nhiều giá trị ngăn cách bằng dấu phẩy).
  const STORAGE_KEY_XUONG2_BAO_THO = 'bamboo_tracker_xuong2_bao_tho_v1';
  // ĐỊNH MỨC CÔNG SUẤT BÀO THÔ (thanh/giờ) theo TỪNG THÁNG — { 'YYYY-MM': thanh/h }
  const STORAGE_KEY_X2_BAO_THO_RATE = 'bamboo_tracker_x2_bao_tho_rate_v1';
  // Vị trí "CHỌN NAN THÔ" Xưởng 2: nhật ký chọn nan — mỗi lượt link 1 LÔ ĐÃ BÀO
  // THÔ (để lấy kích thước) + phân loại (A / A1 / B / Loại hẳn) + số lượng thanh.
  // Lượt "nhập ở NGOÀI công đoạn" (loại nan thêm mới, không có trong lô bào thô)
  // được đánh dấu external = true → KHÔNG cộng vào tổng của Chạy Máy Bào Thô.
  const STORAGE_KEY_XUONG2_CHON_NAN = 'bamboo_tracker_xuong2_chon_nan_tho_v1';
  // ĐỊNH MỨC CÔNG SUẤT CHỌN NAN THÔ (thanh/giờ) theo TỪNG THÁNG
  const STORAGE_KEY_X2_CHON_NAN_RATE = 'bamboo_tracker_x2_chon_nan_rate_v1';
  // Vị trí "BÀO TINH" Xưởng 2 (thẻ launcher tab Công Đoạn): nhật ký bào tinh —
  // mỗi lượt ghi Loại bào (Bào tinh / Bào tinh hạ cấp / Bào thanh) + nguồn thanh
  // (lô ở Kho / thanh lỗi của Bào Tinh theo cỡ / tự nhập kích thước + số lượng)
  // + KÍCH THƯỚC SAU BÀO + SL thanh đạt + SL thanh lỗi.
  const STORAGE_KEY_XUONG2_BAO_TINH = 'bamboo_tracker_xuong2_bao_tinh_v1';
  // ĐỊNH MỨC CÔNG SUẤT BÀO TINH (thanh/giờ) theo TỪNG THÁNG — { 'YYYY-MM': thanh/h }
  const STORAGE_KEY_X2_BAO_TINH_RATE = 'bamboo_tracker_x2_bao_tinh_rate_v1';
  // Vị trí "BULLIG" Xưởng 2 (thẻ launcher tab Công Đoạn): 2 công đoạn nhỏ trong 1 thẻ —
  //   • 'giacong' GIA CÔNG: chọn thanh thô từ LÔ Ở KHO có Dùng Cho = Bullig (đã qua Sấy 2),
  //     nhập số lượng x / tổng số thanh đã chọn + kích thước thành phẩm (gợi ý từ lịch sử).
  //   • 'chon' CHỌN THANH: chọn Loại thanh (= kích thước thành phẩm đã gia công)
  //     → SL đạt + SL lỗi → Tổng tự tính = đạt + lỗi.
  const STORAGE_KEY_XUONG2_BULLIG = 'bamboo_tracker_xuong2_bullig_v1';
  // ĐỊNH MỨC CÔNG SUẤT BULLIG (thanh/giờ) THEO TỪNG THÁNG + TỪNG CÔNG ĐOẠN NHỎ —
  // { gc: { 'YYYY-MM': thanh/h }, ct: { 'YYYY-MM': thanh/h } }
  const STORAGE_KEY_X2_BULLIG_RATE = 'bamboo_tracker_x2_bullig_rate_v1';
  // ĐỊNH MỨC THỜI GIAN THAN HÓA (PHÚT/m³) THEO TỪNG THÁNG + TỪNG CÔNG ĐOẠN SẤY
  // của công đoạn "Than Hóa + Sấy" — { s1: { 'YYYY-MM': phút/m³ }, s2: {...} }.
  // Điều kiện than hóa khác nhau theo công đoạn sấy: 1 m³ nan đi Sấy 1 phải trải
  // qua 105 phút than hóa, đi Sấy 2 chỉ 50 phút (nhiều lò than hóa ghép thành 1
  // lô sấy nên tính theo m³, KHÔNG tính theo lô). Điều kiện có thể thay đổi theo
  // thời kỳ nên lưu được riêng từng tháng; chưa khai → mặc định s1 = 105 · s2 = 50.
  // Công suất định mức (m³/giờ) = 60 ÷ phút/m³ — xem js/xuong2.js.
  const STORAGE_KEY_X2_SAY_RATE = 'bamboo_tracker_x2_say_rate_v1';
  // SỐ LẦN THAN HÓA THẬT của từng NHÓM (ngày + công đoạn sấy) — người dùng nhập
  // trên bảng thống kê thẻ "Than Hóa + Sấy": { 'YYYY-MM-DD|say1': 2, ... }.
  // Chưa nhập thì hệ thống TỰ GỘP các lô trong ngày theo định mức m³/lần
  // (mặc định 2 m³/lần: ngày tổng 3 m³ → 2 lần = gần 2 m³ + phần còn lại).
  const STORAGE_KEY_X2_SAY_TIMES = 'bamboo_tracker_x2_say_times_v1';
  // GIỜ SỰ CỐ CHO PHÉP theo từng NGÀY của công đoạn "Than Hóa + Sấy" —
  // { 'YYYY-MM-DD': giờ }. Dùng tính Hiệu suất ngày:
  //   Hiệu suất = Giờ cần ÷ (Giờ thực tế − Giờ sự cố cho phép)
  const STORAGE_KEY_X2_SAY_INCIDENT = 'bamboo_tracker_x2_say_incident_v1';
  // GIỜ SỰ CỐ CHO PHÉP theo (THẺ CÔNG ĐOẠN, NGÀY) — dùng cho MỌI thẻ Xưởng 2
  // còn thiếu (Cắt · Bổ Ống · Bào Thô · Chọn Nan · Bào Tinh · Bullig · Ép Ván):
  //   { '<cardId>|<YYYY-MM-DD>': giờ }  →  Hiệu suất = Công suất ÷ Định mức
  //   với Công suất = Sản lượng ÷ (Giờ thực − Giờ sự cố cho phép)
  const STORAGE_KEY_X2_STAGE_INCIDENT = 'bamboo_tracker_x2_stage_incident_v1';
  // Trạng thái THU GỌN bảng Kanban lô nan của thẻ "Than Hóa + Sấy" ('1' = đang
  // thu gọn: chỉ hiện thanh công cụ + bảng thống kê, ẩn bảng Kanban) — nhớ theo máy.
  const STORAGE_KEY_X2_KANBAN_COLLAPSED = 'bamboo_tracker_x2_kanban_collapsed_v1';
  // KHUNG đang xem của thẻ "Than Hóa + Sấy": 'ctrl' = BẢNG ĐIỀU KHIỂN LÒ SẤY
  // (mặc định — 2 hàng lô icon) | 'data' = BẢNG DỮ LIỆU (thống kê than hóa + Kanban).
  // Thuần UI — nhớ theo máy, KHÔNG đồng bộ mây/backup (giống KANBAN_COLLAPSED).
  const STORAGE_KEY_X2_SAY_FRAME = 'bamboo_tracker_x2_say_frame_v1';
  // ─── KHO NAN (thẻ launcher Xưởng 2 — tab Công Đoạn) ──────────
  // PHIẾU KHO do TỔ TRƯỞNG tạo (người có quyền nhập Tab Công Đoạn), Ban lãnh đạo
  // (Admin / Ban Quản Lý) DUYỆT. 3 loại phiếu trong 1 danh sách, phân biệt bằng `type`:
  //   • 'xuat'     — phiếu XUẤT kho (mục đích: Sấy 2 / Bào Tinh / Bullig / Khác)
  //   • 'tieuhuy'  — phiếu TIÊU HỦY tồn trung gian (thanh lỗi / nan Loại hẳn)
  //   • 'taiche'   — phiếu TÁI CHẾ tồn trung gian (bào lại thành nan đạt ...)
  // CHỈ phiếu 'da_duyet' mới TRỪ TỒN (kho + kế hoạch) — 'cho_duyet' chỉ hiện chip chờ.
  const STORAGE_KEY_KHO_NOTES = 'bamboo_tracker_kho_notes_v1';
  // Công tắc "Hiện lô đã xuất hết" của bảng tồn kho + cột Kanban Kho ('1' = hiện) —
  // mặc định ẨN để tránh hiểu nhầm 1 lô ra/vào kho nhiều lần thành nhiều lô.
  const STORAGE_KEY_KHO_SHOW_USED = 'bamboo_tracker_kho_show_used_v1';
  // ĐỊNH MỨC CÔNG SUẤT ÉP VÁN (m³/giờ) theo TỪNG THÁNG — { 'YYYY-MM': m³/h }.
  // Thẻ Ép Ván (launcher tab Công Đoạn): KHÔNG đặt định mức → thẻ ngày chỉ hiện
  // công suất m³/ngày; CÓ định mức → hiện thêm m³/h (tổng m³ ÷ giờ phân vị "Ép"
  // từ Bảng bố trí Nhân Sự) + Hiệu suất = m³/h ÷ định mức.
  const STORAGE_KEY_X2_EP_VAN_RATE = 'bamboo_tracker_x2_ep_van_rate_v1';
  // DANH SÁCH VỊ TRÍ SẤY KHAI BÁO THÊM (Than Hóa + Sấy): ô "Vị Trí" của modal
  // Thêm Lô Sấy Mới hiện sẵn LS1..LS15, người dùng bấm nút "Thêm" để khai báo
  // vị trí khác (VD: LS16, Lò 01) — mảng chuỗi tên vị trí, xem js/batch-modals.js
  const STORAGE_KEY_X2_LOT_LOCATIONS = 'bamboo_tracker_x2_lot_locations_v1';
  // Bảng "Thông Tin Nhà Cung" (tab Nguyên Liệu): danh mục nhà cung cấp do
  // người dùng khai báo (tên + mã số điền tay); các số liệu (tổng KL, số chuyến,
  // trung bình, tỷ lệ đạt, số lần nhắc nhở, đánh giá) TỰ TÍNH từ materialRecords
  // + xuong2CutRecords (10 chuyến gần nhất) — xem js/suppliers.js
  const STORAGE_KEY_SUPPLIERS = 'bamboo_tracker_suppliers_v1';
  // KÍCH THƯỚC ĐẦU RA của công đoạn 'Bào thanh' (thẻ Bào Tinh — tab Công Đoạn):
  // danh sách cỡ mặc định 640x14x12 · 640x12x10 · 1200x10x10 · 1200x10x8, người
  // dùng bấm nút 'Thêm' trong ô Đầu Ra để khai báo thêm — mảng chuỗi 'Dài×Rộng×Dày'
  const STORAGE_KEY_X2_BAO_THANH_OUT_SIZES = 'bamboo_tracker_x2_bao_thanh_out_sizes_v1';
  const STORAGE_KEY_QC_EXPORTS = 'bamboo_tracker_qc_exports_v1';
  // ĐỘ ẨM LÒ SẤY (tab QC — QC đo & nhập HÀNG NGÀY cho từng lò sấy LS1..LS15):
  // [{ id, date 'YYYY-MM-DD', location 'LS3', value (%), note, by, createdAt, updatedAt }]
  // — nguồn cho cột "Độ ẩm hiện tại" + màu đạt ẩm của BẢNG ĐIỀU KHIỂN LÒ SẤY (js/kiln.js)
  const STORAGE_KEY_QC_KILN_HUMIDITY = 'bamboo_tracker_qc_kiln_humidity_v1';
  // NGƯỠNG độ ẩm ĐẠT theo công đoạn sấy (%): { say1: 15, say2: 12 } — đạt khi
  // độ ẩm ≤ ngưỡng; chỉnh được trong thẻ "Độ Ẩm Lò Sấy" (tab QC)
  const STORAGE_KEY_QC_KILN_THRESHOLD = 'bamboo_tracker_qc_kiln_threshold_v1';
  // KIỂM SAU SẢN XUẤT (thẻ qc-final-card — tab QC): QC kiểm thành phẩm SAU Ép Ván
  // trước khi xuất xưởng. Mỗi lượt kiểm 1 ngày + 1 vị trí (Xưởng 1 / Xưởng 2):
  // [{ id, date 'YYYY-MM-DD', workshop 'x1'|'x2', productId, productName,
  //    inputQty (Đầu vào kiểm), qtyOk (Số lượng đạt), qtyExcept (Ngoại lệ),
  //    qtyReject (Loại = lỗi), note, createdAt, updatedAt }]
  // Đầu vào kiểm Xưởng 2 = chọn trong 2 NHÓM của CẶP 2 TUẦN xuất hàng (tuần lẻ
  // + tuần kế — giống nút "2 tuần" của biểu đồ Kế Hoạch vs Đã Ép): ① VÁN THÔ
  // BTP (lượt ép CHỈ điền "Ván Thô Tạo Ra", không điền thành phẩm) + ② THÀNH
  // PHẨM Ép Ván — ván thô LOẠI theo thể tích < 0,0015 m³ (= thanh BTP),
  // thành phẩm LOẠI theo ĐVT = Thanh. Xưởng 1 "Sắp có" (nhập tay).
  const STORAGE_KEY_QC_FINAL = 'bamboo_tracker_qc_final_v1';
  // ĐỊNH MỨC KIỂM SAU SẢN XUẤT (tấm/giờ) theo TỪNG THÁNG — { 'YYYY-MM': tấm/h }.
  // Có định mức → thẻ ngày hiện thêm tấm/h + Hiệu suất (Công suất ÷ định mức).
  const STORAGE_KEY_QC_FINAL_RATE = 'bamboo_tracker_qc_final_rate_v1';
  // Tab Nhân Sự: nhân viên, đơn nghỉ phép, nhu cầu tuyển dụng
  const STORAGE_KEY_HR_EMPLOYEES  = 'bamboo_tracker_hr_employees_v1';
  const STORAGE_KEY_HR_LEAVES      = 'bamboo_tracker_hr_leaves_v1';
  const STORAGE_KEY_HR_RECRUITMENT = 'bamboo_tracker_hr_recruitment_v1';
  // Bảng trung gian "Nhân sự cần tại các vị trí": số người cần / số người hiện có
  // theo từng vị trí của từng bộ phận — nguồn cho các bảng/chức năng sắp bổ sung
  const STORAGE_KEY_HR_POSNEEDS   = 'bamboo_tracker_hr_posneeds_v1';
  // Bảng điều khiển bố trí vị trí theo ngày: cài đặt ca làm việc theo bộ phận
  // + bản ghi gán người vào vị trí (giờ bắt đầu/kết thúc — nguồn cho chấm công)
  const STORAGE_KEY_HR_SHIFTS     = 'bamboo_tracker_hr_shifts_v1';
  const STORAGE_KEY_HR_ASSIGN     = 'bamboo_tracker_hr_assignments_v1';
  // Chấm công & phân vị theo ngày + danh mục vị trí làm việc
  const STORAGE_KEY_HR_POSITIONS  = 'bamboo_tracker_hr_positions_v1';
  const STORAGE_KEY_HR_ATTENDANCE = 'bamboo_tracker_hr_attendance_v1';
  // Giờ nạp từ máy chấm công (Excel): 1 bản ghi / NV / ngày {in, out, punches}
  const STORAGE_KEY_HR_CHECKINS   = 'bamboo_tracker_hr_checkins_v1';
  // Đăng ký tăng ca: { id, employeeId, date, start, end (giờ DỰ KIẾN), plannedMin,
  // reason, status pending|approved|rejected, approvedBy, approvedAt, createdAt, updatedAt }
  // Giờ tăng ca THỰC TẾ KHÔNG lưu ở đây — tự tính từ Bảng bố trí vị trí theo ngày
  // (hrAssignments) nên luôn khớp giờ thật sau khi sửa/sự cố (js/hr.js overtimeActualMin)
  const STORAGE_KEY_HR_OVERTIMES  = 'bamboo_tracker_hr_overtimes_v1';
  // Lịch làm việc theo tháng (tab Nhân Sự): xác định ngày nghỉ/lễ của từng tháng.
  // { 'YYYY-MM': { weekdaysOff: [0=CN..6=T7] (nghỉ định kỳ theo thứ — MẢNG RỖNG
  //                = không nghỉ định kỳ nào, các ngày đó thành ngày làm việc),
  //                restDays: ['YYYY-MM-DD'...] (nghỉ/lễ riêng của tháng),
  //                workDays: ['YYYY-MM-DD'...] (LÀM BÙ — đi làm bình thường dù
  //                rơi vào thứ nghỉ; ưu tiên hơn weekdaysOff),
  //                updatedAt, updatedBy } }
  // Quy tắc: nếu nhân viên đi làm vào ngày nghỉ/lễ thì TOÀN BỘ giờ làm trong
  // ngày được tính vào TĂNG CA (xem hrSplitHoursHCDate trong js/hr.js).
  const STORAGE_KEY_HR_CALENDAR   = 'bamboo_tracker_hr_calendar_v1';
  // Lịch sử sửa đổi (audit log): ai đã sửa gì, ở tab nào, lúc nào — chỉ Admin xem được
  const STORAGE_KEY_HISTORY = 'bamboo_tracker_history_v1';
  // Dấu vết xóa (tombstone) cho đồng bộ mây: { <tên-danh-sách>: { <id>: <thời điểm xóa ISO> } }
  // Giúp lần XÓA lan truyền qua mọi máy (bản ghi đã xóa không bị máy khác đẩy ngược lên mây) — xem js/tombstone.js
  const STORAGE_KEY_DELETED_IDS = 'bamboo_tracker_deleted_ids_v1';
  // Auto backup cục bộ: ring buffer 10 snapshot gần nhất — xem js/autobackup.js
  const STORAGE_KEY_AUTOBACKUP = 'bamboo_tracker_autobackup_v1';
  // KÊNH ẢNH THUMB (js/photo-sync.js): hàng đợi đẩy ảnh của MÁY NÀY + dấu "đã đẩy".
  // Thuần cục bộ theo máy (như hộp thư đi) — KHÔNG đồng bộ mây/backup.
  const STORAGE_KEY_PHOTO_QUEUE = 'bamboo_tracker_photo_queue_v1';
  const STORAGE_KEY_PHOTO_UPLOADED = 'bamboo_tracker_photo_uploaded_v1';

  const STAGES = {
    say1:     { id: 'say1',     name: '1. Sấy 1',        short: 'Sấy 1',    next: 'say2'     },
    say2:     { id: 'say2',     name: '2. Sấy 2',        short: 'Sấy 2',    next: 'kho'      },
    kho:      { id: 'kho',      name: '3. Kho Lưu Trữ',  short: 'Kho',      next: 'bao_tinh' },
    bao_tinh: { id: 'bao_tinh', name: '4. Bào Tinh',     short: 'Bào Tinh', next: null       }
  };

  const DEFAULT_USERS = [
    { id: 'usr-admin',    username: 'admin',    password: 'admin123', fullname: 'Quản trị',                role: 'admin',   createdAt: '2026-08-01' },
    { id: 'usr-manager1', username: 'quanly1',  password: '123456',   fullname: 'Nguyễn Văn Quản (Ban QL)', role: 'manager', createdAt: '2026-08-03' },
    { id: 'usr-editor1',  username: 'editor1',  password: '123456',   fullname: 'Trần Văn Nam (Kế Toán)',  role: 'editor',  createdAt: '2026-08-05' }
  ];

  let state = {
    currentUser: null,
    users: [],
    batches: [],
    activeView: 'dashboard-view', // Dashboard là màn hình hiển thị ban đầu
    // Xưởng đang xem ở tab Công Đoạn SX ('x1' | 'x2') — nút XƯỞNG 1 / XƯỞNG 2
    stageWs: 'x2',
    activeMobileStage: 'say1', // Điện thoại mặc định xem 1 công đoạn (vuốt ngang / bấm tab để chuyển)
    customCharts: [],
    customChartInstances: {},
    previewChartInstance: null,
    charts: {},
    // Kế hoạch sản xuất
    materialRates: [],
    planningItems: [],
    planningYearFilter: 'all',
    pressNotes: [], // Ghi chú giải trình theo ngày (sản lượng không đáp ứng): [{ id, date, text, createdAt, updatedAt }]
    pressNotesExpanded: false, // Đang hiển thị nội dung TẤT CẢ ghi chú trên biểu đồ ép ván (nút "Hiện Ghi Chú")
    planningPendingScroll: true, // chỉ trượt tới tuần hiện tại khi mới mở tab / reset trang
    planningForecast: {}, // { year: { week: { nanKey: qty } } }
    planningStock: {}, // { year: { week: { glue: qty, additive: qty } } }
    // Sản lượng ép ván
    pressRecords: [],       // [{ id, date, week, year, lines[], productId, fpDim, finishedQty, glue, additive, worker }]
    pressChartInstance: null,
    pressYearFilter: 'all',
    pressWeekFilter: 'all', // 'all' hoặc số tuần (1..53)
    // Nhập nguyên liệu (Lò hơi / Xưởng 1 / Xưởng 2)
    // [{ id, date, week, type, supplier, location, inputIndex, outputIndex, weight, note, images[], createdAt }]
    materialRecords: [],
    // QC — Bảng xuất hàng: [{ id, productId (null = ngoài danh sách kế hoạch), name, week 'Tuần 34', year, qty, note, createdAt, updatedAt }]
    // Tab Nhân Sự
    hrEmployees: [],   // [{ id, code, name, gender, birthDate, phone, idCard, address, department, position, title, joinDate, status, notes, createdAt, updatedAt }]
    hrLeaves: [],      // [{ id, employeeId, type, from, to, days, reason, status pending|approved|rejected, approvedBy, approvedAt, createdAt }]
    hrRecruitment: [], // [{ id, department, position, needQty, hiredQty, needDate, status open|done, notes, createdAt, updatedAt }]
    hrPositionNeeds: [], // BẢNG TRUNG GIAN "Nhân sự cần tại các vị trí": [{ id, department, position, positionId, needQty, haveQty, notes, createdAt, updatedAt }]
    hrShifts: [],      // Cài đặt ca làm việc theo bộ phận: [{ id: dept, type 'hanhchinh'|'lamca', shifts: [{ name, start, end }] }]
    hrAssignments: [], // Bố trí vị trí theo ngày: [{ id, date, department, positionId, shiftIdx, employeeId, start, end, createdAt, updatedAt }]
    hrBoardDate: '',   // ngày đang xem của bảng bố trí ('yyyy-mm-dd')
    hrBoardDept: '',   // bộ phận đang xem của bảng bố trí (mặc định 'Xưởng 2')
    hrPositions: [],   // [{ id, name, department, note, createdAt, updatedAt }] — danh mục vị trí làm việc của xưởng
    hrAttendance: [],  // [{ id, date, employeeId, status 'work'|'absent', positions[], note, createdAt, updatedAt }] — chấm công & phân vị theo ngày (sparse)
    hrAttDate: '',     // ngày đang xem của bảng chấm công ('YYYY-MM-DD')
    hrAttMonth: '',    // tháng đang xem của thống kê đi làm ('YYYY-MM')
    qcKilnThresholds: { say1: 15, say2: 12 }, // đạt khi độ ẩm ≤ ngưỡng của loại sấy
    // ─── KHO NAN: phiếu kho (Tổ trưởng khai → Ban lãnh đạo duyệt) ───
    // [{ id, type 'xuat'|'tieuhuy'|'taiche', date, purpose 'say2'|'baotinh'|'bullig'|'khac',
    //    source 'baotinh_loi'|'bullig_loi'|'nan_loai_han'|'khac', method 'tai_che'|'tieu_huy',
    //    sizeKey, qty, m3, lots [{batchId, qty}], note, status 'cho_duyet'|'da_duyet'|'tu_choi',
    //    createdBy, createdByName, createdAt, approvedBy, approvedByName, approvedAt,
    //    rejectReason, updatedAt }]
    // CHỈ phiếu xuất 'da_duyet' trừ tồn kho & tồn kế hoạch (js/utils.js khoFifoAllocation
    // + js/planning.js getNanStockEvents).
    khoNotes: [],
    khoShowUsed: false,        // công tắc "Hiện lô đã xuất hết" (mặc định ẨN)
    hrCheckins: [],    // [{ id, employeeId, date, in, out, punches, fileName, createdAt, updatedAt }] — giờ máy chấm công đã nạp
    hrOvertimes: [],   // [{ id, employeeId, date, start, end (dự kiến), plannedMin, reason, status, approvedBy, approvedAt, ... }] — đăng ký tăng ca (giờ thực tế tự tính từ hrAssignments)
    // Lịch làm việc theo tháng: { 'YYYY-MM': { weekdaysOff: [0..6], restDays: ['YYYY-MM-DD'...] } }
    // Ngày nghỉ/lễ: đi làm vào ngày đó thì toàn bộ giờ làm được tính vào TĂNG CA (js/hr.js)
    hrWorkCalendar: {},  // không có cấu hình cho tháng nào -> mặc định nghỉ Chủ nhật (wd 0)
    hrCalMonth: '',    // tháng đang xem/cài đặt trong modal Lịch Làm Việc ('YYYY-MM')
    qcExports: [],
    // ĐỘ ẨM LÒ SẤY (QC nhập hàng ngày) + NGƯỠNG độ ẩm đạt theo công đoạn sấy
    qcKilnReadings: [],                   // [{ id, date, location, value, note, by, createdAt, updatedAt }]
    qcKilnThresholds: { say1: 15, say2: 12 }, // đạt khi độ ẩm ≤ ngưỡng của loại sấy
    // KIỂM SAU SẢN XUẤT (thẻ qc-final-card — tab QC) + định mức kiểm theo tháng
    qcFinalRecords: [],       // [{ id, date, workshop, productId, productName, inputQty, qtyOk, qtyExcept, qtyReject, note, createdAt, updatedAt }]
    qcFinalRates: {},         // { 'YYYY-MM': tấm/h }
    // Bộ lọc hợp nhất trong thẻ Xuất Hàng (tab QC): năm ('all' = tất cả) +
    // chips tuần (mảng rỗng = tất cả) + từ khóa tìm kiếm theo tên sản phẩm
    qcSumYear: 'all',
    qcSumWeeks: [],
    qcSearchQ: '',
    x2CutEditId: null,        // id lượt cắt/chọn đang sửa trong form (null = ghi mới)
    // Thông Tin Nhà Cung (tab Nguyên Liệu): [{ id, name, code, createdAt, updatedAt }]
    suppliers: [],
    supplierEditId: null,     // id nhà cung cấp đang sửa trong modal (null = thêm mới)
    // Định mức công suất cắt theo tháng (Cắt Chọn Xưởng 2): { 'YYYY-MM': kg/h }
    x2CapRates: {},
    materialActiveLoc: 'all', // 'all' | 'lo-hoi' | 'xuong-1' | 'xuong-2'
    materialLightbox: null,   // { recordId, index } đang mở trong lightbox
    // Vị trí công đoạn Xưởng 2 (thẻ launcher tab Công Đoạn):
    // nhật ký cắt/chọn — mỗi bản ghi link 1 lượt nhập nguyên liệu Xưởng 2
    xuong2CutRecords: [],
    x2CutEditId: null,        // id lượt cắt/chọn đang sửa trong form (null = ghi mới)
    // Nhật ký BỐC LUỒNG (vị trí Bốc Luồng — Xưởng 2): mỗi lượt link 1 lô nguyên
    // liệu "Luồng cây..." + khối lượng thực tế bốc được (kg)
    xuong2BoluongRecords: [],
    x2BoluongEditId: null,    // id lượt bốc luồng đang sửa trong form (null = ghi mới)
    // Định mức công suất bốc luồng theo tháng (Bốc Luồng — Xưởng 2): { 'YYYY-MM': kg/h }
    x2BoluongRates: {},
    // Nhật ký bổ ống (vị trí Bổ Ống — Xưởng 2): mỗi lượt link 1 lô ống của Cắt Chọn
    xuong2BoOngRecords: [],
    x2BoOngEditId: null,      // id lượt bổ ống đang sửa trong form (null = ghi mới)
    // Định mức công suất bổ ống theo tháng (Bổ Ống — Xưởng 2): { 'YYYY-MM': kg/h }
    x2BoOngRates: {},
    // Nhật ký chạy máy bào thô (vị trí Chạy Máy Bào Thô — Xưởng 2): mỗi lượt
    // link 1 lô đã bổ + loại nan (Dài/Rộng/Dày — mỗi ô có thể nhiều giá trị)
    xuong2BaoThoRecords: [],
    x2BaoThoEditId: null,     // id lượt chạy máy đang sửa trong form (null = ghi mới)
    // Các lô ĐÃ BỔ đang CHỌN trong form Bào Thô (CHỌN NHIỀU được — 1 lượt chạy
    // có thể gộp nhiều lô; số liệu cộng tổng, NCC gộp "NCC A + NCC B")
    x2BaoThoPicked: [],
    // Giờ SỰ CỐ CHO PHÉP theo (thẻ công đoạn, ngày) — trừ khi tính HIỆU SUẤT:
    // { '<cardId>|<YYYY-MM-DD>': giờ } · cardId ∈ boluong/cut/boong/baotho/
    // chonnan/baotinh/bullig/epvan (Than Hóa + Sấy đã có key riêng x2SayIncidents)
    x2StageIncidents: {},
    // Định mức công suất bào thô theo tháng (thanh/giờ): { 'YYYY-MM': thanh/h }
    x2BaoThoRates: {},
    // Nhật ký chọn nan thô (vị trí Chọn Nan Thô — Xưởng 2): mỗi lượt link 1 lô
    // đã bào thô + kích thước + phân loại + số lượng (thanh)
    xuong2ChonNanThoRecords: [],
    x2ChonNanEditId: null,    // id lượt chọn nan đang sửa trong form (null = ghi mới)
    // Định mức công suất chọn nan thô theo tháng (thanh/giờ)
    x2ChonNanRates: {},
    // Nhật ký BÀO TINH (vị trí Bào Tinh — Xưởng 2): mỗi lượt ghi Loại bào
    // (Bào tinh / Bào tinh hạ cấp / Bào thanh) + nguồn thanh + kích thước sau bào
    // + SL thanh đạt + SL thanh lỗi (thanh lỗi gom theo cỡ để HẠ CẤP lại).
    xuong2BaoTinhRecords: [],
    x2BaoTinhEditId: null,    // id lượt bào tinh đang sửa trong form (null = ghi mới)
    // Định mức công suất bào tinh theo tháng (thanh/giờ): { 'YYYY-MM': thanh/h }
    x2BaoTinhRates: {},
    // Nhật ký BULLIG (vị trí Bullig — Xưởng 2): 2 công đoạn nhỏ — 'giacong' (Gia công:
    // chọn thanh thô từ lô ở Kho Dùng Cho = Bullig, SL x/tổng đã chọn + k.thước thành
    // phẩm) và 'chon' (Chọn thanh: Loại thanh + SL đạt + SL lỗi).
    xuong2BulligRecords: [],
    x2BulligEditId: null,     // id lượt Bullig đang sửa trong form (null = ghi mới)
    x2BulligPicked: [],       // id các lô Bullig ở Kho đang CHỌN trong form (chọn nhiều)
    x2BulligLotOpen: false,   // danh sách THẺ LÔ Bullig đang mở trong form (nút Mở danh sách)
    // Định mức công suất Bullig theo tháng + từng công đoạn nhỏ (thanh/giờ):
    // { gc: { 'YYYY-MM': thanh/h }, ct: { 'YYYY-MM': thanh/h } }
    x2BulligRates: { gc: {}, ct: {} },
    // Định mức THỜI GIAN THAN HÓA (phút cho 1 m³) theo tháng + công đoạn sấy của
    // thẻ "Than Hóa + Sấy": { s1: { 'YYYY-MM': phút/m³ }, s2: { 'YYYY-MM': phút/m³ } }
    // — nguồn tính cột "Giờ Cần" + định mức công suất m³/h của bảng thống kê sấy.
    x2SayRates: { s1: {}, s2: {} },
    // Số lần than hóa THẬT của từng NHÓM (ngày + công đoạn sấy) — nhập trên bảng
    // thống kê thẻ Than Hóa + Sấy: { 'YYYY-MM-DD|say1': n, 'YYYY-MM-DD|say2': n }
    x2SayTimes: {},
    // Giờ SỰ CỐ CHO PHÉP theo từng ngày (Than Hóa + Sấy): { 'YYYY-MM-DD': giờ } —
    // nguồn tính Hiệu suất ngày = Giờ cần ÷ (Giờ thực tế − Giờ sự cố cho phép).
    x2SayIncidents: {},
    // Định mức công suất ÉP VÁN theo tháng (m³/giờ): { 'YYYY-MM': m³/h } —
    // không đặt thì thẻ ngày Ép Ván chỉ hiện công suất m³/ngày.
    x2EpVanRates: {},
    // ═══ XƯỞNG 1 — 8 CÔNG ĐOẠN (04–05/10/2026) ═══════════════
    // Chuỗi: Cắt Ống → Sấy Sinh → Bốc → Lọc Ống → Cắt Mắt → Bổ →
    //        Phơi Sấy → Lọc Thanh/Bó Xô
    // Mỗi mảng 1 công đoạn; id lượt đang sửa = <khối>EditId (null = ghi mới).
    xuong1CatOngRecords: [],    x1CatOngEditId: null,     // Cắt Ống ← lô NL X1
    xuong1SaySinhRecords: [],   x1SaySinhEditId: null,    // Sấy Sinh ← Cắt Ống
    xuong1BocRecords: [],       x1BocEditId: null,        // Bốc ← Sấy Sinh
    xuong1LocOngRecords: [],    x1LocOngEditId: null,     // Lọc Ống ← Bốc
    xuong1CatMatRecords: [],    x1CatMatEditId: null,     // Cắt Mắt ← Lọc Ống
    xuong1BoRecords: [],        x1BoEditId: null,         // Bổ ← Cắt Mắt
    xuong1PhoiSayRecords: [],   x1PhoiSayEditId: null,    // Phơi Sấy ← Bổ
    xuong1LocThanhRecords: [],  x1LocThanhEditId: null,   // Lọc Thanh/Bó Xô ← Phơi Sấy
    // Định mức công suất Xưởng 1 theo tháng — { <8 khối>: { 'YYYY-MM': kg/h } }
    // Khối: catOng · saySinh · boc · locOng · catMat · bo · phoiSay · locThanh
    x1Rates: { catOng: {}, saySinh: {}, boc: {}, locOng: {}, catMat: {}, bo: {}, phoiSay: {}, locThanh: {} },
    // Thẻ Xưởng 2 đang mở ở tab Công Đoạn (id thẻ, null = không mở thẻ nào) —
    // dùng cho nút Lịch Sử / Xuất Excel dùng chung + gợi ý của Trợ Lý AI.
    x2OpenCardId: null,
    // ── CHẾ ĐỘ XÓA NHIỀU LÔ (thẻ Than Hóa + Sấy — CHỈ Admin) ───────
    // Trạng thái UI TẠM: KHÔNG có STORAGE_KEY riêng, KHÔNG đồng bộ mây/backup
    // (giống x2BulligPicked) — bật/tắt bằng nút "Xóa Nhiều" trên thanh công cụ.
    kanbanPickMode: false,   // đang bật chế độ tích chọn nhiều lô để xóa
    kanbanPicked: [],        // id các lô đang được tích chọn
    // Vị trí sấy khai báo THÊM ngoài LS1..LS15 (nút "Thêm" ở ô Vị Trí của modal
    // Thêm Lô Sấy Mới) — VD ['LS16', 'Lò 01']. Dùng để dựng danh sách vị trí.
    x2LotLocations: [],
    // Cỡ ĐẦU RA của 'Bào thanh' khai báo THÊM ngoài 4 cỡ mặc định
    // (BÀO_THANH_OUT_DEFAULT trong js/xuong2.js) — VD ['640x16x10']
    x2BaoThanhOutSizes: [],
    materialKpiPeriod: 'all', // 'all' | 'week' | 'month' | 'year' — bộ lọc thời gian thẻ KPI
    materialEditId: null,     // id bản ghi đang sửa trong modal (null = thêm mới)
    materialFormImages: [],   // ảnh (dataURL) đang có trong form
    // KÊNH ẢNH THUMB (js/photo-sync.js) — hàng đợi đẩy ảnh + dấu đã đẩy (theo MÁY).
    // { pending: { id: ts }, deleted: { id: ts } } · photoUploaded: { id: ts }
    photoQueue: { pending: {}, deleted: {} },
    photoUploaded: {},
    // Kế hoạch nguyên liệu cần nhập (bảng phụ tab Nguyên liệu)
    // { '2026-W36': { 'lo-hoi': 12, 'xuong-1': 30, 'xuong-2': 25 } }
    // Giá trị nhập = SỐ TRUNG BÌNH MỖI NGÀY trong tuần; tổng tuần = TB/ngày × 7
    materialPlan: {},
    materialPlanYear: '',     // năm đang chọn trong bộ lọc của bảng kế hoạch nguyên liệu
    materialPlanChartWeek: '',      // tuần đang xem của biểu đồ Kế hoạch vs Thực tế ('2026-W36')
    materialPlanChartInstance: null, // instance Chart.js của biểu đồ kế hoạch vs thực tế
    // Biểu đồ tĩnh Kế Hoạch vs Đã Ép (Dashboard)
    pvChartMode: 'plan',        // THẺ GỘP 2 BIỂU ĐỒ: 'plan' = Kế Hoạch vs Đã Ép | 'cap' = Khả Năng Đáp Ứng Kế Hoạch
    planVsPressUnit: 'vol',     // 'vol' = m³ (mặc định) | 'qty' = Số lượng — chỉ đổi SỐ hiển thị, chiều cao cột luôn theo m³
    planVsPressYear: 'current', // 'current' = năm hiện tại | 'all' | năm cụ thể (VD '2026')
    planVsPressWeek: 'current', // 'current' = tuần hiện tại | 'all' | số tuần (1..53)
    planVsPressSpan: 1,         // 1 = hiển thị 1 tuần (mặc định) | 2 = gộp 2 tuần (tuần chọn + tuần kế tiếp) — theo tần suất xuất hàng 1 hoặc 2 tuần/lần
    planVsPressTotal: false,    // true = nút Total: gộp toàn bộ sản phẩm theo nhóm tên (Bullig / Ván) thay vì từng mã hàng
    planVsPressInstance: null,
    planCapacityInstance: null,
    planCapYear: 'current',     // 'current' = năm hiện tại | năm cụ thể (VD '2026') — RIÊNG của biểu đồ khả năng đáp ứng
    planCapStartIdx: null,      // vị trí tuần bắt đầu cửa sổ trong khoảng tuần liên tục (mỗi bước ◀/▶ = 1 tuần, cửa sổ tối đa 2 tuần; null = mặc định tuần hiện tại)
    // Bộ lọc cột Kanban (multi-select) — CỘT BÀO TINH ĐÃ XÓA (số liệu ở thẻ Bào Tinh)
    // Mỗi stage: { dates: [], locations: [], dimensions: [], quantities: [] }
    columnFilters: {
      say1:     { dates: [], locations: [], dimensions: [], quantities: [] },
      say2:     { dates: [], locations: [], dimensions: [], quantities: [] },
      kho:      { dates: [], locations: [], dimensions: [], quantities: [] }
    },
    // Lịch sử thao tác để hoàn tác (undo) khi nhập sai
    undoStack: [],
    // Dấu vết xóa (tombstone) cho đồng bộ mây: { <danh-sách>: { <id>: <thời điểm xóa ISO> } }
    // Xem js/tombstone.js — giúp lần xóa lan truyền, bản ghi đã xóa không bị "hồi sinh"
    deletedIds: {},
    // Lịch sử sửa đổi (audit log) — tối đa HISTORY_LIMIT dòng gần nhất, chỉ Admin xem được
    history: [],
    // Bản cất tự động (auto backup cục bộ): [{ ts, by, reason, data }] — js/autobackup.js
    // data = chuỗi JSON snapshot toàn bộ dữ liệu (hoặc { gz: '<base64 gzip>' } sau nén nền)
    autoBackups: [],
    // Lưu trữ file (File System Access API)
    fileStorage: {
      dirHandle: null,
      fileHandle: null,
      connected: false,
      folderName: ''
    }
  };

export {
  DEFAULT_USERS,
  STAGES,
  STORAGE_KEY_CUSTOM_CHARTS,
  STORAGE_KEY_DATA,
  STORAGE_KEY_DELETED_IDS,
  STORAGE_KEY_AUTOBACKUP,
  STORAGE_KEY_PHOTO_QUEUE,
  STORAGE_KEY_PHOTO_UPLOADED,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_MATERIAL_PLAN,
  STORAGE_KEY_MATERIAL_RATES,
  STORAGE_KEY_MATERIALS,
  STORAGE_KEY_XUONG2_CUTS,
  STORAGE_KEY_XUONG2_BOLUONG,
  STORAGE_KEY_XUONG2_BO_ONG,
  STORAGE_KEY_XUONG2_BAO_THO,
  STORAGE_KEY_XUONG2_CHON_NAN,
  STORAGE_KEY_X2_CAP_RATE,
  STORAGE_KEY_X2_BOLUONG_RATE,
  STORAGE_KEY_X2_BO_ONG_RATE,
  STORAGE_KEY_X2_BAO_THO_RATE,
  STORAGE_KEY_X2_CHON_NAN_RATE,
  STORAGE_KEY_XUONG2_BAO_TINH,
  STORAGE_KEY_X2_BAO_TINH_RATE,
  STORAGE_KEY_XUONG2_BULLIG,
  STORAGE_KEY_X2_BULLIG_RATE,
  STORAGE_KEY_X2_SAY_RATE,
  STORAGE_KEY_X2_SAY_TIMES,
  STORAGE_KEY_X2_SAY_INCIDENT,
  STORAGE_KEY_X2_STAGE_INCIDENT,
  STORAGE_KEY_X2_KANBAN_COLLAPSED,
  STORAGE_KEY_X2_EP_VAN_RATE,
  STORAGE_KEY_X2_LOT_LOCATIONS,
  STORAGE_KEY_X2_BAO_THANH_OUT_SIZES,
  STORAGE_KEY_SUPPLIERS,
  STORAGE_KEY_PLANNING_FORECAST,
  STORAGE_KEY_PLANNING_ITEMS,
  STORAGE_KEY_PLANNING_STOCK,
  STORAGE_KEY_PRESS_RECORDS,
  STORAGE_KEY_PRESS_NOTES,
  STORAGE_KEY_PV_CHART_MODE,
  STORAGE_KEY_CAPACITY_UI,
  STORAGE_KEY_STAGE_WS,
  STORAGE_KEY_XUONG1_CAT_ONG,
  STORAGE_KEY_XUONG1_SAY_SINH,
  STORAGE_KEY_XUONG1_BOC,
  STORAGE_KEY_XUONG1_LOC_ONG,
  STORAGE_KEY_XUONG1_CAT_MAT,
  STORAGE_KEY_XUONG1_BO,
  STORAGE_KEY_XUONG1_PHOI_SAY,
  STORAGE_KEY_XUONG1_LOC_THANH,
  STORAGE_KEY_X1_RATES,
  STORAGE_KEY_QC_EXPORTS,
  STORAGE_KEY_QC_KILN_HUMIDITY,
  STORAGE_KEY_QC_KILN_THRESHOLD,
  STORAGE_KEY_QC_FINAL,
  STORAGE_KEY_QC_FINAL_RATE,
  STORAGE_KEY_X2_SAY_FRAME,
  STORAGE_KEY_KHO_NOTES,
  STORAGE_KEY_KHO_SHOW_USED,
  STORAGE_KEY_HR_EMPLOYEES,
  STORAGE_KEY_HR_LEAVES,
  STORAGE_KEY_HR_RECRUITMENT,
  STORAGE_KEY_HR_POSNEEDS,
  STORAGE_KEY_HR_SHIFTS,
  STORAGE_KEY_HR_ASSIGN,
  STORAGE_KEY_HR_POSITIONS,
  STORAGE_KEY_HR_ATTENDANCE,
  STORAGE_KEY_HR_CHECKINS,
  STORAGE_KEY_HR_OVERTIMES,
  STORAGE_KEY_HR_CALENDAR,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_USERS,
  state
};
