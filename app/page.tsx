import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getAuthFromCookies } from '@/lib/auth';
import { loadDB } from '@/lib/db';
import { LandingFAQ } from '@/components/LandingFAQ';
import { AmbientBackground } from '@/components/AmbientBackground';
import { LandingStatsBar } from '@/components/LandingStatsBar';
import { LandingPricing } from '@/components/LandingPricing';
import { AuthModal, AuthLink } from '@/components/AuthModal';

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

type L = 'id' | 'en' | 'jp' | 'ar';
function detectLocale(): L {
  const c = cookies().get('mystream_locale_view')?.value as L | undefined;
  if (c && ['id', 'en', 'jp', 'ar'].includes(c)) return c;
  const al = (headers().get('accept-language') || '').toLowerCase();
  if (al.startsWith('en')) return 'en';
  if (al.startsWith('ja') || al.startsWith('jp')) return 'jp';
  if (al.startsWith('ar')) return 'ar';
  return 'id';
}
function pick(locale: L, opts: Record<L, string>): string {
  return opts[locale] || opts.id;
}

export default async function LandingPage() {
  if (await getAuthFromCookies()) redirect('/dashboard');
  const L = detectLocale();
  const tt = (opts: Record<L, string>) => pick(L, opts);

  const db = await loadDB();
  const totalUsers = db.users.length;
  const totalVideos = db.videos.length;
  const totalViews = db.videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = db.videos.reduce((s, v) => s + (v.likes || 0), 0);

  // Top creators
  const topCreators = (() => {
    const counts: Record<string, { username: string; videos: number; views: number }> = {};
    for (const v of db.videos) {
      if (!counts[v.username]) counts[v.username] = { username: v.username, videos: 0, views: 0 };
      counts[v.username].videos++;
      counts[v.username].views += v.views || 0;
    }
    return Object.values(counts).sort((a, b) => b.views - a.views).slice(0, 4);
  })();

  return (
    <div className="light relative min-h-screen bg-bg text-text">
      {/* BACKGROUND lembut — glow biru/indigo halus (ganti bintang2) */}
      <AmbientBackground />

      {/* AUTH POPUP — login + daftar jadi 1 modal */}
      <AuthModal />

      {/* TOP NAV */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="flex w-full items-center justify-between px-5 py-3 md:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-grad-accent text-white shadow-glow">M</span>
            MyStream
          </Link>
          <nav className="hidden gap-6 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-text">{tt({id:'Fitur',en:'Features',jp:'機能',ar:'الميزات'})}</a>
            <a href="#showcase" className="hover:text-text">{tt({id:'Showcase',en:'Showcase',jp:'ショーケース',ar:'عرض'})}</a>
            <a href="#how" className="hover:text-text">{tt({id:'Cara Kerja',en:'How It Works',jp:'仕組み',ar:'كيف يعمل'})}</a>
            <a href="#pricing" className="hover:text-text">{tt({id:'Harga',en:'Pricing',jp:'料金',ar:'الأسعار'})}</a>
            <a href="#testimonials" className="hover:text-text">{tt({id:'Review',en:'Reviews',jp:'レビュー',ar:'مراجعات'})}</a>
            <a href="#faq" className="hover:text-text">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <AuthLink mode="login" className="btn-ghost">{tt({id:'Masuk',en:'Sign in',jp:'ログイン',ar:'تسجيل الدخول'})}</AuthLink>
            <AuthLink mode="signup" className="btn-primary">{tt({id:'Daftar',en:'Sign up',jp:'登録',ar:'تسجيل'})}</AuthLink>
          </div>
        </div>
      </header>

      {/* HERO — 3D background dari fixed layer global di atas */}
      <section className="relative z-10">
        <div className="grid w-full items-center gap-10 px-5 py-10 md:grid-cols-2 md:gap-12 md:px-8 md:py-16 lg:grid-cols-[1fr_auto_1.15fr] lg:gap-12 xl:px-16">
          {/* Left: text */}
          <div className="text-center md:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-bg-card/70 px-4 py-1 text-xs backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
              <span className="text-muted">{fmtN(totalUsers)} {tt({id:'creator aktif sekarang',en:'creators active now',jp:'クリエイターがアクティブ',ar:'مبدعون نشطون الآن'})}</span>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-text sm:text-5xl md:text-6xl lg:text-7xl">
              {tt({
                id:'Bagikan momen, watch creator, follow teman.',
                en:'Share moments, watch creators, follow friends.',
                jp:'瞬間を共有、クリエイターを視聴、友達をフォロー。',
                ar:'شارك اللحظات، شاهد المبدعين، تابع الأصدقاء.',
              }).split(',').map((s, i, arr) => <span key={i}>{s.trim()}{i < arr.length - 1 ? ',' : ''}<br/></span>)}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-muted md:mx-0">
              {tt({
                id:'Platform berbagi video sederhana — upload, like, follow, dan ngobrol langsung dengan creator lain via DM. 100% gratis untuk mulai.',
                en:'Simple video sharing — upload, like, follow, and chat directly with other creators via DM. 100% free to start.',
                jp:'シンプルな動画共有 — アップロード、いいね、フォロー、DMで他のクリエイターと直接チャット。100% 無料で始められます。',
                ar:'مشاركة فيديو بسيطة — ارفع، أعجب، تابع، وتحدث مباشرة مع المبدعين عبر الرسائل الخاصة. مجاني 100٪ للبدء.',
              })}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <AuthLink mode="signup" className="btn-primary text-base shadow-glow">
                {tt({id:'🚀 Mulai Gratis Sekarang →',en:'🚀 Start Free Now →',jp:'🚀 今すぐ無料で始める →',ar:'🚀 ابدأ مجانا الآن ←'})}
              </AuthLink>
              <Link href="/dashboard" className="btn-ghost text-base bg-bg-card/60 backdrop-blur-md">
                {tt({id:'Lihat Dashboard Demo',en:'View Dashboard Demo',jp:'ダッシュボードを見る',ar:'عرض لوحة التحكم التجريبية'})}
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">⏱ {tt({id:'Daftar 30 detik',en:'Sign up in 30s',jp:'30秒で登録',ar:'سجل في 30 ثانية'})} · 🔒 {tt({id:'2FA tersedia',en:'2FA available',jp:'2FA対応',ar:'2FA متوفر'})} · 🆓 {tt({id:'No credit card',en:'No credit card',jp:'クレカ不要',ar:'بدون بطاقة'})}</p>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-[10px] text-muted md:justify-start">
              <span className="rounded-full border border-border bg-bg-card/50 px-2 py-0.5 backdrop-blur">🔐 SHA-256 password</span>
              <span className="rounded-full border border-border bg-bg-card/50 px-2 py-0.5 backdrop-blur">🛡 Anti-bot captcha</span>
              <span className="rounded-full border border-border bg-bg-card/50 px-2 py-0.5 backdrop-blur">⚡ Edge CDN</span>
              <span className="rounded-full border border-border bg-bg-card/50 px-2 py-0.5 backdrop-blur">📱 Responsive</span>
            </div>
          </div>

          {/* Center: kartu fitur — ngisi ruang tengah di layar lebar */}
          <div className="hidden flex-col gap-4 lg:flex">
            <div className="float-card rounded-2xl border border-border bg-bg-card/85 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-warn/20 text-xl text-warn">⭐</span>
                <div>
                  <div className="text-sm font-bold">Premium aktif</div>
                  <div className="text-xs text-muted">unlimited per file · unlimited durasi</div>
                </div>
              </div>
            </div>
            <div className="float-card float-card-delay-1 rounded-2xl border border-border bg-bg-card/85 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-success/20 text-xl text-success">📈</span>
                <div>
                  <div className="text-sm font-bold">Trending Up</div>
                  <div className="text-xs text-muted">+15% views per minggu</div>
                </div>
              </div>
            </div>
            <div className="float-card float-card-delay-2 rounded-2xl border border-border bg-bg-card/85 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/20 text-xl text-accent">🔐</span>
                <div>
                  <div className="text-sm font-bold">2FA Aktif</div>
                  <div className="text-xs text-muted">Akun kamu terlindungi</div>
                </div>
              </div>
            </div>
            <div className="float-card float-card-delay-3 rounded-2xl border border-border bg-bg-card/85 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-2/20 text-xl text-accent-2">💬</span>
                <div>
                  <div className="text-sm font-bold">DM Real-time</div>
                  <div className="text-xs text-muted">Ngobrol langsung sama creator</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: kartu analytics (chart) */}
          <div className="relative hidden md:block">
            {/* Main chart card */}
            <div className="float-card w-full rounded-2xl border border-border bg-bg-card/85 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-danger" />
                <span className="h-3 w-3 rounded-full bg-warn" />
                <span className="h-3 w-3 rounded-full bg-success" />
                <span className="ml-2 text-[10px] text-muted">mystream.app/dashboard</span>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">📈 Analytics Live</div>
                  <div className="text-[10px] text-muted">14 days · auto-refresh</div>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: '#3b82f6' }} /> Views</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: '#38bdf8' }} /> Likes</span>
                </div>
              </div>
              {/* Chart bersih — kurva mulus, palet biru, grid halus */}
              <svg viewBox="0 0 400 180" className="w-full" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* grid halus — garis horizontal tipis (kontras di kartu putih) */}
                {[0, 0.33, 0.66, 1].map((p, i) => (
                  <line
                    key={i}
                    x1="0" y1={p * 180} x2="400" y2={p * 180}
                    stroke="rgba(15,23,42,0.07)" strokeWidth="1"
                  />
                ))}
                {/* Views — kurva mulus naik */}
                <path
                  d="M0,132 C50,120 80,86 130,84 C185,82 215,52 270,48 C320,44 360,24 400,16 L400,180 L0,180 Z"
                  fill="url(#vGrad)"
                />
                <path
                  d="M0,132 C50,120 80,86 130,84 C185,82 215,52 270,48 C320,44 360,24 400,16"
                  stroke="#3b82f6" strokeWidth="2.5" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                />
                {/* Likes — kurva mulus, tren lebih landai */}
                <path
                  d="M0,160 C60,154 110,138 170,134 C230,130 280,112 340,104 C368,100 386,94 400,90 L400,180 L0,180 Z"
                  fill="url(#lGrad)"
                />
                <path
                  d="M0,160 C60,154 110,138 170,134 C230,130 280,112 340,104 C368,100 386,94 400,90"
                  stroke="#38bdf8" strokeWidth="2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                />
                {/* Satu titik aksen di ujung Views — bersih, nggak ramai */}
                <circle cx="400" cy="16" r="3.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
              </svg>
              <div className="mt-2 flex justify-between text-[9px] text-muted">
                <span>20 Apr</span><span>23 Apr</span><span>26 Apr</span><span>29 Apr</span><span>02 Mei</span><span>04 Mei</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR — full width counters */}
      <section className="relative z-10 mb-6 px-5 md:px-8">
        <div className="w-full">
          <LandingStatsBar
            stats={{ totalUsers, totalVideos, totalViews, totalLikes }}
          />
        </div>
      </section>

      {/* CATEGORIES — visual gallery of content types */}
      <section id="categories" className="relative z-10 w-full px-5 py-14 md:px-8">
        <div className="mb-12 text-center">
          <span className="rounded-full border border-accent-2/30 bg-accent-2/10 px-3 py-1 text-xs uppercase tracking-wider text-accent-2">{tt({id:'Categories',en:'Categories',jp:'カテゴリ',ar:'الفئات'})}</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">{tt({id:'Apa pun konten kamu, ada tempatnya di sini',en:'Whatever your content is, there’s a place for it here',jp:'どんなコンテンツでも、ここに居場所があります',ar:'أيا كان محتواك، هناك مكان له هنا'})}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            {tt({id:'Dari vlog harian sampai tutorial mendalam — MyStream nampung semua jenis cerita kamu.',en:'From daily vlogs to deep tutorials — MyStream hosts every kind of your story.',jp:'毎日のVlogから本格チュートリアルまで — MyStreamはあらゆるストーリーを受け入れます。',ar:'من فلوغات يومية إلى دروس متعمقة — MyStream يستضيف كل أنواع قصصك.'})}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <CategoryTile icon="video" label="Vlog & Daily" desc="Bagikan momen hari-harimu" tint="text-rose-400" chip="bg-rose-500/10" views="2.4K" videos="48" hot />
          <CategoryTile icon="gamepad" label="Gaming" desc="Highlight, gameplay, tutorial" tint="text-fuchsia-400" chip="bg-fuchsia-500/10" views="5.1K" videos="92" hot />
          <CategoryTile icon="music" label="Musik & Cover" desc="Bikin musik kamu didengar" tint="text-indigo-400" chip="bg-indigo-500/10" views="1.8K" videos="36" />
          <CategoryTile icon="book" label="Tutorial" desc="Skill kamu = ilmu berharga" tint="text-emerald-400" chip="bg-emerald-500/10" views="980" videos="24" />
          <CategoryTile icon="smile" label="Komedi" desc="Bikin orang senyum hari ini" tint="text-amber-400" chip="bg-amber-500/10" views="3.2K" videos="61" hot />
          <CategoryTile icon="palette" label="Seni & Kreatif" desc="DIY, drawing, animasi" tint="text-pink-400" chip="bg-pink-500/10" views="1.1K" videos="29" />
          <CategoryTile icon="laptop" label="Tech & Review" desc="Gadget, software, koding" tint="text-sky-400" chip="bg-sky-500/10" views="1.5K" videos="33" />
          <CategoryTile icon="sparkles" label="Lifestyle" desc="Fashion, makanan, travel" tint="text-violet-400" chip="bg-violet-500/10" views="2.0K" videos="44" />
        </div>
      </section>

      {/* FEATURES — expanded to 9 */}
      <section id="features" className="relative z-10 w-full px-5 py-14 md:px-8">
        <div className="mb-12 text-center">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-wider text-accent">Features</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">Fitur Lengkap untuk Creator Modern</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Semua yang kamu butuhkan untuk upload, kelola, dan tumbuhkan audience kamu.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature i="🎬" t="Upload Video / Gambar" d="Drag-drop file MP4, MOV, WebM, JPG, PNG, GIF. Auto-thumbnail dari frame video, auto-validate format & ukuran." />
          <Feature i="📈" t="Statistics Lengkap" d="Pantau views & likes per hari, sparkline 14-hari per video, dashboard real-time dengan auto-refresh." />
          <Feature i="🔗" t="Share Mode Fokus" d="Setiap video punya link nonton immersive — viewer tidak perlu daftar untuk nonton, langsung play." />
          <Feature i="🔐" t="Keamanan Top-tier" d="2FA TOTP via authenticator app (Google Auth/Authy), rate limit anti brute-force, captcha SVG anti-bot." />
          <Feature i="💬" t="DM ke Creator Lain" d="Follow creator favorit, kirim DM, dapat notifikasi real-time tiap ada like/follow/upload baru." />
          <Feature i="⭐" t="Plan Premium Opsional" d="Upgrade kalau butuh upload ukuran file unlimited, durasi unlimited, dan unlimited video / hari." />
          <Feature i="🎨" t="Player Customizable" d="Speed (0.5x-2x), pilih ukuran (XS sampai Full), resolusi indicator. Player jalan smooth di portrait & landscape." />
          <Feature i="🛡" t="Sponsor Layer Ad" d="Admin bisa set sponsor link yang user klik dulu sebelum video play. Monetisasi sederhana untuk konten kamu." />
          <Feature i="🌙" t="Dark / Light Mode" d="Theme toggle bisa diatur per-user. Auto-detect preferensi sistem, tersimpan di browser." />
        </div>
      </section>

      {/* SHOWCASE — visual mockups */}
      <section id="showcase" className="relative z-10 bg-bg-card/50 backdrop-blur-md border-y border-border">
        <div className="w-full px-5 py-14 md:px-8">
          <div className="mb-12 text-center">
            <span className="rounded-full border border-warn/30 bg-warn/10 px-3 py-1 text-xs uppercase tracking-wider text-warn">Showcase</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">Lihat sendiri — sebagus apa</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">3 pengalaman utama yang bikin MyStream nyaman dipakai sehari-hari.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ShowcaseCard
              icon="📊" title="Dashboard Real-time"
              desc="Stats berhitung otomatis pakai animasi count-up. Pantau views, likes, storage — semua live di 1 layar."
            >
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-md bg-bg p-2">
                  <div className="text-[9px] text-muted">VIEWS</div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-base font-extrabold text-accent">297</div>
                    <div className="text-[9px] font-bold text-success">↑ 12%</div>
                  </div>
                </div>
                <div className="rounded-md bg-bg p-2">
                  <div className="text-[9px] text-muted">LIKES</div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-base font-extrabold text-warn">6</div>
                    <div className="text-[9px] font-bold text-success">↑ 5%</div>
                  </div>
                </div>
              </div>
              {/* Mini sparkline chart */}
              <div className="mt-2 rounded-md bg-bg p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-muted">7 HARI TERAKHIR</span>
                  <span className="text-[9px] font-bold text-success">+15%</span>
                </div>
                <svg viewBox="0 0 100 28" className="w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 22 L 14 18 L 28 20 L 42 12 L 56 14 L 70 8 L 85 10 L 100 4 L 100 28 L 0 28 Z" fill="url(#sparkG)" />
                  <path d="M 0 22 L 14 18 L 28 20 L 42 12 L 56 14 L 70 8 L 85 10 L 100 4" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
              {/* Storage progress */}
              <div className="mt-2 rounded-md bg-bg p-2">
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="font-bold">💾 Storage</span>
                  <span className="text-muted">230 / 500 MB</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-elev">
                  <div className="h-full w-[46%] rounded-full bg-grad-accent" />
                </div>
              </div>
            </ShowcaseCard>

            <ShowcaseCard
              icon="🎬" title="Smart Video Player"
              desc="Player adaptif — Full / Medium / Small / XS, max-height 85vh untuk portrait video. Speed control + resolusi picker."
            >
              <div className="aspect-video rounded-md bg-black grid place-items-center text-3xl">▶</div>
              <div className="mt-2 flex gap-1 text-[10px]">
                <span className="rounded bg-bg-elev px-2 py-0.5">⚡ 1x</span>
                <span className="rounded bg-bg-elev px-2 py-0.5">📺 1080p</span>
                <span className="rounded bg-bg-elev px-2 py-0.5">📐 Full</span>
              </div>
            </ShowcaseCard>

            <ShowcaseCard
              icon="💬" title="DM & Notifikasi"
              desc="Follow creator, kirim DM langsung, dapat notifikasi real-time tiap ada like, follow, atau upload baru."
            >
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-grad-accent text-[10px] font-bold text-white">A</span>
                  <div className="flex-1 rounded-lg rounded-tl-sm bg-bg-elev px-2.5 py-1.5 text-[10px]">
                    Halo! Video terbaru kerennn 🔥
                  </div>
                </div>
                <div className="flex flex-row-reverse items-start gap-1.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-warn text-[10px] font-bold text-white">B</span>
                  <div className="rounded-lg rounded-tr-sm bg-grad-accent px-2.5 py-1.5 text-[10px] font-medium text-white">
                    Makasih! Subscribe dong 💜
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-[10px] font-bold text-white">C</span>
                  <div className="flex-1 rounded-lg rounded-tl-sm bg-bg-elev px-2.5 py-1.5 text-[10px]">
                    Udah follow 👍 next vid kapan?
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[9px] text-muted">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                <span>3 chat aktif · real-time</span>
              </div>
            </ShowcaseCard>
          </div>
        </div>
      </section>

      {/* TOP CREATORS */}
      {topCreators.length > 0 && (
        <section className="relative z-10 w-full px-5 py-14 md:px-8">
          <div className="mb-12 text-center">
            <span className="rounded-full border border-accent-2/30 bg-accent-2/10 px-3 py-1 text-xs uppercase tracking-wider text-accent-2">Top Creators</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">Creator paling populer</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">Mereka yang aktif upload + dapat views terbanyak di MyStream.</p>
          </div>
          <div className={`grid gap-3 ${topCreators.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : topCreators.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : topCreators.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
            {topCreators.map((c, i) => (
              <div key={c.username} className="card text-center transition hover:border-accent/60">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-grad-accent text-2xl font-extrabold text-white shadow-glow">
                  {c.username[0].toUpperCase()}
                </div>
                <div className="mt-3 truncate font-bold">@{c.username}</div>
                <div className="mt-1 text-xs text-muted">{c.videos} video · {fmtN(c.views)} views</div>
                {i === 0 && <div className="mt-2 inline-block rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-bold text-warn">🏆 #1</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CREATOR STORY — narrative section dengan kata2 inspiratif */}
      <section id="story" className="relative z-10 w-full px-5 py-16 md:px-8">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Left: Big inspirational quote */}
          <div>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-wider text-accent">Cerita Kamu, Mulai Hari Ini</span>
            <h2 className="mt-4 text-3xl md:text-5xl font-extrabold leading-tight">
              Setiap video adalah <span className="text-accent">cerita</span> yang menunggu dilihat seseorang.
            </h2>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              Kamu nggak perlu kamera mahal. Nggak perlu studio. Cukup hp di tangan,
              ide di kepala, dan keberanian buat mulai. MyStream adalah panggung kamu —
              tempat momen kecil bisa jadi inspirasi buat orang lain di seluruh dunia.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border bg-bg-card/60 p-4 backdrop-blur-md">
                <div className="text-3xl">📱</div>
                <div className="mt-2 text-xs font-bold">Cuma butuh HP</div>
              </div>
              <div className="rounded-xl border border-border bg-bg-card/60 p-4 backdrop-blur-md">
                <div className="text-3xl">⏱</div>
                <div className="mt-2 text-xs font-bold">30 detik daftar</div>
              </div>
              <div className="rounded-xl border border-border bg-bg-card/60 p-4 backdrop-blur-md">
                <div className="text-3xl">🌍</div>
                <div className="mt-2 text-xs font-bold">Dilihat dunia</div>
              </div>
            </div>
          </div>
          {/* Right: 3 narrative story cards stacked */}
          <div className="space-y-4">
            <StoryCard
              num="01" emoji="🌱"
              title="Dari yang kecil"
              quote="“Video pertamaku cuma 30 detik, dilihat 5 orang. Tapi salah satunya bilang ‘keren’ — dan dari situ aku terus upload.”"
              author="— ribuan creator yang udah mulai"
            />
            <StoryCard
              num="02" emoji="💜"
              title="Audience yang nyata"
              quote="“Setiap like itu manusia beneran. Setiap follower itu seseorang yang ngerasa terhubung sama cerita kamu.”"
              author="— filosofi MyStream"
            />
            <StoryCard
              num="03" emoji="🚀"
              title="Naik bareng"
              quote="“Komunitas creator di sini saling support, saling DM, saling kasih feedback. Kamu nggak naik sendirian.”"
              author="— spirit komunitas"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative z-10 bg-bg-card/50 backdrop-blur-md border-y border-border">
        <div className="w-full px-5 py-14 md:px-8">
          <div className="mb-12 text-center">
            <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs uppercase tracking-wider text-success">How it Works</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">Cara Kerja — 3 Langkah</h2>
            <p className="mt-3 text-muted">Dari nol ke video pertama kamu dalam 60 detik.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Step n={1} t="Daftar Gratis" d="Bikin akun pakai username + email. Cuma butuh 30 detik dengan captcha anti-bot." extra="Recommended: aktifkan 2FA langsung biar akun terlindungi." />
            <Step n={2} t="Upload Video" d="Klik tombol +Upload, pilih file, isi judul & deskripsi. Thumbnail otomatis ke-generate." extra="Free 500 MB · Premium unlimited per file." />
            <Step n={3} t="Share & Tumbuh" d="Share link nonton ke teman. Pantau views & likes naik di dashboard real-time." extra="Stats update otomatis, bisa download video sendiri kapan saja." />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="relative z-10 w-full px-5 py-14 md:px-8">
        <div className="mb-12 text-center">
          <span className="rounded-full border border-warn/30 bg-warn/10 px-3 py-1 text-xs uppercase tracking-wider text-warn">⭐⭐⭐⭐⭐</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">Apa kata pengguna kami</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">Real feedback dari creator yang udah pakai MyStream.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Testimonial
            name="aero" handle="@aero_admin" role="Admin & Power User"
            quote="Akhirnya ada platform sederhana buat share video tanpa ribet. Upload 10 GB beneran jalan, gak ada limit aneh-aneh."
            rating={5}
          />
          <Testimonial
            name="bintang211" handle="@bintang211" role="Content Creator"
            quote="Dashboard statisticsnya keren, bisa lihat sparkline per video. Banner customizable juga bantu banget buat brand kontenku."
            rating={5}
          />
          <Testimonial
            name="124214" handle="@124214" role="Casual User"
            quote="Daftar 30 detik beneran. Captcha anti-bot oke, login pakai 2FA berasa aman banget. Recommended buat semua orang."
            rating={5}
          />
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 bg-bg-card/50 backdrop-blur-md border-y border-border">
        <div className="w-full px-5 py-14 md:px-8">
          <div className="mb-12 text-center">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-wider text-accent">Pricing</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">Pilih Plan Kamu</h2>
            <p className="mt-3 text-muted">Mulai dengan Free. Upgrade ke Premium kapan kamu butuh kapasitas lebih besar.</p>
          </div>
          <LandingPricing />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-5 py-14 md:px-8">
        <div className="mb-12 text-center">
          <span className="rounded-full border border-muted/30 bg-bg-card px-3 py-1 text-xs uppercase tracking-wider text-muted">FAQ</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold">Pertanyaan Umum</h2>
          <p className="mt-3 text-muted">Jawaban untuk pertanyaan yang sering ditanyakan.</p>
        </div>
        <LandingFAQ />
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 w-full px-5 py-16 md:px-8 text-center">
        <div className="rounded-3xl bg-grad-accent p-12 shadow-glow">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            Siap mulai journey kamu?
          </h2>
          <p className="mt-4 text-white/90 text-lg">
            Daftar sekarang, gratis selamanya — tidak butuh kartu kredit.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <AuthLink mode="signup" className="rounded-xl bg-white px-8 py-3 text-base font-bold text-accent shadow-lg hover:scale-105 transition">
              🚀 Daftar Sekarang Gratis
            </AuthLink>
            <AuthLink mode="login" className="rounded-xl border-2 border-white px-8 py-3 text-base font-bold text-white hover:bg-white/10 transition">
              Saya sudah punya akun
            </AuthLink>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border bg-bg-card/40 backdrop-blur">
        <div className="w-full px-5 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2 font-bold">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-grad-accent text-white">M</span>
                MyStream
              </Link>
              <p className="mt-3 text-sm text-muted">Platform berbagi video sederhana untuk semua creator.</p>
            </div>
            <div>
              <div className="mb-3 text-xs uppercase tracking-wide text-muted">Produk</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-accent">Fitur</a></li>
                <li><a href="#showcase" className="hover:text-accent">Showcase</a></li>
                <li><a href="#how" className="hover:text-accent">Cara Kerja</a></li>
                <li><a href="#pricing" className="hover:text-accent">Harga</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-xs uppercase tracking-wide text-muted">Akun</div>
              <ul className="space-y-2 text-sm">
                <li><AuthLink mode="signup" className="hover:text-accent">Daftar Gratis</AuthLink></li>
                <li><AuthLink mode="login" className="hover:text-accent">Login</AuthLink></li>
                <li><Link href="/dashboard" className="hover:text-accent">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-xs uppercase tracking-wide text-muted">Resource</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#testimonials" className="hover:text-accent">Review</a></li>
                <li><a href="#faq" className="hover:text-accent">FAQ</a></li>
                <li><span className="text-muted">Terms · Privacy</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted">
            © {new Date().getFullYear()} MyStream — built with Next.js · {fmtN(totalUsers)} creators · {fmtN(totalVideos)} videos · {fmtN(totalViews)} views · {fmtN(totalLikes)} likes
          </div>
        </div>
      </footer>
    </div>
  );
}

// Ikon garis (SVG, gaya Lucide) — bukan emoji 3D. Bersih & konsisten.
const CAT_ICONS: Record<string, JSX.Element> = {
  video: (<><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" /></>),
  gamepad: (<><line x1="6" x2="10" y1="12" y2="12" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="15" x2="15.01" y1="13" y2="13" /><line x1="18" x2="18.01" y1="11" y2="11" /><rect width="20" height="12" x="2" y="6" rx="2" /></>),
  music: (<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>),
  book: (<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />),
  smile: (<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></>),
  palette: (<><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2Z" /></>),
  laptop: (<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />),
  sparkles: (<path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />),
};

function CategoryTile({ icon, label, desc, tint, chip, views, videos, hot }: {
  icon: string; label: string; desc: string; tint: string; chip: string;
  views?: string; videos?: string; hot?: boolean;
}) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-bg-card p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg cursor-pointer">
      <div className="flex items-start justify-between">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${chip} ${tint}`}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            {CAT_ICONS[icon] || CAT_ICONS.video}
          </svg>
        </div>
        {hot && (
          <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Hot
          </span>
        )}
      </div>

      <h3 className="mt-4 text-base font-bold text-text">{label}</h3>
      <p className="mt-1 line-clamp-1 text-[13px] text-muted">{desc}</p>

      {(views || videos) && (
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[11px] font-medium text-muted">
          {videos && <span className={tint}>{videos} video</span>}
          {videos && views && <span className="text-border">·</span>}
          {views && <span>{views} views</span>}
        </div>
      )}
    </div>
  );
}

function StoryCard({ num, emoji, title, quote, author }: { num: string; emoji: string; title: string; quote: string; author: string }) {
  return (
    <article className="rounded-2xl border border-border bg-bg-card/70 p-5 backdrop-blur-md transition hover:border-accent/60 hover:bg-bg-card/85">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-accent">{num}</span>
          <span className="mt-1 text-3xl">{emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{title}</h3>
          <p className="mt-2 text-sm italic leading-relaxed text-text/90">{quote}</p>
          <p className="mt-2 text-[11px] text-muted">{author}</p>
        </div>
      </div>
    </article>
  );
}

function Feature({ i, t, d }: { i: string; t: string; d: string }) {
  return (
    <article className="card group text-center transition hover:-translate-y-1 hover:border-accent/60 hover:shadow-glow">
      <div className="text-4xl transition group-hover:scale-110">{i}</div>
      <h3 className="mt-3 font-bold text-lg">{t}</h3>
      <p className="mt-2 text-sm text-muted leading-relaxed">{d}</p>
    </article>
  );
}

function ShowcaseCard({ icon, title, desc, children }: { icon: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <article className="card transition hover:border-accent/60 hover:-translate-y-1">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-grad-accent text-xl text-white shadow-glow">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{title}</h3>
          <p className="mt-1 text-xs text-muted">{desc}</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-bg p-3">
        {children}
      </div>
    </article>
  );
}

function Step({ n, t, d, extra }: { n: number; t: string; d: string; extra?: string }) {
  return (
    <div className="card text-center transition hover:border-accent/60">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-grad-accent text-2xl font-extrabold text-white shadow-glow">
        {n}
      </div>
      <h3 className="mt-4 font-bold text-lg">{t}</h3>
      <p className="mt-2 text-sm text-muted">{d}</p>
      {extra && <p className="mt-2 text-[10px] italic text-accent/80">💡 {extra}</p>}
    </div>
  );
}

function Testimonial({ name, handle, role, quote, rating }: { name: string; handle: string; role: string; quote: string; rating: number }) {
  return (
    <article className="card transition hover:border-accent/60 hover:-translate-y-1">
      <div className="text-warn">{'⭐'.repeat(rating)}</div>
      <p className="mt-3 text-sm leading-relaxed">"{quote}"</p>
      <div className="mt-4 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-grad-accent text-sm font-bold text-white">{name[0].toUpperCase()}</div>
        <div>
          <div className="text-sm font-bold">{name}</div>
          <div className="text-[10px] text-muted">{handle} · {role}</div>
        </div>
      </div>
    </article>
  );
}

