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
  const STORAGE_KEY_PRODUCT_BOMS = 'bamboo_tracker_product_boms_v1';
  const STORAGE_KEY_PLANNING_ITEMS = 'bamboo_tracker_planning_items_v1';
  const STORAGE_KEY_PLANNING_FORECAST = 'bamboo_tracker_planning_forecast_v1';
  const STORAGE_KEY_PLANNING_STOCK = 'bamboo_tracker_planning_stock_v1';
  const STORAGE_KEY_PRESS_RECORDS = 'bamboo_tracker_press_records_v1';
  const STORAGE_KEY_MATERIALS = 'bamboo_tracker_material_records_v1';

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
    activeMobileStage: 'all',
    customCharts: [],
    customChartInstances: {},
    previewChartInstance: null,
    charts: {},
    // Kế hoạch sản xuất
    materialRates: [],
    productBoms: [], // Định mức ván thô → thành phẩm (BOM phụ): [{ id, productId, lines: [{ vtDim, ratio }] }]
    planningItems: [],
    planningYearFilter: 'all',
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
    materialActiveLoc: 'all', // 'all' | 'lo-hoi' | 'xuong-1' | 'xuong-2'
    materialKpiPeriod: 'all', // 'all' | 'week' | 'month' | 'year' — bộ lọc thời gian thẻ KPI
    materialEditId: null,     // id bản ghi đang sửa trong modal (null = thêm mới)
    materialFormImages: [],   // ảnh (dataURL) đang có trong form
    materialLightbox: null,   // { recordId, index } đang mở trong lightbox
    // Kế hoạch nguyên liệu cần nhập (bảng phụ tab Nguyên liệu)
    // { '2026-W36': { 'lo-hoi': 12, 'xuong-1': 30, 'xuong-2': 25 } }
    // Giá trị nhập = SỐ TRUNG BÌNH MỖI NGÀY trong tuần; tổng tuần = TB/ngày × 7
    materialPlan: {},
    materialPlanYear: '',     // năm đang chọn trong bộ lọc của bảng kế hoạch nguyên liệu
    materialPlanChartWeek: '',      // tuần đang xem của biểu đồ Kế hoạch vs Thực tế ('2026-W36')
    materialPlanChartInstance: null, // instance Chart.js của biểu đồ kế hoạch vs thực tế
    // Biểu đồ tĩnh Kế Hoạch vs Đã Ép (Dashboard)
    planVsPressUnit: 'vol',     // 'vol' = m³ (mặc định) | 'qty' = tấm — chỉ đổi SỐ hiển thị, chiều cao cột luôn theo m³
    planVsPressYear: 'current', // 'current' = năm hiện tại | 'all' | năm cụ thể (VD '2026')
    planVsPressWeek: 'current', // 'current' = tuần hiện tại | 'all' | số tuần (1..53)
    planVsPressInstance: null,
    planCapacityInstance: null,
    planCapYear: 'current',     // 'current' = năm hiện tại | năm cụ thể (VD '2026') — RIÊNG của biểu đồ khả năng đáp ứng
    planCapStartIdx: null,      // vị trí bắt đầu cửa sổ tuần trong danh sách tuần có kế hoạch (null = mặc định tuần hiện tại)
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
  STORAGE_KEY_MATERIAL_PLAN,
  STORAGE_KEY_MATERIAL_RATES,
  STORAGE_KEY_MATERIALS,
  STORAGE_KEY_PLANNING_FORECAST,
  STORAGE_KEY_PLANNING_ITEMS,
  STORAGE_KEY_PLANNING_STOCK,
  STORAGE_KEY_PRESS_RECORDS,
  STORAGE_KEY_PRODUCT_BOMS,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_USERS,
  state
};
