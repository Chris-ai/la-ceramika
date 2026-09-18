import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MapLoading } from '@/widgets/map-loading'

const GamePage = lazy(() => import('@/pages/game/GamePage').then((module) => ({ default: module.GamePage })))
const PresentationPage = lazy(() =>
  import('@/pages/presentation/PresentationPage').then((module) => ({ default: module.PresentationPage })),
)
const SetupPage = lazy(() =>
  import('@/pages/setup/SetupPage').then((module) => ({ default: module.SetupPage })),
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<MapLoading />}>
        <Routes>
          <Route path="/" element={<SetupPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/game/:gameId/presentation" element={<PresentationPage />} />
          <Route path="*" element={<SetupPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
