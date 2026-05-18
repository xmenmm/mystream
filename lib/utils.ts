export function fmtNum(n: number): string {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return '' + n;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export function fmtDuration(s: number): string {
  if (!s || !isFinite(s)) return '';
  s = Math.floor(s);
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

export function timeAgo(iso: string | number): string {
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso;
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
  return Math.floor(s / 2592000) + 'mo ago';
}

export const COUNTRIES = [
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: 'CN', flag: '🇨🇳', name: 'China' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria' },
];

export function countryDisplay(code?: string): string {
  if (!code) return '—';
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? `${c.flag} ${c.name}` : code;
}

/** Build public user shape (avatar flag etc.) from a User row. */
export function publicUserShape(
  u: { username: string; email: string; bio?: string; avatarColor?: string; country?: string; createdAt: string; isAdmin?: boolean },
  hasAvatar: boolean,
) {
  return {
    username: u.username,
    email: u.email,
    bio: u.bio || '',
    avatarColor: u.avatarColor || '#8b5cf6',
    country: u.country || '',
    createdAt: u.createdAt,
    hasAvatar,
    isAdmin: !!u.isAdmin,
  };
}
