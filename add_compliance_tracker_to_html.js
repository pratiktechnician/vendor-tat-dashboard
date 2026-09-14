const fs = require('fs');

const teamsData = JSON.parse(fs.readFileSync('teams_compliance.json', 'utf8'));
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add CSS for Audit Compliance section
const css = `
    /* COMPLIANCE AUDIT SECTION STYLES */
    .compliance-section {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      margin-top: 32px;
      margin-bottom: 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    .compliance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .compliance-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .compliance-filter-btn {
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .compliance-filter-btn:hover, .compliance-filter-btn.active {
      background: #6366f1;
      color: #fff;
      border-color: #6366f1;
    }
    .compliance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .compliance-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .compliance-card.updating {
      border-left: 4px solid #10b981;
    }
    .compliance-card.delayed {
      border-left: 4px solid #f43f5e;
      background: rgba(244, 63, 94, 0.05);
    }
    .compliance-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
      font-size: 1.1rem;
      flex-shrink: 0;
    }
    .compliance-card.delayed .compliance-avatar {
      background: linear-gradient(135deg, #f43f5e, #e11d48);
    }
    .compliance-info {
      flex-grow: 1;
    }
    .compliance-name {
      font-weight: 700;
      color: #fff;
      font-size: 0.95rem;
      margin-bottom: 2px;
    }
    .compliance-meta {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .compliance-badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-updating { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-delayed { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); }
`;

if (!html.includes('COMPLIANCE AUDIT SECTION STYLES')) {
  html = html.replace('</style>', `${css}\n  </style>`);
}

// 2. Add header audit navigation button
const auditHeaderBtn = `
      <button class="compliance-filter-btn active" onclick="scrollToAuditSection()" style="margin-left:auto; display:flex; align-items:center; gap:6px; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#fff; border:none; padding:8px 16px; border-radius:8px;">
        🔍 Check Who Is Updating Sheet
      </button>
`;

if (!html.includes('scrollToAuditSection()')) {
  html = html.replace('</div>\n    </div>\n\n    <!-- KPI CARDS -->', `${auditHeaderBtn}\n    </div>\n    </div>\n\n    <!-- KPI CARDS -->`);
}

// 3. Inject full Compliance Audit HTML section
const auditSectionHtml = `
    <!-- VENDOR & FIELD TEAM UPDATE AUDIT TRACKER -->
    <div class="compliance-section" id="audit-tracker-section">
      <div class="compliance-header">
        <div>
          <div class="compliance-title">
            <span>📋 Sheet Update Compliance Tracker (Who is Updating vs Not Updating)</span>
          </div>
          <div style="font-size:0.85rem; color:#94a3b8; margin-top:4px;">
            Audit of active field engineers (FEs), teams, and vendor sheet maintenance activity
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="compliance-filter-btn active" id="btn-comp-all" onclick="filterCompliance('ALL')">All Teams (${teamsData.length})</button>
          <button class="compliance-filter-btn" id="btn-comp-updating" onclick="filterCompliance('UPDATING')">🟢 Updating Daily (${teamsData.filter(t => t.status.includes('Updating')).length})</button>
          <button class="compliance-filter-btn" id="btn-comp-delayed" onclick="filterCompliance('DELAYED')">🔴 Not Updating / Delayed (${teamsData.filter(t => !t.status.includes('Updating')).length})</button>
        </div>
      </div>

      <!-- AUDIT SUMMARY BANNER -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:20px;">
        <div style="background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16, 185, 129, 0.2); padding:12px; border-radius:10px;">
          <div style="font-size:0.75rem; color:#10b981; font-weight:700; text-transform:uppercase;">Active Vendors</div>
          <div style="font-size:1.3rem; font-weight:800; color:#fff; margin-top:4px;">3 Vendors (PNS, Saesha, Malfonic)</div>
          <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">Regular Daily Excel Uploads</div>
        </div>
        <div style="background:rgba(244, 63, 94, 0.1); border:1px solid rgba(244, 63, 94, 0.2); padding:12px; border-radius:10px;">
          <div style="font-size:0.75rem; color:#f43f5e; font-weight:700; text-transform:uppercase;">Delayed Vendors</div>
          <div style="font-size:1.3rem; font-weight:800; color:#fff; margin-top:4px;">1 Vendor (RIPL)</div>
          <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">Pending Daily Progress Updates</div>
        </div>
        <div style="background:rgba(99, 102, 241, 0.1); border:1px solid rgba(99, 102, 241, 0.2); padding:12px; border-radius:10px;">
          <div style="font-size:0.75rem; color:#6366f1; font-weight:700; text-transform:uppercase;">Active FE/Tech Count</div>
          <div style="font-size:1.3rem; font-weight:800; color:#fff; margin-top:4px;">30 Field Engineers</div>
          <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">Actively Submitting Surveys</div>
        </div>
      </div>

      <div class="compliance-grid" id="compliance-grid-container">
        <!-- Rendered via JS -->
      </div>
    </div>
`;

if (!html.includes('id="audit-tracker-section"')) {
  html = html.replace('<div class="audit-box">', `${auditSectionHtml}\n    <div class="audit-box">`);
}

// 4. Inject JS logic for compliance rendering & smooth scrolling
const jsLogic = `
    const teamsComplianceData = ${JSON.stringify(teamsData)};
    let currentCompFilter = 'ALL';

    function scrollToAuditSection() {
      const el = document.getElementById('audit-tracker-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    function filterCompliance(type) {
      currentCompFilter = type;
      document.querySelectorAll('#audit-tracker-section .compliance-filter-btn').forEach(btn => btn.classList.remove('active'));
      if (type === 'ALL') document.getElementById('btn-comp-all').classList.add('active');
      if (type === 'UPDATING') document.getElementById('btn-comp-updating').classList.add('active');
      if (type === 'DELAYED') document.getElementById('btn-comp-delayed').classList.add('active');
      renderComplianceGrid();
    }

    function renderComplianceGrid() {
      const container = document.getElementById('compliance-grid-container');
      if (!container) return;

      const filtered = teamsComplianceData.filter(t => {
        const isUpdating = t.status.includes('Updating');
        if (currentCompFilter === 'UPDATING') return isUpdating;
        if (currentCompFilter === 'DELAYED') return !isUpdating;
        return true;
      });

      container.innerHTML = filtered.map(t => {
        const isUpdating = t.status.includes('Updating');
        return \`
          <div class="compliance-card \${isUpdating ? 'updating' : 'delayed'}">
            <div class="compliance-avatar">\${t.name.charAt(0)}</div>
            <div class="compliance-info">
              <div class="compliance-name">\${t.name}</div>
              <div class="compliance-meta"><strong>\${t.vendor}</strong> &bull; \${t.role}</div>
              <div class="compliance-meta" style="margin-top:2px; color:#cbd5e1;">📍 \${t.location} | \${t.recordsLogged}</div>
            </div>
            <div>
              <span class="compliance-badge \${isUpdating ? 'badge-updating' : 'badge-delayed'}">
                \${isUpdating ? '🟢 Updating Daily' : '🔴 Delayed'}
              </span>
            </div>
          </div>
        \`;
      }).join('');
    }
`;

if (!html.includes('const teamsComplianceData =')) {
  html = html.replace('function updateDashboard() {', `${jsLogic}\n    function updateDashboard() {`);
}

// 5. Trigger renderComplianceGrid inside initDashboardApp
if (!html.includes('renderComplianceGrid()')) {
  html = html.replace('updateDashboard();', 'updateDashboard();\n        renderComplianceGrid();');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully injected Sheet Update Compliance Tracker into index.html!');
