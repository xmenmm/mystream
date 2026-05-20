import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, SESSION_COOKIE } from '@/lib/auth';
import { deleteSession } from '@/lib/sessions';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (a) await deleteSession(a.token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
