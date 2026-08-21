import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function OAuthButtons() {
  const providers = ['google', 'github', 'kakao', 'naver']
  return (
    <div className="oauth-list">
      {providers.map((provider) => (
        <a
          className={`oauth ${provider}`}
          href={`/api/auth/oauth/${provider}/authorize`}
          key={provider}
        >
          Continue with {provider[0].toUpperCase() + provider.slice(1)}
        </a>
      ))}
    </div>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await login(String(form.get('username')), String(form.get('password')))
      navigate('/challenges')
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.')
    }
  }
  return (
    <AuthCard title="Welcome back" subtitle="계정에 로그인하세요.">
      <form onSubmit={submit} className="form">
        <label>
          Username
          <input name="username" required minLength={3} autoComplete="username" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && <p className="alert error">{error}</p>}
        <button className="button" type="submit">
          Login
        </button>
      </form>
      <div className="divider">or</div>
      <OAuthButtons />
      <p className="muted">
        계정이 없나요? <Link to="/register">회원가입</Link>
      </p>
    </AuthCard>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await register({
        username: String(form.get('username')),
        password: String(form.get('password')),
        passwordConfirmation: String(form.get('passwordConfirmation')),
        nickname: String(form.get('nickname') || ''),
      })
      navigate('/challenges')
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원가입에 실패했습니다.')
    }
  }
  return (
    <AuthCard title="Create account" subtitle="Mini CTF 학습을 시작하세요.">
      <form onSubmit={submit} className="form">
        <label>
          Username
          <input name="username" required minLength={3} maxLength={50} />
        </label>
        <label>
          Nickname
          <input name="nickname" maxLength={80} />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm password
          <input
            name="passwordConfirmation"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {error && <p className="alert error">{error}</p>}
        <button className="button" type="submit">
          Register
        </button>
      </form>
      <div className="divider">or</div>
      <OAuthButtons />
      <p className="muted">
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </p>
    </AuthCard>
  )
}

export function OAuthCallbackPage() {
  const { acceptToken } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setError('OAuth 인증 토큰이 없습니다.')
      return
    }
    acceptToken(token)
      .then(() => navigate('/challenges', { replace: true }))
      .catch(() => setError('OAuth 계정 연결에 실패했습니다.'))
  }, [acceptToken, navigate, params])
  return (
    <section className="auth-card">
      <p className="eyebrow">OAUTH</p>
      <h1>Signing you in…</h1>
      {error && <p className="alert error">{error}</p>}
    </section>
  )
}

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="auth-card">
      <p className="eyebrow">SECURE ACCESS</p>
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>
      {children}
    </section>
  )
}
