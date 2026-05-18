import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan, getDailyVideoCount, getUserStorageBytes } from '@/lib/auth';
import { loadDB, saveDB, publicVideo, pushNotif, newId, THUMBS_DIR } from '@/lib/db';
import { notifyDiscord } from '@/lib/discord';
import { putFile } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scope = url.searchParams.get('user');
  const db = await loadDB();
  let list = db.videos;
  if (scope === 'me') {
    const a = await getAuthFromRequest(req);
    if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    list = list.filter((v) => v.username === a.user.username);
  } else if (scope && scope !== 'all') {
    list = list.filter((v) => v.username === scope);
  }
  return NextResponse.json({ videos: list.map(publicVideo) });
}

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { title, description = '', filename, size, mimeType, type, duration = 0, thumbDataURL } = body;
  if (!title || !filename || !type)
    return NextResponse.json({ error: 'metadata kurang' }, { status: 400 });

  // Plan-based validation
  const plan = getUserPlan(a.user);
  const lim = plan.limits;
  const dur = Number(duration) || 0;
  const sz = Number(size) || 0;
  const dbCheck = await loadDB();
  const dailyCount = getDailyVideoCount(dbCheck, a.user.username);
  const storageUsed = getUserStorageBytes(dbCheck, a.user.username);

  if (type === 'video' && lim.maxDurationSec !== Infinity && dur > lim.maxDurationSec) {
    return NextResponse.json({
      error: `Durasi ${Math.ceil(dur / 60)} menit melebihi batas plan ${plan.label} (max ${Math.floor(lim.maxDurationSec / 60)} menit). Upgrade Premium untuk durasi unlimited.`,
      needsUpgrade: !plan.isPremium, plan: plan.plan,
    }, { status: 403 });
  }
  if (lim.maxVideosPerDay !== Infinity && dailyCount >= lim.maxVideosPerDay) {
    return NextResponse.json({
      error: `Sudah upload ${dailyCount} video dalam 24 jam. Plan ${plan.label} max ${lim.maxVideosPerDay}/hari. Tunggu reset (24 jam) atau upgrade Premium (unlimited).`,
      needsUpgrade: !plan.isPremium, plan: plan.plan,
    }, { status: 403 });
  }
  if (lim.maxFileSize !== Infinity && sz > lim.maxFileSize) {
    const fmtMaxFile = lim.maxFileSize >= 1024 ** 3
      ? `${(lim.maxFileSize / 1024 ** 3).toFixed(0)} GB`
      : `${(lim.maxFileSize / 1024 / 1024).toFixed(0)} MB`;
    const fmtSz = sz >= 1024 ** 3
      ? `${(sz / 1024 ** 3).toFixed(2)} GB`
      : `${(sz / 1024 / 1024).toFixed(0)} MB`;
    return NextResponse.json({
      error: `File ${fmtSz} melebihi batas plan ${plan.label} (max ${fmtMaxFile} per file). ${!plan.isPremium ? 'Upgrade Premium dapat 10 GB per file.' : ''}`,
      needsUpgrade: !plan.isPremium, plan: plan.plan,
    }, { status: 403 });
  }
  if (lim.maxStorageBytes !== Infinity && storageUsed + sz > lim.maxStorageBytes) {
    const usedMb = (storageUsed / 1024 / 1024).toFixed(0);
    const capMb = (lim.maxStorageBytes / 1024 / 1024).toFixed(0);
    return NextResponse.json({
      error: `Storage hampir penuh: terpakai ${usedMb} MB dari ${capMb} MB. Hapus beberapa video atau upgrade Premium (storage unlimited).`,
      needsUpgrade: !plan.isPremium, plan: plan.plan,
    }, { status: 403 });
  }

  const id = newId();
  let thumbSaved = false;
  if (thumbDataURL && typeof thumbDataURL === 'string' && thumbDataURL.startsWith('data:image/')) {
    try {
      const b64 = thumbDataURL.split(',')[1];
      await putFile(THUMBS_DIR, id + '.jpg', Buffer.from(b64, 'base64'), 'image/jpeg');
      thumbSaved = true;
    } catch {}
  }
  const video = {
    id,
    username: a.user.username,
    title: String(title).slice(0, 200),
    description: String(description).slice(0, 2000),
    filename,
    size: sz,
    mimeType: mimeType || 'application/octet-stream',
    type,
    duration: dur,
    hasThumb: thumbSaved,
    uploadedAt: new Date().toISOString(),
    views: 0,
    likes: 0,
    likedBy: [] as string[],
    fileReady: false,
  };
  const db = await loadDB();
  db.videos.push(video);
  const followers = db.users.filter((u) => (u.following || []).includes(a.user.username));
  for (const f of followers) {
    pushNotif(db, f.username, 'upload', a.user.username, { videoId: id, text: video.title });
  }
  await saveDB(db);

  notifyDiscord({
    type: 'rich', color: 0xd946ef,
    title: '🎬 Video Baru Diupload',
    description: `**@${a.user.username}** upload "${video.title}"`,
    fields: [
      { name: 'Type', value: type, inline: true },
      { name: 'Size', value: `${(sz / 1024 / 1024).toFixed(1)} MB`, inline: true },
      { name: 'Duration', value: `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}`, inline: true },
    ],
    footer: { text: 'MyStream • Upload' },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ video: publicVideo(video) });
}
