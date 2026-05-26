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

  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      role="switch"
      aria-checked={isDark}
      className={`relative inline-flex h-7 w-14 items-center rounded-full border border-border bg-bg-elev transition hover:border-accent ${className}`}
    >
      <span
        aria-hidden
        className={`absolute left-1.5 text-[11px] leading-none transition-opacity ${
          isDark ? 'opacity-50' : 'opacity-0'
        }`}
      >
        ☀
      </span>
      <span
        aria-hidden
        className={`absolute right-1.5 text-[11px] leading-none transition-opacity ${
          isDark ? 'opacity-0' : 'opacity-50'
        }`}
      >
        ☾
      </span>
      <span
        className={`grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] text-slate-800 shadow-md transition-transform duration-200 ${
          isDark ? 'translate-x-8' : 'translate-x-1'
        }`}
      >
        {isDark ? '☾' : '☀'}
      </span>
    </button>
  );
}
