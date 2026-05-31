import { useMemo } from 'react'
import type {
  EditorCameraProps,
  EditorCatalogProps,
  EditorDialogsProps,
  EditorHistoryProps,
  EditorPreviewProps,
  EditorSceneProps,
  EditorStartupProps,
} from './editor-overlay'

// Pure prop-grouping layer for EditorOverlay. It collects the startup, camera,
// history, scene, catalog, dialogs, and preview bundles without adding side
// effects or behavior beyond memoized object shaping.

interface UseOverlayPropsOptions {
  assetError: boolean
  assetErrorKind: EditorStartupProps['assetErrorKind']
  assetErrorMessage: EditorStartupProps['assetErrorMessage']
  startupLoadingActive: boolean
  startupOverlayActive: boolean
  onRetryAssetLoading: () => void
  onSetCameraPreset: EditorCameraProps['onSetCameraPreset']
  onFocusSelected: EditorCameraProps['onFocusSelected']
  historyAvailability: EditorHistoryProps['historyAvailability']
  onUndo: () => void
  onRedo: () => void
  focusRequest: EditorSceneProps['focusRequest']
  onFocusHandled: EditorSceneProps['onFocusHandled']
  onNavigateBackToSelectionControls: EditorSceneProps['onNavigateBackToSelectionControls']
  onSelectById: EditorSceneProps['onSelectById']
  readModel: EditorSceneProps['readModel']
  sceneInteractionsDisabled: EditorSceneProps['sceneInteractionsDisabled']
  catalogIdToAdd: EditorCatalogProps['catalogIdToAdd']
  catalog: EditorCatalogProps['catalog']
  isCatalogDrawerOpen: EditorCatalogProps['isCatalogDrawerOpen']
  onAddFurniture: EditorCatalogProps['onAddFurniture']
  onCatalogIdToAddChange: EditorCatalogProps['onCatalogIdToAddChange']
  onCatalogDrawerOpenChange: EditorCatalogProps['onCatalogDrawerOpenChange']
  isDeleteDialogOpen: EditorDialogsProps['isDeleteDialogOpen']
  isBlockingOverlayOpen: EditorDialogsProps['isBlockingOverlayOpen']
  pendingDeleteFurniture: EditorDialogsProps['pendingDeleteFurniture']
  onCloseDeleteDialog: EditorDialogsProps['onCloseDeleteDialog']
  onConfirmDeleteSelection: EditorDialogsProps['onConfirmDeleteSelection']
  roomSurfaceLayout: EditorDialogsProps['roomSurfaceLayout']
  isRoomSurfaceOpen: EditorDialogsProps['isRoomSurfaceOpen']
  isHeaderMoreActionsOpen: EditorDialogsProps['isHeaderMoreActionsOpen']
  onRoomSurfaceOpenChange: EditorDialogsProps['onRoomSurfaceOpenChange']
  isStartOverDialogOpen: EditorDialogsProps['isStartOverDialogOpen']
  onCloseStartOverDialog: EditorDialogsProps['onCloseStartOverDialog']
  onOpenStartOverDialog: EditorDialogsProps['onOpenStartOverDialog']
  onConfirmStartOver: EditorDialogsProps['onConfirmStartOver']
  isInfoDialogOpen: EditorDialogsProps['isInfoDialogOpen']
  onInfoDialogOpenChange: EditorDialogsProps['onInfoDialogOpenChange']
  isKeyboardShortcutsDialogOpen: EditorDialogsProps['isKeyboardShortcutsDialogOpen']
  onKeyboardShortcutsDialogOpenChange: EditorDialogsProps['onKeyboardShortcutsDialogOpenChange']
  onHeaderMoreActionsOpenChange: EditorDialogsProps['onHeaderMoreActionsOpenChange']
  returnFocusTarget: EditorDialogsProps['returnFocusTarget']
  onPreviewChange: EditorPreviewProps['onPreviewChange']
  previewedId: EditorPreviewProps['previewedId']
}

interface EditorOverlayPropsShape {
  startupProps: EditorStartupProps
  cameraProps: EditorCameraProps
  historyProps: EditorHistoryProps
  sceneProps: EditorSceneProps
  catalogProps: EditorCatalogProps
  dialogsProps: EditorDialogsProps
  previewProps: EditorPreviewProps
}

export function useOverlayProps({
  assetError,
  assetErrorKind,
  assetErrorMessage,
  startupLoadingActive,
  startupOverlayActive,
  onRetryAssetLoading,
  onSetCameraPreset,
  onFocusSelected,
  historyAvailability,
  onUndo,
  onRedo,
  focusRequest,
  onFocusHandled,
  onNavigateBackToSelectionControls,
  onSelectById,
  readModel,
  sceneInteractionsDisabled,
  catalogIdToAdd,
  catalog,
  isCatalogDrawerOpen,
  onAddFurniture,
  onCatalogIdToAddChange,
  onCatalogDrawerOpenChange,
  isDeleteDialogOpen,
  isBlockingOverlayOpen,
  pendingDeleteFurniture,
  onCloseDeleteDialog,
  onConfirmDeleteSelection,
  roomSurfaceLayout,
  isRoomSurfaceOpen,
  isHeaderMoreActionsOpen,
  onRoomSurfaceOpenChange,
  isStartOverDialogOpen,
  onCloseStartOverDialog,
  onOpenStartOverDialog,
  onConfirmStartOver,
  isInfoDialogOpen,
  onInfoDialogOpenChange,
  isKeyboardShortcutsDialogOpen,
  onKeyboardShortcutsDialogOpenChange,
  onHeaderMoreActionsOpenChange,
  returnFocusTarget,
  onPreviewChange,
  previewedId,
}: UseOverlayPropsOptions): EditorOverlayPropsShape {
  const startupProps = useMemo<EditorStartupProps>(
    () => ({
      assetError,
      assetErrorKind,
      assetErrorMessage,
      startupLoadingActive,
      startupOverlayActive,
      onRetryAssetLoading,
    }),
    [
      assetError,
      assetErrorKind,
      assetErrorMessage,
      onRetryAssetLoading,
      startupLoadingActive,
      startupOverlayActive,
    ],
  )

  const cameraProps = useMemo<EditorCameraProps>(
    () => ({
      onSetCameraPreset,
      onFocusSelected,
    }),
    [onSetCameraPreset, onFocusSelected],
  )

  const historyProps = useMemo<EditorHistoryProps>(
    () => ({
      historyAvailability,
      onUndo,
      onRedo,
    }),
    [historyAvailability, onRedo, onUndo],
  )

  const sceneProps = useMemo<EditorSceneProps>(
    () => ({
      focusRequest,
      onFocusHandled,
      onNavigateBackToSelectionControls,
      onSelectById,
      readModel,
      sceneInteractionsDisabled,
    }),
    [
      focusRequest,
      onFocusHandled,
      onNavigateBackToSelectionControls,
      onSelectById,
      readModel,
      sceneInteractionsDisabled,
    ],
  )

  const catalogProps = useMemo<EditorCatalogProps>(
    () => ({
      catalog,
      catalogIdToAdd,
      isCatalogDrawerOpen,
      onAddFurniture,
      onCatalogIdToAddChange,
      onCatalogDrawerOpenChange,
    }),
    [
      catalog,
      catalogIdToAdd,
      isCatalogDrawerOpen,
      onAddFurniture,
      onCatalogIdToAddChange,
      onCatalogDrawerOpenChange,
    ],
  )

  const dialogsProps = useMemo<EditorDialogsProps>(
    () => ({
      isDeleteDialogOpen,
      isBlockingOverlayOpen,
      pendingDeleteFurniture,
      onCloseDeleteDialog,
      onConfirmDeleteSelection,
      roomSurfaceLayout,
      isRoomSurfaceOpen,
      isHeaderMoreActionsOpen,
      onRoomSurfaceOpenChange,
      isStartOverDialogOpen,
      onCloseStartOverDialog,
      onOpenStartOverDialog,
      onConfirmStartOver,
      isInfoDialogOpen,
      onInfoDialogOpenChange,
      isKeyboardShortcutsDialogOpen,
      onKeyboardShortcutsDialogOpenChange,
      onHeaderMoreActionsOpenChange,
      returnFocusTarget,
    }),
    [
      isDeleteDialogOpen,
      isBlockingOverlayOpen,
      pendingDeleteFurniture,
      onCloseDeleteDialog,
      onConfirmDeleteSelection,
      roomSurfaceLayout,
      isRoomSurfaceOpen,
      isHeaderMoreActionsOpen,
      onRoomSurfaceOpenChange,
      isStartOverDialogOpen,
      onCloseStartOverDialog,
      onOpenStartOverDialog,
      onConfirmStartOver,
      isInfoDialogOpen,
      onInfoDialogOpenChange,
      isKeyboardShortcutsDialogOpen,
      onKeyboardShortcutsDialogOpenChange,
      onHeaderMoreActionsOpenChange,
      returnFocusTarget,
    ],
  )

  return useMemo(
    () => ({
      startupProps,
      cameraProps,
      historyProps,
      sceneProps,
      catalogProps,
      dialogsProps,
      previewProps: { onPreviewChange, previewedId },
    }),
    [
      cameraProps,
      catalogProps,
      dialogsProps,
      historyProps,
      onPreviewChange,
      previewedId,
      sceneProps,
      startupProps,
    ],
  )
}
