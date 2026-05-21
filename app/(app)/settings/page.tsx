'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, api2faSetup, api2faEnable, api2faDisable, apiGetMyQuota } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { CountUp } from '@/components/CountUp';
import { fmtBytes } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const THEME_KEY = 'mystream_theme';
const PANDUAN_KEY = 'mystream_panduan_dismissed';

export default function SettingsPage() {
  const router = useRouter();
  const { me, refresh, logout } = useMe();
  const t = useT();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  // 2FA state
  const [tfaSecret, setTfaSecret] = useState('');
  const [tfaOtpauth, setTfaOtpauth] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaWizardOpen, setTfaWizardOpen] = useState(false);
  const [tfaDisableOpen, setTfaDisableOpen] = useState(false);
  const [tfaPwInput, setTfaPwInput] = useState('');
  const [tfaMsg, setTfaMsg] = useState('');

  const [quota, setQuota] = useState<any>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (me) apiGetMyQuota().then(setQuota).catch(() => {});
    if (typeof window !== 'undefined') {
      setTheme((localStorage.getItem(THEME_KEY) as any) || 'dark');
    }
  }, [me]);

  async function changePw() {
    setPwMsg('');
    if (newPw !== confirmPw) { setPwMsg('Konfirmasi password tidak cocok'); return; }
    if (newPw.length < 6) { setPwMsg('Password baru minimal 6 karakter'); return; }
    try {
      await api('/api/me/password', { method: 'POST', body: { oldPassword: oldPw, newPassword: newPw } });
      setPwMsg('✓ Password diubah');
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (e: any) { setPwMsg(e.message); }
  }

  async function startTfa() {
    try {
      const r = await api2faSetup() as any;
      setTfaSecret(r.secret);
      setTfaOtpauth(r.otpauth);
      setTfaCode('');
      setTfaWizardOpen(true);
      setTfaMsg('');
    } catch (e: any) { setTfaMsg(e.message); }
  }
  async function confirmTfa() {
    try {
      await api2faEnable(tfaSecret, tfaCode);
      await refresh();
      setTfaWizardOpen(false);
      setTfaMsg('✓ 2FA aktif. Login berikutnya akan minta kode.');
    } catch (e: any) { setTfaMsg(e.message); }
  }
  async function disableTfa() {
    try {
      await api2faDisable(tfaPwInput);
      await refresh();
      setTfaDisableOpen(false);
      setTfaPwInput('');
      setTfaMsg('2FA dimatikan.');
    } catch (e: any) { setTfaMsg(e.message); }
  }

  async function clearVideos() {
    if (!confirm('Hapus semua video kamu?')) return;
    await api('/api/me/videos', { method: 'DELETE' });
    router.refresh();
  }
  async function deleteAccount() {
    if (!confirm('Hapus akun permanen?') || !confirm('Yakin? Semua data hilang permanen!')) return;
    await api('/api/me', { method: 'DELETE' });
    logout();
  }

  function setThemeMode(t: 'dark' | 'light') {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
    document.documentElement.style.colorScheme = t;
  }
  function showPanduanAgain() {
    localStorage.removeItem(PANDUAN_KEY);
    window.dispatchEvent(new Event('mystream:show-panduan'));
  }

  if (!me) return null;

  // Password strength estimator
  const pwStrength = (() => {
    if (!newPw) return { score: 0, label: '', color: 'text-muted' };
    let s = 0;
    if (newPw.length >= 6) s++;
    if (newPw.length >= 10) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    const labels = ['', 'Sangat lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat kuat'];
    const colors = ['', 'text-danger', 'text-warn', 'text-warn', 'text-success', 'text-success'];
    return { score: s, label: labels[s], color: colors[s] };
  })();

  // Security score (rough)
  const security = {
    pw: !!me.email, // assume password set since logged in
    twofa: !!me.totpEnabled,
    email: !!me.email,
    avatar: !!me.hasAvatar,
    bio: !!me.bio,
    country: !!me.country,
  };
  const secScore = Object.values(security).filter(Boolean).length;
  const secMax = Object.keys(security).length;
  const secPct = Math.round((secScore / secMax) * 100);

  return (
    <div className="space-y-4">
      <header className="enter enter-1 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">⚙ {t('settings.title')}</h1>
        <div className="text-xs text-muted">@{me.username} · {me.email}</div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT: account + security */}
        <div className="space-y-4 lg:col-span-2">

          {/* SECURITY SCORE */}
          <section className="card enter enter-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">{t('settings.security_score')}</h2>
              <span className={`rounded-full px-3 py-0.5 text-sm font-extrabold ${secPct >= 80 ? 'bg-success/20 text-success' : secPct >= 50 ? 'bg-warn/20 text-warn' : 'bg-danger/20 text-danger'}`}>
                <CountUp to={secPct} delay={150} />%
              </span>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-bg-elev">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${secPct}%`,
                  background: secPct >= 80 ? '#22c55e' : secPct >= 50 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <ul className="grid gap-1.5 text-xs sm:grid-cols-2">
              <SecRow ok={security.email}  label="Email terdaftar" />
              <SecRow ok={security.pw}     label="Password ada" />
              <SecRow ok={security.twofa}  label="2FA aktif" warn="Aktifkan 2FA biar lebih aman!" />
              <SecRow ok={security.avatar} label="Foto profile" warn="Upload foto biar profile lebih trust" />
              <SecRow ok={security.bio}    label="Bio diisi" warn="Bio bantu orang kenal kamu" />
              <SecRow ok={security.country} label="Country diisi" />
            </ul>
          </section>

          {/* PLAN INFO */}
          {quota && (
            <section className="card enter enter-3 relative overflow-hidden">
              {quota.isPremium && <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-warn/30 to-accent-2/30 blur-2xl" />}
              <div className="relative">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-bold">{quota.isPremium ? '⭐ Premium Plan' : '✨ Free Plan'}</h2>
                  {!quota.isPremium && (
                    <Link href="/dashboard" className="rounded-lg bg-gradient-to-r from-warn to-accent-2 px-3 py-1 text-xs font-bold text-white">Upgrade</Link>
                  )}
                </div>
                {quota.isPremium && quota.expiresAt && (
                  <p className="text-sm text-muted">
                    Aktif sampai <b className="text-text">{new Date(quota.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                    {quota.daysRemaining != null && <span> · <CountUp to={quota.daysRemaining} delay={200} /> hari lagi</span>}
                  </p>
                )}
                {quota.lifetime && <p className="text-sm text-warn">⭐ Lifetime — tanpa expire</p>}

                {/* QUOTA GRID */}
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <PlanStat icon="📦" label="Upload (24 jam)"
                    value={quota.daily?.unlimited ? 'unlimited' : `${quota.daily?.used ?? 0}/${quota.daily?.limit ?? '—'}`}
                    bar={quota.daily && !quota.daily.unlimited ? Math.min(100, (quota.daily.used / quota.daily.limit) * 100) : null}
                  />
                  <PlanStat icon="💾" label="Storage"
                    value={`${quota.storage?.usedLabel || '—'}${quota.storage && !quota.storage.unlimited ? ' / ' + quota.storage.limitLabel : ''}`}
                    bar={quota.storage && !quota.storage.unlimited ? quota.storage.percent : null}
                  />
                  <PlanStat icon="🎬" label="Max durasi"
                    value={quota.limits.maxDurationLabel}
                    bar={null}
                  />
                </div>
                <div className="mt-2 text-xs text-muted">
                  Max file: <b className="text-text">{quota.limits.maxFileSizeLabel}</b>
                  {quota.daily && !quota.daily.unlimited && <> · Reset 24 jam (rolling)</>}
                </div>
              </div>
            </section>
          )}

          {/* PASSWORD */}
          <section className="card enter enter-4">
            <h2 className="mb-3 text-lg font-bold">🔑 {t('settings.change_password')}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">{t('settings.old_password')}</label>
                <input className="input" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('settings.new_password')} <span className="text-[10px] text-muted">{t('settings.new_password_hint')}</span></label>
                <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                {newPw && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-elev">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${(pwStrength.score / 5) * 100}%`,
                        background: pwStrength.score >= 4 ? '#22c55e' : pwStrength.score >= 3 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <span className={`text-[10px] font-semibold ${pwStrength.color}`}>{pwStrength.label}</span>
                  </div>
                )}
                <div className="mt-1 text-[10px] text-muted">
                  Kuatkan dengan: huruf besar (A-Z), angka (0-9), simbol (!@#$).
                </div>
              </div>
              <div>
                <label className="label">{t('settings.confirm_new_password')}</label>
                <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                {confirmPw && (
                  <div className={`mt-1 text-[10px] ${newPw === confirmPw ? 'text-success' : 'text-danger'}`}>
                    {newPw === confirmPw ? t('settings.match') : t('settings.not_match')}
                  </div>
                )}
              </div>
              {pwMsg && <div className={`text-sm ${pwMsg.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{pwMsg}</div>}
              <button className="btn-primary" onClick={changePw} disabled={!oldPw || newPw.length < 6 || newPw !== confirmPw}>
                {t('settings.btn_change_pw')}
              </button>
            </div>
          </section>

          {/* 2FA */}
          <section className="card enter enter-5">
            <h2 className="mb-3 text-lg font-bold">{t('settings.two_factor_auth')}</h2>
            {!tfaWizardOpen && !tfaDisableOpen && (me.totpEnabled
              ? (
                <>
                  <p className="rounded-lg bg-success/15 border border-success/30 p-3 text-sm text-success">
                    {t('settings.tfa_on')}
                  </p>
                  <button className="btn-ghost mt-3" onClick={() => { setTfaDisableOpen(true); setTfaMsg(''); }}>
                    {t('settings.btn_disable_2fa')}
                  </button>
                </>
              )
              : (
                <>
                  <p className="rounded-lg bg-warn/15 border border-warn/30 p-3 text-sm text-warn">
                    {t('settings.tfa_off')}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-muted">
                    <li>✓ Lapisan kedua keamanan setelah password</li>
                    <li>✓ Pakai Google Authenticator / Authy / Microsoft Authenticator</li>
                    <li>✓ Kode berubah tiap 30 detik</li>
                    <li>✓ Setup sekali, aktif selamanya (sampai dimatikan)</li>
                  </ul>
                  <button className="btn-primary mt-3" onClick={startTfa}>🔐 Aktifkan 2FA</button>
                </>
              ))}

            {tfaWizardOpen && (
              <div className="space-y-3 rounded-xl border border-border bg-bg-elev p-4">
                <p className="text-sm">Step 1: Buka authenticator app (Google Auth/Authy) → Add account → Manual entry → paste secret:</p>
                <input className="input font-mono text-xs tracking-wider" readOnly value={tfaSecret.replace(/(.{4})/g, '$1 ').trim()} />
                <a href={tfaOtpauth} className="text-xs text-accent">📱 Atau buka di authenticator app (HP yang sama)</a>
                <p className="text-sm">Step 2: Masukkan kode 6-digit dari authenticator:</p>
                <input
                  className="input text-center font-mono text-xl tracking-[8px]"
                  value={tfaCode}
                  onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6} inputMode="numeric"
                />
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => setTfaWizardOpen(false)}>Batal</button>
                  <button className="btn-primary flex-1" onClick={confirmTfa}>✓ Konfirmasi</button>
                </div>
              </div>
            )}

            {tfaDisableOpen && (
              <div className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
                <p className="text-sm text-danger">⚠ Konfirmasi password untuk matikan 2FA</p>
                <input className="input" type="password" placeholder="Password" value={tfaPwInput} onChange={(e) => setTfaPwInput(e.target.value)} />
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => { setTfaDisableOpen(false); setTfaPwInput(''); }}>Batal</button>
                  <button className="btn-danger flex-1" onClick={disableTfa}>Matikan 2FA</button>
                </div>
              </div>
            )}

            {tfaMsg && <div className="mt-2 text-sm">{tfaMsg}</div>}
          </section>

          {/* DANGER ZONE */}
          <section className="card enter enter-6 border-danger/30">
            <h2 className="mb-3 text-lg font-bold text-danger">⚠ {t('settings.danger')}</h2>
            <div className="space-y-2">
              <DangerRow
                title="Hapus Semua Video"
                desc="Hapus semua video & thumbnail yang kamu upload. Akun tetap aktif."
                btnLabel="🗑 Hapus Video"
                onClick={clearVideos}
                variant="ghost"
              />
              <DangerRow
                title="Hapus Akun"
                desc="Hapus akun permanen. Username, email, semua video, follower & data hilang. Tidak bisa dibatalkan."
                btnLabel="⚠ Hapus Akun"
                onClick={deleteAccount}
                variant="danger"
              />
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-4">
          {/* APPEARANCE */}
          <section className="card enter enter-2">
            <h2 className="mb-3 font-bold">{t('settings.appearance')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setThemeMode('dark')}
                className={`rounded-xl border p-3 text-center text-xs transition ${theme === 'dark' ? 'border-accent bg-accent/10' : 'border-border bg-bg hover:border-accent'}`}
              >
                <div className="text-2xl">🌙</div>
                <div className="mt-1 font-bold">Dark</div>
              </button>
              <button
                onClick={() => setThemeMode('light')}
                className={`rounded-xl border p-3 text-center text-xs transition ${theme === 'light' ? 'border-accent bg-accent/10' : 'border-border bg-bg hover:border-accent'}`}
              >
                <div className="text-2xl">☀️</div>
                <div className="mt-1 font-bold">Light</div>
              </button>
            </div>
          </section>

          {/* QUICK LINKS */}
          <section className="card enter enter-3">
            <h2 className="mb-3 font-bold">{t('settings.quick_links')}</h2>
            <div className="space-y-1.5">
              <QuickLink href="/profile" icon="👤" label="Edit Profile" />
              <QuickLink href="/history" icon="🖼" label="My Uploads" />
              <QuickLink href="/messages" icon="💬" label="Messages" />
              <QuickLink href="/notifications" icon="🔔" label="Notifications" />
              <QuickLink href="/friends" icon="👥" label="Friends" />
              <button onClick={showPanduanAgain} className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg p-2 text-left text-xs transition hover:border-accent">
                <span className="text-base">📖</span>
                <span className="font-semibold">Tampilkan Panduan</span>
              </button>
            </div>
          </section>

          {/* TIPS */}
          <section className="card enter enter-4 bg-grad-card">
            <h2 className="mb-3 font-bold">{t('settings.security_tips')}</h2>
            <ul className="space-y-2 text-xs">
              <li className="flex gap-2"><span>🔐</span><span>Aktifkan <b>2FA</b> — proteksi #1 dari hijack akun.</span></li>
              <li className="flex gap-2"><span>🔑</span><span>Pakai password <b>unik</b> per situs — jangan recycle.</span></li>
              <li className="flex gap-2"><span>📧</span><span>Email aktif — kalau lupa password, kirim reset ke email.</span></li>
              <li className="flex gap-2"><span>🚪</span><span>Logout dari device asing setelah selesai.</span></li>
              <li className="flex gap-2"><span>🤐</span><span>Jangan share kode 2FA — admin gak akan minta.</span></li>
            </ul>
          </section>

          {/* LOGOUT */}
          <section className="card enter enter-5">
            <button onClick={() => logout()} className="btn-ghost w-full text-danger">
              ⎋ Logout dari device ini
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SecRow({ ok, label, warn }: { ok: boolean; label: string; warn?: string }) {
  return (
    <li className={`flex items-start gap-2 rounded-lg border p-2 ${ok ? 'border-success/30 bg-success/5' : 'border-warn/30 bg-warn/5'}`}>
      <span>{ok ? '✓' : '⚠'}</span>
      <div className="min-w-0 flex-1">
        <div className={`font-semibold ${ok ? 'text-success' : 'text-warn'}`}>{label}</div>
        {!ok && warn && <div className="text-[10px] text-muted">{warn}</div>}
      </div>
    </li>
  );
}

function PlanStat({ icon, label, value, bar }: { icon: string; label: string; value: string; bar: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-2">
      <div className="text-xs text-muted">{icon} {label}</div>
      <div className="mt-0.5 truncate font-bold">{value}</div>
      {bar !== null && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg-elev">
          <div className={`h-full rounded-full ${bar > 80 ? 'bg-danger' : bar > 50 ? 'bg-warn' : 'bg-grad-accent'}`} style={{ width: bar + '%' }} />
        </div>
      )}
    </div>
  );
}

function DangerRow({ title, desc, btnLabel, onClick, variant }: { title: string; desc: string; btnLabel: string; onClick: () => void; variant: 'ghost' | 'danger' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-bg p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <button onClick={onClick} className={variant === 'danger' ? 'btn-danger text-xs' : 'btn-ghost text-xs'}>
        {btnLabel}
      </button>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg border border-border bg-bg p-2 text-xs transition hover:border-accent hover:bg-accent/5">
      <span className="text-base">{icon}</span>
      <span className="font-semibold flex-1">{label}</span>
      <span className="text-muted">→</span>
    </Link>
  );
}
