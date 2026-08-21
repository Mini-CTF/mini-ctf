import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function OAuthButtons() {
  const providers = ['google', 'github']
  return (
    <div className="oauth-list">
      {providers.map((provider) => (
        <a
          className={`oauth ${provider}`}
          href={`/api/auth/oauth/${provider}/authorize`}
          key={provider}
        >
          {provider === 'google' ? <GoogleIcon /> : <GithubIcon />}
          <span>Continue with {provider[0].toUpperCase() + provider.slice(1)}</span>
        </a>
      ))}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="oauth-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.56-5.17 3.56-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.38-2.3V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.78 1.28 5.4l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.94 1.14 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4 3.1C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg className="oauth-logo github-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.84 2.8 1.31 3.48 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z"
      />
    </svg>
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
