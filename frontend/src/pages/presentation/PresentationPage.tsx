import { Navigate, useParams } from 'react-router-dom'
import { DuelPresentation } from '@/widgets/duel-screen'

export function PresentationPage() {
  const { gameId } = useParams()
  return gameId ? <DuelPresentation gameId={gameId} /> : <Navigate to="/" replace />
}
