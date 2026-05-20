import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';
import { deleteAllSessionsForUser } from '@/lib/sessions';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const target = decodeURIComponent(params.username);
  if (target === a.user.username) return NextResponse.json({ error: 'Tidak bisa suspend diri sendiri' }, { status: 400 });
  const { reason } = await req.json();
  const db = await loadDB();
  const u = db.users.find((x) => x.username === target);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  if (u.isAdmin) return NextResponse.json({ error: 'Tidak bisa suspend admin lain' }, { status: 403 });
  u.suspended = true;
  u.suspendedReason = (reason || '').slice(0, 200);
  u.suspendedAt = new Date().toISOString();
  u.suspendedBy = a.user.username;
  await deleteAllSessionsForUser(target);
  await saveDB(db);
  return NextResponse.json({ ok: true, username: target, suspended: true });
}
