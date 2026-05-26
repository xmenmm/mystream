import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';
import { loadDB, FILES_DIR } from '@/lib/db';
import { getBytes } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/ai/subtitle
 * body: { videoId: string, language?: string }
 *
 * Generate subtitle .vtt dari audio video via OpenAI Whisper API.
 * Premium-only.
 *
 * ENV yang dibutuhkan: OPENAI_API_KEY
 * Kalau tidak ada → return 503 dengan instruksi setup.
 */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const plan = getUserPlan(a.user);
  if (!plan.isPremium) {
    return NextResponse.json(
      {
        error: 'AI Subtitle hanya untuk Premium. Upgrade dulu yuk!',
        premiumRequired: true,
      },
      { status: 403 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'AI Subtitle belum aktif. Admin perlu set OPENAI_API_KEY di environment.',
        configRequired: true,
      },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { videoId, language = 'id' } = body || {};
  if (!videoId) return NextResponse.json({ error: 'videoId wajib' }, { status: 400 });

  const db = await loadDB();
  const v = db.videos.find((x) => x.id === videoId);
  if (!v) return NextResponse.json({ error: 'video tidak ditemukan' }, { status: 404 });
  if (v.username !== a.user.username)
    return NextResponse.json({ error: 'bukan video kamu' }, { status: 403 });

  if (v.type !== 'video') {
    return NextResponse.json({ error: 'subtitle hanya untuk file video, bukan gambar' }, { status: 400 });
  }

  // Whisper API max 25 MB. File besar perlu chunking — untuk MVP batasi 25 MB.
  if (v.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      {
        error: `File ${(v.size / 1024 / 1024).toFixed(1)} MB. OpenAI Whisper batas 25 MB. Video besar perlu transcoding/chunking dulu (akan ditambah di Phase 2).`,
      },
      { status: 413 },
    );
  }

  // Fetch file dari storage
  const buf = await getBytes(FILES_DIR, videoId);
  if (!buf) return NextResponse.json({ error: 'Gagal ambil file dari storage' }, { status: 500 });
  const blob = new Blob([buf], { type: v.mimeType || 'video/mp4' });

  // Kirim ke OpenAI Whisper
  try {
    const form = new FormData();
    form.append('file', blob, (v.filename || 'video.mp4'));
    form.append('model', 'whisper-1');
    form.append('response_format', 'vtt');
    if (language) form.append('language', language);

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey },
      body: form,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return NextResponse.json({ error: 'Whisper API gagal: ' + r.status + ' ' + txt.slice(0, 200) }, { status: 502 });
    }
    const vtt = await r.text();
    return NextResponse.json({ vtt, language, videoId });
  } catch (e: any) {
    return NextResponse.json({ error: 'AI subtitle gagal: ' + (e?.message || 'unknown') }, { status: 500 });
  }
}
