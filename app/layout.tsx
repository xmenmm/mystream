import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyStream — Dashboard',
  description: 'MyStream — share your moments, watch creators, follow friends.',
};

// Inline script: apply theme class BEFORE React hydrates, so no flash of wrong theme.
const themeBootstrap = `(function(){try{var t=localStorage.getItem('mystream_theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.classList.toggle('light',t==='light');document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
