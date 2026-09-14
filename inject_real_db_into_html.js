const fs = require('fs');

const scratchDb = JSON.parse(fs.readFileSync('scratch_db.json', 'utf8'));

let indexHtml = fs.readFileSync('index.html', 'utf8');

// Replace database object in index.html
const dbString = `const database = ${JSON.stringify(scratchDb)};\n    let currentVendor = 'all';`;

// Update vendor selector dropdown options
const dropdownOptions = `
      <select class="vendor-switcher-dropdown" id="vendor-selector" onchange="switchVendor(this.value)">
        <option value="all" selected>🏢 All Vendors Combined (1,230 Sites)</option>
        <option value="pns">📡 PNS Telecom (278 Sites)</option>
        <option value="saesha">⚡ Saesha Power (716 Sites)</option>
        <option value="ripl">🔧 RIPL (101 Sites)</option>
        <option value="malfonic">📶 Malfonic (135 Sites)</option>
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
console.log('Successfully injected real 1,230 database & All Vendors tab into index.html!');
