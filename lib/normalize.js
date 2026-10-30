/*
 * Data normalisation: raw CSV text of a vendor sheet -> canonical records.
 * Pure functions, no I/O – used by the Vercel API, the local dev server and
 * the test-suite. Works in Node and in the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config'));
  else root.TATNormalize = factory(root.TATConfig);
})(typeof self !== 'undefined' ? self : this, function (CFG) {

  /* ---------------------------------------------------------- CSV -- */
  function parseCsv(text) {
    const rows = [];
    let row = [], cur = '', inQ = false;
    if (text && text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  /* -------------------------------------------------------- DATES -- */
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const EMPTY_TOKENS = new Set(['', 'na', 'n/a', 'nil', '-', '--', '—', 'null', 'none', 'tbd', 'pending', 'hold', 'not applicable']);

  function iso(y, m, d) {
    if (y < 100) y += 2000;
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt.toISOString().slice(0, 10);
  }

  /** Returns { value: 'YYYY-MM-DD'|null, blank: bool, invalid: bool } */
  function parseDate(raw) {
    const s = (raw == null ? '' : String(raw)).trim();
    if (EMPTY_TOKENS.has(s.toLowerCase())) return { value: null, blank: true, invalid: false };
    let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return wrap(iso(+m[1], +m[2], +m[3]));
    if ((m = s.match(/^(\d{1,2})[-\s\/]([A-Za-z]{3})[a-z]*[-\s\/,]*(\d{2,4})/))) {
      const mo = MONTHS[m[2].toLowerCase()];
      return wrap(mo ? iso(+m[3], mo, +m[1]) : null);
    }
    if ((m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})/))) return wrap(iso(+m[3], +m[2], +m[1]));   // dd-mm-yyyy
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) {                                      // slash dates
      let a = +m[1], b = +m[2], day, mon;
      if (CFG.slashDateOrder === 'DMY') { day = a; mon = b; } else { mon = a; day = b; }
      if (mon > 12 && day <= 12) { const t = mon; mon = day; day = t; }                            // unambiguous swap
      return wrap(iso(+m[3], mon, day));
    }
    if (/^\d{5}(\.\d+)?$/.test(s)) {                                                               // Excel/Sheets serial
      const dt = new Date(Math.round((parseFloat(s) - 25569) * 86400000));
      return wrap(iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()));
    }
    return { value: null, blank: false, invalid: true };
    function wrap(v) { return v ? { value: v, blank: false, invalid: false } : { value: null, blank: false, invalid: true }; }
  }

  /** Last-updated cells may carry a time: keep full ISO timestamp when present. */
  function parseTimestamp(raw) {
    const s = (raw == null ? '' : String(raw)).trim();
    if (!s) return null;
    const d = parseDate(s);
    if (!d.value) return null;
    const t = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!t) return d.value + 'T00:00:00';
    let h = +t[1]; const mi = t[2], se = t[3] || '00';
    if (t[4]) { const pm = /pm/i.test(t[4]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return `${d.value}T${String(h).padStart(2, '0')}:${mi}:${se}`;
  }

  /* ------------------------------------------------------ HEADERS -- */
  const normHeader = h => String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  // canonical field -> header aliases (normalised), most specific first
  const ALIASES = {
    siteId:      ['site id', 'siteid', 'site code', 'survey id'],
    siteName:    ['site name', 'bts customer name', 'customer name', 'sitename'],
    project:     ['project name', 'project'],
    activity:    ['activity name', 'activity', 'delivery track', 'site scope'],
    region:      ['region'],
    state:       ['state', 'circle'],
    assigned:    ['loading date from wi team', 'loading date', 'site assigned date', 'activity receive date', 'assigned date', 'receive date'],
    perm:        ['permission required date', 'permission receive date', 'permission recieved date'],
    completed:   ['complete date', 'completed date', 'activity done date'],
    tat:         ['actual tat', 'pns tat in days', 'survey tat', 'tat'],
    target:      ['wi tat standard', 'tcl standard tat days', 'tcl standard tat', 'standard tat', 'wi tat'],
    tatRemark:   ['tat remarks'],
    status:      ['status', 'installatio wip', 'installation wip', 'wip'],
    remarks:     ['remarks', 'remark s', 'remarks 1'],
    woStatus:    ['work order status', 'wo status'],
    aging:       ['aging', 'agging'],
    lastUpdated: ['last updated', 'last update', 'last updated date', 'last updated on', 'updated on', 'update date', 'update timestamp', 'modified date', 'last modified', 'survey update date']
  };

  function mapColumns(headerRow) {
    const norm = headerRow.map(normHeader);
    const used = new Set(), map = {};
    for (const field of Object.keys(ALIASES)) {
      for (const alias of ALIASES[field]) {
        const idx = norm.findIndex((h, i) => h === alias && !used.has(i));
        if (idx !== -1) { map[field] = idx; used.add(idx); break; }
      }
    }
    return map;
  }

  /* -------------------------------------------------- CLASSIFIERS -- */
  const num = v => {
    const s = String(v == null ? '' : v).trim().replace(/,/g, '');
    if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
    return parseFloat(s);
  };

  function classifyStage(statusRaw, hasCompletedDate) {
    const s = (statusRaw || '').toLowerCase();
    if (/drop|cancel|not required/.test(s) && !hasCompletedDate) return 'dropped';
    if (hasCompletedDate) return 'completed';
    if (/hold/.test(s)) return 'hold';
    if (/(fully )?complete|done|migrat|released/.test(s) && !/in ?complete|not complete|partial/.test(s)) return 'completed';
    if (/wip|progress|partial|incomplete|started/.test(s)) return 'wip';
    return 'pending';
  }

  function classifyWo(woRaw, completed, statusRaw) {
    const w = (woRaw || '').toLowerCase().trim();
    if (['not release', 'not released', 'pending', 'not received'].includes(w)) return 'not_released';
    if (['release', 'released', 'not required', 'dropped', 'received'].includes(w)) return 'released';
    const st = (statusRaw || '').toLowerCase();
    if (completed || /complete|done|migrat/.test(st)) return 'released';
    return 'not_released';
  }

  function classifySlaFromRemark(txt) {
    const t = (txt || '').toLowerCase();
    if (!t) return null;
    if (/outside|delay|breach|beyond/.test(t)) return 'Outside TAT';
    if (/within|^in tat|in tat$/.test(t)) return 'In TAT';
    return null;
  }

  function monthOf(isoDate) { return isoDate ? isoDate.slice(0, 7) : null; }

  /* ------------------------------------------------------- NORMALISE -- */
  /**
   * @param {string} csvText   raw CSV export of a vendor sheet tab
   * @param {object} vendor    entry of TATConfig.vendors
   * @returns {{records:Array, meta:object}}
   */
  function normalizeVendorCsv(csvText, vendor) {
    const matrix = parseCsv(csvText);
    // header row = first row with >= 4 non-empty cells
    let hIdx = matrix.findIndex(r => r.filter(c => String(c).trim()).length >= 4);
    if (hIdx === -1) return { records: [], meta: emptyMeta(vendor, 'No header row found') };
    const headers = matrix[hIdx];
    const col = mapColumns(headers);
    const get = (row, f) => (col[f] != null ? (row[col[f]] == null ? '' : String(row[col[f]]).trim()) : '');

    const records = [];
    const todayIso = new Date().toISOString().slice(0, 10);
    let lastUpdatedMax = null, lastActivity = null;

    for (let i = hIdx + 1; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row || row.every(c => !String(c).trim())) continue;
      const siteId = get(row, 'siteId'), siteName = get(row, 'siteName');
      if (!siteId && !siteName) continue;

      const issues = [];
      const dA = parseDate(get(row, 'assigned')), dP = parseDate(get(row, 'perm')), dC = parseDate(get(row, 'completed'));
      if (dA.invalid) issues.push('invalid_date:assigned');
      if (dC.invalid) issues.push('invalid_date:completed');
      if (dP.invalid && col.perm != null) issues.push('invalid_date:permission');
      for (const [d, f] of [[dA, 'assigned'], [dP, 'permission'], [dC, 'completed']]) {
        if (d.value && +d.value.slice(0, 4) < CFG.minPlausibleYear) { issues.push('implausible_date:' + f); d.value = null; }
      }
      if (dA.value && dC.value && dC.value < dA.value) issues.push('completed_before_assigned');

      const statusRaw = get(row, 'status');
      const stage = classifyStage(statusRaw, !!dC.value);
      const completed = stage === 'completed';
      if (completed && !dC.value) issues.push('missing_completed_date');
      if (!dA.value && !dA.invalid) issues.push('missing_assigned_date');

      let tat = num(get(row, 'tat'));
      const rawTat = get(row, 'tat');
      if (tat == null && completed) issues.push('missing_tat');
      if (tat != null && tat < 0) { if (dC.value) issues.push('negative_tat'); tat = null; }   // negative with no done date = blank-cell formula artefact
      else if (tat != null && tat > CFG.maxPlausibleTatDays) { issues.push('implausible_tat'); tat = null; }
      if (rawTat && num(rawTat) == null) issues.push('non_numeric_tat');

      let target = num(get(row, 'target')), targetSource = 'sheet';
      if (!(target > 0)) { target = CFG.defaultTargetTatDays; targetSource = 'default'; }

      const tatRemark = get(row, 'tatRemark');
      let sla = null;
      if (completed && tat != null) {
        sla = tat <= target ? 'In TAT' : 'Outside TAT';          // rule applied identically for every vendor
      }

      const lu = col.lastUpdated != null ? parseTimestamp(get(row, 'lastUpdated')) : null;
      if (lu && (!lastUpdatedMax || lu > lastUpdatedMax)) lastUpdatedMax = lu;
      for (const d of [dC.value, dA.value]) if (d && d <= todayIso && (!lastActivity || d > lastActivity)) lastActivity = d;   // future dates are typos, not activity

      const reportDate = CFG.monthBasis === 'assigned'
        ? (dA.value || dC.value)
        : (completed ? (dC.value || dA.value) : (dA.value || dC.value));

      records.push({
        vendor: vendor.name,
        vendorKey: vendor.key,
        row: i + 1,
        siteId, siteName,
        project: get(row, 'project'),
        activity: get(row, 'activity') || '—',
        region: get(row, 'region'),
        state: get(row, 'state'),
        assignedDate: dA.value,
        permDate: dP.value,
        completedDate: dC.value,
        tat, target, targetSource,
        sla,
        tatRemark,
        statusRaw,
        stage,
        completed,
        woState: classifyWo(get(row, 'woStatus'), completed, statusRaw),
        woRaw: get(row, 'woStatus'),
        remarks: get(row, 'remarks'),
        sheetAging: num(get(row, 'aging')),
        lastUpdated: lu,
        month: monthOf(reportDate),
        issues
      });
    }

    const missing = Object.keys(ALIASES).filter(f => col[f] == null);
    return {
      records,
      meta: {
        vendor: vendor.name, vendorKey: vendor.key,
        rows: records.length,
        columns: Object.fromEntries(Object.entries(col).map(([f, i]) => [f, headers[i]])),
        unmappedFields: missing,
        hasLastUpdatedColumn: col.lastUpdated != null,
        lastUpdatedColumnMax: lastUpdatedMax,
        lastActivityDate: lastActivity
      }
    };
  }

  function emptyMeta(vendor, error) {
    return { vendor: vendor.name, vendorKey: vendor.key, rows: 0, columns: {}, unmappedFields: [], hasLastUpdatedColumn: false, lastUpdatedColumnMax: null, lastActivityDate: null, error };
  }

  return { parseCsv, parseDate, parseTimestamp, normalizeVendorCsv, mapColumns, ALIASES, emptyMeta };
});
