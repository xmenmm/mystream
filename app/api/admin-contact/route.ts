import { NextResponse } from 'next/server';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

/** Return the first admin's username so users can contact them (e.g. for premium upgrade). */
export async function GET() {
  const db = await loadDB();
  const admin = db.users.find((u) => u.isAdmin && !u.suspended);
  if (!admin) return NextResponse.json({ admin: null });
  return NextResponse.json({ admin: admin.username });
}
