const fs = require('fs');
const path = require('path');

const uiDir = path.join(__dirname, '..', 'src', 'ui');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let original = content;

      // 1. Replace whileTap={{ scale: 0.xx }} with whileTap={{ opacity: 0.85 }}
      content = content.replace(/whileTap=\{\{\s*scale:\s*0\.\d+\s*\}\}/g, 'whileTap={{ opacity: 0.85 }}');
      
      // 2. Replace whileTap={{ scale: 0.xx, ... }} with whileTap={{ opacity: 0.85, ... }}
      content = content.replace(/whileTap=\{\{\s*scale:\s*0\.\d+,\s*/g, 'whileTap={{ opacity: 0.85, ');

      // 3. Replace whileHover={{ scale: 1.xx }} or whileHover={{ scale: 1.xx, ... }}
      content = content.replace(/whileHover=\{\{\s*scale:\s*1\.\d+\s*\}\}/g, 'whileHover={{ opacity: 0.9 }}');
      content = content.replace(/whileHover=\{\{\s*scale:\s*1\.\d+,\s*/g, 'whileHover={{ opacity: 0.9, ');

      // 4. Remove scale from object definitions like { scale: 0.95 } or { scale: 1.05 } inside whileTap/whileHover
      content = content.replace(/:\s*\{\s*scale:\s*0\.\d+\s*\}/g, ': { opacity: 0.85 }');
      content = content.replace(/:\s*\{\s*scale:\s*1\.\d+\s*\}/g, ': { opacity: 0.9 }');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDir(uiDir);
console.log('Finished removing scale animations.');
