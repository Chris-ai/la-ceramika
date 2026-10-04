import { useEffect, useMemo, useState } from 'react'
import { createDuelTransport, getCurrentDuel, DUEL_TIME_MS, type DuelSnapshot } from '@/features/duel-control'
import { Button } from '@/shared/ui/button'
import { DuelView } from './DuelView'
import './DuelScreen.css'

const initial: DuelSnapshot = {
  duel: null,
  phase: 'IDLE',
  attackerMs: DUEL_TIME_MS,
  defenderMs: DUEL_TIME_MS,
  activeTeamId: null,
  winnerTeamId: null,
}

export function DuelPresentation({ gameId }: { gameId: string }) {
  const [snapshot, setSnapshot] = useState(initial)
  const transport = useMemo(() => createDuelTransport(gameId), [gameId])
  useEffect(() => {
    let cancelled = false
    let receivedSnapshot = false
    const unsubscribe = transport.subscribe((message) => {
      if (message.kind !== 'SNAPSHOT') return
      receivedSnapshot = true
      setSnapshot(message.snapshot)
    })
    void getCurrentDuel(gameId)
      .then((duel) => {
        if (duel && !cancelled && !receivedSnapshot)
          setSnapshot({
            ...initial,
            duel,
            phase: duel.status === 'ACTIVE' ? 'ACTIVE' : 'INTRO',
            activeTeamId: duel.attacker.id,
          })
      })
      .catch(() => undefined)
    transport.requestSnapshot()
    const reconnect = window.setInterval(() => transport.requestSnapshot(), 2000)
    return () => {
      cancelled = true
      window.clearInterval(reconnect)
      unsubscribe()
      transport.close()
    }
  }, [gameId, transport])
  return (
    <main className="duel-presentation-screen">
      <DuelView snapshot={snapshot} presentation />
      <footer className="duel-controls" aria-label="Sterowanie hosta">
        {snapshot.phase === 'INTRO' && (
          <Button variant="primary" onClick={() => transport.command('START')}>
            START
          </Button>
        )}
        {snapshot.phase === 'ACTIVE' && (
          <>
            <Button variant="keyboard" onClick={() => transport.command('PASS')}>
              PASS −3 s
            </Button>
            <Button variant="keyboard" className="duel-change" onClick={() => transport.command('SWITCH')}>
              ZMIANA
            </Button>
          </>
        )}
        {snapshot.phase === 'RESULT' && (
          <Button
            variant="primary"
            onClick={() => {
              transport.command('RETURN')
              setSnapshot(initial)
            }}
          >
            WRÓĆ DO MAPY
          </Button>
        )}
      </footer>
    </main>
  )
}
