import { useEffect, useEffectEvent, useMemo } from 'react'
import type { Game } from '@/entities/game'
import { createDuelTransport, useDuelController, type Duel } from '@/features/duel-control'

import { DuelView } from './DuelView'
import './DuelScreen.css'

export function DuelHost({
  initialDuel,
  onGameUpdated,
  onReturn,
}: {
  initialDuel: Duel
  onGameUpdated(game: Game): void
  onReturn(): void
}) {
  const { snapshot, isStarting, isPromptLoading, error, begin, pass, switchPlayer, retryFinish } =
    useDuelController(initialDuel, onGameUpdated)

  const transport = useMemo(() => createDuelTransport(initialDuel.gameId), [initialDuel.gameId])
  const handleCommand = useEffectEvent((command: string) => {
    if (command === 'START' && snapshot.phase === 'INTRO' && !isStarting) void begin().catch(() => undefined)
    if (command === 'PASS' && snapshot.phase === 'ACTIVE' && !isPromptLoading)
      void pass().catch(() => undefined)
    if (command === 'SWITCH' && snapshot.phase === 'ACTIVE' && !isPromptLoading)
      void switchPlayer().catch(() => undefined)
    if (command === 'RETURN' && snapshot.phase === 'RESULT') onReturn()
  })
  useEffect(() => {
    const unsubscribe = transport.subscribe((message) => {
      if (message.kind === 'COMMAND') handleCommand(message.command)
    })
    return () => {
      unsubscribe()
      transport.close()
    }
  }, [transport])
  return (
    <div className="duel-host-screen">
      <DuelView snapshot={snapshot} />
      {error && (
        <div className="duel-error" role="alert">
          {error}
          {retryFinish && (
            <button type="button" onClick={retryFinish}>
              Ponów zapis wyniku
            </button>
          )}
        </div>
      )}
    </div>
  )
}
