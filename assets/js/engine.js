/*
 * Analytics engine – pure functions (no DOM).  Records in, numbers/insights out.
 * Sections: helpers · filtering · KPI/TAT · vendor · month · insights ·
 *           executive summary · update compliance · data quality · ageing
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../lib/config'));
  else root.TATEngine = factory(root.TATConfig);
})(typeof self !== 'undefined' ? self : this, function (CFG) {

  /* ============================================================ helpers */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const localIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayNum = iso => Math.floor(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 864e5);
  const daysBetween = (fromIso, toIso) => dayNum(toIso) - dayNum(fromIso);
  const monthLabel = ym => ym ? `${['January','February','March','April','May','June','July','August','September','October','November','December'][+ym.slice(5) - 1]} ${ym.slice(0, 4)}` : '—';
  const monthShort = ym => ym ? `${MON[+ym.slice(5) - 1]} ${ym.slice(2, 4)}` : '—';
  const addMonths = (ym, n) => { const t = (+ym.slice(0, 4)) * 12 + (+ym.slice(5) - 1) + n; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`; };
  const monthEnd = ym => `${ym}-${String(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5), 0)).getUTCDate()).padStart(2, '0')}`;
  const sum = a => a.reduce((x, y) => x + y, 0);
  const mean = a => a.length ? sum(a) / a.length : null;
  const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(sum(a.map(x => (x - m) ** 2)) / (a.length - 1)); };
  const pct = (a, b) => b > 0 ? (a / b) * 100 : null;
  const r1 = x => x == null ? null : Math.round(x * 10) / 10;
  const r2 = x => x == null ? null : Math.round(x * 100) / 100;
  const groupBy = (arr, fn) => { const m = new Map(); for (const x of arr) { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
  const isOpen = r => r.stage === 'pending' || r.stage === 'wip' || r.stage === 'hold';

  /** change of a metric where LOWER is better (TAT). */
  function trendOf(prev, cur, lowerIsBetter = true) {
    if (prev == null || cur == null || prev === 0) return { dir: 'na', label: 'No comparison', icon: '–', pct: null };
    const change = ((cur - prev) / prev) * 100;
    if (Math.abs(change) < CFG.stableBandPct) return { dir: 'stable', label: 'Stable', icon: '→', pct: change };
    const better = lowerIsBetter ? change < 0 : change > 0;
    return better ? { dir: 'up', label: 'Improving', icon: '↑', pct: change } : { dir: 'down', label: 'Deteriorating', icon: '↓', pct: change };
  }

  /* =========================================================== filtering */
  const TAT_CATS = [
    { key: 'fast',   label: 'Fast (≤ 2d)',      test: t => t <= 2 },
    { key: 'normal', label: 'Normal (3–5d)',    test: t => t > 2 && t <= 5 },
    { key: 'slow',   label: 'Slow (6–10d)',     test: t => t > 5 && t <= 10 },
    { key: 'vslow',  label: 'Very slow (> 10d)', test: t => t > 10 }
  ];
  const STAGE_LABEL = { completed: 'Completed', pending: 'Pending', wip: 'WIP', hold: 'On Hold', dropped: 'Dropped' };

  function applyFilters(records, f) {
    const has = s => s && s.size > 0;
    return records.filter(r => {
      if (has(f.months) && !f.months.has(r.month)) return false;
      if (has(f.vendors) && !f.vendors.has(r.vendorKey)) return false;
      if (has(f.regions) && !f.regions.has(r.region || '—')) return false;
      if (has(f.states) && !f.states.has(r.state || '—')) return false;
      if (has(f.projects) && !f.projects.has(r.project || '—')) return false;
      if (f.stage && f.stage !== 'all') {
        if (f.stage === 'open' ? !isOpen(r) : r.stage !== f.stage) return false;
      }
      if (f.sla && f.sla !== 'all') {
        if (f.sla === 'in' && r.sla !== 'In TAT') return false;
        if (f.sla === 'out' && r.sla !== 'Outside TAT') return false;
      }
      if (f.tatCat && f.tatCat !== 'all') {
        const c = TAT_CATS.find(x => x.key === f.tatCat);
        if (r.tat == null || !c.test(r.tat)) return false;
      }
      return true;
    });
  }

  function distinct(records, field) {
    return [...new Set(records.map(r => r[field] || '—'))].sort((a, b) => a.localeCompare(b));
  }

  /** Selectable months: months with data that are not in the future. */
  function availableMonths(records, now) {
    const cur = localIso(now).slice(0, 7);
    return [...new Set(records.map(r => r.month).filter(m => m && m <= cur))].sort();
  }

  function monthPresets(months, now) {
    const cur = localIso(now).slice(0, 7);
    const last = lastCompletedMonth(months, now);
    const lastN = n => { const sel = months.filter(m => m < cur).slice(-n); return sel; };
    return {
      all: [],
      current: months.includes(cur) ? [cur] : [],
      last: last ? [last] : [],
      last3: lastN(3),
      last6: lastN(6)
    };
  }

  /** Latest month present in the data that is already over (not the running calendar month). */
  function lastCompletedMonth(months, now) {
    const cur = localIso(now).slice(0, 7);
    const done = months.filter(m => m < cur);
    return done.length ? done[done.length - 1] : (months.length ? months[months.length - 1] : null);
  }

  /* ============================================================= KPIs */
  function kpis(recs, now) {
    const today = localIso(now);
    const total = recs.length;
    const dropped = recs.filter(r => r.stage === 'dropped').length;
    const completedRecs = recs.filter(r => r.stage === 'completed');
    const openRecs = recs.filter(isOpen);
    const tats = completedRecs.map(r => r.tat).filter(t => t != null);
    const inTat = completedRecs.filter(r => r.sla === 'In TAT').length;
    const outTat = completedRecs.filter(r => r.sla === 'Outside TAT').length;
    const active = total - dropped;
    const ages = openRecs.filter(r => r.assignedDate && r.assignedDate <= today).map(r => daysBetween(r.assignedDate, today));
    return {
      total, dropped, active,
      completed: completedRecs.length,
      pending: openRecs.length,
      wip: recs.filter(r => r.stage === 'wip').length,
      hold: recs.filter(r => r.stage === 'hold').length,
      completionPct: pct(completedRecs.length, active),
      tatSample: tats.length,
      avgTat: mean(tats), medianTat: median(tats),
      bestTat: tats.length ? Math.min(...tats) : null,
      worstTat: tats.length ? Math.max(...tats) : null,
      inTat, outTat, delayed: outTat,
      slaPct: pct(inTat, inTat + outTat),
      avgTarget: mean(completedRecs.map(r => r.target)),
      avgPendingAge: mean(ages),
      oldestPending: ages.length ? Math.max(...ages) : null
    };
  }

  /* ============================================================ vendor */
  const MIN_SAMPLE = 5;   // vendors with fewer completed TAT samples aren't ranked

  function vendorTable(recs, vendors, now) {
    const by = groupBy(recs, r => r.vendorKey);
    const rows = vendors.map(v => {
      const k = kpis(by.get(v.vendorKey) || [], now);
      return { vendorKey: v.vendorKey, name: v.name, color: v.color, icon: v.icon, ...k };
    });
    const ranked = rows.filter(r => r.avgTat != null && r.tatSample >= MIN_SAMPLE).sort((a, b) => a.avgTat - b.avgTat);
    ranked.forEach((r, i) => { r.rank = i + 1; });
    rows.forEach(r => { if (!r.rank) r.rank = null; });
    const total = sum(rows.map(r => r.total)), pend = sum(rows.map(r => r.pending)), del = sum(rows.map(r => r.delayed));
    rows.forEach(r => { r.pendingShare = pct(r.pending, pend); r.delayShare = pct(r.delayed, del); r.shareOfTotal = pct(r.total, total); });
    return rows.sort((a, b) => (a.rank || 99) - (b.rank || 99));
  }

  /* ============================================================= month */
  function monthlyStats(recs, now) {
    const cur = localIso(now).slice(0, 7);   // future-dated records never form a month
    const by = groupBy(recs.filter(r => r.month && r.month <= cur), r => r.month);
    return [...by.keys()].sort().map(m => ({ month: m, label: monthLabel(m), short: monthShort(m), ...kpis(by.get(m), now) }));
  }

  /** Month-on-month comparison over the months present in `monthly` (ascending). */
  function monthComparison(monthly) {
    const rows = monthly.map((m, i) => {
      const prev = i > 0 ? monthly[i - 1] : null;
      return { ...m, tatTrend: trendOf(prev && prev.avgTat, m.avgTat, true), slaTrend: trendOf(prev && prev.slaPct, m.slaPct, false) };
    });
    const withTat = rows.filter(r => r.avgTat != null && r.tatSample >= 3);
    const best = withTat.length ? withTat.reduce((a, b) => b.avgTat < a.avgTat ? b : a) : null;
    const worst = withTat.length ? withTat.reduce((a, b) => b.avgTat > a.avgTat ? b : a) : null;
    const first = withTat[0], last = withTat[withTat.length - 1];
    return { rows, best, worst, overall: first && last && first !== last ? trendOf(first.avgTat, last.avgTat, true) : null };
  }

  /** Open backlog at the end of each month (assigned on/before month end, not yet done by then). */
  function backlogSeries(recs, months, now) {
    const today = localIso(now);
    return months.map(m => {
      const end = monthEnd(m) > today ? today : monthEnd(m);
      const n = recs.filter(r => r.stage !== 'dropped' && r.assignedDate && r.assignedDate <= end && (!r.completedDate || r.completedDate > end)).length;
      return { month: m, short: monthShort(m), open: n };
    });
  }

  /* ========================================================== insights */
  function insights(recs, vendors, now) {
    const out = [];
    const add = (type, title, text) => out.push({ type, title, text });   // type: good | bad | info
    const vt = vendorTable(recs, vendors, now);
    const ranked = vt.filter(v => v.rank);
    if (!recs.length) return [{ type: 'info', title: 'No data', text: 'No records match the current filters.' }];

    if (ranked.length >= 2) {
      const lo = ranked[0], hi = ranked[ranked.length - 1];
      add('good', 'Lowest TAT', `${lo.name} has the lowest average TAT at ${r1(lo.avgTat)} days (${lo.tatSample} completed surveys).`);
      add('bad', 'Highest TAT', `${hi.name} has the highest average TAT at ${r1(hi.avgTat)} days — ${r1(hi.avgTat / lo.avgTat)}× ${lo.name}.`);
    }

    // improvement / deterioration: latest two months with ≥3 samples per vendor
    const moves = [];
    for (const v of vendors) {
      const m = monthlyStats(recs.filter(r => r.vendorKey === v.vendorKey), now).filter(x => x.tatSample >= 3 && x.avgTat != null);
      if (m.length >= 2) { const p = m[m.length - 2], c = m[m.length - 1]; moves.push({ v, p, c, change: ((c.avgTat - p.avgTat) / p.avgTat) * 100 }); }
    }
    const imp = moves.filter(x => x.change <= -CFG.stableBandPct).sort((a, b) => a.change - b.change)[0];
    const det = moves.filter(x => x.change >= CFG.stableBandPct).sort((a, b) => b.change - a.change)[0];
    if (imp) add('good', 'Most improved', `${imp.v.name} improved its average TAT by ${r1(Math.abs(imp.change))}% (${r1(imp.p.avgTat)} → ${r1(imp.c.avgTat)} days, ${imp.p.short} → ${imp.c.short}).`);
    if (det) add('bad', 'Deteriorating', `${det.v.name}'s average TAT worsened by ${r1(det.change)}% (${r1(det.p.avgTat)} → ${r1(det.c.avgTat)} days, ${det.p.short} → ${det.c.short}).`);

    const mostDelay = [...vt].sort((a, b) => b.delayed - a.delayed)[0];
    if (mostDelay && mostDelay.delayed > 0) add('bad', 'Largest delay contributor', `${mostDelay.name} accounts for ${r1(mostDelay.delayShare)}% of all surveys completed outside TAT (${mostDelay.delayed}).`);
    const mostPend = [...vt].sort((a, b) => b.pending - a.pending)[0];
    if (mostPend && mostPend.pending > 0) add('bad', 'Attention required', `${mostPend.name} currently contributes ${r1(mostPend.pendingShare)}% of all pending surveys (${mostPend.pending}).`);
    const steady = vt.filter(v => v.slaPct != null && v.slaPct >= 90 && (v.inTat + v.outTat) >= 20).sort((a, b) => b.slaPct - a.slaPct)[0];
    if (steady) add('good', 'Consistent SLA', `${steady.name} meets SLA on ${r1(steady.slaPct)}% of ${steady.inTat + steady.outTat} completed surveys.`);

    const mc = monthComparison(monthlyStats(recs, now));
    if (mc.best && mc.worst && mc.best.month !== mc.worst.month) {
      add('good', 'Best month', `${mc.best.label} had the best average TAT (${r1(mc.best.avgTat)} days).`);
      add('bad', 'Worst month', `${mc.worst.label} had the weakest average TAT (${r1(mc.worst.avgTat)} days).`);
    }

    // backlog direction (last 3 month-ends)
    const ms = monthlyStats(recs, now).map(m => m.month);
    if (ms.length >= 2) {
      const bl = backlogSeries(recs, ms.slice(-3), now);
      const a = bl[0].open, b = bl[bl.length - 1].open;
      if (b > a * 1.05 && b - a >= 3) add('bad', 'Growing backlog', `Open backlog grew from ${a} (${bl[0].short}) to ${b} (${bl[bl.length - 1].short}).`);
      else if (b < a * 0.95 && a - b >= 3) add('good', 'Declining backlog', `Open backlog fell from ${a} (${bl[0].short}) to ${b} (${bl[bl.length - 1].short}).`);
    }

    // abnormal TAT spikes: vendor-month averages vs that vendor's own history
    const spikes = [];
    for (const v of vendors) {
      const m = monthlyStats(recs.filter(r => r.vendorKey === v.vendorKey), now).filter(x => x.tatSample >= 3 && x.avgTat != null);
      if (m.length < 4) continue;
      const vals = m.map(x => x.avgTat), mu = mean(vals), s = sd(vals);
      for (const x of m) if (x.avgTat > mu + CFG.spikeStdDevs * s && x.avgTat >= CFG.spikeMinFactor * mu) spikes.push({ v, x, mu });
    }
    spikes.sort((a, b) => b.x.avgTat / b.mu - a.x.avgTat / a.mu).slice(0, 2).forEach(s =>
      add('bad', 'TAT spike', `${s.v.name}'s TAT spiked to ${r1(s.x.avgTat)} days in ${s.x.label} versus its ${r1(s.mu)}-day norm.`));
    return out;
  }

  /* ================================================== executive summary */
  function executiveSummary(allRecs, vendors, now) {
    const months = availableMonths(allRecs, now);
    const m = lastCompletedMonth(months, now);
    if (!m) return null;
    const prevM = months.filter(x => x < m).pop() || null;
    const cur = allRecs.filter(r => r.month === m), prev = prevM ? allRecs.filter(r => r.month === prevM) : [];
    const k = kpis(cur, now), pk = prevM ? kpis(prev, now) : null;
    const vt = vendorTable(cur, vendors, now).filter(v => v.avgTat != null && v.tatSample >= 3).sort((a, b) => a.avgTat - b.avgTat);
    const best = vt[0], worst = vt.length > 1 ? vt[vt.length - 1] : null;
    const tr = trendOf(pk && pk.avgTat, k.avgTat, true);
    const pendShare = vendorTable(cur, vendors, now).filter(v => v.pending > 0).sort((a, b) => b.pending - a.pending);

    const bits = [];
    if (tr.dir === 'up') bits.push(`Average TAT improved ${r1(Math.abs(tr.pct))}% versus ${monthLabel(prevM)}`);
    else if (tr.dir === 'down') bits.push(`Average TAT worsened ${r1(tr.pct)}% versus ${monthLabel(prevM)}`);
    else if (tr.dir === 'stable') bits.push(`Average TAT was stable versus ${monthLabel(prevM)}`);
    if (k.completionPct != null) bits.push(`${r1(k.completionPct)}% of surveys were completed`);
    const lagging = vt.filter(v => v.slaPct != null && v.slaPct < 70).map(v => v.name);
    if (worst && worst !== best) bits.push(`${worst.name}${lagging.length > 1 ? ' and ' + lagging.filter(n => n !== worst.name)[0] : ''} carried the longest turnaround`);
    if (pendShare[0] && pendShare[0].pending > 0) bits.push(`${pendShare[0].name} holds the largest open backlog (${pendShare[0].pending})`);
    const observation = bits.length ? bits.join('; ') + '.' : 'Not enough data to draw an observation.';

    return { month: m, label: monthLabel(m), prevMonth: prevM, prevLabel: prevM ? monthLabel(prevM) : null, k, pk, trend: tr, best, worst, observation };
  }

  /* ====================================================== update compliance */
  function relativeTime(lastIso, now) {
    const today = localIso(now), d = daysBetween(lastIso, today);
    const hasTime = lastIso.length > 10 && !lastIso.endsWith('T00:00:00');
    const t = hasTime ? new Date(lastIso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    const word = d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
    return t ? `${word} ${t}` : word;
  }

  function updateCompliance(vendorMeta, now) {
    const T = CFG.updateThresholds, today = localIso(now);
    const rows = vendorMeta.map(v => {
      let days = null, status = 'UNKNOWN', compliance = 'No data', level = 'none';
      if (v.lastUpdate) {
        days = Math.max(0, daysBetween(v.lastUpdate, today));
        if (days === 0)               { status = 'LIVE';     compliance = 'Regular';         level = 'ok'; }
        else if (days <= T.regularMaxDays) { status = 'ACTIVE';   compliance = 'Regular';         level = 'ok'; }
        else if (days <= T.monitorMaxDays) { status = 'MONITOR';  compliance = 'Monitor';         level = 'watch'; }
        else if (days <= T.attentionMaxDays) { status = 'DELAYED';  compliance = 'Needs Attention'; level = 'warn'; }
        else                          { status = 'INACTIVE'; compliance = 'Critical';        level = 'crit'; }
      }
      return {
        vendorKey: v.vendorKey, name: v.name, color: v.color, lastUpdate: v.lastUpdate, basis: v.lastUpdateBasis,
        inferred: !v.lastUpdateBasis || /inferred/.test(v.lastUpdateBasis),
        lastLabel: v.lastUpdate ? relativeTime(v.lastUpdate, now) : '—',
        days, status, compliance, level, fetch: v.fetch
      };
    });
    const known = rows.filter(r => r.days != null);
    const regular = rows.filter(r => r.level === 'ok');
    const today0 = rows.filter(r => r.days === 0);
    const notRegular = rows.filter(r => r.level !== 'ok').sort((a, b) => (b.days ?? 999) - (a.days ?? 999));
    return {
      rows, regular, notRegular,
      total: rows.length,
      updatingToday: today0.length,
      notToday: rows.length - today0.length,
      compliancePct: pct(regular.length, rows.length),
      longestGap: known.length ? Math.max(...known.map(r => r.days)) : null,
      anyInferred: rows.some(r => r.inferred)
    };
  }

  function complianceComment(c) {
    if (!c.total) return 'No vendors configured.';
    const bad = c.notRegular;
    if (!bad.length) return 'All vendors have updated the survey tracker within the required timeframe. No immediate follow-up is required.' + (c.anyInferred ? ' (Update time inferred from latest sheet activity.)' : '');
    const T = CFG.updateThresholds;
    const names = bad.map(b => b.name);
    const list = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    const worst = bad[0];
    const lead = `${c.regular.length} of ${c.total} vendors have updated their records within the expected timeframe (${r1(c.compliancePct)}% compliance).`;
    const crit = bad.filter(b => b.level === 'crit' || b.level === 'warn');
    let tail;
    if (crit.length) tail = `${list} ${names.length === 1 ? 'has' : 'have'} not provided updates for more than ${T.monitorMaxDays} days (longest gap: ${worst.name}, ${worst.days} days) and should be followed up immediately; stale entries may affect the accuracy of TAT reporting.`;
    else tail = `${list} ${names.length === 1 ? 'is' : 'are'} slightly behind and should be monitored.`;
    const caveat = c.anyInferred ? ' Note: update time is inferred from the latest activity date in the sheet; add a "Last Updated" column (or set GOOGLE_API_KEY) for exact times.' : '';
    return `${lead} ${tail}${caveat}`;
  }

  /* ======================================================== data quality */
  const ISSUE_LABEL = {
    missing_vendor: 'Missing vendor name', missing_assigned_date: 'Missing assigned date', missing_completed_date: 'Completed but no completion date',
    missing_tat: 'Completed but TAT missing', negative_tat: 'Negative TAT', implausible_tat: 'Implausible TAT value', non_numeric_tat: 'TAT is not a number',
    blank_status: 'Blank status', duplicate: 'Duplicate survey record', future_date: 'Date in the future', completed_before_assigned: 'Completed before assigned',
    'invalid_date': 'Invalid date', 'implausible_date': 'Implausible (typo) date'
  };
  const issueLabel = code => { const [base, field] = code.split(':'); return (ISSUE_LABEL[base] || base) + (field ? ` (${field})` : ''); };

  function dataQuality(recs, vendorMeta, now) {
    const today = localIso(now);
    const keyOf = r => [r.vendorKey, r.siteId, r.activity, r.assignedDate, r.completedDate, r.tat].join('|');
    const seen = new Map();
    recs.forEach(r => seen.set(keyOf(r), (seen.get(keyOf(r)) || 0) + 1));
    const dupSeen = new Set();
    const problems = [];
    let issueCount = 0, badRecords = 0;
    for (const r of recs) {
      const codes = [...r.issues];
      if (!r.vendor) codes.push('missing_vendor');
      if (!r.statusRaw) codes.push('blank_status');
      for (const f of ['assignedDate', 'permDate', 'completedDate']) if (r[f] && r[f] > today) { codes.push('future_date:' + f.replace('Date', '')); }
      const k = keyOf(r);
      if (seen.get(k) > 1) { if (dupSeen.has(k)) codes.push('duplicate'); else dupSeen.add(k); }
      if (codes.length) { badRecords++; issueCount += codes.length; problems.push({ vendor: r.vendor, row: r.row, siteId: r.siteId, codes, labels: codes.map(issueLabel) }); }
    }
    const missingTs = vendorMeta.filter(v => !v.hasLastUpdatedColumn);
    return {
      total: recs.length, badRecords, issueCount,
      score: recs.length ? ((recs.length - badRecords) / recs.length) * 100 : null,
      problems,
      byType: Object.entries(problems.reduce((m, p) => { p.codes.forEach(c => { const l = issueLabel(c); m[l] = (m[l] || 0) + 1; }); return m; }, {})).sort((a, b) => b[1] - a[1]),
      missingTimestampVendors: missingTs.map(v => v.name)
    };
  }

  /* ============================================================= ageing */
  function pendingAgeing(recs, now) {
    const today = localIso(now);
    const open = recs.filter(isOpen).map(r => ({ ...r, age: r.assignedDate && r.assignedDate <= today ? daysBetween(r.assignedDate, today) : null }));
    const dated = open.filter(r => r.age != null);
    const buckets = CFG.ageingBuckets.map(b => ({ label: b.label, count: dated.filter(r => r.age >= b.min && r.age <= b.max).length }));
    const critical = dated.filter(r => r.age > CFG.criticalPendingDays).sort((a, b) => b.age - a.age);
    return { buckets, undated: open.length - dated.length, openTotal: open.length, critical, oldest: dated.sort((a, b) => b.age - a.age).slice(0, 5) };
  }

  /* ========================================================== drill-down */
  function vendorDrill(allRecs, vendorKey, vendorMeta, now) {
    const recs = allRecs.filter(r => r.vendorKey === vendorKey);
    const today = localIso(now);
    const k = kpis(recs, now);
    const monthly = monthlyStats(recs, now);
    const mc = monthComparison(monthly);
    const cutoff = localIso(new Date(now.getTime() - 30 * 864e5));
    const activeDays = new Set();
    recs.forEach(r => { [r.assignedDate, r.completedDate].forEach(d => { if (d && d >= cutoff && d <= today) activeDays.add(d); }); });
    return {
      k, monthly, mc, recs,
      ageing: pendingAgeing(recs, now),
      backlog: backlogSeries(recs, monthly.map(m => m.month).filter(m => m <= today.slice(0, 7)).slice(-12), now),
      activeDays30: activeDays.size,
      update: updateCompliance([vendorMeta], now).rows[0]
    };
  }

  return {
    helpers: { localIso, daysBetween, monthLabel, monthShort, addMonths, r1, r2, median, mean, pct, trendOf, isOpen, groupBy },
    TAT_CATS, STAGE_LABEL,
    applyFilters, distinct, availableMonths, monthPresets, lastCompletedMonth,
    kpis, vendorTable, monthlyStats, monthComparison, backlogSeries,
    insights, executiveSummary, updateCompliance, complianceComment, dataQuality, issueLabel, pendingAgeing, vendorDrill
  };
});
