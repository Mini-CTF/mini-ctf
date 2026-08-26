import type {
  AuthResponse,
  AdminComment,
  ChallengeDetail,
  ChallengeSummary,
  AttendanceRankingRow,
  AttendanceSummary,
  AdminDashboard,
  AdminPost,
  CommunityCategory,
  PageView,
  PostComment,
  PostDetail,
  PostSummary,
  Profile,
  PublicProfile,
  Friend,
  DirectMessage,
  RankingRow,
  Stats,
  User,
  VaultSummary,
  HiddenSummary,
} from '../types/api'
import { clearAuthToken, getAuthToken } from './session'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const rankingChangedEvent = 'flagbox:ranking-changed'
export const sessionExpiredEvent = 'flagbox:session-expired'
export const sessionExpiredMessage = '다른 기기에서 로그인되어 세션이 만료되었습니다.'

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@\s*/, '')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers })
  const body = await response.json().catch(() => null)
  if (body?.error?.code === 'SESSION_EXPIRED_OTHER_LOGIN') {
    clearAuthToken()
    window.dispatchEvent(new CustomEvent(sessionExpiredEvent, { detail: sessionExpiredMessage }))
  }
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
  attendance: () => request<AttendanceSummary>('/attendance'),
  checkIn: () => request<AttendanceSummary>('/attendance/check-in', { method: 'POST' }),
  selectAttendanceTitle: (titleId: string) => request<AttendanceSummary>('/attendance/title', { method: 'PUT', body: JSON.stringify({ titleId }) }),
  attendanceRanking: () => request<AttendanceRankingRow[]>('/attendance/ranking'),
  submitFlag: (id: number, flag: string) =>
    request<{ result: string; awardedScore: number }>(`/challenges/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ flag }),
    }),
  challengeActivity: (id: number, type: 'OPENED' | 'FOCUS_LOST' | 'FOCUS_RESTORED') =>
    request<void>(`/challenges/${id}/activity`, { method: 'POST', body: JSON.stringify({ type }) }),
  challengeHint: (id: number) => request<{ hint: string; remainingCredits: number }>(`/challenges/${id}/hint`, { method: 'POST' }),
  communityPosts: (category?: CommunityCategory) =>
    request<PageView<PostSummary>>(`/community/posts${category ? `?category=${category}` : ''}`),
  communityPost: (id: number) => request<PostDetail>(`/community/posts/${id}`),
  createPost: (payload: { title: string; content: string; category: CommunityCategory }) =>
    request<PostDetail>('/community/posts', { method: 'POST', body: JSON.stringify(payload) }),
  updatePost: (id: number, payload: { title: string; content: string; category: CommunityCategory }) =>
    request<PostDetail>(`/community/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePost: (id: number) => request<void>(`/community/posts/${id}`, { method: 'DELETE' }),
  reactToPost: (id: number, reaction: 'LIKE' | 'DISLIKE' | 'RECOMMEND') =>
    request<PostDetail>(`/community/posts/${id}/reaction`, { method: 'POST', body: JSON.stringify({ reaction }) }),
  postComments: (postId: number) => request<PostComment[]>(`/community/posts/${postId}/comments`),
  createPostComment: (postId: number, content: string, parentId?: number) =>
    request<PostComment>(`/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content, parentId }) }),
  updatePostComment: (id: number, content: string) =>
    request<PostComment>(`/community/comments/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  deletePostComment: (id: number) => request<void>(`/community/comments/${id}`, { method: 'DELETE' }),
  pinPostReply: (postId: number, commentId: number) =>
    request<PostComment>(`/community/posts/${postId}/comments/${commentId}/pin`, { method: 'PATCH' }),
  adminDashboard: () => request<AdminDashboard>('/admin/dashboard'),
  adminPosts: () => request<AdminPost[]>('/admin/community/posts'),
  adminComments: () => request<AdminComment[]>('/admin/community/comments'),
  publishNotice: (payload: { title: string; content: string }) =>
    request<AdminPost>('/admin/notices', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAdminPost: (id: number) => request<void>(`/admin/community/posts/${id}`, { method: 'DELETE' }),
  deleteAdminComment: (id: number) => request<void>(`/admin/community/comments/${id}`, { method: 'DELETE' }),
  updateAdminUser: (id: number, nickname: string) =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ nickname }) }),
  suspendUser: (id: number, reason: string) =>
    request(`/admin/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reinstateUser: async (id: number) => {
    const result = await request(`/admin/users/${id}/reinstate`, { method: 'POST' })
    window.dispatchEvent(new Event(rankingChangedEvent))
    return result
  },
  deactivateUser: async (id: number) => {
    await request<void>(`/admin/users/${id}`, { method: 'DELETE' })
    window.dispatchEvent(new Event(rankingChangedEvent))
  },
  redactAuditLog: (id: number, reason: string) =>
    request<void>(`/admin/audit-logs/${id}/redact`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  hideAuditLog: (id: number, reason: string) =>
    request<void>(`/admin/audit-logs/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  redactSecurityEvent: (id: number, reason: string) =>
    request<void>(`/admin/security-events/${id}/redact`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  hideSecurityEvent: (id: number, reason: string) =>
    request<void>(`/admin/security-events/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  profile: () => request<Profile>('/users/me'),
  publicProfile: (username: string) => request<PublicProfile>(`/users/${encodeURIComponent(username)}/profile`),
  updateProfile: (payload: { nickname?: string; statusMessage?: string }) =>
    request<Profile>('/users/me/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  async uploadAvatar(file: File): Promise<Profile> {
    const token = getAuthToken()
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${baseUrl}/users/me/avatar`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: form })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new Error(body?.error?.message ?? 'Could not upload avatar.')
    return body.data as Profile
  },
  deleteAvatar: () => request<void>('/users/me/avatar', { method: 'DELETE' }),
  vault: () => request<VaultSummary>('/vault'),
  discoverVault: () => request<VaultSummary>('/vault/discover', { method: 'POST' }),
  claimVaultMission: (id: string) => request<VaultSummary>(`/vault/missions/${encodeURIComponent(id)}/claim`, { method: 'POST' }),
  buyVaultItem: (id: string) => request<VaultSummary>('/vault/shop/buy', { method: 'POST', body: JSON.stringify({ id }) }),
  craftVaultItem: (id: string) => request<VaultSummary>('/vault/craft', { method: 'POST', body: JSON.stringify({ id }) }),
  equipVaultItem: (id: string) => request<VaultSummary>('/vault/equip', { method: 'PUT', body: JSON.stringify({ id }) }),
  discoverHiddenVault: () => request<HiddenSummary>('/vault/hidden/discover', { method: 'POST' }),
  hiddenVault: () => request<HiddenSummary>('/vault/hidden'),
  claimHiddenMission: (id: string) => request<HiddenSummary>(`/vault/hidden/missions/${encodeURIComponent(id)}/claim`, { method: 'POST' }),
  friends: () => request<Friend[]>('/social/friends'),
  requestFriend: (username: string) => request<Friend>(`/social/friends/${encodeURIComponent(normalizeUsername(username))}`, { method: 'POST' }),
  acceptFriend: (username: string) => request<Friend>(`/social/friends/${encodeURIComponent(username)}/accept`, { method: 'POST' }),
  removeFriend: (username: string) => request<void>(`/social/friends/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  messages: (username: string) => request<DirectMessage[]>(`/social/messages/${encodeURIComponent(username)}`),
  sendMessage: (username: string, content: string) => request<DirectMessage>(`/social/messages/${encodeURIComponent(username)}`, { method: 'POST', body: JSON.stringify({ content }) }),
  updateMessage: (id: number, content: string) => request<DirectMessage>(`/social/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteMessage: (id: number) => request<void>(`/social/messages/${id}`, { method: 'DELETE' }),
  async downloadArtifact(id: number) {
    const token = getAuthToken()
    const response = await fetch(`${baseUrl}/challenges/${id}/artifact`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.error?.message ?? 'Artifact download failed.')
    }
    const url = URL.createObjectURL(await response.blob())
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    const link = document.createElement('a')
    link.href = url
    link.download = named?.[1] ?? `challenge-${id}-artifact`
    link.click()
    URL.revokeObjectURL(url)
  },
}
