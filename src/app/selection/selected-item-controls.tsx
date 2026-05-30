import { useRef, type RefObject } from 'react'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/app/selected-item-details.types'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { SelectedItemActions } from './selected-item-actions'
import { SelectedItemDetails } from './selected-item-details'
import type { SelectedToolbarGeometry } from '@/scene/scene.types'
import type { OverlayExclusionRectId } from '@/app/overlay/use-overlay-exclusion-rects'
import { useHeaderLayoutMode } from '@/app/overlay/use-header-layout-mode'
import { useElementSize } from '@/app/hooks/use-element-size'
import { computeSelectedToolbarPlacement } from '@/lib/ui/selected-toolbar-placement'

export function SelectedItemControls({
  containerRef,
  editorInteractionsEnabled,
  exclusionRects,
  isCatalogDrawerOpen,
  onInvalidSelectedItemDetailValue,
  onOpenDeleteDialog,
  onRotateSelection,
  onUpdateSelectedItemDetails,
  selectedDetailsRef,
  selectedFurniture,
  selectedToolbarGeometry,
  startupOverlayActive,
}: {
  containerRef?: RefObject<HTMLDivElement | null>
  editorInteractionsEnabled: boolean
  exclusionRects?: Partial<Record<OverlayExclusionRectId, DOMRectReadOnly>>
  isCatalogDrawerOpen: boolean
  onInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
  selectedDetailsRef?: (element: HTMLElement | null) => void
  selectedFurniture: FurnitureItem | null
  selectedToolbarGeometry?: SelectedToolbarGeometry
  startupOverlayActive: boolean
}) {
  const fallbackContainerRef = useRef<HTMLDivElement | null>(null)
  const suppressNextBlurCommitRef = useRef(false)
  const headerLayoutMode = useHeaderLayoutMode()
  const { ref: actionsSizeRef, size: actionSize } = useElementSize()
  const resolvedContainerRef = containerRef ?? fallbackContainerRef
  const resolvedExclusionRects = exclusionRects ?? {}

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
  const activeToolbarGeometry =
    selectedToolbarGeometry?.kind === 'available' &&
    selectedToolbarGeometry.selectedId === selectedFurniture.id
      ? selectedToolbarGeometry
      : null
  const viewportRect = {
    left: 0,
    top: 0,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  } as DOMRectReadOnly

  const toolbarPlacement =
    activeToolbarGeometry === null
      ? computeSelectedToolbarPlacement({
          containerRect: viewportRect,
          exclusionRects: resolvedExclusionRects,
          forceDocked: true,
          points: [],
          toolbarSize: actionSize,
        })
      : computeSelectedToolbarPlacement({
          containerRect: viewportRect,
          exclusionRects: resolvedExclusionRects,
          forceDocked: headerLayoutMode === 'mobile',
          points: activeToolbarGeometry.points,
          source: activeToolbarGeometry.source,
          toolbarSize: actionSize,
        })

  return (
    <div
      ref={resolvedContainerRef}
      inert={controlsSuppressed}
      className="absolute pointer-events-none w-full h-full z-10"
      aria-hidden={controlsSuppressed}
    >
      <SelectedItemActions
        className="absolute transition-[transform,opacity] duration-150 ease-out"
        disabled={controlsDisabled}
        onOpenDeleteDialog={handleOpenDeleteDialog}
        onPrepareDelete={() => {
          suppressNextBlurCommitRef.current = true
        }}
        onRotateSelection={onRotateSelection}
        placementMode={toolbarPlacement.mode}
        placementSide={toolbarPlacement.side}
        sectionRef={actionsSizeRef}
        selectedFurniture={selectedFurniture}
        style={{
          opacity: toolbarPlacement.mode === 'hidden' ? 0 : 1,
          pointerEvents:
            toolbarPlacement.mode === 'hidden' ? 'none' : undefined,
          transform: `translate3d(${String(toolbarPlacement.left)}px, ${String(toolbarPlacement.top)}px, 0)`,
        }}
      />
      <SelectedItemDetails
        className="absolute bottom-30 md:bottom-2 left-2 right-2 md:left-auto md:w-auto"
        key={selectedFurniture.id}
        disabled={controlsDisabled}
        sectionRef={selectedDetailsRef}
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
