'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { UserProvider, useMe } from './UserContext';
import { GlobalEffects } from './GlobalEffects';
import { HelpWidget } from './HelpWidget';
import { OnboardingPanduan } from './OnboardingPanduan';

// Path yang boleh diakses tanpa login (public). /view udah di luar (app) group, ini buat path internal.
const PUBLIC_PATHS = ['/watch'];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function Inner({ children }: { children: ReactNode }) {
  const { me, loading } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);

  // Auto-redirect ke "/" kalau belum login DAN bukan path publik (mis. /watch)
  useEffect(() => {
    if (!loading && !me && !isPublic) {
      router.replace('/');
    }
  }, [loading, me, router, isPublic]);

  return (
    <div className="relative min-h-screen w-full">
      <div className="relative z-10">
        <Sidebar />
        <div className="w-full md:pl-60">
          <TopBar />
          <main className="w-full min-w-0 p-3 pb-20 sm:p-4 md:px-6 md:pb-6">
            {loading ? (
              <div className="grid h-64 place-items-center text-muted">Loading…</div>
            ) : me || isPublic ? (
              children
            ) : (
              <div className="grid h-64 place-items-center text-muted">Mengarahkan…</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <Inner>{children}</Inner>
      <GlobalEffects />
      <HelpWidget />
      <OnboardingPanduan />
    </UserProvider>
  );
}
