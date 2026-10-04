import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { activeGameQueryOptions } from '@/entities/game'
import { Button } from '@/shared/ui/button'
import './StartMenu.css'

export function StartMenu() {
  const active = useQuery(activeGameQueryOptions())
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  async function startNew() {
    setChecking(true)
    try {
      const result = await active.refetch()
      if (result.isError) return
      const game = result.data
      if (game && !window.confirm('Rozpoczęcie nowej gry zarchiwizuje obecną partię. Kontynuować?')) return
      navigate('/setup', { state: { confirmedGameId: game?.gameId ?? null } })
    } finally {
      setChecking(false)
    }
  }
  return (
    <nav className="start-menu" aria-label="Menu główne">
      <Button
        variant="primary"
        className="start-menu__item"
        onClick={() => void startNew()}
        disabled={checking || active.isPending}
      >
        <span>NOWA GRA</span>
        <span className="start-menu__symbol" aria-hidden="true">
          +
        </span>
      </Button>
      {active.data ? (
        <Link className="button button--default start-menu__item" to={`/game/${active.data.gameId}`}>
          <span>KONTYNUUJ</span>
          <span className="start-menu__symbol" aria-hidden="true">
            →
          </span>
        </Link>
      ) : (
        <Button
          className="start-menu__item start-menu__item--unavailable"
          disabled
          title={
            active.isPending
              ? 'Sprawdzanie aktywnej gry…'
              : active.isError
                ? 'Nie udało się sprawdzić aktywnej gry.'
                : 'Brak aktywnej gry do wznowienia.'
          }
        >
          <span>KONTYNUUJ</span>
          <span className="start-menu__symbol" aria-hidden="true">
            →
          </span>
        </Button>
      )}
      {active.isPending && (
        <span className="start-menu__status" role="status">
          Sprawdzanie aktywnej gry…
        </span>
      )}
      {active.isError && (
        <div className="start-menu__status" role="alert">
          Nie udało się sprawdzić aktywnej gry.
          <Button variant="text" onClick={() => void active.refetch()}>
            Spróbuj ponownie
          </Button>
        </div>
      )}
    </nav>
  )
}
