const PptxGenJS = require('pptxgenjs');
const fs = require('fs');

const pptx = new PptxGenJS();

pptx.layout = 'LAYOUT_16x9';
pptx.title = 'Vendor Survey TAT Dashboard - Technical Documentation';
pptx.author = 'Antigravity AI Assistant';
pptx.company = 'Vendor Operations Management';

// Theme Colors
const COLOR_DARK = '0F172A';
const COLOR_ACCENT = '6366F1';
const COLOR_SECONDARY = '06B6D4';
const COLOR_SUCCESS = '10B981';
const COLOR_WARNING = 'F43F5E';
const COLOR_CARD_BG = '1E293B';
const COLOR_TEXT = 'F8FAFC';
const COLOR_MUTED = '94A3B8';

// Slide 1: Title Slide
const slide1 = pptx.addSlide();
slide1.background = { color: COLOR_DARK };

slide1.addText('VENDOR SURVEY TAT DASHBOARD', {
  x: 0.8, y: 1.8, w: 11.5, h: 0.8,
  fontSize: 34, bold: true, color: COLOR_TEXT, fontFace: 'Calibri'
});

slide1.addText('End-to-End Technical Implementation & Live Integration Documentation', {
  x: 0.8, y: 2.7, w: 11.5, h: 0.6,
  fontSize: 18, color: COLOR_SECONDARY, fontFace: 'Calibri'
});

slide1.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 3.5, w: 3.0, h: 0.06, fill: { color: COLOR_ACCENT }
});

slide1.addText([
  { text: 'Target Dataset: ', options: { bold: true, color: COLOR_TEXT } },
  { text: '1,231 Site Survey Records (100% Complete)\n', options: { color: COLOR_MUTED } },
  { text: 'Vendors Covered: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'PNS Telecom, Saesha Power, RIPL, Malfonic\n', options: { color: COLOR_MUTED } },
  { text: 'Deployment Target: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'GitHub Pages & Supabase Cloud Realtime', options: { color: COLOR_MUTED } }
], {
  x: 0.8, y: 4.0, w: 11.0, h: 2.2,
  fontSize: 14, fontFace: 'Calibri', lineSpacing: 22
});


// Slide 2: Executive Summary
const slide2 = pptx.addSlide();
slide2.background = { color: COLOR_DARK };

slide2.addText('Executive Summary & Key Milestones', {
  x: 0.8, y: 0.5, w: 11.5, h: 0.6,
  fontSize: 24, bold: true, color: COLOR_TEXT
});

slide2.addText('Overview of project goals, data volume, and system architecture', {
  x: 0.8, y: 1.1, w: 11.5, h: 0.4,
  fontSize: 14, color: COLOR_MUTED
});

// 4 Stats Cards
const stats = [
  { val: '1,231', label: 'Total Site Surveys', sub: '100% Extracted from XML', color: COLOR_ACCENT },
  { val: '4 Vendors', label: 'Multi-Vendor Coverage', sub: 'PNS, Saesha, RIPL, Malfonic', color: COLOR_SECONDARY },
  { val: 'Real-Time', label: 'Supabase WebSockets', sub: 'Instant Live Data Updates', color: COLOR_SUCCESS },
  { val: 'Live Site', label: 'GitHub Pages Hosted', sub: 'Auto-deployed via gh-pages', color: COLOR_TEXT }
];

stats.forEach((st, idx) => {
  const xPos = 0.8 + idx * 3.0;
  slide2.addShape(pptx.shapes.RECTANGLE, {
    x: xPos, y: 1.8, w: 2.7, h: 2.0,
    fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
  });
  slide2.addText(st.val, {
    x: xPos + 0.1, y: 2.0, w: 2.5, h: 0.6,
    fontSize: 24, bold: true, color: st.color, align: 'center'
  });
  slide2.addText(st.label, {
    x: xPos + 0.1, y: 2.6, w: 2.5, h: 0.4,
    fontSize: 13, bold: true, color: COLOR_TEXT, align: 'center'
  });
  slide2.addText(st.sub, {
    x: xPos + 0.1, y: 3.0, w: 2.5, h: 0.6,
    fontSize: 10, color: COLOR_MUTED, align: 'center'
  });
});

slide2.addText([
  { text: 'Key Problem Solved: ', options: { bold: true, color: COLOR_SUCCESS } },
  { text: 'Earlier dashboards truncated data to 1,230 or fewer records due to header limit filters. The new extraction engine parses 100% of all data rows across all sheets, syncs to Supabase, and provides live real-time updates for field teams.\n\n', options: { color: COLOR_TEXT } },
  { text: 'Compliance Audit Feature: ', options: { bold: true, color: COLOR_ACCENT } },
  { text: 'Integrated an interactive FE/Team level tracker allowing managers to check who is updating sheets daily vs who is delayed.', options: { color: COLOR_TEXT } }
], {
  x: 0.8, y: 4.2, w: 11.5, h: 2.5,
  fontSize: 13, fontFace: 'Calibri', lineSpacing: 20
});


// Slide 3: Step 1 - Data Extraction
const slide3 = pptx.addSlide();
slide3.background = { color: COLOR_DARK };

slide3.addText('Step 1: 100% Raw Spreadsheet XML Data Extraction', {
  x: 0.8, y: 0.5, w: 11.5, h: 0.6,
  fontSize: 24, bold: true, color: COLOR_TEXT
});

slide3.addText('Auditing raw uncompressed OpenXML sheet files across all vendor workbooks', {
  x: 0.8, y: 1.1, w: 11.5, h: 0.4,
  fontSize: 14, color: COLOR_MUTED
});

const vendorRows = [
  { name: 'Saesha Power', sheet: 'extracted_xlsx/xl/worksheets/sheet3.xml', count: '716 Sites', status: '🟢 Complete' },
  { name: 'PNS Telecom', sheet: 'extracted_new_xlsx/xl/worksheets/sheet1.xml', count: '279 Sites', status: '🟢 Complete' },
  { name: 'Malfonic', sheet: 'extracted_v4/xl/worksheets/sheet1.xml', count: '135 Sites', status: '🟢 Complete' },
  { name: 'RIPL', sheet: 'extracted_v3/xl/worksheets/sheet1.xml', count: '101 Sites', status: '🟢 Complete' }
];

vendorRows.forEach((v, i) => {
  const yPos = 1.8 + i * 1.0;
  slide3.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: yPos, w: 11.5, h: 0.8,
    fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
  });
  slide3.addText(v.name, { x: 1.0, y: yPos + 0.2, w: 2.5, h: 0.4, fontSize: 14, bold: true, color: COLOR_TEXT });
  slide3.addText(v.sheet, { x: 3.5, y: yPos + 0.2, w: 4.5, h: 0.4, fontSize: 11, color: COLOR_MUTED, fontFace: 'Courier New' });
  slide3.addText(v.count, { x: 8.2, y: yPos + 0.2, w: 2.0, h: 0.4, fontSize: 14, bold: true, color: COLOR_SECONDARY });
  slide3.addText(v.status, { x: 10.2, y: yPos + 0.2, w: 1.8, h: 0.4, fontSize: 13, bold: true, color: COLOR_SUCCESS });
});

slide3.addText('Result: Standardized output saved to data.json & scratch_db.json containing all 1,231 verified records.', {
  x: 0.8, y: 6.0, w: 11.5, h: 0.5, fontSize: 13, italic: true, color: COLOR_MUTED
});


// Slide 4: Step 2 - Supabase Cloud Sync
const slide4 = pptx.addSlide();
slide4.background = { color: COLOR_DARK };

slide4.addText('Step 2: Supabase Cloud Database Architecture & Batch Sync', {
  x: 0.8, y: 0.5, w: 11.5, h: 0.6,
  fontSize: 24, bold: true, color: COLOR_TEXT
});

slide4.addText('Establishing cloud PostgreSQL persistence for real-time query scalability', {
  x: 0.8, y: 1.1, w: 11.5, h: 0.4,
  fontSize: 14, color: COLOR_MUTED
});

slide4.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.8, w: 5.5, h: 4.5,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide4.addText('Supabase Configuration', {
  x: 1.1, y: 2.1, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_SECONDARY
});

slide4.addText([
  { text: 'Project URL:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'https://fnvtruvkmaafvsrjfdkp.supabase.co\n\n', options: { color: COLOR_MUTED, fontFace: 'Courier New' } },
  { text: 'Table Name:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'vendor_surveys\n\n', options: { color: COLOR_MUTED, fontFace: 'Courier New' } },
  { text: 'Schema Columns:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'site_id, site_name, project, activity, assigned_date, perm_date, completed_date, tat, tcl_tat, status, remarks, state, region, vendor', options: { color: COLOR_MUTED, fontSize: 10 } }
], {
  x: 1.1, y: 2.6, w: 5.0, h: 3.5, fontSize: 12
});

slide4.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 1.8, w: 5.5, h: 4.5,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide4.addText('Batch Upload Engine (sync_supabase.js)', {
  x: 7.1, y: 2.1, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_SUCCESS
});

slide4.addText([
  { text: '• Batch Chunk Size: ', options: { bold: true, color: COLOR_TEXT } },
  { text: '100 records per HTTP POST\n', options: { color: COLOR_MUTED } },
  { text: '• Authentication: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Bearer JWT + anon-key header\n', options: { color: COLOR_MUTED } },
  { text: '• Error Handling: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Automatic retries on Network Timeout\n', options: { color: COLOR_MUTED } },
  { text: '• Ingestion Outcome: ', options: { bold: true, color: COLOR_TEXT } },
  { text: '1,231 / 1,231 records uploaded successfully (100% sync)', options: { color: COLOR_SUCCESS, bold: true } }
], {
  x: 7.1, y: 2.7, w: 5.0, h: 3.2, fontSize: 12, lineSpacing: 18
});


// Slide 5: Step 3 - Real-Time Engine
const slide5 = pptx.addSlide();
slide5.background = { color: COLOR_DARK };

slide5.addText('Step 3: Real-Time Live Updates Engine (WebSockets)', {
  x: 0.8, y: 0.5, w: 11.5, h: 0.6,
  fontSize: 24, bold: true, color: COLOR_TEXT
});

slide5.addText('Enabling instant, reload-free dashboard updates when vendors edit data', {
  x: 0.8, y: 1.1, w: 11.5, h: 0.4,
  fontSize: 14, color: COLOR_MUTED
});

const features = [
  { title: '1. Supabase JS SDK', desc: 'Integrated @supabase/supabase-js v2 via CDN into index.html head section.', icon: '⚡' },
  { title: '2. Postgres Realtime Listener', desc: 'Subscribed to channel("public:vendor_surveys") on postgres_changes event (*).', icon: '📡' },
  { title: '3. Auto Re-Aggregation', desc: 'Recalculates KPIs, SLA compliance, TAT averages, state splits, and charts automatically.', icon: '🔄' },
  { title: '4. Visual Live Status Badge', desc: 'Added a animated glowing green dot indicator next to vendor selector dropdown.', icon: '🟢' }
];

features.forEach((f, i) => {
  const xPos = 0.8 + (i % 2) * 5.8;
  const yPos = 1.8 + Math.floor(i / 2) * 2.3;
  slide5.addShape(pptx.shapes.RECTANGLE, {
    x: xPos, y: yPos, w: 5.4, h: 2.0,
    fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
  });
  slide5.addText(`${f.icon} ${f.title}`, { x: xPos + 0.3, y: yPos + 0.3, w: 4.8, h: 0.4, fontSize: 15, bold: true, color: COLOR_TEXT });
  slide5.addText(f.desc, { x: xPos + 0.3, y: yPos + 0.8, w: 4.8, h: 1.0, fontSize: 12, color: COLOR_MUTED });
});


// Slide 6: Step 4 - Sheet Update Compliance Tracker
const slide6 = pptx.addSlide();
slide6.background = { color: COLOR_DARK };

slide6.addText('Step 4: Sheet Update Compliance Tracker (Who is Updating)', {
  x: 0.8, y: 0.5, w: 11.5, h: 0.6,
  fontSize: 24, bold: true, color: COLOR_TEXT
});

slide6.addText('Giving management full visibility into active vs delayed field teams', {
  x: 0.8, y: 1.1, w: 11.5, h: 0.4,
  fontSize: 14, color: COLOR_MUTED
});

slide6.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.8, w: 11.5, h: 4.5,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide6.addText('Compliance Tracker Components:', {
  x: 1.1, y: 2.1, w: 10.5, h: 0.4, fontSize: 16, bold: true, color: COLOR_SECONDARY
});

slide6.addText([
  { text: '• Quick Navigation Button: ', options: { bold: true, color: COLOR_TEXT } },
  { text: '"🔍 Check Who Is Updating Sheet" button added to main header for 1-click smooth scrolling.\n', options: { color: COLOR_MUTED } },
  { text: '• 42 Team & FE Roster: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Parsed from Sheet 2/5 of raw workbooks to track Field Engineers (PNS, Saesha, Malfonic, RIPL).\n', options: { color: COLOR_MUTED } },
  { text: '• Interactive Filters: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Switch between All Teams (42), 🟢 Updating Daily (30 Teams), and 🔴 Delayed / Not Updating (12 Teams).\n', options: { color: COLOR_MUTED } },
  { text: '• Status Highlights: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Identified PNS Telecom, Saesha Power & Malfonic as Active Daily Updaters, and RIPL as Needing Escalation.', options: { color: COLOR_SUCCESS, bold: true } }
], {
  x: 1.1, y: 2.7, w: 10.5, h: 3.3, fontSize: 13, lineSpacing: 22
});


// Slide 7: Step 5 - Lower Section Fixes & WO Status Engine
const slide7 = pptx.addSlide();
slide7.background = { color: COLOR_DARK };

slide7.addText('Step 5: Lower Section Null-Safety & Work Order (WO) Engine', {
  x: 0.8, y: 0.5, w: 11.5, h: 0.6,
  fontSize: 24, bold: true, color: COLOR_TEXT
});

slide7.addText('Eliminating table filter exceptions and restoring Work Order analytics', {
  x: 0.8, y: 1.1, w: 11.5, h: 0.4,
  fontSize: 14, color: COLOR_MUTED
});

slide7.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.8, w: 5.5, h: 4.5,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide7.addText('Null-Safety Fix in filterTable()', {
  x: 1.1, y: 2.1, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_WARNING
});

slide7.addText([
  { text: 'Issue Identified:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Direct .toLowerCase() calls on missing site fields threw uncaught TypeErrors, freezing table rendering.\n\n', options: { color: COLOR_MUTED } },
  { text: 'Solution Implemented:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Wrapped all text filter lookups in string conversion with null fallback: (r.siteId || "").toString().toLowerCase().', options: { color: COLOR_SUCCESS } }
], {
  x: 1.1, y: 2.7, w: 5.0, h: 3.3, fontSize: 12, lineSpacing: 18
});

slide7.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 1.8, w: 5.5, h: 4.5,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide7.addText('Work Order (WO) Status Engine', {
  x: 7.1, y: 2.1, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_ACCENT
});

slide7.addText([
  { text: 'Function Engine:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Added complete renderWoDashboard() and getWoPendingStatus() helpers to index.html.\n\n', options: { color: COLOR_MUTED } },
  { text: 'Interactivity Restored:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Wired search inputs, vendor filters, status filters, ageing filters (>15d critical), and Reset button.', options: { color: COLOR_SUCCESS } }
], {
  x: 7.1, y: 2.7, w: 5.0, h: 3.3, fontSize: 12, lineSpacing: 18
});


// Slide 8: Step 6 - GitHub Pages Deployment
const slide8 = pptx.addSlide();
slide8.background = { color: COLOR_DARK };

slide8.addText('Step 6: GitHub Pages Automated Deployment Pipeline', {
  x: 0.8, y: 0.5, w: 11.5, h: 0.6,
  fontSize: 24, bold: true, color: COLOR_TEXT
});

slide8.addText('Deploying static site build directly to GitHub Pages without Vercel team permission blocks', {
  x: 0.8, y: 1.1, w: 11.5, h: 0.4,
  fontSize: 14, color: COLOR_MUTED
});

slide8.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.8, w: 11.5, h: 4.5,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide8.addText('Deployment Steps Followed:', {
  x: 1.1, y: 2.1, w: 10.5, h: 0.4, fontSize: 16, bold: true, color: COLOR_SECONDARY
});

slide8.addText([
  { text: '1. Repository Setup: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Pushed code to github.com/pratiktechnician/vendor-tat-dashboard.git.\n', options: { color: COLOR_MUTED } },
  { text: '2. Branch Synchronization: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Maintained strict sync between main and gh-pages branches via fast-forward merges.\n', options: { color: COLOR_MUTED } },
  { text: '3. GitHub Pages Build: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Configured GitHub Pages settings to deploy from gh-pages root directory.\n', options: { color: COLOR_MUTED } },
  { text: '4. Live Verification: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Verified live response HTTP 200 at https://pratiktechnician.github.io/vendor-tat-dashboard/', options: { color: COLOR_SUCCESS, bold: true } }
], {
  x: 1.1, y: 2.7, w: 10.5, h: 3.3, fontSize: 13, lineSpacing: 22
});


// Slide 9: Conclusion & Live Links
const slide9 = pptx.addSlide();
slide9.background = { color: COLOR_DARK };

slide9.addText('Summary & Operational URLs', {
  x: 0.8, y: 0.5, w: 11.5, h: 0.6,
  fontSize: 24, bold: true, color: COLOR_TEXT
});

slide9.addText('Final deployment status and system resources', {
  x: 0.8, y: 1.1, w: 11.5, h: 0.4,
  fontSize: 14, color: COLOR_MUTED
});

slide9.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.8, w: 11.5, h: 4.5,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide9.addText('Deployment Resources & Access Links', {
  x: 1.1, y: 2.1, w: 10.5, h: 0.4, fontSize: 16, bold: true, color: COLOR_SUCCESS
});

slide9.addText([
  { text: '🌐 Live Dashboard URL:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'https://pratiktechnician.github.io/vendor-tat-dashboard/\n\n', options: { color: COLOR_SECONDARY, fontFace: 'Courier New', bold: true } },
  { text: '📦 GitHub Repository:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'https://github.com/pratiktechnician/vendor-tat-dashboard\n\n', options: { color: COLOR_MUTED, fontFace: 'Courier New' } },
  { text: '⚡ Supabase Cloud Endpoint:\n', options: { bold: true, color: COLOR_TEXT } },
  { text: 'https://fnvtruvkmaafvsrjfdkp.supabase.co (vendor_surveys table)', options: { color: COLOR_MUTED, fontFace: 'Courier New' } }
], {
  x: 1.1, y: 2.7, w: 10.5, h: 3.3, fontSize: 13, lineSpacing: 18
});

// Save Presentation
const outputFile = 'Vendor_TAT_Dashboard_Implementation_Steps.pptx';
pptx.writeFile({ fileName: outputFile }).then(() => {
  console.log(`🎉 PPT successfully created and saved to: ${outputFile}`);
}).catch(err => {
  console.error('Error creating PPT:', err);
});
