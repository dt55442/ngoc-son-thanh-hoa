// tests/ai.test.mjs — Kiểm thử TRỢ LÝ AI (Google Gemini miễn phí) — js/ai.js:
// nhắc việc offline (chờ duyệt/lô chậm/chưa chấm công/kế hoạch), lưu API key
// cục bộ, gọi REST generateContent (stub fetch) và hiển thị kết quả.
'use strict';

// ─── Stubs môi trường (giống hr-timesheet.test.mjs) ────────────────
function makeEl(id) {
  const el = {
    id: id || '', value: '', checked: false, disabled: false, hidden: false,
    open: true, textContent: '', innerHTML: '', style: {}, dataset: {}, _h: {},
    offsetWidth: 800, offsetHeight: 500,
    classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c, f){ if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); return f; }, contains(c){ return this._s.has(c); } },
    addEventListener(t, f) { (el._h[t] = el._h[t] || []).push(f); },
    appendChild(c) { return c; }, removeChild(c) { return c; },
    remove(){}, setAttribute(){}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    closest: () => null, matches: () => false,
    getContext: () => ({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop(){} }), createRadialGradient: () => ({ addColorStop(){} }), drawImage(){} }),
    toDataURL: () => 'data:image/jpeg;base64,CANVASOK',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    focus(){}, click(){}, reset(){}, select(){}, animate(){ return { cancel(){} }; }
  };
  return el;
}
const els = new Map();
global.document = {
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
  activeElement: null, readyState: 'complete', visibilityState: 'visible',
  getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl(), createTextNode: (t) => ({ textContent: t }),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener(){}, removeEventListener(){}, escapeCSS: (s) => s
};
global.location = { href: 'http://localhost:8080/', origin: 'http://localhost:8080', pathname: '/', search: '', hash: '', reload(){} };
global.history = { replaceState(){}, pushState(){}, back(){}, state: null };
Object.defineProperty(global, "navigator", { value: { onLine: true, userAgent: 'node-test', language: 'vi' }, configurable: true });
global.matchMedia = () => ({ matches: false, media: '', addListener(){}, removeListener(){}, addEventListener(){} });
const storeBacking = new Map();
global.localStorage = {
  getItem: (k) => (storeBacking.has(k) ? storeBacking.get(k) : null),
  setItem: (k, v) => { storeBacking.set(k, String(v)); },
  removeItem: (k) => { storeBacking.delete(k); },
  clear: () => storeBacking.clear(),
  key: (i) => [...storeBacking.keys()][i] ?? null,
  get length() { return storeBacking.size; }
};
global.addEventListener = () => {}; global.removeEventListener = () => {}; global.dispatchEvent = () => true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.window = global; global.self = global;
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

// ─── IMPORT MODULES ────────────────────────────────────────────────
const { state } = await import('../js/state.js');
const ai = await import('../js/ai.js');

state.currentUser = { username: 'admin', role: 'admin', editTabs: [], allowAdvanced: true };

// ─── DỮ LIỆU GIẢ ──────────────────────────────────────────────
const now = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = iso(now);
const tenDaysAgo = iso(new Date(Date.now() - 10 * 86400000));
const monthKey = today.slice(0, 7);

state.batches = [
  { id: 'b1', code: 'NL2609-01', quantity: 100, stage: 'say1', date: tenDaysAgo, location: 'Xưởng 1' },
  { id: 'b2', code: 'NL2609-02', quantity: 50,  stage: 'say2', date: today,     location: 'Xưởng 2' }
];
state.materialRates = [{ id: 'rate-1', product: 'Ván thử nghiệm' }];
state.planningItems = [];
state.pressRecords = [];
state.materialRecords = [];
state.qcExports = [];
state.hrEmployees = [
  { id: 'e1', code: 'NV01', name: 'Nguyễn Văn A', department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'e2', code: 'NV02', name: 'Trần Thị B',   department: 'Xưởng 2', status: 'active', skills: [] }
];
state.hrAttendance = [];
state.hrLeaves = [{ id: 'l1', employeeId: 'e1', type: 'Nghỉ phép', from: today, to: today, days: 1, status: 'pending', createdAt: today }];
state.hrOvertimes = [{ id: 'o1', employeeId: 'e2', date: today, start: '17:30', end: '19:30', plannedMin: 120, status: 'pending', createdAt: today }];
state.hrAssignments = [];
state.hrWorkCalendar = { [monthKey]: { weekdaysOff: [0], restDays: [], workDays: [] } };

// ─── A. NHẮC VIỆC OFFLINE (không cần API key) ─────────────────
const rems = ai.buildLocalReminders();
const remsText = rems.map(r => r.text).join(' | ');
check('AI: nhắc đơn nghỉ CHỜ DUYỆT', remsText.includes('CHỜ DUYỆT') && remsText.includes('1 đơn nghỉ phép'));
check('AI: nhắc đăng ký TĂNG CA chờ duyệt', remsText.includes('TĂNG CA chờ duyệt'));
check('AI: nhắc lô LÂU hơn 3 ngày (NL2609-01, 10 ngày)', remsText.includes('lô LÂU hơn 3 ngày') && remsText.includes('NL2609-01') && remsText.includes('10 ngày'));
check('AI: nhắc chưa chấm công (2/2 — đơn CHỜ duyệt không chặn chấm)', remsText.includes('Chưa chấm công hôm nay cho 2/2'));
check('AI: nhắc chưa có kế hoạch tuần này', remsText.includes('chưa có kế hoạch sản xuất nào'));
check('AI: nhắc chưa nhập nguyên liệu 7 ngày', remsText.includes('chưa nhập nguyên liệu nào'));

// ─── B. MODAL + API KEY (lưu cục bộ) ──────────────────────────
ai.openAiAssistant();
check('AI: mở modal trợ lý', document.getElementById('modal-ai').classList._s.has('show'));
check('AI: phần nhắc việc render (có cảnh báo chờ duyệt)', document.getElementById('ai-reminders').innerHTML.includes('CHỜ DUYỆT'));
check('AI: chưa có key -> hiện hàng nhập key', document.getElementById('ai-key-row').style.display === '');
check('AI: trạng thái key "chưa cấu hình"', document.getElementById('ai-key-status').textContent.includes('chưa cấu hình'));

document.getElementById('ai-key-input').value = '  TEST_KEY_GEMINI  ';
ai.aiSaveKey();
check('AI: lưu key cục bộ (đã trim)', storeBacking.get('bamboo_tracker_ai_key_v1') === 'TEST_KEY_GEMINI');
check('AI: có key -> ẩn hàng nhập key', document.getElementById('ai-key-row').style.display === 'none');
check('AI: trạng thái key "đã cấu hình"', document.getElementById('ai-key-status').textContent.includes('đã cấu hình'));

// ─── C. GỌI GEMINI (REST generateContent — fetch giả lập) ─────
// Kịch bản thực tế (key mới của Google): model 2.x KHÔNG mở ("no longer
// available to new users"), model 3.8-flash QUÁ TẢI → auto phải nhảy sang
// 3.6-flash và NHỚ model thành công; model 2.x trong bộ nhớ phải được gỡ.
ai.aiSetModel('auto');
storeBacking.set('bamboo_tracker_ai_model_ok_v1', 'gemini-2.5-flash'); // mô phỏng model cũ còn lưu
let fetchCalls = [];
global.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts: opts || {} });
  const u = String(url);
  if (u.includes('gemini-2.5-flash') || u.includes('gemini-3.8-flash')) {
    return { ok: false, status: 404, json: async () => ({ error: { code: 404, message: 'models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash.', status: 'NOT_FOUND' } }) };
  }
  return {
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: '1) TÓM TẮT...\n2) **CẢNH BÁO**: lô chậm' }] } }] })
  };
};
await ai.runAiAnalysis();
check('AI: model cũ 2.x + 3.8 quá tải -> TỰ ĐỔI sang gemini-3.6-flash (3 lượt gọi)', fetchCalls.length === 3 &&
  /models\/gemini-2\.5-flash:generateContent/.test(fetchCalls[0]?.url || '') &&
  /models\/gemini-3\.8-flash:generateContent/.test(fetchCalls[1]?.url || '') &&
  /models\/gemini-3\.6-flash:generateContent\?key=TEST_KEY_GEMINI/.test(fetchCalls[2]?.url || ''));
check('AI: nhớ model chạy THÀNH CÔNG (3.6-flash, thay model 2.x cũ)', storeBacking.get('bamboo_tracker_ai_model_ok_v1') === 'gemini-3.6-flash');
check('AI: kết quả hiển thị sau khi tự đổi model', document.getElementById('ai-output').innerHTML.includes('CẢNH BÁO') && document.getElementById('ai-output').innerHTML.includes('<strong>'));
check('AI: trạng thái hiển thị model đã dùng', document.getElementById('ai-key-status').textContent.includes('model đã dùng: gemini-3.6-flash'));
check('AI: lần gọi sau ưu tiên model đã thành công (chỉ 1 lượt, không thử 2.x)', (() => {
  fetchCalls = [];
  global.fetch = async (url, opts) => { fetchCalls.push({ url, opts }); return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }) }; };
  return ai.callGemini('test').then(() => fetchCalls.length === 1 && /gemini-3\.6-flash:/.test(fetchCalls[0]?.url || ''));
})());
check('AI: sau thay đổi danh sách model — tóm tắt & prompt vẫn dựng bình thường', ai.buildAiDataSummary().includes('Hôm nay:') && ai.buildAiPrompt().includes('=== SỐ LIỆU TỪ PHẦN MỀM ==='));

// Chọn model CỤ THỂ không tồn tại -> chỉ gọi 1 lần, KHÔNG tự đổi model khác
ai.aiSetModel('gemini-3.5-flash');
fetchCalls = [];
global.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts });
  return { ok: false, status: 404, json: async () => ({ error: { code: 404, message: 'models/gemini-3.5-flash is not found', status: 'NOT_FOUND' } }) };
};
await ai.runAiAnalysis();
check('AI: model cụ thể 404 -> chỉ gọi 1 lần (không tự đổi)', fetchCalls.length === 1 && /gemini-3\.5-flash/.test(fetchCalls[0]?.url || ''));
check('AI: lỗi hiển thị + gợi ý chuyển "Tự động"', document.getElementById('ai-output').innerHTML.includes('Lỗi:') && document.getElementById('ai-output').innerHTML.includes('Tự động'));
ai.aiSetModel('auto');
try { localStorage.removeItem('bamboo_tracker_ai_model_ok_v1'); } catch (e) {}

// ─── D. SỐ LIỆU + PROMPT + FORMAT ─────────────────────────────
check('AI: tóm tắt dữ liệu có lô/ép/nguyên liệu/QC/nhân sự', (() => {
  const s = ai.buildAiDataSummary();
  return s.includes('Lô nan đang theo dõi: 2') && s.includes('Ép ván 7 ngày qua') &&
    s.includes('Nguyên liệu 7 ngày qua') && s.includes('QC xuất hàng') && s.includes('Nhân sự: 2 người đang làm');
})());
check('AI: prompt yêu cầu 3 phần + nguồn số liệu', ai.buildAiPrompt().includes('TÓM TẮT') && ai.buildAiPrompt().includes('CẢNH BÁO / NHẮC VIỆC') && ai.buildAiPrompt().includes('=== SỐ LIỆU TỪ PHẦN MỀM ==='));
check('AI: markdown **đậm** -> <strong> + escape HTML', ai.aiTextToHtml('**Chú ý** <script>').includes('<strong>Chú ý</strong>') && ai.aiTextToHtml('**Chú ý** <script>').includes('&lt;script&gt;'));

// Thêm dữ liệu tuần -> tóm tắt cập nhật
const nowDate = new Date();
const weekLabel = ai.buildAiDataSummary().match(/Hôm nay: \d{4}-\d{2}-\d{2} \((Tuần \d+)\)/);
check('AI: tóm tắt ghi đúng tuần ISO hiện tại', !!weekLabel);
state.planningItems = [{ year: nowDate.getFullYear(), week: weekLabel ? weekLabel[1] : '', productId: 'rate-1', productName: '', qty: 120 }];
state.pressRecords = [{ id: 'p1', date: today, week: weekLabel ? weekLabel[1] : '', year: nowDate.getFullYear(), finishedQty: 300 }];
state.materialRecords = [{ id: 'm1', date: today, weight: 1500 }];
state.qcExports = [{ id: 'q1', week: weekLabel ? weekLabel[1] : '', year: nowDate.getFullYear(), qty: 90 }];
const s2 = ai.buildAiDataSummary();
check('AI: tóm tắt có kế hoạch 120 / ép 300 tấm / NL 1500 kg / QC 90', s2.includes('× 120') && s2.includes('300 tấm thành phẩm') && s2.includes('1500 kg') && s2.includes('tổng 90 sản phẩm'));

// ─── E. ĐÓNG MODAL + ĐỔI KEY ──────────────────────────────────
ai.closeAiAssistant();
check('AI: đóng modal', !document.getElementById('modal-ai').classList._s.has('show'));
ai.aiToggleKey();
check('AI: đổi key -> xóa key cục bộ', !storeBacking.has('bamboo_tracker_ai_key_v1'));
check('AI: sau khi xóa key -> hiện lại hàng nhập', document.getElementById('ai-key-row').style.display === '');

// ─── KẾT LUẬN ────────────────────────────────────────────────
console.log('───────────────────────────');
console.log(`AI-ASSISTANT: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
