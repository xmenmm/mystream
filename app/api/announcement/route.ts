import { NextResponse } from 'next/server';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const db = await loadDB();
  const active = (db.announcements || []).find((x) => x.active);
  return NextResponse.json({ announcement: active || null });
}
