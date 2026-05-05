import {
  canRedoHistory,
  canUndoHistory,
  redoHistoryState,
  type HistoryState,
  undoHistoryState,
} from '@/lib/ui/editor-history'
import type { FurnitureItem } from '../objects/furniture.types'

export interface SceneHistoryAvailability {
  canUndo: boolean
  canRedo: boolean
}

export interface SceneHistoryInput {
  history: HistoryState<FurnitureItem[]>
  selectedId: string | null
  isDragging: boolean
}

export interface SceneHistoryResult {
  history: HistoryState<FurnitureItem[]>
  selectedId: string | null
  didChange: boolean
}

function selectionExists(
  furniture: FurnitureItem[],
  selectedId: string | null,
): boolean {
  return selectedId ? furniture.some((item) => item.id === selectedId) : false
}

function reconcileSelectedId(
  furniture: FurnitureItem[],
  selectedId: string | null,
) {
  return selectionExists(furniture, selectedId) ? selectedId : null
}

export function getSceneHistoryAvailability({
  history,
  isDragging,
}: SceneHistoryInput): SceneHistoryAvailability {
  return {
    canUndo: !isDragging && canUndoHistory(history),
    canRedo: !isDragging && canRedoHistory(history),
  }
}

export function undoSceneHistory({
  history,
  selectedId,
  isDragging,
}: SceneHistoryInput): SceneHistoryResult {
  if (isDragging) {
    return {
      history,
      selectedId,
      didChange: false,
    }
  }

  const nextHistory = undoHistoryState(history)

  return {
    history: nextHistory,
    selectedId: reconcileSelectedId(nextHistory.present, selectedId),
    didChange: nextHistory !== history,
  }
}

export function redoSceneHistory({
  history,
  selectedId,
  isDragging,
}: SceneHistoryInput): SceneHistoryResult {
  if (isDragging) {
    return {
      history,
      selectedId,
      didChange: false,
    }
  }

  const nextHistory = redoHistoryState(history)

  return {
    history: nextHistory,
    selectedId: reconcileSelectedId(nextHistory.present, selectedId),
    didChange: nextHistory !== history,
  }
}
