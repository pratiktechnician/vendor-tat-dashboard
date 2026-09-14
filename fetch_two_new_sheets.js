const https = require('https');
const fs = require('fs');

const sheets = [
  { id: '1Fa3lKVvWxL3WIWxnIhm-TpcgWm1gKWYLoGZHyvFU18c', name: 'vendor_3.xlsx' },
  { id: '15Ka8mS44lxKD9pg0e8bWOebmpsibFC29J0z73skMkr8', name: 'vendor_4.xlsx' }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  for (const s of sheets) {
    const url = `https://docs.google.com/spreadsheets/d/${s.id}/export?format=xlsx`;
    console.log(`Downloading ${s.name}...`);
    try {
      await download(url, s.name);
      console.log(`Saved ${s.name}`);
    } catch (err) {
      console.error(`Error downloading ${s.name}:`, err.message);
    }
  }
}

main();
