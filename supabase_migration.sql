-- ============================================================
-- Tempsend v2 — Supabase Database Migration (FRESH SETUP)
-- Run this in: Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Drop existing tables (safe for fresh setup)
drop table if exists public.shares cascade;
drop table if exists public.settings cascade;

-- 1. Create shares table with 6-char code
create table public.shares (
  id           uuid primary key default gen_random_uuid(),
  code         char(6) not null unique,
  type         text not null check (type in ('text', 'file')),
  content      text,
  storage_path text,
  filename     text,
  mime_type    text,
  file_size    bigint,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '1 hour')
);

create index shares_code_idx on public.shares (code);

-- 2. Settings table (global config — admin-controlled)
create table public.settings (
  key   text primary key,
  value text not null
);

-- Default settings
insert into public.settings (key, value) values ('expiry_hours', '1');
insert into public.settings (key, value) values ('admin_password', '123123');

-- 3. Row Level Security
alter table public.shares enable row level security;
alter table public.settings enable row level security;

create policy "public_select_shares"  on public.shares   for select using (true);
create policy "public_insert_shares"  on public.shares   for insert with check (true);
create policy "public_delete_shares"  on public.shares   for delete using (true);

create policy "public_select_settings" on public.settings for select using (true);
create policy "public_update_settings" on public.settings for update using (true);

-- ============================================================
-- Storage bucket setup
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('tempsend-files', 'tempsend-files', true, 26214400)
on conflict (id) do nothing;

drop policy if exists "public_upload"   on storage.objects;
drop policy if exists "public_download" on storage.objects;
drop policy if exists "public_delete_storage" on storage.objects;

create policy "public_upload"          on storage.objects for insert  with check (bucket_id = 'tempsend-files');
create policy "public_download"        on storage.objects for select  using      (bucket_id = 'tempsend-files');
create policy "public_delete_storage"  on storage.objects for delete  using      (bucket_id = 'tempsend-files');
