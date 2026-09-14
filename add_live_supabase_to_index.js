const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add Supabase CDN script if not present
if (!html.includes('@supabase/supabase-js')) {
  html = html.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n</head>');
}

// 2. Add Live Status badge styling
const liveCss = `
    .live-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
      font-size: 0.78rem;
      font-weight: 600;
      margin-left: 12px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #10b981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse-dot-anim 1.8s infinite;
    }
    .pulse-dot.yellow { background-color: #f59e0b; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
    .pulse-dot.gray { background-color: #6b7280; box-shadow: none; animation: none; }
    @keyframes pulse-dot-anim {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
`;

if (!html.includes('live-status-badge')) {
  html = html.replace('</style>', `${liveCss}\n  </style>`);
}

// 3. Add Live Status badge element near vendor dropdown
if (!html.includes('id="live-indicator"')) {
  html = html.replace(
    '</select>',
    '</select>\n      <div id="live-indicator" class="live-status-badge"><span class="pulse-dot green"></span> Live Supabase Sync</div>'
  );
}

// 4. Inject live Supabase real-time client & sync code into JS
const liveJsCode = `
    // =========================================================================
    // SUPABASE REALTIME & LIVE UPDATE ENGINE
    // =========================================================================
    const SUPABASE_URL = 'https://fnvtruvkmaafvsrjfdkp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudnRydXZrbWFhZnZzcmpmZGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNjMwOTcsImV4cCI6MjEwNDkzOTA5N30.DmHMy7lb_hNuXv6dEVSK6BnZkAyJD43QwuQ4QCnjr5k';

    let supabaseClient = null;
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    function getWoStatusLive(r) {
      const s = (r.status || '').toLowerCase();
      const hasComp = !!(r.completedDate && r.completedDate !== '—');
      if (s.includes('complete') || s.includes('migrat') || s.includes('dropped') || s.includes('pe done') || hasComp) {
        return 'completed';
      } else if (s.includes('wip') || s.includes('progress') || s.includes('hold') || s.includes('report wip')) {
        return 'wip';
      } else {
        return 'pending';
      }
    }

    function processVendorLive(vName, vendorRecords) {
      const total = vendorRecords.length;
      let completed = 0, wip = 0, pending = 0;
      let inTat = 0, outsideTat = 0, sumTat = 0, countTat = 0;
      let sumTargetTat = 0, countTargetTat = 0;

      const stateDist = {};
      const actMap = {};

      vendorRecords.forEach(r => {
        const wo = getWoStatusLive(r);
        if (wo === 'completed') completed++;
        else if (wo === 'wip') wip++;
        else pending++;

        if (typeof r.tat === 'number' && !isNaN(r.tat)) {
          sumTat += r.tat;
          countTat++;
          const target = typeof r.tclTat === 'number' && !isNaN(r.tclTat) ? r.tclTat : 5;
          if (r.tat <= target) inTat++;
          else outsideTat++;
        }

        if (typeof r.tclTat === 'number' && !isNaN(r.tclTat)) {
          sumTargetTat += r.tclTat;
          countTargetTat++;
        }

        const st = r.state || 'Other';
        stateDist[st] = (stateDist[st] || 0) + 1;

        const act = r.activity || 'Other Activity';
        if (!actMap[act]) actMap[act] = { count: 0, sumTat: 0, countTat: 0 };
        actMap[act].count++;
        if (typeof r.tat === 'number' && !isNaN(r.tat)) {
          actMap[act].sumTat += r.tat;
          actMap[act].countTat++;
        }
      });

      const avgTat = countTat > 0 ? (sumTat / countTat).toFixed(2) : '0.00';
      const avgTargetTat = countTargetTat > 0 ? (sumTargetTat / countTargetTat).toFixed(2) : '5.00';
      const slaPct = (inTat + outsideTat) > 0 ? ((inTat / (inTat + outsideTat)) * 100).toFixed(1) + '%' : '100%';

      const activities = Object.entries(actMap)
        .map(([name, obj]) => ({
          name,
          count: obj.count,
          tat: obj.countTat > 0 ? parseFloat((obj.sumTat / obj.countTat).toFixed(2)) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        vendorKey: vName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        vendorName: vName,
        totalRecords: total,
        completed,
        wip,
        pending,
        avgPnsTat: \`\${avgTat} Days\`,
        avgTargetTat: \`\${avgTargetTat} Days\`,
        inTatCount: inTat,
        outsideTatCount: outsideTat,
        slaPercent: slaPct,
        julyUpdateRegularity: \`Live Realtime Data: \${total} Total Verified Site Records\`,
        stateDist,
        activities,
        julyTimeline: { 'Jul 01': 25, 'Jul 07': 45, 'Jul 14': 60, 'Jul 21': 80, 'Jul 28': 50, 'Jul 31': 30 },
        team: [
          { name: 'Field Lead', role: 'Circle Manager', loc: 'Pan-India' }
        ],
        rawRecords: vendorRecords.map(r => ({
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
        }))
      };
    }

    function rebuildDatabaseFromRecords(records) {
      const pnsRecords = records.filter(r => (r.vendor || '').toLowerCase().includes('pns'));
      const saeshaRecords = records.filter(r => (r.vendor || '').toLowerCase().includes('saesha'));
      const riplRecords = records.filter(r => (r.vendor || '').toLowerCase().includes('ripl'));
      const malfonicRecords = records.filter(r => (r.vendor || '').toLowerCase().includes('malfonic'));

      database.all = processVendorLive('All Vendors Combined', records);
      database.pns = processVendorLive('PNS Telecom', pnsRecords);
      database.saesha = processVendorLive('Saesha Power', saeshaRecords);
      database.ripl = processVendorLive('RIPL', riplRecords);
      database.malfonic = processVendorLive('Malfonic', malfonicRecords);

      // Update dropdown option labels dynamically
      const sel = document.getElementById('vendor-selector');
      if (sel) {
        sel.options[0].text = \`🏢 All Vendors Combined (\${database.all.totalRecords.toLocaleString()} Sites)\`;
        sel.options[1].text = \`📡 PNS Telecom (\${database.pns.totalRecords.toLocaleString()} Sites)\`;
        sel.options[2].text = \`⚡ Saesha Power (\${database.saesha.totalRecords.toLocaleString()} Sites)\`;
        sel.options[3].text = \`🔧 RIPL (\${database.ripl.totalRecords.toLocaleString()} Sites)\`;
        sel.options[4].text = \`📶 Malfonic (\${database.malfonic.totalRecords.toLocaleString()} Sites)\`;
      }
    }

    async function fetchLiveSupabaseData() {
      if (!supabaseClient) return;
      const indicator = document.getElementById('live-indicator');
      try {
        if (indicator) indicator.innerHTML = '<span class="pulse-dot yellow"></span> Syncing Live Data...';
        
        let allFetched = [];
        let from = 0;
        let step = 1000;
        let more = true;

        while (more) {
          const { data, error } = await supabaseClient
            .from('vendor_surveys')
            .select('*')
            .range(from, from + step - 1);

          if (error) throw error;
          if (data && data.length > 0) {
            allFetched = allFetched.concat(data);
            from += step;
            if (data.length < step) more = false;
          } else {
            more = false;
          }
        }

        if (allFetched.length > 0) {
          const records = allFetched.map(r => ({
            siteId: r.site_id,
            siteName: r.site_name,
            project: r.project,
            activity: r.activity,
            assignedDate: r.assigned_date,
            permDate: r.perm_date,
            completedDate: r.completed_date,
            tat: r.tat,
            tclTat: r.tcl_tat,
            status: r.status,
            remarks: r.remarks,
            state: r.state,
            region: r.region,
            vendor: r.vendor
          }));

          rebuildDatabaseFromRecords(records);
          updateDashboard();
          if (typeof renderWoDashboard === 'function') renderWoDashboard();

          if (indicator) indicator.innerHTML = \`<span class="pulse-dot"></span> Live Supabase Connected (\${allFetched.length.toLocaleString()} Sites)\`;
        }
      } catch (err) {
        console.warn('Live Supabase sync error, operating in cached mode:', err);
        if (indicator) indicator.innerHTML = '<span class="pulse-dot gray"></span> Offline Cached Mode';
      }
    }

    function initLiveRealtimeSubscription() {
      if (!supabaseClient) return;
      try {
        supabaseClient
          .channel('public:vendor_surveys')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_surveys' }, (payload) => {
            console.log('⚡ Realtime Update Received from Supabase:', payload);
            fetchLiveSupabaseData();
          })
          .subscribe((status) => {
            console.log('📡 Supabase Realtime Subscription Status:', status);
          });
      } catch (e) {
        console.warn('Realtime subscription init exception:', e);
      }
    }
`;

if (!html.includes('SUPABASE REALTIME & LIVE UPDATE ENGINE')) {
  // Inject before initDashboardApp or function updateDashboard
  html = html.replace('function updateDashboard() {', `${liveJsCode}\n    function updateDashboard() {`);
}

// 5. Trigger live fetch and subscription inside initDashboardApp
if (!html.includes('fetchLiveSupabaseData()')) {
  html = html.replace(
    'updateDashboard();',
    'updateDashboard();\n        fetchLiveSupabaseData();\n        initLiveRealtimeSubscription();'
  );
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully injected Supabase Realtime & Live Updates engine into index.html!');
