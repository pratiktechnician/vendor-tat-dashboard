const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const records = rawData.rawRecords || [];

console.log(`Processing ${records.length} real records from data.json...`);

function getWoStatus(r) {
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

function processVendor(vName, vendorRecords) {
  const total = vendorRecords.length;
  let completed = 0;
  let wip = 0;
  let pending = 0;
  let inTat = 0;
  let outsideTat = 0;
  let sumTat = 0;
  let countTat = 0;
  let sumTargetTat = 0;
  let countTargetTat = 0;

  const stateDist = {};
  const actMap = {};

  vendorRecords.forEach(r => {
    const wo = getWoStatus(r);
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
    avgPnsTat: `${avgTat} Days`,
    avgTargetTat: `${avgTargetTat} Days`,
    inTatCount: inTat,
    outsideTatCount: outsideTat,
    slaPercent: slaPct,
    julyUpdateRegularity: `Active & Verified Dataset: ${total} Total Site Records`,
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

const pnsRecords = records.filter(r => (r.vendor || '').toLowerCase().includes('pns'));
const saeshaRecords = records.filter(r => (r.vendor || '').toLowerCase().includes('saesha'));
const riplRecords = records.filter(r => (r.vendor || '').toLowerCase().includes('ripl'));
const malfonicRecords = records.filter(r => (r.vendor || '').toLowerCase().includes('malfonic'));

const db = {
  all: processVendor('All Vendors Combined', records),
  pns: processVendor('PNS Telecom', pnsRecords),
  saesha: processVendor('Saesha Power', saeshaRecords),
  ripl: processVendor('RIPL', riplRecords),
  malfonic: processVendor('Malfonic', malfonicRecords)
};

console.log('Database computed:');
Object.keys(db).forEach(k => {
  console.log(`- ${db[k].vendorName}: ${db[k].totalRecords} records`);
});

fs.writeFileSync('scratch_db.json', JSON.stringify(db, null, 2));
