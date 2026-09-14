const fs = require('fs');
const https = require('https');

// =========================================================================
// SUPABASE SYNC UTILITY
// Usage:
//   SUPABASE_URL="https://xyz.supabase.co" SUPABASE_KEY="anon-key" node sync_supabase.js
// =========================================================================

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️ SUPABASE_URL and SUPABASE_KEY environment variables are required.');
  console.log('Example command:');
  console.log('  set SUPABASE_URL=https://your-project.supabase.co');
  console.log('  set SUPABASE_KEY=your-anon-key');
  console.log('  node sync_supabase.js');
  process.exit(1);
}

const dataFile = 'c:/Users/PRATIK/Desktop/vendor survey tat/data.json';
if (!fs.existsSync(dataFile)) {
  console.error('Error: data.json not found!');
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const records = rawData.rawRecords || [];

console.log(`🚀 Found ${records.length} records in data.json. Starting Supabase upload...`);

// Transform to snake_case column names for PostgreSQL
const formattedRecords = records.map(r => ({
  site_id: r.siteId || '',
  site_name: r.siteName || '',
  project: r.project || '',
  activity: r.activity || '',
  assigned_date: r.assignedDate || '',
  perm_date: r.permDate || '',
  completed_date: r.completedDate || '',
  tat: typeof r.tat === 'number' ? r.tat : null,
  tcl_tat: typeof r.tclTat === 'number' ? r.tclTat : null,
  status: r.status || '',
  remarks: r.remarks || '',
  state: r.state || '',
  region: r.region || '',
  vendor: r.vendor || ''
}));

// Upload in batches of 100
async function uploadBatch(batch) {
  const urlObj = new URL(`${supabaseUrl}/rest/v1/vendor_surveys`);
  const bodyData = JSON.stringify(batch);

  return new Promise((resolve, reject) => {
    const req = https.request(urlObj, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${resBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyData);
    req.end();
  });
}

async function runSync() {
  const BATCH_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < formattedRecords.length; i += BATCH_SIZE) {
    const batch = formattedRecords.slice(i, i + BATCH_SIZE);
    try {
      await uploadBatch(batch);
      successCount += batch.length;
      console.log(`✅ Uploaded ${successCount} / ${formattedRecords.length} records to Supabase`);
    } catch (err) {
      console.error(`❌ Batch upload failed at index ${i}:`, err.message);
    }
  }

  console.log(`\n🎉 Sync complete! Total records inserted into Supabase: ${successCount}`);
}

runSync();
