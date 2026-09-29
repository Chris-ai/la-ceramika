import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MapLoading } from '@/widgets/map-loading'

const GamePage = lazy(() => import('@/pages/game/GamePage').then((module) => ({ default: module.GamePage })))
const PresentationPage = lazy(() =>
  import('@/pages/presentation/PresentationPage').then((module) => ({ default: module.PresentationPage })),
)
const StartPage = lazy(() =>
  import('@/pages/start/StartPage').then((module) => ({ default: module.StartPage })),
)
const SetupPage = lazy(() =>
  import('@/pages/setup/SetupPage').then((module) => ({ default: module.SetupPage })),
)
const RulesPage = lazy(() =>
  import('@/pages/rules/RulesPage').then((module) => ({ default: module.RulesPage })),
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<MapLoading />}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/game/:gameId/presentation" element={<PresentationPage />} />
          <Route path="*" element={<StartPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
