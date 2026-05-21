'use client';
import Link from 'next/link';
import { ReactNode } from 'react';
import { useMe } from '@/components/UserContext';
import { useT } from '@/lib/i18n';

export function AdminGate({
  title,
  icon,
  desc,
  children,
}: {
  title: string;
  icon: string;
  desc?: string;
  children: ReactNode;
}) {
  const { me, loading } = useMe();
  const t = useT();
  if (loading) return <div className="grid h-64 place-items-center text-muted">{t('admin_gate.loading')}</div>;
  if (!me) return <div className="grid h-64 place-items-center text-muted">{t('admin_gate.login_first')}</div>;
  if (!me.isAdmin) {
    return (
      <div className="card border-danger/40 text-center">
        <div className="text-3xl">🔒</div>
        <h2 className="mt-2 text-lg font-bold">{t('admin_gate.access_denied')}</h2>
        <p className="mt-1 text-sm text-muted">{t('admin_gate.admin_only')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">
            {icon} {title}
          </h1>
          {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
        </div>
        <Link href="/admin" className="btn-ghost text-xs">
          {t('admin_gate.all_tools')}
        </Link>
      </header>
      {children}
    </div>
  );
}
