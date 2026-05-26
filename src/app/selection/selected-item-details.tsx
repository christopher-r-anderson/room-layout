import { useId, useState } from 'react'
import type {
  SelectedItemDetailField,
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/app/selected-item-details.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { cn } from '@/lib/utils'

type FieldOverride =
  | {
      kind: 'dirty'
      value: string
    }
  | {
      kind: 'optimistic'
      value: string
      sourceItem: FurnitureItem
    }

const FIELD_CONFIG: {
  key: SelectedItemDetailField
  label: string
  helpText: string
}[] = [
  {
    key: 'positionX',
    label: 'Left/right position (m)',
    helpText: 'Press Enter or leave the field to apply the exact X position.',
  },
  {
    key: 'positionZ',
    label: 'Front/back position (m)',
    helpText: 'Press Enter or leave the field to apply the exact Z position.',
  },
  {
    key: 'rotationDegrees',
    label: 'Rotation (deg)',
    helpText:
      'Press Enter or leave the field to apply the exact rotation. Press Escape to cancel your draft rotation value.',
  },
]

function normalizeDegrees(value: number) {
  const normalized = value % 360

  if (normalized < 0) {
    return normalized + 360
  }

  return normalized
}

function formatMeters(value: number) {
  return value
    .toFixed(3)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.000$/, '.0')
}

function formatDegrees(valueRadians: number) {
  const degrees = normalizeDegrees((valueRadians * 180) / Math.PI)

  return Number.isInteger(degrees)
    ? String(degrees)
    : degrees.toFixed(1).replace(/\.0$/, '')
}

function createDrafts(item: FurnitureItem) {
  return {
    positionX: formatMeters(item.position[0]),
    positionZ: formatMeters(item.position[2]),
    rotationDegrees: formatDegrees(item.rotationY),
  }
}

export function SelectedItemDetails({
  className,
  disabled,
  selectedFurniture,
  consumeBlurCommitSuppression,
  onInvalidSelectedItemDetailValue,
  onUpdateSelectedItemDetails,
}: {
  className?: string
  disabled: boolean
  selectedFurniture: FurnitureItem
  consumeBlurCommitSuppression: () => boolean
  onInvalidSelectedItemDetailValue?: (fieldLabel: string) => string
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}) {
  const titleId = useId()
  const committedDrafts = createDrafts(selectedFurniture)
  const [fieldOverrides, setFieldOverrides] = useState<
    Partial<Record<SelectedItemDetailField, FieldOverride>>
  >({})
  const [errors, setErrors] = useState<
    Partial<Record<SelectedItemDetailField, string>>
  >({})

  const getFieldValue = (field: SelectedItemDetailField) => {
    const override = fieldOverrides[field]

    if (!override) {
      return committedDrafts[field]
    }

    if (override.kind === 'dirty') {
      return override.value
    }

    return override.sourceItem === selectedFurniture
      ? override.value
      : committedDrafts[field]
  }

  const isFieldDirty = (field: SelectedItemDetailField) => {
    return fieldOverrides[field]?.kind === 'dirty'
  }

  const resetField = (field: SelectedItemDetailField) => {
    setFieldOverrides((currentOverrides) => ({
      ...currentOverrides,
      [field]: undefined,
    }))
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }))
  }

  const commitField = (
    field: SelectedItemDetailField,
    fieldLabel: string,
    itemId: string,
    trigger: 'enter' | 'blur',
  ) => {
    if (itemId !== selectedFurniture.id) {
      return
    }

    if (trigger === 'blur' && consumeBlurCommitSuppression()) {
      return
    }

    if (!isFieldDirty(field)) {
      return
    }

    const rawValue = getFieldValue(field).trim()
    const parsedValue = Number(rawValue)

    if (rawValue.length === 0 || !Number.isFinite(parsedValue)) {
      const message =
        onInvalidSelectedItemDetailValue?.(fieldLabel) ??
        `${fieldLabel} must be a valid number.`

      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: message,
      }))
      return
    }

    const result = onUpdateSelectedItemDetails({
      field,
      fieldLabel,
      value: parsedValue,
    })

    if (result.ok) {
      const nextDrafts = createDrafts(result.item)

      setFieldOverrides((currentOverrides) => ({
        ...currentOverrides,
        [field]: {
          kind: 'optimistic',
          value: nextDrafts[field],
          sourceItem: selectedFurniture,
        },
      }))
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }))
      return
    }

    if (result.reason === 'no-op') {
      resetField(field)
      return
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: result.message,
    }))
  }

  return (
    <section
      className={cn('pointer-events-auto', className)}
      aria-labelledby={titleId}
    >
      <Card
        className="w-full bg-background/90 shadow-sm backdrop-blur-sm"
        size="sm"
      >
        <CardHeader>
          <CardTitle id={titleId}>Selected item details</CardTitle>
          <p className="text-xs/relaxed text-muted-foreground">
            Update {selectedFurniture.name} with exact position and rotation
            values.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {FIELD_CONFIG.map(({ key, label, helpText }) => {
            const inputId = `${titleId}-${key}`
            const helpId = `${inputId}-help`
            const errorId = `${inputId}-error`
            const errorMessage = isFieldDirty(key) ? errors[key] : undefined

            return (
              <div key={key} className="space-y-1.5">
                <label
                  className="block text-xs/relaxed font-medium text-foreground"
                  htmlFor={inputId}
                >
                  {label}
                </label>
                <input
                  id={inputId}
                  type="text"
                  inputMode="decimal"
                  className="flex h-8 w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs/relaxed text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                  value={getFieldValue(key)}
                  disabled={disabled}
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={
                    errorMessage ? `${helpId} ${errorId}` : helpId
                  }
                  onChange={(event) => {
                    const nextValue = event.target.value

                    setFieldOverrides((currentOverrides) => ({
                      ...currentOverrides,
                      [key]: {
                        kind: 'dirty',
                        value: nextValue,
                      },
                    }))
                    setErrors((currentErrors) => ({
                      ...currentErrors,
                      [key]: undefined,
                    }))
                  }}
                  onBlur={() => {
                    commitField(key, label, selectedFurniture.id, 'blur')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitField(key, label, selectedFurniture.id, 'enter')
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault()
                      resetField(key)
                    }
                  }}
                />
                <p
                  id={helpId}
                  className="text-xs/relaxed text-muted-foreground"
                >
                  {helpText}
                </p>
                {errorMessage ? (
                  <p id={errorId} className="text-xs/relaxed text-destructive">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </section>
  )
}
