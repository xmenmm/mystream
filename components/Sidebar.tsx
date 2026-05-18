'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef } from 'react';
import { useMe } from './UserContext';
import { useT } from '@/lib/i18n';

type NavItem = { href: string; icon: string; tKey: string; fallback: string };

const userItems: NavItem[] = [
  { href: '/dashboard', icon: '⊞', tKey: 'nav.dashboard',     fallback: 'Dashboard' },
  { href: '/history',   icon: '🖼', tKey: 'nav.history',       fallback: 'History' },
  { href: '/friends',   icon: '👥', tKey: 'common.followers',  fallback: 'Friends' },
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
  const isAdminRoute = path?.startsWith('/admin');

  // Hover-flyout state for ADMIN section
  const [adminOpen, setAdminOpen] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  function openAdmin() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setAdminOpen(true);
  }
  function scheduleClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setAdminOpen(false), 150);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-16 flex-col items-center gap-2 overflow-y-auto overflow-x-visible border-r border-border bg-bg-card backdrop-blur-md py-4 md:flex">
        <Link
          href="/dashboard"
          className="mb-2 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-grad-accent text-lg font-bold text-white shadow-glow"
          aria-label="MyStream"
        >
          M
        </Link>
        {userItems.map((it) => (
          <SidebarLink key={it.href} item={it} label={t(it.tKey) || it.fallback} active={isActiveFor(it.href, path)} />
        ))}

        {showAdmin && (
          <div
            className="relative mt-1"
            onMouseEnter={openAdmin}
            onMouseLeave={scheduleClose}
          >
            <div className="mb-1 h-px w-8 mx-auto bg-warn/40" />
            {/* Trigger badge — clickable + hoverable */}
            <Link
              href="/admin"
              aria-label="Admin"
              className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition ${
                isAdminRoute
                  ? 'bg-gradient-to-br from-warn to-danger text-white shadow-glow'
                  : 'text-warn hover:bg-warn/15 hover:scale-105'
              }`}
            >
              🛡
              <span className="absolute -bottom-1 -right-1 rounded-full bg-warn px-1 py-0 text-[7px] font-extrabold leading-none text-white">
                {adminItems.length}
              </span>
            </Link>
            <div className="mt-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-warn">
              ADMIN ▸
            </div>

            {/* Flyout panel — drop down */}
            {adminOpen && (
              <div
                onMouseEnter={openAdmin}
                onMouseLeave={scheduleClose}
                className="absolute left-0 top-full z-50 mt-2 w-56 origin-top-left animate-fade-in-down rounded-2xl border-2 border-warn/40 bg-bg-card p-2 shadow-2xl backdrop-blur"
              >
                <div className="mb-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-warn">
                  🛡 Admin Tools ({adminItems.length})
                </div>
                <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
                  {adminItems.map((it) => {
                    const active = isActiveFor(it.href, path);
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? 'bg-gradient-to-r from-warn to-danger text-white shadow-glow'
                            : 'text-text hover:bg-warn/15 hover:text-warn'
                        }`}
                      >
                        <span className="text-lg">{it.icon}</span>
                        <span className="truncate">{t(it.tKey) || it.fallback}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
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

function SidebarLink({ item, label, active }: { item: NavItem; label: string; active: boolean; admin?: boolean }) {
  return (
    <Link
      href={item.href}
      title={label}
      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition ${
        active
          ? 'bg-grad-accent text-white shadow-glow'
          : 'text-muted hover:bg-bg-elev hover:text-white'
      }`}
    >
      {item.icon}
    </Link>
  );
}
