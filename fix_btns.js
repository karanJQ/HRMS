const fs = require('fs');
let css = fs.readFileSync('src/pages/Landing.css', 'utf8');

// Fix .btn-demo
css = css.replace(
  /\.landing-page \.btn-demo\s*\{[^}]+\}/,
  `.landing-page .btn-demo {
  background: #162660;
  color: #FEFEFA;
  border: none;
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: all .2s;
  box-shadow: 0 4px 12px rgba(22, 38, 96, 0.2);
}`
);

// Fix .btn-outline
css = css.replace(
  /\.landing-page \.btn-outline\s*\{[^}]+\}/,
  `.landing-page .btn-outline {
  background: transparent;
  color: #162660;
  border: 1px solid rgba(22, 38, 96, 0.2);
  padding: 11px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: all .2s;
}`
);
css = css.replace(
  /\.landing-page \.btn-outline:hover\s*\{[^}]+\}/,
  `.landing-page .btn-outline:hover {
  background: rgba(22, 38, 96, 0.05);
  border-color: #162660;
}`
);

// Fix .btn-primary-lg
css = css.replace(
  /\.landing-page \.btn-primary-lg\s*\{[^}]+\}/,
  `.landing-page .btn-primary-lg {
  background: #162660;
  color: #FEFEFA;
  border: none;
  padding: 14px 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all .2s;
  box-shadow: 0 4px 15px rgba(22, 38, 96, 0.25);
}`
);

css = css.replace(
  /\.landing-page \.btn-primary-lg:hover\s*\{[^}]+\}/,
  `.landing-page .btn-primary-lg:hover {
  background: #68aae8;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(104, 170, 232, 0.3);
  color: #FEFEFA;
}`
);

// Fix .btn-ghost-lg
css = css.replace(
  /\.landing-page \.btn-ghost-lg\s*\{[^}]+\}/,
  `.landing-page .btn-ghost-lg {
  background: rgba(22, 38, 96, 0.05);
  color: #162660;
  border: 1px solid rgba(22, 38, 96, 0.1);
  padding: 14px 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all .2s;
}`
);
css = css.replace(
  /\.landing-page \.btn-ghost-lg:hover\s*\{[^}]+\}/,
  `.landing-page .btn-ghost-lg:hover {
  background: rgba(22, 38, 96, 0.1);
  border-color: rgba(22, 38, 96, 0.2);
}`
);

// Make .btn-demo hover use accent
css = css.replace(
  /\.landing-page \.btn-demo:hover\s*\{[^}]+\}/,
  `.landing-page .btn-demo:hover {
  background: #68aae8;
  transform: translateY(-1px);
  color: #FEFEFA;
}`
);

fs.writeFileSync('src/pages/Landing.css', css);
console.log('Fixed buttons');
