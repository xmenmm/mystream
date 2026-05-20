import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';
import type { PaymentMethod, PaymentSettings } from '@/lib/types';

export const runtime = 'nodejs';
// Anti edge-cache: tanpa ini Vercel cache GET-nya & POST balas 405.
export const dynamic = 'force-dynamic';

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: 'DANA',      name: 'DANA',      type: 'ewallet', account: '',  accountName: 'MyStream Admin', icon: '💙', color: 'bg-blue-500',    enabled: true },
  { id: 'OVO',       name: 'OVO',       type: 'ewallet', account: '',  accountName: 'MyStream Admin', icon: '💜', color: 'bg-purple-600',  enabled: true },
  { id: 'GoPay',     name: 'GoPay',     type: 'ewallet', account: '',  accountName: 'MyStream Admin', icon: '💚', color: 'bg-green-600',   enabled: true },
  { id: 'ShopeePay', name: 'ShopeePay', type: 'ewallet', account: '',  accountName: 'MyStream Admin', icon: '🧡', color: 'bg-orange-500',  enabled: true },
  { id: 'LinkAja',   name: 'LinkAja',   type: 'ewallet', account: '',  accountName: 'MyStream Admin', icon: '❤️', color: 'bg-red-500',     enabled: true },
  { id: 'QRIS',      name: 'QRIS',      type: 'ewallet', account: 'Scan QR di chat admin', accountName: '—',     icon: '📱', color: 'bg-slate-700',   enabled: true },
  { id: 'BCA',       name: 'BCA',       type: 'bank',    account: '',  accountName: 'MyStream Admin', icon: '🏦', color: 'bg-sky-700',     enabled: true },
  { id: 'BRI',       name: 'BRI',       type: 'bank',    account: '',  accountName: 'MyStream Admin', icon: '🏦', color: 'bg-indigo-700',  enabled: true },
  { id: 'BNI',       name: 'BNI',       type: 'bank',    account: '',  accountName: 'MyStream Admin', icon: '🏦', color: 'bg-orange-700',  enabled: true },
  { id: 'Mandiri',   name: 'Mandiri',   type: 'bank',    account: '',  accountName: 'MyStream Admin', icon: '🏦', color: 'bg-yellow-600',  enabled: true },
  { id: 'Permata',   name: 'Permata',   type: 'bank',    account: '',  accountName: 'MyStream Admin', icon: '🏦', color: 'bg-emerald-700', enabled: true },
];

async function getOrInit(): Promise<PaymentSettings> {
  const db = await loadDB();
  if (!db.paymentSettings || !db.paymentSettings.methods) {
    db.paymentSettings = { methods: DEFAULT_METHODS, note: '' };
    await saveDB(db);
  }
  return db.paymentSettings!;
}

/** GET (public) — return list metode + nomor rekening */
export async function GET() {
  const settings = await getOrInit();
  return NextResponse.json(settings);
}

/** POST (admin only) — body { methods: PaymentMethod[], note?: string } */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.methods)) {
    return NextResponse.json({ error: 'methods harus array' }, { status: 400 });
  }

  // Validate & sanitize
  const cleaned: PaymentMethod[] = body.methods
    .filter((m: any) => m && typeof m.id === 'string')
    .map((m: any) => ({
      id: String(m.id).slice(0, 30),
      name: String(m.name || m.id).slice(0, 40),
      type: m.type === 'bank' ? 'bank' : 'ewallet',
      account: String(m.account || '').slice(0, 60),
      accountName: String(m.accountName || '').slice(0, 60),
      icon: String(m.icon || '🏦').slice(0, 8),
      color: String(m.color || 'bg-slate-700').slice(0, 30),
      enabled: m.enabled !== false,
    }));

  const db = await loadDB();
  db.paymentSettings = {
    methods: cleaned,
    note: typeof body.note === 'string' ? String(body.note).slice(0, 500) : (db.paymentSettings?.note || ''),
  };
  await saveDB(db);
  return NextResponse.json({ ok: true, settings: db.paymentSettings });
}
