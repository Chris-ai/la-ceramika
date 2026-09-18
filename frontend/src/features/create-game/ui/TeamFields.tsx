import { Icon } from '@iconify/react/offline'
import plusIcon from '@iconify-icons/heroicons/plus'
import type { Dispatch, SetStateAction } from 'react'
import type { FieldArrayWithId, FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { animalIcons, teamColors, TeamAvatar } from '@/entities/team'
import type { GameSetupFormValues } from '../model/gameSetupSchema'

type TeamFieldsProps = {
  fields: FieldArrayWithId<GameSetupFormValues, 'teams', 'id'>[]
  teams: GameSetupFormValues['teams']
  errors: FieldErrors<GameSetupFormValues>
  register: UseFormRegister<GameSetupFormValues>
  setValue: UseFormSetValue<GameSetupFormValues>
  openAvatarPicker: number | null
  setOpenAvatarPicker: Dispatch<SetStateAction<number | null>>
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: () => void
}

export function TeamFields(props: TeamFieldsProps) {
  const {
    fields,
    teams,
    errors,
    register,
    setValue,
    openAvatarPicker,
    setOpenAvatarPicker,
    onAdd,
    onRemove,
    onChange,
  } = props
  return (
    <fieldset className="form-section teams-section">
      <legend>Drużyny</legend>
      <div className="team-list">
        {fields.map((field, index) => {
          const team = teams[index] ?? field
          const selectedIcon = animalIcons.find((icon) => icon.id === team.avatar) ?? animalIcons[0]
          return (
            <div className="team-row" key={field.id}>
              {teams.length > 2 && (
                <button
                  type="button"
                  className="remove-team"
                  aria-label={`Usuń drużynę ${index + 1}`}
                  onClick={() => onRemove(index)}
                >
                  ×
                </button>
              )}
              <div className="avatar-field">
                <button
                  type="button"
                  className="avatar-button"
                  aria-label={`Zmień ikonę drużyny ${index + 1}: ${selectedIcon.label}`}
                  aria-expanded={openAvatarPicker === index}
                  onClick={() => setOpenAvatarPicker(openAvatarPicker === index ? null : index)}
                >
                  <TeamAvatar slug={selectedIcon.slug} color={team.color} />
                </button>
                {errors.teams?.[index]?.avatar && (
                  <small className="field-error">{errors.teams[index]?.avatar?.message}</small>
                )}
              </div>
              <label className="field team-name">
                <span>Nazwa drużyny</span>
                <input
                  type="text"
                  maxLength={40}
                  placeholder={`Drużyna ${index + 1}`}
                  aria-invalid={!!errors.teams?.[index]?.name}
                  {...register(`teams.${index}.name`, { onChange })}
                />
                {errors.teams?.[index]?.name && (
                  <small className="field-error">{errors.teams[index]?.name?.message}</small>
                )}
              </label>
              <div className="color-options" role="group" aria-label={`Kolor drużyny ${index + 1}`}>
                {teamColors.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    className={`color-swatch ${team.color === color.value ? 'color-swatch--selected' : ''}`}
                    style={{ backgroundColor: color.value }}
                    aria-label={color.label}
                    aria-pressed={team.color === color.value}
                    disabled={teams.some(
                      (other, position) => position !== index && other.color === color.value,
                    )}
                    onClick={() => {
                      setValue(`teams.${index}.color`, color.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                      onChange()
                    }}
                  />
                ))}
                {errors.teams?.[index]?.color && (
                  <small className="field-error">{errors.teams[index]?.color?.message}</small>
                )}
              </div>
              {openAvatarPicker === index && (
                <div
                  className="avatar-options"
                  role="group"
                  aria-label={`Wybierz zwierzę dla drużyny ${index + 1}`}
                >
                  {animalIcons.map((icon) => (
                    <button
                      type="button"
                      key={icon.id}
                      className={`avatar-option ${team.avatar === icon.id ? 'avatar-option--selected' : ''}`}
                      aria-label={icon.label}
                      aria-pressed={team.avatar === icon.id}
                      disabled={teams.some(
                        (other, position) => position !== index && other.avatar === icon.id,
                      )}
                      onClick={() => {
                        setValue(`teams.${index}.avatar`, icon.id, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                        setOpenAvatarPicker(null)
                        onChange()
                      }}
                    >
                      <TeamAvatar slug={icon.slug} color={team.color} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <button type="button" className="add-team" disabled={teams.length >= 6} onClick={onAdd}>
          <Icon icon={plusIcon} className="add-icon" aria-hidden="true" /> Dodaj drużynę
        </button>
      </div>
    </fieldset>
  )
}
