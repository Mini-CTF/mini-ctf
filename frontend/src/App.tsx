import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import './typography.css'

type View = 'home' | 'challenges' | 'ranking' | 'profile' | 'login'
type Category = 'WEB' | 'CRYPTO' | 'FORENSICS' | 'MISC'
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

type Challenge = {
  id: number
  title: string
  description: string
  category: Category
  difficulty: Difficulty
  points: number
  solves: number
  solved: boolean
  tags: string[]
}

const challenges: Challenge[] = [
  { id: 1, title: 'Hidden Message', description: 'A harmless-looking page has more to say than it first appears.', category: 'WEB', difficulty: 'EASY', points: 100, solves: 42, solved: true, tags: ['source', 'inspection'] },
  { id: 2, title: 'Broken Cipher', description: 'Recover the plaintext from a custom cipher and find the key.', category: 'CRYPTO', difficulty: 'MEDIUM', points: 250, solves: 27, solved: false, tags: ['encoding', 'analysis'] },
  { id: 3, title: 'Last Known Good', description: 'Trace a suspicious event through a compact set of server logs.', category: 'FORENSICS', difficulty: 'MEDIUM', points: 300, solves: 18, solved: false, tags: ['logs', 'timeline'] },
  { id: 4, title: 'Tiny Footprint', description: 'Find the artifact that does not belong in this otherwise normal bundle.', category: 'MISC', difficulty: 'EASY', points: 150, solves: 31, solved: false, tags: ['files', 'metadata'] },
  { id: 5, title: 'Vault Door', description: 'A small authentication service is protecting a much bigger secret.', category: 'WEB', difficulty: 'HARD', points: 500, solves: 9, solved: false, tags: ['auth', 'logic'] },
  { id: 6, title: 'Noise Floor', description: 'Separate signal from noise and identify the message hidden in the capture.', category: 'FORENSICS', difficulty: 'HARD', points: 450, solves: 6, solved: false, tags: ['pcap', 'network'] },
]

const ranking = [
  { rank: 1, name: 'hacker01', solved: 10, score: 2100 },
  { rank: 2, name: 'security_student', solved: 8, score: 1700, current: true },
  { rank: 3, name: 'packet_wizard', solved: 7, score: 1500 },
  { rank: 4, name: 'coder', solved: 6, score: 1320 },
  { rank: 5, name: 'null_pointer', solved: 5, score: 1100 },
]

function App() {
  const [view, setView] = useState<View>('home')
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [category, setCategory] = useState<'ALL' | Category>('ALL')
  const [difficulty, setDifficulty] = useState<'ALL' | Difficulty>('ALL')
  const [status, setStatus] = useState<'ALL' | 'SOLVED' | 'UNSOLVED'>('ALL')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const filteredChallenges = useMemo(() => challenges.filter((challenge) => {
    const categoryMatch = category === 'ALL' || challenge.category === category
    const difficultyMatch = difficulty === 'ALL' || challenge.difficulty === difficulty
    const statusMatch = status === 'ALL' || (status === 'SOLVED' ? challenge.solved : !challenge.solved)
    return categoryMatch && difficultyMatch && statusMatch
  }), [category, difficulty, status])

  const navigate = (nextView: View) => {
    setSelectedChallenge(null)
    setView(nextView)
    setMobileNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge)
    setView('challenges')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => navigate('home')} aria-label="Mini CTF home">
          <span className="brand-mark" aria-hidden="true"><ShieldIcon compact /></span>
          <span>MINI<span className="brand-accent">/</span>CTF</span>
        </button>
        <button className="menu-toggle" type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-controls="primary-navigation">
          <span /><span /><span /><span className="sr-only">Toggle navigation</span>
        </button>
        <nav id="primary-navigation" className={mobileNavOpen ? 'primary-nav is-open' : 'primary-nav'} aria-label="Primary navigation">
          <NavButton active={view === 'home'} onClick={() => navigate('home')}>Home</NavButton>
          <NavButton active={view === 'challenges'} onClick={() => navigate('challenges')}>Challenges</NavButton>
          <NavButton active={view === 'ranking'} onClick={() => navigate('ranking')}>Ranking</NavButton>
          <NavButton active={view === 'profile'} onClick={() => navigate('profile')}>My Page</NavButton>
        </nav>
        <div className="header-actions"><button className="header-login" type="button" onClick={() => navigate('login')}>Sign in</button><button className="avatar" type="button" onClick={() => navigate('profile')} aria-label="Open profile">SS</button></div>
      </header>

      <main>
        {view === 'home' && <Home onExplore={() => navigate('challenges')} onRanking={() => navigate('ranking')} onOpen={openChallenge} />}
        {view === 'challenges' && (selectedChallenge ? <ChallengeDetail challenge={selectedChallenge} onBack={() => setSelectedChallenge(null)} /> : <ChallengesView challenges={filteredChallenges} category={category} difficulty={difficulty} status={status} onCategory={setCategory} onDifficulty={setDifficulty} onStatus={setStatus} onOpen={openChallenge} />)}
        {view === 'ranking' && <RankingView />}
        {view === 'profile' && <ProfileView onChallenges={() => navigate('challenges')} />}
        {view === 'login' && <LoginView onBack={() => navigate('home')} />}
      </main>

      <footer className="site-footer"><span><strong>MINI/CTF</strong> · learn by breaking things safely</span><span className="footer-status"><i /> systems operational</span></footer>
    </div>
  )
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button className={active ? 'nav-button active' : 'nav-button'} type="button" onClick={onClick}>{children}</button> }

function Home({ onExplore, onRanking, onOpen }: { onExplore: () => void; onRanking: () => void; onOpen: (challenge: Challenge) => void }) {
  return <div className="page home-page">
    <section className="hero-section"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" /> SECURITY TRAINING PLATFORM <span className="eyebrow-line" /></p><h1>Learn security<br /><span>by solving.</span></h1><p className="hero-description">Hands-on challenges for curious minds.<br />Inspect, exploit, understand.</p><div className="hero-actions"><button className="button primary" type="button" onClick={onExplore}>Start challenges <span>↗</span></button><button className="button ghost" type="button" onClick={onRanking}>View ranking <span>→</span></button></div></div><div className="hero-visual" aria-hidden="true"><div className="hero-grid" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-symbol"><ShieldIcon /></div><span className="visual-label label-top">// 0x4D494E49</span><span className="visual-label label-bottom">TRACE / ANALYZE / SOLVE</span></div></section>
    <section className="stat-strip" aria-label="Platform statistics"><Stat value="12" label="Challenges" detail="active labs" /><Stat value="183" label="Solves" detail="and counting" /><Stat value="27" label="Learners" detail="in the network" /><div className="live-badge"><i /> live platform</div></section>
    <section className="content-section"><div className="section-heading"><div><p className="eyebrow">EXPLORE THE LABS</p><h2>Choose your path.</h2></div><button type="button" className="text-link" onClick={onExplore}>View all challenges <span>→</span></button></div><div className="category-grid"><CategoryTile name="WEB" number="04" description="Find the flaw." tone="violet" /><CategoryTile name="CRYPTO" number="03" description="Break the code." tone="blue" /><CategoryTile name="FORENSICS" number="03" description="Follow the trail." tone="orange" /><CategoryTile name="MISC" number="02" description="Think sideways." tone="green" /></div></section>
    <section className="content-section featured-section"><div className="section-heading"><div><p className="eyebrow">CONTINUE LEARNING</p><h2>Featured challenges.</h2></div><span className="muted-label">UPDATED 2H AGO</span></div><div className="featured-list">{challenges.slice(0, 3).map((challenge) => <ChallengeRow key={challenge.id} challenge={challenge} onOpen={onOpen} />)}</div></section>
  </div>
}

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) { return <div className="stat"><strong>{value}</strong><div><span>{label}</span><small>{detail}</small></div></div> }
function CategoryTile({ name, number, description, tone }: { name: string; number: string; description: string; tone: string }) { return <div className={`category-tile ${tone}`}><span className="category-number">{number}</span><div><span className="category-icon">{name === 'WEB' ? '◈' : name === 'CRYPTO' ? '⌘' : name === 'FORENSICS' ? '⌕' : '✦'}</span><h3>{name}</h3><p>{description}</p></div><span className="tile-arrow">↗</span></div> }
function ChallengeRow({ challenge, onOpen }: { challenge: Challenge; onOpen: (challenge: Challenge) => void }) { return <button className="challenge-row" type="button" onClick={() => onOpen(challenge)}><span className={`category-mark ${challenge.category.toLowerCase()}`} /><span className="row-main"><strong>{challenge.title}</strong><small>{challenge.description}</small></span><span className="row-meta"><Badge tone={challenge.category}>{challenge.category}</Badge><Badge tone={challenge.difficulty}>{challenge.difficulty}</Badge><b>{challenge.points} pts</b>{challenge.solved && <span className="solved">✓ solved</span>}<span className="row-arrow">→</span></span></button> }

function ChallengesView({ challenges: visibleChallenges, category, difficulty, status, onCategory, onDifficulty, onStatus, onOpen }: { challenges: Challenge[]; category: 'ALL' | Category; difficulty: 'ALL' | Difficulty; status: 'ALL' | 'SOLVED' | 'UNSOLVED'; onCategory: (value: 'ALL' | Category) => void; onDifficulty: (value: 'ALL' | Difficulty) => void; onStatus: (value: 'ALL' | 'SOLVED' | 'UNSOLVED') => void; onOpen: (challenge: Challenge) => void }) {
  return <div className="page"><PageIntro eyebrow="CHALLENGE INDEX" title="Find your next exploit." description="Practice on purpose-built labs. Every challenge is a chance to understand how systems fail—and how to build them better." /><section className="challenge-toolbar"><div className="filter-tabs">{(['ALL', 'WEB', 'CRYPTO', 'FORENSICS', 'MISC'] as const).map((item) => <button key={item} className={category === item ? 'filter-tab active' : 'filter-tab'} type="button" onClick={() => onCategory(item)}>{item}</button>)}</div><div className="select-filters"><label>Difficulty<select value={difficulty} onChange={(event) => onDifficulty(event.target.value as 'ALL' | Difficulty)}><option value="ALL">All levels</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label><label>Status<select value={status} onChange={(event) => onStatus(event.target.value as 'ALL' | 'SOLVED' | 'UNSOLVED')}><option value="ALL">All status</option><option value="SOLVED">Solved</option><option value="UNSOLVED">Unsolved</option></select></label></div></section><div className="challenge-count"><span><strong>{visibleChallenges.length}</strong> of {challenges.length || 6} challenges</span><span className="progress-copy"><b>1 / 6</b> solved</span></div><div className="challenge-grid">{visibleChallenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} onOpen={onOpen} />)}</div>{visibleChallenges.length === 0 && <EmptyState />}</div>
}

function ChallengeCard({ challenge, onOpen }: { challenge: Challenge; onOpen: (challenge: Challenge) => void }) { return <article className="challenge-card"><div className="card-top"><Badge tone={challenge.category}>{challenge.category}</Badge><Badge tone={challenge.difficulty}>{challenge.difficulty}</Badge></div><div className="card-icon">{challenge.category === 'WEB' ? '◈' : challenge.category === 'CRYPTO' ? '⌘' : challenge.category === 'FORENSICS' ? '⌕' : '✦'}</div><h3>{challenge.title}</h3><p>{challenge.description}</p><div className="tag-list">{challenge.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><div className="card-bottom"><strong>{challenge.points}<small> pts</small></strong><span>{challenge.solves} solves</span>{challenge.solved ? <span className="solved">✓ solved</span> : <button className="card-open" type="button" onClick={() => onOpen(challenge)}>Open →</button>}</div></article> }

function ChallengeDetail({ challenge, onBack }: { challenge: Challenge; onBack: () => void }) {
  const [flag, setFlag] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const submitFlag = (event: FormEvent) => { event.preventDefault(); setFeedback(flag.trim() === 'demo-correct' ? 'correct' : 'incorrect') }
  return <div className="page detail-page"><button className="back-link" type="button" onClick={onBack}>← Back to challenges</button><div className="detail-header"><div><div className="badge-line"><Badge tone={challenge.category}>{challenge.category}</Badge><Badge tone={challenge.difficulty}>{challenge.difficulty}</Badge><span className="detail-id">LAB-{String(challenge.id).padStart(2, '0')}</span></div><h1>{challenge.title}</h1><p>{challenge.description}</p></div><div className="detail-score"><span>REWARD</span><strong>{challenge.points}</strong><small>points</small></div></div><div className="detail-layout"><div><section className="panel problem-panel"><div className="panel-heading"><span>01 / THE BRIEF</span><span className="panel-dots">•••</span></div><h2>Read between the lines.</h2><p>This lab is designed to reward careful observation. Start by downloading the artifact, inspect its contents, and document each assumption you make along the way.</p><p>Nothing here is accidental. The path to the answer is part of the lesson.</p><div className="hint-box"><span>⌁</span><div><strong>Learning objective</strong><small>Practice identifying trust boundaries and unexpected client-side data.</small></div></div></section><section className="panel artifact-panel"><div className="panel-heading"><span>02 / ARTIFACT</span><span className="file-size">1 file · 14 KB</span></div><div className="artifact-file"><span className="file-icon">▧</span><div><strong>challenge-artifact.zip</strong><small>ZIP archive · ready to download</small></div><button type="button" className="button secondary">Download <span>↓</span></button></div></section></div><aside className="submit-panel"><div className="submit-kicker">SUBMIT FLAG</div><h2>What did you find?</h2><p>Flags are validated securely on the server. Take your best shot.</p><form onSubmit={submitFlag}><label htmlFor="flag">Flag value</label><div className="flag-input"><span>›</span><input id="flag" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="FLAG{...}" autoComplete="off" /></div><button className="button primary submit-button" type="submit">Submit flag <span>↗</span></button></form>{feedback === 'correct' && <div className="feedback success"><span>✓</span><div><strong>Correct flag.</strong><small>+{challenge.points} points awarded. Nice work.</small></div></div>}{feedback === 'incorrect' && <div className="feedback error"><span>!</span><div><strong>Not quite.</strong><small>Check your assumptions and try again.</small></div></div>}<div className="rate-note"><span>◎</span> 5 attempts remaining</div></aside></div><section className="discussion-preview"><div><p className="eyebrow">DISCUSSION</p><h2>Learn together, safely.</h2></div><span>General discussion · 3 comments <b>→</b></span></section></div>
}

function RankingView() { return <div className="page"><PageIntro eyebrow="GLOBAL RANKING" title="Earn your place." description="Solve more. Learn more. Compare progress with the community." /><div className="ranking-layout"><section className="panel ranking-panel"><div className="ranking-head"><span>RANK</span><span>OPERATOR</span><span>SOLVED</span><span>SCORE</span></div>{ranking.map((entry) => <div className={entry.current ? 'ranking-row current' : 'ranking-row'} key={entry.rank}><strong className={`rank-number rank-${entry.rank}`}>{String(entry.rank).padStart(2, '0')}</strong><div className="operator"><span className="mini-avatar">{entry.name.slice(0, 2).toUpperCase()}</span><span>{entry.name}{entry.current && <small>YOU</small>}</span></div><span>{entry.solved}</span><b>{entry.score.toLocaleString()}</b></div>)}</section><aside className="rank-callout"><span className="eyebrow">YOUR POSITION</span><strong>#02</strong><p>Keep going. One more solve puts you within striking distance of the top.</p><div className="callout-line"><span>1,700 pts</span><span>next: 2,100</span></div><div className="progress-bar"><i style={{ width: '81%' }} /></div></aside></div></div> }

function ProfileView({ onChallenges }: { onChallenges: () => void }) { return <div className="page"><div className="profile-hero"><div className="profile-avatar">SS</div><div><p className="eyebrow">OPERATOR PROFILE</p><h1>security_student</h1><p className="muted">Learning since August 2026 · last active today</p></div><button className="button secondary edit-profile" type="button">Edit profile</button></div><div className="profile-stats"><Stat value="1,700" label="Score" detail="total points" /><Stat value="08" label="Solved" detail="of 12 challenges" /><Stat value="#02" label="Rank" detail="global position" /></div><section className="profile-content"><div><div className="section-heading"><div><p className="eyebrow">YOUR PROGRESS</p><h2>Solved challenges.</h2></div><button type="button" className="text-link" onClick={onChallenges}>Browse all <span>→</span></button></div><div className="solved-list">{challenges.filter((challenge) => challenge.solved).map((challenge) => <div className="solved-row" key={challenge.id}><span className="check-circle">✓</span><div><strong>{challenge.title}</strong><small>{challenge.category} · solved 2 days ago</small></div><b>+{challenge.points}</b></div>)}</div></div><aside className="panel streak-panel"><span className="eyebrow">CURRENT STREAK</span><strong>04 <small>days</small></strong><p>Consistency compounds. Keep the streak alive.</p><div className="streak-days"><i /><i /><i /><i /><i className="empty" /><i className="empty" /><i className="empty" /></div><small>Mon&nbsp;&nbsp; Tue&nbsp;&nbsp; Wed&nbsp;&nbsp; Thu&nbsp;&nbsp; Fri&nbsp;&nbsp; Sat&nbsp;&nbsp; Sun</small></aside></section></div> }

function ShieldIcon({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? 'shield-icon compact' : 'shield-icon'} viewBox="0 0 120 140" fill="none" aria-hidden="true">
    <path d="M60 8 105 25v37c0 31-18 55-45 70C33 117 15 93 15 62V25L60 8Z" stroke="currentColor" strokeWidth="6" />
    <path d="M39 65h42v30H39z" stroke="currentColor" strokeWidth="5" />
    <path d="M47 65V52c0-17 26-17 26 0v13" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <circle cx="60" cy="79" r="4" fill="currentColor" />
    <path d="M60 83v7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
}

function GoogleIcon() {
  return <svg className="social-logo google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.56-5.17 3.56-8.64Z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z" /><path fill="#FBBC05" d="M5.28 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.38-2.3V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.78 1.28 5.4l4-3.1Z" /><path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.94 1.14 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4 3.1C6.23 6.86 8.88 4.75 12 4.75Z" /></svg>
}

function GithubIcon() {
  return <svg className="social-logo github-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.84 2.8 1.31 3.48 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" /></svg>
}

function LoginView({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const isSignUp = mode === 'signup'
  return <div className="auth-page"><div className="auth-card"><button className="back-link" type="button" onClick={onBack}>← Back home</button><div className="auth-brand"><span className="brand-mark"><ShieldIcon compact /></span><span>MINI<span className="brand-accent">/</span>CTF</span></div><p className="eyebrow">{isSignUp ? 'JOIN THE OPERATOR NETWORK' : 'WELCOME BACK, OPERATOR'}</p><h1>{isSignUp ? 'Create your account.' : 'Sign in to continue.'}</h1><p className="auth-description">{isSignUp ? 'Create an account and start solving safely.' : 'Pick up where you left off and keep learning.'}</p><form className="auth-form" onSubmit={(event) => event.preventDefault()}>{isSignUp && <label>Username<input type="text" placeholder="security_student" /></label>}<label>Email or username<input type="text" placeholder="you@example.com" /></label><label>Password<input type="password" placeholder="••••••••" /></label><button type="submit" className="button primary">{isSignUp ? 'Create account' : 'Sign in'} <span>↗</span></button></form><div className="auth-divider"><span>{isSignUp ? 'or sign up with' : 'or continue with'}</span></div><div className="social-buttons"><button type="button" className="social-button"><GoogleIcon /><span>Continue with Google</span></button><button type="button" className="social-button"><GithubIcon /><span>Continue with GitHub</span></button></div><p className="auth-footnote">{isSignUp ? 'Already have an account?' : 'New to Mini CTF?'} <button type="button" onClick={() => setMode(isSignUp ? 'signin' : 'signup')}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p></div></div>
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <section className="page-intro"><p className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</p><h1>{title}</h1><p>{description}</p></section> }
function Badge({ tone, children }: { tone: string; children: string }) { return <span className={`badge ${tone.toLowerCase()}`}>{children}</span> }
function EmptyState() { return <div className="empty-state"><span>⌁</span><h2>No challenges found.</h2><p>Try adjusting your filters.</p></div> }

export default App
