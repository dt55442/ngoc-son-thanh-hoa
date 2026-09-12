// ═══════════════════════════════════════════════════════════
// js/main.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { checkAuthAndRender, deleteUser, loadSession, loadUsers, openUserEditModal, openUserPermsModal } from './auth.js';
import { deleteBatch, openBatchFormModal, openTransferModal } from './batch-modals.js';
import { flushPendingCloudPush, initFirebase, initLucide, registerServiceWorker, uploadLocalDataToCloud } from './cloud.js';
import { deleteCustomChart, openChartBuilderModal, renderDashboardCharts, renderStageFlow, toggleChartExpand } from './dashboard.js';
import { setupEventListeners, undoLastAction, updateUndoButton } from './events.js';
import { loadCustomCharts, openCustomExportModal } from './export-xlsx.js';
import { clearColumnFilter, clearColumnSearch, closeColumnFilter, onColumnFilterChange, onColumnSearchFocus, onColumnSearchInput, onColumnSearchKeydown, renderKanbanBoard, toggleColumnFilter } from './kanban.js';
import { loadMaterialPlan, loadMaterialRecords, removeMaterialPlanWeek, renderMaterialView } from './materials.js';
import { deleteMaterialRate, deletePlanningItem, duplicatePlanningGroup, editPlanningGroup, forecastAssumeWeek, forecastClearWeek, loadMaterialRates, loadPlanningForecast, loadPlanningItems, loadPlanningStock, openMaterialRateModal, renderPlanningView, restoreRateTableCollapse, selectPlanningProduct } from './planning.js';
import { addPressLine, addPressStick, deletePressRecord, loadPressNotes, loadPressRecords, openPressModal, openPressWorkersModal, removePressLine, removePressStick, renderPressView } from './press.js';
import { loadQcExports, renderQcView } from './qc.js';
import { applyCheckinRecord, approveLeave, closeEmployeeModal, closeLeaveModal, closeRecruitmentModal, deleteCheckin, deleteEmployee, deleteLeave, deletePosition, deleteRecruitment, handleEmployeeSubmit, handleLeaveSubmit, handleRecruitmentSubmit, loadHrData, openEmployeeModal, openLeaveModal, openPositionModal, openRecruitmentModal, rejectLeave,   renderHrView, hrOpenCard, hrCloseOpenCard, HR_CARD_DEFS } from './hr.js';
import { canViewAdvanced } from './permissions.js';
import { initHistory } from './history.js';
import { state } from './state.js';
import { autoReconnectDataFolder, loadData, updateFileStorageUI } from './storage.js';
import { setupFormCalculations } from './utils.js';

  // ─── INIT ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initLucide();
    loadUsers();
    loadSession();
    loadData();
    loadCustomCharts();
    loadMaterialRates();
    loadPlanningItems();
    loadPlanningForecast();
    loadPlanningStock();
    loadPressRecords();
    loadPressNotes();
    loadMaterialRecords();
    loadMaterialPlan();
    loadQcExports();
    loadHrData();
    // Lịch sử sửa đổi: nạp + lập snapshot nền SAU CÙNG (sau khi toàn bộ
    // load*() đã xong) — để lần sửa đầu tiên là so sánh được chính xác
    initHistory();
    // Nhớ lại trạng thái thu gọn của các bảng dữ liệu (định mức, lượt ép, nguyên liệu)
    restoreRateTableCollapse();
    setupEventListeners();
    setupFormCalculations();
    updateUndoButton();
    updateFileStorageUI();
    checkAuthAndRender();
    // Tự động kết nối lại thư mục dữ liệu đã chọn trước đó
    autoReconnectDataFolder();
    // Đăng ký Service Worker để hoạt động OFFLINE (PWA)
    registerServiceWorker();
    // Khởi động đồng bộ ONLINE (Firebase) nếu có kết nối & SDK
    initFirebase();
    // Lưới an toàn đồng bộ: đẩy nốt dữ liệu chờ lên mây khi người dùng rời trang,
    // chuyển sang tab khác, hoặc mạng vừa quay lại (tránh mất dữ liệu ép ván mới nhập)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingCloudPush();
    });
    // Xoay màn hình / đổi kích thước: áp dụng lại chế độ xem công đoạn của Kanban
    let kanbanResizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(kanbanResizeTimer);
      kanbanResizeTimer = setTimeout(filterMobileKanbanColumns, 150);
    });
    window.addEventListener('pagehide', flushPendingCloudPush);
    window.addEventListener('online', flushPendingCloudPush);
  });
  // ─── VIEW SWITCHING ───────────────────────────────────────────
  function switchView(targetViewId) {
    const prevView = state.activeView;
    state.activeView = targetViewId;
    // Chỉ bật trượt tuần khi CHUYỂN TỪ TAB KHÁC sang tab Kế hoạch
    // (bấm lại tab đang đứng thì không coi là chuyển tab)
    if (targetViewId === 'planning-view' && prevView !== targetViewId) {
      state.planningPendingScroll = true;
    }
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const tp = document.getElementById(targetViewId);
    if (tp) tp.classList.add('active');
    document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-target') === targetViewId);
    });
    if (targetViewId === 'dashboard-view') renderDashboardCharts();
    // Thẻ "Phân bổ khối lượng theo công đoạn" nay nằm ở tab Công Đoạn
    if (targetViewId === 'kanban-view') renderStageFlow();
    if (targetViewId === 'planning-view') renderPlanningView();
    if (targetViewId === 'press-view') renderPressView();
    if (targetViewId === 'materials-view') renderMaterialView();
    if (targetViewId === 'qc-view') renderQcView();
    if (targetViewId === 'hr-view') renderHrView();
  }

  function filterMobileKanbanColumns() {
    // Điện thoại/máy tính bảng: xem từng công đoạn (mặc định 1 công đoạn,
    // vuốt ngang hoặc bấm tab để chuyển). Desktop (≥1024px): luôn hiện đủ 4 cột
    // và xóa style inline để lưới Kanban tự chia cột.
    const vw = (typeof window !== 'undefined' && window.innerWidth) || 1280;
    const showAll = vw >= 1024 || state.activeMobileStage === 'all';
    let visible = 0;
    document.querySelectorAll('.kanban-column').forEach(col => {
      const stage = col.getAttribute('data-stage-col');
      const show = showAll || state.activeMobileStage === stage;
      col.style.display = show ? 'flex' : 'none';
      if (show) visible++;
    });
    // Khi chỉ xem 1 công đoạn -> cột chiếm trọn chiều ngang bảng
    const board = document.querySelector('.kanban-board');
    if (board) board.classList.toggle('single-stage', !showAll && visible === 1);
  }

  // Chọn công đoạn đang xem trên mobile: đồng bộ tab + lọc cột + hiệu ứng trượt.
  // direction: 0 = bấm tab (không trượt), 1 = sang công đoạn sau, -1 = công đoạn trước
  function setActiveMobileStage(stage, direction = 0) {
    state.activeMobileStage = stage;
    document.querySelectorAll('.stage-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-stage') === stage);
    });
    filterMobileKanbanColumns();
    if (direction !== 0) {
      const col = document.querySelector(`.kanban-column[data-stage-col="${stage}"]`);
      if (col) {
        col.classList.remove('slide-in-left', 'slide-in-right');
        void col.offsetWidth; // ép reflow để animation chạy lại từ đầu
        col.classList.add(direction > 0 ? 'slide-in-right' : 'slide-in-left');
      }
    }
  }

  // Người dùng bấm vào thẻ khóa Vùng Nâng Cao:
  //  - Chưa đăng nhập -> mở modal đăng nhập
  //  - Đã đăng nhập nhưng thiếu quyền -> hướng dẫn liên hệ Admin
  function requestAdvancedAccess() {
    if (canViewAdvanced()) return;
    if (state.currentUser) {
      showToast('Tài khoản của bạn chưa được cấp quyền xem Vùng Nâng Cao. Vui lòng liên hệ Quản trị viên!', 'info');
    } else {
      document.getElementById('btn-open-login')?.click();
    }
  }



  // Kiểm tra một lô nan có khớp bộ lọc của một cột công đoạn không
  function batchMatchesColumnFilter(batch, stage) {
    const colFilter = state.columnFilters[stage];
    if (!colFilter) return true;
    // Lọc theo Ngày (nhiều giá trị - OR)
    if (colFilter.dates && colFilter.dates.length > 0) {
      if (!colFilter.dates.includes(batch.date)) return false;
    }
    // Lọc theo Vị trí (nhiều giá trị - OR)
    if (colFilter.locations && colFilter.locations.length > 0) {
      const loc = (batch.location || '').toLowerCase();
      if (!colFilter.locations.some(l => loc.includes(l.toLowerCase()))) return false;
    }
    // Lọc theo Kích thước nan (nhiều giá trị - OR)
    if (colFilter.dimensions && colFilter.dimensions.length > 0) {
      const dimKey = `${batch.length}×${batch.width}×${batch.thickness}`;
      if (!colFilter.dimensions.includes(dimKey)) return false;
    }
    // Lọc theo Số lượng (nhiều giá trị - OR)
    if (colFilter.quantities && colFilter.quantities.length > 0) {
      if (!colFilter.quantities.includes(String(batch.quantity))) return false;
    }
    return true;
  }

  function getFilteredBatches() {
    // Bộ lọc tuần/loại/mục đích bản cũ đã bị loại bỏ (UI không còn tồn tại)
    return [...state.batches];
  }

  function renderAll() {
    const filtered = getFilteredBatches();
    renderQuickStats(filtered);
    renderKanbanBoard(filtered);
    // Thẻ "Phân bổ khối lượng theo công đoạn" (tab Công Đoạn) + giữ đúng cột đang xem trên điện thoại
    renderStageFlow();
    filterMobileKanbanColumns();
    if (state.activeView === 'dashboard-view') renderDashboardCharts();
    if (state.activeView === 'planning-view') renderPlanningView();
    if (state.activeView === 'press-view') renderPressView();
    if (state.activeView === 'materials-view') renderMaterialView();
    if (state.activeView === 'qc-view') renderQcView();
    if (state.activeView === 'hr-view') renderHrView();
    initLucide();
  }

  function renderQuickStats(batches) {
    // Tổng tất cả các lô (bao gồm cả Bào Tinh)
    const totalVol = batches.reduce((a, b) => a + (b.volume || 0), 0);
    const totalQty = batches.reduce((a, b) => a + (b.quantity || 0), 0);

    // Tách riêng Bào Tinh: số lượng/thể tích Bào Tinh được tính RIÊNG,
    // không cộng vào tổng của các công đoạn Sấy 1 + Sấy 2 + Kho
    const baoQty = batches
      .filter(b => b.stage === 'bao_tinh')
      .reduce((a, b) => a + (b.quantity || 0), 0);
    const baoVol = batches
      .filter(b => b.stage === 'bao_tinh')
      .reduce((a, b) => a + (b.volume || 0), 0);
    const baoCount = batches.filter(b => b.stage === 'bao_tinh').length;

    // Tổng các công đoạn trước Bào Tinh (Sấy 1 + Sấy 2 + Kho)
    const processQty = totalQty - baoQty;
    const processVol = totalVol - baoVol;
    const processCount = batches.length - baoCount;

    const el = id => document.getElementById(id);
    // Tổng toàn bộ (giữ nguyên để hiển thị tổng quan)
    if (el('quick-total-vol'))     el('quick-total-vol').textContent     = `${totalVol.toFixed(4)} m³`;
    if (el('quick-total-qty'))     el('quick-total-qty').textContent     = `${totalQty.toLocaleString('vi-VN')} thanh`;
    if (el('quick-total-batches')) el('quick-total-batches').textContent = `${batches.length} lô`;

    // Hiển thị tách riêng: Tổng Sấy 1 + Sấy 2 + Kho (không gồm Bào Tinh)
    if (el('quick-process-vol'))   el('quick-process-vol').textContent   = `${processVol.toFixed(4)} m³`;
    if (el('quick-process-qty'))   el('quick-process-qty').textContent   = `${processQty.toLocaleString('vi-VN')} thanh`;
    if (el('quick-process-batches')) el('quick-process-batches').textContent = `${processCount} lô`;

    // Hiển thị tách riêng: Bào Tinh
    if (el('quick-bao-vol'))       el('quick-bao-vol').textContent       = `${baoVol.toFixed(4)} m³`;
    if (el('quick-bao-qty'))       el('quick-bao-qty').textContent       = `${baoQty.toLocaleString('vi-VN')} thanh`;
    if (el('quick-bao-batches'))   el('quick-bao-batches').textContent   = `${baoCount} lô`;
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  window.app = {
    openBatchFormModal,
    openEditModal: id => openBatchFormModal(id),
    openTransferModal,
    openCustomExportModal,
    openChartBuilderModal: (chartId, preset) => openChartBuilderModal(chartId, preset),
    openEditChartModal: id => openChartBuilderModal(id),
    openUserPermsModal: id => openUserPermsModal(id),
    deleteCustomChart,
    // Mở rộng biểu đồ toàn màn hình / xoay ngang (nút ⤢ trên thẻ biểu đồ)
    toggleChartExpand,
    deleteBatch,
    deleteUser,
    // Bộ lọc theo cột Kanban
    toggleColumnFilter,
    closeColumnFilter,
    clearColumnFilter,
    onColumnFilterChange,
    // Tìm kiếm gợi ý trong bộ lọc cột Kanban
    onColumnSearchFocus,
    onColumnSearchInput,
    onColumnSearchKeydown,
    clearColumnSearch,
    // Hoàn tác khi nhập sai
    undoLastAction,
    // Kế hoạch sản xuất
    editMaterialRate: id => openMaterialRateModal(id),
    deleteMaterialRate,
    deletePlanningItem,
    selectPlanningProduct,
    duplicatePlanningGroup,
    editPlanningGroup,
    // Sản lượng ép ván
    addPressLine: () => addPressLine(),
    addPressStick: () => addPressStick(),
    removePressLine,
    removePressStick,
    editPressRecord: id => openPressModal(id),
    deletePressRecord,
    // Chi tiết công nhân ép của 1 lượt ép (đối chiếu chấm công & phân vị)
    pressWorkersDetail: openPressWorkersModal,
    // Giả định / Xóa Dự kiến theo từng tuần
    forecastAssumeWeek,
    forecastClearWeek,
    // Kế hoạch nguyên liệu cần nhập (bảng phụ tab Nguyên liệu)
    removeMaterialPlanWeek,
    // Yêu cầu quyền xem Vùng Nâng Cao (từ thẻ khóa trên Dashboard)
    requestAdvancedAccess,
    // Cấu hình quyền chi tiết người dùng (Admin)
    openUserPermsModal,
    // Sửa thông tin người dùng (Admin)
    openUserEditModal,
    // Đồng bộ dữ liệu máy lên mây (Firebase)
    uploadLocalDataToCloud,
    // Tab Nhân Sự — thao tác từ bảng (onclick trong HTML render động)
    hrEditEmployee: openEmployeeModal,
    hrDeleteEmployee: deleteEmployee,
    hrApproveLeave: approveLeave,
    hrRejectLeave: rejectLeave,
    hrDeleteLeave: deleteLeave,
    hrEditRecruitment: openRecruitmentModal,
    hrDeleteRecruitment: deleteRecruitment,
    // Vị trí làm việc (onclick trong HTML render động)
    hrEditPosition: openPositionModal,
    hrDeletePosition: deletePosition,
    // Thẻ Nhân Sự — launcher 5/3/2 (mở nổi lên dạng pop-up modal)
    hrOpenCard,
    hrCloseCard: hrCloseOpenCard,
    // Giờ máy chấm công (onclick trong HTML render động)
    hrApplyCheckin: applyCheckinRecord,
    hrDeleteCheckin: deleteCheckin
  };
  // Cờ báo hiệu module đã nạp & gán API thành công (watchdog trong index.html dựa vào đây)
  window.__BOOT_OK = true;

export {
  batchMatchesColumnFilter,
  filterMobileKanbanColumns,
  getFilteredBatches,
  renderAll,
  renderQuickStats,
  setActiveMobileStage,
  switchView
};
