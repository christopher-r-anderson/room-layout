import { IconRotate2 } from '@tabler/icons-react'
import { ToolButton } from '@/shared/ui/tool-button'
import type { ComponentProps, Ref } from 'react'

export function StartOverButton({
  buttonId,
  buttonRef,
  disabled,
  disabledMessage,
  onOpenStartOverDialog,
  className,
  size,
}: {
  buttonId?: string
  buttonRef?: Ref<HTMLButtonElement>
  disabled: boolean
  disabledMessage: string
  onOpenStartOverDialog: () => void
  className?: string
  labelVisibility?: ComponentProps<typeof ToolButton>['displayLabel']
  size?: ComponentProps<typeof ToolButton>['size']
}) {
  return (
    <ToolButton
      id={buttonId}
      buttonRef={buttonRef}
      action={onOpenStartOverDialog}
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
