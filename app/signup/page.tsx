'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiGetCaptcha } from '@/lib/api-client';

export default function SignupPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-muted">Loading…</div>}>
      <SignupPage />
    </Suspense>
  );
}

function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
  } catch {}
  return '/dashboard';
}

function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [username, setU] = useState('');
  const [email, setE] = useState('');
  const [password, setP] = useState('');
  const [captchaCode, setCC] = useState('');
  const [captcha, setCaptcha] = useState<{ id: string; image: string } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadCaptcha() {
    try { setCaptcha(await apiGetCaptcha()); setCC(''); } catch {}
  }
  useEffect(() => { loadCaptcha(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (!captcha) throw new Error('Captcha belum ke-load');
      await api('/api/signup', {
        method: 'POST',
        body: { username, email, password, captchaId: captcha.id, captchaCode },
      });
      router.push(`/welcome?next=${encodeURIComponent(next)}&user=${encodeURIComponent(username)}`);
    } catch (e: any) {
      setErr(e.message || 'Signup gagal');
      loadCaptcha();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center p-4">
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-bg-card/80 p-6 shadow-2xl backdrop-blur-xl"
      >
        <Link href="/" className="mb-2 inline-flex items-center gap-2 text-sm text-muted">← Beranda</Link>
        <h1 className="text-2xl font-bold">Daftar MyStream</h1>
        <p className="mt-1 text-sm text-muted">Gratis selamanya. Mulai upload dalam hitungan detik.</p>
        <div className="mt-5">
          <label className="label">Username</label>
          <input className="input" value={username} onChange={(e) => setU(e.target.value)} minLength={3} required />
        </div>
        <div className="mt-3">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setE(e.target.value)} required />
        </div>
        <div className="mt-3">
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setP(e.target.value)} minLength={6} required />
        </div>
        <div className="mt-3">
          <label className="label">Captcha — ketik kode di gambar (anti-bot)</label>
          <div className="flex gap-2 items-stretch">
            <div className="flex-1 min-w-0 rounded-xl border border-border bg-bg-elev p-1 grid place-items-center min-h-[64px]">
              {captcha
                ? <img src={captcha.image} alt="captcha" className="w-full h-auto rounded-lg" />
                : <span className="text-xs text-muted">Loading…</span>}
            </div>
            <button type="button" onClick={loadCaptcha} className="btn-ghost px-3 text-lg" title="Ganti gambar">↻</button>
          </div>
          <input
            className="input mt-2 text-center font-mono uppercase tracking-[6px]"
            value={captchaCode}
            onChange={(e) => setCC(e.target.value)}
            maxLength={8}
            placeholder="ABCDE"
            required
            autoComplete="off"
          />
        </div>
        {err && <div className="mt-3 rounded-lg bg-danger/20 p-2 text-sm text-danger">{err}</div>}
        <button className="btn-primary mt-5 w-full" disabled={busy}>
          {busy ? 'Loading…' : '✨ Daftar Sekarang'}
        </button>
        <p className="mt-4 text-center text-sm text-muted">
          Sudah punya akun? <Link href="/login" className="text-accent">Login</Link>
        </p>
      </form>
    </div>
  );
}
