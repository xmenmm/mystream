'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { useMe } from '@/components/UserContext';
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

function iconForType(t: string): string {
  if (t === 'like') return '❤️';
  if (t === 'follow') return '👥';
  if (t === 'upload') return '🎬';
  return '🔔';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { me } = useMe();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications?limit=50');
      if (!r.ok) {
        setItems([]);
        return;
      }
      const d = await r.json();
      setItems(d.notifications || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.read) : items),
    [items, filter],
  );
  const unreadCount = items.filter((n) => !n.read).length;

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  async function clickNotif(n: Notif) {
    if (!n.read) {
      try {
        await fetch(`/api/notifications/${encodeURIComponent(n.id)}/read`, { method: 'POST' });
        setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {}
    }
    if (n.videoId) router.push(`/watch?id=${n.videoId}`);
    else if (n.type === 'follow') router.push(`/user/${encodeURIComponent(n.from)}`);
  }

  if (!me) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
        <div className="text-4xl">🔒</div>
        <h2 className="mt-2 text-lg font-bold">Login dulu</h2>
        <p className="mt-1 text-sm text-muted">Login buat lihat notifikasi kamu.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          Ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">🔔 Notifikasi</h1>
          <p className="text-sm text-muted">
            {items.length} total · {unreadCount} belum dibaca
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-bg-card p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                filter === 'all' ? 'bg-accent text-white' : 'text-muted hover:text-text'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                filter === 'unread' ? 'bg-accent text-white' : 'text-muted hover:text-text'
              }`}
            >
              Belum dibaca {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-semibold hover:border-accent"
            >
              ✓ Tandai semua dibaca
            </button>
          )}
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted">⏳ Loading...</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-5xl">🌌</div>
            <div className="mt-3 text-base font-bold">
              {filter === 'unread' ? 'Semua sudah dibaca' : 'Belum ada notifikasi'}
            </div>
            <div className="mt-1 text-sm text-muted">
              Saat ada yang like, follow, atau upload baru, kamu bakal lihat di sini.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => clickNotif(n)}
                  className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-bg-elev ${
                    !n.read ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      username={n.from}
                      color={n.fromAvatarColor}
                      hasAvatar={n.fromHasAvatar}
                      size={44}
                    />
                    <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-bg-card text-sm ring-2 ring-bg">
                      {iconForType(n.type)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug">
                      <b>@{n.from}</b> {n.text}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <span>{timeAgo(n.ts)}</span>
                      {n.videoTitle && <span className="truncate">· 🎬 {n.videoTitle}</span>}
                    </div>
                  </div>
                  {!n.read && (
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                  )}
                  {n.videoId && n.videoHasThumb && (
                    <div className="ml-2 h-12 w-20 shrink-0 overflow-hidden rounded bg-black">
                      <img
                        src={thumbUrl(n.videoId)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
