import type {
  MouseEvent as ReactMouseEvent,
  RefObject,
  SyntheticEvent,
} from 'react'
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
  handleDeleteDialogCancel: (event: SyntheticEvent<HTMLDialogElement>) => void
  handleDeleteDialogClick: (event: ReactMouseEvent<HTMLDialogElement>) => void
  handleInfoDialogCancel: (event: SyntheticEvent<HTMLDialogElement>) => void
  handleInfoDialogClick: (event: ReactMouseEvent<HTMLDialogElement>) => void
  historyAvailability: HistoryAvailability
  infoButtonRef: RefObject<HTMLButtonElement | null>
  infoDialogRef: RefObject<HTMLDialogElement | null>
  isPickerOpen: boolean
  onAddFurniture: () => void
  onCatalogIdToAddChange: (catalogId: string) => void
  onCloseDeleteDialog: () => void
  onCloseInfoDialog: () => void
  onClosePicker: () => void
  onConfirmRemoveSelection: () => void
  onOpenDeleteDialog: () => void
  onOpenPicker: () => void
  onOpenInfoDialog: () => void
  onRedo: () => void
  onRetryAssetLoading: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onUndo: () => void
  pendingDeleteFurniture: FurnitureItem | null
  pickerDialogRef: RefObject<HTMLDialogElement | null>
  removeButtonRef: RefObject<HTMLButtonElement | null>
  selectedFurniture: FurnitureItem | null
  startupLoadingActive: boolean
  startupOverlayActive: boolean
}

export function EditorOverlay({
  assetError,
  catalogIdToAdd,
  confirmDeleteDialogRef,
  isPickerOpen,
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
  onClosePicker,
  onConfirmRemoveSelection,
  onOpenDeleteDialog,
  onOpenPicker,
  onOpenInfoDialog,
  onRedo,
  onRetryAssetLoading,
  onRotateSelection,
  onUndo,
  pendingDeleteFurniture,
  pickerDialogRef,
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
          <SelectionPanel
            editorInteractionsEnabled={editorInteractionsEnabled}
            onOpenDeleteDialog={onOpenDeleteDialog}
            onRotateSelection={onRotateSelection}
            removeButtonRef={removeButtonRef}
            selectedFurniture={selectedFurniture}
          />
          <EditorStatusMessage message={editorMessage} />
        </OverlayControlPanel>
        <CatalogPanel
          catalogIdToAdd={catalogIdToAdd}
          editorInteractionsEnabled={editorInteractionsEnabled}
          isOpen={isPickerOpen}
          onAddFurniture={onAddFurniture}
          onCatalogIdToAddChange={onCatalogIdToAddChange}
          onClose={onClosePicker}
          onOpen={onOpenPicker}
          pickerDialogRef={pickerDialogRef}
        />
        <OverlayInfoButton
          infoButtonRef={infoButtonRef}
          onOpenInfoDialog={onOpenInfoDialog}
        />
        {isPickerOpen ? null : <RotationHelp />}

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
