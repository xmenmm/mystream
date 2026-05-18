import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase server client (service role — full access, server-side only).
 * Dipakai untuk: DB (tabel app_data JSONB) + Storage (bucket file).
 *
 * ENV WAJIB (set di Vercel → Project Settings → Environment Variables):
 *   SUPABASE_URL                = https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   = (Settings → API → service_role secret)
 *
 * JANGAN expose service role key ke client (cuma dipakai di route/server).
 */

let _client: SupabaseClient | null = null;

export function supa(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase belum dikonfigurasi: set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di environment.',
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// Nama bucket Storage (buat 1 bucket "media", folder via prefix)
export const STORAGE_BUCKET = 'media';

// Prefix folder di dalam bucket (pengganti *_DIR lama)
export const PREFIX = {
  files: 'files',
  thumbs: 'thumbs',
  avatars: 'avatars',
  banners: 'banners',
  msg: 'msg-files',
  ads: 'ads',
} as const;
