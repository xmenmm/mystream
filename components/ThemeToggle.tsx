'use client';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
const KEY = 'mystream_theme';

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', t === 'dark');
  root.classList.toggle('light', t === 'light');
  root.style.colorScheme = t;
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Theme | null);
    const initial: Theme = saved || 'dark';
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(KEY, next);
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`grid h-9 w-9 place-items-center rounded-xl border border-border bg-bg-elev text-base transition hover:border-accent ${className}`}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
