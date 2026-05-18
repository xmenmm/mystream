import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, generateTotpSecret } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const secret = generateTotpSecret();
  const otpauth = `otpauth://totp/MyStream:${encodeURIComponent(a.user.username)}?secret=${secret}&issuer=MyStream&period=30&digits=6&algorithm=SHA1`;
  return NextResponse.json({ secret, otpauth });
}
