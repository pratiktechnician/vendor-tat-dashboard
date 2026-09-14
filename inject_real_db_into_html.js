const fs = require('fs');

const scratchDb = JSON.parse(fs.readFileSync('scratch_db.json', 'utf8'));

let indexHtml = fs.readFileSync('index.html', 'utf8');

// Replace database object in index.html
const dbString = `const database = ${JSON.stringify(scratchDb)};\n    let currentVendor = 'all';`;

const allCount = scratchDb.all ? scratchDb.all.totalRecords : 0;
const pnsCount = scratchDb.pns ? scratchDb.pns.totalRecords : 0;
const saeshaCount = scratchDb.saesha ? scratchDb.saesha.totalRecords : 0;
const riplCount = scratchDb.ripl ? scratchDb.ripl.totalRecords : 0;
const malfonicCount = scratchDb.malfonic ? scratchDb.malfonic.totalRecords : 0;

// Update vendor selector dropdown options
const dropdownOptions = `
      <select class="vendor-switcher-dropdown" id="vendor-selector" onchange="switchVendor(this.value)">
        <option value="all" selected>🏢 All Vendors Combined (${allCount.toLocaleString()} Sites)</option>
        <option value="pns">📡 PNS Telecom (${pnsCount.toLocaleString()} Sites)</option>
        <option value="saesha">⚡ Saesha Power (${saeshaCount.toLocaleString()} Sites)</option>
        <option value="ripl">🔧 RIPL (${riplCount.toLocaleString()} Sites)</option>
        <option value="malfonic">📶 Malfonic (${malfonicCount.toLocaleString()} Sites)</option>
      </select>
`;

indexHtml = indexHtml.replace(/<select class="vendor-switcher-dropdown"[\s\S]*?<\/select>/, dropdownOptions.trim());

// Replace database definition
indexHtml = indexHtml.replace(/const database = [\s\S]*?let currentVendor = '[^']+';/, dbString);

// Also replace switchVendor helper to handle button active state properly
const switchVendorCode = `
    function switchVendor(vendorKey) {
      currentVendor = vendorKey;
      document.querySelectorAll('.vendor-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('btn-' + vendorKey);
      if (activeBtn) activeBtn.classList.add('active');
      updateDashboard();
    }
`;

indexHtml = indexHtml.replace(/function switchVendor\(vendorKey\)[\s\S]*?updateDashboard\(\);\s*\}/, switchVendorCode.trim());

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log(`Successfully injected real ${allCount.toLocaleString()} database & All Vendors tab into index.html!`);
