// ═══════════════════════════════════════════════════════════
// js/export-xlsx.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide } from './cloud.js';
import { renderCustomCharts } from './dashboard.js';
import { STAGES, STORAGE_KEY_CUSTOM_CHARTS, state } from './state.js';
import { writeDataToFile } from './storage.js';
import { dimVolume } from './press.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';
import { buildMaterialPlanVsActualData, friendlyMaterialWeek, materialLocationLabel } from './materials.js';

  // ─── CUSTOM XLSX EXPORT ───────────────────────────────────────
  function openCustomExportModal() {
    const locSelect = document.getElementById('export-location-select');
    if (locSelect) {
      const locations = [...new Set(state.batches.map(b => b.location).filter(Boolean))].sort();
      locSelect.innerHTML = '<option value="all">Tất Cả Vị Trí</option>' +
        locations.map(l => `<option value="${escapeHTML(l)}">${escapeHTML(l)}</option>`).join('');
    }
    document.getElementById('modal-custom-export')?.classList.add('show');
    initLucide();
  }

  function closeCustomExportModal() {
    document.getElementById('modal-custom-export')?.classList.remove('show');
  }

  function handleCustomExportSubmit(e) {
    e.preventDefault();

    if (!window.XLSX) {
      showToast('Thư viện .xlsx chưa sẵn sàng. Kiểm tra kết nối mạng!', 'error');
      return;
    }

    const selectedStage = document.getElementById('export-stage-select').value;
    const dateFrom      = document.getElementById('export-date-from').value;
    const dateTo        = document.getElementById('export-date-to').value;
    const selectedLoc   = document.getElementById('export-location-select').value;
    const requester     = document.getElementById('export-requester')?.value.trim()  || '';
    const department    = document.getElementById('export-department')?.value.trim() || '';

    // Filter
    const filtered = state.batches.filter(b => {
      if (selectedStage !== 'all' && b.stage    !== selectedStage) return false;
      if (dateFrom      && b.date < dateFrom)                       return false;
      if (dateTo        && b.date > dateTo)                         return false;
      if (selectedLoc !== 'all' && b.location !== selectedLoc)      return false;
      return true;
    });

    if (filtered.length === 0) {
      showToast('Không tìm thấy lô nan nào thỏa mãn điều kiện!', 'error');
      return;
    }

    const wb  = XLSX.utils.book_new();
    const aoa = [];

    const stageLabel = selectedStage === 'all' ? 'Tất Cả' : (STAGES[selectedStage]?.short || selectedStage);
    const locLabel   = selectedLoc   === 'all' ? 'Tất Cả' : selectedLoc;
    const today      = new Date();
    const dayLabel   = `Ngày  ${today.getDate()}  Tháng  ${today.getMonth() + 1}  năm  ${today.getFullYear()}`;

    // Rows 1-6: Header block
    aoa.push(['NHẬT KÝ THAN HÓA', '', '', '', '', '', '', '', '', '', '']);
    aoa.push(['', '', '', '', dayLabel, '', '', '', '', '', '']);
    aoa.push(['Họ và tên người đề nghị:', requester, '', '', '', 'Bộ phận:', department, '', '', '', '']);
    aoa.push(['Công đoạn:', '', stageLabel, '', '', '', 'Vị trí:', '', '', locLabel, '']);
    aoa.push(['Stt', 'Tên vật tư - hàng hóa', 'Loại', 'Lần than hóa', 'Lô than hóa', 'Thông số than hóa', 'Thời gian', 'Số lượng', '', '', 'Ghi chú']);
    aoa.push(['', '', '', '', '', '', '', 'A', 'A1', 'B', '']);

    // Data rows
    let stt = 1, totalA = 0, totalA1 = 0, totalB = 0;
    filtered.forEach(b => {
      const dimStr = `${b.length}x${b.width}x${b.thickness}`;
      const qtyA   = b.bambooType === 'A'  ? (b.quantity || 0) : '';
      const qtyA1  = b.bambooType === 'A1' ? (b.quantity || 0) : '';
      const qtyB   = b.bambooType === 'B'  ? (b.quantity || 0) : '';
      if (typeof qtyA  === 'number') totalA  += qtyA;
      if (typeof qtyA1 === 'number') totalA1 += qtyA1;
      if (typeof qtyB  === 'number') totalB  += qtyB;
      aoa.push([stt++, dimStr, b.useFor || '', '', b.code || '', `${(b.volume||0).toFixed(4)} m³`, formatDateDDMMYY(b.date), qtyA, qtyA1, qtyB, b.notes || '']);
    });

    // Blank rows to pad to at least 16 data rows (matching the form)
    for (let i = 0; i < Math.max(0, 16 - filtered.length); i++) {
      aoa.push(['', '', '', '', '', '', '', '', '', '', '']);
    }

    // Total & footer
    aoa.push(['', 'TỔNG CỘNG', '', '', '', '', '', totalA || '', totalA1 || '', totalB || '', '']);
    aoa.push(['', '', '', '', '', '', '', '', '', '', '']);
    aoa.push(['NGƯỜI ĐỀ NGHỊ', '', '', '', '', '', '', '', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge cells matching template
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:10} },   // Title A1:K1
      { s:{r:1,c:4}, e:{r:1,c:6}  },   // Date E2:G2
      { s:{r:2,c:2}, e:{r:2,c:4}  },   // Requester B3:E3
      { s:{r:2,c:6}, e:{r:2,c:10} },   // Department G3:K3
      { s:{r:3,c:2}, e:{r:3,c:5}  },   // Stage B4:F4
      { s:{r:3,c:7}, e:{r:3,c:8}  },   // Vị trí label H4:I4
      { s:{r:3,c:9}, e:{r:3,c:10} },   // Vị trí value J4:K4
      { s:{r:4,c:0}, e:{r:5,c:0}  },   // Stt
      { s:{r:4,c:1}, e:{r:5,c:1}  },   // Tên vật tư
      { s:{r:4,c:2}, e:{r:5,c:2}  },   // Loại
      { s:{r:4,c:3}, e:{r:5,c:3}  },   // Lần than hóa
      { s:{r:4,c:4}, e:{r:5,c:4}  },   // Lô than hóa
      { s:{r:4,c:5}, e:{r:5,c:5}  },   // Thông số
      { s:{r:4,c:6}, e:{r:5,c:6}  },   // Thời gian
      { s:{r:4,c:7}, e:{r:4,c:9}  },   // Số lượng (A+A1+B span)
      { s:{r:4,c:10},e:{r:5,c:10} }    // Ghi chú
    ];

    ws['!cols'] = [
      {wch:5},{wch:18},{wch:10},{wch:14},{wch:14},{wch:17},{wch:13},{wch:10},{wch:10},{wch:10},{wch:22}
    ];
    ws['!rows'] = [{ hpt: 22 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Nhật Ký Than Hóa');

    let suffix = '';
    if (selectedStage !== 'all') suffix += `_${stageLabel.replace(/\s/g,'_')}`;
    if (dateFrom)                suffix += `_${dateFrom}`;
    if (dateTo)                  suffix += `_den_${dateTo}`;
    if (selectedLoc !== 'all')   suffix += `_${locLabel.replace(/\s/g,'_')}`;

    const filename = `NhatKy_ThanHoa${suffix}_${today.toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    closeCustomExportModal();
    showToast(`Đã xuất ${filtered.length} lô nan ra file ${filename}!`, 'success');
  }

  // =============================================================
  // XUẤT EXCEL RIÊNG THEO TAB (Kế Hoạch / Ép Ván / Nguyên Liệu)
  // =============================================================

  // ─── HELPERS CHUNG ────────────────────────────────────────────
  function requireXlsxLib() {
    if (!window.XLSX) {
      showToast('Thư viện .xlsx chưa sẵn sàng. Kiểm tra kết nối mạng!', 'error');
      return false;
    }
    return true;
  }
  function todayStamp() {
    return new Date().toISOString().split('T')[0];
  }
  function modalShow(id) { document.getElementById(id)?.classList.add('show'); initLucide(); }
  function modalHide(id) { document.getElementById(id)?.classList.remove('show'); }

  // ─── 1) KẾ HOẠCH SẢN XUẤT ─────────────────────────────────────
  function planningProductNameOf(productId) {
    const rate = (state.materialRates || []).find(r => r.id === productId);
    return (rate && rate.product) || 'Sản phẩm cũ (định mức đã xóa)';
  }

  function openPlanningExportModal() {
    const items = state.planningItems || [];
    const yearSel = document.getElementById('export-planning-year');
    if (yearSel) {
      const years = [...new Set(items.map(p => p.year).filter(Boolean))].sort((a, b) => a - b);
      yearSel.innerHTML = '<option value="all">Tất Cả Các Năm</option>' +
        years.map(y => `<option value="${y}">${y}</option>`).join('');
    }
    const weekSel = document.getElementById('export-planning-week');
    if (weekSel) {
      const weeks = [...new Set(items.map(p => p.week).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'vi', { numeric: true }));
      weekSel.innerHTML = '<option value="all">Tất Cả Các Tuần</option>' +
        weeks.map(w => `<option value="${escapeHTML(w)}">${escapeHTML(w)}</option>`).join('');
    }
    const prodSel = document.getElementById('export-planning-product');
    if (prodSel) {
      const seen = new Set();
      const opts = [];
      [...new Set(items.map(p => p.productId).filter(Boolean))].forEach(id => {
        const name = planningProductNameOf(id);
        if (seen.has(name)) return;
        seen.add(name);
        opts.push(`<option value="${escapeHTML(id)}">${escapeHTML(name)}</option>`);
      });
      prodSel.innerHTML = '<option value="all">Tất Cả Sản Phẩm</option>' + opts.join('');
    }
    // Reset bộ lọc về "Tất Cả" mỗi lần mở — form sạch, không còn giá trị cũ
    ['export-planning-year', 'export-planning-week', 'export-planning-product'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    modalShow('modal-export-planning');
  }

  function closePlanningExportModal() { modalHide('modal-export-planning'); }

  function handlePlanningExportSubmit(e) {
    e.preventDefault();
    if (!requireXlsxLib()) return;
    const year    = document.getElementById('export-planning-year')?.value || 'all';
    const week    = document.getElementById('export-planning-week')?.value || 'all';
    const product = document.getElementById('export-planning-product')?.value || 'all';

    const filtered = (state.planningItems || []).filter(p => {
      if (year !== 'all' && String(p.year) !== year) return false;
      if (week !== 'all' && p.week !== week) return false;
      if (product !== 'all' && p.productId !== product) return false;
      return true;
    });
    if (filtered.length === 0) {
      showToast('Không tìm thấy kế hoạch nào thỏa mãn điều kiện!', 'error');
      return;
    }

    const wb  = XLSX.utils.book_new();
    const aoa = [
      ['KẾ HOẠCH SẢN XUẤT'],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [`Bộ lọc: ${year === 'all' ? 'Tất cả năm' : 'Năm ' + year} · ${week === 'all' ? 'Tất cả tuần' : week} · ${product === 'all' ? 'Tất cả sản phẩm' : planningProductNameOf(product)}`],
      [],
      ['Stt', 'Năm', 'Tuần', 'Sản Phẩm', 'Số Lượng (tấm)']
    ];
    const sorted = [...filtered].sort((a, b) =>
      (a.year - b.year) || String(a.week).localeCompare(String(b.week), 'vi', { numeric: true }));
    let totalQty = 0;
    sorted.forEach((p, i) => {
      totalQty += p.qty || 0;
      aoa.push([i + 1, p.year, p.week, planningProductNameOf(p.productId), p.qty || 0]);
    });
    aoa.push(['', '', '', 'TỔNG CỘNG', totalQty]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch:5 },{ wch:8 },{ wch:10 },{ wch:34 },{ wch:14 }];
    ws['!rows'] = [{ hpt: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Kế Hoạch SX');

    const filename = `KeHoach_SanXuat_${todayStamp()}.xlsx`;
    XLSX.writeFile(wb, filename);
    closePlanningExportModal();
    showToast(`Đã xuất ${filtered.length} dòng kế hoạch ra file ${filename}!`, 'success');
  }


  // ─── 2) SẢN LƯỢNG ÉP VÁN ──────────────────────────────────────
  // Nhãn thành phẩm: ưu tiên snapshot trên lượt ép, fallback về định mức hiện tại
  function pressProductLabelOf(r) {
    if (r.productName) return r.productName;
    const rate = (state.materialRates || []).find(x => x.id === r.productId);
    return (rate && rate.product) || (r.productId ? 'Sản phẩm cũ (định mức đã xóa)' : 'Không rõ');
  }
  function pressVanThoSummary(r) {
    return (r.vanTho || []).map(v => `${v.vtDim || '?'} ×${v.vtQty || 0}`).join(', ') || '—';
  }
  function pressSticksSummary(r) {
    return (r.sticks || []).map(s => `${s.nanKey || '?'}: ${s.sticks || 0} thanh`).join(', ') || '—';
  }

  function openPressExportModal() {
    const recs = state.pressRecords || [];
    // Năm (từ ngày ép)
    const yearSel = document.getElementById('export-press-year');
    if (yearSel) {
      const years = [...new Set(recs.map(r => String(r.date || '').slice(0, 4)).filter(Boolean))].sort();
      yearSel.innerHTML = '<option value="all">Tất Cả Các Năm</option>' +
        years.map(y => `<option value="${escapeHTML(y)}">${escapeHTML(y)}</option>`).join('');
    }
    // Tuần (dạng máy YYYY-Www → hiển thị thân thiện)
    const weekSel = document.getElementById('export-press-week');
    if (weekSel) {
      const weeks = [...new Set(recs.map(r => r.week).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'vi', { numeric: true }));
      weekSel.innerHTML = '<option value="all">Tất Cả Các Tuần</option>' +
        weeks.map(w => `<option value="${escapeHTML(w)}">${escapeHTML(friendlyWeek(w))}</option>`).join('');
    }
    // Thành phẩm (dùng productName snapshot nếu có)
    const prodSel = document.getElementById('export-press-product');
    if (prodSel) {
      const seen = new Map();
      recs.forEach(r => {
        if (!r.productId) return;
        if (!seen.has(r.productId)) seen.set(r.productId, r.productName || pressProductLabelOf(r));
      });
      prodSel.innerHTML = '<option value="all">Tất Cả Thành Phẩm</option>' +
        [...seen.entries()]
          .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'vi'))
          .map(([id, name]) => `<option value="${escapeHTML(id)}">${escapeHTML(name)}</option>`).join('');
    }
    // Công nhân (chuẩn hóa như engine biểu đồ)
    const workerSel = document.getElementById('export-press-worker');
    if (workerSel) {
      const seen = new Map();
      recs.forEach(r => {
        const raw = String(r.worker || '').trim(); if (!raw) return;
        const key = normWorker(raw);
        if (!seen.has(key)) seen.set(key, raw);
      });
      workerSel.innerHTML = '<option value="all">Tất Cả Công Nhân</option>' +
        [...seen.entries()]
          .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'vi'))
          .map(([k, raw]) => `<option value="${escapeHTML(k)}">${escapeHTML(raw)}</option>`).join('');
    }
    // Reset bộ lọc về "Tất Cả" mỗi lần mở — form sạch, không còn giá trị cũ
    ['export-press-year', 'export-press-week', 'export-press-product', 'export-press-worker'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    modalShow('modal-export-press');
  }

  function closePressExportModal() { modalHide('modal-export-press'); }

  function handlePressExportSubmit(e) {
    e.preventDefault();
    if (!requireXlsxLib()) return;
    const year    = document.getElementById('export-press-year')?.value || 'all';
    const week    = document.getElementById('export-press-week')?.value || 'all';
    const product = document.getElementById('export-press-product')?.value || 'all';
    const worker  = document.getElementById('export-press-worker')?.value || 'all';

    const filtered = (state.pressRecords || []).filter(r => {
      if (year !== 'all' && String(r.date || '').slice(0, 4) !== year) return false;
      if (week !== 'all' && r.week !== week) return false;
      if (product !== 'all' && String(r.productId || '') !== product) return false;
      if (worker !== 'all' && normWorker(r.worker) !== worker) return false;
      return true;
    });
    if (filtered.length === 0) {
      showToast('Không tìm thấy lượt ép nào thỏa mãn điều kiện!', 'error');
      return;
    }

    const wb  = XLSX.utils.book_new();
    const aoa = [
      ['SẢN LƯỢNG ÉP VÁN'],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [`Bộ lọc: ${year === 'all' ? 'Tất cả năm' : year} · ${week === 'all' ? 'Tất cả tuần' : friendlyWeek(week)} · ${product === 'all' ? 'Tất cả thành phẩm' : 'Thành phẩm đã chọn'} · ${worker === 'all' ? 'Tất cả công nhân' : 'Công nhân đã chọn'}`],
      [],
      ['Stt', 'Ngày', 'Tuần', 'Thành Phẩm', 'Công Nhân', 'Kích Thước TP', 'SL TP (tấm)', 'Ván Thô', 'Thanh Thô', 'Keo (kg)', 'Phụ Gia (kg)']
    ];
    const sorted = [...filtered].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    let totalQty = 0, totalGlue = 0, totalAdd = 0;
    sorted.forEach((r, i) => {
      const qty = r.finishedQty || 0;
      totalQty += qty; totalGlue += r.glue || 0; totalAdd += r.additive || 0;
      aoa.push([
        i + 1, formatDateDDMMYY(r.date), friendlyWeek(r.week), pressProductLabelOf(r),
        r.worker || '—', r.fpDim || '—', qty,
        pressVanThoSummary(r), pressSticksSummary(r), r.glue || 0, r.additive || 0
      ]);
    });
    aoa.push(['', '', '', '', '', 'TỔNG CỘNG', totalQty, '', '', totalGlue, totalAdd]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:5},{wch:11},{wch:14},{wch:26},{wch:14},{wch:16},{wch:11},{wch:28},{wch:24},{wch:10},{wch:11}];
    ws['!rows'] = [{ hpt: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Ép Ván');

    const filename = `SanLuong_EpVan_${todayStamp()}.xlsx`;
    XLSX.writeFile(wb, filename);
    closePressExportModal();
    showToast(`Đã xuất ${filtered.length} lượt ép ra file ${filename}!`, 'success');
  }

  // ─── 3) NHẬT KÝ NGUYÊN LIỆU ───────────────────────────────────
  function openMaterialsExportModal() {
    const recs = state.materialRecords || [];
    // Loại nguyên liệu có trong dữ liệu
    const typeSel = document.getElementById('export-materials-type');
    if (typeSel) {
      const types = [...new Set(recs.map(r => (r.type || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi'));
      typeSel.innerHTML = '<option value="all">Tất Cả Loại</option>' +
        types.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('');
    }
    // Nhà cung cấp có trong dữ liệu
    const supSel = document.getElementById('export-materials-supplier');
    if (supSel) {
      const suppliers = [...new Set(recs.map(r => (r.supplier || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi'));
      supSel.innerHTML = '<option value="all">Tất Cả Nhà Cung Cấp</option>' +
        suppliers.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
    }
    // Reset bộ lọc về "Tất Cả" + xóa khoảng ngày mỗi lần mở — form sạch
    ['export-materials-type', 'export-materials-supplier', 'export-materials-location'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    ['export-materials-date-from', 'export-materials-date-to'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    modalShow('modal-export-materials');
  }

  function closeMaterialsExportModal() { modalHide('modal-export-materials'); }

  function handleMaterialsExportSubmit(e) {
    e.preventDefault();
    if (!requireXlsxLib()) return;
    const location = document.getElementById('export-materials-location')?.value || 'all';
    const type     = document.getElementById('export-materials-type')?.value || 'all';
    const supplier = document.getElementById('export-materials-supplier')?.value || 'all';
    const dateFrom = document.getElementById('export-materials-date-from')?.value || '';
    const dateTo   = document.getElementById('export-materials-date-to')?.value || '';

    const filtered = (state.materialRecords || []).filter(r => {
      if (location !== 'all' && r.location !== location) return false;
      if (type !== 'all' && (r.type || '').trim() !== type) return false;
      if (supplier !== 'all' && (r.supplier || '').trim() !== supplier) return false;
      if (dateFrom && (!r.date || r.date < dateFrom)) return false;
      if (dateTo && (!r.date || r.date > dateTo)) return false;
      return true;
    });
    if (filtered.length === 0) {
      showToast('Không tìm thấy lần nhập nguyên liệu nào thỏa mãn điều kiện!', 'error');
      return;
    }

    // Nhãn vị trí dùng chung với tab Nguyên Liệu
    const MAT_LOC_LABELS = { 'lo-hoi': 'Lò hơi', 'xuong-1': 'Xưởng 1', 'xuong-2': 'Xưởng 2' };
    const locLabel = k => MAT_LOC_LABELS[k] || k || '—';
    const fmtNum = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

    const wb  = XLSX.utils.book_new();
    const aoa = [
      ['NHẬT KÝ NHẬP NGUYÊN LIỆU'],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [`Bộ lọc: ${location === 'all' ? 'Tất cả vị trí' : locLabel(location)} · ${type === 'all' ? 'Tất cả loại' : type} · ${supplier === 'all' ? 'Tất cả NCC' : supplier} · ${dateFrom || '...'} → ${dateTo || '...'}`],
      [],
      ['Stt', 'Ngày', 'Tuần', 'Loại Nguyên Liệu', 'Nhà Cung Cấp', 'Dùng Cho (Vị Trí)', 'Chỉ Số Đầu Vào', 'Chỉ Số Đầu Ra', 'Trọng Lượng (kg)', 'Đơn Giá (đ/kg)', 'Thành Tiền (đ)', 'Ghi Chú', 'Số Ảnh']
    ];
    // Mới nhất lên đầu như bảng trên tab
    const sorted = [...filtered].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
    let totalWeight = 0, totalAmount = 0;
    sorted.forEach((r, i) => {
      const weight = Number(r.weight) || 0;
      const amount = Number(r.totalAmount) || 0;
      totalWeight += weight;
      totalAmount += amount;
      aoa.push([
        i + 1,
        r.date ? formatDateDDMMYY(r.date) : '',
        r.week ? friendlyWeek(r.week) : '',
        r.type || '',
        r.supplier || '',
        locLabel(r.location),
        fmtNum(r.inputIndex),
        fmtNum(r.outputIndex),
        fmtNum(weight),
        r.unitPrice ? fmtNum(r.unitPrice) : '',
        amount ? fmtNum(amount) : '',
        r.note || '',
        (r.images && r.images.length) || 0
      ]);
    });
    aoa.push(['', '', '', '', '', 'TỔNG CỘNG', '', '', fmtNum(totalWeight), '', fmtNum(totalAmount), '', '']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:5},{wch:11},{wch:13},{wch:20},{wch:18},{wch:15},{wch:13},{wch:13},{wch:14},{wch:13},{wch:14},{wch:22},{wch:8}];
    ws['!rows'] = [{ hpt: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Nguyên Liệu');

    const filename = `NhatKy_NguyenLieu_${todayStamp()}.xlsx`;
    XLSX.writeFile(wb, filename);
    closeMaterialsExportModal();
    showToast(`Đã xuất ${filtered.length} lần nhập nguyên liệu ra file ${filename}!`, 'success');
  }

  function loadCustomCharts() {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_CHARTS);
    if (raw) {
      try {
        state.customCharts = JSON.parse(raw);
      } catch (e) {
        state.customCharts = []; // dữ liệu lỗi -> rỗng, không tự tạo mẫu
      }
    } else {
      state.customCharts = []; // không tự tạo biểu đồ mẫu
      saveCustomCharts();
    }
    // Migrate biểu đồ cũ chưa có zone/source (đều coi là vùng cơ bản nguồn Kanban)
    migrateChartDefs();
  }

  // Đảm bảo mọi biểu đồ đều có zone (basic/advanced) & source (tab nguồn)
  function migrateChartDefs() {
    let changed = false;
    state.customCharts.forEach(c => {
      if (c.zone !== 'basic' && c.zone !== 'advanced') { c.zone = 'basic'; changed = true; }
      if (!['kanban', 'planning', 'press', 'materials'].includes(c.source)) { c.source = 'kanban'; changed = true; }
      if (c.width !== 'half' && c.width !== 'full') { c.width = 'half'; changed = true; }
    });
    if (changed) saveCustomCharts();
  }

  function saveCustomCharts() {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CHARTS, JSON.stringify(state.customCharts));
    // Đồng thời ghi vào file nếu đã kết nối thư mục dữ liệu
    if (state.fileStorage.connected) {
      writeDataToFile();
    }
    firePushSync();
  }

  function getPaletteColors(paletteName) {
    const palettes = {
      vibrant: ['#16a34a', '#0284c7', '#d97706', '#db2777', '#8b5cf6', '#ea580c', '#059669', '#2563eb', '#e11d48', '#0891b2'],
      green:   ['#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#14532d', '#166534', '#059669'],
      amber:   ['#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#78350f', '#92400e', '#ea580c'],
      blue:    ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1e40af', '#0284c7', '#0369a1'],
      purple:  ['#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#4c1d95', '#5b21b6', '#db2777']
    };
    return palettes[paletteName] || palettes.vibrant;
  }

  // Calculate grouped data for a chart definition — điều phối theo nguồn dữ liệu
  //   source = 'kanban'    -> dữ liệu lô nan (state.batches)
  //   source = 'planning'  -> dữ liệu kế hoạch (state.planningItems)
  //   source = 'press'     -> dữ liệu ép ván (state.pressRecords)
  //   source = 'materials' -> dữ liệu nhập nguyên liệu (state.materialRecords)
  function computeChartData(chartDef, batches) {
    const src = chartDef.source || 'kanban';
    if (src === 'planning')  return computePlanningChartData(chartDef);
    if (src === 'press')     return computePressChartData(chartDef);
    if (src === 'materials') return computeMaterialChartData(chartDef);
    return computeKanbanChartData(chartDef, batches || state.batches);
  }

  // Sắp khóa nhóm thông minh: collator số học — LS2 trước LS10,
  // Tuần 2 trước Tuần 10, Năm 2025 trước Năm 2026 (tự nhận số trong nhãn)
  const keyCollator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
  function sortKeysSmart(keys) {
    return keys.sort((a, b) => keyCollator.compare(String(a), String(b)));
  }

  // ─── BỘ LỌC BIỂU ĐỒ (trường phẳng trên chartDef, khai báo trong BUILDER_SCHEMA) ───
  // Kanban: stage/bambooType/useFor/location/thickness/dateFrom/dateTo
  //         (+ giữ tương thích trường cũ filterStage/filterType/filterUse của biểu đồ đã lưu)
  // GIÁ TRỊ BỘ LỌC nhận 1 trong các dạng (đa chọn chọn 1 hoặc nhiều mục):
  //   • 'all' / undefined / rỗng → không lọc (Tất Cả)
  //   • chuỗi đơn                → khớp 1 giá trị (biểu đồ đã lưu từ bản cũ)
  //   • mảng chuỗi               → khớp nếu giá trị dữ liệu nằm trong danh sách
  //                                (mảng rỗng coi như Tất Cả — đã bỏ chọn hết)
  function isAllFilterVal(v) {
    return v === undefined || v === null || v === '' || v === 'all' || (Array.isArray(v) && v.length === 0);
  }
  function matchFilterVal(fval, rawVal) {
    if (isAllFilterVal(fval)) return true;
    const raw = String(rawVal === undefined || rawVal === null ? '' : rawVal);
    if (Array.isArray(fval)) return fval.some(v => String(v) === raw);
    return String(fval) === raw;
  }
  // Danh sách giá trị đã chọn của 1 bộ lọc (null = không lọc / Tất Cả).
  // Dùng cho trường hợp đặc biệt cần biết nguyên danh sách, VD '__orphan__' (sản phẩm mồ côi).
  function filterValList(fval) {
    if (isAllFilterVal(fval)) return null;
    return (Array.isArray(fval) ? fval : [fval]).map(String);
  }
  function kanbanPassesFilters(b, f) {
    if (!matchFilterVal(f.stage,       b.stage))      return false;
    if (!matchFilterVal(f.filterStage, b.stage))      return false;
    if (!matchFilterVal(f.bambooType,  b.bambooType)) return false;
    if (!matchFilterVal(f.filterType,  b.bambooType)) return false;
    if (!matchFilterVal(f.useFor,      b.useFor))     return false;
    if (!matchFilterVal(f.filterUse,   b.useFor))     return false;
    if (!matchFilterVal(f.location,    b.location))   return false;
    if (!matchFilterVal(f.thickness,   b.thickness))  return false;
    if (f.dateFrom && (!b.date || b.date < f.dateFrom)) return false;
    if (f.dateTo   && (!b.date || b.date > f.dateTo))   return false;
    return true;
  }
  // Kế hoạch: year/product/week
  function planningPassesFilters(p, f) {
    if (!matchFilterVal(f.year, p.year)) return false;
    const prodVals = filterValList(f.product);
    if (prodVals) {
      // '__orphan__' = các mục kế hoạch không còn định mức (đã xóa/đổi mã)
      const hasOrphan = prodVals.includes('__orphan__');
      const ok = (hasOrphan && !rateExists(p.productId)) ||
                 prodVals.some(v => v !== '__orphan__' && String(p.productId || '') === v);
      if (!ok) return false;
    }
    if (!matchFilterVal(f.week, p.week)) return false;
    return true;
  }
  // Ép ván: year/product/worker/dateFrom/dateTo
  function pressPassesFilters(r, f) {
    if (!matchFilterVal(f.year, r.year || (r.date || '').slice(0, 4))) return false;
    const prodVals = filterValList(f.product);
    if (prodVals) {
      // '__orphan__' = nhóm các sản phẩm không còn định mức (đã xóa/đổi mã)
      const hasOrphan = prodVals.includes('__orphan__');
      const ok = (hasOrphan && !rateExists(r.productId)) ||
                 prodVals.some(v => v !== '__orphan__' && String(r.productId || '') === v);
      if (!ok) return false;
    }
    // Công nhân: so sau chuẩn hóa (gộp biến thể 'Nam'/'nam '/'NAM')
    const workerVals = filterValList(f.worker);
    if (workerVals && !workerVals.some(v => normWorker(r.worker) === v)) return false;
    if (f.dateFrom && (!r.date || r.date < f.dateFrom)) return false;
    if (f.dateTo   && (!r.date || r.date > f.dateTo))   return false;
    return true;
  }

  // ─── HELPER HIỂN THỊ THÂN THIỆN CHO BỘ LỌC & NHÓM ─────────────
  // ID sản phẩm còn định mức hay không
  function rateExists(productId) {
    return !!(productId && (state.materialRates || []).some(r => r.id === productId));
  }
  // Chuẩn hóa tên công nhân: cắt/kẹp khoảng trắng, gộp không phân biệt hoa/thường
  function normWorker(s) {
    return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }
  // Tuần dạng máy "2026-W33" → người dùng đọc "Tuần 33 (2026)"; giữ nguyên dạng đã thân thiện
  function friendlyWeek(w) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(String(w || ''));
    if (m) return `Tuần ${parseInt(m[2], 10)} (${m[1]})`;
    return String(w || '');
  }

  // Xây datasets xếp tầng dùng chung
  function buildStackedDatasets(sortedGroupKeys, sortedSubKeys, table, chartDef) {
    const gKeys = sortKeysSmart(sortedGroupKeys);
    const sKeys = sortKeysSmart(sortedSubKeys);
    const colors = getPaletteColors(chartDef.palette);
    const datasets = sKeys.map((subK, idx) => ({
      label: subK,
      data: gKeys.map(gK => +((table[gK] || {})[subK] || 0).toFixed(3)),
      backgroundColor: colors[idx % colors.length],
      borderRadius: 4,
      stack: chartDef.type === 'stackedBar' ? 'stacked' : undefined
    }));
    return { labels: gKeys, datasets };
  }
  // ─── NGUỒN KẾ HOẠCH SẢN XUẤT (planningItems) ─────────────────
  function planningProductName(productId) {
    const rate = (state.materialRates || []).find(r => r.id === productId);
    return (rate && rate.product) || (productId ? 'Sản phẩm cũ (định mức đã xóa)' : 'Không rõ sản phẩm');
  }

  function computePlanningChartData(chartDef) {
    // Áp bộ lọc schema (year/product/week) trước khi nhóm
    const items = (state.planningItems || []).filter(p => planningPassesFilters(p, chartDef));
    const getGroupKey = (it, f) => {
      switch (f) {
        case 'product': return planningProductName(it.productId);
        case 'year':    return `Năm ${it.year}`;
        case 'week':    return it.week || 'Tuần';
        default:        return it[f] || 'Khác';
      }
    };
    const hasStack = chartDef.stackBy && chartDef.stackBy !== 'none';
    const isPieOrDoughnut = ['pie', 'doughnut'].includes(chartDef.type);

    if (!hasStack || isPieOrDoughnut) {
      const groupMap = {}, countMap = {};
      items.forEach(it => {
        const k = getGroupKey(it, chartDef.groupBy);
        groupMap[k] = (groupMap[k] || 0) + (it.qty || 0);
        countMap[k] = (countMap[k] || 0) + 1;
      });
      const sortedKeys = sortKeysSmart(Object.keys(groupMap));
      const colors = getPaletteColors(chartDef.palette);
      const dataValues = sortedKeys.map(k => {
        let v = groupMap[k];
        if (chartDef.metric === 'avgQty') v = v / (countMap[k] || 1);
        if (chartDef.metric === 'itemCount') v = countMap[k];
        return +(v.toFixed(3));
      });
      let metricLabel = 'SL Kế Hoạch (sản phẩm)';
      if (chartDef.metric === 'itemCount') metricLabel = 'Số Mục Kế Hoạch';
      if (chartDef.metric === 'avgQty')    metricLabel = 'SL TB / Mục Kế Hoạch';
      return {
        labels: sortedKeys,
        datasets: [{
          label: metricLabel,
          data: dataValues,
          backgroundColor: isPieOrDoughnut ? colors : colors[0],
          borderColor: isPieOrDoughnut ? '#ffffff' : colors[0],
          borderWidth: isPieOrDoughnut ? 2 : 1,
          borderRadius: ['bar', 'horizontalBar', 'stackedBar'].includes(chartDef.type) ? 4 : 0,
          fill: chartDef.type === 'line'
        }]
      };
    }
    const groupKeys = new Set(), subKeys = new Set(), table = {};
    items.forEach(it => {
      const gKey = getGroupKey(it, chartDef.groupBy);
      const sKey = getGroupKey(it, chartDef.stackBy);
      groupKeys.add(gKey); subKeys.add(sKey);
      if (!table[gKey]) table[gKey] = {};
      table[gKey][sKey] = (table[gKey][sKey] || 0) + (it.qty || 0);
    });
    return buildStackedDatasets(Array.from(groupKeys), Array.from(subKeys), table, chartDef);
  }

  // ─── NGUỒN ÉP VÁN (pressRecords) ─────────────────────────────
  function computePressChartData(chartDef) {
    // Áp bộ lọc schema (year/product/worker/khoảng ngày) trước khi nhóm
    const records = (state.pressRecords || []).filter(r => pressPassesFilters(r, chartDef));
    const monthKey = r => (r.date || '').slice(0, 7); // YYYY-MM
    // Nhãn công nhân: biến thể viết phổ biến nhất trong nhóm đã chuẩn hóa
    const workerVariants = {};
    records.forEach(r => {
      const key = normWorker(r.worker); if (!key) return;
      (workerVariants[key] = workerVariants[key] || {});
      workerVariants[key][String(r.worker).trim()] = (workerVariants[key][String(r.worker).trim()] || 0) + 1;
    });
    const workerBestLabel = key => {
      const entries = Object.entries(workerVariants[key] || {});
      return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : key;
    };
    // Nhãn sản phẩm: tên snapshot trên lượt ép → tên định mức hiện tại → nhãn mồ côi thân thiện
    const pressProductLabel = r => {
      if (r.productName) return r.productName;
      const rate = (state.materialRates || []).find(x => x.id === r.productId);
      return (rate && rate.product) || (r.productId ? 'Sản phẩm cũ (định mức đã xóa)' : 'Không rõ');
    };
    const getGroupKey = (r, f) => {
      switch (f) {
        case 'product': return pressProductLabel(r);
        case 'week':    return friendlyWeek(r.week) || 'Tuần';
        case 'month':   return monthKey(r) || 'Tháng';
        case 'worker':  { const key = normWorker(r.worker); return key ? workerBestLabel(key) : 'Chưa ghi'; }
        case 'fpDim':   return r.fpDim || 'Không rõ';
        case 'date':    return formatDateDDMMYY(r.date);
        default:        return r[f] || 'Khác';
      }
    };
    const getMetricValue = (r, m) => {
      if (m === 'finishedQty') return r.finishedQty || 0;
      if (m === 'volume')      return dimVolume(r.fpDim, r.finishedQty);
      if (m === 'glue')        return r.glue || 0;
      if (m === 'additive')    return r.additive || 0;
      if (m === 'recordCount') return 1;
      return r.finishedQty || 0;
    };

    const hasStack = chartDef.stackBy && chartDef.stackBy !== 'none';
    const isPieOrDoughnut = ['pie', 'doughnut'].includes(chartDef.type);

    if (!hasStack || isPieOrDoughnut) {
      const groupMap = {}, countMap = {};
      records.forEach(r => {
        const k = getGroupKey(r, chartDef.groupBy);
        groupMap[k] = (groupMap[k] || 0) + getMetricValue(r, chartDef.metric);
        countMap[k] = (countMap[k] || 0) + 1;
      });
      const sortedKeys = sortKeysSmart(Object.keys(groupMap));
      const colors = getPaletteColors(chartDef.palette);
      const dataValues = sortedKeys.map(k => {
        let v = groupMap[k];
        if (chartDef.metric === 'avgQty') v = v / (countMap[k] || 1);
        return +(v.toFixed(3));
      });
      let metricLabel = 'SL Thành Phẩm (tấm)';
      if (chartDef.metric === 'volume')      metricLabel = 'Thể Tích Thành Phẩm (m³)';
      if (chartDef.metric === 'glue')        metricLabel = 'Keo tiêu thụ (kg)';
      if (chartDef.metric === 'additive')    metricLabel = 'Phụ gia tiêu thụ (kg)';
      if (chartDef.metric === 'recordCount') metricLabel = 'Số Lượt Ép';
      if (chartDef.metric === 'avgQty')      metricLabel = 'SL TB / Lượt Ép';
      return {
        labels: sortedKeys,
        datasets: [{
          label: metricLabel,
          data: dataValues,
          backgroundColor: isPieOrDoughnut ? colors : colors[0],
          borderColor: isPieOrDoughnut ? '#ffffff' : colors[0],
          borderWidth: isPieOrDoughnut ? 2 : 1,
          borderRadius: ['bar', 'horizontalBar', 'stackedBar'].includes(chartDef.type) ? 4 : 0,
          fill: chartDef.type === 'line'
        }]
      };
    }
    const groupKeys = new Set(), subKeys = new Set(), table = {};
    records.forEach(r => {
      const gKey = getGroupKey(r, chartDef.groupBy);
      const sKey = getGroupKey(r, chartDef.stackBy);
      groupKeys.add(gKey); subKeys.add(sKey);
      if (!table[gKey]) table[gKey] = {};
      table[gKey][sKey] = (table[gKey][sKey] || 0) + getMetricValue(r, chartDef.metric);
    });
    return buildStackedDatasets(Array.from(groupKeys), Array.from(subKeys), table, chartDef);
  }

  // ─── NGUỒN NHẬP NGUYÊN LIỆU (materialRecords) ────────────────
  // Bộ lọc: location/matType/supplier/year/week/dateFrom/dateTo
  // LƯU Ý: id bộ lọc là 'matType' (KHÔNG dùng 'type') vì chartDef.type
  // đã bị Chart Builder dùng cho kiểu biểu đồ (bar/line/pie...).
  function materialPassesFilters(r, f) {
    if (!matchFilterVal(f.location, r.location))                    return false;
    if (!matchFilterVal(f.matType,  r.type))                        return false;
    if (!matchFilterVal(f.supplier, r.supplier))                    return false;
    if (!matchFilterVal(f.year,     (r.date || '').slice(0, 4)))    return false;
    if (!matchFilterVal(f.week,     r.week))                        return false;
    if (f.dateFrom && (!r.date || r.date < f.dateFrom)) return false;
    if (f.dateTo   && (!r.date || r.date > f.dateTo))   return false;
    return true;
  }

  function computeMaterialChartData(chartDef) {
    // Kiểu đặc biệt: Kế Hoạch vs Thực Tế theo ngày (cột lồng) — vỏ = số TB/ngày
    // từ bảng kế hoạch nguyên liệu, lấp = tổng thực tế nhật ký từng ngày/vị trí.
    if (chartDef.type === 'planVsActual') {
      return buildMaterialPlanVsActualData(String(chartDef.mpcWeek || ''));
    }
    const records = (state.materialRecords || []).filter(r => materialPassesFilters(r, chartDef));
    const getGroupKey = (r, f) => {
      switch (f) {
        case 'location': return materialLocationLabel(r.location);
        case 'type':     return r.type || 'Không rõ';
        case 'supplier': return r.supplier || 'Chưa ghi';
        case 'week':     return friendlyMaterialWeek(r.week) || 'Tuần';
        case 'month':    return (r.date || '').slice(0, 7) || 'Tháng';
        case 'date':     return formatDateDDMMYY(r.date);
        default:         return r[f] || 'Khác';
      }
    };
    const getMetricValue = (r, m) => {
      if (m === 'weight')      return Number(r.weight) || 0;
      if (m === 'inputIndex')  return Number(r.inputIndex) || 0;
      if (m === 'outputIndex') return Number(r.outputIndex) || 0;
      if (m === 'amount')      return Number(r.totalAmount) || 0;
      if (m === 'recordCount') return 1;
      return Number(r.weight) || 0;
    };

    const hasStack = chartDef.stackBy && chartDef.stackBy !== 'none';
    const isPieOrDoughnut = ['pie', 'doughnut'].includes(chartDef.type);

    if (!hasStack || isPieOrDoughnut) {
      const groupMap = {}, countMap = {};
      records.forEach(r => {
        const k = getGroupKey(r, chartDef.groupBy);
        groupMap[k] = (groupMap[k] || 0) + getMetricValue(r, chartDef.metric);
        countMap[k] = (countMap[k] || 0) + 1;
      });
      const sortedKeys = sortKeysSmart(Object.keys(groupMap));
      const colors = getPaletteColors(chartDef.palette);
      const dataValues = sortedKeys.map(k => +(groupMap[k].toFixed(3)));
      let metricLabel = 'Trọng Lượng (kg)';
      if (chartDef.metric === 'inputIndex')  metricLabel = 'Chỉ Số Đầu Vào';
      if (chartDef.metric === 'outputIndex') metricLabel = 'Chỉ Số Đầu Ra';
      if (chartDef.metric === 'amount')      metricLabel = 'Thành Tiền (đ)';
      if (chartDef.metric === 'recordCount') metricLabel = 'Số Lần Nhập';
      return {
        labels: sortedKeys,
        datasets: [{
          label: metricLabel,
          data: dataValues,
          backgroundColor: isPieOrDoughnut ? colors : colors[0],
          borderColor: isPieOrDoughnut ? '#ffffff' : colors[0],
          borderWidth: isPieOrDoughnut ? 2 : 1,
          borderRadius: ['bar', 'horizontalBar', 'stackedBar'].includes(chartDef.type) ? 4 : 0,
          fill: chartDef.type === 'line'
        }]
      };
    }
    const groupKeys = new Set(), subKeys = new Set(), table = {};
    records.forEach(r => {
      const gKey = getGroupKey(r, chartDef.groupBy);
      const sKey = getGroupKey(r, chartDef.stackBy);
      groupKeys.add(gKey); subKeys.add(sKey);
      if (!table[gKey]) table[gKey] = {};
      table[gKey][sKey] = (table[gKey][sKey] || 0) + getMetricValue(r, chartDef.metric);
    });
    return buildStackedDatasets(Array.from(groupKeys), Array.from(subKeys), table, chartDef);
  }

  // ─── NGUỒN KANBAN (lô nan — logic gốc) ───────────────────────
  function computeKanbanChartData(chartDef, batches) {
    // 1. Filter batches — bộ lọc schema mới (stage/bambooType/useFor/location/thickness/khoảng ngày)
    //    kanbanPassesFilters tự giữ tương thích trường cũ filterStage/filterType/filterUse
    let filtered = batches.filter(b => kanbanPassesFilters(b, chartDef));

    // Helper to get group key
    function getGroupKey(b, groupField) {
      switch (groupField) {
        case 'stage':       return STAGES[b.stage]?.short || b.stage;
        case 'thickness':   return `Nan ${b.thickness}mm`;
        case 'dimRatio':    return `${b.length}×${b.width} mm`;
        case 'dimFull':     return `${b.length}×${b.width}×${b.thickness} mm`;
        case 'bambooType':  return `Loại ${b.bambooType}`;
        case 'useFor':      return b.useFor || 'Chưa phân loại';
        case 'location':    return b.location || 'Chưa xếp vị trí';
        case 'week':        return b.week || 'Tuần';
        case 'date':        return formatDateDDMMYY(b.date);
        default:            return b[groupField] || 'Khác';
      }
    }

    // Helper to get metric value
    function getMetricValue(b, metric) {
      if (metric === 'quantity') return b.quantity || 0;
      if (metric === 'batchCount') return 1;
      return b.volume || 0;
    }

    const hasStack = chartDef.stackBy && chartDef.stackBy !== 'none';
    const isPieOrDoughnut = ['pie', 'doughnut'].includes(chartDef.type);

    if (!hasStack || isPieOrDoughnut) {
      // Single Dataset aggregation
      const groupMap = {};
      const countMap = {};

      filtered.forEach(b => {
        const k = getGroupKey(b, chartDef.groupBy);
        groupMap[k] = (groupMap[k] || 0) + getMetricValue(b, chartDef.metric);
        countMap[k] = (countMap[k] || 0) + 1;
      });

      // Sort keys
      const sortedKeys = Object.keys(groupMap).sort((a, b) => {
        const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
        const numB = parseFloat(b.replace(/[^0-9.]/g, ''));
        if (!isNaN(numA) && !isNaN(numB) && a.includes('mm') && b.includes('mm')) return numA - numB;
        return 0;
      });

      const colors = getPaletteColors(chartDef.palette);
      const dataValues = sortedKeys.map(k => {
        let v = groupMap[k];
        if (chartDef.metric === 'avgVolume') v = v / (countMap[k] || 1);
        return +(v.toFixed(4));
      });

      let metricLabel = 'Thể tích (m³)';
      if (chartDef.metric === 'quantity') metricLabel = 'Số lượng (thanh)';
      if (chartDef.metric === 'batchCount') metricLabel = 'Số lượng (lô)';
      if (chartDef.metric === 'avgVolume') metricLabel = 'Thể tích TB (m³/lô)';

      return {
        labels: sortedKeys,
        datasets: [{
          label: metricLabel,
          data: dataValues,
          backgroundColor: isPieOrDoughnut ? colors : colors[0],
          borderColor: isPieOrDoughnut ? '#ffffff' : colors[0],
          borderWidth: isPieOrDoughnut ? 2 : 1,
          borderRadius: ['bar', 'horizontalBar', 'stackedBar'].includes(chartDef.type) ? 4 : 0,
          fill: chartDef.type === 'line'
        }]
      };
    } else {
      // Multi-Dataset / Stacked aggregation
      const groupKeys = new Set();
      const subGroupKeys = new Set();
      const table = {}; // groupKey -> subKey -> val

      filtered.forEach(b => {
        const gKey = getGroupKey(b, chartDef.groupBy);
        const subKey = getGroupKey(b, chartDef.stackBy);
        groupKeys.add(gKey);
        subGroupKeys.add(subKey);

        if (!table[gKey]) table[gKey] = {};
        table[gKey][subKey] = (table[gKey][subKey] || 0) + getMetricValue(b, chartDef.metric);
      });

      // Sắp số học tự nhiên (giống các nguồn khác): "950×15 mm" đứng trước "1250×18 mm",
      // "Tuần 2" trước "Tuần 10" — KHÔNG dùng .sort() chữ vì '1250' < '950' sai thứ tự
      const sortedGroupKeys = sortKeysSmart(Array.from(groupKeys));
      const sortedSubKeys = sortKeysSmart(Array.from(subGroupKeys));
      const colors = getPaletteColors(chartDef.palette);

      const datasets = sortedSubKeys.map((subK, idx) => ({
        label: subK,
        data: sortedGroupKeys.map(gK => +(table[gK]?.[subK] || 0).toFixed(4)),
        backgroundColor: colors[idx % colors.length],
        borderRadius: 4,
        stack: chartDef.type === 'stackedBar' ? 'stacked' : undefined
      }));

      return {
        labels: sortedGroupKeys,
        datasets
      };
    }
  }

export {
  closeCustomExportModal,
  closeMaterialsExportModal,
  closePlanningExportModal,
  closePressExportModal,
  computeChartData,
  filterValList,
  getPaletteColors,
  handleCustomExportSubmit,
  handleMaterialsExportSubmit,
  handlePlanningExportSubmit,
  handlePressExportSubmit,
  isAllFilterVal,
  loadCustomCharts,
  matchFilterVal,
  openCustomExportModal,
  openMaterialsExportModal,
  openPlanningExportModal,
  openPressExportModal,
  saveCustomCharts
};
