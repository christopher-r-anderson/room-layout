import { useMemo } from 'react'
import type {
  EditorCameraProps,
  EditorCatalogProps,
  EditorDialogsProps,
  EditorHistoryProps,
  EditorPreviewProps,
  EditorSceneProps,
  EditorSelectionProps,
  EditorStartupProps,
} from './editor-overlay'

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
  onSelectById: EditorSceneProps['onSelectById']
  readModel: EditorSceneProps['readModel']
  sceneInteractionsDisabled: EditorSceneProps['sceneInteractionsDisabled']
  selectedFurniture: EditorSelectionProps['selectedFurniture']
  onMoveSelection: EditorSelectionProps['onMoveSelection']
  onOpenDeleteDialog: EditorSelectionProps['onOpenDeleteDialog']
  onRotateSelection: EditorSelectionProps['onRotateSelection']
  catalogIdToAdd: EditorCatalogProps['catalogIdToAdd']
  catalog: EditorCatalogProps['catalog']
  isCatalogDrawerOpen: EditorCatalogProps['isCatalogDrawerOpen']
  onAddFurniture: EditorCatalogProps['onAddFurniture']
  onCatalogIdToAddChange: EditorCatalogProps['onCatalogIdToAddChange']
  onCatalogDrawerOpenChange: EditorCatalogProps['onCatalogDrawerOpenChange']
  isDeleteDialogOpen: EditorDialogsProps['isDeleteDialogOpen']
  pendingDeleteFurniture: EditorDialogsProps['pendingDeleteFurniture']
  onCloseDeleteDialog: EditorDialogsProps['onCloseDeleteDialog']
  onConfirmDeleteSelection: EditorDialogsProps['onConfirmDeleteSelection']
  isNewSceneDialogOpen: EditorDialogsProps['isNewSceneDialogOpen']
  onCloseNewSceneDialog: EditorDialogsProps['onCloseNewSceneDialog']
  onOpenNewSceneDialog: EditorDialogsProps['onOpenNewSceneDialog']
  onConfirmNewScene: EditorDialogsProps['onConfirmNewScene']
  isInfoDialogOpen: EditorDialogsProps['isInfoDialogOpen']
  onInfoDialogOpenChange: EditorDialogsProps['onInfoDialogOpenChange']
  onPreviewChange: EditorPreviewProps['onPreviewChange']
}

interface EditorOverlayPropsShape {
  startupProps: EditorStartupProps
  cameraProps: EditorCameraProps
  historyProps: EditorHistoryProps
  sceneProps: EditorSceneProps
  selectionProps: EditorSelectionProps
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
  onSelectById,
  readModel,
  sceneInteractionsDisabled,
  selectedFurniture,
  onMoveSelection,
  onOpenDeleteDialog,
  onRotateSelection,
  catalogIdToAdd,
  catalog,
  isCatalogDrawerOpen,
  onAddFurniture,
  onCatalogIdToAddChange,
  onCatalogDrawerOpenChange,
  isDeleteDialogOpen,
  pendingDeleteFurniture,
  onCloseDeleteDialog,
  onConfirmDeleteSelection,
  isNewSceneDialogOpen,
  onCloseNewSceneDialog,
  onOpenNewSceneDialog,
  onConfirmNewScene,
  isInfoDialogOpen,
  onInfoDialogOpenChange,
  onPreviewChange,
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
      onSelectById,
      readModel,
      sceneInteractionsDisabled,
    }),
    [
      focusRequest,
      onFocusHandled,
      onSelectById,
      readModel,
      sceneInteractionsDisabled,
    ],
  )

  const selectionProps = useMemo<EditorSelectionProps>(
    () => ({
      selectedFurniture,
      onMoveSelection,
      onOpenDeleteDialog,
      onRotateSelection,
    }),
    [onMoveSelection, onOpenDeleteDialog, onRotateSelection, selectedFurniture],
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
      pendingDeleteFurniture,
      onCloseDeleteDialog,
      onConfirmDeleteSelection,
      isNewSceneDialogOpen,
      onCloseNewSceneDialog,
      onOpenNewSceneDialog,
      onConfirmNewScene,
      isInfoDialogOpen,
      onInfoDialogOpenChange,
    }),
    [
      isDeleteDialogOpen,
      pendingDeleteFurniture,
      onCloseDeleteDialog,
      onConfirmDeleteSelection,
      isNewSceneDialogOpen,
      onCloseNewSceneDialog,
      onOpenNewSceneDialog,
      onConfirmNewScene,
      isInfoDialogOpen,
      onInfoDialogOpenChange,
    ],
  )

  return useMemo(
    () => ({
      startupProps,
      cameraProps,
      historyProps,
      sceneProps,
      selectionProps,
      catalogProps,
      dialogsProps,
      previewProps: { onPreviewChange },
    }),
    [
      cameraProps,
      catalogProps,
      dialogsProps,
      historyProps,
      onPreviewChange,
      sceneProps,
      selectionProps,
      startupProps,
    ],
  )
}
