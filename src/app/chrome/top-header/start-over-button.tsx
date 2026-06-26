import { IconRotate2 } from '@tabler/icons-react'
import { ToolButton } from '@/shared/ui/tool-button'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import type { ComponentProps, Ref } from 'react'

export function StartOverButton({
  buttonId,
  buttonRef,
  disabled,
  disabledMessage,
  className,
  size,
}: {
  buttonId?: string
  buttonRef?: Ref<HTMLButtonElement>
  disabled: boolean
  disabledMessage: string
  className?: string
  labelVisibility?: ComponentProps<typeof ToolButton>['displayLabel']
  size?: ComponentProps<typeof ToolButton>['size']
}) {
  const dispatch = useCommandDispatch()

  return (
    <ToolButton
      asToolbarItem
      id={buttonId}
      buttonRef={buttonRef}
      action={() => {
        dispatch({ kind: 'start-over' })
      }}
      disabled={disabled}
      disabledMessage={disabledMessage}
      shortcuts="Control+Alt+N Meta+Alt+N"
      label="Start over"
      visibleLabel="Start Over"
      icon={<IconRotate2 />}
      size={size}
      className={className}
      tooltipSide="bottom"
    />
  )
}
