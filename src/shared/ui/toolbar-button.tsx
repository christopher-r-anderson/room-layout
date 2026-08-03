import {
  cloneElement,
  useId,
  type ComponentProps,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { Toolbar } from '@base-ui/react/toolbar'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { Button } from './button'
import { ariaDisabledButtonClasses } from './button-variants'
import { KbdShortcutDisplay } from './keyboard-shortcut-display'

// Both render the same shell: our Button enrolled as a Base UI Toolbar.Button
// (roving focus; focusable + aria-disabled while disabled) in a tooltip, so
// they must live inside a Toolbar.Root. Every toolbar item is one of these
// two or a bare `<Toolbar.Button render={...}>`; outside a toolbar, use
// Button directly.

interface ToolbarButtonShellProps {
  buttonRef?: Ref<HTMLButtonElement>
  buttonProps?: ComponentProps<typeof Button>
  disabled?: boolean
  icon: ReactElement<HTMLAttributes<HTMLElement>>
  label: string
  visibleLabel?: string
  showLabel: boolean
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
  className?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  tooltipClassName?: string
  tooltipContent: ReactNode
  srDescription?: ReactNode
}

function ToolbarButtonShell({
  buttonRef,
  buttonProps,
  disabled,
  icon,
  label,
  visibleLabel,
  showLabel,
  variant = 'secondary',
  size = 'default',
  className,
  tooltipSide,
  tooltipClassName,
  tooltipContent,
  srDescription,
}: ToolbarButtonShellProps) {
  const ariaHiddenIcon = cloneElement(icon, {
    'aria-hidden': 'true',
  })

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toolbar.Button
            disabled={disabled}
            render={
              <Button
                {...buttonProps}
                ref={buttonRef}
                type="button"
                variant={variant}
                size={size}
                aria-label={label}
                className={className}
              >
                {ariaHiddenIcon}
                <span className={showLabel ? undefined : 'sr-only'}>
                  {visibleLabel ?? label}
                </span>
              </Button>
            }
          />
        }
      />
      {srDescription}
      <TooltipContent className={tooltipClassName} side={tooltipSide}>
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * A toolbar action that does something now: rotate, undo, start over. The
 * tooltip carries the label, keyboard shortcut, and the reason the action is
 * unavailable while disabled.
 */
export function ToolbarCommandButton({
  buttonRef,
  onClick,
  onPointerDown,
  disabled,
  disabledMessage,
  shortcuts,
  label,
  visibleLabel,
  showLabel = true,
  icon,
  size,
  className,
  tooltipSide,
}: {
  buttonRef?: Ref<HTMLButtonElement>
  onClick?: MouseEventHandler<HTMLButtonElement>
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
  disabled?: boolean
  disabledMessage?: string
  shortcuts?: string
  label: string
  visibleLabel?: string
  showLabel?: boolean
  icon: ReactElement<HTMLAttributes<HTMLElement>>
  size?: ComponentProps<typeof Button>['size']
  className?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}) {
  const disabledReasonId = useId()

  // The visual tooltip is not exposed to assistive tech (Base UI tooltips carry
  // no aria-describedby by design), so the disabled reason is mirrored into a
  // stable sr-only element the button points at - available on focus regardless
  // of tooltip state. The shortcut reaches AT via aria-keyshortcuts.
  const showDisabledReason = Boolean(disabled && disabledMessage)

  return (
    <ToolbarButtonShell
      buttonRef={buttonRef}
      disabled={disabled}
      icon={icon}
      label={label}
      visibleLabel={visibleLabel}
      showLabel={showLabel}
      size={size}
      className={cn(ariaDisabledButtonClasses, className)}
      tooltipSide={tooltipSide}
      tooltipClassName="flex flex-col items-start gap-1"
      tooltipContent={
        <>
          <span className="pb-2">
            {showDisabledReason ? disabledMessage : label}
          </span>
          <KbdShortcutDisplay shortcuts={shortcuts} />
        </>
      }
      srDescription={
        showDisabledReason ? (
          <span id={disabledReasonId} className="sr-only">
            {disabledMessage}
          </span>
        ) : null
      }
      buttonProps={{
        'aria-keyshortcuts': shortcuts,
        'aria-describedby': showDisabledReason ? disabledReasonId : undefined,
        onClick,
        onPointerDown,
      }}
    />
  )
}

/**
 * A toolbar button that opens or toggles another surface: a dialog, drawer, or
 * inline panel. Carries the popup ARIA wiring; the tooltip carries a
 * description. `popupType` sets aria-haspopup - omit it for inline surfaces
 * (e.g. the desktop room sidebar).
 */
export function ToolbarPopupButton({
  buttonRef,
  onClick,
  onKeyDown,
  controlsId,
  expanded,
  popupType,
  label,
  visibleLabel,
  showLabel = true,
  icon,
  variant,
  size,
  className,
  tooltipSide,
  tooltip,
}: {
  buttonRef?: Ref<HTMLButtonElement>
  onClick: MouseEventHandler<HTMLButtonElement>
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
  controlsId: string
  expanded: boolean
  popupType?: 'dialog'
  label: string
  visibleLabel?: string
  showLabel?: boolean
  icon: ReactElement<HTMLAttributes<HTMLElement>>
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
  className?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  tooltip: ReactNode
}) {
  return (
    <ToolbarButtonShell
      buttonRef={buttonRef}
      icon={icon}
      label={label}
      visibleLabel={visibleLabel}
      showLabel={showLabel}
      variant={variant}
      size={size}
      className={className}
      tooltipSide={tooltipSide}
      tooltipContent={tooltip}
      buttonProps={{
        'aria-controls': controlsId,
        'aria-expanded': expanded,
        'aria-haspopup': popupType,
        onClick,
        onKeyDown,
      }}
    />
  )
}
