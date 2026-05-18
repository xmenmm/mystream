import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  let n = 0;
  for (const item of db.notifications || []) {
    if (item.to === a.user.username && !item.read) {
      item.read = true;
      n++;
    }
  }
  if (n > 0) await saveDB(db);
  return NextResponse.json({ ok: true, marked: n });
}
