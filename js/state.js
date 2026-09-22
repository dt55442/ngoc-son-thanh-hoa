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
  const STORAGE_KEY_MATERIALS = 'bamboo_tracker_material_records_v1';
  // Vị trí công đoạn Xưởng 2 (thẻ launcher ở tab Công Đoạn): nhật ký cắt/chọn.
  // Mỗi lượt cắt/chọn link 1 lượt nhập nguyên liệu đầu vào của Xưởng 2 (tab Nguyên Liệu)
  const STORAGE_KEY_XUONG2_CUTS = 'bamboo_tracker_xuong2_cuts_v1';
  // ĐỊNH MỨC CÔNG SUẤT CẮT (kg/giờ) theo TỪNG THÁNG — dùng tính Hiệu suất
  // của công đoạn Cắt Chọn Xưởng 2 (Hiệu suất = Công suất thực tế ÷ Định mức).
  // { 'YYYY-MM': số kg/h } — VD tháng 9 đặt 3000, tháng 10 đặt 3200.
  const STORAGE_KEY_X2_CAP_RATE = 'bamboo_tracker_x2_capacity_rate_v1';
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
  // Bảng "Thông Tin Nhà Cung" (tab Nguyên Liệu): danh mục nhà cung cấp do
  // người dùng khai báo (tên + mã số điền tay); các số liệu (tổng KL, số chuyến,
  // trung bình, tỷ lệ đạt, số lần nhắc nhở, đánh giá) TỰ TÍNH từ materialRecords
  // + xuong2CutRecords (10 chuyến gần nhất) — xem js/suppliers.js
  const STORAGE_KEY_SUPPLIERS = 'bamboo_tracker_suppliers_v1';
  const STORAGE_KEY_QC_EXPORTS = 'bamboo_tracker_qc_exports_v1';
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
    hrCheckins: [],    // [{ id, employeeId, date, in, out, punches, fileName, createdAt, updatedAt }] — giờ máy chấm công đã nạp
    hrOvertimes: [],   // [{ id, employeeId, date, start, end (dự kiến), plannedMin, reason, status, approvedBy, approvedAt, ... }] — đăng ký tăng ca (giờ thực tế tự tính từ hrAssignments)
    // Lịch làm việc theo tháng: { 'YYYY-MM': { weekdaysOff: [0..6], restDays: ['YYYY-MM-DD'...] } }
    // Ngày nghỉ/lễ: đi làm vào ngày đó thì toàn bộ giờ làm được tính vào TĂNG CA (js/hr.js)
    hrWorkCalendar: {},  // không có cấu hình cho tháng nào -> mặc định nghỉ Chủ nhật (wd 0)
    hrCalMonth: '',    // tháng đang xem/cài đặt trong modal Lịch Làm Việc ('YYYY-MM')
    qcExports: [],
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
    // Nhật ký bổ ống (vị trí Bổ Ống — Xưởng 2): mỗi lượt link 1 lô ống của Cắt Chọn
    xuong2BoOngRecords: [],
    x2BoOngEditId: null,      // id lượt bổ ống đang sửa trong form (null = ghi mới)
    // Định mức công suất bổ ống theo tháng (Bổ Ống — Xưởng 2): { 'YYYY-MM': kg/h }
    x2BoOngRates: {},
    // Nhật ký chạy máy bào thô (vị trí Chạy Máy Bào Thô — Xưởng 2): mỗi lượt
    // link 1 lô đã bổ + loại nan (Dài/Rộng/Dày — mỗi ô có thể nhiều giá trị)
    xuong2BaoThoRecords: [],
    x2BaoThoEditId: null,     // id lượt chạy máy đang sửa trong form (null = ghi mới)
    // Định mức công suất bào thô theo tháng (thanh/giờ): { 'YYYY-MM': thanh/h }
    x2BaoThoRates: {},
    // Nhật ký chọn nan thô (vị trí Chọn Nan Thô — Xưởng 2): mỗi lượt link 1 lô
    // đã bào thô + kích thước + phân loại + số lượng (thanh)
    xuong2ChonNanThoRecords: [],
    x2ChonNanEditId: null,    // id lượt chọn nan đang sửa trong form (null = ghi mới)
    // Định mức công suất chọn nan thô theo tháng (thanh/giờ)
    x2ChonNanRates: {},
    materialKpiPeriod: 'all', // 'all' | 'week' | 'month' | 'year' — bộ lọc thời gian thẻ KPI
    materialEditId: null,     // id bản ghi đang sửa trong modal (null = thêm mới)
    materialFormImages: [],   // ảnh (dataURL) đang có trong form
    // Kế hoạch nguyên liệu cần nhập (bảng phụ tab Nguyên liệu)
    // { '2026-W36': { 'lo-hoi': 12, 'xuong-1': 30, 'xuong-2': 25 } }
    // Giá trị nhập = SỐ TRUNG BÌNH MỖI NGÀY trong tuần; tổng tuần = TB/ngày × 7
    materialPlan: {},
    materialPlanYear: '',     // năm đang chọn trong bộ lọc của bảng kế hoạch nguyên liệu
    materialPlanChartWeek: '',      // tuần đang xem của biểu đồ Kế hoạch vs Thực tế ('2026-W36')
    materialPlanChartInstance: null, // instance Chart.js của biểu đồ kế hoạch vs thực tế
    // Biểu đồ tĩnh Kế Hoạch vs Đã Ép (Dashboard)
    planVsPressUnit: 'vol',     // 'vol' = m³ (mặc định) | 'qty' = Số lượng — chỉ đổi SỐ hiển thị, chiều cao cột luôn theo m³
    planVsPressYear: 'current', // 'current' = năm hiện tại | 'all' | năm cụ thể (VD '2026')
    planVsPressWeek: 'current', // 'current' = tuần hiện tại | 'all' | số tuần (1..53)
    planVsPressSpan: 1,         // 1 = hiển thị 1 tuần (mặc định) | 2 = gộp 2 tuần (tuần chọn + tuần kế tiếp) — theo tần suất xuất hàng 1 hoặc 2 tuần/lần
    planVsPressTotal: false,    // true = nút Total: gộp toàn bộ sản phẩm theo nhóm tên (Bullig / Ván) thay vì từng mã hàng
    planVsPressInstance: null,
    planCapacityInstance: null,
    planCapYear: 'current',     // 'current' = năm hiện tại | năm cụ thể (VD '2026') — RIÊNG của biểu đồ khả năng đáp ứng
    planCapStartIdx: null,      // vị trí tuần bắt đầu cửa sổ trong khoảng tuần liên tục (mỗi bước ◀/▶ = 1 tuần, cửa sổ tối đa 2 tuần; null = mặc định tuần hiện tại)
    // Bộ lọc theo từng cột Kanban (multi-select)
    // Mỗi stage: { dates: [], locations: [], dimensions: [], quantities: [] }
    columnFilters: {
      say1:     { dates: [], locations: [], dimensions: [], quantities: [] },
      say2:     { dates: [], locations: [], dimensions: [], quantities: [] },
      kho:      { dates: [], locations: [], dimensions: [], quantities: [] },
      bao_tinh: { dates: [], locations: [], dimensions: [], quantities: [] }
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
    // Chế độ chọn nhiều lô để chuyển công đoạn cùng lúc
    multiTransferMode: false,
    multiSelectedIds: [],
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
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_MATERIAL_PLAN,
  STORAGE_KEY_MATERIAL_RATES,
  STORAGE_KEY_MATERIALS,
  STORAGE_KEY_XUONG2_CUTS,
  STORAGE_KEY_XUONG2_BO_ONG,
  STORAGE_KEY_XUONG2_BAO_THO,
  STORAGE_KEY_XUONG2_CHON_NAN,
  STORAGE_KEY_X2_CAP_RATE,
  STORAGE_KEY_X2_BO_ONG_RATE,
  STORAGE_KEY_X2_BAO_THO_RATE,
  STORAGE_KEY_X2_CHON_NAN_RATE,
  STORAGE_KEY_SUPPLIERS,
  STORAGE_KEY_PLANNING_FORECAST,
  STORAGE_KEY_PLANNING_ITEMS,
  STORAGE_KEY_PLANNING_STOCK,
  STORAGE_KEY_PRESS_RECORDS,
  STORAGE_KEY_PRESS_NOTES,
  STORAGE_KEY_QC_EXPORTS,
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
