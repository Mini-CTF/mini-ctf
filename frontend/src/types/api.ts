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
  solveCount: number
  likeCount: number
  liked: boolean
}

export type ChallengeDetail = ChallengeSummary & { description: string; hintAvailable: boolean; hintCost: number }

export type PopularChallenge = {
  challengeId: number
  title: string
  category: string
  difficulty: string
  score: number
  solved: boolean
  likeCount: number
}

export type RankingRow = {
  rank: number
  username: string
  nickname: string
  score: number
  solvedCount: number
  equippedTitle: string | null
  equippedFrame: string | null
  equippedAccessory: string | null
  avatarUrl: string | null
  tier: string
}

export type AttendanceBadge = {
  id: string
  name: string
  description: string
}

export type AttendanceTitle = {
  id: string
  name: string
  requirement: string
}

export type AttendanceSummary = {
  totalDays: number
  currentStreak: number
  longestStreak: number
  checkedInToday: boolean
  activeTitle: string | null
  badges: AttendanceBadge[]
  earnedTitles: AttendanceTitle[]
}

export type AttendanceRankingRow = {
  rank: number
  username: string
  nickname: string
  totalDays: number
  currentStreak: number
  avatarUrl: string | null
  equippedFrame: string | null
  equippedAccessory: string | null
  equippedTitle: string | null
  tier: string
}

export type Stats = { challenges: number; solves: number; users: number }

export type AssistantReply = {
  message: string
  contextLabel: string | null
}

export type AssistantFeedback = {
  id: number
  username: string
  nickname: string
  rating: number
  comment: string | null
  createdAt: string
}

export type CommunityCategory = 'FREE' | 'QUESTION' | 'CTF' | 'NOTICE'

export type PostSummary = {
  id: number
  title: string
  category: CommunityCategory
  author: string
  authorNickname: string
  authorTitle: string | null
  viewCount: number
  commentCount: number
  likeCount: number
  dislikeCount: number
  recommendCount: number
  viewerReactions: ('LIKE' | 'DISLIKE' | 'RECOMMEND')[]
  createdAt: string
  updatedAt: string
}

export type PostDetail = PostSummary & { content: string; editable: boolean }

export type PostComment = {
  id: number
  content: string
  author: string
  authorNickname: string
  authorTitle: string | null
  editable: boolean
  parentId: number | null
  pinned: boolean
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
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED' | string
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
  equippedFrame: string | null
  equippedAccessory: string | null
  equippedTitle: string | null
  tier: string
}

export type PublicProfileFriend = {
  username: string
  nickname: string
  avatarUrl: string | null
  equippedFrame: string | null
  equippedAccessory: string | null
  equippedTitle: string | null
}

export type PublicProfile = {
  username: string
  nickname: string
  score: number
  solvedCount: number
  statusMessage: string | null
  avatarUrl: string | null
  equippedFrame: string | null
  equippedAccessory: string | null
  equippedTitle: string | null
  friends: PublicProfileFriend[]
  solveActivity: { date: string; count: number }[]
  tier: string
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

export type DeletedDirectMessage = {
  id: number
  sender: string
  recipient: string
}

export type LearningOverview = {
  weeklyTarget: number
  weeklySolved: number
  totalSolved: number
  bookmarkedCount: number
  recentSolves: { challengeId: number; title: string; category: string; solvedAt: string }[]
  achievements: { code: string; name: string; description: string }[]
}

export type LearningBookmark = {
  challengeId: number
  title: string
  category: string
  difficulty: string
  score: number
  solved: boolean
  createdAt: string
}
