import { useRef, type RefObject } from 'react'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/app/selected-item-details.types'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { SelectedItemActions } from './selected-item-actions'
import { SelectedItemDetails } from './selected-item-details'

export function SelectedItemControls({
  containerRef,
  editorInteractionsEnabled,
  isCatalogDrawerOpen,
  onInvalidSelectedItemDetailValue,
  onOpenDeleteDialog,
  onRotateSelection,
  onUpdateSelectedItemDetails,
  selectedFurniture,
  startupOverlayActive,
}: {
  containerRef?: RefObject<HTMLDivElement | null>
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

  const handleOpenDeleteDialog = () => {
    try {
      onOpenDeleteDialog()
    } finally {
      suppressNextBlurCommitRef.current = false
    }
  }

  if (!selectedFurniture) {
    return null
  }

  const controlsSuppressed = startupOverlayActive || isCatalogDrawerOpen
  const controlsDisabled = !editorInteractionsEnabled || controlsSuppressed

  return (
    <div
      ref={containerRef}
      inert={controlsSuppressed}
      className="absolute pointer-events-none w-full h-full z-10"
      aria-hidden={controlsSuppressed}
    >
      <SelectedItemActions
        className="absolute translate-x-1/2 top-1/3"
        disabled={controlsDisabled}
        onOpenDeleteDialog={handleOpenDeleteDialog}
        onPrepareDelete={() => {
          suppressNextBlurCommitRef.current = true
        }}
        onRotateSelection={onRotateSelection}
        selectedFurniture={selectedFurniture}
      />
      <SelectedItemDetails
        className="absolute bottom-30 md:bottom-2 left-2 right-2 md:left-auto md:w-auto"
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
