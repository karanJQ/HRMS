const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(walk(p));
    else if (p.endsWith('.jsx')) res.push(p);
  });
  return res;
}

const files = walk('hrms/src');
let changed = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('table-wrap') && content.includes("overflow: 'hidden'")) {
    content = content.replace(/overflow:\s*'hidden'/g, "overflowX: 'auto'");
    fs.writeFileSync(f, content);
    changed++;
  }
});
console.log('Fixed files:', changed);
