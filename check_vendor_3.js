const fs = require('fs');
const path = require('path');

function getSharedStrings(dir) {
  const stringsFile = path.join(dir, 'xl', 'sharedStrings.xml');
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

function colToIdx(col) {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function parseSheet(filePath, sharedStrings) {
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

const v3Strings = getSharedStrings(path.join(__dirname, 'extracted_v3'));
const v3Team = parseSheet(path.join(__dirname, 'extracted_v3', 'xl', 'worksheets', 'sheet2.xml'), v3Strings);
const v3Main = parseSheet(path.join(__dirname, 'extracted_v3', 'xl', 'worksheets', 'sheet1.xml'), v3Strings);

console.log('--- Team details content ---');
v3Team.forEach((r, idx) => console.log(idx + 1, r));

console.log('--- Checking for any vendor name mentions in sharedStrings ---');
// Let's search sharedStrings for common indicators like "Pvt", "Ltd", "Telecom", "Services", "Power", "Engineering", "Inc"
const keywords = ['pvt', 'ltd', 'telecom', 'services', 'power', 'corp', 'malfonic', 'saesha', 'pns'];
v3Strings.forEach((s, idx) => {
  const sLower = s.toLowerCase();
  if (keywords.some(k => sLower.includes(k))) {
    console.log(`String [${idx}]: "${s}"`);
  }
});
