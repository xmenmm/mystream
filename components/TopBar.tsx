'use client';
import Link from 'next/link';
import { useMe } from './UserContext';
import { Avatar } from './Avatar';
import { useState } from 'react';
import { UploadModal } from './UploadModal';
import { ThemeToggle } from './ThemeToggle';
import { SearchBar } from './SearchBar';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';

export function TopBar() {
  const { me, logout } = useMe();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-grad-accent text-white">M</span>
          <span className="hidden sm:inline">MyStream</span>
        </Link>
        {me && <span className="hidden text-sm text-muted md:inline">Hi {me.username} 👋</span>}
        <div className="ml-2 flex-1">
          <SearchBar />
        </div>
        <ThemeToggle />
        {me && <LanguageSwitcher />}
        {me && <NotificationBell />}
        {me ? (
          <>
            <button className="btn-primary hidden sm:inline-flex" onClick={() => setUploadOpen(true)}>
              + Upload Video
            </button>
            <button className="btn-primary inline-flex sm:hidden" onClick={() => setUploadOpen(true)} aria-label="Upload">
              +
            </button>
            <div className="relative">
              <button
                className="flex items-center gap-1 rounded-full p-1 hover:bg-bg-elev"
                onClick={() => setMenuOpen((s) => !s)}
              >
                <Avatar username={me.username} hasAvatar={me.hasAvatar} color={me.avatarColor} size={32} />
                <span className="text-xs text-muted">▾</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-12 w-56 rounded-xl border border-border bg-bg-card p-2 shadow-xl"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link href="/profile" className="block rounded-lg px-3 py-2 hover:bg-bg-elev">👤 My Profile</Link>
                  <Link href="/history" className="block rounded-lg px-3 py-2 hover:bg-bg-elev">🖼 My Uploads</Link>
                  <Link href="/settings" className="block rounded-lg px-3 py-2 hover:bg-bg-elev">⚙ Settings</Link>
                  <button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-danger hover:bg-bg-elev">
                    ⎋ Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link href="/login" className="btn-primary">Login</Link>
        )}
      </header>
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </>
  );
}
