import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, SESSION_COOKIE } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (a) {
    const db = await loadDB();
    delete db.sessions[a.token];
    await saveDB(db);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
