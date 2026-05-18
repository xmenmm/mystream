'use client';
import { useEffect, useRef, useState } from 'react';
import { AdminGate } from '../AdminGate';
import { fmtBytes, fmtDuration, timeAgo } from '@/lib/utils';

type Ad = {
  id: string;
  title: string;
  mimeType: string;
  size: number;
  duration?: number;
  uploadedAt: string;
  enabled: boolean;
  url?: string;
};
type Cfg = {
  enabled: boolean;
  intervalSec: number;
  skipAfterSec: number;
  randomOrder: boolean;
  randomInterval: boolean;
  intervalMinSec: number;
  intervalMaxSec: number;
  ads: Ad[];
};

export default function AdminAdsPage() {
  return (
    <AdminGate icon="📺" title="Iklan" desc="Iklan otomatis muncul di video user. Atur interval + skip delay + upload iklan baru.">
      <AdsPanel />
    </AdminGate>
  );
}

function AdsPanel() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadProg, setUploadProg] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch('/api/admin/ads', { credentials: 'include' });
    if (r.ok) setCfg(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function patchConfig(patch: Partial<Cfg>) {
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Gagal simpan'); }
      const j = await r.json();
      setCfg((c) => c ? { ...c, ...j.config } : c);
      setMsg('✓ Tersimpan');
      setTimeout(() => setMsg(''), 2000);
    } catch (e: any) {
      setMsg('⚠ ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAd() {
    const f = fileRef.current?.files?.[0];
    if (!f) return alert('Pilih file dulu');
    const title = prompt('Judul iklan:', f.name.replace(/\.[^.]+$/, '')) || '';
    if (!title.trim()) return;
    const adUrl = (prompt('URL tujuan saat user klik "Daftar Sekarang" (opsional, https://...):', 'https://') || '').trim();

    // Detect duration (kalau video, baca dari metadata)
    let duration: number | undefined;
    if (f.type.startsWith('video/')) {
      try {
        duration = await new Promise<number>((resolve, reject) => {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.onloadedmetadata = () => resolve(v.duration);
          v.onerror = () => reject(new Error('Tidak bisa baca duration'));
          v.src = URL.createObjectURL(f);
        });
      } catch { duration = undefined; }
    }

    setBusy(true);
    setUploadProg(0);
    setMsg('');
    try {
      // Pakai XHR untuk progress tracking
      const j: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const qs = new URLSearchParams({ title: title.trim() });
        if (duration) qs.set('duration', String(duration));
        if (/^https?:\/\//i.test(adUrl)) qs.set('url', adUrl);
        xhr.open('POST', '/api/admin/ads?' + qs.toString(), true);
        xhr.setRequestHeader('Content-Type', f.type);
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProg(e.loaded / e.total);
        };
        xhr.onload = () => {
          try {
            const body = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(body);
            else reject(new Error(body.error || ('HTTP ' + xhr.status)));
          } catch { reject(new Error('parse error')); }
        };
        xhr.onerror = () => reject(new Error('network error'));
        xhr.send(f);
      });
      setCfg((c) => c ? { ...c, ads: [...c.ads, j.ad] } : c);
      setMsg('✓ Iklan ditambah');
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) {
      setMsg('⚠ ' + e.message);
    } finally {
      setBusy(false);
      setUploadProg(null);
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    const r = await fetch('/api/admin/ads/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled }),
    });
    if (r.ok) {
      setCfg((c) => c ? { ...c, ads: c.ads.map((a) => a.id === id ? { ...a, enabled } : a) } : c);
    }
  }

  async function saveAdUrl(id: string, url: string) {
    const r = await fetch('/api/admin/ads/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url }),
    });
    if (r.ok) {
      const j = await r.json();
      setCfg((c) => c ? { ...c, ads: c.ads.map((a) => a.id === id ? { ...a, url: j.ad?.url } : a) } : c);
      setMsg('✓ URL iklan tersimpan');
      setTimeout(() => setMsg(''), 2000);
    }
  }

  async function delAd(id: string) {
    if (!confirm('Hapus iklan ini?')) return;
    const r = await fetch('/api/admin/ads/' + id, { method: 'DELETE', credentials: 'include' });
    if (r.ok) {
      setCfg((c) => c ? { ...c, ads: c.ads.filter((a) => a.id !== id) } : c);
    }
  }

  if (!cfg) return <div className="text-muted">Loading…</div>;

  const intervalMin = (cfg.intervalSec / 60).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="card space-y-3">
        <h3 className="text-sm font-bold">⚙ Pengaturan</h3>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">Aktifkan iklan untuk semua user</span>
          <input
            type="checkbox"
            checked={cfg.enabled}
            disabled={busy}
            onChange={(e) => patchConfig({ enabled: e.target.checked })}
            className="h-5 w-5 accent-warn"
          />
        </label>
        {/* Acak urutan iklan */}
        <label className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm">Acak urutan iklan</div>
            <div className="text-xs text-muted">{cfg.randomOrder ? 'Iklan dipilih acak tiap muncul' : 'Iklan tampil urut sesuai daftar'}</div>
          </div>
          <input
            type="checkbox"
            checked={cfg.randomOrder}
            disabled={busy}
            onChange={(e) => patchConfig({ randomOrder: e.target.checked })}
            className="h-5 w-5 accent-warn"
          />
        </label>

        {/* Acak interval */}
        <label className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm">Acak interval muncul</div>
            <div className="text-xs text-muted">{cfg.randomInterval ? 'Jeda iklan acak antara min–max detik' : 'Jeda iklan tetap (fixed)'}</div>
          </div>
          <input
            type="checkbox"
            checked={cfg.randomInterval}
            disabled={busy}
            onChange={(e) => patchConfig({ randomInterval: e.target.checked })}
            className="h-5 w-5 accent-warn"
          />
        </label>

        {!cfg.randomInterval ? (
          <label className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm">Interval muncul (detik)</div>
              <div className="text-xs text-muted">Tiap {intervalMin} menit selama nonton</div>
            </div>
            <input
              type="number" min={10} max={3600} step={10}
              value={cfg.intervalSec}
              disabled={busy}
              onChange={(e) => setCfg((c) => c ? { ...c, intervalSec: Number(e.target.value) } : c)}
              onBlur={(e) => patchConfig({ intervalSec: Number(e.target.value) })}
              className="w-24 rounded-md border border-border bg-bg px-2 py-1 text-right text-sm text-text"
            />
          </label>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">Interval acak (detik)</div>
            <div className="flex items-center gap-2">
              <input
                type="number" min={10} max={3600} step={5}
                value={cfg.intervalMinSec}
                disabled={busy}
                onChange={(e) => setCfg((c) => c ? { ...c, intervalMinSec: Number(e.target.value) } : c)}
                onBlur={(e) => patchConfig({ intervalMinSec: Number(e.target.value) })}
                className="w-20 rounded-md border border-border bg-bg px-2 py-1 text-right text-sm text-text"
                title="Minimal"
              />
              <span className="text-xs text-muted">s/d</span>
              <input
                type="number" min={10} max={3600} step={5}
                value={cfg.intervalMaxSec}
                disabled={busy}
                onChange={(e) => setCfg((c) => c ? { ...c, intervalMaxSec: Number(e.target.value) } : c)}
                onBlur={(e) => patchConfig({ intervalMaxSec: Number(e.target.value) })}
                className="w-20 rounded-md border border-border bg-bg px-2 py-1 text-right text-sm text-text"
                title="Maksimal"
              />
            </div>
          </div>
        )}
        <label className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm">Skip aktif setelah</div>
            <div className="text-xs text-muted">User bisa skip iklan setelah {cfg.skipAfterSec} detik nonton</div>
          </div>
          <input
            type="number"
            min={0}
            max={60}
            step={1}
            value={cfg.skipAfterSec}
            disabled={busy}
            onChange={(e) => setCfg((c) => c ? { ...c, skipAfterSec: Number(e.target.value) } : c)}
            onBlur={(e) => patchConfig({ skipAfterSec: Number(e.target.value) })}
            className="w-24 rounded-md border border-border bg-bg px-2 py-1 text-right text-sm text-text"
          />
        </label>
        {msg && <div className="text-xs text-muted">{msg}</div>}
      </div>

      {/* Upload */}
      <div className="card space-y-3">
        <h3 className="text-sm font-bold">➕ Upload Iklan Baru</h3>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          disabled={busy}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-warn file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-black hover:file:bg-warn/80"
        />
        <button
          onClick={uploadAd}
          disabled={busy}
          className="btn-primary"
        >
          {uploadProg !== null ? `Upload ${Math.round(uploadProg * 100)}%` : 'Upload'}
        </button>
        <p className="text-xs text-muted">Mendukung video/* dan image/*. Max 500 MB.</p>
      </div>

      {/* List */}
      <div className="card space-y-2">
        <h3 className="text-sm font-bold">📋 Daftar Iklan ({cfg.ads.length})</h3>
        {cfg.ads.length === 0 && (
          <p className="text-xs text-muted">Belum ada iklan. Upload satu di atas.</p>
        )}
        {cfg.ads.map((ad) => (
          <div key={ad.id} className="space-y-2 rounded-lg border border-border bg-bg p-2">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-14 shrink-0 place-items-center rounded bg-black text-xl">
                {ad.mimeType.startsWith('video/') ? '🎬' : '🖼'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{ad.title}</div>
                <div className="text-xs text-muted">
                  {fmtBytes(ad.size)}
                  {ad.duration ? ' · ' + fmtDuration(ad.duration) : ''}
                  {' · ' + timeAgo(ad.uploadedAt)}
                </div>
              </div>
              <label className="flex shrink-0 items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={ad.enabled}
                  onChange={(e) => toggleEnabled(ad.id, e.target.checked)}
                  className="h-4 w-4 accent-warn"
                />
                On
              </label>
              <button
                onClick={() => delAd(ad.id)}
                className="rounded-md border border-danger/50 px-2 py-1 text-xs text-danger hover:bg-danger/10"
              >
                Hapus
              </button>
            </div>
            {/* URL tujuan klik "Daftar Sekarang" */}
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted">🔗 URL:</span>
              <input
                type="url"
                placeholder="https://... (tujuan klik Daftar Sekarang)"
                defaultValue={ad.url || ''}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (ad.url || '')) saveAdUrl(ad.id, v);
                }}
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-elev px-2 py-1 text-xs text-text"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
