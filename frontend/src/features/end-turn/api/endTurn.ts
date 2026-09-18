import { apiRequest } from '@/shared/api/apiClient'
import type { Game } from '@/entities/game'

export const nextPlayer = (gameId: string) =>
  apiRequest<Game>(`/games/${gameId}/next-player`, { method: 'POST' })
