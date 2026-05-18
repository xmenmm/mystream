'use client';

/** Background lembut & modern untuk landing — base gelap + glow biru/indigo
 *  halus + grid samar. Senada tema baru (dark + accent biru). Tidak ramai,
 *  enak dipandang, dan tidak ganggu keterbacaan konten di atasnya. */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Base */}
      <div className="absolute inset-0 bg-bg" />

      {/* Glow biru — kiri atas (lembut di atas putih) */}
      <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-blue-400/15 blur-[150px]" />
      {/* Glow indigo — kanan tengah */}
      <div className="absolute -right-48 top-1/4 h-[520px] w-[520px] rounded-full bg-indigo-400/12 blur-[150px]" />
      {/* Glow cyan — bawah tengah */}
      <div className="absolute -bottom-48 left-1/3 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[160px]" />

      {/* Grid samar — kasih tekstur halus tanpa ramai */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.7) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse at center, black 25%, transparent 72%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 25%, transparent 72%)',
        }}
      />

      {/* Vignette sangat halus (di putih cukup tipis) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 60%, rgba(15,23,42,0.05) 100%)',
        }}
      />
    </div>
  );
}
