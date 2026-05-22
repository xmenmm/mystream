'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <WelcomePage />
    </Suspense>
  );
}

function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const username = searchParams.get('user') || '';

  // ?freeze=1 = nonaktifkan auto-redirect (buat inspect/screenshot)
  const freeze = searchParams.get('freeze') === '1';

  // Setelah animasi split selesai (~2.6s) → masuk dashboard
  useEffect(() => {
    if (freeze) return;
    const tm = setTimeout(() => router.replace(next), 2600);
    return () => clearTimeout(tm);
  }, [next, router, freeze]);

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden bg-black">
      {/* Teks "Welcome @username" — putih di tengah */}
      <div className="split-text">
        <span>Welcome @{username || 'creator'}</span>
      </div>

      {/* Garis aksen tipis di tengah */}
      <div className="split-line" />

      {/* 2 panel hitam yang membelah kiri-kanan */}
      <div className="split-overlay">
        <div className="split-panel split-panel-l" />
        <div className="split-panel split-panel-r" />
      </div>
    </div>
  );
}
