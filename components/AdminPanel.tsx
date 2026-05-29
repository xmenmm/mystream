'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  apiAdminStats, apiAdminUsers, apiAdminTop, apiAdminActivity,
  apiAdminSuspend, apiAdminUnsuspend, apiAdminWarn,
  apiAdminGrantPremium, apiAdminRevokePremium,
  apiSetAnnouncement, apiClearAnnouncement, apiGetAnnouncement,
  apiGetBanner, apiSetBanner, apiGetSideBanner, apiSetSideBanner,
  apiGetRunningText, apiSetRunningText,
  apiUploadBanner,
} from '@/lib/api-client';
import { fmtNum, timeAgo } from '@/lib/utils';
import { CountUp } from './CountUp';
import { useT } from '@/lib/i18n';

export type AdminTab = 'overview' | 'users' | 'top' | 'activity' | 'announce' | 'banner' | 'premium' | 'payments';
type Tab = AdminTab;

export function AdminPanel({ section, hideHeader }: { section?: AdminTab; hideHeader?: boolean } = {}) {
  const t = useT();
  const [tab, setTab] = useState<Tab>(section || 'overview');
  // Keep tab synced with prop when navigating between routes
  useEffect(() => { if (section) setTab(section); }, [section]);
  const lockTab = !!section;
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);
  const [topBy, setTopBy] = useState<'views'|'likes'|'videos'|'followers'>('views');
  const [activity, setActivity] = useState<any[]>([]);
  const [ann, setAnn] = useState<any>(null);
  const [annText, setAnnText] = useState('');
  const [annType, setAnnType] = useState<'info'|'success'|'warn'>('info');
  const [annMsg, setAnnMsg] = useState('');
  const [premiumTarget, setPremiumTarget] = useState<any | null>(null);
  const [detailUser, setDetailUser] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setStats(await apiAdminStats()); } catch {}
    if (tab === 'users' || tab === 'overview') {
      try { setUsers(await apiAdminUsers()); } catch {}
    }
    if (tab === 'top') {
      try { const r = await apiAdminTop(topBy, 20) as any; setTop(r.top); } catch {}
    }
    if (tab === 'activity') {
      try { const r = await apiAdminActivity(40) as any; setActivity(r.activity); } catch {}
    }
    if (tab === 'announce') {
      try { setAnn(await apiGetAnnouncement()); } catch {}
    }
  }, [tab, topBy]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden && (tab === 'overview' || tab === 'activity' || tab === 'users')) refresh(); }, 10000);
    return () => clearInterval(t);
  }, [refresh, tab]);

  async function handleSuspend(u: string) {
    const reason = prompt(`Suspend ${u}. Alasan (opsional):`);
    if (reason === null) return;
    try { await apiAdminSuspend(u, reason); refresh(); } catch (e: any) { alert('Gagal: ' + e.message); }
  }
  async function handleUnsuspend(u: string) {
    if (!confirm(`Unsuspend ${u}?`)) return;
    try { await apiAdminUnsuspend(u); refresh(); } catch (e: any) { alert('Gagal: ' + e.message); }
  }
  async function handleWarn(u: string) {
    const text = prompt(`Kirim peringatan ke ${u}:`);
    if (!text) return;
    try { await apiAdminWarn(u, text); refresh(); alert('✓ Peringatan terkirim'); } catch (e: any) { alert('Gagal: ' + e.message); }
  }
  function handleGrantPremium(u: string) {
    const target = users.find((x) => x.username === u) || { username: u };
    setPremiumTarget(target);
  }
  async function handleRevokePremium(u: string) {
    if (!confirm(`Cabut Premium dari ${u}?`)) return;
    try { await apiAdminRevokePremium(u); refresh(); } catch (e: any) { alert('Gagal: ' + e.message); }
  }
  async function handleVerify(u: string) {
    const reason = prompt(`Verify ${u} (kasih centang biru ✓). Alasan opsional:`) || '';
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'gagal');
      refresh();
    } catch (e: any) { alert('Gagal: ' + e.message); }
  }
  async function handleUnverify(u: string) {
    if (!confirm(`Cabut centang biru dari ${u}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u)}/verify`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'gagal');
      refresh();
    } catch (e: any) { alert('Gagal: ' + e.message); }
  }

  async function saveAnn() {
    if (!annText.trim()) return setAnnMsg('Pesan kosong');
    try {
      await apiSetAnnouncement(annText.trim(), annType);
      setAnnMsg('✓ Announcement aktif');
      setAnnText('');
      const a = await apiGetAnnouncement(); setAnn(a);
    } catch (e: any) { setAnnMsg(e.message); }
  }
  async function clearAnn() {
    if (!confirm('Hapus announcement aktif?')) return;
    await apiClearAnnouncement();
    setAnn(null);
  }

  return (
    <section className="card overflow-hidden p-0 border-warn/30">
      {!hideHeader && (
        <header className="flex items-center justify-between gap-2 bg-gradient-to-r from-warn to-danger p-4">
          <h2 className="font-bold text-white">🛡 {t('admin_page.home_title')}</h2>
          <span className="text-xs text-white/85">⚪ Live · auto-refresh 10s</span>
        </header>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-bg">
          <Stat label="Users"         num={stats.totalUsers} />
          <Stat label="Online"        num={stats.onlineNow}  color="text-success" />
          <Stat label="Videos"        num={stats.totalVideos} />
          <Stat label="Views"         num={stats.totalViews} format={fmtNum} color="text-warn" />
          <Stat label="Likes"         num={stats.totalLikes} format={fmtNum} />
          <Stat label="Suspended"     num={stats.suspended}  color="text-danger" />
          <Stat label="Baru hari ini" num={stats.newToday}   color="text-success" />
        </div>
      )}

      {!lockTab && (
        <div className="flex flex-wrap gap-1 px-3 pt-3">
          {(['overview', 'users', 'premium', 'payments', 'top', 'activity', 'announce', 'banner'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t
                ? 'rounded-lg bg-gradient-to-r from-warn to-danger px-3 py-1.5 text-xs font-bold text-white'
                : 'rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-muted'}
            >
              {t === 'overview' ? '📊 Overview'
                : t === 'users' ? '👥 Users'
                : t === 'premium' ? '⭐ Premium Codes'
                : t === 'payments' ? '🏦 Rekening'
                : t === 'top' ? '🏆 Top'
                : t === 'activity' ? '⚡ Activity'
                : t === 'announce' ? '📢 Announce'
                : '🖼 Banner'}
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        {tab === 'overview' && <OverviewPane users={users} />}
        {tab === 'users' && <UsersPane users={users} onSuspend={handleSuspend} onUnsuspend={handleUnsuspend} onWarn={handleWarn} onGrant={handleGrantPremium} onRevoke={handleRevokePremium} onVerify={handleVerify} onUnverify={handleUnverify} onDetail={(u: string) => setDetailUser(u)} />}
        {tab === 'top' && (
          <>
            <select className="input mb-3 w-auto" value={topBy} onChange={(e) => setTopBy(e.target.value as any)}>
              <option value="views">By Views</option><option value="likes">By Likes</option>
              <option value="videos">By Videos</option><option value="followers">By Followers</option>
            </select>
            <TopPane top={top} />
          </>
        )}
        {tab === 'activity' && <ActivityPane events={activity} />}
        {tab === 'banner' && <BannerPane />}
        {tab === 'premium' && <PremiumCodesPane onApproved={refresh} />}
        {tab === 'payments' && <PaymentsPane />}
        {tab === 'announce' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg p-3">
              <h4 className="text-sm font-bold mb-2">{t('admin_panel.announce_active')}</h4>
              {ann ? (
                <div>
                  <div className="text-xs text-muted">{ann.type} · oleh {ann.by} · {timeAgo(ann.ts)}</div>
                  <div className="mt-1">{ann.text}</div>
                </div>
              ) : <p className="text-sm text-muted">Tidak ada announcement aktif</p>}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold">{t('admin_panel.create_update')}</h4>
              <select className="input" value={annType} onChange={(e) => setAnnType(e.target.value as any)}>
                <option value="info">ℹ Info (biru)</option>
                <option value="success">✓ Success (hijau)</option>
                <option value="warn">⚠ Warning (kuning)</option>
              </select>
              <textarea className="input min-h-[80px]" value={annText} onChange={(e) => setAnnText(e.target.value)} maxLength={500} placeholder="Misalnya: Server maintenance besok 02:00–04:00 WIB." />
              {annMsg && <div className="text-xs">{annMsg}</div>}
              <div className="flex gap-2">
                <button className="btn-primary" onClick={saveAnn}>📢 Broadcast</button>
                <button className="btn-ghost" onClick={clearAnn}>🗑 Hapus aktif</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {premiumTarget && (
        <GrantPremiumModal
          user={premiumTarget}
          onClose={() => setPremiumTarget(null)}
          onSaved={() => { setPremiumTarget(null); refresh(); }}
        />
      )}

      {detailUser && (
        <UserDetailModal
          username={detailUser}
          onClose={() => setDetailUser(null)}
        />
      )}
    </section>
  );
}

function GrantPremiumModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const PRESETS: { label: string; days: number }[] = [
    { label: '7 hari', days: 7 },
    { label: '30 hari', days: 30 },
    { label: '90 hari', days: 90 },
    { label: '180 hari', days: 180 },
    { label: '365 hari', days: 365 },
    { label: 'Lifetime', days: 0 },
  ];

  const [tab, setTab] = useState<'preset' | 'custom' | 'date'>('preset');
  const [presetDays, setPresetDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>('30');
  const [mode, setMode] = useState<'extend' | 'set'>('extend');
  // Default datetime input: 30 hari ke depan
  const defaultUntil = (() => {
    const d = user.premiumUntil ? new Date(user.premiumUntil) : new Date(Date.now() + 30 * 86400000);
    if (isNaN(d.getTime()) || d.getTime() < Date.now()) {
      d.setTime(Date.now() + 30 * 86400000);
    }
    // Format ke "YYYY-MM-DDTHH:mm" untuk <input type="datetime-local">
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();
  const [untilLocal, setUntilLocal] = useState<string>(defaultUntil);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isCurrentlyPremium = !!user.isPremium;
  const currentExpiry = user.premiumUntil
    ? new Date(user.premiumUntil).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : (isCurrentlyPremium ? 'Lifetime' : '—');

  async function submit() {
    setSaving(true); setErr('');
    try {
      let payload: any = { mode };
      if (tab === 'preset') {
        payload.days = presetDays;
      } else if (tab === 'custom') {
        const d = parseInt(customDays, 10);
        if (isNaN(d) || d < 0) throw new Error('Hari harus angka ≥ 0 (0 = lifetime)');
        payload.days = d;
      } else {
        if (!untilLocal) throw new Error('Tanggal wajib diisi');
        const isoDate = new Date(untilLocal);
        if (isNaN(isoDate.getTime())) throw new Error('Tanggal invalid');
        if (isoDate.getTime() <= Date.now()) throw new Error('Tanggal harus di masa depan');
        payload.untilISO = isoDate.toISOString();
      }
      const r = await apiAdminGrantPremium(user.username, payload);
      const msg = r.lifetime
        ? `✓ ${user.username} jadi Premium LIFETIME`
        : `✓ ${user.username} Premium sampai ${new Date(r.premiumUntil!).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`;
      alert(msg);
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[9000] grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{t('admin_panel.grant_premium')} — @{user.username}</h3>
          <button onClick={onClose} className="text-2xl text-muted hover:text-text" aria-label="Tutup">×</button>
        </div>

        <div className="mb-3 rounded-lg border border-border bg-bg p-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Status sekarang:</span>
            <span className="font-semibold">
              {isCurrentlyPremium ? <span className="text-warn">⭐ Premium</span> : <span className="text-muted">Free</span>}
            </span>
          </div>
          {isCurrentlyPremium && (
            <div className="mt-1 flex justify-between">
              <span className="text-muted">Berlaku sampai:</span>
              <span className="font-semibold">{currentExpiry}</span>
            </div>
          )}
        </div>

        <div className="mb-3 flex gap-1 rounded-lg border border-border bg-bg p-1">
          {(['preset', 'custom', 'date'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold transition ${
                tab === t ? 'bg-accent text-white' : 'text-muted hover:text-text'
              }`}
            >
              {t === 'preset' ? '⏱ Preset' : t === 'custom' ? '🔢 Custom' : '📅 Tanggal'}
            </button>
          ))}
        </div>

        {tab === 'preset' && (
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPresetDays(p.days)}
                className={`rounded-lg border p-2 text-xs font-semibold transition ${
                  presetDays === p.days
                    ? 'border-warn bg-warn/15 text-warn'
                    : 'border-border bg-bg text-muted hover:border-accent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'custom' && (
          <div>
            <label className="mb-1 block text-xs text-muted">Jumlah hari (0 = lifetime, max 3650)</label>
            <input
              type="number"
              min={0}
              max={3650}
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="input"
            />
          </div>
        )}

        {tab === 'date' && (
          <div>
            <label className="mb-1 block text-xs text-muted">Tanggal & jam berakhir Premium</label>
            <input
              type="datetime-local"
              value={untilLocal}
              onChange={(e) => setUntilLocal(e.target.value)}
              className="input"
            />
            <p className="mt-1 text-[10px] text-muted">Premium akan otomatis non-aktif setelah tanggal ini.</p>
          </div>
        )}

        {tab !== 'date' && (
          <div className="mt-3 rounded-lg border border-border bg-bg p-2.5 text-xs">
            <label className="mb-1 block text-muted">Cara terapkan:</label>
            <div className="flex gap-2">
              <label className="flex flex-1 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-bg-card p-2">
                <input type="radio" checked={mode === 'extend'} onChange={() => setMode('extend')} />
                <span><b>Tambah</b> ke yang ada</span>
              </label>
              <label className="flex flex-1 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-bg-card p-2">
                <input type="radio" checked={mode === 'set'} onChange={() => setMode('set')} />
                <span><b>Reset</b> dari sekarang</span>
              </label>
            </div>
          </div>
        )}

        {err && <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{err}</div>}

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Batal</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg, #f59e0b, #d946ef)' }}>
            {saving ? 'Menyimpan…' : '⭐ Grant Premium'}
          </button>
        </div>

        <p className="mt-3 text-[10px] text-muted">
          Premium aktif segera setelah disimpan — user otomatis dapat unlimited upload, file 10 GB, durasi unlimited, storage unlimited, badge ⭐.
        </p>
      </div>
    </div>,
    document.body,
  );
}

function Stat({ label, value, num, format, color }: { label: string; value?: any; num?: number; format?: (n: number) => string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-3">
      <div className="text-xs text-muted uppercase tracking-wide">{label}</div>
      <div className={`mt-1 font-extrabold text-xl ${color || ''}`}>
        {num != null ? <CountUp to={num} format={format} delay={120} /> : value}
      </div>
    </div>
  );
}

function OverviewPane({ users }: { users: any[] }) {
  const t = useT();
  const now = Date.now();
  const newUsers = users.filter((u) => now - new Date(u.createdAt).getTime() < 86400000).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const online = users.filter((u) => u.lastActiveAt && now - u.lastActiveAt < 5 * 60 * 1000).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold mb-2">{t('admin_panel.new_users')}</h4>
        {newUsers.length === 0 ? <p className="text-xs text-muted">—</p> :
          newUsers.map((u) => <UserRow key={u.username} u={u} />)}
      </div>
      <div>
        <h4 className="text-sm font-bold mb-2">{t('admin_panel.online_now')}</h4>
        {online.length === 0 ? <p className="text-xs text-muted">—</p> :
          online.map((u) => <UserRow key={u.username} u={u} />)}
      </div>
    </div>
  );
}

function UserRow({ u }: { u: any }) {
  const isOnline = u.lastActiveAt && Date.now() - u.lastActiveAt < 5 * 60 * 1000;
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border text-sm">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white text-xs font-bold">{u.username[0].toUpperCase()}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">
          {u.username}
          {u.isAdmin && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-warn/15 text-warn border border-warn/30">ADMIN</span>}
          {u.isPremium && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-warn/15 text-warn border border-warn/40">⭐ PREMIUM</span>}
        </div>
        <div className="text-xs text-muted">{u.videoCount} videos · {fmtNum(u.totalViews)} views</div>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded ${isOnline ? 'bg-success/15 text-success border border-success/30' : 'bg-muted/15 text-muted border border-border'}`}>
        {isOnline ? '● ONLINE' : timeAgo(u.lastActiveAt || u.createdAt)}
      </span>
    </div>
  );
}

function UsersPane({ users, onSuspend, onUnsuspend, onWarn, onGrant, onRevoke, onVerify, onUnverify, onDetail }: any) {
  const t = useT();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'premium' | 'suspended' | 'admin'>('all');

  const q = search.trim().toLowerCase();
  const filtered = (users as any[]).filter((u) => {
    if (q) {
      const hay = `${u.username} ${u.email || ''} ${u.country || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter === 'online') {
      const isOnline = u.lastActiveAt && Date.now() - u.lastActiveAt < 5 * 60 * 1000;
      if (!isOnline) return false;
    } else if (filter === 'premium') {
      if (!u.isPremium) return false;
    } else if (filter === 'suspended') {
      if (!u.suspended) return false;
    } else if (filter === 'admin') {
      if (!u.isAdmin) return false;
    }
    return true;
  });

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
          <span className="text-muted">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin_panel.search_user')}
            className="w-full bg-transparent text-sm outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted hover:text-text" aria-label="Clear">×</button>
          )}
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-xl border border-border bg-bg px-3 py-2 text-xs"
        >
          <option value="all">Semua</option>
          <option value="online">🟢 Online</option>
          <option value="premium">⭐ Premium</option>
          <option value="suspended">⛔ Suspended</option>
          <option value="admin">🛡 Admin</option>
        </select>
        <span className="text-xs text-muted">
          {filtered.length} / {users.length} user{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-muted text-[10px] uppercase">
          <tr className="border-b border-border">
            <th className="py-2">Username</th>
            <th className="py-2 hidden sm:table-cell">Bergabung</th>
            <th className="py-2">Status</th>
            <th className="py-2 hidden sm:table-cell">Videos</th>
            <th className="py-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-xs text-muted">
                {q ? `Tidak ada user yang cocok dengan "${search}"` : 'Tidak ada user di filter ini'}
              </td>
            </tr>
          )}
          {filtered.map((u: any) => {
            const isOnline = u.lastActiveAt && Date.now() - u.lastActiveAt < 5 * 60 * 1000;
            return (
              <tr key={u.username} className="border-b border-border/50">
                <td className="py-2">
                  <span className="font-semibold">{u.username}</span>
                  {u.isVerified && <span className="ml-1 inline-block align-middle text-[#1d9bf0]" title="Verified">✓</span>}
                  {u.isAdmin && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-warn/15 text-warn border border-warn/30">ADMIN</span>}
                  {u.isPremium && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-warn/15 text-warn border border-warn/40" title={u.premiumUntil ? `Sampai ${new Date(u.premiumUntil).toLocaleString('id-ID')}` : 'Lifetime'}>
                      ⭐ {!u.premiumUntil
                        ? 'LIFETIME'
                        : (() => {
                            const d = Math.ceil((new Date(u.premiumUntil).getTime() - Date.now()) / 86400000);
                            return d > 0 ? `${d}h` : 'EXPIRED';
                          })()}
                    </span>
                  )}
                  {u.warningCount > 0 && <span className="ml-1 text-warn text-[10px]">⚠ {u.warningCount}</span>}
                </td>
                <td className="py-2 hidden sm:table-cell text-xs">{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                <td className="py-2">{u.suspended
                  ? <span className="text-[10px] bg-danger/15 text-danger border border-danger/30 px-2 py-0.5 rounded">SUSPENDED</span>
                  : <span className={`text-[10px] px-2 py-0.5 rounded border ${isOnline ? 'bg-success/15 text-success border-success/30' : 'border-border text-muted'}`}>{isOnline ? 'ONLINE' : 'offline'}</span>
                }</td>
                <td className="py-2 hidden sm:table-cell">{u.videoCount}</td>
                <td className="py-2 flex gap-1 flex-wrap">
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onDetail?.(u.username)} title="Detail lengkap user">🔍</button>
                  {u.isPremium
                    ? <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onRevoke(u.username)} title="Revoke premium">⭐✕</button>
                    : <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onGrant(u.username)} title="Grant premium">⭐+</button>}
                  {u.isVerified
                    ? <button className="btn-ghost px-2 py-1 text-xs text-[#1d9bf0]" onClick={() => onUnverify?.(u.username)} title="Cabut centang biru">✓✕</button>
                    : <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onVerify?.(u.username)} title="Verify (centang biru)">✓+</button>}
                  {!u.isAdmin && (u.suspended
                    ? <button className="btn-ghost px-2 py-1 text-xs text-success" onClick={() => onUnsuspend(u.username)}>↻</button>
                    : <button className="btn-ghost px-2 py-1 text-xs text-danger" onClick={() => onSuspend(u.username)}>⛔</button>)}
                  {!u.isAdmin && <button className="btn-ghost px-2 py-1 text-xs text-warn" onClick={() => onWarn(u.username)}>⚠</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TopPane({ top }: { top: any[] }) {
  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead className="text-left text-muted text-[10px] uppercase">
          <tr className="border-b border-border">
            <th className="py-2 w-10">#</th><th>User</th><th>Videos</th><th>Views</th><th>Likes</th>
          </tr>
        </thead>
        <tbody>
          {top.map((u, i) => (
            <tr key={u.username} className="border-b border-border/50">
              <td className="py-2 font-bold" style={{ color: i < 3 ? '#fbbf24' : 'var(--muted)' }}>{i + 1}</td>
              <td>{u.username}</td><td>{u.videos}</td><td>{fmtNum(u.views)}</td><td>{fmtNum(u.likes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityPane({ events }: { events: any[] }) {
  const icons: Record<string, string> = { register: '🆕', upload: '📹', like: '👍' };
  return (
    <div className="space-y-1 max-h-[480px] overflow-y-auto">
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-bg border border-border text-sm">
          <span>{icons[e.type] || '⚡'}</span>
          <span className="font-bold">{e.user}</span>
          <span className="flex-1 text-muted truncate">{e.text}</span>
          <span className="text-xs text-muted">{timeAgo(e.ts)}</span>
        </div>
      ))}
      {events.length === 0 && <p className="text-center text-muted py-4">Belum ada aktivitas</p>}
    </div>
  );
}

function BannerPane() {
  const t = useT();
  const [b, setB] = useState<any>(null);
  const [sb, setSb] = useState<any>(null);
  const [rt, setRt] = useState<any>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiGetBanner().then(setB).catch(() => {});
    apiGetSideBanner().then(setSb).catch(() => {});
    apiGetRunningText().then(setRt).catch(() => {});
  }, []);

  async function saveMain() {
    try { await apiSetBanner(b); setMsg('✓ Banner utama tersimpan'); setTimeout(() => setMsg(''), 2500); }
    catch (e: any) { setMsg('Gagal: ' + e.message); }
  }
  async function saveSide() {
    try { await apiSetSideBanner(sb); setMsg('✓ Side banner tersimpan'); setTimeout(() => setMsg(''), 2500); }
    catch (e: any) { setMsg('Gagal: ' + e.message); }
  }
  async function saveRt() {
    try { await apiSetRunningText(rt); setMsg('✓ Running text tersimpan'); setTimeout(() => setMsg(''), 2500); }
    catch (e: any) { setMsg('Gagal: ' + e.message); }
  }

  if (!b || !sb || !rt) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      {msg && <div className="rounded-lg border border-border bg-bg p-2 text-xs">{msg}</div>}

      {/* MAIN BANNER (juga jadi running text kalau layout=text) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold">{t('admin_panel.main_banner')}</h4>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={b.enabled} onChange={(e) => setB({ ...b, enabled: e.target.checked })} />
            Aktifkan
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <label className="text-[10px] uppercase text-muted">Layout</label>
            <select className="input" value={b.layout} onChange={(e) => setB({ ...b, layout: e.target.value })}>
              <option value="promo">Promo (icon + title + CTA)</option>
              <option value="text">Text (running text saja)</option>
              <option value="image">Image (custom image)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted">Icon</label>
            <input className="input" maxLength={6} value={b.icon} onChange={(e) => setB({ ...b, icon: e.target.value })} placeholder="🎬" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted">Tinggi (image only)</label>
            <select className="input" value={b.height} onChange={(e) => setB({ ...b, height: e.target.value })}>
              <option value="auto">Auto (default 200px)</option>
              <option value="100px">XS — 100px (strip tipis)</option>
              <option value="150px">S — 150px</option>
              <option value="200px">M — 200px</option>
              <option value="280px">L — 280px</option>
              <option value="360px">XL — 360px</option>
              <option value="450px">XXL — 450px</option>
            </select>
          </div>
        </div>

        {/* OBJECT FIT — bagaimana image ngepasin container */}
        {b.layout === 'image' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase text-muted">{t('admin_panel.image_fit')}</label>
              <select className="input" value={b.objectFit || 'cover'} onChange={(e) => setB({ ...b, objectFit: e.target.value })}>
                <option value="cover">Cover — penuhi tanpa distorsi (crop)</option>
                <option value="contain">Contain — full image kelihatan (ada padding)</option>
                <option value="fill">Fill — stretch penuhin (bisa distorsi)</option>
                <option value="scale-down">Scale-down — auto kecil kalau image besar</option>
                <option value="none">None — ukuran asli image</option>
              </select>
              <div className="mt-1 text-[10px] text-muted">
                💡 <b>Cover</b> = paling enak buat banner panorama. <b>Contain</b> = kalau gambar penting full kelihatan.
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted">Tinggi custom (override)</label>
              <input
                className="input"
                value={b.height}
                onChange={(e) => setB({ ...b, height: e.target.value })}
                placeholder="auto / 200px / 12rem / 30vh"
              />
              <div className="mt-1 text-[10px] text-muted">
                Format: <code>auto</code>, <code>200px</code>, <code>12rem</code>, <code>30vh</code>, <code>50%</code>
              </div>
            </div>
          </div>
        )}
        <div>
          <label className="text-[10px] uppercase text-muted">Title (running text utama)</label>
          <input className="input" maxLength={120} value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted">Subtitle</label>
          <textarea className="input min-h-[60px]" maxLength={240} value={b.subtitle} onChange={(e) => setB({ ...b, subtitle: e.target.value })} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase text-muted">{t('admin_panel.cta_text')}</label>
            <input className="input" maxLength={40} value={b.ctaText} onChange={(e) => setB({ ...b, ctaText: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted">{t('admin_panel.cta_url')}</label>
            <input className="input" maxLength={500} value={b.ctaUrl} onChange={(e) => setB({ ...b, ctaUrl: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <ColorField label="BG dari" v={b.bgColor1} onChange={(v) => setB({ ...b, bgColor1: v })} />
          <ColorField label="BG ke" v={b.bgColor2} onChange={(v) => setB({ ...b, bgColor2: v })} />
          <ColorField label="Teks" v={b.textColor} onChange={(v) => setB({ ...b, textColor: v })} />
        </div>
        <ImageUrlField
          label="Image URL (auto-pilih layout = Image)"
          value={b.imageUrl}
          onChange={(v) => setB({
            ...b,
            imageUrl: v,
            // Auto-switch layout ke 'image' kalau user upload/paste URL baru
            // & layout masih default 'promo'. Kalau user emang udah pilih layout
            // lain (text/image), respect pilihannya.
            layout: v && b.layout === 'promo' ? 'image' : b.layout,
          })}
          placeholder="https://... atau upload file →"
        />
        {b.imageUrl && b.layout !== 'image' && (
          <div className="rounded-lg border border-warn/30 bg-warn/10 p-2 text-xs text-warn">
            ⚠ Image URL diisi tapi Layout = <b>{b.layout}</b>. Gambar tidak akan tampil.
            <button
              type="button"
              onClick={() => setB({ ...b, layout: 'image' })}
              className="ml-2 underline hover:text-text"
            >
              Ganti ke layout Image →
            </button>
          </div>
        )}

        {/* PREVIEW — replicate sama persis dengan render production */}
        <div className="rounded-xl border border-border p-2">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase text-muted">
            <span>{t('admin_panel.preview')}</span>
            {b.layout === 'image' && (
              <span className="normal-case text-[10px]">
                Tinggi: <b className="text-text">{b.height}</b> · Fit: <b className="text-text">{b.objectFit || 'cover'}</b>
              </span>
            )}
          </div>
          {b.layout === 'image' && b.imageUrl ? (
            <div
              className="overflow-hidden rounded-lg"
              style={{ background: `linear-gradient(135deg, ${b.bgColor1}, ${b.bgColor2})` }}
            >
              <img
                src={b.imageUrl}
                alt=""
                className="block w-full"
                style={{
                  height: (b.height && b.height !== 'auto') ? b.height : '200px',
                  objectFit: (b.objectFit || 'cover') as any,
                  objectPosition: 'center',
                }}
              />
            </div>
          ) : b.layout === 'text' ? (
            <div
              className="overflow-hidden rounded-lg"
              style={{ background: `linear-gradient(135deg, ${b.bgColor1}, ${b.bgColor2})`, color: b.textColor }}
            >
              <div className="banner-marquee whitespace-nowrap py-2 text-sm font-semibold">
                <span className="px-6">{b.icon} {b.title || '(title)'}</span>
                <span className="px-6">{b.icon} {b.title || '(title)'}</span>
                <span className="px-6">{b.icon} {b.title || '(title)'}</span>
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg p-4"
              style={{
                background: `linear-gradient(135deg, ${b.bgColor1}, ${b.bgColor2})`,
                color: b.textColor,
                minHeight: b.height === 'auto' ? undefined : b.height,
              }}
            >
              <div className="flex items-center gap-3">
                {b.icon && <div className="text-3xl">{b.icon}</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold">{b.title || '(title)'}</div>
                  {b.subtitle && <div className="text-xs opacity-90">{b.subtitle}</div>}
                </div>
                {b.ctaText && (
                  <span className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold">{b.ctaText}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={saveMain}>💾 Simpan Banner Utama</button>
      </div>

      <hr className="border-border" />

      {/* SIDE BANNER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold">{t('admin_panel.side_banner')}</h4>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={sb.enabled} onChange={(e) => setSb({ ...sb, enabled: e.target.checked })} />
            Aktifkan
          </label>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted">Title</label>
          <input className="input" maxLength={120} value={sb.title} onChange={(e) => setSb({ ...sb, title: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted">Subtitle</label>
          <textarea className="input min-h-[60px]" maxLength={240} value={sb.subtitle} onChange={(e) => setSb({ ...sb, subtitle: e.target.value })} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase text-muted">{t('admin_panel.cta_text')}</label>
            <input className="input" maxLength={40} value={sb.ctaText} onChange={(e) => setSb({ ...sb, ctaText: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted">{t('admin_panel.cta_url')}</label>
            <input className="input" maxLength={500} value={sb.ctaUrl} onChange={(e) => setSb({ ...sb, ctaUrl: e.target.value })} />
          </div>
        </div>
        <ImageUrlField
          label="Image URL"
          value={sb.imageUrl}
          onChange={(v) => setSb({ ...sb, imageUrl: v })}
          placeholder="https://... atau upload file →"
        />
        {sb.imageUrl && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase text-muted">Tinggi image</label>
              <select className="input" value={sb.height} onChange={(e) => setSb({ ...sb, height: e.target.value })}>
                <option value="auto">Auto (default 160px)</option>
                <option value="100px">XS — 100px</option>
                <option value="160px">S — 160px</option>
                <option value="220px">M — 220px</option>
                <option value="300px">L — 300px</option>
                <option value="400px">XL — 400px</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted">{t('admin_panel.image_fit')}</label>
              <select className="input" value={sb.objectFit || 'cover'} onChange={(e) => setSb({ ...sb, objectFit: e.target.value })}>
                <option value="cover">Cover — penuhi (crop)</option>
                <option value="contain">Contain — full kelihatan</option>
                <option value="fill">Fill — stretch</option>
                <option value="scale-down">Scale-down</option>
                <option value="none">None — ukuran asli</option>
              </select>
            </div>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <ColorField label="BG dari" v={sb.bgColor1} onChange={(v) => setSb({ ...sb, bgColor1: v })} />
          <ColorField label="BG ke" v={sb.bgColor2} onChange={(v) => setSb({ ...sb, bgColor2: v })} />
          <ColorField label="Teks" v={sb.textColor} onChange={(v) => setSb({ ...sb, textColor: v })} />
        </div>
        <button className="btn-primary" onClick={saveSide}>💾 Simpan Side Banner</button>
      </div>

      <hr className="border-border" />

      {/* RUNNING TEXT — global, muncul di semua watch page */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold">{t('admin_panel.running_text')}</h4>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={rt.enabled} onChange={(e) => setRt({ ...rt, enabled: e.target.checked })} />
            Aktifkan
          </label>
        </div>
        <p className="text-xs text-muted">
          Tampil sebagai marquee strip di luar video player — semua viewer di semua video bisa lihat.
        </p>
        <div>
          <label className="text-[10px] uppercase text-muted">Teks</label>
          <input
            className="input"
            maxLength={300}
            value={rt.text}
            onChange={(e) => setRt({ ...rt, text: e.target.value })}
            placeholder="Contoh: Promo HARI INI 50% — subscribe sekarang!"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase text-muted">{t('admin_panel.position')}</label>
            <select className="input" value={rt.position} onChange={(e) => setRt({ ...rt, position: e.target.value })}>
              <option value="above">↑ Di atas video</option>
              <option value="below">↓ Di bawah video</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted">Kecepatan ({rt.speed}s/loop)</label>
            <input
              type="range"
              min={5} max={60} step={1}
              value={rt.speed}
              onChange={(e) => setRt({ ...rt, speed: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <ColorField label="BG dari" v={rt.bgColor1} onChange={(v) => setRt({ ...rt, bgColor1: v })} />
          <ColorField label="BG ke" v={rt.bgColor2} onChange={(v) => setRt({ ...rt, bgColor2: v })} />
          <ColorField label="Teks" v={rt.textColor} onChange={(v) => setRt({ ...rt, textColor: v })} />
        </div>

        {/* PREVIEW */}
        <div className="rounded-xl border border-border p-2">
          <div className="mb-1 text-[10px] uppercase text-muted">{t('admin_panel.preview')}</div>
          <div
            className="overflow-hidden rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${rt.bgColor1}, ${rt.bgColor2})`,
              color: rt.textColor,
            }}
          >
            <div
              className="banner-marquee whitespace-nowrap py-1.5 text-sm font-semibold"
              style={{ animationDuration: `${rt.speed}s` }}
            >
              <span className="px-6">📢 {rt.text || '(teks kosong)'}</span>
              <span className="px-6">📢 {rt.text || '(teks kosong)'}</span>
              <span className="px-6">📢 {rt.text || '(teks kosong)'}</span>
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={saveRt}>💾 Simpan Running Text</button>
      </div>
    </div>
  );
}

function ColorField({ label, v, onChange }: { label: string; v: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-muted">{label}</label>
      <div className="flex gap-1">
        <input type="color" value={v} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-border bg-bg" />
        <input className="input flex-1" value={v} onChange={(e) => onChange(e.target.value)} maxLength={7} />
      </div>
    </div>
  );
}

function ImageUrlField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    setBusy(true); setErr(''); setOkMsg(''); setProgress(0);
    try {
      const fake = setInterval(() => setProgress((p) => Math.min(85, p + 10)), 120);
      const r = await apiUploadBanner(file);
      clearInterval(fake);
      setProgress(100);
      onChange(r.url);
      setOkMsg(`✓ Berhasil upload "${file.name}" (${(r.size / 1024).toFixed(1)} KB) — URL otomatis terisi`);
      setTimeout(() => { setProgress(0); setOkMsg(''); }, 4000);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase text-muted">{label}</label>

      {/* BIG UPLOAD DROPZONE — ini yang paling kelihatan */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !busy && fileRef.current?.click()}
        className={`flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4 transition ${
          busy
            ? 'border-accent/30 bg-accent/5 cursor-wait'
            : dragOver
              ? 'border-accent bg-accent/10'
              : 'border-accent/50 bg-accent/5 hover:border-accent hover:bg-accent/10'
        }`}
        role="button"
        title="Klik atau drag-drop image kesini"
      >
        <span className="text-3xl">{busy ? '⏬' : '📤'}</span>
        <div className="text-center">
          <div className="text-sm font-bold text-accent">
            {busy ? `Uploading ${progress}%…` : 'Klik atau Drag-Drop image kesini'}
          </div>
          <div className="text-[10px] text-muted">
            JPG / PNG / WEBP / GIF / SVG · max 10 MB
          </div>
        </div>
      </div>

      {/* Progress bar saat upload */}
      {busy && (
        <div className="h-1 overflow-hidden rounded-full bg-bg-elev">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* OR pakai URL */}
      <div>
        <div className="mb-1 text-[10px] text-muted">— atau paste URL eksternal —</div>
        <input
          className="input"
          maxLength={500}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'https://example.com/image.jpg'}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {err && <div className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">⚠ {err}</div>}
      {okMsg && <div className="rounded-lg border border-success/30 bg-success/10 p-2 text-xs text-success">{okMsg}</div>}

      {value && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[10px] uppercase text-muted">{t('admin_panel.preview_image')}</div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[10px] text-danger hover:underline"
            >
              ✕ Hapus
            </button>
          </div>
          <img
            src={value}
            alt=""
            className="max-h-32 w-auto rounded-lg border border-border bg-bg"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
          />
        </div>
      )}
    </div>
  );
}

// ============ PREMIUM CODES PANE ============

type PremiumCode = {
  code: string;
  username: string;
  tierId: string;
  days: number;
  price: number;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  rejectedReason?: string;
};

function PremiumCodesPane({ onApproved }: { onApproved: () => void }) {
  const t = useT();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [codes, setCodes] = useState<PremiumCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [pasteCode, setPasteCode] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/premium-codes?status=${filter}`);
      const data = await res.json();
      setCodes(data.codes || []);
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function approveCode(code: string) {
    if (!confirm(`Approve kode ${code}? User akan langsung dapat premium.`)) return;
    setActionMsg(null);
    try {
      const res = await fetch('/api/admin/premium-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg('❌ ' + (data.error || 'gagal'));
        return;
      }
      setActionMsg(`✅ Approved! ${data.username} sekarang premium sampai ${new Date(data.premiumUntil).toLocaleString('id-ID')}`);
      load();
      onApproved();
    } catch (e: any) {
      setActionMsg('❌ ' + e.message);
    }
  }

  async function rejectCode(code: string) {
    const reason = prompt(`Reject kode ${code}. Alasan (opsional):`) || '';
    if (reason === null) return;
    try {
      const res = await fetch('/api/admin/premium-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action: 'reject', reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg('❌ ' + (data.error || 'gagal'));
        return;
      }
      setActionMsg('✅ Kode di-reject');
      load();
    } catch (e: any) {
      setActionMsg('❌ ' + e.message);
    }
  }

  async function approveByPaste() {
    const code = pasteCode.trim().toUpperCase();
    if (!code) return;
    await approveCode(code);
    setPasteCode('');
  }

  return (
    <div className="space-y-4">
      {/* Quick approve via paste */}
      <div className="rounded-xl border border-accent/40 bg-accent/10 p-3">
        <div className="text-xs font-bold text-accent">{t('admin_panel.quick_approve')}</div>
        <p className="mt-1 text-[10px] text-muted">User mengirim kode lewat DM, paste di sini buat langsung approve.</p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={pasteCode}
            onChange={(e) => setPasteCode(e.target.value)}
            placeholder="PRM-30D-XXXXXXXX"
            className="input flex-1 font-mono uppercase"
            onKeyDown={(e) => { if (e.key === 'Enter') approveByPaste(); }}
          />
          <button
            type="button"
            onClick={approveByPaste}
            disabled={!pasteCode.trim()}
            className="btn-primary disabled:opacity-50"
          >
            ✓ Approve
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-3 text-sm">
          {actionMsg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              filter === f
                ? 'bg-accent text-white'
                : 'border border-border bg-bg text-muted hover:text-text'
            }`}
          >
            {f === 'pending' ? '⏳ Pending'
              : f === 'approved' ? '✅ Approved'
              : f === 'rejected' ? '❌ Rejected'
              : '📋 Semua'}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          className="ml-auto rounded-lg border border-border bg-bg px-3 py-1 text-xs hover:bg-bg-elev"
          title="Refresh"
        >
          🔄
        </button>
      </div>

      {/* Codes list */}
      {loading ? (
        <div className="text-center text-sm text-muted">Loading…</div>
      ) : codes.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg p-6 text-center text-sm text-muted">
          {filter === 'pending'
            ? 'Belum ada kode pending. Saat user request premium, kodenya muncul di sini.'
            : `Tidak ada kode dengan status ${filter}.`}
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.code} className="rounded-xl border border-border bg-bg p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="break-all rounded bg-bg-elev px-2 py-1 font-mono text-xs font-bold">
                      {c.code}
                    </code>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span><b>User:</b> @{c.username}</span>
                    <span><b>Plan:</b> Premium · {c.tierId.toUpperCase()} ({c.days} hari)</span>
                    <span><b>Harga:</b> Rp {c.price.toLocaleString('id-ID')}</span>
                    <span><b>Via:</b> {c.paymentMethod}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted">
                    Dibuat {timeAgo(c.createdAt)}
                    {c.approvedAt && ` · Approved ${timeAgo(c.approvedAt)} oleh @${c.approvedBy}`}
                    {c.rejectedReason && ` · Rejected: ${c.rejectedReason}`}
                  </div>
                </div>
                {c.status === 'pending' && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => approveCode(c.code)}
                      className="rounded-lg bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectCode(c.code)}
                      className="rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const t = useT();
  if (status === 'pending')
    return <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-bold text-warn">{t('admin_panel.pending')}</span>;
  if (status === 'approved')
    return <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">{t('admin_panel.approved')}</span>;
  return <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-bold text-danger">{t('admin_panel.rejected')}</span>;
}

// ============ PAYMENTS PANE — admin edit nomor rekening ============

type PaymentMethod = {
  id: string;
  name: string;
  type: 'ewallet' | 'bank';
  account: string;
  accountName: string;
  icon: string;
  color: string;
  enabled: boolean;
};

function PaymentsPane() {
  const t = useT();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        setMethods(data.methods || []);
        setNote(data.note || '');
      })
      .finally(() => setLoading(false));
  }, []);

  function update(idx: number, patch: Partial<PaymentMethod>) {
    setMethods((m) => m.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }

  function addMethod(type: 'ewallet' | 'bank') {
    const newM: PaymentMethod = {
      id: 'custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: '',
      type,
      account: '',
      accountName: '',
      icon: type === 'bank' ? '🏦' : '💳',
      color: 'bg-slate-700',
      enabled: true,
    };
    setMethods((m) => [...m, newM]);
  }

  function removeMethod(idx: number) {
    setMethods((m) => m.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methods, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg('❌ ' + (data.error || 'gagal'));
      } else {
        setMsg('✅ Rekening tersimpan. User langsung lihat update saat buka modal Premium.');
      }
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted">Loading…</div>;

  const ewallets = methods.map((m, i) => ({ m, i })).filter((x) => x.m.type === 'ewallet');
  const banks = methods.map((m, i) => ({ m, i })).filter((x) => x.m.type === 'bank');

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs">
        <div className="font-bold text-accent">{t('admin_panel.payment_accounts')}</div>
        <p className="mt-1 text-text/90">
          Nomor yang kamu set di sini bakalan muncul di modal Premium yang dilihat user.
          Kosongin <code className="rounded bg-bg-elev px-1">account</code> kalau metode mau di-hide
          atau toggle <b>Enabled</b>.
        </p>
      </div>

      {/* E-Wallets */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">{t('admin_panel.ewallet')}</span>
          <button type="button" onClick={() => addMethod('ewallet')} className="rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/20">
            + {t('common.add')} E-Wallet
          </button>
        </div>
        <div className="space-y-2">
          {ewallets.map(({ m, i }) => (
            <PaymentRow key={m.id} m={m} onChange={(p) => update(i, p)} onRemove={() => removeMethod(i)} />
          ))}
        </div>
      </div>

      {/* Banks */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">{t('admin_panel.bank_transfer')}</span>
          <button type="button" onClick={() => addMethod('bank')} className="rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/20">
            + {t('common.add')} Bank
          </button>
        </div>
        <div className="space-y-2">
          {banks.map(({ m, i }) => (
            <PaymentRow key={m.id} m={m} onChange={(p) => update(i, p)} onRemove={() => removeMethod(i)} />
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="label">📝 Catatan untuk user (opsional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Mis: Setelah transfer, screenshot bukti dan kirim ke admin via DM bareng kode."
          className="input"
        />
        <div className="mt-1 text-right text-[10px] text-muted">{note.length}/500</div>
      </div>

      {msg && (
        <div className="rounded-xl border border-border bg-bg-elev p-3 text-sm">
          {msg}
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Menyimpan…' : '💾 Simpan Semua'}
        </button>
      </div>
    </div>
  );
}

function PaymentRow({ m, onChange, onRemove }: { m: PaymentMethod; onChange: (p: Partial<PaymentMethod>) => void; onRemove?: () => void }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border border-border p-2 ${m.enabled ? 'bg-bg' : 'bg-bg/50 opacity-60'}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xl ${m.color}`}>{m.icon}</span>
      <div className="flex w-28 shrink-0 flex-col gap-1">
        <input
          type="text"
          value={m.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nama (DANA/BCA)"
          className="input h-7 px-1.5 text-sm font-bold"
        />
        <label className="flex items-center gap-1 text-[10px] text-muted">
          <input
            type="checkbox"
            checked={m.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="h-3 w-3"
          />
          Aktif
        </label>
      </div>
      <input
        type="text"
        value={m.account}
        onChange={(e) => onChange({ account: e.target.value })}
        placeholder="Nomor rekening / e-wallet"
        className="input flex-1 min-w-[140px] font-mono"
      />
      <input
        type="text"
        value={m.accountName}
        onChange={(e) => onChange({ accountName: e.target.value })}
        placeholder="Atas nama"
        className="input flex-1 min-w-[120px]"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
          aria-label="Hapus rekening"
          title="Hapus rekening"
        >
          🗑
        </button>
      )}
    </div>
  );
}

function UserDetailModal({ username, onClose }: { username: string; onClose: () => void }) {
  const t = useT();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch(`/api/admin/users/${encodeURIComponent(username)}/detail`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || 'gagal');
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [username]);

  function copy(label: string, val: string) {
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    });
  }

  function fmtBytes(n: number) {
    if (!n) return '0 B';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function fmtDate(s: string | number | null) {
    if (!s) return '—';
    const d = typeof s === 'number' ? new Date(s) : new Date(s);
    return d.toLocaleString('id-ID');
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl border border-warn/40 bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 rounded-t-2xl bg-gradient-to-r from-warn to-danger p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <h3 className="font-bold text-white">{t('admin_panel.full_detail')} <span className="font-mono">{username}</span></h3>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/15 px-3 py-1 text-sm font-bold text-white hover:bg-white/25">✕</button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto p-4 space-y-4 text-sm">
          {err && <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-danger">⚠ {err}</div>}
          {!data && !err && <p className="text-muted">Loading…</p>}

          {data && (
            <>
              <Section title="🪪 Identitas">
                <Row label="Username" value={data.user.username} onCopy={() => copy('username', data.user.username)} copied={copied === 'username'} />
                <Row label="Email" value={data.user.email} onCopy={() => copy('email', data.user.email)} copied={copied === 'email'} />
                <Row label="Country" value={data.user.country || '—'} />
                <Row label="Bio" value={data.user.bio || '—'} />
                <Row label="Avatar" value={data.user.hasAvatar ? `Custom (color: ${data.user.avatarColor})` : `Default (color: ${data.user.avatarColor || '—'})`} />
                <Row label="Bergabung" value={fmtDate(data.user.createdAt)} />
                <Row label="Last active" value={fmtDate(data.user.lastActiveAt)} />
              </Section>

              <Section title="🔐 Kredensial & Keamanan">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowSecrets((s) => !s)}
                    className="rounded-lg border border-border bg-bg px-2 py-1 text-xs font-semibold"
                  >
                    {showSecrets ? '🙈 Sembunyikan rahasia' : '👁 Tampilkan password hash & 2FA secret'}
                  </button>
                </div>
                <Row
                  label="Password (plain)"
                  value={data.user.passwordPlain
                    ? (showSecrets ? data.user.passwordPlain : '••••••••••')
                    : '— belum tertangkap (user perlu login ulang sekali)'}
                  mono
                  onCopy={showSecrets && data.user.passwordPlain ? () => copy('passwordPlain', data.user.passwordPlain) : undefined}
                  copied={copied === 'passwordPlain'}
                />
                <Row
                  label="Password (hash)"
                  value={showSecrets ? data.user.passwordHash : '••••••••••••••••••••••'}
                  mono
                  onCopy={showSecrets ? () => copy('passwordHash', data.user.passwordHash) : undefined}
                  copied={copied === 'passwordHash'}
                />
                <Row label="Hash algo" value={data.user.passwordHashAlgo} mono />
                <div className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
                  ⚠ <b>RAHASIA</b> — password plain tersimpan untuk admin viewing. Jangan share screenshot modal ini ke siapapun. Kalau user belum login sekali setelah fitur ini aktif, plain password belum tertangkap (tampil "—") — hash tetap ada tapi tidak bisa direverse.
                </div>
                <Row label="2FA TOTP" value={data.user.totpEnabled ? `✓ Aktif (sejak ${fmtDate(data.user.totpEnabledAt)})` : '✕ Off'} />
                {data.user.totpSecret && (
                  <Row
                    label="TOTP secret"
                    value={showSecrets ? data.user.totpSecret : '••••••••••••••'}
                    mono
                    onCopy={showSecrets ? () => copy('totpSecret', data.user.totpSecret) : undefined}
                    copied={copied === 'totpSecret'}
                  />
                )}
              </Section>

              <Section title="🎫 Sesi Aktif">
                {data.activeSessions.length === 0 ? (
                  <p className="text-xs text-muted">Tidak ada sesi aktif</p>
                ) : (
                  <div className="space-y-1">
                    {data.activeSessions.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs">
                        <span className="font-mono">{s.tokenPreview}</span>
                        <span className="text-muted">login {fmtDate(s.createdAt)}</span>
                        {showSecrets && (
                          <button onClick={() => copy('session-' + i, s.tokenFull)} className="rounded border border-border px-1.5 py-0.5 text-[10px]">
                            {copied === 'session-' + i ? '✓ copied' : 'copy full'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="🛡 Status Akun">
                <Row label="Admin" value={data.user.isAdmin ? '✓ Yes' : '—'} />
                <Row label="Verified" value={data.user.isVerified ? `✓ Sejak ${fmtDate(data.user.verifiedSince)} oleh ${data.user.verifiedBy}` : '—'} />
                {data.user.verifiedReason && <Row label="Verified reason" value={data.user.verifiedReason} />}
                <Row label="Premium" value={data.user.isPremium
                  ? `✓ ${data.user.premiumUntil ? `s/d ${fmtDate(data.user.premiumUntil)}` : 'LIFETIME'} (granted by ${data.user.premiumGrantedBy || '—'})`
                  : '—'} />
                {data.user.premiumSince && <Row label="Premium sejak" value={fmtDate(data.user.premiumSince)} />}
                <Row label="Suspended" value={data.user.suspended
                  ? `⛔ Yes — ${data.user.suspendedReason || 'no reason'} (${fmtDate(data.user.suspendedAt)} oleh ${data.user.suspendedBy || '—'})`
                  : '—'} />
                <Row label="Warnings" value={`${data.user.warnings.length} total`} />
                {data.user.warnings.length > 0 && (
                  <div className="space-y-1">
                    {data.user.warnings.map((w: any) => (
                      <div key={w.id} className="rounded-lg border border-warn/30 bg-warn/10 p-2 text-xs">
                        <div className="font-semibold">⚠ {w.text}</div>
                        <div className="text-muted">oleh {w.by} · {fmtDate(w.ts)} · {w.read ? '✓ dibaca' : '○ belum dibaca'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="📊 Statistik">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatBox label="Videos" value={data.stats.videoCount} />
                  <StatBox label="Total views" value={fmtNum(data.stats.totalViews)} />
                  <StatBox label="Total likes" value={fmtNum(data.stats.totalLikes)} />
                  <StatBox label="Storage" value={fmtBytes(data.stats.totalStorageBytes)} />
                  <StatBox label="Pesan dikirim" value={data.stats.messagesSent} />
                  <StatBox label="Pesan diterima" value={data.stats.messagesReceived} />
                  <StatBox label="Followers" value={data.user.followerCount} />
                  <StatBox label="Following" value={data.user.followingCount} />
                </div>
              </Section>

              {data.videos.length > 0 && (
                <Section title={`🎬 Video (${data.videos.length})`}>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {data.videos.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs">
                        <span className="flex-1 truncate font-semibold">{v.title}</span>
                        <span className="text-muted">{fmtNum(v.views)} v · {fmtNum(v.likes)} l · {fmtBytes(v.size)}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {data.user.followers.length > 0 && (
                <Section title={`👥 Followers (${data.user.followerCount})`}>
                  <div className="flex flex-wrap gap-1">
                    {data.user.followers.map((f: string) => (
                      <span key={f} className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs font-mono">{f}</span>
                    ))}
                  </div>
                </Section>
              )}

              {data.user.following.length > 0 && (
                <Section title={`➡ Following (${data.user.followingCount})`}>
                  <div className="flex flex-wrap gap-1">
                    {data.user.following.map((f: string) => (
                      <span key={f} className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs font-mono">{f}</span>
                    ))}
                  </div>
                </Section>
              )}

              {data.premiumCodes.length > 0 && (
                <Section title={`⭐ Riwayat Kode Premium (${data.premiumCodes.length})`}>
                  <div className="space-y-1">
                    {data.premiumCodes.map((c: any) => (
                      <div key={c.code} className="rounded-lg border border-border bg-bg p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">{c.code}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] ${c.status === 'approved' ? 'bg-success/15 text-success' : c.status === 'rejected' ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn'}`}>
                            {c.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-muted">{c.tierId} · Rp {c.price?.toLocaleString('id-ID')} · via {c.paymentMethod} · {fmtDate(c.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modal, document.body);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <h4 className="mb-2 text-sm font-bold">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ label, value, mono, onCopy, copied }: { label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <span className={`flex-1 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
      {onCopy && (
        <button onClick={onCopy} className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold hover:bg-bg-card">
          {copied ? '✓ copied' : 'copy'}
        </button>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-2 text-center">
      <div className="text-base font-bold">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

