-- =========================================================================
-- SUPABASE DATABASE SCHEMA FOR TELECOM VENDOR SURVEY TAT DASHBOARD
-- Run this in your Supabase Dashboard SQL Editor (https://app.supabase.com)
-- =========================================================================

-- 1. Create table for survey records
create table if not exists public.vendor_surveys (
  id bigint generated always as identity primary key,
  site_id text,
  site_name text,
  project text,
  activity text,
  assigned_date text,
  perm_date text,
  completed_date text,
  tat numeric,
  tcl_tat numeric,
  status text,
  remarks text,
  state text,
  region text,
  vendor text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create index for high-speed queries on vendor and site_id
create index if not exists idx_vendor_surveys_vendor on public.vendor_surveys(vendor);
create index if not exists idx_vendor_surveys_site_id on public.vendor_surveys(site_id);

-- 3. Enable Row Level Security (RLS)
alter table public.vendor_surveys enable row level security;

-- 4. Create policies for public access
drop policy if exists "Allow public read access" on public.vendor_surveys;
create policy "Allow public read access" on public.vendor_surveys for select using (true);

drop policy if exists "Allow public insert/update access" on public.vendor_surveys;
create policy "Allow public insert/update access" on public.vendor_surveys for all using (true);
