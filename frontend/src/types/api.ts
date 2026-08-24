export type User = {
  id: number
  username: string
  nickname: string
  role: 'USER' | 'ADMIN' | string
  score: number
}

export type AuthResponse = { token: string; user: User }

export type ChallengeSummary = {
  id: number
  title: string
  category: string
  difficulty: string
  score: number
  solved: boolean
  artifactAvailable: boolean
}

export type ChallengeDetail = ChallengeSummary & { description: string }

export type RankingRow = {
  rank: number
  username: string
  nickname: string
  score: number
  solvedCount: number
}

export type Stats = { challenges: number; solves: number; users: number }

export type CommunityCategory = 'FREE' | 'QUESTION' | 'CTF' | 'NOTICE'

export type PostSummary = {
  id: number
  title: string
  category: CommunityCategory
  author: string
  authorNickname: string
  viewCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
}

export type PostDetail = PostSummary & { content: string; editable: boolean }

export type PostComment = {
  id: number
  content: string
  author: string
  authorNickname: string
  editable: boolean
  createdAt: string
  updatedAt: string
}

export type PageView<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type AdminUser = {
  id: number
  username: string
  nickname: string
  role: string
  status: 'ACTIVE' | 'SUSPENDED' | string
  suspensionReason: string | null
  score: number
  createdAt: string
  suspendedAt: string | null
}

export type AdminDashboard = {
  users: AdminUser[]
  recentSubmissions: { username: string; challengeTitle: string; correct: boolean; submittedAt: string }[]
  antiCheatEvents: {
    id: number
    username: string
    challengeTitle: string | null
    eventType: string
    severity: string
    detail: string
    createdAt: string
  }[]
  auditLogs: { id: number; adminUsername: string; action: string; detail: string; createdAt: string }[]
  securityEvents: {
    id: number
    username: string | null
    eventType: string
    subject: string | null
    detail: string | null
    createdAt: string
    redactedAt: string | null
  }[]
}

export type AdminPost = {
  id: number
  title: string
  category: CommunityCategory
  author: string
  authorNickname: string
  commentCount: number
  createdAt: string
}

export type AdminComment = {
  id: number
  postId: number
  postTitle: string
  content: string
  author: string
  authorNickname: string
  createdAt: string
}

export type Profile = User & {
  rank: number
  solvedCount: number
  statusMessage: string | null
  avatarUrl: string | null
}

export type Friend = {
  username: string
  nickname: string
  statusMessage: string | null
  avatarUrl: string | null
  relationshipStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | string
  incomingRequest: boolean
  requestedAt: string
}

export type DirectMessage = {
  id: number
  sender: string
  recipient: string
  content: string
  createdAt: string
  read: boolean
}
