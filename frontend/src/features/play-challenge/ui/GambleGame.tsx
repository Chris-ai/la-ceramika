import { useState } from 'react'
import { randomAllIn, randomGambleType, randomMoreLess } from '../model/gambleData'
import { AllInGame } from './AllInGame'
import { MoreLessGame } from './MoreLessGame'
import { RouletteGame } from './RouletteGame'
import './GambleGame.css'

type GambleResult = 'WIN' | 'LOSS'

type GambleGameProps = {
  onResolved: (result: GambleResult) => void
  gambleType?: 'ALL_IN' | 'MORE_LESS' | 'ROULETTE' | null
  payload?: unknown
  onRouletteSpin?: (choice: 'RED' | 'BLACK') => Promise<{
    number: number
    color: 'RED' | 'BLACK' | 'GREEN'
    result: GambleResult
  }>
  onRouletteResolved?: (result: GambleResult) => void
}

export function GambleGame(props: GambleGameProps) {
  const { onResolved, gambleType, payload, onRouletteSpin, onRouletteResolved } = props
  const [type] = useState(() => gambleType ?? randomGambleType())
  if (type === 'MORE_LESS') {
    return (
      <MoreLessGame onResolved={onResolved} initialQuestion={payload as ReturnType<typeof randomMoreLess>} />
    )
  }
  if (type === 'ALL_IN') {
    return <AllInGame onResolved={onResolved} initialQuestion={payload as ReturnType<typeof randomAllIn>} />
  }
  return (
    <RouletteGame onResolved={onResolved} onSpin={onRouletteSpin} onServerResolved={onRouletteResolved} />
  )
}
