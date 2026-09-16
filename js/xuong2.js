// ═══════════════════════════════════════════════════════════
// js/xuong2.js — Tab CÔNG ĐOẠN: KHU VỰC XƯỞNG 2 (thẻ mini / launcher)
// ═══════════════════════════════════════════════════════════
// Mỗi VỊ TRÍ công đoạn của Xưởng 2 là 1 thẻ mini (launcher) — bấm thẻ
// mở bảng chi tiết NỔI LÊN dạng pop-up (giống thẻ Nhân Sự — hr.js).
//
// Vị trí đầu tiên: "Cắt Chọn" — chọn luồng từ nguyên liệu ĐẦU VÀO của
// Xưởng 2 (tab Nguyên Liệu: "Luồng cây xô", "Luồng ống", ...).
//   • TỰ ĐỘNG LINK từ lần nhập nguyên liệu được chọn:
//       - Tên nhà cung cấp  (rec.supplier)
//       - Mã số             (rec.code — tab Nguyên Liệu sẽ bổ sung trường này;
//                            trước khi có thì hiển thị "Chưa có")
//       - KL đầu vào (kg)   (rec.weight = chỉ số đầu vào − chỉ số đầu ra)
//   • Trường nhập thêm: Ngày cắt/chọn, KL ống luồng, KL củi đốt, KL cây loại
//     và KL ngọn/ống loại TỰ TÍNH = KL đầu vào − ống luồng − củi đốt − cây loại.
//
// Dữ liệu state.xuong2CutRecords: lưu localStorage + file + mây (firePushSync).
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { materialWeekLabel } from './materials.js';
import { STORAGE_KEY_XUONG2_CUTS, state } from './state.js';
import { trackDeleted } from './tombstone.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';

  // Ghi file dữ liệu qua storage.js (import động để tránh vòng phụ thuộc module
  // — giống cách materials.js dùng)
  function storageModule() {
    return import('./storage.js').catch(() => null);
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  // ─── HẰNG SỐ: CÁC VỊ TRÍ CÔNG ĐOẠN XƯỞNG 2 (launcher) ────────
  // Bổ sung vị trí mới: thêm 1 thẻ button trong index.html (#x2-cards-grid)
  // + 1 dòng ở đây (cardId ↔ id ô đếm trên thẻ).
  const X2_CARD_DEFS = {
    'x2-cut-card': { el: 'x2-mini-count-cut' }
  };

  const X2_FORM_TITLE_NEW  = '<i data-lucide="plus-circle"></i> Ghi Nhận Lượt Cắt/Chọn Mới';
  const X2_FORM_TITLE_EDIT = '<i data-lucide="pencil"></i> Sửa Lượt Cắt/Chọn';

  // ─── NGUỒN DỮ LIỆU: NGUYÊN LIỆU ĐẦU VÀO CỦA XƯỞNG 2 ──────────
  // Các lượt nhập nguyên liệu cho vị trí 'xuong-2' ở tab Nguyên Liệu
  // (Luồng cây xô, Luồng ống, ...) — mới nhất lên đầu.
  function xuong2MaterialInputs() {
    return [...(state.materialRecords || [])]
      .filter(r => r.location === 'xuong-2')
      .sort((a, b) => {
        if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }

  // Mã số của lần nhập nguyên liệu — trường SẮP BỔ SUNG bên tab Nguyên Liệu.
  // Đọc dự phòng nhiều tên trường ('code' / 'matCode' / 'maSo') để khi tab
  // Nguyên Liệu thêm mã số, thẻ Cắt Chọn TỰ ĐỘNG link ra không cần sửa gì.
  function materialCodeOf(rec) {
    if (!rec) return '';
    return String(rec.code ?? rec.matCode ?? rec.maSo ?? '').trim();
  }

  // KL đầu vào (kg) của lần nhập nguyên liệu = trọng lượng đã lưu
  // (weight = chỉ số đầu vào − chỉ số đầu ra); dự phòng tính lại nếu thiếu.
  function materialInputWeightOf(rec) {
    if (!rec) return 0;
    const w = Number(rec.weight);
    if (Number.isFinite(w)) return w;
    return (Number(rec.inputIndex) || 0) - (Number(rec.outputIndex) || 0);
  }

  const fmtKg = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

  // ─── NẠP / LƯU DỮ LIỆU CẮT CHỌN ──────────────────────────────
  function loadXuong2Cuts() {
    const raw = localStorage.getItem(STORAGE_KEY_XUONG2_CUTS);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.xuong2CutRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.xuong2CutRecords = []; }
    } else {
      state.xuong2CutRecords = [];
    }
  }

  function saveXuong2Cuts() {
    try {
      localStorage.setItem(STORAGE_KEY_XUONG2_CUTS, JSON.stringify(state.xuong2CutRecords || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    // Ghi lịch sử sửa đổi (tóm tắt ai đã thêm/sửa/xóa lượt cắt/chọn nào)
    logDataChange(['xuong2CutRecords']);
    // Ghi file bamboo_data.json NGAY LẶP TỨC (như saveMaterialRecords)
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT CẮT/CHỌN (link SỐNG tới nguyên liệu) ──
  // Ưu tiên giá trị hiện tại của bản ghi nguyên liệu (tự động link); bản ghi
  // nguyên liệu đã bị xóa → dùng số liệu đã lưu (snapshot) khi ghi nhận.
  function cutDisplay(r) {
    const mat = (state.materialRecords || []).find(m => m.id === r.materialId) || null;
    const inputWeight = mat ? materialInputWeightOf(mat) : (Number(r.inputWeight) || 0);
    const klOngLuong = Number(r.klOngLuong) || 0;
    const klCuiDot   = Number(r.klCuiDot)   || 0;
    const klCayLoai  = Number(r.klCayLoai)  || 0;
    return {
      date: r.date || '',
      materialType: mat ? (mat.type || '') : (r.materialType || ''),
      supplier: mat ? (mat.supplier || '') : (r.supplier || ''),
      code: mat ? materialCodeOf(mat) : (r.code || ''),
      inputWeight,
      klOngLuong,
      klCuiDot,
      klCayLoai,
      // KL ngọn/ống loại = KL đầu vào − KL ống luồng − KL củi đốt − KL cây loại
      klNgonOngLoai: inputWeight - klOngLuong - klCuiDot - klCayLoai,
      note: r.note || ''
    };
  }

  // ─── THẺ LAUNCHER: ĐẾM TRÊN THẺ ──────────────────────────────
  function updateXuong2CardCounts() {
    Object.keys(X2_CARD_DEFS).forEach(cardId => {
      const el = document.getElementById(X2_CARD_DEFS[cardId].el);
      if (el) el.textContent = x2CardCountText(cardId);
    });
  }

  function x2CardCountText(cardId) {
    if (cardId === 'x2-cut-card') {
      const cuts = state.xuong2CutRecords || [];
      if (!cuts.length) return 'Chưa có';
      const totalIn = cuts.reduce((s, r) => s + (Number(r.inputWeight) || 0), 0);
      return `${cuts.length} lượt · ${Math.round(totalIn).toLocaleString('vi-VN')} kg`;
    }
    return '–';
  }

  // Đồng bộ trạng thái "đang mở" của thẻ (accordion 1 thẻ mở tại 1 thời điểm)
  function syncX2MiniActive() {
    let openId = null;
    Object.keys(X2_CARD_DEFS).forEach(cardId => {
      const c = document.getElementById(cardId);
      if (c && !c.classList.contains('x2-card-hidden')) openId = cardId;
    });
    document.querySelectorAll('.x2-mini-card').forEach(t => {
      const act = t.getAttribute('data-x2-card') === openId;
      t.classList.toggle('x2-mini-active', act);
      t.setAttribute('aria-expanded', act ? 'true' : 'false');
    });
  }

  // ─── POP-UP: NỔI LÊN KHI BẤM THẺ (như tab Nhân Sự) ───────────
  let openX2Card = null;

  // Đặt đỉnh pop-up ngay dưới header — header không bị che / không bị làm mờ
  function x2PositionDetailOverlay() {
    const overlay = document.getElementById('x2-detail-overlay');
    if (!overlay) return;
    const header = document.querySelector('.app-header');
    if (header && typeof header.getBoundingClientRect === 'function') {
      const bottom = header.getBoundingClientRect().bottom;
      if (bottom > 0) overlay.style.top = Math.round(bottom) + 'px';
    }
  }

  function x2OpenCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return false;
    // Bấm lại thẻ đang mở → đóng pop-up (trả về chế độ thu gọn)
    if (openX2Card === card) { x2CloseOpenCard(); return false; }
    // Đóng thẻ đang mở (nếu có) trước khi mở thẻ mới (accordion)
    if (openX2Card) x2CloseOpenCard();
    card.classList.remove('x2-card-hidden');
    card.classList.remove('rate-table-collapsed');
    const content = document.getElementById('x2-detail-content');
    if (content) content.appendChild(card);
    openX2Card = card;
    renderXuong2CutCard(); // luôn vẽ dữ liệu mới nhất mỗi lần mở
    const h4 = card.querySelector && card.querySelector('.planning-card-header h4');
    const titleText = (h4 && typeof h4.textContent === 'string') ? h4.textContent.trim() : '';
    const titleEl = document.getElementById('x2-detail-title');
    if (titleEl) titleEl.textContent = titleText || 'Vị Trí Xưởng 2';
    const overlay = document.getElementById('x2-detail-overlay');
    if (overlay) {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
      x2PositionDetailOverlay();
      if (typeof overlay.focus === 'function') overlay.focus({ preventScroll: true });
    }
    syncX2MiniActive();
    initLucide();
    return true;
  }

  function x2CloseOpenCard() {
    const overlay = document.getElementById('x2-detail-overlay');
    if (!openX2Card) {
      if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
      return;
    }
    const card = openX2Card;
    const stack = document.getElementById('x2-details-stack');
    if (stack) stack.appendChild(card); else document.getElementById('kanban-view')?.appendChild(card);
    card.classList.add('x2-card-hidden');
    openX2Card = null;
    if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
    syncX2MiniActive();
    initLucide();
  }

  // ─── FORM GHI NHẬN LƯỢT CẮT/CHỌN ─────────────────────────────
  // Đổ danh sách nguyên liệu đầu vào của Xưởng 2 vào ô chọn
  function fillXuong2CutMaterialOptions() {
    const sel = document.getElementById('x2-cut-material');
    if (!sel) return;
    const mats = xuong2MaterialInputs();
    let html = mats.map(r => {
      const w = materialInputWeightOf(r);
      return `<option value="${escapeHTML(r.id)}">${escapeHTML(r.type || 'Nguyên liệu')} · NCC ${escapeHTML(r.supplier || '—')} · ${formatDateDDMMYY(r.date)} · ${fmtKg(w)} kg</option>`;
    }).join('');
    // Đang sửa nhưng bản ghi nguyên liệu gốc đã bị xóa → giữ lựa chọn cũ
    // (các trường tự link sẽ dùng số liệu đã lưu trong lượt cắt/chọn)
    const editing = state.x2CutEditId ? (state.xuong2CutRecords || []).find(r => r.id === state.x2CutEditId) : null;
    if (editing && editing.materialId && !mats.some(r => r.id === editing.materialId)) {
      html = `<option value="${escapeHTML(editing.materialId)}">(bản ghi nguyên liệu đã xóa — dùng số liệu đã lưu)</option>` + html;
    }
    if (!html) html = `<option value="">— Chưa có nguyên liệu đầu vào nào của Xưởng 2 —</option>`;
    sel.innerHTML = html;
    updateXuong2CutLinked();
  }

  // TỰ ĐỘNG LINK các trường từ lần nhập nguyên liệu đang chọn:
  // Tên nhà cung cấp · Mã số · KL đầu vào (+ mặc định Ngày cắt/chọn)
  function updateXuong2CutLinked() {
    const sel = document.getElementById('x2-cut-material');
    const matId = sel ? sel.value : '';
    const mat = (state.materialRecords || []).find(r => r.id === matId) || null;
    let supplier = mat ? (mat.supplier || '—') : '—';
    let code     = mat ? materialCodeOf(mat) : '';
    let inWeight = mat ? materialInputWeightOf(mat) : 0;
    let matType  = mat ? (mat.type || '') : '';
    // Bản ghi nguyên liệu gốc đã xóa (đang sửa) → dùng snapshot đã lưu
    if (!mat && state.x2CutEditId) {
      const cut = (state.xuong2CutRecords || []).find(r => r.id === state.x2CutEditId);
      if (cut) {
        supplier = cut.supplier || '—';
        code     = cut.code || '';
        inWeight = Number(cut.inputWeight) || 0;
        matType  = cut.materialType || '';
      }
    }
    const supEl = document.getElementById('x2-cut-supplier');
    if (supEl) supEl.textContent = supplier || '—';
    const codeEl = document.getElementById('x2-cut-code');
    if (codeEl) {
      if (code) { codeEl.textContent = code; codeEl.style.color = ''; }
      else {
        codeEl.textContent = mat ? 'Chưa có (sắp bổ sung ở tab Nguyên Liệu)' : '—';
        codeEl.style.color = mat ? 'var(--text-muted)' : '';
      }
    }
    const typeEl = document.getElementById('x2-cut-type');
    if (typeEl) typeEl.textContent = matType || '—';
    const inwEl = document.getElementById('x2-cut-inweight');
    if (inwEl) {
      inwEl.textContent = `${fmtKg(inWeight)} kg`;
      inwEl.dataset.value = String(inWeight); // nguồn số cho KL ngọn/ống loại
    }
    // Ngày cắt/chọn: mặc định theo ngày nhập nguyên liệu (chế độ ghi mới)
    if (!state.x2CutEditId && mat) {
      const d = document.getElementById('x2-cut-date');
      if (d && !d.value) d.value = mat.date || todayISO();
    }
    updateXuong2CutRemain();
  }

  // KL ngọn/ống loại TỰ TÍNH = KL đầu vào − KL ống luồng − KL củi đốt − KL cây loại
  function updateXuong2CutRemain() {
    const disp = document.getElementById('x2-cut-remain-display');
    if (!disp) return;
    const inwEl = document.getElementById('x2-cut-inweight');
    const inputWeight = inwEl ? (Number(inwEl.dataset && inwEl.dataset.value) || 0) : 0;
    const val = id => Number((document.getElementById(id) || {}).value) || 0;
    const ongLuong = val('x2-cut-ongluong');
    const cuiDot   = val('x2-cut-cuidot');
    const cayLoai  = val('x2-cut-cayloai');
    const remain = inputWeight - ongLuong - cuiDot - cayLoai;
    disp.textContent = `${fmtKg(remain)} kg`;
    disp.style.color = remain < 0 ? 'var(--danger)' : 'var(--primary)';
  }

  // Form về trạng thái "ghi mới" (sau Lưu / nút Làm Mới Form)
  function resetXuong2CutForm() {
    state.x2CutEditId = null;
    ['x2-cut-ongluong', 'x2-cut-cuidot', 'x2-cut-cayloai', 'x2-cut-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const d = document.getElementById('x2-cut-date');
    if (d) d.value = '';
    fillXuong2CutMaterialOptions(); // gồm cả updateXuong2CutLinked + Remain
    const t = document.getElementById('x2-cut-form-title');
    if (t) { t.innerHTML = X2_FORM_TITLE_NEW; initLucide(); }
  }

  // ─── LƯU FORM (THÊM / SỬA) ───────────────────────────────────
  function handleXuong2CutSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const sel = document.getElementById('x2-cut-material');
    const materialId = sel ? sel.value : '';
    const mat = (state.materialRecords || []).find(r => r.id === materialId) || null;
    if (!mat) { showToast('Hãy chọn lần nhập nguyên liệu đầu vào của Xưởng 2!', 'error'); return; }

    const dateEl = document.getElementById('x2-cut-date');
    const dateVal = (dateEl && dateEl.value) || '';
    if (!dateVal) { showToast('Ngày cắt/chọn không được để trống!', 'error'); return; }

    const val = id => Number((document.getElementById(id) || {}).value) || 0;
    const klOngLuong = val('x2-cut-ongluong');
    const klCuiDot   = val('x2-cut-cuidot');
    const klCayLoai  = val('x2-cut-cayloai');
    if (klOngLuong < 0 || klCuiDot < 0 || klCayLoai < 0) {
      showToast('Các khối lượng phải là số không âm!', 'error'); return;
    }
    const inputWeight = materialInputWeightOf(mat);
    const klNgonOngLoai = inputWeight - klOngLuong - klCuiDot - klCayLoai;
    if (klNgonOngLoai < 0) {
      showToast('KL ống luồng + củi đốt + cây loại đã vượt KL đầu vào — kiểm tra lại!', 'error');
      return;
    }
    const note = (((document.getElementById('x2-cut-note') || {}).value) || '').trim();

    // TỰ ĐỘNG LINK: snapshot nhà cung cấp / mã số / KL đầu vào từ lần nhập NL
    const payload = {
      materialId,
      materialType: mat.type || '',
      supplier: mat.supplier || '',
      code: materialCodeOf(mat),
      inputWeight,
      date: dateVal,
      week: materialWeekLabel(dateVal),
      klOngLuong, klCuiDot, klCayLoai, klNgonOngLoai,
      note
    };

    if (state.x2CutEditId) {
      const rec = (state.xuong2CutRecords || []).find(r => r.id === state.x2CutEditId);
      if (!rec) { showToast('Không tìm thấy lượt cắt/chọn cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveXuong2Cuts();
      showToast('Đã cập nhật lượt cắt/chọn!', 'success');
    } else {
      (state.xuong2CutRecords = state.xuong2CutRecords || []).push({
        id: 'x2cut-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ...payload,
        createdAt: new Date().toISOString()
      });
      saveXuong2Cuts();
      showToast('Đã ghi lượt cắt/chọn!', 'success');
    }

    resetXuong2CutForm();
    renderXuong2CutCard();
  }

  // ─── SỬA / XÓA LƯỢT CẮT/CHỌN (bảng lịch sử) ──────────────────
  function editXuong2Cut(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2CutRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x2CutEditId = id;
    fillXuong2CutMaterialOptions(); // có fallback nếu bản ghi NL gốc đã xóa
    const sel = document.getElementById('x2-cut-material');
    if (sel) sel.value = rec.materialId || '';
    updateXuong2CutLinked();
    const d = document.getElementById('x2-cut-date');
    if (d) d.value = rec.date || '';
    const ong = document.getElementById('x2-cut-ongluong');
    if (ong) ong.value = (rec.klOngLuong ?? '') === '' ? '' : String(rec.klOngLuong);
    const cui = document.getElementById('x2-cut-cuidot');
    if (cui) cui.value = (rec.klCuiDot ?? '') === '' ? '' : String(rec.klCuiDot);
    const cay = document.getElementById('x2-cut-cayloai');
    if (cay) cay.value = (rec.klCayLoai ?? '') === '' ? '' : String(rec.klCayLoai);
    const note = document.getElementById('x2-cut-note');
    if (note) note.value = rec.note || '';
    updateXuong2CutRemain();
    const t = document.getElementById('x2-cut-form-title');
    if (t) { t.innerHTML = X2_FORM_TITLE_EDIT; initLucide(); }
  }

  function deleteXuong2Cut(id) {
    if (!requireEditPermission()) return;
    const rec = (state.xuong2CutRecords || []).find(r => r.id === id);
    if (!rec) return;
    const d = cutDisplay(rec);
    if (!confirm(`Xóa lượt cắt/chọn ngày ${formatDateDDMMYY(rec.date)} (NCC ${d.supplier || '—'})?`)) return;
    trackDeleted('xuong2CutRecords', id); // tombstone: không bị mây/máy khác hồi sinh
    state.xuong2CutRecords = (state.xuong2CutRecords || []).filter(r => r.id !== id);
    if (state.x2CutEditId === id) resetXuong2CutForm(); // đang sửa chính nó → về form ghi mới
    saveXuong2Cuts();
    renderXuong2CutCard();
    showToast('Đã xóa lượt cắt/chọn!', 'success');
  }

  // ─── RENDER BẢNG CHI TIẾT CẮT/CHỌN ───────────────────────────
  function renderXuong2CutCard() {
    fillXuong2CutMaterialOptions();
    renderXuong2CutStats();
    renderXuong2CutTable();
    updateXuong2CardCounts();
  }

  // Thống kê nhanh của vị trí Cắt Chọn
  function renderXuong2CutStats() {
    const box = document.getElementById('x2-cut-stats');
    if (!box) return;
    const disp = (state.xuong2CutRecords || []).map(cutDisplay);
    const totalIn   = disp.reduce((s, d) => s + d.inputWeight, 0);
    const totalOng  = disp.reduce((s, d) => s + d.klOngLuong, 0);
    const totalLoai = disp.reduce((s, d) => s + Math.max(0, d.klNgonOngLoai) + d.klCuiDot + d.klCayLoai, 0);
    box.innerHTML = `
      <div class="material-stat">
        <span class="material-stat-value">${disp.length}</span>
        <span class="material-stat-label">Lượt cắt/chọn</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${Math.round(totalIn).toLocaleString('vi-VN')}</span>
        <span class="material-stat-label">Tổng KL đầu vào (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalOng)}</span>
        <span class="material-stat-label">Tổng KL ống luồng (kg)</span>
      </div>
      <div class="material-stat">
        <span class="material-stat-value">${fmtKg(totalLoai)}</span>
        <span class="material-stat-label">Tổng KL loại (củi + cây + ngọn/ống)</span>
      </div>`;
  }

  // Bảng lịch sử cắt/chọn (mới nhất lên đầu)
  function renderXuong2CutTable() {
    const tbody = document.getElementById('x2-cut-table-body');
    if (!tbody) return;
    const cuts = [...(state.xuong2CutRecords || [])].sort((a, b) => {
      if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    if (!cuts.length) {
      tbody.innerHTML = `
        <tr><td colspan="10" class="text-center" style="color:var(--text-muted); padding:28px 10px;">
          <i data-lucide="scissors" style="width:30px;height:30px;opacity:.5;"></i>
          <div style="margin-top:8px;">Chưa có lượt cắt/chọn nào.<br>Chọn <strong>nguyên liệu đầu vào của Xưởng 2</strong> ở form trên rồi bấm <strong>Lưu Lượt Cắt/Chọn</strong>.</div>
        </td></tr>`;
      initLucide();
      return;
    }
    tbody.innerHTML = cuts.map(r => {
      const d = cutDisplay(r);
      return `
        <tr data-x2-cut-row="${escapeHTML(r.id)}">
          <td>${formatDateDDMMYY(d.date)}</td>
          <td><strong>${escapeHTML(d.materialType || '—')}</strong></td>
          <td>${escapeHTML(d.supplier || '—')}${d.note ? `<div style="font-size:0.7rem;color:var(--text-muted);">${escapeHTML(d.note)}</div>` : ''}</td>
          <td>${d.code ? escapeHTML(d.code) : '<span style="color:var(--text-muted);">Chưa có</span>'}</td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(d.inputWeight)}</strong></td>
          <td class="text-right">${fmtKg(d.klOngLuong)}</td>
          <td class="text-right">${fmtKg(d.klCuiDot)}</td>
          <td class="text-right">${fmtKg(d.klCayLoai)}</td>
          <td class="text-right"><strong style="color:#b45309;">${fmtKg(d.klNgonOngLoai)}</strong></td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-x2-cut-edit="${escapeHTML(r.id)}"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-x2-cut-delete="${escapeHTML(r.id)}"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
    }).join('');
    initLucide();
  }

  // ─── RENDER KHU VỰC XƯỞNG 2 (gọi từ main.js) ─────────────────
  function renderXuong2Cards() {
    updateXuong2CardCounts();
    // Bảng chi tiết đang mở → làm mới luôn (nguồn nguyên liệu có thể vừa đổi)
    if (openX2Card) renderXuong2CutCard();
  }

export {
  X2_CARD_DEFS,
  deleteXuong2Cut,
  editXuong2Cut,
  fillXuong2CutMaterialOptions,
  handleXuong2CutSubmit,
  loadXuong2Cuts,
  renderXuong2Cards,
  renderXuong2CutCard,
  resetXuong2CutForm,
  saveXuong2Cuts,
  syncX2MiniActive,
  updateXuong2CardCounts,
  updateXuong2CutLinked,
  updateXuong2CutRemain,
  x2CloseOpenCard,
  x2OpenCard,
  x2PositionDetailOverlay
};
