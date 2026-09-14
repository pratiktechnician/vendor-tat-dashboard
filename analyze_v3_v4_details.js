const fs = require('fs');
const path = require('path');

function getSharedStrings(dir) {
  const stringsFile = path.join(dir, 'xl', 'sharedStrings.xml');
  const sharedStrings = [];
  if (fs.existsSync(stringsFile)) {
    const xml = fs.readFileSync(stringsFile, 'utf8');
    const siRegex = /<si>(.*?)<\/si>/gs;
    let match;
    while ((match = siRegex.exec(xml)) !== null) {
      const siContent = match[1];
      const tRegex = /<t[^>]*>(.*?)<\/t>/gs;
      let str = '';
      let tMatch;
      while ((tMatch = tRegex.exec(siContent)) !== null) {
        str += tMatch[1];
      }
      str = str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      sharedStrings.push(str);
    }
  }
  return sharedStrings;
}

function colToIdx(col) {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function parseSheet(filePath, sharedStrings) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const rowRegex = /<row r="(\d+)"[^>]*>(.*?)<\/row>/gs;
  let rowMatch;
  const rows = [];
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rIdx = parseInt(rowMatch[1], 10) - 1;
    const rowContent = rowMatch[2];
    const cellRegex = /<c r="([A-Z]+)(\d+)"([^>]*)>(.*?)<\/c>/gs;
    let cellMatch;
    const rowData = [];
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetter = cellMatch[1];
      const colIdx = colToIdx(colLetter);
      const cellAttrs = cellMatch[3];
      const cellBody = cellMatch[4];
      const typeMatch = cellAttrs.match(/t="([^"]+)"/);
      const cellType = typeMatch ? typeMatch[1] : null;

      let val = null;
      const vMatch = cellBody.match(/<v>(.*?)<\/v>/s);
      if (vMatch) {
        val = vMatch[1];
        if (cellType === 's') {
          const sIdx = parseInt(val, 10);
          val = sharedStrings[sIdx] !== undefined ? sharedStrings[sIdx] : val;
        }
      } else {
        const isMatch = cellBody.match(/<is><t[^>]*>(.*?)<\/t><\/is>/s);
        if (isMatch) {
          val = isMatch[1];
        }
      }
      rowData[colIdx] = val !== null ? val : '';
    }
    rows[rIdx] = rowData;
  }
  return rows;
}

function parseDateVal(val) {
  if (!val) return '';
  const num = parseFloat(val);
  if (!isNaN(num) && num > 1000) {
    const utc_days  = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }
  if (typeof val === 'string' && val.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/)) {
    const parts = val.split(/[-\/]/);
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return val;
}

// ---------------------- ANALYZE RIPL (V3) ----------------------
const v3Strings = getSharedStrings(path.join(__dirname, 'extracted_v3'));
const v3Main = parseSheet(path.join(__dirname, 'extracted_v3', 'xl', 'worksheets', 'sheet1.xml'), v3Strings);
const v3TeamRows = parseSheet(path.join(__dirname, 'extracted_v3', 'xl', 'worksheets', 'sheet2.xml'), v3Strings);

const riplHeaders = v3Main[0] || [];
console.log('RIPL Headers:', riplHeaders);

const riplRecords = [];
let riplCompleted = 0;
let riplPending = 0;
let riplWip = 0;
let riplInTat = 0;
let riplOutsideTat = 0;
const riplStateDist = { 'Bihar': 0, 'West Bengal': 0, 'Jharkhand': 0, 'Odisha': 0, 'Other': 0 };
const riplActivities = {};
const riplJulyTimeline = {};
let riplJulyCount = 0;

for (let i = 1; i < v3Main.length; i++) {
  const r = v3Main[i];
  if (!r || r.length === 0 || !r[0]) continue; // Skip empty row

  const siteId = r[0] || '';
  const siteName = r[1] || '';
  const scope = r[2] || 'Unspecified';
  const recDateRaw = r[3] || '';
  const permDateRaw = r[4] || '';
  const doneDateRaw = r[5] || '';
  const status = (r[6] || '').trim();
  const tatVal = parseFloat(r[8]);
  const remarks = r[9] || '';

  const recDate = parseDateVal(recDateRaw);
  const permDate = parseDateVal(permDateRaw);
  const doneDate = parseDateVal(doneDateRaw);

  const recordObj = {
    siteId,
    siteName,
    project: 'RIPL General Project',
    activity: scope,
    assignedDate: recDate,
    permDate,
    completedDate: doneDate,
    tat: isNaN(tatVal) ? 'N/A' : tatVal,
    tclTat: 5.0, // Standard benchmark
    status: status,
    remarks
  };

  riplRecords.push(recordObj);

  if (status.toLowerCase().includes('complete')) riplCompleted++;
  else if (status.toLowerCase().includes('wip') || status.toLowerCase().includes('progress')) riplWip++;
  else riplPending++;

  if (!isNaN(tatVal)) {
    if (tatVal <= 5) riplInTat++;
    else riplOutsideTat++;
  }

  // Infer state from Site ID
  if (siteId.startsWith('BIH') || siteName.toUpperCase().includes('PATNA')) riplStateDist['Bihar']++;
  else if (siteId.startsWith('WEB') || siteId.startsWith('KOL') || siteName.toUpperCase().includes('KOLKATA')) riplStateDist['West Bengal']++;
  else if (siteId.startsWith('JHA') || siteName.toUpperCase().includes('RANCHI')) riplStateDist['Jharkhand']++;
  else if (siteId.startsWith('ORI') || siteId.startsWith('OR') || siteName.toUpperCase().includes('ODISHA') || siteName.toUpperCase().includes('BHUBANESWAR')) riplStateDist['Odisha']++;
  else riplStateDist['Other']++;

  if (!riplActivities[scope]) riplActivities[scope] = { count: 0, sumTat: 0, validTatCount: 0 };
  riplActivities[scope].count++;
  if (!isNaN(tatVal)) {
    riplActivities[scope].sumTat += tatVal;
    riplActivities[scope].validTatCount++;
  }

  // July check
  const isJulyAssigned = typeof recDate === 'string' && recDate.includes('-07-');
  const isJulyDone = typeof doneDate === 'string' && doneDate.includes('-07-');
  if (isJulyAssigned || isJulyDone) {
    riplJulyCount++;
    const dStr = isJulyDone ? doneDate : recDate;
    if (dStr && dStr.includes('-07-')) {
      const day = 'Jul ' + dStr.split('-')[2];
      riplJulyTimeline[day] = (riplJulyTimeline[day] || 0) + 1;
    }
  }
}

const riplTeam = [];
for (let i = 1; i < v3TeamRows.length; i++) {
  const r = v3TeamRows[i];
  if (r && r[0]) {
    riplTeam.push({
      name: r[0],
      loc: r[1] || 'Unspecified',
      role: r[2] || 'Field Personnel',
      remarks: r[4] || ''
    });
  }
}

console.log(`RIPL Data Analysis: Total=${riplRecords.length}, Completed=${riplCompleted}, InTAT=${riplInTat}, OutsideTAT=${riplOutsideTat}, JulyLogs=${riplJulyCount}`);

// ---------------------- ANALYZE MALFONIC (V4) ----------------------
const v4Strings = getSharedStrings(path.join(__dirname, 'extracted_v4'));
const v4Main = parseSheet(path.join(__dirname, 'extracted_v4', 'xl', 'worksheets', 'sheet1.xml'), v4Strings);
const v4TeamRows = parseSheet(path.join(__dirname, 'extracted_v4', 'xl', 'worksheets', 'sheet2.xml'), v4Strings);

const malfonicHeaders = v4Main[0] || [];
console.log('Malfonic Headers:', malfonicHeaders);

const malfonicRecords = [];
let malfonicCompleted = 0;
let malfonicPending = 0;
let malfonicWip = 0;
let malfonicInTat = 0;
let malfonicOutsideTat = 0;
const malfonicStateDist = { 'Bihar': 0, 'West Bengal': 0, 'Jharkhand': 0, 'Odisha': 0, 'Other': 0 };
const malfonicActivities = {};
const malfonicJulyTimeline = {};
let malfonicJulyCount = 0;

for (let i = 1; i < v4Main.length; i++) {
  const r = v4Main[i];
  if (!r || r.length === 0 || !r[5]) continue; // Skip empty row

  const state = r[1] || 'Other';
  const proj = r[2] || 'Unspecified';
  const siteId = r[5] || '';
  const siteName = r[6] || '';
  const act = r[7] || 'Unspecified';
  const loadDate = parseDateVal(r[8]);
  const permDate = parseDateVal(r[9]);
  const doneDate = parseDateVal(r[10]);
  const tatVal = parseFloat(r[11]);
  const targetVal = parseFloat(r[13]);
  const remarks = r[16] || '';
  const status = r[15] || 'Unspecified';

  const recordObj = {
    siteId,
    siteName,
    project: proj,
    activity: act,
    assignedDate: loadDate,
    permDate,
    completedDate: doneDate,
    tat: isNaN(tatVal) ? 'N/A' : tatVal,
    tclTat: isNaN(targetVal) ? 5.0 : targetVal,
    status: status,
    remarks
  };

  malfonicRecords.push(recordObj);

  if (status.toLowerCase().includes('complete')) malfonicCompleted++;
  else if (status.toLowerCase().includes('wip') || status.toLowerCase().includes('progress')) malfonicWip++;
  else malfonicPending++;

  if (!isNaN(tatVal) && !isNaN(targetVal)) {
    if (tatVal <= targetVal) malfonicInTat++;
    else malfonicOutsideTat++;
  }

  // State distribution
  if (state.includes('Bihar')) malfonicStateDist['Bihar']++;
  else if (state.includes('West Bengal') || state.includes('WB')) malfonicStateDist['West Bengal']++;
  else if (state.includes('Jharkhand')) malfonicStateDist['Jharkhand']++;
  else if (state.includes('Orissa') || state.includes('Odisha')) malfonicStateDist['Odisha']++;
  else malfonicStateDist['Other']++;

  if (!malfonicActivities[act]) malfonicActivities[act] = { count: 0, sumTat: 0, validTatCount: 0 };
  malfonicActivities[act].count++;
  if (!isNaN(tatVal)) {
    malfonicActivities[act].sumTat += tatVal;
    malfonicActivities[act].validTatCount++;
  }

  // July check
  const isJulyAssigned = typeof loadDate === 'string' && loadDate.includes('-07-');
  const isJulyDone = typeof doneDate === 'string' && doneDate.includes('-07-');
  if (isJulyAssigned || isJulyDone) {
    malfonicJulyCount++;
    const dStr = isJulyDone ? doneDate : loadDate;
    if (dStr && dStr.includes('-07-')) {
      const day = 'Jul ' + dStr.split('-')[2];
      malfonicJulyTimeline[day] = (malfonicJulyTimeline[day] || 0) + 1;
    }
  }
}

const malfonicTeam = [];
for (let i = 1; i < v4TeamRows.length; i++) {
  const r = v4TeamRows[i];
  if (r && r[3]) {
    malfonicTeam.push({
      name: r[3],
      loc: r[14] || 'Unspecified',
      role: r[15] || 'Field Personnel',
      remarks: r[29] || ''
    });
  }
}

console.log(`Malfonic Data Analysis: Total=${malfonicRecords.length}, Completed=${malfonicCompleted}, InTAT=${malfonicInTat}, OutsideTAT=${malfonicOutsideTat}, JulyLogs=${malfonicJulyCount}`);

// Save detailed analysis to JSON
const outputData = {
  ripl: {
    vendorName: 'RIPL',
    totalRecords: riplRecords.length,
    completed: riplCompleted,
    wip: riplWip,
    pending: riplPending,
    avgPnsTat: (riplRecords.reduce((sum, r) => typeof r.tat === 'number' ? sum + r.tat : sum, 0) / riplRecords.filter(r => typeof r.tat === 'number').length).toFixed(2),
    avgTargetTat: '5.00',
    inTatCount: riplInTat,
    outsideTatCount: riplOutsideTat,
    slaPercent: ((riplInTat / (riplInTat + riplOutsideTat)) * 100).toFixed(1) + '%',
    julyUpdateRegularity: riplJulyCount > 0 ? `Regular updates logged across July (${riplJulyCount} entries)` : 'No July updates logged',
    stateDist: riplStateDist,
    activities: Object.keys(riplActivities).map(k => ({
      name: k,
      count: riplActivities[k].count,
      tat: riplActivities[k].validTatCount > 0 ? (riplActivities[k].sumTat / riplActivities[k].validTatCount).toFixed(2) : 'N/A'
    })),
    julyTimeline: riplJulyTimeline,
    team: riplTeam,
    rawRecords: riplRecords
  },
  malfonic: {
    vendorName: 'Malfonic Network Communication Pvt Ltd',
    totalRecords: malfonicRecords.length,
    completed: malfonicCompleted,
    wip: malfonicWip,
    pending: malfonicPending,
    avgPnsTat: (malfonicRecords.reduce((sum, r) => typeof r.tat === 'number' ? sum + r.tat : sum, 0) / malfonicRecords.filter(r => typeof r.tat === 'number').length).toFixed(2),
    avgTargetTat: (malfonicRecords.reduce((sum, r) => typeof r.tclTat === 'number' ? sum + r.tclTat : sum, 0) / malfonicRecords.filter(r => typeof r.tclTat === 'number').length).toFixed(2),
    inTatCount: malfonicInTat,
    outsideTatCount: malfonicOutsideTat,
    slaPercent: ((malfonicInTat / (malfonicInTat + malfonicOutsideTat)) * 100).toFixed(1) + '%',
    julyUpdateRegularity: malfonicJulyCount > 0 ? `Regular daily updates logged in July (${malfonicJulyCount} entries)` : 'No July updates logged',
    stateDist: malfonicStateDist,
    activities: Object.keys(malfonicActivities).map(k => ({
      name: k,
      count: malfonicActivities[k].count,
      tat: malfonicActivities[k].validTatCount > 0 ? (malfonicActivities[k].sumTat / malfonicActivities[k].validTatCount).toFixed(2) : 'N/A'
    })),
    julyTimeline: malfonicJulyTimeline,
    team: malfonicTeam,
    rawRecords: malfonicRecords
  }
};

fs.writeFileSync('new_vendors_analysis.json', JSON.stringify(outputData, null, 2));
console.log('Saved v3 & v4 analysis successfully.');
