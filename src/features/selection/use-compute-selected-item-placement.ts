import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useElementRect } from '@/shared/hooks/use-element-rect'
import { useElementSize } from '@/shared/hooks/use-element-size'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useExclusionRects } from '@/shared/layout/overlay-exclusion-context'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { useToolbarGeometry } from '@/core/stores/toolbar-geometry-store'
import { useToolbarEngaged } from '@/core/stores/toolbar-interaction-store'
import {
  computeSelectedToolbarPlacement,
  type ToolbarFloatingCandidateId,
} from './toolbar-placement/selected-toolbar-placement'
import type { SelectedItemPlacement } from './selected-item-placement.types'
import { usePinnedPlacement } from './use-pinned-placement'

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
  const toolbarEngaged = useToolbarEngaged()
  const { roomViewRef } = useEditorRefs()
  const exclusionRects = useExclusionRects()
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

  const toolbarPlacement = computeSelectedToolbarPlacement({
    containerRect: placementContainerRect,
    exclusionRects,
    points: convertedToolbarPoints,
    previousFloatingCandidateId,
    projectedPointCount: activeToolbarGeometry?.projectedPointCount,
    source: activeToolbarGeometry?.source,
    sourcePointCount: activeToolbarGeometry?.sourcePointCount,
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

    return {
      site: 'floating',
      candidateId: toolbarPlacement.candidateId ?? 'top-center',
      left: toolbarPlacement.left,
      top: toolbarPlacement.top,
    }
  }, [
    selectedFurniture,
    toolbarPlacement.mode,
    toolbarPlacement.candidateId,
    toolbarPlacement.left,
    toolbarPlacement.top,
  ])

  // While the user is engaging the toolbar, pin its position so repeated rotate
  // clicks don't walk it out from under the cursor.
  const pinned = toolbarEngaged && placement.site === 'floating'
  const displayPlacement = usePinnedPlacement(
    placement,
    pinned,
    `${selectedFurniture?.id ?? ''}:${activeToolbarSource ?? ''}`,
  )

  return { placement: displayPlacement, actionsSizeRef }
}
