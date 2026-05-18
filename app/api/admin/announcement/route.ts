import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const { text, type = 'info' } = await req.json();
  if (!text || !String(text).trim()) return NextResponse.json({ error: 'isi announcement kosong' }, { status: 400 });
  const db = await loadDB();
  db.announcements = db.announcements || [];
  db.announcements.forEach((x) => (x.active = false));
  const ann = {
    id: 'a_' + Date.now().toString(36),
    text: String(text).trim().slice(0, 500),
    type: (['info', 'warn', 'success'].includes(type) ? type : 'info') as 'info' | 'warn' | 'success',
    by: a.user.username,
    ts: Date.now(),
    active: true,
  };
  db.announcements.push(ann);
  await saveDB(db);
  return NextResponse.json({ ok: true, announcement: ann });
}

export async function DELETE(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const db = await loadDB();
  (db.announcements || []).forEach((x) => (x.active = false));
  await saveDB(db);
  return NextResponse.json({ ok: true });
}
