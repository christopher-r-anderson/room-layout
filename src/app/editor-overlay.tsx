import type { RefObject } from 'react'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { DeleteConfirmationDialog, ProjectInfoDialog } from './editor-dialogs'
import { StartupErrorOverlay, StartupLoadingOverlay } from './startup-overlays'

interface HistoryAvailability {
  canUndo: boolean
  canRedo: boolean
}

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
        <section className="catalog-controls" aria-label="Furniture controls">
          <div className="control-group control-group-history">
            <h2 className="control-heading">History</h2>
            <div
              className="history-controls"
              role="toolbar"
              aria-label="History controls"
            >
              <button
                type="button"
                className="history-button"
                disabled={
                  !editorInteractionsEnabled || !historyAvailability.canUndo
                }
                onClick={onUndo}
                aria-keyshortcuts="Control+Z Meta+Z"
              >
                Undo
              </button>
              <button
                type="button"
                className="history-button"
                disabled={
                  !editorInteractionsEnabled || !historyAvailability.canRedo
                }
                onClick={onRedo}
                aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
              >
                Redo
              </button>
            </div>
          </div>

          <div
            className="control-group"
            aria-labelledby="add-furniture-heading"
          >
            <h2 id="add-furniture-heading" className="control-heading">
              Add Furniture
            </h2>
            <label className="sr-only" htmlFor="add-furniture-select">
              Furniture type to add
            </label>
            <div className="catalog-row">
              <select
                id="add-furniture-select"
                className="catalog-select"
                disabled={!editorInteractionsEnabled}
                value={catalogIdToAdd}
                onChange={(event) => {
                  onCatalogIdToAddChange(event.target.value)
                }}
              >
                {FURNITURE_CATALOG.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="add-button"
                disabled={!editorInteractionsEnabled || !catalogIdToAdd}
                onClick={onAddFurniture}
              >
                Add Item
              </button>
            </div>
          </div>

          <div
            className="control-group"
            aria-labelledby="selection-actions-heading"
          >
            <h2 id="selection-actions-heading" className="control-heading">
              Selection Actions
            </h2>
            <p className="selection-summary" aria-live="polite">
              {selectedFurniture ? (
                <>Selected: {selectedFurniture.name}</>
              ) : (
                'Selected: none'
              )}
            </p>
            <div
              className="rotation-controls"
              role="toolbar"
              aria-label="Rotation controls"
            >
              <button
                type="button"
                className="rotation-button"
                disabled={!editorInteractionsEnabled || !selectedFurniture}
                onClick={() => {
                  onRotateSelection(1)
                }}
                aria-keyshortcuts="Q"
              >
                Rotate Left
              </button>
              <button
                type="button"
                className="rotation-button"
                disabled={!editorInteractionsEnabled || !selectedFurniture}
                onClick={() => {
                  onRotateSelection(-1)
                }}
                aria-keyshortcuts="E"
              >
                Rotate Right
              </button>
            </div>
            <button
              ref={removeButtonRef}
              type="button"
              className="remove-button"
              disabled={!editorInteractionsEnabled || !selectedFurniture}
              aria-haspopup="dialog"
              aria-controls="confirm-delete-dialog"
              onClick={onOpenDeleteDialog}
            >
              Remove Selected
            </button>
          </div>

          {editorMessage ? (
            <p className="editor-message" role="status">
              {editorMessage}
            </p>
          ) : null}
        </section>
        <button
          ref={infoButtonRef}
          type="button"
          className="info-button"
          aria-haspopup="dialog"
          aria-controls="project-info-dialog"
          aria-label="Open project and asset info"
          onClick={onOpenInfoDialog}
        >
          <span aria-hidden>ℹ</span>
        </button>
        <p className="rotation-help">
          <span className="rotation-help-line">
            Select furniture, then use <kbd>Q</kbd>/<kbd>E</kbd> to rotate and{' '}
            <kbd>Delete</kbd>/<kbd>Backspace</kbd> to remove.
          </span>
          <span className="rotation-help-line">
            Use <kbd>Ctrl</kbd>+<kbd>Z</kbd> to undo and <kbd>Ctrl</kbd>+
            <kbd>Y</kbd> to redo.
          </span>
        </p>

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
