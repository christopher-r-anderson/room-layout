import { useCallback, useRef, useState } from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

export type ActiveDialog =
  | 'catalog'
  | 'delete'
  | 'keyboard-shortcuts'
  | 'info'
  | 'more-mobile'
  | 'start-over'
  | null

export type RoomSurfaceLayout = 'desktop' | 'mobile'

export type DialogReturnFocusTarget =
  | 'room-inline'
  | 'info-inline'
  | 'keyboard-inline'
  | 'mobile-more'
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
  isMobileMoreOpen: boolean
  isStartOverDialogOpen: boolean
  isBlockingOverlayOpen: boolean
  pendingDeleteFurniture: FurnitureItem | null
  returnFocusTarget: DialogReturnFocusTarget
  openCatalog: () => boolean
  openDelete: () => boolean
  openRoomSurface: (options?: RoomSurfaceOpenOptions) => boolean
  openInfo: (options?: DialogOpenOptions) => boolean
  openKeyboardShortcuts: (options?: DialogOpenOptions) => boolean
  openMobileMore: (options?: DialogOpenOptions) => boolean
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
  setMobileMoreOpen: (open: boolean, options?: DialogOpenOptions) => boolean
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
  const isMobileMoreOpen = activeDialog === 'more-mobile'
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

  const openCatalog = useCallback(() => {
    if (
      !editorInteractionsEnabled ||
      dialogStateRef.current.activeDialog !== null
    ) {
      return false
    }

    openDialog('catalog')
    return true
  }, [editorInteractionsEnabled, openDialog])

  const openInfo = useCallback(
    (options?: DialogOpenOptions) => {
      if (
        startupOverlayActive ||
        dialogStateRef.current.activeDialog !== null
      ) {
        return false
      }

      openDialog('info', {
        returnFocusTarget: options?.returnFocusTarget ?? 'info-inline',
      })
      return true
    },
    [openDialog, startupOverlayActive],
  )

  const openKeyboardShortcuts = useCallback(
    (options?: DialogOpenOptions) => {
      if (
        startupOverlayActive ||
        dialogStateRef.current.activeDialog !== null
      ) {
        return false
      }

      openDialog('keyboard-shortcuts', {
        returnFocusTarget: options?.returnFocusTarget ?? 'keyboard-inline',
      })
      return true
    },
    [openDialog, startupOverlayActive],
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

  const openMobileMore = useCallback(
    (options?: DialogOpenOptions) => {
      if (
        startupOverlayActive ||
        dialogStateRef.current.activeDialog !== null
      ) {
        return false
      }

      openDialog('more-mobile', {
        returnFocusTarget: options?.returnFocusTarget ?? 'mobile-more',
      })
      return true
    },
    [openDialog, startupOverlayActive],
  )

  const openStartOver = useCallback(
    (options?: DialogOpenOptions) => {
      if (
        !editorInteractionsEnabled ||
        dialogStateRef.current.activeDialog !== null ||
        !canStartOver
      ) {
        return false
      }

      openDialog('start-over', {
        returnFocusTarget:
          options?.returnFocusTarget ??
          (layoutModeRef.current === 'mobile'
            ? 'mobile-more'
            : 'start-over-inline'),
      })
      return true
    },
    [canStartOver, editorInteractionsEnabled, openDialog],
  )

  const setCatalogOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        closeDialog()
        return true
      }

      return openCatalog()
    },
    [closeDialog, openCatalog],
  )

  const setInfoOpen = useCallback(
    (open: boolean, options?: DialogOpenOptions) => {
      if (!open) {
        closeDialog()
        return true
      }

      return openInfo(options)
    },
    [closeDialog, openInfo],
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
      if (!open) {
        closeDialog()
        return true
      }

      return openKeyboardShortcuts(options)
    },
    [closeDialog, openKeyboardShortcuts],
  )

  const setMobileMoreOpen = useCallback(
    (open: boolean, options?: DialogOpenOptions) => {
      if (!open) {
        closeDialog()
        return true
      }

      return openMobileMore(options)
    },
    [closeDialog, openMobileMore],
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
        if (current.returnFocusTarget !== 'mobile-more') {
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

      if (current.returnFocusTarget === 'mobile-more') {
        return current.returnFocusTarget
      }

      if (
        current.activeDialog === 'keyboard-shortcuts' ||
        current.activeDialog === 'info' ||
        current.activeDialog === 'start-over'
      ) {
        return 'mobile-more'
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
          layout === 'desktop' && current.activeDialog === 'more-mobile'

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
    isMobileMoreOpen,
    isStartOverDialogOpen,
    isBlockingOverlayOpen,
    pendingDeleteFurniture,
    returnFocusTarget,
    openCatalog,
    openDelete,
    openRoomSurface,
    openInfo,
    openKeyboardShortcuts,
    openMobileMore,
    openStartOver,
    closeDialog,
    closeAllDialogs,
    setCatalogOpen,
    setRoomSurfaceOpen,
    setInfoOpen,
    setKeyboardShortcutsOpen,
    setMobileMoreOpen,
    syncLayoutMode,
  }
}
