import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, SESSION_COOKIE } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';
import { getSession } from '@/lib/sessions';
import { supa } from '@/lib/supabase';

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
  if (!a) {
    // DEBUG v2: cek di mana persisnya gagal — cookie, sessions table, atau user lookup
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    let why = 'cookie session tidak ada di request';
    if (token) {
      const sess = await getSession(token);
      if (!sess) {
        // Cek apakah tabel sessions beneran ada & berisi sesuatu
        const sb = supa();
        const { count, error } = await sb
          .from('sessions')
          .select('*', { count: 'exact', head: true });
        if (error) {
          why = `token ada (${token.slice(0, 8)}…), tapi query tabel sessions GAGAL: ${error.message} (kode: ${error.code || '-'})`;
        } else {
          why = `token ada (${token.slice(0, 8)}…), tapi tidak ada di tabel sessions (total ${count} baris di tabel). Mungkin login terakhir BELUM jalankan createSession (deploy lama?)`;
        }
      } else {
        why = `session ditemukan (user "${sess.username}") tapi user tidak ada di db.users`;
      }
    }
    return NextResponse.json({ error: 'AUTH DEBUG: ' + why }, { status: 401 });
  }
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
