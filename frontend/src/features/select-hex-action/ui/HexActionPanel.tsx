import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Icon } from '@iconify/react/offline'
import { challengeOptions, type ChallengeType } from '@/entities/challenge'
import type { Hex } from '@/entities/game'
import { startChallenge, type ChallengeData } from '@/features/play-challenge'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

type HexTarget = { hex: Hex; mode: 'NEUTRAL' | 'DUEL' }

export function HexActionPanel({
  gameId,
  target,
  onChallenge,
  onError,
}: {
  gameId: string
  target: HexTarget
  onChallenge: (type: ChallengeType, data: ChallengeData) => void
  onError: (message: string) => void
}) {
  const [loading, setLoading] = useState<ChallengeType | null>(null)
  const challengeMutation = useMutation({
    mutationFn: ({ hexId, type }: { hexId: string; type: ChallengeType }) =>
      startChallenge(gameId, hexId, type),
  })
  const options = challengeOptions.slice(0, 3)

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
              void challengeMutation
                .mutateAsync({ hexId: target.hex.id, type: option.type })
                .then((data) => onChallenge(option.type, data as ChallengeData))
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
