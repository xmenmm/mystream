'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { thumbUrl } from '@/lib/api-client';
import { timeAgo } from '@/lib/utils';

type Notif = {
  id: string;
  to: string;
  type: 'like' | 'follow' | 'upload' | string;
  from: string;
  videoId: string | null;
  text: string;
  ts: number;
  read: boolean;
  fromAvatarColor: string;
  fromHasAvatar: boolean;
  videoTitle: string;
  videoHasThumb: boolean;
};

const POLL_INTERVAL = 15000; // 15 detik

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications/unread/count');
      if (!r.ok) return;
      const d = await r.json();
      setCount(d.count || 0);
    } catch {}
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications?limit=15');
      const d = await r.json();
      setItems(d.notifications || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    loadCount();
    const t = setInterval(() => {
      if (!document.hidden) loadCount();
    }, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [loadCount]);

  // Load list when dropdown opens
  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  // Click outside closes
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setCount(0);
      setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  async function handleClickNotif(n: Notif) {
    // Mark as read
    if (!n.read) {
      try {
        await fetch(`/api/notifications/${encodeURIComponent(n.id)}/read`, { method: 'POST' });
        setCount((c) => Math.max(0, c - 1));
        setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {}
    }
    // Navigate to relevant target
    setOpen(false);
    if (n.videoId) {
      router.push(`/watch?id=${n.videoId}`);
    } else if (n.type === 'follow') {
      router.push(`/user/${encodeURIComponent(n.from)}`);
    } else {
      router.push('/notifications');
    }
  }

  function iconForType(type: string): string {
    if (type === 'like') return '❤️';
    if (type === 'follow') return '👥';
    if (type === 'upload') return '🎬';
    return '🔔';
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="relative grid h-10 w-10 place-items-center rounded-full text-xl hover:bg-bg-elev transition"
        aria-label="Notifications"
        title="Notifikasi"
      >
        🔔
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white shadow-lg ring-2 ring-bg animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-bg-elev/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <span className="font-bold">Notifikasi</span>
              {count > 0 && (
                <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-bold text-danger">
                  {count} baru
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-semibold text-accent hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted">⏳ Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl">🌌</div>
                <div className="mt-2 text-sm font-bold">Belum ada notifikasi</div>
                <div className="mt-1 text-xs text-muted">
                  Saat ada yang like, follow, atau upload baru, kamu bakal lihat di sini.
                </div>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickNotif(n)}
                  className={`flex w-full items-start gap-3 border-b border-border/50 p-3 text-left transition hover:bg-bg-elev ${
                    !n.read ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar username={n.from} color={n.fromAvatarColor} hasAvatar={n.fromHasAvatar} size={40} />
                    <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-bg-card text-xs ring-2 ring-bg">
                      {iconForType(n.type)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs leading-snug">
                      <b>@{n.from}</b> {n.text}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                      <span>{timeAgo(n.ts)}</span>
                      {n.videoTitle && (
                        <span className="truncate">· 🎬 {n.videoTitle}</span>
                      )}
                    </div>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  {n.videoId && n.videoHasThumb && (
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-black">
                      <img src={thumbUrl(n.videoId)} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-border bg-bg-elev/30 px-4 py-2.5 text-center text-sm font-bold text-accent hover:bg-bg-elev"
            >
              Lihat semua notifikasi →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
