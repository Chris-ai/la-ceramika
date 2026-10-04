import { teamLabel } from '@/entities/team'
import { Icon } from '@iconify/react/offline'
import duelIcon from '@iconify-icons/game-icons/crossed-swords'
import type { CSSProperties } from 'react'
import type { DuelSnapshot } from '@/features/duel-control'
import { DuelImage } from './DuelImage'

const timer = (milliseconds: number) => {
  const tenths = Math.max(0, Math.ceil(milliseconds / 100))
  const minutes = Math.floor(tenths / 600)
  const seconds = Math.floor((tenths % 600) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths % 10}`
}

function TeamMark({ avatar, color }: { avatar: string; color: string }) {
  const slug = avatar.replace('game-icons:', '')
  return (
    <span
      className="duel-team-mark"
      role="img"
      aria-label={teamLabel({ avatar, color })}
      style={{ backgroundColor: color, maskImage: `url('/team-icons/${slug}.svg')` }}
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
      {phase === 'INTRO' && (
        <div className="duel-intro">
          <div className="duel-category-label">Kategoria</div>
          <h1>{duel.category}</h1>
          <div className="duel-versus">
            <div style={{ '--team': duel.attacker.color } as CSSProperties}>
              <TeamMark {...duel.attacker} />
            </div>
            <b>VS</b>
            <div style={{ '--team': duel.defender.color } as CSSProperties}>
              <TeamMark {...duel.defender} />
            </div>
          </div>
        </div>
      )}
      {phase === 'ACTIVE' && (
        <div className="duel-play">
          <div className={`duel-list-prompt ${duel.type === 'IDENTIFY' ? 'duel-identify-prompt' : ''}`}>
            {duel.type === 'IDENTIFY' && duel.prompt ? (
              <>
                {duel.prompt.imageUrl ? (
                  <DuelImage key={duel.prompt.imageUrl} src={duel.prompt.imageUrl} />
                ) : (
                  <h1>{duel.prompt.text}</h1>
                )}
                {duel.prompt.attribution && (
                  <small className="duel-identify-prompt__credit">
                    {typeof duel.prompt.attribution === 'string' ? (
                      duel.prompt.attribution
                    ) : (
                      <>
                        Zdjęcie:{' '}
                        <a href={duel.prompt.attribution.authorUrl} target="_blank" rel="noreferrer">
                          {duel.prompt.attribution.author}
                        </a>{' '}
                        /{' '}
                        <a href={duel.prompt.attribution.sourceUrl} target="_blank" rel="noreferrer">
                          {duel.prompt.attribution.source}
                        </a>
                      </>
                    )}
                  </small>
                )}
                {presentation && (
                  <>
                    {duel.prompt.answer && (
                      <>
                        <br />
                        <span className="duel-identify-prompt__answer">Odpowiedź: {duel.prompt.answer}</span>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <span>Podaj przykład</span>
                <h1>{duel.category}</h1>
              </>
            )}
          </div>
          <div className="duel-clocks">
            <div
              className={`duel-clock ${snapshot.activeTeamId === duel.attacker.id ? 'duel-clock--active' : ''}`}
              style={{ '--team': duel.attacker.color } as CSSProperties}
              aria-label={`${teamLabel(duel.attacker)}, pozostało ${timer(snapshot.attackerMs)}`}
            >
              <TeamMark {...duel.attacker} />
              <time>{timer(snapshot.attackerMs)}</time>
            </div>
            <div
              className={`duel-clock ${snapshot.activeTeamId === duel.defender.id ? 'duel-clock--active' : ''}`}
              style={{ '--team': duel.defender.color } as CSSProperties}
              aria-label={`${teamLabel(duel.defender)}, pozostało ${timer(snapshot.defenderMs)}`}
            >
              <TeamMark {...duel.defender} />
              <time>{timer(snapshot.defenderMs)}</time>
            </div>
          </div>
        </div>
      )}
      {phase === 'RESULT' && (
        <div className="duel-result">
          <span>Zwycięża</span>
          <span role="img" aria-label={`Zwycięska drużyna: ${teamLabel(winner)}`}>
            <TeamMark {...winner} />
          </span>
        </div>
      )}
    </section>
  )
}
