import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  teamIcons,
  gameSetupSchema,
  teamColors,
  toGameSetupPayload,
} from '../src/features/create-game/model/gameSetupSchema.ts'

const valid = {
  teams: [
    { color: teamColors[0].value, avatar: teamIcons[0].id },
    { color: teamColors[1].value, avatar: teamIcons[1].id },
  ],
  mapPreset: 'M',
  winCondition: 'ELIMINATION',
  roundLimit: '',
  streakToBonus: '3',
  resurrectionEnabled: true,
}

test('wymaga dodatniej liczby kroków serii', () => {
  const result = gameSetupSchema.safeParse({
    ...valid,
    streakToBonus: '',
  })
  assert.equal(result.success, false)
  if (!result.success) {
    assert.deepEqual(result.error.issues.map((issue) => issue.path.join('.')).sort(), ['streakToBonus'])
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
    teams: [valid.teams[0], { ...valid.teams[1], color: teamColors[0].value, avatar: teamIcons[0].id }],
  })
  assert.equal(result.success, false)
  if (!result.success) {
    assert.deepEqual(result.error.issues.map((issue) => issue.path.join('.')).sort(), [
      'teams.1.avatar',
      'teams.1.color',
    ])
  }
})

test('submit automatycznie nadaje nazwy i normalizuje liczby, a eliminacja nie ma limitu rund', () => {
  const parsed = gameSetupSchema.parse(valid)
  const payload = toGameSetupPayload(parsed)
  assert.equal('name' in parsed.teams[0], false)
  assert.deepEqual(
    payload.teams.map((team) => team.name),
    ['Drużyna 1', 'Drużyna 2'],
  )
  assert.equal(payload.hexCount, 20)
  assert.equal(payload.streakToBonus, 3)
  assert.equal(payload.roundLimit, null)
})

test('każda z 16 ikon jest dostępna bez nazwy drużyny', () => {
  assert.equal(teamIcons.length, 16)
  for (const icon of teamIcons) {
    const other = teamIcons.find((candidate) => candidate.id !== icon.id)!
    assert.equal(
      gameSetupSchema.safeParse({
        ...valid,
        teams: [
          { color: teamColors[0].value, avatar: icon.id },
          { color: teamColors[1].value, avatar: other.id },
        ],
      }).success,
      true,
    )
  }
})
