import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Icon } from '@iconify/react/offline'
import fireIcon from '@iconify-icons/heroicons/fire-solid'
import closeIcon from '@iconify-icons/heroicons/x-mark'
import turnArrowIcon from '@iconify-icons/heroicons/arrow-right'
import type { ChallengeType } from '@/entities/challenge'
import type { Game, Hex } from '@/entities/game'
import { ChallengeModal, resolveChallenge, spinRoulette, type ChallengeData } from '@/features/play-challenge'
import { nextPlayer } from '@/features/end-turn'
import type { Duel } from '@/features/duel-control'
import { HexActionPanel } from '@/features/select-hex-action'
import { DuelHost } from '@/widgets/duel-screen'
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
  const [activeDuel, setActiveDuel] = useState<Duel | null>(null)
  const nextTurnMutation = useMutation({ mutationFn: nextPlayer })
  const resolveChallengeMutation = useMutation({
    mutationFn: ({
      gameId,
      hexId,
      type,
      won,
    }: {
      gameId: string
      hexId: string
      type: ChallengeType
      won: boolean
    }) => resolveChallenge(gameId, hexId, type, won),
  })
  const rouletteMutation = useMutation({
    mutationFn: ({ gameId, hexId, choice }: { gameId: string; hexId: string; choice: 'RED' | 'BLACK' }) =>
      spinRoulette(gameId, hexId, choice),
  })
  useEffect(() => {
    const timeout = window.setTimeout(() => setIsMapEntering(false), 1750)
    return () => window.clearTimeout(timeout)
  }, [])
  const activeTeamIndex = Math.max(
    0,
    map.teams.findIndex((team) => team.id === map.currentTeamId),
  )
  const activeTeam = map.teams[activeTeamIndex]
  const actionCount = (map.baseMoveUsed ? 0 : 1) + (activeTeam.bonusMoves ?? 0)

  if (activeDuel)
    return (
      <DuelHost
        initialDuel={activeDuel}
        onGameUpdated={onGameUpdated}
        onReturn={() => {
          setActiveDuel(null)
          setHexActionTarget(null)
          setSelectedHex(null)
        }}
      />
    )

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
        .mutateAsync(map.gameId!)
        .then(onGameUpdated)
        .catch((error) => {
          setActionError(error instanceof Error ? error.message : 'Nie udało się zakończyć tury.')
        })
        .finally(() => window.setTimeout(() => setIsTurnChanging(false), 280))
    }, 160)
  }

  return (
    <main className="board-screen">
      <HexMap
        game={map}
        activeTeamIndex={activeTeamIndex}
        actionCount={actionCount}
        selectedHex={selectedHex}
        isEntering={isMapEntering}
        onSelect={(hex, mode) => {
          setSelectedHex(`${hex.q},${hex.r}`)
          if (mode) {
            setMapVerdict(null)
            setHexActionTarget({ hex, mode })
          } else setHexActionTarget(null)
        }}
      />
      {hexActionTarget && !challengeTarget && map.gameId && (
        <HexActionPanel
          gameId={map.gameId}
          target={hexActionTarget}
          onDuel={setActiveDuel}
          onError={setActionError}
          onChallenge={(type, data) => setChallengeTarget({ ...hexActionTarget, type, data })}
        />
      )}
      {map.gameId && (
        <button
          type="button"
          className="presentation-open"
          onClick={() => {
            window.open(`/game/${map.gameId}/presentation`, 'la-ceramica-presentation')
          }}
        >
          Ekran prezentacyjny
        </button>
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
        disabled={isTurnChanging}
        onClick={requestNextTurn}
        aria-label={`Zakończ turę drużyny ${activeTeam.name}`}
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
      {actionError && (
        <div className="board-action-error" role="alert">
          {actionError}
        </div>
      )}
      {mapVerdict && (
        <div className={`map-verdict map-verdict--${mapVerdict.toLowerCase()}`} role="status">
          <strong>{mapVerdict === 'WIN' ? 'Wyzwanie wygrane' : 'Wyzwanie przegrane'}</strong>
          <span>
            {mapVerdict === 'WIN' ? 'Pole jest gotowe do przejęcia.' : 'Pole nie zostało przejęte.'}
          </span>
          <button type="button" aria-label="Ukryj werdykt" onClick={() => setMapVerdict(null)}>
            <Icon icon={closeIcon} aria-hidden="true" />
          </button>
        </div>
      )}
      {challengeTarget && (
        <ChallengeModal
          mode={challengeTarget.mode}
          initialType={challengeTarget.type}
          challengeData={challengeTarget.data}
          onClose={() => setChallengeTarget(null)}
          onResolve={async (verdict) => {
            if (!map.gameId || !challengeTarget.hex.id) throw new Error('Brak identyfikatora gry lub heksa.')
            const updated = await resolveChallengeMutation.mutateAsync({
              gameId: map.gameId,
              hexId: challengeTarget.hex.id,
              type: challengeTarget.type,
              won: verdict === 'WIN',
            })
            onGameUpdated(updated)
          }}
          onRouletteSpin={async (choice) => {
            if (!map.gameId || !challengeTarget.hex.id) throw new Error('Brak identyfikatora gry lub heksa.')
            const outcome = await rouletteMutation.mutateAsync({
              gameId: map.gameId,
              hexId: challengeTarget.hex.id,
              choice,
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
    </main>
  )
}
