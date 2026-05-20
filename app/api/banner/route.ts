import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';
// Anti edge-cache: tanpa ini Vercel cache GET-nya & PUT balas 405.
export const dynamic = 'force-dynamic';

const def = {
  enabled: true,
  layout: 'promo',
  icon: '🎬',
  title: 'Selamat datang di MyStream!',
  subtitle: 'Daftar gratis untuk like, komentar, follow creator, dan upload video kamu sendiri.',
  ctaText: 'Daftar Gratis →',
  ctaUrl: '/dashboard',
  bgColor1: '#7c3aed',
  bgColor2: '#c026d3',
  textColor: '#ffffff',
  imageUrl: '',
  height: 'auto',
  objectFit: 'cover',
};

export async function GET() {
  const db = await loadDB();
  return NextResponse.json({ banner: { ...def, ...(db.banner || {}) } });
}

export async function PUT(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin)
    return NextResponse.json({ error: 'Hanya admin yang bisa edit banner' }, { status: 403 });
  const body = await req.json();
  const db = await loadDB();
  db.banner = {
    enabled: !!body.enabled,
    layout: ['promo', 'text', 'image'].includes(body.layout) ? body.layout : 'promo',
    icon: (body.icon || '').slice(0, 6),
    title: (body.title || '').slice(0, 120),
    subtitle: (body.subtitle || '').slice(0, 240),
    ctaText: (body.ctaText || '').slice(0, 40),
    ctaUrl: (body.ctaUrl || '/dashboard').slice(0, 500),
    bgColor1: /^#[0-9a-fA-F]{6}$/.test(body.bgColor1) ? body.bgColor1 : '#7c3aed',
    bgColor2: /^#[0-9a-fA-F]{6}$/.test(body.bgColor2) ? body.bgColor2 : '#c026d3',
    textColor: /^#[0-9a-fA-F]{6}$/.test(body.textColor) ? body.textColor : '#ffffff',
    imageUrl: (body.imageUrl || '').slice(0, 500),
    height: /^(auto|\d{1,4}(px|rem|%|vh|vw))$/i.test(body.height) ? body.height : 'auto',
    objectFit: ['cover', 'contain', 'fill', 'scale-down', 'none'].includes(body.objectFit) ? body.objectFit : 'cover',
    updatedBy: a.user.username,
    updatedAt: new Date().toISOString(),
  };
  await saveDB(db);
  return NextResponse.json({ banner: db.banner });
}
