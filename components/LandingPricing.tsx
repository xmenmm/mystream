'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const FREE_FEATURES = [
  '✓ Upload video & gambar',
  '✓ Max 500 MB per file',
  '✓ Max 10 menit per video',
  '✓ 15 video per 24 jam',
  '✓ Total storage 500 MB',
  '✓ Like & follow creator',
  '✓ DM ke teman',
  '✓ 2FA & keamanan penuh',
  '✓ Statistics dashboard',
  '✓ Download video sendiri',
];

const PREMIUM_FEATURES = [
  '⭐ Semua fitur Free',
  '⭐ Max 10 GB per file',
  '⭐ Durasi unlimited',
  '⭐ Unlimited video / hari',
  '⭐ Storage unlimited',
  '⭐ Badge ⭐ PREMIUM di profile',
  '🌐 Multi-language UI (ID/EN/JP/AR)',
  '🎨 AI-generated thumbnail (Pollinations)',
  '📝 AI auto-description video',
  '⭐ Priority support via DM admin',
  '⭐ Lifetime tersedia',
];

type Tier = {
  id: '7d' | '30d' | '90d' | '180d' | '365d';
  label: string;
  days: number;
  price: number;
  perDay: string;
  savings?: string;
  popular?: boolean;
  bestValue?: boolean;
};

const TIERS: Tier[] = [
  { id: '7d',   label: '7 Hari',   days: 7,   price: 15000,  perDay: 'Rp 2.143/hari' },
  { id: '30d',  label: '30 Hari',  days: 30,  price: 49000,  perDay: 'Rp 1.633/hari', popular: true },
  { id: '90d',  label: '90 Hari',  days: 90,  price: 119000, perDay: 'Rp 1.322/hari', savings: 'Hemat 19%' },
  { id: '180d', label: '180 Hari', days: 180, price: 199000, perDay: 'Rp 1.106/hari', savings: 'Hemat 32%' },
  { id: '365d', label: '365 Hari', days: 365, price: 349000, perDay: 'Rp 956/hari',   savings: 'Hemat 41%', bestValue: true },
];

type PaymentMethod = {
  id: string;
  name: string;
  account: string;
  accountName: string;
  icon: string;
  color: string;
  type: 'ewallet' | 'bank';
  enabled?: boolean;
};

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

type Step = 'tier' | 'payment' | 'code';

/**
 * Controlled premium upgrade modal — bisa dipake di landing page atau dashboard.
 * Pass `open` + `onClose` props.
 */
export function PremiumUpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('tier');
  const [tier, setTier] = useState<Tier | null>(null);
  const [pay, setPay] = useState<PaymentMethod | null>(null);
  const [generating, setGenerating] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [paymentNote, setPaymentNote] = useState('');
  const [adminUsername, setAdminUsername] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return;
    setStep('tier');
    setTier(null);
    setPay(null);
    setCode(null);
    setError(null);
    setCopied(false);
  }, [open]);

  // Fetch payment methods from API when modal opens
  useEffect(() => {
    if (!open) return;
    fetch('/api/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        setMethods((data.methods || []).filter((m: PaymentMethod) => m.enabled !== false));
        setPaymentNote(data.note || '');
      })
      .catch(() => {});
  }, [open]);

  // Lock scroll & ESC to close
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  async function generateCode() {
    if (!tier || !pay) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/premium/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: tier.id, paymentMethod: pay.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError('Kamu harus login dulu untuk request kode premium.');
        } else {
          setError(data.error || 'Gagal generate kode');
        }
        setGenerating(false);
        return;
      }
      setCode(data.code);
      setAdminUsername(data.adminUsername || null);
      setStep('code');
    } catch (e: any) {
      setError(e?.message || 'network error');
    } finally {
      setGenerating(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-bg-card p-5 shadow-2xl md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-wider text-accent">
                ⭐ Premium
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted">
                <StepDot active={step === 'tier'} done={step !== 'tier'}>1</StepDot>
                <span>·</span>
                <StepDot active={step === 'payment'} done={step === 'code'}>2</StepDot>
                <span>·</span>
                <StepDot active={step === 'code'}>3</StepDot>
              </div>
            </div>
            <h3 className="mt-3 text-2xl font-extrabold md:text-3xl">
              {step === 'tier' && 'Pilih Durasi Premium'}
              {step === 'payment' && 'Pilih Metode Pembayaran'}
              {step === 'code' && '✅ Kode Premium Kamu'}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {step === 'tier' && 'Semua durasi punya fitur Premium yang sama — tinggal pilih sesuai budget kamu.'}
              {step === 'payment' && 'Pilih e-wallet atau bank untuk transfer pembayaran.'}
              {step === 'code' && 'Kirim kode ini ke admin via DM untuk konfirmasi pembayaran.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bg-elev text-muted hover:bg-danger hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* STEP 1 — TIER */}
        {step === 'tier' && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TIERS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => { setTier(t); setStep('payment'); }}
                className={`relative flex flex-col rounded-2xl border p-4 text-left transition hover:-translate-y-1 hover:border-accent/60 ${
                  t.bestValue
                    ? 'border-accent bg-accent/10 shadow-glow'
                    : t.popular
                    ? 'border-warn/50 bg-warn/5'
                    : 'border-border bg-bg-elev/40'
                }`}
              >
                {t.bestValue && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-grad-accent px-2 py-0.5 text-[10px] font-bold text-white">
                    🏆 Hemat Terbanyak
                  </div>
                )}
                {t.popular && !t.bestValue && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-warn px-2 py-0.5 text-[10px] font-bold text-white">
                    🔥 Paling Populer
                  </div>
                )}
                <div className="text-center">
                  <div className="text-sm font-bold text-muted">{t.label}</div>
                  <div className="mt-2 text-2xl font-extrabold">{fmtRp(t.price)}</div>
                  <div className="text-[10px] text-muted">{t.perDay}</div>
                </div>
                {t.savings && (
                  <div className="mx-auto mt-3 inline-block rounded-full bg-success/20 px-2 py-0.5 text-center text-[10px] font-bold text-success">
                    {t.savings}
                  </div>
                )}
                <ul className="mt-3 flex-1 space-y-1 text-[11px]">
                  <li>✓ Aktif {t.days} hari</li>
                  <li>✓ Upload 10 GB / file</li>
                  <li>✓ Unlimited videos</li>
                  <li>🎨 AI thumbnail</li>
                  <li>📝 AI auto-description</li>
                  <li>🌐 Multi-language UI</li>
                </ul>
                <div className={`mt-4 block rounded-xl py-2 text-center text-xs font-bold ${
                  t.bestValue || t.popular
                    ? 'bg-grad-accent text-white shadow-glow'
                    : 'border border-border bg-bg-card'
                }`}>
                  Pilih →
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — PAYMENT */}
        {step === 'payment' && tier && (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 p-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-accent">Plan dipilih</div>
                <div className="text-base font-bold">Premium · {tier.label}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold">{fmtRp(tier.price)}</div>
                <button
                  type="button"
                  onClick={() => setStep('tier')}
                  className="text-[10px] text-muted underline hover:text-white"
                >
                  ← ganti durasi
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">E-Wallet</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {methods.filter((p) => p.type === 'ewallet').map((p) => (
                  <PaymentTile key={p.id} pm={p} onClick={() => setPay(p)} active={pay?.id === p.id} />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Transfer Bank</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {methods.filter((p) => p.type === 'bank').map((p) => (
                  <PaymentTile key={p.id} pm={p} onClick={() => setPay(p)} active={pay?.id === p.id} />
                ))}
              </div>
            </div>

            {pay && (
              <div className="rounded-xl border-2 border-accent bg-bg-elev p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${pay.color}`}>
                    {pay.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{pay.name}</div>
                    <div className="mt-1 break-all font-mono text-base text-accent">
                      {pay.account || <span className="text-warn italic">Belum diatur admin — hubungi admin di DM</span>}
                    </div>
                    <div className="text-[11px] text-muted">a.n. {pay.accountName || '—'}</div>
                    <div className="mt-2 text-[10px] text-muted">
                      💡 Transfer <b className="text-warn">{fmtRp(tier.price)}</b> ke nomor di atas, lalu klik tombol di bawah untuk dapat kode.
                    </div>
                  </div>
                </div>
              </div>
            )}
            {paymentNote && (
              <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs">
                <b className="text-warn">📝 Catatan admin:</b>
                <p className="mt-1 whitespace-pre-wrap text-text/90">{paymentNote}</p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStep('tier')} className="btn-ghost">
                ← Kembali
              </button>
              <button
                type="button"
                onClick={generateCode}
                disabled={!pay || generating}
                className="btn-primary disabled:opacity-50"
              >
                {generating ? 'Generating…' : '✓ Saya sudah bayar — Dapatkan Kode'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — CODE */}
        {step === 'code' && code && tier && pay && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border-2 border-success bg-success/5 p-6 text-center">
              <div className="text-xs uppercase tracking-wider text-success">Kode Premium · Salin & kirim ke admin</div>
              <div className="my-4 select-all break-all font-mono text-xl font-extrabold text-text md:text-2xl">
                {code}
              </div>
              <button type="button" onClick={copyCode} className="btn-primary">
                {copied ? '✓ Tersalin!' : '📋 Salin Kode'}
              </button>
            </div>

            <div className="grid gap-3 rounded-xl border border-border bg-bg-elev p-4 sm:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Plan</div>
                <div className="text-sm font-bold">Premium · {tier.label}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Total</div>
                <div className="text-sm font-bold">{fmtRp(tier.price)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Via</div>
                <div className="text-sm font-bold">{pay.icon} {pay.name}</div>
              </div>
            </div>

            <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
              <div className="font-bold text-success">✅ Chat admin udah dibuat otomatis!</div>
              <p className="mt-2 text-text/90">
                Kami udah kirim pesan otomatis ke admin atas nama kamu — kode + detail plan udah include.
                Admin juga udah balas dengan instruksi pembayaran. Tinggal klik tombol di bawah untuk:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-text/90">
                <li>Transfer <b>{fmtRp(tier.price)}</b> ke {pay.name}.</li>
                <li><b>Kirim foto bukti transfer</b> ke chat admin (bisa attach gambar 📎).</li>
                <li>Tunggu max <b>1×24 jam</b> — admin verifikasi → premium auto-aktif.</li>
              </ol>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-ghost">
                Tutup
              </button>
              <Link
                href={adminUsername ? `/messages/${encodeURIComponent(adminUsername)}` : '/messages'}
                className="btn-primary"
              >
                💬 Buka Chat Admin
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Landing page pricing — 2 cards (Free + Premium) + tombol buka modal */
export function LandingPricing() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card relative flex flex-col">
          <div className="text-center">
            <h3 className="text-2xl font-bold">Free</h3>
            <div className="mt-3 text-4xl font-extrabold">Rp 0</div>
            <div className="text-xs text-muted">selamanya</div>
          </div>
          <ul className="mt-6 flex-1 space-y-2 text-sm">
            {FREE_FEATURES.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          <Link href="/signup" className="mt-6 block text-center btn-ghost">
            Mulai Gratis
          </Link>
        </div>

        <div className="card relative flex flex-col border-2 border-accent shadow-glow">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-grad-accent px-3 py-1 text-xs font-bold text-white">
            ⭐ Best Value
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold">Premium</h3>
            <div className="mt-3 text-4xl font-extrabold text-text">
              Mulai Rp 15K
            </div>
            <div className="text-xs text-muted">5 pilihan durasi · 7 hari sampai setahun</div>
          </div>
          <ul className="mt-6 flex-1 space-y-2 text-sm">
            {PREMIUM_FEATURES.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 block w-full btn-primary"
          >
            🚀 Lihat Harga Premium
          </button>
        </div>
      </div>

      <PremiumUpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function StepDot({ active, done, children }: { active?: boolean; done?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
        active ? 'bg-accent text-white' : done ? 'bg-success/30 text-success' : 'bg-bg-elev text-muted'
      }`}
    >
      {done ? '✓' : children}
    </span>
  );
}

function PaymentTile({ pm, onClick, active }: { pm: PaymentMethod; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${
        active ? 'border-accent bg-accent/15 shadow-glow' : 'border-border bg-bg-elev/40 hover:border-accent/50'
      }`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg ${pm.color}`}>{pm.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{pm.name}</div>
        <div className="truncate text-[10px] text-muted">{pm.account || 'Belum diatur'}</div>
      </div>
      {active && <span className="text-accent">✓</span>}
    </button>
  );
}
