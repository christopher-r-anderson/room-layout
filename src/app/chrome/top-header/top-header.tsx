import { useEffect } from 'react'
import { KeyboardShortcutsDialog } from '@/features/keyboard/keyboard-shortcuts-help'
import { ProjectInfoDialog } from '@/features/project-info/project-info-dialog'
import { StartOverConfirmationDialog } from '@/features/startup/start-over-confirmation-dialog'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { TopHeaderDesktop } from './top-header-desktop'
import { TopHeaderMobile } from './top-header-mobile'
import type { TopHeaderContainerProps } from './top-header.types'
import {
  dialogActions,
  useDialogOpen,
  useIsBlockingOverlayOpen,
} from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { useEnvironmentConfig } from '@/core/stores/assets-store'
import { useSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { resetSceneToDefaults } from '@/core/persistence/scene-reset'
import { feedbackActions } from '@/core/stores/feedback-store'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useActiveFinishIds } from '@/app/controllers/_shared/use-active-finish-ids'
import {
  sceneDocumentActions,
  useFloorFinishId,
  useFloorFinishLoading,
  useHistoryAvailability,
  useWallFinishId,
} from '@/core/stores/scene-document-store'
import { toast } from 'sonner'
import { topHeaderDialogOpenChange } from './top-header-dialog-bindings'
import { headerFocusRegistry } from './header-focus-registry'

const STARTED_OVER_MESSAGE = 'Started over. Your changes were cleared.'

export function TopHeader({
  onShareSceneUrl,
  topHeaderRef,
  desktopRoomSidebarRef,
  mobileRoomDrawerRef,
}: TopHeaderContainerProps) {
  const dispatch = useCommandDispatch()
  const environmentConfig = useEnvironmentConfig()
  const startOverDisabled = useSceneIsAtDefaults()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const historyAvailability = useHistoryAvailability()
  const storedFloorFinishId = useFloorFinishId()
  const storedWallFinishId = useWallFinishId()
  const floorFinishLoading = useFloorFinishLoading()
  const isCatalogDrawerOpen = useDialogOpen(DIALOG_IDS.catalog)
  const isRoomSurfaceOpen = useDialogOpen(DIALOG_IDS.roomSurface)
  const isInfoDialogOpen = useDialogOpen(DIALOG_IDS.projectInfo)
  const isKeyboardShortcutsDialogOpen = useDialogOpen(
    DIALOG_IDS.keyboardShortcuts,
  )
  const isHeaderMoreActionsOpen = useDialogOpen(DIALOG_IDS.headerMoreActions)
  const isStartOverDialogOpen = useDialogOpen(DIALOG_IDS.startOver)
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const layoutMode = useHeaderLayoutMode()
  const {
    activeFloorFinishId: floorFinishId,
    activeWallFinishId: wallFinishId,
  } = useActiveFinishIds({
    environmentConfig,
    floorFinishId: storedFloorFinishId,
    wallFinishId: storedWallFinishId,
  })

  // More actions is mobile-only and blocking. It has no desktop equivalent, so
  // if the viewport widens while it is open we close it to avoid leaving the
  // blocking-overlay state active with no surface able to dismiss it.
  useEffect(() => {
    if (layoutMode === 'desktop' && isHeaderMoreActionsOpen) {
      dialogActions.setDialogOpen(DIALOG_IDS.headerMoreActions, false)
    }
  }, [layoutMode, isHeaderMoreActionsOpen])

  const focusMoreActionsTrigger = () => {
    headerFocusRegistry.focus('top-header-more-actions')
  }

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
    isCatalogDrawerOpen,
    editorInteractionsEnabled,
    floorFinishId,
    floorFinishLoading,
    floorFinishes: environmentConfig?.floorFinishes ?? [],
    history: {
      canRedo: historyAvailability.canRedo,
      canUndo: historyAvailability.canUndo,
    },
    onFloorFinishChange: sceneDocumentActions.setFloorFinishId,
    onWallFinishChange: sceneDocumentActions.setWallFinishId,
    startOverDisabled,
    onShareSceneUrl,
    topHeaderRef,
    wallFinishId,
    wallFinishes: environmentConfig?.wallFinishes ?? [],
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

      <KeyboardShortcutsDialog
        open={isKeyboardShortcutsDialogOpen}
        onOpenChange={(open) => {
          topHeaderDialogOpenChange.keyboardShortcuts(open)

          // Desktop relies on Base UI restoring focus to the trigger. On
          // mobile the dialog is opened from the More actions drawer, so send
          // focus back to that trigger explicitly.
          if (!open && layoutMode === 'mobile') {
            focusMoreActionsTrigger()
          }
        }}
        triggerButton={null}
      />

      <ProjectInfoDialog
        open={isInfoDialogOpen}
        onOpenChange={(open) => {
          topHeaderDialogOpenChange.projectInfo(open)

          if (!open && layoutMode === 'mobile') {
            focusMoreActionsTrigger()
          }
        }}
        triggerButton={null}
      />

      <StartOverConfirmationDialog
        open={isStartOverDialogOpen}
        onClose={() => {
          dialogActions.closeActiveDialog()

          if (layoutMode === 'mobile') {
            focusMoreActionsTrigger()
          }
        }}
        onConfirm={() => {
          dialogActions.closeActiveDialog()
          resetSceneToDefaults()
          feedbackActions.announcePolite(STARTED_OVER_MESSAGE)
          toast.success(STARTED_OVER_MESSAGE)

          // The Start Over button becomes disabled after the reset, so move
          // focus to the next enabled header control on desktop. On mobile the
          // dialog was opened from More actions, so return focus there.
          if (layoutMode === 'desktop') {
            headerFocusRegistry.focusNextEnabled('top-header-start-over')
            return
          }

          focusMoreActionsTrigger()
        }}
      />
    </>
  )
}
