import { useRef } from 'react'
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
import type { FurnitureItem } from '@/app/scene-object.types'

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
  const suppressCloseAutoFocusRef = useRef(false)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <AlertDialogContent
        size="sm"
        id="confirm-delete-dialog"
        finalFocus={() => {
          if (!suppressCloseAutoFocusRef.current) {
            return true
          }

          suppressCloseAutoFocusRef.current = false
          return false
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Remove item from room?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDeleteFurniture
              ? `Remove ${pendingDeleteFurniture.name} from your room layout?`
              : 'Remove the selected item from your room layout?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              suppressCloseAutoFocusRef.current = false
              onClose()
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              suppressCloseAutoFocusRef.current = true
              onConfirm()
            }}
          >
            Remove item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
