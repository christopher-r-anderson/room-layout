import { ButtonGroup } from '@/components/ui/button-group'
import { IconRotate3d, IconTrash } from '@tabler/icons-react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { ToolButton } from '@/components/ui/tool-button'

export function SelectionToolsOther({
  editorInteractionsEnabled,
  onOpenDeleteDialog,
  onRotateSelection,
  selectedFurniture,
}: {
  editorInteractionsEnabled: boolean
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  selectedFurniture: FurnitureItem | null
}) {
  const controlsDisabled = !editorInteractionsEnabled || !selectedFurniture

  return (
    <ButtonGroup aria-label="Selection Other Actions">
      <ToolButton
        action={onOpenDeleteDialog}
        disabled={controlsDisabled}
        disabledMessage="No item selected"
        shortcuts="Delete Backspace"
        label="Delete"
        icon={<IconTrash />}
      />
      <ToolButton
        action={() => {
          onRotateSelection(1)
        }}
        disabled={controlsDisabled}
        disabledMessage="No item selected"
        shortcuts="Q"
        label="Rotate Left"
        icon={<IconRotate3d className="-x-scale-100" />}
      />
      <ToolButton
        action={() => {
          onRotateSelection(-1)
        }}
        disabled={controlsDisabled}
        disabledMessage="No item selected"
        shortcuts="E"
        label="Rotate Right"
        icon={<IconRotate3d />}
      />
    </ButtonGroup>
  )
}
