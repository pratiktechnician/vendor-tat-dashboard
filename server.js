/* Local development server:  node server.js   ->  http://localhost:3005
 * Serves the static dashboard and mounts the very same /api/data handler used on Vercel.
 *   DATA_SOURCE_DIR=data/mock node server.js    # read CSVs from disk instead of Google
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const dataHandler = require('./api/data');

const PORT = process.env.PORT || 3005;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.csv': 'text/csv' };
const BLOCK = /^\/(backup|node_modules|scripts|tests|supabase|\.git)(\/|$)/;

http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname === '/api/data') return dataHandler(req, res);
  if (BLOCK.test(pathname)) { res.writeHead(404); return res.end('Not found'); }
  const file = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`Dashboard: http://localhost:${PORT}/   (data source: ${process.env.DATA_SOURCE_DIR || 'Google Sheets'})`));
