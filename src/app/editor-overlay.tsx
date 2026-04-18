import type { RefObject } from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { DeleteConfirmationDialog, ProjectInfoDialog } from './editor-dialogs'
import {
  CatalogPanel,
  EditorStatusMessage,
  HistoryPanel,
  OverlayInfoButton,
  RotationHelp,
  SelectionPanel,
  type HistoryAvailability,
} from './editor-overlay-panels'
import { OverlayControlPanel } from './editor-ui-primitives'
import { StartupErrorOverlay, StartupLoadingOverlay } from './startup-overlays'

interface EditorOverlayProps {
  assetError: boolean
  catalogIdToAdd: string
  confirmDeleteDialogRef: RefObject<HTMLDialogElement | null>
  editorInteractionsEnabled: boolean
  editorMessage: string | null
  handleDeleteDialogCancel: (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => void
  handleDeleteDialogClick: (event: React.MouseEvent<HTMLDialogElement>) => void
  handleInfoDialogCancel: (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => void
  handleInfoDialogClick: (event: React.MouseEvent<HTMLDialogElement>) => void
  historyAvailability: HistoryAvailability
  infoButtonRef: RefObject<HTMLButtonElement | null>
  infoDialogRef: RefObject<HTMLDialogElement | null>
  onAddFurniture: () => void
  onCatalogIdToAddChange: (catalogId: string) => void
  onCloseDeleteDialog: () => void
  onCloseInfoDialog: () => void
  onConfirmRemoveSelection: () => void
  onOpenDeleteDialog: () => void
  onOpenInfoDialog: () => void
  onRedo: () => void
  onRetryAssetLoading: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onUndo: () => void
  pendingDeleteFurniture: FurnitureItem | null
  removeButtonRef: RefObject<HTMLButtonElement | null>
  selectedFurniture: FurnitureItem | null
  startupLoadingActive: boolean
  startupOverlayActive: boolean
}

export function EditorOverlay({
  assetError,
  catalogIdToAdd,
  confirmDeleteDialogRef,
  editorInteractionsEnabled,
  editorMessage,
  handleDeleteDialogCancel,
  handleDeleteDialogClick,
  handleInfoDialogCancel,
  handleInfoDialogClick,
  historyAvailability,
  infoButtonRef,
  infoDialogRef,
  onAddFurniture,
  onCatalogIdToAddChange,
  onCloseDeleteDialog,
  onCloseInfoDialog,
  onConfirmRemoveSelection,
  onOpenDeleteDialog,
  onOpenInfoDialog,
  onRedo,
  onRetryAssetLoading,
  onRotateSelection,
  onUndo,
  pendingDeleteFurniture,
  removeButtonRef,
  selectedFurniture,
  startupLoadingActive,
  startupOverlayActive,
}: EditorOverlayProps) {
  return (
    <div className="ui-overlay">
      <div
        className="ui-shell"
        inert={startupOverlayActive}
        aria-hidden={startupOverlayActive}
      >
        <OverlayControlPanel ariaLabel="Furniture controls">
          <HistoryPanel
            canRedo={historyAvailability.canRedo}
            canUndo={historyAvailability.canUndo}
            editorInteractionsEnabled={editorInteractionsEnabled}
            onRedo={onRedo}
            onUndo={onUndo}
          />
          <CatalogPanel
            catalogIdToAdd={catalogIdToAdd}
            editorInteractionsEnabled={editorInteractionsEnabled}
            onAddFurniture={onAddFurniture}
            onCatalogIdToAddChange={onCatalogIdToAddChange}
          />
          <SelectionPanel
            editorInteractionsEnabled={editorInteractionsEnabled}
            onOpenDeleteDialog={onOpenDeleteDialog}
            onRotateSelection={onRotateSelection}
            removeButtonRef={removeButtonRef}
            selectedFurniture={selectedFurniture}
          />
          <EditorStatusMessage message={editorMessage} />
        </OverlayControlPanel>
        <OverlayInfoButton
          infoButtonRef={infoButtonRef}
          onOpenInfoDialog={onOpenInfoDialog}
        />
        <RotationHelp />

        <DeleteConfirmationDialog
          dialogRef={confirmDeleteDialogRef}
          pendingDeleteFurniture={pendingDeleteFurniture}
          onCancel={handleDeleteDialogCancel}
          onBackdropClick={handleDeleteDialogClick}
          onClose={onCloseDeleteDialog}
          onConfirm={onConfirmRemoveSelection}
        />

        <ProjectInfoDialog
          dialogRef={infoDialogRef}
          onCancel={handleInfoDialogCancel}
          onBackdropClick={handleInfoDialogClick}
          onClose={onCloseInfoDialog}
        />
      </div>

      <StartupLoadingOverlay visible={startupLoadingActive} />
      {assetError ? (
        <StartupErrorOverlay onRetry={onRetryAssetLoading} />
      ) : null}
    </div>
  )
}
