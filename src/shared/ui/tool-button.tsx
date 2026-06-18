import {
  cloneElement,
  useId,
  type ComponentProps,
  type HTMLAttributes,
  type PointerEventHandler,
  type ReactElement,
} from 'react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { Button } from './button'
import { KbdShortcutDisplay } from './keyboard-shortcut-display'

export function ToolButton({
  id,
  action,
  disabled,
  disabledMessage,
  shortcuts,
  label,
  visibleLabel,
  displayLabel = true,
  shortcutHint,
  icon,
  size = 'default',
  variant = 'secondary',
  className,
  tooltipSide,
  onPointerDown,
}: {
  id?: string
  action?: () => void
  disabled?: boolean
  disabledMessage?: string
  shortcuts?: string
  label: string
  visibleLabel?: string
  displayLabel?: boolean
  shortcutHint?: string
  icon: ReactElement<HTMLAttributes<HTMLElement>>
  size?: ComponentProps<typeof Button>['size']
  variant?: ComponentProps<typeof Button>['variant']
  className?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
}) {
  const shortcutHintId = useId()
  const ariaHiddenIcon = cloneElement(icon, {
    'aria-hidden': 'true',
  })
  const labelClassName = displayLabel ? undefined : 'sr-only'

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            id={id}
            type="button"
            variant={variant}
            size={size}
            aria-keyshortcuts={shortcuts}
            aria-label={label}
            aria-describedby={shortcutHint ? shortcutHintId : undefined}
            aria-disabled={disabled}
            className={cn(
              'aria-disabled:active:translate-y-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
              className,
            )}
            onPointerDown={disabled ? undefined : onPointerDown}
            onClick={(event) => {
              event.preventDefault()
              if (!disabled) {
                action?.()
              }
            }}
          >
            {ariaHiddenIcon}
            <span className={labelClassName}>{visibleLabel ?? label}</span>
          </Button>
        }
      />
      {shortcutHint ? (
        <span id={shortcutHintId} className="sr-only">
          {shortcutHint}
        </span>
      ) : null}
      <TooltipContent
        className="flex flex-col items-start gap-1"
        side={tooltipSide}
      >
        <span className="pb-2">{disabled ? disabledMessage : label}</span>
        {shortcutHint ? (
          <span className="text-xs text-muted-foreground">{shortcutHint}</span>
        ) : null}
        <KbdShortcutDisplay shortcuts={shortcuts} />
      </TooltipContent>
    </Tooltip>
  )
}
