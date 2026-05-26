'use client';
import { useState, useRef, useEffect } from 'react';
import { api, apiGetMyQuota, makeImageThumb, makeVideoThumb, uploadToSignedUrl } from '@/lib/api-client';
import { fmtBytes, fmtDuration } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

export function UploadModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [progress, setProgress] = useState(0);
  const [quota, setQuota] = useState<any>(null);
  const [aiThumbBusy, setAiThumbBusy] = useState(false);
  const [aiDescBusy, setAiDescBusy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiThumb, setShowAiThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Advanced settings
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private' | 'draft'>('public');
  const [audience, setAudience] = useState<'all' | '13plus' | '18plus' | 'subscriber'>('all');
  const [category, setCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, '').slice(0, 30);
    if (!t) return;
    if (tags.includes(t)) return;
    if (tags.length >= 10) return;
    setTags([...tags, t]);
    setTagInput('');
  }
  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  useEffect(() => { apiGetMyQuota().then(setQuota).catch(() => {}); }, []);

  async function pick(f: File) {
    setErr('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    try {
      const isVideo = f.type.startsWith('video/');
      const r = isVideo ? await makeVideoThumb(f) : await makeImageThumb(f);
      setThumb(r.thumb);
      setDuration(r.duration);
    } catch {
      setThumb('');
    }
  }

  async function pickCustomThumb(f: File) {
    if (!f.type.startsWith('image/')) {
      setErr('Thumbnail harus file gambar (JPG/PNG/GIF/WebP)');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErr('Thumbnail max 5 MB');
      return;
    }
    setErr('');
    try {
      const r = await makeImageThumb(f);
      setThumb(r.thumb);
    } catch {
      setErr('Gagal baca file thumbnail');
    }
  }

  async function generateAiThumb() {
    const prompt = aiPrompt.trim() || title.trim();
    if (!prompt) { setErr('Isi judul atau prompt dulu untuk AI thumbnail'); return; }
    setErr('');
    setAiThumbBusy(true);
    try {
      const r = await fetch('/api/ai/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.premiumRequired) setErr('🔒 ' + d.error);
        else setErr(d.error || 'AI gagal');
        return;
      }
      setThumb(d.dataURL);
    } catch (e: any) {
      setErr(e?.message || 'AI thumbnail gagal');
    } finally {
      setAiThumbBusy(false);
    }
  }

  async function generateAiDesc() {
    if (!title.trim()) { setErr('Isi judul dulu untuk AI description'); return; }
    setErr('');
    setAiDescBusy(true);
    try {
      const r = await fetch('/api/ai/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), hint: desc.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.premiumRequired) setErr('🔒 ' + d.error);
        else setErr(d.error || 'AI gagal');
        return;
      }
      setDesc(d.description);
    } catch (e: any) {
      setErr(e?.message || 'AI description gagal');
    } finally {
      setAiDescBusy(false);
    }
  }

  async function submit() {
    if (!file || !title.trim()) return;
    setBusy(true);
    setErr('');
    const isVideo = file.type.startsWith('video/');
    let videoId = '';
    try {
      const { video } = await api<any>('/api/videos', {
        method: 'POST',
        body: {
          title: title.trim(),
          description: desc.trim(),
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          type: isVideo ? 'video' : 'image',
          duration,
          thumbDataURL: thumb,
          visibility,
          audience,
          category: category.trim(),
          tags,
          allowComments,
          allowDownload,
          scheduledAt: scheduledAt || null,
        },
      });
      videoId = video.id;
      // Upload LANGSUNG ke Supabase (lewati Vercel → tidak kena batas 4.5MB)
      const { uploadUrl } = await api<{ uploadUrl: string }>(
        `/api/videos/${encodeURIComponent(video.id)}/upload-url`,
        { method: 'POST' },
      );
      await uploadToSignedUrl(uploadUrl, file, setProgress);
      // Tandai file siap diputar
      await api(`/api/videos/${encodeURIComponent(video.id)}/upload-url`, { method: 'PUT' });
      router.push('/history');
      router.refresh();
      onClose();
    } catch (e: any) {
      // Upload gagal SETELAH entri dibuat → hapus entri biar tidak jadi
      // "video hantu" di History yang tidak bisa diputar.
      if (videoId) {
        await api(`/api/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' }).catch(() => {});
      }
      const raw = String(e?.message || 'Upload gagal');
      const tooBig = /\(413\)|payload too large|exceeded.*size|maximum allowed/i.test(raw);
      setErr(
        tooBig
          ? 'File terlalu besar untuk Supabase (paket gratis Supabase batas ±50 MB per file). Pakai video lebih kecil, atau upgrade paket Supabase.'
          : raw,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl border border-border bg-bg-card p-6 shadow-xl">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-xl font-bold">{t('upload.title')}</h3>
          <button className="text-2xl text-muted hover:text-white" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">
          MP4, MOV, WebM, JPG, PNG, GIF — max{' '}
          <b className={quota?.isPremium ? 'text-warn' : 'text-text'}>
            {quota?.limits?.maxFileSizeLabel || '500 MB'}
          </b>
          {quota && (
            <span className="ml-1 text-xs">
              · plan <b>{quota.label}</b>
              {!quota.isPremium && quota.daily?.limit && <> · {quota.daily.used}/{quota.daily.limit} video hari ini</>}
            </span>
          )}
        </p>

        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-accent/50 bg-bg-elev p-6 text-center hover:bg-bg-elev/70">
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
          />
          <div className="text-3xl">📤</div>
          <div className="mt-1 font-semibold">{t('upload.file_label')}</div>
          <div className="text-xs text-muted">{t('upload.file_sub')}</div>
        </label>

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-bg-elev p-3">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
              {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{file.name}</div>
              <div className="text-xs text-muted">
                💾 {fmtBytes(file.size)} {duration > 0 && `· ${fmtDuration(duration)}`}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="label">{t('upload.title_field')}</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('upload.title_ph')}
            maxLength={100}
          />
        </div>

        {/* Thumbnail (Upload + AI) */}
        {file && (
          <div className="mt-3">
            <label className="label">{t('upload.thumb')}</label>

            {/* Preview */}
            {thumb && (
              <div className="mb-2 overflow-hidden rounded-xl border border-border bg-black">
                <img src={thumb} alt="thumbnail preview" className="aspect-video w-full object-cover" />
              </div>
            )}

            {/* Hidden thumbnail input */}
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pickCustomThumb(e.target.files[0])}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className="flex-1 rounded-xl border border-border bg-bg-elev px-3 py-2 text-xs font-semibold hover:border-accent/50"
              >
                {t('upload.thumb_own')}
              </button>
              <button
                type="button"
                onClick={() => setShowAiThumb((v) => !v)}
                className="flex-1 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs font-semibold text-warn hover:border-warn/60"
              >
                {t('upload.thumb_ai')}
                <span className="ml-1 text-[9px]">⭐</span>
              </button>
            </div>

            {showAiThumb && (
              <div className="mt-2 space-y-2 rounded-xl border border-warn/30 bg-warn/5 p-3">
                <input
                  className="input text-xs"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`Prompt AI (kosongin = pakai judul). Cth: "neon city sunset, cinematic"`}
                  maxLength={500}
                />
                <button
                  type="button"
                  onClick={generateAiThumb}
                  disabled={aiThumbBusy}
                  className="btn-primary w-full text-xs disabled:opacity-50"
                >
                  {aiThumbBusy ? '🎨 Generating… (10-30 detik)' : '✨ Generate Thumbnail with AI'}
                </button>
                <p className="text-[10px] text-muted">Pollinations.ai · gratis · 1280×720 (Premium only)</p>
              </div>
            )}

            <p className="mt-1 text-[10px] text-muted">
              Default: thumbnail di-extract otomatis dari frame video. Bisa di-replace dengan upload sendiri (JPG/PNG/GIF/WebP, max 5 MB) atau AI Generate.
            </p>
          </div>
        )}

        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label className="label">{t('upload.desc_field')}</label>
            <button
              type="button"
              onClick={generateAiDesc}
              disabled={aiDescBusy || !title.trim()}
              className="text-xs text-accent hover:underline disabled:opacity-40"
              title="AI auto-generate description (Premium)"
            >
              {aiDescBusy ? '✨ Generating…' : t('upload.ai_generate')}
              <span className="ml-1 rounded bg-warn/15 px-1 py-0.5 text-[9px] font-bold text-warn">PREMIUM</span>
            </button>
          </div>
          <textarea
            className="input min-h-[60px]"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={1500}
            placeholder={t('upload.desc_ph')}
          />
        </div>

        {/* Advanced toggler */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-elev px-3 py-2 text-sm font-semibold hover:border-accent"
          >
            <span>⚙ Pengaturan Lanjutan {tags.length > 0 && <span className="ml-1 text-xs text-accent">· {tags.length} tag</span>}</span>
            <span>{showAdvanced ? '▴' : '▾'}</span>
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-3 space-y-3 rounded-xl border border-border bg-bg-elev/50 p-3">
            {/* Visibility */}
            <div>
              <label className="label">👁 Visibilitas</label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {[
                  { v: 'public', icon: '🌐', label: 'Publik' },
                  { v: 'unlisted', icon: '🔗', label: 'Unlisted' },
                  { v: 'private', icon: '🔒', label: 'Pribadi' },
                  { v: 'draft', icon: '📝', label: 'Draf' },
                ].map((x) => (
                  <button
                    key={x.v}
                    type="button"
                    onClick={() => setVisibility(x.v as any)}
                    className={`rounded-lg border p-2 text-xs transition ${
                      visibility === x.v ? 'border-accent bg-accent/10 font-bold' : 'border-border bg-bg hover:border-accent/50'
                    }`}
                  >
                    <div className="text-base">{x.icon}</div>
                    <div className="mt-0.5">{x.label}</div>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted">
                {visibility === 'public' && 'Semua orang bisa nonton & muncul di Discover.'}
                {visibility === 'unlisted' && 'Hanya yang punya link bisa nonton. Tidak muncul di feed/search.'}
                {visibility === 'private' && 'Cuma kamu yang bisa lihat.'}
                {visibility === 'draft' && 'Disimpan tapi tidak dipublish — bisa publish nanti.'}
              </p>
            </div>

            {/* Audience */}
            <div>
              <label className="label">👥 Audiens</label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {[
                  { v: 'all', icon: '🌟', label: 'Semua usia' },
                  { v: '13plus', icon: '🧒', label: '13+' },
                  { v: '18plus', icon: '🔞', label: '18+' },
                  { v: 'subscriber', icon: '⭐', label: 'Subscriber' },
                ].map((x) => (
                  <button
                    key={x.v}
                    type="button"
                    onClick={() => setAudience(x.v as any)}
                    className={`rounded-lg border p-2 text-xs transition ${
                      audience === x.v ? 'border-accent bg-accent/10 font-bold' : 'border-border bg-bg hover:border-accent/50'
                    }`}
                  >
                    <div className="text-base">{x.icon}</div>
                    <div className="mt-0.5">{x.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="label">🏷 Kategori</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">— Pilih kategori —</option>
                <option value="vlog">📹 Vlog & Daily</option>
                <option value="gaming">🎮 Gaming</option>
                <option value="music">🎵 Musik & Cover</option>
                <option value="tutorial">📚 Tutorial</option>
                <option value="comedy">😂 Komedi</option>
                <option value="art">🎨 Seni & Kreatif</option>
                <option value="tech">💻 Tech & Review</option>
                <option value="lifestyle">✨ Lifestyle</option>
                <option value="other">🗂 Lainnya</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="label">
                #️⃣ Tag <span className="text-[10px] text-muted">({tags.length}/10)</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  className="input flex-1"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder="Tekan Enter untuk tambah"
                  maxLength={30}
                  disabled={tags.length >= 10}
                />
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  onClick={() => addTag(tagInput)}
                  disabled={!tagInput.trim() || tags.length >= 10}
                >
                  + Tambah
                </button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="hover:text-danger"
                        aria-label={`Remove ${t}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Engagement toggles */}
            <div>
              <label className="label">💬 Engagement</label>
              <div className="space-y-1.5">
                <ToggleRow label="Izinkan komentar" desc="User bisa komen di watch page" on={allowComments} onChange={() => setAllowComments((s) => !s)} />
                <ToggleRow label="Izinkan download" desc="Tampilkan tombol download di watch page" on={allowDownload} onChange={() => setAllowDownload((s) => !s)} />
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="label">⏰ Jadwalkan Publish (opsional)</label>
              <input
                type="datetime-local"
                className="input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              {scheduledAt && (
                <button
                  type="button"
                  onClick={() => setScheduledAt('')}
                  className="mt-1 text-[10px] text-muted hover:text-text"
                >
                  ✕ Hapus jadwal
                </button>
              )}
              <p className="mt-1 text-[10px] text-muted">
                Kosong = publish langsung. Diisi = video tersimpan sebagai draft sampai jam yang ditentukan.
              </p>
            </div>
          </div>
        )}

        {err && <div className="mt-3 rounded-lg bg-danger/20 p-2 text-sm text-danger">{err}</div>}
        {busy && progress > 0 && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elev">
            <div
              className="h-full bg-grad-accent transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            {t('upload.cancel')}
          </button>
          <button
            className="btn-primary"
            disabled={!file || !title.trim() || busy}
            onClick={submit}
          >
            {busy ? t('upload.uploading') : t('upload.upload')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, on, onChange }: { label: string; desc?: string; on: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-bg p-2 transition hover:border-accent">
      <div className="min-w-0">
        <div className="text-xs font-semibold">{label}</div>
        {desc && <div className="text-[10px] text-muted">{desc}</div>}
      </div>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={on}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          on ? 'bg-accent' : 'bg-bg-elev'
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}
