import { Toast } from '@/shared/ui/toast'
import { teamLabel } from '@/entities/team'
import { useEffect, useEffectEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Icon } from '@iconify/react/offline'
import fireIcon from '@iconify-icons/heroicons/fire-solid'
import turnArrowIcon from '@iconify-icons/heroicons/arrow-right'
import type { ChallengeType } from '@/entities/challenge'
import type { Game, Hex } from '@/entities/game'
import {
  getPendingChallenge,
  ChallengeModal,
  resolveChallenge,
  spinRoulette,
  type ChallengeData,
  type ChallengeAnswer,
} from '@/features/play-challenge'
import { nextPlayer } from '@/features/end-turn'
import { createDuel, getCurrentDuel, type Duel } from '@/features/duel-control'
import { HexActionPanel } from '@/features/select-hex-action'
import { DuelHost } from '@/widgets/duel-screen'
import { PurgatoryPanel } from './PurgatoryPanel'
import { ActionWheel } from './ActionWheel'
import { HexMap } from './HexMap'
import './GameBoard.css'

export function GameBoard({ map, onGameUpdated }: { map: Game; onGameUpdated: (game: Game) => void }) {
  const [isMapEntering, setIsMapEntering] = useState(true)
  const [selectedHex, setSelectedHex] = useState<string | null>(null)
  const [hexActionTarget, setHexActionTarget] = useState<{ hex: Hex; mode: 'NEUTRAL' | 'DUEL' } | null>(null)
  const [challengeTarget, setChallengeTarget] = useState<{
    hex: Hex
    mode: 'NEUTRAL' | 'DUEL'
    type: ChallengeType
    data?: ChallengeData
  } | null>(null)
  const [mapVerdict, setMapVerdict] = useState<'WIN' | 'LOSS' | null>(null)
  const [isTurnChanging, setIsTurnChanging] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [turnEndModal, setTurnEndModal] = useState<'BASE_REQUIRED' | 'BONUS_CONFIRM' | null>(null)
  const [localDuel, setActiveDuel] = useState<Duel | null>(null)
  const [dismissedDuelId, setDismissedDuelId] = useState<string | null>(null)
  const duelRecovery = useQuery({
    queryKey: ['duel-recovery', map.gameId],
    queryFn: () => getCurrentDuel(map.gameId!),
    enabled: !!map.gameId && map.status === 'ACTIVE',
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
    gcTime: 0,
  })
  const activeDuel =
    localDuel ?? (duelRecovery.data?.id !== dismissedDuelId ? (duelRecovery.data ?? null) : null)
  const restorePending = useEffectEvent((pending: { hexId: string; challenge: ChallengeData } | null) => {
    const hex = pending && map.hexes.find((item) => item.id === pending.hexId)
    if (pending && hex)
      setChallengeTarget({ hex, mode: 'NEUTRAL', type: pending.challenge.type, data: pending.challenge })
  })
  const nextTurnMutation = useMutation({ mutationFn: nextPlayer })
  const duelMutation = useMutation({
    mutationFn: ({ gameId, hexId }: { gameId: string; hexId: string }) => createDuel(gameId, hexId),
  })
  const resolveChallengeMutation = useMutation({
    mutationFn: ({
      gameId,
      hexId,
      type,
      answer,
    }: {
      gameId: string
      hexId: string
      type: ChallengeType
      answer: ChallengeAnswer & { challengeId: string }
    }) => resolveChallenge(gameId, hexId, type, answer),
  })
  const rouletteMutation = useMutation({
    mutationFn: ({
      gameId,
      hexId,
      choice,
      challengeId,
    }: {
      challengeId: string
      gameId: string
      hexId: string
      choice: 'RED' | 'BLACK'
    }) => spinRoulette(gameId, hexId, choice, challengeId),
  })
  useEffect(() => {
    const timeout = window.setTimeout(() => setIsMapEntering(false), 1750)
    return () => window.clearTimeout(timeout)
  }, [])
  useEffect(() => {
    if (!map.gameId) return

    let cancelled = false
    void getPendingChallenge(map.gameId)
      .then((pending) => {
        if (!cancelled) restorePending(pending)
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setActionError(error instanceof Error ? error.message : 'Nie udało się wznowić wyzwania.')
      })
    return () => {
      cancelled = true
    }
  }, [map.gameId])
  const activeTeamIndex = Math.max(
    0,
    map.teams.findIndex((team) => team.id === map.currentTeamId),
  )
  const activeTeam = map.teams[activeTeamIndex]
  const actionCount =
    activeTeam.status === 'PURGATORY' || map.status === 'FINISHED'
      ? 0
      : (map.baseMoveUsed ? 0 : 1) + (activeTeam.bonusMoves ?? 0)

  function requestNextTurn() {
    if (!map.baseMoveUsed) {
      setTurnEndModal('BASE_REQUIRED')
      return
    }
    if ((activeTeam.bonusMoves ?? 0) > 0) {
      setTurnEndModal('BONUS_CONFIRM')
      return
    }
    advanceTurn()
  }

  function advanceTurn() {
    if (isTurnChanging || !map.gameId) return
    setTurnEndModal(null)
    setIsTurnChanging(true)
    setActionError(null)
    setSelectedHex(null)
    setHexActionTarget(null)
    window.setTimeout(() => {
      void nextTurnMutation
        .mutateAsync({ gameId: map.gameId!, currentTeamId: map.currentTeamId! })
        .then(onGameUpdated)
        .catch((error) => {
          setActionError(error instanceof Error ? error.message : 'Nie udało się zakończyć tury.')
        })
        .finally(() => window.setTimeout(() => setIsTurnChanging(false), 280))
    }, 160)
  }

  return (
    <main className="board-screen">
      <PurgatoryPanel key={map.currentTeamId} game={map} onGameUpdated={onGameUpdated} />
      <HexMap
        game={map}
        activeTeamIndex={activeTeamIndex}
        actionCount={actionCount}
        selectedHex={selectedHex}
        isEntering={isMapEntering}
        onSelect={(hex, mode) => {
          setSelectedHex(`${hex.q},${hex.r}`)
          if (mode === 'DUEL' && map.gameId && hex.id) {
            if (duelMutation.isPending || activeDuel) return
            setHexActionTarget(null)
            setActionError(null)
            const presentation = window.open(`/game/${map.gameId}/presentation`, 'la-ceramica-presentation')
            void duelMutation
              .mutateAsync({ gameId: map.gameId, hexId: hex.id })
              .then((duel) => {
                setActiveDuel(duel)
                presentation?.focus()
                window.focus()
              })
              .catch(async (error) => {
                const existingDuel = await getCurrentDuel(map.gameId!).catch(() => null)
                if (existingDuel) {
                  setActiveDuel(existingDuel)
                  presentation?.focus()
                  window.focus()
                  return
                }
                presentation?.close()
                setActionError(error instanceof Error ? error.message : 'Nie udało się rozpocząć pojedynku.')
              })
            return
          }
          if (mode === 'NEUTRAL') {
            setMapVerdict(null)
            setHexActionTarget({ hex, mode })
          } else setHexActionTarget(null)
        }}
      />
      {hexActionTarget?.mode === 'NEUTRAL' && !challengeTarget && map.gameId && (
        <HexActionPanel
          gameId={map.gameId}
          target={hexActionTarget}
          onError={setActionError}
          onChallenge={(type, data) => setChallengeTarget({ ...hexActionTarget, type, data })}
        />
      )}
      <div className="turn-status">
        <div className="turn-streak" aria-label={`Seria zwycięstw: ${activeTeam.streak ?? 0}`}>
          <Icon icon={fireIcon} className="turn-fire" aria-hidden="true" />
          <strong>{activeTeam.streak ?? 0}</strong>
        </div>
        <div className="turn-actions" title="Jeden dostępny ruch z trzech miejsc">
          <ActionWheel count={actionCount} />
        </div>
      </div>
      <button
        type="button"
        className={`turn-end ${isTurnChanging ? 'turn-end--changing' : ''}`}
        style={{ backgroundColor: activeTeam.color }}
        disabled={
          isTurnChanging ||
          map.status === 'FINISHED' ||
          (activeTeam.status === 'PURGATORY' && !map.baseMoveUsed)
        }
        onClick={requestNextTurn}
        aria-label={`Zakończ turę drużyny ${teamLabel(activeTeam)}`}
      >
        <Icon icon={turnArrowIcon} aria-hidden="true" />
      </button>
      {turnEndModal && (
        <div className="turn-modal-overlay" role="presentation">
          <section
            className="turn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="turn-modal-message"
          >
            <strong id="turn-modal-message">
              {turnEndModal === 'BASE_REQUIRED'
                ? 'Musisz najpierw wykonać swój podstawowy ruch.'
                : 'Masz jeszcze dodatkowe ruchy do wykorzystania. Czy na pewno chcesz zakończyć turę?'}
            </strong>
            <div className="turn-modal-actions">
              {turnEndModal === 'BASE_REQUIRED' ? (
                <button type="button" autoFocus onClick={() => setTurnEndModal(null)}>
                  OK
                </button>
              ) : (
                <>
                  <button type="button" autoFocus onClick={() => setTurnEndModal(null)}>
                    Nie
                  </button>
                  <button type="button" className="turn-modal-confirm" onClick={advanceTurn}>
                    Tak
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
      {duelRecovery.isError && !activeDuel && (
        <div className="board-action-error" role="alert">
          Nie udało się sprawdzić trwającego pojedynku.
          <button
            type="button"
            disabled={duelRecovery.isFetching}
            onClick={() => void duelRecovery.refetch()}
          >
            Ponów wczytywanie pojedynku
          </button>
        </div>
      )}
      {actionError && (
        <div className="board-action-error" role="alert">
          {actionError}
        </div>
      )}
      {mapVerdict && (
        <Toast
          message={mapVerdict === 'WIN' ? 'Pole przejęte!' : 'Pole nie zostało przejęte.'}
          tone={mapVerdict === 'WIN' ? 'success' : 'error'}
          onDismiss={() => setMapVerdict(null)}
        />
      )}
      {challengeTarget && (
        <ChallengeModal
          mode={challengeTarget.mode}
          initialType={challengeTarget.type}
          challengeData={challengeTarget.data}
          onClose={() => setChallengeTarget(null)}
          onResolve={async (answer) => {
            if (!map.gameId || !challengeTarget.hex.id) throw new Error('Brak identyfikatora gry lub heksa.')
            const updated = await resolveChallengeMutation.mutateAsync({
              gameId: map.gameId,
              hexId: challengeTarget.hex.id,
              type: challengeTarget.type,
              answer: { ...answer, challengeId: challengeTarget.data!.challengeId },
            })
            onGameUpdated(updated.game)
            return updated.result
          }}
          onRouletteSpin={async (choice) => {
            if (!map.gameId || !challengeTarget.hex.id) throw new Error('Brak identyfikatora gry lub heksa.')
            const outcome = await rouletteMutation.mutateAsync({
              gameId: map.gameId,
              hexId: challengeTarget.hex.id,
              choice,
              challengeId: challengeTarget.data!.challengeId,
            })
            onGameUpdated(outcome.game)
            return { number: outcome.number, color: outcome.color, result: outcome.result }
          }}
          onReturn={(verdict) => {
            setChallengeTarget(null)
            setHexActionTarget(null)
            setMapVerdict(verdict)
          }}
        />
      )}
      {activeDuel && (
        <DuelHost
          initialDuel={activeDuel}
          onGameUpdated={onGameUpdated}
          onReturn={() => {
            setDismissedDuelId(activeDuel.id)
            setActiveDuel(null)
            setHexActionTarget(null)
            setSelectedHex(null)
          }}
        />
      )}
    </main>
  )
}
