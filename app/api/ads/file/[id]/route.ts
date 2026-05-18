import { NextRequest, NextResponse } from 'next/server';
import { loadDB, ADS_DIR } from '@/lib/db';
import { storageRedirect } from '@/lib/storage';

export const runtime = 'nodejs';

/** Redirect ke file iklan di Supabase Storage (Supabase handle Range/seek). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await loadDB();
  const ads = db.adsConfig?.ads || [];
  const ad = ads.find((x: any) => x.id === params.id && x.enabled);
  if (!ad) return new NextResponse(null, { status: 404 });
  return storageRedirect(ADS_DIR, params.id);
}
