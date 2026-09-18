import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  animalIcons,
  gameSetupSchema,
  mapSizes,
  teamColors,
} from '../src/features/create-game/model/gameSetupSchema.ts'
import { generateMapPreview } from '../src/features/create-game/model/mapPreviewGenerator.ts'

const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
]
const key = (q: number, r: number) => `${q},${r}`

test('wszystkie rozmiary tworzą dokładną, spójną mapę i rozdzielone BASE', () => {
  for (let teamCount = 2; teamCount <= 6; teamCount++) {
    for (const preset of ['S', 'M', 'XL', 'XXL'] as const) {
      const configuration = gameSetupSchema.parse({
        teams: Array.from({ length: teamCount }, (_, index) => ({
          name: `Drużyna ${index + 1}`,
          color: teamColors[index].value,
          avatar: animalIcons[index].id,
        })),
        mapPreset: preset,
        winCondition: 'ELIMINATION',
        roundLimit: '',
        streakToBonus: '3',
        resurrectionEnabled: true,
      })
      const map = generateMapPreview(configuration)
      assert.equal(map.hexes.length, mapSizes(teamCount)[preset])
      assert.equal(new Set(map.hexes.map((hex) => key(hex.q, hex.r))).size, map.hexes.length)
      const all = new Set(map.hexes.map((hex) => key(hex.q, hex.r)))
      const visited = new Set([key(map.hexes[0].q, map.hexes[0].r)])
      const queue = [map.hexes[0]]
      for (let index = 0; index < queue.length; index++) {
        const hex = queue[index]
        for (const [dq, dr] of directions) {
          const adjacent = key(hex.q + dq, hex.r + dr)
          if (all.has(adjacent) && !visited.has(adjacent)) {
            visited.add(adjacent)
            queue.push(map.hexes.find((candidate) => key(candidate.q, candidate.r) === adjacent)!)
          }
        }
      }
      assert.equal(visited.size, map.hexes.length)
      const bases = map.hexes.filter((hex) => hex.isBase)
      assert.equal(bases.length, teamCount)
      assert.deepEqual(
        bases.map((hex) => hex.ownerTeamIndex).sort(),
        Array.from({ length: teamCount }, (_, index) => index),
      )
      assert.equal(map.hexes.filter((hex) => !hex.isBase && hex.ownerTeamIndex !== null).length, 0)
      for (const base of bases) {
        for (const [dq, dr] of directions) {
          assert.equal(
            bases.some((other) => other !== base && other.q === base.q + dq && other.r === base.r + dr),
            false,
          )
        }
      }
      assert.deepEqual(
        map.teams.map((team) => team.turnOrder).sort(),
        Array.from({ length: teamCount }, (_, index) => index + 1),
      )
    }
  }
})
