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
  return L.join('\n');
}

// ─── PROMPT GỬI GEMINI ─────────────────────────────────────────
function buildAiPrompt() {
  return [
    'Bạn là trợ lý quản lý sản xuất tại nhà máy nan tre (dòng chảy: Kế hoạch → Ép ván → Nguyên liệu → Sấy 1 → Sấy 2 → Kho lưu trữ → Bào tinh → QC xuất hàng; tab Nhân sự theo dõi chấm công, tăng ca, nghỉ phép).',
    'Dưới đây là SỐ LIỆU THỰC trích từ phần mềm. Hãy trả lời theo 3 phần:',
    '1) TÓM TẮT — tình hình sản xuất hôm nay (2–4 gạch đầu dòng).',
    '2) CẢNH BÁO / NHẮC VIỆC — những việc cần xử lý gấp (lô chậm, thiếu dữ liệu, đơn chờ duyệt, người vắng, kế hoạch thiếu...).',
    '3) GỢI Ý — 2–4 việc nên làm ngay, ghi rõ mức ưu tiên.',
    'QUY TẮC: trả lời TIẾNG VIỆT, NGẮN GỌN, dùng gạch đầu dòng với nhãn **in đậm**; CHỈ dựa vào số liệu được cung cấp, KHÔNG bịa thêm số liệu; nếu thiếu dữ liệu thì ghi "chưa có dữ liệu".',
    '',
    '=== SỐ LIỆU TỪ PHẦN MỀM ===',
    buildAiDataSummary()
  ].join('\n');
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
      generationConfig: { temperature: 0.4, maxOutputTokens: 1200 }
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
  if (out) out.innerHTML = '<span class="ai-loading">Đang gửi số liệu cho Gemini… (vài giây)</span>';
  const btn = document.getElementById('btn-ai-run');
  if (btn) btn.disabled = true;
  try {
    aiLastResult = await callGemini(buildAiPrompt());
    if (out) out.innerHTML = aiTextToHtml(aiLastResult);
    showToast(`Đã nhận phân tích từ Gemini${aiLastUsedModel ? ` (model ${aiLastUsedModel})` : ''}.`, 'success');
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
  aiTextToHtml,
  callGemini
};
