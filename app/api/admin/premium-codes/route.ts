import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

/** GET → list semua premium codes (untuk admin panel)
 *  Query: ?status=pending|approved|rejected|all (default: pending)
 */
export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'pending';
  const db = await loadDB();
  let list = db.premiumCodes || [];
  if (status !== 'all') list = list.filter((c) => c.status === status);
  list = [...list].sort((x, y) => y.createdAt - x.createdAt);
  return NextResponse.json({ codes: list });
}

/** POST { code, action: 'approve' | 'reject', reason? }
 *  approve → grant premium ke user sesuai tier durasi (extend dari premiumUntil yang ada)
 */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase();
  const action = body.action === 'reject' ? 'reject' : 'approve';
  const reason = typeof body.reason === 'string' ? body.reason : '';

  if (!code) return NextResponse.json({ error: 'kode kosong' }, { status: 400 });

  const db = await loadDB();
  if (!db.premiumCodes) db.premiumCodes = [];
  const c = db.premiumCodes.find((x) => x.code.toUpperCase() === code);
  if (!c) return NextResponse.json({ error: 'kode tidak ditemukan' }, { status: 404 });
  if (c.status !== 'pending') {
    return NextResponse.json({ error: `kode sudah ${c.status}` }, { status: 400 });
  }

  if (action === 'reject') {
    c.status = 'rejected';
    c.rejectedReason = reason || 'rejected by admin';
    await saveDB(db);
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // Approve → grant premium
  const u = db.users.find((x) => x.username === c.username);
  if (!u) return NextResponse.json({ error: 'user kode tidak ditemukan' }, { status: 404 });

  u.isPremium = true;
  u.premiumSince = u.premiumSince || new Date().toISOString();
  u.premiumGrantedBy = a.user.username;

  // Extend dari premiumUntil yang masih aktif, atau mulai dari sekarang
  const base = u.premiumUntil && new Date(u.premiumUntil) > new Date()
    ? new Date(u.premiumUntil)
    : new Date();
  base.setTime(base.getTime() + c.days * 24 * 60 * 60 * 1000);
  u.premiumUntil = base.toISOString();

  c.status = 'approved';
  c.approvedAt = Date.now();
  c.approvedBy = a.user.username;

  // Send notif ke user (best effort)
  if (!db.notifications) db.notifications = [];
  db.notifications.push({
    id: 'nt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    to: c.username,
    type: 'follow',
    from: a.user.username,
    videoId: null,
    text: `🎉 Premium ${c.tierId.toUpperCase()} kamu udah di-approve! Aktif sampai ${new Date(u.premiumUntil!).toLocaleDateString('id-ID')}.`,
    ts: Date.now(),
    read: false,
  });

  await saveDB(db);
  return NextResponse.json({
    ok: true,
    status: 'approved',
    premiumUntil: u.premiumUntil,
    username: c.username,
    tierId: c.tierId,
  });
}
