'use client';
import { useState } from 'react';

const FAQ_ITEMS = [
  {
    q: 'Apakah benar-benar gratis?',
    a: 'Iya. Plan Free unlimited selamanya — kamu bisa upload sampai 15 video per 24 jam, durasi 10 menit, file 500 MB. Premium opsional kalau butuh durasi/ukuran lebih besar.',
  },
  {
    q: 'Apa bedanya Free dan Premium?',
    a: 'Free: 500 MB per file, 10 menit, 15 video/24jam, total storage 500 MB. Premium: 10 GB per file, durasi unlimited, video unlimited, storage unlimited. Premium ngasih kebebasan untuk creator yang butuh upload video panjang atau resolusi tinggi.',
  },
  {
    q: 'Aman tidak?',
    a: 'Aman. Kami pakai 2FA (Two-Factor Authentication) opsional via Google Authenticator/Authy, rate limit anti brute-force (3x salah → block 30 detik), captcha SVG anti-bot saat daftar. Password disimpan dalam bentuk hash SHA-256, bukan plain text.',
  },
  {
    q: 'Bisa download video orang lain?',
    a: 'Bisa. Setiap video punya tombol Download yang bisa dipakai siapa saja. Creator juga bisa share link nonton fokus (mode immersive) yang mempermudah viewer.',
  },
  {
    q: 'Apa yang dimaksud "real-time announcement"?',
    a: 'Admin bisa kirim pengumuman atau peringatan ke seluruh user. Modal akan otomatis muncul di tengah layar user (polling 10 detik) — tidak perlu refresh manual.',
  },
];

export function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((it, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-bg-card">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between p-4 text-left font-semibold hover:bg-bg-elev"
          >
            <span>{it.q}</span>
            <span className={`text-accent text-xl transition ${open === i ? 'rotate-45' : ''}`}>+</span>
          </button>
          {open === i && (
            <div className="border-t border-border p-4 text-sm leading-relaxed text-muted">
              {it.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
