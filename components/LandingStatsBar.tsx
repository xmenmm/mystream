'use client';
import { CountUp } from './CountUp';

type Stats = {
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
};

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function LandingStatsBar({ stats }: { stats: Stats }) {
  const items = [
    { icon: '👥', label: 'Creators', value: stats.totalUsers,  color: 'text-accent' },
    { icon: '🎬', label: 'Videos',   value: stats.totalVideos, color: 'text-warn' },
    { icon: '👁',  label: 'Total Views', value: stats.totalViews, color: 'text-success' },
    { icon: '👍', label: 'Total Likes',  value: stats.totalLikes,  color: 'text-accent-2' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className="card relative overflow-hidden bg-grad-card text-center transition hover:-translate-y-1 hover:border-accent/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
          <div className="relative">
            <div className="text-3xl">{it.icon}</div>
            <div className={`mt-2 text-3xl md:text-4xl font-extrabold ${it.color}`}>
              <CountUp to={it.value} format={fmtN} delay={150 + i * 100} duration={1500} />
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted">{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
