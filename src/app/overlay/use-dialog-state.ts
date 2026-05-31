import { useCallback, useRef, useState } from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

export type ActiveDialog =
  | 'catalog'
  | 'delete'
  | 'keyboard-shortcuts'
  | 'info'
  | 'header-more-actions'
  | 'start-over'
  | null

export type RoomSurfaceLayout = 'desktop' | 'mobile'

export type DialogReturnFocusTarget =
  | 'room-inline'
  | 'info-inline'
  | 'keyboard-inline'
  | 'header-more-actions'
  | 'start-over-inline'
  | null

export interface DialogOpenOptions {
  returnFocusTarget?: DialogReturnFocusTarget
}

export interface RoomSurfaceOpenOptions extends DialogOpenOptions {
  layout?: RoomSurfaceLayout
}

interface UseDialogStateOptions {
  editorInteractionsEnabled: boolean
  startupOverlayActive: boolean
  selectedFurniture: FurnitureItem | null
  canStartOver: boolean
}

interface SimpleDialogOpenConfig {
  block: boolean
  returnFocusTarget?: DialogReturnFocusTarget
}

interface DialogState {
  activeDialog: ActiveDialog
  roomSurfaceLayout: RoomSurfaceLayout | null
  isCatalogDrawerOpen: boolean
  isDeleteDialogOpen: boolean
  isRoomSurfaceOpen: boolean
  isDesktopRoomSurfaceOpen: boolean
  isMobileRoomSurfaceOpen: boolean
  isInfoDialogOpen: boolean
  isKeyboardShortcutsDialogOpen: boolean
  isHeaderMoreActionsOpen: boolean
  isStartOverDialogOpen: boolean
  isBlockingOverlayOpen: boolean
  pendingDeleteFurniture: FurnitureItem | null
  returnFocusTarget: DialogReturnFocusTarget
  openCatalog: () => boolean
  openDelete: () => boolean
  openRoomSurface: (options?: RoomSurfaceOpenOptions) => boolean
  openInfo: (options?: DialogOpenOptions) => boolean
  openKeyboardShortcuts: (options?: DialogOpenOptions) => boolean
  openHeaderMoreActions: (options?: DialogOpenOptions) => boolean
  openStartOver: (options?: DialogOpenOptions) => boolean
  closeDialog: () => void
  closeAllDialogs: () => void
  setCatalogOpen: (open: boolean) => boolean
  setRoomSurfaceOpen: (
    open: boolean,
    options?: RoomSurfaceOpenOptions,
  ) => boolean
  setInfoOpen: (open: boolean, options?: DialogOpenOptions) => boolean
  setKeyboardShortcutsOpen: (
    open: boolean,
    options?: DialogOpenOptions,
  ) => boolean
  setHeaderMoreActionsOpen: (
    open: boolean,
    options?: DialogOpenOptions,
  ) => boolean
  syncLayoutMode: (layout: 'mobile' | 'desktop') => void
}

export function useDialogState({
  editorInteractionsEnabled,
  startupOverlayActive,
  selectedFurniture,
  canStartOver,
}: UseDialogStateOptions): DialogState {
  const layoutModeRef = useRef<'mobile' | 'desktop'>('desktop')
  const [dialogState, setDialogState] = useState<{
    activeDialog: ActiveDialog
    roomSurfaceLayout: RoomSurfaceLayout | null
    returnFocusTarget: DialogReturnFocusTarget
  }>({
    activeDialog: null,
    roomSurfaceLayout: null,
    returnFocusTarget: null,
  })
  const dialogStateRef = useRef(dialogState)
  const [pendingDeleteFurniture, setPendingDeleteFurniture] =
    useState<FurnitureItem | null>(null)
  const { activeDialog, roomSurfaceLayout, returnFocusTarget } = dialogState

  const setDialogStateSnapshot = useCallback(
    (nextState: {
      activeDialog: ActiveDialog
      roomSurfaceLayout: RoomSurfaceLayout | null
      returnFocusTarget: DialogReturnFocusTarget
    }) => {
      dialogStateRef.current = nextState
      setDialogState(nextState)
    },
    [],
  )

  const isCatalogDrawerOpen = activeDialog === 'catalog'
  const isDeleteDialogOpen = activeDialog === 'delete'
  const isDesktopRoomSurfaceOpen = roomSurfaceLayout === 'desktop'
  const isMobileRoomSurfaceOpen = roomSurfaceLayout === 'mobile'
  const isRoomSurfaceOpen = roomSurfaceLayout !== null
  const isInfoDialogOpen = activeDialog === 'info'
  const isKeyboardShortcutsDialogOpen = activeDialog === 'keyboard-shortcuts'
  const isHeaderMoreActionsOpen = activeDialog === 'header-more-actions'
  const isStartOverDialogOpen = activeDialog === 'start-over'
  const isBlockingOverlayOpen = activeDialog !== null

  const openDialog = useCallback(
    (
      nextActiveDialog: Exclude<ActiveDialog, null>,
      options?: DialogOpenOptions,
    ) => {
      setDialogStateSnapshot({
        activeDialog: nextActiveDialog,
        roomSurfaceLayout: null,
        returnFocusTarget: options?.returnFocusTarget ?? null,
      })
    },
    [setDialogStateSnapshot],
  )

  const showRoomSurface = useCallback(
    (options?: RoomSurfaceOpenOptions) => {
      setDialogStateSnapshot({
        activeDialog: null,
        roomSurfaceLayout: options?.layout ?? layoutModeRef.current,
        returnFocusTarget: options?.returnFocusTarget ?? 'room-inline',
      })
    },
    [setDialogStateSnapshot],
  )

  const closeDialog = useCallback(() => {
    setDialogStateSnapshot({
      activeDialog: null,
      roomSurfaceLayout: null,
      returnFocusTarget: null,
    })
    setPendingDeleteFurniture(null)
  }, [setDialogStateSnapshot])

  const closeRoomSurface = useCallback(() => {
    setDialogState((current) => {
      if (current.roomSurfaceLayout === null) {
        return current
      }

      const nextState = {
        ...current,
        roomSurfaceLayout: null,
        returnFocusTarget: null,
      }

      dialogStateRef.current = nextState
      return nextState
    })
  }, [])

  const closeAllDialogs = useCallback(() => {
    closeDialog()
  }, [closeDialog])

  const tryOpenSimpleDialog = useCallback(
    (
      nextActiveDialog: Exclude<ActiveDialog, null>,
      config: SimpleDialogOpenConfig,
    ) => {
      if (config.block || dialogStateRef.current.activeDialog !== null) {
        return false
      }

      openDialog(nextActiveDialog, {
        returnFocusTarget: config.returnFocusTarget,
      })
      return true
    },
    [openDialog],
  )

  const setDialogOpenState = useCallback(
    <TOptions>(
      open: boolean,
      onOpen: (options?: TOptions) => boolean,
      onClose: () => void,
      options?: TOptions,
    ) => {
      if (!open) {
        onClose()
        return true
      }

      return onOpen(options)
    },
    [],
  )

  const openCatalog = useCallback(() => {
    return tryOpenSimpleDialog('catalog', {
      block: !editorInteractionsEnabled,
    })
  }, [editorInteractionsEnabled, tryOpenSimpleDialog])

  const openInfo = useCallback(
    (options?: DialogOpenOptions) => {
      return tryOpenSimpleDialog('info', {
        block: startupOverlayActive,
        returnFocusTarget: options?.returnFocusTarget ?? 'info-inline',
      })
    },
    [startupOverlayActive, tryOpenSimpleDialog],
  )

  const openKeyboardShortcuts = useCallback(
    (options?: DialogOpenOptions) => {
      return tryOpenSimpleDialog('keyboard-shortcuts', {
        block: startupOverlayActive,
        returnFocusTarget: options?.returnFocusTarget ?? 'keyboard-inline',
      })
    },
    [startupOverlayActive, tryOpenSimpleDialog],
  )

  const openRoomSurface = useCallback(
    (options?: RoomSurfaceOpenOptions) => {
      if (
        !editorInteractionsEnabled ||
        startupOverlayActive ||
        dialogStateRef.current.activeDialog !== null
      ) {
        return false
      }

      showRoomSurface(options)
      return true
    },
    [editorInteractionsEnabled, showRoomSurface, startupOverlayActive],
  )

  const openDelete = useCallback(() => {
    if (
      !editorInteractionsEnabled ||
      !selectedFurniture ||
      dialogStateRef.current.activeDialog !== null
    ) {
      return false
    }

    setPendingDeleteFurniture(selectedFurniture)
    openDialog('delete')
    return true
  }, [editorInteractionsEnabled, openDialog, selectedFurniture])

  const openHeaderMoreActions = useCallback(
    (options?: DialogOpenOptions) => {
      return tryOpenSimpleDialog('header-more-actions', {
        block: startupOverlayActive,
        returnFocusTarget: options?.returnFocusTarget ?? 'header-more-actions',
      })
    },
    [startupOverlayActive, tryOpenSimpleDialog],
  )

  const openStartOver = useCallback(
    (options?: DialogOpenOptions) => {
      return tryOpenSimpleDialog('start-over', {
        block: !editorInteractionsEnabled || !canStartOver,
        returnFocusTarget:
          options?.returnFocusTarget ??
          (layoutModeRef.current === 'mobile'
            ? 'header-more-actions'
            : 'start-over-inline'),
      })
    },
    [canStartOver, editorInteractionsEnabled, tryOpenSimpleDialog],
  )

  const setCatalogOpen = useCallback(
    (open: boolean) => {
      return setDialogOpenState(open, openCatalog, closeDialog)
    },
    [closeDialog, openCatalog, setDialogOpenState],
  )

  const setInfoOpen = useCallback(
    (open: boolean, options?: DialogOpenOptions) => {
      return setDialogOpenState(open, openInfo, closeDialog, options)
    },
    [closeDialog, openInfo, setDialogOpenState],
  )

  const setRoomSurfaceOpen = useCallback(
    (open: boolean, options?: RoomSurfaceOpenOptions) => {
      if (!open) {
        closeRoomSurface()
        return true
      }

      return openRoomSurface(options)
    },
    [closeRoomSurface, openRoomSurface],
  )

  const setKeyboardShortcutsOpen = useCallback(
    (open: boolean, options?: DialogOpenOptions) => {
      return setDialogOpenState(
        open,
        openKeyboardShortcuts,
        closeDialog,
        options,
      )
    },
    [closeDialog, openKeyboardShortcuts, setDialogOpenState],
  )

  const setHeaderMoreActionsOpen = useCallback(
    (open: boolean, options?: DialogOpenOptions) => {
      return setDialogOpenState(
        open,
        openHeaderMoreActions,
        closeDialog,
        options,
      )
    },
    [closeDialog, openHeaderMoreActions, setDialogOpenState],
  )

  const mapReturnFocusTargetForLayout = useCallback(
    (
      current: {
        activeDialog: ActiveDialog
        roomSurfaceLayout: RoomSurfaceLayout | null
        returnFocusTarget: DialogReturnFocusTarget
      },
      layout: 'mobile' | 'desktop',
    ) => {
      if (current.roomSurfaceLayout !== null) {
        return 'room-inline'
      }

      if (layout === 'desktop') {
        if (current.returnFocusTarget !== 'header-more-actions') {
          return current.returnFocusTarget
        }

        if (current.activeDialog === 'keyboard-shortcuts') {
          return 'keyboard-inline'
        }

        if (current.activeDialog === 'info') {
          return 'info-inline'
        }

        if (current.activeDialog === 'start-over') {
          return 'start-over-inline'
        }

        return current.returnFocusTarget
      }

      if (current.returnFocusTarget === 'header-more-actions') {
        return current.returnFocusTarget
      }

      if (
        current.activeDialog === 'keyboard-shortcuts' ||
        current.activeDialog === 'info' ||
        current.activeDialog === 'start-over'
      ) {
        return 'header-more-actions'
      }

      return current.returnFocusTarget
    },
    [],
  )

  const syncLayoutMode = useCallback(
    (layout: 'mobile' | 'desktop') => {
      layoutModeRef.current = layout

      setDialogState((current) => {
        const shouldCloseForDesktop =
          layout === 'desktop' && current.activeDialog === 'header-more-actions'

        if (!shouldCloseForDesktop) {
          const nextReturnFocusTarget = mapReturnFocusTargetForLayout(
            current,
            layout,
          )

          const nextRoomSurfaceLayout =
            current.roomSurfaceLayout === null ? null : layout

          if (
            nextReturnFocusTarget === current.returnFocusTarget &&
            nextRoomSurfaceLayout === current.roomSurfaceLayout
          ) {
            return current
          }

          const nextState = {
            ...current,
            roomSurfaceLayout: nextRoomSurfaceLayout,
            returnFocusTarget: nextReturnFocusTarget,
          }

          dialogStateRef.current = nextState
          return nextState
        }

        const nextState = {
          activeDialog: null,
          roomSurfaceLayout: null,
          returnFocusTarget: null,
        }

        dialogStateRef.current = nextState
        return nextState
      })
    },
    [mapReturnFocusTargetForLayout],
  )

  return {
    activeDialog,
    roomSurfaceLayout,
    isCatalogDrawerOpen,
    isDeleteDialogOpen,
    isRoomSurfaceOpen,
    isDesktopRoomSurfaceOpen,
    isMobileRoomSurfaceOpen,
    isInfoDialogOpen,
    isKeyboardShortcutsDialogOpen,
    isHeaderMoreActionsOpen,
    isStartOverDialogOpen,
    isBlockingOverlayOpen,
    pendingDeleteFurniture,
    returnFocusTarget,
    openCatalog,
    openDelete,
    openRoomSurface,
    openInfo,
    openKeyboardShortcuts,
    openHeaderMoreActions,
    openStartOver,
    closeDialog,
    closeAllDialogs,
    setCatalogOpen,
    setRoomSurfaceOpen,
    setInfoOpen,
    setKeyboardShortcutsOpen,
    setHeaderMoreActionsOpen,
    syncLayoutMode,
  }
}
