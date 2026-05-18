import { DB, Video, Notification } from './types';
import { supa } from './supabase';

/**
 * DB store — SELURUH db.json disimpan sebagai 1 baris JSONB di Postgres Supabase.
 * Tabel:  app_data ( id text primary key, value jsonb, updated_at timestamptz )
 * Baris:  id = 'main'
 *
 * loadDB()/saveDB() jadi ASYNC (Supabase = network). Semua pemanggil pakai await.
 *
 * Catatan: model single-document = last-write-wins (sama seperti db.json lama).
 * Cukup untuk skala demo/awal. Untuk skala besar nanti dipindah ke tabel relasional.
 */

const TABLE = 'app_data';
const ROW_ID = 'main';

// Konstanta prefix folder Storage — nama dipertahankan biar import lama nggak pecah.
// (Bukan path filesystem lagi; dipakai lib/storage.ts)
export const FILES_DIR = 'files';
export const THUMBS_DIR = 'thumbs';
export const AVATARS_DIR = 'avatars';
export const BANNERS_DIR = 'banners';
export const MSG_FILES_DIR = 'msg-files';
export const ADS_DIR = 'ads';

const DEFAULT_DB = (): DB => ({ users: [], videos: [], sessions: {}, viewsLog: [] });

export async function loadDB(): Promise<DB> {
  const sb = supa();
  const { data, error } = await sb.from(TABLE).select('value').eq('id', ROW_ID).maybeSingle();
  if (error) {
    console.error('[db] load error:', error.message);
    // Jangan crash app — kembalikan default (read-only-ish sementara)
    return DEFAULT_DB();
  }
  if (!data || !data.value) {
    // Pertama kali: bikin baris default
    const def = DEFAULT_DB();
    await sb.from(TABLE).upsert({ id: ROW_ID, value: def, updated_at: new Date().toISOString() });
    return def;
  }
  const db = data.value as DB;
  // Defensive: pastikan struktur minimum ada
  if (!db.users) db.users = [];
  if (!db.videos) db.videos = [];
  if (!db.sessions) db.sessions = {};
  if (!db.viewsLog) db.viewsLog = [];
  return db;
}

export async function saveDB(db: DB): Promise<void> {
  const sb = supa();
  const { error } = await sb
    .from(TABLE)
    .upsert({ id: ROW_ID, value: db, updated_at: new Date().toISOString() });
  if (error) {
    console.error('[db] save error:', error.message);
    throw new Error('saveDB gagal: ' + error.message);
  }
}

export function publicVideo(v: Video) {
  const { likedBy, ...pub } = v;
  return { ...pub, likedByCount: (likedBy || []).length };
}

export function pushNotif(
  db: DB,
  to: string,
  type: Notification['type'],
  from: string,
  opts: { videoId?: string; text?: string } = {},
): void {
  if (!db.notifications) db.notifications = [];
  if (to === from) return;
  db.notifications.push({
    id: 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    to,
    type,
    from,
    videoId: opts.videoId || null,
    text: (opts.text || '').slice(0, 200),
    ts: Date.now(),
    read: false,
  });
  if (db.notifications.length > 50000) {
    db.notifications.splice(0, db.notifications.length - 50000);
  }
}

export function newId(): string {
  const rand = Math.random().toString(16).slice(2, 8);
  return 'v_' + Date.now().toString(36) + '_' + rand;
}
