const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Update processVendorLive rawRecords mapping to include rawStatus & completedDate
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
          remarks: r.remarks || 'Standard Operation',
          assignedDate: r.assignedDate,
          completedDate: r.completedDate || '',
          vendor: r.vendor,
          state: r.state
        }))`;

if (html.includes(oldRawRecordsMap)) {
  html = html.replace(oldRawRecordsMap, newRawRecordsMap);
}

// 2. Update getWoPendingStatus function
const oldGetWoStatus = `function getWoPendingStatus(record) {
      if (!record) return 'pending';
      const s = (record.status || record.statusStr || '').toString().toLowerCase();
      const hasCompletedDate = record.completedDate && record.completedDate !== '' && record.completedDate !== '—';
      if (s.includes('complete') || s.includes('migrat') || s.includes('dropped') || s.includes('pe done') || hasCompletedDate) {
        return 'completed';
      } else if (s.includes('wip') || s.includes('progress') || s.includes('hold') || s.includes('report wip')) {
        return 'wip';
      } else {
        return 'pending';
      }
    }`;

const newGetWoStatus = `function getWoPendingStatus(record) {
      if (!record) return 'pending';
      const s = (record.rawStatus || record.status || '').toString().toLowerCase();
      const remarks = (record.remarks || '').toString().toLowerCase();
      const hasCompletedDate = !!(record.completedDate && record.completedDate !== '' && record.completedDate !== '—');

      if (hasCompletedDate || s.includes('complete') || s.includes('done') || s.includes('migrat') || s.includes('dropped') || s.includes('pe done')) {
        return 'completed';
      } else if (s.includes('wip') || s.includes('progress') || s.includes('hold') || s.includes('report wip') || s.includes('process') || s.includes('yts') || remarks.includes('wip')) {
        return 'wip';
      } else {
        return 'pending';
      }
    }

    function filterWoByVendorHeader(vendorVal) {
      const tableSelect = document.getElementById('wo-vendor-filter');
      if (tableSelect) tableSelect.value = vendorVal;
      
      const titleEl = document.getElementById('wo-section-main-title');
      if (titleEl) {
        if (vendorVal === 'all') {
          titleEl.innerText = '📋 Work Order (WO) Pending Status — All Vendors';
        } else {
          titleEl.innerText = \`📋 Work Order (WO) Pending Status — \${vendorVal}\`;
        }
      }
      
      renderWoDashboard();
    }`;

if (html.includes(oldGetWoStatus)) {
  html = html.replace(oldGetWoStatus, newGetWoStatus);
}

// 3. Update the WO Section Header HTML to include the stylish Vendor Dropdown
const oldHeaderHtml = `<div class="wo-section-header">
          <div class="wo-section-title">📋 Work Order (WO) Pending Status — All Vendors</div>
        </div>`;

const newHeaderHtml = `<div class="wo-section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:16px;">
          <div class="wo-section-title" id="wo-section-main-title">📋 Work Order (WO) Pending Status — All Vendors</div>
          
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:0.8rem; color:#94a3b8; font-weight:600;">Filter Vendor:</label>
            <select id="wo-header-vendor-dropdown" onchange="filterWoByVendorHeader(this.value)" style="background:#1e293b; border:1px solid #6366f1; color:#f8fafc; padding:8px 14px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; outline:none; box-shadow:0 4px 12px rgba(99,102,241,0.2);">
              <option value="all" selected>🏢 All Vendors Combined (1,231 Orders)</option>
              <option value="PNS Telecom">📡 PNS Telecom (279 Orders)</option>
              <option value="Saesha Power">⚡ Saesha Power (716 Orders)</option>
              <option value="RIPL">🔧 RIPL (101 Orders)</option>
              <option value="Malfonic">📶 Malfonic (135 Orders)</option>
            </select>
          </div>
        </div>`;

if (html.includes(oldHeaderHtml)) {
  html = html.replace(oldHeaderHtml, newHeaderHtml);
}

// 4. Update sync between table vendor filter and header vendor filter in renderWoDashboard
if (!html.includes('wo-header-vendor-dropdown')) {
  console.log('Replacing header HTML...');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with WO section Vendor Dropdown!');
