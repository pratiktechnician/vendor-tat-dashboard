const fs = require('fs');

const html = fs.readFileSync('sheet_page.html', 'utf8');

console.log('HTML size:', html.length);

// Search for title / document name
const titleMatch = html.match(/<title>(.*?)<\/title>/);
console.log('Document Title:', titleMatch ? titleMatch[1] : 'Unknown');

// Search for sheet names and IDs in bootstrap data
// Patterns often look like: sheetId: 1625334598, name: "..." or [gid, name]
const gids = new Set();
const matches = html.matchAll(/sheetId["\s:]+(\d+)/gi);
for (const m of matches) {
  gids.add(m[1]);
}

const matches2 = html.matchAll(/gid=(\d+)/gi);
for (const m of matches2) {
  gids.add(m[1]);
}

console.log('Discovered GIDs:', Array.from(gids));

// Search for text around gids
Array.from(gids).forEach(gid => {
  const idx = html.indexOf(gid);
  if (idx !== -1) {
    console.log(`\nContext for GID ${gid}:`);
    console.log(html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 150)));
  }
});
