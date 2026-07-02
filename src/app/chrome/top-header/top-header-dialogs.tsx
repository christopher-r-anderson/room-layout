import { useEffect } from 'react'
import { KeyboardShortcutsDialog } from '@/features/keyboard/keyboard-shortcuts-help'
import { ProjectInfoDialog } from '@/features/project-info/project-info-dialog'
import { StartOverConfirmationDialog } from '@/features/startup/start-over-confirmation-dialog'
import { confirmStartOver } from '@/features/startup/start-over-actions'
import { dialogActions, useDialogOpen } from '@/core/stores/dialog-store'
import { KEYBOARD_SHORTCUTS_DIALOG_ID } from '@/features/keyboard/keyboard-shortcuts-dialog-definition'
import { PROJECT_INFO_DIALOG_ID } from '@/features/project-info/project-info-dialog-definition'
import { START_OVER_DIALOG_ID } from '@/features/startup/start-over-dialog-definition'
import { HEADER_MORE_ACTIONS_DIALOG_ID } from './header-more-actions-dialog-definition'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { topHeaderFocusRegistry } from './top-header-focus'

/**
 * Hosts the header-triggered dialogs and the focus return that pairs with them.
 * Desktop relies on Base UI restoring focus to each trigger; on mobile these
 * dialogs are opened from the More actions drawer, whose trigger is gone by the
 * time they close, so focus is sent back to it explicitly.
 */
export function TopHeaderDialogs() {
  const layoutMode = useHeaderLayoutMode()
  const isKeyboardShortcutsOpen = useDialogOpen(KEYBOARD_SHORTCUTS_DIALOG_ID)
  const isProjectInfoOpen = useDialogOpen(PROJECT_INFO_DIALOG_ID)
  const isStartOverOpen = useDialogOpen(START_OVER_DIALOG_ID)
  const isHeaderMoreActionsOpen = useDialogOpen(HEADER_MORE_ACTIONS_DIALOG_ID)

  // More actions is mobile-only and blocking. It has no desktop equivalent, so
  // if the viewport widens while it is open we close it to avoid leaving the
  // blocking-overlay state active with no surface able to dismiss it.
  useEffect(() => {
    if (layoutMode === 'desktop' && isHeaderMoreActionsOpen) {
      dialogActions.setDialogOpen(HEADER_MORE_ACTIONS_DIALOG_ID, false)
    }
  }, [layoutMode, isHeaderMoreActionsOpen])

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
          dialogActions.setDialogOpen(KEYBOARD_SHORTCUTS_DIALOG_ID, open)

          if (!open) {
            returnFocusToMoreActionsOnMobile()
          }
        }}
      />

      <ProjectInfoDialog
        open={isProjectInfoOpen}
        onOpenChange={(open) => {
          dialogActions.setDialogOpen(PROJECT_INFO_DIALOG_ID, open)

          if (!open) {
            returnFocusToMoreActionsOnMobile()
          }
        }}
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
