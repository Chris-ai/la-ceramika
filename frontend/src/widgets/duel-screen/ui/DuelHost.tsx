import type { Game } from '@/entities/game'
import { useDuelController, type Duel } from '@/features/duel-control'
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
  const { snapshot, isStarting, error, begin, pass, switchPlayer } = useDuelController(
    initialDuel,
    onGameUpdated,
  )

  return (
    <main className="duel-host-screen">
      <DuelView snapshot={snapshot} />
      <footer className="duel-controls">
        {snapshot.phase === 'INTRO' && (
          <button className="duel-start" disabled={isStarting} onClick={() => void begin()}>
            START
          </button>
        )}
        {snapshot.phase === 'ACTIVE' && (
          <>
            <button onClick={pass}>PASS −3 s</button>
            <button className="duel-change" onClick={switchPlayer}>
              POPRAWNA
            </button>
          </>
        )}
        {snapshot.phase === 'RESULT' && (
          <button className="duel-start" onClick={onReturn}>
            WRÓĆ DO MAPY
          </button>
        )}
      </footer>
      {error && (
        <div className="duel-error" role="alert">
          {error}
        </div>
      )}
    </main>
  )
}
