// ═══════════════════════════════════════════════════════════
// js/export-xlsx.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide } from './cloud.js';
import { renderCustomCharts } from './dashboard.js';
import { logDataChange } from './history.js';
import { STAGES, STORAGE_KEY_CUSTOM_CHARTS, state } from './state.js';
import { writeDataToFile } from './storage.js';
import { computeFpDimFromProduct, dimVolume } from './press.js';
import { HR_DEPARTMENTS, HR_DOW_SHORT, attStatusOf, computeAttendanceStats, computeLeaveStats, hrDayKindOf, hrIsRestDay, hrSplitHoursHCDate, hrStripForMatch, hrPressWorkersNamesOf } from './hr.js';
import { escapeHTML, formatDateDDMMYY, getBatchStageEntryDate, showToast } from './utils.js';
import { buildMaterialPlanVsActualData, friendlyMaterialWeek, materialLocationLabel } from './materials.js';
import { baoThoDisplay, baoTinhDisplay, boOngDisplay, chonNanDisplay, cutDisplay } from './xuong2.js';

  // ─── CUSTOM XLSX EXPORT ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  // XUẤT DỮ LIỆU XƯỞNG 2 — DÙNG CHUNG CHO CÁC THẺ Ở TAB CÔNG ĐOẠN
  //   Nút "Xuất Dữ Liệu X2" ở thanh công cụ Công Đoạn → form này tự chọn
  //   VÙNG DỮ LIỆU theo THẺ đang mở (x2OpenCardExportSource), đổi được bằng
  //   dropdown. Nguồn 'epvan' mở luôn form xuất Sản Lượng Ép Ván chuyên sâu.
  //   Cột lấy từ hàm hiển thị của js/xuong2.js (cutDisplay/boOngDisplay/...)
  //   nên số liệu luôn khớp bảng trên màn hình.
  // ═══════════════════════════════════════════════════════════════
  const X2_EXPORT_SOURCES = [
    { id: 'batch',   label: 'Lô nan (Than Hóa + Sấy)' },
    { id: 'cut',     label: 'Nhật ký Cắt / Chọn' },
    { id: 'boong',   label: 'Bổ Ống' },
    { id: 'baotho',  label: 'Chạy Máy Bào Thô' },
    { id: 'chonnan', label: 'Chọn Nan Thô' },
    { id: 'baotinh', label: 'Bào Tinh' },
    { id: 'epvan',   label: 'Ép Ván (mở form xuất Ép Ván)' }
  ];

  const x2FmtKg = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const x2FmtSo = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const x2FmtDim = d => (Array.isArray(d) && d.length === 3 && d.some(x => Number(x) > 0))
    ? `${Number(d[0])} × ${Number(d[1])} × ${Number(d[2])}` : '—';
  const x2StageLabel = (id) => (STAGES[id] && STAGES[id].name) || id || '';
  const x2WorkerText = (rows) => (rows || []).map(w => `${w.name}${w.time ? ` (${w.time})` : ''}`).join(', ') || '—';
  // Lọc theo khoảng ngày (from/to rỗng = không lọc)
  function x2InRange(date, from, to) {
    const d = String(date || '');
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }
  // Dữ liệu 1 nguồn: [{ rec, d, date }] — d = số liệu hiển thị (display) của bản ghi
  function x2ExportRowsOf(source) {
    const map = {
      batch:   () => (state.batches || []).map(r => ({ rec: r, d: r, date: getBatchStageEntryDate(r) || r.date || '' })),
      cut:     () => (state.xuong2CutRecords || []).map(r => ({ rec: r, d: cutDisplay(r), date: r.date || '' })),
      boong:   () => (state.xuong2BoOngRecords || []).map(r => ({ rec: r, d: boOngDisplay(r), date: r.date || '' })),
      baotho:  () => (state.xuong2BaoThoRecords || []).map(r => ({ rec: r, d: baoThoDisplay(r), date: r.date || '' })),
      chonnan: () => (state.xuong2ChonNanThoRecords || []).map(r => ({ rec: r, d: chonNanDisplay(r), date: r.date || '' })),
      baotinh: () => (state.xuong2BaoTinhRecords || []).map(r => ({ rec: r, d: baoTinhDisplay(r), date: r.date || '' }))
    };
    const fn = map[source];
    return fn ? fn() : [];
  }

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

  // Dựng dữ liệu báo cáo Nhật Ký Than Hóa (dùng chung cho xuất file & xem trước)
  // Trả về { title, countLabel, aoa, merges, cols, rowH, sheetName, filename } | null
  function buildCustomExportData() {
    if (!requireXlsxLib()) return null;

    const selectedStage = document.getElementById('export-stage-select').value;
    const dateFrom      = document.getElementById('export-date-from').value;
    const dateTo        = document.getElementById('export-date-to').value;
    const selectedLoc   = document.getElementById('export-location-select').value;
    const requester     = document.getElementById('export-requester')?.value.trim()  || '';
    const department    = document.getElementById('export-department')?.value.trim() || '';

    // Filter — lọc theo NGÀY VÀO CÔNG ĐOẠN (thực tế), KHÔNG phải ngày tạo lô:
    //   • chọn 1 công đoạn  → ngày vào công đoạn đó (Sấy 2/Kho/Bào Tinh lấy ngày
    //     thực tế người dùng khai báo hoặc mốc trong lịch sử chuyển; Sấy 1 = ngày tạo)
    //   • Tất Cả công đoạn  → ngày vào công đoạn HIỆN TẠI của từng lô
    const stageDateOf = (b) => getBatchStageEntryDate(b, selectedStage === 'all' ? b.stage : selectedStage);
    const filtered = state.batches.filter(b => {
      if (selectedStage !== 'all' && b.stage !== selectedStage) return false;
      const d = stageDateOf(b);
      if (dateFrom      && d < dateFrom)                            return false;
      if (dateTo        && d > dateTo)                              return false;
      if (selectedLoc !== 'all' && b.location !== selectedLoc)      return false;
      return true;
    });

    if (filtered.length === 0) {
      // Chẩn đoán thân thiện: cho biết công đoạn nào đang CÓ dữ liệu để người dùng
      // nhận ra ngay nếu dữ liệu lô dùng mã công đoạn khác chuẩn (say1/say2/kho/bao_tinh)
      const stagesInData = [...new Set(state.batches.map(b => b.stage).filter(Boolean))];
      const stageNames   = stagesInData.map(s => STAGES[s]?.short || s);
      let msg = selectedStage === 'all'
        ? 'Không có lô nan nào thỏa mãn điều kiện!'
        : `Không có lô nan nào ở "${STAGES[selectedStage]?.short || selectedStage}" thỏa mãn bộ lọc!`;
      if (stagesInData.length) msg += ` Các công đoạn đang có dữ liệu: ${stageNames.join(', ')}.`;
      else msg += ' Dữ liệu lô nan đang trống.';
      showToast(msg, 'error');
      return null;
    }

    const aoa = [];

    const stageLabel = selectedStage === 'all' ? 'Tất Cả' : (STAGES[selectedStage]?.short || selectedStage);
    // Tên công đoạn dùng cho tiêu đề / tên sheet:
    //   chọn 1 công đoạn → "Sấy 1", "Bào Tinh"... ; chọn Tất Cả → giữ tên gốc "Than Hóa"
    const stageSheet = selectedStage === 'all' ? 'Than Hóa' : (STAGES[selectedStage]?.short || selectedStage);
    const stageTitle = stageSheet.toUpperCase();
    const locLabel   = selectedLoc   === 'all' ? 'Tất Cả' : selectedLoc;
    const today      = new Date();
    const dayLabel   = `Ngày  ${today.getDate()}  Tháng  ${today.getMonth() + 1}  năm  ${today.getFullYear()}`;

    // Rows 1-6: Header block — tiêu đề = NHẬT KÝ + TÊN CÔNG ĐOẠN (VD: NHẬT KÝ SẤY 1)
    aoa.push([`NHẬT KÝ ${stageTitle}`, '', '', '', '', '', '', '', '', '', '']);
    aoa.push(['', '', '', '', dayLabel, '', '', '', '', '', '']);
    // A3:B3 gộp làm ô nhãn rộng cho "Họ và tên người đề nghị:", giá trị điền sang C3:E3
    aoa.push(['Họ và tên người đề nghị:', '', requester, '', '', 'Bộ phận:', department, '', '', '', '']);
    // A4:B4 gộp làm ô nhãn "Công đoạn:", tên công đoạn hiển thị sang C4:F4
    aoa.push(['Công đoạn:', '', stageLabel, '', '', '', 'Vị trí:', '', '', locLabel, '']);
    aoa.push(['Stt', 'Tên vật tư - hàng hóa', 'Loại', 'Lần than hóa', 'Lô than hóa', 'Thông số than hóa', 'Thời gian', 'Số lượng', '', '', 'Ghi chú']);
    aoa.push(['', '', '', '', '', '', '', 'A', 'A1', 'B', '']);

    // Data rows — gia cố chống lỗi dữ liệu lệch chuẩn (thể tích/số lượng dạng chữ,
    // thiếu kích thước, trường rỗng...): lô nào dựng dòng lỗi thì BỎ QUA + ghi nhận
    // cảnh báo thay vì làm hỏng cả file xuất của công đoạn đó.
    let stt = 1, totalA = 0, totalA1 = 0, totalB = 0;
    const skippedBadRows = [];
    filtered.forEach(b => {
      try {
        const len = parseFloat(b.length), wid = parseFloat(b.width), thk = parseFloat(b.thickness);
        const dimStr = (len > 0 && wid > 0 && thk > 0) ? `${len}x${wid}x${thk}` : '—';
        const vol    = parseFloat(b.volume); // chấp nhận cả số dạng chữ "0.3719"
        const volStr = isNaN(vol) ? '0.0000 m³' : `${vol.toFixed(4)} m³`;
        const qty    = parseInt(b.quantity, 10) || 0;
        const qtyA   = b.bambooType === 'A'  ? qty : '';
        const qtyA1  = b.bambooType === 'A1' ? qty : '';
        const qtyB   = b.bambooType === 'B'  ? qty : '';
        if (b.bambooType === 'A')  totalA  += qty;
        if (b.bambooType === 'A1') totalA1 += qty;
        if (b.bambooType === 'B')  totalB  += qty;
        aoa.push([stt++, dimStr, b.useFor || '', '', b.code || '', volStr, formatDateDDMMYY(stageDateOf(b)), qtyA, qtyA1, qtyB, b.notes || '']);
      } catch (err) {
        skippedBadRows.push(b.code || b.id || '(không mã)');
      }
    });

    // Blank rows to pad to at least 16 data rows (matching the form)
    const writtenRows = filtered.length - skippedBadRows.length;
    for (let i = 0; i < Math.max(0, 16 - writtenRows); i++) {
      aoa.push(['', '', '', '', '', '', '', '', '', '', '']);
    }

    // Total & footer
    aoa.push(['', 'TỔNG CỘNG', '', '', '', '', '', totalA || '', totalA1 || '', totalB || '', '']);
    aoa.push(['', '', '', '', '', '', '', '', '', '', '']);
    aoa.push(['NGƯỜI ĐỀ NGHỊ', '', '', '', '', '', '', '', '', '', '']);

    const merges = [
      { s:{r:0,c:0}, e:{r:0,c:10} },   // Title A1:K1 (NHẬT KÝ + TÊN CÔNG ĐOẠN)
      { s:{r:1,c:4}, e:{r:1,c:6}  },   // Date E2:G2
      { s:{r:2,c:0}, e:{r:2,c:1}  },   // Nhãn người đề nghị A3:B3 (gộp cho chữ dài)
      { s:{r:2,c:2}, e:{r:2,c:4}  },   // Ô điền tên người đề nghị C3:E3
      { s:{r:2,c:6}, e:{r:2,c:10} },   // Ô bộ phận G3:K3
      { s:{r:3,c:0}, e:{r:3,c:1}  },   // Nhãn công đoạn A4:B4 (gộp)
      { s:{r:3,c:2}, e:{r:3,c:5}  },   // Tên công đoạn C4:F4
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
    const cols = [{wch:5},{wch:18},{wch:10},{wch:14},{wch:14},{wch:17},{wch:13},{wch:10},{wch:10},{wch:10},{wch:22}];

    let suffix = '';
    if (selectedStage !== 'all') suffix += `_${stageLabel.replace(/\s/g,'_')}`;
    if (dateFrom)                suffix += `_${dateFrom}`;
    if (dateTo)                  suffix += `_den_${dateTo}`;
    if (selectedLoc !== 'all')   suffix += `_${locLabel.replace(/\s/g,'_')}`;

    return {
      title: `NHẬT KÝ ${stageTitle}`,
      countLabel: `${writtenRows} lô nan`,
      warning: skippedBadRows.length
        ? `Cảnh báo: bỏ qua ${skippedBadRows.length} lô có dữ liệu lỗi (${skippedBadRows.slice(0, 5).join(', ')}${skippedBadRows.length > 5 ? '...' : ''}).`
        : null,
      aoa, merges, cols, rowH: 22,
      sheetName: `Nhật Ký ${stageSheet}`,
      filename: `NhatKy_ThanHoa${suffix}_${today.toISOString().split('T')[0]}.xlsx`
    };
  }

  function handleCustomExportSubmit(e) {
    e.preventDefault();
    const d = buildCustomExportData();
    if (!d) return;
    exportDataToXlsx(d);
    closeCustomExportModal();
    if (d.warning) {
      // File vẫn được xuất đủ các dòng đạt — chỉ cảnh báo các lô dữ liệu lỗi bị bỏ qua
      showToast(d.warning, 'error');
    }
    showToast(`Đã xuất ${d.countLabel} ra file ${d.filename}!`, 'success');
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

  // Ghi dữ liệu báo cáo { aoa, merges, cols, rowH, sheetName, filename } ra file .xlsx
  // Bổ sung tùy chọn: fills {'r,c': mã màu RGB 6 số} + zCells {'r,c': định dạng số
  // '0.0'} — SheetJS bản free GHI ĐƯỢC định dạng số nhưng BỎ QUA màu nền (màu
  // chỉ hiện ở màn Xem Trước); khai báo vẫn giữ để dùng khi nâng cấp thư viện.
  function exportDataToXlsx(d) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(d.aoa);
    if (d.merges && d.merges.length) ws['!merges'] = d.merges;
    if (d.cols) ws['!cols'] = d.cols;
    if (d.rowH) ws['!rows'] = [{ hpt: d.rowH }];
    if (d.fills) {
      Object.keys(d.fills).forEach(k => {
        const [r, c] = k.split(',').map(Number);
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { t: 'z' };
        ws[addr].s = { fill: { patternType: 'solid', fgColor: { rgb: d.fills[k] } } };
      });
    }
    if (d.zCells) {
      Object.keys(d.zCells).forEach(k => {
        const [r, c] = k.split(',').map(Number);
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr] && typeof ws[addr].v === 'number') ws[addr].z = d.zCells[k];
      });
    }
    // Ô định dạng chữ (VD tiêu đề bôi đậm + căn giữa): SheetJS bản free BỎ QUA
    // style khi ghi — khai báo vẫn giữ (best-effort) để dùng khi nâng cấp thư viện;
    // màn Xem Trước/In tự đậm tiêu đề nhờ ô gộp tràn bảng (class cell-title).
    if (d.styleCells) {
      Object.keys(d.styleCells).forEach(k => {
        const [r, c] = k.split(',').map(Number);
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { t: 'z' };
        const cur = ws[addr].s || {};
        const st = Object.assign({}, cur);
        const cfgS = d.styleCells[k] || {};
        if (cfgS.bold) st.font = Object.assign({}, cur.font || {}, { bold: true });
        if (cfgS.align) st.alignment = Object.assign({}, cur.alignment || {}, { horizontal: cfgS.align, vertical: 'center' });
        ws[addr].s = st;
      });
    }
    XLSX.utils.book_append_sheet(wb, ws, d.sheetName);
    XLSX.writeFile(wb, d.filename);
  }

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

  // Dựng dữ liệu xuất Kế Hoạch (dùng chung cho xuất file & xem trước)
  function buildPlanningExportData() {
    if (!requireXlsxLib()) return null;
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
      return null;
    }

    // Bố cục theo yêu cầu: 3 dòng đầu (tiêu đề / ngày xuất / bộ lọc) được GỘP
    // tràn cả bảng; BỎ cột Năm & Tuần (thông tin năm/tuần nằm ở dòng Bộ lọc);
    // cột: Stt, Mã SP, Tên SP, Tên Đầy Đủ, Số Lượng, Thể Tích, Loại Ép, Ghi Chú
    // (Ghi Chú để trống — tự điền trong màn Xem Trước trước khi xuất/in).
    const aoa = [
      ['KẾ HOẠCH SẢN XUẤT'],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [`Bộ lọc: ${year === 'all' ? 'Tất cả năm' : 'Năm ' + year} · ${week === 'all' ? 'Tất cả tuần' : week} · ${product === 'all' ? 'Tất cả sản phẩm' : planningProductNameOf(product)}`],
      [],
      ['Stt', 'Mã SP', 'Tên SP', 'Tên Đầy Đủ', 'Số Lượng (tấm)', 'Thể Tích (m³)', 'Loại Ép', 'Ghi Chú']
    ];
    const sorted = [...filtered].sort((a, b) =>
      (a.year - b.year) || String(a.week).localeCompare(String(b.week), 'vi', { numeric: true }));
    let totalQty = 0, totalVol = 0;
    sorted.forEach((p, i) => {
      totalQty += p.qty || 0;
      const rate = (state.materialRates || []).find(r => r.id === p.productId);
      // Thể tích dự kiến = số tấm × thể tích 1 tấm (theo kích thước trong tên sản phẩm)
      const vol = dimVolume(computeFpDimFromProduct(p.productId), p.qty || 0);
      totalVol += vol;
      aoa.push([i + 1,
        (rate && rate.productCode) || '',
        planningProductNameOf(p.productId),
        (rate && rate.fullName) || '',
        p.qty || 0,
        vol ? +vol.toFixed(3) : '',
        (rate && rate.pressType) || '',
        p.note || '']);
    });
    aoa.push(['', '', '', 'TỔNG CỘNG', totalQty, totalVol ? +totalVol.toFixed(3) : '', '', '']);

    // Gộp 3 dòng đầu tràn cả bảng (áp dụng cho cả file Excel & bảng xem trước)
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }
    ];

    return {
      title: 'Kế Hoạch Sản Xuất',
      countLabel: `${filtered.length} dòng kế hoạch`,
      aoa, merges,
      cols: [{ wch:5 },{ wch:10 },{ wch:30 },{ wch:32 },{ wch:13 },{ wch:13 },{ wch:11 },{ wch:26 }],
      rowH: 20,
      sheetName: 'Kế Hoạch SX',
      filename: `KeHoach_SanXuat_${todayStamp()}.xlsx`
    };
  }

  function handlePlanningExportSubmit(e) {
    e.preventDefault();
    const d = buildPlanningExportData();
    if (!d) return;
    exportDataToXlsx(d);
    closePlanningExportModal();
    showToast(`Đã xuất ${d.countLabel} ra file ${d.filename}!`, 'success');
  }


  // ─── 2) SẢN LƯỢNG ÉP VÁN ──────────────────────────────────────
  // Công nhân ép LẤY TỰ ĐỘNG từ phân vị "Ép" theo ngày lượt ép (tab Nhân Sự;
  // hrPressWorkersNamesOf) — không còn nhập tay. Cột cũ `r.worker` chỉ giữ để
  // đọc dữ liệu lịch sử (migrate) khi chưa có phân vị cùng ngày.
  function pressWorkersOf(r) {
    const auto = (typeof hrPressWorkersNamesOf === 'function' ? hrPressWorkersNamesOf(r && r.date) : []) || [];
    const legacy = String((r && r.worker) || '').split(',').map(s => s.trim()).filter(Boolean);
    // GỘP cả 2 nguồn (tự động từ phân vị + dữ liệu cũ), khử trùng theo key chuẩn hóa
    const seen = new Set();
    const out = [];
    [...auto, ...legacy].forEach(n => {
      const k = normWorker(n);
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push(n);
    });
    return out;
  }
  // Key chuẩn hóa để so khớp công nhân (dùng hrStripForMatch: bỏ dấu + gộp khoảng trắng)
  function normWorker(s) {
    return hrStripForMatch(s);
  }
  // Nhãn thành phẩm: ưu tiên snapshot trên lượt ép, fallback về định mức hiện tại.
  // Lượt ép CHƯA ép thành phẩm (không có productId) → "Chưa ép thành phẩm".
  function pressProductLabelOf(r) {
    if (r.productName) return r.productName;
    if (!r.productId) return 'Chưa ép thành phẩm';
    const rate = (state.materialRates || []).find(x => x.id === r.productId);
    return (rate && rate.product) || 'Sản phẩm cũ (định mức đã xóa)';
  }
  function pressVanThoSummary(r) {
    return (r.vanTho || []).map(v => `${v.vtDim || '?'} ×${v.vtQty || 0}`).join(', ') || '—';
  }
  function pressSticksSummary(r) {
    return (r.sticks || []).map(s => {
      const key = String(s.nanKey || '?');
      // Key dạng kích thước (l×w×t) → ván thô đã ép trước đó, tính bằng "tấm"
      const isDim = /^\d+(?:[.,]\d+)?×\d+(?:[.,]\d+)?×\d+(?:[.,]\d+)?$/.test(key.toLowerCase().replace(/[x*]/g, '×'));
      return `${key}: ${s.sticks || 0} ${isDim ? 'tấm' : 'thanh'}`;
    }).join(', ') || '—';
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
    // Công nhân (chuẩn hóa như engine biểu đồ) — nguồn TỰ ĐỘNG từ phân vị tab Nhân Sự
    const workerSel = document.getElementById('export-press-worker');
    if (workerSel) {
      const seen = new Map();
      recs.forEach(r => {
        pressWorkersOf(r).forEach(raw => {
          const key = normWorker(raw);
          if (!key) return;
          if (!seen.has(key)) seen.set(key, raw);
        });
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

  // Dựng dữ liệu xuất Sản Lượng Ép Ván (dùng chung cho xuất file & xem trước)
  function buildPressExportData() {
    if (!requireXlsxLib()) return null;
    const year    = document.getElementById('export-press-year')?.value || 'all';
    const week    = document.getElementById('export-press-week')?.value || 'all';
    const product = document.getElementById('export-press-product')?.value || 'all';
    const worker  = document.getElementById('export-press-worker')?.value || 'all';

    const filtered = (state.pressRecords || []).filter(r => {
      if (year !== 'all' && String(r.date || '').slice(0, 4) !== year) return false;
      if (week !== 'all' && r.week !== week) return false;
      if (product !== 'all' && String(r.productId || '') !== product) return false;
      if (worker !== 'all' && !pressWorkersOf(r).some(n => normWorker(n) === worker)) return false;
      return true;
    });
    if (filtered.length === 0) {
      showToast('Không tìm thấy lượt ép nào thỏa mãn điều kiện!', 'error');
      return null;
    }

    const aoa = [
      ['SẢN LƯỢNG ÉP VÁN'],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [`Bộ lọc: ${year === 'all' ? 'Tất cả năm' : year} · ${week === 'all' ? 'Tất cả tuần' : friendlyWeek(week)} · ${product === 'all' ? 'Tất cả thành phẩm' : 'Thành phẩm đã chọn'} · ${worker === 'all' ? 'Tất cả công nhân' : 'Công nhân đã chọn'}`],
      [],
      ['Stt', 'Ngày', 'Tuần', 'Thành Phẩm', 'Mã SP', 'Tên Đầy Đủ', 'Loại Ép', 'Công Nhân', 'Kích Thước TP', 'SL TP (tấm)', 'Ván Thô', 'Thanh Thô', 'Keo (kg)', 'Phụ Gia (kg)']
    ];
    const sorted = [...filtered].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    let totalQty = 0, totalGlue = 0, totalAdd = 0;
    sorted.forEach((r, i) => {
      const qty = r.finishedQty || 0;
      totalQty += qty; totalGlue += r.glue || 0; totalAdd += r.additive || 0;
      const rate = (state.materialRates || []).find(x => x.id === r.productId);
      aoa.push([
        i + 1, formatDateDDMMYY(r.date), friendlyWeek(r.week), pressProductLabelOf(r),
        (rate && rate.productCode) || '', (rate && rate.fullName) || '', (rate && rate.pressType) || '',
        pressWorkersOf(r).join(', ') || '—', r.fpDim || '—', qty,
        pressVanThoSummary(r), pressSticksSummary(r), r.glue || 0, r.additive || 0
      ]);
    });
    aoa.push(['', '', '', '', '', '', '', '', 'TỔNG CỘNG', totalQty, '', '', totalGlue, totalAdd]);

    // Gộp 3 dòng đầu (tiêu đề / ngày xuất / bộ lọc) tràn cả bảng
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } }
    ];

    return {
      title: 'Sản Lượng Ép Ván',
      countLabel: `${filtered.length} lượt ép`,
      aoa, merges,
      cols: [{wch:5},{wch:11},{wch:14},{wch:26},{wch:10},{wch:30},{wch:12},{wch:14},{wch:16},{wch:11},{wch:28},{wch:24},{wch:10},{wch:11}],
      rowH: 20,
      sheetName: 'Ép Ván',
      filename: `SanLuong_EpVan_${todayStamp()}.xlsx`
    };
  }

  function handlePressExportSubmit(e) {
    e.preventDefault();
    const d = buildPressExportData();
    if (!d) return;
    exportDataToXlsx(d);
    closePressExportModal();
    showToast(`Đã xuất ${d.countLabel} ra file ${d.filename}!`, 'success');
  }

  // Dựng dữ liệu xuất Xưởng 2 theo nguồn (dùng hàm hiển thị của xuong2.js)
  function buildX2ExportData(sourceId) {
    if (!requireXlsxLib()) return null;
    const source = String(sourceId || 'batch');
    const src = X2_EXPORT_SOURCES.find(s => s.id === source) || X2_EXPORT_SOURCES[0];
    const from = (document.getElementById('export-x2-from') || {}).value || '';
    const to   = (document.getElementById('export-x2-to') || {}).value || '';
    let head = [];
    const body = [];
    let sumNote = '';

    if (source === 'batch') {
      head = ['Stt', 'Ngày Vào CĐ', 'Mã Lô', 'Công Đoạn', 'Vị Trí', 'Dài (mm)', 'Rộng (mm)', 'Dày (mm)', 'Số Lượng (thanh)', 'Loại Nan', 'Dùng Cho', 'Có Nguồn Chọn Nan', 'Ghi Chú'];
      const list = x2ExportRowsOf('batch').filter(x => x2InRange(x.date, from, to))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      let qty = 0;
      list.forEach((x, i) => {
        const r = x.rec;
        qty += Number(r.quantity) || 0;
        body.push([i + 1, formatDateDDMMYY(x.date), r.code || '', x2StageLabel(r.stage), r.location || '',
          Number(r.length) || 0, Number(r.width) || 0, Number(r.thickness) || 0, Number(r.quantity) || 0,
          r.bambooType || '', r.useFor || '', r.sourceChonNanId ? 'Có' : '', r.note || '']);
      });
      sumNote = `Tổng ${x2FmtKg(qty)} thanh`;
    } else if (source === 'cut') {
      head = ['Stt', 'Ngày Cắt', 'Loại Nguyên Liệu', 'Nhà Cung Cấp', 'Mã NCC', 'KL Đầu Vào (kg)', 'KL Ống Luồng (kg)', 'KL Ngọn/Ống Loại (kg)', 'KL Củi Đốt (kg)', 'KL Cây Loại (kg)', 'Tỷ Lệ QĐ (%)', 'Người Cắt', 'Giờ Cắt HC', 'Giờ Cắt TC', 'Ghi Chú'];
      const list = x2ExportRowsOf('cut').filter(x => x2InRange(x.date, from, to))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      let w = 0, ong = 0;
      list.forEach((x, i) => {
        const d = x.d; w += d.inputWeight || 0; ong += d.klOngLuong || 0;
        body.push([i + 1, formatDateDDMMYY(d.date), d.materialType || '', d.supplier || '', d.supplierCode || '',
          x2FmtKg(d.inputWeight), x2FmtKg(d.klOngLuong), x2FmtKg(d.klNgonOngLoai), x2FmtKg(d.klCuiDot), x2FmtKg(d.klCayLoai),
          d.ratio == null ? '—' : x2FmtSo(d.ratio), x2WorkerText(d.cutterRows), x2FmtSo(d.cutHoursHC), x2FmtSo(d.cutHoursTC), x.rec.note || '']);
      });
      sumNote = `Tổng KL đầu vào ${x2FmtKg(w)} kg · KL ống luồng ${x2FmtKg(ong)} kg`;
    } else if (source === 'boong') {
      head = ['Stt', 'Ngày Bổ', 'Ngày Cắt', 'Loại Nguyên Liệu', 'Nhà Cung Cấp', 'KL Ống Của Lô (kg)', 'KL Ống Đem Bổ (kg)', 'KL Ống Bổ Đạt (kg)', 'KL Ống Loại (kg)', 'Tỷ Lệ Đạt (%)', 'Người Bổ', 'Giờ HC', 'Giờ TC'];
      const list = x2ExportRowsOf('boong').filter(x => x2InRange(x.date, from, to))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      let inp = 0, ok = 0;
      list.forEach((x, i) => {
        const d = x.d; inp += d.inputOng || 0; ok += d.klOngBo || 0;
        body.push([i + 1, formatDateDDMMYY(d.date), formatDateDDMMYY(d.cutDate), d.materialType || '', d.supplier || '',
          x2FmtKg(d.lotOng), x2FmtKg(d.inputOng), x2FmtKg(d.klOngBo), x2FmtKg(d.klOngLoai),
          d.ratio == null ? '—' : x2FmtSo(d.ratio), x2WorkerText(d.workerRows), x2FmtSo(d.workHoursHC), x2FmtSo(d.workHoursTC)]);
      });
      sumNote = `Tổng ống đem bổ ${x2FmtKg(inp)} kg · ống bổ đạt ${x2FmtKg(ok)} kg`;
    } else if (source === 'baotho') {
      head = ['Stt', 'Ngày Chạy Máy', 'Ngày Bổ', 'Loại Nguyên Liệu', 'Nhà Cung Cấp', 'KL Ống Bổ (kg)', 'Loại Nan (tổ hợp)', 'Số Tổ Hợp', 'Số Thanh', 'Thể Tích Quy Đổi (m³)', 'Công Suất (thanh/h)', 'Người Chạy Máy', 'Giờ HC', 'Giờ TC'];
      const list = x2ExportRowsOf('baotho').filter(x => x2InRange(x.date, from, to))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      let qty = 0, vol = 0;
      list.forEach((x, i) => {
        const d = x.d;
        const dims = (d.combos || []).map(c => `${Number(c.d)} × ${Number(c.r)} × ${Number(c.t)}`).join(' · ') || '—';
        qty += d.qty == null ? 0 : Number(d.qty); vol += Number(d.volume) || 0;
        body.push([i + 1, formatDateDDMMYY(d.date), formatDateDDMMYY(d.boDate), d.materialType || '', d.supplier || '',
          x2FmtKg(d.klOngBo), dims, (d.combos || []).length,
          d.qty == null ? 'Chờ Chọn Nan Thô' : x2FmtKg(d.qty), x2FmtKg(d.volume),
          d.cap == null ? '—' : x2FmtSo(d.cap), x2WorkerText(d.workerRows), x2FmtSo(d.workHoursHC), x2FmtSo(d.workHoursTC)]);
      });
      sumNote = `Tổng ${x2FmtKg(qty)} thanh · ${x2FmtKg(vol)} m³ quy đổi`;
    } else if (source === 'chonnan') {
      head = ['Stt', 'Ngày Chọn', 'Nguồn', 'Ngày Bào Thô', 'Loại Nguyên Liệu', 'Nhà Cung Cấp', 'Loại Nan', 'Phân Loại', 'Số Lượng (thanh)', 'Thể Tích (m³)', 'Người Chọn Nan', 'Giờ HC', 'Giờ TC'];
      const list = x2ExportRowsOf('chonnan').filter(x => x2InRange(x.date, from, to))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      let qty = 0, vol = 0;
      list.forEach((x, i) => {
        const d = x.d;
        qty += Number(d.quantity) || 0; vol += Number(d.volume) || 0;
        body.push([i + 1, formatDateDDMMYY(d.date), d.external ? 'Nan mua ngoài' : 'Lô đã bào thô',
          formatDateDDMMYY(d.btDate), d.materialType || '', d.supplier || '', d.sizeKey || '', d.cls || '',
          x2FmtKg(d.quantity), x2FmtKg(d.volume), x2WorkerText(d.workerRows), x2FmtSo(d.workHoursHC), x2FmtSo(d.workHoursTC)]);
      });
      sumNote = `Tổng ${x2FmtKg(qty)} thanh · ${x2FmtKg(vol)} m³`;
    } else if (source === 'baotinh') {
      head = ['Stt', 'Ngày Bào', 'Loại Bào', 'Nguồn Thanh', 'K.Thước Vào', 'SL Vào (thanh)', 'K.Thước Sau Bào', 'Thanh Đạt', 'Thanh Lỗi', 'Thể Tích Đạt (m³)', 'Người Bào', 'Giờ HC', 'Giờ TC'];
      const list = x2ExportRowsOf('baotinh').filter(x => x2InRange(x.date, from, to))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      let ok = 0, err = 0, vol = 0;
      list.forEach((x, i) => {
        const d = x.d;
        ok += Number(d.qtyOk) || 0; err += Number(d.qtyErr) || 0; vol += Number(d.volumeOk) || 0;
        const srcTxt = d.kind === 'tinh'
          ? `${d.batchCode || '—'}${d.batchLocation ? ` · ${d.batchLocation}` : ''}`
          : (d.kind === 'ha_cap' ? `Thanh lỗi cỡ ${d.defectKey || '—'}` : 'Tự nhập (bào thanh)');
        const inTxt = (d.inDims && d.inDims.length === 3 && d.inDims.some(v => v > 0)) ? x2FmtDim(d.inDims)
          : ((d.batchDims && d.batchDims.length === 3) ? x2FmtDim(d.batchDims)
          : ((d.defectDims && d.defectDims.length === 3) ? x2FmtDim(d.defectDims) : '—'));
        body.push([i + 1, formatDateDDMMYY(d.date), d.kindLabel || '', srcTxt, inTxt,
          x2FmtKg(d.inQty), d.outSizeKey || x2FmtDim(d.outDims), x2FmtKg(d.qtyOk), x2FmtKg(d.qtyErr),
          x2FmtKg(d.volumeOk), x2WorkerText(d.workerRows), x2FmtSo(d.workHoursHC), x2FmtSo(d.workHoursTC)]);
      });
      sumNote = `Tổng đạt ${x2FmtKg(ok)} thanh · lỗi ${x2FmtKg(err)} thanh · thể tích đạt ${x2FmtKg(vol)} m³`;
    }

    if (!head.length) return null;
    if (!body.length) { showToast('Không có dữ liệu trong khoảng ngày đã chọn!', 'error'); return null; }

    const nCol = head.length;
    const aoa = [
      [`XƯỞNG 2 — ${String(src.label).toUpperCase()}`],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [`Khoảng ngày: ${from ? formatDateDDMMYY(from) : 'Từ đầu'} → ${to ? formatDateDDMMYY(to) : 'Đến nay'} · ${sumNote}`],
      [],
      head
    ];
    body.forEach(row => aoa.push(row));
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: nCol - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: nCol - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: nCol - 1 } }
    ];
    return {
      title: src.label,
      countLabel: `${body.length} dòng`,
      aoa, merges,
      cols: head.map(h => ({ wch: Math.max(10, Math.min(26, String(h).length + 4)) })),
      rowH: 20,
      sheetName: String(src.label).slice(0, 28),
      filename: `Xuong2_${source}_${todayStamp()}.xlsx`
    };
  }

  // Mở form xuất dữ liệu Xưởng 2 (nút dùng chung ở tab Công Đoạn gọi vào)
  function openX2ExportModal(sourceId) {
    const srcSel = document.getElementById('export-x2-source');
    if (srcSel) {
      srcSel.innerHTML = X2_EXPORT_SOURCES.map(s =>
        `<option value="${s.id}">${escapeHTML(s.label)}</option>`).join('');
      srcSel.value = X2_EXPORT_SOURCES.some(s => s.id === sourceId) ? sourceId : 'batch';
    }
    // Mặc định: từ đầu tháng hiện tại → hôm nay (xóa trắng = xuất tất cả)
    const today = todayStamp();
    const fromEl = document.getElementById('export-x2-from');
    const toEl = document.getElementById('export-x2-to');
    if (fromEl && !fromEl.value) fromEl.value = `${today.slice(0, 7)}-01`;
    if (toEl && !toEl.value) toEl.value = today;
    const hint = document.getElementById('export-x2-hint');
    if (hint) hint.textContent = 'Để trống khoảng ngày = xuất TẤT CẢ. Chọn nguồn "Ép Ván" sẽ mở form xuất Ép Ván chuyên sâu (lọc theo năm/tuần/thành phẩm/công nhân).';
    modalShow('modal-export-x2');
  }
  function closeX2ExportModal() { modalHide('modal-export-x2'); }

  function handleX2ExportSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const srcSel = document.getElementById('export-x2-source');
    const sourceId = (srcSel && srcSel.value) || 'batch';
    if (sourceId === 'epvan') {
      closeX2ExportModal();       // Ép Ván có form xuất chuyên sâu riêng
      openPressExportModal();
      return;
    }
    const d = buildX2ExportData(sourceId);
    if (!d) return;
    exportDataToXlsx(d);
    closeX2ExportModal();
    showToast(`Đã xuất ${d.countLabel} (${d.title}) ra file ${d.filename}!`, 'success');
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

  // Dựng dữ liệu xuất Nhật Ký Nguyên Liệu (dùng chung cho xuất file & xem trước)
  function buildMaterialsExportData() {
    if (!requireXlsxLib()) return null;
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
      return null;
    }

    // Nhãn vị trí dùng chung với tab Nguyên Liệu
    const MAT_LOC_LABELS = { 'lo-hoi': 'Lò hơi', 'xuong-1': 'Xưởng 1', 'xuong-2': 'Xưởng 2' };
    const locLabel = k => MAT_LOC_LABELS[k] || k || '—';
    const fmtNum = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

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

    // Gộp 3 dòng đầu (tiêu đề / ngày xuất / bộ lọc) tràn cả bảng
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } }
    ];

    return {
      title: 'Nhật Ký Nhập Nguyên Liệu',
      countLabel: `${filtered.length} lần nhập nguyên liệu`,
      aoa, merges,
      cols: [{wch:5},{wch:11},{wch:13},{wch:20},{wch:18},{wch:15},{wch:13},{wch:13},{wch:14},{wch:13},{wch:14},{wch:22},{wch:8}],
      rowH: 20,
      sheetName: 'Nguyên Liệu',
      filename: `NhatKy_NguyenLieu_${todayStamp()}.xlsx`
    };
  }

  function handleMaterialsExportSubmit(e) {
    e.preventDefault();
    const d = buildMaterialsExportData();
    if (!d) return;
    exportDataToXlsx(d);
    closeMaterialsExportModal();
    showToast(`Đã xuất ${d.countLabel} ra file ${d.filename}!`, 'success');
  }

  // =============================================================
  // 4) QC — BẢNG XUẤT HÀNG (tab QC)
  // =============================================================
  // Tên hiển thị của 1 dòng xuất QC (ưu tiên tra định mức theo productId)
  function qcXlsxRowName(row) {
    if (row.productId) {
      const rate = (state.materialRates || []).find(r => r.id === row.productId);
      if (rate) return rate.product;
    }
    return row.name || '—';
  }
  // Thể tích quy đổi 1 dòng (m³) = thể tích 1 thành phẩm × số lượng
  // (kích thước thành phẩm suy từ tên định mức — giống cột thể tích trên bảng QC)
  function qcXlsxRowVolume(row) {
    const qty = Number(row.qty) || 0;
    if (!qty || !row.productId) return 0;
    const rate = (state.materialRates || []).find(r => r.id === row.productId);
    if (!rate) return 0;
    const dim = computeFpDimFromProduct(rate.id);
    return dim ? dimVolume(dim, qty) : 0;
  }
  const qcXlsxWeekNum = w => parseInt(String(w || '').replace(/\D/g, ''), 10) || 0;

  function openQcXlsxExportModal() {
    const recs = state.qcExports || [];
    // Năm: năm hiện tại + năm trong kế hoạch + năm đã xuất
    const yearSel = document.getElementById('export-qc-year');
    if (yearSel) {
      const years = new Set([String(new Date().getFullYear())]);
      (state.planningItems || []).forEach(p => { if (p.year) years.add(String(p.year)); });
      recs.forEach(q => { if (q.year) years.add(String(q.year)); });
      const sorted = [...years].filter(Boolean).sort((a, b) => Number(a) - Number(b));
      yearSel.innerHTML = '<option value="all">Tất Cả Các Năm</option>' +
        sorted.map(y => `<option value="${y}">${y}</option>`).join('');
      yearSel.value = 'all';
    }
    // Tuần: các tuần CÓ dữ liệu xuất
    const weekSel = document.getElementById('export-qc-week');
    if (weekSel) {
      const weeks = [...new Set(recs.map(r => qcXlsxWeekNum(r.week)).filter(Boolean))].sort((a, b) => a - b);
      weekSel.innerHTML = '<option value="all">Tất Cả Các Tuần</option>' +
        weeks.map(w => `<option value="${w}">Tuần ${w}</option>`).join('');
      weekSel.value = 'all';
    }
    // Thành phẩm: các thành phẩm đã xuất (gộp trùng theo mã/tên)
    const prodSel = document.getElementById('export-qc-product');
    if (prodSel) {
      const seen = new Set();
      const opts = [];
      recs.forEach(r => {
        const key = r.productId || `__name__:${r.name || ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        opts.push(`<option value="${escapeHTML(key)}">${escapeHTML(qcXlsxRowName(r))}</option>`);
      });
      prodSel.innerHTML = '<option value="all">Tất Cả Thành Phẩm</option>' + opts.join('');
      prodSel.value = 'all';
    }
    modalShow('modal-export-qc');
  }

  function closeQcXlsxExportModal() { modalHide('modal-export-qc'); }

  function buildQcXlsxExportData() {
    if (!requireXlsxLib()) return null;
    const year = document.getElementById('export-qc-year')?.value || 'all';
    const week = document.getElementById('export-qc-week')?.value || 'all';
    const prod = document.getElementById('export-qc-product')?.value || 'all';
    const weekNum = week === 'all' ? 0 : qcXlsxWeekNum(week);
    const filtered = (state.qcExports || []).filter(r =>
      (year === 'all' || String(r.year ?? '') === String(year)) &&
      (!weekNum || qcXlsxWeekNum(r.week) === weekNum) &&
      (prod === 'all' || (r.productId ? r.productId === prod : (r.name || '') === prod))
    );
    if (!filtered.length) {
      showToast('Không có dòng xuất hàng nào thỏa mãn bộ lọc!', 'error');
      return null;
    }

    // Sắp theo năm → tuần → tên thành phẩm cho dễ đối chiếu
    const sorted = [...filtered].sort((a, b) =>
      (Number(a.year) || 0) - (Number(b.year) || 0) ||
      qcXlsxWeekNum(a.week) - qcXlsxWeekNum(b.week) ||
      qcXlsxRowName(a).localeCompare(qcXlsxRowName(b), 'vi'));

    const aoa = [];
    const today = new Date();
    const dayLabel = `Ngày  ${today.getDate()}  Tháng  ${today.getMonth() + 1}  năm  ${today.getFullYear()}`;
    aoa.push(['QC — BẢNG XUẤT HÀNG', '', '', '', '', '', '']);
    aoa.push([dayLabel, '', '', '', '', '', '']);
    aoa.push(['Stt', 'Thành Phẩm', 'Tuần', 'Năm', 'Số Lượng Xuất', 'Thể Tích Quy Đổi (m³)', 'Ghi Chú']);

    let stt = 1, totalQty = 0, totalVol = 0;
    sorted.forEach(r => {
      const qty = Number(r.qty) || 0;
      const vol = Math.round(qcXlsxRowVolume(r) * 10000) / 10000;
      totalQty += qty;
      totalVol += vol;
      const w = qcXlsxWeekNum(r.week);
      aoa.push([stt++, qcXlsxRowName(r), w ? `Tuần ${w}` : '', r.year || '', qty, vol || '', r.note || '']);
    });
    aoa.push(['', 'TỔNG CỘNG', '', '', totalQty, Math.round(totalVol * 10000) / 10000, '']);
    const totalIdx = aoa.length - 1;

    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },   // Tiêu đề A1:G1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },   // Ngày xuất A2:G2
      { s: { r: totalIdx, c: 1 }, e: { r: totalIdx, c: 3 } } // Nhãn tổng B:D
    ];

    let suffix = '';
    if (year !== 'all') suffix += `_${year}`;
    if (week !== 'all') suffix += `_T${week}`;
    if (prod !== 'all') suffix += `_SP`;

    return {
      title: 'QC — Bảng Xuất Hàng',
      countLabel: `${filtered.length} dòng xuất hàng`,
      aoa, merges,
      cols: [{wch:5},{wch:26},{wch:9},{wch:7},{wch:14},{wch:19},{wch:26}],
      rowH: 20,
      sheetName: 'QC Xuất Hàng',
      filename: `QC_XuatHang${suffix}_${todayStamp()}.xlsx`
    };
  }

  function handleQcXlsxExportSubmit(e) {
    e.preventDefault();
    const d = buildQcXlsxExportData();
    if (!d) return;
    exportDataToXlsx(d);
    closeQcXlsxExportModal();
    showToast(`Đã xuất ${d.countLabel} ra file ${d.filename}!`, 'success');
  }

  // =============================================================
  // 5) NHÂN SỰ — XUẤT EXCEL THEO THẺ NHANH (mini card tab Nhân Sự)
  // =============================================================
  // Mỗi mini card trên tab Nhân Sự tương ứng 1 lựa chọn xuất; nhãn khớp tên thẻ.
  const HR_EMP_STATUS_L     = { active: 'Đang làm việc', pause: 'Tạm nghỉ', quit: 'Đã nghỉ việc' };
  const HR_LEAVE_STATUS_L   = { pending: 'Chờ duyệt', approved: 'Đồng ý', rejected: 'Không đồng ý' };
  const HR_RECRUIT_STATUS_L = { open: 'Đang tuyển', done: 'Đã đủ người' };
  const HR_XLSX_CARDS = [
    { id: 'hr-emp',         label: 'Nhân Viên — Danh Sách Nhân Viên',     sheet: 'Nhân Viên',      file: 'NhanVien' },
    { id: 'hr-timesheet',   label: 'Bảng Chấm Công Theo Tháng (HC/TC)',   sheet: 'Chấm Công Tháng', file: 'ChamCongThang' },
    { id: 'hr-att-day',     label: 'Chấm Công & Phân Vị — Theo Ngày',     sheet: 'Chấm Công Ngày', file: 'ChamCongNgay' },
    { id: 'hr-att-stats',   label: 'Thống Kê Đi Làm — Theo Tháng',        sheet: 'TK Đi Làm',      file: 'TK_DiLam' },
    { id: 'hr-pos',         label: 'Vị Trí Làm Việc & Kỹ Năng',           sheet: 'Vị Trí',         file: 'ViTri' },
    { id: 'hr-ci',          label: 'Giờ Máy Chấm Công',                   sheet: 'Giờ Máy',        file: 'GioMay' },
    { id: 'hr-leave',       label: 'Đơn Xin Nghỉ Phép',                   sheet: 'Nghỉ Phép',      file: 'NghiPhep' },
    { id: 'hr-leave-stats', label: 'Thống Kê Nghỉ Phép — Theo Nhân Viên', sheet: 'TK Nghỉ Phép',   file: 'TK_NghiPhep' },
    { id: 'hr-recruit',     label: 'Nhân Sự Cần — Tuyển Dụng',            sheet: 'Tuyển Dụng',     file: 'TuyenDung' },
    { id: 'hr-posneed',     label: 'Nhân Sự Cần Tại Các Vị Trí',          sheet: 'Nhân Sự Cần',    file: 'NhanSuCan' }
  ];

  function hrXlsxEmpName(id) {
    const e = (state.hrEmployees || []).find(x => x.id === id);
    return (e && e.name) || '—';
  }
  function hrXlsxEmpDept(id) {
    const e = (state.hrEmployees || []).find(x => x.id === id);
    return (e && e.department) || '—';
  }
  function hrXlsxPosName(pid) {
    const p = (state.hrPositions || []).find(x => x.id === pid);
    return (p && p.name) || pid || '';
  }
  // Đơn nghỉ ĐÃ DUYỆT áp dụng cho ngày này?
  function hrXlsxApprovedLeaveOn(eid, date) {
    return (state.hrLeaves || []).find(l => l.employeeId === eid &&
      (l.status || 'pending') === 'approved' &&
      String(l.from || '') <= date && date <= String(l.to || ''));
  }
  function hrXlsxAttRecOf(eid, date) {
    return (state.hrAttendance || []).find(a => a.employeeId === eid && a.date === date) || null;
  }
  function hrXlsxAttLabel(eid, date) {
    if (hrXlsxApprovedLeaveOn(eid, date)) return 'Nghỉ Có Phép';
    const st = attStatusOf(eid, date);
    if (st === 'work') return 'Đi làm';
    if (st === 'absent') return 'Vắng (không phép)';
    return 'Chưa chấm';
  }
  function hrXlsxLeaveDays(l) {
    return l.days || (l.from && l.to ? Math.round((new Date(l.to) - new Date(l.from)) / 86400000) + 1 : 0);
  }

  function openHrXlsxExportModal() {
    // Bộ phận lọc (áp dụng cho các xuất theo nhân viên) — reset về Tất Cả mỗi lần mở
    const deptSel = document.getElementById('export-hr-dept');
    if (deptSel) {
      deptSel.innerHTML = '<option value="all">Tất Cả Bộ Phận</option>' +
        HR_DEPARTMENTS.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
      deptSel.value = 'all';
    }
    // Tháng (thống kê đi làm) & Ngày (chấm công theo ngày) — mặc định theo tab
    const monthEl = document.getElementById('export-hr-month');
    if (monthEl && !monthEl.value) monthEl.value = state.hrAttMonth || new Date().toISOString().split('T')[0].slice(0, 7);
    const dateEl = document.getElementById('export-hr-date');
    if (dateEl && !dateEl.value) dateEl.value = state.hrAttDate || new Date().toISOString().split('T')[0];
    syncHrXlsxCardUI();
    modalShow('modal-export-hr');
  }

  function closeHrXlsxExportModal() { modalHide('modal-export-hr'); }

  // Hiện/ẩn ô Tháng (thống kê đi làm & bảng chấm công tháng) và ô Ngày (chấm công theo ngày) theo thẻ đang chọn
  function syncHrXlsxCardUI() {
    const card = document.getElementById('export-hr-card')?.value || 'hr-emp';
    const mRow = document.getElementById('export-hr-month-row');
    const dRow = document.getElementById('export-hr-date-row');
    if (mRow) mRow.style.display = (card === 'hr-att-stats' || card === 'hr-timesheet') ? '' : 'none';
    if (dRow) dRow.style.display = (card === 'hr-att-day') ? '' : 'none';
  }

  function buildHrXlsxExportData() {
    if (!requireXlsxLib()) return null;
    const cardId = document.getElementById('export-hr-card')?.value || 'hr-emp';
    const def = HR_XLSX_CARDS.find(c => c.id === cardId) || HR_XLSX_CARDS[0];
    const dept = document.getElementById('export-hr-dept')?.value || 'all';
    // Bảng chấm công theo tháng (HC/TC) có bố cục riêng (lưới ngày) — dựng hàm riêng
    if (def.id === 'hr-timesheet') return buildHrTimesheetExportData(def, dept);
    const inDept = d => dept === 'all' || (d || '—') === dept;
    const today = new Date();
    const dayLabel = `Ngày  ${today.getDate()}  Tháng  ${today.getMonth() + 1}  năm  ${today.getFullYear()}`;

    let header = [], rows = [], totalRow = null, extraNote = '';
    const noData = () => { showToast('Không có dữ liệu nào thỏa mãn bộ lọc!', 'error'); return null; };

    switch (def.id) {
      case 'hr-emp': {
        header = ['Stt', 'Mã NV', 'Họ Tên', 'Giới Tính', 'Ngày Sinh', 'Điện Thoại', 'Bộ Phận', 'Vị Trí', 'Chức Danh', 'Ngày Vào', 'Trạng Thái', 'Ghi Chú'];
        rows = (state.hrEmployees || [])
          .filter(e => inDept(e.department))
          .sort((a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'vi') ||
            String(a.name || '').localeCompare(String(b.name || ''), 'vi'))
          .map((e, i) => [i + 1, e.code || '', e.name || '', e.gender || '',
            e.birthDate ? formatDateDDMMYY(e.birthDate) : '', e.phone || '', e.department || '',
            e.position || '', e.title || '', e.joinDate ? formatDateDDMMYY(e.joinDate) : '',
            HR_EMP_STATUS_L[e.status || 'active'] || e.status || '', e.notes || '']);
        if (dept !== 'all') extraNote = `Bộ phận: ${dept}`;
        break;
      }
      case 'hr-att-day': {
        const date = document.getElementById('export-hr-date')?.value || state.hrAttDate || new Date().toISOString().split('T')[0];
        header = ['Stt', 'Họ Tên', 'Mã NV', 'Bộ Phận', 'Trạng Thái', 'Vị Trí / Phân Vị Trong Ngày'];
        // Người ĐÃ NGHỈ VIỆC vẫn xuất nếu ngày xuất CHƯA qua ngày nghỉ việc
        // (vd nghỉ 15/9 thì các bảng ngày 15/9 trở về trước vẫn có người đó)
        rows = (state.hrEmployees || [])
          .filter(e => {
            const st = e.status || 'active';
            if (st !== 'quit') return inDept(e.department);
            const qd = String(e.quitDate || '');
            return /^\d{4}-\d{2}-\d{2}$/.test(qd) && qd >= date && inDept(e.department);
          })
          .sort((a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'vi') ||
            String(a.name || '').localeCompare(String(b.name || ''), 'vi'))
          .map((e, i) => {
            const asg = (state.hrAssignments || []).filter(a => a.date === date && a.employeeId === e.id);
            let posText = '';
            if (asg.length) {
              posText = asg.map(a => `${hrXlsxPosName(a.positionId)}${a.start ? ` (${a.start}${a.end ? '–' + a.end : ''})` : ''}`).join(', ');
            } else {
              const rec = hrXlsxAttRecOf(e.id, date);
              if (rec && Array.isArray(rec.positions)) posText = rec.positions.map(hrXlsxPosName).join(', ');
            }
            return [i + 1, e.name || '', e.code || '', e.department || '', hrXlsxAttLabel(e.id, date), posText];
          });
        extraNote = `Ngày chấm công: ${formatDateDDMMYY(date)}`;
        break;
      }
      case 'hr-att-stats': {
        const month = document.getElementById('export-hr-month')?.value || state.hrAttMonth || new Date().toISOString().split('T')[0].slice(0, 7);
        header = ['Nhân Viên', 'Mã NV', 'Bộ Phận', 'Ngày Công', 'Nghỉ Phép', 'Vắng', 'Chưa Chấm', 'Tỷ Lệ (%)'];
        rows = computeAttendanceStats(month)
          .filter(s => inDept(s.emp.department))
          .map(s => [s.emp.name || '', s.emp.code || '', s.emp.department || '',
            s.work, s.leave, s.absent, s.unmarked, s.rate === null ? '' : s.rate]);
        const t = { work: 0, leave: 0, absent: 0, unmarked: 0 };
        rows.forEach(r => { t.work += r[3]; t.leave += r[4]; t.absent += r[5]; t.unmarked += r[6]; });
        const counted = t.work + t.leave + t.absent;
        totalRow = ['TỔNG CỘNG', '', '', t.work, t.leave, t.absent, t.unmarked, counted ? Math.round(t.work * 1000 / counted) / 10 : ''];
        extraNote = `Tháng: ${month}`;
        break;
      }
      case 'hr-pos': {
        header = ['Stt', 'Vị Trí', 'Bộ Phận', 'Số NV Có Kỹ Năng', 'Nhân Viên Có Kỹ Năng', 'Ghi Chú'];
        rows = (state.hrPositions || [])
          .filter(p => inDept(p.department))
          .sort((a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'vi') ||
            String(a.name || '').localeCompare(String(b.name || ''), 'vi'))
          .map((p, i) => {
            const skilled = (state.hrEmployees || []).filter(e => (e.status || 'active') === 'active' && (e.skills || []).includes(p.id));
            return [i + 1, p.name || '', p.department || '', skilled.length,
              skilled.map(x => x.name).join(', '), p.note || ''];
          });
        if (dept !== 'all') extraNote = `Bộ phận: ${dept}`;
        break;
      }

      case 'hr-ci': {
        header = ['Stt', 'Nhân Viên', 'Bộ Phận', 'Ngày', 'Giờ Vào', 'Giờ Ra', 'Lần Quét', 'Chấm Tay'];
        rows = (state.hrCheckins || [])
          .filter(c => inDept(hrXlsxEmpDept(c.employeeId)))
          .slice()
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) ||
            hrXlsxEmpName(a.employeeId).localeCompare(hrXlsxEmpName(b.employeeId), 'vi'))
          .map((c, i) => {
            let label = 'Chưa chấm tay';
            if (hrXlsxApprovedLeaveOn(c.employeeId, c.date)) label = 'Nghỉ có phép';
            else {
              const st = attStatusOf(c.employeeId, c.date);
              if (st === 'work') label = 'Khớp — Đi làm';
              else if (st === 'absent') label = 'Lệch — Chấm tay Vắng';
            }
            return [i + 1, hrXlsxEmpName(c.employeeId), hrXlsxEmpDept(c.employeeId),
              c.date ? formatDateDDMMYY(c.date) : '', c.in || '', c.out || '', c.punches || 0, label];
          });
        if (dept !== 'all') extraNote = `Bộ phận: ${dept}`;
        break;
      }
      case 'hr-leave': {
        header = ['Stt', 'Nhân Viên', 'Bộ Phận', 'Loại Nghỉ', 'Từ Ngày', 'Đến Ngày', 'Số Ngày', 'Lý Do', 'Trạng Thái', 'Người Duyệt'];
        rows = (state.hrLeaves || [])
          .filter(l => inDept(hrXlsxEmpDept(l.employeeId)))
          .slice()
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
          .map((l, i) => [i + 1, hrXlsxEmpName(l.employeeId), hrXlsxEmpDept(l.employeeId),
            l.type || 'Nghỉ phép', l.from ? formatDateDDMMYY(l.from) : '', l.to ? formatDateDDMMYY(l.to) : '',
            hrXlsxLeaveDays(l), l.reason || '', HR_LEAVE_STATUS_L[l.status || 'pending'] || l.status || '',
            l.approvedBy || '']);
        if (dept !== 'all') extraNote = `Bộ phận: ${dept}`;
        break;
      }
      case 'hr-leave-stats': {
        header = ['#', 'Nhân Viên', 'Bộ Phận', 'Số Lần Nghỉ', 'Tổng Ngày Nghỉ'];
        const stats = computeLeaveStats().filter(s => inDept(s.dept));
        rows = stats.map((s, i) => [i + 1, s.name, s.dept, s.times, s.days]);
        totalRow = ['', 'TỔNG CỘNG', '', stats.reduce((a, s) => a + s.times, 0), stats.reduce((a, s) => a + s.days, 0)];
        if (dept !== 'all') extraNote = `Bộ phận: ${dept}`;
        break;
      }
      case 'hr-recruit': {
        header = ['Bộ Phận', 'Vị Trí Tuyển', 'Cần Tuyển', 'Đã Tuyển', 'Còn Thiếu', 'Ngày Cần', 'Trạng Thái', 'Ghi Chú'];
        const list = (state.hrRecruitment || []).filter(r => inDept(r.department))
          .sort((a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'vi'));
        rows = list.map(r => [r.department || '', r.position || '', r.needQty || 0, r.hiredQty || 0,
          Math.max(0, (r.needQty || 0) - (r.hiredQty || 0)),
          r.needDate ? formatDateDDMMYY(r.needDate) : '',
          HR_RECRUIT_STATUS_L[r.status || 'open'] || r.status || '', r.notes || '']);
        const tNeed = list.reduce((a, r) => a + (r.needQty || 0), 0);
        const tHired = list.reduce((a, r) => a + (r.hiredQty || 0), 0);
        totalRow = ['TỔNG CỘNG', '', tNeed, tHired, Math.max(0, tNeed - tHired), '', '', ''];
        if (dept !== 'all') extraNote = `Bộ phận: ${dept}`;
        break;
      }
      case 'hr-posneed': {
        header = ['Bộ Phận', 'Vị Trí', 'Cần', 'Hiện Có', 'Còn Thiếu', 'Ghi Chú'];
        const list = (state.hrPositionNeeds || []).filter(r => inDept(r.department))
          .sort((a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'vi') ||
            String(a.position || '').localeCompare(String(b.position || ''), 'vi'));
        rows = list.map(r => [r.department || '', r.position || '', parseInt(r.needQty, 10) || 0,
          parseInt(r.haveQty, 10) || 0, Math.max(0, (parseInt(r.needQty, 10) || 0) - (parseInt(r.haveQty, 10) || 0)), r.notes || '']);
        const tNeed = list.reduce((a, r) => a + (parseInt(r.needQty, 10) || 0), 0);
        const tHave = list.reduce((a, r) => a + (parseInt(r.haveQty, 10) || 0), 0);
        totalRow = ['TỔNG CỘNG', '', tNeed, tHave, Math.max(0, tNeed - tHave), ''];
        if (dept !== 'all') extraNote = `Bộ phận: ${dept}`;
        break;
      }
    }

    if (!rows.length) return noData();

    const aoa = [];
    aoa.push([`NHÂN SỰ — ${def.label.toUpperCase()}`]);
    aoa.push([dayLabel + (extraNote ? `  ·  ${extraNote}` : '')]);
    aoa.push(header);
    rows.forEach(r => aoa.push(r));
    if (totalRow) aoa.push(totalRow);

    const span = Math.max(1, header.length - 1);
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: span } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: span } }
    ];

    return {
      title: `Nhân Sự — ${def.label}`,
      countLabel: `${rows.length} dòng`,
      aoa, merges,
      cols: header.map((h, i) => ({ wch: i === 0 ? 5 : Math.max(10, Math.min(34, String(h).length + 8)) })),
      rowH: 20,
      sheetName: def.sheet,
      filename: `NhanSu_${def.file}_${todayStamp()}.xlsx`
    };
  }

  function handleHrXlsxExportSubmit(e) {
    e.preventDefault();
    const d = buildHrXlsxExportData();
    if (!d) return;
    exportDataToXlsx(d);
    closeHrXlsxExportModal();
    showToast(`Đã xuất ${d.countLabel} ra file ${d.filename}!`, 'success');
  }

  // =============================================================
  // 5b) BẢNG CHẤM CÔNG THEO THÁNG (HC/TC) — theo mẫu "Bảng chấm công bộ phận"
  // =============================================================
  // Mỗi nhân viên 2 dòng: HC (giờ hành chính / ca chuẩn) + TC (tăng ca) theo
  // từng ngày của tháng. Nguồn giờ: Bảng bố trí vị trí theo ngày (hrAssignments);
  // không có bố trí thì lấy giờ máy chấm công (hrCheckins). Ngày nghỉ/lễ theo
  // Lịch Làm Việc tháng: đi làm → toàn bộ giờ tính vào TC; không làm → hiện
  // NL (nghỉ/lễ riêng) hoặc '-' (nghỉ định kỳ theo thứ, mặc định Chủ nhật).
  // Tính giờ ngày của 1 nhân viên: { hc, tc } (phút) — date-aware (xét lịch tháng)
  function hrTimesheetDayHours(e, dept, date) {
    const asg = (state.hrAssignments || []).filter(a => a.date === date && a.employeeId === e.id);
    let hc = 0, tc = 0;
    if (asg.length) {
      asg.forEach(a => {
        const r = hrSplitHoursHCDate(a.department || e.department || dept, date, a.start, a.end, a.shiftIdx || 0);
        hc += r.hc; tc += r.tc;
      });
    } else {
      const ci = (state.hrCheckins || []).find(c => c.employeeId === e.id && c.date === date && c.in && c.out);
      if (ci) {
        const r = hrSplitHoursHCDate(e.department || dept, date, ci.in, ci.out, 0);
        hc = r.hc; tc = r.tc;
      }
    }
    return { hc, tc, worked: (hc + tc) > 0 };
  }

  function buildHrTimesheetExportData(def, dept) {
    const monthEl = document.getElementById('export-hr-month');
    const month = (monthEl && /^\d{4}-\d{2}$/.test(monthEl.value)) ? monthEl.value
      : (/^\d{4}-\d{2}$/.test(state.hrAttMonth || '') ? state.hrAttMonth : new Date().toISOString().split('T')[0].slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(month)) { showToast('Tháng thống kê không hợp lệ!', 'error'); return null; }
    const [yy, mm] = month.split('-').map(Number);
    const nDays = new Date(yy, mm, 0).getDate();
    const dates = Array.from({ length: nDays }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
    const today = new Date();

    // Nhân viên xuất trong bảng: đang làm việc / tạm nghỉ luôn có mặt; người
    // ĐÃ NGHỈ VIỆC chỉ xuất trong THÁNG NGHỈ (quitDate cùng tháng xuất) — từ
    // tháng tiếp theo tự ẩn khỏi bảng chấm công.
    const deptOrder = d => { const i = HR_DEPARTMENTS.indexOf(d); return i === -1 ? HR_DEPARTMENTS.length : i; };
    const list = (state.hrEmployees || [])
      .filter(e => {
        const st = e.status || 'active';
        const okDept = dept === 'all' || (e.department || '—') === dept;
        if (!okDept) return false;
        if (st !== 'quit') return true;
        const qd = String(e.quitDate || '');
        return /^\d{4}-\d{2}-\d{2}$/.test(qd) && qd.slice(0, 7) === month;
      })
      .sort((a, b) => deptOrder(a.department) - deptOrder(b.department) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
    if (!list.length) { showToast('Không có nhân viên nào thỏa mãn bộ lọc!', 'error'); return null; }

    const SUM_COLS = ['Ngày Công', 'Giờ HC', 'Giờ TC', 'Tổng Giờ'];
    const lastCol = 3 + nDays + SUM_COLS.length - 1;   // chỉ số cột cuối cùng (0-based)
    const fills = {};      // {'r,c': 'DDEBF7'} — tô nền cột nghỉ (Xem Trước; Excel best-effort)
    const zCells = {};     // {'r,c': '0.0'} — định dạng số 1 chữ số lẻ (hiển thị 9.0)
    const styleCells = {}; // {'r,c': {bold, align}} — tiêu đề đậm/căn giữa (best-effort Excel)
    const merges = [];
    const hour = mins => Math.round((mins / 60) * 100) / 100;  // phút → giờ thập phân

    // ── Dựng bảng ────────────────────────────────────────────────
    // r0 tiêu đề GỘP TOÀN BỘ chiều rộng bảng (đậm + căn giữa, không xuống dòng)
    // · r1 tháng/năm · r2 trống · r3 chú giải GỘP 5 Ô CUỐI (không xuống dòng) ·
    // r4 "Ngày/ thứ trong tháng" + nhãn cột tổng · r5 số ngày · r6 thứ trong tuần
    // (Bỏ dòng "Khối/xưởng" — tên bộ phận đã nằm ngay trong dòng tiêu đề.)
    const aoa = [];
    aoa.push([dept === 'all' ? 'BẢNG CHẤM CÔNG TOÀN NHÀ MÁY' : `BẢNG CHẤM CÔNG BỘ PHẬN ${String(dept).toUpperCase()}`]);
    aoa.push([`Tháng ${mm} năm ${yy}`]);
    aoa.push([]);
    aoa.push(new Array(lastCol + 1).fill(''));
    aoa[3][lastCol - 4] = '*Công HC: hành chính; TC: tăng ca; NL: nghỉ/lễ; "-" nghỉ theo lịch; P: nghỉ có phép; V: vắng';
    // r4: "Ngày/ thứ trong tháng" (gộp vùng cột ngày) + nhãn 4 cột tổng (gộp dọc r4:r6)
    aoa.push(new Array(lastCol + 1).fill(''));
    aoa[4][3] = 'Ngày/ thứ trong tháng';
    SUM_COLS.forEach((s, k) => { aoa[4][3 + nDays + k] = s; merges.push({ s: { r: 4, c: 3 + nDays + k }, e: { r: 6, c: 3 + nDays + k } }); });
    // r5: số ngày + 3 nhãn cột trái (gộp dọc r5:r6) · r6: thứ trong tuần
    aoa.push(['Họ tên', 'Chức vụ', 'Công', ...dates.map((_, i) => String(i + 1).padStart(2, '0')), '', '', '', '']);
    aoa.push(['', '', '', ...dates.map(d => HR_DOW_SHORT[new Date(d + 'T00:00:00').getDay()]), '', '', '', '']);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } });             // tiêu đề gộp toàn bộ bảng
    styleCells['0,0'] = { bold: true, align: 'center' };                      // tiêu đề đậm + căn giữa
    merges.push({ s: { r: 3, c: lastCol - 4 }, e: { r: 3, c: lastCol } });   // chú giải gộp 5 ô cuối
    merges.push({ s: { r: 5, c: 0 }, e: { r: 6, c: 0 } });
    merges.push({ s: { r: 5, c: 1 }, e: { r: 6, c: 1 } });
    merges.push({ s: { r: 5, c: 2 }, e: { r: 6, c: 2 } });
    merges.push({ s: { r: 4, c: 3 }, e: { r: 4, c: 3 + nDays - 1 } });
    // Tô nền cột ngày nghỉ trên vùng tiêu đề (r4..r6)
    dates.forEach((d, i) => {
      const kind = hrDayKindOf(d);
      if (kind === 'work') return;
      for (let r = 4; r <= 6; r++) fills[`${r},${3 + i}`] = kind === 'holiday' ? 'FFF2CC' : 'DDEBF7';
    });

    // ── Dòng dữ liệu: mỗi nhân viên 2 dòng HC / TC ──
    const allDay = list.map(e => dates.map(d => hrTimesheetDayHours(e, e.department || dept, d)));
    list.forEach((e, ei) => {
      const rHc = aoa.length;              // dòng HC (dòng TC = rHc + 1)
      const hcRow = new Array(lastCol + 1).fill('');
      const tcRow = new Array(lastCol + 1).fill('');
      // Người nghỉ việc: tên kèm ngày nghỉ (ngày làm cuối) để dễ đối chiếu
      const quitDate = /^\d{4}-\d{2}-\d{2}$/.test(String(e.quitDate || '')) ? String(e.quitDate) : '';
      hcRow[0] = (e.name || '') + (quitDate ? ` (nghỉ từ ${formatDateDDMMYY(quitDate)})` : '');
      hcRow[1] = e.title || e.position || '';
      hcRow[2] = 'HC';
      tcRow[2] = 'TC';
      let nWork = 0, sHc = 0, sTc = 0;
      dates.forEach((d, i) => {
        const kind = hrDayKindOf(d);
        const { hc, tc, worked } = allDay[ei][i];
        const c = 3 + i;
        const afterQuit = quitDate && d > quitDate; // đã nghỉ việc — ô trống, không tính
        if (!afterQuit) {
          sHc += hc; sTc += tc;
          if (worked) nWork++;
          if (worked) {
            if (hc > 0) { hcRow[c] = hour(hc); zCells[`${rHc},${c}`] = '0.0'; }
            if (tc > 0) { tcRow[c] = hour(tc); zCells[`${rHc + 1},${c}`] = '0.0'; }
            else tcRow[c] = '-';           // có đi làm nhưng không có giờ ngoài ca
          } else if (kind === 'holiday') hcRow[c] = 'NL';
          else if (kind === 'off') hcRow[c] = '-';
          else {
            const st = attStatusOf(e.id, d);
            if (st === 'leave') hcRow[c] = 'P';
            else if (st === 'absent') hcRow[c] = 'V';
          }
        }
        if (kind !== 'work') {
          const rgb = kind === 'holiday' ? 'FFF2CC' : 'DDEBF7';
          fills[`${rHc},${c}`] = rgb; fills[`${rHc + 1},${c}`] = rgb;
        }
      });
      // 4 cột tổng (gộp dọc 2 dòng của nhân viên)
      hcRow[3 + nDays] = nWork;
      hcRow[4 + nDays] = hour(sHc);
      hcRow[5 + nDays] = hour(sTc);
      hcRow[6 + nDays] = hour(sHc + sTc);
      for (let k = 1; k <= 3; k++) zCells[`${rHc},${3 + nDays + k}`] = '0.0';
      aoa.push(hcRow, tcRow);
      merges.push({ s: { r: rHc, c: 0 }, e: { r: rHc + 1, c: 0 } });
      merges.push({ s: { r: rHc, c: 1 }, e: { r: rHc + 1, c: 1 } });
      for (let k = 0; k < SUM_COLS.length; k++) merges.push({ s: { r: rHc, c: 3 + nDays + k }, e: { r: rHc + 1, c: 3 + nDays + k } });
    });

    // ── Dòng TỔNG CỘNG: tổng giờ làm từng ngày + tổng cột ──
    const rTot = aoa.length;
    const totRow = new Array(lastCol + 1).fill('');
    totRow[0] = 'TỔNG CỘNG';
    let tWork = 0, tHc = 0, tTc = 0;
    dates.forEach((d, i) => {
      let dayMin = 0;
      list.forEach((_, ei) => { dayMin += allDay[ei][i].hc + allDay[ei][i].tc; });
      if (dayMin > 0) { totRow[3 + i] = hour(dayMin); zCells[`${rTot},${3 + i}`] = '0.0'; }
      const kind = hrDayKindOf(d);
      if (kind !== 'work') fills[`${rTot},${3 + i}`] = kind === 'holiday' ? 'FFF2CC' : 'DDEBF7';
    });
    list.forEach((_, ei) => {
      allDay[ei].forEach(h => { tHc += h.hc; tTc += h.tc; if (h.worked) tWork++; });
    });
    totRow[3 + nDays] = tWork;
    totRow[4 + nDays] = hour(tHc);
    totRow[5 + nDays] = hour(tTc);
    totRow[6 + nDays] = hour(tHc + tTc);
    for (let k = 0; k <= 3; k++) zCells[`${rTot},${3 + nDays + k}`] = '0.0';
    aoa.push(totRow);
    merges.push({ s: { r: rTot, c: 0 }, e: { r: rTot, c: 2 } });

    // ── Độ rộng cột + thông tin file ──
    const cols = [{ wch: 24 }, { wch: 9 }, { wch: 7 },
      ...dates.map(() => ({ wch: 5.5 })),
      { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 10 }];

    return {
      title: `Bảng Chấm Công Theo Tháng — ${dept === 'all' ? 'Toàn Nhà Máy' : dept} (${month})`,
      countLabel: `${list.length} nhân viên · tháng ${month}`,
      aoa, merges, cols,
      fills, zCells, styleCells,
      rowH: 18,
      sheetName: def.sheet,
      filename: `NhanSu_ChamCongThang_${month}_${todayStamp()}.xlsx`
    };
  }

  // =============================================================
  // XEM TRƯỚC & CHỈNH SỬA BÁO CÁO TRƯỚC KHI XUẤT / IN
  // =============================================================

  // Mọi báo cáo xuất Excel đều được dựng thành bảng AOA → dùng chung
  // 1 màn "Xem Trước": sửa ô trực tiếp, bỏ dòng tùy ý (chỉ ảnh hưởng bản
  // xuất/in — KHÔNG đổi dữ liệu của app), rồi:
  //   • "Xuất Excel (.xlsx)": ghi đúng bảng đã chỉnh (giữ ô gộp)
  //   • "In / Lưu PDF": window.print() với CSS in riêng, chỉ in bảng báo cáo
  let exportPreviewState = null; // { data, builder, deletedRows:Set, overrides:{} }

  function openExportPreview(sourceModalId, builder) {
    if (!requireXlsxLib()) return;
    const data = builder();
    if (!data) return;
    if (data.warning) showToast(data.warning, 'error');
    exportPreviewState = buildPreviewState(data, builder);
    if (sourceModalId) modalHide(sourceModalId);
    renderExportPreview();
    modalShow('modal-export-preview');
  }

  // Trạng thái màn xem trước: chỉnh sửa của người dùng (ô sửa, dòng bỏ)
  // + độ rộng cột mặc định lấy theo chuẩn cột của file Excel (!cols).
  function buildPreviewState(data, builder) {
    return {
      data, builder,
      deletedRows: new Set(),
      overrides: {},
      colWidths: (data.cols || []).map(c => Math.max(48, Math.round((c.wch || 10) * 8)))
    };
  }

  function closeExportPreviewModal() { modalHide('modal-export-preview'); }

  // Vẽ lại bảng xem trước (giữ nguyên ô đã sửa & dòng đã bỏ)
  function renderExportPreview() {
    if (!exportPreviewState) return;
    const box = document.getElementById('export-preview-table-box');
    if (!box) return;
    const { data, deletedRows, overrides, colWidths } = exportPreviewState;
    box.innerHTML = buildExportPreviewTableHTML(data.aoa, data.merges || [], deletedRows, overrides, false, colWidths, data.fills || null);
    const titleEl = document.getElementById('export-preview-title');
    if (titleEl) titleEl.innerHTML = `<i data-lucide="table"></i> Xem Trước: ${escapeHTML(data.title)}`;
    const infoEl = document.getElementById('export-preview-info');
    if (infoEl) infoEl.textContent = `${data.countLabel} · sửa trực tiếp trên bảng trước khi xuất/in`;
    initLucide();
  }

  // Bảng HTML dựng từ AOA + ô gộp (hàm thuần — dùng cho cả xem trước & bản in).
  // deletedRows: Set chỉ số dòng bị bỏ; overrides: {'r,c': nội dung đã sửa}.
  // colWidths: mảng độ rộng cột (px) → dựng <colgroup> đúng cân đối như file Excel.
  // fills: {'r,c': 'DDEBF7'} — màu nền minh họa (VD cột Chủ nhật của bảng chấm công tháng).
  function buildExportPreviewTableHTML(aoa, merges, deletedRows, overrides, forPrint, colWidths, fills) {
    deletedRows = deletedRows || new Set();
    overrides = overrides || {};
    fills = fills || {};
    const maxCols = aoa.reduce((m, row) => Math.max(m, row.length), 0);
    let colgroup = '';
    if (!forPrint && Array.isArray(colWidths)) {
      colgroup = '<colgroup>' + Array.from({ length: maxCols }, (_, c) =>
        (colWidths[c] ? `<col style="width:${colWidths[c]}px">` : '<col>')).join('') + '</colgroup>';
    }
    const covered = {};   // ô bị che bởi merge (không tự vẽ)
    const mergeAt = {};   // ô neo của merge
    (merges || []).forEach(m => {
      mergeAt[m.s.r + ',' + m.s.c] = m;
      for (let r = m.s.r; r <= m.e.r; r++)
        for (let c = m.s.c; c <= m.e.c; c++)
          if (r !== m.s.r || c !== m.s.c) covered[r + ',' + c] = true;
    });
    const rowsHtml = aoa.map((row, r) => {
      if (deletedRows.has(r)) return '';
      let tds = '';
      for (let c = 0; c < maxCols; c++) {
        if (covered[r + ',' + c]) continue;
        const merge = mergeAt[r + ',' + c];
        const spanAttrs = merge
          ? (merge.e.c > merge.s.c ? ` colspan="${merge.e.c - merge.s.c + 1}"` : '') +
            (merge.e.r > merge.s.r ? ` rowspan="${merge.e.r - merge.s.r + 1}"` : '')
          : '';
        // Ô gộp TRÀN CẢ BẢNG (3 dòng đầu: tiêu đề / ngày xuất / bộ lọc):
        // dòng tiêu đề -> chữ to & đậm; các dòng đầu còn lại -> đậm
        let cellCls = '';
        if (merge && (merge.e.c - merge.s.c + 1) === maxCols) {
          cellCls = r === 0 ? ' class="cell-title"' : ' class="cell-subtitle"';
        }
        const key = r + ',' + c;
        const shown = Object.prototype.hasOwnProperty.call(overrides, key)
          ? String(overrides[key])
          : ((row[c] === undefined || row[c] === null) ? '' : String(row[c]));
        const editable = forPrint ? '' : ' contenteditable="true"';
        const fill = fills[r + ',' + c];
        const fillStyle = fill ? ` style="background:#${fill};"` : '';
        tds += `<td data-r="${r}" data-c="${c}"${cellCls}${spanAttrs}${fillStyle}${editable}>${escapeHTML(shown)}</td>`;
      }
      const action = forPrint ? '' :
        `<td class="export-preview-actions"><button type="button" class="export-preview-del-btn" data-del-row="${r}" title="Bỏ dòng này khỏi bản xuất/in (không ảnh hưởng dữ liệu app)">✕</button></td>`;
      return `<tr data-r="${r}">${tds}${action}</tr>`;
    }).join('');
    return `<table class="${forPrint ? 'export-preview-print-table' : 'export-preview-table'}">${colgroup}<tbody>${rowsHtml}</tbody></table>`;
  }

  // Ghi nhận nội dung người dùng vừa sửa 1 ô (đi qua input delegation từ events.js)
  function noteExportPreviewEdit(r, c, text) {
    if (!exportPreviewState) return;
    exportPreviewState.overrides[r + ',' + c] = text;
  }

  // Bỏ 1 dòng khỏi bản xuất/in (vẽ lại, vẫn giữ các ô đã sửa)
  function deleteExportPreviewRow(r) {
    if (!exportPreviewState) return;
    exportPreviewState.deletedRows.add(r);
    renderExportPreview();
  }

  // Đổi độ rộng 1 cột (kéo mép phải ô trên desktop) — cập nhật trực tiếp <col>
  // để kéo mượt, không cần vẽ lại cả bảng
  function setExportPreviewColWidth(c, w) {
    if (!exportPreviewState) return;
    if (!Array.isArray(exportPreviewState.colWidths)) exportPreviewState.colWidths = [];
    exportPreviewState.colWidths[c] = Math.max(40, Math.round(w));
    const box = document.getElementById('export-preview-table-box');
    if (box && box.querySelectorAll) {
      const cols = box.querySelectorAll('col');
      if (cols && cols[c] && cols[c].style) cols[c].style.width = exportPreviewState.colWidths[c] + 'px';
    }
  }

  // Làm mới bảng theo bộ lọc hiện tại (xóa mọi chỉnh sửa trong màn xem trước)
  function refreshExportPreview() {
    if (!exportPreviewState) return;
    const data = exportPreviewState.builder();
    if (!data) return;
    exportPreviewState = buildPreviewState(data, exportPreviewState.builder);
    renderExportPreview();
    showToast('Đã làm mới bảng theo bộ lọc', 'info');
  }

  // Bảng AOA đã chỉnh: ô sửa (giữ số nếu gốc là số để Excel còn tính toán) + dòng bỏ
  function collectPreviewAoa() {
    const { data, overrides, deletedRows } = exportPreviewState;
    const aoa = data.aoa.map(row => [...row]);
    Object.keys(overrides).forEach(k => {
      const [r, c] = k.split(',').map(Number);
      if (!aoa[r]) return;
      const text = String(overrides[k]).replace(/\u00a0/g, ' ').trim();
      const orig = aoa[r][c];
      if (typeof orig === 'number') {
        const num = text.replace(',', '.');
        aoa[r][c] = (text !== '' && /^-?[\d.]+$/.test(num) && !isNaN(Number(num))) ? Number(num) : text;
      } else {
        aoa[r][c] = text;
      }
    });
    return aoa.filter((row, r) => !deletedRows.has(r));
  }

  // Đổi chỉ số ô gộp sau khi bỏ dòng (merge dính dòng bị bỏ thì loại luôn cho an toàn)
  function remapPreviewMerges(merges, deletedRows, originalRows) {
    if (!merges || !deletedRows.size) return merges || null;
    const rowMap = {}; let nr = 0;
    for (let r = 0; r < originalRows; r++) if (!deletedRows.has(r)) rowMap[r] = nr++;
    return merges.filter(m => {
      for (let r = m.s.r; r <= m.e.r; r++) if (deletedRows.has(r)) return false;
      return true;
    }).map(m => ({ s: { r: rowMap[m.s.r], c: m.s.c }, e: { r: rowMap[m.e.r], c: m.e.c } }));
  }

  // Xuất .xlsx từ bảng ĐÃ CHỈNH trong màn xem trước
  function exportPreviewToXlsx() {
    if (!exportPreviewState) return;
    const { data, deletedRows } = exportPreviewState;
    const aoa = collectPreviewAoa();
    const merges = remapPreviewMerges(data.merges || null, deletedRows, data.aoa.length);
    exportDataToXlsx({ ...data, aoa, merges });
    const kept = data.aoa.length - deletedRows.size;
    closeExportPreviewModal();
    showToast(`Đã xuất ${kept} dòng (theo bảng đã chỉnh sửa) ra file ${data.filename}!`, 'success');
  }

  // In / Lưu PDF: bản in = bảng đã chỉnh, không có cột thao tác (CSS @media print riêng)
  function printExportPreview() {
    if (!exportPreviewState) return;
    const area = document.getElementById('export-preview-print-area');
    if (!area) return;
    const { data, deletedRows } = exportPreviewState;
    const aoa = collectPreviewAoa();
    const merges = remapPreviewMerges(data.merges || null, deletedRows, data.aoa.length);
    area.innerHTML = buildExportPreviewTableHTML(aoa, merges || [], new Set(), null, true, null, data.fills || null);
    document.body.classList.add('export-preview-printing');
    const cleanup = () => {
      document.body.classList.remove('export-preview-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500); // dự phòng trình duyệt/PWA không bắn sự kiện afterprint
  }

  // Cửa vào xem trước cho từng loại báo cáo (đóng modal lọc, mở màn xem trước)
  function openCustomExportPreview()   { openExportPreview('modal-custom-export',     buildCustomExportData); }
  function openPlanningExportPreview() { openExportPreview('modal-export-planning',   buildPlanningExportData); }
  function openPressExportPreview()     { openExportPreview('modal-export-press',     buildPressExportData); }
  function openMaterialsExportPreview() { openExportPreview('modal-export-materials', buildMaterialsExportData); }
  function openQcXlsxExportPreview()    { openExportPreview('modal-export-qc',        buildQcXlsxExportData); }
  function openHrXlsxExportPreview()    { openExportPreview('modal-export-hr',        buildHrXlsxExportData); }

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
    logDataChange(['customCharts']); // lịch sử sửa đổi (tab Dashboard)
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
  // worker so theo DANH SÁCH TỰ ĐỘNG từ phân vị (fallback dữ liệu cũ)
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
    // Công nhân: lượt ép có BẤT KỲ công nhân nào khớp giá trị lọc đã chuẩn hóa
    // (chuẩn hóa cả 2 phía qua normWorker — lọc 'hùng' khớp dữ liệu 'Hùng')
    const workerVals = filterValList(f.worker);
    if (workerVals) {
      const recKeys = pressWorkersOf(r).map(normWorker).filter(Boolean);
      const wantKeys = workerVals.map(normWorker).filter(Boolean);
      if (!wantKeys.some(v => recKeys.includes(v))) return false;
    }
    if (f.dateFrom && (!r.date || r.date < f.dateFrom)) return false;
    if (f.dateTo   && (!r.date || r.date > f.dateTo))   return false;
    return true;
  }

  // ─── HELPER HIỂN THỊ THÂN THIỆN CHO BỘ LỌC & NHÓM ─────────────
  // ID sản phẩm còn định mức hay không
  function rateExists(productId) {
    return !!(productId && (state.materialRates || []).some(r => r.id === productId));
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
    // Ép ván: công nhân lấy TỰ ĐỘNG từ phân vị cùng ngày (fallback dữ liệu cũ `worker`)
    const records = (state.pressRecords || []).filter(r => pressPassesFilters(r, chartDef));
    const monthKey = r => (r.date || '').slice(0, 7); // YYYY-MM
    // Nhãn công nhân: biến thể viết phổ biến nhất trong nhóm đã chuẩn hóa
    const workerVariants = {};
    records.forEach(r => {
      pressWorkersOf(r).forEach(raw => {
        const key = normWorker(raw); if (!key) return;
        (workerVariants[key] = workerVariants[key] || {});
        workerVariants[key][String(raw).trim()] = (workerVariants[key][String(raw).trim()] || 0) + 1;
      });
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
        case 'worker':  {
          const names = pressWorkersOf(r);
          const key = names.length ? normWorker(names.slice().sort((a, b) => normWorker(a).localeCompare(normWorker(b)))[0]) : '';
          return key ? workerBestLabel(key) : 'Chưa ghi';
        }
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
  buildExportPreviewTableHTML,
  buildHrXlsxExportData,
  buildQcXlsxExportData,
  buildX2ExportData,
  closeCustomExportModal,
  closeExportPreviewModal,
  closeHrXlsxExportModal,
  closeMaterialsExportModal,
  closePlanningExportModal,
  closePressExportModal,
  closeQcXlsxExportModal,
  closeX2ExportModal,
  computeChartData,
  deleteExportPreviewRow,
  exportPreviewToXlsx,
  filterValList,
  getPaletteColors,
  handleCustomExportSubmit,
  handleHrXlsxExportSubmit,
  handleMaterialsExportSubmit,
  handlePlanningExportSubmit,
  handlePressExportSubmit,
  handleQcXlsxExportSubmit,
  handleX2ExportSubmit,
  isAllFilterVal,
  loadCustomCharts,
  matchFilterVal,
  noteExportPreviewEdit,
  openCustomExportModal,
  openCustomExportPreview,
  openHrXlsxExportModal,
  openHrXlsxExportPreview,
  openMaterialsExportModal,
  openMaterialsExportPreview,
  openPlanningExportModal,
  openPlanningExportPreview,
  openPressExportModal,
  openPressExportPreview,
  openQcXlsxExportModal,
  openQcXlsxExportPreview,
  openX2ExportModal,
  printExportPreview,
  refreshExportPreview,
  saveCustomCharts,
  setExportPreviewColWidth,
  syncHrXlsxCardUI
};
