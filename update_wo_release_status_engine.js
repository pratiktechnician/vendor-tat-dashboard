const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Replace getWoPendingStatus function with WO Released / Not Released logic
const oldFuncRegex = /function getWoPendingStatus\(record\)[\s\S]*?renderWoDashboard\(\);\s*\}/;

const newEngine = `
    function getWoPendingStatus(record) {
      if (!record) return 'not_released';
      const s = (record.rawStatus || record.status || '').toString().toLowerCase();
      const remarks = (record.remarks || '').toString().toLowerCase();
      const hasCompletedDate = !!(record.completedDate && record.completedDate !== '' && record.completedDate !== '—');

      if (hasCompletedDate || s.includes('complete') || s.includes('done') || s.includes('migrat') || s.includes('i&c complete') || s.includes('pe done')) {
        return 'released'; // WO Released / Received
      } else if (s.includes('wip') || s.includes('progress') || s.includes('yts') || s.includes('process') || remarks.includes('wip')) {
        return 'wip'; // WIP / In Progress
      } else {
        return 'not_released'; // WO Not Released / Pending
      }
    }

    function filterWoByVendorHeader(vendorVal) {
      const tableSelect = document.getElementById('wo-vendor-filter');
      if (tableSelect) tableSelect.value = vendorVal;
      
      const titleEl = document.getElementById('wo-section-main-title');
      if (titleEl) {
        if (vendorVal === 'all') {
          titleEl.innerText = '📋 Work Order (WO) Status — Released vs Not Released (Vendor Wise)';
        } else {
          titleEl.innerText = \`📋 Work Order (WO) Status — \${vendorVal}\`;
        }
      }
      
      renderWoDashboard();
    }
`;

if (html.match(oldFuncRegex)) {
  html = html.replace(oldFuncRegex, newEngine.trim());
}

// 2. Replace section header title text
html = html.replace(
  '📋 Work Order (WO) Pending Status — All Vendors',
  '📋 Work Order (WO) Status — Released vs Not Released (Vendor Wise)'
);

// 3. Replace status filter select options in the WO table controls bar
const oldStatusSelect = `<select id="wo-status-filter" onchange="renderWoDashboard()" style="background:#0d1117; border:1px solid #30363d; color:#e2e8f0; padding:6px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer;">
                <option value="all">⚡ All Statuses</option>
                <option value="pending">🔴 Pending (WO = YES)</option>
                <option value="wip">🟡 WIP</option>
                <option value="completed">🟢 Completed (WO = NO)</option>
              </select>`;

const newStatusSelect = `<select id="wo-status-filter" onchange="renderWoDashboard()" style="background:#0d1117; border:1px solid #30363d; color:#e2e8f0; padding:6px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer;">
                <option value="all">⚡ All Statuses</option>
                <option value="released">🟢 WO Released / Received</option>
                <option value="wip">🟡 WIP / In Progress</option>
                <option value="not_released">🔴 WO Not Released / Pending</option>
              </select>`;

if (html.includes(oldStatusSelect)) {
  html = html.replace(oldStatusSelect, newStatusSelect);
}

// 4. Replace renderWoDashboard implementation for Released vs Not Released
const oldRenderWoRegex = /function renderWoDashboard\(\)[\s\S]*?renderTable\(\);\s*\}/;

const newRenderWoDashboard = `
    function renderWoDashboard() {
      const records = (database && database.all && database.all.rawRecords) ? database.all.rawRecords : (database[currentVendor] ? database[currentVendor].rawRecords : []);
      if (!records || records.length === 0) return;

      const vendorFilter = document.getElementById('wo-vendor-filter')?.value || 'all';
      const statusFilter = document.getElementById('wo-status-filter')?.value || 'all';
      const searchInput = document.getElementById('wo-search-input')?.value?.toLowerCase() || '';

      const today = getCurrentSystemDate();

      let filtered = records;
      if (vendorFilter !== 'all') {
        filtered = filtered.filter(r => (r.vendor || '').toLowerCase().includes(vendorFilter.toLowerCase()));
      }

      if (searchInput) {
        filtered = filtered.filter(r => 
          (r.siteId || '').toLowerCase().includes(searchInput) ||
          (r.siteName || '').toLowerCase().includes(searchInput) ||
          (r.act || r.activity || '').toLowerCase().includes(searchInput) ||
          (r.vendor || '').toLowerCase().includes(searchInput)
        );
      }

      // Group statistics per vendor
      const vendorGroups = {};
      filtered.forEach(r => {
        const v = r.vendor || 'Unknown Vendor';
        if (!vendorGroups[v]) vendorGroups[v] = { total: 0, released: 0, wip: 0, not_released: 0, records: [] };
        vendorGroups[v].total++;
        const st = getWoPendingStatus(r);
        vendorGroups[v][st]++;
        vendorGroups[v].records.push({ ...r, woReleaseStatus: st });
      });

      // Summary Pills
      const totalAll = filtered.length;
      const totalReleased = filtered.filter(r => getWoPendingStatus(r) === 'released').length;
      const totalWip = filtered.filter(r => getWoPendingStatus(r) === 'wip').length;
      const totalNotReleased = filtered.filter(r => getWoPendingStatus(r) === 'not_released').length;

      const pillsContainer = document.getElementById('wo-summary-pills');
      if (pillsContainer) {
        pillsContainer.innerHTML = \`
          <div class="wo-summary-pill"><span>Total Work Orders</span><span>\${totalAll}</span></div>
          <div class="wo-summary-pill"><span>🟢 WO Released / Received</span><span style="color:#34d399;">\${totalReleased}</span></div>
          <div class="wo-summary-pill"><span>🟡 WIP / In Progress</span><span style="color:#fbbf24;">\${totalWip}</span></div>
          <div class="wo-summary-pill"><span>🔴 WO Not Released / Pending</span><span style="color:#f87171;">\${totalNotReleased}</span></div>
        \`;
      }

      // Render per-vendor cards
      const cardsGrid = document.getElementById('wo-vendor-cards');
      if (cardsGrid) {
        const vendorMeta = {
          'PNS Telecom': { cls: 'pns', emoji: '📡' },
          'Saesha Power': { cls: 'saesha', emoji: '⚡' },
          'RIPL': { cls: 'ripl', emoji: '🔧' },
          'Malfonic': { cls: 'malfonic', emoji: '📶' }
        };

        const cardsHtml = Object.entries(vendorGroups).map(([vName, stats]) => {
          const meta = vendorMeta[vName] || { cls: 'pns', emoji: '🏢' };
          const releasePct = stats.total > 0 ? ((stats.released / stats.total) * 100).toFixed(0) : 0;
          return \`
            <div class="wo-vendor-card \${meta.cls}">
              <div class="wo-vendor-name">\${meta.emoji} \${vName}</div>
              <div class="wo-big-number" style="color:#e2e8f0;">\${stats.total}</div>
              <div class="wo-big-label" style="color:#64748b;">Total Orders</div>
              <div style="margin-top:10px;">
                <div class="wo-stat-row"><span class="wo-stat-label">🟢 Released / Received</span><span class="wo-stat-value completed">\${stats.released}</span></div>
                <div class="wo-stat-row"><span class="wo-stat-label">🟡 WIP / In Progress</span><span class="wo-stat-value wip">\${stats.wip}</span></div>
                <div class="wo-stat-row"><span class="wo-stat-label">🔴 Not Released / Pending</span><span class="wo-stat-value pending">\${stats.not_released}</span></div>
              </div>
              <div class="wo-progress-bar"><div class="wo-progress-fill" style="width:\${releasePct}%"></div></div>
              <div style="font-size:0.68rem; color:#64748b; margin-top:4px; text-align:right;">\${releasePct}% Released / Received</div>
            </div>
          \`;
        }).join('');
        cardsGrid.innerHTML = cardsHtml || '<div style="color:#94a3b8;">No vendor data.</div>';
      }

      // Detail Table
      const tbody = document.getElementById('wo-detail-tbody');
      if (tbody) {
        let tableRecords = [];
        Object.values(vendorGroups).forEach(g => {
          tableRecords = tableRecords.concat(g.records);
        });

        if (statusFilter !== 'all') {
          tableRecords = tableRecords.filter(r => r.woReleaseStatus === statusFilter);
        }

        const MAX_ROWS = 100;
        const shown = tableRecords.slice(0, MAX_ROWS);

        tbody.innerHTML = shown.map(r => {
          const st = r.woReleaseStatus;
          const woBadge = st === 'released'
            ? '<span class="wo-badge no">🟢 Released / Received</span>'
            : st === 'wip'
              ? '<span class="wo-badge wip">🟡 WIP</span>'
              : '<span class="wo-badge yes">🔴 Not Released</span>';

          const age = r.assignedDate ? Math.max(0, Math.floor((today - new Date(r.assignedDate)) / 86400000)) : 2;
          const ageColor = age > 15 ? '#f87171' : age > 7 ? '#fbbf24' : '#94a3b8';

          return \`<tr>
            <td style="font-weight:600;color:#e2e8f0;">\${r.siteId || r.site_id || '—'}</td>
            <td>\${r.siteName || r.site_name || '—'}</td>
            <td>\${r.vendor || '—'}</td>
            <td style="font-size:0.72rem;">\${r.act || r.activity || '—'}</td>
            <td>\${r.assignedDate || r.assigned_date || '—'}</td>
            <td>\${woBadge}</td>
            <td style="font-size:0.72rem; color:#94a3b8;">\${r.rawStatus || r.status || '—'}</td>
            <td style="font-weight:700; color:\${ageColor};">\${age}d</td>
          </tr>\`;
        }).join('');

        const footer = document.getElementById('wo-table-footer');
        if (footer) footer.innerText = \`Showing \${shown.length} of \${tableRecords.length} records\`;
      }
    }
`;

if (html.match(oldRenderWoRegex)) {
  html = html.replace(oldRenderWoRegex, newRenderWoDashboard.trim());
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with WO Released vs Not Released engine!');
