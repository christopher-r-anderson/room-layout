import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface FinishPickerProps<T extends { id: string; label: string }> {
  label: string
  description: string
  name: string
  options: T[]
  selectedId: string
  onChange: (id: string) => void
  cardClassName: string
  renderCard: (item: T, isSelected: boolean) => ReactNode
  headerAccessory?: ReactNode
}

export function FinishPicker<T extends { id: string; label: string }>({
  label,
  description,
  name,
  options,
  selectedId,
  onChange,
  cardClassName,
  renderCard,
  headerAccessory,
}: FinishPickerProps<T>) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {headerAccessory}
      </div>
      <fieldset className="grid gap-2 border-0 p-0 min-[22rem]:grid-cols-2">
        <legend className="sr-only">{label}</legend>
        {options.map((item) => {
          const isSelected = selectedId === item.id

          return (
            <label key={item.id} className="block min-w-0 cursor-pointer">
              <input
                className="peer sr-only"
                aria-label={item.label}
                type="radio"
                name={name}
                value={item.id}
                checked={isSelected}
                onChange={(event) => {
                  onChange(event.target.value)
                }}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'h-full rounded-lg border bg-card transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50',
                  cardClassName,
                  isSelected
                    ? 'border-primary/60 bg-primary/5'
                    : 'hover:border-foreground/20 hover:shadow-sm',
                )}
              >
                {renderCard(item, isSelected)}
              </span>
            </label>
          )
        })}
      </fieldset>
    </>
  )
}
