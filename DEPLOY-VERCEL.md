# Deploy MyStream → Vercel + Supabase

Kode sudah dimigrasi: **db.json → Supabase Postgres (JSONB)**, **semua file → Supabase Storage**.
Sudah tidak pakai filesystem → cocok untuk Vercel (serverless).

> Catatan jujur: migrasi ini **tidak bisa dites dari mesin dev** (network diblokir).
> Wajar kalau perlu 1–2 iterasi kecil pas deploy pertama — error log Vercel/Supabase
> akan jelas, tinggal dibenerin.

---

## LANGKAH 1 — Supabase (dashboard)

1. Buka project Supabase kamu → **SQL Editor** → New query
2. Copy-paste isi **`SUPABASE-SETUP.sql`** → **RUN**
   - Bikin tabel `app_data` + bucket Storage `media` (public) + policy baca publik
3. **Settings → API**, catat 2 nilai:
   - **Project URL** → `https://xxxx.supabase.co`
   - **service_role** key (yang `secret`, BUKAN anon) → `eyJhbGci...`

## LANGKAH 2 — Migrasi data lama (akun admin, video, iklan, banner)

Jalankan di **mesin yang ADA internet + ADA folder `data/`** (mis. laptop kamu;
pakai paket `mystream-portable.zip` yang sudah dibuat — isinya termasuk `data/`):

```cmd
cd <folder mystream>
npm install
set SUPABASE_URL=https://xxxx.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...service_role...
node scripts/migrate-to-supabase.mjs
```
(PowerShell: `$env:SUPABASE_URL="..."` lalu `$env:SUPABASE_SERVICE_ROLE_KEY="..."`)

Output: `db.json → Supabase` + daftar file terupload. Akun admin & semua konten pindah.

## LANGKAH 3 — Push kode ke GitHub

Vercel deploy dari repo GitHub. Push kode terbaru (yang sudah dimigrasi) ke repo kamu:

```cmd
git add -A
git commit -m "migrate to supabase + vercel"
git push
```
(Kalau repo `xmenmm/mystream` masih kode lama, push yang ini supaya ke-update.)

## LANGKAH 4 — Vercel

1. vercel.com → **Add New → Project** → Import repo GitHub MyStream
2. Framework: **Next.js** (auto-detect). Build command default (`next build`).
3. **Environment Variables** (Settings → Environment Variables) — tambahkan:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...service_role...` |

   (set untuk Production + Preview + Development)
4. **Deploy**. Tunggu build selesai → dapat URL `https://namaproject.vercel.app`

## LANGKAH 5 — Domain (opsional, gratis)

- Vercel kasih `*.vercel.app` gratis (langsung jalan, no kartu).
- Mau domain sendiri: Vercel → Settings → Domains → add. Domain gratis (DuckDNS)
  bisa di-CNAME ke Vercel, atau pakai `*.vercel.app` apa adanya.

---

## Yang sudah beres di kode
- ✅ Semua `loadDB/saveDB` async → Supabase Postgres (JSONB single-doc)
- ✅ `getAuthFromRequest/Cookies` async
- ✅ Semua upload (video, avatar, iklan, banner, thumbnail, DM image) → Supabase Storage
- ✅ Semua serving file → redirect ke Supabase public URL (hemat Vercel bandwidth)
- ✅ `hasAvatar` jadi flag DB (bukan cek filesystem)
- ✅ `tsc --noEmit` CLEAN (lolos type-check)

## Batasan & catatan
- **Upload video besar**: Vercel function ada limit ukuran body. Video kecil/medium OK.
  Untuk file besar (≫100MB) nanti perlu enhancement "direct upload ke Supabase
  (signed URL)" dari browser — belum termasuk (bisa dikerjakan tahap berikutnya).
- **Discord / Daily Report**: akan JALAN di Vercel (internetnya normal).
- Model DB single-document = last-write-wins (cukup untuk skala awal/demo).
