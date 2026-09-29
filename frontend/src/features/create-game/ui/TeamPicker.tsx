import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TeamAvatar, teamColors, teamIcons } from '@/entities/team'
import { Button } from '@/shared/ui/button'
import type { GameSetupFormValues } from '../model/gameSetupSchema'
import './TeamPicker.css'

type Team = GameSetupFormValues['teams'][number]
type TeamPickerProps = {
  anchor: HTMLButtonElement
  team: Team
  teams: Team[]
  index: number
  onSelect: (field: 'color' | 'avatar', value: string) => void
  onClose: () => void
  onRemove?: () => void
}

export function TeamPicker({ anchor, team, teams, index, onSelect, onClose, onRemove }: TeamPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const place = () => {
      const rect = anchor.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const width = dialog.offsetWidth
      const height = dialog.offsetHeight
      let left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12))
      const below = rect.bottom + 12
      const above = rect.top - height - 12
      let top = below
      if (below + height > window.innerHeight - 12) {
        if (above >= 12) top = above
        else {
          if (rect.right + width + 24 <= viewportWidth) left = rect.right + 12
          else if (rect.left >= width + 24) left = rect.left - width - 12
          top = Math.max(12, Math.min(rect.top, window.innerHeight - height - 12))
        }
      }
      dialog.style.left = `${left}px`
      dialog.style.top = `${top}px`
    }
    dialog.showModal()
    place()
    const observer = new ResizeObserver(place)
    observer.observe(dialog)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      dialog.close()
    }
  }, [anchor])

  return createPortal(
    <dialog
      ref={dialogRef}
      className="team-picker"
      aria-label={`Wygląd drużyny ${index + 1}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose()
      }}
    >
      <div className="team-picker__heading">
        <strong className="team-picker__title visually-hidden">Drużyna {index + 1}</strong>
        <Button
          variant="text"
          className="team-picker__close"
          onClick={onClose}
          aria-label="Zamknij wybór drużyny"
        >
          ×
        </Button>
      </div>
      <fieldset className="team-picker__section">
        <legend>Kolor</legend>
        <div className="team-picker__colors">
          {teamColors.map((color) => (
            <button
              type="button"
              key={color.value}
              className="team-picker__color"
              style={{ backgroundColor: color.value }}
              aria-label={color.label}
              aria-pressed={team.color === color.value}
              disabled={teams.some((other, position) => position !== index && other.color === color.value)}
              onClick={() => onSelect('color', color.value)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="team-picker__section">
        <legend>Ikona</legend>
        <div className="team-picker__icons">
          {teamIcons.map((icon) => (
            <button
              type="button"
              key={icon.id}
              className="team-picker__option"
              aria-label={icon.label}
              aria-pressed={team.avatar === icon.id}
              disabled={teams.some((other, position) => position !== index && other.avatar === icon.id)}
              onClick={() => onSelect('avatar', icon.id)}
            >
              <TeamAvatar slug={icon.slug} color={team.color} />
            </button>
          ))}
        </div>
      </fieldset>
      {onRemove && (
        <Button
          variant="text"
          className="team-picker__remove"
          onClick={() => {
            dialogRef.current?.close()
            onRemove()
          }}
        >
          Usuń drużynę
        </Button>
      )}
    </dialog>,
    document.body,
  )
}
