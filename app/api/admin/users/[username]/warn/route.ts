import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const { text } = await req.json();
  if (!text || !String(text).trim()) return NextResponse.json({ error: 'pesan peringatan kosong' }, { status: 400 });
  const db = await loadDB();
  const u = db.users.find((x) => x.username === decodeURIComponent(params.username));
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  u.warnings = u.warnings || [];
  const warning = {
    id: 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    text: String(text).trim().slice(0, 500),
    by: a.user.username,
    ts: Date.now(),
    read: false,
  };
  u.warnings.push(warning);
  await saveDB(db);
  return NextResponse.json({ ok: true, warning });
}
