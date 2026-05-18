-- ============================================================
--  MyStream — Setup Supabase
--  Jalankan di: Supabase Dashboard → SQL Editor → New query → RUN
-- ============================================================

-- 1) Tabel penyimpan SELURUH db.json sebagai 1 baris JSONB
create table if not exists public.app_data (
  id          text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) Baris awal (kosong default). Data asli kamu di-seed lewat script migrate
--    (scripts/migrate-to-supabase.mjs) — JANGAN isi manual di sini.
insert into public.app_data (id, value)
values ('main', '{"users":[],"videos":[],"sessions":{},"viewsLog":[]}'::jsonb)
on conflict (id) do nothing;

-- 3) STORAGE BUCKET (kalau lebih suka lewat SQL; bisa juga lewat UI):
--    Dashboard → Storage → New bucket → name: media → PUBLIC bucket → Save
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- 4) Policy storage: izinkan baca publik (file di-serve via redirect publicUrl).
--    Upload/hapus dilakukan server pakai service_role (bypass policy) — aman.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='media public read'
  ) then
    create policy "media public read"
      on storage.objects for select
      using ( bucket_id = 'media' );
  end if;
end $$;

-- Selesai. Cek: Table Editor → app_data (ada baris id='main'),
--               Storage → bucket 'media' (Public).
