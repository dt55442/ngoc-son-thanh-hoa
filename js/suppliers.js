// ═══════════════════════════════════════════════════════════
// js/suppliers.js — Tab NGUYÊN LIỆU: BẢNG THÔNG TIN NHÀ CUNG
// ═══════════════════════════════════════════════════════════
// Danh mục nhà cung cấp do người dùng khai báo (TÊN + MÃ SỐ điền tay,
// đặt tên theo định dạng "Nhà + Tên" — app tự thêm "Nhà" nếu thiếu).
// Các cột còn lại TỰ TÍNH, KHÔNG lưu cứng:
//   • Tổng KL đã nhập  = tổng trọng lượng các lần nhập nguyên liệu của NCC
//                        (cả 3 vị trí: Lò hơi / Xưởng 1 / Xưởng 2)
//   • Số chuyến nhập   = số lần nhập nguyên liệu của NCC
//   • Trung bình       = Tổng KL ÷ Số chuyến (kg/chuyến)
//   • Tỷ lệ đạt        = trung bình của 10 CHUYẾN GẦN NHẤT, mỗi chuyến =
//                        (KL đầu vào − KL cây loại trong bảng cắt/chọn Xưởng 2)
//                        ÷ KL đầu vào  (tab Công Đoạn — thẻ Cắt Chọn)
//   • Số lần nhắc nhở  = số lượt cắt/chọn CÓ GHI CHÚ trong 10 chuyến gần nhất
//   • Đánh giá 1–5 sao = 30% điểm KL trung bình + 50% điểm tỷ lệ đạt
//                        + 20% điểm số lần nhắc nhở (tiêu chí hiển thị ngay
//                        trên bảng, xem hằng RATING_* bên dưới)
// Khớp tên NCC là KHÔNG PHÂN BIỆT hoa/thường và BỎ tiền tố "Nhà" đầu tên
// (supplierKey) — vì vậy "Tế" ≡ "Nhà Tế": bảng vẫn đúng ngay cả khi dữ liệu
// cũ chưa được chuẩn hóa tên.
//
// Dữ liệu state.suppliers: lưu localStorage + file bamboo_data.json + mây
// (firePushSync), có tombstone khi xóa (trackDeleted) — xem js/state.js.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { canEditTab } from './permissions.js';
import { logDataChange } from './history.js';
import { trackDeleted } from './tombstone.js';
import { STORAGE_KEY_SUPPLIERS, state } from './state.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';

  // Ghi file dữ liệu qua storage.js (import động để tránh vòng phụ thuộc module
  // — giống cách materials.js / xuong2.js dùng)
  function storageModule() {
    return import('./storage.js').catch(() => null);
  }

  // ─── HẰNG SỐ TIÊU CHÍ ĐÁNH GIÁ (đổi tại đây nếu muốn chỉnh thang điểm) ──
  // Trọng số 3 thành phần: khối lượng trung bình / tỷ lệ đạt / nhắc nhở
  const RATING_WEIGHT = { avgKg: 0.3, rate: 0.5, remind: 0.2 };
  // Ngưỡng KL trung bình mỗi chuyến (kg): ≥ ngưỡng → điểm bậc 5/4/3/2, dưới hết → 1
  const AVG_KG_TIERS = [15000, 10000, 6000, 3000];
  // Ngưỡng tỷ lệ đạt (%): ≥ ngưỡng → điểm bậc 5/4/3/2, dưới hết → 1
  const RATE_TIERS = [95, 90, 85, 80];
  // Điểm theo số lần nhắc nhở (10 chuyến gần nhất): 0→5, 1→4, 2→3, 3→2, ≥4→1
  const REMIND_SCORE = [5, 4, 3, 2];
  // Số chuyến gần nhất dùng cho Tỷ lệ đạt + Số lần nhắc nhở
  const RECENT_TRIPS = 10;

  // ─── KHỚP TÊN NHÀ CUNG CẤP (mềm — dữ liệu cũ chưa chuẩn hóa vẫn ăn) ──
  // Viết thường, gọn khoảng trắng, BỎ tiền tố "Nhà" đầu tên → "Tế" ≡ "Nhà Tế".
  function supplierKey(name) {
    let s = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    s = s.replace(/^nhà\s+/, '').replace(/^nha\s+/, '');
    return s;
  }

  // Tên còn thiếu tiền tố "Nhà"? (điền tay — app tự bổ sung khi lưu)
  function needsNhaPrefix(name) {
    const s = String(name || '').trim().replace(/\s+/g, ' ');
    return !!s && !/^nhà(\s|$)/i.test(s) && !/^nha(\s|$)/i.test(s);
  }

  // Chuẩn hóa tên theo định dạng "Nhà + Tên" (VD: "Tế" → "Nhà Tế")
  function ensureNhaPrefix(name) {
    const s = String(name || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    return needsNhaPrefix(s) ? 'Nhà ' + s : s;
  }

  // ─── NẠP / LƯU DỮ LIỆU NHÀ CUNG CẤP ──────────────────────────
  function loadSuppliers() {
    const raw = localStorage.getItem(STORAGE_KEY_SUPPLIERS);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.suppliers = Array.isArray(arr) ? arr : [];
      } catch (e) { state.suppliers = []; }
    } else {
      state.suppliers = [];
    }
  }

  function saveSuppliers() {
    try {
      localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(state.suppliers || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    // Ghi lịch sử sửa đổi (tóm tắt ai đã thêm/sửa/xóa nhà cung cấp nào)
    logDataChange(['suppliers']);
    // Ghi file bamboo_data.json NGAY LẶP TỨC (như saveMaterialRecords)
    if (state.fileStorage.connected) {
      storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── TÍNH SỐ LIỆU CỦA 1 NHÀ CUNG CẤP ─────────────────────────
  // Nhà cung cấp của 1 lượt cắt/chọn: Ưu tiên tên HIỆN TẠI của bản ghi nguyên
  // liệu được link (tự cập nhật khi đổi tên); bản ghi NL gốc đã xóa → dùng
  // snapshot đã lưu trong lượt cắt/chọn.
  function cutSupplierOf(cut) {
    if (!cut) return '';
    const mat = (state.materialRecords || []).find(m => m.id === cut.materialId) || null;
    return (mat && mat.supplier) || cut.supplier || '';
  }

  // Trọng lượng (kg) của 1 lần nhập nguyên liệu (weight = đầu vào − đầu ra)
  function materialWeightOf(rec) {
    if (!rec) return 0;
    const w = Number(rec.weight);
    if (Number.isFinite(w)) return w;
    return (Number(rec.inputIndex) || 0) - (Number(rec.outputIndex) || 0);
  }

  function supplierStatsOf(name) {
    const key = supplierKey(name);
    // 1) Các lần nhập nguyên liệu của NCC (cả 3 vị trí)
    const mats = (state.materialRecords || []).filter(r => supplierKey(r.supplier) === key);
    const totalWeight = mats.reduce((s, r) => s + materialWeightOf(r), 0);
    const tripCount = mats.length;
    const avg = tripCount ? totalWeight / tripCount : 0;
    // 1b) Loại nguyên liệu NCC đã cung cấp (gộp theo tên loại, sắp theo tổng KL giảm dần)
    const typeMap = new Map();
    mats.forEach(r => {
      const tName = String(r.type || '').trim() || 'Khác';
      const cur = typeMap.get(tName) || { name: tName, weight: 0, trips: 0 };
      cur.weight += materialWeightOf(r);
      cur.trips += 1;
      typeMap.set(tName, cur);
    });
    const types = [...typeMap.values()].sort((a, b) => b.weight - a.weight);
    // 2) Các lượt cắt/chọn Xưởng 2 của NCC — mới nhất lên đầu
    const cuts = (state.xuong2CutRecords || [])
      .filter(r => supplierKey(cutSupplierOf(r)) === key)
      .map(r => {
        const mat = (state.materialRecords || []).find(m => m.id === r.materialId) || null;
        return {
          date: r.date || '',
          createdAt: r.createdAt || '',
          input: mat ? materialWeightOf(mat) : (Number(r.inputWeight) || 0),
          cayLoai: Number(r.klCayLoai) || 0,
          note: String(r.note || '').trim()
        };
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') ||
                      (b.createdAt || '').localeCompare(a.createdAt || ''));
    const recent = cuts.slice(0, RECENT_TRIPS); // 10 chuyến gần nhất
    // Tỷ lệ đạt = trung bình (KL đầu vào − KL cây loại) ÷ KL đầu vào
    let tyLe = null;
    if (recent.length) {
      let sum = 0, cnt = 0;
      recent.forEach(c => {
        if (c.input > 0) { sum += (c.input - c.cayLoai) / c.input; cnt++; }
      });
      if (cnt) tyLe = (sum / cnt) * 100;
    }
    // Số lần nhắc nhở = số lượt cắt/chọn có ghi chú trong 10 chuyến gần nhất
    const nhac = recent.filter(c => c.note).length;
    const recentNotes = recent.filter(c => c.note)
      .map(c => `(${formatDateDDMMYY(c.date)}) ${c.note}`);
    return { totalWeight, tripCount, avg, types, cutCount: cuts.length, recentCount: recent.length, tyLe, nhac, recentNotes };
  }

  // Điểm bậc thang: giá trị ≥ ngưỡng tiers[0] → 5 điểm, ≥ tiers[1] → 4 ... dưới hết → 1
  function tierScore(v, tiers) {
    for (let i = 0; i < tiers.length; i++) {
      if (v >= tiers[i]) return 5 - i;
    }
    return 1;
  }

  // Đánh giá 1–5 sao theo tiêu chí (xem hằng RATING_* ở đầu file)
  function computeSupplierRating(st) {
    const pAvgKg = tierScore(st.avg, AVG_KG_TIERS);
    // Chưa có lượt cắt/chọn nào → tỷ lệ đạt trung lập 3 (không phạt NCC chưa có số liệu)
    const pRate = st.tyLe == null ? 3 : tierScore(st.tyLe, RATE_TIERS);
    const pRemind = REMIND_SCORE[st.nhac] != null ? REMIND_SCORE[st.nhac] : 1;
    let score = RATING_WEIGHT.avgKg * pAvgKg + RATING_WEIGHT.rate * pRate + RATING_WEIGHT.remind * pRemind;
    score = Math.max(1, Math.min(5, Math.round(score * 2) / 2)); // kẹp 1..5, làm tròn 0,5
    return { score, pAvgKg, pRate, pRemind };
  }

  const fmtKg = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const fmtPct = v => (Number(v) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Vẽ 5 sao: vàng đậm (đủ) / vàng mờ 50% (nửa) / xám mờ (thiếu) + số điểm
  function starsHtml(score) {
    const full = Math.floor(score);
    const half = score - full >= 0.25;
    let html = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) html += '<span class="sup-star">★</span>';
      else if (i === full && half) html += '<span class="sup-star sup-star-half">★</span>';
      else html += '<span class="sup-star-empty">☆</span>';
    }
    return html + `<span class="sup-star-score">${fmtPct(score)}/5</span>`;
  }

  // ─── RENDER BẢNG THÔNG TIN NHÀ CUNG ──────────────────────────
  // Gợi ý tên nhà cung cấp (datalist trong modal): danh mục đã khai báo
  // + các tên từng xuất hiện trong nhật ký nhập nguyên liệu (tự thêm "Nhà").
  function renderSupplierSuggestions() {
    const dl = document.getElementById('supplier-name-suggestions');
    if (!dl) return;
    const set = new Map(); // khóa tên → tên hiển thị (ưu tiên bản đã khai báo)
    (state.suppliers || []).forEach(s => {
      const k = supplierKey(s.name);
      if (k) set.set(k, s.name);
    });
    (state.materialRecords || []).forEach(r => {
      const n = String(r.supplier || '').trim();
      if (!n) return;
      const k = supplierKey(n);
      if (!set.has(k)) set.set(k, ensureNhaPrefix(n));
    });
    dl.innerHTML = [...set.values()].sort((a, b) => a.localeCompare(b, 'vi'))
      .map(n => `<option value="${escapeHTML(n)}">`).join('');
  }

  // Dòng dữ liệu 1 nhà cung cấp
  function supplierRowHtml(x) {
    const { s, st, rt } = x;
    const rateTxt = st.tyLe == null
      ? `<span style="color:var(--text-muted);" title="Chưa có lượt cắt/chọn ở Xưởng 2 (tab Công Đoạn)">—</span>`
      : `<strong class="${st.tyLe >= RATE_TIERS[0] ? 'sup-rate-good' : st.tyLe >= RATE_TIERS[2] ? 'sup-rate-mid' : 'sup-rate-bad'}" title="Trung bình ${st.recentCount} chuyến cắt/chọn gần nhất">${fmtPct(st.tyLe)}%</strong>`;
    const notesTitle = st.recentNotes.length
      ? escapeHTML(st.recentNotes.join('\n'))
      : 'Chưa có ghi chú nhắc nhở nào trong 10 chuyến gần nhất';
    // Loại nguyên liệu NCC đã cung cấp (chip nhỏ, rê chuột xem KL + số chuyến từng loại)
    const typesTxt = st.types.length
      ? st.types.map(t =>
          `<span class="sup-type-chip" title="${escapeHTML(t.name)}: ${fmtKg(t.weight)} kg (${t.trips} chuyến)">${escapeHTML(t.name)}</span>`).join(' ')
      : '<span style="color:var(--text-muted);">—</span>';
    return `<tr>
          <td><strong>${escapeHTML(s.name || '—')}</strong></td>
          <td>${s.code ? escapeHTML(s.code) : '<span style="color:var(--text-muted);">—</span>'}</td>
          <td style="max-width:260px;">${typesTxt}</td>
          <td><span class="sup-stars" title="Điểm KL TB (${fmtKg(st.avg)} kg/chuyến): ${rt.pAvgKg}/5 · Tỷ lệ đạt: ${st.tyLe == null ? 'chưa có số liệu (3/5)' : fmtPct(st.tyLe) + '% → ' + rt.pRate + '/5'} · Nhắc nhở ${st.nhac} lần → ${rt.pRemind}/5">${starsHtml(rt.score)}</span></td>
          <td class="text-right"><strong style="color:var(--primary);">${fmtKg(st.totalWeight)}</strong> kg</td>
          <td class="text-right">${st.tripCount}</td>
          <td class="text-right">${st.tripCount ? fmtKg(st.avg) + ' kg' : '<span style="color:var(--text-muted);">—</span>'}</td>
          <td class="text-right">${rateTxt}</td>
          <td class="text-right"><span class="${st.nhac ? 'sup-remind-yes' : ''}" title="${notesTitle}">${st.nhac} lần</span></td>
          <td class="text-right">
            <button class="btn btn-icon btn-outline" title="Sửa" data-perm="materials" data-sup-edit="${escapeHTML(s.id)}"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" title="Xóa" data-perm="materials" data-sup-delete="${escapeHTML(s.id)}"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
  }

  // Danh sách tên NCC có trong dữ liệu nhập nhưng CHƯA khai báo ở bảng này
  // (dữ liệu cũ chưa theo định dạng "Nhà + Tên") → chip "Khai báo nhanh".
  function renderUnknownSuppliers(box, declaredKeys) {
    const seen = new Set();
    const unknown = [];
    (state.materialRecords || []).forEach(r => {
      const name = String(r.supplier || '').trim();
      if (!name) return;
      const k = supplierKey(name);
      if (seen.has(k) || declaredKeys.has(k)) return;
      seen.add(k);
      unknown.push(name);
    });
    unknown.sort((a, b) => a.localeCompare(b, 'vi'));
    if (!unknown.length) {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    box.style.display = '';
    box.innerHTML = `
        <div class="sup-unknown-title"><i data-lucide="alert-triangle"></i> ${unknown.length} tên nhà cung cấp trong dữ liệu nhập chưa khai báo ở bảng này:</div>
        <div class="sup-unknown-chips">${unknown.map(n =>
          `<button type="button" class="sup-unknown-chip" data-sup-quick="${escapeHTML(n)}" title="Khai báo nhanh (tự thêm tiền tố 'Nhà')"><i data-lucide="plus"></i> ${escapeHTML(n)}</button>`).join('')}</div>
        <div class="sup-unknown-hint">Bấm tên để khai báo nhanh, hoặc bấm <strong>Chuẩn Hóa Tên</strong> để tự thêm tiền tố "Nhà" cho toàn bộ tên còn thiếu.</div>`;
    initLucide();
  }

  function renderSuppliers() {
    const tbody = document.getElementById('supplier-table-body');
    const summary = document.getElementById('sup-summary');
    const unknownBox = document.getElementById('sup-unknown');
    renderSupplierSuggestions();
    if (!tbody) return;
    const list = [...(state.suppliers || [])].map(s => {
      const st = supplierStatsOf(s.name);
      return { s, st, rt: computeSupplierRating(st) };
    }).sort((a, b) =>
      (b.rt.score - a.rt.score) ||
      (b.st.totalWeight - a.st.totalWeight) ||
      String(a.s.name || '').localeCompare(String(b.s.name || ''), 'vi'));
    if (!list.length) {
      tbody.innerHTML = `
        <tr><td colspan="10" class="text-center" style="color:var(--text-muted); padding:28px 10px;">
          <i data-lucide="truck" style="width:30px;height:30px;opacity:.5;"></i>
          <div style="margin-top:8px;">Chưa khai báo nhà cung cấp nào.<br>Bấm <strong>Thêm Nhà Cung Cấp</strong> (tên theo định dạng "Nhà + Tên", VD: Nhà Tế).</div>
        </td></tr>`;
    } else {
      tbody.innerHTML = list.map(supplierRowHtml).join('');
    }
    if (summary) {
      const totalW = list.reduce((s, x) => s + x.st.totalWeight, 0);
      const totalT = list.reduce((s, x) => s + x.st.tripCount, 0);
      summary.innerHTML = `
        <span title="Số nhà cung cấp đã khai báo"><i data-lucide="users"></i> <strong>${list.length}</strong> nhà cung cấp</span>
        <span title="Tổng khối lượng nguyên liệu đã nhập của các nhà cung cấp trong bảng"><i data-lucide="scale"></i> <strong>${fmtKg(totalW)}</strong> kg</span>
        <span title="Tổng số chuyến nhập của các nhà cung cấp trong bảng"><i data-lucide="list"></i> <strong>${totalT}</strong> chuyến nhập</span>`;
    }
    if (unknownBox) {
      renderUnknownSuppliers(unknownBox, new Set(list.map(x => supplierKey(x.s.name))));
    }
    initLucide();
  }

  // ─── NÚT "CHUẨN HÓA TÊN": THÊM TIỀN TỐ "Nhà" CHO TÊN CÒN THIẾU ──
  // Sửa đồng loạt 3 nguồn: nhật ký nguyên liệu + lượt cắt/chọn Xưởng 2
  // (snapshot NCC) + bảng Nhà Cung. Ví dụ: "Tế" → "Nhà Tế".
  function normalizeSupplierNames() {
    if (!requireEditPermission()) return;
    const mats = (state.materialRecords || []).filter(r => needsNhaPrefix(r.supplier));
    const cuts = (state.xuong2CutRecords || []).filter(r => needsNhaPrefix(r.supplier));
    const sups = (state.suppliers || []).filter(s => needsNhaPrefix(s.name));
    const total = mats.length + cuts.length + sups.length;
    if (!total) {
      showToast('Tất cả tên nhà cung cấp đã có tiền tố "Nhà" — không cần chuẩn hóa.', 'info');
      return;
    }
    if (!confirm(`Chuẩn hóa ${total} tên nhà cung cấp còn thiếu (thêm tiền tố "Nhà")?\n\n- Nhật ký nguyên liệu: ${mats.length} lần nhập\n- Lượt cắt/chọn Xưởng 2: ${cuts.length} lượt\n- Bảng Thông Tin Nhà Cung: ${sups.length} dòng\n\nVí dụ: "Tế" → "Nhà Tế".`)) return;
    mats.forEach(r => {
      r.supplier = ensureNhaPrefix(r.supplier);
      r.updatedAt = new Date().toISOString();
    });
    cuts.forEach(r => {
      r.supplier = ensureNhaPrefix(r.supplier);
      r.updatedAt = new Date().toISOString();
    });
    sups.forEach(s => {
      s.name = ensureNhaPrefix(s.name);
      s.updatedAt = new Date().toISOString();
    });
    saveSuppliers();
    // Ghi cả 2 nguồn dữ liệu đã đổi tên (import động — tránh vòng phụ thuộc)
    Promise.all([import('./materials.js'), import('./xuong2.js')])
      .then(([mat, x2]) => {
        if (mat && mat.saveMaterialRecords) mat.saveMaterialRecords();
        if (x2 && x2.saveXuong2Cuts) x2.saveXuong2Cuts();
      })
      .catch(() => {});
    renderSuppliers();
    showToast(`Đã chuẩn hóa tên (thêm "Nhà"): ${mats.length} lần nhập NL, ${cuts.length} lượt cắt/chọn, ${sups.length} dòng bảng.`, 'success');
  }

  // ─── MODAL THÊM / SỬA NHÀ CUNG CẤP (tên + mã số điền tay) ────
  function openSupplierModal(recordId = null, prefillName = '') {
    const modal = document.getElementById('modal-supplier');
    if (!modal) return;
    state.supplierEditId = recordId || null;
    const title = document.getElementById('supplier-modal-title');
    const nameEl = document.getElementById('supplier-name');
    const codeEl = document.getElementById('supplier-code');
    renderSupplierSuggestions();
    let nameVal = '';
    let codeVal = '';
    if (recordId) {
      const rec = (state.suppliers || []).find(s => s.id === recordId);
      if (rec) { nameVal = rec.name || ''; codeVal = rec.code || ''; }
      if (title) title.innerHTML = '<i data-lucide="pencil"></i> Sửa Nhà Cung Cấp';
    } else {
      // Khai báo nhanh từ chip dữ liệu cũ: tự thêm tiền tố "Nhà" luôn
      nameVal = ensureNhaPrefix(prefillName);
      if (title) title.innerHTML = '<i data-lucide="building-2"></i> Thêm Nhà Cung Cấp';
    }
    if (nameEl) nameEl.value = nameVal;
    if (codeEl) codeEl.value = codeVal;
    modal.classList.add('show');
    initLucide();
    if (nameEl) { try { nameEl.focus(); } catch (e) { /* bỏ qua */ } }
  }

  function closeSupplierModal() {
    document.getElementById('modal-supplier')?.classList.remove('show');
    state.supplierEditId = null;
  }

  function handleSupplierSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const nameEl = document.getElementById('supplier-name');
    const codeEl = document.getElementById('supplier-code');
    const rawName = String((nameEl && nameEl.value) || '').trim().replace(/\s+/g, ' ');
    if (!rawName) { showToast('Tên nhà cung cấp không được để trống!', 'error'); return; }
    const name = ensureNhaPrefix(rawName); // định dạng "Nhà + Tên"
    const code = String((codeEl && codeEl.value) || '').trim();
    const key = supplierKey(name);
    const dup = (state.suppliers || []).find(s => s.id !== state.supplierEditId && supplierKey(s.name) === key);
    if (dup) { showToast(`Nhà cung cấp "${dup.name}" đã có trong bảng rồi!`, 'error'); return; }
    if (state.supplierEditId) {
      const rec = (state.suppliers || []).find(s => s.id === state.supplierEditId);
      if (!rec) { showToast('Không tìm thấy nhà cung cấp cần sửa!', 'error'); return; }
      Object.assign(rec, { name, code, updatedAt: new Date().toISOString() });
      showToast('Đã cập nhật nhà cung cấp!', 'success');
    } else {
      (state.suppliers = state.suppliers || []).push({
        id: 'sup-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        name, code,
        createdAt: new Date().toISOString()
      });
      showToast('Đã thêm nhà cung cấp!', 'success');
    }
    saveSuppliers();
    closeSupplierModal();
    renderSuppliers();
  }

  function deleteSupplier(id) {
    if (!requireEditPermission()) return;
    const rec = (state.suppliers || []).find(s => s.id === id);
    if (!rec) return;
    if (!confirm(`Xóa nhà cung cấp "${rec.name}" khỏi bảng?\nDữ liệu nhập nguyên liệu KHÔNG bị xóa theo.`)) return;
    trackDeleted('suppliers', id); // tombstone: không bị mây/máy khác hồi sinh
    state.suppliers = (state.suppliers || []).filter(s => s.id !== id);
    saveSuppliers();
    renderSuppliers();
    showToast('Đã xóa nhà cung cấp!', 'success');
  }

export {
  computeSupplierRating,
  closeSupplierModal,
  deleteSupplier,
  ensureNhaPrefix,
  handleSupplierSubmit,
  loadSuppliers,
  needsNhaPrefix,
  normalizeSupplierNames,
  openSupplierModal,
  renderSupplierSuggestions,
  renderSuppliers,
  saveSuppliers,
  supplierKey,
  supplierStatsOf
};
