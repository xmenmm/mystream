import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Body: { prompt: string } — generates AI thumbnail via Pollinations.ai (no API key).
 *  Returns base64 dataURL. Premium-only. */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const plan = getUserPlan(a.user);
  if (!plan.isPremium) {
    return NextResponse.json({
      error: 'AI thumbnail adalah fitur Premium. Upgrade dulu untuk pakai.',
      premiumRequired: true,
    }, { status: 403 });
  }

  const { prompt } = await req.json().catch(() => ({}));
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) return NextResponse.json({ error: 'prompt wajib' }, { status: 400 });
  if (cleanPrompt.length > 500) return NextResponse.json({ error: 'prompt max 500 char' }, { status: 400 });

  const seed = Math.floor(Math.random() * 1000000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1280&height=720&seed=${seed}&nologo=true`;

  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(50_000),
      headers: { 'User-Agent': 'MyStream/1.0' },
    });
    if (!r.ok) throw new Error(`pollinations ${r.status}`);
    const arr = await r.arrayBuffer();
    const buf = Buffer.from(arr);
    if (buf.length < 1000) throw new Error('image too small');

    const dataURL = `data:image/jpeg;base64,${buf.toString('base64')}`;
    return NextResponse.json({
      ok: true,
      dataURL,
      sizeBytes: buf.length,
      seed,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'AI generation gagal: ' + (e?.message || 'unknown') }, { status: 502 });
  }
}
