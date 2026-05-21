import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';
import { loadDB, saveDB, AVATARS_DIR, FILES_DIR, THUMBS_DIR } from '@/lib/db';
import { moveFile, removeFile } from '@/lib/storage';
import { renameUserSessions, deleteAllSessionsForUser } from '@/lib/sessions';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { password: _p, passwordPlain: _pp, totpSecret: __, ...pub } = a.user;
  const plan = getUserPlan(a.user);
  // Locale dibaca dari app_config (race-proof), bukan dari db.users JSONB.
  const localeCfg = await getConfig<{ locale?: string }>(`locale:${a.user.username}`, {});
  return NextResponse.json({
    user: {
      ...pub,
      hasAvatar: !!(a.user as any).hasAvatar,
      isAdmin: !!a.user.isAdmin,
      totpEnabled: !!a.user.totpEnabled,
      plan: plan.plan,
      planLabel: plan.label,
      isPremium: plan.isPremium,
      premiumUntil: plan.expiresAt,
      locale: localeCfg.locale || (a.user as any).locale || 'id',
    },
  });
}

export async function PUT(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { username, email, bio, avatarColor, country } = await req.json();
  const db = await loadDB();
  const u = db.users.find((x) => x.username === a.user.username);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  if (username && username !== u.username) {
    if (username.length < 3) return NextResponse.json({ error: 'Username minimal 3 karakter' }, { status: 400 });
    if (db.users.some((x) => x.username.toLowerCase() === String(username).toLowerCase() && x.username !== u.username))
      return NextResponse.json({ error: 'Username sudah dipakai' }, { status: 400 });
    const old = u.username;
    // Pindahkan avatar di Storage (kalau ada)
    if ((u as any).hasAvatar) {
      await moveFile(AVATARS_DIR, old + '.jpg', username + '.jpg');
    }
    u.username = username;
    db.videos.forEach((v) => {
      if (v.username === old) v.username = username;
      if (Array.isArray(v.likedBy)) v.likedBy = v.likedBy.map((x) => (x === old ? username : x));
    });
    await renameUserSessions(old, username);
    db.users.forEach((x) => {
      if (Array.isArray(x.following)) x.following = x.following.map((n) => (n === old ? username : n));
    });
    if (Array.isArray(db.messages)) {
      db.messages.forEach((m) => {
        if (m.from === old) m.from = username;
        if (m.to === old) m.to = username;
      });
    }
  }
  if (email && email !== u.email) {
    const el = String(email).toLowerCase();
    if (db.users.some((x) => x.email === el && x.username !== u.username))
      return NextResponse.json({ error: 'Email sudah dipakai' }, { status: 400 });
    u.email = el;
  }
  if (typeof bio === 'string') u.bio = bio.slice(0, 300);
  if (typeof avatarColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(avatarColor)) u.avatarColor = avatarColor;
  if (typeof country === 'string') u.country = country.slice(0, 60);
  await saveDB(db);
  const { password: _p, passwordPlain: _pp, totpSecret: __t, ...pub } = u;
  return NextResponse.json({ user: pub });
}

export async function DELETE(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const myVideos = db.videos.filter((v) => v.username === a.user.username);
  for (const v of myVideos) {
    await removeFile(FILES_DIR, v.id);
    await removeFile(THUMBS_DIR, v.id + '.jpg');
  }
  if ((a.user as any).hasAvatar) await removeFile(AVATARS_DIR, a.user.username + '.jpg');
  db.videos = db.videos.filter((v) => v.username !== a.user.username);
  db.viewsLog = db.viewsLog.filter((l) => !myVideos.some((v) => v.id === l.videoId));
  db.users = db.users.filter((x) => x.username !== a.user.username);
  await deleteAllSessionsForUser(a.user.username);
  await saveDB(db);
  return NextResponse.json({ ok: true });
}
