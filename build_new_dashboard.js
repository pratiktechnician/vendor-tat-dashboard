const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');

// 1. Extract HTML before <script> tag
const scriptStart = indexHtml.indexOf('<script>');
const scriptEnd = indexHtml.lastIndexOf('</script>');

if (scriptStart === -1 || scriptEnd === -1) {
  console.error('Could not find script tags in index.html');
  process.exit(1);
}

let headAndBodyHtml = indexHtml.substring(0, scriptStart);
let afterScriptHtml = indexHtml.substring(scriptEnd + '</script>'.length);

// In headAndBodyHtml, add the Connect Data Source button in the header
const headerBadgeSearch = /<div style="display:flex; align-items:center; gap:8px;">[\s\S]*?<\/div>\s*<\/div>/;
const connectButtonHtml = `
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <div id="live-indicator" class="live-status-badge" style="cursor:default;"><span class="pulse-dot green"></span> Live Sync: Ready</div>
        <button onclick="syncLiveGoogleSheetsInBrowser(true)" title="Force refresh from connected Google Sheets" style="background:#1e293b; border:1px solid #475569; color:#e2e8f0; padding:6px 12px; border-radius:8px; font-size:0.75rem; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:4px;">
          🔄 Sync Now
        </button>
        <button onclick="openConnectModal()" title="Connect your own Google Sheet or CSV data" style="background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border:none; color:#fff; padding:6px 14px; border-radius:8px; font-size:0.75rem; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:6px; box-shadow:0 2px 8px rgba(99,102,241,0.35);">
          ⚙️ Connect Data Source
        </button>
      </div>
    </div>`;

if (headerBadgeSearch.test(headAndBodyHtml)) {
  headAndBodyHtml = headAndBodyHtml.replace(headerBadgeSearch, connectButtonHtml);
}

// Add the Connect Data Source Modal HTML
const modalHtml = `
  <!-- CONNECT DATA SOURCE MODAL -->
  <div id="connect-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:9999; backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:16px;">
    <div style="background:#0f131c; border:1px solid rgba(99,102,241,0.3); border-radius:16px; max-width:620px; width:100%; padding:24px; box-shadow:0 20px 40px rgba(0,0,0,0.8); color:#f8fafc; font-family:var(--font-body);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:12px;">
        <div>
          <h3 style="font-family:var(--font-heading); font-size:1.25rem; font-weight:700; color:#fff; margin:0;">🔌 Connect Your Google Sheet / Data Source</h3>
          <p style="font-size:0.78rem; color:#94a3b8; margin-top:4px;">Paste your Google Sheet link or spreadsheet ID below. Make sure sharing is set to 'Anyone with the link can view'.</p>
        </div>
        <button onclick="closeConnectModal()" style="background:none; border:none; color:#94a3b8; font-size:1.4rem; cursor:pointer; line-height:1;">&times;</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px; max-height:60vh; overflow-y:auto; padding-right:4px;">
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Vendor Name</label>
          <input type="text" id="modal-vendor-name" placeholder="e.g. Primary Vendor" style="width:100%; background:#161c28; border:1px solid #30363d; color:#fff; padding:8px 12px; border-radius:8px; font-size:0.82rem; outline:none;">
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Google Sheet URL or Spreadsheet ID</label>
          <input type="text" id="modal-sheet-url" placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0" style="width:100%; background:#161c28; border:1px solid #30363d; color:#fff; padding:8px 12px; border-radius:8px; font-size:0.82rem; outline:none;">
          <span style="font-size:0.7rem; color:#64748b; margin-top:4px; display:block;">Paste full Google Sheet URL or just the ID. GID will be automatically detected.</span>
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Sheet Tab GID (Optional if URL contains #gid=...)</label>
          <input type="text" id="modal-sheet-gid" placeholder="0" style="width:100%; background:#161c28; border:1px solid #30363d; color:#fff; padding:8px 12px; border-radius:8px; font-size:0.82rem; outline:none;">
        </div>

        <div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:12px;">
          <label style="display:block; font-size:0.75rem; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Or Upload a Local CSV File</label>
          <input type="file" id="modal-csv-upload" accept=".csv" onchange="handleModalCsvUpload(event)" style="font-size:0.75rem; color:#94a3b8;">
        </div>

        <div id="modal-connect-status" style="display:none; padding:8px 12px; border-radius:8px; font-size:0.75rem; font-weight:600;"></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; border-top:1px solid rgba(255,255,255,0.08); padding-top:16px;">
        <button onclick="resetToDemoData()" style="background:#1e293b; border:1px solid #334155; color:#94a3b8; padding:8px 14px; border-radius:8px; font-size:0.75rem; cursor:pointer; font-weight:600;">↺ Reset to Demo Data</button>
        <div style="display:flex; gap:10px;">
          <button onclick="closeConnectModal()" style="background:transparent; border:1px solid #30363d; color:#cbd5e1; padding:8px 16px; border-radius:8px; font-size:0.75rem; cursor:pointer; font-weight:600;">Cancel</button>
          <button onclick="saveAndConnectFromModal()" style="background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border:none; color:#fff; padding:8px 18px; border-radius:8px; font-size:0.75rem; cursor:pointer; font-weight:600; box-shadow:0 2px 8px rgba(99,102,241,0.4);">Save & Connect Now</button>
        </div>
      </div>
    </div>
  </div>`;

headAndBodyHtml = headAndBodyHtml.replace('<div class="container">', modalHtml + '\n  <div class="container">');

// Load starter sample data
const dataJson = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const sampleRecords = (dataJson.rawRecords || []).slice(0, 100);

const clientScript = `
  <script>
    /* =========================================================================
       🔌 EASY DATA CONNECTION CONFIGURATION
       =========================================================================
       You can connect your Google Sheet in TWO easy ways:
       1. Enter your Google Sheet ID and GID below in DEFAULT_SOURCES
       2. OR simply click the "⚙️ Connect Data Source" button in the dashboard UI!
       
       Make sure your Google Sheet sharing is set to:
       "Anyone with the link can view"
       ========================================================================= */
    const DEFAULT_SOURCES = [
      {
        name: 'Primary Vendor Sheet',
        id: '1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8', // Replace with your Spreadsheet ID
        gid: '802337370'                                      // Replace with your Sheet tab GID
      }
    ];

    const AUTO_SYNC_INTERVAL_MS = 120000;

    let currentRawRecords = ` + JSON.stringify(sampleRecords) + `;
    let database = {};
    let currentVendor = 'all';
    let filteredTableData = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    let woFilteredTableData = [];
    let woCurrentPage = 1;
    const woItemsPerPage = 15;

    let chartActivities = null;
    let chartSla = null;
    let chartJuly = null;
    let chartStates = null;
    let chartWoStatus = null;
    let woChartType = 'bar';
    let isSyncing = false;

    function getCurrentSystemDate() {
      return new Date();
    }

    function getWoPendingStatus(record) {
      if (!record) return 'not_released';
      const woLower = (record.rawWoStatus || '').toString().toLowerCase().trim();
      const rawLower = (record.rawStatus || record.status || '').toString().toLowerCase().trim();
      const hasCompDate = !!(record.completedDate && record.completedDate !== '' && record.completedDate !== '—');

      if (woLower === 'not release' || woLower === 'not released' || woLower === 'pending' || woLower === 'not received') {
        return 'not_released';
      }
      if (woLower === 'release' || woLower === 'released' || woLower === 'not required' || woLower === 'dropped' || woLower === 'received') {
        return 'released';
      }
      if (hasCompDate || rawLower.includes('complete') || rawLower.includes('done') || rawLower.includes('migrat') || rawLower.includes('pe done')) {
        return 'released';
      }
      return 'not_released';
    }

    function computeVendorStats(vendorKey, vendorName, vendorRecords) {
      const totalRecords = vendorRecords.length;
      let completed = 0;
      let pending = 0;
      let inTatCount = 0;
      let outsideTatCount = 0;
      let totalTatDays = 0;
      let tatCount = 0;

      const stateDist = {};
      const actMap = {};

      vendorRecords.forEach(r => {
        const st = getWoPendingStatus(r);
        if (st === 'released') completed++;
        else pending++;

        const tat = parseFloat(r.tat) || 2;
        const tcl = parseFloat(r.tcl || r.tclTat) || 5;
        if (tat <= tcl) inTatCount++;
        else outsideTatCount++;

        totalTatDays += tat;
        tatCount++;

        const stName = r.state || 'East';
        stateDist[stName] = (stateDist[stName] || 0) + 1;

        const actName = r.activity || r.act || 'Survey & Installation';
        actMap[actName] = (actMap[actName] || 0) + 1;
      });

      const slaMet = totalRecords > 0 ? ((inTatCount / totalRecords) * 100).toFixed(1) : '100.0';
      const avgTat = tatCount > 0 ? (totalTatDays / tatCount).toFixed(1) : '2.1';

      return {
        vendorKey,
        vendorName,
        totalRecords,
        completed,
        pending,
        slaMet,
        avgTat,
        inTatCount,
        outsideTatCount,
        states: stateDist,
        activities: actMap,
        rawRecords: vendorRecords
      };
    }

    function recomputeFullDatabase(records) {
      const db = {
        all: computeVendorStats('all', 'All Vendors Combined', records)
      };

      const vendorNames = Array.from(new Set(records.map(r => r.vendor || 'Primary Vendor').filter(Boolean)));
      vendorNames.forEach(v => {
        const vRecs = records.filter(r => (r.vendor || '').toLowerCase() === v.toLowerCase());
        db[v] = computeVendorStats(v, v, vRecs);
      });

      const selector = document.getElementById('vendor-selector');
      if (selector) {
        selector.innerHTML = '<option value="all" selected>🏢 All Vendors (' + records.length.toLocaleString() + ' Sites)</option>' +
          vendorNames.map(v => '<option value="' + v + '">' + v + ' (' + (db[v] ? db[v].totalRecords.toLocaleString() : 0) + ' Sites)</option>').join('');
      }

      const woVendorFilter = document.getElementById('wo-vendor-filter');
      if (woVendorFilter) {
        woVendorFilter.innerHTML = '<option value="all">🏢 All Vendors</option>' +
          vendorNames.map(v => '<option value="' + v + '">' + v + '</option>').join('');
      }

      return db;
    }

    function switchVendor(vendorKey) {
      currentVendor = vendorKey;
      const selector = document.getElementById('vendor-selector');
      if (selector && selector.value !== vendorKey) {
        selector.value = vendorKey;
      }
      updateDashboard();
      if (typeof renderWoDashboard === 'function') renderWoDashboard();
    }

    function initCharts() {
      const ctxAct = document.getElementById('chart-activities')?.getContext('2d');
      if (ctxAct) {
        chartActivities = new Chart(ctxAct, {
          type: 'bar',
          data: { labels: [], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: {
              x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        });
      }

      const ctxSla = document.getElementById('chart-sla')?.getContext('2d');
      if (ctxSla) {
        chartSla = new Chart(ctxSla, {
          type: 'doughnut',
          data: { labels: ['In TAT', 'Outside TAT'], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
          }
        });
      }

      const ctxStates = document.getElementById('chart-states')?.getContext('2d');
      if (ctxStates) {
        chartStates = new Chart(ctxStates, {
          type: 'doughnut',
          data: { labels: [], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
          }
        });
      }
    }

    function updateDashboard() {
      const data = database[currentVendor] || database.all;
      if (!data) return;

      if (document.getElementById('stat-total-sites')) document.getElementById('stat-total-sites').innerText = data.totalRecords.toLocaleString();
      if (document.getElementById('stat-sla')) document.getElementById('stat-sla').innerText = data.slaMet + '%';
      if (document.getElementById('stat-avg-tat')) document.getElementById('stat-avg-tat').innerText = data.avgTat + 'd';
      if (document.getElementById('stat-wo-ratio')) {
        document.getElementById('stat-wo-ratio').innerText = data.completed + ' / ' + data.pending;
      }

      if (chartActivities && data.activities) {
        chartActivities.data.labels = Object.keys(data.activities);
        chartActivities.data.datasets = [{
          label: 'Total Sites',
          data: Object.values(data.activities),
          backgroundColor: '#6366f1',
          borderRadius: 6
        }];
        chartActivities.update();
      }

      if (chartSla) {
        chartSla.data.datasets = [{
          data: [data.inTatCount, data.outsideTatCount],
          backgroundColor: ['#10b981', '#f43f5e'],
          borderWidth: 0
        }];
        chartSla.update();
      }

      if (chartStates && data.states) {
        chartStates.data.labels = Object.keys(data.states);
        chartStates.data.datasets = [{
          data: Object.values(data.states),
          backgroundColor: ['#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
          borderWidth: 0
        }];
        chartStates.update();
      }

      renderTable();
    }

    function renderTable() {
      const data = database[currentVendor] || database.all;
      if (!data || !data.rawRecords) return;

      const records = data.rawRecords;
      const searchVal = document.getElementById('search-input')?.value?.toLowerCase() || '';

      filteredTableData = records.filter(r => {
        if (!searchVal) return true;
        return (r.siteId || '').toLowerCase().includes(searchVal) ||
               (r.siteName || '').toLowerCase().includes(searchVal) ||
               (r.vendor || '').toLowerCase().includes(searchVal) ||
               (r.act || r.activity || '').toLowerCase().includes(searchVal);
      });

      const totalPages = Math.ceil(filteredTableData.length / itemsPerPage) || 1;
      if (currentPage > totalPages) currentPage = 1;

      const start = (currentPage - 1) * itemsPerPage;
      const paged = filteredTableData.slice(start, start + itemsPerPage);

      const tbody = document.getElementById('table-body');
      if (tbody) {
        tbody.innerHTML = paged.map(r => {
          const st = getWoPendingStatus(r);
          const woBadge = st === 'released'
            ? '<span class="status-badge status-live" style="font-size:0.7rem; padding:2px 8px;">🟢 Released</span>'
            : '<span class="status-badge status-delayed" style="font-size:0.7rem; padding:2px 8px;">🔴 Pending</span>';

          return '<tr>' +
            '<td style="font-weight:600; color:#fff;">' + (r.siteId || '—') + '</td>' +
            '<td>' + (r.siteName || '—') + '</td>' +
            '<td>' + (r.vendor || '—') + '</td>' +
            '<td>' + (r.act || r.activity || '—') + '</td>' +
            '<td>' + (r.assignedDate || '—') + '</td>' +
            '<td>' + (r.tat || 2) + 'd</td>' +
            '<td>' + woBadge + '</td>' +
          '</tr>';
        }).join('');
      }

      const pagination = document.getElementById('pagination-info');
      if (pagination) {
        pagination.innerText = 'Showing ' + (filteredTableData.length > 0 ? (start + 1) : 0) + ' to ' + Math.min(start + itemsPerPage, filteredTableData.length) + ' of ' + filteredTableData.length + ' entries';
      }
    }

    function changePage(dir) {
      const totalPages = Math.ceil(filteredTableData.length / itemsPerPage) || 1;
      currentPage += dir;
      if (currentPage < 1) currentPage = 1;
      if (currentPage > totalPages) currentPage = totalPages;
      renderTable();
    }

    function searchSites() {
      currentPage = 1;
      renderTable();
    }

    function setWoChartType(type) {
      woChartType = type;
      const btnBar = document.getElementById('wo-chart-btn-bar');
      const btnDoughnut = document.getElementById('wo-chart-btn-doughnut');
      if (btnBar && btnDoughnut) {
        if (type === 'bar') {
          btnBar.style.background = 'var(--primary, #6366f1)';
          btnBar.style.color = '#fff';
          btnDoughnut.style.background = 'rgba(255,255,255,0.05)';
          btnDoughnut.style.color = 'var(--text-muted)';
        } else {
          btnDoughnut.style.background = 'var(--primary, #6366f1)';
          btnDoughnut.style.color = '#fff';
          btnBar.style.background = 'rgba(255,255,255,0.05)';
          btnBar.style.color = 'var(--text-muted)';
        }
      }
      renderWoDashboard();
    }

    function selectWoStatusPill(statusVal) {
      const select = document.getElementById('wo-status-filter');
      if (select) {
        select.value = statusVal;
        renderWoDashboard();
      }
    }

    function resetWoFilters() {
      if (document.getElementById('wo-search-input')) document.getElementById('wo-search-input').value = '';
      if (document.getElementById('wo-vendor-filter')) document.getElementById('wo-vendor-filter').value = 'all';
      if (document.getElementById('wo-activity-filter')) document.getElementById('wo-activity-filter').value = 'all';
      if (document.getElementById('wo-status-filter')) document.getElementById('wo-status-filter').value = 'all';
      if (document.getElementById('wo-ageing-filter')) document.getElementById('wo-ageing-filter').value = 'all';
      woCurrentPage = 1;
      renderWoDashboard();
    }

    function changeWoPage(dir) {
      const totalPages = Math.ceil(woFilteredTableData.length / woItemsPerPage) || 1;
      woCurrentPage += dir;
      if (woCurrentPage < 1) woCurrentPage = 1;
      if (woCurrentPage > totalPages) woCurrentPage = totalPages;
      renderWoDashboard(true);
    }

    function renderWoDashboard(keepPage = false) {
      if (!keepPage) woCurrentPage = 1;

      const dataObj = database[currentVendor] || database.all;
      const records = (dataObj && dataObj.rawRecords) ? dataObj.rawRecords : [];
      if (!records || records.length === 0) return;

      const actSelect = document.getElementById('wo-activity-filter');
      if (actSelect && actSelect.options.length <= 1) {
        const uniqueActs = Array.from(new Set(records.map(r => r.act || r.activity).filter(Boolean))).sort();
        uniqueActs.forEach(act => {
          const opt = document.createElement('option');
          opt.value = act;
          opt.textContent = act;
          actSelect.appendChild(opt);
        });
      }

      const vendorFilter = document.getElementById('wo-vendor-filter')?.value || 'all';
      const statusFilter = document.getElementById('wo-status-filter')?.value || 'all';
      const activityFilter = document.getElementById('wo-activity-filter')?.value || 'all';
      const searchInput = document.getElementById('wo-search-input')?.value?.toLowerCase() || '';

      let filtered = records;
      if (vendorFilter !== 'all') {
        filtered = filtered.filter(r => (r.vendor || '').toLowerCase().includes(vendorFilter.toLowerCase()));
      }
      if (activityFilter !== 'all') {
        filtered = filtered.filter(r => (r.act || r.activity || '').toLowerCase() === activityFilter.toLowerCase());
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter(r => {
          const st = getWoPendingStatus(r);
          if (statusFilter === 'released' || statusFilter === 'completed') return st === 'released';
          if (statusFilter === 'not_released' || statusFilter === 'pending') return st === 'not_released';
          return true;
        });
      }
      if (searchInput) {
        filtered = filtered.filter(r =>
          (r.siteId || '').toLowerCase().includes(searchInput) ||
          (r.siteName || '').toLowerCase().includes(searchInput) ||
          (r.vendor || '').toLowerCase().includes(searchInput)
        );
      }

      woFilteredTableData = filtered;

      const totalAll = records.length;
      const totalReleased = records.filter(r => getWoPendingStatus(r) === 'released').length;
      const totalNotReleased = records.filter(r => getWoPendingStatus(r) === 'not_released').length;

      const pillsContainer = document.getElementById('wo-summary-pills');
      if (pillsContainer) {
        pillsContainer.innerHTML =
          '<div class="wo-summary-pill ' + (statusFilter === 'all' ? 'active' : '') + '" onclick="selectWoStatusPill(\'all\')"><span>Total Work Orders</span><span>' + totalAll.toLocaleString() + '</span></div>' +
          '<div class="wo-summary-pill ' + (statusFilter === 'released' ? 'active' : '') + '" onclick="selectWoStatusPill(\'released\')"><span>🟢 WO Released / Received</span><span style="color:#34d399;">' + totalReleased.toLocaleString() + '</span></div>' +
          '<div class="wo-summary-pill ' + (statusFilter === 'pending' || statusFilter === 'not_released' ? 'active' : '') + '" onclick="selectWoStatusPill(\'pending\')"><span>🔴 WO Not Released / Pending</span><span style="color:#f87171;">' + totalNotReleased.toLocaleString() + '</span></div>';
      }

      const totalPages = Math.ceil(filtered.length / woItemsPerPage) || 1;
      const start = (woCurrentPage - 1) * woItemsPerPage;
      const paged = filtered.slice(start, start + woItemsPerPage);

      const tbody = document.getElementById('wo-detail-tbody');
      if (tbody) {
        tbody.innerHTML = paged.map(r => {
          const st = getWoPendingStatus(r);
          const woBadge = st === 'released'
            ? '<span class="status-badge status-live" style="font-size:0.7rem; padding:2px 8px;">🟢 Released</span>'
            : '<span class="status-badge status-delayed" style="font-size:0.7rem; padding:2px 8px;">🔴 Not Released</span>';

          return '<tr>' +
            '<td style="font-weight:600; color:#e2e8f0;">' + (r.siteId || '—') + '</td>' +
            '<td>' + (r.siteName || '—') + '</td>' +
            '<td>' + (r.vendor || '—') + '</td>' +
            '<td style="font-size:0.72rem;">' + (r.act || r.activity || '—') + '</td>' +
            '<td>' + (r.assignedDate || '—') + '</td>' +
            '<td>' + woBadge + '</td>' +
            '<td style="font-size:0.72rem; color:#94a3b8;">' + (r.rawWoStatus || r.status || '—') + '</td>' +
            '<td style="font-weight:600; font-size:0.75rem; color:' + (st === 'released' ? '#34d399' : '#f87171') + ';">' + (st === 'released' ? '0d pending' : 'Pending') + '</td>' +
          '</tr>';
        }).join('');

        const footer = document.getElementById('wo-table-footer');
        if (footer) {
          footer.innerHTML =
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; width:100%;">' +
              '<div>Page ' + woCurrentPage + ' of ' + totalPages + ' (' + filtered.length.toLocaleString() + ' Records Total)</div>' +
              '<div style="display:flex; gap:8px;">' +
                '<button onclick="changeWoPage(-1)" style="background:#1f2937; border:1px solid #374151; color:#e2e8f0; padding:4px 12px; border-radius:6px; font-size:0.72rem; cursor:pointer; font-weight:600;" ' + (woCurrentPage <= 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '>Previous</button>' +
                '<button onclick="changeWoPage(1)" style="background:#1f2937; border:1px solid #374151; color:#e2e8f0; padding:4px 12px; border-radius:6px; font-size:0.72rem; cursor:pointer; font-weight:600;" ' + (woCurrentPage >= totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '>Next</button>' +
              '</div>' +
            '</div>';
        }
      }
    }

    function parseCsvBrowser(text) {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      return lines.map(line => {
        const res = [];
        let cur = '';
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') { inQ = !inQ; }
          else if (c === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
          else { cur += c; }
        }
        res.push(cur.trim());
        return res;
      });
    }

    function parseDateStr(val) {
      if (!val) return '';
      val = val.toString().trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(val)) {
        const parts = val.split(/[\/\-]/);
        if (parts.length === 3) {
          let y = parts[2];
          if (y.length === 2) y = '20' + y;
          let m = parts[1].padStart(2, '0');
          let d = parts[0].padStart(2, '0');
          return y + '-' + m + '-' + d;
        }
      }
      return val;
    }

    function extractRecordsFromCsvMatrix(matrix, vendorName = 'Primary Vendor') {
      if (!matrix || matrix.length < 2) return [];
      const header = matrix[0].map(h => (h || '').toString().toLowerCase().trim());

      let siteIdIdx = header.findIndex(h => h.includes('site id') || h.includes('siteid') || h.includes('lsi'));
      if (siteIdIdx === -1) siteIdIdx = 0;

      let siteNameIdx = header.findIndex(h => h.includes('site name') || h.includes('sitename') || h.includes('customer name') || h.includes('bts/customer name'));
      if (siteNameIdx === -1) siteNameIdx = 1;

      let actIdx = header.findIndex(h => h === 'activity' || h.includes('activity name') || h.includes('activity') || h.includes('delivery track') || h.includes('site scope'));
      let assignedDateIdx = header.findIndex(h => h.includes('loading date') || h.includes('assigned') || h.includes('receive date') || h.includes('activity receive'));
      let completedDateIdx = header.findIndex(h => h.includes('complete date') || h.includes('completed date') || h.includes('activity done date') || h.includes('completed'));
      let tatIdx = header.findIndex(h => h.includes('actual tat') || h.includes('pns tat') || (h.includes('tat') && !h.includes('wi tat') && !h.includes('tcl') && !h.includes('remarks')));
      let tclTatIdx = header.findIndex(h => h.includes('tcl standard') || h.includes('wi tat') || h.includes('tcl'));
      let statusIdx = header.findIndex(h => h === 'status' || h.includes('installatio wip') || h.includes('wip'));
      let woStatusIdx = header.findIndex(h => h.includes('work order status') || h.includes('work order (wo)') || h.includes('wo status'));
      let remarksIdx = header.findIndex(h => h.includes('remark'));
      let stateIdx = header.findIndex(h => h.includes('state') || h.includes('circle'));

      const recs = [];
      for (let i = 1; i < matrix.length; i++) {
        const row = matrix[i];
        if (!row || row.length === 0) continue;
        const siteId = (row[siteIdIdx] || '').trim();
        const siteName = (row[siteNameIdx] || '').trim();
        if (!siteId && !siteName) continue;

        const tatVal = tatIdx !== -1 && row[tatIdx] ? parseFloat(row[tatIdx]) : NaN;
        const tclVal = tclTatIdx !== -1 && row[tclTatIdx] ? parseFloat(row[tclTatIdx]) : 5;
        const compDate = completedDateIdx !== -1 ? parseDateStr(row[completedDateIdx]) : '';

        recs.push({
          siteId: siteId || ('SITE_' + i),
          siteName: siteName || ('Site #' + i),
          vendor: vendorName,
          activity: actIdx !== -1 && row[actIdx] ? row[actIdx].trim() : 'Survey & Installation',
          assignedDate: assignedDateIdx !== -1 ? parseDateStr(row[assignedDateIdx]) : '2025-07-01',
          completedDate: compDate,
          tat: !isNaN(tatVal) ? tatVal : 2,
          tclTat: !isNaN(tclVal) ? tclVal : 5,
          status: statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : (compDate ? 'Completed' : 'WIP'),
          rawStatus: statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : (compDate ? 'Completed' : 'WIP'),
          rawWoStatus: woStatusIdx !== -1 && row[woStatusIdx] ? row[woStatusIdx].trim() : '',
          remarks: remarksIdx !== -1 && row[remarksIdx] ? row[remarksIdx].trim() : 'Standard Operation',
          state: stateIdx !== -1 && row[stateIdx] ? row[stateIdx].trim() : 'East'
        });
      }
      return recs;
    }

    function getActiveSources() {
      try {
        const saved = localStorage.getItem('CUSTOM_VENDOR_SOURCES');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return DEFAULT_SOURCES;
    }

    async function syncLiveGoogleSheetsInBrowser(forceUpdate = false) {
      if (isSyncing) return;
      isSyncing = true;

      const indicator = document.getElementById('live-indicator');
      if (indicator) indicator.innerHTML = '<span class="pulse-dot yellow"></span> Polling Google Sheets...';

      const sources = getActiveSources();
      const allFetched = [];

      try {
        for (const src of sources) {
          if (!src.id || src.id.includes('YOUR_SPREADSHEET_ID')) continue;
          const url = 'https://docs.google.com/spreadsheets/d/' + src.id + '/export?format=csv&gid=' + (src.gid || '0');
          const res = await fetch(url);
          if (!res.ok) continue;
          const text = await res.text();
          const matrix = parseCsvBrowser(text);
          const recs = extractRecordsFromCsvMatrix(matrix, src.name || 'Connected Vendor');
          allFetched.push(...recs);
        }

        if (allFetched.length > 0) {
          currentRawRecords = allFetched;
          database = recomputeFullDatabase(currentRawRecords);
          updateDashboard();
          if (typeof renderWoDashboard === 'function') renderWoDashboard();
          if (indicator) indicator.innerHTML = '<span class="pulse-dot green"></span> Live: ' + allFetched.length.toLocaleString() + ' Sites Synced';
        } else {
          if (indicator) indicator.innerHTML = '<span class="pulse-dot green"></span> Ready: ' + currentRawRecords.length.toLocaleString() + ' Sites';
        }
      } catch (err) {
        console.warn('Sync notice:', err.message);
        if (indicator) indicator.innerHTML = '<span class="pulse-dot green"></span> Ready: ' + currentRawRecords.length.toLocaleString() + ' Sites';
      } finally {
        isSyncing = false;
      }
    }

    function openConnectModal() {
      const modal = document.getElementById('connect-modal');
      if (modal) {
        modal.style.display = 'flex';
        const sources = getActiveSources();
        if (sources && sources.length > 0) {
          document.getElementById('modal-vendor-name').value = sources[0].name || '';
          document.getElementById('modal-sheet-url').value = sources[0].id || '';
          document.getElementById('modal-sheet-gid').value = sources[0].gid || '0';
        }
      }
    }

    function closeConnectModal() {
      const modal = document.getElementById('connect-modal');
      if (modal) modal.style.display = 'none';
      const status = document.getElementById('modal-connect-status');
      if (status) status.style.display = 'none';
    }

    function handleModalCsvUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const text = e.target.result;
        const matrix = parseCsvBrowser(text);
        const vendorName = document.getElementById('modal-vendor-name').value || file.name.replace(/\.csv$/i, '');
        const recs = extractRecordsFromCsvMatrix(matrix, vendorName);
        if (recs.length > 0) {
          currentRawRecords = recs;
          database = recomputeFullDatabase(currentRawRecords);
          updateDashboard();
          if (typeof renderWoDashboard === 'function') renderWoDashboard();
          closeConnectModal();
          alert('✅ Loaded ' + recs.length.toLocaleString() + ' records from CSV file!');
        } else {
          alert('❌ No valid site records found in CSV file.');
        }
      };
      reader.readAsText(file);
    }

    async function saveAndConnectFromModal() {
      let urlOrId = document.getElementById('modal-sheet-url').value.trim();
      let gid = document.getElementById('modal-sheet-gid').value.trim() || '0';
      const vendorName = document.getElementById('modal-vendor-name').value.trim() || 'Connected Vendor';
      const statusDiv = document.getElementById('modal-connect-status');

      if (!urlOrId) {
        alert('Please enter a Google Sheet URL or Spreadsheet ID.');
        return;
      }

      const idMatch = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch) urlOrId = idMatch[1];
      const gidMatch = document.getElementById('modal-sheet-url').value.match(/[#&]gid=([0-9]+)/);
      if (gidMatch) gid = gidMatch[1];

      statusDiv.style.display = 'block';
      statusDiv.style.background = 'rgba(99,102,241,0.2)';
      statusDiv.style.color = '#cbd5e1';
      statusDiv.innerText = 'Connecting to Google Sheet and testing CSV export...';

      try {
        const testUrl = 'https://docs.google.com/spreadsheets/d/' + urlOrId + '/export?format=csv&gid=' + gid;
        const res = await fetch(testUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status + ' - Check if sheet is shared with "Anyone with link can view"');
        const csvText = await res.text();
        const matrix = parseCsvBrowser(csvText);
        const recs = extractRecordsFromCsvMatrix(matrix, vendorName);

        if (recs.length === 0) throw new Error('No valid site rows detected. Ensure columns include Site ID, Vendor, Activity, etc.');

        const newSources = [{ name: vendorName, id: urlOrId, gid: gid }];
        localStorage.setItem('CUSTOM_VENDOR_SOURCES', JSON.stringify(newSources));

        currentRawRecords = recs;
        database = recomputeFullDatabase(currentRawRecords);
        updateDashboard();
        if (typeof renderWoDashboard === 'function') renderWoDashboard();

        statusDiv.style.background = 'rgba(16,185,129,0.2)';
        statusDiv.style.color = '#34d399';
        statusDiv.innerText = '✅ Success! Connected ' + recs.length.toLocaleString() + ' sites live.';

        setTimeout(() => closeConnectModal(), 1200);
      } catch (err) {
        statusDiv.style.background = 'rgba(239,68,68,0.2)';
        statusDiv.style.color = '#f87171';
        statusDiv.innerText = '⚠️ Connection failed: ' + err.message;
      }
    }

    function resetToDemoData() {
      localStorage.removeItem('CUSTOM_VENDOR_SOURCES');
      alert('Reset to default demo data. Reloading...');
      window.location.reload();
    }

    function initDashboardApp() {
      database = recomputeFullDatabase(currentRawRecords);
      initCharts();
      updateDashboard();
      if (typeof renderWoDashboard === 'function') renderWoDashboard();

      const sources = getActiveSources();
      if (sources && sources.length > 0 && !sources[0].id.includes('YOUR_SPREADSHEET_ID')) {
        setTimeout(() => syncLiveGoogleSheetsInBrowser(false), 500);
      }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(initDashboardApp, 1);
    } else {
      window.addEventListener('DOMContentLoaded', initDashboardApp);
    }

    setInterval(() => syncLiveGoogleSheetsInBrowser(false), AUTO_SYNC_INTERVAL_MS);
  </script>
`;

const completeNewDashboardHtml = headAndBodyHtml + '\n' + clientScript + '\n' + afterScriptHtml;

fs.writeFileSync('new_dashboard.html', completeNewDashboardHtml, 'utf8');
console.log('✅ Successfully created new_dashboard.html with interactive connection configuration!');
