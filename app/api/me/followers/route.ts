import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const myFollowing = a.user.following || [];
  const list = db.users
    .filter((u) => (u.following || []).includes(a.user.username))
    .map((u) => {
      const myVids = db.videos.filter((v) => v.username === u.username);
      return {
        username: u.username,
        email: u.email,
        bio: u.bio || '',
        avatarColor: u.avatarColor || '#8b5cf6',
        videoCount: myVids.length,
        followerCount: db.users.filter((x) => (x.following || []).includes(u.username)).length,
        isFollowing: myFollowing.includes(u.username),
      };
    });
  return NextResponse.json({ users: list });
}
