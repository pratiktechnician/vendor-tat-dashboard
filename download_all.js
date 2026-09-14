const https = require('https');
const fs = require('fs');

const docId = '1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8';
const editUrl = `https://docs.google.com/spreadsheets/d/${docId}/edit`;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching sheet HTML...');
  const html = await fetchUrl(editUrl);
  
  // Extract bootstrap data / sheets info
  // Google Sheets embeds metadata like: {"sheetId":1625334598,"name":"Pivot Table 1"}
  const matches = [...html.matchAll(/"sheetId":(\d+)[^}]*?"name":"([^"]+)"/g)];
  const sheets = [];
  const seen = new Set();

  for (const m of matches) {
    const id = m[1];
    const name = m[2];
    if (!seen.has(id)) {
      seen.add(id);
      sheets.push({ id, name });
    }
  }

  console.log('Found sheets:', sheets);

  if (sheets.length === 0) {
    // try alternative regex
    const matches2 = [...html.matchAll(/\[(\d+),"([^"]+)",/g)];
    for (const m of matches2) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        sheets.push({ id: m[1], name: m[2] });
      }
    }
    console.log('Found sheets (alt):', sheets);
  }

  for (const sheet of sheets) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${sheet.id}`;
    console.log(`Fetching CSV for sheet: ${sheet.name} (gid=${sheet.id})`);
    try {
      const csvData = await fetchUrl(csvUrl);
      const safeName = sheet.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      fs.writeFileSync(`sheet_${sheet.id}_${safeName}.csv`, csvData);
      console.log(`Saved sheet_${sheet.id}_${safeName}.csv (${csvData.length} bytes)`);
    } catch (err) {
      console.error(`Failed to fetch sheet ${sheet.name}:`, err.message);
    }
  }
}

main().catch(console.error);
