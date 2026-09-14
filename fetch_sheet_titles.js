const https = require('https');

const urls = [
  'https://docs.google.com/spreadsheets/d/1Fa3lKVvWxL3WIWxnIhm-TpcgWm1gKWYLoGZHyvFU18c/edit?gid=880649132',
  'https://docs.google.com/spreadsheets/d/15Ka8mS44lxKD9pg0e8bWOebmpsibFC29J0z73skMkr8/edit?gid=1494733568'
];

function fetchTitle(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchTitle(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/<title>(.*?)<\/title>/i);
        resolve(match ? match[1] : 'No Title Found');
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const url of urls) {
    try {
      const title = await fetchTitle(url);
      console.log(`URL: ${url}\nTitle: ${title}\n`);
    } catch (err) {
      console.error(`Error for ${url}:`, err.message);
    }
  }
}

main();
