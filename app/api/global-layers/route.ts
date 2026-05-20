import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';
// Anti edge-cache: tanpa ini Vercel cache GET-nya & PUT balas 405.
export const dynamic = 'force-dynamic';

const def = { enabled: false, layers: [] as { url: string; label?: string }[] };

export async function GET() {
  const db = await loadDB();
  return NextResponse.json({ globalLayers: { ...def, ...(db.globalLayers || {}) } });
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
  const db = await loadDB();
  db.globalLayers = {
    enabled: !!body.enabled,
    layers,
    updatedBy: a.user.username,
    updatedAt: new Date().toISOString(),
  };
  await saveDB(db);
  return NextResponse.json({ globalLayers: db.globalLayers });
}
