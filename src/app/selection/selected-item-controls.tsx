import { useRef } from 'react'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/app/selected-item-details.types'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { SelectedItemActions } from './selected-item-actions'
import { SelectedItemDetails } from './selected-item-details'

export function SelectedItemControls({
  editorInteractionsEnabled,
  isCatalogDrawerOpen,
  onInvalidSelectedItemDetailValue,
  onOpenDeleteDialog,
  onRotateSelection,
  onUpdateSelectedItemDetails,
  selectedFurniture,
  startupOverlayActive,
}: {
  editorInteractionsEnabled: boolean
  isCatalogDrawerOpen: boolean
  onInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
  selectedFurniture: FurnitureItem | null
  startupOverlayActive: boolean
}) {
  const suppressNextBlurCommitRef = useRef(false)

  if (!selectedFurniture) {
    return null
  }

  const controlsSuppressed = startupOverlayActive || isCatalogDrawerOpen
  const controlsDisabled = !editorInteractionsEnabled || controlsSuppressed

  return (
    <div
      className="pointer-events-none absolute inset-x-2 top-16 z-10 flex flex-col gap-2 sm:left-2 sm:right-auto sm:w-80"
      inert={controlsSuppressed}
      aria-hidden={controlsSuppressed}
    >
      <SelectedItemActions
        disabled={controlsDisabled}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onPrepareDelete={() => {
          suppressNextBlurCommitRef.current = true
        }}
        onRotateSelection={onRotateSelection}
        selectedFurniture={selectedFurniture}
      />
      <SelectedItemDetails
        key={selectedFurniture.id}
        disabled={controlsDisabled}
        selectedFurniture={selectedFurniture}
        consumeBlurCommitSuppression={() => {
          if (!suppressNextBlurCommitRef.current) {
            return false
          }

          suppressNextBlurCommitRef.current = false
          return true
        }}
        onInvalidSelectedItemDetailValue={onInvalidSelectedItemDetailValue}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />
    </div>
  )
}
