import { useId, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { plural } from '@lingui/core/macro'
import { ROOM_SIZE_LIMITS, type RoomSize } from '@/domain/geometry/room-metrics'
import {
  moveItemsInsideRoom,
  setRoomSize,
  useOutOfBoundsItemIds,
} from '@/core/operations/room-size'
import { useRoomSize } from '@/core/stores/scene-document-store'
import { feedback } from '@/core/stores/feedback-store'
import { Button } from '@/shared/ui/button'

type RoomSizeField = keyof RoomSize

// Fixed '.' decimals, parsed with Number(): the documented i18n exception for
// editable numeric fields (docs/architecture/i18n.md, "Not localized").
function formatMeters(value: number) {
  return String(value)
}

export function RoomSizeControls() {
  const { t } = useLingui()
  const baseId = useId()
  const roomSize = useRoomSize()
  const outOfBoundsCount = useOutOfBoundsItemIds().length

  const [drafts, setDrafts] = useState<Partial<Record<RoomSizeField, string>>>(
    {},
  )
  const [errors, setErrors] = useState<Partial<Record<RoomSizeField, string>>>(
    {},
  )

  // Resolved per render so labels track the active locale.
  const fieldConfig: {
    key: RoomSizeField
    label: string
  }[] = [
    { key: 'width', label: t`Width (m)` },
    { key: 'depth', label: t`Depth (m)` },
    { key: 'height', label: t`Wall height (m)` },
  ]

  const getFieldValue = (field: RoomSizeField) =>
    drafts[field] ?? formatMeters(roomSize[field])

  const resetField = (field: RoomSizeField) => {
    setDrafts((current) => ({ ...current, [field]: undefined }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const reportFieldError = (
    field: RoomSizeField,
    message: string,
    trigger: 'enter' | 'blur',
  ) => {
    const alreadyReported = errors[field] === message

    setErrors((current) => ({ ...current, [field]: message }))

    if (trigger === 'enter' || !alreadyReported) {
      feedback.formError(message)
    }
  }

  const commitField = (
    field: RoomSizeField,
    label: string,
    trigger: 'enter' | 'blur',
  ) => {
    const draft = drafts[field]

    if (draft === undefined) {
      return
    }

    const rawValue = draft.trim()
    const parsedValue = Number(rawValue)

    if (rawValue.length === 0 || !Number.isFinite(parsedValue)) {
      reportFieldError(field, t`Enter a number for ${label}.`, trigger)
      return
    }

    const result = setRoomSize({ ...roomSize, [field]: parsedValue })

    if (result.ok) {
      resetField(field)

      if (result.outOfBoundsCount > 0) {
        feedback.actionWarning({
          title: plural(result.outOfBoundsCount, {
            one: '# item is outside the room walls.',
            other: '# items are outside the room walls.',
          }),
        })
      }
      return
    }

    if (result.reason === 'dragging') {
      reportFieldError(
        field,
        t`Finish moving furniture before resizing the room.`,
        trigger,
      )
      return
    }

    const { min, max } = ROOM_SIZE_LIMITS[field]
    reportFieldError(
      field,
      t`${label} must be between ${min} and ${max}.`,
      trigger,
    )
  }

  const handleMoveItemsInside = () => {
    const result = moveItemsInsideRoom()

    if (result.ok && result.movedCount > 0) {
      feedback.actionSuccess({
        title: plural(result.movedCount, {
          one: 'Moved # item inside the room.',
          other: 'Moved # items inside the room.',
        }),
      })
    }
  }

  const renderField = ({ key, label }: (typeof fieldConfig)[number]) => {
    const inputId = `${baseId}-${key}`
    const errorId = `${inputId}-error`
    const errorMessage = drafts[key] !== undefined ? errors[key] : undefined

    return (
      <div key={key} className="min-w-0 space-y-1">
        <label
          className="block truncate text-xs font-medium text-muted-foreground"
          htmlFor={inputId}
        >
          {label}
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          className="flex h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1 text-sm font-medium tabular-nums text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
          value={getFieldValue(key)}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
          onChange={(event) => {
            const nextValue = event.target.value

            setDrafts((current) => ({ ...current, [key]: nextValue }))
            setErrors((current) => ({ ...current, [key]: undefined }))
          }}
          onBlur={() => {
            commitField(key, label, 'blur')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitField(key, label, 'enter')
            }

            if (event.key === 'Escape' && drafts[key] !== undefined) {
              event.preventDefault()
              event.stopPropagation()
              resetField(key)
            }
          }}
        />
        {errorMessage ? (
          <p id={errorId} className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">
          <Trans>Room size</Trans>
        </p>
        <p className="text-xs text-muted-foreground">
          <Trans>
            Set your room's size in meters. Enter or Tab applies a value; Esc
            cancels.
          </Trans>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {fieldConfig.filter((field) => field.key !== 'height').map(renderField)}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {fieldConfig.filter((field) => field.key === 'height').map(renderField)}
      </div>

      {outOfBoundsCount > 0 ? (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-2">
          <p className="text-xs text-foreground">
            <Plural
              value={outOfBoundsCount}
              one="# item is outside the room walls."
              other="# items are outside the room walls."
            />
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleMoveItemsInside}
          >
            <Trans>Move items inside</Trans>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
