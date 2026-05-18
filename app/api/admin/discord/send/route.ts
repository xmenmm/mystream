import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { discordSendContent } from '@/lib/discord';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const { content } = await req.json();
  if (!content || !String(content).trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });
  const r = await discordSendContent(String(content).slice(0, 2000));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, messageId: r.messageId });
}
