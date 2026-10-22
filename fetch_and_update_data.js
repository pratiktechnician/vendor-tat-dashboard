const https = require('https');
const fs = require('fs');

const GOOGLE_SHEET_SOURCES = [
  { name: 'Saesha Power', id: '1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8', gid: '802337370' },
  { name: 'PNS Telecom', id: '1Yvowk4tAm_Z0lKFqsIJ-RFMaOduwfBzlbKc7nSq1qMA', gid: '723949951' },
  { name: 'RIPL', id: '1Fa3lKVvWxL3WIWxnIhm-TpcgWm1gKWYLoGZHyvFU18c', gid: '880649132' },
  { name: 'Malfonic', id: '15Ka8mS44lxKD9pg0e8bWOebmpsibFC29J0z73skMkr8', gid: '1494733568' }
];

function fetchCsv(src) {
  return new Promise((resolve, reject) => {
    const url = 'https://docs.google.com/spreadsheets/d/' + src.id + '/export?format=csv&gid=' + src.gid;
    function get(u) {
      https.get(u, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ src, data }));
      }).on('error', reject);
    }
    get(url);
  });
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const res = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    res.push(cur.trim());
    return res;
  });
}

function parseDateStr(val) {
  if (!val) return '';
  val = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(val)) {
    const parts = val.split(/[\/\-]/);
    if (parts.length === 3) {
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      let m = parts[1].padStart(2, '0');
      let d = parts[0].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return val;
}

Promise.all(GOOGLE_SHEET_SOURCES.map(fetchCsv)).then(results => {
  const allRecords = [];
  results.forEach(({ src, data }) => {
    const matrix = parseCsv(data);
    if (matrix.length < 2) return;
    const header = matrix[0].map(h => (h || '').toString().toLowerCase().trim());
    let siteIdIdx = header.findIndex(h => h.includes('site id') || h.includes('siteid') || h.includes('lsi'));
    if (siteIdIdx === -1) siteIdIdx = 0;

    let siteNameIdx = header.findIndex(h => h.includes('site name') || h.includes('sitename') || h.includes('customer name') || h.includes('bts/customer name') || h.includes('bts / customer'));
    if (siteNameIdx === -1) siteNameIdx = 1;

    let projIdx = header.findIndex(h => h.includes('project') || h.includes('site scope'));
    let actIdx = header.findIndex(h => h === 'activity' || h.includes('activity name') || h.includes('activity') || h.includes('delivery track') || h.includes('site scope'));
    let assignedDateIdx = header.findIndex(h => h.includes('loading date') || h.includes('assigned') || h.includes('receive date') || h.includes('activity receive'));
    let completedDateIdx = header.findIndex(h => h.includes('complete date') || h.includes('completed date') || h.includes('activity done date') || h.includes('completed'));
    let tatIdx = header.findIndex(h => h.includes('actual tat') || h.includes('pns tat') || (h.includes('tat') && !h.includes('wi tat') && !h.includes('tcl') && !h.includes('remarks')));
    let tclTatIdx = header.findIndex(h => h.includes('tcl standard') || h.includes('wi tat') || h.includes('tcl'));
    let statusIdx = header.findIndex(h => h === 'status' || h.includes('installatio wip') || h.includes('wip'));
    let woStatusIdx = header.findIndex(h => h.includes('work order status') || h.includes('work order (wo)') || h.includes('wo status'));
    let remarksIdx = header.findIndex(h => h.includes('remark'));
    let stateIdx = header.findIndex(h => h.includes('state') || h.includes('circle') || h.includes('region'));

    let countForVendor = 0;
    for (let i = 1; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row || row.length === 0) continue;
      const siteId = (row[siteIdIdx] || '').trim();
      const siteName = (row[siteNameIdx] || '').trim();
      if (!siteId && !siteName) continue;

      const tatVal = tatIdx !== -1 && row[tatIdx] ? parseFloat(row[tatIdx]) : NaN;
      const tclVal = tclTatIdx !== -1 && row[tclTatIdx] ? parseFloat(row[tclTatIdx]) : 5;
      const rawStatus = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : 'Completed';
      const rawWoStatus = woStatusIdx !== -1 && row[woStatusIdx] ? row[woStatusIdx].trim() : '';
      const compDate = completedDateIdx !== -1 ? parseDateStr(row[completedDateIdx]) : '';

      allRecords.push({
        siteId: siteId || `${src.name.substring(0,3).toUpperCase()}_SITE_${i}`,
        siteName: siteName || `Site #${i}`,
        project: projIdx !== -1 && row[projIdx] ? row[projIdx].trim() : `${src.name} Project`,
        activity: actIdx !== -1 && row[actIdx] ? row[actIdx].trim() : 'Survey & Installation',
        assignedDate: assignedDateIdx !== -1 ? parseDateStr(row[assignedDateIdx]) : '2025-07-01',
        permDate: '',
        completedDate: compDate,
        tat: !isNaN(tatVal) ? tatVal : 2,
        tclTat: !isNaN(tclVal) ? tclVal : 5,
        status: rawStatus,
        rawStatus: rawStatus,
        rawWoStatus: rawWoStatus,
        remarks: remarksIdx !== -1 && row[remarksIdx] ? row[remarksIdx].trim() : 'Standard Operation',
        state: stateIdx !== -1 && row[stateIdx] ? row[stateIdx].trim() : 'East',
        region: 'East',
        vendor: src.name
      });
      countForVendor++;
    }
    console.log(`${src.name}: ${countForVendor} records parsed`);
  });

  console.log('Total extracted live records:', allRecords.length);
  fs.writeFileSync('data.json', JSON.stringify({ rawRecords: allRecords }, null, 2), 'utf8');
  console.log('Saved data.json successfully with', allRecords.length, 'records.');
}).catch(err => {
  console.error('Fetch error:', err);
});
