import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { api } from './api/client'
import { subscribeToDirectMessages } from './api/realtime'
import type { AdminComment, AdminDashboard, AdminPost, AttendanceRankingRow, AttendanceSummary, ChallengeDetail, ChallengeSummary, CommunityCategory, DirectMessage, Friend, HiddenSummary, PostComment, PostDetail, PostSummary, Profile, RankingRow, Stats, User, VaultCosmetic, VaultSummary } from './types/api'
import miniCtfLogo from './assets/mini-ctf-reference-logo.png'
import cipherVaultRelics from './assets/cipher-vault-relic-grid.png'
import './App.css'
import './typography.css'

type View = 'home' | 'challenges' | 'ranking' | 'profile' | 'community' | 'admin' | 'login'
type Filter = 'ALL' | 'WEB' | 'CRYPTO' | 'FORENSICS' | 'MISC'

const emptyStats: Stats = { challenges: 0, solves: 0, users: 0 }
const initialOAuthError = new URLSearchParams(window.location.search).get('oauthError')
const initialLoginError = initialOAuthError
  ? initialOAuthError === 'authorization_request_not_found'
    ? 'OAuth session expired. Open the login page and try again.'
    : initialOAuthError === 'discord_rate_limited'
      ? 'Discord temporarily rate-limited the sign-in request. Please wait a few minutes and try again.'
    : 'OAuth sign-in could not be completed. Please try again.'
  : ''
type Theme = 'dark' | 'light'
const initialTheme: Theme = localStorage.getItem('mini-ctf-theme') === 'light' ? 'light' : 'dark'
const oauthBaseUrl = import.meta.env.VITE_OAUTH_BASE_URL ?? 'http://localhost:8080'

function App() {
  const [view, setView] = useState<View>(initialOAuthError ? 'login' : 'home')
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([])
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [attendanceRanking, setAttendanceRanking] = useState<AttendanceRankingRow[]>([])
  const [selected, setSelected] = useState<ChallengeDetail | null>(null)
  const [openingChallenge, setOpeningChallenge] = useState<string | null>(null)
  const [category, setCategory] = useState<Filter>('ALL')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [compactLayout, setCompactLayout] = useState(() => window.innerWidth <= 620)
  const [error, setError] = useState(initialLoginError)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [vaultOpening, setVaultOpening] = useState(false)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [hiddenOpen, setHiddenOpen] = useState(false)
  const vaultClicks = useRef<number[]>([])

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [nextStats, nextChallenges, nextRanking, nextAttendanceRanking] = await Promise.all([api.stats(), api.challenges(), api.ranking(), api.attendanceRanking()])
      setStats(nextStats)
      setChallenges(nextChallenges)
      setRanking(nextRanking)
      setAttendanceRanking(nextAttendanceRanking)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to the API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (token) {
      localStorage.setItem('mini-ctf-token', token)
      window.history.replaceState(null, '', window.location.pathname)
    }
    if (initialOAuthError) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    if (localStorage.getItem('mini-ctf-token')) {
      api.me().then(setUser).catch(() => localStorage.removeItem('mini-ctf-token'))
    }
    void Promise.all([api.stats(), api.challenges(), api.ranking(), api.attendanceRanking()])
      .then(([nextStats, nextChallenges, nextRanking, nextAttendanceRanking]) => {
        setStats(nextStats)
        setChallenges(nextChallenges)
        setRanking(nextRanking)
        setAttendanceRanking(nextAttendanceRanking)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not connect to the API.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const updateLayout = () => setCompactLayout(window.innerWidth <= 620)
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('mini-ctf-theme', theme)
  }, [theme])

  const visibleChallenges = useMemo(
    () => challenges.filter((item) => category === 'ALL' || item.category === category),
    [category, challenges],
  )
  const navigate = (next: View) => {
    setSelected(null)
    setView(next)
    setMobileNavOpen(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const openChallenge = async (item: ChallengeSummary) => {
    setError('')
    setView('challenges')
    setOpeningChallenge(item.title)
    try {
      setSelected(await api.challenge(item.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the challenge.')
    } finally {
      setOpeningChallenge(null)
    }
  }
  const completeAuth = (result: { token: string; user: User }) => {
    localStorage.setItem('mini-ctf-token', result.token)
    setUser(result.user)
    navigate('challenges')
    void refresh()
  }
  const logout = () => {
    localStorage.removeItem('mini-ctf-token')
    setUser(null)
    navigate('home')
    void refresh()
  }
  const triggerVault = () => {
    if (!user) { navigate('login'); return }
    vaultClicks.current.push(Date.now())
    if (vaultClicks.current.length < 5) {
      return
    }
    vaultClicks.current = []
    setVaultOpening(true)
    window.setTimeout(() => { setVaultOpening(false); setHiddenOpen(true) }, 1800)
  }

  return <div className="app-shell">
    <header className="site-header">
      <button className="brand" type="button" onClick={() => navigate('home')}><span>MINI<span className="brand-accent">/</span>CTF</span></button>
      {compactLayout && <button className="menu-toggle" type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-controls="primary-navigation" style={{ display: 'block', position: 'fixed', top: '21px', right: '20px', zIndex: 10 }}>Menu<span className="sr-only"> navigation</span></button>}
      <nav id="primary-navigation" className={mobileNavOpen ? 'primary-nav is-open' : 'primary-nav'} aria-label="Primary navigation">
        <NavButton active={view === 'home'} onClick={() => navigate('home')}>Home</NavButton>
        <NavButton active={view === 'challenges'} onClick={() => navigate('challenges')}>Challenges</NavButton>
        <NavButton active={view === 'ranking'} onClick={() => navigate('ranking')}>Ranking</NavButton>
        <NavButton active={view === 'community'} onClick={() => navigate('community')}>Community</NavButton>
        <NavButton active={view === 'profile'} onClick={() => navigate('profile')}>My Page</NavButton>
        {user && <NavButton active={false} onClick={() => { setMobileNavOpen(false); setVaultOpen(true) }}>Vault</NavButton>}
        {user?.role === 'ADMIN' && <NavButton active={view === 'admin'} onClick={() => navigate('admin')}>Admin</NavButton>}
        {user ? <button className="nav-button mobile-auth" type="button" onClick={logout}>Sign out</button> : <button className="nav-button mobile-auth" type="button" onClick={() => navigate('login')}>Sign in</button>}
      </nav>
      <div className="header-actions">{user ? <><span className="header-login header-identity">{user.nickname || user.username}</span><button className={`theme-toggle ${theme === 'light' ? 'is-light' : ''}`} type="button" aria-pressed={theme === 'light'} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span className="theme-toggle-track" aria-hidden="true"><span className="theme-toggle-thumb">{theme === 'dark' ? '☾' : '☀'}</span></span></button><button className="header-login" type="button" onClick={logout}>Sign out</button></> : <button className="header-login" type="button" onClick={() => navigate('login')}>Sign in</button>}</div>
    </header>
    <main>
      {error && <div className="page"><div className="inline-alert"><p className="alert error">{error}</p><button type="button" className="button secondary" onClick={() => void refresh()}>Retry</button></div></div>}
      {loading && <div className="page"><LoadingState label="Loading live platform data..." /></div>}
      {!loading && view === 'home' && <Home stats={stats} challenges={challenges} onExplore={() => navigate('challenges')} onRanking={() => navigate('ranking')} onOpen={openChallenge} onVault={triggerVault} />}
      {!loading && view === 'challenges' && (selected ? <ChallengeDetailView item={selected} loggedIn={Boolean(user)} onBack={() => setSelected(null)} onLogin={() => navigate('login')} onSubmitted={refresh} /> : openingChallenge ? <div className="page"><LoadingState label={`Opening ${openingChallenge}...`} /></div> : <ChallengesView items={visibleChallenges} total={challenges.length} category={category} onCategory={setCategory} onOpen={openChallenge} />)}
      {!loading && view === 'ranking' && <RankingView rows={ranking} attendanceRows={attendanceRanking} />}
      {!loading && view === 'profile' && <ProfileView user={user} onChallenges={() => navigate('challenges')} onLogin={() => navigate('login')} onVault={() => setVaultOpen(true)} />}
      {!loading && view === 'community' && <EnhancedCommunityView user={user} onLogin={() => navigate('login')} />}
      {!loading && view === 'admin' && user?.role === 'ADMIN' && <AdminConsole />}
      {!loading && view === 'login' && <LoginView onBack={() => navigate('home')} onAuth={completeAuth} />}
    </main>
    {vaultOpening && <VaultOpening />}
    {hiddenOpen && user && <HiddenOperation user={user} onClose={() => setHiddenOpen(false)} />}
    {vaultOpen && user && <CipherVault user={user} onClose={() => setVaultOpen(false)} />}
    <footer className="site-footer"><span><strong>MINI/CTF</strong> · learn by breaking things safely</span><span className="footer-status">live API connection</span></footer>
  </div>
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button className={active ? 'nav-button active' : 'nav-button'} type="button" onClick={onClick}>{children}</button> }

function LoadingState({ label }: { label: string }) {
  return <div className="loading-state" role="status"><span className="loading-mark" aria-hidden="true" /><p>{label}</p></div>
}

function LegacyHome({ stats, challenges, onExplore, onRanking, onOpen, onVault }: { stats: Stats; challenges: ChallengeSummary[]; onExplore: () => void; onRanking: () => void; onOpen: (item: ChallengeSummary) => void; onVault: () => void }) {
  return <div className="page home-page"><section className="hero-section"><div className="hero-copy"><p className="eyebrow">SECURITY TRAINING PLATFORM</p><h1>Learn security<br /><span>by solving.</span></h1><p className="hero-description">Live challenges, secure FLAG validation, and a real ranking.</p><div className="hero-actions"><button className="button primary" type="button" onClick={onExplore}>Start challenges</button><button className="button ghost" type="button" onClick={onRanking}>View ranking</button></div></div><button className="hero-visual hero-vault-trigger" type="button" onClick={onVault} aria-label="Mini CTF emblem"><ThemeLogo className="hero-hero-logo" alt="Mini CTF emblem" /></button></section><section className="stat-strip" aria-label="Platform statistics"><Stat value={stats.challenges} label="Challenges" detail="active labs" /><Stat value={stats.solves} label="Solves" detail="recorded" /><Stat value={stats.users} label="Learners" detail="registered" /><div className="live-badge">live platform</div></section><section className="content-section featured-section"><div className="section-heading"><div><p className="eyebrow">EXPLORE THE LABS</p><h2>Featured challenges.</h2></div><button type="button" className="text-link" onClick={onExplore}>View all challenges</button></div><div className="featured-list">{challenges.slice(0, 3).map((item) => <ChallengeRow key={item.id} item={item} onOpen={onOpen} />)}{challenges.length === 0 && <EmptyState />}</div></section></div>
}

function Home({ stats, challenges, onExplore, onRanking, onOpen, onVault }: { stats: Stats; challenges: ChallengeSummary[]; onExplore: () => void; onRanking: () => void; onOpen: (item: ChallengeSummary) => void; onVault: () => void }) {
  const firstLesson = challenges.find((challenge) => !challenge.solved) ?? challenges[0]
  return <div className="page home-page beginner-home"><section className="hero-section beginner-hero"><div className="hero-copy"><p className="eyebrow">SAFE SECURITY PLAYGROUND</p><h1>Start small.<br /><span>Learn safely.</span></h1><p className="hero-description">Mini-CTF is a friendly practice space for learning security basics through puzzles. Everything here is a safe, offline training challenge.</p><div className="hero-actions"><button className="button primary" type="button" onClick={() => firstLesson ? onOpen(firstLesson) : onExplore()}>Start your first lesson</button><button className="button ghost" type="button" onClick={onExplore}>Browse all lessons</button></div><p className="beginner-reassurance">No prior experience needed · Take your time · Hints are available when you need them</p></div><button className="hero-visual hero-vault-trigger beginner-logo-button" type="button" onClick={onVault} aria-label="Mini CTF emblem"><ThemeLogo className="hero-hero-logo" alt="Mini CTF shield emblem" /></button></section><section className="beginner-path" aria-label="Getting started"><article><span>01</span><h2>Choose a starter lesson</h2><p>Begin with a short puzzle that introduces one idea at a time.</p></article><article><span>02</span><h2>Follow the clues</h2><p>Read the brief, try small steps, and use a hint whenever you feel stuck.</p></article><article><span>03</span><h2>Celebrate progress</h2><p>Submit your FLAG, earn points, and build confidence at your own pace.</p></article></section><section className="stat-strip" aria-label="Platform statistics"><Stat value={stats.challenges} label="Practice lessons" detail="safe learning labs" /><Stat value={stats.solves} label="Wins recorded" detail="small steps add up" /><Stat value={stats.users} label="Learners" detail="learning together" /><div className="live-badge">beginner-friendly</div></section><section className="content-section featured-section"><div className="section-heading"><div><p className="eyebrow">START HERE</p><h2>Gentle first steps.</h2></div><button type="button" className="text-link" onClick={onRanking}>See learner progress</button></div><div className="featured-list">{challenges.slice(0, 3).map((item) => <ChallengeRow key={item.id} item={item} onOpen={onOpen} />)}{challenges.length === 0 && <EmptyState />}</div></section></div>
}

function ThemeLogo({ className, alt }: { className: string; alt: string }) {
  return <img className={className} src={miniCtfLogo} alt={alt} />
}

function VaultOpening() {
  return <div className="vault-opening" role="status" aria-label="Opening hidden operation"><div className="vault-opening-scan" /><div className="vault-rings" aria-hidden="true"><i /><i /><i /></div><div className="vault-opening-mark">◆</div><p>SEQUENCE ACCEPTED</p><strong>ACCESS GRANTED</strong><small>OPENING HIDDEN OPERATION</small></div>
}

function HiddenOperation({ user, onClose }: { user: User; onClose: () => void }) {
  const [summary, setSummary] = useState<HiddenSummary | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try { setError(''); setSummary(await api.discoverHiddenVault()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the hidden operation.') }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer) }, [refresh])
  const claim = async (id: string) => {
    try { setBusy(id); setError(''); setSummary(await api.claimHiddenMission(id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hidden mission failed.') } finally { setBusy(null) }
  }
  return <div className="hidden-operation-backdrop" role="dialog" aria-modal="true" aria-label="Hidden operation"><section className="hidden-operation"><header><div><p className="eyebrow">UNLISTED CHANNEL // 05</p><h2>Signal recovered.</h2><p>The logo was the entrance. Complete every operation to claim the classified profile set.</p></div><button className="vault-close" type="button" onClick={onClose} aria-label="Close hidden operation">×</button></header>{!summary ? <LoadingState label="Decrypting the recovered signal..." /> : <><div className="hidden-operation-status"><span className="ruby-gem" aria-hidden="true" /><div><strong>{summary.rewarded ? 'Operation complete' : 'Operation in progress'}</strong><small>{summary.rewarded ? 'Classified rewards are now in your collection.' : user.role === 'ADMIN' ? 'Administrator access: all rewards available.' : 'Three fragments. One hidden reward set.'}</small></div></div><div className="hidden-mission-list">{summary.missions.map((mission, index) => <article className={`hidden-mission ${mission.completed ? 'complete' : ''}`} key={mission.id}><span className="hidden-mission-number">0{index + 1}</span><div><span className="vault-kicker">CLASSIFIED TASK</span><h3>{mission.name}</h3><p>{mission.description}</p></div><button className="button primary" type="button" disabled={mission.completed || !mission.eligible || busy === mission.id} onClick={() => void claim(mission.id)}>{mission.completed ? 'Complete' : mission.eligible ? 'Claim fragment' : 'Locked'}</button></article>)}</div><div className="hidden-reward-grid">{summary.rewards.map((reward) => <div className={`hidden-reward ${reward.owned ? 'owned' : ''}`} key={reward.id}><span>{reward.type === 'FRAME' ? '▣' : reward.type === 'TITLE' ? '✦' : '◇'}</span><strong>{reward.name}</strong><small>{reward.owned ? 'Unlocked' : 'Classified reward'}</small></div>)}</div>{error && <p className="alert error vault-error">{error}</p>}</>}</section></div>
}

function LegacyCipherVault({ user, onClose }: { user: User; onClose: () => void }) {
  const [summary, setSummary] = useState<VaultSummary | null>(null)
  const [tab, setTab] = useState<'missions' | 'shop' | 'craft' | 'collection'>('shop')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try { setError(''); setSummary(await api.discoverVault()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open Cipher Vault.') }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer) }, [refresh])
  const run = async (key: string, action: () => Promise<VaultSummary>) => {
    try { setBusy(key); setError(''); setSummary(await action()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Vault action failed.') } finally { setBusy(null) }
  }
  const visible = (item: VaultCosmetic) => !item.hidden || item.owned || user.role === 'ADMIN'
  const cosmetics = summary?.cosmetics.filter(visible) ?? []
  const shop = cosmetics.filter((item) => item.source === 'STORE')
  const craft = cosmetics.filter((item) => item.source === 'CRAFT')
  const collection = cosmetics.filter((item) => item.owned)
  return <div className="vault-backdrop" role="dialog" aria-modal="true" aria-label="Cipher Vault"><section className="cipher-vault"><header className="vault-header"><div><p className="eyebrow">CLASSIFIED COLLECTION // VAULT-05</p><h2>Cipher Vault</h2><p>Complete daily operations. Collect fragments. Wear the proof.</p></div><button className="vault-close" type="button" onClick={onClose} aria-label="Close Cipher Vault">×</button></header>{!summary ? <LoadingState label="Decrypting your vault..." /> : <><div className="vault-wallet"><div><span>◈</span><strong>{summary.gems}</strong><small>Cipher Gems</small></div><div><span>◇</span><strong>{summary.fragments}</strong><small>Vault Fragments</small></div><div className="vault-admin-status">{user.role === 'ADMIN' ? 'ADMIN ACCESS: ALL COSMETICS UNLOCKED' : 'Daily rewards reset at midnight (KST)'}</div></div><nav className="vault-tabs" aria-label="Cipher Vault sections">{([['missions', 'Today'], ['shop', 'Shop'], ['craft', 'Forge'], ['collection', 'Collection']] as const).map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} type="button" onClick={() => setTab(id)}>{label}</button>)}</nav>{tab === 'missions' && <div className="vault-grid mission-grid">{summary.missions.map((mission) => <article className={`vault-card mission-card ${mission.completed ? 'complete' : ''}`} key={mission.id}><div className="vault-card-icon">{mission.completed ? '✓' : '◌'}</div><div><span className="vault-kicker">DAILY MISSION</span><h3>{mission.name}</h3><p>{mission.description}</p><div className="vault-reward">◈ {mission.gemReward}{mission.fragmentReward > 0 && <> <b>+</b> ◇ {mission.fragmentReward}</>}</div></div><button className="button primary" type="button" disabled={mission.completed || !mission.eligible || busy === mission.id} onClick={() => void run(mission.id, () => api.claimVaultMission(mission.id))}>{mission.completed ? 'Claimed' : mission.eligible ? 'Claim reward' : 'In progress'}</button></article>)}</div>}{tab === 'shop' && <VaultItems items={shop} gems={summary.gems} busy={busy} action={(item) => run(item.id, () => api.buyVaultItem(item.id))} actionLabel="Buy" />}{tab === 'craft' && <VaultItems items={craft} fragments={summary.fragments} busy={busy} action={(item) => run(item.id, () => api.craftVaultItem(item.id))} actionLabel="Craft" />}{tab === 'collection' && <VaultItems items={collection} busy={busy} action={(item) => run(item.id, () => api.equipVaultItem(item.id))} actionLabel="Equip" />}{error && <p className="alert error vault-error">{error}</p>}</>}</section></div>
}

function CipherVault({ user, onClose }: { user: User; onClose: () => void }) {
  const [summary, setSummary] = useState<VaultSummary | null>(null)
  const [tab, setTab] = useState<'shop' | 'missions' | 'collection'>('shop')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try { setError(''); setSummary(await api.vault()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open Cipher Vault.') }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer) }, [refresh])
  const run = async (key: string, action: () => Promise<VaultSummary>) => {
    try { setBusy(key); setError(''); setSummary(await action()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Vault action failed.') } finally { setBusy(null) }
  }
  const items = summary?.cosmetics.filter((item) => !item.hidden || item.owned || user.role === 'ADMIN') ?? []
  const shop = items.filter((item) => item.source === 'STORE')
  const collection = items.filter((item) => item.owned)
  return <div className="vault-backdrop" role="dialog" aria-modal="true" aria-label="Cipher Vault"><section className="cipher-vault vault-redesign"><header className="vault-header"><div><p className="eyebrow">CIPHER VAULT // PERSONAL LOADOUT</p><h2>Red Ruby Exchange</h2><p>Trade earned rubies for frames, accents, titles, and hint credits.</p></div><button className="vault-close" type="button" onClick={onClose} aria-label="Close Cipher Vault">×</button></header>{!summary ? <LoadingState label="Loading your collection..." /> : <><div className="vault-wallet vault-wallet-redesigned"><div className="ruby-wallet"><span className="ruby-gem" aria-hidden="true" /><strong>{summary.gems}</strong><small>Red Rubies</small></div><div className="vault-balance"><strong>{summary.hintCredits}</strong><small>Hint Credits</small></div><div className="vault-admin-status">{user.role === 'ADMIN' ? 'ADMIN ACCESS · UNLIMITED INVENTORY' : 'Earn rubies through attendance and missions'}</div></div><nav className="vault-tabs" aria-label="Cipher Vault sections"><button className={tab === 'shop' ? 'active' : ''} type="button" onClick={() => setTab('shop')}>Exchange</button><button className={tab === 'missions' ? 'active' : ''} type="button" onClick={() => setTab('missions')}>Missions</button><button className={tab === 'collection' ? 'active' : ''} type="button" onClick={() => setTab('collection')}>My loadout</button></nav>{tab === 'shop' && <div className="vault-grid item-grid vault-shop-grid">{shop.map((item) => <article className={`vault-card item-card vault-shop-card ${item.equipped ? 'equipped' : ''}`} key={item.id}><span className="vault-kicker">{item.type === 'CREDIT' ? 'UTILITY' : item.type}</span><div className="vault-item-glyph">{item.type === 'FRAME' ? '▣' : item.type === 'ACCESSORY' ? '◇' : '✦'}</div><h3>{item.name}</h3><p>{item.description}</p><div className="item-footer"><span className="ruby-price"><span className="ruby-gem small" aria-hidden="true" />{item.gemCost}</span><button className="button primary" type="button" disabled={(!item.consumable && item.owned) || busy === item.id || (user.role !== 'ADMIN' && summary.gems < item.gemCost)} onClick={() => void run(item.id, () => api.buyVaultItem(item.id))}>{item.consumable ? 'Add credit' : item.owned ? 'Owned' : 'Acquire'}</button></div></article>)}</div>}{tab === 'missions' && <div className="vault-grid mission-grid">{summary.missions.map((mission) => <article className={`vault-card mission-card ${mission.completed ? 'complete' : ''}`} key={mission.id}><div className="vault-card-icon">{mission.completed ? '✓' : '◌'}</div><div><span className="vault-kicker">DAILY MISSION</span><h3>{mission.name}</h3><p>{mission.description}</p></div><button className="button primary" type="button" disabled={mission.completed || !mission.eligible || busy === mission.id} onClick={() => void run(mission.id, () => api.claimVaultMission(mission.id))}>{mission.completed ? 'Claimed' : mission.eligible ? 'Claim reward' : 'In progress'}</button></article>)}</div>}{tab === 'collection' && <div className="vault-grid item-grid vault-shop-grid">{collection.map((item) => <article className={`vault-card item-card vault-shop-card ${item.equipped ? 'equipped' : ''}`} key={item.id}><span className="vault-kicker">{item.type}</span><div className="vault-item-glyph">{item.type === 'FRAME' ? '▣' : item.type === 'ACCESSORY' ? '◇' : '✦'}</div><h3>{item.name}</h3><p>{item.description}</p><div className="item-footer"><span>{item.equipped ? 'Currently equipped' : 'Ready to equip'}</span><button className="button secondary" type="button" disabled={busy === item.id} onClick={() => void run(item.id, () => api.equipVaultItem(item.id))}>{item.equipped ? 'Detach' : 'Equip'}</button></div></article>)}</div>}{collection.length === 0 && tab === 'collection' && <div className="vault-empty"><h3>Your loadout is empty.</h3><p>Acquire a profile frame, accent, or title from the exchange.</p></div>}{error && <p className="alert error vault-error">{error}</p>}</>}</section></div>
}

function VaultItems({ items, gems = 0, fragments = 0, busy, action, actionLabel }: { items: VaultCosmetic[]; gems?: number; fragments?: number; busy: string | null; action: (item: VaultCosmetic) => Promise<void>; actionLabel: string }) {
  if (items.length === 0) return <div className="vault-empty"><span>◇</span><h3>Nothing here yet.</h3><p>Complete missions to fill this collection.</p></div>
  return <div className="vault-grid item-grid">{items.map((item) => { const canAfford = item.source === 'STORE' ? gems >= item.gemCost : item.source === 'CRAFT' ? fragments >= item.fragmentCost : true; const disabled = item.owned && actionLabel !== 'Equip' || !canAfford || busy === item.id; const hasArt = ['blue_terminal_frame', 'violet_circuit_frame', 'signal_orbit', 'vault_key', 'neon_cipher_frame', 'spectral_core'].includes(item.id); return <article className={`vault-card item-card ${hasArt ? 'has-art' : ''} ${item.hidden ? 'hidden-item' : ''} ${item.equipped ? 'equipped' : ''}`} key={item.id}>{hasArt ? <div className={`item-art art-${item.id}`} style={{ backgroundImage: `url(${cipherVaultRelics})` }} aria-hidden="true" /> : <div className="item-emblem">{item.type === 'FRAME' ? '▣' : item.type === 'TITLE' ? '✦' : '◈'}</div>}<span className="vault-kicker">{item.hidden ? 'CLASSIFIED' : item.source}</span><h3>{item.name}</h3><p>{item.description}</p><div className="item-footer"><span>{item.source === 'STORE' ? `◈ ${item.gemCost}` : item.source === 'CRAFT' ? `◇ ${item.fragmentCost}` : item.type === 'TITLE' ? 'Quest reward' : 'Secret unlock'}</span><button className="button secondary" type="button" disabled={disabled} onClick={() => void action(item)}>{item.equipped ? 'Equipped' : item.owned && actionLabel !== 'Equip' ? 'Owned' : actionLabel}</button></div></article> })}</div>
}

function Stat({ value, label, detail }: { value: number; label: string; detail: string }) { return <div className="stat"><strong>{value}</strong><div><span>{label}</span><small>{detail}</small></div></div> }
function cosmeticLabel(id: string) { return id.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ') }
function LegacyChallengeRow({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { return <button className="challenge-row" type="button" onClick={() => onOpen(item)}><span className={`category-mark ${item.category.toLowerCase()}`} /><span className="row-main"><strong>{item.title}</strong><small>{item.category} · {item.difficulty}</small></span><span className="row-meta"><b>{item.score} pts</b>{item.solved && <span className="solved">SOLVED</span>}</span></button> }

function ChallengeRow({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { return <button className="challenge-row" type="button" onClick={() => onOpen(item)}><span className={`category-mark ${item.category.toLowerCase()}`} /><span className="row-main"><strong>{item.title}</strong><small>{item.category} · {difficultyFriendly(item.difficulty)} lesson</small></span><span className="row-meta"><b>{item.score} pts</b>{item.solved && <span className="solved">COMPLETED</span>}</span></button> }

function LegacyChallengesView({ items, total, category, onCategory, onOpen }: { items: ChallengeSummary[]; total: number; category: Filter; onCategory: (value: Filter) => void; onOpen: (item: ChallengeSummary) => void }) {
  return <div className="page"><PageIntro eyebrow="CHALLENGE INDEX" title="Find your next exploit." description="Every challenge is loaded from the Spring Boot API." /><section className="challenge-toolbar"><div className="filter-tabs">{(['ALL', 'WEB', 'CRYPTO', 'FORENSICS', 'MISC'] as Filter[]).map((item) => <button key={item} className={category === item ? 'filter-tab active' : 'filter-tab'} type="button" onClick={() => onCategory(item)}>{item}</button>)}</div></section><div className="challenge-count"><span><strong>{items.length}</strong> of {total} challenges</span></div><div className="challenge-grid">{items.map((item) => <ChallengeCard key={item.id} item={item} onOpen={onOpen} />)}</div>{items.length === 0 && <EmptyState />}</div>
}

function difficultyFriendly(difficulty: string) {
  return ({ EASY: 'Starter', MEDIUM: 'Explorer', HARD: 'Builder', INSANE: 'Challenge mode' } as Record<string, string>)[difficulty] ?? difficulty
}

function ChallengesView({ items, total, category, onCategory, onOpen }: { items: ChallengeSummary[]; total: number; category: Filter; onCategory: (value: Filter) => void; onOpen: (item: ChallengeSummary) => void }) {
  return <div className="page beginner-challenges"><PageIntro eyebrow="LEARNING PATH" title="Pick one small puzzle." description="Every lesson is designed for a safe practice environment. Start with a Starter lesson and move forward only when you feel ready." /><section className="beginner-tip"><span>◎</span><div><strong>New to security?</strong><p>There is no timer and no penalty for trying. Read the clue, experiment in the provided files, and ask for a hint if you need one.</p></div></section><section className="challenge-toolbar"><div className="filter-tabs">{(['ALL', 'WEB', 'CRYPTO', 'FORENSICS', 'MISC'] as Filter[]).map((item) => <button key={item} className={category === item ? 'filter-tab active' : 'filter-tab'} type="button" onClick={() => onCategory(item)}>{item === 'ALL' ? 'All lessons' : item}</button>)}</div></section><div className="challenge-count"><span><strong>{items.length}</strong> friendly lessons available · {total} total</span></div><div className="challenge-grid">{items.map((item, index) => <ChallengeCard key={item.id} item={item} number={index + 1} onOpen={onOpen} />)}</div>{items.length === 0 && <EmptyState />}</div>
}

function LegacyChallengeCard({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { return <article className="challenge-card"><div className="card-top"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{item.difficulty}</Badge></div><h3>{item.title}</h3><p>Open the brief, download its artifact, and submit your FLAG securely.</p><div className="card-bottom"><strong>{item.score}<small> pts</small></strong>{item.solved && <span className="solved">SOLVED</span>}<button className="card-open" type="button" onClick={() => onOpen(item)}>{item.solved ? 'Review' : 'Open'}</button></div></article> }

function ChallengeCard({ item, number = 1, onOpen }: { item: ChallengeSummary; number?: number; onOpen: (item: ChallengeSummary) => void }) {
  return <article className={`challenge-card beginner-card ${item.solved ? 'is-solved' : ''}`}><div className="card-top"><span className="lesson-number">Lesson {String(number).padStart(2, '0')}</span><Badge tone={item.category}>{item.category}</Badge></div><div className="beginner-difficulty"><span>{difficultyFriendly(item.difficulty)}</span><small>{item.difficulty}</small></div><h3>{item.title}</h3><p>A focused, safe puzzle with one clear learning goal. Take it at your own pace.</p><div className="card-bottom"><strong>{item.score}<small> points</small></strong>{item.solved && <span className="solved">COMPLETED</span>}<button className="card-open" type="button" onClick={() => onOpen(item)}>{item.solved ? 'Review lesson' : 'Start lesson'}</button></div></article>
}

function LegacyChallengeDetailView({ item, loggedIn, onBack, onLogin, onSubmitted }: { item: ChallengeDetail; loggedIn: boolean; onBack: () => void; onLogin: () => void; onSubmitted: () => void }) {
  const [flag, setFlag] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!loggedIn) return
    void api.challengeActivity(item.id, 'OPENED').catch(() => undefined)
    const visibility = () => void api.challengeActivity(item.id, document.hidden ? 'FOCUS_LOST' : 'FOCUS_RESTORED').catch(() => undefined)
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [item.id, loggedIn])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try { const result = await api.submitFlag(item.id, flag); setMessage(result.result === 'correct' ? `Correct flag — ${result.awardedScore} points awarded.` : result.result === 'already_solved' ? 'You have already solved this challenge.' : result.result); setFlag(''); onSubmitted() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Submission failed.') }
  }
  const download = async () => { try { await api.downloadArtifact(item.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Download failed.') } }
  return <div className="page detail-page"><button className="back-link" type="button" onClick={onBack}>← Back to challenges</button><div className="detail-header"><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{item.difficulty}</Badge></div><h1>{item.title}</h1><p>{item.description}</p></div><div className="detail-score"><span>REWARD</span><strong>{item.score}</strong><small>points</small></div></div><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>THE BRIEF</span></div><h2>Analyze carefully.</h2><p>{item.description}</p></section>{item.artifactAvailable && <section className="panel artifact-panel"><div className="panel-heading"><span>ARTIFACT</span></div><div className="artifact-file"><div><strong>Challenge artifact</strong><small>Protected download from the API</small></div><button type="button" className="button secondary" onClick={download}>Download</button></div></section>}</div><aside className="submit-panel"><div className="submit-kicker">SUBMIT FLAG</div><h2>What did you find?</h2>{loggedIn ? <form onSubmit={submit}><label htmlFor="flag">Flag value</label><div className="flag-input"><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CTF{...}" required maxLength={200} autoComplete="off" /></div><button className="button primary submit-button" type="submit">Submit flag</button></form> : <button className="button primary submit-button" type="button" onClick={onLogin}>Sign in to submit</button>}{message && <p className="feedback success">{message}</p>}{error && <p className="feedback error">{error}</p>}</aside></div></div>
}

function IntermediateChallengeDetailView({ item, loggedIn, onBack, onLogin, onSubmitted }: { item: ChallengeDetail; loggedIn: boolean; onBack: () => void; onLogin: () => void; onSubmitted: () => void }) {
  const [flag, setFlag] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [hintBusy, setHintBusy] = useState(false)
  useEffect(() => {
    if (!loggedIn) return
    void api.challengeActivity(item.id, 'OPENED').catch(() => undefined)
  }, [item.id, loggedIn])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try { const result = await api.submitFlag(item.id, flag); setMessage(result.result === 'correct' ? `Correct flag · ${result.awardedScore} points awarded.` : result.result === 'already_solved' ? 'You have already solved this challenge.' : result.result); setFlag(''); onSubmitted() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Submission failed.') }
  }
  const revealHint = async () => {
    try { setHintBusy(true); setError(''); setHint((await api.challengeHint(item.id)).hint) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not reveal the hint.') } finally { setHintBusy(false) }
  }
  const download = async () => { try { await api.downloadArtifact(item.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Download failed.') } }
  return <div className="page detail-page"><button className="back-link" type="button" onClick={onBack}>← Back to challenges</button><div className="detail-header"><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{item.difficulty}</Badge></div><h1>{item.title}</h1><p>{item.description}</p></div><div className="detail-score"><span>REWARD</span><strong>{item.score}</strong><small>points</small></div></div><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>THE BRIEF</span></div><h2>Analyze carefully.</h2><p>{item.description}</p>{loggedIn && item.hintAvailable && <div className="hint-panel"><div><strong>Need a nudge?</strong><small>Reveal a hint for {item.hintCost} credit{item.hintCost === 1 ? '' : 's'}.</small></div><button type="button" className="button secondary" disabled={hintBusy || hint !== null} onClick={() => void revealHint()}>{hint ? 'Hint revealed' : 'Reveal hint'}</button>{hint && <p>{hint}</p>}</div>}</section>{item.artifactAvailable && <section className="panel artifact-panel"><div className="panel-heading"><span>ARTIFACT</span></div><div className="artifact-file"><div><strong>Challenge artifact</strong><small>Protected download from the API</small></div><button type="button" className="button secondary" onClick={download}>Download</button></div></section>}</div><aside className="submit-panel"><div className="submit-kicker">SUBMIT FLAG</div><h2>What did you find?</h2>{loggedIn ? <form onSubmit={submit}><label htmlFor="flag">Flag value</label><div className="flag-input"><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CTF{...}" required maxLength={200} autoComplete="off" /></div><button className="button primary submit-button" type="submit">Submit flag</button></form> : <button className="button primary submit-button" type="button" onClick={onLogin}>Sign in to submit</button>}{message && <p className="feedback success">{message}</p>}{error && <p className="feedback error">{error}</p>}</aside></div></div>
}

function ChallengeDetailView({ item, loggedIn, onBack, onLogin, onSubmitted }: { item: ChallengeDetail; loggedIn: boolean; onBack: () => void; onLogin: () => void; onSubmitted: () => void }) {
  const [flag, setFlag] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [hintBusy, setHintBusy] = useState(false)
  useEffect(() => {
    if (loggedIn) void api.challengeActivity(item.id, 'OPENED').catch(() => undefined)
  }, [item.id, loggedIn])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try { const result = await api.submitFlag(item.id, flag); setMessage(result.result === 'correct' ? `Nice work — ${result.awardedScore} points added.` : result.result === 'already_solved' ? 'You already completed this lesson. Feel free to review it.' : result.result); setFlag(''); onSubmitted() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not check that answer.') }
  }
  const revealHint = async () => {
    try { setHintBusy(true); setError(''); setHint((await api.challengeHint(item.id)).hint) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not reveal a hint.') } finally { setHintBusy(false) }
  }
  const download = async () => { try { await api.downloadArtifact(item.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not download the practice file.') } }
  return <div className="page detail-page beginner-detail"><button className="back-link" type="button" onClick={onBack}>← Back to lessons</button><div className="detail-header"><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{difficultyFriendly(item.difficulty)}</Badge></div><h1>{item.title}</h1><p>This is a safe practice puzzle. You only need to work with the information and files provided here.</p></div><div className="detail-score"><span>LEARNING REWARD</span><strong>{item.score}</strong><small>points</small></div></div><section className="lesson-checklist"><div><span>1</span><strong>Read the short brief</strong><small>Find the one clue the puzzle is giving you.</small></div><div><span>2</span><strong>Try a small step</strong><small>Use the provided artifact only; no real systems are involved.</small></div><div><span>3</span><strong>Ask for help if needed</strong><small>Hints are part of learning, not a failure.</small></div></section><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>YOUR SAFE PRACTICE BRIEF</span></div><h2>One clue at a time.</h2><p>{item.description}</p>{loggedIn && item.hintAvailable && <div className="hint-panel"><div><strong>Feeling stuck is normal.</strong><small>Reveal one helpful nudge for {item.hintCost} credit{item.hintCost === 1 ? '' : 's'}.</small></div><button type="button" className="button secondary" disabled={hintBusy || hint !== null} onClick={() => void revealHint()}>{hint ? 'Hint ready' : 'Show a hint'}</button>{hint && <p>{hint}</p>}</div>}</section>{item.artifactAvailable && <section className="panel artifact-panel"><div className="panel-heading"><span>PRACTICE FILE</span></div><div className="artifact-file"><div><strong>Challenge artifact</strong><small>Download this file only for this safe lesson.</small></div><button type="button" className="button secondary" onClick={download}>Download file</button></div></section>}</div><aside className="submit-panel"><div className="submit-kicker">CHECK YOUR ANSWER</div><h2>Ready when you are.</h2><p>Submitting a guess is safe. It simply checks your answer against this lesson.</p>{loggedIn ? <form onSubmit={submit}><label htmlFor="flag">Your FLAG</label><div className="flag-input"><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CTF{...}" required maxLength={200} autoComplete="off" /></div><button className="button primary submit-button" type="submit">Check my answer</button></form> : <button className="button primary submit-button" type="button" onClick={onLogin}>Sign in to try this lesson</button>}{message && <p className="feedback success">{message}</p>}{error && <p className="feedback error">{error}</p>}</aside></div></div>
}

function LegacyRankingView({ rows, attendanceRows }: { rows: RankingRow[]; attendanceRows: AttendanceRankingRow[] }) {
  const [section, setSection] = useState<'score' | 'attendance'>('score')
  return <div className="page"><PageIntro eyebrow="GLOBAL RANKING" title="Earn your place." description={section === 'score' ? 'Live scores and solve counts from the API.' : 'Daily check-ins, streaks, and long-term consistency.'} /><div className="filter-tabs ranking-tabs"><button type="button" className={section === 'score' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('score')}>Score ranking</button><button type="button" className={section === 'attendance' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('attendance')}>Attendance ranking</button></div>{section === 'score' ? <section className="panel ranking-panel"><div className="ranking-head"><span>RANK</span><span>OPERATOR</span><span>SOLVED</span><span>SCORE</span></div>{rows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className="mini-avatar">{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span>{row.nickname || row.username}</span></div><span>{row.solvedCount}</span><b>{row.score}</b></div>)}{rows.length === 0 && <EmptyState />}</section> : <section className="panel ranking-panel attendance-ranking-panel"><div className="ranking-head"><span>RANK</span><span>OPERATOR</span><span>DAYS</span><span>STREAK</span></div>{attendanceRows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className="mini-avatar">{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span>{row.nickname || row.username}</span></div><span>{row.totalDays}</span><b>{row.currentStreak} days</b></div>)}{attendanceRows.length === 0 && <EmptyState />}</section>}</div>
}

function RankingView({ rows, attendanceRows }: { rows: RankingRow[]; attendanceRows: AttendanceRankingRow[] }) {
  const [section, setSection] = useState<'score' | 'attendance'>('score')
  return <div className="page"><PageIntro eyebrow="GLOBAL RANKING" title="Earn your place." description={section === 'score' ? 'Live scores and solve counts from the API.' : 'Daily check-ins, streaks, and long-term consistency.'} /><div className="filter-tabs ranking-tabs"><button type="button" className={section === 'score' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('score')}>Score ranking</button><button type="button" className={section === 'attendance' ? 'filter-tab active' : 'filter-tab'} onClick={() => setSection('attendance')}>Attendance ranking</button></div>{section === 'score' ? <section className="panel ranking-panel"><div className="ranking-head"><span>RANK</span><span>OPERATOR</span><span>SOLVED</span><span>SCORE</span></div>{rows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className={`mini-avatar ${row.equippedFrame ? `equipped-${row.equippedFrame}` : ''}`}>{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span><strong>{row.nickname || row.username}</strong>{row.equippedTitle && <small className="ranking-title">{cosmeticLabel(row.equippedTitle)}</small>}</span></div><span>{row.solvedCount}</span><b>{row.score}</b></div>)}{rows.length === 0 && <EmptyState />}</section> : <section className="panel ranking-panel attendance-ranking-panel"><div className="ranking-head"><span>RANK</span><span>OPERATOR</span><span>DAYS</span><span>STREAK</span></div>{attendanceRows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className="mini-avatar">{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span>{row.nickname || row.username}</span></div><span>{row.totalDays}</span><b>{row.currentStreak} days</b></div>)}{attendanceRows.length === 0 && <EmptyState />}</section>}</div>
}

void LegacyCipherVault
void LegacyHome
void LegacyChallengesView
void LegacyChallengeRow
void LegacyChallengeCard
void LegacyChallengeDetailView
void IntermediateChallengeDetailView
void LegacyRankingView

function ProfileView({ user, onChallenges, onLogin, onVault }: { user: User | null; onChallenges: () => void; onLogin: () => void; onVault: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [error, setError] = useState('')
  const [avatarRevision, setAvatarRevision] = useState(() => Date.now())
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const refresh = useCallback(async () => {
    const [profileResult, friendsResult, attendanceResult] = await Promise.allSettled([api.profile(), api.friends(), api.attendance()])
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value)
    else setError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Could not load profile.')
    if (friendsResult.status === 'fulfilled') setFriends(friendsResult.value)
    else setError(friendsResult.reason instanceof Error ? friendsResult.reason.message : 'Could not load friends.')
    if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value)
    else setError(attendanceResult.reason instanceof Error ? attendanceResult.reason.message : 'Could not load attendance.')
  }, [])
  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [user, refresh])
  useEffect(() => { if (selectedFriend) void api.messages(selectedFriend).then(setMessages).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load messages.')) }, [selectedFriend])
  useEffect(() => {
    if (!user) return
    return subscribeToDirectMessages((message) => {
      if (message.sender !== selectedFriend) return
      setMessages((currentMessages) => currentMessages.some((item) => item.id === message.id) ? currentMessages : [...currentMessages, message])
    })
  }, [user, selectedFriend])
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])
  if (!user) return <div className="page"><PageIntro eyebrow="YOUR PROGRESS" title="Sign in to track your progress." description="Your score and solved challenges are tied to your authenticated account." /><button className="button primary" type="button" onClick={onLogin}>Sign in</button></div>
  const current = profile ?? { ...user, rank: 0, solvedCount: 0, statusMessage: null, avatarUrl: null, equippedFrame: null, equippedAccessory: null, equippedTitle: null }
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { setProfile(await api.updateProfile({ nickname: String(form.get('nickname')), statusMessage: String(form.get('statusMessage')) })); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save profile.') } }
  const checkIn = async () => { try { setAttendance(await api.checkIn()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not complete the daily check-in.') } }
  const selectTitle = async (event: ChangeEvent<HTMLSelectElement>) => { try { setAttendance(await api.selectAttendanceTitle(event.target.value)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update the title.') } }
  const uploadAvatar = async (file: File) => { setError(''); setAvatarPreview(URL.createObjectURL(file)); try { setProfile(await api.uploadAvatar(file)); setAvatarRevision(Date.now()); } catch (cause) { setAvatarPreview(null); setError(cause instanceof Error ? cause.message : 'Could not upload avatar.') } }
  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (!file) return; const validType = !file.type || ['image/png', 'image/jpeg'].includes(file.type); const validName = /\.(png|jpe?g)$/i.test(file.name); if (!validType && !validName) { setError('PNG 또는 JPG 이미지만 업로드할 수 있습니다.'); return } if (file.size > 2 * 1024 * 1024) { setError('프로필 이미지는 2MB 이하만 업로드할 수 있습니다.'); return } void uploadAvatar(file) }
  const addFriend = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); const username = String(new FormData(event.currentTarget).get('username')).trim().replace(/^@\s*/, ''); if (!/^[A-Za-z0-9_]{3,50}$/.test(username)) { setError('Enter the account username shown after @ (letters, numbers, and underscores only).'); return } try { await api.requestFriend(username); await refresh(); (event.currentTarget as HTMLFormElement).reset() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send friend request.') } }
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selectedFriend) return; const form = new FormData(event.currentTarget); try { const sent = await api.sendMessage(selectedFriend, String(form.get('content'))); setMessages((currentMessages) => [...currentMessages, sent]); (event.currentTarget as HTMLFormElement).reset() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send message.') } }
  const avatarSrc = avatarPreview ?? (current.avatarUrl ? `${current.avatarUrl}${current.avatarUrl.includes('?') ? '&' : '?'}view=${avatarRevision}` : null)
  const activeTitle = attendance?.earnedTitles.find((title) => title.id === attendance.activeTitle)
  return <div className="page profile-page">
    <div className={`profile-hero ${current.equippedFrame ? `equipped-${current.equippedFrame}` : ''}`}>
      <button className="profile-avatar avatar-large avatar-picker" type="button" onClick={() => avatarInput.current?.click()} aria-label="Upload profile photo">
        {avatarSrc ? <img src={avatarSrc} alt="" /> : (current.nickname || current.username).slice(0, 2).toUpperCase()}
        <span className="avatar-picker-label">Change photo</span>
      </button>
      <input ref={avatarInput} className="sr-only" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={selectAvatar} />
      <div><p className="eyebrow">OPERATOR PROFILE</p><h1>{current.nickname || current.username} {current.equippedAccessory && <span className="profile-accessory" title={cosmeticLabel(current.equippedAccessory)}>◈</span>}</h1>{current.equippedTitle ? <p className="profile-title vault-profile-title">{cosmeticLabel(current.equippedTitle)}</p> : activeTitle && <p className="profile-title">{activeTitle.name}</p>}<p className="muted">@{current.username}</p><p className="status-message">{current.statusMessage || 'No status message yet.'}</p></div>
    </div>
    <div className="profile-stats"><Stat value={current.score} label="Score" detail="total points" /><Stat value={current.solvedCount} label="Solves" detail={`rank #${current.rank || '—'}`} /></div>
    <section className="profile-layout"><div>{attendance && <section className="panel attendance-panel"><div className="attendance-heading"><div><p className="eyebrow">DAILY OPERATIONS</p><h2>Attendance</h2></div><button type="button" className="button primary" disabled={attendance.checkedInToday} onClick={() => void checkIn()}>{attendance.checkedInToday ? 'Checked in today' : 'Check in today'}</button></div><div className="attendance-stats"><div><strong>{attendance.currentStreak}</strong><small>Current streak</small></div><div><strong>{attendance.longestStreak}</strong><small>Longest streak</small></div><div><strong>{attendance.totalDays}</strong><small>Total days</small></div></div><label className="attendance-title-select">Profile title<select value={attendance.activeTitle ?? ''} onChange={selectTitle} disabled={attendance.earnedTitles.length === 0}><option value="" disabled>Earn a title to equip it</option>{attendance.earnedTitles.map((title) => <option key={title.id} value={title.id}>{title.name} · {title.requirement}</option>)}</select></label><div className="attendance-badges">{attendance.badges.map((badge) => <span className="attendance-badge" key={badge.id} title={badge.description}>✦ {badge.name}</span>)}</div></section>}<section className="panel profile-editor"><h2>Customize profile</h2><form onSubmit={(event) => void saveProfile(event)}><label>Display name<input name="nickname" defaultValue={current.nickname} maxLength={80} /></label><label>Status message<textarea name="statusMessage" defaultValue={current.statusMessage || ''} maxLength={160} placeholder="What are you working on?" /></label><button className="button primary" type="submit">Save profile</button></form><button className="button secondary profile-vault-button" type="button" onClick={onVault}>Open Cipher Vault</button></section><section className="content-section"><button className="button secondary" type="button" onClick={onChallenges}>Browse challenges</button></section></div><aside className="social-panel"><h2>Friends</h2><form className="friend-request" onSubmit={(event) => void addFriend(event)}><input name="username" placeholder="Account username (e.g. @player_1)" minLength={3} maxLength={51} autoComplete="off" required /><button className="button primary" type="submit">Add</button></form><div className="friend-list">{friends.length === 0 && <p className="muted">No friends yet.</p>}{friends.map((friend) => <div className="friend-row" key={friend.username}><button type="button" onClick={() => friend.relationshipStatus === 'ACCEPTED' && setSelectedFriend(friend.username)}><span className="mini-avatar">{friend.avatarUrl ? <img src={friend.avatarUrl} alt="" /> : friend.nickname.slice(0, 2).toUpperCase()}</span><span><strong>{friend.nickname}</strong><small>@{friend.username} · {friend.relationshipStatus}</small></span></button>{friend.incomingRequest ? <button type="button" className="button secondary" onClick={async () => { try { await api.acceptFriend(friend.username); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not accept request.') } }}>Accept</button> : <button type="button" className="text-link" onClick={async () => { if (!window.confirm('Remove this friend?')) return; try { await api.removeFriend(friend.username); if (selectedFriend === friend.username) setSelectedFriend(null); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove friend.') } }}>Remove</button>}</div>)}</div>{selectedFriend && <section className="message-panel"><h3>Message @{selectedFriend}</h3><div className="message-list">{messages.map((message) => <p className={message.sender === current.username ? 'message sent' : 'message received'} key={message.id}>{message.content}</p>)}</div><form onSubmit={(event) => void sendMessage(event)}><textarea name="content" maxLength={2000} required placeholder="Write a private message" /><button className="button primary" type="submit">Send</button></form></section>}</aside></section>
    {error && <p className="alert error">{error}</p>}
  </div>
}

function EnhancedCommunityView({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  const [category, setCategory] = useState<CommunityCategory | undefined>()
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [notices, setNotices] = useState<PostSummary[]>([])
  const [selected, setSelected] = useState<PostDetail | null>(null)
  const [openingPostId, setOpeningPostId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const postCache = useRef(new Map<number, PostDetail>())
  const refresh = useCallback(async () => {
    try {
      const [nextPosts, nextNotices] = await Promise.all([api.communityPosts(category), api.communityPosts('NOTICE')])
      setPosts(category === 'NOTICE' ? [] : nextPosts.content.filter((post) => post.category !== 'NOTICE'))
      setNotices(nextNotices.content)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load community posts.')
    }
  }, [category])
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])
  if (selected) return <EnhancedCommunityPostView post={selected} user={user} onBack={() => { setSelected(null); void refresh() }} />
  const preloadPost = (id: number) => {
    if (postCache.current.has(id)) return
    api.communityPost(id).then((post) => postCache.current.set(id, post)).catch(() => undefined)
  }
  const openPost = async (id: number) => {
    setOpeningPostId(id)
    try {
      const cached = postCache.current.get(id)
      const post = cached ?? await api.communityPost(id)
      postCache.current.set(id, post)
      setSelected(post)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open post.')
    } finally {
      setOpeningPostId(null)
    }
  }
  const visiblePosts = category === 'NOTICE' ? notices : posts
  return <div className="page community-page"><PageIntro eyebrow="COMMUNITY" title="Learn together." description="Ask questions, share safe write-ups, and discuss the Mini CTF training labs." />
    {category !== 'NOTICE' && notices.length > 0 && <section className="pinned-notices"><div className="pinned-notices-heading"><p className="eyebrow">PINNED NOTICES</p><span>{notices.length}</span></div>{notices.map((notice) => <button type="button" className="pinned-notice" key={notice.id} onMouseEnter={() => preloadPost(notice.id)} onFocus={() => preloadPost(notice.id)} onClick={() => void openPost(notice.id)}><Badge tone="NOTICE">NOTICE</Badge><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleDateString()}</small></button>)}</section>}
    <div className="community-toolbar"><div className="filter-tabs">{(['FREE', 'QUESTION', 'CTF', 'NOTICE'] as CommunityCategory[]).map((item) => <button key={item} type="button" className={category === item ? 'filter-tab active' : 'filter-tab'} onClick={() => setCategory(category === item ? undefined : item)}>{item}</button>)}</div>{user ? <CommunityWriter onCreated={(post) => { setPosts((current) => [{ ...post, commentCount: 0, likeCount: 0, dislikeCount: 0, recommendCount: 0, viewerReactions: [] }, ...current]); setSelected(post) }} /> : <button type="button" className="button primary" onClick={onLogin}>Sign in to write</button>}</div>
    {error && <p className="alert error">{error}</p>}{openingPostId !== null && <p className="muted">Opening post...</p>}<div className="community-list">{visiblePosts.map((post) => <button type="button" className="community-post-row" key={post.id} onMouseEnter={() => preloadPost(post.id)} onFocus={() => preloadPost(post.id)} onClick={() => void openPost(post.id)}><Badge tone={post.category}>{post.category}</Badge><strong>{post.title}</strong><span>{post.authorNickname || post.author}{post.authorTitle && <small className="community-title">{cosmeticLabel(post.authorTitle)}</small>}</span><small>{post.commentCount} comments · {post.likeCount} likes · {new Date(post.createdAt).toLocaleDateString()}</small></button>)}{visiblePosts.length === 0 && <EmptyState />}</div>
  </div>
}

function EnhancedCommunityPostView({ post, user, onBack }: { post: PostDetail; user: User | null; onBack: () => void }) {
  const [current, setCurrent] = useState(post)
  const [comments, setComments] = useState<PostComment[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const refreshComments = useCallback(() => api.postComments(current.id).then((nextComments) => {
    setComments(nextComments)
    setCurrent((previous) => ({ ...previous, commentCount: nextComments.length }))
  }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load comments.')), [current.id])
  useEffect(() => { void refreshComments() }, [refreshComments])
  const react = async (reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND') => { if (!user) return; try { setCurrent(await api.reactToPost(current.id, reaction)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your reaction.') } }
  const deletePost = async () => { if (!window.confirm('Delete this post?')) return; try { await api.deletePost(current.id); onBack() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete post.') } }
  const deleteComment = async (id: number) => { if (!window.confirm('Delete this comment?')) return; try { await api.deletePostComment(id); await refreshComments() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete comment.') } }
  const pinReply = async (id: number) => { try { await api.pinPostReply(current.id, id); await refreshComments() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not pin this reply.') } }
  const roots = comments.filter((comment) => comment.parentId === null)
  const repliesFor = (parentId: number) => comments.filter((comment) => comment.parentId === parentId).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.createdAt.localeCompare(b.createdAt))
  return <div className="page community-page"><button className="back-link" type="button" onClick={onBack}>← Back to community</button><article className="community-detail"><div className="badge-line"><Badge tone={current.category}>{current.category}</Badge></div>{editing ? <PostEditor post={current} onSaved={(next) => { setCurrent(next); setEditing(false) }} onCancel={() => setEditing(false)} /> : <><h1>{current.title}</h1><p className="muted">by {current.authorNickname || current.author}{current.authorTitle && <span className="community-title"> · {cosmeticLabel(current.authorTitle)}</span>} · {new Date(current.createdAt).toLocaleString()}</p><p className="community-content">{current.content}</p><ReactionBar post={current} disabled={!user} onReact={(reaction) => void react(reaction)} />{current.editable && <div className="inline-actions"><button className="button secondary" type="button" onClick={() => setEditing(true)}>Edit</button><button className="button ghost danger-button" type="button" onClick={() => void deletePost()}>Delete</button></div>}</>}</article>
    <section className="comment-section"><div className="comment-section-heading"><h2>Comments <span>{current.commentCount}</span></h2><small>Replies can be pinned by the post author.</small></div>{user ? <ThreadedCommentWriter postId={current.id} onCreated={(comment) => { setComments((items) => [...items, comment]); setCurrent((previous) => ({ ...previous, commentCount: previous.commentCount + 1 })) }} /> : <p className="muted">Sign in to join the conversation.</p>}{error && <p className="alert error">{error}</p>}{roots.map((comment) => <ThreadedComment key={comment.id} comment={comment} replies={repliesFor(comment.id)} postId={current.id} canPin={user?.username === current.author} signedIn={Boolean(user)} onReplyAdded={(reply) => { setComments((items) => [...items, reply]); setCurrent((previous) => ({ ...previous, commentCount: previous.commentCount + 1 })) }} onDelete={(id) => void deleteComment(id)} onPin={(id) => void pinReply(id)} />)}</section>
  </div>
}

function ReactionBar({ post, disabled, onReact }: { post: PostDetail; disabled: boolean; onReact: (reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND') => void }) {
  const items: { reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND'; label: string; count: number }[] = [{ reaction: 'LIKE', label: 'Like', count: post.likeCount }, { reaction: 'DISLIKE', label: 'Dislike', count: post.dislikeCount }, { reaction: 'RECOMMEND', label: 'Recommend', count: post.recommendCount }]
  return <div className="reaction-bar">{items.map((item) => <button key={item.reaction} type="button" aria-label={item.label} title={item.label} disabled={disabled} className={post.viewerReactions.includes(item.reaction) ? 'reaction-button active' : 'reaction-button'} onClick={() => onReact(item.reaction)}><ReactionIcon reaction={item.reaction} /><span>{item.count}</span></button>)}</div>
}

function ReactionIcon({ reaction }: { reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND' }) {
  if (reaction === 'LIKE') return <svg className="reaction-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v10H4V10h3Zm2 10V10l4-6 1 1v4h4.8c1.1 0 1.7 1 1.4 2l-2.1 8A2 2 0 0 1 16.2 20H9Z" fill="currentColor" /></svg>
  if (reaction === 'DISLIKE') return <svg className="reaction-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14V4H4v10h3Zm2-10v10l4 6 1-1v-4h4.8c1.1 0 1.7-1 1.4-2l-2.1-8A2 2 0 0 0 16.2 4H9Z" fill="currentColor" /></svg>
  return <svg className="reaction-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.78 5.63L21 9.54l-4.5 4.38 1.06 6.18L12 17.18 6.44 20.1 7.5 13.92 3 9.54l6.22-.91L12 3Z" fill="currentColor" /></svg>
}

function ThreadedComment({ comment, replies, postId, canPin, signedIn, onReplyAdded, onDelete, onPin }: { comment: PostComment; replies: PostComment[]; postId: number; canPin: boolean; signedIn: boolean; onReplyAdded: (comment: PostComment) => void; onDelete: (id: number) => void; onPin: (id: number) => void }) {
  const [replying, setReplying] = useState(false)
  return <article className="threaded-comment"><div className="comment"><strong>{comment.authorNickname || comment.author}{comment.authorTitle && <small className="community-title"> · {cosmeticLabel(comment.authorTitle)}</small>}</strong><small>{new Date(comment.createdAt).toLocaleString()}</small><p>{comment.content}</p><div className="comment-actions">{signedIn && <button type="button" onClick={() => setReplying((open) => !open)}>Reply</button>}{comment.editable && <button type="button" onClick={() => onDelete(comment.id)}>Delete</button>}</div></div>{replying && <ThreadedCommentWriter postId={postId} parentId={comment.id} compact onCreated={(reply) => { onReplyAdded(reply); setReplying(false) }} />}{replies.map((reply) => <div className={reply.pinned ? 'comment reply pinned' : 'comment reply'} key={reply.id}>{reply.pinned && <span className="pinned-reply-label">PINNED REPLY</span>}<strong>{reply.authorNickname || reply.author}{reply.authorTitle && <small className="community-title"> · {cosmeticLabel(reply.authorTitle)}</small>}</strong><small>{new Date(reply.createdAt).toLocaleString()}</small><p>{reply.content}</p><div className="comment-actions">{canPin && <button type="button" onClick={() => onPin(reply.id)}>Pin reply</button>}{reply.editable && <button type="button" onClick={() => onDelete(reply.id)}>Delete</button>}</div></div>)}</article>
}

function ThreadedCommentWriter({ postId, parentId, compact = false, onCreated }: { postId: number; parentId?: number; compact?: boolean; onCreated: (comment: PostComment) => void }) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); try { onCreated(await api.createPostComment(postId, content, parentId)); setContent('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not post comment.') } }
  return <form className={compact ? 'comment-writer reply-writer' : 'comment-writer'} onSubmit={(event) => void submit(event)}><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={parentId ? 'Write a reply' : 'Add a constructive comment'} maxLength={2000} required /><button type="submit" className="button primary">{parentId ? 'Reply' : 'Comment'}</button>{error && <p className="alert error">{error}</p>}</form>
}

void CommunityView

function CommunityView({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  const [category, setCategory] = useState<CommunityCategory | undefined>()
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [selected, setSelected] = useState<PostDetail | null>(null)
  const [error, setError] = useState('')
  const refresh = useCallback(() => api.communityPosts(category).then((data) => setPosts(data.content)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load community posts.')), [category])
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])
  if (selected) return <CommunityPostView post={selected} user={user} onBack={() => { setSelected(null); void refresh() }} />
  return <div className="page community-page"><PageIntro eyebrow="COMMUNITY" title="Learn together." description="Ask questions, share safe write-ups, and discuss the Mini CTF training labs." /><div className="community-toolbar"><div className="filter-tabs">{(['FREE', 'QUESTION', 'CTF', 'NOTICE'] as CommunityCategory[]).map((item) => <button key={item} type="button" className={category === item ? 'filter-tab active' : 'filter-tab'} onClick={() => setCategory(category === item ? undefined : item)}>{item}</button>)}</div>{user ? <CommunityWriter onCreated={(post) => { setPosts((current) => [{ ...post, commentCount: 0 }, ...current]); setSelected(post) }} /> : <button type="button" className="button primary" onClick={onLogin}>Sign in to write</button>}</div>{error && <p className="alert error">{error}</p>}<div className="community-list">{posts.map((post) => <button type="button" className="community-post-row" key={post.id} onClick={() => api.communityPost(post.id).then(setSelected).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not open post.'))}><Badge tone={post.category}>{post.category}</Badge><strong>{post.title}</strong><span>{post.authorNickname || post.author}</span><small>{post.commentCount} comments · {new Date(post.createdAt).toLocaleDateString()}</small></button>)}{posts.length === 0 && <EmptyState />}</div></div>
}

function CommunityWriter({ onCreated }: { onCreated: (post: PostDetail) => void }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const post = await api.createPost({ title: String(form.get('title')), content: String(form.get('content')), category: String(form.get('category')) as CommunityCategory }); onCreated(post) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not publish post.') } }
  if (!open) return <button type="button" className="button secondary" onClick={() => setOpen(true)}>Write a post</button>
  return <form className="community-editor" onSubmit={submit}><input name="title" placeholder="Post title" maxLength={200} required /><select name="category" defaultValue="FREE"><option value="FREE">Free</option><option value="QUESTION">Question</option><option value="CTF">CTF</option></select><textarea name="content" placeholder="Write plain text only. Do not post live flags or solutions in public threads." maxLength={20000} required /><div><button type="button" className="button ghost" onClick={() => setOpen(false)}>Cancel</button><button className="button primary" type="submit">Publish</button></div>{error && <p className="alert error">{error}</p>}</form>
}

function CommunityPostView({ post, user, onBack }: { post: PostDetail; user: User | null; onBack: () => void }) {
  const [current, setCurrent] = useState(post)
  const [comments, setComments] = useState<PostComment[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const refreshComments = useCallback(() => api.postComments(current.id).then(setComments).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load comments.')), [current.id])
  useEffect(() => { void refreshComments() }, [refreshComments])
  const deletePost = async () => { if (!window.confirm('Delete this post?')) return; try { await api.deletePost(current.id); onBack() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete post.') } }
  return <div className="page community-page"><button className="back-link" type="button" onClick={onBack}>← Back to community</button><article className="community-detail"><div className="badge-line"><Badge tone={current.category}>{current.category}</Badge></div>{editing ? <PostEditor post={current} onSaved={(next) => { setCurrent(next); setEditing(false) }} onCancel={() => setEditing(false)} /> : <><h1>{current.title}</h1><p className="muted">by {current.authorNickname || current.author} · {new Date(current.createdAt).toLocaleString()}</p><p className="community-content">{current.content}</p>{current.editable && <div className="inline-actions"><button className="button secondary" type="button" onClick={() => setEditing(true)}>Edit</button><button className="button ghost danger-button" type="button" onClick={() => void deletePost()}>Delete</button></div>}</>}</article><section className="comment-section"><h2>Comments</h2>{user ? <CommentWriter postId={current.id} onCreated={(comment) => setComments((items) => [...items, comment])} /> : <p className="muted">Sign in to join the conversation.</p>}{error && <p className="alert error">{error}</p>}{comments.map((comment) => <article className="comment" key={comment.id}><strong>{comment.authorNickname || comment.author}</strong><small>{new Date(comment.createdAt).toLocaleString()}</small><p>{comment.content}</p>{comment.editable && <div className="comment-actions"><button type="button" onClick={async () => { const content = window.prompt('Edit comment', comment.content); if (!content) return; try { const next = await api.updatePostComment(comment.id, content); setComments((items) => items.map((item) => item.id === next.id ? next : item)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not edit comment.') } }}>Edit</button><button type="button" onClick={async () => { if (!window.confirm('Delete this comment?')) return; try { await api.deletePostComment(comment.id); setComments((items) => items.filter((item) => item.id !== comment.id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete comment.') } }}>Delete</button></div>}</article>)}</section></div>
}

function PostEditor({ post, onSaved, onCancel }: { post: PostDetail; onSaved: (post: PostDetail) => void; onCancel: () => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSaved(await api.updatePost(post.id, { title: String(form.get('title')), content: String(form.get('content')), category: String(form.get('category')) as CommunityCategory })) }
  return <form className="community-editor" onSubmit={(event) => void submit(event)}><input name="title" defaultValue={post.title} maxLength={200} required /><select name="category" defaultValue={post.category}><option value="FREE">Free</option><option value="QUESTION">Question</option><option value="CTF">CTF</option><option value="NOTICE">Notice</option></select><textarea name="content" defaultValue={post.content} maxLength={20000} required /><div><button className="button ghost" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="submit">Save</button></div></form>
}

function CommentWriter({ postId, onCreated }: { postId: number; onCreated: (comment: PostComment) => void }) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); try { onCreated(await api.createPostComment(postId, content)); setContent('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not post comment.') } }
  return <form className="comment-writer" onSubmit={(event) => void submit(event)}><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Add a constructive comment" maxLength={2000} required /><button type="submit" className="button primary">Comment</button>{error && <p className="alert error">{error}</p>}</form>
}

type AdminTab = 'overview' | 'accounts' | 'content' | 'notices' | 'security' | 'logs'

function AdminConsole() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [comments, setComments] = useState<AdminComment[]>([])
  const [tab, setTab] = useState<AdminTab>('overview')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      const [nextDashboard, nextPosts, nextComments] = await Promise.all([
        api.adminDashboard(),
        api.adminPosts(),
        api.adminComments(),
      ])
      setDashboard(nextDashboard)
      setPosts(nextPosts)
      setComments(nextComments)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load administrator data.')
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const editUser = async (id: number, nickname: string) => {
    const next = window.prompt('Display name', nickname)
    if (!next) return
    try { await api.updateAdminUser(id, next); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update the account.') }
  }
  const suspend = async (id: number) => {
    const reason = window.prompt('Suspension reason (shown to the user)')
    if (!reason) return
    try { await api.suspendUser(id, reason); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not suspend the account.') }
  }
  const deactivate = async (id: number, username: string) => {
    if (!window.confirm(`Delete @${username}? Their score, ranking, solves, profile, and community activity will be hidden. The account can be restored later.`)) return
    try { await api.deactivateUser(id); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the account.') }
  }
  const removePost = async (id: number, title: string) => {
    if (!window.confirm(`Delete “${title}”?`)) return
    try { await api.deleteAdminPost(id); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the post.') }
  }
  const removeComment = async (id: number) => {
    if (!window.confirm('Delete this comment?')) return
    try { await api.deleteAdminComment(id); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the comment.') }
  }
  const publishNotice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api.publishNotice({ title: String(form.get('title')).trim(), content: String(form.get('content')).trim() })
      event.currentTarget.reset()
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish the notice.')
    }
  }
  const controlLog = async (type: 'audit' | 'security', id: number, hide: boolean) => {
    const reason = window.prompt(hide ? 'Reason for hiding this record' : 'Reason for redacting sensitive information')
    if (!reason) return
    try {
      if (type === 'audit') {
        if (hide) await api.hideAuditLog(id, reason)
        else await api.redactAuditLog(id, reason)
      } else if (hide) await api.hideSecurityEvent(id, reason)
      else await api.redactSecurityEvent(id, reason)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the log.')
    }
  }

  if (!dashboard) return <div className="page admin-page"><PageIntro eyebrow="ADMIN CONSOLE" title="Administrator console" description="Loading platform status and moderation controls." />{error && <p className="alert error">{error}</p>}<p className="muted">Loading administrator data...</p></div>

  const notices = posts.filter((post) => post.category === 'NOTICE')
  const tabs: { id: AdminTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Accounts', count: dashboard.users.length },
    { id: 'content', label: 'Content', count: posts.length + comments.length },
    { id: 'notices', label: 'Notices', count: notices.length },
    { id: 'security', label: 'Security', count: dashboard.antiCheatEvents.length },
    { id: 'logs', label: 'Audit logs', count: dashboard.auditLogs.length + dashboard.securityEvents.length },
  ]

  return <div className="page admin-page admin-console">
    <PageIntro eyebrow="ADMIN CONSOLE" title="Run the platform clearly." description="Manage accounts, community content, notices, and security records in focused workspaces." />
    {error && <p className="alert error">{error}</p>}
    <div className="admin-summary-grid">
      <div><small>ACTIVE ACCOUNTS</small><strong>{dashboard.users.filter((item) => item.status === 'ACTIVE').length}</strong></div>
      <div><small>CONTENT RECORDS</small><strong>{posts.length + comments.length}</strong></div>
      <div><small>SECURITY EVENTS</small><strong>{dashboard.antiCheatEvents.length}</strong></div>
      <div><small>RECENT SUBMISSIONS</small><strong>{dashboard.recentSubmissions.length}</strong></div>
    </div>
    <div className="admin-tabs" role="tablist">
      {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab(item.id)}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}
    </div>

    {tab === 'overview' && <div className="admin-panel-grid">
      <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">QUICK ACTIONS</p><h2>Operations shortcuts</h2></div></div><div className="admin-quick-actions"><button type="button" className="button secondary" onClick={() => setTab('accounts')}>Review accounts</button><button type="button" className="button secondary" onClick={() => setTab('content')}>Manage content</button><button type="button" className="button primary" onClick={() => setTab('notices')}>Write a notice</button></div></section>
      <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recent submissions</h2></div><button type="button" className="text-button" onClick={() => setTab('security')}>View all</button></div><AdminSubmissionList items={dashboard.recentSubmissions.slice(0, 5)} /></section>
      <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">SECURITY</p><h2>Events to review</h2></div><button type="button" className="text-button" onClick={() => setTab('security')}>View all</button></div><AdminEventList items={dashboard.antiCheatEvents.slice(0, 5)} /></section>
    </div>}

    {tab === 'accounts' && <section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">ACCOUNT MANAGEMENT</p><h2>Account management</h2></div><small>Edit names, suspend, restore, or delete accounts. Deleted accounts keep a private restore snapshot.</small></div><div className="admin-table">{dashboard.users.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.nickname || item.username}</strong><small>@{item.username} · {item.score} pts · {item.role} · {item.status}</small>{item.suspensionReason && <small className="danger-text">Suspension reason: {item.suspensionReason}</small>}</div>{item.role !== 'ADMIN' && <div className="inline-actions">{item.status !== 'DELETED' && <button type="button" className="button secondary" onClick={() => void editUser(item.id, item.nickname)}>Edit name</button>}{item.status === 'ACTIVE' ? <button type="button" className="button ghost danger-button" onClick={() => void suspend(item.id)}>Suspend</button> : <button type="button" className="button secondary" onClick={() => void api.reinstateUser(item.id).then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not restore the account.'))}>{item.status === 'DELETED' ? 'Restore account' : 'Restore'}</button>}{item.status !== 'DELETED' && <button type="button" className="text-button danger-text" onClick={() => void deactivate(item.id, item.username)}>Delete account</button>}</div>}</div>)}</div></section>}

    {tab === 'content' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">COMMUNITY POSTS</p><h2>Post management</h2></div><small>Latest {posts.length}</small></div><div className="admin-table">{posts.filter((post) => post.category !== 'NOTICE').map((post) => <div className="admin-row" key={post.id}><div><strong>{post.title}</strong><small><Badge tone={post.category}>{post.category}</Badge> @{post.authorNickname || post.author} · {post.commentCount} comments · {new Date(post.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removePost(post.id, post.title)}>Delete</button></div>)}</div></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">COMMENTS</p><h2>Comment management</h2></div><small>Latest {comments.length}</small></div><div className="admin-table">{comments.map((comment) => <div className="admin-row" key={comment.id}><div><strong>{comment.content}</strong><small>“{comment.postTitle}” · @{comment.authorNickname || comment.author} · {new Date(comment.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removeComment(comment.id)}>Delete</button></div>)}</div></section></div>}

    {tab === 'notices' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">PUBLISH NOTICE</p><h2>Write a new notice</h2></div></div><form className="community-editor admin-notice-form" onSubmit={(event) => void publishNotice(event)}><input name="title" placeholder="Notice title" maxLength={200} required /><textarea name="content" placeholder="Write the notice content" maxLength={20000} required /><div><button className="button primary" type="submit">Publish notice</button></div></form></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">PUBLISHED</p><h2>Published notices</h2></div><small>{notices.length} total</small></div><div className="admin-table">{notices.map((notice) => <div className="admin-row" key={notice.id}><div><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small></div><button type="button" className="button ghost danger-button" onClick={() => void removePost(notice.id, notice.title)}>Delete</button></div>)}</div></section></div>}

    {tab === 'security' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">ANTI-CHEAT</p><h2>Security events</h2></div><small>Latest {dashboard.antiCheatEvents.length}</small></div><AdminEventList items={dashboard.antiCheatEvents} /></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">CHALLENGE ACTIVITY</p><h2>Submission history</h2></div><small>Latest {dashboard.recentSubmissions.length}</small></div><AdminSubmissionList items={dashboard.recentSubmissions} /></section></div>}

    {tab === 'logs' && <div className="admin-panel-grid"><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">SECURITY LOG</p><h2>Login and account events</h2></div></div><LogList items={dashboard.securityEvents.map((event) => ({ id: event.id, title: `${event.eventType} · ${event.username || event.subject || 'unknown'}`, detail: event.detail || '', date: event.createdAt }))} onControl={(id, hide) => void controlLog('security', id, hide)} /></section><section className="admin-section admin-card"><div className="admin-section-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Administrator activity</h2></div></div><LogList items={dashboard.auditLogs.map((log) => ({ id: log.id, title: `${log.action} · ${log.adminUsername}`, detail: log.detail, date: log.createdAt }))} onControl={(id, hide) => void controlLog('audit', id, hide)} /></section></div>}
  </div>
}

function AdminSubmissionList({ items }: { items: AdminDashboard['recentSubmissions'] }) {
  if (items.length === 0) return <p className="muted">No records yet.</p>
  return <div className="admin-table">{items.map((item, index) => <div className="admin-row" key={`${item.username}-${item.submittedAt}-${index}`}><div><strong>@{item.username}</strong><small>{item.challengeTitle} · {new Date(item.submittedAt).toLocaleString()}</small></div><span className={item.correct ? 'success-text' : 'danger-text'}>{item.correct ? 'Correct' : 'Incorrect'}</span></div>)}</div>
}

function AdminEventList({ items }: { items: AdminDashboard['antiCheatEvents'] }) {
  if (items.length === 0) return <p className="muted">No security events to review.</p>
  return <div className="admin-table">{items.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.eventType} · @{item.username}</strong><small>{item.challengeTitle || 'Platform'} · {item.detail || 'No additional details'} · {new Date(item.createdAt).toLocaleString()}</small></div><span className={`severity ${item.severity.toLowerCase()}`}>{item.severity}</span></div>)}</div>
}

function AdminView() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState('')
  const refresh = useCallback(() => api.adminDashboard().then(setDashboard).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load administrator data.')), [])
  useEffect(() => { void refresh() }, [refresh])
  const editUser = async (id: number, nickname: string) => { const next = window.prompt('Display name', nickname); if (!next) return; try { await api.updateAdminUser(id, next); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update user.') } }
  const suspend = async (id: number) => { const reason = window.prompt('Suspension reason (shown to the user)'); if (!reason) return; try { await api.suspendUser(id, reason); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not suspend user.') } }
  const controlLog = async (type: 'audit' | 'security', id: number, hide: boolean) => { const reason = window.prompt(hide ? 'Reason for hiding this log' : 'Reason for redacting this log'); if (!reason) return; try { if (type === 'audit') { if (hide) await api.hideAuditLog(id, reason); else await api.redactAuditLog(id, reason) } else if (hide) await api.hideSecurityEvent(id, reason); else await api.redactSecurityEvent(id, reason); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update log.') } }
  return <div className="page admin-page"><PageIntro eyebrow="ADMINISTRATION" title="Platform control." description="Security log facts stay traceable. Redact hides details; Hide removes a record from the active dashboard with a reason." />{error && <p className="alert error">{error}</p>}{!dashboard ? <p className="muted">Loading administrator dashboard…</p> : <><section className="admin-section"><h2>Users</h2><div className="admin-table">{dashboard.users.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.nickname || item.username}</strong><small>@{item.username} · {item.score} pts · {item.role}</small>{item.suspensionReason && <small className="danger-text">Suspended: {item.suspensionReason}</small>}</div>{item.role !== 'ADMIN' && <div className="inline-actions"><button type="button" className="button secondary" onClick={() => void editUser(item.id, item.nickname)}>Edit</button>{item.status === 'ACTIVE' ? <button type="button" className="button ghost danger-button" onClick={() => void suspend(item.id)}>Suspend</button> : <button type="button" className="button secondary" onClick={() => void api.reinstateUser(item.id).then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not reinstate user.'))}>Reinstate</button>}</div>}</div>)}</div></section><section className="admin-section"><h2>Login and account events</h2><LogList items={dashboard.securityEvents.map((event) => ({ id: event.id, title: `${event.eventType} · ${event.username || event.subject || 'unknown'}`, detail: event.detail || '', date: event.createdAt }))} onControl={(id, hide) => void controlLog('security', id, hide)} /></section><section className="admin-section"><h2>Moderation audit log</h2><LogList items={dashboard.auditLogs.map((log) => ({ id: log.id, title: `${log.action} · ${log.adminUsername}`, detail: log.detail, date: log.createdAt }))} onControl={(id, hide) => void controlLog('audit', id, hide)} /></section><section className="admin-section"><h2>Recent submissions</h2><div className="admin-table">{dashboard.recentSubmissions.map((submission, index) => <div className="admin-row" key={`${submission.username}-${submission.submittedAt}-${index}`}><span>{submission.username}</span><span>{submission.challengeTitle}</span><span className={submission.correct ? 'success-text' : 'danger-text'}>{submission.correct ? 'Correct' : 'Incorrect'}</span></div>)}</div></section></>}</div>
}

void AdminView

function LogList({ items, onControl }: { items: { id: number; title: string; detail: string; date: string }[]; onControl: (id: number, hide: boolean) => void }) {
  if (items.length === 0) return <p className="muted">No records yet.</p>
  return <div className="admin-table">{items.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.title}</strong><small>{item.detail} · {new Date(item.date).toLocaleString()}</small></div><div className="inline-actions"><button className="button secondary" type="button" onClick={() => onControl(item.id, false)}>Redact</button><button className="button ghost danger-button" type="button" onClick={() => onControl(item.id, true)}>Hide</button></div></div>)}</div>
}

function LoginView({ onBack, onAuth }: { onBack: () => void; onAuth: (result: { token: string; user: User }) => void }) {
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState<string[]>([])
  useEffect(() => {
    api.oauthProviders().then(setProviders).catch(() => setProviders([]))
  }, [])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); const form = new FormData(event.currentTarget)
    const username = String(form.get('username')).trim(); const password = String(form.get('password')); const passwordConfirmation = String(form.get('passwordConfirmation')); if (registering && password !== passwordConfirmation) { setError('Passwords do not match.'); return } try { const result = registering ? await api.register({ username, nickname: String(form.get('nickname')).trim(), password, passwordConfirmation }) : await api.login({ username, password }); onAuth(result) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Authentication failed.') }
  }
  return <div className="auth-page"><div className="auth-card"><button className="back-link" type="button" onClick={onBack}>← Back home</button><p className="eyebrow">SECURE ACCESS</p><h1>{registering ? 'Create your account.' : 'Sign in to continue.'}</h1><form className="auth-form" onSubmit={submit}><label>Username<input name="username" required minLength={3} maxLength={50} pattern="[A-Za-z0-9_]+" title="Use only letters, numbers, and underscores." autoComplete="username" /></label>{registering && <label>Display name (optional)<input name="nickname" maxLength={80} /></label>}<label>Password<input name="password" type="password" required minLength={registering ? 8 : undefined} maxLength={100} autoComplete={registering ? 'new-password' : 'current-password'} /></label>{registering && <label>Confirm password<input name="passwordConfirmation" type="password" required minLength={8} maxLength={100} autoComplete="new-password" /></label>}<button className="button primary" type="submit">{registering ? 'Create account' : 'Sign in'}</button></form>{error && <p className="alert error">{error}</p>}{providers.length > 0 && <><div className="auth-divider"><span>or continue with</span></div><div className="social-buttons">{providers.map((provider) => <button className={`social-button oauth-${provider}`} type="button" key={provider} onClick={() => { window.location.href = `${oauthBaseUrl}/oauth2/authorization/${provider}` }}><ProviderIcon provider={provider} /><span>Continue with {provider[0].toUpperCase() + provider.slice(1)}</span></button>)}</div></>}<p className="auth-footnote">{registering ? 'Already have an account?' : 'New to Mini CTF?'} <button type="button" onClick={() => setRegistering(!registering)}>{registering ? 'Sign in' : 'Create an account'}</button></p></div></div>
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'google') return <svg className="oauth-provider-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.56-5.17 3.56-8.64Z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z" /><path fill="#FBBC05" d="M5.28 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.38-2.3V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.78 1.28 5.4l4-3.1Z" /><path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.94 1.14 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4 3.1C6.23 6.86 8.88 4.75 12 4.75Z" /></svg>
  if (provider === 'github') return <svg className="oauth-provider-icon" viewBox="0 0 19 19" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844" clipRule="evenodd" /></svg>
  if (provider === 'discord') return <svg className="oauth-provider-icon" viewBox="0 0 20 19" aria-hidden="true"><path fill="currentColor" d="M16.224 3.768a14.5 14.5 0 0 0-3.67-1.153c-.158.286-.343.67-.47.976a13.5 13.5 0 0 0-4.067 0c-.128-.306-.317-.69-.476-.976A14.4 14.4 0 0 0 3.868 3.77C1.546 7.28.916 10.703 1.231 14.077a14.7 14.7 0 0 0 4.5 2.306q.545-.748.965-1.587a9.5 9.5 0 0 1-1.518-.74q.191-.14.372-.293c2.927 1.369 6.107 1.369 8.999 0q.183.152.372.294-.723.437-1.52.74.418.838.963 1.588a14.6 14.6 0 0 0 4.504-2.308c.37-3.911-.63-7.302-2.644-10.309m-9.13 8.234c-.878 0-1.599-.82-1.599-1.82 0-.998.705-1.82 1.6-1.82.894 0 1.614.82 1.599 1.82.001 1-.705 1.82-1.6 1.82m5.91 0c-.878 0-1.599-.82-1.599-1.82 0-.998.705-1.82 1.6-1.82.893 0 1.614.82 1.599 1.82 0 1-.706 1.82-1.6 1.82" /></svg>
  return <span className="oauth-provider-fallback" aria-hidden="true">{provider[0].toUpperCase()}</span>
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <section className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></section> }
function Badge({ tone, children }: { tone: string; children: string }) { return <span className={`badge ${tone.toLowerCase()}`}>{children}</span> }
function EmptyState() { return <div className="empty-state"><h2>No data available yet.</h2><p>Start the backend and add challenges to see them here.</p></div> }

export default App
