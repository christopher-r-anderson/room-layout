import {
  cloneElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
} from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { Button } from './button'
import { KbdShortcutDisplay } from './keyboard-shortcut-display'

export function ToolButton({
  action,
  disabled,
  disabledMessage,
  shortcuts,
  label,
  visibleLabel,
  shortcutHint,
  icon,
}: {
  action: () => void
  disabled: boolean
  disabledMessage: string
  shortcuts: string
  label: string
  visibleLabel?: string
  shortcutHint?: string
  icon: ReactElement<HTMLAttributes<HTMLElement>>
}) {
  const shortcutHintId = useId()
  const ariaHiddenIcon = cloneElement(icon, {
    'aria-hidden': 'true',
  })
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            aria-keyshortcuts={shortcuts}
            aria-label={label}
            aria-describedby={shortcutHint ? shortcutHintId : undefined}
            aria-disabled={disabled}
            className="aria-disabled:active:translate-y-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            onClick={(event) => {
              event.preventDefault()
              if (!disabled) {
                action()
              }
            }}
          >
            {ariaHiddenIcon}
            <span className="sr-only sm:not-sr-only">
              {visibleLabel ?? label}
            </span>
          </Button>
        }
      />
      {shortcutHint ? (
        <span id={shortcutHintId} className="sr-only">
          {shortcutHint}
        </span>
      ) : null}
      <TooltipContent className="flex flex-col items-start gap-1">
        <span className="pb-2">{disabled ? disabledMessage : label}</span>
        {shortcutHint ? (
          <span className="text-xs text-muted-foreground">{shortcutHint}</span>
        ) : null}
        <KbdShortcutDisplay shortcuts={shortcuts} />
      </TooltipContent>
    </Tooltip>
  )
}
