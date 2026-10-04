import test from 'node:test'
import assert from 'node:assert/strict'
import { matchRushAnswer, normalizeRushAnswer } from '../src/features/play-challenge/model/rushMatching.ts'

test('spacing, case, Polish diacritics and hyphens are typography', () => {
  for (const [input, answer] of [
    ['redbull', 'Red Bull'],
    ['SKLODOWSKA CURIE', 'Skłodowska-Curie'],
    ['McDonalds', 'McDonald’s'],
  ]) {
    assert.equal(normalizeRushAnswer(input), normalizeRushAnswer(answer))
  }
})

test('explicit aliases resolve to one canonical answer', () => {
  const answer = { answer: 'Maria Skłodowska-Curie', aliases: ['Curie', 'Marie Curie'] }
  assert.equal(matchRushAnswer('curie', [answer]), answer)
  assert.equal(matchRushAnswer('Marie Curie', [answer]), answer)
  assert.equal(matchRushAnswer('Maria', [answer]), undefined)
  assert.equal(matchRushAnswer('Curry', [answer]), undefined)
})

test('empty and ambiguous aliases do not count', () => {
  assert.equal(matchRushAnswer(' - ', [{ answer: '', aliases: [] }]), undefined)
  assert.equal(
    matchRushAnswer('Curie', [
      { answer: 'Maria', aliases: ['Curie'] },
      { answer: 'Pierre', aliases: ['Curie'] },
    ]),
    undefined,
  )
})
