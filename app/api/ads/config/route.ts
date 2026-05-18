import { NextResponse } from 'next/server';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

/** Public — fetched by watch page to know if ads should play.
 *  Hanya kembalikan ad yang enabled, dan tanpa info upload (size/uploadedAt). */
export async function GET() {
  const db = await loadDB();
  const cfg = db.adsConfig || {};
  const enabled = !!cfg.enabled;
  const ads = (cfg.ads || []).filter((a: any) => a.enabled).map((a: any) => ({
    id: a.id,
    title: a.title,
    mimeType: a.mimeType,
    duration: a.duration,
    url: a.url,
  }));
  return NextResponse.json({
    enabled: enabled && ads.length > 0,
    intervalSec: cfg.intervalSec ?? 120,
    skipAfterSec: cfg.skipAfterSec ?? 5,
    randomOrder: cfg.randomOrder ?? true,
    randomInterval: cfg.randomInterval ?? false,
    intervalMinSec: cfg.intervalMinSec ?? 60,
    intervalMaxSec: cfg.intervalMaxSec ?? 180,
    ads,
  });
}
