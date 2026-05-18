import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '40', 10)));
  const db = await loadDB();
  const events: any[] = [];
  for (const u of db.users) {
    events.push({ type: 'register', user: u.username, ts: new Date(u.createdAt).getTime(), text: 'bergabung di MyStream' });
  }
  for (const v of db.videos) {
    events.push({ type: 'upload', user: v.username, ts: new Date(v.uploadedAt).getTime(), text: `upload "${(v.title || '').slice(0, 60)}"`, videoId: v.id });
  }
  for (const l of (db.likesLog || []).slice(-200)) {
    const v = db.videos.find((x) => x.id === l.videoId);
    events.push({ type: 'like', user: l.username, ts: l.ts, text: `like "${(v?.title || 'video').slice(0, 60)}"`, videoId: l.videoId });
  }
  events.sort((x, y) => y.ts - x.ts);
  return NextResponse.json({ activity: events.slice(0, limit) });
}
