const https = require('https');
const fs = require('fs');

const docId = '1Yvowk4tAm_Z0lKFqsIJ-RFMaOduwfBzlbKc7nSq1qMA';
const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;

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

console.log('Downloading new sheet XLSX...');
download(url, 'new_sheet.xlsx')
  .then(() => console.log('Downloaded new_sheet.xlsx successfully'))
  .catch(err => console.error('Download error:', err));
