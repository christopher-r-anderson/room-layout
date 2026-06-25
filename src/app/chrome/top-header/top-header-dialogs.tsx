import { KeyboardShortcutsDialog } from '@/features/keyboard/keyboard-shortcuts-help'
import { ProjectInfoDialog } from '@/features/project-info/project-info-dialog'
import { StartOverConfirmationDialog } from '@/features/startup/start-over-confirmation-dialog'
import { confirmStartOver } from '@/features/startup/start-over-actions'
import { dialogActions, useDialogOpen } from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { topHeaderDialogOpenChange } from './top-header-dialog-bindings'
import { topHeaderFocusRegistry } from './top-header-focus'

/**
 * Hosts the header-triggered dialogs and the focus return that pairs with them.
 * Desktop relies on Base UI restoring focus to each trigger; on mobile these
 * dialogs are opened from the More actions drawer, whose trigger is gone by the
 * time they close, so focus is sent back to it explicitly.
 */
export function TopHeaderDialogs() {
  const layoutMode = useHeaderLayoutMode()
  const isKeyboardShortcutsOpen = useDialogOpen(DIALOG_IDS.keyboardShortcuts)
  const isProjectInfoOpen = useDialogOpen(DIALOG_IDS.projectInfo)
  const isStartOverOpen = useDialogOpen(DIALOG_IDS.startOver)

  const returnFocusToMoreActionsOnMobile = () => {
    if (layoutMode === 'mobile') {
      topHeaderFocusRegistry.focus('top-header-more-actions')
    }
  }

  return (
    <>
      <KeyboardShortcutsDialog
        open={isKeyboardShortcutsOpen}
        onOpenChange={(open) => {
          topHeaderDialogOpenChange.keyboardShortcuts(open)

          if (!open) {
            returnFocusToMoreActionsOnMobile()
          }
        }}
        triggerButton={null}
      />

      <ProjectInfoDialog
        open={isProjectInfoOpen}
        onOpenChange={(open) => {
          topHeaderDialogOpenChange.projectInfo(open)

          if (!open) {
            returnFocusToMoreActionsOnMobile()
          }
        }}
        triggerButton={null}
      />

      <StartOverConfirmationDialog
        open={isStartOverOpen}
        onClose={() => {
          dialogActions.closeActiveDialog()
          returnFocusToMoreActionsOnMobile()
        }}
        onConfirm={() => {
          confirmStartOver()

          // The Start Over button becomes disabled after the reset, so on
          // desktop move focus to the next enabled header control. On mobile the
          // dialog was opened from More actions, so return focus there.
          if (layoutMode === 'desktop') {
            topHeaderFocusRegistry.focusNextEnabled('top-header-start-over')
            return
          }

          returnFocusToMoreActionsOnMobile()
        }}
      />
    </>
  )
}
