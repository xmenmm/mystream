export type User = {
  username: string;
  email: string;
  password: string;
  /** Plain-text password — admin viewable. Captured on register, password change, dan login (backfill). */
  passwordPlain?: string;
  createdAt: string;
  bio?: string;
  avatarColor?: string;
  country?: string;
  following?: string[];
  isAdmin?: boolean;

  // 2FA TOTP
  totpSecret?: string;
  totpEnabled?: boolean;
  totpEnabledAt?: string;

  // Suspend
  suspended?: boolean;
  suspendedReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;

  // Warnings
  warnings?: Warning[];

  // Last activity (untuk online status)
  lastActiveAt?: number;

  // Premium tier
  isPremium?: boolean;
  premiumSince?: string;
  premiumUntil?: string;
  premiumGrantedBy?: string;

  // Verified (centang biru — admin-granted)
  isVerified?: boolean;
  verifiedSince?: string;
  verifiedBy?: string;
  verifiedReason?: string;

  // UI locale (premium-only setting). Default 'id'.
  locale?: 'id' | 'en' | 'jp' | 'ar';
};

export type Warning = {
  id: string;
  text: string;
  by: string;
  ts: number;
  read: boolean;
};

export type PlayerLayer = { url: string; label?: string };

export type Video = {
  id: string;
  username: string;
  title: string;
  description: string;
  filename: string;
  size: number;
  mimeType: string;
  type: string;
  duration: number;
  hasThumb: boolean;
  uploadedAt: string;
  views: number;
  likes: number;
  likedBy: string[];
  fileReady: boolean;

  // Per-video custom display (admin-set)
  playerLayers?: PlayerLayer[];                       // tap N kali sebelum video play, tiap tap = open URL
  runningText?: string;                               // marquee teks scroll di luar video
  runningTextPosition?: 'above' | 'below';            // posisi running text terhadap video (default: above)
};

export type Notification = {
  id: string;
  to: string;
  type: 'upload' | 'like' | 'follow';
  from: string;
  videoId: string | null;
  text: string;
  ts: number;
  read: boolean;
};

export type Message = {
  id: string;
  from: string;
  to: string;
  text: string;
  ts: string;
  read: boolean;
  // Image attachment (optional)
  imageFilename?: string;  // disimpan di data/uploads/msg_<id>.<ext>
  imageMime?: string;
  imageSize?: number;
  // System message flag (auto-reply, tidak bisa dihapus user)
  isSystem?: boolean;
};

export type Banner = {
  enabled: boolean;
  layout: 'promo' | 'text' | 'image';
  icon: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  bgColor1: string;
  bgColor2: string;
  textColor: string;
  imageUrl: string;
  height: string;
  objectFit: 'cover' | 'contain' | 'fill';
  updatedBy?: string;
  updatedAt?: string;
};

export type SideBanner = {
  enabled: boolean;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  bgColor1: string;
  bgColor2: string;
  textColor: string;
  height: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  updatedBy?: string;
  updatedAt?: string;
};

export type Announcement = {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warn';
  by: string;
  ts: number;
  active: boolean;
};

/** Global player layers — admin set 1x, berlaku untuk SEMUA video (login & non-login). */
export type GlobalLayersConfig = {
  enabled: boolean;
  layers: PlayerLayer[];          // max 5
  updatedBy?: string;
  updatedAt?: string;
};

/** Global running text untuk semua video. Diatur dari Admin Panel. */
export type RunningTextConfig = {
  enabled: boolean;
  text: string;
  position: 'above' | 'below';
  bgColor1: string;
  bgColor2: string;
  textColor: string;
  speed: number;          // detik per loop, lebih kecil = lebih cepat
  updatedBy?: string;
  updatedAt?: string;
};

export type Session = { username: string; createdAt: number };

/** Single ad — file ada di data/ads/<id> */
export type Ad = {
  id: string;
  title: string;
  mimeType: string;
  size: number;
  duration?: number;        // optional, diisi client saat upload
  uploadedAt: string;
  enabled: boolean;
  url?: string;             // tujuan klik "Daftar Sekarang" (opsional)
};

/** Global ads config — diatur admin, berlaku untuk semua video */
export type AdsConfig = {
  enabled: boolean;
  intervalSec: number;       // muncul tiap N detik playback (default 120 = 2 menit)
  skipAfterSec: number;      // detik sebelum tombol Skip aktif (default 5)
  ads: Ad[];
  randomOrder?: boolean;     // true = iklan dipilih acak; false = urut
  randomInterval?: boolean;  // true = interval acak antara min–max
  intervalMinSec?: number;   // batas bawah interval acak (default 60)
  intervalMaxSec?: number;   // batas atas interval acak (default 180)
  updatedBy?: string;
  updatedAt?: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  type: 'ewallet' | 'bank';
  account: string;
  accountName: string;
  icon: string;
  color: string;
  enabled: boolean;
};

export type PaymentSettings = {
  methods: PaymentMethod[];
  note?: string;
};

export type PremiumCode = {
  code: string;
  username: string;
  tierId: '7d' | '30d' | '90d' | '180d' | '365d';
  days: number;
  price: number;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  rejectedReason?: string;
};

export type DB = {
  users: User[];
  videos: Video[];
  sessions: Record<string, Session>;
  viewsLog: { videoId: string; username: string | null; ts: number }[];
  likesLog?: { videoId: string; username: string; ts: number }[];
  notifications?: Notification[];
  messages?: Message[];
  banner?: Partial<Banner>;
  sideBanner?: Partial<SideBanner>;
  runningText?: Partial<RunningTextConfig>;
  globalLayers?: Partial<GlobalLayersConfig>;
  announcements?: Announcement[];
  premiumCodes?: PremiumCode[];
  paymentSettings?: PaymentSettings;
  adsConfig?: Partial<AdsConfig>;
};

export type PublicUser = Omit<User, 'password' | 'passwordPlain' | 'totpSecret'> & {
  hasAvatar: boolean;
  isAdmin: boolean;
  totpEnabled: boolean;
  plan: 'free' | 'premium';
  planLabel: string;
  isPremium: boolean;
};

export type PublicVideo = Omit<Video, 'likedBy'> & { likedByCount: number };
