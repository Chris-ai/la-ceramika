import type { Game } from '../../../entities/game/model/types.ts'
import type { ValidatedGameSetup } from './gameSetupSchema.ts'
import { toGameSetupPayload } from './gameSetupSchema.ts'

type Coordinate = { q: number; r: number }
const directions: Coordinate[] = [
  { q: 1, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 1 },
]
const key = ({ q, r }: Coordinate) => `${q},${r}`
const neighbors = ({ q, r }: Coordinate) =>
  directions.map((direction) => ({
    q: q + direction.q,
    r: r + direction.r,
  }))
const radialDistance = ({ q, r }: Coordinate) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))

function shuffled<T>(values: T[]): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

// Dobieramy heksy wyłącznie z krawędzi już połączonej mapy.
// Siatka techniczna jest większa niż plansza i nie pojawia się w widoku.
function generateConnectedHexes(count: number): Coordinate[] {
  const motherGrid = new Set<string>()
  for (let q = -7; q <= 7; q++) {
    for (let r = -7; r <= 7; r++) {
      if (radialDistance({ q, r }) <= 7) motherGrid.add(key({ q, r }))
    }
  }
  const result: Coordinate[] = [{ q: 0, r: 0 }]
  const occupied = new Set([key(result[0])])
  while (result.length < count) {
    const frontier = new Map<string, Coordinate>()
    result.forEach((hex) =>
      neighbors(hex).forEach((candidate) => {
        const candidateKey = key(candidate)
        if (motherGrid.has(candidateKey) && !occupied.has(candidateKey)) frontier.set(candidateKey, candidate)
      }),
    )
    const candidates = [...frontier.values()]
    const weights = candidates.map((candidate) => {
      const joinedEdges = neighbors(candidate).filter((other) => occupied.has(key(other))).length
      return ((0.7 + joinedEdges * 0.5) * (1 + Math.random() * 1.8)) / (1 + radialDistance(candidate) * 0.15)
    })
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let pick = Math.random() * total
    let selected = candidates[candidates.length - 1]
    for (let index = 0; index < candidates.length; index++) {
      pick -= weights[index]
      if (pick <= 0) {
        selected = candidates[index]
        break
      }
    }
    result.push(selected)
    occupied.add(key(selected))
  }
  return result
}

function shortestPaths(start: Coordinate, map: Set<string>): Map<string, number> {
  const distances = new Map([[key(start), 0]])
  const queue = [start]
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]
    const distance = distances.get(key(current))!
    neighbors(current).forEach((next) => {
      const nextKey = key(next)
      if (map.has(nextKey) && !distances.has(nextKey)) {
        distances.set(nextKey, distance + 1)
        queue.push(next)
      }
    })
  }
  return distances
}

function chooseBases(hexes: Coordinate[], teamCount: number): Coordinate[] {
  const map = new Set(hexes.map(key))
  const distances = new Map(hexes.map((hex) => [key(hex), shortestPaths(hex, map)]))
  let best: Coordinate[] = []
  let bestScore = -Infinity
  for (let attempt = 0; attempt < 280; attempt++) {
    const candidates = shuffled(hexes)
    const selected: Coordinate[] = [candidates[0]]
    while (selected.length < teamCount) {
      const available = candidates.filter(
        (candidate) => !selected.some((base) => distances.get(key(base))!.get(key(candidate))! < 2),
      )
      if (available.length === 0) break
      const scores = available.map(
        (candidate) =>
          Math.min(...selected.map((base) => distances.get(key(base))!.get(key(candidate))!)) +
          Math.random() * 1.4,
      )
      selected.push(available[scores.indexOf(Math.max(...scores))])
    }
    if (selected.length !== teamCount) continue
    const pairDistances = selected.flatMap((base, index) =>
      selected.slice(index + 1).map((other) => distances.get(key(base))!.get(key(other))!),
    )
    const minDistance = Math.min(...pairDistances)
    const averageDistance = pairDistances.reduce((sum, distance) => sum + distance, 0) / pairDistances.length
    const distanceSpread =
      pairDistances.reduce((sum, distance) => sum + Math.abs(distance - averageDistance), 0) /
      pairDistances.length
    const room = selected.map(() => 0)
    hexes.forEach((hex) => {
      const fromBases = selected.map((base) => distances.get(key(base))!.get(key(hex))!)
      const nearest = Math.min(...fromBases)
      const owners = fromBases
        .map((distance, index) => (distance === nearest ? index : -1))
        .filter((index) => index >= 0)
      owners.forEach((index) => {
        room[index] += 1 / owners.length
      })
    })
    const averageRoom = hexes.length / teamCount
    const roomSpread = room.reduce((sum, value) => sum + Math.abs(value - averageRoom), 0) / teamCount
    const immediateRoom = selected.map(
      (base) => neighbors(base).filter((neighbor) => map.has(key(neighbor))).length,
    )
    const score =
      minDistance * 2.5 -
      distanceSpread -
      roomSpread * 0.4 +
      Math.min(...immediateRoom) * 0.5 +
      Math.random() * 0.1
    if (score > bestScore) {
      best = selected
      bestScore = score
    }
  }
  if (best.length !== teamCount) throw new Error('Nie udało się rozmieścić drużyn na mapie.')
  return shuffled(best)
}

export function generateMapPreview(configuration: ValidatedGameSetup): Game {
  const payload = toGameSetupPayload(configuration)
  const coordinates = generateConnectedHexes(payload.hexCount)
  const bases = chooseBases(coordinates, configuration.teams.length)
  const baseOwners = new Map(bases.map((base, index) => [key(base), index]))
  const turnOrder = shuffled(configuration.teams.map((_, index) => index))
  return {
    hexCount: payload.hexCount,
    teams: configuration.teams.map((team, index) => ({
      ...team,
      turnOrder: turnOrder.indexOf(index) + 1,
    })),
    hexes: coordinates.map((hex) => ({
      ...hex,
      ownerTeamIndex: baseOwners.get(key(hex)) ?? null,
      isBase: baseOwners.has(key(hex)),
    })),
  }
}
