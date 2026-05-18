import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, AVATARS_DIR } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const db = await loadDB();
  const all = (db.notifications || [])
    .filter((n) => n.to === a.user.username)
    .sort((x, y) => y.ts - x.ts)
    .slice(0, limit);
  const enriched = all.map((n) => {
    const fromUser = db.users.find((u) => u.username === n.from);
    const video = n.videoId ? db.videos.find((v) => v.id === n.videoId) : null;
    return {
      ...n,
      fromAvatarColor: fromUser ? fromUser.avatarColor || '#8b5cf6' : '#8b5cf6',
      fromHasAvatar: fromUser ? !!(fromUser as any).hasAvatar : false,
      videoTitle: video ? video.title : '',
      videoHasThumb: video ? video.hasThumb : false,
    };
  });
  return NextResponse.json({ notifications: enriched });
}
