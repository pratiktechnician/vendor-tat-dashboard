/* Builds dashboard-standalone.html: one file, double-click to open (embeds CSS, JS, Chart.js and a data snapshot). */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const safe = js => js.replace(/<\/script/gi, '<\/script');
let html = rd('index.html');
html = html.replace('<link rel="stylesheet" href="assets/css/dashboard.css">', () => `<style>\n${rd('assets/css/dashboard.css')}\n</style>`);
const snap = fs.existsSync(path.join(root, 'data/latest.json')) ? rd('data/latest.json') : 'null';
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => src === 'assets/js/app.js'
  ? `<script>window.__TAT_SNAPSHOT__=${safe(snap)};</script>\n<script>\n${safe(rd(src))}\n</script>`
  : `<script>\n${safe(rd(src))}\n</script>`);
fs.writeFileSync(path.join(root, 'dashboard-standalone.html'), html);
console.log('dashboard-standalone.html', (html.length / 1048576).toFixed(2) + ' MB');
