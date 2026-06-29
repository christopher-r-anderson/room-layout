import { useEffect } from 'react'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { TopHeaderDesktop } from './top-header-desktop'
import { TopHeaderMobile } from './top-header-mobile'
import { TopHeaderDialogs } from './top-header-dialogs'
import type { TopHeaderContainerProps } from './top-header.types'
import {
  dialogActions,
  useDialogOpen,
  useIsBlockingOverlayOpen,
} from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { useSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useHistoryAvailability } from '@/core/stores/scene-document-store'
import { topHeaderDialogOpenChange } from './top-header-dialog-bindings'

export function TopHeader({
  topHeaderRef,
  desktopRoomSidebarRef,
  mobileRoomDrawerRef,
}: TopHeaderContainerProps) {
  const dispatch = useCommandDispatch()
  const startOverDisabled = useSceneIsAtDefaults()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
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

  // Handing off from More actions to another dialog: close the drawer first,
  // then open the target on the next microtask so the drawer's focus handling
  // settles before the next surface traps focus.
  const openFromHeaderMoreActions = (open: () => void) => {
    topHeaderDialogOpenChange.headerMoreActions(false)
    queueMicrotask(open)
  }

  const onOpenKeyboardShortcutsFromHeaderMoreActions = () => {
    openFromHeaderMoreActions(() => {
      topHeaderDialogOpenChange.keyboardShortcuts(true)
    })
  }

  const onOpenProjectInfoFromHeaderMoreActions = () => {
    openFromHeaderMoreActions(() => {
      topHeaderDialogOpenChange.projectInfo(true)
    })
  }

  const onOpenStartOverFromHeaderMoreActions = () => {
    openFromHeaderMoreActions(() => {
      dispatch({ kind: 'start-over' })
    })
  }

  const sharedToolbarProps = {
    editorInteractionsEnabled,
    history: {
      canRedo: historyAvailability.canRedo,
      canUndo: historyAvailability.canUndo,
    },
    startOverDisabled,
    topHeaderRef,
  } as const

  return (
    <>
      {layoutMode === 'mobile' ? (
        <TopHeaderMobile
          {...sharedToolbarProps}
          mobileRoomDrawerRef={mobileRoomDrawerRef}
          isRoomSurfaceOpen={isRoomSurfaceOpen}
          isHeaderMoreActionsOpen={isHeaderMoreActionsOpen}
          blockingOverlayOpen={isBlockingOverlayOpen}
          onOpenKeyboardShortcutsFromHeaderMoreActions={
            onOpenKeyboardShortcutsFromHeaderMoreActions
          }
          onOpenStartOverFromHeaderMoreActions={
            onOpenStartOverFromHeaderMoreActions
          }
          onOpenProjectInfoFromHeaderMoreActions={
            onOpenProjectInfoFromHeaderMoreActions
          }
        />
      ) : (
        <TopHeaderDesktop
          {...sharedToolbarProps}
          desktopRoomSidebarRef={desktopRoomSidebarRef}
          isRoomSurfaceOpen={isRoomSurfaceOpen}
          isKeyboardShortcutsOpen={isKeyboardShortcutsDialogOpen}
          isProjectInfoOpen={isInfoDialogOpen}
        />
      )}

      <TopHeaderDialogs />
    </>
  )
}
