const fs = require('fs');
const content = fs.readFileSync('tests/than-hoa.test.mjs', 'utf8');

const newContent = content.replace(
  /check\('CUỘN: rời tab Công Đoạn khi đang mở thẻ Xưởng 2 → pop-up đóng \+ trạng thái thẻ đang mở được dọn',\s*\(\s*function\s*\(\s*\)\s*\{/,
  "check('CUỘN: rời tab Công Đoạn khi đang mở thẻ Xưởng 2 → pop-up đóng + trạng thái thẻ đang mở được dọn',\n  (async function () {"
);

fs.writeFileSync('tests/than-hoa.test.mjs', newContent, 'utf8');
console.log('Fixed async IIFE in than-hoa test!');