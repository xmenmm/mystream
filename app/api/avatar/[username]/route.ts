import { NextRequest, NextResponse } from 'next/server';
import { AVATARS_DIR } from '@/lib/db';
import { publicUrl } from '@/lib/storage';

export const runtime = 'nodejs';

/** Redirect ke avatar di Supabase Storage (bandwidth lepas dari Vercel). */
export async function GET(_req: NextRequest, { params }: { params: { username: string } }) {
  const name = decodeURIComponent(params.username) + '.jpg';
  return NextResponse.redirect(publicUrl(AVATARS_DIR, name), 302);
}
