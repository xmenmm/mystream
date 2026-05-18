import { NextResponse } from 'next/server';
import { newCaptcha, generateCaptchaSvg } from '@/lib/captcha';

export const runtime = 'nodejs';

export async function GET() {
  const { id, code } = newCaptcha();
  const svg = generateCaptchaSvg(code);
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  return NextResponse.json({ id, image: dataUrl });
}
