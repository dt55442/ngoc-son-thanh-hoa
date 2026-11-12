// ═══════════════════════════════════════════════════════════
// js/virtual-scroll.js — VIRTUAL SCROLLING CHO BẢNG LỚN (Giai đoạn 3)
// ═══════════════════════════════════════════════════════════
// Chỉ render các dòng đang hiển thị trong viewport + buffer nhỏ.
// Giảm DOM nodes từ hàng nghìn xuống ~50-100 dòng.
// ═══════════════════════════════════════════════════════════

/**
 * Tạo virtual scroll cho bảng
 * @param {Object} options
 * @param {HTMLElement} options.container - Phần tử chứa bảng (phải có overflow: auto)
 * @param {HTMLElement} options.table - Element <table>
 * @param {Array} options.data - Mảng dữ liệu (mỗi phần tử = 1 dòng)
 * @param {Function} options.renderRow - Hàm render 1 dòng (data, index) => HTML string
 * @param {number} options.rowHeight - Chiều cao ước tính 1 dòng (px)
 * @param {number} options.buffer - Số dòng buffer ngoài viewport (mặc định 10)
 * @param {Function} [options.onScroll] - Callback khi scroll
 */
export function createVirtualScroll(options) {
  const {
    container,
    table,
    data,
    renderRow,
    rowHeight = 35,
    buffer = 10,
    onScroll
  } = options;

  if (!container || !table) {
    console.warn('[VirtualScroll] Missing container or table');
    return null;
  }

  const tbody = table.querySelector('tbody') || table;
  
  // State
  let visibleCount = 0;
  let startIndex = 0;
  let endIndex = 0;
  let scrollTop = 0;
  let containerHeight = 0;
  let totalHeight = 0;
  let isRendering = false;
  
  // Spacer elements
  let spacerTop = null;
  let spacerBottom = null;

  function init() {
    // Tạo spacer elements
    spacerTop = document.createElement('tr');
    spacerTop.style.height = '0px';
    spacerTop.style.display = 'block';
    spacerTop.dataset.virtualSpacer = 'top';
    
    spacerBottom = document.createElement('tr');
    spacerBottom.style.height = '0px';
    spacerBottom.style.display = 'block';
    spacerBottom.dataset.virtualSpacer = 'bottom';
    
    // Chèn vào tbody
    tbody.insertBefore(spacerTop, tbody.firstChild);
    tbody.appendChild(spacerBottom);
    
    // Lắng nghe scroll
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
      render();
    });
    resizeObserver.observe(container);
    
    // Initial render
    updateDimensions();
    render();
    
    // Return cleanup function
    return {
      destroy: () => {
        container.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
        if (spacerTop) spacerTop.remove();
        if (spacerBottom) spacerBottom.remove();
      },
      updateData: (newData) => {
        data.length = 0;
        data.push(...newData);
        updateDimensions();
        render();
      },
      scrollToIndex: (index) => {
        const targetScroll = index * rowHeight;
        container.scrollTop = targetScroll;
      }
    };
  }

  function updateDimensions() {
    containerHeight = container.clientHeight;
    totalHeight = data.length * rowHeight;
    visibleCount = Math.ceil(containerHeight / rowHeight) + buffer * 2;
    
    if (spacerTop) spacerTop.style.height = `${startIndex * rowHeight}px`;
    if (spacerBottom) spacerBottom.style.height = `${Math.max(0, totalHeight - endIndex * rowHeight)}px`;
  }

  function handleScroll() {
    if (isRendering) return;
    scrollTop = container.scrollTop;
    onScroll?.(scrollTop);
    scheduleRender();
  }

  function scheduleRender() {
    if (isRendering) return;
    isRendering = true;
    requestAnimationFrame(() => {
      render();
      isRendering = false;
    });
  }

  function render() {
    startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    endIndex = Math.min(data.length, startIndex + visibleCount);
    
    if (spacerTop) spacerTop.style.height = `${startIndex * rowHeight}px`;
    if (spacerBottom) spacerBottom.style.height = `${Math.max(0, totalHeight - endIndex * rowHeight)}px`;
    
    const rowsToRender = data.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment();
    
    // Xóa các dòng dữ liệu cũ (giữ spacer)
    const existingRows = tbody.querySelectorAll('tr:not([data-virtual-spacer])');
    existingRows.forEach(row => row.remove());
    
    rowsToRender.forEach((item, i) => {
      const row = document.createElement('tr');
      row.innerHTML = renderRow(item, startIndex + i);
      fragment.appendChild(row);
    });
    
    tbody.insertBefore(fragment, spacerBottom);
  }

  return init();
}

/**
 * Helper: Virtual scroll cho bảng có sẵn HTML (progressive enhancement)
 */
export function enhanceTableWithVirtualScroll(table, options = {}) {
  const container = table.closest('.table-responsive, .table-scroll, .hr-table-scroll');
  if (!container) {
    console.warn('[VirtualScroll] No scroll container found for table');
    return null;
  }
  
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const data = rows.map((row, index) => ({
    html: row.innerHTML,
    index,
    element: row
  }));
  
  const firstRow = rows[0];
  const rowHeight = firstRow ? firstRow.offsetHeight : 35;
  
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  
  return createVirtualScroll({
    container,
    table,
    data,
    renderRow: (item) => item.html,
    rowHeight,
    ...options
  });
}