import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, pushNotif } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });
  v.likedBy = v.likedBy || [];
  const idx = v.likedBy.indexOf(a.user.username);
  if (idx >= 0) v.likedBy.splice(idx, 1);
  else {
    v.likedBy.push(a.user.username);
    db.likesLog = db.likesLog || [];
    db.likesLog.push({ videoId: v.id, username: a.user.username, ts: Date.now() });
    if (db.likesLog.length > 20000) db.likesLog = db.likesLog.slice(-20000);
    pushNotif(db, v.username, 'like', a.user.username, { videoId: v.id, text: v.title });
  }
  v.likes = v.likedBy.length;
  await saveDB(db);
  return NextResponse.json({ likes: v.likes, liked: idx < 0 });
}
