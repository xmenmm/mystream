import { NextRequest } from 'next/server';
import { THUMBS_DIR } from '@/lib/db';
import { storageRedirect } from '@/lib/storage';

export const runtime = 'nodejs';

/** Redirect ke thumbnail di Supabase Storage. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return storageRedirect(THUMBS_DIR, params.id + '.jpg');
}
