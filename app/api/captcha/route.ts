import { NextResponse } from 'next/server';
import { newCaptcha, generateCaptchaSvg } from '@/lib/captcha';

export const runtime = 'nodejs';
// WAJIB: route ini TIDAK BOLEH di-cache. Tanpa ini Next.js/Vercel
// membekukan responsenya (captcha sama untuk semua + token kadaluarsa
// permanen 5 menit setelah deploy → captcha "kurang bisa").
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { id, code } = newCaptcha();
  const svg = generateCaptchaSvg(code);
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  return NextResponse.json(
    { id, image: dataUrl },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } },
  );
}
