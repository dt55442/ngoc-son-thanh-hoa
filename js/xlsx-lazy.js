// ═══════════════════════════════════════════════════════════════
// js/xlsx-lazy.js — NẠP TRỄ SheetJS (vendor/xlsx.full.min.js — 864KB)
// ═══════════════════════════════════════════════════════════════
// KHÔNG import gì (như loading.js — tránh vòng import). SheetJS là file JS
// LỚN NHẤT của app nhưng CHỈ cần khi: Xuất Excel / In báo cáo / Nạp file Excel
// (nhân sự · máy chấm công). Trước đây nạp chặn ở <head> ⇒ lần đầu mở app phải
// tải + parse 864KB trước khi dùng được — máy yếu/mạng chậm bị "treo".
// Giờ: boot xong → tự nạp NGẦM khi máy rảnh (kickXlsxBackgroundLoad);
// bấm Xuất trước đó → chờ nạp xong rồi TỰ chạy tiếp (ensureXlsx).
// ═══════════════════════════════════════════════════════════════

let xlsxPromise = null;

// Trả Promise<window.XLSX> — đã có sẵn (stub test / nạp xong) → giải ngay.
export function ensureXlsx() {
  if (typeof window !== 'undefined' && window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxPromise) return xlsxPromise;
  xlsxPromise = new Promise((resolve, reject) => {
    try {
      const s = document.createElement('script');
      s.src = 'vendor/xlsx.full.min.js';
      s.async = true;
      s.onload = () => {
        if (typeof window !== 'undefined' && window.XLSX) resolve(window.XLSX);
        else { xlsxPromise = null; reject(new Error('SheetJS nạp xong nhưng window.XLSX không tồn tại')); }
      };
      s.onerror = () => { xlsxPromise = null; try { s.remove(); } catch (e) { /* bỏ qua */ } reject(new Error('Không tải được thư viện Excel (vendor/xlsx.full.min.js)')); };
      (document.head || document.body).appendChild(s);
    } catch (e) { xlsxPromise = null; reject(e); }
  });
  return xlsxPromise;
}

// Nạp NGẦM khi máy rảnh — gọi 1 lần sau khi boot xong (js/main.js).
// Nhờ vậy lần bấm "Xuất Excel" đầu tiên hầu như không phải chờ mạng.
export function kickXlsxBackgroundLoad() {
  if (typeof window !== 'undefined' && window.XLSX) return; // đã có (stub test)
  let kicked = false;
  const run = () => { if (!kicked) { kicked = true; ensureXlsx().catch(() => { /* im lặng — bấm Xuất sẽ báo lỗi rõ */ }); } };
  try {
    if (typeof requestIdleCallback === 'function') { requestIdleCallback(run, { timeout: 4000 }); return; }
  } catch (e) { /* rơi xuống setTimeout */ }
  // Fallback: Node test dùng setTimeout có unref() — không giữ process sống
  const t = setTimeout(run, 2500);
  if (t && typeof t.unref === 'function') t.unref();
}
