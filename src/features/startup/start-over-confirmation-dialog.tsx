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
} from '@/shared/ui/alert-dialog'

export function StartOverConfirmationDialog({
  onClose,
  onConfirm,
  open,
}: {
  onClose: () => void
  onConfirm: () => void
  open: boolean
}) {
  const suppressCloseAutoFocusRef = useRef(false)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <AlertDialogContent
        size="sm"
        id="confirm-start-over-dialog"
        finalFocus={() => {
          if (!suppressCloseAutoFocusRef.current) {
            return true
          }

          suppressCloseAutoFocusRef.current = false
          return false
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Start over?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears your current changes and restores the default room.
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
            onClick={() => {
              suppressCloseAutoFocusRef.current = true
              onConfirm()
            }}
          >
            Start Over
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
