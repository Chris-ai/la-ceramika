import { queryOptions } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/apiClient'
import type { Game } from '../model/types'

export const ACTIVE_GAME_KEY = 'la-ceramica.active-game-id'

export const gameQueryKey = (gameId: string) => ['game', gameId] as const

export const gameQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: gameQueryKey(gameId),
    queryFn: () => apiRequest<Game>(`/games/${gameId}`),
  })
