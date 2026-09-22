const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const pptx = new PptxGenJS();

pptx.layout = 'LAYOUT_16x9';
pptx.title = 'Universal Vendor TAT & Real-Time Analytics Framework';
pptx.author = 'Antigravity AI Assistant';
pptx.company = 'Enterprise Vendor Operations';

// Theme Colors
const COLOR_DARK = '0F172A';        // Deep Navy
const COLOR_ACCENT = '6366F1';      // Vibrant Indigo
const COLOR_SECONDARY = '06B6D4';   // Cyan Accent
const COLOR_SUCCESS = '10B981';     // Emerald Green
const COLOR_WARNING = 'F59E0B';     // Amber Gold
const COLOR_DANGER = 'F43F5E';      // Rose Red
const COLOR_CARD_BG = '1E293B';    // Dark Slate Card
const COLOR_TEXT = 'F8FAFC';       // Bright White Text
const COLOR_MUTED = '94A3B8';      // Muted Light Gray

// Helper for standard header
function addSlideHeader(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.8, y: 0.4, w: 11.5, h: 0.6,
    fontSize: 24, bold: true, color: COLOR_TEXT, fontFace: 'Calibri'
  });
  slide.addText(subtitle, {
    x: 0.8, y: 0.95, w: 11.5, h: 0.4,
    fontSize: 13, color: COLOR_SECONDARY, fontFace: 'Calibri'
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 1.4, w: 11.5, h: 0.04, fill: { color: COLOR_ACCENT }
  });
}

// Slide 1: Title Slide
const slide1 = pptx.addSlide();
slide1.background = { color: COLOR_DARK };

slide1.addText('UNIVERSAL VENDOR TAT & PERFORMANCE DASHBOARD', {
  x: 0.8, y: 1.8, w: 11.5, h: 0.8,
  fontSize: 32, bold: true, color: COLOR_TEXT, fontFace: 'Calibri'
});

slide1.addText('End-to-End Architectural Blueprint for Data Extraction, Cloud Database Ingestion, Real-Time Sync & Compliance Auditing', {
  x: 0.8, y: 2.7, w: 11.5, h: 0.7,
  fontSize: 16, color: COLOR_SECONDARY, fontFace: 'Calibri'
});

slide1.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 3.5, w: 3.5, h: 0.06, fill: { color: COLOR_ACCENT }
});

slide1.addText([
  { text: 'Framework Purpose: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Standardized 9-Phase Methodology for Vendor Operations Analytics\n', options: { color: COLOR_MUTED } },
  { text: 'Core Capabilities: ', options: { bold: true, color: COLOR_TEXT } },
  { text: '100% Raw Data Parsing, Cloud Database Sync, WebSockets Real-Time Sync, FE Compliance Auditing\n', options: { color: COLOR_MUTED } },
  { text: 'Target Systems: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Telecom, Infrastructure, Power & Field Service Work Order Management', options: { color: COLOR_MUTED } }
], {
  x: 0.8, y: 4.0, w: 11.0, h: 2.2,
  fontSize: 13, fontFace: 'Calibri', lineSpacing: 22
});


// Slide 2: Phase 1 - Requirements & Governance
const slide2 = pptx.addSlide();
slide2.background = { color: COLOR_DARK };
addSlideHeader(slide2, 'Phase 1: Operational Scope & Governance Framework', 'Establishing KPI benchmarks, SLA targets, and standardized data rules');

const p1Items = [
  { title: '1. KPI & SLA Benchmarking', desc: 'Define Turnaround Time (TAT) thresholds per vendor contract (e.g. Standard SLA = 5 Days) and SLA compliance targets.', icon: '🎯' },
  { title: '2. Multi-Vendor Classification', desc: 'Categorize operations across distinct vendors, regions, circles, and project work types.', icon: '🏢' },
  { title: '3. Data Validation Rules', desc: 'Establish strict rules for site IDs, activity types, completion dates, and work order pending flags.', icon: '📜' },
  { title: '4. Governance & Ownership', desc: 'Map field engineers (FEs), circle managers, and vendor leads to ensure accountability.', icon: '👥' }
];

p1Items.forEach((item, i) => {
  const xPos = 0.8 + (i % 2) * 5.8;
  const yPos = 1.7 + Math.floor(i / 2) * 2.3;
  slide2.addShape(pptx.shapes.RECTANGLE, {
    x: xPos, y: yPos, w: 5.4, h: 2.0,
    fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
  });
  slide2.addText(`${item.icon} ${item.title}`, { x: xPos + 0.3, y: yPos + 0.3, w: 4.8, h: 0.4, fontSize: 15, bold: true, color: COLOR_TEXT });
  slide2.addText(item.desc, { x: xPos + 0.3, y: yPos + 0.8, w: 4.8, h: 1.0, fontSize: 12, color: COLOR_MUTED });
});


// Slide 3: Phase 2 - Data Extraction & Normalization
const slide3 = pptx.addSlide();
slide3.background = { color: COLOR_DARK };
addSlideHeader(slide3, 'Phase 2: Raw Data Extraction & Normalization Pipeline', 'Parsing multi-vendor spreadsheets and converting heterogeneous data into unified JSON schemas');

const p2Steps = [
  { step: 'Step 2.1: OpenXML Parsing', detail: 'Decompress .xlsx structures to read sharedStrings.xml and worksheet XML files directly, bypassing row limit constraints.' },
  { step: 'Step 2.2: Schema Mapping', detail: 'Map disparate column headers across vendors (e.g., "Site ID", "SiteId", "LSI", "BTS/Customer") to standard record keys.' },
  { step: 'Step 2.3: Date Normalization', detail: 'Convert Excel epoch numbers (e.g., 45500) and text date formats into ISO 8601 YYYY-MM-DD standard format.' },
  { step: 'Step 2.4: TAT Calculation', detail: 'Compute actual turnaround days vs TCL/Client standard TAT to tag records as "In TAT" or "Outside TAT".' }
];

p2Steps.forEach((st, i) => {
  const yPos = 1.7 + i * 1.1;
  slide3.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: yPos, w: 11.5, h: 0.9,
    fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
  });
  slide3.addText(st.step, { x: 1.1, y: yPos + 0.25, w: 3.2, h: 0.4, fontSize: 14, bold: true, color: COLOR_SECONDARY });
  slide3.addText(st.detail, { x: 4.5, y: yPos + 0.25, w: 7.5, h: 0.4, fontSize: 12, color: COLOR_TEXT });
});


// Slide 4: Phase 3 - Cloud Database Ingestion
const slide4 = pptx.addSlide();
slide4.background = { color: COLOR_DARK };
addSlideHeader(slide4, 'Phase 3: Cloud Database Architecture & Batch Ingestion', 'Persisting datasets into scalable PostgreSQL / Supabase cloud instances');

slide4.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.7, w: 5.5, h: 4.7,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide4.addText('Database Schema Design', {
  x: 1.1, y: 2.0, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_ACCENT
});

slide4.addText([
  { text: '• Primary Entity: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'vendor_surveys table\n', options: { color: COLOR_MUTED } },
  { text: '• Core Columns: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'site_id, site_name, project, activity, assigned_date, perm_date, completed_date, tat, tcl_tat, status, remarks, state, region, vendor\n', options: { color: COLOR_MUTED, fontSize: 11 } },
  { text: '• Indexing Strategy: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'B-tree indexes on vendor, status, state, and assigned_date for sub-second filter queries.', options: { color: COLOR_MUTED } }
], {
  x: 1.1, y: 2.6, w: 5.0, h: 3.6, fontSize: 12, lineSpacing: 18
});

slide4.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 1.7, w: 5.5, h: 4.7,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide4.addText('Batch Ingestion Protocol', {
  x: 7.1, y: 2.0, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_SUCCESS
});

slide4.addText([
  { text: '• Chunked Transmits: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Process records in batch sizes of 100 via HTTP POST to avoid payload limits.\n', options: { color: COLOR_MUTED } },
  { text: '• Auth & Security: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Authenticate via JWT bearer tokens and service API keys.\n', options: { color: COLOR_MUTED } },
  { text: '• Upsert Strategy: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Use ON CONFLICT (site_id, vendor) DO UPDATE to prevent duplicate rows.', options: { color: COLOR_MUTED } }
], {
  x: 7.1, y: 2.6, w: 5.0, h: 3.6, fontSize: 12, lineSpacing: 18
});


// Slide 5: Phase 4 - UI Architecture & Visual Design
const slide5 = pptx.addSlide();
slide5.background = { color: COLOR_DARK };
addSlideHeader(slide5, 'Phase 4: Executive Dashboard UI & Visualization System', 'Building high-impact, responsive analytics interfaces with Chart.js and dark-mode aesthetics');

const uiCards = [
  { title: 'KPI Header Cards', desc: 'Total Orders, Completion Rate, Average TAT vs SLA Benchmark, and SLA Compliance %.' },
  { title: 'Interactive Vendor Switcher', desc: 'Combined "All Vendors" view + single-click vendor deep dives with site count badges.' },
  { title: 'Chart Visualizations', desc: 'Bar charts for Activity Volumes/TAT, Doughnut for SLA split, Line chart for Daily Timelines, Pie for States.' },
  { title: 'Paginated Data Table', desc: 'Instant search bar, SLA filters, status tags, and paginated row navigation.' }
];

uiCards.forEach((c, i) => {
  const xPos = 0.8 + (i % 2) * 5.8;
  const yPos = 1.7 + Math.floor(i / 2) * 2.3;
  slide5.addShape(pptx.shapes.RECTANGLE, {
    x: xPos, y: yPos, w: 5.4, h: 2.0,
    fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
  });
  slide5.addText(c.title, { x: xPos + 0.3, y: yPos + 0.3, w: 4.8, h: 0.4, fontSize: 15, bold: true, color: COLOR_TEXT });
  slide5.addText(c.desc, { x: xPos + 0.3, y: yPos + 0.8, w: 4.8, h: 1.0, fontSize: 12, color: COLOR_MUTED });
});


// Slide 6: Phase 5 - Real-Time Engine (WebSockets)
const slide6 = pptx.addSlide();
slide6.background = { color: COLOR_DARK };
addSlideHeader(slide6, 'Phase 5: Real-Time Event Sync Engine (WebSockets)', 'Streaming live database mutations directly to active browser clients without page reloads');

slide6.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.7, w: 11.5, h: 4.7,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide6.addText('Real-Time Data Flow Architecture:', {
  x: 1.1, y: 2.0, w: 10.5, h: 0.4, fontSize: 16, bold: true, color: COLOR_SECONDARY
});

slide6.addText([
  { text: '1. Channel Initialization: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Client connects to Supabase WebSockets channel listening on postgres_changes for table vendor_surveys.\n', options: { color: COLOR_MUTED } },
  { text: '2. Change Event Detection: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Whenever a field technician or automated script updates/inserts a row, Supabase broadcasts an instant payload.\n', options: { color: COLOR_MUTED } },
  { text: '3. Dynamic State Re-Calculation: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'The dashboard fetches updated records, recalculates overall metrics, and updates Chart.js instances in place.\n', options: { color: COLOR_MUTED } },
  { text: '4. Visual Connection Badge: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'A glowing status badge (🟢 Live Connected / 🟡 Syncing / 🔴 Offline Cached) provides transparent feedback.', options: { color: COLOR_SUCCESS, bold: true } }
], {
  x: 1.1, y: 2.6, w: 10.5, h: 3.6, fontSize: 13, lineSpacing: 22
});


// Slide 7: Phase 6 - Field Team Compliance & Auditing
const slide7 = pptx.addSlide();
slide7.background = { color: COLOR_DARK };
addSlideHeader(slide7, 'Phase 6: Field Team Compliance & Update Auditing', 'Monitoring active vs delayed sheet submissions across field engineers and vendor teams');

slide7.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.7, w: 5.5, h: 4.7,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide7.addText('Roster & Status Extraction', {
  x: 1.1, y: 2.0, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_ACCENT
});

slide7.addText([
  { text: '• FE Roster Extraction: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Parse secondary sheets (Sheet2 / Sheet5) to compile field engineer names, roles, and locations.\n', options: { color: COLOR_MUTED } },
  { text: '• Update Frequency Analysis: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Measure update timestamps to evaluate daily logging regularity.\n', options: { color: COLOR_MUTED } },
  { text: '• Compliance Classification: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Tag teams as 🟢 Updating Daily vs 🔴 Delayed / Pending Submission.', options: { color: COLOR_MUTED } }
], {
  x: 1.1, y: 2.6, w: 5.0, h: 3.6, fontSize: 12, lineSpacing: 18
});

slide7.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 1.7, w: 5.5, h: 4.7,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide7.addText('Management Audit UI', {
  x: 7.1, y: 2.0, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_WARNING
});

slide7.addText([
  { text: '• Quick Access Header Action: ', options: { bold: true, color: COLOR_TEXT } },
  { text: '"🔍 Check Who Is Updating Sheet" button provides smooth navigation to audit cards.\n', options: { color: COLOR_MUTED } },
  { text: '• Interactive Status Filter: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Filter view by All Teams, 🟢 Active Updaters, or 🔴 Non-Updating / Delayed Teams.\n', options: { color: COLOR_MUTED } },
  { text: '• Vendor Escalation Flags: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Highlight vendors requiring daily progress upload enforcement.', options: { color: COLOR_DANGER, bold: true } }
], {
  x: 7.1, y: 2.6, w: 5.0, h: 3.6, fontSize: 12, lineSpacing: 18
});


// Slide 8: Phase 7 - Work Order Lifecycle & Ageing Analysis
const slide8 = pptx.addSlide();
slide8.background = { color: COLOR_DARK };
addSlideHeader(slide8, 'Phase 7: Work Order (WO) Lifecycle & Pending Ageing Analysis', 'Tracking WO status state transitions and critical pending age thresholds');

const woPhases = [
  { title: 'WO State Classification', desc: 'Map raw status strings into standard states: Pending (WO = YES), WIP (WO In Progress), Completed (WO = NO).' },
  { title: 'Vendor WO Breakdown Cards', desc: 'Per-vendor progress cards showing Total Orders, Pending count, WIP count, and % Completion progress bars.' },
  { title: 'Ageing Threshold Flags', desc: 'Categorize pending work orders into Recent (0-7d), Moderate (8-15d), and Critical (>15d Red Alert).' },
  { title: 'Site-Level WO Detail Table', desc: 'Granular table with site IDs, assigned dates, WO status tags, and calculated age days.' }
];

woPhases.forEach((w, i) => {
  const xPos = 0.8 + (i % 2) * 5.8;
  const yPos = 1.7 + Math.floor(i / 2) * 2.3;
  slide8.addShape(pptx.shapes.RECTANGLE, {
    x: xPos, y: yPos, w: 5.4, h: 2.0,
    fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
  });
  slide8.addText(w.title, { x: xPos + 0.3, y: yPos + 0.3, w: 4.8, h: 0.4, fontSize: 15, bold: true, color: COLOR_TEXT });
  slide8.addText(w.desc, { x: xPos + 0.3, y: yPos + 0.8, w: 4.8, h: 1.0, fontSize: 12, color: COLOR_MUTED });
});


// Slide 9: Phase 8 - Automated CI/CD & Cloud Deployment
const slide9 = pptx.addSlide();
slide9.background = { color: COLOR_DARK };
addSlideHeader(slide9, 'Phase 8: Automated CI/CD & Static Cloud Hosting', 'Establishing git branch workflows and zero-downtime deployment');

slide9.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.7, w: 11.5, h: 4.7,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide9.addText('Git & Static Hosting Workflow:', {
  x: 1.1, y: 2.0, w: 10.5, h: 0.4, fontSize: 16, bold: true, color: COLOR_SECONDARY
});

slide9.addText([
  { text: '1. Multi-Branch Strategy: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Maintain main branch for core code and gh-pages branch for public distribution.\n', options: { color: COLOR_MUTED } },
  { text: '2. Automated Build & Verification: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Execute node scripts to generate data.json and inject pre-rendered database state into index.html.\n', options: { color: COLOR_MUTED } },
  { text: '3. GitHub Pages Deployment: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Push gh-pages branch to trigger automatic GitHub Pages CDN distribution.\n', options: { color: COLOR_MUTED } },
  { text: '4. Zero Server Maintenance: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Entire stack runs serverlessly on CDN static edge + cloud Supabase backend.', options: { color: COLOR_SUCCESS, bold: true } }
], {
  x: 1.1, y: 2.6, w: 10.5, h: 3.6, fontSize: 13, lineSpacing: 22
});


// Slide 10: Phase 9 - QA, Error Resilience & Operational Guide
const slide10 = pptx.addSlide();
slide10.background = { color: COLOR_DARK };
addSlideHeader(slide10, 'Phase 9: Quality Assurance & Operational Best Practices', 'Summary of system safeguards, error handling, and continuous audit guidelines');

slide10.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.7, w: 5.5, h: 4.7,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide10.addText('System Quality Safeguards', {
  x: 1.1, y: 2.0, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_SUCCESS
});

slide10.addText([
  { text: '• Full Null-Safety: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'All string and filter lookups use null/undefined fallbacks to prevent runtime TypeErrors.\n', options: { color: COLOR_MUTED } },
  { text: '• Offline Cache Fallback: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'If network or cloud connection drops, UI seamlessly switches to cached local data.\n', options: { color: COLOR_MUTED } },
  { text: '• Cross-Browser Compatibility: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Tested across Chrome, Edge, Safari, and mobile browsers.', options: { color: COLOR_MUTED } }
], {
  x: 1.1, y: 2.6, w: 5.0, h: 3.6, fontSize: 12, lineSpacing: 18
});

slide10.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 1.7, w: 5.5, h: 4.7,
  fill: { color: COLOR_CARD_BG }, line: { color: '334155', width: 1 }
});

slide10.addText('Operational Action Checklist', {
  x: 7.1, y: 2.0, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: COLOR_ACCENT
});

slide10.addText([
  { text: '1. Weekly Data Audits: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Run master extraction scripts when new vendor workbooks arrive.\n', options: { color: COLOR_MUTED } },
  { text: '2. Review Compliance Panel: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Check Compliance Tracker weekly to identify delayed vendor uploads.\n', options: { color: COLOR_MUTED } },
  { text: '3. Monitor Pending Ageing: ', options: { bold: true, color: COLOR_TEXT } },
  { text: 'Filter Work Orders by Critical (>15d) to expedite site completions.', options: { color: COLOR_MUTED } }
], {
  x: 7.1, y: 2.6, w: 5.0, h: 3.6, fontSize: 12, lineSpacing: 18
});

// Save Presentation to Desktop
const desktopPath = 'C:\\Users\\PRATIK\\Desktop\\Vendor_TAT_Dashboard_General_Blueprint.pptx';
pptx.writeFile({ fileName: desktopPath }).then(() => {
  console.log(`🎉 General Blueprint PPT successfully created and saved to Desktop: ${desktopPath}`);
}).catch(err => {
  console.error('Error creating General Blueprint PPT:', err);
});
