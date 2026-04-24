-- 20260421 OCR + QR pipeline schema
-- Verified against Supabase RLS guidance: enable RLS on all exposed public tables.

create extension if not exists pgcrypto;

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor text,
  date date,
  total numeric(12,2) not null default 0,
  raw_text text,
  corrected_text text,
  qr_data jsonb not null default '[]'::jsonb,
  image_metadata jsonb not null default '{}'::jsonb,
  pii_hash text,
  created_at timestamptz not null default now(),
  constraint receipts_total_non_negative check (total >= 0)
);

create table if not exists public.line_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  name text not null,
  qty numeric(10,3) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint line_items_qty_positive check (qty > 0),
  constraint line_items_unit_price_non_negative check (unit_price >= 0),
  constraint line_items_total_price_non_negative check (total_price >= 0)
);

create table if not exists public.ocr_jobs (
  job_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  confidence_metrics jsonb not null default '{}'::jsonb,
  worker_metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ocr_jobs_status_check check (status in ('queued', 'processing', 'completed', 'failed'))
);

create index if not exists idx_receipts_user_created_at on public.receipts (user_id, created_at desc);
create index if not exists idx_line_items_receipt_id on public.line_items (receipt_id);
create index if not exists idx_ocr_jobs_user_created_at on public.ocr_jobs (user_id, created_at desc);

alter table public.receipts enable row level security;
alter table public.line_items enable row level security;
alter table public.ocr_jobs enable row level security;

-- receipts policies
create policy if not exists "receipts_select_own"
  on public.receipts
  for select
  using ((select auth.uid()) = user_id);

create policy if not exists "receipts_insert_own"
  on public.receipts
  for insert
  with check ((select auth.uid()) = user_id);

create policy if not exists "receipts_update_own"
  on public.receipts
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy if not exists "receipts_delete_own"
  on public.receipts
  for delete
  using ((select auth.uid()) = user_id);

-- line_items policies (join through receipts ownership)
create policy if not exists "line_items_select_own"
  on public.line_items
  for select
  using (
    exists (
      select 1
      from public.receipts r
      where r.id = line_items.receipt_id
        and r.user_id = (select auth.uid())
    )
  );

create policy if not exists "line_items_insert_own"
  on public.line_items
  for insert
  with check (
    exists (
      select 1
      from public.receipts r
      where r.id = line_items.receipt_id
        and r.user_id = (select auth.uid())
    )
  );

create policy if not exists "line_items_update_own"
  on public.line_items
  for update
  using (
    exists (
      select 1
      from public.receipts r
      where r.id = line_items.receipt_id
        and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.receipts r
      where r.id = line_items.receipt_id
        and r.user_id = (select auth.uid())
    )
  );

create policy if not exists "line_items_delete_own"
  on public.line_items
  for delete
  using (
    exists (
      select 1
      from public.receipts r
      where r.id = line_items.receipt_id
        and r.user_id = (select auth.uid())
    )
  );

-- ocr_jobs policies
create policy if not exists "ocr_jobs_select_own"
  on public.ocr_jobs
  for select
  using ((select auth.uid()) = user_id);

create policy if not exists "ocr_jobs_insert_own"
  on public.ocr_jobs
  for insert
  with check ((select auth.uid()) = user_id);

create policy if not exists "ocr_jobs_update_own"
  on public.ocr_jobs
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy if not exists "ocr_jobs_delete_own"
  on public.ocr_jobs
  for delete
  using ((select auth.uid()) = user_id);