const fs = require('fs');
const content = fs.readFileSync('tests/loading.test.mjs', 'utf8');

const newContent = content.replace(
  /function switchView\\\(targetViewId\\\)\\\\s*\\\\{\\\\s*switchViewCore\\\(targetViewId\\\);\\\\s*\\\\}/,
  'function switchView\\\\(targetViewId\\\\)\\\\s*\\\\{\\\\s*switchViewCore\\\\(targetViewId\\\\)\\\\.catch\\('
);

fs.writeFileSync('tests/loading.test.mjs', newContent, 'utf8');
console.log('Updated B8 test regex!');