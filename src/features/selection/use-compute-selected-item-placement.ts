import { useMemo, useState } from 'react'
import { useElementSize } from '@/shared/hooks/use-element-size'
import { useEditorRects } from '@/core/layout/editor-rects-context'
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

interface HysteresisMemory {
  resetKey: string
  candidateId: ToolbarFloatingCandidateId | undefined
}

export function useComputeSelectedItemPlacement(): ComputeSelectedItemPlacementResult {
  const selectedFurniture = useSelectedFurniture()
  const selectedToolbarGeometry = useToolbarGeometry()
  const toolbarEngaged = useToolbarEngaged()
  // The scene container is measured by the same registry as the chrome, but
  // it is the placement container, never an exclusion.
  const { 'room-view': roomViewRect, ...exclusionRects } = useEditorRects()
  const { ref: actionsSizeRef, size: actionSize } = useElementSize()

  const activeToolbarSource =
    selectedToolbarGeometry.kind === 'available'
      ? selectedToolbarGeometry.source
      : undefined

  // Hysteresis memory: last render's chosen candidate feeds back into the next
  // placement computation, stored with the adjust-state-during-render pattern
  // (as in use-pinned-placement). resetKey drops the memory when the placement
  // context changes so a stale side preference can't bleed across selections.
  const hysteresisResetKey = [
    selectedFurniture?.id ?? '',
    selectedToolbarGeometry.kind,
    activeToolbarSource ?? '',
    `${String(actionSize.width)}x${String(actionSize.height)}`,
    `${String(roomViewRect?.width ?? 0)}x${String(roomViewRect?.height ?? 0)}`,
  ].join(':')
  const [hysteresis, setHysteresis] = useState<HysteresisMemory>({
    resetKey: hysteresisResetKey,
    candidateId: undefined,
  })
  const previousFloatingCandidateId =
    hysteresis.resetKey === hysteresisResetKey
      ? hysteresis.candidateId
      : undefined

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
    roomViewRect !== undefined &&
    roomViewRect.width > 0 &&
    roomViewRect.height > 0

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

  // A hidden frame keeps the memory so the side preference survives brief
  // geometry gaps under the same context.
  const nextFloatingCandidateId =
    toolbarPlacement.mode === 'floating' && toolbarPlacement.candidateId
      ? toolbarPlacement.candidateId
      : previousFloatingCandidateId
  if (
    hysteresis.resetKey !== hysteresisResetKey ||
    hysteresis.candidateId !== nextFloatingCandidateId
  ) {
    setHysteresis({
      resetKey: hysteresisResetKey,
      candidateId: nextFloatingCandidateId,
    })
  }

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
