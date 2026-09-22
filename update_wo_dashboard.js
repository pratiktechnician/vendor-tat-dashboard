const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add CSS for interactive elements
const extraCss = `
    .wo-summary-pill {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .wo-summary-pill:hover, .wo-summary-pill.active {
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.15);
      transform: translateY(-1px);
    }
    .wo-vendor-card {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .wo-vendor-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .wo-vendor-card.selected {
      border-color: #6366f1 !important;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.35) !important;
    }
`;

if (!html.includes('.wo-vendor-card.selected')) {
  html = html.replace('</style>', `${extraCss}\n  </style>`);
}

// 2. Insert Chart Canvas into HTML inside .wo-dashboard-section
const woHeaderSnippet = `<div class="wo-section-header">`;
const newWoHeaderSnippet = `
        <!-- PICTORIAL DASHBOARD CHART -->
        <div class="card" style="margin-bottom:20px; background:var(--glass-bg, rgba(15,19,28,0.85)); border:1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius:16px; padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px;">
            <div>
              <div style="font-family:var(--font-heading); font-size:1.05rem; font-weight:700; color:#fff;">📊 Vendor Work Order Status Pictorial Breakdown</div>
              <div style="font-size:0.78rem; color:var(--text-muted);">Interactive visual comparison of WO Released (Received) vs WIP vs Not Released across all vendor sheets</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button id="wo-chart-btn-bar" onclick="setWoChartType('bar')" style="background:var(--primary, #6366f1); border:1px solid var(--primary); color:#fff; padding:6px 14px; border-radius:6px; font-size:0.75rem; cursor:pointer; font-weight:600;">📊 Stacked Bar Chart</button>
              <button id="wo-chart-btn-doughnut" onclick="setWoChartType('doughnut')" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); padding:6px 14px; border-radius:6px; font-size:0.75rem; cursor:pointer; font-weight:600;">🍩 Donut Chart</button>
            </div>
          </div>
          <div style="position:relative; height:290px; width:100%;">
            <canvas id="chart-wo-status"></canvas>
          </div>
        </div>

        <div class="wo-section-header">
`;

if (!html.includes('chart-wo-status')) {
  html = html.replace('<div class="wo-section-header">', newWoHeaderSnippet.trim());
}

// 3. Complete JavaScript Engine for WO Pictorial Dashboard & Real-Time Polling
const jsEngineCode = `
    // =========================================================================
    // WORK ORDER (WO) PICTORIAL DASHBOARD & INTERACTIVE ENGINE
    // =========================================================================
    let chartWoStatus = null;
    let woChartType = 'bar';

    function getCurrentSystemDate() {
      return new Date(2026, 8, 14);
    }

    function getWoPendingStatus(record) {
      if (!record) return 'not_released';
      const woLower = (record.rawWoStatus || '').toString().toLowerCase().trim();
      const rawLower = (record.rawStatus || record.status || '').toString().toLowerCase().trim();
      const remLower = (record.remarks || '').toString().toLowerCase().trim();
      const hasCompDate = !!(record.completedDate && record.completedDate !== '' && record.completedDate !== '—');

      // Precedence 1: Explicit Work Order Status column from Google Sheets
      if (woLower === 'not release' || woLower === 'not released' || woLower === 'pending' || woLower === 'not received') {
        return 'not_released';
      }
      if (woLower === 'release' || woLower === 'released' || woLower === 'not required' || woLower === 'dropped' || woLower === 'received') {
        return 'released';
      }
      if (woLower === 'wip' || woLower === 'hold' || woLower === 'yts') {
        return 'wip';
      }

      // Precedence 2: Completion dates & activity status
      if (hasCompDate || rawLower.includes('complete') || rawLower.includes('done') || rawLower.includes('migrat') || rawLower.includes('pe done')) {
        return 'released';
      }
      if (rawLower.includes('wip') || rawLower.includes('progress') || rawLower.includes('yts') || remLower.includes('wip')) {
        return 'wip';
      }

      return 'not_released';
    }

    function setWoChartType(type) {
      woChartType = type;
      const btnBar = document.getElementById('wo-chart-btn-bar');
      const btnDonut = document.getElementById('wo-chart-btn-doughnut');
      if (btnBar) {
        btnBar.style.background = type === 'bar' ? 'var(--primary, #6366f1)' : 'rgba(255,255,255,0.05)';
        btnBar.style.color = type === 'bar' ? '#fff' : 'var(--text-muted)';
      }
      if (btnDonut) {
        btnDonut.style.background = type === 'doughnut' ? 'var(--primary, #6366f1)' : 'rgba(255,255,255,0.05)';
        btnDonut.style.color = type === 'doughnut' ? '#fff' : 'var(--text-muted)';
      }
      renderWoDashboard();
    }

    function selectWoStatusPill(statusVal) {
      const select = document.getElementById('wo-status-filter');
      if (select) {
        select.value = select.value === statusVal ? 'all' : statusVal;
      }
      renderWoDashboard();
    }

    function selectWoVendorCard(vName) {
      const select = document.getElementById('wo-vendor-filter');
      const headerSelect = document.getElementById('wo-header-vendor-dropdown');
      if (select) {
        const newVal = select.value === vName ? 'all' : vName;
        select.value = newVal;
        if (headerSelect) headerSelect.value = newVal;
      }
      renderWoDashboard();
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

    function resetWoFilters() {
      if (document.getElementById('wo-search-input')) document.getElementById('wo-search-input').value = '';
      if (document.getElementById('wo-vendor-filter')) document.getElementById('wo-vendor-filter').value = 'all';
      if (document.getElementById('wo-header-vendor-dropdown')) document.getElementById('wo-header-vendor-dropdown').value = 'all';
      if (document.getElementById('wo-activity-filter')) document.getElementById('wo-activity-filter').value = 'all';
      if (document.getElementById('wo-status-filter')) document.getElementById('wo-status-filter').value = 'all';
      if (document.getElementById('wo-ageing-filter')) document.getElementById('wo-ageing-filter').value = 'all';
      renderWoDashboard();
    }

    function renderWoDashboard() {
      const records = (database && database.all && database.all.rawRecords) ? database.all.rawRecords : (database[currentVendor] ? database[currentVendor].rawRecords : []);
      if (!records || records.length === 0) return;

      // Dynamic Activity Dropdown Population
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
      const ageingFilter = document.getElementById('wo-ageing-filter')?.value || 'all';
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

      // Compute statistics per vendor across entire dataset
      const vendorNames = ['PNS Telecom', 'Saesha Power', 'RIPL', 'Malfonic'];
      const vendorGroups = {};
      vendorNames.forEach(v => {
        vendorGroups[v] = { total: 0, released: 0, wip: 0, not_released: 0, records: [] };
      });

      records.forEach(r => {
        let v = r.vendor || 'Unknown Vendor';
        if (v.toLowerCase().includes('pns')) v = 'PNS Telecom';
        else if (v.toLowerCase().includes('saesha')) v = 'Saesha Power';
        else if (v.toLowerCase().includes('ripl')) v = 'RIPL';
        else if (v.toLowerCase().includes('malfonic')) v = 'Malfonic';

        if (!vendorGroups[v]) vendorGroups[v] = { total: 0, released: 0, wip: 0, not_released: 0, records: [] };
        vendorGroups[v].total++;
        const st = getWoPendingStatus(r);
        vendorGroups[v][st]++;
        vendorGroups[v].records.push({ ...r, woReleaseStatus: st });
      });

      // KPI Summary Pills (reflecting filtered scope)
      const totalAll = filtered.length;
      const totalReleased = filtered.filter(r => getWoPendingStatus(r) === 'released').length;
      const totalWip = filtered.filter(r => getWoPendingStatus(r) === 'wip').length;
      const totalNotReleased = filtered.filter(r => getWoPendingStatus(r) === 'not_released').length;

      const pillsContainer = document.getElementById('wo-summary-pills');
      if (pillsContainer) {
        pillsContainer.innerHTML = \`
          <div class="wo-summary-pill \${statusFilter === 'all' ? 'active' : ''}" onclick="selectWoStatusPill('all')"><span>Total Work Orders</span><span>\${totalAll}</span></div>
          <div class="wo-summary-pill \${statusFilter === 'released' || statusFilter === 'completed' ? 'active' : ''}" onclick="selectWoStatusPill('released')"><span>🟢 WO Released / Received</span><span style="color:#34d399;">\${totalReleased}</span></div>
          <div class="wo-summary-pill \${statusFilter === 'wip' ? 'active' : ''}" onclick="selectWoStatusPill('wip')"><span>🟡 WIP / In Progress</span><span style="color:#fbbf24;">\${totalWip}</span></div>
          <div class="wo-summary-pill \${statusFilter === 'not_released' || statusFilter === 'pending' ? 'active' : ''}" onclick="selectWoStatusPill('pending')"><span>🔴 WO Not Released / Pending</span><span style="color:#f87171;">\${totalNotReleased}</span></div>
        \`;
      }

      // Render Chart.js Pictorial Dashboard Chart
      const chartCtx = document.getElementById('chart-wo-status');
      if (chartCtx) {
        const releasedCounts = vendorNames.map(v => vendorGroups[v] ? vendorGroups[v].released : 0);
        const wipCounts = vendorNames.map(v => vendorGroups[v] ? vendorGroups[v].wip : 0);
        const notReleasedCounts = vendorNames.map(v => vendorGroups[v] ? vendorGroups[v].not_released : 0);

        if (chartWoStatus) {
          chartWoStatus.destroy();
        }

        if (woChartType === 'doughnut') {
          chartWoStatus = new Chart(chartCtx, {
            type: 'doughnut',
            data: {
              labels: ['🟢 WO Released / Received', '🟡 WIP / In Progress', '🔴 WO Not Released / Pending'],
              datasets: [{
                data: [totalReleased, totalWip, totalNotReleased],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 2,
                borderColor: '#0f131c'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } },
                tooltip: {
                  callbacks: {
                    label: function(ctx) {
                      const val = ctx.raw || 0;
                      const pct = totalAll > 0 ? ((val / totalAll) * 100).toFixed(1) : 0;
                      return \`\${ctx.label}: \${val} (\${pct}%)\`;
                    }
                  }
                }
              }
            }
          });
        } else {
          chartWoStatus = new Chart(chartCtx, {
            type: 'bar',
            data: {
              labels: vendorNames,
              datasets: [
                {
                  label: '🟢 WO Released / Received',
                  data: releasedCounts,
                  backgroundColor: '#10b981',
                  borderRadius: 6
                },
                {
                  label: '🟡 WIP / In Progress',
                  data: wipCounts,
                  backgroundColor: '#f59e0b',
                  borderRadius: 6
                },
                {
                  label: '🔴 WO Not Released / Pending',
                  data: notReleasedCounts,
                  backgroundColor: '#ef4444',
                  borderRadius: 6
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } },
                tooltip: { mode: 'index', intersect: false }
              },
              scales: {
                x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
              },
              onClick: (evt, elements) => {
                if (elements && elements.length > 0) {
                  const el = elements[0];
                  const clickedVendor = vendorNames[el.index];
                  const statusMap = ['released', 'wip', 'pending'];
                  const clickedStatus = statusMap[el.datasetIndex];

                  selectWoVendorCard(clickedVendor);
                  selectWoStatusPill(clickedStatus);
                }
              }
            }
          });
        }
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
          const isSelected = vendorFilter.toLowerCase().includes(vName.toLowerCase());

          return \`
            <div class="wo-vendor-card \${meta.cls} \${isSelected ? 'selected' : ''}" onclick="selectWoVendorCard('\${vName}')" title="Click to filter by \${vName}">
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

      // Filter detail table records based on all active controls
      const tbody = document.getElementById('wo-detail-tbody');
      if (tbody) {
        let tableRecords = [];
        Object.values(vendorGroups).forEach(g => {
          tableRecords = tableRecords.concat(g.records);
        });

        // Vendor filter
        if (vendorFilter !== 'all') {
          tableRecords = tableRecords.filter(r => (r.vendor || '').toLowerCase().includes(vendorFilter.toLowerCase()));
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'pending' || statusFilter === 'not_released') {
            tableRecords = tableRecords.filter(r => r.woReleaseStatus === 'not_released');
          } else if (statusFilter === 'released' || statusFilter === 'completed') {
            tableRecords = tableRecords.filter(r => r.woReleaseStatus === 'released');
          } else if (statusFilter === 'wip') {
            tableRecords = tableRecords.filter(r => r.woReleaseStatus === 'wip');
          }
        }

        // Activity filter
        if (activityFilter !== 'all') {
          tableRecords = tableRecords.filter(r => (r.act || r.activity) === activityFilter);
        }

        // Ageing filter
        if (ageingFilter !== 'all') {
          tableRecords = tableRecords.filter(r => {
            const age = r.assignedDate ? Math.max(0, Math.floor((today - new Date(r.assignedDate)) / 86400000)) : 2;
            if (ageingFilter === 'critical') return age > 15;
            if (ageingFilter === 'medium') return age >= 8 && age <= 15;
            if (ageingFilter === 'low') return age <= 7;
            return true;
          });
        }

        // Search text
        if (searchInput) {
          tableRecords = tableRecords.filter(r => 
            (r.siteId || '').toLowerCase().includes(searchInput) ||
            (r.siteName || '').toLowerCase().includes(searchInput) ||
            (r.act || r.activity || '').toLowerCase().includes(searchInput) ||
            (r.vendor || '').toLowerCase().includes(searchInput)
          );
        }

        const MAX_ROWS = 150;
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
            <td style="font-size:0.72rem; color:#94a3b8;">\${r.rawWoStatus || r.rawStatus || r.status || '—'}</td>
            <td style="font-weight:700; color:\${ageColor};">\${age}d</td>
          </tr>\`;
        }).join('');

        const footer = document.getElementById('wo-table-footer');
        if (footer) footer.innerText = \`Showing \${shown.length} of \${tableRecords.length} records\`;
      }
    }

    // =========================================================================
    // REALTIME LIVE GOOGLE SHEETS BROWSER POLLER (15s AUTO-SYNC)
    // =========================================================================
    const GOOGLE_SHEET_SOURCES = [
      { name: 'Saesha Power', id: '1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8', gid: '802337370' },
      { name: 'PNS Telecom', id: '1Yvowk4tAm_Z0lKFqsIJ-RFMaOduwfBzlbKc7nSq1qMA', gid: '723949951' },
      { name: 'RIPL', id: '1Fa3lKVvWxL3WIWxnIhm-TpcgWm1gKWYLoGZHyvFU18c', gid: '880649132' },
      { name: 'Malfonic', id: '15Ka8mS44lxKD9pg0e8bWOebmpsibFC29J0z73skMkr8', gid: '1494733568' }
    ];

    async function syncLiveGoogleSheetsInBrowser() {
      const indicator = document.getElementById('live-indicator');
      try {
        if (indicator) indicator.innerHTML = '<span class="pulse-dot yellow"></span> Live Polling Google Sheets...';
        
        const allFetched = [];
        for (const src of GOOGLE_SHEET_SOURCES) {
          const url = \`https://docs.google.com/spreadsheets/d/\${src.id}/export?format=csv&gid=\${src.gid}\`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const csvText = await res.text();
          const matrix = parseCsvSimpleBrowser(csvText);
          if (matrix.length < 2) continue;

          const header = matrix[0].map(h => (h || '').toString().toLowerCase().trim());
          let siteIdIdx = header.findIndex(h => h.includes('site id') || h.includes('siteid') || h.includes('lsi'));
          if (siteIdIdx === -1) siteIdIdx = 0;

          let siteNameIdx = header.findIndex(h => h.includes('site name') || h.includes('sitename') || h.includes('customer name') || h.includes('bts/customer name'));
          if (siteNameIdx === -1) siteNameIdx = 1;

          let projIdx = header.findIndex(h => h.includes('project') || h.includes('site scope'));
          let actIdx = header.findIndex(h => h === 'activity' || h.includes('activity name') || h.includes('activity') || h.includes('delivery track') || h.includes('site scope'));
          let assignedDateIdx = header.findIndex(h => h.includes('loading date') || h.includes('assigned') || h.includes('receive date') || h.includes('activity receive'));
          let completedDateIdx = header.findIndex(h => h.includes('complete date') || h.includes('completed date') || h.includes('activity done date') || h.includes('completed'));
          let tatIdx = header.findIndex(h => h.includes('actual tat') || h.includes('pns tat') || (h.includes('tat') && !h.includes('wi tat') && !h.includes('tcl') && !h.includes('remarks')));
          let tclTatIdx = header.findIndex(h => h.includes('tcl standard') || h.includes('wi tat') || h.includes('tcl'));
          let statusIdx = header.findIndex(h => h === 'status' || h.includes('installatio wip') || h.includes('wip'));
          let woStatusIdx = header.findIndex(h => h.includes('work order status') || h.includes('work order (wo)') || h.includes('wo status'));
          let remarksIdx = header.findIndex(h => h.includes('remark'));
          let stateIdx = header.findIndex(h => h.includes('state') || h.includes('circle'));

          for (let i = 1; i < matrix.length; i++) {
            const row = matrix[i];
            if (!row || row.length === 0) continue;
            const siteId = (row[siteIdIdx] || '').trim();
            const siteName = (row[siteNameIdx] || '').trim();
            if (!siteId && !siteName) continue;

            const tatVal = tatIdx !== -1 && row[tatIdx] ? parseFloat(row[tatIdx]) : NaN;
            const tclVal = tclTatIdx !== -1 && row[tclTatIdx] ? parseFloat(row[tclTatIdx]) : 5;
            const rawStatus = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : 'Completed';
            const rawWoStatus = woStatusIdx !== -1 && row[woStatusIdx] ? row[woStatusIdx].trim() : '';
            const compDate = completedDateIdx !== -1 ? parseDateStrBrowser(row[completedDateIdx]) : '';

            allFetched.push({
              siteId: siteId || \`\${src.name.substring(0,3).toUpperCase()}_SITE_\${i}\`,
              siteName: siteName || \`Site #\${i}\`,
              project: projIdx !== -1 && row[projIdx] ? row[projIdx].trim() : \`\${src.name} Project\`,
              activity: actIdx !== -1 && row[actIdx] ? row[actIdx].trim() : 'Survey & Installation',
              assignedDate: assignedDateIdx !== -1 ? parseDateStrBrowser(row[assignedDateIdx]) : '2025-07-01',
              permDate: '',
              completedDate: compDate,
              tat: !isNaN(tatVal) ? tatVal : 2,
              tclTat: !isNaN(tclVal) ? tclVal : 5,
              status: rawStatus,
              rawStatus: rawStatus,
              rawWoStatus: rawWoStatus,
              remarks: remarksIdx !== -1 && row[remarksIdx] ? row[remarksIdx].trim() : 'Standard Operation',
              state: stateIdx !== -1 && row[stateIdx] ? row[stateIdx].trim() : 'East',
              region: 'East',
              vendor: src.name
            });
          }
        }

        if (allFetched.length > 0) {
          rebuildDatabaseFromRecords(allFetched);
          updateDashboard();
          if (typeof renderWoDashboard === 'function') renderWoDashboard();
          if (indicator) indicator.innerHTML = \`<span class="pulse-dot green"></span> Live Sheets Connected (\${allFetched.length.toLocaleString()} Sites)\`;
        }
      } catch (err) {
        console.warn('Browser Google Sheets live polling notice:', err);
      }
    }

    function parseCsvSimpleBrowser(text) {
      const lines = text.split(/\\r?\\n/).filter(l => l.trim());
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

    function parseDateStrBrowser(val) {
      if (!val) return '';
      val = val.toString().trim();
      if (/^\\d{4}-\\d{2}-\\d{2}/.test(val)) return val.substring(0, 10);
      if (/^\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}/.test(val)) {
        const parts = val.split(/[\\/\\-]/);
        if (parts.length === 3) {
          let y = parts[2];
          if (y.length === 2) y = '20' + y;
          let m = parts[1].padStart(2, '0');
          let d = parts[0].padStart(2, '0');
          return \`\${y}-\${m}-\${d}\`;
        }
      }
      return val;
    }

    // Auto-sync live Google Sheets every 15 seconds in client browser
    setInterval(syncLiveGoogleSheetsInBrowser, 15000);
`;

// Replace existing WO engine code block in index.html
const startMarker = '// WORK ORDER (WO) PICTORIAL DASHBOARD & INTERACTIVE ENGINE';
const altStartMarker = '// WORK ORDER (WO) DASHBOARD ENGINE';
const endMarker = 'function renderTable()';

let startIdx = html.indexOf(startMarker);
if (startIdx === -1) startIdx = html.indexOf(altStartMarker);

const endIdx = html.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  html = html.substring(0, startIdx) + jsEngineCode.trim() + '\n\n    ' + html.substring(endIdx);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('✅ Successfully updated index.html with interactive pictorial WO dashboard engine and 15s browser poller!');
} else {
  console.error('❌ Could not locate JS markers in index.html');
}
