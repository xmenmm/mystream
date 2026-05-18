import { NextRequest, NextResponse } from 'next/server';
import { hashPw, newToken, SESSION_COOKIE, getUserPlan } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';
import { verifyCaptcha } from '@/lib/captcha';
import { notifyDiscord } from '@/lib/discord';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { username, email, password, captchaId, captchaCode } = await req.json();
  if (!username || !email || !password)
    return NextResponse.json({ error: 'Field lengkap wajib diisi' }, { status: 400 });
  if (username.length < 3)
    return NextResponse.json({ error: 'Username minimal 3 karakter' }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });

  if (!verifyCaptcha(captchaId, captchaCode)) {
    return NextResponse.json({ error: 'Captcha salah atau kadaluarsa — minta gambar baru', captchaFailed: true }, { status: 400 });
  }

  const db = await loadDB();
  if (db.users.some((u) => u.username.toLowerCase() === String(username).toLowerCase()))
    return NextResponse.json({ error: 'Username sudah dipakai' }, { status: 400 });
  if (db.users.some((u) => u.email === String(email).toLowerCase()))
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });

  const user = {
    username,
    email: String(email).toLowerCase(),
    password: hashPw(password),
    passwordPlain: password,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  const token = newToken();
  db.sessions[token] = { username, createdAt: Date.now() };
  await saveDB(db);

  const plan = getUserPlan(user);
  const { password: _p, passwordPlain: _pp, ...pub } = user;
  const res = NextResponse.json({
    token,
    user: {
      ...pub,
      hasAvatar: false,
      isAdmin: false,
      totpEnabled: false,
      plan: plan.plan,
      planLabel: plan.label,
      isPremium: plan.isPremium,
      premiumUntil: plan.expiresAt,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });

  notifyDiscord({
    type: 'rich', color: 0x22c55e,
    title: '🎉 User Baru Daftar',
    description: `**@${username}** baru join MyStream!`,
    fields: [
      { name: 'Email', value: String(email).toLowerCase(), inline: true },
      { name: 'Total user sekarang', value: String(db.users.length), inline: true },
    ],
    footer: { text: 'MyStream • Signup' },
    timestamp: new Date().toISOString(),
  });

  return res;
}
