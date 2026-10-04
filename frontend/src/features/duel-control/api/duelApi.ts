import { apiRequest, apiUrl, jsonRequest } from '@/shared/api/apiClient'
import type { Game } from '@/entities/game'

export type DuelTeam = { id: string; color: string; avatar: string }
export type DuelPrompt = {
  imageUrl: string | null
  text?: string
  answer?: string
  attribution: string | { author: string; authorUrl: string; source: string; sourceUrl: string } | null
}
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
  contentId?: string | null
  prompt: DuelPrompt | null
}

const normalizeDuel = (duel: Duel): Duel => ({
  ...duel,
  prompt: duel.prompt
    ? {
        ...duel.prompt,
        imageUrl: duel.prompt.imageUrl?.startsWith('/') ? apiUrl(duel.prompt.imageUrl) : duel.prompt.imageUrl,
      }
    : null,
})

export async function createDuel(gameId: string, hexId: string) {
  return normalizeDuel(await apiRequest<Duel>(`/games/${gameId}/hexes/${hexId}/duel`, { method: 'POST' }))
}

export async function getCurrentDuel(gameId: string) {
  const duel = await apiRequest<Duel | null>(`/games/${gameId}/duel`)
  return duel ? normalizeDuel(duel) : null
}

export async function startDuel(duel: Duel) {
  return normalizeDuel(
    await apiRequest<Duel>(`/games/${duel.gameId}/duels/${duel.id}/start`, { method: 'POST' }),
  )
}

export async function nextDuelPrompt(duel: Duel) {
  return normalizeDuel(
    await apiRequest<Duel>(
      `/games/${duel.gameId}/duels/${duel.id}/next-prompt`,
      jsonRequest('POST', { previousContentId: duel.contentId }),
    ),
  )
}

export async function finishDuel(duel: Duel, winnerTeamId: string) {
  return apiRequest<{ duel: Duel; game: Game }>(
    `/games/${duel.gameId}/duels/${duel.id}/finish`,
    jsonRequest('POST', { winnerTeamId }),
  )
}
