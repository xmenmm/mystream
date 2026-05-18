import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan, getDailyVideoCount, getUserStorageBytes, getPremiumDaysRemaining } from '@/lib/auth';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

function fmtSize(b: number) {
  if (!isFinite(b)) return 'unlimited';
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(b >= 10 * 1024 ** 3 ? 0 : 1)} GB`;
  return `${(b / 1024 / 1024).toFixed(0)} MB`;
}
function fmtDur(s: number) {
  if (!isFinite(s)) return 'unlimited';
  if (s >= 3600) return `${Math.floor(s / 3600)} jam`;
  return `${Math.floor(s / 60)} menit`;
}

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const plan = getUserPlan(a.user);
  const dailyCount = getDailyVideoCount(db, a.user.username);
  const storageUsed = getUserStorageBytes(db, a.user.username);
  const lim = plan.limits;
  const remaining = lim.maxVideosPerDay === Infinity ? Infinity : Math.max(0, lim.maxVideosPerDay - dailyCount);
  const daysLeft = getPremiumDaysRemaining(a.user);

  return NextResponse.json({
    plan: plan.plan,
    label: plan.label,
    isPremium: plan.isPremium,
    expiresAt: plan.expiresAt,
    grantedAt: plan.grantedAt,
    daysRemaining: daysLeft === Infinity ? null : daysLeft,
    lifetime: daysLeft === Infinity,
    daily: {
      used: dailyCount,
      limit: lim.maxVideosPerDay === Infinity ? null : lim.maxVideosPerDay,
      remaining: remaining === Infinity ? null : remaining,
      unlimited: lim.maxVideosPerDay === Infinity,
      resetsIn: '24 jam (rolling)',
    },
    storage: {
      used: storageUsed,
      usedLabel: fmtSize(storageUsed),
      limit: lim.maxStorageBytes === Infinity ? null : lim.maxStorageBytes,
      limitLabel: fmtSize(lim.maxStorageBytes),
      unlimited: lim.maxStorageBytes === Infinity,
      percent: lim.maxStorageBytes === Infinity ? 0 : Math.min(100, (storageUsed / lim.maxStorageBytes) * 100),
    },
    limits: {
      maxDurationSec: lim.maxDurationSec === Infinity ? null : lim.maxDurationSec,
      maxDurationLabel: fmtDur(lim.maxDurationSec),
      maxFileSize: lim.maxFileSize === Infinity ? null : lim.maxFileSize,
      maxFileSizeLabel: fmtSize(lim.maxFileSize),
    },
  });
}
