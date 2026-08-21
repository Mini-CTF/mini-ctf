import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from './api/client'
import type { ChallengeDetail, ChallengeSummary, RankingRow, Stats, User } from './types/api'
import './App.css'
import './typography.css'

type View = 'home' | 'challenges' | 'ranking' | 'profile' | 'login'
type Filter = 'ALL' | 'WEB' | 'CRYPTO' | 'FORENSICS' | 'MISC'

const emptyStats: Stats = { challenges: 0, solves: 0, users: 0 }

function App() {
  const [view, setView] = useState<View>('home')
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([])
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [selected, setSelected] = useState<ChallengeDetail | null>(null)
  const [category, setCategory] = useState<Filter>('ALL')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [nextStats, nextChallenges, nextRanking] = await Promise.all([api.stats(), api.challenges(), api.ranking()])
      setStats(nextStats)
      setChallenges(nextChallenges)
      setRanking(nextRanking)
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
    if (localStorage.getItem('mini-ctf-token')) {
      api.me().then(setUser).catch(() => localStorage.removeItem('mini-ctf-token'))
    }
    void Promise.all([api.stats(), api.challenges(), api.ranking()])
      .then(([nextStats, nextChallenges, nextRanking]) => {
        setStats(nextStats)
        setChallenges(nextChallenges)
        setRanking(nextRanking)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not connect to the API.')
      })
      .finally(() => setLoading(false))
  }, [])

  const visibleChallenges = useMemo(
    () => challenges.filter((item) => category === 'ALL' || item.category === category),
    [category, challenges],
  )
  const navigate = (next: View) => {
    setSelected(null)
    setView(next)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openChallenge = async (item: ChallengeSummary) => {
    setError('')
    setView('challenges')
    try {
      setSelected(await api.challenge(item.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the challenge.')
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

  return <div className="app-shell">
    <header className="site-header">
      <button className="brand" type="button" onClick={() => navigate('home')}>MINI<span className="brand-accent">/</span>CTF</button>
      <nav className="primary-nav" aria-label="Primary navigation">
        <NavButton active={view === 'home'} onClick={() => navigate('home')}>Home</NavButton>
        <NavButton active={view === 'challenges'} onClick={() => navigate('challenges')}>Challenges</NavButton>
        <NavButton active={view === 'ranking'} onClick={() => navigate('ranking')}>Ranking</NavButton>
        <NavButton active={view === 'profile'} onClick={() => navigate('profile')}>My Page</NavButton>
      </nav>
      <div className="header-actions">{user ? <><span className="header-login">{user.nickname || user.username}</span><button className="header-login" type="button" onClick={logout}>Sign out</button></> : <button className="header-login" type="button" onClick={() => navigate('login')}>Sign in</button>}</div>
    </header>
    <main>
      {error && <div className="page"><p className="alert error">{error}</p></div>}
      {loading && <div className="page"><p className="muted">Loading live platform data…</p></div>}
      {!loading && view === 'home' && <Home stats={stats} challenges={challenges} onExplore={() => navigate('challenges')} onRanking={() => navigate('ranking')} onOpen={openChallenge} />}
      {!loading && view === 'challenges' && (selected ? <ChallengeDetailView item={selected} loggedIn={Boolean(user)} onBack={() => setSelected(null)} onLogin={() => navigate('login')} onSubmitted={refresh} /> : <ChallengesView items={visibleChallenges} total={challenges.length} category={category} onCategory={setCategory} onOpen={openChallenge} />)}
      {!loading && view === 'ranking' && <RankingView rows={ranking} />}
      {!loading && view === 'profile' && <ProfileView user={user} onChallenges={() => navigate('challenges')} onLogin={() => navigate('login')} />}
      {!loading && view === 'login' && <LoginView onBack={() => navigate('home')} onAuth={completeAuth} />}
    </main>
    <footer className="site-footer"><span><strong>MINI/CTF</strong> · learn by breaking things safely</span><span className="footer-status">live API connection</span></footer>
  </div>
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button className={active ? 'nav-button active' : 'nav-button'} type="button" onClick={onClick}>{children}</button> }

function Home({ stats, challenges, onExplore, onRanking, onOpen }: { stats: Stats; challenges: ChallengeSummary[]; onExplore: () => void; onRanking: () => void; onOpen: (item: ChallengeSummary) => void }) {
  return <div className="page home-page"><section className="hero-section"><div className="hero-copy"><p className="eyebrow">SECURITY TRAINING PLATFORM</p><h1>Learn security<br /><span>by solving.</span></h1><p className="hero-description">Live challenges, secure FLAG validation, and a real ranking.</p><div className="hero-actions"><button className="button primary" type="button" onClick={onExplore}>Start challenges</button><button className="button ghost" type="button" onClick={onRanking}>View ranking</button></div></div></section><section className="stat-strip" aria-label="Platform statistics"><Stat value={stats.challenges} label="Challenges" detail="active labs" /><Stat value={stats.solves} label="Solves" detail="recorded" /><Stat value={stats.users} label="Learners" detail="registered" /><div className="live-badge">live platform</div></section><section className="content-section featured-section"><div className="section-heading"><div><p className="eyebrow">EXPLORE THE LABS</p><h2>Featured challenges.</h2></div><button type="button" className="text-link" onClick={onExplore}>View all challenges</button></div><div className="featured-list">{challenges.slice(0, 3).map((item) => <ChallengeRow key={item.id} item={item} onOpen={onOpen} />)}{challenges.length === 0 && <EmptyState />}</div></section></div>
}

function Stat({ value, label, detail }: { value: number; label: string; detail: string }) { return <div className="stat"><strong>{value}</strong><div><span>{label}</span><small>{detail}</small></div></div> }
function ChallengeRow({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { return <button className="challenge-row" type="button" onClick={() => onOpen(item)}><span className={`category-mark ${item.category.toLowerCase()}`} /><span className="row-main"><strong>{item.title}</strong><small>{item.category} · {item.difficulty}</small></span><span className="row-meta"><b>{item.score} pts</b>{item.solved && <span className="solved">SOLVED</span>}</span></button> }

function ChallengesView({ items, total, category, onCategory, onOpen }: { items: ChallengeSummary[]; total: number; category: Filter; onCategory: (value: Filter) => void; onOpen: (item: ChallengeSummary) => void }) {
  return <div className="page"><PageIntro eyebrow="CHALLENGE INDEX" title="Find your next exploit." description="Every challenge is loaded from the Spring Boot API." /><section className="challenge-toolbar"><div className="filter-tabs">{(['ALL', 'WEB', 'CRYPTO', 'FORENSICS', 'MISC'] as Filter[]).map((item) => <button key={item} className={category === item ? 'filter-tab active' : 'filter-tab'} type="button" onClick={() => onCategory(item)}>{item}</button>)}</div></section><div className="challenge-count"><span><strong>{items.length}</strong> of {total} challenges</span></div><div className="challenge-grid">{items.map((item) => <ChallengeCard key={item.id} item={item} onOpen={onOpen} />)}</div>{items.length === 0 && <EmptyState />}</div>
}

function ChallengeCard({ item, onOpen }: { item: ChallengeSummary; onOpen: (item: ChallengeSummary) => void }) { return <article className="challenge-card"><div className="card-top"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{item.difficulty}</Badge></div><h3>{item.title}</h3><p>Open the brief, download its artifact, and submit your FLAG securely.</p><div className="card-bottom"><strong>{item.score}<small> pts</small></strong>{item.solved ? <span className="solved">SOLVED</span> : <button className="card-open" type="button" onClick={() => onOpen(item)}>Open</button>}</div></article> }

function ChallengeDetailView({ item, loggedIn, onBack, onLogin, onSubmitted }: { item: ChallengeDetail; loggedIn: boolean; onBack: () => void; onLogin: () => void; onSubmitted: () => void }) {
  const [flag, setFlag] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try { const result = await api.submitFlag(item.id, flag); setMessage(result.result === 'correct' ? `Correct flag — ${result.awardedScore} points awarded.` : result.result === 'already_solved' ? 'You have already solved this challenge.' : result.result); setFlag(''); onSubmitted() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Submission failed.') }
  }
  const download = async () => { try { await api.downloadArtifact(item.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Download failed.') } }
  return <div className="page detail-page"><button className="back-link" type="button" onClick={onBack}>← Back to challenges</button><div className="detail-header"><div><div className="badge-line"><Badge tone={item.category}>{item.category}</Badge><Badge tone={item.difficulty}>{item.difficulty}</Badge></div><h1>{item.title}</h1><p>{item.description}</p></div><div className="detail-score"><span>REWARD</span><strong>{item.score}</strong><small>points</small></div></div><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>THE BRIEF</span></div><h2>Analyze carefully.</h2><p>{item.description}</p></section>{item.artifactAvailable && <section className="panel artifact-panel"><div className="panel-heading"><span>ARTIFACT</span></div><div className="artifact-file"><div><strong>Challenge artifact</strong><small>Protected download from the API</small></div><button type="button" className="button secondary" onClick={download}>Download</button></div></section>}</div><aside className="submit-panel"><div className="submit-kicker">SUBMIT FLAG</div><h2>What did you find?</h2>{loggedIn ? <form onSubmit={submit}><label htmlFor="flag">Flag value</label><div className="flag-input"><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="CTF{...}" required maxLength={200} autoComplete="off" /></div><button className="button primary submit-button" type="submit">Submit flag</button></form> : <button className="button primary submit-button" type="button" onClick={onLogin}>Sign in to submit</button>}{message && <p className="feedback success">{message}</p>}{error && <p className="feedback error">{error}</p>}</aside></div></div>
}

function RankingView({ rows }: { rows: RankingRow[] }) { return <div className="page"><PageIntro eyebrow="GLOBAL RANKING" title="Earn your place." description="Live scores and solve counts from the API." /><section className="panel ranking-panel"><div className="ranking-head"><span>RANK</span><span>OPERATOR</span><span>SOLVED</span><span>SCORE</span></div>{rows.map((row) => <div className="ranking-row" key={row.username}><strong className="rank-number">#{row.rank}</strong><div className="operator"><span className="mini-avatar">{(row.nickname || row.username).slice(0, 2).toUpperCase()}</span><span>{row.nickname || row.username}</span></div><span>{row.solvedCount}</span><b>{row.score}</b></div>)}{rows.length === 0 && <EmptyState />}</section></div> }

function ProfileView({ user, onChallenges, onLogin }: { user: User | null; onChallenges: () => void; onLogin: () => void }) { if (!user) return <div className="page"><PageIntro eyebrow="YOUR PROGRESS" title="Sign in to track your progress." description="Your score and solved challenges are tied to your authenticated account." /><button className="button primary" type="button" onClick={onLogin}>Sign in</button></div>; return <div className="page"><div className="profile-hero"><div className="profile-avatar">{user.nickname.slice(0, 2).toUpperCase()}</div><div><p className="eyebrow">OPERATOR PROFILE</p><h1>{user.nickname || user.username}</h1><p className="muted">@{user.username}</p></div></div><div className="profile-stats"><Stat value={user.score} label="Score" detail="total points" /><Stat value={0} label="Solves" detail="see challenges" /></div><section className="content-section"><button className="button secondary" type="button" onClick={onChallenges}>Browse challenges</button></section></div> }

function LoginView({ onBack, onAuth }: { onBack: () => void; onAuth: (result: { token: string; user: User }) => void }) {
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState<string[]>([])
  useEffect(() => {
    api.oauthProviders().then(setProviders).catch(() => setProviders([]))
  }, [])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); const form = new FormData(event.currentTarget)
    try { const result = registering ? await api.register({ username: String(form.get('username')), nickname: String(form.get('nickname')), password: String(form.get('password')), passwordConfirmation: String(form.get('passwordConfirmation')) }) : await api.login({ username: String(form.get('username')), password: String(form.get('password')) }); onAuth(result) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Authentication failed.') }
  }
  return <div className="auth-page"><div className="auth-card"><button className="back-link" type="button" onClick={onBack}>← Back home</button><p className="eyebrow">SECURE ACCESS</p><h1>{registering ? 'Create your account.' : 'Sign in to continue.'}</h1><form className="auth-form" onSubmit={submit}><label>Username<input name="username" required minLength={3} maxLength={50} autoComplete="username" /></label>{registering && <label>Nickname<input name="nickname" maxLength={80} /></label>}<label>Password<input name="password" type="password" required minLength={8} autoComplete={registering ? 'new-password' : 'current-password'} /></label>{registering && <label>Confirm password<input name="passwordConfirmation" type="password" required minLength={8} autoComplete="new-password" /></label>}<button className="button primary" type="submit">{registering ? 'Create account' : 'Sign in'}</button></form>{error && <p className="alert error">{error}</p>}{providers.length > 0 && <><div className="auth-divider"><span>or continue with</span></div><div className="social-buttons">{providers.map((provider) => <button className="social-button" type="button" key={provider} onClick={() => { window.location.href = `/api/auth/oauth/${provider}/authorize` }}>{provider[0].toUpperCase() + provider.slice(1)}</button>)}</div></>}<p className="auth-footnote">{registering ? 'Already have an account?' : 'New to Mini CTF?'} <button type="button" onClick={() => setRegistering(!registering)}>{registering ? 'Sign in' : 'Create an account'}</button></p></div></div>
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <section className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></section> }
function Badge({ tone, children }: { tone: string; children: string }) { return <span className={`badge ${tone.toLowerCase()}`}>{children}</span> }
function EmptyState() { return <div className="empty-state"><h2>No data available yet.</h2><p>Start the backend and add challenges to see them here.</p></div> }

export default App
