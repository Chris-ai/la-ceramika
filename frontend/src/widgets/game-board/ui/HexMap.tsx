import { teamLabel } from '@/entities/team'
import { teamIcons } from '@/entities/team'
import type { Game, Hex } from '@/entities/game'
import {
  areAdjacent,
  HEX_RADIUS,
  hexCenter,
  hexDepth,
  hexKey,
  hexVertices,
  polygonPoints,
  shadeColor,
} from '@/entities/hex'

type HexMapProps = {
  game: Game
  activeTeamIndex: number
  actionCount: number
  selectedHex: string | null
  isEntering: boolean
  onSelect: (hex: Hex, mode: 'NEUTRAL' | 'DUEL' | null) => void
}

export function HexMap({
  game,
  activeTeamIndex,
  actionCount,
  selectedHex,
  isEntering,
  onSelect,
}: HexMapProps) {
  const activeTeam = game.teams[activeTeamIndex]
  const activeTerritory = game.hexes.filter((hex) => hex.ownerTeamIndex === activeTeamIndex)
  const canReach = (hex: Hex) => actionCount > 0 && activeTerritory.some((owned) => areAdjacent(owned, hex))
  const centers = game.hexes.map((hex) => hexCenter(hex.q, hex.r))
  const bounds = {
    left: Math.min(...centers.map((point) => point.x)) - HEX_RADIUS - 28,
    right: Math.max(...centers.map((point) => point.x)) + HEX_RADIUS + 28,
    top: Math.min(...centers.map((point) => point.y)) - HEX_RADIUS - 34,
    bottom: Math.max(...centers.map((point) => point.y)) + HEX_RADIUS + 48,
  }
  const orderedHexes = [...game.hexes].sort(
    (first, second) => hexCenter(first.q, first.r).y - hexCenter(second.q, second.r).y,
  )

  return (
    <div
      className="board-map"
      aria-label={`Spójna mapa z ${game.hexCount} heksami i bazami ${game.teams.map((team) => teamLabel(team)).join(', ')}`}
    >
      <svg
        viewBox={`${bounds.left} ${bounds.top} ${bounds.right - bounds.left} ${bounds.bottom - bounds.top}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {orderedHexes.map((hex) => {
          const { x, y } = hexCenter(hex.q, hex.r)
          const team = hex.ownerTeamIndex === null ? null : game.teams[hex.ownerTeamIndex]
          const icon = team ? teamIcons.find((animal) => animal.id === team.avatar) : null
          const key = hexKey(hex)
          const isActiveBase = hex.isBase && hex.ownerTeamIndex === activeTeamIndex
          const isReachable = hex.status !== 'DESTROYED' && canReach(hex)
          const canAttack = isReachable && team === null
          const canDuel = isReachable && team !== null && hex.ownerTeamIndex !== activeTeamIndex
          const mode = canAttack ? 'NEUTRAL' : canDuel ? 'DUEL' : null
          const topColor =
            hex.status === 'DESTROYED'
              ? '#a9a19b'
              : (team?.color ?? (canAttack ? activeTeam.color : '#e4e3e0'))
          const corners = hexVertices(x, y)
          const height = hexDepth(hex.q, hex.r)
          const label = team
            ? `Baza drużyny ${teamLabel(team)}`
            : canAttack
              ? 'Sąsiedni neutralny heks'
              : 'Neutralny heks'
          const select = () => onSelect(hex, mode)
          return (
            <g
              key={key}
              style={
                isEntering
                  ? {
                      animationDelay: `${80 + (Math.abs(hex.q * 83 + hex.r * 47) % 780)}ms`,
                      animationDuration: `${520 + (Math.abs(hex.q * 31 - hex.r * 61) % 360)}ms`,
                    }
                  : undefined
              }
              className={`board-tile ${hex.status === 'DESTROYED' ? 'board-tile--destroyed' : ''} ${isEntering ? 'board-tile--enter' : ''} ${isActiveBase ? 'board-tile--active' : ''} ${mode ? 'board-tile--available' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={select}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  select()
                }
              }}
            >
              {isActiveBase && (
                <polygon
                  className="board-active-glow"
                  points={polygonPoints(corners)}
                  style={{ fill: activeTeam.color, stroke: activeTeam.color }}
                />
              )}
              <polygon
                className="board-hex-side"
                points={polygonPoints([
                  corners[3],
                  corners[4],
                  { x: corners[4].x, y: corners[4].y + height },
                  { x: corners[3].x, y: corners[3].y + height },
                ])}
                fill={shadeColor(topColor, 0.73)}
                fillOpacity={canAttack ? 0.5 : 1}
              />
              <polygon
                className="board-hex-side"
                points={polygonPoints([
                  corners[2],
                  corners[3],
                  { x: corners[3].x, y: corners[3].y + height },
                  { x: corners[2].x, y: corners[2].y + height },
                ])}
                fill={shadeColor(topColor, 0.83)}
                fillOpacity={canAttack ? 0.5 : 1}
              />
              <polygon
                className={`board-hex ${canAttack ? 'board-hex--attackable' : ''} ${selectedHex === key ? 'board-hex--selected' : ''}`}
                points={polygonPoints(corners)}
                fill={topColor}
                fillOpacity={canAttack ? 0.5 : 1}
              />
              {team && icon && hex.isBase && (
                <foreignObject x={x - 19} y={y - 19} width="38" height="38">
                  <span
                    className="board-animal"
                    style={{ backgroundColor: '#35251f', maskImage: `url('/team-icons/${icon.slug}.svg')` }}
                  />
                </foreignObject>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
