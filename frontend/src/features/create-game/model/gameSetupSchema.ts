import { z } from 'zod'
import { teamIcons, teamColors } from '../../../entities/team/config/teamOptions.ts'

export { teamIcons, teamColors }

export type MapPreset = 'S' | 'M' | 'XL' | 'XXL'

export function mapSizes(teamCount: number): Record<MapPreset, number> {
  const minimum = teamCount * 6
  const maximum = teamCount <= 3 ? 36 : 42
  const range = maximum - minimum
  return {
    S: minimum,
    M: minimum + Math.round(range / 3),
    XL: minimum + Math.round((range * 2) / 3),
    XXL: maximum,
  }
}

const positiveInteger = (value: string) =>
  /^[1-9]\d*$/.test(value.trim()) && Number.isSafeInteger(Number(value.trim()))

export const gameSetupSchema = z
  .object({
    teams: z
      .array(
        z.object({
          color: z
            .string()
            .refine((value) => teamColors.some((color) => color.value === value), 'Wybierz kolor drużyny.'),
          avatar: z
            .string()
            .refine((value) => teamIcons.some((icon) => icon.id === value), 'Wybierz ikonę drużyny.'),
        }),
      )
      .min(2, 'Dodaj przynajmniej 2 drużyny.')
      .max(6, 'Możesz dodać maksymalnie 6 drużyn.'),
    mapPreset: z.enum(['S', 'M', 'XL', 'XXL']),
    winCondition: z.enum(['ELIMINATION', 'ROUND_LIMIT']),
    roundLimit: z.string(),
    streakToBonus: z.string().refine(positiveInteger, 'Podaj dodatnią liczbę kroków.'),
    resurrectionEnabled: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.winCondition === 'ROUND_LIMIT' && !positiveInteger(values.roundLimit)) {
      context.addIssue({
        code: 'custom',
        path: ['roundLimit'],
        message: 'Podaj dodatnią liczbę pełnych rund.',
      })
    }
    values.teams.forEach((team, index) => {
      if (values.teams.findIndex((other) => other.color === team.color) !== index) {
        context.addIssue({
          code: 'custom',
          path: ['teams', index, 'color'],
          message: 'Ten kolor jest już wybrany.',
        })
      }
      if (values.teams.findIndex((other) => other.avatar === team.avatar) !== index) {
        context.addIssue({
          code: 'custom',
          path: ['teams', index, 'avatar'],
          message: 'Ta ikona jest już wybrana.',
        })
      }
    })
  })

export type GameSetupFormValues = z.input<typeof gameSetupSchema>
export type ValidatedGameSetup = z.output<typeof gameSetupSchema>

export function toGameSetupPayload(values: ValidatedGameSetup) {
  return {
    teams: values.teams.map((team, index) => ({ ...team, name: `Drużyna ${index + 1}` })),
    hexCount: mapSizes(values.teams.length)[values.mapPreset],
    winCondition: values.winCondition,
    roundLimit: values.winCondition === 'ROUND_LIMIT' ? Number(values.roundLimit.trim()) : null,
    streakToBonus: Number(values.streakToBonus.trim()),
    resurrectionEnabled: values.resurrectionEnabled,
  }
}
