# Telecom Vendor Survey & TAT Intelligence Dashboard

```
Google Sheets (4 vendors) ──► /api/data (Vercel serverless) ──► Dashboard (polls every 45 s) ──► KPIs · charts · tables · insights
                                   │  normalise columns/dates, SLA, stage
                                   ├─ optional  Google Drive API  → real "file last modified" time
                                   └─ optional  Supabase          → last-good snapshot + "last changed" detection
```

Edit a cell in any vendor sheet → within one refresh cycle (≤45 s, or click **Refresh Now**) every KPI, chart,
ranking, insight and compliance panel recalculates. No code change, no rebuild, no page reload.

## Run locally
```bash
npm run start:mock    # uses CSV copies in data/mock  (offline testing)
npm start             # reads the live Google Sheets
npm test              # 18 automated checks of the validation scenarios
```
Open http://localhost:3005

## Deploy (GitHub → Vercel → Supabase)
1. `git init && git add . && git commit -m "TAT dashboard"` and push to a new GitHub repo.
2. Vercel → *Add New Project* → import the repo (no build command, output dir blank).
3. Vercel → Settings → Environment Variables (all optional – the dashboard works without them):

| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` | Google Cloud key with **Drive API** enabled → exact "last modified" time per sheet (needed for accurate Vendor Update Compliance) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | enables snapshot fallback + change detection. Run `supabase/schema.sql` first. **Server-side only – never put the service key in the browser or in Git.** |

## Configure (everything in `lib/config.js`)
vendors / sheet IDs / tab gids · refresh interval · default target TAT (RIPL has no standard TAT → 5 d) · update-compliance
thresholds (0–1 / 2 / 3–4 / 5+ days) · ageing buckets · month basis · spike sensitivity.
Adding a vendor = one new line in `vendors`; column names are matched by alias (`lib/normalize.js → ALIASES`).

## Definitions
* **Month** of a survey = completion month if completed, otherwise assigned month. Future/typo dates are excluded from month views and flagged in Data Quality.
* **Completed** = completion date present (or completed status). **Pending** = pending/WIP/hold. **Dropped** surveys are counted in Total but excluded from Completion %.
* **TAT** = the vendor sheet's own TAT column (it is *completion − permission date* in most sheets). **SLA** = TAT ≤ target (sheet's standard TAT, else default).
* **Last update** priority: sheet "Last Updated" column → Drive modified time → Supabase change detection → latest activity date (inferred, flagged ⚠).

## Known data issues surfaced by the Data Quality panel
Duplicated rows in the Saesha sheet, completed rows without completion date (RIPL), completed-before-assigned dates (PNS/Saesha), unparsable dates, TAT stored as text.
