import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, FILES_DIR, THUMBS_DIR } from '@/lib/db';
import { removeFile } from '@/lib/storage';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const myVideos = db.videos.filter((v) => v.username === a.user.username);
  for (const v of myVideos) {
    await removeFile(FILES_DIR, v.id);
    await removeFile(THUMBS_DIR, v.id + '.jpg');
  }
  db.videos = db.videos.filter((v) => v.username !== a.user.username);
  db.viewsLog = db.viewsLog.filter((l) => !myVideos.some((v) => v.id === l.videoId));
  await saveDB(db);
  return NextResponse.json({ ok: true, deleted: myVideos.length });
}
