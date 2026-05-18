import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';
import { loadDB, saveDB, publicVideo, FILES_DIR } from '@/lib/db';
import { putFile, publicUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

function fmtSize(b: number) {
  if (!isFinite(b)) return 'unlimited';
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  return `${(b / 1024 / 1024).toFixed(0)} MB`;
}

/** Redirect ke video di Supabase Storage — Supabase handle HTTP Range/seek. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(publicUrl(FILES_DIR, params.id), 302);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (v.username !== a.user.username)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const plan = getUserPlan(a.user);
  const MAX = plan.limits.maxFileSize;

  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: 'file kosong' }, { status: 400 });
  if (buf.length > MAX) {
    return NextResponse.json(
      { error: `File terlalu besar (max ${fmtSize(MAX)} untuk plan ${plan.label})`, plan: plan.plan, needsUpgrade: !plan.isPremium },
      { status: 413 },
    );
  }

  // Catatan: Vercel function punya batas ukuran body. File besar (mis. >100MB)
  // idealnya upload langsung dari browser ke Supabase (signed URL) — enhancement
  // lanjutan. Untuk sekarang: buffer → Supabase Storage.
  await putFile(FILES_DIR, params.id, buf, v.mimeType || 'application/octet-stream');

  const db2 = await loadDB();
  const vv = db2.videos.find((x) => x.id === params.id);
  if (vv) {
    vv.fileReady = true;
    await saveDB(db2);
  }
  return NextResponse.json({ ok: true, video: vv ? publicVideo(vv) : null });
}
