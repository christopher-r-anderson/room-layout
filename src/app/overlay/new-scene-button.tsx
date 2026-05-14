import { IconRotate2 } from '@tabler/icons-react'
import { ToolButton } from '@/components/ui/tool-button'

export function NewSceneButton({
  disabled,
  disabledMessage,
  onOpenNewSceneDialog,
}: {
  disabled: boolean
  disabledMessage: string
  onOpenNewSceneDialog: () => void
}) {
  return (
    <ToolButton
      action={onOpenNewSceneDialog}
      disabled={disabled}
      disabledMessage={disabledMessage}
      shortcuts="Control+N Meta+N"
      label="Start a new scene"
      visibleLabel="New Scene"
      icon={<IconRotate2 />}
      className="pointer-events-auto"
      tooltipSide="bottom"
    />
  )
}
