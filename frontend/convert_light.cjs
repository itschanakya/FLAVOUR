const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Backgrounds
      content = content.replace(/bg-slate-950/g, 'bg-slate-50');
      content = content.replace(/bg-slate-900/g, 'bg-white');
      content = content.replace(/bg-slate-800/g, 'bg-slate-100');
      
      // Borders
      content = content.replace(/border-slate-800/g, 'border-slate-200');
      content = content.replace(/border-slate-700/g, 'border-slate-300');
      
      // Text
      content = content.replace(/text-white/g, 'text-slate-900');
      content = content.replace(/text-slate-100/g, 'text-slate-900');
      content = content.replace(/text-slate-200/g, 'text-slate-800');
      content = content.replace(/text-slate-300/g, 'text-slate-700');
      content = content.replace(/text-slate-400/g, 'text-slate-500');

      // Specific hover states
      content = content.replace(/hover:bg-slate-700/g, 'hover:bg-slate-200');
      content = content.replace(/hover:bg-slate-800/g, 'hover:bg-slate-100');
      
      // Fix specific color clashes (e.g. text-blue-400 might be too light, change to blue-600)
      content = content.replace(/text-blue-400/g, 'text-blue-600');
      content = content.replace(/text-emerald-400/g, 'text-emerald-600');
      content = content.replace(/text-rose-400/g, 'text-rose-600');
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDir(srcDir);
console.log('JSX class names converted to light mode.');
