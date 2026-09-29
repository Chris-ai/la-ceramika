import { DemoBoard } from '@/widgets/demo-board'
import { StartMenu } from '@/widgets/start-menu'
import { StartTitle } from './ui/StartTitle'
import './StartPage.css'

export function StartPage() {
  return (
    <main className="start-page">
      <div className="start-page__center">
        <StartTitle />
        <DemoBoard />
      </div>
      <StartMenu />
    </main>
  )
}
