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

  // ─── TOAST NOTIFICATIONS ──────────────────────────────────────
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

export {
  calculateStageDays,
  calculateVolume,
  escapeHTML,
  formatDateDDMMYY,
  generateBatchCodeYYMMDD,
  getBatchStageHistory,
  getHistoryEntryDays,
  getISOWeekString,
  getStageDaysClass,
  getStageDaysLabel,
  setupFormCalculations,
  showToast,
  validateBatchInput
};
