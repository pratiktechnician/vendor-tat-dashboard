const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration thresholds (configurable in days)
const COMPLIANCE_THRESHOLDS = {
  regular: 1,
  monitor: 2,
  needsAttention: 4
};

// Global cached database
let cachedData = null;
let isDownloading = false;

// File mapping
// File mapping resolved absolutely
const VENDORS_CONFIG = {
  pns: {
    name: 'PNS Telecom',
    docId: '1Yvowk4tAm_Z0lKFqsIJ-RFMaOduwfBzlbKc7nSq1qMA',
    file: path.join(__dirname, 'new_sheet.xlsx'),
    dir: path.join(__dirname, 'extracted_new_xlsx'),
    sheetFile: 'sheet1.xml',
    teamFile: 'sheet2.xml'
  },
  saesha: {
    name: 'Saesha Power',
    docId: '1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8',
    file: path.join(__dirname, 'Saesha_Power_TAT_Data.xlsx'),
    dir: path.join(__dirname, 'extracted_xlsx'),
    sheetFile: 'sheet3.xml',
    teamFile: 'sheet5.xml'
  },
  ripl: {
    name: 'RIPL',
    docId: '1Fa3lKVvWxL3WIWxnIhm-TpcgWm1gKWYLoGZHyvFU18c',
    file: path.join(__dirname, 'vendor_3.xlsx'),
    dir: path.join(__dirname, 'extracted_v3'),
    sheetFile: 'sheet1.xml',
    teamFile: 'sheet2.xml'
  },
  malfonic: {
    name: 'Malfonic',
    docId: '15Ka8mS44lxKD9pg0e8bWOebmpsibFC29J0z73skMkr8',
    file: path.join(__dirname, 'vendor_4.xlsx'),
    dir: path.join(__dirname, 'extracted_v4'),
    sheetFile: 'sheet1.xml',
    teamFile: 'sheet2.xml'
  }
};

// Helper: Convert column letter to index
function colToIdx(col) {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

// Helper: Parse XML sheet to matrix row array
function parseSheetXml(filePath, sharedStrings) {
  if (!fs.existsSync(filePath)) return [];
  const xml = fs.readFileSync(filePath, 'utf8');
  const rowRegex = /<row r="(\d+)"[^>]*>(.*?)<\/row>/gs;
  let rowMatch;
  const rows = [];
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rIdx = parseInt(rowMatch[1], 10) - 1;
    const rowContent = rowMatch[2];
    
    // Support both self-closing (<c ... />) and normal (<c ...> ... </c>) cells
    const cellRegex = /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs;
    let cellMatch;
    const rowData = [];
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetter = cellMatch[1];
      const colIdx = colToIdx(colLetter);
      const cellAttrs = cellMatch[3];
      const cellBody = cellMatch[4]; // may be undefined for self-closing cells

      let val = null;
      if (cellBody) {
        const typeMatch = cellAttrs.match(/t="([^"]+)"/);
        const cellType = typeMatch ? typeMatch[1] : null;

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
      }
      rowData[colIdx] = val !== null ? val : '';
    }
    rows[rIdx] = rowData;
  }
  return rows;
}

// Helper: Get Shared Strings
function getSharedStrings(dirPath) {
  const stringsFile = path.join(dirPath, 'xl', 'sharedStrings.xml');
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

// Helper: Sanitize future dates by swapping month and day if they were swapped by Excel locale issues
function sanitizeFutureDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  
  const dObj = new Date(dateStr);
  const baseDate = new Date();
  if (dObj > baseDate) {
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    
    // Swap month and day
    const swappedStr = `${y}-${d.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}`;
    const swappedObj = new Date(swappedStr);
    if (!isNaN(swappedObj.getTime()) && swappedObj <= baseDate) {
      return swappedStr;
    }
  }
  return dateStr;
}

// Helper: Convert Excel date serial to ISO Date string
function excelDateToJS(serial) {
  if (!serial) return '';
  const num = parseFloat(serial);
  if (isNaN(num)) {
    // try text parsing
    if (typeof serial === 'string' && serial.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/)) {
      const parts = serial.split(/[-\/]/);
      if (parts[2].length === 4) {
        let yr = parseInt(parts[2], 10);
        const curYear = new Date().getFullYear();
        if (yr > curYear + 1) yr = curYear - 1;
        let res = `${yr}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        return sanitizeFutureDate(res);
      }
    }
    return serial;
  }
  if (num < 1000) return serial.toString();
  const utc_days = Math.floor(num - 25569);
  const date = new Date(utc_days * 86400000);
  let iso = date.toISOString().split('T')[0];
  const parts = iso.split('-');
  const year = parseInt(parts[0], 10);
  const curYear = new Date().getFullYear();
  if (year > curYear + 1) {
    iso = (curYear - 1) + '-' + parts[1] + '-' + parts[2];
  }
  return sanitizeFutureDate(iso);
}

// Extract Excel file to temporary extraction directory (cross-platform)
function extractExcel(fileName, destDir) {
  try {
    const zipFile = fileName.replace('.xlsx', '_tmp.zip');
    fs.copyFileSync(fileName, zipFile);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${destDir}' -Force"`);
      try { if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile); } catch (e) {}
    } else {
      execSync(`unzip -o -q "${zipFile}" -d "${destDir}" && rm -f "${zipFile}"`);
    }
    console.log(`[Watcher] Extracted ${fileName} successfully.`);
  } catch (err) {
    console.error(`[Watcher] Error extracting ${fileName}:`, err.message);
  }
}

// Check and verify folders, perform initial sync
function verifyFolders() {
  for (const k in VENDORS_CONFIG) {
    const v = VENDORS_CONFIG[k];
    if (!fs.existsSync(v.dir) && fs.existsSync(v.file)) {
      console.log(`[Startup] ${v.dir} does not exist. Triggering extraction...`);
      extractExcel(v.file, v.dir);
    }
  }
}

// Parse Team Details
function parseTeam(vendorKey) {
  const v = VENDORS_CONFIG[vendorKey];
  const sharedStrings = getSharedStrings(v.dir);
  const filePath = path.join(v.dir, 'xl', 'worksheets', v.teamFile);
  const rows = parseSheetXml(filePath, sharedStrings);
  const team = [];
  if (rows.length < 2) return team;

  const headers = rows[0] || [];
  // locate FE Name and Location indices
  let nameIdx = 1, locIdx = 1, roleIdx = 3;
  
  if (vendorKey === 'pns') {
    // ['Location', 'FE Name', 'City', 'Designation']
    nameIdx = 1; locIdx = 0; roleIdx = 3;
  } else if (vendorKey === 'saesha') {
    // ['S/L No.', 'Name', 'Trained(Yes/No)', 'Designation', 'State', 'POA']
    nameIdx = 1; locIdx = 4; roleIdx = 3;
  } else if (vendorKey === 'ripl') {
    // ['Team  Name ', 'Location ', 'Team Type SA / Team Type WI', 'E-Passport status', 'Remarks']
    nameIdx = 0; locIdx = 1; roleIdx = 2;
  } else if (vendorKey === 'malfonic') {
    // Large safety compliance header
    nameIdx = 3; locIdx = 14; roleIdx = 15;
  }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r && r[nameIdx] && r[nameIdx].trim() !== '' && !r[nameIdx].includes('FE Name') && !r[nameIdx].includes('Name')) {
      team.push({
        name: r[nameIdx].trim(),
        role: r[roleIdx] ? r[roleIdx].trim() : 'Field Personnel',
        loc: r[locIdx] ? r[locIdx].trim() : 'Eastern Circle'
      });
    }
  }
  return team;
}

// Helper: Infer State & Region from Site ID/State Name
function getInferredStateAndRegion(siteId, siteName, rawState, vendorKey) {
  let state = (rawState || '').trim();
  if (state === 'Unspecified' || state === '' || vendorKey === 'pns' || vendorKey === 'ripl') {
    const sId = (siteId || '').toUpperCase();
    const sName = (siteName || '').toUpperCase();
    if (sId.startsWith('BIH') || sName.includes('BIHAR') || sName.includes('PATNA')) state = 'Bihar';
    else if (sId.startsWith('WEB') || sId.startsWith('KOL') || sName.includes('KOLKATA') || sName.includes('BENGAL')) state = 'West Bengal';
    else if (sId.startsWith('JHA') || sName.includes('RANCHI') || sName.includes('JHARKHAND') || sName.includes('Dhanbad') || sName.includes('Hazaribag')) state = 'Jharkhand';
    else if (sId.startsWith('ORI') || sId.startsWith('OR') || sName.includes('CUTTACK') || sName.includes('ODISHA') || sName.includes('BHUBANESWAR')) state = 'Odisha';
    else if (sId.startsWith('ASM') || sId.startsWith('NE') || sName.includes('GUWAHATI') || sName.includes('ASSAM')) state = 'Assam';
    else state = 'Odisha'; // Fallback / default
  }
  
  let region = 'East';
  if (state === 'Assam' || state === 'Meghalaya' || state === 'Tripura') region = 'NESA';
  return { state, region };
}

// Parse normalized records from sheets
function parseMainSheet(vendorKey) {
  const v = VENDORS_CONFIG[vendorKey];
  const sharedStrings = getSharedStrings(v.dir);
  const filePath = path.join(v.dir, 'xl', 'worksheets', v.sheetFile);
  const rows = parseSheetXml(filePath, sharedStrings);
  const records = [];
  if (rows.length < 2) return records;

  let headers = rows[0] || [];
  let headerRowIdx = 0;
  // find header row if not first
  for (let i = 0; i < 5; i++) {
    if (rows[i] && rows[i].some(c => c && typeof c === 'string' && (c.includes('Site') || c.includes('Loading') || c.includes('Activity')))) {
      headers = rows[i];
      headerRowIdx = i;
      break;
    }
  }

  // Column index maps
  let siteIdIdx = 0, siteNameIdx = 1, projIdx = 2, actIdx = 3, loadIdx = 4, permIdx = 5, doneIdx = 6, tatIdx = 7, targetIdx = 8, statusIdx = 9, remarksIdx = 10, stateIdx = -1, regionIdx = -1;

  if (vendorKey === 'saesha') {
    // headers: ['Region', 'State', 'Project Name', 'Delivery Track', 'BTS / Customer', 'Site id', 'Site Name', 'Loading date from wi team', 'Permission Required Date', 'Complete date', 'TAT', 'Aging', 'WI TAT', 'TAT Remarks', 'Pending/YTS', 'Remarks']
    regionIdx = 0; stateIdx = 1; projIdx = 2; actIdx = 3; siteIdIdx = 5; siteNameIdx = 6; loadIdx = 7; permIdx = 8; doneIdx = 9; tatIdx = 10; targetIdx = 12; statusIdx = 14; remarksIdx = 15;
  } else if (vendorKey === 'pns') {
    // headers: ['SL No', 'Site ID', 'Site Name', 'Project Name', 'TCL Standard TAT (Days)', 'Site Assigned Date', 'Permission receive date', 'Activity Name', 'Completed Date', 'PNS TAT (in Days)', 'Site Complete Status', 'Remark’s.']
    siteIdIdx = 1; siteNameIdx = 2; projIdx = 3; targetIdx = 4; loadIdx = 5; permIdx = 6; actIdx = 7; doneIdx = 8; tatIdx = 9; statusIdx = 10; remarksIdx = 11;
  } else if (vendorKey === 'ripl') {
    // headers: ['Site ID', 'Site Name', 'Site Scope', 'Activity receive date', 'Material Received /Permission Availability', 'Activity Done Date', 'Status', 'Agging', 'TAT', 'Remarks 1']
    siteIdIdx = 0; siteNameIdx = 1; actIdx = 2; loadIdx = 3; permIdx = 4; doneIdx = 5; statusIdx = 6; tatIdx = 8; remarksIdx = 9;
    projIdx = -1; targetIdx = -1;
  } else if (vendorKey === 'malfonic') {
    // headers: ['Region', 'State', 'Project Name', 'Delivery Track', 'BTS/Customer', 'Site ID', 'BTS/Customer Name', 'Activity', 'Loading Date from WI team', 'Permission Recieved Date', 'Complete Date', 'Actual TAT', 'Aging', 'WI TAT-Standard', 'TAT Remarks', 'Status', 'Remarks']
    regionIdx = 0; stateIdx = 1; projIdx = 2; siteIdIdx = 5; siteNameIdx = 6; actIdx = 7; loadIdx = 8; permIdx = 9; doneIdx = 10; tatIdx = 11; targetIdx = 13; statusIdx = 15; remarksIdx = 16;
  }

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0 || !r[siteIdIdx]) continue;

    const siteId = r[siteIdIdx].toString().trim();
    const siteName = r[siteNameIdx] ? r[siteNameIdx].toString().trim() : '';
    const rawState = stateIdx !== -1 && r[stateIdx] ? r[stateIdx].toString() : '';
    const { state, region } = getInferredStateAndRegion(siteId, siteName, rawState, vendorKey);

    const project = projIdx !== -1 && r[projIdx] ? r[projIdx].toString().trim() : 'BAU Operations';
    const activity = r[actIdx] ? r[actIdx].toString().trim() : 'Survey & Installation';
    
    const rawLoad = r[loadIdx] ? r[loadIdx].toString() : '';
    const rawPerm = r[permIdx] ? r[permIdx].toString() : '';
    const rawDone = r[doneIdx] ? r[doneIdx].toString() : '';

    const assignedDate = excelDateToJS(rawLoad);
    const permDate = excelDateToJS(rawPerm);
    const completedDate = excelDateToJS(rawDone);

    let tatVal = parseFloat(r[tatIdx]);
    // Ignore invalid/corrupt Excel negative formula outputs
    if (isNaN(tatVal) || tatVal < 0 || tatVal > 1000) {
      tatVal = NaN;
    }

    let targetSla = targetIdx !== -1 && r[targetIdx] ? parseFloat(r[targetIdx]) : 5.0;
    if (isNaN(targetSla)) targetSla = 5.0;

    const status = r[statusIdx] ? r[statusIdx].toString().trim() : (completedDate ? 'Fully Completed' : 'Pending');
    const remarks = r[remarksIdx] ? r[remarksIdx].toString().trim() : '';

    records.push({
      siteId,
      siteName,
      project,
      activity,
      assignedDate,
      permDate,
      completedDate,
      tat: isNaN(tatVal) ? 'N/A' : tatVal,
      tclTat: targetSla,
      status,
      remarks,
      state,
      region,
      vendor: VENDORS_CONFIG[vendorKey].name,
      _rawRowNum: i + 1
    });
  }
  return records;
}

// Compute dynamic summaries & calculations
function compileDataset() {
  verifyFolders();

  const baseDate = new Date();
  const baseDateStr = baseDate.toISOString().split('T')[0];

  const allRecords = [];
  const vendors = {};

  for (const k in VENDORS_CONFIG) {
    try {
      const records = parseMainSheet(k);
      const team = parseTeam(k);
      
      const completed = records.filter(r => r.status.toLowerCase().includes('complete') || r.completedDate !== '');
      const wip = records.filter(r => r.status.toLowerCase().includes('wip') || r.status.toLowerCase().includes('progress'));
      const pending = records.filter(r => !completed.includes(r) && !wip.includes(r));

      const validTats = completed.map(r => r.tat).filter(t => typeof t === 'number');
      const avgTat = validTats.length > 0 ? (validTats.reduce((a, b) => a + b, 0) / validTats.length) : 0;
      
      // Calculate Median TAT
      let medianTat = 0;
      if (validTats.length > 0) {
        const sorted = [...validTats].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        medianTat = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }

      // SLA Compliance calculations
      const evaluated = completed.filter(r => typeof r.tat === 'number');
      const inTat = evaluated.filter(r => r.tat <= r.tclTat);
      const outsideTat = evaluated.filter(r => r.tat > r.tclTat);
      const slaPercent = evaluated.length > 0 ? (inTat.length / evaluated.length) * 100 : 0;

      // Extract unique states and activities
      const stateDist = {};
      const activitiesMap = {};
      records.forEach(r => {
        stateDist[r.state] = (stateDist[r.state] || 0) + 1;
        if (!activitiesMap[r.activity]) {
          activitiesMap[r.activity] = { count: 0, sumTat: 0, validTatCount: 0 };
        }
        activitiesMap[r.activity].count++;
        if (typeof r.tat === 'number') {
          activitiesMap[r.activity].sumTat += r.tat;
          activitiesMap[r.activity].validTatCount++;
        }
      });

      const activitiesBreakdown = Object.keys(activitiesMap).map(name => ({
        name,
        count: activitiesMap[name].count,
        tat: activitiesMap[name].validTatCount > 0 ? (activitiesMap[name].sumTat / activitiesMap[name].validTatCount).toFixed(2) : 'N/A'
      })).sort((a, b) => b.count - a.count);

      // July logs check
      const julyTimeline = {};
      let julyCount = 0;
      records.forEach(r => {
        const dateStr = r.completedDate || r.assignedDate;
        if (dateStr && dateStr.includes('-07-')) {
          julyCount++;
          const day = 'Jul ' + dateStr.split('-')[2];
          julyTimeline[day] = (julyTimeline[day] || 0) + 1;
        }
      });

      // Find last updated date based on latest completedDate or assignedDate in data
      let latestDateStr = '';
      records.forEach(r => {
        const d = r.completedDate || r.assignedDate;
        if (d && d.match(/^\d{4}-\d{2}-\d{2}$/) && d <= baseDateStr) {
          if (!latestDateStr || d > latestDateStr) latestDateStr = d;
        }
      });

      // Calculate days since update relative to system date
      let daysSinceUpdate = 999;
      if (latestDateStr) {
        const diffTime = baseDate - new Date(latestDateStr);
        daysSinceUpdate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }

      let complianceStatus = 'Critical';
      if (daysSinceUpdate <= COMPLIANCE_THRESHOLDS.regular) complianceStatus = 'Regular';
      else if (daysSinceUpdate <= COMPLIANCE_THRESHOLDS.monitor) complianceStatus = 'Monitor';
      else if (daysSinceUpdate <= COMPLIANCE_THRESHOLDS.needsAttention) complianceStatus = 'Needs Attention';

      vendors[k] = {
        vendorKey: k,
        vendorName: VENDORS_CONFIG[k].name,
        totalRecords: records.length,
        completed: completed.length,
        wip: wip.length,
        pending: pending.length,
        avgPnsTat: avgTat.toFixed(2),
        medianTat: medianTat.toFixed(2),
        avgTargetTat: (records.reduce((sum, r) => sum + r.tclTat, 0) / records.length).toFixed(2),
        inTatCount: inTat.length,
        outsideTatCount: outsideTat.length,
        slaPercent: slaPercent.toFixed(1) + '%',
        julyUpdateRegularity: julyCount > 0 ? `Regular updates logged in July (${julyCount} entries)` : 'No July updates logged',
        stateDist,
        activities: activitiesBreakdown,
        julyTimeline,
        team,
        daysSinceUpdate,
        complianceStatus,
        lastUpdatedDate: latestDateStr || 'Never',
        rawRecords: records
      };

      allRecords.push(...records);
    } catch (e) {
      console.error(`Error compiling data for vendor ${k}:`, e);
    }
  }

  // Monthly breakdown
  const monthlyAverages = {};
  allRecords.forEach(r => {
    const d = r.completedDate || r.assignedDate;
    if (d && d.match(/^\d{4}-\d{2}-\d{2}$/) && d <= baseDateStr) {
      const monthPart = d.substring(0, 7); // YYYY-MM
      if (!monthlyAverages[monthPart]) {
        monthlyAverages[monthPart] = { sumTat: 0, countTat: 0, total: 0, completed: 0 };
      }
      monthlyAverages[monthPart].total++;
      if (r.completedDate) {
        monthlyAverages[monthPart].completed++;
      }
      if (typeof r.tat === 'number') {
        monthlyAverages[monthPart].sumTat += r.tat;
        monthlyAverages[monthPart].countTat++;
      }
    }
  });

  const monthsList = Object.keys(monthlyAverages).sort();
  const MoMTrends = monthsList.map((m, idx) => {
    const data = monthlyAverages[m];
    const avg = data.countTat > 0 ? (data.sumTat / data.countTat) : 0;
    
    let trend = 'Stable';
    let percentChange = 0;
    if (idx > 0) {
      const prevM = monthsList[idx - 1];
      const prevData = monthlyAverages[prevM];
      const prevAvg = prevData.countTat > 0 ? (prevData.sumTat / prevData.countTat) : 0;
      if (prevAvg > 0) {
        percentChange = ((avg - prevAvg) / prevAvg) * 100;
        if (percentChange < -3) trend = 'Improving'; // Lower TAT is improvement
        else if (percentChange > 3) trend = 'Deteriorating';
      }
    }

    return {
      month: m, // YYYY-MM
      avgTat: avg.toFixed(2),
      totalSurveys: data.total,
      completed: data.completed,
      completionRate: ((data.completed / data.total) * 100).toFixed(1) + '%',
      trend,
      percentChange: percentChange.toFixed(1)
    };
  });

  // Dynamic DQC Check
  let dqcAnomaliesCount = 0;
  const dqcAlerts = [];
  const seenIds = new Set();
  const duplicateIds = new Set();

  allRecords.forEach(r => {
    const key = `${r.vendor}-${r.siteId}-${r.activity}`;
    if (seenIds.has(key)) {
      duplicateIds.add(key);
    }
    seenIds.add(key);
  });

  allRecords.forEach(r => {
    const issues = [];
    if (!r.vendor) issues.push('Missing vendor name');
    if (!r.assignedDate) issues.push('Missing assigned date');
    if (!r.status) issues.push('Missing status');
    if (typeof r.tat === 'number' && r.tat < 0) issues.push('Negative TAT value');
    if (r.assignedDate && r.assignedDate > baseDateStr) issues.push('Future assigned date');
    if (r.completedDate && r.completedDate > baseDateStr) issues.push('Future completed date');
    
    const key = `${r.vendor}-${r.siteId}-${r.activity}`;
    if (duplicateIds.has(key)) {
      issues.push('Duplicate Site ID + Activity record');
    }

    if (issues.length > 0) {
      dqcAnomaliesCount += issues.length;
      dqcAlerts.push({
        siteId: r.siteId,
        vendor: r.vendor,
        activity: r.activity,
        issues: issues.join(', '),
        rowNum: r._rawRowNum
      });
    }
  });

  const totalPossibleChecks = allRecords.length * 5;
  const dqcScore = totalPossibleChecks > 0 ? (((totalPossibleChecks - dqcAnomaliesCount) / totalPossibleChecks) * 100).toFixed(1) : 100;

  // Pending Aging calculations
  const agingBuckets = {
    '0-2 Days': 0,
    '3-5 Days': 0,
    '6-7 Days': 0,
    '8-15 Days': 0,
    '> 15 Days': 0
  };
  const criticalPending = [];

  allRecords.forEach(r => {
    const completed = r.status.toLowerCase().includes('complete') || r.completedDate !== '';
    const wip = r.status.toLowerCase().includes('wip') || r.status.toLowerCase().includes('progress');
    const isPending = !completed && !wip;

    if (isPending && r.assignedDate) {
      const diffTime = baseDate - new Date(r.assignedDate);
      const ageDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      if (ageDays <= 2) agingBuckets['0-2 Days']++;
      else if (ageDays <= 5) agingBuckets['3-5 Days']++;
      else if (ageDays <= 7) agingBuckets['6-7 Days']++;
      else if (ageDays <= 15) agingBuckets['8-15 Days']++;
      else agingBuckets['> 15 Days']++;

      if (ageDays >= 6) {
        criticalPending.push({
          siteId: r.siteId,
          siteName: r.siteName,
          vendor: r.vendor,
          age: ageDays,
          activity: r.activity,
          status: r.status,
          assignedDate: r.assignedDate
        });
      }
    }
  });

  criticalPending.sort((a, b) => b.age - a.age);

  cachedData = {
    lastRefresh: new Date().toISOString(),
    overall: {
      totalRecords: allRecords.length,
      completed: allRecords.filter(r => r.status.toLowerCase().includes('complete') || r.completedDate !== '').length,
      wip: allRecords.filter(r => r.status.toLowerCase().includes('wip') || r.status.toLowerCase().includes('progress')).length,
      pending: allRecords.length - allRecords.filter(r => r.status.toLowerCase().includes('complete') || r.completedDate !== '').length - allRecords.filter(r => r.status.toLowerCase().includes('wip') || r.status.toLowerCase().includes('progress')).length,
      avgTat: (allRecords.filter(r => typeof r.tat === 'number').reduce((sum, r) => sum + r.tat, 0) / allRecords.filter(r => typeof r.tat === 'number').length).toFixed(2)
    },
    vendors,
    monthlyTrends: MoMTrends,
    dqc: {
      score: dqcScore,
      issuesCount: dqcAnomaliesCount,
      alerts: dqcAlerts.slice(0, 50) // Top 50 alerts
    },
    pendingAging: {
      buckets: agingBuckets,
      critical: criticalPending.slice(0, 30) // Top 30 critical pending
    },
    rawRecords: allRecords
  };

  try {
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(cachedData, null, 2));
    console.log(`[Analyzer] static data.json file updated successfully.`);

    // Inject directly into index.html / index.html.html to make it fully self-contained on GitHub Pages
    const possiblePaths = [
      path.join(__dirname, 'index.html'),
      path.join(__dirname, 'index.html.html')
    ];
    possiblePaths.forEach(indexPath => {
      if (fs.existsSync(indexPath)) {
        let indexHtml = fs.readFileSync(indexPath, 'utf8');

        // Replace target comment block safely to avoid JavaScript syntax issues
        const dataBlockRegex = /\/\* DATA_INJECTION_START \*\/[\s\S]*?\/\* DATA_INJECTION_END \*\//;
        const replacement = `/* DATA_INJECTION_START */
    var globalData = ${JSON.stringify(cachedData)};
    var database = ${JSON.stringify(cachedData.vendors)};
    /* DATA_INJECTION_END */`;

        indexHtml = indexHtml.replace(dataBlockRegex, replacement);

        fs.writeFileSync(indexPath, indexHtml, 'utf8');
        console.log(`[Analyzer] ${path.basename(indexPath)} self-contained database injected successfully.`);
      }
    });
  } catch (err) {
    console.error(`[Analyzer] Error writing/injecting compiled data:`, err.message);
  }
}

// Watch function using native directory watch to handle Excel save-by-replacement correctly
function initWatcher() {
  console.log(`[Watcher] Registering directory watch for ${__dirname}`);
  let fsWait = false;
  fs.watch(__dirname, (event, filename) => {
    if (isDownloading) return; // Prevent race conditions during automated downloads
    if (!filename) return;
    for (const k in VENDORS_CONFIG) {
      const v = VENDORS_CONFIG[k];
      if (filename === path.basename(v.file)) {
        if (fsWait) return;
        fsWait = setTimeout(() => {
          fsWait = false;
        }, 1000); // 1s debounce
        console.log(`[Watcher] Change detected on ${filename}. Re-extracting & re-indexing...`);
        try {
          extractExcel(v.file, v.dir);
          compileDataset();
        } catch (err) {
          console.error(`[Watcher] Error re-extracting ${filename}:`, err.message);
        }
      }
    }
  });
}

// Helper: Download sheet as XLSX from Google Drive / Sheets API
function downloadGoogleSheet(docId, destPath) {
  const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;
  return new Promise((resolve, reject) => {
    function get(reqUrl) {
      https.get(reqUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download: HTTP status ${res.statusCode}`));
        }
        const fileStream = fs.createWriteStream(destPath);
        fileStream.on('error', (err) => {
          console.error(`[Download Error] Failed writing ${destPath}:`, err.message);
          reject(err);
        });
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => resolve());
        });
      }).on('error', (err) => {
        try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (e) {}
        reject(err);
      });
    }
    get(url);
  });
}

// Background sync: Fetch latest data from Google Sheets every 5 minutes (300000ms)
setInterval(async () => {
  if (isDownloading) return;
  isDownloading = true;
  console.log('[Background Sync] Checking and pulling latest spreadsheets from Google Sheets...');
  try {
    for (const k in VENDORS_CONFIG) {
      const v = VENDORS_CONFIG[k];
      try {
        await downloadGoogleSheet(v.docId, v.file);
        extractExcel(v.file, v.dir);
      } catch (e) {
        console.error(`[Background Sync] Error downloading ${v.name}:`, e.message);
      }
    }
    compileDataset();
  } finally {
    isDownloading = false;
  }
}, 300000);

// Compile on start
compileDataset();
initWatcher();

module.exports = {
  getLatestData: () => {
    if (!cachedData) compileDataset();
    return cachedData;
  },
  forceRefresh: async () => {
    if (isDownloading) {
      console.log('[API] Refresh requested but a download is already in progress.');
      // Wait a bit or return current cache
      return cachedData;
    }
    isDownloading = true;
    console.log('[API] Triggering force download & reload on all Google Sheets sources.');
    try {
      const downloadPromises = [];
      for (const k in VENDORS_CONFIG) {
        const v = VENDORS_CONFIG[k];
        downloadPromises.push(
          downloadGoogleSheet(v.docId, v.file)
            .then(() => {
              console.log(`[API] Downloaded ${v.name} successfully.`);
              extractExcel(v.file, v.dir);
            })
            .catch(err => {
              console.error(`[API] Error downloading ${v.name}:`, err.message);
            })
        );
      }
      await Promise.all(downloadPromises);
      compileDataset();
    } finally {
      isDownloading = false;
    }
    return cachedData;
  }
};
