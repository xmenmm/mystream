'use client';
import { useEffect, useRef, useState } from 'react';
import { useMe } from './UserContext';
import { LOCALES, useLocale } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { me, refresh } = useMe();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!me) return null;
  const isPremium = !!me.isPremium;
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  async function pick(code: string) {
    if (!isPremium) {
      setErr('🔒 Multi-language adalah fitur Premium. Upgrade dulu.');
      setTimeout(() => setErr(''), 3500);
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/me/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'gagal');
      await refresh();
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message || 'gagal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg border border-border bg-bg-elev px-2 py-1.5 text-sm hover:border-accent/50"
        title={isPremium ? 'Ganti bahasa UI' : 'Multi-language (Premium)'}
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline text-xs font-bold uppercase">{current.code}</span>
        {!isPremium && <span className="text-[9px] text-warn">⭐</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">
          <div className="border-b border-border bg-warn/10 px-3 py-2 text-[10px] font-bold uppercase text-warn">
            🌐 Bahasa {!isPremium && '(Premium only)'}
          </div>
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              disabled={busy}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-bg-elev ${l.code === locale ? 'bg-accent/10 text-accent' : ''}`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </span>
              {l.code === locale && <span className="text-accent">✓</span>}
            </button>
          ))}
          {err && (
            <div className="border-t border-border bg-danger/10 px-3 py-2 text-[10px] text-danger">
              {err}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
