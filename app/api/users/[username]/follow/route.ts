import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, pushNotif } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const target = decodeURIComponent(params.username);
  if (target === a.user.username)
    return NextResponse.json({ error: 'tidak bisa follow diri sendiri' }, { status: 400 });
  const db = await loadDB();
  const tgt = db.users.find((x) => x.username === target);
  if (!tgt) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  const me = db.users.find((x) => x.username === a.user.username)!;
  me.following = me.following || [];
  const idx = me.following.indexOf(target);
  if (idx >= 0) me.following.splice(idx, 1);
  else {
    me.following.push(target);
    pushNotif(db, target, 'follow', a.user.username);
  }
  await saveDB(db);
  const followerCount = db.users.filter((x) => (x.following || []).includes(target)).length;
  return NextResponse.json({ following: idx < 0, followerCount });
}
