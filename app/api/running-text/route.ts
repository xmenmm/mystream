import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';
// Anti edge-cache: tanpa ini Vercel cache GET-nya & PUT balas 405.
export const dynamic = 'force-dynamic';

const def = {
  enabled: false,
  text: '',
  position: 'above' as 'above' | 'below',
  bgColor1: '#8b5cf6',
  bgColor2: '#d946ef',
  textColor: '#ffffff',
  speed: 22,
};

/** Public: read current global running text config */
export async function GET() {
  const db = await loadDB();
  return NextResponse.json({ runningText: { ...def, ...(db.runningText || {}) } });
}

/** Admin only: update */
export async function PUT(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const body = await req.json();
  const db = await loadDB();
  db.runningText = {
    enabled: !!body.enabled,
    text: String(body.text || '').slice(0, 300),
    position: body.position === 'below' ? 'below' : 'above',
    bgColor1: /^#[0-9a-fA-F]{6}$/.test(body.bgColor1) ? body.bgColor1 : '#8b5cf6',
    bgColor2: /^#[0-9a-fA-F]{6}$/.test(body.bgColor2) ? body.bgColor2 : '#d946ef',
    textColor: /^#[0-9a-fA-F]{6}$/.test(body.textColor) ? body.textColor : '#ffffff',
    speed: Math.max(5, Math.min(120, Number(body.speed) || 22)),
    updatedBy: a.user.username,
    updatedAt: new Date().toISOString(),
  };
  await saveDB(db);
  return NextResponse.json({ runningText: db.runningText });
}
