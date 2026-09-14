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

function excelDateToJS(serial) {
  const num = parseFloat(serial);
  if (isNaN(num)) return serial;
  if (num < 1000) return serial;
  const utc_days  = Math.floor(num - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

const rows = parseSheet(path.join(__dirname, 'extracted_xlsx', 'xl', 'worksheets', 'sheet3.xml'));
const headers = rows[0] || [];

console.log('Headers:', headers);

const julyRows = [];
const JulyDatesMap = {};
let missingCompleteCount = 0;
let pendingYtsCount = 0;
let inTatCount = 0;
let outsideTatCount = 0;
let totalJulyLoaded = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r || r.length === 0) continue;

  const loadingRaw = r[7] || '';
  const completeRaw = r[9] || '';
  const permRaw = r[8] || '';

  const loadingDate = excelDateToJS(loadingRaw);
  const completeDate = excelDateToJS(completeRaw);
  const permDate = excelDateToJS(permRaw);

  const tatRemarks = r[13] || '';
  const pendingYts = r[14] || '';
  const remarks = r[15] || '';
  const woStatus = r[17] || '';

  // Check if loading or complete falls in July (07)
  const isJulyLoading = typeof loadingDate === 'string' && (loadingDate.includes('-07-') || loadingRaw.includes('Jul') || loadingRaw.includes('July'));
  const isJulyComplete = typeof completeDate === 'string' && (completeDate.includes('-07-') || completeRaw.includes('Jul') || completeRaw.includes('July'));

  if (isJulyLoading || isJulyComplete) {
    totalJulyLoaded++;

    if (isJulyComplete) {
      JulyDatesMap[completeDate] = (JulyDatesMap[completeDate] || 0) + 1;
    } else if (isJulyLoading) {
      JulyDatesMap[loadingDate] = (JulyDatesMap[loadingDate] || 0) + 1;
    }

    if (!completeRaw || completeRaw.trim() === '') {
      missingCompleteCount++;
    }

    if (pendingYts && pendingYts.trim() !== '') {
      pendingYtsCount++;
    }

    if (tatRemarks === 'In TAT') inTatCount++;
    if (tatRemarks === 'Outside TAT') outsideTatCount++;

    julyRows.push({
      rowNum: i + 1,
      region: r[0],
      state: r[1],
      project: r[2],
      track: r[3],
      siteId: r[5],
      siteName: r[6],
      loadingRaw,
      loadingDate,
      permRaw,
      permDate,
      completeRaw,
      completeDate,
      tat: r[10],
      aging: r[11],
      wiTat: r[12],
      tatRemarks,
      pendingYts,
      remarks,
      woStatus
    });
  }
}

console.log(`\nSummary of July Entries:`);
console.log(`Total July Records Identified: ${totalJulyLoaded}`);
console.log(`Completed (has Completion Date): ${totalJulyLoaded - missingCompleteCount}`);
console.log(`Missing Completion Date (In-progress/Pending): ${missingCompleteCount}`);
console.log(`Pending / YTS Flagged: ${pendingYtsCount}`);
console.log(`In TAT: ${inTatCount}`);
console.log(`Outside TAT: ${outsideTatCount}`);

console.log('\nDaily Breakdown of Activity Dates in July:');
console.log(JulyDatesMap);

console.log('\nSample July Rows:');
console.dir(julyRows.slice(0, 15), { depth: null });

fs.writeFileSync('july_detailed_analysis.json', JSON.stringify({
  totalJulyLoaded,
  completed: totalJulyLoaded - missingCompleteCount,
  missingCompleteCount,
  pendingYtsCount,
  inTatCount,
  outsideTatCount,
  dailyBreakdown: JulyDatesMap,
  rows: julyRows
}, null, 2));
