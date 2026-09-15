import { Toolbar } from '@base-ui/react/toolbar'
import { useLingui } from '@lingui/react/macro'
import { IconRotate3d, IconTrash } from '@tabler/icons-react'
import { cn } from '@/shared/lib/utils'
import { buttonGroupVariants } from '@/shared/ui/button-group-variants'
import { ToolbarCommandButton } from '@/shared/ui/toolbar-button'

export function SelectedItemTools({
  onOpenDeleteDialog,
  onPrepareDelete,
  onRotateSelection,
}: {
  onOpenDeleteDialog: () => void
  onPrepareDelete?: () => void
  onRotateSelection: (direction: -1 | 1) => void
}) {
  const { t } = useLingui()

  return (
    <Toolbar.Root
      aria-label={t`Selected item actions`}
      className={cn(buttonGroupVariants({ orientation: 'horizontal' }))}
    >
      <ToolbarCommandButton
        showLabel={false}
        shortcuts=","
        label={t`Rotate counterclockwise`}
        icon={<IconRotate3d className="-scale-x-100" />}
        onClick={() => {
          onRotateSelection(1)
        }}
      />
      <ToolbarCommandButton
        showLabel={false}
        shortcuts="."
        label={t`Rotate clockwise`}
        icon={<IconRotate3d />}
        onClick={() => {
          onRotateSelection(-1)
        }}
      />
      <ToolbarCommandButton
        showLabel={false}
        shortcuts="Delete Backspace"
        label={t`Remove item`}
        icon={<IconTrash />}
        onClick={onOpenDeleteDialog}
        onPointerDown={() => {
          onPrepareDelete?.()
        }}
      />
    </Toolbar.Root>
  )
}
