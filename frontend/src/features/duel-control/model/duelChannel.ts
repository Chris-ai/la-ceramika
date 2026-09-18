import type { Duel } from '../api/duelApi'

export type DuelPhase = 'IDLE' | 'INTRO' | 'ACTIVE' | 'RESULT'
export type DuelSnapshot = {
  duel: Duel | null
  phase: DuelPhase
  attackerMs: number
  defenderMs: number
  activeTeamId: string | null
  winnerTeamId: string | null
}
type Message = { kind: 'SNAPSHOT'; snapshot: DuelSnapshot } | { kind: 'REQUEST_SNAPSHOT' }

export type DuelTransport = {
  publish(snapshot: DuelSnapshot): void
  requestSnapshot(): void
  subscribe(listener: (message: Message) => void): () => void
  close(): void
}

export function createDuelTransport(gameId: string): DuelTransport {
  const channel = new BroadcastChannel(`la-ceramica.duel.${gameId}`)
  return {
    publish: (snapshot) => channel.postMessage({ kind: 'SNAPSHOT', snapshot } satisfies Message),
    requestSnapshot: () => channel.postMessage({ kind: 'REQUEST_SNAPSHOT' } satisfies Message),
    subscribe(listener) {
      const handler = (event: MessageEvent<Message>) => listener(event.data)
      channel.addEventListener('message', handler)
      return () => channel.removeEventListener('message', handler)
    },
    close: () => channel.close(),
  }
}
