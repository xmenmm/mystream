import { supa } from './supabase';

/**
 * Admin config (globalLayers, banner, running-text, dll) DI TABEL TERPISAH —
 * bukan di app_data JSONB lagi. Alasan sama dengan sessions:
 *   app_data = single-doc → write user (notif/views/lastActive) menimpa
 *   simpanan admin yang baru → tersimpan, tapi langsung hilang.
 *
 * Tabel `app_config` per-key per-row → tulisan admin tidak race dengan
 * tulisan user.
 *
 * SQL (jalankan SEKALI di Supabase SQL Editor):
 *   create table if not exists public.app_config (
 *     key         text primary key,
 *     value       jsonb not null default '{}'::jsonb,
 *     updated_at  timestamptz not null default now()
 *   );
 */
const T = 'app_config';

export async function getConfig<T = any>(key: string, def: T): Promise<T> {
  const sb = supa();
  // Catatan: kombinasi .eq('key', key).maybeSingle() bisa balas null padahal
  // baris ada (bug di versi storage-js / PostgREST tertentu).
  // Workaround: ambil array lalu filter di JS.
  const { data, error } = await sb.from(T).select('key, value');
  if (error || !data) return def;
  const row = (data as any[]).find((r) => r.key === key);
  return (row?.value as T) ?? def;
}

export async function setConfig(key: string, value: any): Promise<void> {
  const sb = supa();
  const { error } = await sb
    .from(T)
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error('setConfig(' + key + '): ' + error.message);
}
