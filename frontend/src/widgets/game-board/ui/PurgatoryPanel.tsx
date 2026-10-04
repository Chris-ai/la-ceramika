import { Toast } from '@/shared/ui/toast'
import { useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { Game } from '@/entities/game'
import { TeamAvatar, teamLabel } from '@/entities/team'
import {
  ChallengeModal,
  startResurrection,
  resolveChallenge,
  spinRoulette,
  type ChallengeData,
} from '@/features/play-challenge'
import './PurgatoryPanel.css'

export function PurgatoryPanel({
  game,
  onGameUpdated,
  children,
}: {
  game: Game
  onGameUpdated(game: Game): void
  children: (action: { canAttempt: boolean; busy: boolean; begin: () => void }) => ReactNode
}) {
  const [attempt, setAttempt] = useState<{ hexId: string; challenge: ChallengeData } | null>(null)
  const [result, setResult] = useState<'WIN' | 'LOSS' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const start = useMutation({ mutationFn: startResurrection })
  const teams = game.teams
    .filter((team) => team.status === 'PURGATORY')
    .sort((a, b) => a.turnOrder - b.turnOrder)
  const current = teams.find((team) => team.id === game.currentTeamId)
  const isTurn = current && game.status === 'ACTIVE'

  async function begin() {
    if (!game.gameId || start.isPending) return
    setError(null)
    setResult(null)
    try {
      const response = await start.mutateAsync(game.gameId)
      onGameUpdated(response.game)
      if (response.hexId && response.challenge)
        setAttempt({ hexId: response.hexId, challenge: response.challenge })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się rozpocząć próby powrotu.')
    }
  }

  return (
    <>
      {teams.length > 0 && (
        <aside
          className={`purgatory-panel ${isTurn ? 'purgatory-panel--current' : ''}`}
          aria-label="Drużyny w czyśćcu"
        >
          <ul>
            {teams.map((team) => (
              <li
                key={team.id}
                className={isTurn && team.id === current.id ? 'purgatory-team--current' : ''}
                aria-current={isTurn && team.id === current.id ? 'step' : undefined}
                title={`${teamLabel(team)}${isTurn && team.id === current.id ? ' — teraz tura' : ''}`}
              >
                <span role="img" aria-label={teamLabel(team)}>
                  <TeamAvatar slug={team.avatar.replace('game-icons:', '')} color={team.color} />
                </span>
              </li>
            ))}
          </ul>
        </aside>
      )}
      {children({
        canAttempt: !!isTurn && !game.baseMoveUsed,
        busy: start.isPending || attempt !== null,
        begin: () => void begin(),
      })}
      {error && <Toast message={error} tone="error" onDismiss={() => setError(null)} />}
      {result && (
        <Toast
          message={result === 'WIN' ? 'Powrót na mapę! Nowa baza zdobyta.' : 'Drużyna pozostaje w czyśćcu.'}
          tone={result === 'WIN' ? 'success' : 'error'}
          onDismiss={() => setResult(null)}
        />
      )}
      {attempt && game.gameId && (
        <ChallengeModal
          mode="NEUTRAL"
          initialType={attempt.challenge.type}
          challengeData={attempt.challenge}
          onClose={() => setAttempt(null)}
          onResolve={async (answer) => {
            const updated = await resolveChallenge(game.gameId!, attempt.hexId, attempt.challenge.type, {
              ...answer,
              challengeId: attempt.challenge.challengeId,
            })
            onGameUpdated(updated.game)
            return updated.result
          }}
          onRouletteSpin={async (choice) => {
            const outcome = await spinRoulette(
              game.gameId!,
              attempt.hexId,
              choice,
              attempt.challenge.challengeId,
            )
            onGameUpdated(outcome.game)
            return outcome
          }}
          onReturn={(verdict) => {
            setAttempt(null)
            setResult(verdict)
          }}
        />
      )}
    </>
  )
}
