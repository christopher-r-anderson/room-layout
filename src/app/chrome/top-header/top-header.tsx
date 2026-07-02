import { useEffect } from 'react'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { TopHeaderDesktop } from './top-header-desktop'
import { TopHeaderMobile } from './top-header-mobile'
import { TopHeaderDialogs } from './top-header-dialogs'
import {
  dialogActions,
  useDialogOpen,
  useIsBlockingOverlayOpen,
} from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import { useSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { useHistoryAvailability } from '@/core/stores/scene-document-store'

export function TopHeader() {
  const startOverDisabled = useSceneIsAtDefaults()
  const historyAvailability = useHistoryAvailability()
  const isRoomSurfaceOpen = useDialogOpen(DIALOG_IDS.roomSurface)
  const isInfoDialogOpen = useDialogOpen(DIALOG_IDS.projectInfo)
  const isKeyboardShortcutsDialogOpen = useDialogOpen(
    DIALOG_IDS.keyboardShortcuts,
  )
  const isHeaderMoreActionsOpen = useDialogOpen(DIALOG_IDS.headerMoreActions)
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const layoutMode = useHeaderLayoutMode()

  // More actions is mobile-only and blocking. It has no desktop equivalent, so
  // if the viewport widens while it is open we close it to avoid leaving the
  // blocking-overlay state active with no surface able to dismiss it.
  useEffect(() => {
    if (layoutMode === 'desktop' && isHeaderMoreActionsOpen) {
      dialogActions.setDialogOpen(DIALOG_IDS.headerMoreActions, false)
    }
  }, [layoutMode, isHeaderMoreActionsOpen])

  const sharedToolbarProps = {
    history: {
      canRedo: historyAvailability.canRedo,
      canUndo: historyAvailability.canUndo,
    },
    startOverDisabled,
  } as const

  return (
    <>
      {layoutMode === 'mobile' ? (
        <TopHeaderMobile
          {...sharedToolbarProps}
          isRoomSurfaceOpen={isRoomSurfaceOpen}
          isHeaderMoreActionsOpen={isHeaderMoreActionsOpen}
          blockingOverlayOpen={isBlockingOverlayOpen}
        />
      ) : (
        <TopHeaderDesktop
          {...sharedToolbarProps}
          isRoomSurfaceOpen={isRoomSurfaceOpen}
          isKeyboardShortcutsOpen={isKeyboardShortcutsDialogOpen}
          isProjectInfoOpen={isInfoDialogOpen}
        />
      )}

      <TopHeaderDialogs />
    </>
  )
}
