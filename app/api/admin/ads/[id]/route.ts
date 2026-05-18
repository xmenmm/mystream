import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, ADS_DIR } from '@/lib/db';
import { removeFile } from '@/lib/storage';

export const runtime = 'nodejs';

/** PATCH /api/admin/ads/[id] — toggle enable / rename title. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const body = await req.json();
  const db = await loadDB();
  const ads = db.adsConfig?.ads || [];
  const ad = ads.find((x: any) => x.id === params.id);
  if (!ad) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (typeof body.enabled === 'boolean') ad.enabled = body.enabled;
  if (typeof body.title === 'string') ad.title = body.title.slice(0, 100);
  if (typeof body.url === 'string') {
    const u = body.url.trim().slice(0, 500);
    ad.url = /^https?:\/\//i.test(u) ? u : undefined;
  }
  db.adsConfig = { ...(db.adsConfig || {}), ads, updatedBy: a.user.username, updatedAt: new Date().toISOString() };
  await saveDB(db);
  return NextResponse.json({ ok: true, ad });
}

/** DELETE — hapus ad + file. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const db = await loadDB();
  const ads = db.adsConfig?.ads || [];
  const idx = ads.findIndex((x: any) => x.id === params.id);
  if (idx < 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  ads.splice(idx, 1);
  db.adsConfig = { ...(db.adsConfig || {}), ads, updatedBy: a.user.username, updatedAt: new Date().toISOString() };
  await saveDB(db);

  // Hapus file iklan di Storage
  await removeFile(ADS_DIR, params.id);
  return NextResponse.json({ ok: true });
}
