const fs = require('fs');
let css = fs.readFileSync('src/pages/Landing.css', 'utf8');

css = css.replace(/\.landing-page \.nav-links a:hover\s*\{\s*color:\s*#ffffff;/g, '.landing-page .nav-links a:hover { color: #162660;');

css = css.replace(/color:\s*#ffffff;/g, (match, offset) => {
  // if it's .btn-demo or similar button, keep it. Otherwise make it #162660
  if (css.substring(Math.max(0, offset - 50), offset).includes('btn')) {
    return match;
  }
  return 'color: #162660;';
});

fs.writeFileSync('src/pages/Landing.css', css);

let jsx = fs.readFileSync('src/pages/Landing.jsx', 'utf8');
jsx = jsx.replace(/color:\s*['"]#fff(?:fff)?['"]/ig, 'color: "#162660"');
jsx = jsx.replace(/color=['"]#fff(?:fff)?['"]/ig, 'color="#162660"');
jsx = jsx.replace(/a\.style\.color\s*=\s*['"]#fff['"]/ig, "a.style.color = '#162660'");
jsx = jsx.replace(/a\.style\.color\s*=\s*['"]['"]/ig, "a.style.color = '#162660'");

fs.writeFileSync('src/pages/Landing.jsx', jsx);
console.log('Fixed text colors to dark #162660');
