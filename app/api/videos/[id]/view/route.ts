import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });
  v.views = (v.views || 0) + 1;
  const a = await getAuthFromRequest(req);
  db.viewsLog.push({ videoId: params.id, username: a ? a.user.username : null, ts: Date.now() });
  if (db.viewsLog.length > 20000) db.viewsLog = db.viewsLog.slice(-20000);
  await saveDB(db);
  return NextResponse.json({ views: v.views });
}
