import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
  type RefObject,
} from 'react'
import { FURNITURE_CATALOG } from '@/scene/objects/furniture-catalog'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import {
  OverlayControlSection,
  OverlayIconButton,
  OverlayStatusMessage,
  OverlayToolbar,
} from './editor-ui-primitives'

function formatMeasurement(value: number) {
  return Number(value.toFixed(2)).toString()
}

function formatFootprintLabel(width: number, depth: number) {
  return `${formatMeasurement(width)}m x ${formatMeasurement(depth)}m footprint`
}

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
  isOpen,
  onAddFurniture,
  onCatalogIdToAddChange,
  onClose,
  onOpen,
  pickerDialogRef,
}: {
  catalogIdToAdd: string
  editorInteractionsEnabled: boolean
  isOpen: boolean
  onAddFurniture: () => void
  onCatalogIdToAddChange: (catalogId: string) => void
  onClose: () => void
  onOpen: () => void
  pickerDialogRef: RefObject<HTMLDialogElement | null>
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const selectedRadioRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const dialog = pickerDialogRef.current

    if (!dialog) {
      return
    }

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }

      selectedRadioRef.current?.focus()
      return
    }

    if (dialog.open) {
      dialog.close()
    }

    if (triggerRef.current) {
      triggerRef.current.focus()
    }
  }, [isOpen, pickerDialogRef])

  function handleSheetCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onClose()
  }

  function handleSheetBackdropClick(event: ReactMouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <>
      {isOpen ? null : (
        <button
          ref={triggerRef}
          type="button"
          className="picker-trigger"
          disabled={!editorInteractionsEnabled}
          onClick={onOpen}
        >
          <span className="picker-trigger-plus" aria-hidden>
            +
          </span>
          <span className="picker-trigger-copy">
            <span className="picker-trigger-title">Add Furniture</span>
            <span className="picker-trigger-subtitle">
              Open the visual item picker
            </span>
          </span>
        </button>
      )}

      <dialog
        ref={pickerDialogRef}
        id="add-furniture-sheet"
        className="catalog-sheet"
        aria-labelledby="add-furniture-heading"
        aria-describedby="add-furniture-description"
        onCancel={handleSheetCancel}
        onClick={handleSheetBackdropClick}
      >
        <div className="catalog-sheet-header">
          <div>
            <p className="catalog-sheet-eyebrow">Catalog</p>
            <h2 id="add-furniture-heading" className="catalog-sheet-title">
              Add furniture
            </h2>
          </div>
          <button
            type="button"
            className="catalog-sheet-close"
            aria-label="Close picker"
            onClick={onClose}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <p id="add-furniture-description" className="catalog-sheet-description">
          Choose a piece, then place it into the room.
        </p>
        <fieldset className="catalog-grid">
          <legend className="sr-only">Furniture type to add</legend>
          {FURNITURE_CATALOG.map((entry) => {
            const isSelected = catalogIdToAdd === entry.id

            return (
              <label key={entry.id} className="catalog-card">
                <input
                  ref={isSelected ? selectedRadioRef : undefined}
                  className="catalog-card-input sr-only"
                  type="radio"
                  name="furniture-catalog"
                  value={entry.id}
                  checked={isSelected}
                  disabled={!editorInteractionsEnabled}
                  onChange={(event) => {
                    onCatalogIdToAddChange(event.target.value)
                  }}
                />
                <span
                  className="catalog-card-surface"
                  data-selected={isSelected}
                  aria-hidden="true"
                >
                  <span className="catalog-card-preview">
                    <img
                      className="catalog-card-image"
                      src={entry.previewPath}
                      alt=""
                    />
                  </span>
                  <span className="catalog-card-copy">
                    <span className="catalog-card-name">{entry.name}</span>
                    <span className="catalog-card-meta">
                      {formatFootprintLabel(
                        entry.footprintSize.width,
                        entry.footprintSize.depth,
                      )}
                    </span>
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
        <div className="catalog-sheet-actions">
          <button type="button" className="close-button" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="add-button catalog-add-button"
            disabled={!editorInteractionsEnabled || !catalogIdToAdd}
            onClick={onAddFurniture}
          >
            Add Item
          </button>
        </div>
      </dialog>
    </>
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
