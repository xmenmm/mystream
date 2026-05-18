import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, ADS_DIR } from '@/lib/db';
import { putFile } from '@/lib/storage';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB per ad

function getConfig(db: Awaited<ReturnType<typeof loadDB>>) {
  return {
    enabled: db.adsConfig?.enabled ?? false,
    intervalSec: db.adsConfig?.intervalSec ?? 120,
    skipAfterSec: db.adsConfig?.skipAfterSec ?? 5,
    randomOrder: db.adsConfig?.randomOrder ?? true,
    randomInterval: db.adsConfig?.randomInterval ?? false,
    intervalMinSec: db.adsConfig?.intervalMinSec ?? 60,
    intervalMaxSec: db.adsConfig?.intervalMaxSec ?? 180,
    ads: db.adsConfig?.ads ?? [],
  };
}

export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const db = await loadDB();
  return NextResponse.json(getConfig(db));
}

/** Upload ad: raw bytes in body, mime in Content-Type, title in query param. */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const ct = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ct.startsWith('video/') && !ct.startsWith('image/')) {
    return NextResponse.json({ error: 'MIME tidak didukung. Pakai video/* atau image/*' }, { status: 400 });
  }

  const url = new URL(req.url);
  const title = (url.searchParams.get('title') || 'Iklan').slice(0, 100);
  const adUrlRaw = (url.searchParams.get('url') || '').slice(0, 500);
  const adUrl = /^https?:\/\//i.test(adUrlRaw) ? adUrlRaw : undefined;
  const durationStr = url.searchParams.get('duration');
  const duration = durationStr ? Number(durationStr) : undefined;

  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: 'file kosong' }, { status: 400 });
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: `file terlalu besar (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });
  }

  const id = 'ad_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
  await putFile(ADS_DIR, id, buf, ct);

  const db = await loadDB();
  const cfg = getConfig(db);
  const newAd = {
    id,
    title,
    mimeType: ct,
    size: buf.length,
    duration: isFinite(duration as number) ? duration : undefined,
    uploadedAt: new Date().toISOString(),
    enabled: true,
    url: adUrl,
  };
  const ads = [...cfg.ads, newAd];
  db.adsConfig = { ...cfg, ads, updatedBy: a.user.username, updatedAt: new Date().toISOString() };
  await saveDB(db);

  return NextResponse.json({ ok: true, ad: newAd });
}

/** PATCH config: enabled, intervalSec, skipAfterSec */
export async function PATCH(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const body = await req.json();
  const db = await loadDB();
  const cfg = getConfig(db);

  const next: any = { ...cfg };
  if (typeof body.enabled === 'boolean') next.enabled = body.enabled;
  if (typeof body.intervalSec === 'number' && body.intervalSec >= 10 && body.intervalSec <= 3600) {
    next.intervalSec = Math.round(body.intervalSec);
  }
  if (typeof body.skipAfterSec === 'number' && body.skipAfterSec >= 0 && body.skipAfterSec <= 60) {
    next.skipAfterSec = Math.round(body.skipAfterSec);
  }
  if (typeof body.randomOrder === 'boolean') next.randomOrder = body.randomOrder;
  if (typeof body.randomInterval === 'boolean') next.randomInterval = body.randomInterval;
  if (typeof body.intervalMinSec === 'number' && body.intervalMinSec >= 10 && body.intervalMinSec <= 3600) {
    next.intervalMinSec = Math.round(body.intervalMinSec);
  }
  if (typeof body.intervalMaxSec === 'number' && body.intervalMaxSec >= 10 && body.intervalMaxSec <= 3600) {
    next.intervalMaxSec = Math.round(body.intervalMaxSec);
  }
  // Jaga min <= max
  if (next.intervalMinSec > next.intervalMaxSec) {
    [next.intervalMinSec, next.intervalMaxSec] = [next.intervalMaxSec, next.intervalMinSec];
  }
  next.updatedBy = a.user.username;
  next.updatedAt = new Date().toISOString();
  db.adsConfig = next;
  await saveDB(db);

  return NextResponse.json({ ok: true, config: next });
}
