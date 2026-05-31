import { IconRotate2 } from '@tabler/icons-react'
import { ToolButton } from '@/components/ui/tool-button'
import type { ComponentProps } from 'react'

export function StartOverButton({
  buttonId,
  disabled,
  disabledMessage,
  onOpenStartOverDialog,
  className = 'pointer-events-auto',
  labelVisibility,
  size,
}: {
  buttonId?: string
  disabled: boolean
  disabledMessage: string
  onOpenStartOverDialog: () => void
  className?: string
  labelVisibility?: ComponentProps<typeof ToolButton>['labelVisibility']
  size?: ComponentProps<typeof ToolButton>['size']
}) {
  return (
    <ToolButton
      id={buttonId}
      action={onOpenStartOverDialog}
      disabled={disabled}
      disabledMessage={disabledMessage}
      shortcuts="Control+Alt+N Meta+Alt+N"
      label="Start over"
      visibleLabel="Start Over"
      labelVisibility={labelVisibility}
      icon={<IconRotate2 />}
      size={size}
      className={className}
      tooltipSide="bottom"
    />
  )
}
