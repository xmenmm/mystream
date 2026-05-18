import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, AVATARS_DIR } from '@/lib/db';
import { putFile, removeFile } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ct = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: 'file kosong' }, { status: 400 });
  if (buf.length > MAX)
    return NextResponse.json({ error: 'foto terlalu besar (max 10 MB)' }, { status: 413 });

  await putFile(AVATARS_DIR, a.user.username + '.jpg', buf, ct.startsWith('image/') ? ct : 'image/jpeg');

  // Tandai hasAvatar di DB (pengganti fs.existsSync)
  const db = await loadDB();
  const u = db.users.find((x) => x.username === a.user.username);
  if (u) { (u as any).hasAvatar = true; await saveDB(db); }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await removeFile(AVATARS_DIR, a.user.username + '.jpg');
  const db = await loadDB();
  const u = db.users.find((x) => x.username === a.user.username);
  if (u) { (u as any).hasAvatar = false; await saveDB(db); }
  return NextResponse.json({ ok: true });
}
