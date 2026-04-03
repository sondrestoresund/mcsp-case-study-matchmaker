const fs = require('fs');
const path = require('path');

const root = __dirname;
const docsPath = path.join(root, 'src', 'caseStudyDocuments.json');
const extractsPath = path.join(root, 'src', 'caseStudyExtracts.json');
const publicDir = path.join(root, 'public', 'case-study-files');
fs.mkdirSync(publicDir, { recursive: true });

function processFile(jsonPath) {
  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  for (const item of items) {
    if (!item.path) continue;
    const src = item.path;
    const base = path.basename(src);
    const dest = path.join(publicDir, base);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
    item.path = `/case-study-files/${base}`;
  }
  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2));
}

processFile(docsPath);
processFile(extractsPath);
console.log('Done');
