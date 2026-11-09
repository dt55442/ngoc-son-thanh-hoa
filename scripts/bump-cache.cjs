// scripts/bump-cache.cjs — công cụ phát triển: tăng CACHE_NAME sw.js + APP_VERSION + regex trong tests
// (KHÔNG vào APP_SHELL, không chạy trong npm test — xem quy tắc 41)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const [from, to] = process.argv.slice(2);
if (!from || !to) { console.error('Dùng: node scripts/bump-cache.cjs v377 v378'); process.exit(1); }
const root = path.resolve(__dirname, '..');
for (const f of ['sw.js', 'js/state.js']) {
  const p = path.join(root, f);
  let s = fs.readFileSync(p, 'utf8');
  s = s.split(`nha-may-ngoc-son-${from}`).join(`nha-may-ngoc-son-${to}`);
  s = s.split(`APP_VERSION = '${from}'`).join(`APP_VERSION = '${to}'`);
  fs.writeFileSync(p, s);
  console.log('đã đổi', f);
}
const files = execSync('git ls-files tests', { cwd: root }).toString().trim().split(/\r?\n/);
let n = 0;
for (const f of files) {
  if (!f.endsWith('.mjs')) continue;
  const p = path.join(root, f);
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes(`nha-may-ngoc-son-${from}`)) {
    t = t.split(`nha-may-ngoc-son-${from}`).join(`nha-may-ngoc-son-${to}`);
    fs.writeFileSync(p, t);
    n++;
  }
}
console.log('đã đổi', n, 'file test');
