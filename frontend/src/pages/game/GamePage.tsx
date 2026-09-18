import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useParams } from 'react-router-dom'
import { ACTIVE_GAME_KEY, gameQueryKey, gameQueryOptions, type Game } from '@/entities/game'
import { GameBoard } from '@/widgets/game-board'
import { MapLoading } from '@/widgets/map-loading'

export function GamePage() {
  const { gameId } = useParams()
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
  return <GameBoard map={gameQuery.data} onGameUpdated={updateGame} />
}
