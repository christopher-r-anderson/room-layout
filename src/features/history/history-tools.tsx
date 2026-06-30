import { Toolbar } from '@base-ui/react/toolbar'
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react'
import { cn } from '@/shared/lib/utils'
import { buttonGroupVariants } from '@/shared/ui/button-group-variants'
import { ToolButton } from '@/shared/ui/tool-button'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import type { ComponentProps } from 'react'

export function HistoryTools({
  canRedo,
  canUndo,
  buttonClassName,
  displayLabels,
  buttonSize,
}: {
  canRedo: boolean
  canUndo: boolean
  buttonClassName?: string
  displayLabels?: boolean
  buttonSize?: ComponentProps<typeof ToolButton>['size']
}) {
  const dispatch = useCommandDispatch()
  const undoDisabled = !canUndo
  const redoDisabled = !canRedo
  const undoDisabledMessage = 'No previous history'
  const redoDisabledMessage = 'No next history'

  return (
    <Toolbar.Group
      aria-label="History Actions"
      className={cn(buttonGroupVariants({ orientation: 'horizontal' }))}
    >
      <ToolButton
        action={() => {
          dispatch({ kind: 'undo' })
        }}
        disabled={undoDisabled}
        disabledMessage={undoDisabledMessage}
        shortcuts="Control+Z"
        label="Undo"
        displayLabel={displayLabels}
        icon={<IconArrowBackUp />}
        size={buttonSize}
        className={buttonClassName}
      />
      <ToolButton
        action={() => {
          dispatch({ kind: 'redo' })
        }}
        disabled={redoDisabled}
        disabledMessage={redoDisabledMessage}
        shortcuts="Control+Shift+Z Control+Y"
        label="Redo"
        displayLabel={displayLabels}
        icon={<IconArrowForwardUp />}
        size={buttonSize}
        className={buttonClassName}
      />
    </Toolbar.Group>
  )
}
