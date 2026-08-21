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
