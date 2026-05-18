import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB, MSG_FILES_DIR } from '@/lib/db';
import { putFile } from '@/lib/storage';
import { DB } from '@/lib/types';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

const isMutual = (db: DB, a: string, b: string) => {
  const ua = db.users.find((x) => x.username === a);
  const ub = db.users.find((x) => x.username === b);
  if (!ua || !ub) return false;
  return (ua.following || []).includes(b) && (ub.following || []).includes(a);
};

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const other = decodeURIComponent(params.username);
  const db = await loadDB();
  const msgs = (db.messages || []).filter(
    (m) =>
      (m.from === a.user.username && m.to === other) ||
      (m.from === other && m.to === a.user.username),
  );
  let changed = false;
  for (const m of msgs) {
    if (m.to === a.user.username && !m.read) {
      m.read = true;
      changed = true;
    }
  }
  if (changed) await saveDB(db);
  const u = db.users.find((x) => x.username === other);
  return NextResponse.json({
    messages: msgs.sort((x, y) => +new Date(x.ts) - +new Date(y.ts)),
    partner: u
      ? {
          username: u.username,
          avatarColor: u.avatarColor || '#8b5cf6',
          bio: u.bio || '',
          mutual: isMutual(db, a.user.username, other),
        }
      : null,
  });
}

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const to = decodeURIComponent(params.username);
  if (to === a.user.username)
    return NextResponse.json({ error: 'tidak bisa kirim ke diri sendiri' }, { status: 400 });

  const contentType = req.headers.get('content-type') || '';
  let text = '';
  let imageFile: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    // Multipart: text + optional image
    const form = await req.formData();
    text = String(form.get('text') || '');
    const imgEntry = form.get('image');
    if (imgEntry instanceof File && imgEntry.size > 0) {
      imageFile = imgEntry;
    }
  } else {
    // JSON: text only (backward compat)
    const body = await req.json().catch(() => ({}));
    text = String(body.text || '');
  }

  text = text.trim().slice(0, 2000);

  if (!text && !imageFile) {
    return NextResponse.json({ error: 'pesan kosong (text atau image wajib ada)' }, { status: 400 });
  }

  const db = await loadDB();
  const tgt = db.users.find((x) => x.username === to);
  if (!tgt) return NextResponse.json({ error: 'user tidak ditemukan' }, { status: 404 });

  // Process image upload
  let imageFilename: string | undefined;
  let imageMime: string | undefined;
  let imageSize: number | undefined;

  if (imageFile) {
    if (!ALLOWED_IMAGE_MIMES.has(imageFile.type)) {
      return NextResponse.json({ error: `format gambar tidak didukung: ${imageFile.type}` }, { status: 400 });
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `gambar terlalu besar (max 5 MB)` }, { status: 400 });
    }
    const ext = imageFile.type.split('/')[1].replace('jpeg', 'jpg');
    const msgId = 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    imageFilename = `${msgId}.${ext}`;
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await putFile(MSG_FILES_DIR, imageFilename, buffer, imageFile.type);
    imageMime = imageFile.type;
    imageSize = imageFile.size;
  }

  db.messages = db.messages || [];
  const msg = {
    id: 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    from: a.user.username,
    to,
    text,
    ts: new Date().toISOString(),
    read: false,
    ...(imageFilename ? { imageFilename, imageMime, imageSize } : {}),
  };
  db.messages.push(msg);
  if (db.messages.length > 50000)
    db.messages.splice(0, db.messages.length - 50000);
  await saveDB(db);
  return NextResponse.json({ message: msg, mutual: isMutual(db, a.user.username, to) });
}
