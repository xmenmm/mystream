# 🎬 MyStream

> Platform berbagi video full-stack dengan admin dashboard, sistem premium, dan AI tools.

Dibangun dengan **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**. Single-laptop deployable, tanpa external database — semua disimpan di filesystem (db.json + folder uploads).

---

## ✨ Fitur Utama

### 👥 User Features
- Upload video & gambar (auto-thumbnail dari frame video)
- Like, follow, comment, share
- Direct messaging antar user (dengan attachment foto)
- Pencarian video & user (debounced live search + Ctrl+K shortcut)
- Notifikasi real-time (bell icon, polling 15s)
- Profile customizable (avatar, bio, country)
- Centang biru ✓ (verified badge dari admin)
- 2FA TOTP keamanan
- Multi-language UI: 🇮🇩 Indonesia · 🇬🇧 English · 🇯🇵 日本語 · 🇸🇦 العربية (Premium only)

### ⭐ Premium System
- 5 tier durasi: 7 / 30 / 90 / 180 / 365 hari
- 11 metode pembayaran (DANA, OVO, GoPay, ShopeePay, BCA, BRI, dll)
- Code generation manual + admin approval workflow
- AI Thumbnail generator via Pollinations.ai (1280×720)
- AI Auto-description (ID/EN)
- Multi-language UI access
- Storage unlimited, file 10 GB max, durasi unlimited

### 🛡 Admin Dashboard
- **Overview** — stats real-time (users, videos, views, online)
- **Users** — manage user, suspend, warn, grant premium, verify
- **Premium Codes** — approve/reject pembayaran
- **Rekening** — atur nomor pembayaran (E-wallet & Bank)
- **Top** — leaderboard creator (views/likes/videos/followers)
- **Activity** — feed aktivitas semua user
- **Announce** — pengumuman global
- **Banner** — banner customizable + running text
- **Tools** — AI generator, send to Discord, daily report

### 🎨 Other
- Custom video player dengan layers, banner, running text
- Pagination, theme toggle (dark/light), space background animation
- Discord MCP integration (notif signup, login, daily report)
- Login captcha + rate limiting (3 attempts → 30s lockout)

---

## 🛠 Tech Stack

| Category | Tech |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com/) |
| Storage | JSON file + filesystem (no external DB) |
| Auth | Cookie session + SHA-256 password + TOTP 2FA |
| AI | [Pollinations.ai](https://pollinations.ai/) (free, no API key) |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/xmenmm/mystream.git
cd mystream

# Install
npm install

# Run dev server
npm run dev

# Open http://localhost:3001
```

### Production Build

```bash
npm run build
npm start
```

---

## 📂 Struktur Project

```
mystream-next/
├── app/
│   ├── (app)/              # Layout dengan sidebar
│   │   ├── admin/          # Admin pages
│   │   ├── dashboard/
│   │   ├── messages/
│   │   ├── profile/
│   │   └── ...
│   ├── api/                # API routes
│   ├── login/
│   └── signup/
├── components/             # React components
├── lib/                    # Utility libraries
│   ├── auth.ts             # Auth & 2FA helpers
│   ├── db.ts               # JSON file storage
│   ├── i18n.ts             # 4-language translations
│   └── types.ts            # TypeScript types
├── data/                   # Runtime storage (gitignored)
└── public/                 # Static assets
```

---

## 🔒 Security Notes

- ⚠️ `data/db.json` berisi password plain text (admin viewable feature) — **WAJIB ada di .gitignore**
- ✅ Password hash SHA-256 + salt
- ✅ Rate limiting brute-force protection (3 attempts → 30s)
- ✅ httpOnly + SameSite cookies
- ✅ 2FA TOTP support

---

## 📄 License

Private project. Untuk demo & pembelajaran.

---

**Built with ❤️ in Indonesia.**
