-- ============================================================
-- Tempsend v2 — Supabase Database Migration (FRESH SETUP)
-- Run this in: Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Drop existing table and policies if they exist (safe for fresh setup)
drop table if exists public.shares cascade;

-- 1. Create shares table with 6-char code
create table public.shares (
  id           uuid primary key default gen_random_uuid(),
  code         char(6) not null unique,      -- e.g. "31jd2p" — the share URL code
  type         text not null check (type in ('text', 'file')),
  content      text,                          -- text shares
  storage_path text,                          -- file shares (path in bucket)
  filename     text,
  mime_type    text,
  file_size    bigint,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '1 hour')
);

-- Fast lookup by code
create index shares_code_idx on public.shares (code);

-- 2. Row Level Security
alter table public.shares enable row level security;

-- 3. Public read + insert (no login needed)
create policy "public_select" on public.shares
  for select using (true);

create policy "public_insert" on public.shares
  for insert with check (true);

-- ============================================================
-- Storage bucket setup
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('tempsend-files', 'tempsend-files', true, 26214400)
on conflict (id) do nothing;

-- Drop existing storage policies if they exist
drop policy if exists "public_upload" on storage.objects;
drop policy if exists "public_download" on storage.objects;

create policy "public_upload" on storage.objects
  for insert with check (bucket_id = 'tempsend-files');

create policy "public_download" on storage.objects
  for select using (bucket_id = 'tempsend-files');
