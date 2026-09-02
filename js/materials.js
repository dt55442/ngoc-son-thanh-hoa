// ═══════════════════════════════════════════════════════════
// js/materials.js — Tab NHẬP NGUYÊN LIỆU
// Ghi nhận nguyên liệu nhập cho 3 vị trí: Lò hơi, Xưởng 1, Xưởng 2.
//   - Mỗi vị trí nhập được nhiều loại nguyên liệu khác nhau.
//   - Trường: ngày, loại nguyên liệu, nhà cung cấp, dùng cho (vị trí),
//     chỉ số đầu vào, chỉ số đầu ra, trọng lượng (đầu vào − đầu ra),
//     hình ảnh tải lên (ảnh 2 CẤP: thumbnail nhỏ inline + ảnh full nằm
//     ngoài bản ghi trong kho IndexedDB / file materials-photos/ —
//     xem js/photo-store.js) để bản ghi không phình theo số ảnh.
// Dữ liệu state.materialRecords: lưu localStorage + file + mây
// (firePushSync), và là nguồn 'materials' cho biểu đồ Dashboard.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { dataUrlToBlob, deletePhotos, getPhotoURL, photosAvailable, putPhoto } from './photo-store.js';
import { STORAGE_KEY_MATERIALS, state } from './state.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';

  // Ghi/xóa file ảnh qua storage.js (import động để tránh vòng phụ thuộc module)
  function storageModule() {
    return import('./storage.js').catch(() => null);
  }

  // ─── HẰNG SỐ ──────────────────────────────────────────────────
  // 3 vị trí nhập nguyên liệu (theo yêu cầu). Key không dấu để gọn khi lưu trữ.
  const MATERIAL_LOCATIONS = [
    { key: 'lo-hoi',  label: 'Lò hơi',  icon: 'flame' },
    { key: 'xuong-1', label: 'Xưởng 1', icon: 'warehouse' },
    { key: 'xuong-2', label: 'Xưởng 2', icon: 'warehouse' }
  ];

  // Gợi ý loại nguyên liệu (datalist — vẫn nhập tay tự do được)
  const MATERIAL_TYPE_SUGGESTIONS = [
    'Tre nguyên liệu', 'Thanh tre thô', 'Dăm tre', 'Keo UF', 'Phụ gia',
    'Bao bì', 'Màng PE', 'Giấy nhám', 'Khác'
  ];

  // Nhãn vị trí từ key hoặc label cũ (dữ liệu đồng bộ từ máy khác)
  function materialLocationLabel(loc) {
    const found = MATERIAL_LOCATIONS.find(l => l.key === loc || l.label === loc);
    return found ? found.label : (loc || '—');
  }

  // Tuần dạng máy "2026-W33" → người dùng đọc "Tuần 33 (2026)"
  function friendlyMaterialWeek(w) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(String(w || ''));
    if (m) return `Tuần ${parseInt(m[2], 10)} (${m[1]})`;
    return String(w || '');
  }

  // Tuần ISO từ ngày: "2026-W33" (hiển thị qua friendlyMaterialWeek)
  function materialWeekLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const target = new Date(d.getTime());
    const dayNr = (d.getDay() + 6) % 7; // Thứ 2 = 0 .. CN = 6
    target.setDate(target.getDate() - dayNr + 3); // nhảy tới thứ Năm của tuần
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const fDayNr = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - fDayNr + 3);
    const week = 1 + Math.round((target - firstThursday) / (7 * 86400000));
    return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  function materialMonthKey(dateStr) {
    return dateStr ? String(dateStr).slice(0, 7) : ''; // YYYY-MM
  }

  // ─── BỘ LỌC THỜI GIAN THẺ KPI (Tất Cả / Tuần / Tháng / Năm) ───
  const MATERIAL_KPI_PERIODS = [
    { key: 'all',   label: 'Tất Cả',   icon: 'infinity' },
    { key: 'week',  label: 'Tuần này', icon: 'calendar-days' },
    { key: 'month', label: 'Tháng này', icon: 'calendar' },
    { key: 'year',  label: 'Năm này',  icon: 'calendar-range' }
  ];

  // Mô tả kỳ đang chọn (hiển thị cạnh nhãn KPI, VD "Tuần 36 (2026)")
  function kpiPeriodCaption() {
    const now = new Date().toISOString().split('T')[0];
    switch (state.materialKpiPeriod) {
      case 'week':  return friendlyMaterialWeek(materialWeekLabel(now));
      case 'month': {
        const ym = materialMonthKey(now);
        const [y, m] = ym.split('-');
        return `Tháng ${parseInt(m, 10)}/${y}`;
      }
      case 'year':  return `Năm ${now.slice(0, 4)}`;
      default:      return 'Toàn bộ dữ liệu';
    }
  }

  // Bản ghi thỏa mãn kỳ KPI đang chọn (week/month = kỳ hiện tại so với hôm nay)
  function kpiPeriodFilteredRecords() {
    const period = state.materialKpiPeriod || 'all';
    if (period === 'all') return filteredMaterialRecords();
    const now = new Date().toISOString().split('T')[0];
    const curWeek  = materialWeekLabel(now);
    const curMonth = materialMonthKey(now);
    const curYear  = now.slice(0, 4);
    return filteredMaterialRecords().filter(r => {
      const d = r.date || '';
      if (period === 'week')  return d && materialWeekLabel(d) === curWeek;
      if (period === 'month') return d && materialMonthKey(d) === curMonth;
      if (period === 'year')  return d && d.slice(0, 4) === curYear;
      return true;
    });
  }

  function renderMaterialKpiFilter() {
    const wrap = document.getElementById('material-kpi-filter');
    if (!wrap) return;
    wrap.innerHTML = MATERIAL_KPI_PERIODS.map(p => `
      <button type="button" class="material-kpi-pill ${state.materialKpiPeriod === p.key ? 'active' : ''}" data-mat-kpi-period="${p.key}" title="${escapeHTML(kpiPeriodCaption())}">
        <i data-lucide="${p.icon}"></i> ${escapeHTML(p.label)}
      </button>
    `).join('') + `<span class="material-kpi-caption">${escapeHTML(kpiPeriodCaption())}</span>`;
    initLucide();
  }


  // ─── LƯU / NẠP DỮ LIỆU ───────────────────────────────────────
  function loadMaterialRecords() {
    const raw = localStorage.getItem(STORAGE_KEY_MATERIALS);
    if (raw) {
      try { state.materialRecords = JSON.parse(raw); }
      catch (e) { state.materialRecords = []; }
    } else {
      state.materialRecords = [];
    }
    migrateMaterialImages(); // ảnh legacy (dataURL nguyên bản) → kho ảnh (fire-and-forget)
  }

  function saveMaterialRecords() {
    try {
      localStorage.setItem(STORAGE_KEY_MATERIALS, JSON.stringify(state.materialRecords));
    } catch (err) {
      // Quota vượt / trình duyệt chặn: dữ liệu vẫn còn trong state + file/mây
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    // Ghi file bamboo_data.json NGAY LẶP TỨC (không đợi saveData của lô hàng):
    // nếu không, file luôn cũ hơn localStorage và khi mở trang sẽ "tua ngược" dữ liệu.
    // (import động — trước đây gọi thẳng writeDataToFile gây ReferenceError và
    //  làm gián đoạn firePushSync phía dưới)
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online (payload đã gồm materialRecords)
  }

  // ─── QUYỀN ───────────────────────────────────────────────────
  function canEditMaterials() {
    // currentTabId() ánh xạ materials-view → 'materials' qua TAB_DEFS
    return requireEditPermission();
  }

  // ─── GIAO DIỆN TAB ───────────────────────────────────────────
  function renderMaterialView() {
    renderMaterialKpiFilter();
    renderMaterialTabs();
    renderMaterialStats();
    renderMaterialTable();
    initLucide();
  }

  function renderMaterialTabs() {
    const wrap = document.getElementById('material-location-tabs');
    if (!wrap) return;
    const locs = [{ key: 'all', label: 'Tất Cả', icon: 'layout-grid' }, ...MATERIAL_LOCATIONS];
    wrap.innerHTML = locs.map(l => `
      <button type="button" class="material-tab ${state.materialActiveLoc === l.key ? 'active' : ''}" data-mat-loc="${l.key}">
        <i data-lucide="${l.icon}"></i> ${escapeHTML(l.label)}
        <span class="material-tab-count">${countRecordsOf(l.key)}</span>
      </button>
    `).join('');
  }

  function countRecordsOf(locKey) {
    const arr = locKey === 'all'
      ? state.materialRecords
      : state.materialRecords.filter(r => r.location === locKey);
    return arr.length;
  }

  function filteredMaterialRecords() {
    let arr = [...state.materialRecords];
    if (state.materialActiveLoc !== 'all') {
      arr = arr.filter(r => r.location === state.materialActiveLoc);
    }
    // Mới nhất lên đầu: theo ngày, rồi theo thời điểm tạo
    arr.sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return arr;
  }

  function renderMaterialStats() {
    const box = document.getElementById('material-stats');
    if (!box) return;
    const arr = kpiPeriodFilteredRecords(); // theo kỳ KPI đang chọn (Tất Cả/Tuần/Tháng/Năm) + vị trí
    const totalWeight = arr.reduce((s, r) => s + (Number(r.weight) || 0), 0);
    const totalAmount = arr.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const types = new Set(arr.map(r => (r.type || '').trim()).filter(Boolean));
    const suppliers = new Set(arr.map(r => (r.supplier || '').trim()).filter(Boolean));
    const photos = arr.reduce((s, r) => s + ((r.images && r.images.length) || 0), 0);
    const locLabel = state.materialActiveLoc === 'all'
      ? 'Tất cả vị trí'
      : materialLocationLabel(state.materialActiveLoc);
    const scope = `${kpiPeriodCaption()} · ${locLabel}`;
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${arr.length}</span>
        <span class="material-stat-label">Lần nhập · ${escapeHTML(scope)}</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${totalWeight.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span>
        <span class="material-stat-label">Tổng trọng lượng (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${Math.round(totalAmount).toLocaleString('vi-VN')}</span>
        <span class="material-stat-label">Tổng thành tiền (đ)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${types.size}</span>
        <span class="material-stat-label">Loại nguyên liệu</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${suppliers.size}</span>
        <span class="material-stat-label">Nhà cung cấp</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${photos}</span>
        <span class="material-stat-label">Hình ảnh</span>
      </div>
    `;
  }

  function renderMaterialTable() {
    const tbody = document.getElementById('material-table-body');
    if (!tbody) return;
    const arr = filteredMaterialRecords();
    if (arr.length === 0) {
      const locLabel = state.materialActiveLoc === 'all'
        ? '' : ` cho <strong>${escapeHTML(materialLocationLabel(state.materialActiveLoc))}</strong>`;
      tbody.innerHTML = `
        <tr><td colspan="11" class="text-center" style="color:var(--text-muted); padding:28px 10px;">
          <i data-lucide="package-open" style="width:30px;height:30px;opacity:.5;"></i>
          <div style="margin-top:8px;">Chưa có nguyên liệu nào được nhập${locLabel}.<br>Bấm <strong>+ Nhập Nguyên Liệu</strong> để thêm.</div>
        </td></tr>`;
      initLucide();
      return;
    }
    tbody.innerHTML = arr.map(r => {
      const imgs = r.images || [];
      const firstSrc = imgs.length ? imgThumbSrc(imgs[0]) : '';
      const thumb = firstSrc
        ? `<img src="${firstSrc}" alt="Ảnh ${escapeHTML(r.type || '')}" class="material-thumb" data-mat-photo="${r.id}" data-mat-photo-idx="0">`
        : `<span class="material-thumb material-thumb-empty"><i data-lucide="image-off"></i></span>`;
      const weight = Number(r.weight) || 0;
      const unitPrice   = Number(r.unitPrice) || 0;
      const totalAmount = Number(r.totalAmount) || 0;
      return `
        <tr data-mat-row="${r.id}">
          <td>${thumb}${imgs.length > 1 ? `<span class="material-photo-count" data-mat-photo="${r.id}" data-mat-photo-idx="0">+${imgs.length - 1}</span>` : ''}</td>
          <td>${formatDateDDMMYY(r.date)}<div style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(friendlyMaterialWeek(r.week))}</div></td>
          <td><strong>${escapeHTML(r.type || '—')}</strong></td>
          <td>${escapeHTML(r.supplier || '—')}</td>
          <td><span class="material-loc-chip">${escapeHTML(materialLocationLabel(r.location))}</span></td>
          <td class="text-right">${(Number(r.inputIndex) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
          <td class="text-right">${(Number(r.outputIndex) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
          <td class="text-right"><strong style="color:var(--primary);">${weight.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</strong> kg</td>
          <td class="text-right">${unitPrice ? unitPrice.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '—'}</td>
          <td class="text-right"><strong style="color:#b45309;">${totalAmount ? Math.round(totalAmount).toLocaleString('vi-VN') : '—'}</strong>${totalAmount ? ' đ' : ''}</td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-mat-edit="${r.id}"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-mat-delete="${r.id}"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
    }).join('');
    initLucide();
  }

  // ─── MODAL NHẬP / SỬA ────────────────────────────────────────
  function openMaterialModal(recordId = null) {
    if (!canEditMaterials()) return;
    const modal = document.getElementById('modal-material');
    if (!modal) return;
    state.materialEditId = recordId;
    const rec = recordId ? state.materialRecords.find(r => r.id === recordId) : null;

    // Vị trí: mặc định theo tab đang mở (nếu đang chọn 1 vị trí cụ thể)
    const locSel = document.getElementById('material-location');
    if (locSel) {
      locSel.innerHTML = MATERIAL_LOCATIONS.map(l =>
        `<option value="${l.key}">${escapeHTML(l.label)}</option>`).join('');
      locSel.value = rec ? rec.location
        : (MATERIAL_LOCATIONS.some(l => l.key === state.materialActiveLoc) ? state.materialActiveLoc : MATERIAL_LOCATIONS[0].key);
    }

    // Gợi ý loại nguyên liệu & nhà cung cấp (từ dữ liệu đã nhập)
    const typeList = document.getElementById('material-type-suggestions');
    if (typeList) {
      typeList.innerHTML = [...new Set([
        ...MATERIAL_TYPE_SUGGESTIONS,
        ...state.materialRecords.map(r => (r.type || '').trim()).filter(Boolean)
      ])].sort((a, b) => a.localeCompare(b, 'vi'))
        .map(t => `<option value="${escapeHTML(t)}"></option>`).join('');
    }
    const supList = document.getElementById('material-supplier-suggestions');
    if (supList) {
      supList.innerHTML = [...new Set(state.materialRecords.map(r => (r.supplier || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi'))
        .map(s => `<option value="${escapeHTML(s)}"></option>`).join('');
    }

    // Ngày mặc định hôm nay
    const dateEl = document.getElementById('material-date');
    if (dateEl) dateEl.value = rec ? rec.date : new Date().toISOString().split('T')[0];

    document.getElementById('material-type').value     = rec ? (rec.type || '') : '';
    document.getElementById('material-supplier').value = rec ? (rec.supplier || '') : '';
    document.getElementById('material-input').value    = rec ? (rec.inputIndex ?? '') : '';
    document.getElementById('material-output').value   = rec ? (rec.outputIndex ?? '') : '';
    document.getElementById('material-unit-price').value = rec ? (rec.unitPrice ?? '') : '';
    document.getElementById('material-note').value     = rec ? (rec.note || '') : '';
    state.materialFormImages = rec ? [...(rec.images || [])] : [];
    renderMaterialImagePreviews();
    updateMaterialWeight();

    const title = document.getElementById('material-modal-title');
    if (title) {
      const locLabel = materialLocationLabel(locSel ? locSel.value : '');
      title.innerHTML = rec
        ? `<i data-lucide="pencil"></i> Sửa Nhập Nguyên Liệu — ${escapeHTML(locLabel)}`
        : `<i data-lucide="package-plus"></i> Nhập Nguyên Liệu — ${escapeHTML(locLabel)}`;
    }

    modal.classList.add('show');
    initLucide();
    // Cập nhật tiêu đề khi đổi vị trí trong form (gắn listener 1 lần duy nhất)
    if (locSel && !locSel.dataset.bound) {
      locSel.addEventListener('change', () => {
        const t = document.getElementById('material-modal-title');
        if (t) {
          const base = state.materialEditId ? 'Sửa Nhập Nguyên Liệu' : 'Nhập Nguyên Liệu';
          t.innerHTML = `<i data-lucide="${state.materialEditId ? 'pencil' : 'package-plus'}"></i> ${base} — ${escapeHTML(materialLocationLabel(locSel.value))}`;
          initLucide();
        }
      });
      locSel.dataset.bound = '1';
    }
  }

  function closeMaterialModal() {
    document.getElementById('modal-material')?.classList.remove('show');
    state.materialEditId = null;
    state.materialFormImages = [];
  }

  // Trọng lượng = chỉ số đầu vào − chỉ số đầu ra (tính trực tiếp khi gõ)
  function updateMaterialWeight() {
    const disp = document.getElementById('material-weight-display');
    if (disp) {
      const inV  = parseFloat(document.getElementById('material-input')?.value);
      const outV = parseFloat(document.getElementById('material-output')?.value);
      const has  = !isNaN(inV) && !isNaN(outV);
      const w    = has ? Math.round((inV - outV) * 1000) / 1000 : 0;
      disp.textContent = has ? `${w.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg` : '— kg';
      disp.classList.toggle('material-weight-negative', has && w < 0);
    }
    updateMaterialAmount();
  }

  // Thành tiền = trọng lượng × đơn giá (đ/kg) — tính trực tiếp khi gõ
  function updateMaterialAmount() {
    const disp = document.getElementById('material-amount-display');
    if (!disp) return;
    const inV   = parseFloat(document.getElementById('material-input')?.value);
    const outV  = parseFloat(document.getElementById('material-output')?.value);
    const price = parseFloat(document.getElementById('material-unit-price')?.value);
    const has   = !isNaN(inV) && !isNaN(outV) && !isNaN(price) && price >= 0;
    const amount = has ? Math.round((inV - outV) * price * 100) / 100 : 0;
    disp.textContent = has ? `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} đ` : '— đ';
    disp.classList.toggle('material-weight-negative', has && amount < 0);
  }

  // ─── HÌNH ẢNH 2 CẤP: thumb inline + ảnh full ngoài bản ghi ───
  // Bản ghi CHỈ giữ thumbnail ~180px (vài KB/ảnh) nên localStorage /
  // bamboo_data.json / Firestore không phình khi số ảnh tăng theo năm.
  // Ảnh FULL (1280px) nằm trong kho IndexedDB (js/photo-store.js) và
  // file thật materials-photos/ trên desktop có thư mục dữ liệu.
  const FULL_IMG_DIM  = 1280;            // px cạnh dài tối đa của ảnh full
  const FULL_IMG_Q    = 0.75;            // JPEG quality ảnh full
  const THUMB_DIM     = 180;             // px cạnh dài tối đa của thumbnail inline
  const THUMB_Q       = 0.6;             // JPEG quality thumbnail
  const PHOTO_INLINE_LIMIT = 30 * 1024;  // ảnh legacy (dataURL nhúng) lớn hơn ngưỡng này sẽ được migrate ra kho

  // Entry ảnh trong rec.images[] / materialFormImages[]:
  //   - chuỗi dataURL              : dữ liệu legacy hoặc fallback (không có IndexedDB)
  //   - { id, thumb }              : ảnh full nằm trong kho ảnh (IndexedDB / file)
  //   - { full, thumb }            : không lưu được kho (trình duyệt cũ) → giữ inline cả 2
  function imgThumbSrc(entry) {
    if (typeof entry === 'string') return entry;
    return (entry && (entry.thumb || entry.full)) || '';
  }
  function imgFullSrcSync(entry) {
    if (typeof entry === 'string') return entry;
    return (entry && (entry.full || entry.thumb)) || '';
  }
  function imgPhotoId(entry) {
    return (entry && typeof entry === 'object' && entry.id) ? entry.id : null;
  }
  function imgPhotoIds(images) {
    return (images || []).map(imgPhotoId).filter(Boolean);
  }

  // dataURL → thumbnail JPEG nhỏ qua canvas
  function makeThumbFromDataURL(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, THUMB_DIM / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', THUMB_Q));
        } catch (err) { reject(err); }
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // Backup ảnh full ra file materials-photos/<id>.jpg (desktop có thư mục dữ liệu)
  function backupPhotoToFile(photoId, dataUrl) {
    if (!photoId || !state.fileStorage.connected) return;
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return;
    storageModule().then(m => m && m.writePhotoFile(photoId, blob)).catch(() => {});
  }

  function handleMaterialImageSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // cho phép chọn lại cùng 1 file
    if (!files.length) return;
    if (state.materialFormImages.length + files.length > 6) {
      showToast('Tối đa 6 hình ảnh cho mỗi lần nhập!', 'error');
      return;
    }
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      compressImageFile(file).then(async (full) => {
        let thumb = '';
        try { thumb = await makeThumbFromDataURL(full); } catch (err) { /* bỏ qua thumb lỗi */ }
        const id = await putPhoto(full); // ảnh full → kho IndexedDB (null nếu không khả dụng)
        if (id) {
          backupPhotoToFile(id, full);
          state.materialFormImages.push({ id, thumb: thumb || full });
        } else if (thumb && thumb.length < full.length) {
          // Không có kho ảnh (trình duyệt cũ): giữ inline cả thumb + full, không mất ảnh
          state.materialFormImages.push({ full, thumb });
        } else {
          // Fallback tối đa: giữ nguyên dataURL như hành vi cũ
          state.materialFormImages.push(full);
        }
        renderMaterialImagePreviews();
      }).catch(() => {
        showToast('Không đọc được ảnh: ' + file.name, 'error');
      });
    });
  }

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = evt => {
        const img = new Image();
        img.onload = () => {
          try {
            const scale = Math.min(1, FULL_IMG_DIM / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', FULL_IMG_Q));
          } catch (err) { reject(err); }
        };
        img.onerror = reject;
        img.src = evt.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderMaterialImagePreviews() {
    const wrap = document.getElementById('material-image-previews');
    if (!wrap) return;
    const imgs = state.materialFormImages || [];
    wrap.innerHTML = imgs.map((entry, i) => `
      <div class="material-img-thumb">
        <img src="${imgThumbSrc(entry)}" alt="Ảnh ${i + 1}">
        <button type="button" class="material-img-remove" data-mat-remove-img="${i}" title="Xóa ảnh">&times;</button>
      </div>
    `).join('');
  }

  // ─── MIGRATE ẢNH LEGACY → KHO ────────────────────────────────
  // Ảnh cũ là dataURL nguyên bản nhúng trong rec.images → đưa ảnh full vào
  // kho IndexedDB (+ file materials-photos/ nếu có thư mục) và thay bằng
  // { id, thumb } để bản ghi gọn lại. Không khả dụng kho → giữ nguyên.
  let migrateRunning = false;
  async function migrateMaterialImages() {
    if (migrateRunning || !photosAvailable()) return;
    migrateRunning = true;
    try {
      let anyChanged = false;
      for (const rec of state.materialRecords) {
        const imgs = rec.images || [];
        if (!imgs.length || !imgs.some(en => typeof en === 'string' && en.length > PHOTO_INLINE_LIMIT)) continue;
        const next = [];
        let recChanged = false;
        for (const entry of imgs) {
          if (typeof entry === 'string' && entry.length > PHOTO_INLINE_LIMIT) {
            let thumb = '';
            try { thumb = await makeThumbFromDataURL(entry); } catch (err) { /* bỏ qua */ }
            const id = await putPhoto(entry);
            if (id) {
              backupPhotoToFile(id, entry);
              next.push({ id, thumb: thumb || entry });
              recChanged = true;
              continue;
            }
          }
          next.push(entry);
        }
        if (recChanged) { rec.images = next; anyChanged = true; }
      }
      if (anyChanged) saveMaterialRecords();
    } finally { migrateRunning = false; }
  }

  function openMaterialPhotoModal(recordId, idx = 0) {
    const rec = state.materialRecords.find(r => r.id === recordId);
    if (!rec || !rec.images || !rec.images.length) return;
    state.materialLightbox = { recordId, index: Math.max(0, Math.min(idx, rec.images.length - 1)) };
    renderMaterialPhotoModal();
    document.getElementById('modal-material-photo')?.classList.add('show');
    initLucide();
  }

  async function renderMaterialPhotoModal() {
    const lb = state.materialLightbox;
    if (!lb) return;
    const rec = state.materialRecords.find(r => r.id === lb.recordId);
    if (!rec) { closeMaterialPhotoModal(); return; }
    const imgs = rec.images || [];
    if (!imgs.length) { closeMaterialPhotoModal(); return; }
    if (lb.index >= imgs.length) lb.index = imgs.length - 1;
    const entry = imgs[lb.index];
    const imgEl  = document.getElementById('material-photo-img');
    const capEl  = document.getElementById('material-photo-caption');
    const prevEl = document.getElementById('material-photo-prev');
    const nextEl = document.getElementById('material-photo-next');
    if (imgEl) {
      imgEl.src = imgFullSrcSync(entry); // hiển thị ngay (thumb nếu ảnh full nằm ngoài bản ghi)
      const photoId = imgPhotoId(entry);
      if (photoId) {
        const url = await getPhotoURL(photoId); // nạp ảnh full từ kho theo yêu cầu
        if (url && state.materialLightbox === lb) imgEl.src = url; // bỏ qua nếu đã đóng/đổi ảnh
      }
    }
    if (capEl) {
      capEl.innerHTML = `<strong>${escapeHTML(rec.type || 'Nguyên liệu')}</strong> · ${escapeHTML(materialLocationLabel(rec.location))} · ${formatDateDDMMYY(rec.date)} · ${lb.index + 1}/${imgs.length}`;
    }
    if (prevEl) prevEl.style.display = imgs.length > 1 ? '' : 'none';
    if (nextEl) nextEl.style.display = imgs.length > 1 ? '' : 'none';
  }

  function materialPhotoNav(step) {
    const lb = state.materialLightbox;
    if (!lb) return;
    const rec = state.materialRecords.find(r => r.id === lb.recordId);
    if (!rec || !rec.images || rec.images.length < 2) return;
    lb.index = (lb.index + step + rec.images.length) % rec.images.length;
    renderMaterialPhotoModal();
  }

  function closeMaterialPhotoModal() {
    document.getElementById('modal-material-photo')?.classList.remove('show');
    state.materialLightbox = null;
  }

  // ─── LƯU FORM / XÓA ──────────────────────────────────────────
  function handleMaterialSubmit(e) {
    e.preventDefault();
    if (!canEditMaterials()) return;

    const dateVal  = document.getElementById('material-date')?.value;
    const type     = (document.getElementById('material-type')?.value || '').trim();
    const supplier = (document.getElementById('material-supplier')?.value || '').trim();
    const location = document.getElementById('material-location')?.value || '';
    const inV      = parseFloat(document.getElementById('material-input')?.value);
    const outV     = parseFloat(document.getElementById('material-output')?.value);
    const priceRaw = parseFloat(document.getElementById('material-unit-price')?.value);
    const note     = (document.getElementById('material-note')?.value || '').trim();

    if (!dateVal) { showToast('Ngày nhập không được để trống!', 'error'); return; }
    if (!type)    { showToast('Loại nguyên liệu không được để trống!', 'error'); return; }
    if (!MATERIAL_LOCATIONS.some(l => l.key === location)) { showToast('Vị trí không hợp lệ!', 'error'); return; }
    if (isNaN(inV)  || inV  < 0) { showToast('Chỉ số đầu vào phải là số không âm!', 'error'); return; }
    if (isNaN(outV) || outV < 0) { showToast('Chỉ số đầu ra phải là số không âm!', 'error'); return; }
    if (!isNaN(priceRaw) && priceRaw < 0) { showToast('Đơn giá phải là số không âm!', 'error'); return; }

    // Trọng lượng = đầu vào − đầu ra (làm tròn 3 số thập phân)
    const weight = Math.round((inV - outV) * 1000) / 1000;
    // Đơn giá (đ/kg) & Thành tiền = trọng lượng × đơn giá (làm tròn 2 số)
    const unitPrice   = isNaN(priceRaw) ? 0 : Math.round(priceRaw * 100) / 100;
    const totalAmount = Math.round(weight * unitPrice * 100) / 100;

    if (state.materialEditId) {
      const rec = state.materialRecords.find(r => r.id === state.materialEditId);
      if (rec) {
        // Ảnh full bị gỡ khỏi form → dọn khỏi kho/file (tránh rác tích tụ)
        const removedIds = imgPhotoIds(rec.images)
          .filter(id => !state.materialFormImages.some(en => imgPhotoId(en) === id));
        Object.assign(rec, {
          date: dateVal, type, supplier, location,
          inputIndex: inV, outputIndex: outV, weight,
          unitPrice, totalAmount,
          note, images: [...state.materialFormImages],
          week: materialWeekLabel(dateVal), updatedAt: new Date().toISOString()
        });
        saveMaterialRecords();
        if (removedIds.length) {
          deletePhotos(removedIds); // dọn kho IndexedDB (fire-and-forget)
          storageModule().then(m => m && m.deletePhotoFiles(removedIds)).catch(() => {});
        }
        showToast('Đã cập nhật lần nhập nguyên liệu!', 'success');
      }
    } else {
      state.materialRecords.push({
        id: 'mat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        date: dateVal, week: materialWeekLabel(dateVal),
        type, supplier, location,
        inputIndex: inV, outputIndex: outV, weight,
        unitPrice, totalAmount,
        note, images: [...state.materialFormImages],
        createdAt: new Date().toISOString()
      });
      saveMaterialRecords();
      showToast('Đã thêm lần nhập nguyên liệu!', 'success');
    }

    closeMaterialModal();
    renderMaterialView();
  }

  function deleteMaterial(recordId) {
    if (!canEditMaterials()) return;
    const rec = state.materialRecords.find(r => r.id === recordId);
    if (!rec) return;
    const label = `${rec.type || 'nguyên liệu'} (${materialLocationLabel(rec.location)}, ${formatDateDDMMYY(rec.date)})`;
    if (!confirm(`Xóa lần nhập ${label}?`)) return;
    const photoIds = imgPhotoIds(rec.images); // ảnh full trong kho cần dọn theo
    state.materialRecords = state.materialRecords.filter(r => r.id !== recordId);
    if (photoIds.length) {
      deletePhotos(photoIds); // dọn kho IndexedDB (fire-and-forget)
      storageModule().then(m => m && m.deletePhotoFiles(photoIds)).catch(() => {});
    }
    saveMaterialRecords();
    renderMaterialView();
    showToast('Đã xóa lần nhập nguyên liệu!', 'success');
  }

export {
  MATERIAL_KPI_PERIODS,
  MATERIAL_LOCATIONS,
  MATERIAL_TYPE_SUGGESTIONS,
  canEditMaterials,
  closeMaterialModal,
  closeMaterialPhotoModal,
  compressImageFile,
  deleteMaterial,
  friendlyMaterialWeek,
  handleMaterialImageSelect,
  handleMaterialSubmit,
  imgFullSrcSync,
  imgPhotoId,
  imgPhotoIds,
  imgThumbSrc,
  kpiPeriodCaption,
  kpiPeriodFilteredRecords,
  loadMaterialRecords,
  materialLocationLabel,
  materialMonthKey,
  materialPhotoNav,
  materialWeekLabel,
  migrateMaterialImages,
  openMaterialModal,
  openMaterialPhotoModal,
  renderMaterialImagePreviews,
  renderMaterialKpiFilter,
  renderMaterialStats,
  renderMaterialTable,
  renderMaterialTabs,
  renderMaterialView,
  saveMaterialRecords,
  updateMaterialAmount,
  updateMaterialWeight
};
