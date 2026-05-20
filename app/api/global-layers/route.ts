import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, SESSION_COOKIE } from '@/lib/auth';
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
  if (!a) {
    // DEBUG: kasih tahu kenapa auth gagal (sementara, biar bisa lacak)
    const cookieNames = req.cookies.getAll().map((c) => c.name);
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    let why = 'tidak ada cookie session (cookies yg ada: ' + (cookieNames.join(',') || 'KOSONG') + ')';
    if (token) {
      const dbg = await loadDB();
      if (!dbg.sessions[token]) {
        why = `token ada (${token.slice(0, 8)}…) tapi tidak ada di sessions DB (total ${Object.keys(dbg.sessions || {}).length} sessions)`;
      } else {
        why = `session ada tapi user "${dbg.sessions[token].username}" tidak ditemukan`;
      }
    }
    return NextResponse.json({ error: 'AUTH GAGAL: ' + why }, { status: 401 });
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
