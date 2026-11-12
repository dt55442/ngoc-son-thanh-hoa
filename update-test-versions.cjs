const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.mjs'));

let totalReplaced = 0;
files.forEach(file => {
  const filePath = path.join(testDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all occurrences of v401 with v402
  const newContent = content
    .replace(/v401/g, 'v402')
    .replace(/nha-may-ngoc-son-v401/g, 'nha-may-ngoc-son-v402')
    .replace(/APP_VERSION = 'v401'/g, "APP_VERSION = 'v402'")
    .replace(/"APP_VERSION = 'v401'"/g, "\"APP_VERSION = 'v402'\"")
    .replace(/'v401'/g, "'v402'")
    .replace(/"v401"/g, '"v402"');
  
  if (content !== newContent) {
    const count = (content.match(/v401/g) || []).length;
    fs.writeFileSync(filePath, newContent, 'utf8');
    totalReplaced += count;
    console.log(`Updated: ${file} (${count} replacements)`);
  }
});

console.log(`\nTotal replacements: ${totalReplaced}`);