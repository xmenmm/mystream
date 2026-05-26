'use client';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'mystream_pwa_install_dismissed_at';
const SHOW_AGAIN_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export function PWARegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    // beforeinstallprompt — bisa show install banner
    function onPromptable(e: Event) {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      setDeferred(ev);

      const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
      if (!dismissedAt || Date.now() - dismissedAt > SHOW_AGAIN_MS) {
        setShowBanner(true);
      }
    }
    window.addEventListener('beforeinstallprompt', onPromptable);

    function onInstalled() {
      setShowBanner(false);
      setDeferred(null);
    }
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPromptable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShowBanner(false);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
  }

  if (!showBanner || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-accent/40 bg-bg-card p-4 shadow-2xl backdrop-blur md:left-auto md:right-6 md:bottom-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-2xl">📱</div>
        <div className="min-w-0 flex-1">
          <div className="font-bold">Install MyStream</div>
          <p className="mt-0.5 text-xs text-muted">
            Pasang sebagai app di HP/desktop kamu — buka lebih cepat, dapat notif push real-time.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              ↓ Install
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted hover:border-accent hover:text-text"
            >
              Nanti aja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
