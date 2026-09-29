import type { CSSProperties } from 'react'
import './HexLogo.css'

const colors = ['#ffd563', '#ef77c9', '#68d6c7', '#91aeee', '#f28b67', '#9bc96b']
const radius = 12
const hexes = Array.from({ length: 8 }, (_, row) =>
  Array.from({ length: 39 }, (_, column) => {
    const x = 16 + column * radius * 1.72 + (row % 2 ? radius * 0.86 : 0)
    const y = 14 + row * radius * 1.5
    const points = Array.from({ length: 6 }, (__, index) => {
      const angle = (Math.PI / 180) * (60 * index - 30)
      return `${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`
    }).join(' ')
    return { x, y, points, color: colors[(row * 3 + column * 5) % colors.length] }
  }),
).flat()

export function HexLogo() {
  return (
    <div className="hex-logo" aria-label="La Ceramika">
      <svg viewBox="0 0 830 160" role="img" aria-hidden="true">
        <defs>
          <clipPath id="hex-logo-text">
            <text x="415" y="116" textAnchor="middle" className="hex-logo__mask-text">
              La Ceramika
            </text>
          </clipPath>
        </defs>
        <g clipPath="url(#hex-logo-text)">
          {hexes.map((hex, index) => (
            <polygon
              key={`${hex.x}-${hex.y}`}
              points={hex.points}
              fill={hex.color}
              className="hex-logo__tile"
              style={{ '--hex-delay': `${(index % 31) * 22}ms` } as CSSProperties}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
