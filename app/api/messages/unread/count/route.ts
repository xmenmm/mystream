import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';
import { DB } from '@/lib/types';

export const runtime = 'nodejs';

const isMutual = (db: DB, a: string, b: string) => {
  const ua = db.users.find((x) => x.username === a);
  const ub = db.users.find((x) => x.username === b);
  if (!ua || !ub) return false;
  return (ua.following || []).includes(b) && (ub.following || []).includes(a);
};

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const msgs = db.messages || [];
  let inbox = 0,
    requests = 0;
  const conv = new Map<string, number>();
  for (const m of msgs) {
    if (m.to !== a.user.username || m.read) continue;
    conv.set(m.from, (conv.get(m.from) || 0) + 1);
  }
  for (const [other, n] of conv) {
    if (isMutual(db, a.user.username, other)) inbox += n;
    else requests += n;
  }
  return NextResponse.json({ inbox, requests, total: inbox + requests });
}
