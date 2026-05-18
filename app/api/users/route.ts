import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, AVATARS_DIR } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  const url = new URL(req.url);
  const search = (url.searchParams.get('q') || '').toLowerCase().trim();
  const db = await loadDB();
  const myFollowing = a ? a.user.following || [] : [];
  const list = db.users
    .filter((u) => !search || u.username.toLowerCase().includes(search))
    .map((u) => {
      const myVids = db.videos.filter((v) => v.username === u.username);
      const followers = db.users.filter((x) => (x.following || []).includes(u.username)).length;
      return {
        username: u.username,
        email: u.email,
        bio: u.bio || '',
        avatarColor: u.avatarColor || '#8b5cf6',
        country: u.country || '',
        hasAvatar: !!(u as any).hasAvatar,
        createdAt: u.createdAt,
        videoCount: myVids.length,
        totalViews: myVids.reduce((s, v) => s + (v.views || 0), 0),
        followerCount: followers,
        followingCount: (u.following || []).length,
        isFollowing: a ? myFollowing.includes(u.username) : false,
        isMe: a ? u.username === a.user.username : false,
      };
    })
    .sort((x, y) => y.followerCount - x.followerCount);
  return NextResponse.json({ users: list });
}
