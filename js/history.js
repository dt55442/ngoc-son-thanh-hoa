// ═══════════════════════════════════════════════════════════
// js/history.js — LỊCH SỬ SỬA ĐỔI (AUDIT LOG) — CHỈ ADMIN XEM
// ───────────────────────────────────────────────────────────
// Tự động ghi lại "ai đã sửa gì, ở tab nào, lúc nào" mỗi lần một
// tab lưu dữ liệu. Cách hoạt động:
//   - Mỗi "vùng dữ liệu" (lô nan, lượt ép, nhân viên...) đăng ký
//     một ảnh chụp (snapshot JSON) từ lần lưu trước.
//   - Khi hàm save của tab được gọi, so sánh dữ liệu hiện tại với
//     snapshot trước đó → tự sinh tóm tắt: Thêm/Sửa/Xóa mục nào,
//     kèm vài trường thay đổi (giá trị cũ → mới).
//   - Giới hạn HISTORY_LIMIT dòng gần nhất (cũ nhất tự bị bỏ).
//   - Lưu localStorage + đồng bộ Firestore (đi kèm dữ liệu thường),
//     để máy nào cũng thấy được lịch sử của mọi máy.
//   - Xem: nút "Lịch Sử" trên mỗi tab (chỉ hiện với Admin) mở modal.
// ═══════════════════════════════════════════════════════════
import { getTabDef, isAdmin } from './permissions.js';
import { STORAGE_KEY_HISTORY, state } from './state.js';
import { escapeHTML, showToast } from './utils.js';

  // Icon của modal (import động lúc chạy — tránh vòng phụ thuộc module:
  // cloud.js cần đọc dữ liệu history khi so sánh snapshot đa máy)
  function historyIcons() {
    return import('./cloud.js').then(m => m.initLucide()).catch(() => {});
  }

  // Giới hạn số dòng lịch sử giữ lại (cũ nhất bị loại bớt khi vượt)
  // (xuất khẩu trong khối export cuối file)
  const HISTORY_LIMIT = 300;

  // ─── ĐĂNG KÝ VÙNG DỮ LIỆU (khóa state → tab + tên hiển thị) ──
  // Khi thêm vùng dữ liệu mới: thêm 1 dòng tại đây.
  const DOMAINS = {
    batches:           { tab: 'kanban',    label: 'Lô nan (Công đoạn)',   get: () => state.batches },
    materialRates:     { tab: 'planning',  label: 'Định mức NVL',         get: () => state.materialRates },
    planningItems:     { tab: 'planning',  label: 'Kế hoạch sản xuất',    get: () => state.planningItems },
    planningForecast:  { tab: 'planning',  label: 'Giả định kế hoạch',    get: () => state.planningForecast },
    planningStock:     { tab: 'planning',  label: 'Tồn kho (Kế hoạch)',   get: () => state.planningStock },
    pressRecords:      { tab: 'press',     label: 'Lượt ép ván',          get: () => state.pressRecords },
    pressNotes:        { tab: 'press',     label: 'Ghi chú giải trình',   get: () => state.pressNotes },
    materialRecords:   { tab: 'materials', label: 'Nhật ký nguyên liệu',  get: () => state.materialRecords },
    materialPlan:      { tab: 'materials', label: 'Kế hoạch nguyên liệu', get: () => state.materialPlan },
    qcExports:         { tab: 'qc',        label: 'Dòng xuất hàng',       get: () => state.qcExports },
    hrEmployees:       { tab: 'hr',        label: 'Nhân viên',            get: () => state.hrEmployees },
    hrLeaves:          { tab: 'hr',        label: 'Đơn nghỉ phép',        get: () => state.hrLeaves },
    hrRecruitment:     { tab: 'hr',        label: 'Nhu cầu tuyển dụng',   get: () => state.hrRecruitment },
    hrPositions:       { tab: 'hr',        label: 'Vị trí làm việc',      get: () => state.hrPositions },
    hrAttendance:      { tab: 'hr',        label: 'Chấm công & phân vị',  get: () => state.hrAttendance },
    hrCheckins:        { tab: 'hr',        label: 'Giờ máy chấm công',    get: () => state.hrCheckins },
    customCharts:      { tab: 'dashboard', label: 'Biểu đồ Dashboard',    get: () => state.customCharts }
  };

  // Tab trong dropdown của modal: các tab dữ liệu + Dashboard
  const HISTORY_TABS = [
    { id: 'kanban', name: 'Công Đoạn (Kanban)' },
    { id: 'planning', name: 'Kế Hoạch Sản Xuất' },
    { id: 'press', name: 'Sản Lượng Ép Ván' },
    { id: 'materials', name: 'Nguyên Liệu' },
    { id: 'qc', name: 'QC — Xuất Hàng' },
    { id: 'hr', name: 'Nhân Sự' },
    { id: 'dashboard', name: 'Dashboard (Biểu đồ)' }
  ];

  // ─── SNAPSHOT (so sánh lần lưu này với lần lưu trước) ─────────
  const lastSnapshots = new Map(); // key → JSON string

  function snapshotOf(key) {
    const dom = DOMAINS[key];
    if (!dom) return '[]';
    try { return JSON.stringify(dom.get() ?? []); }
    catch (e) { return '[]'; }
  }

  // Cập nhật toàn bộ snapshot mà KHÔNG ghi log (dùng sau nạp file /
  // gộp mây / khôi phục — những thay đổi hàng loạt không phải thao tác sửa)
  function syncHistorySnapshots() {
    for (const key of Object.keys(DOMAINS)) lastSnapshots.set(key, snapshotOf(key));
  }

  // ─── NẠP / LƯU LỊCH SỬ ────────────────────────────────────────
  function loadHistory() {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        state.history = Array.isArray(parsed) ? parsed : [];
      } catch (e) { state.history = []; }
    } else {
      state.history = [];
    }
  }

  function saveHistoryLocal() {
    try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history || [])); } catch (e) {}
  }

  // Khởi động: nạp lịch sử + lập snapshot nền (gọi 1 lần lúc mở app,
  // sau khi toàn bộ load*() đã xong — để lần sửa đầu tiên là so được)
  function initHistory() {
    loadHistory();
    syncHistorySnapshots();
  }

  // ─── BỘ TÓM TẮT THAY ĐỔI (DIFF) ──────────────────────────────
  // Các trường "nhiễu" — bỏ qua khi so sánh & khi hiển thị chi tiết
  const NOISE_KEYS = new Set(['updatedAt', 'createdAt', 'thumb']);
  function truncateStr(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // Tên nhận dạng ngắn của 1 bản ghi (mã lô / tên / sản phẩm / ngày...)
  function recLabel(r) {
    if (!r || typeof r !== 'object') return '?';
    const primary = r.code || r.name || r.title || r.product || r.productName || r.employeeName
      || (r.type && (r.from || r.date) ? `${r.type} ${r.from || r.date}` : '');
    if (primary) return truncateStr(primary, 42);
    // Không có tên: ghép ngày + mã bản ghi để phân biệt các mục cùng ngày
    const fallback = [r.date || r.from || r.week, r.id ? '#' + r.id : ''].filter(Boolean).join(' ');
    return truncateStr(fallback || '?', 42);
  }

  // Giá trị 1 trường để so sánh: ảnh nguyên liệu chỉ so SỐ LƯỢNG (tránh
  // báo "sửa" khi máy tự chuyển ảnh dataURL cũ sang kho ảnh)
  function fieldVal(r, k) {
    if (k === 'images') return String(Array.isArray(r[k]) ? r[k].length : 0);
    return JSON.stringify(r[k] ?? null);
  }

  // Bản ghi rút gọn để so sánh (bỏ trường nhiễu)
  function cleanRecord(r) {
    if (!r || typeof r !== 'object') return {};
    const out = {};
    for (const k of Object.keys(r)) {
      if (NOISE_KEYS.has(k)) continue;
      out[k] = k === 'images' ? (Array.isArray(r[k]) ? r[k].length : 0) : r[k];
    }
    return out;
  }

  // Danh sách/dict từ chuỗi JSON (an toàn)
  function parseArr(json) { try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function parseObj(json) { try { const v = JSON.parse(json); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; } catch (e) { return {}; } }

  // Ghép danh sách nhãn: "A, B, C (+N mục khác)"
  function joinLabels(labels) {
    const head = labels.slice(0, 3).join(', ');
    return labels.length > 3 ? `${head} (+${labels.length - 3} mục khác)` : head;
  }

  // Diff 2 danh sách bản ghi có id → tóm tắt tiếng Việt
  function diffArraySummary(beforeJson, nowJson) {
    const before = parseArr(beforeJson), now = parseArr(nowJson);
    const bMap = new Map(), nMap = new Map();
    before.forEach(r => { if (r && r.id) bMap.set(r.id, r); });
    now.forEach(r => { if (r && r.id) nMap.set(r.id, r); });
    const added   = [...nMap.keys()].filter(id => !bMap.has(id));
    const removed = [...bMap.keys()].filter(id => !nMap.has(id));
    const changed = [...nMap.keys()].filter(id => {
      if (!bMap.has(id)) return false;
      return JSON.stringify(cleanRecord(nMap.get(id))) !== JSON.stringify(cleanRecord(bMap.get(id)));
    });
    if (!added.length && !removed.length && !changed.length) return null;

    let action = 'edit';
    if (added.length && !removed.length && !changed.length) action = 'add';
    else if (removed.length && !added.length && !changed.length) action = 'delete';
    else if ((added.length || removed.length) && (added.length + removed.length) >= Math.max(1, changed.length) * 5) action = 'import';

    const parts = [];
    if (added.length)   parts.push(`Thêm ${added.length} mục: ` + joinLabels(added.map(id => recLabel(nMap.get(id)))));
    if (removed.length) parts.push(`Xóa ${removed.length} mục: ` + joinLabels(removed.map(id => recLabel(bMap.get(id)))));
    // Chi tiết sửa: tối đa 3 bản ghi × 2 trường "trường: cũ → mới"
    if (changed.length) {
      const details = [];
      for (const id of changed.slice(0, 3)) {
        const b = cleanRecord(bMap.get(id)), n = cleanRecord(nMap.get(id));
        const keys = [...new Set([...Object.keys(b), ...Object.keys(n)])].filter(k => fieldVal(b, k) !== fieldVal(n, k));
        const fieldTxt = keys.slice(0, 2).map(k => {
          let oldV = '', newV = '';
          try { oldV = truncateStr(String(JSON.parse(fieldVal(b, k)) ?? ''), 24); } catch (e) { oldV = '?'; }
          try { newV = truncateStr(String(JSON.parse(fieldVal(n, k)) ?? ''), 24); } catch (e) { newV = '?'; }
          return `${k}: ${oldV} → ${newV}`;
        }).join('; ');
        details.push(`${recLabel(nMap.get(id))}${fieldTxt ? ` (${fieldTxt})` : ''}`);
      }
      parts.push(`Sửa ${changed.length} mục: ` + joinLabels(details));
    }
    return { action, detail: parts.join(' • ') };
  }

  // Diff dict lồng nhau (planningForecast / planningStock / materialPlan)
  // planningForecast: { năm: { tuần: { nanKey: số } } }, materialPlan: { tuần: { vị trí: số } }
  function diffDictSummary(beforeJson, nowJson) {
    const b = parseObj(beforeJson), n = parseObj(nowJson);
    const lines = [];
    const keys = [...new Set([...Object.keys(b), ...Object.keys(n)])];
    for (const k of keys) {
      const bv = (b[k] && typeof b[k] === 'object') ? b[k] : {};
      const nv = (n[k] && typeof n[k] === 'object') ? n[k] : {};
      const subKeys = [...new Set([...Object.keys(bv), ...Object.keys(nv)])];
      if (!subKeys.length) continue;
      const addedS   = subKeys.filter(s => !(s in bv) && nv[s] !== undefined && nv[s] !== null && nv[s] !== '' && nv[s] !== 0);
      const removedS = subKeys.filter(s => (s in bv) && !(s in nv));
      const changedS = subKeys.filter(s => (s in bv) && (s in nv) && JSON.stringify(bv[s]) !== JSON.stringify(nv[s]));
      if (!addedS.length && !removedS.length && !changedS.length) continue;
      const bits = [];
      if (addedS.length)   bits.push(`thêm ${addedS.map(s => `${s}=${nv[s]}`).join(', ')}`);
      if (removedS.length) bits.push(`xóa ${removedS.join(', ')}`);
      if (changedS.length) bits.push(changedS.slice(0, 4).map(s => `${s}: ${bv[s]} → ${nv[s]}`).join(', '));
      lines.push(`${k} (${truncateStr(bits.join('; '), 90)})`);
      if (lines.length >= 5) { lines.push('(+vùng dữ liệu khác)'); break; }
    }
    if (!lines.length) return null;
    return { action: 'edit', detail: 'Cập nhật: ' + lines.join(' • ') };
  }

  // ─── GHI LOG KHI TAB LƯU DỮ LIỆU ─────────────────────────────
  // Gọi trong hàm save của từng tab với danh sách khóa vùng dữ liệu
  // vừa lưu. Không ghi gì khi không có khác biệt thật sự.
  function logDataChange(keys) {
    if (!Array.isArray(keys) || !keys.length) return;
    const u = state.currentUser;
    const newEntries = [];
    for (const key of keys) {
      const dom = DOMAINS[key];
      if (!dom) continue;
      const now = snapshotOf(key);
      const before = lastSnapshots.get(key);
      lastSnapshots.set(key, now);
      if (before === undefined || before === now) continue; // chưa có nền so sánh hoặc không đổi
      const isDict = key === 'planningForecast' || key === 'planningStock' || key === 'materialPlan';
      const res = isDict ? diffDictSummary(before, now) : diffArraySummary(before, now);
      if (!res) continue;
      const ts = Date.now();
      newEntries.push({
        id: 'hs-' + ts.toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        ts,
        createdAt: new Date(ts).toISOString(), // khớp cách gộp theo dấu thời gian của mây
        user: (u && (u.fullname || u.username)) || 'Khách (chưa đăng nhập)',
        email: (u && u.email) || '',
        role: (u && u.role) || '',
        tab: dom.tab,
        tabName: (getTabDef(dom.tab) && getTabDef(dom.tab).name) || dom.tab,
        domain: key,
        domainLabel: dom.label,
        action: res.action,
        detail: res.detail
      });
    }
    if (!newEntries.length) return;
    state.history = [...(state.history || []), ...newEntries];
    if (state.history.length > HISTORY_LIMIT) state.history = state.history.slice(-HISTORY_LIMIT);
    saveHistoryLocal();
    // LƯU Ý: không tự gọi firePushSync() — hàm save của từng tab đã gọi
    // ngay sau logDataChange() nên lịch sử đi kèm dữ liệu thường khi đồng bộ.
  }

  // ─── MODAL XEM LỊCH SỬ (CHỈ ADMIN) ────────────────────────────
  let historyView = { tab: 'all', user: 'all' };

  function historyActionLabel(a) {
    return { add: 'Thêm', edit: 'Sửa', delete: 'Xóa', import: 'Nạp dữ liệu' }[a] || 'Lưu';
  }

  function fmtHistoryTime(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function openHistoryModal(tabId) {
    if (!isAdmin()) { showToast('Lịch sử sửa đổi chỉ dành cho Quản Trị (Admin)!', 'error'); return; }
    historyView = { tab: tabId || 'all', user: 'all' };
    populateHistoryFilters();
    renderHistoryList();
    document.getElementById('modal-history')?.classList.add('show');
    historyIcons();
  }

  function closeHistoryModal() {
    document.getElementById('modal-history')?.classList.remove('show');
  }

  // Đổi bộ lọc từ dropdown trong modal (gọi từ events.js)
  function setHistoryTabFilter(tabId) {
    historyView.tab = tabId || 'all';
    renderHistoryList();
  }
  function setHistoryUserFilter(user) {
    historyView.user = user || 'all';
    renderHistoryList();
  }

  function populateHistoryFilters() {
    const tabSel = document.getElementById('history-tab-filter');
    const userSel = document.getElementById('history-user-filter');
    if (tabSel) {
      tabSel.innerHTML = '<option value="all">Tất cả các tab</option>' + HISTORY_TABS
        .map(t => `<option value="${t.id}"${historyView.tab === t.id ? ' selected' : ''}>${escapeHTML(t.name)}</option>`)
        .join('');
      tabSel.value = historyView.tab;
      if (!tabSel.value) tabSel.value = 'all';
    }
    if (userSel) {
      const users = [...new Set((state.history || []).map(h => h.user).filter(Boolean))];
      userSel.innerHTML = '<option value="all">Tất cả người dùng</option>' + users
        .map(nm => `<option value="${escapeHTML(nm)}"${historyView.user === nm ? ' selected' : ''}>${escapeHTML(nm)}</option>`)
        .join('');
      userSel.value = historyView.user;
      if (!userSel.value) userSel.value = 'all';
    }
  }

  function renderHistoryList() {
    const box = document.getElementById('history-list');
    if (!box) return;
    const all = (state.history || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const rows = all.filter(h =>
      (historyView.tab === 'all' || h.tab === historyView.tab) &&
      (historyView.user === 'all' || h.user === historyView.user));
    const tabName = historyView.tab === 'all' ? 'Tất cả các tab' : ((HISTORY_TABS.find(t => t.id === historyView.tab) || {}).name || historyView.tab);
    const titleEl = document.getElementById('history-modal-title');
    if (titleEl) titleEl.innerHTML = `<i data-lucide="history"></i> Lịch Sử Thay Đổi — ${escapeHTML(tabName)}`;

    if (!rows.length) {
      box.innerHTML = `<div class="history-empty"><i data-lucide="inbox"></i><p>Chưa có lịch sử thay đổi nào${historyView.tab !== 'all' ? ' cho tab này' : ''}.</p><p class="history-empty-sub">Mỗi lần ai đó sửa dữ liệu và tab được lưu, thao tác sẽ được ghi lại tại đây (tối đa ${HISTORY_LIMIT} dòng gần nhất).</p></div>`;
      historyIcons();
      return;
    }
    box.innerHTML = rows.map(h => `
      <div class="history-row">
        <span class="history-time">${fmtHistoryTime(h.ts || 0)}</span>
        <span class="history-badge hb-${escapeHTML(h.action || 'edit')}">${historyActionLabel(h.action)}</span>
        <div class="history-main">
          <div class="history-line1">
            <span class="history-user"><i data-lucide="user"></i> ${escapeHTML(h.user || '?')}</span>
            <span class="history-domain">${escapeHTML(h.domainLabel || '')}</span>
          </div>
          <div class="history-detail">${escapeHTML(h.detail || '')}</div>
        </div>
      </div>`).join('');
    historyIcons();
  }

  // Xóa lịch sử của tab đang chọn (hoặc toàn bộ) — chỉ Admin
  function clearHistory() {
    if (!isAdmin()) return;
    const scope = historyView.tab === 'all'
      ? 'toàn bộ lịch sử'
      : `lịch sử của tab "${(HISTORY_TABS.find(t => t.id === historyView.tab) || {}).name || historyView.tab}"`;
    if (!confirm(`Xóa ${scope}? Thao tác này không thể hoàn tác.`)) return;
    state.history = historyView.tab === 'all' ? [] : (state.history || []).filter(h => h.tab !== historyView.tab);
    saveHistoryLocal();
    renderHistoryList();
    showToast('Đã xóa ' + scope + '!', 'success');
  }

export {
  HISTORY_LIMIT,
  clearHistory,
  closeHistoryModal,
  initHistory,
  logDataChange,
  openHistoryModal,
  renderHistoryList,
  setHistoryTabFilter,
  setHistoryUserFilter,
  syncHistorySnapshots
};
