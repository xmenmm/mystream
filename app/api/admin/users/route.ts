import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const db = await loadDB();
  const list = db.users.map((u) => {
    const myVids = db.videos.filter((v) => v.username === u.username);
    const followers = db.users.filter((x) => (x.following || []).includes(u.username)).length;
    const plan = getUserPlan(u);
    return {
      username: u.username, email: u.email, country: u.country || '',
      createdAt: u.createdAt, lastActiveAt: u.lastActiveAt || null,
      videoCount: myVids.length,
      totalViews: myVids.reduce((s, v) => s + (v.views || 0), 0),
      totalLikes: myVids.reduce((s, v) => s + (v.likes || 0), 0),
      followerCount: followers,
      followingCount: (u.following || []).length,
      suspended: !!u.suspended,
      suspendedReason: u.suspendedReason || null,
      suspendedAt: u.suspendedAt || null,
      warningCount: (u.warnings || []).length,
      isAdmin: !!u.isAdmin,
      totpEnabled: !!u.totpEnabled,
      plan: plan.plan,
      isPremium: plan.isPremium,
      premiumUntil: u.premiumUntil || null,
      isVerified: !!u.isVerified,
      verifiedSince: u.verifiedSince || null,
      verifiedBy: u.verifiedBy || null,
    };
  });
  return NextResponse.json({ users: list });
}
