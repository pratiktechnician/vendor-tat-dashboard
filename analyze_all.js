const fs = require('fs');
const path = require('path');

const stringsFile = path.join(__dirname, 'extracted_xlsx', 'xl', 'sharedStrings.xml');
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

const mainDataRows = parseSheet(path.join(__dirname, 'extracted_xlsx', 'xl', 'worksheets', 'sheet3.xml'));
const wiTatRows = parseSheet(path.join(__dirname, 'extracted_xlsx', 'xl', 'worksheets', 'sheet4.xml'));
const manPowerRows = parseSheet(path.join(__dirname, 'extracted_xlsx', 'xl', 'worksheets', 'sheet5.xml'));

// Header of Main Data is row index 0
const headers = mainDataRows[0] || [];
console.log('Main Data Headers:', headers);

const data = [];
for (let i = 1; i < mainDataRows.length; i++) {
  const row = mainDataRows[i];
  if (!row || row.length === 0) continue;
  const obj = {};
  for (let j = 0; j < headers.length; j++) {
    const key = headers[j] ? headers[j].trim() : `col_${j}`;
    obj[key] = row[j] !== undefined ? row[j] : '';
  }
  if (Object.values(obj).some(v => v !== '')) {
    data.push(obj);
  }
}

console.log(`Total valid Main Data records: ${data.length}`);

// Analysis 1: Delivery Track breakdown
const trackStats = {};
// Analysis 2: State breakdown
const stateStats = {};
// Analysis 3: TAT Remarks breakdown (In TAT, Outside TAT, Pending, etc.)
const tatRemarksStats = {};
// Analysis 4: Work Order Status
const woStatusStats = {};
// Analysis 5: Project Name
const projectStats = {};
// Analysis 6: TAT values distribution
let totalTAT = 0;
let tatCount = 0;
const trackTAT = {};

data.forEach(item => {
  const track = item['Delivery Track'] || 'Unspecified';
  const state = item['State'] || 'Unspecified';
  const tatRemark = item['TAT Remarks'] || 'Unspecified';
  const woStatus = item['Work Order Status'] || 'Unspecified';
  const project = item['Project Name'] || 'Unspecified';
  const tatVal = parseFloat(item['TAT']);

  trackStats[track] = (trackStats[track] || 0) + 1;
  stateStats[state] = (stateStats[state] || 0) + 1;
  tatRemarksStats[tatRemark] = (tatRemarksStats[tatRemark] || 0) + 1;
  woStatusStats[woStatus] = (woStatusStats[woStatus] || 0) + 1;
  projectStats[project] = (projectStats[project] || 0) + 1;

  if (!isNaN(tatVal)) {
    totalTAT += tatVal;
    tatCount++;
    if (!trackTAT[track]) trackTAT[track] = { sum: 0, count: 0, values: [] };
    trackTAT[track].sum += tatVal;
    trackTAT[track].count++;
    trackTAT[track].values.push(tatVal);
  }
});

const trackTATAverages = {};
for (const tr in trackTAT) {
  trackTATAverages[tr] = {
    avgTAT: (trackTAT[tr].sum / trackTAT[tr].count).toFixed(2),
    count: trackTAT[tr].count,
    min: Math.min(...trackTAT[tr].values),
    max: Math.max(...trackTAT[tr].values)
  };
}

// WI TAT benchmarks
const wiTatList = [];
if (wiTatRows.length > 0) {
  const wiHeaders = wiTatRows[0] || [];
  for (let i = 1; i < wiTatRows.length; i++) {
    const r = wiTatRows[i];
    if (r && r.length > 0) {
      wiTatList.push({
        track: r[0],
        subTrack: r[1],
        targetDays: r[2]
      });
    }
  }
}

// Man Power list
const manPowerList = [];
if (manPowerRows.length > 0) {
  const mpHeaders = manPowerRows[0] || [];
  for (let i = 1; i < manPowerRows.length; i++) {
    const r = manPowerRows[i];
    if (r && r.length > 0 && (r[1] || r[3])) {
      manPowerList.push({
        slNo: r[0],
        name: r[1],
        trained: r[2],
        designation: r[3],
        state: r[4],
        poa: r[5]
      });
    }
  }
}

const summaryReport = {
  totalRecords: data.length,
  overallAvgTAT: tatCount > 0 ? (totalTAT / tatCount).toFixed(2) : 0,
  trackStats,
  trackTATAverages,
  tatRemarksStats,
  stateStats,
  projectStats,
  woStatusStats,
  wiTatList: wiTatList.filter(w => w.track),
  manPowerList
};

fs.writeFileSync('analysis_report.json', JSON.stringify(summaryReport, null, 2));
console.log('Analysis report generated successfully.');
