import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

/** Mark single notification as read */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = decodeURIComponent(params.id);
  const db = await loadDB();
  const n = (db.notifications || []).find((x) => x.id === id);
  if (!n) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (n.to !== a.user.username) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!n.read) {
    n.read = true;
    await saveDB(db);
  }
  return NextResponse.json({ ok: true });
}
