'use client';
import Link from 'next/link';
import { useMe } from '@/components/UserContext';
import { AdminTools } from '@/components/AdminTools';

const SECTIONS = [
  { href: '/admin/overview',      icon: '📊', label: 'Overview',       desc: 'Stats umum + user baru hari ini + online' },
  { href: '/admin/users',         icon: '👥', label: 'Users',          desc: 'Manage user — suspend, warn, grant premium' },
  { href: '/admin/premium-codes', icon: '⭐', label: 'Premium Codes',  desc: 'Approve / reject kode pembayaran premium' },
  { href: '/admin/rekening',      icon: '🏦', label: 'Rekening',       desc: 'Atur nomor rekening pembayaran (DANA, BCA, dll)' },
  { href: '/admin/top',           icon: '🏆', label: 'Top',            desc: 'Top creators by views / likes / videos / followers' },
  { href: '/admin/activity',      icon: '⚡', label: 'Activity',       desc: 'Recent activity dari semua user' },
  { href: '/admin/announce',      icon: '📢', label: 'Announce',       desc: 'Set pengumuman global ke semua user' },
  { href: '/admin/banner',        icon: '🖼', label: 'Banner',         desc: 'Edit banner running text + image upload' },
  { href: '/admin/ads',           icon: '📺', label: 'Iklan',          desc: 'Setup iklan global — muncul otomatis di video user dengan tombol skip' },
  { href: '/admin/tools',         icon: '🛠', label: 'Tools',          desc: 'Generate image, player layers, send to discord, daily report' },
];

export default function AdminHomePage() {
  const { me, loading } = useMe();

  if (loading) return <div className="grid h-64 place-items-center text-muted">Loading…</div>;
  if (!me) return <div className="grid h-64 place-items-center text-muted">Login dulu</div>;
  if (!me.isAdmin) {
    return (
      <div className="card border-danger/40 text-center">
        <div className="text-3xl">🔒</div>
        <h2 className="mt-2 text-lg font-bold">Akses Ditolak</h2>
        <p className="mt-1 text-sm text-muted">
          Halaman ini cuma untuk admin. Kalau kamu butuh akses, hubungi admin via DM.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">🛡 Admin Tools</h1>
        <p className="mt-1 text-sm text-muted">
          Pilih section yang mau kamu kelola. Tiap section juga bisa di-akses langsung dari sidebar kiri.
        </p>
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
