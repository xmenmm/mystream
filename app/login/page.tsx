'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiVerify2FA } from '@/lib/api-client';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-muted">Loading…</div>}>
      <LoginPage />
    </Suspense>
  );
}

function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  // Cegah open-redirect: hanya path internal yg dibolehin
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
  } catch {}
  return '/dashboard';
}

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // 2FA gate state — kalau di-set, form jadi prompt code
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (tempToken) {
        // Step 2: verify TOTP code
        if (!/^\d{6}$/.test(code)) throw new Error('Kode harus 6 digit');
        const r = await apiVerify2FA(tempToken, code);
        const u = r?.user?.username || '';
        router.push(`/welcome?next=${encodeURIComponent(next)}${u ? '&user=' + encodeURIComponent(u) : ''}`);
      } else {
        // Step 1: password
        const r = await api<any>('/api/login', { method: 'POST', body: { id, password } });
        if (r.requires2FA) {
          setTempToken(r.tempToken);
          setCode('');
        } else {
          const u = r?.user?.username || id;
          router.push(`/welcome?next=${encodeURIComponent(next)}${u ? '&user=' + encodeURIComponent(u) : ''}`);
        }
      }
    } catch (e: any) {
      setErr(e.message || 'Login gagal');
      if (tempToken) setCode('');
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
        <Link href="/" className="mb-2 inline-flex items-center gap-2 text-sm text-muted hover:text-white">← Beranda</Link>
        {!tempToken ? (
          <>
            <h1 className="text-2xl font-bold">Masuk ke MyStream</h1>
            <p className="mt-1 text-sm text-muted">Username atau email + password.</p>
            <div className="mt-5">
              <label className="label">Username / Email</label>
              <input className="input" value={id} onChange={(e) => setId(e.target.value)} autoFocus />
            </div>
            <div className="mt-3">
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="text-3xl mb-2">🔐</div>
              <h1 className="text-xl font-bold">Masukkan Kode 2FA</h1>
              <p className="mt-1 text-sm text-muted">Kode 6-digit dari authenticator app kamu.</p>
            </div>
            <div className="mt-5">
              <input
                className="input text-center font-mono text-xl tracking-[8px]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => { setTempToken(null); setCode(''); }}
              className="mt-3 text-xs text-muted underline"
            >
              ← Batal & ganti akun
            </button>
          </>
        )}
        {err && <div className="mt-3 rounded-lg bg-danger/20 p-2 text-sm text-danger">{err}</div>}
        <button className="btn-primary mt-5 w-full" disabled={busy}>
          {busy ? 'Loading…' : (tempToken ? '✓ Verifikasi' : 'Login')}
        </button>
        {!tempToken && (
          <p className="mt-4 text-center text-sm text-muted">
            Belum punya akun? <Link href="/signup" className="text-accent">Daftar gratis</Link>
          </p>
        )}
      </form>
    </div>
  );
}
