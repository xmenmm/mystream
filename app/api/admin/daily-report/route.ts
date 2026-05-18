import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { loadDB } from '@/lib/db';
import { discordSendEmbed } from '@/lib/discord';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!a.user.isAdmin) return NextResponse.json({ error: 'admin only' }, { status: 403 });
  const db = await loadDB();
  const now = Date.now();
  const hr24 = 86400000;
  const newUsers = db.users.filter((u) => now - new Date(u.createdAt).getTime() < hr24).length;
  const newVideos = db.videos.filter((v) => now - new Date(v.uploadedAt).getTime() < hr24).length;
  const views24 = (db.viewsLog || []).filter((v) => now - v.ts < hr24).length;
  const totalViews = (db.viewsLog || []).length;
  const topVideo = [...db.videos].sort((x, y) => (y.views || 0) - (x.views || 0))[0];
  const embed = {
    type: 'rich',
    title: '📊 MyStream Daily Report',
    description: `Triggered manually by **${a.user.username}** at <t:${Math.floor(now / 1000)}:F>`,
    color: 0x7c3aed,
    fields: [
      { name: '📈 24 Jam Terakhir', value: `👥 +${newUsers} user · 🎬 +${newVideos} video · 👀 ${views24} views`, inline: false },
      { name: '📊 Total', value: `${db.users.length} users · ${db.videos.length} videos · ${totalViews} views`, inline: false },
      { name: '🏆 Top Video', value: topVideo ? `${topVideo.title} — ${topVideo.views || 0} views (by ${topVideo.username})` : 'N/A', inline: false },
    ],
    footer: { text: 'MyStream Admin Tools' },
    timestamp: new Date().toISOString(),
  };
  const r = await discordSendEmbed(embed);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, messageId: r.messageId });
}
