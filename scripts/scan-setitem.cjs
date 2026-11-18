// Công cụ phát triển tạm — quét các lệnh localStorage.setItem KHÔNG nằm trong try/catch
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'js');
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/);
  lines.forEach((ln, i) => {
    if (!ln.includes('localStorage.setItem')) return;
    const prev = lines[i - 1] || '';
    const guarded = /try\s*\{/.test(ln) || /try\s*\{\s*$/.test(prev.trim()) || /catch/.test(prev) || /catch/.test(ln) || /safeSetItemWithRecovery/.test(prev);
    if (!guarded) console.log(f + ':' + (i + 1) + ': ' + ln.trim().slice(0, 160));
  });
}
