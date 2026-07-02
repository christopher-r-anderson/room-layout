import { useId, useState, type ComponentProps, type Ref } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import type {
  SelectedItemDetailField,
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/core/types/selected-item.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import type { FurnitureItem } from '@/domain/furniture'
import { cn } from '@/shared/lib/utils'
import { getWallClearances } from '@/domain/geometry/wall-clearance'

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

interface FieldConfigEntry {
  key: SelectedItemDetailField
  label: string
  shortLabel: string
  group: 'position' | 'rotation'
  helpText: string
}

function normalizeDegrees(value: number) {
  const normalized = value % 360

  if (normalized < 0) {
    return normalized + 360
  }

  return normalized
}

// Editable field values keep a fixed `.`-decimal format: the commit path parses
// them with `Number()`, so a localized decimal separator would not round-trip.
function formatMeters(value: number) {
  const roundedValue = Number(value.toFixed(3))

  if (roundedValue === 0) {
    return '0.0'
  }

  return roundedValue
    .toFixed(3)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.000$/, '.0')
}

function formatDegrees(valueRadians: number) {
  const degrees = normalizeDegrees((valueRadians * 180) / Math.PI)
  const clockwiseDegrees = Number((360 - degrees).toFixed(1))
  const normalizedClockwiseDegrees = normalizeDegrees(clockwiseDegrees)

  return Number.isInteger(normalizedClockwiseDegrees)
    ? String(normalizedClockwiseDegrees)
    : normalizedClockwiseDegrees.toFixed(1).replace(/\.0$/, '')
}

function createDrafts(item: FurnitureItem) {
  const clearances = getWallClearances(item)

  return {
    positionX: formatMeters(clearances.left),
    positionZ: formatMeters(clearances.back),
    rotationDegrees: formatDegrees(item.rotationY),
  }
}

export function SelectedDetailsPlaceholder({
  className,
  ...props
}: ComponentProps<'p'>) {
  return (
    <p
      {...props}
      className={cn(
        'rounded-md border border-border/70 bg-background/90 px-3 py-2 text-xs/relaxed text-muted-foreground shadow-sm',
        className,
      )}
    >
      <Trans>Select an item to fine-tune placement.</Trans>
    </p>
  )
}

export function SelectedDetailsView({
  className,
  selectedFurniture,
  sectionRef,
  consumeBlurCommitSuppression,
  onInvalidSelectedItemDetailValue,
  onUpdateSelectedItemDetails,
}: {
  className?: string
  selectedFurniture: FurnitureItem
  sectionRef?: Ref<HTMLElement>
  consumeBlurCommitSuppression: () => boolean
  onInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}) {
  const { t } = useLingui()
  const titleId = useId()
  const committedDrafts = createDrafts(selectedFurniture)
  // Bound to a plain identifier so the extracted message reads
  // "{itemName} Placement" rather than an anonymous "{0}" placeholder.
  const itemName = selectedFurniture.name

  // Resolved per render so labels track the active locale. `label` is dual-use:
  // it is displayed and also passed as the interpolated field name in commit
  // error messages, so it must be a resolved string.
  const fieldConfig: FieldConfigEntry[] = [
    {
      key: 'positionX',
      label: t`Distance from left wall (m)`,
      shortLabel: t`Left wall`,
      group: 'position',
      helpText: t`Tab / Enter applies offset. Esc cancels.`,
    },
    {
      key: 'positionZ',
      label: t`Distance from back wall (m)`,
      shortLabel: t`Back wall`,
      group: 'position',
      helpText: t`Tab / Enter applies offset. Esc cancels.`,
    },
    {
      key: 'rotationDegrees',
      label: t`Rotation (deg)`,
      shortLabel: t`Rotate`,
      group: 'rotation',
      helpText: t`Tab / Enter applies rotation. Esc cancels.`,
    },
  ]
  const positionFields = fieldConfig.filter(
    (field) => field.group === 'position',
  )
  const rotationField = fieldConfig.find((field) => field.group === 'rotation')

  const [fieldOverrides, setFieldOverrides] = useState<
    Partial<Record<SelectedItemDetailField, FieldOverride>>
  >({})
  const [errors, setErrors] = useState<
    Partial<Record<SelectedItemDetailField, string>>
  >({})
  const [activeField, setActiveField] =
    useState<SelectedItemDetailField | null>(null)
  const [focusWithin, setFocusWithin] = useState(false)

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
      const message = onInvalidSelectedItemDetailValue(fieldLabel)

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

  const firstErrorField =
    fieldConfig.find(({ key }) => Boolean(errors[key]))?.key ?? null
  const supportField = firstErrorField ?? (focusWithin ? activeField : null)
  const visualSupportMessage = supportField
    ? (errors[supportField] ??
      fieldConfig.find((field) => field.key === supportField)?.helpText ??
      null)
    : null
  const supportErrorMessage = firstErrorField ? errors[firstErrorField] : null
  const supportIsError = Boolean(supportField && errors[supportField])

  const renderField = ({
    key,
    label,
    shortLabel,
    helpText,
  }: FieldConfigEntry) => {
    const inputId = `${titleId}-${key}`
    const helpId = `${inputId}-help`
    const errorId = `${inputId}-error`
    const errorMessage = isFieldDirty(key) ? errors[key] : undefined

    return (
      <div key={key} className="min-w-0 space-y-1">
        <label
          className="flex items-center justify-between gap-1 text-[10px]/4 font-medium text-muted-foreground"
          htmlFor={inputId}
        >
          <span aria-hidden="true" className="truncate">
            {shortLabel}
          </span>
          <span className="sr-only">{label}</span>
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          className="flex h-8 w-20 min-w-0 rounded-md border border-input bg-background px-1.5 py-1 text-center text-sm font-medium tabular-nums text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
          value={getFieldValue(key)}
          aria-label={label}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? `${helpId} ${errorId}` : helpId}
          onFocus={() => {
            setActiveField(key)
            setFocusWithin(true)
          }}
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
          onBlur={(event) => {
            commitField(key, label, selectedFurniture.id, 'blur')

            const nextFocused = event.relatedTarget

            if (
              !(nextFocused instanceof HTMLElement) ||
              nextFocused.closest('[data-selected-item-details-root]') === null
            ) {
              setFocusWithin(false)
            }
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
        <p id={helpId} className="sr-only">
          {helpText}
        </p>
        {errorMessage ? (
          <p id={errorId} className="sr-only">
            {errorMessage}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <section ref={sectionRef} className={className} aria-labelledby={titleId}>
      <Card variant="overlay" className="w-full" size="sm">
        <CardHeader className="gap-0.5 flex justify-between">
          <CardTitle id={titleId} className="truncate">
            <Trans>{itemName} Placement</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent data-selected-item-details-root>
          <div className="flex gap-2 w-max m-auto">
            <div className="min-w-0 rounded-md border border-border/60 bg-muted/20 p-2">
              <p className="text-[11px]/4 font-medium text-muted-foreground">
                <Trans>Position (m)</Trans>
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {positionFields.map(renderField)}
              </div>
            </div>
            <div className="min-w-0 rounded-md border border-border/60 bg-muted/20 p-2">
              <p className="text-[11px]/4 font-medium text-muted-foreground">
                <Trans>Rotation (deg)</Trans>
              </p>
              <div className="mt-1.5">
                {rotationField ? renderField(rotationField) : null}
              </div>
            </div>
          </div>
          <p
            aria-hidden="true"
            className={cn(
              'm-0 text-[11px]/4 w-0 min-w-full',
              supportIsError ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {visualSupportMessage ?? t`Edit the selected item.`}
          </p>
          {supportErrorMessage ? (
            <p aria-atomic="true" aria-live="assertive" className="sr-only">
              {supportErrorMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
