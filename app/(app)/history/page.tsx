'use client';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { VideoCard, VideoLike } from '@/components/VideoCard';
import { useT } from '@/lib/i18n';

export default function HistoryPage() {
  const { me } = useMe();
  const t = useT();
  const [videos, setVideos] = useState<VideoLike[]>([]);
  const [filter, setFilter] = useState<'all' | 'video' | 'image'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('mystream_history_pagesize') || '12', 10);
    if (saved) setPageSize(saved);
  }, []);

  const refresh = () =>
    api<{ videos: any[] }>('/api/videos?user=me').then((r) =>
      setVideos(r.videos.sort((a: any, b: any) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))),
    );
  useEffect(() => { if (me) refresh(); }, [me]);

  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    videos.forEach((v) => {
      const f = (v as any).folder || '';
      counts.set(f, (counts.get(f) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [videos]);

  const filtered = useMemo(
    () => videos.filter((v) => {
      if (filter !== 'all' && v.type !== filter) return false;
      if (selectedFolder !== 'all') {
        const vf = ((v as any).folder || '') as string;
        if (selectedFolder === '_none' ? vf !== '' : vf !== selectedFolder) return false;
      }
      return true;
    }),
    [videos, filter, selectedFolder],
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  function pageList(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const r: (number | '...')[] = [1];
    if (safePage > 3) r.push('...');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) r.push(i);
    if (safePage < totalPages - 2) r.push('...');
    r.push(totalPages);
    return r;
  }

  async function del(id: string) {
    if (!confirm(t('history.confirm_delete'))) return;
    await api(`/api/videos/${encodeURIComponent(id)}`, { method: 'DELETE' });
    refresh();
  }

  if (!me) return null;

  const totalVideos = videos.filter((v) => v.type === 'video').length;
  const totalImages = videos.filter((v) => v.type === 'image').length;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">{t('history.title')}</h1>
          <p className="text-sm text-muted">{videos.length} {t('history.unit_item')} · {totalVideos} {t('history.unit_video')} · {totalImages} {t('history.unit_image')}</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'video', 'image'] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={filter === f ? 'btn-primary' : 'btn-ghost'}>
              {f === 'all' ? t('history.filter_all') : f === 'video' ? t('history.filter_videos') : t('history.filter_images')}
            </button>
          ))}
        </div>
      </header>
      {/* FOLDER GRID — DoodStream-style file manager */}
      {folders.length > 0 && (
        <section className="card">
          <h3 className="mb-3 text-sm font-bold text-muted">📁 Folder</h3>
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            <FolderChip
              icon="📚"
              label="Semua"
              count={videos.length}
              active={selectedFolder === 'all'}
              onClick={() => { setSelectedFolder('all'); setPage(1); }}
            />
            {folders.map((f) => (
              <FolderChip
                key={f.name || '_none'}
                icon={f.name ? '📁' : '📭'}
                label={f.name || 'Tanpa Folder'}
                count={f.count}
                active={selectedFolder === (f.name || '_none')}
                onClick={() => { setSelectedFolder(f.name || '_none'); setPage(1); }}
              />
            ))}
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <div className="card text-center text-muted">{t('history.empty')}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => <VideoCard key={v.id} v={v} onDelete={() => del(v.id)} />)}
        </div>
      )}

      {total > 8 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-sm text-muted">
            {t('history.showing')} <b>{start + 1}–{start + items.length}</b> {t('history.of')} <b>{total}</b>
            <select
              className="ml-3 input inline-block w-auto"
              value={pageSize}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setPageSize(n);
                localStorage.setItem('mystream_history_pagesize', String(n));
                setPage(1);
              }}
            >
              {[4, 8, 12, 24, 48].map((n) => <option key={n} value={n}>{n} {t('history.per_page')}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost px-3" disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
            <button className="btn-ghost px-3" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>‹</button>
            {pageList().map((p, i) =>
              p === '...'
                ? <span key={i} className="px-2 text-muted">…</span>
                : <button key={p} className={p === safePage ? 'btn-primary px-3' : 'btn-ghost px-3'} onClick={() => setPage(p as number)}>{p}</button>
            )}
            <button className="btn-ghost px-3" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>›</button>
            <button className="btn-ghost px-3" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FolderChip({ icon, label, count, active, onClick }: { icon: string; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs transition ${
        active ? 'border-accent bg-accent/15 font-bold' : 'border-border bg-bg hover:border-accent/50'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{label}</div>
        <div className="text-[10px] text-muted">{count} {count === 1 ? 'item' : 'item'}</div>
      </div>
    </button>
  );
}
