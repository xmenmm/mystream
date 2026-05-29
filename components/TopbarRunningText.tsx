'use client';
import { useEffect, useState } from 'react';

type RT = {
  enabled: boolean;
  text: string;
  textColor: string;
  speed: number;
};

/**
 * Running text TRANSPARAN di area TopBar (dashboard + halaman dalam app).
 * SEPARATE dari running text watch page — pakai endpoint berbeda.
 * Style: transparent bg, muncul subtle di samping greeting.
 */
export function TopbarRunningText() {
  const [cfg, setCfg] = useState<RT | null>(null);

  useEffect(() => {
    let cancel = false;
    const load = () => fetch('/api/running-text-topbar', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => !cancel && setCfg(d.runningText))
      .catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { cancel = true; clearInterval(t); };
  }, []);

  if (!cfg || !cfg.enabled || !cfg.text) return null;

  return (
    <div
      className="hidden min-w-0 flex-1 overflow-hidden md:block"
      style={{ color: cfg.textColor }}
      title={cfg.text}
    >
      <div
        className="banner-marquee whitespace-nowrap text-xs font-medium opacity-70"
        style={{ animationDuration: `${cfg.speed}s` }}
      >
        <span className="px-6">📢 {cfg.text}</span>
        <span className="px-6">📢 {cfg.text}</span>
        <span className="px-6">📢 {cfg.text}</span>
      </div>
    </div>
  );
}
