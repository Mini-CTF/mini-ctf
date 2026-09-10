import type {
  AuthResponse,
  AccountLog,
  AdminComment,
  ChallengeDetail,
  ChallengeSummary,
  AttendanceRankingRow,
  AttendanceSummary,
  AssistantReply,
  AssistantFeedback,
  AdminDashboard,
  AdminUser,
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
  LearningOverview,
  LearningBookmark,
  PopularChallenge,
} from '../types/api'
import { clearAuthToken, getAuthToken } from './session'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
const REQUEST_TIMEOUT_MS = 12_000
const GET_RETRY_DELAYS_MS = [500, 1_250]
export const rankingChangedEvent = 'flagbox:ranking-changed'
export const adminAccountChangedEvent = 'flagbox:admin-account-changed'
export const sessionExpiredEvent = 'flagbox:session-expired'
export const sessionExpiredMessage = '다른 기기에서 로그인되어 세션이 만료되었습니다.'
export const accountAccessMessages: Record<string, string> = {
  ACCOUNT_DELETED: '계정이 삭제되었습니다.',
  ACCOUNT_SUSPENDED: '계정이 정지되었습니다.',
  IP_BANNED: '이 IP 주소는 이용이 제한되었습니다.',
}

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@\s*/, '')
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function getDeviceFingerprint(): string {
  const key = 'flagbox_fp'
  try {
    const existing = window.localStorage.getItem(key)
    if (existing && existing.length >= 8) return existing
    const rand = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 48) : 'unknown'
    const raw = `${rand}-${ua}-${screen.width}x${screen.height}`
    let hash = 0
    for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
    const fp = `fbx-${hash.toString(36)}-${rand.slice(0, 8)}`
    window.localStorage.setItem(key, fp)
    return fp
  } catch {
    return `fbx-${Math.random().toString(36).slice(2, 10)}`
  }
}

function notifyAdminAccountChanged(user?: AdminUser): void {
  window.dispatchEvent(new Event(rankingChangedEvent))
  if (user) window.dispatchEvent(new CustomEvent(adminAccountChangedEvent, { detail: user }))
  try {
    window.localStorage.setItem('flagbox-admin-account-change', `${Date.now()}:${user?.id ?? 'unknown'}`)
  } catch {
    // Storage may be unavailable in private browsing; the in-tab event still works.
  }
}

type ApiRequestInit = RequestInit & { timeoutMs?: number }
const inFlightGets = new Map<string, Promise<unknown>>()

function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const token = getAuthToken()
  const dedupeKey = method === 'GET' ? `${token ?? 'public'}:${path}` : null
  if (dedupeKey) {
    const pending = inFlightGets.get(dedupeKey)
    if (pending) return pending as Promise<T>
  }

  const pending = performRequest<T>(path, init, token)
  if (dedupeKey) {
    inFlightGets.set(dedupeKey, pending)
    const clear = () => {
      if (inFlightGets.get(dedupeKey) === pending) inFlightGets.delete(dedupeKey)
    }
    void pending.then(clear, clear)
  }
  return pending
}

async function performRequest<T>(path: string, init: ApiRequestInit, token: string | null): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  try { headers.set('X-Device-Fingerprint', getDeviceFingerprint()) } catch { /* ignore */ }

  const retryDelays = init.method && init.method !== 'GET' ? [] : GET_RETRY_DELAYS_MS
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchInit } = init
  let lastError: unknown
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(`${baseUrl}${path}`, { ...fetchInit, headers, signal: controller.signal })
      const body = await response.json().catch(() => null)
      if (body?.error?.code === 'SESSION_EXPIRED_OTHER_LOGIN') {
        clearAuthToken()
        window.dispatchEvent(new CustomEvent(sessionExpiredEvent, { detail: sessionExpiredMessage }))
      }
      if (body?.error?.code && accountAccessMessages[body.error.code]) {
        clearAuthToken()
        window.dispatchEvent(new CustomEvent(sessionExpiredEvent, { detail: accountAccessMessages[body.error.code] }))
      }
      if (response.ok) return (body?.data ?? body) as T
      const error = new Error(body?.error?.message ?? 'Request failed. Please try again.')
      if (response.status < 500 || attempt === retryDelays.length) throw error
      lastError = error
    } catch (cause) {
      lastError = cause
      if (attempt === retryDelays.length) {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          throw new Error('The server is taking too long to respond. Please try again.', { cause })
        }
        throw new Error(cause instanceof Error ? cause.message : 'Request failed. Please try again.', { cause })
      }
    } finally {
      window.clearTimeout(timeout)
    }
    await wait(retryDelays[attempt])
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed. Please try again.')
}

// Pinned notices (admin-written NOTICE posts) are shown at the top of the
// community page. They are prefetched at app startup and cached so the
// community view — including the tutorial spotlight — renders them instantly
// instead of waiting for a fresh request after every navigation.
const pinnedNoticesKey = 'flagbox-pinned-notices-v1'
const pinnedNoticesTtlMs = 60_000
let pinnedNoticeCache: { at: number; items: PostSummary[] } | null = null

function isPinnedNotice(item: unknown): item is PostSummary {
  return typeof item === 'object'
    && item !== null
    && typeof (item as PostSummary).id === 'number'
    && typeof (item as PostSummary).title === 'string'
}

function cachePinnedNotices(items: PostSummary[]) {
  pinnedNoticeCache = { at: Date.now(), items }
  try {
    sessionStorage.setItem(pinnedNoticesKey, JSON.stringify(items))
  } catch {
    // A fresh API response still renders when browser storage is unavailable.
  }
}

function clearPinnedNoticeCache() {
  pinnedNoticeCache = null
  try {
    sessionStorage.removeItem(pinnedNoticesKey)
  } catch {
    // Storage may be unavailable in private browsing; the next fetch refills.
  }
}

export function getCachedPinnedNotices(): PostSummary[] {
  if (pinnedNoticeCache && Date.now() - pinnedNoticeCache.at < pinnedNoticesTtlMs) {
    return pinnedNoticeCache.items
  }
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(pinnedNoticesKey) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const items = parsed.filter(isPinnedNotice)
    pinnedNoticeCache = { at: Date.now(), items }
    return items
  } catch {
    return []
  }
}

export function prefetchPinnedNotices(): void {
  try {
    void request<PageView<PostSummary>>('/community/posts?category=NOTICE')
      .then((page) => cachePinnedNotices(page.content))
      .catch(() => undefined)
  } catch {
    // Prefetch must never break app startup.
  }
}

export const api = {
  assistantChat: (payload: { message: string; challengeId?: number; language: 'ko' | 'en'; history?: { role: 'assistant' | 'user'; content: string }[] }) =>
    request<AssistantReply>('/assistant/chat', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30_000 }),
  submitAssistantFeedback: (payload: { rating: number; comment?: string }) =>
    request<void>('/assistant/feedback', { method: 'POST', body: JSON.stringify(payload) }),
  assistantFeedback: () => request<AssistantFeedback[]>('/assistant/feedback'),
  register: (payload: {
    username: string
    nickname: string
    email: string
    password: string
    passwordConfirmation: string
  }) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { username: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  recoverUsername: (email: string) => request<{ message: string }>('/auth/recovery/username', { method: 'POST', body: JSON.stringify({ email }) }),
  requestPasswordReset: (username: string, email: string) => request<{ message: string }>('/auth/recovery/password', { method: 'POST', body: JSON.stringify({ username, email }) }),
  resetPassword: (token: string, password: string, passwordConfirmation: string) => request<{ message: string }>('/auth/recovery/reset', { method: 'POST', body: JSON.stringify({ token, password, passwordConfirmation }) }),
  me: () => request<User>('/auth/me'),
  oauthProviders: () => request<string[]>('/auth/oauth/providers'),
  stats: () => request<Stats>('/stats'),
  challenges: () => request<ChallengeSummary[]>('/challenges'),
  challenge: (id: number) => request<ChallengeDetail>(`/challenges/${id}`),
  ranking: () => request<RankingRow[]>('/ranking'),
  attendance: () => request<AttendanceSummary>('/attendance'),
  checkIn: () => request<AttendanceSummary>('/attendance/check-in', { method: 'POST' }),
  attendanceRanking: () => request<AttendanceRankingRow[]>('/attendance/ranking'),
  submitFlag: (id: number, flag: string) =>
    request<{ result: string; awardedScore: number }>(`/challenges/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ flag }),
    }),
  challengeActivity: (id: number, type: 'OPENED' | 'FOCUS_LOST' | 'FOCUS_RESTORED') =>
    request<void>(`/challenges/${id}/activity`, { method: 'POST', body: JSON.stringify({ type }) }),
  challengeHint: (id: number) => request<{ hint: string }>(`/challenges/${id}/hint`, { method: 'POST' }),
  communityPosts: (category?: CommunityCategory) => {
    const pending = request<PageView<PostSummary>>(`/community/posts${category ? `?category=${category}` : ''}`)
    if (category === 'NOTICE') void pending.then((page) => cachePinnedNotices(page.content)).catch(() => undefined)
    return pending
  },
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
  adminDashboard: () => request<AdminDashboard>('/admin/dashboard', { cache: 'no-store' }),
  moderationUsers: () => request<AdminUser[]>('/moderation/users', { cache: 'no-store' }),
  adminAccountLogs: (id: number) => request<AccountLog[]>(`/admin/users/${id}/logs`, { cache: 'no-store' }),
  moderationAccountLogs: (id: number) => request<AccountLog[]>(`/moderation/users/${id}/logs`, { cache: 'no-store' }),
  moderationNotices: () => request<AdminPost[]>('/moderation/notices', { cache: 'no-store' }),
  adminPosts: () => request<AdminPost[]>('/admin/community/posts'),
  adminComments: () => request<AdminComment[]>('/admin/community/comments'),
  publishNotice: (payload: { title: string; content: string }) =>
    request<AdminPost>('/admin/notices', { method: 'POST', body: JSON.stringify(payload) })
      .then((post) => { clearPinnedNoticeCache(); return post }),
  publishModeratorNotice: (payload: { title: string; content: string }) =>
    request<AdminPost>('/moderation/notices', { method: 'POST', body: JSON.stringify(payload) })
      .then((post) => { clearPinnedNoticeCache(); return post }),
  deleteAdminPost: (id: number) => request<void>(`/admin/community/posts/${id}`, { method: 'DELETE' })
    .then((result) => { clearPinnedNoticeCache(); return result }),
  deleteAdminComment: (id: number) => request<void>(`/admin/community/comments/${id}`, { method: 'DELETE' }),
  updateAdminUser: async (id: number, nickname: string) => {
    const result = await request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ nickname }) })
    notifyAdminAccountChanged(result)
    return result
  },
  updateModeratorRole: async (id: number, role: 'USER' | 'MODERATOR') => {
    const result = await request<AdminUser>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
    notifyAdminAccountChanged(result)
    return result
  },
  adjustAdminUserScore: async (id: number, amount: number, reason: string) => {
    const result = await request<AdminUser>(`/admin/users/${id}/score`, { method: 'POST', body: JSON.stringify({ amount, reason }) })
    notifyAdminAccountChanged(result)
    return result
  },
  adjustModeratorUserScore: (id: number, amount: number, reason: string) =>
    request<AdminUser>(`/moderation/users/${id}/score`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
  suspendUser: async (id: number, reason: string) => {
    const result = await request<AdminUser>(`/admin/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) })
    notifyAdminAccountChanged(result)
    return result
  },
  suspendModeratorUser: (id: number, reason: string) =>
    request<AdminUser>(`/moderation/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reinstateUser: async (id: number) => {
    const result = await request<AdminUser>(`/admin/users/${id}/reinstate`, { method: 'POST' })
    notifyAdminAccountChanged(result)
    return result
  },
  reinstateModeratorUser: (id: number) => request<AdminUser>(`/moderation/users/${id}/reinstate`, { method: 'POST' }),
  deactivateUser: async (id: number) => {
    const result = await request<AdminUser>(`/admin/users/${id}`, { method: 'DELETE' })
    notifyAdminAccountChanged(result)
    return result
  },
  permanentlyDeleteUser: async (id: number) => {
    await request<void>(`/admin/users/${id}/permanent`, { method: 'DELETE' })
    notifyAdminAccountChanged()
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
  learningOverview: () => request<LearningOverview>('/learning/overview'),
  updateLearningGoal: (weeklyTarget: number) => request<LearningOverview>('/learning/goal', { method: 'PUT', body: JSON.stringify({ weeklyTarget }) }),
  learningBookmarks: () => request<LearningBookmark[]>('/learning/bookmarks'),
  addLearningBookmark: (challengeId: number) => request<void>(`/learning/bookmarks/${challengeId}`, { method: 'PUT' }),
  removeLearningBookmark: (challengeId: number) => request<void>(`/learning/bookmarks/${challengeId}`, { method: 'DELETE' }),
  popularChallenges: () => request<PopularChallenge[]>('/learning/popular-challenges'),
  addChallengeLike: (challengeId: number) => request<void>(`/learning/likes/${challengeId}`, { method: 'PUT' }),
  removeChallengeLike: (challengeId: number) => request<void>(`/learning/likes/${challengeId}`, { method: 'DELETE' }),
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
  async artifact(id: number) {
    const token = getAuthToken()
    const response = await fetch(`${baseUrl}/challenges/${id}/artifact`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.error?.message ?? 'Artifact download failed.')
    }
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    return {
      blob: await response.blob(),
      filename: decodeURIComponent(named?.[1] ?? `challenge-${id}-artifact`),
      contentType: response.headers.get('Content-Type') ?? '',
    }
  },
  async previewArtifact(id: number) {
    const token = getAuthToken()
    const response = await fetch(`${baseUrl}/challenges/${id}/artifact`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.error?.message ?? 'Artifact preview failed.')
    }
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    let filename = named?.[1] ?? `challenge-${id}-artifact`
    try { filename = decodeURIComponent(filename) } catch { /* Keep the server-provided name. */ }
    const bytes = new Uint8Array(await response.arrayBuffer())
    const limit = Math.min(bytes.length, 24 * 1024)
    const sample = bytes.slice(0, limit)
    const controlBytes = sample.reduce((count, byte) => count + (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13 ? 1 : 0), 0)
    const binary = sample.length > 0 && controlBytes / sample.length > 0.04
    const text = new TextDecoder().decode(sample)
    const rows: string[] = []
    for (let offset = 0; offset < sample.length; offset += 16) {
      const row = sample.slice(offset, offset + 16)
      const hex = Array.from(row, (byte) => byte.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' ')
      const ascii = Array.from(row, (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.').join('')
      rows.push(`${offset.toString(16).padStart(8, '0')}  ${hex}  |${ascii}|`)
    }
    return { filename, sizeBytes: bytes.length, text, hexDump: rows.join('\n'), binary, truncated: bytes.length > limit }
  },
}
