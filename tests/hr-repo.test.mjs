// tests/hr-repo.test.mjs — KHO DỮ LIỆU LỚN THEO THÁNG (IndexedDB) — 20/10/2026
// Kiểm thử phần THUẦN (không cần trình duyệt): chia tháng, phát hiện tháng
// đổi, chuỗi JSON dùng cho backup, và các chỗ đã nối repo vào hệ thống.
'use strict';
import fs from 'node:fs';

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS — ' + name); } else { fail++; console.log('FAIL — ' + name); } }

const repo = await import('../js/repo.js');

// ─── A. CHIA THÁNG ──────────────────────────────────────────────
check('MONTH: lấy date "2026-10-19" -> 2026-10', repo.monthOf({ date: '2026-10-19' }) === '2026-10');
check('MONTH: không có date -> dùng from (đơn nghỉ)', repo.monthOf({ from: '2026-09-30', to: '2026-10-02' }) === '2026-09');
check('MONTH: không có ngày -> 0000-00 (không làm mất bản ghi)', repo.monthOf({ id: 'x' }) === '0000-00');
const groups = repo.groupByMonth([
  { id: 'a', date: '2026-10-01' }, { id: 'b', date: '2026-10-31' }, { id: 'c', date: '2026-11-01' }
]);
check('GROUP: 3 bản ghi -> 2 tháng (10 có 2, 11 có 1)',
  Object.keys(groups).sort().join(',') === '2026-10,2026-11' && groups['2026-10'].length === 2 && groups['2026-11'].length === 1);
check('GROUP: KHÔNG sửa mảng gốc', groups['2026-10'][0].id === 'a');

// ─── B. DẤU VÂN TAY / CACHE SLICE ───────────────────────────────
check('STAMP: lấy updatedAt lớn nhất',
  repo.stampOf([{ updatedAt: '2026-10-01T00:00:00Z' }, { updatedAt: '2026-10-05T00:00:00Z' }]) === '2026-10-05T00:00:00Z');
check('STAMP: mảng rỗng -> chuỗi rỗng', repo.stampOf([]) === '');
const nowM = repo.recentMonths(2);
check('RECENT: 2 tháng gần nhất, mới nhất đứng đầu', nowM.length === 2 && /^\d{4}-\d{2}$/.test(nowM[0]));
const sliced = repo.cacheSlice([
  { id: 'old', date: '2020-01-05' },
  { id: 'now', date: nowM[0] + '-10' }
], 2);
check('CACHE: chỉ giữ bản ghi trong 2 tháng gần nhất', sliced.length === 1 && sliced[0].id === 'now');

// ─── C. putDomain (fallback RAM khi không có IndexedDB) ─────────
await repo.putDomain('demo', [
  { id: 'a', date: '2026-10-01', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'b', date: '2026-11-01', updatedAt: '2026-11-01T00:00:00Z' }
]);
check('PUT: tách 2 tháng', repo.monthsOf('demo').join(',') === '2026-10,2026-11');
check('PUT: jsonOf trả đúng chuỗi tháng', JSON.parse(repo.jsonOf('demo', '2026-10'))[0].id === 'a');
const first = repo.jsonOf('demo', '2026-11');
await repo.putDomain('demo', [
  { id: 'a', date: '2026-10-01', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'b', date: '2026-11-01', updatedAt: '2026-11-01T00:00:00Z' }
]);
check('PUT: dữ liệu KHÔNG đổi -> không ghi lại tháng 11 (tiết kiệm)', repo.jsonOf('demo', '2026-11') === first);
await repo.putDomain('demo', [
  { id: 'a', date: '2026-10-01', updatedAt: '2026-10-01T00:00:00Z' }
]);
check('PUT: mặc định KHÔNG xoá tháng vắng mặt (an toàn khi state mới có cache)',
  repo.monthsOf('demo').join(',') === '2026-10,2026-11');
await repo.putDomain('demo', [
  { id: 'a', date: '2026-10-01', updatedAt: '2026-10-01T00:00:00Z' }
], { dropMissing: true });
check('PUT: dropMissing=true mới xoá tháng không còn dữ liệu', repo.monthsOf('demo').join(',') === '2026-10');
check('DUMP: có chuỗi JSON theo tháng (backup không cần parse lại)',
  Object.keys(repo.dumpStrings()).some(k => k.indexOf('demo|') === 0));
check('LOAD: loadDomainSync ghép lại đúng mảng',
  repo.loadDomainSync('demo').length === 1 && repo.loadDomainSync('demo')[0].id === 'a');
check('AVAILABLE: Node không có IndexedDB -> false (hệ thống dùng fallback)', repo.available() === false);

// ─── D. ĐÃ NỐI VÀO HỆ THỐNG ─────────────────────────────────────
const hrSrc = fs.readFileSync(new URL('../js/hr.js', import.meta.url), 'utf8');
const cloudSrc = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const storageSrc = fs.readFileSync(new URL('../js/storage.js', import.meta.url), 'utf8');
const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const stateSrc = fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8');
check('NỐI: hr.js import repo + khai báo 3 miền lớn',
  hrSrc.includes("from './repo.js'") && hrSrc.includes("const HR_BIG_DOMAINS = ['hrAssignments', 'hrAttendance', 'hrCheckins']"));
check('NỐI: hr.js tự nạp bù từ IndexedDB (hrHydrateFromRepo) và gọi trong loadHrData',
  hrSrc.includes('function hrHydrateFromRepo') && /function loadHrData[\s\S]{0,3000}hrHydrateFromRepo\(\)/.test(hrSrc));
check('NỐI: saveHrData ghi IndexedDB theo tháng cho miền lớn',
  /repo\.putDomain\(dom, val \|\| \[\], \{ dropMissing: hrHydrated \}\)/.test(hrSrc));
check('NỐI: cloud.js persistAllLocal chỉ giữ cache 2 tháng + ghi repo',
  cloudSrc.includes('repo.cacheSlice(state.hrAssignments || [], 2)') && cloudSrc.includes("repo.putDomain('hrAttendance'"));
check('NỐI: file sao lưu JSON có dữ liệu Nhân sự (trước đây THIẾU)',
  storageSrc.includes('hrAssignments: state.hrAssignments || []') && storageSrc.includes('function restoreHrFromBackup'));
check('NỐI: sw.js có js/repo.js trong APP_SHELL', swSrc.includes("'./js/repo.js'"));
check('CACHE: sw.js và APP_VERSION cùng phiên bản', (() => {
  const c = /nha-may-ngoc-son-(v\d+)/.exec(swSrc); const a = /APP_VERSION = '(v\d+)'/.exec(stateSrc);
  return !!c && !!a && c[1] === a[1];
})());

console.log('\n───────────────────────────');
console.log(`HR-REPO: ${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
