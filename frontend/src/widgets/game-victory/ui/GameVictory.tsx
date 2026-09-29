import { useEffect, useRef, type CSSProperties } from 'react'
import { Icon } from '@iconify/react/offline'
import trophyIcon from '@iconify-icons/heroicons/trophy-solid'
import type { GameTeam } from '@/entities/game'
import { TeamAvatar, teamLabel } from '@/entities/team'
import { Button } from '@/shared/ui/button'
import './GameVictory.css'

const colors = ['#ffd563', '#f28e9a', '#91abea', '#63cfc1', '#ad91d8']

export function GameVictory({ winner, onFinish }: { winner: GameTeam; onFinish(): void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="game-victory"
      aria-labelledby="victory-title"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="game-victory__confetti" aria-hidden="true">
        {Array.from({ length: 72 }, (_, index) => (
          <i
            key={index}
            style={
              {
                '--x': `${(index * 37) % 101}%`,
                '--drift': `${((index * 53) % 241) - 120}px`,
                '--delay': `${(index % 12) * 0.065}s`,
                '--duration': `${2.6 + (index % 7) * 0.18}s`,
                '--spin': `${360 + (index % 5) * 180}deg`,
                backgroundColor: index % 3 === 0 ? winner.color : colors[index % colors.length],
              } as CSSProperties
            }
          />
        ))}
      </div>
      <section className="game-victory__card">
        <Icon icon={trophyIcon} className="game-victory__trophy" aria-hidden="true" />
        <h1 id="victory-title">Zwycięzca</h1>
        <span
          className="game-victory__team"
          role="img"
          aria-label={`Zwycięska drużyna: ${teamLabel(winner)}`}
        >
          <TeamAvatar slug={winner.avatar.replace('game-icons:', '')} color={winner.color} />
        </span>
        <Button variant="primary" onClick={onFinish} autoFocus>
          Koniec
        </Button>
      </section>
    </dialog>
  )
}
