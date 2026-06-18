import { ButtonGroup } from '@/shared/ui/button-group'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import {
  DeleteButton,
  RotateClockwiseButton,
  RotateCounterclockwiseButton,
} from './components/selection-action-buttons'

export function SelectionToolsOther({
  editorInteractionsEnabled,
  onOpenDeleteDialog,
  onPrepareDelete,
  onRotateSelection,
  selectedFurniture,
}: {
  editorInteractionsEnabled: boolean
  onOpenDeleteDialog: () => void
  onPrepareDelete?: () => void
  onRotateSelection: (direction: -1 | 1) => void
  selectedFurniture: FurnitureItem | null
}) {
  const controlsDisabled = !editorInteractionsEnabled || !selectedFurniture
  const disabledMessage = !editorInteractionsEnabled
    ? 'Editor interactions are unavailable while loading'
    : 'No item selected'

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
