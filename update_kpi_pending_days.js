const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const newKpiBannerHtml = `
      <!-- AUDIT SUMMARY KPI BANNER (WITH PROMINENT PENDING DAYS KPI) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); padding: 14px 18px; border-radius: 12px;">
          <div style="font-size: 0.72rem; color: #10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Active Updaters (0 Days Pending)</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #34d399; margin-top: 4px;">0 Days Pending</div>
          <div style="font-size: 0.75rem; color: #a7f3d0; margin-top: 2px;">🟢 3 Vendors (PNS, Saesha, Malfonic) Up-to-Date</div>
        </div>

        <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); padding: 14px 18px; border-radius: 12px;">
          <div style="font-size: 0.72rem; color: #f43f5e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Portal Pending Inactivity (Missed Days)</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #f43f5e; margin-top: 4px;">3 Days Pending</div>
          <div style="font-size: 0.75rem; color: #fca5a5; margin-top: 2px;">🔴 1 Vendor (RIPL Portal • 11 FEs Pending Uploads)</div>
        </div>

        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); padding: 14px 18px; border-radius: 12px;">
          <div style="font-size: 0.72rem; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Field Staff Inactivity Split</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #fff; margin-top: 4px;">11 FEs Pending</div>
          <div style="font-size: 0.75rem; color: #c7d2fe; margin-top: 2px;">⚡ 28 FEs Active (0d) vs 11 FEs Slacking (3d+)</div>
        </div>

        <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); padding: 14px 18px; border-radius: 12px;">
          <div style="font-size: 0.72rem; color: #22d3ee; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Overall Sheet Maintenance Score</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #38bdf8; margin-top: 4px;">90.7% Compliance</div>
          <div style="font-size: 0.75rem; color: #a5f3fc; margin-top: 2px;">✓ 3 of 4 Google Sheets Fully Up-to-date</div>
        </div>
      </div>
`;

if (html.includes('<!-- AUDIT SUMMARY KPI BANNER (WITH MISSED DAYS FOCUS) -->')) {
  html = html.replace(/<!-- AUDIT SUMMARY KPI BANNER \(WITH MISSED DAYS FOCUS\) -->[\s\S]*?<\/div>\s*<\/div>/, newKpiBannerHtml.trim());
} else if (html.includes('Active Updaters (0 Days Missed)')) {
  html = html.replace(/<div style="display: grid; grid-template-columns: repeat\(auto-fit, minmax\(220px, 1fr\)\);[\s\S]*?<\/div>\s*<\/div>/, newKpiBannerHtml.trim());
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated KPI banner with prominent 3 Days Pending headline!');
