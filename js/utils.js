// ═══════════════════════════════════════════════════════════
// js/utils.js — tách từ app.js (refactor ES-modules phase 1)
// ═══════════════════════════════════════════════════════════
import { initLucide } from './cloud.js';
import { state } from './state.js';

  // ─── HELPERS ──────────────────────────────────────────────────
  function formatDateDDMMYY(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
    return dateString;
  }

  function generateBatchCodeYYMMDD(dateString) {
    if (!dateString) dateString = new Date().toISOString().split('T')[0];
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const prefix = `${parts[0].slice(-2)}${parts[1]}${parts[2]}`;
      const count = state.batches.filter(b => b.code && b.code.startsWith(prefix)).length + 1;
      return `${prefix}-${String(count).padStart(2, '0')}`;
    }
    return `26${Math.floor(Math.random() * 899999 + 100000)}`;
  }

  function getISOWeekString(dateString) {
    if (!dateString) return 'Tuần 1';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Tuần 1';
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return `Tuần ${Math.ceil((((d - yearStart) / 86400000) + 1) / 7)}`;
  }

  function calculateVolume(length, width, thickness, quantity) {
    const l = parseFloat(length) || 0, w = parseFloat(width) || 0,
          t = parseFloat(thickness) || 0, q = parseInt(quantity) || 0;
    return Math.round((l * w * t / 1000000000) * q * 10000) / 10000;
  }

  function escapeHTML(str) {
    if (!str) return '';
    const A = String.fromCharCode(38);
    const L = String.fromCharCode(60);
    const G = String.fromCharCode(62);
    const Q = String.fromCharCode(34);
    const S = String.fromCharCode(39);
    const AMP = A + 'amp;';
    const LT  = A + 'lt;';
    const GT  = A + 'gt;';
    const QUOT = A + 'quot;';
    return String(str)
      .split(A).join(AMP)
      .split(L).join(LT)
      .split(G).join(GT)
      .split(Q).join(QUOT)
      .split(S).join(A + '#039;');
  }

  // ─── ĐẾM NGÀY TỰ ĐỘNG THEO TỪNG CÔNG ĐOẠN ────────────────────
  // Đếm số ngày từ ngày nhập/chuyển công đoạn đến ngày kết thúc (hoặc hôm nay nếu không có endDate)
  function calculateStageDays(dateString, endDateString) {
    if (!dateString) return 0;
    const start = new Date(dateString + 'T00:00:00');
    const end = endDateString ? new Date(endDateString + 'T00:00:00') : new Date();
    end.setHours(0, 0, 0, 0);
    if (isNaN(start.getTime())) return 0;
    const diff = Math.floor((end - start) / 86400000);
    return Math.max(0, diff);
  }

  function getStageDaysLabel(dateString, endDateString) {
    const days = calculateStageDays(dateString, endDateString);
    if (days === 0) return 'Hôm nay';
    if (days === 1) return '1 ngày';
    return `${days} ngày`;
  }

  // Lịch sử các mốc công đoạn của một lô nan
  function getBatchStageHistory(batch) {
    if (batch.stageHistory && batch.stageHistory.length > 0) return batch.stageHistory;
    // Dữ liệu cũ chưa có history -> coi như được tạo ở công đoạn hiện tại
    return [{ stage: batch.stage, date: batch.date }];
  }

  // Tính số ngày tại một công đoạn trong lịch sử
  // (từ ngày vào công đoạn đến ngày vào công đoạn kế tiếp, hoặc đến hôm nay nếu là công đoạn hiện tại)
  function getHistoryEntryDays(history, index) {
    if (!history || !history[index]) return 0;
    const nextEntry = history[index + 1];
    return calculateStageDays(history[index].date, nextEntry ? nextEntry.date : null);
  }

  // Màu cảnh báo theo công đoạn & số ngày (Bào Tinh & Kho không cảnh báo màu)
  function getStageDaysClass(stage, days) {
    if (stage === 'bao_tinh' || stage === 'kho') return '';
    if (stage === 'say1') {
      if (days >= 15) return 'days-danger';    // từ 15 ngày: đỏ
      if (days >= 10) return '';                // 10-14 ngày: xanh (mặc định)
      return 'days-warning';                    // 0-9 ngày: vàng
    }
    if (stage === 'say2') {
      if (days >= 15) return 'days-danger';     // từ 15 ngày: đỏ
      return 'days-warning';                    // 0-14 ngày: vàng
    }
    return '';
  }

  // ─── VALIDATION KHI NHẬP ──────────────────────────────────────
  function validateBatchInput() {
    const code = (document.getElementById('form-code')?.value || '').trim();
    const lengthVal = parseFloat(document.getElementById('form-length')?.value);
    const widthVal  = parseFloat(document.getElementById('form-width')?.value);
    const thicknessVal = parseFloat(document.getElementById('form-thickness')?.value);
    const quantityVal  = parseInt(document.getElementById('form-quantity')?.value);
    const location = (document.getElementById('form-location')?.value || '').trim();
    const dateVal = document.getElementById('form-date')?.value;

    if (!code) { showToast('Mã lô nan không được để trống!', 'error'); return false; }
    if (!/^\d{6}-\d{2}$/.test(code)) { showToast('Mã lô phải đúng định dạng YYMMDD-NN (VD: 260816-01)!', 'error'); return false; }
    if (!dateVal) { showToast('Ngày tạo/nhập không được để trống!', 'error'); return false; }
    if (!location) { showToast('Vị trí không được để trống!', 'error'); return false; }
    if (!lengthVal || lengthVal <= 0) { showToast('Chiều dài (Dài) phải lớn hơn 0!', 'error'); return false; }
    if (!widthVal || widthVal <= 0) { showToast('Chiều rộng (Rộng) phải lớn hơn 0!', 'error'); return false; }
    if (!thicknessVal || thicknessVal <= 0) { showToast('Độ dày (Dày) phải lớn hơn 0!', 'error'); return false; }
    if (!quantityVal || quantityVal <= 0) { showToast('Số lượng phải lớn hơn 0!', 'error'); return false; }
    return true;
  }

  // ─── FORM VOLUME CALCULATION ──────────────────────────────────
  function setupFormCalculations() {
    const lInput   = document.getElementById('form-length');
    const wInput   = document.getElementById('form-width');
    const tInput   = document.getElementById('form-thickness');
    const qInput   = document.getElementById('form-quantity');
    const volDisp  = document.getElementById('form-calculated-vol');
    function updateVol() {
      const vol = calculateVolume(lInput?.value, wInput?.value, tInput?.value, qInput?.value);
      if (volDisp) volDisp.textContent = `${vol.toFixed(4)} m³`;
    }
    [lInput, wInput, tInput, qInput].forEach(inp => { if (inp) inp.addEventListener('input', updateVol); });
  }

  // ─── NGÀY VÀO CÔNG ĐOẠN (THỰC TẾ) ─────────────────────────────
  // Ngày lô BẮT ĐẦU ở một công đoạn, theo thứ tự ưu tiên:
  //   1) ngày thực tế người dùng khai báo (say2Date / khoDate / baoTinhDate)
  //   2) mốc CUỐI cùng của công đoạn đó trong stageHistory (lô có thể qua đi quay lại)
  //   3) ngày tạo lô (fallback: lô nhập trực tiếp ở công đoạn đó / dữ liệu cũ)
  // Dùng cho thống kê theo tuần & xuất Excel theo công đoạn.
  function getBatchStageEntryDate(batch, stage) {
    if (!batch) return '';
    if (!stage || stage === 'say1') return batch.date || '';
    const overrideKey = stage === 'say2' ? 'say2Date' : stage === 'kho' ? 'khoDate' : stage === 'bao_tinh' ? 'baoTinhDate' : null;
    if (overrideKey && batch[overrideKey]) return batch[overrideKey];
    const entries = (Array.isArray(batch.stageHistory) ? batch.stageHistory : []).filter(h => h && h.stage === stage && h.date);
    if (entries.length) return entries[entries.length - 1].date;
    return batch.date || '';
  }

  // ─── ĐỊNH DẠNG NGÀY dd/mm/yyyy CHO Ô CHỌN NGÀY ────────────────
  // Ô <input type="date"> hiển thị theo ngôn ngữ trình duyệt (thường mm/dd/yyyy).
  // Bộ này phủ một ô chữ dd/mm/yyyy LÊN TRƯỚC ô gốc (ô gốc ẩn đi nhưng vẫn giữ
  // nguyên id + giá trị ISO 'YYYY-MM-DD'), nên toàn bộ logic cũ đọc/ghi .value,
  // lắng nghe 'change'… hoạt động như cũ, còn người dùng nhìn & gõ dd/mm/yyyy.
  const pad2 = n => String(n).padStart(2, '0');

  function isoToDmy(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }

  function dmyToIso(str) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(str || '').trim());
    if (!m) return '';
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return '';
    return `${y}-${pad2(mo)}-${pad2(d)}`;
  }

  function fireInputEvent(el, type) {
    try { el.dispatchEvent(new Event(type, { bubbles: true })); } catch (e) { /* môi trường thử nghiệm không có Event */ }
  }

  function enhanceVnDateInput(input) {
    if (!input || input.dataset.vnDate === '1') return;
    const parent = input.parentNode;
    if (!parent || typeof parent.insertBefore !== 'function' || typeof document.createElement !== 'function') return;
    input.dataset.vnDate = '1';

    // Ô chữ hiển thị dd/mm/yyyy cho người dùng
    const txt = document.createElement('input');
    txt.type = 'text';
    txt.id = input.id ? `${input.id}-vn` : '';
    txt.className = input.className || '';
    txt.style.cssText = input.style.cssText || '';
    txt.inputMode = 'numeric';
    txt.autocomplete = 'off';
    txt.placeholder = 'dd/mm/yyyy';
    // required chuyển sang ô chữ (ô gốc ẩn, trình duyệt không focus được để báo lỗi)
    if (input.required) { txt.required = true; input.removeAttribute('required'); }

    parent.insertBefore(txt, input);
    // Ẩn ô gốc NHƯNG vẫn giữ nó được bốc dàn trang (position:fixed, out-of-flow):
    // nếu dùng display:none thì input.showPicker() KHÔNG có điểm neo → bảng lịch
    // bị trình duyệt (Chrome/Edge) đẩy lên góc trên-trái màn hình, rất bất tiện.
    // Ô gốc trong suốt + không nhận chuột; trước khi mở picker sẽ được neo đúng
    // vị trí ô chữ (xem openNativePicker bên dưới).
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '0px';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    input.style.zIndex = '-1';

    const syncTextFromNative = () => {
      const d = isoToDmy(input.value);
      if (txt.value !== d) txt.value = d;
    };

    // Code khác gán .value cho ô gốc (VD: mở modal điền sẵn) → ô chữ tự cập nhật
    try {
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && desc.set) {
        Object.defineProperty(input, 'value', {
          configurable: true,
          get() { return desc.get.call(input); },
          set(v) { desc.set.call(input, v); const d = isoToDmy(v); if (txt.value !== d) txt.value = d; }
        });
      }
    } catch (e) { /* không ghi đè được thì vẫn chạy qua listener change */ }

    // Người dùng gõ/sửa → ghi ngày chuẩn vào ô gốc + bắn sự kiện cho logic cũ
    txt.addEventListener('input', () => {
      const raw = txt.value.replace(/[^0-9/]/g, '');
      if (raw !== txt.value) txt.value = raw;
      const trimmed = txt.value.trim();
      if (trimmed === '') { input.value = ''; fireInputEvent(input, 'change'); fireInputEvent(input, 'input'); return; }
      const iso = dmyToIso(txt.value);
      if (iso) { input.value = iso; fireInputEvent(input, 'change'); fireInputEvent(input, 'input'); }
    });
    txt.addEventListener('change', () => {
      const trimmed = txt.value.trim();
      const iso = dmyToIso(txt.value);
      if (iso) { input.value = iso; fireInputEvent(input, 'change'); }
      else if (trimmed === '') { input.value = ''; fireInputEvent(input, 'change'); }
      else { showToast('Ngày không hợp lệ — nhập theo dd/mm/yyyy!', 'error'); syncTextFromNative(); }
    });
    // Logic cũ dispatch 'change' lên ô gốc → ô chữ cập nhật theo
    input.addEventListener('change', syncTextFromNative);
    input.addEventListener('input', syncTextFromNative);
    // form.reset() đặt lại giá trị nội bộ (không qua setter) → đồng bộ sau khi reset xong
    const form = input.closest ? input.closest('form') : null;
    if (form) form.addEventListener('reset', () => setTimeout(syncTextFromNative, 0));
    // Bấm vào ô chữ → mở lịch chọn ngày của ô gốc, neo ĐÚNG vị trí ô chữ:
    // đặt ô gốc (invisible) đè lên ô chữ theo tọa độ khung nhìn rồi mới gọi
    // showPicker() — không thì lịch hiện bừa ở góc trên-trái màn hình.
    const openNativePicker = () => {
      try {
        const r = txt.getBoundingClientRect();
        input.style.left = Math.round(r.left) + 'px';
        input.style.top = Math.round(r.top) + 'px';
        input.style.width = Math.max(1, Math.round(r.width)) + 'px';
        input.style.height = Math.max(1, Math.round(r.height)) + 'px';
        if (input.showPicker) input.showPicker();
      } catch (e) { /* trình duyệt chặn */ }
    };
    txt.addEventListener('click', openNativePicker);
    txt.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); openNativePicker(); } });

    syncTextFromNative();
  }

  function initVnDateInputs(root) {
    const scope = root && root.querySelectorAll ? root : document;
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll('input[type="date"]').forEach(enhanceVnDateInput);
  }


  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast  = document.createElement('div');
    toast.className = `toast ${type}`;
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    if (type === 'error')   iconName = 'alert-triangle';
    toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    initLucide();
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ── Vuốt ngang (chuột/cảm ứng) trên canvas biểu đồ để dịch cửa sổ hiển thị ──
  // Dùng cho các biểu đồ có nhiều cột dữ liệu: chỉ vẽ 1 cửa sổ (VD 14 cột máy tính
  // / 7 cột điện thoại), vuốt trái/phải để xem các cột còn lại.
  // opts = {
  //   canDrag : () => bool   — có cần vuốt không (tổng dữ liệu > cỡ cửa sổ)
  //   getStart: () => số     — vị trí cửa sổ hiện tại (đã kẹp trong khoảng hợp lệ)
  //   setStart: (v) => void  — lưu vị trí mới (v đã qua clamp)
  //   clamp   : (v) => số    — kẹp vị trí vào [0, tổng − cỡ cửa sổ]
  //   span    : () => số     — số cột hiển thị (đổi px kéo → số cột)
  //   unit    : () => số     — số cột mỗi bước vuốt (VD 3 cột = 1 ngày; mặc định 1)
  //   onShift : () => void   — vẽ lại biểu đồ sau khi dịch
  // }
  // Trả { dragging, consumeMoved }: chặn hover & click phát sinh ngay sau vuốt.
  // Cỡ cửa sổ hiển thị mặc định theo màn hình: 14 cột máy tính / 7 cột điện thoại.
  function uiChartWinSize() {
    return (window.matchMedia && window.matchMedia('(min-width: 900px)').matches) ? 14 : 7;
  }
  function attachChartPanDrag(canvas, opts) {
    if (!canvas || !canvas.addEventListener || canvas.__panDrag) {
      return { dragging: () => false, consumeMoved: () => false };
    }
    canvas.__panDrag = true;
    if (canvas.style) canvas.style.touchAction = 'pan-y'; // ngang = vuốt biểu đồ, dọc = cuộn trang
    let active = false, startX = 0, baseStart = 0, moved = false, dragging = false;
    canvas.addEventListener('pointerdown', (e) => {
      if (!opts || typeof opts.canDrag !== 'function' || !opts.canDrag()) return;
      active = true; dragging = true;
      startX = e.clientX; baseStart = opts.getStart(); moved = false;
      if (canvas.classList) canvas.classList.add('panning');
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!active) return;
      const span = Math.max(1, (opts.span ? opts.span() : uiChartWinSize()) || 1);
      const unit = Math.max(1, (opts.unit ? opts.unit() : 1) || 1); // bước vuốt theo cột
      const colW = Math.max(1, (canvas.clientWidth || 800) / span);
      if (Math.abs(e.clientX - startX) > 6) moved = true;
      const rawTarget = baseStart + Math.round((startX - e.clientX) / (colW * unit)) * unit;
      const target = (opts.clamp ? opts.clamp : (v) => v)(rawTarget);
      if (typeof opts.getStart === 'function' && target !== opts.getStart()) {
        opts.setStart(target);
        if (opts.onShift) opts.onShift();
      }
    });
    const endDrag = () => {
      active = false; dragging = false;
      if (canvas.classList) canvas.classList.remove('panning');
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', endDrag);
    return {
      dragging: () => dragging,
      consumeMoved: () => { const m = moved; moved = false; return m; }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // KHO NAN — TÍNH TOÁN TỒN KHO + SỔ NHẬP/XUẤT (hàm thuần, chỉ đọc state)
  // Dùng chung cho: js/kanban.js (cột Kho) · js/xuong2.js (thẻ "Kho Nan") ·
  // js/planning.js (getNanStockEvents — trừ tồn kế hoạch theo phiếu ĐÃ DUYỆT).
  // Nguyên tắc:
  //   • Mỗi entry 'kho' trong stageHistory = 1 lần NHẬP kho (1 lô có thể ra/vào
  //     kho nhiều lần: lần 1 từ Sấy 1, xuất sang Sấy 2 rồi quay lại kho, ...)
  //     ⇒ Tồn của lô = (số lần nhập × quantity) − Σ phiếu xuất ĐÃ DUYỆT gắn lô,
  //     KHÔNG phải quantity − đã dùng (sai khi lô quay lại kho lần 2).
  //   • Phiếu xuất KHÔNG gắn lô (tổ trưởng khai theo tổng) → tự phân bổ FIFO:
  //     lô vào kho LÂU NHẤT trừ trước, hết mới sang lô kế tiếp.
  //   • Phiếu 'cho_duyet' KHÔNG trừ tồn — chỉ hiện chip chờ Ban lãnh đạo duyệt.
  // ═══════════════════════════════════════════════════════════

  // Nhãn tiếng Việt: mục đích xuất / nguồn xử lý / cách xử lý tồn trung gian
  const KHO_PURPOSE_LABELS = { say2: 'Sấy 2', baotinh: 'Bào Tinh', bullig: 'Bullig', khac: 'Khác' };
  const KHO_SOURCE_LABELS  = { baotinh_loi: 'Thanh lỗi Bào Tinh', bullig_loi: 'Thanh lỗi Chọn thanh Bullig', nan_loai_han: 'Nan Loại hẳn (Chọn Nan Thô)', khac: 'Khác' };
  const KHO_METHOD_LABELS  = { tieu_huy: 'Tiêu hủy', tai_che: 'Tái chế' };
  // Thứ tự cột tổng hợp theo mục đích xuất
  const KHO_PURPOSE_ORDER = ['say2', 'baotinh', 'bullig', 'khac'];
  // Nhóm Sấy 1 / Sấy 2 / Kho (khớp NAN_POOL_STAGES của js/planning.js)
  const KHO_POOL_STAGES = ['say1', 'say2', 'kho'];

  // Chuẩn hóa mục đích xuất (giá trị lạ → 'khac')
  function khoNormPurpose(p) { return ['say2', 'baotinh', 'bullig'].includes(p) ? p : 'khac'; }

  // Các entry NHẬP kho của 1 lô — MỖI entry = 1 lần vào kho
  function khoInEntriesOf(b) {
    return getBatchStageHistory(b).filter(h => h && h.stage === 'kho' && h.date);
  }
  // Số lần NHẬP kho (lô không có entry lịch sử nhưng đang ở kho → coi như 1 lần)
  function khoInCountOf(b) {
    if (!b) return 0;
    const n = khoInEntriesOf(b).length;
    return n || (b.stage === 'kho' ? 1 : 0);
  }
  function khoFirstInDateOf(b) { const e = khoInEntriesOf(b); return (e[0] && e[0].date) || b.khoDate || b.date || ''; }
  function khoLastInDateOf(b)  { const e = khoInEntriesOf(b); return (e[e.length - 1] && e[e.length - 1].date) || b.khoDate || b.date || ''; }
  // Số lần lô RA KHỎI kho (mốc 'say2' xuất hiện NGAY SAU mốc 'kho' — quay lại sấy)
  function khoOutRoundCountOf(b) {
    let out = 0, inKho = false;
    getBatchStageHistory(b).forEach(h => {
      if (!h || !h.stage) return;
      if (h.stage === 'kho') inKho = true;
      else if (h.stage === 'say2' && inKho) { out++; inKho = false; }
    });
    return out;
  }

  // Phiếu XUẤT kho ĐÃ DUYỆT — nguồn chính thức trừ tồn
  function khoApprovedXuatNotes() {
    return (state.khoNotes || []).filter(n => n && n.type === 'xuat' && n.status === 'da_duyet');
  }
  // Phiếu xử lý TỒN TRUNG GIAN ĐÃ DUYỆT (tiêu hủy / tái chế) — lọc theo nguồn nếu cần
  function khoApprovedScrapNotes(source) {
    return (state.khoNotes || []).filter(n => n && (n.type === 'tieuhuy' || n.type === 'taiche') &&
      n.status === 'da_duyet' && (!source || n.source === source));
  }

  // PHÂN BỔ FIFO số thanh xuất ĐÃ DUYỆT vào các lô đang ở Kho:
  // trả { byLot: Map(batchId → đã xuất), unallocated: phần chưa gắn được lô (thanh) }
  function khoFifoAllocation() {
    const lots = (state.batches || []).filter(b => b && b.stage === 'kho')
      .sort((a, b) => khoFirstInDateOf(a).localeCompare(khoFirstInDateOf(b)));
    const byLot = new Map(lots.map(b => [b.id, 0]));
    const cap = new Map(lots.map(b => [b.id, khoInCountOf(b) * (Number(b.quantity) || 0)]));
    let unallocated = 0;
    khoApprovedXuatNotes()
      .slice().sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')))
      .forEach(n => {
        // 1) Phần phiếu GẮN LÒ tường minh → trừ đúng lô đó
        (Array.isArray(n.lots) ? n.lots : []).forEach(l => {
          const id = String((l && l.batchId) || '');
          if (id && byLot.has(id)) byLot.set(id, (byLot.get(id) || 0) + (Number(l.qty) || 0));
        });
        const tagged = (Array.isArray(n.lots) ? n.lots : []).reduce((s, l) => s + (Number(l && l.qty) || 0), 0);
        // 2) Phần khai TỔNG → phân bổ FIFO (lô vào kho lâu nhất trừ trước)
        let remain = (Number(n.qty) || 0) - tagged;
        for (const b of lots) {
          if (remain <= 0) break;
          const free = Math.max(0, (cap.get(b.id) || 0) - (byLot.get(b.id) || 0));
          const take = Math.min(free, remain);
          if (take > 0) { byLot.set(b.id, (byLot.get(b.id) || 0) + take); remain -= take; }
        }
        if (remain > 0) unallocated += remain;
      });
    return { byLot, unallocated };
  }

  // Tồn THỰC của 1 lô đang ở Kho (thanh) — lô không ở kho trả 0
  function khoLotRemainingOf(b, alloc) {
    if (!b || b.stage !== 'kho') return 0;
    const a = alloc || khoFifoAllocation();
    const used = a.byLot.get(b.id) || 0;
    return Math.max(0, khoInCountOf(b) * (Number(b.quantity) || 0) - used);
  }


  // Số thanh hệ thống SUY RA đã rời kho của 1 lô (chỉ để ĐỐI CHIẾU với phiếu):
  // bào tinh (sources[].qty) + Bullig gia công (qtyIn) + mỗi lần quay lại Sấy 2 (nguyên lô)
  function khoDerivedOutOf(batchId) {
    const id = String(batchId || '');
    if (!id) return 0;
    const b = (state.batches || []).find(x => x && x.id === id);
    if (!b) return 0;
    let out = 0;
    (state.xuong2BaoTinhRecords || []).forEach(r => {
      if (!r || r.kind !== 'tinh') return;
      if (Array.isArray(r.sources) && r.sources.length) {
        r.sources.forEach(s => { if (s && String(s.batchId || '') === id) out += Number(s.qty) || 0; });
      } else if (String(r.batchId || '') === id) {
        out += (Number(r.qtyOk) || 0) + (Number(r.qtyErr) || 0);
      }
    });
    (state.xuong2BulligRecords || []).forEach(r => {
      if (!r || r.kind !== 'gc') return;
      if (String(r.batchId || '') === id) out += (r.qtyIn != null ? (Number(r.qtyIn) || 0) : (Number(r.quantity) || 0));
    });
    let inKho = false;
    getBatchStageHistory(b).forEach(h => {
      if (!h || !h.stage) return;
      if (h.stage === 'kho') inKho = true;
      else if (h.stage === 'say2' && inKho) { out += Number(b.quantity) || 0; inKho = false; }
    });
    return out;
  }

  // Tổng hợp TỒN KHO hiện tại (vật lý) + TỒN NAN TOÀN NHÓM (Sấy 1/2/Kho) + đối chiếu
  function khoStockSummary() {
    const lots = (state.batches || []).filter(b => b && b.stage === 'kho');
    const alloc = khoFifoAllocation();
    let thanh = 0, m3 = 0, live = 0, usedUp = 0;
    lots.forEach(b => {
      const used = alloc.byLot.get(b.id) || 0;
      const cap = khoInCountOf(b) * (Number(b.quantity) || 0);
      const rem = Math.max(0, cap - used);
      if (rem <= 0) { usedUp++; return; }
      live++;
      thanh += rem;
      m3 += calculateVolume(b.length, b.width, b.thickness, rem);
    });
    // Tồn THẬT (đối chiếu chéo) = Σ nhập − Σ xuất đã duyệt — dùng làm giới hạn
    // duyệt phiếu (không cho tồn âm) và phát hiện phiếu vượt sức chứa của các lô.
    const inTotal = lots.reduce((s, b) => s + khoInCountOf(b) * (Number(b.quantity) || 0), 0);
    const outTotal = khoApprovedXuatNotes().reduce((s, n) => s + (Number(n.qty) || 0), 0);
    const pending = (state.khoNotes || []).filter(n => n && n.status === 'cho_duyet');
    const pendingQty = pending.filter(n => n.type === 'xuat').reduce((s, n) => s + (Number(n.qty) || 0), 0);
    // Tồn nan TOÀN NHÓM (Sấy 1 + Sấy 2 + Kho) — con số dùng cho KẾ HOẠCH:
    // phiếu purpose 'say2' KHÔNG trừ (lô vẫn nằm trong nhóm), các purpose khác trừ.
    const pool = (state.batches || []).filter(b => b && KHO_POOL_STAGES.includes(b.stage));
    const poolIn = pool.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
    const poolOut = khoApprovedXuatNotes().filter(n => khoNormPurpose(n.purpose) !== 'say2')
      .reduce((s, n) => s + (Number(n.qty) || 0), 0);
    // ĐỐI CHIẾU theo lô: hệ thống suy ra − phiếu đã duyệt. CHỈ đếm phần DƯƠNG
    // (suy ra nhiều hơn phiếu = còn THIẾU phiếu — cần "Tạo phiếu bù"). Phần âm
    // là bình thường: nhiều phiếu xuất hợp lệ (bán, điều chuyển…) không có nguồn
    // suy ra tương ứng nên không phải là "lệch".
    let mismatch = 0;
    const mismatchLots = [];
    pool.forEach(b => {
      const d = khoDerivedOutOf(b.id) - (alloc.byLot.get(b.id) || 0);
      if (d >= 1) { mismatch += d; mismatchLots.push({ id: b.id, code: b.code || '', diff: d }); }
    });
    return {
      lots, liveLots: live, usedUpLots: usedUp,
      remainingThanh: thanh, remainingM3: m3,
      honestThanh: Math.max(0, inTotal - outTotal),
      inTotal, outTotal,
      overAlloc: Math.max(0, alloc.unallocated),
      poolLots: pool.length, poolThanh: Math.max(0, poolIn - poolOut),
      pendingCount: pending.length, pendingQty,
      mismatchThanh: mismatch, mismatchLots
    };
  }

  // Bản đồ ẨN/HIỆN lô ở cột Kho Kanban: lô tồn 0 ẨN (mặc định; state.khoShowUsed
  // = true thì hiện lại) — tránh tưởng "1 lô ra/vào kho nhiều lần" là nhiều lô.
  function khoVisibilityMap() {
    const alloc = khoFifoAllocation();
    const hide = new Set(), remain = new Map();
    (state.batches || []).forEach(b => {
      if (!b || b.stage !== 'kho') return;
      const r = khoLotRemainingOf(b, alloc);
      remain.set(b.id, r);
      if (r <= 0 && !state.khoShowUsed) hide.add(b.id);
    });
    return { hide, remain };
  }

  // ─── SỔ NHẬP/XUẤT KHO (mỗi lô có thể nhiều dòng — luôn ghi rõ LẦN) ──
  // inRows:  [{ date, lotId, code, round, qty, m3, length, width, thickness,
  //             bambooType, useFor, location }]  — mỗi entry 'kho' = 1 dòng NHẬP
  // outRows: [{ date, noteId, purpose, purposeNote, qty, m3, lotIds[], note, createdBy }]
  //          — từ phiếu XUẤT ĐÃ DUYỆT (số chính thức)
  // derived: [{ date, kind 'baotinh'|'bullig'|'say2', lotId, code, qty }]
  //          — số hệ thống suy ra (CHỈ để đối chiếu, không trừ tồn)
  function khoLedgerEvents() {
    const inRows = [], outRows = [], derived = [];
    const codeOf = id => { const b = (state.batches || []).find(x => x && x.id === id); return b ? (b.code || '') : ''; };
    (state.batches || []).forEach(b => {
      if (!b) return;
      let round = 0;
      getBatchStageHistory(b).forEach(h => {
        if (!h || h.stage !== 'kho' || !h.date) return;
        round++;
        const qty = Number(b.quantity) || 0;
        inRows.push({
          date: h.date, lotId: b.id, code: b.code || '', round, qty,
          m3: calculateVolume(b.length, b.width, b.thickness, qty),
          length: b.length, width: b.width, thickness: b.thickness,
          bambooType: b.bambooType || '', useFor: b.useFor || '', location: b.location || ''
        });
      });
      // Mỗi lần quay lại Sấy 2 (mốc 'say2' sau mốc 'kho') = 1 dòng suy ra
      let inKho = false;
      getBatchStageHistory(b).forEach(h => {
        if (!h || !h.stage) return;
        if (h.stage === 'kho') inKho = true;
        else if (h.stage === 'say2' && h.date && inKho) {
          derived.push({ date: h.date, kind: 'say2', lotId: b.id, code: b.code || '', qty: Number(b.quantity) || 0 });
          inKho = false;
        }
      });
    });
    khoApprovedXuatNotes().forEach(n => {
      outRows.push({
        date: n.date || '', noteId: n.id, purpose: khoNormPurpose(n.purpose),
        purposeNote: n.purposeNote || '', qty: Number(n.qty) || 0, m3: Number(n.m3) || 0,
        lotIds: (Array.isArray(n.lots) ? n.lots : []).map(l => String((l && l.batchId) || '')).filter(Boolean),
        note: n.note || '', createdBy: n.createdByName || n.createdBy || ''
      });
    });
    (state.xuong2BaoTinhRecords || []).forEach(r => {
      if (!r || r.kind !== 'tinh' || !r.date) return;
      const srcs = (Array.isArray(r.sources) && r.sources.length)
        ? r.sources
        : [{ batchId: r.batchId, qty: (Number(r.qtyOk) || 0) + (Number(r.qtyErr) || 0) }];
      srcs.forEach(s => {
        const id = String((s && s.batchId) || '');
        const qty = Number(s && s.qty) || 0;
        if (id && qty > 0) derived.push({ date: r.date, kind: 'baotinh', lotId: id, code: codeOf(id), qty });
      });
    });
    (state.xuong2BulligRecords || []).forEach(r => {
      if (!r || r.kind !== 'gc' || !r.date) return;
      const id = String(r.batchId || '');
      const qty = r.qtyIn != null ? (Number(r.qtyIn) || 0) : (Number(r.quantity) || 0);
      if (id && qty > 0) derived.push({ date: r.date, kind: 'bullig', lotId: id, code: codeOf(id), qty });
    });
    const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
    inRows.sort(byDateDesc); outRows.sort(byDateDesc); derived.sort(byDateDesc);
    return { inRows, outRows, derived };
  }

  // Khóa kỳ sổ: 'day' = theo ngày · 'tuan' = theo tuần ISO · 'thang' = theo tháng
  function khoPeriodKeyOf(date, mode) {
    const d = String(date || '');
    if (!d) return '';
    if (mode === 'tuan') return getISOWeekString(d);
    if (mode === 'thang') return d.slice(0, 7);
    return d;
  }

export {
  KHO_METHOD_LABELS,
  KHO_POOL_STAGES,
  KHO_PURPOSE_LABELS,
  KHO_PURPOSE_ORDER,
  KHO_SOURCE_LABELS,
  khoApprovedScrapNotes,
  khoApprovedXuatNotes,
  khoDerivedOutOf,
  khoFifoAllocation,
  khoFirstInDateOf,
  khoInCountOf,
  khoInEntriesOf,
  khoLastInDateOf,
  khoLedgerEvents,
  khoLotRemainingOf,
  khoNormPurpose,
  khoOutRoundCountOf,
  khoPeriodKeyOf,
  khoStockSummary,
  khoVisibilityMap,
  attachChartPanDrag,
  calculateStageDays,
  calculateVolume,
  dmyToIso,
  escapeHTML,
  formatDateDDMMYY,
  generateBatchCodeYYMMDD,
  getBatchStageEntryDate,
  getBatchStageHistory,
  getHistoryEntryDays,
  getISOWeekString,
  getStageDaysClass,
  getStageDaysLabel,
  initVnDateInputs,
  isoToDmy,
  setupFormCalculations,
  showToast,
  uiChartWinSize,
  validateBatchInput
};
