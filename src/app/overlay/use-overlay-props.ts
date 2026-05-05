import { useMemo } from 'react'
import type {
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
  startupLoadingActive: boolean
  startupOverlayActive: boolean
  onRetryAssetLoading: () => void
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
  isCatalogDrawerOpen: EditorCatalogProps['isCatalogDrawerOpen']
  onAddFurniture: EditorCatalogProps['onAddFurniture']
  onCatalogIdToAddChange: EditorCatalogProps['onCatalogIdToAddChange']
  onCatalogDrawerOpenChange: EditorCatalogProps['onCatalogDrawerOpenChange']
  isDeleteDialogOpen: EditorDialogsProps['isDeleteDialogOpen']
  pendingDeleteFurniture: EditorDialogsProps['pendingDeleteFurniture']
  onCloseDeleteDialog: EditorDialogsProps['onCloseDeleteDialog']
  onConfirmDeleteSelection: EditorDialogsProps['onConfirmDeleteSelection']
  isInfoDialogOpen: EditorDialogsProps['isInfoDialogOpen']
  onInfoDialogOpenChange: EditorDialogsProps['onInfoDialogOpenChange']
  onPreviewChange: EditorPreviewProps['onPreviewChange']
}

interface EditorOverlayPropsShape {
  startupProps: EditorStartupProps
  historyProps: EditorHistoryProps
  sceneProps: EditorSceneProps
  selectionProps: EditorSelectionProps
  catalogProps: EditorCatalogProps
  dialogsProps: EditorDialogsProps
  previewProps: EditorPreviewProps
}

export function useOverlayProps({
  assetError,
  startupLoadingActive,
  startupOverlayActive,
  onRetryAssetLoading,
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
  isCatalogDrawerOpen,
  onAddFurniture,
  onCatalogIdToAddChange,
  onCatalogDrawerOpenChange,
  isDeleteDialogOpen,
  pendingDeleteFurniture,
  onCloseDeleteDialog,
  onConfirmDeleteSelection,
  isInfoDialogOpen,
  onInfoDialogOpenChange,
  onPreviewChange,
}: UseOverlayPropsOptions): EditorOverlayPropsShape {
  const startupProps = useMemo<EditorStartupProps>(
    () => ({
      assetError,
      startupLoadingActive,
      startupOverlayActive,
      onRetryAssetLoading,
    }),
    [
      assetError,
      onRetryAssetLoading,
      startupLoadingActive,
      startupOverlayActive,
    ],
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
      catalogIdToAdd,
      isCatalogDrawerOpen,
      onAddFurniture,
      onCatalogIdToAddChange,
      onCatalogDrawerOpenChange,
    }),
    [
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
      isInfoDialogOpen,
      onInfoDialogOpenChange,
    }),
    [
      isDeleteDialogOpen,
      pendingDeleteFurniture,
      onCloseDeleteDialog,
      onConfirmDeleteSelection,
      isInfoDialogOpen,
      onInfoDialogOpenChange,
    ],
  )

  return useMemo(
    () => ({
      startupProps,
      historyProps,
      sceneProps,
      selectionProps,
      catalogProps,
      dialogsProps,
      previewProps: { onPreviewChange },
    }),
    [
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
