import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from 'react'
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
import { useElementRect } from '@/app/hooks/use-element-rect'
import {
  computeSelectedToolbarPlacement,
  type ToolbarFloatingCandidateId,
} from '@/lib/ui/selected-toolbar-placement'

function createCandidateStore(
  initialValue: ToolbarFloatingCandidateId | undefined,
) {
  let value = initialValue
  const listeners = new Set<() => void>()

  return {
    getSnapshot: () => value,
    subscribe: (listener: () => void) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    set: (nextValue: ToolbarFloatingCandidateId | undefined) => {
      if (value === nextValue) {
        return
      }

      value = nextValue
      listeners.forEach((listener) => {
        listener()
      })
    },
  }
}

export function SelectedItemControls({
  containerRef,
  editorInteractionsEnabled,
  exclusionRects,
  isCatalogDrawerOpen,
  onInvalidSelectedItemDetailValue,
  onOpenDeleteDialog,
  onRotateSelection,
  onUpdateSelectedItemDetails,
  roomViewRef,
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
  roomViewRef?: RefObject<HTMLElement | null>
  selectedDetailsRef?: (element: HTMLElement | null) => void
  selectedFurniture: FurnitureItem | null
  selectedToolbarGeometry?: SelectedToolbarGeometry
  startupOverlayActive: boolean
}) {
  const fallbackContainerRef = useRef<HTMLDivElement | null>(null)
  const suppressNextBlurCommitRef = useRef(false)
  const previousFloatingCandidateStore = useMemo(
    () => createCandidateStore(undefined),
    [],
  )
  const previousFloatingCandidateId = useSyncExternalStore(
    previousFloatingCandidateStore.subscribe,
    previousFloatingCandidateStore.getSnapshot,
    previousFloatingCandidateStore.getSnapshot,
  )
  const headerLayoutMode = useHeaderLayoutMode()
  const { ref: actionsSizeRef, size: actionSize } = useElementSize()
  const roomViewRect = useElementRect(roomViewRef)
  const resolvedContainerRef = containerRef ?? fallbackContainerRef
  const resolvedExclusionRects = exclusionRects ?? {}
  const activeToolbarSource =
    selectedToolbarGeometry?.kind === 'available'
      ? selectedToolbarGeometry.source
      : undefined

  const handleOpenDeleteDialog = () => {
    try {
      onOpenDeleteDialog()
    } finally {
      suppressNextBlurCommitRef.current = false
    }
  }

  useEffect(() => {
    if (!selectedFurniture) {
      previousFloatingCandidateStore.set(undefined)
      return
    }

    previousFloatingCandidateStore.set(undefined)
  }, [
    previousFloatingCandidateStore,
    selectedFurniture?.id,
    selectedToolbarGeometry?.kind,
    activeToolbarSource,
    headerLayoutMode,
    actionSize.width,
    actionSize.height,
    roomViewRect?.width,
    roomViewRect?.height,
  ])

  const controlsSuppressed = startupOverlayActive || isCatalogDrawerOpen
  const controlsDisabled = !editorInteractionsEnabled || controlsSuppressed
  const activeToolbarGeometry =
    selectedFurniture !== null &&
    selectedToolbarGeometry?.kind === 'available' &&
    selectedToolbarGeometry.selectedId === selectedFurniture.id
      ? selectedToolbarGeometry
      : null
  const viewportRect = {
    left: 0,
    top: 0,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
    right: typeof window === 'undefined' ? 0 : window.innerWidth,
    bottom: typeof window === 'undefined' ? 0 : window.innerHeight,
  } as DOMRectReadOnly
  const hasMeasuredRoomViewRect =
    roomViewRect !== null && roomViewRect.width > 0 && roomViewRect.height > 0
  const toolbarPointScale =
    activeToolbarGeometry && hasMeasuredRoomViewRect
      ? {
          x:
            activeToolbarGeometry.canvasSize.width > 0
              ? roomViewRect.width / activeToolbarGeometry.canvasSize.width
              : 1,
          y:
            activeToolbarGeometry.canvasSize.height > 0
              ? roomViewRect.height / activeToolbarGeometry.canvasSize.height
              : 1,
        }
      : null
  const convertedToolbarPoints =
    activeToolbarGeometry && hasMeasuredRoomViewRect && toolbarPointScale
      ? activeToolbarGeometry.points.map((point) => ({
          x: roomViewRect.left + point.x * toolbarPointScale.x,
          y: roomViewRect.top + point.y * toolbarPointScale.y,
        }))
      : []
  const placementContainerRect = hasMeasuredRoomViewRect
    ? roomViewRect
    : viewportRect

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
          containerRect: placementContainerRect,
          exclusionRects: resolvedExclusionRects,
          forceDocked:
            headerLayoutMode === 'mobile' || !hasMeasuredRoomViewRect,
          points: convertedToolbarPoints,
          previousFloatingCandidateId,
          projectedPointCount: activeToolbarGeometry.projectedPointCount,
          source: activeToolbarGeometry.source,
          sourcePointCount: activeToolbarGeometry.sourcePointCount,
          toolbarSize: actionSize,
        })

  useEffect(() => {
    if (
      toolbarPlacement.mode === 'floating' &&
      toolbarPlacement.candidateId &&
      toolbarPlacement.candidateId !== previousFloatingCandidateId
    ) {
      previousFloatingCandidateStore.set(toolbarPlacement.candidateId)
    }
  }, [
    previousFloatingCandidateId,
    previousFloatingCandidateStore,
    toolbarPlacement.candidateId,
    toolbarPlacement.mode,
  ])

  if (!selectedFurniture) {
    return null
  }

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
        placementCandidateId={toolbarPlacement.candidateId}
        onRotateSelection={onRotateSelection}
        placementMode={toolbarPlacement.mode}
        sectionRef={actionsSizeRef}
        selectedFurniture={selectedFurniture}
        style={{
          opacity: toolbarPlacement.mode === 'hidden' ? 0 : 1,
          pointerEvents:
            toolbarPlacement.mode === 'hidden' ? 'none' : undefined,
          visibility: toolbarPlacement.mode === 'hidden' ? 'hidden' : undefined,
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
