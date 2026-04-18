import type { RefObject } from 'react'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import {
  OverlayControlSection,
  OverlayIconButton,
  OverlayStatusMessage,
  OverlayToolbar,
} from './editor-ui-primitives'

interface HistoryAvailability {
  canUndo: boolean
  canRedo: boolean
}

export function HistoryPanel({
  canRedo,
  canUndo,
  editorInteractionsEnabled,
  onRedo,
  onUndo,
}: {
  canRedo: boolean
  canUndo: boolean
  editorInteractionsEnabled: boolean
  onRedo: () => void
  onUndo: () => void
}) {
  return (
    <OverlayControlSection className="control-group-history" heading="History">
      <OverlayToolbar ariaLabel="History controls" className="history-controls">
        <button
          type="button"
          className="history-button"
          disabled={!editorInteractionsEnabled || !canUndo}
          onClick={onUndo}
          aria-keyshortcuts="Control+Z Meta+Z"
        >
          Undo
        </button>
        <button
          type="button"
          className="history-button"
          disabled={!editorInteractionsEnabled || !canRedo}
          onClick={onRedo}
          aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
        >
          Redo
        </button>
      </OverlayToolbar>
    </OverlayControlSection>
  )
}

export function CatalogPanel({
  catalogIdToAdd,
  editorInteractionsEnabled,
  onAddFurniture,
  onCatalogIdToAddChange,
}: {
  catalogIdToAdd: string
  editorInteractionsEnabled: boolean
  onAddFurniture: () => void
  onCatalogIdToAddChange: (catalogId: string) => void
}) {
  return (
    <OverlayControlSection
      heading="Add Furniture"
      headingId="add-furniture-heading"
    >
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
    </OverlayControlSection>
  )
}

export function SelectionPanel({
  editorInteractionsEnabled,
  onOpenDeleteDialog,
  onRotateSelection,
  removeButtonRef,
  selectedFurniture,
}: {
  editorInteractionsEnabled: boolean
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  removeButtonRef: RefObject<HTMLButtonElement | null>
  selectedFurniture: FurnitureItem | null
}) {
  return (
    <OverlayControlSection
      heading="Selection Actions"
      headingId="selection-actions-heading"
    >
      <p className="selection-summary" aria-live="polite">
        {selectedFurniture ? (
          <>Selected: {selectedFurniture.name}</>
        ) : (
          'Selected: none'
        )}
      </p>
      <OverlayToolbar
        ariaLabel="Rotation controls"
        className="rotation-controls"
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
      </OverlayToolbar>
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
    </OverlayControlSection>
  )
}

export function EditorStatusMessage({ message }: { message: string | null }) {
  return <OverlayStatusMessage message={message} />
}

export function OverlayInfoButton({
  infoButtonRef,
  onOpenInfoDialog,
}: {
  infoButtonRef: RefObject<HTMLButtonElement | null>
  onOpenInfoDialog: () => void
}) {
  return (
    <OverlayIconButton
      buttonRef={infoButtonRef}
      aria-haspopup="dialog"
      aria-controls="project-info-dialog"
      aria-label="Open project and asset info"
      onClick={onOpenInfoDialog}
    >
      <span aria-hidden>ℹ</span>
    </OverlayIconButton>
  )
}

export function RotationHelp() {
  return (
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
  )
}

export type { HistoryAvailability }
