'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGetBanner } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';

// Heuristik: kalau banner CTA arahkan ke /signup atau /login → target guest only.
// Jangan tampilkan ke user yang sudah login (CTA salah audience).
function isGuestCta(b: any): boolean {
  const url = String(b?.ctaUrl || '').toLowerCase();
  const label = String(b?.ctaLabel || b?.title || '').toLowerCase();
  return /\/(signup|register|login|daftar)/.test(url) || /daftar\s+gratis|sign up|register/.test(label);
}

export function BannerStrip() {
  const [b, setB] = useState<any>(null);
  const { me } = useMe();

  useEffect(() => {
    let cancel = false;
    const load = () => apiGetBanner().then((x) => !cancel && setB(x)).catch(() => {});
    load();
    const t = setInterval(load, 8000);   // refresh cepat biar edit admin langsung kelihatan
    return () => { cancel = true; clearInterval(t); };
  }, []);

  if (!b || !b.enabled) return null;
  // Sembunyikan banner CTA "Daftar Gratis" untuk user yang sudah login
  if (me && isGuestCta(b)) return null;

  const bgStyle = {
    background: `linear-gradient(135deg, ${b.bgColor1}, ${b.bgColor2})`,
    color: b.textColor,
    minHeight: b.height && b.height !== 'auto' ? b.height : undefined,
  };

  // Layout: text → running marquee. promo → icon+title+CTA. image → image only.
  if (b.layout === 'text') {
    return (
      <div className="banner-strip overflow-hidden rounded-2xl shadow-glow" style={bgStyle}>
        <div className="banner-marquee whitespace-nowrap py-2 text-sm font-semibold">
          <span className="px-6">{b.icon} {b.title}</span>
          <span className="px-6">{b.icon} {b.title}</span>
          <span className="px-6">{b.icon} {b.title}</span>
        </div>
      </div>
    );
  }

  if (b.layout === 'image' && b.imageUrl) {
    // Resolve height: 'auto' default → 200px (gak boleh undefined kalau kita pakai object-fit)
    const fitHeight = (b.height && b.height !== 'auto') ? b.height : '200px';
    const fit = (['cover', 'contain', 'fill', 'scale-down', 'none'].includes(b.objectFit) ? b.objectFit : 'cover') as any;
    return (
      <div className="banner-strip overflow-hidden rounded-2xl shadow-glow" style={bgStyle}>
        <Link href={b.ctaUrl || '#'} className="block">
          <img
            src={b.imageUrl}
            alt={b.title || ''}
            className="block w-full"
            style={{ height: fitHeight, objectFit: fit, objectPosition: 'center' }}
          />
        </Link>
      </div>
    );
  }

  // promo (default)
  return (
    <div className="banner-strip flex items-center gap-4 rounded-2xl p-4 shadow-glow" style={bgStyle}>
      {b.icon && <div className="text-3xl shrink-0">{b.icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="font-extrabold leading-tight">{b.title}</div>
        {b.subtitle && <div className="text-xs opacity-90">{b.subtitle}</div>}
      </div>
      {b.ctaText && b.ctaUrl && (
        <Link
          href={b.ctaUrl}
          className="shrink-0 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur transition hover:bg-white/30"
          style={{ color: b.textColor }}
        >
          {b.ctaText}
        </Link>
      )}
    </div>
  );
}

export function SideBannerCard() {
  const [b, setB] = useState<any>(null);
  useEffect(() => {
    let cancel = false;
    const load = () => fetch('/api/side-banner').then((r) => r.json()).then((x) => !cancel && setB(x.banner)).catch(() => {});
    load();
    const t = setInterval(load, 8000);   // auto-refresh biar edit side banner langsung kelihatan
    return () => { cancel = true; clearInterval(t); };
  }, []);
  if (!b || !b.enabled || (!b.title && !b.imageUrl)) return null;
  const style = {
    background: `linear-gradient(135deg, ${b.bgColor1}, ${b.bgColor2})`,
    color: b.textColor,
  };
  const ImgWrap = ({ children }: { children: React.ReactNode }) =>
    b.ctaUrl
      ? <Link href={b.ctaUrl} target={/^https?:\/\//i.test(b.ctaUrl) ? '_blank' : undefined} rel="noopener noreferrer" className="block">{children}</Link>
      : <>{children}</>;
  const imgHeight = (b.height && b.height !== 'auto') ? b.height : '160px';
  const imgFit = (['cover', 'contain', 'fill', 'scale-down', 'none'].includes(b.objectFit) ? b.objectFit : 'cover') as any;
  return (
    <div className="card overflow-hidden p-0">
      <div className="p-4" style={style}>
        {b.imageUrl && (
          <ImgWrap>
            <img
              src={b.imageUrl}
              alt={b.title || ''}
              className="mb-2 block w-full rounded-lg cursor-pointer"
              style={{ height: imgHeight, objectFit: imgFit, objectPosition: 'center' }}
            />
          </ImgWrap>
        )}
        {b.title && <div className="font-extrabold">{b.title}</div>}
        {b.subtitle && <div className="mt-1 text-xs opacity-90">{b.subtitle}</div>}
      </div>
    </div>
  );
}
