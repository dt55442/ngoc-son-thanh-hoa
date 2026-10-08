// ═══════════════════════════════════════════════════════════
// js/main.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { checkAuthAndRender, deleteUser, loadSession, loadUsers, openUserEditModal, openUserPermsModal } from './auth.js';
import { deleteBatch, exitKanbanPickMode, loadX2LotLocations, openBatchFormModal } from './batch-modals.js';
import { aiAutoGreet } from './ai.js';
import { initTheme } from './theme.js';
import { TRE_TIMING, hideTreLoading, showTreLoading } from './loading.js'; // ICON LOADING "nông dân chặt tre" — che lúc boot + mở tab lần đầu
import { flushPendingCloudPush, initFirebase, initLucide, registerServiceWorker, uploadLocalDataToCloud } from './cloud.js';
import { loadPhotoQueue, photoSyncKick, updatePhotoSyncUI } from './photo-sync.js'; // KÊNH ẢNH THUMB (đẩy dần)
import { deleteAutoBackup, loadAutoBackups, restoreAutoBackup, restoreCloudBackup } from './autobackup.js';
import { loadDeletedIds } from './tombstone.js';
import { deleteCustomChart, openChartBuilderModal, renderDashboardCharts, toggleChartExpand } from './dashboard.js';
import { setupEventListeners, undoLastAction, updateUndoButton } from './events.js';
import { loadCustomCharts, openCustomExportModal } from './export-xlsx.js';
import { clearColumnFilter, clearColumnSearch, closeColumnFilter, onColumnFilterChange, onColumnSearchFocus, onColumnSearchInput, onColumnSearchKeydown, renderKanbanBoard, toggleColumnFilter } from './kanban.js';
import { renderCapacityCard, renderX2MiniSparklines } from './capacity.js';
import { loadMaterialPlan, loadMaterialRecords, removeMaterialPlanWeek, renderMaterialView } from './materials.js';
import { loadXuong2Cuts, loadXuong2Boluong, loadKhoNotes, renderXuong2Cards, x2CloseOpenCard, loadStageWs, applyStageWsDom, loadXuong1CatOng, loadXuong1SaySinh, loadXuong1Boc, loadX1Rates, loadX1ChainAll } from './xuong2.js';
import { loadSuppliers } from './suppliers.js';
import { loadX2BaoThoRates, loadX2BaoTinhRates, loadX2BoOngRates, loadX2BoluongRates, loadX2BulligRates, loadX2CapRates, loadX2ChonNanRates, loadX2SayIncidents, loadX2StageIncidents, loadX2SayRates, loadX2SayTimes, loadX2BaoThanhOutSizes, sayBatchChargeLabel, baoTinhUsedLabel, loadXuong2BaoTho, loadXuong2BaoTinh, loadXuong2BoOng, loadXuong2Bullig, loadXuong2ChonNan } from './xuong2.js';
import { deleteMaterialRate, deletePlanningItem, duplicatePlanningGroup, editPlanningGroup, forecastAssumeWeek, forecastClearWeek, loadMaterialRates, loadPlanningForecast, loadPlanningItems, loadPlanningStock, openMaterialRateModal, renderPlanningView, restoreRateTableCollapse, selectPlanningProduct } from './planning.js';
import { addPressLine, addPressStick, deletePressRecord, loadPressNotes, loadPressRecords, loadX2EpVanRates, openPressModal, openPressWorkersModal, removePressLine, removePressStick } from './press.js';
import { loadQcExports, qcCloseOpenCard, renderQcView } from './qc.js';
import { loadQcFinal, loadQcFinalRates } from './qc-final.js'; // THẺ KIỂM SAU SẢN XUẤT (QC kiểm thành phẩm — js/qc-final.js)
import { loadQcPressLogs } from './qc-press.js'; // THẺ NHẬT KÝ THEO DÕI ÉP VÁN (QC chấm PASS/Fail — js/qc-press.js)
import { loadKilnData } from './kiln.js'; // Độ ẩm lò sấy (QC nhập) + ngưỡng đạt — Bảng Điều Khiển Lò Sấy
import { applyCheckinRecord, approveLeave, approveOvertime, closeEmployeeModal, closeLeaveModal, closeOvertimeModal, closeRecruitmentModal, deleteCheckin, deleteEmployee, deleteLeave, deleteOvertime, deletePosition, deleteRecruitment, deletePositionNeed, handleEmployeeSubmit, handleLeaveSubmit, handleRecruitmentSubmit, loadHrData, openEmployeeModal, openLeaveModal, openPositionModal, openPositionNeedModal, openRecruitmentModal, rejectLeave, rejectOvertime, renderHrView, hrOpenCard, hrCloseOpenCard, hrSetPositionNeedQty, hrBoardOpenAssign, hrBoardRemoveAssign, hrBoardDragStart, hrBoardDrop, setShiftTypePreset, HR_CARD_DEFS } from './hr.js';
import { canViewAdvanced } from './permissions.js';
import { initHistory } from './history.js';
import { state } from './state.js';
import { autoReconnectDataFolder, loadData, purgeLegacyBaoTinhBatches, updateFileStorageUI } from './storage.js';
import { setupFormCalculations, initVnDateInputs } from './utils.js';

  // ── TẢI SẴN NỘI DUNG DƯỚI OVERLAY (cửa chờ ~5s / lúc chơi game) ─────
  // Vẽ sẵn bảng Kanban + mini card Xưởng 2 + sparkline trong lúc overlay còn
  // mở (nguồn lag chính — xem quy tắc 41) → mở tab Công Đoạn đầu tiên là
  // tức thì, không lag. KHÔNG pre-render tab có Chart.js (canvas ẩn = kích
  // thước 0 → biểu đồ vỡ); các tab khác render đồng bộ dưới overlay ngay lúc
  // switchView lần đầu + cửa sổ 5s đủ cho decor hoãn 1 frame chạy xong.
  let trePreloaded = false;
  function preloadCoreViews() {
    if (trePreloaded) return;
    trePreloaded = true;
    try {
      if (state.activeView !== 'kanban-view' && kanbanNeedsPaint()) {
        renderKanbanBoard(getFilteredBatches());
        renderXuong2Cards();
        renderX2MiniSparklines();
      }
    } catch (e) { /* preload lỗi — không phá boot */ }
  }

  // ─── INIT ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // LOADING "NÔNG DÂN CHẶT TRE": hiện ngay lúc mở app — che khoảng trắng
    // khi nạp dữ liệu. CHẾ ĐỘ GAME (mỗi lần mở trang): boot xong CŨNG CHƯA
    // gãy — bấm "Chém!" đủ 100% (20 nhát × 5%) cây mới đổ → MỚI thấy
    // Dashboard (nền blur). Lỗi giữa chừng → bootOk false → tre KHÔNG gãy,
    // overlay mờ dần (không ép chơi khi app đang lỗi).
    showTreLoading('Đang nạp dữ liệu nhà máy…', { mode: 'game' });
    let bootOk = false;
    try {
    initLucide();
    loadUsers();
    loadSession();
    initTheme(); // Áp giao diện đã chọn (theo máy + theo người đăng nhập) — trước khi vẽ biểu đồ
    loadData();
    loadDeletedIds(); // dấu vết xóa (tombstone) cho đồng bộ mây — nạp trước mọi thao tác
    loadAutoBackups(); // bản cất tự động (auto backup cục bộ) — js/autobackup.js
    loadPhotoQueue(); // hàng đợi KÊNH ẢNH THUMB (hộp thư đi theo máy) — js/photo-sync.js
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
    loadStageWs(); // công tắc XƯỞNG 1 / XƯỞNG 2 ở tab Công Đoạn SX (nhớ theo máy)
    // ── XƯỞNG 1: 3 công đoạn đầu (04/10/2026) + định mức kg/h ──
    loadXuong1CatOng();
    loadXuong1SaySinh();
    loadXuong1Boc();
    loadX1Rates();
    loadX1ChainAll(); // 5 công đoạn đuôi Xưởng 1 (Lọc Ống → … → Lọc Thanh/Bó Xô)
    loadXuong2Boluong(); // Nhật ký Bốc Luồng Xưởng 2 (link lô "Luồng cây..." ở tab Nguyên Liệu)
    loadXuong2BoOng(); // Nhật ký Bổ Ống Xưởng 2 (link lô ống từ Cắt Chọn)
    loadXuong2BaoTho(); // Nhật ký Chạy Máy Bào Thô Xưởng 2 (link lô đã bổ)
    loadXuong2ChonNan(); // Nhật ký Chọn Nan Thô Xưởng 2 (link lô đã bào thô)
    loadXuong2Bullig(); // Nhật ký Bullig Xưởng 2 (Gia công + Chọn thanh)
    loadSuppliers(); // Bảng Thông Tin Nhà Cung (tab Nguyên Liệu)
    loadX2CapRates(); // Định mức công suất cắt theo tháng (tab Công Đoạn)
    loadX2BoluongRates(); // Định mức công suất bốc luồng theo tháng (kg/h)
    loadX2BoOngRates(); // Định mức công suất bổ ống theo tháng (tab Công Đoạn)
    loadX2BaoThoRates(); // Định mức công suất bào thô theo tháng (thanh/giờ)
    loadX2ChonNanRates(); // Định mức công suất chọn nan theo tháng (thanh/giờ)
    loadX2BulligRates(); // Định mức công suất Bullig theo tháng + công đoạn (thanh/giờ)
    loadXuong2BaoTinh(); // Nhật ký Bào Tinh Xưởng 2 (loại bào · nguồn thanh · đạt/lỗi)
    loadX2BaoThanhOutSizes(); // Cỡ ĐẦU RA khai báo thêm của "Bào thanh" (thẻ Bào Tinh)
    loadX2BaoTinhRates(); // Định mức công suất bào tinh theo tháng (thanh/giờ)
    loadX2EpVanRates(); // Định mức công suất ÉP VÁN theo tháng (m³/giờ) — thẻ Ép Ván
    loadX2LotLocations(); // Vị trí sấy khai báo thêm ngoài LS1..LS15 (Than Hóa + Sấy)
    loadKhoNotes(); // PHIẾU KHO (xuất / tiêu hủy / tái chế) + công tắc hiện lô đã xuất hết
    loadX2SayRates(); // Định mức THỜI GIAN THAN HÓA (phút/m³) theo tháng + công đoạn sấy
    loadX2SayTimes(); // Số lần than hóa THẬT theo nhóm (ngày + công đoạn sấy của thẻ Than Hóa + Sấy)
    loadX2SayIncidents(); // Giờ SỰ CỐ CHO PHÉP theo ngày (tính Hiệu suất ngày than hóa)
    loadX2StageIncidents(); // Giờ SỰ CỐ CHO PHÉP theo (thẻ công đoạn, ngày) — 7 thẻ Xưởng 2
    loadQcExports();
    loadQcFinal();       // KIỂM SAU SẢN XUẤT (QC kiểm thành phẩm — js/qc-final.js)
    loadQcFinalRates();  // Định mức kiểm sau sản xuất theo tháng (tấm/h)
    loadQcPressLogs();   // NHẬT KÝ THEO DÕI ÉP VÁN (verdict PASS/Fail — js/qc-press.js)
    loadKilnData(); // Độ ẩm lò sấy + ngưỡng đạt (QC nhập hàng ngày — js/kiln.js)
    loadHrData();
    // DỌN DỮ LIỆU CŨ: xóa hẳn lô nan còn sót stage 'bao_tinh' (cột Kanban "4. Bào
    // Tinh" đã gỡ — số liệu Bào Tinh nay nằm ở thẻ riêng state.xuong2BaoTinhRecords).
    // Chụp backup force TRƯỚC khi xóa + ghi tombstone chặn mây/máy khác đẩy ngược.
    // Chạy TRƯỚC initHistory để snapshot nền lịch sử đã sạch (không ghi 1 entry
    // xóa hàng loạt vào log sửa đổi).
    purgeLegacyBaoTinhBatches();
    // Lịch sử sửa đổi: nạp + lập snapshot nền SAU CÙNG (sau khi toàn bộ
    // load*() đã xong) — để lần sửa đầu tiên là so sánh được chính xác
    initHistory();
    // Nhớ lại trạng thái thu gọn của các bảng dữ liệu (định mức, lượt ép, nguyên liệu)
    restoreRateTableCollapse();
    setupEventListeners();
    setupFormCalculations();
    // Áp công tắc XƯỞNG 1 / XƯỞNG 2 theo trạng thái ĐÃ NHỚ từ lần trước
    // (gọi sau setupEventListeners để nút đã tồn tại trong DOM)
    applyStageWsDom();
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
      if (document.visibilityState === 'hidden') { flushPendingCloudPush(); photoSyncKick(); }
    });
    // Xoay màn hình / đổi kích thước: áp dụng lại chế độ xem công đoạn của Kanban
    let kanbanResizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(kanbanResizeTimer);
      kanbanResizeTimer = setTimeout(filterMobileKanbanColumns, 150);
    });
    window.addEventListener('pagehide', () => { flushPendingCloudPush(); photoSyncKick(); });
    window.addEventListener('online', () => { flushPendingCloudPush(); photoSyncKick(); });
    // Trạng thái kênh ảnh (số ảnh chờ) hiện cạnh nút "Đồng Bộ Ảnh Ngay" ở menu ⋮
    updatePhotoSyncUI();
      bootOk = true; // boot trọn vẹn → game chờ bấm / auto gãy sau cửa sổ
    } finally {
      hideTreLoading(bootOk);
      // TẢI SẴN bảng Kanban TRONG LÚC overlay còn mở → tab đầu không lag
      if (bootOk) {
        const t = setTimeout(preloadCoreViews, 150);
        if (t && typeof t.unref === 'function') t.unref(); // Node test không bị giữ
      }
    }
  });
  // ─── VIEW SWITCHING ───────────────────────────────────────────
  // ─── ĐÓNG POP-UP / MODAL THUỘC TAB VỪA RỜI KHI CHUYỂN TAB ──────
  // 7 modal/pop-up nằm BÊN TRONG view-panel (Xưởng 2, Kế Hoạch ×3, QC ×2,
  // Nhân Sự). Rời tab mà chưa đóng → overlay ẩn nhưng VẪN giữ class .show ⇒
  // rule CSS khoá cuộn nền sẽ khoá cả trang (mọi tab không cuộn xuống được).
  // Vì vậy: rời tab nào thì đóng pop-up/modal của tab đó (đúng UX + cập nhật
  // luôn trạng thái "thẻ đang mở" của Xưởng 2 / QC / Nhân Sự).
  function closeViewScopedModals(viewEl) {
    if (!viewEl) return;
    if (viewEl.id === 'kanban-view') { try { x2CloseOpenCard(); } catch (e) {} }
    if (viewEl.id === 'qc-view') { try { qcCloseOpenCard(); } catch (e) {} }
    if (viewEl.id === 'hr-view') { try { hrCloseOpenCard(); } catch (e) {} }
    if (typeof viewEl.querySelectorAll !== 'function') return;
    viewEl.querySelectorAll('.modal-overlay.show').forEach(o => o.classList.remove('show'));
  }

  // ─── CỜ "KANBAN CẦN VẼ LẠI" + NỘI DUNG TRANG TRÍ HOÃN 1 FRAME ───────
  // Chuyển tab Công Đoạn SX trước đây LUÔN phá + dựng lại toàn bộ bảng Kanban
  // (hàng trăm thẻ lô) dù dữ liệu KHÔNG đổi → giật/mỏi máy, đặc biệt điện
  // thoại. Mọi đường ghi dữ liệu đều đi qua renderAll() (quy tắc dự án) nên
  // renderAll ĐẶT cờ; renderKanbanBoard (js/kanban.js) gọi markKanbanPainted()
  // NGAY SAU khi vẽ xong.
  let kanbanDirty = true;      // true = dữ liệu đổi mà bảng chưa vẽ lại
  let kanbanPaintedSig = '';   // chữ ký dữ liệu của lần vẽ gần nhất
  let dashboardDirty = true;   // true = dữ liệu đổi mà trang trí tab Tổng Quan chưa vẽ
  function kanbanBoardSignature() {
    // LƯỚI AN TOÀN: chữ ký NHẸ — nếu có chỗ sửa state mà quên gọi renderAll
    // thì vẫn phát hiện để vẽ lại (không bao giờ hiển thị bảng Kanban cũ).
    const cols = state.columnFilters || {};
    return [
      (state.batches || []).length,
      (state.kanbanPicked || []).join(','),
      state.khoShowUsed ? 1 : 0,
      state.stageWs || '',
      JSON.stringify(cols)
    ].join('|');
  }
  function kanbanNeedsPaint() {
    return kanbanDirty || kanbanPaintedSig !== kanbanBoardSignature();
  }
  // Gọi từ js/kanban.js sau mỗi lần renderKanbanBoard xong
  function markKanbanPainted() {
    kanbanDirty = false;
    kanbanPaintedSig = kanbanBoardSignature();
  }
  // ─── TRANG TRÍ HOÃN 1 FRAME SAU KHI TAB ĐÃ HIỆN ─────────────────────
  // Biểu đồ Dashboard + Bảng Tổng hợp Công suất + sparkline mini card chỉ để
  // TRANG TRÍ — dựng đồng bộ giữ main-thread nên tab "đứng hình" vài trăm ms.
  // Nền tab đã bật class .active xong → hoãn phần trang trí sang frame kế để
  // trình duyệt VẼ TAB TRƯỚC. Gọi render trực tiếp (test, nút bấm trong trang)
  // VẪN đồng bộ như cũ.
  // CỜ theo TỪNG TAB: true = dữ liệu ĐỔI từ lần vẽ trang trí gần nhất → lần
  // sau MỚI vẽ lại (qua lại giữa các tab mà dữ liệu không đổi = 0 công sức).
  // Cờ được GIỮ NGUYÊN nếu khung hoãn bị hủy giữa chừng (người dùng chuyển
  // tab khác trước khi khung chạy) → lần tới quay lại tab vẫn vẽ đủ.
  let decorKanban = false;    // sparkline tab Công Đoạn (cùng cờ với bảng Kanban)
  let decorDashboard = false; // biểu đồ + Bảng Tổng hợp tab Tổng Quan
  let decorRafId = 0;
  function scheduleViewDecor(targetViewId, needed) {
    if (targetViewId === 'kanban-view' && needed) decorKanban = true;
    if (targetViewId === 'dashboard-view' && needed) decorDashboard = true;
    if (decorRafId) return; // đã có khung chờ — khung đó tự xem tab đang đứng
    const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : cb => setTimeout(cb, 0);
    decorRafId = raf(() => {
      decorRafId = 0;
      const v = state.activeView; // tab ĐANG đứng lúc khung chạy
      if (v === 'kanban-view' && decorKanban) {
        decorKanban = false;
        try { renderX2MiniSparklines(); } catch (e) { /* không phá tab */ }
        return;
      }
      if (v === 'dashboard-view' && decorDashboard) {
        decorDashboard = false;
        try { renderDashboardCharts(); } catch (e) { /* không phá tab */ }
        try { renderCapacityCard(); } catch (e) { /* không phá tab */ }
      }
    });
  }

  // ─── MỞ TAB LẦN ĐẦU TRONG PHIÊN → CHẠY HẾT ANIMATION LOADING ────────
  // Mỗi tab chỉ 1 lần đầu tiên được mở trong phiên: overlay "nông dân chặt
  // tre" phải chạy TRỌN cảnh (chặt → tre GÃY → mờ) dù nội dung tab render
  // xong tức thì (minShow = TRE_TIMING.firstTab). Từ lần 2 trở đi: chuyển
  // tab như cũ, KHÔNG hiện overlay. Các chỗ chờ khác (boot · AI · Excel ·
  // mây · backup) giữ nguyên logic cũ. Tab Tổng Quan coi như ĐÃ mở từ boot
  // (boot đã chạy trọn animation ngay khi vào trang).
  const treVisitedViews = new Set(['dashboard-view']);
  const VIEW_LOADING_LABELS = {
    'dashboard-view': 'Đang tải tab Tổng Quan…',
    'kanban-view': 'Đang tải tab Công Đoạn SX…',
    'planning-view': 'Đang tải tab Kế Hoạch…',
    'materials-view': 'Đang tải tab Nguyên Liệu…',
    'qc-view': 'Đang tải tab QC…',
    'hr-view': 'Đang tải tab Nhân Sự…'
  };

  function switchView(targetViewId) {
    // Lần đầu mở tab NÀY (bấm lại tab đang đứng = không tính là mở lại)
    const firstVisit = targetViewId !== state.activeView && !treVisitedViews.has(targetViewId);
    if (firstVisit) showTreLoading(VIEW_LOADING_LABELS[targetViewId] || 'Đang tải dữ liệu nhà máy…', { dur: TRE_TIMING.firstTab });
    let tabOk = true; // render tab trọn vẹn → tre gãy; lỗi → tre đứng im rồi overlay mờ
    try {
      switchViewCore(targetViewId);
    } catch (e) {
      tabOk = false;
      throw e; // giữ nguyên hành vi lỗi của switchView cũ (ném ra cho nơi gọi)
    } finally {
      if (firstVisit) {
        treVisitedViews.add(targetViewId); // đã mở rồi → lần sau không loading nữa
        // Chờ đủ TRE_TIMING.firstTab cảnh "đang chặt" rồi mới gãy — dù render
        // tab chạy xong trong vài ms, người dùng vẫn thấy trọn animation
        hideTreLoading(tabOk, { minShow: TRE_TIMING.firstTab });
      }
    }
  }

  function switchViewCore(targetViewId) {
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
    // Rời tab → đóng pop-up/modal THUỘC TAB VỪA RỜI (tránh overlay ẩn còn class
    // .show làm mất cuộn ở tab mới — xem closeViewScopedModals)
    if (prevView && prevView !== targetViewId) closeViewScopedModals(document.getElementById(prevView));
    // Rời tab Công Đoạn → thoát luôn chế độ Xóa Nhiều (thanh nổi + ô tích không
    // treo lơ lửng ở tab khác; không vẽ lại — tab mới tự vẽ nội dung khi mở)
    if (prevView === 'kanban-view' && targetViewId !== 'kanban-view') {
      try { exitKanbanPickMode(false); } catch (e) {}
    }
    if (targetViewId === 'dashboard-view') {
      // Biểu đồ + Bảng TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT (thẻ đầu tab Tổng Quan):
      // hoãn 1 frame (xem scheduleViewDecor) — tab hiện ra trước, trang trí lấp
      // frame kế; dữ liệu CHƯA đổi từ lần vẽ trước → bỏ qua luôn (0 công sức)
      scheduleViewDecor(targetViewId, dashboardDirty);
    }
    // Khu Vị Trí Xưởng 2 + bảng Kanban lô nan (tab Công Đoạn)
    if (targetViewId === 'kanban-view') {
      // CHỈ vẽ lại khu Kanban khi dữ liệu ĐỔI (renderAll đặt cờ) hoặc chữ ký
      // đổi — qua lại giữa các tab không còn phá/dựng lại hàng trăm thẻ lô
      // mỗi lần (nguyên nhân gây giật khi chuyển tab Công Đoạn SX).
      const needPaint = kanbanNeedsPaint();
      if (needPaint) {
        renderKanbanBoard(getFilteredBatches());
        renderXuong2Cards(); // đếm trên mini card launcher (cùng cờ dirty)
      }
      // Áp lại công tắc XƯỞNG 1 / XƯỞNG 2 (grid ẩn/hiện + nút đang chọn)
      applyStageWsDom();
      // Sparkline hiệu suất 8 tuần trên mini card = trang trí → hoãn 1 frame,
      // dùng CHUNG cờ với bảng (dữ liệu không đổi thì bỏ qua)
      scheduleViewDecor(targetViewId, needPaint);
      filterMobileKanbanColumns();
    }
    if (targetViewId === 'planning-view') renderPlanningView();
    if (targetViewId === 'materials-view') renderMaterialView();
    if (targetViewId === 'qc-view') renderQcView();
    if (targetViewId === 'hr-view') renderHrView();
    // "Nan Bot" chào + nhắc nhanh theo tab vừa mở (tầng offline hiện ngay,
    // tầng AI lầy hơn sẽ tự thay câu khi có key + mạng + còn quota)
    try { aiAutoGreet(targetViewId); } catch (e) { /* lỗi gợi ý tự động — bỏ qua */ }
    // Vẽ icon lucide của tab vừa mở: svg CŨ đã bị gỡ data-lucide nên lần này
    // chỉ xử lý <i data-lucide> MỚI (rẻ). Trước đây switchView KHÔNG gọi —
    // icon trên thẻ lô chỉ được vẽ nhờ aiAutoGreet (ngẫu nhiên) nên CÓ THỂ MẤT
    // khi Nan Bot đã chào trong ngày hoặc công tắc tự chào đang tắt.
    initLucide();
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
    // Mọi đường ghi dữ liệu đều đi qua đây → báo bảng Kanban CẦN VẼ LẠI khi
    // người dùng mở tab Công Đoạn (xem kanbanNeedsPaint — khỏi phá/dựng lại
    // hàng trăm thẻ lô mỗi lần qua lại giữa các tab) + báo trang trí tab Tổng
    // Quan (biểu đồ + Bảng Tổng hợp) cũng cần vẽ lại (xem scheduleViewDecor)
    kanbanDirty = true;
    dashboardDirty = true;
    const filtered = getFilteredBatches();
    // TỐI ƯU: chỉ vẽ lại khu Kanban khi tab Công Đoạn đang mở. Trước đây MỖI
    // lần lưu/đồng bộ mây đều vẽ lại toàn bộ bảng Kanban (mỗi thẻ 1 khối DOM)
    // dù người dùng đang ở tab khác — gây giật/lag đặc biệt khi online (mỗi
    // snapshot mây đều gọi renderAll). Khi chuyển sang tab Công Đoạn,
    // switchView() sẽ tự vẽ đầy đủ khu này.
    if (state.activeView === 'kanban-view') {
      renderKanbanBoard(filtered);
      renderXuong2Cards(); // đếm trên thẻ launcher Vị Trí Xưởng 2 (tab Công Đoạn)
      filterMobileKanbanColumns();
    }
    if (state.activeView === 'dashboard-view') {
      renderDashboardCharts();
      // Bảng TỔNG HỢP CÔNG SUẤT & HIỆU SUẤT (thẻ đầu tab Tổng Quan — js/capacity.js)
      renderCapacityCard();
      dashboardDirty = false; // vừa vẽ xong tại chỗ → không phải vẽ lại khi quay lại tab
    }
    if (state.activeView === 'planning-view') renderPlanningView();
    if (state.activeView === 'materials-view') renderMaterialView();
    if (state.activeView === 'qc-view') renderQcView();
    if (state.activeView === 'hr-view') renderHrView();
    if (state.activeView === 'kanban-view') {
      // Sparkline hiệu suất 8 tuần trên các mini card launcher Xưởng 2 (js/capacity.js)
      renderX2MiniSparklines();
    }
    initLucide();
  }

  // ─── PUBLIC API ───────────────────────────────────────────────
  window.app = {
    openBatchFormModal,
    openEditModal: id => openBatchFormModal(id),
    openCustomExportModal,
    openChartBuilderModal: (chartId, preset) => openChartBuilderModal(chartId, preset),
    openEditChartModal: id => openChartBuilderModal(id),
    openUserPermsModal: id => openUserPermsModal(id),
    deleteCustomChart,
    // Mở rộng biểu đồ toàn màn hình / xoay ngang (nút ⤢ trên thẻ biểu đồ)
    toggleChartExpand,
    deleteBatch,
    x2SayChargeLabel: sayBatchChargeLabel,
    x2BaoTinhUsedLabel: baoTinhUsedLabel,
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
  markKanbanPainted,
  renderAll,
  setActiveMobileStage,
  switchView
};
