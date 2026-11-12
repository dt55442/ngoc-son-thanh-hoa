const fs = require('fs');
const content = fs.readFileSync('js/main.js', 'utf8');

// Remove the first occurrence
const newContent = content
  .replace("await loadModulesForView(state.activeView || 'dashboard-view');\n\n      // Chạy các nhóm load song song", "// Chạy các nhóm load song song")
  .replace("await loadModulesForView(bootView);\n          }", "          }");

fs.writeFileSync('js/main.js', newContent, 'utf8');
console.log('Removed lazy-load calls!');