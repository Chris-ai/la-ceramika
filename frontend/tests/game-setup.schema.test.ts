import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  animalIcons,
  gameSetupSchema,
  teamColors,
  toGameSetupPayload,
} from '../src/features/create-game/model/gameSetupSchema.ts'

const valid = {
  teams: [
    { name: ' Sowy ', color: teamColors[0].value, avatar: animalIcons[0].id },
    { name: 'Misie', color: teamColors[1].value, avatar: animalIcons[1].id },
  ],
  mapPreset: 'M',
  winCondition: 'ELIMINATION',
  roundLimit: '',
  streakToBonus: '3',
  resurrectionEnabled: true,
}

test('wymaga nazw obu drużyn oraz dodatniej liczby kroków serii', () => {
  const result = gameSetupSchema.safeParse({
    ...valid,
    teams: [{ ...valid.teams[0], name: '   ' }, valid.teams[1]],
    streakToBonus: '',
  })
  assert.equal(result.success, false)
  if (!result.success) {
    assert.deepEqual(result.error.issues.map((issue) => issue.path.join('.')).sort(), [
      'streakToBonus',
      'teams.0.name',
    ])
  }
})

test('limit rund jest wymagany tylko przy warunku rundowym', () => {
  assert.equal(gameSetupSchema.safeParse(valid).success, true)
  const result = gameSetupSchema.safeParse({ ...valid, winCondition: 'ROUND_LIMIT' })
  assert.equal(result.success, false)
  if (!result.success) assert.deepEqual(result.error.issues[0].path, ['roundLimit'])
  assert.equal(
    gameSetupSchema.safeParse({ ...valid, winCondition: 'ROUND_LIMIT', roundLimit: '5' }).success,
    true,
  )
})

test('nie dopuszcza tej samej ikony lub koloru w dwóch drużynach', () => {
  const result = gameSetupSchema.safeParse({
    ...valid,
    teams: [valid.teams[0], { ...valid.teams[1], color: teamColors[0].value, avatar: animalIcons[0].id }],
  })
  assert.equal(result.success, false)
  if (!result.success) {
    assert.deepEqual(result.error.issues.map((issue) => issue.path.join('.')).sort(), [
      'teams.1.avatar',
      'teams.1.color',
    ])
  }
})

test('submit normalizuje nazwy i liczby, a eliminacja nie ma limitu rund', () => {
  const parsed = gameSetupSchema.parse(valid)
  const payload = toGameSetupPayload(parsed)
  assert.equal(payload.teams[0].name, 'Sowy')
  assert.equal(payload.hexCount, 20)
  assert.equal(payload.streakToBonus, 3)
  assert.equal(payload.roundLimit, null)
})
