import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';
import { loadDB, AVATARS_DIR } from '@/lib/db';
import { listSessionsForUser } from '@/lib/sessions';

export const runtime = 'nodejs';

/** Full detail user — admin only. Returns: profile, password hash, totp secret,
 *  active sessions, videos, followers/following, premium history, warnings, dll. */
export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const username = decodeURIComponent(params.username);
  const db = await loadDB();
  const u = db.users.find((x) => x.username === username);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  const myVids = db.videos.filter((v) => v.username === u.username);
  const followers = db.users.filter((x) => (x.following || []).includes(u.username)).map((f) => f.username);
  const following = u.following || [];
  const plan = getUserPlan(u);

  const activeSessions = (await listSessionsForUser(u.username)).map((s) => ({
    tokenPreview: s.token.slice(0, 8) + '…' + s.token.slice(-4),
    tokenFull: s.token,
    createdAt: s.createdAt,
  }));

  const messagesSent = (db.messages || []).filter((m) => m.from === u.username).length;
  const messagesReceived = (db.messages || []).filter((m) => m.to === u.username).length;

  const premiumCodes = (db.premiumCodes || []).filter((c) => c.username === u.username);

  const totalStorage = myVids.reduce((s, v) => s + (v.size || 0), 0);
  const totalViews = myVids.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = myVids.reduce((s, v) => s + (v.likes || 0), 0);

  const hasAvatar = !!(u as any).hasAvatar;

  return NextResponse.json({
    user: {
      username: u.username,
      email: u.email,
      passwordHash: u.password,
      passwordHashAlgo: 'sha256(password + "mystream_salt_v1")',
      passwordPlain: u.passwordPlain || null,
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt || null,
      bio: u.bio || '',
      country: u.country || '',
      avatarColor: u.avatarColor || '',
      hasAvatar,

      isAdmin: !!u.isAdmin,
      isPremium: plan.isPremium,
      plan: plan.plan,
      premiumSince: u.premiumSince || null,
      premiumUntil: u.premiumUntil || null,
      premiumGrantedBy: u.premiumGrantedBy || null,

      isVerified: !!u.isVerified,
      verifiedSince: u.verifiedSince || null,
      verifiedBy: u.verifiedBy || null,
      verifiedReason: u.verifiedReason || null,

      suspended: !!u.suspended,
      suspendedReason: u.suspendedReason || null,
      suspendedAt: u.suspendedAt || null,
      suspendedBy: u.suspendedBy || null,

      totpEnabled: !!u.totpEnabled,
      totpSecret: u.totpSecret || null,
      totpEnabledAt: u.totpEnabledAt || null,

      warnings: u.warnings || [],
      following,
      followers,
      followingCount: following.length,
      followerCount: followers.length,
    },
    stats: {
      videoCount: myVids.length,
      totalStorageBytes: totalStorage,
      totalViews,
      totalLikes,
      messagesSent,
      messagesReceived,
    },
    videos: myVids.map((v) => ({
      id: v.id,
      title: v.title,
      uploadedAt: v.uploadedAt,
      size: v.size,
      views: v.views || 0,
      likes: v.likes || 0,
      duration: v.duration || 0,
    })),
    premiumCodes,
    activeSessions,
  });
}
