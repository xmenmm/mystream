import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

const def = {
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
  const db = await loadDB();
  return NextResponse.json({ banner: { ...def, ...(db.sideBanner || {}) } });
}

export async function PUT(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin)
    return NextResponse.json({ error: 'Hanya admin yang bisa edit side banner' }, { status: 403 });
  const body = await req.json();
  const db = await loadDB();
  db.sideBanner = {
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
  await saveDB(db);
  return NextResponse.json({ banner: db.sideBanner });
}
