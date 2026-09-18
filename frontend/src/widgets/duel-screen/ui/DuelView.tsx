import { Icon } from '@iconify/react/offline'
import duelIcon from '@iconify-icons/game-icons/crossed-swords'
import type { CSSProperties } from 'react'
import type { DuelSnapshot } from '@/features/duel-control'

const seconds = (milliseconds: number) => (milliseconds / 1000).toFixed(1)

function TeamMark({ avatar, color }: { avatar: string; color: string }) {
  return (
    <span
      className="duel-team-mark"
      style={{ backgroundColor: color, maskImage: `url('/team-icons/${avatar}.svg')` }}
    />
  )
}

export function DuelView({
  snapshot,
  presentation = false,
}: {
  snapshot: DuelSnapshot
  presentation?: boolean
}) {
  const { duel, phase } = snapshot
  if (!duel)
    return (
      <div className="duel-empty">
        <Icon icon={duelIcon} />
        <span>Oczekiwanie na pojedynek</span>
      </div>
    )
  const winner = duel.attacker.id === snapshot.winnerTeamId ? duel.attacker : duel.defender
  return (
    <section
      className={`duel-stage duel-stage--${phase.toLowerCase()} ${presentation ? 'duel-stage--presentation' : ''}`}
    >
      <Icon icon={duelIcon} className="duel-emblem" aria-hidden="true" />
      {phase === 'INTRO' && (
        <div className="duel-intro">
          <div className="duel-category-label">Kategoria</div>
          <h1>{duel.category}</h1>
          <div className="duel-versus">
            <div style={{ '--team': duel.attacker.color } as CSSProperties}>
              <TeamMark {...duel.attacker} />
              <strong>{duel.attacker.name}</strong>
            </div>
            <b>VS</b>
            <div style={{ '--team': duel.defender.color } as CSSProperties}>
              <TeamMark {...duel.defender} />
              <strong>{duel.defender.name}</strong>
            </div>
          </div>
        </div>
      )}
      {phase === 'ACTIVE' && (
        <div className="duel-play">
          <div
            className={`duel-clock ${snapshot.activeTeamId === duel.attacker.id ? 'duel-clock--active' : ''}`}
            style={{ '--team': duel.attacker.color } as CSSProperties}
          >
            <TeamMark {...duel.attacker} />
            <strong>{duel.attacker.name}</strong>
            <time>{seconds(snapshot.attackerMs)}</time>
          </div>
          <div className="duel-list-prompt">
            <span>Podaj przykład</span>
            <h1>{duel.category}</h1>
          </div>
          <div
            className={`duel-clock ${snapshot.activeTeamId === duel.defender.id ? 'duel-clock--active' : ''}`}
            style={{ '--team': duel.defender.color } as CSSProperties}
          >
            <TeamMark {...duel.defender} />
            <strong>{duel.defender.name}</strong>
            <time>{seconds(snapshot.defenderMs)}</time>
          </div>
        </div>
      )}
      {phase === 'RESULT' && (
        <div className="duel-result">
          <span>Zwycięża</span>
          <TeamMark {...winner} />
          <h1 style={{ color: winner.color }}>{winner.name}</h1>
        </div>
      )}
    </section>
  )
}
