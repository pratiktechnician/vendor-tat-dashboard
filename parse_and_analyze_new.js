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

console.log(`Loaded ${sharedStrings.length} shared strings for new sheet.`);

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

function excelDateToJS(serial) {
  const num = parseFloat(serial);
  if (isNaN(num)) return serial;
  if (num < 1000) return serial;
  const utc_days  = Math.floor(num - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

const mainRows = parseSheet(path.join(__dirname, 'extracted_new_xlsx', 'xl', 'worksheets', 'sheet1.xml'));
const teamRows = parseSheet(path.join(__dirname, 'extracted_new_xlsx', 'xl', 'worksheets', 'sheet2.xml'));

console.log(`Main Sheet Total Rows: ${mainRows.length}`);
console.log(`Team Details Total Rows: ${teamRows.length}`);

// Header is row 0 or 1
let headerRowIdx = 0;
for (let i = 0; i < 5; i++) {
  if (mainRows[i] && mainRows[i].some(c => c && typeof c === 'string' && (c.includes('Region') || c.includes('State') || c.includes('Site')))) {
    headerRowIdx = i;
    break;
  }
}

const headers = mainRows[headerRowIdx] || [];
console.log('Headers found at row', headerRowIdx + 1, ':', headers);

const data = [];
for (let i = headerRowIdx + 1; i < mainRows.length; i++) {
  const r = mainRows[i];
  if (!r || r.length === 0) continue;
  const obj = { _rowNum: i + 1 };
  for (let j = 0; j < headers.length; j++) {
    const key = headers[j] ? headers[j].trim() : `col_${j}`;
    obj[key] = r[j] !== undefined ? r[j] : '';
  }
  if (Object.values(obj).some(v => v !== '')) {
    data.push(obj);
  }
}

console.log(`Valid records in Main Sheet: ${data.length}`);

// Analyze Main Sheet
const trackStats = {};
const stateStats = {};
const projectStats = {};
const tatRemarksStats = {};
const woStatusStats = {};
const statusYtsStats = {};
let totalTAT = 0;
let tatCount = 0;
const trackTAT = {};

const julyRecords = [];
const julyDateCounts = {};

data.forEach(item => {
  const track = item['Delivery Track'] || item['Track'] || 'Unspecified';
  const state = item['State'] || 'Unspecified';
  const project = item['Project Name'] || item['Project'] || 'Unspecified';
  const tatRemark = item['TAT Remarks'] || item['TAT Remark'] || 'Unspecified';
  const woStatus = item['Work Order Status'] || 'Unspecified';
  const statusYts = item['Pending/YTS'] || item['Status'] || 'Unspecified';

  const loadingRaw = item['Loading date from wi team'] || item['Loading Date'] || '';
  const completeRaw = item['Complete date'] || item['Complete Date'] || '';
  const permRaw = item['Permission Required Date'] || item['Permission Date'] || '';

  const loadingDate = excelDateToJS(loadingRaw);
  const completeDate = excelDateToJS(completeRaw);
  const permDate = excelDateToJS(permRaw);

  const tatVal = parseFloat(item['TAT']);

  trackStats[track] = (trackStats[track] || 0) + 1;
  stateStats[state] = (stateStats[state] || 0) + 1;
  projectStats[project] = (projectStats[project] || 0) + 1;
  tatRemarksStats[tatRemark] = (tatRemarksStats[tatRemark] || 0) + 1;
  woStatusStats[woStatus] = (woStatusStats[woStatus] || 0) + 1;
  statusYtsStats[statusYts] = (statusYtsStats[statusYts] || 0) + 1;

  if (!isNaN(tatVal) && tatVal >= 0 && tatVal < 1000) {
    totalTAT += tatVal;
    tatCount++;
    if (!trackTAT[track]) trackTAT[track] = { sum: 0, count: 0, min: 9999, max: -9999 };
    trackTAT[track].sum += tatVal;
    trackTAT[track].count++;
    if (tatVal < trackTAT[track].min) trackTAT[track].min = tatVal;
    if (tatVal > trackTAT[track].max) trackTAT[track].max = tatVal;
  }

  // July check
  const isJulyLoading = typeof loadingDate === 'string' && (loadingDate.includes('-07-') || loadingRaw.includes('Jul'));
  const isJulyComplete = typeof completeDate === 'string' && (completeDate.includes('-07-') || completeRaw.includes('Jul'));

  if (isJulyLoading || isJulyComplete) {
    const dKey = isJulyComplete ? completeDate : loadingDate;
    julyDateCounts[dKey] = (julyDateCounts[dKey] || 0) + 1;

    julyRecords.push({
      rowNum: item._rowNum,
      siteId: item['Site id'] || item['Site ID'],
      siteName: item['Site Name'],
      state,
      track,
      project,
      loadingDate,
      completeDate,
      tat: item['TAT'],
      wiTat: item['WI TAT'],
      tatRemarks: tatRemark,
      pendingYts: statusYts,
      remarks: item['Remarks'] || item['Vendor Remarks']
    });
  }
});

const trackTATAverages = {};
for (const tr in trackTAT) {
  trackTATAverages[tr] = {
    avgTAT: (trackTAT[tr].sum / trackTAT[tr].count).toFixed(2),
    count: trackTAT[tr].count,
    min: trackTAT[tr].min,
    max: trackTAT[tr].max
  };
}

// Team Details Analysis
const teamList = [];
if (teamRows.length > 0) {
  const tHeaders = teamRows[0] || [];
  console.log('Team Details Headers:', tHeaders);
  for (let i = 1; i < teamRows.length; i++) {
    const r = teamRows[i];
    if (r && r.length > 0) {
      teamList.push({
        slNo: r[0] || i,
        name: r[1] || r[0],
        trained: r[2] || '',
        designation: r[3] || '',
        state: r[4] || '',
        poa: r[5] || ''
      });
    }
  }
}

const analysisResult = {
  totalRecords: data.length,
  overallAvgTAT: tatCount > 0 ? (totalTAT / tatCount).toFixed(2) : 0,
  headers,
  trackStats,
  stateStats,
  projectStats,
  tatRemarksStats,
  woStatusStats,
  statusYtsStats,
  trackTATAverages,
  julyAnalysis: {
    totalJulyRecords: julyRecords.length,
    completedInJuly: julyRecords.filter(r => r.completeDate && r.completeDate.includes('-07-')).length,
    pendingInJuly: julyRecords.filter(r => !r.completeDate || r.completeDate === '').length,
    inTatJuly: julyRecords.filter(r => r.tatRemarks === 'In TAT').length,
    outsideTatJuly: julyRecords.filter(r => r.tatRemarks === 'Outside TAT').length,
    julyDateCounts,
    julySample: julyRecords.slice(0, 25)
  },
  teamList,
  allDataSample: data.slice(0, 50)
};

fs.writeFileSync('new_sheet_analysis.json', JSON.stringify(analysisResult, null, 2));
console.log('Analysis of new sheet completed successfully.');
