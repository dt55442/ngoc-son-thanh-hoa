// tests/ai-autogreet.test.mjs — Kiểm thử GỢI Ý TỰ ĐỘNG "NAN BOT" 2 tầng (js/ai.js):
// gói sự kiện tab (aiTabContextOf), mẫu câu vui offline (aiOfflineNudge — số thật),
// aiAutoGreet: bong bóng hiện ngay tầng 1, tầng AI Gemini thay câu (quota 20/ngày),
// mỗi tab/ngày + mức dữ liệu chỉ nói 1 lần, công tắc bật/tắt, 3 chấm đang suy nghĩ.
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
    focus(){}, click(){}, reset(){}, select(){}, animate(){ return { cancel(){} }; },
    getBoundingClientRect: () => ({ top: 500, left: 300, right: 348, bottom: 548, width: 48, height: 48 })
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
global.innerWidth = 400; global.innerHeight = 600; // khung nhìn mô phỏng cho bong bóng
global.alert = () => {}; global.confirm = () => true; global.prompt = () => '';

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.error('FAIL ' + name); }
}

const { state } = await import('../js/state.js');
const ai = await import('../js/ai.js');

state.currentUser = { username: 'nv01', role: 'editor', fullname: 'Nguyễn Văn A', editTabs: [], allowAdvanced: true };

// ─── DỮ LIỆU GIẢ (chắc chắn bật cảnh báo nhờ LÔ CHẪM — không phụ thuộc thứ trong tuần) ──
const isoF = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nowD = new Date();
const today = isoF(nowD);
const y = String(nowD.getFullYear());
const tenDaysAgo = isoF(new Date(Date.now() - 10 * 86400000));
const weekLabel = (ai.buildAiDataSummary().match(/\((Tuần \d+)\)/) || ['', 'Tuần 0'])[1];

state.planningItems = [{ id: 'pl1', year: nowD.getFullYear(), week: weekLabel, qty: 1000 }];
state.pressRecords = [{ id: 'p1', date: today, week: weekLabel, year: nowD.getFullYear(), finishedQty: 100 }];
state.batches = [{ id: 'b1', code: 'NL2609-01', quantity: 50, stage: 'say1', date: tenDaysAgo }];
state.materialRecords = [{ id: 'm1', date: today, weight: 1500 }];
state.qcExports = [];
state.hrEmployees = [
  { id: 'e1', code: 'NV01', name: 'Nguyễn Văn A', department: 'Xưởng 2', status: 'active', skills: [] },
  { id: 'e2', code: 'NV02', name: 'Trần Thị B', department: 'Xưởng 2', status: 'active', skills: [] }
];
state.hrAttendance = [];
state.hrLeaves = [];
state.hrOvertimes = [];
state.hrAssignments = [];
state.hrWorkCalendar = {};

// ─── A. GÓI SỰ KIỆN TAB (aiTabContextOf) ───────────────────────
const ctxP = ai.aiTabContextOf('press-view');
check('gói sự kiện Ép Ván: ghi đúng 10% tiến độ (plan 1000 / ép 100)', ctxP.facts.join(' | ').includes('(10%)'));
check('gói sự kiện Ép Ván: có dòng ép 7 ngày qua', ctxP.facts.join(' | ').includes('Ép ván 7 ngày qua'));
check('gói sự kiện: lô chậm >=4 ngày BẬT cảnh báo', ctxP.warn === true);
const ctxQ = ai.aiTabContextOf('qc-view');
check('gói sự kiện QC: chưa xuất hàng tuần này', ctxQ.facts.join(' | ').includes('0 sản phẩm'));
const ctxH = ai.aiTabContextOf('hr-view');
check('gói sự kiện Nhân Sự: 2/2 chưa chấm công', ctxH.facts.join(' | ').includes('chưa chấm 2') && ctxH.unmarked === 2);

// ─── B. MẪU CÂU VUI TẦNG OFFLINE (deterministic — ctx dựng tay) ──
const base = { viewId: 'press-view', tabLabel: 'Ép Ván', facts: [], warn: true, slow: [], mat7Count: 5, mat7kg: 2000, qcQty: 0, emps: 2, unmarked: 0, pendLeave: 0, pendOT: 0 };
const mSlow = ai.aiOfflineNudge({ ...base, week: { weekLabel: 'Tuần 39', planQty: 1000, pressQty: 100, pct: 10, dow: 4, onPace: false } });
check('mẫu câu chậm nhịp: chào tên "A" + số 10%', mSlow.includes('A') && mSlow.includes('10%'));
const mOk = ai.aiOfflineNudge({ ...base, warn: false, week: { weekLabel: 'Tuần 39', planQty: 1000, pressQty: 500, pct: 50, dow: 3, onPace: true } });
check('mẫu câu ổn: khen có 50%', mOk.includes('50%'));
const mPlan = ai.aiOfflineNudge({ ...base, viewId: 'planning-view', tabLabel: 'Kế Hoạch SX', week: { weekLabel: 'Tuần 39', planQty: 0, pressQty: 0, pct: null, dow: 2, onPace: true } });
check('mẫu câu kế hoạch trống', mPlan.includes('TRỐNG') || mPlan.includes('chưa có kế hoạch'));
let loopOk = true;
for (let i = 0; i < 8; i++) { const s = ai.aiOfflineNudge({ ...base, week: { weekLabel: 'Tuần 39', planQty: 1000, pressQty: 100, pct: 10, dow: 4, onPace: false } }); if (!s || !s.includes('A')) loopOk = false; }
check('chọn mẫu ngẫu nhiên: 8 lần đều trả câu hợp lệ có tên', loopOk);

// ─── C. AI AUTO GREET — TẦNG 1 OFFLINE (chưa có key) ───────────
try { localStorage.removeItem('bamboo_tracker_ai_key_v1'); } catch (e) {}
try { localStorage.removeItem('bamboo_tracker_ai_model_ok_v1'); } catch (e) {}
try { localStorage.setItem('bamboo_tracker_ai_autogreet_v1', '1'); } catch (e) {}
const bubble = document.getElementById('ai-fab-bubble');
ai.aiAutoGreet('press-view');
check('greet lần 1: bong bóng HIỆN câu offline', bubble.classList.contains('show'));
check('greet: câu chào có tên người dùng', document.getElementById('ai-fab-bubble-text').innerHTML.includes('A'));
check('chưa có key: KHÔNG bật 3 chấm suy nghĩ', !document.getElementById('ai-fab-bubble-thinking').classList.contains('show'));
ai.aiHideBubble();
ai.aiAutoGreet('press-view');
check('cùng tab + cùng dữ liệu: KHÔNG nhắc lại', !bubble.classList.contains('show'));
state.pressRecords.push({ id: 'p2', date: today, week: weekLabel, year: nowD.getFullYear(), finishedQty: 50 });
ai.aiAutoGreet('press-view');
check('dữ liệu thay đổi: nhắc lại được', bubble.classList.contains('show'));

// ─── D. TẦNG 2 — GEMINI "NAN BOT" (key + quota, fetch chờ tay) ──
document.getElementById('ai-key-input').value = 'K_TALK';
ai.aiSaveKey();
ai.aiSetModel('auto');
let fetchCount = 0, lastBody = '', resolveTalk = null;
global.fetch = (url, opts) => new Promise((r) => {
  fetchCount++;
  lastBody = opts && opts.body ? String(opts.body) : '';
  resolveTalk = () => r({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Chào A! 10% là chưa tới đâu nha ông!' }] } }] }) });
});
state.pressRecords.push({ id: 'p3', date: today, week: weekLabel, year: nowD.getFullYear(), finishedQty: 10 }); // đổi dữ liệu → được nói lại
ai.aiAutoGreet('press-view');
check('có key + còn quota: 3 chấm "đang suy nghĩ" hiện', document.getElementById('ai-fab-bubble-thinking').classList.contains('show'));
const sentPrompt = (() => { try { return JSON.parse(lastBody).contents[0].parts[0].text || ''; } catch (e) { return ''; } })();
check('prompt Nan Bot: persona + tên "A" + số liệu tab Ép Ván', sentPrompt.includes('Nan Bot') && sentPrompt.includes('"A"') && sentPrompt.includes('SỐ LIỆU TAB Ép Ván'));
resolveTalk();
await new Promise((r2) => setTimeout(r2, 0));
check('AI xong: câu Nan Bot thay câu offline (dòng 🤖)', document.getElementById('ai-fab-bubble-text').innerHTML.includes('Nan Bot') && document.getElementById('ai-fab-bubble-text').innerHTML.includes('10%'));
check('AI xong: tắt 3 chấm', !document.getElementById('ai-fab-bubble-thinking').classList.contains('show'));
const q1 = JSON.parse(storeBacking.get('bamboo_tracker_ai_talk_quota_v1') || '{}');
check('quota: đếm đúng 1 lượt gọi', q1.used === 1);

// ─── E. HẾT QUOTA → chỉ tầng offline ───────────────────────────
storeBacking.set('bamboo_tracker_ai_talk_quota_v1', JSON.stringify({ date: today, used: 20 }));
fetchCount = 0;
ai.aiHideBubble();
state.pressRecords.push({ id: 'p4', date: today, week: weekLabel, year: nowD.getFullYear(), finishedQty: 5 });
ai.aiAutoGreet('press-view');
check('hết quota: KHÔNG gọi AI nữa', fetchCount === 0);
check('hết quota: vẫn câu offline + không 3 chấm', bubble.classList.contains('show') && !document.getElementById('ai-fab-bubble-thinking').classList.contains('show'));

// ─── F. CÔNG TẮC BẬT/TẮT ───────────────────────────────────────
ai.aiSetAutoGreet(false);
check('tắt tự động: checkbox modal đồng bộ TẮT', document.getElementById('ai-autogreet-toggle').checked === false);
ai.aiHideBubble();
ai.aiAutoGreet('qc-view');
check('tắt tự động: bong bóng không hiện', !bubble.classList.contains('show'));
ai.aiSetAutoGreet(true);
check('bật lại: checkbox đồng bộ BẬT', document.getElementById('ai-autogreet-toggle').checked === true);

console.log('───────────────────────────');
console.log(`AI-AUTOGREET: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
