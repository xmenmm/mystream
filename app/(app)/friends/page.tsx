'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { Avatar } from '@/components/Avatar';
import { fmtNum } from '@/lib/utils';
import { useT } from '@/lib/i18n';

type U = {
  username: string; bio: string; avatarColor: string; hasAvatar: boolean;
  videoCount: number; followerCount: number; isFollowing: boolean; isMe: boolean;
};

type Tab = 'search' | 'followers' | 'following';

export default function FriendsPage() {
  const { me } = useMe();
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'search';
  const [tab, setTab] = useState<Tab>(['search', 'followers', 'following'].includes(initialTab) ? initialTab : 'search');

  // Search state
  const [users, setUsers] = useState<U[]>([]);
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Followers/Following state
  const [followers, setFollowers] = useState<U[]>([]);
  const [following, setFollowing] = useState<U[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Sync tab → URL
  function selectTab(t: Tab) {
    setTab(t);
    const url = t === 'search' ? '/friends' : `/friends?tab=${t}`;
    router.replace(url);
  }

  // Search effect
  useEffect(() => {
    if (tab !== 'search') return;
    const timer = setTimeout(async () => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setUsers([]);
        setSearched(false);
        return;
      }
      setLoadingSearch(true);
      try {
        const r = await api<{ users: U[] }>('/api/users?q=' + encodeURIComponent(trimmed));
        setUsers(r.users.filter((u) => !u.isMe));
        setSearched(true);
      } catch {} finally { setLoadingSearch(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, tab]);

  // Load followers/following when tab opens
  const loadFollowers = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await api<{ users: U[] }>('/api/me/followers');
      setFollowers(r.users || []);
    } catch {} finally { setLoadingList(false); }
  }, []);
  const loadFollowing = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await api<{ users: U[] }>('/api/me/following');
      setFollowing(r.users || []);
    } catch {} finally { setLoadingList(false); }
  }, []);

  useEffect(() => {
    if (!me) return;
    if (tab === 'followers') loadFollowers();
    else if (tab === 'following') loadFollowing();
  }, [tab, me, loadFollowers, loadFollowing]);

  async function toggleFollow(name: string) {
    await api(`/api/users/${encodeURIComponent(name)}/follow`, { method: 'POST' });
    // refresh active list
    if (tab === 'search') {
      const r = await api<{ users: U[] }>('/api/users?q=' + encodeURIComponent(q.trim()));
      setUsers(r.users.filter((u) => !u.isMe));
    } else if (tab === 'followers') {
      loadFollowers();
    } else {
      loadFollowing();
    }
  }

  const followersCount = followers.length;
  const followingCount = following.length;

  if (!me) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold">👥 Pengikut</h1>
        <p className="text-sm text-muted">Kelola followers, following, atau cari creator baru.</p>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        <TabBtn active={tab === 'search'} onClick={() => selectTab('search')} icon="🔍" label="Cari Creator" />
        <TabBtn active={tab === 'followers'} onClick={() => selectTab('followers')} icon="👥" label="Followers" count={tab === 'followers' ? followersCount : undefined} />
        <TabBtn active={tab === 'following'} onClick={() => selectTab('following')} icon="➕" label="Following" count={tab === 'following' ? followingCount : undefined} />
      </nav>

      {tab === 'search' && (
        <>
          <input
            autoFocus
            className="input"
            placeholder="Cari username (min 2 karakter)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {!searched && (
            <div className="card text-center text-muted">
              <div className="text-5xl mb-3 opacity-40">🔍</div>
              <h3 className="font-bold text-text">Mulai cari teman</h3>
              <p className="text-sm mt-2">Ketik username di kolom search atas — minimal 2 karakter.</p>
            </div>
          )}
          {searched && loadingSearch && <div className="card text-center text-muted">⌛ Mencari…</div>}
          {searched && !loadingSearch && users.length === 0 && (
            <div className="card text-center text-muted">
              <div className="text-5xl mb-3 opacity-40">🤷</div>
              <h3 className="font-bold text-text">Tidak ditemukan</h3>
              <p className="text-sm mt-2">Username "<b>{q}</b>" belum terdaftar.</p>
            </div>
          )}
          {searched && users.length > 0 && <UserList items={users} onToggle={toggleFollow} t={t} />}
        </>
      )}

      {tab === 'followers' && (
        <>
          {loadingList ? (
            <div className="card text-center text-muted">⌛ Memuat followers…</div>
          ) : followers.length === 0 ? (
            <div className="card text-center text-muted">
              <div className="text-5xl mb-3 opacity-40">👥</div>
              <h3 className="font-bold text-text">Belum ada followers</h3>
              <p className="text-sm mt-2">Saat ada user yang mengikuti kamu, mereka muncul di sini.</p>
            </div>
          ) : (
            <UserList items={followers} onToggle={toggleFollow} t={t} />
          )}
        </>
      )}

      {tab === 'following' && (
        <>
          {loadingList ? (
            <div className="card text-center text-muted">⌛ Memuat following…</div>
          ) : following.length === 0 ? (
            <div className="card text-center text-muted">
              <div className="text-5xl mb-3 opacity-40">➕</div>
              <h3 className="font-bold text-text">Belum follow siapa pun</h3>
              <p className="text-sm mt-2">Pakai tab "Cari Creator" untuk temukan creator menarik.</p>
              <button onClick={() => selectTab('search')} className="btn-primary mt-3">🔍 Cari Sekarang</button>
            </div>
          ) : (
            <UserList items={following} onToggle={toggleFollow} t={t} />
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: string; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition ${
        active ? 'text-accent' : 'text-muted hover:text-text'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
      {count !== undefined && <span className="text-[10px] text-muted">({count})</span>}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
    </button>
  );
}

function UserList({ items, onToggle, t }: { items: U[]; onToggle: (n: string) => void; t: (k: string) => string }) {
  return (
    <div className="card divide-y divide-border p-0">
      {items.map((u) => (
        <div key={u.username} className="flex items-center gap-3 p-3">
          <Avatar username={u.username} hasAvatar={u.hasAvatar} color={u.avatarColor} size={44} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{u.username}</div>
            <div className="text-xs text-muted truncate">{u.bio || `${fmtNum(u.followerCount)} followers · ${u.videoCount} videos`}</div>
          </div>
          {!u.isMe && (
            <button onClick={() => onToggle(u.username)} className={u.isFollowing ? 'btn-ghost' : 'btn-primary'}>
              {u.isFollowing ? '✓ ' + t('friends.btn_following') : '+ ' + t('friends.btn_follow')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
