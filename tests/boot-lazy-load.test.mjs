// ═══════════════════════════════════════════════════════════════
// tests/boot-lazy-load.test.mjs — BOOT NHANH + NẠP NỀN (11/2026)
// ═══════════════════════════════════════════════════════════════
// Kiểm cấu trúc các sửa đổi "mở app lần đầu không treo máy yếu":
//   A. index.html: script vendor/firebase-config có DEFER; KHÔNG còn SheetJS
//      trên đường boot (nạp trễ qua js/xlsx-lazy.js); CSS nội tuyến màn hình chờ.
//   B. js/xlsx-lazy.js: ensureXlsx + kickXlsxBackgroundLoad; vẫn có trong APP_SHELL
//      (kèm xlsx.full.min.js — dùng OFFLINE được).
//   C. js/main.js: hoãn vẽ biểu đồ lần đầu (deferInitialDashDecor + scheduleViewDecor);
//      initHistory hoãn setTimeout; nội dung nền qua scheduleBootBackgroundTasks.
//   D. js/cloud.js: registerServiceWorker đăng ký NGAY khi trang đã tải xong.
//   E. js/hr.js: so sánh RẺ thay stringify kép (hrArrDiffers).
//   F. Hành vi: ensureXlsx giải NGAY khi window.XLSX có sẵn (stub test).
//   G. sw.js CACHE_NAME = state.js APP_VERSION (quy tắc 73).
// ═══════════════════════════════════════════════════════════════
import fs from 'fs';
import assert from 'assert/strict';

const rd = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
};

// ─── A. index.html ──────────────────────────────────────────────
const html = rd('index.html');
for (const f of ['vendor/lucide.min.js', 'vendor/chart.umd.js', 'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js', 'firebase-config.js']) {
  check('A. ' + f + ' có defer', new RegExp('<script defer src="' + f.replace(/[.\\/]/g, (m) => '\\' + m) + '"></script>').test(html));
}
// script thường (có src) phải defer; script type="module" tự deferred sẵn; script inline (không src) được phép
check('A. KHÔNG còn script chặn (script src không defer, không phải module)', !/<script(?![^>]*defer)(?![^>]*type="module")[^>]*\ssrc=/.test(html));
check('A. SheetJS KHÔNG còn trên đường boot (nạp trễ)', !html.includes('<script src="vendor/xlsx.full.min.js"') && !html.includes('<script defer src="vendor/xlsx.full.min.js"'));
check('A. CSS nội tuyến màn hình chờ (.tre-loading + treChop)', /<style>[\s\S]*?\.tre-loading\s*\{[\s\S]*?@keyframes treChop[\s\S]*?<\/style>/.test(html));

// ─── B. js/xlsx-lazy.js + APP_SHELL ─────────────────────────────
const lazy = rd('js/xlsx-lazy.js');
check('B. xlsx-lazy.js export ensureXlsx + kickXlsxBackgroundLoad', lazy.includes('export function ensureXlsx') && lazy.includes('export function kickXlsxBackgroundLoad'));
check('B. xlsx-lazy.js KHÔNG import gì (tránh vòng import)', !/^import\s/m.test(lazy));
check('B. xlsx-lazy.js trỏ đúng vendor/xlsx.full.min.js', lazy.includes("'vendor/xlsx.full.min.js'"));
const sw = rd('sw.js');
check('B. APP_SHELL có js/xlsx-lazy.js', sw.includes("'./js/xlsx-lazy.js'"));
check('B. APP_SHELL VẪN precache vendor/xlsx.full.min.js (OFFLINE)', sw.includes("'./vendor/xlsx.full.min.js'"));

// ─── C. js/main.js ──────────────────────────────────────────────
const mainSrc = rd('js/main.js');
check('C. renderAll lần đầu hoãn vẽ (deferInitialDashDecor + scheduleViewDecor)', mainSrc.includes('let deferInitialDashDecor = false;') && /if \(deferInitialDashDecor\) \{[\s\S]{0,600}scheduleViewDecor\('dashboard-view', true\)/.test(mainSrc));
check('C. boot bật cờ quanh checkAuthAndRender rồi TẮT', /deferInitialDashDecor = true;\s*\n\s*checkAuthAndRender\(\);\s*\n\s*deferInitialDashDecor = false;/.test(mainSrc));
check('C. initHistory hoãn setTimeout (vẫn sau mọi load*())', /setTimeout\(\(\) => \{\s*try \{ initHistory\(\);/.test(mainSrc));
check('C. nội dung nền qua scheduleBootBackgroundTasks (SW + SheetJS)', mainSrc.includes('function scheduleBootBackgroundTasks') && /scheduleBootBackgroundTasks\(\);/.test(mainSrc) && mainSrc.includes('kickXlsxBackgroundLoad'));
check('C. runWhenIdle có unref cho Node (không giữ process test)', /t\.unref\(\)/.test(mainSrc));

// ─── D. js/cloud.js ─────────────────────────────────────────────
const cloudSrc = rd('js/cloud.js');
check('D. registerServiceWorker đăng ký NGAY khi readyState === complete', /function registerServiceWorker\(\) \{[\s\S]{0,600}document\.readyState === 'complete'\) doReg\(\);/.test(cloudSrc));

// ─── E. js/hr.js ────────────────────────────────────────────────
const hrSrc = rd('js/hr.js');
check('E. hr.js dùng hrArrDiffers thay stringify kép', hrSrc.includes('function hrArrDiffers') && hrSrc.includes('hrArrDiffers(merged, arr)') && !/\n\s*if \(JSON\.stringify\(merged\)/.test(hrSrc));
check('E. hr.js nạp Excel chờ thư viện trễ (ensureXlsx)', /if \(!window\.XLSX\) \{\s*showToast\('Đang nạp thư viện đọc Excel…'/.test(hrSrc));

// ─── F. Hành vi ensureXlsx ──────────────────────────────────────
global.window = global;
global.XLSX = { utils: {} };
const lazyMod = await import('../js/xlsx-lazy.js');
let resolved = null;
await lazyMod.ensureXlsx().then((x) => { resolved = x; });
check('F. ensureXlsx giải NGAY khi window.XLSX có sẵn', resolved === global.XLSX);

// ─── G. sw.js CACHE_NAME = APP_VERSION ─────────────────────────
const stateSrc = rd('js/state.js');
const swVer = (sw.match(/nha-may-ngoc-son-v(\d+)/) || [])[1];
check('G. sw.js CACHE_NAME = v380', swVer === '380');
check('G. APP_VERSION khớp CACHE_NAME (quy tắc 73)', stateSrc.includes("APP_VERSION = 'v" + swVer + "'"));

console.log('─── KẾT QUẢ: ' + pass + ' PASS / ' + fail + ' FAIL ───');
if (fail) process.exit(1);
