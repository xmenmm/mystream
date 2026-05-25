import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RunningText = {
  enabled: boolean;
  text: string;
  position: 'above' | 'below';
  bgColor1: string;
  bgColor2: string;
  textColor: string;
  speed: number;
  updatedBy?: string;
  updatedAt?: string;
};

const KEY = 'runningText';
const def: RunningText = {
  enabled: false,
  text: '',
  position: 'above',
  bgColor1: '#8b5cf6',
  bgColor2: '#d946ef',
  textColor: '#ffffff',
  speed: 22,
};

/** Public: read current global running text config */
export async function GET() {
  const cfg = await getConfig<RunningText>(KEY, def);
  return NextResponse.json({ runningText: { ...def, ...cfg } });
}

/** Admin only: update */
export async function PUT(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const body = await req.json();
  const next: RunningText = {
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
  await setConfig(KEY, next);
  return NextResponse.json({ runningText: next });
}
