const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend/src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

const spinnerRegexes = [
  /<div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"><\/div>/g,
  /<div className="animate-spin w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"><\/div>/g,
  /<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"><\/div>/g,
  /<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"><\/div>/g,
  /<div className="w-10 h-10 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"><\/div>/g
];

files.forEach(file => {
  if (file === 'InstitutionDashboard.jsx' || file === 'AdminDemandsPage.jsx') return;
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  spinnerRegexes.forEach(regex => {
    if (regex.test(content)) {
      content = content.replace(regex, '<TricolorSpinner size="w-10 h-10" />');
      changed = true;
    }
  });

  if (changed) {
    if (!content.includes('TricolorSpinner')) {
       // Insert import after the first import React...
       content = content.replace(/(import React.*?;\n)/, '$1import TricolorSpinner from \'../components/TricolorSpinner\';\n');
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
});
