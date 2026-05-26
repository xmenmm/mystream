'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, api2faSetup, api2faEnable, api2faDisable, apiGetMyQuota } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { CountUp } from '@/components/CountUp';
import { useT } from '@/lib/i18n';

const THEME_KEY = 'mystream_theme';
const PANDUAN_KEY = 'mystream_panduan_dismissed';
const PREF_PREFIX = 'mystream_pref_';

type TabId = 'account' | 'security' | 'plan' | 'notifications' | 'dmca';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'account', icon: '👤', label: 'Account' },
  { id: 'security', icon: '🛡', label: 'Security' },
  { id: 'plan', icon: '⭐', label: 'Plan & Storage' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'dmca', icon: '📋', label: 'DMCA' },
];

function pref<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(PREF_PREFIX + key);
    if (v === null) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
function setPref<T>(key: string, val: T) {
  try {
    localStorage.setItem(PREF_PREFIX + key, JSON.stringify(val));
  } catch {}
}

export default function SettingsPage() {
  const router = useRouter();
  const { me, refresh, logout } = useMe();
  const t = useT();
  const [tab, setTab] = useState<TabId>('account');
  const [quota, setQuota] = useState<any>(null);

  useEffect(() => {
    if (me) apiGetMyQuota().then(setQuota).catch(() => {});
  }, [me]);

  // Hash routing — supaya bisa share link /settings#security
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHash = () => {
      const h = window.location.hash.replace('#', '') as TabId;
      if (TABS.some((x) => x.id === h)) setTab(h);
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function selectTab(id: TabId) {
    setTab(id);
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', '#' + id);
    }
  }

  if (!me) return null;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">⚙ {t('settings.title')}</h1>
          <div className="text-xs text-muted">@{me.username} · {me.email}</div>
        </div>
        <button onClick={() => logout()} className="btn-ghost text-xs text-danger">
          ⎋ Logout dari device ini
        </button>
      </header>

      {/* Horizontal tabs nav (sticky on scroll) */}
      <nav className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-border bg-bg/95 px-1 pb-px backdrop-blur scrollbar-thin">
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => selectTab(x.id)}
            className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition ${
              tab === x.id
                ? 'text-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            <span className="text-base">{x.icon}</span>
            <span>{x.label}</span>
            {tab === x.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </nav>

      {/* Active tab content (full-width) */}
      <section className="space-y-4">
        {tab === 'account' && <AccountTab me={me} refresh={refresh} />}
        {tab === 'security' && <SecurityTab me={me} refresh={refresh} />}
        {tab === 'plan' && <PlanTab quota={quota} me={me} />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'dmca' && <DmcaTab />}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── ACCOUNT ─── */
function AccountTab({ me, refresh }: { me: any; refresh: () => Promise<void> }) {
  const router = useRouter();
  const { logout } = useMe();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [tz, setTz] = useState<string>('Asia/Jakarta');
  const [lang, setLang] = useState<string>('id');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTheme((localStorage.getItem(THEME_KEY) as any) || 'dark');
      setTz(pref('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'));
      setLang(pref('lang', (document.documentElement.lang as string) || 'id'));
    }
  }, []);

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

  return (
    <>
      <section className="card">
        <h2 className="mb-3 text-lg font-bold">👤 Account Info</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Username" value={'@' + me.username} />
          <Info label="Email" value={me.email || '—'} />
          <Info
            label="Member sejak"
            value={me.createdAt ? new Date(me.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          />
          <Info label="Status" value={me.banned ? '🚫 Banned' : '● Active'} />
        </dl>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">🎨 Tampilan</h2>
        <div className="grid grid-cols-2 gap-2 max-w-xs">
          <button
            onClick={() => setThemeMode('dark')}
            className={`rounded-xl border p-3 text-center text-xs transition ${
              theme === 'dark' ? 'border-accent bg-accent/10' : 'border-border bg-bg hover:border-accent'
            }`}
          >
            <div className="text-2xl">🌙</div>
            <div className="mt-1 font-bold">Dark</div>
          </button>
          <button
            onClick={() => setThemeMode('light')}
            className={`rounded-xl border p-3 text-center text-xs transition ${
              theme === 'light' ? 'border-accent bg-accent/10' : 'border-border bg-bg hover:border-accent'
            }`}
          >
            <div className="text-2xl">☀️</div>
            <div className="mt-1 font-bold">Light</div>
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">🌍 Bahasa & Zona Waktu</h2>
        <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
          <div>
            <label className="label">Bahasa</label>
            <select
              className="input"
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                setPref('lang', e.target.value);
                document.cookie = `lang=${e.target.value}; path=/; max-age=31536000`;
                location.reload();
              }}
            >
              <option value="id">🇮🇩 Bahasa Indonesia</option>
              <option value="en">🇺🇸 English</option>
              <option value="jp">🇯🇵 日本語</option>
              <option value="ar">🇸🇦 العربية</option>
            </select>
          </div>
          <div>
            <label className="label">Zona Waktu</label>
            <select
              className="input"
              value={tz}
              onChange={(e) => {
                setTz(e.target.value);
                setPref('timezone', e.target.value);
              }}
            >
              <option value="Asia/Jakarta">WIB · Jakarta (UTC+7)</option>
              <option value="Asia/Makassar">WITA · Makassar (UTC+8)</option>
              <option value="Asia/Jayapura">WIT · Jayapura (UTC+9)</option>
              <option value="Asia/Singapore">Singapore (UTC+8)</option>
              <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
              <option value="Asia/Dubai">Dubai (UTC+4)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">New York (UTC-5)</option>
              <option value="Europe/London">London (UTC+0)</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Zona waktu dipakai untuk tampilan jam upload, statistik, dan jadwal publish.</p>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">📖 Bantuan</h2>
        <button onClick={showPanduanAgain} className="btn-ghost">📖 Tampilkan Panduan Lagi</button>
      </section>

      <section className="card border-danger/30">
        <h2 className="mb-3 text-lg font-bold text-danger">⚠ Zona Berbahaya</h2>
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
    </>
  );
}

/* ─────────────────────────────────────────────────────── SECURITY ─── */
function SecurityTab({ me, refresh }: { me: any; refresh: () => Promise<void> }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const [tfaSecret, setTfaSecret] = useState('');
  const [tfaOtpauth, setTfaOtpauth] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaWizardOpen, setTfaWizardOpen] = useState(false);
  const [tfaDisableOpen, setTfaDisableOpen] = useState(false);
  const [tfaPwInput, setTfaPwInput] = useState('');
  const [tfaMsg, setTfaMsg] = useState('');

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

  const security = {
    pw: !!me.email,
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
    <>
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">🛡 Skor Keamanan</h2>
          <span className={`rounded-full px-3 py-0.5 text-sm font-extrabold ${
            secPct >= 80 ? 'bg-success/20 text-success' : secPct >= 50 ? 'bg-warn/20 text-warn' : 'bg-danger/20 text-danger'
          }`}>
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
          <SecRow ok={security.email} label="Email terdaftar" />
          <SecRow ok={security.pw} label="Password ada" />
          <SecRow ok={security.twofa} label="2FA aktif" warn="Aktifkan 2FA biar lebih aman!" />
          <SecRow ok={security.avatar} label="Foto profile" warn="Upload foto biar profile lebih trust" />
          <SecRow ok={security.bio} label="Bio diisi" warn="Bio bantu orang kenal kamu" />
          <SecRow ok={security.country} label="Country diisi" />
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">🔑 Ganti Password</h2>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="label">Password lama</label>
            <input className="input" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
          </div>
          <div>
            <label className="label">Password baru <span className="text-[10px] text-muted">(min 6 karakter)</span></label>
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
            <div className="mt-1 text-[10px] text-muted">Kuatkan dengan: huruf besar (A-Z), angka (0-9), simbol (!@#$).</div>
          </div>
          <div>
            <label className="label">Konfirmasi password baru</label>
            <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            {confirmPw && (
              <div className={`mt-1 text-[10px] ${newPw === confirmPw ? 'text-success' : 'text-danger'}`}>
                {newPw === confirmPw ? '✓ Cocok' : '✗ Tidak cocok'}
              </div>
            )}
          </div>
          {pwMsg && <div className={`text-sm ${pwMsg.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{pwMsg}</div>}
          <button className="btn-primary" onClick={changePw} disabled={!oldPw || newPw.length < 6 || newPw !== confirmPw}>
            💾 Ubah Password
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">🔐 Autentikasi Dua Faktor (2FA)</h2>
        {!tfaWizardOpen && !tfaDisableOpen && (me.totpEnabled
          ? (
            <>
              <p className="rounded-lg bg-success/15 border border-success/30 p-3 text-sm text-success">
                ✓ 2FA sedang aktif. Login berikutnya akan minta kode 6-digit.
              </p>
              <button className="btn-ghost mt-3" onClick={() => { setTfaDisableOpen(true); setTfaMsg(''); }}>
                Matikan 2FA
              </button>
            </>
          )
          : (
            <>
              <p className="rounded-lg bg-warn/15 border border-warn/30 p-3 text-sm text-warn">
                ⚠ 2FA belum aktif — proteksi password saja.
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

      <section className="card bg-grad-card">
        <h2 className="mb-3 font-bold">💡 Tips Keamanan</h2>
        <ul className="space-y-2 text-xs">
          <li className="flex gap-2"><span>🔐</span><span>Aktifkan <b>2FA</b> — proteksi #1 dari hijack akun.</span></li>
          <li className="flex gap-2"><span>🔑</span><span>Pakai password <b>unik</b> per situs — jangan recycle.</span></li>
          <li className="flex gap-2"><span>📧</span><span>Email aktif — kalau lupa password, kirim reset ke email.</span></li>
          <li className="flex gap-2"><span>🚪</span><span>Logout dari device asing setelah selesai.</span></li>
          <li className="flex gap-2"><span>🤐</span><span>Jangan share kode 2FA — admin gak akan minta.</span></li>
        </ul>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────── PLAN ─── */
function PlanTab({ quota, me }: { quota: any; me: any }) {
  if (!quota) return <div className="card">⏳ Memuat info plan…</div>;
  return (
    <>
      <section className="card relative overflow-hidden">
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

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <PlanStat icon="📦" label="Upload (24 jam)"
              value={quota.daily?.unlimited ? 'unlimited' : `${quota.daily?.used ?? 0}/${quota.daily?.limit ?? '—'}`}
              bar={quota.daily && !quota.daily.unlimited ? Math.min(100, (quota.daily.used / quota.daily.limit) * 100) : null}
            />
            <PlanStat icon="💾" label="Storage"
              value={`${quota.storage?.usedLabel || '—'}${quota.storage && !quota.storage.unlimited ? ' / ' + quota.storage.limitLabel : ''}`}
              bar={quota.storage && !quota.storage.unlimited ? quota.storage.percent : null}
            />
            <PlanStat icon="🎬" label="Max durasi" value={quota.limits.maxDurationLabel} bar={null} />
          </div>
          <div className="mt-2 text-xs text-muted">
            Max file: <b className="text-text">{quota.limits.maxFileSizeLabel}</b>
            {quota.daily && !quota.daily.unlimited && <> · Reset 24 jam (rolling)</>}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">💳 Riwayat Pembayaran</h2>
        <div className="rounded-lg border border-dashed border-border bg-bg p-6 text-center text-sm text-muted">
          Belum ada transaksi.
          <div className="mt-1 text-xs">Riwayat pembayaran Premium akan muncul di sini setelah kamu upgrade.</div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────── NOTIFICATIONS ─── */
function NotificationsTab() {
  const [toggles, setToggles] = useState({
    emailLike: pref('notif_email_like', true),
    emailFollow: pref('notif_email_follow', true),
    emailUpload: pref('notif_email_upload', true),
    emailDM: pref('notif_email_dm', true),
    emailBroadcast: pref('notif_email_broadcast', false),
    emailEarnings: pref('notif_email_earnings', true),
    emailTakedown: pref('notif_email_takedown', true),
    inappLike: pref('notif_inapp_like', true),
    inappFollow: pref('notif_inapp_follow', true),
    inappUpload: pref('notif_inapp_upload', true),
    inappDM: pref('notif_inapp_dm', true),
  });
  function toggle(k: keyof typeof toggles) {
    const next = { ...toggles, [k]: !toggles[k] };
    setToggles(next);
    setPref('notif_' + k.replace(/^email/, 'email_').replace(/^inapp/, 'inapp_').toLowerCase(), next[k]);
  }
  return (
    <>
      <section className="card">
        <h2 className="mb-1 text-lg font-bold">🔔 Notifikasi In-App</h2>
        <p className="mb-3 text-xs text-muted">Notifikasi yang muncul di bell icon.</p>
        <div className="space-y-1.5">
          <Toggle label="❤️ Like di video saya" on={toggles.inappLike} onChange={() => toggle('inappLike')} />
          <Toggle label="👥 Follower baru" on={toggles.inappFollow} onChange={() => toggle('inappFollow')} />
          <Toggle label="🎬 Upload baru dari yang di-follow" on={toggles.inappUpload} onChange={() => toggle('inappUpload')} />
          <Toggle label="💬 DM masuk" on={toggles.inappDM} onChange={() => toggle('inappDM')} />
        </div>
      </section>

      <section className="card">
        <h2 className="mb-1 text-lg font-bold">📧 Email Alert</h2>
        <p className="mb-3 text-xs text-muted">Kirim email saat ada activity penting.</p>
        <div className="space-y-1.5">
          <Toggle label="❤️ Like di video saya" on={toggles.emailLike} onChange={() => toggle('emailLike')} />
          <Toggle label="👥 Follower baru" on={toggles.emailFollow} onChange={() => toggle('emailFollow')} />
          <Toggle label="🎬 Upload baru dari yang di-follow" on={toggles.emailUpload} onChange={() => toggle('emailUpload')} />
          <Toggle label="💬 DM masuk" on={toggles.emailDM} onChange={() => toggle('emailDM')} />
          <Toggle label="📢 Broadcast admin" on={toggles.emailBroadcast} onChange={() => toggle('emailBroadcast')} />
          <Toggle label="💰 Earnings update (saat ada views)" on={toggles.emailEarnings} onChange={() => toggle('emailEarnings')} />
          <Toggle label="⚠ Video di-takedown" on={toggles.emailTakedown} onChange={() => toggle('emailTakedown')} />
        </div>
      </section>

      <p className="text-xs text-muted">Preferensi disimpan di browser kamu. Sinkron ke akun akan aktif setelah integrasi email service (Phase 2).</p>
    </>
  );
}


/* ─────────────────────────────────────────────────────── DMCA ─── */
function DmcaTab() {
  const [reportText, setReportText] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [sent, setSent] = useState(false);

  function submit() {
    if (!reportText.trim() || !reportUrl.trim()) return;
    // Stub: kirim ke /api/dmca nanti
    setSent(true);
    setReportText('');
    setReportUrl('');
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <>
      <section className="card">
        <h2 className="mb-1 text-lg font-bold">📋 DMCA / Hak Cipta</h2>
        <p className="mb-3 text-xs text-muted">
          Lapor pelanggaran hak cipta atau ajukan banding kalau video kamu di-takedown.
        </p>
        <div className="rounded-lg bg-bg-elev p-3 text-xs">
          📧 <b>Email DMCA agent:</b> dmca@mystream.app<br />
          📞 <b>Response time:</b> 24-72 jam kerja
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">📨 Lapor Pelanggaran Hak Cipta</h2>
        <div className="space-y-3 max-w-xl">
          <div>
            <label className="label">URL Video yang Dilaporkan</label>
            <input
              className="input"
              placeholder="https://mystream-o2f7.vercel.app/watch?id=..."
              value={reportUrl}
              onChange={(e) => setReportUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Penjelasan / Bukti Kepemilikan</label>
            <textarea
              className="input"
              rows={6}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Sertakan: bukti kepemilikan, hubungan kamu dengan konten asli, lokasi konten asli (URL), kontak kamu yang bisa dihubungi."
            />
          </div>
          {sent && <div className="text-sm text-success">✓ Laporan terkirim. Tim akan review dalam 24-72 jam.</div>}
          <button className="btn-primary" onClick={submit} disabled={!reportText.trim() || !reportUrl.trim()}>
            📤 Kirim Laporan DMCA
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">📜 Riwayat Laporan</h2>
        <div className="rounded-lg border border-dashed border-border bg-bg p-6 text-center text-sm text-muted">
          Belum ada laporan.
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">⚠ Takedown Diterima</h2>
        <div className="rounded-lg border border-dashed border-border bg-bg p-6 text-center text-sm text-muted">
          Tidak ada video kamu yang ditakedown.
          <div className="mt-1 text-xs">Kalau ada, history akan muncul di sini dengan opsi banding.</div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────── Helpers ─── */
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-bold">{value}</div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-bg p-2.5 transition hover:border-accent">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={on}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          on ? 'bg-accent' : 'bg-bg-elev'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
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
