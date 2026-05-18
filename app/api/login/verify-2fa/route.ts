import { NextRequest, NextResponse } from 'next/server';
import { newToken, SESSION_COOKIE, pending2FA, verifyTotpCode, getUserPlan } from '@/lib/auth';
import { loadDB, saveDB, AVATARS_DIR } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { tempToken, code } = await req.json();
  const p = pending2FA.get(tempToken);
  if (!p || p.expiresAt < Date.now()) {
    pending2FA.delete(tempToken);
    return NextResponse.json({ error: 'Sesi 2FA expired, login ulang.' }, { status: 401 });
  }
  const db = await loadDB();
  const user = db.users.find((u) => u.username === p.username);
  if (!user || !user.totpSecret) return NextResponse.json({ error: 'User tidak ditemukan atau 2FA dimatikan.' }, { status: 401 });
  if (!verifyTotpCode(user.totpSecret, code)) {
    return NextResponse.json({ error: 'Kode 2FA salah atau kadaluarsa.' }, { status: 401 });
  }
  pending2FA.delete(tempToken);
  const token = newToken();
  db.sessions[token] = { username: user.username, createdAt: Date.now() };
  await saveDB(db);
  const plan = getUserPlan(user);
  const { password: _, passwordPlain: ___, totpSecret: __, ...pub } = user;
  const res = NextResponse.json({
    token,
    user: {
      ...pub,
      hasAvatar: !!(user as any).hasAvatar,
      isAdmin: !!user.isAdmin,
      totpEnabled: true,
      plan: plan.plan,
      planLabel: plan.label,
      isPremium: plan.isPremium,
      premiumUntil: plan.expiresAt,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
