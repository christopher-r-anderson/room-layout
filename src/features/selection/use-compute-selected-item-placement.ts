import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useElementRect } from '@/shared/hooks/use-element-rect'
import { useElementSize } from '@/shared/hooks/use-element-size'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useOverlayLayout } from '@/shared/layout/overlay-layout-context'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { useSelectedFurniture } from '@/core/stores/scene-state-store'
import { useToolbarGeometry } from '@/core/stores/selection-meta-store'
import {
  computeSelectedToolbarPlacement,
  type ToolbarFloatingCandidateId,
} from '@/shared/lib/ui/selected-toolbar-placement'
import type {
  SelectedItemDockedReason,
  SelectedItemPlacement,
} from './selected-item-placement.types'

interface ComputeSelectedItemPlacementResult {
  placement: SelectedItemPlacement
  actionsSizeRef: (element: HTMLElement | null) => void
}

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

export function useComputeSelectedItemPlacement(): ComputeSelectedItemPlacementResult {
  const selectedFurniture = useSelectedFurniture()
  const selectedToolbarGeometry = useToolbarGeometry()
  const { roomViewRef } = useEditorRefs()
  const { exclusionRects } = useOverlayLayout()
  const headerLayoutMode = useHeaderLayoutMode()
  const { ref: actionsSizeRef, size: actionSize } = useElementSize()
  const roomViewRect = useElementRect(roomViewRef)

  const previousFloatingCandidateStore = useMemo(
    () => createCandidateStore(undefined),
    [],
  )
  const previousFloatingCandidateId = useSyncExternalStore(
    previousFloatingCandidateStore.subscribe,
    previousFloatingCandidateStore.getSnapshot,
    previousFloatingCandidateStore.getSnapshot,
  )

  const activeToolbarSource =
    selectedToolbarGeometry.kind === 'available'
      ? selectedToolbarGeometry.source
      : undefined

  useEffect(() => {
    previousFloatingCandidateStore.set(undefined)
  }, [
    previousFloatingCandidateStore,
    selectedFurniture?.id,
    selectedToolbarGeometry.kind,
    activeToolbarSource,
    headerLayoutMode,
    actionSize.width,
    actionSize.height,
    roomViewRect?.width,
    roomViewRect?.height,
  ])

  const activeToolbarGeometry =
    selectedFurniture !== null &&
    selectedToolbarGeometry.kind === 'available' &&
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
          exclusionRects,
          forceDocked: true,
          points: [],
          toolbarSize: actionSize,
        })
      : computeSelectedToolbarPlacement({
          containerRect: placementContainerRect,
          exclusionRects,
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

  const placement = useMemo<SelectedItemPlacement>(() => {
    if (selectedFurniture === null) {
      return { site: 'hidden', reason: 'no-selection' }
    }

    if (toolbarPlacement.mode === 'hidden') {
      return { site: 'hidden', reason: 'computed-hidden' }
    }

    if (toolbarPlacement.mode === 'floating') {
      return {
        site: 'floating',
        candidateId: toolbarPlacement.candidateId ?? 'top-center',
        left: toolbarPlacement.left,
        top: toolbarPlacement.top,
      }
    }

    // mode === 'docked'
    let reason: SelectedItemDockedReason
    if (activeToolbarGeometry === null) {
      reason = 'no-geometry'
    } else if (headerLayoutMode === 'mobile') {
      reason = 'mobile-layout'
    } else if (!hasMeasuredRoomViewRect) {
      reason = 'forced'
    } else {
      reason = 'low-confidence'
    }

    return {
      site: 'docked',
      reason,
      left: toolbarPlacement.left,
      top: toolbarPlacement.top,
    }
  }, [
    selectedFurniture,
    toolbarPlacement.mode,
    toolbarPlacement.candidateId,
    toolbarPlacement.left,
    toolbarPlacement.top,
    activeToolbarGeometry,
    headerLayoutMode,
    hasMeasuredRoomViewRect,
  ])

  return { placement, actionsSizeRef }
}
