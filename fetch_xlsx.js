const https = require('https');
const fs = require('fs');

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

download('https://docs.google.com/spreadsheets/d/1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8/export?format=xlsx', 'data.xlsx')
  .then(() => console.log('Downloaded data.xlsx successfully'))
  .catch(err => console.error('Download error:', err));
