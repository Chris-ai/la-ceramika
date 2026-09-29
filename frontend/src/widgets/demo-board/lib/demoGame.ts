import { areAdjacent, hexCenter, hexKey, type HexCoordinate } from '../../../entities/hex/index.ts'

export type DemoTeam = 0 | 1
export type DemoHexState = { q: number; r: number; owner: DemoTeam | null; isBase: boolean }
export type DemoGame = {
  hexes: DemoHexState[]
  turn: DemoTeam
  champion: DemoTeam
  move: number
  seed: number
  feedback: {
    key: string
    won: boolean
    from: HexCoordinate
    previousOwner: DemoTeam | null
    move: number
  } | null
  finished: boolean
}

// A deliberately composed, connected 36-tile silhouette; no game generation or content APIs.
const rows = [
  [-3, 0, 4],
  [-2, -1, 5],
  [-1, -2, 6],
  [0, -3, 7],
  [1, -3, 6],
  [2, -3, 5],
  [3, -2, 3],
]
export function createDemoGame(seed = 1): DemoGame {
  const hexes: DemoHexState[] = rows.flatMap(([r, start, count]) =>
    Array.from({ length: count }, (_, index) => ({ q: start + index, r, owner: null, isBase: false })),
  )
  const edges = [...hexes].sort((a, b) => hexCenter(a.q, a.r).x - hexCenter(b.q, b.r).x)
  edges[0].owner = 0
  edges[0].isBase = true
  edges[edges.length - 1].owner = 1
  edges[edges.length - 1].isBase = true
  return { hexes, turn: 0, champion: seed % 2 === 0 ? 0 : 1, move: 0, seed, feedback: null, finished: false }
}

export function legalDemoTargets(game: DemoGame) {
  const territory = game.hexes.filter((hex) => hex.owner === game.turn)
  return game.hexes.filter(
    (hex) => hex.owner !== game.turn && territory.some((owned) => areAdjacent(owned, hex)),
  )
}

export function advanceDemoGame(game: DemoGame): DemoGame {
  if (game.finished) return game
  let seed = game.seed
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const legal = legalDemoTargets(game)
  const neutral = legal.filter((hex) => hex.owner === null)
  let candidates = neutral.length && (game.move < 28 || random() < 0.65) ? neutral : legal
  const enemyBase = game.hexes.find((hex) => hex.isBase && hex.owner !== game.turn)
  // After expansion, guide one side toward the opposing BASE so the decoration resolves.
  if (game.move > 55 && game.turn === game.champion && enemyBase) {
    const distance = (hex: DemoHexState) =>
      Math.max(
        Math.abs(hex.q - enemyBase.q),
        Math.abs(hex.r - enemyBase.r),
        Math.abs(hex.q + hex.r - enemyBase.q - enemyBase.r),
      )
    const nearest = Math.min(...legal.map(distance))
    candidates = legal.filter((hex) => distance(hex) === nearest)
  }
  const target = candidates[Math.floor(random() * candidates.length)]
  if (!target) return { ...game, finished: true }
  const source = game.hexes.find((hex) => hex.owner === game.turn && areAdjacent(hex, target))!
  const won = game.move > 90 ? game.turn === game.champion : random() < 0.84
  const capturedBase = won && target.isBase
  const hexes = won
    ? game.hexes.map((hex) => {
        const captured = hex === target || (capturedBase && hex.owner === target.owner)
        return captured ? { ...hex, owner: game.turn, isBase: false } : hex
      })
    : game.hexes
  return {
    ...game,
    hexes,
    seed,
    turn: game.turn === 0 ? 1 : 0,
    move: game.move + 1,
    feedback: {
      key: hexKey(target),
      won,
      from: { q: source.q, r: source.r },
      previousOwner: target.owner,
      move: game.move + 1,
    },
    finished: capturedBase,
  }
}
