import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

/** Grant premium. Body: { days?: number, months?: number, untilISO?: string, mode?: 'extend' | 'set' }
 * - untilISO = string ISO datetime → set premiumUntil ke tanggal tepat (override mode)
 * - days = 0 atau months = 0 → lifetime (no expiry)
 * - days > 0 atau months > 0 → durasi (extend by default, atau set kalau mode='set')
 * - untilISO menang dari days/months kalau dua-duanya dikirim.
 */
export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const untilISO = typeof body.untilISO === 'string' ? body.untilISO : null;
  const days = body.days != null ? Number(body.days) : null;
  const months = body.months != null ? Number(body.months) : null;
  const mode: 'extend' | 'set' = body.mode === 'set' ? 'set' : 'extend';
  const db = await loadDB();
  const u = db.users.find((x) => x.username === decodeURIComponent(params.username));
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  u.isPremium = true;
  u.premiumSince = u.premiumSince || new Date().toISOString();
  u.premiumGrantedBy = a.user.username;

  let lifetime = false;
  if (untilISO) {
    const d = new Date(untilISO);
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'untilISO format invalid' }, { status: 400 });
    if (d.getTime() <= Date.now()) return NextResponse.json({ error: 'tanggal premium harus di masa depan' }, { status: 400 });
    u.premiumUntil = d.toISOString();
  } else if (days === 0 || months === 0) {
    delete u.premiumUntil;
    lifetime = true;
  } else if (days != null && days > 0) {
    const base = mode === 'extend' && u.premiumUntil && new Date(u.premiumUntil) > new Date()
      ? new Date(u.premiumUntil)
      : new Date();
    base.setTime(base.getTime() + days * 24 * 60 * 60 * 1000);
    u.premiumUntil = base.toISOString();
  } else if (months != null && months > 0) {
    const base = mode === 'extend' && u.premiumUntil && new Date(u.premiumUntil) > new Date()
      ? new Date(u.premiumUntil)
      : new Date();
    base.setMonth(base.getMonth() + months);
    u.premiumUntil = base.toISOString();
  } else {
    const base = mode === 'extend' && u.premiumUntil && new Date(u.premiumUntil) > new Date()
      ? new Date(u.premiumUntil)
      : new Date();
    base.setTime(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    u.premiumUntil = base.toISOString();
  }
  await saveDB(db);
  return NextResponse.json({
    ok: true,
    isPremium: true,
    premiumUntil: u.premiumUntil || null,
    lifetime,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const db = await loadDB();
  const u = db.users.find((x) => x.username === decodeURIComponent(params.username));
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  delete u.isPremium;
  delete u.premiumUntil;
  delete u.premiumSince;
  delete u.premiumGrantedBy;
  await saveDB(db);
  return NextResponse.json({ ok: true, isPremium: false });
}
