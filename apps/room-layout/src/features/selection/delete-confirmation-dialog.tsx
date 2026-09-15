import { useRef } from 'react'
import { Trans } from '@lingui/react/macro'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import type { FurnitureItem } from '@/domain/furniture'

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
          <AlertDialogTitle>
            <Trans>Remove item from room?</Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDeleteFurniture ? (
              <Trans>
                Remove {pendingDeleteFurniture.name} from your room layout?
              </Trans>
            ) : (
              <Trans>Remove the selected item from your room layout?</Trans>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              suppressCloseAutoFocusRef.current = false
              onClose()
            }}
          >
            <Trans>Cancel</Trans>
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              suppressCloseAutoFocusRef.current = true
              onConfirm()
            }}
          >
            <Trans>Remove item</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
