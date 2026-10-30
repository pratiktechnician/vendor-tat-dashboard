/* Writes data/latest.json from the live sheets (static fallback if /api/data is unreachable). */
const fs = require('fs'), path = require('path');
require('../lib/datasource').buildPayload().then(p => {
  fs.writeFileSync(path.join(__dirname, '../data/latest.json'), JSON.stringify(p));
  console.log(`data/latest.json written: ${p.records.length} rows, source ${p.source}`);
});
