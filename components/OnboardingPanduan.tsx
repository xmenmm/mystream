'use client';
import { useEffect, useRef, useState } from 'react';
import { useMe } from './UserContext';

const SECTIONS = [
  {
    icon: '🏠',
    title: 'Dashboard',
    desc: 'Pusat kontrol kamu — lihat stats real-time (views, likes, storage), Top 1·2·3 video terpopuler, sparkline 7-hari per video, dan profile card dengan info plan kamu (Free / Premium).',
  },
  {
    icon: '🎬',
    title: 'Upload Video',
    desc: 'Klik tombol "+ Upload Video" di header. Drag-drop atau pilih file (MP4, MOV, WebM, JPG, PNG, GIF). Auto-thumbnail dari frame tengah. Free: max 500 MB & 10 menit. Premium: 10 GB per video & unlimited durasi.',
  },
  {
    icon: '🖼',
    title: 'History & Pagination',
    desc: 'Semua upload kamu di sini, terurut dari yang terbaru. Filter by Video / Image. Pagination otomatis aktif kalau lebih dari 8 item, dengan opsi 4 / 8 / 12 / 24 / 48 per halaman.',
  },
  {
    icon: '👥',
    title: 'Cari Teman',
    desc: 'Mode search-only — ketik username minimal 2 karakter di kolom search. Tidak ada list random untuk privasi. Klik Follow di hasil pencarian untuk mulai mengikuti.',
  },
  {
    icon: '💬',
    title: 'Messages',
    desc: 'Kirim DM ke teman kamu. Kalau belum saling follow, pesan masuk ke folder Requests target. Setelah keduanya saling follow, otomatis pindah ke Inbox.',
  },
  {
    icon: '🔐',
    title: 'Keamanan',
    desc: 'Aktifkan 2FA di Settings (scan QR pakai Google Authenticator/Authy). Login auto-block 30 detik setelah 3x salah password. Captcha SVG anti-bot di form daftar. Password disimpan dalam bentuk hash SHA-256.',
  },
];

export function OnboardingPanduan() {
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Guard: auto-show cukup SEKALI per mount, jangan re-trigger tiap `me`
  // berubah (mis. setelah refresh() habis ganti avatar) — kalau tidak,
  // modal balik terus & nge-block interaksi user (klik ganti foto dll).
  const autoShownRef = useRef(false);

  useEffect(() => {
    if (!me || autoShownRef.current) return;
    const dismissed = localStorage.getItem('mystream_panduan_dismissed');
    const seen = sessionStorage.getItem('mystream_panduan_seen');
    if (dismissed || seen) return;
    autoShownRef.current = true;
    // Auto-show 800ms setelah login agar tidak benturan dengan boot animation
    const t = setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem('mystream_panduan_seen', '1'); } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [me]);

  // Listen ke event manual untuk re-trigger dari HelpWidget
  useEffect(() => {
    const handler = () => { setActive(0); setOpen(true); };
    window.addEventListener('mystream:show-panduan', handler);
    return () => window.removeEventListener('mystream:show-panduan', handler);
  }, []);

  if (!open) return null;

  function dismiss(forever = false) {
    setOpen(false);
    if (forever) localStorage.setItem('mystream_panduan_dismissed', '1');
  }

  return (
    <div
      className="fixed inset-0 z-[9990] grid place-items-center bg-black/70 p-4 backdrop-blur"
      onClick={(e) => e.target === e.currentTarget && dismiss(false)}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border bg-accent p-5 text-white">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-xl">📖</div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold">Panduan singkat dashboard</h2>
            <p className="mt-0.5 text-sm opacity-90">
              {SECTIONS.length} bagian utama — klik tiap tab untuk pelajari.
            </p>
          </div>
          <button
            onClick={() => dismiss(false)}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-lg text-white hover:bg-white/30"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-border bg-bg p-3">
          {SECTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active === i
                  ? 'bg-accent text-white'
                  : 'border border-border bg-bg-card text-muted hover:text-text hover:border-accent'
              }`}
            >
              <span className="text-base">{s.icon}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent text-3xl">
              {SECTIONS[active].icon}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-extrabold">{SECTIONS[active].title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{SECTIONS[active].desc}</p>
            </div>
          </div>

          {/* Step navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setActive(Math.max(0, active - 1))}
              disabled={active === 0}
              className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30"
            >
              ← Sebelumnya
            </button>
            <div className="flex gap-1.5">
              {SECTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Step ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    active === i ? 'w-6 bg-accent' : 'w-1.5 bg-border'
                  }`}
                />
              ))}
            </div>
            {active < SECTIONS.length - 1 ? (
              <button onClick={() => setActive(active + 1)} className="btn-primary px-3 py-1.5 text-xs">
                Berikutnya →
              </button>
            ) : (
              <button onClick={() => dismiss(true)} className="btn-primary px-4 py-1.5 text-xs">
                Mengerti 🚀
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-bg p-3 text-xs">
          <button
            onClick={() => dismiss(true)}
            className="text-muted hover:text-text"
          >
            ✕ Jangan tampilkan lagi
          </button>
          <span className="text-muted">
            {active + 1} / {SECTIONS.length}
          </span>
        </div>
      </div>
    </div>
  );
}
