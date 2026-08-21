import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { ChallengeDetail, ChallengeSummary, RankingRow } from '../types/api'

export function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">SECURITY LEARNING PLATFORM</p>
      <div className="hero-security-icon" aria-hidden="true">
        <svg viewBox="0 0 120 140" fill="none">
          <path
            d="M60 8 105 25v37c0 31-18 55-45 70C33 117 15 93 15 62V25L60 8Z"
            stroke="currentColor"
            strokeWidth="6"
          />
          <path d="M39 65h42v30H39z" stroke="currentColor" strokeWidth="5" />
          <path
            d="M47 65V52c0-17 26-17 26 0v13"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="60" cy="79" r="4" fill="currentColor" />
          <path d="M60 83v7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      <h1>
        Think like an attacker.
        <br />
        <span>Build like a defender.</span>
      </h1>
      <p className="hero-copy">CTF 문제를 분석하고 FLAG를 제출하며 웹 보안의 핵심을 학습하세요.</p>
      <div className="actions">
        <Link className="button" to="/challenges">
          Explore challenges
        </Link>
        <Link className="button secondary" to="/ranking">
          View ranking
        </Link>
      </div>
    </section>
  )
}

export function ChallengesPage() {
  const [items, setItems] = useState<ChallengeSummary[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    api
      .challenges()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : '문제를 불러오지 못했습니다.'))
  }, [])
  return (
    <section>
      <PageHeading
        eyebrow="PRACTICE ARENA"
        title="Challenges"
        subtitle="문제를 풀고 보안 감각을 키워보세요."
      />
      {error && <p className="alert error">{error}</p>}
      {items.length === 0 && !error ? (
        <div className="empty">등록된 문제가 없습니다.</div>
      ) : (
        <div className="challenge-grid">
          {items.map((item) => (
            <Link to={`/challenges/${item.id}`} className="challenge-card" key={item.id}>
              <div className="card-top">
                <span className="badge">{item.category}</span>
                <span className="difficulty">{item.difficulty}</span>
              </div>
              <h2>{item.title}</h2>
              <p className="score">{item.score} pts</p>
              {item.solved && <span className="solved">SOLVED</span>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export function ChallengeDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [item, setItem] = useState<ChallengeDetail | null>(null)
  const [flag, setFlag] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (id)
      api
        .challenge(Number(id))
        .then(setItem)
        .catch((e) => setError(e instanceof Error ? e.message : '문제를 불러오지 못했습니다.'))
  }, [id])
  if (error) return <p className="alert error">{error}</p>
  if (!item) return <div className="state">Loading...</div>
  async function submit(event: FormEvent) {
    event.preventDefault()
    const challenge = item
    if (!challenge) return
    setMessage('')
    setError('')
    try {
      const result = await api.submitFlag(challenge.id, flag)
      setMessage(
        result.result === 'correct'
          ? `정답입니다. ${result.awardedScore}점을 획득했습니다.`
          : result.result === 'already_solved'
            ? '이미 해결한 문제입니다.'
            : result.result,
      )
      setFlag('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '제출에 실패했습니다.')
    }
  }
  return (
    <section>
      <Link className="back" to="/challenges">
        ← Challenges
      </Link>
      <article className="detail">
        <div className="card-top">
          <span className="badge">{item.category}</span>
          <span className="difficulty">{item.difficulty}</span>
        </div>
        <h1>{item.title}</h1>
        <p className="detail-description">{item.description}</p>
        {item.artifactAvailable && (
          <a className="button secondary" href={`/api/challenges/${item.id}/artifact`}>
            Download artifact
          </a>
        )}
        {user ? (
          <form onSubmit={submit} className="submit-form">
            <label>
              Submit FLAG
              <input
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="CTF{...}"
                required
              />
            </label>
            <button className="button" type="submit">
              Submit
            </button>
          </form>
        ) : (
          <p className="muted">
            FLAG를 제출하려면 <Link to="/login">로그인</Link>하세요.
          </p>
        )}
        {message && <p className="alert success">{message}</p>}
        {error && <p className="alert error">{error}</p>}
      </article>
    </section>
  )
}

export function RankingPage() {
  const [rows, setRows] = useState<RankingRow[]>([])
  useEffect(() => {
    api
      .ranking()
      .then(setRows)
      .catch(() => setRows([]))
  }, [])
  return (
    <section>
      <PageHeading
        eyebrow="LEADERBOARD"
        title="Ranking"
        subtitle="점수와 해결 문제 수를 기준으로 정렬됩니다."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Score</th>
              <th>Solved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.username}>
                <td>#{index + 1}</td>
                <td>{row.nickname || row.username}</td>
                <td>{row.score}</td>
                <td>{row.solvedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function MyPage() {
  const { user } = useAuth()
  return (
    <section>
      <PageHeading eyebrow="YOUR PROGRESS" title="My Page" subtitle="학습 기록을 확인하세요." />
      <div className="stats">
        <div>
          <strong>{user?.score ?? 0}</strong>
          <span>Score</span>
        </div>
        <div>
          <strong>{user?.nickname || user?.username}</strong>
          <span>Account</span>
        </div>
      </div>
    </section>
  )
}

function PageHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>
    </div>
  )
}
