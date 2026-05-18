import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, hashPw } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { oldPassword, newPassword } = await req.json();
  if (!newPassword || String(newPassword).length < 6)
    return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
  const db = await loadDB();
  const u = db.users.find((x) => x.username === a.user.username);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  if (u.password !== hashPw(oldPassword || ''))
    return NextResponse.json({ error: 'Password lama salah' }, { status: 400 });
  u.password = hashPw(newPassword);
  u.passwordPlain = newPassword;
  await saveDB(db);
  return NextResponse.json({ ok: true });
}
