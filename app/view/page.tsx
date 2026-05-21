'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiGetGlobalLayers, apiGetRunningText, fileUrl, thumbUrl, GlobalLayers } from '@/lib/api-client';
import { fmtBytes, fmtDuration, fmtNum, timeAgo } from '@/lib/utils';
import { BannerStrip, SideBannerCard } from '@/components/BannerStrip';
import { useT } from '@/lib/i18n';

export default function ViewPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-muted">Loading…</div>}>
      <ViewPage />
    </Suspense>
  );
}

type Layer = { url: string; label?: string };
type V = {
  id: string; username: string; title: string; description: string;
  type: string; mimeType: string; filename: string; hasThumb: boolean;
  duration: number; size: number; views: number; likes: number; uploadedAt: string;
  playerLayers?: Layer[];
};
type GlobalRT = { enabled: boolean; text: string; position: 'above' | 'below'; bgColor1: string; bgColor2: string; textColor: string; speed: number };

/** Mode nonton fokus untuk shared link — public, no login required.
 *  Tetap nampilin banner + running text + side banner + player layers yang admin set. */
function ViewPage() {
  const params = useSearchParams();
  const t = useT();
  const id = params.get('id');
  const [v, setV] = useState<V | null>(null);
  const [globalLayers, setGlobalLayers] = useState<GlobalLayers | null>(null);
  const [globalRT, setGlobalRT] = useState<GlobalRT | null>(null);
  const [layerStep, setLayerStep] = useState(0);

  // Iklan (sama seperti /watch — biar share ke non-login juga kena iklan)
  type AdInfo = { id: string; title: string; mimeType: string; duration?: number; url?: string };
  type AdsCfg = {
    enabled: boolean; intervalSec: number; skipAfterSec: number; ads: AdInfo[];
    randomOrder?: boolean; randomInterval?: boolean; intervalMinSec?: number; intervalMaxSec?: number;
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const adSeqRef = useRef(0);
  const nextAdAtRef = useRef(0);
  const [adsConfig, setAdsConfig] = useState<AdsCfg | null>(null);
  const [currentAd, setCurrentAd] = useState<AdInfo | null>(null);
  const [adWatched, setAdWatched] = useState(0);
  const [adDuration, setAdDuration] = useState(0);

  useEffect(() => {
    if (!id) return;
    api<{ video: V }>(`/api/videos/${encodeURIComponent(id)}`).then((r) => {
      setV(r.video);
      setLayerStep(0);
    });
    api(`/api/videos/${encodeURIComponent(id)}/view`, { method: 'POST' }).catch(() => {});
    apiGetGlobalLayers().then(setGlobalLayers).catch(() => {});
    apiGetRunningText().then(setGlobalRT).catch(() => {});
    fetch('/api/ads/config').then((r) => r.json()).then(setAdsConfig).catch(() => {});
  }, [id]);

  useEffect(() => {
    nextAdAtRef.current = 0;
    setCurrentAd(null);
    setAdWatched(0);
  }, [v?.id]);

  function computeNextInterval(cfg: AdsCfg): number {
    if (cfg.randomInterval) {
      const lo = Math.max(10, cfg.intervalMinSec ?? 60);
      const hi = Math.max(lo, cfg.intervalMaxSec ?? 180);
      return Math.round(lo + Math.random() * (hi - lo));
    }
    return cfg.intervalSec || 120;
  }
  function triggerAd() {
    if (!adsConfig || !adsConfig.enabled || !adsConfig.ads.length || currentAd) return;
    const ads = adsConfig.ads;
    let ad: AdInfo;
    if (adsConfig.randomOrder === false) {
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
    if (adsConfig) nextAdAtRef.current = (el?.currentTime || 0) + computeNextInterval(adsConfig);
    el?.play().catch(() => {});
  }

  if (!id) return <div className="grid min-h-screen place-items-center text-muted">Tidak ada ID video.</div>;
  if (!v) return <div className="grid min-h-screen place-items-center text-muted">Loading…</div>;

  const layers: Layer[] = (globalLayers && globalLayers.enabled && globalLayers.layers.length > 0)
    ? globalLayers.layers.slice(0, 5)
    : (v.playerLayers || []).slice(0, 5);
  const hasLayers = layers.length > 0;
  const allLayersDone = layerStep >= layers.length;

  function clickLayer() {
    const layer = layers[layerStep];
    if (!layer) return;
    window.open(layer.url, '_blank', 'noopener,noreferrer');
    setLayerStep((s) => s + 1);
  }

  const showRT = !!(globalRT && globalRT.enabled && globalRT.text);
  const runningPos: 'above' | 'below' = globalRT?.position || 'above';

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-[#100a25] to-bg">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-border bg-bg/85 px-3 py-2 backdrop-blur sm:px-4 sm:py-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold sm:text-base">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-grad-accent text-white sm:h-8 sm:w-8">M</span>
          MyStream
        </Link>
        <div className="ml-auto flex gap-2">
          <Link href="/dashboard" className="btn-ghost px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">⊞ Dashboard</Link>
          <Link href="/login" className="btn-primary px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">Daftar / Login</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl p-3 pb-16 sm:p-4 sm:pb-20">
        {/* MAIN BANNER (admin-controlled) — di atas semua, public */}
        <div className="mb-3 sm:mb-4">
          <BannerStrip />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {/* RUNNING TEXT — posisi atas */}
            {showRT && runningPos === 'above' && <RunningTextStrip cfg={globalRT!} />}

            <div className="relative overflow-hidden rounded-xl border border-border bg-black shadow-2xl sm:rounded-2xl">
              {v.type === 'image' ? (
                <img src={fileUrl(v.id)} alt={v.title} className="block w-full object-contain" />
              ) : (
                <video
                  ref={videoRef}
                  src={fileUrl(v.id)}
                  poster={v.hasThumb ? thumbUrl(v.id) : undefined}
                  controls={!hasLayers || allLayersDone}
                  autoPlay={!hasLayers || allLayersDone}
                  playsInline
                  onTimeUpdate={(e) => {
                    const t = e.currentTarget.currentTime;
                    // Trigger iklan by posisi video (threshold) — seek/drag
                    // lewat titik iklan tetap memicu iklan.
                    if (adsConfig?.enabled && !currentAd) {
                      if (!nextAdAtRef.current) nextAdAtRef.current = computeNextInterval(adsConfig);
                      if (t >= nextAdAtRef.current) triggerAd();
                    }
                  }}
                  className="block w-full max-h-[80vh]"
                />
              )}

              {/* LAYER GATE — wajib klik N kali sebelum video play */}
              {v.type !== 'image' && hasLayers && !allLayersDone && (
                <button
                  onClick={clickLayer}
                  className="absolute inset-0 grid place-items-center bg-black/85 text-center text-white transition hover:bg-black/75"
                >
                  <div className="text-4xl sm:text-5xl">▶</div>
                </button>
              )}

              {/* AD OVERLAY — full-cover di atas video (share / non-login) */}
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
                    style={{ maxHeight: '80vh', objectFit: 'contain' }}
                  />
                  {currentAd.url && (
                    <button
                      onClick={() => window.open(currentAd!.url, '_blank', 'noopener,noreferrer')}
                      className="absolute bottom-12 left-3 rounded-lg bg-grad-accent px-4 py-2 text-sm font-bold text-[color:var(--accent-fg)] shadow-lg transition hover:opacity-90"
                    >
                      {t('watch.ad_cta')}
                    </button>
                  )}
                  <div className="absolute bottom-12 right-3">
                    {adWatched < (adsConfig?.skipAfterSec ?? 5) ? (
                      <div className="rounded-md bg-black/80 px-3 py-2 text-sm text-white">
                        {t('watch.ad_skip_in')} {Math.max(0, Math.ceil((adsConfig?.skipAfterSec ?? 5) - adWatched))}s
                      </div>
                    ) : (
                      <button
                        onClick={closeAd}
                        className="rounded-md bg-white px-3 py-2 text-sm font-bold text-black shadow-lg hover:bg-gray-200"
                      >
                        {t('watch.ad_skip_btn')}
                      </button>
                    )}
                  </div>
                  {/* PROGRESS BAR iklan — PASIF, nggak bisa di-drag (anti-skip) */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-6">
                    <span className="text-[10px] tabular-nums text-white/90">{fmtDuration(adWatched)}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-yellow-400 transition-[width] duration-200"
                        style={{ width: `${adDuration ? Math.min(100, (adWatched / adDuration) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-white/90">{fmtDuration(adDuration)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* RUNNING TEXT — posisi bawah */}
            {showRT && runningPos === 'below' && <RunningTextStrip cfg={globalRT!} />}

            <h1 className="mt-3 text-lg font-bold sm:mt-4 sm:text-2xl">{v.title}</h1>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted sm:text-sm">
              <span>👁 {fmtNum(v.views)}</span>
              <span>· {timeAgo(v.uploadedAt)}</span>
              <span>· {fmtBytes(v.size)}</span>
              {v.duration > 0 && <span>· {fmtDuration(v.duration)}</span>}
            </div>

            {v.description && <p className="card mt-3 whitespace-pre-wrap text-xs sm:mt-4 sm:text-sm">{v.description}</p>}
          </div>

          <aside className="space-y-3">
            <div className="card">
              <div className="text-xs uppercase tracking-wider text-muted">Creator</div>
              <div className="mt-2 font-semibold">@{v.username}</div>
              <Link href="/signup" className="mt-3 block text-center btn-ghost text-xs">
                Login untuk follow
              </Link>
            </div>

            {/* SIDE BANNER (admin-controlled) — public juga */}
            <SideBannerCard />
          </aside>
        </div>

        <div className="mt-5 text-center text-xs text-muted sm:mt-6 sm:text-sm">
          Mau upload video kamu sendiri? <Link href="/signup" className="font-semibold text-accent">Daftar gratis di MyStream →</Link>
        </div>
      </main>
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
