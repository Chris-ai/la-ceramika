import { useEffect, useMemo, useState } from 'react'
import { createDuelTransport, getCurrentDuel, type DuelSnapshot } from '@/features/duel-control'
import { DuelView } from './DuelView'
import './DuelScreen.css'

const initial: DuelSnapshot = {
  duel: null,
  phase: 'IDLE',
  attackerMs: 45000,
  defenderMs: 45000,
  activeTeamId: null,
  winnerTeamId: null,
}

export function DuelPresentation({ gameId }: { gameId: string }) {
  const [snapshot, setSnapshot] = useState(initial)
  const transport = useMemo(() => createDuelTransport(gameId), [gameId])
  useEffect(() => {
    let resultTimeout: number | undefined
    const unsubscribe = transport.subscribe((message) => {
      if (message.kind !== 'SNAPSHOT') return
      setSnapshot(message.snapshot)
      if (message.snapshot.phase === 'RESULT') {
        window.clearTimeout(resultTimeout)
        resultTimeout = window.setTimeout(() => setSnapshot(initial), 3500)
      }
    })
    void getCurrentDuel(gameId).then((duel) => {
      if (duel)
        setSnapshot({
          ...initial,
          duel,
          phase: duel.status === 'ACTIVE' ? 'ACTIVE' : 'INTRO',
          activeTeamId: duel.attacker.id,
        })
    })
    transport.requestSnapshot()
    return () => {
      window.clearTimeout(resultTimeout)
      unsubscribe()
      transport.close()
    }
  }, [gameId, transport])
  return (
    <main className="duel-presentation-screen">
      <DuelView snapshot={snapshot} presentation />
    </main>
  )
}
