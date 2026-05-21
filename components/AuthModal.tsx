'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiVerify2FA, apiGetCaptcha } from '@/lib/api-client';
import { useT } from '@/lib/i18n';

type Mode = 'login' | 'signup';

/** Combined login + signup popup. Buka via:
 *  window.dispatchEvent(new CustomEvent('open-auth', { detail: { mode } })) */
export function AuthModal() {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('login');

  // Shared
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Login state
  const [id, setId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  // Signup state
  const [username, setU] = useState('');
  const [email, setE] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [captchaCode, setCC] = useState('');
  const [captcha, setCaptcha] = useState<{ id: string; image: string } | null>(null);

  const loadCaptcha = useCallback(async () => {
    try { setCaptcha(await apiGetCaptcha()); setCC(''); } catch {}
  }, []);

  // Listen open-auth event
  useEffect(() => {
    const onOpen = (e: Event) => {
      const m = (e as CustomEvent).detail?.mode as Mode;
      setMode(m === 'signup' ? 'signup' : 'login');
      setErr('');
      setTempToken(null);
      setOpen(true);
    };
    window.addEventListener('open-auth', onOpen as EventListener);
    return () => window.removeEventListener('open-auth', onOpen as EventListener);
  }, []);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Load captcha when signup tab active
  useEffect(() => {
    if (open && mode === 'signup' && !captcha) loadCaptcha();
  }, [open, mode, captcha, loadCaptcha]);

  if (!open) return null;

  function switchMode(m: Mode) {
    setMode(m);
    setErr('');
    setTempToken(null);
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (tempToken) {
        if (!/^\d{6}$/.test(code)) throw new Error('Kode harus 6 digit');
        const r = await apiVerify2FA(tempToken, code);
        const u = r?.user?.username || '';
        router.push(`/welcome?next=${encodeURIComponent('/dashboard')}${u ? '&user=' + encodeURIComponent(u) : ''}`);
      } else {
        const r = await api<any>('/api/login', { method: 'POST', body: { id, password: loginPw } });
        if (r.requires2FA) {
          setTempToken(r.tempToken);
          setCode('');
        } else {
          const u = r?.user?.username || id;
          router.push(`/welcome?next=${encodeURIComponent('/dashboard')}${u ? '&user=' + encodeURIComponent(u) : ''}`);
        }
      }
    } catch (e: any) {
      setErr(e.message || 'Login gagal');
      if (tempToken) setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (!captcha) throw new Error('Captcha belum ke-load');
      await api('/api/signup', {
        method: 'POST',
        body: { username, email, password: signupPw, captchaId: captcha.id, captchaCode },
      });
      router.push(`/welcome?next=${encodeURIComponent('/dashboard')}&user=${encodeURIComponent(username)}`);
    } catch (e: any) {
      setErr(e.message || 'Signup gagal');
      loadCaptcha();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>

        {/* Tabs */}
        {!tempToken && (
          <div className="mb-5 flex gap-1 rounded-xl border border-border bg-bg p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === 'login' ? 'bg-grad-accent text-white shadow' : 'text-muted hover:text-white'}`}
            >
              {t('auth.btn_login')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-grad-accent text-white shadow' : 'text-muted hover:text-white'}`}
            >
              {t('auth.signup_title')}
            </button>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={submitLogin}>
            {!tempToken ? (
              <>
                <h2 className="text-xl font-bold">{t('auth.login_title')} MyStream</h2>
                <p className="mt-1 text-sm text-muted">Username / email + password.</p>
                <div className="mt-4">
                  <label className="label">{t('auth.username')} / {t('auth.email')}</label>
                  <input className="input" value={id} onChange={(e) => setId(e.target.value)} autoFocus />
                </div>
                <div className="mt-3">
                  <label className="label">{t('auth.password')}</label>
                  <input className="input" type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="mb-2 text-3xl">🔐</div>
                  <h2 className="text-lg font-bold">Masukkan Kode 2FA</h2>
                  <p className="mt-1 text-sm text-muted">Kode 6-digit dari authenticator app.</p>
                </div>
                <div className="mt-4">
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
              {busy ? t('auth.btn_loading') : (tempToken ? '✓ ' + t('auth.verify_2fa') : t('auth.btn_login'))}
            </button>
          </form>
        ) : (
          <form onSubmit={submitSignup}>
            <h2 className="text-xl font-bold">{t('auth.signup_title')}</h2>
            <p className="mt-1 text-sm text-muted">Gratis. Mulai upload dalam hitungan detik.</p>
            <div className="mt-4">
              <label className="label">{t('auth.username')}</label>
              <input className="input" value={username} onChange={(e) => setU(e.target.value)} minLength={3} required />
            </div>
            <div className="mt-3">
              <label className="label">{t('auth.email')}</label>
              <input className="input" type="email" value={email} onChange={(e) => setE(e.target.value)} required />
            </div>
            <div className="mt-3">
              <label className="label">{t('auth.password')}</label>
              <input className="input" type="password" value={signupPw} onChange={(e) => setSignupPw(e.target.value)} minLength={6} required />
            </div>
            <div className="mt-3">
              <label className="label">{t('auth.captcha_label')}</label>
              <div className="flex items-stretch gap-2">
                <div className="grid min-h-[64px] min-w-0 flex-1 place-items-center rounded-xl border border-border bg-bg-elev p-1">
                  {captcha
                    ? <img src={captcha.image} alt="captcha" className="h-auto w-full rounded-lg" />
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
              {busy ? t('auth.btn_loading') : t('auth.btn_signup')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Tombol pemicu modal. Drop-in pengganti <Link href="/login|/signup">. */
export function AuthLink({
  mode,
  className,
  children,
}: {
  mode: Mode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: { mode } }))}
    >
      {children}
    </button>
  );
}
