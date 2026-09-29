import './MapLoading.css'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

export function MapLoading() {
  return (
    <main className="map-loading" role="status" aria-label="Generowanie mapy">
      <div className="map-loading-content">
        <LoadingSpinner className="map-loading-spinner" />
      </div>
    </main>
  )
}
