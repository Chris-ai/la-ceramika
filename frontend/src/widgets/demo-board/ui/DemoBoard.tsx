import { HEX_RADIUS, hexCenter, hexKey } from '@/entities/hex'
import { createDemoGame } from '../lib/demoGame'
import { useDemoGame } from '../model/useDemoGame'
import { DemoHex } from './DemoHex'
import './DemoBoard.css'

const centers = createDemoGame().hexes.map((hex) => hexCenter(hex.q, hex.r))
const left = Math.min(...centers.map((point) => point.x)) - HEX_RADIUS - 12
const top = Math.min(...centers.map((point) => point.y)) - HEX_RADIUS - 18
const width = Math.max(...centers.map((point) => point.x)) - left + HEX_RADIUS + 12
const height = Math.max(...centers.map((point) => point.y)) - top + HEX_RADIUS + 30

export function DemoBoard() {
  const { game, fading } = useDemoGame()
  return (
    <div className={`demo-board ${fading ? 'demo-board--fading' : ''}`} aria-hidden="true">
      <svg viewBox={`${left} ${top} ${width} ${height}`} focusable="false">
        {game.hexes.map((hex) => (
          <DemoHex
            key={hexKey(hex)}
            hex={hex}
            feedback={game.feedback?.key === hexKey(hex) ? game.feedback : null}
          />
        ))}
      </svg>
    </div>
  )
}
