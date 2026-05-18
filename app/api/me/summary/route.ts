import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const mine = db.videos.filter((v) => v.username === a.user.username);
  return NextResponse.json({
    totalVideos: mine.length,
    totalViews: mine.reduce((s, v) => s + (v.views || 0), 0),
    totalLikes: mine.reduce((s, v) => s + (v.likes || 0), 0),
    storageBytes: mine.reduce((s, v) => s + (v.size || 0), 0),
  });
}
