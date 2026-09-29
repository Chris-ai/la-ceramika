import { apiRequest, jsonRequest } from '@/shared/api/apiClient'
import type { Game } from '@/entities/game'
import type { ChallengeType } from '@/entities/challenge'
import type { QuizQuestion } from '../model/quizData'
import type { RushTask } from '../model/rushData'
import type { AllInQuestion, MoreLessQuestion } from '../model/gambleData'

export type ChallengeData = {
  type: ChallengeType
  gambleType: 'ALL_IN' | 'MORE_LESS' | 'ROULETTE' | null
  payload: QuizQuestion | RushTask | AllInQuestion | MoreLessQuestion | null
}

export const startChallenge = (gameId: string, hexId: string, type: ChallengeType) =>
  apiRequest<ChallengeData>(`/games/${gameId}/hexes/${hexId}/challenge`, jsonRequest('POST', { type }))

export const resolveChallenge = (gameId: string, hexId: string, type: ChallengeType, won: boolean) =>
  apiRequest<Game>(`/games/${gameId}/hexes/${hexId}/challenge/${type}/result`, jsonRequest('POST', { won }))

export type RouletteSpinResult = {
  number: number
  color: 'RED' | 'BLACK' | 'GREEN'
  result: 'WIN' | 'LOSS'
  game: Game
}

export const spinRoulette = (gameId: string, hexId: string, choice: 'RED' | 'BLACK') =>
  apiRequest<RouletteSpinResult>(
    `/games/${gameId}/hexes/${hexId}/roulette-spin`,
    jsonRequest('POST', { choice }),
  )

export const startResurrection = (gameId: string) =>
  apiRequest<{ game: Game; hexId: string | null; challenge: ChallengeData | null }>(
    `/games/${gameId}/resurrection`,
    jsonRequest('POST', {}),
  )
