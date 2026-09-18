import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Icon } from '@iconify/react/offline'
import { challengeOptions, type ChallengeType } from '@/entities/challenge'
import type { Hex } from '@/entities/game'
import { createDuel, type Duel } from '@/features/duel-control'
import { startChallenge, type ChallengeData } from '@/features/play-challenge'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

type HexTarget = { hex: Hex; mode: 'NEUTRAL' | 'DUEL' }

export function HexActionPanel({
  gameId,
  target,
  onChallenge,
  onDuel,
  onError,
}: {
  gameId: string
  target: HexTarget
  onChallenge: (type: ChallengeType, data: ChallengeData) => void
  onDuel: (duel: Duel) => void
  onError: (message: string) => void
}) {
  const [loading, setLoading] = useState<ChallengeType | null>(null)
  const challengeMutation = useMutation({
    mutationFn: ({ hexId, type }: { hexId: string; type: ChallengeType }) =>
      startChallenge(gameId, hexId, type),
  })
  const duelMutation = useMutation({ mutationFn: (hexId: string) => createDuel(gameId, hexId) })
  const options = target.mode === 'NEUTRAL' ? challengeOptions.slice(0, 3) : challengeOptions.slice(3)

  return (
    <aside className="hex-action-panel" aria-label="Dostępne akcje na heksie">
      {options
        .filter(
          (option) => !target.hex.availableChallenges || target.hex.availableChallenges.includes(option.type),
        )
        .map((option) => (
          <button
            type="button"
            key={option.type}
            disabled={loading !== null}
            onClick={() => {
              if (!target.hex.id) return
              setLoading(option.type)
              const request =
                option.type === 'DUEL'
                  ? duelMutation.mutateAsync(target.hex.id)
                  : challengeMutation.mutateAsync({ hexId: target.hex.id, type: option.type })
              void request
                .then((data) =>
                  option.type === 'DUEL'
                    ? onDuel(data as Duel)
                    : onChallenge(option.type, data as ChallengeData),
                )
                .catch((error) =>
                  onError(error instanceof Error ? error.message : 'Nie udało się rozpocząć wyzwania.'),
                )
                .finally(() => setLoading(null))
            }}
          >
            <span style={{ backgroundColor: option.color }}>
              {loading === option.type ? <LoadingSpinner /> : <Icon icon={option.icon} aria-hidden="true" />}
            </span>
            <strong>{option.label}</strong>
          </button>
        ))}
    </aside>
  )
}
