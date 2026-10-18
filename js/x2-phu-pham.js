// ═══════════════════════════════════════════════════════════
// js/x2-phu-pham.js — THẺ "PHỤ PHẨM & BĂM" (Xưởng 2 — Giai đoạn 2/3)
// ═══════════════════════════════════════════════════════════
// Phụ phẩm = phần KHÔNG lên xe / KHÔNG thành ống:
//   • NGỌN + hao hụt (ước tính) từ Bốc Luồng — `ngonKg`
//   • MẮT LUỒNG từ Cắt Chọn (xe luồng cây) — `klMatLuong`
//   • ỐNG LỖI đem BĂM từ Cắt Chọn (rejectRoute='bam') — `klOngLoi`
// PHẦN NHẬP TỰ SUY RA từ 2 bảng cũ (KHÔNG lưu trùng): sửa/xóa lượt Bốc/Cắt là
// tồn phụ phẩm tự đúng. Thẻ chỉ LƯU phần BÁN / TIÊU HỦY (kg CÂN THỰC + đơn
// giá) → doanh thu phụ phẩm, dùng TRỪ vào chi phí nguyên liệu để ra
// GIÁ THÀNH 1 KG ỐNG ĐẠT.
// Kèm theo (Giai đoạn 3): CÂN ĐỐI KHỐI LƯỢNG theo tháng · KIỂM KÊ BÃI (điều
// chỉnh tồn nhóm) · ĐỊNH MỨC TỶ LỆ thu hồi (Admin) · SỔ GIẢM TRỪ NCC.
// Khóa mới: x2PhuPhamRecords · x2Stocktakes · x2YieldRates (js/state.js).
// ═══════════════════════════════════════════════════════════
import { firePushSync, initLucide, requireEditPermission, requireRatePermission } from './cloud.js';
import { logDataChange } from './history.js';
import { STORAGE_KEY_X2_PHU_PHAM, STORAGE_KEY_X2_STOCKTAKE, STORAGE_KEY_X2_YIELD_RATE, state } from './state.js';
import { trackDeleted } from './tombstone.js';
import { escapeHTML, formatDateDDMMYY, showToast } from './utils.js';
import { x2MaterialKindOf, x2OngDatAvailable, x2PoolSnapshot, x2StocktakeAdjustment, x2TicketTotals } from './x2-pool.js';

  function storageModule() {
    return import('./storage.js').catch(() => null);
  }

  // ─── DANH MỤC NGUỒN PHỤ PHẨM + ĐƠN VỊ GHI ─────────────────────
  const PP_KINDS = [
    { id: 'ngon',    label: 'Ngọn (từ Bốc Luồng)',    short: 'Ngọn' },
    { id: 'mat',     label: 'Mắt luồng (từ Cắt Chọn)', short: 'Mắt luồng' },
    { id: 'ong_loi', label: 'Ống lỗi đem băm',         short: 'Ống lỗi' },
    { id: 'khac',    label: 'Khác',                    short: 'Khác' }
  ];
  const PP_KIND_LABEL = Object.fromEntries(PP_KINDS.map(k => [k.id, k.label]));
  const PP_KIND_SHORT = Object.fromEntries(PP_KINDS.map(k => [k.id, k.short]));
  const PP_OUT_TYPES = [
    { id: 'sale',    label: 'Bán' },
    { id: 'dispose', label: 'Tiêu hủy / cho đi' }
  ];
  const PP_OUT_TYPE_LABEL = Object.fromEntries(PP_OUT_TYPES.map(t => [t.id, t.label]));
  const PP_FORMS = [
    { id: 'raw',     label: 'Bán nguyên (chưa băm)' },
    { id: 'chipped', label: 'Băm' }
  ];
  const PP_FORM_LABEL = Object.fromEntries(PP_FORMS.map(f => [f.id, f.label]));
  const PP_POOLS = [
    { id: 'cay',      label: 'Luồng cây ở bãi' },
    { id: 'ong',      label: 'Luồng ống ở bãi' },
    { id: 'ong_dat',  label: 'Ống đạt chờ bổ' },
    { id: 'phu_pham', label: 'Phụ phẩm (ước tính)' }
  ];
  const PP_DEFAULT_YIELD = { cay: { ongDat: 88, ongLoi: 3, mat: 3 }, ong: { ongDat: 95, ongLoi: 5 } };

  const ppKg = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const ppNum = v => (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  const ppPct = v => (v == null ? '—' : `${(Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`);

  function ppTodayISO() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function ppThisMonth() { return ppTodayISO().slice(0, 7); }
  function ppMonthLabel(m) {
    if (!/^\d{4}-\d{2}$/.test(String(m || ''))) return '—';
    return `T${Number(m.slice(5))}/${m.slice(0, 4)}`;
  }
  function ppMonthRange(month) {
    const m = /^\d{4}-\d{2}$/.test(String(month || '')) ? month : ppThisMonth();
    const y = Number(m.slice(0, 4)), mo = Number(m.slice(5));
    const last = new Date(y, mo, 0).getDate();
    return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, '0')}`, month: m };
  }
  function ppInPeriod(date, from, to) {
    const d = String(date || '');
    if (!d) return false;
    return (!from || d >= from) && (!to || d <= to);
  }

  // ─── NẠP / LƯU 3 MIỀN MỚI ────────────────────────────────────
  function loadX2PhuPham() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_PHU_PHAM);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.x2PhuPhamRecords = Array.isArray(arr) ? arr : [];
      } catch (e) { state.x2PhuPhamRecords = []; }
    } else { state.x2PhuPhamRecords = []; }
  }
  function saveX2PhuPham() {
    try { localStorage.setItem(STORAGE_KEY_X2_PHU_PHAM, JSON.stringify(state.x2PhuPhamRecords || [])); }
    catch (err) { showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?). Dữ liệu sẽ thử ghi qua file/mây.', 'error'); }
    logDataChange(['x2PhuPhamRecords']);
    if (state.fileStorage.connected) storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    firePushSync();
  }
  function loadX2Stocktakes() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_STOCKTAKE);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        state.x2Stocktakes = Array.isArray(arr) ? arr : [];
      } catch (e) { state.x2Stocktakes = []; }
    } else { state.x2Stocktakes = []; }
  }
  function saveX2Stocktakes() {
    try { localStorage.setItem(STORAGE_KEY_X2_STOCKTAKE, JSON.stringify(state.x2Stocktakes || [])); }
    catch (err) { showToast('Không lưu được vào bộ nhớ máy (bộ nhớ đầy?).', 'error'); }
    logDataChange(['x2Stocktakes']);
    if (state.fileStorage.connected) storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    firePushSync();
  }
  function ppYieldNorm(obj) {
    const src = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    const out = {};
    Object.keys(PP_DEFAULT_YIELD).forEach(k => {
      out[k] = Object.assign({}, PP_DEFAULT_YIELD[k]);
      const g = (src[k] && typeof src[k] === 'object') ? src[k] : {};
      Object.keys(PP_DEFAULT_YIELD[k]).forEach(f => {
        const v = Number(g[f]);
        if (Number.isFinite(v) && v >= 0 && v <= 100) out[k][f] = v;
      });
    });
    return out;
  }
  function loadX2YieldRates() {
    const raw = localStorage.getItem(STORAGE_KEY_X2_YIELD_RATE);
    let obj = {};
    if (raw) { try { obj = JSON.parse(raw); } catch (e) { obj = {}; } }
    state.x2YieldRates = ppYieldNorm(obj);
  }
  function saveX2YieldRates() {
    try { localStorage.setItem(STORAGE_KEY_X2_YIELD_RATE, JSON.stringify(state.x2YieldRates || {})); }
    catch (err) { showToast('Không lưu được định mức tỷ lệ vào bộ nhớ máy.', 'error'); }
    logDataChange(['x2YieldRates']);
    if (state.fileStorage.connected) storageModule().then(m => m && m.writeDataToFile()).catch(() => {});
    firePushSync();
  }


  // ─── NHẬP (TỰ SUY RA) + XUẤT (ĐÃ LƯU) + TỒN + DOANH THU ─────
  function ppCutLabel(r) {
    return String((r && (r.supplierLabel || r.supplier || r.materialType)) || 'Cắt Chọn');
  }
  // PHẦN NHẬP ƯỚC TÍNH từ Bốc Luồng + Cắt Chọn trong kỳ (bỏ trống = toàn bộ)
  function x2PhuPhamInRows(from, to) {
    const rows = [];
    (state.xuong2BoluongRecords || []).forEach(r => {
      if (!r || !ppInPeriod(r.date, from, to)) return;
      const kg = Number(r.ngonKg) || 0;
      if (kg <= 0) return;
      rows.push({
        id: 'in-b-' + r.id, date: r.date || '', dir: 'in', kind: 'ngon', form: 'raw',
        kg, price: 0, amount: 0, party: '', auto: true, ref: 'Bốc Luồng',
        note: r.supplierLabel || r.materialType || ''
      });
    });
    (state.xuong2CutRecords || []).forEach(r => {
      if (!r || !r.inputKind || !ppInPeriod(r.date, from, to)) return;
      const mat = Number(r.klMatLuong) || 0;
      if (mat > 0) {
        rows.push({
          id: 'in-c-mat-' + r.id, date: r.date || '', dir: 'in', kind: 'mat', form: 'raw',
          kg: mat, price: 0, amount: 0, party: '', auto: true, ref: 'Cắt Chọn', note: ppCutLabel(r)
        });
      }
      const loi = Number(r.klOngLoi) || 0;
      if (loi > 0 && r.rejectRoute === 'bam') {
        rows.push({
          id: 'in-c-loi-' + r.id, date: r.date || '', dir: 'in', kind: 'ong_loi', form: 'chipped',
          kg: loi, price: 0, amount: 0, party: '', auto: true, ref: 'Cắt Chọn', note: ppCutLabel(r)
        });
      }
    });
    return rows;
  }
  function ppOutAmountOf(r) {
    const amount = Number(r && r.amount);
    if (Number.isFinite(amount) && amount > 0) return amount;
    return Math.round(((Number(r && r.kg) || 0) * (Number(r && r.price) || 0)) * 100) / 100;
  }
  function x2PhuPhamOutRows(from, to) {
    return (state.x2PhuPhamRecords || [])
      .filter(r => r && ppInPeriod(r.date, from, to))
      .map(r => ({
        id: r.id, date: r.date || '', dir: 'out', kind: r.kind || 'khac',
        form: r.form || 'chipped', kg: Number(r.kg) || 0, price: Number(r.price) || 0,
        amount: ppOutAmountOf(r), party: r.party || '',
        outType: r.outType === 'dispose' ? 'dispose' : 'sale',
        note: r.note || '', rec: r
      }));
  }
  // Tất cả dòng nhập + xuất (mới nhất trước; cùng ngày: NHẬP trước để dễ đọc)
  function x2PhuPhamRows(from, to) {
    return [...x2PhuPhamInRows(from, to), ...x2PhuPhamOutRows(from, to)]
      .sort((a, b) => {
        if ((b.date || '') !== (a.date || '')) return (b.date || '').localeCompare(a.date || '');
        if (a.dir !== b.dir) return a.dir === 'in' ? -1 : 1;
        return String(b.id).localeCompare(String(a.id));
      });
  }
  function x2PhuPhamInKgOf(kind) {
    return x2PhuPhamInRows().filter(r => r.kind === kind).reduce((s, r) => s + r.kg, 0);
  }
  function x2PhuPhamOutKgOf(kind) {
    return (state.x2PhuPhamRecords || [])
      .filter(r => r && (r.kind || 'khac') === kind)
      .reduce((s, r) => s + (Number(r.kg) || 0), 0);
  }
  function x2PhuPhamStock(kind) {
    return x2PhuPhamInKgOf(kind) - x2PhuPhamOutKgOf(kind);
  }
  function x2PhuPhamStockRawTotal() {
    return PP_KINDS.reduce((s, k) => s + x2PhuPhamStock(k.id), 0);
  }
  function x2PhuPhamStockTotal() {
    return Math.max(0, x2PhuPhamStockRawTotal() + x2StocktakeAdjustment('phu_pham'));
  }
  function x2PhuPhamRevenue(from, to) {
    return x2PhuPhamOutRows(from, to)
      .filter(r => r.outType === 'sale')
      .reduce((s, r) => s + r.amount, 0);
  }

  // ─── TIỀN NGUYÊN LIỆU (theo ĐƠN GIÁ PHIẾU CÂN) + GIÁ THÀNH ───
  function ppMaterialPriceOf(matId) {
    const m = (state.materialRecords || []).find(x => x.id === matId) || null;
    if (!m) return 0;
    const p = Number(m.unitPrice);
    if (Number.isFinite(p) && p > 0) return p;
    const w = Number(m.weight) || 0;
    const amt = Number(m.totalAmount) || 0;
    return w > 0 ? amt / w : 0;
  }
  // Chi phí NGUYÊN LIỆU đã dùng trong kỳ = Σ (kg lấy từ phiếu × đơn giá phiếu).
  // • Bốc Luồng: `tickets[]` (cả ngọn + thân — đã mua cả cây)
  // • Cắt Luồng ống: `tickets[]`
  // • Lô CŨ: cả khối lượng lô × đơn giá lô (bỏ qua bốc cũ của cùng lô để khỏi cộng 2 lần)
  function ppMaterialCostOf(from, to) {
    let cost = 0, kg = 0, kgNoPrice = 0;
    const legacyCutMats = new Set((state.xuong2CutRecords || [])
      .filter(r => r && !r.inputKind && r.materialId).map(r => r.materialId));
    const add = (matId, k) => {
      const w = Number(k) || 0;
      if (w <= 0) return;
      kg += w;
      const p = ppMaterialPriceOf(matId);
      if (p > 0) cost += w * p; else kgNoPrice += w;
    };
    (state.xuong2BoluongRecords || []).forEach(r => {
      if (!r || !ppInPeriod(r.date, from, to)) return;
      const alloc = Array.isArray(r.tickets) ? r.tickets : [];
      if (alloc.length) alloc.forEach(t => add(t.materialId, t.kg));
      else if (r.materialId && !legacyCutMats.has(r.materialId)) add(r.materialId, r.qty);
    });
    (state.xuong2CutRecords || []).forEach(r => {
      if (!r || !ppInPeriod(r.date, from, to)) return;
      if (r.inputKind === 'ong') {
        (Array.isArray(r.tickets) ? r.tickets : []).forEach(t => add(t.materialId, t.kg));
      } else if (!r.inputKind) {
        add(r.materialId, r.inputWeight);
      }
    });
    return { cost: Math.round(cost * 100) / 100, kg, kgNoPrice };
  }
  // Đơn giá bình quân của NCC (dùng khi phiếu không ghi đơn giá)
  function ppSupplierAvgPrice(name) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return 0;
    let w = 0, c = 0;
    (state.materialRecords || []).forEach(m => {
      if (String(m.supplier || '').trim().toLowerCase() !== key) return;
      const ww = Number(m.weight) || 0;
      w += ww; c += ww * ppMaterialPriceOf(m.id);
    });
    return w > 0 ? c / w : 0;
  }
  // GIẢM TRỪ NCC: mỗi lượt Cắt có Ống lỗi trả NCC (rejectRoute='tra_ncc') → 1 dòng.
  function ppCreditPriceOf(rec) {
    const alloc = Array.isArray(rec.tickets) ? rec.tickets : [];
    let kg = 0, cost = 0;
    alloc.forEach(t => {
      const k = Number(t.kg) || 0;
      kg += k; cost += k * ppMaterialPriceOf(t.materialId);
    });
    if (kg > 0 && cost > 0) return cost / kg;
    return ppSupplierAvgPrice(rec.supplier);
  }
  function x2SupplierCreditRows(from, to) {
    return (state.xuong2CutRecords || [])
      .filter(r => r && r.rejectRoute === 'tra_ncc' && (Number(r.returnedKg) || 0) > 0 && ppInPeriod(r.date, from, to))
      .map(r => {
        const kg = Number(r.returnedKg) || 0;
        const price = ppCreditPriceOf(r);
        return {
          id: 'cr-' + r.id, date: r.date || '', cutId: r.id,
          supplier: r.supplierLabel || r.supplier || '—',
          kg, price, amount: Math.round(kg * price * 100) / 100
        };
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }
  function x2SupplierCreditTotal(from, to) {
    return x2SupplierCreditRows(from, to).reduce((s, r) => s + r.amount, 0);
  }
  // GIÁ THÀNH 1 KG ỐNG ĐẠT = (Tiền NL − Doanh thu phụ phẩm − Giảm trừ NCC) ÷ kg ống đạt
  function x2CostingData(from, to) {
    const mat = ppMaterialCostOf(from, to);
    const revenue = x2PhuPhamRevenue(from, to);
    const credit = x2SupplierCreditTotal(from, to);   // ống lỗi trả lại → giảm tiền mua
    let ongDat = 0;
    (state.xuong2CutRecords || []).forEach(r => {
      if (!r || !ppInPeriod(r.date, from, to)) return;
      ongDat += Number(r.klOngLuong) || 0;
    });
    const net = Math.round((mat.cost - revenue - credit) * 100) / 100;
    return {
      materialCost: mat.cost, kgUsed: mat.kg, kgNoPrice: mat.kgNoPrice,
      revenue, credit, netCost: net, ongDat: Math.round(ongDat * 100) / 100,
      costPerKg: ongDat > 0 && mat.cost > 0 ? Math.round((net / ongDat) * 100) / 100 : null,
      hasPrice: mat.cost > 0
    };
  }

  function x2PhuPhamSoldKg(from, to) {
    return x2PhuPhamOutRows(from, to)
      .filter(r => r.outType === 'sale')
      .reduce((s, r) => s + r.kg, 0);
  }
  function x2PhuPhamCardCount() {
    const kg = x2PhuPhamStockTotal();
    if (kg > 0) return `Tồn ${ppKg(kg)} kg`;
    const n = (state.x2PhuPhamRecords || []).length;
    return n ? `${n} lượt bán` : 'Chưa ghi';
  }


  // ─── CÂN ĐỐI KHỐI LƯỢNG THEO KỲ ────────────────────────────
  function x2MassBalanceData(from, to) {
    const inRange = arr => (arr || []).filter(r => r && ppInPeriod(r.date, from, to));
    const sumBy = (arr, f) => arr.reduce((s, r) => s + (Number(f(r)) || 0), 0);
    let intakeCay = 0, intakeOng = 0;
    (state.materialRecords || []).forEach(m => {
      if (!m || m.location !== 'xuong-2' || !ppInPeriod(m.date, from, to)) return;
      const w = Number(m.weight) || 0;
      const kind = x2MaterialKindOf(m.type);
      if (kind === 'cay') intakeCay += w;
      else if (kind === 'ong') intakeOng += w;
    });
    const bocs = inRange(state.xuong2BoluongRecords);
    const bocIn = sumBy(bocs, r => r.inputWeight);
    const bocOut = sumBy(bocs, r => r.qty);
    const bocLoss = sumBy(bocs, r => r.ngonKg);

    const cuts = inRange(state.xuong2CutRecords);
    const cartCuts = cuts.filter(r => r.inputKind === 'cart');
    const ongCuts = cuts.filter(r => r.inputKind === 'ong');
    const legacyCuts = cuts.filter(r => !r.inputKind);
    const cartIn = sumBy(cartCuts, r => r.inputWeight);
    const cartDat = sumBy(cartCuts, r => r.klOngLuong);
    const cartLoi = sumBy(cartCuts, r => r.klOngLoi);
    const cartMat = sumBy(cartCuts, r => r.klMatLuong);
    const cartLoss = Math.max(0, cartIn - cartDat - cartLoi - cartMat);
    const ongIn = sumBy(ongCuts, r => r.inputWeight);
    const ongDat = sumBy(ongCuts, r => r.klOngLuong);
    const ongLoi = sumBy(ongCuts, r => r.klOngLoi);
    const ongLoss = Math.max(0, ongIn - ongDat - ongLoi);
    const legIn = sumBy(legacyCuts, r => r.inputWeight);
    const legDat = sumBy(legacyCuts, r => r.klOngLuong);
    const legLoss = Math.max(0, legIn - legDat);

    const bo = inRange(state.xuong2BoOngRecords);
    const boIn = sumBy(bo, r => r.inputOng);
    const boDat = sumBy(bo, r => r.klOngBo);
    const boLoi = sumBy(bo, r => r.klOngLoai);

    const pct = (a, b) => (b > 0 ? (a / b) * 100 : null);
    const y = state.x2YieldRates || PP_DEFAULT_YIELD;
    return {
      intakeCay, intakeOng,
      boc: { in: bocIn, out: bocOut, loss: bocLoss },
      cart: { in: cartIn, dat: cartDat, loi: cartLoi, mat: cartMat, loss: cartLoss },
      ong: { in: ongIn, dat: ongDat, loi: ongLoi, loss: ongLoss },
      legacy: { in: legIn, dat: legDat, loss: legLoss },
      bo: { in: boIn, dat: boDat, loi: boLoi },
      pool: x2PoolSnapshot(null),
      yields: {
        cart: { ongDat: pct(cartDat, cartIn), ongLoi: pct(cartLoi, cartIn), mat: pct(cartMat, cartIn), target: y.cay || PP_DEFAULT_YIELD.cay },
        ong: { ongDat: pct(ongDat, ongIn), ongLoi: pct(ongLoi, ongIn), target: y.ong || PP_DEFAULT_YIELD.ong }
      }
    };
  }

  // ─── KIỂM KÊ BÃI ─────────────────────────────────────────────
  // Tồn sổ lấy ĐÚNG số đang hiện (đã gồm các điều chỉnh trước) — nhờ vậy
  // diff của phiếu mới = thực − sổ hiện tại, cộng dồn vẫn đúng.
  function ppPoolBookKg(pool) {
    if (pool === 'cay') return x2TicketTotals('cay').kg;
    if (pool === 'ong') return x2TicketTotals('ong').kg;
    if (pool === 'ong_dat') return x2OngDatAvailable();
    return x2PhuPhamStockTotal();
  }
  function x2StocktakeRows() {
    return [...(state.x2Stocktakes || [])]
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }


  // ─── TRẠNG THÁI UI (thuần phiên; kỳ tháng đang xem) ──────────
  let ppMonth = ppThisMonth();
  function setPpMonth(v) {
    const m = /^\d{4}-\d{2}$/.test(String(v || '')) ? String(v) : ppThisMonth();
    ppMonth = m;
    renderPpStats(); renderPpCost(); renderPpBalance(); renderPpCredit();
  }

  // ─── THANH TỒN (trên cùng thẻ) ───────────────────────────────
  function renderPpStockBar() {
    const bar = document.getElementById('x2-pp-stock-bar');
    if (!bar) return;
    const total = x2PhuPhamStockTotal();
    const adj = x2StocktakeAdjustment('phu_pham');
    const chips = PP_KINDS.map(k => {
      const v = x2PhuPhamStock(k.id);
      return `<span class="x2-pp-chip" title="${escapeHTML(k.label)} — tồn ước tính (chưa trừ điều chỉnh kiểm kê)"><i data-lucide="leaf"></i> ${escapeHTML(k.short)}: <strong>${ppKg(Math.max(0, v))}</strong> kg</span>`;
    }).join('');
    bar.innerHTML = `
      <span class="x2-stock-title" title="Tồn phụ phẩm = phần NHẬP ước tính từ Bốc/Cắt − phần đã BÁN/TIÊU HỦY − điều chỉnh kiểm kê">
        <i data-lucide="recycle"></i> Tồn phụ phẩm (ước tính): <strong>${ppKg(total)} kg</strong>
      </span>
      ${chips}
      ${adj ? `<span class="x2-pp-adj" title="Tổng chênh lệch các phiếu kiểm kê bãi (âm = thiếu so với sổ)">Điều chỉnh kiểm kê: <strong>${adj > 0 ? '+' : ''}${ppKg(adj)} kg</strong></span>` : ''}`;
    initLucide();
  }

  // ─── THỐNG KÊ THÁNG ─────────────────────────────────────────
  function renderPpStats() {
    const box = document.getElementById('x2-pp-stats');
    if (!box) return;
    const m = ppMonthRange(ppMonth);
    const soldKg = x2PhuPhamSoldKg(m.from, m.to);
    const revenue = x2PhuPhamRevenue(m.from, m.to);
    const outN = x2PhuPhamOutRows(m.from, m.to).length;
    const total = x2PhuPhamStockTotal();
    const stat = (value, label, title) => `<div class="material-stat"${title ? ` title="${escapeHTML(title)}"` : ''}>
      <span class="material-stat-value">${value}</span>
      <span class="material-stat-label">${label}</span></div>`;
    box.innerHTML = [
      stat(ppKg(total), 'Tồn phụ phẩm (kg)', 'Ngọn + mắt + ống lỗi đem băm − đã bán/tiêu hủy − điều chỉnh kiểm kê'),
      stat(ppKg(soldKg), `Đã bán ${ppMonthLabel(ppMonth)} (kg)`),
      stat(ppNum(revenue), `Doanh thu ${ppMonthLabel(ppMonth)} (đ)`),
      stat(outN, 'Lượt bán / tiêu hủy trong tháng'),
      stat(ppKg(x2PhuPhamInKgOf('ngon')), 'Ngọn nhập (kg, ước tính)'),
      stat(ppKg(x2PhuPhamInKgOf('mat') + x2PhuPhamInKgOf('ong_loi')), 'Mắt + ống lỗi băm (kg)')
    ].join('');
  }


  // ─── GIÁ THÀNH ỐNG ĐẠT (kỳ tháng) ───────────────────────────
  function renderPpCost() {
    const box = document.getElementById('x2-pp-cost');
    if (!box) return;
    const m = ppMonthRange(ppMonth);
    const c = x2CostingData(m.from, m.to);
    const money = v => `${ppNum(v)} đ`;
    const warn = c.kgNoPrice > 0
      ? `<div class="x2-pp-warn" title="Các phiếu cân chưa nhập đơn giá sẽ không được tính vào tiền nguyên liệu">⚠ ${ppKg(c.kgNoPrice)} kg nguyên liệu CHƯA có đơn giá — giá thành đang thấp hơn thực tế.</div>`
      : '';
    box.innerHTML = `
      <div class="x2-pp-cost-head">
        <strong>Giá thành ống đạt — ${ppMonthLabel(ppMonth)}</strong>
        <span class="x2-pp-cost-sub">(Tiền nguyên liệu − doanh thu phụ phẩm − giảm trừ NCC) ÷ kg ống đạt</span>
      </div>
      <div class="material-stats">
        <div class="material-stat" title="Σ kg lấy từ phiếu cân × đơn giá phiếu (Bốc + Cắt luồng ống + lô cũ)"><span class="material-stat-value">${c.materialCost ? money(c.materialCost) : '—'}</span><span class="material-stat-label">Tiền nguyên liệu (đ)</span></div>
        <div class="material-stat" title="Doanh thu bán phụ phẩm trong tháng (phần đã cân thực)"><span class="material-stat-value" style="color:#16a34a;">${money(c.revenue)}</span><span class="material-stat-label">Doanh thu phụ phẩm (đ)</span></div>
        <div class="material-stat" title="Giá trị ống lỗi TRẢ LẠI nhà cung cấp (trừ vào tiền mua nguyên liệu)"><span class="material-stat-value" style="color:#b45309;">${money(c.credit)}</span><span class="material-stat-label">Giảm trừ NCC (đ)</span></div>
        <div class="material-stat" title="Chi phí thực = tiền nguyên liệu − doanh thu phụ phẩm − giảm trừ NCC"><span class="material-stat-value">${c.materialCost ? money(c.netCost) : '—'}</span><span class="material-stat-label">Chi phí thực (đ)</span></div>
        <div class="material-stat" title="Tổng KL ống đạt của các lượt Cắt Chọn trong tháng"><span class="material-stat-value">${ppKg(c.ongDat)}</span><span class="material-stat-label">Ống đạt trong tháng (kg)</span></div>
        <div class="material-stat" title="GIÁ THÀNH 1 KG ỐNG ĐẠT = chi phí thực ÷ kg ống đạt"><span class="material-stat-value" style="color:#7c3aed;">${c.costPerKg != null ? `${ppNum(c.costPerKg)} đ/kg` : '—'}</span><span class="material-stat-label">Giá thành 1 kg ống đạt</span></div>
      </div>
      ${warn}
      <p class="x2-pp-note">Chưa gồm nhân công / điện / khấu hao. Tiền nguyên liệu tính theo kg ĐÃ LẤY khỏi bãi trong tháng — phần xe chưa cắt vẫn nằm trong chi phí tháng này nên giá thành có thể cao hơn thực tế ở kỳ đầu. Doanh thu phụ phẩm + giảm trừ NCC của tháng được trừ ngay trong tháng (có thể lệch kỳ nếu bán/trả chậm).</p>`;
  }

  // ─── SỔ GIẢM TRỪ NHÀ CUNG CẤP (ống lỗi trả lại) ──────────────
  function renderPpCredit() {
    const box = document.getElementById('x2-pp-credit');
    if (!box) return;
    const m = ppMonthRange(ppMonth);
    const rows = x2SupplierCreditRows(m.from, m.to);
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const body = rows.length
      ? rows.map(r => `<tr>
          <td>${formatDateDDMMYY(r.date)}</td>
          <td>${escapeHTML(r.supplier)}</td>
          <td class="text-right">${ppKg(r.kg)}</td>
          <td class="text-right">${r.price ? ppNum(r.price) : '—'}</td>
          <td class="text-right"><strong style="color:#b45309;">${ppNum(r.amount)}</strong></td>
        </tr>`).join('')
      : `<tr><td colspan="5" class="text-center" style="color:var(--text-muted);">Không có ống lỗi trả NCC trong ${ppMonthLabel(ppMonth)}.</td></tr>`;
    box.innerHTML = `
      <div class="x2-pp-sub-head"><strong>Sổ giảm trừ nhà cung cấp — ${ppMonthLabel(ppMonth)}</strong>
        <span class="x2-pp-cost-sub">(ống lỗi trả lại → trừ tiền mua)</span></div>
      <div class="table-responsive table-scroll">
        <table class="data-table">
          <thead><tr><th>Ngày</th><th>Nhà cung cấp</th><th class="text-right">KL trả (kg)</th><th class="text-right">Đơn giá (đ/kg)</th><th class="text-right">Thành tiền (đ)</th></tr></thead>
          <tbody>${body}</tbody>
          <tfoot><tr><td colspan="2"><strong>TỔNG ${ppMonthLabel(ppMonth)}</strong></td><td class="text-right"><strong>${ppKg(rows.reduce((s, r) => s + r.kg, 0))}</strong></td><td></td><td class="text-right"><strong>${ppNum(total)}</strong></td></tr></tfoot>
        </table>
      </div>
      <p class="x2-pp-note">Đơn giá = bình quân gia quyền các phiếu cân của NCC (hoặc của chính lượt cắt). Sổ công nợ chi tiết sẽ làm ở giai đoạn sau — số này dùng để đối chiếu giảm trừ.</p>`;
  }



  // ─── CÂN ĐỐI KHỐI LƯỢNG (bảng + tỷ lệ thực tế ⇄ định mức) ───
  function ppYieldChip(label, actual, target) {
    let cls = '';
    if (actual != null && target != null) {
      const diff = actual - target;
      if (diff < -3) cls = ' is-low';
      else if (diff > 5) cls = ' is-high';
    }
    return `<span class="x2-pp-yield-chip${cls}" title="Thực tế ${ppPct(actual)} · Định mức ${ppPct(target)}">${label}: <strong>${ppPct(actual)}</strong> <em>/ ĐM ${ppPct(target)}</em></span>`;
  }
  function renderPpBalance() {
    const box = document.getElementById('x2-pp-balance');
    if (!box) return;
    const m = ppMonthRange(ppMonth);
    const b = x2MassBalanceData(m.from, m.to);
    const row = (name, vao, ra, hao, note) => `<tr>
      <td><strong>${name}</strong></td>
      <td class="text-right">${vao === '—' ? '—' : ppKg(vao)}</td>
      <td class="text-right">${ra === '—' ? '—' : ppKg(ra)}</td>
      <td class="text-right" style="color:${Number(hao) > 0 ? '#b45309' : 'inherit'};"><strong>${hao === '—' ? '—' : ppKg(hao)}</strong></td>
      <td class="x2-row-note" style="white-space:normal;">${note || ''}</td>
    </tr>`;
    box.innerHTML = `
      <div class="x2-pp-sub-head"><strong>Cân đối khối lượng — ${ppMonthLabel(ppMonth)}</strong>
        <span class="x2-pp-cost-sub">số kg là số ĐO/ƯỚC TÍNH trong tháng · không phải tồn đầu kỳ</span></div>
      <div class="table-responsive table-scroll">
        <table class="data-table">
          <thead><tr><th>Chặng</th><th class="text-right">Vào (kg)</th><th class="text-right">Ra (kg)</th><th class="text-right">Hao hụt (kg)</th><th>Ghi chú</th></tr></thead>
          <tbody>
            ${row('Nhập bãi — Luồng cây', b.intakeCay, '—', '—', 'phiếu cân mới trong tháng')}
            ${row('Nhập bãi — Luồng ống', b.intakeOng, '—', '—', 'phiếu cân mới trong tháng')}
            ${row('Bốc Luồng', b.boc.in, b.boc.out, b.boc.loss, 'Ra = KL lên xe · Hao hụt = ngọn + mất nước (ước tính)')}
            ${row('Cắt xe luồng cây', b.cart.in, b.cart.dat + b.cart.loi + b.cart.mat, b.cart.loss, `Đạt ${ppKg(b.cart.dat)} · Lỗi ${ppKg(b.cart.loi)} · Mắt ${ppKg(b.cart.mat)}`)}
            ${row('Cắt luồng ống', b.ong.in, b.ong.dat + b.ong.loi, b.ong.loss, `Đạt ${ppKg(b.ong.dat)} · Lỗi ${ppKg(b.ong.loi)}`)}
            ${b.legacy.in > 0 ? row('Cắt lô cũ', b.legacy.in, b.legacy.dat, b.legacy.loss, 'dữ liệu trước mốc sổ nhóm') : ''}
            ${row('Bổ Ống', b.bo.in, b.bo.dat, b.bo.loi, 'Ra = ống bổ đạt · Hao hụt = ống loại')}
          </tbody>
        </table>
      </div>
      <div class="x2-pp-yield-row">
        ${ppYieldChip('Cắt xe — ống đạt', b.yields.cart.ongDat, (b.yields.cart.target || {}).ongDat)}
        ${ppYieldChip('Cắt xe — ống lỗi', b.yields.cart.ongLoi, (b.yields.cart.target || {}).ongLoi)}
        ${ppYieldChip('Cắt xe — mắt luồng', b.yields.cart.mat, (b.yields.cart.target || {}).mat)}
        ${ppYieldChip('Cắt ống — ống đạt', b.yields.ong.ongDat, (b.yields.ong.target || {}).ongDat)}
        ${ppYieldChip('Cắt ống — ống lỗi', b.yields.ong.ongLoi, (b.yields.ong.target || {}).ongLoi)}
      </div>
      <div class="x2-pp-pool-row">
        <span class="x2-pp-pool-chip">Ống đạt chờ bổ: <strong>${ppKg(b.pool.ongDatKg)} kg</strong></span>
        <span class="x2-pp-pool-chip">Xe chưa cắt: <strong>${b.pool.carts} xe · ${ppKg(b.pool.cartKg)} kg</strong></span>
        <span class="x2-pp-pool-chip">Luồng cây ở bãi: <strong>${ppKg(b.pool.cayKg)} kg</strong></span>
        <span class="x2-pp-pool-chip">Luồng ống ở bãi: <strong>${ppKg(b.pool.ongKg)} kg</strong></span>
        <span class="x2-pp-pool-chip">Phụ phẩm: <strong>${ppKg(x2PhuPhamStockTotal())} kg</strong></span>
      </div>`;
  }

  // ─── KIỂM KÊ BÃI ─────────────────────────────────────────────
  function renderPpStocktakeBook() {
    const sel = document.getElementById('x2-pp-st-pool');
    const out = document.getElementById('x2-pp-st-book');
    if (!out) return;
    const pool = sel ? sel.value : 'cay';
    out.textContent = `Tồn sổ hiện tại: ${ppKg(ppPoolBookKg(pool))} kg`;
  }
  function renderPpStocktake() {
    const box = document.getElementById('x2-pp-stocktake-list');
    if (!box) return;
    const rows = x2StocktakeRows().slice(0, 12);
    const body = rows.length
      ? rows.map(r => {
          const diff = Number(r.diffKg) || 0;
          return `<tr>
            <td>${formatDateDDMMYY(r.date)}</td>
            <td>${escapeHTML((PP_POOLS.find(p => p.id === r.pool) || {}).label || r.pool || '—')}</td>
            <td class="text-right">${ppKg(r.bookKg)}</td>
            <td class="text-right">${ppKg(r.actualKg)}</td>
            <td class="text-right" style="color:${diff < 0 ? '#dc2626' : diff > 0 ? '#16a34a' : 'inherit'};"><strong>${diff > 0 ? '+' : ''}${ppKg(diff)}</strong></td>
            <td class="x2-row-note" style="white-space:normal;">${escapeHTML(r.note || '')}</td>
            <td class="text-right"><button class="btn btn-icon btn-danger" data-admin-only title="Xóa phiếu kiểm kê" data-x2-pp-st-del="${escapeHTML(r.id)}"><i data-lucide="trash-2"></i></button></td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="7" class="text-center" style="color:var(--text-muted);">Chưa có phiếu kiểm kê. Khi cân/đếm bãi thực tế, ghi phiếu để điều chỉnh tồn sổ.</td></tr>`;
    const adj = PP_POOLS.map(p => {
      const v = x2StocktakeAdjustment(p.id);
      return v ? `<span class="x2-pp-pool-chip">${escapeHTML(p.label)}: <strong>${v > 0 ? '+' : ''}${ppKg(v)} kg</strong></span>` : '';
    }).join('');
    box.innerHTML = `
      <div class="x2-pp-sub-head"><strong>Kiểm kê bãi &amp; điều chỉnh tồn</strong>
        <span class="x2-pp-cost-sub">(không sửa dữ liệu gốc — chỉ cộng chênh lệch)</span></div>
      ${adj ? `<div class="x2-pp-pool-row">${adj}</div>` : ''}
      <div class="table-responsive table-scroll">
        <table class="data-table">
          <thead><tr><th>Ngày</th><th>Nhóm tồn</th><th class="text-right">Tồn sổ (kg)</th><th class="text-right">Thực tế (kg)</th><th class="text-right">Lệch (kg)</th><th>Ghi chú</th><th></th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="x2-pp-note">Tồn nhóm trong toàn app = sổ + tổng chênh lệch kiểm kê. Hàng đang ở bãi lúc go-live nên kiểm kê 1 lần để chốt số.</p>`;
    renderPpStocktakeBook();
    initLucide();
  }

  // ─── ĐỊNH MỨC TỶ LỆ (Admin) ─────────────────────────────────
  function renderPpYield() {
    const box = document.getElementById('x2-pp-yield');
    if (!box) return;
    const y = state.x2YieldRates || PP_DEFAULT_YIELD;
    const cay = (y.cay || PP_DEFAULT_YIELD.cay), ong = (y.ong || PP_DEFAULT_YIELD.ong);
    const num = (id, label, val) => `<div class="form-group" style="flex:0 0 150px;">
      <label for="${id}">${label}</label>
      <input type="number" id="${id}" min="0" max="100" step="0.1" value="${Number(val) || 0}">
    </div>`;
    box.innerHTML = `
      <div class="x2-pp-sub-head"><strong>Định mức tỷ lệ thu hồi (%)</strong>
        <span class="x2-pp-cost-sub">(chỉ Quản Trị sửa — dùng để cảnh báo khi thực tế lệch)</span></div>
      <div class="x2-form-row" data-admin-only>
        ${num('x2-pp-y-cay-ongdat', 'Xe — ống đạt', cay.ongDat)}
        ${num('x2-pp-y-cay-ongloi', 'Xe — ống lỗi', cay.ongLoi)}
        ${num('x2-pp-y-cay-mat', 'Xe — mắt luồng', cay.mat)}
        ${num('x2-pp-y-ong-ongdat', 'Ống — ống đạt', ong.ongDat)}
        ${num('x2-pp-y-ong-ongloi', 'Ống — ống lỗi', ong.ongLoi)}
        <div class="form-group" style="flex:0 0 auto; justify-content:flex-end;">
          <label>&nbsp;</label>
          <button type="button" class="btn btn-success" id="btn-x2-pp-yield-save" data-admin-only><i data-lucide="save"></i> Lưu định mức</button>
        </div>
      </div>`;
    initLucide();
  }


  // ─── LỊCH SỬ: THẺ NGÀY (nhập ước tính + bán/tiêu hủy) ────────
  function ppDirChip(r) {
    if (r.dir === 'in') return `<span class="x2-pp-dir in" title="Tự suy ra từ ${escapeHTML(r.ref || '')}">Nhập ước tính</span>`;
    return `<span class="x2-pp-dir out" title="${escapeHTML(PP_OUT_TYPE_LABEL[r.outType] || '')}">${escapeHTML(PP_OUT_TYPE_LABEL[r.outType] || 'Bán')}</span>`;
  }
  function renderPpTable() {
    const box = document.getElementById('x2-pp-day-cards');
    if (!box) return;
    const rows = x2PhuPhamRows();
    const countEl = document.getElementById('x2-pp-table-count');
    if (countEl) countEl.textContent = rows.length ? `${rows.length} dòng (nhập ước tính + bán/tiêu hủy)` : '';
    if (!rows.length) {
      box.innerHTML = `<div class="x2-day-card x2-day-card-empty"><i data-lucide="recycle"></i>
        <div>Chưa có phụ phẩm.<br>Phần <strong>nhập</strong> tự hiện khi ghi <strong>Bốc Luồng</strong> / <strong>Cắt Chọn</strong>;
        phần <strong>bán / tiêu hủy</strong> ghi ở form trên.</div></div>`;
      initLucide();
      return;
    }
    const groups = new Map();
    rows.forEach(r => {
      const k = r.date || '';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    let html = '';
    for (const [date, list] of groups) {
      let inKg = 0, outKg = 0, revenue = 0;
      const body = list.map(r => {
        if (r.dir === 'in') inKg += r.kg; else { outKg += r.kg; if (r.outType === 'sale') revenue += r.amount; }
        const kindTxt = `${PP_KIND_SHORT[r.kind] || r.kind || '—'}${r.dir === 'in' ? '' : ` · ${PP_FORM_LABEL[r.form] || ''}`}`;
        return `<tr class="x2-day-row">
          <td>${ppDirChip(r)}</td>
          <td><strong>${escapeHTML(kindTxt)}</strong>${r.note ? `<div class="x2-row-note">${escapeHTML(r.note)}</div>` : ''}</td>
          <td class="text-right"><strong style="color:${r.dir === 'in' ? '#b45309' : 'var(--primary)'};">${ppKg(r.kg)}</strong></td>
          <td class="text-right">${r.dir === 'in' ? '—' : (r.price ? ppNum(r.price) : '—')}</td>
          <td class="text-right">${r.dir === 'in' ? '—' : `<strong style="color:#16a34a;">${ppNum(r.amount)}</strong>`}</td>
          <td>${escapeHTML(r.dir === 'in' ? (r.ref || '') : (r.party || '—'))}</td>
          <td class="text-right">${r.dir === 'out' ? `
            <button class="btn btn-icon btn-outline" data-perm="x2" title="Sửa" data-x2-pp-edit="${escapeHTML(r.id)}"><i data-lucide="pencil"></i></button>
            <button class="btn btn-icon btn-danger" data-perm="x2" title="Xóa" data-x2-pp-del="${escapeHTML(r.id)}"><i data-lucide="trash-2"></i></button>` : `<span class="x2-row-note" title="Tự suy ra — sửa/xóa ở thẻ Bốc Luồng / Cắt Chọn">tự động</span>`}</td>
        </tr>`;
      }).join('');
      html += `<div class="x2-day-card">
        <div class="x2-day-head">
          <span class="x2-day-date"><i data-lucide="calendar-days"></i> ${formatDateDDMMYY(date)}</span>
          <span class="x2-day-cap">Nhập ước tính: <strong>${ppKg(inKg)} kg</strong></span>
          <span class="x2-day-cap">Bán/tiêu hủy: <strong>${ppKg(outKg)} kg</strong></span>
          <span class="x2-day-eff">Doanh thu: <strong style="color:#16a34a;">${ppNum(revenue)} đ</strong></span>
        </div>
        <table class="data-table x2-day-table">
          <thead><tr><th>Loại</th><th>Nguồn</th><th class="text-right">KL (kg)</th><th class="text-right">Đơn giá</th><th class="text-right">Thành tiền</th><th>Người mua / Nguồn</th><th class="text-right">Thao tác</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
    }
    box.innerHTML = html;
    initLucide();
  }

  // ─── RENDER TOÀN BỘ THẺ ─────────────────────────────────────
  function toggleX2PhuPhamTable() {
    const wrap = document.getElementById('x2-pp-table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('x2-cut-collapsed');
    initLucide();
  }
  function renderX2PhuPhamCard() {
    const mEl = document.getElementById('x2-pp-month');
    if (mEl && document.activeElement !== mEl) mEl.value = ppMonth;
    const dEl = document.getElementById('x2-pp-date');
    if (dEl && !dEl.value) dEl.value = ppTodayISO();
    const sdEl = document.getElementById('x2-pp-st-date');
    if (sdEl && !sdEl.value) sdEl.value = ppTodayISO();
    renderPpStockBar();
    renderPpStats();
    renderPpCost();
    renderPpCredit();
    renderPpBalance();
    renderPpStocktake();
    renderPpYield();
    renderPpTable();
    syncPpEditBanner();
  }
  function syncPpEditBanner() {
    const banner = document.getElementById('x2-pp-edit-banner');
    if (!banner) return;
    const txt = document.getElementById('x2-pp-edit-text');
    if (state.x2PhuPhamEditId) {
      const rec = (state.x2PhuPhamRecords || []).find(r => r.id === state.x2PhuPhamEditId);
      if (txt) txt.textContent = rec
        ? `Đang sửa lượt ${(PP_OUT_TYPE_LABEL[rec.outType] || 'bán')} ngày ${formatDateDDMMYY(rec.date)} — bấm "Lưu" hoặc "Làm Mới Form" để thoát.`
        : 'Đang sửa lượt phụ phẩm.';
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }


  // ─── HANDLER: GHI BÁN / TIÊU HỦY PHỤ PHẨM ───────────────────
  // Ô SỐ tối đa 6 chữ số (999.999) — chặn dán nhầm (khớp với max="999999" ở HTML)
  const PP_MAX6 = 999999;
  function ppNum6Ok(v, label) {
    if (Number(v) > PP_MAX6) {
      showToast(`${label} tối đa ${PP_MAX6.toLocaleString('vi-VN')} (6 chữ số)!`, 'error');
      return false;
    }
    return true;
  }
  function onX2PhuPhamCalc() {
    const box = document.getElementById('x2-pp-amount');
    if (!box) return;
    const kg = Number((document.getElementById('x2-pp-kg') || {}).value) || 0;
    const price = Number((document.getElementById('x2-pp-price') || {}).value) || 0;
    box.textContent = `Thành tiền: ${ppNum(Math.round(kg * price * 100) / 100)} đ`;
  }
  function resetX2PhuPhamForm() {
    state.x2PhuPhamEditId = null;
    ['x2-pp-kg', 'x2-pp-price', 'x2-pp-party', 'x2-pp-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const d = document.getElementById('x2-pp-date');
    if (d) d.value = ppTodayISO();
    const kind = document.getElementById('x2-pp-kind');
    if (kind) kind.value = 'ngon';
    const f = document.getElementById('x2-pp-out-form');
    if (f) f.value = 'raw';
    const t = document.getElementById('x2-pp-out-type');
    if (t) t.value = 'sale';
    onX2PhuPhamCalc();
    syncPpEditBanner();
  }
  function handleX2PhuPhamSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireEditPermission()) return;
    const val = id => String((document.getElementById(id) || {}).value || '').trim();
    const date = val('x2-pp-date');
    if (!date) { showToast('Ngày bán / tiêu hủy không được để trống!', 'error'); return; }
    const kind = val('x2-pp-kind');
    if (!PP_KINDS.some(k => k.id === kind)) { showToast('Nguồn phụ phẩm không hợp lệ!', 'error'); return; }
    const form = val('x2-pp-out-form') === 'chipped' ? 'chipped' : 'raw';
    const outType = val('x2-pp-out-type') === 'dispose' ? 'dispose' : 'sale';
    const kg = Number((document.getElementById('x2-pp-kg') || {}).value);
    if (!Number.isFinite(kg) || kg <= 0) { showToast('KL cân thực phải là số lớn hơn 0 kg!', 'error'); return; }
    if (!ppNum6Ok(kg, 'KL cân thực')) return;
    const priceRaw = Number((document.getElementById('x2-pp-price') || {}).value);
    if (Number.isFinite(priceRaw) && priceRaw < 0) { showToast('Đơn giá phải là số không âm!', 'error'); return; }
    if (Number.isFinite(priceRaw) && !ppNum6Ok(priceRaw, 'Đơn giá')) return;
    const price = (outType === 'dispose') ? 0 : (Number.isFinite(priceRaw) ? Math.round(priceRaw * 100) / 100 : 0);
    const party = val('x2-pp-party');
    const note = val('x2-pp-note');
    const amount = Math.round(kg * price * 100) / 100;
    const payload = { date, kind, form, outType, kg, price, amount, party, note };
    if (state.x2PhuPhamEditId) {
      const rec = (state.x2PhuPhamRecords || []).find(r => r.id === state.x2PhuPhamEditId);
      if (!rec) { showToast('Không tìm thấy lượt phụ phẩm cần sửa!', 'error'); return; }
      Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
      saveX2PhuPham();
      showToast('Đã cập nhật lượt phụ phẩm!', 'success');
    } else {
      (state.x2PhuPhamRecords = state.x2PhuPhamRecords || []).push(Object.assign({
        id: 'x2pp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        createdAt: new Date().toISOString()
      }, payload));
      saveX2PhuPham();
      showToast(outType === 'sale' ? `Đã ghi bán ${ppKg(kg)} kg phụ phẩm!` : `Đã ghi tiêu hủy ${ppKg(kg)} kg phụ phẩm!`, 'success');
    }
    resetX2PhuPhamForm();
    renderX2PhuPhamCard();
  }
  function editX2PhuPham(id) {
    if (!requireEditPermission()) return;
    const rec = (state.x2PhuPhamRecords || []).find(r => r.id === id);
    if (!rec) return;
    state.x2PhuPhamEditId = id;
    const set = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = (v == null ? '' : String(v)); };
    set('x2-pp-date', rec.date || '');
    set('x2-pp-kind', rec.kind || 'ngon');
    set('x2-pp-out-form', rec.form || 'chipped');
    set('x2-pp-out-type', rec.outType || 'sale');
    set('x2-pp-kg', rec.kg);
    set('x2-pp-price', rec.price);
    set('x2-pp-party', rec.party || '');
    set('x2-pp-note', rec.note || '');
    onX2PhuPhamCalc();
    syncPpEditBanner();
  }
  function deleteX2PhuPham(id) {
    if (!requireEditPermission()) return;
    const rec = (state.x2PhuPhamRecords || []).find(r => r.id === id);
    if (!rec) return;
    if (!confirm(`Xóa lượt ${PP_OUT_TYPE_LABEL[rec.outType] || 'bán'} ${ppKg(rec.kg)} kg phụ phẩm ngày ${formatDateDDMMYY(rec.date)}?`)) return;
    trackDeleted('x2PhuPhamRecords', id);
    state.x2PhuPhamRecords = (state.x2PhuPhamRecords || []).filter(r => r.id !== id);
    if (state.x2PhuPhamEditId === id) resetX2PhuPhamForm();
    saveX2PhuPham();
    renderX2PhuPhamCard();
    showToast('Đã xóa lượt phụ phẩm!', 'success');
  }


  // ─── HANDLER: KIỂM KÊ BÃI (Admin) ───────────────────────────
  function handleX2StocktakeSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!requireRatePermission()) return;
    const val = id => String((document.getElementById(id) || {}).value || '').trim();
    const date = val('x2-pp-st-date');
    if (!date) { showToast('Ngày kiểm kê không được để trống!', 'error'); return; }
    const pool = val('x2-pp-st-pool');
    if (!PP_POOLS.some(p => p.id === pool)) { showToast('Nhóm tồn không hợp lệ!', 'error'); return; }
    const actual = Number((document.getElementById('x2-pp-st-actual') || {}).value);
    if (!Number.isFinite(actual) || actual < 0) { showToast('KL thực tế phải là số không âm!', 'error'); return; }
    if (!ppNum6Ok(actual, 'KL thực tế')) return;
    const book = Math.round(ppPoolBookKg(pool) * 100) / 100;
    const diff = Math.round((actual - book) * 100) / 100;
    const note = val('x2-pp-st-note');
    (state.x2Stocktakes = state.x2Stocktakes || []).push({
      id: 'x2st-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      date, pool, bookKg: book, actualKg: Math.round(actual * 100) / 100, diffKg: diff, note,
      createdBy: (state.currentUser && state.currentUser.username) || '',
      createdAt: new Date().toISOString()
    });
    saveX2Stocktakes();
    const el = document.getElementById('x2-pp-st-actual');
    if (el) el.value = '';
    const n = document.getElementById('x2-pp-st-note');
    if (n) n.value = '';
    renderPpStocktake();
    renderPpStockBar();
    renderPpStats();
    renderPpBalance();
    showToast(`Đã ghi kiểm kê: lệch ${diff > 0 ? '+' : ''}${ppKg(diff)} kg (tồn sổ ${ppKg(book)} → thực tế ${ppKg(actual)}).`, diff === 0 ? 'info' : 'success');
  }
  function deleteX2Stocktake(id) {
    if (!requireRatePermission()) return;
    const rec = (state.x2Stocktakes || []).find(r => r.id === id);
    if (!rec) return;
    if (!confirm(`Xóa phiếu kiểm kê ngày ${formatDateDDMMYY(rec.date)} (lệch ${ppKg(rec.diffKg)} kg)?`)) return;
    trackDeleted('x2Stocktakes', id);
    state.x2Stocktakes = (state.x2Stocktakes || []).filter(r => r.id !== id);
    saveX2Stocktakes();
    renderPpStocktake();
    renderPpStockBar();
    renderPpStats();
    renderPpBalance();
    showToast('Đã xóa phiếu kiểm kê!', 'success');
  }
  function resetX2StocktakeForm() {
    const d = document.getElementById('x2-pp-st-date');
    if (d) d.value = ppTodayISO();
    ['x2-pp-st-actual', 'x2-pp-st-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const p = document.getElementById('x2-pp-st-pool');
    if (p) p.value = 'cay';
    renderPpStocktakeBook();
  }

  // ─── HANDLER: ĐỊNH MỨC TỶ LỆ (Admin) ────────────────────────
  function handleX2YieldRateSave() {
    if (!requireRatePermission()) return;
    const num = id => Number((document.getElementById(id) || {}).value);
    const vals = {
      'x2-pp-y-cay-ongdat': 'cay.ongDat', 'x2-pp-y-cay-ongloi': 'cay.ongLoi', 'x2-pp-y-cay-mat': 'cay.mat',
      'x2-pp-y-ong-ongdat': 'ong.ongDat', 'x2-pp-y-ong-ongloi': 'ong.ongLoi'
    };
    const out = { cay: {}, ong: {} };
    for (const [id, path] of Object.entries(vals)) {
      const v = num(id);
      if (!Number.isFinite(v) || v < 0 || v > 100) { showToast('Mỗi tỷ lệ phải là số từ 0 đến 100%!', 'error'); return; }
      const [g, f] = path.split('.');
      out[g][f] = Math.round(v * 10) / 10;
    }
    state.x2YieldRates = out;
    saveX2YieldRates();
    renderPpYield();
    renderPpBalance();
    showToast('Đã lưu định mức tỷ lệ thu hồi!', 'success');
  }

export {
  PP_KINDS, PP_KIND_LABEL, PP_KIND_SHORT, PP_OUT_TYPES, PP_OUT_TYPE_LABEL,
  PP_FORMS, PP_FORM_LABEL, PP_POOLS, PP_DEFAULT_YIELD,
  loadX2PhuPham, saveX2PhuPham, loadX2Stocktakes, saveX2Stocktakes,
  loadX2YieldRates, saveX2YieldRates, ppYieldNorm,
  renderX2PhuPhamCard, x2PhuPhamCardCount, setPpMonth, toggleX2PhuPhamTable,
  handleX2PhuPhamSubmit, editX2PhuPham, deleteX2PhuPham, resetX2PhuPhamForm, onX2PhuPhamCalc,
  handleX2StocktakeSubmit, deleteX2Stocktake, resetX2StocktakeForm, renderPpStocktakeBook,
  handleX2YieldRateSave,
  x2PhuPhamInRows, x2PhuPhamOutRows, x2PhuPhamRows,
  x2PhuPhamStock, x2PhuPhamStockTotal, x2PhuPhamRevenue, x2PhuPhamSoldKg,
  x2SupplierCreditRows, x2SupplierCreditTotal,
  ppMaterialCostOf, ppMaterialPriceOf, x2CostingData, x2MassBalanceData,
  ppMonthRange, ppMonthLabel, ppPoolBookKg, x2StocktakeRows,
  ppKg, ppNum, ppPct
};

