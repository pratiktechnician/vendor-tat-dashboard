/*
 * Shared configuration (works in Node and in the browser).
 * Everything an operator might want to tune lives here – nothing else in the
 * code base hard-codes vendor names, thresholds or refresh intervals.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TATConfig = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    /* ---- DATA SOURCES -------------------------------------------------
     * One entry per vendor Google Sheet. `gid` is the tab that holds the
     * survey rows (NOT the pivot/summary tab). Add a vendor = add a line.
     * Sheets must be shared "Anyone with the link – Viewer" for the CSV
     * export to work without credentials.
     */
    vendors: [
      { key: 'saesha',   name: 'Saesha Power', sheetId: '1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8', gid: '802337370',  color: '#10b981', icon: '⚡' },
      { key: 'pns',      name: 'PNS Telecom',  sheetId: '1Yvowk4tAm_Z0lKFqsIJ-RFMaOduwfBzlbKc7nSq1qMA', gid: '723949951',  color: '#6366f1', icon: '📡' },
      { key: 'ripl',     name: 'RIPL',         sheetId: '1Fa3lKVvWxL3WIWxnIhm-TpcgWm1gKWYLoGZHyvFU18c', gid: '880649132',  color: '#f59e0b', icon: '🔧' },
      { key: 'malfonic', name: 'Malfonic',     sheetId: '15Ka8mS44lxKD9pg0e8bWOebmpsibFC29J0z73skMkr8', gid: '1494733568', color: '#06b6d4', icon: '📶' }
    ],

    /* ---- REFRESH ---------------------------------------------------- */
    refreshIntervalSec: 45,          // browser polling (30-60s recommended)
    staleAfterSec: 180,              // connection badge turns red after this

    /* ---- TAT / SLA RULES -------------------------------------------- */
    defaultTargetTatDays: 5,         // used only where a sheet has no standard TAT (e.g. RIPL)
    maxPlausibleTatDays: 365,        // larger values are treated as bad data
    minPlausibleYear: 2024,          // earlier dates are treated as typos
    stableBandPct: 3,                // |change| below this % is "Stable"
    spikeStdDevs: 2,                 // monthly TAT > mean + N*sd => spike
    spikeMinFactor: 1.5,             // ...and at least this multiple of the mean

    /* ---- MONTH BASIS ------------------------------------------------
     * Which date decides the month a survey belongs to:
     *   'completed_or_assigned' – completion month if completed, else the
     *                             month it was assigned (default)
     *   'assigned'              – always the assignment month
     */
    monthBasis: 'completed_or_assigned',

    /* ---- PENDING AGEING BUCKETS (days) ------------------------------ */
    ageingBuckets: [
      { label: '0–2 Days',  min: 0,  max: 2 },
      { label: '3–5 Days',  min: 3,  max: 5 },
      { label: '6–7 Days',  min: 6,  max: 7 },
      { label: '8–15 Days', min: 8,  max: 15 },
      { label: '> 15 Days', min: 16, max: Infinity }
    ],
    criticalPendingDays: 15,

    /* ---- VENDOR UPDATE COMPLIANCE (days since last update) ---------- */
    updateThresholds: {
      regularMaxDays: 1,             // 0-1  -> LIVE / ACTIVE, Regular
      monitorMaxDays: 2,             // 2    -> Monitor
      attentionMaxDays: 4            // 3-4  -> Needs Attention ; 5+ -> Critical
    },

    /* ---- DATA QUALITY ------------------------------------------------ */
    dqMaxIssuesShown: 200,

    /* ---- DATA FORMAT ASSUMPTIONS ------------------------------------
     * Dates written with "/" are read month-first (Google Sheets US
     * locale: 7/10/2025 = 10 Jul 2025). Dates written with "-" are
     * read day-first (10-07-2025 = 10 Jul 2025).
     */
    slashDateOrder: 'MDY'
  };
});
