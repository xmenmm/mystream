'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from './UserContext';
import { useT } from '@/lib/i18n';

type NavItem = { href: string; icon: string; tKey: string; fallback: string };

const userItems: NavItem[] = [
  { href: '/dashboard', icon: '⊞', tKey: 'nav.dashboard',     fallback: 'Dashboard' },
  { href: '/history',   icon: '🖼', tKey: 'nav.history',       fallback: 'History' },
  { href: '/friends',   icon: '👥', tKey: 'nav.friends',       fallback: 'Pengikut' },
  { href: '/messages',  icon: '💬', tKey: 'nav.messages',      fallback: 'Messages' },
  { href: '/profile',   icon: '👤', tKey: 'nav.profile',       fallback: 'Profile' },
  { href: '/settings',  icon: '⚙', tKey: 'nav.settings',      fallback: 'Settings' },
];

const adminItems: NavItem[] = [
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
];

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

  return (
    <>
      {/* Desktop sidebar — gaya SciFi: full-width, section grup, label lengkap */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col overflow-y-auto border-r border-border bg-gradient-to-b from-bg-card to-bg md:flex">
        {/* Logo header */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-[18px]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-grad-accent text-lg font-extrabold text-white shadow-glow">M</span>
          <span className="bg-grad-accent bg-clip-text text-xl font-extrabold text-transparent">MyStream</span>
        </Link>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <p className="mb-2 mt-2 px-3 text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
            Menu
          </p>
          {userItems.map((it) => (
            <SidebarLink key={it.href} href={it.href} icon={it.icon} label={t(it.tKey) || it.fallback} active={isActiveFor(it.href, path)} />
          ))}

          {showAdmin && (
            <>
              <p className="mb-2 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[1.5px] text-warn">
                Admin
              </p>
              {adminItems.map((it) => (
                <SidebarLink
                  key={it.href}
                  href={it.href}
                  icon={it.icon}
                  label={t(it.tKey) || it.fallback}
                  active={isActiveFor(it.href, path)}
                  admin
                />
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around overflow-x-auto border-t border-border bg-bg-card px-2 backdrop-blur-md md:hidden">
        {userItems.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-label={t(it.tKey) || it.fallback}
            className={`grid h-10 flex-1 min-w-[40px] place-items-center rounded-xl text-lg transition ${
              isActiveFor(it.href, path)
                ? 'bg-grad-accent text-white shadow-glow'
                : 'text-muted'
            }`}
          >
            {it.icon}
          </Link>
        ))}
        {showAdmin && (
          <Link
            href="/admin"
            aria-label="Admin"
            className={`grid h-10 flex-1 min-w-[40px] place-items-center rounded-xl text-lg transition ${
              path?.startsWith('/admin')
                ? 'bg-gradient-to-r from-warn to-danger text-white shadow-glow'
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
  href, icon, label, active, admin,
}: { href: string; icon: string; label: string; active: boolean; admin?: boolean }) {
  return (
    <Link
      href={href}
      className={`relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? admin
            ? 'bg-gradient-to-r from-warn/25 to-warn/5 text-warn shadow-[inset_3px_0_0_var(--warn,#f59e0b)]'
            : 'bg-gradient-to-r from-accent/25 to-accent/5 text-text shadow-[inset_3px_0_0_rgb(var(--accent-rgb))]'
          : 'text-muted hover:bg-bg-elev hover:text-text'
      }`}
    >
      <span className="grid w-5 shrink-0 place-items-center text-base">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
