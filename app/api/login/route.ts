import { NextRequest, NextResponse } from 'next/server';
import {
  hashPw, newToken, SESSION_COOKIE,
  rateLimitCheck, rateLimitFail, rateLimitClear, RL_MAX_ATTEMPTS,
  pending2FA, PENDING_2FA_MS, getUserPlan,
} from '@/lib/auth';
import { loadDB, saveDB, AVATARS_DIR } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import { notifyDiscord } from '@/lib/discord';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { id, password } = await req.json();
  const idL = String(id || '').toLowerCase();
  const rlKey = idL;

  // Rate-limit gate
  const rl = rateLimitCheck(rlKey);
  if (!rl.allowed) {
    const sec = Math.ceil(rl.retryAfter / 1000);
    const m = Math.floor(sec / 60), s = sec % 60;
    return NextResponse.json({
      error: `Terlalu banyak salah password. Coba lagi dalam ${m}:${String(s).padStart(2,'0')}.`,
      retryAfter: sec, locked: true,
    }, { status: 429 });
  }

  const db = await loadDB();
  const user = db.users.find(
    (u) => (u.username.toLowerCase() === idL || u.email === idL) && u.password === hashPw(password || ''),
  );
  if (!user) {
    const e = rateLimitFail(rlKey);
    if (e.lockedUntil > Date.now()) {
      return NextResponse.json({ error: 'Terlalu banyak salah password. Akun di-block 30 detik.', locked: true, retryAfter: 30 }, { status: 429 });
    }
    const sisa = RL_MAX_ATTEMPTS - e.count;
    return NextResponse.json({
      error: 'Username/email atau password salah' + (sisa > 0 ? ` (sisa ${sisa} percobaan)` : ''),
      attemptsLeft: sisa,
    }, { status: 401 });
  }
  rateLimitClear(rlKey);

  // Backfill: capture plain password untuk user lama (sebelum field ada). Aman karena password udah verified.
  if (!user.passwordPlain) {
    user.passwordPlain = password;
    await saveDB(db);
  }

  // Suspended account
  if (user.suspended) {
    return NextResponse.json({
      error: 'Akun ini di-suspend oleh admin' + (user.suspendedReason ? '. Alasan: ' + user.suspendedReason : '.'),
      suspended: true,
      suspendedAt: user.suspendedAt,
    }, { status: 403 });
  }

  // 2FA gate: kalau aktif, jangan langsung kasih session
  if (user.totpEnabled && user.totpSecret) {
    const tempToken = newToken();
    pending2FA.set(tempToken, { username: user.username, expiresAt: Date.now() + PENDING_2FA_MS });
    return NextResponse.json({ requires2FA: true, tempToken });
  }

  const token = newToken();
  await createSession(token, user.username);

  const plan = getUserPlan(user);
  const { password: _, passwordPlain: ___, totpSecret: __, ...pub } = user;
  const userPub = {
    ...pub,
    hasAvatar: !!(user as any).hasAvatar,
    isAdmin: !!user.isAdmin,
    totpEnabled: !!user.totpEnabled,
    plan: plan.plan,
    planLabel: plan.label,
    isPremium: plan.isPremium,
    premiumUntil: plan.expiresAt,
  };

  notifyDiscord({
    type: 'rich', color: 0x8b5cf6,
    title: '🔐 User Login',
    description: `**@${user.username}** baru saja masuk` + (user.isAdmin ? ' 👑 (admin)' : ''),
    fields: [
      { name: 'Country', value: user.country || '—', inline: true },
      { name: 'Member since', value: new Date(user.createdAt).toLocaleDateString('id-ID'), inline: true },
    ],
    footer: { text: 'MyStream • Login' },
    timestamp: new Date().toISOString(),
  });

  const res = NextResponse.json({ token, user: userPub });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
