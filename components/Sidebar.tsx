'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMe } from './UserContext';
import { Avatar } from './Avatar';
import { useT } from '@/lib/i18n';
import { apiGetMyQuota } from '@/lib/api-client';
import { fmtBytes } from '@/lib/utils';

type NavItem = {
  href: string;
  icon: string;
  tKey: string;
  fallback: string;
  badge?: 'notif' | 'unread';
};

type Group = { label: string; items: NavItem[]; tone?: 'normal' | 'admin' };

const USER_GROUPS: Group[] = [
  {
    label: 'Utama',
    items: [
      { href: '/dashboard', icon: '⊞', tKey: 'nav.dashboard', fallback: 'Dashboard' },
      { href: '/history',   icon: '🖼', tKey: 'nav.history',   fallback: 'Riwayat' },
    ],
  },
  {
    label: 'Sosial',
    items: [
      { href: '/friends',       icon: '👥', tKey: 'nav.friends',  fallback: 'Pengikut' },
      { href: '/messages',      icon: '💬', tKey: 'nav.messages', fallback: 'Pesan' },
      { href: '/notifications', icon: '🔔', tKey: 'nav.notifications', fallback: 'Notifikasi', badge: 'notif' },
    ],
  },
  {
    label: 'Akun',
    items: [
      { href: '/profile',  icon: '👤', tKey: 'nav.profile',  fallback: 'Profile' },
      { href: '/settings', icon: '⚙', tKey: 'nav.settings', fallback: 'Pengaturan' },
    ],
  },
];

const ADMIN_GROUP: Group = {
  label: 'Admin',
  tone: 'admin',
  items: [
    { href: '/admin',               icon: '🛡', tKey: 'admin.home',          fallback: 'Admin Home' },
    { href: '/admin/overview',      icon: '📊', tKey: 'admin.overview',      fallback: 'Overview' },
    { href: '/admin/users',         icon: '👤', tKey: 'admin.users',         fallback: 'Users' },
    { href: '/admin/premium-codes', icon: '⭐', tKey: 'admin.premium_codes', fallback: 'Premium Codes' },
    { href: '/admin/rekening',      icon: '🏦', tKey: 'admin.rekening',      fallback: 'Rekening' },
    { href: '/admin/top',           icon: '🏆', tKey: 'admin.top',           fallback: 'Top' },
    { href: '/admin/activity',      icon: '⚡', tKey: 'admin.activity',      fallback: 'Activity' },
    { href: '/admin/announce',      icon: '📢', tKey: 'admin.announce',      fallback: 'Announce' },
    { href: '/admin/banner',        icon: '🎨', tKey: 'admin.banner',        fallback: 'Banner' },
    { href: '/admin/ads',           icon: '📺', tKey: 'admin.ads',           fallback: 'Iklan' },
    { href: '/admin/tools',         icon: '🛠', tKey: 'admin.tools',         fallback: 'Tools' },
  ],
};

function isActiveFor(href: string, path: string | null): boolean {
  if (!path) return false;
  if (href === '/dashboard') return path === '/' || path.startsWith('/dashboard');
  if (href === '/admin') return path === '/admin';
  return path.startsWith(href);
}

export function Sidebar() {
  const path = usePathname();
  const { me } = useMe();
  const t = useT();
  const showAdmin = !!me?.isAdmin;

  const [unreadNotif, setUnreadNotif] = useState(0);
  const [quota, setQuota] = useState<any>(null);

  useEffect(() => {
    if (!me) return;
    let cancel = false;
    const loadNotif = () => fetch('/api/notifications/unread/count')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => !cancel && d && setUnreadNotif(d.count || 0))
      .catch(() => {});
    const loadQuota = () => apiGetMyQuota().then((q) => !cancel && setQuota(q)).catch(() => {});
    loadNotif();
    loadQuota();
    const ti = setInterval(loadNotif, 20000);
    return () => { cancel = true; clearInterval(ti); };
  }, [me]);

  const groups = showAdmin ? [...USER_GROUPS, ADMIN_GROUP] : USER_GROUPS;

  // Storage display
  const storageUsed = quota?.storage?.usedLabel || '—';
  const storageLimit = quota?.storage?.unlimited ? 'unlimited' : (quota?.storage?.limitLabel || '—');
  const storagePct = quota?.storage?.unlimited ? 0 : (quota?.storage?.percent || 0);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-border bg-gradient-to-b from-bg-card to-bg md:flex">
        {/* Logo header */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-[18px]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-lg font-extrabold text-white">M</span>
          <span className="text-xl font-extrabold">MyStream</span>
        </Link>

        {/* Upload CTA */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('mystream:open-upload'))}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            <span>⬆</span>
            <span>Upload Video</span>
          </button>
        </div>

        {/* Menu groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <p
                className={`mb-1.5 mt-2 px-3 text-[10px] font-semibold uppercase tracking-[1.5px] ${
                  g.tone === 'admin' ? 'text-warn' : 'text-muted'
                }`}
              >
                {g.label}
              </p>
              {g.items.map((it) => (
                <SidebarLink
                  key={it.href}
                  href={it.href}
                  icon={it.icon}
                  label={t(it.tKey) || it.fallback}
                  active={isActiveFor(it.href, path)}
                  admin={g.tone === 'admin'}
                  badge={it.badge === 'notif' && unreadNotif > 0 ? (unreadNotif > 99 ? '99+' : String(unreadNotif)) : undefined}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom: Storage + User card */}
        <div className="shrink-0 border-t border-border bg-bg p-3 space-y-2.5">
          {/* Storage meter */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-muted">💾 Storage</span>
              <span className="font-bold">{storageUsed}<span className="text-muted"> / {storageLimit}</span></span>
            </div>
            {!quota?.storage?.unlimited && (
              <div className="h-1 overflow-hidden rounded-full bg-bg-elev">
                <div
                  className={`h-full rounded-full transition-all ${
                    storagePct > 80 ? 'bg-danger' : storagePct > 50 ? 'bg-warn' : 'bg-accent'
                  }`}
                  style={{ width: `${Math.min(100, storagePct)}%` }}
                />
              </div>
            )}
          </div>

          {/* User card */}
          {me && (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl border border-border bg-bg-card p-2 transition hover:border-accent"
            >
              <Avatar username={me.username} color={(me as any).avatarColor} hasAvatar={(me as any).hasAvatar} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-bold">@{me.username}</span>
                  {(me as any).isPremium && <span className="text-[9px]">⭐</span>}
                </div>
                <div className="text-[10px] text-muted">
                  {(me as any).isPremium ? 'Premium' : 'Free Plan'}
                </div>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav — kept simple */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around overflow-x-auto border-t border-border bg-bg-card px-2 backdrop-blur-md md:hidden">
        {USER_GROUPS.flatMap((g) => g.items).slice(0, 5).map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-label={t(it.tKey) || it.fallback}
            className={`relative grid h-10 flex-1 min-w-[40px] place-items-center rounded-xl text-lg transition ${
              isActiveFor(it.href, path)
                ? 'bg-accent text-white'
                : 'text-muted'
            }`}
          >
            {it.icon}
            {it.badge === 'notif' && unreadNotif > 0 && (
              <span className="absolute right-0 top-0 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                {unreadNotif > 9 ? '9+' : unreadNotif}
              </span>
            )}
          </Link>
        ))}
        {showAdmin && (
          <Link
            href="/admin"
            aria-label="Admin"
            className={`grid h-10 flex-1 min-w-[40px] place-items-center rounded-xl text-lg transition ${
              path?.startsWith('/admin')
                ? 'bg-gradient-to-r from-warn to-danger text-white'
                : 'text-warn'
            }`}
          >
            🛡
          </Link>
        )}
      </nav>
    </>
  );
}

function SidebarLink({
  href, icon, label, active, admin, badge,
}: { href: string; icon: string; label: string; active: boolean; admin?: boolean; badge?: string }) {
  return (
    <Link
      href={href}
      className={`relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? admin
            ? 'bg-gradient-to-r from-warn/25 to-warn/5 text-warn shadow-[inset_3px_0_0_var(--warn,#f59e0b)]'
            : 'bg-gradient-to-r from-accent/25 to-accent/5 text-text shadow-[inset_3px_0_0_rgb(var(--accent-rgb))]'
          : 'text-muted hover:bg-bg-elev hover:text-text'
      }`}
    >
      <span className="grid w-5 shrink-0 place-items-center text-base">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {badge && (
        <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
