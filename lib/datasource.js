/*
 * Server-side data source (Node 18+).  Excel/Google-Sheet  ->  normalised JSON.
 *
 *   Primary   : Google Sheets CSV export of each vendor tab (live, no credentials)
 *   Dev/test  : DATA_SOURCE_DIR=<folder with saesha.csv, pns.csv, ...> (local files)
 *   Optional  : GOOGLE_API_KEY            -> real "file last modified" time per sheet (Drive API)
 *   Optional  : SUPABASE_URL + SUPABASE_SERVICE_KEY
 *               -> stores last good snapshot (fallback if Google is unreachable)
 *               -> stores per-vendor content hash so "last changed" can be detected
 *
 * To replace the data source later, only fetchVendorCsv() needs to change.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CFG = require('./config');
const N = require('./normalize');

const env = process.env;
const FETCH_TIMEOUT_MS = 20000;

async function timedFetch(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try { return await fetch(url, { ...opts, signal: ctl.signal, redirect: 'follow' }); }
  finally { clearTimeout(t); }
}

/* ---------------------------------------------------- source: CSV -- */
async function fetchVendorCsv(vendor) {
  if (env.DATA_SOURCE_DIR) {
    const file = path.join(env.DATA_SOURCE_DIR, vendor.key + '.csv');
    const stat = fs.statSync(file);
    return { csv: fs.readFileSync(file, 'utf8'), modifiedTime: stat.mtime.toISOString(), origin: 'local-files' };
  }
  const url = `https://docs.google.com/spreadsheets/d/${vendor.sheetId}/export?format=csv&gid=${vendor.gid}`;
  const res = await timedFetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`Google Sheets HTTP ${res.status} (is the sheet shared as "Anyone with the link"?)`);
  const csv = await res.text();
  if (/^\s*<(!doctype|html)/i.test(csv)) throw new Error('Google returned an HTML page (sign-in wall) instead of CSV');
  return { csv, modifiedTime: await fetchDriveModified(vendor), origin: 'google-sheets' };
}

async function fetchDriveModified(vendor) {
  if (!env.GOOGLE_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${vendor.sheetId}?fields=modifiedTime&supportsAllDrives=true&key=${env.GOOGLE_API_KEY}`;
    const res = await timedFetch(url);
    if (!res.ok) return null;
    return (await res.json()).modifiedTime || null;
  } catch (_) { return null; }
}

/* --------------------------------------------- optional: Supabase -- */
const sbOn = () => !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
async function sb(pathAndQuery, opts = {}) {
  const res = await timedFetch(`${env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...opts,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(opts.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}
async function loadSnapshot() {
  if (!sbOn()) return null;
  try { const r = await sb('dashboard_snapshot?id=eq.1&select=payload'); return r && r[0] ? r[0].payload : null; }
  catch (_) { return null; }
}
async function saveSnapshot(payload) {
  if (!sbOn()) return;
  try {
    await sb('dashboard_snapshot?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: 1, payload, updated_at: new Date().toISOString() })
    });
  } catch (_) { /* snapshot is best-effort */ }
}
async function trackChanges(hashes) {          // -> { vendorKey: lastChangedISO }
  if (!sbOn()) return {};
  try {
    const now = new Date().toISOString();
    const existing = Object.fromEntries((await sb('vendor_sync_state?select=*')).map(r => [r.vendor_key, r]));
    const upserts = [], out = {};
    for (const [key, hash] of Object.entries(hashes)) {
      const prev = existing[key];
      const changed = !prev || prev.content_hash !== hash;
      const last = changed ? now : prev.last_changed_at;
      out[key] = last;
      upserts.push({ vendor_key: key, content_hash: hash, last_changed_at: last, last_checked_at: now });
    }
    await sb('vendor_sync_state?on_conflict=vendor_key', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(upserts)
    });
    return out;
  } catch (_) { return {}; }
}

/* ------------------------------------------------------ assemble -- */
const sha = s => crypto.createHash('sha1').update(s).digest('hex');

async function buildPayload() {
  const startedAt = Date.now();
  const snapshot = await loadSnapshot();
  const snapByVendor = {};
  if (snapshot) for (const r of snapshot.records || []) (snapByVendor[r.vendorKey] = snapByVendor[r.vendorKey] || []).push(r);

  const results = await Promise.all(CFG.vendors.map(async v => {
    try {
      const { csv, modifiedTime, origin } = await fetchVendorCsv(v);
      const { records, meta } = N.normalizeVendorCsv(csv, v);
      if (!records.length) throw new Error(meta.error || 'Sheet returned 0 usable rows');
      return { v, records, meta, modifiedTime, origin, fetch: 'live', hash: sha(JSON.stringify(records)) };
    } catch (err) {
      const old = snapByVendor[v.key];
      const oldMeta = snapshot && (snapshot.vendors || []).find(x => x.vendorKey === v.key);
      return {
        v, records: old || [], meta: oldMeta || N.emptyMeta(v, err.message), modifiedTime: oldMeta ? oldMeta.fileModified : null,
        origin: 'supabase-snapshot', fetch: old ? 'stale' : 'error', error: err.message, hash: null
      };
    }
  }));

  const changeTimes = await trackChanges(Object.fromEntries(results.filter(r => r.hash).map(r => [r.v.key, r.hash])));
  const nowIso = new Date().toISOString();

  const vendors = results.map(r => {
    const m = r.meta;
    let lastUpdate = null, basis = null;
    if (m.lastUpdatedColumnMax)      { lastUpdate = m.lastUpdatedColumnMax; basis = 'sheet "Last Updated" column'; }
    else if (r.modifiedTime)         { lastUpdate = r.modifiedTime;         basis = r.origin === 'local-files' ? 'file modified time (local file)' : 'file modified time (Google Drive)'; }
    else if (changeTimes[r.v.key])   { lastUpdate = changeTimes[r.v.key];   basis = 'content change detected by sync'; }
    else if (m.lastActivityDate)     { lastUpdate = m.lastActivityDate;     basis = 'latest activity date in sheet (inferred)'; }
    return {
      vendorKey: r.v.key, name: r.v.name, color: r.v.color, icon: r.v.icon,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${r.v.sheetId}/edit?gid=${r.v.gid}`,
      rows: r.records.length, fetch: r.fetch, error: r.error || null, origin: r.origin,
      fileModified: r.modifiedTime || null,
      lastUpdate, lastUpdateBasis: basis,
      lastActivityDate: m.lastActivityDate, hasLastUpdatedColumn: !!m.hasLastUpdatedColumn,
      unmappedFields: m.unmappedFields || [], columns: m.columns || {}
    };
  });

  const payload = {
    generatedAt: nowIso,
    buildMs: Date.now() - startedAt,
    source: [...new Set(results.map(r => r.origin))].join('+'),
    anyLive: results.some(r => r.fetch === 'live'),
    vendors,
    records: results.flatMap(r => r.records)
  };
  if (payload.anyLive && results.every(r => r.fetch === 'live')) await saveSnapshot(payload);
  return payload;
}

/** ETag that ignores volatile fields so unchanged data yields HTTP 304. */
function etagOf(payload) {
  return '"' + sha(JSON.stringify({ r: payload.records, v: payload.vendors.map(v => [v.vendorKey, v.fetch, v.lastUpdate, v.fileModified]) })) + '"';
}

module.exports = { buildPayload, etagOf };
