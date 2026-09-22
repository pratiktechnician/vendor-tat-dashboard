const fs = require('fs');
const path = require('path');

console.log('Inspecting all spreadsheet data sources in directory...');

const files = fs.readdirSync('.').filter(f => f.endsWith('.xlsx') || f.endsWith('.json') || f.endsWith('.csv'));
console.log('Found data files:', files);

// Check data.json
if (fs.existsSync('data.json')) {
  const dj = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  console.log(`\ndata.json contains ${dj.rawRecords ? dj.rawRecords.length : 0} total records.`);
}

// Check extracted folders
['extracted_new_xlsx', 'extracted_xlsx', 'extracted_v3', 'extracted_v4'].forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`\nInspecting extracted directory: ${dir}`);
    const sheetFiles = fs.readdirSync(path.join(dir, 'xl', 'worksheets')).filter(f => f.endsWith('.xml'));
    sheetFiles.forEach(sf => {
      const xml = fs.readFileSync(path.join(dir, 'xl', 'worksheets', sf), 'utf8');
      const rowMatches = xml.match(/<row r="\d+"/g);
      console.log(`- ${sf}: ~${rowMatches ? rowMatches.length : 0} rows`);
    });
  }
});
