const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Update processVendorLive rawRecords mapping to include rawStatus, rawWoStatus & completedDate
const oldRawRecordsMap = `rawRecords: vendorRecords.map(r => ({
          siteId: r.siteId,
          siteName: r.siteName,
          proj: r.project,
          act: r.activity,
          tat: r.tat !== null ? r.tat : 'N/A',
          tcl: r.tclTat !== null ? r.tclTat : 5,
          status: r.tat !== null && r.tat <= (r.tclTat || 5) ? 'In TAT' : 'Outside TAT',
          remarks: r.remarks || 'Standard Operation',
          assignedDate: r.assignedDate,
          vendor: r.vendor,
          state: r.state
        }))`;

const newRawRecordsMap = `rawRecords: vendorRecords.map(r => ({
          siteId: r.siteId,
          siteName: r.siteName,
          proj: r.project,
          act: r.activity,
          tat: r.tat !== null ? r.tat : 'N/A',
          tcl: r.tclTat !== null ? r.tclTat : 5,
          status: r.tat !== null && r.tat <= (r.tclTat || 5) ? 'In TAT' : 'Outside TAT',
          rawStatus: r.status || '',
          rawWoStatus: r.rawWoStatus || '',
          remarks: r.remarks || 'Standard Operation',
          assignedDate: r.assignedDate,
          completedDate: r.completedDate || '',
          vendor: r.vendor,
          state: r.state
        }))`;

if (html.includes(oldRawRecordsMap)) {
  html = html.replace(oldRawRecordsMap, newRawRecordsMap);
}

// 2. Update the WO Section Header HTML to include the stylish Vendor Dropdown
const oldHeaderHtml = `<div class="wo-section-header">
          <div class="wo-section-title">📋 Work Order (WO) Pending Status — All Vendors</div>
        </div>`;

const newHeaderHtml = `<div class="wo-section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:16px;">
          <div class="wo-section-title" id="wo-section-main-title">📋 Work Order (WO) Status — Released vs Not Released (Vendor Wise)</div>
          
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:0.8rem; color:#94a3b8; font-weight:600;">Filter Vendor:</label>
            <select id="wo-header-vendor-dropdown" onchange="filterWoByVendorHeader(this.value)" style="background:#1e293b; border:1px solid #6366f1; color:#f8fafc; padding:8px 14px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; outline:none; box-shadow:0 4px 12px rgba(99,102,241,0.2);">
              <option value="all" selected>🏢 All Vendors Combined (1,305 Orders)</option>
              <option value="PNS Telecom">📡 PNS Telecom (283 Orders)</option>
              <option value="Saesha Power">⚡ Saesha Power (737 Orders)</option>
              <option value="RIPL">🔧 RIPL (149 Orders)</option>
              <option value="Malfonic">📶 Malfonic (136 Orders)</option>
            </select>
          </div>
        </div>`;

if (html.includes(oldHeaderHtml)) {
  html = html.replace(oldHeaderHtml, newHeaderHtml);
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with WO section Vendor Dropdown!');
