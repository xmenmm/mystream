import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getUserPlan } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/db';

export const runtime = 'nodejs';

const VALID = ['id', 'en', 'jp', 'ar'] as const;

/** Body: { locale: 'id' | 'en' | 'jp' | 'ar' } — premium only */
export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const plan = getUserPlan(a.user);
  if (!plan.isPremium) {
    return NextResponse.json({
      error: 'Multi-language adalah fitur Premium. Upgrade dulu untuk pakai.',
      premiumRequired: true,
    }, { status: 403 });
  }

  const { locale } = await req.json().catch(() => ({}));
  if (!VALID.includes(locale)) {
    return NextResponse.json({ error: `locale invalid (boleh: ${VALID.join(', ')})` }, { status: 400 });
  }

  const db = await loadDB();
  const u = db.users.find((x) => x.username === a.user.username);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  u.locale = locale;
  await saveDB(db);

  return NextResponse.json({ ok: true, locale });
}
