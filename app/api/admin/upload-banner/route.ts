import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { BANNERS_DIR } from '@/lib/db';
import { putFile } from '@/lib/storage';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

/** POST: upload image jadi banner ke Supabase Storage. Body = raw bytes. */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const ct = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME.has(ct)) {
    return NextResponse.json({ error: `MIME tidak didukung. Pakai: ${[...ALLOWED_MIME].join(', ')}` }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: 'file kosong' }, { status: 400 });
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: `file terlalu besar (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });
  }

  const ext = EXT_BY_MIME[ct];
  const id = 'b_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
  const filename = id + ext;
  await putFile(BANNERS_DIR, filename, buf, ct);

  return NextResponse.json({
    ok: true,
    url: `/api/banner-image/${filename}`,
    filename,
    size: buf.length,
  });
}
