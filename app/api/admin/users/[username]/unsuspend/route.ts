import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const db = await loadDB();
  const u = db.users.find((x) => x.username === decodeURIComponent(params.username));
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  delete u.suspended;
  delete u.suspendedReason;
  delete u.suspendedAt;
  delete u.suspendedBy;
  await saveDB(db);
  return NextResponse.json({ ok: true, suspended: false });
}
