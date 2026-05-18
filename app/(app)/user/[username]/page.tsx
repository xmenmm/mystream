'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { VideoCard, VideoLike } from '@/components/VideoCard';
import { countryDisplay, fmtNum } from '@/lib/utils';

type Profile = {
  username: string;
  email: string;
  bio: string;
  avatarColor: string;
  country: string;
  hasAvatar: boolean;
  createdAt: string;
  isAdmin?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  videoCount: number;
  totalViews: number;
  followers: string[];
  following: string[];
  videos: VideoLike[];
  isFollowing: boolean;
  isMe: boolean;
};

export default function UserPublicPage() {
  const { username } = useParams<{ username: string }>();
  const target = decodeURIComponent(username);
  const { me } = useMe();
  const [u, setU] = useState<Profile | null>(null);

  const load = () =>
    api<{ user: Profile }>(`/api/users/${encodeURIComponent(target)}`).then((r) => setU(r.user));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [target]);

  async function follow() {
    const r = await api<{ following: boolean }>(
      `/api/users/${encodeURIComponent(target)}/follow`, { method: 'POST' },
    );
    setU((x) => x ? { ...x, isFollowing: r.following } : x);
  }

  if (!u) return <div className="text-center text-muted">Loading…</div>;

  return (
    <div className="space-y-4">
      <section className="card flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:text-left">
        <Avatar username={u.username} hasAvatar={u.hasAvatar} color={u.avatarColor} size={96} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <h1 className="text-2xl font-bold">{u.username}</h1>
            {u.isVerified && <VerifiedBadge size={20} />}
            {u.isAdmin && <span className="rounded-full border border-warn/40 bg-warn/15 px-2 py-0.5 text-[10px] font-bold text-warn">ADMIN</span>}
            {u.isPremium && <span className="rounded-full bg-gradient-to-r from-warn to-accent-2 px-2 py-0.5 text-[10px] font-bold text-white">⭐ PREMIUM</span>}
          </div>
          <div className="text-sm text-muted">{countryDisplay(u.country)}</div>
          {u.bio && <p className="mt-2 text-sm">{u.bio}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm md:justify-start">
            <span><b>{u.videoCount}</b> <span className="text-muted">videos</span></span>
            <span><b>{fmtNum(u.totalViews)}</b> <span className="text-muted">views</span></span>
            <span><b>{u.followers.length}</b> <span className="text-muted">followers</span></span>
            <span><b>{u.following.length}</b> <span className="text-muted">following</span></span>
          </div>
        </div>
        {me && !u.isMe && (
          <button onClick={follow} className={u.isFollowing ? 'btn-ghost' : 'btn-primary'}>
            {u.isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
        {me && !u.isMe && (
          <Link href={`/messages/${encodeURIComponent(u.username)}`} className="btn-ghost">💬 Message</Link>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Videos</h2>
        {u.videos.length === 0 ? (
          <div className="card text-center text-muted">Belum ada video.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {u.videos.map((v) => <VideoCard key={v.id} v={v} />)}
          </div>
        )}
      </section>
    </div>
  );
}
