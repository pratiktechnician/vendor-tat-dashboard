-- Run once in Supabase → SQL Editor.  Both tables are OPTIONAL helpers used by api/data.js:
--   dashboard_snapshot : last good dataset (served if Google Sheets is unreachable)
--   vendor_sync_state  : content hash + "last changed" time per vendor sheet
-- Row Level Security is ON with NO public policies: only the server (service_role key) can read/write.
-- (The old schema allowed anonymous inserts/updates/deletes – do not reuse it.)

create table if not exists public.dashboard_snapshot (
  id          int primary key,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.vendor_sync_state (
  vendor_key       text primary key,
  content_hash     text not null,
  last_changed_at  timestamptz not null default now(),
  last_checked_at  timestamptz not null default now()
);

alter table public.dashboard_snapshot enable row level security;
alter table public.vendor_sync_state  enable row level security;
-- intentionally no policies: anon/authenticated roles get no access; service_role bypasses RLS.
