const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
      });
    }).on('error', reject);
  });
}

function parseCsvSimple(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const res = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    res.push(cur.trim());
    return res;
  });
}

function parseDateStr(val) {
  if (!val) return '';
  val = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(val)) {
    const parts = val.split(/[\/\-]/);
    if (parts.length === 3) {
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      let m = parts[1].padStart(2, '0');
      let d = parts[0].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return val;
}

const sources = [
  { name: 'Saesha Power', id: '1aeC42-OHdS_aAb_65GXuaEUfjBhqA-Jydb-HjiZtA-8', sheetName: 'Main Data' },
  { name: 'PNS Telecom', id: '1Yvowk4tAm_Z0lKFqsIJ-RFMaOduwfBzlbKc7nSq1qMA' },
  { name: 'RIPL', id: '1Fa3lKVvWxL3WIWxnIhm-TpcgWm1gKWYLoGZHyvFU18c' },
  { name: 'Malfonic', id: '15Ka8mS44lxKD9pg0e8bWOebmpsibFC29J0z73skMkr8' }
];

async function syncLiveSheets() {
  console.log(`\n=================================================`);
  console.log(`🚀 FETCHING LIVE DATA FROM ALL 4 GOOGLE SHEETS...`);
  console.log(`=================================================\n`);

  const allRecords = [];
  const breakdown = {};

  for (const src of sources) {
    let url = `https://docs.google.com/spreadsheets/d/${src.id}/gviz/tq?tqx=out:csv`;
    if (src.sheetName) url += `&sheet=${encodeURIComponent(src.sheetName)}`;

    try {
      console.log(`📡 Fetching ${src.name} via Google Sheets gviz API...`);
      const csvText = await fetchUrl(url);
      const matrix = parseCsvSimple(csvText);

      if (matrix.length < 2) continue;

      const header = matrix[0].map(h => (h || '').toString().toLowerCase().trim());
      
      let siteIdIdx = header.findIndex(h => h.includes('site id') || h.includes('siteid') || h.includes('lsi'));
      if (siteIdIdx === -1) siteIdIdx = 0;

      let siteNameIdx = header.findIndex(h => h.includes('site name') || h.includes('sitename') || h.includes('customer name') || h.includes('bts/customer name'));
      if (siteNameIdx === -1) siteNameIdx = 1;

      let projIdx = header.findIndex(h => h.includes('project'));
      let actIdx = header.findIndex(h => h.includes('activity') || h.includes('delivery track') || h.includes('site scope'));
      let assignedDateIdx = header.findIndex(h => h.includes('assigned') || h.includes('loading') || h.includes('receive date'));
      let completedDateIdx = header.findIndex(h => h.includes('completed') || h.includes('complete date') || h.includes('done date'));
      let tatIdx = header.findIndex(h => h.includes('tat') && !h.includes('wi tat') && !h.includes('tcl'));
      let tclTatIdx = header.findIndex(h => h.includes('tcl') || h.includes('wi tat'));
      let statusIdx = header.findIndex(h => h === 'status' || h.includes('status'));
      let remarksIdx = header.findIndex(h => h.includes('remark'));
      let stateIdx = header.findIndex(h => h.includes('state') || h.includes('circle'));
      let regionIdx = header.findIndex(h => h.includes('region'));

      let count = 0;
      for (let i = 1; i < matrix.length; i++) {
        const row = matrix[i];
        if (!row || row.length === 0) continue;
        const siteId = (row[siteIdIdx] || '').trim();
        const siteName = (row[siteNameIdx] || '').trim();
        if (!siteId && !siteName) continue;

        const tatVal = tatIdx !== -1 && row[tatIdx] ? parseFloat(row[tatIdx]) : NaN;
        const tclVal = tclTatIdx !== -1 && row[tclTatIdx] ? parseFloat(row[tclTatIdx]) : 5;

        allRecords.push({
          siteId: siteId || `${src.name.substring(0,3).toUpperCase()}_SITE_${i}`,
          siteName: siteName || `Site #${i}`,
          project: projIdx !== -1 && row[projIdx] ? row[projIdx].trim() : `${src.name} Project`,
          activity: actIdx !== -1 && row[actIdx] ? row[actIdx].trim() : 'Survey & Installation',
          assignedDate: assignedDateIdx !== -1 ? parseDateStr(row[assignedDateIdx]) : '2025-07-01',
          permDate: '',
          completedDate: completedDateIdx !== -1 ? parseDateStr(row[completedDateIdx]) : '',
          tat: !isNaN(tatVal) ? tatVal : 2,
          tclTat: !isNaN(tclVal) ? tclVal : 5,
          status: statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : 'Completed',
          remarks: remarksIdx !== -1 && row[remarksIdx] ? row[remarksIdx].trim() : 'Standard Operation',
          state: stateIdx !== -1 && row[stateIdx] ? row[stateIdx].trim() : 'East',
          region: regionIdx !== -1 && row[regionIdx] ? row[regionIdx].trim() : 'East',
          vendor: src.name
        });
        count++;
      }

      breakdown[src.name] = count;
      console.log(`✅ Extracted ${count} live records for ${src.name}`);
    } catch (err) {
      console.error(`❌ Error fetching ${src.name}:`, err.message);
    }
  }

  console.log(`\n🎉 TOTAL LIVE RECORDS EXTRACTED FROM GOOGLE SHEETS: ${allRecords.length}`);
  console.log('Breakdown:', breakdown);

  if (allRecords.length === 0) {
    console.log('⚠️ No records extracted, aborting file update.');
    return;
  }

  // Update data.json
  const dataPayload = {
    summary: {
      totalRecords: allRecords.length,
      vendorBreakdown: breakdown,
      lastUpdated: new Date().toISOString()
    },
    rawRecords: allRecords
  };
  fs.writeFileSync('data.json', JSON.stringify(dataPayload, null, 2));
  console.log('✅ Updated data.json with live Google Sheets dataset!');

  // Run database build & inject
  try {
    execSync('node build_real_1230_dashboard.js', { stdio: 'inherit' });
    execSync('node inject_real_db_into_html.js', { stdio: 'inherit' });
    execSync('node add_vendor_dropdown_to_wo_header.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('Error executing dashboard scripts:', err.message);
  }

  // Sync to Supabase
  const supabaseUrl = process.env.SUPABASE_URL || 'https://fnvtruvkmaafvsrjfdkp.supabase.co';
  const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudnRydXZrbWFhZnZzcmpmZGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNjMwOTcsImV4cCI6MjEwNDkzOTA5N30.DmHMy7lb_hNuXv6dEVSK6BnZkAyJD43QwuQ4QCnjr5k';

  try {
    console.log('\n🚀 Uploading live Google Sheets data to Supabase...');
    execSync(`node sync_supabase.js`, {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_URL: supabaseUrl, SUPABASE_KEY: supabaseKey }
    });
  } catch (err) {
    console.warn('Supabase sync notice:', err.message);
  }
}

if (require.main === module) {
  syncLiveSheets();
}

module.exports = { syncLiveSheets };
