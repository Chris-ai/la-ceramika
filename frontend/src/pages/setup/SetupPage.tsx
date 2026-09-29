import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { ACTIVE_GAME_KEY, activeGameQueryOptions, gameQueryKey } from '@/entities/game'
import { createGame, GameSetupForm } from '@/features/create-game'

export function SetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const createMutation = useMutation({ mutationFn: createGame })
  const routeState: unknown = location.state
  const confirmedGameId =
    routeState && typeof routeState === 'object' && 'confirmedGameId' in routeState
      ? routeState.confirmedGameId
      : null
  return (
    <GameSetupForm
      onCancel={() => navigate('/')}
      onSubmit={async (payload) => {
        const active = await queryClient.fetchQuery({ ...activeGameQueryOptions(), staleTime: 0 })
        if (
          active &&
          active.gameId !== confirmedGameId &&
          !window.confirm('Rozpoczęcie nowej gry zarchiwizuje obecną partię. Kontynuować?')
        ) {
          throw new Error('Nie rozpoczęto nowej gry. Obecna partia pozostaje aktywna.')
        }
        const game = await createMutation.mutateAsync({
          ...payload,
          replaceActiveGameId: active?.gameId ?? null,
        })
        if (!game.gameId) throw new Error('Backend nie zwrócił identyfikatora gry.')
        localStorage.setItem(ACTIVE_GAME_KEY, game.gameId)
        queryClient.setQueryData(gameQueryKey(game.gameId), game)
        await queryClient.invalidateQueries({ queryKey: ['games'] })
        navigate(`/game/${game.gameId}`, { replace: true })
      }}
    />
  )
}
