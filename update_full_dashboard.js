const fs = require('fs');

// Read current index.html
let html = fs.readFileSync('index.html', 'utf8');

// 1. Ensure chartVendorUpdateStatus is a stacked bar chart of FEs per vendor
if (html.includes("labels: ['🟢 Updated Today (3 Vendors)', '🔴 Update Delayed (1 Vendor)']")) {
  const oldChart = `chartVendorUpdateStatus = new Chart(ctxStatus, {
          type: 'doughnut',
          data: {
            labels: ['🟢 Updated Today (3 Vendors)', '🔴 Update Delayed (1 Vendor)'],
            datasets: [{
              data: [3, 1],
              backgroundColor: ['#10b981', '#f43f5e'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } }
          }
        });`;

  const newChart = `chartVendorUpdateStatus = new Chart(ctxStatus, {
          type: 'bar',
          data: {
            labels: ['Saesha Power', 'PNS Telecom', 'Malfonic', 'RIPL'],
            datasets: [
              {
                label: '🟢 Updating Daily (FEs)',
                data: [9, 7, 7, 5],
                backgroundColor: '#10b981',
                borderRadius: 6
              },
              {
                label: '🔴 Not Updating / Delayed (FEs)',
                data: [0, 0, 0, 11],
                backgroundColor: '#f43f5e',
                borderRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11, family: 'Plus Jakarta Sans' } } },
              tooltip: { mode: 'index', intersect: false }
            },
            scales: {
              x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { stacked: true, ticks: { color: '#94a3b8', stepSize: 2 }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        });`;

  html = html.replace(oldChart, newChart);
}

// 2. Insert compliance helper functions into index.html script tag
const complianceFuncs = `
    let currentCompFilter = 'ALL';

    function filterCompliance(filterType) {
      currentCompFilter = filterType;
      const btnAll = document.getElementById('btn-comp-all');
      const btnUp = document.getElementById('btn-comp-updating');
      const btnDel = document.getElementById('btn-comp-delayed');

      if (btnAll) {
        btnAll.style.background = filterType === 'ALL' ? '#6366f1' : 'rgba(99, 102, 241, 0.1)';
        btnAll.style.borderColor = filterType === 'ALL' ? '#6366f1' : 'rgba(99, 102, 241, 0.3)';
        btnAll.style.color = filterType === 'ALL' ? '#fff' : '#a5b4fc';
      }
      if (btnUp) {
        btnUp.style.background = filterType === 'UPDATING' ? '#10b981' : 'rgba(16, 185, 129, 0.1)';
        btnUp.style.borderColor = filterType === 'UPDATING' ? '#10b981' : 'rgba(16, 185, 129, 0.3)';
        btnUp.style.color = filterType === 'UPDATING' ? '#fff' : '#34d399';
      }
      if (btnDel) {
        btnDel.style.background = filterType === 'DELAYED' ? '#f43f5e' : 'rgba(244, 63, 94, 0.1)';
        btnDel.style.borderColor = filterType === 'DELAYED' ? '#f43f5e' : 'rgba(244, 63, 94, 0.3)';
        btnDel.style.color = filterType === 'DELAYED' ? '#fff' : '#f43f5e';
      }
      filterComplianceRoster();
    }

    function filterComplianceRoster() {
      const container = document.getElementById('compliance-grid-container');
      if (!container) return;

      const search = (document.getElementById('comp-team-search')?.value || '').toLowerCase();
      const vendorVal = document.getElementById('comp-vendor-filter')?.value || 'ALL';

      let list = (database && database.all && database.all.team) ? database.all.team : [];

      if (currentCompFilter === 'UPDATING') {
        list = list.filter(t => (t.status || '').includes('Updating Daily'));
      } else if (currentCompFilter === 'DELAYED') {
        list = list.filter(t => !(t.status || '').includes('Updating Daily'));
      }

      if (vendorVal !== 'ALL') {
        list = list.filter(t => (t.vendor || '').toLowerCase().includes(vendorVal.toLowerCase()));
      }

      if (search) {
        list = list.filter(t => 
          (t.name || '').toLowerCase().includes(search) ||
          (t.role || '').toLowerCase().includes(search) ||
          (t.location || t.loc || '').toLowerCase().includes(search) ||
          (t.vendor || '').toLowerCase().includes(search)
        );
      }

      const badge = document.getElementById('comp-roster-count-badge');
      if (badge) badge.innerText = 'Showing ' + list.length + ' Personnel';

      if (!list || list.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:20px; grid-column: 1 / -1; text-align:center;">No personnel found matching selected criteria.</div>';
        return;
      }

      const vendorBadges = {
        'PNS Telecom': { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
        'Saesha Power': { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
        'RIPL': { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
        'Malfonic': { bg: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' }
      };

      container.innerHTML = list.map(t => {
        const vMeta = vendorBadges[t.vendor] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
        const isDaily = (t.status || '').includes('Updating Daily');
        const statusBorder = isDaily ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)';
        const statusColor = isDaily ? '#34d399' : '#f43f5e';
        const icon = isDaily ? '🟢' : '🔴';

        return '<div class="team-card" style="background:rgba(255,255,255,0.03); border:1px solid ' + statusBorder + '; padding:14px 16px; border-radius:12px; display:flex; align-items:center; gap:12px; transition:transform 0.2s ease;">' +
          '<div class="avatar" style="width:40px; height:40px; border-radius:50%; background:' + (isDaily ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #be123c)') + '; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-size:1rem; flex-shrink:0;">' + (t.name || 'T').charAt(0) + '</div>' +
          '<div class="team-info" style="flex:1; overflow:hidden;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">' +
              '<h5 style="margin:0; font-size:0.9rem; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + t.name + '</h5>' +
              '<span style="background:' + vMeta.bg + '; color:' + vMeta.color + '; border:1px solid ' + vMeta.border + '; font-size:0.65rem; padding:2px 6px; border-radius:8px; font-weight:600; flex-shrink:0;">' + (t.vendor || 'Vendor') + '</span>' +
            '</div>' +
            '<p style="margin:3px 0 0 0; font-size:0.75rem; color:var(--text-muted);">' + (t.role || 'Field Engineer') + ' &bull; ' + (t.location || t.loc || 'Circle') + '</p>' +
            '<div style="font-size:0.7rem; color:' + statusColor + '; margin-top:4px; font-weight:600;">' + icon + ' ' + (t.status || 'Active Daily Updates') + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function renderVendorSheetCards() {
      const container = document.getElementById('vendor-sheet-cards-container');
      if (!container) return;

      const countMap = { 'Saesha Power': 737, 'PNS Telecom': 283, 'Malfonic': 136, 'RIPL': 149 };

      const cardsHtml = VENDOR_SHEET_DEFAULTS.map(s => {
        const isLive = s.status === 'UPDATING';
        const badgeBg = isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
        const badgeBorder = isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)';
        const badgeColor = isLive ? '#34d399' : '#f43f5e';
        const fillBg = isLive ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f43f5e, #fb7185)';
        const recordCount = countMap[s.name] || 0;

        return '<div class="vendor-sheet-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 18px; border-radius: 14px; display: flex; flex-direction: column; justify-content: space-between;">' +
          '<div>' +
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">' +
              '<div style="font-size: 1.05rem; font-weight: 700; color: #fff;">' + s.name + '</div>' +
              '<span style="background: ' + badgeBg + '; border: 1px solid ' + badgeBorder + '; color: ' + badgeColor + '; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 10px;">' + s.statusLabel + '</span>' +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px;">' +
              '<div style="font-size: 1.4rem; font-weight: 800; color: #fff;">' + recordCount + ' <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">Live Sites</span></div>' +
              '<div style="font-size: 0.85rem; font-weight: 700; color: ' + badgeColor + ';">' + s.complianceScore + '% Score</div>' +
            '</div>' +
            '<div class="sheet-progress-bg" style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin: 8px 0 10px 0;">' +
              '<div class="sheet-progress-fill" style="width: ' + s.complianceScore + '%; height: 100%; background: ' + fillBg + '; border-radius: 3px;"></div>' +
            '</div>' +
            '<div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 14px;">' + s.lastUpdate + '</div>' +
          '</div>' +
          '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer" class="sheet-link-btn" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; color: #fff; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); text-decoration: none; transition: all 0.2s;">' +
            '<span>🔗 Open Live ' + s.name + ' Google Sheet</span>' +
          '</a>' +
        '</div>';
      }).join('');

      container.innerHTML = cardsHtml;
    }
`;

if (!html.includes('filterComplianceRoster()')) {
  html = html.replace('function initDashboardApp() {', `${complianceFuncs}\n    function initDashboardApp() {`);
}

if (!html.includes('renderVendorSheetCards();')) {
  html = html.replace('initCharts();', 'initCharts();\n      renderVendorSheetCards();\n      filterComplianceRoster();');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with compliance helper functions and charts.');
