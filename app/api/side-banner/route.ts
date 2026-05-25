import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SideBanner = {
  enabled: boolean;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  bgColor1: string;
  bgColor2: string;
  textColor: string;
  height: string;
  objectFit: string;
  updatedBy?: string;
  updatedAt?: string;
};

const KEY = 'sideBanner';
const def: SideBanner = {
  enabled: true,
  imageUrl: '',
  title: '',
  subtitle: '',
  ctaText: '',
  ctaUrl: '',
  bgColor1: '#7c3aed',
  bgColor2: '#c026d3',
  textColor: '#ffffff',
  height: 'auto',
  objectFit: 'cover',
};

export async function GET() {
  const cfg = await getConfig<SideBanner>(KEY, def);
  return NextResponse.json({ banner: { ...def, ...cfg } });
}

export async function PUT(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin)
    return NextResponse.json({ error: 'Hanya admin yang bisa edit side banner' }, { status: 403 });
  const body = await req.json();
  const next: SideBanner = {
    enabled: !!body.enabled,
    imageUrl: (body.imageUrl || '').slice(0, 500),
    title: (body.title || '').slice(0, 120),
    subtitle: (body.subtitle || '').slice(0, 240),
    ctaText: (body.ctaText || '').slice(0, 40),
    ctaUrl: (body.ctaUrl || '#').slice(0, 500),
    bgColor1: /^#[0-9a-fA-F]{6}$/.test(body.bgColor1) ? body.bgColor1 : '#7c3aed',
    bgColor2: /^#[0-9a-fA-F]{6}$/.test(body.bgColor2) ? body.bgColor2 : '#c026d3',
    textColor: /^#[0-9a-fA-F]{6}$/.test(body.textColor) ? body.textColor : '#ffffff',
    height: /^(auto|\d{1,4}(px|rem|%|vh|vw))$/i.test(body.height) ? body.height : 'auto',
    objectFit: ['cover', 'contain', 'fill', 'scale-down', 'none'].includes(body.objectFit) ? body.objectFit : 'cover',
    updatedBy: a.user.username,
    updatedAt: new Date().toISOString(),
  };
  await setConfig(KEY, next);
  return NextResponse.json({ banner: next });
}
