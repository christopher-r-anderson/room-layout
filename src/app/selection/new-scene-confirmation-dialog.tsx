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

export function NewSceneConfirmationDialog({
  onClose,
  onConfirm,
  open,
}: {
  onClose: () => void
  onConfirm: () => void
  open: boolean
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <AlertDialogContent size="sm" id="confirm-new-scene-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Start over with a new scene?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears your current changes and resets the room to the default
            scene.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>New Scene</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
