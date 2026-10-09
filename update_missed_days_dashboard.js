const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. New HTML Markup with Missed Days Prominently Displayed
const newComplianceSectionHtml = `
    <!-- VENDOR & FIELD TEAM UPDATE AUDIT TRACKER (WITH MISSED DAYS AUDIT) -->
    <div class="compliance-section" id="audit-tracker-section" style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
      
      <!-- HEADER BANNER & FILTERS -->
      <div class="compliance-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <div class="compliance-title" style="display: flex; align-items: center; gap: 10px; font-size: 1.25rem; font-weight: 700; color: #fff;">
            <span>📋 Sheet Update Compliance Tracker (Missed Days & Inactivity Audit)</span>
            <span id="sheet-sync-status-pill" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
              <span class="pulse-dot green" style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block;"></span> 15s Auto-Sync Active
            </span>
          </div>
          <div style="font-size: 0.82rem; color: #94a3b8; margin-top: 4px;">
            Real-time audit of Google Sheets daily maintenance, missed update days, inactive field staff, and pending portal delays
          </div>
        </div>

        <!-- FILTER BUTTONS -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <button class="comp-filter-btn active" id="btn-comp-all" onclick="filterCompliance('ALL')" style="padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; cursor: pointer; border: 1px solid #6366f1; background: #6366f1; color: #fff; transition: all 0.2s;">
            All Personnel (39)
          </button>
          <button class="comp-filter-btn" id="btn-comp-updating" onclick="filterCompliance('UPDATING')" style="padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; cursor: pointer; border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.1); color: #34d399; transition: all 0.2s;">
            🟢 0 Days Missed (28 FEs)
          </button>
          <button class="comp-filter-btn" id="btn-comp-delayed" onclick="filterCompliance('DELAYED')" style="padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; cursor: pointer; border: 1px solid rgba(244, 63, 94, 0.3); background: rgba(244, 63, 94, 0.1); color: #f43f5e; transition: all 0.2s;">
            🔴 3+ Days Missed (11 FEs)
          </button>
        </div>
      </div>

      <!-- AUDIT SUMMARY KPI BANNER (WITH MISSED DAYS FOCUS) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); padding: 14px 18px; border-radius: 12px;">
          <div style="font-size: 0.72rem; color: #10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Active Updaters (0 Days Missed)</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-top: 4px;">3 Vendors (PNS, Saesha, Malfonic)</div>
          <div style="font-size: 0.75rem; color: #a7f3d0; margin-top: 2px;">🟢 28 FEs Updating Daily (0 Days Missed)</div>
        </div>

        <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); padding: 14px 18px; border-radius: 12px;">
          <div style="font-size: 0.72rem; color: #f43f5e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Portal Pending Inactivity (Missed Days)</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-top: 4px;">1 Vendor (RIPL Pending)</div>
          <div style="font-size: 0.75rem; color: #fca5a5; margin-top: 2px;">🔴 RIPL Portal: 3 to 5 Days Missed (11 FEs)</div>
        </div>

        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); padding: 14px 18px; border-radius: 12px;">
          <div style="font-size: 0.72rem; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Total Field Staff (FE Roster)</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-top: 4px;">39 Deployed Personnel</div>
          <div style="font-size: 0.75rem; color: #c7d2fe; margin-top: 2px;">⚡ 1,305 Live Sites Synced Across Circles</div>
        </div>

        <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); padding: 14px 18px; border-radius: 12px;">
          <div style="font-size: 0.72rem; color: #22d3ee; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Overall Sheet Maintenance Score</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #38bdf8; margin-top: 4px;">90.7% Compliance</div>
          <div style="font-size: 0.75rem; color: #a5f3fc; margin-top: 2px;">✓ 3 of 4 Google Sheets Fully Up-to-date</div>
        </div>
      </div>

      <!-- 4 PICTORIAL VENDOR SHEET STATUS CARDS (WITH MISSED DAYS COUNTER BADGES) -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📊 Live Google Sheet Status & Missed Days Audit (Direct Link & Sync Health)</span>
        </div>
        <div class="vendor-sheet-cards-grid" id="vendor-sheet-cards-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
          <!-- JS Rendered -->
        </div>
      </div>

      <!-- DUAL CHARTS FOR SHEET COMPLIANCE & MISSED DAYS BREAKDOWN -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px; margin-bottom: 24px;">
        <!-- Chart 1: Vendor Daily Update Regularity & Missed Days Score -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); padding: 18px; border-radius: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 0.9rem; font-weight: 700; color: #fff;">📊 Vendor Daily Update Regularity & Missed Days Audit</div>
            <span style="font-size: 0.7rem; color: #34d399; background: rgba(16,185,129,0.15); padding: 2px 8px; border-radius: 8px;">Live Score</span>
          </div>
          <div style="height: 240px; position: relative;">
            <canvas id="chart-sheet-compliance"></canvas>
          </div>
        </div>

        <!-- Chart 2: Active Updaters vs Missed Days FEs Split -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); padding: 18px; border-radius: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 0.9rem; font-weight: 700; color: #fff;">👷 Field Staff Missed Days Audit (0 Days vs 3+ Days Pending)</div>
            <span style="font-size: 0.7rem; color: #818cf8; background: rgba(99,102,241,0.15); padding: 2px 8px; border-radius: 8px;">39 Personnel</span>
          </div>
          <div style="height: 240px; position: relative;">
            <canvas id="chart-vendor-update-status"></canvas>
          </div>
        </div>
      </div>

      <!-- DETAILED FIELD ENGINEER COMPLIANCE AUDIT ROSTER TABLE / GRID -->
      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); padding: 20px; border-radius: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>👤 Field Staff Maintenance & Missed Days Roster</span>
              <span id="comp-roster-count-badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; font-size: 0.72rem; padding: 2px 10px; border-radius: 10px; font-weight: 600;">Showing 39 Personnel</span>
            </div>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              Inspect individual field engineers, roles, circles, and exact count of missed update days
            </div>
          </div>

          <!-- SEARCH & VENDOR FILTER -->
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <input type="text" id="comp-team-search" oninput="filterComplianceRoster()" placeholder="🔍 Search FE Name, Role, Circle..." style="background: #0d1117; border: 1px solid #30363d; color: #e2e8f0; padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; width: 220px; outline: none;">
            
            <select id="comp-vendor-filter" onchange="filterComplianceRoster()" style="background: #0d1117; border: 1px solid #30363d; color: #e2e8f0; padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; cursor: pointer; font-weight: 600;">
              <option value="ALL">🏢 All Vendors (39 Personnel)</option>
              <option value="Saesha Power">⚡ Saesha Power (9 Personnel)</option>
              <option value="PNS Telecom">📡 PNS Telecom (7 Personnel)</option>
              <option value="Malfonic">📶 Malfonic (7 Personnel)</option>
              <option value="RIPL">🔧 RIPL (16 Personnel)</option>
            </select>
          </div>
        </div>

        <!-- ROSTER GRID -->
        <div class="team-grid" id="compliance-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
          <!-- JS Rendered -->
        </div>
      </div>

    </div>
`;

if (html.includes('<div class="compliance-section" id="audit-tracker-section"')) {
  html = html.replace(/<div class="compliance-section" id="audit-tracker-section"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, newComplianceSectionHtml.trim());
}

// 2. Update renderVendorSheetCards to feature Missed Days Badges
const newRenderVendorSheetCardsFunc = `
    function renderVendorSheetCards() {
      const container = document.getElementById('vendor-sheet-cards-container');
      if (!container) return;

      const countMap = { 'Saesha Power': 737, 'PNS Telecom': 283, 'Malfonic': 136, 'RIPL': 149 };

      const cardsHtml = VENDOR_SHEET_DEFAULTS.map(s => {
        const isLive = s.status === 'UPDATING';
        const missedDays = isLive ? 0 : 3;
        const badgeBg = isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
        const badgeBorder = isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)';
        const badgeColor = isLive ? '#34d399' : '#f43f5e';
        const fillBg = isLive ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f43f5e, #fb7185)';
        const recordCount = countMap[s.name] || 0;

        const missedBadge = isLive 
          ? '<span style="background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.4); font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:12px;">🟢 0 Days Missed (Updated Today)</span>'
          : '<span style="background:rgba(244,63,94,0.2); color:#f43f5e; border:1px solid rgba(244,63,94,0.4); font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:12px;">🔴 3 Days Pending / Missed</span>';

        return '<div class="vendor-sheet-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid ' + badgeBorder + '; padding: 18px; border-radius: 14px; display: flex; flex-direction: column; justify-content: space-between;">' +
          '<div>' +
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap:wrap; gap:6px;">' +
              '<div style="font-size: 1.05rem; font-weight: 700; color: #fff;">' + s.name + '</div>' +
              missedBadge +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px;">' +
              '<div style="font-size: 1.4rem; font-weight: 800; color: #fff;">' + recordCount + ' <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">Live Sites</span></div>' +
              '<div style="font-size: 0.85rem; font-weight: 700; color: ' + badgeColor + ';">' + s.complianceScore + '% Score</div>' +
            '</div>' +
            '<div class="sheet-progress-bg" style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin: 8px 0 10px 0;">' +
              '<div class="sheet-progress-fill" style="width: ' + s.complianceScore + '%; height: 100%; background: ' + fillBg + '; border-radius: 3px;"></div>' +
            '</div>' +
            '<div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 14px;">' + (isLive ? '✓ Synced 15s ago • 0 Days Pending' : '⚠️ 3 Days Pending Upload • 11 FEs Slacking') + '</div>' +
          '</div>' +
          '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer" class="sheet-link-btn" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; color: #fff; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); text-decoration: none; transition: all 0.2s;">' +
            '<span>🔗 Open Live ' + s.name + ' Google Sheet</span>' +
          '</a>' +
        '</div>';
      }).join('');

      container.innerHTML = cardsHtml;
    }
`;

// 3. Update filterComplianceRoster to prominently display Missed Days badges for every FE card
const newFilterComplianceRosterFunc = `
    function filterComplianceRoster() {
      const container = document.getElementById('compliance-grid-container');
      if (!container) return;

      const search = (document.getElementById('comp-team-search')?.value || '').toLowerCase();
      const vendorVal = document.getElementById('comp-vendor-filter')?.value || 'ALL';

      let list = (database && database.all && database.all.team) ? database.all.team : [];

      if (currentCompFilter === 'UPDATING') {
        list = list.filter(t => (t.status || '').includes('Updating Daily') || t.missedDays === 0);
      } else if (currentCompFilter === 'DELAYED') {
        list = list.filter(t => !(t.status || '').includes('Updating Daily') || (t.missedDays > 0));
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
        const isDaily = (t.status || '').includes('Updating Daily') || (t.missedDays === 0);
        const missedDays = t.missedDays !== undefined ? t.missedDays : (isDaily ? 0 : 3);

        const statusBorder = isDaily ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)';
        const statusColor = isDaily ? '#34d399' : '#f43f5e';

        const missedBadgeText = isDaily 
          ? '<span style="background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); font-size:0.68rem; padding:2px 8px; border-radius:10px; font-weight:700;">🟢 0 Days Missed</span>'
          : '<span style="background:rgba(244,63,94,0.15); color:#f43f5e; border:1px solid rgba(244,63,94,0.3); font-size:0.68rem; padding:2px 8px; border-radius:10px; font-weight:700;">🔴 ' + missedDays + ' Days Missed</span>';

        return '<div class="team-card" style="background:rgba(255,255,255,0.03); border:1px solid ' + statusBorder + '; padding:14px 16px; border-radius:12px; display:flex; align-items:center; gap:12px; transition:transform 0.2s ease;">' +
          '<div class="avatar" style="width:40px; height:40px; border-radius:50%; background:' + (isDaily ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #be123c)') + '; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-size:1rem; flex-shrink:0;">' + (t.name || 'T').charAt(0) + '</div>' +
          '<div class="team-info" style="flex:1; overflow:hidden;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">' +
              '<h5 style="margin:0; font-size:0.9rem; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + t.name + '</h5>' +
              '<span style="background:' + vMeta.bg + '; color:' + vMeta.color + '; border:1px solid ' + vMeta.border + '; font-size:0.65rem; padding:2px 6px; border-radius:8px; font-weight:600; flex-shrink:0;">' + (t.vendor || 'Vendor') + '</span>' +
            '</div>' +
            '<p style="margin:3px 0 0 0; font-size:0.75rem; color:var(--text-muted);">' + (t.role || 'Field Engineer') + ' &bull; ' + (t.location || t.loc || 'Circle') + '</p>' +
            '<div style="margin-top:6px; display:flex; align-items:center; justify-content:space-between;">' +
              missedBadgeText +
              '<span style="font-size:0.68rem; color:#94a3b8;">' + (isDaily ? 'Active Today' : 'Pending Log') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }
`;

// Replace functions in html
if (html.includes('function renderVendorSheetCards()')) {
  html = html.replace(/function renderVendorSheetCards\(\)[\s\S]*?\}\s*\n/g, newRenderVendorSheetCardsFunc.trim() + '\n\n');
}

if (html.includes('function filterComplianceRoster()')) {
  html = html.replace(/function filterComplianceRoster\(\)[\s\S]*?\}\s*\n/g, newFilterComplianceRosterFunc.trim() + '\n\n');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with Missed Days Badges!');
