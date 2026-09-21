// tests/ai-question.test.mjs — Kiểm thử HỎI AI THEO YÊU CẦU TỰ DO (js/ai.js):
// ô #ai-question → buildAiPrompt(question) có mục "YÊU CẦU CỤ THỂ" + trọng tâm
// tab qua aiFocusTabsOf (khử dấu), echo câu hỏi trong #ai-output, chip hỏi nhanh.
'use strict';

// ─── Stubs môi trường (giống ai.test.mjs) ──────────────────────────
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

const { state } = await import('../js/state.js');
const ai = await import('../js/ai.js');

// ─── A. NHẬN DIỆN TRỌNG TÂM TỪ CÂU HỎI ─────────────────────────
check('trọng tâm: "Kế hoạch tuần này" → Kế Hoạch SX', ai.aiFocusTabsOf('Kế hoạch tuần này có ổn chưa?').some(l => l.includes('Kế Hoạch SX')));
check('trọng tâm: gõ KHÔNG DẤU vẫn khớp ("ke hoach")', ai.aiFocusTabsOf('ke hoach tuan nay').some(l => l.includes('Kế Hoạch SX')));
check('trọng tâm: "nguyên liệu đầu vào" → Nguyên Liệu', ai.aiFocusTabsOf('Nguyên liệu đầu vào có đủ không?').some(l => l.includes('Nguyên Liệu')));
check('trọng tâm: "chấm công" → Nhân Sự', ai.aiFocusTabsOf('Chấm công hôm nay có ai vắng?').some(l => l.includes('Nhân Sự')));
check('trọng tâm: "qc xuất hàng" → QC & Xuất Hàng', ai.aiFocusTabsOf('QC xuất hàng tuần này thế nào?').some(l => l.includes('QC')));
check('trọng tâm: "lô nan chậm" → Công Đoạn & Lô Nan', ai.aiFocusTabsOf('Lô nan nào đang chậm?').some(l => l.includes('Lô Nan')));
check('trọng tâm: "ép ván" → Ép Ván', ai.aiFocusTabsOf('Sản lượng ép ván tháng này?').some(l => l.includes('Ép Ván')));
check('trọng tâm: câu hỏi chung chung → tối đa 3 nhãn', ai.aiFocusTabsOf('Tóm tắt tình hình hôm nay và tổng kết kế hoạch với nguyên liệu').length <= 3);
check('trọng tâm: câu lạ → rỗng (gửi đủ dữ liệu tổng quát)', ai.aiFocusTabsOf('hello world 12345').length === 0);
check('trọng tâm: câu rỗng → rỗng', ai.aiFocusTabsOf('').length === 0);

// ─── B. PROMPT CÓ / KHÔNG CÂU HỎI ──────────────────────────────
const p0 = ai.buildAiPrompt();
check('không có câu hỏi: giữ nguyên prompt cũ (không có mục yêu cầu)', !p0.includes('YÊU CẦU CỤ THỂ') && p0.includes('=== SỐ LIỆU TỪ PHẦN MỀM ===') && p0.includes('TÓM TẮT'));
const p1 = ai.buildAiPrompt('Kế hoạch tuần này còn thiếu bao nhiêu?');
check('có câu hỏi: prompt chứa nguyên văn câu hỏi', p1.includes('Kế hoạch tuần này còn thiếu bao nhiêu?'));
check('có câu hỏi: có mục YÊU CẦU CỤ THỂ + trọng tâm Kế Hoạch', p1.includes('YÊU CẦU CỤ THỂ CỦA NGƯỜI DÙNG') && p1.includes('Trọng tâm dữ liệu: Kế Hoạch SX'));
check('có câu hỏi: vẫn giữ 3 phần + khối số liệu', p1.includes('TÓM TẮT') && p1.includes('CẢNH BÁO / NHẮC VIỆC') && p1.includes('=== SỐ LIỆU TỪ PHẦN MỀM ==='));
check('câu hỏi quá dài: chặn ở 500 ký tự', (() => { const p = ai.buildAiPrompt('x'.repeat(2000)); return !p.includes('x'.repeat(501)); })());

// ─── C. TÓM TẮT THÊM TỔNG THEO THÁNG ──────────────────────────
const isoF = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = isoF(new Date());
state.pressRecords = [{ id: 'p1', date: today, week: 'Tuần thử', year: String(new Date().getFullYear()), finishedQty: 300 }];
state.materialRecords = [{ id: 'm1', date: today, weight: 1500 }];
const s = ai.buildAiDataSummary();
check('tóm tắt có tổng ép ván THÁNG hiện tại', s.includes('Ép ván tháng ') && s.includes('300 tấm thành phẩm'));
check('tóm tắt có tổng nguyên liệu THÁNG hiện tại', s.includes('Nguyên liệu tháng ') && s.includes('1500 kg'));

// ─── D. CHẠY PHÂN TÍCH VỚI CÂU HỎI (fetch giả) ────────────────
document.getElementById('ai-key-input').value = 'K_TEST';
ai.aiSaveKey();
ai.aiSetModel('auto');
try { localStorage.removeItem('bamboo_tracker_ai_model_ok_v1'); } catch (e) {}
let fetchCalls = [];
global.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts });
  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ĐÃ TRẢ LỜI' }] } }] }) };
};
document.getElementById('ai-question').value = '  Kế hoạch <b>tối nay</b> sao rồi?  ';
await ai.runAiAnalysis();
const out = document.getElementById('ai-output').innerHTML;
check('run: prompt gửi kèm câu hỏi (đã trim)', fetchCalls.length === 1 && String(fetchCalls[0].opts.body).includes('Kế hoạch <b>tối nay</b> sao rồi?'));
check('run: prompt có mục YÊU CẦU CỤ THỂ', String(fetchCalls[0].opts.body).includes('YÊU CẦU CỤ THỂ CỦA NGƯỜI DÙNG'));
check('run: có dòng nhắc lại câu hỏi ai-q-echo', out.includes('ai-q-echo'));
check('run: câu hỏi trong echo được ESCAPE HTML', out.includes('&lt;b&gt;') && !out.includes('<b>tối nay</b>'));
check('run: kết quả AI hiển thị sau echo', out.includes('ĐÃ TRẢ LỜI'));

// ─── E. CHIP HỎI NHANH ────────────────────────────────────────
fetchCalls = [];
await ai.aiQuickAsk('Tổng Quan hôm nay thế nào?');
check('chip: điền câu hỏi vào ô hỏi', document.getElementById('ai-question').value === 'Tổng Quan hôm nay thế nào?');
check('chip: tự chạy phân tích luôn (1 lượt gọi, prompt có câu hỏi)', fetchCalls.length === 1 && String(fetchCalls[0].opts.body).includes('Tổng Quan hôm nay thế nào?'));

console.log('───────────────────────────');
console.log(`AI-QUESTION: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
