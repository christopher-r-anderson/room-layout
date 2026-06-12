import { ButtonGroup } from '@/shared/ui/button-group'
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react'
import { ToolButton } from '@/shared/ui/tool-button'
import type { ComponentProps } from 'react'

export function HistoryTools({
  canRedo,
  canUndo,
  editorInteractionsEnabled,
  onRedo,
  onUndo,
  buttonClassName,
  buttonLabelVisibility,
  buttonSize,
}: {
  canRedo: boolean
  canUndo: boolean
  editorInteractionsEnabled: boolean
  onRedo: () => void
  onUndo: () => void
  buttonClassName?: string
  buttonLabelVisibility?: ComponentProps<typeof ToolButton>['labelVisibility']
  buttonSize?: ComponentProps<typeof ToolButton>['size']
}) {
  const undoDisabled = !canUndo || !editorInteractionsEnabled
  const redoDisabled = !canRedo || !editorInteractionsEnabled
  const undoDisabledMessage = !editorInteractionsEnabled
    ? 'Editor interactions are unavailable while loading'
    : 'No previous history'
  const redoDisabledMessage = !editorInteractionsEnabled
    ? 'Editor interactions are unavailable while loading'
    : 'No next history'

  return (
    <ButtonGroup aria-label="History Actions">
      <ToolButton
        action={onUndo}
        disabled={undoDisabled}
        disabledMessage={undoDisabledMessage}
        shortcuts="Control+Z"
        label="Undo"
        labelVisibility={buttonLabelVisibility}
        icon={<IconArrowBackUp />}
        size={buttonSize}
        className={buttonClassName}
      />
      <ToolButton
        action={onRedo}
        disabled={redoDisabled}
        disabledMessage={redoDisabledMessage}
        shortcuts="Control+Shift+Z Control+Y"
        label="Redo"
        labelVisibility={buttonLabelVisibility}
        icon={<IconArrowForwardUp />}
        size={buttonSize}
        className={buttonClassName}
      />
    </ButtonGroup>
  )
}
