import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ACTIVE_GAME_KEY, gameQueryKey } from '@/entities/game'
import { createGame, GameSetupForm } from '@/features/create-game'

export function SetupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeGameId = localStorage.getItem(ACTIVE_GAME_KEY)
  const createMutation = useMutation({ mutationFn: createGame })

  if (activeGameId) return <Navigate to={`/game/${activeGameId}`} replace />

  return (
    <GameSetupForm
      onSubmit={async (payload) => {
        const game = await createMutation.mutateAsync(payload)
        if (!game.gameId) throw new Error('Backend nie zwrócił identyfikatora gry.')
        localStorage.setItem(ACTIVE_GAME_KEY, game.gameId)
        queryClient.setQueryData(gameQueryKey(game.gameId), game)
        navigate(`/game/${game.gameId}`, { replace: true })
      }}
    />
  )
}
