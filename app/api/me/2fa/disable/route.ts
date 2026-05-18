import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, hashPw } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { password } = await req.json();
  const db = await loadDB();
  const u = db.users.find((x) => x.username === a.user.username);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  if (u.password !== hashPw(password || '')) return NextResponse.json({ error: 'Password salah' }, { status: 401 });
  delete u.totpSecret;
  delete u.totpEnabled;
  delete u.totpEnabledAt;
  await saveDB(db);
  return NextResponse.json({ ok: true, totpEnabled: false });
}
