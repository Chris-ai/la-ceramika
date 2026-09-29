import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ACTIVE_GAME_KEY, gameQueryKey, gameQueryOptions, type Game } from '@/entities/game'
import { GameBoard } from '@/widgets/game-board'
import { MapLoading } from '@/widgets/map-loading'
import { GameVictory } from '@/widgets/game-victory'

export function GamePage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const gameQuery = useQuery(gameQueryOptions(gameId ?? ''))

  if (!gameId) return <Navigate to="/" replace />
  if (gameQuery.isPending) return <MapLoading />
  if (gameQuery.isError || !gameQuery.data) {
    localStorage.removeItem(ACTIVE_GAME_KEY)
    return (
      <main className="page-error" role="alert">
        <strong>Nie udało się wczytać gry.</strong>
        <button type="button" onClick={() => void gameQuery.refetch()}>
          Spróbuj ponownie
        </button>
      </main>
    )
  }

  const updateGame = (game: Game) => queryClient.setQueryData(gameQueryKey(gameId), game)
  const game = gameQuery.data
  const winner =
    game.status === 'FINISHED' ? game.teams.find((team) => team.id === game.winnerTeamId) : undefined
  return (
    <>
      <GameBoard map={game} onGameUpdated={updateGame} />
      {winner && (
        <GameVictory
          winner={winner}
          onFinish={() => {
            localStorage.removeItem(ACTIVE_GAME_KEY)
            void queryClient.invalidateQueries({ queryKey: ['games'] })
            navigate('/', { replace: true })
          }}
        />
      )}
    </>
  )
}
