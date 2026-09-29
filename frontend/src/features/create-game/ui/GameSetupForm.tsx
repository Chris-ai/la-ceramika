import { useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  teamIcons,
  gameSetupSchema,
  mapSizes,
  teamColors,
  toGameSetupPayload,
  type GameSetupFormValues,
  type ValidatedGameSetup,
} from '../model/gameSetupSchema'
import { Button } from '@/shared/ui/button'
import { useSetupHeight } from '../model/useSetupHeight'
import { TeamFields } from './TeamFields'
import './GameSetupForm.css'

type GameSetupFormProps = {
  onSubmit: (payload: ReturnType<typeof toGameSetupPayload>) => Promise<void>
  onCancel?: () => void
}

export function GameSetupForm({ onSubmit, onCancel }: GameSetupFormProps) {
  const { frameRef, contentRef } = useSetupHeight()
  const [submitted, setSubmitted] = useState<ReturnType<typeof toGameSetupPayload> | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GameSetupFormValues, unknown, ValidatedGameSetup>({
    resolver: zodResolver(gameSetupSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      teams: [
        { color: teamColors[0].value, avatar: teamIcons[0].id },
        { color: teamColors[1].value, avatar: teamIcons[1].id },
      ],
      mapPreset: 'M',
      winCondition: 'ELIMINATION',
      roundLimit: '',
      streakToBonus: '3',
      resurrectionEnabled: true,
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'teams' })
  const teams = useWatch({ control, name: 'teams' }) ?? []
  const mapPreset = useWatch({ control, name: 'mapPreset' }) ?? 'M'
  const winCondition = useWatch({ control, name: 'winCondition' }) ?? 'ELIMINATION'
  const sizes = mapSizes(teams.length)

  function addTeam() {
    if (teams.length >= 6) return
    const color = teamColors.find((option) => !teams.some((team) => team.color === option.value))
    const icon = teamIcons.find((option) => !teams.some((team) => team.avatar === option.id))
    if (!color || !icon) return
    append({ color: color.value, avatar: icon.id })
    setSubmitted(null)
  }

  function removeTeam(index: number) {
    if (teams.length <= 2) return
    remove(index)
    setSubmitted(null)
  }

  async function onValidSubmit(values: ValidatedGameSetup) {
    const payload = toGameSetupPayload(values)
    setStartError(null)
    try {
      await onSubmit(payload)
      setSubmitted(payload)
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Nie udało się utworzyć gry.')
    }
  }

  return (
    <main className="setup-screen">
      <section className="setup-window" aria-labelledby="setup-title">
        <div className="setup-window__resize" ref={frameRef}>
          <div className="setup-window__content" ref={contentRef}>
            <div className="window-heading">
              <h1 id="setup-title">Skonfiguruj grę</h1>
            </div>
            <form noValidate onSubmit={handleSubmit(onValidSubmit)}>
              <div className="form-grid">
                <div className="settings-column">
                  <fieldset className="form-section">
                    <legend>Plansza</legend>
                    <div className="map-size-options" role="group" aria-label="Liczba heksów na planszy">
                      {(['S', 'M', 'XL', 'XXL'] as const).map((preset) => (
                        <button
                          type="button"
                          aria-pressed={mapPreset === preset}
                          key={preset}
                          className={`map-size-button ${mapPreset === preset ? 'map-size-button--selected' : ''}`}
                          onClick={() => {
                            setValue('mapPreset', preset, { shouldDirty: true, shouldValidate: true })
                            setSubmitted(null)
                          }}
                        >
                          <strong>{preset}</strong>
                          <span>{sizes[preset]} heksów</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="form-section">
                    <legend>Ustawienia rozgrywki</legend>
                    <div className="section-label">Warunek zwycięstwa</div>
                    <div className="choice-grid">
                      <label className={`choice ${winCondition === 'ELIMINATION' ? 'choice--selected' : ''}`}>
                        <input
                          type="radio"
                          value="ELIMINATION"
                          {...register('winCondition')}
                          onChange={() => {
                            setValue('winCondition', 'ELIMINATION', {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            setSubmitted(null)
                          }}
                        />
                        <span>
                          <strong>Eliminacja</strong>
                          <small>Ostatnia drużyna z terytorium wygrywa.</small>
                        </span>
                      </label>
                      <label className={`choice ${winCondition === 'ROUND_LIMIT' ? 'choice--selected' : ''}`}>
                        <input
                          type="radio"
                          value="ROUND_LIMIT"
                          {...register('winCondition')}
                          onChange={() => {
                            setValue('winCondition', 'ROUND_LIMIT', {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            setSubmitted(null)
                          }}
                        />
                        <span>
                          <strong>Limit rund</strong>
                          <small>Po pełnych rundach wygrywa największe terytorium.</small>
                        </span>
                      </label>
                    </div>
                    <div
                      className={`round-reveal ${winCondition === 'ROUND_LIMIT' ? 'round-reveal--open' : ''}`}
                      aria-hidden={winCondition !== 'ROUND_LIMIT'}
                    >
                      <div className="round-reveal-inner">
                        <label className="field round-field">
                          <span>Liczba pełnych rund</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            readOnly={winCondition !== 'ROUND_LIMIT'}
                            tabIndex={winCondition !== 'ROUND_LIMIT' ? -1 : undefined}
                            aria-invalid={!!errors.roundLimit}
                            {...register('roundLimit', { onChange: () => setSubmitted(null) })}
                          />
                          {winCondition === 'ROUND_LIMIT' && errors.roundLimit && (
                            <small className="field-error">{errors.roundLimit.message}</small>
                          )}
                        </label>
                      </div>
                    </div>
                    <label className="field streak-field">
                      <span>Seria do bonusowego ruchu</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        aria-invalid={!!errors.streakToBonus}
                        {...register('streakToBonus', { onChange: () => setSubmitted(null) })}
                      />
                      {errors.streakToBonus && (
                        <small className="field-error">{errors.streakToBonus.message}</small>
                      )}
                    </label>
                    <label className="toggle-row">
                      <span>
                        <strong>Wskrzeszanie drużyn</strong>
                      </span>
                      <Controller
                        control={control}
                        name="resurrectionEnabled"
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            role="switch"
                            checked={field.value}
                            onChange={(event) => {
                              field.onChange(event.target.checked)
                              setSubmitted(null)
                            }}
                          />
                        )}
                      />
                    </label>
                  </fieldset>
                </div>

                <TeamFields
                  fields={fields}
                  teams={teams}
                  errors={errors}
                  setValue={setValue}
                  onAdd={addTeam}
                  onRemove={removeTeam}
                  onChange={() => setSubmitted(null)}
                />
              </div>
              <div className="form-footer">
                <span className="icon-credit">
                  Ikony:{' '}
                  <a href="https://icon-sets.iconify.design/game-icons/" target="_blank" rel="noreferrer">
                    Game Icons
                  </a>{' '}
                  ·{' '}
                  <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
                    CC BY 3.0
                  </a>
                </span>
                <div className="form-footer__actions">
                  {onCancel && (
                    <Button className="form-footer__back" onClick={onCancel} disabled={isSubmitting}>
                      Wróć
                    </Button>
                  )}
                  <Button variant="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Tworzenie gry…' : 'Rozpocznij grę'}
                  </Button>
                </div>
              </div>
              {submitted && (
                <div className="config-preview" role="status">
                  Konfiguracja gotowa: {submitted.teams.length}{' '}
                  {submitted.teams.length <= 4 ? 'drużyny' : 'drużyn'}, {submitted.hexCount} heksów,{' '}
                  {submitted.winCondition === 'ELIMINATION'
                    ? 'eliminacja'
                    : `${submitted.roundLimit} pełnych rund`}
                  , wskrzeszanie {submitted.resurrectionEnabled ? 'włączone' : 'wyłączone'}.
                </div>
              )}
              {startError && (
                <div className="config-preview" role="alert">
                  {startError}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
