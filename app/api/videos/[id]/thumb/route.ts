import { NextRequest, NextResponse } from 'next/server';
import { THUMBS_DIR } from '@/lib/db';
import { publicUrl } from '@/lib/storage';

export const runtime = 'nodejs';

/** Redirect ke thumbnail di Supabase Storage. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.redirect(publicUrl(THUMBS_DIR, params.id + '.jpg'), 302);
}
