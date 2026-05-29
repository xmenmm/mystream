import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Running Text khusus untuk TOPBAR dashboard (dan halaman dalam app).
 * SEPARATE dari /api/running-text yang dipakai di watch page.
 *
 * Style: transparan, tipis, muncul di area topbar di samping search.
 */

type TopbarRT = {
  enabled: boolean;
  text: string;
  textColor: string;
  speed: number;
  updatedBy?: string;
  updatedAt?: string;
};

const KEY = 'runningTextTopbar';
const def: TopbarRT = {
  enabled: false,
  text: '',
  textColor: '#9ca3af',
  speed: 30,
};

export async function GET() {
  const cfg = await getConfig<TopbarRT>(KEY, def);
  return NextResponse.json({ runningText: { ...def, ...cfg } });
}

export async function PUT(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const body = await req.json();
  const next: TopbarRT = {
    enabled: !!body.enabled,
    text: String(body.text || '').slice(0, 300),
    textColor: /^#[0-9a-fA-F]{6}$/.test(body.textColor) ? body.textColor : '#9ca3af',
    speed: Math.max(5, Math.min(120, Number(body.speed) || 30)),
    updatedBy: a.user.username,
    updatedAt: new Date().toISOString(),
  };
  await setConfig(KEY, next);
  return NextResponse.json({ runningText: next });
}
