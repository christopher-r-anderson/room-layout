import type { LayoutBounds } from '@/lib/three/furniture-layout'
import { resolveMovedFurniturePosition } from '@/lib/three/furniture-layout'
import {
  commitHistoryPresent,
  replaceHistoryPresent,
  type HistoryState,
} from '@/lib/ui/editor-history'
import type { FurnitureItem } from './objects/furniture.types'
import type { MoveCommitMode, MoveSelectionResult } from './scene.types'
import { areFurnitureCollectionsEqual } from './furniture-operations'

interface MoveItemOptions {
  furniture: FurnitureItem[]
  selectedId: string | null
  nextPosition: { x: number; z: number }
  bounds: LayoutBounds
  edgeSnapThreshold: number
}

export function moveSelectionToPosition({
  furniture,
  selectedId,
  nextPosition,
  bounds,
  edgeSnapThreshold,
}: MoveItemOptions): MoveSelectionResult {
  if (!selectedId) {
    return { ok: false, reason: 'none-selected' }
  }

  const selectedItem = furniture.find((item) => item.id === selectedId)

  if (!selectedItem) {
    return { ok: false, reason: 'invalid-selection' }
  }

  const resolvedPosition = resolveMovedFurniturePosition({
    movingId: selectedId,
    proposedPosition: [
      nextPosition.x,
      selectedItem.position[1],
      nextPosition.z,
    ],
    items: furniture,
    edgeSnapThreshold,
    bounds,
  })

  if (!resolvedPosition) {
    return { ok: false, reason: 'blocked' }
  }

  return {
    ok: true,
    id: selectedId,
    position: resolvedPosition,
  }
}

export function applyMoveSelectionResultToHistory({
  history,
  result,
  commit,
}: {
  history: HistoryState<FurnitureItem[]>
  result: MoveSelectionResult
  commit: MoveCommitMode
}): HistoryState<FurnitureItem[]> {
  if (!result.ok) {
    return history
  }

  const nextFurniture = history.present.map((item) => {
    if (item.id !== result.id) {
      return item
    }

    return {
      ...item,
      position: result.position,
    }
  })

  if (commit === 'defer') {
    return replaceHistoryPresent(
      history,
      nextFurniture,
      areFurnitureCollectionsEqual,
    )
  }

  return commitHistoryPresent(
    history,
    nextFurniture,
    areFurnitureCollectionsEqual,
  )
}
