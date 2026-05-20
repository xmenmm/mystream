import { supa } from './supabase';

/**
 * Sessions DI TABEL TERPISAH — bukan di app_data JSONB lagi.
 *
 * Kenapa: model single-doc app_data = last-write-wins. Saat user login,
 * session ditulis ke db.sessions, tapi request lain (notif/ads/dll) yang
 * memuat db SEBELUM login selesai bisa nulis ulang & menghapus session
 * baru itu → user "tiba-tiba" gak login lagi.
 *
 * Tabel `sessions` dipakai langsung (insert/select/delete per-row) → tidak
 * race dengan tulisan app_data yang lain.
 *
 * Wajib jalankan SQL di Supabase (sekali):
 *   create table if not exists public.sessions (
 *     token       text primary key,
 *     username    text not null,
 *     created_at  timestamptz not null default now()
 *   );
 *   create index if not exists idx_sessions_username on public.sessions(username);
 */

const T = 'sessions';

export type SessionRow = { username: string; createdAt: number };

export async function createSession(token: string, username: string): Promise<void> {
  const sb = supa();
  const { error } = await sb.from(T).insert({ token, username });
  if (error) throw new Error('createSession: ' + error.message);
}

export async function getSession(token: string): Promise<SessionRow | null> {
  const sb = supa();
  const { data, error } = await sb
    .from(T)
    .select('username, created_at')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return null;
  return { username: data.username, createdAt: new Date(data.created_at).getTime() };
}

export async function deleteSession(token: string): Promise<void> {
  const sb = supa();
  await sb.from(T).delete().eq('token', token);
}

export async function deleteAllSessionsForUser(username: string): Promise<void> {
  const sb = supa();
  await sb.from(T).delete().eq('username', username);
}

export async function renameUserSessions(
  oldUsername: string,
  newUsername: string,
): Promise<void> {
  const sb = supa();
  await sb.from(T).update({ username: newUsername }).eq('username', oldUsername);
}

export async function listSessionsForUser(
  username: string,
): Promise<{ token: string; createdAt: number }[]> {
  const sb = supa();
  const { data, error } = await sb
    .from(T)
    .select('token, created_at')
    .eq('username', username);
  if (error || !data) return [];
  return data.map((r) => ({ token: r.token, createdAt: new Date(r.created_at).getTime() }));
}

export async function countSessionsForUser(username: string): Promise<number> {
  const sb = supa();
  const { count } = await sb
    .from(T)
    .select('*', { count: 'exact', head: true })
    .eq('username', username);
  return count || 0;
}
