'use client';
import { avatarUrl } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export function Avatar({
  username,
  hasAvatar,
  color = '#8b5cf6',
  size = 36,
  // Bump untuk paksa reload gambar (mis. setelah ganti foto)
  version,
}: {
  username: string;
  hasAvatar?: boolean;
  color?: string;
  size?: number;
  version?: number | string;
}) {
  const [errored, setErrored] = useState(false);
  // Reset error state kalau target avatar berubah (ganti user / ganti foto)
  // — tanpa ini, sekali img gagal load → fallback nyangkut selamanya.
  useEffect(() => { setErrored(false); }, [username, hasAvatar, version]);

  const initial = (username || '?').slice(0, 1).toUpperCase();
  if (hasAvatar && !errored) {
    return (
      <img
        src={avatarUrl(username) + (version != null ? `&v=${version}` : '')}
        alt={username}
        width={size}
        height={size}
        onError={() => setErrored(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
