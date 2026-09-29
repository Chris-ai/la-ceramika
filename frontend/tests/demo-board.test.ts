import assert from 'node:assert/strict'
import { test } from 'node:test'
import { advanceDemoGame, createDemoGame, legalDemoTargets } from '../src/widgets/demo-board/lib/demoGame.ts'
import { areAdjacent, hexKey } from '../src/entities/hex/lib/hexGeometry.ts'

test('demo has exactly 36 connected hexes and two distant bases', () => {
  const game = createDemoGame()
  assert.equal(game.hexes.length, 36)
  assert.equal(new Set(game.hexes.map(hexKey)).size, 36)
  const bases = game.hexes.filter((hex) => hex.isBase)
  assert.equal(bases.length, 2)
  assert.deepEqual(bases.map((hex) => hex.owner).sort(), [0, 1])
  assert.ok(!areAdjacent(bases[0], bases[1]))
  const visited = new Set([game.hexes[0]])
  for (const hex of visited)
    for (const neighbor of game.hexes) if (areAdjacent(hex, neighbor)) visited.add(neighbor)
  assert.equal(visited.size, 36)
})

test('simulations alternate legal moves, preserve failed attempts and eventually finish', () => {
  let failures = 0
  let enemyCaptures = 0
  for (let seed = 1; seed <= 100; seed++) {
    let game = createDemoGame(seed)
    while (!game.finished && game.move < 300) {
      const before = game
      const legal = legalDemoTargets(before)
      game = advanceDemoGame(before)
      assert.notEqual(game.turn, before.turn)
      const target = legal.find((hex) => hexKey(hex) === game.feedback?.key)
      assert.ok(target)
      if (!game.feedback?.won) {
        failures++
        assert.equal(game.hexes, before.hexes)
      } else if (target.owner !== null) enemyCaptures++
      assert.equal(game.hexes.length, 36)
      assert.equal(before.move + 1, game.move)
    }
    assert.ok(game.finished, `seed ${seed} did not finish`)
    assert.equal(new Set(game.hexes.filter((hex) => hex.owner !== null).map((hex) => hex.owner)).size, 1)
  }
  assert.ok(failures > 0)
  assert.ok(enemyCaptures > 0)
})
