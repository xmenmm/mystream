import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '14', 10)));
  const videoId = url.searchParams.get('videoId');
  const db = await loadDB();
  const myIds = new Set(
    videoId ? [videoId] : db.videos.filter((v) => v.username === a.user.username).map((v) => v.id),
  );
  const now = new Date();
  const labels: string[] = [], data: number[] = [], likesData: number[] = [];
  const likesLog = db.likesLog || [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const start = d.getTime(),
      end = start + 86400000;
    labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
    data.push(db.viewsLog.filter((l) => myIds.has(l.videoId) && l.ts >= start && l.ts < end).length);
    likesData.push(
      likesLog.filter((l) => myIds.has(l.videoId) && l.ts >= start && l.ts < end).length,
    );
  }
  return NextResponse.json({ labels, data, likesData });
}
