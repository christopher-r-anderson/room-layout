import type {
  MouseEvent as ReactMouseEvent,
  RefObject,
  SyntheticEvent,
} from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'

interface DeleteConfirmationDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  pendingDeleteFurniture: FurnitureItem | null
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void
  onBackdropClick: (event: ReactMouseEvent<HTMLDialogElement>) => void
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmationDialog({
  dialogRef,
  pendingDeleteFurniture,
  onCancel,
  onBackdropClick,
  onClose,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      id="confirm-delete-dialog"
      className="confirm-dialog"
      aria-labelledby="confirm-delete-title"
      onCancel={onCancel}
      onClick={onBackdropClick}
    >
      <div className="confirm-dialog-content">
        <h2 id="confirm-delete-title">Remove furniture?</h2>
        <p>
          Remove{' '}
          <strong>{pendingDeleteFurniture?.name ?? 'the selected item'}</strong>{' '}
          from the room layout?
        </p>
        <p className="confirm-delete-note">
          You can undo this from the history controls after removing it.
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="close-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            Remove
          </button>
        </div>
      </div>
    </dialog>
  )
}

interface ProjectInfoDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void
  onBackdropClick: (event: ReactMouseEvent<HTMLDialogElement>) => void
  onClose: () => void
}

export function ProjectInfoDialog({
  dialogRef,
  onCancel,
  onBackdropClick,
  onClose,
}: ProjectInfoDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      id="project-info-dialog"
      className="info-dialog"
      aria-labelledby="project-info-title"
      onCancel={onCancel}
      onClick={onBackdropClick}
    >
      <div className="info-dialog-content">
        <h2 id="project-info-title">Project Info</h2>

        <section aria-labelledby="project-links-heading">
          <h3 id="project-links-heading">Repository</h3>
          <p>
            Source code:{' '}
            <a
              href="https://github.com/christopher-r-anderson/room-layout"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/christopher-r-anderson/room-layout{' '}
              <span aria-hidden>↗</span>
            </a>
          </p>
        </section>

        <section aria-labelledby="asset-attribution-heading">
          <h3 id="asset-attribution-heading">Asset Attribution</h3>
          <p>
            Leather Couch model by{' '}
            <a
              href="https://sketchfab.com/YouSaveTime"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouSaveTime <span aria-hidden>↗</span>
            </a>
            , from{' '}
            <a
              href="https://sketchfab.com/3d-models/leather-couch-c2ac7a44144e4b80ab51f21b59c827f8"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sketchfab <span aria-hidden>↗</span>
            </a>
            , licensed under CC BY 4.0.
          </p>
          <p>
            Local source details:{' '}
            <code>assets-source/leather-couch/leather-couch-source.txt</code>
          </p>
        </section>

        <form method="dialog" className="info-dialog-actions">
          <button type="button" className="close-button" onClick={onClose}>
            Close
          </button>
        </form>
      </div>
    </dialog>
  )
}
