import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, publicVideo, AVATARS_DIR } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  const username = decodeURIComponent(params.username);
  const db = await loadDB();
  const u = db.users.find((x) => x.username === username);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  const a = await getAuthFromRequest(req);
  const myVids = db.videos.filter((v) => v.username === u.username);
  const followers = db.users.filter((x) => (x.following || []).includes(u.username));
  return NextResponse.json({
    user: {
      username: u.username,
      email: u.email,
      bio: u.bio || '',
      avatarColor: u.avatarColor || '#8b5cf6',
      country: u.country || '',
      hasAvatar: !!(u as any).hasAvatar,
      createdAt: u.createdAt,
      isAdmin: !!u.isAdmin,
      isPremium: !!u.isPremium,
      isVerified: !!u.isVerified,
      following: u.following || [],
      followers: followers.map((f) => f.username),
      videoCount: myVids.length,
      totalViews: myVids.reduce((s, v) => s + (v.views || 0), 0),
      videos: myVids.map(publicVideo),
      isFollowing: a ? (a.user.following || []).includes(u.username) : false,
      isMe: a ? u.username === a.user.username : false,
    },
  });
}
