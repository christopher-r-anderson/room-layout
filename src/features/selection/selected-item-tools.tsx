import { Toolbar } from '@base-ui/react/toolbar'
import { cn } from '@/shared/lib/utils'
import { buttonGroupVariants } from '@/shared/ui/button-group-variants'
import {
  DeleteButton,
  RotateClockwiseButton,
  RotateCounterclockwiseButton,
} from './selection-action-buttons'

export function SelectedItemTools({
  controlsDisabled,
  disabledMessage,
  onOpenDeleteDialog,
  onPrepareDelete,
  onRotateSelection,
}: {
  controlsDisabled: boolean
  disabledMessage: string
  onOpenDeleteDialog: () => void
  onPrepareDelete?: () => void
  onRotateSelection: (direction: -1 | 1) => void
}) {
  return (
    <Toolbar.Root
      aria-label="Selected item actions"
      className={cn(buttonGroupVariants({ orientation: 'horizontal' }))}
    >
      <RotateCounterclockwiseButton
        asToolbarItem
        displayLabel={false}
        action={() => {
          onRotateSelection(1)
        }}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
      />
      <RotateClockwiseButton
        asToolbarItem
        displayLabel={false}
        action={() => {
          onRotateSelection(-1)
        }}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
      />
      <DeleteButton
        asToolbarItem
        displayLabel={false}
        action={onOpenDeleteDialog}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
        onPointerDown={() => {
          onPrepareDelete?.()
        }}
      />
    </Toolbar.Root>
  )
}
