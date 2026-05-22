'use client';
import { useState } from 'react';

const HELP_ITEMS = [
  { q: '🚀 Cara daftar & login', a: ['Klik tombol Login/Daftar di kanan atas.', 'Daftar gratis: cuma butuh username (min 3), email, & password (min 6) + isi captcha anti-bot.', 'Sesi tersimpan otomatis di browser.'] },
  { q: '🎬 Cara upload video', a: ['Klik tombol "+ Upload Video" di header.', 'Free: max 500 MB, durasi 10 menit, 15 video/24jam, total storage 500 MB.', 'Premium: ukuran file unlimited, durasi unlimited, unlimited video.', 'Thumbnail otomatis di-generate dari frame tengah video.'] },
  { q: '👤 Edit profile', a: ['Buka halaman Profile dari sidebar.', 'Upload foto avatar (max 10 MB).', 'Edit bio, country, warna avatar default.'] },
  { q: '👥 Cari teman', a: ['Buka halaman Friends.', 'Ketik username minimal 2 karakter di search bar atas.', 'Klik Follow di hasil pencarian.'] },
  { q: '💬 Kirim pesan', a: ['Buka Messages atau klik tombol Message di profile user.', 'Kalau belum saling follow, masuk ke Requests dulu.'] },
  { q: '🔐 2FA (Two-Factor Authentication)', a: ['Buka Settings → Two-Factor Authentication.', 'Scan QR code atau salin secret ke aplikasi authenticator (Google Auth, Authy).', 'Verifikasi dengan kode 6-digit.', 'Setelah aktif, login butuh kode dari authenticator.'] },
  { q: '⭐ Premium', a: ['Free: 500 MB per file, 10 menit, 15 video/24jam.', 'Premium: ukuran file unlimited, durasi unlimited, video unlimited.', 'Hubungi admin untuk upgrade.'] },
  { q: '🌙 Tema dark / light', a: ['Toggle ada di sidebar paling atas (☀ / ☾).', 'Pilihan tersimpan di browser.'] },
];

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [search, setSearch] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const filtered = HELP_ITEMS.filter(
    (it) => !search || (it.q + ' ' + it.a.join(' ')).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[9000] flex flex-col items-end gap-2 md:bottom-5 sm:bottom-20">
        {!open && !tipDismissed && (
          <div
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-xl bg-grad-accent px-3 py-2 text-xs font-bold text-white shadow-lg animate-pulse"
            style={{ maxWidth: 220 }}
          >
            Klik di sini jika butuh bantuan
            <button
              onClick={(e) => { e.stopPropagation(); setTipDismissed(true); }}
              className="ml-2 rounded-full bg-white px-1.5 text-xs text-accent"
              aria-label="Tutup tip"
            >
              ×
            </button>
          </div>
        )}
        <button
          onClick={() => { setOpen(!open); setTipDismissed(true); }}
          aria-label="Bantuan"
          className="grid h-14 w-14 place-items-center rounded-full bg-grad-accent text-white shadow-2xl transition hover:scale-110"
        >
          <div className="flex flex-col gap-1">
            <span className="block h-0.5 w-6 bg-white rounded" style={{ transform: open ? 'translateY(6px) rotate(45deg)' : '' }} />
            <span className="block h-0.5 w-6 bg-white rounded" style={{ opacity: open ? 0 : 1 }} />
            <span className="block h-0.5 w-6 bg-white rounded" style={{ transform: open ? 'translateY(-6px) rotate(-45deg)' : '' }} />
          </div>
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-[8999] bg-black/55 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed bottom-24 right-5 z-[9001] flex w-[420px] max-w-[calc(100vw-2.5rem)] max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center gap-3 bg-grad-accent p-4 text-white">
              <span className="text-xl">❓</span>
              <div className="flex-1">
                <h3 className="font-bold">Pusat Bantuan MyStream</h3>
                <div className="text-xs opacity-85">Panduan lengkap fitur web</div>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-white">×</button>
            </div>
            <div className="space-y-2 border-b border-border p-3">
              <button
                onClick={() => {
                  localStorage.removeItem('mystream_panduan_dismissed');
                  window.dispatchEvent(new Event('mystream:show-panduan'));
                  setOpen(false);
                }}
                className="w-full rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/20"
              >
                📖 Tampilkan panduan lengkap
              </button>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Cari panduan singkat..."
                className="input"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.map((it, i) => (
                <div key={i} className="mb-2 overflow-hidden rounded-xl border border-border">
                  <button
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    className="flex w-full items-center justify-between p-3 text-left text-sm font-semibold hover:bg-bg-elev"
                  >
                    <span>{it.q}</span>
                    <span className={`text-xs opacity-50 transition ${openIdx === i ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {openIdx === i && (
                    <ul className="space-y-1 px-4 pb-3 pt-0 text-xs text-muted">
                      {it.a.map((line, j) => <li key={j}>• {line}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3 text-center text-xs text-muted">
              © MyStream · {new Date().getFullYear()}
            </div>
          </div>
        </>
      )}
    </>
  );
}
