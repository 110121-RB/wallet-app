-- Run this once in Supabase SQL Editor.

alter table public.transactions
  add column if not exists category text not null default 'other',
  add column if not exists description text,
  add column if not exists receipt_url text;

-- A public bucket lets the app display receipt images from their stored URL.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can read their receipts" on storage.objects;
create policy "Users can read their receipts"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload their receipts" on storage.objects;
create policy "Users can upload their receipts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
