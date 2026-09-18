import './MapLoading.css'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

const loadingHexes = [
  [0, -2],
  [1, -2],
  [2, -2],
  [-1, -1],
  [0, -1],
  [1, -1],
  [2, -1],
  [-2, 0],
  [-1, 0],
  [0, 0],
  [1, 0],
  [2, 0],
  [-2, 1],
  [-1, 1],
  [0, 1],
  [1, 1],
  [-2, 2],
  [-1, 2],
  [0, 2],
]

export function MapLoading() {
  return (
    <main className="map-loading" role="status" aria-label="Generowanie mapy">
      <div className="map-loading-content">
        <svg viewBox="-190 -150 380 300" aria-hidden="true">
          {loadingHexes.map(([q, r], index) => {
            const x = 52 * (q + r / 2)
            const y = 45 * r
            return (
              <polygon
                key={`${q},${r}`}
                className="map-loading-hex"
                style={{
                  animationDelay: `${(index % 7) * 90}ms`,
                  animationDuration: `${760 + (index % 5) * 85}ms`,
                }}
                points={`${x},${y - 29} ${x + 25},${y - 14} ${x + 25},${y + 14} ${x},${y + 29} ${x - 25},${y + 14} ${x - 25},${y - 14}`}
              />
            )
          })}
        </svg>
        <LoadingSpinner className="map-loading-spinner" />
      </div>
    </main>
  )
}
