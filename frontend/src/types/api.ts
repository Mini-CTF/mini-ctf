export type User = {
  id: number
  username: string
  nickname: string
  role: 'USER' | 'ADMIN' | string
  score: number
}

export type ApiResponse<T> = { success: boolean; data: T }
export type ChallengeSummary = {
  id: number
  title: string
  category: string
  difficulty: string
  score: number
  solved: boolean
}
export type ChallengeDetail = ChallengeSummary & {
  description: string
  active: boolean
  artifactAvailable: boolean
}
export type RankingRow = {
  username: string
  nickname: string
  score: number
  solvedCount: number
}
export type AuthResponse = { token: string; user: User }
