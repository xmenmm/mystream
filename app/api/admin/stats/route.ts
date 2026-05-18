import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const db = await loadDB();
  const now = Date.now();
  const ONLINE_MS = 5 * 60 * 1000;
  const onlineUsers = db.users.filter((u) => u.lastActiveAt && now - u.lastActiveAt < ONLINE_MS);
  const totalViews = db.videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = db.videos.reduce((s, v) => s + (v.likes || 0), 0);
  const suspended = db.users.filter((u) => u.suspended).length;
  const newToday = db.users.filter((u) => now - new Date(u.createdAt).getTime() < 86400000).length;
  return NextResponse.json({
    totalUsers: db.users.length,
    totalVideos: db.videos.length,
    totalViews, totalLikes,
    onlineNow: onlineUsers.length,
    onlineUsernames: onlineUsers.map((u) => u.username),
    suspended, newToday,
  });
}
