import { supa, STORAGE_BUCKET } from './supabase';

/**
 * Storage helper — pengganti SEMUA operasi filesystem (fs) untuk file media.
 * Pakai Supabase Storage (bucket "media", public).
 *
 * Serving file: route cukup REDIRECT ke publicUrl() — Supabase yang handle
 * streaming + HTTP Range (seek video). Vercel function nggak streaming file
 * (hemat & nggak kena limit payload).
 *
 * key = `${prefix}/${name}`  (prefix dari PREFIX di supabase.ts / *_DIR di db.ts)
 */

function keyOf(prefix: string, name: string) {
  return `${prefix}/${name}`;
}

/** Upload / overwrite file. */
export async function putFile(
  prefix: string,
  name: string,
  data: Buffer | Uint8Array | ArrayBuffer,
  contentType: string,
): Promise<void> {
  const sb = supa();
  const body = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const { error } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(keyOf(prefix, name), body as any, {
      contentType: contentType || 'application/octet-stream',
      upsert: true,
    });
  if (error) throw new Error('upload gagal: ' + error.message);
}

/**
 * Base URL Supabase yang sudah DIBERSIHKAN dari spasi/newline/enter.
 * (Env var sering kebawa newline pas paste di dashboard Vercel → bikin
 *  header Location ilegal. URL tidak pernah punya whitespace sah, jadi
 *  buang SEMUA \s aman.)
 */
function sbBase(): string {
  return (process.env.SUPABASE_URL || '')
    .replace(/\s+/g, '')
    .replace(/\/+$/, '');
}

/**
 * URL publik file (bucket public) — DIBANGUN LANGSUNG dari env, TANPA SDK.
 * Tidak ada network/SDK call saat serving → tidak bisa throw/gagal.
 * Format Supabase: {url}/storage/v1/object/public/{bucket}/{prefix}/{name}
 */
export function publicUrl(prefix: string, name: string): string {
  const base = sbBase();
  const path = String(name)
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${prefix}/${path}`;
}

/**
 * Redirect 302 ke file di Storage — MANUAL (tanpa NextResponse.redirect /
 * validateURL yang bisa throw). Dibungkus try/catch supaya TIDAK PERNAH
 * jadi 500 opak: kalau ada masalah, pesannya jelas di body.
 */
export function storageRedirect(prefix: string, name: string): Response {
  try {
    if (!sbBase()) {
      return new Response('SUPABASE_URL belum di-set di environment', { status: 500 });
    }
    const url = publicUrl(prefix, name);
    return new Response(null, {
      status: 302,
      headers: { Location: url, 'Cache-Control': 'public, max-age=300' },
    });
  } catch (e: any) {
    return new Response('storage redirect error: ' + (e?.message || String(e)), {
      status: 500,
    });
  }
}

/** Ambil bytes file (server-side) — dipakai kalau perlu proses isi file. */
export async function getBytes(prefix: string, name: string): Promise<Buffer | null> {
  const sb = supa();
  const { data, error } = await sb.storage.from(STORAGE_BUCKET).download(keyOf(prefix, name));
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Cek file ada. */
export async function fileExists(prefix: string, name: string): Promise<boolean> {
  const sb = supa();
  const { data, error } = await sb.storage
    .from(STORAGE_BUCKET)
    .list(prefix, { search: name, limit: 100 });
  if (error || !data) return false;
  return data.some((f) => f.name === name);
}

/** Hapus file (abaikan kalau tidak ada). */
export async function removeFile(prefix: string, name: string): Promise<void> {
  const sb = supa();
  await sb.storage.from(STORAGE_BUCKET).remove([keyOf(prefix, name)]);
}

/** Pindah/rename file (abaikan kalau gagal/tidak ada). */
export async function moveFile(
  prefix: string,
  fromName: string,
  toName: string,
): Promise<void> {
  const sb = supa();
  await sb.storage
    .from(STORAGE_BUCKET)
    .move(keyOf(prefix, fromName), keyOf(prefix, toName))
    .catch(() => {});
}
