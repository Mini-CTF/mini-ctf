import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

export function Layout() {
  const { user, logout } = useAuth()
  return <div className="app-shell">
    <header className="topbar">
      <Link className="brand" to="/">MINI<span>CTF</span></Link>
      <nav aria-label="주요 메뉴">
        <Link to="/challenges">Challenges</Link>
        <Link to="/ranking">Ranking</Link>
      </nav>
      <div className="account-nav">
        {user ? <>
          <Link to="/me">{user.nickname || user.username}</Link>
          {user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
          <button className="link-button" onClick={logout}>Logout</button>
        </> : <><Link to="/login">Login</Link><Link className="button small" to="/register">Sign Up</Link></>}
      </div>
    </header>
    <main className="content"><Outlet /></main>
  </div>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="state">Loading...</div>
  if (!user) return <div className="state"><h2>로그인이 필요합니다.</h2><Link className="button" to="/login">로그인</Link></div>
  return children
}
