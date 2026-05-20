import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/config';

export const runtime = 'nodejs';
// Anti edge-cache: PUT balas 405 kalau GET ke-cache statis.
export const dynamic = 'force-dynamic';

type GlobalLayers = { enabled: boolean; layers: { url: string; label?: string }[]; updatedBy?: string; updatedAt?: string };
const KEY = 'globalLayers';
const def: GlobalLayers = { enabled: false, layers: [] };

export async function GET() {
  const cfg = await getConfig<GlobalLayers>(KEY, def);
  return NextResponse.json({ globalLayers: { ...def, ...cfg } });
}

export async function PUT(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'Belum login atau sesi habis — login ulang sebagai admin' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'Akun ini bukan admin — login dengan akun admin' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const layers = Array.isArray(body.layers)
    ? body.layers
        .slice(0, 5)
        .map((l: any) => ({
          url: String(l?.url || '').slice(0, 500),
          label: l?.label ? String(l.label).slice(0, 40) : undefined,
        }))
        .filter((l: any) => /^https?:\/\//i.test(l.url))
    : [];
  const next: GlobalLayers = {
    enabled: !!body.enabled,
    layers,
    updatedBy: a.user.username,
    updatedAt: new Date().toISOString(),
  };
  await setConfig(KEY, next);
  return NextResponse.json({ globalLayers: next });
}
