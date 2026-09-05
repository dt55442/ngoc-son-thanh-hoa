// ═══════════════════════════════════════════════════════════
// js/dashboard.js — DASHBOARD TỔNG QUAN & HỆ BIỂU ĐỒ ĐA VÙNG
// ───────────────────────────────────────────────────────────
// Dashboard = màn hình mặc định, gồm:
//   1. Luồng công đoạn (Kanban)
//   2. Biểu đồ tĩnh "Kế Hoạch vs Đã Ép" (theo sản phẩm, đổi tấm ↔ m³)
//   3. VÙNG CƠ BẢN  : biểu đồ ai cũng xem được
//   4. VÙNG NÂNG CAO: chỉ Admin & Ban Quản Lý (hoặc người được cấp)
// Toàn bộ biểu đồ tùy chỉnh của các tab được TẬP TRUNG tại Dashboard.
// ═══════════════════════════════════════════════════════════
import { initLucide, requireEditPermission, requireTabEditPermission } from './cloud.js';
import { computeChartData, getPaletteColors, saveCustomCharts } from './export-xlsx.js';
import { canEditChartZone, canEditTab, canViewAdvanced, getTabDef } from './permissions.js';
import { MATERIAL_LOCATIONS } from './materials.js';
import { renderPlanVsPressChart, renderPlanCapacityChart } from './press.js';
import { STAGES, state } from './state.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';

  // ─── NHẬP DASHBOARD: LUỒNG + CÁC VÙNG BIỂU ĐỒ ────────────────
  function renderDashboardCharts() {
    renderStageFlow();
    renderPlanVsPressChart();
    renderPlanCapacityChart();
    renderDashboardZones();
  }

  // ─── LUỒNG CÔNG ĐOẠN (Kanban pipeline) ───────────────────────
  function renderStageFlow() {
    const batches = state.batches;
    const totalVol = batches.reduce((a, b) => a + (b.volume || 0), 0);

    const el = id => document.getElementById(id);

    // Stage Pipeline
    const stageVols   = { say1: 0, say2: 0, kho: 0, bao_tinh: 0 };
    const stageCounts = { say1: { b: 0, q: 0 }, say2: { b: 0, q: 0 }, kho: { b: 0, q: 0 }, bao_tinh: { b: 0, q: 0 } };
    batches.forEach(b => {
      if (stageVols[b.stage] !== undefined) {
        stageVols[b.stage] += (b.volume || 0);
        stageCounts[b.stage].b++;
        stageCounts[b.stage].q += (b.quantity || 0);
      }
    });
    Object.keys(stageVols).forEach(st => {
      const vol = stageVols[st], pct = totalVol > 0 ? (vol / totalVol) * 100 : 0;
      const key = st.replace('_', '-');
      if (el(`flow-vol-${key}`))   el(`flow-vol-${key}`).textContent   = `${vol.toFixed(3)} m³`;
      if (el(`flow-bar-${key}`))   el(`flow-bar-${key}`).style.width   = `${Math.max(pct, 4)}%`;
      if (el(`flow-count-${key}`)) el(`flow-count-${key}`).textContent = `${stageCounts[st].b} lô - ${stageCounts[st].q.toLocaleString('vi-VN')} thanh (${pct.toFixed(1)}%)`;
    });
  }
  // ─── HIỂN THỊ GIÁ TRỊ / TỶ LỆ % TRÊN BIỂU ĐỒ ─────────────────
  function formatChartValue(v) {
    v = Number(v) || 0;
    if (Number.isInteger(v)) return v.toLocaleString('vi-VN');
    return v.toFixed(2).replace(/\.?0+$/, '');
  }

  // Plugin nội bộ Chart.js: hiển thị giá trị trên cột/điểm,
  // và tỷ lệ % trên biểu đồ tròn / vành khăn
  function registerChartDataLabelsPlugin() {
    if (!window.Chart) return;
    const dataLabelPlugin = {
      id: 'bambooDataLabels',
      afterDatasetsDraw(chart, args, opts) {
        // Biểu đồ chủ động tắt (options.plugins.bambooDataLabels = false)
        // vì đã có plugin nhãn riêng (VD: Kế Hoạch vs Đã Ép) — tránh vẽ đè đôi
        if (chart.options && chart.options.plugins && chart.options.plugins.bambooDataLabels === false) return;
        const ctx = chart.ctx;
        const chartType = chart.config.type;

        // ── Biểu đồ tròn / vành khăn: hiển thị % của 100% ──
        if (chartType === 'pie' || chartType === 'doughnut') {
          const dataset = chart.data.datasets[0];
          if (!dataset || !dataset.data) return;
          const total = dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
          if (total <= 0) return;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;
          meta.data.forEach((arc, i) => {
            const val = Number(dataset.data[i]) || 0;
            const pct = (val / total) * 100;
            if (pct < 0.5) return; // Bỏ qua lát quá nhỏ gây rối mắt
            let cx = arc.x, cy = arc.y;
            if (typeof arc.getCenterPoint === 'function') {
              const cp = arc.getCenterPoint();
              cx = cp.x; cy = cp.y;
            }
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${pct.toFixed(1)}%`, cx, cy);
            ctx.restore();
          });
        }

        // ── Cột / điểm / thanh ngang: hiển thị giá trị ──
        const isLine = chartType === 'line';
        const isHorizontal = chartType === 'bar' && chart.options.indexAxis === 'y';
        const isStacked = !!(chart.options.scales && chart.options.scales.x && chart.options.scales.x.stacked) ||
                          !!(chart.options.scales && chart.options.scales.y && chart.options.scales.y.stacked);
        if (isLine || isHorizontal || chartType === 'bar') {
          chart.data.datasets.forEach((dataset, dIdx) => {
            const meta = chart.getDatasetMeta(dIdx);
            if (!meta || !meta.data) return;
            meta.data.forEach((el, i) => {
              const val = Number(dataset.data[i]) || 0;
              if (val === 0) return;
              const label = formatChartValue(val);

              ctx.save();
              ctx.font = 'bold 10px "Inter", sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              if (isLine) {
                ctx.fillStyle = '#111827';
                ctx.fillText(label, el.x, el.y - 12);
              } else if (isHorizontal) {
                if (isStacked) {
                  ctx.fillStyle = '#ffffff';
                  const segW = el.width || 0;
                  ctx.fillText(label, el.x - segW / 2, el.y);
                } else {
                  ctx.fillStyle = '#1e293b';
                  ctx.textAlign = 'left';
                  ctx.fillText(label, el.x + 4, el.y);
                }
              } else {
                if (isStacked) {
                  ctx.fillStyle = '#ffffff';
                  const segH = el.height || 0;
                  ctx.fillText(label, el.x, el.y + segH / 2);
                } else {
                  ctx.fillStyle = '#1e293b';
                  ctx.textBaseline = 'bottom';
                  ctx.fillText(label, el.x, el.y - 4);
                }
              }
              ctx.restore();
            });
          });
        }
      }
    };
    Chart.register(dataLabelPlugin);
  }

  registerChartDataLabelsPlugin();
  // ─── THẺ BIỂU ĐỒ & CÁC VÙNG HIỂN THỊ ─────────────────────────
  const TYPE_ICONS = { bar: 'bar-chart-3', horizontalBar: 'bar-chart-2', stackedBar: 'layers', line: 'trending-up', pie: 'pie-chart', doughnut: 'loader' };

  // Nhãn nguồn dữ liệu (tab) của biểu đồ
  function sourceChipHtml(source) {
    const tab = getTabDef(source || 'kanban');
    if (!tab) return '';
    return `<span class="chart-source-chip" style="--chip-color:${tab.color};"><i data-lucide="${tab.icon}"></i>${escapeHTML(tab.short)}</span>`;
  }

  // Nhãn vùng (chỉ gắn cho vùng nâng cao)
  function zoneChipHtml(zone) {
    return zone === 'advanced' ? `<span class="chart-zone-chip" title="Biểu đồ vùng nâng cao"><i data-lucide="shield"></i>NÂNG CAO</span>` : '';
  }

  // HTML của 1 thẻ biểu đồ (card). showTools: hiện nút sửa/xóa theo quyền.
  function renderChartCard(chartDef, showTools) {
    const canvasId = `custom-canvas-${chartDef.id}`;
    const schema = BUILDER_SCHEMA[chartDef.source || 'kanban'];
    const groupLabel = (schema.groupBy.find(g => g[0] === chartDef.groupBy) || [, chartDef.groupBy])[1];
    const metricLabel = (schema.metric.find(g => g[0] === chartDef.metric) || [, chartDef.metric])[1];
    let subtitle = `Nhóm: ${groupLabel} • Chỉ số: ${metricLabel}`;
    if (chartDef.stackBy && chartDef.stackBy !== 'none') {
      const stackLabel = (schema.groupBy.find(g => g[0] === chartDef.stackBy) || [, chartDef.stackBy])[1];
      subtitle += ` • Xếp tầng: ${stackLabel}`;
    }
    // Tóm tắt bộ lọc đang bật của biểu đồ (theo schema của nguồn).
    // Giá trị bộ lọc có thể là chuỗi đơn (bản cũ) hoặc MẢNG nhiều giá trị (đa chọn).
    const activeFilters = ((BUILDER_SCHEMA[chartDef.source || 'kanban'] || {}).filters || [])
      .map(f => ({ f, val: chartDef[f.id] }))
      .filter(x => x.val !== undefined && x.val !== null && x.val !== '' && x.val !== 'all' && !(Array.isArray(x.val) && x.val.length === 0))
      .map(x => {
        const valArr = (Array.isArray(x.val) ? x.val : [x.val]).map(String);
        // Ánh xạ giá trị thô → nhãn thân thiện (options là hàm sinh theo schema)
        let disp = valArr;
        try {
          const opts = (typeof x.f.options === 'function' ? x.f.options() : (x.f.opts || x.f.options || [])).map(asOptPair);
          disp = valArr.map(v => {
            const m = opts.find(([ov]) => String(ov) === v);
            return m ? String(m[1]) : v;
          });
        } catch (e) { /* giữ giá trị thô */ }
        if (x.f.type === 'date') disp = disp.map(d => formatDateDDMMYY(d) || d);
        return `${x.f.label}: ${disp.join(', ')}`;
      });
    if (activeFilters.length) {
      subtitle += ` • Lọc: ${activeFilters.slice(0, 3).join(' • ')}${activeFilters.length > 3 ? ` (+${activeFilters.length - 3})` : ''}`;
    }
    const tools = showTools ? `
      <button class="btn btn-outline btn-icon" onclick="app.openEditChartModal('${chartDef.id}')" title="Chỉnh sửa biểu đồ">
        <i data-lucide="edit-3"></i>
      </button>
      <button class="btn btn-outline btn-icon btn-delete-chart" onclick="app.deleteCustomChart('${chartDef.id}')" title="Xóa biểu đồ">
        <i data-lucide="trash-2"></i>
      </button>` : '';
    // Nút mở rộng toàn màn hình: LUÔN hiển thị (kể cả người chỉ xem) — quan trọng trên điện thoại
    const expandBtn = `
      <button class="btn btn-outline btn-icon btn-expand-chart" onclick="app.toggleChartExpand(this)" title="Mở rộng toàn màn hình (tự xoay ngang trên điện thoại)">
        <i data-lucide="maximize"></i>
      </button>`;
    return `
      <div class="custom-chart-card ${chartDef.width === 'full' ? 'full-width' : ''}" data-chart-id="${chartDef.id}">
        <div class="drag-handle" title="Kéo để sắp xếp vị trí biểu đồ">
          <i data-lucide="grip-vertical"></i>
        </div>
        <div class="resize-handle" title="Kéo ngang để mở rộng/thu hẹp biểu đồ">
          <i data-lucide="maximize-2"></i>
        </div>
        <div class="custom-card-header">
          <div>
            <div class="custom-card-chips">${sourceChipHtml(chartDef.source)}${zoneChipHtml(chartDef.zone)}</div>
            <h4 class="custom-card-title">
              <i data-lucide="${TYPE_ICONS[chartDef.type] || 'bar-chart-3'}"></i>
              ${escapeHTML(chartDef.title)}
            </h4>
            <p class="custom-card-subtitle">${escapeHTML(subtitle)}</p>
          </div>
          <div class="custom-chart-tools">${expandBtn}${tools}</div>
        </div>
        <div class="custom-chart-canvas-box">
          <canvas id="${canvasId}"></canvas>
        </div>
      </div>`;
  }

  // Vẽ Chart.js cho 1 thẻ vừa gắn vào DOM
  function mountChart(chartDef, batches) {
    const canvasId = `custom-canvas-${chartDef.id}`;
    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !window.Chart) return;
      const ctx = canvas.getContext('2d');
      const chartData = computeChartData(chartDef, batches);

      let chartType = chartDef.type;
      let indexAxis = 'x';
      if (chartType === 'horizontalBar') { chartType = 'bar'; indexAxis = 'y'; }
      if (chartType === 'stackedBar')    { chartType = 'bar'; }
      const isStacked = chartDef.type === 'stackedBar';

      state.customChartInstances[chartDef.id] = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
          indexAxis,
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: ['pie', 'doughnut'].includes(chartDef.type) || (chartDef.stackBy && chartDef.stackBy !== 'none'),
              position: 'top',
              labels: {
                font: { size: 11, weight: 'bold' },
                boxWidth: 12,
                // Mỗi nhãn legend được tô ĐÚNG màu của chuỗi dữ liệu tương ứng
                // (pie/doughnut: màu theo từng lát; cột: màu theo từng tầng/dataset)
                // → các tên nhãn nổi bật bằng màu sắc khác nhau, phân biệt tức thì
                color: (c) => {
                  const bg = c.dataset && c.dataset.backgroundColor;
                  if (Array.isArray(bg)) return bg[c.index != null ? c.index : c.datasetIndex] || bg[0] || '#334155';
                  return (typeof bg === 'string' && bg) ? bg : '#334155';
                }
              }
            },
            tooltip: {
              callbacks: {
                label: c => {
                  if (['pie', 'doughnut'].includes(chartDef.type)) {
                    const total = (c.dataset.data || []).reduce((a, b) => a + (Number(b) || 0), 0);
                    const pct = total > 0 ? ((Number(c.parsed) / total) * 100).toFixed(1) : '0.0';
                    return ` ${c.label || c.dataset.label}: ${formatChartValue(Number(c.parsed))} (${pct}%)`;
                  }
                  const v = c.parsed && c.parsed.y !== undefined ? c.parsed.y : c.parsed;
                  return ` ${c.dataset.label || c.label}: ${formatChartValue(Number(v))}`;
                }
              }
            }
          },
          scales: ['pie', 'doughnut'].includes(chartDef.type) ? {} : {
            x: { stacked: isStacked, beginAtZero: true, ticks: { font: { size: 10 } } },
            y: { stacked: isStacked, beginAtZero: true, ticks: { font: { size: 10 } } }
          }
        }
      });
    }, 50);
  }

  // Hủy toàn bộ instance biểu đồ cũ
  function destroyCustomChartInstances() {
    Object.values(state.customChartInstances).forEach(c => { if (c) c.destroy(); });
    state.customChartInstances = {};
  }

  // Thông báo "chưa có biểu đồ" cho 1 grid
  function emptyZoneHtml(text, onclickExpr, showBtn) {
    return `
      <div class="custom-charts-empty">
        <i data-lucide="bar-chart-2"></i>
        <h4>${escapeHTML(text)}</h4>
        <p style="font-size:0.8rem; margin:4px 0 12px 0;">Tạo biểu đồ để theo dõi các chỉ số đặc thù của bạn!</p>
        ${showBtn ? `<button class="btn btn-primary btn-sm" onclick="${onclickExpr}"><i data-lucide="plus-circle"></i> Tạo Biểu Đồ Mới</button>` : ''}
      </div>`;
  }
  // ─── VÙNG BIỂU ĐỒ TRONG DASHBOARD (cơ bản + nâng cao) ────────
  function renderDashboardZones() {
    const batches = state.batches;
    destroyCustomChartInstances();

    // Vùng Cơ Bản: biểu đồ zone='basic' — mọi người xem được
    const basicGrid = document.getElementById('custom-charts-grid');
    if (basicGrid) {
      const basicCharts = state.customCharts.filter(c => c.zone !== 'advanced');
      basicGrid.innerHTML = basicCharts.length
        ? basicCharts.map(c => renderChartCard(c, canEditChartZone(c.zone, c.source))).join('')
        : emptyZoneHtml('Chưa có biểu đồ ở Vùng Cơ Bản', "app.openChartBuilderModal(null, {zone:'basic'})", canEditTab('dashboard'));
      basicCharts.forEach(c => mountChart(c, batches));
    }

    // Vùng Nâng Cao: chỉ Admin & Ban Quản Lý / người được cấp quyền
    const advancedGrid = document.getElementById('advanced-charts-grid');
    const lockCard = document.getElementById('advanced-zone-lock');
    const addAdvancedBtn = document.getElementById('btn-add-chart-advanced');
    const privileged = canViewAdvanced();
    if (lockCard) lockCard.style.display = privileged ? 'none' : '';
    if (advancedGrid) advancedGrid.style.display = privileged ? '' : 'none';
    if (addAdvancedBtn) addAdvancedBtn.style.display = (privileged && canEditTab('dashboard')) ? '' : 'none';

    if (advancedGrid && privileged) {
      const advCharts = state.customCharts.filter(c => c.zone === 'advanced');
      advancedGrid.innerHTML = advCharts.length
        ? advCharts.map(c => renderChartCard(c, canEditTab(c.source || 'dashboard'))).join('')
        : emptyZoneHtml('Chưa có biểu đồ ở Vùng Nâng Cao', "app.openChartBuilderModal(null, {zone:'advanced'})", canEditTab('dashboard'));
      advCharts.forEach(c => mountChart(c, batches));
    }

    // Kích hoạt kéo-thả & resize cho các grid của Dashboard
    ['custom-charts-grid', 'advanced-charts-grid'].forEach(gid => {
      const grid = document.getElementById(gid);
      if (grid) {
        setupChartDragAndDrop(grid);
        setupChartResize(grid);
      }
    });
    initLucide();
  }

  // Tương thích: các nơi gọi cũ renderCustomCharts(batches)
  function renderCustomCharts(batches) {
    renderDashboardCharts(batches || state.batches);
  }
  // ─── DRAG & DROP SẮP XẾP BIỂU ĐỒ (trên 1 vùng bất kỳ) ─────────
  const _dragInitedContainers = new WeakSet();
  function setupChartDragAndDrop(container) {
    container = container || document.getElementById('custom-charts-grid');
    if (!container || _dragInitedContainers.has(container)) return;
    _dragInitedContainers.add(container); // chống nhân đôi listener khi re-render

    let draggedCard = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let isDragging = false;

    // Helper to get all chart cards in order
    function getChartCards() {
      return Array.from(container.querySelectorAll('.custom-chart-card'));
    }

    // Sắp xếp lại thứ tự: chỉ hoán đổi tương đối các biểu đồ CÓ trong
    // vùng này (không làm xáo trộn biểu đồ ở vùng khác)
    function syncChartsOrderFromDOM() {
      const order = getChartCards().map(card => card.getAttribute('data-chart-id'));
      const present = state.customCharts.filter(c => order.includes(c.id));
      present.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      let pi = 0;
      state.customCharts = state.customCharts.map(c => order.includes(c.id) ? present[pi++] : c);
      saveCustomCharts();
    }

    // Mouse-based drag & drop
    container.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      const card = handle.closest('.custom-chart-card');
      if (!card) return;

      e.preventDefault();
      draggedCard = card;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      isDragging = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!draggedCard) return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      // Only start dragging after moving more than 5px
      if (!isDragging && Math.abs(dx) + Math.abs(dy) > 5) {
        isDragging = true;
        draggedCard.classList.add('dragging');
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
      }

      if (!isDragging) return;

      // Find the card under the cursor
      const cards = getChartCards().filter(c => c !== draggedCard);
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Remove all drag-over classes
      cards.forEach(c => c.classList.remove('drag-over'));

      // Find the card to insert before/after
      let insertBefore = null;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Check if mouse is within the card bounds (with some tolerance)
        if (mouseX >= rect.left - 10 && mouseX <= rect.right + 10 &&
            mouseY >= rect.top - 10 && mouseY <= rect.bottom + 10) {
          // Determine if we should insert before or after based on mouse position
          if (mouseX < centerX || (Math.abs(mouseX - centerX) < 20 && mouseY < centerY)) {
            insertBefore = card;
          } else {
            insertBefore = card.nextElementSibling;
          }
          card.classList.add('drag-over');
          break;
        }
      }

      // Move the dragged card in DOM
      if (insertBefore) {
        container.insertBefore(draggedCard, insertBefore);
      } else {
        // If not over any card, move to end
        const lastCard = cards[cards.length - 1];
        if (lastCard && (mouseY > lastCard.getBoundingClientRect().bottom || mouseX > lastCard.getBoundingClientRect().right)) {
          container.appendChild(draggedCard);
        }
      }
    });

    document.addEventListener('mouseup', () => {
      if (!draggedCard) return;

      // Clean up
      draggedCard.classList.remove('dragging');
      getChartCards().forEach(c => c.classList.remove('drag-over'));
      document.body.style.userSelect = '';

      // Sync the order in state
      if (isDragging) {
        syncChartsOrderFromDOM();
        showToast('Đã sắp xếp lại vị trí biểu đồ!', 'success');
      }

      draggedCard = null;
      isDragging = false;
    });

    // Touch support for mobile
    let touchDraggedCard = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouchDragging = false;

    container.addEventListener('touchstart', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      const card = handle.closest('.custom-chart-card');
      if (!card) return;

      const touch = e.touches[0];
      touchDraggedCard = card;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isTouchDragging = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!touchDraggedCard) return;
      e.preventDefault();

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (!isTouchDragging && Math.abs(dx) + Math.abs(dy) > 10) {
        isTouchDragging = true;
        touchDraggedCard.classList.add('dragging');
      }

      if (!isTouchDragging) return;

      const cards = getChartCards().filter(c => c !== touchDraggedCard);
      const mouseX = touch.clientX;
      const mouseY = touch.clientY;

      cards.forEach(c => c.classList.remove('drag-over'));

      let insertBefore = null;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        if (mouseX >= rect.left - 10 && mouseX <= rect.right + 10 &&
            mouseY >= rect.top - 10 && mouseY <= rect.bottom + 10) {
          if (mouseX < centerX || (Math.abs(mouseX - centerX) < 20 && mouseY < centerY)) {
            insertBefore = card;
          } else {
            insertBefore = card.nextElementSibling;
          }
          card.classList.add('drag-over');
          break;
        }
      }

      if (insertBefore) {
        container.insertBefore(touchDraggedCard, insertBefore);
      } else {
        const lastCard = cards[cards.length - 1];
        if (lastCard && (mouseY > lastCard.getBoundingClientRect().bottom || mouseX > lastCard.getBoundingClientRect().right)) {
          container.appendChild(touchDraggedCard);
        }
      }
    }, { passive: false });

    container.addEventListener('touchend', () => {
      if (!touchDraggedCard) return;

      touchDraggedCard.classList.remove('dragging');
      getChartCards().forEach(c => c.classList.remove('drag-over'));

      if (isTouchDragging) {
        syncChartsOrderFromDOM();
        showToast('Đã sắp xếp lại vị trí biểu đồ!', 'success');
      }

      touchDraggedCard = null;
      isTouchDragging = false;
    }, { passive: true });
  }
  // ─── CHART RESIZE (KÉO MỞ RỘNG/THU HẸP BIỂU ĐỒ) ──────────────
  const _resizeInitedContainers = new WeakSet();
  function setupChartResize(container) {
    container = container || document.getElementById('custom-charts-grid');
    if (!container || _resizeInitedContainers.has(container)) return;
    _resizeInitedContainers.add(container); // chống nhân đôi listener khi re-render

    let resizingCard = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let isResizing = false;

    // Helper to get all chart cards
    function getChartCards() {
      return Array.from(container.querySelectorAll('.custom-chart-card'));
    }

    // Helper to sync width state
    function syncChartWidthFromDOM() {
      getChartCards().forEach(card => {
        const chartId = card.getAttribute('data-chart-id');
        const chartDef = state.customCharts.find(c => c.id === chartId);
        if (chartDef) {
          chartDef.width = card.classList.contains('full-width') ? 'full' : 'half';
        }
      });
      saveCustomCharts();
    }

    // Mouse-based resize
    container.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.resize-handle');
      if (!handle) return;
      const card = handle.closest('.custom-chart-card');
      if (!card) return;

      e.preventDefault();
      e.stopPropagation();
      resizingCard = card;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = card.offsetWidth;
      startHeight = card.offsetHeight;
      isResizing = false;
      card.classList.add('resizing');
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizingCard) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isResizing && Math.abs(dx) + Math.abs(dy) > 5) {
        isResizing = true;
        document.body.style.userSelect = 'none';
      }

      if (!isResizing) return;

      // Toggle full-width when dragged significantly
      const containerWidth = container.offsetWidth;
      const threshold = containerWidth * 0.6; // 60% of container width

      if (dx > 50 && startWidth < containerWidth * 0.6) {
        resizingCard.classList.add('full-width');
        resizingCard.style.width = '';
        resizingCard.style.height = '';
      } else if (dx < -50 && startWidth >= containerWidth * 0.6) {
        resizingCard.classList.remove('full-width');
        resizingCard.style.width = '';
        resizingCard.style.height = '';
      }
    });

    document.addEventListener('mouseup', () => {
      if (!resizingCard) return;

      resizingCard.classList.remove('resizing');
      document.body.style.userSelect = '';

      if (isResizing) {
        syncChartWidthFromDOM();
        showToast('Đã cập nhật kích thước biểu đồ!', 'success');
      }

      resizingCard = null;
      isResizing = false;
    });

    // Touch support for mobile
    let touchResizingCard = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartWidth = 0;
    let isTouchResizing = false;

    container.addEventListener('touchstart', (e) => {
      const handle = e.target.closest('.resize-handle');
      if (!handle) return;
      const card = handle.closest('.custom-chart-card');
      if (!card) return;

      const touch = e.touches[0];
      touchResizingCard = card;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartWidth = card.offsetWidth;
      isTouchResizing = false;
      card.classList.add('resizing');
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!touchResizingCard) return;
      e.preventDefault();

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;

      if (!isTouchResizing && Math.abs(dx) > 10) {
        isTouchResizing = true;
      }

      if (!isTouchResizing) return;

      const containerWidth = container.offsetWidth;

      if (dx > 50 && touchStartWidth < containerWidth * 0.6) {
        touchResizingCard.classList.add('full-width');
        touchResizingCard.style.width = '';
        touchResizingCard.style.height = '';
      } else if (dx < -50 && touchStartWidth >= containerWidth * 0.6) {
        touchResizingCard.classList.remove('full-width');
        touchResizingCard.style.width = '';
        touchResizingCard.style.height = '';
      }
    }, { passive: false });

    container.addEventListener('touchend', () => {
      if (!touchResizingCard) return;

      touchResizingCard.classList.remove('resizing');

      if (isTouchResizing) {
        syncChartWidthFromDOM();
        showToast('Đã cập nhật kích thước biểu đồ!', 'success');
      }

      touchResizingCard = null;
      isTouchResizing = false;
    }, { passive: true });
  }
  // ─── CHART BUILDER (TẠO/SỬA BIỂU ĐỒ THEO VÙNG & NGUỒN) ───────
  // Schema tùy chọn theo nguồn dữ liệu — thêm tab mới chỉ cần khai báo tại đây.
  // filters[]: bộ lọc RIÊNG của từng nguồn (renderBuilderFilters sinh giao diện
  // động từ đây; giá trị được lưu PHẲNG trên chartDef theo fd.id).
  // Sắp xếp tự nhiên: LS2 đứng trước LS10, Tuần 2 trước Tuần 10 (numeric collator)
  const viCollator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
  const uniqSorted = arr => [...new Set((arr || []).filter(v => v !== undefined && v !== null && String(v).trim() !== ''))].map(String).sort((a, b) => viCollator.compare(a, b));
  const numSortedDesc = arr => [...new Set((arr || []).filter(v => v !== undefined && v !== null && String(v).trim() !== ''))].map(String).sort((a, b) => Number(b) - Number(a));
  // Chuẩn hóa tùy chọn select về dạng cặp [value, label]:
  // một số provider trả chuỗi/số ĐƠN (Loại Nan, Dùng Cho, Vị Trí, Độ Dày, Tuần Kế Hoạch) —
  // nếu destructuring thẳng '[v, l]' thì chuỗi 'A1' bị tách ký tự (value 'A', label '1' → lỗi "undefined").
  const asOptPair = o => (Array.isArray(o)
    ? [String(o[0]), String(o[1] !== undefined && o[1] !== null ? o[1] : o[0])]
    : [String(o), String(o)]);
  // Sản phẩm: ánh xạ productId → tên định mức. ID không còn định mức (đã xóa/đổi)
  // được GỘP thành 1 lựa chọn "__orphan__" thay vì hiện mã thô vô nghĩa (rate-1756...).
  const ORPHAN_PRODUCT = '__orphan__';
  const productIdOptions = items => {
    const rates = state.materialRates || [];
    const opts = [], orphans = [];
    [...new Set((items || []).map(p => p.productId).filter(Boolean))].forEach(id => {
      const rate = rates.find(r => r.id === id);
      if (rate) opts.push([id, rate.product || id]); else orphans.push(id);
    });
    opts.sort((a, b) => viCollator.compare(String(a[1]), String(b[1])));
    if (orphans.length) opts.push([ORPHAN_PRODUCT, orphans.length > 1 ? `Sản phẩm cũ (định mức đã xóa — ${orphans.length} mã)` : 'Sản phẩm cũ (định mức đã xóa)']);
    return opts;
  };
  // Công nhân: nhập tay nên dễ trùng lặp kiểu "Nam" / "Nam " / "nam" — chuẩn hóa
  // (cắt khoảng trắng + gộp không phân biệt hoa/thường) và dùng biến thể phổ biến nhất làm nhãn.
  const normWorker = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const workerOptions = items => {
    const map = new Map();
    (items || []).forEach(r => {
      const raw = String(r.worker || '').trim(); if (!raw) return;
      const key = normWorker(raw);
      if (!map.has(key)) map.set(key, {});
      const variants = map.get(key);
      variants[raw] = (variants[raw] || 0) + 1;
    });
    return [...map.entries()].map(([key, variants]) =>
      [key, Object.entries(variants).sort((a, b) => b[1] - a[1])[0][0]]
    ).sort((a, b) => viCollator.compare(String(a[1]), String(b[1])));
  };

  const BUILDER_SCHEMA = {
    kanban: {
      label: 'Công Đoạn (Lô Nan)',
      groupBy: [
        ['stage', 'Công Đoạn'], ['thickness', 'Độ Dày'], ['dimFull', 'Kích Thước Đầy Đủ'],
        ['dimRatio', 'Dài × Rộng'], ['bambooType', 'Loại Nan'], ['useFor', 'Dùng Cho'],
        ['location', 'Vị Trí Lưu Kho'], ['week', 'Tuần Nhập'], ['date', 'Ngày Nhập']
      ],
      metric: [
        ['volume', 'Thể Tích (m³)'], ['quantity', 'Số Lượng (thanh)'],
        ['batchCount', 'Số Lô'], ['avgVolume', 'Thể Tích TB / Lô']
      ],
      stackBy: [['none', 'Không xếp tầng'], ['dimRatio', 'Dài × Rộng (1250×18, 1250×22...)'], ['bambooType', 'Loại Nan'], ['useFor', 'Dùng Cho'], ['location', 'Vị Trí Lưu Kho'], ['week', 'Tuần Nhập'], ['stage', 'Công Đoạn'], ['thickness', 'Độ Dày']],
      filters: [
        { id: 'stage',      label: 'Công Đoạn',      type: 'select', options: () => Object.entries(STAGES).map(([v, s]) => [v, s.short || s.name || v]) },
        { id: 'bambooType', label: 'Loại Nan',       type: 'select', options: () => uniqSorted(state.batches.map(b => b.bambooType)) },
        { id: 'useFor',     label: 'Dùng Cho',       type: 'select', options: () => uniqSorted(state.batches.map(b => b.useFor)) },
        { id: 'location',   label: 'Vị Trí Lưu Kho', type: 'select', options: () => uniqSorted(state.batches.map(b => b.location)) },
        { id: 'thickness',  label: 'Độ Dày (mm)',    type: 'select', options: () => uniqSorted(state.batches.map(b => b.thickness)) },
        { id: 'dateFrom',   label: 'Từ Ngày',        type: 'date' },
        { id: 'dateTo',     label: 'Đến Ngày',       type: 'date' }
      ]
    },
    planning: {
      label: 'Kế Hoạch Sản Xuất',
      groupBy: [['product', 'Sản Phẩm'], ['year', 'Năm'], ['week', 'Tuần']],
      metric: [['qty', 'SL Kế Hoạch (sản phẩm)'], ['itemCount', 'Số Mục Kế Hoạch'], ['avgQty', 'SL TB / Mục']],
      stackBy: [['none', 'Không xếp tầng'], ['product', 'Sản Phẩm'], ['year', 'Năm'], ['week', 'Tuần']],
      filters: [
        { id: 'year',    label: 'Năm',      type: 'select', options: () => numSortedDesc((state.planningItems || []).map(p => p.year)) },
        { id: 'product', label: 'Sản Phẩm', type: 'select', options: () => productIdOptions(state.planningItems) },
        { id: 'week',    label: 'Tuần',     type: 'select', options: () => uniqSorted((state.planningItems || []).map(p => p.week)) }
      ]
    },
    press: {
      label: 'Sản Lượng Ép Ván',
      groupBy: [['product', 'Sản Phẩm'], ['week', 'Tuần Ép'], ['month', 'Tháng'], ['worker', 'Công Nhân'], ['date', 'Ngày Ép'], ['fpDim', 'Kích Thước Thành Phẩm']],
      metric: [['finishedQty', 'SL Thành Phẩm (tấm)'], ['volume', 'Thể Tích Thành Phẩm (m³)'], ['glue', 'Keo tiêu thụ (kg)'], ['additive', 'Phụ gia (kg)'], ['recordCount', 'Số Lượt Ép'], ['avgQty', 'SL TB / Lượt']],
      stackBy: [['none', 'Không xếp tầng'], ['product', 'Sản Phẩm'], ['worker', 'Công Nhân'], ['week', 'Tuần Ép'], ['month', 'Tháng'], ['fpDim', 'Kích Thước Thành Phẩm']],
      filters: [
        { id: 'year',     label: 'Năm Ép',    type: 'select', options: () => numSortedDesc((state.pressRecords || []).map(r => r.year || (r.date || '').slice(0, 4))) },
        { id: 'product',  label: 'Sản Phẩm',  type: 'select', options: () => productIdOptions(state.pressRecords) },
        { id: 'worker',   label: 'Công Nhân', type: 'select', options: () => workerOptions(state.pressRecords) },
        { id: 'dateFrom', label: 'Từ Ngày',   type: 'date' },
        { id: 'dateTo',   label: 'Đến Ngày',  type: 'date' }
      ]
    },
    materials: {
      label: 'Nhập Nguyên Liệu',
      groupBy: [['location', 'Vị Trí (Dùng Cho)'], ['type', 'Loại Nguyên Liệu'], ['supplier', 'Nhà Cung Cấp'], ['week', 'Tuần Nhập'], ['month', 'Tháng'], ['date', 'Ngày Nhập']],
      metric: [['weight', 'Trọng Lượng (kg)'], ['amount', 'Thành Tiền (đ)'], ['inputIndex', 'Chỉ Số Đầu Vào'], ['outputIndex', 'Chỉ Số Đầu Ra'], ['recordCount', 'Số Lần Nhập']],
      stackBy: [['none', 'Không xếp tầng'], ['location', 'Vị Trí (Dùng Cho)'], ['type', 'Loại Nguyên Liệu'], ['supplier', 'Nhà Cung Cấp'], ['week', 'Tuần Nhập'], ['month', 'Tháng']],
      filters: [
        { id: 'location', label: 'Vị Trí (Dùng Cho)', type: 'select', options: () => MATERIAL_LOCATIONS.map(l => [l.key, l.label]) },
        { id: 'matType',  label: 'Loại Nguyên Liệu', type: 'select', options: () => uniqSorted((state.materialRecords || []).map(r => r.type)) },
        { id: 'supplier', label: 'Nhà Cung Cấp',      type: 'select', options: () => uniqSorted((state.materialRecords || []).map(r => r.supplier)) },
        { id: 'year',     label: 'Năm Nhập',          type: 'select', options: () => numSortedDesc((state.materialRecords || []).map(r => (r.date || '').slice(0, 4))) },
        { id: 'week',     label: 'Tuần Nhập',         type: 'select', options: () => uniqSorted((state.materialRecords || []).map(r => r.week)) },
        { id: 'dateFrom', label: 'Từ Ngày',           type: 'date' },
        { id: 'dateTo',   label: 'Đến Ngày',          type: 'date' }
      ]
    }
  };

  // ─── BỘ LỌC ĐA CHỌN CỦA CHART BUILDER (chọn 1 hoặc nhiều giá trị) ──
  // Giao diện: nút tóm tắt + panel checkbox; mục "Tất Cả" (MS_ALL) = bỏ lọc.
  // Giá trị LƯU trên chartDef theo fd.id:
  //   • 'all'      → Tất Cả (không lọc) — tương thích dữ liệu cũ
  //   • chuỗi đơn  → 1 giá trị (biểu đồ đã lưu từ bản cũ, vẫn đọc/hiển thị được)
  //   • mảng chuỗi → nhiều giá trị đã chọn
  const MS_ALL = '__all__';

  // Giá trị đã lưu → danh sách mục đang chọn (không gồm MS_ALL). [] = Tất Cả.
  function savedMsSelections(saved) {
    if (Array.isArray(saved)) return saved.map(String).filter(v => v && v !== MS_ALL);
    if (saved === undefined || saved === null || saved === '' || saved === 'all') return [];
    return [String(saved)];
  }
  // Nhãn tóm tắt trên nút dropdown: "Tất Cả" / nhãn mục đơn / "Đã chọn N mục"
  function msSummaryLabel(selVals, opts) {
    if (!selVals.length) return 'Tất Cả';
    if (selVals.length === 1) {
      const m = opts.find(([v]) => String(v) === String(selVals[0]));
      return m ? String(m[1]) : String(selVals[0]);
    }
    return `Đã chọn ${selVals.length} mục`;
  }
  // Đóng mọi dropdown đa chọn đang mở (trừ wrap chỉ định)
  function closeAllChartMs(exceptWrap) {
    document.querySelectorAll('.chart-ms.open').forEach(w => {
      if (w === exceptWrap || (exceptWrap && typeof exceptWrap.contains === 'function' && exceptWrap.contains(w))) return;
      w.classList.remove('open');
      const t = w.querySelector && w.querySelector('.chart-ms-toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }
  // Bấm ra ngoài các dropdown → đóng hết (gắn listener đúng 1 lần)
  let _chartMsOutsideWired = false;
  function ensureChartMsOutsideClose() {
    if (_chartMsOutsideWired) return;
    _chartMsOutsideWired = true;
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.chart-ms.open').forEach(w => {
        if (typeof w.contains === 'function' && !w.contains(e.target)) w.classList.remove('open');
      });
    });
  }
  // Gắn sự kiện cho 1 dropdown đa chọn (gọi sau khi render xong innerHTML)
  function wireChartMultiSelect(fid) {
    const toggle = document.getElementById(`builder-${fid}`);
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const wrap = typeof toggle.closest === 'function' ? toggle.closest('.chart-ms') : null;
        const willOpen = !(wrap && wrap.classList.contains('open'));
        closeAllChartMs(wrap);
        if (wrap) wrap.classList.toggle('open', willOpen);
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    }
    const panel = document.getElementById(`builder-${fid}-panel`);
    if (!panel) return;
    // Ủy quyền sự kiện change cho mọi checkbox trong panel
    panel.addEventListener('change', (e) => {
      const box = e.target;
      if (!box || box.type !== 'checkbox') return;
      syncChartMsChecks(fid, panel, box);
      updateChartBuilderPreview();
    });
  }
  // Đồng bộ trạng thái checkbox của 1 dropdown đa chọn:
  //  • tick "Tất Cả"     → bỏ tick mọi mục
  //  • tick 1 mục        → bỏ "Tất Cả"; nếu đủ TẤT CẢ các mục → thu gọn về "Tất Cả"
  //  • bỏ tick còn 0 mục → tự tick lại "Tất Cả"
  //  • cập nhật nhãn tóm tắt + trạng thái has-value trên nút dropdown
  function syncChartMsChecks(fid, panel, changed) {
    const boxes = Array.from(panel.querySelectorAll('input[type="checkbox"]'));
    const allBox = boxes.find(b => b.value === MS_ALL);
    const valBoxes = boxes.filter(b => b.value !== MS_ALL);
    const picked = () => valBoxes.filter(b => b.checked);
    if (changed === allBox) {
      if (allBox.checked) valBoxes.forEach(b => { b.checked = false; });
      else if (!picked().length) allBox.checked = true;
    } else if (changed.checked) {
      if (allBox) allBox.checked = false;
      if (valBoxes.length && valBoxes.every(b => b.checked)) {
        valBoxes.forEach(b => { b.checked = false; });
        if (allBox) allBox.checked = true;
      }
    } else if (!picked().length && allBox) {
      allBox.checked = true;
    }
    const sel = picked();
    const summary = document.getElementById(`builder-${fid}-summary`);
    if (summary) {
      if (!sel.length) summary.textContent = 'Tất Cả';
      else if (sel.length === 1) {
        const lab = typeof sel[0].closest === 'function' ? sel[0].closest('label') : null;
        const span = lab && lab.querySelector ? lab.querySelector('span') : null;
        summary.textContent = (span && span.textContent ? String(span.textContent) : sel[0].value).trim();
      } else {
        summary.textContent = `Đã chọn ${sel.length} mục`;
      }
    }
    const wrap = typeof panel.closest === 'function' ? panel.closest('.chart-ms') : null;
    if (wrap) wrap.classList.toggle('has-value', sel.length > 0);
  }

  // Gom giá trị bộ lọc hiện tại của Chart Builder theo schema của nguồn đang chọn.
  //  • select (đa chọn): 'all' khi "Tất Cả"/không chọn gì; ngược lại MẢNG giá trị đã chọn
  //  • date: chuỗi 'yyyy-mm-dd' ('' = không lọc)
  function collectBuilderFilterVals(source) {
    const vals = {};
    ((BUILDER_SCHEMA[source] || {}).filters || []).forEach(fd => {
      const ctl = document.getElementById(`builder-${fd.id}`);
      if (!ctl) return;
      if (fd.type === 'date') { vals[fd.id] = ctl.value || ''; return; }
      const panel = document.getElementById(`builder-${fd.id}-panel`);
      const boxes = (panel && typeof panel.querySelectorAll === 'function')
        ? Array.from(panel.querySelectorAll('input[type="checkbox"]'))
        : [];
      if (!boxes.length) { vals[fd.id] = ctl.value || 'all'; return; } // fallback: select đơn kiểu cũ
      const allBox = boxes.find(b => b.value === MS_ALL);
      const pickedVals = boxes.filter(b => b.value !== MS_ALL && b.checked).map(b => b.value);
      vals[fd.id] = (allBox && allBox.checked) || !pickedVals.length ? 'all' : pickedVals;
    });
    return vals;
  }

  // Sinh khối bộ lọc động trong Chart Builder theo schema của nguồn đang chọn.
  // chartDef (khi sửa biểu đồ): khôi phục giá trị bộ lọc đã lưu (chuỗi đơn hoặc mảng).
  // Bộ lọc dạng select là ĐA CHỌN: dropdown + checkbox, chọn 1 hoặc nhiều mục;
  // "Tất Cả" = bỏ lọc. Bộ lọc ngày (dateFrom/dateTo) giữ nguyên kiểu khoảng ngày.
  function renderBuilderFilters(source, chartDef) {
    const box = document.getElementById('builder-filters-box');
    if (!box) return;
    const schema = BUILDER_SCHEMA[source] || BUILDER_SCHEMA.kanban;
    const fds = schema.filters || [];
    if (!fds.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = '';
    const curDate = fd => (chartDef ? chartDef[fd.id] : undefined) || '';
    box.innerHTML = `
      <p style="font-size:0.75rem; font-weight:600; color:var(--text-muted); margin:0 0 8px 0; text-transform:uppercase; letter-spacing:.05em;">
        <i data-lucide="filter"></i> Bộ Lọc Dữ Liệu — Riêng Theo Nguồn: ${escapeHTML(schema.label || '')}
        <span style="text-transform:none; letter-spacing:0; font-weight:500;">(chọn 1 hoặc nhiều giá trị)</span>
      </p>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px;">
        ${fds.map(fd => {
          if (fd.type === 'date') {
            return `<div class="form-group" style="margin-bottom:0;">
              <label for="builder-${fd.id}" style="font-size:0.8rem;">${escapeHTML(fd.label)}</label>
              <input type="date" id="builder-${fd.id}" value="${escapeHTML(String(curDate(fd)))}">
            </div>`;
          }
          const opts = fd.options().map(asOptPair);
          const selVals = savedMsSelections(chartDef ? chartDef[fd.id] : undefined);
          // Giá trị đã lưu nhưng không còn trong danh sách (dữ liệu bị đổi/xóa):
          // giữ lại dưới dạng mục đã đánh dấu "(giá trị cũ)" để không mất bộ lọc.
          const known = new Set(opts.map(([v]) => String(v)));
          const extra = selVals.filter(v => !known.has(v));
          const optHtml = opts.map(([v, l]) =>
            `<label class="chart-ms-opt"><input type="checkbox" value="${escapeHTML(String(v))}"${selVals.includes(String(v)) ? ' checked' : ''}><span>${escapeHTML(String(l))}</span></label>`
          ).join('');
          const extraHtml = extra.map(v =>
            `<label class="chart-ms-opt"><input type="checkbox" value="${escapeHTML(v)}" checked><span>${escapeHTML(v)} (giá trị cũ)</span></label>`
          ).join('');
          const emptyHtml = (!opts.length && !extra.length) ? '<p class="chart-ms-empty">Chưa có dữ liệu để lọc</p>' : '';
          return `<div class="form-group chart-ms${selVals.length ? ' has-value' : ''}" data-ms="${escapeHTML(fd.id)}" style="margin-bottom:0;">
            <label style="font-size:0.8rem;">${escapeHTML(fd.label)}</label>
            <button type="button" class="chart-ms-toggle" id="builder-${fd.id}" aria-expanded="false" title="Chọn 1 hoặc nhiều giá trị để lọc">
              <span class="chart-ms-summary" id="builder-${fd.id}-summary">${escapeHTML(msSummaryLabel(selVals, opts))}</span>
              <i data-lucide="chevrons-up-down"></i>
            </button>
            <div class="chart-ms-panel" id="builder-${fd.id}-panel">
              <label class="chart-ms-opt chart-ms-opt-all"><input type="checkbox" value="${MS_ALL}"${selVals.length ? '' : ' checked'}><span>Tất Cả</span></label>
              ${optHtml}${extraHtml}${emptyHtml}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    // Sự kiện: date đổi → cập nhật xem trước; dropdown đa chọn tự gắn listener trong wireChartMultiSelect
    fds.forEach(fd => {
      if (fd.type === 'date') {
        const ctl = document.getElementById(`builder-${fd.id}`);
        if (ctl) ctl.addEventListener('change', updateChartBuilderPreview);
        return;
      }
      wireChartMultiSelect(fd.id);
    });
    initLucide();
    ensureChartMsOutsideClose();
  }

  // Đổ tùy chọn cho select + bộ lọc theo nguồn dữ liệu đang chọn
  function populateBuilderOptions(source, chartDef = null) {
    const schema = BUILDER_SCHEMA[source] || BUILDER_SCHEMA.kanban;
    const fill = (id, opts) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const prev = sel.value;
      sel.innerHTML = opts.map(([v, label]) => `<option value="${v}">${escapeHTML(label)}</option>`).join('');
      if (opts.some(([v]) => v === prev)) sel.value = prev;
    };
    fill('builder-group-by', schema.groupBy);
    fill('builder-metric', schema.metric);
    fill('builder-stack-by', schema.stackBy);
    renderBuilderFilters(source, chartDef);
  }

  // Open Chart Builder Modal (New or Edit)
  //   chartId : id biểu đồ khi sửa
  //   preset  : { source, zone } gợi ý sẵn khi tạo mới (từ vùng/tab gọi)
  function openChartBuilderModal(chartId = null, preset = null) {
    const modal = document.getElementById('modal-chart-builder');
    const form = document.getElementById('chart-builder-form');
    const titleEl = document.getElementById('chart-builder-modal-title');
    if (!modal || !form) return;

    // Xác định context khi tạo mới
    let defSource = (preset && preset.source) || 'kanban';
    let defZone = (preset && preset.zone) || 'basic';

    if (chartId) {
      const chartDef = state.customCharts.find(c => c.id === chartId);
      if (!chartDef) return;
      // Quyền: phải sửa được đúng tab nguồn của biểu đồ
      if (!requireTabEditPermission(chartDef.source || 'kanban')) return;
      if (chartDef.zone === 'advanced' && !canViewAdvanced()) {
        showToast('Chỉ Admin / Ban Quản Lý mới sửa được biểu đồ vùng nâng cao!', 'error');
        return;
      }
      defSource = chartDef.source || 'kanban';
      defZone = chartDef.zone || 'basic';

      if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3"></i> Chỉnh Sửa Biểu Đồ: ${escapeHTML(chartDef.title)}`;
      document.getElementById('builder-chart-id').value = chartDef.id;
      document.getElementById('builder-title').value = chartDef.title;
      document.getElementById('builder-type').value = chartDef.type;
      document.getElementById('builder-palette').value = chartDef.palette || 'vibrant';
    } else {
      if (!requireEditPermission()) return;
      if (titleEl) titleEl.innerHTML = `<i data-lucide="sliders"></i> Tạo Biểu Đồ Mới`;
      document.getElementById('builder-chart-id').value = '';
      document.getElementById('builder-title').value = 'Biểu Đồ Mới';
      // Xoay vòng bảng màu mặc định theo số biểu đồ hiện có → biểu đồ mới liên tiếp
      // có chuỗi màu KHÁC nhau (vibrant → purple → amber → blue → green), dễ phân biệt
      const PAL_CYCLE = ['vibrant', 'purple', 'amber', 'blue', 'green'];
      const palSelNew = document.getElementById('builder-palette');
      if (palSelNew) palSelNew.value = PAL_CYCLE[(state.customCharts.length || 0) % PAL_CYCLE.length];
    }

    // Nguồn dữ liệu & Vùng & Độ rộng
    const sourceSel = document.getElementById('builder-source');
    if (sourceSel) sourceSel.value = defSource;
    populateBuilderOptions(defSource, chartId ? (state.customCharts.find(c => c.id === chartId) || null) : null);
    const zoneSel = document.getElementById('builder-zone');
    if (zoneSel) zoneSel.value = canViewAdvanced() ? defZone : 'basic';
    // Người không có quyền xem nâng cao không được chọn zone advanced
    if (zoneSel) Array.from(zoneSel.options).forEach(o => {
      if (o.value === 'advanced') o.disabled = !canViewAdvanced();
    });
    if (chartId) {
      // Chọn lại group/metric/stack theo định nghĩa gốc (sau khi populate)
      const chartDef = state.customCharts.find(c => c.id === chartId);
      if (chartDef) {
        document.getElementById('builder-group-by').value = chartDef.groupBy;
        document.getElementById('builder-metric').value = chartDef.metric;
        document.getElementById('builder-stack-by').value = chartDef.stackBy || 'none';
      }
    }
    const widthSel = document.getElementById('builder-width');
    if (widthSel) widthSel.value = (chartId ? (state.customCharts.find(c => c.id === chartId) || {}).width : (preset && preset.width)) || 'half';

    modal.classList.add('show');
    initLucide();
    updateChartBuilderPreview();
  }
  function closeChartBuilderModal() {
    document.getElementById('modal-chart-builder')?.classList.remove('show');
    if (state.previewChartInstance) {
      state.previewChartInstance.destroy();
      state.previewChartInstance = null;
    }
  }

  function updateChartBuilderPreview() {
    const canvas = document.getElementById('chart-builder-preview-canvas');
    if (!canvas) return;

    const srcVal = document.getElementById('builder-source')?.value || 'kanban';
    // Gom giá trị bộ lọc động (đa chọn) theo schema của nguồn đang chọn
    const filterVals = collectBuilderFilterVals(srcVal);

    const tempDef = {
      title: document.getElementById('builder-title')?.value || 'Xem Trước',
      type: document.getElementById('builder-type')?.value || 'bar',
      source: srcVal,
      groupBy: document.getElementById('builder-group-by')?.value || 'stage',
      metric: document.getElementById('builder-metric')?.value || 'volume',
      stackBy: document.getElementById('builder-stack-by')?.value || 'none',
      palette: document.getElementById('builder-palette')?.value || 'vibrant',
      ...filterVals
    };

    if (state.previewChartInstance) {
      state.previewChartInstance.destroy();
      state.previewChartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    const chartData = computeChartData(tempDef, state.batches);

    let chartType = tempDef.type;
    let indexAxis = 'x';
    if (chartType === 'horizontalBar') { chartType = 'bar'; indexAxis = 'y'; }
    if (chartType === 'stackedBar') { chartType = 'bar'; }

    const isStacked = tempDef.type === 'stackedBar';

    state.previewChartInstance = new Chart(ctx, {
      type: chartType,
      data: chartData,
      options: {
        indexAxis,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: ['pie', 'doughnut'].includes(tempDef.type) || (tempDef.stackBy && tempDef.stackBy !== 'none'),
            position: 'top',
            labels: { font: { size: 10 }, boxWidth: 10 }
          }
        },
        scales: ['pie', 'doughnut'].includes(tempDef.type) ? {} : {
          x: { stacked: isStacked, beginAtZero: true, ticks: { font: { size: 9 } } },
          y: { stacked: isStacked, beginAtZero: true, ticks: { font: { size: 9 } } }
        }
      }
    });
  }

  function handleChartBuilderSubmit(e) {
    e.preventDefault();
    const chartId = document.getElementById('builder-chart-id').value;

    const source = document.getElementById('builder-source')?.value || 'kanban';
    let zone = document.getElementById('builder-zone')?.value || 'basic';
    // Chốt phân quyền: không có quyền xem nâng cao => ép về vùng cơ bản
    if (zone === 'advanced' && !canViewAdvanced()) zone = 'basic';
    // Phải có quyền sửa đúng tab nguồn
    if (!requireTabEditPermission(source)) return;

    // Gom giá trị bộ lọc động (đa chọn) theo schema của nguồn đang chọn
    const filterVals = collectBuilderFilterVals(source);

    const chartDef = {
      id: chartId || `chart-custom-${Date.now()}`,
      title: document.getElementById('builder-title').value.trim(),
      type: document.getElementById('builder-type').value,
      source,
      zone,
      groupBy: document.getElementById('builder-group-by').value,
      metric: document.getElementById('builder-metric').value,
      stackBy: document.getElementById('builder-stack-by').value,
      palette: document.getElementById('builder-palette').value,
      ...filterVals,
      width: document.getElementById('builder-width')?.value || 'half',
      createdAt: new Date().toISOString()
    };

    if (chartId) {
      const idx = state.customCharts.findIndex(c => c.id === chartId);
      if (idx !== -1) state.customCharts[idx] = chartDef;
      showToast('Đã cập nhật biểu đồ thành công!', 'success');
    } else {
      state.customCharts.push(chartDef);
      showToast('Đã tạo biểu đồ mới thành công!', 'success');
    }

    saveCustomCharts();
    closeChartBuilderModal();
    renderDashboardCharts();
  }

  function deleteCustomChart(chartId) {
    const chart = state.customCharts.find(c => c.id === chartId);
    if (!chart) return;
    if (!requireTabEditPermission(chart.source || 'kanban')) return;
    if (chart.zone === 'advanced' && !canViewAdvanced()) {
      showToast('Chỉ Admin / Ban Quản Lý mới xóa được biểu đồ vùng nâng cao!', 'error');
      return;
    }
    if (confirm(`Bạn có chắc muốn xóa biểu đồ "${chart.title}"?`)) {
      state.customCharts = state.customCharts.filter(c => c.id !== chartId);
      saveCustomCharts();
      renderDashboardCharts();
      showToast('Đã xóa biểu đồ', 'info');
    }
  }

  // ─── MỞ RỘNG BIỂU ĐỒ TOÀN MÀN HÌNH (TỰ XOAY NGANG TRÊN ĐIỆN THOẠI) ───
  // Bấm nút ⤢ trên thẻ: vào chế độ toàn màn hình; bấm lần nữa / Esc / thoát
  // fullscreen của hệ thống => thu về vị trí cũ trong lưới.
  let expandedChartCard = null;

  // Tìm instance Chart.js của thẻ (thẻ tùy chỉnh theo data-chart-id, thẻ Ép Ván dùng pressChartInstance)
  function getCardChartInstance(card) {
    // Thẻ tĩnh "Kế Hoạch vs Đã Ép": instance riêng — KHÔNG nhầm với
    // pressChartInstance (biểu đồ Ép Ván ở tab Ép Ván)
    if (card && card.querySelector && card.querySelector('#plan-vs-press-chart')) {
      return state.planVsPressInstance || null;
    }
    // Thẻ tĩnh "Khả Năng Đáp Ứng Kế Hoạch"
    if (card && card.querySelector && card.querySelector('#plan-capacity-chart')) {
      return state.planCapacityInstance || null;
    }
    const id = card.getAttribute('data-chart-id');
    if (id && state.customChartInstances[id]) return state.customChartInstances[id];
    return state.pressChartInstance || null;
  }

  // Kích Chart.js vẽ lại theo khung mới. Phải gọi NHIỀU LẦN (rAF + độ trễ)
  // vì bố cục cần thời gian ổn định sau khi chuyển vào/ra toàn màn hình —
  // nếu chỉ gọi 1 lần, canvas giữ kích thước cũ => biểu đồ bị biến dạng.
  function resizeCardChart(card) {
    const fire = () => {
      const inst = getCardChartInstance(card);
      if (inst && typeof inst.resize === 'function') {
        inst.resize();
        if (typeof inst.update === 'function') inst.update('none');
      }
    };
    requestAnimationFrame(fire);
    setTimeout(fire, 150);
    setTimeout(fire, 400);
  }

  function updateExpandIcon(card, expanded) {
    const iconEl = card.querySelector('.btn-expand-chart [data-lucide]');
    if (iconEl) {
      iconEl.setAttribute('data-lucide', expanded ? 'minimize' : 'maximize');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Vào toàn màn hình + khóa xoay ngang trên điện thoại đang cầm dọc.
  // iOS Safari không hỗ trợ fullscreen cho div => CSS fallback tự xoay thẻ 90°.
  async function tryEnterLandscapeFullscreen(card) {
    const isPhone = Math.min(window.innerWidth, window.innerHeight) < 820;
    try {
      const req = card.requestFullscreen || card.webkitRequestFullscreen;
      if (req) await req.call(card);
    } catch (e) { /* bỏ qua — CSS fallback sẽ xử lý */ }
    try {
      if (isPhone && window.matchMedia('(orientation: portrait)').matches &&
          window.screen && window.screen.orientation && window.screen.orientation.lock) {
        await window.screen.orientation.lock('landscape');
        card.__orientLocked = true;
      }
    } catch (e) { /* không khóa được hướng máy — CSS fallback xoay 90° */ }
  }

  function expandChartCard(card) {
    if (!card || expandedChartCard === card) return;
    if (expandedChartCard) collapseChartCard(expandedChartCard);
    expandedChartCard = card;
    // Nhớ vị trí cũ trong lưới để trả về đúng chỗ khi thu về
    card.__prevParent = card.parentNode;
    card.__prevNext = card.nextSibling;
    // Chuyển thẻ lên body: tránh phần cha có transform khiến position:fixed bị lệch
    document.body.appendChild(card);
    card.classList.add('chart-expanded');
    document.body.classList.add('chart-expanded-open'); // khóa cuộn trang nền
    tryEnterLandscapeFullscreen(card);
    resizeCardChart(card);
    updateExpandIcon(card, true);
  }

  function collapseChartCard(card) {
    if (!card) return;
    card.classList.remove('chart-expanded');
    document.body.classList.remove('chart-expanded-open');
    if (expandedChartCard === card) expandedChartCard = null;
    // Mở khóa hướng máy + thoát toàn màn hình (nếu còn)
    try {
      if (card.__orientLocked && window.screen && window.screen.orientation && window.screen.orientation.unlock) {
        window.screen.orientation.unlock();
      }
    } catch (e) { /* bỏ qua */ }
    card.__orientLocked = false;
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) { /* bỏ qua */ }
    // Trả thẻ về đúng vị trí cũ
    if (card.__prevParent) {
      try { card.__prevParent.insertBefore(card, card.__prevNext || null); } catch (e) { document.body.appendChild(card); }
      card.__prevParent = null;
      card.__prevNext = null;
    }
    resizeCardChart(card);
    updateExpandIcon(card, false);
  }

  // Nút trên thẻ gọi vào: bấm 1 lần mở, bấm lần nữa thu về.
  // Chỉ áp dụng cho điện thoại/máy tính bảng — trên web màn hình lớn
  // biểu đồ đã hiển thị đủ lớn nên KHÔNG cần chế độ toàn màn hình.
  function toggleChartExpand(btn) {
    if (window.matchMedia && window.matchMedia('(min-width: 921px)').matches &&
        window.matchMedia && window.matchMedia('(pointer: fine)').matches) return;
    const card = btn && btn.closest ? btn.closest('.custom-chart-card, .press-chart-card') : null;
    if (!card) return;
    if (card.classList.contains('chart-expanded')) collapseChartCard(card);
    else expandChartCard(card);
  }

  // Người dùng thoát fullscreen bằng cử chỉ hệ thống (quay máy, gesture) => tự thu về
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && expandedChartCard) collapseChartCard(expandedChartCard);
  });
  // Esc khi đang ở chế độ mở rộng mà KHÔNG có fullscreen (máy không hỗ trợ) => thu về
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && expandedChartCard && !document.fullscreenElement) {
      collapseChartCard(expandedChartCard);
    }
  });

export {
  MS_ALL,
  asOptPair,
  BUILDER_SCHEMA,
  closeChartBuilderModal,
  collectBuilderFilterVals,
  deleteCustomChart,
  formatChartValue,
  handleChartBuilderSubmit,
  openChartBuilderModal,
  populateBuilderOptions,
  registerChartDataLabelsPlugin,
  renderBuilderFilters,
  renderChartCard,
  renderCustomCharts,
  renderDashboardCharts,
  renderDashboardZones,
  savedMsSelections,
  setupChartDragAndDrop,
  setupChartResize,
  syncChartMsChecks,
  toggleChartExpand,
  updateChartBuilderPreview
};