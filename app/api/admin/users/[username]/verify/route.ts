import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

/** Grant verified badge. Body: { reason?: string } */
export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : '';

  const db = await loadDB();
  const u = db.users.find((x) => x.username === decodeURIComponent(params.username));
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  u.isVerified = true;
  u.verifiedSince = u.verifiedSince || new Date().toISOString();
  u.verifiedBy = a.user.username;
  if (reason) u.verifiedReason = reason;

  // Notif ke user
  if (!db.notifications) db.notifications = [];
  db.notifications.push({
    id: 'nt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    to: u.username,
    type: 'follow',
    from: a.user.username,
    videoId: null,
    text: `🎉 Akun kamu udah diverifikasi! Centang biru ✓ sekarang muncul di profile.`,
    ts: Date.now(),
    read: false,
  });

  await saveDB(db);
  return NextResponse.json({ ok: true, isVerified: true });
}

/** Revoke verified badge */
export async function DELETE(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const db = await loadDB();
  const u = db.users.find((x) => x.username === decodeURIComponent(params.username));
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  delete u.isVerified;
  delete u.verifiedSince;
  delete u.verifiedBy;
  delete u.verifiedReason;
  await saveDB(db);
  return NextResponse.json({ ok: true, isVerified: false });
}
