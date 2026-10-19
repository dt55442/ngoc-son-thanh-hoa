#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// scripts/run-tests.cjs — CHẠY CHUỖI KIỂM THỬ DẠNG GỌN (npm run test:quiet)
//
// VÌ SAO CÓ FILE NÀY: `npm test` in ra ~3.600 dòng PASS (~311 KB) — nếu đọc
// toàn bộ vào ngữ cảnh thì rất tốn token. Script này chạy ĐÚNG chuỗi test của
// package.json nhưng CHỈ in: 1 dòng kết quả mỗi file + tổng kết + các dòng FAIL.
// Toàn bộ log vẫn được ghi ra `tests/.last-run.log` để tra cứu khi cần.
//
// CÁCH DÙNG:
//   npm run test:quiet                     → chạy toàn bộ như npm test
//   npm run test:quiet -- tests/qc-press.test.mjs tests/x2-ep-van.test.mjs
//                                          → chỉ chạy các file được chỉ định
//   node scripts/run-tests.cjs tests/x2-ep-van.test.mjs
//
// LƯU Ý: danh sách file lấy TRỰC TIẾP từ scripts.test trong package.json
// (một nguồn duy nhất) — thêm/bớt test chỉ cần sửa package.json.
// KHÔNG thuộc APP_SHELL của sw.js (chỉ là công cụ phát triển, không lên web).
// ═══════════════════════════════════════════════════════════════════════
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'tests', '.last-run.log');

// ─── 1. Lấy danh sách file test từ scripts.test của package.json ────────
function testFilesFromScript() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const raw = String((pkg.scripts && pkg.scripts.test) || '');
  const out = [];
  const re = /node\s+([^\s&|]+\.mjs)/g;
  let m;
  while ((m = re.exec(raw))) {
    const f = m[1].replace(/\\/g, '/');
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

// ─── 2. Danh sách file cần chạy (tham số dòng lệnh hoặc toàn bộ) ────────
const cliArgs = process.argv.slice(2).filter(a => !a.startsWith('-'));
const files = (cliArgs.length ? cliArgs : testFilesFromScript());

if (!files.length) {
  console.error('Không tìm thấy file test nào. Kiểm tra scripts.test trong package.json.');
  process.exit(1);
}

// ─── 3. Chạy lần lượt, chỉ giữ lại phần cần in ──────────────────────────
// Đếm kiểm thử đạt theo 3 kiểu in đang dùng trong repo:
//   "PASS <tên>" (đa số) · "OK   <tên>" (tests/smoke.mjs) · "  ✓ <tên>" (cloud/loading…)
function countPass(out) {
  return (out.match(/^PASS /gm) || []).length +
    (out.match(/^OK\s+\S/gm) || []).length +
    (out.match(/^\s*✓\s+\S/gm) || []).length;
}

const startedAll = Date.now();
const results = [];
let logOut = '';
let totalPass = 0;
let totalFail = 0;

console.log(`Chạy ${files.length} file kiểm thử (chế độ gọn — log đầy đủ: tests/.last-run.log)`);

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    results.push({ rel, code: 1, pass: 0, fails: [], detail: ['Không tìm thấy file: ' + rel] });
    totalFail += 1;
    console.log(`✘ LỖI   ${rel}  (không tìm thấy file)`);
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [abs], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: process.env
  });
  const ms = Date.now() - t0;
  const code = r.status == null ? 1 : r.status;
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const pass = countPass(out);
  const fails = out.split(/\r?\n/).filter(l => l.startsWith('FAIL '));
  // Khi test "chết" (lỗi cú pháp/import) không có dòng FAIL → lấy 12 dòng cuối
  const detail = (code !== 0 && !fails.length)
    ? out.split(/\r?\n/).filter(Boolean).slice(-12)
    : [];
  results.push({ rel, code, pass, fails, detail, ms });
  totalPass += pass;
  if (code !== 0) totalFail += 1;

  const gio = (ms / 1000).toFixed(1) + 's';
  if (code === 0) {
    console.log(`✔ ĐẠT  ${String(pass).padStart(4)}  ${rel}  (${gio})`);
  } else {
    const n = fails.length || detail.length || 1;
    console.log(`✘ LỖI  ${String(n).padStart(4)}  ${rel}  (${gio})`);
  }

  logOut += `\n${'='.repeat(70)}\n${rel} — exit ${code} · ${pass} pass · ${ms} ms\n${'='.repeat(70)}\n${out}\n`;
}

// ─── 4. Ghi log đầy đủ (để tra cứu, KHÔNG in ra ngữ cảnh) ───────────────
try { fs.writeFileSync(LOG_FILE, logOut, 'utf8'); } catch (e) { /* không chặn kết quả */ }

// ─── 5. Tổng kết + chi tiết lỗi ─────────────────────────────────────────
const secs = ((Date.now() - startedAll) / 1000).toFixed(1);
const failedFiles = results.filter(x => x.code !== 0);

console.log('');
if (!failedFiles.length) {
  console.log(`TỔNG KẾT: ${results.length} file ĐẠT · ${totalPass} kiểm thử đạt · 0 lỗi · ${secs}s`);
} else {
  console.log(`TỔNG KẾT: ${results.length} file · ${totalPass} kiểm thử đạt · ${failedFiles.length} FILE LỖI · ${secs}s`);
  failedFiles.forEach(x => {
    console.log(`\n── ${x.rel} (exit ${x.code}) ──`);
    if (x.fails.length) x.fails.slice(0, 25).forEach(l => console.log('  ' + l));
    if (x.fails.length > 25) console.log(`  … còn ${x.fails.length - 25} dòng FAIL nữa (xem log)`);
    if (x.detail.length) x.detail.forEach(l => console.log('  ' + l));
  });
  console.log('\nLog đầy đủ: tests/.last-run.log');
}

process.exitCode = failedFiles.length ? 1 : 0;
