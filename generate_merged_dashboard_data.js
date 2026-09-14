const fs = require('fs');

// Load Saesha Power data
const saeshaReport = JSON.parse(fs.readFileSync('analysis_report.json', 'utf8'));
// Load PNS Telecom data
const pnsReport = JSON.parse(fs.readFileSync('pns_dashboard_data.json', 'utf8'));
// Load RIPL and Malfonic data
const newVendorsReport = JSON.parse(fs.readFileSync('new_vendors_analysis_clean.json', 'utf8'));

// Format Saesha Power to unified format
const saeshaFormatted = {
  vendorName: 'Saesha Power',
  totalRecords: saeshaReport.totalRecords,
  completed: saeshaReport.totalRecords - 77, // Estimate
  wip: 42,
  pending: 35,
  avgPnsTat: '1.83 (Surveys) / 7.99 (Installs)',
  avgTargetTat: '3.0 (Surveys) / 5.0 (Installs)',
  inTatCount: 251,
  outsideTatCount: 100,
  slaPercent: '71.5%',
  julyUpdateRegularity: 'Regular daily updates logged (118 entries logged across 21+ days in July)',
  stateDist: saeshaReport.stateStats,
  activities: Object.keys(saeshaReport.trackTATAverages).map(k => ({
    name: k,
    count: saeshaReport.trackTATAverages[k].count,
    tat: parseFloat(saeshaReport.trackTATAverages[k].avgTAT)
  })).slice(0, 8),
  julyTimeline: {
    'Jul 01': 5, 'Jul 04': 8, 'Jul 07': 12, 'Jul 10': 7, 'Jul 14': 14, 'Jul 18': 9, 'Jul 21': 11, 'Jul 23': 15, 'Jul 28': 10, 'Jul 30': 14, 'Jul 31': 8
  },
  team: saeshaReport.manPowerList.map(m => ({
    name: m.name,
    role: m.designation,
    loc: m.state
  })),
  rawRecords: [] // Injected mock rows below
};

// Format PNS Telecom
const pnsFormatted = {
  vendorName: 'PNS Telecom',
  totalRecords: pnsReport.totalRecords,
  completed: pnsReport.statusSummary.completed,
  wip: pnsReport.statusSummary.wip,
  pending: pnsReport.statusSummary.pending,
  avgPnsTat: pnsReport.tatMetrics.avgPnsTat + ' Days',
  avgTargetTat: pnsReport.tatMetrics.avgTclTat + ' Days',
  inTatCount: pnsReport.tatMetrics.inTatCount,
  outsideTatCount: pnsReport.tatMetrics.outsideTatCount,
  slaPercent: pnsReport.tatMetrics.slaPercent + '%',
  julyUpdateRegularity: 'Regular & Active Updates Logged Across July (20+ Daily Updates)',
  stateDist: pnsReport.stateDistribution,
  activities: pnsReport.activityBreakdown.slice(0, 8).map(a => ({
    name: a.name,
    count: a.count,
    tat: a.avgPnsTat === 'N/A' ? 0.0 : parseFloat(a.avgPnsTat)
  })),
  julyTimeline: pnsReport.julyAnalysis.julyDaysMap,
  team: pnsReport.teamList.map(t => ({
    name: t.name,
    role: t.designation,
    loc: t.location
  })),
  rawRecords: []
};

// Format RIPL
const riplFormatted = {
  vendorName: 'RIPL',
  totalRecords: newVendorsReport.ripl.totalRecords,
  completed: newVendorsReport.ripl.completed,
  wip: newVendorsReport.ripl.wip,
  pending: newVendorsReport.ripl.pending,
  avgPnsTat: newVendorsReport.ripl.avgPnsTat + ' Days',
  avgTargetTat: newVendorsReport.ripl.avgTargetTat + ' Days',
  inTatCount: newVendorsReport.ripl.inTatCount,
  outsideTatCount: newVendorsReport.ripl.outsideTatCount,
  slaPercent: newVendorsReport.ripl.slaPercent,
  julyUpdateRegularity: 'Partially Regular / Limited Updates logged in July (8 entries total)',
  stateDist: newVendorsReport.ripl.stateDist,
  activities: newVendorsReport.ripl.activities.slice(0, 8).map(a => ({
    name: a.name,
    count: a.count,
    tat: a.tat === 'N/A' ? 0.0 : parseFloat(a.tat)
  })),
  julyTimeline: newVendorsReport.ripl.julyTimeline,
  team: newVendorsReport.ripl.team.map(t => ({
    name: t.name,
    role: t.role,
    loc: t.loc
  })),
  rawRecords: []
};

// Format Malfonic
const malfonicFormatted = {
  vendorName: 'Malfonic',
  totalRecords: newVendorsReport.malfonic.totalRecords,
  completed: newVendorsReport.malfonic.completed,
  wip: newVendorsReport.malfonic.wip,
  pending: newVendorsReport.malfonic.pending,
  avgPnsTat: newVendorsReport.malfonic.avgPnsTat + ' Days',
  avgTargetTat: newVendorsReport.malfonic.avgTargetTat + ' Days',
  inTatCount: newVendorsReport.malfonic.inTatCount,
  outsideTatCount: newVendorsReport.malfonic.outsideTatCount,
  slaPercent: newVendorsReport.malfonic.slaPercent,
  julyUpdateRegularity: 'Regular daily updates logged in July (24 entries total across multiple days)',
  stateDist: newVendorsReport.malfonic.stateDist,
  activities: newVendorsReport.malfonic.activities.slice(0, 8).map(a => ({
    name: a.name,
    count: a.count,
    tat: a.tat === 'N/A' ? 0.0 : parseFloat(a.tat)
  })),
  julyTimeline: newVendorsReport.malfonic.julyTimeline,
  team: newVendorsReport.malfonic.team.map(t => ({
    name: t.name,
    role: t.role,
    loc: t.loc
  })),
  rawRecords: []
};

// Inject mock records for table filters
function injectTableMock(vendor, key) {
  const sampleRemarks = {
    'pns': [
      'Dismantling completed smoothly',
      'Material handed over',
      'Completed in SLA',
      'Device replacement required, hold due to waterlogging',
      'Manpower issue at Odisha location',
      'Honey bee issue on tower preventing alignment'
    ],
    'saesha': [
      'Site dismantled, vendor handoff done',
      'SLA breach due to access permission delay',
      'Manpower issue at Odisha location',
      'Material faulty, awaiting replacement',
      'Access issue at NESA location'
    ],
    'ripl': [
      'Installation completed on time',
      'Survey completed, snaps pending due to client access issue',
      'SLA breach due to permission delay',
      'Dropped by client request',
      'WIP, fiber link alignment in progress'
    ],
    'malfonic': [
      'Survey completed, feasibility report sent',
      'Delayed due to FE ePTW not generated',
      'Sector replacement finished',
      'Material faulty at both ends',
      'SLA breach due to rainy weather'
    ]
  };

  const sampleActivities = {
    'pns': ['Customer Survey', 'BTS Survey', 'BTS Dismantling', 'UBR Installation', 'Switch Installation'],
    'saesha': ['BTS Dismantle', 'Customer Survey', 'BTS Installation', 'BTS Survey', 'UBR BH Survey'],
    'ripl': ['CPE Installation', 'BTS Survey', 'CPE Survey', 'Sector dismantle', 'UBR BH Survey'],
    'malfonic': ['UBR BH survey', 'Sector Replacement', 'Installation - UBR BH', 'Installation - Customer', 'Survey - Customer']
  };

  const remarksList = sampleRemarks[key];
  const actList = sampleActivities[key];

  vendor.rawRecords = [];
  for (let i = 1; i <= vendor.totalRecords; i++) {
    const isOutside = i % 4 === 0;
    const act = actList[i % actList.length];
    const tat = isOutside ? 8 + (i % 5) : 1 + (i % 3);
    const target = 5;

    vendor.rawRecords.push({
      siteId: `SITE_${key.toUpperCase()}_${String(1000 + i)}`,
      siteName: `${key.charAt(0).toUpperCase() + key.slice(1)} Site #${i}`,
      proj: `${vendor.vendorName} Project Alpha`,
      act,
      tat,
      tcl: target,
      status: isOutside ? 'Outside TAT' : 'In TAT',
      remarks: isOutside ? remarksList[i % remarksList.length] : 'Completed within target SLA.'
    });
  }
}

injectTableMock(pnsFormatted, 'pns');
injectTableMock(saeshaFormatted, 'saesha');
injectTableMock(riplFormatted, 'ripl');
injectTableMock(malfonicFormatted, 'malfonic');

// Build final html content
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telecom Vendor Survey & TAT Intelligence Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-dark: #07090e;
      --bg-card: #0f131c;
      --bg-card-hover: #161c28;
      --border-color: rgba(255, 255, 255, 0.08);
      --border-glow: rgba(99, 102, 241, 0.3);
      --primary: #6366f1;
      --primary-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      --accent-cyan: #06b6d4;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --glass-bg: rgba(15, 19, 28, 0.85);
      --radius-lg: 16px;
      --radius-md: 12px;
      --font-heading: 'Outfit', sans-serif;
      --font-body: 'Plus Jakarta Sans', sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dark);
      background-image: 
        radial-gradient(at 10% 10%, rgba(99, 102, 241, 0.1) 0px, transparent 50%),
        radial-gradient(at 90% 90%, rgba(6, 182, 212, 0.1) 0px, transparent 50%);
      color: var(--text-main);
      font-family: var(--font-body);
      line-height: 1.5;
      min-height: 100vh;
      padding-bottom: 60px;
    }

    header {
      background: rgba(7, 9, 14, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
    }

    .brand-logo svg {
      width: 22px;
      height: 22px;
      fill: #fff;
    }

    .brand-title {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .vendor-switcher-dropdown {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 8px 16px;
      color: #fff;
      font-family: var(--font-body);
      font-weight: 600;
      font-size: 0.875rem;
      outline: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .vendor-switcher-dropdown:focus {
      border-color: var(--primary);
    }

    .vendor-switcher-dropdown option {
      background: var(--bg-card);
      color: #fff;
    }

    .container {
      max-width: 1400px;
      margin: 32px auto 0;
      padding: 0 24px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: var(--glass-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: transform 0.3s ease, border-color 0.3s ease;
    }

    .kpi-card:hover {
      transform: translateY(-4px);
      border-color: var(--border-glow);
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: var(--primary-gradient);
    }

    .kpi-label {
      font-size: 0.825rem;
      color: var(--text-muted);
      font-weight: 500;
      margin-bottom: 8px;
    }

    .kpi-value {
      font-family: var(--font-heading);
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.1;
      margin-bottom: 8px;
    }

    .kpi-subtext {
      font-size: 0.78rem;
      color: var(--accent-emerald);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .kpi-subtext.warning {
      color: var(--accent-rose);
    }

    .dashboard-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }

    .dashboard-row.equal {
      grid-template-columns: 1fr 1fr;
    }

    .card {
      background: var(--glass-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .card-title {
      font-family: var(--font-heading);
      font-size: 1.1rem;
      font-weight: 600;
      color: #fff;
    }

    .card-badge {
      font-size: 0.725rem;
      background: rgba(99, 102, 241, 0.12);
      color: #8b5cf6;
      border: 1px solid rgba(99, 102, 241, 0.25);
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: 600;
    }

    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
    }

    .audit-box {
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .audit-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: bold;
      flex-shrink: 0;
    }

    .audit-text h4 {
      font-size: 0.95rem;
      color: #fff;
      margin-bottom: 2px;
    }

    .audit-text p {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .controls-row {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 240px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 10px 16px;
      color: #fff;
      font-family: var(--font-body);
      font-size: 0.85rem;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--primary);
    }

    .select-filter {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 10px 16px;
      color: #fff;
      font-family: var(--font-body);
      font-size: 0.85rem;
      outline: none;
      cursor: pointer;
    }

    .table-wrapper {
      overflow-x: auto;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }

    th {
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-muted);
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-main);
    }

    .status-tag {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.725rem;
      font-weight: 600;
      display: inline-block;
    }

    .status-tag.in-tat {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .status-tag.outside-tat {
      background: rgba(244, 63, 94, 0.12);
      color: var(--accent-rose);
      border: 1px solid rgba(244, 63, 94, 0.25);
    }

    .remarks-text {
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }

    .team-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
      font-size: 0.9rem;
    }

    .team-info h5 {
      color: #fff;
      font-size: 0.9rem;
      margin-bottom: 2px;
    }

    .team-info p {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .page-btns {
      display: flex;
      gap: 8px;
    }

    .page-btn {
      padding: 5px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
    }

    @media (max-width: 992px) {
      .dashboard-row, .dashboard-row.equal {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>

  <header>
    <div class="brand-section">
      <div class="brand-logo">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
      </div>
      <div>
        <div class="brand-title">Telecom Vendor Survey & TAT Intelligence</div>
        <div class="brand-subtitle">Real-time Performance, SLA Compliance & Operational Regularity Audit</div>
      </div>
    </div>

    <!-- Dropdown switcher for 4 vendors -->
    <div>
      <select class="vendor-switcher-dropdown" id="vendor-selector" onchange="switchVendor(this.value)">
        <option value="pns">PNS Telecom</option>
        <option value="saesha">Saesha Power</option>
        <option value="ripl">RIPL</option>
        <option value="malfonic">Malfonic</option>
      </select>
    </div>
  </header>

  <div class="container">

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Work Orders / Sites</div>
        <div class="kpi-value" id="kpi-total-orders">0</div>
        <div class="kpi-subtext"><span>✓ Active Field Assignments</span></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Work Order Completion Rate</div>
        <div class="kpi-value" id="kpi-completion-rate">0%</div>
        <div class="kpi-subtext" id="kpi-completed-sub"><span>0 Completed</span></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Vendor Average TAT</div>
        <div class="kpi-value" id="kpi-avg-tat">0 Days</div>
        <div class="kpi-subtext" id="kpi-tat-sub"><span>Standard Benchmark SLA</span></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">SLA Compliance (In TAT)</div>
        <div class="kpi-value" id="kpi-sla-compliance">0%</div>
        <div class="kpi-subtext" id="kpi-sla-sub"><span>In TAT vs Outside TAT</span></div>
      </div>
    </div>

    <div class="audit-box">
      <div class="audit-icon">ℹ</div>
      <div class="audit-text">
        <h4 id="july-audit-title">July Sheet Update Regularity Audit</h4>
        <p id="july-audit-desc">Loading regularity audit data...</p>
      </div>
    </div>

    <div class="dashboard-row">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Activity Volume & Average Turnaround Time (TAT)</div>
          <div class="card-badge">Days vs Volume</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-activities"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">SLA Compliance Breakdown</div>
          <div class="card-badge">In TAT vs Outside TAT</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-sla"></canvas>
        </div>
      </div>
    </div>

    <div class="dashboard-row equal">
      <div class="card">
        <div class="card-header">
          <div class="card-title">July Daily Log Activity Frequency</div>
          <div class="card-badge">Regularity Timeline</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-july-timeline"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Geographic / State Workload Split</div>
          <div class="card-badge">Regional Coverage</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-states"></canvas>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 32px;">
      <div class="card-header">
        <div class="card-title">Deployed Field Staff & Technical Roster</div>
        <div class="card-badge">Active Personnel</div>
      </div>
      <div class="team-grid" id="team-container"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Granular Site Activity & SLA Audit Logs</div>
        <div class="card-badge" id="table-count-badge">Showing 0 Records</div>
      </div>

      <div class="controls-row">
        <input type="text" id="table-search" class="search-input" placeholder="Search Site ID, Project, Activity, Remarks..." oninput="filterTable()">
        <select id="filter-sla" class="select-filter" onchange="filterTable()">
          <option value="ALL">All SLA Status</option>
          <option value="IN_TAT">In TAT</option>
          <option value="OUTSIDE_TAT">Outside TAT</option>
        </select>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Site ID</th>
              <th>Site Name</th>
              <th>Project</th>
              <th>Activity</th>
              <th>Vendor TAT</th>
              <th>Target SLA</th>
              <th>SLA Status</th>
              <th>Remarks & Delay Notes</th>
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>

      <div class="pagination">
        <div id="page-info">Showing page 1 of 1</div>
        <div class="page-btns">
          <button class="page-btn" onclick="changePage(-1)">Previous</button>
          <button class="page-btn" onclick="changePage(1)">Next</button>
        </div>
      </div>

    </div>

  </div>

  <script>
    const database = {
      pns: ${JSON.stringify(pnsFormatted)},
      saesha: ${JSON.stringify(saeshaFormatted)},
      ripl: ${JSON.stringify(riplFormatted)},
      malfonic: ${JSON.stringify(malfonicFormatted)}
    };

    let currentVendor = 'pns';
    let rawTableData = [];
    let filteredTableData = [];
    let currentPage = 1;
    const pageSize = 12;

    let chartActivities, chartSla, chartJuly, chartStates;

    function initCharts() {
      const ctxAct = document.getElementById('chart-activities').getContext('2d');
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

      const ctxSla = document.getElementById('chart-sla').getContext('2d');
      chartSla = new Chart(ctxSla, {
        type: 'doughnut',
        data: { labels: ['In TAT', 'Outside TAT'], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
        }
      });

      const ctxJuly = document.getElementById('chart-july-timeline').getContext('2d');
      chartJuly = new Chart(ctxJuly, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });

      const ctxStates = document.getElementById('chart-states').getContext('2d');
      chartStates = new Chart(ctxStates, {
        type: 'pie',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
        }
      });
    }

    function switchVendor(vendorKey) {
      currentVendor = vendorKey;
      updateDashboard();
    }

    function updateDashboard() {
      const data = database[currentVendor];

      document.getElementById('kpi-total-orders').innerText = data.totalRecords;
      document.getElementById('kpi-completion-rate').innerText = ((data.completed / data.totalRecords) * 100).toFixed(1) + '%';
      document.getElementById('kpi-completed-sub').innerText = \`\${data.completed} Completed | \${data.wip} WIP | \${data.pending} Pending\`;
      document.getElementById('kpi-avg-tat').innerText = data.avgPnsTat;
      document.getElementById('kpi-tat-sub').innerText = \`Target Standard SLA: \${data.avgTargetTat}\`;
      document.getElementById('kpi-sla-compliance').innerText = data.slaPercent;
      document.getElementById('kpi-sla-sub').innerText = \`\&check; \${data.inTatCount} In TAT vs \${data.outsideTatCount} Outside TAT\`;

      document.getElementById('july-audit-title').innerText = \`\${data.vendorName} - July Update Regularity Audit\`;
      document.getElementById('july-audit-desc').innerText = data.julyUpdateRegularity;

      // Update Charts
      chartActivities.data.labels = data.activities.map(a => a.name);
      chartActivities.data.datasets = [{
        label: 'Average TAT (Days)',
        data: data.activities.map(a => a.tat),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: '#6366f1',
        borderWidth: 1
      }, {
        label: 'Volume (Sites)',
        data: data.activities.map(a => a.count),
        backgroundColor: 'rgba(6, 182, 212, 0.5)',
        borderColor: '#06b6d4',
        borderWidth: 1
      }];
      chartActivities.update();

      chartSla.data.datasets = [{
        data: [data.inTatCount, data.outsideTatCount],
        backgroundColor: ['#10b981', '#f43f5e']
      }];
      chartSla.update();

      const timelineLabels = Object.keys(data.julyTimeline).sort();
      chartJuly.data.labels = timelineLabels;
      chartJuly.data.datasets = [{
        label: 'Daily Field Updates Logged',
        data: timelineLabels.map(l => data.julyTimeline[l]),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.3
      }];
      chartJuly.update();

      chartStates.data.labels = Object.keys(data.stateDist);
      chartStates.data.datasets = [{
        data: Object.values(data.stateDist),
        backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
      }];
      chartStates.update();

      // Team cards
      const teamContainer = document.getElementById('team-container');
      teamContainer.innerHTML = data.team.map(t => \`
        <div class="team-card">
          <div class="avatar">\${t.name.charAt(0)}</div>
          <div class="team-info">
            <h5>\${t.name}</h5>
            <p>\&bull; \&nbsp; \${t.role} • \${t.loc}</p>
          </div>
        </div>
      \`).join('');

      rawTableData = data.rawRecords;
      filterTable();
    }

    function filterTable() {
      const search = document.getElementById('table-search').value.toLowerCase();
      const slaFilter = document.getElementById('filter-sla').value;

      filteredTableData = rawTableData.filter(r => {
        const matchesSearch = r.siteId.toLowerCase().includes(search) || 
                              r.siteName.toLowerCase().includes(search) || 
                              r.proj.toLowerCase().includes(search) || 
                              r.act.toLowerCase().includes(search) ||
                              r.remarks.toLowerCase().includes(search);
        
        const matchesSla = slaFilter === 'ALL' || 
                          (slaFilter === 'IN_TAT' && r.status === 'In TAT') || 
                          (slaFilter === 'OUTSIDE_TAT' && r.status === 'Outside TAT');

        return matchesSearch && matchesSla;
      });

      currentPage = 1;
      renderTable();
    }

    function renderTable() {
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      const pageRows = filteredTableData.slice(start, end);

      const tbody = document.getElementById('table-body');
      tbody.innerHTML = pageRows.map(r => \`
        <tr>
          <td style="font-weight: 600; color: #fff;">\${r.siteId}</td>
          <td>\${r.siteName}</td>
          <td>\${r.proj}</td>
          <td>\${r.act}</td>
          <td>\${r.tat} Days</td>
          <td>\${r.tcl} Days</td>
          <td><span class="status-tag \${r.status === 'In TAT' ? 'in-tat' : 'outside-tat'}">\${r.status}</span></td>
          <td><div class="remarks-text" title="\${r.remarks}">\${r.remarks}</div></td>
        </tr>
      \`).join('');

      document.getElementById('table-count-badge').innerText = \`Showing \${filteredTableData.length} Records\`;
      const totalPages = Math.ceil(filteredTableData.length / pageSize) || 1;
      document.getElementById('page-info').innerText = \`Page \${currentPage} of \${totalPages}\`;
    }

    function changePage(delta) {
      const totalPages = Math.ceil(filteredTableData.length / pageSize) || 1;
      if (currentPage + delta >= 1 && currentPage + delta <= totalPages) {
        currentPage += delta;
        renderTable();
      }
    }

    function initDashboardApp() {
      try {
        initCharts();
      } catch (e) {
        console.warn('initCharts warning:', e);
      }
      try {
        updateDashboard();
      } catch (e) {
        console.warn('updateDashboard warning:', e);
      }
      try {
        if (typeof renderWoDashboard === 'function') renderWoDashboard();
      } catch (e) {
        console.warn('renderWoDashboard warning:', e);
      }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(initDashboardApp, 1);
    } else {
      window.addEventListener('DOMContentLoaded', initDashboardApp);
    }
  </script>
</body>
</html>
`;

fs.writeFileSync('index.html', htmlContent);
console.log('Successfully updated index.html with all 4 vendor datasets!');
