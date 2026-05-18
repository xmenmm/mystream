'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiDiscordSend, apiDailyReport, apiGenerateImage, apiGetGlobalLayers, apiSetGlobalLayers } from '@/lib/api-client';

type Layer = { url: string; label?: string };

export function AdminTools() {
  const [tool, setTool] = useState<null | 'gen' | 'discord' | 'daily' | 'layers'>(null);

  const TOOLS: { key: any; icon: string; title: string; desc: string; onClick: () => void }[] = [
    {
      key: 'gen', icon: '🎨', title: 'Generate Image',
      desc: 'AI banner / logo / thumbnail (Pollinations.ai)',
      onClick: () => setTool('gen'),
    },
    {
      key: 'layers', icon: '🔗', title: 'Player Layers (Global)',
      desc: 'Sponsor links berlaku untuk SEMUA video — set sekali, otomatis kena semua',
      onClick: () => setTool('layers'),
    },
    {
      key: 'discord', icon: '💬', title: 'Send to Discord',
      desc: 'Notif manual ke #hasil-claude',
      onClick: () => setTool('discord'),
    },
    {
      key: 'daily', icon: '📊', title: 'Daily Report',
      desc: 'Trigger laporan harian ke Discord',
      onClick: () => setTool('daily'),
    },
  ];

  return (
    <section className="card overflow-hidden p-0 border-warn/30">
      <header className="flex items-center justify-between bg-grad-accent p-3">
        <h2 className="font-bold flex items-center gap-2">🛠 Admin Tools</h2>
        <span className="text-xs opacity-85">Quick actions</span>
      </header>
      <div className="space-y-2 p-3">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            onClick={t.onClick}
            className="flex w-full items-start gap-3 rounded-xl border border-border bg-bg p-3 text-left transition hover:border-accent hover:bg-accent/5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bg-elev text-lg">{t.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{t.title}</div>
              <div className="text-xs text-muted">{t.desc}</div>
            </div>
            <span className="text-muted">→</span>
          </button>
        ))}

        {/* INFO: Running Text di Banner tab */}
        <div className="rounded-xl border border-border bg-bg p-3 text-xs text-muted">
          <div className="flex items-start gap-2">
            <span className="text-base">📢</span>
            <div>
              <div className="font-bold text-text">Running Text & Banner</div>
              <div className="mt-1">
                Set di <b>Admin Control Panel → tab 🖼 Banner</b> (scroll bawah). Muncul di semua watch page.
              </div>
            </div>
          </div>
        </div>
      </div>

      {tool === 'gen' && <GenerateImageModal onClose={() => setTool(null)} />}
      {tool === 'discord' && <SendDiscordModal onClose={() => setTool(null)} />}
      {tool === 'daily' && <DailyReportModal onClose={() => setTool(null)} />}
      {tool === 'layers' && <GlobalLayersModal onClose={() => setTool(null)} />}
    </section>
  );
}


function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === 'undefined') return null;
  // Portal ke body supaya tidak terjebak containing-block parent yang punya will-change/transform
  return createPortal(
    <div className="fixed inset-0 z-[9000] grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-2xl text-muted hover:text-text" aria-label="Tutup">×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function GenerateImageModal({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState('MyStream banner — purple neon, video play icon, modern abstract');
  const [w, setW] = useState(1024);
  const [h, setH] = useState(384);
  const [model, setModel] = useState('flux');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ url: string; prompt: string } | null>(null);

  async function gen() {
    setBusy(true); setErr(''); setResult(null);
    try {
      const r = await apiGenerateImage(prompt, { width: w, height: h, model });
      setResult(r);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function copyUrl() {
    if (!result) return;
    navigator.clipboard.writeText(result.url).then(() => alert('✓ URL gambar tersalin'));
  }

  return (
    <ModalShell title="🎨 Generate Image" onClose={onClose}>
      <label className="text-xs text-muted">Prompt</label>
      <textarea
        className="input min-h-[80px]"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Deskripsikan gambar yang mau dibuat..."
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-muted">Width</label>
          <input type="number" className="input" value={w} onChange={(e) => setW(Number(e.target.value) || 1024)} min={64} max={2048} step={64} />
        </div>
        <div>
          <label className="text-xs text-muted">Height</label>
          <input type="number" className="input" value={h} onChange={(e) => setH(Number(e.target.value) || 1024)} min={64} max={2048} step={64} />
        </div>
        <div>
          <label className="text-xs text-muted">Model</label>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="flux">flux</option>
            <option value="flux-realism">flux-realism</option>
            <option value="flux-anime">flux-anime</option>
            <option value="flux-3d">flux-3d</option>
            <option value="turbo">turbo</option>
          </select>
        </div>
      </div>
      <button onClick={gen} disabled={busy || !prompt.trim()} className="btn-primary mt-4 w-full">
        {busy ? 'Generating…' : '✨ Generate'}
      </button>

      {err && <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{err}</div>}
      {result && (
        <div className="mt-4 space-y-2">
          <img src={result.url} alt={result.prompt} className="w-full rounded-xl border border-border" />
          <div className="flex gap-2">
            <button onClick={copyUrl} className="btn-ghost flex-1 text-xs">📋 Copy URL</button>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">↗ Buka</a>
          </div>
          <p className="text-[10px] text-muted">Gunakan URL ini di Banner admin → Image URL untuk pakai sebagai banner.</p>
        </div>
      )}
    </ModalShell>
  );
}

function SendDiscordModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function send() {
    if (!text.trim()) return;
    setBusy(true); setMsg('');
    try {
      await apiDiscordSend(text.trim());
      setMsg('✓ Terkirim ke Discord');
      setText('');
    } catch (e: any) { setMsg('Gagal: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell title="💬 Send to Discord" onClose={onClose}>
      <label className="text-xs text-muted">Pesan (max 2000 char)</label>
      <textarea
        className="input min-h-[120px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        placeholder="Tulis notif/anouncement untuk #hasil-claude..."
      />
      {msg && <div className="mt-3 text-xs">{msg}</div>}
      <button onClick={send} disabled={busy || !text.trim()} className="btn-primary mt-4 w-full">
        {busy ? 'Mengirim…' : '📤 Kirim'}
      </button>
    </ModalShell>
  );
}

function DailyReportModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function trigger() {
    setBusy(true); setMsg('');
    try {
      await apiDailyReport();
      setMsg('✓ Daily report terkirim ke Discord');
    } catch (e: any) { setMsg('Gagal: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell title="📊 Daily Report" onClose={onClose}>
      <p className="text-sm text-muted">
        Kirim laporan harian (stats 24 jam, top video, total views) ke Discord channel #hasil-claude.
      </p>
      {msg && <div className="mt-3 text-xs">{msg}</div>}
      <button onClick={trigger} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? 'Mengirim…' : '🚀 Trigger Report'}
      </button>
    </ModalShell>
  );
}

function GlobalLayersModal({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiGetGlobalLayers()
      .then((g) => {
        setEnabled(!!g.enabled);
        setLayers(Array.isArray(g.layers) ? g.layers : []);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  function add() {
    if (layers.length >= 5) return;
    setLayers([...layers, { url: '', label: '' }]);
  }
  function update(i: number, patch: Partial<Layer>) {
    setLayers(layers.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function remove(i: number) {
    setLayers(layers.filter((_, idx) => idx !== i));
  }
  async function save() {
    setSaving(true); setErr(''); setMsg('');
    try {
      const cleaned = layers.filter((l) => /^https?:\/\//i.test(l.url || ''));
      await apiSetGlobalLayers({ enabled, layers: cleaned });
      setLayers(cleaned);
      setMsg('✓ Tersimpan — berlaku untuk semua video sekarang');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell title="🔗 Global Player Layers" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            Layers di sini berlaku untuk <b className="text-warn">SEMUA video</b> (lama + baru, login + non-login share).
            Tiap layer = 1 sponsor link, user wajib klik semuanya berurutan baru video play. Max 5 layer.
          </p>

          <label className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-bg p-2.5 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
            <span className="font-semibold">Aktifkan layers global</span>
            <span className="ml-auto text-[10px] text-muted">Off = video play langsung</span>
          </label>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold">{layers.length}/5 layer</span>
            <button
              onClick={add}
              disabled={layers.length >= 5}
              className="rounded border border-border px-2 py-0.5 text-xs disabled:opacity-50"
            >
              + Tambah Layer
            </button>
          </div>

          <div className="space-y-2">
            {layers.length === 0 && <p className="text-xs text-muted">Belum ada layer — tambah satu di atas.</p>}
            {layers.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-bg text-xs font-bold">
                  {i + 1}
                </span>
                <input
                  className="input min-w-0 flex-1"
                  placeholder="https://link-sponsor.com"
                  value={l.url}
                  onChange={(e) => update(i, { url: e.target.value })}
                />
                <input
                  className="input w-full sm:w-32"
                  placeholder="Label (opsional)"
                  value={l.label || ''}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
                <button
                  onClick={() => remove(i)}
                  className="rounded-md border border-danger/40 bg-danger/10 px-3 text-xs text-danger"
                  aria-label="Hapus layer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {err && <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{err}</div>}
          {msg && <div className="mt-3 rounded-md border border-success/30 bg-success/10 p-2 text-xs text-success">{msg}</div>}

          <button onClick={save} disabled={saving} className="btn-primary mt-4 w-full">
            {saving ? 'Menyimpan…' : '💾 Simpan Global Layers'}
          </button>
        </>
      )}
    </ModalShell>
  );
}
