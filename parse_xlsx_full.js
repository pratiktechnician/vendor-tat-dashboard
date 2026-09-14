const fs = require('fs');
const path = require('path');

// 1. Read sharedStrings.xml
const stringsFile = path.join(__dirname, 'extracted_xlsx', 'xl', 'sharedStrings.xml');
const sharedStrings = [];

if (fs.existsSync(stringsFile)) {
  const xml = fs.readFileSync(stringsFile, 'utf8');
  // <si><t ...>string</t></si> or <si><t>string</t></si>
  // Note: strings can be divided in <t> tags or formatted with <r><t>
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
    // decode basic html entities
    str = str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    sharedStrings.push(str);
  }
}

console.log(`Loaded ${sharedStrings.length} shared strings.`);

// Function to convert column letter to index (A -> 0, B -> 1, AA -> 26)
function colToIdx(col) {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

// Function to parse a sheet xml
function parseSheet(filePath, sheetName) {
  console.log(`\nParsing sheet ${sheetName} (${filePath})...`);
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

  // Filter out empty trailing elements in rows
  const cleanRows = rows.map(r => {
    if (!r) return [];
    // sanitize undefineds
    const rowArr = [];
    for (let i = 0; i < r.length; i++) {
      rowArr[i] = r[i] !== undefined ? r[i] : '';
    }
    return rowArr;
  });

  return cleanRows;
}

const sheetsInfo = [
  { name: 'Summary', file: 'sheet1.xml' },
  { name: 'TAT Summary', file: 'sheet2.xml' },
  { name: 'Main Data', file: 'sheet3.xml' },
  { name: 'WI TAT', file: 'sheet4.xml' },
  { name: 'Man Power', file: 'sheet5.xml' }
];

const results = {};

for (const s of sheetsInfo) {
  const fPath = path.join(__dirname, 'extracted_xlsx', 'xl', 'worksheets', s.file);
  if (fs.existsSync(fPath)) {
    const rows = parseSheet(fPath, s.name);
    console.log(`Sheet "${s.name}" parsed: ${rows.length} total rows.`);
    results[s.name] = rows;
    
    // Save first 50 rows as preview CSV
    const csvLines = rows.slice(0, 100).map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
    fs.writeFileSync(`parsed_${s.name.trim().replace(/\s+/g, '_')}_preview.csv`, csvLines.join('\n'));
  }
}

// Dump sheet overview details
fs.writeFileSync('parsed_summary_meta.json', JSON.stringify({
  sheets: Object.keys(results).map(name => ({
    name,
    totalRows: results[name].length,
    numCols: results[name].reduce((max, r) => Math.max(max, r ? r.length : 0), 0),
    sampleHeaders: results[name][0] || results[name][1] || []
  }))
}, null, 2));

console.log('\nAll sheets parsed and previews saved.');
