import { teamLabel } from '@/entities/team'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { recentGamesQueryOptions } from '@/entities/game'
import { TeamAvatar } from '@/entities/team'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'
import { HexLogo } from './HexLogo'
import './GameLibrary.css'

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const statusLabels: Record<string, string> = {
  SETUP: 'Konfiguracja',
  ACTIVE: 'W trakcie',
  FINISHED: 'Zakończona',
  ARCHIVED: 'Archiwalna',
}

export function GameLibrary({ onCreateGame }: { onCreateGame: () => void }) {
  const gamesQuery = useQuery(recentGamesQueryOptions())

  return (
    <main className="game-library">
      <HexLogo />
      <section className="game-library__window" aria-labelledby="game-library-title">
        <button className="game-library__create" type="button" onClick={onCreateGame}>
          <span aria-hidden="true">＋</span>
          Nowa gra
        </button>

        <div className="game-library__history">
          <h1 id="game-library-title">Wcześniejsze gry</h1>
          {gamesQuery.isPending && (
            <div className="game-library__state">
              <LoadingSpinner />
              <span>Wczytywanie gier…</span>
            </div>
          )}
          {gamesQuery.isError && (
            <div className="game-library__state" role="alert">
              <span>Nie udało się pobrać zapisanych gier.</span>
              <button type="button" onClick={() => void gamesQuery.refetch()}>
                Spróbuj ponownie
              </button>
            </div>
          )}
          {gamesQuery.data?.length === 0 && (
            <p className="game-library__empty">Nie rozegrano jeszcze żadnej gry.</p>
          )}
          {gamesQuery.data && gamesQuery.data.length > 0 && (
            <div className="game-library__list">
              {gamesQuery.data.map((game) => (
                <Link className="game-library__game" to={`/game/${game.gameId}`} key={game.gameId}>
                  <span className="game-library__teams" aria-hidden="true">
                    {game.teams.map((team) => (
                      <span className="game-library__team" key={`${game.gameId}-${teamLabel(team)}`}>
                        <TeamAvatar slug={team.avatar.replace('game-icons:', '')} color={team.color} />
                      </span>
                    ))}
                  </span>
                  <span className="game-library__details">
                    <strong>{game.teams.map((team) => teamLabel(team)).join(' · ')}</strong>
                    <small>Ostatnia zmiana: {dateFormatter.format(new Date(game.updatedAt))}</small>
                  </span>
                  <span className="game-library__meta">
                    <small>{statusLabels[game.status] ?? game.status}</small>
                    <strong>Runda {game.currentRound}</strong>
                  </span>
                  <span className="game-library__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
