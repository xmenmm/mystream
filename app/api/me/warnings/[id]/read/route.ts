import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const u = db.users.find((x) => x.username === a.user.username);
  const w = (u?.warnings || []).find((w) => w.id === params.id);
  if (!w) return NextResponse.json({ error: 'warning not found' }, { status: 404 });
  w.read = true;
  await saveDB(db);
  return NextResponse.json({ ok: true });
}
