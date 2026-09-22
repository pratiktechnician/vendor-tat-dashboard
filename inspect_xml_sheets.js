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

['extracted_new_xlsx', 'extracted_xlsx', 'extracted_v3', 'extracted_v4'].forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const ss = getSharedStrings(dir);
  const wsDir = path.join(dir, 'xl', 'worksheets');
  const files = fs.readdirSync(wsDir).filter(f => f.endsWith('.xml'));
  console.log('=== Directory:', dir);
  files.forEach(f => {
    const sheetPath = path.join(wsDir, f);
    const matrix = parseSheetXml(sheetPath, ss);
    console.log(`  File: ${f} -> Raw Row count: ${matrix.length}`);
    if (matrix.length > 0) {
      let headerRow = matrix.find(r => r && r.some(c => c && c.toString().trim()));
      console.log('    Header sample:', (headerRow || []).slice(0, 10).filter(Boolean));
      let nonCount = 0;
      matrix.forEach(r => {
        if (r && r.some(c => c && c.toString().trim())) nonCount++;
      });
      console.log(`    Non-empty rows count: ${nonCount}`);
    }
  });
});
