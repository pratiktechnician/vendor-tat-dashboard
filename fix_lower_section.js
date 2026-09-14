const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Fix filterTable in index.html to be 100% null/undefined safe
const filterTableOldRegex = /function filterTable\(\)[\s\S]*?renderTable\(\);\s*\}/;

const filterTableNew = `
    function filterTable() {
      const searchInput = document.getElementById('table-search');
      const search = searchInput ? searchInput.value.toLowerCase() : '';
      const slaSelect = document.getElementById('filter-sla');
      const slaFilter = slaSelect ? slaSelect.value : 'ALL';

      if (!Array.isArray(rawTableData)) {
        rawTableData = database[currentVendor] ? database[currentVendor].rawRecords : [];
      }

      filteredTableData = (rawTableData || []).filter(r => {
        if (!r) return false;
        const siteId = (r.siteId || r.site_id || '').toString().toLowerCase();
        const siteName = (r.siteName || r.site_name || '').toString().toLowerCase();
        const proj = (r.proj || r.project || '').toString().toLowerCase();
        const act = (r.act || r.activity || '').toString().toLowerCase();
        const remarks = (r.remarks || '').toString().toLowerCase();

        const matchesSearch = !search || 
                              siteId.includes(search) || 
                              siteName.includes(search) || 
                              proj.includes(search) || 
                              act.includes(search) ||
                              remarks.includes(search);
        
        const statusStr = (r.status || '').toString();
        const matchesSla = slaFilter === 'ALL' || 
                          (slaFilter === 'IN_TAT' && (statusStr === 'In TAT' || statusStr.toLowerCase().includes('in tat'))) || 
                          (slaFilter === 'OUTSIDE_TAT' && (statusStr === 'Outside TAT' || statusStr.toLowerCase().includes('outside')));

        return matchesSearch && matchesSla;
      });

      currentPage = 1;
      renderTable();
    }
`;

if (html.match(filterTableOldRegex)) {
  html = html.replace(filterTableOldRegex, filterTableNew.trim());
}

// 2. Add complete helper functions for renderWoDashboard, resetWoFilters, etc.
const woDashboardEngine = `
    // =========================================================================
    // WORK ORDER (WO) DASHBOARD ENGINE
    // =========================================================================
    function getCurrentSystemDate() {
      return new Date(2026, 8, 14);
    }

    function getWoPendingStatus(record) {
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
    }

    function resetWoFilters() {
      const v = document.getElementById('wo-vendor-filter'); if (v) v.value = 'all';
      const s = document.getElementById('wo-status-filter'); if (s) s.value = 'all';
      const a = document.getElementById('wo-activity-filter'); if (a) a.value = 'all';
      const g = document.getElementById('wo-ageing-filter'); if (g) g.value = 'all';
      const q = document.getElementById('wo-search-input'); if (q) q.value = '';
      renderWoDashboard();
    }

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

      // Group statistics
      const vendorGroups = {};
      filtered.forEach(r => {
        const v = r.vendor || 'Unknown Vendor';
        if (!vendorGroups[v]) vendorGroups[v] = { total: 0, pending: 0, wip: 0, completed: 0, records: [] };
        vendorGroups[v].total++;
        const wo = getWoPendingStatus(r);
        vendorGroups[v][wo]++;
        vendorGroups[v].records.push({ ...r, woPending: wo });
      });

      // Summary Pills
      const totalAll = filtered.length;
      const totalPending = filtered.filter(r => getWoPendingStatus(r) === 'pending').length;
      const totalWip = filtered.filter(r => getWoPendingStatus(r) === 'wip').length;
      const totalCompleted = filtered.filter(r => getWoPendingStatus(r) === 'completed').length;

      const pillsContainer = document.getElementById('wo-summary-pills');
      if (pillsContainer) {
        pillsContainer.innerHTML = \`
          <div class="wo-summary-pill"><span>Total Orders</span><span>\${totalAll}</span></div>
          <div class="wo-summary-pill"><span>🔴 Pending (WO)</span><span style="color:#f87171;">\${totalPending}</span></div>
          <div class="wo-summary-pill"><span>🟡 In Progress (WIP)</span><span style="color:#fbbf24;">\${totalWip}</span></div>
          <div class="wo-summary-pill"><span>🟢 Completed (Done)</span><span style="color:#34d399;">\${totalCompleted}</span></div>
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
          const complPct = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0;
          return \`
            <div class="wo-vendor-card \${meta.cls}">
              <div class="wo-vendor-name">\${meta.emoji} \${vName}</div>
              <div class="wo-big-number" style="color:#e2e8f0;">\${stats.total}</div>
              <div class="wo-big-label" style="color:#64748b;">Work Orders</div>
              <div style="margin-top:10px;">
                <div class="wo-stat-row"><span class="wo-stat-label">🔴 Pending</span><span class="wo-stat-value pending">\${stats.pending}</span></div>
                <div class="wo-stat-row"><span class="wo-stat-label">🟡 WIP</span><span class="wo-stat-value wip">\${stats.wip}</span></div>
                <div class="wo-stat-row"><span class="wo-stat-label">🟢 Done</span><span class="wo-stat-value completed">\${stats.completed}</span></div>
              </div>
              <div class="wo-progress-bar"><div class="wo-progress-fill" style="width:\${complPct}%"></div></div>
              <div style="font-size:0.68rem; color:#64748b; margin-top:4px; text-align:right;">\${complPct}% Complete</div>
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
          tableRecords = tableRecords.filter(r => r.woPending === statusFilter);
        }

        const MAX_ROWS = 100;
        const shown = tableRecords.slice(0, MAX_ROWS);

        tbody.innerHTML = shown.map(r => {
          const wo = r.woPending;
          const woBadge = wo === 'pending'
            ? '<span class="wo-badge yes">YES (Pending)</span>'
            : wo === 'wip'
              ? '<span class="wo-badge wip">WIP</span>'
              : '<span class="wo-badge no">NO (Done)</span>';

          const age = r.assignedDate ? Math.max(0, Math.floor((today - new Date(r.assignedDate)) / 86400000)) : 2;
          const ageColor = age > 15 ? '#f87171' : age > 7 ? '#fbbf24' : '#94a3b8';

          return \`<tr>
            <td style="font-weight:600;color:#e2e8f0;">\${r.siteId || r.site_id || '—'}</td>
            <td>\${r.siteName || r.site_name || '—'}</td>
            <td>\${r.vendor || '—'}</td>
            <td style="font-size:0.72rem;">\${r.act || r.activity || '—'}</td>
            <td>\${r.assignedDate || r.assigned_date || '—'}</td>
            <td>\${woBadge}</td>
            <td style="font-size:0.72rem; color:#94a3b8;">\${r.status || '—'}</td>
            <td style="font-weight:700; color:\${ageColor};">\${age}d</td>
          </tr>\`;
        }).join('');

        const footer = document.getElementById('wo-table-footer');
        if (footer) footer.innerText = \`Showing \${shown.length} of \${tableRecords.length} records\`;
      }
    }
`;

if (!html.includes('WORK ORDER (WO) DASHBOARD ENGINE')) {
  html = html.replace('function updateDashboard() {', `${woDashboardEngine}\n    function updateDashboard() {`);
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully fixed lower section & added renderWoDashboard engine to index.html!');
