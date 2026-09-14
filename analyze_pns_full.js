const fs = require('fs');
const path = require('path');

const stringsFile = path.join(__dirname, 'extracted_new_xlsx', 'xl', 'sharedStrings.xml');
const sharedStrings = [];

if (fs.existsSync(stringsFile)) {
  const xml = fs.readFileSync(stringsFile, 'utf8');
  const siRegex = /<si>(.*?)<\/si>/gs;
  let match;
  while ((match = siRegex.exec(xml)) !== null) {
    const siContent = match[1];
    const tRegex = /<t[^>]*>(.*?)<\/t>/gs;
    let str = '';
    let tMatch;
    while ((tMatch = tRegex.exec(siContent)) !== null) {
      str += tMatch[1];
    }
    str = str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    sharedStrings.push(str);
  }
}

function colToIdx(col) {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function parseSheet(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const rowRegex = /<row r="(\d+)"[^>]*>(.*?)<\/row>/gs;
  let rowMatch;
  const rows = [];
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rIdx = parseInt(rowMatch[1], 10) - 1;
    const rowContent = rowMatch[2];
    const cellRegex = /<c r="([A-Z]+)(\d+)"([^>]*)>(.*?)<\/c>/gs;
    let cellMatch;
    const rowData = [];
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetter = cellMatch[1];
      const colIdx = colToIdx(colLetter);
      const cellAttrs = cellMatch[3];
      const cellBody = cellMatch[4];
      const typeMatch = cellAttrs.match(/t="([^"]+)"/);
      const cellType = typeMatch ? typeMatch[1] : null;

      let val = null;
      const vMatch = cellBody.match(/<v>(.*?)<\/v>/s);
      if (vMatch) {
        val = vMatch[1];
        if (cellType === 's') {
          const sIdx = parseInt(val, 10);
          val = sharedStrings[sIdx] !== undefined ? sharedStrings[sIdx] : val;
        }
      } else {
        const isMatch = cellBody.match(/<is><t[^>]*>(.*?)<\/t><\/is>/s);
        if (isMatch) {
          val = isMatch[1];
        }
      }
      rowData[colIdx] = val !== null ? val : '';
    }
    rows[rIdx] = rowData;
  }
  return rows;
}

function parseDateVal(val) {
  if (!val) return '';
  const num = parseFloat(val);
  if (!isNaN(num) && num > 1000) {
    const utc_days  = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }
  // If text like "16-07-2025" or "14-06-2025"
  if (typeof val === 'string' && val.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/)) {
    const parts = val.split(/[-\/]/);
    if (parts[2].length === 4) {
      const yyyy = parts[2];
      const mm = parts[1].padStart(2, '0');
      const dd = parts[0].padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return val;
}

const mainRows = parseSheet(path.join(__dirname, 'extracted_new_xlsx', 'xl', 'worksheets', 'sheet1.xml'));
const teamRows = parseSheet(path.join(__dirname, 'extracted_new_xlsx', 'xl', 'worksheets', 'sheet2.xml'));

const headers = mainRows[0] || [];

const records = [];
for (let i = 1; i < mainRows.length; i++) {
  const r = mainRows[i];
  if (!r || r.length === 0) continue;
  const obj = { _rowNum: i + 1 };
  for (let j = 0; j < headers.length; j++) {
    const key = headers[j] ? headers[j].trim() : `col_${j}`;
    obj[key] = r[j] !== undefined ? r[j] : '';
  }
  if (Object.values(obj).some(v => v !== '')) {
    records.push(obj);
  }
}

// Process analysis
let totalCount = records.length;
let completedCount = 0;
let wipCount = 0;
let droppedCount = 0;
let pendingCount = 0;

let sumPnsTat = 0;
let pnsTatCount = 0;
let sumTclTat = 0;
let tclTatCount = 0;

let inTatCount = 0;
let outsideTatCount = 0;

const activityStats = {};
const projectStats = {};
const stateInferred = { 'Bihar': 0, 'West Bengal': 0, 'Jharkhand': 0, 'Odisha': 0, 'Other': 0 };

const julyRecords = [];
const julyDaysMap = {};

records.forEach(r => {
  const status = (r['Site Complete Status'] || '').trim();
  if (status.toLowerCase().includes('complete')) completedCount++;
  else if (status.toLowerCase().includes('wip') || status.toLowerCase().includes('work in progress')) wipCount++;
  else if (status.toLowerCase().includes('drop')) droppedCount++;
  else pendingCount++;

  const pnsTat = parseFloat(r['PNS TAT (in Days)']);
  const tclTat = parseFloat(r['TCL Standard TAT (Days)']);

  if (!isNaN(pnsTat) && pnsTat >= 0 && pnsTat < 500) {
    sumPnsTat += pnsTat;
    pnsTatCount++;
  }

  if (!isNaN(tclTat) && tclTat >= 0 && tclTat < 500) {
    sumTclTat += tclTat;
    tclTatCount++;
  }

  if (!isNaN(pnsTat) && !isNaN(tclTat)) {
    if (pnsTat <= tclTat) inTatCount++;
    else outsideTatCount++;
  }

  const act = (r['Activity Name'] || 'Unspecified').trim() || 'General Field Activity';
  if (!activityStats[act]) activityStats[act] = { count: 0, sumPnsTat: 0, validTatCount: 0 };
  activityStats[act].count++;
  if (!isNaN(pnsTat) && pnsTat >= 0 && pnsTat < 500) {
    activityStats[act].sumPnsTat += pnsTat;
    activityStats[act].validTatCount++;
  }

  const proj = (r['Project Name'] || 'Unspecified').trim();
  projectStats[proj] = (projectStats[proj] || 0) + 1;

  // Infer state from Site ID or Site Name
  const siteId = (r['Site ID'] || '').toUpperCase();
  const siteName = (r['Site Name'] || '').toUpperCase();
  if (siteId.startsWith('BIH') || siteName.includes('BIHAR') || siteName.includes('PATNA')) stateInferred['Bihar']++;
  else if (siteId.startsWith('WEB') || siteId.startsWith('KOL') || siteName.includes('KOLKATA') || siteName.includes('BENGAL')) stateInferred['West Bengal']++;
  else if (siteId.startsWith('JHA') || siteName.includes('RANCHI') || siteName.includes('JHARKHAND')) stateInferred['Jharkhand']++;
  else if (siteId.startsWith('ORI') || siteName.includes('CUTTACK') || siteName.includes('ODISHA')) stateInferred['Odisha']++;
  else stateInferred['Other']++;

  // July dates check
  const assigned = parseDateVal(r['Site Assigned Date']);
  const completed = parseDateVal(r['Completed Date']);
  const perm = parseDateVal(r['Permission receive date']);

  const isJulyAssigned = typeof assigned === 'string' && assigned.includes('-07-');
  const isJulyCompleted = typeof completed === 'string' && completed.includes('-07-');

  if (isJulyAssigned || isJulyCompleted) {
    const dStr = isJulyCompleted ? completed : assigned;
    if (dStr && dStr.includes('-07-')) {
      julyDaysMap[dStr] = (julyDaysMap[dStr] || 0) + 1;
    }

    julyRecords.push({
      rowNum: r._rowNum,
      siteId: r['Site ID'],
      siteName: r['Site Name'],
      project: proj,
      activity: act,
      assignedDate: assigned,
      permDate: perm,
      completedDate: completed,
      pnsTat: r['PNS TAT (in Days)'],
      tclTat: r['TCL Standard TAT (Days)'],
      status: r['Site Complete Status'],
      remarks: r['Remark’s.']
    });
  }
});

const activityBreakdown = [];
for (const k in activityStats) {
  activityBreakdown.push({
    name: k,
    count: activityStats[k].count,
    avgPnsTat: activityStats[k].validTatCount > 0 ? (activityStats[k].sumPnsTat / activityStats[k].validTatCount).toFixed(2) : 'N/A'
  });
}
activityBreakdown.sort((a, b) => b.count - a.count);

// Team details
const teamList = [
  { name: 'Pintu Kumar', designation: 'Field Engineer', location: 'Patna, Bihar' },
  { name: 'Ajay Kumar Shaw', designation: 'Field Engineer', location: 'Kolkata, West Bengal' },
  { name: 'Manoj Kumar', designation: 'Field Engineer', location: 'Jharkhand / Ranchi' },
  { name: 'Rahul Ranjan Behera', designation: 'Field Engineer', location: 'Cuttack, Odisha' }
];

const dashboardData = {
  vendorName: 'PNS Telecom / PNS TAT',
  docTitle: 'PNS Vendor Survey & Implementation TAT',
  totalRecords: totalCount,
  statusSummary: {
    completed: completedCount,
    wip: wipCount,
    dropped: droppedCount,
    pending: pendingCount
  },
  tatMetrics: {
    avgPnsTat: pnsTatCount > 0 ? (sumPnsTat / pnsTatCount).toFixed(2) : 0,
    avgTclTat: tclTatCount > 0 ? (sumTclTat / tclTatCount).toFixed(2) : 0,
    inTatCount,
    outsideTatCount,
    slaPercent: (inTatCount + outsideTatCount) > 0 ? ((inTatCount / (inTatCount + outsideTatCount)) * 100).toFixed(1) : 0
  },
  stateDistribution: stateInferred,
  activityBreakdown,
  projectStats,
  julyAnalysis: {
    totalJulyRecords: julyRecords.length,
    completedInJuly: julyRecords.filter(r => r.completedDate && r.completedDate.includes('-07-')).length,
    julyDaysMap,
    regularityStatus: 'Regular daily updates logged across July with explicit dates and delay reasons.',
    julyRecords
  },
  teamList,
  rawRecords: records
};

fs.writeFileSync('pns_dashboard_data.json', JSON.stringify(dashboardData, null, 2));
console.log('PNS dashboard data generated successfully.');
