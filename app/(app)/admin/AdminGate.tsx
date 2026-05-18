'use client';
import Link from 'next/link';
import { ReactNode } from 'react';
import { useMe } from '@/components/UserContext';

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
  if (loading) return <div className="grid h-64 place-items-center text-muted">Loading…</div>;
  if (!me) return <div className="grid h-64 place-items-center text-muted">Login dulu</div>;
  if (!me.isAdmin) {
    return (
      <div className="card border-danger/40 text-center">
        <div className="text-3xl">🔒</div>
        <h2 className="mt-2 text-lg font-bold">Akses Ditolak</h2>
        <p className="mt-1 text-sm text-muted">Halaman ini cuma untuk admin.</p>
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
          ← Semua tools
        </Link>
      </header>
      {children}
    </div>
  );
}
