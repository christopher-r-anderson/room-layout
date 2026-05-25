import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

export function DeleteConfirmationDialog({
  onClose,
  onConfirm,
  open,
  pendingDeleteFurniture,
}: {
  onClose: () => void
  onConfirm: () => void
  open: boolean
  pendingDeleteFurniture: FurnitureItem | null
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <AlertDialogContent size="sm" id="confirm-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove item from room?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDeleteFurniture
              ? `Remove ${pendingDeleteFurniture.name} from your room layout?`
              : 'Remove the selected item from your room layout?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Remove item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
