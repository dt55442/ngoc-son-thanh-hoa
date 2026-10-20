// ═══════════════════════════════════════════════════════════
// js/x2-incidents.js — BÁO CÁO SỰ CỐ (tab Công Đoạn SX)
// ═══════════════════════════════════════════════════════════
// Vì sao đặt ở tab Công Đoạn SX: sự cố là HAO HỤT SẢN XUẤT (mẫu số của
// công suất → hiệu suất), không phải kết quả chất lượng; người lập phiếu đứng
// ngay thẻ công đoạn; quyền khớp (tạo phiếu = quyền sửa xưởng, duyệt = BQL).
//
// LUỒNG: Tổ trưởng/công nhân lập phiếu (công đoạn · ngày · ca · giờ · loại sự cố
// · mô tả) → trạng thái 'cho_duyet' (CHƯA trừ giờ) → Ban lãnh đạo DUYỆT
// ('da_duyet') ⇒ số giờ của phiếu TỰ ĐỘNG trở thành GIỜ SỰ CỐ của đúng
// (công đoạn, ngày) — utils.stageIncidentOf() đọc thẳng, nên mọi thẻ công đoạn +
// Bảng Tổng Hợp Công Suất + Truy Xuất + Xuất Excel tự cập nhật, KHÔNG phải sửa tay.
// Từ chối / mở lại / xoá ⇒ giờ tự trả về như trước (nếu không còn phiếu duyệt nào
// thì quay lại dùng số NHẬP TAY trên đầu thẻ ngày).
//
// Dữ liệu: state.x2IncidentReports (key bamboo_tracker_x2_incident_reports_v1)
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission } from './cloud.js';
import { logDataChange } from './history.js';
import { canApproveLeave, hrShiftCfg } from './hr.js';
import { renderAll } from './main.js'; // vẽ lại thẻ ngày của công đoạn sau khi duyệt/xoá phiếu
import { STORAGE_KEY_X2_INCIDENT_REPORTS, state } from './state.js';
import { trackDeleted } from './tombstone.js';
import { bumpIncidentCache, escapeHTML, formatDateDDMMYY, showToast } from './utils.js';

  // ─── DANH MỤC CÔNG ĐOẠN CÓ THỂ BỊ SỰ CỐ ─────────────────────
  // key = ĐÚNG khóa giờ sự cố đang dùng (data-x2-incident / công đoạn 'say' của
  // Than Hóa + Sấy / 8 khóa Xưởng 1). ws = xưởng để gắn quyền data-perm.
  const INCIDENT_STAGES = [
    { key: 'boluong', label: 'Bốc Luồng',              ws: 'x2' },
    { key: 'cut',     label: 'Cắt Chọn',               ws: 'x2' },
    { key: 'boong',   label: 'Bổ Ống',                 ws: 'x2' },
    { key: 'baotho',  label: 'Chạy Máy Bào Thô',       ws: 'x2' },
    { key: 'chonnan', label: 'Chọn Nan Thô',           ws: 'x2' },
    { key: 'say',     label: 'Than Hóa + Sấy',         ws: 'x2', say: true },
    { key: 'baotinh', label: 'Bào Tinh',               ws: 'x2' },
    { key: 'epvan',   label: 'Ép Ván',                 ws: 'x2' },
    { key: 'bullig',  label: 'Bullig',                 ws: 'x2' },
    { key: 'catvan',  label: 'Cắt Ván',                ws: 'x2' },
    { key: 'baovan',  label: 'Bào Ván',                ws: 'x2' },
    { key: 'x1catong',   label: 'X1 · Cắt Ống',            ws: 'x1' },
    { key: 'x1saysinh',  label: 'X1 · Sấy Sinh',           ws: 'x1' },
    { key: 'x1boc',      label: 'X1 · Bốc',                ws: 'x1' },
    { key: 'x1locong',   label: 'X1 · Lọc Ống',            ws: 'x1' },
    { key: 'x1catmat',   label: 'X1 · Cắt Mắt',            ws: 'x1' },
    { key: 'x1bo',       label: 'X1 · Bổ',                 ws: 'x1' },
    { key: 'x1phoisay',  label: 'X1 · Phơi Sấy',           ws: 'x1' },
    { key: 'x1locthanh', label: 'X1 · Lọc Thanh / Bó Xô',  ws: 'x1' }
  ];
  // Nguyên nhân thường gặp ở xưởng nan tre (chỉ là nhãn hiển thị)
  const INCIDENT_CAUSES = [
    { key: 'may_hong',    label: 'Máy hỏng' },
    { key: 'mat_dien',    label: 'Mất điện' },
    { key: 'thieu_nl',    label: 'Thiếu nguyên liệu / nan' },
    { key: 'hong_dao',    label: 'Hỏng dao / khuôn' },
    { key: 'cho_bao_tri', label: 'Chờ bảo trì / sửa chữa' },
    { key: 'thieu_nguoi', label: 'Thiếu người' },
    { key: 'khac',        label: 'Khác' }
  ];
  const INCIDENT_STATUS_LABEL = { cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối' };
  const INCIDENT_STATUS_ORDER = ['cho_duyet', 'da_duyet', 'tu_choi'];

  // ─── TIỆN ÍCH ────────────────────────────────────────────────
  const incTodayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
  const incNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const incFmt = (v, d = 0) => incNum(v).toLocaleString('vi-VN', { maximumFractionDigits: d });
  const incNorm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
  const incRound2 = (v) => Math.round(incNum(v) * 100) / 100;
  function incidentStageLabel(key) {
    const d = INCIDENT_STAGES.find(s => s.key === String(key || ''));
    return d ? d.label : String(key || '—');
  }
  function incidentStageDef(key) {
    return INCIDENT_STAGES.find(s => s.key === String(key || '')) || null;
  }
  function incidentCauseLabel(key) {
    const c = INCIDENT_CAUSES.find(x => x.key === String(key || ''));
    return c ? c.label : '—';
  }
  // Số giờ từ giờ bắt đầu / kết thúc (HH:MM). Qua đêm: +24h nếu giờ ra < giờ vào.
  function incidentHoursFromTimes(start, end) {
    const toMin = (t) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
      return m ? (Number(m[1]) * 60 + Number(m[2])) : null;
    };
    const a = toMin(start), b = toMin(end);
    if (a == null || b == null) return null;
    let diff = b - a;
    if (diff < 0) diff += 24 * 60;
    return incRound2(diff / 60);
  }


  // ─── NẠP / LƯU ───────────────────────────────────────────────
  function loadX2IncidentReports() {
    let arr = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_X2_INCIDENT_REPORTS);
      if (raw) { const o = JSON.parse(raw); if (Array.isArray(o)) arr = o; }
    } catch (e) { arr = []; }
    state.x2IncidentReports = arr.filter(r => r && r.id && r.stage && r.date).map(r => {
      const st = String(r.status || '');
      return Object.assign({}, r, {
        status: INCIDENT_STATUS_ORDER.includes(st) ? st : 'cho_duyet',
        hours: incRound2(r.hours)
      });
    });
    bumpIncidentCache();
    return state.x2IncidentReports;
  }
  function saveX2IncidentReports() {
    try {
      localStorage.setItem(STORAGE_KEY_X2_INCIDENT_REPORTS, JSON.stringify(state.x2IncidentReports || []));
    } catch (err) {
      showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error');
    }
    bumpIncidentCache();          // giờ hiệu lực của công đoạn đổi → bảng đọc lại ngay
    logDataChange(['x2IncidentReports']);
    if (state.fileStorage.connected) {
      import('./storage.js').then(m => m && m.writeDataToFile()).catch(() => {});
    }
    firePushSync();
    updateIncidentBadge();
  }

  // ─── ĐỌC / HIỂN THỊ ──────────────────────────────────────────
  function incidentReportList() {
    return [...(state.x2IncidentReports || [])].sort((a, b) => {
      const d = String(b.date || '').localeCompare(String(a.date || ''));
      if (d) return d;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }
  // Tên ca lấy từ Cài Đặt Ca của bộ phận Xưởng 2 (đổi tên ca là phiếu tự đổi theo)
  function incidentShiftLabel(shiftIdx) {
    if (shiftIdx == null || shiftIdx === '') return '—';
    const cfg = (() => { try { return hrShiftCfg('Xưởng 2'); } catch (e) { return null; } })();
    const s = cfg && Array.isArray(cfg.shifts) ? cfg.shifts[Number(shiftIdx)] : null;
    return s && s.name ? s.name : `Ca ${Number(shiftIdx) + 1}`;
  }
  function incidentDisplay(r) {
    const rr = r || {};
    const def = incidentStageDef(rr.stage);
    const hours = incRound2(rr.hours);
    const timeTxt = (rr.startTime && rr.endTime)
      ? `${rr.startTime}–${rr.endTime}`
      : (hours > 0 ? `${incFmt(hours, 2)}h` : '—');
    const created = String(rr.createdAt || '').slice(0, 10);
    return {
      id: rr.id || '',
      stage: rr.stage || '',
      stageLabel: def ? def.label : String(rr.stage || '—'),
      ws: def ? def.ws : '',
      date: rr.date || '',
      dateTxt: rr.date ? formatDateDDMMYY(rr.date) : '—',
      shiftIdx: (rr.shiftIdx === 0 || rr.shiftIdx) ? Number(rr.shiftIdx) : null,
      shiftLabel: incidentShiftLabel(rr.shiftIdx),
      startTime: rr.startTime || '',
      endTime: rr.endTime || '',
      timeTxt,
      hours,
      cause: rr.cause || '',
      causeLabel: incidentCauseLabel(rr.cause),
      description: rr.description || '',
      fixAction: rr.fixAction || '',
      reporterName: rr.reporterName || '',
      note: rr.note || '',
      status: rr.status || 'cho_duyet',
      statusLabel: INCIDENT_STATUS_LABEL[rr.status] || 'Chờ duyệt',
      approvedBy: rr.approvedBy || '',
      approvedAt: String(rr.approvedAt || '').slice(0, 16).replace('T', ' '),
      rejectReason: rr.rejectReason || '',
      createdTxt: created ? formatDateDDMMYY(created) : '—'
    };
  }

  // ─── ĐẾM TRÊN NÚT THANH TIÊU ĐỀ ─────────────────────────────
  function incidentPendingCount() {
    return (state.x2IncidentReports || []).filter(r => r && r.status === 'cho_duyet').length;
  }
  function incidentApprovedCount() {
    return (state.x2IncidentReports || []).filter(r => r && r.status === 'da_duyet').length;
  }
  function incidentCardCount() {
    const pend = incidentPendingCount();
    const total = (state.x2IncidentReports || []).length;
    if (pend > 0) return `${pend} chờ duyệt`;
    if (total > 0) return `${total} phiếu`;
    return 'Chưa có';
  }
  function updateIncidentBadge() {
    const el = document.getElementById('btn-incident-count');
    if (!el) return;
    const pend = incidentPendingCount();
    el.textContent = pend > 0 ? String(pend) : String((state.x2IncidentReports || []).length);
    el.classList.toggle('is-pending', pend > 0);
    el.title = pend > 0
      ? `${pend} phiếu sự cố đang chờ duyệt`
      : `${(state.x2IncidentReports || []).length} phiếu sự cố đã ghi`;
  }

  // ─── FORM: ĐIỀN LỰA CHỌN + LÀM MỚI ──────────────────────────
  let incidentEditId = '';
  // Bộ lọc (thuần phiên — mở lại form là nhớ tháng đang xem)
  const incidentFilter = { month: incTodayISO().slice(0, 7), stage: 'all', status: 'all', q: '' };

  function fillIncidentFormOptions() {
    const sel = document.getElementById('inc-stage');
    if (sel) {
      const cur = sel.value;
      const opt = s => `<option value="${s.key}">${escapeHTML(s.label)}</option>`;
      const x2 = INCIDENT_STAGES.filter(s => s.ws === 'x2' && !s.say);
      const say = INCIDENT_STAGES.filter(s => s.say);
      const x1 = INCIDENT_STAGES.filter(s => s.ws === 'x1');
      sel.innerHTML = `<optgroup label="Xưởng 2">${x2.map(opt).join('')}</optgroup>`
        + `<optgroup label="Than Hóa + Sấy">${say.map(opt).join('')}</optgroup>`
        + `<optgroup label="Xưởng 1">${x1.map(opt).join('')}</optgroup>`;
      if (cur && INCIDENT_STAGES.some(s => s.key === cur)) sel.value = cur;
    }
    const cs = document.getElementById('inc-cause');
    if (cs && (!cs.options || !cs.options.length)) {
      cs.innerHTML = INCIDENT_CAUSES.map(c => `<option value="${c.key}">${escapeHTML(c.label)}</option>`).join('');
    }
    const fStage = document.getElementById('inc-filter-stage');
    if (fStage) {
      const cur = fStage.value || incidentFilter.stage || 'all';
      fStage.innerHTML = '<option value="all">Tất cả công đoạn</option>'
        + INCIDENT_STAGES.map(s => `<option value="${s.key}">${escapeHTML(s.label)}</option>`).join('');
      fStage.value = cur;
    }
    syncIncidentShiftOptions();
  }
  // Ca lấy từ Cài Đặt Ca bộ phận Xưởng 2 (bộ phận để "Hành chính" vẫn chọn được ca dự phòng)
  function syncIncidentShiftOptions() {
    const sel = document.getElementById('inc-shift');
    if (!sel) return;
    const cur = sel.value;
    let names = [];
    try {
      const cfg = hrShiftCfg('Xưởng 2');
      names = ((cfg && cfg.shifts) || []).map(s => s && s.name ? s.name : '');
    } catch (e) { names = []; }
    if (!names.length) names = ['Ca 1', 'Ca 2'];
    sel.innerHTML = '<option value="">— Chưa rõ ca —</option>'
      + names.map((n, i) => `<option value="${i}">${escapeHTML(n || ('Ca ' + (i + 1)))}</option>`).join('');
    if (cur) sel.value = cur;
  }
  function incidentFormUserName() {
    const u = state.currentUser || {};
    return String(u.displayName || u.fullName || u.name || u.username || '').trim();
  }
  function resetIncidentForm() {
    incidentEditId = '';
    fillIncidentFormOptions();
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('inc-date', incTodayISO());
    setVal('inc-shift', '');
    setVal('inc-start', '');
    setVal('inc-end', '');
    setVal('inc-hours', '');
    setVal('inc-cause', 'may_hong');
    setVal('inc-desc', '');
    setVal('inc-fix', '');
    setVal('inc-note', '');
    setVal('inc-reporter', incidentFormUserName());
    const banner = document.getElementById('inc-edit-banner');
    if (banner) banner.hidden = true;
    const btn = document.getElementById('btn-inc-save');
    if (btn) btn.innerHTML = '<i data-lucide="save"></i> Lưu Phiếu';
  }

  // ─── MỞ / ĐÓNG MODAL ────────────────────────────────────────
  function openIncidentReports(prefill) {
    const modal = document.getElementById('modal-x2-incidents');
    if (!modal) return false;
    fillIncidentFormOptions();
    resetIncidentForm();
    if (prefill && prefill.stage) {
      const st = document.getElementById('inc-stage');
      if (st) st.value = prefill.stage;
      const dEl = document.getElementById('inc-date');
      if (dEl && prefill.date) dEl.value = prefill.date;
      if (prefill.shiftIdx != null) {
        const sh = document.getElementById('inc-shift');
        if (sh) sh.value = String(prefill.shiftIdx);
      }
      if (prefill.date) incidentFilter.month = String(prefill.date).slice(0, 7);
    }
    const fm = document.getElementById('inc-filter-month');
    if (fm) fm.value = incidentFilter.month;
    renderIncidentReports();
    modal.classList.add('show');
    initLucide();
    return true;
  }
  // Mở form điền sẵn công đoạn + ngày (bấm nút "＋ Báo cáo" trên thẻ ngày)
  function openIncidentReportsFor(stage, date, shiftIdx) {
    return openIncidentReports({ stage, date, shiftIdx });
  }
  function closeIncidentReports() {
    const modal = document.getElementById('modal-x2-incidents');
    if (modal) modal.classList.remove('show');
    return true;
  }


  // ─── LƯU PHIẾU (TẠO MỚI / SỬA) ──────────────────────────────
  function incidentFormValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value == null ? '' : el.value).trim() : '';
  }
  function handleIncidentSubmit() {
    if (!requireEditPermission()) return false;
    const stage = incidentFormValue('inc-stage');
    const def = incidentStageDef(stage);
    if (!def) { showToast('Chọn công đoạn bị sự cố!', 'error'); return false; }
    const date = incidentFormValue('inc-date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showToast('Chọn ngày xảy ra sự cố (dd/mm/yyyy)!', 'error'); return false; }
    const startTime = incidentFormValue('inc-start');
    const endTime = incidentFormValue('inc-end');
    let hours = Number(incidentFormValue('inc-hours').replace(',', '.'));
    if (!Number.isFinite(hours) || hours <= 0) {
      const fromTimes = incidentHoursFromTimes(startTime, endTime);
      if (fromTimes != null && fromTimes > 0) hours = fromTimes;
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      showToast('Nhập SỐ GIỜ sự cố (hoặc giờ bắt đầu – kết thúc)!', 'error');
      return false;
    }
    if (hours > 24) { showToast('Số giờ sự cố tối đa 24 giờ!', 'error'); return false; }
    const shiftRaw = incidentFormValue('inc-shift');
    const shiftIdx = shiftRaw === '' ? null : Number(shiftRaw);
    const now = new Date().toISOString();
    const patch = {
      stage,
      date,
      shiftIdx: Number.isFinite(shiftIdx) ? shiftIdx : null,
      startTime,
      endTime,
      hours: incRound2(hours),
      cause: incidentFormValue('inc-cause') || 'khac',
      description: incidentFormValue('inc-desc'),
      fixAction: incidentFormValue('inc-fix'),
      reporterName: incidentFormValue('inc-reporter') || incidentFormUserName(),
      note: incidentFormValue('inc-note'),
      updatedAt: now
    };
    state.x2IncidentReports = Array.isArray(state.x2IncidentReports) ? state.x2IncidentReports : [];
    let saved = null;
    if (incidentEditId) {
      const idx = state.x2IncidentReports.findIndex(r => r && r.id === incidentEditId);
      if (idx < 0) { showToast('Không tìm thấy phiếu cần sửa (có thể đã bị xoá).', 'error'); resetIncidentForm(); return false; }
      const old = state.x2IncidentReports[idx];
      // Sửa phiếu ĐÃ DUYỆT = sửa số giờ đang trừ vào hiệu suất → chỉ BQL/Admin
      if (old.status === 'da_duyet' && !canApproveLeave()) {
        showToast('Phiếu đã duyệt — chỉ Quản Trị / Ban Quản Lý được sửa. Hãy báo BQL mở lại phiếu.', 'error');
        return false;
      }
      saved = Object.assign({}, old, patch);
      state.x2IncidentReports[idx] = saved;
    } else {
      const id = `x2inc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      saved = Object.assign({
        id,
        status: 'cho_duyet',
        createdBy: incidentFormUserName(),
        createdAt: now,
        approvedBy: '',
        approvedAt: '',
        rejectReason: ''
      }, patch);
      state.x2IncidentReports.push(saved);
    }
    saveX2IncidentReports();
    resetIncidentForm();
    renderIncidentReports();
    try { renderAll(); } catch (e) { /* không chặn việc lưu phiếu */ }
    const d = incidentDisplay(saved);
    showToast(d.status === 'da_duyet'
      ? `Đã lưu phiếu ĐÃ DUYỆT: ${d.hours}h ${d.stageLabel} ngày ${d.dateTxt} — giờ sự cố của công đoạn đổi theo.`
      : `Đã lưu phiếu ${d.hours}h ${d.stageLabel} ngày ${d.dateTxt} — CHỜ DUYỆT (chưa trừ vào hiệu suất).`,
      'success');
    return true;
  }


  // ─── SỬA / XOÁ / DUYỆT / TỪ CHỐI / MỞ LẠI ──────────────────
  function editIncidentReport(id) {
    const r = (state.x2IncidentReports || []).find(x => x && x.id === id);
    if (!r) return false;
    if (!requireEditPermission()) return false;
    if (r.status === 'da_duyet' && !canApproveLeave()) {
      showToast('Phiếu đã duyệt — chỉ Quản Trị / Ban Quản Lý được sửa.', 'error');
      return false;
    }
    incidentEditId = id;
    fillIncidentFormOptions();
    const setVal = (eid, v) => { const el = document.getElementById(eid); if (el) el.value = v; };
    setVal('inc-stage', r.stage || '');
    setVal('inc-date', r.date || '');
    setVal('inc-shift', (r.shiftIdx == null) ? '' : String(r.shiftIdx));
    setVal('inc-start', r.startTime || '');
    setVal('inc-end', r.endTime || '');
    setVal('inc-hours', r.hours != null ? String(r.hours) : '');
    setVal('inc-cause', r.cause || 'khac');
    setVal('inc-desc', r.description || '');
    setVal('inc-fix', r.fixAction || '');
    setVal('inc-reporter', r.reporterName || '');
    setVal('inc-note', r.note || '');
    const banner = document.getElementById('inc-edit-banner');
    if (banner) {
      banner.hidden = false;
      banner.textContent = `Đang SỬA phiếu ${incidentStageLabel(r.stage)} ngày ${formatDateDDMMYY(r.date)} (${INCIDENT_STATUS_LABEL[r.status] || 'Chờ duyệt'})`;
    }
    const btn = document.getElementById('btn-inc-save');
    if (btn) btn.innerHTML = '<i data-lucide="save"></i> Cập Nhật Phiếu';
    const modal = document.getElementById('modal-x2-incidents');
    if (modal) modal.classList.add('show');
    initLucide();
    return true;
  }
  function deleteIncidentReport(id) {
    const list = state.x2IncidentReports || [];
    const idx = list.findIndex(x => x && x.id === id);
    if (idx < 0) return false;
    const r = list[idx];
    if (!requireEditPermission()) return false;
    if (r.status === 'da_duyet' && !canApproveLeave()) {
      showToast('Phiếu đã duyệt — chỉ Quản Trị / Ban Quản Lý được xoá.', 'error');
      return false;
    }
    const d = incidentDisplay(r);
    if (typeof confirm === 'function' && !confirm(
      `Xoá phiếu sự cố ${d.hours}h · ${d.stageLabel} · ${d.dateTxt}?\n`
      + (d.status === 'da_duyet'
        ? `⚠ Phiếu ĐÃ DUYỆT — xoá xong giờ sự cố của ${d.stageLabel} ngày ${d.dateTxt} TRẢ VỀ như trước (hiệu suất có thể tăng).`
        : 'Phiếu chưa duyệt nên không ảnh hưởng hiệu suất.')
    )) return false;
    list.splice(idx, 1);
    try { trackDeleted('x2IncidentReports', id); } catch (e) { /* tombstone không chặn */ }
    if (incidentEditId === id) resetIncidentForm();
    saveX2IncidentReports();
    renderIncidentReports();
    try { renderAll(); } catch (e) { /* bỏ qua */ }
    showToast(`Đã xoá phiếu sự cố ${d.stageLabel} ngày ${d.dateTxt}.`, 'info');
    return true;
  }
  // DUYỆT — cổng canApproveLeave() (Admin / Ban Quản Lý), giống phiếu Kho
  function approveIncidentReport(id) {
    const r = (state.x2IncidentReports || []).find(x => x && x.id === id);
    if (!r) return false;
    if (!canApproveLeave()) { showToast('Chỉ Quản Trị / Ban Quản Lý duyệt được phiếu sự cố!', 'error'); return false; }
    if (r.status === 'da_duyet') return false;
    r.status = 'da_duyet';
    r.approvedBy = incidentFormUserName();
    r.approvedAt = new Date().toISOString();
    r.rejectReason = '';
    r.updatedAt = r.approvedAt;
    saveX2IncidentReports();
    renderIncidentReports();
    try { renderAll(); } catch (e) { /* bỏ qua */ }
    const d = incidentDisplay(r);
    showToast(`Đã DUYỆT ${d.hours}h sự cố ${d.stageLabel} ngày ${d.dateTxt} → tự trừ vào công suất/hiệu suất của công đoạn.`, 'success');
    return true;
  }
  function rejectIncidentReport(id) {
    const r = (state.x2IncidentReports || []).find(x => x && x.id === id);
    if (!r) return false;
    if (!canApproveLeave()) { showToast('Chỉ Quản Trị / Ban Quản Lý từ chối được phiếu sự cố!', 'error'); return false; }
    let reason = '';
    if (typeof prompt === 'function') {
      reason = String(prompt('Lý do từ chối phiếu sự cố (không bắt buộc):', r.rejectReason || '') || '');
    }
    r.status = 'tu_choi';
    r.rejectReason = reason;
    r.approvedBy = incidentFormUserName();
    r.approvedAt = new Date().toISOString();
    r.updatedAt = r.approvedAt;
    saveX2IncidentReports();
    renderIncidentReports();
    try { renderAll(); } catch (e) { /* bỏ qua */ }
    showToast('Đã TỪ CHỐI phiếu sự cố — phiếu không trừ vào hiệu suất.', 'info');
    return true;
  }
  function reopenIncidentReport(id) {
    const r = (state.x2IncidentReports || []).find(x => x && x.id === id);
    if (!r) return false;
    if (!canApproveLeave()) { showToast('Chỉ Quản Trị / Ban Quản Lý mở lại được phiếu sự cố!', 'error'); return false; }
    if (r.status === 'cho_duyet') return false;
    const d = incidentDisplay(r);
    if (typeof confirm === 'function' && !confirm(
      `Mở lại phiếu ${d.stageLabel} ngày ${d.dateTxt} về trạng thái CHỜ DUYỆT?\n`
      + `Giờ sự cố ${d.hours}h đang trừ vào hiệu suất sẽ được TRẢ VỀ ngay.`
    )) return false;
    r.status = 'cho_duyet';
    r.approvedBy = '';
    r.approvedAt = '';
    r.updatedAt = new Date().toISOString();
    saveX2IncidentReports();
    renderIncidentReports();
    try { renderAll(); } catch (e) { /* bỏ qua */ }
    showToast('Đã mở lại phiếu — chờ duyệt lại (giờ sự cố đã trả về).', 'info');
    return true;
  }


  // ─── LỌC + VẼ DANH SÁCH (THẺ NGÀY) ──────────────────────────
  function incidentFilteredRows() {
    const q = incNorm(incidentFilter.q);
    return incidentReportList().filter(r => {
      const d = incidentDisplay(r);
      if (incidentFilter.month && String(d.date || '').slice(0, 7) !== incidentFilter.month) return false;
      if (incidentFilter.stage !== 'all' && d.stage !== incidentFilter.stage) return false;
      if (incidentFilter.status !== 'all' && d.status !== incidentFilter.status) return false;
      if (!q) return true;
      return incNorm([d.stageLabel, d.causeLabel, d.description, d.fixAction, d.reporterName, d.dateTxt, d.note].join(' ')).includes(q);
    });
  }
  function incidentStatusChip(d) {
    const cls = d.status === 'da_duyet' ? 'is-ok' : (d.status === 'tu_choi' ? 'is-no' : 'is-wait');
    return `<span class="inc-st ${cls}">${escapeHTML(d.statusLabel)}</span>`;
  }
  function incidentRowActions(d) {
    const canApp = (() => { try { return canApproveLeave(); } catch (e) { return false; } })();
    const id = escapeHTML(d.id);
    const perm = `data-perm="${d.ws || 'x2'}"`;
    const btns = [];
    if (d.status !== 'da_duyet') {
      btns.push(`<button type="button" class="btn btn-outline btn-icon btn-sm" data-inc-act="edit" data-inc-id="${id}" ${perm} title="Sửa phiếu"><i data-lucide="pencil"></i></button>`);
    }
    if (d.status === 'cho_duyet' && canApp) {
      btns.push(`<button type="button" class="btn btn-success btn-icon btn-sm" data-inc-act="approve" data-inc-id="${id}" title="DUYỆT — giờ sự cố tự trừ vào công đoạn"><i data-lucide="check"></i></button>`);
      btns.push(`<button type="button" class="btn btn-outline btn-icon btn-sm" data-inc-act="reject" data-inc-id="${id}" title="Từ chối phiếu"><i data-lucide="x"></i></button>`);
    }
    if (d.status === 'da_duyet' && canApp) {
      btns.push(`<button type="button" class="btn btn-outline btn-icon btn-sm" data-inc-act="reopen" data-inc-id="${id}" title="Mở lại về CHỜ DUYỆT (trả giờ sự cố về)"><i data-lucide="undo-2"></i></button>`);
    }
    if (d.status !== 'da_duyet' || canApp) {
      btns.push(`<button type="button" class="btn btn-outline btn-icon btn-sm" data-inc-act="del" data-inc-id="${id}" ${perm} title="Xoá phiếu"><i data-lucide="trash-2"></i></button>`);
    }
    return `<div class="inc-actions">${btns.join('')}</div>`;
  }
  function renderIncidentStats() {
    const el = document.getElementById('inc-stats');
    if (!el) return;
    const rows = incidentFilteredRows().map(incidentDisplay);
    if (!rows.length) { el.textContent = 'Chưa có phiếu sự cố trong kỳ đang lọc.'; return; }
    const ap = rows.filter(d => d.status === 'da_duyet');
    const pe = rows.filter(d => d.status === 'cho_duyet');
    const rj = rows.filter(d => d.status === 'tu_choi');
    el.textContent = `${rows.length} phiếu · Đã duyệt ${incFmt(ap.reduce((s, d) => s + d.hours, 0), 2)}h (${ap.length})`
      + ` · Chờ duyệt ${incFmt(pe.reduce((s, d) => s + d.hours, 0), 2)}h (${pe.length})`
      + (rj.length ? ` · Từ chối ${rj.length}` : '');
  }


  function incidentDayCardHtml(date, rows) {
    const ds = rows.map(incidentDisplay);
    const approvedH = incRound2(ds.filter(d => d.status === 'da_duyet').reduce((s, d) => s + d.hours, 0));
    const pendingH = incRound2(ds.filter(d => d.status === 'cho_duyet').reduce((s, d) => s + d.hours, 0));
    const stages = [...new Set(ds.map(d => d.stageLabel))];
    const head = `<div class="x2-day-head inc-day-head">
      <span class="x2-day-date"><i data-lucide="calendar-days"></i> ${escapeHTML(formatDateDDMMYY(date))}</span>
      <span class="inc-day-sum">${ds.length} phiếu · Đã duyệt <strong>${incFmt(approvedH, 2)}h</strong>${pendingH > 0 ? ` · Chờ <strong>${incFmt(pendingH, 2)}h</strong>` : ''}</span>
      <span class="inc-day-stages" title="${escapeHTML(stages.join(', '))}">${escapeHTML(stages.slice(0, 3).join(' · '))}${stages.length > 3 ? ` +${stages.length - 3}` : ''}</span>
    </div>`;
    const body = ds.map(d => `<tr class="inc-row inc-row-${d.status}">
      <td class="inc-td-stage"><strong>${escapeHTML(d.stageLabel)}</strong>${d.note ? `<span class="inc-sub">${escapeHTML(d.note)}</span>` : ''}</td>
      <td>${escapeHTML(d.shiftLabel)}</td>
      <td class="inc-td-time">${escapeHTML(d.timeTxt)}</td>
      <td class="inc-td-hours"><strong>${incFmt(d.hours, 2)}h</strong></td>
      <td>${escapeHTML(d.causeLabel)}</td>
      <td class="inc-td-desc">${escapeHTML(d.description || '—')}${d.fixAction ? `<span class="inc-sub">Xử lý: ${escapeHTML(d.fixAction)}</span>` : ''}</td>
      <td>${escapeHTML(d.reporterName || '—')}</td>
      <td>${incidentStatusChip(d)}${d.status === 'da_duyet' && d.approvedBy ? `<span class="inc-sub">${escapeHTML(d.approvedBy)}${d.approvedAt ? ' · ' + escapeHTML(d.approvedAt) : ''}</span>` : ''}${d.status === 'tu_choi' && d.rejectReason ? `<span class="inc-sub">Lý do: ${escapeHTML(d.rejectReason)}</span>` : ''}</td>
      <td>${incidentRowActions(d)}</td>
    </tr>`).join('');
    return `<div class="x2-day-card inc-day-card">
      ${head}
      <div class="inc-table-scroll">
        <table class="inc-table">
          <thead><tr>
            <th>Công đoạn</th><th>Ca</th><th>Giờ</th><th>Số giờ</th><th>Loại sự cố</th>
            <th>Mô tả / Xử lý</th><th>Người báo</th><th>Trạng thái</th><th>Thao tác</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
  }
  function renderIncidentList() {
    const box = document.getElementById('inc-list-area');
    if (!box) return;
    const rows = incidentFilteredRows();
    if (!rows.length) {
      box.innerHTML = `<div class="inc-empty"><i data-lucide="inbox"></i> Chưa có phiếu sự cố nào khớp bộ lọc.<br><span>Lập phiếu ở khối ① rồi bấm "Lưu Phiếu"; duyệt xong là giờ sự cố tự trừ vào công đoạn tương ứng.</span></div>`;
      initLucide();
      return;
    }
    const byDate = new Map();
    rows.forEach(r => {
      const d = String(r.date || '');
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(r);
    });
    const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
    box.innerHTML = dates.map(dt => incidentDayCardHtml(dt, byDate.get(dt))).join('');
    initLucide();
  }


  // Vẽ toàn bộ modal (đồng bộ ô lọc từ trạng thái phiên rồi mới vẽ danh sách)
  function renderIncidentReports() {
    const setIf = (id, v) => { const el = document.getElementById(id); if (el && el.value !== v) el.value = v; };
    setIf('inc-filter-month', incidentFilter.month);
    setIf('inc-filter-stage', incidentFilter.stage);
    setIf('inc-filter-status', incidentFilter.status);
    setIf('inc-search', incidentFilter.q);
    renderIncidentStats();
    renderIncidentList();
    updateIncidentBadge();
    return true;
  }
  function readIncidentFilters() {
    const g = (id) => { const el = document.getElementById(id); return el ? String(el.value || '') : ''; };
    incidentFilter.month = g('inc-filter-month');
    incidentFilter.stage = g('inc-filter-stage') || 'all';
    incidentFilter.status = g('inc-filter-status') || 'all';
    incidentFilter.q = g('inc-search');
  }
  function onIncidentFiltersChange() {
    readIncidentFilters();
    renderIncidentStats();
    renderIncidentList();
    return true;
  }
  // Đổi giờ bắt đầu / kết thúc → tự điền Số giờ
  function syncIncidentHoursFromTimes() {
    const h = incidentHoursFromTimes(incidentFormValue('inc-start'), incidentFormValue('inc-end'));
    if (h != null && h > 0) {
      const el = document.getElementById('inc-hours');
      if (el) el.value = String(h);
    }
    return h;
  }
  // Uỷ nhiệm click trong danh sách (Duyệt / Từ chối / Mở lại / Sửa / Xoá)
  function onIncidentReportsClick(e) {
    const t = e && e.target;
    if (!t || typeof t.closest !== 'function') return false;
    const btn = t.closest('[data-inc-act]');
    if (!btn) return false;
    const act = btn.getAttribute('data-inc-act');
    const id = btn.getAttribute('data-inc-id');
    if (act === 'edit') return editIncidentReport(id);
    if (act === 'del') return deleteIncidentReport(id);
    if (act === 'approve') return approveIncidentReport(id);
    if (act === 'reject') return rejectIncidentReport(id);
    if (act === 'reopen') return reopenIncidentReport(id);
    return false;
  }
  // Uỷ nhiệm click cho CHIP trong thẻ ngày (mở đúng phiếu / lập phiếu mới điền sẵn)
  function onIncidentChipClick(e) {
    const t = e && e.target;
    if (!t || typeof t.closest !== 'function') return false;
    const nb = t.closest('[data-inc-new]');
    if (nb) {
      const raw = String(nb.getAttribute('data-inc-new') || '');
      const [stage, date] = raw.split('|');
      if (stage) { openIncidentReportsFor(stage, date); return true; }
    }
    const op = t.closest('[data-inc-open]');
    if (op) {
      const raw = String(op.getAttribute('data-inc-open') || '');
      const [stage, date] = raw.split('|');
      if (stage) {
        incidentFilter.stage = stage;
        incidentFilter.status = 'all';
        if (date) incidentFilter.month = String(date).slice(0, 7);
        openIncidentReportsFor(stage, date);
        return true;
      }
    }
    return false;
  }

  // ─── EXPORT (main.js nạp lúc boot · events.js nối sự kiện · test dùng) ──
  export {
    INCIDENT_STAGES, INCIDENT_CAUSES, INCIDENT_STATUS_LABEL, INCIDENT_STATUS_ORDER,
    incidentStageLabel, incidentStageDef, incidentCauseLabel, incidentHoursFromTimes,
    loadX2IncidentReports, saveX2IncidentReports, incidentReportList, incidentDisplay,
    incidentShiftLabel, incidentPendingCount, incidentApprovedCount, incidentCardCount,
    updateIncidentBadge,
    fillIncidentFormOptions, syncIncidentShiftOptions, resetIncidentForm,
    openIncidentReports, openIncidentReportsFor, closeIncidentReports,
    handleIncidentSubmit, editIncidentReport, deleteIncidentReport,
    approveIncidentReport, rejectIncidentReport, reopenIncidentReport,
    incidentFilteredRows, renderIncidentReports, renderIncidentList, renderIncidentStats,
    readIncidentFilters, onIncidentFiltersChange, syncIncidentHoursFromTimes,
    onIncidentReportsClick, onIncidentChipClick,
    incTodayISO, incidentFilter
  };

