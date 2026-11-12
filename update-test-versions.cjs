const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.mjs'));

let totalReplaced = 0;
files.forEach(file => {
  const filePath = path.join(testDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all occurrences of v401/v402 with v403
  const newContent = content
    .replace(/v40[12]/g, 'v403')
    .replace(/nha-may-ngoc-son-v40[12]/g, 'nha-may-ngoc-son-v403')
    .replace(/APP_VERSION = 'v40[12]'/g, "APP_VERSION = 'v403'")
    .replace(/"APP_VERSION = 'v40[12]'"/g, "\"APP_VERSION = 'v403'\"")
    .replace(/'v40[12]'/g, "'v403'")
    .replace(/"v40[12]"/g, '"v403"');
  
  if (content !== newContent) {
    const count = (content.match(/v40[12]/g) || []).length;
    fs.writeFileSync(filePath, newContent, 'utf8');
    totalReplaced += count;
    console.log(`Updated: ${file} (${count} replacements)`);
  }
});

console.log(`\nTotal replacements: ${totalReplaced}`);