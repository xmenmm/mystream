import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Body: { title: string, hint?: string, lang?: 'id'|'en' } — generates video description via Pollinations text API */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const plan = getUserPlan(a.user);
  if (!plan.isPremium) {
    return NextResponse.json({
      error: 'AI description adalah fitur Premium. Upgrade dulu untuk pakai.',
      premiumRequired: true,
    }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const hint = String(body.hint || '').trim();
  const lang = body.lang === 'en' ? 'en' : 'id';

  if (!title) return NextResponse.json({ error: 'title wajib' }, { status: 400 });
  if (title.length > 200) return NextResponse.json({ error: 'title max 200 char' }, { status: 400 });
  if (hint.length > 500) return NextResponse.json({ error: 'hint max 500 char' }, { status: 400 });

  const langInstr = lang === 'en'
    ? 'Write in English.'
    : 'Tulis dalam Bahasa Indonesia santai (gaya video YouTube/TikTok Indonesia).';

  const prompt = `Buat deskripsi video dengan judul: "${title}".${hint ? ` Konteks tambahan: ${hint}.` : ''}
${langInstr}
Format:
- 2-3 paragraf pendek
- Tambahkan 5-7 hashtag relevan di akhir
- Bahasa engaging, cocok untuk konten kreator
- Maksimal 800 karakter total
- Jangan pakai markdown, pakai plain text saja
- Jangan tulis intro "Berikut deskripsinya:" atau penutup, langsung deskripsi`;

  // Pollinations text API (no key, free)
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`;

  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(25_000),
      headers: { 'User-Agent': 'MyStream/1.0' },
    });
    if (!r.ok) throw new Error(`pollinations ${r.status}`);
    const text = (await r.text()).trim();
    if (!text || text.length < 10) throw new Error('response empty');

    return NextResponse.json({
      ok: true,
      description: text.slice(0, 1500),
      lang,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'AI gagal: ' + (e?.message || 'unknown') }, { status: 502 });
  }
}
