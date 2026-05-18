'use client';
/**
 * Global UX layer untuk seluruh app:
 * - Hover FX (CSS injection — buttons lift, cards translate, thumbnails zoom)
 * - Anime.js dynamic loader + card stagger fade-in + number count-up
 * - Real-time announcement modal + warning modal (poll 10s)
 *
 * Mount sekali di root layout — auto-aktif di semua halaman.
 */
import { useEffect, useRef } from 'react';
import { useMe } from './UserContext';
import { apiGetAnnouncement, apiGetMyWarnings, apiMarkWarningRead } from '@/lib/api-client';

declare global { interface Window { anime?: any } }

export function GlobalEffects() {
  const { me } = useMe();
  const animeLoaded = useRef(false);
  const lastAnnId = useRef<string | null>(null);
  const seenWarnIds = useRef(new Set<string>());

  // Hover FX CSS — inject sekali
  useEffect(() => {
    if (document.getElementById('mystream-hover-fx')) return;
    const css = document.createElement('style');
    css.id = 'mystream-hover-fx';
    css.textContent = HOVER_FX_CSS;
    document.head.appendChild(css);
  }, []);

  // Load anime.js dari CDN + jalanin animasi global
  useEffect(() => {
    if (animeLoaded.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.anime) { animeLoaded.current = true; runAnimations(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js';
    s.async = true;
    s.onload = () => { animeLoaded.current = true; runAnimations(); };
    document.head.appendChild(s);
  }, []);

  // Real-time announcement (poll 10s)
  useEffect(() => {
    if (!me) return;
    const poll = async () => {
      try {
        const ann = await apiGetAnnouncement();
        if (!ann) return;
        if (sessionStorage.getItem('mystream_ann_dismissed_' + ann.id)) return;
        if (ann.id === lastAnnId.current && document.getElementById('mystream-ann-modal')) return;
        lastAnnId.current = ann.id;
        showAnnouncementModal(ann);
      } catch {}
    };
    poll();
    const t = setInterval(() => { if (!document.hidden) poll(); }, 10000);
    return () => clearInterval(t);
  }, [me]);

  // Real-time warning modal (poll 10s)
  useEffect(() => {
    if (!me) return;
    const poll = async () => {
      try {
        const ws = await apiGetMyWarnings();
        const fresh = ws.filter((w: any) => !w.read && !seenWarnIds.current.has(w.id));
        if (fresh.length === 0) return;
        fresh.forEach((w: any) => seenWarnIds.current.add(w.id));
        showWarningModal(fresh[0], fresh.length);
      } catch {}
    };
    poll();
    const t = setInterval(() => { if (!document.hidden) poll(); }, 10000);
    return () => clearInterval(t);
  }, [me]);

  return null;
}

const HOVER_FX_CSS = `
@media (hover: hover) and (pointer: fine) {
  button, .btn, .btn-primary, .btn-ghost, .btn-danger,
  a.btn, [role="button"] {
    transition: transform .18s cubic-bezier(.2,.8,.2,1), filter .18s, box-shadow .18s, background .18s !important;
    will-change: transform;
  }
  button:not(:disabled):hover, .btn:not(:disabled):hover, .btn-primary:hover, a.btn:hover {
    transform: translateY(-2px);
    filter: brightness(1.08);
    box-shadow: 0 8px 22px rgba(139,92,246,.28);
  }
  button:active, .btn:active { transform: translateY(0) scale(.97) !important; }

  .card, .vcard, .stat, .frow, .feed-item, .stat-card,
  article, [class*="ucard"], [class*="vcard"] {
    transition: transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s, border-color .2s !important;
    will-change: transform;
  }
  .card:hover, .stat:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.3); }
  .vcard:hover, article:hover {
    transform: translateY(-6px) !important;
    box-shadow: 0 18px 42px rgba(139,92,246,.35) !important;
  }

  input:focus, textarea:focus, select:focus {
    box-shadow: 0 0 0 3px rgba(139,92,246,.18) !important;
  }
}
@media (hover: none) {
  button:active, .btn:active { transform: scale(.97) !important; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
`;

function runAnimations() {
  const a = window.anime;
  if (!a) return;
  // Card stagger fade-in
  const cards = document.querySelectorAll('.card:not([data-anim-done]), .vcard:not([data-anim-done]), article:not([data-anim-done])');
  cards.forEach((c) => c.setAttribute('data-anim-done', '1'));
  if (cards.length) {
    a({
      targets: Array.from(cards),
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 600,
      delay: a.stagger(50, { start: 50 }),
      easing: 'easeOutCubic',
    });
  }
  // Number count-up
  document.querySelectorAll('[data-count]:not([data-counted])').forEach((el) => {
    const target = parseInt(el.textContent?.replace(/[^\d]/g, '') || '0', 10);
    if (!isFinite(target) || target < 1) return;
    el.setAttribute('data-counted', '1');
    const obj = { v: 0 };
    a({
      targets: obj, v: target,
      duration: Math.min(1500, 300 + target * 8),
      easing: 'easeOutQuad',
      update: () => { el.textContent = Math.round(obj.v).toLocaleString('id-ID'); },
    });
  });
}

function showAnnouncementModal(ann: any) {
  document.getElementById('mystream-ann-modal')?.remove();
  const types: any = {
    info: { grad: 'linear-gradient(135deg,#1e40af,#3b82f6)', accent: '#60a5fa', ic: 'ℹ', label: 'Pengumuman' },
    success: { grad: 'linear-gradient(135deg,#15803d,#22c55e)', accent: '#4ade80', ic: '✓', label: 'Kabar Baik' },
    warn: { grad: 'linear-gradient(135deg,#b45309,#f59e0b)', accent: '#fbbf24', ic: '⚠', label: 'Penting' },
  };
  const t = types[ann.type] || types.info;
  const overlay = document.createElement('div');
  overlay.id = 'mystream-ann-modal';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:9998;padding:20px;`;
  overlay.innerHTML = `
    <div style="background:${t.grad};border:2px solid ${t.accent};border-radius:20px;padding:32px 28px;max-width:520px;width:100%;color:#fff;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.5);">
      <div style="font-size:3.5rem;margin-bottom:8px;">${t.ic}</div>
      <div style="font-size:.78rem;text-transform:uppercase;letter-spacing:2px;opacity:.85;margin-bottom:6px;">${t.label}</div>
      <h2 style="font-size:1.5rem;margin-bottom:18px;font-weight:800;">Pengumuman Admin</h2>
      <div style="background:rgba(0,0,0,.25);padding:18px;border-radius:14px;margin-bottom:18px;font-size:1rem;line-height:1.6;white-space:pre-wrap;word-break:break-word;">${escapeHtml(ann.text)}</div>
      <div style="font-size:.78rem;opacity:.85;margin-bottom:20px;">Diumumkan oleh <b>${escapeHtml(ann.by)}</b></div>
      <button id="dismissAnn" style="width:100%;padding:14px;background:#fff;color:#1f2937;border:none;border-radius:12px;font-weight:800;cursor:pointer;font-size:1rem;">✓ Mengerti</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('dismissAnn')!.addEventListener('click', () => {
    sessionStorage.setItem('mystream_ann_dismissed_' + ann.id, '1');
    overlay.remove();
  });
}

function showWarningModal(w: any, totalUnread: number) {
  document.getElementById('mystream-warn-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'mystream-warn-modal';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;`;
  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#7c2d12,#991b1b);border:2px solid #ef4444;border-radius:20px;padding:32px 28px;max-width:520px;width:100%;color:#fff;text-align:center;box-shadow:0 30px 80px rgba(239,68,68,.5);">
      <div style="font-size:3.5rem;margin-bottom:8px;">⚠</div>
      <div style="font-size:.78rem;text-transform:uppercase;letter-spacing:2px;opacity:.85;margin-bottom:6px;">Peringatan dari Admin</div>
      <h2 style="font-size:1.5rem;margin-bottom:18px;font-weight:800;">Mohon Perhatian</h2>
      <div style="background:rgba(0,0,0,.3);padding:18px;border-radius:14px;margin-bottom:18px;font-size:1rem;line-height:1.6;white-space:pre-wrap;word-break:break-word;">${escapeHtml(w.text)}</div>
      <div style="font-size:.78rem;opacity:.85;margin-bottom:20px;">Dari <b>${escapeHtml(w.by)}</b>${totalUnread > 1 ? `<br>(${totalUnread - 1} peringatan lain antri)` : ''}</div>
      <button id="dismissWarn" style="width:100%;padding:14px;background:#fff;color:#991b1b;border:none;border-radius:12px;font-weight:800;cursor:pointer;font-size:1rem;">✓ Saya Mengerti</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('dismissWarn')!.addEventListener('click', async () => {
    try { await apiMarkWarningRead(w.id); } catch {}
    overlay.remove();
  });
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
