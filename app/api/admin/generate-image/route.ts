import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

/** AI image generator pakai Pollinations.ai (free, no API key).
 *  Body: { prompt: string, width?: number, height?: number, model?: string }
 *  Return: { url: string, prompt: string }
 *  URL itu langsung bisa dipakai sebagai <img src> — Pollinations stream image.
 */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt || '').trim();
  if (!prompt) return NextResponse.json({ error: 'prompt kosong' }, { status: 400 });

  const width = Math.min(2048, Math.max(64, Number(body.width) || 1024));
  const height = Math.min(2048, Math.max(64, Number(body.height) || 1024));
  const model = String(body.model || 'flux').replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'flux';
  const seed = Math.floor(Math.random() * 1_000_000_000);

  const u = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt));
  u.searchParams.set('width', String(width));
  u.searchParams.set('height', String(height));
  u.searchParams.set('seed', String(seed));
  u.searchParams.set('model', model);
  u.searchParams.set('nologo', 'true');
  u.searchParams.set('enhance', 'true');

  return NextResponse.json({
    url: u.toString(),
    prompt,
    width, height, model, seed,
  });
}
