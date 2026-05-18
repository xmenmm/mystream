'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { thumbUrl } from '@/lib/api-client';
import { fmtNum, timeAgo } from '@/lib/utils';

type V = {
  id: string; title: string; username: string; hasThumb: boolean;
  type: string; duration: number; views: number; likes: number; uploadedAt: string;
};
type U = {
  username: string; bio: string; avatarColor: string;
  isAdmin: boolean; isPremium: boolean; isVerified: boolean;
  videoCount: number; totalViews: number;
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted">Loading...</div>}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [videos, setVideos] = useState<V[]>([]);
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'videos' | 'users'>('all');

  useEffect(() => {
    if (!q.trim()) {
      setVideos([]);
      setUsers([]);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setVideos(data.videos || []);
        setUsers(data.users || []);
      })
      .finally(() => setLoading(false));
  }, [q]);

  if (!q.trim()) {
    return (
      <div className="card text-center">
        <div className="text-4xl">🔍</div>
        <h1 className="mt-3 text-xl font-bold">Cari video & creator</h1>
        <p className="mt-1 text-sm text-muted">Pakai search bar di atas atau tekan <kbd className="rounded bg-bg-elev px-1.5 py-0.5">Ctrl+K</kbd></p>
      </div>
    );
  }

  const showVideos = tab === 'all' || tab === 'videos';
  const showUsers = tab === 'all' || tab === 'users';

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">
          Hasil untuk <span className="bg-grad-accent bg-clip-text text-transparent">"{q}"</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          {loading ? '⏳ Mencari...' : `${videos.length + users.length} hasil ditemukan`}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <TabBtn active={tab === 'all'} onClick={() => setTab('all')} count={videos.length + users.length}>
          🔎 Semua
        </TabBtn>
        <TabBtn active={tab === 'videos'} onClick={() => setTab('videos')} count={videos.length}>
          🎬 Video
        </TabBtn>
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')} count={users.length}>
          👤 Creator
        </TabBtn>
      </div>

      {!loading && videos.length === 0 && users.length === 0 && (
        <div className="card text-center">
          <div className="text-4xl">🤷</div>
          <h2 className="mt-3 text-lg font-bold">Tidak ada hasil</h2>
          <p className="mt-1 text-sm text-muted">
            Coba kata kunci lain atau cek ejaan untuk "{q}"
          </p>
        </div>
      )}

      {/* Videos */}
      {showVideos && videos.length > 0 && (
        <section>
          {tab === 'all' && <h2 className="mb-2 font-bold text-muted">🎬 Video ({videos.length})</h2>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <Link key={v.id} href={`/watch?id=${v.id}`} className="card group p-2 transition hover:-translate-y-1 hover:border-accent/60">
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                  {v.hasThumb ? (
                    <img src={thumbUrl(v.id)} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center text-3xl">{v.type === 'image' ? '🖼' : '🎬'}</div>
                  )}
                </div>
                <div className="mt-2 px-1">
                  <div className="line-clamp-2 text-sm font-bold">{v.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    @{v.username} · 👁 {fmtNum(v.views)} · 👍 {fmtNum(v.likes)} · {timeAgo(v.uploadedAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Users */}
      {showUsers && users.length > 0 && (
        <section>
          {tab === 'all' && <h2 className="mb-2 mt-6 font-bold text-muted">👤 Creator ({users.length})</h2>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <Link
                key={u.username}
                href={`/user/${encodeURIComponent(u.username)}`}
                className="card flex items-center gap-3 transition hover:-translate-y-1 hover:border-accent/60"
              >
                <Avatar username={u.username} color={u.avatarColor} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 truncate font-bold">
                    @{u.username}
                    {u.isVerified && <VerifiedBadge size={16} />}
                    {u.isAdmin && <span className="rounded-full bg-warn/20 px-1.5 py-0.5 text-[9px] font-bold text-warn">ADMIN</span>}
                    {u.isPremium && <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-accent">⭐</span>}
                  </div>
                  <div className="text-xs text-muted">{u.videoCount} video · {fmtNum(u.totalViews)} views</div>
                  {u.bio && <p className="mt-1 line-clamp-2 text-xs text-muted">{u.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-b-2 border-accent text-text'
          : 'border-b-2 border-transparent text-muted hover:text-text'
      }`}
    >
      {children}
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-accent text-white' : 'bg-bg-elev text-muted'}`}>
        {count}
      </span>
    </button>
  );
}
