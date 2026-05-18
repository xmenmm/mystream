'use client';
import Link from 'next/link';
import { thumbUrl } from '@/lib/api-client';
import { fmtBytes, fmtDuration, fmtNum, timeAgo } from '@/lib/utils';

export type VideoLike = {
  id: string;
  title: string;
  type: string;
  hasThumb: boolean;
  duration: number;
  size: number;
  views: number;
  likes: number;
  uploadedAt: string;
};

export function VideoCard({ v, onDelete }: { v: VideoLike; onDelete?: () => void }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-bg-card transition hover:border-accent/60">
      <Link href={`/watch?id=${v.id}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-black">
          {v.hasThumb ? (
            <img
              src={thumbUrl(v.id)}
              alt={v.title}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl text-muted/40">🎬</div>
          )}
          <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs uppercase">
            {v.type === 'image' ? 'Image' : 'Video'}
          </span>
          {v.duration > 0 && (
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs">
              {fmtDuration(v.duration)}
            </span>
          )}
        </div>
      </Link>
      <div className="p-3">
        <Link href={`/watch?id=${v.id}`} className="line-clamp-2 font-semibold hover:text-accent">
          {v.title}
        </Link>
        <div className="mt-1 text-xs text-muted">
          {timeAgo(v.uploadedAt)} · {fmtBytes(v.size)}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
          <span>👁 {fmtNum(v.views)}</span>
          <span>👍 {fmtNum(v.likes)}</span>
          {onDelete && (
            <button
              onClick={onDelete}
              className="ml-auto text-danger hover:opacity-80"
              aria-label="Delete"
              title="Delete"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
