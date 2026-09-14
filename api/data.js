const fs = require('fs');
const path = require('path');
const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL || 'https://fnvtruvkmaafvsrjfdkp.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudnRydXZrbWFhZnZzcmpmZGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMwOTcsImV4cCI6MjEwNDkzOTA5N30.DmHMy7lb_hNuXv6dEVSK6BnZkAyJD43QwuQ4QCnjr5k';

function fetchFromSupabase() {
  return new Promise((resolve, reject) => {
    if (!supabaseUrl || !supabaseKey) return reject(new Error('No Supabase credentials'));

    const url = `${supabaseUrl}/rest/v1/vendor_surveys?select=*&limit=5000`;
    const req = https.get(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const rows = JSON.parse(body);
            const rawRecords = rows.map(r => ({
              siteId: r.site_id || '',
              siteName: r.site_name || '',
              project: r.project || '',
              activity: r.activity || '',
              assignedDate: r.assigned_date || '',
              permDate: r.perm_date || '',
              completedDate: r.completed_date || '',
              tat: r.tat,
              tclTat: r.tcl_tat,
              status: r.status || '',
              remarks: r.remarks || '',
              state: r.state || '',
              region: r.region || '',
              vendor: r.vendor || ''
            }));
            resolve({ rawRecords });
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const cloudData = await fetchFromSupabase();
    if (cloudData && cloudData.rawRecords && cloudData.rawRecords.length > 0) {
      return res.status(200).json(cloudData);
    }
  } catch (err) {
    console.warn('Supabase fetch warning, using local fallback:', err.message);
  }

  try {
    const dataPath = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf8');
      return res.status(200).json(JSON.parse(content));
    }
    return res.status(404).json({ error: 'data.json file not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
