import { useId } from 'react'
import { KeyboardShortcutsDialog } from '@/features/keyboard/keyboard-shortcuts-help'
import { ProjectInfoDialog } from '@/features/project-info/project-info-dialog'
import { StartOverConfirmationDialog } from '@/features/startup/start-over-confirmation-dialog'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { TopHeaderDesktop } from './top-header-desktop'
import { TopHeaderMobile } from './top-header-mobile'
import type { TopHeaderContainerProps } from './top-header.types'
import type {
  DialogAccessPoint,
  DialogOpenRequest,
} from '@/editor-state/dialog-contract'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'
import {
  dialogActions,
  useDialogOpen,
  useDialogPayload,
  useIsBlockingOverlayOpen,
  useReturnFocusAccessPoint,
} from '@/editor-state/dialog-store'
import {
  useEditorInteractionsEnabled,
  useFloorFinishLoading,
} from '@/editor-state/editor-runtime-store'
import { useActiveFinishIds } from '@/app/controllers/_shared/use-active-finish-ids'
import {
  sceneStateActions,
  useFloorFinishId,
  useHistoryAvailability,
  useWallFinishId,
} from '@/editor-state/scene-state-store'

const HEADER_CONTROL_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface RoomSurfacePayload {
  layout: 'mobile' | 'desktop'
}

function isRoomSurfacePayload(value: unknown): value is RoomSurfacePayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as { layout?: unknown }

  return payload.layout === 'mobile' || payload.layout === 'desktop'
}

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
  const historyAvailability = useHistoryAvailability()
  const storedFloorFinishId = useFloorFinishId()
  const storedWallFinishId = useWallFinishId()
  const floorFinishLoading = useFloorFinishLoading()
  const roomSurfacePayload = useDialogPayload(DIALOG_IDS.roomSurface)
  const roomSurfaceLayout = isRoomSurfacePayload(roomSurfacePayload)
    ? roomSurfacePayload.layout
    : null
  const returnFocusAccessPoint = useReturnFocusAccessPoint()
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
  const mobileRoomTriggerId = useId()
  const headerMoreActionsContentId = useId()
  const headerMoreActionsTriggerId = useId()
  const desktopRoomTriggerId = useId()
  const desktopInfoTriggerId = useId()
  const desktopKeyboardTriggerId = useId()
  const startOverTriggerId = useId()
  const {
    activeFloorFinishId: floorFinishId,
    activeWallFinishId: wallFinishId,
  } = useActiveFinishIds({
    environmentConfig,
    floorFinishId: storedFloorFinishId,
    wallFinishId: storedWallFinishId,
  })

  const focusReturnTarget = (target: DialogAccessPoint) => {
    if (target === 'top-header-more-actions') {
      if (layoutMode === 'desktop') {
        if (isStartOverDialogOpen) {
          focusControlById(startOverTriggerId)
          return
        }

        if (isKeyboardShortcutsDialogOpen) {
          focusControlById(desktopKeyboardTriggerId)
          return
        }

        if (isInfoDialogOpen) {
          focusControlById(desktopInfoTriggerId)
          return
        }

        focusControlById(startOverTriggerId)
        return
      }

      focusControlById(headerMoreActionsTriggerId)
      return
    }

    if (target === 'top-header-keyboard-shortcuts') {
      if (layoutMode === 'mobile') {
        focusControlById(headerMoreActionsTriggerId)
        return
      }

      focusControlById(desktopKeyboardTriggerId)
      return
    }

    if (target === 'top-header-project-info') {
      if (layoutMode === 'mobile') {
        focusControlById(headerMoreActionsTriggerId)
        return
      }

      focusControlById(desktopInfoTriggerId)
      return
    }

    if (target === 'top-header-room') {
      focusControlById(
        layoutMode === 'mobile' ? mobileRoomTriggerId : desktopRoomTriggerId,
      )
      return
    }

    if (target === 'top-header-start-over') {
      if (layoutMode === 'mobile') {
        focusControlById(headerMoreActionsTriggerId)
        return
      }

      focusControlById(startOverTriggerId)
    }
  }

  const focusActiveReturnTarget = () => {
    if (returnFocusAccessPoint !== 'none') {
      focusReturnTarget(returnFocusAccessPoint)
    }
  }

  const openDialogFromHeaderMoreActions = (
    open: (request?: DialogOpenRequest) => unknown,
    returnFocusAccessPoint: DialogAccessPoint,
  ) => {
    dialogActions.setDialogOpen(DIALOG_IDS.headerMoreActions, false, {
      returnFocusAccessPoint: 'top-header-more-actions',
    })

    queueMicrotask(() => {
      open({ returnFocusAccessPoint })
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
            onCloseStartOverDialog: dialogActions.closeActiveDialog,
            onConfirmStartOver,
            onRoomSurfaceOpenChange: (open, request) =>
              dialogActions.setDialogOpen(
                DIALOG_IDS.roomSurface,
                open,
                request,
              ),
            onInfoDialogOpenChange: (open, request) =>
              dialogActions.setDialogOpen(
                DIALOG_IDS.projectInfo,
                open,
                request,
              ),
            onKeyboardShortcutsDialogOpenChange: (open, request) =>
              dialogActions.setDialogOpen(
                DIALOG_IDS.keyboardShortcuts,
                open,
                request,
              ),
            onHeaderMoreActionsOpenChange: (open, request) =>
              dialogActions.setDialogOpen(
                DIALOG_IDS.headerMoreActions,
                open,
                request,
              ),
            onOpenStartOverDialog,
            returnFocusAccessPoint,
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
            openDialogFromHeaderMoreActions((request) => {
              dialogActions.setDialogOpen(
                DIALOG_IDS.keyboardShortcuts,
                true,
                request,
              )
            }, 'top-header-more-actions')
          }}
          onOpenStartOverFromHeaderMoreActions={() => {
            openDialogFromHeaderMoreActions(
              onOpenStartOverDialog,
              'top-header-more-actions',
            )
          }}
          onOpenProjectInfoFromHeaderMoreActions={() => {
            openDialogFromHeaderMoreActions((request) => {
              dialogActions.setDialogOpen(DIALOG_IDS.projectInfo, true, request)
            }, 'top-header-more-actions')
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
            onCloseStartOverDialog: dialogActions.closeActiveDialog,
            onConfirmStartOver,
            onRoomSurfaceOpenChange: (open, request) =>
              dialogActions.setDialogOpen(
                DIALOG_IDS.roomSurface,
                open,
                request,
              ),
            onInfoDialogOpenChange: (open, request) =>
              dialogActions.setDialogOpen(
                DIALOG_IDS.projectInfo,
                open,
                request,
              ),
            onKeyboardShortcutsDialogOpenChange: (open, request) =>
              dialogActions.setDialogOpen(
                DIALOG_IDS.keyboardShortcuts,
                open,
                request,
              ),
            onHeaderMoreActionsOpenChange: (open, request) =>
              dialogActions.setDialogOpen(
                DIALOG_IDS.headerMoreActions,
                open,
                request,
              ),
            onOpenStartOverDialog,
            returnFocusAccessPoint,
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
              dialogActions.setDialogOpen(DIALOG_IDS.keyboardShortcuts, open)

              if (!open) {
                focusActiveReturnTarget()
              }
            }}
            triggerButton={null}
          />

          <ProjectInfoDialog
            open={isInfoDialogOpen}
            onOpenChange={(open) => {
              dialogActions.setDialogOpen(DIALOG_IDS.projectInfo, open)

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
          dialogActions.closeActiveDialog()
          focusActiveReturnTarget()
        }}
        onConfirm={() => {
          onConfirmStartOver()

          if (returnFocusAccessPoint === 'top-header-start-over') {
            focusNextHeaderControlById(startOverTriggerId)
            return
          }

          focusActiveReturnTarget()
        }}
      />
    </>
  )
}
