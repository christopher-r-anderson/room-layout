import { ButtonGroup } from '@/components/ui/button-group'
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react'
import { ToolButton } from '@/components/ui/tool-button'

export function HistoryTools({
  canRedo,
  canUndo,
  editorInteractionsEnabled,
  onRedo,
  onUndo,
}: {
  canRedo: boolean
  canUndo: boolean
  editorInteractionsEnabled: boolean
  onRedo: () => void
  onUndo: () => void
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
        icon={<IconArrowBackUp />}
      />
      <ToolButton
        action={onRedo}
        disabled={redoDisabled}
        disabledMessage={redoDisabledMessage}
        shortcuts="Control+Shift+Z Control+Y"
        label="Redo"
        icon={<IconArrowForwardUp />}
      />
    </ButtonGroup>
  )
}
