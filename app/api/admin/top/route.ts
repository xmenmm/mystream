import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const url = new URL(req.url);
  const by = url.searchParams.get('by') || 'views';
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
  const db = await loadDB();
  const enriched = db.users.map((u) => {
    const myVids = db.videos.filter((v) => v.username === u.username);
    return {
      username: u.username,
      avatarColor: u.avatarColor || '#8b5cf6',
      videos: myVids.length,
      views: myVids.reduce((s, v) => s + (v.views || 0), 0),
      likes: myVids.reduce((s, v) => s + (v.likes || 0), 0),
      followers: db.users.filter((x) => (x.following || []).includes(u.username)).length,
    } as any;
  });
  const key = (['views', 'likes', 'videos', 'followers'].includes(by) ? by : 'views') as 'views';
  enriched.sort((x: any, y: any) => y[key] - x[key]);
  return NextResponse.json({ by: key, top: enriched.slice(0, limit) });
}
