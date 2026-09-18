import { apiRequest, jsonRequest } from '@/shared/api/apiClient'
import type { Game } from '@/entities/game'

export type DuelTeam = { id: string; name: string; color: string; avatar: string }
export type Duel = {
  id: string
  gameId: string
  targetHexId: string
  type: 'LIST' | 'IDENTIFY'
  status: 'INTRO' | 'ACTIVE' | 'FINISHED'
  category: string
  attacker: DuelTeam
  defender: DuelTeam
  winnerTeamId: string | null
}

export async function createDuel(gameId: string, hexId: string) {
  return apiRequest<Duel>(`/games/${gameId}/hexes/${hexId}/duel`, { method: 'POST' })
}

export async function getCurrentDuel(gameId: string) {
  return apiRequest<Duel | null>(`/games/${gameId}/duel`)
}

export async function startDuel(duel: Duel) {
  return apiRequest<Duel>(`/games/${duel.gameId}/duels/${duel.id}/start`, { method: 'POST' })
}

export async function finishDuel(duel: Duel, winnerTeamId: string) {
  return apiRequest<{ duel: Duel; game: Game }>(
    `/games/${duel.gameId}/duels/${duel.id}/finish`,
    jsonRequest('POST', { winnerTeamId }),
  )
}
