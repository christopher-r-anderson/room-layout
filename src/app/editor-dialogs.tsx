import type {
  MouseEvent as ReactMouseEvent,
  RefObject,
  SyntheticEvent,
} from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { AssetAttribution } from './asset-attribution'

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

        <section
          className="info-dialog-section"
          aria-labelledby="project-links-heading"
        >
          <h3 id="project-links-heading">Repository</h3>
          <dl className="info-dialog-definition-list">
            <dt>Author</dt>
            <dd>
              <a href="https://christopheranderson.net" target="_blank">
                Christopher Anderson <span aria-hidden>↗</span>
              </a>
            </dd>
            <dt>Source code</dt>
            <dd>
              <a
                href="https://github.com/christopher-r-anderson/room-layout"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/christopher-r-anderson/room-layout{' '}
                <span aria-hidden>↗</span>
              </a>
            </dd>
            <dt>License</dt>
            <dd>
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
              >
                MIT <span aria-hidden>↗</span>
              </a>
            </dd>
          </dl>
        </section>

        <section
          className="info-dialog-attribution-section"
          aria-labelledby="asset-attribution-heading"
        >
          <h3 id="asset-attribution-heading">Asset Attribution</h3>
          <AssetAttribution
            assetName="Leather Couch"
            authorHref="https://sketchfab.com/YouSaveTime"
            authorName="YouSaveTime"
            sourceHref="https://sketchfab.com/3d-models/leather-couch-c2ac7a44144e4b80ab51f21b59c827f8"
            localSourcePath="assets-source/leather-couch/leather-couch-source.txt"
          />
          <AssetAttribution
            assetName="Leather Armchair"
            authorHref="https://sketchfab.com/YouSaveTime"
            authorName="YouSaveTime"
            sourceHref="https://sketchfab.com/3d-models/leather-couch-c2ac7a44144e4b80ab51f21b59c827f8"
            localSourcePath="assets-source/leather-couch/leather-couch-source.txt"
          />
          <AssetAttribution
            assetName="End Table"
            authorHref="https://sketchfab.com/cirax-we"
            authorName="cirax we"
            sourceHref="https://sketchfab.com/3d-models/end-table-d0032d49ca214200929d4151d733f828"
            localSourcePath="assets-source/cirax-we-end-table/end-table.txt"
          />
          <AssetAttribution
            assetName="Modern Coffee Table"
            authorHref="https://sketchfab.com/zeerkad"
            authorName="ZeeRKad"
            sourceHref="https://sketchfab.com/3d-models/coffee-table-91872709bf054d8994be323599e23107"
            localSourcePath="assets-source/zeerkad-coffee-table/coffee-table.txt"
          />
          <AssetAttribution
            assetName="Classic Coffee Table"
            authorHref="https://sketchfab.com/maurib98"
            authorName="Machine Meza"
            sourceHref="https://sketchfab.com/3d-models/coffee-table-living-room-aa5b9a41c90245e8992ba93de6dde8c8"
            localSourcePath="assets-source/machine-meza-coffee-table-living-room/coffee-table-living-room.txt"
          />
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
