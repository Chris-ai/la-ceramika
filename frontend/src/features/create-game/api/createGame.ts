import { apiRequest, jsonRequest } from '@/shared/api/apiClient'
import type { Game } from '@/entities/game'
import type { toGameSetupPayload } from '../model/gameSetupSchema'

type CreateGamePayload = ReturnType<typeof toGameSetupPayload> & { replaceActiveGameId?: string | null }

export function createGame(payload: CreateGamePayload) {
  return apiRequest<Game>('/games', jsonRequest('POST', payload))
}
