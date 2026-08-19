import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../types/api'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (payload: { username: string; password: string; passwordConfirmation: string; nickname?: string }) => Promise<void>
  acceptToken: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('mini-ctf-token')) { setLoading(false); return }
    api.me().then(setUser).catch(() => localStorage.removeItem('mini-ctf-token')).finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(username, password) {
      const result = await api.login({ username, password })
      localStorage.setItem('mini-ctf-token', result.token)
      setUser(result.user)
    },
    async register(payload) {
      const result = await api.register(payload)
      localStorage.setItem('mini-ctf-token', result.token)
      setUser(result.user)
    },
    async acceptToken(token) {
      localStorage.setItem('mini-ctf-token', token)
      setUser(await api.me())
    },
    logout() { localStorage.removeItem('mini-ctf-token'); setUser(null) },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
