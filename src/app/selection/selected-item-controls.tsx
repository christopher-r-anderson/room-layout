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
      className="pointer-events-none absolute inset-2 top-16 z-10 flex flex-col gap-2 md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:items-start"
      inert={controlsSuppressed}
      aria-hidden={controlsSuppressed}
    >
      <SelectedItemActions
        className="md:max-w-80"
        disabled={controlsDisabled}
        onOpenDeleteDialog={handleOpenDeleteDialog}
        onPrepareDelete={() => {
          suppressNextBlurCommitRef.current = true
        }}
        onRotateSelection={onRotateSelection}
        selectedFurniture={selectedFurniture}
      />
      <SelectedItemDetails
        className="md:col-start-2 md:row-start-2 md:self-end md:justify-self-end md:w-80"
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
