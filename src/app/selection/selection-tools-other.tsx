import { ButtonGroup } from '@/components/ui/button-group'
import { IconRotate3d, IconTrash } from '@tabler/icons-react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { ToolButton } from '@/components/ui/tool-button'

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
      <ToolButton
        action={() => {
          onRotateSelection(1)
        }}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
        shortcuts=","
        label="Rotate counterclockwise"
        icon={<IconRotate3d className="-scale-x-100" />}
      />
      <ToolButton
        action={() => {
          onRotateSelection(-1)
        }}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
        shortcuts="."
        label="Rotate clockwise"
        icon={<IconRotate3d />}
      />
      <ToolButton
        action={onOpenDeleteDialog}
        disabled={controlsDisabled}
        disabledMessage={disabledMessage}
        shortcuts="Delete Backspace"
        label="Remove item"
        icon={<IconTrash />}
        onPointerDown={() => {
          onPrepareDelete?.()
        }}
      />
    </ButtonGroup>
  )
}
