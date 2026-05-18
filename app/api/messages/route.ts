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
  const myMsgs = msgs.filter((m) => m.from === a.user.username || m.to === a.user.username);
  const conversations: Record<string, any> = {};
  for (const m of myMsgs) {
    const other = m.from === a.user.username ? m.to : m.from;
    if (!conversations[other])
      conversations[other] = { username: other, lastMsg: m, unread: 0 };
    if (new Date(m.ts) > new Date(conversations[other].lastMsg.ts))
      conversations[other].lastMsg = m;
    if (m.to === a.user.username && !m.read) conversations[other].unread++;
  }
  const inbox: any[] = [], requests: any[] = [];
  for (const c of Object.values(conversations)) {
    const u = db.users.find((x) => x.username === c.username);
    if (!u) continue;
    const enriched = {
      username: c.username,
      avatarColor: u.avatarColor || '#8b5cf6',
      bio: u.bio || '',
      lastText: c.lastMsg.text,
      lastTs: c.lastMsg.ts,
      lastFromMe: c.lastMsg.from === a.user.username,
      unread: c.unread,
      mutual: isMutual(db, a.user.username, c.username),
    };
    (enriched.mutual ? inbox : requests).push(enriched);
  }
  inbox.sort((x, y) => +new Date(y.lastTs) - +new Date(x.lastTs));
  requests.sort((x, y) => +new Date(y.lastTs) - +new Date(x.lastTs));
  return NextResponse.json({ inbox, requests });
}
