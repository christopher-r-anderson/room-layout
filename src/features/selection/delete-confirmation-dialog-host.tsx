import {
  dialogActions,
  useDialogOpen,
  useDialogPayload,
} from '@/core/stores/dialog-store'
import type { FurnitureItem } from '@/domain/furniture'
import { deleteDialogId } from './delete-dialog-definition'
import { DeleteConfirmationDialog } from './delete-confirmation-dialog'
import { confirmDeleteSelection } from './deletion-actions'

/**
 * Connects the delete-confirmation dialog to its store-backed open state and the
 * selection it acts on. Hosted here, with the trigger and confirm logic it
 * belongs to, rather than in the app chrome.
 */
export function DeleteConfirmationDialogHost() {
  const open = useDialogOpen(deleteDialogId)
  const pendingDeleteFurniture = useDialogPayload(
    deleteDialogId,
  ) as FurnitureItem | null

  return (
    <DeleteConfirmationDialog
      open={open}
      pendingDeleteFurniture={pendingDeleteFurniture}
      onClose={dialogActions.closeActiveDialog}
      onConfirm={() => {
        confirmDeleteSelection(pendingDeleteFurniture)
      }}
    />
  )
}
