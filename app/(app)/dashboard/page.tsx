'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, thumbUrl, apiGetMyQuota } from '@/lib/api-client';
import { fmtNum, fmtBytes, timeAgo } from '@/lib/utils';
import { useMe } from '@/components/UserContext';
import { Avatar } from '@/components/Avatar';
import { VideoLike } from '@/components/VideoCard';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminTools } from '@/components/AdminTools';
import { CountUp } from '@/components/CountUp';
import { PremiumUpgradeModal } from '@/components/LandingPricing';
import { useT } from '@/lib/i18n';

type Summary = { totalVideos: number; totalViews: number; totalLikes: number; storageBytes: number };

export default function DashboardPage() {
  const { me } = useMe();
  const router = useRouter();
  const t = useT();
  const [videos, setVideos] = useState<VideoLike[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [stats, setStats] = useState<{ labels: string[]; data: number[]; likesData: number[] } | null>(null);
  const [perVideo, setPerVideo] = useState<Record<string, number[]>>({});
  const [quota, setQuota] = useState<any>(null);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [videoPage, setVideoPage] = useState(1);
  const VIDEOS_PER_PAGE = 5;

  useEffect(() => {
    if (!me) return;
    api<{ videos: VideoLike[] }>('/api/videos?user=me').then((r) => setVideos(r.videos));
    api<Summary>('/api/me/summary').then(setSummary);
    api<any>('/api/stats/views?days=14').then(setStats);
    api<{ data: Record<string, number[]> }>('/api/stats/per-video?days=7').then((r) => setPerVideo(r.data));
    apiGetMyQuota().then(setQuota).catch(() => {});
    api<{ users: any[] }>('/api/me/followers').then((r) => setFollowers(r.users || [])).catch(() => {});
    api<{ users: any[] }>('/api/me/following').then((r) => setFollowing(r.users || [])).catch(() => {});
    api<{ notifications: any[] }>('/api/notifications?limit=5').then((r) => setNotifs(r.notifications || [])).catch(() => {});
  }, [me]);

  if (!me) return null;

  const top3 = [...videos].sort((a, b) => b.views - a.views).slice(0, 3);

  return (
    <div className="space-y-3 sm:space-y-4">
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-3 sm:space-y-4 lg:col-span-2 xl:col-span-1">
        <header className="enter enter-1 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <div className="flex gap-2">
            <span className="chip" data-count>VIEWS <b className="text-success"><CountUp to={summary?.totalViews ?? 0} format={fmtNum} /></b></span>
            <span className="chip" data-count>LIKES <b className="text-success"><CountUp to={summary?.totalLikes ?? 0} format={fmtNum} /></b></span>
          </div>
        </header>

        {/* Top 1·2·3 */}
        <section className="card bg-grad-card enter enter-2">
          <h2 className="font-bold mb-3">{t('dashboard.top_views')}</h2>
          {top3.length === 0
            ? <p className="text-sm text-muted">Belum ada video — upload pertama via tombol Upload di header.</p>
            : <ol className="space-y-2">{top3.map((v, i) => (
                <li key={v.id}>
                  <Link href={`/watch?id=${v.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 p-3 hover:border-accent">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white ${i === 0 ? 'bg-warn' : i === 1 ? 'bg-muted' : 'bg-orange-500'}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{v.title}</div>
                      <div className="text-xs text-muted">Uploaded {timeAgo(v.uploadedAt)}</div>
                    </div>
                    <span className="text-sm font-bold"><CountUp to={v.views} format={fmtNum} delay={300 + i * 80} /></span>
                  </Link>
                </li>
              ))}</ol>}
        </section>

        {/* Statistics */}
        <section className="card enter enter-3">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold">{t('dashboard.statistics_14d')}</h2>
            {stats && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />Views</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-warn" />Likes</span>
              </div>
            )}
          </div>
          {!stats
            ? <div className="grid h-40 place-items-center text-sm text-muted">Loading…</div>
            : (stats.data.every((v: number) => v === 0) && stats.likesData.every((v: number) => v === 0))
              ? (
                <div className="grid h-40 place-items-center text-center">
                  <div>
                    <div className="text-3xl mb-2 opacity-50">📊</div>
                    <p className="text-sm text-muted">Belum ada views/likes 14 hari terakhir.</p>
                    <p className="mt-1 text-xs text-muted">Upload video & share link biar grafik mulai naik!</p>
                  </div>
                </div>
              )
              : <Spark labels={stats.labels} views={stats.data} likes={stats.likesData} />}
        </section>

        {/* Video Performance — paginated */}
        <section className="card enter enter-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{t('dashboard.video_performance')}</h2>
            {videos.length > 0 && (
              <span className="text-xs text-muted">
                {videos.length} video · halaman {Math.min(videoPage, Math.max(1, Math.ceil(videos.length / VIDEOS_PER_PAGE)))} / {Math.max(1, Math.ceil(videos.length / VIDEOS_PER_PAGE))}
              </span>
            )}
          </div>
          {videos.length === 0
            ? <p className="text-sm text-muted">Belum ada video.</p>
            : (() => {
                const totalPages = Math.max(1, Math.ceil(videos.length / VIDEOS_PER_PAGE));
                const safePage = Math.min(videoPage, totalPages);
                const start = (safePage - 1) * VIDEOS_PER_PAGE;
                const pageVideos = videos.slice(start, start + VIDEOS_PER_PAGE);
                return (
                  <div className="w-full">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted">
                        <tr className="border-b border-border">
                          <th className="py-2">{t('dashboard.col_video')}</th><th className="py-2 text-center">{t('dashboard.col_7day')}</th>
                          <th className="py-2 text-center">👍</th>
                          <th className="py-2 text-center">👁</th><th className="py-2 text-center">{t('dashboard.col_action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageVideos.map((v) => (
                          <tr key={v.id} className="border-b border-border/50">
                            <td className="py-2">
                              <Link href={`/watch?id=${v.id}`} className="flex items-center gap-2">
                                <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-black">
                                  {v.hasThumb && <img src={thumbUrl(v.id)} className="h-full w-full object-cover" alt="" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{v.title}</div>
                                  <div className="text-xs text-muted">{timeAgo(v.uploadedAt)}</div>
                                </div>
                              </Link>
                            </td>
                            <td className="px-2"><MiniSpark data={perVideo[v.id] || []} /></td>
                            <td className="text-center"><CountUp to={v.likes} format={fmtNum} delay={500} /></td>
                            <td className="text-center"><CountUp to={v.views} format={fmtNum} delay={500} /></td>
                            <td className="text-center"><Link href={`/watch?id=${v.id}`} className="btn-ghost px-3 py-1 text-xs">{t('dashboard.btn_view')}</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalPages > 1 && (
                      <Pagination current={safePage} total={totalPages} onChange={setVideoPage} />
                    )}
                  </div>
                );
              })()
          }
        </section>

        {/* QUICK ACTIONS + ACHIEVEMENTS side-by-side */}
        <div className="grid gap-4 md:grid-cols-2 enter enter-5">
          <section className="card">
            <h2 className="mb-3 font-bold">{t('dashboard.quick_actions')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/history" icon="🖼" label={t('dashboard.qa_uploads')} desc={t('dashboard.qa_uploads_desc')} />
              <QuickAction href="/friends" icon="👥" label={t('dashboard.qa_friends')} desc={t('dashboard.qa_friends_desc')} />
              <QuickAction href="/messages" icon="💬" label={t('dashboard.qa_messages')} desc={t('dashboard.qa_messages_desc')} />
              <QuickAction href="/settings" icon="⚙" label={t('dashboard.qa_settings')} desc={t('dashboard.qa_settings_desc')} />
            </div>
          </section>

          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">{t('dashboard.achievements')}</h2>
              <span className="rounded-full bg-bg px-2 py-0.5 text-[10px] font-bold text-warn">
                {[
                  videos.length >= 1, videos.length >= 5,
                  (summary?.totalViews ?? 0) >= 100, (summary?.totalLikes ?? 0) >= 10,
                  !!me.totpEnabled, !!me.isPremium,
                ].filter(Boolean).length}/6
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Badge unlocked={videos.length >= 1} icon="🎬" label={t('dashboard.ach_first')} desc={t('dashboard.ach_first_desc')} />
              <Badge unlocked={videos.length >= 5} icon="📹" label={t('dashboard.ach_5vids')} desc={t('dashboard.ach_5vids_desc')} />
              <Badge unlocked={(summary?.totalViews ?? 0) >= 100} icon="👁" label={t('dashboard.ach_100views')} desc={t('dashboard.ach_100views_desc')} />
              <Badge unlocked={(summary?.totalLikes ?? 0) >= 10} icon="👍" label={t('dashboard.ach_liked')} desc={t('dashboard.ach_liked_desc')} />
              <Badge unlocked={!!me.totpEnabled} icon="🔐" label={t('dashboard.ach_secure')} desc={t('dashboard.ach_secure_desc')} />
              <Badge unlocked={!!me.isPremium} icon="⭐" label={t('dashboard.ach_premium')} desc={t('dashboard.ach_premium_desc')} />
            </div>
          </section>
        </div>

        {/* TIPS & TRICKS */}
        <section className="card bg-grad-card enter enter-6">
          <h2 className="mb-3 font-bold">{t('dashboard.tips')}</h2>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <Tip icon="📌" text={t('dashboard.tip_thumbnail')} />
            <Tip icon="🔗" text={t('dashboard.tip_share')} />
            <Tip icon="👥" text={t('dashboard.tip_follow')} />
            <Tip icon="🔥" text={t('dashboard.tip_short_video')} />
            <Tip icon="🔐" text={t('dashboard.tip_2fa')} />
            <Tip icon="🎬" text={t('dashboard.tip_consistent')} />
          </div>
        </section>

      </div>

      <aside className="space-y-3 sm:space-y-4">
        <section className="card bg-grad-card enter enter-2">
          <h2 className="mb-3 font-bold">{t('dashboard.profile')}</h2>
          <div className="text-center">
            <Avatar username={me.username} hasAvatar={me.hasAvatar} color={me.avatarColor} size={72} />
            <div className="mt-2 text-lg font-bold">{me.username}</div>
            <div className="text-sm text-muted">@{me.username}</div>

            {/* Plan badge */}
            <div className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${me.isPremium
              ? 'bg-gradient-to-r from-warn to-accent-2 text-white border-transparent'
              : 'border border-border'}`}>
              {me.isPremium ? `⭐ Premium${me.premiumUntil ? ' ' + t('dashboard.until') + ' ' + new Date(me.premiumUntil).toLocaleDateString() : ' (' + t('dashboard.lifetime') + ')'}` : t('dashboard.free_plan')}
            </div>

            {/* Quota */}
            {quota && (
              <div className="mt-3 text-xs text-muted">
                {quota.daily?.unlimited
                  ? <>📦 Upload: <b className="text-warn">unlimited</b> · 🎬 <b>unlimited</b> · 💾 <b>unlimited</b></>
                  : (
                    <>
                      <div>📦 Upload 24 jam: <b>{quota.daily.used}/{quota.daily.limit}</b></div>
                      <div>💾 Storage: <b>{quota.storage?.usedLabel}</b> / {quota.storage?.limitLabel}</div>
                      <div>🎬 Max <b>{quota.limits.maxDurationLabel}</b> · file <b>{quota.limits.maxFileSizeLabel}</b></div>
                      <div className="mt-1 h-1 bg-bg-elev rounded overflow-hidden" title="Daily upload quota">
                        <div className="h-full bg-grad-accent transition-all" style={{ width: Math.min(100, (quota.daily.used / quota.daily.limit) * 100) + '%' }} />
                      </div>
                      {quota.storage && !quota.storage.unlimited && (
                        <div className="mt-1 h-1 bg-bg-elev rounded overflow-hidden" title="Storage usage">
                          <div className="h-full bg-warn transition-all" style={{ width: Math.min(100, quota.storage.percent) + '%' }} />
                        </div>
                      )}
                      <div className="mt-1 text-[10px]">⏱ Reset: 24 jam (rolling)</div>
                    </>
                  )}
              </div>
            )}

            <dl className="mt-4 space-y-2 text-sm">
              <Row k="Email" v={me.email} />
              <Row k="Member Since" v={new Date(me.createdAt).toLocaleDateString('id-ID')} />
              <Row k="Country" v={me.country || '—'} />
              <Row k="Status" v="● Active" />
            </dl>
            <Link href="/profile" className="btn-ghost mt-4 w-full">✏️ Edit Profile</Link>
          </div>
        </section>

        {/* PREMIUM UPSELL — kalau Free user */}
        {!me.isPremium && (
          <section className="card relative overflow-hidden border-warn/40 enter-pop" style={{ animationDelay: '0.3s' }}>
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-warn/40 to-accent-2/40 blur-3xl" />
            <div className="relative">
              <div className="text-3xl">⭐</div>
              <h2 className="mt-2 text-lg font-bold">Upgrade Premium</h2>
              <p className="mt-1 text-xs text-muted">
                Unlimited video, durasi unlimited, ukuran file <b className="text-warn">unlimited</b>. Untuk creator serius.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-muted">
                <li>✓ Ukuran file <b className="text-text">unlimited</b> (vs 500 MB)</li>
                <li>✓ Durasi <b className="text-text">unlimited</b> (vs 10 menit)</li>
                <li>✓ <b className="text-text">Unlimited</b> upload / hari</li>
                <li>✓ Storage <b className="text-text">unlimited</b></li>
                <li>✓ Badge ⭐ Premium di profile</li>
              </ul>
              <button
                onClick={() => setPremiumOpen(true)}
                className="btn-primary mt-3 w-full text-sm"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d946ef)' }}
              >
                🚀 Lihat Harga & Upgrade
              </button>
            </div>
          </section>
        )}

        {/* NETWORK */}
        <section className="card enter enter-4">
          <h2 className="mb-3 font-bold">🌐 Network</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/friends?tab=followers" className="rounded-xl border border-border bg-bg p-3 text-center transition hover:border-accent">
              <div className="text-xl">👥</div>
              <div className="mt-1 text-2xl font-extrabold"><CountUp to={followers.length} delay={400} /></div>
              <div className="text-[10px] uppercase tracking-wider text-muted">Followers</div>
            </Link>
            <Link href="/friends?tab=following" className="rounded-xl border border-border bg-bg p-3 text-center transition hover:border-accent">
              <div className="text-xl">➕</div>
              <div className="mt-1 text-2xl font-extrabold"><CountUp to={following.length} delay={450} /></div>
              <div className="text-[10px] uppercase tracking-wider text-muted">Following</div>
            </Link>
          </div>
          <Link href="/friends" className="btn-ghost mt-3 block w-full text-center text-xs">🔍 Cari Teman Baru</Link>
        </section>

        {/* STORAGE USED */}
        <section className="card enter enter-5">
          <h2 className="mb-3 font-bold">💾 Storage</h2>
          {summary ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-extrabold">
                  <CountUp to={summary.storageBytes} format={fmtBytes} delay={500} />
                </span>
                <span className="text-xs text-muted">terpakai</span>
              </div>
              <div className="mt-2 text-xs text-muted">
                Dari <b className="text-text"><CountUp to={videos.length} delay={550} /></b> file media kamu.
              </div>
              {videos.length > 0 && (
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row k="Rata-rata/file" v={fmtBytes(Math.round(summary.storageBytes / videos.length))} />
                  <Row k="Plan limit" v={quota?.limits?.maxFileSizeLabel || '—'} />
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted">Loading…</div>
          )}
        </section>

        {/* RECENT ACTIVITY */}
        <section className="card enter enter-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">🔔 Activity</h2>
            <Link href="/notifications" className="text-[10px] text-accent hover:underline">Lihat semua →</Link>
          </div>
          {notifs.length === 0 ? (
            <div className="rounded-lg bg-bg p-3 text-center text-xs text-muted">
              Belum ada notifikasi.<br />
              <span className="text-[10px]">Like, follow & comment akan muncul di sini.</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {notifs.slice(0, 4).map((n) => (
                <li key={n.id} className="flex items-start gap-2 rounded-lg border border-border bg-bg p-2">
                  <Avatar username={n.from} hasAvatar={n.fromHasAvatar} color={n.fromAvatarColor} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs">
                      <b>@{n.from}</b>{' '}
                      <span className="text-muted">
                        {n.type === 'like' ? '❤️ menyukai' : n.type === 'follow' ? 'mulai mengikuti' : 'aktivitas'}
                      </span>
                      {n.videoTitle ? <span className="text-muted"> "{n.videoTitle.slice(0, 18)}{n.videoTitle.length > 18 ? '…' : ''}"</span> : ''}
                    </div>
                    <div className="text-[10px] text-muted">{timeAgo(n.ts)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>

    {/* ADMIN PANEL — full-width di bawah grid biar gak ada area kosong di kanan */}
    {me.isAdmin && <div className="enter enter-7"><AdminTools /></div>}
    {me.isAdmin && <div className="enter enter-8"><AdminPanel /></div>}

    {/* Premium upgrade modal — open dari Free user CTA */}
    <PremiumUpgradeModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </div>
  );
}

function QuickAction({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-bg p-3 text-center transition hover:border-accent hover:bg-accent/5"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-bold">{label}</span>
      <span className="text-[10px] text-muted">{desc}</span>
    </Link>
  );
}

function Badge({ unlocked, icon, label, desc }: { unlocked: boolean; icon: string; label: string; desc: string }) {
  const t = useT();
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition ${
        unlocked
          ? 'border-warn/50 bg-gradient-to-br from-warn/10 to-accent-2/10'
          : 'border-border bg-bg opacity-50 grayscale'
      }`}
      title={unlocked ? `✓ ${desc}` : `🔒 ${desc}`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-bold">{label}</span>
      {unlocked
        ? <span className="text-[10px] text-warn">{t('dashboard.unlocked')}</span>
        : <span className="text-[10px] text-muted">🔒 {t('dashboard.locked')}</span>}
    </div>
  );
}

function Tip({ icon, text }: { icon: string; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-bg/30 p-2.5">
      <span className="text-base leading-none">{icon}</span>
      <span className="text-xs leading-relaxed">{text}</span>
    </div>
  );
}

function MiniStat({ label, value, valueNode, icon, color }: { label: string; value?: string; valueNode?: React.ReactNode; icon: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-2">
      <div className="text-base">{icon}</div>
      <div className={`mt-1 text-lg font-extrabold ${color || ''}`}>{valueNode ?? value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 py-1">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function Spark({ labels, views, likes }: { labels: string[]; views: number[]; likes: number[] }) {
  const W = 600, H = 200, padTop = 16, padBottom = 16;
  const max = Math.max(1, ...views, ...likes);
  const innerH = H - padTop - padBottom;
  const stepX = W / (Math.max(1, views.length - 1));
  const yOf = (v: number) => padTop + innerH - (v / max) * innerH;
  const ptOf = (arr: number[]) => arr.map((v, i) => ({ x: i * stepX, y: yOf(v) }));

  // Kurva mulus (Catmull-Rom → cubic bezier) biar nggak patah-patah/tajam
  const smooth = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };
  const linePath = (arr: number[]) => smooth(ptOf(arr));
  const areaPath = (arr: number[]) => `${smooth(ptOf(arr))} L ${W} ${H - padBottom} L 0 ${H - padBottom} Z`;

  const gridLines = [0, 0.5, 1].map((p) => padTop + innerH * (1 - p));
  const yLabels = [0, 0.5, 1].map((p) => Math.round(max * p));
  const lastV = views.length - 1;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W + 30} ${H + 18}`} className="h-52 w-full">
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform="translate(28,0)">
          {gridLines.map((y, i) => (
            <line key={i} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          {yLabels.map((v, i) => (
            <text key={i} x={-6} y={gridLines[i] + 3} fontSize="9" fill="#71717a" textAnchor="end">{v}</text>
          ))}
          <path d={areaPath(views)} fill="url(#viewsGrad)" />
          <path d={areaPath(likes)} fill="url(#likesGrad)" />
          <path d={linePath(likes)} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath(views)} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* satu titik aksen di ujung garis Views — bersih, nggak ramai */}
          {lastV >= 0 && (
            <circle cx={(lastV * stepX).toFixed(1)} cy={yOf(views[lastV]).toFixed(1)} r="3.5" fill="#3b82f6" stroke="#0e0e12" strokeWidth="2" />
          )}
        </g>
      </svg>
      <div className="mt-1 flex justify-between pl-7 text-[10px] text-muted">
        {labels.map((l) => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  // Build window: show 1, ..., current-1, current, current+1, ..., total
  const pages: (number | '...')[] = [];
  const push = (n: number | '...') => { if (pages[pages.length - 1] !== n) pages.push(n); };
  push(1);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i > 1 && i < total) {
      if (i > 2 && pages[pages.length - 1] !== '...' && (pages[pages.length - 1] as number) < i - 1) push('...');
      push(i);
    }
  }
  if (total > 1) {
    if ((pages[pages.length - 1] as number) < total - 1) push('...');
    push(total);
  }
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="rounded-lg border border-border bg-bg px-2 py-1 text-xs hover:bg-bg-elev disabled:opacity-40"
      >
        ← Prev
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dot-${i}`} className="px-2 text-xs text-muted">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`min-w-[28px] rounded-lg px-2 py-1 text-xs font-bold ${
              p === current
                ? 'bg-grad-accent text-white shadow-glow'
                : 'border border-border bg-bg text-muted hover:text-text'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="rounded-lg border border-border bg-bg px-2 py-1 text-xs hover:bg-bg-elev disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}

function MiniSpark({ data }: { data: number[] }) {
  if (!data || !data.length) return <span className="text-xs text-muted">—</span>;
  const W = 80, H = 24, max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i * W) / (data.length - 1 || 1)},${H - (v / max) * (H - 4) - 2}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-6 w-20"><polyline fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} /></svg>;
}
