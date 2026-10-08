// ═══════════════════════════════════════════════════════════
// js/qc-press.js — THẺ "NHẬT KÝ THEO DÕI ÉP VÁN" (tab QC — qc-press-card)
// ═══════════════════════════════════════════════════════════
// QC theo dõi TỪNG LƯỢT ÉP của thẻ Ép Ván (tab Công Đoạn SX — Xưởng 2).
// Số liệu ĐỌC SỐNG từ state.pressRecords → sửa ở Ép Ván là QC tự đổi theo;
// QC chỉ lưu verdict NHẸ 1-1 (mỗi lượt ép 1 kết quả duy nhất, bấm là ghi đè):
//   state.qcPressLogs = [{ id, pressId, verdict 'pass'|'fail', checkedBy, checkedAt, updatedAt }]
// Cột hiển thị (đúng yêu cầu): Ngày · Tên ván/thanh · Số lượng · Lực ép ngang ·
// Lực ép đứng · Nhiệt độ · Thời gian ép (phút/lượt) · Tên keo · Số lượng keo ·
// Phụ gia · Số lượng phụ gia · Tỷ lệ pha trộn Keo - phụ gia (đơn vị GRAM,
// dạng "100g - 12g") · Độ phủ = (keo + phụ gia) ÷ số lượng ván (g/tấm) ·
// QC kiểm (nút ✅ xanh / ❌ đỏ + nhãn PASS nghiêng / Fail).
// QUY TẮC TÊN + SỐ LƯỢNG (đã chốt): ưu tiên ô VÁN THÔ (dòng vtQty > 0 đầu
// tiên) → không có mới lấy ô THÀNH PHẨM (productName/fpDim + finishedQty).
// Keo/phụ gia ở Ép Ván lưu KG → ở đây đổi sang GAM (×1000) trước khi hiển thị.
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { STORAGE_KEY_QC_PRESS, state } from './state.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';

  // ─── TIỆN ÍCH CHUNG ──────────────────────────────────────────
  const qcPressTodayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
  const qcPressFmt = (v, d = 0) => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: d });
  const qcPressNum = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  // Bỏ dấu + chữ thường (tìm kiếm tên ván/thanh · keo · phụ gia)
  const qcPressNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  // Trạng thái riêng của thẻ (thuần UI — chỉ sống trong phiên)
  let qcPressSearchQ = '';
  let qcPressFilter = 'all'; // 'all' | 'pass' | 'fail' | 'unchecked'

  // ─── NẠP / LƯU VERDICT (localStorage + file + mây) ──────────
  function loadQcPressLogs() {
    const raw = localStorage.getItem(STORAGE_KEY_QC_PRESS);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.qcPressLogs = Array.isArray(arr) ? arr.filter(r => r && r.pressId) : [];
      } catch (e) { state.qcPressLogs = []; }
    } else {
      state.qcPressLogs = [];
    }
  }
  function saveQcPressLogs() {
    try {
      localStorage.setItem(STORAGE_KEY_QC_PRESS, JSON.stringify(state.qcPressLogs || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    logDataChange(['qcPressLogs']); // ghi lịch sử sửa đổi (miền tab QC)
    if (state.fileStorage.connected) {
      import('./storage.js').then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync(); // đồng bộ lên mây nếu online
  }

  // ─── ĐỌC VERDICT 1-1 THEO LƯỢT ÉP ──────────────────────────
  function qcPressVerdictOf(pressId) {
    const l = (state.qcPressLogs || []).find(x => x && String(x.pressId) === String(pressId));
    const v = String((l && l.verdict) || '');
    return (v === 'pass' || v === 'fail') ? v : '';
  }

  // ─── TÊN + SỐ LƯỢNG — ƯU TIÊN Ô VÁN THÔ ───────────────────
  // Dòng ván thô ĐẦU TIÊN có số lượng > 0 → lấy kích thước đó;
  // ngược lại (lượt chỉ điền Thành Phẩm) → productName/fpDim + finishedQty.
  function qcPressNameQtyOf(r) {
    const rr = r || {};
    const lines = Array.isArray(rr.vanTho) ? rr.vanTho : [];
    const vt = lines.find(l => l && String(l.vtDim || '').trim() && (parseFloat(l.vtQty) || 0) > 0);
    if (vt) return { name: String(vt.vtDim).trim(), qty: Number(vt.vtQty) || 0, source: 'vanTho' };
    const fpName = String(rr.productName || rr.fpDim || '').trim();
    const fpQty = Number(rr.finishedQty) || 0;
    if (fpName) return { name: fpName, qty: fpQty, source: 'thanhPham' };
    return { name: '', qty: 0, source: 'none' };
  }

  // ─── SỐ LIỆU HIỂN THỊ CỦA 1 LƯỢT ÉP ─────────────────────────
  // Keo/phụ gia Ép Ván lưu KG → đổi sang GAM ở đây (×1000, làm tròn nguyên).
  //   Tỷ lệ keo - phụ gia : "100g - 12g" (thiếu cả hai → "—")
  //   Độ phủ               : (keo + phụ gia) gam ÷ số lượng ván/thanh (g/tấm)
  function qcPressDisplay(r) {
    const rr = r || {};
    const { name, qty, source } = qcPressNameQtyOf(rr);
    const forceH = qcPressNum(rr.forceH);
    const forceV = qcPressNum(rr.forceV);
    const tempC = qcPressNum(rr.tempC);
    const pressMin = qcPressNum(rr.pressMin);
    const glueName = String(rr.glueName || '').trim();
    const additiveName = String(rr.additiveName || '').trim();
    const glueG = Math.round(qcPressNum(rr.glue) * 1000);
    const additiveG = Math.round(qcPressNum(rr.additive) * 1000);
    const mixText = (glueG > 0 || additiveG > 0) ? `${qcPressFmt(glueG)}g - ${qcPressFmt(additiveG)}g` : '—';
    const coverage = (qty > 0 && (glueG + additiveG) > 0) ? (glueG + additiveG) / qty : null;
    return {
      id: rr.id || '', date: rr.date || '', name, qty, source,
      forceH, forceV, tempC, pressMin,
      glueName, glueG, additiveName, additiveG, mixText, coverage,
      verdict: qcPressVerdictOf(rr.id)
    };
  }

  // Danh sách lượt ép ĐANG HIỂN THỊ (lọc từ khóa + phễu PASS/Fail/chưa kiểm)
  function qcPressRowsFiltered() {
    const list = [...(state.pressRecords || [])]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const q = qcPressNorm(qcPressSearchQ);
    return list.filter(r => {
      const d = qcPressDisplay(r);
      if (qcPressFilter === 'pass' && d.verdict !== 'pass') return false;
      if (qcPressFilter === 'fail' && d.verdict !== 'fail') return false;
      if (qcPressFilter === 'unchecked' && d.verdict) return false;
      if (!q) return true;
      return qcPressNorm(`${d.name} ${d.glueName} ${d.additiveName} ${d.date}`).includes(q);
    });
  }

  // ─── ĐẾM TRÊN THẺ MINI (launcher) ───────────────────────────
  // Clamp bằng tổng lượt ép: log còn sót của lượt Ép đã xóa không làm vượt.
  function qcPressCardCount() {
    const total = (state.pressRecords || []).length;
    if (!total) return 'Chưa có lượt ép';
    const done = Math.min(total, (state.qcPressLogs || [])
      .filter(l => l && (l.verdict === 'pass' || l.verdict === 'fail')).length);
    return `${done}/${total} đã kiểm`;
  }

  // ─── LƯU VERDICT 1-1 (bấm là ghi đè kết quả cũ) ─────────────
  function setQcPressVerdict(pressId, verdict) {
    if (!requireEditPermission()) return false;
    const v = String(verdict) === 'fail' ? 'fail' : 'pass';
    const rec = (state.pressRecords || []).find(r => r && String(r.id) === String(pressId));
    if (!rec) { showToast('Lượt ép này không còn tồn tại ở thẻ Ép Ván!', 'error'); return false; }
    const now = new Date().toISOString();
    const me = state.currentUser ? (state.currentUser.fullname || state.currentUser.email || '') : '';
    if (!Array.isArray(state.qcPressLogs)) state.qcPressLogs = [];
    const cur = state.qcPressLogs.find(x => x && String(x.pressId) === String(pressId));
    if (cur) {
      cur.verdict = v;
      cur.checkedBy = me;
      cur.checkedAt = qcPressTodayISO();
      cur.updatedAt = now;
    } else {
      state.qcPressLogs.push({
        id: `qcp-${pressId}`, pressId: String(pressId), verdict: v,
        checkedBy: me, checkedAt: qcPressTodayISO(), createdAt: now, updatedAt: now
      });
    }
    saveQcPressLogs();
    renderQcPressCard();
    showToast(v === 'pass' ? 'Đã chấm PASS cho lượt ép!' : 'Đã chấm Fail cho lượt ép!', v === 'pass' ? 'success' : 'info');
    return true;
  }
  // Ủy quyền click trong bảng (nút ✅/❌ gắn data-qcp-verdict + data-qcp-id)
  function onQcPressTableClick(e) {
    const t = e && e.target && e.target.closest ? e.target.closest('[data-qcp-verdict]') : null;
    if (!t) return false;
    const pressId = t.getAttribute('data-qcp-id') || '';
    const verdict = t.getAttribute('data-qcp-verdict') || '';
    if (!pressId || (verdict !== 'pass' && verdict !== 'fail')) return false;
    return setQcPressVerdict(pressId, verdict);
  }
  function setQcPressSearchQ(v) {
    qcPressSearchQ = String(v || '');
    renderQcPressTable();
  }
  function setQcPressFilter(v) {
    const f = String(v || 'all');
    qcPressFilter = (f === 'pass' || f === 'fail' || f === 'unchecked') ? f : 'all';
    renderQcPressTable();
  }

  // ─── Ô QC KIỂM: 2 NÚT (tích xanh ✅ / X đỏ ❌) + NHÃN ───────
  // PASS = nhãn NGHIÊNG kiểu dấu QC · Fail = nhãn đỏ · chưa chấm = "Chưa kiểm"
  function qcPressCheckCellHtml(d) {
    const passActive = d.verdict === 'pass';
    const failActive = d.verdict === 'fail';
    const stamp = passActive
      ? `<span class="qcp-stamp qcp-stamp-pass" title="Lượt ép đạt yêu cầu">PASS</span>`
      : failActive
        ? `<span class="qcp-stamp qcp-stamp-fail" title="Lượt ép chưa đạt yêu cầu">Fail</span>`
        : `<span class="qcp-stamp qcp-stamp-none">Chưa kiểm</span>`;
    return `<div class="qcp-check-wrap" data-perm="qc">
      <button type="button" class="qcp-check-btn qcp-check-pass${passActive ? ' active' : ''}" data-qcp-verdict="pass" data-qcp-id="${escapeHTML(d.id)}" title="Chấm lượt ép này là ĐẠT (PASS)"><i data-lucide="check"></i></button>
      <button type="button" class="qcp-check-btn qcp-check-fail${failActive ? ' active' : ''}" data-qcp-verdict="fail" data-qcp-id="${escapeHTML(d.id)}" title="Chấm lượt ép này là CHƯA ĐẠT (Fail)"><i data-lucide="x"></i></button>
      ${stamp}
    </div>`;
  }

  // ─── RENDER: THỐNG KÊ NHANH ──────────────────────────────────
  function renderQcPressStats() {
    const box = document.getElementById('qcp-stats');
    if (!box) return;
    const rows = (state.pressRecords || []).map(qcPressDisplay);
    const total = rows.length;
    const pass = rows.filter(d => d.verdict === 'pass').length;
    const fail = rows.filter(d => d.verdict === 'fail').length;
    const done = pass + fail;
    box.innerHTML = `
      <div class="material-stat"><span class="material-stat-value">${qcPressFmt(total)}</span><span class="material-stat-label">Lượt ép</span></div>
      <div class="material-stat"><span class="material-stat-value">${qcPressFmt(done)}</span><span class="material-stat-label">Đã kiểm</span></div>
      <div class="material-stat"><span class="material-stat-value" style="color:#16a34a;">${qcPressFmt(pass)}</span><span class="material-stat-label">PASS</span></div>
      <div class="material-stat"><span class="material-stat-value" style="color:#dc2626;">${qcPressFmt(fail)}</span><span class="material-stat-label">Fail</span></div>
      <div class="material-stat"><span class="material-stat-value" style="color:#b45309;">${qcPressFmt(Math.max(0, total - done))}</span><span class="material-stat-label">Chưa kiểm</span></div>`;
  }

  // ─── RENDER: BẢNG = THẺ NGÀY (mỗi ngày 1 thẻ) ───────────────
  function renderQcPressTable() {
    const box = document.getElementById('qcp-day-cards');
    if (!box) return;
    const countEl = document.getElementById('qcp-day-count');
    const rows = qcPressRowsFiltered();
    const totalAll = (state.pressRecords || []).length;
    if (countEl) countEl.textContent = totalAll ? `${rows.length}/${totalAll} lượt ép` : '';
    if (!totalAll) {
      box.innerHTML = `<div class="x2-day-card x2-day-card-empty"><i data-lucide="layers"></i><div>Chưa có lượt ép nào ở thẻ Ép Ván (tab Công Đoạn SX — Xưởng 2). Nhập lượt ép xong thì quay lại đây để QC chấm PASS/Fail.</div></div>`;
      initLucide();
      return;
    }
    if (!rows.length) {
      box.innerHTML = `<div class="x2-day-card x2-day-card-empty"><i data-lucide="search"></i><div>Không có lượt ép nào khớp bộ lọc hiện tại.</div></div>`;
      initLucide();
      return;
    }
    const groups = new Map();
    rows.forEach(r => {
      const key = r.date || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let html = '';
    for (const [date, list] of groups) {
      const disp = list.map(qcPressDisplay);
      const dPass = disp.filter(d => d.verdict === 'pass').length;
      const dFail = disp.filter(d => d.verdict === 'fail').length;
      const body = disp.map(d => `<tr>
        <td title="${d.source === 'vanTho' ? 'Tên lấy từ ô Ván Thô (ưu tiên)' : d.source === 'thanhPham' ? 'Không có ván thô nên lấy từ ô Thành Phẩm' : 'Lượt ép chưa có đầu ra'}">${d.name ? escapeHTML(d.name) : '—'}${d.source === 'vanTho' ? ' <span class="qcp-src-tag" title="Ưu tiên lấy ở ô Ván thô">Ván thô</span>' : d.source === 'thanhPham' ? ' <span class="qcp-src-tag qcp-src-fp" title="Không có ván thô nên lấy ở ô Thành phẩm">TP</span>' : ''}</td>
        <td style="text-align:right;"><strong>${d.qty ? qcPressFmt(d.qty) : '—'}</strong></td>
        <td style="text-align:right;">${d.forceH ? qcPressFmt(d.forceH, 2) : '—'}</td>
        <td style="text-align:right;">${d.forceV ? qcPressFmt(d.forceV, 2) : '—'}</td>
        <td style="text-align:right;">${d.tempC ? qcPressFmt(d.tempC, 1) : '—'}</td>
        <td style="text-align:right;">${d.pressMin ? qcPressFmt(d.pressMin, 1) : '—'}</td>
        <td>${d.glueName ? escapeHTML(d.glueName) : '—'}</td>
        <td style="text-align:right;">${d.glueG ? qcPressFmt(d.glueG) : '—'}</td>
        <td>${d.additiveName ? escapeHTML(d.additiveName) : '—'}</td>
        <td style="text-align:right;">${d.additiveG ? qcPressFmt(d.additiveG) : '—'}</td>
        <td style="white-space:nowrap;">${escapeHTML(d.mixText)}</td>
        <td style="text-align:right;white-space:nowrap;" title="Độ phủ = (số lượng keo + phụ gia) ÷ số lượng ván/thanh">${d.coverage == null ? '—' : `${qcPressFmt(d.coverage, 2)} g/tấm`}</td>
        <td>${qcPressCheckCellHtml(d)}</td>
      </tr>`).join('');
      html += `<div class="x2-day-card" data-date="${escapeHTML(date)}">
        <div class="x2-day-head">
          <span class="x2-day-date"><i data-lucide="calendar"></i> ${formatDateDDMMYY(date)}</span>
          <span class="x2-day-cap"><i data-lucide="layers"></i> ${disp.length} lượt ép</span>
          <span class="x2-day-cap" style="color:#16a34a;" title="Số lượt ép chấm PASS trong ngày">PASS: <strong>${dPass}</strong></span>
          <span class="x2-day-cap" style="color:#dc2626;" title="Số lượt ép chấm Fail trong ngày">Fail: <strong>${dFail}</strong></span>
        </div>
        <div class="table-responsive table-scroll qcp-table-wrap"><table class="planning-table qcp-table">
          <thead><tr>
            <th>Tên ván/thanh</th>
            <th style="text-align:right;">Số lượng</th>
            <th style="text-align:right;">Lực ép ngang (Kg/cm²)</th>
            <th style="text-align:right;">Lực ép đứng (Kg/cm²)</th>
            <th style="text-align:right;">Nhiệt độ (°C)</th>
            <th style="text-align:right;">Thời gian ép (phút/lượt)</th>
            <th>Tên keo</th>
            <th style="text-align:right;">SL keo (g)</th>
            <th>Phụ gia</th>
            <th style="text-align:right;">SL phụ gia (g)</th>
            <th>Tỷ lệ keo - phụ gia</th>
            <th style="text-align:right;">Độ phủ</th>
            <th>QC kiểm</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table></div>
      </div>`;
    }
    box.innerHTML = html;
    initLucide();
  }

  // ─── RENDER TOÀN BỘ THẺ (gọi từ renderQcView + sau mỗi thao tác) ──
  function renderQcPressCard() {
    renderQcPressStats();
    renderQcPressTable();
    initLucide();
  }

export {
  loadQcPressLogs,
  saveQcPressLogs,
  qcPressCardCount,
  qcPressDisplay,
  qcPressNameQtyOf,
  qcPressRowsFiltered,
  qcPressVerdictOf,
  onQcPressTableClick,
  renderQcPressCard,
  renderQcPressStats,
  renderQcPressTable,
  setQcPressFilter,
  setQcPressSearchQ,
  setQcPressVerdict
};
