import type {
  AuthResponse,
  ChallengeDetail,
  ChallengeSummary,
  RankingRow,
  Stats,
  User,
} from '../types/api'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('mini-ctf-token')
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error?.message ?? 'Request failed. Please try again.')
  return (body?.data ?? body) as T
}

export const api = {
  register: (payload: {
    username: string
    nickname: string
    password: string
    passwordConfirmation: string
  }) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { username: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<User>('/auth/me'),
  oauthProviders: () => request<string[]>('/auth/oauth/providers'),
  stats: () => request<Stats>('/stats'),
  challenges: () => request<ChallengeSummary[]>('/challenges'),
  challenge: (id: number) => request<ChallengeDetail>(`/challenges/${id}`),
  ranking: () => request<RankingRow[]>('/ranking'),
  submitFlag: (id: number, flag: string) =>
    request<{ result: string; awardedScore: number }>(`/challenges/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ flag }),
    }),
  async downloadArtifact(id: number) {
    const token = localStorage.getItem('mini-ctf-token')
    const response = await fetch(`${baseUrl}/challenges/${id}/artifact`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.error?.message ?? 'Artifact download failed.')
    }
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = `challenge-${id}-artifact`
    link.click()
    URL.revokeObjectURL(url)
  },
}
