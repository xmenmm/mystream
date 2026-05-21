'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, uploadBytes, thumbUrl } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { CountUp } from '@/components/CountUp';
import { COUNTRIES, fmtBytes, fmtNum, timeAgo } from '@/lib/utils';
import { useT } from '@/lib/i18n';

export default function ProfilePage() {
  const { me, refresh } = useMe();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickerMenuRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [summary, setSummary] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [avatarVer, setAvatarVer] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    setBio(me.bio || '');
    setCountry(me.country || '');
    setColor(me.avatarColor || '#8b5cf6');
    api('/api/me/summary').then(setSummary);
    api<{ videos: any[] }>('/api/videos?user=me').then((r) => setVideos(r.videos || []));
    api<{ users: any[] }>('/api/me/followers').then((r) => setFollowers(r.users || [])).catch(() => {});
    api<{ users: any[] }>('/api/me/following').then((r) => setFollowing(r.users || [])).catch(() => {});
    api<{ notifications: any[] }>('/api/notifications?limit=8').then((r) => setNotifs(r.notifications || [])).catch(() => {});
  }, [me]);

  // Tutup menu pilih sumber foto kalau klik di luar
  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerMenuRef.current && !pickerMenuRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      await api('/api/me', { method: 'PUT', body: { bio, country, avatarColor: color } });
      await refresh();
      setMsg('✓ Tersimpan');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) {
      setMsg(e.message);
    } finally { setBusy(false); }
  }

  async function pickAvatar(file: File) {
    setAvatarMsg('');
    // Validasi client biar user dapat pesan jelas (bukan gagal diam-diam)
    if (!file.type.startsWith('image/')) {
      setAvatarMsg('⚠ File harus gambar (JPG / PNG / WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarMsg('⚠ Foto terlalu besar — maksimal 10 MB');
      return;
    }
    setAvatarBusy(true);
    setAvatarMsg('⏳ Mengupload foto…');
    try {
      await uploadBytes('/api/me/avatar', file);
      await refresh();
      setAvatarVer((v) => v + 1);   // paksa Avatar reload (bypass cache)
      setAvatarMsg('✓ Foto profil berhasil diganti');
      setTimeout(() => setAvatarMsg(''), 3000);
    } catch (e: any) {
      setAvatarMsg('⚠ Gagal upload: ' + (e?.message || 'coba lagi'));
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';   // boleh pilih file sama lagi
    }
  }

  async function removeAvatar() {
    if (!confirm('Hapus foto profil?')) return;
    setAvatarBusy(true);
    setAvatarMsg('');
    try {
      await api('/api/me/avatar', { method: 'DELETE' });
      await refresh();
      setAvatarVer((v) => v + 1);
      setAvatarMsg('✓ Foto dihapus');
      setTimeout(() => setAvatarMsg(''), 3000);
    } catch (e: any) {
      setAvatarMsg('⚠ Gagal hapus: ' + (e?.message || 'coba lagi'));
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!me) return null;

  const memberSinceDate = new Date(me.createdAt);
  const daysSinceJoin = Math.floor((Date.now() - memberSinceDate.getTime()) / (24 * 60 * 60 * 1000));
  const top3 = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
  const recent = [...videos].sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)).slice(0, 6);
  const country_ = COUNTRIES.find((c) => c.code === country);
  const charCountBio = bio.length;

  // Achievements
  const ACHIEVEMENTS = [
    { unlocked: videos.length >= 1,  icon: '🎬', label: 'First Upload',  desc: 'Upload video pertama' },
    { unlocked: videos.length >= 5,  icon: '📹', label: '5 Videos',      desc: 'Upload 5 video' },
    { unlocked: videos.length >= 10, icon: '🎞', label: '10 Videos',     desc: 'Upload 10 video' },
    { unlocked: (summary?.totalViews ?? 0) >= 100,  icon: '👁', label: '100 Views',  desc: 'Dapat 100 views' },
    { unlocked: (summary?.totalViews ?? 0) >= 1000, icon: '🔥', label: '1K Views',   desc: 'Dapat 1.000 views' },
    { unlocked: (summary?.totalLikes ?? 0) >= 10,   icon: '👍', label: 'Liked',      desc: 'Dapat 10 likes' },
    { unlocked: !!me.totpEnabled, icon: '🔐', label: 'Secure',     desc: '2FA aktif' },
    { unlocked: !!me.isPremium,   icon: '⭐', label: 'Premium',    desc: 'Upgrade Premium' },
    { unlocked: followers.length >= 1,  icon: '🤝', label: 'First Fan',  desc: 'Punya 1 follower' },
  ];
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-4">
      {/* HEADER strip dengan info ringkas — relative z-20 biar dropdown pilih foto
          tidak ke-clip sama card di bawahnya (yg punya backdrop-blur). */}
      <section className="card enter enter-1 bg-grad-card relative z-20">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative" ref={pickerMenuRef}>
            <button
              type="button"
              onClick={() => !avatarBusy && setPickerOpen((o) => !o)}
              className="block rounded-full transition hover:opacity-80"
              title="Klik untuk ganti foto"
              aria-label="Ganti foto profil"
            >
              <Avatar username={me.username} hasAvatar={me.hasAvatar} color={color} size={88} version={avatarVer} />
            </button>
            <button
              onClick={() => !avatarBusy && setPickerOpen((o) => !o)}
              disabled={avatarBusy}
              aria-expanded={pickerOpen}
              className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-grad-accent text-base shadow-glow ring-2 ring-[var(--bg-card)] transition hover:scale-110 disabled:opacity-60"
              title="Ganti foto"
              aria-label="Upload foto"
            >{avatarBusy ? '⏳' : '📷'}</button>

            {pickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-bg-card p-1 shadow-xl">
                {/* Pakai <label htmlFor> — buka file dialog secara NATIVE (tanpa
                    JS .click()), kebal quirk user-activation di semua browser/HP. */}
                {/* Tutup menu DITUNDA (setTimeout 0) — biar aksi native label
                    (buka file dialog) selesai dulu sebelum label di-unmount.
                    Kalau ditutup langsung, label hilang di tengah klik → dialog
                    nggak kebuka. */}
                <label
                  htmlFor="avatar-camera-input"
                  onClick={() => setTimeout(() => setPickerOpen(false), 0)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-bg-elev"
                >
                  📷 <span>Ambil dari Kamera</span>
                </label>
                <label
                  htmlFor="avatar-gallery-input"
                  onClick={() => setTimeout(() => setPickerOpen(false), 0)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-bg-elev"
                >
                  🖼️ <span>Pilih dari Galeri / File</span>
                </label>
                {me.hasAvatar && (
                  <button
                    type="button"
                    onClick={() => { setPickerOpen(false); removeAvatar(); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                  >
                    🗑 <span>Hapus foto</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold">{me.username}</h1>
              {(me as any).isVerified && <VerifiedBadge size={20} />}
              {me.isAdmin && <span className="rounded-full border border-warn/40 bg-warn/15 px-2 py-0.5 text-[10px] font-bold text-warn">ADMIN</span>}
              {me.isPremium && <span className="rounded-full bg-gradient-to-r from-warn to-accent-2 px-2 py-0.5 text-[10px] font-bold text-white">⭐ PREMIUM</span>}
              {me.totpEnabled && <span className="rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">🔐 2FA</span>}
            </div>
            <div className="text-sm text-muted">@{me.username} · {me.email}</div>
            <div className="mt-1 text-xs text-muted">
              {country_ ? `${country_.flag} ${country_.name}` : '—'} · Bergabung {timeAgo(me.createdAt)} ({daysSinceJoin} hari)
            </div>
            {me.bio && <p className="mt-2 text-sm">{me.bio}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              className="btn-ghost text-xs"
              onClick={() => !avatarBusy && setPickerOpen((o) => !o)}
              disabled={avatarBusy}
            >
              📷 Ganti foto profil
            </button>
            {avatarMsg && (
              <div className={`text-xs ${avatarMsg.startsWith('✓') ? 'text-success' : avatarMsg.startsWith('⚠') ? 'text-danger' : 'text-muted'}`}>
                {avatarMsg}
              </div>
            )}
          </div>
        </div>
        {/* Galeri / File — semua format gambar (termasuk HEIC dari iPhone).
            id dipakai oleh <label htmlFor> di menu (native, no-JS). */}
        <input
          id="avatar-gallery-input"
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pickAvatar(e.target.files[0])}
        />
        {/* Kamera — buka kamera langsung di HP (di desktop fallback ke file dialog) */}
        <input
          id="avatar-camera-input"
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pickAvatar(e.target.files[0])}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT — STATS + ACHIEVEMENTS + RECENT UPLOADS */}
        <div className="space-y-4 lg:col-span-2">
          {/* STATS GRID */}
          <section className="card enter enter-2">
            <h2 className="mb-3 font-bold">📊 Stats Kamu</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat icon="🎬" k="Videos" v={<CountUp to={summary?.totalVideos ?? 0} delay={150} />} />
              <Stat icon="👁" k="Views" v={<CountUp to={summary?.totalViews ?? 0} format={fmtNum} delay={200} />} color="text-warn" />
              <Stat icon="👍" k="Likes" v={<CountUp to={summary?.totalLikes ?? 0} format={fmtNum} delay={250} />} color="text-accent-2" />
              <Stat icon="💾" k="Storage" v={<CountUp to={summary?.storageBytes ?? 0} format={fmtBytes} delay={300} />} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3">
              <Link href="/friends?tab=followers" className="rounded-lg border border-border bg-bg p-2 hover:border-accent">
                <div className="text-base">👥</div>
                <div className="font-extrabold"><CountUp to={followers.length} delay={400} /></div>
                <div className="text-muted">Followers</div>
              </Link>
              <Link href="/friends?tab=following" className="rounded-lg border border-border bg-bg p-2 hover:border-accent">
                <div className="text-base">➕</div>
                <div className="font-extrabold"><CountUp to={following.length} delay={450} /></div>
                <div className="text-muted">Following</div>
              </Link>
              <div className="rounded-lg border border-border bg-bg p-2">
                <div className="text-base">📅</div>
                <div className="font-extrabold"><CountUp to={daysSinceJoin} delay={500} /></div>
                <div className="text-muted">Hari aktif</div>
              </div>
            </div>
          </section>

          {/* TOP VIDEOS */}
          <section className="card enter enter-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">🏆 Top Performing</h2>
              <Link href="/history" className="text-xs text-accent hover:underline">Semua video →</Link>
            </div>
            {top3.length === 0 ? (
              <p className="text-sm text-muted">Belum ada video — yuk upload pertama dari tombol di atas!</p>
            ) : (
              <ol className="space-y-2">
                {top3.map((v, i) => (
                  <li key={v.id}>
                    <Link href={`/watch?id=${v.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 p-3 hover:border-accent">
                      <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white ${i === 0 ? 'bg-warn' : i === 1 ? 'bg-muted' : 'bg-orange-500'}`}>{i + 1}</span>
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-black">
                        {v.hasThumb && <img src={thumbUrl(v.id)} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{v.title}</div>
                        <div className="text-xs text-muted">{timeAgo(v.uploadedAt)} · {v.likes || 0} likes</div>
                      </div>
                      <span className="text-sm font-bold">
                        <CountUp to={v.views || 0} format={fmtNum} delay={300 + i * 100} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* RECENT UPLOADS GRID */}
          <section className="card enter enter-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">🆕 Recent Uploads</h2>
              <Link href="/history" className="text-xs text-accent hover:underline">Lihat semua →</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-muted">Belum ada upload.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {recent.map((v) => (
                  <Link key={v.id} href={`/watch?id=${v.id}`} className="group overflow-hidden rounded-xl border border-border bg-bg transition hover:border-accent">
                    <div className="relative aspect-video bg-black">
                      {v.hasThumb && <img src={thumbUrl(v.id)} className="h-full w-full object-cover transition group-hover:scale-105" alt="" />}
                      <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        👁 {fmtNum(v.views || 0)}
                      </span>
                    </div>
                    <div className="p-2">
                      <div className="truncate text-xs font-semibold">{v.title}</div>
                      <div className="text-[10px] text-muted">{timeAgo(v.uploadedAt)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ACHIEVEMENTS — full grid */}
          <section className="card enter enter-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">🏅 Achievements</h2>
              <span className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-bold text-warn">
                <CountUp to={unlockedCount} delay={500} />/{ACHIEVEMENTS.length} unlocked
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4">
              {ACHIEVEMENTS.map((a, i) => (
                <div
                  key={i}
                  title={a.unlocked ? `✓ ${a.desc}` : `🔒 ${a.desc}`}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition ${
                    a.unlocked
                      ? 'border-warn/50 bg-gradient-to-br from-warn/10 to-accent-2/10'
                      : 'border-border bg-bg opacity-50 grayscale'
                  }`}
                >
                  <span className="text-2xl">{a.icon}</span>
                  <span className="text-xs font-bold">{a.label}</span>
                  <span className={`text-[10px] ${a.unlocked ? 'text-warn' : 'text-muted'}`}>
                    {a.unlocked ? '✓ Unlocked' : '🔒 Locked'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR — Edit form + activity */}
        <aside className="space-y-4">
          <section className="card enter enter-2">
            <h2 className="mb-3 text-lg font-bold">✏️ {t('profile.edit')}</h2>
            <div>
              <label className="label">{t('profile.bio')} <span className="text-[10px] text-muted">({charCountBio}/300)</span></label>
              <textarea
                className="input min-h-[88px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
                placeholder="Tulis sesuatu tentang kamu..."
              />
            </div>
            <div className="mt-3">
              <label className="label">{t('profile.country')}</label>
              <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">— Pilih —</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="label">Avatar color</label>
              <div className="flex gap-2">
                <input
                  className="h-10 w-12 cursor-pointer rounded-md border border-border bg-bg"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
                <input className="input flex-1 font-mono text-xs" value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {['#8b5cf6', '#d946ef', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#ef4444'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full border-2 border-border hover:scale-110"
                    style={{ background: c, borderColor: color === c ? '#fff' : undefined }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            {msg && <div className="mt-3 text-sm text-success">{msg}</div>}
            <button className="btn-primary mt-4 w-full" onClick={save} disabled={busy}>
              {busy ? 'Menyimpan…' : '💾 Simpan Perubahan'}
            </button>
          </section>

          {/* ACCOUNT INFO */}
          <section className="card enter enter-3">
            <h2 className="mb-3 font-bold">ℹ️ Account Info</h2>
            <dl className="space-y-1.5 text-sm">
              <Row k="Username" v={me.username} />
              <Row k="Email" v={me.email} />
              <Row k="Member sejak" v={memberSinceDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <Row k="Hari aktif" v={`${daysSinceJoin} hari`} />
              <Row k="Country" v={country_ ? `${country_.flag} ${country_.name}` : '—'} />
              <Row k="Plan" v={me.isPremium ? '⭐ Premium' : '✨ Free'} />
              <Row k="2FA" v={me.totpEnabled ? '✅ Aktif' : '⚠ Off'} />
              <Row k="Role" v={me.isAdmin ? '👑 Admin' : '👤 User'} />
            </dl>
            <Link href="/settings" className="btn-ghost mt-3 block w-full text-center text-xs">⚙ Buka Settings</Link>
          </section>

          {/* RECENT ACTIVITY */}
          <section className="card enter enter-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">🔔 Recent Activity</h2>
              <Link href="/notifications" className="text-[10px] text-accent hover:underline">Lihat →</Link>
            </div>
            {notifs.length === 0 ? (
              <p className="rounded-lg bg-bg p-3 text-center text-xs text-muted">
                Belum ada aktivitas.<br />
                <span className="text-[10px]">Like & follow akan muncul di sini.</span>
              </p>
            ) : (
              <ul className="space-y-2">
                {notifs.slice(0, 6).map((n) => (
                  <li key={n.id} className="flex items-start gap-2 rounded-lg border border-border bg-bg p-2 text-xs">
                    <Avatar username={n.from} hasAvatar={n.fromHasAvatar} color={n.fromAvatarColor} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        <b>@{n.from}</b>{' '}
                        <span className="text-muted">
                          {n.type === 'like' ? '❤️ menyukai' : n.type === 'follow' ? 'mulai mengikuti' : 'aktivitas'}
                        </span>
                        {n.videoTitle ? <span className="text-muted"> "{n.videoTitle.slice(0, 16)}{n.videoTitle.length > 16 ? '…' : ''}"</span> : ''}
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
    </div>
  );
}

function Stat({ k, v, icon, color }: { k: string; v: React.ReactNode; icon?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev p-2 text-center">
      {icon && <div className="text-lg">{icon}</div>}
      <div className={`mt-0.5 text-lg font-extrabold ${color || ''}`}>{v}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{k}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="truncate text-right text-sm font-medium">{v}</dd>
    </div>
  );
}
