import { NextRequest, NextResponse } from 'next/server';
import { BANNERS_DIR } from '@/lib/db';
import { storageRedirect } from '@/lib/storage';

export const runtime = 'nodejs';

/** Public: redirect ke banner image di Supabase Storage. */
export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  const filename = params.filename;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'invalid filename' }, { status: 400 });
  }
  return storageRedirect(BANNERS_DIR, filename);
}
