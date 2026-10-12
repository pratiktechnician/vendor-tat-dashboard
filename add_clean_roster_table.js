const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Update PNS gid in VENDOR_SHEET_DEFAULTS to 752737059
html = html.replace(/gid:\s*'723949951'/g, "gid: '752737059'");
html = html.replace(/gid=723949951/g, "gid=752737059");

// 2. Enhance filterTeamByVendor to render a clean table or cards with zero extra spaces and clean boxes
const updatedFilterTeamByVendor = `
    let teamViewMode = 'table'; // 'table' or 'cards'

    function setTeamViewMode(mode) {
      teamViewMode = mode;
      const btnTable = document.getElementById('btn-team-view-table');
      const btnCards = document.getElementById('btn-team-view-cards');
      if (btnTable) {
        btnTable.style.background = mode === 'table' ? '#6366f1' : 'rgba(255,255,255,0.06)';
        btnTable.style.color = mode === 'table' ? '#fff' : '#94a3b8';
      }
      if (btnCards) {
        btnCards.style.background = mode === 'cards' ? '#6366f1' : 'rgba(255,255,255,0.06)';
        btnCards.style.color = mode === 'cards' ? '#fff' : '#94a3b8';
      }
      const vendorSelect = document.getElementById('team-vendor-filter');
      filterTeamByVendor(vendorSelect ? vendorSelect.value : 'all');
    }

    function filterTeamByVendor(vendorVal) {
      const teamContainer = document.getElementById('team-container');
      if (!teamContainer) return;

      let teamList = [];
      if (vendorVal === 'all' || vendorVal === 'historical') {
        teamList = (database && database.all && database.all.team) ? database.all.team : [];
      } else if (database && database[vendorVal] && database[vendorVal].team) {
        teamList = database[vendorVal].team;
      } else if (database && database.all && database.all.team) {
        teamList = database.all.team.filter(t => (t.vendor || '').toLowerCase().includes(vendorVal.toLowerCase()));
      }

      // Filter out any dummy headers or empty items
      teamList = teamList.filter(t => t.name && t.name !== 'FE Name' && t.name !== 'Name');

      if (!teamList || teamList.length === 0) {
        teamContainer.innerHTML = '<div style="color:var(--text-muted); padding:20px; text-align:center;">No personnel records found for selected vendor.</div>';
        return;
      }

      const vendorBadges = {
        'PNS Telecom': { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
        'Saesha Power': { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
        'RIPL': { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
        'Malfonic': { bg: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' }
      };

      if (teamViewMode === 'table') {
        const rowsHtml = teamList.map((t, idx) => {
          const vMeta = vendorBadges[t.vendor] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
          const isDaily = (t.status || '').includes('Updating Daily') || (t.missedDays === 0);
          const missedDays = t.missedDays !== undefined ? t.missedDays : (isDaily ? 0 : 3);
          const statusBadge = isDaily 
            ? '<span style=\"background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); font-size:0.7rem; font-weight:700; padding:3px 10px; border-radius:12px; display:inline-block;\">🟢 0 Days Missed (Active)</span>'
            : '<span style=\"background:rgba(244,63,94,0.15); color:#f43f5e; border:1px solid rgba(244,63,94,0.3); font-size:0.7rem; font-weight:700; padding:3px 10px; border-radius:12px; display:inline-block;\">🔴 ' + missedDays + ' Days Missed (Pending)</span>';

          const loc = (t.location || 'East').trim();
          const city = (t.city || t.location || 'Patna').trim();
          const name = t.name.trim();
          const role = (t.role || 'Field Engineer').trim();

          return '<tr style=\"border-bottom: 1px solid rgba(255,255,255,0.06); transition: background 0.15s ease;\">' +
            '<td style=\"padding: 12px 14px; font-weight: 600; color: #fff;\">' + (idx + 1) + '</td>' +
            '<td style=\"padding: 12px 14px; font-weight: 700; color: #38bdf8;\">' + loc + '</td>' +
            '<td style=\"padding: 12px 14px; font-weight: 600; color: #fff;\">' + name + '</td>' +
            '<td style=\"padding: 12px 14px; color: #e2e8f0;\">' + city + '</td>' +
            '<td style=\"padding: 12px 14px; color: #94a3b8; font-size: 0.8rem;\">' + role + '</td>' +
            '<td style=\"padding: 12px 14px;\"><span style=\"background:' + vMeta.bg + '; color:' + vMeta.color + '; border:1px solid ' + vMeta.border + '; font-size:0.7rem; padding:3px 8px; border-radius:8px; font-weight:600;\">' + (t.vendor || 'Vendor') + '</span></td>' +
            '<td style=\"padding: 12px 14px;\">' + statusBadge + '</td>' +
          '</tr>';
        }).join('');

        teamContainer.innerHTML = '<div style=\"overflow-x: auto; width: 100%; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(15,23,42,0.6);\">' +
          '<table style=\"width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem;\">' +
            '<thead>' +
              '<tr style=\"background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.1); color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;\">' +
                '<th style=\"padding: 12px 14px;\">#</th>' +
                '<th style=\"padding: 12px 14px;\">Location (Circle)</th>' +
                '<th style=\"padding: 12px 14px;\">FE Name</th>' +
                '<th style=\"padding: 12px 14px;\">City / Base</th>' +
                '<th style=\"padding: 12px 14px;\">Designation</th>' +
                '<th style=\"padding: 12px 14px;\">Vendor Partner</th>' +
                '<th style=\"padding: 12px 14px;\">Daily Update & Missed Days</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>';
      } else {
        teamContainer.innerHTML = teamList.map(t => {
          const vMeta = vendorBadges[t.vendor] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
          const isDaily = (t.status || '').includes('Updating Daily') || (t.missedDays === 0);
          const missedDays = t.missedDays !== undefined ? t.missedDays : (isDaily ? 0 : 3);
          const statusBorder = isDaily ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)';
          const statusColor = isDaily ? '#34d399' : '#f43f5e';
          const icon = isDaily ? '🟢' : '🔴';

          return '<div class=\"team-card\" style=\"background:rgba(255,255,255,0.03); border:1px solid ' + statusBorder + '; padding:16px; border-radius:12px; display:flex; align-items:center; gap:14px; transition:transform 0.2s ease;\">' +
            '<div class=\"avatar\" style=\"width:42px; height:42px; border-radius:50%; background:' + (isDaily ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #be123c)') + '; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-size:1.1rem; flex-shrink:0;\">' + (t.name || 'T').charAt(0) + '</div>' +
            '<div class=\"team-info\" style=\"flex:1; overflow:hidden;\">' +
              '<div style=\"display:flex; justify-content:space-between; align-items:center; gap:6px;\">' +
                '<h5 style=\"margin:0; font-size:0.92rem; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;\">' + t.name.trim() + '</h5>' +
                '<span style=\"background:' + vMeta.bg + '; color:' + vMeta.color + '; border:1px solid ' + vMeta.border + '; font-size:0.65rem; padding:2px 8px; border-radius:10px; font-weight:600; flex-shrink:0;\">' + (t.vendor || 'Vendor') + '</span>' +
              '</div>' +
              '<p style=\"margin:3px 0 0 0; font-size:0.75rem; color:var(--text-muted);\">' + (t.role || 'Field Engineer').trim() + ' &bull; ' + (t.location || 'East').trim() + '</p>' +
              '<div style=\"font-size:0.7rem; color:' + statusColor + '; margin-top:4px; font-weight:600;\">' + icon + ' ' + (isDaily ? '0 Days Missed (Active)' : missedDays + ' Days Missed (Pending)') + '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }
`;

// Replace filterTeamByVendor in index.html
html = html.replace(/function filterTeamByVendor\(vendorVal\)[\s\S]*?\}\s*\n/g, updatedFilterTeamByVendor.trim() + '\n\n');

// 3. Update the Field Staff card header to include Table View and Cards View buttons
const updatedTeamCardHeaderSnippet = `
        <!-- Vendor Roster Filter Dropdown & View Mode Buttons -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <div style="display: flex; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 2px;">
            <button id="btn-team-view-table" onclick="setTeamViewMode('table')" style="background: #6366f1; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; cursor: pointer; font-weight: 600;">📋 Table View</button>
            <button id="btn-team-view-cards" onclick="setTeamViewMode('cards')" style="background: transparent; color: #94a3b8; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; cursor: pointer; font-weight: 600;">🎴 Cards View</button>
          </div>
          <select id="team-vendor-filter" onchange="filterTeamByVendor(this.value)" style="background:#0d1117; border:1px solid #30363d; color:#e2e8f0; padding:6px 12px; border-radius:8px; font-size:0.78rem; cursor:pointer; font-weight:600;">
            <option value="all">🏢 All Vendors (39 Personnel)</option>
            <option value="PNS Telecom" selected>📡 PNS Telecom (7 Personnel)</option>
            <option value="Saesha Power">⚡ Saesha Power (9 Personnel)</option>
            <option value="RIPL">🔧 RIPL (16 Personnel)</option>
            <option value="Malfonic">📶 Malfonic (7 Personnel)</option>
          </select>
        </div>
`;

html = html.replace(/<div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">[\s\S]*?<select id="team-vendor-filter"[\s\S]*?<\/select>\s*<\/div>/, updatedTeamCardHeaderSnippet.trim());

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with clean Roster Table View (zero extra spaces, clean boxes)!');
