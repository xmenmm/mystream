'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STEPS = [
  { pct: 18, msg: 'Memuat sesi kamu…',         icon: '🔐' },
  { pct: 38, msg: 'Mengambil profile…',         icon: '👤' },
  { pct: 58, msg: 'Sinkron dashboard data…',   icon: '📊' },
  { pct: 78, msg: 'Menyiapkan video player…',  icon: '🎬' },
  { pct: 92, msg: 'Hampir selesai…',            icon: '✨' },
  { pct: 100, msg: 'Welcome back!',             icon: '🚀' },
];

const QUOTES = [
  'Setiap upload bisa jadi awal dari sesuatu yang besar.',
  'Konten bagus selalu menemukan jalannya.',
  'Sharing is caring — share momen kamu hari ini.',
  'Konsisten upload = algoritma sayang sama kamu.',
  'DM ke creator favorit kamu — kenalan & kolab biar follower naik.',
];

function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
  } catch {}
  return '/dashboard';
}

export default function WelcomePageWrapper() {
  return (
    <Suspense fallback={null}>
      <WelcomePage />
    </Suspense>
  );
}

function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const username = searchParams.get('user') || '';

  const [stepIdx, setStepIdx] = useState(0);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  // Intro split-reveal "Welcome @username" — selesai ~2.2 detik
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const tm = setTimeout(() => setIntroDone(true), 2200);
    return () => clearTimeout(tm);
  }, []);

  // Debug: ?freeze=1 disables auto-redirect (untuk inspect/screenshot)
  const freeze = searchParams.get('freeze') === '1';

  // Animasi step progres — total ~3.8 detik
  useEffect(() => {
    if (freeze) return;
    if (stepIdx >= STEPS.length - 1) {
      const t = setTimeout(() => router.replace(next), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIdx((i) => i + 1), 600);
    return () => clearTimeout(t);
  }, [stepIdx, next, router, freeze]);

  const current = STEPS[stepIdx];

  return (
    <div className="welcome-bg fixed inset-0 z-[10000] grid place-items-center overflow-hidden p-4">
      {/* Intro split-reveal — 2 panel hitam membelah, reveal "Welcome @username" */}
      {!introDone && (
        <>
          <div className="split-line" />
          <div className="split-text">
            <span>Welcome @{username || 'creator'}</span>
          </div>
          <div className="split-overlay">
            <div className="split-panel split-panel-l" />
            <div className="split-panel split-panel-r" />
          </div>
        </>
      )}

      {/* Glow orbs background */}
      <div className="welcome-orb welcome-orb-1" />
      <div className="welcome-orb welcome-orb-2" />
      <div className="welcome-orb welcome-orb-3" />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo with pulse */}
        <div className="welcome-logo mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-grad-accent text-5xl font-extrabold text-[color:var(--accent-fg)] ring-1 ring-white/15 shadow-2xl">
          M
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
          {username ? `Hi, ${username}!` : 'Welcome to MyStream'}
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Lagi nyiapin pengalaman terbaik untuk kamu…
        </p>

        {/* Step indicator */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/85">
          <span className="text-2xl">{current.icon}</span>
          <span className="font-medium">{current.msg}</span>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${current.pct}%` }}
          />
        </div>
        <div className="mt-1 text-right text-[10px] text-white/40 tabular-nums">{current.pct}%</div>

        {/* Bouncing dots */}
        <div className="mt-8 flex justify-center gap-1.5">
          <span className="welcome-dot" style={{ animationDelay: '0s' }} />
          <span className="welcome-dot" style={{ animationDelay: '0.15s' }} />
          <span className="welcome-dot" style={{ animationDelay: '0.3s' }} />
        </div>

        {/* Quote */}
        <p className="mt-8 text-xs italic text-white/50">"{QUOTES[quoteIdx]}"</p>
      </div>
    </div>
  );
}
