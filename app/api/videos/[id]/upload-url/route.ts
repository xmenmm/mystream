import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, publicVideo, FILES_DIR } from '@/lib/db';
import { signedUploadUrl } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * POST = minta URL upload bertanda-tangan.
 * Browser upload file LANGSUNG ke Supabase pakai URL ini (lewati Vercel,
 * jadi tidak kena batas body ~4.5 MB → video besar bisa).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'video tidak ditemukan' }, { status: 404 });
  if (v.username !== a.user.username)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const uploadUrl = await signedUploadUrl(FILES_DIR, params.id);
    return NextResponse.json({ uploadUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'gagal buat upload URL' }, { status: 500 });
  }
}

/** PUT = konfirmasi file selesai ke-upload → tandai video siap diputar. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'video tidak ditemukan' }, { status: 404 });
  if (v.username !== a.user.username)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  v.fileReady = true;
  await saveDB(db);
  return NextResponse.json({ ok: true, video: publicVideo(v) });
}
