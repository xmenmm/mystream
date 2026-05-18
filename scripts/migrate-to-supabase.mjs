/**
 * One-time migrasi data lokal → Supabase.
 * Pindahkan db.json + semua file di data/ ke Supabase (Postgres + Storage).
 *
 * CARA PAKAI (jalankan di mesin yg ADA internet + ADA folder data/):
 *
 *   1. cd <folder mystream>            (folder yg ada data/ + node_modules)
 *   2. set env (Windows CMD):
 *        set SUPABASE_URL=https://xxxx.supabase.co
 *        set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   (Settings → API → service_role)
 *      (PowerShell:  $env:SUPABASE_URL="..."  ;  $env:SUPABASE_SERVICE_ROLE_KEY="...")
 *   3. node scripts/migrate-to-supabase.mjs
 *
 * Aman dijalankan ulang (idempotent: upsert + upsert storage).
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('❌ Set dulu SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di environment.');
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const BUCKET = 'media';
const DATA = path.join(process.cwd(), 'data');

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};

// Map folder lokal → prefix di bucket
const FOLDERS = {
  files: 'files', thumbs: 'thumbs', avatars: 'avatars',
  banners: 'banners', 'msg-files': 'msg-files', ads: 'ads',
};

async function main() {
  // 1) db.json → app_data row 'main'
  const dbPath = path.join(DATA, 'db.json');
  if (!fs.existsSync(dbPath)) { console.error('❌ data/db.json tidak ada di folder ini'); process.exit(1); }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // Set flag hasAvatar untuk user yang punya file avatar (krn sekarang pakai flag)
  const avatarsDir = path.join(DATA, 'avatars');
  if (fs.existsSync(avatarsDir) && Array.isArray(db.users)) {
    for (const u of db.users) {
      if (fs.existsSync(path.join(avatarsDir, u.username + '.jpg'))) u.hasAvatar = true;
    }
  }

  const { error: dbErr } = await sb.from('app_data')
    .upsert({ id: 'main', value: db, updated_at: new Date().toISOString() });
  if (dbErr) { console.error('❌ gagal simpan db:', dbErr.message); process.exit(1); }
  console.log('✓ db.json → Supabase (app_data.main)');

  // 2) Semua file di data/<folder> → bucket media/<prefix>/<name>
  let total = 0, okc = 0;
  for (const [folder, prefix] of Object.entries(FOLDERS)) {
    const dir = path.join(DATA, folder);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const fp = path.join(dir, name);
      if (!fs.statSync(fp).isFile()) continue;
      total++;
      const ext = path.extname(name).toLowerCase();
      const ct = MIME[ext] || 'application/octet-stream';
      const body = fs.readFileSync(fp);
      const { error } = await sb.storage.from(BUCKET)
        .upload(`${prefix}/${name}`, body, { contentType: ct, upsert: true });
      if (error) console.error(`  ✗ ${prefix}/${name}: ${error.message}`);
      else { okc++; console.log(`  ✓ ${prefix}/${name}`); }
    }
  }
  console.log(`\nSelesai. File: ${okc}/${total} terupload. DB: OK.`);
  console.log('Sekarang deploy ke Vercel (lihat DEPLOY-VERCEL.md).');
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
