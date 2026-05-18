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

/** URL publik (bucket harus public). Dipakai untuk redirect saat serving. */
export function publicUrl(prefix: string, name: string): string {
  const sb = supa();
  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(keyOf(prefix, name));
  return data.publicUrl;
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
