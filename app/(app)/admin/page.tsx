'use client';
import Link from 'next/link';
import { useMe } from '@/components/UserContext';
import { AdminTools } from '@/components/AdminTools';
import { useT } from '@/lib/i18n';

export default function AdminHomePage() {
  const { me, loading } = useMe();
  const t = useT();

  const SECTIONS = [
    { href: '/admin/overview',      icon: '📊', label: t('admin_page.overview_title'),        desc: t('admin_page.overview_desc') },
    { href: '/admin/users',         icon: '👥', label: t('admin_page.users_title'),           desc: t('admin_page.users_desc') },
    { href: '/admin/premium-codes', icon: '⭐', label: t('admin_page.premium_codes_title'),   desc: t('admin_page.premium_codes_desc') },
    { href: '/admin/rekening',      icon: '🏦', label: t('admin_page.rekening_title'),        desc: t('admin_page.rekening_desc') },
    { href: '/admin/top',           icon: '🏆', label: t('admin_page.top_title'),             desc: t('admin_page.top_desc') },
    { href: '/admin/activity',      icon: '⚡', label: t('admin_page.activity_title'),        desc: t('admin_page.activity_desc') },
    { href: '/admin/announce',      icon: '📢', label: t('admin_page.announce_title'),        desc: t('admin_page.announce_desc') },
    { href: '/admin/banner',        icon: '🖼', label: t('admin_page.banner_title'),          desc: t('admin_page.banner_desc') },
    { href: '/admin/ads',           icon: '📺', label: t('admin_page.ads_title'),             desc: t('admin_page.ads_desc') },
    { href: '/admin/tools',         icon: '🛠', label: t('admin_page.tools_title'),           desc: t('admin_page.tools_desc') },
  ];

  if (loading) return <div className="grid h-64 place-items-center text-muted">{t('admin_gate.loading')}</div>;
  if (!me) return <div className="grid h-64 place-items-center text-muted">{t('admin_gate.login_first')}</div>;
  if (!me.isAdmin) {
    return (
      <div className="card border-danger/40 text-center">
        <div className="text-3xl">🔒</div>
        <h2 className="mt-2 text-lg font-bold">{t('admin_gate.access_denied')}</h2>
        <p className="mt-1 text-sm text-muted">
          {t('admin_gate.admin_only')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">🛡 {t('admin.tools')}</h1>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card group flex items-start gap-3 transition hover:-translate-y-0.5 hover:border-warn/60"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-warn to-danger text-2xl">
              {s.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 font-bold">
                {s.label}
                <span className="text-muted transition group-hover:translate-x-1">→</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
