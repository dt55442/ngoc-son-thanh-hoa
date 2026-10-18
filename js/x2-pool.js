// ═══════════════════════════════════════════════════════════
// js/x2-pool.js — SỔ NHÓM KHỐI LƯỢNG XƯỞNG 2 (Giai đoạn 1 — 18/10/2026)
// ═══════════════════════════════════════════════════════════
// Bối cảnh: nguyên liệu về nhiều, đổ chung bãi tập kết nên KHÔNG còn
// kiểm soát được theo từng lô. Từ mốc 17/10/2026 Xưởng 2 theo dõi theo
// 2 tầng:
//   ① TẦNG VẬT LÝ (đếm/cân được): phiếu cân chuyến → XE BỐC (~600 kg)
//      → LƯỢT CẮT (số xe) → LƯỢT BỔ (kg).
//   ② TẦNG SỔ SÁCH (khối lượng): các NHÓM TỒN
//      - `cay`     : Luồng cây chưa bốc (kg)      = Σ phiếu cân − Σ kg lấy
//      - `ong`     : Luồng ống nguyên liệu (kg)   = Σ phiếu cân − Σ kg lấy
//      - `xe`      : Xe luồng cây đã bốc chưa cắt = Σ xe bốc − Σ xe cắt
//      - `ong_dat` : Ống đạt chờ bổ (kg)          = Σ ống đạt cắt − Σ kg bổ
// Module này CHỈ ĐỌC dữ liệu sẵn có (materialRecords, xuong2BoluongRecords,
// xuong2CutRecords, xuong2BoOngRecords) — KHÔNG lưu state mới, KHÔNG thêm
// key localStorage, nên không phải nối mây/backup/history.
//
// QUY ƯỚC QUAN TRỌNG:
//   • Dữ liệu CŨ (trước 17/10/2026) vẫn đọc được: lượt cắt cũ không có
//     `inputKind` ⇒ coi là "lô cũ" và tiêu thụ TOÀN BỘ khối lượng lô.
//   • Mọi phép chia/phân bổ theo NCC chỉ để ĐỐI CHIẾU, phải gắn nhãn
//     "ước tính" ở UI — không phải số cân thật từng chuyến.
//   • KHÔNG import js/xuong2.js (tránh vòng import); chỉ dùng state.
// ═══════════════════════════════════════════════════════════
import { state } from './state.js';

  // KL mặc định của 1 xe bốc (kg) — người dùng sửa được ở từng lượt
  const X2_KG_PER_CART_DEFAULT = 600;

  // ─── CHUẨN HÓA TÊN (bỏ dấu, viết thường) ─────────────────────
  function x2NormText(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  // ─── PHÂN LOẠI NGUYÊN LIỆU THÀNH 2 NHÓM NGUỒN ────────────────
  // 'cay' = Luồng cây (bốc luồng) · 'ong' = Luồng ống (cắt chọn trực tiếp)
  // 'khac' = loại khác — không thuộc 2 luồng trên.
  function x2MaterialKindOf(type) {
    const t = x2NormText(type);
    if (t.includes('luong cay')) return 'cay';
    if (t.includes('luong ong') || t.includes('ong luong')) return 'ong';
    return 'khac';
  }
  function x2MaterialKindLabel(kind) {
    if (kind === 'cay') return 'Luồng cây';
    if (kind === 'ong') return 'Luồng ống';
    return 'Khác';
  }

  // KL đầu vào (kg) của 1 lần nhập nguyên liệu = trọng lượng đã lưu
  // (weight = chỉ số đầu vào − chỉ số đầu ra); dự phòng tính lại nếu thiếu.
  function materialInputWeightOf(rec) {
    if (!rec) return 0;
    const w = Number(rec.weight);
    if (Number.isFinite(w)) return w;
    return (Number(rec.inputIndex) || 0) - (Number(rec.outputIndex) || 0);
  }

  // ─── PHIẾU CÂN ĐÃ DÙNG (phân bổ khối lượng) ──────────────────
  // Bản ghi mới lưu `tickets: [{ materialId, kg }]` — mỗi phần tử là phần
  // khối lượng lấy từ ĐÚNG một phiếu cân (mặc định = phần còn lại của phiếu).
  // Bản cũ chỉ có `materialId` (1 lô) → xem như lấy TOÀN BỘ khối lượng lô.
  function x2TicketAllocOf(rec) {
    if (!rec) return [];
    if (Array.isArray(rec.tickets) && rec.tickets.length) {
      return rec.tickets
        .map(t => ({ materialId: String((t && t.materialId) || ''), kg: Number(t && t.kg) || 0 }))
        .filter(t => t.materialId && t.kg > 0);
    }
    return [];
  }

  // Bỏ qua đúng 1 bản ghi đang SỬA (phần của nó được TRẢ LẠI trước khi so sánh)
  function x2IsExcluded(exclude, domain, id) {
    return !!(exclude && exclude.domain === domain && exclude.id && exclude.id === id);
  }

  // Tổng khối lượng ĐÃ LẤY từ 1 phiếu cân (kg).
  // Ưu tiên luật CŨ: phiếu đã có LƯỢT CẮT kiểu cũ ⇒ cả lô đã được cắt
  // (tránh cộng trùng với khối lượng đã bốc của lô đó).
  function x2TicketUsedOf(materialId, exclude) {
    const id = String(materialId || '');
    if (!id) return 0;
    const mat = (state.materialRecords || []).find(m => m.id === id) || null;
    if (!mat) return 0;

    // ① Lượt CẮT kiểu CŨ (không có inputKind) → tiêu thụ toàn bộ lô
    const legacyCut = (state.xuong2CutRecords || []).some(r =>
      r && r.materialId === id && !r.inputKind && !x2IsExcluded(exclude, 'cut', r.id));
    if (legacyCut) return materialInputWeightOf(mat);

    let used = 0;
    // ② Lượt BỐC kiểu CŨ (không có tickets) — chỉ trừ phần đã bốc
    (state.xuong2BoluongRecords || []).forEach(r => {
      if (!r || x2IsExcluded(exclude, 'boluong', r.id)) return;
      const alloc = x2TicketAllocOf(r);
      if (alloc.length) {
        alloc.forEach(t => { if (t.materialId === id) used += t.kg; });
      } else if (r.materialId === id) {
        used += Number(r.qty) || 0;
      }
    });
    // ③ Lượt CẮT kiểu MỚI (Luồng ống) — trừ phần lấy từ phiếu
    (state.xuong2CutRecords || []).forEach(r => {
      if (!r || !r.inputKind || x2IsExcluded(exclude, 'cut', r.id)) return;
      x2TicketAllocOf(r).forEach(t => { if (t.materialId === id) used += t.kg; });
    });
    return used;
  }

  // PHẦN CÒN LẠI của 1 phiếu cân (kg)
  function x2TicketRemainingOf(mat, exclude) {
    if (!mat) return 0;
    return Math.max(0, materialInputWeightOf(mat) - x2TicketUsedOf(mat.id, exclude));
  }

  // Phiếu cân CÒN HÀNG của 1 nhóm nguồn ('cay' | 'ong') — sắp CŨ NHẤT lên đầu
  // (thứ tự FEFO: lấy hàng nhập trước). Chỉ lấy nguyên liệu ở bãi Xưởng 2.
  function x2PendingTickets(kind, exclude) {
    return [...(state.materialRecords || [])]
      .filter(r => r && r.location === 'xuong-2' && x2MaterialKindOf(r.type) === kind)
      .filter(r => x2TicketRemainingOf(r, exclude) > 0)
      .sort((a, b) => {
        if ((a.date || '') !== (b.date || '')) return (a.date || '').localeCompare(b.date || '');
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
  }

  // ─── ĐIỀU CHỈNH KIỂM KÊ BÃI (Giai đoạn 3 — thẻ Phụ Phẩm & Cân Đối) ──
  // Mỗi phiếu kiểm kê lưu `diffKg = thực tế − tồn sổ`; tổng diff của nhóm được
  // CỘNG vào tồn sổ (diff âm = thiếu, dương = thừa). Không sửa dữ liệu gốc.
  // Nhóm: 'cay' | 'ong' | 'ong_dat' | 'phu_pham'.
  function x2StocktakeAdjustment(pool) {
    return (state.x2Stocktakes || []).reduce((s, r) => {
      if (!r || r.pool !== pool) return s;
      const v = Number(r.diffKg);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);
  }

  // Tổng tồn nhóm của 1 loại nguồn (kg) + số phiếu còn hàng
  function x2TicketTotals(kind, exclude) {
    const list = x2PendingTickets(kind, exclude);
    const raw = list.reduce((s, m) => s + x2TicketRemainingOf(m, exclude), 0);
    return {
      tickets: list.length,
      kg: Math.max(0, raw + x2StocktakeAdjustment(kind))
    };
  }

  // ─── NHÓM XE BỐC (xe luồng cây) ──────────────────────────────
  function x2CartsBocTotal(exclude) {
    return (state.xuong2BoluongRecords || []).reduce((s, r) => {
      if (!r || x2IsExcluded(exclude, 'boluong', r.id)) return s;
      const c = Number(r.carts);
      return s + (Number.isFinite(c) && c > 0 ? c : 0);
    }, 0);
  }
  function x2CartsCutTotal(exclude) {
    return (state.xuong2CutRecords || []).reduce((s, r) => {
      if (!r || r.inputKind !== 'cart' || x2IsExcluded(exclude, 'cut', r.id)) return s;
      const c = Number(r.carts);
      return s + (Number.isFinite(c) && c > 0 ? c : 0);
    }, 0);
  }
  // Số XE đã bốc nhưng CHƯA cắt
  function x2CartsAvailable(exclude) {
    return Math.max(0, x2CartsBocTotal(exclude) - x2CartsCutTotal(exclude));
  }
  // Khối lượng của số xe CHƯA cắt (kg) — trừ dần theo FEFO (xe bốc cũ trừ trước)
  function x2CartsRemainingKg(exclude) {
    const bocs = (state.xuong2BoluongRecords || [])
      .filter(r => r && !x2IsExcluded(exclude, 'boluong', r.id) && (Number(r.carts) || 0) > 0)
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));
    let cutLeft = x2CartsCutTotal(exclude);
    let kg = 0;
    bocs.forEach(r => {
      const take = Math.min(Number(r.carts) || 0, cutLeft);
      cutLeft -= take;
      const restCarts = (Number(r.carts) || 0) - take;
      const per = Number(r.kgPerCart) > 0 ? Number(r.kgPerCart) : X2_KG_PER_CART_DEFAULT;
      kg += restCarts * per;
    });
    return kg;
  }


  // ─── NHÓM "ỐNG ĐẠT CHỜ BỔ" ───────────────────────────────────
  // Sản xuất = Σ KL ống đạt của MỌI lượt Cắt Chọn (kể cả lượt cũ).
  // Đã bổ    = Σ KL ống đem bổ của MỌI lượt Bổ Ống.
  // Từ công đoạn Bổ trở đi KHÔNG còn truy vết lô/nhà cung cấp — chỉ khối lượng.
  function x2OngDatProducedOf(exclude) {
    return (state.xuong2CutRecords || []).reduce((s, r) => {
      if (!r || x2IsExcluded(exclude, 'cut', r.id)) return s;
      return s + (Number(r.klOngLuong) || 0);
    }, 0);
  }
  function x2OngDatUsedOf(exclude) {
    return (state.xuong2BoOngRecords || []).reduce((s, r) => {
      if (!r || x2IsExcluded(exclude, 'boong', r.id)) return s;
      const v = Number(r.inputOng);
      const input = Number.isFinite(v) ? v : ((Number(r.klOngBo) || 0) + (Number(r.klOngLoai) || 0));
      return s + input;
    }, 0);
  }
  function x2OngDatAvailable(exclude) {
    return Math.max(0, x2OngDatProducedOf(exclude) - x2OngDatUsedOf(exclude) + x2StocktakeAdjustment('ong_dat'));
  }
  // Số lượt cắt đã tạo ống đạt (để hiện "từ N lượt cắt")
  function x2OngDatSourceCount() {
    return (state.xuong2CutRecords || []).filter(r => r && (Number(r.klOngLuong) || 0) > 0).length;
  }

  // ─── TRUNG BÌNH KG/XE TỪ "CÂN MẪU" ───────────────────────────
  // Nhận chuỗi "590 610 605" (hoặc "590; 610", "590, 610") → các số > 0.
  // QUY ƯỚC: dấu phẩy ĐI KÈM SỐ ngay sau (VD "590,5") = dấu thập phân;
  // nhiều giá trị thì cách nhau bằng DẤU CÁCH hoặc dấu ';' (tránh nhập nhằng).
  function x2SampleNums(input) {
    const raw = Array.isArray(input) ? input
      : String(input || '').replace(/,\s+/g, ';').split(/[;\/\s]+/);
    return raw.map(v => Number(String(v).replace(',', '.')))
      .filter(v => Number.isFinite(v) && v > 0);
  }
  // Trả null khi không có mẫu hợp lệ.
  function x2SampleAvg(input) {
    const nums = x2SampleNums(input);
    if (!nums.length) return null;
    const avg = nums.reduce((s, v) => s + v, 0) / nums.length;
    return Math.round(avg * 100) / 100;
  }
  // Đọc mẫu đã lưu của 1 lượt (mảng số) → mảng số hợp lệ
  function x2SampleListOf(rec) {
    const arr = Array.isArray(rec && rec.sampleWeights) ? rec.sampleWeights : [];
    return arr.map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0);
  }

  // ─── NHÃN NHÀ CUNG CẤP CỦA NHÓM PHIẾU ─────────────────────────
  // Trả { label, single } — single = tên NCC khi MỌI phiếu cùng 1 NCC (để
  // ghi vào trường `supplier` cho báo cáo NCC cũ vẫn ăn), ngược lại ''.
  function x2SupplierLabelOf(alloc) {
    const names = [];
    (alloc || []).forEach(t => {
      const mat = (state.materialRecords || []).find(m => m.id === t.materialId);
      const name = String((mat && mat.supplier) || '').trim();
      if (name && !names.some(n => x2NormText(n) === x2NormText(name))) names.push(name);
    });
    const label = names.length ? names.join(' + ') : '';
    return { label: label || 'Không rõ NCC', single: names.length === 1 ? names[0] : '' };
  }

  // Loại nguyên liệu hiển thị của nhóm phiếu: 1 loại → tên loại; nhiều → "…(nhiều phiếu)"
  function x2TypeLabelOf(alloc, kind) {
    const names = [];
    (alloc || []).forEach(t => {
      const mat = (state.materialRecords || []).find(m => m.id === t.materialId);
      const name = String((mat && mat.type) || '').trim();
      if (name && !names.some(n => x2NormText(n) === x2NormText(name))) names.push(name);
    });
    if (!names.length) return x2MaterialKindLabel(kind) + ' (nhiều phiếu)';
    return names.length === 1 ? names[0] : `${x2MaterialKindLabel(kind)} (nhiều phiếu)`;
  }

  // ─── TỔNG HỢP TỒN 3 NHÓM (dùng cho thanh tồn + mini card) ────
  function x2PoolSnapshot(exclude) {
    const cay = x2TicketTotals('cay', exclude);
    const ong = x2TicketTotals('ong', exclude);
    return {
      cayTickets: cay.tickets,
      cayKg: cay.kg,
      ongTickets: ong.tickets,
      ongKg: ong.kg,
      carts: x2CartsAvailable(exclude),
      cartKg: x2CartsRemainingKg(exclude),
      ongDatKg: x2OngDatAvailable(exclude),
      ongDatSources: x2OngDatSourceCount()
    };
  }

export {
  X2_KG_PER_CART_DEFAULT,
  x2NormText,
  x2MaterialKindOf,
  x2MaterialKindLabel,
  materialInputWeightOf,
  x2TicketAllocOf,
  x2TicketUsedOf,
  x2TicketRemainingOf,
  x2PendingTickets,
  x2TicketTotals,
  x2CartsBocTotal,
  x2CartsCutTotal,
  x2CartsAvailable,
  x2CartsRemainingKg,
  x2OngDatProducedOf,
  x2OngDatUsedOf,
  x2OngDatAvailable,
  x2OngDatSourceCount,
  x2StocktakeAdjustment,
  x2SampleAvg,
  x2SampleNums,
  x2SampleListOf,
  x2SupplierLabelOf,
  x2TypeLabelOf,
  x2PoolSnapshot
};

