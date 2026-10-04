import test from 'node:test'
import assert from 'node:assert/strict'
import { createDuelTransport } from '../src/features/duel-control/model/duelChannel.ts'
import { useDuelStore } from '../src/features/duel-control/model/duelStore.ts'
import type { Duel } from '../src/features/duel-control/api/duelApi.ts'

test('transport works after an effect cleanup and resubscription', async () => {
  const gameId = crypto.randomUUID()
  const receiver = createDuelTransport(gameId)
  const sender = createDuelTransport(gameId)
  const unsubscribe = receiver.subscribe(() => assert.fail('Removed subscription called'))
  unsubscribe()
  receiver.close()
  sender.close()
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No START command after reconnect')), 1500)
      receiver.subscribe((message) => {
        clearTimeout(timeout)
        assert.equal(message.kind, 'COMMAND')
        resolve()
      })
      sender.command('START')
    })
  } finally {
    receiver.close()
    sender.close()
  }
})

test('new and recovered duels both use thirty seconds per team', () => {
  const duel = { status: 'INTRO', attacker: { id: 'a' }, defender: { id: 'b' } } as Duel
  for (const status of ['INTRO', 'ACTIVE'] as const) {
    useDuelStore.getState().setDuel({ ...duel, status })
    assert.equal(useDuelStore.getState().attackerMs, 30000)
    assert.equal(useDuelStore.getState().defenderMs, 30000)
    assert.equal(useDuelStore.getState().phase, status)
    useDuelStore.getState().pass()
    assert.equal(useDuelStore.getState().attackerMs, 27000)
    useDuelStore.getState().reset()
  }
})
