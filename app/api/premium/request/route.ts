import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';
import type { PremiumCode } from '@/lib/types';

export const runtime = 'nodejs';

const TIERS: Record<string, { days: number; price: number; label: string }> = {
  '7d':   { days: 7,   price: 15000,  label: '7 Hari' },
  '30d':  { days: 30,  price: 49000,  label: '30 Hari' },
  '90d':  { days: 90,  price: 119000, label: '90 Hari' },
  '180d': { days: 180, price: 199000, label: '180 Hari' },
  '365d': { days: 365, price: 349000, label: '365 Hari' },
};

const PAYMENT_METHODS = new Set([
  'DANA', 'OVO', 'GoPay', 'ShopeePay', 'LinkAja',
  'BCA', 'BRI', 'BNI', 'Mandiri', 'Permata',
  'QRIS',
]);

function genCode(tierId: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `PRM-${tierId.toUpperCase()}-${ts}${rand}`;
}

/** POST { tierId, paymentMethod } → returns { code } */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'login dulu untuk request premium' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tierId = String(body.tierId || '');
  const paymentMethod = String(body.paymentMethod || '');

  const tier = TIERS[tierId];
  if (!tier) return NextResponse.json({ error: 'tier tidak valid' }, { status: 400 });
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    return NextResponse.json({ error: 'metode pembayaran tidak valid' }, { status: 400 });
  }

  const db = await loadDB();
  if (!db.premiumCodes) db.premiumCodes = [];

  // Cancel any existing pending codes from this user (one active request at a time)
  for (const c of db.premiumCodes) {
    if (c.username === a.user.username && c.status === 'pending') {
      c.status = 'rejected';
      c.rejectedReason = 'cancelled (new request)';
    }
  }

  const code: PremiumCode = {
    code: genCode(tierId),
    username: a.user.username,
    tierId: tierId as PremiumCode['tierId'],
    days: tier.days,
    price: tier.price,
    paymentMethod,
    status: 'pending',
    createdAt: Date.now(),
  };
  db.premiumCodes.push(code);

  // Cari admin pertama buat receiver pesan + auto-reply
  const admin = db.users.find((u) => u.isAdmin);

  let adminUsername: string | null = null;
  if (admin) {
    adminUsername = admin.username;
    db.messages = db.messages || [];

    // 1. Pesan dari user → admin (auto-template "saya minta premium")
    const userMsg = {
      id: 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      from: a.user.username,
      to: admin.username,
      text:
        `Halo admin, saya minta upgrade Premium.\n` +
        `📋 Kode: ${code.code}\n` +
        `⏱ Durasi: ${tier.label} (${tier.days} hari)\n` +
        `💰 Total: Rp ${tier.price.toLocaleString('id-ID')}\n` +
        `💳 Via: ${paymentMethod}\n\n` +
        `Mohon di-approve setelah saya transfer. Terima kasih 🙏`,
      ts: new Date().toISOString(),
      read: false,
    };
    db.messages.push(userMsg);

    // 2. Auto-reply dari admin → user (1x, isi instruksi + minta tunggu 24 jam)
    const adminReply = {
      id: 'm_' + (Date.now() + 1).toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      from: admin.username,
      to: a.user.username,
      text:
        `Halo @${a.user.username}! 👋\n\n` +
        `Terima kasih udah pilih Premium ${tier.label}. Berikut langkah berikutnya:\n\n` +
        `1️⃣ Transfer *Rp ${tier.price.toLocaleString('id-ID')}* ke ${paymentMethod} (cek nomor di modal pembayaran).\n` +
        `2️⃣ Setelah transfer, *kirim foto bukti transfer* ke chat ini (klik tombol 📎 di bawah).\n` +
        `3️⃣ Admin akan verifikasi dalam *1×24 jam*. Premium kamu akan otomatis aktif setelah di-approve.\n\n` +
        `📋 Kode kamu: \`${code.code}\`\n` +
        `(simpan kode ini buat referensi)\n\n` +
        `Pesan ini otomatis. Kalau ada pertanyaan lain, balas chat ini ya. 🙏`,
      ts: new Date(Date.now() + 1000).toISOString(),
      read: false,
      isSystem: true,
    };
    db.messages.push(adminReply);
  }

  await saveDB(db);

  return NextResponse.json({
    ok: true,
    code: code.code,
    tier: { id: tierId, label: tier.label, days: tier.days, price: tier.price },
    paymentMethod,
    adminUsername,
  });
}

/** GET → user's own pending/approved codes (own history) */
export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await loadDB();
  const list = (db.premiumCodes || [])
    .filter((c) => c.username === a.user.username)
    .sort((x, y) => y.createdAt - x.createdAt);
  return NextResponse.json({ codes: list });
}
