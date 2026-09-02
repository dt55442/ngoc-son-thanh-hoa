// ═══════════════════════════════════════════════════════════
// js/main.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { checkAuthAndRender, deleteUser, loadSession, loadUsers, openUserPermsModal } from './auth.js';
import { deleteBatch, openBatchFormModal, openTransferModal } from './batch-modals.js';
import { flushPendingCloudPush, initFirebase, initLucide, registerServiceWorker, uploadLocalDataToCloud } from './cloud.js';
import { deleteCustomChart, openChartBuilderModal, renderDashboardCharts, toggleChartExpand } from './dashboard.js';
import { setupEventListeners, undoLastAction, updateUndoButton } from './events.js';
import { loadCustomCharts, openCustomExportModal } from './export-xlsx.js';
import { clearColumnFilter, clearColumnSearch, closeColumnFilter, onColumnFilterChange, onColumnSearchFocus, onColumnSearchInput, onColumnSearchKeydown, renderKanbanBoard, toggleColumnFilter } from './kanban.js';
import { loadMaterialRecords, renderMaterialView } from './materials.js';
import { deleteMaterialRate, deletePlanningItem, deleteProductBom, duplicatePlanningGroup, editPlanningGroup, forecastAssumeWeek, forecastClearWeek, loadMaterialRates, loadPlanningForecast, loadPlanningItems, loadPlanningStock, loadProductBoms, openMaterialRateModal, openProductBomModal, removeBomLine, renderPlanningView, selectPlanningProduct } from './planning.js';
import { addPressLine, addPressStick, deletePressRecord, loadPressRecords, openPressModal, removePressLine, removePressStick, renderPressView } from './press.js';
import { canViewAdvanced } from './permissions.js';
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
    loadProductBoms();
    loadPlanningItems();
    loadPlanningForecast();
    loadPlanningStock();
    loadPressRecords();
    loadMaterialRecords();
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
    if (targetViewId === 'planning-view') renderPlanningView();
    if (targetViewId === 'press-view') renderPressView();
    if (targetViewId === 'materials-view') renderMaterialView();
  }

  function filterMobileKanbanColumns() {
    document.querySelectorAll('.kanban-column').forEach(col => {
      const stage = col.getAttribute('data-stage-col');
      col.style.display = (state.activeMobileStage === 'all' || state.activeMobileStage === stage) ? 'flex' : 'none';
    });
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
    if (state.activeView === 'dashboard-view') renderDashboardCharts();
    if (state.activeView === 'planning-view') renderPlanningView();
    if (state.activeView === 'press-view') renderPressView();
    if (state.activeView === 'materials-view') renderMaterialView();
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
    editProductBom: id => openProductBomModal(id),
    deleteProductBom,
    removeBomLine,
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
    // Giả định / Xóa Dự kiến theo từng tuần
    forecastAssumeWeek,
    forecastClearWeek,
    // Yêu cầu quyền xem Vùng Nâng Cao (từ thẻ khóa trên Dashboard)
    requestAdvancedAccess,
    // Cấu hình quyền chi tiết người dùng (Admin)
    openUserPermsModal,
    // Đồng bộ dữ liệu máy lên mây (Firebase)
    uploadLocalDataToCloud
  };
  // Cờ báo hiệu module đã nạp & gán API thành công (watchdog trong index.html dựa vào đây)
  window.__BOOT_OK = true;

export {
  batchMatchesColumnFilter,
  filterMobileKanbanColumns,
  getFilteredBatches,
  renderAll,
  renderQuickStats,
  switchView
};
