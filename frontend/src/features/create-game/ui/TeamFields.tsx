import { useState } from 'react'
import type { FieldArrayWithId, FieldErrors, UseFormSetValue } from 'react-hook-form'
import { TeamAvatar, teamIcons, teamLabel } from '@/entities/team'
import type { GameSetupFormValues } from '../model/gameSetupSchema'
import { TeamPicker } from './TeamPicker'
import './TeamFields.css'

type TeamFieldsProps = {
  fields: FieldArrayWithId<GameSetupFormValues, 'teams', 'id'>[]
  teams: GameSetupFormValues['teams']
  errors: FieldErrors<GameSetupFormValues>
  setValue: UseFormSetValue<GameSetupFormValues>
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: () => void
}

export function TeamFields({ fields, teams, errors, setValue, onAdd, onRemove, onChange }: TeamFieldsProps) {
  const [selection, setSelection] = useState<{ id: string; anchor: HTMLButtonElement } | null>(null)
  const selectedIndex = fields.findIndex((field) => field.id === selection?.id)
  return (
    <fieldset className="form-section team-fields">
      <legend>Drużyny</legend>
      <div className="team-fields__tiles">
        {fields.map((field, index) => {
          const team = teams[index] ?? field
          const icon = teamIcons.find((item) => item.id === team.avatar) ?? teamIcons[0]
          return (
            <button
              type="button"
              className="team-fields__tile"
              key={field.id}
              aria-label={`Edytuj drużynę ${index + 1}: ${teamLabel(team)}`}
              aria-haspopup="dialog"
              aria-expanded={selection?.id === field.id}
              onClick={(event) => setSelection({ id: field.id, anchor: event.currentTarget })}
            >
              <TeamAvatar
                key={icon.id}
                className="animal-icon team-fields__icon"
                slug={icon.slug}
                color={team.color}
              />
            </button>
          )
        })}
        <button
          type="button"
          className="team-fields__tile team-fields__tile--add"
          onClick={onAdd}
          disabled={teams.length >= 6}
          aria-label="Dodaj drużynę"
          title={teams.length >= 6 ? 'Maksymalnie 6 drużyn' : 'Dodaj drużynę'}
        >
          <span aria-hidden="true">+</span>
          <small>Dodaj</small>
        </button>
      </div>
      {errors.teams && (
        <small className="field-error" role="alert">
          {errors.teams.message ?? 'Każda drużyna musi mieć inny kolor i ikonę.'}
        </small>
      )}
      {selection && selectedIndex >= 0 && (
        <TeamPicker
          key={selection.id}
          anchor={selection.anchor}
          team={teams[selectedIndex]}
          teams={teams}
          index={selectedIndex}
          onClose={() => setSelection(null)}
          onSelect={(field, value) => {
            setValue(`teams.${selectedIndex}.${field}`, value, { shouldDirty: true, shouldValidate: true })
            onChange()
          }}
          onRemove={
            teams.length > 2
              ? () => {
                  selection.anchor.parentElement
                    ?.querySelector<HTMLButtonElement>('.team-fields__tile--add')
                    ?.focus()
                  setSelection(null)
                  onRemove(selectedIndex)
                }
              : undefined
          }
        />
      )}
    </fieldset>
  )
}
