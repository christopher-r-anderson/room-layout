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

/**
 * A toolbar action: an icon button with a tooltip that carries its label,
 * keyboard shortcut, and the reason it is unavailable while disabled. Always a
 * `Toolbar.Button`, so it must live inside a `Toolbar.Root`, which owns roving
 * focus and — when disabled — keeps the item focusable, marks it
 * `aria-disabled`, and suppresses its activation.
 */
export function ToolButton({
  id,
  buttonRef,
  action,
  disabled,
  focusableWhenDisabled,
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
  buttonRef?: Ref<HTMLButtonElement>
  action?: () => void
  disabled?: boolean
  // Disabled toolbar items stay focusable by default so screen-reader users can
  // discover them and read why they are unavailable. Set false where a disabled
  // item's absence is obvious from a neighbouring control.
  focusableWhenDisabled?: boolean
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
          <Toolbar.Button
            disabled={disabled}
            focusableWhenDisabled={focusableWhenDisabled}
            render={
              <Button
                id={id}
                ref={buttonRef}
                type="button"
                variant={variant}
                size={size}
                aria-keyshortcuts={shortcuts}
                aria-label={label}
                aria-describedby={shortcutHint ? shortcutHintId : undefined}
                className={cn(
                  'aria-disabled:active:translate-y-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
                  className,
                )}
                onPointerDown={onPointerDown}
                onClick={action}
              >
                {ariaHiddenIcon}
                <span className={labelClassName}>{visibleLabel ?? label}</span>
              </Button>
            }
          />
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
