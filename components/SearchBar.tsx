'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { thumbUrl } from '@/lib/api-client';
import { fmtNum } from '@/lib/utils';

type VideoResult = {
  id: string; title: string; username: string; hasThumb: boolean;
  type: string; duration: number; views: number; likes: number; uploadedAt: string;
};
type UserResult = {
  username: string; bio: string; avatarColor: string;
  isAdmin: boolean; isPremium: boolean; isVerified: boolean;
  videoCount: number; totalViews: number;
};

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    if (!q.trim()) {
      setVideos([]);
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=5`);
        const data = await res.json();
        setVideos(data.videos || []);
        setUsers(data.users || []);
      } catch {
        setVideos([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  // Click outside closes dropdown
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd+K to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  const hasResults = videos.length > 0 || users.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <form onSubmit={submit}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            🔍
          </span>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Cari video, creator..."
            className="input w-full pl-9 pr-12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden text-[10px] text-muted md:inline">
            <kbd className="rounded border border-border bg-bg-elev px-1.5 py-0.5">Ctrl</kbd>
            <kbd className="ml-0.5 rounded border border-border bg-bg-elev px-1.5 py-0.5">K</kbd>
          </span>
        </div>
      </form>

      {/* Dropdown */}
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-bg-card shadow-2xl backdrop-blur-md">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted">⏳ Mencari...</div>
          ) : !hasResults ? (
            <div className="p-4 text-center">
              <div className="text-2xl">🔍</div>
              <div className="mt-2 text-sm text-muted">
                Tidak ada hasil untuk <b className="text-text">"{q}"</b>
              </div>
            </div>
          ) : (
            <>
              {/* Videos section */}
              {videos.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-bg-card px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                    🎬 Video ({videos.length})
                  </div>
                  {videos.map((v) => (
                    <Link
                      key={v.id}
                      href={`/watch?id=${v.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-bg-elev"
                    >
                      <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded bg-black">
                        {v.hasThumb ? (
                          <img src={thumbUrl(v.id)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg">{v.type === 'image' ? '🖼' : '🎬'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{v.title}</div>
                        <div className="text-[11px] text-muted">
                          @{v.username} · 👁 {fmtNum(v.views)} · 👍 {fmtNum(v.likes)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Users section */}
              {users.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-bg-card px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                    👤 Creator ({users.length})
                  </div>
                  {users.map((u) => (
                    <Link
                      key={u.username}
                      href={`/user/${encodeURIComponent(u.username)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-bg-elev"
                    >
                      <Avatar username={u.username} color={u.avatarColor} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 truncate text-sm font-semibold">
                          @{u.username}
                          {u.isVerified && <VerifiedBadge size={14} />}
                          {u.isAdmin && <span className="rounded-full bg-warn/20 px-1.5 py-0.5 text-[9px] font-bold text-warn">ADMIN</span>}
                          {u.isPremium && <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-accent">⭐</span>}
                        </div>
                        <div className="truncate text-[11px] text-muted">
                          {u.videoCount} video · {fmtNum(u.totalViews)} views{u.bio ? ` · ${u.bio.slice(0, 40)}` : ''}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* See all link */}
              <Link
                href={`/search?q=${encodeURIComponent(q.trim())}`}
                onClick={() => setOpen(false)}
                className="block border-t border-border px-3 py-2 text-center text-sm font-bold text-accent hover:bg-bg-elev"
              >
                Lihat semua hasil untuk "{q}" →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
