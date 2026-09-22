// ═══════════════════════════════════════════════════════════
// js/main.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { checkAuthAndRender, deleteUser, loadSession, loadUsers, openUserEditModal, openUserPermsModal } from './auth.js';
import { deleteBatch, openBatchFormModal, openTransferModal } from './batch-modals.js';
import { aiAutoGreet } from './ai.js';
import { initTheme } from './theme.js';
import { flushPendingCloudPush, initFirebase, initLucide, registerServiceWorker, uploadLocalDataToCloud } from './cloud.js';
import { deleteAutoBackup, loadAutoBackups, restoreAutoBackup, restoreCloudBackup } from './autobackup.js';
import { loadDeletedIds } from './tombstone.js';
import { deleteCustomChart, openChartBuilderModal, renderDashboardCharts, renderStageFlow, toggleChartExpand } from './dashboard.js';
import { setupEventListeners, undoLastAction, updateUndoButton } from './events.js';
import { loadCustomCharts, openCustomExportModal } from './export-xlsx.js';
import { clearColumnFilter, clearColumnSearch, closeColumnFilter, onColumnFilterChange, onColumnSearchFocus, onColumnSearchInput, onColumnSearchKeydown, renderKanbanBoard, toggleColumnFilter } from './kanban.js';
import { loadMaterialPlan, loadMaterialRecords, removeMaterialPlanWeek, renderMaterialView } from './materials.js';
import { loadXuong2Cuts, renderXuong2Cards } from './xuong2.js';
import { loadSuppliers } from './suppliers.js';
import { loadX2BaoThoRates, loadX2BoOngRates, loadX2CapRates, loadX2ChonNanRates, loadXuong2BaoTho, loadXuong2BoOng, loadXuong2ChonNan } from './xuong2.js';
import { deleteMaterialRate, deletePlanningItem, duplicatePlanningGroup, editPlanningGroup, forecastAssumeWeek, forecastClearWeek, loadMaterialRates, loadPlanningForecast, loadPlanningItems, loadPlanningStock, openMaterialRateModal, renderPlanningView, restoreRateTableCollapse, selectPlanningProduct } from './planning.js';
import { addPressLine, addPressStick, deletePressRecord, loadPressNotes, loadPressRecords, openPressModal, openPressWorkersModal, removePressLine, removePressStick, renderPressView } from './press.js';
import { loadQcExports, renderQcView } from './qc.js';
import { applyCheckinRecord, approveLeave, approveOvertime, closeEmployeeModal, closeLeaveModal, closeOvertimeModal, closeRecruitmentModal, deleteCheckin, deleteEmployee, deleteLeave, deleteOvertime, deletePosition, deleteRecruitment, deletePositionNeed, handleEmployeeSubmit, handleLeaveSubmit, handleRecruitmentSubmit, loadHrData, openEmployeeModal, openLeaveModal, openPositionModal, openPositionNeedModal, openRecruitmentModal, rejectLeave, rejectOvertime, renderHrView, hrOpenCard, hrCloseOpenCard, hrSetPositionNeedQty, hrBoardOpenAssign, hrBoardRemoveAssign, hrBoardDragStart, hrBoardDrop, setShiftTypePreset, HR_CARD_DEFS } from './hr.js';
import { canViewAdvanced } from './permissions.js';
import { initHistory } from './history.js';
import { state } from './state.js';
import { autoReconnectDataFolder, loadData, updateFileStorageUI } from './storage.js';
import { setupFormCalculations, initVnDateInputs } from './utils.js';

  // ─── INIT ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initLucide();
    loadUsers();
    loadSession();
    initTheme(); // Áp giao diện đã chọn (theo máy + theo người đăng nhập) — trước khi vẽ biểu đồ
    loadData();
    loadDeletedIds(); // dấu vết xóa (tombstone) cho đồng bộ mây — nạp trước mọi thao tác
    loadAutoBackups(); // bản cất tự động (auto backup cục bộ) — js/autobackup.js
    loadCustomCharts();
    loadMaterialRates();
    loadPlanningItems();
    loadPlanningForecast();
    loadPlanningStock();
    loadPressRecords();
    loadPressNotes();
    loadMaterialRecords();
    loadMaterialPlan();
    loadXuong2Cuts(); // vị trí công đoạn Xưởng 2 (thẻ launcher tab Công Đoạn)
    loadXuong2BoOng(); // Nhật ký Bổ Ống Xưởng 2 (link lô ống từ Cắt Chọn)
    loadXuong2BaoTho(); // Nhật ký Chạy Máy Bào Thô Xưởng 2 (link lô đã bổ)
    loadXuong2ChonNan(); // Nhật ký Chọn Nan Thô Xưởng 2 (link lô đã bào thô)
    loadSuppliers(); // Bảng Thông Tin Nhà Cung (tab Nguyên Liệu)
    loadX2CapRates(); // Định mức công suất cắt theo tháng (tab Công Đoạn)
    loadX2BoOngRates(); // Định mức công suất bổ ống theo tháng (tab Công Đoạn)
    loadX2BaoThoRates(); // Định mức công suất bào thô theo tháng (thanh/giờ)
    loadX2ChonNanRates(); // Định mức công suất chọn nan theo tháng (thanh/giờ)
    loadQcExports();
    loadHrData();
    // Lịch sử sửa đổi: nạp + lập snapshot nền SAU CÙNG (sau khi toàn bộ
    // load*() đã xong) — để lần sửa đầu tiên là so sánh được chính xác
    initHistory();
    // Nhớ lại trạng thái thu gọn của các bảng dữ liệu (định mức, lượt ép, nguyên liệu)
    restoreRateTableCollapse();
    setupEventListeners();
    setupFormCalculations();
    // Mọi ô chọn ngày hiển thị & nhập theo dd/mm/yyyy (văn hóa Việt Nam):
    // khởi tạo cho các ô có sẵn + tự bắt các ô ngày được tạo động sau này
    initVnDateInputs();
    if (typeof MutationObserver === 'function') {
      let vnDateMoTimer = null;
      const vnDateMo = new MutationObserver(() => {
        clearTimeout(vnDateMoTimer);
        vnDateMoTimer = setTimeout(() => initVnDateInputs(), 200);
      });
      vnDateMo.observe(document.body, { childList: true, subtree: true });
    }
    updateUndoButton();
    updateFileStorageUI();
    checkAuthAndRender();
    // "Nan Bot" chào mở màn khi vừa vào app (tự kiểm tra: chỉ chào khi đã đăng nhập)
    try { aiAutoGreet('dashboard-view'); } catch (e) { /* bỏ qua */ }
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
    // Thẻ "Phân bổ khối lượng theo công đoạn" + khu Vị Trí Xưởng 2 (tab Công Đoạn)
    if (targetViewId === 'kanban-view') {
      // Vẽ ĐỦ khu Kanban khi vừa mở tab (trước đây renderAll luôn vẽ sẵn —
      // giờ renderAll chỉ vẽ khi đang đứng ở tab này để bớt công vô ích).
      renderQuickStats(getFilteredBatches());
      renderKanbanBoard(getFilteredBatches());
      renderStageFlow();
      renderXuong2Cards();
      filterMobileKanbanColumns();
    }
    if (targetViewId === 'planning-view') renderPlanningView();
    if (targetViewId === 'press-view') renderPressView();
    if (targetViewId === 'materials-view') renderMaterialView();
    if (targetViewId === 'qc-view') renderQcView();
    if (targetViewId === 'hr-view') renderHrView();
    // "Nan Bot" chào + nhắc nhanh theo tab vừa mở (tầng offline hiện ngay,
    // tầng AI lầy hơn sẽ tự thay câu khi có key + mạng + còn quota)
    try { aiAutoGreet(targetViewId); } catch (e) { /* lỗi gợi ý tự động — bỏ qua */ }
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
    // TỐI ƯU: chỉ vẽ lại khu Kanban khi tab Công Đoạn đang mở. Trước đây MỖI
    // lần lưu/đồng bộ mây đều vẽ lại toàn bộ bảng Kanban (mỗi thẻ 1 khối DOM)
    // dù người dùng đang ở tab khác — gây giật/lag đặc biệt khi online (mỗi
    // snapshot mây đều gọi renderAll). Khi chuyển sang tab Công Đoạn,
    // switchView() sẽ tự vẽ đầy đủ khu này.
    if (state.activeView === 'kanban-view') {
      renderKanbanBoard(filtered);
      // Thẻ "Phân bổ khối lượng theo công đoạn" + giữ đúng cột đang xem trên điện thoại
      renderStageFlow();
      renderXuong2Cards(); // đếm trên thẻ launcher Vị Trí Xưởng 2 (tab Công Đoạn)
      filterMobileKanbanColumns();
    }
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
    // Auto backup — phục hồi bản cất trên máy / trên mây (Admin)
    restoreAutoBackup,
    deleteAutoBackup,
    restoreCloudBackup,
    // Tab Nhân Sự — thao tác từ bảng (onclick trong HTML render động)
    hrEditEmployee: openEmployeeModal,
    hrDeleteEmployee: deleteEmployee,
    hrApproveLeave: approveLeave,
    hrRejectLeave: rejectLeave,
    hrDeleteLeave: deleteLeave,
    // Đăng ký tăng ca (mini card tab Nhân Sự — duyệt/xóa chỉ Admin & Ban Quản Lý)
    hrApproveOvertime: approveOvertime,
    hrRejectOvertime: rejectOvertime,
    hrDeleteOvertime: deleteOvertime,
    hrEditRecruitment: openRecruitmentModal,
    hrDeleteRecruitment: deleteRecruitment,
    // Vị trí làm việc (onclick trong HTML render động)
    hrEditPosition: openPositionModal,
    hrDeletePosition: deletePosition,
    // Nhân sự cần tại các vị trí — bảng dữ liệu trung gian (onclick render động)
    hrEditPositionNeed: openPositionNeedModal,
    hrDeletePositionNeed: deletePositionNeed,
    hrSetPositionNeedQty,
    // Bảng bố trí vị trí theo ngày (onclick render động: ô board / kéo thả / cài ca)
    hrBoardOpenAssign,
    hrBoardRemoveAssign,
    hrBoardDragStart,
    hrBoardDrop,
    hrShiftTypePreset: setShiftTypePreset,
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
