import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const days = Math.min(30, Math.max(1, parseInt(url.searchParams.get('days') || '7', 10)));
  const db = await loadDB();
  const myVids = db.videos.filter((v) => v.username === a.user.username);
  const result: Record<string, number[]> = {};
  const now = new Date();
  const buckets: { start: number; end: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({ start: d.getTime(), end: d.getTime() + 86400000 });
  }
  for (const v of myVids) {
    result[v.id] = buckets.map(
      (b) => db.viewsLog.filter((l) => l.videoId === v.id && l.ts >= b.start && l.ts < b.end).length,
    );
  }
  return NextResponse.json({ days, data: result });
}
