/*
 * Dashboard application: data loading · state · filters · rendering · refresh.
 * All maths lives in engine.js; all vendor/threshold settings live in lib/config.js.
 */
(function () {
  'use strict';
  const CFG = window.TATConfig, E = window.TATEngine, H = E.helpers;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ============================================================ STATE */
  const state = {
    data: null,            // last good payload from /api/data
    etag: null,
    all: [], vendors: [],
    months: [],            // selectable months
    f: freshFilters(),
    page: 1, pageSize: 15, tSearch: '', tWo: 'all',
    nextRefreshAt: 0, lastRefresh: null, conn: 'busy', failures: 0, inflight: false
  };
  function freshFilters() {
    return { months: new Set(), vendors: new Set(), regions: new Set(), states: new Set(), projects: new Set(), stage: 'all', sla: 'all', tatCat: 'all' };
  }
  const now = () => new Date();

  /* ====================================================== FORMATTING */
  const fmtDays = x => x == null ? '—' : `${H.r1(x)} d`;
  const fmtPct = x => x == null ? '—' : `${H.r1(x)}%`;
  const fmtInt = x => x == null ? '—' : Number(x).toLocaleString('en-IN');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtStamp = d => `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()} | ${[d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')}`;
  const fmtIso = iso => iso ? `${+iso.slice(8, 10)}-${MON[+iso.slice(5, 7) - 1]}-${iso.slice(2, 4)}` : '—';
  const trendChip = t => t && t.dir !== 'na' ? `<span class="chip ${t.dir}" title="${esc(t.label)}">${t.icon} ${t.label}${t.pct != null && t.dir !== 'stable' ? ' ' + H.r1(Math.abs(t.pct)) + '%' : ''}</span>` : '<span class="chip na">– n/a</span>';
  const vlink = (key, name) => `<button type="button" class="vlink" data-vendor="${esc(key)}">${esc(name)}</button>`;

  const cache = new Map();
  function setHtml(id, html) { const el = $(id); if (!el) return; if (cache.get(id) === html) return; cache.set(id, html); el.innerHTML = html; }
  function setText(id, t) { const el = $(id); if (el && el.textContent !== t) el.textContent = t; }

  /* ======================================================= DATA LOADER */
  async function loadData(manual) {
    if (state.inflight) return;
    state.inflight = true;
    setConn('busy');
    $('btn-refresh').disabled = true;
    try {
      const headers = state.etag ? { 'If-None-Match': state.etag } : {};
      let res;
      try { res = await fetchWithTimeout('api/data', { headers, cache: 'no-store' }, 30000); }
      catch (e) {
        if (state.data) throw e;
        if (window.__TAT_SNAPSHOT__) { ingest(window.__TAT_SNAPSHOT__); state.usingSnapshot = true; state.lastRefresh = now(); res = { status: 304 }; }   // standalone file
        else { res = await fetchWithTimeout('data/latest.json', { cache: 'no-store' }, 15000); state.usingSnapshot = true; }
      }
      if (res.status === 304) {
        state.lastRefresh = now();                          // data unchanged, connection healthy
      } else if (res.ok) {
        const payload = await res.json();
        if (!payload.records) throw new Error(payload.error || 'Malformed response');
        state.etag = res.headers.get('ETag') || null;
        ingest(payload);
        state.lastRefresh = now();
      } else {
        throw new Error('HTTP ' + res.status);
      }
      state.failures = 0;
      setConn(state.usingSnapshot ? 'lost' : 'live');
      showBanner();
      renderStatus();
    } catch (err) {
      state.failures++;
      console.warn('Data refresh failed:', err);
      setConn('lost');
      showBanner(state.data ? 'warn' : 'err', state.data
        ? 'Latest data unavailable — displaying last successfully synchronized dataset.'
        : 'Unable to load data. Check the /api/data endpoint or the sheet sharing settings.');
    } finally {
      state.inflight = false;
      $('btn-refresh').disabled = false;
      state.nextRefreshAt = Date.now() + CFG.refreshIntervalSec * 1000;
    }
  }
  function fetchWithTimeout(url, opts, ms) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    return fetch(url, { ...opts, signal: ctl.signal }).finally(() => clearTimeout(t));
  }

  function ingest(payload) {
    state.data = payload;
    state.all = payload.records;
    state.vendors = payload.vendors;
    state.months = E.availableMonths(state.all, now());
    for (const m of [...state.f.months]) if (!state.months.includes(m)) state.f.months.delete(m);   // month vanished from data
    buildFilterOptions();
    renderMonthList();
    renderAll();
  }

  /* ====================================================== CONNECTION */
  function setConn(s) {
    state.conn = s;
    $('conn-dot').className = 'dot ' + (s === 'live' ? 'live' : s === 'busy' ? 'busy' : 'lost');
    $('conn-text').textContent = s === 'live' ? 'Live' : s === 'busy' ? 'Refreshing' : 'Connection Lost';
  }
  function showBanner(kind, msg) {
    const b = $('banner');
    const vend = (state.vendors || []).filter(v => v.fetch !== 'live');
    if (!kind && vend.length) { kind = 'warn'; msg = `Vendor sheet unreachable — showing last good data for: ${vend.map(v => v.name + (v.error ? ' (' + v.error + ')' : '')).join('; ')}.`; }
    if (!kind && state.usingSnapshot) { kind = 'warn'; msg = 'Offline snapshot' + (state.data && state.data.generatedAt ? ' from ' + state.data.generatedAt.slice(0, 16).replace('T', ' ') + ' UTC' : '') + ' — live API not connected (deploy to Vercel or run npm start for live data).'; }
    b.className = 'banner' + (kind ? ' show ' + kind : '');
    b.textContent = msg || '';
  }
  function renderStatus() {
    if (!state.lastRefresh) return;
    const stamp = fmtStamp(state.lastRefresh);
    setText('conn-sync', stamp); setText('last-refresh', stamp);
    setText('footer', `Source: ${state.data.source} · ${fmtInt(state.all.length)} rows from ${state.vendors.length} vendor sheets · server build ${state.data.buildMs} ms · auto-refresh every ${CFG.refreshIntervalSec}s`);
  }
  setInterval(() => {                                      // countdown + staleness + auto refresh
    if (!state.nextRefreshAt) return;
    const left = Math.max(0, Math.round((state.nextRefreshAt - Date.now()) / 1000));
    setText('countdown', document.hidden ? 'paused' : String(left));
    if (!document.hidden && !state.inflight && Date.now() >= state.nextRefreshAt) loadData(false);
    if (state.lastRefresh && state.conn === 'live' && (Date.now() - state.lastRefresh) / 1000 > CFG.staleAfterSec) setConn('lost');
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() >= state.nextRefreshAt) loadData(false); });

  /* ======================================================== FILTERS */
  function buildFilterOptions() {
    fillSelect('f-vendor', 'All vendors', state.vendors.map(v => [v.vendorKey, v.name]), [...state.f.vendors][0]);
    const opt = (field, id, label) => fillSelect(id, label, E.distinct(state.all, field).filter(x => x !== '—').map(x => [x, x]), [...state.f[field === 'region' ? 'regions' : field === 'state' ? 'states' : 'projects']][0]);
    opt('region', 'f-region', 'All regions'); opt('state', 'f-state', 'All circles / states'); opt('project', 'f-project', 'All projects');
    const t = $('f-tatcat'); if (!t.options.length) { t.innerHTML = '<option value="all">All TAT</option>' + E.TAT_CATS.map(c => `<option value="${c.key}">${c.label}</option>`).join(''); }
  }
  function fillSelect(id, allLabel, pairs, current) {
    const el = $(id), html = `<option value="all">${esc(allLabel)}</option>` + pairs.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
    if (cache.get('sel:' + id) !== html) { cache.set('sel:' + id, html); el.innerHTML = html; }
    el.value = current && pairs.some(p => p[0] === current) ? current : 'all';
  }
  function bindFilters() {
    const set = (id, key) => $(id).addEventListener('change', e => { state.f[key] = e.target.value === 'all' ? new Set() : new Set([e.target.value]); state.page = 1; renderAll(); });
    set('f-vendor', 'vendors'); set('f-region', 'regions'); set('f-state', 'states'); set('f-project', 'projects');
    const scalar = (id, key) => $(id).addEventListener('change', e => { state.f[key] = e.target.value; state.page = 1; renderAll(); });
    scalar('f-stage', 'stage'); scalar('f-sla', 'sla'); scalar('f-tatcat', 'tatCat');
    $('btn-reset').addEventListener('click', () => {
      state.f = freshFilters(); state.page = 1; state.tSearch = ''; state.tWo = 'all';
      $('t-search').value = ''; $('t-wo').value = 'all'; $('f-stage').value = 'all'; $('f-sla').value = 'all'; $('f-tatcat').value = 'all';
      buildFilterOptions(); renderMonthList(); renderAll();
    });
    $('t-search').addEventListener('input', debounce(e => { state.tSearch = e.target.value.toLowerCase(); state.page = 1; renderSiteTable(); }, 200));
    $('t-wo').addEventListener('change', e => { state.tWo = e.target.value; state.page = 1; renderSiteTable(); });
    $('pg-prev').addEventListener('click', () => { state.page = Math.max(1, state.page - 1); renderSiteTable(); });
    $('pg-next').addEventListener('click', () => { state.page++; renderSiteTable(); });
    $('btn-refresh').addEventListener('click', () => loadData(true));
  }
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---- month multi-select ---- */
  function bindMonthPanel() {
    const panel = $('month-panel'), btn = $('month-btn');
    btn.addEventListener('click', e => { e.stopPropagation(); const open = !panel.classList.contains('open'); panel.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); if (open) $('month-search').focus(); });
    document.addEventListener('click', e => { if (!panel.contains(e.target) && e.target !== btn) { panel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
    $('month-search').addEventListener('input', renderMonthList);
    $('month-list').addEventListener('change', e => {
      if (e.target.type !== 'checkbox') return;
      e.target.checked ? state.f.months.add(e.target.value) : state.f.months.delete(e.target.value);
      state.page = 1; updateMonthButton(); renderAll();
    });
    panel.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.preset;
      if (p === 'none') state.f.months = new Set();
      else if (p === 'all') state.f.months = new Set(state.months);
      else state.f.months = new Set(E.monthPresets(state.months, now())[p]);
      state.page = 1; renderMonthList(); renderAll();
    }));
  }
  function renderMonthList() {
    const q = $('month-search').value.trim().toLowerCase();
    const counts = H.groupBy(state.all.filter(r => r.month), r => r.month);
    let html = '', lastYear = '';
    for (const m of [...state.months].reverse()) {
      const label = H.monthLabel(m);
      if (q && !label.toLowerCase().includes(q) && !m.includes(q)) continue;
      if (m.slice(0, 4) !== lastYear) { lastYear = m.slice(0, 4); html += `<div class="year">${lastYear}</div>`; }
      html += `<label><input type="checkbox" value="${m}" ${state.f.months.has(m) ? 'checked' : ''}> ${label}<span class="cnt">${(counts.get(m) || []).length}</span></label>`;
    }
    $('month-list').innerHTML = html || '<div class="empty">No months match</div>';
    updateMonthButton();
  }
  function updateMonthButton() {
    const sel = [...state.f.months].sort(), n = sel.length;
    setText('month-btn-text', n === 0 || n === state.months.length ? 'All Months' : n <= 2 ? sel.map(H.monthLabel).join(', ') : `${n} months selected`);
  }
  /** months passed to the engine: nothing selected or everything selected = no restriction. */
  function effectiveFilters(includeMonths = true) {
    const f = { ...state.f };
    if (!includeMonths || state.f.months.size === state.months.length) f.months = new Set();
    return f;
  }

  /* ======================================================== CHARTS */
  const charts = {};
  const PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];
  if (window.Chart) {
    Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif"; Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)'; Chart.defaults.maintainAspectRatio = false; Chart.defaults.responsive = true;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(7,9,14,.95)'; Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.15)'; Chart.defaults.plugins.tooltip.borderWidth = 1;
  }
  function upsertChart(id, type, data, options) {
    const el = $(id); if (!el || !window.Chart) return;
    const c = charts[id];
    if (c && c.config.type === type) {
      c.data.labels = data.labels;
      c.data.datasets.forEach((ds, i) => { if (data.datasets[i]) Object.assign(ds, data.datasets[i]); });
      if (data.datasets.length !== c.data.datasets.length) c.data.datasets = data.datasets;
      c.update('none');                                     // in-place update: no re-creation, no animation storm
    } else {
      if (c) c.destroy();
      charts[id] = new Chart(el, { type, data, options });
    }
  }
  const scales = (extra = {}) => ({ x: { grid: { display: false } }, y: { beginAtZero: true, ...extra } });
  function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

  /* ====================================================== RENDERING */
  function renderAll() {
    if (!state.data) return;
    const t = now();
    const recs = E.applyFilters(state.all, effectiveFilters(true));
    const recsNoMonth = E.applyFilters(state.all, effectiveFilters(false));
    state.recs = recs; state.recsNoMonth = recsNoMonth;

    const monthNote = state.f.months.size && state.f.months.size < state.months.length ? ` · ${state.f.months.size} month(s)` : '';
    setText('filter-note', `${fmtInt(recs.length)} of ${fmtInt(state.all.length)} records${monthNote}`);
    renderKpis(recs, t);
    renderExec(t);
    renderInsights(recs, t);
    renderMom(recs, t);
    renderVendors(recs, t);
    renderBreakdownCharts(recs, recsNoMonth, t);
    renderAgeing(recs, t);
    renderWo(recs);
    renderSiteTable();
    renderCompliance(t);
    renderDq(t);
  }

  function kpiCard(label, value, sub, cls = '') { return `<div class="kpi-card ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-sub">${sub}</div></div>`; }

  function renderKpis(recs, t) {
    const k = E.kpis(recs, t);
    setHtml('kpis', [
      kpiCard('Total Surveys', fmtInt(k.total), `${fmtInt(k.dropped)} dropped · ${fmtInt(k.active)} active`),
      kpiCard('Survey Completed', fmtInt(k.completed), `${fmtPct(k.completionPct)} of active`, 'ok'),
      kpiCard('Survey Pending', fmtInt(k.pending), `${k.wip} WIP · ${k.hold} on hold · avg age ${k.avgPendingAge == null ? '—' : Math.round(k.avgPendingAge) + ' d'}`, k.pending ? 'warn' : 'ok'),
      kpiCard('Completion %', fmtPct(k.completionPct), 'completed ÷ (total − dropped)', 'ok'),
      kpiCard('Average TAT', fmtDays(k.avgTat), `target avg ${fmtDays(k.avgTarget)} · n=${fmtInt(k.tatSample)}`, 'cyan'),
      kpiCard('Median TAT', fmtDays(k.medianTat), 'middle completed survey', 'cyan'),
      kpiCard('Best / Worst TAT', `${k.bestTat == null ? '—' : k.bestTat}<small> / ${k.worstTat == null ? '—' : k.worstTat} d</small>`, 'fastest vs slowest completion'),
      kpiCard('SLA Compliance', fmtPct(k.slaPct), `${fmtInt(k.inTat)} in TAT · ${fmtInt(k.outTat)} outside`, k.slaPct != null && k.slaPct < 75 ? 'bad' : 'ok'),
      kpiCard('Delayed Surveys', fmtInt(k.delayed), 'completed outside TAT', k.delayed ? 'bad' : 'ok')
    ].join(''));
  }

  function renderExec(t) {
    const ex = E.executiveSummary(state.all, state.vendors, t);
    if (!ex) { setHtml('exec-card', '<div class="empty">Not enough dated data for an executive summary.</div>'); return; }
    const { k, pk } = ex;
    const li = (a, b) => `<li><span class="muted">${a}</span> <b>${b}</b></li>`;
    setHtml('exec-card', `
      <div class="card-header"><div><div class="card-title">📌 Last Month Executive Summary — ${esc(ex.label)}</div><div class="card-sub">Latest completed month found in the data (independent of filters)</div></div><span class="badge">vs ${esc(ex.prevLabel || 'n/a')}</span></div>
      <div class="exec-grid">
        <div class="exec-block"><h4>Survey Performance</h4><ul>${li('Total surveys', fmtInt(k.total))}${li('Completed', fmtInt(k.completed))}${li('Pending', fmtInt(k.pending))}${li('Completion rate', fmtPct(k.completionPct))}</ul></div>
        <div class="exec-block"><h4>TAT Performance</h4><ul>${li('Average TAT', fmtDays(k.avgTat))}${li('Previous month', pk ? fmtDays(pk.avgTat) : '—')}${li('Change', trendChip(ex.trend))}${li('SLA compliance', fmtPct(k.slaPct))}</ul></div>
        <div class="exec-block"><h4>Best Performing Vendor</h4><ul>${ex.best ? `<li><b>${esc(ex.best.name)}</b></li>${li('Average TAT', fmtDays(ex.best.avgTat))}${li('Surveys', fmtInt(ex.best.total))}` : '<li class="muted">Insufficient data</li>'}</ul></div>
        <div class="exec-block"><h4>Vendor Requiring Attention</h4><ul>${ex.worst ? `<li><b>${esc(ex.worst.name)}</b></li>${li('Average TAT', fmtDays(ex.worst.avgTat))}${li('Pending', fmtInt(ex.worst.pending))}` : '<li class="muted">Insufficient data</li>'}</ul></div>
      </div>
      <div class="exec-obs"><b style="font-style:normal">Key observation — </b>${esc(ex.observation)}</div>`);
  }

  function renderInsights(recs, t) {
    const ins = E.insights(recs, state.vendors, t);
    setText('insight-count', `${ins.length} insights`);
    setHtml('insights', ins.map(i => `<div class="insight ${i.type}"><b>${i.type === 'good' ? '✔' : i.type === 'bad' ? '⚠' : 'ℹ'} ${esc(i.title)}</b>${esc(i.text)}</div>`).join(''));
  }

  function renderMom(recs, t) {
    const monthly = E.monthlyStats(recs, t), mc = E.monthComparison(monthly);
    const multi = state.f.months.size > 1 || (state.f.months.size === 0);
    setHtml('mom-badges', (mc.best ? `<span class="chip up">★ Best: ${esc(mc.best.short)} (${fmtDays(mc.best.avgTat)})</span> ` : '') + (mc.worst && mc.worst !== mc.best ? `<span class="chip down">▼ Worst: ${esc(mc.worst.short)} (${fmtDays(mc.worst.avgTat)})</span> ` : '') + (mc.overall ? trendChip(mc.overall) : ''));
    const rows = mc.rows;
    setHtml('mom-table', rows.length ? `<thead><tr><th>Month</th><th class="num">Surveys</th><th class="num">Done</th><th class="num">Pending</th><th class="num">Avg TAT</th><th>TAT trend</th><th class="num">SLA</th></tr></thead><tbody>` +
      [...rows].reverse().slice(0, 24).map(r => `<tr><td><b>${esc(r.label)}</b>${mc.best && r.month === mc.best.month ? ' ★' : ''}</td><td class="num">${fmtInt(r.total)}</td><td class="num">${fmtInt(r.completed)}</td><td class="num">${fmtInt(r.pending)}</td><td class="num">${fmtDays(r.avgTat)}</td><td>${trendChip(r.tatTrend)}</td><td class="num">${fmtPct(r.slaPct)}</td></tr>`).join('') + '</tbody>' : '<tbody><tr><td class="empty">No dated records for this selection</td></tr></tbody>');
    const shown = rows.slice(-18);
    upsertChart('ch-mom', 'bar', {
      labels: shown.map(r => r.short),
      datasets: [
        { type: 'line', label: 'Avg TAT (days)', data: shown.map(r => r.avgTat == null ? null : H.r2(r.avgTat)), borderColor: '#f59e0b', backgroundColor: '#f59e0b', yAxisID: 'y1', tension: .3, spanGaps: true, pointRadius: 3 },
        { type: 'bar', label: 'Surveys', data: shown.map(r => r.total), backgroundColor: 'rgba(99,102,241,.75)', borderRadius: 5, yAxisID: 'y' }
      ]
    }, { interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Surveys' } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Avg TAT (d)' } } } });
  }

  function renderVendors(recs, t) {
    const vt = E.vendorTable(recs, state.vendors, t);
    setHtml('vendor-table', `<thead><tr><th>Rank</th><th>Vendor</th><th class="num">Surveys</th><th class="num">Done</th><th class="num">Pending</th><th class="num">Completion</th><th class="num">Avg TAT</th><th class="num">Median</th><th class="num">SLA %</th><th class="num">Delayed</th><th class="num">Share of pending</th></tr></thead><tbody>` +
      vt.map(v => `<tr><td>${v.rank ? '#' + v.rank : '<span class="dim" title="Fewer than 5 completed surveys">n/a</span>'}</td><td><span class="swatch" style="background:${v.color}"></span>${vlink(v.vendorKey, v.name)}</td><td class="num">${fmtInt(v.total)}</td><td class="num">${fmtInt(v.completed)}</td><td class="num">${fmtInt(v.pending)}</td><td class="num">${fmtPct(v.completionPct)}</td><td class="num"><b>${fmtDays(v.avgTat)}</b></td><td class="num">${fmtDays(v.medianTat)}</td><td class="num">${fmtPct(v.slaPct)}</td><td class="num">${fmtInt(v.delayed)}</td><td class="num">${fmtPct(v.pendingShare)}</td></tr>`).join('') + '</tbody>');
    const byOrder = state.vendors.map(v => vt.find(x => x.vendorKey === v.vendorKey));
    upsertChart('ch-vendor-tat', 'bar', {
      labels: byOrder.map(v => v.name),
      datasets: [
        { label: 'Avg TAT (d)', data: byOrder.map(v => v.avgTat == null ? 0 : H.r2(v.avgTat)), backgroundColor: byOrder.map(v => v.color), borderRadius: 6 },
        { label: 'Median TAT (d)', data: byOrder.map(v => v.medianTat == null ? 0 : H.r2(v.medianTat)), backgroundColor: 'rgba(148,163,184,.5)', borderRadius: 6 }
      ]
    }, { plugins: { legend: { position: 'top' } }, scales: scales(), onClick: (_, els) => { if (els.length) openDrill(byOrder[els[0].index].vendorKey); } });
    const k = E.kpis(recs, t);
    upsertChart('ch-sla', 'doughnut', { labels: ['In TAT', 'Outside TAT'], datasets: [{ data: [k.inTat, k.outTat], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 2, borderColor: '#0f131c' }] },
      { cutout: '62%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} (${H.r1(H.pct(c.raw, k.inTat + k.outTat))}%)` } } } });
  }

  function renderBreakdownCharts(recs, recsNoMonth, t) {
    const byAct = [...H.groupBy(recs.filter(r => r.stage !== 'dropped'), r => (r.activity || '—').toLowerCase().replace(/\s+/g, ' ').trim()).entries()]
      .map(([k, arr]) => ({ name: arr[0].activity, n: arr.length, tat: H.mean(arr.filter(r => r.tat != null && r.completed).map(r => r.tat)) }))
      .sort((a, b) => b.n - a.n).slice(0, 8);
    upsertChart('ch-activity', 'bar', { labels: byAct.map(a => a.name.length > 18 ? a.name.slice(0, 17) + '…' : a.name), datasets: [
      { type: 'bar', label: 'Volume', data: byAct.map(a => a.n), backgroundColor: '#6366f1', borderRadius: 5, yAxisID: 'y' },
      { type: 'line', label: 'Avg TAT (d)', data: byAct.map(a => a.tat == null ? null : H.r2(a.tat)), borderColor: '#06b6d4', backgroundColor: '#06b6d4', yAxisID: 'y1', spanGaps: true }
    ] }, { scales: { x: { grid: { display: false }, ticks: { maxRotation: 55, minRotation: 40 } }, y: { beginAtZero: true }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } } } });

    const st = [...H.groupBy(recs, r => r.state || 'Not specified').entries()].map(([k, a]) => [k, a.length]).sort((a, b) => b[1] - a[1]);
    const top = st.slice(0, 7), rest = st.slice(7).reduce((s, x) => s + x[1], 0);
    if (rest) top.push(['Others', rest]);
    upsertChart('ch-state', 'doughnut', { labels: top.map(x => x[0]), datasets: [{ data: top.map(x => x[1]), backgroundColor: PALETTE, borderWidth: 2, borderColor: '#0f131c' }] }, { cutout: '50%', plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } });

    const allMonths = E.monthlyStats(recsNoMonth, t).map(m => m.month).slice(-12);
    const bl = E.backlogSeries(recsNoMonth, allMonths, t);
    upsertChart('ch-backlog', 'line', { labels: bl.map(b => b.short), datasets: [{ label: 'Open at month-end', data: bl.map(b => b.open), borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,.15)', fill: true, tension: .3 }] }, { plugins: { legend: { display: false } }, scales: scales() });
  }

  function renderAgeing(recs, t) {
    const a = E.pendingAgeing(recs, t);
    setText('ageing-badge', `${a.openTotal} open${a.undated ? ` · ${a.undated} without assigned date` : ''}`);
    upsertChart('ch-ageing', 'bar', { labels: a.buckets.map(b => b.label), datasets: [{ label: 'Pending surveys', data: a.buckets.map(b => b.count), backgroundColor: ['#10b981', '#84cc16', '#f59e0b', '#fb923c', '#f43f5e'], borderRadius: 6 }] }, { plugins: { legend: { display: false } }, scales: scales() });
    setText('crit-sub', `${a.critical.length} surveys pending more than ${CFG.criticalPendingDays} days · oldest first (top 40)`);
    setHtml('crit-table', a.critical.length ? `<thead><tr><th>Survey ID</th><th>Vendor</th><th class="num">Age</th><th>Site / Location</th><th>Stage</th><th>Last updated</th></tr></thead><tbody>` +
      a.critical.slice(0, 40).map(r => `<tr><td><b>${esc(r.siteId)}</b><div class="dim" style="font-size:.7rem">${esc(r.activity)}</div></td><td>${vlink(r.vendorKey, r.vendor)}</td><td class="num"><span class="chip ${r.age > 60 ? 'crit' : 'warn'}">${r.age} d</span></td><td>${esc(r.siteName)}${r.state ? '<div class="dim" style="font-size:.7rem">' + esc(r.state) + '</div>' : ''}</td><td>${esc(r.statusRaw || E.STAGE_LABEL[r.stage])}</td><td class="muted">${r.lastUpdated ? fmtIso(r.lastUpdated.slice(0, 10)) : 'n/a (assigned ' + fmtIso(r.assignedDate) + ')'}</td></tr>`).join('') + '</tbody>'
      : '<tbody><tr><td class="empty">No critical pending surveys 🎉</td></tr></tbody>');
  }

  function renderWo(recs) {
    const by = H.groupBy(recs.filter(r => r.stage !== 'dropped'), r => r.vendorKey);
    const rows = state.vendors.map(v => { const a = by.get(v.vendorKey) || []; const rel = a.filter(r => r.woState === 'released').length; return { v, total: a.length, rel, not: a.length - rel }; });
    upsertChart('ch-wo', 'bar', { labels: rows.map(r => r.v.name), datasets: [
      { label: 'WO Released / Received', data: rows.map(r => r.rel), backgroundColor: '#10b981', borderRadius: 5 },
      { label: 'WO Not Released / Pending', data: rows.map(r => r.not), backgroundColor: '#ef4444', borderRadius: 5 }
    ] }, { plugins: { legend: { position: 'top' } }, interaction: { mode: 'index', intersect: false }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } } });
    setHtml('wo-cards', rows.map(r => `<div class="kpi-card" style="--accent:${r.v.color}"><div class="kpi-label">${r.v.icon} ${esc(r.v.name)}</div><div class="kpi-value">${fmtInt(r.total)}<small> orders</small></div><div class="kpi-sub">🟢 ${fmtInt(r.rel)} released · 🔴 ${fmtInt(r.not)} not released (${fmtPct(H.pct(r.rel, r.total))})</div><div class="bar"><i style="width:${H.pct(r.rel, r.total) || 0}%"></i></div></div>`).join(''));
  }

  function renderSiteTable() {
    if (!state.recs) return;
    let rows = state.recs;
    if (state.tWo !== 'all') rows = rows.filter(r => r.woState === state.tWo);
    if (state.tSearch) { const q = state.tSearch; rows = rows.filter(r => `${r.siteId} ${r.siteName} ${r.project} ${r.activity} ${r.remarks} ${r.vendor}`.toLowerCase().includes(q)); }
    rows = [...rows].sort((a, b) => (b.completedDate || b.assignedDate || '').localeCompare(a.completedDate || a.assignedDate || ''));
    const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    state.page = Math.min(state.page, pages);
    const slice = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    setText('rows-badge', `Showing ${fmtInt(rows.length)} records`);
    setText('page-info', `Page ${state.page} of ${pages} (${fmtInt(rows.length)} records)`);
    $('pg-prev').disabled = state.page <= 1; $('pg-next').disabled = state.page >= pages;
    setHtml('site-table', `<thead><tr><th>Vendor</th><th>Site ID</th><th>Site</th><th>Project</th><th>Activity</th><th>Assigned</th><th>Completed</th><th class="num">TAT</th><th class="num">Target</th><th>SLA</th><th>Status</th><th>WO</th><th>Remarks</th></tr></thead><tbody>` +
      (slice.map(r => `<tr><td>${vlink(r.vendorKey, r.vendor)}</td><td><b>${esc(r.siteId)}</b></td><td>${esc(r.siteName)}</td><td>${esc(r.project || '—')}</td><td>${esc(r.activity)}</td><td>${fmtIso(r.assignedDate)}</td><td>${fmtIso(r.completedDate)}</td><td class="num">${r.tat == null ? '—' : r.tat + ' d'}</td><td class="num">${r.target}${r.targetSource === 'default' ? '*' : ''} d</td><td>${r.sla ? `<span class="chip ${r.sla === 'In TAT' ? 'ok' : 'crit'}">${r.sla === 'In TAT' ? '✔' : '✖'} ${r.sla}</span>` : '<span class="chip none">—</span>'}</td><td>${esc(r.statusRaw || E.STAGE_LABEL[r.stage])}</td><td><span class="chip ${r.woState === 'released' ? 'ok' : 'warn'}">${r.woState === 'released' ? 'Released' : 'Not released'}</span></td><td class="muted" style="max-width:240px">${esc(r.remarks)}</td></tr>`).join('') || '<tr><td colspan="13" class="empty">No records match</td></tr>') + '</tbody>');
  }

  function renderCompliance(t) {
    const c = E.updateCompliance(state.vendors, t);
    const note = $('upd-note');
    if (c.anyInferred) {
      note.style.display = 'block';
      note.textContent = 'ℹ The source sheets have no “Last Updated” timestamp column, so update time is inferred (latest activity date, or Google Drive modified time when GOOGLE_API_KEY is configured). Add a “Last Updated” column to each vendor sheet for exact monitoring.';
    } else note.style.display = 'none';
    setHtml('upd-kpis', [
      kpiCard('Vendors Updating Today', `${c.updatingToday} <small>/ ${c.total}</small>`, 'updated within today', c.updatingToday === c.total ? 'ok' : 'warn'),
      kpiCard('Vendor Update Compliance', fmtPct(c.compliancePct), `${c.regular.length} of ${c.total} within ${CFG.updateThresholds.regularMaxDays} day(s)`, c.compliancePct >= 75 ? 'ok' : c.compliancePct >= 50 ? 'warn' : 'bad'),
      kpiCard('Vendors Not Updated Today', fmtInt(c.notToday), 'need follow-up if > threshold', c.notToday ? 'warn' : 'ok'),
      kpiCard('Longest Update Gap', c.longestGap == null ? '—' : `${c.longestGap} <small>day${c.longestGap === 1 ? '' : 's'}</small>`, c.notRegular[0] ? esc(c.notRegular[0].name) : 'all vendors current', c.longestGap > CFG.updateThresholds.attentionMaxDays ? 'bad' : c.longestGap > 1 ? 'warn' : 'ok')
    ].join(''));
    const ic = { LIVE: '●', ACTIVE: '●', MONITOR: '◐', DELAYED: '▲', INACTIVE: '✖', UNKNOWN: '?' };
    setHtml('upd-table', `<thead><tr><th>Vendor</th><th>Last Updated</th><th>Current Status</th><th class="num">Days Since Update</th><th>Update Compliance</th><th>Basis</th><th>Sheet</th></tr></thead><tbody>` +
      c.rows.map(r => { const v = state.vendors.find(x => x.vendorKey === r.vendorKey); return `<tr><td><span class="swatch" style="background:${r.color}"></span>${vlink(r.vendorKey, r.name)}</td><td>${esc(r.lastLabel)}<div class="dim" style="font-size:.7rem">${esc(r.lastUpdate ? r.lastUpdate.slice(0, 10) : '')}</div></td><td><span class="chip ${r.level}">${ic[r.status]} ${r.status}</span></td><td class="num">${r.days == null ? '—' : r.days}</td><td><span class="chip ${r.level}">${r.compliance}</span></td><td class="muted" style="font-size:.72rem">${esc(r.basis || 'unknown')}${r.inferred ? ' ⚠' : ''}</td><td><a href="${esc(v.sheetUrl)}" target="_blank" rel="noopener">Open ↗</a></td></tr>`; }).join('') + '</tbody>');
    setHtml('upd-good', c.regular.length ? c.regular.map(r => `<li>✔ <b>${esc(r.name)}</b> <span class="muted">— ${esc(r.lastLabel)}</span></li>`).join('') : '<li class="muted">No vendor is updating within the threshold.</li>');
    setHtml('upd-bad', c.notRegular.length ? c.notRegular.map(r => `<li>✖ <b>${esc(r.name)}</b> <span class="muted">— last update ${r.days == null ? 'unknown' : r.days + ' day' + (r.days === 1 ? '' : 's') + ' ago'}</span> <span class="chip ${r.level}">${r.compliance}</span></li>`).join('') : '<li class="muted">All vendors are updating regularly.</li>');
    const obs = $('observation'), txt = E.complianceComment(c);
    obs.className = 'observation ' + (c.notRegular.length ? (c.notRegular.some(x => x.level === 'crit' || x.level === 'warn') ? 'bad' : '') : 'good');
    setText('observation', txt);
  }

  function renderDq(t) {
    const dq = E.dataQuality(state.all, state.vendors, t);
    setText('dq-score', dq.score == null ? '—' : `Data Quality Score: ${H.r1(dq.score)}%`);
    setText('dq-issues', `Issues Found: ${fmtInt(dq.issueCount)} across ${fmtInt(dq.badRecords)} of ${fmtInt(dq.total)} records` + (dq.missingTimestampVendors.length ? ` · no “Last Updated” column: ${dq.missingTimestampVendors.join(', ')}` : ''));
    $('dq-bar').style.width = (dq.score || 0) + '%';
    $('dq-bar').style.background = dq.score >= 90 ? '#10b981' : dq.score >= 75 ? '#f59e0b' : '#f43f5e';
    setHtml('dq-types', dq.byType.map(([l, n]) => `<span class="chip stable">${esc(l)}: ${n}</span>`).join(''));
    setHtml('dq-table', `<thead><tr><th>Vendor</th><th class="num">Sheet row</th><th>Site ID</th><th>Issues</th></tr></thead><tbody>` + dq.problems.slice(0, CFG.dqMaxIssuesShown).map(p => `<tr><td>${esc(p.vendor)}</td><td class="num">${p.row}</td><td>${esc(p.siteId)}</td><td>${p.labels.map(l => `<span class="chip warn" style="margin:1px">${esc(l)}</span>`).join(' ')}</td></tr>`).join('') + '</tbody>');
    setText('dq-more', dq.problems.length > CFG.dqMaxIssuesShown ? `Showing first ${CFG.dqMaxIssuesShown} of ${dq.problems.length} problem records.` : '');
  }

  /* =================================================== VENDOR DRILL */
  let roster = null;
  async function openDrill(vendorKey) {
    const v = state.vendors.find(x => x.vendorKey === vendorKey); if (!v) return;
    const d = E.vendorDrill(state.all, vendorKey, v, now()), k = d.k;
    $('drill-title').innerHTML = `<span class="swatch" style="background:${v.color}"></span>${esc(v.icon)} ${esc(v.name)} — Vendor Performance`;
    const mini = [
      ['Total surveys', fmtInt(k.total)], ['Completed', fmtInt(k.completed)], ['Pending', fmtInt(k.pending)], ['Avg TAT', fmtDays(k.avgTat)], ['Median TAT', fmtDays(k.medianTat)],
      ['SLA %', fmtPct(k.slaPct)], ['Best TAT', k.bestTat == null ? '—' : k.bestTat + ' d'], ['Worst TAT', k.worstTat == null ? '—' : k.worstTat + ' d'], ['Current backlog', fmtInt(k.pending)],
      ['Last update', esc(d.update.lastLabel)], ['Update frequency', `${d.activeDays30} active days / 30`], ['Update status', `<span class="chip ${d.update.level}">${d.update.status}</span>`]
    ];
    $('drill-body').innerHTML = `
      <div class="kpi-grid">${mini.map(([l, val]) => kpiCard(l, val, '')).join('')}</div>
      <div class="grid-2"><div class="card"><div class="card-title">Monthly TAT trend</div><div class="chart-box"><canvas id="dr-tat"></canvas></div></div>
      <div class="card"><div class="card-title">Survey trend</div><div class="chart-box"><canvas id="dr-vol"></canvas></div></div></div>
      <div class="grid-2"><div class="card"><div class="card-title" style="margin-bottom:10px">Pending ageing</div><div class="table-wrap"><table><thead><tr><th>Bucket</th><th class="num">Pending</th></tr></thead><tbody>${d.ageing.buckets.map(b => `<tr><td>${b.label}</td><td class="num">${b.count}</td></tr>`).join('')}</tbody></table></div><div class="muted" style="font-size:.72rem;margin-top:6px">Oldest: ${d.ageing.oldest.map(o => esc(o.siteId) + ' (' + o.age + 'd)').join(', ') || '—'}</div></div>
      <div class="card"><div class="card-title" style="margin-bottom:10px">Month-on-month change</div><div class="table-wrap" style="max-height:240px;overflow-y:auto"><table><thead><tr><th>Month</th><th class="num">Avg TAT</th><th>Trend</th></tr></thead><tbody>${[...d.mc.rows].reverse().slice(0, 12).map(r => `<tr><td>${esc(r.label)}</td><td class="num">${fmtDays(r.avgTat)}</td><td>${trendChip(r.tatTrend)}</td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="card"><div class="card-title" style="margin-bottom:6px">Field team roster</div><div class="muted" style="font-size:.72rem;margin-bottom:8px">Static list from data/roster.json — not read from the sheets.</div><div id="dr-roster" class="muted">Loading…</div></div>`;
    $('drill').showModal();
    upsertChart('dr-tat', 'line', { labels: d.monthly.slice(-18).map(m => m.short), datasets: [{ label: 'Avg TAT (d)', data: d.monthly.slice(-18).map(m => m.avgTat == null ? null : H.r2(m.avgTat)), borderColor: v.color, backgroundColor: v.color + '33', fill: true, tension: .3, spanGaps: true }] }, { plugins: { legend: { display: false } }, scales: scales() });
    upsertChart('dr-vol', 'bar', { labels: d.monthly.slice(-18).map(m => m.short), datasets: [{ label: 'Completed', data: d.monthly.slice(-18).map(m => m.completed), backgroundColor: '#10b981', borderRadius: 4 }, { label: 'Pending', data: d.monthly.slice(-18).map(m => m.pending), backgroundColor: '#f59e0b', borderRadius: 4 }] }, { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } } });
    try {
      if (!roster) roster = await (await fetch('data/roster.json')).json();
      const list = roster.filter(p => p.vendor === v.name);
      $('dr-roster').innerHTML = list.length ? list.map(p => `<span class="chip none" style="margin:2px">${esc(p.name)} · ${esc(p.role)} · ${esc(p.location || '')}</span>`).join('') : 'No roster on file.';
    } catch (_) { $('dr-roster').textContent = 'Roster unavailable.'; }
  }
  $('drill').addEventListener('close', () => { destroyChart('dr-tat'); destroyChart('dr-vol'); });
  $('drill-close').addEventListener('click', () => $('drill').close());
  $('drill').addEventListener('click', e => { if (e.target === $('drill')) $('drill').close(); });
  document.addEventListener('click', e => { const b = e.target.closest('.vlink'); if (b) openDrill(b.dataset.vendor); });

  /* ============================================================ BOOT */
  bindFilters(); bindMonthPanel();
  window.TATApp = { state, loadData, renderAll };       // handy for debugging / tests
  loadData(false);
})();
