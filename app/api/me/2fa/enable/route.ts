import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, verifyTotpCode } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { secret, code } = await req.json();
  if (!secret || !code) return NextResponse.json({ error: 'Secret & code wajib' }, { status: 400 });
  if (!verifyTotpCode(secret, code)) return NextResponse.json({ error: 'Kode salah — coba lagi (cek waktu device)' }, { status: 400 });
  const db = await loadDB();
  const u = db.users.find((x) => x.username === a.user.username);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  u.totpSecret = secret;
  u.totpEnabled = true;
  u.totpEnabledAt = new Date().toISOString();
  await saveDB(db);
  return NextResponse.json({ ok: true, totpEnabled: true });
}
