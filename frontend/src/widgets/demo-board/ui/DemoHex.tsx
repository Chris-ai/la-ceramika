import { hexCenter, hexDepth, hexVertices, polygonPoints, shadeColor } from '@/entities/hex'
import { teamIcons, teamColors } from '@/entities/team'
import type { DemoGame, DemoHexState } from '../lib/demoGame'
import './DemoHex.css'

export function DemoHex({ hex, feedback }: { hex: DemoHexState; feedback: DemoGame['feedback'] }) {
  const { x, y } = hexCenter(hex.q, hex.r)
  const corners = hexVertices(x, y)
  const depth = hexDepth(hex.q, hex.r)
  const color = hex.owner === null ? '#e4e3e0' : teamColors[hex.owner].value
  const points = polygonPoints(corners)
  const source = feedback ? hexCenter(feedback.from.q, feedback.from.r) : { x, y }
  const edgeCenters = corners.map((corner, index) => {
    const next = corners[(index + 1) % corners.length]
    return { x: (corner.x + next.x) / 2, y: (corner.y + next.y) / 2 }
  })
  const origin = edgeCenters.reduce((nearest, edge) =>
    Math.hypot(edge.x - source.x, edge.y - source.y) < Math.hypot(nearest.x - source.x, nearest.y - source.y)
      ? edge
      : nearest,
  )
  const previousColor = feedback?.previousOwner == null ? '#e4e3e0' : teamColors[feedback.previousOwner].value
  return (
    <g className={`demo-hex ${feedback && !feedback.won ? 'demo-hex--loss' : ''}`}>
      {[
        { first: 3, second: 4, shade: 0.73 },
        { first: 2, second: 3, shade: 0.83 },
      ].map(({ first, second, shade }) => (
        <polygon
          key={first}
          className="demo-hex__side"
          fill={shadeColor(color, shade)}
          points={polygonPoints([
            corners[first],
            corners[second],
            { x: corners[second].x, y: corners[second].y + depth },
            { x: corners[first].x, y: corners[first].y + depth },
          ])}
        />
      ))}
      <polygon className="demo-hex__top" points={polygonPoints(corners)} fill={color} />
      {feedback?.won && (
        <g key={feedback.move} className="demo-hex__capture">
          <polygon points={points} fill={previousColor} />
          <polygon
            className="demo-hex__capture-fill"
            points={points}
            fill={color}
            style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
          />
          <polygon className="demo-hex__outline" points={points} fill="none" />
        </g>
      )}
      {hex.isBase && hex.owner !== null && (
        <image
          href={`/team-icons/${teamIcons[hex.owner].slug}.svg`}
          x={x - 17}
          y={y - 17}
          width="34"
          height="34"
        />
      )}
    </g>
  )
}
