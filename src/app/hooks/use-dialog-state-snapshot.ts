import { useCallback, useMemo } from 'react'
import {
  dialogActions,
  useActiveDialog,
  useIsCatalogDrawerOpen,
  useIsBlockingOverlayOpen,
  useIsDeleteDialogOpen,
  useIsDesktopRoomSurfaceOpen,
  useIsHeaderMoreActionsOpen,
  useIsInfoDialogOpen,
  useIsKeyboardShortcutsDialogOpen,
  useIsMobileRoomSurfaceOpen,
  useIsRoomSurfaceOpen,
  useIsStartOverDialogOpen,
  usePendingDeleteFurniture,
  useReturnFocusTarget,
  useRoomSurfaceLayout,
  type DialogOpenOptions,
  type DialogStateSnapshot,
  type RoomSurfaceOpenOptions,
  type UseDialogStateSnapshotOptions,
} from '@/editor-state/dialog-store'

export type { DialogStateSnapshot, UseDialogStateSnapshotOptions }

export function useDialogStateSnapshot(
  options: UseDialogStateSnapshotOptions,
): DialogStateSnapshot {
  const activeDialog = useActiveDialog()
  const roomSurfaceLayout = useRoomSurfaceLayout()
  const pendingDeleteFurniture = usePendingDeleteFurniture()
  const returnFocusTarget = useReturnFocusTarget()
  const isCatalogDrawerOpen = useIsCatalogDrawerOpen()
  const isDeleteDialogOpen = useIsDeleteDialogOpen()
  const isRoomSurfaceOpen = useIsRoomSurfaceOpen()
  const isDesktopRoomSurfaceOpen = useIsDesktopRoomSurfaceOpen()
  const isMobileRoomSurfaceOpen = useIsMobileRoomSurfaceOpen()
  const isInfoDialogOpen = useIsInfoDialogOpen()
  const isKeyboardShortcutsDialogOpen = useIsKeyboardShortcutsDialogOpen()
  const isHeaderMoreActionsOpen = useIsHeaderMoreActionsOpen()
  const isStartOverDialogOpen = useIsStartOverDialogOpen()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()

  const openCatalog = useCallback(
    () => dialogActions.openCatalog(options.editorInteractionsEnabled),
    [options.editorInteractionsEnabled],
  )
  const openDelete = useCallback(
    () =>
      dialogActions.openDelete({
        editorInteractionsEnabled: options.editorInteractionsEnabled,
        selectedFurniture: options.selectedFurniture,
      }),
    [options.editorInteractionsEnabled, options.selectedFurniture],
  )
  const openRoomSurface = useCallback(
    (dialogOptions?: RoomSurfaceOpenOptions) =>
      dialogActions.openRoomSurface({
        editorInteractionsEnabled: options.editorInteractionsEnabled,
        startupOverlayActive: options.startupOverlayActive,
        dialogOptions,
      }),
    [options.editorInteractionsEnabled, options.startupOverlayActive],
  )
  const openInfo = useCallback(
    (dialogOptions?: DialogOpenOptions) =>
      dialogActions.openInfo({
        startupOverlayActive: options.startupOverlayActive,
        dialogOptions,
      }),
    [options.startupOverlayActive],
  )
  const openKeyboardShortcuts = useCallback(
    (dialogOptions?: DialogOpenOptions) =>
      dialogActions.openKeyboardShortcuts({
        startupOverlayActive: options.startupOverlayActive,
        dialogOptions,
      }),
    [options.startupOverlayActive],
  )
  const openHeaderMoreActions = useCallback(
    (dialogOptions?: DialogOpenOptions) =>
      dialogActions.openHeaderMoreActions({
        startupOverlayActive: options.startupOverlayActive,
        dialogOptions,
      }),
    [options.startupOverlayActive],
  )
  const openStartOver = useCallback(
    (dialogOptions?: DialogOpenOptions) =>
      dialogActions.openStartOver({
        editorInteractionsEnabled: options.editorInteractionsEnabled,
        canStartOver: options.canStartOver,
        dialogOptions,
      }),
    [options.canStartOver, options.editorInteractionsEnabled],
  )
  const setCatalogOpen = useCallback(
    (open: boolean) =>
      dialogActions.setCatalogOpen(open, options.editorInteractionsEnabled),
    [options.editorInteractionsEnabled],
  )
  const setRoomSurfaceOpen = useCallback(
    (open: boolean, dialogOptions?: RoomSurfaceOpenOptions) =>
      dialogActions.setRoomSurfaceOpen(open, {
        editorInteractionsEnabled: options.editorInteractionsEnabled,
        startupOverlayActive: options.startupOverlayActive,
        dialogOptions,
      }),
    [options.editorInteractionsEnabled, options.startupOverlayActive],
  )
  const setInfoOpen = useCallback(
    (open: boolean, dialogOptions?: DialogOpenOptions) =>
      dialogActions.setInfoOpen(open, {
        startupOverlayActive: options.startupOverlayActive,
        dialogOptions,
      }),
    [options.startupOverlayActive],
  )
  const setKeyboardShortcutsOpen = useCallback(
    (open: boolean, dialogOptions?: DialogOpenOptions) =>
      dialogActions.setKeyboardShortcutsOpen(open, {
        startupOverlayActive: options.startupOverlayActive,
        dialogOptions,
      }),
    [options.startupOverlayActive],
  )
  const setHeaderMoreActionsOpen = useCallback(
    (open: boolean, dialogOptions?: DialogOpenOptions) =>
      dialogActions.setHeaderMoreActionsOpen(open, {
        startupOverlayActive: options.startupOverlayActive,
        dialogOptions,
      }),
    [options.startupOverlayActive],
  )

  return useMemo(
    () => ({
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
      closeDialog: dialogActions.closeDialog,
      closeAllDialogs: dialogActions.closeAllDialogs,
      setCatalogOpen,
      setRoomSurfaceOpen,
      setInfoOpen,
      setKeyboardShortcutsOpen,
      setHeaderMoreActionsOpen,
      syncLayoutMode: dialogActions.syncLayoutMode,
    }),
    [
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
      setCatalogOpen,
      setRoomSurfaceOpen,
      setInfoOpen,
      setKeyboardShortcutsOpen,
      setHeaderMoreActionsOpen,
    ],
  )
}
