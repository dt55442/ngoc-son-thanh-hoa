const fs = require('fs');
const content = fs.readFileSync('js/main.js', 'utf8');

// Remove all occurrences of loadModulesForView and related comments
const newContent = content
  .replace("// Load modules cho tab mặc định (dashboard-view) trước\n      await loadModulesForView(state.activeView || 'dashboard-view');\n\n      // Chạy các nhóm load song song", "// Chạy các nhóm load song song")
  .replace("await loadModulesForView(bootView);\n          }", "          }")
  .replace("// Lazy-load module cho tab editor\n          await loadModulesForView(bootView);", "");

fs.writeFileSync('js/main.js', newContent, 'utf8');
console.log('Removed lazy-load calls!');