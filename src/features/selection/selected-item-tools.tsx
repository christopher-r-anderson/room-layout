import { ButtonGroup } from '@/shared/ui/button-group'
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
    <ButtonGroup aria-label="Selected item actions">
      <RotateCounterclockwiseButton
        displayLabel={false}
        action={() => {
          onRotateSelection(1)
        }}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
      />
      <RotateClockwiseButton
        displayLabel={false}
        action={() => {
          onRotateSelection(-1)
        }}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
      />
      <DeleteButton
        displayLabel={false}
        action={onOpenDeleteDialog}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
        onPointerDown={() => {
          onPrepareDelete?.()
        }}
      />
    </ButtonGroup>
  )
}
