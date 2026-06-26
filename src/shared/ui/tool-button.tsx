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
  buttonRef,
  action,
  disabled,
  disabledMessage,
  shortcuts,
  label,
  visibleLabel,
  displayLabel = true,
  icon,
  size = 'default',
  className,
  tooltipSide,
  onPointerDown,
}: {
  buttonRef?: Ref<HTMLButtonElement>
  action?: () => void
  disabled?: boolean
  disabledMessage?: string
  shortcuts?: string
  label: string
  visibleLabel?: string
  displayLabel?: boolean
  icon: ReactElement<HTMLAttributes<HTMLElement>>
  size?: ComponentProps<typeof Button>['size']
  className?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
}) {
  const disabledReasonId = useId()
  const ariaHiddenIcon = cloneElement(icon, {
    'aria-hidden': 'true',
  })
  const labelClassName = displayLabel ? undefined : 'sr-only'

  // The visual tooltip is not exposed to assistive tech (Base UI tooltips carry
  // no aria-describedby by design), so the disabled reason is mirrored into a
  // stable sr-only element the button points at — available on focus regardless
  // of tooltip state. The shortcut reaches AT via aria-keyshortcuts.
  const showDisabledReason = Boolean(disabled && disabledMessage)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toolbar.Button
            disabled={disabled}
            render={
              <Button
                ref={buttonRef}
                type="button"
                variant="secondary"
                size={size}
                aria-keyshortcuts={shortcuts}
                aria-label={label}
                aria-describedby={
                  showDisabledReason ? disabledReasonId : undefined
                }
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
      {showDisabledReason ? (
        <span id={disabledReasonId} className="sr-only">
          {disabledMessage}
        </span>
      ) : null}
      <TooltipContent
        className="flex flex-col items-start gap-1"
        side={tooltipSide}
      >
        <span className="pb-2">{disabled ? disabledMessage : label}</span>
        <KbdShortcutDisplay shortcuts={shortcuts} />
      </TooltipContent>
    </Tooltip>
  )
}
