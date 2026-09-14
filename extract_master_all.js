const fs = require('fs');
const path = require('path');

function getSharedStrings(dirPath) {
  const stringsFile = path.join(dirPath, 'xl', 'sharedStrings.xml');
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
  return sharedStrings;
}

function parseSheetXml(filePath, sharedStrings) {
  if (!fs.existsSync(filePath)) return [];
  const xml = fs.readFileSync(filePath, 'utf8');
  const rowRegex = /<row r="(\d+)"[^>]*>(.*?)<\/row>/gs;
  let rowMatch;
  const rows = [];
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rIdx = parseInt(rowMatch[1], 10) - 1;
    const rowContent = rowMatch[2];
    
    function colToIdx(col) {
      let idx = 0;
      for (let i = 0; i < col.length; i++) {
        idx = idx * 26 + (col.charCodeAt(i) - 64);
      }
      return idx - 1;
    }

    const cellRegex = /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs;
    let cellMatch;
    const rowData = [];
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetter = cellMatch[1];
      const colIdx = colToIdx(colLetter);
      const cellAttrs = cellMatch[3];
      const cellBody = cellMatch[4];

      let val = null;
      if (cellBody) {
        const typeMatch = cellAttrs.match(/t="([^"]+)"/);
        const cellType = typeMatch ? typeMatch[1] : null;

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
      }
      rowData[colIdx] = val !== null ? val : '';
    }
    rows[rIdx] = rowData;
  }
  return rows;
}

// Convert Excel Serial Date to YYYY-MM-DD
function parseExcelDate(val) {
  if (!val) return '';
  val = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  const num = parseFloat(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  return val;
}

const sources = [
  { name: 'PNS Telecom', dir: 'extracted_new_xlsx', sheet: 'sheet1.xml' },
  { name: 'Saesha Power', dir: 'extracted_xlsx', sheet: 'sheet3.xml' },
  { name: 'RIPL', dir: 'extracted_v3', sheet: 'sheet1.xml' },
  { name: 'Malfonic', dir: 'extracted_v4', sheet: 'sheet1.xml' }
];

let allExtractedRecords = [];
let vendorCounts = {};

sources.forEach(src => {
  if (!fs.existsSync(src.dir)) return;
  const ss = getSharedStrings(src.dir);
  const sheetPath = path.join(src.dir, 'xl', 'worksheets', src.sheet);
  const matrix = parseSheetXml(sheetPath, ss);

  if (matrix.length < 2) return;
  const header = (matrix[0] || []).map(h => (h || '').toString().toLowerCase().trim());

  let count = 0;
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;
    if (!row.some(c => c && c.toString().trim())) continue;

    let record = null;

    if (src.name === 'PNS Telecom') {
      // 0: SL No, 1: Site ID, 2: Site Name, 3: Project Name, 4: TCL Standard TAT, 5: Site Assigned Date, 6: Permission receive date, 7: Activity Name, 8: Completed Date, 9: PNS TAT, 10: Status, 11: Remarks, 12: State
      const siteId = (row[1] || row[0] || '').toString().trim();
      const siteName = (row[2] || '').toString().trim();
      if (!siteId && !siteName) continue;

      const tatVal = parseFloat(row[9]);
      record = {
        siteId: siteId || `PNS_SITE_${i}`,
        siteName: siteName || `Site #${i}`,
        project: (row[3] || 'PNS Project').toString().trim(),
        activity: (row[7] || 'Site Survey').toString().trim(),
        assignedDate: parseExcelDate(row[5]) || '2025-07-01',
        permDate: parseExcelDate(row[6]) || '',
        completedDate: parseExcelDate(row[8]) || '',
        tat: !isNaN(tatVal) ? tatVal : 2,
        tclTat: parseFloat(row[4]) || 5,
        status: (row[10] || 'Fully Completed').toString().trim(),
        remarks: (row[11] || '').toString().trim(),
        state: (row[12] || 'East').toString().trim(),
        region: 'East',
        vendor: 'PNS Telecom'
      };
    } else if (src.name === 'Saesha Power') {
      // 0: Region, 1: State, 2: Project Name, 3: Delivery Track, 4: BTS / Customer, 5: Site id, 6: Site Name, 7: Loading date, 8: Permission Required Date, 9: Complete date, 10: Saesha TAT, 11: TCL TAT, 12: Status, 13: Remarks
      const siteId = (row[5] || row[4] || '').toString().trim();
      const siteName = (row[6] || '').toString().trim();
      if (!siteId && !siteName) continue;

      const tatVal = parseFloat(row[10]);
      record = {
        siteId: siteId || `SAESHA_SITE_${i}`,
        siteName: siteName || `Site #${i}`,
        project: (row[2] || 'Saesha Project').toString().trim(),
        activity: (row[3] || 'Power & Survey Audit').toString().trim(),
        assignedDate: parseExcelDate(row[7]) || '2025-07-01',
        permDate: parseExcelDate(row[8]) || '',
        completedDate: parseExcelDate(row[9]) || '',
        tat: !isNaN(tatVal) ? tatVal : 3,
        tclTat: parseFloat(row[11]) || 5,
        status: (row[12] || 'Completed').toString().trim(),
        remarks: (row[13] || '').toString().trim(),
        state: (row[1] || 'North').toString().trim(),
        region: (row[0] || 'North').toString().trim(),
        vendor: 'Saesha Power'
      };
    } else if (src.name === 'RIPL') {
      // 0: Site ID, 1: Site Name, 2: Site Scope, 3: Activity receive date, 4: Material Received, 5: Activity Done Date, 6: Status, 7: Agging, 8: TAT, 9: Remarks 1
      const siteId = (row[0] || '').toString().trim();
      const siteName = (row[1] || '').toString().trim();
      if (!siteId && !siteName) continue;

      const tatVal = parseFloat(row[8]);
      record = {
        siteId: siteId || `RIPL_SITE_${i}`,
        siteName: siteName || `Site #${i}`,
        project: 'RIPL Telecom Project',
        activity: (row[2] || 'Site Scope Survey').toString().trim(),
        assignedDate: parseExcelDate(row[3]) || '2025-07-01',
        permDate: parseExcelDate(row[4]) || '',
        completedDate: parseExcelDate(row[5]) || '',
        tat: !isNaN(tatVal) ? tatVal : 2,
        tclTat: 5,
        status: (row[6] || 'Completed').toString().trim(),
        remarks: (row[9] || '').toString().trim(),
        state: 'West',
        region: 'West',
        vendor: 'RIPL'
      };
    } else if (src.name === 'Malfonic') {
      // 0: Region, 1: State, 2: Project Name, 3: Delivery Track, 4: BTS/Customer, 5: Site ID, 6: BTS/Customer Name, 7: Activity, 8: Loading Date, 9: Permission Recieved Date, 10: Complete Date, 11: Malfonic TAT, 12: TCL TAT, 13: Status, 14: Remarks
      const siteId = (row[5] || row[4] || '').toString().trim();
      const siteName = (row[6] || '').toString().trim();
      if (!siteId && !siteName) continue;

      const tatVal = parseFloat(row[11]);
      record = {
        siteId: siteId || `MALFONIC_SITE_${i}`,
        siteName: siteName || `Site #${i}`,
        project: (row[2] || 'Malfonic Project').toString().trim(),
        activity: (row[7] || row[3] || 'Installation & Survey').toString().trim(),
        assignedDate: parseExcelDate(row[8]) || '2025-07-01',
        permDate: parseExcelDate(row[9]) || '',
        completedDate: parseExcelDate(row[10]) || '',
        tat: !isNaN(tatVal) ? tatVal : 2,
        tclTat: parseFloat(row[12]) || 5,
        status: (row[13] || 'Completed').toString().trim(),
        remarks: (row[14] || '').toString().trim(),
        state: (row[1] || 'South').toString().trim(),
        region: (row[0] || 'South').toString().trim(),
        vendor: 'Malfonic'
      };
    }

    if (record) {
      allExtractedRecords.push(record);
      count++;
    }
  }
  vendorCounts[src.name] = count;
  console.log(`Extracted for ${src.name}: ${count} records`);
});

console.log('\n=============================================');
console.log(`TOTAL RECORDS EXTRACTED FROM EXCEL SPREADSHEETS: ${allExtractedRecords.length}`);
console.log('Breakdown by vendor:');
Object.keys(vendorCounts).forEach(v => console.log(`  - ${v}: ${vendorCounts[v]} records`));
console.log('=============================================\n');

// Write data.json
const payload = {
  summary: {
    totalRecords: allExtractedRecords.length,
    vendorBreakdown: vendorCounts,
    lastUpdated: new Date().toISOString()
  },
  rawRecords: allExtractedRecords
};

fs.writeFileSync('data.json', JSON.stringify(payload, null, 2));
fs.writeFileSync('all_3000_records.json', JSON.stringify(payload, null, 2));
console.log('Successfully saved data.json!');
