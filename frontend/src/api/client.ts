import type {
  AuthResponse,
  ChallengeDetail,
  ChallengeSummary,
  RankingRow,
  User,
} from '../types/api'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('mini-ctf-token')
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.message ?? '요청을 처리하지 못했습니다.')
  }
  return (body?.data ?? body) as T
}

export const api = {
  register: (payload: {
    username: string
    password: string
    passwordConfirmation: string
    nickname?: string
  }) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { username: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<User>('/auth/me'),
  challenges: () => request<ChallengeSummary[]>('/challenges'),
  challenge: (id: number) => request<ChallengeDetail>(`/challenges/${id}`),
  submitFlag: (id: number, flag: string) =>
    request<{ result: string; awardedScore: number }>(`/challenges/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ flag }),
    }),
  ranking: () => request<RankingRow[]>('/ranking'),
}
