import { Toolbar } from '@base-ui/react/toolbar'
import { useLingui } from '@lingui/react/macro'
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react'
import { cn } from '@/shared/lib/utils'
import { buttonGroupVariants } from '@/shared/ui/button-group-variants'
import { ToolbarCommandButton } from '@/shared/ui/toolbar-button'
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
  buttonSize?: ComponentProps<typeof ToolbarCommandButton>['size']
}) {
  const { t } = useLingui()
  const dispatch = useCommandDispatch()
  const undoDisabled = !canUndo
  const redoDisabled = !canRedo
  const undoDisabledMessage = t`No previous history`
  const redoDisabledMessage = t`No next history`

  return (
    <Toolbar.Group
      aria-label={t`History Actions`}
      className={cn(buttonGroupVariants({ orientation: 'horizontal' }))}
    >
      <ToolbarCommandButton
        onClick={(event) => {
          dispatch({
            kind: 'undo',
            modality: event.detail === 0 ? 'keyboard' : 'pointer',
          })
        }}
        disabled={undoDisabled}
        disabledMessage={undoDisabledMessage}
        shortcuts="Control+Z"
        label={t`Undo`}
        showLabel={displayLabels}
        icon={<IconArrowBackUp />}
        size={buttonSize}
        className={buttonClassName}
      />
      <ToolbarCommandButton
        onClick={(event) => {
          dispatch({
            kind: 'redo',
            modality: event.detail === 0 ? 'keyboard' : 'pointer',
          })
        }}
        disabled={redoDisabled}
        disabledMessage={redoDisabledMessage}
        shortcuts="Control+Shift+Z Control+Y"
        label={t`Redo`}
        showLabel={displayLabels}
        icon={<IconArrowForwardUp />}
        size={buttonSize}
        className={buttonClassName}
      />
    </Toolbar.Group>
  )
}
