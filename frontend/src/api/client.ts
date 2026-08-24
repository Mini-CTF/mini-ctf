import type {
  AuthResponse,
  AdminComment,
  ChallengeDetail,
  ChallengeSummary,
  AdminDashboard,
  AdminPost,
  CommunityCategory,
  PageView,
  PostComment,
  PostDetail,
  PostSummary,
  Profile,
  Friend,
  DirectMessage,
  RankingRow,
  Stats,
  User,
} from '../types/api'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@\s*/, '')
}

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
  challengeActivity: (id: number, type: 'OPENED' | 'FOCUS_LOST' | 'FOCUS_RESTORED') =>
    request<void>(`/challenges/${id}/activity`, { method: 'POST', body: JSON.stringify({ type }) }),
  communityPosts: (category?: CommunityCategory) =>
    request<PageView<PostSummary>>(`/community/posts${category ? `?category=${category}` : ''}`),
  communityPost: (id: number) => request<PostDetail>(`/community/posts/${id}`),
  createPost: (payload: { title: string; content: string; category: CommunityCategory }) =>
    request<PostDetail>('/community/posts', { method: 'POST', body: JSON.stringify(payload) }),
  updatePost: (id: number, payload: { title: string; content: string; category: CommunityCategory }) =>
    request<PostDetail>(`/community/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePost: (id: number) => request<void>(`/community/posts/${id}`, { method: 'DELETE' }),
  postComments: (postId: number) => request<PostComment[]>(`/community/posts/${postId}/comments`),
  createPostComment: (postId: number, content: string) =>
    request<PostComment>(`/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  updatePostComment: (id: number, content: string) =>
    request<PostComment>(`/community/comments/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  deletePostComment: (id: number) => request<void>(`/community/comments/${id}`, { method: 'DELETE' }),
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
  reinstateUser: (id: number) => request(`/admin/users/${id}/reinstate`, { method: 'POST' }),
  deactivateUser: (id: number) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  redactAuditLog: (id: number, reason: string) =>
    request<void>(`/admin/audit-logs/${id}/redact`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  hideAuditLog: (id: number, reason: string) =>
    request<void>(`/admin/audit-logs/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  redactSecurityEvent: (id: number, reason: string) =>
    request<void>(`/admin/security-events/${id}/redact`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  hideSecurityEvent: (id: number, reason: string) =>
    request<void>(`/admin/security-events/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  profile: () => request<Profile>('/users/me'),
  updateProfile: (payload: { nickname?: string; statusMessage?: string }) =>
    request<Profile>('/users/me/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  async uploadAvatar(file: File): Promise<Profile> {
    const token = localStorage.getItem('mini-ctf-token')
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${baseUrl}/users/me/avatar`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: form })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new Error(body?.error?.message ?? 'Could not upload avatar.')
    return body.data as Profile
  },
  deleteAvatar: () => request<void>('/users/me/avatar', { method: 'DELETE' }),
  friends: () => request<Friend[]>('/social/friends'),
  requestFriend: (username: string) => request<Friend>(`/social/friends/${encodeURIComponent(normalizeUsername(username))}`, { method: 'POST' }),
  acceptFriend: (username: string) => request<Friend>(`/social/friends/${encodeURIComponent(username)}/accept`, { method: 'POST' }),
  removeFriend: (username: string) => request<void>(`/social/friends/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  messages: (username: string) => request<DirectMessage[]>(`/social/messages/${encodeURIComponent(username)}`),
  sendMessage: (username: string, content: string) => request<DirectMessage>(`/social/messages/${encodeURIComponent(username)}`, { method: 'POST', body: JSON.stringify({ content }) }),
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
