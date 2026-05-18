import { createHash, randomBytes, createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { loadDB, saveDB } from './db';
import { User } from './types';

export const SESSION_COOKIE = 'mystream_session';

export const hashPw = (pw: string) =>
  createHash('sha256').update(pw + 'mystream_salt_v1').digest('hex');

export const newToken = () => randomBytes(24).toString('hex');

export type AuthCtx = { token: string; user: User };

/** Read auth from incoming request: cookie first, then Authorization header.
    Sekaligus update lastActiveAt + reject suspended user. */
export async function getAuthFromRequest(req: NextRequest): Promise<AuthCtx | null> {
  const token =
    req.cookies.get(SESSION_COOKIE)?.value ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = await loadDB();
  const sess = db.sessions[token];
  if (!sess) return null;
  const user = db.users.find((u) => u.username === sess.username);
  if (!user) return null;
  // Suspended user → invalidate session
  if (user.suspended) {
    delete db.sessions[token];
    await saveDB(db);
    return null;
  }
  // Track last active (debounce 30s untuk hindari write storm)
  const now = Date.now();
  if (!user.lastActiveAt || now - user.lastActiveAt > 30000) {
    user.lastActiveAt = now;
    await saveDB(db);
  }
  return { token, user };
}

export async function getAuthFromCookies(): Promise<AuthCtx | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await loadDB();
  const sess = db.sessions[token];
  if (!sess) return null;
  const user = db.users.find((u) => u.username === sess.username);
  if (!user || user.suspended) return null;
  return { token, user };
}

// ===== Rate limit (login brute-force protection) =====
// 3 attempts → 30s lockout, window reset 15 menit
export const RL_MAX_ATTEMPTS = 3;
export const RL_LOCKOUT_MS = 30 * 1000;
export const RL_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>();

export function rateLimitCheck(key: string) {
  const now = Date.now();
  const e = loginAttempts.get(key);
  if (!e) return { allowed: true, retryAfter: 0 };
  if (e.lockedUntil > now) return { allowed: false, retryAfter: e.lockedUntil - now };
  if (now - e.firstAttempt > RL_WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true, retryAfter: 0 };
  }
  return { allowed: true, retryAfter: 0 };
}

export function rateLimitFail(key: string) {
  const now = Date.now();
  let e = loginAttempts.get(key);
  if (!e || now - e.firstAttempt > RL_WINDOW_MS) {
    e = { count: 1, firstAttempt: now, lockedUntil: 0 };
  } else {
    e.count++;
  }
  if (e.count >= RL_MAX_ATTEMPTS) {
    e.lockedUntil = now + RL_LOCKOUT_MS;
    e.count = 0;
  }
  loginAttempts.set(key, e);
  return e;
}

export function rateLimitClear(key: string) {
  loginAttempts.delete(key);
}

// ===== TOTP (RFC 6238) — self-hosted 2FA =====
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) { output += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  input = String(input || '').toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  const out: number[] = []; let bits = 0, value = 0;
  for (let i = 0; i < input.length; i++) {
    const idx = BASE32.indexOf(input[i]);
    if (idx < 0) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function generateTotpCode(secret: string, time = Date.now()): string {
  const counter = Math.floor(time / 30000);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) |
                (hmac[offset + 2] << 8) | hmac[offset + 3]) % 1_000_000;
  return String(code).padStart(6, '0');
}

export function verifyTotpCode(secret: string, code: string): boolean {
  if (!secret || !code) return false;
  const c = String(code).padStart(6, '0');
  for (let i = -1; i <= 1; i++) {
    if (generateTotpCode(secret, Date.now() + i * 30000) === c) return true;
  }
  return false;
}

// Pending 2FA tokens (di-keluarkan setelah password OK, valid 5 menit)
export const PENDING_2FA_MS = 5 * 60 * 1000;
export const pending2FA = new Map<string, { username: string; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [t, v] of pending2FA) if (v.expiresAt < now) pending2FA.delete(t);
}, 60 * 1000);

// ===== Premium plan =====
// Premium: 10 GB per file (real bisa upload 10 GB), unlimited durasi, unlimited video/hari.
// Free: 15 video / 24 jam (rolling), max 10 menit, max 500 MB per file, total storage 500 MB.
export const PLAN_LIMITS = {
  free: {
    label: 'Free',
    maxDurationSec: 10 * 60,
    maxVideosPerDay: 15,
    maxFileSize: 500 * 1024 * 1024,        // 500 MB per file
    maxStorageBytes: 500 * 1024 * 1024,    // 500 MB total storage
  },
  premium: {
    label: 'Premium',
    maxDurationSec: Infinity,
    maxVideosPerDay: Infinity,
    maxFileSize: 10 * 1024 * 1024 * 1024,  // 10 GB per file (beneran 10 GB!)
    maxStorageBytes: Infinity,             // total storage unlimited
  },
} as const;

export function getUserPlan(user: User | null | undefined) {
  if (!user) return { plan: 'free' as const, label: 'Free', isPremium: false, expiresAt: null, grantedAt: null, limits: PLAN_LIMITS.free };
  const isActive = !!user.isPremium && (!user.premiumUntil || new Date(user.premiumUntil) > new Date());
  const planKey = isActive ? 'premium' : 'free';
  return {
    plan: planKey as 'free' | 'premium',
    label: PLAN_LIMITS[planKey].label,
    isPremium: isActive,
    expiresAt: user.premiumUntil || null,
    grantedAt: user.premiumSince || null,
    limits: PLAN_LIMITS[planKey],
  };
}

/** Hitung jumlah upload user dalam 24 jam terakhir (rolling window). */
export function getDailyVideoCount(db: { videos: { username: string; uploadedAt: string }[] }, username: string): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return db.videos.filter((v) =>
    v.username === username && new Date(v.uploadedAt).getTime() >= cutoff
  ).length;
}

/** Total storage dipakai user (jumlah size semua video). */
export function getUserStorageBytes(db: { videos: { username: string; size?: number }[] }, username: string): number {
  return db.videos
    .filter((v) => v.username === username)
    .reduce((s, v) => s + (Number(v.size) || 0), 0);
}

/** Sisa hari premium user (0 kalau lifetime atau tidak premium). */
export function getPremiumDaysRemaining(user: User | null | undefined): number | null {
  if (!user || !user.isPremium) return null;
  if (!user.premiumUntil) return Infinity;
  const ms = new Date(user.premiumUntil).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
