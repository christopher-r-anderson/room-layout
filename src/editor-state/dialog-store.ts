import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { EqualityChecker } from './store-types'

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

export interface UseDialogStateSnapshotOptions {
  editorInteractionsEnabled: boolean
  startupOverlayActive: boolean
  selectedFurniture: FurnitureItem | null
  canStartOver: boolean
}

interface DialogCoreState {
  activeDialog: ActiveDialog
  roomSurfaceLayout: RoomSurfaceLayout | null
  returnFocusTarget: DialogReturnFocusTarget
  pendingDeleteFurniture: FurnitureItem | null
  layoutMode: RoomSurfaceLayout
}

interface DialogStoreActions {
  closeDialog: () => void
  closeAllDialogs: () => void
  openCatalog: (editorInteractionsEnabled: boolean) => boolean
  openDelete: (options: {
    editorInteractionsEnabled: boolean
    selectedFurniture: FurnitureItem | null
  }) => boolean
  openRoomSurface: (options: {
    editorInteractionsEnabled: boolean
    startupOverlayActive: boolean
    dialogOptions?: RoomSurfaceOpenOptions
  }) => boolean
  openInfo: (options: {
    startupOverlayActive: boolean
    dialogOptions?: DialogOpenOptions
  }) => boolean
  openKeyboardShortcuts: (options: {
    startupOverlayActive: boolean
    dialogOptions?: DialogOpenOptions
  }) => boolean
  openHeaderMoreActions: (options: {
    startupOverlayActive: boolean
    dialogOptions?: DialogOpenOptions
  }) => boolean
  openStartOver: (options: {
    editorInteractionsEnabled: boolean
    canStartOver: boolean
    dialogOptions?: DialogOpenOptions
  }) => boolean
  setCatalogOpen: (open: boolean, editorInteractionsEnabled: boolean) => boolean
  setRoomSurfaceOpen: (
    open: boolean,
    options: {
      editorInteractionsEnabled: boolean
      startupOverlayActive: boolean
      dialogOptions?: RoomSurfaceOpenOptions
    },
  ) => boolean
  setInfoOpen: (
    open: boolean,
    options: {
      startupOverlayActive: boolean
      dialogOptions?: DialogOpenOptions
    },
  ) => boolean
  setKeyboardShortcutsOpen: (
    open: boolean,
    options: {
      startupOverlayActive: boolean
      dialogOptions?: DialogOpenOptions
    },
  ) => boolean
  setHeaderMoreActionsOpen: (
    open: boolean,
    options: {
      startupOverlayActive: boolean
      dialogOptions?: DialogOpenOptions
    },
  ) => boolean
  syncLayoutMode: (layout: RoomSurfaceLayout) => void
  reset: () => void
}

type DialogStoreState = DialogCoreState & DialogStoreActions

export interface DialogStateSnapshot {
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
  syncLayoutMode: (layout: RoomSurfaceLayout) => void
}

const INITIAL_DIALOG_STATE: DialogCoreState = {
  activeDialog: null,
  roomSurfaceLayout: null,
  returnFocusTarget: null,
  pendingDeleteFurniture: null,
  layoutMode: 'desktop',
}

function getInitialDialogState(): DialogCoreState {
  return {
    ...INITIAL_DIALOG_STATE,
    pendingDeleteFurniture: null,
  }
}

function applyDialogState(
  currentState: DialogStoreState,
  nextState: Partial<DialogCoreState>,
) {
  return {
    ...currentState,
    ...nextState,
  }
}

function getClosedDialogState(currentState: DialogStoreState): DialogCoreState {
  return {
    ...getInitialDialogState(),
    layoutMode: currentState.layoutMode,
  }
}

function mapReturnFocusTargetForLayout(
  current: DialogCoreState,
  layout: RoomSurfaceLayout,
): DialogReturnFocusTarget {
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
}

function createDialogStore() {
  return createStore<DialogStoreState>()(
    subscribeWithSelector((set, get) => ({
      ...getInitialDialogState(),
      closeDialog: () => {
        set((state) => applyDialogState(state, getClosedDialogState(state)))
      },
      closeAllDialogs: () => {
        get().closeDialog()
      },
      openCatalog: (editorInteractionsEnabled) => {
        if (!editorInteractionsEnabled || get().activeDialog !== null) {
          return false
        }

        set((state) =>
          applyDialogState(state, {
            activeDialog: 'catalog',
            roomSurfaceLayout: null,
            returnFocusTarget: null,
          }),
        )
        return true
      },
      openDelete: ({ editorInteractionsEnabled, selectedFurniture }) => {
        if (
          !editorInteractionsEnabled ||
          !selectedFurniture ||
          get().activeDialog !== null
        ) {
          return false
        }

        set((state) =>
          applyDialogState(state, {
            activeDialog: 'delete',
            roomSurfaceLayout: null,
            returnFocusTarget: null,
            pendingDeleteFurniture: selectedFurniture,
          }),
        )
        return true
      },
      openRoomSurface: ({
        editorInteractionsEnabled,
        startupOverlayActive,
        dialogOptions,
      }) => {
        if (
          !editorInteractionsEnabled ||
          startupOverlayActive ||
          get().activeDialog !== null
        ) {
          return false
        }

        set((state) =>
          applyDialogState(state, {
            activeDialog: null,
            roomSurfaceLayout: dialogOptions?.layout ?? state.layoutMode,
            returnFocusTarget:
              dialogOptions?.returnFocusTarget ?? 'room-inline',
          }),
        )
        return true
      },
      openInfo: ({ startupOverlayActive, dialogOptions }) => {
        if (startupOverlayActive || get().activeDialog !== null) {
          return false
        }

        set((state) =>
          applyDialogState(state, {
            activeDialog: 'info',
            roomSurfaceLayout: null,
            returnFocusTarget:
              dialogOptions?.returnFocusTarget ?? 'info-inline',
          }),
        )
        return true
      },
      openKeyboardShortcuts: ({ startupOverlayActive, dialogOptions }) => {
        if (startupOverlayActive || get().activeDialog !== null) {
          return false
        }

        set((state) =>
          applyDialogState(state, {
            activeDialog: 'keyboard-shortcuts',
            roomSurfaceLayout: null,
            returnFocusTarget:
              dialogOptions?.returnFocusTarget ?? 'keyboard-inline',
          }),
        )
        return true
      },
      openHeaderMoreActions: ({ startupOverlayActive, dialogOptions }) => {
        if (startupOverlayActive || get().activeDialog !== null) {
          return false
        }

        set((state) =>
          applyDialogState(state, {
            activeDialog: 'header-more-actions',
            roomSurfaceLayout: null,
            returnFocusTarget:
              dialogOptions?.returnFocusTarget ?? 'header-more-actions',
          }),
        )
        return true
      },
      openStartOver: ({
        editorInteractionsEnabled,
        canStartOver,
        dialogOptions,
      }) => {
        if (
          !editorInteractionsEnabled ||
          !canStartOver ||
          get().activeDialog !== null
        ) {
          return false
        }

        set((state) =>
          applyDialogState(state, {
            activeDialog: 'start-over',
            roomSurfaceLayout: null,
            returnFocusTarget:
              dialogOptions?.returnFocusTarget ??
              (state.layoutMode === 'mobile'
                ? 'header-more-actions'
                : 'start-over-inline'),
          }),
        )
        return true
      },
      setCatalogOpen: (open, editorInteractionsEnabled) => {
        if (!open) {
          get().closeDialog()
          return true
        }

        return get().openCatalog(editorInteractionsEnabled)
      },
      setRoomSurfaceOpen: (open, options) => {
        if (!open) {
          set((state) => {
            if (state.roomSurfaceLayout === null) {
              return state
            }

            return applyDialogState(state, {
              roomSurfaceLayout: null,
              returnFocusTarget: null,
            })
          })
          return true
        }

        return get().openRoomSurface(options)
      },
      setInfoOpen: (open, options) => {
        if (!open) {
          get().closeDialog()
          return true
        }

        return get().openInfo(options)
      },
      setKeyboardShortcutsOpen: (open, options) => {
        if (!open) {
          get().closeDialog()
          return true
        }

        return get().openKeyboardShortcuts(options)
      },
      setHeaderMoreActionsOpen: (open, options) => {
        if (!open) {
          get().closeDialog()
          return true
        }

        return get().openHeaderMoreActions(options)
      },
      syncLayoutMode: (layout) => {
        set((state) => {
          const currentState: DialogCoreState = {
            activeDialog: state.activeDialog,
            roomSurfaceLayout: state.roomSurfaceLayout,
            returnFocusTarget: state.returnFocusTarget,
            pendingDeleteFurniture: state.pendingDeleteFurniture,
            layoutMode: layout,
          }
          const shouldCloseForDesktop =
            layout === 'desktop' && state.activeDialog === 'header-more-actions'

          if (shouldCloseForDesktop) {
            return applyDialogState(state, {
              ...getInitialDialogState(),
              layoutMode: layout,
            })
          }

          const nextReturnFocusTarget = mapReturnFocusTargetForLayout(
            currentState,
            layout,
          )
          const nextRoomSurfaceLayout =
            state.roomSurfaceLayout === null ? null : layout

          if (
            nextReturnFocusTarget === state.returnFocusTarget &&
            nextRoomSurfaceLayout === state.roomSurfaceLayout &&
            layout === state.layoutMode
          ) {
            return state
          }

          return applyDialogState(state, {
            layoutMode: layout,
            roomSurfaceLayout: nextRoomSurfaceLayout,
            returnFocusTarget: nextReturnFocusTarget,
          })
        })
      },
      reset: () => {
        set(() => ({
          ...getInitialDialogState(),
          closeDialog: get().closeDialog,
          closeAllDialogs: get().closeAllDialogs,
          openCatalog: get().openCatalog,
          openDelete: get().openDelete,
          openRoomSurface: get().openRoomSurface,
          openInfo: get().openInfo,
          openKeyboardShortcuts: get().openKeyboardShortcuts,
          openHeaderMoreActions: get().openHeaderMoreActions,
          openStartOver: get().openStartOver,
          setCatalogOpen: get().setCatalogOpen,
          setRoomSurfaceOpen: get().setRoomSurfaceOpen,
          setInfoOpen: get().setInfoOpen,
          setKeyboardShortcutsOpen: get().setKeyboardShortcutsOpen,
          setHeaderMoreActionsOpen: get().setHeaderMoreActionsOpen,
          syncLayoutMode: get().syncLayoutMode,
          reset: get().reset,
        }))
      },
    })),
  )
}

export const dialogStore = createDialogStore()

export function useDialogStore<T>(
  selector: (state: DialogStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(dialogStore, selector, equalityFn)
}

export const dialogActions = {
  closeDialog: () => {
    dialogStore.getState().closeDialog()
  },
  closeAllDialogs: () => {
    dialogStore.getState().closeAllDialogs()
  },
  openCatalog: (editorInteractionsEnabled: boolean) => {
    return dialogStore.getState().openCatalog(editorInteractionsEnabled)
  },
  openDelete: (options: {
    editorInteractionsEnabled: boolean
    selectedFurniture: FurnitureItem | null
  }) => {
    return dialogStore.getState().openDelete(options)
  },
  openRoomSurface: (options: {
    editorInteractionsEnabled: boolean
    startupOverlayActive: boolean
    dialogOptions?: RoomSurfaceOpenOptions
  }) => {
    return dialogStore.getState().openRoomSurface(options)
  },
  openInfo: (options: {
    startupOverlayActive: boolean
    dialogOptions?: DialogOpenOptions
  }) => {
    return dialogStore.getState().openInfo(options)
  },
  openKeyboardShortcuts: (options: {
    startupOverlayActive: boolean
    dialogOptions?: DialogOpenOptions
  }) => {
    return dialogStore.getState().openKeyboardShortcuts(options)
  },
  openHeaderMoreActions: (options: {
    startupOverlayActive: boolean
    dialogOptions?: DialogOpenOptions
  }) => {
    return dialogStore.getState().openHeaderMoreActions(options)
  },
  openStartOver: (options: {
    editorInteractionsEnabled: boolean
    canStartOver: boolean
    dialogOptions?: DialogOpenOptions
  }) => {
    return dialogStore.getState().openStartOver(options)
  },
  setCatalogOpen: (open: boolean, editorInteractionsEnabled: boolean) => {
    return dialogStore
      .getState()
      .setCatalogOpen(open, editorInteractionsEnabled)
  },
  setRoomSurfaceOpen: (
    open: boolean,
    options: {
      editorInteractionsEnabled: boolean
      startupOverlayActive: boolean
      dialogOptions?: RoomSurfaceOpenOptions
    },
  ) => {
    return dialogStore.getState().setRoomSurfaceOpen(open, options)
  },
  setInfoOpen: (
    open: boolean,
    options: {
      startupOverlayActive: boolean
      dialogOptions?: DialogOpenOptions
    },
  ) => {
    return dialogStore.getState().setInfoOpen(open, options)
  },
  setKeyboardShortcutsOpen: (
    open: boolean,
    options: {
      startupOverlayActive: boolean
      dialogOptions?: DialogOpenOptions
    },
  ) => {
    return dialogStore.getState().setKeyboardShortcutsOpen(open, options)
  },
  setHeaderMoreActionsOpen: (
    open: boolean,
    options: {
      startupOverlayActive: boolean
      dialogOptions?: DialogOpenOptions
    },
  ) => {
    return dialogStore.getState().setHeaderMoreActionsOpen(open, options)
  },
  syncLayoutMode: (layout: RoomSurfaceLayout) => {
    dialogStore.getState().syncLayoutMode(layout)
  },
  reset: () => {
    dialogStore.getState().reset()
  },
}

export function resetDialogStore() {
  dialogActions.reset()
}

export const useActiveDialog = () =>
  useDialogStore((state) => state.activeDialog)
export const useRoomSurfaceLayout = () =>
  useDialogStore((state) => state.roomSurfaceLayout)
export const usePendingDeleteFurniture = () =>
  useDialogStore((state) => state.pendingDeleteFurniture)
export const useReturnFocusTarget = () =>
  useDialogStore((state) => state.returnFocusTarget)
export const useIsCatalogDrawerOpen = () =>
  useDialogStore((state) => state.activeDialog === 'catalog')
export const useIsDeleteDialogOpen = () =>
  useDialogStore((state) => state.activeDialog === 'delete')
export const useIsRoomSurfaceOpen = () =>
  useDialogStore((state) => state.roomSurfaceLayout !== null)
export const useIsDesktopRoomSurfaceOpen = () =>
  useDialogStore((state) => state.roomSurfaceLayout === 'desktop')
export const useIsMobileRoomSurfaceOpen = () =>
  useDialogStore((state) => state.roomSurfaceLayout === 'mobile')
export const useIsInfoDialogOpen = () =>
  useDialogStore((state) => state.activeDialog === 'info')
export const useIsKeyboardShortcutsDialogOpen = () =>
  useDialogStore((state) => state.activeDialog === 'keyboard-shortcuts')
export const useIsHeaderMoreActionsOpen = () =>
  useDialogStore((state) => state.activeDialog === 'header-more-actions')
export const useIsStartOverDialogOpen = () =>
  useDialogStore((state) => state.activeDialog === 'start-over')
export const useIsBlockingOverlayOpen = () =>
  useDialogStore((state) => state.activeDialog !== null)
