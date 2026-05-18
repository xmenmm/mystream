import { NextRequest, NextResponse } from 'next/server';
import { loadDB } from '@/lib/db';

export const runtime = 'nodejs';

/** Public search — videos + users by keyword.
 *  Query: ?q=<keyword>&limit=<n> (default 10) */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));

  if (!q) {
    return NextResponse.json({ q: '', videos: [], users: [], total: 0 });
  }

  const db = await loadDB();

  // Search videos by title, description, username
  const videoMatches = db.videos
    .filter((v) => {
      const title = (v.title || '').toLowerCase();
      const desc = (v.description || '').toLowerCase();
      const user = v.username.toLowerCase();
      return title.includes(q) || desc.includes(q) || user.includes(q);
    })
    .map((v) => ({
      id: v.id,
      title: v.title,
      username: v.username,
      hasThumb: v.hasThumb,
      type: v.type,
      duration: v.duration,
      views: v.views || 0,
      likes: v.likes || 0,
      uploadedAt: v.uploadedAt,
      // Score: title match > username match > description match
      _score:
        ((v.title || '').toLowerCase().startsWith(q) ? 100 : 0) +
        ((v.title || '').toLowerCase().includes(q) ? 50 : 0) +
        (v.username.toLowerCase().includes(q) ? 30 : 0) +
        ((v.description || '').toLowerCase().includes(q) ? 10 : 0) +
        Math.log10((v.views || 0) + 1) * 2,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...v }) => v);

  // Search users by username, bio
  const userMatches = db.users
    .filter((u) => {
      const username = u.username.toLowerCase();
      const bio = (u.bio || '').toLowerCase();
      return username.includes(q) || bio.includes(q);
    })
    .map((u) => {
      const videoCount = db.videos.filter((v) => v.username === u.username).length;
      const totalViews = db.videos
        .filter((v) => v.username === u.username)
        .reduce((s, v) => s + (v.views || 0), 0);
      return {
        username: u.username,
        bio: u.bio || '',
        avatarColor: u.avatarColor || '#8b5cf6',
        isAdmin: !!u.isAdmin,
        isPremium: !!u.isPremium,
        isVerified: !!u.isVerified,
        videoCount,
        totalViews,
        _score:
          (u.username.toLowerCase().startsWith(q) ? 100 : 0) +
          (u.username.toLowerCase().includes(q) ? 50 : 0) +
          ((u.bio || '').toLowerCase().includes(q) ? 20 : 0) +
          Math.log10(videoCount + 1) * 5,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...u }) => u);

  return NextResponse.json({
    q,
    videos: videoMatches,
    users: userMatches,
    total: videoMatches.length + userMatches.length,
  });
}
