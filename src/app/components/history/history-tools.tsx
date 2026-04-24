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
  return (
    <ButtonGroup aria-label="History Actions">
      <ToolButton
        action={onUndo}
        disabled={!canUndo || !editorInteractionsEnabled}
        disabledMessage="No previous history"
        shortcuts="Control+Z"
        label="Undo"
        icon={<IconArrowBackUp />}
      />
      <ToolButton
        action={onRedo}
        disabled={!canRedo || !editorInteractionsEnabled}
        disabledMessage="No next history"
        shortcuts="Control+Shift+Z Control+Y"
        label="Redo"
        icon={<IconArrowForwardUp />}
      />
    </ButtonGroup>
  )
}
