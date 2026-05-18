import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, publicVideo, FILES_DIR, THUMBS_DIR } from '@/lib/db';
import { removeFile } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ video: publicVideo(v) });
}

/** Edit video.
 *  - title/description: owner atau admin
 *  - playerLayers: ADMIN ONLY (sponsor links yang user harus klik dulu)
 *  Max 5 layers. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const isOwner = v.username === a.user.username;
  if (!a.user.isAdmin && !isOwner) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (typeof body.title === 'string') v.title = body.title.slice(0, 200);
  if (typeof body.description === 'string') v.description = body.description.slice(0, 2000);
  // playerLayers HANYA admin
  if (Array.isArray(body.playerLayers)) {
    if (!a.user.isAdmin) {
      return NextResponse.json({ error: 'Hanya admin yang bisa atur Player Layers' }, { status: 403 });
    }
    v.playerLayers = body.playerLayers
      .slice(0, 5)
      .map((l: any) => ({
        url: String(l?.url || '').slice(0, 500),
        label: l?.label ? String(l.label).slice(0, 40) : undefined,
      }))
      .filter((l: any) => /^https?:\/\//i.test(l.url));
  }
  await saveDB(db);
  return NextResponse.json({ video: publicVideo(v) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const idx = db.videos.findIndex((x) => x.id === params.id);
  if (idx < 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (db.videos[idx].username !== a.user.username)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  db.videos.splice(idx, 1);
  db.viewsLog = db.viewsLog.filter((l) => l.videoId !== params.id);
  await saveDB(db);
  await removeFile(FILES_DIR, params.id);
  await removeFile(THUMBS_DIR, params.id + '.jpg');
  return NextResponse.json({ ok: true });
}
