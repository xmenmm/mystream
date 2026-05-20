'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, apiGetRunningText, apiGetGlobalLayers, fileUrl, thumbUrl, GlobalLayers } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { Avatar } from '@/components/Avatar';
import { BannerStrip, SideBannerCard } from '@/components/BannerStrip';
import { fmtBytes, fmtDuration, fmtNum, timeAgo } from '@/lib/utils';

type Layer = { url: string; label?: string };
type V = {
  id: string; username: string; title: string; description: string;
  type: string; mimeType: string; filename: string; hasThumb: boolean;
  duration: number; size: number; views: number; likes: number; uploadedAt: string;
  playerLayers?: Layer[];
};
type GlobalRT = { enabled: boolean; text: string; position: 'above' | 'below'; bgColor1: string; bgColor2: string; textColor: string; speed: number };

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SIZES: { label: string; pct: number }[] = [
  { label: 'XS', pct: 40 },
  { label: 'Small', pct: 60 },
  { label: 'Medium', pct: 80 },
  { label: 'Full', pct: 100 },    // default — fill kolom penuh
];
// Max height supaya portrait video gak melewati layar (tetap fit di viewport)
const VIDEO_MAX_HEIGHT = '85vh';

export default function WatchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id');
  const { me, loading: meLoading } = useMe();

  // User 2 (belum login) yang buka link ini → arahkan ke /view (mode fokus,
  // tanpa sidebar/menu) supaya pengalaman share bersih, bukan "gabung menu".
  useEffect(() => {
    if (!meLoading && !me && id) {
      router.replace('/view?id=' + encodeURIComponent(id));
    }
  }, [meLoading, me, id, router]);
  const [v, setV] = useState<V | null>(null);
  const [liked, setLiked] = useState(false);
  const [downloadProg, setDownloadProg] = useState<number | null>(null);

  // Player controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resCanvasRef = useRef<HTMLCanvasElement>(null);
  const resRafRef = useRef<number | null>(null);
  // Double-click seek: kanan 2x = +5s, kiri 2x = -2s
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [seekFlash, setSeekFlash] = useState<{ side: 'L' | 'R'; sec: number } | null>(null);
  const [speed, setSpeed] = useState(1);
  const [size, setSize] = useState(100);   // default Full — fill kolom penuh kayak banner
  const [resolution, setResolution] = useState<string>('Auto');  // pilihan user
  const [detectedRes, setDetectedRes] = useState<string>('Auto'); // resolusi asli file (label)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Ads
  type AdInfo = { id: string; title: string; mimeType: string; duration?: number; url?: string };
  type AdsCfg = {
    enabled: boolean; intervalSec: number; skipAfterSec: number; ads: AdInfo[];
    randomOrder?: boolean; randomInterval?: boolean; intervalMinSec?: number; intervalMaxSec?: number;
  };
  const [adsConfig, setAdsConfig] = useState<AdsCfg | null>(null);
  const [currentAd, setCurrentAd] = useState<AdInfo | null>(null);
  const [adWatched, setAdWatched] = useState(0);
  const [adDuration, setAdDuration] = useState(0);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const adSeqRef = useRef(0);          // pointer urutan iklan (mode tidak acak)
  const nextAdAtRef = useRef(0);       // posisi detik video kapan iklan berikutnya muncul

  // Player layers gating: berapa kali user sudah klik (open URL)
  const [layerStep, setLayerStep] = useState(0);

  // Global running text (set dari admin panel)
  const [globalRT, setGlobalRT] = useState<GlobalRT | null>(null);
  // Global layers (set dari admin panel — berlaku untuk SEMUA video)
  const [globalLayers, setGlobalLayers] = useState<GlobalLayers | null>(null);

  useEffect(() => {
    if (!id) return;
    api<{ video: V }>(`/api/videos/${encodeURIComponent(id)}`).then((r) => {
      setV(r.video);
      setLayerStep(0);
    });
    api(`/api/videos/${encodeURIComponent(id)}/view`, { method: 'POST' }).catch(() => {});
    apiGetRunningText().then(setGlobalRT).catch(() => {});
    apiGetGlobalLayers().then(setGlobalLayers).catch(() => {});
    fetch('/api/ads/config').then((r) => r.json()).then(setAdsConfig).catch(() => {});
  }, [id]);

  // Reset ad tracker setiap ganti video
  useEffect(() => {
    nextAdAtRef.current = 0;
    setCurrentAd(null);
    setAdWatched(0);
  }, [v?.id]);

  // Apply playback speed ke video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, v?.id]);

  // Detect resolusi ASLI file → cuma untuk label "Auto (xxx)", TIDAK
  // menimpa pilihan user.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onMeta = () => {
      const h = el.videoHeight;
      if (!h) return setDetectedRes('Auto');
      if (h >= 2000) setDetectedRes('4K');
      else if (h >= 1400) setDetectedRes('1440p');
      else if (h >= 900) setDetectedRes('1080p');
      else if (h >= 600) setDetectedRes('720p');
      else if (h >= 400) setDetectedRes('480p');
      else setDetectedRes(`${h}p`);
    };
    el.addEventListener('loadedmetadata', onMeta);
    return () => el.removeEventListener('loadedmetadata', onMeta);
  }, [v?.id]);

  // Map resolusi → tinggi render maksimal (px). Pilih lebih kecil = video
  // di-downscale → kualitas terlihat turun (single-source, tanpa transcode).
  const RES_PX: Record<string, number> = { '1080p': 1080, '720p': 720, '480p': 480, '360p': 360 };
  const resCapPx = resolution !== 'Auto' ? RES_PX[resolution] : undefined;

  // Loop gambar video → canvas di resolusi target. Canvas di-CSS 100% (player
  // size tetap), jadi frame low-res di-upscale → kualitas turun NYATA & jelas.
  useEffect(() => {
    if (!resCapPx) {
      if (resRafRef.current) cancelAnimationFrame(resRafRef.current);
      resRafRef.current = null;
      return;
    }
    let stopped = false;
    const draw = () => {
      if (stopped) return;
      const vid = videoRef.current;
      const cv = resCanvasRef.current;
      if (vid && cv && vid.videoWidth > 0) {
        const ar = vid.videoWidth / vid.videoHeight;
        const h = Math.min(resCapPx, vid.videoHeight);
        const w = Math.round(h * ar);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        const ctx = cv.getContext('2d');
        if (ctx) {
          try { ctx.drawImage(vid, 0, 0, w, h); } catch {}
        }
      }
      resRafRef.current = requestAnimationFrame(draw);
    };
    resRafRef.current = requestAnimationFrame(draw);
    return () => { stopped = true; if (resRafRef.current) cancelAnimationFrame(resRafRef.current); resRafRef.current = null; };
  }, [resCapPx, v?.id]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [settingsOpen]);

  // Track fullscreen state
  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Track Picture-in-Picture state
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onEnter = () => setIsPiP(true);
    const onLeave = () => setIsPiP(false);
    el.addEventListener('enterpictureinpicture', onEnter);
    el.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      el.removeEventListener('enterpictureinpicture', onEnter);
      el.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, [v?.id]);

  function fmtTime(s: number): string {
    if (!isFinite(s) || s < 0) return '0:00';
    const totalSec = Math.floor(s);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }
  function seekTo(t: number) {
    const el = videoRef.current;
    if (!el || !isFinite(t)) return;
    el.currentTime = Math.max(0, Math.min(t, el.duration || 0));
  }
  function flashSeek(side: 'L' | 'R', sec: number) {
    setSeekFlash({ side, sec });
    if (seekFlashTimerRef.current) clearTimeout(seekFlashTimerRef.current);
    seekFlashTimerRef.current = setTimeout(() => setSeekFlash(null), 650);
  }
  // 1x klik = play/pause (ditunda 250ms nunggu klik ke-2).
  // 2x klik kanan = +10 dtk, 2x klik kiri = -10 dtk.
  function onPlayerClick(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const isRight = e.clientX - rect.left > rect.width / 2;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      const el = videoRef.current;
      if (!el) return;
      if (isRight) {
        seekTo((el.currentTime || 0) + 10);
        flashSeek('R', 10);
      } else {
        seekTo((el.currentTime || 0) - 10);
        flashSeek('L', 10);
      }
      showControlsNow();
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        togglePlay();
      }, 250);
    }
  }
  function toggleMute() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
  }
  function setVolumeLevel(v: number) {
    const el = videoRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, v));
    if (el.volume > 0 && el.muted) el.muted = false;
  }
  function toggleFullscreen() {
    const el = playerContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }
  async function togglePiP() {
    const el = videoRef.current;
    if (!el) return;
    try {
      if ((document as any).pictureInPictureElement === el) {
        await (document as any).exitPictureInPicture();
      } else if ((document as any).pictureInPictureEnabled) {
        await (el as any).requestPictureInPicture();
      } else {
        alert('Browser kamu tidak mendukung Picture-in-Picture');
      }
    } catch (e: any) {
      alert('Gagal buka popup: ' + (e?.message || e));
    }
  }
  function showControlsNow() {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      const el = videoRef.current;
      if (el && !el.paused && !settingsOpen) setControlsVisible(false);
    }, 2500);
  }
  // Hitung interval target berikutnya (acak atau fixed)
  function computeNextInterval(cfg: AdsCfg): number {
    if (cfg.randomInterval) {
      const lo = Math.max(10, cfg.intervalMinSec ?? 60);
      const hi = Math.max(lo, cfg.intervalMaxSec ?? 180);
      return Math.round(lo + Math.random() * (hi - lo));
    }
    return cfg.intervalSec || 120;
  }
  function triggerAd() {
    if (!adsConfig || !adsConfig.enabled || !adsConfig.ads.length) return;
    if (currentAd) return;
    const ads = adsConfig.ads;
    let ad: AdInfo;
    if (adsConfig.randomOrder === false) {
      // Urut sesuai daftar
      ad = ads[adSeqRef.current % ads.length];
      adSeqRef.current = (adSeqRef.current + 1) % ads.length;
    } else {
      ad = ads[Math.floor(Math.random() * ads.length)];
    }
    setAdWatched(0);
    setCurrentAd(ad);
    const el = videoRef.current;
    if (el && !el.paused) el.pause();
  }
  function closeAd() {
    setCurrentAd(null);
    setAdWatched(0);
    const el = videoRef.current;
    // Iklan berikutnya = posisi sekarang + interval (acak/fixed)
    if (adsConfig) nextAdAtRef.current = (el?.currentTime || 0) + computeNextInterval(adsConfig);
    if (el) el.play().catch(() => {});
  }

  async function toggleLike() {
    if (!id || !me) return;
    const r = await api<{ likes: number; liked: boolean }>(`/api/videos/${encodeURIComponent(id)}/like`, { method: 'POST' });
    setV((vv) => vv ? { ...vv, likes: r.likes } : vv);
    setLiked(r.liked);
  }
  function shareLink() {
    const url = location.origin + '/view?id=' + encodeURIComponent(id || '');
    navigator.clipboard.writeText(url).then(() => alert('✓ Link nonton tersalin: ' + url));
  }
  async function downloadVideo() {
    if (!id || !v) return;
    setDownloadProg(0);
    try {
      const r = await fetch(fileUrl(id));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const total = Number(r.headers.get('content-length')) || v.size;
      const reader = r.body!.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) setDownloadProg(received / total);
      }
      const blob = new Blob(chunks as any, { type: v.mimeType });
      const safeTitle = (v.title || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
      const ext = (v.filename.match(/\.[a-z0-9]+$/i)?.[0]) || '';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = safeTitle + ext;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Gagal download: ' + e.message);
    } finally {
      setDownloadProg(null);
    }
  }

  if (!id) return <div className="text-center text-muted">Tidak ada ID video.</div>;
  if (!v) return <div className="text-center text-muted">Loading…</div>;

  // Pakai GLOBAL layers kalau aktif (override per-video). Fallback ke per-video.
  const layers = (globalLayers && globalLayers.enabled && globalLayers.layers.length > 0)
    ? globalLayers.layers.slice(0, 5)
    : (v.playerLayers || []).slice(0, 5);
  const hasLayers = layers.length > 0;
  const allLayersDone = layerStep >= layers.length;

  function clickLayer() {
    const layer = layers[layerStep];
    if (!layer) return;
    // Open layer link di tab baru, lalu naikin step
    window.open(layer.url, '_blank', 'noopener,noreferrer');
    setLayerStep((s) => s + 1);
  }

  const showRT = !!(globalRT && globalRT.enabled && globalRT.text);
  const runningPos: 'above' | 'below' = globalRT?.position || 'above';

  return (
    <div className="space-y-4">
      {/* MAIN BANNER (admin-controlled) — di atas semua, semua orang bisa lihat */}
      <BannerStrip />

      <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {/* RUNNING TEXT STRIP — di luar video, posisi atas */}
        {showRT && runningPos === 'above' && (
          <RunningTextStrip cfg={globalRT!} />
        )}

        {/* PLAYER + OVERLAYS */}
        <div className="mx-auto" style={{ width: `${size}%` }}>
          <div
            ref={playerContainerRef}
            onMouseMove={() => v.type !== 'image' && showControlsNow()}
            onMouseLeave={() => { if (videoRef.current && !videoRef.current.paused && !settingsOpen) setControlsVisible(false); }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-black"
            style={{ width: '100%' }}
          >
            {v.type === 'image' ? (
              <img
                src={fileUrl(v.id)}
                alt={v.title}
                className="block w-full object-contain"
                style={{ maxHeight: VIDEO_MAX_HEIGHT }}
              />
            ) : (
              <video
                ref={videoRef}
                src={fileUrl(v.id)}
                poster={v.hasThumb ? thumbUrl(v.id) : undefined}
                controls={false}
                onClick={onPlayerClick}
                onPlay={() => { setIsPlaying(true); showControlsNow(); }}
                onPause={() => { setIsPlaying(false); setControlsVisible(true); }}
                onTimeUpdate={(e) => {
                  const t = e.currentTarget.currentTime;
                  setCurrentTime(t);
                  // Trigger iklan berdasarkan POSISI video (threshold), bukan
                  // akumulasi nonton — jadi di-seek/drag lewat titik iklan
                  // tetap memicu iklan (nggak bisa di-bypass).
                  if (adsConfig?.enabled && !currentAd) {
                    if (!nextAdAtRef.current) nextAdAtRef.current = computeNextInterval(adsConfig);
                    if (t >= nextAdAtRef.current) triggerAd();
                  }
                }}
                onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
                onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
                onEnded={() => { setIsPlaying(false); setControlsVisible(true); }}
                className="block w-full cursor-pointer"
                style={{
                  maxHeight: isFullscreen ? '100vh' : VIDEO_MAX_HEIGHT,
                  objectFit: 'contain',
                  background: '#000',
                  // Saat resolusi dipilih (bukan Auto): video asli disembunyikan,
                  // canvas downscale yang ditampilkan (ukuran player tetap).
                  visibility: resCapPx ? 'hidden' : 'visible',
                }}
              />
            )}
            {/* CANVAS resolusi — render video di resolusi target lalu di-upscale
                ke ukuran player → kualitas turun beneran, ukuran tetap */}
            {v.type !== 'image' && resCapPx && (
              <canvas
                ref={resCanvasRef}
                onClick={onPlayerClick}
                className="absolute inset-0 z-[5] h-full w-full cursor-pointer"
                style={{ objectFit: 'contain', background: '#000', imageRendering: resCapPx <= 480 ? 'pixelated' : 'auto' }}
              />
            )}

            {/* SEEK FLASH — indikator double-click maju/mundur */}
            {seekFlash && (
              <div
                className={`pointer-events-none absolute inset-y-0 z-[15] flex w-2/5 items-center justify-center ${seekFlash.side === 'R' ? 'right-0' : 'left-0'}`}
              >
                <div className="rounded-2xl bg-black/55 px-5 py-3 text-base font-semibold text-white backdrop-blur-sm">
                  {seekFlash.side === 'R' ? `⏩ +${seekFlash.sec} dtk` : `⏪ −${seekFlash.sec} dtk`}
                </div>
              </div>
            )}

            {/* LAYER GATE — tutup video sampai user click sebanyak N kali */}
            {v.type !== 'image' && hasLayers && !allLayersDone && (
              <button
                onClick={clickLayer}
                className="absolute inset-0 z-30 grid place-items-center bg-black/85 text-center text-white transition hover:bg-black/75"
              >
                <div className="text-5xl">▶</div>
              </button>
            )}

            {/* BIG PLAY BUTTON — saat video di-pause (setelah layer done) */}
            {v.type !== 'image' && (!hasLayers || allLayersDone) && !isPlaying && (
              <button
                onClick={togglePlay}
                aria-label="Play"
                className="absolute inset-0 z-10 grid place-items-center bg-black/20 transition hover:bg-black/30"
              >
                <div className="grid h-20 w-20 place-items-center rounded-full bg-black/70 text-3xl text-white shadow-xl">▶</div>
              </button>
            )}

            {/* CUSTOM CONTROLS BAR */}
            {v.type !== 'image' && (!hasLayers || allLayersDone) && (
              <div
                className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-2 pt-10 text-white transition-opacity duration-200 ${controlsVisible || !isPlaying || settingsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Seek bar */}
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="Seek"
                  className="mb-2 block h-1 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-red-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
                />
                <div className="flex items-center justify-between gap-1">
                  {/* Left: play + time */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="grid h-9 w-9 place-items-center rounded-full text-lg leading-none hover:bg-white/15"
                    >
                      {isPlaying ? '❚❚' : '▶'}
                    </button>
                    <span className="text-xs tabular-nums text-white/90">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                  </div>
                  {/* Right: volume + fullscreen + settings */}
                  <div className="flex items-center gap-1">
                    {/* Volume */}
                    <div className="group/vol flex items-center">
                      <button
                        onClick={toggleMute}
                        aria-label={muted ? 'Unmute' : 'Mute'}
                        className="grid h-9 w-9 place-items-center rounded-full text-base hover:bg-white/15"
                      >
                        {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={muted ? 0 : volume}
                        onChange={(e) => setVolumeLevel(Number(e.target.value))}
                        aria-label="Volume"
                        className="ml-1 h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/25 opacity-0 transition-all duration-200 accent-white group-hover/vol:w-20 group-hover/vol:opacity-100 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                    </div>
                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                      className="grid h-9 w-9 place-items-center rounded-full text-base hover:bg-white/15"
                    >
                      {isFullscreen ? '⛶' : '⛶'}
                    </button>
                    {/* Settings (titik 3) */}
                    <div className="relative" ref={settingsRef}>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen((o) => !o)}
                        aria-label="Pengaturan player"
                        aria-expanded={settingsOpen}
                        className="grid h-9 w-9 place-items-center rounded-full text-xl leading-none hover:bg-white/15"
                      >
                        ⋮
                      </button>
                      {settingsOpen && (
                        <div className="absolute bottom-11 right-0 z-30 w-60 space-y-2 rounded-xl border border-white/10 bg-black/95 p-3 text-xs text-white shadow-xl backdrop-blur-md">
                          <label className="flex items-center justify-between gap-2">
                            <span>⚡ Speed</span>
                            <select
                              value={speed}
                              onChange={(e) => setSpeed(Number(e.target.value))}
                              className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-white [&>option]:text-black"
                            >
                              {SPEEDS.map((s) => (
                                <option key={s} value={s}>{s}x</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex items-center justify-between gap-2">
                            <span>📺 Resolusi</span>
                            <select
                              value={resolution}
                              onChange={(e) => setResolution(e.target.value)}
                              className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-white [&>option]:text-black"
                              title="Pilih resolusi — video di-render ulang ke kualitas itu"
                            >
                              <option value="Auto">Auto ({detectedRes})</option>
                              <option value="1080p">1080p</option>
                              <option value="720p">720p</option>
                              <option value="480p">480p</option>
                              <option value="360p">360p</option>
                            </select>
                          </label>
                          <label className="flex items-center justify-between gap-2">
                            <span>📐 Ukuran</span>
                            <select
                              value={size}
                              onChange={(e) => setSize(Number(e.target.value))}
                              className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-white [&>option]:text-black"
                            >
                              {SIZES.map((s) => (
                                <option key={s.pct} value={s.pct}>{s.label} ({s.pct}%)</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            onClick={() => { togglePiP(); setSettingsOpen(false); }}
                            className="flex w-full items-center justify-between gap-2 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-left hover:bg-white/15"
                          >
                            <span>🖼 Video Popup</span>
                            <span className="text-[10px] text-white/70">{isPiP ? 'Tutup' : 'Buka'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AD OVERLAY — full-cover di atas video utama */}
            {currentAd && (
              <div className="absolute inset-0 z-40 bg-black">
                <video
                  ref={adVideoRef}
                  src={`/api/ads/file/${currentAd.id}`}
                  autoPlay
                  playsInline
                  controls={false}
                  onLoadedMetadata={(e) => setAdDuration(e.currentTarget.duration || 0)}
                  onTimeUpdate={(e) => setAdWatched(e.currentTarget.currentTime)}
                  onEnded={closeAd}
                  className="block h-full w-full"
                  style={{ maxHeight: VIDEO_MAX_HEIGHT, objectFit: 'contain' }}
                />
                {/* CTA "Daftar Sekarang" → buka URL iklan */}
                {currentAd.url && (
                  <button
                    onClick={() => window.open(currentAd.url, '_blank', 'noopener,noreferrer')}
                    className="absolute bottom-12 left-3 rounded-lg bg-grad-accent px-4 py-2 text-sm font-bold text-[color:var(--accent-fg)] shadow-lg transition hover:opacity-90"
                  >
                    🚀 Daftar Sekarang →
                  </button>
                )}
                <div className="absolute bottom-12 right-3">
                  {adWatched < (adsConfig?.skipAfterSec ?? 5) ? (
                    <div className="rounded-md bg-black/80 px-3 py-2 text-sm text-white">
                      Skip dalam {Math.max(0, Math.ceil((adsConfig?.skipAfterSec ?? 5) - adWatched))}s
                    </div>
                  ) : (
                    <button
                      onClick={closeAd}
                      className="rounded-md bg-white px-3 py-2 text-sm font-bold text-black shadow-lg hover:bg-gray-200"
                    >
                      ▶ Skip Iklan
                    </button>
                  )}
                </div>
                {/* PROGRESS BAR iklan — PASIF, nggak bisa di-drag (anti-skip) */}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-6">
                  <span className="text-[10px] tabular-nums text-white/90">{fmtTime(adWatched)}</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-[width] duration-200"
                      style={{ width: `${adDuration ? Math.min(100, (adWatched / adDuration) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-white/90">{fmtTime(adDuration)}</span>
                </div>
              </div>
            )}
          </div>

          {/* RUNNING TEXT STRIP — di luar video, posisi bawah */}
          {showRT && runningPos === 'below' && (
            <div className="mt-2"><RunningTextStrip cfg={globalRT!} /></div>
          )}
        </div>

        <h1 className="text-2xl font-bold">{v.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>👁 {fmtNum(v.views)}</span>
          <span>· {timeAgo(v.uploadedAt)}</span>
          <span>· {fmtBytes(v.size)}</span>
          {v.duration > 0 && <span>· {fmtDuration(v.duration)}</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={toggleLike} className={liked ? 'btn-primary' : 'btn-ghost'} disabled={!me}>
            👍 {fmtNum(v.likes)}
          </button>
          <button onClick={shareLink} className="btn-ghost">🔗 Share</button>
          <button onClick={downloadVideo} className="btn-ghost" disabled={downloadProg !== null}>
            {downloadProg === null ? '⬇ Download' : `⏬ ${Math.round(downloadProg * 100)}%`}
          </button>
        </div>
        {v.description && <p className="card whitespace-pre-wrap text-sm">{v.description}</p>}
      </div>
      <aside className="space-y-3">
        <div className="card">
          <h3 className="mb-2 text-sm font-bold text-muted">Creator</h3>
          <Link href={`/user/${encodeURIComponent(v.username)}`} className="flex items-center gap-3">
            <Avatar username={v.username} size={48} />
            <div>
              <div className="font-semibold">{v.username}</div>
              <div className="text-xs text-muted">View profile →</div>
            </div>
          </Link>
        </div>

        {/* SIDE BANNER (admin-controlled) — di sebelah komentar */}
        <SideBannerCard />
      </aside>
      </div>
    </div>
  );
}

function RunningTextStrip({ cfg }: { cfg: GlobalRT }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border shadow-glow"
      style={{ background: `linear-gradient(135deg, ${cfg.bgColor1}, ${cfg.bgColor2})`, color: cfg.textColor }}
    >
      <div
        className="banner-marquee whitespace-nowrap py-1.5 text-sm font-semibold"
        style={{ animationDuration: `${cfg.speed}s` }}
      >
        <span className="px-6">📢 {cfg.text}</span>
        <span className="px-6">📢 {cfg.text}</span>
        <span className="px-6">📢 {cfg.text}</span>
      </div>
    </div>
  );
}

