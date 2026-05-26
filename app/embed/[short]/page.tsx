'use client';
import { useEffect, useRef, useState } from 'react';
import { fileUrl, thumbUrl } from '@/lib/api-client';
import { fmtDuration } from '@/lib/utils';

// Minimal embed-only player: no chrome, no sidebar, no nav.
// Designed untuk pasang di iframe pihak lain (blog, website, dll).
// URL: /embed/<short> dengan param opsional: ?autoplay=1&muted=1&start=30&loop=1

type V = {
  id: string;
  title: string;
  username: string;
  mimeType: string;
  hasThumb: boolean;
  duration: number;
  allowDownload?: boolean;
  visibility?: string;
};

export default function EmbedPage({
  params,
  searchParams,
}: {
  params: { short: string };
  searchParams: { autoplay?: string; muted?: string; start?: string; loop?: string };
}) {
  const id = 'v_' + (params.short || '').replace(/-/g, '_');
  const [v, setV] = useState<V | null>(null);
  const [err, setErr] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const autoplay = searchParams.autoplay === '1';
  const muted = searchParams.muted === '1';
  const startSec = parseInt(searchParams.start || '0', 10) || 0;
  const loop = searchParams.loop === '1';

  useEffect(() => {
    fetch(`/api/videos/${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) {
          setErr(r.status === 404 ? 'Video tidak ditemukan' : 'Gagal memuat video');
          return;
        }
        const d = await r.json();
        const video = d.video || d;
        if (video.visibility === 'private' || video.visibility === 'draft') {
          setErr('Video ini tidak tersedia publik');
          return;
        }
        setV(video);
      })
      .catch(() => setErr('Network error'));
  }, [id]);

  useEffect(() => {
    if (videoRef.current && startSec > 0) {
      videoRef.current.currentTime = startSec;
    }
  }, [v, startSec]);

  if (err) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-black text-white">
        <div className="text-center">
          <div className="text-5xl">⚠</div>
          <p className="mt-3 text-lg">{err}</p>
          <a
            href="https://mystream-o2f7.vercel.app"
            target="_blank"
            rel="noopener"
            className="mt-4 inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-700"
          >
            Buka MyStream
          </a>
        </div>
      </div>
    );
  }

  if (!v) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-black text-white/60">
        <div className="text-center">
          <div className="animate-pulse text-3xl">▶</div>
          <p className="mt-2 text-xs">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        src={fileUrl(id)}
        poster={v.hasThumb ? thumbUrl(id) : undefined}
        controls
        controlsList="nodownload"
        playsInline
        autoPlay={autoplay}
        muted={muted}
        loop={loop}
      >
        Browser kamu tidak support video tag.
      </video>

      {/* Logo MyStream di pojok kanan-atas (link ke watch page) */}
      <a
        href={`/watch?id=${encodeURIComponent(id)}`}
        target="_blank"
        rel="noopener"
        className="absolute right-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-purple-600/80"
        title="Buka di MyStream"
      >
        ⚡ MyStream
      </a>
    </div>
  );
}
