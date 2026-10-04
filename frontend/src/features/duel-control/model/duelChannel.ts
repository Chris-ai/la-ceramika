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
type DuelCommand = 'START' | 'PASS' | 'SWITCH' | 'RETURN'
type Message =
  | { kind: 'SNAPSHOT'; snapshot: DuelSnapshot }
  | { kind: 'REQUEST_SNAPSHOT' }
  | { kind: 'COMMAND'; command: DuelCommand }

export type DuelTransport = {
  publish(snapshot: DuelSnapshot): void
  requestSnapshot(): void
  command(command: DuelCommand): void
  subscribe(listener: (message: Message) => void): () => void
  close(): void
}

export function createDuelTransport(gameId: string): DuelTransport {
  // React may clean up and restart effects with the same transport (StrictMode).
  // Create the channel on subscription/use, and reopen after cleanup.
  let channel: BroadcastChannel | null = null
  const connection = () => (channel ??= new BroadcastChannel(`la-ceramica.duel.${gameId}`))
  return {
    publish: (snapshot) => connection().postMessage({ kind: 'SNAPSHOT', snapshot } satisfies Message),
    requestSnapshot: () => connection().postMessage({ kind: 'REQUEST_SNAPSHOT' } satisfies Message),
    command: (command) => connection().postMessage({ kind: 'COMMAND', command } satisfies Message),
    subscribe(listener) {
      const subscribedChannel = connection()
      const handler = (event: MessageEvent<Message>) => listener(event.data)
      subscribedChannel.addEventListener('message', handler)
      return () => subscribedChannel.removeEventListener('message', handler)
    },
    close: () => {
      channel?.close()
      channel = null
    },
  }
}
