import { Trans } from '@lingui/react/macro'
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
          <AlertDialogTitle>
            <Trans>Start over?</Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans>
              This clears your current changes and restores the default room.
            </Trans>
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
            onClick={() => {
              suppressCloseAutoFocusRef.current = true
              onConfirm()
            }}
          >
            <Trans>Start Over</Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
