'use client';
import { useEffect, useState } from 'react';
import { apiGetRunningText } from '@/lib/api-client';

type RT = {
  enabled: boolean;
  text: string;
  position: 'above' | 'below';
  bgColor1: string;
  bgColor2: string;
  textColor: string;
  speed: number;
};

/**
 * Running text marquee — global, dipasang di AppShell biar muncul di SEMUA
 * halaman (dashboard, history, profile, dst). Sebelumnya cuma di watch page.
 *
 * Auto-refresh tiap 15 detik supaya edit admin langsung kelihatan tanpa reload.
 */
export function GlobalRunningText() {
  const [cfg, setCfg] = useState<RT | null>(null);

  useEffect(() => {
    let cancel = false;
    const load = () => apiGetRunningText().then((d) => !cancel && setCfg(d)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { cancel = true; clearInterval(t); };
  }, []);

  if (!cfg || !cfg.enabled || !cfg.text) return null;

  return (
    <div
      className="overflow-hidden border-b border-border"
      style={{ background: `linear-gradient(135deg, ${cfg.bgColor1}, ${cfg.bgColor2})`, color: cfg.textColor }}
    >
      <div
        className="banner-marquee whitespace-nowrap py-1.5 text-sm font-semibold"
        style={{ animationDuration: `${cfg.speed}s` }}
      >
        <span className="px-6">📢 {cfg.text}</span>
        <span className="px-6">📢 {cfg.text}</span>
        <span className="px-6">📢 {cfg.text}</span>
        <span className="px-6">📢 {cfg.text}</span>
      </div>
    </div>
  );
}
