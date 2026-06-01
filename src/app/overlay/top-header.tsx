import { useEffect, useId } from 'react'
import { KeyboardShortcutsDialog } from '@/app/keyboard/keyboard-shortcuts-help'
import { ProjectInfoDialog } from '@/app/project-info/project-info-dialog'
import { StartOverConfirmationDialog } from '@/app/selection/start-over-confirmation-dialog'
import { useHeaderLayoutMode } from './use-header-layout-mode'
import { TopHeaderDesktop } from './top-header-desktop'
import { TopHeaderMobile } from './top-header-mobile'
import type { TopHeaderContainerProps } from './top-header.types'
import type {
  DialogOpenOptions,
  DialogReturnFocusTarget,
} from '@/editor-state/dialog-store'
import {
  dialogActions,
  useIsBlockingOverlayOpen,
  useIsCatalogDrawerOpen,
  useIsHeaderMoreActionsOpen,
  useIsInfoDialogOpen,
  useIsKeyboardShortcutsDialogOpen,
  useIsRoomSurfaceOpen,
  useIsStartOverDialogOpen,
  useReturnFocusTarget,
  useRoomSurfaceLayout,
} from '@/editor-state/dialog-store'
import {
  useEditorInteractionsEnabled,
  useFloorFinishLoading,
  useStartupOverlayActive,
} from '@/editor-state/editor-runtime-store'
import {
  sceneStateActions,
  useFloorFinishId,
  useHistoryAvailability,
  useWallFinishId,
} from '@/editor-state/scene-state-store'

const HEADER_CONTROL_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

function isEnabledHeaderControl(element: HTMLElement) {
  if (element.matches('[disabled], [aria-disabled="true"]')) {
    return false
  }

  if (element.closest('[aria-hidden="true"], [inert]')) {
    return false
  }

  return true
}

function findHeaderFocusFallback(target: HTMLElement) {
  const headerRoot = target.closest<HTMLElement>('[data-top-header-root]')

  if (!headerRoot) {
    return null
  }

  const controls = Array.from(
    headerRoot.querySelectorAll<HTMLElement>(HEADER_CONTROL_SELECTOR),
  )

  if (controls.length === 0) {
    return null
  }

  const targetIndex = controls.indexOf(target)

  if (targetIndex === -1) {
    return controls.find(isEnabledHeaderControl) ?? null
  }

  for (let index = targetIndex + 1; index < controls.length; index += 1) {
    const candidate = controls[index]

    if (isEnabledHeaderControl(candidate)) {
      return candidate
    }
  }

  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const candidate = controls[index]

    if (isEnabledHeaderControl(candidate)) {
      return candidate
    }
  }

  return null
}

function focusControlById(id: string) {
  const focus = () => {
    const element = document.getElementById(id)

    if (!(element instanceof HTMLElement)) {
      return
    }

    if (isEnabledHeaderControl(element)) {
      element.focus()
      return
    }

    findHeaderFocusFallback(element)?.focus()
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      focus()
    })
    return
  }

  queueMicrotask(focus)
}

function focusNextHeaderControlById(id: string) {
  const focus = () => {
    const element = document.getElementById(id)

    if (!(element instanceof HTMLElement)) {
      return
    }

    findHeaderFocusFallback(element)?.focus()
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      focus()
    })
    return
  }

  queueMicrotask(focus)
}

export function TopHeader({
  catalog,
  environmentConfig,
  catalogIdToAdd,
  onAddFurniture,
  onCatalogDrawerOpenChange,
  onCatalogIdToAddChange,
  onConfirmStartOver,
  onLayoutModeChange,
  onOpenStartOverDialog,
  onRedo,
  onShareSceneUrl,
  onUndo,
  startOverDisabled = false,
  topHeaderRef,
  desktopRoomSidebarRef,
  mobileRoomDrawerRef,
}: TopHeaderContainerProps) {
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const startupOverlayActive = useStartupOverlayActive()
  const historyAvailability = useHistoryAvailability()
  const storedFloorFinishId = useFloorFinishId()
  const storedWallFinishId = useWallFinishId()
  const floorFinishLoading = useFloorFinishLoading()
  const roomSurfaceLayout = useRoomSurfaceLayout()
  const returnFocusTarget = useReturnFocusTarget()
  const isCatalogDrawerOpen = useIsCatalogDrawerOpen()
  const isRoomSurfaceOpen = useIsRoomSurfaceOpen()
  const isInfoDialogOpen = useIsInfoDialogOpen()
  const isKeyboardShortcutsDialogOpen = useIsKeyboardShortcutsDialogOpen()
  const isHeaderMoreActionsOpen = useIsHeaderMoreActionsOpen()
  const isStartOverDialogOpen = useIsStartOverDialogOpen()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const layoutMode = useHeaderLayoutMode()
  const mobileRoomTriggerId = useId()
  const headerMoreActionsContentId = useId()
  const headerMoreActionsTriggerId = useId()
  const desktopRoomTriggerId = useId()
  const desktopInfoTriggerId = useId()
  const desktopKeyboardTriggerId = useId()
  const startOverTriggerId = useId()
  const floorFinishId = environmentConfig?.floorFinishes.some(
    (option) => option.id === storedFloorFinishId,
  )
    ? storedFloorFinishId
    : (environmentConfig?.defaultFloorFinishId ?? '')
  const wallFinishId = environmentConfig?.wallFinishes.some(
    (option) => option.id === storedWallFinishId,
  )
    ? storedWallFinishId
    : (environmentConfig?.defaultWallFinishId ?? '')

  useEffect(() => {
    onLayoutModeChange?.(layoutMode)
  }, [layoutMode, onLayoutModeChange])

  const focusReturnTarget = (target: DialogReturnFocusTarget) => {
    if (target === 'header-more-actions') {
      focusControlById(headerMoreActionsTriggerId)
      return
    }

    if (target === 'keyboard-inline') {
      focusControlById(desktopKeyboardTriggerId)
      return
    }

    if (target === 'info-inline') {
      focusControlById(desktopInfoTriggerId)
      return
    }

    if (target === 'room-inline') {
      focusControlById(
        layoutMode === 'mobile' ? mobileRoomTriggerId : desktopRoomTriggerId,
      )
      return
    }

    if (target === 'start-over-inline') {
      focusControlById(startOverTriggerId)
    }
  }

  const focusActiveReturnTarget = () => {
    if (returnFocusTarget) {
      focusReturnTarget(returnFocusTarget)
    }
  }

  const openDialogFromHeaderMoreActions = (
    open: (options?: DialogOpenOptions) => unknown,
    returnFocusTarget: DialogReturnFocusTarget,
  ) => {
    dialogActions.setHeaderMoreActionsOpen(false, {
      startupOverlayActive,
      dialogOptions: {
        returnFocusTarget: 'header-more-actions',
      },
    })

    queueMicrotask(() => {
      open({ returnFocusTarget })
    })
  }

  return (
    <>
      {layoutMode === 'mobile' ? (
        <TopHeaderMobile
          catalog={{
            catalog,
            catalogIdToAdd,
            isCatalogDrawerOpen,
            onAddFurniture,
            onCatalogIdToAddChange,
            onCatalogDrawerOpenChange,
          }}
          dialogs={{
            roomSurfaceLayout,
            isBlockingOverlayOpen,
            isRoomSurfaceOpen,
            isInfoDialogOpen,
            isKeyboardShortcutsDialogOpen,
            isHeaderMoreActionsOpen,
            isStartOverDialogOpen,
            onCloseStartOverDialog: dialogActions.closeDialog,
            onConfirmStartOver,
            onRoomSurfaceOpenChange: (open, options) =>
              dialogActions.setRoomSurfaceOpen(open, {
                editorInteractionsEnabled,
                startupOverlayActive,
                dialogOptions: options,
              }),
            onInfoDialogOpenChange: (open, options) =>
              dialogActions.setInfoOpen(open, {
                startupOverlayActive,
                dialogOptions: options,
              }),
            onKeyboardShortcutsDialogOpenChange: (open, options) =>
              dialogActions.setKeyboardShortcutsOpen(open, {
                startupOverlayActive,
                dialogOptions: options,
              }),
            onHeaderMoreActionsOpenChange: (open, options) =>
              dialogActions.setHeaderMoreActionsOpen(open, {
                startupOverlayActive,
                dialogOptions: options,
              }),
            onOpenStartOverDialog,
            returnFocusTarget,
          }}
          editorInteractionsEnabled={editorInteractionsEnabled}
          floorFinishId={floorFinishId}
          floorFinishLoading={floorFinishLoading}
          floorFinishes={environmentConfig?.floorFinishes ?? []}
          history={{
            canRedo: historyAvailability.canRedo,
            canUndo: historyAvailability.canUndo,
            onRedo,
            onUndo,
          }}
          onFloorFinishChange={sceneStateActions.setFloorFinishId}
          onWallFinishChange={sceneStateActions.setWallFinishId}
          startOverDisabled={startOverDisabled}
          onShareSceneUrl={onShareSceneUrl}
          topHeaderRef={topHeaderRef}
          mobileRoomDrawerRef={mobileRoomDrawerRef}
          mobileRoomTriggerId={mobileRoomTriggerId}
          headerMoreActionsContentId={headerMoreActionsContentId}
          headerMoreActionsTriggerId={headerMoreActionsTriggerId}
          onOpenKeyboardShortcutsFromHeaderMoreActions={() => {
            openDialogFromHeaderMoreActions((options) => {
              dialogActions.setKeyboardShortcutsOpen(true, {
                startupOverlayActive,
                dialogOptions: options,
              })
            }, 'header-more-actions')
          }}
          onOpenStartOverFromHeaderMoreActions={() => {
            openDialogFromHeaderMoreActions(
              onOpenStartOverDialog,
              'header-more-actions',
            )
          }}
          onOpenProjectInfoFromHeaderMoreActions={() => {
            openDialogFromHeaderMoreActions((options) => {
              dialogActions.setInfoOpen(true, {
                startupOverlayActive,
                dialogOptions: options,
              })
            }, 'header-more-actions')
          }}
          focusControlById={focusControlById}
          wallFinishId={wallFinishId}
          wallFinishes={environmentConfig?.wallFinishes ?? []}
        />
      ) : (
        <TopHeaderDesktop
          catalog={{
            catalog,
            catalogIdToAdd,
            isCatalogDrawerOpen,
            onAddFurniture,
            onCatalogIdToAddChange,
            onCatalogDrawerOpenChange,
          }}
          dialogs={{
            roomSurfaceLayout,
            isBlockingOverlayOpen,
            isRoomSurfaceOpen,
            isInfoDialogOpen,
            isKeyboardShortcutsDialogOpen,
            isHeaderMoreActionsOpen,
            isStartOverDialogOpen,
            onCloseStartOverDialog: dialogActions.closeDialog,
            onConfirmStartOver,
            onRoomSurfaceOpenChange: (open, options) =>
              dialogActions.setRoomSurfaceOpen(open, {
                editorInteractionsEnabled,
                startupOverlayActive,
                dialogOptions: options,
              }),
            onInfoDialogOpenChange: (open, options) =>
              dialogActions.setInfoOpen(open, {
                startupOverlayActive,
                dialogOptions: options,
              }),
            onKeyboardShortcutsDialogOpenChange: (open, options) =>
              dialogActions.setKeyboardShortcutsOpen(open, {
                startupOverlayActive,
                dialogOptions: options,
              }),
            onHeaderMoreActionsOpenChange: (open, options) =>
              dialogActions.setHeaderMoreActionsOpen(open, {
                startupOverlayActive,
                dialogOptions: options,
              }),
            onOpenStartOverDialog,
            returnFocusTarget,
          }}
          editorInteractionsEnabled={editorInteractionsEnabled}
          floorFinishId={floorFinishId}
          floorFinishLoading={floorFinishLoading}
          floorFinishes={environmentConfig?.floorFinishes ?? []}
          history={{
            canRedo: historyAvailability.canRedo,
            canUndo: historyAvailability.canUndo,
            onRedo,
            onUndo,
          }}
          onFloorFinishChange={sceneStateActions.setFloorFinishId}
          onWallFinishChange={sceneStateActions.setWallFinishId}
          startOverDisabled={startOverDisabled}
          onShareSceneUrl={onShareSceneUrl}
          topHeaderRef={topHeaderRef}
          desktopRoomSidebarRef={desktopRoomSidebarRef}
          desktopRoomTriggerId={desktopRoomTriggerId}
          desktopInfoTriggerId={desktopInfoTriggerId}
          desktopKeyboardTriggerId={desktopKeyboardTriggerId}
          startOverTriggerId={startOverTriggerId}
          wallFinishId={wallFinishId}
          wallFinishes={environmentConfig?.wallFinishes ?? []}
        />
      )}

      {layoutMode === 'mobile' ? (
        <>
          <KeyboardShortcutsDialog
            open={isKeyboardShortcutsDialogOpen}
            onOpenChange={(open) => {
              dialogActions.setKeyboardShortcutsOpen(open, {
                startupOverlayActive,
              })

              if (!open) {
                focusActiveReturnTarget()
              }
            }}
            triggerButton={null}
          />

          <ProjectInfoDialog
            open={isInfoDialogOpen}
            onOpenChange={(open) => {
              dialogActions.setInfoOpen(open, {
                startupOverlayActive,
              })

              if (!open) {
                focusActiveReturnTarget()
              }
            }}
            triggerButton={null}
          />
        </>
      ) : null}

      <StartOverConfirmationDialog
        open={isStartOverDialogOpen}
        onClose={() => {
          dialogActions.closeDialog()
          focusActiveReturnTarget()
        }}
        onConfirm={() => {
          onConfirmStartOver()

          if (returnFocusTarget === 'start-over-inline') {
            focusNextHeaderControlById(startOverTriggerId)
            return
          }

          focusActiveReturnTarget()
        }}
      />
    </>
  )
}
