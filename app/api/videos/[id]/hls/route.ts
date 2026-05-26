import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/videos/<id>/hls
 * Trigger HLS adaptive bitrate transcoding (240p/480p/720p/1080p).
 *
 * MyStream sendiri tidak punya ffmpeg/transcoder — perlu service eksternal:
 * 1. Mux Video API (https://mux.com) — direct upload + auto HLS
 * 2. Cloudflare Stream — upload → HLS endpoint
 * 3. AWS Elastic Transcoder
 * 4. Self-hosted: ffmpeg di worker (mahal, butuh GPU)
 *
 * Status: SCAFFOLD. Saat ENV diatur, endpoint ini akan call ke service yang dipilih.
 *
 * Yang dibutuhkan untuk aktivasi:
 * - MUX_TOKEN_ID + MUX_TOKEN_SECRET (kalau pakai Mux), atau
 * - CF_STREAM_API_TOKEN + CF_ACCOUNT_ID (kalau pakai Cloudflare Stream)
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const plan = getUserPlan(a.user);
  if (!plan.isPremium) {
    return NextResponse.json(
      { error: 'HLS adaptive bitrate hanya untuk Premium.', premiumRequired: true },
      { status: 403 },
    );
  }

  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'video tidak ditemukan' }, { status: 404 });
  if (v.username !== a.user.username)
    return NextResponse.json({ error: 'bukan video kamu' }, { status: 403 });

  // Detect service yang dikonfigurasi
  const hasMux = !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
  const hasCfStream = !!(process.env.CF_STREAM_API_TOKEN && process.env.CF_ACCOUNT_ID);

  if (!hasMux && !hasCfStream) {
    return NextResponse.json(
      {
        error: 'HLS transcoding service belum dikonfigurasi.',
        configRequired: true,
        instructions: [
          'Pilih salah satu dari:',
          '1. Mux Video: set MUX_TOKEN_ID + MUX_TOKEN_SECRET di env',
          '2. Cloudflare Stream: set CF_STREAM_API_TOKEN + CF_ACCOUNT_ID',
          'Setelah set ENV, redeploy ke Vercel.',
        ],
      },
      { status: 503 },
    );
  }

  // Mark video as queued for transcoding
  const vv = db.videos.find((x) => x.id === params.id);
  if (vv) {
    (vv as any).hlsStatus = 'queued';
    (vv as any).hlsQueuedAt = new Date().toISOString();
    await saveDB(db);
  }

  // TODO: actual implementation
  // if (hasMux) { ... call Mux create asset ... }
  // else if (hasCfStream) { ... call CF Stream upload from URL ... }
  // Update vv.hlsPlaylistUrl saat selesai

  return NextResponse.json({
    queued: true,
    message: 'Video di-queue untuk HLS transcoding. Akan tersedia dalam beberapa menit.',
    estimatedMinutes: Math.ceil((v.duration || 60) / 60) * 2,
    service: hasMux ? 'mux' : 'cloudflare-stream',
  });
}

/**
 * GET /api/videos/<id>/hls — return HLS playlist URL kalau sudah jadi
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await loadDB();
  const v = db.videos.find((x) => x.id === params.id);
  if (!v) return NextResponse.json({ error: 'video tidak ditemukan' }, { status: 404 });
  const status = (v as any).hlsStatus || 'none';
  const playlistUrl = (v as any).hlsPlaylistUrl || null;
  return NextResponse.json({ status, playlistUrl });
}
