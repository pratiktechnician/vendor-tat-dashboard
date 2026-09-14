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

// Convert Excel Serial Date to JS Date string
function excelDateToJS(serial) {
  const num = parseFloat(serial);
  if (isNaN(num)) return serial;
  // Excel epoch starts at 1900-01-01 (with leap year bug, offset ~25569 for 1970)
  if (num < 1000) return serial; // probably raw day count or not excel date
  const utc_days  = Math.floor(num - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = num - Math.floor(num) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / 3600);
  const minutes = Math.floor(total_seconds / 60) % 60;

  return date_info.toISOString().split('T')[0];
}

const mainDataRows = parseSheet(path.join(__dirname, 'extracted_xlsx', 'xl', 'worksheets', 'sheet3.xml'));
const headers = mainDataRows[0] || [];

const records = [];
for (let i = 1; i < mainDataRows.length; i++) {
  const row = mainDataRows[i];
  if (!row || row.length === 0) continue;
  const obj = { _rowNum: i + 1 };
  for (let j = 0; j < headers.length; j++) {
    const key = headers[j] ? headers[j].trim() : `col_${j}`;
    obj[key] = row[j] !== undefined ? row[j] : '';
  }
  if (Object.values(obj).some(v => v !== '')) {
    records.push(obj);
  }
}

console.log(`Total Main Data records: ${records.length}`);

// Inspect all dates in records
const julyRecords = [];
const monthCounts = {};
const dateDetails = [];

records.forEach(r => {
  const loading = r['Loading date from wi team'];
  const complete = r['Complete date'];
  const perm = r['Permission Required Date'];

  const loadingStr = excelDateToJS(loading);
  const completeStr = excelDateToJS(complete);
  const permStr = excelDateToJS(perm);

  const datesFound = [loadingStr, completeStr, permStr].filter(d => typeof d === 'string' && d.match(/\d{4}-\d{2}-\d{2}/));
  
  let isJuly = false;
  datesFound.forEach(d => {
    const m = d.substring(0, 7); // YYYY-MM
    monthCounts[m] = (monthCounts[m] || 0) + 1;
    if (d.includes('-07-')) {
      isJuly = true;
    }
  });

  // Also check string formats like "Jul", "July", "07-", "/07/"
  const allText = `${loading} ${complete} ${perm} ${r['Remarks']} ${r['TAT Remarks']}`;
  if (isJuly || /jul|july|\/07\/|-07-/i.test(allText)) {
    julyRecords.push({
      row: r._rowNum,
      siteId: r['Site id'],
      siteName: r['Site Name'],
      track: r['Delivery Track'],
      state: r['State'],
      loadingDate: loadingStr,
      completeDate: completeStr,
      permDate: permStr,
      tat: r['TAT'],
      tatRemarks: r['TAT Remarks'],
      pendingYts: r['Pending/YTS'],
      remarks: r['Remarks'],
      woStatus: r['Work Order Status'],
      woRemarks: r['Work Order (WO) Remarks']
    });
  }
});

console.log('Month Distribution (YYYY-MM):', monthCounts);
console.log(`Total July-related records found: ${julyRecords.length}`);

// Detailed analysis on July records:
// 1. How many completed vs pending in July?
// 2. Are loading dates present vs complete dates missing?
// 3. Date breakdown within July (days of July)
const dayCountsInJuly = {};
let julyCompleted = 0;
let julyPending = 0;
let julyMissingCompleteDate = 0;

julyRecords.forEach(r => {
  if (r.completeDate && r.completeDate.includes('-07-')) {
    const day = r.completeDate;
    dayCountsInJuly[day] = (dayCountsInJuly[day] || 0) + 1;
    julyCompleted++;
  } else if (r.loadingDate && r.loadingDate.includes('-07-')) {
    const day = r.loadingDate;
    dayCountsInJuly[day] = (dayCountsInJuly[day] || 0) + 1;
    if (!r.completeDate || r.completeDate === '') {
      julyMissingCompleteDate++;
      julyPending++;
    } else {
      julyCompleted++;
    }
  } else {
    julyPending++;
  }
});

const report = {
  totalRecordsInSheet: records.length,
  monthDistribution: monthCounts,
  julySummary: {
    totalJulyRecords: julyRecords.length,
    julyCompleted,
    julyPending,
    julyMissingCompleteDate,
    dayCountsInJuly
  },
  julySample: julyRecords.slice(0, 30),
  allJulyRecords: julyRecords
};

fs.writeFileSync('july_analysis.json', JSON.stringify(report, null, 2));
console.log('July analysis written to july_analysis.json.');
