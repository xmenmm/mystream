'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { Avatar } from '@/components/Avatar';
import { fmtNum } from '@/lib/utils';

type U = {
  username: string; bio: string; avatarColor: string; hasAvatar: boolean;
  videoCount: number; followerCount: number; isFollowing: boolean; isMe: boolean;
};

export default function FriendsPage() {
  const { me } = useMe();
  const [users, setUsers] = useState<U[]>([]);
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setUsers([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      try {
        const r = await api<{ users: U[] }>('/api/users?q=' + encodeURIComponent(trimmed));
        setUsers(r.users.filter((u) => !u.isMe));
        setSearched(true);
      } catch {} finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function toggleFollow(name: string) {
    await api(`/api/users/${encodeURIComponent(name)}/follow`, { method: 'POST' });
    // re-fetch
    const r = await api<{ users: U[] }>('/api/users?q=' + encodeURIComponent(q.trim()));
    setUsers(r.users.filter((u) => !u.isMe));
  }

  if (!me) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold">🔍 Cari Teman</h1>
        <p className="text-sm text-muted">Ketik username minimal 2 karakter untuk mulai pencarian.</p>
      </header>
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
      {searched && loading && <div className="card text-center text-muted">⌛ Mencari…</div>}
      {searched && !loading && users.length === 0 && (
        <div className="card text-center text-muted">
          <div className="text-5xl mb-3 opacity-40">🤷</div>
          <h3 className="font-bold text-text">Tidak ditemukan</h3>
          <p className="text-sm mt-2">Username "<b>{q}</b>" belum terdaftar.</p>
        </div>
      )}
      {searched && users.length > 0 && (
        <div className="card divide-y divide-border p-0">
          {users.map((u) => (
            <div key={u.username} className="flex items-center gap-3 p-3">
              <Avatar username={u.username} hasAvatar={u.hasAvatar} color={u.avatarColor} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.username}</div>
                <div className="text-xs text-muted truncate">{u.bio || `${fmtNum(u.followerCount)} followers · ${u.videoCount} videos`}</div>
              </div>
              <button onClick={() => toggleFollow(u.username)} className={u.isFollowing ? 'btn-ghost' : 'btn-primary'}>
                {u.isFollowing ? '✓ Following' : '+ Follow'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
