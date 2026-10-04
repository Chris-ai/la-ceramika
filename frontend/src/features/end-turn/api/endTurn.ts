import { apiRequest, jsonRequest } from '@/shared/api/apiClient'
import type { Game } from '@/entities/game'

export const nextPlayer = ({ gameId, currentTeamId }: { gameId: string; currentTeamId: string }) =>
  apiRequest<Game>(`/games/${gameId}/next-player`, jsonRequest('POST', { currentTeamId }))
