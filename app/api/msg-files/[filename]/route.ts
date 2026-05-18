import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, MSG_FILES_DIR } from '@/lib/db';
import { storageRedirect } from '@/lib/storage';

export const runtime = 'nodejs';

/** Serve message attachment. Auth + ownership check, lalu redirect ke Storage. */
export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const filename = decodeURIComponent(params.filename);
  if (!/^m_[a-z0-9_]+\.(jpg|png|gif|webp)$/i.test(filename)) {
    return NextResponse.json({ error: 'invalid filename' }, { status: 400 });
  }

  const db = await loadDB();
  const msg = (db.messages || []).find((m) => m.imageFilename === filename);
  if (!msg) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (msg.from !== a.user.username && msg.to !== a.user.username && !a.user.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return storageRedirect(MSG_FILES_DIR, filename);
}
