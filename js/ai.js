// ═══════════════════════════════════════════════════════════
// js/ai.js — TRỢ LÝ AI (Google Gemini — gói miễn phí)
// ───────────────────────────────────────────────────────────
// Nút nổi "AI" (mọi tab) gồm 2 phần:
//   1) NHẮC VIỆC — tự tính TRỰC TIẾP từ dữ liệu app (offline, không cần key):
//      đơn/tăng ca chờ duyệt, lô chậm, chưa chấm công, thiếu kế hoạch tuần...
//   2) PHÂN TÍCH BẰNG AI — gộp số liệu then chốt (lô/ép/nguyên liệu/QC/nhân sự)
//      gửi Gemini qua REST generateContent, nhận nhận xét + gợi ý việc cần làm.
// API key: nhập qua modal → lưu CỤC BỘ từng máy (localStorage bamboo_tracker_
// ai_key_v1). KHÔNG khuyến khích ghi key thật vào firebase-config.js vì file
// này công khai trên GitHub — key Gemini chỉ tốn hạn mức, vẫn nên giữ riêng.
// Cần INTERNET mới gọi được AI (app vẫn chạy offline đầy đủ phần khác).
// ═══════════════════════════════════════════════════════════
import { STAGES, state } from './state.js';
import { escapeHTML, getBatchStageEntryDate, getISOWeekString, showToast } from './utils.js';
import { attStatusOf } from './hr.js';
import { initLucide } from './cloud.js';

const AI_KEY_STORAGE = 'bamboo_tracker_ai_key_v1';
const AI_MODEL_STORAGE = 'bamboo_tracker_ai_model_v1';      // lựa chọn người dùng: 'auto' | tên model cụ thể
const AI_MODEL_OK_STORAGE = 'bamboo_tracker_ai_model_ok_v1'; // model chạy THÀNH CÔNG gần nhất (auto ưu tiên dùng lại)
const AI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';
// Danh sách model thử LẦN LƯỢT khi để "Tự động": CHỈ dùng các model 3.x và
// alias "latest" — Google KHÔNG mở model 2.x (2.5/2.0...) cho API key mới
// ("models/gemini-2.5-flash is no longer available to new users"). Model mới
// nhất (3.8) đôi khi QUÁ TẢI trên gói miễn phí → auto sẽ nhảy sang 3.6/3.5
// (công việc nhắc việc/phân tích đơn giản đều đủ dùng). Alias "latest" luôn
// trỏ bản flash mới nhất nên không bao giờ bị loại bỏ vì cũ.
const AI_MODEL_CANDIDATES = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest'
];

// ─── CẤU HÌNH KEY / MODEL ───────────────────────────────────────
// Ưu tiên key nhập qua modal (localStorage từng máy); fallback sang key khai
// báo trong window.AI_CONFIG (firebase-config.js) nếu có.
function aiKeyOf() {
  let ls = '';
  try { ls = localStorage.getItem(AI_KEY_STORAGE) || ''; } catch (e) { ls = ''; }
  const cfg = (typeof window !== 'undefined' && window.AI_CONFIG) || {};
  return String(ls || cfg.geminiKey || '').trim();
}
// Lựa chọn model: 'auto' (mặc định — thử lần lượt) hoặc 1 model cụ thể
function aiModelChoice() {
  try { return localStorage.getItem(AI_MODEL_STORAGE) || 'auto'; } catch (e) { return 'auto'; }
}
function aiSetModel(choice) {
  try { localStorage.setItem(AI_MODEL_STORAGE, String(choice || 'auto')); } catch (e) {}
  syncAiKeyRow();
}
// Model chạy THÀNH CÔNG gần nhất (chế độ auto ưu tiên gọi lại model này)
function aiModelWorking() {
  try { return localStorage.getItem(AI_MODEL_OK_STORAGE) || ''; } catch (e) { return ''; }
}
function aiModelOf() {
  const c = aiModelChoice();
  return c === 'auto' ? (aiModelWorking() || AI_MODEL_CANDIDATES[0]) : c;
}
function aiTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── MODAL ──────────────────────────────────────────────────────
let aiLastResult = '';

function openAiAssistant() {
  const modal = document.getElementById('modal-ai');
  if (!modal) return;
  syncAiKeyRow();
  renderAiReminders();
  const out = document.getElementById('ai-output');
  if (out && aiLastResult) out.innerHTML = aiTextToHtml(aiLastResult);
  modal.classList.add('show');
  initLucide();
}
function closeAiAssistant() {
  document.getElementById('modal-ai')?.classList.remove('show');
}
function syncAiKeyRow() {
  const row = document.getElementById('ai-key-row');
  if (row) row.style.display = aiKeyOf() ? 'none' : '';
  const sel = document.getElementById('ai-model-select');
  if (sel && sel.options) {
    // Lựa chọn cũ (VD model 2.x đã bị Google loại với key mới) không còn trong
    // danh sách → tự trả về "Tự động" (không đệ quy qua aiSetModel)
    const valid = Array.prototype.some.call(sel.options, o => o.value === aiModelChoice());
    if (!valid) { try { localStorage.setItem(AI_MODEL_STORAGE, 'auto'); } catch (e) {} }
    if (sel.value !== aiModelChoice()) sel.value = aiModelChoice();
  }
  const ag = document.getElementById('ai-autogreet-toggle');
  if (ag) ag.checked = aiAutoGreetOn();
  const st = document.getElementById('ai-key-status');
  if (st) {
    const hasKey = !!aiKeyOf();
    const modelTxt = hasKey
      ? (aiLastUsedModel ? ` · model đã dùng: ${aiLastUsedModel}` : ` · model: ${aiModelChoice() === 'auto' ? 'tự động' : aiModelChoice()}`)
      : '';
    st.textContent = (hasKey ? 'API key: đã cấu hình ✓' : 'API key: chưa cấu hình') + modelTxt;
  }
}
// Lưu API key nhập tay (chỉ trên máy này)
function aiSaveKey() {
  const inp = document.getElementById('ai-key-input');
  const val = String((inp && inp.value) || '').trim();
  if (!val) { showToast('Chưa nhập key — dán API key từ Google AI Studio vào ô trống.', 'error'); return; }
  try { localStorage.setItem(AI_KEY_STORAGE, val); } catch (e) {}
  if (inp) inp.value = '';
  syncAiKeyRow();
  showToast('Đã lưu API key trên máy này (không đồng bộ mây, không lên GitHub).', 'success');
}
// Xóa key đã lưu (muốn đổi key khác)
function aiToggleKey() {
  try { localStorage.removeItem(AI_KEY_STORAGE); } catch (e) {}
  syncAiKeyRow();
  showToast('Đã xóa API key khỏi máy này — nhập key mới ở ô phía trên.', 'info');
}

// ─── NHẮC VIỆC (offline — tự tính từ dữ liệu app) ──────────────
function buildLocalReminders() {
  const iso = aiTodayISO();
  const out = [];
  // Đơn nghỉ + tăng ca chờ duyệt
  const pendLeave = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending');
  if (pendLeave.length) out.push({ level: 'warn', text: `${pendLeave.length} đơn nghỉ phép CHỜ DUYỆT — xem ở thẻ "Xin Nghỉ Phép" (chỉ Admin/Ban Quản Lý duyệt được).` });
  const pendOT = (state.hrOvertimes || []).filter(o => (o.status || 'pending') === 'pending');
  if (pendOT.length) out.push({ level: 'warn', text: `${pendOT.length} đăng ký TĂNG CA chờ duyệt — xem ở thẻ "Tăng Ca".` });
  // Lô chậm tại công đoạn hiện tại (>= 4 ngày)
  const slow = (state.batches || []).map(b => {
    const entry = getBatchStageEntryDate(b, b.stage) || '';
    const days = entry ? Math.max(0, Math.floor((new Date(iso) - new Date(entry)) / 86400000)) : 0;
    return { code: b.code || '(không mã)', stage: (STAGES[b.stage] || {}).short || b.stage || '', entry, days };
  }).filter(x => x.days >= 4).sort((a, b) => b.days - a.days);
  if (slow.length) out.push({ level: 'warn', text: `${slow.length} lô LÂU hơn 3 ngày tại công đoạn hiện tại: ${slow.slice(0, 5).map(x => `${x.code} (${x.stage}, ${x.days} ngày)`).join('; ')}${slow.length > 5 ? '…' : ''}` });
  // Chưa chấm công hôm nay
  const emps = (state.hrEmployees || []).filter(e => (e.status || 'active') === 'active');
  const unmarked = emps.filter(e => !attStatusOf(e.id, iso)).length;
  if (emps.length && unmarked > 0) out.push({ level: 'warn', text: `Chưa chấm công hôm nay cho ${unmarked}/${emps.length} nhân viên — vào thẻ "Chấm Công" để chấm.` });
  // Kế hoạch tuần này
  const weekLabel = getISOWeekString(iso);
  const year = String(new Date().getFullYear());
  const plan = (state.planningItems || []).filter(p => p.week === weekLabel && String(p.year || '') === year);
  if (!plan.length) out.push({ level: 'info', text: `${weekLabel}: chưa có kế hoạch sản xuất nào — vào tab Kế Hoạch để lập.` });
  else out.push({ level: 'ok', text: `${weekLabel}: ${plan.length} mục kế hoạch (tổng ${plan.reduce((a, p) => a + (p.qty || 0), 0)} sản phẩm).` });
  // Nguyên liệu 7 ngày
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const mat7 = (state.materialRecords || []).filter(r => (r.date || '') >= weekAgo);
  if (!mat7.length) out.push({ level: 'info', text: '7 ngày qua chưa nhập nguyên liệu nào — kiểm tra tab Nguyên Liệu.' });
  // Tất cả yên ổn
  if (!out.length) out.push({ level: 'ok', text: 'Không có cảnh báo nào — dữ liệu trong app đang ổn định.' });
  return out;
}

function renderAiReminders() {
  const box = document.getElementById('ai-reminders');
  if (!box) return;
  box.innerHTML = buildLocalReminders().map(r =>
    `<li class="${r.level}"><span>${r.level === 'warn' ? '⚠️' : (r.level === 'ok' ? '✅' : 'ℹ️')}</span><span>${escapeHTML(r.text)}</span></li>`).join('');
}

// ─── SỐ LIỆU GỬI AI (gọn — chỉ số then chốt) ───────────────────
function buildAiDataSummary() {
  const iso = aiTodayISO();
  const weekLabel = getISOWeekString(iso);
  const year = String(new Date().getFullYear());
  const L = [];
  L.push(`Hôm nay: ${iso} (${weekLabel}).`);
  // Lô nan theo công đoạn + lô chậm
  const batches = state.batches || [];
  const byStage = Object.values(STAGES).map(s => `${s.short}: ${(batches || []).filter(b => b.stage === s.id).length}`).join(', ');
  L.push(`Lô nan đang theo dõi: ${batches.length} (${byStage})`);
  const slow = batches.map(b => {
    const entry = getBatchStageEntryDate(b, b.stage) || '';
    const days = entry ? Math.max(0, Math.floor((new Date(iso) - new Date(entry)) / 86400000)) : 0;
    return { code: b.code || '(không mã)', stage: (STAGES[b.stage] || {}).short || '', entry, days };
  }).filter(x => x.days >= 4).sort((a, b) => b.days - a.days);
  if (slow.length) L.push('Lô chậm (>=4 ngày tại công đoạn hiện tại): ' + slow.slice(0, 6).map(x => `${x.code} — ${x.stage}, vào ${x.entry} (${x.days} ngày)`).join('; '));
  // Kế hoạch tuần này
  const plan = (state.planningItems || []).filter(p => p.week === weekLabel && String(p.year || '') === year);
  if (plan.length) L.push(`Kế hoạch ${weekLabel}: ` + plan.slice(0, 6).map(p => `${p.productName || 'Sản phẩm'} × ${p.qty || 0}`).join('; ') + ` (tổng ${plan.reduce((a, p) => a + (p.qty || 0), 0)})`);
  else L.push(`Kế hoạch ${weekLabel}: chưa có`);
  // Ép ván 7 ngày qua + tuần này
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const pr7 = (state.pressRecords || []).filter(r => (r.date || '') >= weekAgo);
  const prW = (state.pressRecords || []).filter(r => r.week === weekLabel && String(r.year || '') === year);
  L.push(`Ép ván 7 ngày qua: ${pr7.length} lượt, tổng ${pr7.reduce((a, r) => a + (r.finishedQty || 0), 0)} tấm thành phẩm; ${weekLabel}: ${prW.length} lượt, ${prW.reduce((a, r) => a + (r.finishedQty || 0), 0)} tấm`);
  // Nguyên liệu 7 ngày qua
  const mat7 = (state.materialRecords || []).filter(r => (r.date || '') >= weekAgo);
  L.push(`Nguyên liệu 7 ngày qua: ${mat7.length} lượt nhập, tổng trọng lượng ${mat7.reduce((a, r) => a + (r.weight || 0), 0)} kg`);
  // QC xuất hàng tuần này
  const qc = (state.qcExports || []).filter(q => q.week === weekLabel && String(q.year || '') === year);
  L.push(`QC xuất hàng ${weekLabel}: ${qc.length} dòng, tổng ${qc.reduce((a, q) => a + (q.qty || 0), 0)} sản phẩm`);
  // Nhân sự hôm nay
  const emps = (state.hrEmployees || []).filter(e => (e.status || 'active') === 'active');
  const att = { work: 0, leave: 0, absent: 0, unmarked: 0 };
  emps.forEach(e => {
    const st = attStatusOf(e.id, iso);
    if (st === 'work') att.work++; else if (st === 'leave') att.leave++; else if (st === 'absent') att.absent++; else att.unmarked++;
  });
  L.push(`Nhân sự: ${emps.length} người đang làm; hôm nay: đi làm ${att.work}, nghỉ phép ${att.leave}, vắng ${att.absent}, chưa chấm ${att.unmarked}`);
  const pendLeave = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;
  const pendOT = (state.hrOvertimes || []).filter(o => (o.status || 'pending') === 'pending').length;
  if (pendLeave || pendOT) L.push(`Chờ duyệt: ${pendLeave} đơn nghỉ phép, ${pendOT} đăng ký tăng ca`);
  const asgToday = (state.hrAssignments || []).filter(a => a.date === iso).length;
  L.push(`Bố trí vị trí hôm nay: ${asgToday} lượt gán`);
  // Lịch làm việc tháng này (nghỉ/lễ/làm bù)
  const cal = (state.hrWorkCalendar || {})[iso.slice(0, 7)];
  if (cal) L.push(`Lịch làm tháng này: ${(cal.restDays || []).length} ngày nghỉ/lễ riêng, ${(cal.workDays || []).length} ngày làm bù`);
  // Tổng theo THÁNG hiện tại — để trả lời được câu hỏi dạng "tháng này/tháng 9"
  const thisMonth = iso.slice(0, 7);
  const prM = (state.pressRecords || []).filter(r => String(r.date || '').slice(0, 7) === thisMonth);
  if (prM.length) L.push(`Ép ván tháng ${thisMonth}: ${prM.length} lượt, tổng ${prM.reduce((a, r) => a + (r.finishedQty || 0), 0)} tấm thành phẩm`);
  const matM = (state.materialRecords || []).filter(r => String(r.date || '').slice(0, 7) === thisMonth);
  if (matM.length) L.push(`Nguyên liệu tháng ${thisMonth}: ${matM.length} lượt nhập, tổng ${matM.reduce((a, r) => a + (r.weight || 0), 0)} kg`);
  return L.join('\n');
}

// ─── HỎI AI THEO YÊU CẦU TỰ DO ─────────────────────────────────
// Người dùng gõ câu hỏi vào ô #ai-question (VD: "Kế hoạch tuần này ổn chưa?",
// "Nguyên liệu tháng này đủ không?") → AI ưu tiên trả lời ĐÚNG câu hỏi đó,
// bám sát số liệu app gửi kèm. Từ khóa trong câu hỏi còn cho biết TRỌNG TÂM
// nên đọc dữ liệu nào (khử dấu để khớp cả khi gõ không dấu).
function aiNoAccent(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}
// Bảng từ khóa → nhãn tab/nội dung (viết KHÔNG DẤU để so nhanh)
const AI_TAB_FOCUS = [
  { label: 'Kế Hoạch SX (kế hoạch/dự báo/định mức/tồn kho)', words: ['ke hoach', 'du bao', 'dinh muc', 'ton kho', 'planning', 'khsx'] },
  { label: 'Ép Ván (sản lượng ép, thành phẩm)', words: ['ep van', 'press', 'san luong', 'thanh pham', 'so tam'] },
  { label: 'Nguyên Liệu (nhập liệu/nhà cung cấp/lò hơi/xưởng)', words: ['nguyen lieu', 'vat tu', 'nha cung cap', 'lo hoi', 'xuong 1', 'xuong 2', 'cung ung', 'nhap kho'] },
  { label: 'QC & Xuất Hàng (chất lượng, tỷ lệ đạt)', words: ['qc', 'xuat hang', 'chat luong', 'hang loi', 'ty le dat'] },
  { label: 'Nhân Sự (chấm công/nghỉ phép/tăng ca/bố trí)', words: ['nhan su', 'cham cong', 'nghi phep', 'tang ca', 'tuyen dung', 'bo tri', 'di lam', 'nhan vien', 'cong nhan'] },
  { label: 'Công Đoạn & Lô Nan (sấy/kho/bào tinh/chuyển lô)', words: ['lo nan', 'cong doan', 'say', 'kho luu tru', 'bao tinh', 'kanban', 'chuyen lo', 'batch'] },
  { label: 'Tổng Quan toàn nhà máy', words: ['tong quan', 'tong ket', 'bao cao', 'tinh hinh', 'tom tat', 'hom nay', 'thang nay', 'tuan nay'] }
];
// Trả về tối đa 3 nhãn trọng tâm khớp với câu hỏi ([] nếu không khớp gì)
function aiFocusTabsOf(question) {
  const q = aiNoAccent(question);
  if (!q) return [];
  const out = [];
  for (const t of AI_TAB_FOCUS) {
    if (t.words.some(w => q.includes(w))) out.push(t.label);
    if (out.length >= 3) break;
  }
  return out;
}

// ─── GỢI Ý TỰ ĐỘNG THEO TAB (2 TẦNG — "NAN BOT") ───────────────
// Tầng 1 (OFFLINE, miễn phí): tự tính "gói sự kiện" của tab hiện tại rồi
// chọn 1 câu vui từ kho mẫu (số liệu THẬT chèn trực tiếp) — hiện ngay trong
// bong bóng cạnh nút AI nổi, không cần mạng/key, hiện sau 0 mili giây.
// Tầng 2 (ONLINE, cần key): gửi gói sự kiện + tên người dùng cho Gemini với
// persona "Nan Bot" vui nhộn → câu lầy tự nhiên hơn, xong thì thay câu offline.
// Tiết chế (tránh phiền + tránh đốt quota miễn phí của Gemini):
//   · mỗi tab + mỗi MỨC dữ liệu chỉ nói 1 lần/ngày (ai_nudge_seen_v1 — vừa là
//     "đã nói" vừa là cache: quay lại tab cũ với cùng số liệu → không nói lại)
//   · tầng AI tối đa AI_TALK_DAILY_MAX lượt/ngày (ai_talk_quota_v1)
//   · công tắc bật/tắt (ai_autogreet_v1, mặc định BẬT) — checkbox trong modal
const AI_TALK_DAILY_MAX = 20; // lượt gọi Gemini "tán gẫu" tối đa mỗi ngày/máy
const AI_AUTOGREET_STORAGE = 'bamboo_tracker_ai_autogreet_v1';
const AI_TALK_QUOTA_STORAGE = 'bamboo_tracker_ai_talk_quota_v1';
const AI_NUDGE_SEEN_STORAGE = 'bamboo_tracker_ai_nudge_seen_v1';
const AI_TAB_LABELS = {
  'dashboard-view': 'Tổng Quan',
  'kanban-view': 'Công Đoạn (Kanban)',
  'planning-view': 'Kế Hoạch SX',
  'press-view': 'Ép Ván',
  'materials-view': 'Nguyên Liệu',
  'qc-view': 'QC & Xuất Hàng',
  'hr-view': 'Nhân Sự'
};

function aiAutoGreetOn() {
  try { const v = localStorage.getItem(AI_AUTOGREET_STORAGE); return v === null ? true : v !== '0'; } catch (e) { return true; }
}
function aiSetAutoGreet(on) {
  try { localStorage.setItem(AI_AUTOGREET_STORAGE, on ? '1' : '0'); } catch (e) {}
  const cb = document.getElementById('ai-autogreet-toggle');
  if (cb) cb.checked = !!on;
  showToast(on ? 'Đã BẬT gợi ý tự động vui nhộn khi chuyển tab.' : 'Đã TẮT gợi ý tự động — bấm nút AI bất cứ lúc nào để hỏi.', 'info');
}
// Tên để chào: chữ CUỐI của họ tên đầy đủ ("Nguyễn Văn A" → "A"), không có thì dùng username
function aiUserFirstName() {
  const u = state.currentUser || {};
  const full = String(u.fullname || u.username || '').trim();
  if (!full) return 'bạn';
  const parts = full.split(/\s+/);
  return parts[parts.length - 1];
}
// Hash FNV-1a gọn — nhận biết "mức dữ liệu" của tab có đổi hay không
function aiFactHash(s) {
  let h = 0x811c9dc5;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
}
// Tiến độ ép so kế hoạch TUẦN này (cùng nguồn với biểu đồ Kế Hoạch vs Đã Ép)
function aiWeekPressPct() {
  const iso = aiTodayISO();
  const weekLabel = getISOWeekString(iso);
  const year = String(new Date().getFullYear());
  const planQty = (state.planningItems || []).filter(p => p.week === weekLabel && String(p.year || '') === year).reduce((a, p) => a + (p.qty || 0), 0);
  const pressQty = (state.pressRecords || []).filter(r => r.week === weekLabel && String(r.year || '') === year).reduce((a, r) => a + (r.finishedQty || 0), 0);
  const d = new Date(iso).getDay();
  const dow = d === 0 ? 7 : d; // số ngày đã qua trong tuần (T2..CN = 1..7)
  const pct = planQty > 0 ? Math.round((pressQty / planQty) * 100) : null;
  const onPace = pct === null ? true : pct >= (dow / 7) * 100 - 15; // lệch nhịp >15% mới la
  return { weekLabel, planQty, pressQty, pct, dow, onPace };
}
// Lô nan nằm ì >=4 ngày tại công đoạn hiện tại
function aiSlowBatches() {
  const iso = aiTodayISO();
  return (state.batches || []).map(b => {
    const entry = getBatchStageEntryDate(b, b.stage) || '';
    const days = entry ? Math.max(0, Math.floor((new Date(iso) - new Date(entry)) / 86400000)) : 0;
    return { code: b.code || '(không mã)', stage: (STAGES[b.stage] || {}).short || '', days };
  }).filter(x => x.days >= 4).sort((a, b) => b.days - a.days);
}

// Gói sự kiện của 1 tab — nguồn số liệu chung cho CẢ tầng offline lẫn tầng AI
function aiTabContextOf(viewId) {
  const iso = aiTodayISO();
  const weekLabel = getISOWeekString(iso);
  const year = String(new Date().getFullYear());
  const week = aiWeekPressPct();
  const slow = aiSlowBatches();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const mat7 = (state.materialRecords || []).filter(r => (r.date || '') >= weekAgo);
  const mat7kg = mat7.reduce((a, r) => a + (r.weight || 0), 0);
  const qcW = (state.qcExports || []).filter(q => q.week === weekLabel && String(q.year || '') === year);
  const qcQty = qcW.reduce((a, q) => a + (q.qty || 0), 0);
  const emps = (state.hrEmployees || []).filter(e => (e.status || 'active') === 'active');
  const unmarked = emps.filter(e => !attStatusOf(e.id, iso)).length;
  const pendLeave = (state.hrLeaves || []).filter(l => (l.status || 'pending') === 'pending').length;
  const pendOT = (state.hrOvertimes || []).filter(o => (o.status || 'pending') === 'pending').length;
  const facts = [];
  let warn = false;
  const push = (text, isWarn) => { facts.push(text); if (isWarn) warn = true; };
  // Tiến độ kế hoạch vs đã ép (Tổng Quan / Kế Hoạch / Ép Ván)
  if (viewId === 'planning-view' && !week.planQty) push(`Kế hoạch tuần ${weekLabel}: CHƯA CÓ mục nào — cần lập gấp`, true);
  if (week.planQty > 0) push(`Kế hoạch ${weekLabel}: ${week.planQty} sản phẩm, đã ép ${week.pressQty} tấm thành phẩm (${week.pct}%) sau ${week.dow}/7 ngày`, !week.onPace);
  // Thẻ ÉP VÁN (launcher Xưởng 2) nay nằm TRONG tab Công Đoạn → nhận diện qua
  // state.x2OpenCardId để gợi ý AI nói đúng ngữ cảnh Ép Ván như trước.
  const epVanCardOpen = state.x2OpenCardId === 'x2-ep-van-card';
  const isPressCtx = viewId === 'press-view' || epVanCardOpen;
  if ((isPressCtx || viewId === 'dashboard-view' || viewId === 'kanban-view') && slow.length) {
    push(`Lô chậm: ${slow.slice(0, 4).map(x => `${x.code} (${x.stage}, ${x.days} ngày)`).join('; ')}${slow.length > 4 ? '…' : ''} — tổng ${slow.length} lô`, true);
  }
  if (isPressCtx || viewId === 'dashboard-view') {
    const pr7 = (state.pressRecords || []).filter(r => (r.date || '') >= weekAgo);
    push(`Ép ván 7 ngày qua: ${pr7.length} lượt, ${pr7.reduce((a, r) => a + (r.finishedQty || 0), 0)} tấm thành phẩm`, false);
  }
  if (viewId === 'materials-view' || viewId === 'dashboard-view') push(`Nguyên liệu 7 ngày qua: ${mat7.length} lượt nhập, ${mat7kg} kg`, mat7.length === 0);
  if (viewId === 'qc-view' || viewId === 'dashboard-view') push(`QC xuất hàng ${weekLabel}: ${qcQty} sản phẩm (${qcW.length} dòng)`, qcW.length === 0 && week.planQty > 0);
  if (viewId === 'hr-view' || viewId === 'dashboard-view') {
    if (emps.length) push(`Nhân sự hôm nay: ${emps.length} người đang làm, chưa chấm ${unmarked}`, unmarked > 0);
    if (pendLeave || pendOT) push(`Chờ duyệt: ${pendLeave} đơn nghỉ phép, ${pendOT} đăng ký tăng ca`, true);
  }
  if (!facts.length) push(`Tab ${AI_TAB_LABELS[viewId] || viewId}: không có số liệu nóng hổi nào hôm nay`, false);
  return {
    viewId,
    // Thẻ Ép Ván đang mở ở tab Công Đoạn → coi như ngữ cảnh "Ép Ván"
    tabLabel: epVanCardOpen ? 'Ép Ván' : (AI_TAB_LABELS[viewId] || 'Tổng Quan'),
    facts, warn, week, slow, mat7Count: mat7.length, mat7kg, qcQty, emps: emps.length, unmarked, pendLeave, pendOT
  };
}

// Kho mẫu câu vui TẦNG OFFLINE — số liệu chèn trực tiếp nên 100% đúng thực tế.
// Chọn ngẫu nhiên trong pool ứng viên để cùng một tình huống không bị lặp mệt.
function aiOfflineNudge(ctx) {
  const name = aiUserFirstName();
  const w = ctx.week || {};
  const P = [];
  if (ctx.viewId === 'planning-view' && w.planQty === 0) {
    P.push(`Chào ${name}! Tuần ${w.weekLabel} còn TRỐNG kế hoạch — vô tab Kế Hoạch lập phát đi ông bạn ơi, AI đây rỗi rãi mà không có gì để soi! 📝`);
    P.push(`Ê ${name}! Tuần ${w.weekLabel} chưa có kế hoạch nào — máy ép đang... ngủm cũm vì không có lệnh! Vào lập kế hoạch đi nha 📝`);
  }
  if (w.planQty > 0 && w.pct !== null && !w.onPace) {
    P.push(`Chào ${name}! 🚨 Tuần ${w.weekLabel} mới ép được ${w.pct}% kế hoạch mà đã ${w.dow}/7 ngày rồi — nguy to ông ơi! Kiểm tra ông nhập liệu xem đã nhập đủ chưa nha 😅`);
    P.push(`Ối chào ${name}! Kế hoạch tuần ${w.weekLabel} đang nằm ở ${w.pct}% sau ${w.dow} ngày — nhịp này cuối tuần "ăn đâu" đây ta? 🤔 Soi lại số liệu nhập giúp tui nhé!`);
    P.push(`${name} ơi, tình hình là tuần ${w.weekLabel} mới chạy ${w.pct}% dù đã ${w.dow}/7 ngày — tui nhìn mà nóng cả người! 💦 Xem lại số liệu ép đi rồi tính đường lột xác nha 💪`);
  } else if (w.planQty > 0 && w.pct !== null) {
    P.push(`Chào ${name}! Tuần ${w.weekLabel} nhà mình đang chạy ${w.pct}% kế hoạch sau ${w.dow}/7 ngày — nhịp ổn áp đó, giữ lửa nha! 🔥`);
    P.push(`Chào ${name}! ${w.pct}% kế hoạch tuần ${w.weekLabel} sau ${w.dow} ngày — không tệ nhé ông! Cố thêm chút là "gác cờ" sớm 😎`);
  }
  if ((ctx.slow || []).length) {
    const s0 = ctx.slow[0];
    P.push(`${name} ơi, có ${ctx.slow.length} lô nan nằm ì hơn 3 ngày (VD ${s0.code} — ${s0.stage}, ${s0.days} ngày) — nan tre không phải rượu, nằm lâu không tự ngon hơn đâu! 😏`);
    P.push(`Chào ${name}! ${ctx.slow.length} lô đang "ngủ quên" tại công đoạn — AI nghe thấy tiếng ngáy rồi đó! Đẩy chúng đi nha 🚚`);
  }
  if (ctx.viewId === 'materials-view') {
    if (!ctx.mat7Count) P.push(`Chào ${name}! 7 ngày qua KHÔNG có lượt nhập nguyên liệu nào — kho sắp "đói" rồi ông ơi 🌾 Kiểm tra nguồn cung đi!`);
    else P.push(`Chào ${name}! Nguyên liệu 7 ngày qua: ${ctx.mat7Count} lượt, ${ctx.mat7kg} kg — kho đang "đầy bụng", cứ thế mà ép! 💪`);
  }
  if (ctx.viewId === 'qc-view') {
    if (ctx.qcQty === 0 && w.planQty > 0) P.push(`Chào ${name}! Tuần ${w.weekLabel} chưa xuất được sản phẩm nào qua QC — hàng ép xong đang "kẹt xe" kìa! 🚦 Xuất hàng đi rồi tính!`);
    else if (ctx.qcQty > 0) P.push(`Chào ${name}! QC tuần ${w.weekLabel} đã xuất ${ctx.qcQty} sản phẩm — hàng về đều như vầy là vui rồi! 📦`);
  }
  if (ctx.viewId === 'hr-view') {
    if (ctx.unmarked > 0) P.push(`${name} ơi, ${ctx.unmarked}/${ctx.emps} người chưa chấm công hôm nay — AI không biết ai đi làm, ai "trốn đâu" nữa 😏 Chấm nhanh đi!`);
    if (ctx.pendLeave || ctx.pendOT) P.push(`Chào ${name}! Đang có ${ctx.pendLeave} đơn nghỉ + ${ctx.pendOT} tăng ca chờ duyệt — duyệt đi rồi mọi người yên tâm "cày" nha 😉`);
  }
  if (!P.length) {
    P.push(`Chào ${name}! Tab ${ctx.tabLabel} nhìn sơ hôm nay ổn áp, không có gì nóng hổi — cứ từ từ mà "cày" nha! 😎`);
    P.push(`Chào ${name}! Tui vừa quét qua ${ctx.tabLabel}: không thấy vấn đề gấp nào — yên tâm uống ngụm trà rồi làm tiếp nhé ☕`);
  }
  return P[Math.floor(Math.random() * P.length)];
}

// ─── BONG BÓNG NÓI GẮN NÚT AI ──────────────────────────────────
let aiBubbleTimer = null;

// Đặt bong bóng ngay TRÊN nút AI, neo về mép gần tâm màn hình hơn để không tràn
function aiSyncBubblePos() {
  const btn = document.getElementById('btn-open-ai');
  const bubble = document.getElementById('ai-fab-bubble');
  if (!btn || !bubble) return;
  const r = btn.getBoundingClientRect();
  const vp = aiFabViewport();
  bubble.style.top = 'auto';
  bubble.style.bottom = (vp.h - r.top + 10) + 'px'; // nổi phía trên nút
  if (r.left + r.width / 2 > vp.w / 2) {
    bubble.classList.add('anchor-right'); bubble.classList.remove('anchor-left');
    bubble.style.right = Math.max(8, vp.w - r.right) + 'px';
    bubble.style.left = 'auto';
  } else {
    bubble.classList.add('anchor-left'); bubble.classList.remove('anchor-right');
    bubble.style.left = Math.max(8, r.left) + 'px';
    bubble.style.right = 'auto';
  }
}
function aiShowBubble(html, stayLong) {
  const bubble = document.getElementById('ai-fab-bubble');
  if (!bubble) return;
  const txt = document.getElementById('ai-fab-bubble-text');
  if (txt) txt.innerHTML = html;
  bubble.classList.add('show');
  aiSyncBubblePos();
  if (aiBubbleTimer) clearTimeout(aiBubbleTimer);
  aiBubbleTimer = setTimeout(() => aiHideBubble(), stayLong ? 20000 : 14000); // tự ẩn để không phiền
}
function aiHideBubble() {
  const bubble = document.getElementById('ai-fab-bubble');
  if (bubble) bubble.classList.remove('show');
  const dots = document.getElementById('ai-fab-bubble-thinking');
  if (dots) dots.classList.remove('show');
  if (aiBubbleTimer) { clearTimeout(aiBubbleTimer); aiBubbleTimer = null; }
}
// Quota tầng AI: tối đa AI_TALK_DAILY_MAX lượt/ngày để không đốt hạn mức miễn phí
function aiTalkQuotaTake() {
  try {
    const today = aiTodayISO();
    let q = {};
    try { q = JSON.parse(localStorage.getItem(AI_TALK_QUOTA_STORAGE) || '{}'); } catch (e) {}
    if (q.date !== today) q = { date: today, used: 0 };
    if ((q.used || 0) >= AI_TALK_DAILY_MAX) return false;
    q.used = (q.used || 0) + 1;
    localStorage.setItem(AI_TALK_QUOTA_STORAGE, JSON.stringify(q));
    return true;
  } catch (e) { return false; }
}
// Prompt persona "Nan Bot" tầng AI — CHỈ được dùng số liệu gửi kèm (không bịa)
function buildAiTalkPrompt(ctx) {
  const name = aiUserFirstName();
  const wk = (ctx.week && ctx.week.weekLabel) || getISOWeekString(aiTodayISO());
  return [
    'Bạn là "Nan Bot" — trợ lý AI vui nhộn của nhà máy nan tre Ngọc Sơn (Thanh Hóa).',
    `Nhiệm vụ: nói MỘT câu NGẮN (tối đa 45 từ, không gạch đầu dòng) chào "${name}" và nhận xét nhanh tình hình tab ${ctx.tabLabel} dựa CHỈ vào số liệu dưới đây.`,
    'Giọng điệu: đồng nghiệp vui tính, thân thiện kiểu "tui/bạn/ông", được dùng 1-2 emoji, có thể trêu nhẹ về công việc NHƯNG không chê bai cá nhân, không xúc phạm, không nhắc chuyện ngoài nhà máy.',
    'Nếu số liệu ổn → khen vui vẻ; nếu có cảnh báo → nhắc việc cần làm một cách hài hước. KHÔNG bịa số liệu, KHÔNG hỏi lại, chỉ trả đúng 1 câu.',
    '',
    `Hôm nay: ${aiTodayISO()} (${wk}). Người dùng: ${name}.`,
    `=== SỐ LIỆU TAB ${ctx.tabLabel} ===`,
    ctx.facts.join('\n')
  ].join('\n');
}
// Gọi mỗi khi chuyển tab (hook switchView) + 1 lần lúc vừa mở app — main.js
function aiAutoGreet(viewId) {
  if (!aiAutoGreetOn()) return;   // công tắc tắt — im re
  if (!state.currentUser) return; // chưa đăng nhập — đừng chào người lạ 😄
  const ctx = aiTabContextOf(viewId);
  const hash = aiFactHash(viewId + '#' + ctx.facts.join(' | '));
  // Mỗi tab + mỗi mức dữ liệu chỉ nói 1 lần/ngày (đổi số liệu là được nói lại)
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(AI_NUDGE_SEEN_STORAGE) || '{}'); } catch (e) {}
  const today = aiTodayISO();
  if (seen.date !== today) seen = { date: today, tabs: {} };
  if (!seen.tabs) seen.tabs = {};
  if (seen.tabs[viewId] === hash) return;
  seen.tabs[viewId] = hash;
  try { localStorage.setItem(AI_NUDGE_SEEN_STORAGE, JSON.stringify(seen)); } catch (e) {}
  // TẦNG 1: câu offline hiện NGAY (số thật — không chờ, không tốn gì)
  aiShowBubble(escapeHTML(aiOfflineNudge(ctx)).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'), false);
  // TẦNG 2: Gemini "lầy" hơn — chỉ khi có key + mạng + còn quota; xong thì thay câu
  if (!aiKeyOf() || !navigator.onLine) return;
  if (!aiTalkQuotaTake()) return;
  const dots = document.getElementById('ai-fab-bubble-thinking');
  if (dots) dots.classList.add('show'); // hiệu ứng "đang suy nghĩ…"
  callGemini(buildAiTalkPrompt(ctx))
    .then((txt) => {
      const t = String(txt || '').trim().replace(/\s+/g, ' ');
      const bubble = document.getElementById('ai-fab-bubble');
      if (t && bubble && bubble.classList.contains('show')) {
        aiShowBubble(`🤖 <b>Nan Bot:</b> ${escapeHTML(t.slice(0, 300))}`, true);
      }
    })
    .catch(() => { /* lỗi AI — giữ nguyên câu offline, không phiền người dùng */ })
    .finally(() => { const d2 = document.getElementById('ai-fab-bubble-thinking'); if (d2) d2.classList.remove('show'); });
}

// ─── PROMPT GỬI GEMINI ─────────────────────────────────────────
// question (tùy chọn): yêu cầu tự do người dùng gõ — có thì thêm mục
// "YÊU CẦU CỤ THỂ" vào prompt; không có thì phân tích tổng quát như cũ.
function buildAiPrompt(question) {
  const q = String(question || '').trim().slice(0, 500); // chặn câu hỏi quá dài
  const focus = q ? aiFocusTabsOf(q) : [];
  const lines = [
    'Bạn là trợ lý quản lý sản xuất tại nhà máy nan tre (dòng chảy: Kế hoạch → Ép ván → Nguyên liệu → Sấy 1 → Sấy 2 → Kho lưu trữ → Bào tinh → QC xuất hàng; tab Nhân sự theo dõi chấm công, tăng ca, nghỉ phép).',
    'Dưới đây là SỐ LIỆU THỰC trích từ phần mềm. Hãy trả lời theo 3 phần:',
    '1) TÓM TẮT — tình hình sản xuất hôm nay (2–4 gạch đầu dòng).',
    '2) CẢNH BÁO / NHẮC VIỆC — những việc cần xử lý gấp (lô chậm, thiếu dữ liệu, đơn chờ duyệt, người vắng, kế hoạch thiếu...).',
    '3) GỢI Ý — 2–4 việc nên làm ngay, ghi rõ mức ưu tiên.',
    'QUY TẮC: trả lời TIẾNG VIỆT, NGẮN GỌN, dùng gạch đầu dòng với nhãn **in đậm**; CHỈ dựa vào số liệu được cung cấp, KHÔNG bịa thêm số liệu; nếu thiếu dữ liệu thì ghi "chưa có dữ liệu".'
  ];
  if (q) {
    lines.push('', '=== YÊU CẦU CỤ THỂ CỦA NGƯỜI DÙNG (ưu tiên trả lời đúng câu này) ===', q);
    if (focus.length) lines.push(`Trọng tâm dữ liệu: ${focus.join(' · ')}.`);
    lines.push('Với câu hỏi này: vẫn trả theo 3 phần trên nhưng phần KHÔNG liên quan viết ngắn nhất có thể; trả lời bám sát số liệu bên dưới (so sánh, tính chênh lệch/tỷ lệ nếu câu hỏi cần); nếu số liệu gửi kèm chưa đủ để trả lời thì nói rõ thiếu gì.');
  }
  lines.push('', '=== SỐ LIỆU TỪ PHẦN MỀM ===', buildAiDataSummary());
  return lines.join('\n');
}

// ─── GỌI GEMINI (REST generateContent — gói miễn phí) ──────────
// Model mới nhất dễ bị QUÁ TẢI ("high demand") trên gói miễn phí → chế độ
// "Tự động" sẽ thử LẦN LƯỢT danh sách model (ưu tiên model đã chạy thành
// công gần nhất, rồi các model flash-lite/flash cũ hơn — nhẹ, đủ dùng cho
// nhắc việc/phân tích đơn giản). Người dùng chọn model CỤ THỂ thì không tự đổi.
let aiLastUsedModel = '';

// Phân loại lỗi trả về để quyết định có thử model kế tiếp hay không
function aiErrInfo(payload, status) {
  const msg = String((payload && payload.error && payload.error.message) || '');
  const code = String((payload && payload.error && payload.error.status) || '');
  const blob = code + ' ' + msg;
  if (status === 400 && /API key not valid/i.test(blob)) return { kind: 'badkey', msg: msg || 'API key không hợp lệ' };
  if (status === 404 || /NOT_FOUND/i.test(blob)) return { kind: 'notfound', msg: msg || 'Model không tồn tại' };
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(blob)) return { kind: 'quota', msg };
  if (status === 503 || /high demand|overload|UNAVAILABLE/i.test(blob)) return { kind: 'busy', msg };
  return { kind: 'other', msg: msg || `Lỗi HTTP ${status}` };
}

async function aiCallOne(model, prompt, key) {
  const res = await fetch(`${AI_ENDPOINT}${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1600 }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { err: aiErrInfo(data, res.status) };
  const cand = data && data.candidates && data.candidates[0];
  const text = cand && cand.content && Array.isArray(cand.content.parts)
    ? cand.content.parts.map(p => p.text || '').join('') : '';
  if (!text) return { err: { kind: 'other', msg: 'AI không trả về nội dung (có thể do chính sách an toàn — thử lại sau).' } };
  return { text };
}

async function callGemini(prompt) {
  const key = aiKeyOf();
  if (!key) throw new Error('Chưa cấu hình API key Gemini');
  const choice = aiModelChoice();
  const models = choice !== 'auto'
    ? [choice]
    : [aiModelWorking(), ...AI_MODEL_CANDIDATES].filter((m, i, a) => m && a.indexOf(m) === i);
  let lastErr = null;
  for (const m of models) {
    const r = await aiCallOne(m, prompt, key);
    if (r.text) {
      try { localStorage.setItem(AI_MODEL_OK_STORAGE, m); } catch (e) {}
      aiLastUsedModel = m;
      return r.text;
    }
    lastErr = r.err || { kind: 'other', msg: 'Lỗi không xác định' };
    // Model ĐÃ THÀNH CÔNG trước đó mà giờ báo không tồn tại (bị Google loại
    // bỏ với key mới, VD các model 2.x) → gỡ khỏi bộ nhớ để không tốn 1 lượt
    // gọi nữa ở các lần sau.
    if (lastErr.kind === 'notfound' && m === aiModelWorking()) {
      try { localStorage.removeItem(AI_MODEL_OK_STORAGE); } catch (e) {}
    }
    if (lastErr.kind === 'badkey') break;  // key sai — thử model khác cũng vô ích
    if (choice !== 'auto') break;          // người dùng chọn model cụ thể → không tự đổi
  }
  const VI = {
    busy: 'Model đang QUÁ TẢI (high demand) — thử lại sau ít phút.',
    quota: 'Hết hạn mức miễn phí (quota) — thử lại sau ít phút hoặc chọn model nhẹ hơn.',
    notfound: 'Model không tồn tại với key này — nên để "Tự động chọn model".',
    badkey: 'API key KHÔNG hợp lệ — kiểm tra lại key lấy từ Google AI Studio.',
    other: ''
  };
  const viMsg = VI[(lastErr && lastErr.kind) || 'other'] || '';
  const tried = choice === 'auto' ? ` — đã thử: ${models.join(', ')}` : '';
  throw new Error(`${viMsg}${lastErr && lastErr.msg ? ' (' + lastErr.msg + ')' : ''}${tried}`.trim());
}

// Đổi text AI (markdown gạch đầu dòng + **đậm**) → HTML an toàn
function aiTextToHtml(text) {
  return escapeHTML(String(text || ''))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ─── CHẠY PHÂN TÍCH ────────────────────────────────────────────
async function runAiAnalysis() {
  const out = document.getElementById('ai-output');
  if (!navigator.onLine) { showToast('Mất mạng — Phân tích AI cần internet (phần "Nhắc Việc" vẫn dùng được offline).', 'error'); return; }
  if (!aiKeyOf()) { syncAiKeyRow(); showToast('Chưa có API key Gemini — dán key miễn phí từ aistudio.google.com rồi bấm "Lưu Key".', 'error'); return; }
  if (out) out.innerHTML = '<span class="ai-thinking"><i></i><i></i><i></i> Đang suy nghĩ…</span>';
  const btn = document.getElementById('btn-ai-run');
  if (btn) btn.disabled = true;
  // Câu hỏi tự do của người dùng (ô #ai-question) — để trống = phân tích tổng quát
  const qEl = document.getElementById('ai-question');
  const question = String((qEl && qEl.value) || '').trim();
  try {
    aiLastResult = await callGemini(buildAiPrompt(question));
    if (out) out.innerHTML = (question
      ? `<div class="ai-q-echo">❓ <b>${escapeHTML(question.slice(0, 200))}</b></div>`
      : '') + aiTextToHtml(aiLastResult);
    showToast(`Đã nhận trả lời từ Gemini${aiLastUsedModel ? ` (model ${aiLastUsedModel})` : ''}${question ? ' — theo yêu cầu bạn gõ' : ''}.`, 'success');
  } catch (err) {
    aiLastResult = '';
    if (out) out.innerHTML = `<span class="ai-error">Lỗi: ${escapeHTML((err && err.message) || String(err))}</span>`;
    showToast('Gọi AI thất bại: ' + ((err && err.message) || err), 'error');
  } finally {
    if (btn) btn.disabled = false;
    syncAiKeyRow(); // cập nhật nhãn model đã dùng
    initLucide();
  }
}

// Chép kết quả AI
function copyAiResult() {
  const text = String(aiLastResult || '');
  if (!text) { showToast('Chưa có kết quả AI để chép — bấm "Phân Tích Bằng AI" trước.', 'info'); return; }
  const done = () => showToast('Đã chép kết quả AI vào clipboard!', 'success');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    if (ta.select) ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  } catch (e) { showToast('Không chép được — hãy bôi đen kết quả và Ctrl+C.', 'info'); }
}

// Chip "hỏi nhanh": điền câu hỏi mẫu vào ô hỏi rồi chạy phân tích luôn
function aiQuickAsk(text) {
  const ta = document.getElementById('ai-question');
  if (ta) ta.value = String(text || '');
  return runAiAnalysis();
}

// ─── NÚT NỔI KÉO DI CHUYỂN ĐƯỢC ────────────────────────────────
// Giữ + rê nút "AI" để đặt lại chỗ tùy ý (chuột lẫn cảm ứng), thả tay là
// neo lại. Vị trí lưu CỤC BỘ dạng TỈ LỆ khung nhìn (bamboo_tracker_ai_fab_
// pos_v1) nên đổi cỡ cửa sổ / xoay ngang điện thoại vẫn giữ đúng chỗ.
// Phân biệt CHẠM (mở modal) với KÉO bằng ngưỡng dời 6px — sau khi kéo,
// cú click sinh ra sẽ bị chặn qua aiFabDragConsumed().
const AI_FAB_POS_STORAGE = 'bamboo_tracker_ai_fab_pos_v1';
const AI_FAB_DRAG_THRESHOLD = 6; // px — dời ít hơn coi là CHẠM, xa hơn là KÉO
const AI_FAB_EDGE = 8;           // px — mép an toàn, không cho nút chui khỏi màn hình
let aiFabDragMoved = false;      // lần chạm vừa rồi có phải là KÉO (chặn click mở modal)

// Kích thước khung nhìn (mặc định an toàn nếu môi trường không cung cấp)
function aiFabViewport() {
  return {
    w: Math.max((typeof window !== 'undefined' && window.innerWidth) || 0, 320),
    h: Math.max((typeof window !== 'undefined' && window.innerHeight) || 0, 240)
  };
}
// Kẹp toạ độ trái/trên để nút luôn nằm trọn trong khung nhìn
function aiFabClamp(left, top, w, h) {
  const vp = aiFabViewport();
  return {
    left: Math.min(Math.max(left, AI_FAB_EDGE), Math.max(AI_FAB_EDGE, vp.w - w - AI_FAB_EDGE)),
    top: Math.min(Math.max(top, AI_FAB_EDGE), Math.max(AI_FAB_EDGE, vp.h - h - AI_FAB_EDGE))
  };
}
// Đặt nút về chỗ đã lưu (quy đổi tỉ lệ → px theo khung nhìn hiện tại)
function restoreAiFabPos(btn) {
  try {
    const raw = localStorage.getItem(AI_FAB_POS_STORAGE);
    if (!raw) return; // chưa từng kéo — giữ vị trí mặc định góc phải dưới
    const pos = JSON.parse(raw);
    if (!pos || typeof pos.fx !== 'number' || typeof pos.fy !== 'number') return;
    const rect = btn.getBoundingClientRect();
    const vp = aiFabViewport();
    const w = (rect && rect.width) || 48, h = (rect && rect.height) || 48;
    const p = aiFabClamp(pos.fx * Math.max(1, vp.w - w), pos.fy * Math.max(1, vp.h - h), w, h);
    btn.style.left = p.left + 'px';
    btn.style.top = p.top + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  } catch (e) { /* dữ liệu hỏng — bỏ qua, dùng vị trí mặc định */ }
}
// Ghi nhớ vị trí sau khi thả tay (không lưu được thì kéo vẫn chạy, chỉ không nhớ chỗ)
function saveAiFabPos(btn) {
  try {
    const rect = btn.getBoundingClientRect();
    const vp = aiFabViewport();
    const w = (rect && rect.width) || 48, h = (rect && rect.height) || 48;
    localStorage.setItem(AI_FAB_POS_STORAGE, JSON.stringify({
      fx: Math.min(1, Math.max(0, ((rect && rect.left) || 0) / Math.max(1, vp.w - w))),
      fy: Math.min(1, Math.max(0, ((rect && rect.top) || 0) / Math.max(1, vp.h - h)))
    }));
  } catch (e) { /* bỏ qua */ }
}
// Dùng trong handler click nút AI: cú chạm vừa rồi là KÉO → bỏ qua (không mở modal)
function aiFabDragConsumed() {
  const consumed = aiFabDragMoved;
  aiFabDragMoved = false; // xoá cờ cho lần chạm kế tiếp
  return consumed;
}

// Gắn sự kiện kéo cho nút AI (gọi 1 lần trong setupEventListeners — có chống gắn trùng)
function initAiFabDrag() {
  const btn = document.getElementById('btn-open-ai');
  if (!btn || btn.dataset.aiFabDrag) return;
  btn.dataset.aiFabDrag = '1';
  restoreAiFabPos(btn);
  let drag = null; // { pid, x0, y0, l0, t0, w, h }

  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return; // chỉ nhận nút trái / cảm ứng
    aiFabDragMoved = false;
    const rect = btn.getBoundingClientRect();
    drag = {
      pid: e.pointerId, x0: e.clientX, y0: e.clientY,
      w: (rect && rect.width) || 48, h: (rect && rect.height) || 48,
      l0: (rect && rect.left) || 0, t0: (rect && rect.top) || 0
    };
    // Bắt giữ con trỏ: rê ra ngoài nút vẫn nhận được move/up (thuận cho cảm ứng)
    try { btn.setPointerCapture && btn.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
  });
  btn.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!aiFabDragMoved && Math.hypot(dx, dy) < AI_FAB_DRAG_THRESHOLD) return; // còn trong ngưỡng chạm
    if (!aiFabDragMoved) {
      aiFabDragMoved = true;
      btn.classList.add('ai-fab-dragging'); // phóng nhẹ + tắt transition để nút bám tay
      btn.style.right = 'auto'; // chuyển sang định vị trái/trên để tính tay toàn bộ
      btn.style.bottom = 'auto';
    }
    const p = aiFabClamp(drag.l0 + dx, drag.t0 + dy, drag.w, drag.h);
    btn.style.left = p.left + 'px';
    btn.style.top = p.top + 'px';
    aiSyncBubblePos(); // bong bóng "Nan Bot" bám theo nút khi kéo
    if (e.cancelable && typeof e.preventDefault === 'function') e.preventDefault(); // chặn chọn chữ / kéo trang khi rê
  });
  const endDrag = (e, cancelled) => {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.pid)) return;
    const d = drag; drag = null;
    btn.classList.remove('ai-fab-dragging');
    try { btn.releasePointerCapture && btn.releasePointerCapture(d.pid); } catch (err) { /* bỏ qua */ }
    if (aiFabDragMoved && !cancelled) saveAiFabPos(btn); // thả tay đúng lúc đang kéo → nhớ chỗ
  };
  btn.addEventListener('pointerup', (e) => endDrag(e, false));
  btn.addEventListener('pointercancel', (e) => endDrag(e, true));
  // Chặn bôi đen văn bản khi kéo trên desktop
  btn.addEventListener('selectstart', (e) => { if (aiFabDragMoved && typeof e.preventDefault === 'function') e.preventDefault(); });
  // Đổi cỡ cửa sổ → kẹp nút lại trong khung nhìn theo vị trí hiện tại
  try {
    window.addEventListener('resize', () => {
      const b = document.getElementById('btn-open-ai');
      if (!b) return;
      const rect = b.getBoundingClientRect();
      if (!rect || !rect.width) return; // chưa đo được — bỏ qua
      const p = aiFabClamp(rect.left || 0, rect.top || 0, rect.width, rect.height);
      b.style.left = p.left + 'px';
      b.style.top = p.top + 'px';
      b.style.right = 'auto';
      b.style.bottom = 'auto';
      aiSyncBubblePos(); // bong bóng cũng kẹp lại theo khung nhìn mới
    });
  } catch (e) { /* môi trường không có window.addEventListener */ }
}

export {
  openAiAssistant,
  closeAiAssistant,
  aiSaveKey,
  aiToggleKey,
  aiSetModel,
  runAiAnalysis,
  copyAiResult,
  buildLocalReminders,
  buildAiDataSummary,
  buildAiPrompt,
  aiFocusTabsOf,
  aiQuickAsk,
  aiTextToHtml,
  callGemini,
  initAiFabDrag,
  aiFabDragConsumed,
  aiAutoGreet,
  aiHideBubble,
  aiSetAutoGreet,
  aiTabContextOf,
  aiOfflineNudge
};
