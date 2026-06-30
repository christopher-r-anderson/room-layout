import { Toolbar } from '@base-ui/react/toolbar'
import { IconRotate3d, IconTrash } from '@tabler/icons-react'
import { cn } from '@/shared/lib/utils'
import { buttonGroupVariants } from '@/shared/ui/button-group-variants'
import { ToolButton } from '@/shared/ui/tool-button'

export function SelectedItemTools({
  onOpenDeleteDialog,
  onPrepareDelete,
  onRotateSelection,
}: {
  onOpenDeleteDialog: () => void
  onPrepareDelete?: () => void
  onRotateSelection: (direction: -1 | 1) => void
}) {
  return (
    <Toolbar.Root
      aria-label="Selected item actions"
      className={cn(buttonGroupVariants({ orientation: 'horizontal' }))}
    >
      <ToolButton
        displayLabel={false}
        shortcuts=","
        label="Rotate counterclockwise"
        icon={<IconRotate3d className="-scale-x-100" />}
        action={() => {
          onRotateSelection(1)
        }}
      />
      <ToolButton
        displayLabel={false}
        shortcuts="."
        label="Rotate clockwise"
        icon={<IconRotate3d />}
        action={() => {
          onRotateSelection(-1)
        }}
      />
      <ToolButton
        displayLabel={false}
        shortcuts="Delete Backspace"
        label="Remove item"
        icon={<IconTrash />}
        action={onOpenDeleteDialog}
        onPointerDown={() => {
          onPrepareDelete?.()
        }}
      />
    </Toolbar.Root>
  )
}
