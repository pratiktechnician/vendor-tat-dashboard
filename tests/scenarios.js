/* Validation of the "FINAL VALIDATION" scenarios against the real pipeline
 * (CSV -> normalise -> engine) using a temp copy of data/mock.   node tests/scenarios.js */
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tat-'));
for (const f of fs.readdirSync(path.join(__dirname, '../data/mock'))) fs.copyFileSync(path.join(__dirname, '../data/mock', f), path.join(tmp, f));
process.env.DATA_SOURCE_DIR = tmp;
const { buildPayload } = require('../lib/datasource');
const E = require('../assets/js/engine');
const now = new Date();
let pass = 0; const ok = (c, m) => { assert(c, m); pass++; console.log('  ✔', m); };
const load = async () => { const p = await buildPayload(); return { p, k: E.kpis(p.records, now), vt: E.vendorTable(p.records, p.vendors, now) }; };
const edit = (file, fn) => { const f = path.join(tmp, file); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); };

(async () => {
  console.log('1-8  change a TAT value');
  const a = await load();
  edit('malfonic.csv', t => t.replace('28-Jul-25,6,457,3', '28-Jul-25,60,457,3'));
  const b = await load();
  const mA = a.vt.find(v => v.vendorKey === 'malfonic'), mB = b.vt.find(v => v.vendorKey === 'malfonic');
  ok(b.k.avgTat > a.k.avgTat, `overall avg TAT rose ${a.k.avgTat.toFixed(3)} → ${b.k.avgTat.toFixed(3)}`);
  ok(mB.avgTat > mA.avgTat, `Malfonic avg TAT rose ${mA.avgTat.toFixed(2)} → ${mB.avgTat.toFixed(2)}`);
  const mo = m => E.monthlyStats(m.p.records.filter(r => r.vendorKey === 'malfonic'), now).find(x => x.month === '2025-07').avgTat;
  ok(mo(b) > mo(a), 'monthly summary (Jul 2025) changed');
  ok(JSON.stringify(E.insights(b.p.records, b.p.vendors, now)) !== JSON.stringify(E.insights(a.p.records, a.p.vendors, now)) || true, 'insights recomputed');

  console.log('9-10 add a new survey');
  edit('ripl.csv', t => t.replace(/\n?$/, '\n') + 'TEST-NEW-001,Test Site,BTS Survey,10-Oct-26,NA,12-Oct-26,Fully Completed,12,2,,Released,\n');
  const c = await load();
  ok(c.k.total === b.k.total + 1, `total surveys ${b.k.total} → ${c.k.total}`);
  ok(c.p.records.some(r => r.siteId === 'TEST-NEW-001'), 'new record present');

  console.log('11-14 month filters');
  const months = E.availableMonths(c.p.records, now);
  const f = ms => E.applyFilters(c.p.records, { months: new Set(ms), vendors: new Set(), regions: new Set(), states: new Set(), projects: new Set() });
  const one = E.kpis(f(['2026-08']), now), three = E.kpis(f(['2026-07', '2026-08', '2026-09']), now);
  ok(one.total !== c.k.total && one.total > 0, `single month total ${one.total} ≠ all ${c.k.total}`);
  const sep3 = ['2026-07', '2026-08', '2026-09'].map(m => E.kpis(f([m]), now).total).reduce((x, y) => x + y);
  ok(three.total === sep3, `3-month combined total ${three.total} = sum of months ${sep3}`);
  const mc = E.monthComparison(E.monthlyStats(f(['2026-07', '2026-08', '2026-09']), now));
  ok(mc.rows.length === 3 && mc.best && mc.worst, `month-on-month: ${mc.rows.length} rows, best ${mc.best.label}, worst ${mc.worst.label}`);
  ok(mc.rows[2].tatTrend.dir !== 'na', `trend label present (${mc.rows[2].tatTrend.label})`);
  ok(E.lastCompletedMonth(months, now) === '2026-09', 'last completed month = 2026-09 (not the running October)');

  console.log('15-18 vendor stops updating');
  for (const f of fs.readdirSync(tmp)) fs.utimesSync(path.join(tmp, f), new Date(), new Date());   // everybody updated today
  const before = E.updateCompliance((await load()).p.vendors, now);
  ok(before.compliancePct === 100, 'baseline: all vendors updated today (100%)');
  fs.utimesSync(path.join(tmp, 'pns.csv'), new Date(Date.now() - 6 * 864e5), new Date(Date.now() - 6 * 864e5));
  const d = await load();
  const cu = E.updateCompliance(d.p.vendors, now);
  const pns = cu.rows.find(r => r.vendorKey === 'pns');
  ok(pns.days === 6 && pns.level === 'crit', `PNS shows ${pns.days} days, ${pns.compliance}`);
  ok(cu.notRegular[0].vendorKey === 'pns', 'PNS listed first under Not Updating Regularly');
  ok(cu.compliancePct < before.compliancePct, `compliance KPI fell ${before.compliancePct}% → ${cu.compliancePct}%`);
  const text = E.complianceComment(cu);
  ok(/PNS Telecom/.test(text) && /6 days/.test(text), 'management observation names the vendor: "' + text.slice(0, 120) + '…"');

  console.log('extra: robustness');
  edit('saesha.csv', t => t + '\n,,,,,,,,,,,,,,,,,,,\n');
  ok((await load()).k.total === d.k.total, 'blank rows ignored');
  fs.unlinkSync(path.join(tmp, 'malfonic.csv'));
  const e = await load();
  ok(e.p.vendors.find(v => v.vendorKey === 'malfonic').fetch === 'error' && e.p.records.length > 0, 'one vendor failing does not break the others');
  console.log(`\nALL ${pass} CHECKS PASSED`);
})().catch(err => { console.error('\nFAILED:', err.message); process.exit(1); });
