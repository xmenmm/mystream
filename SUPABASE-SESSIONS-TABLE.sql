-- ============================================================
--  MyStream — Tabel sessions terpisah (anti race condition)
--  Jalankan SEKALI di: Supabase Dashboard → SQL Editor → New query → RUN
--
--  Kenapa: dulu sessions disimpan di app_data JSONB. Saat user login,
--  request lain di background (notif/ads/dll) yang load db SEBELUM login
--  selesai bisa nulis ulang & menghapus session baru → user "tiba-tiba"
--  ketendang logout. Pindah ke tabel terpisah = aman dari race ini.
-- ============================================================

create table if not exists public.sessions (
  token       text primary key,
  username    text not null,
  created_at  timestamptz not null default now()
);

-- Index untuk filter by username (dipakai saat suspend user, hapus all sessions, dll)
create index if not exists idx_sessions_username on public.sessions(username);

-- ============================================================
--  Tabel app_config — admin config (globalLayers, banner, dll) per-key
--  per-row, anti race dengan tulisan user (lastActiveAt, notif, dll).
-- ============================================================
create table if not exists public.app_config (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Selesai. Cek: Table Editor → sessions + app_config (dua tabel baru).
