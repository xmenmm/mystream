import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/config';
import { supa } from '@/lib/supabase';

export const runtime = 'nodejs';
// Anti edge-cache: PUT balas 405 kalau GET ke-cache statis.
export const dynamic = 'force-dynamic';

type GlobalLayers = { enabled: boolean; layers: { url: string; label?: string }[]; updatedBy?: string; updatedAt?: string };
const KEY = 'globalLayers';
const def: GlobalLayers = { enabled: false, layers: [] };

export async function GET() {
  // DEBUG sementara: ekspos error/data dari query supabase
  const sb = supa();
  const raw = await sb.from('app_config').select('value').eq('key', KEY).maybeSingle();
  const all = await sb.from('app_config').select('key, value').limit(5);
  const cfg = await getConfig<GlobalLayers>(KEY, def);
  return NextResponse.json({
    globalLayers: { ...def, ...cfg },
    _debug: {
      raw_data: raw.data,
      raw_error: raw.error ? { message: raw.error.message, code: (raw.error as any).code, details: (raw.error as any).details } : null,
      all_rows: all.data,
      all_error: all.error ? { message: all.error.message } : null,
    },
  });
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
