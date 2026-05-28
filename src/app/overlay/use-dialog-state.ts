import { useCallback, useRef, useState } from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

export type ActiveDialog =
  | 'catalog'
  | 'delete'
  | 'environment-desktop'
  | 'environment-mobile'
  | 'keyboard-shortcuts'
  | 'info'
  | 'more-mobile'
  | 'start-over'
  | null

export type EnvironmentDialogLayout = 'desktop' | 'mobile'

export type DialogReturnFocusTarget =
  | 'environment-inline'
  | 'info-inline'
  | 'keyboard-inline'
  | 'mobile-more'
  | 'start-over-inline'
  | null

export interface DialogOpenOptions {
  returnFocusTarget?: DialogReturnFocusTarget
}

export interface EnvironmentDialogOpenOptions extends DialogOpenOptions {
  layout?: EnvironmentDialogLayout
}

interface UseDialogStateOptions {
  editorInteractionsEnabled: boolean
  startupOverlayActive: boolean
  selectedFurniture: FurnitureItem | null
  canStartOver: boolean
}

interface DialogState {
  activeDialog: ActiveDialog
  environmentDialogLayout: EnvironmentDialogLayout | null
  isCatalogDrawerOpen: boolean
  isDeleteDialogOpen: boolean
  isEnvironmentDialogOpen: boolean
  isEnvironmentDesktopDialogOpen: boolean
  isEnvironmentMobileDialogOpen: boolean
  isInfoDialogOpen: boolean
  isKeyboardShortcutsDialogOpen: boolean
  isMobileMoreOpen: boolean
  isStartOverDialogOpen: boolean
  isModalOpen: boolean
  pendingDeleteFurniture: FurnitureItem | null
  returnFocusTarget: DialogReturnFocusTarget
  openCatalog: () => boolean
  openDelete: () => boolean
  openEnvironment: (options?: EnvironmentDialogOpenOptions) => boolean
  openInfo: (options?: DialogOpenOptions) => boolean
  openKeyboardShortcuts: (options?: DialogOpenOptions) => boolean
  openMobileMore: (options?: DialogOpenOptions) => boolean
  openStartOver: (options?: DialogOpenOptions) => boolean
  closeDialog: () => void
  closeAllDialogs: () => void
  setCatalogOpen: (open: boolean) => boolean
  setEnvironmentOpen: (
    open: boolean,
    options?: EnvironmentDialogOpenOptions,
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
    returnFocusTarget: DialogReturnFocusTarget
  }>({
    activeDialog: null,
    returnFocusTarget: null,
  })
  const dialogStateRef = useRef(dialogState)
  const [pendingDeleteFurniture, setPendingDeleteFurniture] =
    useState<FurnitureItem | null>(null)
  const { activeDialog, returnFocusTarget } = dialogState

  const setDialogStateSnapshot = useCallback(
    (nextState: {
      activeDialog: ActiveDialog
      returnFocusTarget: DialogReturnFocusTarget
    }) => {
      dialogStateRef.current = nextState
      setDialogState(nextState)
    },
    [],
  )

  const isCatalogDrawerOpen = activeDialog === 'catalog'
  const isDeleteDialogOpen = activeDialog === 'delete'
  const isEnvironmentDesktopDialogOpen = activeDialog === 'environment-desktop'
  const isEnvironmentMobileDialogOpen = activeDialog === 'environment-mobile'
  const isEnvironmentDialogOpen =
    isEnvironmentDesktopDialogOpen || isEnvironmentMobileDialogOpen
  const environmentDialogLayout = isEnvironmentMobileDialogOpen
    ? 'mobile'
    : isEnvironmentDesktopDialogOpen
      ? 'desktop'
      : null
  const isInfoDialogOpen = activeDialog === 'info'
  const isKeyboardShortcutsDialogOpen = activeDialog === 'keyboard-shortcuts'
  const isMobileMoreOpen = activeDialog === 'more-mobile'
  const isStartOverDialogOpen = activeDialog === 'start-over'
  const isModalOpen = activeDialog !== null

  const openDialog = useCallback(
    (
      nextActiveDialog: Exclude<ActiveDialog, null>,
      options?: DialogOpenOptions,
    ) => {
      setDialogStateSnapshot({
        activeDialog: nextActiveDialog,
        returnFocusTarget: options?.returnFocusTarget ?? null,
      })
    },
    [setDialogStateSnapshot],
  )

  const closeDialog = useCallback(() => {
    setDialogStateSnapshot({ activeDialog: null, returnFocusTarget: null })
    setPendingDeleteFurniture(null)
  }, [setDialogStateSnapshot])

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

  const openEnvironment = useCallback(
    (options?: EnvironmentDialogOpenOptions) => {
      if (
        !editorInteractionsEnabled ||
        startupOverlayActive ||
        dialogStateRef.current.activeDialog !== null
      ) {
        return false
      }

      openDialog(
        options?.layout === 'mobile'
          ? 'environment-mobile'
          : 'environment-desktop',
        {
          returnFocusTarget: options?.returnFocusTarget ?? 'environment-inline',
        },
      )
      return true
    },
    [editorInteractionsEnabled, openDialog, startupOverlayActive],
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

  const setEnvironmentOpen = useCallback(
    (open: boolean, options?: EnvironmentDialogOpenOptions) => {
      if (!open) {
        closeDialog()
        return true
      }

      return openEnvironment(options)
    },
    [closeDialog, openEnvironment],
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
        returnFocusTarget: DialogReturnFocusTarget
      },
      layout: 'mobile' | 'desktop',
    ) => {
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
          layout === 'desktop' &&
          (current.activeDialog === 'environment-mobile' ||
            current.activeDialog === 'more-mobile')
        const shouldCloseForMobile =
          layout === 'mobile' && current.activeDialog === 'environment-desktop'

        if (!shouldCloseForDesktop && !shouldCloseForMobile) {
          const nextReturnFocusTarget = mapReturnFocusTargetForLayout(
            current,
            layout,
          )

          if (nextReturnFocusTarget === current.returnFocusTarget) {
            return current
          }

          const nextState = {
            ...current,
            returnFocusTarget: nextReturnFocusTarget,
          }

          dialogStateRef.current = nextState
          return nextState
        }

        const nextState = {
          activeDialog: null,
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
    environmentDialogLayout,
    isCatalogDrawerOpen,
    isDeleteDialogOpen,
    isEnvironmentDialogOpen,
    isEnvironmentDesktopDialogOpen,
    isEnvironmentMobileDialogOpen,
    isInfoDialogOpen,
    isKeyboardShortcutsDialogOpen,
    isMobileMoreOpen,
    isStartOverDialogOpen,
    isModalOpen,
    pendingDeleteFurniture,
    returnFocusTarget,
    openCatalog,
    openDelete,
    openEnvironment,
    openInfo,
    openKeyboardShortcuts,
    openMobileMore,
    openStartOver,
    closeDialog,
    closeAllDialogs,
    setCatalogOpen,
    setEnvironmentOpen,
    setInfoOpen,
    setKeyboardShortcutsOpen,
    setMobileMoreOpen,
    syncLayoutMode,
  }
}
