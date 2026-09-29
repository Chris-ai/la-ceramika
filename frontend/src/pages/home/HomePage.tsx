import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ACTIVE_GAME_KEY, gameQueryKey } from '@/entities/game'
import { createGame, GameSetupForm } from '@/features/create-game'
import { GameLibrary } from '@/widgets/game-library'

export function HomePage() {
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useMutation({ mutationFn: createGame })

  if (isCreating) {
    return (
      <GameSetupForm
        onCancel={() => setIsCreating(false)}
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

  return <GameLibrary onCreateGame={() => setIsCreating(true)} />
}
