import {
  cloneElement,
  useId,
  type ComponentProps,
  type HTMLAttributes,
  type PointerEventHandler,
  type ReactElement,
  type Ref,
} from 'react'
import { Toolbar } from '@base-ui/react/toolbar'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { Button } from './button'
import { KbdShortcutDisplay } from './keyboard-shortcut-display'

export function ToolButton({
  id,
  buttonRef,
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
  asToolbarItem = false,
}: {
  id?: string
  buttonRef?: Ref<HTMLButtonElement>
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
  // Render the control as a Base UI Toolbar item so a parent Toolbar.Root
  // manages roving tabindex / arrow-key navigation. Opt-in: standalone uses
  // and non-toolbar groupings leave this off.
  asToolbarItem?: boolean
}) {
  const shortcutHintId = useId()
  const ariaHiddenIcon = cloneElement(icon, {
    'aria-hidden': 'true',
  })
  const labelClassName = displayLabel ? undefined : 'sr-only'

  const buttonElement = (
    <Button
      id={id}
      ref={buttonRef}
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
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          asToolbarItem ? (
            <Toolbar.Button render={buttonElement} />
          ) : (
            buttonElement
          )
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
